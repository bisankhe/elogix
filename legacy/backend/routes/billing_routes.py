"""
FILE: backend/routes/billing_routes.py
eLogix HRMS — Client billing self-service
View invoices, check plan, usage stats.
URL prefix: /api/v1/billing
"""
from flask import Blueprint, request, jsonify, g
from ..middleware.auth import require_auth, require_role
from ..extensions import db

billing_bp = Blueprint("billing", __name__, url_prefix="/api/v1/billing")

@billing_bp.get("/plan")
@require_auth
def current_plan():
    from ..saas.models import Company, Subscription, ELOGIX_PLANS, CompanyUser
    c   = db.session.query(Company).filter_by(id=g.company_id).first()
    sub = db.session.query(Subscription).filter_by(company_id=g.company_id).first()
    if not c: return jsonify({"success": False, "error": "Company not found"}), 404

    emp_count = db.session.query(CompanyUser).filter_by(company_id=g.company_id, is_active=True).count()
    plan_info = ELOGIX_PLANS.get(c.plan, {})
    return jsonify({
        "success":       True,
        "plan":          c.plan,
        "status":        c.status,
        "price_npr":     plan_info.get("price_npr", 0),
        "max_employees": plan_info.get("max_emp", 0),
        "current_employees": emp_count,
        "utilization_pct": round(emp_count / max(plan_info.get("max_emp",1), 1) * 100, 1),
        "trial_ends_at": c.trial_ends_at.isoformat() if c.trial_ends_at else None,
        "portal_url":    c.portal_url(),
        "upgrade_url":   f"https://{c.slug}.elogix.com.np/billing/upgrade",
        "all_plans":     [{"slug":k,"name":k.title(),"price_npr":v["price_npr"],"max_emp":v["max_emp"]}
                           for k,v in ELOGIX_PLANS.items()],
    }), 200

@billing_bp.get("/invoices")
@require_auth
@require_role("super_admin","hr_manager","finance_officer","hr_admin")
def list_invoices():
    from ..saas.models import Invoice
    page = int(request.args.get("page", 1))
    invs = db.session.query(Invoice).filter_by(company_id=g.company_id) \
              .order_by(Invoice.created_at.desc()).offset((page-1)*20).limit(20).all()
    return jsonify({"success": True, "invoices": [i.to_dict() for i in invs]}), 200

@billing_bp.get("/invoices/<inv_id>")
@require_auth
def get_invoice(inv_id):
    from ..saas.models import Invoice
    inv = db.session.query(Invoice).filter_by(id=inv_id, company_id=g.company_id).first()
    if not inv: return jsonify({"success": False, "error": "Not found"}), 404
    return jsonify({"success": True, "invoice": inv.to_dict()}), 200

@billing_bp.get("/usage")
@require_auth
def usage_stats():
    from ..saas.models import CompanyUser, ELOGIX_PLANS
    from ..saas.models import Company
    c = db.session.query(Company).filter_by(id=g.company_id).first()
    emp_count = db.session.query(CompanyUser).filter_by(company_id=g.company_id, is_active=True).count()
    plan_info = ELOGIX_PLANS.get(c.plan, {})
    return jsonify({
        "success":       True,
        "employees":     {"used": emp_count, "limit": plan_info.get("max_emp",0)},
        "storage_gb":    {"limit": plan_info.get("storage_gb", 0)},
        "ai_requests":   {"limit": plan_info.get("ai_req", 0)},
        "plan":          c.plan,
        "upgrade_needed": emp_count >= plan_info.get("max_emp",0),
    }), 200

@billing_bp.get("/notifications")
@require_auth
def get_notifications():
    from ..saas.models import Notification
    page = int(request.args.get("page", 1))
    notifs = db.session.query(Notification).filter_by(company_id=g.company_id) \
               .order_by(Notification.created_at.desc()).offset((page-1)*20).limit(20).all()
    return jsonify({"success": True, "notifications": [
        {"id":n.id,"type":n.type,"title":n.title,"message":n.message,
         "priority":n.priority,"is_read":n.is_read,"created_at":n.created_at.isoformat()}
        for n in notifs
    ]}), 200

@billing_bp.post("/tickets")
@require_auth
def create_ticket():
    from ..saas.models import SupportTicket
    import secrets
    data = request.get_json() or {}
    if not data.get("subject"): return jsonify({"success":False,"error":"subject required"}), 400
    t = SupportTicket(
        company_id  = g.company_id,
        user_id     = g.user_id,
        ticket_no   = "SUPP-" + secrets.token_hex(4).upper(),
        subject     = data["subject"],
        description = data.get("description",""),
        priority    = data.get("priority","normal"),
        category    = data.get("category","technical"),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify({"success": True, "ticket_no": t.ticket_no,
                    "message": "Support ticket created. eLogix team will respond within 24 hours."}), 201
