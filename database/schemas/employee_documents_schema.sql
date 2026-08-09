-- ================================================================
-- FILE: database/schemas/employee_documents_schema.sql
-- NepHR Pro — Employee Records > Employee Documents Module (4 pages)
--   1. employee_documents          (Document Management — OCR/RBAC/retention)
--   2. employee_contracts          (Contract Management AI-Driven)
--   3. document_audit_log          (Digital Employee File — access trail)
--   4. hr_letter_templates + hr_letters (AI-Driven HR Letters, bilingual)
--
-- Nepal Labour Act 2074: 5-year record retention post-employment,
-- mandatory written contract clauses, Electronic Transactions Act 2063
-- (e-signature legal validity), Nepali/English bilingual legal accuracy.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. EMPLOYEE DOCUMENTS (Document Management)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_documents (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    file_name                  VARCHAR(300) NOT NULL,
    file_url                      VARCHAR(500) NOT NULL,
    file_size_kb                     INT,
    category                            VARCHAR(30) NOT NULL
                                        CHECK (category IN ('tax_forms','certificates','contracts',
                                          'nda','id_proof','medical','other')),
    tags                                   JSONB DEFAULT '[]',

    -- OCR / NLP pipeline
    ocr_processed                              BOOLEAN DEFAULT FALSE,
    ocr_extracted_text                            TEXT,  -- full text, enables federated search
    ocr_confidence_pct                               FLOAT,
    auto_tagged                                         BOOLEAN DEFAULT FALSE,

    -- RBAC
    access_level                                           VARCHAR(30) DEFAULT 'hr_only'
                                                            CHECK (access_level IN ('hr_only','hr_finance','manager_hr','public_directory')),

    -- Nepal LA2074: 5-year retention post-employment
    retention_until_date                                      DATE,

    uploaded_by                                                  UUID,
    uploaded_via                                                    VARCHAR(30) DEFAULT 'hr_admin'
                                                                    CHECK (uploaded_via IN ('hr_admin','self_service','bulk_import')),

    -- Full-text search vector (OCR text + filename + tags)
    search_vector                                                       TSVECTOR,

    created_at                                                             TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                               BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 2. EMPLOYEE CONTRACTS (Contract Management AI-Driven)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_contracts (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    document_id                UUID      REFERENCES employee_documents(id),  -- linked signed PDF

    contract_type                 VARCHAR(30) NOT NULL
                                  CHECK (contract_type IN ('regular','time_bound','work_based',
                                    'part_time','casual','vendor_supplied')),
    version                          VARCHAR(20) DEFAULT 'v1.0',

    start_date                         DATE NOT NULL,
    end_date                              DATE,  -- NULL = open-ended (regular)
    probation_end_date                      DATE,

    -- Mandatory LA2074 clauses (stored structured for AI validation)
    job_title                                  VARCHAR(200),
    remuneration_npr                              NUMERIC(12,2),
    working_hours_per_week                          INT DEFAULT 48,
    leave_entitlements                                 JSONB DEFAULT '{}',
    code_of_conduct_included                              BOOLEAN DEFAULT TRUE,

    language                                                VARCHAR(20) DEFAULT 'english'
                                                            CHECK (language IN ('english','nepali','bilingual')),

    status                                                     VARCHAR(20) DEFAULT 'draft'
                                                               CHECK (status IN ('draft','active','expiring_soon','expired','superseded')),

    -- e-Signature (Nepal Electronic Transactions Act 2063)
    esignature_status                                              VARCHAR(20) DEFAULT 'pending'
                                                                    CHECK (esignature_status IN ('pending','sent','signed','declined')),
    signed_date                                                       TIMESTAMPTZ,
    signed_document_url                                                  VARCHAR(500),

    -- AI clause analysis
    ai_compliance_score                                                     FLOAT DEFAULT 100,
    ai_clause_flags                                                            JSONB DEFAULT '[]',
    ai_last_analyzed_at                                                          TIMESTAMPTZ,

    -- Version control / amendment chain
    supersedes_contract_id                                                          UUID REFERENCES employee_contracts(id),

    created_at                                                                         TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                          TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                           UUID,
    is_deleted                                                                            BOOLEAN DEFAULT FALSE,

    CONSTRAINT ck_contract_probation_max CHECK (
        probation_end_date IS NULL OR (probation_end_date - start_date) <= INTERVAL '6 months'
    )
);

-- ================================================================
-- 3. DOCUMENT AUDIT LOG (Digital Employee File access trail)
-- ================================================================
CREATE TABLE IF NOT EXISTS document_audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    document_id     UUID REFERENCES employee_documents(id),
    contract_id     UUID REFERENCES employee_contracts(id),
    letter_id       UUID,  -- references hr_letters, added below

    action          VARCHAR(20) NOT NULL
                    CHECK (action IN ('viewed','downloaded','uploaded','modified','deleted','signed')),
    performed_by    UUID NOT NULL,
    performed_by_name VARCHAR(200),
    ip_address      VARCHAR(50),

    performed_at    TIMESTAMPTZ DEFAULT NOW()

    -- Append-only, no updated_at/is_deleted — audit integrity
);

