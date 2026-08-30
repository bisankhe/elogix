import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from elogix_api.modules.payroll.models import ComponentKind, RunStatus


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Components ────────────────────────────────────────────────────────


class ComponentCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    name: str = Field(min_length=1, max_length=200)
    kind: ComponentKind
    is_taxable: bool = True
    prorates: bool = True


class ComponentOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    kind: ComponentKind
    is_taxable: bool
    prorates: bool


# ── Salary ────────────────────────────────────────────────────────────


class SalaryLineIn(BaseModel):
    salary_component_id: uuid.UUID
    amount: Decimal = Field(ge=0, le=Decimal("99999999"))


class SalarySet(BaseModel):
    basic: Decimal = Field(gt=0, le=Decimal("99999999"))
    effective_from: date
    contributes_to_ssf: bool = True
    life_insurance_premium: Decimal = Field(default=Decimal("0"), ge=0)
    health_insurance_premium: Decimal = Field(default=Decimal("0"), ge=0)
    lines: list[SalaryLineIn] = []
    note: str | None = None


class SalaryLineOut(_Out):
    id: uuid.UUID
    salary_component_id: uuid.UUID
    amount: Decimal


class SalaryOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    basic: Decimal
    contributes_to_ssf: bool
    life_insurance_premium: Decimal
    health_insurance_premium: Decimal
    effective_from: date
    effective_to: date | None
    note: str | None


# ── Tax scales ────────────────────────────────────────────────────────


class SlabOut(_Out):
    sequence: int
    width: Decimal | None
    rate: Decimal
    label: str


class TaxScaleOut(BaseModel):
    id: uuid.UUID
    fiscal_year: str
    is_married: bool
    # False until a named person has checked the bands against the Finance Act. The UI
    # says so on every screen that shows tax.
    is_verified: bool
    verified_by: str | None
    verified_on: date | None
    slabs: list[SlabOut]


class SlabIn(BaseModel):
    width: Decimal | None = Field(default=None, ge=0)
    rate: Decimal = Field(ge=0, le=1)
    label: str = Field(min_length=1, max_length=120)


class TaxScaleUpdate(BaseModel):
    """Replace a scale's bands wholesale, and record who checked them."""

    slabs: list[SlabIn] = Field(min_length=1, max_length=20)
    verified_by: str | None = Field(default=None, max_length=200)


# ── Runs and payslips ─────────────────────────────────────────────────


class RunCreate(BaseModel):
    period_start: date
    period_end: date
    fiscal_year: str = Field(default="2082-83", max_length=16)
    month_days: Decimal = Field(default=Decimal("30"), gt=0, le=31)


class RunOut(_Out):
    id: uuid.UUID
    period_start: date
    period_end: date
    fiscal_year: str
    month_days: Decimal
    status: RunStatus
    computed_at: datetime | None
    approved_at: datetime | None
    note: str | None


class PayslipLineOut(_Out):
    kind: ComponentKind
    code: str
    label: str
    amount: Decimal


class TaxBandOut(_Out):
    label: str
    rate: Decimal
    amount: Decimal
    tax: Decimal


class PayslipOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    payable_days: Decimal
    present_days: int
    absent_days: int
    overtime_minutes: int
    basic_earned: Decimal
    overtime_pay: Decimal
    gross: Decimal
    taxable_gross: Decimal
    ssf_employee: Decimal
    ssf_employer: Decimal
    annual_assessable: Decimal
    annual_taxable: Decimal
    annual_tax: Decimal
    female_rebate: Decimal
    monthly_tax: Decimal
    total_deductions: Decimal
    net_pay: Decimal
    notes: str | None


class PayslipDetail(PayslipOut):
    lines: list[PayslipLineOut] = []
    tax_bands: list[TaxBandOut] = []


class RunResult(BaseModel):
    payslips_written: int


class ApprovalResult(BaseModel):
    attendance_days_locked: int
