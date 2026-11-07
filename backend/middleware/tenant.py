# FILE: backend/middleware/tenant.py
# eLogix HRMS — Multi-Tenant Isolation Middleware
# Sets app.current_company_id PostgreSQL session variable per request
# This activates Row-Level Security (RLS) policies in the database
# so every query is automatically filtered to the current tenant.
# eLogix Technologies · www.elogix.com.np

import os
import logging
from functools import wraps
from flask import request, g, jsonify
import jwt
from sqlalchemy import text

logger = logging.getLogger('elogix.tenant')

SECRET_KEY = os.getenv('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError('SECRET_KEY environment variable is not set')

# Routes that don't require tenant context
PUBLIC_ROUTES = {
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/elogix-admin/v1/login',
    '/api/health',
    '/api/saas/v1/register-tenant',
}


class TenantMiddleware:
    """
    Flask middleware that:
    1. Extracts JWT from Authorization header
    2. Decodes company_id and user_id from the token
    3. Sets Flask g.company_id and g.user_id
    4. Sets PostgreSQL session variable for RLS isolation
    """

    def __init__(self, app):
        self.app = app
        app.before_request(self.before_request)
        app.teardown_request(self.teardown_request)

    def before_request(self):
        """Run before every request."""
        # Skip middleware for non-API routes (static files, SPA)
        if not request.path.startswith('/api/'):
            return

        # Skip public routes
        if request.path in PUBLIC_ROUTES:
            return

        # Skip OPTIONS preflight (CORS)
        if request.method == 'OPTIONS':
            return

        # Extract and validate JWT
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401

        token = auth_header.split(' ', 1)[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired', 'code': 'TOKEN_EXPIRED'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': f'Invalid token: {e}'}), 401

        # Set request context
        g.user_id    = payload.get('user_id')
        g.company_id = payload.get('company_id')
        g.role       = payload.get('role', 'employee')
        g.tenant_slug= payload.get('tenant_slug')
        g.is_admin   = payload.get('is_elogix_admin', False)

        # eLogix SuperAdmin bypasses tenant isolation
        if g.is_admin:
            return

        if not g.company_id:
            return jsonify({'error': 'Tenant context missing from token'}), 401

        # Set PostgreSQL session variable for RLS
        # Uses parameterised query to prevent SQL injection
        try:
            from backend.extensions import db
            db.session.execute(
                text("SELECT set_config('app.current_company_id', :cid, true)"),
                {'cid': str(int(g.company_id))}
            )
        except Exception as e:
            logger.error(f'Failed to set tenant context in DB: {e}')
            return jsonify({'error': 'Database context error'}), 500

    def teardown_request(self, exception):
        """Clean up after each request."""
        pass


def require_permission(module_key):
    """
    Decorator to check if the tenant has a specific module enabled.
    Uses the module grants stored in elogix_tenant_permissions table.

    Usage:
        @recruitment_bp.route('/applicants')
        @require_permission('ats')
        def get_applicants():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if getattr(g, 'is_admin', False):
                return f(*args, **kwargs)  # eLogix admins bypass module checks

            company_id = getattr(g, 'company_id', None)
            if not company_id:
                return jsonify({'error': 'No tenant context'}), 401

            try:
                from backend.extensions import db
                result = db.session.execute(
                    text("SELECT modules FROM tenant_module_permissions WHERE company_id = :cid"),
                    {'cid': company_id}
                ).fetchone()

                if not result:
                    return jsonify({
                        'error': 'Module not activated',
                        'module': module_key,
                        'message': 'Contact eLogix SuperAdmin to activate this module',
                    }), 403

                modules = result[0] or []
                if module_key not in modules:
                    return jsonify({
                        'error': 'Module not activated',
                        'module': module_key,
                        'message': f'The "{module_key}" module is not in your plan. Contact support@elogix.com.np',
                    }), 403
            except Exception as e:
                logger.error(f'Permission check failed: {e}')
                return jsonify({'error': 'Permission check failed'}), 500

            return f(*args, **kwargs)
        return decorated
    return decorator


def require_role(*allowed_roles):
    """
    Decorator to restrict endpoints to specific roles.

    Usage:
        @require_role('super_admin', 'hr_manager')
        def sensitive_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if getattr(g, 'is_admin', False):
                return f(*args, **kwargs)

            role = getattr(g, 'role', 'employee')
            if role not in allowed_roles:
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Role "{role}" cannot access this endpoint. Required: {allowed_roles}',
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def resolve_tenant(slug: str = None):
    """
    Resolve a tenant by slug or from the current request context.
    Returns a dict with company_id and slug, or None if not found.

    Usage:
        tenant = resolve_tenant()            # from JWT context
        tenant = resolve_tenant('mycompany') # by slug
    """
    # From request context (already decoded by TenantMiddleware)
    if slug is None:
        company_id  = getattr(g, 'company_id', None)
        tenant_slug = getattr(g, 'tenant_slug', None)
        if company_id:
            return {'company_id': str(company_id), 'slug': tenant_slug}
        # Try X-Tenant-Slug header (used by frontend)
        slug = request.headers.get('X-Tenant-Slug')
        if not slug:
            return None

    # Lookup by slug
    try:
        from backend.extensions import db
        row = db.session.execute(
            text("SELECT id, slug FROM tenant_companies WHERE slug = :slug AND status IN ('active','trial')"),
            {'slug': slug}
        ).fetchone()
        if row:
            return {'company_id': str(row.id), 'slug': row.slug}
    except Exception as e:
        logger.warning(f'resolve_tenant({slug}) failed: {e}')

    return None


def apply_tenant_scope(query, model, company_id: str = None):
    """
    Apply tenant isolation filter to a SQLAlchemy query.
    Alias kept for backward compatibility with route files that import it.

    Usage (in route files):
        from backend.middleware.tenant import apply_tenant_scope
        emps = apply_tenant_scope(Employee.query, Employee).all()
    """
    cid = company_id or getattr(g, 'company_id', None)
    if not cid:
        logger.critical(
            '⛔ apply_tenant_scope called without company_id on %s — potential data leak',
            model.__name__ if hasattr(model, '__name__') else str(model)
        )
        raise PermissionError('Tenant scope required')
    return query.filter(model.company_id == cid)
