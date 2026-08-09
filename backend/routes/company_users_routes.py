"""
FILE: backend/routes/company_users_routes.py
eLogix HRMS — Company-scoped user management
Create users · Assign roles · Manage hierarchy · Reset passwords
URL prefix: /api/v1/users
SECURITY: All queries filtered by company_id from JWT.
"""
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from ..middleware.auth import require_auth, require_role
from ..extensions import db

users_bp = Blueprint("company_users", __name__, url_prefix="/api/v1/users")
_now = lambda: datetime.now(timezone.utc)


# ── List users ────────────────────────────────────────────────
@users_bp.get("/")
@require_auth
def list_users():
    from ..saas.models import CompanyUser
    q = db.session.query(CompanyUser).filter_by(company_id=g.company_id)

    # Scope by role level
    if g.role == "department_head" and g.dept_id:
        q = q.filter_by(department_id=g.dept_id)
    elif g.role == "branch_manager" and g.branch_id:
        q = q.filter_by(branch_id=g.branch_id)
    elif g.level > 3:
        # Non-admin: can only see own record unless explicitly granted
        if not g.permissions.get("employees", {}).get("view"):
            q = q.filter_by(id=g.user_id)

    search = request.args.get("search", "")
    dept   = request.args.get("department_id")
    role   = request.args.get("role")
    if search: q = q.filter(CompanyUser.full_name.ilike(f"%{search}%") | CompanyUser.email.ilike(f"%{search}%"))
    if dept:   q = q.filter_by(department_id=dept)
    if role:   q = q.filter_by(role_slug=role)

    page    = int(request.args.get("page", 1))
    per_page= int(request.args.get("per_page", 50))
    total   = q.count()
    users   = q.order_by(CompanyUser.full_name).offset((page-1)*per_page).limit(per_page).all()

    return jsonify({"success": True, "total": total, "page": page,
                    "users": [u.to_dict() for u in users]}), 200


# ── Create user ───────────────────────────────────────────────
@users_bp.post("/")
@require_auth
@require_role("super_admin", "hr_manager", "hr_admin")
def create_user():
    from ..saas.models import CompanyUser, CompanyRole, Company, ELOGIX_PLANS
    from ..services.auth_service import AuthService

    data = request.get_json() or {}
    required = ["full_name", "email", "role_slug"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"success": False, "error": f"Missing: {missing}"}), 400

    # Check employee limit
    company = db.session.query(Company).filter_by(id=g.company_id).first()
    current_count = db.session.query(CompanyUser).filter_by(company_id=g.company_id, is_active=True).count()
    plan_limit = ELOGIX_PLANS.get(company.plan, {}).get("max_emp", 50)
    if current_count >= plan_limit:
        return jsonify({"success": False,
                        "error": f"eLogix: Employee limit reached ({plan_limit}). "
                                 "Upgrade your plan at elogix.com.np"}), 402

    # Check email unique within company
    existing = db.session.query(CompanyUser).filter_by(
        company_id=g.company_id, email=data["email"].lower().strip()
    ).first()
    if existing:
        return jsonify({"success": False,
                        "error": "Email already exists in this company"}), 409

    # Get role
    role = db.session.query(CompanyRole).filter_by(
        company_id=g.company_id, slug=data["role_slug"]
    ).first()

    # Temp password
    import secrets, string
    temp_pw = secrets.token_urlsafe(12) + "A1!"

    user = CompanyUser(
        company_id    = g.company_id,
        emp_id        = data.get("emp_id", ""),
        full_name     = data["full_name"],
        email         = data["email"].lower().strip(),
        phone         = data.get("phone", ""),
        role_id       = role.id if role else None,
        role_slug     = data["role_slug"],
        level         = role.level if role else 10,
        department_id = data.get("department_id"),
        branch_id     = data.get("branch_id"),
        reports_to_id = data.get("reports_to_id"),
        is_active     = True,
        must_change_pw= True,
        created_by    = g.user_id,
    )
    user.set_password(temp_pw)
    db.session.add(user)

    # Update company employee count
    company.employee_count = current_count + 1
    db.session.commit()

    # Send welcome email
    try:
        from ..services.email_service import EmailService
        from ..saas.models import Company as C
        c = db.session.query(C).filter_by(id=g.company_id).first()
        EmailService.send_welcome(
            to_email=user.email, to_name=user.full_name,
            portal_url=c.portal_url(), temp_password=temp_pw, company_name=c.name
        )
    except Exception: pass

    return jsonify({"success": True, "user": user.to_dict(),
                    "message": f"User created. Temp password sent to {user.email}"}), 201


