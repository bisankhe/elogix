"""
FILE: backend/utils/nepal_law.py
Nepal Labour Act 2074 (2017) — Helper functions and validators
Used throughout backend for compliance checking.
"""
from datetime import date, timedelta
from typing import Optional
import math

# ── Constants ─────────────────────────────────────────────────
MIN_WAGE_NPR           = 15_000    # NPR/month minimum wage
DAILY_RATE_NPR         = round(MIN_WAGE_NPR / 26, 2)   # 577.0
MAX_PROBATION_MONTHS   = 6
MAX_CASUAL_DAYS_MONTH  = 7
MAX_PARTTIME_HRS_WEEK  = 35
STD_DAILY_HOURS        = 8
STD_WEEKLY_HOURS       = 48
OT_MULTIPLIER          = 1.5
PF_EMPLOYEE_PCT        = 10.0
PF_EMPLOYER_PCT        = 10.0
SSF_EMPLOYER_PCT       = 3.33     # Social Security Fund
GRATUITY_PCT           = 8.33     # 1/12 of annual salary per year of service
FESTIVAL_BONUS_PCT     = 100.0    # One month salary
TDS_SERVICES_PCT       = 1.5      # TDS on outsource services
TDS_SALARY_SLAB_1      = 500_000  # Annual income: 0 → 0%
TDS_SALARY_SLAB_2      = 200_000  # Next 200K: 10%
TDS_SALARY_SLAB_3      = 300_000  # Next 300K: 20%
TDS_SALARY_RATE_3      = 36.0     # Above 1M: 36%
SAFETY_COMMITTEE_THRESHOLD = 20   # Workers for Safety Committee
CBA_THRESHOLD          = 10       # Workers for CBA

# ── Section 10: Employment Types ──────────────────────────────
EMPLOYMENT_TYPES = {
    "regular":   {"section": "10(a)", "contract": True,  "probation": 6},
    "work_based":{"section": "10(b)", "contract": True,  "probation": 3},
    "time_bound":{"section": "10(c)", "contract": True,  "probation": 3},
    "casual":    {"section": "10(d)", "contract": False, "max_days_month": 7},
    "part_time": {"section": "10(e)", "contract": True,  "max_hrs_week": 35},
}

# ── CBA & Safety Committee (Sections 107-109, 152-156) ────────
def check_cba_required(worker_count: int, is_managerial: bool = False) -> dict:
    """Returns CBA flag + Safety Committee flag per Labour Act 2074."""
    cba = worker_count >= CBA_THRESHOLD and not is_managerial
    sc  = worker_count >= SAFETY_COMMITTEE_THRESHOLD
    return {
        "cba_required":               cba,
        "safety_committee_required":  sc,
        "worker_count":               worker_count,
        "cba_section":                "Labour Act 2074, Section 108" if cba else None,
        "safety_section":             "Labour Act 2074, Section 155" if sc else None,
        "cba_note": f"CBA committee required: {worker_count} workers >= 10" if cba else None,
        "safety_note": f"Safety & Health Committee mandatory: {worker_count} workers >= 20" if sc else None,
    }

# ── Probation (Section 10) ─────────────────────────────────────
def check_probation(start_date: date, probation_months: int = 6) -> dict:
    """Check if probation period is expiring soon."""
    if probation_months > MAX_PROBATION_MONTHS:
        probation_months = MAX_PROBATION_MONTHS  # Cap per law
    expiry = date(
        start_date.year + (start_date.month + probation_months - 1) // 12,
        (start_date.month + probation_months - 1) % 12 + 1,
        min(start_date.day, 28)
    )
    days_left = (expiry - date.today()).days
    return {
        "start_date":        str(start_date),
        "expiry_date":       str(expiry),
        "days_left":         days_left,
        "expired":           days_left < 0,
        "alert":             0 <= days_left <= 30,
        "alert_message": f"Probation expires in {days_left} days ({expiry}). Confirm or terminate." if 0 <= days_left <= 30 else None,
        "violation":         probation_months > MAX_PROBATION_MONTHS,
        "la_section":        "Labour Act 2074, Section 10",
    }

