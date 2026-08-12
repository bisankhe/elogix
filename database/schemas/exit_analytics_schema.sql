-- ================================================================
-- FILE: database/schemas/exit_analytics_schema.sql
-- eLogix HRMS — Offboarding > Exit Analytics Module (2 pages)
--
-- Design note: this module is primarily ANALYTICAL — it reads from
-- existing tables (employees, employee_resignations, exit_interviews,
-- fnf_settlements, employee_employment_history) rather than duplicating
-- data. Two new tables support specific frontend features:
--   1. exit_records           — denormalized exit fact table (1 row per
--                                departure, joins identity that's otherwise
--                                scattered across resignation/clearance/
--                                interview tables) — powers fast dashboard queries
--   2. manager_satisfaction_snapshots — periodic engagement-survey scores
--                                per manager, enables the flight-risk
--                                correlation feature
--
-- Nepal Labour Act 2074: no statutory mandate for these analytics, but
-- aggregated/anonymized data only — individual departure reasons must
-- never be exposed without consent. Exit interview participation voluntary.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. EXIT RECORDS (denormalized fact table — one row per departure)
-- Populated automatically when a resignation/termination completes.
-- This is what both dashboard pages query against for speed.
-- ================================================================
CREATE TABLE IF NOT EXISTS exit_records (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    -- Snapshot demographics at time of exit (immutable for historical accuracy)
    department_id_snapshot      UUID,
    department_name_snapshot       VARCHAR(200),
    branch_id_snapshot                 UUID,
    manager_id_snapshot                   UUID,
    manager_name_snapshot                    VARCHAR(200),
    designation_snapshot                        VARCHAR(200),

    age_at_exit                                    INT,
    gender_snapshot                                   VARCHAR(20),
    tenure_years_at_exit                                 NUMERIC(5,2),
    salary_band_snapshot                                    VARCHAR(20)
                                                            CHECK (salary_band_snapshot IN ('low','mid','high')),
    salary_npr_at_exit                                         NUMERIC(12,2),

    exit_type                                                     VARCHAR(20) NOT NULL
                                                                  CHECK (exit_type IN ('voluntary','involuntary','retirement','contract_end')),
    last_working_date                                                DATE NOT NULL,
    resignation_id                                                      UUID REFERENCES employee_resignations(id),

    -- Categorized exit reason (for the bar chart / word cloud)
    reason_category                                                        VARCHAR(40)
                                                                           CHECK (reason_category IN ('better_compensation','career_growth',
                                                                             'management_issues','relocation','higher_studies','health',
                                                                             'work_life_balance','culture_fit','retirement','restructuring','other')),

    -- Performance context (for regrettable/non-regrettable classification)
    last_performance_rating                                                   VARCHAR(30),
    is_regrettable                                                               BOOLEAN DEFAULT FALSE,
    is_high_performer                                                               BOOLEAN DEFAULT FALSE,
    is_critical_skill_role                                                            BOOLEAN DEFAULT FALSE,

    -- Linked exit interview sentiment (denormalized for fast correlation queries)
    exit_interview_id                                                                    UUID REFERENCES exit_interviews(id),
    ai_sentiment_snapshot                                                                   VARCHAR(20),
    ai_sentiment_score_snapshot                                                                FLOAT,

    -- Cost estimation (replacement cost modeling)
    estimated_replacement_cost_npr                                                              NUMERIC(12,2),
    -- typically modeled as a multiple of annual salary (50-200% per industry benchmarks)

    rehire_eligible                                                                                BOOLEAN,

    created_at                                                                                        TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                                           BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 2. MANAGER SATISFACTION SNAPSHOTS (for flight-risk correlation)
-- Periodic rollups from engagement/pulse surveys, scoped per manager.
-- ================================================================
CREATE TABLE IF NOT EXISTS manager_satisfaction_snapshots (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    manager_employee_id      UUID       NOT NULL REFERENCES employees(id),

    snapshot_period_start       DATE NOT NULL,
    snapshot_period_end             DATE NOT NULL,

    avg_satisfaction_score              NUMERIC(3,2),  -- 1-5 scale, from engagement surveys
    survey_response_count                  INT DEFAULT 0,
    team_size_at_snapshot                     INT,

    -- Computed flight-risk correlation
    exits_during_period                          INT DEFAULT 0,
    exit_rate_pct                                   NUMERIC(5,2) GENERATED ALWAYS AS (
                                                      CASE WHEN team_size_at_snapshot > 0
                                                        THEN ROUND(exits_during_period::NUMERIC / team_size_at_snapshot * 100, 2)
                                                        ELSE NULL END
                                                    ) STORED,
    correlation_flag                                   VARCHAR(20) GENERATED ALWAYS AS (
                                                          CASE WHEN avg_satisfaction_score IS NOT NULL AND avg_satisfaction_score < 3.5
                                                                    AND exits_during_period >= 2 THEN 'high'
                                                               ELSE 'low' END
                                                        ) STORED,

    created_at                                                TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (manager_employee_id, snapshot_period_start, snapshot_period_end)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_exitrec_company         ON exit_records(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_exitrec_employee           ON exit_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_exitrec_dept                 ON exit_records(department_id_snapshot);
CREATE INDEX IF NOT EXISTS idx_exitrec_manager                 ON exit_records(manager_id_snapshot);
CREATE INDEX IF NOT EXISTS idx_exitrec_lwd                       ON exit_records(last_working_date);
CREATE INDEX IF NOT EXISTS idx_exitrec_regrettable                 ON exit_records(is_regrettable) WHERE is_regrettable;
CREATE INDEX IF NOT EXISTS idx_exitrec_type                          ON exit_records(exit_type);
CREATE INDEX IF NOT EXISTS idx_exitrec_reason                          ON exit_records(reason_category);

CREATE INDEX IF NOT EXISTS idx_mss_manager                                ON manager_satisfaction_snapshots(manager_employee_id);
CREATE INDEX IF NOT EXISTS idx_mss_correlation                                ON manager_satisfaction_snapshots(correlation_flag) WHERE correlation_flag = 'high';
CREATE INDEX IF NOT EXISTS idx_mss_period                                       ON manager_satisfaction_snapshots(snapshot_period_start, snapshot_period_end);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-create exit_records row when a resignation reaches final status
-- (auto_accepted_15day or accepted) — pulls demographic snapshot at that moment
CREATE OR REPLACE FUNCTION fn_create_exit_record()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    emp RECORD;
    perf RECORD;
    is_top_performer BOOLEAN := FALSE;
    salary_band TEXT;
BEGIN
    IF NEW.status IN ('accepted', 'auto_accepted_15day') AND
       (OLD IS NULL OR OLD.status NOT IN ('accepted', 'auto_accepted_15day')) THEN

        SELECT e.*, EXTRACT(YEAR FROM AGE(NOW(), e.date_of_birth))::INT AS age,
               d.name AS dept_name
        INTO emp
        FROM employees e LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.id = NEW.employee_id;

        salary_band := CASE
            WHEN emp.basic_salary_npr < 40000 THEN 'low'
            WHEN emp.basic_salary_npr < 100000 THEN 'mid'
            ELSE 'high' END;

        INSERT INTO exit_records
          (company_id, employee_id, department_id_snapshot, department_name_snapshot,
           branch_id_snapshot, manager_id_snapshot, designation_snapshot,
           age_at_exit, gender_snapshot, tenure_years_at_exit, salary_band_snapshot, salary_npr_at_exit,
           exit_type, last_working_date, resignation_id, reason_category,
           estimated_replacement_cost_npr, created_at)
        VALUES
          (NEW.company_id, NEW.employee_id, emp.department_id, emp.dept_name,
           emp.branch_id, emp.manager_id, NULL,
           emp.age, emp.gender, NEW.tenure_years_at_resignation, salary_band, emp.basic_salary_npr,
           'voluntary', COALESCE(NEW.final_lwd, NEW.proposed_last_working_date), NEW.id, NEW.reason_category,
           ROUND(COALESCE(emp.basic_salary_npr, 0) * 12 * 0.75, 2),  -- 75% of annual salary as default replacement-cost estimate
           NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_create_exit_record
    AFTER UPDATE OF status ON employee_resignations
    FOR EACH ROW EXECUTE FUNCTION fn_create_exit_record();

-- Sync exit_interview sentiment into the exit_records snapshot once interview completes
CREATE OR REPLACE FUNCTION fn_sync_interview_sentiment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE exit_records
           SET exit_interview_id = NEW.id,
               ai_sentiment_snapshot = NEW.ai_sentiment,
               ai_sentiment_score_snapshot = NEW.ai_sentiment_score,
               rehire_eligible = NEW.rehire_eligible
         WHERE employee_id = NEW.employee_id AND NOT is_deleted;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_sync_interview_sentiment
    AFTER UPDATE OF status ON exit_interviews
    FOR EACH ROW EXECUTE FUNCTION fn_sync_interview_sentiment();

-- Auto-update manager satisfaction snapshot exit counts when exit_records inserted
CREATE OR REPLACE FUNCTION fn_update_manager_exit_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE manager_satisfaction_snapshots
       SET exits_during_period = exits_during_period + 1
     WHERE manager_employee_id = NEW.manager_id_snapshot
       AND NEW.last_working_date BETWEEN snapshot_period_start AND snapshot_period_end;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_update_manager_exits
    AFTER INSERT ON exit_records
    FOR EACH ROW EXECUTE FUNCTION fn_update_manager_exit_count();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Attrition Dashboard — Executive KPI summary
CREATE OR REPLACE VIEW v_attrition_kpi_summary AS
SELECT
    company_id,
    (SELECT COUNT(*) FROM employees WHERE company_id = er.company_id) AS total_headcount,
    (SELECT COUNT(*) FROM employees WHERE company_id = er.company_id AND employment_status = 'active') AS active_employees,
    COUNT(*) AS total_exits_ytd,
    COUNT(*) FILTER (WHERE exit_type = 'voluntary') AS voluntary_exits,
    COUNT(*) FILTER (WHERE exit_type = 'involuntary') AS involuntary_exits,
    ROUND(COUNT(*) FILTER (WHERE exit_type = 'voluntary')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS voluntary_pct,
    ROUND(AVG(tenure_years_at_exit)::NUMERIC, 2) AS avg_tenure_years,
    COUNT(*) FILTER (WHERE is_regrettable) AS regrettable_exits,
    ROUND(SUM(estimated_replacement_cost_npr)::NUMERIC, 0) AS total_replacement_cost_npr
FROM exit_records er
WHERE last_working_date >= DATE_TRUNC('year', CURRENT_DATE) AND NOT is_deleted
GROUP BY company_id;

-- Page 1: Monthly attrition rate trend
CREATE OR REPLACE VIEW v_attrition_monthly_trend AS
SELECT
    DATE_TRUNC('month', last_working_date) AS month,
    COUNT(*) AS exits,
    company_id
FROM exit_records
WHERE NOT is_deleted
GROUP BY DATE_TRUNC('month', last_working_date), company_id
ORDER BY month;

-- Page 1: Department risk heatmap
CREATE OR REPLACE VIEW v_attrition_department_heatmap AS
SELECT
    er.department_name_snapshot AS department,
    COUNT(*) AS exits,
    (SELECT COUNT(*) FROM employees e WHERE e.department_id = er.department_id_snapshot) AS current_headcount,
    ROUND(COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM employees e WHERE e.department_id = er.department_id_snapshot),0) * 100, 1) AS attrition_rate_pct,
    SUM(er.estimated_replacement_cost_npr) AS total_cost_npr,
    er.company_id
FROM exit_records er
WHERE last_working_date >= CURRENT_DATE - INTERVAL '12 months' AND NOT is_deleted
GROUP BY er.department_name_snapshot, er.department_id_snapshot, er.company_id
ORDER BY attrition_rate_pct DESC;

-- Page 1: Demographic breakdown (age band)
CREATE OR REPLACE VIEW v_attrition_age_band AS
SELECT
    CASE WHEN age_at_exit BETWEEN 18 AND 25 THEN '18-25'
         WHEN age_at_exit BETWEEN 26 AND 35 THEN '26-35'
         WHEN age_at_exit BETWEEN 36 AND 45 THEN '36-45'
         ELSE '46+' END AS age_band,
    COUNT(*) AS exit_count,
    company_id
FROM exit_records
WHERE age_at_exit IS NOT NULL AND NOT is_deleted
GROUP BY age_band, company_id;

-- Page 2: Primary reasons for leaving
CREATE OR REPLACE VIEW v_exit_primary_reasons AS
SELECT
    reason_category,
    COUNT(*) AS exit_count,
    ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER (PARTITION BY company_id) * 100, 1) AS pct,
    company_id
FROM exit_records
WHERE reason_category IS NOT NULL AND NOT is_deleted
GROUP BY reason_category, company_id
ORDER BY exit_count DESC;

-- Page 2: AI sentiment gauge aggregate
CREATE OR REPLACE VIEW v_exit_sentiment_gauge AS
SELECT
    ROUND(AVG(ai_sentiment_score_snapshot)::NUMERIC, 1) AS avg_sentiment_score,
    COUNT(*) FILTER (WHERE ai_sentiment_snapshot = 'positive') AS positive_count,
    COUNT(*) FILTER (WHERE ai_sentiment_snapshot = 'mixed') AS mixed_count,
    COUNT(*) FILTER (WHERE ai_sentiment_snapshot = 'negative') AS negative_count,
    COUNT(*) FILTER (WHERE ai_sentiment_snapshot IS NOT NULL) AS total_with_sentiment,
    company_id
FROM exit_records
WHERE NOT is_deleted
GROUP BY company_id;

-- Page 2: Flight-risk correlation (manager satisfaction vs exits)
CREATE OR REPLACE VIEW v_flight_risk_correlation AS
SELECT
    e.first_name || ' ' || e.last_name AS manager_name,
    mss.avg_satisfaction_score, mss.exits_during_period, mss.exit_rate_pct, mss.correlation_flag,
    mss.company_id
FROM manager_satisfaction_snapshots mss
JOIN employees e ON mss.manager_employee_id = e.id
WHERE mss.snapshot_period_end >= CURRENT_DATE - INTERVAL '12 months'
ORDER BY mss.correlation_flag DESC, mss.exits_during_period DESC;

-- Page 2: Drill-through detail (individual exit records with performance context)
CREATE OR REPLACE VIEW v_exit_drill_through AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    er.department_name_snapshot, er.manager_name_snapshot, er.tenure_years_at_exit,
    er.last_performance_rating, er.salary_band_snapshot, er.reason_category,
    er.is_regrettable, er.ai_sentiment_snapshot, er.last_working_date,
    er.company_id
FROM exit_records er
JOIN employees e ON er.employee_id = e.id
WHERE NOT er.is_deleted
ORDER BY er.last_working_date DESC;

-- Regrettable vs non-regrettable summary (Strategic Action input)
CREATE OR REPLACE VIEW v_regrettable_attrition_summary AS
SELECT
    is_regrettable,
    COUNT(*) AS exit_count,
    ROUND(AVG(tenure_years_at_exit)::NUMERIC, 1) AS avg_tenure,
    COUNT(*) FILTER (WHERE is_high_performer) AS high_performer_count,
    company_id
FROM exit_records
WHERE NOT is_deleted
GROUP BY is_regrettable, company_id;
