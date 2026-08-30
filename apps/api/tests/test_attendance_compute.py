"""The attendance arithmetic, tested without a database.

`compute.py` is a pure function precisely so these can be read by someone checking the
Labour Act rather than the ORM. Payroll multiplies these numbers by money, so each case
here is a figure someone could be paid on.
"""

from datetime import UTC, date, datetime, time

import pytest

from elogix_api.modules.attendance import compute
from elogix_api.nepal import labour

# A Monday, so it is a working day under the default Saturday-off policy.
WORKDAY = date(2026, 3, 2)
SATURDAY = date(2026, 3, 7)

DAY_SHIFT = compute.ShiftInput(starts_at=time(9, 0), ends_at=time(18, 0), break_minutes=60)
NIGHT_SHIFT = compute.ShiftInput(starts_at=time(22, 0), ends_at=time(6, 0), break_minutes=60)

POLICY = compute.PolicyInput(
    weekly_off_weekdays=(labour.SATURDAY,),
    standard_daily_minutes=8 * 60,
    max_overtime_minutes_per_day=4 * 60,
    grace_minutes=10,
    half_day_minutes=4 * 60,
)


def at(hour: int, minute: int = 0, *, day: date = WORKDAY) -> datetime:
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=UTC)


def punches(*pairs: tuple[datetime, bool]) -> list[compute.PunchInput]:
    return [compute.PunchInput(punched_at=moment, is_in=is_in) for moment, is_in in pairs]


# ── Pairing ───────────────────────────────────────────────────────────


def test_a_clean_in_and_out_pair() -> None:
    intervals, anomalies = compute.pair_punches(punches((at(9), True), (at(18), False)))
    assert len(intervals) == 1
    assert anomalies == []


def test_multiple_sessions_across_a_day() -> None:
    """Two sessions around an unpunched lunch — the common real pattern."""
    intervals, anomalies = compute.pair_punches(
        punches((at(9), True), (at(13), False), (at(14), True), (at(18), False))
    )
    assert len(intervals) == 2
    assert anomalies == []


def test_a_missing_out_is_reported_not_invented() -> None:
    """The whole point: never fabricate the missing half of a pair."""
    intervals, anomalies = compute.pair_punches(punches((at(9), True)))
    assert intervals == []
    assert any("missing OUT" in a for a in anomalies)


def test_an_orphan_out_is_reported() -> None:
    intervals, anomalies = compute.pair_punches(punches((at(18), False)))
    assert intervals == []
    assert any("no matching IN" in a for a in anomalies)


def test_two_consecutive_ins_discard_the_first() -> None:
    intervals, anomalies = compute.pair_punches(
        punches((at(9), True), (at(10), True), (at(18), False))
    )
    # The 10:00 IN wins, so eight hours are credited rather than nine.
    assert len(intervals) == 1
    assert intervals[0][0] == at(10)
    assert any("missing OUT" in a for a in anomalies)


def test_punches_out_of_order_are_sorted_first() -> None:
    intervals, _ = compute.pair_punches(punches((at(18), False), (at(9), True)))
    assert len(intervals) == 1


# ── A normal day ──────────────────────────────────────────────────────


def test_a_full_day_is_present_with_no_overtime() -> None:
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9), True), (at(13), False), (at(14), True), (at(18), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    assert result.status == "present"
    assert result.worked_minutes == 8 * 60
    assert result.overtime_minutes == 0
    assert result.late_minutes == 0


def test_an_unpunched_lunch_break_is_deducted() -> None:
    """Nobody punches out for lunch, and counting it as worked invents an hour of
    overtime for every employee on every ordinary day — then pays it at 1.5x."""
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9), True), (at(18), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    assert result.worked_minutes == 8 * 60, "the scheduled break should come off"
    assert result.overtime_minutes == 0


def test_a_punched_break_is_not_deducted_twice() -> None:
    """A full hour was already punched out, so nothing further is taken off."""
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9), True), (at(13), False), (at(14), True), (at(19), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    # 4h + 5h punched, an hour of break already excluded by the gap.
    assert result.worked_minutes == 9 * 60
    assert result.overtime_minutes == 60


def test_a_short_punched_break_deducts_only_the_shortfall() -> None:
    """Twenty minutes taken against a sixty-minute scheduled break: forty come off."""
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches(
            (at(9), True), (at(13), False), (at(13, 20), True), (at(18), False)
        ),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    # 4h + 4h40 punched = 8h40, less the 40-minute shortfall = 8h.
    assert result.worked_minutes == 8 * 60
    assert result.overtime_minutes == 0


def test_no_punches_is_absent() -> None:
    result = compute.compute_day(
        work_date=WORKDAY, punches=[], shift=DAY_SHIFT, policy=POLICY
    )
    assert result.status == "absent"
    assert result.worked_minutes == 0


def test_a_short_day_is_a_half_day() -> None:
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9), True), (at(12), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    assert result.status == "half_day"
    # No break deducted: someone who left at noon did not sit through lunch.
    assert result.worked_minutes == 3 * 60


# ── Lateness ──────────────────────────────────────────────────────────


def test_arriving_within_grace_is_not_late() -> None:
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9, 8), True), (at(18), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    assert result.late_minutes == 0


def test_grace_forgives_the_minutes_it_does_not_move_the_deadline() -> None:
    """11 minutes late with 10 minutes' grace is 11 minutes late, not 1.

    The opposite reading — grace shifting the start time — would quietly hand everyone a
    permanently later start, which is a policy change disguised as a rounding rule.
    """
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9, 11), True), (at(18), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    assert result.late_minutes == 11


def test_leaving_before_the_shift_ends_records_early_out() -> None:
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9), True), (at(17), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    assert result.early_out_minutes == 60


# ── Overtime, and the statutory cap ───────────────────────────────────


def test_overtime_accrues_beyond_the_scheduled_shift() -> None:
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9), True), (at(20), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    # 11 hours on the premises, less the unpunched hour of lunch, against an 8-hour shift.
    assert result.worked_minutes == 10 * 60
    assert result.overtime_minutes == 2 * 60


def test_overtime_is_capped_at_the_statutory_daily_maximum() -> None:
    """Labour Act 2074 caps overtime at 4 hours a day. Work beyond it is recorded but
    not payable, and the excess is flagged rather than hidden."""
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches((at(9), True), (at(23), False)),
        shift=DAY_SHIFT,
        policy=POLICY,
    )
    assert result.worked_minutes == 13 * 60  # 14 on the premises, less the lunch hour
    assert result.overtime_minutes == 4 * 60  # capped, not 5
    assert any("beyond the statutory daily overtime cap" in r for r in result.remarks)