# ── Casual Employment (Section 10d) ───────────────────────────
def check_casual_days(days_worked_this_month: int) -> dict:
    """Alert if casual employee exceeds 7 days/month."""
    exceeds = days_worked_this_month > MAX_CASUAL_DAYS_MONTH
    return {
        "days_worked":         days_worked_this_month,
        "max_days_allowed":    MAX_CASUAL_DAYS_MONTH,
        "exceeds_limit":       exceeds,
        "auto_regularize_risk": exceeds,
        "alert": f"VIOLATION: Casual employee worked {days_worked_this_month} days (max 7). Risk of deemed regularization." if exceeds else None,
        "la_section":          "Labour Act 2074, Section 10(d)",
    }

# ── Minimum Wage Compliance ────────────────────────────────────
def check_minimum_wage(monthly_salary_npr: float,
                       employment_type: str = "regular") -> dict:
    """Validate salary against Nepal minimum wage (NPR 15,000/month)."""
    if employment_type in ["intern", "consultant", "outsource"]:
        return {"applicable": False, "compliant": True}
    compliant = monthly_salary_npr >= MIN_WAGE_NPR
    return {
        "monthly_salary":    monthly_salary_npr,
        "minimum_wage_npr":  MIN_WAGE_NPR,
        "compliant":         compliant,
        "shortfall_npr":     max(MIN_WAGE_NPR - monthly_salary_npr, 0),
        "alert": f"Salary NPR {monthly_salary_npr:,.0f} below minimum wage NPR {MIN_WAGE_NPR:,}" if not compliant else None,
        "la_reference":      "Labour Act 2074 + Minimum Remuneration Fixation Committee",
    }

# ── Statutory Benefits Calculator ─────────────────────────────
def calculate_statutory_benefits(monthly_salary_npr: float,
                                  years_service: float = 0,
                                  emp_type: str = "regular") -> dict:
    """Calculate PF, SSF, Gratuity, Festival Bonus per Nepal law."""
    if emp_type in ["casual", "intern", "consultant", "outsource"]:
        return {"applicable": False, "emp_type": emp_type}

    annual    = monthly_salary_npr * 12
    pf_emp    = monthly_salary_npr * PF_EMPLOYEE_PCT / 100
    pf_er     = monthly_salary_npr * PF_EMPLOYER_PCT / 100
    ssf_er    = monthly_salary_npr * SSF_EMPLOYER_PCT / 100
    gratuity  = (monthly_salary_npr * GRATUITY_PCT / 100) * years_service if years_service >= 1 else 0
    festival  = monthly_salary_npr  # 1 month festival bonus

    total_ctc = monthly_salary_npr + pf_er + ssf_er + (festival / 12) + (gratuity / 12 if years_service >= 1 else 0)

    return {
        "monthly_gross":       monthly_salary_npr,
        "annual_gross":        annual,
        "pf_employee_monthly": round(pf_emp, 2),
        "pf_employer_monthly": round(pf_er, 2),
        "pf_total_monthly":    round(pf_emp + pf_er, 2),
        "ssf_employer_monthly":round(ssf_er, 2),
        "gratuity_accrued_nrp":round(gratuity, 2),
        "festival_bonus_npr":  round(festival, 2),
        "total_ctc_monthly":   round(total_ctc, 2),
        "employer_burden_pct": round((total_ctc - monthly_salary_npr) / monthly_salary_npr * 100, 1),
        "references": {
            "pf":       "Employees Provident Fund Act 2019",
            "ssf":      "Social Security Act 2075 + Contribution Rate 2019",
            "gratuity": "Labour Act 2074, Section 53",
            "festival": "Labour Act 2074, Section 64",
        }
    }

