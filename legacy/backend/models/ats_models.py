# FILE: backend/models/ats_models.py
# World-Class ATS — Complete SQLAlchemy Models
# Covers all 12 ATS modules: Jobs, Candidates, Applications, Resumes,
# Assessments, Video, Panels, Offers, Talent Pool, Clients, Onboarding, Comms

from datetime import datetime
import json
from backend.database import db


class ATSJob(db.Model):
    __tablename__ = 'ats_jobs'
    id                  = db.Column(db.String(36), primary_key=True)
    tenant_id           = db.Column(db.String(36), nullable=False, index=True)
    title               = db.Column(db.String(200), nullable=False)
    job_code            = db.Column(db.String(50))
    department          = db.Column(db.String(100))
    division            = db.Column(db.String(100))
    location            = db.Column(db.String(200))
    job_type            = db.Column(db.String(50), default='Full-Time')
    # Full-Time | Part-Time | Contract | Internship | Freelance
    experience_level    = db.Column(db.String(50))
    # Entry | Mid | Senior | Lead | Director | VP | C-Suite
    min_experience_years= db.Column(db.Integer, default=0)
    max_experience_years= db.Column(db.Integer)
    education_required  = db.Column(db.String(100))
    salary_min          = db.Column(db.Numeric(12, 2))
    salary_max          = db.Column(db.Numeric(12, 2))
    salary_currency     = db.Column(db.String(10), default='NPR')
    salary_visible      = db.Column(db.Boolean, default=False)
    skills_required     = db.Column(db.Text)     # JSON array
    skills_preferred    = db.Column(db.Text)     # JSON array
    certifications      = db.Column(db.Text)     # JSON array
    jd_text             = db.Column(db.Text)
    responsibilities    = db.Column(db.Text)
    qualifications      = db.Column(db.Text)
    openings            = db.Column(db.Integer, default=1)
    filled              = db.Column(db.Integer, default=0)
    priority            = db.Column(db.String(20), default='Medium')
    status              = db.Column(db.String(30), default='Draft')
    # Draft | Pending Approval | Published | Paused | Closed
    approval_status     = db.Column(db.String(30), default='Pending')
    approved_by         = db.Column(db.String(36))
    approved_at         = db.Column(db.DateTime)
    deadline            = db.Column(db.DateTime)
    published_at        = db.Column(db.DateTime)
    closed_at           = db.Column(db.DateTime)
    is_internal         = db.Column(db.Boolean, default=False)
    is_active           = db.Column(db.Boolean, default=True)
    client_id           = db.Column(db.String(36), db.ForeignKey('ats_clients.id'))
    created_by          = db.Column(db.String(36))
    assigned_recruiter  = db.Column(db.String(36))
    hiring_manager      = db.Column(db.String(36))
    budget_approved     = db.Column(db.Boolean, default=False)
    budget_amount       = db.Column(db.Numeric(12, 2))
    tags                = db.Column(db.Text)  # JSON
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at          = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSCandidate(db.Model):
    __tablename__ = 'ats_candidates'
    id                  = db.Column(db.String(36), primary_key=True)
    tenant_id           = db.Column(db.String(36), nullable=False, index=True)
    candidate_code      = db.Column(db.String(30), unique=True)
    full_name           = db.Column(db.String(200))
    email               = db.Column(db.String(200), index=True)
    phone               = db.Column(db.String(30))
    whatsapp            = db.Column(db.String(30))
    current_role        = db.Column(db.String(200))
    current_company     = db.Column(db.String(200))
    total_experience    = db.Column(db.Numeric(4, 1))
    current_salary      = db.Column(db.Numeric(12, 2))
    expected_salary     = db.Column(db.Numeric(12, 2))
    notice_period_days  = db.Column(db.Integer)
    location            = db.Column(db.String(200))
    nationality         = db.Column(db.String(100))
    gender              = db.Column(db.String(20))
    dob                 = db.Column(db.Date)
    education           = db.Column(db.Text)   # JSON
    skills              = db.Column(db.Text)   # JSON
    certifications      = db.Column(db.Text)   # JSON
    languages           = db.Column(db.Text)   # JSON
    work_experience     = db.Column(db.Text)   # JSON
    linkedin_url        = db.Column(db.String(300))
    portfolio_url       = db.Column(db.String(300))
    github_url          = db.Column(db.String(300))
    resume_filename     = db.Column(db.String(300))
    resume_url          = db.Column(db.String(500))
    parse_status        = db.Column(db.String(30), default='pending')
    # pending | processing | done | failed
    ai_score            = db.Column(db.Numeric(5, 2), default=0)
    ai_rank             = db.Column(db.String(20))  # Gold | Silver | Bronze | Reject
    ai_summary          = db.Column(db.Text)
    source              = db.Column(db.String(100))
    # LinkedIn | Indeed | Portal | Referral | WhatsApp | Email | Facebook | Naukri
    is_duplicate        = db.Column(db.Boolean, default=False)
    duplicate_of        = db.Column(db.String(36))
    blacklisted         = db.Column(db.Boolean, default=False)
    gdpr_consent        = db.Column(db.Boolean, default=False)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at          = db.Column(db.DateTime, default=datetime.utcnow)

    applications        = db.relationship('ATSApplication', backref='candidate', lazy=True)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSApplication(db.Model):
    __tablename__ = 'ats_applications'
    id                  = db.Column(db.String(36), primary_key=True)
    tenant_id           = db.Column(db.String(36), nullable=False, index=True)
    candidate_id        = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'), nullable=False)
    job_id              = db.Column(db.String(36), db.ForeignKey('ats_jobs.id'), nullable=False)
    stage               = db.Column(db.String(50), default='Applied', index=True)
    # Applied | AI Screening | HR Screening | Hiring Manager Review |
    # Technical Assessment | Video Interview | Interview | Final Interview |
    # Offer | Background Check | Hired | Rejected | Talent Pool
    source              = db.Column(db.String(100))
    cover_letter        = db.Column(db.Text)
    ai_score            = db.Column(db.Numeric(5, 2), default=0)
    ai_rank             = db.Column(db.String(20))
    ai_match_detail     = db.Column(db.Text)   # JSON: {skills_match, exp_match, ...}
    written_test_score  = db.Column(db.Numeric(5, 2))
    video_interview_score = db.Column(db.Numeric(5, 2))
    panel_score         = db.Column(db.Numeric(5, 2))
    hr_rating           = db.Column(db.Integer)     # 1–5
    hr_notes            = db.Column(db.Text)
    hiring_manager_rating = db.Column(db.Integer)
    hiring_manager_notes= db.Column(db.Text)
    shared_with_client  = db.Column(db.Boolean, default=False)
    client_id           = db.Column(db.String(36))
    client_decision     = db.Column(db.String(30))  # approve | reject
    client_feedback     = db.Column(db.Text)
    applied_at          = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at          = db.Column(db.DateTime, default=datetime.utcnow)
    rejected_reason     = db.Column(db.Text)
    rejection_email_sent= db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSResumeParse(db.Model):
    __tablename__ = 'ats_resume_parses'
    id              = db.Column(db.String(36), primary_key=True)
    candidate_id    = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'))
    raw_text        = db.Column(db.Text)
    parsed_name     = db.Column(db.String(200))
    parsed_email    = db.Column(db.String(200))
    parsed_phone    = db.Column(db.String(50))
    parsed_skills   = db.Column(db.Text)   # JSON
    parsed_education= db.Column(db.Text)   # JSON
    parsed_experience=db.Column(db.Text)   # JSON
    parsed_certifications=db.Column(db.Text)  # JSON
    parsed_languages= db.Column(db.Text)   # JSON
    parsed_location = db.Column(db.String(200))
    total_years_exp = db.Column(db.Numeric(4,1))
    ai_summary      = db.Column(db.Text)
    confidence_score= db.Column(db.Numeric(5,2))
    parsed_at       = db.Column(db.DateTime, default=datetime.utcnow)
    parse_engine    = db.Column(db.String(50), default='claude-ai')

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSAssessment(db.Model):
    __tablename__ = 'ats_assessments'
    id                  = db.Column(db.String(36), primary_key=True)
    tenant_id           = db.Column(db.String(36), nullable=False)
    name                = db.Column(db.String(200), nullable=False)
    job_id              = db.Column(db.String(36), db.ForeignKey('ats_jobs.id'))
    description         = db.Column(db.Text)
    instructions        = db.Column(db.Text)
    duration_minutes    = db.Column(db.Integer, default=60)
    pass_score          = db.Column(db.Integer, default=60)
    total_marks         = db.Column(db.Integer, default=100)
    negative_marking    = db.Column(db.Boolean, default=False)
    negative_mark_value = db.Column(db.Numeric(3,2), default=0.25)
    randomize_questions = db.Column(db.Boolean, default=True)
    proctoring_enabled  = db.Column(db.Boolean, default=False)
    webcam_required     = db.Column(db.Boolean, default=False)
    status              = db.Column(db.String(20), default='Draft')
    # Draft | Active | Archived
    link_token          = db.Column(db.String(64), unique=True)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    questions           = db.relationship('ATSQuestion', backref='assessment', lazy=True)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSQuestion(db.Model):
    __tablename__ = 'ats_questions'
    id                  = db.Column(db.String(36), primary_key=True)
    assessment_id       = db.Column(db.String(36), db.ForeignKey('ats_assessments.id'))
    tenant_id           = db.Column(db.String(36))
    question_type       = db.Column(db.String(30))
    # mcq | coding | essay | psychometric | true_false | short_answer
    question_text       = db.Column(db.Text, nullable=False)
    options             = db.Column(db.Text)   # JSON for MCQ
    correct_answer      = db.Column(db.Text)
    marks               = db.Column(db.Integer, default=5)
    difficulty          = db.Column(db.String(20), default='Medium')
    topic               = db.Column(db.String(100))
    ai_evaluation_rubric= db.Column(db.Text)
    time_limit_seconds  = db.Column(db.Integer)
    order               = db.Column(db.Integer, default=0)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class ATSSubmission(db.Model):
    __tablename__ = 'ats_submissions'
    id                  = db.Column(db.String(36), primary_key=True)
    assessment_id       = db.Column(db.String(36), db.ForeignKey('ats_assessments.id'))
    candidate_id        = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'))
    application_id      = db.Column(db.String(36))
    answers             = db.Column(db.Text)   # JSON [{question_id, answer}]
    mcq_score           = db.Column(db.Numeric(5,2), default=0)
    coding_score        = db.Column(db.Numeric(5,2), default=0)
    essay_score         = db.Column(db.Numeric(5,2), default=0)
    psychometric_score  = db.Column(db.Numeric(5,2), default=0)
    overall_score       = db.Column(db.Numeric(5,2), default=0)
    grade               = db.Column(db.String(5))
    ai_feedback         = db.Column(db.Text)
    ai_recommendation   = db.Column(db.String(50))
    status              = db.Column(db.String(30), default='pending_evaluation')
    time_taken_seconds  = db.Column(db.Integer)
    started_at          = db.Column(db.DateTime)
    submitted_at        = db.Column(db.DateTime, default=datetime.utcnow)
    evaluated_at        = db.Column(db.DateTime)
    proctoring_flags    = db.Column(db.Text)   # JSON: [{type, timestamp}]

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSVideoInterview(db.Model):
    __tablename__ = 'ats_video_interviews'
    id                  = db.Column(db.String(36), primary_key=True)
    tenant_id           = db.Column(db.String(36), nullable=False)
    job_id              = db.Column(db.String(36), db.ForeignKey('ats_jobs.id'))
    candidate_id        = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'))
    application_id      = db.Column(db.String(36))
    questions           = db.Column(db.Text)   # JSON
    time_limit          = db.Column(db.Integer, default=30)  # minutes
    interview_link      = db.Column(db.String(300), unique=True)
    status              = db.Column(db.String(30), default='Scheduled')
    # Scheduled | In Progress | Completed | Expired
    recording_url       = db.Column(db.String(500))
    transcript          = db.Column(db.Text)
    ai_analysis         = db.Column(db.Text)   # JSON scores
    ai_summary          = db.Column(db.Text)
    ai_recommendation   = db.Column(db.String(50))
    confidence_score    = db.Column(db.Numeric(5,2))
    clarity_score       = db.Column(db.Numeric(5,2))
    eye_contact_score   = db.Column(db.Numeric(5,2))
    voice_stability     = db.Column(db.Numeric(5,2))
    keyword_hits        = db.Column(db.Text)   # JSON
    overall_score       = db.Column(db.Numeric(5,2))
    invite_sent_at      = db.Column(db.DateTime)
    started_at          = db.Column(db.DateTime)
    completed_at        = db.Column(db.DateTime)
    expires_at          = db.Column(db.DateTime)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSInterviewPanel(db.Model):
    __tablename__ = 'ats_interview_panels'
    id                  = db.Column(db.String(36), primary_key=True)
    tenant_id           = db.Column(db.String(36), nullable=False)
    application_id      = db.Column(db.String(36), db.ForeignKey('ats_applications.id'))
    candidate_id        = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'))
    job_id              = db.Column(db.String(36), db.ForeignKey('ats_jobs.id'))
    interview_type      = db.Column(db.String(50), default='Panel')
    # Technical | HR | Cultural | Final | Client
    platform            = db.Column(db.String(50), default='Google Meet')
    # Google Meet | Microsoft Teams | Zoom | In-Person
    meeting_link        = db.Column(db.String(500))
    scheduled_at        = db.Column(db.DateTime)
    duration_minutes    = db.Column(db.Integer, default=60)
    status              = db.Column(db.String(30), default='Scheduled')
    # Scheduled | Confirmed | Completed | Cancelled | Rescheduled
    notes               = db.Column(db.Text)
    overall_decision    = db.Column(db.String(30))  # Hire | No Hire | Hold
    calendar_event_id   = db.Column(db.String(200))  # Google/Outlook event ID
    invite_sent         = db.Column(db.Boolean, default=False)
    reminder_sent       = db.Column(db.Boolean, default=False)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    members             = db.relationship('ATSPanelMember', backref='panel', lazy=True)
    scorecards          = db.relationship('ATSScorecard', backref='panel', lazy=True)

    def to_dict(self):
        d = {c.name: (getattr(self, c.name).isoformat()
             if isinstance(getattr(self, c.name), datetime) else getattr(self, c.name))
             for c in self.__table__.columns}
        d['members']    = [m.to_dict() for m in self.members]
        d['scorecards'] = [s.to_dict() for s in self.scorecards]
        return d


