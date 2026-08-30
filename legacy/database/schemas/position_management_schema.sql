-- ============================================================
-- FILE: database/schemas/position_management_schema.sql
-- eLogix HRMS — Position Management + Org Chart + Reporting Hierarchy
-- Dedicated standalone schema. Also covered in complete_schema.sql.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ── Job Families ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_families (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID         NOT NULL,
    code        VARCHAR(20)  NOT NULL,
    name        VARCHAR(100) NOT NULL,
    name_nepali VARCHAR(100),
    description TEXT,
    is_active   BOOLEAN      DEFAULT TRUE,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  DEFAULT NOW(),
    created_by  UUID,
    is_deleted  BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, code)
);

-- ── Grade Levels ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grade_levels (
    id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id               UUID         NOT NULL,
    code                     VARCHAR(20)  NOT NULL,
    name                     VARCHAR(100) NOT NULL,
    name_nepali              VARCHAR(100),
    grade_number             INT,
    level_order              INT          DEFAULT 99,
    category                 VARCHAR(50),
    -- Nepal minimum wage enforced at DB level
    salary_min               NUMERIC(12,2) NOT NULL CHECK (salary_min >= 15000),
    salary_mid               NUMERIC(12,2),
    salary_max               NUMERIC(12,2) NOT NULL,
    currency                 CHAR(3)       DEFAULT 'NPR',
    -- Nepal statutory rates (Labour Act 2074 defaults)
    pf_pct_employer          FLOAT         DEFAULT 10.0,
    pf_pct_employee          FLOAT         DEFAULT 10.0,
    ssf_pct_employer         FLOAT         DEFAULT 3.33,
    gratuity_pct             FLOAT         DEFAULT 8.33,
    annual_bonus_months      FLOAT         DEFAULT 1.0,
    medical_allowance_npr    NUMERIC(10,2),
    festival_bonus_pct       FLOAT         DEFAULT 100.0,
    increment_pct_min        FLOAT         DEFAULT 5.0,
    increment_pct_max        FLOAT         DEFAULT 15.0,
    promotion_criteria       JSONB         DEFAULT '{}',
    ai_market_benchmark      JSONB         DEFAULT '{}',
    ai_competitiveness       VARCHAR(20)   DEFAULT 'at_market'
                             CHECK (ai_competitiveness IN ('below_market','at_market','above_market')),
    ai_insights              JSONB         DEFAULT '{}',
    is_active                BOOLEAN       DEFAULT TRUE,
    created_at               TIMESTAMPTZ   DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   DEFAULT NOW(),
    created_by               UUID,
    is_deleted               BOOLEAN       DEFAULT FALSE,
    UNIQUE (company_id, code),
    CHECK (salary_min <= salary_max)
);

