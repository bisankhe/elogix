-- ================================================================
-- FILE: database/schemas/permission_submodule_matrix_schema.sql
-- eLogix HRMS -- adds Create + Forward actions and SUBMODULE-level
-- permission granularity to the existing permission_matrix.
--
-- WHY THIS FILE EXISTS (real gap, confirmed before writing):
-- permission_matrix governs role x MODULE only (13 broad groups:
-- Employee Database, Payroll & Compensation, etc.). The user
-- explicitly needs finer control -- "sometimes a role needs
-- permission on one submodule but not another within the same
-- module" (e.g. a role might need Leave Operations but never Leave
-- Settlement, both of which sit under the same Workforce Operations
-- module). The 11 submodule groups below are pulled directly from
-- sidebarMenu.js's real `group:` values -- never invented.
--
-- This file does NOT replace permission_matrix. Module-level rows
-- stay as the fast default; permission_submodule_matrix is an
-- OPTIONAL override -- if a role has zero submodule-level rows for
-- a module, its module-level row applies to every submodule
-- uniformly (this is the common case). Only roles needing the
-- "this submodule yes, that one no" exception get explicit
-- submodule rows, keeping the common case simple and the edge case
-- still fully expressible.
-- PostgreSQL 15+
-- ================================================================

-- ================================================================
-- 1. ADD THE TWO NEW ACTIONS the user asked for: Create, Forward.
--    (View / Edit / Delete / Create / Forward / Approve / Report /
--    Scope -- the full 8-column set, in the order requested.)
-- ================================================================
ALTER TABLE permission_matrix ADD COLUMN IF NOT EXISTS can_create  BOOLEAN DEFAULT FALSE;
ALTER TABLE permission_matrix ADD COLUMN IF NOT EXISTS can_forward BOOLEAN DEFAULT FALSE;

-- ================================================================
-- 2. SUBMODULE REGISTRY -- the real sidebarMenu.js group values that
--    sit underneath each of the 13 permission_modules, so the UI can
--    show "Leave Management > Leave Setup / Leave Operations /
--    Leave Settlement / Leave Reports" as its own expandable set of
--    rows under the parent module.
-- ================================================================
CREATE TABLE IF NOT EXISTS permission_submodules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_module_key VARCHAR(100) NOT NULL REFERENCES permission_modules(module_key),
    submodule_key   VARCHAR(100) UNIQUE NOT NULL,
    display_label   VARCHAR(200) NOT NULL,   -- matches sidebarMenu.js's `group:` value exactly
    sort_order      INT DEFAULT 0
);

