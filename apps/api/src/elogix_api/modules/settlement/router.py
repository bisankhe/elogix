"""Full-and-final settlement.

Gated on `ModuleCode.PAYROLL`: a settlement is a payment, it charges tax, and anyone
entitled to run payroll is entitled to settle a leaver. Giving it a module of its own
would let a company end up able to pay salaries but not final dues, which is the wrong
way round — the final payment is the one with a legal deadline.

The lifecycle mirrors a payroll run deliberately: draft → computed → approved → paid.
Approving is the irreversible step, because that is where leave balances are consumed.
"""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from elogix_api.core.deps import CurrentUserDep, DbDep, require_module
from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.employee.models import Employee
from elogix_api.modules.employee.service import get_employee
from elogix_api.modules.settlement import service
from elogix_api.modules.settlement.models import (
    Settlement,
    SettlementAdjustment,
    SettlementLine,
    SettlementStatus,
)
from elogix_api.modules.settlement.schemas import (
    AdjustmentCreate,
    AdjustmentOut,
    ApprovalResult,
    DueSettlement,
    LineOut,
    MarkPaid,
    SettlementCreate,
    SettlementDetail,
    SettlementOut,
)
from elogix_api.nepal import settlement as statutory

router = APIRouter(
    prefix="/settlements",
    tags=["settlements"],
    dependencies=[Depends(require_module(ModuleCode.PAYROLL))],
)


def _get(db: Session, settlement_id: uuid.UUID, company_id: uuid.UUID) -> Settlement:
    row = db.execute(
        select(Settlement).where(
            Settlement.id == settlement_id, Settlement.company_id == company_id
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Settlement not found")
    return row


def _detail(db: Session, settlement: Settlement) -> SettlementDetail:
    detail = SettlementDetail.model_validate(settlement)
    detail.lines = [
        LineOut.model_validate(line)
        for line in db.execute(
            select(SettlementLine)
            .where(
                SettlementLine.settlement_id == settlement.id,
                SettlementLine.company_id == settlement.company_id,
            )
            .order_by(SettlementLine.sequence)
        ).scalars()
    ]
    detail.adjustments = [
        AdjustmentOut.model_validate(row)
        for row in db.execute(
            select(SettlementAdjustment).where(
                SettlementAdjustment.settlement_id == settlement.id,
                SettlementAdjustment.company_id == settlement.company_id,
            )
        ).scalars()
    ]
    return detail


@router.get("", response_model=list[SettlementOut])
def list_settlements(
    user: CurrentUserDep,
    db: DbDep,
    settlement_status: Annotated[SettlementStatus | None, Query(alias="status")] = None,
) -> list[Settlement]:
    stmt = select(Settlement).where(Settlement.company_id == user.company_id)
    if settlement_status is not None:
        stmt = stmt.where(Settlement.status == settlement_status)
    return list(db.execute(stmt.order_by(Settlement.deadline)).scalars().all())


@router.get("/due", response_model=list[DueSettlement])
def due_settlements(
    user: CurrentUserDep,
    db: DbDep,
    within_days: Annotated[int, Query(ge=0, le=180)] = 30,
) -> list[DueSettlement]:
    """Settlements against their statutory clock, most urgent first.

    The whole reason `deadline` is a column. An unpaid final settlement is a compliance
    failure with a date attached, and nobody finds it by opening leaver records one at a
    time. Already-overdue rows come first with a negative `days_remaining` — those are
    the ones that matter, and filtering them out would hide the failures this exists for.
    """
    today = date.today()
    rows = db.execute(
        select(Settlement, Employee)
        .join(Employee, Employee.id == Settlement.employee_id)
        .where(
            Settlement.company_id == user.company_id,
            # Paid and cancelled are finished; nothing is owed and no clock is running.
            Settlement.status.notin_([SettlementStatus.PAID, SettlementStatus.CANCELLED]),
        )
        .order_by(Settlement.deadline)
    ).all()

    return [
        DueSettlement(
            **SettlementOut.model_validate(settlement).model_dump(),
            employee_code=employee.employee_code,
            employee_name=employee.full_name,
            days_remaining=(settlement.deadline - today).days,
            is_overdue=settlement.deadline < today,
        )
        for settlement, employee in rows
        if (settlement.deadline - today).days <= within_days
    ]


@router.post("", response_model=SettlementDetail, status_code=status.HTTP_201_CREATED)
def create_settlement(
    payload: SettlementCreate, user: CurrentUserDep, db: DbDep
) -> SettlementDetail:
    """Raise a settlement for someone who has left, and compute it straight away.

    Computing on creation rather than leaving it as an empty draft: the fifteen-day
    clock starts at the last working day, not at whenever someone remembers to press a
    button, so the figures should exist from the moment the record does.
    """
    employee = get_employee(
        db, company_id=user.company_id, employee_id=payload.employee_id
    )
    if payload.last_working_day < employee.joined_on:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "The last working day predates the joining date"
        )

    notice_required = payload.notice_days_required
    if notice_required is None:
        notice_required = service.notice_days_for(
            db,
            company_id=user.company_id,
            employee_id=employee.id,
            on=payload.last_working_day,
        )

    settlement = Settlement(
        company_id=user.company_id,
        employee_id=employee.id,
        last_working_day=payload.last_working_day,
        resignation_date=payload.resignation_date,
        initiator=payload.initiator.value,
        fiscal_year=payload.fiscal_year,
        reason=payload.reason,
        notice_days_required=notice_required,
        notice_days_served=payload.notice_days_served,
        deadline=statutory.deadline(payload.last_working_day),
    )
    db.add(settlement)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This employee already has an open settlement. Cancel it before raising "
            "another.",
        ) from exc

    service.recompute(db, settlement=settlement, employee=employee)
    db.commit()
    db.refresh(settlement)
    return _detail(db, settlement)


