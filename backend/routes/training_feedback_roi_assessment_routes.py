"""
FILE: backend/routes/training_feedback_roi_assessment_routes.py
NepHR Pro — Performance & Talent Management > Talent Development >
Learning & Development > Training Feedback + Effectiveness + ROI +
Assessment & Quiz (4 pages, the Kirkpatrick L1-L4 measurement layer)
URL prefix: /api/v1/training-measurement

  1. /feedback           — Page 1 (Kirkpatrick L1, auto-triggered 48h post-completion)
  2. /effectiveness          — Page 2 (Kirkpatrick L3/4, pre/post baseline)
  3. /roi                       — Page 3 (cost/benefit calculation engine)
  4. /assessments                  — Page 4 (quiz player + auto-grading)

All four integrate with EXISTING tables (lms_enrollments, lms_courses,
performance_appraisals, training_roi_snapshots, lms_course_quizzes/
lms_quiz_questions) -- nothing duplicated.

Nepal Labour Act 2017 (2074): assessment methodology is management's
discretion; any quiz forming part of formal Performance Appraisal must
be transparently communicated; non-discrimination applies to feedback
collection; disciplinary action from assessment results must follow
lawful procedure.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import build_template_xlsx
from ..ai.insights import generate_ai_insights

training_measure_bp = Blueprint("training_feedback_roi_assessment", __name__, url_prefix="/api/v1/training-measurement")


# ════════════════════════════════════════════════════════════════
# PAGE 1: TRAINING FEEDBACK
# ════════════════════════════════════════════════════════════════

@training_measure_bp.get("/feedback")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_feedback():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_feedback_dashboard WHERE company_id = :cid ORDER BY submitted_at DESC LIMIT 100"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_measure_bp.get("/feedback/course-scorecard")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def course_scorecard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_course_scorecard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_measure_bp.post("/feedback/submit")
def submit_pulse_feedback():
    """
    Public/ESS — the 48h-post-completion pulse survey. DB trigger
    auto-escalates negative (CSAT < 3) responses to the L&D Lead.
    """
    body = request.get_json() or {}
    required = ["lms_enrollment_id", "employee_id", "lms_course_id", "csat_rating", "application_answer"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO pulse_survey_feedback (company_id, lms_enrollment_id, employee_id, lms_course_id, csat_rating, application_answer, submitted_at)
            VALUES (:cid, :enroll, :eid, :course, :csat, :answer, NOW())
            ON CONFLICT (lms_enrollment_id) DO NOTHING
            RETURNING id, sentiment
        """), {"cid": body.get("company_id"), "enroll": body["lms_enrollment_id"], "eid": body["employee_id"],
               "course": body["lms_course_id"], "csat": body["csat_rating"], "answer": body["application_answer"]})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Feedback already submitted for this enrollment."})
        return created({"feedback_id": str(row[0]), "sentiment": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: EFFECTIVENESS OF TRAINING
# ════════════════════════════════════════════════════════════════

@training_measure_bp.get("/effectiveness")
@require_auth
@require_role("super_admin", "hr_manager")
def list_effectiveness():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_effectiveness_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_measure_bp.post("/effectiveness/baseline")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def capture_baseline():
    """Must be captured BEFORE the course starts -- the brief's explicit 'no baseline, no measurement' rule."""
    body = request.get_json() or {}
    required = ["lms_course_id", "employee_id", "pre_training_score"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO training_effectiveness_baselines (company_id, lms_course_id, employee_id, pre_training_score, created_at)
            VALUES (:cid, :course, :eid, :score, NOW())
            ON CONFLICT (lms_course_id, employee_id) DO NOTHING
            RETURNING id, follow_up_due_date
        """), {"cid": g.company_id, "course": body["lms_course_id"], "eid": body["employee_id"], "score": body["pre_training_score"]})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Baseline already captured for this employee/course."})
        return created({"baseline_id": str(row[0]), "follow_up_due_date": str(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_measure_bp.put("/effectiveness/<baseline_id>/follow-up")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def complete_followup(baseline_id):
    """The 90-day Level 3/4 follow-up: post-training score + actual on-job application."""
    body = request.get_json() or {}
    required = ["post_training_score", "applied_on_job"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            UPDATE training_effectiveness_baselines
               SET post_training_score = :post, applied_on_job = :applied, linked_appraisal_id = :appraisal, follow_up_completed_at = NOW()
             WHERE id = :bid AND company_id = :cid
        """), {"post": body["post_training_score"], "applied": body["applied_on_job"], "appraisal": body.get("linked_appraisal_id"),
               "bid": baseline_id, "cid": g.company_id})
        db.session.commit()
        return success({"followup_completed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: ROI ON TRAINING
# ════════════════════════════════════════════════════════════════

@training_measure_bp.get("/roi")
@require_auth
@require_role("super_admin", "hr_manager")
def list_roi():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_roi_full_breakdown WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_measure_bp.post("/roi/calculate")
@require_auth
@require_role("super_admin", "hr_manager")
def calculate_roi():
    """
    Creates (or extends) a training_roi_snapshot with full cost/benefit
    line items. ROI% = (Net Benefit / Cost) * 100, computed by the view.
    """
    body = request.get_json() or {}
    required = ["course_label", "costs", "benefits"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        snapshot = db.session.execute(text("""
            INSERT INTO training_roi_snapshots (company_id, course_label, lms_course_id, participant_count, measured_at)
            VALUES (:cid, :course, :lms_id, :participants, NOW()) RETURNING id
        """), {"cid": g.company_id, "course": body["course_label"], "lms_id": body.get("lms_course_id"), "participants": body.get("participant_count", 0)}).fetchone()
        snapshot_id = str(snapshot[0])

        c = body["costs"]
        db.session.execute(text("""
            INSERT INTO training_roi_cost_inputs (company_id, training_roi_snapshot_id, course_fees_npr, facilitator_cost_npr, lost_productivity_npr, lms_license_share_npr)
            VALUES (:cid, :sid, :fees, :facilitator, :lost, :lms)
        """), {"cid": g.company_id, "sid": snapshot_id, "fees": c.get("course_fees", 0), "facilitator": c.get("facilitator", 0),
               "lost": c.get("lost_productivity", 0), "lms": c.get("lms_license_share", 0)})

        b = body["benefits"]
        db.session.execute(text("""
            INSERT INTO training_roi_benefit_inputs (company_id, training_roi_snapshot_id, error_reduction_value_npr, productivity_gain_value_npr)
            VALUES (:cid, :sid, :error_red, :prod_gain)
        """), {"cid": g.company_id, "sid": snapshot_id, "error_red": b.get("error_reduction_npr", 0), "prod_gain": b.get("productivity_gain_npr", 0)})

        db.session.commit()
        return created({"snapshot_id": snapshot_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: ASSESSMENT & QUIZ
# ════════════════════════════════════════════════════════════════

@training_measure_bp.get("/assessments/<employee_id>")
def my_assessments(employee_id):
    """Public/ESS — 'My Assessments' tab with missed-topic recommendations."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_assessments WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_measure_bp.post("/assessments/start")
def start_attempt():
    """Public/ESS — start a new quiz attempt."""
    body = request.get_json() or {}
    required = ["lms_course_quiz_id", "lms_enrollment_id", "employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO quiz_attempts (company_id, lms_course_quiz_id, lms_enrollment_id, employee_id, started_at)
            VALUES (:cid, :quiz, :enroll, :eid, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "quiz": body["lms_course_quiz_id"], "enroll": body["lms_enrollment_id"], "eid": body["employee_id"]})
        attempt_id = str(result.fetchone()[0])

        questions = db.session.execute(text(
            "SELECT id, question_text, options FROM lms_quiz_questions WHERE lms_course_quiz_id = :quiz"
        ), {"quiz": body["lms_course_quiz_id"]}).fetchall()

        db.session.commit()
        return created({"attempt_id": attempt_id, "questions": [dict(q._mapping) for q in questions]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_measure_bp.post("/assessments/<attempt_id>/submit")
def submit_attempt(attempt_id):
    """
    Public/ESS — submits all answers at once. DB trigger auto-grades
    and writes the score back to lms_enrollments.quiz_score_pct.
    """
    body = request.get_json() or {}
    answers = body.get("answers", [])  # [{"question_id": ..., "selected_option_index": ...}]
    if not answers: return error("answers array required", 422)
    try:
        for a in answers:
            db.session.execute(text("""
                INSERT INTO quiz_attempt_answers (quiz_attempt_id, lms_quiz_question_id, company_id, selected_option_index)
                VALUES (:attempt, :question, :cid, :selected)
            """), {"attempt": attempt_id, "question": a["question_id"], "cid": body.get("company_id"), "selected": a["selected_option_index"]})

        result = db.session.execute(text("""
            UPDATE quiz_attempts SET submitted_at = NOW() WHERE id = :aid RETURNING score_pct, passed
        """), {"aid": attempt_id})
        row = result.fetchone()
        db.session.commit()
        return success({"score_pct": float(row[0]) if row[0] else None, "passed": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_measure_bp.post("/assessments/ai-adaptive-difficulty")
def ai_adaptive_difficulty():
    """Public/ESS — AI adjusts future quiz difficulty based on the employee's historical performance."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "adaptive_quiz_difficulty", "employee_id": body["employee_id"]})
        return success({"recommended_difficulty": insight.get("recommended_difficulty")})
    except Exception as e:
        return error(str(e), 500)


# ── Excel export ───────────────────────────────────────
@training_measure_bp.get("/excel-export/<module>")
@require_auth
def excel_export(module):
    allowed = ["feedback", "effectiveness", "roi", "assessments"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"training_measurement_{module}_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"training_measurement_{module}_export.xlsx")
