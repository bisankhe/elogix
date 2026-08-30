"""Employee lifecycle.

Every transition here does three things together: move the employee's status, close or
open the dated assignment, and append a timeline event. Keeping that in one place is the
point — a transfer written ad hoc in a router would eventually close the old assignment
and forget the event, and the history would quietly stop being true.
"""

import uuid
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.modules.employee.models import (
    AssignmentReason,
    Employee,
    EmployeeAssignment,
    EmployeeEvent,
    EmployeeEventType,
    EmployeeStatus,
)
from elogix_api.modules.org.models import (
    CostCentre,
    Designation,
    EmploymentCategory,
    GradeLevel,
    OrgUnit,
    Position,
    WorkLocation,
)

_ONE_DAY = timedelta(days=1)


def get_employee(db: Session, *, company_id: uuid.UUID, employee_id: uuid.UUID) -> Employee:
    employee = db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.company_id == company_id)
    ).scalar_one_or_none()
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Employee not found")
    return employee


def current_assignment(
    db: Session, *, company_id: uuid.UUID, employee_id: uuid.UUID
) -> EmployeeAssignment | None:
    """The open assignment. There is at most one, by construction."""
    return db.execute(
        select(EmployeeAssignment).where(
            EmployeeAssignment.employee_id == employee_id,
            EmployeeAssignment.company_id == company_id,
            EmployeeAssignment.effective_to.is_(None),
        )
    ).scalar_one_or_none()


def validate_placement(db: Session, *, company_id: uuid.UUID, placement: dict) -> None:
    """Every org reference must belong to the caller's tenant.

    The foreign keys alone would happily let an assignment point at another company's
    department — the constraint checks existence, not ownership.
    """
    checks = (
        ("org_unit_id", OrgUnit),
        ("position_id", Position),
        ("designation_id", Designation),
        ("grade_level_id", GradeLevel),
        ("work_location_id", WorkLocation),
        ("employment_category_id", EmploymentCategory),
        ("cost_centre_id", CostCentre),
    )
    for field, model in checks:
        value = placement.get(field)
        if value is None:
            continue
        exists = db.execute(
            select(model.id).where(model.id == value, model.company_id == company_id)
        ).first()
        if exists is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, f"{field.replace('_id', '').replace('_', ' ')} not found"
            )

    manager_id = placement.get("manager_id")
    if manager_id is not None:
        get_employee(db, company_id=company_id, employee_id=manager_id)


def record_event(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    event_type: EmployeeEventType,
    occurred_on: date,
    note: str | None = None,
    user_id: uuid.UUID | None = None,
) -> EmployeeEvent:
    event = EmployeeEvent(
        company_id=company_id,
        employee_id=employee_id,
        event_type=event_type,
        occurred_on=occurred_on,
        note=note,
        recorded_by_user_id=user_id,
    )
    db.add(event)
    return event


def open_assignment(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    placement: dict,
    reason: AssignmentReason,
    effective_from: date,
    note: str | None = None,
) -> EmployeeAssignment:
    """Close the open assignment, if any, and start a new one the day before.

    The previous row is closed at `effective_from - 1 day` rather than on the same date,
    so the two periods do not both contain the changeover date. Anything asking "where
    was this person on date X" gets exactly one answer.
    """
    existing = current_assignment(db, company_id=company_id, employee_id=employee_id)
    if existing is not None:
        if effective_from <= existing.effective_from:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "An assignment cannot start on or before the current one began",
            )
        existing.effective_to = effective_from - _ONE_DAY

    assignment = EmployeeAssignment(
        company_id=company_id,
        employee_id=employee_id,
        reason=reason,
        effective_from=effective_from,
        note=note,
        **placement,
    )
    db.add(assignment)
    return assignment


def confirm(
    db: Session, *, employee: Employee, on: date, user_id: uuid.UUID | None = None
) -> None:
    """Probation → active."""
    if employee.status is not EmployeeStatus.PROBATION:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only an employee on probation can be confirmed"
        )
    if on < employee.joined_on:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Confirmation cannot predate the joining date"
        )

    employee.status = EmployeeStatus.ACTIVE
    employee.confirmed_on = on
    record_event(
        db,
        company_id=employee.company_id,
        employee_id=employee.id,
        event_type=EmployeeEventType.CONFIRMED,
        occurred_on=on,
        user_id=user_id,
    )


def offboard(
    db: Session,
    *,
    employee: Employee,
    on: date,
    reason: str,
    user_id: uuid.UUID | None = None,
) -> None:
    """Exit. Closes the open assignment so nothing counts the person as still placed."""
    if employee.status is EmployeeStatus.EXITED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Employee has already exited")
    if on < employee.joined_on:
        raise HTTPException(status.HTTP_409_CONFLICT, "Exit cannot predate the joining date")

    assignment = current_assignment(
        db, company_id=employee.company_id, employee_id=employee.id
    )
    if assignment is not None:
        assignment.effective_to = on

    employee.status = EmployeeStatus.EXITED
    employee.exited_on = on
    employee.exit_reason = reason
    record_event(
        db,
        company_id=employee.company_id,
        employee_id=employee.id,
        event_type=EmployeeEventType.EXITED,
        occurred_on=on,
        note=reason,
        user_id=user_id,
    )
