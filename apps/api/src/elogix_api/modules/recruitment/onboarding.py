"""Turning an accepted offer into a person on the payroll.

This is the seam between phase 09 and phase 03, and it is the reason a requisition is
tied to a `Position` rather than to free text. The position already carries the org
unit, the designation, the grade, the location and the employment category; onboarding
copies them onto the opening assignment rather than asking anyone to retype an org
chart that already exists.

**The offer's number becomes the payroll number.** `offer.basic` is written straight
into `employee_salaries` effective from the start date. A salary retyped between the
offer letter and the payroll screen is a salary that will eventually differ from the one
the candidate agreed to, and the person who notices will be the employee.

**One offer, one employee, one way.** `Offer.employee_id` is unique and nullable, set
once. An employee is never un-hired back into a candidate — if a joiner does not turn
up, they are offboarded like anyone else, because that is what actually happened.
"""

import calendar
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from elogix_api.modules.employee import service as employee_service
from elogix_api.modules.employee.enums import DocumentType
from elogix_api.modules.employee.models import (
    AssignmentReason,
    Employee,
    EmployeeDocument,
    EmployeeEventType,
    EmployeeStatus,
)
from elogix_api.modules.org.models import Designation, EmploymentCategory, Position
from elogix_api.modules.payroll import service as payroll_service
from elogix_api.modules.recruitment import service
from elogix_api.modules.recruitment.models import (
    Application,
    Candidate,
    Offer,
    OfferStatus,
    Requisition,
    RequisitionStatus,
)


def _probation_end(
    db: Session, *, company_id: uuid.UUID, category_id: uuid.UUID | None, starts_on: date
) -> date | None:
    """When probation ends, from the employment category the position names.

    A category with zero probation months returns None, which is what makes the new
    employee `active` rather than `probation` — a contract hire is not on probation and
    should not read as if they were.
    """
    if category_id is None:
        return None
    months = db.execute(
        select(EmploymentCategory.probation_months).where(
            EmploymentCategory.id == category_id,
            EmploymentCategory.company_id == company_id,
        )
    ).scalar_one_or_none()
    if not months:
        return None

    month = starts_on.month - 1 + months
    year = starts_on.year + month // 12
    month = month % 12 + 1
    # Clamp for a short month: 31 August plus six months is 28 February, not the 31st.
    # `monthrange` rather than a hand-written table, which would need its own leap-year
    # rule and would get 1900 wrong.
    day = min(starts_on.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def onboard(
    db: Session,
    *,
    company_id: uuid.UUID,
    offer: Offer,
    employee_code: str,
    user_id: uuid.UUID | None,
) -> Employee:
    """Create the employee an accepted offer promised. Does not commit."""
    if offer.status is not OfferStatus.ACCEPTED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This offer is {offer.status.value}. Only an accepted offer becomes an "
            "employee — otherwise the payroll would carry someone who never agreed to "
            "join.",
        )
    if offer.employee_id is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This offer has already been onboarded. Onboarding twice would put the same "
            "person on the payroll twice.",
        )

    application = db.execute(
        select(Application).where(Application.id == offer.application_id)
    ).scalar_one()
    candidate = db.execute(
        select(Candidate).where(Candidate.id == application.candidate_id)
    ).scalar_one()
    requisition = db.execute(
        select(Requisition).where(Requisition.id == application.requisition_id)
    ).scalar_one()
    position = db.execute(
        select(Position).where(Position.id == requisition.position_id)
    ).scalar_one()

    # The candidate's name arrives as one string; the employee record wants parts. Split
    # on the last space, which is right for most Nepali names and wrong for some — so
    # the fields stay editable and this is a starting point, not a claim.
    first, _, last = candidate.full_name.rpartition(" ")
    probation_ends_on = _probation_end(
        db,
        company_id=company_id,
        category_id=position.employment_category_id,
        starts_on=offer.starts_on,
    )

    employee = Employee(
        company_id=company_id,
        employee_code=employee_code,
        first_name=first or candidate.full_name,
        last_name=last if first else "",
        work_email=candidate.email,
        phone=candidate.phone,
        joined_on=offer.starts_on,
        probation_ends_on=probation_ends_on,
        status=EmployeeStatus.PROBATION if probation_ends_on else EmployeeStatus.ACTIVE,
    )
    db.add(employee)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"An employee with code {employee_code} already exists"
        ) from exc

    # The grade hangs off the designation, not the position — a designation *is* a
    # grade's job title — so it is resolved rather than assumed to be on the position.
    grade_level_id = (
        db.execute(
            select(Designation.grade_level_id).where(
                Designation.id == position.designation_id,
                Designation.company_id == company_id,
            )
        ).scalar_one_or_none()
        if position.designation_id
        else None
    )

    # Placement copied from the position, which is where the org chart already says all
    # of this. Nobody retypes a department.
    employee_service.open_assignment(
        db,
        company_id=company_id,
        employee_id=employee.id,
        placement={
            "org_unit_id": position.org_unit_id,
            "position_id": position.id,
            "designation_id": position.designation_id,
            "grade_level_id": grade_level_id,
            "work_location_id": position.work_location_id,
            "employment_category_id": position.employment_category_id,
            "cost_centre_id": position.cost_centre_id,
            "manager_id": None,
        },
        reason=AssignmentReason.HIRE,
        effective_from=offer.starts_on,
    )
    employee_service.record_event(
        db,
        company_id=company_id,
        employee_id=employee.id,
        event_type=EmployeeEventType.HIRED,
        occurred_on=offer.starts_on,
        note=f"Onboarded from requisition {requisition.code}",
        user_id=user_id,
    )

    # The offered figure, not a retyped one.
    payroll_service.set_salary(
        db,
        company_id=company_id,
        employee_id=employee.id,
        basic=offer.basic,
        effective_from=offer.starts_on,
        note=f"Agreed in the offer accepted on {offer.responded_at:%Y-%m-%d}"
        if offer.responded_at
        else "Agreed in the accepted offer",
    )

    # The CV they applied with becomes the first document in their file. The key is
    # content-addressed, so this references the same bytes rather than copying them.
    if candidate.resume_key:
        db.add(
            EmployeeDocument(
                company_id=company_id,
                employee_id=employee.id,
                document_type=DocumentType.CV,
                title="CV submitted with application",
                storage_key=candidate.resume_key,
                original_filename=candidate.resume_filename,
            )
        )

    offer.employee_id = employee.id

    # Close the requisition once every opening is filled, so it stops holding budget.
    if service.hired_against(db, requisition_id=requisition.id) >= requisition.openings:
        requisition.status = RequisitionStatus.FILLED

    return employee
