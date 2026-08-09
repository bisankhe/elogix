"""
FILE: backend/saas/elogix_admin_routes.py
eLogix Technologies Internal Admin Panel
ONLY accessible by eLogix staff — protected by admin key + staff JWT
Covers: Company management, billing, support, communications, analytics
URL prefix: /api/elogix-admin/v1
"""
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone, timedelta
from ..middleware.auth import require_elogix_admin
from ..extensions import db

elogix_admin_bp = Blueprint("elogix_admin", __name__, url_prefix="/api/elogix-admin/v1")
_now = lambda: datetime.now(timezone.utc)

# ── Dashboard overview ────────────────────────────────────────
@elogix_admin_bp.get("/dashboard")
@require_elogix_admin()
def admin_dashboard():
    from ..saas.models import Company, Invoice, SupportTicket, CompanyUser
    companies = db.session.query(Company).all()
    total     = len(companies)
    active    = sum(1 for c in companies if c.status == "active")
    trial     = sum(1 for c in companies if c.status == "trial")
    suspended = sum(1 for c in companies if c.status == "suspended")
    cancelled = sum(1 for c in companies if c.status == "cancelled")

    # MRR
    active_plans = [c for c in companies if c.status == "active"]
    from ..saas.models import ELOGIX_PLANS
    mrr = sum(ELOGIX_PLANS.get(c.plan, {}).get("price_npr", 0) for c in active_plans)

    # Pending invoices
    pending_inv = db.session.query(Invoice).filter_by(status="pending").count()
    overdue_inv = db.session.query(Invoice).filter_by(status="overdue").count()
    overdue_amt = db.session.query(db.func.sum(Invoice.total_npr)).filter_by(status="overdue").scalar() or 0

    # Support
    open_tickets = db.session.query(SupportTicket).filter_by(status="open").count()

    # Total users
    total_users = db.session.query(CompanyUser).filter_by(is_active=True).count()

    return jsonify({
        "success": True,
        "brand":   "eLogix",
        "summary": {
            "companies": {"total": total, "active": active, "trial": trial,
                          "suspended": suspended, "cancelled": cancelled},
            "billing":   {"mrr_npr": mrr, "arr_npr": mrr * 12,
                          "pending_invoices": pending_inv,
                          "overdue_invoices": overdue_inv,
                          "overdue_amount_npr": overdue_amt},
            "support":   {"open_tickets": open_tickets},
            "users":     {"total_active": total_users},
        },
    })


# ── Company management ────────────────────────────────────────
@elogix_admin_bp.get("/companies")
@require_elogix_admin()
def list_companies():
    from ..saas.models import Company
    q = db.session.query(Company)
    # Filters
    status = request.args.get("status")
    plan   = request.args.get("plan")
    search = request.args.get("search", "").strip()
    if status: q = q.filter(Company.status == status)
    if plan:   q = q.filter(Company.plan == plan)
    if search: q = q.filter(Company.name.ilike(f"%{search}%") | Company.slug.ilike(f"%{search}%"))

    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    total    = q.count()
    companies= q.order_by(Company.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()

    return jsonify({
        "success":   True,
        "total":     total,
        "page":      page,
        "companies": [c.to_dict(include_sensitive=True) for c in companies],
    })


@elogix_admin_bp.get("/companies/<slug>")
@require_elogix_admin()
def get_company(slug):
    from ..saas.models import Company, CompanyUser, Invoice, SupportTicket, Subscription
    c = db.session.query(Company).filter_by(slug=slug).first()
    if not c: return jsonify({"success": False, "error": "Company not found"}), 404
    users    = db.session.query(CompanyUser).filter_by(company_id=c.id, is_active=True).count()
    invoices = db.session.query(Invoice).filter_by(company_id=c.id).order_by(Invoice.created_at.desc()).limit(5).all()
    tickets  = db.session.query(SupportTicket).filter_by(company_id=c.id).order_by(SupportTicket.created_at.desc()).limit(5).all()
    return jsonify({
        "success":    True,
        "company":    c.to_dict(include_sensitive=True),
        "active_users": users,
        "recent_invoices": [i.to_dict() for i in invoices],
        "recent_tickets":  [{"id":t.id,"subject":t.subject,"status":t.status,"priority":t.priority} for t in tickets],
    })


# ── Create company (eLogix sales team) ───────────────────────
@elogix_admin_bp.post("/companies")
@require_elogix_admin()
def create_company():
    from ..saas.models import ELOGIX_PLANS
    from ..saas.tenant_provisioner import TenantProvisioner
    data = request.get_json() or {}
    required = ["company_name", "slug", "admin_email", "plan"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"success": False, "error": f"Missing: {missing}"}), 400
    if data["plan"] not in ELOGIX_PLANS:
        return jsonify({"success": False, "error": f"Invalid plan. Options: {list(ELOGIX_PLANS)}"}), 400
    try:
        result = TenantProvisioner.provision(
            tenant_slug   = data["slug"].lower().strip(),
            company_name  = data["company_name"],
            admin_email   = data["admin_email"],
            plan          = data["plan"],
            plan_config   = ELOGIX_PLANS[data["plan"]],
            country       = data.get("country", "Nepal"),
            currency      = data.get("currency", "NPR"),
            industry      = data.get("industry", ""),
            phone         = data.get("phone", ""),
            admin_name    = data.get("admin_name", "Admin"),
            account_manager = data.get("account_manager", ""),
            sales_rep       = data.get("sales_rep", ""),
        )
        return jsonify({"success": True, "brand": "eLogix", "tenant": result}), 201
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 409
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── Upgrade / downgrade plan ──────────────────────────────────
@elogix_admin_bp.put("/companies/<slug>/plan")
@require_elogix_admin()
def change_plan(slug):
    from ..saas.models import Company, Subscription, ELOGIX_PLANS
    data = request.get_json() or {}
    new_plan = data.get("plan")
    if new_plan not in ELOGIX_PLANS:
        return jsonify({"success": False, "error": f"Invalid plan: {new_plan}"}), 400
    c = db.session.query(Company).filter_by(slug=slug).first()
    if not c: return jsonify({"success": False, "error": "Not found"}), 404
    old_plan = c.plan
    c.plan = new_plan
    c.max_employees = ELOGIX_PLANS[new_plan]["max_employees"]
    # Update subscription
    sub = db.session.query(Subscription).filter_by(company_id=c.id).first()
    if sub:
        sub.plan = new_plan
        sub.max_employees = ELOGIX_PLANS[new_plan]["max_employees"]
        sub.price_npr = ELOGIX_PLANS[new_plan]["price_npr"]
    db.session.commit()
    # Notify company
    _send_notification(c.id, "billing",
        f"eLogix Plan Updated: {old_plan.title()} → {new_plan.title()}",
        f"Your eLogix plan has been updated to {new_plan.title()}. "
        f"New limit: {ELOGIX_PLANS[new_plan]['max_employees']} employees. "
        f"NPR {ELOGIX_PLANS[new_plan]['price_npr']:,}/month.")
    return jsonify({
        "success":   True,
        "message":   f"Plan changed: {old_plan} → {new_plan}",
        "new_price": f"NPR {ELOGIX_PLANS[new_plan]['price_npr']:,}/month",
    })


