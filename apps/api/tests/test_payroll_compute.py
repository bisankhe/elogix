"""Payslips, reconciled against hand arithmetic.

Phase 06's done-when: 'a payroll run reconciles against hand-calculated payslips for a
set of fixture employees covering every slab and marital status'. This file is that
reconciliation, and it was written before the engine.

Each fixture works its figures out longhand in the docstring. A person checking these
against the Finance Act should be able to read the comment and never open compute.py —
and if the statute disagrees, the comment and the expectation are what change.

**The numbers are unverified** and nobody may be paid from them until someone named has
signed them off.
"""

from decimal import Decimal

import pytest

from elogix_api.modules.payroll.compute import (
    DeductionLine,
    EarningLine,
    PayslipInput,
    compute_payslip,
)
from elogix_api.nepal import tax


def D(v: str) -> Decimal:
    return Decimal(v)


# ── The reconciliation fixtures ───────────────────────────────────────


def test_single_filer_full_month_no_allowances() -> None:
    """Basic 50,000. Single. Full month. Contributing to SSF.

    Gross            = 50,000
    SSF employee     = 50,000 x 11%          =  5,500
    SSF employer     = 50,000 x 20%          = 10,000  (reported, never deducted)
    Annual assessable= 50,000 x 12           = 600,000
    Retirement relief= min(5,500 x 12 = 66,000, 600,000/3 = 200,000, 500,000) = 66,000
    Annual taxable   = 600,000 - 66,000      = 534,000
    Tax   500,000 @ 1%  = 5,000
           34,000 @ 10% = 3,400
                        = 8,400
    Monthly tax      = 8,400 / 12            =   700
    Net              = 50,000 - 5,500 - 700  = 43,800
    """
    slip = compute_payslip(PayslipInput(basic=D("50000")))

    assert slip.gross == D("50000.00")
    assert slip.ssf_employee == D("5500.00")
    assert slip.ssf_employer == D("10000.00")
    assert slip.annual_assessable == D("600000.00")
    assert slip.retirement_allowance == D("66000.00")
    assert slip.annual_taxable == D("534000.00")
    assert slip.annual_tax == D("8400.00")
    assert slip.monthly_tax == D("700.00")
    assert slip.net_pay == D("43800.00")


def test_married_filer_pays_less_on_the_same_pay() -> None:
    """Basic 50,000. Married. Everything else identical to the fixture above.

    Annual taxable   = 534,000 (unchanged)
    Tax   534,000 all inside the married 6-lakh 1% band = 5,340
    Monthly tax      = 445
    Net              = 50,000 - 5,500 - 445 = 44,055
    """
    slip = compute_payslip(PayslipInput(basic=D("50000"), is_married=True))

    assert slip.annual_taxable == D("534000.00")
    assert slip.annual_tax == D("5340.00")
    assert slip.monthly_tax == D("445.00")
    assert slip.net_pay == D("44055.00")


def test_a_woman_takes_the_ten_percent_rebate() -> None:
    """Basic 50,000. Single, female. Income Tax Act s.88.

    Gross tax        = 8,400
    Rebate 10%       =   840
    Annual tax       = 7,560
    Monthly tax      =   630
    Net              = 50,000 - 5,500 - 630 = 43,870
    """
    slip = compute_payslip(PayslipInput(basic=D("50000"), is_female=True))

    assert slip.female_rebate == D("840.00")
    assert slip.annual_tax == D("7560.00")
    assert slip.monthly_tax == D("630.00")
    assert slip.net_pay == D("43870.00")


def test_allowances_and_a_festival_bonus() -> None:
    """Basic 60,000 + 10,000 allowance. Single. One month's basic as festival bonus.

    Gross            = 70,000
    SSF employee     = 60,000 x 11%              =  6,600  (on basic, not gross)
    Annual assessable= 70,000 x 12 + 60,000      = 900,000
    Retirement relief= min(79,200, 300,000, 500,000) = 79,200
    Annual taxable   = 900,000 - 79,200          = 820,800
    Tax   500,000 @ 1%  =  5,000
          200,000 @ 10% = 20,000
          120,800 @ 20% = 24,160
                        = 49,160
    Monthly tax      = 49,160 / 12               = 4,096.67
    Net              = 70,000 - 6,600 - 4,096.67 = 59,303.33
    """
    slip = compute_payslip(
        PayslipInput(
            basic=D("60000"),
            earnings=(EarningLine(code="ALW", label="Allowance", amount=D("10000")),),
            festival_bonus=D("60000"),
        )
    )

    assert slip.gross == D("70000.00")
    assert slip.ssf_employee == D("6600.00")
    assert slip.annual_assessable == D("900000.00")
    assert slip.annual_taxable == D("820800.00")
    assert slip.annual_tax == D("49160.00")
    assert slip.monthly_tax == D("4096.67")
    assert slip.net_pay == D("59303.33")


