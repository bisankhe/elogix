"""Nepal Labour Act 2074 — statutory limits, as pure functions.

Kept apart from the attendance module on purpose. These are legal rules, not product
decisions: they need to be readable by someone checking them against the Act, testable
without a database, and citable in one place when they change.

⚠️ **Unverified.** These values are ported from the prototype's own comments, which were
never checked against the Act by a named person. The rebuild plan lists "who verifies the
tax and labour rules" as an open decision, and this module is exactly what that person
should review. Every value here is a *default* that a company's `AttendancePolicy` can
override, so a tenant is never trapped by a wrong constant.

Sources to check against: Labour Act 2074 (2017) ss. 28–34 (working hours, overtime),
and the Labour Rules 2075.
"""

from datetime import date, time

# ── Working time ──────────────────────────────────────────────────────
STANDARD_DAILY_MINUTES = 8 * 60
STANDARD_WEEKLY_MINUTES = 48 * 60

# ── Overtime ──────────────────────────────────────────────────────────
# The Act caps overtime rather than leaving it to agreement, and fixes the rate.
MAX_OVERTIME_MINUTES_PER_DAY = 4 * 60
MAX_OVERTIME_MINUTES_PER_WEEK = 24 * 60
OVERTIME_MULTIPLIER = 1.5

# ── Rest ──────────────────────────────────────────────────────────────
# One paid day of rest per week. Saturday is the customary weekly off in Nepal, unlike
# most of the world — a default of Sunday would be wrong here.
SATURDAY = 5  # Python's Monday=0 numbering
DEFAULT_WEEKLY_OFF_WEEKDAYS = (SATURDAY,)

# Minors may not be deployed on overtime at all.
MINOR_AGE = 18


def overtime_minutes(
    worked_minutes: int,
    *,
    standard_minutes: int = STANDARD_DAILY_MINUTES,
    daily_cap: int = MAX_OVERTIME_MINUTES_PER_DAY,
) -> int:
    """Overtime earned in one day, capped.

    Work beyond the cap is real — someone did it — but it is not *payable* overtime
    under the Act. Returning the capped figure keeps payroll honest; the uncapped excess
    stays visible in `worked_minutes` so a compliance report can find it.
    """
    excess = max(0, worked_minutes - standard_minutes)
    return min(excess, daily_cap)


def weekly_overtime_within_cap(
    weekly_overtime_minutes: int, *, weekly_cap: int = MAX_OVERTIME_MINUTES_PER_WEEK
) -> bool:
    return weekly_overtime_minutes <= weekly_cap


def is_minor(date_of_birth: date | None, on: date) -> bool:
    """True if the person is under 18 on the given date, and so cannot work overtime.

    An unknown date of birth returns False: the caller should surface the missing data
    rather than have this quietly treat an adult as a minor and block their overtime.
    """
    if date_of_birth is None:
        return False
    years = on.year - date_of_birth.year
    before_birthday = (on.month, on.day) < (date_of_birth.month, date_of_birth.day)
    return (years - (1 if before_birthday else 0)) < MINOR_AGE


def minutes_between(start: time, end: time) -> int:
    """Minutes from `start` to `end`, treating an end before the start as crossing
    midnight — which is how a night shift is expressed."""
    start_minutes = start.hour * 60 + start.minute
    end_minutes = end.hour * 60 + end.minute
    if end_minutes <= start_minutes:
        end_minutes += 24 * 60
    return end_minutes - start_minutes
