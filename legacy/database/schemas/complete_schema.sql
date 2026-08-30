-- ============================================================
-- FILE: database/schemas/complete_schema.sql
-- eLogix HRMS — COMPLETE Master PostgreSQL Schema
-- ALL modules from Excel: Company Profile, Company Setup,
-- Group Company, Branch & Location, Business Unit,
-- Department, Section & Unit, Team, Cost Center, Work Location,
-- Employment Category (13 types), Designation Setup,
-- Grade & Level, Reporting Hierarchy, Org Chart,
-- Position Management, Employment Type Insource/Outsource,
-- SLA & Contract, Vendor Employees, Billing & Invoice,
-- Vendor Attendance, Vendor Performance
-- Engine: PostgreSQL 15+ | Nepal Labour Act 2074 Compliant
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Schema
CREATE SCHEMA IF NOT EXISTS elogix;
SET search_path TO elogix, public;

-- ============================================================
-- SECTION 1: GROUP COMPANY
-- ============================================================
CREATE TABLE group_companies (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                  VARCHAR(200) NOT NULL,
    name_nepali           VARCHAR(200),
    short_name            VARCHAR(50),
    registration_no       VARCHAR(100) UNIQUE,
    pan_no                VARCHAR(20),
    vat_no                VARCHAR(20),
    established_year      INT,
    headquarters_country  VARCHAR(100) DEFAULT 'Nepal',
    headquarters_address  TEXT,
    group_type            VARCHAR(50),
    industry_sectors      TEXT[],
    total_subsidiaries    INT          DEFAULT 0,
    total_employees       INT          DEFAULT 0,
    website               VARCHAR(255),
    logo_url              VARCHAR(500),
    status                VARCHAR(20)  DEFAULT 'active'
                          CHECK (status IN ('active','inactive','pending','suspended')),
    ai_group_insights     JSONB        DEFAULT '{}',
    sap_group_code        VARCHAR(50),
    erp_sync_at           TIMESTAMPTZ,
    -- Audit
    created_at            TIMESTAMPTZ  DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  DEFAULT NOW(),
    created_by            UUID,
    updated_by            UUID,
    is_deleted            BOOLEAN      DEFAULT FALSE,
    deleted_at            TIMESTAMPTZ,
    ai_metadata           JSONB        DEFAULT '{}'
);

-- ============================================================
-- SECTION 2: COMPANY PROFILE & SETUP
-- ============================================================
CREATE TABLE companies (
    id                         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id                   UUID         REFERENCES group_companies(id) ON DELETE RESTRICT,
    -- Profile
    name                       VARCHAR(200) NOT NULL,
    name_nepali                VARCHAR(200),
    short_name                 VARCHAR(50),
    tagline                    VARCHAR(500),
    registration_type          VARCHAR(40)  DEFAULT 'private_limited',
    registration_no            VARCHAR(100) UNIQUE,
    registration_date          DATE,
    pan_no                     VARCHAR(20)  UNIQUE,
    vat_registered             BOOLEAN      DEFAULT FALSE,
    vat_no                     VARCHAR(20),
    industry                   VARCHAR(100),
    sub_industry               VARCHAR(100),
    established_year           INT,
    fiscal_year_type           VARCHAR(5)   DEFAULT 'BS',
    fiscal_year_start          VARCHAR(10)  DEFAULT '04-01',
    employee_count_band        VARCHAR(30),
    website                    VARCHAR(255),
    logo_url                   VARCHAR(500),
    company_color              CHAR(7)      DEFAULT '#1e40af',
    status                     VARCHAR(20)  DEFAULT 'active',
    -- Address
    province                   VARCHAR(100),
    district                   VARCHAR(100),
    municipality               VARCHAR(100),
    ward_no                    VARCHAR(10),
    street                     VARCHAR(255),
    postal_code                VARCHAR(20),
    country                    VARCHAR(100) DEFAULT 'Nepal',
    latitude                   FLOAT,
    longitude                  FLOAT,
    -- Contacts
    phone                      VARCHAR(50),
    fax                        VARCHAR(50),
    email                      VARCHAR(255),
    hr_contact_email           VARCHAR(255),
    -- Nepal Statutory (Labour Act 2074)
    labour_office_zone         VARCHAR(100),
    ssf_employer_no            VARCHAR(50),
    pf_employer_no             VARCHAR(50),
    cit_registration           VARCHAR(50),
    labour_act_compliance_level VARCHAR(20) DEFAULT 'full',
    moles_registered           BOOLEAN      DEFAULT FALSE,
    factory_act_applicable     BOOLEAN      DEFAULT FALSE,
    trade_union_registered     BOOLEAN      DEFAULT FALSE,
    collective_bargaining_active BOOLEAN    DEFAULT FALSE,
    min_wage_applicable        NUMERIC(12,2) DEFAULT 15000
                               CHECK (min_wage_applicable >= 15000),
    -- Setup Wizard
    setup_step                 INT          DEFAULT 1  CHECK (setup_step BETWEEN 1 AND 5),
    setup_completed            BOOLEAN      DEFAULT FALSE,
    setup_completed_at         TIMESTAMPTZ,
    onboarding_checklist       JSONB        DEFAULT '{}',
    -- AI
    ai_risk_score              FLOAT        CHECK (ai_risk_score BETWEEN 0 AND 100),
    ai_insights                JSONB        DEFAULT '{}',
    ai_benchmarks              JSONB        DEFAULT '{}',
    -- ERP
    sap_company_code           VARCHAR(20),
    oracle_org_id              VARCHAR(50),
    erp_sync_enabled           BOOLEAN      DEFAULT FALSE,
    erp_last_sync              TIMESTAMPTZ,
    -- Audit
    created_at                 TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  DEFAULT NOW(),
    created_by                 UUID,
    updated_by                 UUID,
    is_deleted                 BOOLEAN      DEFAULT FALSE,
    ai_metadata                JSONB        DEFAULT '{}'
);

CREATE TABLE company_legal_documents (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    doc_type             VARCHAR(100) NOT NULL,   -- PAN, VAT, Labour, SSF, Factory, etc.
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
    ai_expiry_risk       VARCHAR(20)  DEFAULT 'low'
                         CHECK (ai_expiry_risk IN ('low','medium','high','critical')),
    notes                TEXT,
    created_at           TIMESTAMPTZ  DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted           BOOLEAN      DEFAULT FALSE
);

