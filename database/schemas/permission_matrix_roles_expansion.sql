-- ================================================================
-- FILE: database/schemas/permission_matrix_roles_expansion.sql
-- NepHR Pro -- expands role_definitions and permission_matrix to
-- cover all 19 real roles already used throughout the software
-- (personas.js), not just the 4 placeholder roles seeded in
-- user_access_schema.sql (employee, department_head, hr_manager,
-- super_admin).
--
-- WHY THIS FILE EXISTS: confirmed gap. The permission matrix UI
-- only showed 4 role columns because role_definitions only had 4
-- rows. Every other functional/department role in this software --
-- ESS (Employee Self Service), MSS (Manager Self Service / Dept
-- Head), Finance, IT Admin, Recruitment Officer, Procurement, Admin
-- Officer, Sales, Customer Service, Legal, Operations, Learning &
-- Development, HR Officer, Marketing, Executive, Branch/Unit, and
-- the external Recruitment Agency -- already exists as a working
-- persona+dashboard (personas.js, App.jsx routes) but had NO row in
-- role_definitions, so it could never appear in the permission
-- matrix at all.
--
-- role_key uses underscore_case to match the existing database
-- convention (role_definitions, permission_matrix already use
-- underscores); persona_id in personas.js uses hyphen-case. The
-- mapping between the two is explicit in each comment below.
-- PostgreSQL 15+
-- ================================================================

-- ================================================================
-- EXPAND role_definitions to all 19 real roles
-- ================================================================
INSERT INTO role_definitions (role_key, display_label, has_sod_conflict, sod_conflict_note) VALUES
    ('executive',             'Executive',                  FALSE, NULL),                                   -- personas.js: 'executive'
    ('branch_unit',           'Branch / Section / Unit',    FALSE, NULL),                                   -- personas.js: 'branch'
    ('recruitment_agency',    'Recruitment Agency',         FALSE, 'External persona -- RBAC-blocked from payroll and internal employee data by design.'), -- personas.js: 'recruitment'
    ('finance',               'Finance',                    TRUE,  'Processes payroll AND can view disbursement status -- review recommended for high-control environments.'), -- personas.js: 'finance'
    ('it_admin',              'IT Administrator',           TRUE,  'Manages user accounts AND security settings -- standard IT admin SoD profile, monitored via audit log.'), -- personas.js: 'it-admin'
    ('recruitment_officer',   'Recruitment Officer',        FALSE, NULL),                                   -- personas.js: 'recruitment-officer'
    ('procurement',           'Procurement',                FALSE, NULL),                                   -- personas.js: 'procurement'
    ('admin_officer',         'Admin Officer',              FALSE, NULL),                                   -- personas.js: 'admin-officer'
    ('sales',                 'Sales',                      FALSE, NULL),                                   -- personas.js: 'sales'
    ('customer_service',      'Customer Service',           FALSE, NULL),                                   -- personas.js: 'customer-service'
    ('legal',                 'Legal',                      FALSE, NULL),                                   -- personas.js: 'legal'
    ('operations',            'Operations',                 FALSE, NULL),                                   -- personas.js: 'operations'
    ('learning_development',  'Learning & Development',     FALSE, NULL),                                   -- personas.js: 'learning-development'
    ('hr_officer',            'HR Officer',                 FALSE, NULL),                                   -- personas.js: 'hr-officer'
    ('marketing',             'Marketing',                  FALSE, NULL)                                    -- personas.js: 'marketing'
ON CONFLICT (role_key) DO NOTHING;

-- Note: 'employee' role_key already exists from user_access_schema.sql
-- and is the role behind ESS (Employee Self Service) -- 'department_head'
-- already exists and is the role behind MSS (Manager Self Service).
-- Both are left as-is, not duplicated, just clarified here:
COMMENT ON COLUMN role_definitions.role_key IS
    'employee = ESS (Employee Self Service) persona. department_head = MSS (Manager Self Service) persona. Both pre-existing, not duplicated by this file.';

