"""
FILE: backend/routes/attendance_regularization_routes.py
NepHR Pro — Workforce Operations > Attendance Management > Daily Attendance
> Attendance Regularization (1 page)
URL prefix: /api/v1/attendance-regularization

Broader umbrella than Missed Punch Request — covers whole-day status
corrections: Absent->Present, Half-Day->Full-Day, On-Duty/Field-Work,
System Downtime Fallback, LWP->Sanctioned Leave.

Nepal Labour Rules 2075 Section 37: no worker may remain absent without
sanctioned leave; emergency absences regularized retroactively via
employer sanction; >30 consecutive days unsanctioned absence = grounds
for removal from service.
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

regularization_bp = Blueprint("attendance_regularization", __name__, url_prefix="/api/v1/attendance-regularization")


# ════════════════════════════════════════════════════════════════
# CALENDAR VIEW & ESS DASHBOARD
# ════════════════════════════════════════════════════════════════

@regularization_bp.get("/calendar/<employee_id>")
def calendar_view(employee_id):
    """Public/ESS — color-coded monthly grid per the brief's wireframe."""
    month = request.args.get("month", date.today().strftime("%Y-%m"))
    try:
        rows = db.session.execute(text("""
            SELECT * FROM v_attendance_calendar_status
            WHERE employee_id = :eid AND TO_CHAR(attendance_date, 'YYYY-MM') = :month
            ORDER BY attendance_date
        """), {"eid": employee_id, "month": month}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@regularization_bp.get("/my-requests/<employee_id>")
def my_requests(employee_id):
    """Public/ESS — employee's own regularization request history."""
    try:
        rows = db.session.execute(text("""
            SELECT * FROM attendance_regularization_requests
            WHERE employee_id = :eid AND NOT is_deleted
            ORDER BY submitted_at DESC
        """), {"eid": employee_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({"requests": data, "pending_count": sum(1 for r in data if r["status"] == "pending")})
    except Exception:
        return success({"requests": [], "pending_count": 0})


# ════════════════════════════════════════════════════════════════
# REQUEST SUBMISSION
# ════════════════════════════════════════════════════════════════

@regularization_bp.post("")
def submit_regularization_request():
    """
    Public/ESS — employee submits a regularization request. DB trigger
    auto-computes weekly_hours_before/after preview and checks calendar
    event matching (via AI insight call below).
    """
    body = request.get_json() or {}
    required = ["employee_id", "regularization_date", "regularization_type",
                "original_status", "requested_status", "reason_category", "justification"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        # AI cross-checks calendar events for field-work/on-duty claims
        calendar_match = False
        calendar_ref = None
        ai_confidence = None
        if body["regularization_type"] in ("on_duty_field_work", "absent_to_present"):
            insight = generate_ai_insights({
                "type": "regularization_calendar_match",
                "employee_id": body["employee_id"],
                "date": body["regularization_date"],
                "justification": body["justification"],
            })
            calendar_match = insight.get("calendar_matched", False)
            calendar_ref = insight.get("matched_event")
            ai_confidence = insight.get("confidence_score", 50)

        emp = db.session.execute(text(
            "SELECT manager_id FROM employees WHERE id = :eid"
        ), {"eid": body["employee_id"]}).fetchone()

        result = db.session.execute(text("""
            INSERT INTO attendance_regularization_requests
              (company_id, employee_id, daily_attendance_record_id, related_missed_punch_request_id,
               regularization_date, regularization_type, original_status, requested_status,
               reason_category, justification, evidence_document_url,
               calendar_event_matched, calendar_event_reference, ai_confidence_score,
               manager_employee_id, created_at)
            VALUES
              (:cid, :eid, :dar_id, :mpr_id,
               :rdate, :rtype, :orig, :requested,
               :reason, :justification, :evidence,
               :cal_match, :cal_ref, :ai_conf,
               :mgr_id, NOW())
            RETURNING id, weekly_hours_after, exceeds_statutory_cap, is_late_submission
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "dar_id": body.get("daily_attendance_record_id"),
            "mpr_id": body.get("related_missed_punch_request_id"), "rdate": body["regularization_date"],
            "rtype": body["regularization_type"], "orig": body["original_status"], "requested": body["requested_status"],
            "reason": body["reason_category"], "justification": body["justification"],
            "evidence": body.get("evidence_document_url"), "cal_match": calendar_match, "cal_ref": calendar_ref,
            "ai_conf": ai_confidence, "mgr_id": emp.manager_id if emp else None,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "request_id": str(row[0]),
            "weekly_hours_after": float(row[1]) if row[1] else None,
            "exceeds_statutory_cap": row[2],
            "is_late_submission": row[3],
            "calendar_matched": calendar_match,
            "statutory_warning": "This pushes weekly hours past the 48hr LA2074 cap." if row[2] else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@regularization_bp.post("/ai-suggest")
def ai_suggest_regularization():
    """
    AI-driven auto-regularization (brief): analyzes past behavioral data
    to pre-fill or pre-approve recurring, consistent patterns.
    """
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        row = db.session.execute(text("""
            SELECT * FROM regularization_ai_patterns
            WHERE employee_id = :eid AND auto_approve_eligible
            ORDER BY occurrence_count DESC LIMIT 1
        """), {"eid": body["employee_id"]}).fetchone()

        if not row:
            return success({"has_suggestion": False})

        return success({
            "has_suggestion": True,
            "pattern_description": row.pattern_description,
            "suggested_reason": row.suggested_reason,
            "occurrence_count": row.occurrence_count,
            "note": f"This matches a recurring pattern seen {row.occurrence_count} times — eligible for fast-track approval.",
        })
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# MANAGER APPROVAL INTERFACE
# ════════════════════════════════════════════════════════════════

@regularization_bp.get("/approval-queue")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_queue():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_regularization_approval_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@regularization_bp.get("/<request_id>")
@require_auth
def get_request_detail(request_id):
    try:
        row = db.session.execute(text("""
            SELECT arr.*, e.first_name, e.last_name, e.employee_code
            FROM attendance_regularization_requests arr
            JOIN employees e ON arr.employee_id = e.id
            WHERE arr.id = :rid AND arr.company_id = :cid
        """), {"rid": request_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Regularization request")
        return success(dict(row._mapping))
    except Exception as e:
        return error(str(e), 500)


@regularization_bp.put("/<request_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_request(request_id):
    """Approve. DB trigger updates the daily_attendance_records row and feeds the AI pattern tracker."""
    try:
        db.session.execute(text("""
            UPDATE attendance_regularization_requests
               SET status = 'approved', decided_by = :user, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "approved": True,
            "downstream_updated": ["Daily Attendance record", "Employee Movement log", "Payroll timesheet"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@regularization_bp.put("/<request_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reject_request(request_id):
    body = request.get_json() or {}
    if not body.get("rejection_reason"): return error("rejection_reason required", 422)
    try:
        db.session.execute(text("""
            UPDATE attendance_regularization_requests
               SET status = 'rejected', decided_by = :user, rejection_reason = :reason, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "reason": body["rejection_reason"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@regularization_bp.put("/<request_id>/send-back")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def send_back_request(request_id):
    """'Send Back for Modification' — per the brief's manager dashboard action buttons."""
    body = request.get_json() or {}
    if not body.get("sent_back_notes"): return error("sent_back_notes required", 422)
    try:
        db.session.execute(text("""
            UPDATE attendance_regularization_requests
               SET status = 'sent_back', sent_back_notes = :notes, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"notes": body["sent_back_notes"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"sent_back": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# COMPLIANCE & AI INSIGHTS
# ════════════════════════════════════════════════════════════════

@regularization_bp.get("/ai-suggestions/org-wide")
@require_auth
@require_role("super_admin", "hr_manager")
def org_wide_ai_suggestions():
    """All employees with recurring patterns eligible for AI fast-track approval."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_regularization_ai_suggestions WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@regularization_bp.get("/late-submissions")
@require_auth
@require_role("super_admin", "hr_manager")
def late_submissions():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_late_regularization_submissions WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@regularization_bp.get("/severe-absence-risk")
@require_auth
@require_role("super_admin", "hr_manager")
def severe_absence_risk():
    """
    Employees approaching the LA Rules 2075 30-consecutive-day unsanctioned
    absence threshold — legal grounds for removal from service.
    """
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_severe_absence_risk WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@regularization_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "attendance_regularization")
    return jsonify(result), 200 if result["success"] else 422


@regularization_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("attendance_regularization")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="attendance_regularization_template.xlsx")
