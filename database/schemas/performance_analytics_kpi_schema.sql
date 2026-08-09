-- ================================================================
-- FILE: database/schemas/performance_analytics_kpi_schema.sql
-- NepHR Pro — Performance & Talent Management > Goal & Performance >
-- Performance Analytics > KPI Module (6 pages)
--
-- Design note: pure aggregation layer. Speedometer values are computed
-- LIVE from existing tables -- job_requisitions (recruitment),
-- v_compliance_health_score + statutory_filing_deadlines (compliance),
-- daily_attendance_records + overtime_payroll_lines (attendance),
-- employee_documents + employee_contracts (documentation). Only two
-- new things are added: a lightweight kpi_benchmark_zones reference
-- table (the red/yellow/green thresholds, configurable per company
-- rather than hardcoded in the frontend) and a kpi_snapshot_log for the
-- Before/After transformation infographic's historical comparison.
--
--   - kpi_benchmark_zones      (configurable gauge thresholds)
--   - kpi_snapshot_log         (point-in-time KPI captures for before/after)
--   - v_recruitment_speedometer, v_compliance_speedometer,
--     v_attendance_speedometer, v_documentation_speedometer (4 live views)
--
-- Nepal Labour Act 2074: Time-to-Fill tracked against MOLESS portal
-- advertisement requirement (Sections 22/23, foreign hiring); OT capped
-- 4hr/day-24hr/week; Documentation Completion requires signed
-- appointment letters, citizenship copies, SSF data on file.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CONFIGURABLE BENCHMARK ZONES (red/yellow/green thresholds per metric)
-- ================================================================
CREATE TABLE IF NOT EXISTS kpi_benchmark_zones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,  -- NULL = global default
    metric_key      VARCHAR(50) NOT NULL,  -- e.g. 'time_to_fill', 'absenteeism_rate'
    category        VARCHAR(30) NOT NULL CHECK (category IN ('recruitment','compliance','attendance','documentation')),

    green_zone_max  NUMERIC(10,2),  -- upper bound of green (or lower bound, if invert=true)
    yellow_zone_max NUMERIC(10,2),
    invert_direction BOOLEAN DEFAULT FALSE,  -- TRUE when higher = better (e.g. offer acceptance rate)

    UNIQUE (company_id, metric_key)
);

INSERT INTO kpi_benchmark_zones (company_id, metric_key, category, green_zone_max, yellow_zone_max, invert_direction) VALUES
    (NULL, 'time_to_fill_days', 'recruitment', 30, 45, FALSE),
    (NULL, 'offer_acceptance_pct', 'recruitment', 75, 85, TRUE),
    (NULL, 'cost_per_hire_npr', 'recruitment', 400000, 600000, FALSE),
    (NULL, 'audit_pass_rate_pct', 'compliance', 95, 99, TRUE),
    (NULL, 'training_completion_pct', 'compliance', 80, 95, TRUE),
    (NULL, 'policy_ack_pct', 'compliance', 90, 95, TRUE),
    (NULL, 'absenteeism_rate_pct', 'attendance', 2.5, 4.5, FALSE),
    (NULL, 'overtime_ratio_pct', 'attendance', 5, 10, FALSE),
    (NULL, 'leave_utilization_pct', 'attendance', 75, 90, TRUE),
    (NULL, 'documentation_completion_pct', 'documentation', 85, 95, TRUE),
    (NULL, 'esignature_completion_pct', 'documentation', 85, 98, TRUE),
    (NULL, 'missing_documents_pct', 'documentation', 2, 5, FALSE)
ON CONFLICT (company_id, metric_key) DO NOTHING;

-- ================================================================
-- KPI SNAPSHOT LOG (for the Before/After transformation infographic)
-- ================================================================
CREATE TABLE IF NOT EXISTS kpi_snapshot_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,

    snapshot_label  VARCHAR(30) NOT NULL CHECK (snapshot_label IN ('baseline_before','current_after')),
    metric_key      VARCHAR(50) NOT NULL,
    metric_value    NUMERIC(14,2) NOT NULL,
    metric_unit     VARCHAR(20),

    captured_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, snapshot_label, metric_key)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_kbz_category   ON kpi_benchmark_zones(category);
CREATE INDEX IF NOT EXISTS idx_ksl_company        ON kpi_snapshot_log(company_id, snapshot_label);

-- ================================================================
-- VIEWS — live speedometer calculations
-- ================================================================

