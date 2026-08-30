"""Employee self-service.

Every route here answers for the caller and only the caller. `CurrentEmployeeDep`
resolves the employee id from the signed token; no path, query or body parameter in this
module names an employee, so there is no id for an attacker to substitute. That is the
single design rule of the module, and `tests/test_ess.py` sweeps every route to prove it
holds.

The module is gated on `ModuleCode.ESS` at the router, so a route added later is covered
without its author remembering.
"""

import calendar
import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from elogix_api.core.deps import (
    CurrentEmployeeDep,
    CurrentUserDep,
    DbDep,
    require_module,
)
from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.employee.models import EmployeeDocument
from elogix_api.modules.employee.service import get_employee
from elogix_api.modules.ess import service
from elogix_api.modules.ess.schemas import (
    MyAttendanceMonth,
    MyBalance,
    MyDocument,
    MyLeaveApply,
    MyLeaveRequest,
    MyPayslip,
    MyPayslipBand,
    MyPayslipLine,
    MyPayslipSummary,
    MyProfile,
)
from elogix_api.modules.leave import service as leave_service
from elogix_api.modules.leave.models import (
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
)
from elogix_api.modules.payroll.models import Payslip, PayslipLine, PayslipTaxBand

router = APIRouter(
    prefix="/ess",
    tags=["ess"],
    dependencies=[Depends(require_module(ModuleCode.ESS))],
)


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])


# ── Me ────────────────────────────────────────────────────────────────


@router.get("/me", response_model=MyProfile)
def my_profile(employee_id: CurrentEmployeeDep, user: CurrentUserDep, db: DbDep) -> MyProfile:
    employee = get_employee(db, company_id=user.company_id, employee_id=employee_id)
    return service.profile(db, company_id=user.company_id, employee=employee)


# ── Attendance ────────────────────────────────────────────────────────


@router.get("/attendance", response_model=MyAttendanceMonth)
def my_attendance(
    employee_id: CurrentEmployeeDep,
    user: CurrentUserDep,
    db: DbDep,
    year: Annotated[int, Query(ge=2000, le=2100)],
    month: Annotated[int, Query(ge=1, le=12)],
) -> MyAttendanceMonth:
    """My register for one month, totals included.

    A month rather than an arbitrary range: this is the unit an employee checks their
    pay against, and an unbounded range on a self-service endpoint is an easy way to
    ask the database for ten years of rows.
    """
    start, end = _month_bounds(year, month)
    return service.attendance_month(
        db, company_id=user.company_id, employee_id=employee_id, start=start, end=end
    )


# ── Leave ─────────────────────────────────────────────────────────────


