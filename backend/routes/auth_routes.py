"""
FILE: backend/routes/auth_routes.py
eLogix HRMS — Auth Routes
POST /api/v1/auth/register-company  Company self-registration
POST /api/v1/auth/login             Login (company-scoped)
POST /api/v1/auth/refresh           Refresh access token
POST /api/v1/auth/logout            Logout (revoke token)
POST /api/v1/auth/forgot-password   Send reset link
POST /api/v1/auth/reset-password    Set new password
POST /api/v1/auth/change-password   Change own password
GET  /api/v1/auth/me                Current user profile
POST /api/v1/auth/verify-email      Verify email token
POST /api/v1/auth/mfa/verify        Verify TOTP code
GET  /api/v1/auth/sessions          List active sessions
DELETE /api/v1/auth/sessions/<id>   Revoke session
"""
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from ..middleware.auth import require_auth
from ..services.auth_service import AuthService
from ..extensions import db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

def _now(): return datetime.now(timezone.utc)
def _ip():  return request.headers.get("X-Real-IP") or request.remote_addr
def _ua():  return request.headers.get("User-Agent", "")


# ── Company self-registration (Trial signup) ─────────────────
@auth_bp.post("/register-company")
def register_company():
    """
    New client registers on eLogix.
    Creates: Company + admin user + 14-day trial.
    """
    data = request.get_json() or {}
    required = ["company_name", "admin_email", "admin_name", "password", "slug"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    # Validate password
    ok, err = AuthService.validate_password_strength(data["password"])
    if not ok:
        return jsonify({"success": False, "error": err}), 400

    slug = data["slug"].lower().strip().replace(" ", "-")
    if not slug.replace("-", "").isalnum():
        return jsonify({"success": False,
                        "error": "Company URL must contain only letters, numbers, hyphens"}), 400

    from ..saas.models import Company, CompanyUser, CompanyRole, Subscription, ELOGIX_PLANS
    from ..saas.tenant_provisioner import TenantProvisioner

    # Check slug unique
    if db.session.query(Company).filter_by(slug=slug).first():
        return jsonify({"success": False,
                        "error": f"The URL '{slug}.elogix.com.np' is already taken. Choose another."}), 409

    # Check email not used in same company (fresh company, won't conflict)
    try:
        result = TenantProvisioner.provision(
            tenant_slug  = slug,
            company_name = data["company_name"],
            admin_email  = data["admin_email"],
            plan         = "trial",
            plan_config  = ELOGIX_PLANS["trial"],
            country      = data.get("country", "Nepal"),
            currency     = data.get("currency", "NPR"),
            industry     = data.get("industry", ""),
            phone        = data.get("phone", ""),
            admin_name   = data["admin_name"],
            admin_password = data["password"],
        )
        return jsonify({
            "success":    True,
            "brand":      "eLogix",
            "message":    f"Welcome to eLogix! Your 14-day trial is ready.",
            "portal_url": f"https://{slug}.elogix.com.np",
            "login_url":  f"https://{slug}.elogix.com.np/login",
            "tenant":     result,
            "note":       "Check your email to verify your account.",
        }), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 409
    except Exception as e:
        return jsonify({"success": False, "error": f"Registration failed: {str(e)}"}), 500


# ── Login ─────────────────────────────────────────────────────
@auth_bp.post("/login")
def login():
    """
    Company-scoped login.
    Body: { email, password, company_slug }
    OR subdomain sets company_slug via Nginx X-Tenant-Id header.
    """
    data = request.get_json() or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # Company from body OR Nginx tenant header OR subdomain
    company_slug = (
        data.get("company_slug") or
        request.headers.get("X-Tenant-Id") or
        request.headers.get("X-Tenant") or
        ""
    ).strip().lower()

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400
    if not company_slug:
        return jsonify({"success": False,
                        "error": "Company not identified. Use your eLogix portal URL."}), 400

    try:
        result = AuthService.login(
            email        = email,
            password     = password,
            company_slug = company_slug,
            ip           = _ip(),
            user_agent   = _ua(),
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"success": False, "brand": "eLogix", "error": str(e)}), 401
    except Exception as e:
        return jsonify({"success": False, "error": "Login failed. Contact support@elogix.com.np"}), 500