def test_the_cap_helper_matches_the_act() -> None:
    assert labour.overtime_minutes(9 * 60) == 60
    assert labour.overtime_minutes(20 * 60) == labour.MAX_OVERTIME_MINUTES_PER_DAY
    assert labour.overtime_minutes(6 * 60) == 0


def test_the_weekly_cap_is_twenty_four_hours() -> None:
    assert labour.weekly_overtime_within_cap(24 * 60) is True
    assert labour.weekly_overtime_within_cap(24 * 60 + 1) is False


# ── Non-working days ──────────────────────────────────────────────────


def test_saturday_is_the_weekly_off_in_nepal() -> None:
    """A Sunday default would be wrong here, and wrong quietly."""
    result = compute.compute_day(
        work_date=SATURDAY, punches=[], shift=None, policy=POLICY
    )
    assert result.status == "weekly_off"


def test_work_on_a_weekly_off_is_entirely_overtime() -> None:
    result = compute.compute_day(
        work_date=SATURDAY,
        punches=punches((at(10, day=SATURDAY), True), (at(13, day=SATURDAY), False)),
        shift=None,
        policy=POLICY,
    )
    assert result.status == "weekly_off"
    # No scheduled hours to work through first: every minute is overtime.
    assert result.worked_minutes == 3 * 60
    assert result.overtime_minutes == 3 * 60


def test_the_daily_overtime_cap_applies_on_a_rest_day_too() -> None:
    """Five hours on a Saturday is still capped at four payable, and the excess is
    disclosed exactly as it would be on a working day."""
    result = compute.compute_day(
        work_date=SATURDAY,
        punches=punches((at(10, day=SATURDAY), True), (at(15, day=SATURDAY), False)),
        shift=None,
        policy=POLICY,
    )
    assert result.worked_minutes == 5 * 60
    assert result.overtime_minutes == 4 * 60
    assert any("beyond the statutory daily overtime cap" in r for r in result.remarks)


def test_a_holiday_beats_an_ordinary_working_day() -> None:
    result = compute.compute_day(
        work_date=WORKDAY, punches=[], shift=DAY_SHIFT, policy=POLICY, is_holiday=True
    )
    assert result.status == "holiday"


def test_leave_beats_a_holiday() -> None:
    """Precedence matters: someone on approved leave over a public holiday should read
    as on leave, so the leave ledger and the register agree."""
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=[],
        shift=DAY_SHIFT,
        policy=POLICY,
        is_holiday=True,
        is_on_leave=True,
    )
    assert result.status == "leave"


# ── Night shift ───────────────────────────────────────────────────────


def test_a_night_shift_crossing_midnight_is_measured_correctly() -> None:
    """22:00–06:00 is eight hours, not minus sixteen. The prototype stored times as
    'HH:MM' strings, which cannot express this at all."""
    assert labour.minutes_between(time(22, 0), time(6, 0)) == 8 * 60
    assert NIGHT_SHIFT.scheduled_minutes == 7 * 60  # 8 hours less the 1-hour break


def test_a_night_shift_worked_past_midnight_is_not_marked_early() -> None:
    result = compute.compute_day(
        work_date=WORKDAY,
        punches=punches(
            (at(22), True), (at(6, day=date(2026, 3, 3)), False)
        ),
        shift=NIGHT_SHIFT,
        policy=POLICY,
    )
    # 22:00-06:00 is an eight-hour span; the scheduled shift is seven paid hours plus
    # an hour's break, and the break was not punched.
    assert result.worked_minutes == 7 * 60
    assert result.early_out_minutes == 0
    assert result.late_minutes == 0


@pytest.mark.parametrize(
    ("dob", "on", "expected"),
    [
        (date(2010, 1, 1), date(2026, 1, 1), True),
        (date(2008, 1, 2), date(2026, 1, 1), True),
        (date(2008, 1, 1), date(2026, 1, 1), False),
        (None, date(2026, 1, 1), False),
    ],
)
def test_minor_check_for_the_overtime_prohibition(
    dob: date | None, on: date, expected: bool
) -> None:
    """Minors may not be deployed on overtime at all under the Act."""
    assert labour.is_minor(dob, on) is expected
