-- ============================================================
-- FILE: database/schemas/org_setup_schema.sql
-- PURPOSE: Complete PostgreSQL schema for Organization Setup
--          Company Profile, Company Setup, Group Company,
--          Branch & Location, Business Unit/Division
--          Legal document upload & verification system
-- COMPLIANCE: Nepal Companies Act 2063, Labour Act 2074,
--             OCR, IRD, SSF, PAN/VAT requirements
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLE 1: group_companies
-- PURPOSE: Top-level holding/parent company (conglomerate)
--          Multi-tenant master — all other entities link here
-- ============================================================
CREATE TABLE group_companies (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL UNIQUE,

    -- Identity
    group_name              VARCHAR(200) NOT NULL,
    group_name_local        VARCHAR(200),               -- Nepali/local script
    group_code              VARCHAR(30)  NOT NULL UNIQUE,
    tagline                 VARCHAR(300),
    description             TEXT,

    -- Logo & Branding
    logo_url                TEXT,
    logo_thumbnail_url      TEXT,
    brand_color_primary     VARCHAR(7)   DEFAULT '#2563eb',
    brand_color_secondary   VARCHAR(7)   DEFAULT '#7c3aed',
    favicon_url             TEXT,

    -- Legal Registration
    incorporation_country   VARCHAR(5)   DEFAULT 'NP',
    incorporation_date      DATE,
    company_type            VARCHAR(50)
                            CHECK (company_type IN (
                                'private_limited','public_limited','partnership',
                                'sole_proprietorship','ngo','ingo','cooperative',
                                'government','foreign_subsidiary','holding'
                            )),
    ocr_registration_number VARCHAR(100),               -- Office of Company Registrar NP
    pan_number              VARCHAR(20),                -- Permanent Account Number
    vat_number              VARCHAR(20),                -- VAT Registration
    tax_clearance_number    VARCHAR(50),

    -- Contact
    registered_address      JSONB,                      -- {line1,line2,city,state,country}
    headquarters_address    JSONB,
    phone_primary           VARCHAR(30),
    phone_secondary         VARCHAR(30),
    email_official          VARCHAR(150),
    email_hr                VARCHAR(150),
    website_url             TEXT,

    -- Financial
    base_currency           VARCHAR(5)   DEFAULT 'NPR',
    fiscal_year_start_month INTEGER      DEFAULT 4,    -- Shrawan=1, or April=4
    fiscal_year_type        VARCHAR(10)  DEFAULT 'BS'  -- BS (Bikram Sambat) or AD
                            CHECK (fiscal_year_type IN ('BS','AD')),
    authorized_capital      NUMERIC(20,2),
    paid_up_capital         NUMERIC(20,2),

    -- HR Settings
    total_employee_count    INTEGER DEFAULT 0,
    default_language        VARCHAR(10)  DEFAULT 'ne', -- Nepali default
    default_timezone        VARCHAR(50)  DEFAULT 'Asia/Kathmandu',
    working_hours_per_day   NUMERIC(4,1) DEFAULT 8.0,
    working_days_per_week   INTEGER      DEFAULT 5,

    -- Statutory (Nepal specific)
    ssf_registration_number VARCHAR(50),               -- Social Security Fund
    epf_registration_number VARCHAR(50),               -- Employee Provident Fund
    cit_number              VARCHAR(50),               -- Company Income Tax
    labour_audit_due_date   DATE,
    last_labour_audit_date  DATE,

    -- Status
    is_active               BOOLEAN DEFAULT true,
    setup_completed         BOOLEAN DEFAULT false,
    setup_step              INTEGER DEFAULT 1,          -- onboarding step tracker

    -- Audit
    created_by              UUID,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: companies
-- PURPOSE: Individual legal entities within the group
--          Each company = separate legal entity with own OCR
-- ============================================================
CREATE TABLE companies (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    group_company_id        UUID NOT NULL REFERENCES group_companies(id),

    -- Identity
    company_name            VARCHAR(200) NOT NULL,
    company_name_local      VARCHAR(200),
    company_name_short      VARCHAR(100),
    company_code            VARCHAR(30)  NOT NULL,
    description             TEXT,
    industry                VARCHAR(100),
    sub_industry            VARCHAR(100),
    company_size            VARCHAR(20)
                            CHECK (company_size IN (
                                'micro','small','medium','large','enterprise'
                            )),

    -- Legal Type (OCR Classification)
    legal_entity_type       VARCHAR(50)
                            CHECK (legal_entity_type IN (
                                'private_limited','public_limited','partnership',
                                'sole_proprietorship','ngo','ingo','cooperative',
                                'foreign_company','branch_of_foreign','government_owned'
                            )),

    -- Ownership
    parent_company_id       UUID REFERENCES companies(id),
    ownership_type          VARCHAR(30)
                            CHECK (ownership_type IN (
                                'wholly_owned','majority','minority',
                                'joint_venture','independent'
                            )),
    ownership_pct           NUMERIC(5,2),               -- % owned by parent

    -- Nepal Statutory Registration
    ocr_registration_number VARCHAR(100),               -- OCR mandatory
    ocr_registration_date   DATE,
    ocr_registration_office VARCHAR(100),               -- which OCR office
    pan_number              VARCHAR(20),                -- IRD mandatory
    vat_number              VARCHAR(20),
    vat_registration_date   DATE,
    ward_registration_number VARCHAR(50),               -- local ward office
    ward_office             VARCHAR(100),
    municipality            VARCHAR(100),
    district                VARCHAR(100),

    -- SSF & EPF (Nepal mandatory for employers)
    ssf_registration_number VARCHAR(50),
    ssf_registration_date   DATE,
    epf_registration_number VARCHAR(50),
    epf_registration_date   DATE,

    -- Tax & Finance
    tax_identification      JSONB,                      -- per-country TIN
    base_currency           VARCHAR(5)  DEFAULT 'NPR',
    authorized_capital      NUMERIC(20,2),
    paid_up_capital         NUMERIC(20,2),
    fiscal_year_start_month INTEGER DEFAULT 4,

    -- Contact
    registered_address      JSONB,
    operational_address     JSONB,
    phone_primary           VARCHAR(30),
    email_official          VARCHAR(150),
    website_url             TEXT,

    -- Statutory contacts
    company_secretary_name  VARCHAR(150),
    company_secretary_phone VARCHAR(30),
    statutory_auditor_name  VARCHAR(150),
    tax_consultant_name     VARCHAR(150),

    -- Logo
    logo_url                TEXT,

    -- Labour compliance
    total_employee_count    INTEGER DEFAULT 0,
    foreign_worker_count    INTEGER DEFAULT 0,         -- must be ≤5% (Labour Act)
    requires_cba            BOOLEAN DEFAULT false,
    requires_safety_committee BOOLEAN DEFAULT false,
    last_labour_audit_date  DATE,
    next_labour_audit_date  DATE,

    -- Status
    is_active               BOOLEAN DEFAULT true,
    is_primary              BOOLEAN DEFAULT false,     -- primary operating company
    setup_completed         BOOLEAN DEFAULT false,

    -- Audit
    created_by              UUID,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, company_code)
);