class ATSPanelMember(db.Model):
    __tablename__ = 'ats_panel_members'
    id                  = db.Column(db.String(36), primary_key=True)
    panel_id            = db.Column(db.String(36), db.ForeignKey('ats_interview_panels.id'))
    interviewer_id      = db.Column(db.String(36))  # user id
    interviewer_name    = db.Column(db.String(200))
    interviewer_email   = db.Column(db.String(200))
    role                = db.Column(db.String(50), default='Interviewer')
    # Lead Interviewer | Technical Interviewer | HR | Observer
    calendar_rsvp       = db.Column(db.String(20))  # Accepted | Declined | Pending
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSScorecard(db.Model):
    __tablename__ = 'ats_scorecards'
    id                      = db.Column(db.String(36), primary_key=True)
    panel_id                = db.Column(db.String(36), db.ForeignKey('ats_interview_panels.id'))
    tenant_id               = db.Column(db.String(36))
    interviewer_id          = db.Column(db.String(36))
    interviewer_name        = db.Column(db.String(200))
    technical_score         = db.Column(db.Numeric(5,2), default=0)
    communication_score     = db.Column(db.Numeric(5,2), default=0)
    leadership_score        = db.Column(db.Numeric(5,2), default=0)
    culture_fit_score       = db.Column(db.Numeric(5,2), default=0)
    attitude_score          = db.Column(db.Numeric(5,2), default=0)
    total_score             = db.Column(db.Numeric(5,2), default=0)
    overall_recommendation  = db.Column(db.String(30))
    # Hire | No Hire | Hold | Strong Hire
    notes                   = db.Column(db.Text)
    strengths               = db.Column(db.Text)
    areas_of_improvement    = db.Column(db.Text)
    submitted_at            = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSOffer(db.Model):
    __tablename__ = 'ats_offers'
    id                  = db.Column(db.String(36), primary_key=True)
    tenant_id           = db.Column(db.String(36), nullable=False)
    application_id      = db.Column(db.String(36), db.ForeignKey('ats_applications.id'))
    candidate_id        = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'))
    job_id              = db.Column(db.String(36), db.ForeignKey('ats_jobs.id'))
    offered_salary      = db.Column(db.Numeric(12,2))
    salary_currency     = db.Column(db.String(10), default='NPR')
    joining_date        = db.Column(db.DateTime)
    offer_expiry        = db.Column(db.DateTime)
    benefits            = db.Column(db.Text)    # JSON
    letter_text         = db.Column(db.Text)    # Full offer letter HTML
    status              = db.Column(db.String(30), default='Draft')
    # Draft | Pending Approval | Sent | Accepted | Rejected | Counter | Expired | Withdrawn
    approval_status     = db.Column(db.String(30), default='Pending')
    approved_by         = db.Column(db.String(36))
    approved_at         = db.Column(db.DateTime)
    sent_at             = db.Column(db.DateTime)
    accepted_at         = db.Column(db.DateTime)
    signature_requested = db.Column(db.Boolean, default=False)
    candidate_signature = db.Column(db.Text)    # Digital signature string
    signed_at           = db.Column(db.DateTime)
    counter_salary      = db.Column(db.Numeric(12,2))
    counter_notes       = db.Column(db.Text)
    reminder_count      = db.Column(db.Integer, default=0)
    last_reminder_at    = db.Column(db.DateTime)
    notes               = db.Column(db.Text)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at          = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSTalentPool(db.Model):
    __tablename__ = 'ats_talent_pool'
    id              = db.Column(db.String(36), primary_key=True)
    tenant_id       = db.Column(db.String(36), nullable=False)
    candidate_id    = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'))
    tags            = db.Column(db.Text)   # JSON
    notes           = db.Column(db.Text)
    ai_score        = db.Column(db.Numeric(5,2))
    ai_rank         = db.Column(db.String(20))
    availability_status = db.Column(db.String(30), default='Passive')
    # Available | Passive | Not Looking
    last_contacted  = db.Column(db.DateTime)
    next_follow_up  = db.Column(db.DateTime)
    community       = db.Column(db.String(100))  # e.g. "Tech Talent", "Finance"
    added_at        = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSClient(db.Model):
    __tablename__ = 'ats_clients'
    id                      = db.Column(db.String(36), primary_key=True)
    tenant_id               = db.Column(db.String(36), nullable=False)
    name                    = db.Column(db.String(200), nullable=False)
    industry                = db.Column(db.String(100))
    contact_name            = db.Column(db.String(200))
    contact_email           = db.Column(db.String(200))
    contact_phone           = db.Column(db.String(50))
    address                 = db.Column(db.Text)
    portal_password_hash    = db.Column(db.String(200))
    logo_url                = db.Column(db.String(500))
    status                  = db.Column(db.String(20), default='Active')
    # Active | Inactive | Prospect
    notes                   = db.Column(db.Text)
    contract_start          = db.Column(db.Date)
    contract_end            = db.Column(db.Date)
    billing_rate            = db.Column(db.Numeric(12,2))
    created_at              = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at              = db.Column(db.DateTime, default=datetime.utcnow)

    jobs = db.relationship('ATSJob', backref='client', lazy=True)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else
                str(getattr(self, c.name)) if hasattr(getattr(self, c.name), '__class__')
                and getattr(self, c.name).__class__.__name__ == 'Decimal'
                else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSOnboarding(db.Model):
    __tablename__ = 'ats_onboarding'
    id                  = db.Column(db.String(36), primary_key=True)
    tenant_id           = db.Column(db.String(36), nullable=False)
    candidate_id        = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'))
    offer_id            = db.Column(db.String(36), db.ForeignKey('ats_offers.id'))
    application_id      = db.Column(db.String(36))
    employee_id         = db.Column(db.String(50), unique=True)
    role                = db.Column(db.String(200))
    department          = db.Column(db.String(100))
    joining_date        = db.Column(db.DateTime)
    manager_id          = db.Column(db.String(36))
    work_location       = db.Column(db.String(200))
    employment_type     = db.Column(db.String(50), default='Full-Time')
    # Document checklist
    documents           = db.Column(db.Text, default='{}')  # JSON {doc_type: {filename, uploaded_at}}
    docs_status         = db.Column(db.String(30), default='Pending')
    # BGV
    bgv_status          = db.Column(db.String(30), default='Pending')
    # Pending | In Progress | Cleared | Failed
    bgv_notes           = db.Column(db.Text)
    bgv_cleared_at      = db.Column(db.DateTime)
    # Onboarding tasks
    tasks_completed     = db.Column(db.Text, default='[]')  # JSON list
    status              = db.Column(db.String(30), default='Pre-Joining')
    # Pre-Joining | Ready to Join | Joined | Orientation | Active
    welcome_email_sent  = db.Column(db.Boolean, default=False)
    it_access_created   = db.Column(db.Boolean, default=False)
    buddy_assigned      = db.Column(db.String(36))
    orientation_date    = db.Column(db.DateTime)
    probation_end_date  = db.Column(db.DateTime)
    notes               = db.Column(db.Text)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at          = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSCommunicationLog(db.Model):
    __tablename__ = 'ats_communication_logs'
    id              = db.Column(db.String(36), primary_key=True)
    tenant_id       = db.Column(db.String(36), nullable=False)
    candidate_id    = db.Column(db.String(36), db.ForeignKey('ats_candidates.id'))
    application_id  = db.Column(db.String(36))
    channels        = db.Column(db.Text)   # JSON
    template        = db.Column(db.String(100))
    subject         = db.Column(db.String(300))
    body_preview    = db.Column(db.Text)
    status          = db.Column(db.String(30), default='Sent')
    # Sent | Delivered | Read | Failed | Bounced
    opened          = db.Column(db.Boolean, default=False)
    clicked         = db.Column(db.Boolean, default=False)
    replied         = db.Column(db.Boolean, default=False)
    sent_at         = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else getattr(self, c.name))
                for c in self.__table__.columns}


class ATSJobPlatformPost(db.Model):
    __tablename__ = 'ats_job_platform_posts'
    id              = db.Column(db.String(36), primary_key=True)
    job_id          = db.Column(db.String(36), db.ForeignKey('ats_jobs.id'))
    tenant_id       = db.Column(db.String(36))
    platform        = db.Column(db.String(100))
    # LinkedIn | Indeed | Naukri | Facebook | Google Jobs | MeroJob | JobAxle | Internal
    external_job_id = db.Column(db.String(200))  # ID from the platform
    post_url        = db.Column(db.String(500))
    status          = db.Column(db.String(30), default='Pending')
    # Pending | Published | Failed | Expired | Removed
    applications_count = db.Column(db.Integer, default=0)
    views_count     = db.Column(db.Integer, default=0)
    published_at    = db.Column(db.DateTime)
    expires_at      = db.Column(db.DateTime)
    error_message   = db.Column(db.Text)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {c.name: (getattr(self, c.name).isoformat()
                if isinstance(getattr(self, c.name), datetime) else getattr(self, c.name))
                for c in self.__table__.columns}
