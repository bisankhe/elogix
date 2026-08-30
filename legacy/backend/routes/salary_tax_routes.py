"""
FILE: backend/routes/salary_tax_routes.py
eLogix HRMS — Final Salary Sheet & Tax Calculator Routes
Nepal Income Tax Act 2058 · SSF Regulation 2074 · FY 2083-84
eLogix Technologies · www.elogix.com.np

Endpoints:
  POST /api/v1/salary/calculate          Single employee calculation
  POST /api/v1/salary/sheet/bulk         Bulk salary sheet generation
  GET  /api/v1/salary/sheet              Get salary sheet (company-scoped)
  PUT  /api/v1/salary/sheet/<id>         Update salary record
  POST /api/v1/salary/sheet/sync-payroll Sync to payroll (needs 3 sigs)
  GET  /api/v1/salary/sheet/export       CSV export

  POST /api/v1/tax/calculate             Live tax calculation + save log
  GET  /api/v1/tax/logs                  Tax calculation history
  GET  /api/v1/tax/slabs                 Get FY 2083-84 tax slabs
  GET  /api/v1/tax/compare               Compare FY 2082-83 vs 2083-84
"""
import json, secrets
from decimal import Decimal
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from ..middleware.auth import require_auth, require_role, require_permission
from ..extensions import db

salary_bp = Blueprint("salary_tax", __name__, url_prefix="/api/v1")
_now = lambda: datetime.now(timezone.utc)

# ══════════════════════════════════════════════════════════════
#  NEPAL TAX ENGINE  — FY 2083-84
# ══════════════════════════════════════════════════════════════

TAX_SLABS_SINGLE_2083 = [
    {"upto": 1_000_000, "rate": 0.00, "label": "First NPR 10 Lakh"},
    {"upto":   500_000, "rate": 0.10, "label": "Next NPR 5 Lakh"},
    {"upto": 1_000_000, "rate": 0.20, "label": "Next NPR 10 Lakh"},
    {"upto": 1_500_000, "rate": 0.27, "label": "Next NPR 15 Lakh"},
    {"upto": None,      "rate": 0.29, "label": "Exceeding NPR 40 Lakh"},
]
TAX_SLABS_COUPLE_2083 = [
    {"upto": 1_200_000, "rate": 0.00, "label": "First NPR 12 Lakh"},
    {"upto":   200_000, "rate": 0.10, "label": "Next NPR 2 Lakh"},
    {"upto":   300_000, "rate": 0.20, "label": "Next NPR 3 Lakh"},
    {"upto":   900_000, "rate": 0.30, "label": "Next NPR 9 Lakh"},
    {"upto": 3_000_000, "rate": 0.36, "label": "Next NPR 30 Lakh"},
    {"upto": None,      "rate": 0.39, "label": "Exceeding NPR 50 Lakh"},
]
TAX_SLABS_SINGLE_2082 = [
    {"upto":   500_000, "rate": 0.00},
    {"upto":   200_000, "rate": 0.10},
    {"upto":   300_000, "rate": 0.20},
    {"upto": 1_000_000, "rate": 0.30},
    {"upto": 3_000_000, "rate": 0.36},
    {"upto": None,      "rate": 0.39},
]

SSF_PF_RATE       = Decimal("0.10")
SSF_GRATUITY_RATE = Decimal("0.0833")
SSF_INS_RATE      = Decimal("0.0167")
SSF_EMPLOYER_RATE = Decimal("0.20")
ARF_MAX           = Decimal("500000")
LIFE_INS_MAX      = Decimal("60000")
SCHOOL_FEE_MAX    = Decimal("25000")
CIT_RATE          = Decimal("0.50")
FEMALE_REBATE     = Decimal("0.10")
DASHAIN_MONTHS    = 1


def _apply_slabs(taxable: Decimal, slabs: list) -> tuple[Decimal, list]:
    remaining = taxable
    total     = Decimal("0")
    breakdown = []
    for slab in slabs:
        if remaining <= 0:
            break
        chunk = min(remaining, Decimal(str(slab["upto"]))) if slab["upto"] else remaining
        tax   = chunk * Decimal(str(slab["rate"]))
        breakdown.append({
            "label":  slab.get("label",""),
            "amount": float(chunk),
            "rate":   slab["rate"],
            "tax":    float(tax),
        })
        total     += tax
        remaining -= chunk
    return total, breakdown