CREATE INDEX idx_company_tenant   ON companies(tenant_id);
CREATE INDEX idx_company_group    ON companies(group_company_id);
CREATE INDEX idx_company_parent   ON companies(parent_company_id);

-- ============================================================
-- TABLE 3: branches_locations
-- PURPOSE: Physical/virtual branches & offices
--          Each branch has its own statutory registrations
-- ============================================================
CREATE TABLE branches_locations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,
    company_id              UUID NOT NULL REFERENCES companies(id),

    -- Identity
    branch_name             VARCHAR(200) NOT NULL,
    branch_name_local       VARCHAR(200),
    branch_code             VARCHAR(30)  NOT NULL,
    branch_type             VARCHAR(30)  DEFAULT 'branch'
                            CHECK (branch_type IN (
                                'headquarters','branch','sub_branch',
                                'regional_office','liaison_office',
                                'factory','warehouse','retail','remote',
                                'hybrid_hub','virtual'
                            )),
    description             TEXT,

    -- Physical Address
    address_line1           VARCHAR(200),
    address_line2           VARCHAR(200),
    city                    VARCHAR(100),
    district                VARCHAR(100),
    province                VARCHAR(100),              -- Nepal: 7 provinces
    postal_code             VARCHAR(20),
    country_code            VARCHAR(5)  DEFAULT 'NP',
    country_name            VARCHAR(100) DEFAULT 'Nepal',

    -- Geolocation
    latitude                NUMERIC(10,7),
    longitude               NUMERIC(10,7),
    google_maps_url         TEXT,
    plus_code               VARCHAR(20),

    -- Nepal Statutory (branch-level)
    pan_number              VARCHAR(20),               -- branch-level PAN
    vat_number              VARCHAR(20),
    ward_registration_number VARCHAR(50),
    ward_office             VARCHAR(100),
    municipality_code       VARCHAR(50),
    industry_registration   VARCHAR(100),             -- Department of Industry
    labour_office_zone      VARCHAR(100),             -- which DoL office
    labour_office_code      VARCHAR(20),
    ssf_branch_code         VARCHAR(50),

    -- Time & Calendar
    timezone                VARCHAR(50) DEFAULT 'Asia/Kathmandu',
    utc_offset              VARCHAR(10) DEFAULT '+05:45',
    local_currency          VARCHAR(5)  DEFAULT 'NPR',
    holiday_calendar_id     UUID,
    working_days            VARCHAR(10)[] DEFAULT ARRAY['Sun','Mon','Tue','Wed','Thu'],
    standard_work_hours     NUMERIC(4,1) DEFAULT 8.0,

    -- Compliance (auto-trigger based on location)
    applicable_laws         JSONB,                    -- {nepal_labour_act:true, gdpr:false}
    minimum_wage            NUMERIC(10,2),
    minimum_wage_currency   VARCHAR(5) DEFAULT 'NPR',
    payroll_tax_scheme      VARCHAR(50),

    -- Contact
    phone_primary           VARCHAR(30),
    phone_secondary         VARCHAR(30),
    email_branch            VARCHAR(150),
    branch_manager_name     VARCHAR(150),
    branch_manager_id       UUID,

    -- Capacity
    max_employee_capacity   INTEGER,
    current_employee_count  INTEGER DEFAULT 0,
    supports_remote         BOOLEAN DEFAULT false,
    supports_hybrid         BOOLEAN DEFAULT false,

    -- Facilities
    has_canteen             BOOLEAN DEFAULT false,
    has_medical_room        BOOLEAN DEFAULT false,
    has_parking             BOOLEAN DEFAULT false,
    has_crèche              BOOLEAN DEFAULT false,    -- childcare (Labour Act)
    floor_area_sqft         NUMERIC(10,2),

    -- Status
    is_active               BOOLEAN DEFAULT true,
    is_headquarters         BOOLEAN DEFAULT false,
    is_registered           BOOLEAN DEFAULT false,    -- registration complete?
    effective_from          DATE,
    effective_to            DATE,

    -- Audit
    created_by              UUID,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, company_id, branch_code)
);