# ── Suspend / activate company ────────────────────────────────
@elogix_admin_bp.put("/companies/<slug>/status")
@require_elogix_admin()
def set_status(slug):
    from ..saas.models import Company
    from ..services.auth_service import AuthService
    data   = request.get_json() or {}
    status = data.get("status")
    reason = data.get("reason", "")
    if status not in ("active", "suspended", "cancelled", "reactivated"):
        return jsonify({"success": False, "error": "Invalid status"}), 400

    c = db.session.query(Company).filter_by(slug=slug).first()
    if not c: return jsonify({"success": False, "error": "Not found"}), 404

    old_status = c.status
    c.status = "active" if status == "reactivated" else status
    if status == "suspended":
        c.suspended_at     = _now()
        c.suspended_reason = reason
        # Force logout all users
        from ..saas.models import CompanyUser
        users = db.session.query(CompanyUser).filter_by(company_id=c.id, is_active=True).all()
        for u in users:
            try: AuthService.revoke_all_user_tokens(u.id, c.id, reason="company_suspended")
            except: pass
    elif status == "cancelled":
        c.cancelled_at = _now()
    db.session.commit()

    msg_map = {
        "suspended":    f"Your eLogix account has been suspended. Reason: {reason}. Contact support@elogix.com.np",
        "cancelled":    "Your eLogix account has been cancelled. Data retained for 90 days.",
        "active":       "Your eLogix account has been activated.",
        "reactivated":  "Your eLogix account has been reactivated. Welcome back!",
    }
    _send_notification(c.id, "alert", f"eLogix Account Status: {status.title()}", msg_map.get(status, ""))
    return jsonify({"success": True, "slug": slug, "old_status": old_status, "new_status": c.status})


