"""
FILE: backend/routes/payroll_processing_routes.py
eLogix HRMS — Workforce Operations > Payroll & Compensation > Payroll
Processing Module (8 pages)
URL prefix: /api/v1/payroll-processing

  1. /runs                      — Automated Payroll (pipeline batches)
  2. /overtime-lines               — Overtime Calculation
  3. /bonuses                         — Bonus Processing
  4. /incentives                         — Incentive Processing
  5. /loans                                 — Loan Management
  6. /salary-advances                          — Advance Salary
  7. /compliance-alerts                           — Tax & Compliance
  8. /vendor-billing-match                           — Vendor Billing Payroll

Nepal Labour Act 2074 / Labour Rules 2075: OT 4hr/day-24hr/week at 1.5x;
loan eligibility cap 3 months basic; salary advance capped 50% of net pay;
festival allowance = 1 month basic/year (non-discretionary); deductions
capped 33% of gross; TDS due to IRD by 25th of following month.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

payroll_proc_bp = Blueprint("payroll_processing", __name__, url_prefix="/api/v1/payroll-processing")


# ════════════════════════════════════════════════════════════════
# 1. AUTOMATED PAYROLL
# ════════════════════════════════════════════════════════════════

@payroll_proc_bp.get("/runs")
@require_auth
@require_role("super_admin", "hr_manager")
def list_runs():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_payroll_run_pipeline WHERE company_id = :cid ORDER BY pay_period DESC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_proc_bp.post("/runs")
@require_auth
@require_role("super_admin", "hr_manager")
def create_run():
    body = request.get_json() or {}
    if not body.get("pay_period"): return error("pay_period required", 422)
    try:
        total = db.session.execute(text(
            "SELECT COUNT(*) FROM employees WHERE company_id = :cid AND employment_status = 'active'"
        ), {"cid": g.company_id}).fetchone()[0]

        result = db.session.execute(text("""
            INSERT INTO payroll_run_batches (company_id, pay_period, total_employees, started_at)
            VALUES (:cid, :period, :total, NOW())
            ON CONFLICT (company_id, pay_period) DO NOTHING
            RETURNING id
        """), {"cid": g.company_id, "period": body["pay_period"], "total": total})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Run already exists for this period."})
        return created({"run_id": str(row[0]), "total_employees": total})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_proc_bp.put("/runs/<run_id>/advance-stage")
@require_auth
@require_role("super_admin", "hr_manager")
def advance_stage(run_id):
    """Advances the pipeline stage. DB trigger blocks finalization if unresolved blocking alerts exist."""
    body = request.get_json() or {}
    if not body.get("stage"): return error("stage required", 422)
    try:
        db.session.execute(text("""
            UPDATE payroll_run_batches SET stage = :stage WHERE id = :rid AND company_id = :cid
        """), {"stage": body["stage"], "rid": run_id, "cid": g.company_id})
        db.session.commit()
        return success({"advanced": True, "stage": body["stage"]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


# ════════════════════════════════════════════════════════════════
# 2. OVERTIME CALCULATION
# ════════════════════════════════════════════════════════════════

@payroll_proc_bp.get("/overtime-lines")
@require_auth
@require_role("super_admin", "hr_manager")
def overtime_lines():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_overtime_calculation_batch WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({"lines": data, "exceeds_cap_count": sum(1 for r in data if r["exceeds_weekly_cap"])})
    except Exception:
        return success({"lines": [], "exceeds_cap_count": 0})


@payroll_proc_bp.post("/overtime-lines")
@require_auth
@require_role("super_admin", "hr_manager")
def create_overtime_line():
    body = request.get_json() or {}
    required = ["employee_id", "scheduled_hours", "worked_hours", "base_hourly_rate_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO overtime_payroll_lines
              (company_id, employee_id, payroll_run_batch_id, scheduled_hours, worked_hours,
               weekly_ot_used_hours, weekly_ot_cap_hours, base_hourly_rate_npr, created_at)
            VALUES
              (:cid, :eid, :rid, :sched, :worked,
               :weekly_used, :weekly_cap, :rate, NOW())
            RETURNING id, ot_hours, ot_amount_npr, exceeds_weekly_cap
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "rid": body.get("payroll_run_batch_id"),
            "sched": body["scheduled_hours"], "worked": body["worked_hours"], "weekly_used": body.get("weekly_ot_used_hours", 0),
            "weekly_cap": body.get("weekly_ot_cap_hours", 24), "rate": body["base_hourly_rate_npr"],
        })
        row = result.fetchone()
        db.session.commit()
        return created({"line_id": str(row[0]), "ot_hours": float(row[1]), "ot_amount_npr": float(row[2]), "exceeds_weekly_cap": row[3]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. BONUS PROCESSING
# ════════════════════════════════════════════════════════════════

@payroll_proc_bp.get("/bonuses")
@require_auth
@require_role("super_admin", "hr_manager")
def list_bonuses():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_bonus_processing_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_proc_bp.post("/bonuses")
@require_auth
@require_role("super_admin", "hr_manager")
def create_bonus():
    body = request.get_json() or {}
    required = ["employee_id", "bonus_type", "full_amount_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO bonus_payments
              (company_id, employee_id, payroll_run_batch_id, bonus_type, category,
               full_amount_npr, proration_pct, basis_note, is_statutory, created_at)
            VALUES
              (:cid, :eid, :rid, :btype, :category,
               :amount, :proration, :basis, :statutory, NOW())
            RETURNING id, prorated_amount_npr
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "rid": body.get("payroll_run_batch_id"),
            "btype": body["bonus_type"], "category": body.get("category", "discretionary"),
            "amount": body["full_amount_npr"], "proration": body.get("proration_pct", 100),
            "basis": body.get("basis_note"), "statutory": body.get("is_statutory", False),
        })
        row = result.fetchone()
        db.session.commit()
        return created({"bonus_id": str(row[0]), "prorated_amount_npr": float(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_proc_bp.put("/bonuses/<bonus_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_bonus(bonus_id):
    try:
        db.session.execute(text("""
            UPDATE bonus_payments SET status = 'approved', approved_by = :user WHERE id = :bid AND company_id = :cid
        """), {"user": g.user_id, "bid": bonus_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. INCENTIVE PROCESSING
# ════════════════════════════════════════════════════════════════

@payroll_proc_bp.get("/incentive-tiers")
@require_auth
def list_incentive_tiers():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM incentive_tiers WHERE company_id = :cid ORDER BY tier_order"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_proc_bp.get("/incentives")
@require_auth
@require_role("super_admin", "hr_manager")
def list_incentives():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_incentive_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_proc_bp.post("/incentives/calculate")
@require_auth
@require_role("super_admin", "hr_manager")
def calculate_incentive():
    """Matches sales amount against tiers and computes the incentive payout."""
    body = request.get_json() or {}
    required = ["employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        sales = float(body.get("sales_amount_npr", 0))
        tier = None
        incentive_amount = body.get("incentive_amount_npr")

        if sales > 0:
            tier = db.session.execute(text("""
                SELECT * FROM incentive_tiers WHERE company_id = :cid
                  AND sales_from_npr <= :sales AND (sales_to_npr IS NULL OR sales_to_npr >= :sales)
                ORDER BY tier_order DESC LIMIT 1
            """), {"cid": g.company_id, "sales": sales}).fetchone()
            if tier and incentive_amount is None:
                incentive_amount = round(sales * float(tier.incentive_rate_pct) / 100, 2)

        result = db.session.execute(text("""
            INSERT INTO incentive_payments
              (company_id, employee_id, payroll_run_batch_id, sales_amount_npr, kpi_metric_text,
               matched_tier_id, incentive_amount_npr, crm_synced, created_at)
            VALUES
              (:cid, :eid, :rid, :sales, :kpi,
               :tier_id, :amount, :synced, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "rid": body.get("payroll_run_batch_id"),
            "sales": sales, "kpi": body.get("kpi_metric_text"), "tier_id": tier.id if tier else None,
            "amount": incentive_amount or 0, "synced": body.get("crm_synced", False),
        })
        incentive_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"incentive_id": incentive_id, "tier_matched": tier.tier_label if tier else None, "incentive_amount_npr": incentive_amount})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 5. LOAN MANAGEMENT
