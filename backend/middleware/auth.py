"""
FILE: backend/middleware/auth.py
eLogix HRMS — JWT Auth Middleware
SECURITY: Every request validated. Token revocation checked. Tenant isolated.
eLogix Technologies · www.elogix.com.np
"""
import os
from functools import wraps
from flask import request, jsonify, g
from ..services.auth_service import AuthService

def require_auth(f):
    """Validate JWT, set g.user_id, g.company_id, g.role, g.permissions."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "brand": "eLogix",
                            "error": "eLogix: Authorization required. Provide Bearer token."}), 401
        token = auth_header[7:]
        try:
            payload = AuthService.decode_token(token)
        except ValueError as e:
            return jsonify({"success": False, "brand": "eLogix", "error": str(e)}), 401

        # Check token not blacklisted (revoked on logout / forced)
        jti = payload.get("jti")
        if jti and AuthService.is_token_revoked(jti):
            return jsonify({"success": False, "brand": "eLogix",
                            "error": "eLogix: Token revoked. Please log in again."}), 401

        # Populate Flask request context
        g.user_id      = payload["sub"]
        g.company_id   = payload["company_id"]
        g.tenant_id    = payload["company_id"]
        g.tenant_slug  = payload.get("tenant_slug", "")
        g.role         = payload.get("role", "employee")
        g.level        = payload.get("level", 10)
        g.dept_id      = payload.get("dept_id")
        g.branch_id    = payload.get("branch_id")
        g.permissions  = payload.get("permissions", {})
        g.jti          = jti
        return f(*args, **kwargs)
    return decorated


def require_role(*roles):
    """Restrict endpoint to specified role slugs."""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            if g.role not in roles:
                return jsonify({
                    "success": False, "brand": "eLogix",
                    "error": f"eLogix: Access denied. Required: {roles}. Your role: {g.role}"
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_level(max_level: int):
    """Only users with level <= max_level can access. 1=highest, 10=lowest."""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            if g.level > max_level:
                return jsonify({
                    "success": False, "brand": "eLogix",
                    "error": f"eLogix: Insufficient authority level."
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_permission(module: str, action: str):
    """Check g.permissions dict loaded from JWT (set at login from DB)."""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            mod_perms = g.permissions.get(module, {})
            if not mod_perms.get(action, False):
                return jsonify({
                    "success": False, "brand": "eLogix",
                    "error": f"eLogix: Permission denied — cannot '{action}' on '{module}'."
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_elogix_admin(*roles):
    """For eLogix internal admin panel endpoints only."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            admin_key = request.headers.get("X-eLogix-Admin-Key", "")
            expected  = os.getenv("ELOGIX_ADMIN_KEY", "")
            if not expected or admin_key != expected:
                return jsonify({"success": False,
                                "error": "eLogix admin key required"}), 403
            # Also check Bearer if present
            auth = request.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                try:
                    payload = AuthService.decode_token(auth[7:])
                    g.admin_role = payload.get("role", "")
                    if roles and g.admin_role not in roles:
                        return jsonify({"success": False,
                                        "error": "Insufficient eLogix admin role"}), 403
                except ValueError:
                    return jsonify({"success": False, "error": "Invalid admin token"}), 401
            return f(*args, **kwargs)
        return decorated
    return decorator


# Legacy aliases kept for backward compatibility
def require_auth_func(f):
    return require_auth(f)

ROLE_PERMISSIONS = {
    "super_admin":    {"can_view_all": True,  "can_edit_all": True,  "can_delete": True},
    "executive":      {"can_view_all": True,  "can_edit_all": False, "can_delete": False},
    "hr_manager":     {"can_view_all": True,  "can_edit_all": True,  "can_delete": False},
    "department_head":{"can_view_all": False, "can_view_own_dept": True},
    "branch_manager": {"can_view_all": False, "can_view_own_branch": True},
    "employee":       {"can_view_self": True},
}

def create_access_token(uid, cid, role, tid=None): return ""
def create_refresh_token(uid, cid): return ""
def decode_token(t): return AuthService.decode_token(t)
def auth_response(**kw): return {}
