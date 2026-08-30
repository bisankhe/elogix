"""Attendance persistence and processing.

`compute.py` does the arithmetic; this module feeds it from the database and writes the
result back. Processing is idempotent — running it twice over the same range produces the
same rows — because the day record is derived, and a correction has to be able to trigger
a rebuild without anyone worrying about double-counting.
"""

import uuid
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.modules.attendance import compute
from elogix_api.modules.attendance.models import (
    AttendanceDay,
    AttendancePolicy,
    AttendancePunch,
    DayStatus,
    Holiday,
    RosterEntry,
    Shift,
)
from elogix_api.modules.employee.models import Employee, EmployeeStatus


def get_or_create_policy(db: Session, *, company_id: uuid.UUID) -> AttendancePolicy:
    """Every company has a policy; the first request materialises the defaults."""
    policy = db.execute(
        select(AttendancePolicy).where(AttendancePolicy.company_id == company_id)
    ).scalar_one_or_none()
    if policy is None:
        policy = AttendancePolicy(company_id=company_id)
        db.add(policy)
        db.commit()
        db.refresh(policy)
    return policy


def _policy_input(policy: AttendancePolicy) -> compute.PolicyInput:
    return compute.PolicyInput(
        weekly_off_weekdays=tuple(policy.weekly_off_weekdays),
        standard_daily_minutes=policy.standard_daily_minutes,
        max_overtime_minutes_per_day=policy.max_overtime_minutes_per_day,
        grace_minutes=policy.grace_minutes,
        half_day_minutes=policy.half_day_minutes,
    )


def process_range(
    db: Session,
    *,
    company_id: uuid.UUID,
    start: date,
    end: date,
    employee_id: uuid.UUID | None = None,
) -> int:
    """Rebuild `AttendanceDay` rows for a date range. Returns how many were written.

    Locked days are skipped: once payroll has paid a month, recomputing it must not
    silently change what someone was paid on.
    """
    if end < start:
        raise HTTPException(status.HTTP_409_CONFLICT, "The range ends before it starts")
    if (end - start).days > 366:
        raise HTTPException(status.HTTP_409_CONFLICT, "Process at most one year at a time")

    policy = get_or_create_policy(db, company_id=company_id)
    policy_input = _policy_input(policy)

    employees = _employees_in_scope(db, company_id=company_id, employee_id=employee_id)
    holidays = {
        h.holiday_date
        for h in db.execute(
            select(Holiday).where(
                Holiday.company_id == company_id,
                Holiday.holiday_date.between(start, end),
                Holiday.is_optional.is_(False),
            )
        ).scalars()
    }

    punches_by_key = _punches_by_key(db, company_id=company_id, start=start, end=end)
    # Approved leave, so a day off on approved leave reads as `leave` rather than
    # `absent`. Imported here rather than at module scope: leave depends on attendance
    # for its calendar and its worked-days accrual, so a top-level import is a cycle.
    from elogix_api.modules.leave.service import approved_leave_dates

    on_leave = approved_leave_dates(db, company_id=company_id, start=start, end=end)
    rosters = _rosters_by_key(db, company_id=company_id, start=start, end=end)
    shifts = {
        s.id: s
        for s in db.execute(select(Shift).where(Shift.company_id == company_id)).scalars()
    }
    existing = _existing_days(db, company_id=company_id, start=start, end=end)

    written = 0
    for employee in employees:
        day = start
        while day <= end:
            # Nothing before someone joined, and nothing after they left.
            if day < employee.joined_on or (employee.exited_on and day > employee.exited_on):
                day += timedelta(days=1)
                continue

            key = (employee.id, day)
            record = existing.get(key)
            if record is not None and record.is_locked:
                day += timedelta(days=1)
                continue

            shift_row = shifts.get(rosters.get(key)) if key in rosters else None
            shift_input = (
                compute.ShiftInput(
                    starts_at=shift_row.starts_at,
                    ends_at=shift_row.ends_at,
                    break_minutes=shift_row.break_minutes,
                )
                if shift_row
                else None
            )

            result = compute.compute_day(
                work_date=day,
                punches=punches_by_key.get(key, []),
                shift=shift_input,
                policy=policy_input,
                is_holiday=day in holidays,
                is_on_leave=key in on_leave,
            )

            if record is None:
                record = AttendanceDay(
                    company_id=company_id, employee_id=employee.id, work_date=day
                )
                db.add(record)
                existing[key] = record

            record.shift_id = shift_row.id if shift_row else None
            record.first_in = result.first_in
            record.last_out = result.last_out
            record.worked_minutes = result.worked_minutes
            record.late_minutes = result.late_minutes
            record.early_out_minutes = result.early_out_minutes
            record.overtime_minutes = result.overtime_minutes
            record.status = DayStatus(result.status)
            record.remarks = "; ".join(result.remarks) or None
            written += 1

            day += timedelta(days=1)

    db.commit()
    return written


def _employees_in_scope(
    db: Session, *, company_id: uuid.UUID, employee_id: uuid.UUID | None
) -> list[Employee]:
    stmt = select(Employee).where(Employee.company_id == company_id)
    if employee_id is not None:
        stmt = stmt.where(Employee.id == employee_id)
    else:
        # Someone who has left still needs their final month processed, so exited
        # employees are included; the per-day joined/exited guard handles the bounds.
        stmt = stmt.where(Employee.status != EmployeeStatus.SUSPENDED)
    return list(db.execute(stmt).scalars().all())


def _punches_by_key(
    db: Session, *, company_id: uuid.UUID, start: date, end: date
) -> dict[tuple[uuid.UUID, date], list[compute.PunchInput]]:
    rows = db.execute(
        select(AttendancePunch)
        .where(
            AttendancePunch.company_id == company_id,
            AttendancePunch.work_date.between(start, end),
        )
        .order_by(AttendancePunch.punched_at)
    ).scalars()

    grouped: dict[tuple[uuid.UUID, date], list[compute.PunchInput]] = {}
    for row in rows:
        grouped.setdefault((row.employee_id, row.work_date), []).append(
            compute.PunchInput(punched_at=row.punched_at, is_in=row.direction == "in")
        )
    return grouped


def _rosters_by_key(
    db: Session, *, company_id: uuid.UUID, start: date, end: date
) -> dict[tuple[uuid.UUID, date], uuid.UUID]:
    rows = db.execute(
        select(RosterEntry).where(
            RosterEntry.company_id == company_id,
            RosterEntry.work_date.between(start, end),
        )
    ).scalars()
    return {(r.employee_id, r.work_date): r.shift_id for r in rows}


def _existing_days(
    db: Session, *, company_id: uuid.UUID, start: date, end: date
) -> dict[tuple[uuid.UUID, date], AttendanceDay]:
    rows = db.execute(
        select(AttendanceDay).where(
            AttendanceDay.company_id == company_id,
            AttendanceDay.work_date.between(start, end),
        )
    ).scalars()
    return {(r.employee_id, r.work_date): r for r in rows}
