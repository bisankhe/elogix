"""
FILE: backend/routes/skill_gap_training_request_routes.py
eLogix HRMS — Performance & Talent Management > Talent Development >
Learning & Development > Skill Gap Matrix + Analysis + Training Request
(3 pages, the brief's explicit pipeline)
URL prefix: /api/v1/skill-gap

[Employee Skill Matrix Data] -> [Skill Gap Analysis Calibration]
-> [Training Request Form Submission] -> [Approval Workflow Routing]
-> [LMS / Course Enrollment]

Page 1 (Matrix) reads the EXISTING v_skill_matrix directly (no new
routes needed beyond what Course Management already exposed). Page 2
adds formal calibration. Page 3 adds the self-service request + 3-stage
approval chain, auto-dispatching into training_recommendations on
final approval.

Nepal Labour Act 2074: annual training plan + budget allocation
mandate; objective, non-discriminatory skill assessment underpins
lawful merit-based decisions.
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

skill_gap_bp = Blueprint("skill_gap_training_request", __name__, url_prefix="/api/v1/skill-gap")


# ════════════════════════════════════════════════════════════════
# PAGE 1: SKILL GAP MATRIX (reads the EXISTING v_skill_matrix directly)
# ════════════════════════════════════════════════════════════════

@skill_gap_bp.get("/matrix")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def skill_matrix():
    """Reuses v_skill_matrix from Course Management -- no new capture here."""
    department = request.args.get("department")
    try:
        q = "SELECT * FROM v_skill_matrix WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if department: q += " AND department_name = :dept"; params["dept"] = department
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 2: SKILL GAP ANALYSIS (calibration)
# ════════════════════════════════════════════════════════════════

@skill_gap_bp.get("/calibrations")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_calibrations():
    status = request.args.get("status")
    try:
        q = "SELECT * FROM v_skill_gap_calibration_dashboard WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if status: q += " AND status = :status"; params["status"] = status
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@skill_gap_bp.post("/calibrations")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def initiate_calibration():
    """Manager opens a Matrix cell and starts formal calibration."""
    body = request.get_json() or {}
    required = ["employee_id", "skill_taxonomy_id", "actual_level_at_calibration", "required_level_at_calibration"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO skill_gap_calibrations
              (company_id, employee_id, skill_taxonomy_id, actual_level_at_calibration, required_level_at_calibration,
               manager_note, manager_confirmed_by, manager_confirmed_at, created_at)
            VALUES
              (:cid, :eid, :skill, :actual, :required,
               :note, :user, NOW(), NOW())
            RETURNING id, gap_size
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "skill": body["skill_taxonomy_id"],
            "actual": body["actual_level_at_calibration"], "required": body["required_level_at_calibration"],
            "note": body.get("manager_note"), "user": g.user_id,
        })
        row = result.fetchone()
        db.session.commit()
        return created({"calibration_id": str(row[0]), "gap_size": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@skill_gap_bp.post("/calibrations/ai-suggest-adjacent-skills")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_suggest_adjacent_skills():
    """AI recommends adjacent skills/roadmap based on the employee's career goals."""
    body = request.get_json() or {}
    if not body.get("calibration_id"): return error("calibration_id required", 422)
    try:
        insight = generate_ai_insights({"type": "adjacent_skill_recommendation", "calibration_id": body["calibration_id"]})
        suggestions = insight.get("adjacent_skills", [])
        db.session.execute(text(
            "UPDATE skill_gap_calibrations SET adjacent_skill_suggestions = :skills WHERE id = :cid"
        ), {"skills": suggestions, "cid": body["calibration_id"]})
        db.session.commit()
        return success({"adjacent_skills": suggestions})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@skill_gap_bp.put("/calibrations/<calibration_id>/hr-confirm")
