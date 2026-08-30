"""Leave accrual, balances and approval.

Two things here are worth reading carefully, because both are places a leave system
usually goes quietly wrong.

**Balances are summed, never stored.** `balance_for` is a SQL aggregate over the ledger.
Approval inserts consumption rows inside the same transaction that flips the request's
status, so there is no read-modify-write window for two approvers to race through.

**Leave is counted in working days.** A Friday-to-Monday request over a Saturday weekly
off is three days, not four, and a public holiday inside a fortnight's leave is not
deducted from the entitlement. This uses the same calendar the attendance register uses,
so the two cannot disagree.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from elogix_api.modules.attendance.models import AttendanceDay, DayStatus, Holiday
from elogix_api.modules.attendance.service import get_or_create_policy
from elogix_api.modules.employee.models import Employee, EmployeeStatus
from elogix_api.modules.leave.models import (
    DayPortion,
    LeaveLedgerEntry,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
    LedgerEntryKind,
)
from elogix_api.nepal import leave as statutory
from elogix_api.nepal.leave import AccrualMethod

ZERO = Decimal("0")
HALF = Decimal("0.5")


# ── Calendar ──────────────────────────────────────────────────────────


def working_days(
    db: Session, *, company_id: uuid.UUID, start: date, end: date
) -> list[date]:
    """The days in a range that are actually working days for this company."""
    policy = get_or_create_policy(db, company_id=company_id)
    weekly_off = set(policy.weekly_off_weekdays)
    holidays = {
        h
        for (h,) in db.execute(
            select(Holiday.holiday_date).where(
                Holiday.company_id == company_id,
                Holiday.holiday_date.between(start, end),
                Holiday.is_optional.is_(False),
            )
        ).all()
    }

    days: list[date] = []
    day = start
    while day <= end:
        if day.weekday() not in weekly_off and day not in holidays:
            days.append(day)
        day += timedelta(days=1)
    return days


# ── Balances ──────────────────────────────────────────────────────────


def balance_for(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    leave_type_id: uuid.UUID,
    leave_year: int,
) -> Decimal:
    """The balance, as the sum of its ledger. No stored counter to drift."""
    total = db.execute(
        select(func.coalesce(func.sum(LeaveLedgerEntry.days), 0)).where(
            LeaveLedgerEntry.company_id == company_id,
            LeaveLedgerEntry.employee_id == employee_id,
            LeaveLedgerEntry.leave_type_id == leave_type_id,
            LeaveLedgerEntry.leave_year == leave_year,
        )
    ).scalar_one()
    return Decimal(total)


def _post(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    leave_type_id: uuid.UUID,
    leave_year: int,
    entry_date: date,
    kind: LedgerEntryKind,
    days: Decimal,
    request_id: uuid.UUID | None = None,
    note: str | None = None,
) -> LeaveLedgerEntry:
    entry = LeaveLedgerEntry(
        company_id=company_id,
        employee_id=employee_id,
        leave_type_id=leave_type_id,
        leave_year=leave_year,
        entry_date=entry_date,
        kind=kind,
        days=days,
        leave_request_id=request_id,
        note=note,
    )
    db.add(entry)
    return entry


# ── Accrual ───────────────────────────────────────────────────────────


def accrue_month(
    db: Session,
    *,
    company_id: uuid.UUID,
    year: int,
    month: int,
    employee_id: uuid.UUID | None = None,
) -> int:
    """Post one month's accrual for every employee and accruing leave type.

    Idempotent by construction: an accrual is skipped if one already exists for that
    employee, type and month. Running the job twice — which a cron eventually will —
    must not double someone's entitlement.
    """
    period_start = date(year, month, 1)
    period_end = (
        date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    ) - timedelta(days=1)

    types = list(
        db.execute(
            select(LeaveType).where(
                LeaveType.company_id == company_id,
                LeaveType.is_active.is_(True),
                LeaveType.accrual_method.in_(
                    [AccrualMethod.MONTHLY_ACCRUAL, AccrualMethod.PER_DAYS_WORKED]
                ),
            )
        ).scalars()
    )
    if not types:
        return 0

    employee_stmt = select(Employee).where(
        Employee.company_id == company_id, Employee.joined_on <= period_end
    )
    if employee_id is not None:
        employee_stmt = employee_stmt.where(Employee.id == employee_id)
    employees = list(db.execute(employee_stmt).scalars())

    already = {
        (e.employee_id, e.leave_type_id)
        for e in db.execute(
            select(LeaveLedgerEntry).where(
                LeaveLedgerEntry.company_id == company_id,
                LeaveLedgerEntry.kind == LedgerEntryKind.ACCRUAL,
                LeaveLedgerEntry.entry_date == period_end,
            )
        ).scalars()
    }

    posted = 0
    for employee in employees:
        if employee.exited_on and employee.exited_on < period_start:
            continue

        for leave_type in types:
            if (employee.id, leave_type.id) in already:
                continue
            if (
                not leave_type.probation_eligible
                and employee.status is EmployeeStatus.PROBATION
            ):
                continue

            days = _accrual_days(
                db,
                company_id=company_id,
                employee=employee,
                leave_type=leave_type,
                period_start=period_start,
                period_end=period_end,
            )
            if days <= ZERO:
                continue

            # Respect the statutory ceiling. The excess is not silently dropped: it is
            # recorded as encashable, because under the Act it is money owed.
            current = balance_for(
                db,
                company_id=company_id,
                employee_id=employee.id,
                leave_type_id=leave_type.id,
                leave_year=year,
            )
            kept, excess = statutory.capped(
                current + days, ceiling=leave_type.max_accumulation_days
            )
            grantable = kept - current
            if grantable > ZERO:
                _post(
                    db,
                    company_id=company_id,
                    employee_id=employee.id,
                    leave_type_id=leave_type.id,
                    leave_year=year,
                    entry_date=period_end,
                    kind=LedgerEntryKind.ACCRUAL,
                    days=grantable,
                    note=f"{year}-{month:02d} accrual",
                )
                posted += 1
            if excess > ZERO and leave_type.encashable_above_days is not None:
                _post(
                    db,
                    company_id=company_id,
                    employee_id=employee.id,
                    leave_type_id=leave_type.id,
                    leave_year=year,
                    entry_date=period_end,
                    kind=LedgerEntryKind.ENCASHMENT,
                    days=ZERO,
                    note=f"{excess} day(s) above the {leave_type.max_accumulation_days}-day "
                    "ceiling are encashable",
                )

    db.commit()
    return posted


def _accrual_days(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee: Employee,
    leave_type: LeaveType,
    period_start: date,
    period_end: date,
) -> Decimal:
    if leave_type.accrual_method is AccrualMethod.MONTHLY_ACCRUAL:
        return (leave_type.days_per_year / Decimal("12")).quantize(Decimal("0.01"))

    if leave_type.accrual_method is AccrualMethod.PER_DAYS_WORKED:
        # Home leave earns from the attendance register, not the calendar: someone
        # absent all month earns nothing.
        worked = db.execute(
            select(func.count()).where(
                AttendanceDay.company_id == company_id,
                AttendanceDay.employee_id == employee.id,
                AttendanceDay.work_date.between(period_start, period_end),
                AttendanceDay.status.in_([DayStatus.PRESENT, DayStatus.HALF_DAY]),
            )
        ).scalar_one()
        return statutory.accrual_for_days_worked(
            worked, days_worked_per_day_earned=leave_type.days_worked_per_day_earned or 20
        )

    return ZERO


def grant_annual(
    db: Session, *, company_id: uuid.UUID, year: int, employee_id: uuid.UUID | None = None
) -> int:
    """Post the year's ANNUAL_GRANT entitlements, prorated for mid-year joiners."""
    year_start, year_end = date(year, 1, 1), date(year, 12, 31)
    types = list(
        db.execute(
            select(LeaveType).where(
                LeaveType.company_id == company_id,
                LeaveType.is_active.is_(True),
                LeaveType.accrual_method == AccrualMethod.ANNUAL_GRANT,
            )
        ).scalars()
    )

    employee_stmt = select(Employee).where(
        Employee.company_id == company_id, Employee.joined_on <= year_end
    )
    if employee_id is not None:
        employee_stmt = employee_stmt.where(Employee.id == employee_id)

    posted = 0
    for employee in db.execute(employee_stmt).scalars():
        for leave_type in types:
            existing = db.execute(
                select(LeaveLedgerEntry.id).where(
                    LeaveLedgerEntry.company_id == company_id,
                    LeaveLedgerEntry.employee_id == employee.id,
                    LeaveLedgerEntry.leave_type_id == leave_type.id,
                    LeaveLedgerEntry.leave_year == year,
                    LeaveLedgerEntry.kind == LedgerEntryKind.GRANT,
                )
            ).first()
            if existing:
                continue

            days = leave_type.days_per_year
            if employee.joined_on > year_start:
                # Prorate by whole months remaining, so a July joiner gets half a year.
                months_left = 12 - employee.joined_on.month + 1
                days = (days * Decimal(months_left) / Decimal("12")).quantize(
                    Decimal("0.01")
                )
            if days <= ZERO:
                continue

            _post(
                db,
                company_id=company_id,
                employee_id=employee.id,
                leave_type_id=leave_type.id,
                leave_year=year,
                entry_date=max(year_start, employee.joined_on),
                kind=LedgerEntryKind.GRANT,
                days=days,
                note=f"{year} entitlement",
            )
            posted += 1

    db.commit()
    return posted


