"""
FILE: backend/routes/missed_punch_request_routes.py
eLogix HRMS — Workforce Operations > Attendance Management > Daily Attendance
> Missed Log In/Out Request (1 page)
URL prefix: /api/v1/missed-punch

3-step ESS workflow: Flag -> Submit Request -> Manager Approval.
On approval, auto-inserts the corresponding movement_event, which (via
existing daily_attendance triggers) recomputes hours/overtime/break
compliance — zero duplicated business logic.

Nepal Labour Act 2074: 8hr/48hr caps, Section 131 (AWOL/misconduct for
unapproved absence), Section 20 (attendance register accuracy).
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date, timedelta
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

missed_punch_bp = Blueprint("missed_punch_request", __name__, url_prefix="/api/v1/missed-punch")

MAX_REQUESTS_PER_PAY_PERIOD = 3


# ════════════════════════════════════════════════════════════════
# SCREEN 1: ESS Dashboard — Action Items / pending list
# ════════════════════════════════════════════════════════════════

@missed_punch_bp.get("/my-pending/<employee_id>")
def my_pending_requests(employee_id):
    """Public/ESS — the 'Action Items' banner: how many pending requests this employee has."""
    try:
        rows = db.session.execute(text("""
            SELECT * FROM missed_punch_requests
            WHERE employee_id = :eid AND NOT is_deleted
            ORDER BY submitted_at DESC
        """), {"eid": employee_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        pending_count = sum(1 for r in data if r["status"] == "pending")
        return success({"requests": data, "pending_count": pending_count})
    except Exception:
        return success({"requests": [], "pending_count": 0})


@missed_punch_bp.get("/regularization-cap/<employee_id>")
def regularization_cap_status(employee_id):
    """Shows how many of the per-pay-period cap this employee has used."""
    try:
        row = db.session.execute(text("""
            SELECT * FROM regularization_cap_tracking
            WHERE employee_id = :eid AND pay_period_start = DATE_TRUNC('month', CURRENT_DATE)::DATE
        """), {"eid": employee_id}).fetchone()
        if not row:
            return success({"request_count": 0, "max_allowed": MAX_REQUESTS_PER_PAY_PERIOD, "cap_exceeded": False})
        return success(dict(row._mapping))
    except Exception:
        return success({"request_count": 0, "max_allowed": MAX_REQUESTS_PER_PAY_PERIOD, "cap_exceeded": False})


# ════════════════════════════════════════════════════════════════
# SCREEN 2: Request Submission Form
# ════════════════════════════════════════════════════════════════

@missed_punch_bp.post("")
def submit_missed_punch_request():
    """
    Public/ESS — employee submits the missed punch request. DB trigger
    auto-computes weekly_hours_before/after preview for the manager screen.
    """
    body = request.get_json() or {}
    required = ["employee_id", "request_date", "punch_type", "requested_time", "reason_category", "comment"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        # Check regularization cap before allowing submission
        cap_row = db.session.execute(text("""
            SELECT request_count, max_allowed FROM regularization_cap_tracking
            WHERE employee_id = :eid AND pay_period_start = DATE_TRUNC('month', :rdate::DATE)::DATE
        """), {"eid": body["employee_id"], "rdate": body["request_date"]}).fetchone()

        cap_warning = None
        if cap_row and cap_row.request_count >= cap_row.max_allowed:
            cap_warning = f"This will be request #{cap_row.request_count + 1} this pay period (cap: {cap_row.max_allowed}). May trigger progressive discipline review."

        # Find the manager
        emp = db.session.execute(text(
            "SELECT manager_id FROM employees WHERE id = :eid"
        ), {"eid": body["employee_id"]}).fetchone()

        result = db.session.execute(text("""
            INSERT INTO missed_punch_requests
              (company_id, employee_id, request_date, punch_type, scheduled_time, requested_time,
               reason_category, comment, evidence_document_url, manager_employee_id, created_at)
            VALUES
              (:cid, :eid, :rdate, :ptype, :sched, :req_time,
               :reason, :comment, :evidence, :mgr_id, NOW())
            RETURNING id, weekly_hours_after, exceeds_statutory_cap, is_late_submission
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "rdate": body["request_date"],
            "ptype": body["punch_type"], "sched": body.get("scheduled_time"), "req_time": body["requested_time"],
            "reason": body["reason_category"], "comment": body["comment"], "evidence": body.get("evidence_document_url"),
            "mgr_id": emp.manager_id if emp else None,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "request_id": str(row[0]),
            "weekly_hours_after": float(row[1]) if row[1] else None,
            "exceeds_statutory_cap": row[2],
            "is_late_submission": row[3],
            "cap_warning": cap_warning,
            "statutory_warning": "This pushes weekly hours past the 48hr LA2074 cap — requires OT pre-authorization." if row[2] else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@missed_punch_bp.post("/ai-suggest-reason")
