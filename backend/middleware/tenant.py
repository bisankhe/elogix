"""
FILE: backend/middleware/tenant.py
eLogix HRMS — Multi-tenant request middleware
Resolves tenant from: JWT → X-Tenant-Id header → subdomain → query param
eLogix Technologies · www.elogix.com.np
"""
from functools import wraps
from flask import request, jsonify, g
import re

RESERVED_SUBDOMAINS = {"www", "api", "app", "admin", "mail", "elogix",
                        "portal", "static", "cdn", "support", "dev", "staging"}

def resolve_tenant() -> str | None:
    """
    Priority order for eLogix tenant resolution:
    1. g.tenant_id already set by JWT auth middleware
    2. X-Tenant-Id header (set by Nginx from subdomain)
    3. company_id query param
    4. Subdomain: himalayan.elogix.com.np → 'himalayan'
    5. Origin header subdomain
    """
    # 1. Already set by JWT
    if hasattr(g, "tenant_id") and g.tenant_id:
        return g.tenant_id

    # 2. Nginx passes X-Tenant-Id from subdomain match
    header = request.headers.get("X-Tenant-Id") or request.headers.get("X-Tenant")
    if header and header not in RESERVED_SUBDOMAINS:
        return header.lower().strip()

    # 3. Query param (legacy support)
    param = request.args.get("company_id") or request.args.get("tenant")
    if param:
        return param.lower().strip()

    # 4. Parse subdomain from Host header
    host = (request.headers.get("Host") or request.host or "").split(":")[0]
    parts = host.split(".")
    if len(parts) >= 3:  # subdomain.elogix.com.np
        subdomain = parts[0].lower()
        if subdomain not in RESERVED_SUBDOMAINS and re.match(r'^[a-z0-9-]+$', subdomain):
            return subdomain

    # 5. Parse from Origin header
    origin = request.headers.get("Origin", "")
    if origin:
        try:
            from urllib.parse import urlparse
            origin_host = urlparse(origin).hostname or ""
            parts = origin_host.split(".")
            if len(parts) >= 3:
                subdomain = parts[0].lower()
                if subdomain not in RESERVED_SUBDOMAINS:
                    return subdomain
        except Exception:
            pass

    return None


def require_tenant(f):
    """Decorator: ensure tenant context is set before the view runs."""
    @wraps(f)
    def decorated(*args, **kwargs):
        tenant = resolve_tenant()
        if not tenant:
            return jsonify({
                "success": False,
                "brand":   "eLogix",
                "error":   "eLogix: Tenant context missing. Use your eLogix subdomain (e.g. company.elogix.com.np) or set X-Tenant-Id header.",
            }), 400
        g.tenant_id  = tenant
        g.company_id = tenant
        return f(*args, **kwargs)
    return decorated


def tenant_filter(model_class):
    """
    Returns SQLAlchemy filters to scope queries to current eLogix tenant.
    Usage:
        employees = db.session.query(Employee).filter(
            *tenant_filter(Employee)
        ).all()
    """
    filters = []
    if hasattr(model_class, "company_id") and hasattr(g, "company_id"):
        filters.append(model_class.company_id == g.company_id)
    if hasattr(model_class, "is_deleted"):
        filters.append(model_class.is_deleted == False)
    return filters


def apply_tenant_scope(query, model_class):
    """
    Chains eLogix tenant + soft-delete filters onto a SQLAlchemy query.
    Usage:
        q = apply_tenant_scope(db.session.query(Department), Department)
    """
    if hasattr(model_class, "company_id") and hasattr(g, "company_id"):
        query = query.filter(model_class.company_id == g.company_id)
    if hasattr(model_class, "is_deleted"):
        query = query.filter(model_class.is_deleted == False)
    return query
