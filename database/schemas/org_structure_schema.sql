-- ============================================================
-- FILE: database/schemas/org_structure_schema.sql
-- PURPOSE: Complete PostgreSQL schema for Organization
--          Management — Business Unit, Department, Section,
--          Team, Cost Center, Work Location
-- STACK: PostgreSQL 15+ with multi-tenant isolation
-- COMPLIANCE: Nepal Labour Act 2074, ISO 27001, GDPR
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";       -- for hierarchy paths
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- for search

-- ============================================================
-- TABLE 1: business_units
-- PURPOSE: Highest strategic tier — Division/BU setup
--          Aligned with legal entities, regions, product lines
-- ============================================================
CREATE TABLE business_units (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,

    -- Identity
    code                VARCHAR(20)  NOT NULL,           -- e.g. "BU-001"
    name                VARCHAR(150) NOT NULL,           -- "Nepal Operations"
    short_name          VARCHAR(50),
    description         TEXT,
    bu_type             VARCHAR(30)  DEFAULT 'division'
                        CHECK (bu_type IN (
                            'division','region','product_line',
                            'legal_entity','subsidiary','holding'
                        )),

    -- Hierarchy
    parent_bu_id        UUID REFERENCES business_units(id),
    hierarchy_path      LTREE,                           -- for fast tree queries
    hierarchy_level     INTEGER DEFAULT 1,

    -- Financial
    gl_account_code     VARCHAR(30),                     -- General Ledger link
    annual_budget       NUMERIC(18,2),
    currency_code       VARCHAR(5) DEFAULT 'NPR',
    fiscal_year_start   INTEGER DEFAULT 4,               -- April (Nepal FY)

    -- Legal / Compliance
    legal_entity_name   VARCHAR(200),
    registration_number VARCHAR(100),
    tax_number          VARCHAR(50),
    country_code        VARCHAR(5) DEFAULT 'NP',
    applicable_laws     JSONB,                           -- {nepal_labour_act:true, gdpr:false}

    -- Nepal Labour Act 2074 compliance
    requires_cba        BOOLEAN DEFAULT false,           -- Collective Bargaining (10+ emp)
    requires_lrc        BOOLEAN DEFAULT false,           -- Labour Relations Committee
    requires_safety_com BOOLEAN DEFAULT false,           -- Safety Committee (20+ emp)
    employee_count      INTEGER DEFAULT 0,

    -- Status
    is_active           BOOLEAN DEFAULT true,
    effective_from      DATE,
    effective_to        DATE,

    -- AI metadata
    ai_summary          TEXT,
    ai_insights         JSONB,

    -- Audit
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_bu_tenant       ON business_units(tenant_id);
CREATE INDEX idx_bu_parent       ON business_units(parent_bu_id);
CREATE INDEX idx_bu_path         ON business_units USING GIST(hierarchy_path);
CREATE INDEX idx_bu_search       ON business_units USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description,''))
);

-- ============================================================
-- TABLE 2: departments
-- PURPOSE: Core functional groups nested under BUs
--          Finance, Marketing, Engineering, HR etc.
-- ============================================================
CREATE TABLE departments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    business_unit_id    UUID NOT NULL REFERENCES business_units(id),

    -- Identity
    code                VARCHAR(20)  NOT NULL,           -- "DEPT-FIN-001"
    name                VARCHAR(150) NOT NULL,           -- "Finance Department"
    short_name          VARCHAR(50),
    description         TEXT,
    dept_type           VARCHAR(30)  DEFAULT 'functional'
                        CHECK (dept_type IN (
                            'functional','product','geographical',
                            'matrix','project','shared_services',
                            'hrbp','coe','hrss'                  -- Ulrich Model
                        )),

    -- Hierarchy
    parent_dept_id      UUID REFERENCES departments(id),
    hierarchy_path      LTREE,
    hierarchy_level     INTEGER DEFAULT 2,

    -- Head / Management
    dept_head_id        UUID,                            -- Employee ID
    dept_head_name      VARCHAR(150),
    deputy_head_id      UUID,

    -- Financial
    cost_center_default UUID,                           -- FK to cost_centers
    annual_budget       NUMERIC(18,2),
    headcount_budget    INTEGER,
    current_headcount   INTEGER DEFAULT 0,

    -- Ulrich Model pillar
    ulrich_pillar       VARCHAR(20)
                        CHECK (ulrich_pillar IN ('hrbp','coe','hrss','general')),

    -- Compliance (Nepal Labour Act 2074)
    requires_committee  BOOLEAN DEFAULT false,
    committee_type      VARCHAR(50),

    -- KPI / OKR
    primary_kpis        JSONB,                           -- [{name, target, unit}]
    okr_cycle           VARCHAR(10) DEFAULT 'quarterly',

    -- Status
    is_active           BOOLEAN DEFAULT true,
    is_billable         BOOLEAN DEFAULT true,
    effective_from      DATE,
    effective_to        DATE,

    -- AI metadata
    ai_insights         JSONB,

    -- Audit
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_dept_tenant  ON departments(tenant_id);
CREATE INDEX idx_dept_bu      ON departments(business_unit_id);
CREATE INDEX idx_dept_parent  ON departments(parent_dept_id);
CREATE INDEX idx_dept_path    ON departments USING GIST(hierarchy_path);
CREATE INDEX idx_dept_search  ON departments USING gin(
    to_tsvector('english', name || ' ' || COALESCE(description,''))
);

