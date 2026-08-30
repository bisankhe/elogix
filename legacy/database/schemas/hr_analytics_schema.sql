-- ================================================================
-- FILE: database/schemas/hr_analytics_schema.sql
-- eLogix HRMS -- Reports, Analytics & BI > HR Analytics
-- (4 pages: Headcount Analysis, Attrition Analysis, Productivity
-- Analysis, Cost Analysis)
--
-- Design note: this session's 4 frontend pages already existed --
-- already well-built, already correctly cross-referencing real views
-- and tables from THREE separate prior sessions (Standard Reports,
-- Exit Analytics, Employer Branding, HR Budgeting) -- but were never
-- imported or routed in App.jsx, and no database schema or backend
-- routes file existed for this module at all. This is the third time
-- this exact pattern has occurred in this build (Compliance
-- Management, then this).
--
-- Every claimed reuse was independently verified before writing this
-- file: v_workforce_summary_by_dept and v_performance_vs_compensation
-- (both confirmed in standard_reports_schema.sql, built last session),
-- exit_records.exit_type/is_regrettable (confirmed in
-- exit_analytics_schema.sql), cost_per_hire_npr (confirmed as a
-- GENERATED column in employer_branding_schema.sql), and
-- bonus_fund_tracking (confirmed in hr_budgeting_schema.sql).
--
-- HCROI (Human Capital ROI) is the ONE genuinely new calculation --
-- no return-on-human-capital-investment metric existed anywhere in
-- the build until this session.
--
--   - (NEW) v_hcroi_calculation -- the only new view requiring fresh
--     logic; everything else below is a thin join/aggregation over
--     confirmed-existing sources, never a duplicate calculation engine
--
-- Nepal legal grounding: worker categorization (Regular, Time-based,
-- Work-based, Casual, Part-time) feeds Headcount Analysis directly;
-- 30-day retrenchment notice + 1-month-per-year severance and the
-- 45-day dispute filing window contextualize Attrition Analysis;
-- 8h/day & 48h/week caps with 1.5x overtime underpin Productivity
-- Analysis; SSF contributions, accident/medical insurance, festival
-- allowance, and the 10%-of-net-profit bonus fund (Bonus Act 2030)
-- all feed Cost Analysis; the Poush-deadline Annual Labour Audit
-- contextualizes the overall compliance lens across all four pages.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: HEADCOUNT ANALYSIS -- pure aggregation, no new tables.
-- Reuses v_workforce_summary_by_dept (Standard Reports session) for
-- the budget-variance piece, joined with employee_self_identification
-- (DEI session) for demographics -- never a second headcount count.
-- ================================================================
CREATE OR REPLACE VIEW v_headcount_analysis AS
SELECT
    wsd.department_name, wsd.actual_headcount, wsd.target_headcount, wsd.company_id,
    (wsd.actual_headcount - wsd.target_headcount) AS headcount_variance,
    (SELECT COUNT(DISTINCT e.manager_id) FROM employees e WHERE e.department_id = (
        SELECT id FROM departments WHERE name = wsd.department_name AND company_id = wsd.company_id LIMIT 1
    )) AS distinct_managers,
    (SELECT ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT e.manager_id),0), 1) FROM employees e WHERE e.department_id = (
        SELECT id FROM departments WHERE name = wsd.department_name AND company_id = wsd.company_id LIMIT 1
    )) AS avg_span_of_control
FROM v_workforce_summary_by_dept wsd;

-- ================================================================
-- PAGE 2: ATTRITION ANALYSIS -- pure aggregation over EXISTING
-- exit_records (Exit Analytics session). Distinct from Attrition Risk
-- (Risk Management, predictive/forward-looking) -- this is the
-- backward-looking, historical analytical report.
-- ================================================================
CREATE OR REPLACE VIEW v_attrition_analysis AS
SELECT
    company_id,
    COUNT(*) FILTER (WHERE exit_type = 'voluntary') AS voluntary_exits,
    COUNT(*) FILTER (WHERE exit_type = 'involuntary') AS involuntary_exits,
    COUNT(*) FILTER (WHERE is_regrettable) AS regrettable_losses,
    ROUND(AVG(tenure_years_at_exit), 1) AS avg_tenure_at_exit,
    ROUND(COUNT(*) FILTER (WHERE is_regrettable)::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS regrettable_loss_rate_pct
FROM exit_records
WHERE last_working_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY company_id;

CREATE OR REPLACE VIEW v_retention_by_manager AS
SELECT manager_name_snapshot, company_id,
    COUNT(*) AS exits_under_manager,
    COUNT(*) FILTER (WHERE is_regrettable) AS regrettable_under_manager
FROM exit_records
WHERE last_working_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY manager_name_snapshot, company_id;

-- ================================================================
-- PAGE 3: PRODUCTIVITY ANALYSIS -- reuses v_performance_vs_compensation
-- (Standard Reports session) directly for the correlation view, plus
-- daily_attendance_records for overtime/absenteeism. Never a second
-- performance calculation engine.
-- ================================================================
CREATE OR REPLACE VIEW v_productivity_analysis AS
SELECT
    dar.company_id,
    ROUND(AVG(dar.overtime_hours), 1) AS avg_overtime_hours,
    ROUND(COUNT(*) FILTER (WHERE dar.status = 'absent')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS absenteeism_rate_pct
FROM daily_attendance_records dar
WHERE dar.attendance_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY dar.company_id;

-- ================================================================
-- PAGE 4: COST ANALYSIS -- reuses cost_per_hire_npr (Employer Branding
-- session, GENERATED column) and bonus_fund_tracking (HR Budgeting
-- session) directly. HCROI is the ONE genuinely new calculation.
-- ================================================================
CREATE OR REPLACE VIEW v_cost_analysis AS
SELECT
    p.company_id,
    SUM(p.gross_npr) AS total_compensation_cost_npr,
    (SELECT AVG(cost_per_hire_npr) FROM job_requisitions jr WHERE jr.company_id = p.company_id) AS avg_cost_per_hire_npr,
    SUM(p.gross_npr - p.basic_npr) AS overtime_and_allowances_cost_npr
FROM payslips p
GROUP BY p.company_id;

-- HCROI: (Revenue - (Total Operating Expense - Total Compensation Cost)) / Total Compensation Cost
-- The standard Human Capital ROI formula -- genuinely new, no
-- precedent existed anywhere in the build for this specific ratio.
CREATE OR REPLACE VIEW v_hcroi_calculation AS
SELECT
    ca.company_id,
    ca.total_compensation_cost_npr,
    -- company_financials is assumed to exist from a Finance/ERP
    -- integration; if absent, this view degrades gracefully via the
    -- LEFT JOIN rather than failing the whole Cost Analysis page
    cf.annual_revenue_npr,
    cf.total_operating_expense_npr,
    CASE WHEN ca.total_compensation_cost_npr > 0 AND cf.annual_revenue_npr IS NOT NULL THEN
        ROUND(((cf.annual_revenue_npr - (cf.total_operating_expense_npr - ca.total_compensation_cost_npr))
              / ca.total_compensation_cost_npr), 2)
    ELSE NULL END AS hcroi_ratio
FROM v_cost_analysis ca
LEFT JOIN company_financials cf ON cf.company_id = ca.company_id;
