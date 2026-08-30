"""Nepal Labour Act 2074 — statutory leave entitlements.

⚠️ **Unverified**, exactly as `nepal.labour` is. These figures are ported from the
prototype's own documentation and have not been checked against the Act by a named
person. They are seeded *defaults*: a company's `LeaveType` rows are editable, so a
tenant is never trapped by a wrong constant here.

Two things about Nepali leave that a generic HRMS gets wrong:

* **Home leave accrues from days worked, not from the calendar.** One day for every
  twenty worked, so someone who was absent for a month accrues less. That makes leave
  accrual depend on the attendance register — the two modules genuinely are coupled.
* **Sick and home leave accumulate across years, up to a ceiling, and the excess is
  encashable rather than forfeited.** A "use it or lose it" default would quietly
  deprive people of money they are owed.

Sources to check against: Labour Act 2074 (2017) ss. 40–47, and Labour Rules 2075.
"""

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum


class AccrualMethod(StrEnum):
    ANNUAL_GRANT = "annual_grant"
    MONTHLY_ACCRUAL = "monthly_accrual"
    PER_DAYS_WORKED = "per_days_worked"
    # Granted only when the event happens — maternity, mourning. No standing balance.
    ON_EVENT = "on_event"


@dataclass(frozen=True, slots=True)
class StatutoryLeave:
    code: str
    name: str
    nepali_name: str
    accrual_method: AccrualMethod
    days_per_year: Decimal
    # For PER_DAYS_WORKED: one day of leave per this many days worked.
    days_worked_per_day_earned: int | None
    max_accumulation_days: Decimal
    encashable_above_days: Decimal | None
    requires_document_after_days: int | None
    probation_eligible: bool
    is_paid: bool


HOME = StatutoryLeave(
    code="HL",
    name="Home Leave",
    nepali_name="घर बिदा",
    accrual_method=AccrualMethod.PER_DAYS_WORKED,
    days_per_year=Decimal("18"),  # ~1 per 20 worked over a 360-day working year
    days_worked_per_day_earned=20,
    max_accumulation_days=Decimal("90"),
    encashable_above_days=Decimal("90"),
    requires_document_after_days=None,
    probation_eligible=False,
    is_paid=True,
)

SICK = StatutoryLeave(
    code="SL",
    name="Sick Leave",
    nepali_name="बिरामी बिदा",
    accrual_method=AccrualMethod.ANNUAL_GRANT,
    days_per_year=Decimal("12"),
    days_worked_per_day_earned=None,
    max_accumulation_days=Decimal("45"),
    encashable_above_days=Decimal("45"),
    requires_document_after_days=3,
    probation_eligible=True,
    is_paid=True,
)

MATERNITY = StatutoryLeave(
    code="ML",
    name="Maternity Leave",
    nepali_name="प्रसूति बिदा",
    accrual_method=AccrualMethod.ON_EVENT,
    # 98 days total, of which 60 are paid by the employer.
    days_per_year=Decimal("98"),
    days_worked_per_day_earned=None,
    max_accumulation_days=Decimal("0"),
    encashable_above_days=None,
    requires_document_after_days=None,
    probation_eligible=True,
    is_paid=True,
)

PATERNITY = StatutoryLeave(
    code="PL",
    name="Paternity Leave",
    nepali_name="पितृत्व बिदा",
    accrual_method=AccrualMethod.ON_EVENT,
    days_per_year=Decimal("15"),
    days_worked_per_day_earned=None,
    max_accumulation_days=Decimal("0"),
    encashable_above_days=None,
    requires_document_after_days=None,
    probation_eligible=True,
    is_paid=True,
)

MOURNING = StatutoryLeave(
    code="MR",
    name="Mourning Leave (Kiriya Bida)",
    nepali_name="किरिया बिदा",
    accrual_method=AccrualMethod.ON_EVENT,
    days_per_year=Decimal("13"),
    days_worked_per_day_earned=None,
    max_accumulation_days=Decimal("0"),
    encashable_above_days=None,
    requires_document_after_days=None,
    probation_eligible=True,
    is_paid=True,
)

UNPAID = StatutoryLeave(
    code="UL",
    name="Unpaid Leave",
    nepali_name="बेतलबी बिदा",
    accrual_method=AccrualMethod.ON_EVENT,
    days_per_year=Decimal("0"),
    days_worked_per_day_earned=None,
    max_accumulation_days=Decimal("0"),
    encashable_above_days=None,
    requires_document_after_days=None,
    probation_eligible=True,
    is_paid=False,
)

STATUTORY_LEAVE_TYPES = (HOME, SICK, MATERNITY, PATERNITY, MOURNING, UNPAID)


def accrual_for_days_worked(
    days_worked: int, *, days_worked_per_day_earned: int
) -> Decimal:
    """Home leave: one day earned per N days worked.

    Deliberately floors rather than rounding. A fraction of a day earned is not yet a
    day, and rounding up would hand out entitlement nobody worked for — the sort of
    quiet generosity that only shows up in an audit.
    """
    if days_worked_per_day_earned <= 0:
        return Decimal("0")
    return Decimal(days_worked // days_worked_per_day_earned)


def capped(balance: Decimal, *, ceiling: Decimal) -> tuple[Decimal, Decimal]:
    """Split a balance at its statutory ceiling.

    Returns `(kept, excess)`. The excess is not forfeited — under the Act it becomes
    encashable — so the caller records it rather than dropping it.
    """
    if ceiling <= 0 or balance <= ceiling:
        return balance, Decimal("0")
    return ceiling, balance - ceiling