-- ============================================================
-- TABLE 3: sections_units
-- PURPOSE: Sub-divisions within Departments
--          Section = broad grouping, Unit = specialized sub-function
-- ============================================================
CREATE TABLE sections_units (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    department_id       UUID NOT NULL REFERENCES departments(id),

    -- Identity
    code                VARCHAR(20)  NOT NULL,
    name                VARCHAR(150) NOT NULL,
    short_name          VARCHAR(50),
    description         TEXT,
    entity_type         VARCHAR(10)  DEFAULT 'section'
                        CHECK (entity_type IN ('section','unit','sub_unit')),

    -- Hierarchy
    parent_section_id   UUID REFERENCES sections_units(id),
    hierarchy_path      LTREE,
    hierarchy_level     INTEGER DEFAULT 3,

    -- Management
    section_head_id     UUID,
    section_head_name   VARCHAR(150),

    -- Specialization
    specialization      VARCHAR(200),                   -- e.g. "SEO & Content"
    swim_lane_color     VARCHAR(7),                     -- hex color for UI

    -- KPI
    primary_kpis        JSONB,
    current_headcount   INTEGER DEFAULT 0,

    -- Status
    is_active           BOOLEAN DEFAULT true,
    effective_from      DATE,
    effective_to        DATE,

    -- Audit
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, department_id, code)
);

CREATE INDEX idx_section_tenant ON sections_units(tenant_id);
CREATE INDEX idx_section_dept   ON sections_units(department_id);
CREATE INDEX idx_section_path   ON sections_units USING GIST(hierarchy_path);

-- ============================================================
-- TABLE 4: teams
-- PURPOSE: Agile, dynamic operational units
--          Supports matrix / cross-functional / squad models
-- ============================================================
CREATE TABLE teams (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    department_id       UUID REFERENCES departments(id),
    section_id          UUID REFERENCES sections_units(id),

    -- Identity
    code                VARCHAR(20)  NOT NULL,
    name                VARCHAR(150) NOT NULL,
    short_name          VARCHAR(50),
    description         TEXT,
    team_type           VARCHAR(30)  DEFAULT 'functional'
                        CHECK (team_type IN (
                            'functional','project','matrix',
                            'cross_functional','agile_squad',
                            'tribe','chapter','guild',             -- Spotify model
                            'tiger_team','task_force','virtual'
                        )),

    -- Agile / Matrix
    is_permanent        BOOLEAN DEFAULT true,
    is_cross_functional BOOLEAN DEFAULT false,
    allows_matrix_report BOOLEAN DEFAULT false,            -- dotted-line reporting

    -- Leadership
    team_lead_id        UUID,
    team_lead_name      VARCHAR(150),
    functional_mgr_id   UUID,                             -- for matrix teams
    project_mgr_id      UUID,                             -- for project teams

    -- Capacity
    max_headcount       INTEGER,
    current_headcount   INTEGER DEFAULT 0,
    target_headcount    INTEGER,

    -- Project link (for agile)
    project_id          UUID,
    sprint_velocity     INTEGER,
    agile_methodology   VARCHAR(20)
                        CHECK (agile_methodology IN (
                            'scrum','kanban','scrumban',
                            'safe','spotify','lean',NULL
                        )),

    -- Timeline
    start_date          DATE,
    end_date            DATE,                             -- null = permanent
    status              VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN (
                            'forming','active','paused',
                            'disbanding','archived'
                        )),

    -- Color / Display
    team_color          VARCHAR(7),
    team_icon           VARCHAR(50),

    -- Audit
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_team_tenant ON teams(tenant_id);
CREATE INDEX idx_team_dept   ON teams(department_id);
CREATE INDEX idx_team_status ON teams(status);

-- ============================================================
-- TABLE 5: team_members
-- PURPOSE: Employee-Team assignments (supports matrix)
-- ============================================================
CREATE TABLE team_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    team_id         UUID NOT NULL REFERENCES teams(id),
    employee_id     UUID NOT NULL,
    employee_name   VARCHAR(150),

    role_in_team    VARCHAR(50)  DEFAULT 'member'
                    CHECK (role_in_team IN (
                        'lead','deputy_lead','member',
                        'observer','contributor','advisor'
                    )),
    is_primary_team BOOLEAN DEFAULT true,               -- primary vs dotted-line
    allocation_pct  INTEGER DEFAULT 100                 -- % time allocated
                    CHECK (allocation_pct BETWEEN 1 AND 100),

    joined_at       DATE DEFAULT CURRENT_DATE,
    left_at         DATE,
    is_active       BOOLEAN DEFAULT true,
    notes           TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, team_id, employee_id)
);

