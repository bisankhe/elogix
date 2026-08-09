"""
FILE: backend/routes/daily_attendance_routes.py
NepHR Pro — Workforce Operations > Attendance Management > Daily Attendance (5 pages)
URL prefix: /api/v1/daily-attendance

  1. /live              — Live Attendance (real-time feed)
  2. /movement             — Employee Movement (login->logout timeline)
  3. /biometric               — Biometric Attendance (reads existing biometric_punch_log)
  4. /geo                        — Geo Attendance (reads existing gps_punches)
  5. /web-checkin                   — Web Check-In & Out
  + /qr                                — QR code registry (employees/assets/transactions)

Nepal Labour Act 2074 Section 20: attendance register, 8hr/48hr caps,
mandatory 30-min break, OT capped 4hr/day at min 1.5x, Section 13:
falsifying check-ins is misconduct.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date, timedelta
import io, json, secrets

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx

daily_att_bp = Blueprint("daily_attendance", __name__, url_prefix="/api/v1/daily-attendance")


# ════════════════════════════════════════════════════════════════
# 1. LIVE ATTENDANCE
# ════════════════════════════════════════════════════════════════

@daily_att_bp.get("/live")
@require_auth
def live_feed():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_live_attendance_feed WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        counts = {
            "working": sum(1 for r in data if r["current_status"] == "working"),
            "on_break": sum(1 for r in data if r["current_status"] == "on_break"),
            "field_duty": sum(1 for r in data if r["current_status"] == "field_duty"),
            "absent": sum(1 for r in data if r["current_status"] == "absent"),
        }
        return success({"feed": data, "counts": counts})
    except Exception:
        return success({"feed": [], "counts": {}})


@daily_att_bp.get("/live/missed-checkouts")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def missed_checkouts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_missed_checkout_alerts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 2. EMPLOYEE MOVEMENT
# ════════════════════════════════════════════════════════════════

@daily_att_bp.get("/movement/<employee_id>")
@require_auth
def employee_movement_log(employee_id):
    att_date = request.args.get("date", date.today().isoformat())
    try:
        record = db.session.execute(text("""
            SELECT * FROM daily_attendance_records
            WHERE employee_id = :eid AND attendance_date = :date
        """), {"eid": employee_id, "date": att_date}).fetchone()

        events = db.session.execute(text("""
            SELECT * FROM movement_events
            WHERE employee_id = :eid AND event_time::DATE = :date
            ORDER BY event_time
        """), {"eid": employee_id, "date": att_date}).fetchall()

        return success({
            "record": dict(record._mapping) if record else None,
            "events": [dict(e._mapping) for e in events],
        })
    except Exception as e:
        return error(str(e), 500)


@daily_att_bp.post("/movement/log-event")
def log_movement_event():
    """
    Public — logs a login/logout/break/movement event. DB trigger
    auto-creates/updates the daily_attendance_records row and current_status.
    """
    body = request.get_json() or {}
    required = ["employee_id", "event_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO movement_events
              (company_id, employee_id, event_type, location_name, latitude, longitude,
               source_method, source_gps_punch_id, source_biometric_punch_id, source_web_session_id, created_at)
            VALUES
              (:cid, :eid, :etype, :loc, :lat, :lng,
               :method, :gps_id, :bio_id, :web_id, NOW())
            RETURNING id, daily_attendance_record_id
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "etype": body["event_type"],
            "loc": body.get("location_name"), "lat": body.get("latitude"), "lng": body.get("longitude"),
            "method": body.get("source_method", "manual"), "gps_id": body.get("source_gps_punch_id"),
            "bio_id": body.get("source_biometric_punch_id"), "web_id": body.get("source_web_session_id"),
        })
        row = result.fetchone()
        db.session.commit()
        return created({"event_id": str(row[0]), "daily_record_id": str(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@daily_att_bp.put("/movement/<record_id>/close-day")
def close_attendance_day(record_id):
    """Records logout time, triggering total-hours/break/OT computation via DB trigger."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE daily_attendance_records SET last_logout_time = :logout, current_status = 'logged_out'
            WHERE id = :rid
        """), {"logout": body.get("logout_time", datetime.utcnow().isoformat()), "rid": record_id})
        db.session.commit()

        row = db.session.execute(text(
            "SELECT total_hours_worked, total_break_minutes, break_compliant, overtime_hours FROM daily_attendance_records WHERE id = :rid"
        ), {"rid": record_id}).fetchone()

        return success({
            "total_hours_worked": float(row.total_hours_worked) if row.total_hours_worked else None,
            "total_break_minutes": row.total_break_minutes, "break_compliant": row.break_compliant,
            "overtime_hours": float(row.overtime_hours) if row.overtime_hours else 0,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@daily_att_bp.put("/movement/<record_id>/flag-classification")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def flag_day_classification(record_id):
    """Manager/Supervisor amends classification anytime, anywhere (per brief)."""
    body = request.get_json() or {}
    allowed = ["is_night_duty", "is_public_holiday_worked", "is_weekly_rest_day_worked", "is_extra_duty"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("No valid classification fields provided", 400)

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"rid": record_id, "user": g.user_id, "reason": body.get("amendment_reason", "")})
    try:
        db.session.execute(text(
            f"UPDATE daily_attendance_records SET {set_clause}, last_amended_by = :user, "
            f"last_amended_at = NOW(), amendment_reason = :reason WHERE id = :rid"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@daily_att_bp.get("/movement/statutory-counters")
@require_auth
@require_role("super_admin", "hr_manager")
def statutory_counters():
    """30-day rolling: night duties, holidays worked, OT, break violations per employee."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_daily_statutory_counters WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 3. BIOMETRIC ATTENDANCE (reads existing biometric_punch_log)