-- ================================================================
-- 4. AI-DRIVEN HR LETTERS (English & Nepali)
-- ================================================================
CREATE TABLE IF NOT EXISTS hr_letter_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,  -- NULL = global default template
    template_key    VARCHAR(50) NOT NULL,  -- offer, promotion, warning, experience, probation_clearance, transfer, salary_revision, termination
    label           VARCHAR(200) NOT NULL,
    icon            VARCHAR(10) DEFAULT '✉',
    color           VARCHAR(7) DEFAULT '#7e22ce',

    english_template_text  TEXT,  -- with {{variable}} placeholders
    nepali_template_text   TEXT,

    requires_human_review  BOOLEAN DEFAULT FALSE,  -- TRUE for warning/termination
    legal_section_ref      VARCHAR(100),  -- e.g. 'Nepal Labour Act 2074 Section 13'

    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, template_key)
);

INSERT INTO hr_letter_templates (template_key, label, icon, color, requires_human_review, legal_section_ref) VALUES
    ('offer',                'Offer Letter',              '📋', '#10b981', FALSE, 'Nepal Labour Act 2074 Section 10'),
    ('promotion',            'Promotion Letter',          '📈', '#7c3aed', FALSE, NULL),
    ('warning',              'Warning Letter',            '⚠',  '#ef4444', TRUE,  'Nepal Labour Act 2074 Section 32'),
    ('experience',           'Experience Certificate',    '🎓', '#3b82f6', FALSE, 'Nepal Labour Act 2074 Section 16'),
    ('probation_clearance',  'Probation Clearance',       '✅', '#06b6d4', FALSE, 'Nepal Labour Act 2074 Section 13'),
    ('transfer',             'Transfer Notice',           '🔄', '#f59e0b', FALSE, NULL),
    ('salary_revision',      'Salary Revision',           '💰', '#84cc16', FALSE, NULL),
    ('termination',          'Termination Notice',        '🚫', '#dc2626', TRUE,  'Nepal Labour Act 2074 Section 13/Notice Periods')