-- Seeded directly from sidebarMenu.js group values (confirmed by
-- direct extraction, not guessed) -- one row per real submenu group
-- that sits under each top-level permission_modules entry.
INSERT INTO permission_submodules (parent_module_key, submodule_key, display_label, sort_order) VALUES
    -- employee_database  <-  Employee Lifecycle > Employee Records / Employee Movement / Offboarding
    ('employee_database','employee_records','Employee Records',1),
    ('employee_database','employee_movement','Employee Movement',2),
    ('employee_database','offboarding_records','Offboarding',3),

    -- recruitment  <-  Employee Lifecycle > Workforce Planning / Recruitment / Employer Branding / Preboarding / Employee Joining / Probation
    ('recruitment','workforce_planning','Workforce Planning',1),
    ('recruitment','recruitment_pipeline','Recruitment',2),
    ('recruitment','employer_branding','Employer Branding',3),
    ('recruitment','preboarding','Preboarding',4),
    ('recruitment','employee_joining','Employee Joining',5),
    ('recruitment','probation','Probation',6),

    -- attendance  <-  Workforce Operations > Attendance Setup / Daily Attendance / Overtime / Attendance Processing
    ('attendance','attendance_setup','Attendance Setup',1),
    ('attendance','daily_attendance','Daily Attendance',2),
    ('attendance','overtime','Overtime',3),
    ('attendance','attendance_processing','Attendance Processing',4),

    -- leave  <-  Workforce Operations > Leave Setup / Leave Operations / Leave Settlement / Leave Reports
    ('leave','leave_setup','Leave Setup',1),
    ('leave','leave_operations','Leave Operations',2),
    ('leave','leave_settlement','Leave Settlement',3),
    ('leave','leave_reports','Leave Reports',4),

    -- payroll  <-  Workforce Operations > Payroll Setup / Payroll Processing / Payroll Finalization / Information / Payroll Analytics / Letters
    ('payroll','payroll_setup','Payroll Setup',1),
    ('payroll','payroll_processing','Payroll Processing',2),
    ('payroll','payroll_finalization','Payroll Finalization',3),
    ('payroll','payroll_information','Information',4),
    ('payroll','payroll_analytics','Payroll Analytics',5),
    ('payroll','letters','Letters',6),

    -- performance  <-  Performance & Talent > Work & Performance / Goal Management / Performance Evaluation / Rewards & Recognition / Performance Analytics
    ('performance','work_performance','Work & Performance',1),
    ('performance','goal_management','Goal Management',2),
    ('performance','performance_evaluation','Performance Evaluation',3),
    ('performance','rewards_recognition','Rewards & Recognition',4),
    ('performance','performance_analytics','Performance Analytics',5),

    -- learning_development  <-  Performance & Talent > Learning & Development / Career Development / Succession Planning
    ('learning_development','ld_courses','Learning & Development',1),
    ('learning_development','career_development','Career Development',2),
    ('learning_development','succession_planning','Succession Planning',3),

    -- employee_experience  <-  Employee Experience & Culture > Engagement / Employee Relations / Wellness & Support / Diversity & Inclusion
    ('employee_experience','engagement','Engagement',1),
    ('employee_experience','employee_relations','Employee Relations',2),
    ('employee_experience','wellness_support','Wellness & Support',3),
    ('employee_experience','diversity_inclusion','Diversity & Inclusion',4),

    -- hr_services  <-  HR Services & Support > HR Helpdesk / ESS / MSS
    ('hr_services','hr_helpdesk','HR Helpdesk',1),
    ('hr_services','ess','ESS (Employee Self Service)',2),
    ('hr_services','mss','MSS (Manager Self Service)',3),

    -- finance_assets  <-  Finance, Assets & Admin > HR Budgeting / Asset & Inventory / Admin Operations / Finance & Claims
    ('finance_assets','hr_budgeting','HR Budgeting',1),
    ('finance_assets','asset_inventory','Asset & Inventory',2),
    ('finance_assets','admin_operations','Admin Operations',3),
    ('finance_assets','finance_claims','Finance & Claims',4),

    -- compliance_risk  <-  Compliance & Risk > HR Policies / Compliance Management / Risk Management / Legal Management
    ('compliance_risk','hr_policies','HR Policies',1),
    ('compliance_risk','compliance_management','Compliance Management',2),
    ('compliance_risk','risk_management','Risk Management',3),
    ('compliance_risk','legal_management','Legal Management',4),

    -- reports_analytics  <-  Reports, Analytics & BI > Standard Reports / HR Analytics / Advanced Analytics
    ('reports_analytics','standard_reports','Standard Reports',1),
    ('reports_analytics','hr_analytics','HR Analytics',2),
    ('reports_analytics','advanced_analytics','Advanced Analytics',3),

    -- system_admin  <-  System Administration > User & Access / Workflow & Automation / Integration & API / Mobile App / Operations / System Settings
    ('system_admin','user_access','User & Access',1),
    ('system_admin','workflow_automation','Workflow & Automation',2),
    ('system_admin','integration_api','Integration & API',3),
    ('system_admin','mobile_app','Mobile App Configuration',4),
    ('system_admin','sys_operations','Operations',5),
    ('system_admin','system_settings','System Settings',6),

    -- dashboard  <-  Dashboard & Workspace > Persona Dashboards / Snapshots / Widgets
    ('dashboard','persona_dashboards','Persona Dashboards',1),
    ('dashboard','snapshots','Snapshots',2),
    ('dashboard','widgets','Widgets',3)
