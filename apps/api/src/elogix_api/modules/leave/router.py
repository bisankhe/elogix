"""Leave endpoints: types, balances, requests, approval and the accrual jobs."""

import uuid
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from elogix_api.core.deps import CurrentUserDep, DbDep, require_module
from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.employee.service import get_employee
from elogix_api.modules.leave import service
from elogix_api.modules.leave.models import (
    LeaveLedgerEntry,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
)
from elogix_api.modules.leave.schemas import (
    AccrualRequest,
    AccrualResult,
    BalanceOut,
    CarryForwardRequest,
    LeaveDecision,
    LeaveRequestCreate,
    LeaveRequestOut,
    LeaveTypeOut,
    LeaveTypeUpdate,
    LedgerEntryOut,
)

router = APIRouter(
    prefix="/leave",
    tags=["leave"],
    dependencies=[Depends(require_module(ModuleCode.LEAVE))],
)


# ── Types ─────────────────────────────────────────────────────────────


@router.get("/types", response_model=list[LeaveTypeOut])
def list_types(user: CurrentUserDep, db: DbDep) -> list[LeaveType]:
    """Seeds the statutory catalogue on first read, so a new tenant is never empty."""
    service.seed_statutory_types(db, company_id=user.company_id)
    return list(
        db.execute(
            select(LeaveType)
            .where(LeaveType.company_id == user.company_id, LeaveType.is_active.is_(True))
            .order_by(LeaveType.code)
        )
        .scalars()
        .all()
    )