@require_auth
@require_role("super_admin", "hr_manager")
def hr_confirm_calibration(calibration_id):
    """DB trigger flips status to 'calibrated' and notifies the employee."""
    try:
        db.session.execute(text("""
            UPDATE skill_gap_calibrations SET hr_confirmed_by = :user, hr_confirmed_at = NOW()
            WHERE id = :cid AND company_id = :company AND hr_confirmed_at IS NULL
        """), {"user": g.user_id, "cid": calibration_id, "company": g.company_id})
        db.session.commit()
        return success({"confirmed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: TRAINING REQUEST
# ════════════════════════════════════════════════════════════════

@skill_gap_bp.get("/training-requests")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_training_requests():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_request_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@skill_gap_bp.post("/training-requests")
def create_training_request():
    """
    Public/ESS — self-service submission, pre-populated from a calibration
    if provided. DB trigger auto-seeds the 3-stage approval chain
    (Manager -> Dept Head -> L&D/Budget) and notifies the first approver.
    """
    body = request.get_json() or {}
    required = ["employee_id", "skill_gap_label", "proposed_course_label", "business_justification"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO training_requests
              (company_id, employee_id, skill_gap_calibration_id, skill_gap_label, proposed_course_label,
               lms_course_id, business_justification, estimated_cost_npr, created_at)
            VALUES
              (:cid, :eid, :calib_id, :gap_label, :course,
               :lms_id, :justification, :cost, NOW())
            RETURNING id
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "calib_id": body.get("skill_gap_calibration_id"),
            "gap_label": body["skill_gap_label"], "course": body["proposed_course_label"], "lms_id": body.get("lms_course_id"),
            "justification": body["business_justification"], "cost": body.get("estimated_cost_npr", 0),
        })
        request_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"request_id": request_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@skill_gap_bp.get("/training-requests/pending-approvals")
@require_auth
def pending_approvals():
    """Manager/Dept Head/L&D queue: requests awaiting THEIR stage's decision."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_request_pending_approvals WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@skill_gap_bp.put("/training-requests/stages/<stage_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_stage(stage_id):
    """
    DB trigger advances to the next stage, or -- on final stage approval --
    auto-dispatches into the EXISTING training_recommendations table.
    """
    body = request.get_json() or {}
    try:
        result = db.session.execute(text("""
            UPDATE training_request_approval_stages SET status = 'approved', comments = :comments
            WHERE id = :sid AND company_id = :cid AND status = 'pending'
            RETURNING training_request_id
        """), {"comments": body.get("comments"), "sid": stage_id, "cid": g.company_id})
        row = result.fetchone()
        db.session.commit()
        if not row: return not_found("Approval stage")

        req = db.session.execute(text(
            "SELECT status, dispatched_training_recommendation_id FROM training_requests WHERE id = :rid"
        ), {"rid": row[0]}).fetchone()

        return success({
            "approved": True, "request_status": req.status,
            "dispatched_training_recommendation_id": str(req.dispatched_training_recommendation_id) if req.dispatched_training_recommendation_id else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@skill_gap_bp.put("/training-requests/stages/<stage_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reject_stage(stage_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE training_request_approval_stages SET status = 'rejected', comments = :comments
            WHERE id = :sid AND company_id = :cid
        """), {"comments": body.get("comments"), "sid": stage_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@skill_gap_bp.get("/training-requests/budget-widget")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def budget_widget():
    """The real-time L&D budget visibility widget."""
    fiscal_year = request.args.get("fiscal_year_label")
    try:
        q = "SELECT * FROM v_ld_budget_widget WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if fiscal_year: q += " AND fiscal_year_label = :fy"; params["fy"] = fiscal_year
        row = db.session.execute(text(q), params).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# ── Excel import/export ───────────────────────────────────────
@skill_gap_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["calibrations", "training-requests"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"skill_gap_{module}")
    return jsonify(result), 200 if result["success"] else 422


@skill_gap_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"skill_gap_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"skill_gap_{module}_template.xlsx")
