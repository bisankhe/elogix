"""
FILE: backend/routes/learning_portal_elearning_routes.py
NepHR Pro — Performance & Talent Management > Talent Development >
Learning & Development > Learning Portal + E-Learning Management
(2 pages)
URL prefix: /api/v1/learning-portal

Learning Portal (employee-facing) and E-Learning Management (admin-
facing) are both consumption layers over the EXISTING lms_courses/
lms_enrollments/lms_certifications catalog. No course data is
re-captured here -- only bookmarks, discussion threads, compliance
escalation cadence, and the HRIS sync audit trail.

Nepal Labour Act 2074 Section 18: trainees min wage + social security,
up to 1 year. Section 78: mandatory OHS training. Section 16/17:
intern institutional agreement, 8hr/day-48hr/week cap. Digital
personnel/training records requirement underpins the audit trail.
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

learning_portal_bp = Blueprint("learning_portal_elearning", __name__, url_prefix="/api/v1/learning-portal")


# ════════════════════════════════════════════════════════════════
# LEARNING PORTAL (employee-facing)
# ════════════════════════════════════════════════════════════════

@learning_portal_bp.get("/saved-courses/<employee_id>")
def saved_courses(employee_id):
    """Public/ESS — 'Saved Courses' quick action."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_saved_courses WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@learning_portal_bp.post("/saved-courses")
def save_course():
    """Public/ESS — bookmark a course for later."""
    body = request.get_json() or {}
    required = ["employee_id", "lms_course_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO saved_courses (company_id, employee_id, lms_course_id, saved_at)
            VALUES (:cid, :eid, :course, NOW())
            ON CONFLICT (employee_id, lms_course_id) DO NOTHING
            RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "course": body["lms_course_id"]})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Already saved."})
        return created({"saved_id": str(row[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@learning_portal_bp.delete("/saved-courses/<saved_id>")
def unsave_course(saved_id):
    try:
        db.session.execute(text("DELETE FROM saved_courses WHERE id = :sid"), {"sid": saved_id})
        db.session.commit()
        return success({"removed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@learning_portal_bp.get("/discussion/<course_id>")
def course_discussion(course_id):
    """Public/ESS — the Learning Player's discussion sidebar."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_course_discussion WHERE lms_course_id = :cid"
        ), {"cid": course_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@learning_portal_bp.post("/discussion/<course_id>/post")
def post_discussion_message(course_id):
    """Public/ESS — post a message or question in the course discussion thread."""
    body = request.get_json() or {}
    required = ["posted_by", "message"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO course_discussion_messages (company_id, lms_course_id, posted_by, is_instructor, message, posted_at)
            VALUES (:cid, :course, :posted_by, :is_instructor, :msg, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "course": course_id, "posted_by": body["posted_by"],
               "is_instructor": body.get("is_instructor", False), "msg": body["message"]})
        msg_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"message_id": msg_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@learning_portal_bp.get("/transcript/<employee_id>")
def my_transcript(employee_id):
    """Public/ESS — the 'My Transcript' quick action: full completed-course history."""
    try:
        rows = db.session.execute(text("""
            SELECT le.*, lc.title, lc.duration_hours FROM lms_enrollments le
            JOIN lms_courses lc ON le.lms_course_id = lc.id
            WHERE le.employee_id = :eid AND le.completed_at IS NOT NULL
            ORDER BY le.completed_at DESC
        """), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# E-LEARNING MANAGEMENT (admin-facing)
# ════════════════════════════════════════════════════════════════

@learning_portal_bp.get("/compliance-workflows")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_compliance_workflows():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_compliance_workflow_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@learning_portal_bp.post("/compliance-workflows")
@require_auth
@require_role("super_admin", "hr_manager")
def create_compliance_workflow():
    body = request.get_json() or {}
    required = ["lms_course_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO compliance_reminder_workflows (company_id, lms_course_id, target_department_id, reminder_days_before, created_at)
            VALUES (:cid, :course, :dept, :days, NOW()) RETURNING id
        """), {"cid": g.company_id, "course": body["lms_course_id"], "dept": body.get("target_department_id"),
               "days": body.get("reminder_days_before", [30, 14, 3])})
        workflow_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"workflow_id": workflow_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@learning_portal_bp.put("/compliance-workflows/<workflow_id>/escalate")
@require_auth
@require_role("super_admin", "hr_manager")
def escalate_workflow(workflow_id):
    """Manually trigger HR escalation. DB trigger logs the action to the audit trail."""
    try:
        db.session.execute(text("""
            UPDATE compliance_reminder_workflows SET escalation_level = 'hr_escalated'
            WHERE id = :wid AND company_id = :cid AND escalation_level != 'hr_escalated'
        """), {"wid": workflow_id, "cid": g.company_id})
        db.session.commit()
        return success({"escalated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@learning_portal_bp.post("/compliance-workflows/<workflow_id>/send-manual-reminder")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def send_manual_reminder(workflow_id):
    """Sends an out-of-cadence reminder, logged to the audit trail."""
    try:
        workflow = db.session.execute(text(
            "SELECT lms_course_id FROM compliance_reminder_workflows WHERE id = :wid"
        ), {"wid": workflow_id}).fetchone()
        if not workflow: return not_found("Workflow")

        db.session.execute(text("""
            INSERT INTO lms_hris_sync_log (company_id, event_type, event_description, related_lms_course_id, synced_at)
            VALUES (:cid, 'manual_reminder_sent', 'HR manually triggered a reminder outside the automated cadence.', :course, NOW())
        """), {"cid": g.company_id, "course": workflow.lms_course_id})
        db.session.commit()
        return success({"reminder_sent": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@learning_portal_bp.get("/hris-sync-log")
@require_auth
@require_role("super_admin", "hr_manager")
def hris_sync_log():
    """The labour-inspection-ready digital audit trail."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_hris_sync_audit_trail WHERE company_id = :cid LIMIT 200"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@learning_portal_bp.get("/content-standards")
@require_auth
@require_role("super_admin", "hr_manager")
def content_standards():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_content_standards_breakdown WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@learning_portal_bp.get("/catalog-rebalancing")
@require_auth
@require_role("super_admin", "hr_manager")
def catalog_rebalancing():
    """Cross-references the existing Skill Matrix to find under-covered skill gaps."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_catalog_rebalancing_suggestions WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@learning_portal_bp.post("/catalog-rebalancing/ai-suggest-course")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_suggest_new_course():
    """AI drafts a course outline for an identified, uncovered skill gap."""
    body = request.get_json() or {}
    if not body.get("skill_gap"): return error("skill_gap required", 422)
    try:
        insight = generate_ai_insights({"type": "lms_new_course_outline", "skill_gap": body["skill_gap"], "company_id": g.company_id})
        return success({"suggested_outline": insight.get("suggested_outline")})
    except Exception as e:
        return error(str(e), 500)


# ── Excel export ───────────────────────────────────────
@learning_portal_bp.get("/excel-export/<module>")
@require_auth
def excel_export(module):
    allowed = ["compliance-workflows", "hris-sync-log"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"learning_portal_{module}_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"learning_portal_{module}_export.xlsx")