def test_a_high_earner_reaches_the_top_band() -> None:
    """Basic 300,000. Single. No allowances.

    Annual assessable = 3,600,000
    Retirement relief = min(33,000 x 12 = 396,000, 1,200,000, 500,000) = 396,000
    Annual taxable    = 3,204,000
    Tax     500,000 @ 1%  =   5,000
            200,000 @ 10% =  20,000
            300,000 @ 20% =  60,000
          1,000,000 @ 30% = 300,000
          1,204,000 @ 36% = 433,440
                          = 818,440
    Monthly tax       = 68,203.33
    Net               = 300,000 - 33,000 - 68,203.33 = 198,796.67
    """
    slip = compute_payslip(PayslipInput(basic=D("300000")))

    assert slip.ssf_employee == D("33000.00")
    assert slip.retirement_allowance == D("396000.00")
    assert slip.annual_taxable == D("3204000.00")
    assert slip.annual_tax == D("818440.00")
    assert slip.net_pay == D("198796.67")


def test_a_partial_month_is_prorated_on_payable_days() -> None:
    """Basic 30,000, 15 payable days of 30. Not contributing to SSF.

    Basic earned     = 30,000 x 15/30 = 15,000
    Annual assessable= 15,000 x 12    = 180,000
    Tax   180,000 @ 1%                = 1,800
    Monthly tax                       =   150
    Net              = 15,000 - 150   = 14,850
    """
    slip = compute_payslip(
        PayslipInput(
            basic=D("30000"),
            payable_days=D("15"),
            month_days=D("30"),
            contributes_to_ssf=False,
        )
    )

    assert slip.basic_earned == D("15000.00")
    assert slip.ssf_employee == D("0")
    assert slip.annual_taxable == D("180000.00")
    assert slip.net_pay == D("14850.00")


def test_overtime_is_paid_at_one_and_a_half_times_basic() -> None:
    """Basic 48,000, 10 hours of overtime, a 30-day month of 8-hour days.

    Standard monthly minutes = 8 x 60 x 30 = 14,400
    Per minute               = 48,000 / 14,400 = 3.3333…
    Overtime  600 min x 3.3333… x 1.5          = 3,000
    Gross                    = 51,000
    """
    slip = compute_payslip(PayslipInput(basic=D("48000"), overtime_minutes=600))

    assert slip.overtime_pay == D("3000.00")
    assert slip.gross == D("51000.00")


def test_the_overtime_rate_is_not_diluted_by_absence() -> None:
    """Someone absent half the month is still paid the full rate for hours they worked.

    Rating overtime off prorated basic would quietly pay a lower hourly rate to whoever
    had already lost pay — penalising the same absence twice.
    """
    full = compute_payslip(PayslipInput(basic=D("48000"), overtime_minutes=600))
    partial = compute_payslip(
        PayslipInput(basic=D("48000"), overtime_minutes=600, payable_days=D("15"))
    )

    assert partial.overtime_pay == full.overtime_pay
    assert partial.basic_earned < full.basic_earned


# ── The prototype's defects, as named regressions ─────────────────────


def test_the_ssf_contribution_is_relieved_once_not_twice() -> None:
    """The prototype subtracted SSF from gross *and* claimed it as retirement relief.

    Assessable income must be built from gross pay. On a 50,000 basic that is 600,000 a
    year; the prototype would have annualised 44,500 into 534,000 and then deducted the
    66,000 allowance on top, reaching 468,000 and under-taxing by 66,000 of income.
    """
    slip = compute_payslip(PayslipInput(basic=D("50000")))

    assert slip.annual_assessable == D("600000.00"), "gross must not be net of SSF"
    assert slip.annual_taxable == D("534000.00")
    # The wrong answer, for contrast.
    assert slip.annual_taxable != D("468000.00")