# ── Get user ──────────────────────────────────────────────────
@users_bp.get("/<user_id>")
@require_auth
def get_user(user_id):
    from ..saas.models import CompanyUser
    # Can view own profile always
    if user_id != g.user_id and g.level > 3:
        if not g.permissions.get("employees", {}).get("view"):
            return jsonify({"success": False, "error": "Permission denied"}), 403

    user = db.session.query(CompanyUser).filter_by(
        id=user_id, company_id=g.company_id  # CRITICAL: company_id must match
    ).first()
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404
    return jsonify({"success": True, "user": user.to_dict()}), 200


# ── Update user ───────────────────────────────────────────────
@users_bp.put("/<user_id>")
@require_auth
def update_user(user_id):
    from ..saas.models import CompanyUser, CompanyRole
    user = db.session.query(CompanyUser).filter_by(
        id=user_id, company_id=g.company_id
    ).first()
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    # Self can update own basic info; HR can update others
    if user_id != g.user_id and not g.permissions.get("employees", {}).get("edit"):
        return jsonify({"success": False, "error": "Permission denied"}), 403

    data = request.get_json() or {}
    for field in ("full_name", "phone", "emp_id", "department_id", "branch_id", "reports_to_id"):
        if field in data:
            setattr(user, field, data[field])

    # Role change: only HR/admin
    if "role_slug" in data and g.permissions.get("employees", {}).get("edit"):
        role = db.session.query(CompanyRole).filter_by(
            company_id=g.company_id, slug=data["role_slug"]
        ).first()
        if role:
            user.role_id   = role.id
            user.role_slug = role.slug
            user.level     = role.level

    # Active toggle: only HR/admin
    if "is_active" in data and g.level <= 3:
        user.is_active = bool(data["is_active"])
        if not data["is_active"]:
            from ..services.auth_service import AuthService
            AuthService.revoke_all_user_tokens(user.id, user.company_id, reason="deactivated")

    db.session.commit()
    return jsonify({"success": True, "user": user.to_dict()}), 200


# ── Deactivate user ───────────────────────────────────────────
@users_bp.delete("/<user_id>")
@require_auth
@require_role("super_admin", "hr_manager", "hr_admin")
def deactivate_user(user_id):
    from ..saas.models import CompanyUser
    from ..services.auth_service import AuthService
    user = db.session.query(CompanyUser).filter_by(
        id=user_id, company_id=g.company_id
    ).first()
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404
    if user.id == g.user_id:
        return jsonify({"success": False, "error": "Cannot deactivate yourself"}), 400

    user.is_active = False
    AuthService.revoke_all_user_tokens(user.id, user.company_id, reason="admin_deactivated")
    db.session.commit()
    return jsonify({"success": True, "message": f"{user.full_name} deactivated"}), 200


# ── Admin reset password ──────────────────────────────────────
@users_bp.post("/<user_id>/reset-password")
@require_auth
@require_role("super_admin", "hr_manager", "hr_admin")
def admin_reset_password(user_id):
    from ..saas.models import CompanyUser
    from ..services.auth_service import AuthService
    import secrets
    user = db.session.query(CompanyUser).filter_by(
        id=user_id, company_id=g.company_id
    ).first()
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404

    temp_pw = secrets.token_urlsafe(12) + "A1!"
    user.set_password(temp_pw)
    user.must_change_pw = True
    AuthService.revoke_all_user_tokens(user.id, user.company_id, reason="admin_pw_reset")
    db.session.commit()

    try:
        from ..services.email_service import EmailService
        from ..saas.models import Company
        c = db.session.query(Company).filter_by(id=g.company_id).first()
        EmailService.send_password_reset_admin(
            to_email=user.email, to_name=user.full_name,
            temp_password=temp_pw, company_name=c.name if c else "Company"
        )
    except Exception: pass

    return jsonify({"success": True,
                    "message": f"Password reset. New temp password sent to {user.email}"}), 200
