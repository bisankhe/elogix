-- ================================================================
-- FILE: database/schemas/standard_reports_schema.sql
-- eLogix HRMS -- Reports, Analytics & BI > Standard Reports
-- (9 pages: HR Analytics, Workforce Summary, Department Reports,
-- Attendance Reports, Training Reports, Payroll Reports, Recruitment
-- Reports, Performance Reports, Leave Reports)
--
-- Design note: this is the HIGHEST-REUSE module in the whole build --
-- confirmed before writing anything that 4 of 9 pages already existed
-- as substantial, working reports (Attendance, Payroll, Performance,
-- Leave), and a 5th (Recruitment) existed fully built but was
-- genuinely orphaned -- imported in App.jsx but never assigned a
-- route. All 5 are reused/wired here verbatim, with ZERO new tables.
--
-- A genuinely interesting find: TrainingReportsLDPage's own header
-- comment (written in an earlier session) explicitly anticipated this
-- exact brief, stating it was "distinct from the generic
-- 'training-reports-page'" -- confirming a prior session already
-- designed for this split intentionally.
--
-- A real pre-existing bug was also found and fixed in this session:
-- the sidebar's 'payroll-reports' id was used in TWO different menu
-- groups (Payroll Analytics and Standard Reports) -- the second
-- instance was renamed to 'payroll-reports-std' to match the pattern
-- already used by its siblings (attendance-reports-page,
-- training-reports-page, performance-reports-page, leave-reports-page).
--
-- The 4 genuinely new pages (HR Analytics, Workforce Summary,
-- Department Reports, Training Reports "generic") are PURE VIEWS --
-- no new tables anywhere in this schema, only read-only aggregations
-- over employees, departments, department_budget_allocations,
-- payslips, and the existing diversity self-ID infrastructure.
--
-- Nepal legal grounding: employee-type/department registry reportable
-- to the Department of Labor and Occupational Safety on request;
-- 8h/day & 48h/week working-hour caps underpin HR Analytics' overtime
-- signal; equal-pay-for-equal-work verification feeds the performance-
-- vs-compensation correlation view.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- NO NEW TABLES. Every view below reads EXISTING tables only.
-- ================================================================

-- Page 1: HR Analytics -- the 3-5 KPI executive rollup
CREATE OR REPLACE VIEW v_hr_analytics_kpis AS
SELECT
    company_id,
    COUNT(*) AS total_headcount,
    ROUND(AVG(EXTRACT(YEAR FROM AGE(NOW(), hire_date))), 1) AS avg_tenure_years
FROM employees
WHERE employment_status = 'active'
GROUP BY company_id;

-- Page 1 (continued): performance-vs-compensation correlation, reused
-- by both HR Analytics and Workforce Summary
CREATE OR REPLACE VIEW v_performance_vs_compensation AS
SELECT e.id AS employee_id, e.first_name, e.last_name, pa.overall_rating,
    -- compensation percentile within the employee's own salary grade
    PERCENT_RANK() OVER (PARTITION BY e.designation_id ORDER BY e.current_salary_npr) * 100 AS comp_percentile,
    e.company_id
FROM employees e
LEFT JOIN performance_appraisals pa ON pa.employee_id = e.id
WHERE e.employment_status = 'active';

-- Page 2: Workforce Summary -- headcount actual vs target by department
CREATE OR REPLACE VIEW v_workforce_summary_by_dept AS
SELECT d.name AS department_name, d.company_id,
    COUNT(e.id) AS actual_headcount,
    dba.headcount_budget AS target_headcount
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status = 'active'
LEFT JOIN department_budget_allocations dba ON dba.department_id = d.id
GROUP BY d.name, d.company_id, dba.headcount_budget;

-- Page 3: Department Reports -- demographics + gender parity + cost
-- center, reusing the EXISTING employee_self_identification (DEI
-- session) for gender parity, never re-collecting that data here
CREATE OR REPLACE VIEW v_department_reports_detail AS
SELECT d.name AS department_name, d.company_id,
    COUNT(e.id) AS headcount,
    ROUND(AVG(EXTRACT(YEAR FROM AGE(NOW(), e.date_of_birth))), 1) AS avg_age,
    ROUND(COUNT(*) FILTER (WHERE esi.gender_identity = 'female')::NUMERIC / NULLIF(COUNT(esi.id),0) * 100, 1) AS female_pct,
    dba.allocated_npr AS budget_npr,
    (SELECT COALESCE(SUM(gross_npr),0) FROM payslips p JOIN employees e2 ON p.employee_id = e2.id WHERE e2.department_id = d.id) AS actual_payroll_npr
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status = 'active'
LEFT JOIN employee_self_identification esi ON esi.employee_id = e.id
LEFT JOIN department_budget_allocations dba ON dba.department_id = d.id
GROUP BY d.name, d.company_id, dba.allocated_npr;

-- Page 5: Training Reports (Standard, generic) -- department-level
-- mandatory compliance completion, reusing EXISTING lms_enrollments
CREATE OR REPLACE VIEW v_training_reports_standard AS
SELECT d.name AS department_name, d.company_id,
    ROUND(AVG(le.progress_pct) FILTER (WHERE lc.is_mandatory_compliance), 1) AS mandatory_completion_pct
FROM departments d
JOIN employees e ON e.department_id = d.id
JOIN lms_enrollments le ON le.employee_id = e.id
JOIN lms_courses lc ON le.lms_course_id = lc.id
GROUP BY d.name, d.company_id;

-- Pages 4, 6, 7, 8, 9 (Attendance, Payroll, Recruitment, Performance,
-- Leave Reports): intentionally NO new views here -- each reuses its
-- own EXISTING, already-built report page and its established backend
-- views verbatim (AttendanceReportsPage, PayrollReportsPage,
-- RecruitmentAnalyticsPage, PerformanceReportsPage, LeaveReportsPage).
