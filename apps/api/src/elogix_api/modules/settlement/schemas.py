"""Settlement payloads."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from elogix_api.modules.settlement.compute import ExitInitiator, LineKind
from elogix_api.modules.settlement.models import SettlementStatus


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class SettlementCreate(BaseModel):
    employee_id: uuid.UUID
    last_working_day: date
    initiator: ExitInitiator
    resignation_date: date | None = None
    reason: str | None = Field(default=None, max_length=2000)
    # Left unset, the notice period is read from the employee's employment category.
    notice_days_required: int | None = Field(default=None, ge=0, le=365)
    notice_days_served: int = Field(default=0, ge=0, le=365)
    fiscal_year: str = Field(default="2082-83", max_length=16)


class AdjustmentCreate(BaseModel):
    """A hand-added line. `reason` is required, not optional.

    An unexplained deduction from a final payment is the thing this system exists to
    make impossible, so there is no way to add one without saying why.
    """

    kind: LineKind
    label: str = Field(min_length=1, max_length=200)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    reason: str = Field(min_length=1, max_length=2000)
    taxable: bool = True


class AdjustmentOut(_Out):
    id: uuid.UUID
    kind: LineKind
    label: str
    amount: Decimal
    reason: str
    taxable: bool


class LineOut(_Out):
    kind: LineKind
    code: str
    label: str
    amount: Decimal
    basis: str
    taxable: bool


class SettlementOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    last_working_day: date
    resignation_date: date | None
    initiator: ExitInitiator
    fiscal_year: str
    reason: str | None
    notice_days_required: int
    notice_days_served: int
    deadline: date
    status: SettlementStatus
    gross_earnings: Decimal
    taxable_earnings: Decimal
    total_deductions: Decimal
    tax: Decimal
    net_payable: Decimal
    basic_at_exit: Decimal
    contributed_to_ssf: bool
    ytd_taxable: Decimal
    ytd_tax_withheld: Decimal
    computed_at: datetime | None
    approved_at: datetime | None
    paid_on: date | None
    notes: str | None


class SettlementDetail(SettlementOut):
    lines: list[LineOut] = []
    adjustments: list[AdjustmentOut] = []


class ApprovalResult(BaseModel):
    leave_balances_encashed: int


class MarkPaid(BaseModel):
    paid_on: date


class DueSettlement(SettlementOut):
    """A settlement against its statutory clock."""

    employee_code: str
    employee_name: str
    days_remaining: int
    is_overdue: bool
