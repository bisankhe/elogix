"""Attendance endpoints: setup, capture, correction, and the payroll export."""

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from elogix_api.core.deps import CurrentUserDep, DbDep, require_module
from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.attendance import service
from elogix_api.modules.attendance.models import (
    AttendanceDay,
    AttendancePunch,
    DayStatus,
    Holiday,
    PunchDirection,
    PunchSource,
    RegularisationRequest,
    RequestStatus,
    RosterEntry,
    Shift,
)
from elogix_api.modules.attendance.schemas import (
    DayOut,
    HolidayCreate,
    HolidayOut,
    PayrollExport,
    PayrollExportRow,
    PolicyOut,
    PolicyUpdate,
    ProcessRequest,
    ProcessResult,
    PunchCreate,
    PunchOut,
    RegularisationCreate,
    RegularisationDecision,
    RegularisationOut,
    RosterAssign,
    RosterEntryOut,
    ShiftCreate,
    ShiftOut,
)
from elogix_api.modules.employee.models import Employee
from elogix_api.modules.employee.service import get_employee

router = APIRouter(
    prefix="/attendance",
    tags=["attendance"],
    dependencies=[Depends(require_module(ModuleCode.ATTENDANCE))],
)


# ── Policy ────────────────────────────────────────────────────────────


@router.get("/policy", response_model=PolicyOut)
def get_policy(user: CurrentUserDep, db: DbDep) -> PolicyOut:
    return PolicyOut.model_validate(
        service.get_or_create_policy(db, company_id=user.company_id)
    )


@router.put("/policy", response_model=PolicyOut)
def update_policy(payload: PolicyUpdate, user: CurrentUserDep, db: DbDep) -> PolicyOut:
    policy = service.get_or_create_policy(db, company_id=user.company_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(policy, key, value)
    db.commit()
    db.refresh(policy)
    return PolicyOut.model_validate(policy)


# ── Shifts ────────────────────────────────────────────────────────────


@router.get("/shifts", response_model=list[ShiftOut])
def list_shifts(user: CurrentUserDep, db: DbDep) -> list[Shift]:
    return list(
        db.execute(
            select(Shift)
            .where(Shift.company_id == user.company_id, Shift.is_active.is_(True))
            .order_by(Shift.starts_at)
        )
        .scalars()
        .all()
    )


@router.post("/shifts", response_model=ShiftOut, status_code=status.HTTP_201_CREATED)
def create_shift(payload: ShiftCreate, user: CurrentUserDep, db: DbDep) -> Shift:
    shift = Shift(company_id=user.company_id, **payload.model_dump())
    if shift.scheduled_minutes <= 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "The break is longer than the shift itself"
        )
    return _commit(db, shift)


# ── Holidays ──────────────────────────────────────────────────────────


@router.get("/holidays", response_model=list[HolidayOut])
def list_holidays(
    user: CurrentUserDep,
    db: DbDep,
    year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
) -> list[Holiday]:
    stmt = select(Holiday).where(Holiday.company_id == user.company_id)
    if year is not None:
        stmt = stmt.where(Holiday.holiday_date.between(date(year, 1, 1), date(year, 12, 31)))
    return list(db.execute(stmt.order_by(Holiday.holiday_date)).scalars().all())


