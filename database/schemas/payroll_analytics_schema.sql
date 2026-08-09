-- ================================================================
-- FILE: database/schemas/payroll_analytics_schema.sql
-- NepHR Pro — Workforce Operations > Payroll & Compensation >
-- Payroll Analytics Module (2 pages, 8 sub-reports)
--
-- Design note: this module is PURE AGGREGATION over existing tables --
-- no employee/vendor/attendance data is duplicated. It reuses:
--   - employees, outsource_vendors, vendor_employees (headcount/deployment)
--   - v_insource_attendance_log, v_outsource_attendance_today (attendance)
--   - vendor_billing_records, vendor_billing_3way_match (billing)
--   - v_compliance_health_score, v_outsource_payroll_compliance (compliance)
--   - task_location_assignments (deployment)
--   - payroll_register, salary_structures (cost comparison)
-- New tables are added only for genuinely new concepts: salary range
-- bands (needed for compa-ratio, doesn't exist yet), 9-box grid config,
-- and pay equity audit results.
--
--   1. Payroll Reports (8 sub-reports) -> all views, zero new tables
--   2. Compensation Analytics -> salary_range_bands + nine_box_grid +
--                                pay_equity_audits
--
-- Nepal Labour Act 2074 Section 9 / Labour Rules Rule 6: workforce
-- register requirement; Sections 58-60: outsourcing/vendor liability;
-- Section 16: 8hr/48hr caps; Section 105: minimum wage baseline.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 2. COMPENSATION ANALYTICS — new supporting tables
-- ================================================================
CREATE TABLE IF NOT EXISTS salary_range_bands (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    grade_level           VARCHAR(20) NOT NULL,  -- e.g. 'L3', 'L4'
    department_id            UUID REFERENCES departments(id),  -- NULL = company-wide band

    range_min_npr               NUMERIC(12,2) NOT NULL,
    range_midpoint_npr             NUMERIC(12,2) NOT NULL,
    range_max_npr                     NUMERIC(12,2) NOT NULL,

    effective_from                       DATE DEFAULT CURRENT_DATE,
    created_at                              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, grade_level, department_id)
);

CREATE TABLE IF NOT EXISTS nine_box_grid (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),

    performance_rating    VARCHAR(10) NOT NULL CHECK (performance_rating IN ('low','medium','high')),
    potential_rating         VARCHAR(10) NOT NULL CHECK (potential_rating IN ('low','medium','high')),
    review_cycle                 VARCHAR(20) NOT NULL,  -- e.g. '2025-H1'

    recommended_increase_pct        NUMERIC(5,2) DEFAULT 0,
    bonus_multiplier                   NUMERIC(4,2) DEFAULT 1.0,

    created_at                            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, review_cycle)
);

CREATE TABLE IF NOT EXISTS pay_equity_audits (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    audit_period          VARCHAR(20) NOT NULL,  -- e.g. '2025-Q2'
    department_id            UUID REFERENCES departments(id),

    gender_pay_gap_pct           NUMERIC(6,2),
    role_level_pair_label            VARCHAR(200),  -- e.g. 'Software Engineer L3'
    unexplained_variance_pct            NUMERIC(6,2),
    flagged                                BOOLEAN GENERATED ALWAYS AS (
                                            unexplained_variance_pct IS NOT NULL AND ABS(unexplained_variance_pct) > 5
                                          ) STORED,

    reviewed                                  BOOLEAN DEFAULT FALSE,
    reviewed_by                                  UUID,
    reviewed_at                                     TIMESTAMPTZ,

    created_at                                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_srb_company       ON salary_range_bands(company_id, grade_level);
CREATE INDEX IF NOT EXISTS idx_nbg_employee          ON nine_box_grid(employee_id, review_cycle);
CREATE INDEX IF NOT EXISTS idx_pea_company               ON pay_equity_audits(company_id, audit_period);
CREATE INDEX IF NOT EXISTS idx_pea_flagged                  ON pay_equity_audits(flagged) WHERE flagged;

-- ================================================================
-- VIEWS — Page 1: Payroll Reports (8 sub-reports, all pure aggregation)
-- ================================================================

-- 1a. Workforce Summary
CREATE OR REPLACE VIEW v_workforce_summary AS
SELECT
    employment_type AS category,
    COUNT(*) AS headcount,
    ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 1) AS pct_of_total,
    company_id
FROM employees
WHERE employment_status = 'active'
GROUP BY employment_type, company_id;

-- 1b. Vendor-wise Headcount
CREATE OR REPLACE VIEW v_vendor_wise_headcount AS
SELECT
    v.name AS vendor_name, ve.role_designation,
    COUNT(*) AS contracted_headcount,
    COUNT(*) FILTER (WHERE ve.status = 'active') AS active_headcount,
    v.company_id
FROM vendor_employees ve
JOIN outsource_vendors v ON ve.vendor_id = v.id
GROUP BY v.name, ve.role_designation, v.company_id;

-- 1c/1d. Insource/Outsource Attendance -- reuse existing views directly,
-- exposed here under analytics-friendly aliases
CREATE OR REPLACE VIEW v_payroll_report_insource_attendance AS
SELECT * FROM v_insource_attendance_log;

CREATE OR REPLACE VIEW v_payroll_report_outsource_attendance AS
SELECT * FROM v_outsource_attendance_today;

-- 1e. Vendor Billing Report
CREATE OR REPLACE VIEW v_vendor_billing_report AS
SELECT
    v.name AS vendor_name, vbr.bill_no, vbr.billing_period_month, vbr.billing_period_year,
    vbr.workers_billed, vbr.gross_amount_npr,
    vbm.match_status,
    vbr.company_id
