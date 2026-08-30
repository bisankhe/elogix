"""
FILE: backend/routes/payroll_information_routes.py
eLogix HRMS — Workforce Operations > Payroll & Compensation > Information
Module (3 pages)
URL prefix: /api/v1/payroll-information

  1. /ssf   — Social Security Fund (employee-facing deposit ledger)
  2. /cit       — Citizen Investment Trust (voluntary investment ledger)
  3. /tax           — TAX (TDS deposit ledger, FY2083/84 slabs)

All three answer the brief's exact questions: how much deposited, who
contributed (employee vs employer split), what amount on each topic --
and all surface directly in Employee Self-Service.

Nepal Contribution-Based Social Security Act 2074: SSF 11%+20% (31%
total); late deposit recovers with 10% interest; CIT voluntary 1-10%,
deductible up to 1/3 income or NPR 500,000; TDS due to IRD by 25th,
requires valid PAN.
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

payroll_info_bp = Blueprint("payroll_information", __name__, url_prefix="/api/v1/payroll-information")


# ════════════════════════════════════════════════════════════════
# 1. SOCIAL SECURITY FUND (SSF)
# ════════════════════════════════════════════════════════════════

@payroll_info_bp.get("/ssf/summary")
@require_auth
@require_role("super_admin", "hr_manager")
def ssf_summary():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_ssf_employee_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "employees": data,
            "total_this_month_npr": sum(float(r["accrued_balance_npr"] or 0) for r in data),
        })
    except Exception:
        return success({"employees": [], "total_this_month_npr": 0})


@payroll_info_bp.get("/ssf/my-deposits/<employee_id>")
def my_ssf_deposits(employee_id):
    """Public/ESS — answers exactly: how much deposited, who contributed, on each topic."""
    try:
        summary = db.session.execute(text(
            "SELECT * FROM v_ssf_employee_summary WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()

        history = db.session.execute(text("""
            SELECT sdl.* FROM ssf_deposit_ledger sdl
            JOIN ssf_enrollments se ON sdl.ssf_enrollment_id = se.id
            WHERE se.employee_id = :eid ORDER BY sdl.pay_period DESC
        """), {"eid": employee_id}).fetchall()

        return success({
            "summary": dict(summary._mapping) if summary else None,
            "deposit_history": [dict(h._mapping) for h in history],
        })
    except Exception as e:
        return error(str(e), 500)


@payroll_info_bp.post("/ssf/enroll")
@require_auth
@require_role("super_admin", "hr_manager")
def enroll_ssf():
    body = request.get_json() or {}
    required = ["employee_id", "ssf_number", "enrollment_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO ssf_enrollments (company_id, employee_id, ssf_number, enrollment_date, created_at)
            VALUES (:cid, :eid, :ssf_no, :edate, NOW()) RETURNING id
        """), {"cid": g.company_id, "eid": body["employee_id"], "ssf_no": body["ssf_number"], "edate": body["enrollment_date"]})
        enrollment_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"enrollment_id": enrollment_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_info_bp.post("/ssf/deposits")
