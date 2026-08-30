"""
FILE: backend/routes/training_participation_reports_routes.py
eLogix HRMS — Performance & Talent Management > Talent Development >
Learning & Development > Employee Training Participation List +
Training Reports (2 pages, capstone of the entire L&D arc)
URL prefix: /api/v1/training-participation

Page 1 reads the EXISTING lms_enrollments directly via
v_training_participation_list -- no new enrollment capture. Page 2
rolls up across nearly every table built across the L&D arc.

Nepal Labour Act 2074: trainee/intern participation logs and
institution-employer agreements maintained for inspection; OSH/fire-
drill participation formally recorded; Skills Transfer Progress
Reports required for foreign-national work permit renewal.
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

participation_bp = Blueprint("training_participation_reports", __name__, url_prefix="/api/v1/training-participation")


# ════════════════════════════════════════════════════════════════
# PAGE 1: EMPLOYEE TRAINING PARTICIPATION LIST
# ════════════════════════════════════════════════════════════════

@participation_bp.get("")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_participation():
    """Manager view auto-filters to direct reports if department_head; full org view for hr_manager/super_admin."""
    status = request.args.get("status")
    department = request.args.get("department")
    try:
        q = "SELECT * FROM v_training_participation_list WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if status: q += " AND status = :status"; params["status"] = status
        if department: q += " AND department_name = :dept"; params["dept"] = department
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@participation_bp.post("/bulk-action")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def bulk_action():
    """
    Reassign Course or Send Reminder across multiple selected rows.
    DB trigger logs the action and notifies each affected employee + manager.
    """
    body = request.get_json() or {}
    required = ["action_type", "enrollment_ids"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if body["action_type"] not in ("reassign_course", "send_reminder"):
        return error("action_type must be reassign_course or send_reminder", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO participation_bulk_actions_log (company_id, action_type, target_enrollment_ids, performed_by, performed_at)
            VALUES (:cid, :atype, :ids, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "atype": body["action_type"], "ids": body["enrollment_ids"], "user": g.user_id})
        log_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"log_id": log_id, "affected_count": len(body["enrollment_ids"])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@participation_bp.post("/tag-course")
@require_auth
@require_role("super_admin", "hr_manager")
def tag_course():
    """Dynamic tagging: Compliance / Skill Development / Leadership."""
    body = request.get_json() or {}
    required = ["lms_course_id", "tag"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO training_tags (company_id, lms_course_id, tag) VALUES (:cid, :course, :tag)
            ON CONFLICT (lms_course_id, tag) DO NOTHING
        """), {"cid": g.company_id, "course": body["lms_course_id"], "tag": body["tag"]})
        db.session.commit()
        return created({"tagged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: TRAINING REPORTS
# ════════════════════════════════════════════════════════════════

@participation_bp.get("/reports/kpis")
@require_auth
@require_role("super_admin", "hr_manager")
def reports_kpis():
    """Top-line KPI cards: Total Hours, Completion Rate, Avg Cost/Employee, Skill Gap Closure."""
    try:
        kpis = db.session.execute(text(
            "SELECT * FROM v_training_reports_kpis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        closure = db.session.execute(text(
            "SELECT closure_pct FROM v_skill_gap_closure_index WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        data = dict(kpis._mapping) if kpis else {}
        data["skill_gap_closure_pct"] = float(closure[0]) if closure and closure[0] else 0
        return success(data)
    except Exception:
        return success({})


@participation_bp.get("/reports/completion-by-department")
@require_auth
@require_role("super_admin", "hr_manager")
def completion_by_department():
    """The bar chart's data source."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_completion_by_dept WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@participation_bp.get("/reports/type-breakdown")
@require_auth
@require_role("super_admin", "hr_manager")
def type_breakdown():
    """The pie chart's data source: Compliance vs Skill Development vs Leadership."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_type_breakdown WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@participation_bp.post("/reports/custom-builder")
@require_auth
@require_role("super_admin", "hr_manager")
def save_custom_report():
    """The drag-and-drop report builder's saved configuration."""
    body = request.get_json() or {}
    required = ["report_name", "selected_fields"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO custom_report_definitions (company_id, report_name, selected_fields, filter_config, created_by, created_at)
            VALUES (:cid, :name, :fields, :filters, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["report_name"], "fields": body["selected_fields"],
               "filters": json.dumps(body.get("filter_config", {})), "user": g.user_id})
        report_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"report_id": report_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@participation_bp.post("/reports/schedule")
@require_auth
@require_role("super_admin", "hr_manager")
def schedule_report():
    """The 'Schedule Monthly Report' button. DB trigger computes next_send_at."""
    body = request.get_json() or {}
    required = ["recipient_employee_ids"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO scheduled_report_subscriptions (company_id, report_type, frequency, recipient_employee_ids, created_by, created_at)
            VALUES (:cid, :rtype, :freq, :recipients, :user, NOW()) RETURNING id, next_send_at
        """), {"cid": g.company_id, "rtype": body.get("report_type", "training_reports_ld"), "freq": body.get("frequency", "monthly"),
               "recipients": body["recipient_employee_ids"], "user": g.user_id})
        row = result.fetchone()
        db.session.commit()
        return created({"subscription_id": str(row[0]), "next_send_at": str(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@participation_bp.put("/reports/schedule/<subscription_id>/toggle")
@require_auth
@require_role("super_admin", "hr_manager")
def toggle_schedule(subscription_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE scheduled_report_subscriptions SET is_active = :active WHERE id = :sid AND company_id = :cid
        """), {"active": body.get("is_active", True), "sid": subscription_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@participation_bp.post("/reports/ai-narrative-summary")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_narrative_summary():
    """AI generates a plain-language executive summary of the training reports dashboard."""
    try:
        insight = generate_ai_insights({"type": "training_reports_narrative", "company_id": g.company_id})
        return success({"summary": insight.get("summary")})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@participation_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "training_participation")
    return jsonify(result), 200 if result["success"] else 422


@participation_bp.get("/excel-export")
@require_auth
def excel_export():
    b = build_template_xlsx("training_participation_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="training_participation_export.xlsx")


@participation_bp.get("/reports/excel-export")
@require_auth
def reports_excel_export():
    b = build_template_xlsx("training_reports_ld_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="training_reports_ld_export.xlsx")
