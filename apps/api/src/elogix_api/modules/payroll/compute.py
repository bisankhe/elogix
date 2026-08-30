"""One payslip, computed.

A pure function over `Decimal`, with no session and no models, because payroll is the
one thing in this system that a person will sit down and check by hand. Anything that
makes that harder — an ORM in the middle, a float, an implicit rounding — is a defect in
itself.

**The order of operations is the whole thing**, and it is where the prototype went
wrong. It ran:

    monthly_gross = basic + allowances - ssf_employee      ← relief taken once
    annual        = monthly_gross * 12 + incentive * 12    ← incentive counted twice
    taxable       = annual - arf_allowance                 ← relief taken again

So the SSF contribution reduced income *and* was claimed as a retirement-fund
allowance, and incentives were annualised twice. Here, gross is gross: contributions are
relieved once, through the allowance, and nothing is annualised more than once.
"""

from dataclasses import dataclass, field
from decimal import Decimal

from elogix_api.nepal import tax
from elogix_api.nepal.tax import ZERO, money


@dataclass(frozen=True, slots=True)
class EarningLine:
    code: str
    label: str
    amount: Decimal
    # Most allowances are taxable; a few reimbursements are not.
    taxable: bool = True
    # Whether a partial month scales it. Basic and most allowances prorate; a fixed
    # reimbursement usually does not.
    prorates: bool = True


@dataclass(frozen=True, slots=True)
class DeductionLine:
    code: str
    label: str
    amount: Decimal


@dataclass(frozen=True, slots=True)
class PayslipInput:
    """Everything one payslip needs, and nothing that has to be looked up."""

    basic: Decimal
    earnings: tuple[EarningLine, ...] = ()
    deductions: tuple[DeductionLine, ...] = ()

    # From the attendance export. `payable_days` counts present, leave, holiday and
    # weekly-off days; `month_days` is the divisor the company prorates on.
    payable_days: Decimal = Decimal("30")
    month_days: Decimal = Decimal("30")
    overtime_minutes: int = 0

    # From the employee record.
    is_married: bool = False
    is_female: bool = False
    contributes_to_ssf: bool = True

    # Annual, claimed once a year but relieved monthly.
    festival_bonus: Decimal = ZERO
    life_insurance_premium: Decimal = ZERO
    health_insurance_premium: Decimal = ZERO

    tax_year: str = "2082-83"
    overtime_multiplier: Decimal = Decimal("1.5")
    standard_daily_minutes: int = 8 * 60


