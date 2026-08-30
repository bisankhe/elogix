"""Recruitment: requisitions, candidates, applications and offers.

Gated on `ModuleCode.ATS` at the router — with one deliberate exception. The candidate's
own offer link cannot be, because a candidate has no login and no tenant; it lives on a
separate unauthenticated router below, and everything about it is scoped by a random
token rather than by an id.
"""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from elogix_api.core.deps import CurrentUserDep, DbDep, require_module
from elogix_api.core.entitlements import ModuleCode
from elogix_api.db.session import get_db
from elogix_api.modules.identity.models import Company
from elogix_api.modules.org.models import Position
from elogix_api.modules.recruitment import onboarding, service
from elogix_api.modules.recruitment.models import (
    Application,
    ApplicationEvent,
    Candidate,
    Offer,
    OfferStatus,
    PipelineStage,
    Requisition,
    RequisitionStatus,
    StageOutcome,
)
from elogix_api.modules.recruitment.schemas import (
    ApplicationCreate,
    ApplicationDetail,
    ApplicationMove,
    ApplicationOut,
    CandidateCreate,
    CandidateOut,
    EventOut,
    OfferCreate,
    OfferOut,
    OfferResponse,
    OfferSent,
    OnboardRequest,
    OnboardResult,
    PublicOffer,
    RequisitionCreate,
    RequisitionDetail,
    RequisitionOut,
    StageCreate,
    StageOut,
)

router = APIRouter(
    prefix="/recruitment",
    tags=["recruitment"],
    dependencies=[Depends(require_module(ModuleCode.ATS))],
)