-- ── Designations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS designations (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id            UUID         NOT NULL,
    job_family_id         UUID         REFERENCES job_families(id),
    grade_level_id        UUID         REFERENCES grade_levels(id),
    parent_desig_id       UUID         REFERENCES designations(id),
    code                  VARCHAR(30)  NOT NULL,
    name                  VARCHAR(200) NOT NULL,
    name_nepali           VARCHAR(200),
    level                 INT,
    category              VARCHAR(50),
    is_managerial         BOOLEAN      DEFAULT FALSE,
    is_executive          BOOLEAN      DEFAULT FALSE,
    is_supervisory        BOOLEAN      DEFAULT FALSE,
    -- Headcount
    approved_positions    INT          DEFAULT 0,
    filled_positions      INT          DEFAULT 0,
    vacancy_count         INT          GENERATED ALWAYS AS (
                            GREATEST(approved_positions - filled_positions, 0)
                          ) STORED,
    -- JD
    jd_summary            TEXT,
    jd_responsibilities   JSONB        DEFAULT '[]',
    jd_qualifications     JSONB        DEFAULT '[]',
    jd_skills             TEXT[]       DEFAULT '{}',
    jd_experience_years   INT,
    jd_education_level    VARCHAR(100),
    -- AI JD
    ai_jd_generated       BOOLEAN      DEFAULT FALSE,
    ai_jd_generated_at    TIMESTAMPTZ,
    ai_jd_content         JSONB        DEFAULT '{}',
    ai_salary_benchmark   JSONB        DEFAULT '{}',
    ai_skill_gap_report   JSONB        DEFAULT '{}',
    status                VARCHAR(20)  DEFAULT 'active',
    is_active             BOOLEAN      DEFAULT TRUE,
    search_vector         TSVECTOR GENERATED ALWAYS AS (
                            to_tsvector('english',
                              coalesce(code,'') || ' ' ||
                              coalesce(name,'') || ' ' ||
                              coalesce(jd_summary,''))
                          ) STORED,
    created_at            TIMESTAMPTZ  DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  DEFAULT NOW(),
    created_by            UUID,
    is_deleted            BOOLEAN      DEFAULT FALSE,
    ai_metadata           JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ── Reporting Relationships ───────────────────────────────────
CREATE TABLE IF NOT EXISTS reporting_relationships (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID        NOT NULL,
    employee_id         UUID        NOT NULL,
    manager_id          UUID        NOT NULL,
    relationship_type   VARCHAR(30) DEFAULT 'direct'
                        CHECK (relationship_type IN ('direct','dotted_line','project','functional')),
    is_primary          BOOLEAN     DEFAULT TRUE,
    effective_from      DATE        NOT NULL,
    effective_to        DATE,
    reason              VARCHAR(200),
    status              VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active','superseded','cancelled')),
    ai_risk_notes       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID,
    is_deleted          BOOLEAN     DEFAULT FALSE,
    CHECK (employee_id != manager_id)
);

-- ── Org Chart Nodes (LTREE path) ─────────────────────────────
CREATE TABLE IF NOT EXISTS org_chart_nodes (
    id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id       UUID         NOT NULL,
    parent_node_id   UUID         REFERENCES org_chart_nodes(id),
    node_type        VARCHAR(30)  NOT NULL
                     CHECK (node_type IN (
                       'company','group','bu','dept','section','team','position','person')),
    entity_id        UUID,
    entity_name      VARCHAR(200) NOT NULL,
    entity_code      VARCHAR(30),
    path             LTREE,
    depth            INT          DEFAULT 0,
    sort_order       INT          DEFAULT 0,
    display_title    VARCHAR(200),
    display_subtitle VARCHAR(200),
    position_count   INT          DEFAULT 0,
    employee_count   INT          DEFAULT 0,
    avatar_url       VARCHAR(500),
    color_code       CHAR(7),
    is_visible       BOOLEAN      DEFAULT TRUE,
    is_collapsed     BOOLEAN      DEFAULT FALSE,
    created_at       TIMESTAMPTZ  DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted       BOOLEAN      DEFAULT FALSE
);

-- ── Positions (approved headcount slots) ─────────────────────
CREATE TABLE IF NOT EXISTS positions (
    id                        UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                UUID         NOT NULL,
    designation_id            UUID         NOT NULL REFERENCES designations(id),
    grade_level_id            UUID         REFERENCES grade_levels(id),
    department_id             UUID,
    branch_id                 UUID,
    cost_center_id            UUID,
    reports_to_position_id    UUID         REFERENCES positions(id),
    position_code             VARCHAR(30)  NOT NULL UNIQUE,
    position_title            VARCHAR(200) NOT NULL,
    status                    VARCHAR(30)  DEFAULT 'vacant'
                              CHECK (status IN ('vacant','filled','on_hold','eliminated','budgeted')),
    incumbent_id              UUID,
    incumbent_name            VARCHAR(200),
    filled_date               DATE,
    employment_category       VARCHAR(30),
    approved_salary_min       NUMERIC(12,2) CHECK (approved_salary_min IS NULL OR approved_salary_min >= 15000),
    approved_salary_max       NUMERIC(12,2),
    budget_code               VARCHAR(50),
    headcount_type            VARCHAR(20)  DEFAULT 'permanent'
                              CHECK (headcount_type IN ('permanent','contract','temporary','consultant')),
    fte                       FLOAT        DEFAULT 1.0  CHECK (fte > 0 AND fte <= 1),
    is_critical               BOOLEAN      DEFAULT FALSE,
    succession_ready          BOOLEAN      DEFAULT FALSE,
    succession_candidate_id   UUID,
    -- AI
    ai_vacancy_risk           VARCHAR(20)  CHECK (ai_vacancy_risk IN ('low','medium','high','critical')),
    ai_time_to_fill_est       INT,
    ai_insights               JSONB        DEFAULT '{}',
    -- Lifecycle
    effective_from            DATE,
    effective_to              DATE,
    approved_by               UUID,
    approved_at               TIMESTAMPTZ,
    created_at                TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                TIMESTAMPTZ  DEFAULT NOW(),
    created_by                UUID,
    is_deleted                BOOLEAN      DEFAULT FALSE,
    ai_metadata               JSONB        DEFAULT '{}'
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_jf_company       ON job_families(company_id)          WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pm_gl_company       ON grade_levels(company_id, level_order) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pm_des_company      ON designations(company_id)          WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pm_des_grade        ON designations(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_pm_des_fts          ON designations USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_pm_rr_employee      ON reporting_relationships(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_pm_rr_manager       ON reporting_relationships(manager_id);
CREATE INDEX IF NOT EXISTS idx_pm_ocn_path         ON org_chart_nodes USING GIST(path);
CREATE INDEX IF NOT EXISTS idx_pm_ocn_company      ON org_chart_nodes(company_id)       WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pm_pos_company      ON positions(company_id, status)     WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pm_pos_dept         ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_pm_pos_incumbent    ON positions(incumbent_id)           WHERE incumbent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_pos_critical     ON positions(is_critical)            WHERE is_critical;
CREATE INDEX IF NOT EXISTS idx_pm_pos_reports      ON positions(reports_to_position_id);

-- ── Triggers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_pm_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'job_families','grade_levels','designations',
  'reporting_relationships','positions'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;'
    'CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_pm_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Sync designation vacancy count when positions change
CREATE OR REPLACE FUNCTION fn_pm_sync_vacancies()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_desig UUID;
BEGIN
    target_desig := COALESCE(NEW.designation_id, OLD.designation_id);
    IF target_desig IS NOT NULL THEN
        UPDATE designations SET
            filled_positions = (
                SELECT COUNT(*) FROM positions
                WHERE designation_id = target_desig
                  AND status = 'filled' AND NOT is_deleted
            ),
            updated_at = NOW()
        WHERE id = target_desig;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_pos_sync_vacancies ON positions;
CREATE TRIGGER trg_pos_sync_vacancies
    AFTER INSERT OR UPDATE OF status OR DELETE ON positions
    FOR EACH ROW EXECUTE FUNCTION fn_pm_sync_vacancies();

-- ── Views ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_position_headcount AS
SELECT
    d.name                                              AS department,
    g.code                                             AS grade,
    des.name                                           AS designation,
    COUNT(p.id)                                        AS total_positions,
    COUNT(p.id) FILTER (WHERE p.status = 'filled')    AS filled,
    COUNT(p.id) FILTER (WHERE p.status = 'vacant')    AS vacant,
    COUNT(p.id) FILTER (WHERE p.is_critical)          AS critical,
    ROUND(COUNT(p.id) FILTER (WHERE p.status='filled')::NUMERIC
          / NULLIF(COUNT(p.id),0) * 100, 1)           AS fill_rate_pct
FROM positions p
LEFT JOIN designations des ON p.designation_id  = des.id
LEFT JOIN grade_levels  g   ON p.grade_level_id  = g.id
LEFT JOIN departments   d   ON p.department_id   = d.id
WHERE NOT p.is_deleted
GROUP BY d.name, g.code, des.name
ORDER BY d.name, g.code;

CREATE OR REPLACE VIEW v_succession_gaps AS
SELECT
    p.position_code,
    p.position_title,
    p.incumbent_name,
    des.name AS designation,
    d.name   AS department,
    p.is_critical,
    p.succession_ready,
    p.ai_vacancy_risk,
    CASE WHEN NOT p.succession_ready AND p.is_critical THEN 'CRITICAL GAP'
         WHEN NOT p.succession_ready THEN 'NO PLAN'
         ELSE 'COVERED' END AS succession_status
FROM positions p
LEFT JOIN designations des ON p.designation_id = des.id
LEFT JOIN departments   d  ON p.department_id  = d.id
WHERE p.status = 'filled' AND NOT p.is_deleted
ORDER BY p.is_critical DESC, p.succession_ready ASC;

CREATE OR REPLACE VIEW v_reporting_span_of_control AS
SELECT
    rr.manager_id,
    COUNT(rr.id)                          AS direct_reports,
    CASE WHEN COUNT(rr.id) < 3  THEN 'underloaded'
         WHEN COUNT(rr.id) > 10 THEN 'overloaded'
         ELSE 'optimal' END               AS span_status,
    ARRAY_AGG(rr.employee_id)            AS report_ids
FROM reporting_relationships rr
WHERE rr.status = 'active'
  AND rr.relationship_type = 'direct'
  AND NOT rr.is_deleted
GROUP BY rr.manager_id
ORDER BY direct_reports DESC;