@dataclass
class Payslip:
    gross: Decimal = ZERO
    basic_earned: Decimal = ZERO
    overtime_pay: Decimal = ZERO
    taxable_gross: Decimal = ZERO

    ssf_employee: Decimal = ZERO
    ssf_employer: Decimal = ZERO

    annual_assessable: Decimal = ZERO
    retirement_allowance: Decimal = ZERO
    insurance_allowance: Decimal = ZERO
    annual_taxable: Decimal = ZERO
    annual_tax: Decimal = ZERO
    female_rebate: Decimal = ZERO
    monthly_tax: Decimal = ZERO

    other_deductions: Decimal = ZERO
    total_deductions: Decimal = ZERO
    net_pay: Decimal = ZERO

    earnings: list[dict] = field(default_factory=list)
    deductions: list[dict] = field(default_factory=list)
    tax_breakdown: list[dict] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def compute_payslip(data: PayslipInput) -> Payslip:
    slip = Payslip()

    # ── Proration ─────────────────────────────────────────────────────
    # A month is paid on payable days over the company's divisor. Attendance decides
    # payable days; payroll does not second-guess it.
    ratio = (
        (data.payable_days / data.month_days) if data.month_days > ZERO else Decimal("1")
    )
    if ratio > Decimal("1"):
        ratio = Decimal("1")
        slip.notes.append("payable days exceeded the month; capped at a full month")

    slip.basic_earned = money(data.basic * ratio)
    slip.earnings.append(
        {"code": "BASIC", "label": "Basic salary", "amount": slip.basic_earned}
    )

    taxable_gross = slip.basic_earned
    gross = slip.basic_earned

    for line in data.earnings:
        amount = money(line.amount * ratio) if line.prorates else money(line.amount)
        gross += amount
        if line.taxable:
            taxable_gross += amount
        slip.earnings.append({"code": line.code, "label": line.label, "amount": amount})

    # ── Overtime ──────────────────────────────────────────────────────
    # Rated on basic, at the statutory multiplier. The hourly rate comes from the
    # *full* basic and the standard month, not the prorated figure: someone who was
    # absent for a week is not paid a lower overtime rate for the hours they did work.
    if data.overtime_minutes > 0:
        standard_monthly_minutes = Decimal(data.standard_daily_minutes) * data.month_days
        if standard_monthly_minutes > ZERO:
            per_minute = data.basic / standard_monthly_minutes
            slip.overtime_pay = money(
                per_minute * Decimal(data.overtime_minutes) * data.overtime_multiplier
            )
            gross += slip.overtime_pay
            taxable_gross += slip.overtime_pay
            slip.earnings.append(
                {
                    "code": "OT",
                    "label": f"Overtime ({data.overtime_minutes} min @ "
                    f"{data.overtime_multiplier}x)",
                    "amount": slip.overtime_pay,
                }
            )

    slip.gross = money(gross)
    slip.taxable_gross = money(taxable_gross)

    # ── SSF ───────────────────────────────────────────────────────────
    # 11% employee, 20% employer, both on basic. The employer's share is reported but
    # never deducted from the employee — that was the prototype's costliest bug.
    if data.contributes_to_ssf:
        slip.ssf_employee = money(data.basic * tax.SSF_EMPLOYEE_RATE)
        slip.ssf_employer = money(data.basic * tax.SSF_EMPLOYER_RATE)
        slip.deductions.append(
            {"code": "SSF", "label": "SSF employee contribution (11%)", "amount": slip.ssf_employee}
        )

    # ── Annualise ─────────────────────────────────────────────────────
    # Gross is gross. The contribution is *not* subtracted here; it is relieved once,
    # below, through the retirement-fund allowance.
    slip.annual_assessable = money(slip.taxable_gross * Decimal("12") + data.festival_bonus)

    slip.retirement_allowance = tax.retirement_fund_allowance(
        contributed=slip.ssf_employee * Decimal("12"),
        assessable=slip.annual_assessable,
    )
    slip.insurance_allowance = money(
        min(data.life_insurance_premium, tax.LIFE_INSURANCE_CAP)
        + min(data.health_insurance_premium, tax.HEALTH_INSURANCE_CAP)
    )

    slip.annual_taxable = money(
        max(
            ZERO,
            slip.annual_assessable - slip.retirement_allowance - slip.insurance_allowance,
        )
    )

    # ── Tax ───────────────────────────────────────────────────────────
    scale = tax.SCALES.get(data.tax_year, tax.FY_2082_83)
    slabs = scale.married if data.is_married else scale.single
    gross_tax, slip.tax_breakdown = tax.apply_slabs(slip.annual_taxable, slabs)

    if data.is_female:
        # Income Tax Act s.88: a resident woman with only employment income.
        slip.female_rebate = money(gross_tax * tax.FEMALE_REBATE)

    slip.annual_tax = money(gross_tax - slip.female_rebate)
    slip.monthly_tax = money(slip.annual_tax / Decimal("12"))
    if slip.monthly_tax > ZERO:
        slip.deductions.append(
            {"code": "TDS", "label": "Income tax (TDS)", "amount": slip.monthly_tax}
        )

    # ── Net ───────────────────────────────────────────────────────────
    for line in data.deductions:
        amount = money(line.amount)
        slip.other_deductions += amount
        slip.deductions.append({"code": line.code, "label": line.label, "amount": amount})

    slip.total_deductions = money(
        slip.ssf_employee + slip.monthly_tax + slip.other_deductions
    )
    slip.net_pay = money(slip.gross - slip.total_deductions)

    if slip.net_pay < ZERO:
        slip.notes.append("deductions exceed gross pay; net is negative and needs review")

    return slip