def carry_forward(db: Session, *, company_id: uuid.UUID, from_year: int) -> int:
    """Move each closing balance into the next year, capped, with the excess recorded.

    Two ledger rows per employee and type — one out, one in — so the movement is visible
    from both years rather than a balance mysteriously appearing.
    """
    to_year = from_year + 1
    posted = 0

    for leave_type in db.execute(
        select(LeaveType).where(
            LeaveType.company_id == company_id, LeaveType.is_active.is_(True)
        )
    ).scalars():
        rows = db.execute(
            select(
                LeaveLedgerEntry.employee_id,
                func.coalesce(func.sum(LeaveLedgerEntry.days), 0),
            )
            .where(
                LeaveLedgerEntry.company_id == company_id,
                LeaveLedgerEntry.leave_type_id == leave_type.id,
                LeaveLedgerEntry.leave_year == from_year,
            )
            .group_by(LeaveLedgerEntry.employee_id)
        ).all()

        for employee_id, closing in rows:
            closing = Decimal(closing)
            if closing <= ZERO:
                continue

            kept, excess = statutory.capped(
                closing, ceiling=leave_type.max_accumulation_days
            )
            if kept > ZERO:
                _post(
                    db,
                    company_id=company_id,
                    employee_id=employee_id,
                    leave_type_id=leave_type.id,
                    leave_year=from_year,
                    entry_date=date(from_year, 12, 31),
                    kind=LedgerEntryKind.CARRY_FORWARD,
                    days=-kept,
                    note=f"carried into {to_year}",
                )
                _post(
                    db,
                    company_id=company_id,
                    employee_id=employee_id,
                    leave_type_id=leave_type.id,
                    leave_year=to_year,
                    entry_date=date(to_year, 1, 1),
                    kind=LedgerEntryKind.OPENING,
                    days=kept,
                    note=f"carried from {from_year}",
                )
                posted += 1
            if excess > ZERO:
                _post(
                    db,
                    company_id=company_id,
                    employee_id=employee_id,
                    leave_type_id=leave_type.id,
                    leave_year=from_year,
                    entry_date=date(from_year, 12, 31),
                    kind=LedgerEntryKind.LAPSE,
                    days=-excess,
                    note=f"above the {leave_type.max_accumulation_days}-day ceiling; "
                    "encashable rather than forfeited",
                )

    db.commit()
    return posted


