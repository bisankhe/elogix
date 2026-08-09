-- ================================================================
-- FILE: database/schemas/recruitment_schema.sql
-- NepHR Pro — Complete Recruitment & Hiring Module Schema
-- Covers all 16 Recruitment pages:
--   1. job_requisitions          (Manpower Requisition)
--   2. vacancies                 (Vacancy Management)
--   3. job_postings              (Job Posting + Career Portal)
--   4. candidates                (Candidate Database / Talent Pool)
--   5. applications              (ATS pipeline — links candidate to vacancy)
--   6. resume_screening_results  (AI screening scores)
--   7. interviews                (Interview Scheduling)
--   8. interview_panel_members   (Panel Notification)
--   9. interview_scorecards      (Interview Management)
--   10. offers                  (Offer Management)
--   11. background_checks        (Background Verification)
--   12. hiring_approvals         (Hiring Approval Workflow)
-- Nepal Labour Act 2074 Sections 6,7,11,13,22,23 enforced.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- 1. JOB REQUISITIONS (Manpower Requisition / JRF)
-- ================================================================
CREATE TABLE IF NOT EXISTS job_requisitions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    jrf_no                 VARCHAR(50)  NOT NULL,
    position_title         VARCHAR(200) NOT NULL,
    department_id          UUID,
    branch_id              UUID,
    grade_level_id         UUID,
    employment_type        VARCHAR(30)  DEFAULT 'regular'
                           CHECK (employment_type IN ('regular','time_bound','work_based','part_time','casual')),

    headcount_requested    INT          NOT NULL DEFAULT 1,
    reason                 VARCHAR(50)  DEFAULT 'new_position'
                           CHECK (reason IN ('new_position','replacement','expansion','project_based')),
    justification          TEXT,

    -- Budget validation
    approved_salary_min_npr NUMERIC(12,2),
    approved_salary_max_npr NUMERIC(12,2),
    budget_verified         BOOLEAN     DEFAULT FALSE,
    budget_available_npr    NUMERIC(15,2),

    -- Approval chain (Dept Head -> Finance -> HR -> CEO)
    requested_by           UUID,
    requested_date         DATE         DEFAULT CURRENT_DATE,
    approval_chain          JSONB       DEFAULT '[]',
    -- e.g [{"role":"Dept Head","name":"..","status":"approved","date":".."}, ...]
    current_approval_stage VARCHAR(50)  DEFAULT 'dept_head',
    status                 VARCHAR(30)  DEFAULT 'pending'
                           CHECK (status IN ('draft','pending','approved','rejected','on_hold','converted_to_vacancy')),

    target_fill_date       DATE,

    -- AI
    ai_score               FLOAT        DEFAULT 0,
    ai_recommendation      TEXT,

    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    created_by             UUID,
    is_deleted             BOOLEAN      DEFAULT FALSE,

    UNIQUE (company_id, jrf_no)
);

-- ================================================================
-- 2. VACANCIES (links to JRF, tracks pipeline stats)
-- ================================================================
CREATE TABLE IF NOT EXISTS vacancies (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    requisition_id         UUID         REFERENCES job_requisitions(id),

    title                  VARCHAR(200) NOT NULL,
    department_id          UUID,
    branch_id              UUID,
    grade_level_id         UUID,
    employment_type        VARCHAR(30)  DEFAULT 'regular',

    salary_range_min_npr   NUMERIC(12,2),
    salary_range_max_npr   NUMERIC(12,2),

    approved_by            UUID,
    approved_date          DATE,
    target_fill_date       DATE,
    days_open              INT GENERATED ALWAYS AS (
                             (CURRENT_DATE - approved_date)
                           ) STORED,
    time_to_fill_target_days INT          DEFAULT 45,

    priority                VARCHAR(20)  DEFAULT 'medium'
                            CHECK (priority IN ('critical','high','medium','low')),
    status                  VARCHAR(20)  DEFAULT 'new'
                            CHECK (status IN ('new','active','overdue','filled','onhold','cancelled')),

    -- Nepal LA2074 Section 11 compliance — mandatory advertisement
    la_advertised_newspaper BOOLEAN     DEFAULT FALSE,
    la_newspaper_name       VARCHAR(200),
    la_advertised_date      DATE,
    moless_portal_posted    BOOLEAN     DEFAULT FALSE,
    moless_posted_date      DATE,
    moless_reference_no     VARCHAR(100),

    -- Foreign hiring (Sections 22 & 23)
    foreign_hire_requested  BOOLEAN     DEFAULT FALSE,
    foreign_hire_justification TEXT,
    work_permit_status      VARCHAR(30),

    -- Counters (denormalized for fast dashboard)
    applications_count      INT         DEFAULT 0,
    shortlisted_count        INT        DEFAULT 0,
    interviewed_count        INT        DEFAULT 0,

    -- AI
    ai_score                FLOAT       DEFAULT 0,
    ai_note                 TEXT,

    jrf_raised               BOOLEAN    DEFAULT FALSE,
    jrf_no                    VARCHAR(50),

    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW(),
    created_by                UUID,
    is_deleted                 BOOLEAN   DEFAULT FALSE
);