@router.get("/leave/balances", response_model=list[MyBalance])
def my_balances(
    employee_id: CurrentEmployeeDep,
    user: CurrentUserDep,
    db: DbDep,
    leave_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
) -> list[MyBalance]:
    year = leave_year or date.today().year
    return [
        MyBalance(
            leave_type_id=leave_type.id,
            code=leave_type.code,
            name=leave_type.name,
            leave_year=year,
            available_days=leave_service.balance_for(
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


@router.get("/leave/requests", response_model=list[MyLeaveRequest])
def my_leave_requests(
    employee_id: CurrentEmployeeDep, user: CurrentUserDep, db: DbDep
) -> list[LeaveRequest]:
    return list(
        db.execute(
            select(LeaveRequest)
            .where(
                LeaveRequest.company_id == user.company_id,
                LeaveRequest.employee_id == employee_id,
            )
            .order_by(LeaveRequest.start_date.desc())
        )
        .scalars()
        .all()
    )


@router.post("/leave/requests", response_model=MyLeaveRequest, status_code=status.HTTP_201_CREATED)
def apply_for_leave(
    payload: MyLeaveApply, employee_id: CurrentEmployeeDep, user: CurrentUserDep, db: DbDep
) -> LeaveRequest:
    """Apply for my own leave.

    Same service call as `POST /leave/requests`, so the overlap check, the half-day
    rule and the working-day count are identical — the only difference is where the
    employee id comes from, and here it cannot come from the caller.
    """
    request = leave_service.create_request(
        db,
        company_id=user.company_id,
        employee_id=employee_id,
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


@router.post("/leave/requests/{request_id}/withdraw", response_model=MyLeaveRequest)
def withdraw_leave_request(
    request_id: uuid.UUID, employee_id: CurrentEmployeeDep, user: CurrentUserDep, db: DbDep
) -> LeaveRequest:
    """Withdraw a request of mine that nobody has decided yet.

    Only `pending`. Undoing an *approved* leave moves a balance and belongs with the
    approver — `POST /leave/requests/{id}/cancel` does that, with the ledger entries it
    requires. The id is filtered on the employee as well as the tenant, so a request
    that is not mine is a 404 and not a permission error: whether someone else's
    request exists is not mine to learn.
    """
    request = db.execute(
        select(LeaveRequest).where(
            LeaveRequest.id == request_id,
            LeaveRequest.company_id == user.company_id,
            LeaveRequest.employee_id == employee_id,
        )
    ).scalar_one_or_none()
    if request is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave request not found")
    if request.status is not LeaveRequestStatus.PENDING:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This request is already {request.status.value} — ask your approver to cancel it",
        )

    request.status = LeaveRequestStatus.CANCELLED
    db.commit()
    db.refresh(request)
    return request


# ── Pay ───────────────────────────────────────────────────────────────


@router.get("/payslips", response_model=list[MyPayslipSummary])
def my_payslips(
    employee_id: CurrentEmployeeDep, user: CurrentUserDep, db: DbDep
) -> list[MyPayslipSummary]:
    """My approved payslips, newest first."""
    rows = db.execute(
        service.payslip_query(user.company_id, employee_id).order_by(Payslip.created_at.desc())
    ).all()
    return [service.summarise_payslip(payslip, run) for payslip, run in rows]


@router.get("/payslips/{payslip_id}", response_model=MyPayslip)
def my_payslip(
    payslip_id: uuid.UUID, employee_id: CurrentEmployeeDep, user: CurrentUserDep, db: DbDep
) -> MyPayslip:
    """One payslip of mine, itemised down to the tax bands.

    The id is filtered on my employee id, not merely checked afterwards, so another
    employee's payslip is indistinguishable from one that does not exist.
    """
    row = db.execute(
        service.payslip_query(user.company_id, employee_id).where(Payslip.id == payslip_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payslip not found")
    payslip, run = row

    lines = db.execute(
        select(PayslipLine)
        .where(
            PayslipLine.payslip_id == payslip.id,
            PayslipLine.company_id == user.company_id,
        )
        .order_by(PayslipLine.sequence)
    ).scalars()
    bands = db.execute(
        select(PayslipTaxBand)
        .where(
            PayslipTaxBand.payslip_id == payslip.id,
            PayslipTaxBand.company_id == user.company_id,
        )
        .order_by(PayslipTaxBand.sequence)
    ).scalars()

    return MyPayslip(
        **service.summarise_payslip(payslip, run).model_dump(),
        present_days=payslip.present_days,
        absent_days=payslip.absent_days,
        overtime_minutes=payslip.overtime_minutes,
        basic_earned=payslip.basic_earned,
        overtime_pay=payslip.overtime_pay,
        taxable_gross=payslip.taxable_gross,
        ssf_employee=payslip.ssf_employee,
        ssf_employer=payslip.ssf_employer,
        annual_assessable=payslip.annual_assessable,
        annual_taxable=payslip.annual_taxable,
        annual_tax=payslip.annual_tax,
        female_rebate=payslip.female_rebate,
        monthly_tax=payslip.monthly_tax,
        notes=payslip.notes,
        lines=[MyPayslipLine.model_validate(line) for line in lines],
        tax_bands=[MyPayslipBand.model_validate(band) for band in bands],
    )


# ── Documents ─────────────────────────────────────────────────────────


@router.get("/documents", response_model=list[MyDocument])
def my_documents(
    employee_id: CurrentEmployeeDep, user: CurrentUserDep, db: DbDep
) -> list[MyDocument]:
    rows = db.execute(
        select(EmployeeDocument)
        .where(
            EmployeeDocument.company_id == user.company_id,
            EmployeeDocument.employee_id == employee_id,
        )
        .order_by(EmployeeDocument.document_type, EmployeeDocument.title)
    ).scalars()
    return [
        MyDocument(
            id=row.id,
            document_type=row.document_type,
            title=row.title,
            issued_on=row.issued_on,
            expires_on=row.expires_on,
            is_verified=row.is_verified,
            has_file=row.storage_key is not None,
        )
        for row in rows
    ]
