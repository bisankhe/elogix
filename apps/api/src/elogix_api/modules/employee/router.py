"""Employee master endpoints.

Personal details are editable through PATCH; placement and lifecycle are not. Moving
someone goes through /assignments, confirming through /confirm, offboarding through
/exit — each of which writes an assignment row and a timeline event together. That
separation is what makes "with history preserved" true rather than aspirational.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from elogix_api.core.deps import CurrentUserDep, DbDep, require_module
from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.employee import service
from elogix_api.modules.employee.models import (
    AssignmentReason,
    Employee,
    EmployeeAssignment,
    EmployeeDocument,
    EmployeeEvent,
    EmployeeEventType,
    EmployeeStatus,
)
from elogix_api.modules.employee.schemas import (
    AssignmentOut,
    AssignmentRequest,
    ConfirmRequest,
    DocumentCreate,
    DocumentOut,
    EmployeeDetail,
    EmployeeList,
    EmployeeSummary,
    EmployeeUpdate,
    EventOut,
    ExitRequest,
    HireRequest,
)

router = APIRouter(
    prefix="/employees",
    tags=["employees"],
    dependencies=[Depends(require_module(ModuleCode.EMPLOYEE))],
)


@router.get("", response_model=EmployeeList)
def list_employees(
    user: CurrentUserDep,
    db: DbDep,
    status_filter: Annotated[EmployeeStatus | None, Query(alias="status")] = None,
    org_unit_id: Annotated[uuid.UUID | None, Query()] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EmployeeList:
    stmt = select(Employee).where(Employee.company_id == user.company_id)

    if status_filter is not None:
        stmt = stmt.where(Employee.status == status_filter)

    if org_unit_id is not None:
        # Filter on the *open* assignment: "who is in Engineering" means now, not ever.
        stmt = stmt.join(
            EmployeeAssignment,
            (EmployeeAssignment.employee_id == Employee.id)
            & (EmployeeAssignment.effective_to.is_(None)),
        ).where(EmployeeAssignment.org_unit_id == org_unit_id)

    if q:
        term = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Employee.first_name).like(term)
            | func.lower(Employee.last_name).like(term)
            | func.lower(Employee.employee_code).like(term)
        )

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = db.execute(
        stmt.order_by(Employee.employee_code).limit(limit).offset(offset)
    ).scalars()

    return EmployeeList(
        items=[EmployeeSummary.model_validate(r) for r in rows], total=total
    )


@router.post("", response_model=EmployeeDetail, status_code=status.HTTP_201_CREATED)
def hire(payload: HireRequest, user: CurrentUserDep, db: DbDep) -> EmployeeDetail:
    """Create the person, their opening assignment and the HIRED event in one call."""
    placement = payload.placement.model_dump()
    service.validate_placement(db, company_id=user.company_id, placement=placement)

    if payload.probation_ends_on and payload.probation_ends_on < payload.joined_on:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Probation cannot end before the joining date"
        )

    personal = payload.model_dump(
        exclude={"placement", "employee_code", "joined_on", "probation_ends_on"}
    )
    employee = Employee(
        company_id=user.company_id,
        employee_code=payload.employee_code,
        joined_on=payload.joined_on,
        probation_ends_on=payload.probation_ends_on,
        # Someone with a probation end date starts on probation; otherwise active.
        status=EmployeeStatus.PROBATION if payload.probation_ends_on else EmployeeStatus.ACTIVE,
        **personal,
    )
    db.add(employee)

    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An employee with this code already exists"
        ) from exc

    service.open_assignment(
        db,
        company_id=user.company_id,
        employee_id=employee.id,
        placement=placement,
        reason=AssignmentReason.HIRE,
        effective_from=payload.joined_on,
    )
    service.record_event(
        db,
        company_id=user.company_id,
        employee_id=employee.id,
        event_type=EmployeeEventType.HIRED,
        occurred_on=payload.joined_on,
        user_id=user.id,
    )
    db.commit()
    db.refresh(employee)
    return _detail(db, user.company_id, employee)


@router.get("/{employee_id}", response_model=EmployeeDetail)
def get_employee(employee_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> EmployeeDetail:
    employee = service.get_employee(
        db, company_id=user.company_id, employee_id=employee_id
    )
    return _detail(db, user.company_id, employee)


@router.patch("/{employee_id}", response_model=EmployeeDetail)
def update_employee(
    employee_id: uuid.UUID, payload: EmployeeUpdate, user: CurrentUserDep, db: DbDep
) -> EmployeeDetail:
    employee = service.get_employee(
        db, company_id=user.company_id, employee_id=employee_id
    )
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(employee, key, value)
    db.commit()
    db.refresh(employee)
    return _detail(db, user.company_id, employee)


# ── Placement ─────────────────────────────────────────────────────────


@router.get("/{employee_id}/assignments", response_model=list[AssignmentOut])
def list_assignments(
    employee_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> list[EmployeeAssignment]:
    service.get_employee(db, company_id=user.company_id, employee_id=employee_id)
    return list(
        db.execute(
            select(EmployeeAssignment)
            .where(
                EmployeeAssignment.employee_id == employee_id,
                EmployeeAssignment.company_id == user.company_id,
            )
            .order_by(EmployeeAssignment.effective_from.desc())
        )
        .scalars()
        .all()
    )


@router.post(
    "/{employee_id}/assignments",
    response_model=AssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def assign(
    employee_id: uuid.UUID, payload: AssignmentRequest, user: CurrentUserDep, db: DbDep
) -> EmployeeAssignment:
    """Transfer, promote or redesignate. Closes the previous assignment."""
    employee = service.get_employee(
        db, company_id=user.company_id, employee_id=employee_id
    )
    if employee.status is EmployeeStatus.EXITED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot reassign an exited employee")

    placement = payload.placement.model_dump()
    service.validate_placement(db, company_id=user.company_id, placement=placement)

    if placement.get("manager_id") == employee_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "An employee cannot manage themselves")

    assignment = service.open_assignment(
        db,
        company_id=user.company_id,
        employee_id=employee_id,
        placement=placement,
        reason=payload.reason,
        effective_from=payload.effective_from,
        note=payload.note,
    )
    service.record_event(
        db,
        company_id=user.company_id,
        employee_id=employee_id,
        event_type=EmployeeEventType.ASSIGNED,
        occurred_on=payload.effective_from,
        note=payload.reason.value,
        user_id=user.id,
    )
    db.commit()
    db.refresh(assignment)
    return assignment


# ── Lifecycle ─────────────────────────────────────────────────────────


@router.post("/{employee_id}/confirm", response_model=EmployeeDetail)
def confirm_employee(
    employee_id: uuid.UUID, payload: ConfirmRequest, user: CurrentUserDep, db: DbDep
) -> EmployeeDetail:
    employee = service.get_employee(
        db, company_id=user.company_id, employee_id=employee_id
    )
    service.confirm(db, employee=employee, on=payload.confirmed_on, user_id=user.id)
    db.commit()
    db.refresh(employee)
    return _detail(db, user.company_id, employee)


@router.post("/{employee_id}/exit", response_model=EmployeeDetail)
def exit_employee(
    employee_id: uuid.UUID, payload: ExitRequest, user: CurrentUserDep, db: DbDep
) -> EmployeeDetail:
    employee = service.get_employee(
        db, company_id=user.company_id, employee_id=employee_id
    )
    service.offboard(
        db,
        employee=employee,
        on=payload.exited_on,
        reason=payload.reason,
        user_id=user.id,
    )
    db.commit()
    db.refresh(employee)
    return _detail(db, user.company_id, employee)


@router.get("/{employee_id}/events", response_model=list[EventOut])
def list_events(
    employee_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> list[EmployeeEvent]:
    service.get_employee(db, company_id=user.company_id, employee_id=employee_id)
    return list(
        db.execute(
            select(EmployeeEvent)
            .where(
                EmployeeEvent.employee_id == employee_id,
                EmployeeEvent.company_id == user.company_id,
            )
            .order_by(EmployeeEvent.occurred_on.desc(), EmployeeEvent.created_at.desc())
        )
        .scalars()
        .all()
    )


# ── Documents ─────────────────────────────────────────────────────────


@router.get("/{employee_id}/documents", response_model=list[DocumentOut])
def list_documents(
    employee_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> list[EmployeeDocument]:
    service.get_employee(db, company_id=user.company_id, employee_id=employee_id)
    return list(
        db.execute(
            select(EmployeeDocument)
            .where(
                EmployeeDocument.employee_id == employee_id,
                EmployeeDocument.company_id == user.company_id,
            )
            .order_by(EmployeeDocument.created_at.desc())
        )
        .scalars()
        .all()
    )


@router.post(
    "/{employee_id}/documents",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_document(
    employee_id: uuid.UUID, payload: DocumentCreate, user: CurrentUserDep, db: DbDep
) -> EmployeeDocument:
    service.get_employee(db, company_id=user.company_id, employee_id=employee_id)

    if payload.expires_on and payload.issued_on and payload.expires_on < payload.issued_on:
        raise HTTPException(status.HTTP_409_CONFLICT, "A document cannot expire before issue")

    document = EmployeeDocument(
        company_id=user.company_id, employee_id=employee_id, **payload.model_dump()
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def _detail(db: DbDep, company_id: uuid.UUID, employee: Employee) -> EmployeeDetail:
    detail = EmployeeDetail.model_validate(employee)
    assignment = service.current_assignment(
        db, company_id=company_id, employee_id=employee.id
    )
    if assignment is not None:
        detail.current_assignment = AssignmentOut.model_validate(assignment)
    return detail


