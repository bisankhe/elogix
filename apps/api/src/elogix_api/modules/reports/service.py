"""The report queries.

Deliberately few. The prototype had around forty report screens and most were the same
filtered table with a different `WHERE`; the ones here are the questions that are
actually different in kind — who works here, what leave is owed, and what was paid.
Anything that is "the employee list, filtered" belongs on the employee list, filtered.

Every one of these totals on the server. Two places adding up the same column is how a
report ends up disagreeing with the screen it was exported from.
"""

import uuid
from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from elogix_api.modules.employee.models import (
    Employee,
    EmployeeAssignment,
    EmployeeStatus,
)
from elogix_api.modules.leave.models import LeaveLedgerEntry, LeaveType
from elogix_api.modules.org.models import Designation, OrgUnit
from elogix_api.modules.payroll.models import PayrollRun, Payslip
from elogix_api.modules.reports import schemas

ZERO = Decimal("0")

# What a headcount can be cut by. An allowlist, because this value chooses a query —
# "group by whatever the caller typed" is how a report endpoint becomes an injection.
GROUPINGS = ("department", "designation", "status", "gender")


def _staff_with_placement(*, company_id: uuid.UUID):  # noqa: ANN202
    """Every employee with their *latest* department and designation.

    Latest, not open. Offboarding closes the assignment, so an exited employee has no
    open row at all — joining on `effective_to IS NULL` would file every leaver under
    "Unassigned" and a department that lost four engineers would show as having lost
    nobody. That is the exact question a headcount report is asked.

    For anyone still employed the latest assignment *is* the open one, so this is the
    same answer everywhere else, arrived at without a special case.

    An employee with no assignment at all still appears, via the outer join — leaving
    them out would make the headcount quietly disagree with the employee list.
    """
    latest = (
        select(
            EmployeeAssignment.employee_id.label("employee_id"),
            EmployeeAssignment.org_unit_id.label("org_unit_id"),
            EmployeeAssignment.designation_id.label("designation_id"),
        )
        .where(EmployeeAssignment.company_id == company_id)
        .distinct(EmployeeAssignment.employee_id)
        .order_by(
            EmployeeAssignment.employee_id,
            EmployeeAssignment.effective_from.desc(),
            # Two assignments dated the same day: the one written later wins.
            EmployeeAssignment.created_at.desc(),
        )
        .subquery()
    )

    return (
        select(Employee, OrgUnit.name, Designation.name)
        .select_from(Employee)
        .outerjoin(latest, latest.c.employee_id == Employee.id)
        .outerjoin(OrgUnit, OrgUnit.id == latest.c.org_unit_id)
        .outerjoin(Designation, Designation.id == latest.c.designation_id)
        .where(Employee.company_id == company_id)
        .order_by(Employee.employee_code)
    )


def headcount(db: Session, *, company_id: uuid.UUID, group_by: str) -> schemas.Headcount:
    """Headcount by one dimension, counting every status rather than only the active.

    Exited people are shown, not filtered out. A department that lost four of its six
    engineers this year is exactly what a headcount report exists to make visible, and
    a view that only ever shows who is left cannot show it.

    Grouped in Python from one query rather than in five different SQL statements. A
    company's staff is a few hundred rows, and one readable query beats a builder that
    assembles a `GROUP BY` per dimension — that builder is where the injection would
    have lived.
    """
    rows = db.execute(_staff_with_placement(company_id=company_id)).all()

    buckets: dict[str, dict[EmployeeStatus, int]] = defaultdict(lambda: defaultdict(int))
    for employee, unit, designation in rows:
        key = {
            "department": unit,
            "designation": designation,
            "status": employee.status.value,
            "gender": employee.gender.value,
        }[group_by]
        buckets[key or "Unassigned"][employee.status] += 1

    out = [
        schemas.HeadcountRow(
            group=group,
            active=counts.get(EmployeeStatus.ACTIVE, 0),
            probation=counts.get(EmployeeStatus.PROBATION, 0),
            suspended=counts.get(EmployeeStatus.SUSPENDED, 0),
            exited=counts.get(EmployeeStatus.EXITED, 0),
            total=sum(counts.values()),
        )
        for group, counts in sorted(buckets.items())
    ]

    return schemas.Headcount(
        as_of=date.today(),
        grouped_by=group_by,
        rows=out,
        # "On the books" — everyone not exited. Someone on probation or suspended is
        # still employed and still on the payroll, so counting only `active` would
        # understate what the company has to fund.
        total_active=sum(row.active + row.probation + row.suspended for row in out),
    )