CREATE INDEX idx_branch_tenant  ON branches_locations(tenant_id);
CREATE INDEX idx_branch_company ON branches_locations(company_id);
CREATE INDEX idx_branch_country ON branches_locations(country_code);

-- ============================================================
-- TABLE 4: legal_documents
-- PURPOSE: Mandatory legal document uploads for all entities
--          Company, Branch, Group — requires scan copies
--          Status tracking: uploaded/verified/expired
-- ============================================================
CREATE TABLE legal_documents (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,

    -- Entity linkage (one of these must be set)
    group_company_id        UUID REFERENCES group_companies(id),
    company_id              UUID REFERENCES companies(id),
    branch_id               UUID REFERENCES branches_locations(id),

    -- Document Details
    document_type           VARCHAR(50) NOT NULL
                            CHECK (document_type IN (
                                -- Nepal mandatory
                                'ocr_certificate',           -- Office of Company Registrar
                                'pan_certificate',           -- Permanent Account Number
                                'vat_certificate',           -- VAT Registration
                                'ssf_registration',          -- Social Security Fund
                                'epf_registration',          -- Employee Provident Fund
                                'ward_registration',         -- Local Ward Office
                                'tax_clearance_certificate', -- IRD
                                'labour_audit_report',       -- Annual Labour Audit
                                'factory_registration',      -- Dept of Industry
                                'environmental_clearance',
                                -- International
                                'company_incorporation',
                                'memorandum_of_association', -- MoA
                                'articles_of_association',   -- AoA
                                'board_resolution',
                                'shareholder_agreement',
                                'business_license',
                                'tax_identification',
                                'gst_registration',
                                'import_export_license',
                                -- HR/Labour
                                'minimum_wage_compliance',
                                'safety_committee_minutes',
                                'collective_bargaining_agreement',
                                'labour_relations_committee',
                                -- Other
                                'company_logo',
                                'company_seal',
                                'other'
                            )),

    document_name           VARCHAR(200) NOT NULL,
    document_number         VARCHAR(100),              -- Registration/Certificate number
    document_description    TEXT,

    -- File Storage
    file_url                TEXT NOT NULL,             -- secure cloud storage URL
    file_name               VARCHAR(200),
    file_size_bytes         INTEGER,
    file_type               VARCHAR(20),               -- pdf, jpg, png, etc.
    thumbnail_url           TEXT,

    -- Validity
    issue_date              DATE,
    expiry_date             DATE,
    issued_by               VARCHAR(200),             -- issuing authority
    issued_at               VARCHAR(200),             -- office/location

    -- Verification
    status                  VARCHAR(20) DEFAULT 'uploaded'
                            CHECK (status IN (
                                'required','uploaded','under_review',
                                'verified','rejected','expired','renewed'
                            )),
    verified_by             UUID,
    verified_by_name        VARCHAR(150),
    verified_at             TIMESTAMPTZ,
    rejection_reason        TEXT,

    -- Alerts
    expiry_alert_sent       BOOLEAN DEFAULT false,
    days_to_expiry          INTEGER GENERATED ALWAYS AS (
                                CASE WHEN expiry_date IS NOT NULL
                                THEN (expiry_date - CURRENT_DATE)
                                ELSE NULL END
                            ) STORED,

    -- AI extraction
    ai_extracted_data       JSONB,                    -- OCR-extracted fields
    ai_verified             BOOLEAN DEFAULT false,

    -- Mandatory flag
    is_mandatory            BOOLEAN DEFAULT true,
    is_active               BOOLEAN DEFAULT true,

    -- Audit
    uploaded_by             UUID,
    uploaded_by_name        VARCHAR(150),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_tenant    ON legal_documents(tenant_id);
CREATE INDEX idx_doc_company   ON legal_documents(company_id);
CREATE INDEX idx_doc_branch    ON legal_documents(branch_id);
CREATE INDEX idx_doc_type      ON legal_documents(document_type);
CREATE INDEX idx_doc_status    ON legal_documents(status);
CREATE INDEX idx_doc_expiry    ON legal_documents(expiry_date);

-- ============================================================
-- TABLE 5: document_requirements
-- PURPOSE: Defines which documents are required per entity type
--          Ensures completeness before going live
-- ============================================================
CREATE TABLE document_requirements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code    VARCHAR(5) NOT NULL,
    entity_type     VARCHAR(30) NOT NULL,  -- company, branch, group
    document_type   VARCHAR(50) NOT NULL,
    display_name    VARCHAR(200) NOT NULL,
    description     TEXT,
    issuing_authority VARCHAR(200),
    is_mandatory    BOOLEAN DEFAULT true,
    renewal_period_months INTEGER,        -- how often to renew
    notes           TEXT,
    display_order   INTEGER DEFAULT 0,

    UNIQUE (country_code, entity_type, document_type)
);

