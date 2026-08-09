-- ============================================================
-- FILE: database/schemas/structure_schema.sql
-- NepHR Pro — Structure & Hierarchy Schema
-- Covers: Job Family, Grade Level, Designation Setup,
--         Reporting Hierarchy, Org Chart, Position Management
-- Nepal Labour Act 2074 salary constraints enforced at DB level
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ── Job Families ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_families (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id    UUID         NOT NULL,
    code          VARCHAR(20)  NOT NULL,
    name          VARCHAR(100) NOT NULL,
    name_nepali   VARCHAR(100),
    description   TEXT,
    is_active     BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW(),
    created_by    UUID,
    is_deleted    BOOLEAN      DEFAULT FALSE,
    ai_metadata   JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ── Grade Levels (Nepal min wage constraint enforced) ─────────
CREATE TABLE IF NOT EXISTS grade_levels (
    id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id            UUID         NOT NULL,
    code                  VARCHAR(20)  NOT NULL,
    name                  VARCHAR(100) NOT NULL,
    name_nepali           VARCHAR(100),
    grade_number          INT,
    level_order           INT          NOT NULL DEFAULT 99,
    category              VARCHAR(50)
                          CHECK (category IN ('executive','management','supervisory','staff','worker')),
    -- Salary band (Nepal minimum wage = NPR 15,000/month enforced)
    salary_min            NUMERIC(12,2) NOT NULL CHECK (salary_min >= 15000),
    salary_mid            NUMERIC(12,2),
    salary_max            NUMERIC(12,2) NOT NULL,
    currency              CHAR(3)       DEFAULT 'NPR',
    -- Nepal statutory rates
    pf_pct_employer       FLOAT         DEFAULT 10.0  CHECK (pf_pct_employer >= 10.0),
    pf_pct_employee       FLOAT         DEFAULT 10.0  CHECK (pf_pct_employee >= 10.0),
    ssf_pct_employer      FLOAT         DEFAULT 3.33  CHECK (ssf_pct_employer >= 3.33),
    gratuity_pct          FLOAT         DEFAULT 8.33,
    annual_bonus_months   FLOAT         DEFAULT 1.0,
    medical_allowance_npr NUMERIC(10,2),
    festival_bonus_pct    FLOAT         DEFAULT 100.0,
    -- Progression
    increment_pct_min     FLOAT         DEFAULT 5.0,
    increment_pct_max     FLOAT         DEFAULT 15.0,
    promotion_criteria    JSONB         DEFAULT '{}',
    -- AI market data
    ai_market_p25_npr     NUMERIC(12,2),
    ai_market_p50_npr     NUMERIC(12,2),
    ai_market_p75_npr     NUMERIC(12,2),
    ai_competitiveness    VARCHAR(20)   DEFAULT 'at_market'
                          CHECK (ai_competitiveness IN ('below_market','at_market','above_market')),
    ai_benchmark_date     DATE,
    ai_insights           JSONB         DEFAULT '{}',
    is_active             BOOLEAN       DEFAULT TRUE,
    created_at            TIMESTAMPTZ   DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   DEFAULT NOW(),
    created_by            UUID,
    is_deleted            BOOLEAN       DEFAULT FALSE,
    ai_metadata           JSONB         DEFAULT '{}',
    UNIQUE (company_id, code),
    CHECK (salary_min <= salary_max),
    CHECK (salary_mid IS NULL OR (salary_mid >= salary_min AND salary_mid <= salary_max))
);

-- ── Designations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS designations (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID         NOT NULL,
    job_family_id        UUID         REFERENCES job_families(id),
    grade_level_id       UUID         REFERENCES grade_levels(id),
    parent_desig_id      UUID         REFERENCES designations(id),
    code                 VARCHAR(30)  NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    name_nepali          VARCHAR(200),
    level                INT,
    category             VARCHAR(50),
    is_managerial        BOOLEAN      DEFAULT FALSE,
    is_executive         BOOLEAN      DEFAULT FALSE,
    is_supervisory       BOOLEAN      DEFAULT FALSE,
    -- Headcount tracking
    approved_positions   INT          DEFAULT 0  CHECK (approved_positions >= 0),
    filled_positions     INT          DEFAULT 0  CHECK (filled_positions >= 0),
    vacancy_count        INT          GENERATED ALWAYS AS (approved_positions - filled_positions) STORED,
    -- Job Description
    jd_summary           TEXT,
    jd_responsibilities  JSONB        DEFAULT '[]',
    jd_qualifications    JSONB        DEFAULT '[]',
    jd_skills            TEXT[]       DEFAULT '{}',
    jd_experience_years  INT,
    jd_education_level   VARCHAR(100),
    -- AI JD Generator
    ai_jd_generated      BOOLEAN      DEFAULT FALSE,
    ai_jd_generated_at   TIMESTAMPTZ,
    ai_jd_content        JSONB        DEFAULT '{}',
    ai_salary_benchmark  JSONB        DEFAULT '{}',
    ai_skill_gap_report  JSONB        DEFAULT '{}',
    -- Full text search
    search_vector        TSVECTOR GENERATED ALWAYS AS (
                           to_tsvector('english',
                             coalesce(code,'') || ' ' || coalesce(name,'') || ' ' ||
                             coalesce(jd_summary,''))
                         ) STORED,
    status               VARCHAR(20)  DEFAULT 'active',
    is_active            BOOLEAN      DEFAULT TRUE,
    created_at           TIMESTAMPTZ  DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  DEFAULT NOW(),
    created_by           UUID,
    is_deleted           BOOLEAN      DEFAULT FALSE,
    ai_metadata          JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- ── Reporting Hierarchy ───────────────────────────────────────
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
                        CHECK (status IN ('active','superseded','terminated')),
    ai_risk_notes       TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID,
    is_deleted          BOOLEAN     DEFAULT FALSE,
    CHECK (employee_id != manager_id)
);

-- ── Organisation Chart Nodes (LTREE for fast traversal) ───────
CREATE TABLE IF NOT EXISTS org_chart_nodes (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id       UUID        NOT NULL,
    parent_node_id   UUID        REFERENCES org_chart_nodes(id),
    node_type        VARCHAR(30) NOT NULL
                     CHECK (node_type IN ('company','group','bu','dept','section','team','position','person')),
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

-- ── Position Management ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
    id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id               UUID         NOT NULL,
    designation_id           UUID         NOT NULL REFERENCES designations(id),
    grade_level_id           UUID         REFERENCES grade_levels(id),
    department_id            UUID,
    branch_id                UUID,
    cost_center_id           UUID,
    reports_to_position_id   UUID         REFERENCES positions(id),
    position_code            VARCHAR(30)  NOT NULL,
    position_title           VARCHAR(200) NOT NULL,
    -- Status
    status                   VARCHAR(30)  DEFAULT 'vacant'
                             CHECK (status IN ('vacant','filled','on_hold','eliminated','budgeted')),
    incumbent_id             UUID,
    incumbent_name           VARCHAR(200),
    filled_date              DATE,
    employment_category      VARCHAR(30),
    -- Budget
    approved_salary_min      NUMERIC(12,2) CHECK (approved_salary_min IS NULL OR approved_salary_min >= 15000),
    approved_salary_max      NUMERIC(12,2),
    budget_code              VARCHAR(50),
    headcount_type           VARCHAR(20)  DEFAULT 'permanent'
                             CHECK (headcount_type IN ('permanent','contract','temp','intern')),
    fte                      FLOAT        DEFAULT 1.0  CHECK (fte > 0 AND fte <= 1),
    is_critical              BOOLEAN      DEFAULT FALSE,
    succession_ready         BOOLEAN      DEFAULT FALSE,
    succession_candidate_id  UUID,
    -- AI
    ai_vacancy_risk          VARCHAR(20)  DEFAULT 'low',
    ai_time_to_fill_est      INT,
    ai_insights              JSONB        DEFAULT '{}',
    -- Dates
    effective_from           DATE,
    effective_to             DATE,
    approved_by              UUID,
    approved_at              TIMESTAMPTZ,
    created_at               TIMESTAMPTZ  DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  DEFAULT NOW(),
    created_by               UUID,
    is_deleted               BOOLEAN      DEFAULT FALSE,
    ai_metadata              JSONB        DEFAULT '{}',
    UNIQUE (company_id, position_code)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_str_jf_company       ON job_families(company_id)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_str_gl_company       ON grade_levels(company_id, level_order) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_str_gl_category      ON grade_levels(category);
CREATE INDEX IF NOT EXISTS idx_str_desig_company    ON designations(company_id)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_str_desig_grade      ON designations(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_str_desig_jf         ON designations(job_family_id);
CREATE INDEX IF NOT EXISTS idx_str_desig_fts        ON designations USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_str_rr_employee      ON reporting_relationships(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_str_rr_manager       ON reporting_relationships(manager_id, status);
CREATE INDEX IF NOT EXISTS idx_str_rr_company       ON reporting_relationships(company_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_str_ocn_company      ON org_chart_nodes(company_id)     WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_str_ocn_parent       ON org_chart_nodes(parent_node_id);
CREATE INDEX IF NOT EXISTS idx_str_ocn_path         ON org_chart_nodes USING GIST(path);
CREATE INDEX IF NOT EXISTS idx_str_pos_company      ON positions(company_id, status)   WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_str_pos_dept         ON positions(department_id);
CREATE INDEX IF NOT EXISTS idx_str_pos_incumbent    ON positions(incumbent_id)         WHERE incumbent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_str_pos_critical     ON positions(is_critical)          WHERE is_critical;
CREATE INDEX IF NOT EXISTS idx_str_pos_no_succession ON positions(company_id)
  WHERE is_critical AND NOT succession_ready AND status = 'filled';

-- ── Triggers ──────────────────────────────────────────────────

-- Auto-update updated_at for all tables
CREATE OR REPLACE FUNCTION fn_str_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'job_families','grade_levels','designations',
  'reporting_relationships','positions'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s
     FOR EACH ROW EXECUTE FUNCTION fn_str_updated_at()',
    t, t, t, t
  );
END LOOP; END$$;

-- Sync designation filled_positions count when position status changes
CREATE OR REPLACE FUNCTION fn_str_sync_desig_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE designations
    SET filled_positions = (
        SELECT COUNT(*) FROM positions
        WHERE designation_id = COALESCE(NEW.designation_id, OLD.designation_id)
          AND status = 'filled' AND NOT is_deleted
    ), updated_at = NOW()
    WHERE id = COALESCE(NEW.designation_id, OLD.designation_id);
    RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_str_desig_count ON positions;
CREATE TRIGGER trg_str_desig_count
    AFTER INSERT OR UPDATE OF status OR DELETE ON positions
    FOR EACH ROW EXECUTE FUNCTION fn_str_sync_desig_count();

-- Prevent self-reporting (employee can't report to themselves)
CREATE OR REPLACE FUNCTION fn_str_no_self_report()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.employee_id = NEW.manager_id THEN
        RAISE EXCEPTION 'Employee cannot report to themselves: %', NEW.employee_id;
    END IF;
    RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_str_no_self_report ON reporting_relationships;
CREATE TRIGGER trg_str_no_self_report
    BEFORE INSERT OR UPDATE ON reporting_relationships
    FOR EACH ROW EXECUTE FUNCTION fn_str_no_self_report();

-- ── Views ──────────────────────────────────────────────────────

-- Grade salary matrix with market comparison
CREATE OR REPLACE VIEW v_grade_salary_matrix AS
SELECT
    gl.code, gl.name, gl.category, gl.level_order,
    gl.salary_min, gl.salary_mid, gl.salary_max,
    ROUND((gl.salary_max - gl.salary_min)::NUMERIC / gl.salary_min * 100, 1) AS spread_pct,
    gl.pf_pct_employer, gl.ssf_pct_employer, gl.gratuity_pct,
    gl.annual_bonus_months, gl.ai_competitiveness,
    gl.ai_market_p25_npr, gl.ai_market_p50_npr, gl.ai_market_p75_npr,
    COUNT(DISTINCT d.id)                       AS designations_count,
    COUNT(DISTINCT p.id)                       AS total_positions,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'filled') AS filled_positions,
    ROUND(
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'filled')::NUMERIC /
      NULLIF(COUNT(DISTINCT p.id), 0) * 100, 1
    )                                          AS fill_rate_pct
FROM grade_levels gl
LEFT JOIN designations d ON d.grade_level_id = gl.id AND NOT d.is_deleted
LEFT JOIN positions p    ON p.grade_level_id  = gl.id AND NOT p.is_deleted
WHERE NOT gl.is_deleted
GROUP BY gl.id, gl.code, gl.name, gl.category, gl.level_order,
         gl.salary_min, gl.salary_mid, gl.salary_max, gl.pf_pct_employer,
         gl.ssf_pct_employer, gl.gratuity_pct, gl.annual_bonus_months,
         gl.ai_competitiveness, gl.ai_market_p25_npr, gl.ai_market_p50_npr,
         gl.ai_market_p75_npr
ORDER BY gl.level_order;

-- Org headcount by department and grade
CREATE OR REPLACE VIEW v_headcount_by_dept_grade AS
SELECT
    d.name                                             AS department,
    gl.code                                            AS grade,
    gl.name                                            AS grade_name,
    p.status,
    COUNT(*)                                           AS count
FROM positions p
JOIN departments d  ON p.department_id  = d.id
JOIN grade_levels gl ON p.grade_level_id = gl.id
WHERE NOT p.is_deleted
GROUP BY d.name, gl.code, gl.name, p.status
ORDER BY d.name, gl.level_order;

-- Span of control analysis
CREATE OR REPLACE VIEW v_span_of_control AS
SELECT
    rr.manager_id,
    COUNT(*)                                   AS direct_reports,
    CASE WHEN COUNT(*) < 3  THEN 'underloaded'
         WHEN COUNT(*) > 10 THEN 'overloaded'
         ELSE 'optimal' END                    AS span_status,
    rr.company_id
FROM reporting_relationships rr
WHERE rr.status = 'active' AND rr.relationship_type = 'direct' AND NOT rr.is_deleted
GROUP BY rr.manager_id, rr.company_id
ORDER BY direct_reports DESC;

-- Critical positions without succession plan
CREATE OR REPLACE VIEW v_succession_gaps AS
SELECT
    p.company_id,
    p.position_code,
    p.position_title,
    p.incumbent_name,
    d.name  AS department,
    gl.code AS grade,
    p.is_critical,
    p.succession_ready,
    p.ai_vacancy_risk
FROM positions p
LEFT JOIN departments d   ON p.department_id  = d.id
LEFT JOIN grade_levels gl ON p.grade_level_id = gl.id
WHERE p.is_critical AND NOT p.succession_ready
  AND p.status = 'filled' AND NOT p.is_deleted
ORDER BY p.company_id, d.name, gl.level_order;