def nepal_tax_engine(data: dict) -> dict:
    """
    Full Nepal tax calculation engine for FY 2083-84.
    Accepts employee salary inputs, returns complete breakdown.
    """
    def D(v): return Decimal(str(v or 0))

    basic       = D(data.get("basic_salary", 0))
    other_allow = D(data.get("other_allowance", 0))
    da          = D(data.get("dearness_allowance", 0))
    laptop      = D(data.get("laptop_allowance", 0))
    rent        = D(data.get("rent_allowance", 0))
    incentive   = D(data.get("incentive", 0))
    misc_ded    = D(data.get("misc_deduct", 0))
    leave_ded   = D(data.get("leave_deduct", 0))
    months      = int(data.get("months_in_year", 12))
    is_couple   = data.get("marital_status", "Single") == "Married"
    is_female   = data.get("gender", "Male") == "Female"
    life_ins    = D(data.get("life_insurance", 0))
    school_fee  = D(data.get("school_fee", 0))
    dashain     = bool(data.get("dashain_include", True))

    # SSF (employee)
    pf_amt      = D(data.get("pf_actual",        0)) or (basic * SSF_PF_RATE)
    gratuity_amt= D(data.get("gratuity_actual",  0)) or (basic * SSF_GRATUITY_RATE)
    ins_amt     = D(data.get("insurance_actual", 0)) or (basic * SSF_INS_RATE)
    ssf_employee= pf_amt + gratuity_amt + ins_amt
    ssf_employer= basic * SSF_EMPLOYER_RATE

    # Monthly Salary
    monthly_gross = (basic + other_allow + da + laptop + rent + incentive
                     - misc_ded - leave_ded - ssf_employee)

    # Annual
    annual_gross   = monthly_gross * months
    dashain_amt    = basic if dashain else Decimal("0")
    annual_incentive = incentive * months
    annual_assessable = annual_gross + dashain_amt + annual_incentive

    # ARF deduction
    arf_actual    = ssf_employee * months
    arf_one_third = annual_assessable / 3
    arf_allowable = min(arf_actual, ARF_MAX, arf_one_third)

    # Other deductions
    life_ins_allow  = min(life_ins, LIFE_INS_MAX)
    school_allow    = min(school_fee, SCHOOL_FEE_MAX)

    # Taxable income
    taxable_income = max(
        Decimal("0"),
        annual_assessable - arf_allowable - life_ins_allow - school_allow
    )

    # Tax slabs
    slabs      = TAX_SLABS_COUPLE_2083 if is_couple else TAX_SLABS_SINGLE_2083
    total_tax, breakdown = _apply_slabs(taxable_income, slabs)

    # Female 10% rebate (Nepal Income Tax Act s.88)
    female_credit = total_tax * FEMALE_REBATE if is_female else Decimal("0")
    net_tax       = total_tax - female_credit
    monthly_tax   = net_tax / months if months > 0 else Decimal("0")

    # CIT
    cit_monthly   = basic * CIT_RATE

    # Previous year comparison
    prev_tax, _ = _apply_slabs(taxable_income, TAX_SLABS_SINGLE_2082)
    prev_female  = prev_tax * FEMALE_REBATE if is_female else Decimal("0")

    # Net salary
    net_salary = monthly_gross - ssf_employee - cit_monthly - monthly_tax

    # Effective rate
    effective_rate = (net_tax / taxable_income * 100) if taxable_income > 0 else Decimal("0")

    return {
        # SSF
        "ssf_pf":             float(pf_amt),
        "ssf_gratuity":       float(gratuity_amt),
        "ssf_insurance":      float(ins_amt),
        "ssf_employee":       float(ssf_employee),
        "ssf_employer":       float(ssf_employer),
        # Salary
        "monthly_gross":      float(monthly_gross),
        "annual_gross":       float(annual_gross),
        "dashain_allowance":  float(dashain_amt),
        "annual_assessable":  float(annual_assessable),
        # Deductions
        "arf_actual":         float(arf_actual),
        "arf_allowable":      float(arf_allowable),
        "life_ins_allowable": float(life_ins_allow),
        "school_allowable":   float(school_allow),
        "taxable_income":     float(taxable_income),
        # Tax
        "tax_breakdown":      breakdown,
        "total_tax":          float(total_tax),
        "female_credit":      float(female_credit),
        "net_tax":            float(net_tax),
        "monthly_tax":        float(monthly_tax),
        # CIT
        "cit_monthly":        float(cit_monthly),
        # Net
        "net_salary":         float(net_salary),
        "effective_rate":     float(effective_rate),
        # Comparison
        "prev_year_tax":      float(prev_tax - prev_female),
        "tax_change":         float(net_tax - (prev_tax - prev_female)),
    }