FROM vendor_billing_records vbr
JOIN outsource_vendors v ON vbr.vendor_id = v.id
LEFT JOIN vendor_billing_3way_match vbm ON vbm.vendor_billing_record_id = vbr.id;

-- 1f. Insource vs Outsource Cost
CREATE OR REPLACE VIEW v_insource_vs_outsource_cost AS
SELECT
    'insource' AS cost_type,
    SUM(pr.gross_npr) AS total_cost_npr,
    pr.pay_period,
    pr.company_id
FROM payroll_register pr
GROUP BY pr.pay_period, pr.company_id
UNION ALL
SELECT
    'outsource' AS cost_type,
    SUM(vbr.gross_amount_npr) AS total_cost_npr,
    TO_CHAR(MAKE_DATE(vbr.billing_period_year, vbr.billing_period_month, 1), 'YYYY-MM') AS pay_period,
    vbr.company_id
FROM vendor_billing_records vbr
GROUP BY vbr.billing_period_year, vbr.billing_period_month, vbr.company_id;

-- 1g. Compliance Report -- traffic-light, reuses existing compliance view
CREATE OR REPLACE VIEW v_payroll_compliance_report AS
SELECT
    'min_wage_compliance' AS check_item,
    CASE WHEN COUNT(*) FILTER (WHERE NOT min_wage_compliant) = 0 THEN 'green'
         WHEN COUNT(*) FILTER (WHERE NOT min_wage_compliant) <= 2 THEN 'yellow'
         ELSE 'red' END AS status,
    COUNT(*) FILTER (WHERE NOT min_wage_compliant) AS non_compliant_count,
    company_id
FROM v_outsource_payroll_compliance
GROUP BY company_id
UNION ALL
SELECT
    'statutory_filing_health' AS check_item,
    CASE WHEN AVG(health_score) >= 90 THEN 'green' WHEN AVG(health_score) >= 70 THEN 'yellow' ELSE 'red' END AS status,
    NULL AS non_compliant_count,
    company_id
FROM v_compliance_health_score
GROUP BY company_id;

-- 1h. Deployment Report
CREATE OR REPLACE VIEW v_deployment_report AS
SELECT
    tla.location_name,
    COUNT(*) FILTER (WHERE e.employment_type != 'outsourced') AS insource_deployed,
    COUNT(*) FILTER (WHERE e.employment_type = 'outsourced') AS outsource_deployed,
    tla.task_description,
    tla.company_id
FROM task_location_assignments tla
JOIN employees e ON tla.employee_id = e.id
WHERE tla.status = 'active'
GROUP BY tla.location_name, tla.task_description, tla.company_id;

-- ================================================================
-- VIEWS — Page 2: Compensation Analytics
-- ================================================================

CREATE OR REPLACE VIEW v_compa_ratio_analysis AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name, e.grade_level,
    e.basic_salary_npr AS current_salary_npr, srb.range_midpoint_npr,
    ROUND(e.basic_salary_npr / NULLIF(srb.range_midpoint_npr,0), 2) AS compa_ratio,
    CASE
        WHEN e.basic_salary_npr / NULLIF(srb.range_midpoint_npr,0) < 0.90 THEN 'Below Range'
        WHEN e.basic_salary_npr / NULLIF(srb.range_midpoint_npr,0) > 1.10 THEN 'Above Range'
        ELSE 'Within Range' END AS band,
    e.company_id
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN salary_range_bands srb ON srb.grade_level = e.grade_level
    AND (srb.department_id = e.department_id OR srb.department_id IS NULL)
    AND srb.company_id = e.company_id
WHERE e.employment_status = 'active';

CREATE OR REPLACE VIEW v_nine_box_summary AS
SELECT
    performance_rating, potential_rating,
    COUNT(*) AS employee_count,
    ROUND(AVG(recommended_increase_pct), 1) AS avg_increase_pct,
    company_id
FROM nine_box_grid
GROUP BY performance_rating, potential_rating, company_id;

CREATE OR REPLACE VIEW v_pay_equity_summary AS
SELECT
    audit_period,
    ROUND(AVG(gender_pay_gap_pct), 1) AS overall_gender_pay_gap_pct,
    COUNT(DISTINCT department_id) AS departments_audited,
    COUNT(*) FILTER (WHERE flagged) AS flagged_disparities,
    company_id
FROM pay_equity_audits
GROUP BY audit_period, company_id;

CREATE OR REPLACE VIEW v_pay_equity_flagged_detail AS
SELECT pea.*, d.name AS department_name
FROM pay_equity_audits pea
LEFT JOIN departments d ON pea.department_id = d.id
WHERE pea.flagged AND NOT pea.reviewed
ORDER BY ABS(pea.unexplained_variance_pct) DESC;

-- Total Rewards breakdown (base + benefits + bonus + allowances as % of total cost)
CREATE OR REPLACE VIEW v_total_rewards_breakdown AS
SELECT
    'base_salary' AS component, SUM(pr.gross_npr - COALESCE(bp.full_amount_npr,0)) AS amount_npr, pr.company_id
FROM payroll_register pr
LEFT JOIN bonus_payments bp ON bp.employee_id = pr.employee_id
GROUP BY pr.company_id
UNION ALL
SELECT 'bonus_incentives' AS component, SUM(full_amount_npr) AS amount_npr, company_id
FROM bonus_payments GROUP BY company_id
UNION ALL
SELECT 'ssf_employer' AS component, SUM(ssf_employee_npr) AS amount_npr, company_id
FROM payroll_register GROUP BY company_id;
