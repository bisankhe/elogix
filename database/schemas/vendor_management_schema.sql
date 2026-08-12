-- ============================================================
-- FILE: database/schemas/vendor_management_schema.sql
-- eLogix HRMS — Vendor / Outsource Management Module Schema
-- Covers:
--   1. recruitment_agencies     (Vendor Profile)
--   2. vendor_bgv               (Background Verification)
--   3. vendor_reviews           (Marketplace ratings)
--   4. vendor_agreements        (CLM — Contract Lifecycle)
--   5. vendor_sla               (SLA & Contract Performance)
-- Nepal Labour Act 2074 Sections 52-64 enforced at DB level.
-- PostgreSQL 15+ required.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLE 1: RECRUITMENT AGENCIES / VENDOR PROFILES
-- Nepal Labour Act 2074 Section 59: DOL license mandatory
-- ============================================================
CREATE TABLE IF NOT EXISTS recruitment_agencies (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    code                   VARCHAR(30)  NOT NULL,
    name                   VARCHAR(200) NOT NULL,
    name_nepali            VARCHAR(200),
    type                   VARCHAR(30)  NOT NULL DEFAULT 'recruitment'
                           CHECK (type IN (
                             'recruitment','executive_search','outsource_staffing',
                             'temp_staffing','background_screening',
                             'payroll_processing','benefits_admin','training')),

    -- Nepal Labour Act 2074 Section 59 — DOL License (MANDATORY)
    license_no             VARCHAR(100),     -- LS-DOL-YYYY-NNNN
    license_expiry         DATE,
    is_licensed            BOOLEAN      DEFAULT FALSE,
    max_service_types      INT          DEFAULT 2,   -- Section 59: max 2 types

    -- Business details
    pan_no                 VARCHAR(20),
    vat_registered         BOOLEAN      DEFAULT FALSE,
    vat_no                 VARCHAR(20),
    founding_year          INT,
    employee_count         INT          DEFAULT 0,
    client_count           INT          DEFAULT 0,
    website                VARCHAR(255),

    -- Contact
    contact_person         VARCHAR(200),
    contact_email          VARCHAR(255),
    contact_phone          VARCHAR(50),
    address                TEXT,
    province               VARCHAR(100),
    district               VARCHAR(100),

    -- Compliance (LA2074 Section 64 co-liability checks)
    ssf_registered         BOOLEAN      DEFAULT FALSE,
    ssf_registration_no    VARCHAR(50),
    insurance_valid        BOOLEAN      DEFAULT FALSE,
    insurance_expiry       DATE,
    pf_registered          BOOLEAN      DEFAULT FALSE,
    is_verified            BOOLEAN      DEFAULT FALSE,
    verified_at            TIMESTAMPTZ,

    -- Service profile
    service_categories     JSONB        DEFAULT '[]',
    specializations        JSONB        DEFAULT '[]',
    regions_served         JSONB        DEFAULT '["Kathmandu"]',
    price_tier             VARCHAR(20)  DEFAULT 'standard'
                           CHECK (price_tier IN ('economy','standard','premium')),
    response_time_hrs      INT          DEFAULT 24,

    -- Performance metrics (updated by AI monthly)
    placements_ytd         INT          DEFAULT 0,
    avg_time_to_hire_days  FLOAT        DEFAULT 0,
    quality_score          FLOAT        DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
    fill_rate              FLOAT        DEFAULT 0 CHECK (fill_rate BETWEEN 0 AND 100),
    diversity_score        FLOAT        DEFAULT 0 CHECK (diversity_score BETWEEN 0 AND 100),
    avg_salary_placed_npr  NUMERIC(12,2),
    sla_compliance         FLOAT        DEFAULT 100 CHECK (sla_compliance BETWEEN 0 AND 100),

    -- Tier classification
    tier                   VARCHAR(20)  DEFAULT 'approved'
                           CHECK (tier IN ('preferred','approved','standard','watch','blacklisted')),
    tier_updated_at        TIMESTAMPTZ,

    -- AI scoring
    ai_score               FLOAT        DEFAULT 0 CHECK (ai_score BETWEEN 0 AND 100),
    ai_match_score         FLOAT        DEFAULT 0 CHECK (ai_match_score BETWEEN 0 AND 100),
    ai_recommendation      TEXT,
    ai_last_scored         TIMESTAMPTZ,
    ai_insights            JSONB        DEFAULT '{}',

    -- Agreement / BGV link
    latest_agreement_id    UUID,
    latest_bgv_id          UUID,
    agreement_expiry       DATE,

    -- FTS
    search_vector          TSVECTOR GENERATED ALWAYS AS (
                             to_tsvector('english',
                               COALESCE(code,'') || ' ' ||
                               COALESCE(name,'') || ' ' ||
                               COALESCE(name_nepali,'') || ' ' ||
                               COALESCE(license_no,''))
                           ) STORED,

    status                 VARCHAR(20)  DEFAULT 'active',
    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    created_by             UUID,
    is_deleted             BOOLEAN      DEFAULT FALSE,
    deleted_at             TIMESTAMPTZ,

    UNIQUE (company_id, code),
    -- LA2074 Section 59: Must have DOL license
    CONSTRAINT ck_agency_license CHECK (
        NOT is_licensed OR (license_no IS NOT NULL AND license_no != '')
    )
);

