-- ================================================================
-- FILE: database/schemas/government_letters_schema.sql
-- NepHR Pro — Workforce Operations > Letters Module (5 pages)
-- B2G (Business-to-Government) correspondence tracking.
--
-- Design note: this is distinct from hr_letter_templates/hr_letters
-- (employee_documents_schema.sql), which handles employee-facing letters
-- (offer, promotion, warning). This schema covers OUTBOUND letters TO
-- government bodies — SSF, CIT, Labour Department, Tax Department, and
-- other entities (OCR, Nepal Rastra Bank, Department of Industry,
-- municipal/ward offices, immigration).
--
--   1. ssf_correspondence       (employer registration, enrollment within
--                                3mo, updates, separation/withdrawal, disputes)
--   2. cit_correspondence       (account opening, contributions, loans,
--                                claims/withdrawal, detail updates)
--   3. labour_dept_correspondence (work permits, retrenchment 30-day notice,
--                                outsourcing reports, disputes, audits)
--   4. tax_dept_correspondence  (closure/deregistration, deadline extension,
--                                tax clearance, corrections, refunds, appeals)
--   5. other_govt_correspondence (OCR, NRB, DOI, municipal, immigration)
--
-- Nepal Labour Act 2074 / Social Security Act 2074 / Income Tax Act 2058:
-- SSF enrollment within 3 months of hire, 30-day retrenchment notice,
-- tax dispute appeal window 30 days, work permit prerequisite for foreign
-- hires (local-vacancy-first rule).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- SHARED STATUS ENUM (used across all 5 correspondence tables)
-- draft -> submitted -> under_review -> acknowledged (or rejected)
-- ================================================================