-- ============================================================
-- TABLE 6: cost_centers
-- PURPOSE: Financial nodes — maps to GL, ERP, Payroll
--          Position-based (not person-based) per global standard
-- ============================================================
CREATE TABLE cost_centers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    business_unit_id    UUID REFERENCES business_units(id),
    department_id       UUID REFERENCES departments(id),

    -- Identity
    code                VARCHAR(30)  NOT NULL,           -- "CC-MKT-ADV-001"
    name                VARCHAR(150) NOT NULL,           -- "Marketing Ad Spend"
    short_name          VARCHAR(50),
    description         TEXT,
    cc_type             VARCHAR(30)  DEFAULT 'operational'
                        CHECK (cc_type IN (
                            'operational','project','shared',
                            'overhead','investment','revenue'
                        )),

    -- ERP / GL Integration
    gl_account_code     VARCHAR(30),                     -- maps to SAP/Oracle/Tally
    erp_cost_center_id  VARCHAR(50),
    budget_code         VARCHAR(30),

    -- Budget
    annual_budget       NUMERIC(18,2) DEFAULT 0,
    ytd_actual          NUMERIC(18,2) DEFAULT 0,
    ytd_committed       NUMERIC(18,2) DEFAULT 0,
    currency_code       VARCHAR(5) DEFAULT 'NPR',

    -- Payroll (position-based, NOT employee-based per best practice)
    payroll_allocation  JSONB,                           -- [{position_id, pct}]
    benefits_allocation JSONB,
    overhead_allocation JSONB,

    -- Approval
    approver_id         UUID,
    approver_name       VARCHAR(150),
    approval_limit      NUMERIC(14,2),

    -- Status
    is_active           BOOLEAN DEFAULT true,
    is_billable         BOOLEAN DEFAULT true,
    effective_from      DATE,
    effective_to        DATE,

    -- Audit
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_cc_tenant ON cost_centers(tenant_id);
CREATE INDEX idx_cc_dept   ON cost_centers(department_id);
CREATE INDEX idx_cc_bu     ON cost_centers(business_unit_id);