-- ============================================================
-- TABLE 2: VENDOR BACKGROUND VERIFICATION (BGV)
-- Blockchain-backed, multi-check, AI risk scoring
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_bgv (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_id              UUID         NOT NULL REFERENCES recruitment_agencies(id),

    initiated_date         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_date         TIMESTAMPTZ,

    -- Verification status
    status                 VARCHAR(30)  DEFAULT 'in_progress'
                           CHECK (status IN ('in_progress','cleared','cleared_with_flags','failed','expired')),

    -- Individual check results (JSONB for flexibility)
    -- Structure: {"identity": {"status":"passed","method":"..","verified_by":"..","date":"..","note":".."},...}
    checks                 JSONB        NOT NULL DEFAULT '{}',

    -- AI risk assessment
    overall_risk           VARCHAR(20)  DEFAULT 'pending'
                           CHECK (overall_risk IN ('pending','low','medium','high','critical')),
    ai_score               INT          DEFAULT 0 CHECK (ai_score BETWEEN 0 AND 100),
    ai_risk_notes          TEXT,

    -- Blockchain
    blockchain_hash        VARCHAR(100),
    blockchain_generated   BOOLEAN      DEFAULT FALSE,
    blockchain_timestamp   TIMESTAMPTZ,

    -- BGV configuration
    bgv_package            VARCHAR(50)  DEFAULT 'Standard',
    priority               VARCHAR(30)  DEFAULT 'Normal',
    external_provider      VARCHAR(100) DEFAULT 'Internal',

    -- Renewal
    next_renewal           DATE,
    expiry_alert_sent      BOOLEAN      DEFAULT FALSE,

    notes                  TEXT,
    created_by             UUID,
    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted             BOOLEAN      DEFAULT FALSE
);

-- ============================================================
-- TABLE 3: VENDOR REVIEWS (Marketplace ratings)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_reviews (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id    UUID         NOT NULL REFERENCES recruitment_agencies(id),
    company_id   UUID         NOT NULL,
    score        NUMERIC(3,1) NOT NULL CHECK (score BETWEEN 1 AND 5),
    review_text  TEXT,
    review_tags  TEXT[]       DEFAULT '{}',
    is_verified  BOOLEAN      DEFAULT FALSE,
    reviewed_by  UUID,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted   BOOLEAN      DEFAULT FALSE
);

-- ============================================================
-- TABLE 4: VENDOR AGREEMENTS (CLM)
-- MSA, Service Agreement, NDA, Amendment, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_agreements (
    id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id               UUID         NOT NULL,
    vendor_id                UUID         NOT NULL REFERENCES recruitment_agencies(id),

    code                     VARCHAR(50)  NOT NULL,
    type                     VARCHAR(50)  NOT NULL DEFAULT 'MSA'
                             CHECK (type IN ('MSA','Service Agreement','Outsource Agreement',
                               'NDA','Amendment','Rate Card','SOW')),
    version                  VARCHAR(20)  DEFAULT 'v1.0',
    status                   VARCHAR(30)  DEFAULT 'active'
                             CHECK (status IN ('draft','active','expiring_soon','expired','terminated','suspended')),

    -- Dates
    signed_date              DATE,
    effective_date           DATE         NOT NULL,
    expiry_date              DATE         NOT NULL,
    renewal_alert_days       INT          DEFAULT 90,
    auto_renew               BOOLEAN      DEFAULT FALSE,
    last_renewed_at          TIMESTAMPTZ,
    renewal_count            INT          DEFAULT 0,

    -- Signatories
    signed_by_us             VARCHAR(200),
    signed_by_vendor         VARCHAR(200),
    e_signature_provider     VARCHAR(100) DEFAULT 'Manual',
    signature_hash           VARCHAR(100),

    -- Financials
    value_npr                NUMERIC(15,2) DEFAULT 0,
    currency                 CHAR(3)       DEFAULT 'NPR',

    -- Content
    key_terms                JSONB        DEFAULT '[]',
    attachments              JSONB        DEFAULT '[]',
    penalty_clauses          JSONB        DEFAULT '[]',
    amendment_history        JSONB        DEFAULT '[]',

    -- Nepal LA2074 for outsource agreements
    includes_la2074_clause   BOOLEAN      DEFAULT FALSE,
    non_core_work_only       BOOLEAN      DEFAULT FALSE,
    min_wage_guarantee       BOOLEAN      DEFAULT FALSE,
    ssf_guarantee            BOOLEAN      DEFAULT FALSE,
    co_liability_acknowledged BOOLEAN     DEFAULT FALSE,

    -- AI
    ai_risk_score            INT          DEFAULT 0 CHECK (ai_risk_score BETWEEN 0 AND 100),
    ai_recommendation        TEXT,
    ai_risk_flags            JSONB        DEFAULT '[]',

    created_at               TIMESTAMPTZ  DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  DEFAULT NOW(),
    created_by               UUID,
    approved_by              UUID,
    approved_at              TIMESTAMPTZ,
    is_deleted               BOOLEAN      DEFAULT FALSE,

    UNIQUE (company_id, code),
    CHECK (expiry_date > effective_date)
);