# ══════════════════════════════════════════════════════════════
#  ROUTES — SALARY SHEET
# ══════════════════════════════════════════════════════════════

@salary_bp.post("/salary/calculate")
@require_auth
def calculate_salary():
    """
    Single employee tax + salary calculation.
    Returns full breakdown. Does NOT save to DB.
    """
    data = request.get_json() or {}
    if not data.get("basic_salary"):
        return jsonify({"success": False, "error": "basic_salary required"}), 400
    result = nepal_tax_engine(data)
    return jsonify({"success": True, "brand": "eLogix",
                    "fiscal_year": "2083-84", "result": result}), 200


@salary_bp.post("/salary/sheet/bulk")
@require_auth
@require_role("super_admin","hr_manager","payroll_officer","hr_admin")
def generate_bulk_salary():
    """
    Generate final salary sheet for multiple employees.
    Accepts array of employee salary inputs.
    Creates/updates FinalSalarySheet records.
    """
    from ..models.payroll_tax_models import FinalSalarySheet
    data      = request.get_json() or {}
    pay_month = data.get("pay_month")
    employees = data.get("employees", [])
    fiscal_yr = data.get("fiscal_year", "2083-84")

    if not pay_month or not employees:
        return jsonify({"success": False, "error": "pay_month and employees[] required"}), 400

    created, updated, results = 0, 0, []
    for emp in employees:
        calc = nepal_tax_engine(emp)

        existing = db.session.query(FinalSalarySheet).filter_by(
            company_id=g.company_id, emp_id=emp["emp_id"], pay_month=pay_month
        ).first()

        rec_data = {
            "company_id":       g.company_id,
            "emp_id":           emp["emp_id"],
            "emp_code":         emp.get("emp_code",""),
            "emp_name":         emp.get("emp_name",""),
            "designation":      emp.get("designation",""),
            "department":       emp.get("department",""),
            "pay_month":        pay_month,
            "fiscal_year":      fiscal_yr,
            "months_in_year":   emp.get("months_in_year", 12),
            "gender":           emp.get("gender","Male"),
            "marital_status":   emp.get("marital_status","Single"),
            "is_bod":           bool(emp.get("is_bod", False)),
            "basic_salary":     emp.get("basic_salary",0),
            "other_allowance":  emp.get("other_allowance",0),
            "dearness_allowance":emp.get("dearness_allowance",0),
            "laptop_allowance": emp.get("laptop_allowance",0),
            "rent_allowance":   emp.get("rent_allowance",0),
            "incentive":        emp.get("incentive",0),
            "misc_deduct":      emp.get("misc_deduct",0),
            "leave_deduct":     emp.get("leave_deduct",0),
            "staff_advance":    emp.get("staff_advance",0),
            "life_insurance":   emp.get("life_insurance",0),
            # Calculated
            "gross_salary":         calc["monthly_gross"],
            "ssf_pf":               calc["ssf_pf"],
            "ssf_gratuity":         calc["ssf_gratuity"],
            "ssf_insurance":        calc["ssf_insurance"],
            "ssf_total_employee":   calc["ssf_employee"],
            "ssf_total_employer":   calc["ssf_employer"],
            "ssf_contribution":     calc["ssf_employee"],
            "dashain_allowance":    calc["dashain_allowance"],
            "cit_deduct":           calc["cit_monthly"],
            "annual_gross":         calc["annual_gross"],
            "arf_contribution":     calc["arf_actual"],
            "arf_allowable":        calc["arf_allowable"],
            "life_ins_allowable":   calc["life_ins_allowable"],
            "taxable_income":       calc["taxable_income"],
            "total_tax_payable":    calc["total_tax"],
            "female_tax_credit":    calc["female_credit"],
            "net_tax_payable":      calc["net_tax"],
            "monthly_tax":          calc["monthly_tax"],
            "net_salary":           calc["net_salary"],
        }

        if existing:
            for k, v in rec_data.items():
                if hasattr(existing, k): setattr(existing, k, v)
            updated += 1
        else:
            sheet = FinalSalarySheet(**rec_data)
            db.session.add(sheet)
            created += 1

        results.append({"emp_id": emp["emp_id"], "emp_name": emp.get("emp_name"),
                         "net_salary": calc["net_salary"], "monthly_tax": calc["monthly_tax"]})

    db.session.commit()
    total_net = sum(r["net_salary"] for r in results)
    return jsonify({
        "success":   True,
        "brand":     "eLogix",
        "pay_month": pay_month,
        "created":   created,
        "updated":   updated,
        "total_staff": len(results),
        "total_net_salary": round(total_net, 2),
        "results":   results,
    }), 201