@router.get("/{settlement_id}", response_model=SettlementDetail)
def get_settlement(
    settlement_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> SettlementDetail:
    return _detail(db, _get(db, settlement_id, user.company_id))


@router.post("/{settlement_id}/compute", response_model=SettlementDetail)
def recompute_settlement(
    settlement_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> SettlementDetail:
    """Recompute from current data. Refused once approved — that is a snapshot."""
    settlement = _get(db, settlement_id, user.company_id)
    employee = get_employee(
        db, company_id=user.company_id, employee_id=settlement.employee_id
    )
    service.recompute(db, settlement=settlement, employee=employee)
    db.commit()
    db.refresh(settlement)
    return _detail(db, settlement)


@router.post("/{settlement_id}/adjustments", response_model=AdjustmentOut, status_code=201)
def add_adjustment(
    settlement_id: uuid.UUID,
    payload: AdjustmentCreate,
    user: CurrentUserDep,
    db: DbDep,
) -> SettlementAdjustment:
    """Add a hand-entered line, then recompute so the totals include it."""
    settlement = _get(db, settlement_id, user.company_id)
    if settlement.status not in service.MUTABLE:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This settlement is {settlement.status.value}; its lines are fixed.",
        )

    adjustment = SettlementAdjustment(
        company_id=user.company_id,
        settlement_id=settlement.id,
        kind=payload.kind.value,
        label=payload.label,
        amount=payload.amount,
        reason=payload.reason,
        taxable=payload.taxable,
    )
    db.add(adjustment)
    db.flush()

    employee = get_employee(
        db, company_id=user.company_id, employee_id=settlement.employee_id
    )
    service.recompute(db, settlement=settlement, employee=employee)
    db.commit()
    db.refresh(adjustment)
    return adjustment


@router.post("/{settlement_id}/approve", response_model=ApprovalResult)
def approve_settlement(
    settlement_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> ApprovalResult:
    """Approve, consuming the leave it pays out in the same transaction."""
    settlement = _get(db, settlement_id, user.company_id)
    encashed = service.approve(db, settlement=settlement, user_id=user.id)
    db.commit()
    return ApprovalResult(leave_balances_encashed=encashed)


@router.post("/{settlement_id}/pay", response_model=SettlementOut)
def mark_paid(
    settlement_id: uuid.UUID, payload: MarkPaid, user: CurrentUserDep, db: DbDep
) -> Settlement:
    """Record the disbursement date, which is what stops the statutory clock."""
    settlement = _get(db, settlement_id, user.company_id)
    if settlement.status is not SettlementStatus.APPROVED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Only an approved settlement can be marked paid; this one is "
            f"{settlement.status.value}.",
        )
    if payload.paid_on < settlement.last_working_day:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "A settlement cannot be paid before the last working day"
        )

    settlement.paid_on = payload.paid_on
    settlement.status = SettlementStatus.PAID
    db.commit()
    db.refresh(settlement)
    return settlement


@router.post("/{settlement_id}/cancel", response_model=SettlementOut)
def cancel_settlement(
    settlement_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> Settlement:
    """Cancel, freeing the employee for a new settlement.

    Refused once approved: approving posted encashment rows into the leave ledger, and
    a cancel that left them there would show a balance paid out against a settlement
    that officially never happened. Reversing them is a decision with money attached
    and needs its own deliberate operation rather than a status change.
    """
    settlement = _get(db, settlement_id, user.company_id)
    if settlement.status in (SettlementStatus.APPROVED, SettlementStatus.PAID):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"An {settlement.status.value} settlement has already moved leave balances "
            "and cannot be cancelled.",
        )

    settlement.status = SettlementStatus.CANCELLED
    db.commit()
    db.refresh(settlement)
    return settlement
