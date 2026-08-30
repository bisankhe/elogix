"""
FILE: backend/routes/user_access_routes.py
eLogix HRMS -- System Administration > User & Access (4 pages: User
Management, Role & Permission, Access Control, Menu Management)
URL prefix: /api/v1/user-access

Reuses the EXISTING employees table and mfa_enrollment (Security Risk
session) directly. role_definitions closes the prior free-text role
gap; access_requests and menu_persona_overrides are the two genuinely
new workflow tables.

Compliance grounding: Segregation of Duties, Principle of Least
Privilege, dynamic menu removal (not greying-out) for unauthorized roles.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

user_access_bp = Blueprint("user_access", __name__, url_prefix="/api/v1/user-access")


# ════════════════════════════════════════════════════════════════
# PAGE 1: USER MANAGEMENT
# ════════════════════════════════════════════════════════════════

@user_access_bp.get("/users")
@require_auth
@require_role("super_admin", "hr_manager")
def list_users():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_user_management_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@user_access_bp.post("/users")
@require_auth
@require_role("super_admin", "hr_manager")
def create_user():
    body = request.get_json() or {}
    required = ["first_name", "last_name", "email", "role"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO employees (company_id, first_name, last_name, email, role, employment_status, created_at)
            VALUES (:cid, :fname, :lname, :email, :role, 'active', NOW()) RETURNING id
        """), {"cid": g.company_id, "fname": body["first_name"], "lname": body["last_name"], "email": body["email"], "role": body["role"]})
        user_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"user_id": user_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)  # likely the ck_employees_role_governed constraint if role isn't recognized


@user_access_bp.put("/users/<user_id>/status")
@require_auth
@require_role("super_admin", "hr_manager")
def update_user_status(user_id):
    body = request.get_json() or {}
    if not body.get("employment_status"): return error("employment_status required", 422)
    try:
        db.session.execute(text("""
            UPDATE employees SET employment_status = :status WHERE id = :uid AND company_id = :cid
        """), {"status": body["employment_status"], "uid": user_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: ROLE & PERMISSION
# ════════════════════════════════════════════════════════════════

@user_access_bp.get("/roles")
@require_auth
@require_role("super_admin", "hr_manager")
def list_roles():
    try:
        rows = db.session.execute(text("SELECT * FROM v_role_permission_dashboard")).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@user_access_bp.post("/roles")
@require_auth
@require_role("super_admin")
def create_role():
    """Adding a new role to the governed registry -- super_admin only, since this widens the constraint employees.role checks against."""
    body = request.get_json() or {}
    required = ["role_key", "display_label"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO role_definitions (role_key, display_label, has_sod_conflict, sod_conflict_note)
            VALUES (:key, :label, :sod, :note) RETURNING id
        """), {"key": body["role_key"], "label": body["display_label"], "sod": body.get("has_sod_conflict", False), "note": body.get("sod_conflict_note")})
        role_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"role_id": role_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: ACCESS CONTROL
# ════════════════════════════════════════════════════════════════

@user_access_bp.get("/access-requests")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_access_requests():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_access_control_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@user_access_bp.post("/access-requests")
@require_auth
def request_access():
    """DB trigger auto-routes to the requester's actual manager."""
    body = request.get_json() or {}
    if not body.get("resource_description"): return error("resource_description required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO access_requests (company_id, requested_by_employee_id, resource_description, reason, duration_days, created_at)
            VALUES (:cid, :user, :resource, :reason, :duration, NOW()) RETURNING id
        """), {"cid": g.company_id, "user": g.user_id, "resource": body["resource_description"], "reason": body.get("reason"), "duration": body.get("duration_days")})
        request_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"request_id": request_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@user_access_bp.put("/access-requests/<request_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def decide_access_request(request_id):
    body = request.get_json() or {}
    decision = body.get("decision")
    if decision not in ("approved", "rejected"): return error("decision must be approved or rejected", 422)
    try:
        db.session.execute(text("""
            UPDATE access_requests SET status = :decision, decided_at = NOW() WHERE id = :rid AND company_id = :cid
        """), {"decision": decision, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"decided": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@user_access_bp.post("/access-requests/run-expiry-sweep")
@require_auth
@require_role("super_admin")
def run_expiry_sweep():
    """Triggers the temporary-grant auto-expiry sweep (normally run as a scheduled job)."""
    try:
        db.session.execute(text("SELECT fn_expire_access_grants()"))
        db.session.commit()
        return success({"sweep_run": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: MENU MANAGEMENT
# ════════════════════════════════════════════════════════════════

@user_access_bp.get("/menu/unconfigured")
@require_auth
@require_role("super_admin")
def menu_unconfigured_items():
    """Sidebar items with NO persona override at all -- the highest-priority review queue."""
    try:
        rows = db.session.execute(text("SELECT * FROM v_menu_management_unconfigured")).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@user_access_bp.post("/menu/overrides")
@require_auth
@require_role("super_admin")
def set_menu_override():
    body = request.get_json() or {}
    required = ["sidebar_item_id", "persona_id", "is_allowed"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO menu_persona_overrides (company_id, sidebar_item_id, persona_id, is_allowed, configured_by, configured_at)
            VALUES (:cid, :item, :persona, :allowed, :user, NOW())
            ON CONFLICT (company_id, sidebar_item_id, persona_id) DO UPDATE SET is_allowed = EXCLUDED.is_allowed, configured_at = NOW()
            RETURNING id
        """), {"cid": g.company_id, "item": body["sidebar_item_id"], "persona": body["persona_id"], "allowed": body["is_allowed"], "user": g.user_id})
        override_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"override_id": override_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)