-- Nepal mandatory documents seed data
INSERT INTO document_requirements
    (country_code, entity_type, document_type, display_name, issuing_authority, is_mandatory, renewal_period_months, display_order)
VALUES
-- Company level
('NP','company','ocr_certificate',           'OCR Registration Certificate',         'Office of Company Registrar (OCR)',              true, NULL,  1),
('NP','company','pan_certificate',           'PAN Certificate (IRD)',                'Inland Revenue Department (IRD)',               true, NULL,  2),
('NP','company','vat_certificate',           'VAT Registration Certificate',         'Inland Revenue Department (IRD)',               true, NULL,  3),
('NP','company','tax_clearance_certificate', 'Annual Tax Clearance Certificate',     'Inland Revenue Department (IRD)',               true, 12,    4),
('NP','company','ssf_registration',          'Social Security Fund Registration',    'Social Security Fund (SSF)',                    true, NULL,  5),
('NP','company','epf_registration',          'Employee Provident Fund Registration', 'Employee Provident Fund Organization (EPFO)',   true, NULL,  6),
('NP','company','memorandum_of_association', 'Memorandum of Association (MoA)',      'Office of Company Registrar (OCR)',             true, NULL,  7),
('NP','company','articles_of_association',   'Articles of Association (AoA)',        'Office of Company Registrar (OCR)',             true, NULL,  8),
('NP','company','labour_audit_report',       'Annual Labour Audit Report',           'Department of Labour (DoL)',                    true, 12,    9),
-- Branch level
('NP','branch','ward_registration',          'Ward Office Registration',             'Local Ward Office / Municipality',              true, 12,    1),
('NP','branch','pan_certificate',            'Branch PAN Certificate',               'Inland Revenue Department (IRD)',               true, NULL,  2),
('NP','branch','ssf_registration',           'SSF Branch Registration',              'Social Security Fund (SSF)',                    true, NULL,  3),
('NP','branch','labour_audit_report',        'Branch Labour Audit Report',           'Department of Labour (DoL)',                    true, 12,    4),
('NP','branch','factory_registration',       'Industry Registration Certificate',    'Department of Industry',                        false, NULL, 5),
-- Group level
('NP','group','ocr_certificate',             'Group/Holding Company OCR Certificate','Office of Company Registrar (OCR)',             true, NULL,  1),
('NP','group','memorandum_of_association',   'Group MoA',                            'Office of Company Registrar (OCR)',             true, NULL,  2),
-- India
('IN','company','company_incorporation',     'Certificate of Incorporation (MCA)',   'Ministry of Corporate Affairs (MCA)',           true, NULL,  1),
('IN','company','pan_certificate',           'Company PAN',                          'Income Tax Department',                         true, NULL,  2),
('IN','company','gst_registration',          'GST Registration Certificate',         'GSTN',                                          true, NULL,  3),
-- UK
('GB','company','company_incorporation',     'Certificate of Incorporation',         'Companies House',                               true, NULL,  1),
('GB','company','tax_identification',        'UTR (Unique Taxpayer Reference)',      'HMRC',                                          true, NULL,  2),
-- USA
('US','company','business_license',          'Business License / EIN',               'IRS / State Authority',                         true, NULL,  1),
-- Global
('XX','company','company_logo',              'Company Logo (for system use)',         'Internal',                                      false, NULL, 99),
('XX','company','company_seal',              'Company Seal/Stamp',                   'Internal',                                      false, NULL, 100);

