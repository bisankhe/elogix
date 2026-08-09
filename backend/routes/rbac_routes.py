"""
FILE: backend/routes/rbac_routes.py
eLogix HRMS — Role-Based Access Control
Manage company roles, assign permissions per module, audit trail.
URL prefix: /api/v1/rbac
SECURITY: Roles and permissions are company-scoped.
"""
from flask import Blueprint, request, jsonify, g
from ..middleware.auth import require_auth, require_role
from ..extensions import db

rbac_bp = Blueprint("rbac", __name__, url_prefix="/api/v1/rbac")

# eLogix default system roles (seeded during provisioning)
DEFAULT_ROLES = [
    {"name": "Super Admin",      "slug": "super_admin",      "level": 1, "is_system": True},
    {"name": "Executive",        "slug": "executive",         "level": 2, "is_system": True},
    {"name": "HR Manager",       "slug": "hr_manager",        "level": 3, "is_system": True},
    {"name": "Payroll Officer",  "slug": "payroll_officer",   "level": 3, "is_system": True},
    {"name": "HR Officer",       "slug": "hr_officer",        "level": 4, "is_system": True},
    {"name": "Department Head",  "slug": "department_head",   "level": 4, "is_system": True},
    {"name": "Branch Manager",   "slug": "branch_manager",    "level": 4, "is_system": True},
    {"name": "Team Lead",        "slug": "team_lead",         "level": 5, "is_system": True},
    {"name": "Supervisor",       "slug": "supervisor",        "level": 6, "is_system": True},
    {"name": "Manager",          "slug": "manager",           "level": 6, "is_system": True},
    {"name": "HOD",              "slug": "hod",               "level": 4, "is_system": True},
    {"name": "Recruiter",        "slug": "recruiter",         "level": 5, "is_system": True},
    {"name": "Finance Officer",  "slug": "finance_officer",   "level": 5, "is_system": True},
    {"name": "Employee",         "slug": "employee",          "level": 10,"is_system": True},
]

# eLogix modules (each can have view/create/edit/delete/approve/export)
ELOGIX_MODULES = [
    "employees","attendance","leave","payroll","recruitment","performance",
    "training","documents","reports","settings","compliance","vendors",
    "assets","helpdesk","org_chart","ai_tools"
]


# ── List company roles ────────────────────────────────────────
@rbac_bp.get("/roles")
@require_auth
def list_roles():
    from ..saas.models import CompanyRole
    roles = db.session.query(CompanyRole).filter_by(company_id=g.company_id).order_by(CompanyRole.level).all()
    return jsonify({"success": True, "roles": [r.to_dict() for r in roles]}), 200


# ── Create custom role ────────────────────────────────────────
@rbac_bp.post("/roles")
@require_auth
@require_role("super_admin", "hr_manager", "hr_admin")
def create_role():
    from ..saas.models import CompanyRole
    data = request.get_json() or {}
    if not data.get("name") or not data.get("slug"):
        return jsonify({"success": False, "error": "name and slug required"}), 400

    existing = db.session.query(CompanyRole).filter_by(
        company_id=g.company_id, slug=data["slug"]
    ).first()
    if existing:
        return jsonify({"success": False, "error": f"Role '{data['slug']}' already exists"}), 409

    role = CompanyRole(
        company_id  = g.company_id,
        name        = data["name"],
        slug        = data["slug"].lower().replace(" ", "_"),
        level       = int(data.get("level", 5)),
        is_system   = False,
        description = data.get("description", ""),
    )
    db.session.add(role)
    db.session.commit()
    return jsonify({"success": True, "role": role.to_dict()}), 201


# ── Get permissions for role ──────────────────────────────────
@rbac_bp.get("/roles/<role_id>/permissions")
@require_auth
def get_role_permissions(role_id):
    from ..saas.models import CompanyRole, ModulePermission
    role = db.session.query(CompanyRole).filter_by(
        id=role_id, company_id=g.company_id
    ).first()
    if not role: return jsonify({"success": False, "error": "Role not found"}), 404

    perms = db.session.query(ModulePermission).filter_by(
        company_id=g.company_id, role_id=role_id
    ).all()
    perm_map = {p.module: {
        "view": p.can_view, "create": p.can_create, "edit": p.can_edit,
        "delete": p.can_delete, "approve": p.can_approve,
        "export": p.can_export, "scope": p.scope,
    } for p in perms}

    return jsonify({
        "success": True,
        "role":    role.to_dict(),
        "modules": ELOGIX_MODULES,
        "permissions": perm_map,
    }), 200


# ── Set permissions for role (full matrix update) ─────────────
@rbac_bp.put("/roles/<role_id>/permissions")
@require_auth
@require_role("super_admin", "hr_admin")
def set_role_permissions(role_id):
    from ..saas.models import CompanyRole, ModulePermission
    role = db.session.query(CompanyRole).filter_by(
        id=role_id, company_id=g.company_id
    ).first()
    if not role: return jsonify({"success": False, "error": "Role not found"}), 404

    data    = request.get_json() or {}
    perms   = data.get("permissions", {})  # { "payroll": {"view":true,"edit":false,...}, ... }
    updated = 0

    for module, actions in perms.items():
        if module not in ELOGIX_MODULES:
            continue
        existing = db.session.query(ModulePermission).filter_by(
            company_id=g.company_id, role_id=role_id, module=module
        ).first()
        if existing:
            existing.can_view   = bool(actions.get("view",   existing.can_view))
            existing.can_create = bool(actions.get("create", existing.can_create))
            existing.can_edit   = bool(actions.get("edit",   existing.can_edit))
            existing.can_delete = bool(actions.get("delete", existing.can_delete))
            existing.can_approve= bool(actions.get("approve",existing.can_approve))
            existing.can_export = bool(actions.get("export", existing.can_export))
            existing.scope      = actions.get("scope", existing.scope)
        else:
            mp = ModulePermission(
                company_id=g.company_id, role_id=role_id, module=module,
                can_view   = bool(actions.get("view",   False)),
                can_create = bool(actions.get("create", False)),
                can_edit   = bool(actions.get("edit",   False)),
                can_delete = bool(actions.get("delete", False)),
                can_approve= bool(actions.get("approve",False)),
                can_export = bool(actions.get("export", False)),
                scope      = actions.get("scope", "all"),
            )
            db.session.add(mp)
        updated += 1

    db.session.commit()
    return jsonify({"success": True,
                    "message": f"Permissions updated for role '{role.name}'",
                    "modules_updated": updated}), 200


# ── Quick permission check (used by frontend) ─────────────────
@rbac_bp.get("/check")
@require_auth
def check_permission():
    module = request.args.get("module", "")
    action = request.args.get("action", "view")
    mod_perms = g.permissions.get(module, {})
    allowed   = bool(mod_perms.get(action, False))
    return jsonify({
        "success":  True,
        "module":   module,
        "action":   action,
        "allowed":  allowed,
        "scope":    mod_perms.get("scope", "none"),
        "role":     g.role,
        "level":    g.level,
    }), 200
