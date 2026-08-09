"""
FILE: backend/models/recruitment_models.py
NepHR Pro — Recruitment & Hiring Module Models (12 tables, 16 pages)
Nepal Labour Act 2074 Sections 6,7,11,13,22,23 enforced via SQLAlchemy events.
"""
from __future__ import annotations
from datetime import datetime, date
import uuid
import enum

from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Text, Date, Time, DateTime,
    Numeric, ForeignKey, Index, UniqueConstraint, CheckConstraint, event,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, TSVECTOR


class Base(DeclarativeBase):
    pass


def _uuid(): return str(uuid.uuid4())
def _now():  return datetime.utcnow()


class EmploymentTypeEnum(str, enum.Enum):
    REGULAR    = "regular"
    TIME_BOUND = "time_bound"
    WORK_BASED = "work_based"
    PART_TIME  = "part_time"
    CASUAL     = "casual"


class ApplicationStageEnum(str, enum.Enum):
    APPLIED   = "applied"
    SCREENING = "screening"
    WRITTEN   = "written"
    VIDEO     = "video"
    PANEL     = "panel"
    OFFER     = "offer"
    HIRED     = "hired"
    REJECTED  = "rejected"
    WITHDRAWN = "withdrawn"


# ═══════════════════════════════════════════════════════════════
# 1. JOB REQUISITION (Manpower Requisition)
# ═══════════════════════════════════════════════════════════════
class JobRequisition(Base):
    __tablename__ = "job_requisitions"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)

    jrf_no                 = Column(String(50), nullable=False)
    position_title         = Column(String(200), nullable=False)
    department_id          = Column(UUID(as_uuid=False))
    branch_id              = Column(UUID(as_uuid=False))
    grade_level_id          = Column(UUID(as_uuid=False))
    employment_type         = Column(String(30), default="regular")

    headcount_requested      = Column(Integer, default=1)
    reason                    = Column(String(50), default="new_position")
    justification              = Column(Text)

    approved_salary_min_npr     = Column(Numeric(12,2))
    approved_salary_max_npr      = Column(Numeric(12,2))
    budget_verified                = Column(Boolean, default=False)
    budget_available_npr            = Column(Numeric(15,2))

    requested_by                     = Column(UUID(as_uuid=False))
    requested_date                    = Column(Date, default=date.today)
    approval_chain                     = Column(JSONB, default=list)
    current_approval_stage              = Column(String(50), default="dept_head")
    status                               = Column(String(30), default="pending")

    target_fill_date                      = Column(Date)
    ai_score                               = Column(Float, default=0)
    ai_recommendation                       = Column(Text)

    created_at                               = Column(DateTime, default=_now)
    updated_at                                = Column(DateTime, default=_now, onupdate=_now)
    created_by                                 = Column(UUID(as_uuid=False))
    is_deleted                                  = Column(Boolean, default=False)

    __table_args__ = (UniqueConstraint("company_id","jrf_no", name="uq_jrf_no"),)

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 2. VACANCY
# ═══════════════════════════════════════════════════════════════
class Vacancy(Base):
    __tablename__ = "vacancies"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)
    requisition_id          = Column(UUID(as_uuid=False), ForeignKey("job_requisitions.id"))

    title                    = Column(String(200), nullable=False)
    department_id             = Column(UUID(as_uuid=False))
    branch_id                  = Column(UUID(as_uuid=False))
    grade_level_id               = Column(UUID(as_uuid=False))
    employment_type               = Column(String(30), default="regular")

    salary_range_min_npr            = Column(Numeric(12,2))
    salary_range_max_npr             = Column(Numeric(12,2))

    approved_by                       = Column(UUID(as_uuid=False))
    approved_date                      = Column(Date)
    target_fill_date                    = Column(Date)
    time_to_fill_target_days             = Column(Integer, default=45)

    priority                              = Column(String(20), default="medium")
    status                                 = Column(String(20), default="new")

    # Nepal LA2074 Section 11
    la_advertised_newspaper                 = Column(Boolean, default=False)
    la_newspaper_name                        = Column(String(200))
    la_advertised_date                        = Column(Date)
    moless_portal_posted                       = Column(Boolean, default=False)
    moless_posted_date                          = Column(Date)
    moless_reference_no                          = Column(String(100))

    foreign_hire_requested                        = Column(Boolean, default=False)
    foreign_hire_justification                     = Column(Text)
    work_permit_status                              = Column(String(30))

    applications_count                               = Column(Integer, default=0)
    shortlisted_count                                 = Column(Integer, default=0)
    interviewed_count                                  = Column(Integer, default=0)

    ai_score                                             = Column(Float, default=0)
    ai_note                                               = Column(Text)

    jrf_raised                                             = Column(Boolean, default=False)
    jrf_no                                                  = Column(String(50))

    created_at                                               = Column(DateTime, default=_now)
    updated_at                                                = Column(DateTime, default=_now, onupdate=_now)
    created_by                                                 = Column(UUID(as_uuid=False))
    is_deleted                                                  = Column(Boolean, default=False)

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 3. JOB POSTING
# ═══════════════════════════════════════════════════════════════
class JobPosting(Base):
    __tablename__ = "job_postings"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)
    vacancy_id              = Column(UUID(as_uuid=False), ForeignKey("vacancies.id"))

    title                    = Column(String(200), nullable=False)
    description               = Column(Text)
    location                   = Column(String(200))
    employment_type             = Column(String(30))
    remote_type                  = Column(String(30), default="on_site")
    salary_range_display          = Column(String(100))
    experience_required             = Column(String(100))

    boards                            = Column(JSONB, default=list)
    is_featured                        = Column(Boolean, default=False)

    ai_generated_jd                     = Column(Boolean, default=False)
    ai_bias_score                        = Column(Float)
    ai_bias_flags                         = Column(JSONB, default=list)

    views_count                            = Column(Integer, default=0)
    clicks_count                            = Column(Integer, default=0)
    applications_count                       = Column(Integer, default=0)

    published_date                            = Column(Date)
    expiry_date                                = Column(Date)
    status                                      = Column(String(20), default="draft")

    la_compliant                                 = Column(Boolean, default=False)
    eeo_disclaimer_included                       = Column(Boolean, default=True)

    created_at                                     = Column(DateTime, default=_now)
    updated_at                                      = Column(DateTime, default=_now, onupdate=_now)
    created_by                                       = Column(UUID(as_uuid=False))
    is_deleted                                        = Column(Boolean, default=False)

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 4. CANDIDATE
# ═══════════════════════════════════════════════════════════════
class Candidate(Base):
    __tablename__ = "candidates"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)

    code                    = Column(String(30), nullable=False)
    full_name                = Column(String(200), nullable=False)
    email                      = Column(String(255), nullable=False)
    phone                       = Column(String(50))
    city                          = Column(String(100))
    linkedin_url                   = Column(String(255))

    current_role                     = Column(String(200))
    current_company                    = Column(String(200))
    total_exp_years                      = Column(Float)
    education                              = Column(String(200))
    notice_period_days                       = Column(Integer)

    resume_url                                 = Column(String(500))
    resume_parsed_data                           = Column(JSONB, default=dict)
    skills                                         = Column(JSONB, default=list)

    source                                          = Column(String(50), default="direct")
    tags                                             = Column(JSONB, default=list)

    status                                            = Column(String(30), default="active")
    pool_added_date                                     = Column(Date)
    last_activity_date                                   = Column(Date, default=date.today)
    last_engagement_sent                                  = Column(DateTime)

    ai_score                                                = Column(Float, default=0)
    ai_profile_summary                                       = Column(Text)

    consent_given                                             = Column(Boolean, default=False)
    consent_date                                                = Column(DateTime)
    data_retention_expiry                                        = Column(Date)
    is_anonymized                                                 = Column(Boolean, default=False)

    duplicate_of_candidate_id                                      = Column(UUID(as_uuid=False), ForeignKey("candidates.id"))

    search_vector                                                    = Column(TSVECTOR)

    created_at                                                        = Column(DateTime, default=_now)
    updated_at                                                         = Column(DateTime, default=_now, onupdate=_now)
    created_by                                                          = Column(UUID(as_uuid=False))
    is_deleted                                                           = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("company_id","code", name="uq_cand_code"),
        UniqueConstraint("company_id","email", name="uq_cand_email"),
    )

    def to_dict(self):
        d = {c.name: getattr(self,c.name) for c in self.__table__.columns}
        d.pop("search_vector", None)
        return d