@require_auth
@require_role("super_admin", "hr_manager")
def record_ssf_deposit():
    """DB trigger auto-flags late deposits and applies 10% interest penalty."""
    body = request.get_json() or {}
    required = ["ssf_enrollment_id", "pay_period", "basic_salary_npr"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        enrollment = db.session.execute(text(
            "SELECT employee_contribution_pct, employer_contribution_pct FROM ssf_enrollments WHERE id = :eid"
        ), {"eid": body["ssf_enrollment_id"]}).fetchone()
        basic = float(body["basic_salary_npr"])
        employee_contrib = round(basic * float(enrollment.employee_contribution_pct) / 100, 2)
        employer_contrib = round(basic * float(enrollment.employer_contribution_pct) / 100, 2)

        result = db.session.execute(text("""
            INSERT INTO ssf_deposit_ledger
              (company_id, ssf_enrollment_id, payslip_id, pay_period, basic_salary_npr,
               employee_contrib_npr, employer_contrib_npr, deposit_date, created_at)
            VALUES
              (:cid, :enroll_id, :pid, :period, :basic,
               :emp_contrib, :empr_contrib, :ddate, NOW())
            ON CONFLICT (ssf_enrollment_id, pay_period) DO NOTHING
            RETURNING id, deposit_status, interest_penalty_npr
        """), {
            "cid": g.company_id, "enroll_id": body["ssf_enrollment_id"], "pid": body.get("payslip_id"),
            "period": body["pay_period"], "basic": basic, "emp_contrib": employee_contrib,
            "empr_contrib": employer_contrib, "ddate": body.get("deposit_date"),
        })
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Deposit already recorded for this period."})
        return created({"deposit_id": str(row[0]), "deposit_status": row[1], "interest_penalty_npr": float(row[2])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_info_bp.get("/ssf/pending-deposits")
@require_auth
@require_role("super_admin", "hr_manager")
def ssf_pending_deposits():
    """Feeds the automatic-reminder workflow for delayed SSF deposits."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_ssf_pending_deposits WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 2. CITIZEN INVESTMENT TRUST (CIT)
# ════════════════════════════════════════════════════════════════

@payroll_info_bp.get("/cit/summary")
@require_auth
@require_role("super_admin", "hr_manager")
def cit_summary():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_cit_employee_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_info_bp.get("/cit/my-deposits/<employee_id>")
def my_cit_deposits(employee_id):
    """Public/ESS."""
    try:
        summary = db.session.execute(text(
            "SELECT * FROM v_cit_employee_summary WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()

        history = db.session.execute(text("""
            SELECT cdl.* FROM cit_deposit_ledger cdl
            JOIN cit_enrollments ce ON cdl.cit_enrollment_id = ce.id
            WHERE ce.employee_id = :eid ORDER BY cdl.pay_period DESC
        """), {"eid": employee_id}).fetchall()

        loans = db.session.execute(text("""
            SELECT cl.* FROM cit_loans cl
            JOIN cit_enrollments ce ON cl.cit_enrollment_id = ce.id
            WHERE ce.employee_id = :eid
        """), {"eid": employee_id}).fetchall()

        return success({
            "summary": dict(summary._mapping) if summary else None,
            "deposit_history": [dict(h._mapping) for h in history],
            "loans": [dict(l._mapping) for l in loans],
        })
    except Exception as e:
        return error(str(e), 500)


@payroll_info_bp.post("/cit/enroll")
def enroll_cit():
    """Public/ESS — employee voluntarily enrolls and selects their own contribution rate (1-10%)."""
    body = request.get_json() or {}
    required = ["employee_id", "cit_account_no", "contribution_pct", "enrollment_date"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if not (0 <= body["contribution_pct"] <= 10):
        return error("contribution_pct must be between 0 and 10.", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO cit_enrollments (company_id, employee_id, cit_account_no, contribution_pct, enrollment_date, created_at)
            VALUES (:cid, :eid, :acct, :pct, :edate, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "acct": body["cit_account_no"],
               "pct": body["contribution_pct"], "edate": body["enrollment_date"]})
        enrollment_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"enrollment_id": enrollment_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_info_bp.post("/cit/deposits")
@require_auth
@require_role("super_admin", "hr_manager")
def record_cit_deposit():
    """DB trigger auto-computes tax_exempt_eligible_npr = min(1/3 income, NPR 500k, contribution)."""
    body = request.get_json() or {}
    required = ["cit_enrollment_id", "pay_period", "salary_basis_npr", "contribution_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO cit_deposit_ledger
              (company_id, cit_enrollment_id, payslip_id, pay_period, salary_basis_npr,
               contribution_npr, annual_income_npr_at_deposit, deposit_date, created_at)
            VALUES
              (:cid, :enroll_id, :pid, :period, :salary,
               :contrib, :annual_income, :ddate, NOW())
            ON CONFLICT (cit_enrollment_id, pay_period) DO NOTHING
            RETURNING id, tax_exempt_eligible_npr, exceeds_exempt_cap
        """), {
            "cid": g.company_id, "enroll_id": body["cit_enrollment_id"], "pid": body.get("payslip_id"),
            "period": body["pay_period"], "salary": body["salary_basis_npr"], "contrib": body["contribution_npr"],
            "annual_income": body.get("annual_income_npr_at_deposit"), "ddate": body.get("deposit_date"),
        })
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Deposit already recorded for this period."})
        return created({"deposit_id": str(row[0]), "tax_exempt_eligible_npr": float(row[1]) if row[1] else None, "exceeds_exempt_cap": row[2]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_info_bp.post("/cit/loans")
def request_cit_loan():
    """Public/ESS — request a loan against the accumulated CIT fund."""
    body = request.get_json() or {}
    required = ["cit_enrollment_id", "loan_purpose", "principal_npr"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO cit_loans (cit_enrollment_id, company_id, loan_purpose, principal_npr, outstanding_npr, created_at)
            VALUES (:enroll_id, :cid, :purpose, :principal, :principal, NOW())
            RETURNING id
        """), {"enroll_id": body["cit_enrollment_id"], "cid": body.get("company_id"),
               "purpose": body["loan_purpose"], "principal": body["principal_npr"]})
        loan_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"loan_id": loan_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. TAX
# ════════════════════════════════════════════════════════════════

@payroll_info_bp.get("/tax/summary")
@require_auth
@require_role("super_admin", "hr_manager")
def tax_summary():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_tax_employee_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "employees": data,
            "ytd_total_npr": sum(float(r["ytd_tax_paid_npr"] or 0) for r in data),
            "blocked_count": sum(1 for r in data if r["has_blocked_deposit"]),
        })
    except Exception:
        return success({"employees": [], "ytd_total_npr": 0, "blocked_count": 0})


@payroll_info_bp.get("/tax/my-summary/<employee_id>")
def my_tax_summary(employee_id):
    """Public/ESS — YTD taxable income widget."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_tax_employee_summary WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()

        history = db.session.execute(text(
            "SELECT * FROM tax_deposit_ledger WHERE employee_id = :eid ORDER BY pay_period DESC"
        ), {"eid": employee_id}).fetchall()

        return success({
            "summary": dict(row._mapping) if row else None,
            "deposit_history": [dict(h._mapping) for h in history],
        })
    except Exception as e:
        return error(str(e), 500)


@payroll_info_bp.post("/tax/deposits")
@require_auth
@require_role("super_admin", "hr_manager")
def record_tax_deposit():
    """DB trigger blocks (sets status to blocked_missing_pan) if no PAN is on file."""
    body = request.get_json() or {}
    required = ["employee_id", "pay_period", "annual_gross_npr", "tds_amount_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO tax_deposit_ledger
              (company_id, employee_id, payslip_id, pay_period, pan_number, annual_gross_npr,
               ssf_deduction_npr, cit_deduction_npr, insurance_deduction_npr, tds_amount_npr,
               effective_rate_pct, deposit_date, created_at)
            VALUES
              (:cid, :eid, :pid, :period, :pan, :gross,
               :ssf_ded, :cit_ded, :ins_ded, :tds,
               :rate, :ddate, NOW())
            ON CONFLICT (employee_id, pay_period) DO NOTHING
            RETURNING id, deposit_status
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "pid": body.get("payslip_id"), "period": body["pay_period"],
            "pan": body.get("pan_number"), "gross": body["annual_gross_npr"], "ssf_ded": body.get("ssf_deduction_npr", 0),
            "cit_ded": body.get("cit_deduction_npr", 0), "ins_ded": body.get("insurance_deduction_npr", 0),
            "tds": body["tds_amount_npr"], "rate": body.get("effective_rate_pct"), "ddate": body.get("deposit_date"),
        })
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Deposit already recorded for this period."})
        return created({
            "deposit_id": str(row[0]), "deposit_status": row[1],
            "warning": "PAN missing -- TDS deposit blocked." if row[1] == "blocked_missing_pan" else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_info_bp.post("/tax/simulate")
def simulate_tax_information():
    """
    Public/ESS — interactive predictive simulator: how would adding to
    CIT/insurance change taxable income and take-home pay.
    """
    body = request.get_json() or {}
    if body.get("annual_gross_npr") is None: return error("annual_gross_npr required", 422)
    try:
        gross = float(body["annual_gross_npr"])
        proposed_cit = float(body.get("proposed_cit_npr", 0))
        proposed_insurance = float(body.get("proposed_insurance_npr", 0))
        existing_ssf = float(body.get("existing_ssf_npr", 0))

        deductions = min(existing_ssf + proposed_cit, gross / 3, 500000) + min(proposed_insurance, 40000)
        taxable = max(gross - deductions, 0)

        slabs = db.session.execute(text("""
            SELECT * FROM tax_slabs WHERE jurisdiction_code = 'NP' AND is_active ORDER BY slab_order
        """)).fetchall()

        total_tax, remaining = 0, taxable
        for slab in slabs:
            band_size = (float(slab.income_to_npr) - float(slab.income_from_npr)) if slab.income_to_npr else remaining
            taxable_in_band = min(remaining, band_size) if remaining > 0 else 0
            total_tax += taxable_in_band * float(slab.tax_rate_pct) / 100
            remaining -= taxable_in_band

        return success({
            "taxable_income_npr": round(taxable, 2), "total_tax_npr": round(total_tax, 2),
            "net_annual_income_npr": round(gross - total_tax, 2),
            "monthly_take_home_npr": round((gross - total_tax) / 12, 2),
        })
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@payroll_info_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    allowed = ["ssf", "cit", "tax"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"payroll_information_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"payroll_information_{module}_template.xlsx")
