-- FILE: database/schemas/ats_schema.sql
-- World-Class AI-Powered ATS — Complete PostgreSQL Schema
-- All 12 modules: Jobs, Candidates, Applications, Resume Parse,
-- Assessments, Video, Panels, Offers, Talent Pool, Clients, Onboarding, Comms

-- ═══════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for full-text search

-- ═══════════════════════════════════════════════════════
-- 1. CLIENTS (Recruitment Agency: Client Companies)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_clients (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    industry                VARCHAR(100),
    contact_name            VARCHAR(200),
    contact_email           VARCHAR(200),
    contact_phone           VARCHAR(50),
    address                 TEXT,
    portal_password_hash    VARCHAR(200),
    logo_url                VARCHAR(500),
    status                  VARCHAR(20) DEFAULT 'Active',  -- Active | Inactive | Prospect
    notes                   TEXT,
    contract_start          DATE,
    contract_end            DATE,
    billing_rate            NUMERIC(12,2),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_clients_tenant ON ats_clients(tenant_id);

-- ═══════════════════════════════════════════════════════
-- 2. JOBS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_jobs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    title                   VARCHAR(200) NOT NULL,
    job_code                VARCHAR(50),
    department              VARCHAR(100),
    division                VARCHAR(100),
    location                VARCHAR(200),
    job_type                VARCHAR(50) DEFAULT 'Full-Time',
    experience_level        VARCHAR(50),
    min_experience_years    INTEGER DEFAULT 0,
    max_experience_years    INTEGER,
    education_required      VARCHAR(100),
    salary_min              NUMERIC(12,2),
    salary_max              NUMERIC(12,2),
    salary_currency         VARCHAR(10) DEFAULT 'NPR',
    salary_visible          BOOLEAN DEFAULT FALSE,
    skills_required         JSONB,                          -- []
    skills_preferred        JSONB,                          -- []
    certifications          JSONB,
    jd_text                 TEXT,
    responsibilities        TEXT,
    qualifications          TEXT,
    openings                INTEGER DEFAULT 1,
    filled                  INTEGER DEFAULT 0,
    priority                VARCHAR(20) DEFAULT 'Medium',   -- Low | Medium | High | Urgent
    status                  VARCHAR(30) DEFAULT 'Draft',
    -- Draft | Pending Approval | Published | Paused | Closed
    approval_status         VARCHAR(30) DEFAULT 'Pending',
    approved_by             UUID,
    approved_at             TIMESTAMPTZ,
    deadline                TIMESTAMPTZ,
    published_at            TIMESTAMPTZ,
    closed_at               TIMESTAMPTZ,
    is_internal             BOOLEAN DEFAULT FALSE,
    is_active               BOOLEAN DEFAULT TRUE,
    client_id               UUID REFERENCES ats_clients(id),
    created_by              UUID,
    assigned_recruiter      UUID,
    hiring_manager          UUID,
    budget_approved         BOOLEAN DEFAULT FALSE,
    budget_amount           NUMERIC(12,2),
    tags                    JSONB,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_jobs_tenant ON ats_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_jobs_status ON ats_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ats_jobs_dept ON ats_jobs(department);
CREATE INDEX IF NOT EXISTS idx_ats_jobs_active ON ats_jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_ats_jobs_title_trgm ON ats_jobs USING gin(title gin_trgm_ops);

-- ═══════════════════════════════════════════════════════
-- 3. JOB PLATFORM POSTS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_job_platform_posts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id              UUID REFERENCES ats_jobs(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL,
    platform            VARCHAR(100) NOT NULL,
    -- LinkedIn | Indeed | Naukri | Facebook | Google Jobs | MeroJob | JobAxle | Glassdoor | Internal
    external_job_id     VARCHAR(200),
    post_url            VARCHAR(500),
    status              VARCHAR(30) DEFAULT 'Pending',
    -- Pending | Published | Failed | Expired | Removed
    applications_count  INTEGER DEFAULT 0,
    views_count         INTEGER DEFAULT 0,
    published_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    error_message       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_jpp_job ON ats_job_platform_posts(job_id);
CREATE INDEX IF NOT EXISTS idx_ats_jpp_platform ON ats_job_platform_posts(platform);

-- ═══════════════════════════════════════════════════════
-- 4. CANDIDATES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_candidates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    candidate_code      VARCHAR(30) UNIQUE,
    full_name           VARCHAR(200),
    email               VARCHAR(200),
    phone               VARCHAR(30),
    whatsapp            VARCHAR(30),
    current_role        VARCHAR(200),
    current_company     VARCHAR(200),
    total_experience    NUMERIC(4,1),
    current_salary      NUMERIC(12,2),
    expected_salary     NUMERIC(12,2),
    notice_period_days  INTEGER,
    location            VARCHAR(200),
    nationality         VARCHAR(100),
    gender              VARCHAR(20),
    dob                 DATE,
    education           JSONB,          -- [{degree, institution, year, grade}]
    skills              JSONB,          -- ["Python","React",...]
    certifications      JSONB,
    languages           JSONB,
    work_experience     JSONB,          -- [{company,role,duration_years,description}]
    linkedin_url        VARCHAR(300),
    portfolio_url       VARCHAR(300),
    github_url          VARCHAR(300),
    resume_filename     VARCHAR(300),
    resume_url          VARCHAR(500),
    parse_status        VARCHAR(30) DEFAULT 'pending',
    -- pending | processing | done | failed
    ai_score            NUMERIC(5,2) DEFAULT 0,
    ai_rank             VARCHAR(20),    -- Gold | Silver | Bronze | Reject
    ai_summary          TEXT,
    source              VARCHAR(100),
    -- LinkedIn | Indeed | Portal | Referral | WhatsApp | Email | Facebook | Naukri
    is_duplicate        BOOLEAN DEFAULT FALSE,
    duplicate_of        UUID REFERENCES ats_candidates(id),
    blacklisted         BOOLEAN DEFAULT FALSE,
    gdpr_consent        BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_cands_tenant ON ats_candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_cands_email ON ats_candidates(email);
CREATE INDEX IF NOT EXISTS idx_ats_cands_rank ON ats_candidates(ai_rank);
CREATE INDEX IF NOT EXISTS idx_ats_cands_score ON ats_candidates(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_ats_cands_name_trgm ON ats_candidates USING gin(full_name gin_trgm_ops);

-- ═══════════════════════════════════════════════════════
-- 5. RESUME PARSE RECORDS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_resume_parses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id        UUID REFERENCES ats_candidates(id) ON DELETE CASCADE,
    raw_text            TEXT,
    parsed_name         VARCHAR(200),
    parsed_email        VARCHAR(200),
    parsed_phone        VARCHAR(50),
    parsed_skills       JSONB,
    parsed_education    JSONB,
    parsed_experience   JSONB,
    parsed_certifications JSONB,
    parsed_languages    JSONB,
    parsed_location     VARCHAR(200),
    total_years_exp     NUMERIC(4,1),
    ai_summary          TEXT,
    confidence_score    NUMERIC(5,2),
    parsed_at           TIMESTAMPTZ DEFAULT NOW(),
    parse_engine        VARCHAR(50) DEFAULT 'claude-ai'
);
CREATE INDEX IF NOT EXISTS idx_ats_resume_cand ON ats_resume_parses(candidate_id);

-- ═══════════════════════════════════════════════════════
-- 6. APPLICATIONS (Pipeline)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_applications (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    candidate_id            UUID REFERENCES ats_candidates(id),
    job_id                  UUID REFERENCES ats_jobs(id),
    stage                   VARCHAR(50) DEFAULT 'Applied',
    -- Applied | AI Screening | HR Screening | Hiring Manager Review |
    -- Technical Assessment | Video Interview | Interview | Final Interview |
    -- Offer | Background Check | Hired | Rejected | Talent Pool
    source                  VARCHAR(100),
    cover_letter            TEXT,
    ai_score                NUMERIC(5,2) DEFAULT 0,
    ai_rank                 VARCHAR(20),
    ai_match_detail         JSONB,
    written_test_score      NUMERIC(5,2),
    video_interview_score   NUMERIC(5,2),
    panel_score             NUMERIC(5,2),
    hr_rating               SMALLINT CHECK (hr_rating BETWEEN 1 AND 5),
    hr_notes                TEXT,
    hiring_manager_rating   SMALLINT CHECK (hiring_manager_rating BETWEEN 1 AND 5),
    hiring_manager_notes    TEXT,
    shared_with_client      BOOLEAN DEFAULT FALSE,
    client_id               UUID REFERENCES ats_clients(id),
    client_decision         VARCHAR(30),
    client_feedback         TEXT,
    applied_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    rejected_reason         TEXT,
    rejection_email_sent    BOOLEAN DEFAULT FALSE,
    UNIQUE (candidate_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_ats_apps_tenant ON ats_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_apps_stage ON ats_applications(stage);
CREATE INDEX IF NOT EXISTS idx_ats_apps_job ON ats_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_ats_apps_candidate ON ats_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ats_apps_score ON ats_applications(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_ats_apps_applied_at ON ats_applications(applied_at);

-- ═══════════════════════════════════════════════════════
-- 7. ASSESSMENTS (Written Tests)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_assessments (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    job_id                  UUID REFERENCES ats_jobs(id),
    description             TEXT,
    instructions            TEXT,
    duration_minutes        INTEGER DEFAULT 60,
    pass_score              INTEGER DEFAULT 60,
    total_marks             INTEGER DEFAULT 100,
    negative_marking        BOOLEAN DEFAULT FALSE,
    negative_mark_value     NUMERIC(3,2) DEFAULT 0.25,
    randomize_questions     BOOLEAN DEFAULT TRUE,
    proctoring_enabled      BOOLEAN DEFAULT FALSE,
    webcam_required         BOOLEAN DEFAULT FALSE,
    status                  VARCHAR(20) DEFAULT 'Draft',    -- Draft | Active | Archived
    link_token              VARCHAR(64) UNIQUE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ats_questions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id           UUID REFERENCES ats_assessments(id) ON DELETE CASCADE,
    tenant_id               UUID,
    question_type           VARCHAR(30),                    -- mcq | coding | essay | psychometric | true_false
    question_text           TEXT NOT NULL,
    options                 JSONB,                          -- for MCQ: ["A","B","C","D"]
    correct_answer          TEXT,
    marks                   INTEGER DEFAULT 5,
    difficulty              VARCHAR(20) DEFAULT 'Medium',
    topic                   VARCHAR(100),
    ai_evaluation_rubric    TEXT,
    time_limit_seconds      INTEGER,
    "order"                 INTEGER DEFAULT 0,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_q_assessment ON ats_questions(assessment_id);

CREATE TABLE IF NOT EXISTS ats_submissions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id           UUID REFERENCES ats_assessments(id),
    candidate_id            UUID REFERENCES ats_candidates(id),
    application_id          UUID,
    answers                 JSONB,                          -- [{question_id, answer}]
    mcq_score               NUMERIC(5,2) DEFAULT 0,
    coding_score            NUMERIC(5,2) DEFAULT 0,
    essay_score             NUMERIC(5,2) DEFAULT 0,
    psychometric_score      NUMERIC(5,2) DEFAULT 0,
    overall_score           NUMERIC(5,2) DEFAULT 0,
    grade                   VARCHAR(5),
    ai_feedback             TEXT,
    ai_recommendation       VARCHAR(50),
    status                  VARCHAR(30) DEFAULT 'pending_evaluation',
    time_taken_seconds      INTEGER,
    started_at              TIMESTAMPTZ,
    submitted_at            TIMESTAMPTZ DEFAULT NOW(),
    evaluated_at            TIMESTAMPTZ,
    proctoring_flags        JSONB
);
CREATE INDEX IF NOT EXISTS idx_ats_sub_assessment ON ats_submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_ats_sub_candidate ON ats_submissions(candidate_id);

-- ═══════════════════════════════════════════════════════
-- 8. VIDEO INTERVIEWS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_video_interviews (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    job_id                  UUID REFERENCES ats_jobs(id),
    candidate_id            UUID REFERENCES ats_candidates(id),
    application_id          UUID,
    questions               JSONB,
    time_limit              INTEGER DEFAULT 30,
    interview_link          VARCHAR(300) UNIQUE,
    status                  VARCHAR(30) DEFAULT 'Scheduled',
    -- Scheduled | In Progress | Completed | Expired
    recording_url           VARCHAR(500),
    transcript              TEXT,
    ai_analysis             JSONB,
    ai_summary              TEXT,
    ai_recommendation       VARCHAR(50),
    confidence_score        NUMERIC(5,2),
    clarity_score           NUMERIC(5,2),
    eye_contact_score       NUMERIC(5,2),
    voice_stability         NUMERIC(5,2),
    keyword_hits            JSONB,
    overall_score           NUMERIC(5,2),
    invite_sent_at          TIMESTAMPTZ,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_vi_tenant ON ats_video_interviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_vi_candidate ON ats_video_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ats_vi_status ON ats_video_interviews(status);

-- ═══════════════════════════════════════════════════════
-- 9. INTERVIEW PANELS & SCORECARDS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_interview_panels (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    application_id          UUID REFERENCES ats_applications(id),
    candidate_id            UUID REFERENCES ats_candidates(id),
    job_id                  UUID REFERENCES ats_jobs(id),
    interview_type          VARCHAR(50) DEFAULT 'Panel',
    -- Technical | HR | Cultural | Final | Client
    platform                VARCHAR(50) DEFAULT 'Google Meet',
    -- Google Meet | Microsoft Teams | Zoom | In-Person
    meeting_link            VARCHAR(500),
    scheduled_at            TIMESTAMPTZ,
    duration_minutes        INTEGER DEFAULT 60,
    status                  VARCHAR(30) DEFAULT 'Scheduled',
    -- Scheduled | Confirmed | Completed | Cancelled | Rescheduled
    notes                   TEXT,
    overall_decision        VARCHAR(30),                    -- Hire | No Hire | Hold
    calendar_event_id       VARCHAR(200),
    invite_sent             BOOLEAN DEFAULT FALSE,
    reminder_sent           BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_panels_tenant ON ats_interview_panels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_panels_candidate ON ats_interview_panels(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ats_panels_date ON ats_interview_panels(scheduled_at);

CREATE TABLE IF NOT EXISTS ats_panel_members (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    panel_id            UUID REFERENCES ats_interview_panels(id) ON DELETE CASCADE,
    interviewer_id      UUID,
    interviewer_name    VARCHAR(200),
    interviewer_email   VARCHAR(200),
    role                VARCHAR(50) DEFAULT 'Interviewer',
    -- Lead Interviewer | Technical Interviewer | HR | Observer
    calendar_rsvp       VARCHAR(20) DEFAULT 'Pending',      -- Accepted | Declined | Pending
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_members_panel ON ats_panel_members(panel_id);

CREATE TABLE IF NOT EXISTS ats_scorecards (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    panel_id                UUID REFERENCES ats_interview_panels(id),
    tenant_id               UUID,
    interviewer_id          UUID,
    interviewer_name        VARCHAR(200),
    technical_score         NUMERIC(5,2) DEFAULT 0,         -- out of 100
    communication_score     NUMERIC(5,2) DEFAULT 0,
    leadership_score        NUMERIC(5,2) DEFAULT 0,
    culture_fit_score       NUMERIC(5,2) DEFAULT 0,
    attitude_score          NUMERIC(5,2) DEFAULT 0,
    total_score             NUMERIC(5,2) DEFAULT 0,         -- weighted average
    overall_recommendation  VARCHAR(30),
    -- Hire | No Hire | Hold | Strong Hire
    notes                   TEXT,
    strengths               TEXT,
    areas_of_improvement    TEXT,
    submitted_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_scorecards_panel ON ats_scorecards(panel_id);

-- ═══════════════════════════════════════════════════════
-- 10. OFFERS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_offers (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    application_id          UUID REFERENCES ats_applications(id),
    candidate_id            UUID REFERENCES ats_candidates(id),
    job_id                  UUID REFERENCES ats_jobs(id),
    offered_salary          NUMERIC(12,2),
    salary_currency         VARCHAR(10) DEFAULT 'NPR',
    joining_date            TIMESTAMPTZ,
    offer_expiry            TIMESTAMPTZ,
    benefits                JSONB,
    letter_text             TEXT,                           -- Full offer letter HTML
    status                  VARCHAR(30) DEFAULT 'Draft',
    -- Draft | Pending Approval | Sent | Accepted | Rejected | Counter | Expired | Withdrawn
    approval_status         VARCHAR(30) DEFAULT 'Pending',
    approved_by             UUID,
    approved_at             TIMESTAMPTZ,
    sent_at                 TIMESTAMPTZ,
    accepted_at             TIMESTAMPTZ,
    signature_requested     BOOLEAN DEFAULT FALSE,
    candidate_signature     TEXT,
    signed_at               TIMESTAMPTZ,
    counter_salary          NUMERIC(12,2),
    counter_notes           TEXT,
    reminder_count          INTEGER DEFAULT 0,
    last_reminder_at        TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_offers_tenant ON ats_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_offers_status ON ats_offers(status);
CREATE INDEX IF NOT EXISTS idx_ats_offers_candidate ON ats_offers(candidate_id);

-- ═══════════════════════════════════════════════════════
-- 11. TALENT POOL
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_talent_pool (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    candidate_id            UUID REFERENCES ats_candidates(id),
    tags                    JSONB,
    notes                   TEXT,
    ai_score                NUMERIC(5,2),
    ai_rank                 VARCHAR(20),
    availability_status     VARCHAR(30) DEFAULT 'Passive',
    -- Available | Passive | Not Looking
    last_contacted          TIMESTAMPTZ,
    next_follow_up          TIMESTAMPTZ,
    community               VARCHAR(100),
    added_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS idx_ats_tp_tenant ON ats_talent_pool(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_tp_rank ON ats_talent_pool(ai_rank);
CREATE INDEX IF NOT EXISTS idx_ats_tp_status ON ats_talent_pool(availability_status);

-- ═══════════════════════════════════════════════════════
-- 12. ONBOARDING
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_onboarding (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    candidate_id            UUID REFERENCES ats_candidates(id),
    offer_id                UUID REFERENCES ats_offers(id),
    application_id          UUID,
    employee_id             VARCHAR(50) UNIQUE,
    role                    VARCHAR(200),
    department              VARCHAR(100),
    joining_date            TIMESTAMPTZ,
    manager_id              UUID,
    work_location           VARCHAR(200),
    employment_type         VARCHAR(50) DEFAULT 'Full-Time',
    documents               JSONB DEFAULT '{}',
    docs_status             VARCHAR(30) DEFAULT 'Pending',
    bgv_status              VARCHAR(30) DEFAULT 'Pending',
    -- Pending | In Progress | Cleared | Failed
    bgv_notes               TEXT,
    bgv_cleared_at          TIMESTAMPTZ,
    tasks_completed         JSONB DEFAULT '[]',
    status                  VARCHAR(30) DEFAULT 'Pre-Joining',
    -- Pre-Joining | Ready to Join | Joined | Orientation | Active
    welcome_email_sent      BOOLEAN DEFAULT FALSE,
    it_access_created       BOOLEAN DEFAULT FALSE,
    buddy_assigned          UUID,
    orientation_date        TIMESTAMPTZ,
    probation_end_date      TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_onboard_tenant ON ats_onboarding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_onboard_status ON ats_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_ats_onboard_joining ON ats_onboarding(joining_date);

-- ═══════════════════════════════════════════════════════
-- 13. COMMUNICATION LOGS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ats_communication_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    candidate_id    UUID REFERENCES ats_candidates(id),
    application_id  UUID,
    channels        JSONB,                                  -- ["email","whatsapp"]
    template        VARCHAR(100),
    subject         VARCHAR(300),
    body_preview    TEXT,
    status          VARCHAR(30) DEFAULT 'Sent',
    -- Sent | Delivered | Read | Failed | Bounced
    opened          BOOLEAN DEFAULT FALSE,
    clicked         BOOLEAN DEFAULT FALSE,
    replied         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ats_comms_tenant ON ats_communication_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ats_comms_candidate ON ats_communication_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ats_comms_sent ON ats_communication_logs(sent_at);

-- ═══════════════════════════════════════════════════════
-- TRIGGERS: auto-update updated_at
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_ats_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN FOR t IN SELECT unnest(ARRAY[
    'ats_clients','ats_jobs','ats_candidates','ats_applications',
    'ats_offers','ats_talent_pool','ats_onboarding'
])
LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_ats_%s_updated ON %s', t, t);
    EXECUTE format('CREATE TRIGGER trg_ats_%s_updated BEFORE UPDATE ON %s
                    FOR EACH ROW EXECUTE FUNCTION update_ats_updated_at()', t, t);
END LOOP; END $$;

-- ═══════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_ats_pipeline_summary AS
SELECT
    j.tenant_id,
    j.id AS job_id,
    j.title AS job_title,
    j.department,
    j.status AS job_status,
    COUNT(a.id) AS total_applications,
    COUNT(CASE WHEN a.stage = 'Applied'              THEN 1 END) AS applied,
    COUNT(CASE WHEN a.stage = 'AI Screening'         THEN 1 END) AS ai_screened,
    COUNT(CASE WHEN a.stage = 'HR Screening'         THEN 1 END) AS hr_screened,
    COUNT(CASE WHEN a.stage = 'Technical Assessment' THEN 1 END) AS assessed,
    COUNT(CASE WHEN a.stage = 'Video Interview'      THEN 1 END) AS video_done,
    COUNT(CASE WHEN a.stage = 'Interview'            THEN 1 END) AS interviewed,
    COUNT(CASE WHEN a.stage = 'Offer'                THEN 1 END) AS offered,
    COUNT(CASE WHEN a.stage = 'Hired'                THEN 1 END) AS hired,
    COUNT(CASE WHEN a.stage = 'Rejected'             THEN 1 END) AS rejected,
    AVG(a.ai_score) AS avg_ai_score,
    COUNT(CASE WHEN a.ai_rank = 'Gold'   THEN 1 END) AS gold_candidates,
    COUNT(CASE WHEN a.ai_rank = 'Silver' THEN 1 END) AS silver_candidates
FROM ats_jobs j
LEFT JOIN ats_applications a ON a.job_id = j.id
GROUP BY j.tenant_id, j.id, j.title, j.department, j.status;

CREATE OR REPLACE VIEW v_ats_recruiter_performance AS
SELECT
    j.tenant_id,
    j.created_by AS recruiter_id,
    COUNT(DISTINCT j.id)                              AS jobs_created,
    COUNT(DISTINCT a.id)                              AS total_applications,
    COUNT(DISTINCT CASE WHEN a.stage = 'Hired' THEN a.candidate_id END) AS hires,
    ROUND(AVG(EXTRACT(DAY FROM (a.updated_at - a.applied_at)))
          FILTER (WHERE a.stage = 'Hired'), 1)        AS avg_tth_days
FROM ats_jobs j
LEFT JOIN ats_applications a ON a.job_id = j.id
GROUP BY j.tenant_id, j.created_by;

-- ═══════════════════════════════════════════════════════
-- SEED: Sample Data for Demo
-- ═══════════════════════════════════════════════════════
INSERT INTO ats_clients (id, tenant_id, name, industry, contact_name, contact_email, status)
VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'TechCorp Nepal Pvt Ltd', 'Technology',
   'Ramesh Koirala', 'ramesh@techcorp.com.np', 'Active'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Himalayan Bank Ltd', 'Banking',
   'Sunita Shrestha', 'sunita@himbank.com.np', 'Active'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Ncell Axiata', 'Telecom',
   'Dev Maharjan', 'dev@ncell.com.np', 'Active')
ON CONFLICT DO NOTHING;
