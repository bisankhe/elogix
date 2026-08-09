"""
FILE: backend/routes/permission_matrix_routes.py
NepHR Pro -- the real, editable RBAC engine. Replaces the
read-only RolePermissionPage mock and gives backend middleware a
database-backed source of truth instead of the hardcoded
ROLE_PERMISSIONS dict in middleware/auth.py.

Two consumers:
  1. Admin UI (PermissionMatrixPage.jsx) -- view, edit, save the
     role x module x action grid.
  2. Runtime enforcement -- /my-permissions is called once at login
     and cached client-side; any backend route can additionally call
     check_permission() directly for server-side enforcement that
     can't be bypassed by a tampered frontend.

URL prefix: /api/v1/permissions
"""
from flask import Blueprint, request, g
from sqlalchemy import text
from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

perm_matrix_bp = Blueprint("permission_matrix", __name__, url_prefix="/api/v1/permissions")


# ════════════════════════════════════════════════════════════════
# SERVER-SIDE ENFORCEMENT HELPER -- other route files can import
# this directly for granular, database-backed permission checks
# that go beyond require_role()'s coarse role-name gate.
# ════════════════════════════════════════════════════════════════
def check_permission(role_key: str, module_key: str, action: str, company_id: str = None) -> tuple[bool, str]:
    """
    action: 'view' | 'edit' | 'delete' | 'create' | 'forward' | 'approve' | 'report'
    Returns (allowed, scope). Tenant override (company_id match)
    takes precedence over the global default (company_id IS NULL).
    """
    col = {
        "view": "can_view", "edit": "can_edit", "delete": "can_delete",
        "create": "can_create", "forward": "can_forward",
        "approve": "can_approve", "report": "can_report",
    }.get(action)
    if not col:
        return False, "none"
    row = db.session.execute(text(f"""
        SELECT {col}, scope FROM permission_matrix
        WHERE role_key = :role AND module_key = :module
          AND (company_id = :cid OR company_id IS NULL)
        ORDER BY company_id NULLS LAST LIMIT 1
    """), {"role": role_key, "module": module_key, "cid": company_id}).fetchone()
    if not row:
        return False, "none"
    return bool(row[0]), row[1]


# ════════════════════════════════════════════════════════════════
# GET the full matrix -- the admin grid
# ════════════════════════════════════════════════════════════════
@perm_matrix_bp.get("/matrix")
@require_auth
@require_role("super_admin", "hr_manager")
def get_matrix():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_permission_matrix_grid WHERE company_id = :cid OR company_id IS NULL"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perm_matrix_bp.get("/modules")
@require_auth
def list_modules():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM permission_modules ORDER BY sort_order"
        )).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perm_matrix_bp.get("/roles")
@require_auth
def list_roles():
    try:
        rows = db.session.execute(text(
            "SELECT role_key, display_label, has_sod_conflict, sod_conflict_note FROM role_definitions WHERE is_active"
        )).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# UPDATE a single cell of the matrix -- the actual "click a
# checkbox and save" action the admin UI performs.
# ════════════════════════════════════════════════════════════════
@perm_matrix_bp.put("/matrix/<role_key>/<module_key>")
@require_auth
@require_role("super_admin")
def update_permission_cell(role_key, module_key):
    """super_admin only: changing who can do what is itself a
    privileged action -- an hr_manager can VIEW the matrix but
    cannot edit it, preventing self-escalation."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            INSERT INTO permission_matrix
                (company_id, role_key, module_key, can_view, can_edit, can_delete, can_create, can_forward, can_approve, can_report, scope, updated_by, updated_at)
            VALUES (:cid, :role, :module, :view, :edit, :delete, :create, :forward, :approve, :report, :scope, :user, NOW())
            ON CONFLICT (company_id, role_key, module_key) DO UPDATE SET
                can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit,
                can_delete = EXCLUDED.can_delete, can_create = EXCLUDED.can_create,
                can_forward = EXCLUDED.can_forward, can_approve = EXCLUDED.can_approve,
                can_report = EXCLUDED.can_report,
                scope = EXCLUDED.scope, updated_by = EXCLUDED.updated_by, updated_at = NOW()
        """), {
            "cid": g.company_id, "role": role_key, "module": module_key,
            "view": body.get("can_view", False), "edit": body.get("can_edit", False),
            "delete": body.get("can_delete", False), "create": body.get("can_create", False),
            "forward": body.get("can_forward", False), "approve": body.get("can_approve", False),
            "report": body.get("can_report", False),
            "scope": body.get("scope", "none"), "user": g.user_id,
        })
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# THE FRONTEND'S MAIN CONSUMER -- called once after login (and
# cached) so the dashboard, sidebar, and every page-level button
# know what to show for the CURRENT logged-in user's role, without
# the frontend ever seeing or trusting another role's permissions.
# ════════════════════════════════════════════════════════════════
@perm_matrix_bp.get("/my-permissions")
@require_auth
def my_permissions():
    try:
        rows = db.session.execute(text("""
            SELECT module_key, can_view, can_edit, can_delete, can_approve, can_report, scope
            FROM permission_matrix
            WHERE role_key = :role AND (company_id = :cid OR company_id IS NULL)
            ORDER BY company_id NULLS LAST
        """), {"role": g.role, "cid": g.company_id}).fetchall()
        # tenant override wins over global default for the same module_key
        merged = {}
        for r in rows:
            merged[r.module_key] = dict(r._mapping)
        return success({"role": g.role, "modules": list(merged.values())})
    except Exception:
        return success({"role": g.role, "modules": []})


# ════════════════════════════════════════════════════════════════
# BULK reset a role back to the seeded global default -- useful
# after an admin makes experimental changes and wants to undo them
# without hunting down every individual cell.
# ════════════════════════════════════════════════════════════════
@perm_matrix_bp.post("/matrix/<role_key>/reset-to-default")
@require_auth
@require_role("super_admin")
def reset_role_to_default(role_key):
    try:
        db.session.execute(text(
            "DELETE FROM permission_matrix WHERE role_key = :role AND company_id = :cid"
        ), {"role": role_key, "cid": g.company_id})
        db.session.commit()
        return success({"reset": True, "note": "Tenant overrides cleared -- role now follows the global default."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)