-- ============================================================
-- SECTION 3: BRANCH & LOCATION SETUP
-- ============================================================
CREATE TABLE branches (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id            UUID         NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    parent_branch_id      UUID         REFERENCES branches(id),
    code                  VARCHAR(20)  NOT NULL,
    name                  VARCHAR(200) NOT NULL,
    name_nepali           VARCHAR(200),
    branch_type           VARCHAR(30)  DEFAULT 'branch'
                          CHECK (branch_type IN ('headquarters','regional','branch','liaison','project_office','warehouse')),
    is_headquarters       BOOLEAN      DEFAULT FALSE,
    -- Location
    province              VARCHAR(100),
    district              VARCHAR(100),
    municipality          VARCHAR(100),
    ward_no               VARCHAR(10),
    street_address        TEXT,
    postal_code           VARCHAR(20),
    latitude              FLOAT,
    longitude             FLOAT,
    google_maps_url       VARCHAR(500),
    -- Nepal Labour
    labour_office_zone    VARCHAR(100),
    labour_office_address TEXT,
    local_registration_no VARCHAR(100),
    local_pan_no          VARCHAR(20),
    -- Operations
    phone                 VARCHAR(50),
    email                 VARCHAR(255),
    manager_id            UUID,
    employee_count        INT          DEFAULT 0  CHECK (employee_count >= 0),
    floor_area_sqft       FLOAT,
    capacity              INT,
    established_date      DATE,
    status                VARCHAR(20)  DEFAULT 'active',
    ai_branch_insights    JSONB        DEFAULT '{}',
    -- Audit
    created_at            TIMESTAMPTZ  DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  DEFAULT NOW(),
    created_by            UUID,
    is_deleted            BOOLEAN      DEFAULT FALSE,
    ai_metadata           JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ============================================================
-- SECTION 4: BUSINESS UNIT / DIVISION SETUP
-- ============================================================
CREATE TABLE business_units (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id        UUID         NOT NULL REFERENCES companies(id),
    parent_bu_id      UUID         REFERENCES business_units(id),
    code              VARCHAR(20)  NOT NULL,
    name              VARCHAR(200) NOT NULL,
    name_nepali       VARCHAR(200),
    description       TEXT,
    bu_type           VARCHAR(50),
    is_profit_center  BOOLEAN      DEFAULT FALSE,
    revenue_target    NUMERIC(18,2),
    budget_allocated  NUMERIC(18,2),
    budget_utilized   NUMERIC(18,2) DEFAULT 0,
    headcount_target  INT,
    headcount_actual  INT          DEFAULT 0,
    manager_id        UUID,
    established_date  DATE,
    status            VARCHAR(20)  DEFAULT 'active',
    ai_bu_score       FLOAT        CHECK (ai_bu_score BETWEEN 0 AND 100),
    ai_insights       JSONB        DEFAULT '{}',
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW(),
    created_by        UUID,
    is_deleted        BOOLEAN      DEFAULT FALSE,
    ai_metadata       JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ============================================================
-- SECTION 5: DEPARTMENT SETUP
-- ============================================================
CREATE TABLE cost_centers (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id            UUID         NOT NULL REFERENCES companies(id),
    business_unit_id      UUID         REFERENCES business_units(id),
    parent_cc_id          UUID         REFERENCES cost_centers(id),
    code                  VARCHAR(30)  NOT NULL,
    name                  VARCHAR(200) NOT NULL,
    name_nepali           VARCHAR(200),
    description           TEXT,
    cc_type               VARCHAR(30)  DEFAULT 'cost_center'
                          CHECK (cc_type IN ('profit_center','cost_center','investment_center','service_center')),
    fiscal_year           VARCHAR(10)  NOT NULL,
    budget_annual         NUMERIC(18,2) DEFAULT 0,
    budget_q1             NUMERIC(18,2) DEFAULT 0,
    budget_q2             NUMERIC(18,2) DEFAULT 0,
    budget_q3             NUMERIC(18,2) DEFAULT 0,
    budget_q4             NUMERIC(18,2) DEFAULT 0,
    actuals_ytd           NUMERIC(18,2) DEFAULT 0,
    committed             NUMERIC(18,2) DEFAULT 0,
    gl_account_code       VARCHAR(50),
    sap_cost_center       VARCHAR(20),
    oracle_cc_code        VARCHAR(50),
    manager_id            UUID,
    approver_id           UUID,
    currency              CHAR(3)      DEFAULT 'NPR',
    status                VARCHAR(20)  DEFAULT 'active',
    ai_budget_forecast    JSONB        DEFAULT '{}',
    ai_overspend_risk     VARCHAR(20),
    ai_utilization_score  FLOAT,
    created_at            TIMESTAMPTZ  DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  DEFAULT NOW(),
    created_by            UUID,
    is_deleted            BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, code, fiscal_year)
);

CREATE TABLE departments (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID         NOT NULL REFERENCES companies(id),
    business_unit_id    UUID         REFERENCES business_units(id),
    branch_id           UUID         REFERENCES branches(id),
    parent_dept_id      UUID         REFERENCES departments(id),
    cost_center_id      UUID         REFERENCES cost_centers(id),
    code                VARCHAR(20)  NOT NULL,
    name                VARCHAR(200) NOT NULL,
    name_nepali         VARCHAR(200),
    description         TEXT,
    function_type       VARCHAR(50),
    ulrich_model        VARCHAR(30)
                        CHECK (ulrich_model IN ('strategic_hrbp','shared_services','center_of_excellence','line_management','functional')),
    headcount_actual    INT          DEFAULT 0   CHECK (headcount_actual >= 0),
    headcount_target    INT,
    annual_budget       NUMERIC(18,2),
    budget_utilized     NUMERIC(18,2) DEFAULT 0,
    manager_id          UUID,
    established_date    DATE,
    status              VARCHAR(20)  DEFAULT 'active',
    floor_plan_info     TEXT,
    process_flow_url    VARCHAR(500),
    -- Nepal Labour Act 2074
    is_core_function    BOOLEAN      DEFAULT TRUE,
    has_union_rep       BOOLEAN      DEFAULT FALSE,
    cba_applicable      BOOLEAN      DEFAULT FALSE,
    -- AI
    ai_dept_health      FLOAT        CHECK (ai_dept_health BETWEEN 0 AND 100),
    ai_attrition_risk   VARCHAR(20),
    ai_insights         JSONB        DEFAULT '{}',
    -- Search
    search_vector       TSVECTOR GENERATED ALWAYS AS (
                          to_tsvector('english',
                            coalesce(name,'') || ' ' ||
                            coalesce(name_nepali,'') || ' ' ||
                            coalesce(description,''))
                        ) STORED,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW(),
    created_by          UUID,
    is_deleted          BOOLEAN      DEFAULT FALSE,
    ai_metadata         JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ============================================================
-- SECTION 6: SECTION & UNIT
-- ============================================================
CREATE TABLE sections (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id        UUID         NOT NULL REFERENCES companies(id),
    department_id     UUID         NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code              VARCHAR(20)  NOT NULL,
    name              VARCHAR(200) NOT NULL,
    name_nepali       VARCHAR(200),
    description       TEXT,
    section_model     VARCHAR(30),   -- coe/hrss/hrbp/standard
    headcount_actual  INT          DEFAULT 0,
    headcount_target  INT,
    manager_id        UUID,
    status            VARCHAR(20)  DEFAULT 'active',
    ai_insights       JSONB        DEFAULT '{}',
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW(),
    created_by        UUID,
    is_deleted        BOOLEAN      DEFAULT FALSE,
    UNIQUE (department_id, code)
);

CREATE TABLE units (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id        UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    company_id        UUID         NOT NULL REFERENCES companies(id),
    code              VARCHAR(20)  NOT NULL,
    name              VARCHAR(200) NOT NULL,
    name_nepali       VARCHAR(200),
    description       TEXT,
    headcount_actual  INT          DEFAULT 0,
    manager_id        UUID,
    status            VARCHAR(20)  DEFAULT 'active',
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted        BOOLEAN      DEFAULT FALSE,
    UNIQUE (section_id, code)
);

-- ============================================================
-- SECTION 7: TEAM SETUP
-- ============================================================
CREATE TABLE teams (
    id                        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                UUID         NOT NULL REFERENCES companies(id),
    department_id             UUID         NOT NULL REFERENCES departments(id),
    section_id                UUID         REFERENCES sections(id),
    code                      VARCHAR(20)  NOT NULL,
    name                      VARCHAR(200) NOT NULL,
    name_nepali               VARCHAR(200),
    description               TEXT,
    team_type                 VARCHAR(30)  DEFAULT 'functional'
                              CHECK (team_type IN ('cross_functional','project','functional','self_managed','virtual','committee')),
    purpose                   TEXT,
    objectives                JSONB        DEFAULT '[]',
    team_lead_id              UUID,
    member_count              INT          DEFAULT 0  CHECK (member_count >= 0),
    max_size                  INT,
    -- Nepal Labour Act 2074 AUTO-COMPUTED
    cba_required              BOOLEAN      DEFAULT FALSE,         -- >=10 non-managerial
    safety_committee_required BOOLEAN      DEFAULT FALSE,         -- >=20
    is_managerial             BOOLEAN      DEFAULT FALSE,
    -- Lifecycle
    start_date                DATE,
    end_date                  DATE,
    status                    VARCHAR(20)  DEFAULT 'active',
    project_code              VARCHAR(50),
    ai_team_score             FLOAT,
    ai_insights               JSONB        DEFAULT '{}',
    created_at                TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                TIMESTAMPTZ  DEFAULT NOW(),
    created_by                UUID,
    is_deleted                BOOLEAN      DEFAULT FALSE,
    ai_metadata               JSONB        DEFAULT '{}',
    UNIQUE (department_id, code)
);

-- ============================================================
-- SECTION 8: WORK LOCATION
-- ============================================================
CREATE TABLE work_locations (
    id                         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                 UUID         NOT NULL REFERENCES companies(id),
    branch_id                  UUID         NOT NULL REFERENCES branches(id),
    code                       VARCHAR(20)  NOT NULL,
    name                       VARCHAR(200) NOT NULL,
    name_nepali                VARCHAR(200),
    location_type              VARCHAR(20)  DEFAULT 'office'
                               CHECK (location_type IN ('office','remote','hybrid','site','warehouse','factory')),
    floor                      VARCHAR(20),
    wing                       VARCHAR(50),
    area_sqft                  FLOAT,
    max_capacity               INT,
    current_occupancy          INT          DEFAULT 0  CHECK (current_occupancy >= 0),
    -- Facilities (Nepal Labour Act 2074 obligations)
    has_canteen                BOOLEAN      DEFAULT FALSE,
    has_creche                 BOOLEAN      DEFAULT FALSE,  -- Section 116: Creche if >50 women
    has_first_aid              BOOLEAN      DEFAULT FALSE,
    has_fire_exit              BOOLEAN      DEFAULT FALSE,
    safety_cert_expiry         DATE,
    -- Shift & Access
    default_shift_id           UUID,
    labour_zone                VARCHAR(100),
    is_remote                  BOOLEAN      DEFAULT FALSE,
    remote_allowance_eligible  BOOLEAN      DEFAULT FALSE,
    access_card_required       BOOLEAN      DEFAULT FALSE,
    biometric_enabled          BOOLEAN      DEFAULT FALSE,
    cctv_enabled               BOOLEAN      DEFAULT FALSE,
    status                     VARCHAR(20)  DEFAULT 'active',
    ai_insights                JSONB        DEFAULT '{}',
    created_at                 TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  DEFAULT NOW(),
    created_by                 UUID,
    is_deleted                 BOOLEAN      DEFAULT FALSE,
    UNIQUE (branch_id, code)
);

-- ============================================================
-- SECTION 9: EMPLOYMENT CATEGORY (13 types)
-- ============================================================
CREATE TABLE employment_categories (
    id                         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                 UUID         REFERENCES companies(id),   -- NULL = global seed
    code                       VARCHAR(30)  NOT NULL,
    name                       VARCHAR(100) NOT NULL,
    name_nepali                VARCHAR(100),
    la_type                    VARCHAR(30)  NOT NULL
                               CHECK (la_type IN ('regular','probation','work_based','time_bound',
                                 'casual','part_time','intern','trainee','daily_wage','outsource','consultant')),
    la_section                 VARCHAR(100),
    tier2_classification       VARCHAR(50),
    -- Contract Rules
    written_contract_required  BOOLEAN      DEFAULT TRUE,
    max_probation_months       INT          DEFAULT 0
                               CHECK (max_probation_months <= 6),        -- Nepal law max
    max_duration_months        INT,
    max_days_per_month         INT          CHECK (max_days_per_month IS NULL OR max_days_per_month <= 7),
    termination_notice_days    INT          DEFAULT 0,
    -- Statutory Benefits (Nepal Labour Act 2074)
    pf_eligible                BOOLEAN      DEFAULT FALSE,
    ssf_eligible               BOOLEAN      DEFAULT FALSE,
    gratuity_eligible          BOOLEAN      DEFAULT FALSE,
    medical_eligible           BOOLEAN      DEFAULT FALSE,
    annual_leave_days          INT          DEFAULT 0,
    sick_leave_days            INT          DEFAULT 0,
    maternity_eligible         BOOLEAN      DEFAULT FALSE,
    paternity_eligible         BOOLEAN      DEFAULT FALSE,
    cba_eligible               BOOLEAN      DEFAULT FALSE,
    -- Working Hours
    max_daily_hrs              FLOAT,
    max_weekly_hrs             FLOAT        CHECK (max_weekly_hrs IS NULL OR max_weekly_hrs <= 35 OR la_type != 'part_time'),
    -- Display
    statutory_color            CHAR(7)      DEFAULT '#64748b',
    is_active                  BOOLEAN      DEFAULT TRUE,
    is_system                  BOOLEAN      DEFAULT FALSE,
    sort_order                 INT          DEFAULT 0,
    -- AI
    ai_compliance_notes        TEXT,
    ai_risk_level              VARCHAR(20)  DEFAULT 'low'
                               CHECK (ai_risk_level IN ('low','medium','high','critical')),
    ai_misclassification_risk  TEXT,
    created_at                 TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted                 BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, code)
);

-- ============================================================
-- SECTION 10: DESIGNATION SETUP
-- ============================================================
CREATE TABLE job_families (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID         NOT NULL REFERENCES companies(id),
    code        VARCHAR(20)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    name_nepali VARCHAR(100),
    description TEXT,
    is_active   BOOLEAN      DEFAULT TRUE,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted  BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, code)
);

