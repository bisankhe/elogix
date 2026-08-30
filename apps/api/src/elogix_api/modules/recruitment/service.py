"""Hiring: the pipeline, the headcount budget, and moving an application.

Nothing here scores a candidate. The prototype ranked applications with a language
model and sorted the recruiter's list by that score, which decided who got looked at.
Ordering is by arrival; judgement is a person's, with their name on the row that records
it.
"""

import secrets
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from elogix_api.modules.employee.models import Employee, EmployeeAssignment, EmployeeStatus
from elogix_api.modules.org.models import Position
from elogix_api.modules.recruitment.models import (
    Application,
    ApplicationEvent,
    Offer,
    OfferStatus,
    PipelineStage,
    Requisition,
    RequisitionStatus,
    StageOutcome,
)

# The default hiring process, seeded on first use. Deliberately short: the prototype's
# thirteen hardcoded stages included four that were AI products rather than steps a
# person takes ("AI Screening", "Video Interview"), and a pipeline nobody follows is
# worse than a coarse one they do.
DEFAULT_STAGES: tuple[tuple[str, str, bool, StageOutcome | None], ...] = (
    ("APPLIED", "Applied", False, None),
    ("SCREENING", "Screening", False, None),
    ("INTERVIEW", "Interview", False, None),
    ("OFFER", "Offer", False, None),
    ("HIRED", "Hired", True, StageOutcome.HIRED),
    ("REJECTED", "Rejected", True, StageOutcome.REJECTED),
    ("WITHDRAWN", "Withdrawn", True, StageOutcome.WITHDRAWN),
)


def seed_stages(db: Session, *, company_id: uuid.UUID) -> int:
    """Create the default pipeline if this company has none. Idempotent."""
    existing = db.execute(
        select(func.count()).select_from(PipelineStage).where(
            PipelineStage.company_id == company_id
        )
    ).scalar_one()
    if existing:
        return 0

    for sequence, (code, name, terminal, outcome) in enumerate(DEFAULT_STAGES, start=1):
        db.add(
            PipelineStage(
                company_id=company_id,
                code=code,
                name=name,
                sequence=sequence,
                is_terminal=terminal,
                outcome=outcome,
            )
        )
    db.flush()
    return len(DEFAULT_STAGES)


def first_stage(db: Session, *, company_id: uuid.UUID) -> PipelineStage:
    """Where a new application starts: the lowest-sequence non-terminal stage."""
    seed_stages(db, company_id=company_id)
    stage = db.execute(
        select(PipelineStage)
        .where(
            PipelineStage.company_id == company_id,
            PipelineStage.is_active.is_(True),
            PipelineStage.is_terminal.is_(False),
        )
        .order_by(PipelineStage.sequence)
    ).scalars().first()

    if stage is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This company's hiring pipeline has no open stages, so an application has "
            "nowhere to start. Add at least one non-terminal stage.",
        )
    return stage


# ── Headcount ─────────────────────────────────────────────────────────


def filled_headcount(db: Session, *, company_id: uuid.UUID, position_id: uuid.UUID) -> int:
    """People currently sitting in this position.

    Counted from open assignments rather than from a stored number, for the same reason
    a leave balance is summed from its ledger: a counter drifts and nobody notices until
    it matters.
    """
    return db.execute(
        select(func.count())
        .select_from(EmployeeAssignment)
        .join(Employee, Employee.id == EmployeeAssignment.employee_id)
        .where(
            EmployeeAssignment.company_id == company_id,
            EmployeeAssignment.position_id == position_id,
            EmployeeAssignment.effective_to.is_(None),
            Employee.status != EmployeeStatus.EXITED,
        )
    ).scalar_one()


def committed_openings(
    db: Session,
    *,
    company_id: uuid.UUID,
    position_id: uuid.UUID,
    exclude: uuid.UUID | None = None,
) -> int:
    """Openings already promised by live requisitions against this position."""
    stmt = select(func.coalesce(func.sum(Requisition.openings), 0)).where(
        Requisition.company_id == company_id,
        Requisition.position_id == position_id,
        Requisition.status.in_([RequisitionStatus.DRAFT, RequisitionStatus.OPEN,
                                RequisitionStatus.ON_HOLD]),
    )
    if exclude is not None:
        stmt = stmt.where(Requisition.id != exclude)
    return int(db.execute(stmt).scalar_one())


def assert_within_budget(
    db: Session,
    *,
    company_id: uuid.UUID,
    position: Position,
    openings: int,
    exclude: uuid.UUID | None = None,
) -> None:
    """Refuse a requisition that would hire past the position's budgeted headcount.

    The point of `Position.headcount` existing at all. Without this the budget is a
    number on a screen that nothing consults, and the first anyone knows of an overhire
    is when payroll runs.
    """
    filled = filled_headcount(db, company_id=company_id, position_id=position.id)
    committed = committed_openings(
        db, company_id=company_id, position_id=position.id, exclude=exclude
    )
    available = position.headcount - filled - committed

    if openings > available:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{position.title} is budgeted for {position.headcount}: {filled} filled and "
            f"{committed} already requisitioned, leaving {max(0, available)}. "
            f"Raise the position's headcount first if {openings} is intended.",
        )


