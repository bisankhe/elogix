"""
FILE: backend/utils/tenant_middleware.py
eLogix HRMS — Multi-Tenant Middleware & Data Isolation
CRITICAL: Ensures every DB query is scoped to the correct company/tenant
Approach: Row-Level Security (RLS) + company_id on every model + middleware enforcement
eLogix Technologies · www.elogix.com.np
"""
import uuid
from functools import wraps
from flask import g, request, jsonify, current_app
from sqlalchemy import event, text
from sqlalchemy.orm import Session
from backend.extensions import db
from backend.utils.logging_config import get_logger

log = get_logger('elogix.tenant')


# ══════════════════════════════════════════════════════════════
# TENANT CONTEXT — stored in Flask g per request
# ══════════════════════════════════════════════════════════════
class TenantContext:
    """Holds current request's tenant (company) context."""
    _current = None

    @classmethod
    def set(cls, company_id: str, company_slug: str = None):
        g.company_id   = str(company_id)
        g.company_slug = company_slug
        cls._current   = str(company_id)

    @classmethod
    def get(cls) -> str | None:
        return getattr(g, 'company_id', None)

    @classmethod
    def require(cls) -> str:
        cid = cls.get()
        if not cid:
            raise PermissionError("No tenant context set — possible data isolation breach")
        return cid


# ══════════════════════════════════════════════════════════════
# TENANT QUERY MIXIN — add to every SQLAlchemy model
# ══════════════════════════════════════════════════════════════
class TenantMixin:
    """
    Add this mixin to every model that has company_id.
    Provides:
      - .for_tenant(company_id) — class method to filter by tenant
      - .tenant_safe_query()    — auto-filtered query
    """
    @classmethod
    def for_tenant(cls, company_id: str = None):
        """Return query filtered to specific tenant."""
        cid = company_id or TenantContext.get()
        if not cid:
            log.critical("⛔ Query without tenant context on %s — DATA LEAK RISK", cls.__name__)
            raise PermissionError(f"Tenant context required for {cls.__name__}")
        return cls.query.filter_by(company_id=uuid.UUID(cid) if '-' in str(cid) else cid)

    @classmethod
    def get_or_404_tenant(cls, record_id, company_id: str = None):
        """Get record ensuring it belongs to current tenant."""
        cid = company_id or TenantContext.require()
        record = cls.query.filter_by(
            id=record_id,
            company_id=uuid.UUID(cid) if '-' in str(cid) else cid
        ).first()
        if not record:
            from flask import abort
            abort(404)
        return record

    def belongs_to_tenant(self, company_id: str = None) -> bool:
        """Verify this record belongs to the given tenant."""
        cid = company_id or TenantContext.get()
        return str(self.company_id) == str(cid)


# ══════════════════════════════════════════════════════════════
# POSTGRESQL ROW LEVEL SECURITY (RLS)
# Applied at database level — most secure approach
# ══════════════════════════════════════════════════════════════
def set_pg_tenant_context(company_id: str):
    """
    Set PostgreSQL session variable for RLS policies.
    Called at the start of every request after auth.
    """
    if company_id:
        try:
            db.session.execute(
                text("SET LOCAL app.current_company_id = :cid"),
                {'cid': str(company_id)}
            )
        except Exception as e:
            log.warning("Could not set PG tenant context: %s", e)


def clear_pg_tenant_context():
    """Clear PG session variable after request."""
    try:
        db.session.execute(text("RESET app.current_company_id"))
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════
# FLASK MIDDLEWARE — runs before every request
# ══════════════════════════════════════════════════════════════
def init_tenant_middleware(app):
    """Register tenant middleware with Flask app."""

    @app.before_request
    def set_tenant_context():
        """
        Extract tenant from JWT token and set context.
        Called before EVERY request automatically.
        """
        # Skip public routes
        public_routes = [
            '/api/v1/auth/login', '/api/v1/auth/register',
            '/api/v1/health', '/api/health',
            '/api/v1/elogix-admin/',
        ]
        if any(request.path.startswith(r) for r in public_routes):
            return

        # Extract company_id from g.user (set by require_auth decorator)
        user = getattr(g, 'user', None)
        if user:
            company_id = getattr(user, 'company_id', None)
            if company_id:
                TenantContext.set(str(company_id))
                set_pg_tenant_context(str(company_id))
                log.debug("Tenant context: %s", str(company_id)[:8])

    @app.teardown_request
    def clear_tenant_context(exc=None):
        """Clear tenant context after every request."""
        g.pop('company_id', None)
        g.pop('company_slug', None)


# ══════════════════════════════════════════════════════════════
# DECORATOR — require tenant context on route
# ══════════════════════════════════════════════════════════════
def require_tenant(f):
    """
    Decorator: ensures company_id is in g before executing route.
    Use on any route that accesses tenant data.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if not TenantContext.get():
            log.warning("⛔ Route %s accessed without tenant context", request.path)
            return jsonify({'error': 'Tenant context required'}), 403
        return f(*args, **kwargs)
    return decorated


# ══════════════════════════════════════════════════════════════
# SAFE QUERY HELPERS — use these instead of Model.query directly
# ══════════════════════════════════════════════════════════════
def tenant_query(model, company_id: str = None):
    """
    Safe wrapper for tenant-scoped queries.
    ALWAYS use this instead of Model.query in routes.

    Usage:
        employees = tenant_query(Employee).all()
        emp = tenant_query(Employee).filter_by(id=emp_id).first()
    """
    cid = company_id or TenantContext.require()
    return model.query.filter_by(company_id=cid)


def tenant_filter(query, model, company_id: str = None):
    """
    Add tenant filter to an existing query.
    Usage:
        q = db.session.query(Employee, Department)
        q = tenant_filter(q, Employee)
    """
    cid = company_id or TenantContext.require()
    return query.filter(model.company_id == cid)


def create_for_tenant(model_class, company_id: str = None, **kwargs):
    """
    Create a new record ensuring company_id is set.
    Prevents accidentally creating records without tenant isolation.
    """
    cid = company_id or TenantContext.require()
    obj = model_class(company_id=cid, **kwargs)
    db.session.add(obj)
    return obj


# ══════════════════════════════════════════════════════════════
# DATABASE SCHEMA ISOLATION (Advanced — per-tenant schemas)
# ══════════════════════════════════════════════════════════════
TENANT_ISOLATION_STRATEGY = 'row_level'  # 'row_level' | 'schema_per_tenant'
# row_level: All tenants in same tables, filtered by company_id + RLS
# schema_per_tenant: Each tenant gets own PostgreSQL schema (more isolated, harder to scale)
# Current: row_level + RLS (standard SaaS approach, used by Salesforce, Shopify, etc.)

"""
POSTGRESQL RLS POLICIES (run once on DB setup):

-- Enable RLS on all tenant tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
-- ... (all tenant tables)

-- Create policy: users can only see their company's data
CREATE POLICY tenant_isolation ON employees
    USING (company_id = current_setting('app.current_company_id')::UUID);

CREATE POLICY tenant_isolation ON attendance_logs
    USING (company_id = current_setting('app.current_company_id')::UUID);
"""

