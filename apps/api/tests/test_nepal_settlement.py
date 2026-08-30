"""The settlement rules, tested without a database.

Every expectation here is hand-calculated in its docstring. These are amounts a person
is legally owed on the day they stop working, and a figure nobody can reproduce by hand
is a figure nobody can defend.
"""

from datetime import date
from decimal import Decimal

import pytest

from elogix_api.nepal import settlement

# ── Service length ────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("joined", "last_day", "expected"),
    [
        # Exactly one year: 2024-01-15 → 2025-01-15 is twelve completed months.
        (date(2024, 1, 15), date(2025, 1, 15), 12),
        # One day short of the anniversary is eleven, not twelve.
        (date(2024, 1, 15), date(2025, 1, 14), 11),
        # Same month, no completed month at all.
        (date(2024, 1, 1), date(2024, 1, 31), 0),
        # The prototype's bug: calendar-month difference paid for a month nobody worked.
        # 2024-01-31 → 2024-02-15 is a difference of one month but zero completed.
        (date(2024, 1, 31), date(2024, 2, 15), 0),
        (date(2020, 6, 10), date(2026, 3, 31), 69),
        # An exit before the joining date is nonsense, not a negative.
        (date(2026, 1, 1), date(2025, 1, 1), 0),
    ],
)
def test_completed_months_of_service(joined: date, last_day: date, expected: int) -> None:
    assert settlement.months_of_service(joined, last_day) == expected


# ── Gratuity ──────────────────────────────────────────────────────────


def test_an_ssf_contributor_is_owed_no_further_gratuity() -> None:
    """The regression that matters most.

    The employer's 20% SSF contribution is PF 10% + gratuity 8.33% + insurance 1.67%.
    Someone enrolled has had gratuity paid into the fund every month of their service,
    so paying it again at exit pays it twice — the same shape as the prototype's
    triple-deducted SSF, on the other side of the ledger.
    """
    amount, reason = settlement.gratuity(
        basic=Decimal("50000"),
        joined_on=date(2020, 1, 1),
        last_working_day=date(2026, 1, 1),
        contributes_to_ssf=True,
    )

    assert amount == Decimal("0")
    assert "already paid monthly" in reason
    assert "twice" in reason


def test_a_non_contributor_is_owed_gratuity_directly() -> None:
    """Six years' service on a 50,000 basic, not enrolled in SSF.

    72 completed months × 50,000 × 0.0833 = 299,880.00
    """
    amount, reason = settlement.gratuity(
        basic=Decimal("50000"),
        joined_on=date(2020, 1, 1),
        last_working_day=date(2026, 1, 1),
        contributes_to_ssf=False,
    )

    assert amount == Decimal("299880.0000")
    assert "72 completed month(s)" in reason


def test_zero_gratuity_always_says_why() -> None:
    """An employee reading a nil figure is entitled to know whether it was never earned
    or already paid. A bare 0.00 says neither."""
    paid, paid_reason = settlement.gratuity(
        basic=Decimal("50000"),
        joined_on=date(2025, 1, 1),
        last_working_day=date(2026, 1, 1),
        contributes_to_ssf=True,
    )
    unearned, unearned_reason = settlement.gratuity(
        basic=Decimal("50000"),
        joined_on=date(2026, 1, 1),
        last_working_day=date(2026, 1, 15),
        contributes_to_ssf=False,
    )

    assert paid == unearned == Decimal("0")
    assert paid_reason != unearned_reason


def test_gratuity_is_decimal_not_float() -> None:
    """Money is argued about. 0.1 + 0.2 must equal 0.3."""
    amount, _ = settlement.gratuity(
        basic=Decimal("33333.33"),
        joined_on=date(2025, 1, 1),
        last_working_day=date(2026, 1, 1),
        contributes_to_ssf=False,
    )
    assert isinstance(amount, Decimal)
    # 12 × 33333.33 × 0.0833 = 33325.9967... — exact, not a float approximation.
    assert amount == Decimal("33333.33") * Decimal("0.0833") * 12


# ── Notice ────────────────────────────────────────────────────────────


def test_unserved_notice_is_paid_at_basic_over_thirty() -> None:
    """30 days required, 10 served, 20 short, on a 45,000 basic.

    45000 / 30 = 1500 per day; 20 × 1500 = 30,000.00
    """
    amount, reason = settlement.notice_pay(
        basic=Decimal("45000"), notice_days=30, days_served=10
    )

    assert amount == Decimal("30000")
    assert "20 day(s) of unserved notice" in reason


def test_full_notice_owes_nothing() -> None:
    amount, reason = settlement.notice_pay(
        basic=Decimal("45000"), notice_days=30, days_served=30
    )
    assert amount == Decimal("0")
    assert "Nil" in reason


def test_serving_more_notice_than_required_is_not_a_negative_payment() -> None:
    """Working past your notice does not mean you owe the company money."""
    amount, _ = settlement.notice_pay(
        basic=Decimal("45000"), notice_days=30, days_served=45
    )
    assert amount == Decimal("0")


def test_a_category_with_no_notice_period_owes_no_notice_pay() -> None:
    """A casual contract has `notice_days=0`; nothing is unserved."""
    amount, _ = settlement.notice_pay(
        basic=Decimal("45000"), notice_days=0, days_served=0
    )
    assert amount == Decimal("0")


# ── Deadline ──────────────────────────────────────────────────────────


def test_the_settlement_deadline_is_fifteen_days_after_the_last_working_day() -> None:
    assert settlement.deadline(date(2026, 3, 31)) == date(2026, 4, 15)


def test_the_deadline_crosses_a_month_boundary_correctly() -> None:
    """A naive day-of-month addition would produce 2026-02-35."""
    assert settlement.deadline(date(2026, 1, 25)) == date(2026, 2, 9)
