"""
FILE: backend/routes/attendance_setup_routes.py
eLogix HRMS — Workforce Operations > Attendance Management > Attendance Setup (8 pages)
URL prefix: /api/v1/attendance-setup

  1. /policies              — Attendance Policy
  2. /shifts                  — Shift Management (reuses existing shift_types)
  3. /breaks                    — Break Management
  4. /rosters                     — Roster Management (2-day-advance rule, exchanges)
  5. /biometric-devices             — Biometric Integration
  6. /gps-punches                     — GPS Attendance
  7. /geo-fences                        — Geo-Fencing
  8. /task-assignments                    — Task & Location Assignment

Nepal Labour Act 2074: 8hr/48hr caps, OT max 4hr/24hr at 150%, mandatory
30-min break after 5hrs, 1 weekly rest day, compensatory leave within 21
days, Section 20 attendance register + 5yr retention.
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

attsetup_bp = Blueprint("attendance_setup", __name__, url_prefix="/api/v1/attendance-setup")

NEPAL_MAX_HOURS_PER_DAY = 8
NEPAL_MAX_HOURS_PER_WEEK = 48
NEPAL_MAX_OT_PER_DAY = 4
NEPAL_MAX_OT_PER_WEEK = 24
NEPAL_OT_MULTIPLIER = 1.5


# ════════════════════════════════════════════════════════════════
# 1. ATTENDANCE POLICY
# ════════════════════════════════════════════════════════════════

@attsetup_bp.get("/policies")
@require_auth
def list_policies():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM attendance_policies WHERE company_id = :cid AND NOT is_deleted"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@attsetup_bp.post("/policies")
@require_auth
@require_role("super_admin", "hr_manager")
def create_policy():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)

    if body.get("standard_hours_per_day", 8) > NEPAL_MAX_HOURS_PER_DAY:
        return error(f"Standard hours/day cannot exceed {NEPAL_MAX_HOURS_PER_DAY} per Nepal Labour Act 2074.", 422)
    if body.get("max_overtime_hours_per_day", 4) > NEPAL_MAX_OT_PER_DAY:
        return error(f"Overtime cannot exceed {NEPAL_MAX_OT_PER_DAY} hours/day per Nepal Labour Act 2074.", 422)

    try:
        db.session.execute(text("""
            INSERT INTO attendance_policies
              (company_id, name, applicable_to, standard_hours_per_day, standard_hours_per_week,
               max_overtime_hours_per_day, max_overtime_hours_per_week, overtime_rate_multiplier,
               late_grace_period_minutes, weekly_rest_day, created_at)
            VALUES
              (:cid, :name, :applicable, :hrs_day, :hrs_week,
               :ot_day, :ot_week, :ot_mult,
               :grace, :rest_day, NOW())
        """), {
            "cid": g.company_id, "name": body["name"], "applicable": body.get("applicable_to", "all"),
            "hrs_day": body.get("standard_hours_per_day", 8), "hrs_week": body.get("standard_hours_per_week", 48),
            "ot_day": body.get("max_overtime_hours_per_day", 4), "ot_week": body.get("max_overtime_hours_per_week", 24),
            "ot_mult": max(body.get("overtime_rate_multiplier", 1.5), NEPAL_OT_MULTIPLIER),
            "grace": body.get("late_grace_period_minutes", 10), "rest_day": body.get("weekly_rest_day", "Saturday"),
        })
        db.session.commit()
        return created({"message": "Attendance policy created.", "la2074_note": "OT compensated at minimum 150% per Section."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. SHIFT MANAGEMENT (reuses existing shift_types table)
# ════════════════════════════════════════════════════════════════

@attsetup_bp.get("/shifts")
@require_auth
def list_shifts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM shift_types WHERE company_id = :cid AND NOT is_deleted"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 3. BREAK MANAGEMENT
# ════════════════════════════════════════════════════════════════

@attsetup_bp.get("/breaks")
@require_auth
def list_break_policies():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM break_policies WHERE company_id = :cid AND NOT is_deleted"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@attsetup_bp.post("/breaks")
@require_auth
@require_role("super_admin", "hr_manager")
def create_break_policy():
    body = request.get_json() or {}
    required = ["name", "duration_minutes"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO break_policies
              (company_id, name, duration_minutes, trigger_after_hours, is_mandatory,
               counted_as_working_hours, auto_lockout_enabled, applicable_to,
               is_statutory_maternity_break, created_at)
            VALUES
              (:cid, :name, :duration, :trigger, :mandatory,
               :counted, :lockout, :applicable,
               :maternity, NOW())
        """), {
            "cid": g.company_id, "name": body["name"], "duration": body["duration_minutes"],
            "trigger": body.get("trigger_after_hours", 5), "mandatory": body.get("is_mandatory", True),
            "counted": body.get("counted_as_working_hours", True), "lockout": body.get("auto_lockout_enabled", False),
            "applicable": body.get("applicable_to", "All Employees"), "maternity": body.get("is_statutory_maternity_break", False),
        })
        db.session.commit()
        return created({"message": "Break policy created.",
                        "la2074_note": "30-min break after 5hrs is mandatory and counted as working time."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.post("/breaks/start")
def start_break():
    """Public/ESS — employee taps 'Start Break'."""
    body = request.get_json() or {}
    required = ["employee_id", "break_policy_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO break_logs (company_id, employee_id, break_policy_id, attendance_date, break_start_time, created_at)
            VALUES (:cid, :eid, :bpid, NOW()::DATE, NOW(), NOW())
            RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "bpid": body["break_policy_id"]})
        log_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"break_log_id": log_id, "started_at": datetime.utcnow().isoformat()})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.put("/breaks/<log_id>/end")