# ── Requests ──────────────────────────────────────────────────────────


def compute_request_days(
    db: Session,
    *,
    company_id: uuid.UUID,
    start: date,
    end: date,
    portion: DayPortion,
) -> Decimal:
    """How much entitlement a request consumes, in working days."""
    if end < start:
        raise HTTPException(status.HTTP_409_CONFLICT, "The leave ends before it starts")

    days = working_days(db, company_id=company_id, start=start, end=end)
    if not days:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "That range contains no working days — nothing would be deducted",
        )

    if portion is not DayPortion.FULL:
        if start != end:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "A half day must be a single-day request"
            )
        return HALF

    return Decimal(len(days))


def assert_no_overlap(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    start: date,
    end: date,
    exclude_request_id: uuid.UUID | None = None,
) -> None:
    """Reject a request that overlaps one already pending or approved."""
    stmt = select(LeaveRequest.id).where(
        LeaveRequest.company_id == company_id,
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status.in_(
            [LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED]
        ),
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= start,
    )
    if exclude_request_id is not None:
        stmt = stmt.where(LeaveRequest.id != exclude_request_id)

    if db.execute(stmt).first():
        raise HTTPException(
            status.HTTP_409_CONFLICT, "That overlaps an existing leave request"
        )


def approve(
    db: Session, *, request: LeaveRequest, user_id: uuid.UUID, note: str | None
) -> None:
    """Approve, and consume the balance in the same transaction.

    The balance is re-read here rather than trusted from when the request was raised:
    other leave may have been approved in between, and a request that was affordable on
    Monday may not be on Friday.
    """
    if request.status is not LeaveRequestStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "That request has already been decided")

    leave_type = db.get(LeaveType, request.leave_type_id)
    if leave_type is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave type not found")

    # Unpaid leave has no entitlement to draw down, so it is always affordable.
    if leave_type.is_paid and leave_type.accrual_method is not AccrualMethod.ON_EVENT:
        available = balance_for(
            db,
            company_id=request.company_id,
            employee_id=request.employee_id,
            leave_type_id=request.leave_type_id,
            leave_year=request.start_date.year,
        )
        if available < request.days:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Only {available} day(s) of {leave_type.name} available; "
                f"{request.days} requested",
            )

    if (
        leave_type.requires_document_after_days is not None
        and request.days > leave_type.requires_document_after_days
        and not request.document_key
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{leave_type.name} beyond {leave_type.requires_document_after_days} day(s) "
            "requires supporting documentation",
        )

    _post(
        db,
        company_id=request.company_id,
        employee_id=request.employee_id,
        leave_type_id=request.leave_type_id,
        leave_year=request.start_date.year,
        entry_date=request.start_date,
        kind=LedgerEntryKind.CONSUMPTION,
        days=-request.days,
        request_id=request.id,
        note=f"{request.start_date} to {request.end_date}",
    )

    request.status = LeaveRequestStatus.APPROVED
    request.decided_by_user_id = user_id
    request.decision_note = note