# ── Token refresh ─────────────────────────────────────────────
@auth_bp.post("/refresh")
def refresh():
    data  = request.get_json() or {}
    token = data.get("refresh_token") or ""
    if not token:
        return jsonify({"success": False, "error": "Refresh token required"}), 400
    try:
        payload = AuthService.decode_token(token)
        if payload.get("type") != "refresh":
            return jsonify({"success": False, "error": "Invalid token type"}), 400
        if AuthService.is_token_revoked(payload["jti"]):
            return jsonify({"success": False, "error": "Token revoked. Log in again."}), 401

        from ..saas.models import CompanyUser
        user = db.session.query(CompanyUser).filter_by(
            id=payload["sub"], company_id=payload["company_id"]
        ).first()
        if not user or not user.is_active:
            return jsonify({"success": False, "error": "User not found or inactive"}), 401

        access_token, jti = AuthService.generate_access_token(
            user_id=user.id, company_id=user.company_id, role=user.role_slug,
            department_id=user.department_id, branch_id=user.branch_id, level=user.level,
        )
        return jsonify({"success": True, "access_token": access_token,
                        "token_type": "Bearer", "expires_in": 480*60}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 401


# ── Logout ────────────────────────────────────────────────────
@auth_bp.post("/logout")
@require_auth
def logout():
    AuthService.revoke_token(g.jti, g.user_id, g.company_id, reason="logout")
    return jsonify({"success": True, "brand": "eLogix",
                    "message": "Logged out of eLogix successfully"}), 200


# ── Logout all devices ────────────────────────────────────────
@auth_bp.post("/logout-all")
@require_auth
def logout_all():
    AuthService.revoke_all_user_tokens(g.user_id, g.company_id, reason="logout_all")
    return jsonify({"success": True, "message": "Logged out from all eLogix devices"}), 200


# ── Current user profile ──────────────────────────────────────
@auth_bp.get("/me")
@require_auth
def me():
    from ..saas.models import CompanyUser, Company, ModulePermission
    user    = db.session.query(CompanyUser).filter_by(id=g.user_id, company_id=g.company_id).first()
    company = db.session.query(Company).filter_by(id=g.company_id).first()
    if not user:
        return jsonify({"success": False, "error": "Invalid login ID or password"}), 401
    return jsonify({
        "success": True,
        "user":    user.to_dict(),
        "company": company.to_dict() if company else {},
        "role":    g.role,
        "level":   g.level,
        "permissions": g.permissions,
    }), 200


# ── Forgot password ───────────────────────────────────────────
@auth_bp.post("/forgot-password")
def forgot_password():
    data         = request.get_json() or {}
    email        = (data.get("email") or "").strip().lower()
    company_slug = (data.get("company_slug") or
                    request.headers.get("X-Tenant-Id") or "").strip().lower()
    if not email or not company_slug:
        return jsonify({"success": False, "error": "Email and company required"}), 400

    from ..saas.models import Company, CompanyUser
    company = db.session.query(Company).filter_by(slug=company_slug).first()
    if not company:
        # Don't leak whether company exists
        return jsonify({"success": True,
                        "message": "If your email exists, a reset link was sent."}), 200

    user = db.session.query(CompanyUser).filter_by(
        company_id=company.id, email=email
    ).first()
    if user:
        token = AuthService.generate_reset_token(user)
        reset_url = f"https://{company_slug}.elogix.com.np/reset-password?token={token}"
        # Send email (fire and forget)
        try:
            from ..services.email_service import EmailService
            EmailService.send_password_reset(
                to_email=email, to_name=user.full_name,
                reset_url=reset_url, company_name=company.name
            )
        except Exception:
            pass  # Don't fail — still return success

    return jsonify({"success": True,
                    "message": "If your email is registered, a reset link has been sent."}), 200


# ── Reset password ────────────────────────────────────────────
@auth_bp.post("/reset-password")
def reset_password():
    data         = request.get_json() or {}
    token        = data.get("token", "")
    new_password = data.get("password", "")
    company_slug = (data.get("company_slug") or
                    request.headers.get("X-Tenant-Id") or "").strip().lower()

    if not token or not new_password or not company_slug:
        return jsonify({"success": False, "error": "Token, password, and company required"}), 400

    ok, err = AuthService.validate_password_strength(new_password)
    if not ok:
        return jsonify({"success": False, "error": err}), 400

    from ..saas.models import Company
    company = db.session.query(Company).filter_by(slug=company_slug).first()
    if not company:
        return jsonify({"success": False, "error": "Invalid reset link"}), 400

    user = AuthService.verify_reset_token(token, company.id)
    if not user:
        return jsonify({"success": False, "error": "Reset link expired or invalid"}), 400

    user.set_password(new_password)
    user.pw_reset_token = None
    user.pw_reset_expires_at = None
    user.must_change_pw = False
    AuthService.revoke_all_user_tokens(user.id, company.id, reason="pw_change")
    db.session.commit()

    return jsonify({"success": True,
                    "message": "Password changed. Please log in to eLogix."}), 200


# ── Change own password ───────────────────────────────────────
@auth_bp.post("/change-password")
@require_auth
def change_password():
    data     = request.get_json() or {}
    old_pw   = data.get("old_password", "")
    new_pw   = data.get("new_password", "")

    from ..saas.models import CompanyUser
    user = db.session.query(CompanyUser).filter_by(
        id=g.user_id, company_id=g.company_id
    ).first()
    if not user:
        return jsonify({"success": False, "error": "Invalid login ID or password"}), 401

    if not AuthService.check_password(old_pw, user.password_hash):
        return jsonify({"success": False, "error": "Current password incorrect"}), 400

    ok, err = AuthService.validate_password_strength(new_pw)
    if not ok:
        return jsonify({"success": False, "error": err}), 400

    user.set_password(new_pw)
    user.must_change_pw = False
    AuthService.revoke_all_user_tokens(user.id, user.company_id, reason="pw_change")
    db.session.commit()

    return jsonify({"success": True,
                    "message": "Password changed. Please log in again."}), 200


# ── MFA verify ────────────────────────────────────────────────
@auth_bp.post("/mfa/verify")
@require_auth
def verify_mfa():
    data = request.get_json() or {}
    code = data.get("code", "")

    from ..saas.models import CompanyUser
    user = db.session.query(CompanyUser).filter_by(
        id=g.user_id, company_id=g.company_id
    ).first()
    if not user or not user.mfa_secret:
        return jsonify({"success": False, "error": "MFA not configured"}), 400

    if not AuthService.verify_totp(user.mfa_secret, code):
        return jsonify({"success": False, "error": "Invalid MFA code"}), 401

    return jsonify({"success": True, "mfa_verified": True}), 200


# ── Active sessions ───────────────────────────────────────────
@auth_bp.get("/sessions")
@require_auth
def list_sessions():
    from ..saas.models import UserSession
    sessions = db.session.query(UserSession).filter_by(
        user_id=g.user_id, company_id=g.company_id, is_valid=True
    ).order_by(UserSession.created_at.desc()).all()
    return jsonify({
        "success":  True,
        "sessions": [{"id": s.id, "ip": s.ip_address, "device": s.device_info,
                       "created_at": s.created_at.isoformat(),
                       "current": s.jti == g.jti} for s in sessions],
    }), 200


@auth_bp.delete("/sessions/<session_id>")
@require_auth
def revoke_session(session_id):
    from ..saas.models import UserSession
    s = db.session.query(UserSession).filter_by(
        id=session_id, user_id=g.user_id, company_id=g.company_id
    ).first()
    if not s:
        return jsonify({"success": False, "error": "Session not found"}), 404
    s.is_valid   = False
    s.revoked_at = _now()
    AuthService.revoke_token(s.jti, g.user_id, g.company_id, reason="user_revoked")
    db.session.commit()
    return jsonify({"success": True, "message": "Session revoked"}), 200