-- ============================================================
-- TABLE 7: work_locations
-- PURPOSE: Physical + virtual locations with tax/compliance
--          Acts as compliance trigger for local laws
-- ============================================================
CREATE TABLE work_locations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    business_unit_id    UUID REFERENCES business_units(id),

    -- Identity
    code                VARCHAR(20)  NOT NULL,           -- "LOC-KTM-HQ"
    name                VARCHAR(150) NOT NULL,           -- "Kathmandu HQ"
    short_name          VARCHAR(50),
    description         TEXT,
    location_type       VARCHAR(30)  DEFAULT 'office'
                        CHECK (location_type IN (
                            'hq','office','branch','factory',
                            'warehouse','remote','hybrid',
                            'coworking','client_site','virtual'
                        )),

    -- Physical Address
    address_line1       VARCHAR(200),
    address_line2       VARCHAR(200),
    city                VARCHAR(100),
    state_province      VARCHAR(100),
    postal_code         VARCHAR(20),
    country_code        VARCHAR(5) DEFAULT 'NP',
    country_name        VARCHAR(100) DEFAULT 'Nepal',

    -- Geolocation
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(10,7),
    map_url             TEXT,

    -- Time & Calendar
    timezone            VARCHAR(50) DEFAULT 'Asia/Kathmandu', -- UTC+5:45
    utc_offset          VARCHAR(10) DEFAULT '+05:45',
    holiday_calendar_id UUID,                                  -- which holidays apply
    working_days        VARCHAR(10)[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri'],
    standard_hours      NUMERIC(4,1) DEFAULT 8.0,

    -- Compliance (critical — acts as compliance trigger)
    applicable_laws     JSONB,                           -- {nepal_labour_act:true}
    tax_jurisdiction    VARCHAR(100),
    tax_code            VARCHAR(50),
    payroll_rule_set    VARCHAR(50),                     -- which payroll rules apply
    local_minimum_wage  NUMERIC(10,2),
    minimum_wage_currency VARCHAR(5) DEFAULT 'NPR',

    -- Nepal Labour Act specific
    labour_office_zone  VARCHAR(100),                   -- which DoL office
    labour_office_code  VARCHAR(20),

    -- Work arrangement
    supports_remote     BOOLEAN DEFAULT false,
    supports_hybrid     BOOLEAN DEFAULT false,
    max_capacity        INTEGER,
    current_headcount   INTEGER DEFAULT 0,

    -- Facilities
    has_canteen         BOOLEAN DEFAULT false,
    has_medical         BOOLEAN DEFAULT false,
    has_parking         BOOLEAN DEFAULT false,
    facility_notes      TEXT,

    -- Status
    is_active           BOOLEAN DEFAULT true,
    is_primary          BOOLEAN DEFAULT false,
    effective_from      DATE,

    -- Audit
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_wl_tenant  ON work_locations(tenant_id);
CREATE INDEX idx_wl_country ON work_locations(country_code);
CREATE INDEX idx_wl_type    ON work_locations(location_type);

-- ============================================================
-- VIEW: org_hierarchy_tree
-- PURPOSE: Full org tree in one query for UI rendering
-- ============================================================
CREATE OR REPLACE VIEW v_org_hierarchy AS
SELECT
    bu.id           AS bu_id,
    bu.code         AS bu_code,
    bu.name         AS bu_name,
    bu.bu_type,
    bu.employee_count AS bu_headcount,
    d.id            AS dept_id,
    d.code          AS dept_code,
    d.name          AS dept_name,
    d.dept_type,
    d.current_headcount AS dept_headcount,
    d.dept_head_name,
    s.id            AS section_id,
    s.code          AS section_code,
    s.name          AS section_name,
    s.entity_type,
    s.current_headcount AS section_headcount,
    t.id            AS team_id,
    t.code          AS team_code,
    t.name          AS team_name,
    t.team_type,
    t.current_headcount AS team_headcount,
    t.team_lead_name,
    cc.id           AS cc_id,
    cc.code         AS cc_code,
    cc.name         AS cc_name,
    cc.annual_budget,
    cc.ytd_actual,
    wl.id           AS wl_id,
    wl.code         AS wl_code,
    wl.name         AS wl_name,
    wl.location_type,
    wl.city,
    wl.country_code
FROM business_units bu
LEFT JOIN departments d ON d.business_unit_id = bu.id AND d.is_active = true
LEFT JOIN sections_units s ON s.department_id = d.id AND s.is_active = true
LEFT JOIN teams t ON t.department_id = d.id AND t.status = 'active'
LEFT JOIN cost_centers cc ON cc.department_id = d.id AND cc.is_active = true
LEFT JOIN work_locations wl ON wl.business_unit_id = bu.id AND wl.is_active = true
WHERE bu.is_active = true;

-- ============================================================
-- FUNCTION: Auto-update employee count on org changes
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_org_headcount(
    p_tenant_id UUID
) RETURNS void AS $$
BEGIN
    -- Update department headcounts (from position assignments)
    UPDATE departments d
    SET current_headcount = (
        SELECT COUNT(*)
        FROM employee_positions ep  -- your employee_positions table
        WHERE ep.department_id = d.id
          AND ep.is_active = true
          AND ep.tenant_id = p_tenant_id
    )
    WHERE d.tenant_id = p_tenant_id;

    -- Update BU headcounts
    UPDATE business_units bu
    SET employee_count = (
        SELECT COALESCE(SUM(d.current_headcount), 0)
        FROM departments d
        WHERE d.business_unit_id = bu.id
          AND d.is_active = true
    )
    WHERE bu.tenant_id = p_tenant_id;

    -- Check Nepal Labour Act committee requirements
    UPDATE business_units
    SET
        requires_cba        = (employee_count >= 10),
        requires_lrc        = (employee_count >= 10),
        requires_safety_com = (employee_count >= 20)
    WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Get full hierarchy path for any entity
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_org_breadcrumb(
    p_dept_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_path TEXT;
    v_dept departments%ROWTYPE;
    v_bu   business_units%ROWTYPE;
BEGIN
    SELECT * INTO v_dept FROM departments WHERE id = p_dept_id;
    SELECT * INTO v_bu   FROM business_units WHERE id = v_dept.business_unit_id;
    v_path := v_bu.name || ' → ' || v_dept.name;
    RETURN v_path;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED: Nepal Labour Act 2074 Compliance Comments
-- ============================================================
COMMENT ON TABLE business_units IS
'Nepal Labour Act 2074: 10+ emp = CBA & LRC required. 20+ emp = Safety Committee required.
Foreign worker ratio ≤ 5% (Section 6). Must register with DoL.';

COMMENT ON TABLE work_locations IS
'Nepal: Standard 8hrs/day, 48hrs/week (Section 28). OT max 24hrs/week at 1.5x.
Time zone: Asia/Kathmandu (UTC+5:45). Holiday per Labour Rules.';

COMMENT ON TABLE cost_centers IS
'Position-based allocation per global best practice. Links to payroll engine.
Aligns with Nepal Provident Fund and Gratuity calculations.';