def _get_requisition(db: Session, req_id: uuid.UUID, company_id: uuid.UUID) -> Requisition:
    row = db.execute(
        select(Requisition).where(
            Requisition.id == req_id, Requisition.company_id == company_id
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Requisition not found")
    return row


def _get_application(db: Session, app_id: uuid.UUID, company_id: uuid.UUID) -> Application:
    row = db.execute(
        select(Application).where(
            Application.id == app_id, Application.company_id == company_id
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return row


# ── Pipeline ──────────────────────────────────────────────────────────


@router.get("/stages", response_model=list[StageOut])
def list_stages(user: CurrentUserDep, db: DbDep) -> list[PipelineStage]:
    """The company's hiring stages. Seeds the default pipeline on first read."""
    service.seed_stages(db, company_id=user.company_id)
    db.commit()
    return list(
        db.execute(
            select(PipelineStage)
            .where(PipelineStage.company_id == user.company_id)
            .order_by(PipelineStage.sequence)
        ).scalars().all()
    )


@router.post("/stages", response_model=StageOut, status_code=status.HTTP_201_CREATED)
def create_stage(payload: StageCreate, user: CurrentUserDep, db: DbDep) -> PipelineStage:
    """Add a stage. A hiring process differs between a bank and a construction firm."""
    if payload.is_terminal != (payload.outcome is not None):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "A terminal stage needs an outcome, and a non-terminal stage cannot have "
            "one — otherwise a report cannot tell 'we said no' from 'they said no'.",
        )

    stage = PipelineStage(company_id=user.company_id, **payload.model_dump())
    db.add(stage)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "That stage code or sequence is already in use"
        ) from exc
    db.refresh(stage)
    return stage


# ── Requisitions ──────────────────────────────────────────────────────


@router.get("/requisitions", response_model=list[RequisitionOut])
def list_requisitions(
    user: CurrentUserDep,
    db: DbDep,
    req_status: Annotated[RequisitionStatus | None, Query(alias="status")] = None,
) -> list[Requisition]:
    stmt = select(Requisition).where(Requisition.company_id == user.company_id)
    if req_status is not None:
        stmt = stmt.where(Requisition.status == req_status)
    return list(db.execute(stmt.order_by(Requisition.created_at.desc())).scalars().all())


@router.post(
    "/requisitions", response_model=RequisitionDetail, status_code=status.HTTP_201_CREATED
)
def create_requisition(
    payload: RequisitionCreate, user: CurrentUserDep, db: DbDep
) -> RequisitionDetail:
    """Raise a requisition against a budgeted position."""
    position = db.execute(
        select(Position).where(
            Position.id == payload.position_id, Position.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if position is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Position not found")

    service.assert_within_budget(
        db, company_id=user.company_id, position=position, openings=payload.openings
    )

    requisition = Requisition(
        company_id=user.company_id, raised_by=user.id, **payload.model_dump()
    )
    db.add(requisition)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "That requisition code is already in use"
        ) from exc
    db.refresh(requisition)
    return _requisition_detail(db, requisition, position)


def _requisition_detail(
    db: Session, requisition: Requisition, position: Position
) -> RequisitionDetail:
    return RequisitionDetail(
        **RequisitionOut.model_validate(requisition).model_dump(),
        position_title=position.title,
        position_headcount=position.headcount,
        filled=service.filled_headcount(
            db, company_id=requisition.company_id, position_id=position.id
        ),
        committed=service.committed_openings(
            db,
            company_id=requisition.company_id,
            position_id=position.id,
            exclude=requisition.id,
        ),
    )


@router.get("/requisitions/{req_id}", response_model=RequisitionDetail)
def get_requisition(
    req_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> RequisitionDetail:
    requisition = _get_requisition(db, req_id, user.company_id)
    position = db.execute(
        select(Position).where(Position.id == requisition.position_id)
    ).scalar_one()
    return _requisition_detail(db, requisition, position)


@router.post("/requisitions/{req_id}/open", response_model=RequisitionOut)
def open_requisition(req_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> Requisition:
    """Approve it, which is what lets applications be taken against it."""
    requisition = _get_requisition(db, req_id, user.company_id)
    if requisition.status not in (RequisitionStatus.DRAFT, RequisitionStatus.ON_HOLD):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"A {requisition.status.value} requisition cannot be opened.",
        )

    requisition.status = RequisitionStatus.OPEN
    requisition.approved_by = user.id
    requisition.approved_at = datetime.now(UTC)
    db.commit()
    db.refresh(requisition)
    return requisition


@router.post("/requisitions/{req_id}/close", response_model=RequisitionOut)
def close_requisition(
    req_id: uuid.UUID,
    user: CurrentUserDep,
    db: DbDep,
    cancelled: Annotated[bool, Query()] = False,
) -> Requisition:
    """Filled, or cancelled. Either way it stops accepting applications and stops
    counting against the position's budget."""
    requisition = _get_requisition(db, req_id, user.company_id)
    requisition.status = (
        RequisitionStatus.CANCELLED if cancelled else RequisitionStatus.FILLED
    )
    requisition.closed_at = datetime.now(UTC)
    db.commit()
    db.refresh(requisition)
    return requisition


# ── Candidates ────────────────────────────────────────────────────────


@router.get("/candidates", response_model=list[CandidateOut])
def list_candidates(
    user: CurrentUserDep,
    db: DbDep,
    q: Annotated[str | None, Query(max_length=200)] = None,
) -> list[Candidate]:
    stmt = select(Candidate).where(Candidate.company_id == user.company_id)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(Candidate.full_name.ilike(pattern) | Candidate.email.ilike(pattern))
    return list(db.execute(stmt.order_by(Candidate.created_at.desc())).scalars().all())


@router.post("/candidates", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def create_candidate(
    payload: CandidateCreate, user: CurrentUserDep, db: DbDep
) -> Candidate:
    candidate = Candidate(company_id=user.company_id, **payload.model_dump())
    db.add(candidate)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Someone with that email is already on file. Apply them to the requisition "
            "instead — a repeat applicant should be one person with a history.",
        ) from exc
    db.refresh(candidate)
    return candidate


# ── Applications ──────────────────────────────────────────────────────


@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(
    user: CurrentUserDep,
    db: DbDep,
    requisition_id: Annotated[uuid.UUID | None, Query()] = None,
    stage_id: Annotated[uuid.UUID | None, Query()] = None,
    open_only: Annotated[bool, Query()] = False,
) -> list[Application]:
    """Ordered by when they arrived.

    Not by a score. The prototype sorted this list by an `ai_score` a language model
    wrote, which decided who a recruiter looked at first and therefore who got hired.
    """
    stmt = select(Application).where(Application.company_id == user.company_id)
    if requisition_id is not None:
        stmt = stmt.where(Application.requisition_id == requisition_id)
    if stage_id is not None:
        stmt = stmt.where(Application.stage_id == stage_id)
    if open_only:
        stmt = stmt.where(Application.outcome.is_(None))
    return list(db.execute(stmt.order_by(Application.applied_on)).scalars().all())


@router.post(
    "/applications", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED
)
def create_application(
    payload: ApplicationCreate, user: CurrentUserDep, db: DbDep
) -> Application:
    candidate = db.execute(
        select(Candidate).where(
            Candidate.id == payload.candidate_id, Candidate.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if candidate is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Candidate not found")

    requisition = _get_requisition(db, payload.requisition_id, user.company_id)

    # The guard has to cover the flush inside `apply`, not just the commit — the
    # duplicate is caught when the row is written, which happens before the event row
    # can reference it.
    try:
        application = service.apply(
            db,
            company_id=user.company_id,
            candidate_id=candidate.id,
            requisition=requisition,
            applied_on=payload.applied_on,
            user_id=user.id,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This candidate has already applied to that requisition.",
        ) from exc
    db.refresh(application)
    return application


@router.get("/applications/{app_id}", response_model=ApplicationDetail)
def get_application(
    app_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> ApplicationDetail:
    """One application with its whole history — every stage, who moved it, and why."""
    application = _get_application(db, app_id, user.company_id)
    candidate = db.execute(
        select(Candidate).where(Candidate.id == application.candidate_id)
    ).scalar_one()
    requisition = db.execute(
        select(Requisition).where(Requisition.id == application.requisition_id)
    ).scalar_one()
    stage = db.execute(
        select(PipelineStage).where(PipelineStage.id == application.stage_id)
    ).scalar_one()

    return ApplicationDetail(
        **ApplicationOut.model_validate(application).model_dump(),
        candidate_name=candidate.full_name,
        candidate_email=candidate.email,
        requisition_code=requisition.code,
        stage_name=stage.name,
        events=[
            EventOut.model_validate(event)
            for event in db.execute(
                select(ApplicationEvent)
                .where(
                    ApplicationEvent.application_id == application.id,
                    ApplicationEvent.company_id == user.company_id,
                )
                .order_by(ApplicationEvent.occurred_at)
            ).scalars()
        ],
    )


@router.post("/applications/{app_id}/move", response_model=ApplicationOut)
def move_application(
    app_id: uuid.UUID, payload: ApplicationMove, user: CurrentUserDep, db: DbDep
) -> Application:
    """Move to another stage. Appends to the history; never overwrites it."""
    application = _get_application(db, app_id, user.company_id)
    stage = db.execute(
        select(PipelineStage).where(
            PipelineStage.id == payload.to_stage_id,
            PipelineStage.company_id == user.company_id,
        )
    ).scalar_one_or_none()
    if stage is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Stage not found")

    service.move(
        db, application=application, to_stage=stage, user_id=user.id, note=payload.note
    )
    db.commit()
    db.refresh(application)
    return application


# ── Offers ────────────────────────────────────────────────────────────


@router.get("/offers", response_model=list[OfferOut])
def list_offers(user: CurrentUserDep, db: DbDep) -> list[Offer]:
    """Never includes `response_token`. It is a credential, not a field."""
    return list(
        db.execute(
            select(Offer)
            .where(Offer.company_id == user.company_id)
            .order_by(Offer.created_at.desc())
        ).scalars().all()
    )


@router.post(
    "/applications/{app_id}/offer",
    response_model=OfferOut,
    status_code=status.HTTP_201_CREATED,
)
def create_offer(
    app_id: uuid.UUID, payload: OfferCreate, user: CurrentUserDep, db: DbDep
) -> Offer:
    application = _get_application(db, app_id, user.company_id)
    offer = service.make_offer(
        db,
        application=application,
        basic=payload.basic,
        starts_on=payload.starts_on,
        expires_on=payload.expires_on,
        notes=payload.notes,
    )
    db.commit()
    db.refresh(offer)
    return offer


@router.post("/offers/{offer_id}/send", response_model=OfferSent)
def send_offer(offer_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> Offer:
    """Mark it sent and return the candidate's response token, once.

    The token is not in any list endpoint. Whoever holds it can answer the offer, which
    makes it a credential — it belongs in the candidate's link and nowhere else.
    """
    offer = db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.company_id == user.company_id)
    ).scalar_one_or_none()
    if offer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    if offer.status is not OfferStatus.DRAFT:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This offer is {offer.status.value}; only a draft can be sent.",
        )

    offer.status = OfferStatus.SENT
    offer.sent_at = datetime.now(UTC)
    db.commit()
    db.refresh(offer)
    return offer


@router.post("/offers/{offer_id}/withdraw", response_model=OfferOut)
def withdraw_offer(offer_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> Offer:
    offer = db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.company_id == user.company_id)
    ).scalar_one_or_none()
    if offer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")
    if offer.status in (OfferStatus.ACCEPTED, OfferStatus.DECLINED):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This offer was already {offer.status.value} and cannot be withdrawn.",
        )

    offer.status = OfferStatus.WITHDRAWN
    db.commit()
    db.refresh(offer)
    return offer


# ── Onboarding ────────────────────────────────────────────────────────


@router.post(
    "/offers/{offer_id}/onboard",
    response_model=OnboardResult,
    status_code=status.HTTP_201_CREATED,
)
def onboard_offer(
    offer_id: uuid.UUID, payload: OnboardRequest, user: CurrentUserDep, db: DbDep
) -> OnboardResult:
    """Turn an accepted offer into an employee, with their placement and salary.

    The seam between hiring and the employee master. One call, one transaction: the
    person, their assignment copied from the requisition's position, the HIRED event,
    and the salary they were actually offered.
    """
    offer = db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.company_id == user.company_id)
    ).scalar_one_or_none()
    if offer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")

    employee = onboarding.onboard(
        db,
        company_id=user.company_id,
        offer=offer,
        employee_code=payload.employee_code,
        user_id=user.id,
    )
    application = db.execute(
        select(Application).where(Application.id == offer.application_id)
    ).scalar_one()
    requisition = db.execute(
        select(Requisition).where(Requisition.id == application.requisition_id)
    ).scalar_one()
    closed = requisition.status is RequisitionStatus.FILLED

    db.commit()
    db.refresh(employee)

    return OnboardResult(
        employee_id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        joined_on=employee.joined_on,
        status=employee.status.value,
        basic=offer.basic,
        requisition_closed=closed,
    )


# ── The candidate's own link ──────────────────────────────────────────
#
# A separate router with no module gate and no authentication, because a candidate has
# neither a login nor a tenant. Everything is scoped by the token: it is looked up
# directly, never combined with an id from the path, so there is no id to substitute and
# no tenant to cross. Compare the prototype's `POST /offers/<offer_id>/respond`, which
# took the row's own identifier, had no auth and no company filter, and let anyone
# accept or decline anyone's offer by walking uuids.

public_router = APIRouter(prefix="/offer-response", tags=["offer-response"])

DbOnly = Annotated[Session, Depends(get_db)]


def _by_token(db: Session, token: str) -> tuple[Offer, Company]:
    row = db.execute(
        select(Offer, Company)
        .join(Company, Company.id == Offer.company_id)
        .where(Offer.response_token == token)
    ).one_or_none()
    if row is None:
        # Deliberately the same answer as an expired or already-answered link. A
        # distinct message would turn this into an oracle for guessing tokens.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This offer link is not valid")
    offer, company = row
    return offer, company


@public_router.get("/{token}", response_model=PublicOffer)
def view_offer(token: str, db: DbOnly) -> PublicOffer:
    """What the candidate sees. Only the terms they are being asked to accept."""
    offer, company = _by_token(db, token)
    requisition = db.execute(
        select(Requisition)
        .join(Application, Application.requisition_id == Requisition.id)
        .where(Application.id == offer.application_id)
    ).scalar_one()

    return PublicOffer(
        company=company.name,
        title=requisition.title,
        basic=offer.basic,
        starts_on=offer.starts_on,
        expires_on=offer.expires_on,
        status=offer.status,
    )


@public_router.post("/{token}", response_model=PublicOffer)
def respond(token: str, payload: OfferResponse, db: DbOnly) -> PublicOffer:
    """Accept or decline.

    Accepting also moves the application to the pipeline's hired stage, so the board
    and the offer cannot disagree about whether someone was hired.
    """
    offer, company = _by_token(db, token)
    service.respond_to_offer(db, offer=offer, accept=payload.accept, reason=payload.reason)

    application = db.execute(
        select(Application).where(Application.id == offer.application_id)
    ).scalar_one()
    outcome = StageOutcome.HIRED if payload.accept else StageOutcome.WITHDRAWN
    terminal = db.execute(
        select(PipelineStage)
        .where(
            PipelineStage.company_id == offer.company_id,
            PipelineStage.outcome == outcome,
            PipelineStage.is_active.is_(True),
        )
        .order_by(PipelineStage.sequence)
    ).scalars().first()

    if terminal is not None and application.outcome is None:
        service.move(
            db,
            application=application,
            to_stage=terminal,
            user_id=None,
            note="Candidate accepted the offer"
            if payload.accept
            else f"Candidate declined the offer: {payload.reason or 'no reason given'}",
        )

    db.commit()
    db.refresh(offer)

    requisition = db.execute(
        select(Requisition).where(Requisition.id == application.requisition_id)
    ).scalar_one()
    return PublicOffer(
        company=company.name,
        title=requisition.title,
        basic=offer.basic,
        starts_on=offer.starts_on,
        expires_on=offer.expires_on,
        status=offer.status,
    )
