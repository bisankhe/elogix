"""Assembling one employee's own view.

Everything here takes `employee_id` as a keyword argument and every caller passes the
value from `CurrentEmployeeDep`. That is deliberate: the functions are ordinary and
reusable, and the *only* place the id is chosen is the dependency that reads it out of
the signed token. Keeping the choice in one place is what makes the boundary auditable.
"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import InstrumentedAttribute, Session

from elogix_api.modules.attendance.models import AttendanceDay, DayStatus
from elogix_api.modules.employee.models import Employee
from elogix_api.modules.employee.service import current_assignment
from elogix_api.modules.ess import schemas
from elogix_api.modules.org.models import (
    Designation,
    GradeLevel,
    OrgUnit,
    WorkLocation,
)
from elogix_api.modules.payroll.models import PayrollRun, Payslip, RunStatus


def _name_of(
    db: Session,
    name_column: InstrumentedAttribute[str],
    id_column: InstrumentedAttribute[uuid.UUID],
    row_id: uuid.UUID | None,
) -> str | None:
    """One name from a lookup table, or None.

    Takes the two columns rather than the model class so it stays typed — a bare
    `model: type` reads fine and tells the checker nothing.
    """
    if row_id is None:
        return None
    return db.execute(select(name_column).where(id_column == row_id)).scalar_one_or_none()


def profile(db: Session, *, company_id: uuid.UUID, employee: Employee) -> schemas.MyProfile:
    """The employee record with its placement resolved to names."""
    out = schemas.MyProfile.model_validate(employee)

    assignment = current_assignment(db, company_id=company_id, employee_id=employee.id)
    if assignment is None:
        return out

    out.org_unit = _name_of(db, OrgUnit.name, OrgUnit.id, assignment.org_unit_id)
    out.designation = _name_of(db, Designation.name, Designation.id, assignment.designation_id)
    out.grade_level = _name_of(db, GradeLevel.name, GradeLevel.id, assignment.grade_level_id)
    out.work_location = _name_of(
        db, WorkLocation.name, WorkLocation.id, assignment.work_location_id
    )

    if assignment.manager_id is not None:
        manager = db.execute(
            select(Employee).where(
                Employee.id == assignment.manager_id, Employee.company_id == company_id
            )
        ).scalar_one_or_none()
        # The manager's name and nothing else. A reporting line is something an
        # employee needs to know; the manager's salary is not.
        out.manager_name = manager.full_name if manager else None

    return out


def attendance_month(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    start: date,
    end: date,
) -> schemas.MyAttendanceMonth:
    """My register for a period, with the totals already added up.

    The totals are computed here rather than left to the client because the same
    figures drive the payslip, and two places counting present days independently is
    how a screen ends up disagreeing with the pay it explains.
    """
    days = list(
        db.execute(
            select(AttendanceDay)
            .where(
                AttendanceDay.company_id == company_id,
                AttendanceDay.employee_id == employee_id,
                AttendanceDay.work_date >= start,
                AttendanceDay.work_date <= end,
            )
            .order_by(AttendanceDay.work_date)
        )
        .scalars()
        .all()
    )

    def count(*statuses: DayStatus) -> int:
        return sum(1 for d in days if d.status in statuses)

    return schemas.MyAttendanceMonth(
        period_start=start,
        period_end=end,
        present_days=count(DayStatus.PRESENT, DayStatus.HALF_DAY),
        absent_days=count(DayStatus.ABSENT),
        leave_days=count(DayStatus.LEAVE),
        holiday_days=count(DayStatus.HOLIDAY, DayStatus.WEEKLY_OFF),
        worked_minutes=sum(d.worked_minutes for d in days),
        overtime_minutes=sum(d.overtime_minutes for d in days),
        late_minutes=sum(d.late_minutes for d in days),
        days=[schemas.MyDay.model_validate(d) for d in days],
    )


def payslip_query(company_id: uuid.UUID, employee_id: uuid.UUID):  # noqa: ANN201
    """Payslips that are mine *and* from an approved run.

    A computed-but-unapproved run is a working draft: figures move, an absence gets
    regularised, a component is corrected. Showing one to the employee turns every
    correction into an argument about a number they were never meant to see, so the
    run's status is part of the filter and not an afterthought on the client.
    """
    return (
        select(Payslip, PayrollRun)
        .join(PayrollRun, PayrollRun.id == Payslip.payroll_run_id)
        .where(
            Payslip.company_id == company_id,
            Payslip.employee_id == employee_id,
            PayrollRun.status.in_([RunStatus.APPROVED, RunStatus.PAID]),
        )
    )


def summarise_payslip(payslip: Payslip, run: PayrollRun) -> schemas.MyPayslipSummary:
    return schemas.MyPayslipSummary(
        id=payslip.id,
        period_start=run.period_start,
        period_end=run.period_end,
        fiscal_year=run.fiscal_year,
        payable_days=payslip.payable_days,
        gross=payslip.gross,
        total_deductions=payslip.total_deductions,
        net_pay=payslip.net_pay,
    )