CREATE TABLE grade_levels (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id            UUID         NOT NULL REFERENCES companies(id),
    code                  VARCHAR(20)  NOT NULL,
    name                  VARCHAR(100) NOT NULL,
    name_nepali           VARCHAR(100),
    grade_number          INT,
    level_order           INT,
    category              VARCHAR(50),
    -- Salary Band NPR (Nepal min wage constraint)
    salary_min            NUMERIC(12,2) NOT NULL CHECK (salary_min >= 15000),
    salary_mid            NUMERIC(12,2),
    salary_max            NUMERIC(12,2) NOT NULL,
    currency              CHAR(3)       DEFAULT 'NPR',
    -- Statutory Rates (Nepal law defaults)
    pf_pct_employer       FLOAT         DEFAULT 10.0,
    pf_pct_employee       FLOAT         DEFAULT 10.0,
    ssf_pct_employer      FLOAT         DEFAULT 3.33,
    gratuity_pct          FLOAT         DEFAULT 8.33,
    annual_bonus_months   FLOAT         DEFAULT 1.0,
    medical_allowance_npr NUMERIC(10,2),
    festival_bonus_pct    FLOAT         DEFAULT 100.0,
    -- Progression
    increment_pct_min     FLOAT         DEFAULT 5.0,
    increment_pct_max     FLOAT         DEFAULT 15.0,
    promotion_criteria    JSONB         DEFAULT '{}',
    -- AI
    ai_market_benchmark   JSONB         DEFAULT '{}',
    ai_competitiveness    VARCHAR(20)   DEFAULT 'at_market',
    ai_insights           JSONB         DEFAULT '{}',
    is_active             BOOLEAN       DEFAULT TRUE,
    created_at            TIMESTAMPTZ   DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   DEFAULT NOW(),
    created_by            UUID,
    is_deleted            BOOLEAN       DEFAULT FALSE,
    UNIQUE (company_id, code),
    CHECK (salary_min <= salary_max)
);

