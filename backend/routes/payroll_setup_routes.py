"""
FILE: backend/routes/payroll_setup_routes.py
eLogix HRMS — Workforce Operations > Payroll & Compensation > Payroll Setup (10 pages)
URL prefix: /api/v1/payroll-setup

  1.  /pay-groups                — Payroll Setup (groups, absence redistribution)
  2.  /salary-structures             — Salary Structure (component tree, 60% basic floor)
  3.  /overtime-batch                    — Overtime Payroll
  4.  /insource-register                    — Insource Payroll
  5.  /outsource-compliance                     — Outsource Payroll (min-wage check)
  6.  /vendor-billing                              — Vendor Billing Payroll (reuses vendor_billing_records)
  7.  /tax-slabs                                       — Tax Setup (FY2083/84 reform)
  8.  /allowances                                          — Allowance
  9.  /deductions, /cash-advances                              — Deduction
  10. /compliance-deadlines, /compliance-health                    — Compliance Setup

Nepal Labour Act 2074 / Labour Rules 2075: Basic Salary >=60% of gross
(Rule 77); minimum wage NPR 19,550/month; OT capped 4hr/day-24hr/week at
1.5x; festival allowance = 1 month basic/year; deductions capped at 33%
of gross; SSF employer 20% / employee 11% of basic; annual Labour Audit
due by mid-January (end of Poush). FY2083/84 tax reform effective
Shrawan 1, 2083 (mid-July 2026): 5 slabs, 1%-29%, NPR 10,00,000 threshold.
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

payroll_setup_bp = Blueprint("payroll_setup", __name__, url_prefix="/api/v1/payroll-setup")

MIN_WAGE_NPR = 19550
BASIC_FLOOR_PCT = 60
MAX_DEDUCTION_PCT = 33


# ════════════════════════════════════════════════════════════════
# 1. PAYROLL SETUP (pay groups + absence redistribution)
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/pay-groups")
@require_auth
def list_pay_groups():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM pay_groups WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_setup_bp.post("/pay-groups")
@require_auth
@require_role("super_admin", "hr_manager")
def create_pay_group():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO pay_groups (company_id, name, pay_frequency, created_at)
            VALUES (:cid, :name, :freq, NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["name"], "freq": body.get("pay_frequency", "monthly")})
        gid = str(result.fetchone()[0])
        db.session.commit()
        return created({"pay_group_id": gid})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_setup_bp.post("/absence-redistribution")
@require_auth
@require_role("super_admin", "hr_manager")
def redistribute_absent_salary():
    """
    Brief's distinctive feature: an absent employee's basic salary for
    the period is redistributed among the rest of their team, weighted
    by salary level and grade.
    """
    body = request.get_json() or {}
    required = ["absent_employee_id", "pay_period", "absent_days", "redistributed_basic_npr", "team_member_ids"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        log_result = db.session.execute(text("""
            INSERT INTO absence_redistribution_log (company_id, pay_period, absent_employee_id, absent_days, redistributed_basic_npr, created_at)
            VALUES (:cid, :period, :absent_id, :days, :amount, NOW())
            RETURNING id
        """), {"cid": g.company_id, "period": body["pay_period"], "absent_id": body["absent_employee_id"],
               "days": body["absent_days"], "amount": body["redistributed_basic_npr"]})
        log_id = log_result.fetchone()[0]

        # Compute weighted shares by salary x grade level for each team member
        members = db.session.execute(text("""
            SELECT id, basic_salary_npr, grade_level FROM employees WHERE id = ANY(:ids)
        """), {"ids": body["team_member_ids"]}).fetchall()

        total_weight = sum(float(m.basic_salary_npr or 0) * float(m.grade_level or 1) for m in members) or 1
        shares = []
        for m in members:
            weight = float(m.basic_salary_npr or 0) * float(m.grade_level or 1)
            share_pct = round(weight / total_weight * 100, 2)
            share_amount = round(float(body["redistributed_basic_npr"]) * weight / total_weight, 2)
            db.session.execute(text("""
                INSERT INTO absence_redistribution_shares
                  (absence_redistribution_log_id, receiving_employee_id, weight_basis, share_pct, share_amount_npr, created_at)
                VALUES (:lid, :eid, 'salary_and_grade', :pct, :amount, NOW())
            """), {"lid": log_id, "eid": m.id, "pct": share_pct, "amount": share_amount})
            shares.append({"employee_id": str(m.id), "share_pct": share_pct, "share_amount_npr": share_amount})

        db.session.commit()
        return created({"redistribution_log_id": str(log_id), "shares": shares})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. SALARY STRUCTURE
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/salary-structures")
@require_auth
def list_salary_structures():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM salary_structures WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_setup_bp.post("/salary-structures")
@require_auth
@require_role("super_admin", "hr_manager")
def create_salary_structure():
    """DB CHECK constraint blocks basic_pct < 60 -- Rule 77 enforced at schema level."""
    body = request.get_json() or {}
    required = ["name", "basic_pct"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if body["basic_pct"] < BASIC_FLOOR_PCT:
        return error(f"Basic salary must be at least {BASIC_FLOOR_PCT}% of gross per Nepal Labour Rules 2075 Rule 77.", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO salary_structures (company_id, name, basic_pct, created_at)
            VALUES (:cid, :name, :basic_pct, NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["name"], "basic_pct": body["basic_pct"]})
        sid = str(result.fetchone()[0])
        db.session.commit()
        return created({"structure_id": sid})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_setup_bp.post("/salary-structures/<structure_id>/components")
@require_auth
@require_role("super_admin", "hr_manager")
def add_structure_component(structure_id):
    """Drag-drop component tree: add a Basic/HRA/Allowance line to a structure."""
    body = request.get_json() or {}
    required = ["component_name", "component_type", "calc_method"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO salary_structure_components
              (salary_structure_id, company_id, component_name, component_type, calc_method, calc_value, created_at)
            VALUES (:sid, :cid, :name, :ctype, :method, :value, NOW())
            RETURNING id
        """), {"sid": structure_id, "cid": g.company_id, "name": body["component_name"],
               "ctype": body["component_type"], "method": body["calc_method"], "value": body.get("calc_value")})
        comp_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"component_id": comp_id})
    except Exception as e:
        db.session.rollback()
        return error(
            str(e) if "60%" not in str(e) else
            "Adding this component would push Basic Salary below the 60% statutory floor per Rule 77.",
            422
        )


