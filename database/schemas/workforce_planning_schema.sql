-- ================================================================
-- FILE: database/schemas/workforce_planning_schema.sql
-- eLogix HRMS — Workforce Planning Schema (13-page module)
-- Tables: workforce_plans, employee_kpis
-- Views: v_quota_dashboard, v_vacancy_pipeline, v_headcount_summary
-- Nepal Labour Act 2074 compliance built in.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- WORKFORCE PLANS (covers Annual / Quarterly / Monthly / Headcount
--                  / Expansion / Contract / Productivity / Resource)
-- ================================================================
CREATE TABLE IF NOT EXISTS workforce_plans (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    plan_no                VARCHAR(50)  NOT NULL,

    plan_type              VARCHAR(30)  NOT NULL
                           CHECK (plan_type IN (
                             'annual','quarterly','monthly','headcount',
                             'vacancy','replacement','expansion',
                             'contract_staff','productivity','resource_allocation')),

    title                  VARCHAR(300) NOT NULL,
    fiscal_year            VARCHAR(20)  NOT NULL,  -- e.g. "2081/82"
    period_month           INT          CHECK (period_month BETWEEN 1 AND 12),
    period_quarter         INT          CHECK (period_quarter BETWEEN 1 AND 4),

    -- Scope
    department_id          UUID,
    branch_id              UUID,

    -- Headcount targets
    target_headcount       INT          DEFAULT 0,
    current_headcount      INT          DEFAULT 0,
    variance               INT GENERATED ALWAYS AS (target_headcount - current_headcount) STORED,
    new_positions_count    INT          DEFAULT 0,
    replacement_count      INT          DEFAULT 0,
    contract_count         INT          DEFAULT 0,

    -- Financial
    budget_npr             NUMERIC(15,2) DEFAULT 0,
    projected_payroll_npr  NUMERIC(15,2) DEFAULT 0,
    budget_variance_npr    NUMERIC(15,2) GENERATED ALWAYS AS (budget_npr - projected_payroll_npr) STORED,

    -- Productivity (for productivity plan type)
    revenue_per_employee   NUMERIC(12,2),
    output_target          TEXT,
    kpi_target             FLOAT,

    -- Nepal LA2074 compliance
    labour_office_notified BOOLEAN      DEFAULT FALSE,
    labour_office_notif_date DATE,
    is_la2074_compliant    BOOLEAN      DEFAULT TRUE,
    retrenchment_required  BOOLEAN      DEFAULT FALSE,
    severance_provision_npr NUMERIC(12,2),

    priority               VARCHAR(20)  DEFAULT 'medium'
                           CHECK (priority IN ('critical','high','medium','low')),
    status                 VARCHAR(20)  DEFAULT 'draft'
                           CHECK (status IN ('draft','under_review','approved','active','completed','cancelled')),
    justification          TEXT,
    approved_by            UUID,
    approved_at            TIMESTAMPTZ,

    -- AI insights
    ai_recommendation      TEXT,
    ai_forecast_data       JSONB        DEFAULT '{}',
    ai_generated_at        TIMESTAMPTZ,

    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    created_by             UUID,
    is_deleted             BOOLEAN      DEFAULT FALSE,

    UNIQUE (company_id, plan_no)
);

-- ================================================================
-- EMPLOYEE KPIs (for productivity planning)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_kpis (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id        UUID        NOT NULL,
    employee_id       UUID,
    department_id     UUID,
    period_date       DATE        NOT NULL,
    period_type       VARCHAR(20) DEFAULT 'monthly',
    score             FLOAT       CHECK (score BETWEEN 0 AND 100),
    revenue_generated NUMERIC(12,2) DEFAULT 0,
    tasks_completed   INT         DEFAULT 0,
    target_tasks      INT         DEFAULT 0,
    quality_score     FLOAT       CHECK (quality_score BETWEEN 0 AND 100),
    efficiency_pct    FLOAT       CHECK (efficiency_pct BETWEEN 0 AND 200),
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    created_by        UUID
);