-- ================================================================
-- 3. JOB POSTINGS (multi-channel distribution + Career Portal)
-- ================================================================
CREATE TABLE IF NOT EXISTS job_postings (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vacancy_id             UUID         REFERENCES vacancies(id),

    title                  VARCHAR(200) NOT NULL,
    description            TEXT,
    location               VARCHAR(200),
    employment_type        VARCHAR(30),
    remote_type             VARCHAR(30) DEFAULT 'on_site'
                            CHECK (remote_type IN ('on_site','hybrid','remote_friendly')),
    salary_range_display   VARCHAR(100),
    experience_required    VARCHAR(100),

    -- Multi-channel boards
    boards                  JSONB       DEFAULT '[]', -- ["moless","linkedin","merojob","newspaper",...]
    is_featured             BOOLEAN     DEFAULT FALSE,

    -- AI
    ai_generated_jd         BOOLEAN     DEFAULT FALSE,
    ai_bias_score           FLOAT,
    ai_bias_flags           JSONB       DEFAULT '[]',

    -- Performance metrics
    views_count             INT         DEFAULT 0,
    clicks_count            INT         DEFAULT 0,
    applications_count      INT         DEFAULT 0,

    published_date          DATE,
    expiry_date              DATE,
    status                   VARCHAR(20) DEFAULT 'draft'
                             CHECK (status IN ('draft','live','closed','paused')),

    -- Nepal LA2074 compliance
    la_compliant             BOOLEAN     DEFAULT FALSE,
    eeo_disclaimer_included  BOOLEAN     DEFAULT TRUE,

    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW(),
    created_by                 UUID,
    is_deleted                  BOOLEAN  DEFAULT FALSE
);

-- ================================================================
-- 4. CANDIDATES (Candidate Database / Talent Pool — CRM)
-- ================================================================
CREATE TABLE IF NOT EXISTS candidates (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    code                   VARCHAR(30)  NOT NULL,  -- CAND-001
    full_name              VARCHAR(200) NOT NULL,
    email                  VARCHAR(255) NOT NULL,
    phone                  VARCHAR(50),
    city                   VARCHAR(100),
    linkedin_url           VARCHAR(255),

    current_role           VARCHAR(200),
    current_company        VARCHAR(200),
    total_exp_years        FLOAT,
    education              VARCHAR(200),
    notice_period_days     INT,

    -- Resume
    resume_url             VARCHAR(500),
    resume_parsed_data     JSONB        DEFAULT '{}',
    skills                  JSONB       DEFAULT '[]',  -- ["React","Python",...]

    -- Source & tagging
    source                  VARCHAR(50) DEFAULT 'direct'
                            CHECK (source IN ('linkedin','merojob','kumarijob','jobsnepal','referral','direct','newspaper','career_portal','agency')),
    tags                    JSONB       DEFAULT '[]',  -- ["Top Talent","Passive","Shortlisted"]

    -- Talent pool status
    status                  VARCHAR(30)  DEFAULT 'active'
                            CHECK (status IN ('active','pool','blacklisted','hired','withdrawn')),
    pool_added_date         DATE,
    last_activity_date      DATE         DEFAULT CURRENT_DATE,
    last_engagement_sent    TIMESTAMPTZ,

    -- AI
    ai_score                 FLOAT       DEFAULT 0,
    ai_profile_summary        TEXT,

    -- Privacy / GDPR / Nepal Individual Privacy Act
    consent_given            BOOLEAN     DEFAULT FALSE,
    consent_date              TIMESTAMPTZ,
    data_retention_expiry     DATE,  -- auto-purge date
    is_anonymized              BOOLEAN  DEFAULT FALSE,

    duplicate_of_candidate_id UUID REFERENCES candidates(id),  -- de-dup tracking

    -- Full text search
    search_vector            TSVECTOR GENERATED ALWAYS AS (
                              to_tsvector('english',
                                COALESCE(full_name,'') || ' ' ||
                                COALESCE(current_role,'') || ' ' ||
                                COALESCE(skills::TEXT,''))
                            ) STORED,

    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ DEFAULT NOW(),
    created_by                  UUID,
    is_deleted                   BOOLEAN  DEFAULT FALSE,

    UNIQUE (company_id, code),
    UNIQUE (company_id, email)
);