# ── Applications ──────────────────────────────────────────────────────


def apply(
    db: Session,
    *,
    company_id: uuid.UUID,
    candidate_id: uuid.UUID,
    requisition: Requisition,
    applied_on: date | None = None,
    user_id: uuid.UUID | None = None,
) -> Application:
    """Start an application at the first stage, and record that it started.

    Does not commit.
    """
    if requisition.status is not RequisitionStatus.OPEN:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Requisition {requisition.code} is {requisition.status.value}; only an open "
            "requisition accepts applications.",
        )

    stage = first_stage(db, company_id=company_id)
    application = Application(
        company_id=company_id,
        candidate_id=candidate_id,
        requisition_id=requisition.id,
        stage_id=stage.id,
        applied_on=applied_on or date.today(),
    )
    db.add(application)
    db.flush()

    # The opening move is a row like every other one, so the history has no gap at the
    # start and "how long did this sit in Applied?" is answerable.
    db.add(
        ApplicationEvent(
            company_id=company_id,
            application_id=application.id,
            from_stage_id=None,
            to_stage_id=stage.id,
            moved_by=user_id,
            occurred_at=datetime.now(UTC),
            note="Application received",
        )
    )
    return application


def move(
    db: Session,
    *,
    application: Application,
    to_stage: PipelineStage,
    user_id: uuid.UUID | None,
    note: str | None,
) -> ApplicationEvent:
    """Move an application, recording who did it and why. Does not commit."""
    if application.outcome is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This application is closed as {application.outcome.value} and cannot be "
            "moved. Reopening a decision needs a new application, so the original "
            "record of it survives.",
        )
    if to_stage.id == application.stage_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "The application is already at that stage"
        )
    if not to_stage.is_active:
        raise HTTPException(status.HTTP_409_CONFLICT, "That stage is not in use")

    # A rejection without a reason is the one everybody regrets six months later, when
    # the candidate asks or a pattern needs explaining.
    if to_stage.outcome is StageOutcome.REJECTED and not (note or "").strip():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "A rejection needs a reason. It is the decision most likely to be asked "
            "about later.",
        )

    event = ApplicationEvent(
        company_id=application.company_id,
        application_id=application.id,
        from_stage_id=application.stage_id,
        to_stage_id=to_stage.id,
        moved_by=user_id,
        occurred_at=datetime.now(UTC),
        note=note,
    )
    db.add(event)

    application.stage_id = to_stage.id
    if to_stage.is_terminal:
        application.outcome = to_stage.outcome
        application.closed_at = datetime.now(UTC)
    return event


# ── Offers ────────────────────────────────────────────────────────────


def make_offer(
    db: Session,
    *,
    application: Application,
    basic: Decimal,
    starts_on: date,
    expires_on: date,
    notes: str | None,
) -> Offer:
    """Draft an offer with a fresh response token. Does not commit."""
    if application.outcome is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This application is closed as {application.outcome.value}; there is "
            "nobody to offer.",
        )
    if expires_on > starts_on:
        # An offer normally expires *before* it starts — "reply by the 5th, begin on the
        # 1st of next month". One that expires after the start date would have the
        # candidate turning up before they had decided, which is almost always a typo.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The offer expires after the start date it names; check the dates.",
        )

    existing = db.execute(
        select(Offer).where(
            Offer.application_id == application.id,
            Offer.status.in_([OfferStatus.DRAFT, OfferStatus.SENT, OfferStatus.ACCEPTED]),
        )
    ).scalars().first()
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This application already has a {existing.status.value} offer. Withdraw it "
            "before making another, so there is never a question of which one stands.",
        )

    offer = Offer(
        company_id=application.company_id,
        application_id=application.id,
        basic=basic,
        starts_on=starts_on,
        expires_on=expires_on,
        notes=notes,
        # 256 bits from a CSPRNG. The candidate answers with this, never with the
        # offer's id — see the model docstring for what the prototype did instead.
        response_token=secrets.token_urlsafe(32),
    )
    db.add(offer)
    return offer


def respond_to_offer(
    db: Session, *, offer: Offer, accept: bool, reason: str | None, today: date | None = None
) -> Offer:
    """The candidate's answer. Does not commit.

    Only a *sent* offer can be answered: a draft has not been made yet, and answering a
    withdrawn or expired one would let a candidate accept something the company has
    already taken back.
    """
    today = today or date.today()

    if offer.status is not OfferStatus.SENT:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This offer is {offer.status.value} and is not open for a response.",
        )
    if offer.expires_on < today:
        # Recorded rather than silently refused, so the record says it lapsed rather
        # than that nobody ever replied.
        offer.status = OfferStatus.EXPIRED
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This offer expired on {offer.expires_on.isoformat()}.",
        )

    offer.status = OfferStatus.ACCEPTED if accept else OfferStatus.DECLINED
    offer.responded_at = datetime.now(UTC)
    offer.decline_reason = None if accept else reason
    return offer
