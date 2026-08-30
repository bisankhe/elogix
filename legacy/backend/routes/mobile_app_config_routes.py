"""
FILE: backend/routes/mobile_app_config_routes.py
eLogix HRMS -- System Administration > Integration & API > Mobile App
Configuration (6 pages: Mobile Attendance, GPS Tracking, Geo-Fencing,
Field Visit Tracking, Route Monitoring, Field Task Management)
URL prefix: /api/v1/mobile-app-config

Mobile Attendance, Geo-Fencing, and Field Visit Tracking reuse the
EXISTING backend endpoints behind their already-built pages verbatim.
GPS Tracking, Route Monitoring, and Field Task Management carry the
genuinely new surface.

Privacy design note: the route-breadcrumb POST endpoint is simply
never called by the mobile client while Privacy Mode is active --
there is no "paused" flag to toggle server-side, because the absence
of a row IS the privacy guarantee.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

mobile_bp = Blueprint("mobile_app_config", __name__, url_prefix="/api/v1/mobile-app-config")


# ════════════════════════════════════════════════════════════════
# PAGE 2: GPS TRACKING
# ════════════════════════════════════════════════════════════════

@mobile_bp.get("/gps/profiles")
@require_auth
@require_role("super_admin", "hr_manager")
def list_gps_profiles():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_gps_tracking_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mobile_bp.post("/gps/profiles")
@require_auth
@require_role("super_admin", "hr_manager")
def set_gps_profile():
    body = request.get_json() or {}
    required = ["role_or_designation", "interval_seconds"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO gps_polling_profiles (company_id, role_or_designation, interval_seconds, battery_aware_throttle, active_only_during_work_hours)
            VALUES (:cid, :role, :interval, :throttle, :work_hours) RETURNING id
        """), {"cid": g.company_id, "role": body["role_or_designation"], "interval": body["interval_seconds"],
               "throttle": body.get("battery_aware_throttle", True), "work_hours": body.get("active_only_during_work_hours", True)})
        profile_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"profile_id": profile_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@mobile_bp.post("/gps/device-ping")
def record_device_ping():
    """Public/mobile client -- the recurring device-health heartbeat."""
    body = request.get_json() or {}
    required = ["employee_id", "platform", "battery_pct"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO device_health_log (company_id, employee_id, platform, battery_pct, last_ping_at)
            VALUES (:cid, :emp, :platform, :battery, NOW())
        """), {"cid": body.get("company_id"), "emp": body["employee_id"], "platform": body["platform"], "battery": body["battery_pct"]})
        db.session.commit()
        return success({"recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# PAGES 1 & 3 (Mobile Attendance, Geo-Fencing): intentionally NO new
# routes here -- both reuse the EXISTING backend endpoints behind
# their already-built pages verbatim.


# ════════════════════════════════════════════════════════════════
# PAGE 5: ROUTE MONITORING
# ════════════════════════════════════════════════════════════════

@mobile_bp.get("/route/today")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def route_monitoring_today():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_route_monitoring_today WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mobile_bp.post("/route/breadcrumb")
def record_breadcrumb():
    """
    Public/mobile client. The client is responsible for never calling
    this while Privacy Mode is on -- there is intentionally no
    server-side 'paused' state, since the absence of a row is itself
    the privacy guarantee, not a flag that could be queried later.
    """
    body = request.get_json() or {}
    required = ["employee_id", "latitude", "longitude"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO route_breadcrumbs (company_id, employee_id, latitude, longitude, is_unscheduled_detour, recorded_at)
            VALUES (:cid, :emp, :lat, :lng, :detour, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "emp": body["employee_id"], "lat": body["latitude"], "lng": body["longitude"],
               "detour": body.get("is_unscheduled_detour", False)})
        breadcrumb_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"breadcrumb_id": breadcrumb_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@mobile_bp.put("/route/breadcrumb/<breadcrumb_id>/annotate")
def annotate_detour(breadcrumb_id):
    """Lets the employee explain an unscheduled-detour point in their own words, before anyone else interprets the gap."""
    body = request.get_json() or {}
    if not body.get("annotation"): return error("annotation required", 422)
    try:
        db.session.execute(text("""
            UPDATE route_breadcrumbs SET employee_annotation = :note WHERE id = :bid
        """), {"note": body["annotation"], "bid": breadcrumb_id})
        db.session.commit()
        return success({"annotated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 6: FIELD TASK MANAGEMENT
# ════════════════════════════════════════════════════════════════

@mobile_bp.get("/tasks")
@require_auth
def list_field_tasks():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_field_tasks_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mobile_bp.post("/tasks")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_field_task():
    body = request.get_json() or {}
    required = ["assigned_to_employee_id", "title"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO field_tasks (company_id, assigned_to_employee_id, title, client_name, requires_photo, requires_signature)
            VALUES (:cid, :emp, :title, :client, :photo, :sig) RETURNING id
        """), {"cid": g.company_id, "emp": body["assigned_to_employee_id"], "title": body["title"], "client": body.get("client_name"),
               "photo": body.get("requires_photo", False), "sig": body.get("requires_signature", False)})
        task_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"task_id": task_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@mobile_bp.put("/tasks/<task_id>/complete")
def complete_field_task(task_id):
    """
    DB CHECK constraint blocks completion if required evidence (photo/
    signature URL) is missing -- the structural gate, never bypassable
    from the application layer.
    """
    body = request.get_json() or {}
    try:
        if body.get("photo_url"):
            db.session.execute(text("UPDATE field_tasks SET photo_url = :url WHERE id = :tid"), {"url": body["photo_url"], "tid": task_id})
        if body.get("signature_url"):
            db.session.execute(text("UPDATE field_tasks SET signature_url = :url WHERE id = :tid"), {"url": body["signature_url"], "tid": task_id})
        db.session.execute(text("""
            UPDATE field_tasks SET stage = 'completed', completed_at = NOW() WHERE id = :tid
        """), {"tid": task_id})
        db.session.commit()
        return success({"completed": True})
    except Exception as e:
        db.session.rollback()
        return error("Cannot complete this task -- required evidence (photo or signature) is missing.", 422)
