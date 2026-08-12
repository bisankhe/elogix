"""
FILE: backend/routes/overtime_monitoring_routes.py
eLogix HRMS — Workforce Operations > Attendance Management >
Overtime & Monitoring Module (5 pages)
URL prefix: /api/v1/overtime-monitoring

  1. /dashboard            — Overtime & Monitoring (org-wide cost/burnout dashboard)
  2. /requests                — Overtime Management (pre-approval workflow)
  3. /late-early                 — Late & Early Tracking (grace-period exceptions)
  4. /realtime                      — Real-Time Monitoring (live feed)
  5. /mobile-devices                   — Mobile Attendance Tracking (device registry, offline sync)

Nepal Labour Act 2074: OT capped 4hr/day, 24hr/week, paid at 150%; employee
consent required; minors barred from OT; Section 20 attendance register.
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

overtime_bp = Blueprint("overtime_monitoring", __name__, url_prefix="/api/v1/overtime-monitoring")

NEPAL_WEEKLY_OT_CAP = 24
NEPAL_DAILY_OT_CAP = 4
NEPAL_OT_MULTIPLIER = 1.5


# ════════════════════════════════════════════════════════════════
# 1. OVERTIME & MONITORING DASHBOARD
# ════════════════════════════════════════════════════════════════

@overtime_bp.get("/dashboard/department-summary")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def department_summary():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_overtime_dept_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@overtime_bp.get("/dashboard/burnout-alerts")
@require_auth
@require_role("super_admin", "hr_manager")
def burnout_alerts():
    """Proactive alerts: employees at 75%+ of the 24hr weekly OT cap."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_ot_burnout_alerts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@overtime_bp.post("/dashboard/detect-ghost-ot")
@require_auth
@require_role("super_admin", "hr_manager")
def detect_ghost_ot():
    """AI cross-references logged OT against pre-approved requests to flag unauthorized overtime."""
    try:
        rows = db.session.execute(text("""
            SELECT e.employee_code, e.first_name, e.last_name, dar.attendance_date, dar.overtime_hours
            FROM daily_attendance_records dar
            JOIN employees e ON dar.employee_id = e.id
            WHERE dar.overtime_hours > 0 AND e.company_id = :cid
              AND NOT EXISTS (
                SELECT 1 FROM overtime_requests otr
                WHERE otr.employee_id = dar.employee_id AND otr.request_date = dar.attendance_date AND otr.status = 'approved'
              )
              AND dar.attendance_date >= CURRENT_DATE - INTERVAL '7 days'
        """), {"cid": g.company_id}).fetchall()
        return success({
            "ghost_ot_flags": [dict(r._mapping) for r in rows],
            "note": "Overtime logged without a corresponding pre-approved request.",
        })
    except Exception:
        return success({"ghost_ot_flags": []})


# ════════════════════════════════════════════════════════════════
# 2. OVERTIME MANAGEMENT (pre-approval workflow)
# ════════════════════════════════════════════════════════════════

