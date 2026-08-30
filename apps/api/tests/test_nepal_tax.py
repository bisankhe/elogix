"""The Nepal tax scale, checked against hand arithmetic.

Written before the engine, as the plan requires for phase 06. Every expected figure here
is worked out longhand in its comment, so a person verifying against the Finance Act can
check the test rather than the implementation — which is the point: if the statute says
something different, the test is what changes.

These numbers are **unverified**. They encode `nepal/tax.py`, which is itself a set of
defaults awaiting a named person's sign-off.
"""

from decimal import Decimal

import pytest

from elogix_api.nepal import tax


def D(v: str) -> Decimal:
    return Decimal(v)


# ── The scale ─────────────────────────────────────────────────────────


def test_income_inside_the_first_band_pays_only_social_security_tax() -> None:
    """400,000 single. All of it in the 1% band → 4,000.

    The prototype had this band at 0%, so anyone under the threshold paid nothing at all
    and the social security tax simply vanished from the payslip.
    """
    total, breakdown = tax.apply_slabs(D("400000"), tax.FY_2082_83.single)

    assert total == D("4000.00")
    assert len(breakdown) == 1
    assert breakdown[0]["rate"] == D("0.01")


def test_a_single_filer_on_seven_lakh() -> None:
    # 500,000 @ 1%  =  5,000
    # 200,000 @ 10% = 20,000
    #               = 25,000
    total, _ = tax.apply_slabs(D("700000"), tax.FY_2082_83.single)
    assert total == D("25000.00")


def test_a_single_filer_on_ten_lakh() -> None:
    # 500,000 @ 1%  =  5,000
    # 200,000 @ 10% = 20,000
    # 300,000 @ 20% = 60,000
    #               = 85,000
    total, _ = tax.apply_slabs(D("1000000"), tax.FY_2082_83.single)
    assert total == D("85000.00")


def test_a_single_filer_into_the_top_band() -> None:
    # 500,000 @ 1%   =   5,000
    # 200,000 @ 10%  =  20,000
    # 300,000 @ 20%  =  60,000
    # 1,000,000 @ 30% = 300,000
    # 500,000 @ 36%  = 180,000
    #                = 565,000
    total, _ = tax.apply_slabs(D("2500000"), tax.FY_2082_83.single)
    assert total == D("565000.00")


def test_a_married_filer_gets_a_wider_zero_band() -> None:
    """The married scale's first band is 6 lakh against a single filer's 5.

    Marital status is not cosmetic here, which is why it is a column on the employee
    record rather than a note.
    """
    single, _ = tax.apply_slabs(D("600000"), tax.FY_2082_83.single)
    married, _ = tax.apply_slabs(D("600000"), tax.FY_2082_83.married)

    # Single: 500,000 @ 1% = 5,000; 100,000 @ 10% = 10,000 → 15,000
    assert single == D("15000.00")
    # Married: all 600,000 @ 1% → 6,000
    assert married == D("6000.00")
    assert married < single


def test_the_breakdown_accounts_for_every_rupee() -> None:
    """A payslip saying only "tax: 85,000" is one nobody can check."""
    taxable = D("1000000")
    total, breakdown = tax.apply_slabs(taxable, tax.FY_2082_83.single)

    assert sum(row["amount"] for row in breakdown) == taxable
    assert sum(row["tax"] for row in breakdown) == total
    assert [row["label"] for row in breakdown] == [
        "First NPR 5 lakh",
        "Next NPR 2 lakh",
        "Next NPR 3 lakh",
    ]


@pytest.mark.parametrize("taxable", ["0", "-1", "-100000"])
def test_no_income_is_no_tax(taxable: str) -> None:
    total, breakdown = tax.apply_slabs(D(taxable), tax.FY_2082_83.single)
    assert total == D("0")
    assert breakdown == []


def test_both_published_years_are_available() -> None:
    assert set(tax.SCALES) == {"2082-83", "2083-84"}


# ── SSF ───────────────────────────────────────────────────────────────


def test_the_employee_contributes_eleven_percent_not_twenty() -> None:
    """The prototype's headline payroll bug, as a named regression.

    It summed PF 10% + gratuity 8.33% + insurance 1.67% into `ssf_employee` — but that
    20% is the *employer's* contribution. An employee on a 50,000 basic was docked
    10,000 a month instead of 5,500.
    """
    basic = D("50000")

    assert tax.money(basic * tax.SSF_EMPLOYEE_RATE) == D("5500.00")
    assert tax.money(basic * tax.SSF_EMPLOYER_RATE) == D("10000.00")
    # 31% of basic in total, split 11/20 between the two parties.
    assert D("0.31") == tax.SSF_EMPLOYEE_RATE + tax.SSF_EMPLOYER_RATE


# ── The retirement-fund allowance ─────────────────────────────────────


def test_the_allowance_takes_whichever_limit_binds_first() -> None:
    # Actually contributed is the smallest of the three.
    assert tax.retirement_fund_allowance(
        contributed=D("66000"), assessable=D("600000")
    ) == D("66000.00")

    # A third of assessable binds: 300,000 / 3 = 100,000.
    assert tax.retirement_fund_allowance(
        contributed=D("150000"), assessable=D("300000")
    ) == D("100000.00")

    # The absolute cap binds.
    assert tax.retirement_fund_allowance(
        contributed=D("900000"), assessable=D("9000000")
    ) == D("500000.00")


# ── Money handling ────────────────────────────────────────────────────


def test_money_is_decimal_and_rounds_half_up() -> None:
    """Pay is a legal amount. `0.1 + 0.2` must equal `0.3`, and half a paisa rounds up."""
    assert D("0.1") + D("0.2") == D("0.3")
    assert tax.money(D("100.005")) == D("100.01")
    assert tax.money(D("100.004")) == D("100.00")
