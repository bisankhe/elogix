"""Requisitions, candidates, applications and the pipeline they move through.

Three decisions shape this table set, and all three are departures from the prototype.

**No AI score, anywhere.** The prototype gave `ATSApplication` an `ai_score` and an
`ai_rank` written by a language model, and `list_applications` ordered by
`ai_score.desc()` — so the order a recruiter saw candidates in, and therefore who got
looked at, was decided by an LLM. That is an automated decision about someone's
employment. Applications here are ordered by when they arrived; ranking is a judgement a
person makes and signs their name to.

**Every stage move is a row, not an overwrite.** `application_events` is append-only.
Rejection decisions are the ones that get challenged months later, and "who moved this
to Rejected, when, and what did they write" has to be answerable. The prototype assigned
`app.stage = new_stage` over the old value and validated it against a thirteen-item list
written inline in the route handler.

**The pipeline is data.** `pipeline_stages` is per company, ordered, and says which
stages are terminal and what outcome they mean. A hiring process differs between a bank
and a construction firm, and neither should need a release to change it.

Candidates are not employees. They are people who have consented to be considered for
one job, and the record exists for that purpose — worth remembering when a retention
policy is eventually written, which it has not been.
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

MONEY = Numeric(14, 2)


class StageOutcome(enum.StrEnum):
    """What reaching a terminal stage means. Non-terminal stages have none."""

    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class RequisitionStatus(enum.StrEnum):
    DRAFT = "draft"
    OPEN = "open"
    ON_HOLD = "on_hold"
    FILLED = "filled"
    CANCELLED = "cancelled"


class OfferStatus(enum.StrEnum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"


class PipelineStage(Base, TimestampMixin):
    """One step in a company's hiring process."""

    __tablename__ = "pipeline_stages"
    __table_args__ = (
        UniqueConstraint("company_id", "code"),
        UniqueConstraint("company_id", "sequence", name="uq_pipeline_stages_company_id_sequence"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    # A terminal stage ends the application. `outcome` says how, which is what lets a
    # report distinguish "we said no" from "they said no" — the two mean very different
    # things about a hiring process.
    is_terminal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    outcome: Mapped[StageOutcome | None] = mapped_column(
        enum_column(StageOutcome), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Requisition(Base, TimestampMixin):
    """Approval to hire against a budgeted position.

    Tied to a `Position` rather than free text, because positions already carry the
    headcount budget, the org unit, the designation and the grade. A requisition that
    invented its own copy of those would drift from the org chart within a quarter.
    """

    __tablename__ = "requisitions"
    __table_args__ = (UniqueConstraint("company_id", "code"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    position_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("positions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    openings: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[RequisitionStatus] = mapped_column(
        enum_column(RequisitionStatus), nullable=False, default=RequisitionStatus.DRAFT
    )
    target_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    raised_by: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Candidate(Base, TimestampMixin):
    """Someone being considered for a job.

    Email is unique per company so a repeat applicant is one person with a history
    rather than a new stranger each time — which is the whole value of keeping the
    record at all.
    """

    __tablename__ = "candidates"
    __table_args__ = (UniqueConstraint("company_id", "email"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Where they came from — referral, job board, walk-in. Plain text rather than an
    # enum: source taxonomies differ per company and nobody should need a migration to
    # add "LinkedIn".
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # An opaque handle into `core/storage.py`, same as an employee document. Knowing it
    # is not permission to read it.
    resume_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class Application(Base, TimestampMixin):
    """One candidate, against one requisition.

    `stage_id` is the current position in the pipeline and is derived state — the
    authority is the last row in `application_events`. Kept denormalised because every
    list view filters on it, and rebuilt whenever a move is recorded.
    """

    __tablename__ = "applications"
    __table_args__ = (
        # Applying twice to the same requisition is a duplicate, not a second chance.
        UniqueConstraint("candidate_id", "requisition_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requisition_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("requisitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stage_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("pipeline_stages.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    applied_on: Mapped[date] = mapped_column(Date, nullable=False)
    # Set when the application reaches a terminal stage. Null means still live.
    outcome: Mapped[StageOutcome | None] = mapped_column(
        enum_column(StageOutcome), nullable=True, index=True
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ApplicationEvent(Base, TimestampMixin):
    """Append-only: every stage this application has been through, and who moved it.

    The rejection column is the one that matters. A candidate who asks why they were
    turned down, or a regulator who asks whether a process was applied consistently, is
    asking about this table.
    """

    __tablename__ = "application_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    application_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_stage_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("pipeline_stages.id", ondelete="RESTRICT"), nullable=True
    )
    to_stage_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("pipeline_stages.id", ondelete="RESTRICT"), nullable=False
    )
    moved_by: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class Offer(Base, TimestampMixin):
    """What was offered, and what the candidate said.

    `response_token` is how a candidate answers without an account. The prototype's
    equivalent was `POST /offers/<offer_id>/respond` with no authentication and no
    tenant filter, so anyone could accept or decline anyone's offer by walking uuids.
    A random token that is not the row's identifier is the whole fix.
    """

    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    application_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    basic: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    expires_on: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[OfferStatus] = mapped_column(
        enum_column(OfferStatus), nullable=False, default=OfferStatus.DRAFT
    )
    response_token: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decline_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Set when onboarding converts an accepted offer into a person on the payroll.
    # Nullable and one-way: an employee is never un-hired back into a candidate.
    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
