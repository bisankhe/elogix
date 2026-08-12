"""
FILE: backend/routes/performance_evaluation_routes.py
eLogix HRMS — Performance & Talent Management > Goal & Performance >
Performance Evaluation Module (7 pages)
URL prefix: /api/v1/performance-evaluation

  1. /appraisals          — Performance Appraisal (pulls live KRA/KPI/OKR)
  2. /continuous-feedback     — Continuous Feedback
  3. /360-results                — 360 Degree Feedback (results view over released pms_360_cycles)
  4. /behaviour-evaluations          — Behaviour Evaluation
  5. /reviews                            — Performance Review
  6. /reports                                — Performance Reports
  7. /pips                                       — Performance Improvement Plan

Nepal Labour Act 2074 Section 112: criteria communicated before period
starts; disagreement/review right. Section 142/52(1): 3 consecutive
unsatisfactory appraisals = termination grounds, mandatory 7-day
written-explanation period first. Behavioral assessments non-
discriminatory (gender/caste/age).
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

perf_eval_bp = Blueprint("performance_evaluation", __name__, url_prefix="/api/v1/performance-evaluation")


# ════════════════════════════════════════════════════════════════
# 1. PERFORMANCE APPRAISAL
# ════════════════════════════════════════════════════════════════

@perf_eval_bp.get("/appraisals")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_appraisals():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_performance_appraisal_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_eval_bp.post("/appraisals")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_appraisal():
    """DB trigger auto-snapshots live KRA/KPI/OKR averages from Goal Management at creation time."""
    body = request.get_json() or {}
    required = ["employee_id", "cycle_label", "cycle_start_date", "cycle_end_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO performance_appraisals
              (company_id, employee_id, cycle_label, cycle_start_date, cycle_end_date,
               criteria_communicated_at, created_by, created_at)
            VALUES
              (:cid, :eid, :label, :start, :end,
               NOW(), :user, NOW())
            RETURNING id, kra_avg_pct, kpi_avg_pct, okr_avg_pct
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "label": body["cycle_label"],
            "start": body["cycle_start_date"], "end": body["cycle_end_date"], "user": g.user_id,
        })
        row = result.fetchone()
        db.session.commit()
        return created({
            "appraisal_id": str(row[0]), "kra_avg_pct": float(row[1]) if row[1] else None,
            "kpi_avg_pct": float(row[2]) if row[2] else None, "okr_avg_pct": float(row[3]) if row[3] else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_eval_bp.put("/appraisals/<appraisal_id>/submit-ratings")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def submit_ratings(appraisal_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE performance_appraisals
               SET self_rating = :self_r, manager_rating = :mgr_r, final_rating = :final_r, manager_comments = :comments
             WHERE id = :aid AND company_id = :cid
        """), {"self_r": body.get("self_rating"), "mgr_r": body.get("manager_rating"), "final_r": body.get("final_rating"),
               "comments": body.get("manager_comments"), "aid": appraisal_id, "cid": g.company_id})
        db.session.commit()
        return success({"ratings_submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_eval_bp.put("/appraisals/<appraisal_id>/acknowledge")
def acknowledge_appraisal(appraisal_id):
    """Public/ESS — employee acknowledges. DB trigger notifies employee + manager via shared mechanism."""
    try:
        db.session.execute(text("""
            UPDATE performance_appraisals SET status = 'acknowledged' WHERE id = :aid AND status = 'pending_manager'
        """), {"aid": appraisal_id})
        db.session.commit()
        return success({"acknowledged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_eval_bp.put("/appraisals/<appraisal_id>/dispute")
def file_disagreement(appraisal_id):
    """Public/ESS — Section 112's right to note disagreement and trigger a formal review."""
    body = request.get_json() or {}
    if not body.get("disagreement_note"): return error("disagreement_note required", 422)
    try:
        db.session.execute(text("""
            UPDATE performance_appraisals
               SET status = 'disputed', employee_disagreement_note = :note, review_requested = TRUE
             WHERE id = :aid
        """), {"note": body["disagreement_note"], "aid": appraisal_id})
        db.session.commit()
        return success({"disputed": True, "note": "A formal review has been triggered."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. CONTINUOUS FEEDBACK
# ════════════════════════════════════════════════════════════════

@perf_eval_bp.get("/continuous-feedback")
def feedback_feed():
    """Public/ESS — feedback feed, filterable by employee."""
    employee_id = request.args.get("employee_id")
    try:
        q = "SELECT * FROM v_continuous_feedback_feed"
        params = {}
        if employee_id:
            q += " WHERE to_employee_id = :eid OR from_employee_id = :eid"
            params["eid"] = employee_id
        rows = db.session.execute(text(q + " LIMIT 100"), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_eval_bp.post("/continuous-feedback")
def give_feedback():
    """Public/ESS — praise/check-in/constructive note. Can be linked to a future appraisal as evidence."""
    body = request.get_json() or {}
    required = ["from_employee_id", "to_employee_id", "feedback_type", "message"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO continuous_feedback_entries (company_id, from_employee_id, to_employee_id, feedback_type, message, created_at)
            VALUES (:cid, :from_eid, :to_eid, :ftype, :msg, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "from_eid": body["from_employee_id"], "to_eid": body["to_employee_id"],
               "ftype": body["feedback_type"], "msg": body["message"]})
        feedback_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"feedback_id": feedback_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. 360 DEGREE FEEDBACK (results view over RELEASED pms_360_cycles)
# ════════════════════════════════════════════════════════════════

@perf_eval_bp.get("/360-results/<employee_id>")
def get_360_results(employee_id):
    """
    Public/ESS — development-focused summary pulled from the EXISTING
    pms_360 radar view. This page never creates/edits a cycle.
    """
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pms_360_radar WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        if not data: return success({"competencies": [], "top_strength": None, "biggest_blind_spot": None})

        strongest = max(data, key=lambda r: r.get("manager_score") or 0)
        gaps = [r for r in data if r.get("self_score") is not None and r.get("manager_score") is not None]
        biggest_gap = max(gaps, key=lambda r: abs(float(r["self_score"]) - float(r["manager_score"]))) if gaps else None

        return success({
            "competencies": data,
            "top_strength": strongest.get("competency_name") if strongest else None,
            "biggest_blind_spot": biggest_gap.get("competency_name") if biggest_gap else None,
        })
    except Exception:
        return success({"competencies": [], "top_strength": None, "biggest_blind_spot": None})


# ════════════════════════════════════════════════════════════════
# 4. BEHAVIOUR EVALUATION
# ════════════════════════════════════════════════════════════════

@perf_eval_bp.get("/behaviour-evaluations")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_behaviour_evaluations():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_behaviour_evaluation_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_eval_bp.post("/behaviour-evaluations")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_behaviour_evaluation():
    """
    DB trigger BLOCKS submission if any dimension scores below 6 without
    a sufficiently detailed evidence_note -- enforces the brief's
    "specific evidence required" rule at the database level.
    """
    body = request.get_json() or {}
    required = ["employee_id", "evaluator_employee_id", "cycle_label"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO behaviour_evaluations
              (company_id, employee_id, evaluator_employee_id, cycle_label,
               communication_score, teamwork_score, core_values_score, adaptability_score, integrity_score,
               evidence_note, created_at)
            VALUES
              (:cid, :eid, :evaluator, :cycle,
               :comm, :team, :values, :adapt, :integrity,
               :evidence, NOW())
            RETURNING id, overall_avg, requires_evidence
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "evaluator": body["evaluator_employee_id"], "cycle": body["cycle_label"],
            "comm": body.get("communication_score"), "team": body.get("teamwork_score"), "values": body.get("core_values_score"),
            "adapt": body.get("adaptability_score"), "integrity": body.get("integrity_score"), "evidence": body.get("evidence_note"),
        })
        row = result.fetchone()
        db.session.commit()
        return created({"evaluation_id": str(row[0]), "overall_avg": float(row[1]) if row[1] else None, "requires_evidence": row[2]})
    except Exception as e:
        db.session.rollback()
        return error("Evidence required: a score below 6 needs specific, cited behaviors (min 10 characters)." if "evidence" in str(e).lower() else str(e), 422)


# ════════════════════════════════════════════════════════════════
# 5. PERFORMANCE REVIEW
# ════════════════════════════════════════════════════════════════

@perf_eval_bp.get("/reviews")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_reviews():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_performance_review_evidence WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_eval_bp.post("/reviews")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def schedule_review():
    body = request.get_json() or {}
    required = ["employee_id", "cycle_label"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO performance_reviews (company_id, employee_id, performance_appraisal_id, cycle_label, meeting_date, created_at)
            VALUES (:cid, :eid, :appraisal_id, :cycle, :meeting_date, NOW()) RETURNING id
        """), {"cid": g.company_id, "eid": body["employee_id"], "appraisal_id": body.get("performance_appraisal_id"),
               "cycle": body["cycle_label"], "meeting_date": body.get("meeting_date")})
        review_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"review_id": review_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_eval_bp.put("/reviews/<review_id>/complete")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def complete_review(review_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE performance_reviews
               SET discussion_notes = :notes, career_development_topics = :topics, status = 'completed', completed_at = NOW()
             WHERE id = :rid AND company_id = :cid
        """), {"notes": body.get("discussion_notes"), "topics": body.get("career_development_topics", []), "rid": review_id, "cid": g.company_id})
        db.session.commit()
        return success({"completed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 6. PERFORMANCE REPORTS
# ════════════════════════════════════════════════════════════════

@perf_eval_bp.get("/reports/rating-distribution")
@require_auth
@require_role("super_admin", "hr_manager")
def rating_distribution():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_rating_distribution WHERE company_id = :cid ORDER BY final_rating"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_eval_bp.get("/reports/completion-tracker")
@require_auth
@require_role("super_admin", "hr_manager")
def completion_tracker():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_appraisal_completion_by_dept WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_eval_bp.post("/reports/ai-skill-gap-analysis")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_skill_gap_analysis():
    try:
        insight = generate_ai_insights({"type": "skill_gap_analysis", "company_id": g.company_id})
        return success({"skill_gaps": insight.get("skill_gaps", [])})
    except Exception as e:
        return error(str(e), 500)


@perf_eval_bp.post("/reports/ai-turnover-risk")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_turnover_risk():
    """AI flags potential turnover risk from declining engagement, repeated below-target appraisals, overtime patterns."""
    try:
        insight = generate_ai_insights({"type": "turnover_risk_prediction", "company_id": g.company_id})
        return success({"flagged_employees": insight.get("flagged_employees", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 7. PERFORMANCE IMPROVEMENT PLAN (PIP)
# ════════════════════════════════════════════════════════════════

@perf_eval_bp.get("/pips")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_pips():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pip_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_eval_bp.post("/pips")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_pip():
    """
    Confirms the 7-day explanation period status up front. DB trigger
    notifies the employee + reporting manager via the shared mechanism.
    """
    body = request.get_json() or {}
    required = ["employee_id", "reason", "duration_days", "start_date", "explanation_period_status"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if body["explanation_period_status"] == "pending":
        return error("Cannot initiate a PIP: the mandatory 7-day written-explanation period must be completed or waived by the employee first.", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO performance_improvement_plans
              (company_id, employee_id, triggering_appraisal_id, reason, duration_days, start_date,
               linked_training_note, checkin_frequency, explanation_period_status, explanation_note, created_by, created_at)
            VALUES
              (:cid, :eid, :appraisal_id, :reason, :duration, :start,
               :training, :checkin_freq, :explanation_status, :explanation_note, :user, NOW())
            RETURNING id, end_date
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "appraisal_id": body.get("triggering_appraisal_id"),
            "reason": body["reason"], "duration": body["duration_days"], "start": body["start_date"],
            "training": body.get("linked_training_note"), "checkin_freq": body.get("checkin_frequency", "weekly"),
            "explanation_status": body["explanation_period_status"], "explanation_note": body.get("explanation_note"), "user": g.user_id,
        })
        row = result.fetchone()
        pip_id = str(row[0])

        for m in body.get("milestones", []):
            db.session.execute(text("""
                INSERT INTO pip_milestones (pip_id, company_id, goal_description, target_date, created_at)
                VALUES (:pid, :cid, :goal, :target, NOW())
            """), {"pid": pip_id, "cid": g.company_id, "goal": m["goal_description"], "target": m["target_date"]})

        db.session.commit()
        return created({"pip_id": pip_id, "end_date": str(row[1]), "milestones_created": len(body.get("milestones", []))})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_eval_bp.put("/pip-milestones/<milestone_id>/update-progress")
def update_milestone_progress(milestone_id):
    """Public/ESS — self-service progress update on a PIP milestone."""
    body = request.get_json() or {}
    if body.get("progress_pct") is None: return error("progress_pct required", 422)
    try:
        db.session.execute(text("""
            UPDATE pip_milestones SET progress_pct = :pct,
                   completed_at = CASE WHEN :pct >= 100 THEN NOW() ELSE completed_at END
            WHERE id = :mid
        """), {"pct": body["progress_pct"], "mid": milestone_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_eval_bp.put("/pips/<pip_id>/close")
@require_auth
@require_role("super_admin", "hr_manager")
def close_pip(pip_id):
    """Blocked by DB trigger if explanation_period_status is still 'pending'."""
    body = request.get_json() or {}
    outcome = body.get("outcome", "completed_success")
    if outcome not in ("completed_success", "completed_unsuccessful"):
        return error("outcome must be completed_success or completed_unsuccessful", 422)
    try:
        db.session.execute(text("""
            UPDATE performance_improvement_plans SET status = :outcome WHERE id = :pid AND company_id = :cid
        """), {"outcome": outcome, "pid": pip_id, "cid": g.company_id})
        db.session.commit()
        return success({"closed": True, "outcome": outcome})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


# ── Excel import/export ───────────────────────────────────────
@perf_eval_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["appraisals", "behaviour-evaluations", "pips"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"performance_eval_{module}")
    return jsonify(result), 200 if result["success"] else 422


@perf_eval_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"performance_eval_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"performance_eval_{module}_template.xlsx")