# ════════════════════════════════════════════════════════════════

@daily_att_bp.get("/biometric/today")
@require_auth
def biometric_today():
    try:
        rows = db.session.execute(text("""
            SELECT bpl.*, bd.device_name, e.first_name, e.last_name
            FROM biometric_punch_log bpl
            JOIN biometric_devices bd ON bpl.device_id = bd.id
            LEFT JOIN employees e ON bpl.employee_id = e.id
            WHERE bpl.company_id = :cid AND bpl.punch_time::DATE = CURRENT_DATE
            ORDER BY bpl.punch_time DESC
        """), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        flagged = [r for r in data if r["match_status"] != "matched"]
        return success({"punches": data, "flagged_count": len(flagged)})
    except Exception:
        return success({"punches": [], "flagged_count": 0})


# ════════════════════════════════════════════════════════════════
# 4. GEO ATTENDANCE (reads existing gps_punches)
# ════════════════════════════════════════════════════════════════

@daily_att_bp.get("/geo/today")
@require_auth
def geo_today():
    try:
        rows = db.session.execute(text("""
            SELECT gp.*, e.first_name, e.last_name, gf.name AS fence_name, gf.fence_type
            FROM gps_punches gp
            JOIN employees e ON gp.employee_id = e.id
            LEFT JOIN geo_fences gf ON gp.geo_fence_id = gf.id
            WHERE gp.company_id = :cid AND gp.punch_time::DATE = CURRENT_DATE
            ORDER BY gp.punch_time DESC
        """), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "punches": data,
            "accepted_count": sum(1 for r in data if r["status"] == "accepted"),
            "rejected_count": sum(1 for r in data if r["status"] == "rejected"),
        })
    except Exception:
        return success({"punches": [], "accepted_count": 0, "rejected_count": 0})


# ════════════════════════════════════════════════════════════════
# 5. WEB CHECK-IN & OUT
# ════════════════════════════════════════════════════════════════

