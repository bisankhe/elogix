"""
FILE: backend/routes/vendor_billing_analytics_routes.py
NepHR Pro -- Reports, Analytics & BI > HR Analytics (2 pages: Vendor
Billing Report, Insource vs Outsource Cost Report)
URL prefix: /api/v1/vendor-billing-analytics

The ANALYTICS lens -- distinct from the EXISTING transactional/
execution vendor billing routes (rate enforcement, invoice generation,
payment processing). This blueprint never writes a billing
transaction; it reads vendor_master + vendor_employees_extended and
the new vendor_billing_rates/wage_step_in_deductions tables.

Nepal legal grounding: licensed-suppliers-only; core-vs-non-core
restriction; main-employer duty to step in on supplier nonpayment and
deduct from vendor billing; retroactive minimum-wage liability.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

vendor_billing_bp = Blueprint("vendor_billing_analytics", __name__, url_prefix="/api/v1/vendor-billing-analytics")


# ════════════════════════════════════════════════════════════════
# PAGE 1: VENDOR BILLING REPORT
# ════════════════════════════════════════════════════════════════

@vendor_billing_bp.get("/report")
@require_auth
@require_role("super_admin", "hr_manager")
def vendor_billing_report():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_vendor_billing_report WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@vendor_billing_bp.post("/billing-rates")
@require_auth
@require_role("super_admin", "hr_manager")
def set_billing_rate():
    """Records what the company is billed per head -- distinct from the worker's own wage."""
    body = request.get_json() or {}
    required = ["vendor_master_id", "billing_rate_npr_per_head"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO vendor_billing_rates (company_id, vendor_master_id, vendor_employee_id, department_id, billing_rate_npr_per_head, sla_score, effective_from)
            VALUES (:cid, :vendor, :vee, :dept, :rate, :sla, CURRENT_DATE) RETURNING id
        """), {"cid": g.company_id, "vendor": body["vendor_master_id"], "vee": body.get("vendor_employee_id"),
               "dept": body.get("department_id"), "rate": body["billing_rate_npr_per_head"], "sla": body.get("sla_score")})
        rate_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"billing_rate_id": rate_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_billing_bp.post("/wage-step-in")
@require_auth
@require_role("super_admin", "hr_manager")
def record_wage_step_in():
    """
    The legally required mechanism: company pays a vendor worker directly
    after supplier nonpayment, then deducts it from the next invoice.
    DB trigger notifies HR/Finance immediately.
    """
    body = request.get_json() or {}
    required = ["vendor_master_id", "vendor_employee_id", "reason", "amount_paid_directly_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO wage_step_in_deductions (company_id, vendor_master_id, vendor_employee_id, reason, amount_paid_directly_npr, paid_to_worker_at)
            VALUES (:cid, :vendor, :vee, :reason, :amount, NOW()) RETURNING id
        """), {"cid": g.company_id, "vendor": body["vendor_master_id"], "vee": body["vendor_employee_id"],
               "reason": body["reason"], "amount": body["amount_paid_directly_npr"]})
        deduction_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"deduction_id": deduction_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_billing_bp.put("/wage-step-in/<deduction_id>/apply")
@require_auth
@require_role("super_admin", "hr_manager")
def apply_step_in_deduction(deduction_id):
    """Marks the deduction as recovered against a specific vendor invoice/billing rate."""
    body = request.get_json() or {}
    if not body.get("vendor_billing_rate_id"): return error("vendor_billing_rate_id required", 422)
    try:
        db.session.execute(text("""
            UPDATE wage_step_in_deductions SET deduction_applied = TRUE, deducted_from_vendor_billing_rate_id = :rate_id
            WHERE id = :did AND company_id = :cid
        """), {"rate_id": body["vendor_billing_rate_id"], "did": deduction_id, "cid": g.company_id})
        db.session.commit()
        return success({"applied": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: INSOURCE VS OUTSOURCE COST REPORT
# ════════════════════════════════════════════════════════════════

@vendor_billing_bp.get("/insource-outsource-cost")
@require_auth
@require_role("super_admin", "hr_manager")
def insource_outsource_cost():
    try:
        outsource_rows = db.session.execute(text(
            "SELECT * FROM v_insource_outsource_cost WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        insource_rows = db.session.execute(text(
            "SELECT cost_category, SUM(amount_npr) AS total_npr FROM recruitment_budget_lines WHERE company_id = :cid GROUP BY cost_category"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "outsource_by_function": [dict(r._mapping) for r in outsource_rows],
            "insource_recruitment_costs": [dict(r._mapping) for r in insource_rows],
        })
    except Exception:
        return success({"outsource_by_function": [], "insource_recruitment_costs": []})
