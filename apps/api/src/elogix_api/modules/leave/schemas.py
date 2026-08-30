import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from elogix_api.modules.leave.models import DayPortion, LeaveRequestStatus, LedgerEntryKind
from elogix_api.nepal.leave import AccrualMethod


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LeaveTypeOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    nepali_name: str | None
    accrual_method: AccrualMethod
    days_per_year: Decimal
    days_worked_per_day_earned: int | None
    max_accumulation_days: Decimal
    encashable_above_days: Decimal | None
    requires_document_after_days: int | None
    probation_eligible: bool
    is_paid: bool
    allows_half_day: bool
    is_statutory: bool


class LeaveTypeUpdate(BaseModel):
    """The statutory defaults are unverified, so every one of them is editable."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    days_per_year: Decimal | None = Field(default=None, ge=0, le=365)
    days_worked_per_day_earned: int | None = Field(default=None, ge=1, le=365)
    max_accumulation_days: Decimal | None = Field(default=None, ge=0, le=999)
    encashable_above_days: Decimal | None = Field(default=None, ge=0, le=999)
    requires_document_after_days: int | None = Field(default=None, ge=0, le=365)
    probation_eligible: bool | None = None
    allows_half_day: bool | None = None
    is_active: bool | None = None


class BalanceOut(BaseModel):
    leave_type_id: uuid.UUID
    code: str
    name: str
    leave_year: int
    available_days: Decimal
    is_paid: bool


class LedgerEntryOut(_Out):
    id: uuid.UUID
    leave_type_id: uuid.UUID
    leave_year: int
    entry_date: date
    kind: LedgerEntryKind
    days: Decimal
    note: str | None


class LeaveRequestCreate(BaseModel):
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    start_date: date
    end_date: date
    portion: DayPortion = DayPortion.FULL
    reason: str = Field(min_length=1, max_length=2000)
    document_key: str | None = Field(default=None, max_length=500)


class LeaveDecision(BaseModel):
    approve: bool
    note: str | None = Field(default=None, max_length=2000)


class LeaveRequestOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    leave_type_id: uuid.UUID
    start_date: date
    end_date: date
    portion: DayPortion
    days: Decimal
    reason: str
    document_key: str | None
    status: LeaveRequestStatus
    decided_at: datetime | None
    decision_note: str | None


class AccrualRequest(BaseModel):
    year: int = Field(ge=2000, le=2100)
    month: int | None = Field(default=None, ge=1, le=12)
    employee_id: uuid.UUID | None = None


class AccrualResult(BaseModel):
    entries_posted: int


class CarryForwardRequest(BaseModel):
    from_year: int = Field(ge=2000, le=2100)