# ── Outsource Co-Liability Check (Sections 52-60) ─────────────
def check_outsource_compliance(
    is_licensed_agency: bool,
    license_expiry: Optional[date],
    is_core_function: bool,
    ssf_paid: bool,
    min_wage_paid: bool,
    insurance_provided: bool,
) -> dict:
    """Full Section 52-60 outsource compliance check."""
    issues = []
    risk   = "low"

    if not is_licensed_agency:
        issues.append({
            "severity": "CRITICAL",
            "code":     "NO_LICENSE",
            "message":  "Unlicensed labour supplier! Workers are deemed direct employees of main employer.",
            "section":  "Section 52(1)",
            "action":   "Immediately register with licensed MoLESS agency or convert to direct employment."
        })
        risk = "critical"

    if license_expiry and license_expiry < date.today():
        issues.append({
            "severity": "CRITICAL",
            "code":     "LICENSE_EXPIRED",
            "message":  f"Agency license expired on {license_expiry}.",
            "section":  "Section 52",
            "action":   "Suspend deployment until license is renewed."
        })
        risk = "critical"

    if is_core_function:
        issues.append({
            "severity": "CRITICAL",
            "code":     "CORE_FUNCTION",
            "message":  "Outsourced workers are performing core business functions — prohibited by law.",
            "section":  "Section 52(2)",
            "action":   "Convert to direct employment or reassign to permitted non-core tasks."
        })
        risk = "critical"

    if not ssf_paid:
        issues.append({
            "severity": "HIGH",
            "code":     "SSF_UNPAID",
            "message":  "Agency has not paid SSF contributions. Main employer is co-liable.",
            "section":  "Section 55",
            "action":   "Deduct from agency payment and pay directly to SSF, then recover from agency."
        })
        if risk == "low": risk = "high"

    if not min_wage_paid:
        issues.append({
            "severity": "HIGH",
            "code":     "BELOW_MIN_WAGE",
            "message":  f"Workers paid below NPR {MIN_WAGE_NPR:,}/month minimum wage.",
            "section":  "Section 55 + Minimum Remuneration Order",
            "action":   "Main employer must intervene and ensure minimum wage is paid."
        })
        if risk in ["low", "medium"]: risk = "high"

    if not insurance_provided:
        issues.append({
            "severity": "MEDIUM",
            "code":     "NO_INSURANCE",
            "message":  "Workers have no accident/health insurance.",
            "section":  "Section 55",
            "action":   "Require agency to provide insurance within 30 days."
        })
        if risk == "low": risk = "medium"

    return {
        "compliant":   len(issues) == 0,
        "risk_level":  risk,
        "issues":      issues,
        "issues_count":len(issues),
        "law_reference":"Labour Act 2074 (2017), Chapter 8: Outsourcing Provisions",
        "checked_at":  str(date.today()),
    }

# ── Overtime Calculator ────────────────────────────────────────
def calculate_overtime(hours_worked: float,
                        daily_rate_npr: float,
                        std_hours: float = STD_DAILY_HOURS) -> dict:
    """Calculate OT pay per Labour Act 2074 Section 32 (1.5x rate)."""
    ot_hours = max(hours_worked - std_hours, 0)
    hourly_rate = daily_rate_npr / std_hours
    ot_pay = ot_hours * hourly_rate * OT_MULTIPLIER
    return {
        "hours_worked":    hours_worked,
        "std_hours":       std_hours,
        "ot_hours":        ot_hours,
        "hourly_rate_npr": round(hourly_rate, 2),
        "ot_rate_npr":     round(hourly_rate * OT_MULTIPLIER, 2),
        "ot_pay_npr":      round(ot_pay, 2),
        "ot_multiplier":   OT_MULTIPLIER,
        "la_section":      "Labour Act 2074, Section 32",
    }

# ── Leave Entitlement ─────────────────────────────────────────
LEAVE_ENTITLEMENTS = {
    "annual":          {"days": 18, "section": "Section 36"},
    "sick":            {"days": 12, "section": "Section 38"},
    "maternity":       {"days": 98, "section": "Section 45 (14 weeks)"},
    "paternity":       {"days": 15, "section": "Section 45(4)"},
    "mourning":        {"days": 13, "section": "Section 40"},
    "festival":        {"days": 13, "section": "Section 37"},
    "study":           {"days": 12, "section": "Section 41"},
}

def get_leave_entitlement(leave_type: str, emp_type: str = "regular") -> dict:
    if emp_type in ["casual", "consultant", "outsource", "intern"]:
        return {"applicable": False, "leave_type": leave_type, "emp_type": emp_type}
    info = LEAVE_ENTITLEMENTS.get(leave_type, {"days": 0, "section": "N/A"})
    return {
        "leave_type": leave_type, "emp_type": emp_type,
        "days_entitled": info["days"], "la_section": info["section"],
        "applicable": True,
    }
