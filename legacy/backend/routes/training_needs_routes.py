"""
FILE: backend/routes/training_needs_routes.py
eLogix HRMS — Performance & Talent Management > Talent Development >
Learning & Development > Training Needs Identification + Analysis
(2 pages, first module of the Talent Development top-level area)
URL prefix: /api/v1/training-needs

TNI (spotting) -> TNA (diagnosis/prioritization) -> approved dispatches
into the EXISTING training_recommendations table -- never duplicated.
TNA cross-references okr_objectives/performance_appraisals/
behaviour_evaluations to ground priority scoring in business evidence.

Nepal Labour Act 2074: Clause 29 (employer duty to arrange health/
safety/welfare); Clauses 48-52 (OSH liability for inadequate technical/
safety instruction); Clause 132 (enterprise rules bridging performance
cycles to capacity-building).
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

training_needs_bp = Blueprint("training_needs", __name__, url_prefix="/api/v1/training-needs")


# ════════════════════════════════════════════════════════════════
# 1. TRAINING NEEDS IDENTIFICATION (TNI)
# ════════════════════════════════════════════════════════════════

@training_needs_bp.get("/identified")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_identified_needs():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_needs_identified_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_needs_bp.post("/identified")
def flag_need():
    """Public/ESS — self-flagging, manager flagging, or automated system entry."""
    body = request.get_json() or {}
    required = ["source", "competency_label"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if not body.get("employee_id") and not body.get("department_id"):
        return error("Either employee_id or department_id is required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO training_needs_identified
              (company_id, employee_id, department_id, source, competency_label, current_level, required_level, context_note, flagged_by, created_at)
            VALUES
              (:cid, :eid, :dept, :source, :competency, :current, :required, :context, :flagged_by, NOW())
            RETURNING id, gap_size
        """), {
            "cid": body.get("company_id"), "eid": body.get("employee_id"), "dept": body.get("department_id"),
            "source": body["source"], "competency": body["competency_label"], "current": body.get("current_level"),
            "required": body.get("required_level"), "context": body.get("context_note"), "flagged_by": body.get("flagged_by"),
        })
        row = result.fetchone()
        db.session.commit()
        return created({"need_id": str(row[0]), "gap_size": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_needs_bp.post("/automated-skill-gap-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_automated_skill_gap_scan():
    """AI compares current role profile competencies against required levels and auto-creates flagged needs."""
    try:
        insight = generate_ai_insights({"type": "automated_skill_gap_scan", "company_id": g.company_id})
        gaps = insight.get("gaps", [])
        for gap in gaps:
            db.session.execute(text("""
                INSERT INTO training_needs_identified
                  (company_id, employee_id, department_id, source, competency_label, current_level, required_level, context_note, created_at)
                VALUES (:cid, :eid, :dept, 'automated_skill_gap', :competency, :current, :required, :context, NOW())
            """), {"cid": g.company_id, "eid": gap.get("employee_id"), "dept": gap.get("department_id"),
                   "competency": gap["competency_label"], "current": gap["current_level"], "required": gap["required_level"],
                   "context": gap.get("context_note", "Auto-detected via role profile comparison.")})
        db.session.commit()
        return success({"gaps_flagged": len(gaps)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_needs_bp.put("/identified/<need_id>/dismiss")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def dismiss_need(need_id):
    try:
        db.session.execute(text("""
            UPDATE training_needs_identified SET status = 'dismissed' WHERE id = :nid AND company_id = :cid
        """), {"nid": need_id, "cid": g.company_id})
        db.session.commit()
        return success({"dismissed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Pulse surveys ──
@training_needs_bp.post("/pulse-surveys")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def launch_pulse_survey():
    body = request.get_json() or {}
    required = ["question"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO pulse_surveys (company_id, department_id, question, launched_by, launched_at, closes_at)
            VALUES (:cid, :dept, :question, :user, NOW(), :closes)
            RETURNING id
        """), {"cid": g.company_id, "dept": body.get("department_id"), "question": body["question"],
               "user": g.user_id, "closes": body.get("closes_at")})
        survey_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"survey_id": survey_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_needs_bp.post("/pulse-surveys/<survey_id>/respond")
def respond_to_survey(survey_id):
    """Public/ESS — team member responds to a pulse survey."""
    body = request.get_json() or {}
    required = ["respondent_employee_id", "response_text"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO pulse_survey_responses (pulse_survey_id, company_id, respondent_employee_id, response_text, submitted_at)
            VALUES (:sid, :cid, :respondent, :response, NOW())
            ON CONFLICT (pulse_survey_id, respondent_employee_id) DO UPDATE SET response_text = EXCLUDED.response_text
        """), {"sid": survey_id, "cid": body.get("company_id"), "respondent": body["respondent_employee_id"], "response": body["response_text"]})
        db.session.commit()
        return created({"responded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_needs_bp.get("/pulse-surveys/results")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def pulse_survey_results():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pulse_survey_results WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 2. TRAINING NEEDS ANALYSIS (TNA)
# ════════════════════════════════════════════════════════════════

@training_needs_bp.get("/analysis")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_analysis():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_needs_analysis_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_needs_bp.post("/analysis")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_analysis():
    """
    Cross-references the identified need against OKR/Appraisal/Behaviour
    Evaluation evidence. priority_score is auto-computed by a generated column.
    """
    body = request.get_json() or {}
    required = ["training_need_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO training_needs_analysis
              (company_id, training_need_id, linked_okr_id, linked_appraisal_id, linked_behaviour_eval_id,
               performance_link_note, employees_affected_count, business_impact, recommended_course, recommended_provider, created_at)
            VALUES
              (:cid, :need_id, :okr_id, :appraisal_id, :behaviour_id,
               :link_note, :affected, :impact, :course, :provider, NOW())
            RETURNING id, priority_score
        """), {
            "cid": g.company_id, "need_id": body["training_need_id"], "okr_id": body.get("linked_okr_id"),
            "appraisal_id": body.get("linked_appraisal_id"), "behaviour_id": body.get("linked_behaviour_eval_id"),
            "link_note": body.get("performance_link_note"), "affected": body.get("employees_affected_count", 1),
            "impact": body.get("business_impact", "medium"), "course": body.get("recommended_course"),
            "provider": body.get("recommended_provider"),
        })
        row = result.fetchone()
        db.session.commit()
        return created({"analysis_id": str(row[0]), "priority_score": float(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_needs_bp.put("/analysis/<analysis_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_and_dispatch(analysis_id):
    """
    The 'single click' handoff: DB trigger auto-dispatches into the
    EXISTING training_recommendations table once approved.
    """
    try:
        result = db.session.execute(text("""
            UPDATE training_needs_analysis SET status = 'approved', approved_by = :user
            WHERE id = :aid AND company_id = :cid AND status = 'under_review'
            RETURNING dispatched_training_recommendation_id
        """), {"user": g.user_id, "aid": analysis_id, "cid": g.company_id})
        row = result.fetchone()
        db.session.commit()
        if not row: return not_found("Training needs analysis record")
        return success({"approved": True, "dispatched_training_recommendation_id": str(row[0]) if row[0] else None})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_needs_bp.put("/analysis/<analysis_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager")
def reject_analysis(analysis_id):
    try:
        db.session.execute(text("""
            UPDATE training_needs_analysis SET status = 'rejected' WHERE id = :aid AND company_id = :cid
        """), {"aid": analysis_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_needs_bp.post("/analysis/ai-prioritize")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_prioritize_pending():
    """AI suggests business-linkage and impact rating for all unanalyzed identified needs."""
    try:
        insight = generate_ai_insights({"type": "training_need_prioritization", "company_id": g.company_id})
        return success({"suggestions": insight.get("suggestions", [])})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@training_needs_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["identified", "analysis"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"training_needs_{module}")
    return jsonify(result), 200 if result["success"] else 422


@training_needs_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"training_needs_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"training_needs_{module}_template.xlsx")
