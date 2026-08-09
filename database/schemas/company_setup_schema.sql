-- ============================================================
-- FILE: database/schemas/company_setup_schema.sql
-- PURPOSE: Complete PostgreSQL schema for Organization Setup:
--          Company Profile, Company Setup, Group Company,
--          Branch & Location Setup, Business Unit/Division
--          with mandatory legal document upload tracking
-- COMPLIANCE: Nepal Companies Act 2063, Labour Act 2074,
--             OCR, IRD, SSF, PAN/VAT, GDPR, ISO 27001
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLE 1: group_companies
-- PURPOSE: Parent/holding company — top of the hierarchy
--          Multi-tenant parent for all subsidiaries
-- ============================================================
CREATE TABLE group_companies (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,

    -- Identity
    code                    VARCHAR(20)  NOT NULL,          -- "GRP-001"
    name                    VARCHAR(200) NOT NULL,          -- "NepHR Group Pvt. Ltd."
    legal_name              VARCHAR(200) NOT NULL,
    short_name              VARCHAR(50),
    description             TEXT,
    logo_url                TEXT,
    website                 VARCHAR(200),
    group_type              VARCHAR(30)  DEFAULT 'holding'
                            CHECK (group_type IN (
                                'holding','conglomerate','consortium',
                                'parent','joint_venture'
                            )),

    -- Registration (Nepal: OCR)
    registration_number     VARCHAR(100),                   -- OCR reg number
    registration_date       DATE,
    registration_authority  VARCHAR(200) DEFAULT 'Office of Company Registrar (OCR)',
    registration_country    VARCHAR(5)   DEFAULT 'NP',
    company_type            VARCHAR(50),                    -- Pvt. Ltd, Public Ltd, etc.

    -- Tax (Nepal: PAN/VAT/IRD)
    pan_number              VARCHAR(20),                    -- Permanent Account Number
    vat_number              VARCHAR(20),                    -- VAT registration
    tax_office              VARCHAR(100),
    fiscal_year_start       VARCHAR(10)  DEFAULT 'SHRAWAN', -- Nepali month

    -- Financial
    base_currency           VARCHAR(5)   DEFAULT 'NPR',
    authorized_capital      NUMERIC(18,2),
    paid_up_capital         NUMERIC(18,2),

    -- Contact
    registered_address      TEXT,
    corporate_office        TEXT,
    phone                   VARCHAR(30),
    email                   VARCHAR(150),
    fax                     VARCHAR(30),

    -- Status
    is_active               BOOLEAN DEFAULT true,
    incorporated_on         DATE,

    -- AI
    ai_summary              TEXT,
    ai_compliance_score     INTEGER,

    -- Audit
    created_by              UUID,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

-- ============================================================
-- TABLE 2: companies
-- PURPOSE: Individual company/subsidiary — core entity
--          Holds all statutory master data
-- ============================================================
CREATE TABLE companies (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    group_company_id        UUID REFERENCES group_companies(id),

    -- Identity
    code                    VARCHAR(20)  NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    legal_name              VARCHAR(200) NOT NULL,
    short_name              VARCHAR(50),
    description             TEXT,
    logo_url                TEXT,
    website                 VARCHAR(200),
    industry                VARCHAR(100),
    company_type            VARCHAR(50),                    -- Pvt. Ltd, NGO, etc.
    employee_size_range     VARCHAR(30),                    -- "50-100", "500-1000"

    -- Nepal: OCR Registration
    ocr_registration_number VARCHAR(100),
    ocr_registration_date   DATE,
    ocr_expiry_date         DATE,

    -- Nepal: Tax Identifiers
    pan_number              VARCHAR(20)  NOT NULL,
    vat_number              VARCHAR(20),
    ird_office              VARCHAR(100),
    tax_clearance_date      DATE,
    tax_clearance_valid_to  DATE,

    -- Nepal: Social Security Fund
    ssf_employer_code       VARCHAR(50),
    ssf_registration_date   DATE,
    epf_number              VARCHAR(50),                    -- Employee Provident Fund

    -- Nepal: Labour Compliance
    labour_audit_date       DATE,
    next_labour_audit_due   DATE,
    labour_office_zone      VARCHAR(100),
    collective_agreement    BOOLEAN DEFAULT false,
    min_wage_applicable     NUMERIC(10,2) DEFAULT 15000,    -- NPR per month

    -- Nepal: Ward/Municipality
    ward_number             VARCHAR(10),
    municipality            VARCHAR(100),
    district                VARCHAR(100),
    province                VARCHAR(50),

    -- Financial
    base_currency           VARCHAR(5)   DEFAULT 'NPR',
    fiscal_year_type        VARCHAR(20)  DEFAULT 'NEPALI'
                            CHECK (fiscal_year_type IN ('NEPALI','GREGORIAN','CUSTOM')),
    fiscal_year_start_month INTEGER      DEFAULT 4,         -- Shrawan = 4 (BS)
    authorized_capital      NUMERIC(18,2),
    paid_up_capital         NUMERIC(18,2),

    -- Contact
    registered_address      TEXT,
    corporate_address       TEXT,
    phone                   VARCHAR(30),
    email                   VARCHAR(150),
    hr_email                VARCHAR(150),

    -- Compliance Flags
    is_listed_company       BOOLEAN DEFAULT false,
    is_foreign_company      BOOLEAN DEFAULT false,
    foreign_worker_pct      NUMERIC(5,2) DEFAULT 0,        -- max 5% per Labour Act
    requires_audit          BOOLEAN DEFAULT true,

    -- Status
    is_active               BOOLEAN DEFAULT true,
    is_primary              BOOLEAN DEFAULT false,
    setup_completed         BOOLEAN DEFAULT false,
    setup_completion_pct    INTEGER  DEFAULT 0,

    -- AI
    ai_summary              TEXT,
    ai_compliance_score     INTEGER,
    ai_insights             JSONB,

    -- Audit
    created_by              UUID,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_company_tenant ON companies(tenant_id);
CREATE INDEX idx_company_group  ON companies(group_company_id);

-- ============================================================
-- TABLE 3: legal_documents
-- PURPOSE: Mandatory legal document uploads per company/branch
--          Government-issued documents must be uploaded
--          AI verifies completeness and alerts on expiry
-- ============================================================
CREATE TABLE legal_documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    entity_type         VARCHAR(30) NOT NULL
                        CHECK (entity_type IN (
                            'group_company','company','branch','business_unit'
                        )),
    entity_id           UUID NOT NULL,

    -- Document Identity
    doc_category        VARCHAR(50) NOT NULL
                        CHECK (doc_category IN (
                            -- Nepal mandatory
                            'ocr_certificate',          -- Office of Company Registrar
                            'pan_certificate',          -- Permanent Account Number
                            'vat_certificate',          -- VAT Registration
                            'tax_clearance',            -- IRD Tax Clearance
                            'ssf_registration',         -- Social Security Fund
                            'labour_audit_report',      -- Annual Labour Audit
                            'ward_registration',        -- Local ward/municipality
                            'company_statute',          -- MOA/AOA
                            'board_resolution',         -- Board minutes
                            'trade_license',            -- Trade/business license
                            -- Global
                            'incorporation_certificate',
                            'audited_accounts',
                            'insurance_certificate',
                            'iso_certificate',
                            'gdpr_dpa',
                            'other_legal'
                        )),
    doc_name            VARCHAR(200) NOT NULL,
    doc_number          VARCHAR(100),                   -- certificate/license number
    is_mandatory        BOOLEAN DEFAULT true,

    -- File
    file_name           VARCHAR(255),
    file_url            TEXT,                           -- S3 / cloud storage URL
    file_size_kb        INTEGER,
    file_type           VARCHAR(20),                    -- PDF, JPG, PNG
    file_hash           VARCHAR(64),                    -- SHA-256 for integrity

    -- Dates
    issue_date          DATE,
    expiry_date         DATE,
    issued_by           VARCHAR(200),                   -- issuing authority

    -- Verification
    upload_status       VARCHAR(20) DEFAULT 'pending'
                        CHECK (upload_status IN (
                            'pending','uploaded','verified',
                            'expired','rejected','renewal_due'
                        )),
    verified_by         UUID,
    verified_at         TIMESTAMPTZ,
    verification_notes  TEXT,

    -- AI
    ai_extracted_data   JSONB,                          -- AI-extracted fields from doc
    ai_verified         BOOLEAN DEFAULT false,
    ai_expiry_alert     BOOLEAN DEFAULT false,

    -- Audit
    uploaded_by         UUID,
    uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    -- Reminder
    reminder_30_sent    BOOLEAN DEFAULT false,
    reminder_7_sent     BOOLEAN DEFAULT false,
    reminder_sent_at    TIMESTAMPTZ
);

CREATE INDEX idx_legaldoc_entity   ON legal_documents(entity_id, entity_type);
CREATE INDEX idx_legaldoc_tenant   ON legal_documents(tenant_id);
CREATE INDEX idx_legaldoc_category ON legal_documents(doc_category);
CREATE INDEX idx_legaldoc_expiry   ON legal_documents(expiry_date);
CREATE INDEX idx_legaldoc_status   ON legal_documents(upload_status);

-- ============================================================
-- TABLE 4: branches
-- PURPOSE: Physical/legal branch offices per company
--          Each branch has its own statutory obligations
-- ============================================================
CREATE TABLE branches (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    company_id              UUID NOT NULL REFERENCES companies(id),

    -- Identity
    code                    VARCHAR(20)  NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    short_name              VARCHAR(50),
    description             TEXT,
    branch_type             VARCHAR(30)  DEFAULT 'branch'
                            CHECK (branch_type IN (
                                'hq','branch','regional_office',
                                'liaison_office','factory','warehouse',
                                'remote','virtual','client_site'
                            )),
    is_headquarters         BOOLEAN DEFAULT false,

    -- Address
    address_line1           VARCHAR(200),
    address_line2           VARCHAR(200),
    ward_number             VARCHAR(10),
    tole                    VARCHAR(100),
    city                    VARCHAR(100),
    municipality            VARCHAR(100),
    district                VARCHAR(100),
    province                VARCHAR(50),
    country_code            VARCHAR(5)   DEFAULT 'NP',
    country_name            VARCHAR(100) DEFAULT 'Nepal',
    postal_code             VARCHAR(20),

    -- Geolocation
    latitude                NUMERIC(10,7),
    longitude               NUMERIC(10,7),
    google_maps_url         TEXT,

    -- Time / Calendar
    timezone                VARCHAR(50)  DEFAULT 'Asia/Kathmandu',
    utc_offset              VARCHAR(10)  DEFAULT '+05:45',
    working_days            VARCHAR(10)[] DEFAULT ARRAY['Sun','Mon','Tue','Wed','Thu'],
    standard_hours          NUMERIC(4,1) DEFAULT 8.0,
    holiday_calendar_id     UUID,

    -- Nepal Statutory per branch
    branch_pan              VARCHAR(20),
    branch_vat              VARCHAR(20),
    ward_registration_no    VARCHAR(50),
    ssf_employer_code       VARCHAR(50),
    local_tax_office        VARCHAR(100),
    labour_office_zone      VARCHAR(100),

    -- Contact
    phone                   VARCHAR(30),
    email                   VARCHAR(150),
    fax                     VARCHAR(30),
    branch_head_name        VARCHAR(150),
    branch_head_id          UUID,

    -- Compliance
    employee_count          INTEGER DEFAULT 0,
    requires_local_audit    BOOLEAN DEFAULT false,
    local_min_wage          NUMERIC(10,2) DEFAULT 15000,

    -- Status
    is_active               BOOLEAN DEFAULT true,
    established_date        DATE,
    closed_date             DATE,

    -- AI
    ai_compliance_score     INTEGER,

    -- Audit
    created_by              UUID,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_branch_tenant  ON branches(tenant_id);
CREATE INDEX idx_branch_company ON branches(company_id);

-- ============================================================
-- TABLE 5: company_setup_progress
-- PURPOSE: Tracks setup wizard completion step by step
-- ============================================================
CREATE TABLE company_setup_progress (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    company_id      UUID NOT NULL REFERENCES companies(id),

    step_code       VARCHAR(50) NOT NULL,
    step_name       VARCHAR(100),
    step_order      INTEGER,
    is_completed    BOOLEAN DEFAULT false,
    is_mandatory    BOOLEAN DEFAULT true,
    completed_at    TIMESTAMPTZ,
    completed_by    UUID,
    notes           TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, step_code)
);

-- ============================================================
-- VIEW: company_compliance_status
-- ============================================================
CREATE OR REPLACE VIEW v_company_compliance AS
SELECT
    c.id,
    c.tenant_id,
    c.name,
    c.pan_number,
    c.ocr_registration_number,
    c.setup_completion_pct,

    -- Document counts
    COUNT(ld.id)                                              AS total_docs,
    COUNT(ld.id) FILTER (WHERE ld.upload_status = 'uploaded'
                          OR ld.upload_status = 'verified')  AS uploaded_docs,
    COUNT(ld.id) FILTER (WHERE ld.upload_status = 'expired') AS expired_docs,
    COUNT(ld.id) FILTER (WHERE ld.upload_status = 'pending'
                          AND ld.is_mandatory = true)        AS missing_mandatory,

    -- Expiry alerts
    COUNT(ld.id) FILTER (
        WHERE ld.expiry_date IS NOT NULL
          AND ld.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
          AND ld.expiry_date > CURRENT_DATE
    )                                                         AS expiring_soon,

    -- Overall compliance score
    ROUND(
        COUNT(ld.id) FILTER (WHERE ld.upload_status IN ('uploaded','verified'))
        * 100.0 / NULLIF(COUNT(ld.id) FILTER (WHERE ld.is_mandatory), 0)
    , 1)                                                      AS doc_compliance_pct

FROM companies c
LEFT JOIN legal_documents ld ON ld.entity_id = c.id
    AND ld.entity_type = 'company'
GROUP BY c.id, c.tenant_id, c.name, c.pan_number,
         c.ocr_registration_number, c.setup_completion_pct;

-- ============================================================
-- FUNCTION: Get mandatory documents checklist per country
-- ============================================================
CREATE OR REPLACE FUNCTION fn_mandatory_docs_checklist(
    p_country_code VARCHAR
) RETURNS TABLE (
    doc_category    VARCHAR,
    doc_name        VARCHAR,
    issuing_authority VARCHAR,
    is_mandatory    BOOLEAN,
    description     TEXT
) AS $$
BEGIN
    IF p_country_code = 'NP' THEN
        RETURN QUERY VALUES
        ('ocr_certificate',        'Company Registration Certificate (OCR)',  'Office of Company Registrar (OCR)',            true,  'Mandatory registration with OCR under Companies Act 2063'),
        ('pan_certificate',        'PAN Certificate',                          'Inland Revenue Department (IRD)',              true,  'Permanent Account Number - mandatory for all businesses'),
        ('vat_certificate',        'VAT Registration Certificate',             'Inland Revenue Department (IRD)',              true,  'VAT registration if annual turnover exceeds threshold'),
        ('tax_clearance',          'Tax Clearance Certificate',                'Inland Revenue Department (IRD)',              true,  'Annual tax clearance from IRD'),
        ('ssf_registration',       'SSF Employer Registration',                'Social Security Fund (SSF)',                   true,  'Mandatory SSF registration - Labour Act 2074 Section 102'),
        ('labour_audit_report',    'Annual Labour Audit Report',               'Department of Labour (DoL)',                   true,  'Annual audit required per Labour Act 2074 Section 142'),
        ('ward_registration',      'Ward/Municipality Business Registration',  'Local Ward Office / Municipality',             true,  'Local level business registration'),
        ('company_statute',        'Memorandum & Articles of Association',     'Office of Company Registrar (OCR)',            true,  'MOA and AOA of the company'),
        ('trade_license',          'Renewal of Firm / Trade License',          'Department of Commerce / Municipality',       true,  'Annual business renewal'),
        ('audited_accounts',       'Audited Financial Statements',             'Chartered Accountant (CA) / ICAN',            true,  'Annual audited accounts');
    ELSIF p_country_code = 'IN' THEN
        RETURN QUERY VALUES
        ('incorporation_certificate', 'Certificate of Incorporation',          'Ministry of Corporate Affairs (MCA)',         true,  'CIN from MCA'),
        ('pan_certificate',           'Company PAN Card',                      'Income Tax Department',                       true,  'PAN for taxation'),
        ('vat_certificate',           'GST Registration Certificate',          'GSTN',                                        true,  'GST/VAT registration'),
        ('ssf_registration',          'EPFO Employer Code',                    'Employee Provident Fund Organisation (EPFO)', true,  'Mandatory PF registration'),
        ('trade_license',             'Shop & Establishment License',          'State Labour Department',                     true,  'State-specific requirement');
    ELSIF p_country_code = 'GB' THEN
        RETURN QUERY VALUES
        ('incorporation_certificate', 'Certificate of Incorporation',          'Companies House',                             true,  'UK company registration'),
        ('vat_certificate',           'VAT Registration',                      'HMRC',                                        true,  'VAT if turnover over threshold'),
        ('pan_certificate',           'PAYE Reference',                        'HMRC',                                        true,  'Employer PAYE reference'),
        ('insurance_certificate',     'Employers Liability Insurance',         'FCA Approved Insurer',                        true,  'Legally required insurance');
    ELSE
        RETURN QUERY VALUES
        ('incorporation_certificate', 'Certificate of Incorporation',           'National Companies Authority',               true,  'Company registration'),
        ('pan_certificate',           'Tax Registration',                       'National Tax Authority',                     true,  'Tax identification'),
        ('trade_license',             'Business License',                       'National Trade Authority',                   true,  'Business operating license');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED: Setup wizard steps
-- ============================================================
-- Step codes for setup progress tracking:
-- company_profile, statutory_details, financial_setup,
-- contact_info, legal_documents, group_setup,
-- branch_setup, bu_setup, review_complete
