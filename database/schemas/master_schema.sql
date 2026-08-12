-- ============================================================
-- FILE: database/schemas/master_schema.sql
-- eLogix HRMS — Master PostgreSQL Schema
-- Covers ALL modules from Excel file:
--   Org Setup, Dept & Team, Employment Category,
--   Structure & Hierarchy, Employment Type / Outsource
-- Nepal Labour Act 2074 compliant
-- Engine: PostgreSQL 15+
-- Extensions: uuid-ossp, ltree, pg_trgm, pg_cron
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- SECTION 1: ORGANIZATION SETUP
-- ============================================================

-- 1.1 Group Companies
CREATE TABLE group_companies (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(20) NOT NULL UNIQUE,
    name                VARCHAR(200) NOT NULL,
    short_name          VARCHAR(80),
    group_type          VARCHAR(40) DEFAULT 'holding_company'
                        CHECK (group_type IN ('holding_company','subsidiary','associate','joint_venture','trust')),
    country             VARCHAR(60)  DEFAULT 'Nepal',
    base_currency       VARCHAR(10)  DEFAULT 'NPR',
    pan_tax_id          VARCHAR(50),
    incorporated_date   DATE,
    contact_email       VARCHAR(200),
    website             VARCHAR(200),
    logo_url            TEXT,
    description         TEXT,
    status              VARCHAR(20)  DEFAULT 'active'
                        CHECK (status IN ('active','inactive','draft','archived')),
    ai_risk_score       NUMERIC(5,2) DEFAULT 0,
    ai_insights         JSONB        DEFAULT '{}',
    ai_last_analyzed    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW(),
    created_by          UUID
);

-- 1.2 Companies (core entity)
CREATE TABLE companies (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id                UUID        NOT NULL REFERENCES group_companies(id) ON DELETE RESTRICT,
    code                    VARCHAR(20) NOT NULL UNIQUE,
    name                    VARCHAR(200) NOT NULL,
    name_nepali             VARCHAR(200),
    short_name              VARCHAR(80),
    company_type            VARCHAR(40)  DEFAULT 'private_limited',
    industry                VARCHAR(100),
    sector                  VARCHAR(100),

    -- Nepal-specific registration
    pan_number              VARCHAR(20)  UNIQUE,
    vat_number              VARCHAR(20),
    company_reg_number      VARCHAR(50),
    ocr_registration_no     VARCHAR(50),   -- Office of Company Registrar Nepal
    labour_reg_number       VARCHAR(50),   -- Labour Office
    ssf_reg_number          VARCHAR(50),   -- Social Security Fund

    -- Address
    registered_address      TEXT,
    operational_address     TEXT,
    province                VARCHAR(80),
    district                VARCHAR(80),
    municipality            VARCHAR(80),
    ward_no                 VARCHAR(10),
    country                 VARCHAR(60)  DEFAULT 'Nepal',

    -- Contacts
    phone                   VARCHAR(30),
    email                   VARCHAR(200),
    website                 VARCHAR(200),

    -- Corporate
    fiscal_year_start       VARCHAR(20)  DEFAULT 'Shrawan 1',   -- Nepal BS
    calendar_type           VARCHAR(5)   DEFAULT 'BS',
    logo_url                TEXT,
    incorporated_date       DATE,
    paid_up_capital_npr     NUMERIC(15,2),
    authorized_capital_npr  NUMERIC(15,2),

    -- HR Defaults
    probation_months        INT          DEFAULT 6
                            CHECK (probation_months <= 6),       -- Nepal law max
    working_days_week       INT          DEFAULT 5,
    daily_working_hours     NUMERIC(4,2) DEFAULT 8.0,
    ot_rate_multiplier      NUMERIC(4,2) DEFAULT 1.5,

    -- Setup wizard
    setup_complete          BOOLEAN      DEFAULT FALSE,
    setup_progress_pct      INT          DEFAULT 0 CHECK (setup_progress_pct BETWEEN 0 AND 100),
    setup_steps_json        JSONB        DEFAULT '{}',
    ai_compliance_score     NUMERIC(5,2) DEFAULT 0,
    ai_insights             JSONB        DEFAULT '{}',

    status                  VARCHAR(20)  DEFAULT 'active',
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW(),
    created_by              UUID
);