-- ================================================================
-- 5. APPLICATIONS (ATS pipeline — links candidate <-> vacancy)
-- ================================================================
CREATE TABLE IF NOT EXISTS applications (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    candidate_id           UUID         NOT NULL REFERENCES candidates(id),
    vacancy_id              UUID        NOT NULL REFERENCES vacancies(id),
    job_posting_id           UUID       REFERENCES job_postings(id),

    code                    VARCHAR(30) NOT NULL,  -- APP-001

    -- ATS Kanban stage
    stage                    VARCHAR(30) DEFAULT 'applied'
                             CHECK (stage IN ('applied','screening','written','video',
                               'panel','offer','hired','rejected','withdrawn')),
    stage_history            JSONB      DEFAULT '[]',
    -- [{"stage":"applied","date":"..","by":".."}, ...]

    applied_date              DATE       DEFAULT CURRENT_DATE,
    applied_via                VARCHAR(30) DEFAULT 'career_portal',

    -- Knockout questions (auto-reject)
    knockout_passed           BOOLEAN    DEFAULT TRUE,
    knockout_failures          JSONB     DEFAULT '[]',

    -- Score aggregation
    cv_match_score             FLOAT,
    written_exam_score          FLOAT,
    video_interview_score        FLOAT,
    panel_avg_score               FLOAT,
    overall_score                  FLOAT,

    rejection_reason             TEXT,
    rejected_at                    TIMESTAMPTZ,
    rejected_by                     UUID,

    created_at                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                        TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                         BOOLEAN DEFAULT FALSE,

    UNIQUE (company_id, code),
    UNIQUE (candidate_id, vacancy_id)
);

-- ================================================================
-- 6. RESUME SCREENING RESULTS (AI screening detail)
-- ================================================================
CREATE TABLE IF NOT EXISTS resume_screening_results (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id         UUID         NOT NULL REFERENCES applications(id),
    company_id              UUID        NOT NULL,

    ai_match_pct            FLOAT,
    skill_match_pct          FLOAT,
    experience_match_pct      FLOAT,
    education_match_pct        FLOAT,

    skills_matched            JSONB     DEFAULT '[]',
    skills_missing              JSONB   DEFAULT '[]',

    fraud_risk_score             FLOAT  DEFAULT 0,
    fraud_flags                    JSONB DEFAULT '[]',

    blind_screening_applied         BOOLEAN DEFAULT FALSE,

    ai_recommendation                TEXT,
    screened_at                       TIMESTAMPTZ DEFAULT NOW(),
    screened_by_ai_model               VARCHAR(50) DEFAULT 'claude-sonnet-4-6'
);