@router.patch("/types/{type_id}", response_model=LeaveTypeOut)
def update_type(
    type_id: uuid.UUID, payload: LeaveTypeUpdate, user: CurrentUserDep, db: DbDep
) -> LeaveType:
    leave_type = db.execute(
        select(LeaveType).where(
            LeaveType.id == type_id, LeaveType.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if leave_type is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave type not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(leave_type, key, value)
    db.commit()
    db.refresh(leave_type)
    return leave_type


# ── Balances ──────────────────────────────────────────────────────────


@router.get("/balances/{employee_id}", response_model=list[BalanceOut])
def balances(
    employee_id: uuid.UUID,
    user: CurrentUserDep,
    db: DbDep,
    leave_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
) -> list[BalanceOut]:
    get_employee(db, company_id=user.company_id, employee_id=employee_id)
    year = leave_year or date.today().year

    return [
        BalanceOut(
            leave_type_id=leave_type.id,
            code=leave_type.code,
            name=leave_type.name,
            leave_year=year,
            available_days=service.balance_for(
                db,
                company_id=user.company_id,
                employee_id=employee_id,
                leave_type_id=leave_type.id,
                leave_year=year,
            ),
            is_paid=leave_type.is_paid,
        )
        for leave_type in db.execute(
            select(LeaveType)
            .where(LeaveType.company_id == user.company_id, LeaveType.is_active.is_(True))
            .order_by(LeaveType.code)
        ).scalars()
    ]


@router.get("/ledger/{employee_id}", response_model=list[LedgerEntryOut])
def ledger(
    employee_id: uuid.UUID,
    user: CurrentUserDep,
    db: DbDep,
    leave_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
) -> list[LeaveLedgerEntry]:
    """Every movement behind a balance — the answer to "why do I have 11.5 days?"."""
    get_employee(db, company_id=user.company_id, employee_id=employee_id)
    stmt = select(LeaveLedgerEntry).where(
        LeaveLedgerEntry.company_id == user.company_id,
        LeaveLedgerEntry.employee_id == employee_id,
    )
    if leave_year is not None:
        stmt = stmt.where(LeaveLedgerEntry.leave_year == leave_year)
    return list(
        db.execute(stmt.order_by(LeaveLedgerEntry.entry_date, LeaveLedgerEntry.created_at))
        .scalars()
        .all()
    )


# ── Requests ──────────────────────────────────────────────────────────


@router.get("/requests", response_model=list[LeaveRequestOut])
def list_requests(
    user: CurrentUserDep,
    db: DbDep,
    employee_id: Annotated[uuid.UUID | None, Query()] = None,
    request_status: Annotated[LeaveRequestStatus | None, Query(alias="status")] = None,
) -> list[LeaveRequest]:
    stmt = select(LeaveRequest).where(LeaveRequest.company_id == user.company_id)
    if employee_id is not None:
        stmt = stmt.where(LeaveRequest.employee_id == employee_id)
    if request_status is not None:
        stmt = stmt.where(LeaveRequest.status == request_status)
    return list(
        db.execute(stmt.order_by(LeaveRequest.start_date.desc())).scalars().all()
    )


@router.post("/requests", response_model=LeaveRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: LeaveRequestCreate, user: CurrentUserDep, db: DbDep
) -> LeaveRequest:
    """HR raising a request on someone's behalf. `/ess/leave/requests` is the same call
    with the employee taken from the token instead of the body."""
    request = service.create_request(
        db,
        company_id=user.company_id,
        employee_id=payload.employee_id,
        leave_type_id=payload.leave_type_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        portion=payload.portion,
        reason=payload.reason,
        document_key=payload.document_key,
    )
    db.commit()
    db.refresh(request)
    return request


@router.post("/requests/{request_id}/decide", response_model=LeaveRequestOut)
def decide_request(
    request_id: uuid.UUID, payload: LeaveDecision, user: CurrentUserDep, db: DbDep
) -> LeaveRequest:
    """Approve or reject. Approval consumes the balance in the same transaction."""
    request = _get_request(db, request_id, user.company_id)

    if payload.approve:
        service.approve(db, request=request, user_id=user.id, note=payload.note)
    else:
        if request.status is not LeaveRequestStatus.PENDING:
            raise HTTPException(
                status.HTTP_409_CONFLICT, "That request has already been decided"
            )
        request.status = LeaveRequestStatus.REJECTED
        request.decided_by_user_id = user.id
        request.decision_note = payload.note

    request.decided_at = datetime.now(UTC)
    db.commit()
    db.refresh(request)
    return request


@router.post("/requests/{request_id}/cancel", response_model=LeaveRequestOut)
def cancel_request(
    request_id: uuid.UUID, payload: LeaveDecision, user: CurrentUserDep, db: DbDep
) -> LeaveRequest:
    """Cancel approved leave, returning the entitlement as a reversal entry."""
    request = _get_request(db, request_id, user.company_id)
    service.cancel_approved(db, request=request, user_id=user.id, note=payload.note)
    request.decided_at = datetime.now(UTC)
    db.commit()
    db.refresh(request)
    return request


# ── Accrual jobs ──────────────────────────────────────────────────────


@router.post("/accrue", response_model=AccrualResult)
def accrue(payload: AccrualRequest, user: CurrentUserDep, db: DbDep) -> AccrualResult:
    """Post accruals. With a month, that month; without one, the whole year.

    Idempotent: a second run over the same period posts nothing, because a cron job
    eventually runs twice and nobody should get a double entitlement out of it.
    """
    posted = service.grant_annual(
        db, company_id=user.company_id, year=payload.year, employee_id=payload.employee_id
    )
    months = [payload.month] if payload.month else list(range(1, 13))
    for month in months:
        posted += service.accrue_month(
            db,
            company_id=user.company_id,
            year=payload.year,
            month=month,
            employee_id=payload.employee_id,
        )
    return AccrualResult(entries_posted=posted)


@router.post("/carry-forward", response_model=AccrualResult)
def carry_forward(
    payload: CarryForwardRequest, user: CurrentUserDep, db: DbDep
) -> AccrualResult:
    posted = service.carry_forward(db, company_id=user.company_id, from_year=payload.from_year)
    return AccrualResult(entries_posted=posted)


def _get_request(db: DbDep, request_id: uuid.UUID, company_id: uuid.UUID) -> LeaveRequest:
    request = db.execute(
        select(LeaveRequest).where(
            LeaveRequest.id == request_id, LeaveRequest.company_id == company_id
        )
    ).scalar_one_or_none()
    if request is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave request not found")
    return request
