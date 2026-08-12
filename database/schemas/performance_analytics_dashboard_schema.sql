-- ================================================================
-- FILE: database/schemas/performance_analytics_dashboard_schema.sql
-- eLogix HRMS — Performance & Talent Management > Goal & Performance >
-- Performance Analytics Module (3 pages: Performance Dashboard, Goal
-- Achievement, Productivity Analytics)
--
-- Design note: this is the CAPSTONE rollup of the entire Performance &
-- Talent arc. It aggregates from nearly every table built this arc:
--   - Performance Dashboard:  performance_appraisals, v_pms_360_radar,
--                              v_rating_distribution
--   - Goal Achievement:        v_unified_goal_tracking (KRA+KPI+OKR+
--                              Assignment, already a UNION ALL rollup)
--   - Productivity Analytics:  v_employeewise_workload,
--                              v_departmentwise_workload, payroll_register
-- Only two genuinely new things are added: ai_action_alerts (the
-- "5-second rule" alert feed referenced by the brief) and
-- training_roi_snapshots (pre/post performance score per training
-- initiative, distinct from training_recommendations which tracks
-- enrollment/progress, not before/after impact).
--
--   - ai_action_alerts        (manager-facing proactive risk flags)
--   - training_roi_snapshots  (pre/post score per course, for ROI bar chart)
--   - predictive_project_completions (confidence curves)
--
-- Nepal Labour Act 2074 Section 112: criteria communicated before
-- evaluation period; employees must have access to their own analytics;
-- written disagreement + internal review right. Section 142: 3
-- consecutive unsatisfactory appraisals = termination grounds, 7-day
-- explanation right. Section 7: equal remuneration, no gender-based
-- productivity-pay discrimination. Bonus Act 1974: 10% of net profit
-- distributed if productivity-linked profitability is achieved.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- AI ACTION ALERTS (the Performance Dashboard's proactive risk feed)
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_action_alerts (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    alert_type                  VARCHAR(50) NOT NULL,  -- 'engagement_decline','compa_ratio_drift','burnout_risk', etc.
    severity                       VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
    message                           TEXT NOT NULL,

    affected_employee_ids                UUID[],  -- array of employee IDs this alert concerns
    affected_department_id                  UUID REFERENCES departments(id),

    resolved                                   BOOLEAN DEFAULT FALSE,
    resolved_by                                   UUID,
    resolved_at                                      TIMESTAMPTZ,

    created_at                                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TRAINING ROI SNAPSHOTS (pre/post performance score per initiative --
-- distinct from training_recommendations which tracks enrollment/progress)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_roi_snapshots (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    course_label                 VARCHAR(300) NOT NULL,
    pre_training_avg_score          NUMERIC(4,2),  -- avg performance_appraisals.final_rating before training
    post_training_avg_score            NUMERIC(4,2),  -- avg after training completion
    participant_count                     INT DEFAULT 0,

    measured_at                              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PREDICTIVE PROJECT COMPLETIONS (confidence curves for ongoing work)
-- ================================================================
CREATE TABLE IF NOT EXISTS predictive_project_completions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    project_label                VARCHAR(300) NOT NULL,
    department_id                    UUID REFERENCES departments(id),

    confidence_pct                       NUMERIC(5,2) NOT NULL CHECK (confidence_pct BETWEEN 0 AND 100),
    predicted_completion_date               DATE,
    velocity_trend                             VARCHAR(20) DEFAULT 'stable' CHECK (velocity_trend IN ('improving','stable','declining')),
    flag_note                                     TEXT,

    status                                            VARCHAR(20) DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk')),
    updated_at                                           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_aaa_company       ON ai_action_alerts(company_id) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_aaa_severity           ON ai_action_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_trs_company                ON training_roi_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_ppc_company                    ON predictive_project_completions(company_id, status);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_perf_analytics_dashboard_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_ppc_upd
    BEFORE UPDATE ON predictive_project_completions
    FOR EACH ROW EXECUTE FUNCTION fn_perf_analytics_dashboard_updated_at();

-- Auto-flag a project as at_risk if confidence drops below 50% or
-- velocity trend is declining (the predictive-curve logic)
CREATE OR REPLACE FUNCTION fn_classify_project_risk()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.confidence_pct < 50 OR NEW.velocity_trend = 'declining' THEN
        NEW.status := 'at_risk';
    ELSE
        NEW.status := 'on_track';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_classify_project_risk
    BEFORE INSERT OR UPDATE OF confidence_pct, velocity_trend ON predictive_project_completions
    FOR EACH ROW EXECUTE FUNCTION fn_classify_project_risk();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Performance Dashboard — top-line KPIs (5-second-rule widgets)
CREATE OR REPLACE VIEW v_performance_dashboard_kpis AS
SELECT
    company_id,
    ROUND(AVG(final_rating), 1) AS avg_performance_score,
    COUNT(DISTINCT employee_id) AS employees_evaluated,
    COUNT(*) FILTER (WHERE status = 'disputed') AS disputed_count
FROM performance_appraisals
GROUP BY company_id;

-- Page 1: Department-level performance snapshot (drill-down source)
CREATE OR REPLACE VIEW v_performance_dashboard_by_dept AS
SELECT
    d.name AS department_name,
    ROUND(AVG(pa.final_rating), 1) AS avg_score,
    COUNT(DISTINCT e.id) AS headcount,
    COUNT(DISTINCT e.id) FILTER (WHERE pa.final_rating <= 2) AS at_risk_count,
    pa.company_id
FROM performance_appraisals pa
JOIN employees e ON pa.employee_id = e.id
JOIN departments d ON e.department_id = d.id
GROUP BY d.name, pa.company_id;

-- Page 1: Active AI action alerts feed
CREATE OR REPLACE VIEW v_ai_action_alerts_active AS
SELECT * FROM ai_action_alerts WHERE NOT resolved ORDER BY severity DESC, created_at DESC;

-- Page 2: Goal Achievement team board — aggregates the EXISTING unified
-- goal tracking rollup by department, computed live
CREATE OR REPLACE VIEW v_goal_achievement_team_board AS
SELECT
    d.name AS team_name,
    COUNT(*) AS goals_total,
    COUNT(*) FILTER (WHERE ugt.status = 'on_track') AS on_track,
    COUNT(*) FILTER (WHERE ugt.status IN ('at_risk','off_track')) AS at_risk,
    ROUND(AVG(ugt.progress_pct), 1) AS completion_pct,
    ugt.company_id
FROM v_unified_goal_tracking ugt
JOIN employees e ON ugt.owner_ref = e.id::TEXT
JOIN departments d ON e.department_id = d.id
GROUP BY d.name, ugt.company_id;

-- Page 2: Overall corporate OKR thermometer (single number for the header)
CREATE OR REPLACE VIEW v_corporate_okr_thermometer AS
SELECT company_id, ROUND(AVG(progress_pct), 1) AS overall_progress_pct
FROM v_unified_goal_tracking WHERE goal_type = 'OKR'
GROUP BY company_id;

-- Page 3: Productivity Analytics — department output heatmap source
-- (reuses the existing departmentwise workload view directly)
CREATE OR REPLACE VIEW v_productivity_heatmap AS
SELECT department_name, intensity, avg_overtime_hrs, company_id, week_start
FROM v_departmentwise_workload;

-- Page 3: Training ROI dashboard
CREATE OR REPLACE VIEW v_training_roi_dashboard AS
SELECT *,
    ROUND(post_training_avg_score - pre_training_avg_score, 2) AS score_lift
FROM training_roi_snapshots
ORDER BY score_lift DESC;

-- Page 3: Predictive project completions feed
CREATE OR REPLACE VIEW v_predictive_completions_dashboard AS
SELECT ppc.*, d.name AS department_name
FROM predictive_project_completions ppc
LEFT JOIN departments d ON ppc.department_id = d.id;

-- Page 3: Labor cost per productive unit (cross-references payroll with output)
CREATE OR REPLACE VIEW v_labor_cost_per_unit AS
SELECT
    d.name AS department_name,
    SUM(pr.gross_npr) AS total_labor_cost_npr,
    AVG(dwl.fte_gap) AS avg_fte_gap,
    pr.company_id
FROM payroll_register pr
JOIN employees e ON pr.employee_id = e.id
JOIN departments d ON e.department_id = d.id
LEFT JOIN v_departmentwise_workload dwl ON dwl.department_name = d.name AND dwl.company_id = pr.company_id
GROUP BY d.name, pr.company_id;