-- 1.3 Company Legal Documents
CREATE TABLE company_legal_documents (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID        REFERENCES companies(id) ON DELETE CASCADE,
    group_id        UUID        REFERENCES group_companies(id) ON DELETE CASCADE,
    doc_type        VARCHAR(80) NOT NULL,    -- PAN, VAT, OCR, Labour, SSF, Insurance
    doc_number      VARCHAR(100),
    issued_by       VARCHAR(200),
    issue_date      DATE,
    expiry_date     DATE,
    file_url        TEXT,
    notes           TEXT,
    is_mandatory    BOOLEAN     DEFAULT TRUE,
    alert_days      INT         DEFAULT 30,
    ai_renewal_prediction  JSONB DEFAULT '{}',
    ai_risk_level   VARCHAR(20) DEFAULT 'low'
                    CHECK (ai_risk_level IN ('low','medium','high','critical')),
    status          VARCHAR(20) DEFAULT 'valid'
                    CHECK (status IN ('valid','expired','pending_renewal','cancelled')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Branches / Locations
CREATE TABLE branches (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    code                VARCHAR(20) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    short_name          VARCHAR(80),
    branch_type         VARCHAR(40) DEFAULT 'branch_office',
    is_headquarters     BOOLEAN     DEFAULT FALSE,

    country             VARCHAR(60) DEFAULT 'Nepal',
    province            VARCHAR(80),
    district            VARCHAR(80),
    municipality        VARCHAR(80),
    ward_no             VARCHAR(10),
    full_address        TEXT,
    postal_code         VARCHAR(20),
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(10,7),

    phone               VARCHAR(30),
    email               VARCHAR(200),
    manager_id          UUID,
    manager_name        VARCHAR(200),
    cost_center_code    VARCHAR(30),
    established_date    DATE,

    attendance_device   VARCHAR(100),
    labour_office_zone  VARCHAR(200),

    capacity            INT DEFAULT 0 CHECK (capacity >= 0),
    current_headcount   INT DEFAULT 0 CHECK (current_headcount >= 0),
    amenities           TEXT[],
    work_policy         VARCHAR(50) DEFAULT 'Office-First',

    status              VARCHAR(20) DEFAULT 'active',
    ai_insights         JSONB       DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID,

    UNIQUE (company_id, code)
);

-- 1.5 Business Units / Divisions
CREATE TABLE business_units (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID        NOT NULL REFERENCES companies(id),
    branch_id                   UUID        REFERENCES branches(id),
    parent_bu_id                UUID        REFERENCES business_units(id),

    code                        VARCHAR(20) NOT NULL,
    name                        VARCHAR(200) NOT NULL,
    short_name                  VARCHAR(80),
    bu_type                     VARCHAR(40) DEFAULT 'business_unit',
    description                 TEXT,

    head_employee_id            UUID,
    head_name                   VARCHAR(200),
    hrbp_employee_id            UUID,
    hrbp_name                   VARCHAR(200),

    cost_center_code            VARCHAR(30),
    gl_account                  VARCHAR(30),
    profit_center_code          VARCHAR(30),
    annual_budget_npr           NUMERIC(15,2) DEFAULT 0 CHECK (annual_budget_npr >= 0),
    revenue_contribution_pct    NUMERIC(5,2)  CHECK (revenue_contribution_pct BETWEEN 0 AND 100),

    current_headcount           INT DEFAULT 0,
    budgeted_headcount          INT DEFAULT 0,

    status                      VARCHAR(20) DEFAULT 'active',
    ai_insights                 JSONB       DEFAULT '{}',
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    created_by                  UUID,

    UNIQUE (company_id, code)
);

-- ============================================================
-- SECTION 2: DEPARTMENT & TEAM SETUP
-- ============================================================

-- 2.1 Departments
CREATE TABLE departments (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL REFERENCES companies(id),
    business_unit_id    UUID        REFERENCES business_units(id),
    parent_dept_id      UUID        REFERENCES departments(id),

    code                VARCHAR(20) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    short_name          VARCHAR(80),
    dept_type           VARCHAR(50),    -- Technical, Support, Revenue, Corporate
    description         TEXT,
    icon                VARCHAR(10),
    color_hex           VARCHAR(10),

    head_employee_id    UUID,
    head_name           VARCHAR(200),
    hrbp_employee_id    UUID,
    hrbp_name           VARCHAR(200),

    cost_center_code    VARCHAR(30),
    annual_budget_npr   NUMERIC(15,2) DEFAULT 0,
    work_location_id    UUID,
    primary_work_mode   VARCHAR(30)   DEFAULT 'Office',
    current_headcount   INT           DEFAULT 0,
    open_positions      INT           DEFAULT 0,

    ulrich_type         VARCHAR(20)   CHECK (ulrich_type IN ('CoE','HRSS','HRBP')),
    status              VARCHAR(20)   DEFAULT 'active',
    ai_insights         JSONB         DEFAULT '{}',
    full_text_search    TSVECTOR GENERATED ALWAYS AS (
                          to_tsvector('english', coalesce(name,'') || ' ' || coalesce(short_name,''))
                        ) STORED,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- 2.2 Sections & Units
CREATE TABLE sections (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL REFERENCES companies(id),
    department_id       UUID        NOT NULL REFERENCES departments(id),

    code                VARCHAR(20) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    short_name          VARCHAR(80),
    section_type        VARCHAR(50),
    description         TEXT,
    ulrich_type         VARCHAR(20) CHECK (ulrich_type IN ('CoE','HRSS','HRBP')),
    head_employee_id    UUID,
    head_name           VARCHAR(200),
    current_headcount   INT         DEFAULT 0,
    status              VARCHAR(20) DEFAULT 'active',
    ai_insights         JSONB       DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- 2.3 Teams (Nepal Labour Act 2074 compliance flags)
CREATE TABLE teams (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID        NOT NULL REFERENCES companies(id),
    section_id                  UUID        REFERENCES sections(id),
    department_id               UUID        REFERENCES departments(id),

    code                        VARCHAR(20) NOT NULL,
    name                        VARCHAR(200) NOT NULL,
    short_name                  VARCHAR(80),
    team_type                   VARCHAR(50) DEFAULT 'Permanent',
    work_mode                   VARCHAR(50) DEFAULT 'Office',
    sprint_cycle                VARCHAR(30) DEFAULT 'Monthly',
    max_members                 INT         DEFAULT 10 CHECK (max_members >= 1),
    current_members             INT         DEFAULT 0,

    lead_employee_id            UUID,
    lead_name                   VARCHAR(200),
    deputy_lead_employee_id     UUID,
    deputy_lead_name            VARCHAR(200),

    tools_csv                   TEXT,
    slack_channel               VARCHAR(100),

    -- Nepal Labour Act 2074 compliance
    cba_eligible                BOOLEAN     DEFAULT FALSE,          -- TRUE if members >= 10
    safety_committee_required   BOOLEAN     DEFAULT FALSE,          -- TRUE if members >= 20
    cba_note                    TEXT,

    status                      VARCHAR(20) DEFAULT 'active',
    ai_insights                 JSONB       DEFAULT '{}',
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- 2.4 Cost Centers
CREATE TABLE cost_centers (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL REFERENCES companies(id),
    code                VARCHAR(30) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    short_name          VARCHAR(80),
    cc_type             VARCHAR(50),
    description         TEXT,

    gl_account          VARCHAR(30),
    erp_code            VARCHAR(30),
    profit_center_code  VARCHAR(30),
    annual_budget_npr   NUMERIC(15,2) DEFAULT 0 CHECK (annual_budget_npr >= 0),
    ytd_spend_npr       NUMERIC(15,2) DEFAULT 0 CHECK (ytd_spend_npr >= 0),

    owner_employee_id   UUID,
    owner_name          VARCHAR(200),
    approver_employee_id UUID,
    approver_name       VARCHAR(200),
    linked_dept_id      UUID REFERENCES departments(id),
    linked_branch_id    UUID REFERENCES branches(id),

    status              VARCHAR(20) DEFAULT 'active',
    ai_budget_forecast  JSONB       DEFAULT '{}',
    ai_anomaly_flags    JSONB       DEFAULT '[]',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- 2.5 Work Locations
CREATE TABLE work_locations (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL REFERENCES companies(id),
    branch_id           UUID        REFERENCES branches(id),

    code                VARCHAR(20) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    short_name          VARCHAR(80),
    location_type       VARCHAR(50),

    country             VARCHAR(60) DEFAULT 'Nepal',
    province            VARCHAR(80),
    district            VARCHAR(80),
    full_address        TEXT,
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(10,7),

    work_policy         VARCHAR(50),
    shift_start         TIME,
    shift_end           TIME,
    shift_type          VARCHAR(50),
    capacity            INT DEFAULT 0,
    current_headcount   INT DEFAULT 0,
    labour_office_zone  VARCHAR(200),
    attendance_device   VARCHAR(100),
    amenities           TEXT[]      DEFAULT '{}',

    status              VARCHAR(20) DEFAULT 'active',
    ai_occupancy_score  NUMERIC(5,2) DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- ============================================================
-- SECTION 3: EMPLOYMENT CATEGORY
-- ============================================================

CREATE TABLE employment_categories (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID        NOT NULL REFERENCES companies(id),
    code                        VARCHAR(30) NOT NULL,   -- regular, probation, etc.
    name                        VARCHAR(100) NOT NULL,
    name_nepali                 VARCHAR(100),
    description                 TEXT,
    la_section                  VARCHAR(50),             -- Section 10(a), etc.

    -- Nepal Labour Act 2074 Rules
    written_contract_required   BOOLEAN     DEFAULT TRUE,
    max_probation_months        INT         CHECK (max_probation_months IS NULL OR max_probation_months <= 6),
    max_duration_months         INT,
    max_hours_per_week          NUMERIC(4,1) CHECK (max_hours_per_week IS NULL OR max_hours_per_week <= 35),
    max_days_per_month          INT         CHECK (max_days_per_month IS NULL OR max_days_per_month <= 7),
    is_managerial_category      BOOLEAN     DEFAULT FALSE,
    cba_eligible                BOOLEAN     DEFAULT TRUE,
    overtime_eligible           BOOLEAN     DEFAULT TRUE,
    pf_required                 BOOLEAN     DEFAULT TRUE,
    ssf_required                BOOLEAN     DEFAULT TRUE,
    gratuity_eligible           BOOLEAN     DEFAULT TRUE,

    -- Benefits defaults
    annual_leave_days           INT         DEFAULT 18,
    sick_leave_days             INT         DEFAULT 12,
    festival_bonus_eligible     BOOLEAN     DEFAULT TRUE,
    medical_allowance_eligible  BOOLEAN     DEFAULT TRUE,
    probation_alert_days        INT         DEFAULT 30,
    employee_count              INT         DEFAULT 0,

    status                      VARCHAR(20) DEFAULT 'active',
    ai_compliance_notes         JSONB       DEFAULT '{}',
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- ============================================================
-- SECTION 4: STRUCTURE & HIERARCHY
-- ============================================================

-- 4.1 Job Families
CREATE TABLE job_families (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID        NOT NULL REFERENCES companies(id),
    code        VARCHAR(20) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    icon        VARCHAR(10),
    color_hex   VARCHAR(10),
    description TEXT,
    status      VARCHAR(20) DEFAULT 'active',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- 4.2 Grade Levels
CREATE TABLE grade_levels (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID        NOT NULL REFERENCES companies(id),
    code                        VARCHAR(10) NOT NULL,   -- L1-L5, M1-M3, E1-E2
    name                        VARCHAR(100) NOT NULL,
    track                       VARCHAR(20) NOT NULL
                                CHECK (track IN ('individual','management','executive')),
    level_number                INT         NOT NULL,

    -- Salary bands (NPR/month)
    salary_min_npr              NUMERIC(12,2) NOT NULL CHECK (salary_min_npr >= 0),
    salary_mid_npr              NUMERIC(12,2) NOT NULL,
    salary_max_npr              NUMERIC(12,2) NOT NULL,

    -- Bonus
    bonus_target_pct            NUMERIC(5,2) DEFAULT 0 CHECK (bonus_target_pct >= 0),
    bonus_max_pct               NUMERIC(5,2) DEFAULT 0,

    -- Leave
    annual_leave_days           INT DEFAULT 18,
    sick_leave_days             INT DEFAULT 12,

    -- Authority
    overtime_exempt             BOOLEAN DEFAULT FALSE,
    is_managerial               BOOLEAN DEFAULT FALSE,
    can_approve_leave           BOOLEAN DEFAULT FALSE,
    can_hire                    BOOLEAN DEFAULT FALSE,
    span_of_control_max         INT     DEFAULT 0,
    financial_approval_limit_npr NUMERIC(15,2) DEFAULT 0,

    -- Nepal law
    nepal_law_note              TEXT,
    cba_excluded                BOOLEAN DEFAULT FALSE,

    -- AI market benchmarking
    market_p25_npr              NUMERIC(12,2),
    market_p50_npr              NUMERIC(12,2),
    market_p75_npr              NUMERIC(12,2),
    ai_benchmark_date           DATE,
    ai_market_insights          JSONB DEFAULT '{}',

    status                      VARCHAR(20) DEFAULT 'active',
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, code),
    CHECK (salary_min_npr <= salary_mid_npr),
    CHECK (salary_mid_npr <= salary_max_npr)
);

-- 4.3 Designations
CREATE TABLE designations (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL REFERENCES companies(id),
    job_family_id       UUID        REFERENCES job_families(id),
    grade_id            UUID        REFERENCES grade_levels(id),

    job_code            VARCHAR(30) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    title_nepali        VARCHAR(200),
    description         TEXT,
    is_managerial       BOOLEAN     DEFAULT FALSE,

    min_experience_years INT        DEFAULT 0,
    education_required  TEXT,
    skills_required     TEXT[]      DEFAULT '{}',
    certifications      TEXT[]      DEFAULT '{}',

    jd_summary          TEXT,
    jd_full_text        TEXT,
    jd_ai_generated     BOOLEAN     DEFAULT FALSE,
    jd_ai_generated_at  TIMESTAMPTZ,
    jd_responsibilities JSONB       DEFAULT '[]',
    jd_qualifications   JSONB       DEFAULT '[]',
    jd_competencies     JSONB       DEFAULT '[]',

    nepal_law_category  VARCHAR(50),
    la_cba_excluded     BOOLEAN     DEFAULT FALSE,

    budgeted_positions  INT         DEFAULT 0,
    filled_positions    INT         DEFAULT 0,

    full_text_search    TSVECTOR GENERATED ALWAYS AS (
                          to_tsvector('english',
                            coalesce(job_code,'') || ' ' ||
                            coalesce(title,'') || ' ' ||
                            coalesce(jd_summary,''))
                        ) STORED,

    status              VARCHAR(20) DEFAULT 'active',
    ai_insights         JSONB       DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, job_code)
);

-- 4.4 Positions (position-based org model)
CREATE TABLE positions (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              UUID        NOT NULL REFERENCES companies(id),
    designation_id          UUID        REFERENCES designations(id),
    department_id           UUID        REFERENCES departments(id),

    code                    VARCHAR(30) NOT NULL,
    title                   VARCHAR(200) NOT NULL,
    status                  VARCHAR(20) DEFAULT 'vacant'
                            CHECK (status IN ('filled','vacant','frozen','budgeted','closed')),

    incumbent_employee_id   UUID,
    incumbent_name          VARCHAR(200),
    incumbent_start_date    DATE,

    reports_to_position_id  UUID        REFERENCES positions(id),
    dotted_reports_to_id    UUID        REFERENCES positions(id),
    reporting_type          VARCHAR(20) DEFAULT 'line'
                            CHECK (reporting_type IN ('line','dotted','matrix','functional')),

    level_in_org            INT         DEFAULT 0,
    direct_reports_count    INT         DEFAULT 0,

    has_succession_plan     BOOLEAN     DEFAULT FALSE,
    succession_candidates   JSONB       DEFAULT '[]',

    ai_attrition_risk_score NUMERIC(5,2) DEFAULT 0 CHECK (ai_attrition_risk_score BETWEEN 0 AND 100),
    ai_attrition_risk_level VARCHAR(20),
    ai_flight_risk_factors  JSONB       DEFAULT '[]',
    ai_analyzed_at          TIMESTAMPTZ,

    is_budgeted             BOOLEAN     DEFAULT TRUE,
    effective_date          DATE,
    close_date              DATE,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    created_by              UUID,
    UNIQUE (company_id, code)
);

-- 4.5 Org Chart (materialized/denormalized for performance)
CREATE TABLE org_chart_nodes (
    id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID    NOT NULL REFERENCES companies(id),
    position_id         UUID    NOT NULL UNIQUE REFERENCES positions(id),

    incumbent_name      VARCHAR(200),
    title               VARCHAR(200),
    grade_code          VARCHAR(10),
    department          VARCHAR(200),
    color_hex           VARCHAR(10),
    avatar_initials     VARCHAR(5),
    status              VARCHAR(20),
    is_vacant           BOOLEAN DEFAULT FALSE,
    has_dotted_line     BOOLEAN DEFAULT FALSE,

    parent_node_id      UUID REFERENCES org_chart_nodes(id),
    depth               INT     DEFAULT 0,
    path                LTREE,
    sort_order          INT     DEFAULT 0,

    total_subtree_count INT     DEFAULT 0,
    direct_report_count INT     DEFAULT 0,
    span_status         VARCHAR(20),    -- optimal / overloaded / low

    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 5: WORKFORCE CONFIGURATION — EMPLOYMENT TYPE
-- ============================================================

-- 5.1 Outsource Vendors (Labour Suppliers)
CREATE TABLE outsource_vendors (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID        NOT NULL REFERENCES companies(id),
    vendor_code                 VARCHAR(30) NOT NULL,
    vendor_name                 VARCHAR(200) NOT NULL,
    vendor_name_nepali          VARCHAR(200),
    short_name                  VARCHAR(80),
    service_category            VARCHAR(100),

    -- Nepal Labour Act 2074, Section 52 — must be licensed
    moless_license_no           VARCHAR(100),
    moless_license_expiry       DATE,
    is_licensed_agency          BOOLEAN     DEFAULT FALSE,
    agency_pan                  VARCHAR(20),
    agency_registration_no      VARCHAR(50),

    contact_person              VARCHAR(200),
    contact_email               VARCHAR(200),
    contact_phone               VARCHAR(30),
    address                     TEXT,

    overall_performance_score   NUMERIC(5,2) DEFAULT 0 CHECK (overall_performance_score BETWEEN 0 AND 100),
    overall_risk_level          VARCHAR(20)  DEFAULT 'low'
                                CHECK (overall_risk_level IN ('low','medium','high','critical')),
    total_workers_deployed      INT          DEFAULT 0,
    active_contracts_count      INT          DEFAULT 0,

    status                      VARCHAR(20)  DEFAULT 'active',
    ai_vendor_insights          JSONB        DEFAULT '{}',
    ai_last_scored              TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW(),
    created_by                  UUID,
    UNIQUE (company_id, vendor_code)
);

-- 5.2 SLA & Contracts
CREATE TABLE sla_contracts (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID        NOT NULL REFERENCES companies(id),
    vendor_id                   UUID        NOT NULL REFERENCES outsource_vendors(id),

    contract_number             VARCHAR(50) NOT NULL,
    contract_name               VARCHAR(200),
    service_type                VARCHAR(100) NOT NULL,
    contract_type               VARCHAR(50),

    start_date                  DATE        NOT NULL,
    end_date                    DATE        NOT NULL CHECK (end_date > start_date),
    renewal_alert_days          INT         DEFAULT 90,
    auto_renewal                BOOLEAN     DEFAULT FALSE,

    total_contract_value_npr    NUMERIC(15,2),
    monthly_billing_rate_npr    NUMERIC(12,2),
    rate_per_worker_per_day     NUMERIC(10,2),
    billing_cycle               VARCHAR(20) DEFAULT 'monthly',

    max_workers_allowed         INT         NOT NULL CHECK (max_workers_allowed > 0),
    min_workers_guaranteed      INT         DEFAULT 0,
    current_workers_deployed    INT         DEFAULT 0,

    -- Nepal Labour Act 2074 legal obligations
    ensures_min_wage            BOOLEAN     DEFAULT TRUE,   -- NPR 15,000/mo minimum
    ensures_ssf_payment         BOOLEAN     DEFAULT TRUE,
    ensures_insurance           BOOLEAN     DEFAULT TRUE,
    non_core_work_only          BOOLEAN     DEFAULT TRUE,   -- Section 52: non-core only
    main_employer_co_liable     BOOLEAN     DEFAULT TRUE,   -- Section 55: co-liability

    sla_kpis                    JSONB       DEFAULT '[]',
    key_clauses                 JSONB       DEFAULT '[]',
    penalty_clauses             JSONB       DEFAULT '[]',
    termination_notice_days     INT         DEFAULT 30,

    overall_compliance_pct      NUMERIC(5,2) DEFAULT 100,
    status                      VARCHAR(20)  DEFAULT 'active'
                                CHECK (status IN ('draft','active','renewal_due','expired','terminated')),

    contract_pdf_url            TEXT,
    ai_risk_assessment          JSONB       DEFAULT '{}',
    ai_renewal_recommendation   TEXT,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    created_by                  UUID,
    approved_by                 UUID,
    approved_at                 TIMESTAMPTZ,
    UNIQUE (company_id, contract_number)
);

-- 5.3 SLA KPI Results (Monthly)
CREATE TABLE sla_kpi_results (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID        NOT NULL REFERENCES sla_contracts(id) ON DELETE CASCADE,
    company_id      UUID        NOT NULL REFERENCES companies(id),
    vendor_id       UUID        NOT NULL REFERENCES outsource_vendors(id),

    period_month    INT         NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year     INT         NOT NULL CHECK (period_year >= 2020),

    kpi_name        VARCHAR(100) NOT NULL,
    kpi_unit        VARCHAR(20),
    target_value    NUMERIC(10,4),
    actual_value    NUMERIC(10,4),
    is_met          BOOLEAN,
    variance        NUMERIC(10,4) GENERATED ALWAYS AS (actual_value - target_value) STORED,
    weight_pct      NUMERIC(5,2),
    score           NUMERIC(5,2),

    ai_root_cause   TEXT,
    ai_action_items JSONB       DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (contract_id, period_year, period_month, kpi_name)
);

-- 5.4 Vendor Employees
CREATE TABLE vendor_employees (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              UUID        NOT NULL REFERENCES companies(id),
    vendor_id               UUID        NOT NULL REFERENCES outsource_vendors(id),
    contract_id             UUID        REFERENCES sla_contracts(id),

    -- VE prefix to distinguish from direct employees
    vendor_emp_id           VARCHAR(30) NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    name_nepali             VARCHAR(200),
    role                    VARCHAR(100),
    service_category        VARCHAR(100),

    assigned_location       VARCHAR(200),
    assigned_work_location_id UUID,
    shift_type              VARCHAR(30),
    shift_start             TIME,
    shift_end               TIME,
    join_date               DATE,
    assignment_end_date     DATE,

    -- Compliance verification (main employer's obligation per Labour Act 2074)
    id_verified             BOOLEAN     DEFAULT FALSE,
    bg_verified             BOOLEAN     DEFAULT FALSE,
    bg_verified_date        DATE,
    insurance_active        BOOLEAN     DEFAULT FALSE,
    insurance_verified_date DATE,
    ssf_paid_current_month  BOOLEAN     DEFAULT FALSE,
    ssf_last_verified_date  DATE,
    min_wage_compliant      BOOLEAN     DEFAULT TRUE,

    phone                   VARCHAR(30),
    emergency_contact       VARCHAR(200),
    monthly_wage_npr        NUMERIC(10,2) CHECK (monthly_wage_npr IS NULL OR monthly_wage_npr >= 15000),
    daily_rate_npr          NUMERIC(10,2),

    -- Limited access (NOT like direct employees)
    has_badge_access        BOOLEAN     DEFAULT FALSE,
    has_system_access       BOOLEAN     DEFAULT FALSE,  -- MUST be FALSE per policy
    access_areas            TEXT[]      DEFAULT '{}',

    status                  VARCHAR(20) DEFAULT 'active',
    ai_ghost_risk_score     NUMERIC(5,2) DEFAULT 0,
    ai_compliance_score     NUMERIC(5,2) DEFAULT 100,
    ai_flags                JSONB       DEFAULT '[]',

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, vendor_emp_id)
);

-- 5.5 Vendor Invoices / Billing
CREATE TABLE vendor_invoices (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID        NOT NULL REFERENCES companies(id),
    vendor_id                   UUID        NOT NULL REFERENCES outsource_vendors(id),
    contract_id                 UUID        NOT NULL REFERENCES sla_contracts(id),

    invoice_number              VARCHAR(50) NOT NULL,
    invoice_period_month        INT         NOT NULL CHECK (invoice_period_month BETWEEN 1 AND 12),
    invoice_period_year         INT         NOT NULL,
    issue_date                  DATE        NOT NULL,
    due_date                    DATE        NOT NULL CHECK (due_date >= issue_date),
    payment_date                DATE,

    workers_billed              INT,
    days_billed                 INT,
    rate_per_day_npr            NUMERIC(10,2),
    amount_before_tax_npr       NUMERIC(12,2) NOT NULL CHECK (amount_before_tax_npr >= 0),
    tds_rate_pct                NUMERIC(5,2)  DEFAULT 1.5,   -- Nepal TDS on services
    tds_amount_npr              NUMERIC(12,2) DEFAULT 0,
    total_amount_npr            NUMERIC(12,2) NOT NULL CHECK (total_amount_npr >= 0),

    -- AI validation fields
    timesheet_amount_npr        NUMERIC(12,2),
    attendance_amount_npr       NUMERIC(12,2),
    discrepancy_amount_npr      NUMERIC(12,2)
                                GENERATED ALWAYS AS (total_amount_npr - COALESCE(timesheet_amount_npr, total_amount_npr)) STORED,
    has_discrepancy             BOOLEAN     DEFAULT FALSE,
    ai_validated                BOOLEAN     DEFAULT FALSE,
    ai_validation_result        TEXT,
    ai_validated_at             TIMESTAMPTZ,
    ai_fraud_risk_score         NUMERIC(5,2) DEFAULT 0,

    timesheet_approved          BOOLEAN     DEFAULT FALSE,
    timesheet_approved_by       UUID,
    timesheet_approved_at       TIMESTAMPTZ,
    attendance_verified         BOOLEAN     DEFAULT FALSE,
    attendance_verified_by      UUID,

    status                      VARCHAR(30) DEFAULT 'pending_approval'
                                CHECK (status IN ('draft','submitted','pending_approval','approved','disputed','paid','rejected')),
    dispute_reason              TEXT,
    dispute_raised_by           UUID,
    dispute_raised_at           TIMESTAMPTZ,
    dispute_resolved_at         TIMESTAMPTZ,
    approved_by                 UUID,
    approved_at                 TIMESTAMPTZ,
    payment_reference           VARCHAR(100),
    invoice_pdf_url             TEXT,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, invoice_number)
);

-- 5.6 Vendor Attendance
CREATE TABLE vendor_attendance (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              UUID        NOT NULL REFERENCES companies(id),
    vendor_id               UUID        NOT NULL REFERENCES outsource_vendors(id),
    vendor_employee_id      UUID        NOT NULL REFERENCES vendor_employees(id),
    contract_id             UUID        REFERENCES sla_contracts(id),
    invoice_id              UUID        REFERENCES vendor_invoices(id),

    attendance_date         DATE        NOT NULL,
    period_month            INT         GENERATED ALWAYS AS (EXTRACT(MONTH FROM attendance_date)::INT) STORED,
    period_year             INT         GENERATED ALWAYS AS (EXTRACT(YEAR  FROM attendance_date)::INT) STORED,
    shift_type              VARCHAR(30),

    check_in_time           TIMESTAMPTZ,
    check_out_time          TIMESTAMPTZ,
    hours_worked            NUMERIC(5,2) GENERATED ALWAYS AS (
                              CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL
                                   THEN ROUND(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600.0, 2)
                                   ELSE NULL END
                            ) STORED,
    overtime_hours          NUMERIC(5,2) DEFAULT 0,

    is_present              BOOLEAN     DEFAULT FALSE,
    is_absent               BOOLEAN     DEFAULT FALSE,
    is_late                 BOOLEAN     DEFAULT FALSE,
    late_minutes            INT         DEFAULT 0,
    is_half_day             BOOLEAN     DEFAULT FALSE,
    leave_type              VARCHAR(50),

    biometric_verified      BOOLEAN     DEFAULT FALSE,
    gps_verified            BOOLEAN     DEFAULT FALSE,
    gps_latitude            NUMERIC(10,7),
    gps_longitude           NUMERIC(10,7),
    verified_by             UUID,
    verification_method     VARCHAR(50),

    ghost_risk_score        NUMERIC(5,2) DEFAULT 0 CHECK (ghost_risk_score BETWEEN 0 AND 100),
    ghost_risk_flags        JSONB        DEFAULT '[]',
    ai_anomaly_detected     BOOLEAN      DEFAULT FALSE,
    included_in_invoice     BOOLEAN      DEFAULT FALSE,
    remarks                 TEXT,

    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (vendor_employee_id, attendance_date)
);

-- 5.7 Vendor Performance Cards (Monthly Scorecard)
CREATE TABLE vendor_performance_cards (
    id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID        NOT NULL REFERENCES companies(id),
    vendor_id                   UUID        NOT NULL REFERENCES outsource_vendors(id),
    contract_id                 UUID        NOT NULL REFERENCES sla_contracts(id),

    period_month                INT         NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year                 INT         NOT NULL,

    fill_rate_target_pct        NUMERIC(5,2),
    fill_rate_actual_pct        NUMERIC(5,2),
    fill_rate_met               BOOLEAN,

    attendance_target_pct       NUMERIC(5,2),
    attendance_actual_pct       NUMERIC(5,2),
    attendance_met              BOOLEAN,

    legal_compliance_target_pct NUMERIC(5,2),
    legal_compliance_actual_pct NUMERIC(5,2),
    legal_compliance_met        BOOLEAN,

    billing_accuracy_target_pct NUMERIC(5,2),
    billing_accuracy_actual_pct NUMERIC(5,2),
    billing_accuracy_met        BOOLEAN,

    turnover_rate_target_pct    NUMERIC(5,2),
    turnover_rate_actual_pct    NUMERIC(5,2),
    turnover_rate_met           BOOLEAN,

    custom_kpi_results          JSONB       DEFAULT '[]',

    overall_score               NUMERIC(5,2) CHECK (overall_score BETWEEN 0 AND 100),
    overall_risk_level          VARCHAR(20)  DEFAULT 'low'
                                CHECK (overall_risk_level IN ('low','medium','high','critical')),

    ai_generated                BOOLEAN     DEFAULT TRUE,
    ai_generated_at             TIMESTAMPTZ,
    ai_summary                  TEXT,
    ai_recommendation           TEXT,
    ai_trend                    VARCHAR(20) CHECK (ai_trend IN ('improving','stable','declining')),

    warning_issued              BOOLEAN     DEFAULT FALSE,
    warning_issued_at           TIMESTAMPTZ,
    action_plan_received        BOOLEAN     DEFAULT FALSE,
    reviewed_by                 UUID,
    reviewed_at                 TIMESTAMPTZ,
    review_notes                TEXT,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (vendor_id, contract_id, period_year, period_month)
);

-- ============================================================
-- SECTION 6: PERFORMANCE INDEXES
-- ============================================================

-- Group & Company
CREATE INDEX idx_companies_group          ON companies (group_id);
CREATE INDEX idx_companies_pan            ON companies (pan_number);
CREATE INDEX idx_companies_status         ON companies (status);
CREATE INDEX idx_legal_docs_expiry        ON company_legal_documents (expiry_date);
CREATE INDEX idx_legal_docs_type          ON company_legal_documents (doc_type);

-- Branches & BUs
CREATE INDEX idx_branches_company         ON branches (company_id);
CREATE INDEX idx_branches_type            ON branches (branch_type);
CREATE INDEX idx_bus_company              ON business_units (company_id);
CREATE INDEX idx_bus_branch               ON business_units (branch_id);

-- Dept & Team
CREATE INDEX idx_depts_bu                 ON departments (business_unit_id);
CREATE INDEX idx_depts_fts                ON departments USING GIN (full_text_search);
CREATE INDEX idx_sections_dept            ON sections (department_id);
CREATE INDEX idx_teams_dept               ON teams (department_id);
CREATE INDEX idx_teams_cba                ON teams (cba_eligible);

-- Cost Centers & Work Locations
CREATE INDEX idx_cc_company               ON cost_centers (company_id);
CREATE INDEX idx_wl_branch                ON work_locations (branch_id);

-- Structure & Hierarchy
CREATE INDEX idx_grades_track             ON grade_levels (track, company_id);
CREATE INDEX idx_designations_grade       ON designations (grade_id);
CREATE INDEX idx_designations_fts         ON designations USING GIN (full_text_search);
CREATE INDEX idx_positions_dept           ON positions (department_id);
CREATE INDEX idx_positions_reports_to     ON positions (reports_to_position_id);
CREATE INDEX idx_positions_status         ON positions (status);
CREATE INDEX idx_positions_risk           ON positions (ai_attrition_risk_score DESC);
CREATE INDEX idx_org_chart_path           ON org_chart_nodes USING GIST (path);
CREATE INDEX idx_org_chart_depth          ON org_chart_nodes (company_id, depth);

-- Workforce Config
CREATE INDEX idx_vendors_license          ON outsource_vendors (moless_license_no);
CREATE INDEX idx_vendors_service          ON outsource_vendors (service_category);
CREATE INDEX idx_contracts_end            ON sla_contracts (end_date);
CREATE INDEX idx_contracts_status         ON sla_contracts (status);
CREATE INDEX idx_kpi_results_period       ON sla_kpi_results (period_year, period_month);
CREATE INDEX idx_ve_vendor                ON vendor_employees (vendor_id);
CREATE INDEX idx_ve_status                ON vendor_employees (status);
CREATE INDEX idx_ve_ghost_risk            ON vendor_employees (ai_ghost_risk_score DESC);
CREATE INDEX idx_invoices_status          ON vendor_invoices (status);
CREATE INDEX idx_invoices_period          ON vendor_invoices (invoice_period_year, invoice_period_month);
CREATE INDEX idx_invoices_discrepancy     ON vendor_invoices (has_discrepancy) WHERE has_discrepancy = TRUE;
CREATE INDEX idx_attendance_date          ON vendor_attendance (attendance_date);
CREATE INDEX idx_attendance_ghost         ON vendor_attendance (ghost_risk_score DESC) WHERE ghost_risk_score > 50;
CREATE INDEX idx_perf_cards_score         ON vendor_performance_cards (overall_score ASC);
CREATE INDEX idx_perf_cards_period        ON vendor_performance_cards (period_year, period_month);

-- ============================================================
-- SECTION 7: HELPER FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- Apply to all main tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'group_companies','companies','branches','business_units',
    'departments','sections','teams','cost_centers','work_locations',
    'employment_categories','job_families','grade_levels','designations','positions',
    'outsource_vendors','sla_contracts','vendor_employees','vendor_invoices',
    'vendor_attendance','vendor_performance_cards'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_ts BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp()', t, t);
  END LOOP;
END$$;

-- Auto-set CBA / Safety Committee flags when team members change
CREATE OR REPLACE FUNCTION fn_check_team_nepal_law()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.cba_eligible := (NEW.current_members >= 10);
  NEW.safety_committee_required := (NEW.current_members >= 20);
  IF NEW.cba_eligible THEN
    NEW.cba_note := 'CBA required: ' || NEW.current_members || ' members >= 10 (Labour Act 2074 Section 7)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_team_nepal_law
  BEFORE INSERT OR UPDATE OF current_members ON teams
  FOR EACH ROW EXECUTE FUNCTION fn_check_team_nepal_law();

-- Auto-flag vendor invoice discrepancy
CREATE OR REPLACE FUNCTION fn_check_invoice_discrepancy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.timesheet_amount_npr IS NOT NULL THEN
    IF ABS(NEW.total_amount_npr - NEW.timesheet_amount_npr) > 100 THEN
      NEW.has_discrepancy := TRUE;
    ELSE
      NEW.has_discrepancy := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_discrepancy
  BEFORE INSERT OR UPDATE ON vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION fn_check_invoice_discrepancy();

-- Auto-update company headcount when positions change
CREATE OR REPLACE FUNCTION fn_update_dept_headcount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE departments
  SET current_headcount = (
    SELECT COUNT(*) FROM positions
    WHERE department_id = COALESCE(NEW.department_id, OLD.department_id)
    AND status = 'filled'
  ),
  open_positions = (
    SELECT COUNT(*) FROM positions
    WHERE department_id = COALESCE(NEW.department_id, OLD.department_id)
    AND status = 'vacant'
  )
  WHERE id = COALESCE(NEW.department_id, OLD.department_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_positions_headcount
  AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH ROW EXECUTE FUNCTION fn_update_dept_headcount();

-- Probation expiry check (run daily via pg_cron)
-- SELECT cron.schedule('check-probation', '0 8 * * *', $$
--   UPDATE employment_categories
--   SET ai_compliance_notes = jsonb_set(
--     ai_compliance_notes, '{probation_expiry_alert}',
--     to_jsonb('check_required')
--   )
--   WHERE code = 'probation'
--   AND max_probation_months IS NOT NULL;
-- $$);

-- ============================================================
-- SECTION 8: SEED DATA — Nepal Labour Act 2074 Employment Types
-- ============================================================

-- These are seeded during company onboarding for every new company
-- The application layer calls fn_seed_employment_categories(company_id)

CREATE OR REPLACE FUNCTION fn_seed_employment_categories(p_company_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO employment_categories (
    company_id, code, name, name_nepali, la_section,
    written_contract_required, max_probation_months, max_hours_per_week,
    max_days_per_month, cba_eligible, overtime_eligible, pf_required, ssf_required
  ) VALUES
    (p_company_id,'regular',    'Regular / Permanent','नियमित',         'Section 10(a)', TRUE,  6,    NULL, NULL, TRUE,  FALSE, TRUE,  TRUE),
    (p_company_id,'probation',  'Probation',          'परीक्षाकाल',    'Section 10',    TRUE,  6,    NULL, NULL, FALSE, FALSE, TRUE,  TRUE),
    (p_company_id,'contract_tb','Time-Based Contract','समय-सीमित',      'Section 10(c)', TRUE,  NULL, NULL, NULL, FALSE, FALSE, TRUE,  TRUE),
    (p_company_id,'contract_wb','Work-Based Contract','कार्य-आधारित',   'Section 10(b)', TRUE,  NULL, NULL, NULL, FALSE, FALSE, TRUE,  TRUE),
    (p_company_id,'casual',     'Casual',             'अनियमित',        'Section 10(d)', FALSE, NULL, NULL, 7,    TRUE,  TRUE,  FALSE, FALSE),
    (p_company_id,'part_time',  'Part-Time',          'अल्पकालीन',     'Section 10(e)', TRUE,  3,    35,   NULL, TRUE,  TRUE,  TRUE,  TRUE),
    (p_company_id,'intern',     'Intern',             'इन्टर्न',        'Company Policy',TRUE,  NULL, 40,   NULL, FALSE, FALSE, FALSE, FALSE),
    (p_company_id,'trainee',    'Trainee',            'प्रशिक्षार्थी', 'Company Policy',TRUE,  NULL, 40,   NULL, FALSE, FALSE, TRUE,  FALSE),
    (p_company_id,'daily_wage', 'Daily Wage',         'दैनिक ज्याला',  'Section 10(d)', FALSE, NULL, 8,    NULL, TRUE,  TRUE,  FALSE, FALSE),
    (p_company_id,'outsource',  'Outsource',          'ठेक्का',         'Section 52-60', FALSE, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE),
    (p_company_id,'consultant', 'Consultant',         'परामर्शदाता',   'Company Policy',TRUE,  NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE)
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$;

-- ============================================================
-- SECTION 9: VIEWS FOR REPORTING
-- ============================================================

-- V1: Department Headcount Summary
CREATE VIEW v_department_headcount AS
SELECT
    c.name                  AS company,
    bu.name                 AS business_unit,
    d.name                  AS department,
    d.dept_type,
    d.head_name             AS dept_head,
    d.hrbp_name             AS hrbp,
    COUNT(p.id)             AS total_positions,
    SUM(CASE WHEN p.status = 'filled'  THEN 1 ELSE 0 END) AS filled,
    SUM(CASE WHEN p.status = 'vacant'  THEN 1 ELSE 0 END) AS vacant,
    ROUND(
      SUM(CASE WHEN p.status = 'filled' THEN 1 ELSE 0 END)::NUMERIC /
      NULLIF(COUNT(p.id),0) * 100, 1
    )                       AS fill_rate_pct,
    d.annual_budget_npr
FROM departments d
LEFT JOIN companies c       ON d.company_id = c.id
LEFT JOIN business_units bu ON d.business_unit_id = bu.id
LEFT JOIN positions p       ON p.department_id = d.id
GROUP BY c.name, bu.name, d.name, d.dept_type, d.head_name, d.hrbp_name, d.annual_budget_npr;

-- V2: Vendor Compliance Dashboard
CREATE VIEW v_vendor_compliance AS
SELECT
    ov.vendor_name,
    ov.service_category,
    ov.moless_license_no,
    ov.moless_license_expiry,
    ov.is_licensed_agency,
    COUNT(ve.id)                            AS total_workers,
    SUM(CASE WHEN ve.ssf_paid_current_month THEN 1 ELSE 0 END) AS ssf_paid_workers,
    SUM(CASE WHEN ve.insurance_active       THEN 1 ELSE 0 END) AS insured_workers,
    SUM(CASE WHEN ve.bg_verified            THEN 1 ELSE 0 END) AS bg_verified_workers,
    ROUND(ov.overall_performance_score, 1)  AS performance_score,
    ov.overall_risk_level
FROM outsource_vendors ov
LEFT JOIN vendor_employees ve ON ve.vendor_id = ov.id
GROUP BY ov.vendor_name, ov.service_category, ov.moless_license_no,
         ov.moless_license_expiry, ov.is_licensed_agency,
         ov.overall_performance_score, ov.overall_risk_level;

-- V3: Grade Salary Band Overview
CREATE VIEW v_grade_salary_bands AS
SELECT
    gl.code             AS grade,
    gl.name             AS grade_name,
    gl.track,
    gl.salary_min_npr   AS min_npr,
    gl.salary_mid_npr   AS mid_npr,
    gl.salary_max_npr   AS max_npr,
    gl.bonus_target_pct,
    gl.is_managerial,
    gl.can_hire,
    gl.span_of_control_max,
    COUNT(d.id)         AS designations,
    COUNT(p.id)         AS positions,
    SUM(CASE WHEN p.status='filled' THEN 1 ELSE 0 END) AS filled_positions
FROM grade_levels gl
LEFT JOIN designations d ON d.grade_id = gl.id
LEFT JOIN positions p    ON p.designation_id = d.id
GROUP BY gl.code, gl.name, gl.track, gl.salary_min_npr, gl.salary_mid_npr,
         gl.salary_max_npr, gl.bonus_target_pct, gl.is_managerial,
         gl.can_hire, gl.span_of_control_max
ORDER BY gl.level_number;

-- V4: Invoice Reconciliation Report
CREATE VIEW v_invoice_reconciliation AS
SELECT
    vi.invoice_number,
    ov.vendor_name,
    vi.invoice_period_year    AS year,
    vi.invoice_period_month   AS month,
    vi.workers_billed,
    vi.days_billed,
    vi.total_amount_npr,
    vi.timesheet_amount_npr,
    vi.attendance_amount_npr,
    ABS(vi.total_amount_npr - COALESCE(vi.timesheet_amount_npr, vi.total_amount_npr))
                              AS discrepancy_npr,
    vi.has_discrepancy,
    vi.ai_validated,
    vi.ai_validation_result,
    vi.status,
    vi.ai_fraud_risk_score
FROM vendor_invoices vi
JOIN outsource_vendors ov ON ov.id = vi.vendor_id
ORDER BY vi.invoice_period_year DESC, vi.invoice_period_month DESC;

-- V5: Nepal Labour Act Compliance Status
CREATE VIEW v_nepal_labour_compliance AS
SELECT
    c.name                  AS company,
    -- Team compliance
    COUNT(CASE WHEN t.cba_eligible           THEN 1 END) AS teams_needing_cba,
    COUNT(CASE WHEN t.safety_committee_required THEN 1 END) AS teams_needing_safety_comm,
    -- Vendor compliance
    COUNT(CASE WHEN NOT ov.is_licensed_agency THEN 1 END) AS unlicensed_vendors,
    COUNT(CASE WHEN ov.moless_license_expiry < CURRENT_DATE THEN 1 END) AS expired_licenses,
    -- Employee compliance
    COUNT(CASE WHEN ec.code = 'probation' AND ec.max_probation_months > 6 THEN 1 END) AS probation_violations,
    -- Invoice compliance
    COUNT(CASE WHEN vi.has_discrepancy THEN 1 END) AS invoice_discrepancies
FROM companies c
LEFT JOIN teams t                 ON t.company_id = c.id
LEFT JOIN outsource_vendors ov    ON ov.company_id = c.id
LEFT JOIN employment_categories ec ON ec.company_id = c.id
LEFT JOIN vendor_invoices vi      ON vi.company_id = c.id AND vi.status = 'disputed'
GROUP BY c.name;

