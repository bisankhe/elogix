"""Turning punches into a day.

This is the only place attendance arithmetic happens, and it is deliberately a pure
function over plain values — no session, no models. Payroll reads its output, so it has
to be checkable line by line by someone who does not want to read SQLAlchemy.

The pairing rule is the subtle part. A day's punches are an ordered stream that may be
ragged: a missed out, a double in, a break that was never punched back from. Rather than
guess, unmatched punches are reported and the day is flagged, because a silently-invented
pair is how someone gets paid for hours they did not work.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta

from elogix_api.nepal import labour

# String constants rather than importing the enum: this module stays free of model
# imports, so it can be reviewed and tested entirely on its own.
DayStatus_PRESENT = "present"
DayStatus_HALF_DAY = "half_day"
DayStatus_ABSENT = "absent"
DayStatus_WEEKLY_OFF = "weekly_off"
DayStatus_HOLIDAY = "holiday"
DayStatus_LEAVE = "leave"


@dataclass(frozen=True, slots=True)
class PunchInput:
    punched_at: datetime
    is_in: bool


@dataclass(frozen=True, slots=True)
class ShiftInput:
    starts_at: time
    ends_at: time
    break_minutes: int

    @property
    def scheduled_minutes(self) -> int:
        return labour.minutes_between(self.starts_at, self.ends_at) - self.break_minutes


@dataclass(frozen=True, slots=True)
class PolicyInput:
    weekly_off_weekdays: tuple[int, ...]
    standard_daily_minutes: int
    max_overtime_minutes_per_day: int
    grace_minutes: int
    half_day_minutes: int


@dataclass
class DayResult:
    status: str
    first_in: datetime | None = None
    last_out: datetime | None = None
    worked_minutes: int = 0
    late_minutes: int = 0
    early_out_minutes: int = 0
    overtime_minutes: int = 0
    remarks: list[str] = field(default_factory=list)


def pair_punches(
    punches: list[PunchInput],
) -> tuple[list[tuple[datetime, datetime]], list[str]]:
    """Fold an ordered punch stream into worked intervals.

    Returns the intervals and a list of anomalies. Two consecutive INs mean the first
    was never closed; an OUT with no open IN is orphaned. Both are surfaced rather than
    repaired, so a supervisor decides what happened instead of the system inventing it.
    """
    intervals: list[tuple[datetime, datetime]] = []
    anomalies: list[str] = []
    open_in: datetime | None = None

    for punch in sorted(punches, key=lambda p: p.punched_at):
        if punch.is_in:
            if open_in is not None:
                anomalies.append(
                    f"missing OUT for the IN at {open_in:%H:%M}; that entry was discarded"
                )
            open_in = punch.punched_at
        else:
            if open_in is None:
                anomalies.append(f"OUT at {punch.punched_at:%H:%M} with no matching IN")
                continue
            if punch.punched_at < open_in:
                anomalies.append("an OUT preceded its IN; ignored")
                open_in = None
                continue
            intervals.append((open_in, punch.punched_at))
            open_in = None

    if open_in is not None:
        anomalies.append(f"missing OUT for the IN at {open_in:%H:%M}")

    return intervals, anomalies


def compute_day(
    *,
    work_date: date,
    punches: list[PunchInput],
    shift: ShiftInput | None,
    policy: PolicyInput,
    is_holiday: bool = False,
    is_on_leave: bool = False,
) -> DayResult:
    """The whole daily calculation.

    Precedence matters and is deliberate: leave beats holiday beats weekly off. Someone
    on approved leave on a public holiday should not have the leave consumed, and the
    record should say *leave* so the leave ledger and the attendance register agree.
    """
    worked, anomalies = _worked_minutes(punches)
    has_attendance = worked > 0
    worked = _less_unpunched_break(worked, punches=punches, shift=shift)

    # Non-working days first. Work on one is still recorded — it is overtime, and on a
    # weekly off or holiday every worked minute qualifies.
    if is_on_leave:
        return _non_working(DayStatus_LEAVE, punches, worked, anomalies, policy)
    if is_holiday:
        return _non_working(DayStatus_HOLIDAY, punches, worked, anomalies, policy)
    if work_date.weekday() in policy.weekly_off_weekdays:
        return _non_working(DayStatus_WEEKLY_OFF, punches, worked, anomalies, policy)

    if not has_attendance:
        return DayResult(status=DayStatus_ABSENT, remarks=anomalies)

    first_in = min(p.punched_at for p in punches)
    last_out = max(p.punched_at for p in punches)

    late = 0
    early = 0
    if shift is not None:
        expected_in = datetime.combine(work_date, shift.starts_at, tzinfo=first_in.tzinfo)
        # Lateness beyond the grace period only. Grace forgives the minutes, it does not
        # shift the deadline: 11 minutes late with 10 minutes' grace is 11 late, not 1.
        if first_in > expected_in + timedelta(minutes=policy.grace_minutes):
            late = int((first_in - expected_in).total_seconds() // 60)

        expected_out = datetime.combine(work_date, shift.ends_at, tzinfo=first_in.tzinfo)
        if shift.ends_at <= shift.starts_at:
            expected_out += timedelta(days=1)
        if last_out < expected_out:
            early = int((expected_out - last_out).total_seconds() // 60)

    standard = shift.scheduled_minutes if shift else policy.standard_daily_minutes
    overtime = labour.overtime_minutes(
        worked, standard_minutes=standard, daily_cap=policy.max_overtime_minutes_per_day
    )
    if worked - standard > policy.max_overtime_minutes_per_day:
        anomalies.append(
            f"worked {worked - standard - policy.max_overtime_minutes_per_day} minutes "
            "beyond the statutory daily overtime cap; the excess is unpaid"
        )

    status = DayStatus_PRESENT if worked >= policy.half_day_minutes else DayStatus_HALF_DAY

    return DayResult(
        status=status,
        first_in=first_in,
        last_out=last_out,
        worked_minutes=worked,
        late_minutes=late,
        early_out_minutes=early,
        overtime_minutes=overtime,
        remarks=anomalies,
    )


def _less_unpunched_break(
    worked: int, *, punches: list[PunchInput], shift: ShiftInput | None
) -> int:
    """Deduct any break the employee did not punch out for.

    Most people never punch for lunch: they punch in at 09:00, out at 18:00, and the
    hour they spent eating is invisible in the stream. Counting that hour as worked made
    every single ordinary day show an hour of overtime — nine hours "worked" against an
    eight-hour shift — which payroll would then pay at 1.5x, for everyone, every day.

    Gaps that *were* punched already reduce `worked`, so only the shortfall against the
    shift's scheduled break is taken off. Someone who punched a full lunch loses nothing
    twice; someone who punched none has the whole break deducted. The deduction never
    takes worked time below the shift's scheduled hours: someone who left at noon did
    not sit through a lunch break, and docking them for one would turn a short day into
    an even shorter one.

    This applies to holidays, weekly offs and leave days too, and that is the whole
    reason it lives in its own function rather than inside the ordinary-day branch where
    it started. The same punches read as eight hours on a Tuesday and nine on a public
    holiday, which is the register contradicting itself.

    Payable overtime was not affected by that, and the reason is worth stating so nobody
    "simplifies" this back: the deduction only bites above the shift's scheduled minutes
    and the statutory daily cap is lower still, so both figures clear the cap. The
    damage was to `worked_minutes`, which is what working-hours compliance reads.
    """
    if shift is None or not shift.break_minutes or not punches:
        return worked

    first_in = min(p.punched_at for p in punches)
    last_out = max(p.punched_at for p in punches)
    span = int((last_out - first_in).total_seconds() // 60)

    break_taken = max(0, span - worked)
    unpunched_break = max(0, shift.break_minutes - break_taken)
    deductible = max(0, worked - shift.scheduled_minutes)
    return worked - min(unpunched_break, deductible)


def _worked_minutes(punches: list[PunchInput]) -> tuple[int, list[str]]:
    intervals, anomalies = pair_punches(punches)
    total = sum(int((end - start).total_seconds() // 60) for start, end in intervals)
    return total, anomalies


def _non_working(
    status: str,
    punches: list[PunchInput],
    worked: int,
    anomalies: list[str],
    policy: PolicyInput,
) -> DayResult:
    """A non-working day. Every worked minute is overtime — still subject to the cap."""
    if worked == 0:
        return DayResult(status=status, remarks=anomalies)

    payable = min(worked, policy.max_overtime_minutes_per_day)
    remarks = [*anomalies, f"worked {worked} minutes on a {status.replace('_', ' ')}"]
    # Same disclosure as an ordinary day: hours beyond the statutory cap were worked but
    # are not payable, and that must be visible rather than quietly dropped.
    if worked > payable:
        remarks.append(
            f"worked {worked - payable} minutes beyond the statutory daily overtime cap; "
            "the excess is unpaid"
        )

    return DayResult(
        status=status,
        first_in=min(p.punched_at for p in punches),
        last_out=max(p.punched_at for p in punches),
        worked_minutes=worked,
        overtime_minutes=payable,
        remarks=remarks,
    )

