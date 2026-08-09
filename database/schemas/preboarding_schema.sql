-- ================================================================
-- FILE: database/schemas/preboarding_schema.sql
-- NepHR Pro — Onboarding > Preboarding Module Schema
-- Covers all 5 pages:
--   1. preboarding_offers       (Offer Acceptance)
--   2. biometric_captures       (Biometric Capture)
--   3. document_submissions     (Document Collection)
--   4. digital_form_signatures  (Digital Forms & E-sign)
--   5. joining_checklist_items  (Joining Checklist)
-- Nepal Labour Act 2074 Section 10 + Electronic Transactions Act 2063
-- + SSF enrollment + DoFE/Immigration biometric rules for foreign nationals.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. PREBOARDING OFFERS (Offer Acceptance)
-- Links to recruitment.offers (1:1 extension for preboarding-specific tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS preboarding_offers (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    offer_id                 UUID       REFERENCES offers(id),  -- links to recruitment module
    candidate_id                UUID,

    code                          VARCHAR(50) NOT NULL,  -- OFR-2025-014
    candidate_name                  VARCHAR(200) NOT NULL,
    position                          VARCHAR(200),
    department_id                       UUID,
    branch_id                             UUID,

    employment_type                         VARCHAR(30) DEFAULT 'regular',
    salary_npr                                 NUMERIC(12,2),
    probation_months                             INT DEFAULT 6 CHECK (probation_months <= 6),

    offer_sent_date                                TIMESTAMPTZ,
    response_deadline                                 DATE,

    status                                              VARCHAR(30) DEFAULT 'pending_response'
                                                        CHECK (status IN ('pending_response','accepted','declined','expired')),

    -- Secondary auth (OTP) on accept
    otp_verified                                            BOOLEAN DEFAULT FALSE,
    otp_code_hash                                              VARCHAR(255),
    otp_verified_at                                              TIMESTAMPTZ,

    -- Engagement tracking
    viewed_count                                                    INT DEFAULT 0,
    last_viewed_at                                                    TIMESTAMPTZ,

    -- e-Sign provider integration (DocuSign/PandaDoc)
    esign_provider                                                       VARCHAR(50) DEFAULT 'DocuSign',
    esign_status                                                           VARCHAR(30) DEFAULT 'sent'
                                                                           CHECK (esign_status IN ('sent','viewed','completed','declined','voided')),
    esign_document_url                                                       VARCHAR(500),

    accepted_date                                                              TIMESTAMPTZ,
    declined_reason                                                              TEXT,

    -- Tamper-evident audit trail (Nepal Electronic Transactions Act 2063)
    audit_trail                                                                    JSONB DEFAULT '[]',
    -- [{"event":"Offer Generated","date":"..","by":".."}, ...]

    -- AI engagement scoring
    ai_score                                                                          FLOAT DEFAULT 0,
    ai_note                                                                            TEXT,

    created_at                                                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                           TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                            UUID,
    is_deleted                                                                             BOOLEAN DEFAULT FALSE,

    UNIQUE (company_id, code),
    CONSTRAINT ck_pbo_probation CHECK (probation_months <= 6)
);

-- ================================================================
-- 2. BIOMETRIC CAPTURES
-- Optional for domestic hires; MANDATORY for foreign nationals (DoFE/Immigration)
-- ================================================================
CREATE TABLE IF NOT EXISTS biometric_captures (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID,      -- pre-generated employee_id from offer acceptance
    preboarding_offer_id        UUID    REFERENCES preboarding_offers(id),

    full_name                     VARCHAR(200) NOT NULL,
    nationality                      VARCHAR(50) DEFAULT 'Nepali',
    is_foreign_national                 BOOLEAN GENERATED ALWAYS AS (nationality != 'Nepali') STORED,

    capture_type                          VARCHAR(30) DEFAULT 'facial'
                                          CHECK (capture_type IN ('facial','fingerprint','facial+fingerprint','iris')),

    facial_status                            VARCHAR(20) DEFAULT 'pending'
                                             CHECK (facial_status IN ('pending','verified','failed','spoofed')),
    fingerprint_status                          VARCHAR(20) DEFAULT 'pending'
                                                CHECK (fingerprint_status IN ('pending','verified','failed','not_applicable')),
    liveness_check                                 VARCHAR(20) DEFAULT 'pending'
                                                   CHECK (liveness_check IN ('pending','passed','failed')),

    -- Consent (mandatory before capture per privacy law)
    consent_given                                       BOOLEAN NOT NULL DEFAULT FALSE,
    consent_date                                           TIMESTAMPTZ,
    consent_document_url                                     VARCHAR(500),

    capture_date                                               TIMESTAMPTZ,
    facial_image_url                                              VARCHAR(500),
    fingerprint_template_hash                                        VARCHAR(255),  -- never store raw biometric

    -- DoFE / Immigration mandatory for foreign nationals
    dofe_verification_required                                          BOOLEAN GENERATED ALWAYS AS (nationality != 'Nepali') STORED,
    dofe_verification_status                                              VARCHAR(30) DEFAULT 'not_required',
    medical_test_required                                                   BOOLEAN DEFAULT FALSE,
    medical_test_status                                                       VARCHAR(30),

    -- Sync to attendance/time-tracking module
    synced_to_attendance                                                          BOOLEAN DEFAULT FALSE,
    synced_at                                                                       TIMESTAMPTZ,

    ai_match_confidence_pct                                                            FLOAT,
    ai_spoofing_risk_score                                                               FLOAT DEFAULT 0,

    created_at                                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                               TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                                UUID,
    is_deleted                                                                                 BOOLEAN DEFAULT FALSE,

    CONSTRAINT ck_biometric_consent CHECK (capture_date IS NULL OR consent_given = TRUE)
);

-- ================================================================
-- 3. DOCUMENT SUBMISSIONS (Document Collection)
-- ================================================================
CREATE TABLE IF NOT EXISTS document_submissions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    preboarding_offer_id      UUID      REFERENCES preboarding_offers(id),
    employee_id                 UUID,

    document_type                 VARCHAR(50) NOT NULL
                                  CHECK (document_type IN (
                                    'citizenship','pan','academic','experience','bank_details',
                                    'photo','passport','medical_certificate','police_clearance','other')),
    document_label                   VARCHAR(200),
    is_mandatory                        BOOLEAN DEFAULT TRUE,

    file_url                               VARCHAR(500),
    file_name                                 VARCHAR(255),
    file_size_kb                                INT,
    uploaded_at                                   TIMESTAMPTZ,

    -- OCR extraction (auto data-fill)
    ocr_processed                                    BOOLEAN DEFAULT FALSE,
    ocr_extracted_data                                  JSONB DEFAULT '{}',
    ocr_confidence_pct                                     FLOAT,

    status                                                    VARCHAR(20) DEFAULT 'missing'
                                                              CHECK (status IN ('missing','uploaded','processing','approved','rejected')),
    rejection_reason                                             TEXT,
    reviewed_by                                                     UUID,
    reviewed_at                                                       TIMESTAMPTZ,

    -- Nepal Labour Act 2074: employer register requirement
    used_for_employer_register                                          BOOLEAN DEFAULT FALSE,
    used_for_ssf_enrollment                                                 BOOLEAN DEFAULT FALSE,

    created_at                                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                  TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                   BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 4. DIGITAL FORM SIGNATURES (Digital Forms & E-sign)
-- ================================================================
CREATE TABLE IF NOT EXISTS digital_form_signatures (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    preboarding_offer_id      UUID      REFERENCES preboarding_offers(id),
    employee_id                 UUID,

    form_type                     VARCHAR(50) NOT NULL
                                  CHECK (form_type IN (
                                    'employment_contract','nda','handbook_ack','tax_declaration',
                                    'bank_mandate','code_of_conduct','it_policy_ack','other')),
    form_label                       VARCHAR(200),
    is_mandatory                        BOOLEAN DEFAULT TRUE,
    sequence_order                         INT DEFAULT 1,  -- step-by-step wizard order

    -- Pre-population from candidate data (no redundant entry)
    prefilled_data                            JSONB DEFAULT '{}',

    document_url                                 VARCHAR(500),
    signed_document_url                             VARCHAR(500),

    status                                            VARCHAR(20) DEFAULT 'pending'
                                                      CHECK (status IN ('pending','viewed','signed','declined')),

    -- e-Signature audit (Nepal Electronic Transactions Act 2063: legally equal to physical)
    signature_method                                     VARCHAR(30) DEFAULT 'click_to_sign'
                                                         CHECK (signature_method IN ('click_to_sign','drawn','typed','otp_verified')),
    signed_at                                               TIMESTAMPTZ,
    signer_ip_address                                          VARCHAR(50),
    signer_device_info                                            VARCHAR(255),

    -- Downstream trigger
    triggers_it_provisioning                                          BOOLEAN DEFAULT FALSE,
    triggers_facilities_provisioning                                     BOOLEAN DEFAULT FALSE,

    created_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                               TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 5. JOINING CHECKLIST ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS joining_checklist_items (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    preboarding_offer_id      UUID      REFERENCES preboarding_offers(id),
    employee_id                 UUID,

    title                          VARCHAR(300) NOT NULL,
    responsible_dept                 VARCHAR(30) NOT NULL
                                     CHECK (responsible_dept IN ('hr','it','facilities','finance','manager')),
    responsible_person_id               UUID,
    responsible_person_name               VARCHAR(200),

    due_date                                DATE,
    completed                                  BOOLEAN DEFAULT FALSE,
    completed_date                                DATE,
    completed_by                                    UUID,

    -- Dependency chain (task B can't start until task A done)
    depends_on_item_id                                 UUID REFERENCES joining_checklist_items(id),

    -- Auto-provisioning links
    auto_trigger_type                                     VARCHAR(50),  -- e.g. 'it_account_creation','asset_assignment'
    auto_trigger_completed                                   BOOLEAN DEFAULT FALSE,

    display_order                                               INT DEFAULT 0,

    created_at                                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                       BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_pbo_company        ON preboarding_offers(company_id)      WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pbo_status           ON preboarding_offers(status);
CREATE INDEX IF NOT EXISTS idx_pbo_deadline           ON preboarding_offers(response_deadline) WHERE status = 'pending_response';

CREATE INDEX IF NOT EXISTS idx_bc_company              ON biometric_captures(company_id)    WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_bc_foreign                ON biometric_captures(is_foreign_national) WHERE is_foreign_national;
CREATE INDEX IF NOT EXISTS idx_bc_consent                  ON biometric_captures(consent_given) WHERE NOT consent_given;

CREATE INDEX IF NOT EXISTS idx_ds_offer                     ON document_submissions(preboarding_offer_id);
CREATE INDEX IF NOT EXISTS idx_ds_status                      ON document_submissions(status);
CREATE INDEX IF NOT EXISTS idx_ds_missing                       ON document_submissions(status) WHERE status = 'missing' AND is_mandatory;

CREATE INDEX IF NOT EXISTS idx_dfs_offer                          ON digital_form_signatures(preboarding_offer_id);
CREATE INDEX IF NOT EXISTS idx_dfs_status                           ON digital_form_signatures(status);

CREATE INDEX IF NOT EXISTS idx_jci_offer                              ON joining_checklist_items(preboarding_offer_id);
CREATE INDEX IF NOT EXISTS idx_jci_dept                                 ON joining_checklist_items(responsible_dept);
CREATE INDEX IF NOT EXISTS idx_jci_pending                                ON joining_checklist_items(completed) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_jci_due                                      ON joining_checklist_items(due_date) WHERE NOT completed;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_preboard_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'preboarding_offers','biometric_captures','document_submissions',
  'digital_form_signatures','joining_checklist_items'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_preboard_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Block biometric capture without consent (privacy law)
CREATE OR REPLACE FUNCTION fn_biometric_consent_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.capture_date IS NOT NULL AND NOT NEW.consent_given THEN
        RAISE EXCEPTION 'Biometric capture cannot proceed without documented consent.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_biometric_consent
    BEFORE INSERT OR UPDATE ON biometric_captures
    FOR EACH ROW EXECUTE FUNCTION fn_biometric_consent_gate();

-- Nepal LA2074 Section 10: probation max 6 months on offer
CREATE OR REPLACE FUNCTION fn_offer_probation_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.probation_months > 6 THEN
        RAISE EXCEPTION 'Probation period cannot exceed 6 months per Nepal Labour Act 2074 Section 10.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_pbo_probation
    BEFORE INSERT OR UPDATE ON preboarding_offers
    FOR EACH ROW EXECUTE FUNCTION fn_offer_probation_check();

-- Auto-mark dependent checklist items blocked until prerequisite done
CREATE OR REPLACE FUNCTION fn_checklist_dependency_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.completed AND NEW.depends_on_item_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM joining_checklist_items
            WHERE id = NEW.depends_on_item_id AND completed = TRUE
        ) THEN
            RAISE EXCEPTION 'Cannot complete this task — prerequisite task is not yet done.';
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_checklist_dependency
    BEFORE UPDATE OF completed ON joining_checklist_items
    FOR EACH ROW EXECUTE FUNCTION fn_checklist_dependency_check();

-- Auto-trigger document review pipeline on upload
CREATE OR REPLACE FUNCTION fn_document_uploaded()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.file_url IS NOT NULL AND OLD.file_url IS NULL THEN
        NEW.status := 'processing';
        NEW.uploaded_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_document_upload
    BEFORE UPDATE OF file_url ON document_submissions
    FOR EACH ROW EXECUTE FUNCTION fn_document_uploaded();

-- ================================================================
-- VIEWS
-- ================================================================

-- Preboarding pipeline overview
CREATE OR REPLACE VIEW v_preboarding_pipeline AS
SELECT
    po.code, po.candidate_name, po.position, po.status AS offer_status,
    po.offer_sent_date, po.response_deadline,
    EXTRACT(DAY FROM po.response_deadline - NOW()::DATE)::INT AS days_to_deadline,
    (SELECT COUNT(*) FILTER (WHERE status='approved') FROM document_submissions WHERE preboarding_offer_id = po.id) AS docs_approved,
    (SELECT COUNT(*) FROM document_submissions WHERE preboarding_offer_id = po.id AND is_mandatory) AS docs_required,
    (SELECT COUNT(*) FILTER (WHERE status='signed') FROM digital_form_signatures WHERE preboarding_offer_id = po.id) AS forms_signed,
    (SELECT COUNT(*) FROM digital_form_signatures WHERE preboarding_offer_id = po.id AND is_mandatory) AS forms_required,
    (SELECT COUNT(*) FILTER (WHERE completed) FROM joining_checklist_items WHERE preboarding_offer_id = po.id) AS tasks_done,
    (SELECT COUNT(*) FROM joining_checklist_items WHERE preboarding_offer_id = po.id) AS tasks_total,
    po.company_id
FROM preboarding_offers po
WHERE NOT po.is_deleted
ORDER BY po.offer_sent_date DESC;

-- Department task load (cross-department coordination view)
CREATE OR REPLACE VIEW v_checklist_dept_load AS
SELECT
    responsible_dept,
    COUNT(*)                                    AS total_tasks,
    COUNT(*) FILTER (WHERE completed)          AS completed_tasks,
    COUNT(*) FILTER (WHERE NOT completed AND due_date < CURRENT_DATE) AS overdue_tasks,
    company_id
FROM joining_checklist_items
WHERE NOT is_deleted
GROUP BY responsible_dept, company_id
ORDER BY overdue_tasks DESC;

-- Foreign national biometric/DoFE compliance
CREATE OR REPLACE VIEW v_foreign_national_compliance AS
SELECT
    full_name, nationality, facial_status, liveness_check,
    dofe_verification_status, medical_test_status,
    consent_given, capture_date, company_id
FROM biometric_captures
WHERE is_foreign_national AND NOT is_deleted
ORDER BY dofe_verification_status;

-- At-risk new hires (low completion %, close join date)
CREATE OR REPLACE VIEW v_at_risk_new_hires AS
SELECT
    po.candidate_name, po.position, po.offer_sent_date,
    pp.tasks_done, pp.tasks_total,
    ROUND(pp.tasks_done::NUMERIC / NULLIF(pp.tasks_total,0) * 100, 1) AS completion_pct,
    po.company_id
FROM v_preboarding_pipeline pp
JOIN preboarding_offers po ON po.code = pp.code
WHERE pp.tasks_total > 0
  AND (pp.tasks_done::NUMERIC / NULLIF(pp.tasks_total,0)) < 0.5
ORDER BY completion_pct ASC;