-- ================================================================
-- ADD WORKFORCE PLANNING COLUMNS TO EXISTING POSITIONS TABLE
-- (If not already present - use IF NOT EXISTS for safety)
-- ================================================================
ALTER TABLE positions
    ADD COLUMN IF NOT EXISTS vacancy_reason        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS jrf_raised            BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS jrf_no                VARCHAR(50),
    ADD COLUMN IF NOT EXISTS priority              VARCHAR(20) DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS contract_end_date     DATE,
    ADD COLUMN IF NOT EXISTS attrition_risk        FLOAT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fiscal_year           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS justification         TEXT;

ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS annual_budget_npr     NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS headcount_target      INT DEFAULT 0;

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_wfp_company      ON workforce_plans(company_id)   WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_wfp_type         ON workforce_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_wfp_fy           ON workforce_plans(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_wfp_status       ON workforce_plans(status);
CREATE INDEX IF NOT EXISTS idx_wfp_dept         ON workforce_plans(department_id);
CREATE INDEX IF NOT EXISTS idx_wfp_priority     ON workforce_plans(priority) WHERE priority IN ('critical','high');

CREATE INDEX IF NOT EXISTS idx_kpi_dept         ON employee_kpis(department_id, period_date);
CREATE INDEX IF NOT EXISTS idx_kpi_employee     ON employee_kpis(employee_id, period_date);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_wfp_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_wfp_upd
    BEFORE UPDATE ON workforce_plans
    FOR EACH ROW EXECUTE FUNCTION fn_wfp_updated_at();

-- LA2074: Flag large expansion for Labour Office notification
CREATE OR REPLACE FUNCTION fn_wfp_expansion_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.plan_type = 'expansion' AND NEW.new_positions_count > 10
       AND NOT NEW.labour_office_notified THEN
        RAISE NOTICE 'Nepal Labour Act 2074 Section 11: Labour Office must be notified for more than 10 new positions.';
        NEW.is_la2074_compliant := FALSE;
    END IF;
    IF NEW.plan_type = 'resource_allocation' AND NEW.retrenchment_required THEN
        IF NEW.severance_provision_npr IS NULL OR NEW.severance_provision_npr <= 0 THEN
            RAISE EXCEPTION 'Retrenchment plan must include severance provision (1 month/year of service) per LA2074.';
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_wfp_expansion
    BEFORE INSERT OR UPDATE ON workforce_plans
    FOR EACH ROW EXECUTE FUNCTION fn_wfp_expansion_check();

-- ================================================================
-- VIEWS
-- ================================================================

-- Darbadi quota summary by department
CREATE OR REPLACE VIEW v_quota_dashboard AS
SELECT
    d.name     AS dept_name,
    d.code     AS dept_code,
    b.name     AS branch_name,
    COUNT(p.id)                                          AS total_quota,
    COUNT(p.id) FILTER (WHERE p.status='filled')        AS filled,
    COUNT(p.id) FILTER (WHERE p.status='vacant')        AS vacant,
    COUNT(p.id) FILTER (WHERE p.status='onhold')        AS onhold,
    COUNT(p.id) FILTER (WHERE p.status='planned')       AS planned,
    ROUND(COUNT(p.id) FILTER (WHERE p.status='filled')::NUMERIC
          / NULLIF(COUNT(p.id),0) * 100, 1)             AS fill_rate_pct,
    ROUND(COUNT(p.id) FILTER (WHERE p.status='vacant')::NUMERIC
          / NULLIF(COUNT(p.id),0) * 100, 1)             AS vacancy_rate_pct,
    COALESCE(SUM(p.approved_salary_npr) FILTER (WHERE p.status='filled'), 0)   AS monthly_payroll_npr,
    COALESCE(SUM(p.approved_salary_npr) FILTER (WHERE p.status='filled'),0)*12 AS annual_payroll_npr,
    COALESCE(d.annual_budget_npr, 0)                    AS budget_npr,
    d.company_id
FROM departments d
LEFT JOIN positions p ON p.department_id = d.id AND NOT p.is_deleted
LEFT JOIN branches b  ON d.branch_id = b.id
WHERE NOT d.is_deleted
GROUP BY d.id, d.name, d.code, b.name, d.annual_budget_npr, d.company_id
ORDER BY vacancy_rate_pct DESC;

-- Active vacancy pipeline
CREATE OR REPLACE VIEW v_vacancy_pipeline AS
SELECT
    p.id, p.code AS pos_code, p.title,
    p.employment_type, p.approved_salary_npr, p.priority,
    p.jrf_raised, p.jrf_no, p.vacancy_reason, p.fiscal_year,
    d.name AS dept_name, b.name AS branch_name, g.name AS grade_name,
    CASE p.priority
        WHEN 'critical' THEN 1 WHEN 'high' THEN 2
        WHEN 'medium'   THEN 3 ELSE 4 END               AS priority_order
FROM positions p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN branches b    ON p.branch_id = b.id
LEFT JOIN grade_levels g ON p.grade_level_id = g.id
WHERE p.status = 'vacant' AND NOT p.is_deleted
ORDER BY priority_order, p.approved_salary_npr DESC;

-- Headcount trend (last 12 months)
CREATE OR REPLACE VIEW v_headcount_trend AS
SELECT
    DATE_TRUNC('month', e.join_date)                    AS month,
    COUNT(*) FILTER (WHERE e.employment_status='active') AS active_count,
    COUNT(*) FILTER (WHERE e.employment_status='terminated'
                     AND DATE_TRUNC('month', e.termination_date) = DATE_TRUNC('month', e.join_date)) AS attrition_count,
    e.company_id
FROM employees e
WHERE e.join_date >= NOW() - INTERVAL '12 months' AND NOT e.is_deleted
GROUP BY DATE_TRUNC('month', e.join_date), e.company_id
ORDER BY month;

-- Resource utilization by department
CREATE OR REPLACE VIEW v_resource_utilization AS
SELECT
    d.name AS dept_name,
    d.annual_budget_npr                                         AS budget_npr,
    COALESCE(SUM(p.approved_salary_npr)*12 FILTER(WHERE p.status='filled'), 0) AS payroll_yr_npr,
    ROUND(COALESCE(SUM(p.approved_salary_npr)*12 FILTER(WHERE p.status='filled'), 0)
          / NULLIF(d.annual_budget_npr, 0) * 100, 1)           AS utilization_pct,
    COUNT(p.id) FILTER(WHERE p.status='filled')                AS filled_count,
    COUNT(p.id) FILTER(WHERE p.status='vacant')                AS vacant_count,
    d.company_id
FROM departments d
LEFT JOIN positions p ON p.department_id = d.id AND NOT p.is_deleted
WHERE NOT d.is_deleted
GROUP BY d.id, d.name, d.annual_budget_npr, d.company_id
ORDER BY utilization_pct DESC NULLS LAST;