def leave_balances(
    db: Session, *, company_id: uuid.UUID, leave_year: int
) -> schemas.LeaveBalanceReport:
    """Every employee's balance in every leave type, as one flat table.

    Summed from the ledger in a single grouped query rather than by calling
    `balance_for` once per employee per type — the same arithmetic the ledger defines,
    done once instead of a few hundred times.

    Exited employees are excluded: their balance was settled on the way out, and a
    report of what the company still owes should not carry it.
    """
    totals: dict[tuple[uuid.UUID, uuid.UUID], Decimal] = {
        (employee_id, type_id): Decimal(days)
        for employee_id, type_id, days in db.execute(
            select(
                LeaveLedgerEntry.employee_id,
                LeaveLedgerEntry.leave_type_id,
                func.sum(LeaveLedgerEntry.days),
            )
            .where(
                LeaveLedgerEntry.company_id == company_id,
                LeaveLedgerEntry.leave_year == leave_year,
            )
            .group_by(LeaveLedgerEntry.employee_id, LeaveLedgerEntry.leave_type_id)
        ).all()
    }

    people = db.execute(
        _staff_with_placement(company_id=company_id).where(
            Employee.status != EmployeeStatus.EXITED
        )
    ).all()

    types = list(
        db.execute(
            select(LeaveType)
            .where(LeaveType.company_id == company_id, LeaveType.is_active.is_(True))
            .order_by(LeaveType.code)
        )
        .scalars()
        .all()
    )

    return schemas.LeaveBalanceReport(
        leave_year=leave_year,
        rows=[
            schemas.LeaveBalanceRow(
                employee_id=employee.id,
                employee_code=employee.employee_code,
                full_name=employee.full_name,
                org_unit=unit,
                leave_type=leave_type.name,
                # A type someone has no ledger rows in is a zero, not a missing row.
                # The report is a grid, and a gap in it reads as "unknown".
                available_days=totals.get((employee.id, leave_type.id), ZERO),
            )
            for employee, unit, _ in people
            for leave_type in types
        ],
    )


def payroll_register(
    db: Session, *, company_id: uuid.UUID, run: PayrollRun
) -> schemas.PayrollRegister:
    """One run, every payslip, with the totals a statutory filing needs."""
    rows = db.execute(
        select(Payslip, Employee)
        .join(Employee, Employee.id == Payslip.employee_id)
        .where(Payslip.company_id == company_id, Payslip.payroll_run_id == run.id)
        .order_by(Employee.employee_code)
    ).all()

    out = [
        schemas.PayrollRegisterRow(
            employee_code=employee.employee_code,
            full_name=employee.full_name,
            payable_days=payslip.payable_days,
            basic_earned=payslip.basic_earned,
            overtime_pay=payslip.overtime_pay,
            gross=payslip.gross,
            ssf_employee=payslip.ssf_employee,
            ssf_employer=payslip.ssf_employer,
            monthly_tax=payslip.monthly_tax,
            total_deductions=payslip.total_deductions,
            net_pay=payslip.net_pay,
        )
        for payslip, employee in rows
    ]

    def total(field: str) -> Decimal:
        return sum((getattr(row, field) for row in out), ZERO)

    return schemas.PayrollRegister(
        period_start=run.period_start,
        period_end=run.period_end,
        fiscal_year=run.fiscal_year,
        status=run.status.value,
        rows=out,
        totals=schemas.PayrollRegisterTotals(
            employees=len(out),
            gross=total("gross"),
            ssf_employee=total("ssf_employee"),
            ssf_employer=total("ssf_employer"),
            monthly_tax=total("monthly_tax"),
            net_pay=total("net_pay"),
        ),
    )