@salary_bp.get("/salary/sheet")
@require_auth
def get_salary_sheet():
    """Get final salary sheet — department/month filtered, company-scoped."""
    from ..models.payroll_tax_models import FinalSalarySheet
    q = db.session.query(FinalSalarySheet).filter_by(company_id=g.company_id)

    month  = request.args.get("pay_month","")
    dept   = request.args.get("department","")
    fiscal = request.args.get("fiscal_year","")
    if month:  q = q.filter(FinalSalarySheet.pay_month   == month)
    if dept:   q = q.filter(FinalSalarySheet.department   == dept)
    if fiscal: q = q.filter(FinalSalarySheet.fiscal_year  == fiscal)

    # Scope
    if g.level >= 4 and g.dept_id:
        q = q.filter(FinalSalarySheet.department == g.dept_id)
    if g.level >= 10:
        q = q.filter(FinalSalarySheet.emp_id == g.user_id)

    page     = int(request.args.get("page",1))
    per_page = int(request.args.get("per_page",50))
    total    = q.count()
    records  = q.order_by(FinalSalarySheet.emp_name).offset((page-1)*per_page).limit(per_page).all()

    total_gross = sum(float(r.gross_salary or 0) for r in records)
    total_ssf   = sum(float(r.ssf_total_employee or 0) for r in records)
    total_tax   = sum(float(r.monthly_tax or 0) for r in records)
    total_net   = sum(float(r.net_salary or 0) for r in records)

    # Signatures
    from ..models.attendance_reports_models import DigitalSignature
    ref  = f"{month}_{dept or 'ALL'}"
    sigs = db.session.query(DigitalSignature).filter_by(
        company_id=g.company_id, report_type="final_salary", report_ref=ref
    ).all()

    return jsonify({
        "success":    True,
        "total":      total, "page": page,
        "records":    [r.to_dict() for r in records],
        "summary": {
            "total_gross":    round(total_gross,2),
            "total_ssf":      round(total_ssf,2),
            "total_tax":      round(total_tax,2),
            "total_net":      round(total_net,2),
        },
        "signatures": {s.role: s.to_dict() for s in sigs},
        "all_signed": len(sigs)==3 and all(s.is_signed for s in sigs),
    })


@salary_bp.put("/salary/sheet/<sheet_id>")
@require_auth
@require_role("super_admin","hr_manager","payroll_officer")
def update_salary_record(sheet_id):
    """Update a salary record — recalculates automatically."""
    from ..models.payroll_tax_models import FinalSalarySheet
    rec = db.session.query(FinalSalarySheet).filter_by(
        id=sheet_id, company_id=g.company_id
    ).first()
    if not rec:
        return jsonify({"success": False, "error": "Record not found"}), 404
    if rec.is_locked:
        return jsonify({"success": False, "error": "Record is locked and payroll-synced. Contact HR Manager."}), 400

    data = request.get_json() or {}
    editable = ["basic_salary","other_allowance","dearness_allowance","laptop_allowance",
                "rent_allowance","incentive","misc_deduct","leave_deduct","staff_advance",
                "life_insurance","months_in_year"]
    for k in editable:
        if k in data: setattr(rec, k, data[k])

    # Recalculate
    calc = nepal_tax_engine({
        "basic_salary":       float(rec.basic_salary or 0),
        "other_allowance":    float(rec.other_allowance or 0),
        "dearness_allowance": float(rec.dearness_allowance or 0),
        "gender":             rec.gender, "marital_status": rec.marital_status,
        "months_in_year":     rec.months_in_year,
    })
    rec.gross_salary       = calc["monthly_gross"]
    rec.ssf_pf             = calc["ssf_pf"]
    rec.ssf_gratuity       = calc["ssf_gratuity"]
    rec.ssf_insurance      = calc["ssf_insurance"]
    rec.ssf_total_employee = calc["ssf_employee"]
    rec.ssf_total_employer = calc["ssf_employer"]
    rec.cit_deduct         = calc["cit_monthly"]
    rec.taxable_income     = calc["taxable_income"]
    rec.total_tax_payable  = calc["total_tax"]
    rec.female_tax_credit  = calc["female_credit"]
    rec.net_tax_payable    = calc["net_tax"]
    rec.monthly_tax        = calc["monthly_tax"]
    rec.net_salary         = calc["net_salary"]

    db.session.commit()
    return jsonify({"success": True, "record": rec.to_dict(), "calc": calc})