def ai_suggest_reason():
    """AI-assisted context generation — suggests likely reason based on calendar/location history."""
    body = request.get_json() or {}
    try:
        insight = generate_ai_insights({
            "type": "missed_punch_reason_suggestion",
            "employee_id": body.get("employee_id"),
            "punch_type": body.get("punch_type"),
            "date": body.get("request_date"),
        })
        return success({
            "suggested_reason": insight.get("suggested_reason", "Forgot to clock out"),
            "suggested_time": insight.get("suggested_time"),
            "confidence": insight.get("confidence", 0.5),
        })
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# SCREEN 3: Manager Approval Interface
# ════════════════════════════════════════════════════════════════

@missed_punch_bp.get("/approval-queue")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_queue():
    """Manager's pending requests, sorted with statutory-cap-risk first."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_missed_punch_approval_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@missed_punch_bp.get("/<request_id>")
@require_auth
def get_request_detail(request_id):
    """Full detail for the approval modal — includes weekly-hours-after preview."""
    try:
        row = db.session.execute(text("""
            SELECT mpr.*, e.first_name, e.last_name, e.employee_code
            FROM missed_punch_requests mpr
            JOIN employees e ON mpr.employee_id = e.id
            WHERE mpr.id = :rid AND mpr.company_id = :cid
        """), {"rid": request_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Missed punch request")
        return success(dict(row._mapping))
    except Exception as e:
        return error(str(e), 500)


@missed_punch_bp.put("/<request_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_request(request_id):
    """
    Approve. DB trigger auto-inserts the resulting movement_event, which
    cascades through existing daily_attendance triggers to recompute
    total hours, break compliance, and overtime.
    """
    try:
        db.session.execute(text("""
            UPDATE missed_punch_requests SET status = 'approved', decided_by = :user, updated_at = NOW()
            WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()

        row = db.session.execute(text(
            "SELECT resulting_movement_event_id FROM missed_punch_requests WHERE id = :rid"
        ), {"rid": request_id}).fetchone()

        return success({
            "approved": True,
            "movement_event_created": str(row.resulting_movement_event_id) if row.resulting_movement_event_id else None,
            "downstream_updated": ["Employee Movement log", "Daily Attendance totals", "Payroll timesheet"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@missed_punch_bp.put("/<request_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reject_request(request_id):
    body = request.get_json() or {}
    if not body.get("rejection_reason"): return error("rejection_reason required", 422)
    try:
        db.session.execute(text("""
            UPDATE missed_punch_requests
               SET status = 'rejected', decided_by = :user, rejection_reason = :reason, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "reason": body["rejection_reason"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# COMPLIANCE & PROGRESSIVE DISCIPLINE
# ════════════════════════════════════════════════════════════════

@missed_punch_bp.get("/habitual-offenders")
@require_auth
@require_role("super_admin", "hr_manager")
def habitual_offenders():
    """Employees exceeding the per-pay-period regularization cap — feeds progressive discipline."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_habitual_missed_punch_offenders WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@missed_punch_bp.get("/late-submissions")
@require_auth
@require_role("super_admin", "hr_manager")
def late_submissions():
    """Requests submitted outside the 48hr deadline window — compliance audit."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_late_missed_punch_submissions WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@missed_punch_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "missed_punch_requests")
    return jsonify(result), 200 if result["success"] else 422


@missed_punch_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("missed_punch_requests")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="missed_punch_requests_template.xlsx")
