"""The settlement engine, against hand calculation.

`test_nepal_settlement.py` proves the statutory rules. This proves the assembly: that
the right lines appear, that the signs point the right way, and that the tax charged is
the marginal charge rather than one of the two wrong answers that are easy to reach.

Every expected figure is worked out in the docstring above the assertion. A settlement
nobody can reproduce by hand is a settlement nobody can defend to the person owed it.
"""

from dataclasses import replace
from datetime import date
from decimal import Decimal

import pytest

from elogix_api.modules.settlement import compute
from elogix_api.modules.settlement.compute import (
    Adjustment,
    ExitInitiator,
    LeaveBalance,
    LineKind,
    SettlementInput,
)
from elogix_api.nepal import tax

SINGLE = tax.FY_2082_83.single


def line(result: compute.Settlement, code: str) -> compute.SettlementLine | None:
    return next((line for line in result.lines if line.code == code), None)


# A contributor on 60,000 basic, three years in, leaving cleanly. Tests vary one thing
# at a time from here with `replace`, which stays typed — a `**dict` of defaults does not.
BASE = SettlementInput(
    basic=Decimal("60000"),
    joined_on=date(2023, 4, 1),
    last_working_day=date(2026, 3, 31),
    contributes_to_ssf=True,
    initiator=ExitInitiator.NEITHER,
)


def base(**overrides: object) -> SettlementInput:
    return replace(BASE, **overrides)


# ── Unpaid salary ─────────────────────────────────────────────────────


def test_unpaid_salary_is_prorated_on_the_month_divisor() -> None:
    """12 payable days on a 60,000 basic over a 30-day month.

    60000 / 30 = 2000 per day; 12 × 2000 = 24,000.00
    """
    result = compute.compute_settlement(
        base(unpaid_days=Decimal("12"), unpaid_from=date(2026, 3, 20)), slabs=SINGLE
    )

    salary = line(result, "UNPAID_SALARY")
    assert salary is not None
    assert salary.amount == Decimal("24000.00")
    assert "12 payable day(s) since 2026-03-20" in salary.basis


def test_nothing_unpaid_produces_no_line_at_all() -> None:
    """Someone paid right up to their last day has no salary line, rather than a
    zero one. A settlement should list what is owed, not every line that could exist."""
    result = compute.compute_settlement(base(), slabs=SINGLE)
    assert line(result, "UNPAID_SALARY") is None


# ── Leave encashment ──────────────────────────────────────────────────


def test_leave_is_encashed_at_the_same_daily_rate_as_salary() -> None:
    """11.5 days of home leave on a 60,000 basic.

    60000 / 30 = 2000 per day; 11.5 × 2000 = 23,000.00
    """
    result = compute.compute_settlement(
        base(
            encashable_leave=(
                LeaveBalance(
                    leave_type_id="x", code="HOME", name="Home Leave", days=Decimal("11.5")
                ),
            )
        ),
        slabs=SINGLE,
    )

    encashment = line(result, "LEAVE_ENCASH_HOME")
    assert encashment is not None
    assert encashment.amount == Decimal("23000.00")
    assert "11.5 unused day(s) of Home Leave" in encashment.basis


def test_a_zero_or_negative_balance_is_not_encashed() -> None:
    """An over-taken balance is a debt to sort out, not a negative payment to make."""
    result = compute.compute_settlement(
        base(
            encashable_leave=(
                LeaveBalance(leave_type_id="a", code="HOME", name="Home", days=Decimal("0")),
                LeaveBalance(leave_type_id="b", code="SICK", name="Sick", days=Decimal("-3")),
            )
        ),
        slabs=SINGLE,
    )

    assert line(result, "LEAVE_ENCASH_HOME") is None
    assert line(result, "LEAVE_ENCASH_SICK") is None


# ── Gratuity ──────────────────────────────────────────────────────────


def test_an_ssf_contributor_gets_a_nil_gratuity_line_that_explains_itself() -> None:
    """The line appears even at nil, because the explanation is the point.

    This is the regression for the prototype's `basic × 0.0833 × months` with a
    comment calling it the "Nepal SSF rule" — for an enrolled employee that pays the
    gratuity a second time, having already paid it monthly into the fund.
    """
    result = compute.compute_settlement(base(contributes_to_ssf=True), slabs=SINGLE)

    gratuity = line(result, "GRATUITY")
    assert gratuity is not None
    assert gratuity.amount == Decimal("0.00")
    assert "already paid monthly" in gratuity.basis