-- ============================================================
-- VIEW: org_setup_completion
-- PURPOSE: Track how complete the setup is per company
-- ============================================================
CREATE OR REPLACE VIEW v_org_setup_completion AS
SELECT
    c.tenant_id,
    c.id AS company_id,
    c.company_name,
    c.country_code,
    COUNT(dr.id) AS total_required_docs,
    COUNT(ld.id) FILTER (WHERE ld.status = 'verified') AS verified_docs,
    COUNT(ld.id) FILTER (WHERE ld.status = 'uploaded') AS uploaded_docs,
    COUNT(ld.id) FILTER (WHERE ld.status = 'expired')  AS expired_docs,
    ROUND(
        COUNT(ld.id) FILTER (WHERE ld.status IN ('verified','uploaded')) * 100.0
        / NULLIF(COUNT(dr.id), 0), 1
    ) AS upload_completion_pct,
    ROUND(
        COUNT(ld.id) FILTER (WHERE ld.status = 'verified') * 100.0
        / NULLIF(COUNT(dr.id), 0), 1
    ) AS verification_completion_pct,
    COUNT(ld.id) FILTER (
        WHERE ld.expiry_date IS NOT NULL
          AND ld.expiry_date <= CURRENT_DATE + INTERVAL '60 days'
          AND ld.status = 'verified'
    ) AS docs_expiring_soon
FROM companies c
LEFT JOIN document_requirements dr
    ON dr.country_code = c.country_code
    AND dr.entity_type = 'company'
    AND dr.is_mandatory = true
LEFT JOIN legal_documents ld
    ON ld.company_id = c.id
    AND ld.document_type = dr.document_type
    AND ld.is_active = true
GROUP BY c.tenant_id, c.id, c.company_name, c.country_code;

-- ============================================================
-- FUNCTION: Get missing mandatory documents for a company
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_missing_documents(
    p_company_id UUID,
    p_country_code VARCHAR
) RETURNS TABLE (
    document_type       VARCHAR,
    display_name        VARCHAR,
    issuing_authority   VARCHAR,
    is_mandatory        BOOLEAN,
    renewal_period_months INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.document_type,
        dr.display_name,
        dr.issuing_authority,
        dr.is_mandatory,
        dr.renewal_period_months
    FROM document_requirements dr
    WHERE dr.country_code = p_country_code
      AND dr.entity_type = 'company'
      AND dr.is_mandatory = true
      AND NOT EXISTS (
          SELECT 1 FROM legal_documents ld
          WHERE ld.company_id = p_company_id
            AND ld.document_type = dr.document_type
            AND ld.status IN ('uploaded','under_review','verified')
            AND ld.is_active = true
      )
    ORDER BY dr.display_order;
END;
$$ LANGUAGE plpgsql;
