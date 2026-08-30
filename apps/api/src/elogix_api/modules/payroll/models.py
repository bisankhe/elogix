"""Salary structures, payroll runs and payslips.

Three decisions shape this, all of them about being able to answer questions later.

**Salary is dated, like placement.** `EmployeeSalary` carries `effective_from`/`_to` and
the open row is current. A raise opens a new row; it never edits the old one. Otherwise
one increment silently recomputes every past payslip — the same failure the prototype had
with `basic_salary_npr` sitting on the employee record.

**A payslip is a snapshot, not a view.** Once computed it stores its own lines and its own
tax breakdown. Re-running the engine next year, after the slabs change, must not alter
what someone was already paid.

**The tax scale is a table, not a constant.** `nepal/tax.py` holds unverified defaults;
these rows are seeded from them and are editable, so a company can correct a slab without
waiting for a release. The scale used is snapshotted onto the payslip.
"""

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from elogix_api.db.base import Base
from elogix_api.db.types import TimestampMixin, company_fk, uuid_pk
from elogix_api.modules.employee.enums import enum_column

# Money is Decimal, never float. Pay is a legal amount people argue about.
MONEY = Numeric(14, 2)
RATE = Numeric(6, 4)


class ComponentKind(enum.StrEnum):
    EARNING = "earning"
    DEDUCTION = "deduction"


class RunStatus(enum.StrEnum):
    DRAFT = "draft"
    COMPUTED = "computed"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"


class SalaryComponent(Base, TimestampMixin):
    """A company's earning and deduction types — allowances, reimbursements, loans."""

    __tablename__ = "salary_components"
    __table_args__ = (UniqueConstraint("company_id", "code"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[ComponentKind] = mapped_column(enum_column(ComponentKind), nullable=False)
    # A reimbursement is paid but not taxed; most allowances are taxed.
    is_taxable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Whether a partial month scales it. A fixed reimbursement usually does not.
    prorates: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class EmployeeSalary(Base, TimestampMixin):
    """What an employee is paid, for a period of time.

    The open row (`effective_to IS NULL`) is current. Payroll for March reads the row
    that covers March, so a June raise cannot rewrite a March payslip.
    """

    __tablename__ = "employee_salaries"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    basic: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    contributes_to_ssf: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Annual reliefs, declared once and applied monthly.
    life_insurance_premium: Mapped[Decimal] = mapped_column(
        MONEY, nullable=False, default=Decimal("0")
    )
    health_insurance_premium: Mapped[Decimal] = mapped_column(
        MONEY, nullable=False, default=Decimal("0")
    )
    effective_from: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class EmployeeSalaryLine(Base, TimestampMixin):
    """One recurring allowance or deduction on a salary structure."""

    __tablename__ = "employee_salary_lines"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_salary_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employee_salaries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    salary_component_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("salary_components.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)


class TaxScale(Base, TimestampMixin):
    """A company's copy of a fiscal year's scale, seeded from `nepal/tax.py`.

    Editable on purpose: the defaults are unverified, and a tenant must be able to
    correct a slab the day the Finance Act is read rather than the day we ship.
    """

    __tablename__ = "tax_scales"
    __table_args__ = (UniqueConstraint("company_id", "fiscal_year", "is_married"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    fiscal_year: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    is_married: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verified_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    verified_on: Mapped[date | None] = mapped_column(Date, nullable=True)


class TaxSlab(Base, TimestampMixin):
    """One band. `width` NULL means everything above the bands before it."""

    __tablename__ = "tax_slabs"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    tax_scale_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("tax_scales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[Decimal | None] = mapped_column(MONEY, nullable=True)
    rate: Mapped[Decimal] = mapped_column(RATE, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)


class PayrollRun(Base, TimestampMixin):
    """One period's payroll for the company."""

    __tablename__ = "payroll_runs"
    __table_args__ = (UniqueConstraint("company_id", "period_start"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    period_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    fiscal_year: Mapped[str] = mapped_column(String(16), nullable=False)
    # The divisor pay is prorated on. Some companies use calendar days, some a flat 30.
    month_days: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("30"))
    status: Mapped[RunStatus] = mapped_column(
        enum_column(RunStatus), nullable=False, default=RunStatus.DRAFT
    )
    computed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class Payslip(Base, TimestampMixin):
    """One employee's pay for one run — a snapshot, never recomputed after approval."""

    __tablename__ = "payslips"
    __table_args__ = (UniqueConstraint("payroll_run_id", "employee_id"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    payroll_run_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("payroll_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Straight from the attendance export, recorded so a payslip explains itself.
    payable_days: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    present_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    absent_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    overtime_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    basic_earned: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    overtime_pay: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    gross: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    taxable_gross: Mapped[Decimal] = mapped_column(MONEY, nullable=False)

    ssf_employee: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    ssf_employer: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    annual_assessable: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    annual_taxable: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    annual_tax: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    female_rebate: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    monthly_tax: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))

    total_deductions: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    net_pay: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class PayslipLine(Base, TimestampMixin):
    """One line on a payslip, earnings and deductions alike.

    Rows rather than a JSON blob: a payslip line is what a report groups by, what an
    employee queries, and what a bank file is built from.
    """

    __tablename__ = "payslip_lines"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    payslip_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("payslips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind: Mapped[ComponentKind] = mapped_column(enum_column(ComponentKind), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class PayslipTaxBand(Base, TimestampMixin):
    """The slab breakdown as applied, snapshotted.

    A payslip that says only "tax: 4,096.67" is one nobody can check, and the first
    question anyone disputing their pay asks is which band the money fell in.
    """

    __tablename__ = "payslip_tax_bands"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    payslip_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("payslips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    rate: Mapped[Decimal] = mapped_column(RATE, nullable=False)
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    tax: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
