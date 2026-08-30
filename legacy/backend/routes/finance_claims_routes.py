"""
FILE: backend/routes/finance_claims_routes.py
eLogix HRMS -- Finance, Assets & Administration > Finance & Claims
(6 pages: Expense Claims, Travel Request, Reimbursement, Petty Cash
Claim, Mobile & Fuel Claim, Approval Workflow)
URL prefix: /api/v1/finance-claims

Travel Request reuses the EXISTING /api/v1/admin-ops/travel*
endpoints verbatim -- no routes duplicated here. Reimbursement and
Approval Workflow are pure rollup reads with no write endpoints of
their own.

Nepal legal grounding: 14-day expense submission deadline; petty cash
per-transaction limits per internal Finance Manual; mobile/fuel
allowances as contractual perks, never a minimum-wage substitute;
formal dispute path (15-day negotiation, 21-day Labour Office) for
unpaid valid claims.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

finance_bp = Blueprint("finance_claims", __name__, url_prefix="/api/v1/finance-claims")


# ════════════════════════════════════════════════════════════════
# PAGE 1: EXPENSE CLAIMS
# ════════════════════════════════════════════════════════════════

@finance_bp.get("/expenses")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_expense_claims():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_expense_claims_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@finance_bp.post("/expenses/ocr-scan")
def ocr_scan_receipt():
    """Public/ESS -- AI OCR extracts merchant/date/amount from the receipt photo before the form is even filled."""
    body = request.get_json() or {}
    if not body.get("receipt_image_url"): return error("receipt_image_url required", 422)
    try:
        insight = generate_ai_insights({"type": "ocr_receipt_extraction", "image_url": body["receipt_image_url"]})
        return success({"extracted": insight.get("extracted_data", {})})
    except Exception as e:
        return error(str(e), 500)


@finance_bp.post("/expenses")
def submit_expense_claim():
    """DB trigger notifies HR if the 14-day submission window is exceeded."""
    body = request.get_json() or {}
    required = ["employee_id", "category", "expense_date", "amount_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO expense_claims (company_id, employee_id, category, merchant_name, expense_date, amount_npr, receipt_image_url, ocr_extracted_data, submitted_at)
            VALUES (:cid, :eid, :cat, :merchant, :date, :amount, :receipt, :ocr, NOW())
            RETURNING id, exceeds_submission_window
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "cat": body["category"], "merchant": body.get("merchant_name"),
               "date": body["expense_date"], "amount": body["amount_npr"], "receipt": body.get("receipt_image_url"), "ocr": body.get("ocr_extracted_data")})
        row = result.fetchone()
        db.session.commit()
        return created({"claim_id": str(row[0]), "exceeds_submission_window": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@finance_bp.put("/expenses/<claim_id>/advance-stage")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def advance_expense_stage(claim_id):
    body = request.get_json() or {}
    if not body.get("next_stage"): return error("next_stage required", 422)
    try:
        is_paid = body["next_stage"] == "paid"
        db.session.execute(text("""
            UPDATE expense_claims SET approval_stage = :stage, paid_at = CASE WHEN :paid THEN NOW() ELSE paid_at END
            WHERE id = :cid_claim AND company_id = :cid
        """), {"stage": body["next_stage"], "paid": is_paid, "cid_claim": claim_id, "cid": g.company_id})
        db.session.commit()
        return success({"advanced": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# PAGE 2 (Travel Request): intentionally NO routes here -- reuses the
# EXISTING /api/v1/admin-ops/travel* endpoints (Administrative
# Operations session) verbatim.


# ════════════════════════════════════════════════════════════════
# PAGE 3: REIMBURSEMENT (pure rollup, no write endpoints)
# ════════════════════════════════════════════════════════════════

@finance_bp.get("/reimbursements")
@require_auth
@require_role("super_admin", "hr_manager")
def reimbursement_ledger():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_reimbursement_ledger WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 4: PETTY CASH CLAIM
# ════════════════════════════════════════════════════════════════

@finance_bp.get("/petty-cash/branches")
@require_auth
@require_role("super_admin", "hr_manager")
def petty_cash_branches():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_petty_cash_branch_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@finance_bp.post("/petty-cash/claims")
def file_petty_cash_claim():
    """DB trigger auto-checks the per-transaction limit and forces Finance Head review if exceeded."""
    body = request.get_json() or {}
    required = ["petty_cash_branch_ledger_id", "claimed_by_employee_id", "item_description", "amount_npr"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO petty_cash_claims (company_id, petty_cash_branch_ledger_id, claimed_by_employee_id, item_description, amount_npr, claimed_at)
            VALUES (:cid, :ledger, :claimant, :desc, :amount, NOW()) RETURNING id, exceeds_per_transaction_limit
        """), {"cid": body.get("company_id"), "ledger": body["petty_cash_branch_ledger_id"], "claimant": body["claimed_by_employee_id"],
               "desc": body["item_description"], "amount": body["amount_npr"]})
        row = result.fetchone()
        db.session.commit()
        return created({"claim_id": str(row[0]), "exceeds_limit": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@finance_bp.put("/petty-cash/branches/<ledger_id>/replenish")
@require_auth
@require_role("super_admin", "hr_manager")
def replenish_branch_float(ledger_id):
    body = request.get_json() or {}
    if body.get("new_float_amount_npr") is None: return error("new_float_amount_npr required", 422)
    try:
        db.session.execute(text("""
            UPDATE petty_cash_branch_ledgers SET float_amount_npr = :amount WHERE id = :lid AND company_id = :cid
        """), {"amount": body["new_float_amount_npr"], "lid": ledger_id, "cid": g.company_id})
        db.session.commit()
        return success({"replenished": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 5: MOBILE & FUEL CLAIM
# ════════════════════════════════════════════════════════════════

@finance_bp.get("/mobile-fuel")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def mobile_fuel_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_mobile_fuel_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@finance_bp.post("/mobile-fuel")
def submit_mobile_fuel_claim():
    """DB trigger forces manager_justification_required if the monthly cap is exceeded."""
    body = request.get_json() or {}
    required = ["employee_id", "claim_type", "claim_month", "amount_npr", "monthly_cap_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO mobile_fuel_claims (company_id, employee_id, claim_type, claim_month, amount_npr, monthly_cap_npr, business_use_justification, submitted_at)
            VALUES (:cid, :eid, :type, :month, :amount, :cap, :justification, NOW())
            ON CONFLICT (employee_id, claim_type, claim_month) DO UPDATE SET amount_npr = EXCLUDED.amount_npr
            RETURNING id, exceeds_cap
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "type": body["claim_type"], "month": body["claim_month"],
               "amount": body["amount_npr"], "cap": body["monthly_cap_npr"], "justification": body.get("business_use_justification")})
        row = result.fetchone()
        db.session.commit()
        return created({"claim_id": str(row[0]), "exceeds_cap": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 6: APPROVAL WORKFLOW (claims-specific chain visualization)
# ════════════════════════════════════════════════════════════════

@finance_bp.get("/approval-workflow")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_workflow_chain():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_approval_workflow_chain WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@finance_bp.post("/approval-workflow/run-escalation-check")
@require_auth
@require_role("super_admin", "hr_manager")
def run_escalation_check():
    """Triggers the scheduled stalled-claim escalation manually (normally run as a cron job)."""
    try:
        db.session.execute(text("SELECT fn_auto_escalate_stalled_claims()"))
        db.session.commit()
        return success({"escalation_check_run": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@finance_bp.post("/excel-import/<module>")
@require_auth
@require_role("super_admin", "hr_manager")
def excel_import(module):
    allowed = ["expenses", "petty-cash", "mobile-fuel"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"finance_{module}")
    return jsonify(result), 200 if result["success"] else 422


@finance_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"finance_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"finance_{module}_template.xlsx")