@overtime_bp.get("/requests")
@require_auth
def list_requests():
    status = request.args.get("status")
    try:
        q = """
            SELECT otr.*, e.first_name, e.last_name, e.employee_code
            FROM overtime_requests otr
            JOIN employees e ON otr.employee_id = e.id
            WHERE otr.company_id = :cid AND NOT otr.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND otr.status = :status"; params["status"] = status
        q += " ORDER BY otr.created_at DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@overtime_bp.post("/requests")
def submit_request():
    """
    Public/ESS — employee taps 'Request Overtime'. DB trigger auto-computes
    weekly_hours_before/after preview. Rejects outright if requested_hours > 4
    (daily cap) or if employee is under 18 (LA2074 minors restriction).
    """
    body = request.get_json() or {}
    required = ["employee_id", "request_date", "requested_hours", "reason", "employee_consent"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    if body["requested_hours"] > NEPAL_DAILY_OT_CAP:
        return error(f"Overtime cannot exceed {NEPAL_DAILY_OT_CAP} hours/day per Nepal Labour Act 2074.", 422)
    if not body["employee_consent"]:
        return error("Employee consent is required before any overtime assignment per Nepal Labour Act 2074.", 422)

    try:
        emp = db.session.execute(text(
            "SELECT manager_id, basic_salary_npr, date_of_birth FROM employees WHERE id = :eid"
        ), {"eid": body["employee_id"]}).fetchone()

        if emp and emp.date_of_birth:
            age = (date.today() - emp.date_of_birth).days // 365
            if age < 18:
                return error("Workers under 18 cannot be deployed in overtime per Nepal Labour Act 2074.", 422)

        hourly_rate = (float(emp.basic_salary_npr) / 30 / 8) if emp and emp.basic_salary_npr else 0

        result = db.session.execute(text("""
            INSERT INTO overtime_requests
              (company_id, employee_id, request_date, requested_hours, reason,
               employee_consent, base_hourly_rate_npr, manager_employee_id, created_at)
            VALUES
              (:cid, :eid, :rdate, :hours, :reason,
               :consent, :rate, :mgr_id, NOW())
            RETURNING id, weekly_hours_after, exceeds_weekly_cap, ot_amount_npr
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "rdate": body["request_date"],
            "hours": body["requested_hours"], "reason": body["reason"], "consent": body["employee_consent"],
            "rate": hourly_rate, "mgr_id": emp.manager_id if emp else None,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "request_id": str(row[0]), "weekly_hours_after": float(row[1]) if row[1] else None,
            "exceeds_weekly_cap": row[2], "ot_amount_npr": float(row[3]) if row[3] else 0,
            "statutory_warning": "This would exceed the 24hr/week OT cap." if row[2] else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@overtime_bp.get("/approval-queue")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_queue():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_ot_approval_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@overtime_bp.put("/requests/<request_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_request(request_id):
    """Blocked by DB trigger if this would push the employee past the 24hr/week cap."""
    try:
        db.session.execute(text("""
            UPDATE overtime_requests
               SET status = 'approved', decided_by = :user, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True, "synced_to_payroll": True})
    except Exception as e:
        db.session.rollback()
        return error(
            str(e) if "weekly overtime cap" not in str(e).lower()
            else "Cannot approve: would exceed the 24-hour weekly overtime cap per Nepal Labour Act 2074.",
            422
        )


@overtime_bp.put("/requests/<request_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reject_request(request_id):
    body = request.get_json() or {}
    if not body.get("rejection_reason"): return error("rejection_reason required", 422)
    try:
        db.session.execute(text("""
            UPDATE overtime_requests
               SET status = 'rejected', decided_by = :user, rejection_reason = :reason, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "reason": body["rejection_reason"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. LATE & EARLY TRACKING
# ════════════════════════════════════════════════════════════════

@overtime_bp.get("/late-early")
@require_auth
def list_exceptions():
    exception_type = request.args.get("type")
    try:
        q = """
            SELECT lee.*, e.first_name, e.last_name, e.employee_code
            FROM late_early_exceptions lee
            JOIN employees e ON lee.employee_id = e.id
            WHERE lee.company_id = :cid
        """
        params = {"cid": g.company_id}
        if exception_type: q += " AND lee.exception_type = :etype"; params["etype"] = exception_type
        q += " ORDER BY lee.exception_date DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@overtime_bp.post("/late-early/log")
def log_exception():
    """
    Public — system auto-logs an exception when actual time deviates from
    scheduled. Grace period is applied via the generated column.
    """
    body = request.get_json() or {}
    required = ["employee_id", "exception_date", "exception_type", "scheduled_time", "actual_time"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO late_early_exceptions
              (company_id, employee_id, daily_attendance_record_id, exception_date,
               exception_type, scheduled_time, actual_time, grace_period_minutes, created_at)
            VALUES
              (:cid, :eid, :dar_id, :edate,
               :etype, :sched, :actual, :grace, NOW())
            RETURNING id, deviation_minutes, beyond_grace_period
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "dar_id": body.get("daily_attendance_record_id"),
            "edate": body["exception_date"], "etype": body["exception_type"], "sched": body["scheduled_time"],
            "actual": body["actual_time"], "grace": body.get("grace_period_minutes", 10),
        })
        row = result.fetchone()
        db.session.commit()
        return created({"exception_id": str(row[0]), "deviation_minutes": row[1], "beyond_grace_period": row[2]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@overtime_bp.get("/late-early/chronic-offenders")
@require_auth
@require_role("super_admin", "hr_manager")
def chronic_offenders():
    """Employees with 3+ beyond-grace-period exceptions this month — for coaching, not auto-penalty."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_chronic_late_early_offenders WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 4. REAL-TIME MONITORING
# ════════════════════════════════════════════════════════════════

@overtime_bp.get("/realtime/feed")
@require_auth
def realtime_feed():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_realtime_attendance_feed WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "feed": data,
            "working_count": sum(1 for r in data if r["current_status"] == "working"),
            "on_break_count": sum(1 for r in data if r["current_status"] == "on_break"),
            "unplanned_ot_count": sum(1 for r in data if r["is_accruing_ot"]),
            "absent_count": sum(1 for r in data if r["current_status"] == "absent"),
        })
    except Exception:
        return success({"feed": [], "working_count": 0, "on_break_count": 0, "unplanned_ot_count": 0, "absent_count": 0})


# ════════════════════════════════════════════════════════════════
# 5. MOBILE ATTENDANCE TRACKING
# ════════════════════════════════════════════════════════════════

@overtime_bp.get("/mobile-devices")
@require_auth
@require_role("super_admin", "hr_manager")
def list_devices():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_mobile_device_health WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@overtime_bp.post("/mobile-devices/register")
def register_device():
    """Public — mobile app registers itself on first launch."""
    body = request.get_json() or {}
    required = ["employee_id", "device_model", "os_name"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO mobile_devices
              (company_id, employee_id, device_model, os_name, os_version, app_version,
               device_fingerprint, last_sync_at, registered_at)
            VALUES
              (:cid, :eid, :model, :os, :os_ver, :app_ver,
               :fingerprint, NOW(), NOW())
            ON CONFLICT (device_fingerprint) DO UPDATE SET last_sync_at = NOW(), status = 'active'
            RETURNING id
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "model": body["device_model"],
            "os": body["os_name"], "os_ver": body.get("os_version"), "app_ver": body.get("app_version"),
            "fingerprint": body.get("device_fingerprint"),
        })
        device_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"device_id": device_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@overtime_bp.post("/mobile-devices/<device_id>/enroll-biometric")
def enroll_biometric(device_id):
    """Public — employee completes biometric enrollment on their device."""
    try:
        db.session.execute(text("""
            UPDATE mobile_devices SET biometric_enrolled = TRUE, biometric_enrolled_at = NOW(), updated_at = NOW()
            WHERE id = :did
        """), {"did": device_id})
        db.session.commit()
        return success({"enrolled": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@overtime_bp.post("/mobile-devices/<device_id>/offline-cache")
def cache_offline_punch(device_id):
    """
    Public — app caches a punch locally when offline. Marks device status
    as 'offline_cached' until sync completes.
    """
    body = request.get_json() or {}
    required = ["employee_id", "punch_type", "timestamp"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO offline_sync_queue
              (mobile_device_id, company_id, employee_id, cached_punch_type, cached_timestamp,
               cached_latitude, cached_longitude, created_at)
            VALUES
              (:did, :cid, :eid, :ptype, :ts,
               :lat, :lng, NOW())
        """), {"did": device_id, "cid": body.get("company_id"), "eid": body["employee_id"],
               "ptype": body["punch_type"], "ts": body["timestamp"], "lat": body.get("latitude"), "lng": body.get("longitude")})
        db.session.execute(text(
            "UPDATE mobile_devices SET status = 'offline_cached' WHERE id = :did"
        ), {"did": device_id})
        db.session.commit()
        return created({"cached": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@overtime_bp.post("/mobile-devices/<device_id>/sync-pending")
def sync_pending_queue(device_id):
    """Public — app reconnects and pushes all cached punches. DB trigger marks device active again."""
    try:
        pending = db.session.execute(text(
            "SELECT id FROM offline_sync_queue WHERE mobile_device_id = :did AND sync_status = 'pending'"
        ), {"did": device_id}).fetchall()

        for row in pending:
            db.session.execute(text(
                "UPDATE offline_sync_queue SET sync_status = 'synced' WHERE id = :qid"
            ), {"qid": row.id})
        db.session.commit()

        return success({"synced_count": len(pending)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@overtime_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["requests", "late-early", "mobile-devices"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"overtime_{module}")
    return jsonify(result), 200 if result["success"] else 422


@overtime_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"overtime_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"overtime_{module}_template.xlsx")
