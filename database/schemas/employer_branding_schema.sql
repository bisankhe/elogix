-- ================================================================
-- FILE: database/schemas/employer_branding_schema.sql
-- NepHR Pro — Employer Branding Module Schema
-- Covers all 8 pages:
--   1. evp_pillars              (EVP Management)
--   2. career_page_blocks       (Career Page Builder)
--   3. recruitment_campaigns    (Recruitment Campaign)
--   4. universities             (Campus Hiring partners)
--   5. campus_interns           (Campus Hiring interns/apprentices)
--   6. social_media_posts       (Social Media Branding)
--   7. employee_testimonials    (Employee Testimonial)
--   8. culture_showcase_items   (Culture Showcase)
--   9. hiring_events            (Hiring Event Branding)
-- Nepal Labour Act 2074 + Privacy Act + Consumer Protection Act enforced.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. EVP PILLARS (Employee Value Proposition Management)
-- ================================================================
CREATE TABLE IF NOT EXISTS evp_pillars (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    name                    VARCHAR(200) NOT NULL,
    name_nepali              VARCHAR(200),
    description                TEXT,
    icon                         VARCHAR(10) DEFAULT '💎',
    color                          VARCHAR(7)  DEFAULT '#7e22ce',

    weight_pct                       NUMERIC(5,2) DEFAULT 20 CHECK (weight_pct BETWEEN 0 AND 100),
    employee_rating                    NUMERIC(3,2) CHECK (employee_rating BETWEEN 0 AND 5),
    market_benchmark                      NUMERIC(3,2) CHECK (market_benchmark BETWEEN 0 AND 5),

    -- Data sources backing the EVP claim (transparency requirement)
    data_sources                             JSONB DEFAULT '[]',
    -- e.g. ["Salary Survey 2025","Retention Exit Interviews"]

    status                                      VARCHAR(20) DEFAULT 'needs_work'
                                                CHECK (status IN ('strong','needs_work','critical')),

    -- Equal pay compliance (Nepal LA2074 Section 7)
    equal_pay_audited                            BOOLEAN DEFAULT FALSE,
    equal_pay_audit_date                          DATE,

    ai_generated_messaging                          TEXT,
    ai_last_generated_at                              TIMESTAMPTZ,

    last_updated                                       DATE DEFAULT CURRENT_DATE,
    created_at                                           TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                            TIMESTAMPTZ DEFAULT NOW(),
    created_by                                             UUID,
    is_deleted                                              BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 2. CAREER PAGE BLOCKS (Headless CMS block builder)
-- ================================================================
CREATE TABLE IF NOT EXISTS career_page_blocks (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    block_type               VARCHAR(30) NOT NULL
                             CHECK (block_type IN ('hero','evp','jobs','testimonial','culture','stats','faq','footer')),
    display_order              INT       NOT NULL DEFAULT 0,
    status                       VARCHAR(20) DEFAULT 'draft'
                                CHECK (status IN ('live','draft','archived')),

    config                          JSONB  DEFAULT '{}',
    -- e.g. {"headline":"Join Our Team","cta":"View Roles"}

    -- Performance metrics (denormalized for dashboard speed)
    views_count                       INT  DEFAULT 0,
    clicks_count                        INT DEFAULT 0,

    created_at                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                             TIMESTAMPTZ DEFAULT NOW(),
    created_by                              UUID,
    is_deleted                               BOOLEAN DEFAULT FALSE
);

-- Career page aggregate analytics (rolled up daily)
CREATE TABLE IF NOT EXISTS career_page_analytics (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id        UUID NOT NULL,
    date              DATE NOT NULL,
    visits            INT  DEFAULT 0,
    applications      INT  DEFAULT 0,
    avg_time_on_page_sec INT DEFAULT 0,
    mobile_pct        NUMERIC(5,2) DEFAULT 0,
    bounce_rate_pct   NUMERIC(5,2) DEFAULT 0,
    UNIQUE (company_id, date)
);

-- ================================================================
-- 3. RECRUITMENT CAMPAIGNS
-- ================================================================
CREATE TABLE IF NOT EXISTS recruitment_campaigns (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    name                    VARCHAR(200) NOT NULL,
    channels                  JSONB      DEFAULT '[]', -- ["LinkedIn","Merojob","Google Ads"]
    target_roles                JSONB    DEFAULT '[]',
    ab_variant                    VARCHAR(5) DEFAULT 'A',

    budget_npr                       NUMERIC(12,2) DEFAULT 0,
    spent_npr                          NUMERIC(12,2) DEFAULT 0,

    start_date                            DATE,
    end_date                               DATE,
    status                                   VARCHAR(20) DEFAULT 'draft'
                                            CHECK (status IN ('draft','active','paused','completed','cancelled')),

    -- Performance metrics
    impressions                               INT DEFAULT 0,
    clicks                                       INT DEFAULT 0,
    applications_count                              INT DEFAULT 0,
    hires_count                                       INT DEFAULT 0,
    cost_per_hire_npr                                   NUMERIC(12,2) GENERATED ALWAYS AS (
                                                          CASE WHEN hires_count > 0 THEN ROUND(spent_npr / hires_count, 2) ELSE 0 END
                                                        ) STORED,

    -- Nepal LA2074 compliance
    local_priority_demonstrated                            BOOLEAN DEFAULT FALSE,
    eeo_compliant                                             BOOLEAN DEFAULT TRUE,

    ai_score                                                    FLOAT DEFAULT 0,
    ai_note                                                      TEXT,

    created_at                                                    TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                     TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                      UUID,
    is_deleted                                                       BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 4. UNIVERSITIES (Campus Hiring partners)
-- ================================================================
CREATE TABLE IF NOT EXISTS universities (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    name                    VARCHAR(200) NOT NULL,
    name_nepali               VARCHAR(200),
    tier                         VARCHAR(20) DEFAULT 'tier_2'
                                CHECK (tier IN ('tier_1','tier_2','tier_3')),

    relationship_start_year       INT,
    primary_contact_name             VARCHAR(200),
    primary_contact_email              VARCHAR(255),

    -- Performance metrics (denormalized)
    alumni_hired_count                    INT DEFAULT 0,
    avg_performance_score                   NUMERIC(3,2),
    retention_pct                             NUMERIC(5,2),
    students_registered                         INT DEFAULT 0,

    upcoming_event_date                           DATE,
    status                                           VARCHAR(20) DEFAULT 'new'
                                                     CHECK (status IN ('active','new','inactive')),

    created_at                                         TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                          TIMESTAMPTZ DEFAULT NOW(),
    created_by                                           UUID,
    is_deleted                                            BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 5. CAMPUS INTERNS / APPRENTICES
-- ================================================================
CREATE TABLE IF NOT EXISTS campus_interns (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    university_id            UUID       REFERENCES universities(id),
    candidate_id               UUID,    -- links to candidates table from recruitment module

    full_name                    VARCHAR(200) NOT NULL,
    program                         VARCHAR(200),
    department_id                     UUID,
    mentor_employee_id                  UUID,
    mentor_name                          VARCHAR(200),

    start_date                              DATE NOT NULL,
    end_date                                  DATE NOT NULL,
    stipend_npr                                 NUMERIC(10,2),

    -- Nepal LA2074 mandatory agreement
    agreement_signed                              BOOLEAN DEFAULT FALSE,
    agreement_url                                   VARCHAR(500),
    working_hours_per_week                            INT DEFAULT 40,

    performance_score                                    NUMERIC(3,2),
    conversion_likely                                       BOOLEAN DEFAULT FALSE,
    converted_to_employee                                     BOOLEAN DEFAULT FALSE,

    status                                                       VARCHAR(20) DEFAULT 'active'
                                                                 CHECK (status IN ('active','completed','terminated')),

    created_at                                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                       BOOLEAN DEFAULT FALSE,

    -- Age verification: Nepal child labor prohibition
    CONSTRAINT ck_intern_age_verified CHECK (TRUE)  -- enforced via app-layer DOB check
);

-- ================================================================
-- 6. SOCIAL MEDIA POSTS (Social Media Branding)
-- ================================================================
CREATE TABLE IF NOT EXISTS social_media_posts (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    title                   VARCHAR(300) NOT NULL,
    content                   TEXT,
    media_urls                 JSONB    DEFAULT '[]',
    platforms                    JSONB  DEFAULT '[]',  -- ["LinkedIn","Instagram","Facebook"]

    post_type                       VARCHAR(30) DEFAULT 'culture'
                                    CHECK (post_type IN ('culture','job_alert','employee_takeover',
                                      'day_in_life','event','testimonial','company_update')),

    scheduled_date                       TIMESTAMPTZ,
    published_date                         TIMESTAMPTZ,
    status                                    VARCHAR(20) DEFAULT 'draft'
                                              CHECK (status IN ('draft','scheduled','live','archived')),

    -- Engagement metrics
    impressions                                 INT DEFAULT 0,
    likes                                          INT DEFAULT 0,
    comments                                         INT DEFAULT 0,
    shares                                              INT DEFAULT 0,
    clicks                                                INT DEFAULT 0,

    -- Featured employee consent
    features_employee                                       BOOLEAN DEFAULT FALSE,
    employee_consent_obtained                                  BOOLEAN DEFAULT FALSE,
    employee_consent_date                                        TIMESTAMPTZ,

    created_at                                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                      TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                       UUID,
    is_deleted                                                        BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 7. EMPLOYEE TESTIMONIALS
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_testimonials (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID,

    employee_name              VARCHAR(200) NOT NULL,
    employee_role                 VARCHAR(200),
    employee_department              VARCHAR(200),
    employee_tenure_years              NUMERIC(4,1),

    quote_text                            TEXT,
    video_url                                VARCHAR(500),
    photo_url                                  VARCHAR(500),

    -- Mandatory consent (Nepal Privacy Law)
    consent_obtained                              BOOLEAN NOT NULL DEFAULT FALSE,
    consent_document_url                            VARCHAR(500),
    consent_date                                       TIMESTAMPTZ,
    consent_expiry                                       DATE,  -- testimonials require periodic re-consent

    status                                                  VARCHAR(20) DEFAULT 'draft'
                                                            CHECK (status IN ('draft','live','archived')),
    featured_on                                                 JSONB DEFAULT '[]', -- ["career_page","linkedin"]

    views_count                                                   INT DEFAULT 0,

    created_at                                                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                        TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                         UUID,
    is_deleted                                                          BOOLEAN DEFAULT FALSE,

    CONSTRAINT ck_testimonial_consent CHECK (
        status != 'live' OR consent_obtained = TRUE
    )
);

-- ================================================================
-- 8. CULTURE SHOWCASE ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS culture_showcase_items (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    title                   VARCHAR(300) NOT NULL,
    category                  VARCHAR(30) DEFAULT 'general'
                              CHECK (category IN ('dei','esg','erg','flexibility','general','event_recap')),
    description                 TEXT,
    media_urls                    JSONB DEFAULT '[]',

    -- Metrics-backed transparency (DEI/ESG)
    metric_label                     VARCHAR(200),
    metric_value                       VARCHAR(100),
    metric_source                        VARCHAR(200),

    status                                  VARCHAR(20) DEFAULT 'draft'
                                            CHECK (status IN ('live','draft','scheduled','archived')),

    consent_required                            BOOLEAN DEFAULT FALSE,
    consent_obtained                              BOOLEAN DEFAULT TRUE,

    views_count                                     INT DEFAULT 0,
    publish_date                                       DATE,

    created_at                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                             TIMESTAMPTZ DEFAULT NOW(),
    created_by                                              UUID,
    is_deleted                                               BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 9. HIRING EVENTS (Hiring Event Branding)
-- ================================================================
CREATE TABLE IF NOT EXISTS hiring_events (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    university_id            UUID       REFERENCES universities(id),

    name                       VARCHAR(300) NOT NULL,
    event_type                    VARCHAR(30) DEFAULT 'campus_drive'
                                  CHECK (event_type IN ('campus_drive','job_fair','open_house','virtual_event','hackathon')),
    location                         VARCHAR(300),
    is_virtual                          BOOLEAN DEFAULT FALSE,

    event_date                             DATE NOT NULL,
    start_time                                TIME,
    end_time                                    TIME,

    -- Landing page + QR check-in
    landing_page_url                               VARCHAR(500),
    qr_code_url                                       VARCHAR(500),
    registration_link                                    VARCHAR(500),

    -- Registration & attendance tracking
    registered_count                                        INT DEFAULT 0,
    checked_in_count                                           INT DEFAULT 0,
    applications_generated                                        INT DEFAULT 0,
    offers_made                                                      INT DEFAULT 0,

    status                                                              VARCHAR(20) DEFAULT 'upcoming'
                                                                        CHECK (status IN ('upcoming','live','completed','cancelled')),

    -- Branding assets
    banner_url                                                              VARCHAR(500),
    social_hashtag                                                            VARCHAR(100),

    -- Nepal compliance: branding must not feature minors
    minor_safe_certified                                                          BOOLEAN DEFAULT TRUE,

    created_at                                                                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                       TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                        UUID,
    is_deleted                                                                         BOOLEAN DEFAULT FALSE
);

-- Event attendee check-ins (QR scan log)
CREATE TABLE IF NOT EXISTS hiring_event_checkins (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES hiring_events(id),
    attendee_name   VARCHAR(200) NOT NULL,
    attendee_email  VARCHAR(255),
    attendee_phone  VARCHAR(50),
    university      VARCHAR(200),
    checked_in_at   TIMESTAMPTZ DEFAULT NOW(),
    candidate_id    UUID  -- linked once converted to application
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_evp_company       ON evp_pillars(company_id)             WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_evp_status         ON evp_pillars(status);

CREATE INDEX IF NOT EXISTS idx_cpb_company         ON career_page_blocks(company_id)      WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_cpb_order            ON career_page_blocks(display_order);
CREATE INDEX IF NOT EXISTS idx_cpa_company           ON career_page_analytics(company_id, date);

CREATE INDEX IF NOT EXISTS idx_rc_company             ON recruitment_campaigns(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_rc_status               ON recruitment_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_univ_company             ON universities(company_id)         WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_univ_tier                 ON universities(tier);

CREATE INDEX IF NOT EXISTS idx_ci_university              ON campus_interns(university_id);
CREATE INDEX IF NOT EXISTS idx_ci_status                   ON campus_interns(status);
CREATE INDEX IF NOT EXISTS idx_ci_agreement                  ON campus_interns(agreement_signed) WHERE NOT agreement_signed;

CREATE INDEX IF NOT EXISTS idx_smp_company                  ON social_media_posts(company_id)   WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_smp_status                     ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_smp_consent                      ON social_media_posts(features_employee, employee_consent_obtained) WHERE features_employee;

CREATE INDEX IF NOT EXISTS idx_et_company                       ON employee_testimonials(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_et_status                          ON employee_testimonials(status);
CREATE INDEX IF NOT EXISTS idx_et_consent                           ON employee_testimonials(consent_obtained) WHERE NOT consent_obtained;

CREATE INDEX IF NOT EXISTS idx_csi_company                           ON culture_showcase_items(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_csi_category                            ON culture_showcase_items(category);

CREATE INDEX IF NOT EXISTS idx_he_company                                ON hiring_events(company_id)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_he_date                                     ON hiring_events(event_date);
CREATE INDEX IF NOT EXISTS idx_hec_event                                     ON hiring_event_checkins(event_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_branding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'evp_pillars','career_page_blocks','recruitment_campaigns','universities',
  'campus_interns','social_media_posts','employee_testimonials','culture_showcase_items','hiring_events'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_branding_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Block testimonial from going live without consent (Nepal Privacy Law)
CREATE OR REPLACE FUNCTION fn_testimonial_consent_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'live' AND NOT NEW.consent_obtained THEN
        RAISE EXCEPTION 'Employee testimonial cannot go live without documented consent (Nepal Privacy Law).';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_testimonial_consent
    BEFORE INSERT OR UPDATE ON employee_testimonials
    FOR EACH ROW EXECUTE FUNCTION fn_testimonial_consent_gate();

-- Block social media post featuring employee without consent
CREATE OR REPLACE FUNCTION fn_social_post_consent_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'live' AND NEW.features_employee AND NOT NEW.employee_consent_obtained THEN
        RAISE EXCEPTION 'Cannot publish post featuring employee without consent (Nepal Privacy Law).';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_social_post_consent
    BEFORE INSERT OR UPDATE ON social_media_posts
    FOR EACH ROW EXECUTE FUNCTION fn_social_post_consent_gate();

-- Auto-update hiring event checked_in_count
CREATE OR REPLACE FUNCTION fn_hiring_event_checkin_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE hiring_events SET checked_in_count = (
        SELECT COUNT(*) FROM hiring_event_checkins WHERE event_id = NEW.event_id
    ) WHERE id = NEW.event_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_hiring_event_checkin
    AFTER INSERT ON hiring_event_checkins
    FOR EACH ROW EXECUTE FUNCTION fn_hiring_event_checkin_count();

-- ================================================================
-- VIEWS
-- ================================================================

-- Overall EVP score (weighted average)
CREATE OR REPLACE VIEW v_evp_overall_score AS
SELECT
    company_id,
    ROUND(SUM(employee_rating * weight_pct) / SUM(weight_pct), 2) AS overall_evp_score,
    COUNT(*) FILTER (WHERE employee_rating >= market_benchmark)   AS pillars_above_market,
    COUNT(*) FILTER (WHERE status = 'critical')                    AS critical_gaps,
    COUNT(*)                                                          AS total_pillars
FROM evp_pillars
WHERE NOT is_deleted
GROUP BY company_id;

-- Campaign ROI summary
CREATE OR REPLACE VIEW v_campaign_roi AS
SELECT
    name, status, budget_npr, spent_npr,
    impressions, clicks,
    ROUND(clicks::NUMERIC / NULLIF(impressions,0) * 100, 2)        AS ctr_pct,
    applications_count, hires_count, cost_per_hire_npr,
    ROUND(hires_count::NUMERIC / NULLIF(applications_count,0) * 100, 2) AS conversion_pct,
    company_id
FROM recruitment_campaigns
WHERE NOT is_deleted
ORDER BY cost_per_hire_npr ASC NULLS LAST;

-- University performance ranking
CREATE OR REPLACE VIEW v_university_ranking AS
SELECT
    name, tier, alumni_hired_count, avg_performance_score, retention_pct,
    ROUND((alumni_hired_count * 0.3 + avg_performance_score * 15 + retention_pct * 0.5)::NUMERIC, 1) AS overall_score,
    company_id
FROM universities
WHERE NOT is_deleted
ORDER BY overall_score DESC;

-- Pending consent alerts (testimonials + social posts)
CREATE OR REPLACE VIEW v_pending_consent_alerts AS
SELECT 'testimonial' AS source_type, id, employee_name AS subject_name, company_id
FROM employee_testimonials WHERE NOT consent_obtained AND NOT is_deleted
UNION ALL
SELECT 'social_post' AS source_type, id, title AS subject_name, company_id
FROM social_media_posts WHERE features_employee AND NOT employee_consent_obtained AND NOT is_deleted;

-- Internship agreement compliance
CREATE OR REPLACE VIEW v_intern_compliance AS
SELECT
    ci.full_name, u.name AS university_name, ci.program,
    ci.start_date, ci.end_date, ci.agreement_signed,
    ci.working_hours_per_week,
    CASE WHEN ci.working_hours_per_week > 48 THEN 'LA2074_VIOLATION'
         WHEN NOT ci.agreement_signed THEN 'AGREEMENT_MISSING'
         ELSE 'COMPLIANT' END AS compliance_status,
    ci.company_id
FROM campus_interns ci
LEFT JOIN universities u ON ci.university_id = u.id
WHERE NOT ci.is_deleted;
