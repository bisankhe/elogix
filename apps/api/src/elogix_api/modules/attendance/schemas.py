import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, model_validator

from elogix_api.modules.attendance.models import (
    DayStatus,
    PunchDirection,
    PunchSource,
    RequestStatus,
)

CODE = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PolicyOut(_Out):
    weekly_off_weekdays: list[int]
    standard_daily_minutes: int
    standard_weekly_minutes: int
    max_overtime_minutes_per_day: int
    max_overtime_minutes_per_week: int
    grace_minutes: int
    half_day_minutes: int
    overtime_requires_approval: bool


class PolicyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Monday=0 … Sunday=6. Nepal's customary weekly off is Saturday (5).
    weekly_off_weekdays: list[int] | None = Field(default=None, max_length=7)
    standard_daily_minutes: int | None = Field(default=None, ge=60, le=24 * 60)
    standard_weekly_minutes: int | None = Field(default=None, ge=60, le=7 * 24 * 60)
    max_overtime_minutes_per_day: int | None = Field(default=None, ge=0, le=12 * 60)
    max_overtime_minutes_per_week: int | None = Field(default=None, ge=0, le=7 * 12 * 60)
    grace_minutes: int | None = Field(default=None, ge=0, le=120)
    half_day_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    overtime_requires_approval: bool | None = None

    @model_validator(mode="after")
    def _weekdays_in_range(self) -> "PolicyUpdate":
        if self.weekly_off_weekdays is not None and any(
            d < 0 or d > 6 for d in self.weekly_off_weekdays
        ):
            raise ValueError("weekday numbers must be 0 (Monday) to 6 (Sunday)")
        return self


class ShiftCreate(BaseModel):
    code: str = CODE
    name: str = Field(min_length=1, max_length=200)
    starts_at: time
    ends_at: time
    break_minutes: int = Field(default=60, ge=0, le=8 * 60)


class ShiftOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    starts_at: time
    ends_at: time
    break_minutes: int
    scheduled_minutes: int
    crosses_midnight: bool
    is_active: bool


class HolidayCreate(BaseModel):
    holiday_date: date
    name: str = Field(min_length=1, max_length=200)
    bs_label: str | None = Field(default=None, max_length=64)
    is_optional: bool = False


class HolidayOut(_Out):
    id: uuid.UUID
    holiday_date: date
    name: str
    bs_label: str | None
    is_optional: bool


class RosterAssign(BaseModel):
    """Assign one shift to a set of employees across a date range, in one call.

    A roster is filled in a screenful at a time, not row by row — the prototype's
    per-row endpoint made a month for forty people four hundred requests.
    """

    employee_ids: list[uuid.UUID] = Field(min_length=1, max_length=500)
    shift_id: uuid.UUID
    start_date: date
    end_date: date
    # Restrict to particular weekdays, e.g. a Sunday–Friday pattern.
    weekdays: list[int] | None = Field(default=None, max_length=7)


class RosterEntryOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    work_date: date
    shift_id: uuid.UUID


class PunchCreate(BaseModel):
    employee_id: uuid.UUID
    punched_at: datetime
    direction: PunchDirection
    source: PunchSource = PunchSource.WEB
    device_id: str | None = Field(default=None, max_length=64)
    note: str | None = None
    # Defaults to the punch's own date; set explicitly for a night shift whose end
    # belongs to the day it started.
    work_date: date | None = None


class PunchOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    work_date: date
    punched_at: datetime
    direction: PunchDirection
    source: PunchSource
    note: str | None


class DayOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    work_date: date
    shift_id: uuid.UUID | None
    first_in: datetime | None
    last_out: datetime | None
    worked_minutes: int
    late_minutes: int
    early_out_minutes: int
    overtime_minutes: int
    overtime_approved: bool
    status: DayStatus
    is_locked: bool
    remarks: str | None


class ProcessRequest(BaseModel):
    start_date: date
    end_date: date
    employee_id: uuid.UUID | None = None


class ProcessResult(BaseModel):
    days_written: int


class RegularisationCreate(BaseModel):
    employee_id: uuid.UUID
    work_date: date
    requested_in: datetime | None = None
    requested_out: datetime | None = None
    reason: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def _needs_a_change(self) -> "RegularisationCreate":
        if self.requested_in is None and self.requested_out is None:
            raise ValueError("a regularisation must request an in time, an out time, or both")
        return self


class RegularisationDecision(BaseModel):
    approve: bool
    note: str | None = Field(default=None, max_length=2000)


class RegularisationOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    work_date: date
    requested_in: datetime | None
    requested_out: datetime | None
    reason: str
    status: RequestStatus
    decided_at: datetime | None
    decision_note: str | None


class PayrollExportRow(BaseModel):
    """One employee's month, in the shape payroll consumes.

    Days, not just minutes: a monthly salary is prorated on days present, while overtime
    is paid on minutes. Both are needed, and deriving one from the other loses half-days.
    """

    employee_id: uuid.UUID
    employee_code: str
    full_name: str
    payable_days: float
    present_days: int
    half_days: int
    absent_days: int
    leave_days: int
    holiday_days: int
    weekly_off_days: int
    worked_minutes: int
    overtime_minutes: int
    late_minutes: int
    unlocked_days: int


class PayrollExport(BaseModel):
    start_date: date
    end_date: date
    rows: list[PayrollExportRow]