def cancel_approved(
    db: Session, *, request: LeaveRequest, user_id: uuid.UUID, note: str | None
) -> None:
    """Cancel approved leave and give the entitlement back — as a reversal row, not by
    deleting the consumption, so the history of what happened survives."""
    if request.status is not LeaveRequestStatus.APPROVED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only approved leave can be cancelled this way"
        )

    _post(
        db,
        company_id=request.company_id,
        employee_id=request.employee_id,
        leave_type_id=request.leave_type_id,
        leave_year=request.start_date.year,
        entry_date=date.today(),
        kind=LedgerEntryKind.REVERSAL,
        days=request.days,
        request_id=request.id,
        note="cancelled",
    )
    request.status = LeaveRequestStatus.CANCELLED
    request.decided_by_user_id = user_id
    request.decision_note = note


def approved_leave_dates(
    db: Session, *, company_id: uuid.UUID, start: date, end: date
) -> set[tuple[uuid.UUID, date]]:
    """Every (employee, date) covered by approved leave — what the attendance register
    consults to mark a day as leave rather than absent."""
    covered: set[tuple[uuid.UUID, date]] = set()
    for request in db.execute(
        select(LeaveRequest).where(
            LeaveRequest.company_id == company_id,
            LeaveRequest.status == LeaveRequestStatus.APPROVED,
            LeaveRequest.start_date <= end,
            LeaveRequest.end_date >= start,
        )
    ).scalars():
        day = max(request.start_date, start)
        last = min(request.end_date, end)
        while day <= last:
            covered.add((request.employee_id, day))
            day += timedelta(days=1)
    return covered


def seed_statutory_types(db: Session, *, company_id: uuid.UUID) -> int:
    """Create the statutory leave types for a company that has none."""
    if db.execute(
        select(LeaveType.id).where(LeaveType.company_id == company_id)
    ).first():
        return 0

    for spec in statutory.STATUTORY_LEAVE_TYPES:
        db.add(
            LeaveType(
                company_id=company_id,
                code=spec.code,
                name=spec.name,
                nepali_name=spec.nepali_name,
                accrual_method=spec.accrual_method,
                days_per_year=spec.days_per_year,
                days_worked_per_day_earned=spec.days_worked_per_day_earned,
                max_accumulation_days=spec.max_accumulation_days,
                encashable_above_days=spec.encashable_above_days,
                requires_document_after_days=spec.requires_document_after_days,
                probation_eligible=spec.probation_eligible,
                is_paid=spec.is_paid,
                is_statutory=True,
            )
        )
    db.commit()
    return len(statutory.STATUTORY_LEAVE_TYPES)