# ════════════════════════════════════════════════════════════════
# 3. OVERTIME PAYROLL
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/overtime-batch")
@require_auth
@require_role("super_admin", "hr_manager")
def overtime_payroll_batch():
    """Calendar-view variance: scheduled vs worked hours, OT premium calc."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_overtime_payroll_batch WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 4. INSOURCE PAYROLL
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/insource-register")
@require_auth
@require_role("super_admin", "hr_manager")
def insource_payroll_register():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_insource_payroll_register WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 5. OUTSOURCE PAYROLL
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/outsource-compliance")
@require_auth
@require_role("super_admin", "hr_manager")
def outsource_payroll_compliance():
    """Min-wage compliance check for vendor-supplied staff -- primary employer liability."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_outsource_payroll_compliance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "records": data,
            "non_compliant_count": sum(1 for r in data if not r["min_wage_compliant"]),
        })
    except Exception:
        return success({"records": [], "non_compliant_count": 0})


# ════════════════════════════════════════════════════════════════
# 6. VENDOR BILLING PAYROLL (reuses vendor_billing_records directly)
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/vendor-billing")
@require_auth
@require_role("super_admin", "hr_manager")
def vendor_billing_payroll():
    try:
        rows = db.session.execute(text("""
            SELECT vbr.*, v.name AS vendor_name
            FROM vendor_billing_records vbr
            JOIN vendors v ON vbr.vendor_id = v.id
            WHERE vbr.company_id = :cid ORDER BY vbr.created_at DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 7. TAX SETUP (FY2083/84 reform)
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/tax-slabs")
def list_tax_slabs():
    """Public — jurisdiction + fiscal-year filterable slab table."""
    jurisdiction = request.args.get("jurisdiction_code", "NP")
    fiscal_year = request.args.get("fiscal_year_label")
    try:
        q = "SELECT * FROM v_active_tax_slabs WHERE jurisdiction_code = :jcode"
        params = {"jcode": jurisdiction}
        if fiscal_year: q += " AND fiscal_year_label = :fy"; params["fy"] = fiscal_year
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_setup_bp.post("/tax-simulate")
def simulate_tax():
    """
    Public/ESS — tax simulation tool: employee enters gross income,
    sees take-home pay under current slabs (progressive calculation).
    """
    body = request.get_json() or {}
    if body.get("annual_taxable_income_npr") is None:
        return error("annual_taxable_income_npr required", 422)

    income = float(body["annual_taxable_income_npr"])
    jurisdiction = body.get("jurisdiction_code", "NP")
    fiscal_year = body.get("fiscal_year_label", "2083/84")

    try:
        slabs = db.session.execute(text("""
            SELECT * FROM tax_slabs
            WHERE jurisdiction_code = :jcode AND fiscal_year_label = :fy AND is_active
            ORDER BY slab_order
        """), {"jcode": jurisdiction, "fy": fiscal_year}).fetchall()

        total_tax = 0
        breakdown = []
        remaining = income
        for slab in slabs:
            band_size = (float(slab.income_to_npr) - float(slab.income_from_npr)) if slab.income_to_npr else remaining
            taxable_in_band = min(remaining, band_size) if remaining > 0 else 0
            if taxable_in_band <= 0:
                continue
            band_tax = round(taxable_in_band * float(slab.tax_rate_pct) / 100, 2)
            total_tax += band_tax
            breakdown.append({
                "slab_order": slab.slab_order, "rate_pct": float(slab.tax_rate_pct),
                "taxable_in_band_npr": round(taxable_in_band, 2), "tax_in_band_npr": band_tax,
            })
            remaining -= taxable_in_band

        return success({
            "gross_annual_income_npr": income,
            "total_tax_npr": round(total_tax, 2),
            "net_annual_income_npr": round(income - total_tax, 2),
            "effective_rate_pct": round(total_tax / income * 100, 2) if income > 0 else 0,
            "monthly_take_home_npr": round((income - total_tax) / 12, 2),
            "breakdown": breakdown,
        })
    except Exception as e:
        return error(str(e), 500)


@payroll_setup_bp.get("/tax-deduction-caps")
def list_deduction_caps():
    """Public — SSF/CIT/insurance deduction caps for the eligible-deductions calculator."""
    jurisdiction = request.args.get("jurisdiction_code", "NP")
    try:
        rows = db.session.execute(text(
            "SELECT * FROM tax_deduction_caps WHERE jurisdiction_code = :jcode"
        ), {"jcode": jurisdiction}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 8. ALLOWANCE
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/allowances")
@require_auth
def list_allowances():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM allowance_types WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_setup_bp.post("/allowances")
@require_auth
@require_role("super_admin", "hr_manager")
def create_allowance():
    body = request.get_json() or {}
    required = ["name", "code", "calc_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO allowance_types (company_id, name, code, calc_type, calc_value, taxable, is_statutory, created_at)
            VALUES (:cid, :name, :code, :ctype, :cvalue, :taxable, :statutory, NOW())
            RETURNING id
        """), {"cid": g.company_id, "name": body["name"], "code": body["code"], "ctype": body["calc_type"],
               "cvalue": body.get("calc_value"), "taxable": body.get("taxable", True), "statutory": body.get("is_statutory", False)})
        aid = str(result.fetchone()[0])
        db.session.commit()
        return created({"allowance_id": aid})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 9. DEDUCTION
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/deductions")
@require_auth
def list_deductions():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM deduction_types WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_setup_bp.post("/deductions")
@require_auth
@require_role("super_admin", "hr_manager")
def create_deduction():
    body = request.get_json() or {}
    required = ["name", "code", "timing"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO deduction_types (company_id, name, code, timing, mandatory, calc_value, created_at)
            VALUES (:cid, :name, :code, :timing, :mandatory, :cvalue, NOW())
            RETURNING id
        """), {"cid": g.company_id, "name": body["name"], "code": body["code"], "timing": body["timing"],
               "mandatory": body.get("mandatory", False), "cvalue": body.get("calc_value")})
        did = str(result.fetchone()[0])
        db.session.commit()
        return created({"deduction_id": did})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_setup_bp.get("/cash-advances/due")
@require_auth
@require_role("super_admin", "hr_manager")
def cash_advances_due():
    """Cash advances unrecovered past 1 month — auto-flagged for payroll deduction."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_cash_advance_due WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_setup_bp.post("/cash-advances")
@require_auth
@require_role("super_admin", "hr_manager")
def issue_cash_advance():
    body = request.get_json() or {}
    required = ["employee_id", "amount_npr", "disbursed_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO cash_advance_recovery (company_id, employee_id, amount_npr, disbursed_date, created_at)
            VALUES (:cid, :eid, :amount, :ddate, NOW()) RETURNING id
        """), {"cid": g.company_id, "eid": body["employee_id"], "amount": body["amount_npr"], "ddate": body["disbursed_date"]})
        advance_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"advance_id": advance_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 10. COMPLIANCE SETUP
# ════════════════════════════════════════════════════════════════

@payroll_setup_bp.get("/compliance-health")
@require_auth
@require_role("super_admin", "hr_manager")
def compliance_health():
    """Color-coded compliance health meter: upcoming deadlines + past filing status."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_compliance_health_score WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_setup_bp.get("/compliance-deadlines")
@require_auth
@require_role("super_admin", "hr_manager")
def compliance_deadlines():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM statutory_filing_deadlines WHERE company_id = :cid ORDER BY due_date ASC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_setup_bp.put("/compliance-deadlines/<deadline_id>/mark-filed")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_filed(deadline_id):
    try:
        db.session.execute(text("""
            UPDATE statutory_filing_deadlines SET status = 'filed', filed_at = NOW(), updated_at = NOW()
            WHERE id = :did AND company_id = :cid
        """), {"did": deadline_id, "cid": g.company_id})
        db.session.commit()
        return success({"marked_filed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_setup_bp.post("/ai-anomaly-check")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_anomaly_check():
    """AI flags non-compliant hours/wages across insource/outsource/vendor payroll."""
    try:
        insight = generate_ai_insights({"type": "payroll_compliance_anomaly_scan", "company_id": g.company_id})
        return success({"anomalies": insight.get("anomalies", [])})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@payroll_setup_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["salary-structures", "allowances", "deductions", "tax-slabs"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"payroll_setup_{module}")
    return jsonify(result), 200 if result["success"] else 422


@payroll_setup_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"payroll_setup_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"payroll_setup_{module}_template.xlsx")