@salary_bp.post("/salary/sheet/sync-payroll")
@require_auth
@require_role("super_admin","hr_manager","payroll_officer")
def sync_salary_payroll():
    """Sync finalised salary sheet to payroll — requires 3 digital signatures."""
    from ..models.payroll_tax_models import FinalSalarySheet
    from ..models.attendance_reports_models import DigitalSignature

    data      = request.get_json() or {}
    pay_month = data.get("pay_month")
    dept      = data.get("department","ALL")
    if not pay_month:
        return jsonify({"success": False, "error": "pay_month required"}), 400

    # Check signatures
    ref  = f"{pay_month}_{dept}"
    sigs = db.session.query(DigitalSignature).filter_by(
        company_id=g.company_id, report_type="final_salary", report_ref=ref
    ).all()
    signed = {s.role for s in sigs if s.is_signed}
    if not {"prepared","verified","approved"}.issubset(signed):
        return jsonify({
            "success": False,
            "error":  f"Missing signatures: {{'prepared','verified','approved'}-signed}",
        }), 400

    q = db.session.query(FinalSalarySheet).filter_by(
        company_id=g.company_id, pay_month=pay_month
    )
    if dept != "ALL":
        q = q.filter(FinalSalarySheet.department == dept)
    records = q.all()

    pr_ref = f"SAL-{pay_month}-{dept[:4].upper()}-{secrets.token_hex(3).upper()}"
    for rec in records:
        rec.payroll_synced    = True
        rec.payroll_ref       = pr_ref
        rec.payroll_synced_at = _now()
        rec.status            = "locked"
        rec.is_locked         = True

    db.session.commit()
    total_net = sum(float(r.net_salary or 0) for r in records)
    return jsonify({
        "success":        True,
        "payroll_ref":    pr_ref,
        "records_synced": len(records),
        "total_net_salary": round(total_net, 2),
        "message":        f"✅ Salary sheet synced to payroll — Ref: {pr_ref}",
    })


@salary_bp.get("/salary/sheet/export")
@require_auth
def export_salary_sheet():
    """CSV export of salary sheet."""
    from ..models.payroll_tax_models import FinalSalarySheet
    month = request.args.get("pay_month","")
    q     = db.session.query(FinalSalarySheet).filter_by(company_id=g.company_id)
    if month: q = q.filter(FinalSalarySheet.pay_month == month)
    records = q.order_by(FinalSalarySheet.emp_name).all()
    headers = ["Emp Code","Name","Designation","Dept","Gender","Marital",
               "Basic","Other Allow","DA","Gross","SSF Employee","SSF Employer",
               "CIT","Tax (TDS)","Net Salary","Fiscal Year","Status"]
    rows = [[r.emp_code, r.emp_name, r.designation, r.department, r.gender, r.marital_status,
             str(r.basic_salary), str(r.other_allowance), str(r.dearness_allowance),
             str(r.gross_salary), str(r.ssf_total_employee), str(r.ssf_total_employer),
             str(r.cit_deduct), str(r.monthly_tax), str(r.net_salary),
             r.fiscal_year, r.status] for r in records]
    return jsonify({"success": True, "headers": headers, "rows": rows, "total": len(rows)})


# ══════════════════════════════════════════════════════════════
#  ROUTES — TAX CALCULATOR
# ══════════════════════════════════════════════════════════════

