"""Full-and-final settlements.

**A settlement is a snapshot, exactly like a payslip.** Once approved it keeps its own
lines and its own figures, because the register and the ledger it was computed from keep
moving — a later attendance correction or a leave accrual must not silently change what
someone was already paid on their way out.

**Leave encashment consumes the balance.** Approving a settlement posts signed
`encashment` rows into `leave_ledger_entries` in the same transaction that approves it.
Nothing decrements a stored counter, for the same reason phase 05 gave: an insert has no
read-modify-write window, and a balance that survives being paid out can be paid twice.

**One open settlement per employee, enforced by a partial unique index.** Cancelled ones
do not count, so someone rehired and later leaving again gets a second settlement without
a special case.
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
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from elogix_api.db.base import Base
from elogix_api.db.types import TimestampMixin, company_fk, uuid_pk
from elogix_api.modules.employee.enums import enum_column

MONEY = Numeric(14, 2)
DAYS = Numeric(7, 2)


class SettlementStatus(enum.StrEnum):
    DRAFT = "draft"
    COMPUTED = "computed"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"


class Settlement(Base, TimestampMixin):
    __tablename__ = "settlements"
    __table_args__ = (
        # Partial, so a cancelled settlement does not block a later one. A plain unique
        # constraint would make a rehire-and-leave-again impossible to record.
        Index(
            "uq_settlements_open",
            "company_id",
            "employee_id",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    last_working_day: Mapped[date] = mapped_column(Date, nullable=False)
    resignation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Who ended the employment. Decides which way notice pay flows, so it is required
    # rather than inferred — see `compute.ExitInitiator`.
    initiator: Mapped[str] = mapped_column(String(16), nullable=False)
    # Which year's slabs to charge at. Carried on the record rather than derived, for
    # the same reason `PayrollRun` carries it: the Nepali fiscal year is not a function
    # of the Gregorian date the backend happens to be running on.
    fiscal_year: Mapped[str] = mapped_column(String(16), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    notice_days_required: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notice_days_served: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Statutory: fifteen days from the last working day. Stored rather than derived so
    # the overdue report is a query and not a calculation over every row.
    deadline: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    status: Mapped[SettlementStatus] = mapped_column(
        enum_column(SettlementStatus), nullable=False, default=SettlementStatus.DRAFT
    )

    # Snapshotted totals. Recomputing these from the lines would be equivalent today and
    # would stop being so the moment a line is corrected without a recompute.
    gross_earnings: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    taxable_earnings: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    total_deductions: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    tax: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    net_payable: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))

    # What the engine was told, kept so a figure can be re-derived years later without
    # reconstructing the state of four other tables.
    basic_at_exit: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    contributed_to_ssf: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ytd_taxable: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))
    ytd_tax_withheld: Mapped[Decimal] = mapped_column(MONEY, nullable=False, default=Decimal("0"))

    computed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    paid_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class SettlementLine(Base, TimestampMixin):
    """One line, and why it is that figure.

    `basis` is the column that makes this table worth having. A settlement of five
    numbers is one nobody can check; a settlement of five numbers each carrying the
    sentence that produced it is one an employee can read and an inspector can audit.
    """

    __tablename__ = "settlement_lines"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    settlement_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("settlements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    code: Mapped[str] = mapped_column(String(48), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    basis: Mapped[str] = mapped_column(Text, nullable=False)
    taxable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class SettlementAdjustment(Base, TimestampMixin):
    """A line HR adds by hand — a salary advance, an unreturned laptop, a retention bonus.

    Kept apart from `settlement_lines` because these survive a recompute and the
    computed lines do not. Without them a settlement is approximately right and gets
    finished in a spreadsheet, which is how a system stops being the record.
    """

    __tablename__ = "settlement_adjustments"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    settlement_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("settlements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    taxable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
