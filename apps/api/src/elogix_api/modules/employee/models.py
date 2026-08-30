"""The employee master — the most-referenced entity in the product.

Two decisions here shape every later phase.

**Where someone sits is dated, not overwritten.** The prototype hung `department_id`,
`designation_id`, `grade_level_id` and `position_id` directly on the employee row, so a
transfer destroyed the record of where they used to be. Attendance, leave and payroll all
need to know where a person sat *on a given date* — an August payslip must use August's
grade — so placement lives in `EmployeeAssignment`, with effective dates.

**Salary is not here.** The prototype had `basic_salary_npr` and `total_ctc_npr` on the
employee. That makes historical payroll impossible for the same reason: one raise and
every past payslip silently recomputes. Phase 06 owns salary structures.
"""

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from elogix_api.db.base import Base
from elogix_api.db.types import TimestampMixin, company_fk, uuid_pk
from elogix_api.modules.employee.enums import (
    AssignmentReason,
    DocumentType,
    EmployeeEventType,
    EmployeeStatus,
    Gender,
    MaritalStatus,
    enum_column,
)

__all__ = [
    "AssignmentReason",
    "DocumentType",
    "Employee",
    "EmployeeAssignment",
    "EmployeeDocument",
    "EmployeeEvent",
    "EmployeeEventType",
    "EmployeeStatus",
    "Gender",
    "MaritalStatus",
]


class Employee(Base, TimestampMixin):
    """The person: who they are, how to reach them, and their statutory identity.

    Everything about *where they work* is in `EmployeeAssignment`.
    """

    __tablename__ = "employees"
    __table_args__ = (UniqueConstraint("company_id", "employee_code"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_code: Mapped[str] = mapped_column(String(32), nullable=False)

    # ── Name ──────────────────────────────────────────────────────────
    # Structured rather than one string: letters, payroll files and government
    # returns all need the parts, and splitting a display name back apart is lossy.
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Devanagari, for letters and government submissions that require it.
    full_name_nepali: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # ── Personal ──────────────────────────────────────────────────────
    gender: Mapped[Gender] = mapped_column(
        enum_column(Gender), nullable=False, default=Gender.UNDISCLOSED
    )
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    marital_status: Mapped[MaritalStatus] = mapped_column(
        enum_column(MaritalStatus), nullable=False, default=MaritalStatus.SINGLE
    )
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)
    nationality: Mapped[str] = mapped_column(String(64), nullable=False, default="Nepali")

    # ── Contact ───────────────────────────────────────────────────────
    work_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    personal_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    province: Mapped[str | None] = mapped_column(String(64), nullable=True)
    district: Mapped[str | None] = mapped_column(String(64), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # ── Statutory identity (Nepal) ────────────────────────────────────
    # Not unique-constrained: these arrive incomplete during onboarding and a partial
    # duplicate must not block a hire. Validation is a report, not a constraint.
    citizenship_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pan_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ssf_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    provident_fund_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # ── Lifecycle ─────────────────────────────────────────────────────
    status: Mapped[EmployeeStatus] = mapped_column(
        enum_column(EmployeeStatus), nullable=False, default=EmployeeStatus.PROBATION
    )
    joined_on: Mapped[date] = mapped_column(Date, nullable=False)
    probation_ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    confirmed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    exited_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    exit_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # `foreign_keys` is required on both sides: employee_assignments points at employees
    # twice (the person, and their manager), so the join is otherwise ambiguous.
    assignments: Mapped[list["EmployeeAssignment"]] = relationship(
        back_populates="employee",
        cascade="all, delete-orphan",
        foreign_keys="EmployeeAssignment.employee_id",
    )

    @property
    def full_name(self) -> str:
        return " ".join(p for p in (self.first_name, self.middle_name, self.last_name) if p)


class EmployeeAssignment(Base, TimestampMixin):
    """Where an employee sits, for a period of time.

    The open assignment (`effective_to IS NULL`) is the current one. A transfer closes
    the open row and opens a new one, so "which department was she in last March?" stays
    answerable forever.
    """

    __tablename__ = "employee_assignments"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    org_unit_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("org_units.id", ondelete="RESTRICT"), nullable=False
    )
    position_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("positions.id", ondelete="SET NULL"), nullable=True
    )
    designation_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("designations.id", ondelete="SET NULL"), nullable=True
    )
    grade_level_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("grade_levels.id", ondelete="SET NULL"), nullable=True
    )
    work_location_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("work_locations.id", ondelete="SET NULL"), nullable=True
    )
    employment_category_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employment_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    cost_centre_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("cost_centres.id", ondelete="SET NULL"), nullable=True
    )
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    reason: Mapped[AssignmentReason] = mapped_column(
        enum_column(AssignmentReason), nullable=False
    )
    effective_from: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    employee: Mapped[Employee] = relationship(
        back_populates="assignments", foreign_keys=[employee_id]
    )


class EmployeeDocument(Base, TimestampMixin):
    """Metadata for one file in the digital employee file.

    `storage_key` is an opaque reference, not a URL: object storage is not wired up yet,
    and a column full of signed URLs would expire. Phase 07 attaches the real backend.
    """

    __tablename__ = "employee_documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_type: Mapped[DocumentType] = mapped_column(
        enum_column(DocumentType), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    issued_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    expires_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class EmployeeEvent(Base, TimestampMixin):
    """The lifecycle timeline: hired, confirmed, assigned, suspended, exited.

    Append-only. Assignments record *where*; this records *what happened*, so an
    offboarded employee's history reads as a narrative rather than a diff.
    """

    __tablename__ = "employee_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[EmployeeEventType] = mapped_column(
        enum_column(EmployeeEventType), nullable=False
    )
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
