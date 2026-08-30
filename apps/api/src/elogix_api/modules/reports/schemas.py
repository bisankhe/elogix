"""Report shapes.

Every report is a header and rows, because that is what a report is: something a person
reads down a column of, sorts, and exports. Modelling each one as a bespoke nested
object would be more faithful to the query and less useful to everyone downstream.
"""

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class HeadcountRow(BaseModel):
    group: str
    active: int
    probation: int
    suspended: int
    exited: int
    total: int


class Headcount(BaseModel):
    """Who works here, cut by one dimension at a time.

    `as_of` is recorded on the response because headcount is a point-in-time figure and
    a screenshot of one without a date is worthless in a meeting.
    """

    as_of: date
    grouped_by: str
    rows: list[HeadcountRow]
    total_active: int


class LeaveBalanceRow(BaseModel):
    employee_id: uuid.UUID
    employee_code: str
    full_name: str
    org_unit: str | None
    leave_type: str
    available_days: Decimal


class LeaveBalanceReport(BaseModel):
    leave_year: int
    rows: list[LeaveBalanceRow]


class PayrollRegisterRow(BaseModel):
    employee_code: str
    full_name: str
    payable_days: Decimal
    basic_earned: Decimal
    overtime_pay: Decimal
    gross: Decimal
    ssf_employee: Decimal
    ssf_employer: Decimal
    monthly_tax: Decimal
    total_deductions: Decimal
    net_pay: Decimal


class PayrollRegisterTotals(BaseModel):
    """What a statutory filing needs, added up once by the server.

    The employer's SSF contribution is a cost the company owes on top of gross, not a
    deduction from anyone — it is totalled separately so nobody adds it to the wrong
    side of a return.
    """

    employees: int
    gross: Decimal
    ssf_employee: Decimal
    ssf_employer: Decimal
    monthly_tax: Decimal
    net_pay: Decimal


class PayrollRegister(BaseModel):
    period_start: date
    period_end: date
    fiscal_year: str
    status: str
    rows: list[PayrollRegisterRow]
    totals: PayrollRegisterTotals