-- ============================================================
-- TABLE 5: VENDOR SLA (Contract Performance)
-- SMART-R KPIs, breach detection, auto penalty/bonus
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_sla (
    id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id               UUID         NOT NULL,
    vendor_id                UUID         NOT NULL REFERENCES recruitment_agencies(id),
    agreement_id             UUID         NOT NULL REFERENCES vendor_agreements(id),

    period                   VARCHAR(50)  NOT NULL,  -- e.g. "Jan-Jun 2025"
    review_frequency         VARCHAR(20)  DEFAULT 'quarterly',
    last_review_date         TIMESTAMPTZ,
    next_review_date         TIMESTAMPTZ,

    -- SMART-R KPI configuration + results
    -- Structure: [{"name":"Fill Rate","target":85,"actual":88,"unit":"%","met":true,"weight":25,"score":100}]
    kpis                     JSONB        NOT NULL DEFAULT '[]',

    -- Overall performance
    overall_score            FLOAT        CHECK (overall_score BETWEEN 0 AND 100),
    status                   VARCHAR(20)  DEFAULT 'on_track'
                             CHECK (status IN ('on_track','at_risk','breach','excellent')),
    trend                    VARCHAR(20)  DEFAULT 'stable'
                             CHECK (trend IN ('improving','stable','declining')),

    -- Breach management
    breaches                 JSONB        DEFAULT '[]',
    breach_count             INT          DEFAULT 0,
    breach_escalated         BOOLEAN      DEFAULT FALSE,
    escalated_at             TIMESTAMPTZ,
    escalated_to             VARCHAR(200),

    -- Financial consequences
    penalty_rate_pct         FLOAT        DEFAULT 5.0,
    penalties_npr            NUMERIC(12,2) DEFAULT 0,
    bonuses_npr              NUMERIC(12,2) DEFAULT 0,
    penalties_applied        BOOLEAN      DEFAULT FALSE,

    -- Nepal LA2074: SSF breach = mandatory escalation to Labour Office
    ssf_breach_detected      BOOLEAN      DEFAULT FALSE,
    ssf_breach_action_taken  BOOLEAN      DEFAULT FALSE,
    labour_office_notified   BOOLEAN      DEFAULT FALSE,

    -- AI
    ai_insight               TEXT,
    ai_recommendation        TEXT,
    ai_generated_at          TIMESTAMPTZ,

    created_at               TIMESTAMPTZ  DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  DEFAULT NOW(),
    created_by               UUID,
    is_deleted               BOOLEAN      DEFAULT FALSE,

    UNIQUE (vendor_id, agreement_id, period)
);