def test_a_non_contributor_is_paid_gratuity_on_completed_months() -> None:
    """2023-04-01 to 2026-03-31 is 35 completed months, not 36 — a day short of the
    third anniversary.

    35 × 60000 × 0.0833 = 174,930.00
    """
    result = compute.compute_settlement(base(contributes_to_ssf=False), slabs=SINGLE)

    gratuity = line(result, "GRATUITY")
    assert gratuity is not None
    assert gratuity.amount == Decimal("174930.00")


# ── Notice, and which way it points ───────────────────────────────────


def test_an_employer_who_terminates_without_notice_pays_for_it() -> None:
    """30 days required, none served, 60,000 basic.

    60000 / 30 × 30 = 60,000.00, owed *to* the employee.
    """
    result = compute.compute_settlement(
        base(
            initiator=ExitInitiator.EMPLOYER,
            notice_days_required=30,
            notice_days_served=0,
        ),
        slabs=SINGLE,
    )

    notice = line(result, "NOTICE_PAY")
    assert notice is not None
    assert notice.kind is LineKind.EARNING
    assert notice.amount == Decimal("60000.00")
    assert "owed to the employee" in notice.basis


def test_an_employee_who_walks_out_has_it_recovered() -> None:
    """The same 60,000, on the other side of the settlement.

    Getting this sign backwards moves money in the wrong direction, which is why the
    initiator is required input rather than an assumption.
    """
    result = compute.compute_settlement(
        base(
            initiator=ExitInitiator.EMPLOYEE,
            notice_days_required=30,
            notice_days_served=0,
        ),
        slabs=SINGLE,
    )

    notice = line(result, "NOTICE_PAY")
    assert notice is not None
    assert notice.kind is LineKind.DEDUCTION
    assert notice.amount == Decimal("60000.00")
    assert "recovered" in notice.basis


def test_retirement_or_contract_expiry_raises_no_notice_line() -> None:
    """Nobody failed to give notice, so there is nothing to settle either way."""
    result = compute.compute_settlement(
        base(
            initiator=ExitInitiator.NEITHER,
            notice_days_required=30,
            notice_days_served=0,
        ),
        slabs=SINGLE,
    )
    assert line(result, "NOTICE_PAY") is None


def test_notice_fully_served_raises_no_line_either_way() -> None:
    result = compute.compute_settlement(
        base(
            initiator=ExitInitiator.EMPLOYEE,
            notice_days_required=30,
            notice_days_served=30,
        ),
        slabs=SINGLE,
    )
    assert line(result, "NOTICE_PAY") is None


# ── Tax: the marginal charge ──────────────────────────────────────────


def test_the_settlement_is_taxed_at_the_marginal_rate_not_in_isolation() -> None:
    """Someone already at 720,000 taxable for the year, receiving 100,000 more.

    FY 2082-83 single: 500,000 @ 1%, then 200,000 @ 10%, then 300,000 @ 20%.
      tax on 720,000 = 5,000 + 20,000 + (20,000 × 20%) = 29,000
      tax on 820,000 = 5,000 + 20,000 + (120,000 × 20%) = 49,000
      marginal       = 20,000.00

    Taxing the 100,000 in isolation would charge 1,000 — the first slab — and taxing it
    annualised would charge on 1,200,000. Only the difference matches the leaver's own
    annual return.
    """
    result = compute.compute_settlement(
        base(
            encashable_leave=(
                LeaveBalance(
                    leave_type_id="x", code="HOME", name="Home", days=Decimal("50")
                ),
            ),
            ytd_taxable=Decimal("720000"),
            ytd_tax_withheld=Decimal("29000"),
        ),
        slabs=SINGLE,
    )

    # 50 days × 2,000 = 100,000 of taxable earnings.
    assert result.taxable_earnings == Decimal("100000.00")
    assert result.tax == Decimal("20000.00")