CREATE TABLE designations (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID         NOT NULL REFERENCES companies(id),
    job_family_id        UUID         REFERENCES job_families(id),
    grade_level_id       UUID         REFERENCES grade_levels(id),
    parent_desig_id      UUID         REFERENCES designations(id),
    code                 VARCHAR(30)  NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    name_nepali          VARCHAR(200),
    level                INT,
    category             VARCHAR(50),   -- executive/managerial/supervisory/staff
    is_managerial        BOOLEAN      DEFAULT FALSE,
    is_executive         BOOLEAN      DEFAULT FALSE,
    is_supervisory       BOOLEAN      DEFAULT FALSE,
    -- Headcount
    approved_positions   INT          DEFAULT 0,
    filled_positions     INT          DEFAULT 0,
    vacancy_count        INT          GENERATED ALWAYS AS (approved_positions - filled_positions) STORED,
    -- Job Description
    jd_summary           TEXT,
    jd_responsibilities  JSONB        DEFAULT '[]',
    jd_qualifications    JSONB        DEFAULT '[]',
    jd_skills            TEXT[],
    jd_experience_years  INT,
    jd_education_level   VARCHAR(100),
    -- AI JD Generator
    ai_jd_generated      BOOLEAN      DEFAULT FALSE,
    ai_jd_content        JSONB        DEFAULT '{}',
    ai_salary_benchmark  JSONB        DEFAULT '{}',
    ai_skill_gap_report  JSONB        DEFAULT '{}',
    status               VARCHAR(20)  DEFAULT 'active',
    is_active            BOOLEAN      DEFAULT TRUE,
    -- Full text search
    search_vector        TSVECTOR GENERATED ALWAYS AS (
                           to_tsvector('english',
                             coalesce(code,'') || ' ' || coalesce(name,'') || ' ' ||
                             coalesce(jd_summary,''))
                         ) STORED,
    created_at           TIMESTAMPTZ  DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  DEFAULT NOW(),
    created_by           UUID,
    is_deleted           BOOLEAN      DEFAULT FALSE,
    ai_metadata          JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ============================================================
-- SECTION 11: REPORTING HIERARCHY
-- ============================================================
CREATE TABLE reporting_relationships (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL REFERENCES companies(id),
    employee_id         UUID        NOT NULL,
    manager_id          UUID        NOT NULL,
    relationship_type   VARCHAR(30) DEFAULT 'direct'
                        CHECK (relationship_type IN ('direct','dotted_line','project','functional')),
    is_primary          BOOLEAN     DEFAULT TRUE,
    effective_from      DATE        NOT NULL,
    effective_to        DATE,
    reason              VARCHAR(200),
    status              VARCHAR(20) DEFAULT 'active',
    ai_risk_notes       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID,
    is_deleted          BOOLEAN     DEFAULT FALSE
);

-- ============================================================
-- SECTION 12: ORGANIZATION CHART
-- ============================================================
CREATE TABLE org_chart_nodes (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID        NOT NULL REFERENCES companies(id),
    parent_node_id  UUID        REFERENCES org_chart_nodes(id),
    node_type       VARCHAR(30) NOT NULL
                    CHECK (node_type IN ('company','group','bu','dept','section','team','position','person')),
    entity_id       UUID,
    entity_name     VARCHAR(200) NOT NULL,
    entity_code     VARCHAR(30),
    path            LTREE,
    depth           INT         DEFAULT 0,
    sort_order      INT         DEFAULT 0,
    display_title   VARCHAR(200),
    display_subtitle VARCHAR(200),
    position_count  INT         DEFAULT 0,
    employee_count  INT         DEFAULT 0,
    avatar_url      VARCHAR(500),
    color_code      CHAR(7),
    is_visible      BOOLEAN     DEFAULT TRUE,
    is_collapsed    BOOLEAN     DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN     DEFAULT FALSE
);

-- ============================================================
-- SECTION 13: POSITION MANAGEMENT
-- ============================================================
CREATE TABLE positions (
    id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id               UUID         NOT NULL REFERENCES companies(id),
    designation_id           UUID         NOT NULL REFERENCES designations(id),
    grade_level_id           UUID         REFERENCES grade_levels(id),
    department_id            UUID         REFERENCES departments(id),
    branch_id                UUID         REFERENCES branches(id),
    cost_center_id           UUID         REFERENCES cost_centers(id),
    reports_to_position_id   UUID         REFERENCES positions(id),
    position_code            VARCHAR(30)  NOT NULL UNIQUE,
    position_title           VARCHAR(200) NOT NULL,
    status                   VARCHAR(30)  DEFAULT 'vacant'
                             CHECK (status IN ('vacant','filled','on_hold','eliminated','budgeted')),
    incumbent_id             UUID,
    incumbent_name           VARCHAR(200),
    filled_date              DATE,
    employment_category      VARCHAR(30)  REFERENCES employment_categories(code) DEFERRABLE,
    approved_salary_min      NUMERIC(12,2) CHECK (approved_salary_min IS NULL OR approved_salary_min >= 15000),
    approved_salary_max      NUMERIC(12,2),
    budget_code              VARCHAR(50),
    headcount_type           VARCHAR(20)  DEFAULT 'permanent',
    fte                      FLOAT        DEFAULT 1.0  CHECK (fte > 0 AND fte <= 1),
    is_critical              BOOLEAN      DEFAULT FALSE,
    succession_ready         BOOLEAN      DEFAULT FALSE,
    succession_candidate_id  UUID,
    ai_vacancy_risk          VARCHAR(20),
    ai_time_to_fill_est      INT,
    ai_insights              JSONB        DEFAULT '{}',
    effective_from           DATE,
    effective_to             DATE,
    approved_by              UUID,
    approved_at              TIMESTAMPTZ,
    created_at               TIMESTAMPTZ  DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  DEFAULT NOW(),
    created_by               UUID,
    is_deleted               BOOLEAN      DEFAULT FALSE,
    ai_metadata              JSONB        DEFAULT '{}'
);

-- ============================================================
-- SECTION 14: EMPLOYMENT TYPE — INSOURCE CONFIG
-- ============================================================
CREATE TABLE employment_type_configs (
    id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id               UUID         NOT NULL REFERENCES companies(id),
    emp_category_code        VARCHAR(30)  NOT NULL,
    is_enabled               BOOLEAN      DEFAULT TRUE,
    custom_name              VARCHAR(200),
    probation_months_override INT         CHECK (probation_months_override IS NULL OR probation_months_override <= 6),
    notice_period_days       INT          DEFAULT 30,
    min_wage_override_npr    NUMERIC(12,2) CHECK (min_wage_override_npr IS NULL OR min_wage_override_npr >= 15000),
    auto_alert_days_before   INT          DEFAULT 30,
    benefits_matrix_override JSONB        DEFAULT '{}',
    ai_misclassification_risk FLOAT,
    created_at               TIMESTAMPTZ  DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (company_id, emp_category_code)
);

-- ============================================================
-- SECTION 15: OUTSOURCE VENDOR (Employment Type — Outsource)
-- ============================================================
CREATE TABLE outsource_vendors (
    id                        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                UUID         NOT NULL REFERENCES companies(id),
    vendor_code               VARCHAR(30)  NOT NULL,
    vendor_name               VARCHAR(200) NOT NULL,
    vendor_name_nepali        VARCHAR(200),
    short_name                VARCHAR(80),
    service_category          VARCHAR(100),
    -- Nepal Labour Act 2074 Section 52: MoLESS licensed agency mandatory
    moless_license_no         VARCHAR(100),
    moless_license_expiry     DATE,
    is_licensed_agency        BOOLEAN      DEFAULT FALSE,
    agency_pan                VARCHAR(20),
    agency_registration_no    VARCHAR(50),
    -- Contact
    contact_person            VARCHAR(200),
    contact_email             VARCHAR(255),
    contact_phone             VARCHAR(50),
    address                   TEXT,
    -- Performance Summary (AI updated monthly)
    overall_performance_score FLOAT        DEFAULT 0  CHECK (overall_performance_score BETWEEN 0 AND 100),
    overall_risk_level        VARCHAR(20)  DEFAULT 'low'
                              CHECK (overall_risk_level IN ('low','medium','high','critical')),
    total_workers_deployed    INT          DEFAULT 0,
    active_contracts_count    INT          DEFAULT 0,
    status                    VARCHAR(20)  DEFAULT 'active',
    ai_vendor_insights        JSONB        DEFAULT '{}',
    ai_last_scored            TIMESTAMPTZ,
    created_at                TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                TIMESTAMPTZ  DEFAULT NOW(),
    created_by                UUID,
    is_deleted                BOOLEAN      DEFAULT FALSE,
    ai_metadata               JSONB        DEFAULT '{}',
    UNIQUE (company_id, vendor_code)
);

-- ============================================================
-- SECTION 16: SLA & CONTRACT
-- ============================================================
CREATE TABLE sla_contracts (
    id                        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                UUID         NOT NULL REFERENCES companies(id),
    vendor_id                 UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_number           VARCHAR(50)  NOT NULL,
    contract_name             VARCHAR(200),
    service_type              VARCHAR(100) NOT NULL,
    contract_type             VARCHAR(50),
    start_date                DATE         NOT NULL,
    end_date                  DATE         NOT NULL,
    renewal_alert_days        INT          DEFAULT 90,
    auto_renewal              BOOLEAN      DEFAULT FALSE,
    -- Financial
    total_contract_value_npr  NUMERIC(15,2),
    monthly_billing_rate_npr  NUMERIC(12,2),
    rate_per_worker_per_day   NUMERIC(10,2),
    billing_cycle             VARCHAR(20)  DEFAULT 'monthly',
    -- Headcount
    max_workers_allowed       INT          NOT NULL CHECK (max_workers_allowed > 0),
    min_workers_guaranteed    INT          DEFAULT 0,
    current_workers_deployed  INT          DEFAULT 0,
    -- Nepal Labour Act 2074 legal clauses
    ensures_min_wage          BOOLEAN      DEFAULT TRUE,
    ensures_ssf_payment       BOOLEAN      DEFAULT TRUE,
    ensures_insurance         BOOLEAN      DEFAULT TRUE,
    non_core_work_only        BOOLEAN      DEFAULT TRUE,    -- Section 52(2)
    main_employer_co_liable   BOOLEAN      DEFAULT TRUE,    -- Section 55
    sla_kpis                  JSONB        DEFAULT '[]',
    key_clauses               JSONB        DEFAULT '[]',
    penalty_clauses           JSONB        DEFAULT '[]',
    termination_notice_days   INT          DEFAULT 30,
    overall_compliance_pct    FLOAT        DEFAULT 100,
    status                    VARCHAR(20)  DEFAULT 'active'
                              CHECK (status IN ('draft','active','renewal_due','expired','terminated')),
    contract_pdf_url          VARCHAR(500),
    ai_risk_assessment        JSONB        DEFAULT '{}',
    ai_renewal_recommendation TEXT,
    created_at                TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                TIMESTAMPTZ  DEFAULT NOW(),
    created_by                UUID,
    approved_by               UUID,
    approved_at               TIMESTAMPTZ,
    is_deleted                BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, contract_number),
    CHECK (end_date > start_date)
);

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

