"""Leave types, the balance ledger, and requests.

**A balance is a ledger, not a counter.** Every movement — an accrual, a grant, a day
consumed, a carry-forward, an encashment, a reversal — is an append-only row, and the
balance is their sum. Nothing anywhere increments a stored number.

That is what makes "approvals adjust balances atomically" true rather than hoped for.
A mutable counter has to be read, adjusted and written, and two approvals racing over
the same balance will both read the old value. Summing signed rows has no such window:
the approval either inserts its consumption rows or it does not.

It also means every balance can be explained. "Why does she have 11.5 days?" is a query
against the ledger, not an argument.
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
from elogix_api.nepal.leave import AccrualMethod

# Half days are real, so days are decimal. Never float: leave is a legal entitlement and
# 0.1 + 0.2 must equal 0.3 when someone is arguing about it.
DAYS = Numeric(7, 2)


class LedgerEntryKind(enum.StrEnum):
    OPENING = "opening"
    ACCRUAL = "accrual"
    GRANT = "grant"
    CONSUMPTION = "consumption"
    CARRY_FORWARD = "carry_forward"
    ENCASHMENT = "encashment"
    LAPSE = "lapse"
    REVERSAL = "reversal"
    ADJUSTMENT = "adjustment"


class LeaveRequestStatus(enum.StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class DayPortion(enum.StrEnum):
    FULL = "full"
    FIRST_HALF = "first_half"
    SECOND_HALF = "second_half"


class LeaveType(Base, TimestampMixin):
    """A company's leave types, seeded from the statutory catalogue but editable.

    The statutory values in `nepal.leave` are unverified, so a tenant must be able to
    correct them without waiting for a release.
    """

    __tablename__ = "leave_types"
    __table_args__ = (UniqueConstraint("company_id", "code"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    code: Mapped[str] = mapped_column(String(16), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    nepali_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    accrual_method: Mapped[AccrualMethod] = mapped_column(
        enum_column(AccrualMethod), nullable=False
    )
    days_per_year: Mapped[Decimal] = mapped_column(DAYS, nullable=False, default=Decimal("0"))
    # Home leave: one day earned per this many days worked.
    days_worked_per_day_earned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_accumulation_days: Mapped[Decimal] = mapped_column(
        DAYS, nullable=False, default=Decimal("0")
    )
    encashable_above_days: Mapped[Decimal | None] = mapped_column(DAYS, nullable=True)
    requires_document_after_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    probation_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allows_half_day: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_statutory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class LeaveLedgerEntry(Base, TimestampMixin):
    """One signed movement in a balance. Append-only.

    `days` is positive for anything that adds entitlement and negative for anything that
    removes it, so a balance is a plain SUM with no case analysis — and no way to write
    an update that forgets a branch.
    """

    __tablename__ = "leave_ledger_entries"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    leave_type_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("leave_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Balances are per leave year, so carry-forward is an explicit movement between two
    # years rather than an invisible rollover.
    leave_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    kind: Mapped[LedgerEntryKind] = mapped_column(enum_column(LedgerEntryKind), nullable=False)
    days: Mapped[Decimal] = mapped_column(DAYS, nullable=False)
    leave_request_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("leave_requests.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class LeaveRequest(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    leave_type_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("leave_types.id", ondelete="RESTRICT"), nullable=False
    )

    start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # Half days only make sense on a one-day request, which the service enforces.
    portion: Mapped[DayPortion] = mapped_column(
        enum_column(DayPortion), nullable=False, default=DayPortion.FULL
    )
    # Working days only — weekly offs and holidays are excluded when the request is
    # created, using the same calendar the attendance register uses.
    days: Mapped[Decimal] = mapped_column(DAYS, nullable=False)

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    document_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[LeaveRequestStatus] = mapped_column(
        enum_column(LeaveRequestStatus), nullable=False, default=LeaveRequestStatus.PENDING
    )
    decided_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