def test_tax_under_withheld_earlier_in_the_year_is_collected_here() -> None:
    """Same figures, but only 25,000 was withheld against a 29,000 liability.

    marginal 20,000 + shortfall 4,000 = 24,000.00 — and the note says so, because this
    is the last payment in which it can be collected.
    """
    result = compute.compute_settlement(
        base(
            encashable_leave=(
                LeaveBalance(
                    leave_type_id="x", code="HOME", name="Home", days=Decimal("50")
                ),
            ),
            ytd_taxable=Decimal("720000"),
            ytd_tax_withheld=Decimal("25000"),
        ),
        slabs=SINGLE,
    )

    assert result.tax == Decimal("24000.00")
    assert any("under-withheld" in note for note in result.notes)


def test_over_withholding_is_not_refunded_out_of_the_settlement() -> None:
    """A year over-withheld by 10,000 still pays the full marginal 20,000 here.

    An employer netting a refund off a final payment is deciding a tax question that
    belongs to the tax office and the employee's annual return.
    """
    result = compute.compute_settlement(
        base(
            encashable_leave=(
                LeaveBalance(
                    leave_type_id="x", code="HOME", name="Home", days=Decimal("50")
                ),
            ),
            ytd_taxable=Decimal("720000"),
            ytd_tax_withheld=Decimal("39000"),
        ),
        slabs=SINGLE,
    )

    assert result.tax == Decimal("20000.00")


# ── Adjustments and totals ────────────────────────────────────────────


def test_a_manual_deduction_reduces_the_net_and_keeps_its_reason() -> None:
    """25 days' leave (50,000) less a 15,000 salary advance.

    gross 50,000 − deductions 15,000 − tax = net. At 0 year-to-date, 50,000 falls
    entirely in the 1% band: 500.00 tax. 50,000 − 15,000 − 500 = 34,500.00
    """
    result = compute.compute_settlement(
        base(
            encashable_leave=(
                LeaveBalance(
                    leave_type_id="x", code="HOME", name="Home", days=Decimal("25")
                ),
            ),
            adjustments=(
                Adjustment(
                    kind=LineKind.DEDUCTION,
                    label="Salary advance",
                    amount=Decimal("15000"),
                    reason="Advance taken 2026-02-10, unrecovered",
                ),
            ),
        ),
        slabs=SINGLE,
    )

    assert result.gross_earnings == Decimal("50000.00")
    assert result.total_deductions == Decimal("15000.00")
    assert result.tax == Decimal("500.00")
    assert result.net_payable == Decimal("34500.00")

    adjustment = line(result, "ADJUSTMENT")
    assert adjustment is not None
    assert adjustment.basis == "Advance taken 2026-02-10, unrecovered"


def test_a_non_taxable_adjustment_is_paid_but_not_taxed() -> None:
    """An expense reimbursement is not income. It raises the gross and the net, and
    leaves the taxable figure alone."""
    result = compute.compute_settlement(
        base(
            adjustments=(
                Adjustment(
                    kind=LineKind.EARNING,
                    label="Outstanding expense claim",
                    amount=Decimal("8000"),
                    reason="Field travel, approved 2026-03-15",
                    taxable=False,
                ),
            )
        ),
        slabs=SINGLE,
    )

    assert result.gross_earnings == Decimal("8000.00")
    assert result.taxable_earnings == Decimal("0.00")
    assert result.tax == Decimal("0.00")
    assert result.net_payable == Decimal("8000.00")


def test_a_settlement_that_owes_the_company_money_says_so_rather_than_paying_it() -> None:
    """Deductions beyond what is owed is a recovery, and a recovery is a human
    decision — not something to hand to a payment run."""
    result = compute.compute_settlement(
        base(
            initiator=ExitInitiator.EMPLOYEE,
            notice_days_required=30,
            notice_days_served=0,
        ),
        slabs=SINGLE,
    )

    assert result.net_payable < Decimal("0")
    assert any("net recovery" in note for note in result.notes)


def test_the_deadline_is_recorded_on_every_settlement() -> None:
    """Fifteen days from the last working day, and the reason the record exists."""
    result = compute.compute_settlement(base(), slabs=SINGLE)
    assert result.deadline == date(2026, 4, 15)


@pytest.mark.parametrize("field_name", ["gross_earnings", "total_deductions", "tax", "net_payable"])
def test_every_total_is_a_decimal(field_name: str) -> None:
    """Money is Decimal, never float — a settlement is argued about line by line."""
    result = compute.compute_settlement(base(), slabs=SINGLE)
    assert isinstance(getattr(result, field_name), Decimal)