-- ============================================================
-- SECTION 17: VENDOR EMPLOYEES
-- ============================================================
CREATE TABLE vendor_employees (
    id                        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                UUID         NOT NULL REFERENCES companies(id),
    vendor_id                 UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_id               UUID         REFERENCES sla_contracts(id),
    -- VE- prefix: distinguish from direct employees (co-employment prevention)
    vendor_emp_id             VARCHAR(30)  NOT NULL,
    name                      VARCHAR(200) NOT NULL,
    name_nepali               VARCHAR(200),
    role                      VARCHAR(100),
    service_category          VARCHAR(100),
    -- Assignment
    assigned_location         VARCHAR(200),
    assigned_branch_id        UUID         REFERENCES branches(id),
    shift_type                VARCHAR(30),
    shift_start               TIME,
    shift_end                 TIME,
    join_date                 DATE,
    assignment_end_date       DATE,
    -- Compliance Verification (main employer's obligation per LA2074 Section 55)
    id_verified               BOOLEAN      DEFAULT FALSE,
    bg_verified               BOOLEAN      DEFAULT FALSE,
    bg_verified_date          DATE,
    insurance_active          BOOLEAN      DEFAULT FALSE,
    insurance_verified_date   DATE,
    ssf_paid_current_month    BOOLEAN      DEFAULT FALSE,
    ssf_last_verified_date    DATE,
    min_wage_compliant        BOOLEAN      DEFAULT TRUE,
    -- Compensation (agency pays — we verify only)
    monthly_wage_npr          NUMERIC(10,2) CHECK (monthly_wage_npr IS NULL OR monthly_wage_npr >= 15000),
    daily_rate_npr            NUMERIC(10,2),
    -- Limited Access (NOT like direct employees — co-employment risk)
    has_badge_access          BOOLEAN      DEFAULT FALSE,
    has_system_access         BOOLEAN      DEFAULT FALSE,   -- MUST stay FALSE
    access_areas              TEXT[]       DEFAULT '{}',
    -- AI
    ai_ghost_risk_score       FLOAT        DEFAULT 0  CHECK (ai_ghost_risk_score BETWEEN 0 AND 100),
    ai_compliance_score       FLOAT        DEFAULT 100,
    ai_flags                  JSONB        DEFAULT '[]',
    status                    VARCHAR(20)  DEFAULT 'active',
    created_at                TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                TIMESTAMPTZ  DEFAULT NOW(),
    created_by                UUID,
    is_deleted                BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, vendor_emp_id)
);

-- ============================================================
-- SECTION 18: BILLING & INVOICE
-- ============================================================
CREATE TABLE vendor_invoices (
    id                         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                 UUID         NOT NULL REFERENCES companies(id),
    vendor_id                  UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_id                UUID         NOT NULL REFERENCES sla_contracts(id),
    invoice_number             VARCHAR(50)  NOT NULL,
    invoice_period_month       INT          NOT NULL CHECK (invoice_period_month BETWEEN 1 AND 12),
    invoice_period_year        INT          NOT NULL,
    issue_date                 DATE         NOT NULL,
    due_date                   DATE         NOT NULL,
    payment_date               DATE,
    -- Billing details
    workers_billed             INT,
    days_billed                INT,
    rate_per_day_npr           NUMERIC(10,2),
    amount_before_tax_npr      NUMERIC(12,2) NOT NULL CHECK (amount_before_tax_npr >= 0),
    tds_rate_pct               NUMERIC(5,2)  DEFAULT 1.5,  -- Nepal TDS 1.5% on services
    tds_amount_npr             NUMERIC(12,2) DEFAULT 0,
    total_amount_npr           NUMERIC(12,2) NOT NULL CHECK (total_amount_npr >= 0),
    -- AI Invoice Validation
    timesheet_amount_npr       NUMERIC(12,2),
    attendance_amount_npr      NUMERIC(12,2),
    discrepancy_amount_npr     NUMERIC(12,2)
                               GENERATED ALWAYS AS (
                                 CASE WHEN timesheet_amount_npr IS NOT NULL
                                 THEN total_amount_npr - timesheet_amount_npr
                                 ELSE 0 END
                               ) STORED,
    has_discrepancy            BOOLEAN      DEFAULT FALSE,
    ai_validated               BOOLEAN      DEFAULT FALSE,
    ai_validation_result       TEXT,
    ai_validated_at            TIMESTAMPTZ,
    ai_fraud_risk_score        FLOAT        DEFAULT 0,
    -- Approval Workflow
    timesheet_approved         BOOLEAN      DEFAULT FALSE,
    timesheet_approved_by      UUID,
    timesheet_approved_at      TIMESTAMPTZ,
    attendance_verified        BOOLEAN      DEFAULT FALSE,
    attendance_verified_by     UUID,
    status                     VARCHAR(30)  DEFAULT 'pending_approval'
                               CHECK (status IN ('draft','submitted','pending_approval','approved','disputed','paid','rejected')),
    dispute_reason             TEXT,
    dispute_raised_by          UUID,
    dispute_raised_at          TIMESTAMPTZ,
    dispute_resolved_at        TIMESTAMPTZ,
    approved_by                UUID,
    approved_at                TIMESTAMPTZ,
    payment_reference          VARCHAR(100),
    invoice_pdf_url            VARCHAR(500),
    created_at                 TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted                 BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, invoice_number),
    CHECK (due_date >= issue_date)
);

