"""Attendance and roster.

The shape follows one rule: **raw events and computed results are separate tables.**

`AttendancePunch` is what happened — an immutable stream of in/out events from a device,
the web, or a supervisor. `AttendanceDay` is what that means — worked minutes, lateness,
overtime, status — and it is derived, so it can be recomputed from scratch when a shift
changes, a holiday is declared, or a regularisation is approved.

The prototype merged the two into fixed columns (`login1`, `logout1`, `login2`,
`logout2`, `lunch_in`, `break_in1`, `break_in2` …), which meant a third break had nowhere
to go, a correction destroyed the original reading, and nothing could be recomputed. It
also stored times as `String(8)` "HH:MM", which cannot express a night shift crossing
midnight.
"""

import enum
import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from elogix_api.db.base import Base
from elogix_api.db.types import TimestampMixin, company_fk, uuid_pk
from elogix_api.modules.employee.enums import enum_column
from elogix_api.nepal import labour


class PunchDirection(enum.StrEnum):
    IN = "in"
    OUT = "out"


class PunchSource(enum.StrEnum):
    BIOMETRIC = "biometric"
    WEB = "web"
    MOBILE = "mobile"
    MANUAL = "manual"
    REGULARISATION = "regularisation"


class DayStatus(enum.StrEnum):
    PRESENT = "present"
    HALF_DAY = "half_day"
    ABSENT = "absent"
    WEEKLY_OFF = "weekly_off"
    HOLIDAY = "holiday"
    LEAVE = "leave"


class RequestStatus(enum.StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class AttendancePolicy(Base, TimestampMixin):
    """One per company. Every statutory figure is stored, not hard-coded.

    The defaults come from `nepal.labour`, but they are defaults: the Labour Act values
    in this codebase have not yet been verified by a named person, and a tenant must not
    be trapped by a constant that turns out to be wrong.
    """

    __tablename__ = "attendance_policies"
    __table_args__ = (UniqueConstraint("company_id"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()

    # Python weekday numbering, Monday=0. Saturday in Nepal, not Sunday.
    weekly_off_weekdays: Mapped[list[int]] = mapped_column(
        ARRAY(SmallInteger), nullable=False, default=list(labour.DEFAULT_WEEKLY_OFF_WEEKDAYS)
    )
    standard_daily_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=labour.STANDARD_DAILY_MINUTES
    )
    standard_weekly_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=labour.STANDARD_WEEKLY_MINUTES
    )
    max_overtime_minutes_per_day: Mapped[int] = mapped_column(
        Integer, nullable=False, default=labour.MAX_OVERTIME_MINUTES_PER_DAY
    )
    max_overtime_minutes_per_week: Mapped[int] = mapped_column(
        Integer, nullable=False, default=labour.MAX_OVERTIME_MINUTES_PER_WEEK
    )
    # Minutes of lateness forgiven before a day counts as late.
    grace_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    # Below this, a present day is downgraded to a half day.
    half_day_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=4 * 60)
    # Overtime only counts once approved, rather than accruing automatically.
    overtime_requires_approval: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )


class Shift(Base, TimestampMixin):
    __tablename__ = "shifts"
    __table_args__ = (UniqueConstraint("company_id", "code"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    starts_at: Mapped[time] = mapped_column(Time, nullable=False)
    ends_at: Mapped[time] = mapped_column(Time, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    # A shift whose end time is at or before its start crosses midnight. Derived rather
    # than declared, so the two can never disagree.
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    @property
    def crosses_midnight(self) -> bool:
        return self.ends_at <= self.starts_at

    @property
    def scheduled_minutes(self) -> int:
        """Paid minutes: the span, less the unpaid break."""
        return labour.minutes_between(self.starts_at, self.ends_at) - self.break_minutes


class Holiday(Base, TimestampMixin):
    """A non-working day for the whole company.

    Stored as a Gregorian date even though Nepali holidays are declared in Bikram
    Sambat: the database must sort and range-query, and BS month lengths vary year to
    year. The BS label is kept alongside for display, never for arithmetic.
    """

    __tablename__ = "holidays"
    __table_args__ = (UniqueConstraint("company_id", "holiday_date"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    bs_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_optional: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class RosterEntry(Base, TimestampMixin):
    """Which shift an employee works on a given date."""

    __tablename__ = "roster_entries"
    __table_args__ = (UniqueConstraint("company_id", "employee_id", "work_date"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    shift_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("shifts.id", ondelete="RESTRICT"), nullable=False
    )


class AttendancePunch(Base, TimestampMixin):
    """One raw in/out event. Append-only — corrections add rows, never edit them.

    Keeping the original reading is what makes an attendance dispute settleable, and what
    lets a whole month be recomputed after a shift definition is fixed.
    """

    __tablename__ = "attendance_punches"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The date the punch is *attributed* to, which is not always its calendar date: a
    # night shift ending at 06:00 belongs to the day it started.
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    punched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    direction: Mapped[PunchDirection] = mapped_column(
        enum_column(PunchDirection), nullable=False
    )
    source: Mapped[PunchSource] = mapped_column(
        enum_column(PunchSource), nullable=False, default=PunchSource.WEB
    )
    device_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class AttendanceDay(Base, TimestampMixin):
    """The computed daily record — derived, and safe to rebuild from punches.

    `is_locked` is what payroll sets once a month is paid, so a later recompute cannot
    silently change a figure someone has already been paid on.
    """

    __tablename__ = "attendance_days"
    __table_args__ = (UniqueConstraint("company_id", "employee_id", "work_date"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    shift_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True
    )

    first_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    worked_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    late_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    early_out_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Capped at the statutory daily maximum. Anything beyond it stays in worked_minutes,
    # so a compliance report can still find it.
    overtime_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    overtime_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    status: Mapped[DayStatus] = mapped_column(enum_column(DayStatus), nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)


class RegularisationRequest(Base, TimestampMixin):
    """An employee asking for a day to be corrected — a missed punch, usually.

    Approving one writes a `manual` punch and recomputes the day, rather than editing the
    computed record: the correction then has the same provenance as any other reading.
    """

    __tablename__ = "regularisation_requests"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    requested_in: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    requested_out: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        enum_column(RequestStatus), nullable=False, default=RequestStatus.PENDING
    )
    decided_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