def end_break(log_id):
    """Public/ESS — employee returns from break. Auto-lockout enforced if too early."""
    try:
        row = db.session.execute(text("""
            SELECT bl.break_start_time, bp.duration_minutes, bp.auto_lockout_enabled
            FROM break_logs bl JOIN break_policies bp ON bl.break_policy_id = bp.id
            WHERE bl.id = :lid
        """), {"lid": log_id}).fetchone()
        if not row: return not_found("Break log")

        elapsed_min = (datetime.utcnow() - row.break_start_time.replace(tzinfo=None)).total_seconds() / 60
        is_compliant = elapsed_min >= row.duration_minutes
        blocked = row.auto_lockout_enabled and not is_compliant

        if blocked:
            return error(
                f"Cannot return yet — mandatory break is {row.duration_minutes} minutes. "
                f"{round(row.duration_minutes - elapsed_min)} minutes remaining.",
                422
            )

        db.session.execute(text("""
            UPDATE break_logs SET break_end_time = NOW(), is_compliant = :compliant WHERE id = :lid
        """), {"compliant": is_compliant, "lid": log_id})
        db.session.commit()
        return success({"ended": True, "actual_duration_minutes": round(elapsed_min), "is_compliant": is_compliant})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. ROSTER MANAGEMENT (2-day-advance rule, exchanges, auto-counters)
# ════════════════════════════════════════════════════════════════

@attsetup_bp.get("/rosters")
@require_auth
def list_rosters():
    week_start = request.args.get("week_start")
    try:
        q = """
            SELECT wr.*, e.first_name, e.last_name, e.employee_code
            FROM weekly_rosters wr
            JOIN employees e ON wr.employee_id = e.id
            WHERE wr.company_id = :cid AND NOT wr.is_deleted
        """
        params = {"cid": g.company_id}
        if week_start: q += " AND wr.week_start_date = :ws"; params["ws"] = week_start
        q += " ORDER BY wr.week_start_date DESC"
        rosters = db.session.execute(text(q), params).fetchall()
        result = []
        for r in rosters:
            entries = db.session.execute(text(
                "SELECT * FROM roster_entries WHERE weekly_roster_id = :rid ORDER BY entry_date"
            ), {"rid": r.id}).fetchall()
            d = dict(r._mapping)
            d["entries"] = [dict(e._mapping) for e in entries]
            result.append(d)
        return success(result)
    except Exception:
        return success([])