# ── Billing: Generate invoice ─────────────────────────────────
@elogix_admin_bp.post("/companies/<slug>/invoices")
@require_elogix_admin()
def generate_invoice(slug):
    from ..saas.models import Company, Invoice, ELOGIX_PLANS
    c = db.session.query(Company).filter_by(slug=slug).first()
    if not c: return jsonify({"success": False, "error": "Not found"}), 404

    data         = request.get_json() or {}
    period_month = data.get("period_month", _now().strftime("%Y-%m"))
    emp_count    = data.get("employee_count", c.employee_count)
    plan_info    = ELOGIX_PLANS.get(c.plan, {})
    subtotal     = plan_info.get("price_npr", 0)
    vat          = round(subtotal * 0.13)
    total        = subtotal + vat
    inv_no       = f"ELX-{_now().strftime('%Y%m')}-{c.slug[:6].upper()}-{db.session.query(Invoice).count()+1:04d}"

    inv = Invoice(
        company_id     = c.id,
        invoice_number = inv_no,
        period_month   = period_month,
        plan           = c.plan,
        employee_count = emp_count,
        subtotal_npr   = subtotal,
        vat_pct        = 13.0,
        vat_npr        = vat,
        total_npr      = total,
        status         = "pending",
        due_date       = _now() + timedelta(days=15),
    )
    db.session.add(inv)
    db.session.commit()

    _send_notification(c.id, "billing",
        f"eLogix Invoice {inv_no} — NPR {total:,}",
        f"Invoice {inv_no} for {period_month} is ready. "
        f"Amount: NPR {total:,} (incl. VAT 13%). Due: {inv.due_date.strftime('%Y-%m-%d')}. "
        f"Pay at: https://{slug}.elogix.com.np/billing")
    return jsonify({"success": True, "invoice": inv.to_dict()})


# ── Mark invoice paid ─────────────────────────────────────────
@elogix_admin_bp.put("/invoices/<inv_id>/paid")
@require_elogix_admin()
def mark_paid(inv_id):
    from ..saas.models import Invoice
    data = request.get_json() or {}
    inv  = db.session.query(Invoice).filter_by(id=inv_id).first()
    if not inv: return jsonify({"success": False, "error": "Invoice not found"}), 404
    inv.status         = "paid"
    inv.paid_at        = _now()
    inv.payment_method = data.get("payment_method", "bank_transfer")
    inv.payment_ref    = data.get("payment_ref", "")
    db.session.commit()
    return jsonify({"success": True, "message": f"Invoice {inv.invoice_number} marked paid"})


# ── Support tickets ───────────────────────────────────────────
@elogix_admin_bp.get("/tickets")
@require_elogix_admin()
def list_tickets():
    from ..saas.models import SupportTicket, Company
    q      = db.session.query(SupportTicket)
    status = request.args.get("status")
    if status: q = q.filter(SupportTicket.status == status)
    tickets = q.order_by(SupportTicket.created_at.desc()).limit(100).all()
    return jsonify({"success": True, "tickets": [
        {"id": t.id, "ticket_no": t.ticket_no, "company_id": t.company_id,
         "subject": t.subject, "priority": t.priority, "status": t.status,
         "category": t.category, "created_at": t.created_at.isoformat()}
        for t in tickets
    ]})


@elogix_admin_bp.put("/tickets/<tid>")
@require_elogix_admin()
def update_ticket(tid):
    from ..saas.models import SupportTicket
    data = request.get_json() or {}
    t    = db.session.query(SupportTicket).filter_by(id=tid).first()
    if not t: return jsonify({"success": False, "error": "Ticket not found"}), 404
    for field in ("status", "priority", "assigned_to"):
        if field in data: setattr(t, field, data[field])
    if data.get("status") in ("resolved", "closed"):
        t.resolved_at = _now()
    t.updated_at = _now()
    db.session.commit()
    return jsonify({"success": True, "ticket_id": tid, "status": t.status})


# ── Broadcast notification to company ─────────────────────────
@elogix_admin_bp.post("/companies/<slug>/notify")
@require_elogix_admin()
def notify_company(slug):
    from ..saas.models import Company
    c = db.session.query(Company).filter_by(slug=slug).first()
    if not c: return jsonify({"success": False, "error": "Not found"}), 404
    data = request.get_json() or {}
    _send_notification(c.id, data.get("type","alert"), data.get("title","eLogix Notification"), data.get("message",""), data.get("priority","normal"))
    return jsonify({"success": True, "message": "Notification sent"})


# ── Broadcast to ALL companies (e.g. maintenance) ─────────────
@elogix_admin_bp.post("/notify-all")
@require_elogix_admin()
def notify_all():
    from ..saas.models import Company
    data     = request.get_json() or {}
    companies= db.session.query(Company).filter(Company.status.in_(("active","trial"))).all()
    for c in companies:
        _send_notification(c.id, data.get("type","alert"), data.get("title"), data.get("message"), data.get("priority","normal"))
    return jsonify({"success": True, "sent_to": len(companies)})


# ── eLogix admin user management ─────────────────────────────
@elogix_admin_bp.get("/admins")
@require_elogix_admin("elogix_superadmin")
def list_admins():
    from ..saas.models import ELogixAdmin
    admins = db.session.query(ELogixAdmin).all()
    return jsonify({"success": True, "admins": [a.to_dict() for a in admins]})


# ── Helper ────────────────────────────────────────────────────
def _send_notification(company_id, ntype, title, message, priority="normal"):
    from ..saas.models import Notification
    try:
        db.session.add(Notification(
            company_id=company_id, type=ntype, title=title,
            message=message, priority=priority, sent_at=_now()
        ))
        db.session.commit()
    except Exception: pass
