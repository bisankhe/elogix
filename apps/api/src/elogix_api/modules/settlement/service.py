"""Gathering the inputs a settlement needs, and posting what approving one moves.

The engine in `compute.py` is pure and knows nothing about the database. This is the
part that goes and finds the numbers — from the salary history, the leave ledger, the
attendance register and the year's payslips — and, on approval, writes back the one
thing a settlement changes: the leave it just paid out.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from elogix_api.modules.attendance.models import AttendanceDay, DayStatus
from elogix_api.modules.employee.enums import MaritalStatus
from elogix_api.modules.employee.models import Employee, EmployeeAssignment
from elogix_api.modules.leave import service as leave_service
from elogix_api.modules.leave.models import LeaveType
from elogix_api.modules.org.models import EmploymentCategory
from elogix_api.modules.payroll import service as payroll_service
from elogix_api.modules.payroll.models import PayrollRun, Payslip, RunStatus
from elogix_api.modules.settlement import compute
from elogix_api.modules.settlement.models import (
    Settlement,
    SettlementAdjustment,
    SettlementLine,
    SettlementStatus,
)
from elogix_api.nepal import settlement as statutory

ZERO = Decimal("0")

# Statuses a settlement can still be recomputed from. Approved and paid are snapshots.
MUTABLE = (SettlementStatus.DRAFT, SettlementStatus.COMPUTED)


def _last_paid_through(
    db: Session, *, company_id: uuid.UUID, employee_id: uuid.UUID
) -> date | None:
    """The end of the last approved payroll period this employee was actually paid in.

    Approved, not merely computed: a draft run has paid nobody, and treating it as paid
    would silently drop a month of salary from the settlement.
    """
    return db.execute(
        select(func.max(PayrollRun.period_end))
        .join(Payslip, Payslip.payroll_run_id == PayrollRun.id)
        .where(
            Payslip.company_id == company_id,
            Payslip.employee_id == employee_id,
            PayrollRun.status.in_([RunStatus.APPROVED, RunStatus.PAID]),
        )
    ).scalar_one_or_none()


def _unpaid_days(
    db: Session,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    start: date,
    end: date,
) -> tuple[Decimal, int]:
    """Payable days in the unpaid tail, and how many register rows they came from.

    The same definition payroll uses — present, half, leave, holiday and weekly-off all
    count, absence does not — so the last part-month is paid on exactly the basis every
    earlier month was.

    The row count is returned because zero days and no data are different answers and
    look identical. An unprocessed register would otherwise pay a leaver nothing for
    the months since their last payroll run, silently. See `build_input`.
    """
    rows = db.execute(
        select(AttendanceDay.status, func.count())
        .where(
            AttendanceDay.company_id == company_id,
            AttendanceDay.employee_id == employee_id,
            AttendanceDay.work_date >= start,
            AttendanceDay.work_date <= end,
        )
        .group_by(AttendanceDay.status)
    ).all()

    payable = {
        DayStatus.PRESENT,
        DayStatus.LEAVE,
        DayStatus.HOLIDAY,
        DayStatus.WEEKLY_OFF,
    }
    total = ZERO
    found = 0
    for day_status, count in rows:
        found += count
        if day_status in payable:
            total += Decimal(count)
        elif day_status is DayStatus.HALF_DAY:
            total += Decimal(count) / 2
    return total, found


def _encashable_balances(
    db: Session, *, company_id: uuid.UUID, employee_id: uuid.UUID, on: date
) -> list[tuple[LeaveType, Decimal]]:
    """Balances of the leave types this company marks encashable.

    `encashable_above_days` being set is what marks a type encashable at all — it is the
    ceiling above which carry-forward pays out rather than forfeits. At exit there is no
    next year to carry into, so the whole remaining balance is paid, not just the excess.
    That reading is defensible and it is still a policy question: it belongs with the
    gratuity rule in the sign-off, not in a code review.
    """
    types = db.execute(
        select(LeaveType).where(
            LeaveType.company_id == company_id,
            LeaveType.is_active.is_(True),
            LeaveType.encashable_above_days.is_not(None),
        )
    ).scalars()

    out = []
    for leave_type in types:
        balance = leave_service.balance_for(
            db,
            company_id=company_id,
            employee_id=employee_id,
            leave_type_id=leave_type.id,
            leave_year=on.year,
        )
        if balance > ZERO:
            out.append((leave_type, balance))
    return out


def _year_to_date(
    db: Session, *, company_id: uuid.UUID, employee_id: uuid.UUID, on: date
) -> tuple[Decimal, Decimal]:
    """Taxable income and tax withheld so far, from this employee's own payslips.

    Only approved runs count. A computed-but-unapproved run has withheld nothing, and
    crediting its tax would under-collect at exactly the moment there is no later
    payment to correct it in.
    """
    row = db.execute(
        select(
            func.coalesce(func.sum(Payslip.taxable_gross), 0),
            func.coalesce(func.sum(Payslip.monthly_tax), 0),
        )
        .join(PayrollRun, PayrollRun.id == Payslip.payroll_run_id)
        .where(
            Payslip.company_id == company_id,
            Payslip.employee_id == employee_id,
            PayrollRun.status.in_([RunStatus.APPROVED, RunStatus.PAID]),
            PayrollRun.period_end <= on,
        )
    ).one()
    return Decimal(row[0]), Decimal(row[1])


def build_input(
    db: Session, *, settlement: Settlement, employee: Employee
) -> tuple[compute.SettlementInput, list[str]]:
    """Assemble everything the engine needs, plus anything the reader must be told.

    Returns warnings alongside the input because some of what this discovers is not a
    number — "no payroll run has ever covered this person" changes how the settlement
    should be read, and a figure that silently assumes it is a figure nobody can trust.
    """
    salary = payroll_service.salary_on(
        db,
        company_id=settlement.company_id,
        employee_id=employee.id,
        on=settlement.last_working_day,
    )
    if salary is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No salary is on record for this employee at their last working day, so "
            "there is nothing to settle from. Set a salary first.",
        )

    # Unpaid salary has three cases and they are genuinely different. Collapsing them
    # is how a leaver gets paid nothing for four months without anyone noticing.
    warnings: list[str] = []
    paid_through = _last_paid_through(
        db, company_id=settlement.company_id, employee_id=employee.id
    )
    unpaid_from: date | None = None
    unpaid_days = ZERO

    if paid_through is None:
        # Nobody has ever been paid through this system. There is no reliable window to
        # compute from, so nothing is claimed — but the reader is told, because a
        # missing salary line looks identical to a settled one.
        warnings.append(
            "No approved payroll run covers this employee, so no unpaid salary has been "
            "computed. If any is owed, add it as an adjustment."
        )
    elif paid_through < settlement.last_working_day:
        unpaid_from = paid_through + timedelta(days=1)
        unpaid_days, register_rows = _unpaid_days(
            db,
            company_id=settlement.company_id,
            employee_id=employee.id,
            start=unpaid_from,
            end=settlement.last_working_day,
        )
        # An empty register over a real unpaid window is "we do not know", not "no days
        # worked", and the two are indistinguishable in the total. Refused rather than
        # noted: the fix is a minute of attendance processing, and a settlement that
        # quietly pays nothing looks deliberate to everyone who reads it afterwards.
        if register_rows == 0:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"The attendance register has no days between {unpaid_from.isoformat()} "
                f"and {settlement.last_working_day.isoformat()}, so there is no basis "
                "for the unpaid salary. Process attendance for that period first — "
                "computing now would pay nothing for it and look deliberate.",
            )

    balances = _encashable_balances(
        db,
        company_id=settlement.company_id,
        employee_id=employee.id,
        on=settlement.last_working_day,
    )
    ytd_taxable, ytd_withheld = _year_to_date(
        db,
        company_id=settlement.company_id,
        employee_id=employee.id,
        on=settlement.last_working_day,
    )

    adjustments = db.execute(
        select(SettlementAdjustment).where(
            SettlementAdjustment.settlement_id == settlement.id,
            SettlementAdjustment.company_id == settlement.company_id,
        )
    ).scalars()

    return compute.SettlementInput(
        basic=salary.basic,
        joined_on=employee.joined_on,
        last_working_day=settlement.last_working_day,
        contributes_to_ssf=salary.contributes_to_ssf,
        initiator=compute.ExitInitiator(settlement.initiator),
        unpaid_days=unpaid_days,
        unpaid_from=unpaid_from,
        encashable_leave=tuple(
            compute.LeaveBalance(
                leave_type_id=str(leave_type.id),
                code=leave_type.code,
                name=leave_type.name,
                days=days,
            )
            for leave_type, days in balances
        ),
        notice_days_required=settlement.notice_days_required,
        notice_days_served=settlement.notice_days_served,
        adjustments=tuple(
            compute.Adjustment(
                kind=compute.LineKind(row.kind),
                label=row.label,
                amount=row.amount,
                reason=row.reason,
                taxable=row.taxable,
            )
            for row in adjustments
        ),
        ytd_taxable=ytd_taxable,
        ytd_tax_withheld=ytd_withheld,
    ), warnings


def notice_days_for(
    db: Session, *, company_id: uuid.UUID, employee_id: uuid.UUID, on: date
) -> int:
    """The notice period from the employee's employment category, or none.

    Read from the assignment covering the last working day rather than the current one,
    because by the time a settlement is computed the assignment has usually been closed.
    """
    row = db.execute(
        select(EmploymentCategory.notice_days)
        .join(
            EmployeeAssignment,
            EmployeeAssignment.employment_category_id == EmploymentCategory.id,
        )
        .where(
            EmployeeAssignment.company_id == company_id,
            EmployeeAssignment.employee_id == employee_id,
            EmployeeAssignment.effective_from <= on,
        )
        .order_by(EmployeeAssignment.effective_from.desc())
    ).scalars().first()
    return int(row) if row is not None else 0


def recompute(db: Session, *, settlement: Settlement, employee: Employee) -> Settlement:
    """Compute the settlement and replace its lines. Does not commit."""
    if settlement.status not in MUTABLE:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This settlement is {settlement.status.value} and is a snapshot; it cannot "
            "be recomputed. Cancel it and raise a new one if the figures are wrong.",
        )

    data, warnings = build_input(db, settlement=settlement, employee=employee)
    slabs, _verified = payroll_service.load_scale(
        db,
        company_id=settlement.company_id,
        fiscal_year=settlement.fiscal_year,
        is_married=employee.marital_status is MaritalStatus.MARRIED,
    )
    result = compute.compute_settlement(data, slabs=slabs)

    for line in db.execute(
        select(SettlementLine).where(SettlementLine.settlement_id == settlement.id)
    ).scalars():
        db.delete(line)

    for sequence, line in enumerate(result.lines):
        db.add(
            SettlementLine(
                company_id=settlement.company_id,
                settlement_id=settlement.id,
                kind=line.kind.value,
                code=line.code,
                label=line.label,
                amount=line.amount,
                basis=line.basis,
                taxable=line.taxable,
                sequence=sequence,
            )
        )

    settlement.gross_earnings = result.gross_earnings
    settlement.taxable_earnings = result.taxable_earnings
    settlement.total_deductions = result.total_deductions
    settlement.tax = result.tax
    settlement.net_payable = result.net_payable
    settlement.basic_at_exit = data.basic
    settlement.contributed_to_ssf = data.contributes_to_ssf
    settlement.ytd_taxable = data.ytd_taxable
    settlement.ytd_tax_withheld = data.ytd_tax_withheld
    settlement.deadline = statutory.deadline(settlement.last_working_day)
    settlement.status = SettlementStatus.COMPUTED
    settlement.computed_at = datetime.now(UTC)
    settlement.notes = "\n".join([*warnings, *result.notes]) or None

    return settlement


def approve(
    db: Session, *, settlement: Settlement, user_id: uuid.UUID
) -> int:
    """Approve, and consume the leave it pays out in the same transaction.

    This is the phase 05 rule applied at exit: the encashment is an *insert* of signed
    ledger rows, not a decrement of a stored number. Two approvers racing cannot both
    pay the same balance out, and afterwards the ledger explains where the days went.

    Returns the number of ledger entries posted.
    """
    if settlement.status is not SettlementStatus.COMPUTED:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Only a computed settlement can be approved; this one is "
            f"{settlement.status.value}.",
        )

    posted = 0
    for line in db.execute(
        select(SettlementLine).where(
            SettlementLine.settlement_id == settlement.id,
            SettlementLine.company_id == settlement.company_id,
            SettlementLine.code.startswith("LEAVE_ENCASH_"),
        )
    ).scalars():
        code = line.code.removeprefix("LEAVE_ENCASH_")
        leave_type = db.execute(
            select(LeaveType).where(
                LeaveType.company_id == settlement.company_id, LeaveType.code == code
            )
        ).scalar_one_or_none()
        if leave_type is None:
            continue

        balance = leave_service.balance_for(
            db,
            company_id=settlement.company_id,
            employee_id=settlement.employee_id,
            leave_type_id=leave_type.id,
            leave_year=settlement.last_working_day.year,
        )
        if balance <= ZERO:
            continue

        # Re-read rather than trust the computed line: the balance may have moved
        # between computing and approving, and paying out more than is there would
        # leave the ledger negative.
        leave_service.post_encashment(
            db,
            company_id=settlement.company_id,
            employee_id=settlement.employee_id,
            leave_type_id=leave_type.id,
            leave_year=settlement.last_working_day.year,
            entry_date=settlement.last_working_day,
            days=balance,
            note=f"Encashed on exit, settlement {settlement.id}",
        )
        posted += 1

    settlement.status = SettlementStatus.APPROVED
    settlement.approved_at = datetime.now(UTC)
    settlement.approved_by = user_id
    return posted