@attsetup_bp.get("/rosters/not-submitted")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def rosters_not_submitted():
    """Dashboard widget: who hasn't completed next week's roster (brief requirement)."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_roster_submission_status WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@attsetup_bp.post("/rosters/initialize")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def initialize_roster():
    """
    Creates next week's roster shell. submission_deadline is auto-computed
    (week_start_date - 4 days) — e.g. Thursday for the following Monday.
    """
    body = request.get_json() or {}
    required = ["employee_id", "week_start_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        week_start = date.fromisoformat(body["week_start_date"])
        week_end = week_start + timedelta(days=6)

        result = db.session.execute(text("""
            INSERT INTO weekly_rosters (company_id, employee_id, week_start_date, week_end_date, created_at)
            VALUES (:cid, :eid, :start, :end, NOW())
            ON CONFLICT (employee_id, week_start_date) DO NOTHING
            RETURNING id, submission_deadline
        """), {"cid": g.company_id, "eid": body["employee_id"], "start": week_start, "end": week_end})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Roster already exists for this week."})
        return created({"roster_id": str(row[0]), "submission_deadline": str(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.put("/rosters/<roster_id>/entries")
@require_auth
def upsert_roster_entry(roster_id):
    """Manager/Supervisor can amend anytime, anywhere — no restriction on edit timing."""
    body = request.get_json() or {}
    required = ["entry_date", "shift_type_id"]
    missing  = [f for f in required if f not in body]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO roster_entries (weekly_roster_id, company_id, entry_date, shift_type_id, is_off_day, created_at)
            VALUES (:rid, :cid, :date, :shift, :off, NOW())
            ON CONFLICT (weekly_roster_id, entry_date)
            DO UPDATE SET shift_type_id = EXCLUDED.shift_type_id, is_off_day = EXCLUDED.is_off_day, updated_at = NOW()
        """), {"rid": roster_id, "cid": g.company_id, "date": body["entry_date"],
               "shift": body.get("shift_type_id"), "off": body.get("is_off_day", False)})
        db.session.execute(text("""
            UPDATE weekly_rosters SET last_amended_by = :user, last_amended_at = NOW() WHERE id = :rid
        """), {"user": g.user_id, "rid": roster_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.post("/rosters/<roster_id>/submit")
def submit_roster(roster_id):
    """Employee/manager marks roster as submitted."""
    try:
        db.session.execute(text("""
            UPDATE weekly_rosters SET submitted = TRUE WHERE id = :rid
        """), {"rid": roster_id})
        db.session.commit()
        return success({"submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.post("/rosters/generate-auto-shift")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def generate_auto_shift_pattern():
    """
    1-month auto shift selector with sliding-bar weight (0=morning-heavy,
    100=night-heavy) per the brief.
    """
    body = request.get_json() or {}
    required = ["employee_id", "start_date", "pattern_weight"]
    missing  = [f for f in required if f not in body]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        insight = generate_ai_insights({
            "type": "auto_shift_pattern_generation",
            "pattern_weight": body["pattern_weight"],  # 0-100 slider value
            "days": 30,
        })
        return success({
            "generated_pattern": insight.get("daily_shifts", []),
            "note": f"Pattern weighted {body['pattern_weight']}% toward night shifts over 30 days. Review before publishing.",
        })
    except Exception as e:
        return error(str(e), 500)


# ── Exchange Leave (shift swap) ──
@attsetup_bp.get("/rosters/exchange-requests")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def pending_exchanges():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pending_shift_exchanges WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@attsetup_bp.post("/rosters/exchange-requests")
def request_shift_exchange():
    """Employee requests a shift swap — approved by supervisor AND HR."""
    body = request.get_json() or {}
    required = ["requesting_employee_id", "target_employee_id", "requesting_entry_id", "target_entry_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO shift_exchange_requests
              (company_id, requesting_employee_id, target_employee_id,
               requesting_entry_id, target_entry_id, reason, created_at)
            VALUES
              (:cid, :req, :tgt, :req_entry, :tgt_entry, :reason, NOW())
        """), {"cid": body.get("company_id"), "req": body["requesting_employee_id"], "tgt": body["target_employee_id"],
               "req_entry": body["requesting_entry_id"], "tgt_entry": body["target_entry_id"], "reason": body.get("reason", "")})
        db.session.commit()
        return created({"message": "Exchange request submitted. Requires Supervisor + HR approval."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.put("/rosters/exchange-requests/<req_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_exchange(req_id):
    """
    Dual approval: supervisor + HR. DB trigger auto-applies the swap to
    roster_entries once BOTH approvals are TRUE — reflects in roster + attendance.
    """
    body = request.get_json() or {}
    role = body.get("approver_role")  # 'supervisor' or 'hr'
    if role not in ("supervisor", "hr"): return error("approver_role must be 'supervisor' or 'hr'", 422)
    field = "supervisor_approval" if role == "supervisor" else "hr_approval"
    by_field = "supervisor_approved_by" if role == "supervisor" else "hr_approved_by"
    at_field = "supervisor_approved_at" if role == "supervisor" else "hr_approved_at"
    try:
        db.session.execute(text(f"""
            UPDATE shift_exchange_requests
               SET {field} = TRUE, {by_field} = :user, {at_field} = NOW(), updated_at = NOW()
             WHERE id = :rid AND company_id = :cid
        """), {"user": g.user_id, "rid": req_id, "cid": g.company_id})
        db.session.commit()

        row = db.session.execute(text(
            "SELECT status FROM shift_exchange_requests WHERE id = :rid"
        ), {"rid": req_id}).fetchone()
        return success({"approved_by": role, "fully_approved": row.status == "approved"})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 5. BIOMETRIC INTEGRATION
# ════════════════════════════════════════════════════════════════

@attsetup_bp.get("/biometric-devices")
@require_auth
def list_biometric_devices():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM biometric_devices WHERE company_id = :cid AND NOT is_deleted"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@attsetup_bp.post("/biometric-devices")
@require_auth
@require_role("super_admin", "hr_manager")
def add_biometric_device():
    body = request.get_json() or {}
    if not body.get("device_name"): return error("device_name required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO biometric_devices (company_id, branch_id, device_name, device_type, model, ip_address, created_at)
            VALUES (:cid, :branch, :name, :type, :model, :ip, NOW())
        """), {"cid": g.company_id, "branch": body.get("branch_id"), "name": body["device_name"],
               "type": body.get("device_type", "fingerprint"), "model": body.get("model"), "ip": body.get("ip_address")})
        db.session.commit()
        return created({"message": "Device added.", "la2074_note": "Punches retained 5 years per Section 20."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.post("/biometric-devices/<device_id>/punch")
def record_biometric_punch(device_id):
    """Public — hardware webhook posts a punch event."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            INSERT INTO biometric_punch_log (company_id, device_id, employee_id, punch_method, match_status, match_confidence_pct, created_at)
            VALUES (:cid, :did, :eid, :method, :status, :conf, NOW())
        """), {"cid": body.get("company_id"), "did": device_id, "eid": body.get("employee_id"),
               "method": body.get("punch_method", "fingerprint"), "status": body.get("match_status", "matched"),
               "conf": body.get("match_confidence_pct")})
        db.session.execute(text(
            "UPDATE biometric_devices SET last_sync_at = NOW(), status = 'online' WHERE id = :did"
        ), {"did": device_id})
        db.session.commit()
        return created({"logged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.get("/biometric-devices/unmatched-punches")
@require_auth
@require_role("super_admin", "hr_manager")
def unmatched_punches():
    """Anti-buddy-punching alert feed."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_biometric_unmatched_punches WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 6. GPS ATTENDANCE
# ════════════════════════════════════════════════════════════════

@attsetup_bp.post("/gps-punches")
def record_gps_punch():
    """
    Public/mobile — employee taps Clock In/Out. DB trigger auto-validates
    against assigned geo-fences and accepts/rejects per the brief's strict rule.
    """
    body = request.get_json() or {}
    required = ["employee_id", "punch_type", "latitude", "longitude"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO gps_punches
              (company_id, employee_id, punch_type, latitude, longitude, task_location_assignment_id, device_info, created_at)
            VALUES
              (:cid, :eid, :ptype, :lat, :lng, :task_id, :device, NOW())
            RETURNING id, status, rejection_reason, distance_from_fence_center_m
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "ptype": body["punch_type"],
            "lat": body["latitude"], "lng": body["longitude"], "task_id": body.get("task_location_assignment_id"),
            "device": body.get("device_info", "")[:255],
        })
        row = result.fetchone()
        db.session.commit()

        if row[1] == "rejected":
            return error(row[2] or "Punch rejected: outside assigned location.", 422)
        return created({"punch_id": str(row[0]), "status": row[1], "distance_m": float(row[3]) if row[3] else None})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.get("/gps-punches/rejected")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def rejected_gps_punches():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_gps_rejected_punches WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 7. GEO-FENCING
# ════════════════════════════════════════════════════════════════

@attsetup_bp.get("/geo-fences")
@require_auth
def list_geo_fences():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM geo_fences WHERE company_id = :cid AND NOT is_deleted"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@attsetup_bp.post("/geo-fences")
@require_auth
@require_role("super_admin", "hr_manager")
def create_geo_fence():
    body = request.get_json() or {}
    required = ["name", "latitude", "longitude"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO geo_fences (company_id, name, fence_type, branch_id, latitude, longitude, radius_meters, tracking_window, created_at)
            VALUES (:cid, :name, :type, :branch, :lat, :lng, :radius, :window, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "name": body["name"], "type": body.get("fence_type", "fixed_location"),
            "branch": body.get("branch_id"), "lat": body["latitude"], "lng": body["longitude"],
            "radius": body.get("radius_meters", 100), "window": body.get("tracking_window", "office_hours_only"),
        })
        fence_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"fence_id": fence_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.post("/geo-fences/<fence_id>/assign")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def assign_employee_to_fence(fence_id):
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO geo_fence_assignments (geo_fence_id, employee_id, company_id, is_primary)
            VALUES (:fid, :eid, :cid, :primary)
            ON CONFLICT (geo_fence_id, employee_id) DO NOTHING
        """), {"fid": fence_id, "eid": body["employee_id"], "cid": g.company_id, "primary": body.get("is_primary", True)})
        db.session.commit()
        return created({"assigned": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 8. TASK & LOCATION ASSIGNMENT
# ════════════════════════════════════════════════════════════════

@attsetup_bp.get("/task-assignments")
@require_auth
def list_task_assignments():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_active_task_assignments WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@attsetup_bp.post("/task-assignments")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_task_assignment():
    """
    Manager assigns task+location for a field visit. DB trigger
    auto-creates a temporary geo-fence — only then will GPS accept the
    employee's clock-in there (the brief's core requirement).
    """
    body = request.get_json() or {}
    required = ["employee_id", "task_description", "location_name", "assignment_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO task_location_assignments
              (company_id, employee_id, assigned_by_employee_id, task_description, location_name,
               location_address, latitude, longitude, assignment_date, start_time, end_time, created_at)
            VALUES
              (:cid, :eid, :assigner, :task, :loc,
               :addr, :lat, :lng, :date, :start, :end, NOW())
            RETURNING id, auto_created_geo_fence_id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "assigner": g.user_id, "task": body["task_description"],
            "loc": body["location_name"], "addr": body.get("location_address"), "lat": body.get("latitude"),
            "lng": body.get("longitude"), "date": body["assignment_date"], "start": body.get("start_time"),
            "end": body.get("end_time"),
        })
        row = result.fetchone()
        db.session.commit()
        return created({
            "assignment_id": str(row[0]), "geo_fence_id": str(row[1]) if row[1] else None,
            "note": "Temporary geo-fence created for task duration. Clock-in will only succeed at this location during the assigned window.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@attsetup_bp.put("/task-assignments/<assignment_id>/complete")
@require_auth
def complete_task_assignment(assignment_id):
    """Marks task complete — DB trigger auto-expires the temporary geo-fence."""
    try:
        db.session.execute(text("""
            UPDATE task_location_assignments SET status = 'completed', updated_at = NOW()
            WHERE id = :aid AND company_id = :cid
        """), {"aid": assignment_id, "cid": g.company_id})
        db.session.commit()
        return success({"completed": True, "geo_fence_expired": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@attsetup_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["policies", "breaks", "rosters", "biometric-devices", "geo-fences", "task-assignments"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"attsetup_{module}")
    return jsonify(result), 200 if result["success"] else 422


@attsetup_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"attsetup_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"attendance_setup_{module}_template.xlsx")
