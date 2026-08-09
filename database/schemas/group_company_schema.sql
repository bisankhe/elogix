-- ============================================================
-- FILE: database/schemas/group_company_schema.sql
-- NepHR Pro — Group Company + Company Profile + Company Setup
-- Dedicated standalone schema for Organization Setup Page 1-3
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS group_companies (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                  VARCHAR(200) NOT NULL,
    name_nepali           VARCHAR(200),
    short_name            VARCHAR(50),
    registration_no       VARCHAR(100) UNIQUE,
    pan_no                VARCHAR(20),
    vat_no                VARCHAR(20),
    established_year      INT          CHECK (established_year BETWEEN 1900 AND 2100),
    headquarters_country  VARCHAR(100) DEFAULT 'Nepal',
    headquarters_address  TEXT,
    group_type            VARCHAR(50),
    industry_sectors      TEXT[]       DEFAULT '{}',
    total_subsidiaries    INT          DEFAULT 0  CHECK (total_subsidiaries >= 0),
    total_employees       INT          DEFAULT 0  CHECK (total_employees >= 0),
    website               VARCHAR(255),
    logo_url              VARCHAR(500),
    status                VARCHAR(20)  DEFAULT 'active'
                          CHECK (status IN ('active','inactive','pending','suspended')),
    ai_group_insights     JSONB        DEFAULT '{}',
    sap_group_code        VARCHAR(50),
    erp_sync_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  DEFAULT NOW(),
    created_by            UUID,
    updated_by            UUID,
    is_deleted            BOOLEAN      DEFAULT FALSE,
    deleted_at            TIMESTAMPTZ,
    ai_metadata           JSONB        DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS companies (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id                    UUID         REFERENCES group_companies(id) ON DELETE RESTRICT,
    name                        VARCHAR(200) NOT NULL,
    name_nepali                 VARCHAR(200),
    short_name                  VARCHAR(50),
    tagline                     VARCHAR(500),
    registration_type           VARCHAR(40)  DEFAULT 'private_limited',
    registration_no             VARCHAR(100),
    registration_date           DATE,
    pan_no                      VARCHAR(20)  UNIQUE,
    vat_registered              BOOLEAN      DEFAULT FALSE,
    vat_no                      VARCHAR(20),
    industry                    VARCHAR(100),
    sub_industry                VARCHAR(100),
    established_year            INT,
    fiscal_year_type            VARCHAR(5)   DEFAULT 'BS',
    fiscal_year_start           VARCHAR(10)  DEFAULT '04-01',
    employee_count_band         VARCHAR(30),
    website                     VARCHAR(255),
    logo_url                    VARCHAR(500),
    company_color               CHAR(7)      DEFAULT '#1e40af',
    status                      VARCHAR(20)  DEFAULT 'active',
    -- Address
    province                    VARCHAR(100),
    district                    VARCHAR(100),
    municipality                VARCHAR(100),
    ward_no                     VARCHAR(10),
    street                      VARCHAR(255),
    postal_code                 VARCHAR(20),
    country                     VARCHAR(100) DEFAULT 'Nepal',
    latitude                    FLOAT,
    longitude                   FLOAT,
    -- Contacts
    phone                       VARCHAR(50),
    fax                         VARCHAR(50),
    email                       VARCHAR(255),
    hr_contact_email            VARCHAR(255),
    -- Nepal Labour Act 2074 statutory
    labour_office_zone          VARCHAR(100),
    ssf_employer_no             VARCHAR(50),
    pf_employer_no              VARCHAR(50),
    cit_registration            VARCHAR(50),
    moles_registered            BOOLEAN      DEFAULT FALSE,
    factory_act_applicable      BOOLEAN      DEFAULT FALSE,
    trade_union_registered      BOOLEAN      DEFAULT FALSE,
    collective_bargaining_active BOOLEAN     DEFAULT FALSE,
    min_wage_applicable         NUMERIC(12,2) DEFAULT 15000
                                CHECK (min_wage_applicable >= 15000),
    -- Setup wizard
    setup_step                  INT          DEFAULT 1  CHECK (setup_step BETWEEN 1 AND 5),
    setup_completed             BOOLEAN      DEFAULT FALSE,
    setup_completed_at          TIMESTAMPTZ,
    onboarding_checklist        JSONB        DEFAULT '{}',
    -- AI
    ai_risk_score               FLOAT        CHECK (ai_risk_score BETWEEN 0 AND 100),
    ai_insights                 JSONB        DEFAULT '{}',
    ai_benchmarks               JSONB        DEFAULT '{}',
    -- ERP
    sap_company_code            VARCHAR(20),
    oracle_org_id               VARCHAR(50),
    erp_sync_enabled            BOOLEAN      DEFAULT FALSE,
    erp_last_sync               TIMESTAMPTZ,
    -- Audit
    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW(),
    created_by                  UUID,
    is_deleted                  BOOLEAN      DEFAULT FALSE,
    ai_metadata                 JSONB        DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS company_legal_documents (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    doc_type             VARCHAR(100) NOT NULL,
    doc_name             VARCHAR(200) NOT NULL,
    doc_number           VARCHAR(100),
    issue_date           DATE,
    expiry_date          DATE,
    issuing_authority    VARCHAR(200),
    file_url             VARCHAR(500),
    is_mandatory         BOOLEAN      DEFAULT TRUE,
    renewal_alert_days   INT          DEFAULT 90,
    status               VARCHAR(20)  DEFAULT 'valid'
                         CHECK (status IN ('valid','expired','pending','cancelled')),
    ai_expiry_risk       VARCHAR(20)  DEFAULT 'low',
    notes                TEXT,
    created_at           TIMESTAMPTZ  DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted           BOOLEAN      DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gc_status     ON group_companies(status) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_co_group      ON companies(group_id)     WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_co_pan        ON companies(pan_no);
CREATE INDEX IF NOT EXISTS idx_co_status     ON companies(status)       WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_docs_company  ON company_legal_documents(company_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_docs_expiry   ON company_legal_documents(expiry_date)
                                             WHERE expiry_date IS NOT NULL AND NOT is_deleted;

-- Triggers
CREATE OR REPLACE FUNCTION fn_gc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_gc_upd  BEFORE UPDATE ON group_companies           FOR EACH ROW EXECUTE FUNCTION fn_gc_updated_at();
CREATE TRIGGER trg_co_upd  BEFORE UPDATE ON companies                 FOR EACH ROW EXECUTE FUNCTION fn_gc_updated_at();
CREATE TRIGGER trg_doc_upd BEFORE UPDATE ON company_legal_documents   FOR EACH ROW EXECUTE FUNCTION fn_gc_updated_at();

-- View: Company compliance status
CREATE OR REPLACE VIEW v_company_compliance AS
SELECT
    c.name                                              AS company_name,
    c.pan_no, c.ssf_employer_no, c.labour_office_zone,
    c.min_wage_applicable,
    c.collective_bargaining_active,
    COUNT(d.id) FILTER (WHERE d.status = 'valid')      AS valid_docs,
    COUNT(d.id) FILTER (WHERE d.status = 'expired')    AS expired_docs,
    COUNT(d.id) FILTER (WHERE d.expiry_date
                         BETWEEN CURRENT_DATE AND CURRENT_DATE + 90) AS expiring_soon,
    c.setup_completed,
    c.ai_risk_score
FROM companies c
LEFT JOIN company_legal_documents d ON d.company_id = c.id AND NOT d.is_deleted
WHERE NOT c.is_deleted
GROUP BY c.id, c.name, c.pan_no, c.ssf_employer_no, c.labour_office_zone,
         c.min_wage_applicable, c.collective_bargaining_active,
         c.setup_completed, c.ai_risk_score;