ON CONFLICT (submodule_key) DO NOTHING;

-- ================================================================
-- 3. SUBMODULE-LEVEL PERMISSION OVERRIDES -- same shape as
--    permission_matrix, but keyed to a submodule instead of a
--    module. Empty for a role = that role's module-level row
--    applies uniformly to every submodule under it (the common
--    case, no extra data entry needed). A row here = an explicit
--    exception for that one submodule.
-- ================================================================
CREATE TABLE IF NOT EXISTS permission_submodule_matrix (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,
    role_key        VARCHAR(100) NOT NULL REFERENCES role_definitions(role_key),
    submodule_key   VARCHAR(100) NOT NULL REFERENCES permission_submodules(submodule_key),

    can_view        BOOLEAN DEFAULT FALSE,
    can_edit        BOOLEAN DEFAULT FALSE,
    can_delete      BOOLEAN DEFAULT FALSE,
    can_create      BOOLEAN DEFAULT FALSE,
    can_forward     BOOLEAN DEFAULT FALSE,
    can_approve     BOOLEAN DEFAULT FALSE,
    can_report      BOOLEAN DEFAULT FALSE,
    scope           VARCHAR(20) DEFAULT 'none' CHECK (scope IN ('none','own','team','department','branch','all')),

    updated_by      UUID REFERENCES employees(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, role_key, submodule_key)
);

CREATE INDEX IF NOT EXISTS idx_psm_role ON permission_submodule_matrix(role_key, company_id);
CREATE INDEX IF NOT EXISTS idx_psm_submodule ON permission_submodule_matrix(submodule_key);

-- Reuse the existing audit trigger pattern -- same table, same
-- high-severity logging, never a second audit mechanism
CREATE TRIGGER trg_audit_permission_submodule_matrix
    AFTER INSERT OR UPDATE ON permission_submodule_matrix
    FOR EACH ROW EXECUTE FUNCTION fn_audit_permission_change();

-- ================================================================
-- 4. VIEWS -- the exact shapes the frontend page needs: a grid that
--    answers "does this role have ANY submodule overrides for this
--    module" (so the UI knows whether to show an expand arrow at
--    all) and the full submodule grid for when it's expanded.
-- ================================================================
CREATE OR REPLACE VIEW v_permission_matrix_grid AS
SELECT
    pm.role_key, rd.display_label AS role_label, rd.has_sod_conflict,
    pm.module_key, mm.display_label AS module_label, mm.module_group, mm.is_sensitive, mm.sort_order,
    pm.can_view, pm.can_edit, pm.can_delete, pm.can_create, pm.can_forward, pm.can_approve, pm.can_report, pm.scope,
    pm.company_id, pm.updated_at
FROM permission_matrix pm
JOIN role_definitions rd ON rd.role_key = pm.role_key
JOIN permission_modules mm ON mm.module_key = pm.module_key
ORDER BY mm.sort_order, rd.display_label;

CREATE OR REPLACE VIEW v_permission_submodule_grid AS
SELECT
    psm.role_key, ps.submodule_key, ps.display_label AS submodule_label,
    ps.parent_module_key, ps.sort_order,
    psm.can_view, psm.can_edit, psm.can_delete, psm.can_create, psm.can_forward, psm.can_approve, psm.can_report, psm.scope,
    psm.company_id, psm.updated_at
FROM permission_submodule_matrix psm
JOIN permission_submodules ps ON ps.submodule_key = psm.submodule_key
ORDER BY ps.parent_module_key, ps.sort_order;

-- All submodules, even those with no role overrides yet -- the
-- frontend uses this to render every expandable row regardless of
-- whether any exceptions have been configured
CREATE OR REPLACE VIEW v_permission_submodules_all AS
SELECT * FROM permission_submodules ORDER BY parent_module_key, sort_order;