def test_the_employer_contribution_is_never_deducted_from_the_employee() -> None:
    """The prototype charged the employee the employer's 20%.

    On a 50,000 basic that is 10,000 a month taken instead of 5,500 — 54,000 a year of
    someone else's money, out of one person's pay.
    """
    slip = compute_payslip(PayslipInput(basic=D("50000")))

    assert slip.ssf_employee == D("5500.00")
    assert slip.ssf_employer == D("10000.00")
    assert slip.total_deductions == slip.ssf_employee + slip.monthly_tax
    assert slip.net_pay == D("43800.00")
    # What the prototype would have paid.
    assert slip.net_pay != D("39300.00")


def test_an_earning_is_counted_exactly_once() -> None:
    """The prototype annualised incentives inside monthly gross and again separately.

    A 5,000 incentive on a 50,000 basic should add 60,000 to assessable income, not
    120,000.
    """
    without = compute_payslip(PayslipInput(basic=D("50000")))
    with_incentive = compute_payslip(
        PayslipInput(
            basic=D("50000"),
            earnings=(EarningLine(code="INC", label="Incentive", amount=D("5000")),),
        )
    )

    assert with_incentive.annual_assessable - without.annual_assessable == D("60000.00")


def test_the_first_band_charges_the_social_security_tax() -> None:
    """The prototype's first band sat at 0%, so the 1% simply vanished."""
    slip = compute_payslip(
        PayslipInput(basic=D("20000"), contributes_to_ssf=False)
    )

    # 240,000 a year, entirely inside the first band → 2,400.
    assert slip.annual_taxable == D("240000.00")
    assert slip.annual_tax == D("2400.00")
    assert slip.annual_tax > D("0"), "the social security tax must not be zero-rated"


# ── Edges ─────────────────────────────────────────────────────────────


def test_a_non_taxable_reimbursement_is_paid_but_not_taxed() -> None:
    slip = compute_payslip(
        PayslipInput(
            basic=D("50000"),
            earnings=(
                EarningLine(
                    code="FUEL", label="Fuel reimbursement", amount=D("5000"), taxable=False
                ),
            ),
        )
    )

    assert slip.gross == D("55000.00")
    assert slip.taxable_gross == D("50000.00")
    assert slip.annual_assessable == D("600000.00")


def test_insurance_relief_is_capped() -> None:
    slip = compute_payslip(
        PayslipInput(
            basic=D("50000"),
            life_insurance_premium=D("100000"),
            health_insurance_premium=D("50000"),
        )
    )

    assert slip.insurance_allowance == tax.LIFE_INSURANCE_CAP + tax.HEALTH_INSURANCE_CAP


def test_deductions_beyond_gross_are_flagged_rather_than_hidden() -> None:
    slip = compute_payslip(
        PayslipInput(
            basic=D("20000"),
            deductions=(DeductionLine(code="LOAN", label="Loan", amount=D("30000")),),
        )
    )

    assert slip.net_pay < D("0")
    assert any("negative" in n for n in slip.notes)


def test_a_zero_payable_month_pays_nothing() -> None:
    slip = compute_payslip(
        PayslipInput(basic=D("50000"), payable_days=D("0"), contributes_to_ssf=False)
    )

    assert slip.basic_earned == D("0")
    assert slip.gross == D("0")
    assert slip.net_pay == D("0")


@pytest.mark.parametrize("year", ["2082-83", "2083-84"])
def test_both_tax_years_compute(year: str) -> None:
    slip = compute_payslip(PayslipInput(basic=D("50000"), tax_year=year))
    assert slip.net_pay > D("0")


def test_the_payslip_itemises_every_line() -> None:
    """A payslip nobody can check is a payslip nobody will trust."""
    slip = compute_payslip(
        PayslipInput(
            basic=D("50000"),
            earnings=(EarningLine(code="ALW", label="Allowance", amount=D("5000")),),
            overtime_minutes=120,
        )
    )

    assert [e["code"] for e in slip.earnings] == ["BASIC", "ALW", "OT"]
    assert sum(e["amount"] for e in slip.earnings) == slip.gross
    assert sum(d["amount"] for d in slip.deductions) == slip.total_deductions
    assert sum(row["tax"] for row in slip.tax_breakdown) + slip.female_rebate == slip.annual_tax
