-- ============================================================
-- FILE: database/schemas/dept_team_schema.sql
-- NepHR Pro — Department & Team Setup Schema
-- Covers: Business Unit, Department, Section, Unit,
--         Team (Nepal CBA/Safety auto-flags), Cost Center, Work Location
-- Standalone file — also included in complete_schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Business Units / Divisions ────────────────────────────────
CREATE TABLE IF NOT EXISTS business_units (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id        UUID         NOT NULL,
    parent_bu_id      UUID         REFERENCES business_units(id),
    code              VARCHAR(20)  NOT NULL,
    name              VARCHAR(200) NOT NULL,
    name_nepali       VARCHAR(200),
    description       TEXT,
    bu_type           VARCHAR(50),
    is_profit_center  BOOLEAN      DEFAULT FALSE,
    revenue_target    NUMERIC(18,2),
    budget_allocated  NUMERIC(18,2) DEFAULT 0,
    budget_utilized   NUMERIC(18,2) DEFAULT 0,
    headcount_target  INT,
    headcount_actual  INT           DEFAULT 0,
    manager_id        UUID,
    established_date  DATE,
    status            VARCHAR(20)   DEFAULT 'active',
    ai_bu_score       FLOAT,
    ai_insights       JSONB         DEFAULT '{}',
    created_at        TIMESTAMPTZ   DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   DEFAULT NOW(),
    created_by        UUID,
    is_deleted        BOOLEAN       DEFAULT FALSE,
    ai_metadata       JSONB         DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ── Cost Centers (placed before departments — dept has FK to it) ──
CREATE TABLE IF NOT EXISTS cost_centers (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id            UUID         NOT NULL,
    business_unit_id      UUID         REFERENCES business_units(id),
    parent_cc_id          UUID         REFERENCES cost_centers(id),
    code                  VARCHAR(30)  NOT NULL,
    name                  VARCHAR(200) NOT NULL,
    name_nepali           VARCHAR(200),
    description           TEXT,
    cc_type               VARCHAR(30)  DEFAULT 'cost_center'
                          CHECK (cc_type IN ('profit_center','cost_center','investment_center','service_center')),
    fiscal_year           VARCHAR(10)  NOT NULL DEFAULT '2081-82',
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
    UNIQUE (company_id, code, fiscal_year),
    CHECK (budget_annual >= 0),
    CHECK (actuals_ytd >= 0)
);

-- ── Departments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID         NOT NULL,
    business_unit_id     UUID         REFERENCES business_units(id),
    branch_id            UUID,
    parent_dept_id       UUID         REFERENCES departments(id),
    cost_center_id       UUID         REFERENCES cost_centers(id),
    code                 VARCHAR(20)  NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    name_nepali          VARCHAR(200),
    description          TEXT,
    function_type        VARCHAR(50),
    ulrich_model         VARCHAR(30)  CHECK (ulrich_model IN (
                           'strategic_hrbp','shared_services',
                           'center_of_excellence','line_management','functional')),
    headcount_actual     INT          DEFAULT 0  CHECK (headcount_actual >= 0),
    headcount_target     INT,
    annual_budget        NUMERIC(18,2),
    budget_utilized      NUMERIC(18,2) DEFAULT 0,
    manager_id           UUID,
    established_date     DATE,
    status               VARCHAR(20)  DEFAULT 'active',
    process_flow_url     VARCHAR(500),
    -- Nepal Labour Act 2074
    is_core_function     BOOLEAN      DEFAULT TRUE,
    has_union_rep        BOOLEAN      DEFAULT FALSE,
    cba_applicable       BOOLEAN      DEFAULT FALSE,
    -- AI
    ai_dept_health       FLOAT        CHECK (ai_dept_health BETWEEN 0 AND 100),
    ai_attrition_risk    VARCHAR(20),
    ai_insights          JSONB        DEFAULT '{}',
    search_vector        TSVECTOR GENERATED ALWAYS AS (
                           to_tsvector('english',
                             coalesce(name,'') || ' ' ||
                             coalesce(name_nepali,'') || ' ' ||
                             coalesce(description,''))
                         ) STORED,
    created_at           TIMESTAMPTZ  DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  DEFAULT NOW(),
    created_by           UUID,
    is_deleted           BOOLEAN      DEFAULT FALSE,
    ai_metadata          JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ── Sections ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id        UUID         NOT NULL,
    department_id     UUID         NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    code              VARCHAR(20)  NOT NULL,
    name              VARCHAR(200) NOT NULL,
    name_nepali       VARCHAR(200),
    description       TEXT,
    section_model     VARCHAR(30)  CHECK (section_model IN ('coe','hrss','hrbp','standard')),
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

-- ── Units ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id        UUID         NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    company_id        UUID         NOT NULL,
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

-- ── Teams — Nepal Labour Act 2074 CBA & Safety Auto-flags ────
CREATE TABLE IF NOT EXISTS teams (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID         NOT NULL,
    department_id               UUID         NOT NULL REFERENCES departments(id),
    section_id                  UUID         REFERENCES sections(id),
    code                        VARCHAR(20)  NOT NULL,
    name                        VARCHAR(200) NOT NULL,
    name_nepali                 VARCHAR(200),
    description                 TEXT,
    team_type                   VARCHAR(30)  DEFAULT 'functional'
                                CHECK (team_type IN ('cross_functional','project',
                                  'functional','self_managed','virtual','committee')),
    purpose                     TEXT,
    objectives                  JSONB        DEFAULT '[]',
    team_lead_id                UUID,
    member_count                INT          DEFAULT 0  CHECK (member_count >= 0),
    max_size                    INT,
    -- Nepal Labour Act 2074 — AUTO-COMPUTED by trigger
    cba_required                BOOLEAN      DEFAULT FALSE,    -- TRUE when member_count >= 10 (non-managerial)
    safety_committee_required   BOOLEAN      DEFAULT FALSE,    -- TRUE when member_count >= 20
    is_managerial               BOOLEAN      DEFAULT FALSE,    -- managerial teams excluded from CBA
    -- Lifecycle
    start_date                  DATE,
    end_date                    DATE,
    status                      VARCHAR(20)  DEFAULT 'active',
    project_code                VARCHAR(50),
    ai_team_score               FLOAT        CHECK (ai_team_score BETWEEN 0 AND 100),
    ai_insights                 JSONB        DEFAULT '{}',
    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW(),
    created_by                  UUID,
    is_deleted                  BOOLEAN      DEFAULT FALSE,
    ai_metadata                 JSONB        DEFAULT '{}',
    UNIQUE (department_id, code)
);

-- ── Work Locations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_locations (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID         NOT NULL,
    branch_id                   UUID         NOT NULL,
    code                        VARCHAR(20)  NOT NULL,
    name                        VARCHAR(200) NOT NULL,
    name_nepali                 VARCHAR(200),
    location_type               VARCHAR(20)  DEFAULT 'office'
                                CHECK (location_type IN ('office','remote','hybrid','site','warehouse','factory')),
    floor                       VARCHAR(20),
    wing                        VARCHAR(50),
    area_sqft                   FLOAT,
    max_capacity                INT,
    current_occupancy           INT          DEFAULT 0  CHECK (current_occupancy >= 0),
    -- Facilities (Nepal Labour Act 2074)
    has_canteen                 BOOLEAN      DEFAULT FALSE,
    has_creche                  BOOLEAN      DEFAULT FALSE,  -- Section 116: mandatory if >50 women workers
    has_first_aid               BOOLEAN      DEFAULT FALSE,
    has_fire_exit               BOOLEAN      DEFAULT FALSE,
    safety_cert_expiry          DATE,
    -- Operations
    default_shift_id            UUID,
    labour_zone                 VARCHAR(100),
    is_remote                   BOOLEAN      DEFAULT FALSE,
    remote_allowance_eligible   BOOLEAN      DEFAULT FALSE,
    access_card_required        BOOLEAN      DEFAULT FALSE,
    biometric_enabled           BOOLEAN      DEFAULT FALSE,
    cctv_enabled                BOOLEAN      DEFAULT FALSE,
    status                      VARCHAR(20)  DEFAULT 'active',
    ai_insights                 JSONB        DEFAULT '{}',
    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW(),
    created_by                  UUID,
    is_deleted                  BOOLEAN      DEFAULT FALSE,
    UNIQUE (branch_id, code)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dt_bu_company       ON business_units(company_id)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_dt_cc_company       ON cost_centers(company_id, fiscal_year) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_dt_dept_company     ON departments(company_id)            WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_dt_dept_bu          ON departments(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_dt_dept_branch      ON departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_dt_dept_fts         ON departments USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_dt_dept_cba         ON departments(cba_applicable)        WHERE cba_applicable;
CREATE INDEX IF NOT EXISTS idx_dt_section_dept     ON sections(department_id)            WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_dt_unit_section     ON units(section_id)                  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_dt_team_dept        ON teams(department_id)               WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_dt_team_cba         ON teams(company_id, cba_required)   WHERE cba_required;
CREATE INDEX IF NOT EXISTS idx_dt_team_safety      ON teams(company_id, safety_committee_required) WHERE safety_committee_required;
CREATE INDEX IF NOT EXISTS idx_dt_wl_branch        ON work_locations(branch_id)          WHERE NOT is_deleted;

-- ── Triggers ──────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_dt_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'business_units','cost_centers','departments','sections','units','teams','work_locations'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s; '
    'CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_dt_set_updated_at()',
    t, t, t, t
  );
END LOOP; END$$;

-- Nepal Labour Act 2074: Auto CBA + Safety Committee flags
CREATE OR REPLACE FUNCTION fn_dt_team_nepal_law()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_managerial THEN
        NEW.cba_required := FALSE;
    ELSE
        NEW.cba_required := (COALESCE(NEW.member_count, 0) >= 10);
    END IF;
    NEW.safety_committee_required := (COALESCE(NEW.member_count, 0) >= 20);
    RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_team_nepal_law ON teams;
CREATE TRIGGER trg_team_nepal_law
    BEFORE INSERT OR UPDATE OF member_count, is_managerial ON teams
    FOR EACH ROW EXECUTE FUNCTION fn_dt_team_nepal_law();

-- Auto CBA flag on department headcount change
CREATE OR REPLACE FUNCTION fn_dt_dept_cba()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.cba_applicable := (COALESCE(NEW.headcount_actual, 0) >= 10);
    RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_dept_cba ON departments;
CREATE TRIGGER trg_dept_cba
    BEFORE INSERT OR UPDATE OF headcount_actual ON departments
    FOR EACH ROW EXECUTE FUNCTION fn_dt_dept_cba();

-- Auto-update cost_center budget utilization pct (stored as a computed property in API layer)
-- Direct budget tracking view
CREATE OR REPLACE VIEW v_cost_center_budget AS
SELECT
    cc.code,
    cc.name,
    cc.cc_type,
    cc.fiscal_year,
    cc.budget_annual,
    cc.actuals_ytd,
    cc.committed,
    cc.budget_annual - cc.actuals_ytd - cc.committed             AS available_budget,
    ROUND(cc.actuals_ytd / NULLIF(cc.budget_annual,0) * 100, 1) AS utilization_pct,
    CASE WHEN cc.actuals_ytd > cc.budget_annual * 0.9 THEN 'critical'
         WHEN cc.actuals_ytd > cc.budget_annual * 0.75 THEN 'warning'
         ELSE 'ok' END                                           AS budget_status,
    bu.name                                                      AS business_unit
FROM cost_centers cc
LEFT JOIN business_units bu ON cc.business_unit_id = bu.id
WHERE NOT cc.is_deleted
ORDER BY utilization_pct DESC;

-- Nepal Labour Act 2074 team compliance overview
CREATE OR REPLACE VIEW v_team_nepal_compliance AS
SELECT
    t.company_id,
    d.name       AS department,
    t.code,
    t.name       AS team_name,
    t.member_count,
    t.is_managerial,
    t.cba_required,
    t.safety_committee_required,
    CASE WHEN t.cba_required            THEN 'CBA Committee required (LA2074 S.108)' END AS cba_action,
    CASE WHEN t.safety_committee_required THEN 'Safety Committee required (LA2074 S.155)' END AS safety_action
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE NOT t.is_deleted
  AND (t.cba_required OR t.safety_committee_required)
ORDER BY t.member_count DESC;