-- ================================================================
-- 7. INTERVIEWS (Interview Scheduling)
-- ================================================================
CREATE TABLE IF NOT EXISTS interviews (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    application_id          UUID        NOT NULL REFERENCES applications(id),

    round_type               VARCHAR(30) DEFAULT 'technical'
                             CHECK (round_type IN ('hr_screening','technical','panel','final','video','written')),
    scheduled_date            DATE,
    scheduled_time              TIME,
    duration_minutes              INT  DEFAULT 60,
    mode                            VARCHAR(30) DEFAULT 'video'
                                    CHECK (mode IN ('video','in_person','phone')),
    meeting_link                     VARCHAR(255),
    location                          VARCHAR(200),

    status                              VARCHAR(30) DEFAULT 'pending_candidate'
                                        CHECK (status IN ('pending_candidate','confirmed','completed','cancelled','no_show','rescheduled')),

    -- Self-scheduling
    self_schedule_link                  VARCHAR(255),
    self_schedule_token                   VARCHAR(100),
    candidate_confirmed_at                TIMESTAMPTZ,

    -- Notification tracking
    packet_sent                            BOOLEAN DEFAULT FALSE,
    packet_sent_at                          TIMESTAMPTZ,
    reminder_sent                            BOOLEAN DEFAULT FALSE,
    reminder_sent_at                          TIMESTAMPTZ,

    -- Recording / AI transcription
    recording_url                              VARCHAR(500),
    transcription_text                          TEXT,
    ai_conversation_analysis                     JSONB DEFAULT '{}',

    created_at                                    TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                     TIMESTAMPTZ DEFAULT NOW(),
    created_by                                      UUID,
    is_deleted                                       BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 8. INTERVIEW PANEL MEMBERS (Notification to Panel)
-- ================================================================
CREATE TABLE IF NOT EXISTS interview_panel_members (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id            UUID        NOT NULL REFERENCES interviews(id),
    company_id               UUID       NOT NULL,

    employee_id               UUID,
    member_name                 VARCHAR(200) NOT NULL,
    member_role                  VARCHAR(100),
    expertise_area                 VARCHAR(200),

    notified                        BOOLEAN  DEFAULT FALSE,
    notified_at                      TIMESTAMPTZ,
    notification_method                VARCHAR(30) DEFAULT 'email',
    calendar_invite_sent                BOOLEAN DEFAULT FALSE,
    candidate_packet_received             BOOLEAN DEFAULT FALSE,

    confirmed_attendance                    BOOLEAN DEFAULT FALSE,

    created_at                               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 9. INTERVIEW SCORECARDS (Interview Management)
-- ================================================================
CREATE TABLE IF NOT EXISTS interview_scorecards (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id            UUID        NOT NULL REFERENCES interviews(id),
    panel_member_id           UUID      REFERENCES interview_panel_members(id),
    company_id                UUID      NOT NULL,

    -- Structured competency scoring (standardized to reduce bias)
    competencies               JSONB    NOT NULL DEFAULT '[]',
    -- [{"name":"Technical Skills","score":85,"weight":40,"notes":".."},...]

    overall_score                 FLOAT,
    recommendation                  VARCHAR(30)
                                    CHECK (recommendation IN ('strong_yes','yes','neutral','no','strong_no')),
    notes                             TEXT,
    strengths                          TEXT,
    concerns                            TEXT,

    submitted                            BOOLEAN DEFAULT FALSE,
    submitted_at                          TIMESTAMPTZ,

    created_at                             TIMESTAMPTZ DEFAULT NOW(),
    updated_at                              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (interview_id, panel_member_id)
);

-- ================================================================
-- 10. OFFERS (Offer Management)
-- ================================================================
CREATE TABLE IF NOT EXISTS offers (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    application_id          UUID        NOT NULL REFERENCES applications(id),

    offer_no                  VARCHAR(50) NOT NULL,
    position_title              VARCHAR(200),
    department_id                 UUID,

    -- Nepal LA2074 Section 11/13 mandatory fields
    employment_type                VARCHAR(30) NOT NULL
                                   CHECK (employment_type IN ('regular','time_bound','work_based','part_time','casual')),
    probation_months                  INT      DEFAULT 6 CHECK (probation_months <= 6),
    job_description                     TEXT,
    workplace_rules_acknowledged           BOOLEAN DEFAULT FALSE,

    -- Compensation
    basic_salary_npr                        NUMERIC(12,2) NOT NULL,
    allowances_npr                           NUMERIC(12,2) DEFAULT 0,
    total_ctc_npr                             NUMERIC(12,2),
    joining_date                               DATE,

    -- Approval routing
    approval_chain                              JSONB DEFAULT '[]',
    -- [{"role":"HR Manager","status":"approved",...},{"role":"Finance",...},{"role":"CEO",...}]
    current_approval_stage                       VARCHAR(50) DEFAULT 'hr_manager',
    status                                          VARCHAR(30) DEFAULT 'draft'
                                                    CHECK (status IN ('draft','pending_approval','approved',
                                                      'sent','negotiating','accepted','declined','rescinded','expired')),

    -- e-Signature
    offer_letter_url                                  VARCHAR(500),
    esignature_provider                                 VARCHAR(50) DEFAULT 'DocuSign',
    esignature_status                                    VARCHAR(30) DEFAULT 'not_sent',
    esignature_sent_at                                    TIMESTAMPTZ,
    esignature_completed_at                                TIMESTAMPTZ,
    signed_document_url                                     VARCHAR(500),

    sent_date                                                DATE,
    response_deadline                                         DATE,
    accepted_date                                              DATE,
    declined_reason                                             TEXT,

    -- Employment contract (mandatory per LA2074 Section 11)
    contract_generated                                          BOOLEAN DEFAULT FALSE,
    contract_url                                                 VARCHAR(500),

    created_at                                                   TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                    TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                     UUID,
    is_deleted                                                      BOOLEAN DEFAULT FALSE,

    UNIQUE (company_id, offer_no),
    CONSTRAINT ck_offer_probation CHECK (probation_months <= 6)
);

-- ================================================================
-- 11. BACKGROUND CHECKS (Background Verification)
-- ================================================================
CREATE TABLE IF NOT EXISTS background_checks (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    offer_id                 UUID       REFERENCES offers(id),
    candidate_id               UUID     NOT NULL REFERENCES candidates(id),

    -- Mandatory consent (Nepal Individual Privacy Act)
    consent_obtained             BOOLEAN  NOT NULL DEFAULT FALSE,
    consent_date                  TIMESTAMPTZ,
    consent_document_url            VARCHAR(500),

    checks                            JSONB NOT NULL DEFAULT '{}',
    -- {"identity":{"status":"passed",...},"criminal":{...},"education":{...},"employment":{...},"reference":{...}}

    status                               VARCHAR(30) DEFAULT 'pending_consent'
                                        CHECK (status IN ('pending_consent','in_progress','cleared','cleared_with_flags','failed')),
    overall_risk                          VARCHAR(20) DEFAULT 'pending',
    ai_risk_score                          FLOAT      DEFAULT 0,

    external_provider                       VARCHAR(100) DEFAULT 'Internal',
    blockchain_hash                           VARCHAR(100),

    initiated_date                             TIMESTAMPTZ DEFAULT NOW(),
    completed_date                              TIMESTAMPTZ,

    created_at                                   TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                    TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                     BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 12. HIRING APPROVALS (Hiring Approval Workflow)
-- ================================================================
CREATE TABLE IF NOT EXISTS hiring_approvals (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    entity_type             VARCHAR(30) NOT NULL
                            CHECK (entity_type IN ('requisition','offer','vacancy')),
    entity_id                 UUID      NOT NULL,

    approval_level              INT     NOT NULL,  -- 1, 2, 3...
    approver_role                 VARCHAR(50) NOT NULL,
    approver_id                     UUID,
    approver_name                    VARCHAR(200),

    status                              VARCHAR(20) DEFAULT 'pending'
                                        CHECK (status IN ('pending','approved','rejected','skipped')),
    decision_date                         TIMESTAMPTZ,
    comments                               TEXT,

    -- Threshold rules
    triggered_by_salary_band                 BOOLEAN DEFAULT FALSE,
    salary_threshold_npr                       NUMERIC(12,2),

    notification_sent                            BOOLEAN DEFAULT FALSE,
    notification_sent_at                          TIMESTAMPTZ,

    created_at                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_jrf_company        ON job_requisitions(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_jrf_status          ON job_requisitions(status);

CREATE INDEX IF NOT EXISTS idx_vac_company         ON vacancies(company_id)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_vac_status           ON vacancies(status);
CREATE INDEX IF NOT EXISTS idx_vac_priority          ON vacancies(priority);
CREATE INDEX IF NOT EXISTS idx_vac_dept               ON vacancies(department_id);

CREATE INDEX IF NOT EXISTS idx_jp_company           ON job_postings(company_id)    WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_jp_vacancy            ON job_postings(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_jp_status              ON job_postings(status);

CREATE INDEX IF NOT EXISTS idx_cand_company           ON candidates(company_id)    WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_cand_status             ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_cand_email               ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_cand_fts                  ON candidates USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_cand_retention              ON candidates(data_retention_expiry) WHERE NOT is_anonymized;

CREATE INDEX IF NOT EXISTS idx_app_company               ON applications(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_app_candidate               ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_app_vacancy                  ON applications(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_app_stage                     ON applications(stage);

CREATE INDEX IF NOT EXISTS idx_rsr_application                ON resume_screening_results(application_id);
CREATE INDEX IF NOT EXISTS idx_rsr_fraud                        ON resume_screening_results(fraud_risk_score) WHERE fraud_risk_score > 50;

CREATE INDEX IF NOT EXISTS idx_iv_company                       ON interviews(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_iv_application                    ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_iv_status                          ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_iv_date                              ON interviews(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_ipm_interview                         ON interview_panel_members(interview_id);

CREATE INDEX IF NOT EXISTS idx_isc_interview                          ON interview_scorecards(interview_id);

CREATE INDEX IF NOT EXISTS idx_off_company                              ON offers(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_off_application                           ON offers(application_id);
CREATE INDEX IF NOT EXISTS idx_off_status                                 ON offers(status);

CREATE INDEX IF NOT EXISTS idx_bgc_candidate                                ON background_checks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_bgc_status                                    ON background_checks(status);

CREATE INDEX IF NOT EXISTS idx_ha_entity                                      ON hiring_approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ha_status                                       ON hiring_approvals(status);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_recruit_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'job_requisitions','vacancies','job_postings','candidates','applications',
  'interviews','interview_scorecards','offers','background_checks','hiring_approvals'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_recruit_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Nepal LA2074 Section 13: probation max 6 months
CREATE OR REPLACE FUNCTION fn_offer_probation_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.probation_months > 6 THEN
        RAISE EXCEPTION 'Probation period cannot exceed 6 months per Nepal Labour Act 2074 Section 13.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_offer_probation
    BEFORE INSERT OR UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION fn_offer_probation_check();

-- Auto-update vacancy applications_count when application added
CREATE OR REPLACE FUNCTION fn_vacancy_app_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE vacancies SET applications_count = (
        SELECT COUNT(*) FROM applications WHERE vacancy_id = NEW.vacancy_id AND NOT is_deleted
    ),
    shortlisted_count = (
        SELECT COUNT(*) FROM applications WHERE vacancy_id = NEW.vacancy_id
        AND stage NOT IN ('applied','rejected','withdrawn') AND NOT is_deleted
    ),
    interviewed_count = (
        SELECT COUNT(*) FROM applications WHERE vacancy_id = NEW.vacancy_id
        AND stage IN ('panel','offer','hired') AND NOT is_deleted
    )
    WHERE id = NEW.vacancy_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_vacancy_app_count
    AFTER INSERT OR UPDATE OF stage ON applications
    FOR EACH ROW EXECUTE FUNCTION fn_vacancy_app_count();

-- Auto-mark vacancy overdue
CREATE OR REPLACE FUNCTION fn_vacancy_overdue_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.target_fill_date < CURRENT_DATE AND NEW.status NOT IN ('filled','cancelled') THEN
        NEW.status := 'overdue';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_vacancy_overdue
    BEFORE INSERT OR UPDATE ON vacancies
    FOR EACH ROW EXECUTE FUNCTION fn_vacancy_overdue_check();

-- Auto-compute applications overall score
CREATE OR REPLACE FUNCTION fn_app_overall_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.overall_score := ROUND((
        COALESCE(NEW.cv_match_score, 0) * 0.40 +
        COALESCE(NEW.written_exam_score, 0) * 0.25 +
        COALESCE(NEW.video_interview_score, 0) * 0.25 +
        COALESCE(NEW.panel_avg_score, 0) * 0.10
    )::NUMERIC, 1);
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_app_overall_score
    BEFORE INSERT OR UPDATE OF cv_match_score, written_exam_score, video_interview_score, panel_avg_score
    ON applications
    FOR EACH ROW EXECUTE FUNCTION fn_app_overall_score();

-- Background check consent gate: cannot start checks without consent
CREATE OR REPLACE FUNCTION fn_bgc_consent_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'in_progress' AND NOT NEW.consent_obtained THEN
        RAISE EXCEPTION 'Background check cannot proceed without candidate consent per Nepal Individual Privacy Act.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_bgc_consent
    BEFORE INSERT OR UPDATE ON background_checks
    FOR EACH ROW EXECUTE FUNCTION fn_bgc_consent_gate();

-- ================================================================
-- VIEWS
-- ================================================================

-- Recruitment funnel (Applied -> Screening -> ... -> Hired)
CREATE OR REPLACE VIEW v_recruitment_funnel AS
SELECT
    v.title AS vacancy_title, v.department_id,
    COUNT(*) FILTER (WHERE a.stage = 'applied')   AS applied,
    COUNT(*) FILTER (WHERE a.stage = 'screening')  AS screening,
    COUNT(*) FILTER (WHERE a.stage = 'written')    AS written_exam,
    COUNT(*) FILTER (WHERE a.stage = 'video')      AS video_interview,
    COUNT(*) FILTER (WHERE a.stage = 'panel')      AS panel_interview,
    COUNT(*) FILTER (WHERE a.stage = 'offer')      AS offer,
    COUNT(*) FILTER (WHERE a.stage = 'hired')      AS hired,
    COUNT(*) FILTER (WHERE a.stage = 'rejected')   AS rejected,
    v.company_id
FROM applications a
JOIN vacancies v ON a.vacancy_id = v.id
WHERE NOT a.is_deleted
GROUP BY v.title, v.department_id, v.company_id;

-- Time-to-hire & cost-per-hire analytics
CREATE OR REPLACE VIEW v_recruitment_analytics AS
SELECT
    v.id AS vacancy_id, v.title,
    v.approved_date,
    MIN(a.applied_date)                                    AS first_application,
    MAX(CASE WHEN a.stage='hired' THEN a.updated_at::DATE END) AS hire_date,
    (MAX(CASE WHEN a.stage='hired' THEN a.updated_at::DATE END) - v.approved_date) AS time_to_hire_days,
    COUNT(DISTINCT a.id)                                    AS total_applications,
    COUNT(DISTINCT a.id) FILTER (WHERE a.stage='hired')    AS hired_count,
    v.company_id
FROM vacancies v
LEFT JOIN applications a ON a.vacancy_id = v.id AND NOT a.is_deleted
GROUP BY v.id, v.title, v.approved_date, v.company_id;

-- Source of hire effectiveness
CREATE OR REPLACE VIEW v_source_of_hire AS
SELECT
    c.source,
    COUNT(DISTINCT a.id)                                       AS total_applications,
    COUNT(DISTINCT a.id) FILTER (WHERE a.stage='hired')       AS hires,
    ROUND(COUNT(DISTINCT a.id) FILTER (WHERE a.stage='hired')::NUMERIC
          / NULLIF(COUNT(DISTINCT a.id),0) * 100, 1)          AS conversion_pct,
    ROUND(AVG(a.overall_score)::NUMERIC, 1)                    AS avg_quality_score,
    c.company_id
FROM candidates c
JOIN applications a ON a.candidate_id = c.id
WHERE NOT a.is_deleted
GROUP BY c.source, c.company_id
ORDER BY conversion_pct DESC;

-- Pending hiring approvals queue
CREATE OR REPLACE VIEW v_pending_approvals AS
SELECT
    ha.entity_type, ha.entity_id, ha.approval_level, ha.approver_role,
    ha.approver_name, ha.created_at,
    CASE ha.entity_type
        WHEN 'requisition' THEN (SELECT position_title FROM job_requisitions WHERE id = ha.entity_id)
        WHEN 'offer'       THEN (SELECT position_title FROM offers WHERE id = ha.entity_id)
        WHEN 'vacancy'     THEN (SELECT title FROM vacancies WHERE id = ha.entity_id)
    END AS entity_title,
    ha.company_id
FROM hiring_approvals ha
WHERE ha.status = 'pending'
ORDER BY ha.created_at ASC;

-- Background check compliance dashboard
CREATE OR REPLACE VIEW v_bgc_compliance AS
SELECT
    c.full_name, c.email,
    bgc.status, bgc.overall_risk, bgc.consent_obtained,
    bgc.initiated_date, bgc.completed_date,
    EXTRACT(DAY FROM NOW() - bgc.initiated_date)::INT AS days_in_progress,
    bgc.company_id
FROM background_checks bgc
JOIN candidates c ON bgc.candidate_id = c.id
WHERE NOT bgc.is_deleted
ORDER BY bgc.initiated_date DESC;
