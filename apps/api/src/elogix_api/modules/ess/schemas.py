"""Self-service payloads.

None of these carry an employee id *in*. The whole module answers for exactly one
person — the one holding the token — and the moment a request body or query string can
name someone else, the boundary is gone. Ids appear on the way out only, because a
payslip has to identify itself.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from elogix_api.modules.employee.enums import DocumentType
from elogix_api.modules.leave.models import DayPortion


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MyProfile(_Out):
    """Who I am, where I sit, and what my employer holds on me.

    Deliberately the full record rather than a trimmed one: every field here is the
    employee's own personal data, and a person is entitled to see what is stored about
    them. The bank account and PAN are theirs. What is *not* here is anyone else's.
    """

    id: uuid.UUID
    employee_code: str
    full_name: str
    full_name_nepali: str | None
    work_email: str | None
    personal_email: str | None
    phone: str | None
    date_of_birth: date | None
    joined_on: date
    probation_ends_on: date | None
    confirmed_on: date | None
    status: str

    citizenship_number: str | None
    pan_number: str | None
    ssf_number: str | None
    provident_fund_number: str | None
    bank_name: str | None
    bank_account_number: str | None

    # Resolved names, not ids. A self-service screen has no org chart to look them up
    # in, and handing it raw uuids would force it to fetch tables it may not be
    # entitled to read.
    org_unit: str | None = None
    designation: str | None = None
    grade_level: str | None = None
    work_location: str | None = None
    manager_name: str | None = None


class MyDay(_Out):
    """One day of my own register."""

    work_date: date
    first_in: datetime | None
    last_out: datetime | None
    worked_minutes: int
    late_minutes: int
    overtime_minutes: int
    status: str
    is_locked: bool
    remarks: str | None


class MyAttendanceMonth(BaseModel):
    period_start: date
    period_end: date
    present_days: int
    absent_days: int
    leave_days: int
    holiday_days: int
    worked_minutes: int
    overtime_minutes: int
    late_minutes: int
    days: list[MyDay]


class MyBalance(BaseModel):
    leave_type_id: uuid.UUID
    code: str
    name: str
    leave_year: int
    available_days: Decimal
    is_paid: bool


class MyLeaveRequest(_Out):
    id: uuid.UUID
    leave_type_id: uuid.UUID
    start_date: date
    end_date: date
    portion: DayPortion
    days: Decimal
    reason: str
    status: str
    decided_at: datetime | None
    decision_note: str | None


class MyLeaveApply(BaseModel):
    """No `employee_id`. That is the point of the module."""

    leave_type_id: uuid.UUID
    start_date: date
    end_date: date
    portion: DayPortion = DayPortion.FULL
    reason: str = Field(min_length=1, max_length=2000)
    document_key: str | None = Field(default=None, max_length=500)


class MyPayslipSummary(_Out):
    id: uuid.UUID
    period_start: date
    period_end: date
    fiscal_year: str
    payable_days: Decimal
    gross: Decimal
    total_deductions: Decimal
    net_pay: Decimal


class MyPayslipLine(_Out):
    kind: str
    code: str
    label: str
    amount: Decimal


class MyPayslipBand(_Out):
    """`amount` is how much of my income fell in this band; `tax` is what it cost."""

    label: str
    rate: Decimal
    amount: Decimal
    tax: Decimal


class MyPayslip(MyPayslipSummary):
    present_days: int
    absent_days: int
    overtime_minutes: int
    basic_earned: Decimal
    overtime_pay: Decimal
    taxable_gross: Decimal
    ssf_employee: Decimal
    ssf_employer: Decimal
    annual_assessable: Decimal
    annual_taxable: Decimal
    annual_tax: Decimal
    female_rebate: Decimal
    monthly_tax: Decimal
    notes: str | None
    lines: list[MyPayslipLine] = []
    tax_bands: list[MyPayslipBand] = []


class MyDocument(_Out):
    id: uuid.UUID
    document_type: DocumentType
    title: str
    issued_on: date | None
    expires_on: date | None
    is_verified: bool
    has_file: bool