-- ================================================================
-- EXPAND permission_matrix defaults for the newly-added roles.
-- Each row mirrors the access pattern of that role's actual
-- dashboard (FinanceDashboard.jsx, ITAdministratorDashboard.jsx,
-- etc.) and the allowedPages/restrictedPages already defined for
-- it in personas.js -- never invented from scratch.
-- ================================================================
INSERT INTO permission_matrix (role_key, module_key, can_view, can_edit, can_delete, can_approve, scope) VALUES
    -- executive: strategic view-only across BI, no edit/delete anywhere
    ('executive','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('executive','employee_database',TRUE,FALSE,FALSE,FALSE,'all'),
    ('executive','payroll',TRUE,FALSE,FALSE,FALSE,'all'),
    ('executive','performance',TRUE,FALSE,FALSE,FALSE,'all'),
    ('executive','reports_analytics',TRUE,FALSE,FALSE,FALSE,'all'),
    ('executive','compliance_risk',TRUE,FALSE,FALSE,FALSE,'all'),
    ('executive','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),

    -- branch_unit: branch-scoped ops, no payroll/system access
    ('branch_unit','dashboard',TRUE,FALSE,FALSE,FALSE,'branch'),
    ('branch_unit','attendance',TRUE,FALSE,FALSE,TRUE,'branch'),
    ('branch_unit','leave',TRUE,FALSE,FALSE,FALSE,'branch'),
    ('branch_unit','performance',TRUE,FALSE,FALSE,FALSE,'branch'),
    ('branch_unit','payroll',FALSE,FALSE,FALSE,FALSE,'none'),
    ('branch_unit','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),

    -- recruitment_agency: external, ATS only, explicitly blocked from internal/payroll data
    ('recruitment_agency','recruitment',TRUE,TRUE,FALSE,FALSE,'own'),
    ('recruitment_agency','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('recruitment_agency','payroll',FALSE,FALSE,FALSE,FALSE,'none'),
    ('recruitment_agency','finance_assets',FALSE,FALSE,FALSE,FALSE,'none'),
    ('recruitment_agency','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),

    -- finance: payroll/cost full control, no system admin
    ('finance','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('finance','payroll',TRUE,TRUE,FALSE,TRUE,'all'),
    ('finance','finance_assets',TRUE,TRUE,FALSE,TRUE,'all'),
    ('finance','reports_analytics',TRUE,FALSE,FALSE,FALSE,'all'),
    ('finance','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('finance','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),

    -- it_admin: user/security/system control, no payroll/HR data
    ('it_admin','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('it_admin','system_admin',TRUE,TRUE,TRUE,TRUE,'all'),
    ('it_admin','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('it_admin','payroll',FALSE,FALSE,FALSE,FALSE,'none'),

    -- recruitment_officer: internal hiring, full pipeline control
    ('recruitment_officer','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('recruitment_officer','recruitment',TRUE,TRUE,TRUE,TRUE,'all'),
    ('recruitment_officer','employee_database',TRUE,FALSE,FALSE,FALSE,'none'),
    ('recruitment_officer','payroll',FALSE,FALSE,FALSE,FALSE,'none'),
    ('recruitment_officer','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),

    -- procurement: vendor/asset acquisition only
    ('procurement','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('procurement','finance_assets',TRUE,TRUE,FALSE,TRUE,'all'),
    ('procurement','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('procurement','payroll',FALSE,FALSE,FALSE,FALSE,'none'),

    -- admin_officer: facilities/admin ops only
    ('admin_officer','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('admin_officer','finance_assets',TRUE,TRUE,FALSE,FALSE,'all'),
    ('admin_officer','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('admin_officer','payroll',FALSE,FALSE,FALSE,FALSE,'none'),

    -- sales: field ops/incentives, no HR/payroll
    ('sales','dashboard',TRUE,FALSE,FALSE,FALSE,'team'),
    ('sales','attendance',TRUE,FALSE,FALSE,FALSE,'team'),
    ('sales','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('sales','payroll',FALSE,FALSE,FALSE,FALSE,'none'),

    -- customer_service: helpdesk only
    ('customer_service','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('customer_service','hr_services',TRUE,TRUE,FALSE,FALSE,'all'),
    ('customer_service','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('customer_service','payroll',FALSE,FALSE,FALSE,FALSE,'none'),

    -- legal: case/contract/compliance only
    ('legal','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('legal','compliance_risk',TRUE,TRUE,FALSE,TRUE,'all'),
    ('legal','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('legal','payroll',FALSE,FALSE,FALSE,FALSE,'none'),

    -- operations: field/route/task ops only
    ('operations','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('operations','attendance',TRUE,FALSE,FALSE,TRUE,'all'),
    ('operations','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('operations','payroll',FALSE,FALSE,FALSE,FALSE,'none'),

    -- learning_development: courses/skills/certs only
    ('learning_development','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('learning_development','learning_development',TRUE,TRUE,FALSE,TRUE,'all'),
    ('learning_development','employee_database',TRUE,FALSE,FALSE,FALSE,'none'),
    ('learning_development','payroll',FALSE,FALSE,FALSE,FALSE,'none'),

    -- hr_officer: day-to-day onboarding/leave/case intake, narrower than hr_manager
    ('hr_officer','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('hr_officer','onboarding',TRUE,TRUE,FALSE,FALSE,'all'),
    ('hr_officer','leave',TRUE,TRUE,FALSE,TRUE,'all'),
    ('hr_officer','hr_services',TRUE,TRUE,FALSE,FALSE,'all'),
    ('hr_officer','payroll',FALSE,FALSE,FALSE,FALSE,'none'),
    ('hr_officer','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),

    -- marketing: employer branding/campaigns only
    ('marketing','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('marketing','recruitment',TRUE,TRUE,FALSE,FALSE,'none'),
    ('marketing','employee_database',FALSE,FALSE,FALSE,FALSE,'none'),
    ('marketing','payroll',FALSE,FALSE,FALSE,FALSE,'none')
ON CONFLICT (company_id, role_key, module_key) DO NOTHING;

-- ================================================================
-- ADD can_report -- the 5th action this page's UI offers. A role
-- can have Report ticked (can see/export data) while Edit/Delete/
-- Approve stay off, distinct from can_view (which only governs
-- in-app viewing, not export/report generation).
-- ================================================================
ALTER TABLE permission_matrix ADD COLUMN IF NOT EXISTS can_report BOOLEAN DEFAULT FALSE;

-- Refresh the grid view to include the new column
CREATE OR REPLACE VIEW v_permission_matrix_grid AS
SELECT
    pm.role_key, rd.display_label AS role_label, rd.has_sod_conflict,
    pm.module_key, mm.display_label AS module_label, mm.module_group, mm.is_sensitive, mm.sort_order,
    pm.can_view, pm.can_edit, pm.can_delete, pm.can_approve, pm.can_report, pm.scope,
    pm.company_id, pm.updated_at
FROM permission_matrix pm
JOIN role_definitions rd ON rd.role_key = pm.role_key
JOIN permission_modules mm ON mm.module_key = pm.module_key
ORDER BY mm.sort_order, rd.display_label;