-- ============================================================
-- INDEXES — Vendor Management Module
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ra_company      ON recruitment_agencies(company_id)    WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ra_type         ON recruitment_agencies(type);
CREATE INDEX IF NOT EXISTS idx_ra_tier         ON recruitment_agencies(tier);
CREATE INDEX IF NOT EXISTS idx_ra_license      ON recruitment_agencies(license_no);
CREATE INDEX IF NOT EXISTS idx_ra_expiry       ON recruitment_agencies(license_expiry) WHERE license_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ra_ai_score     ON recruitment_agencies(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_ra_fts          ON recruitment_agencies USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_bgv_vendor      ON vendor_bgv(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bgv_status      ON vendor_bgv(status);
CREATE INDEX IF NOT EXISTS idx_bgv_company     ON vendor_bgv(company_id);
CREATE INDEX IF NOT EXISTS idx_bgv_renewal     ON vendor_bgv(next_renewal) WHERE next_renewal IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vr_vendor       ON vendor_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vr_company      ON vendor_reviews(company_id);

CREATE INDEX IF NOT EXISTS idx_va_company      ON vendor_agreements(company_id)      WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_va_vendor       ON vendor_agreements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_va_expiry       ON vendor_agreements(expiry_date, status);
CREATE INDEX IF NOT EXISTS idx_va_status       ON vendor_agreements(status);

CREATE INDEX IF NOT EXISTS idx_vs_company      ON vendor_sla(company_id)             WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_vs_vendor       ON vendor_sla(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vs_status       ON vendor_sla(status);
CREATE INDEX IF NOT EXISTS idx_vs_score        ON vendor_sla(overall_score)          WHERE overall_score < 75;
CREATE INDEX IF NOT EXISTS idx_vs_ssf_breach   ON vendor_sla(ssf_breach_detected)    WHERE ssf_breach_detected;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_vm_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'recruitment_agencies','vendor_bgv','vendor_agreements','vendor_sla'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_vm_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Nepal LA2074 Section 59: Warn on unlicensed agency
CREATE OR REPLACE FUNCTION fn_agency_license_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_licensed AND (NEW.license_no IS NULL OR NEW.license_no = '') THEN
        RAISE EXCEPTION 'Agency marked as licensed but no DOL license number provided. Nepal Labour Act 2074, Section 59.';
    END IF;
    IF NEW.max_service_types > 2 THEN
        RAISE WARNING 'Nepal Labour Act 2074 Section 59: Agency restricted to max 2 service types. Current value: %', NEW.max_service_types;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_agency_license
    BEFORE INSERT OR UPDATE ON recruitment_agencies
    FOR EACH ROW EXECUTE FUNCTION fn_agency_license_check();

-- Auto-update agreement status based on expiry date
CREATE OR REPLACE FUNCTION fn_agreement_status_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.expiry_date <= NOW()::DATE AND NEW.status = 'active' THEN
        NEW.status := 'expired';
    ELSIF NEW.expiry_date <= NOW()::DATE + NEW.renewal_alert_days AND NEW.status = 'active' THEN
        NEW.status := 'expiring_soon';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_agreement_status
    BEFORE INSERT OR UPDATE ON vendor_agreements
    FOR EACH ROW EXECUTE FUNCTION fn_agreement_status_check();

-- Auto-escalate critical SLA breaches
CREATE OR REPLACE FUNCTION fn_sla_breach_alert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'breach' AND OLD.status != 'breach' THEN
        -- Flag SSF breach for Nepal LA2074 Section 64 co-liability
        IF jsonb_path_exists(NEW.kpis, '$[*] ? (@.name like_regex "ssf" flag "i" && @.met == false)') THEN
            NEW.ssf_breach_detected := TRUE;
        END IF;
        -- Update agency tier to 'watch'
        UPDATE recruitment_agencies SET tier = 'watch', tier_updated_at = NOW()
        WHERE id = NEW.vendor_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_sla_breach_alert
    BEFORE UPDATE OF status ON vendor_sla
    FOR EACH ROW EXECUTE FUNCTION fn_sla_breach_alert();

-- Auto-update agency average rating when review added
CREATE OR REPLACE FUNCTION fn_update_vendor_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE recruitment_agencies SET
        ai_insights = jsonb_set(
            COALESCE(ai_insights,'{}'),
            '{avg_rating}',
            to_jsonb((SELECT ROUND(AVG(score)::NUMERIC, 1) FROM vendor_reviews WHERE vendor_id = NEW.vendor_id AND NOT is_deleted))
        )
    WHERE id = NEW.vendor_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_vendor_rating
    AFTER INSERT OR UPDATE ON vendor_reviews
    FOR EACH ROW EXECUTE FUNCTION fn_update_vendor_rating();

-- ============================================================
-- VIEWS
-- ============================================================

-- Vendor compliance dashboard (Nepal LA2074 obligations)
CREATE OR REPLACE VIEW v_vendor_la2074_compliance AS
SELECT
    ra.code,
    ra.name,
    ra.type,
    ra.tier,
    ra.license_no,
    CASE WHEN ra.license_expiry < NOW()::DATE     THEN 'EXPIRED'
         WHEN ra.license_expiry < NOW()::DATE + 90 THEN 'EXPIRING_SOON'
         WHEN ra.is_licensed                       THEN 'VALID'
         ELSE 'NOT_LICENSED' END                                    AS license_status,
    ra.ssf_registered,
    ra.insurance_valid,
    ra.is_verified,
    -- BGV status
    vb.status                                                        AS latest_bgv_status,
    vb.overall_risk                                                  AS bgv_risk,
    -- Agreement
    va.expiry_date                                                   AS agreement_expiry,
    EXTRACT(DAY FROM va.expiry_date - NOW())::INT                   AS agreement_days_remaining,
    -- SLA
    vs.overall_score                                                 AS sla_score,
    vs.status                                                        AS sla_status,
    vs.breach_count,
    vs.ssf_breach_detected,
    -- Overall risk
    CASE WHEN NOT ra.is_licensed                  THEN 'CRITICAL'
         WHEN vs.ssf_breach_detected               THEN 'CRITICAL'
         WHEN vs.status = 'breach'                 THEN 'HIGH'
         WHEN ra.tier = 'watch'                    THEN 'HIGH'
         WHEN vb.overall_risk = 'high'             THEN 'HIGH'
         WHEN ra.tier = 'preferred' AND vs.overall_score >= 90 THEN 'LOW'
         ELSE 'MEDIUM' END                                           AS overall_risk,
    ra.company_id
FROM recruitment_agencies ra
LEFT JOIN vendor_bgv vb ON vb.vendor_id = ra.id AND vb.created_at = (
    SELECT MAX(v2.created_at) FROM vendor_bgv v2 WHERE v2.vendor_id = ra.id)
LEFT JOIN vendor_agreements va ON va.vendor_id = ra.id AND va.status = 'active'
    AND va.created_at = (SELECT MAX(v3.created_at) FROM vendor_agreements v3 WHERE v3.vendor_id = ra.id AND v3.status = 'active')
LEFT JOIN vendor_sla vs ON vs.vendor_id = ra.id
    AND vs.created_at = (SELECT MAX(v4.created_at) FROM vendor_sla v4 WHERE v4.vendor_id = ra.id)
WHERE NOT ra.is_deleted
ORDER BY CASE WHEN NOT ra.is_licensed THEN 0 WHEN vs.ssf_breach_detected THEN 1 ELSE 2 END;

-- Agreement expiry calendar
CREATE OR REPLACE VIEW v_agreement_expiry_calendar AS
SELECT
    va.code, va.type, va.expiry_date, va.renewal_alert_days, va.auto_renew,
    EXTRACT(DAY FROM va.expiry_date - NOW())::INT AS days_remaining,
    CASE WHEN EXTRACT(DAY FROM va.expiry_date - NOW()) < 0  THEN 'EXPIRED'
         WHEN EXTRACT(DAY FROM va.expiry_date - NOW()) <= 30 THEN 'CRITICAL'
         WHEN EXTRACT(DAY FROM va.expiry_date - NOW()) <= 60 THEN 'URGENT'
         WHEN EXTRACT(DAY FROM va.expiry_date - NOW()) <= 90 THEN 'WARNING'
         ELSE 'OK' END AS urgency,
    ra.name AS vendor_name, ra.code AS vendor_code, va.company_id
FROM vendor_agreements va
JOIN recruitment_agencies ra ON ra.id = va.vendor_id
WHERE va.status IN ('active','expiring_soon') AND NOT va.is_deleted
ORDER BY va.expiry_date ASC;

-- SLA breach escalation queue
CREATE OR REPLACE VIEW v_sla_breach_queue AS
SELECT
    ra.name AS vendor_name, ra.code AS vendor_code,
    vs.period, vs.overall_score, vs.status, vs.breach_count,
    vs.penalties_npr, vs.ssf_breach_detected, vs.labour_office_notified,
    vs.ai_recommendation,
    CASE WHEN vs.ssf_breach_detected AND NOT vs.labour_office_notified THEN 'NOTIFY_LABOUR_OFFICE'
         WHEN vs.breach_count >= 3                                       THEN 'CONSIDER_TERMINATION'
         WHEN vs.status = 'breach'                                       THEN 'APPLY_PENALTY'
         ELSE 'MONITOR' END AS action_required,
    ra.company_id
FROM vendor_sla vs
JOIN recruitment_agencies ra ON ra.id = vs.vendor_id
WHERE vs.status IN ('breach','at_risk') AND NOT vs.is_deleted
ORDER BY vs.ssf_breach_detected DESC, vs.overall_score ASC;
