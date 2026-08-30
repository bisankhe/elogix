"""Nepal Labour Act 2074 — what is owed when employment ends, as pure functions.

⚠️ **Unverified.** Like `labour.py` and `tax.py`, every value here is a *default* that
a company policy row can override, and none has been checked against the Act by a named
person. `tax_scales.is_verified` gates payroll from shipping; this module belongs in the
same sign-off. Sources to check: Labour Act 2074 ss. 145–157 (termination, notice,
gratuity, final payment) and the Social Security Act 2075.

The prototype's version of this is the worst code in that repository, and it is worth
stating exactly why so nobody ports it. From
`legacy/backend/routes/settlement_documents_routes.py`:

    insight = generate_ai_insights({"type": "fnf_computation", ...})
    ...
    "salary": insight.get("unpaid_salary_npr", ...),
    "leave":  insight.get("leave_encashment_npr", 0),
    "pf":     insight.get("pf_employer_npr", 0),

A statutory payout, asked of a language model, and inserted as the amount owed. The tax
engine at least did arithmetic. Everything here is arithmetic over rows that already
exist, and every figure a settlement reports can be traced to the ledger or register it
came from.

**The gratuity rule is the one to read carefully.** The prototype charged
`basic × 0.0833 × months_service` and commented it "Nepal SSF rule". But the employer's
20% SSF contribution is *composed of* PF 10% + gratuity 8.33% + insurance 1.67% — see
`tax.py`, where getting that composition wrong was defect #1 of five. For an employee
whose employer has been paying SSF monthly, the gratuity has already been paid, every
month, into the fund. Paying it again at exit pays it twice. So gratuity accrues here
only for someone *not* enrolled in SSF, and `EmployeeSalary.contributes_to_ssf` is what
decides. That reasoning is sound but it is still not a lawyer's; it needs the same
sign-off as the slabs.
"""

from datetime import date
from decimal import Decimal

# ── Final payment deadline ────────────────────────────────────────────
# The prototype tracked a 15-day deadline and surfaced overdue settlements, which is a
# strong hint the obligation is real even though its arithmetic was not.
SETTLEMENT_DEADLINE_DAYS = 15

# ── Gratuity ──────────────────────────────────────────────────────────
# 8.33% of basic per month of service — one month's basic for each year worked. This is
# the employer's gratuity share, the same 8.33% that makes up part of the 20% SSF
# contribution, which is exactly why it is not owed twice.
GRATUITY_RATE_PER_MONTH = Decimal("0.0833")

# No gratuity before this much service. Zero is deliberate and conservative: the Act ties
# gratuity to the SSF contribution from the first month for enrolled staff, and a
# qualifying period invented here would silently withhold money from short-service
# leavers. If the Act does impose one, this is the single place to set it.
GRATUITY_MINIMUM_SERVICE_MONTHS = 0

# ── Notice ────────────────────────────────────────────────────────────
# Notice length is per employment category (`EmploymentCategory.notice_days`), not a
# constant — a permanent employee and a casual one are not owed the same. What is
# constant is the rule that unserved notice is paid rather than waived.
NOTICE_PAY_ON_UNSERVED = True


def months_of_service(joined_on: date, last_working_day: date) -> int:
    """Completed months between the two dates.

    Completed, not started. Someone who joined on the 1st and leaves on the 15th of the
    following month has served one month, not two — the prototype's version counted the
    calendar difference and paid for a month nobody worked.
    """
    if last_working_day < joined_on:
        return 0

    months = (last_working_day.year - joined_on.year) * 12 + (
        last_working_day.month - joined_on.month
    )
    if last_working_day.day < joined_on.day:
        months -= 1
    return max(0, months)


def gratuity(
    *,
    basic: Decimal,
    joined_on: date,
    last_working_day: date,
    contributes_to_ssf: bool,
    rate_per_month: Decimal = GRATUITY_RATE_PER_MONTH,
) -> tuple[Decimal, str]:
    """Gratuity owed on exit, and the reason for the figure.

    Returns the reason as well as the amount because zero is the interesting case: an
    employee reading a settlement that shows no gratuity is entitled to know whether it
    was never earned or already paid, and a bare `0.00` says neither.
    """
    if contributes_to_ssf:
        return Decimal("0"), (
            "Nil — gratuity is already paid monthly as part of the employer's 20% SSF "
            "contribution, of which 8.33% is the gratuity share. Paying it again here "
            "would pay it twice."
        )

    months = months_of_service(joined_on, last_working_day)
    if months < GRATUITY_MINIMUM_SERVICE_MONTHS:
        return Decimal("0"), (
            f"Nil — {months} completed month(s) of service is below the "
            f"{GRATUITY_MINIMUM_SERVICE_MONTHS}-month qualifying period."
        )

    amount = basic * rate_per_month * months
    return amount, (
        f"{months} completed month(s) of service at {rate_per_month * 100:.2f}% of "
        f"basic per month. Not an SSF contributor, so gratuity is owed directly."
    )


def notice_pay(
    *,
    basic: Decimal,
    notice_days: int,
    days_served: int,
) -> tuple[Decimal, str]:
    """Pay in lieu of notice the employee did not serve.

    Prorated on a 30-day month, which is the same convention payroll uses for a monthly
    salary. Serving the full notice, or more, owes nothing.
    """
    shortfall = max(0, notice_days - days_served)
    if shortfall == 0:
        return Decimal("0"), (
            f"Nil — {days_served} day(s) of notice served against {notice_days} required."
        )

    amount = basic / Decimal("30") * shortfall
    return amount, (
        f"{shortfall} day(s) of unserved notice out of {notice_days}, at basic / 30 per day."
    )


def deadline(last_working_day: date) -> date:
    """When the settlement must be paid by."""
    from datetime import timedelta

    return last_working_day + timedelta(days=SETTLEMENT_DEADLINE_DAYS)