@salary_bp.post("/tax/calculate")
@require_auth
def tax_calculate():
    """
    Live tax calculation + save to TaxCalculationLog for history.
    """
    from ..models.payroll_tax_models import TaxCalculationLog
    data = request.get_json() or {}
    if not data.get("basic_salary"):
        return jsonify({"success": False, "error": "basic_salary required"}), 400

    result = nepal_tax_engine(data)

    # Save log
    log = TaxCalculationLog(
        company_id      = g.company_id,
        emp_id          = data.get("emp_id"),
        emp_name        = data.get("emp_name",""),
        fiscal_year     = data.get("fiscal_year","2083-84"),
        gender          = data.get("gender","Male"),
        marital_status  = data.get("marital_status","Single"),
        months_in_year  = int(data.get("months_in_year",12)),
        basic_salary    = data.get("basic_salary",0),
        other_allowance = data.get("other_allowance",0),
        dearness_allow  = data.get("dearness_allowance",0),
        other_inputs    = json.dumps({k:v for k,v in data.items()
                           if k not in ("basic_salary","other_allowance","dearness_allowance")}),
        monthly_gross   = result["monthly_gross"],
        annual_assessable=result["annual_assessable"],
        arf_allowable   = result["arf_allowable"],
        taxable_income  = result["taxable_income"],
        ssf_employee    = result["ssf_employee"],
        ssf_employer    = result["ssf_employer"],
        cit_monthly     = result["cit_monthly"],
        total_tax_annual= result["total_tax"],
        female_credit   = result["female_credit"],
        net_tax_annual  = result["net_tax"],
        monthly_tax     = result["monthly_tax"],
        net_salary      = result["net_salary"],
        effective_rate  = result["effective_rate"],
        tax_breakdown   = json.dumps(result["tax_breakdown"]),
        created_by      = g.user_id,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        "success":     True,
        "brand":       "eLogix",
        "fiscal_year": data.get("fiscal_year","2083-84"),
        "log_id":      log.id,
        "result":      result,
    }), 201


@salary_bp.get("/tax/logs")
@require_auth
def tax_logs():
    """Tax calculation history for current user / company."""
    from ..models.payroll_tax_models import TaxCalculationLog
    q = db.session.query(TaxCalculationLog).filter_by(company_id=g.company_id)
    if g.level >= 10:
        q = q.filter(TaxCalculationLog.emp_id == g.user_id)
    emp_id = request.args.get("emp_id")
    if emp_id: q = q.filter(TaxCalculationLog.emp_id == emp_id)
    logs = q.order_by(TaxCalculationLog.created_at.desc()).limit(50).all()
    return jsonify({"success": True, "logs": [l.to_dict() for l in logs]})


@salary_bp.get("/tax/slabs")
@require_auth
def get_tax_slabs():
    """Return FY 2083-84 tax slabs for both Single and Couple."""
    return jsonify({
        "success":      True,
        "brand":        "eLogix",
        "fiscal_year":  "2083-84",
        "act":          "Nepal Income Tax Act 2058",
        "slabs": {
            "single": TAX_SLABS_SINGLE_2083,
            "couple": TAX_SLABS_COUPLE_2083,
        },
        "deductions": {
            "arf_max":        500_000,
            "life_ins_max":   60_000,
            "school_fee_max": 25_000,
            "female_rebate":  "10% of total tax",
            "ssf_employee":   "PF 10% + Gratuity 8.33% + Insurance 1.67% of Basic",
            "ssf_employer":   "20% of Basic (additional)",
            "cit":            "50% of Basic Salary",
            "dashain":        "1 month Basic Salary (included in assessable income)",
        },
        "previous_year": {
            "fiscal_year": "2082-83",
            "slabs": TAX_SLABS_SINGLE_2082,
        },
    })


@salary_bp.get("/tax/compare")
@require_auth
def tax_year_compare():
    """
    Compare tax liability FY 2082-83 vs FY 2083-84 for given income.
    Query param: taxable_income, gender, marital_status
    """
    taxable     = float(request.args.get("taxable_income", 0))
    is_female   = request.args.get("gender","Male") == "Female"
    if taxable <= 0:
        return jsonify({"success": False, "error": "taxable_income required"}), 400

    def calc(slabs, ti, female):
        tax, _ = _apply_slabs(Decimal(str(ti)), slabs)
        credit = tax * FEMALE_REBATE if female else Decimal("0")
        return {"gross_tax": float(tax), "female_credit": float(credit), "net_tax": float(tax-credit)}

    new_tax  = calc(TAX_SLABS_SINGLE_2083, taxable, is_female)
    prev_tax = calc(TAX_SLABS_SINGLE_2082, taxable, is_female)
    saving   = round(prev_tax["net_tax"] - new_tax["net_tax"], 2)

    return jsonify({
        "success":       True,
        "taxable_income":taxable,
        "fy_2082_83":    prev_tax,
        "fy_2083_84":    new_tax,
        "annual_saving": saving,
        "monthly_saving":round(saving/12, 2),
        "message":       f"Tax saving in FY 2083-84: NPR {saving:,.2f}/year",
    })