# ════════════════════════════════════════════════════════════════

@payroll_proc_bp.get("/loans")
@require_auth
@require_role("super_admin", "hr_manager")
def list_loans():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_loan_management_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_proc_bp.post("/loans")
def request_loan():
    """Public/ESS — employee requests a loan. Eligibility cap auto-computed from basic salary."""
    body = request.get_json() or {}
    required = ["employee_id", "loan_type", "principal_npr", "tenure_months"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        emp = db.session.execute(text(
            "SELECT basic_salary_npr FROM employees WHERE id = :eid"
        ), {"eid": body["employee_id"]}).fetchone()
        basic = float(emp.basic_salary_npr) if emp and emp.basic_salary_npr else 0

        result = db.session.execute(text("""
            INSERT INTO employee_loans
              (company_id, employee_id, loan_type, principal_npr, interest_pct, tenure_months,
               basic_salary_at_request_npr, requested_at)
            VALUES
              (:cid, :eid, :ltype, :principal, :interest, :tenure,
               :basic, NOW())
            RETURNING id, max_eligible_npr, exceeds_eligibility_cap, emi_npr
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "ltype": body["loan_type"],
            "principal": body["principal_npr"], "interest": body.get("interest_pct", 0),
            "tenure": body["tenure_months"], "basic": basic,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "loan_id": str(row[0]), "max_eligible_npr": float(row[1]), "exceeds_eligibility_cap": row[2],
            "emi_npr": float(row[3]),
            "warning": "This exceeds the 3-month-basic eligibility cap." if row[2] else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_proc_bp.put("/loans/<loan_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_loan(loan_id):
    """Blocked by DB trigger if loan exceeds the 3-month-basic eligibility cap."""
    try:
        db.session.execute(text("""
            UPDATE employee_loans SET status = 'active', approved_by = :user WHERE id = :lid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "lid": loan_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


@payroll_proc_bp.post("/loans/<loan_id>/installments")
@require_auth
@require_role("super_admin", "hr_manager")
def post_installment(loan_id):
    """DB trigger auto-updates paid_installments/total_paid_npr and clears the loan if fully paid."""
    body = request.get_json() or {}
    required = ["pay_period", "amount_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO loan_installments (employee_loan_id, company_id, pay_period, amount_npr, deducted_at)
            VALUES (:lid, :cid, :period, :amount, NOW())
        """), {"lid": loan_id, "cid": g.company_id, "period": body["pay_period"], "amount": body["amount_npr"]})
        db.session.commit()
        return created({"installment_recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 6. ADVANCE SALARY
# ════════════════════════════════════════════════════════════════

@payroll_proc_bp.get("/salary-advances")
@require_auth
@require_role("super_admin", "hr_manager")
def list_salary_advances():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_salary_advance_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_proc_bp.post("/salary-advances")
def request_salary_advance():
    """Public/ESS — EWA-style draw against next payroll, capped at 50% of expected net pay."""
    body = request.get_json() or {}
    required = ["employee_id", "expected_net_pay_npr", "requested_npr", "reason"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO salary_advances (company_id, employee_id, expected_net_pay_npr, requested_npr, reason, created_at)
            VALUES (:cid, :eid, :net_pay, :requested, :reason, NOW())
            RETURNING id, max_allowed_npr, exceeds_cap
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "net_pay": body["expected_net_pay_npr"],
            "requested": body["requested_npr"], "reason": body["reason"],
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "advance_id": str(row[0]), "max_allowed_npr": float(row[1]), "exceeds_cap": row[2],
            "warning": "Requested amount exceeds the 50% cap of expected net pay." if row[2] else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_proc_bp.put("/salary-advances/<advance_id>/disburse")
@require_auth
@require_role("super_admin", "hr_manager")
def disburse_advance(advance_id):
    """Blocked by DB trigger if the request exceeds the 50% cap."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE salary_advances
               SET status = 'disbursed', deduction_pay_period = :next_period, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid AND status = 'pending'
        """), {"next_period": body.get("deduction_pay_period"), "aid": advance_id, "cid": g.company_id})
        db.session.commit()
        return success({"disbursed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


@payroll_proc_bp.put("/salary-advances/<advance_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager")
def reject_advance(advance_id):
    body = request.get_json() or {}
    if not body.get("rejection_reason"): return error("rejection_reason required", 422)
    try:
        db.session.execute(text("""
            UPDATE salary_advances SET status = 'rejected', rejection_reason = :reason, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid AND status = 'pending'
        """), {"reason": body["rejection_reason"], "aid": advance_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 7. TAX & COMPLIANCE
# ════════════════════════════════════════════════════════════════

@payroll_proc_bp.get("/compliance-alerts")
@require_auth
@require_role("super_admin", "hr_manager")
def list_compliance_alerts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_compliance_alerts_active WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_proc_bp.put("/compliance-alerts/<alert_id>/resolve")
@require_auth
@require_role("super_admin", "hr_manager")
def resolve_alert(alert_id):
    try:
        db.session.execute(text("""
            UPDATE compliance_alerts SET resolved = TRUE, resolved_at = NOW() WHERE id = :aid AND company_id = :cid
        """), {"aid": alert_id, "cid": g.company_id})
        db.session.commit()
        return success({"resolved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_proc_bp.post("/compliance-alerts/ai-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_compliance_scan():
    """AI scans for anomalies (expiring docs, missing PAN, deduction-cap breaches) before paychecks process."""
    try:
        insight = generate_ai_insights({"type": "payroll_compliance_realtime_scan", "company_id": g.company_id})
        flags = insight.get("alerts", [])
        for f in flags:
            db.session.execute(text("""
                INSERT INTO compliance_alerts (company_id, employee_id, alert_type, severity, detail_note, blocks_payroll, created_at)
                VALUES (:cid, :eid, :atype, :severity, :note, :blocks, NOW())
            """), {"cid": g.company_id, "eid": f.get("employee_id"), "atype": f.get("alert_type"),
                   "severity": f.get("severity", "medium"), "note": f.get("detail_note"), "blocks": f.get("blocks_payroll", False)})
        db.session.commit()
        return success({"alerts_created": len(flags)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 8. VENDOR BILLING PAYROLL
# ════════════════════════════════════════════════════════════════

@payroll_proc_bp.get("/vendor-billing-match")
@require_auth
@require_role("super_admin", "hr_manager")
def vendor_billing_match():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_vendor_billing_3way_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_proc_bp.post("/vendor-billing-match")
@require_auth
@require_role("super_admin", "hr_manager")
def create_3way_match():
    """DB trigger auto-classifies match_status based on rate comparison + delivery verification."""
    body = request.get_json() or {}
    required = ["vendor_billing_record_id", "contract_rate_npr", "billed_rate_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO vendor_billing_3way_match
              (vendor_billing_record_id, company_id, contract_rate_npr, billed_rate_npr, delivery_log_verified, checked_at)
            VALUES
              (:vbr_id, :cid, :contract_rate, :billed_rate, :delivery_verified, NOW())
            RETURNING id, match_status, discrepancy_note
        """), {
            "vbr_id": body["vendor_billing_record_id"], "cid": g.company_id, "contract_rate": body["contract_rate_npr"],
            "billed_rate": body["billed_rate_npr"], "delivery_verified": body.get("delivery_log_verified", False),
        })
        row = result.fetchone()
        db.session.commit()
        return created({"match_id": str(row[0]), "match_status": row[1], "discrepancy_note": row[2]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_proc_bp.put("/vendor-billing-match/<match_id>/schedule-payout")
@require_auth
@require_role("super_admin", "hr_manager")
def schedule_payout(match_id):
    """Blocked if match_status is 'discrepancy' -- must reconcile first."""
    try:
        row = db.session.execute(text(
            "SELECT match_status FROM vendor_billing_3way_match WHERE id = :mid AND company_id = :cid"
        ), {"mid": match_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Vendor billing match record")
        if row.match_status == "discrepancy":
            return error("Cannot schedule payout: 3-way match discrepancy must be reconciled first.", 422)

        db.session.execute(text("""
            UPDATE vendor_billing_3way_match SET payout_scheduled = TRUE WHERE id = :mid
        """), {"mid": match_id})
        db.session.commit()
        return success({"payout_scheduled": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@payroll_proc_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["overtime-lines", "bonuses", "incentives", "loans"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"payroll_processing_{module}")
    return jsonify(result), 200 if result["success"] else 422


@payroll_proc_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"payroll_processing_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"payroll_processing_{module}_template.xlsx")
