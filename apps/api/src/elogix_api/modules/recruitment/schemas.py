"""Recruitment payloads.

No `score` field anywhere, in or out. See `models.py` for why.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from elogix_api.modules.recruitment.models import (
    OfferStatus,
    RequisitionStatus,
    StageOutcome,
)


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Pipeline ──────────────────────────────────────────────────────────


class StageOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    sequence: int
    is_terminal: bool
    outcome: StageOutcome | None
    is_active: bool


class StageCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32, pattern=r"^[A-Z0-9_]+$")
    name: str = Field(min_length=1, max_length=120)
    sequence: int = Field(ge=1, le=999)
    is_terminal: bool = False
    outcome: StageOutcome | None = None


# ── Requisitions ──────────────────────────────────────────────────────


class RequisitionCreate(BaseModel):
    code: str = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    position_id: uuid.UUID
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    openings: int = Field(default=1, ge=1, le=999)
    target_start_date: date | None = None


class RequisitionOut(_Out):
    id: uuid.UUID
    code: str
    position_id: uuid.UUID
    title: str
    description: str | None
    openings: int
    status: RequisitionStatus
    target_start_date: date | None
    approved_at: datetime | None
    closed_at: datetime | None


class RequisitionDetail(RequisitionOut):
    """With the budget it draws against, because that is the question a reader has."""

    position_title: str
    position_headcount: int
    filled: int
    committed: int


# ── Candidates ────────────────────────────────────────────────────────


class CandidateCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)
    source: str | None = Field(default=None, max_length=64)
    notes: str | None = None


class CandidateOut(_Out):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    source: str | None
    notes: str | None
    resume_filename: str | None
    created_at: datetime


# ── Applications ──────────────────────────────────────────────────────


class ApplicationCreate(BaseModel):
    candidate_id: uuid.UUID
    requisition_id: uuid.UUID
    applied_on: date | None = None


class ApplicationMove(BaseModel):
    to_stage_id: uuid.UUID
    # Required by the service when the destination is a rejection; optional in the
    # schema so the refusal carries the explanation rather than a bare 422 on a field.
    note: str | None = Field(default=None, max_length=2000)


class EventOut(_Out):
    id: uuid.UUID
    from_stage_id: uuid.UUID | None
    to_stage_id: uuid.UUID
    moved_by: uuid.UUID | None
    occurred_at: datetime
    note: str | None


class ApplicationOut(_Out):
    id: uuid.UUID
    candidate_id: uuid.UUID
    requisition_id: uuid.UUID
    stage_id: uuid.UUID
    applied_on: date
    outcome: StageOutcome | None
    closed_at: datetime | None


class ApplicationDetail(ApplicationOut):
    candidate_name: str
    candidate_email: str
    requisition_code: str
    stage_name: str
    events: list[EventOut] = []


# ── Offers ────────────────────────────────────────────────────────────


class OfferCreate(BaseModel):
    basic: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    starts_on: date
    expires_on: date
    notes: str | None = Field(default=None, max_length=2000)


class OfferOut(_Out):
    id: uuid.UUID
    application_id: uuid.UUID
    basic: Decimal
    starts_on: date
    expires_on: date
    status: OfferStatus
    notes: str | None
    sent_at: datetime | None
    responded_at: datetime | None
    decline_reason: str | None
    employee_id: uuid.UUID | None


class OfferSent(OfferOut):
    """Returned once, on send.

    The token is in the response and in no list endpoint, because it is a credential:
    whoever holds it can answer the offer. It goes to the candidate's own link and
    nowhere else.
    """

    response_token: str


class OfferResponse(BaseModel):
    accept: bool
    reason: str | None = Field(default=None, max_length=2000)


class PublicOffer(BaseModel):
    """What a candidate sees at their link.

    Deliberately thin. No candidate id, no application id, no requisition code, no
    internal notes — a token holder is a candidate, not a user of this system, and
    everything beyond the terms they are being asked to accept is the company's.
    """

    company: str
    title: str
    basic: Decimal
    starts_on: date
    expires_on: date
    status: OfferStatus