-- ============================================================
-- SECTION 19: VENDOR ATTENDANCE
-- ============================================================
CREATE TABLE vendor_attendance (
    id                      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              UUID         NOT NULL REFERENCES companies(id),
    vendor_id               UUID         NOT NULL REFERENCES outsource_vendors(id),
    vendor_employee_id      UUID         NOT NULL REFERENCES vendor_employees(id),
    contract_id             UUID         REFERENCES sla_contracts(id),
    invoice_id              UUID         REFERENCES vendor_invoices(id),
    attendance_date         DATE         NOT NULL,
    -- Auto-computed from attendance_date
    period_month            INT          GENERATED ALWAYS AS (EXTRACT(MONTH FROM attendance_date)::INT) STORED,
    period_year             INT          GENERATED ALWAYS AS (EXTRACT(YEAR  FROM attendance_date)::INT) STORED,
    shift_type              VARCHAR(30),
    check_in_time           TIMESTAMPTZ,
    check_out_time          TIMESTAMPTZ,
    hours_worked            FLOAT        GENERATED ALWAYS AS (
                              CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL
                              THEN ROUND(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600.0, 2)
                              ELSE NULL END
                            ) STORED,
    overtime_hours          FLOAT        DEFAULT 0,
    is_present              BOOLEAN      DEFAULT FALSE,
    is_absent               BOOLEAN      DEFAULT FALSE,
    is_late                 BOOLEAN      DEFAULT FALSE,
    late_minutes            INT          DEFAULT 0,
    is_half_day             BOOLEAN      DEFAULT FALSE,
    leave_type              VARCHAR(50),
    -- Verification
    biometric_verified      BOOLEAN      DEFAULT FALSE,
    gps_verified            BOOLEAN      DEFAULT FALSE,
    gps_latitude            FLOAT,
    gps_longitude           FLOAT,
    verified_by             UUID,
    verification_method     VARCHAR(50)
                            CHECK (verification_method IN ('biometric','mobile','card','manual','gps',NULL)),
    -- AI Ghost Worker Detection
    ghost_risk_score        FLOAT        DEFAULT 0  CHECK (ghost_risk_score BETWEEN 0 AND 100),
    ghost_risk_flags        JSONB        DEFAULT '[]',
    ai_anomaly_detected     BOOLEAN      DEFAULT FALSE,
    included_in_invoice     BOOLEAN      DEFAULT FALSE,
    remarks                 TEXT,
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (vendor_employee_id, attendance_date)
);

-- ============================================================
-- SECTION 20: VENDOR PERFORMANCE
-- ============================================================
CREATE TABLE vendor_performance_cards (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID         NOT NULL REFERENCES companies(id),
    vendor_id                   UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_id                 UUID         NOT NULL REFERENCES sla_contracts(id),
    period_month                INT          NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year                 INT          NOT NULL,
    -- KPI Results
    fill_rate_target_pct        FLOAT,
    fill_rate_actual_pct        FLOAT,
    fill_rate_met               BOOLEAN,
    attendance_target_pct       FLOAT,
    attendance_actual_pct       FLOAT,
    attendance_met              BOOLEAN,
    legal_compliance_target_pct FLOAT,
    legal_compliance_actual_pct FLOAT,
    legal_compliance_met        BOOLEAN,
    billing_accuracy_target_pct FLOAT,
    billing_accuracy_actual_pct FLOAT,
    billing_accuracy_met        BOOLEAN,
    turnover_rate_target_pct    FLOAT,
    turnover_rate_actual_pct    FLOAT,
    turnover_rate_met           BOOLEAN,
    custom_kpi_results          JSONB        DEFAULT '[]',
    -- Overall
    overall_score               FLOAT        CHECK (overall_score BETWEEN 0 AND 100),
    overall_risk_level          VARCHAR(20)  DEFAULT 'low'
                                CHECK (overall_risk_level IN ('low','medium','high','critical')),
    -- AI Generated Scorecard
    ai_generated                BOOLEAN      DEFAULT TRUE,
    ai_generated_at             TIMESTAMPTZ,
    ai_summary                  TEXT,
    ai_recommendation           TEXT,
    ai_trend                    VARCHAR(20)  CHECK (ai_trend IN ('improving','stable','declining')),
    -- Actions
    warning_issued              BOOLEAN      DEFAULT FALSE,
    warning_issued_at           TIMESTAMPTZ,
    action_plan_received        BOOLEAN      DEFAULT FALSE,
    reviewed_by                 UUID,
    reviewed_at                 TIMESTAMPTZ,
    review_notes                TEXT,
    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (vendor_id, contract_id, period_year, period_month)
);

-- ============================================================
-- SECTION 21: ALL INDEXES (Performance)
-- ============================================================