-- Page 3: Recruitment
-- Time-to-Fill = Sum of Days to Fill Vacancies / Total Number of Vacancies
CREATE OR REPLACE VIEW v_recruitment_speedometer AS
SELECT
    company_id,
    ROUND(AVG(EXTRACT(DAY FROM (COALESCE(filled_date, CURRENT_DATE) - posted_date))), 1) AS avg_time_to_fill_days,
    ROUND(COUNT(*) FILTER (WHERE status = 'filled' AND accepted_date IS NOT NULL)::NUMERIC
          / NULLIF(COUNT(*) FILTER (WHERE status IN ('filled','cancelled')), 0) * 100, 1) AS offer_acceptance_pct,
    COUNT(*) FILTER (WHERE moless_portal_posted) AS moless_compliant_count,
    COUNT(*) AS total_vacancies
FROM job_requisitions
WHERE created_at >= DATE_TRUNC('quarter', CURRENT_DATE)
GROUP BY company_id;

-- Page 4: Compliance (reuses the EXISTING health score + filing deadlines)
CREATE OR REPLACE VIEW v_compliance_speedometer AS
SELECT
    company_id,
    ROUND(AVG(health_score), 1) AS audit_pass_rate_pct,
    (SELECT COUNT(*) FROM statutory_filing_deadlines sfd WHERE sfd.company_id = vchs.company_id AND sfd.status = 'pending' AND sfd.due_date <= CURRENT_DATE + 14) AS filings_due_soon
FROM v_compliance_health_score vchs
GROUP BY company_id;

-- Page 5: Attendance (reuses Bradford Factor pattern + overtime lines)
CREATE OR REPLACE VIEW v_attendance_speedometer AS
SELECT
    dar.company_id,
    ROUND(COUNT(*) FILTER (WHERE dar.current_status = 'absent')::NUMERIC / NULLIF(COUNT(*),0) * 100, 2) AS absenteeism_rate_pct,
    (SELECT ROUND(SUM(opl.ot_hours)::NUMERIC / NULLIF(SUM(opl.scheduled_hours),0) * 100, 2)
       FROM overtime_payroll_lines opl WHERE opl.company_id = dar.company_id) AS overtime_ratio_pct,
    (SELECT COUNT(*) FILTER (WHERE opl2.exceeds_weekly_cap)::NUMERIC / NULLIF(COUNT(*),0) * 100
       FROM overtime_payroll_lines opl2 WHERE opl2.company_id = dar.company_id) AS pct_exceeding_legal_ot_cap
FROM daily_attendance_records dar
WHERE dar.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY dar.company_id;

-- Page 6: Documentation (reuses existing employee_documents/employee_contracts)
CREATE OR REPLACE VIEW v_documentation_speedometer AS
SELECT
    e.company_id,
    ROUND(COUNT(DISTINCT ed.employee_id) FILTER (WHERE ed.is_complete)::NUMERIC / NULLIF(COUNT(DISTINCT e.id),0) * 100, 1) AS documentation_completion_pct,
    ROUND(COUNT(*) FILTER (WHERE ed.esignature_completed_at IS NOT NULL)::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS esignature_completion_pct,
    ROUND(COUNT(DISTINCT e.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM employee_documents ed2 WHERE ed2.employee_id = e.id))::NUMERIC
          / NULLIF(COUNT(DISTINCT e.id),0) * 100, 1) AS missing_documents_pct
FROM employees e
LEFT JOIN employee_documents ed ON ed.employee_id = e.id
WHERE e.employment_status = 'active'
GROUP BY e.company_id;

-- Contract expiry tracker (feeds the Documentation page's table)
CREATE OR REPLACE VIEW v_contract_expiry_tracker AS
SELECT
    e.employee_code, e.first_name, e.last_name, ec.contract_type, ec.end_date AS expires,
    (ec.end_date - CURRENT_DATE) AS days_left,
    CASE WHEN (ec.end_date - CURRENT_DATE) <= 7 THEN 'urgent' ELSE 'upcoming' END AS status,
    e.company_id
FROM employee_contracts ec
JOIN employees e ON ec.employee_id = e.id
WHERE ec.end_date IS NOT NULL AND ec.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 60;

-- Before/After comparison (the transformation infographic's data source)
CREATE OR REPLACE VIEW v_kpi_transformation_comparison AS
SELECT
    b.metric_key, b.metric_value AS before_value, a.metric_value AS after_value, b.metric_unit,
    ROUND((a.metric_value - b.metric_value) / NULLIF(ABS(b.metric_value),0) * 100, 1) AS pct_change,
    b.company_id
FROM kpi_snapshot_log b
JOIN kpi_snapshot_log a ON a.company_id = b.company_id AND a.metric_key = b.metric_key AND a.snapshot_label = 'current_after'
WHERE b.snapshot_label = 'baseline_before';