@daily_att_bp.post("/web-checkin/start")
def web_checkin_start():
    """Public/ESS — employee taps the big check-in button. Captures IP/session for audit."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        session_token = secrets.token_hex(16)
        result = db.session.execute(text("""
            INSERT INTO web_checkin_sessions
              (company_id, employee_id, ip_address, session_token, browser_user_agent, created_at)
            VALUES
              (:cid, :eid, :ip, :token, :ua, NOW())
            RETURNING id, duplicate_ip_flag
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"],
            "ip": request.remote_addr, "token": session_token,
            "ua": request.headers.get("User-Agent", "")[:500],
        })
        row = result.fetchone()
        db.session.commit()

        # Mirror to movement_events for the unified timeline
        db.session.execute(text("""
            INSERT INTO movement_events (company_id, employee_id, event_type, source_method, source_web_session_id, created_at)
            VALUES (:cid, :eid, 'login', 'web', :wsid, NOW())
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "wsid": row[0]})
        db.session.commit()

        return created({
            "session_id": str(row[0]), "session_token": session_token,
            "duplicate_ip_warning": row[1],
            "checked_in_at": datetime.utcnow().isoformat(),
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@daily_att_bp.put("/web-checkin/<session_id>/end")
def web_checkin_end(session_id):
    """Employee taps check-out. DB trigger computes total_hours and deducts standard break."""
    try:
        db.session.execute(text(
            "UPDATE web_checkin_sessions SET logout_time = NOW() WHERE id = :sid"
        ), {"sid": session_id})
        db.session.commit()

        row = db.session.execute(text(
            "SELECT employee_id, company_id, total_hours, breaks_deducted_minutes FROM web_checkin_sessions WHERE id = :sid"
        ), {"sid": session_id}).fetchone()

        db.session.execute(text("""
            INSERT INTO movement_events (company_id, employee_id, event_type, source_method, source_web_session_id, created_at)
            VALUES (:cid, :eid, 'logout', 'web', :sid, NOW())
        """), {"cid": row.company_id, "eid": row.employee_id, "sid": session_id})
        db.session.commit()

        return success({
            "total_hours": float(row.total_hours) if row.total_hours else None,
            "breaks_deducted_minutes": row.breaks_deducted_minutes,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@daily_att_bp.get("/web-checkin/today")
@require_auth
def web_checkin_today():
    try:
        rows = db.session.execute(text("""
            SELECT w.*, e.first_name, e.last_name
            FROM web_checkin_sessions w
            JOIN employees e ON w.employee_id = e.id
            WHERE w.company_id = :cid AND w.login_time::DATE = CURRENT_DATE
            ORDER BY w.login_time DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# QR CODE REGISTRY (employees / assets / transactions / goods)
# ════════════════════════════════════════════════════════════════

@daily_att_bp.get("/qr/overview")
@require_auth
@require_role("super_admin", "hr_manager")
def qr_overview():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_qr_codes_overview WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@daily_att_bp.get("/qr/employee/<employee_id>")
@require_auth
def get_employee_qr(employee_id):
    """Retrieve an employee's QR badge (auto-generated on employee creation via DB trigger)."""
    try:
        row = db.session.execute(text("""
            SELECT * FROM qr_codes WHERE employee_id = :eid AND qr_type = 'employee_badge' AND is_active
        """), {"eid": employee_id}).fetchone()
        if not row: return not_found("Employee QR badge")
        return success(dict(row._mapping))
    except Exception as e:
        return error(str(e), 500)


@daily_att_bp.post("/qr/transaction")
@require_auth
def create_transaction_qr():
    """Generates a QR code for a transaction or goods item (brief requirement)."""
    body = request.get_json() or {}
    required = ["qr_type", "transaction_reference_table", "transaction_reference_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if body["qr_type"] not in ("transaction", "goods"):
        return error("qr_type must be 'transaction' or 'goods' for this endpoint", 422)
    try:
        payload = f"{body['qr_type'].upper()}-QR-{body['transaction_reference_id']}-{secrets.token_hex(8)}"
        result = db.session.execute(text("""
            INSERT INTO qr_codes
              (company_id, qr_type, transaction_reference_table, transaction_reference_id,
               qr_payload, expires_at, generated_at)
            VALUES
              (:cid, :qtype, :ref_table, :ref_id,
               :payload, :expires, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "qtype": body["qr_type"], "ref_table": body["transaction_reference_table"],
            "ref_id": body["transaction_reference_id"], "payload": payload, "expires": body.get("expires_at"),
        })
        qr_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"qr_id": qr_id, "qr_payload": payload})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@daily_att_bp.post("/qr/scan")
def scan_qr_code():
    """
    Public — universal QR scan endpoint. Used for QR-based clock-in (Web
    Check-In page's "Scan QR Badge" option), asset audits, transaction verification.
    """
    body = request.get_json() or {}
    if not body.get("qr_payload"): return error("qr_payload required", 422)
    try:
        qr = db.session.execute(text(
            "SELECT * FROM qr_codes WHERE qr_payload = :payload"
        ), {"payload": body["qr_payload"]}).fetchone()

        if not qr:
            return error("Invalid QR code.", 404)

        result = "success"
        if not qr.is_active:
            result = "inactive"
        elif qr.expires_at and qr.expires_at < datetime.utcnow():
            result = "expired"

        db.session.execute(text("""
            INSERT INTO qr_scan_log (qr_code_id, company_id, scanned_by, scan_purpose, scan_result, device_info, scanned_at)
            VALUES (:qid, :cid, :scanner, :purpose, :result, :device, NOW())
        """), {"qid": qr.id, "cid": qr.company_id, "scanner": body.get("scanned_by"),
               "purpose": body.get("scan_purpose", "general"), "result": result,
               "device": body.get("device_info", "")[:255]})
        db.session.commit()

        response = {"scan_result": result, "qr_type": qr.qr_type}
        if result == "success" and qr.qr_type == "employee_badge" and qr.usable_for_attendance:
            response["employee_id"] = str(qr.employee_id)
            response["action_available"] = "clock_in_out"
        elif result == "success" and qr.qr_type == "asset":
            response["asset_id"] = str(qr.asset_id)

        return success(response)
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@daily_att_bp.get("/qr/<qr_id>/scan-history")
@require_auth
@require_role("super_admin", "hr_manager")
def qr_scan_history(qr_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM qr_scan_log WHERE qr_code_id = :qid ORDER BY scanned_at DESC"
        ), {"qid": qr_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel export (read-heavy module — export only) ──
@daily_att_bp.get("/excel-export/<module>")
@require_auth
@require_role("super_admin", "hr_manager")
def excel_export(module):
    allowed = ["live", "movement", "biometric", "geo", "web-checkin"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"daily_attendance_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"daily_attendance_{module}_export.xlsx")