ON CONFLICT (company_id, template_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS hr_letters (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    template_id                UUID      NOT NULL REFERENCES hr_letter_templates(id),

    effective_date                DATE,
    variables_used                   JSONB DEFAULT '{}',  -- {"salary":180000,"position":"Cloud Architect",...}

    language                            VARCHAR(20) DEFAULT 'english'
                                        CHECK (language IN ('english','nepali','both')),
    generated_english_text                 TEXT,
    generated_nepali_text                     TEXT,

    -- AI generation metadata
    ai_generated                                 BOOLEAN DEFAULT TRUE,
    ai_score                                        FLOAT,  -- self-assessed quality/compliance score
    ai_model_used                                      VARCHAR(50) DEFAULT 'claude-sonnet-4-6',
    human_reviewed                                        BOOLEAN DEFAULT FALSE,
    human_reviewed_by                                        UUID,

    status                                                      VARCHAR(20) DEFAULT 'draft'
                                                                CHECK (status IN ('draft','sent','signed','archived')),

    -- e-Signature integration
    esignature_required                                            BOOLEAN DEFAULT FALSE,
    esignature_status                                                 VARCHAR(20) DEFAULT 'not_required',

    pdf_url                                                              VARCHAR(500),

    generated_by                                                            UUID,
    created_at                                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                  TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                   BOOLEAN DEFAULT FALSE
);

ALTER TABLE document_audit_log
    ADD CONSTRAINT fk_audit_letter FOREIGN KEY (letter_id) REFERENCES hr_letters(id);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ed_employee          ON employee_documents(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ed_company             ON employee_documents(company_id)   WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ed_category              ON employee_documents(category);
CREATE INDEX IF NOT EXISTS idx_ed_retention                ON employee_documents(retention_until_date) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ed_fts                         ON employee_documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_ed_ocr_pending                    ON employee_documents(ocr_processed) WHERE NOT ocr_processed;

CREATE INDEX IF NOT EXISTS idx_ec_employee                          ON employee_contracts(employee_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ec_status                              ON employee_contracts(status);
CREATE INDEX IF NOT EXISTS idx_ec_expiring                              ON employee_contracts(end_date) WHERE status IN ('active','expiring_soon');
CREATE INDEX IF NOT EXISTS idx_ec_esign                                    ON employee_contracts(esignature_status) WHERE esignature_status != 'signed';

CREATE INDEX IF NOT EXISTS idx_dal_document                                   ON document_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_dal_contract                                      ON document_audit_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_dal_performed_by                                    ON document_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_dal_date                                              ON document_audit_log(performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_hl_employee                                              ON hr_letters(employee_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_hl_template                                                 ON hr_letters(template_id);
CREATE INDEX IF NOT EXISTS idx_hl_status                                                     ON hr_letters(status);
CREATE INDEX IF NOT EXISTS idx_hl_review_needed                                                 ON hr_letters(human_reviewed) WHERE NOT human_reviewed;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_emp_docs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['employee_documents','employee_contracts','hr_letters'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_emp_docs_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-build search_vector from filename + OCR text + tags
CREATE OR REPLACE FUNCTION fn_doc_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.file_name,'') || ' ' ||
        COALESCE(NEW.ocr_extracted_text,'') || ' ' ||
        COALESCE(NEW.tags::TEXT,'')
    );
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_doc_search_vector
    BEFORE INSERT OR UPDATE OF file_name, ocr_extracted_text, tags ON employee_documents
    FOR EACH ROW EXECUTE FUNCTION fn_doc_search_vector();

-- Nepal LA2074 Section 13: probation max 6 months (contract-level enforcement)
CREATE OR REPLACE FUNCTION fn_contract_probation_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.probation_end_date IS NOT NULL AND (NEW.probation_end_date - NEW.start_date) > INTERVAL '6 months' THEN
        RAISE EXCEPTION 'Probation period cannot exceed 6 months per Nepal Labour Act 2074 Section 13.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_contract_probation
    BEFORE INSERT OR UPDATE OF probation_end_date, start_date ON employee_contracts
    FOR EACH ROW EXECUTE FUNCTION fn_contract_probation_check();

-- Auto-flag contracts as expiring_soon within 30 days of end_date
CREATE OR REPLACE FUNCTION fn_contract_expiry_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.end_date IS NOT NULL AND NEW.status = 'active' THEN
        IF NEW.end_date <= CURRENT_DATE THEN
            NEW.status := 'expired';
        ELSIF NEW.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN
            NEW.status := 'expiring_soon';
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_contract_expiry
    BEFORE INSERT OR UPDATE ON employee_contracts
    FOR EACH ROW EXECUTE FUNCTION fn_contract_expiry_check();

-- Termination/warning letters require human review before sending
CREATE OR REPLACE FUNCTION fn_letter_review_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE needs_review BOOLEAN;
BEGIN
    SELECT requires_human_review INTO needs_review FROM hr_letter_templates WHERE id = NEW.template_id;
    IF NEW.status = 'sent' AND needs_review AND NOT NEW.human_reviewed THEN
        RAISE EXCEPTION 'This letter type requires human review before sending (warning/termination letters).';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_letter_review_gate
    BEFORE UPDATE OF status ON hr_letters
    FOR EACH ROW EXECUTE FUNCTION fn_letter_review_gate();

-- ================================================================
-- VIEWS
-- ================================================================

-- Expiring contracts dashboard (Digital Employee File "Alerts" widget)
CREATE OR REPLACE VIEW v_expiring_contracts AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    c.contract_type, c.end_date,
    (c.end_date - CURRENT_DATE) AS days_remaining,
    c.company_id
FROM employee_contracts c
JOIN employees e ON c.employee_id = e.id
WHERE c.status IN ('active','expiring_soon') AND c.end_date IS NOT NULL AND NOT c.is_deleted
ORDER BY c.end_date ASC;

-- Pending e-signatures (cross contracts + letters)
CREATE OR REPLACE VIEW v_pending_esignatures AS
SELECT 'contract' AS doc_type, c.id, e.employee_code, e.first_name, e.last_name, c.created_at AS sent_at, c.company_id
FROM employee_contracts c JOIN employees e ON c.employee_id = e.id
WHERE c.esignature_status = 'sent' AND NOT c.is_deleted
UNION ALL
SELECT 'letter' AS doc_type, l.id, e.employee_code, e.first_name, e.last_name, l.created_at AS sent_at, l.company_id
FROM hr_letters l JOIN employees e ON l.employee_id = e.id
WHERE l.esignature_status = 'sent' AND NOT l.is_deleted
ORDER BY sent_at ASC;

-- Document retention compliance (Nepal LA2074: 5yr post-employment)
CREATE OR REPLACE VIEW v_document_retention_status AS
SELECT
    d.file_name, e.employee_code, e.first_name, e.last_name,
    d.retention_until_date,
    CASE WHEN d.retention_until_date < CURRENT_DATE THEN 'EXPIRED_RETENTION'
         WHEN d.retention_until_date < CURRENT_DATE + INTERVAL '90 days' THEN 'EXPIRING_SOON'
         ELSE 'ACTIVE' END AS retention_status,
    d.company_id
FROM employee_documents d
JOIN employees e ON d.employee_id = e.id
WHERE NOT d.is_deleted;

-- AI contract compliance flags (cross-org dashboard)
CREATE OR REPLACE VIEW v_contract_ai_flags AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    c.contract_type, c.ai_compliance_score, c.ai_clause_flags,
    c.company_id
FROM employee_contracts c
JOIN employees e ON c.employee_id = e.id
WHERE jsonb_array_length(c.ai_clause_flags) > 0 AND NOT c.is_deleted
ORDER BY c.ai_compliance_score ASC;

-- Letters pending human review (warning/termination gate)
CREATE OR REPLACE VIEW v_letters_pending_review AS
SELECT
    l.id, e.employee_code, e.first_name, e.last_name,
    t.label AS template_label, l.created_at, l.company_id
FROM hr_letters l
JOIN employees e ON l.employee_id = e.id
JOIN hr_letter_templates t ON l.template_id = t.id
WHERE t.requires_human_review AND NOT l.human_reviewed AND l.status != 'archived' AND NOT l.is_deleted;
