"""
FILE: backend/saas/admin_routes.py
eLogix SaaS — Tenant onboarding, plan management, admin panel
eLogix Technologies · www.elogix.com.np
"""
from flask import Blueprint, request, jsonify, g
from ..saas.tenant_provisioner import TenantProvisioner
from ..middleware.auth import require_auth
from ..extensions import db

saas_bp = Blueprint("elogix_saas", __name__)

ELOGIX_PLANS = {
    "starter":    {"max_employees": 50,    "price_npr": 5000,  "modules": ["core_hr","attendance","leave"]},
    "growth":     {"max_employees": 250,   "price_npr": 12000, "modules": ["core_hr","attendance","leave","payroll","recruitment"]},
    "business":   {"max_employees": 500,   "price_npr": 25000, "modules": ["core_hr","attendance","leave","payroll","recruitment","training","performance"]},
    "enterprise": {"max_employees": 1000,  "price_npr": 45000, "modules": ["all"]},
    "unlimited":  {"max_employees": 99999, "price_npr": 75000, "modules": ["all"]},
}

# ── eLogix Super-Admin: Onboard new client ───────────────────
@saas_bp.post("/tenants")
@require_auth(roles=["elogix_superadmin"])
def create_tenant():
    """
    Provision a new eLogix SaaS tenant.
    Creates: DB schema, storage bucket, subdomain config, admin user.
    """
    data = request.get_json()
    required = ["tenant_slug", "company_name", "admin_email", "plan"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"success": False, "error": f"Missing fields: {missing}"}), 400

    plan = data["plan"]
    if plan not in ELOGIX_PLANS:
        return jsonify({"success": False, "error": f"Invalid plan. Choose: {list(ELOGIX_PLANS)}"}), 400

    slug = data["tenant_slug"].lower().strip().replace(" ", "-")
    if not slug.isalnum() and "-" not in slug:
        return jsonify({"success": False, "error": "Tenant slug must be alphanumeric"}), 400

    try:
        result = TenantProvisioner.provision(
            tenant_slug   = slug,
            company_name  = data["company_name"],
            admin_email   = data["admin_email"],
            plan          = plan,
            plan_config   = ELOGIX_PLANS[plan],
            country       = data.get("country", "Nepal"),
            currency      = data.get("currency", "NPR"),
            industry      = data.get("industry", ""),
            phone         = data.get("phone", ""),
        )
        return jsonify({
            "success":    True,
            "brand":      "eLogix",
            "message":    f"eLogix tenant '{slug}' provisioned successfully",
            "tenant":     result,
            "portal_url": f"https://{slug}.elogix.com.np",
            "api_url":    f"https://api.elogix.com.np/api/v1/",
        }), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 409
    except Exception as e:
        return jsonify({"success": False, "error": f"Provisioning failed: {str(e)}"}), 500

# ── List all eLogix tenants ───────────────────────────────────
@saas_bp.get("/tenants")
@require_auth(roles=["elogix_superadmin"])
def list_tenants():
    from ..models.billing_models import Company
    tenants = db.session.query(Company).order_by(Company.created_at.desc()).all()
    return jsonify({
        "success": True,
        "brand":   "eLogix",
        "total":   len(tenants),
        "tenants": [{
            "id":           t.id,
            "slug":         t.subdomain,
            "name":         t.name,
            "plan":         t.plan,
            "employees":    t.employee_count,
            "status":       t.subscription_status,
            "portal_url":   f"https://{t.subdomain}.elogix.com.np",
            "created_at":   str(t.created_at),
        } for t in tenants],
    })

# ── Get single tenant ─────────────────────────────────────────
@saas_bp.get("/tenants/<slug>")
@require_auth(roles=["elogix_superadmin"])
def get_tenant(slug):
    from ..models.billing_models import Company
    t = db.session.query(Company).filter(Company.subdomain == slug).first()
    if not t:
        return jsonify({"success": False, "error": f"Tenant '{slug}' not found"}), 404
    plan_info = ELOGIX_PLANS.get(t.plan, {})
    return jsonify({
        "success":      True,
        "brand":        "eLogix",
        "tenant":       {
            "id":               t.id,
            "slug":             t.subdomain,
            "name":             t.name,
            "plan":             t.plan,
            "plan_price_npr":   plan_info.get("price_npr"),
            "max_employees":    plan_info.get("max_employees"),
            "modules":          plan_info.get("modules", []),
            "status":           t.subscription_status,
            "portal_url":       f"https://{t.subdomain}.elogix.com.np",
        },
    })

# ── Upgrade / downgrade plan ──────────────────────────────────
@saas_bp.put("/tenants/<slug>/plan")
@require_auth(roles=["elogix_superadmin"])
def change_plan(slug):
    data = request.get_json()
    new_plan = data.get("plan")
    if new_plan not in ELOGIX_PLANS:
        return jsonify({"success": False, "error": f"Invalid plan: {new_plan}"}), 400
    from ..models.billing_models import Company
    t = db.session.query(Company).filter(Company.subdomain == slug).first()
    if not t:
        return jsonify({"success": False, "error": "Tenant not found"}), 404
    old_plan = t.plan
    t.plan = new_plan
    db.session.commit()
    return jsonify({
        "success":    True,
        "brand":      "eLogix",
        "message":    f"Plan changed: {old_plan} → {new_plan}",
        "new_price":  f"NPR {ELOGIX_PLANS[new_plan]['price_npr']:,}/month",
    })

# ── Suspend / reactivate tenant ───────────────────────────────
@saas_bp.put("/tenants/<slug>/status")
@require_auth(roles=["elogix_superadmin"])
def set_tenant_status(slug):
    data   = request.get_json()
    status = data.get("status")  # active | suspended | cancelled
    if status not in ("active", "suspended", "cancelled"):
        return jsonify({"success": False, "error": "status must be active|suspended|cancelled"}), 400
    from ..models.billing_models import Company
    t = db.session.query(Company).filter(Company.subdomain == slug).first()
    if not t:
        return jsonify({"success": False, "error": "Tenant not found"}), 404
    t.subscription_status = status
    db.session.commit()
    return jsonify({"success": True, "brand": "eLogix", "slug": slug, "status": status})

# ── eLogix plan catalogue ─────────────────────────────────────
@saas_bp.get("/plans")
def get_plans():
    return jsonify({
        "success": True,
        "brand":   "eLogix",
        "website": "https://www.elogix.com.np",
        "plans":   [
            {"slug": k, **v, "price_display": f"NPR {v['price_npr']:,}/month"}
            for k, v in ELOGIX_PLANS.items()
        ],
    })