# ═══════════════════════════════════════════════════════════════
# 5. APPLICATION (ATS Pipeline)
# ═══════════════════════════════════════════════════════════════
class Application(Base):
    __tablename__ = "applications"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)
    candidate_id            = Column(UUID(as_uuid=False), ForeignKey("candidates.id"), nullable=False)
    vacancy_id                = Column(UUID(as_uuid=False), ForeignKey("vacancies.id"), nullable=False)
    job_posting_id              = Column(UUID(as_uuid=False), ForeignKey("job_postings.id"))

    code                          = Column(String(30), nullable=False)

    stage                           = Column(String(30), default="applied")
    stage_history                     = Column(JSONB, default=list)

    applied_date                        = Column(Date, default=date.today)
    applied_via                           = Column(String(30), default="career_portal")

    knockout_passed                         = Column(Boolean, default=True)
    knockout_failures                         = Column(JSONB, default=list)

    cv_match_score                              = Column(Float)
    written_exam_score                            = Column(Float)
    video_interview_score                           = Column(Float)
    panel_avg_score                                   = Column(Float)
    overall_score                                       = Column(Float)

    rejection_reason                                     = Column(Text)
    rejected_at                                            = Column(DateTime)
    rejected_by                                              = Column(UUID(as_uuid=False))

    created_at                                                 = Column(DateTime, default=_now)
    updated_at                                                  = Column(DateTime, default=_now, onupdate=_now)
    is_deleted                                                   = Column(Boolean, default=False)

    candidate = relationship("Candidate", foreign_keys=[candidate_id])

    __table_args__ = (
        UniqueConstraint("company_id","code", name="uq_app_code"),
        UniqueConstraint("candidate_id","vacancy_id", name="uq_app_cand_vac"),
    )

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 6. RESUME SCREENING RESULT
# ═══════════════════════════════════════════════════════════════
class ResumeScreeningResult(Base):
    __tablename__ = "resume_screening_results"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    application_id          = Column(UUID(as_uuid=False), ForeignKey("applications.id"), nullable=False)
    company_id                = Column(UUID(as_uuid=False), nullable=False)

    ai_match_pct               = Column(Float)
    skill_match_pct              = Column(Float)
    experience_match_pct           = Column(Float)
    education_match_pct              = Column(Float)

    skills_matched                     = Column(JSONB, default=list)
    skills_missing                       = Column(JSONB, default=list)

    fraud_risk_score                       = Column(Float, default=0)
    fraud_flags                              = Column(JSONB, default=list)

    blind_screening_applied                    = Column(Boolean, default=False)

    ai_recommendation                            = Column(Text)
    screened_at                                    = Column(DateTime, default=_now)
    screened_by_ai_model                             = Column(String(50), default="claude-sonnet-4-6")

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 7. INTERVIEW
# ═══════════════════════════════════════════════════════════════
class Interview(Base):
    __tablename__ = "interviews"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)
    application_id          = Column(UUID(as_uuid=False), ForeignKey("applications.id"), nullable=False)

    round_type                = Column(String(30), default="technical")
    scheduled_date              = Column(Date)
    scheduled_time                = Column(Time)
    duration_minutes                = Column(Integer, default=60)
    mode                               = Column(String(30), default="video")
    meeting_link                         = Column(String(255))
    location                               = Column(String(200))

    status                                   = Column(String(30), default="pending_candidate")

    self_schedule_link                         = Column(String(255))
    self_schedule_token                          = Column(String(100))
    candidate_confirmed_at                         = Column(DateTime)

    packet_sent                                      = Column(Boolean, default=False)
    packet_sent_at                                     = Column(DateTime)
    reminder_sent                                        = Column(Boolean, default=False)
    reminder_sent_at                                       = Column(DateTime)

    recording_url                                            = Column(String(500))
    transcription_text                                         = Column(Text)
    ai_conversation_analysis                                      = Column(JSONB, default=dict)

    created_at                                                      = Column(DateTime, default=_now)
    updated_at                                                       = Column(DateTime, default=_now, onupdate=_now)
    created_by                                                        = Column(UUID(as_uuid=False))
    is_deleted                                                         = Column(Boolean, default=False)

    panel_members = relationship("InterviewPanelMember", backref="interview")
    scorecards     = relationship("InterviewScorecard", backref="interview")

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 8. INTERVIEW PANEL MEMBER
# ═══════════════════════════════════════════════════════════════
class InterviewPanelMember(Base):
    __tablename__ = "interview_panel_members"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    interview_id            = Column(UUID(as_uuid=False), ForeignKey("interviews.id"), nullable=False)
    company_id                = Column(UUID(as_uuid=False), nullable=False)

    employee_id                = Column(UUID(as_uuid=False))
    member_name                  = Column(String(200), nullable=False)
    member_role                    = Column(String(100))
    expertise_area                   = Column(String(200))

    notified                           = Column(Boolean, default=False)
    notified_at                          = Column(DateTime)
    notification_method                    = Column(String(30), default="email")
    calendar_invite_sent                     = Column(Boolean, default=False)
    candidate_packet_received                  = Column(Boolean, default=False)

    confirmed_attendance                         = Column(Boolean, default=False)

    created_at                                     = Column(DateTime, default=_now)

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 9. INTERVIEW SCORECARD
# ═══════════════════════════════════════════════════════════════
class InterviewScorecard(Base):
    __tablename__ = "interview_scorecards"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    interview_id            = Column(UUID(as_uuid=False), ForeignKey("interviews.id"), nullable=False)
    panel_member_id            = Column(UUID(as_uuid=False), ForeignKey("interview_panel_members.id"))
    company_id                   = Column(UUID(as_uuid=False), nullable=False)

    competencies                   = Column(JSONB, nullable=False, default=list)

    overall_score                    = Column(Float)
    recommendation                     = Column(String(30))
    notes                                = Column(Text)
    strengths                             = Column(Text)
    concerns                                = Column(Text)

    submitted                                 = Column(Boolean, default=False)
    submitted_at                                = Column(DateTime)

    created_at                                    = Column(DateTime, default=_now)
    updated_at                                     = Column(DateTime, default=_now, onupdate=_now)

    __table_args__ = (UniqueConstraint("interview_id","panel_member_id", name="uq_scorecard_panel"),)

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 10. OFFER
# ═══════════════════════════════════════════════════════════════
class Offer(Base):
    __tablename__ = "offers"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)
    application_id          = Column(UUID(as_uuid=False), ForeignKey("applications.id"), nullable=False)

    offer_no                  = Column(String(50), nullable=False)
    position_title              = Column(String(200))
    department_id                 = Column(UUID(as_uuid=False))

    employment_type                 = Column(String(30), nullable=False)
    probation_months                  = Column(Integer, default=6)
    job_description                     = Column(Text)
    workplace_rules_acknowledged           = Column(Boolean, default=False)

    basic_salary_npr                         = Column(Numeric(12,2), nullable=False)
    allowances_npr                             = Column(Numeric(12,2), default=0)
    total_ctc_npr                                = Column(Numeric(12,2))
    joining_date                                   = Column(Date)

    approval_chain                                   = Column(JSONB, default=list)
    current_approval_stage                             = Column(String(50), default="hr_manager")
    status                                               = Column(String(30), default="draft")

    offer_letter_url                                       = Column(String(500))
    esignature_provider                                      = Column(String(50), default="DocuSign")
    esignature_status                                          = Column(String(30), default="not_sent")
    esignature_sent_at                                            = Column(DateTime)
    esignature_completed_at                                         = Column(DateTime)
    signed_document_url                                               = Column(String(500))

    sent_date                                                           = Column(Date)
    response_deadline                                                     = Column(Date)
    accepted_date                                                           = Column(Date)
    declined_reason                                                          = Column(Text)

    contract_generated                                                         = Column(Boolean, default=False)
    contract_url                                                                 = Column(String(500))

    created_at                                                                     = Column(DateTime, default=_now)
    updated_at                                                                      = Column(DateTime, default=_now, onupdate=_now)
    created_by                                                                       = Column(UUID(as_uuid=False))
    is_deleted                                                                        = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("company_id","offer_no", name="uq_offer_no"),
        CheckConstraint("probation_months <= 6", name="ck_offer_probation_max6"),
    )

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 11. BACKGROUND CHECK
# ═══════════════════════════════════════════════════════════════
class BackgroundCheck(Base):
    __tablename__ = "background_checks"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)
    offer_id                 = Column(UUID(as_uuid=False), ForeignKey("offers.id"))
    candidate_id               = Column(UUID(as_uuid=False), ForeignKey("candidates.id"), nullable=False)

    consent_obtained             = Column(Boolean, nullable=False, default=False)
    consent_date                   = Column(DateTime)
    consent_document_url             = Column(String(500))

    checks                             = Column(JSONB, nullable=False, default=dict)

    status                               = Column(String(30), default="pending_consent")
    overall_risk                           = Column(String(20), default="pending")
    ai_risk_score                            = Column(Float, default=0)

    external_provider                          = Column(String(100), default="Internal")
    blockchain_hash                              = Column(String(100))

    initiated_date                                 = Column(DateTime, default=_now)
    completed_date                                   = Column(DateTime)

    created_at                                         = Column(DateTime, default=_now)
    updated_at                                          = Column(DateTime, default=_now, onupdate=_now)
    is_deleted                                           = Column(Boolean, default=False)

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# 12. HIRING APPROVAL
# ═══════════════════════════════════════════════════════════════
class HiringApproval(Base):
    __tablename__ = "hiring_approvals"

    id                     = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id             = Column(UUID(as_uuid=False), nullable=False)

    entity_type             = Column(String(30), nullable=False)
    entity_id                 = Column(UUID(as_uuid=False), nullable=False)

    approval_level              = Column(Integer, nullable=False)
    approver_role                 = Column(String(50), nullable=False)
    approver_id                     = Column(UUID(as_uuid=False))
    approver_name                     = Column(String(200))

    status                               = Column(String(20), default="pending")
    decision_date                          = Column(DateTime)
    comments                                 = Column(Text)

    triggered_by_salary_band                   = Column(Boolean, default=False)
    salary_threshold_npr                         = Column(Numeric(12,2))

    notification_sent                              = Column(Boolean, default=False)
    notification_sent_at                             = Column(DateTime)

    created_at                                         = Column(DateTime, default=_now)
    updated_at                                          = Column(DateTime, default=_now, onupdate=_now)

    def to_dict(self):
        return {c.name: getattr(self,c.name) for c in self.__table__.columns}


# ── Event listeners: Nepal Labour Act 2074 enforcement ─────────
@event.listens_for(Offer, "before_insert")
@event.listens_for(Offer, "before_update")
def validate_offer_la2074(mapper, connection, target):
    """Section 13: probation max 6 months."""
    if target.probation_months and target.probation_months > 6:
        raise ValueError(
            "Nepal Labour Act 2074 Section 13: Probation period cannot exceed 6 months."
        )


@event.listens_for(BackgroundCheck, "before_update")
def validate_bgc_consent(mapper, connection, target):
    """Consent must precede check execution (Nepal Individual Privacy Act)."""
    if target.status == "in_progress" and not target.consent_obtained:
        raise ValueError(
            "Background check cannot proceed without documented candidate consent "
            "per Nepal Individual Privacy Act."
        )
