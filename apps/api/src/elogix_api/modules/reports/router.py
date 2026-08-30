"""Reports.

Each report answers twice from one query: JSON for the screen, CSV for the person who
is going to open it in a spreadsheet anyway. `?format=csv` is the switch, and both come
from the same service call so the export cannot drift from the table it was exported
from.

The module is gated on `ModuleCode.REPORTS` at the router, so it is off below the
starter plan and every route added later is covered by construction.
"""

import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select

from elogix_api.core.csv_export import csv_response
from elogix_api.core.deps import CurrentUserDep, DbDep, require_module
from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.payroll.models import PayrollRun
from elogix_api.modules.reports import service
from elogix_api.modules.reports.schemas import (
    Headcount,
    LeaveBalanceReport,
    PayrollRegister,
)

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(require_module(ModuleCode.REPORTS))],
)

Format = Literal["json", "csv"]


@router.get("/headcount", response_model=Headcount)
def headcount(
    user: CurrentUserDep,
    db: DbDep,
    group_by: Annotated[Literal["department", "designation", "status", "gender"], Query()] = (
        "department"
    ),
    response_format: Annotated[Format, Query(alias="format")] = "json",
) -> Response | Headcount:
    """Who works here, cut one way at a time.

    `group_by` is a literal rather than a string, so the set of dimensions is in the
    OpenAPI spec, in the generated client, and refused at the edge — not validated
    somewhere inside the query builder.
    """
    report = service.headcount(db, company_id=user.company_id, group_by=group_by)

    if response_format == "csv":
        return csv_response(
            f"headcount-by-{group_by}-{report.as_of}.csv",
            ["Group", "Active", "Probation", "Suspended", "Exited", "Total"],
            (
                [r.group, r.active, r.probation, r.suspended, r.exited, r.total]
                for r in report.rows
            ),
        )
    return report


@router.get("/leave-balances", response_model=LeaveBalanceReport)
def leave_balances(
    user: CurrentUserDep,
    db: DbDep,
    leave_year: Annotated[int | None, Query(ge=2000, le=2100)] = None,
    response_format: Annotated[Format, Query(alias="format")] = "json",
) -> Response | LeaveBalanceReport:
    """What the company owes in leave, per person per type."""
    year = leave_year or date.today().year
    report = service.leave_balances(db, company_id=user.company_id, leave_year=year)

    if response_format == "csv":
        return csv_response(
            f"leave-balances-{year}.csv",
            ["Employee code", "Name", "Department", "Leave type", "Available days"],
            (
                [r.employee_code, r.full_name, r.org_unit, r.leave_type, r.available_days]
                for r in report.rows
            ),
        )
    return report


@router.get("/payroll-register/{run_id}", response_model=PayrollRegister)
def payroll_register(
    run_id: uuid.UUID,
    user: CurrentUserDep,
    db: DbDep,
    response_format: Annotated[Format, Query(alias="format")] = "json",
) -> Response | PayrollRegister:
    """One payroll run as a register, with the totals a filing needs.

    Available for a computed run as well as an approved one: the register is how
    somebody checks a run *before* approving it, and withholding it until after
    approval would make the check impossible.
    """
    run = db.execute(
        select(PayrollRun).where(
            PayrollRun.id == run_id, PayrollRun.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if run is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payroll run not found")

    report = service.payroll_register(db, company_id=user.company_id, run=run)

    if response_format == "csv":
        return csv_response(
            f"payroll-register-{run.period_start}.csv",
            [
                "Employee code",
                "Name",
                "Payable days",
                "Basic earned",
                "Overtime",
                "Gross",
                "SSF (employee)",
                "SSF (employer)",
                "Income tax",
                "Total deductions",
                "Net pay",
            ],
            (
                [
                    r.employee_code,
                    r.full_name,
                    r.payable_days,
                    r.basic_earned,
                    r.overtime_pay,
                    r.gross,
                    r.ssf_employee,
                    r.ssf_employer,
                    r.monthly_tax,
                    r.total_deductions,
                    r.net_pay,
                ]
                for r in report.rows
            ),
        )
    return report