-- Group & Company
CREATE INDEX idx_companies_group        ON companies(group_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_companies_status       ON companies(status)   WHERE is_deleted = FALSE;
CREATE INDEX idx_companies_pan          ON companies(pan_no);
CREATE INDEX idx_legal_docs_company     ON company_legal_documents(company_id, doc_type);
CREATE INDEX idx_legal_docs_expiry      ON company_legal_documents(expiry_date) WHERE is_deleted = FALSE;

-- Branches & BUs
CREATE INDEX idx_branches_company       ON branches(company_id)       WHERE is_deleted = FALSE;
CREATE INDEX idx_branches_province      ON branches(province);
CREATE INDEX idx_bus_company            ON business_units(company_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_bus_parent             ON business_units(parent_bu_id);

-- Departments
CREATE INDEX idx_depts_company          ON departments(company_id)      WHERE is_deleted = FALSE;
CREATE INDEX idx_depts_bu               ON departments(business_unit_id);
CREATE INDEX idx_depts_branch           ON departments(branch_id);
CREATE INDEX idx_depts_fts              ON departments USING GIN(search_vector);

-- Sections, Units, Teams
CREATE INDEX idx_sections_dept          ON sections(department_id)    WHERE is_deleted = FALSE;
CREATE INDEX idx_units_section          ON units(section_id)          WHERE is_deleted = FALSE;
CREATE INDEX idx_teams_dept             ON teams(department_id)       WHERE is_deleted = FALSE;
CREATE INDEX idx_teams_cba              ON teams(cba_required)        WHERE cba_required = TRUE;
CREATE INDEX idx_teams_safety           ON teams(safety_committee_required) WHERE safety_committee_required = TRUE;

-- Cost Centers & Work Locations
CREATE INDEX idx_cc_company             ON cost_centers(company_id, fiscal_year);
CREATE INDEX idx_wl_branch              ON work_locations(branch_id) WHERE is_deleted = FALSE;

-- Employment Categories
CREATE INDEX idx_emp_cat_la_type        ON employment_categories(la_type, company_id);
CREATE INDEX idx_emp_cat_active         ON employment_categories(is_active) WHERE is_active = TRUE;

-- Structure
CREATE INDEX idx_jf_company             ON job_families(company_id);
CREATE INDEX idx_grades_company         ON grade_levels(company_id, level_order);
CREATE INDEX idx_desig_company          ON designations(company_id, job_family_id);
CREATE INDEX idx_desig_grade            ON designations(grade_level_id);
CREATE INDEX idx_desig_fts              ON designations USING GIN(search_vector);

-- Positions
CREATE INDEX idx_pos_company            ON positions(company_id, status);
CREATE INDEX idx_pos_dept               ON positions(department_id);
CREATE INDEX idx_pos_incumbent          ON positions(incumbent_id) WHERE incumbent_id IS NOT NULL;
CREATE INDEX idx_pos_critical           ON positions(is_critical) WHERE is_critical = TRUE;

-- Org Chart
CREATE INDEX idx_ocn_company            ON org_chart_nodes(company_id);
CREATE INDEX idx_ocn_path               ON org_chart_nodes USING GIST(path);
CREATE INDEX idx_ocn_parent             ON org_chart_nodes(parent_node_id);

-- Reporting Hierarchy
CREATE INDEX idx_rr_employee            ON reporting_relationships(employee_id, status);
CREATE INDEX idx_rr_manager             ON reporting_relationships(manager_id);

-- Vendors
CREATE INDEX idx_vendors_company        ON outsource_vendors(company_id, status);
CREATE INDEX idx_vendors_license        ON outsource_vendors(moless_license_no);
CREATE INDEX idx_vendors_expiry         ON outsource_vendors(moless_license_expiry);
CREATE INDEX idx_contracts_end          ON sla_contracts(end_date, status);
CREATE INDEX idx_contracts_vendor       ON sla_contracts(vendor_id);
CREATE INDEX idx_kpi_period             ON sla_kpi_results(period_year, period_month, contract_id);

-- Vendor Employees
CREATE INDEX idx_ve_vendor              ON vendor_employees(vendor_id, status);
CREATE INDEX idx_ve_ghost_risk          ON vendor_employees(ai_ghost_risk_score DESC) WHERE ai_ghost_risk_score > 50;
CREATE INDEX idx_ve_ssf                 ON vendor_employees(ssf_paid_current_month) WHERE NOT ssf_paid_current_month;

-- Invoices
CREATE INDEX idx_invoices_status        ON vendor_invoices(company_id, status);
CREATE INDEX idx_invoices_period        ON vendor_invoices(invoice_period_year, invoice_period_month);
CREATE INDEX idx_invoices_discrepancy   ON vendor_invoices(has_discrepancy) WHERE has_discrepancy = TRUE;

-- Attendance
CREATE INDEX idx_att_emp_date           ON vendor_attendance(vendor_employee_id, attendance_date);
CREATE INDEX idx_att_period             ON vendor_attendance(period_year, period_month, vendor_id);
CREATE INDEX idx_att_ghost              ON vendor_attendance(ghost_risk_score DESC) WHERE ghost_risk_score > 60;

-- Performance Cards
CREATE INDEX idx_perf_vendor_period     ON vendor_performance_cards(vendor_id, period_year, period_month);
CREATE INDEX idx_perf_low_score         ON vendor_performance_cards(overall_score) WHERE overall_score < 70;

-- ============================================================
-- SECTION 22: TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'group_companies','companies','company_legal_documents','branches',
  'business_units','cost_centers','departments','sections','units',
  'teams','work_locations','employment_categories','job_families',
  'grade_levels','designations','reporting_relationships','positions',
  'outsource_vendors','sla_contracts','vendor_employees',
  'vendor_invoices','vendor_attendance','vendor_performance_cards'
] LOOP
  EXECUTE format(
    'CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
    t, t
  );
END LOOP; END$$;

-- Nepal Labour Act 2074: Auto-set CBA & Safety Committee flags on team update
CREATE OR REPLACE FUNCTION fn_nepal_team_compliance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_managerial THEN
    NEW.cba_required := FALSE;
  ELSE
    NEW.cba_required := (NEW.member_count >= 10);
  END IF;
  NEW.safety_committee_required := (NEW.member_count >= 20);
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_team_nepal_law
  BEFORE INSERT OR UPDATE OF member_count, is_managerial ON teams
  FOR EACH ROW EXECUTE FUNCTION fn_nepal_team_compliance();

-- Auto-flag invoice discrepancy
CREATE OR REPLACE FUNCTION fn_check_invoice_discrepancy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.timesheet_amount_npr IS NOT NULL THEN
    NEW.has_discrepancy := ABS(NEW.total_amount_npr - NEW.timesheet_amount_npr) > 100;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_invoice_discrepancy
  BEFORE INSERT OR UPDATE ON vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION fn_check_invoice_discrepancy();

-- Auto-update department headcount from positions
CREATE OR REPLACE FUNCTION fn_sync_dept_headcount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE dept_id UUID;
BEGIN
  dept_id := COALESCE(NEW.department_id, OLD.department_id);
  IF dept_id IS NOT NULL THEN
    UPDATE departments SET
      headcount_actual = (SELECT COUNT(*) FROM positions WHERE department_id = dept_id AND status = 'filled' AND NOT is_deleted),
      updated_at = NOW()
    WHERE id = dept_id;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_position_headcount
  AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH ROW EXECUTE FUNCTION fn_sync_dept_headcount();

-- Auto-update designation vacancy count
CREATE OR REPLACE FUNCTION fn_sync_desig_vacancies()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE designations SET
    filled_positions = (SELECT COUNT(*) FROM positions WHERE designation_id = NEW.designation_id AND status = 'filled'),
    updated_at = NOW()
  WHERE id = NEW.designation_id;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_desig_vacancies
  AFTER INSERT OR UPDATE OF status ON positions
  FOR EACH ROW EXECUTE FUNCTION fn_sync_desig_vacancies();

-- Nepal Law: Prevent system employment category deletion
CREATE OR REPLACE FUNCTION fn_protect_system_emp_cat()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_system AND NEW.is_deleted THEN
    RAISE EXCEPTION 'Cannot delete system employment category %. Required by Nepal Labour Act 2074.', OLD.code;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_protect_emp_cat
  BEFORE UPDATE ON employment_categories
  FOR EACH ROW EXECUTE FUNCTION fn_protect_system_emp_cat();

-- ============================================================
-- SECTION 23: SEED DATA — Employment Categories (13 types)
-- ============================================================

INSERT INTO employment_categories
  (id, company_id, code, name, name_nepali, la_type, la_section,
   tier2_classification, written_contract_required, max_probation_months,
   max_days_per_month, max_weekly_hrs, pf_eligible, ssf_eligible,
   gratuity_eligible, medical_eligible, annual_leave_days, sick_leave_days,
   maternity_eligible, paternity_eligible, cba_eligible,
   max_daily_hrs, statutory_color, is_active, is_system, sort_order,
   ai_compliance_notes, ai_risk_level)
VALUES
-- 1. Regular / Permanent
(uuid_generate_v4(), NULL, 'REG', 'Regular / Permanent', 'नियमित / स्थायी',
 'regular', 'Section 10(a)', 'permanent',
 TRUE, 6, NULL, NULL, TRUE, TRUE, TRUE, TRUE, 18, 12, TRUE, TRUE, TRUE,
 8, '#10b981', TRUE, TRUE, 1,
 'Full Labour Act 2074 benefits. PF 10%+10%, SSF 3.33%, Gratuity after 1yr, Festival bonus 1 month. Minimum wage NPR 15,000/month.',
 'low'),

-- 2. Probation
(uuid_generate_v4(), NULL, 'PROB', 'Probation', 'परीक्षाकाल',
 'probation', 'Section 10', 'probation',
 TRUE, 6, NULL, NULL, TRUE, TRUE, FALSE, TRUE, 0, 6, TRUE, TRUE, FALSE,
 8, '#f59e0b', TRUE, TRUE, 2,
 'Max 6 months per Nepal law. Alert HR 30 days before expiry. Cannot extend beyond 6 months. Must confirm or terminate.',
 'medium'),

-- 3. Contract - Work Based
(uuid_generate_v4(), NULL, 'CONTRACT-WB', 'Contract - Work Based', 'कार्य-आधारित अनुबन्ध',
 'work_based', 'Section 10(b)', 'contractor',
 TRUE, 3, NULL, NULL, TRUE, TRUE, TRUE, TRUE, 18, 12, TRUE, TRUE, FALSE,
 8, '#8b5cf6', TRUE, TRUE, 3,
 'Ends on completion of defined deliverable. Define deliverables clearly to avoid misclassification risk.',
 'medium'),

-- 4. Contract - Time Bound
(uuid_generate_v4(), NULL, 'CONTRACT-TB', 'Contract - Time Bound', 'समय-सीमित अनुबन्ध',
 'time_bound', 'Section 10(c)', 'contractor',
 TRUE, 3, NULL, NULL, TRUE, TRUE, TRUE, TRUE, 18, 12, TRUE, TRUE, FALSE,
 8, '#06b6d4', TRUE, TRUE, 4,
 'Fixed end date. Auto-alert 60 days before expiry. Can extend by mutual agreement. Cannot replace permanent roles.',
 'low'),

-- 5. Casual
(uuid_generate_v4(), NULL, 'CASUAL', 'Casual', 'अनियमित',
 'casual', 'Section 10(d)', 'casual',
 FALSE, 0, 7, NULL, FALSE, FALSE, FALSE, FALSE, 0, 0, FALSE, FALSE, FALSE,
 8, '#ef4444', TRUE, TRUE, 5,
 'MAXIMUM 7 days/month. Alert if exceeds 7 days — worker becomes deemed regular employee. No written contract required.',
 'high'),

-- 6. Part-Time
(uuid_generate_v4(), NULL, 'PT', 'Part-Time', 'अंशकालिक',
 'part_time', 'Section 10(e)', 'part_time',
 TRUE, 3, NULL, 35, TRUE, TRUE, TRUE, TRUE, 9, 6, TRUE, TRUE, TRUE,
 4, '#84cc16', TRUE, TRUE, 6,
 'Max 35 hours/week per Nepal law. Benefits prorated. Cannot restrict from other employment without written agreement.',
 'low'),

-- 7. Intern
(uuid_generate_v4(), NULL, 'INTERN', 'Intern', 'इन्टर्न',
 'intern', 'N/A (Educational Attachment)', 'intern',
 TRUE, 0, NULL, 40, FALSE, FALSE, FALSE, TRUE, 0, 0, FALSE, FALSE, FALSE,
 8, '#a78bfa', TRUE, TRUE, 7,
 'Educational attachment. Basic safety & medical mandatory. Academic tasks only. Cannot replace regular employee.',
 'medium'),

-- 8. Trainee
(uuid_generate_v4(), NULL, 'TRAINEE', 'Trainee', 'तालिम लिने',
 'trainee', 'Section 10', 'trainee',
 TRUE, 0, NULL, 48, FALSE, TRUE, FALSE, TRUE, 0, 6, FALSE, FALSE, FALSE,
 8, '#d946ef', TRUE, TRUE, 8,
 'Structured training program. Track skills for future recruitment. SSF recommended.',
 'low'),

-- 9. Daily Wage
(uuid_generate_v4(), NULL, 'DW', 'Daily Wage', 'दैनिक ज्यालादारी',
 'daily_wage', 'Section 10(d)', 'daily_wage',
 FALSE, 0, NULL, NULL, FALSE, FALSE, FALSE, FALSE, 0, 0, FALSE, FALSE, FALSE,
 8, '#f97316', TRUE, TRUE, 9,
 'Minimum NPR 577/day (15000/26). Monitor for conversion risk if attendance is regular.',
 'high'),

-- 10. Outsource
(uuid_generate_v4(), NULL, 'OUT', 'Outsource', 'आउटसोर्स',
 'outsource', 'Sections 52-60', 'vendor',
 FALSE, 0, NULL, NULL, FALSE, FALSE, FALSE, FALSE, 0, 0, FALSE, FALSE, FALSE,
 NULL, '#dc2626', TRUE, TRUE, 10,
 'NOT on company payroll. MoLESS licensed agency mandatory. Non-core work only. Main employer co-liable per Section 55.',
 'high'),

-- 11. Consultant
(uuid_generate_v4(), NULL, 'CONSULT', 'Consultant', 'परामर्शदाता',
 'consultant', 'N/A (Service Agreement)', 'freelance',
 TRUE, 0, NULL, NULL, FALSE, FALSE, FALSE, FALSE, 0, 0, FALSE, FALSE, FALSE,
 NULL, '#64748b', TRUE, TRUE, 11,
 'Process via Accounts Payable (Invoice/PO) — NOT payroll. TDS 1.5% applies. High misclassification risk if controlled/regular.',
 'high')
ON CONFLICT (company_id, code) DO NOTHING;

-- ============================================================
-- SECTION 24: VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_department_summary AS
SELECT
    c.name                                              AS company,
    bu.name                                             AS business_unit,
    b.name                                              AS branch,
    d.name                                              AS department,
    d.function_type,
    d.ulrich_model,
    d.head_name AS head_name,
    d.headcount_actual,
    d.headcount_target,
    ROUND(d.headcount_actual::NUMERIC /
          NULLIF(d.headcount_target,0) * 100, 1)        AS fill_rate_pct,
    d.annual_budget,
    d.budget_utilized,
    d.cba_applicable,
    d.ai_dept_health,
    d.ai_attrition_risk
FROM departments d
JOIN companies c             ON d.company_id      = c.id
LEFT JOIN business_units bu  ON d.business_unit_id= bu.id
LEFT JOIN branches b         ON d.branch_id       = b.id
WHERE NOT d.is_deleted
ORDER BY c.name, bu.name, d.name;

CREATE OR REPLACE VIEW v_grade_salary_matrix AS
SELECT
    gl.code           AS grade,
    gl.name           AS grade_name,
    gl.category,
    gl.level_order,
    gl.salary_min     AS min_npr,
    gl.salary_mid     AS mid_npr,
    gl.salary_max     AS max_npr,
    gl.salary_max - gl.salary_min AS band_spread,
    ROUND((gl.salary_max - gl.salary_min)::NUMERIC / gl.salary_min * 100, 1) AS spread_pct,
    gl.pf_pct_employer,
    gl.ssf_pct_employer,
    gl.gratuity_pct,
    gl.annual_bonus_months,
    gl.ai_competitiveness,
    COUNT(d.id)       AS designations,
    COUNT(p.id)       AS positions,
    SUM(CASE WHEN p.status='filled' THEN 1 ELSE 0 END) AS filled
FROM grade_levels gl
LEFT JOIN designations d ON d.grade_level_id = gl.id AND NOT d.is_