@router.post("/holidays", response_model=HolidayOut, status_code=status.HTTP_201_CREATED)
def create_holiday(payload: HolidayCreate, user: CurrentUserDep, db: DbDep) -> Holiday:
    return _commit(db, Holiday(company_id=user.company_id, **payload.model_dump()))


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(holiday_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> None:
    holiday = db.execute(
        select(Holiday).where(
            Holiday.id == holiday_id, Holiday.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if holiday is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Holiday not found")
    db.delete(holiday)
    db.commit()


# ── Roster ────────────────────────────────────────────────────────────


@router.get("/roster", response_model=list[RosterEntryOut])
def list_roster(
    user: CurrentUserDep,
    db: DbDep,
    start_date: date,
    end_date: date,
    employee_id: Annotated[uuid.UUID | None, Query()] = None,
) -> list[RosterEntry]:
    stmt = select(RosterEntry).where(
        RosterEntry.company_id == user.company_id,
        RosterEntry.work_date.between(start_date, end_date),
    )
    if employee_id is not None:
        stmt = stmt.where(RosterEntry.employee_id == employee_id)
    return list(
        db.execute(stmt.order_by(RosterEntry.work_date)).scalars().all()
    )


@router.post("/roster", response_model=list[RosterEntryOut], status_code=status.HTTP_201_CREATED)
def assign_roster(payload: RosterAssign, user: CurrentUserDep, db: DbDep) -> list[RosterEntry]:
    """Assign one shift across employees and dates, replacing anything already there."""
    if payload.end_date < payload.start_date:
        raise HTTPException(status.HTTP_409_CONFLICT, "The range ends before it starts")
    if (payload.end_date - payload.start_date).days > 366:
        raise HTTPException(status.HTTP_409_CONFLICT, "Roster at most one year at a time")

    shift = db.execute(
        select(Shift).where(
            Shift.id == payload.shift_id, Shift.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if shift is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shift not found")

    for employee_id in payload.employee_ids:
        get_employee(db, company_id=user.company_id, employee_id=employee_id)

    existing = {
        (r.employee_id, r.work_date): r
        for r in db.execute(
            select(RosterEntry).where(
                RosterEntry.company_id == user.company_id,
                RosterEntry.work_date.between(payload.start_date, payload.end_date),
                RosterEntry.employee_id.in_(payload.employee_ids),
            )
        ).scalars()
    }

    written: list[RosterEntry] = []
    for employee_id in payload.employee_ids:
        day = payload.start_date
        while day <= payload.end_date:
            if payload.weekdays is None or day.weekday() in payload.weekdays:
                row = existing.get((employee_id, day))
                if row is None:
                    row = RosterEntry(
                        company_id=user.company_id,
                        employee_id=employee_id,
                        work_date=day,
                        shift_id=shift.id,
                    )
                    db.add(row)
                else:
                    row.shift_id = shift.id
                written.append(row)
            day += timedelta(days=1)

    db.commit()
    return written


# ── Punches ───────────────────────────────────────────────────────────


@router.post("/punches", response_model=PunchOut, status_code=status.HTTP_201_CREATED)
def record_punch(payload: PunchCreate, user: CurrentUserDep, db: DbDep) -> AttendancePunch:
    get_employee(db, company_id=user.company_id, employee_id=payload.employee_id)

    fields = payload.model_dump()
    work_date = fields.pop("work_date") or payload.punched_at.date()
    punch = AttendancePunch(company_id=user.company_id, work_date=work_date, **fields)
    db.add(punch)
    db.commit()
    db.refresh(punch)
    return punch


@router.get("/punches", response_model=list[PunchOut])
def list_punches(
    user: CurrentUserDep,
    db: DbDep,
    start_date: date,
    end_date: date,
    employee_id: Annotated[uuid.UUID | None, Query()] = None,
) -> list[AttendancePunch]:
    stmt = select(AttendancePunch).where(
        AttendancePunch.company_id == user.company_id,
        AttendancePunch.work_date.between(start_date, end_date),
    )
    if employee_id is not None:
        stmt = stmt.where(AttendancePunch.employee_id == employee_id)
    return list(
        db.execute(stmt.order_by(AttendancePunch.punched_at)).scalars().all()
    )


# ── Daily register ────────────────────────────────────────────────────


@router.post("/process", response_model=ProcessResult)
def process(payload: ProcessRequest, user: CurrentUserDep, db: DbDep) -> ProcessResult:
    """Rebuild the daily register for a range. Idempotent; skips locked days."""
    written = service.process_range(
        db,
        company_id=user.company_id,
        start=payload.start_date,
        end=payload.end_date,
        employee_id=payload.employee_id,
    )
    return ProcessResult(days_written=written)


@router.get("/days", response_model=list[DayOut])
def list_days(
    user: CurrentUserDep,
    db: DbDep,
    start_date: date,
    end_date: date,
    employee_id: Annotated[uuid.UUID | None, Query()] = None,
    day_status: Annotated[DayStatus | None, Query(alias="status")] = None,
) -> list[AttendanceDay]:
    stmt = select(AttendanceDay).where(
        AttendanceDay.company_id == user.company_id,
        AttendanceDay.work_date.between(start_date, end_date),
    )
    if employee_id is not None:
        stmt = stmt.where(AttendanceDay.employee_id == employee_id)
    if day_status is not None:
        stmt = stmt.where(AttendanceDay.status == day_status)
    return list(
        db.execute(stmt.order_by(AttendanceDay.work_date, AttendanceDay.employee_id))
        .scalars()
        .all()
    )


# ── Regularisation ────────────────────────────────────────────────────


@router.post(
    "/regularisations", response_model=RegularisationOut, status_code=status.HTTP_201_CREATED
)
def request_regularisation(
    payload: RegularisationCreate, user: CurrentUserDep, db: DbDep
) -> RegularisationRequest:
    get_employee(db, company_id=user.company_id, employee_id=payload.employee_id)

    locked = db.execute(
        select(AttendanceDay.is_locked).where(
            AttendanceDay.company_id == user.company_id,
            AttendanceDay.employee_id == payload.employee_id,
            AttendanceDay.work_date == payload.work_date,
        )
    ).scalar_one_or_none()
    if locked:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "That day is locked; payroll has already used it"
        )

    return _commit(
        db, RegularisationRequest(company_id=user.company_id, **payload.model_dump())
    )


@router.get("/regularisations", response_model=list[RegularisationOut])
def list_regularisations(
    user: CurrentUserDep,
    db: DbDep,
    request_status: Annotated[RequestStatus | None, Query(alias="status")] = None,
) -> list[RegularisationRequest]:
    stmt = select(RegularisationRequest).where(
        RegularisationRequest.company_id == user.company_id
    )
    if request_status is not None:
        stmt = stmt.where(RegularisationRequest.status == request_status)
    return list(
        db.execute(stmt.order_by(RegularisationRequest.work_date.desc())).scalars().all()
    )


@router.post("/regularisations/{request_id}/decide", response_model=RegularisationOut)
def decide_regularisation(
    request_id: uuid.UUID,
    payload: RegularisationDecision,
    user: CurrentUserDep,
    db: DbDep,
) -> RegularisationRequest:
    """Approve or reject. Approval writes punches and recomputes the day.

    The correction becomes a `regularisation`-sourced punch rather than an edit to the
    computed record, so the original device readings survive and the day can still be
    rebuilt from scratch.
    """
    request = db.execute(
        select(RegularisationRequest).where(
            RegularisationRequest.id == request_id,
            RegularisationRequest.company_id == user.company_id,
        )
    ).scalar_one_or_none()
    if request is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if request.status is not RequestStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "That request has already been decided")

    request.status = RequestStatus.APPROVED if payload.approve else RequestStatus.REJECTED
    request.decided_by_user_id = user.id
    request.decided_at = datetime.now(UTC)
    request.decision_note = payload.note

    if payload.approve:
        for moment, direction in (
            (request.requested_in, PunchDirection.IN),
            (request.requested_out, PunchDirection.OUT),
        ):
            if moment is None:
                continue
            db.add(
                AttendancePunch(
                    company_id=user.company_id,
                    employee_id=request.employee_id,
                    work_date=request.work_date,
                    punched_at=moment,
                    direction=direction,
                    source=PunchSource.REGULARISATION,
                    note=f"Regularisation {request.id}",
                )
            )
        db.flush()
        service.process_range(
            db,
            company_id=user.company_id,
            start=request.work_date,
            end=request.work_date,
            employee_id=request.employee_id,
        )

    db.commit()
    db.refresh(request)
    return request


# ── Payroll export ────────────────────────────────────────────────────


@router.get("/payroll-export", response_model=PayrollExport)
def payroll_export(
    user: CurrentUserDep, db: DbDep, start_date: date, end_date: date
) -> PayrollExport:
    """A month of attendance, totalled per employee — phase 04's deliverable to phase 06.

    `unlocked_days` is reported rather than hidden: payroll should know it is about to
    pay on figures that could still change, and decide whether to lock first.
    """
    if end_date < start_date:
        raise HTTPException(status.HTTP_409_CONFLICT, "The range ends before it starts")

    rows = db.execute(
        select(AttendanceDay, Employee)
        .join(Employee, Employee.id == AttendanceDay.employee_id)
        .where(
            AttendanceDay.company_id == user.company_id,
            AttendanceDay.work_date.between(start_date, end_date),
        )
        .order_by(Employee.employee_code, AttendanceDay.work_date)
    ).all()

    totals: dict[uuid.UUID, PayrollExportRow] = {}
    for day, employee in rows:
        row = totals.get(employee.id)
        if row is None:
            row = PayrollExportRow(
                employee_id=employee.id,
                employee_code=employee.employee_code,
                full_name=employee.full_name,
                payable_days=0.0,
                present_days=0,
                half_days=0,
                absent_days=0,
                leave_days=0,
                holiday_days=0,
                weekly_off_days=0,
                worked_minutes=0,
                overtime_minutes=0,
                late_minutes=0,
                unlocked_days=0,
            )
            totals[employee.id] = row

        row.worked_minutes += day.worked_minutes
        row.overtime_minutes += day.overtime_minutes
        row.late_minutes += day.late_minutes
        if not day.is_locked:
            row.unlocked_days += 1

        match day.status:
            case DayStatus.PRESENT:
                row.present_days += 1
                row.payable_days += 1
            case DayStatus.HALF_DAY:
                row.half_days += 1
                row.payable_days += 0.5
            case DayStatus.ABSENT:
                row.absent_days += 1
            case DayStatus.LEAVE:
                # Paid-leave accounting lands in phase 05; counted as payable for now.
                row.leave_days += 1
                row.payable_days += 1
            case DayStatus.HOLIDAY:
                row.holiday_days += 1
                row.payable_days += 1
            case DayStatus.WEEKLY_OFF:
                row.weekly_off_days += 1
                row.payable_days += 1

    return PayrollExport(
        start_date=start_date, end_date=end_date, rows=list(totals.values())
    )


def _commit[T](db: Session, row: T) -> T:
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A record with those details already exists"
        ) from exc
    db.refresh(row)
    return row