-- ================================================================
-- 1. SSF CORRESPONDENCE
-- ================================================================
CREATE TABLE IF NOT EXISTS ssf_correspondence (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       REFERENCES employees(id),  -- NULL for employer-level letters

    letter_type                 VARCHAR(30) NOT NULL
                                CHECK (letter_type IN ('employer_registration','employee_enrollment',
                                  'data_update','separation_withdrawal','dispute_refund')),
    subject                        VARCHAR(300) NOT NULL,
    reference_no                      VARCHAR(100),
    body_text                            TEXT,

    -- SSF-specific identifiers
    ssf_employer_id                         VARCHAR(50),
    employee_ssf_no                            VARCHAR(50),

    -- Statutory deadline: employee enrollment within 3 months of hire (Social Security Act)
    employee_hire_date                            DATE,
    enrollment_deadline                              DATE GENERATED ALWAYS AS (
                                                       employee_hire_date + INTERVAL '3 months'
                                                     ) STORED,

    date_sent                                           DATE,
    response_deadline                                      DATE,
    response_received                                         BOOLEAN DEFAULT FALSE,
    response_received_date                                       DATE,
    response_notes                                                  TEXT,

    status                                                             VARCHAR(20) DEFAULT 'draft'
                                                                       CHECK (status IN ('draft','submitted','under_review','acknowledged','rejected')),

    document_url                                                          VARCHAR(500),
    acknowledgment_document_url                                              VARCHAR(500),

    created_by                                                                  UUID,
    created_at                                                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                       TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                         BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 2. CIT CORRESPONDENCE
-- ================================================================
CREATE TABLE IF NOT EXISTS cit_correspondence (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       REFERENCES employees(id),

    letter_type                 VARCHAR(30) NOT NULL
                                CHECK (letter_type IN ('account_opening','fund_contribution',
                                  'loan_approval','claim_withdrawal','detail_update')),
    subject                        VARCHAR(300) NOT NULL,
    reference_no                      VARCHAR(100),
    body_text                            TEXT,

    -- CIT-specific identifiers
    cit_account_no                          VARCHAR(50),
    contribution_amount_npr                    NUMERIC(12,2),
    loan_amount_requested_npr                     NUMERIC(12,2),  -- for loan_approval type
    nominee_name                                     VARCHAR(200),  -- for detail_update (beneficiary changes)

    date_sent                                           DATE,
    response_deadline                                      DATE,
    response_received                                         BOOLEAN DEFAULT FALSE,
    response_received_date                                       DATE,
    response_notes                                                  TEXT,

    status                                                             VARCHAR(20) DEFAULT 'draft'
                                                                       CHECK (status IN ('draft','submitted','under_review','acknowledged','rejected')),

    document_url                                                          VARCHAR(500),
    acknowledgment_document_url                                              VARCHAR(500),

    created_by                                                                  UUID,
    created_at                                                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                       TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                         BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 3. LABOUR DEPARTMENT CORRESPONDENCE
-- ================================================================
CREATE TABLE IF NOT EXISTS labour_dept_correspondence (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       REFERENCES employees(id),  -- e.g. for foreign-hire work permits

    letter_type                 VARCHAR(30) NOT NULL
                                CHECK (letter_type IN ('foreign_work_permit','mass_retrenchment',
                                  'outsourcing_report','dispute_resolution','labour_audit_report')),
    subject                        VARCHAR(300) NOT NULL,
    reference_no                      VARCHAR(100),
    body_text                            TEXT,

    -- Mass retrenchment: LA2074 requires 30-day advance written notice
    retrenchment_notice_date                DATE,
    retrenchment_effective_date                DATE,
    notice_period_days                            INT GENERATED ALWAYS AS (
                                                    CASE WHEN retrenchment_effective_date IS NOT NULL AND retrenchment_notice_date IS NOT NULL
                                                      THEN (retrenchment_effective_date - retrenchment_notice_date)
                                                      ELSE NULL END
                                                  ) STORED,
    meets_30day_requirement                              BOOLEAN GENERATED ALWAYS AS (
                                                            retrenchment_effective_date IS NULL OR retrenchment_notice_date IS NULL OR
                                                            (retrenchment_effective_date - retrenchment_notice_date) >= 30
                                                          ) STORED,
    affected_employee_count                                 INT,

    -- Foreign work permit specific
    local_vacancy_advertised                                  BOOLEAN DEFAULT FALSE,  -- LA2074: must advertise locally first
    work_permit_no                                                VARCHAR(50),

    date_sent                                                        DATE,
    response_deadline                                                   DATE,
    response_received                                                      BOOLEAN DEFAULT FALSE,
    response_received_date                                                    DATE,
    response_notes                                                               TEXT,

    status                                                                          VARCHAR(20) DEFAULT 'draft'
                                                                                    CHECK (status IN ('draft','submitted','under_review','acknowledged','rejected')),

    document_url                                                                       VARCHAR(500),
    acknowledgment_document_url                                                           VARCHAR(500),

    created_by                                                                               UUID,
    created_at                                                                                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                    TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                                      BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 4. TAX DEPARTMENT CORRESPONDENCE
-- ================================================================
CREATE TABLE IF NOT EXISTS tax_dept_correspondence (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    letter_type                 VARCHAR(30) NOT NULL
                                CHECK (letter_type IN ('closure_deregistration','deadline_extension',
                                  'tax_clearance','revision_correction','refund_adjustment','administrative_appeal')),
    subject                        VARCHAR(300) NOT NULL,
    reference_no                      VARCHAR(100),
    body_text                            TEXT,

    fiscal_year                             VARCHAR(20),
    tax_amount_npr                             NUMERIC(14,2),  -- relevant for refund/correction/appeal

    -- Administrative appeal: 30-day window from assessment (Income Tax Act)
    assessment_date                               DATE,
    appeal_deadline                                  DATE GENERATED ALWAYS AS (assessment_date + INTERVAL '30 days') STORED,

    -- Annual filing: due within 3 months of fiscal year end
    fiscal_year_end_date                                DATE,
    filing_deadline                                        DATE GENERATED ALWAYS AS (fiscal_year_end_date + INTERVAL '3 months') STORED,

    date_sent                                                 DATE,
    response_deadline                                            DATE,
    response_received                                              BOOLEAN DEFAULT FALSE,
    response_received_date                                            DATE,
    response_notes                                                       TEXT,

    -- Tax Clearance Certificate specific (needed for govt bids, loans, license renewal)
    clearance_certificate_issued                                            BOOLEAN DEFAULT FALSE,
    clearance_certificate_url                                                  VARCHAR(500),

    status                                                                        VARCHAR(20) DEFAULT 'draft'
                                                                                  CHECK (status IN ('draft','submitted','under_review','acknowledged','rejected')),

    document_url                                                                     VARCHAR(500),
    acknowledgment_document_url                                                         VARCHAR(500),

    created_by                                                                             UUID,
    created_at                                                                                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                  TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                                    BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 5. OTHER GOVERNMENT ENTITIES CORRESPONDENCE
-- ================================================================
CREATE TABLE IF NOT EXISTS other_govt_correspondence (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       REFERENCES employees(id),  -- e.g. immigration work permits

    entity_type                 VARCHAR(30) NOT NULL
                                CHECK (entity_type IN ('ocr','nrb','doi','municipal','immigration','other')),
    entity_name_custom             VARCHAR(200),  -- free text if entity_type = 'other'

    subject                          VARCHAR(300) NOT NULL,
    reference_no                        VARCHAR(100),
    body_text                              TEXT,
    purpose                                   VARCHAR(50)
                                              CHECK (purpose IN ('licensing_approval','annual_compliance_filing',
                                                'fdi_repatriation','operational_permit','dispute_resolution','other')),

    date_sent                                    DATE,
    response_deadline                               DATE,
    response_received                                  BOOLEAN DEFAULT FALSE,
    response_received_date                                DATE,
    response_notes                                           TEXT,

    status                                                      VARCHAR(20) DEFAULT 'draft'
                                                                CHECK (status IN ('draft','submitted','under_review','acknowledged','rejected')),

    document_url                                                   VARCHAR(500),
    acknowledgment_document_url                                       VARCHAR(500),

    created_by                                                           UUID,
    created_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                  BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ssf_company         ON ssf_correspondence(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ssf_employee           ON ssf_correspondence(employee_id);
CREATE INDEX IF NOT EXISTS idx_ssf_status               ON ssf_correspondence(status);
CREATE INDEX IF NOT EXISTS idx_ssf_enrollment_deadline     ON ssf_correspondence(enrollment_deadline) WHERE letter_type = 'employee_enrollment' AND status != 'acknowledged';

CREATE INDEX IF NOT EXISTS idx_cit_company                   ON cit_correspondence(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_cit_employee                     ON cit_correspondence(employee_id);
CREATE INDEX IF NOT EXISTS idx_cit_status                         ON cit_correspondence(status);

CREATE INDEX IF NOT EXISTS idx_ld_company                           ON labour_dept_correspondence(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ld_status                               ON labour_dept_correspondence(status);
CREATE INDEX IF NOT EXISTS idx_ld_retrenchment_compliance                 ON labour_dept_correspondence(meets_30day_requirement) WHERE NOT meets_30day_requirement;

CREATE INDEX IF NOT EXISTS idx_td_company                                   ON tax_dept_correspondence(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_td_status                                       ON tax_dept_correspondence(status);
CREATE INDEX IF NOT EXISTS idx_td_appeal_deadline                                 ON tax_dept_correspondence(appeal_deadline) WHERE letter_type = 'administrative_appeal';
CREATE INDEX IF NOT EXISTS idx_td_filing_deadline                                   ON tax_dept_correspondence(filing_deadline);

CREATE INDEX IF NOT EXISTS idx_og_company                                              ON other_govt_correspondence(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_og_entity_type                                            ON other_govt_correspondence(entity_type);
CREATE INDEX IF NOT EXISTS idx_og_status                                                    ON other_govt_correspondence(status);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_govt_letters_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'ssf_correspondence','cit_correspondence','labour_dept_correspondence',
  'tax_dept_correspondence','other_govt_correspondence'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_govt_letters_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-mark response_received_date when response_received flips to TRUE
CREATE OR REPLACE FUNCTION fn_govt_response_received()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.response_received AND NOT OLD.response_received THEN
        NEW.response_received_date := CURRENT_DATE;
        NEW.status := 'acknowledged';
    END IF;
    RETURN NEW;
END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'ssf_correspondence','cit_correspondence','labour_dept_correspondence',
  'tax_dept_correspondence','other_govt_correspondence'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_response ON %s;
     CREATE TRIGGER trg_%s_response BEFORE UPDATE OF response_received ON %s FOR EACH ROW EXECUTE FUNCTION fn_govt_response_received()',
    t,t,t,t);
END LOOP; END$$;

-- LA2074: warn if retrenchment notice period < 30 days
CREATE OR REPLACE FUNCTION fn_retrenchment_notice_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.letter_type = 'mass_retrenchment' AND NOT NEW.meets_30day_requirement AND NEW.status != 'draft' THEN
        RAISE WARNING 'Retrenchment notice period is less than the legally required 30 days per Nepal Labour Act 2074.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_retrenchment_notice
    BEFORE INSERT OR UPDATE ON labour_dept_correspondence
    FOR EACH ROW EXECUTE FUNCTION fn_retrenchment_notice_check();

-- ================================================================
-- VIEWS
-- ================================================================

-- Unified compliance dashboard across all 5 government correspondence types
CREATE OR REPLACE VIEW v_government_letters_dashboard AS
SELECT 'ssf' AS module, letter_type, subject, reference_no, date_sent, response_deadline,
       response_received, status, company_id FROM ssf_correspondence WHERE NOT is_deleted
UNION ALL
SELECT 'cit' AS module, letter_type, subject, reference_no, date_sent, response_deadline,
       response_received, status, company_id FROM cit_correspondence WHERE NOT is_deleted
UNION ALL
SELECT 'labour_dept' AS module, letter_type, subject, reference_no, date_sent, response_deadline,
       response_received, status, company_id FROM labour_dept_correspondence WHERE NOT is_deleted
UNION ALL
SELECT 'tax_dept' AS module, letter_type, subject, reference_no, date_sent, response_deadline,
       response_received, status, company_id FROM tax_dept_correspondence WHERE NOT is_deleted
UNION ALL
SELECT 'other_govt' AS module, entity_type AS letter_type, subject, reference_no, date_sent, response_deadline,
       response_received, status, company_id FROM other_govt_correspondence WHERE NOT is_deleted
ORDER BY date_sent DESC NULLS LAST;

-- SSF: employees approaching the 3-month enrollment deadline
CREATE OR REPLACE VIEW v_ssf_enrollment_deadlines AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    s.employee_hire_date, s.enrollment_deadline,
    (s.enrollment_deadline - CURRENT_DATE) AS days_remaining,
    s.status, s.company_id
FROM ssf_correspondence s
JOIN employees e ON s.employee_id = e.id
WHERE s.letter_type = 'employee_enrollment' AND s.status != 'acknowledged' AND NOT s.is_deleted
ORDER BY s.enrollment_deadline ASC;

-- Tax Department: upcoming filing and appeal deadlines
CREATE OR REPLACE VIEW v_tax_deadline_tracker AS
SELECT
    letter_type, subject, fiscal_year,
    COALESCE(filing_deadline, appeal_deadline) AS deadline,
    (COALESCE(filing_deadline, appeal_deadline) - CURRENT_DATE) AS days_remaining,
    status, company_id
FROM tax_dept_correspondence
WHERE status != 'acknowledged' AND NOT is_deleted
  AND (filing_deadline IS NOT NULL OR appeal_deadline IS NOT NULL)
ORDER BY deadline ASC;

-- Labour Department: retrenchment notices not meeting 30-day requirement (compliance risk)
CREATE OR REPLACE VIEW v_retrenchment_compliance_risk AS
SELECT
    subject, retrenchment_notice_date, retrenchment_effective_date, notice_period_days,
    affected_employee_count, company_id
FROM labour_dept_correspondence
WHERE letter_type = 'mass_retrenchment' AND NOT meets_30day_requirement AND NOT is_deleted;

-- Cross-module pending response queue (HR action items)
CREATE OR REPLACE VIEW v_pending_government_responses AS
SELECT * FROM v_government_letters_dashboard
WHERE NOT response_received AND status IN ('submitted', 'under_review')
ORDER BY response_deadline ASC NULLS LAST;
