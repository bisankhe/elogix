-- ================================================================
-- FILE: database/schemas/permission_matrix_schema.sql
-- NepHR Pro -- the actual granular, editable RBAC engine.
--
-- WHY THIS FILE EXISTS (real gap, confirmed before writing):
-- Three permission-adjacent things already existed in this build,
-- and none of them let an admin click a checkbox and change who can
-- do what:
--   1. backend/middleware/auth.py -- ROLE_PERMISSIONS, a hardcoded
--      Python dict with 6 GLOBAL flags (can_edit_all, can_delete...).
--      Not per-page, not per-action, requires a code deploy to change.
--   2. src/data/personas.js -- allowedPages/restrictedPages arrays.
--      Frontend-only, hardcoded, page-level only (no view/edit/
--      delete/approve granularity), no database backing.
--   3. RolePermissionPage.jsx -- a READ-ONLY mock display of 4 roles
--      against 4 data-types. No save button. No write-back. Nothing
--      it shows actually controls anything at runtime.
--
-- This schema is the missing single source of truth: role x module
-- x action, stored in a real table, editable through the UI, read
-- by both backend middleware (enforcement) and frontend (dashboard/
-- sidebar/button visibility) at runtime -- no redeploy required for
-- a permission change to take effect.
--
-- Reuses role_definitions (user_access_schema.sql, already the
-- governed role registry) rather than creating a second roles table.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- MODULE REGISTRY -- every governable area of the software. This
-- maps to sidebarMenu.js groups, not individual pages, so the
-- matrix stays human-reviewable (dozens of rows, not 470).
-- ================================================================
CREATE TABLE IF NOT EXISTS permission_modules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_key      VARCHAR(100) UNIQUE NOT NULL,  -- e.g. 'payroll', 'employee_database', 'recruitment'
    display_label   VARCHAR(200) NOT NULL,
    module_group    VARCHAR(100),                  -- e.g. 'Workforce Operations' (matches sidebarMenu.js top group)
    sort_order      INT DEFAULT 0,
    is_sensitive    BOOLEAN DEFAULT FALSE           -- salary, PII, etc. -- flagged for extra audit attention
);

INSERT INTO permission_modules (module_key, display_label, module_group, sort_order, is_sensitive) VALUES
    ('dashboard',            'Dashboard & Workspace',        'Dashboard & Workspace',          1, FALSE),
    ('employee_database',    'Employee Database',            'Employee Lifecycle',             2, TRUE),
    ('recruitment',          'Recruitment & Hiring',         'Employee Lifecycle',             3, FALSE),
    ('onboarding',           'Onboarding',                   'Employee Lifecycle',             4, FALSE),
    ('offboarding',          'Offboarding',                  'Employee Lifecycle',             5, TRUE),
    ('attendance',           'Attendance Management',        'Workforce Operations',           6, FALSE),
    ('leave',                'Leave Management',             'Workforce Operations',           7, FALSE),
    ('payroll',              'Payroll & Compensation',       'Workforce Operations',           8, TRUE),
    ('performance',          'Performance & Talent',         'Performance & Talent Management',9, FALSE),
    ('learning_development', 'Learning & Development',       'Performance & Talent Management',10, FALSE),
    ('employee_experience',  'Employee Experience & Culture','Employee Experience & Culture',  11, FALSE),
    ('finance_assets',       'Finance, Assets & Admin',      'Finance, Assets & Administration',12, TRUE),
    ('compliance_risk',      'Compliance & Risk',            'Compliance & Risk Management',   13, TRUE),
    ('reports_analytics',    'Reports, Analytics & BI',      'Reports, Analytics & BI',        14, FALSE),
    ('system_admin',         'System Administration',        'System Administration',          15, TRUE),
    ('hr_services',          'HR Services & Support',        'HR Services & Support',          16, FALSE)
ON CONFLICT (module_key) DO NOTHING;

-- ================================================================
-- THE PERMISSION MATRIX -- role x module x action. This is the
-- single table an admin edits, the single table the backend
-- enforces against, the single table the frontend reads to decide
-- what dashboard tiles, sidebar items, and buttons to show.
-- ================================================================
CREATE TABLE IF NOT EXISTS permission_matrix (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,  -- NULL = global default; non-null = tenant override (mirrors system_settings pattern)
    role_key        VARCHAR(100) NOT NULL REFERENCES role_definitions(role_key),
    module_key      VARCHAR(100) NOT NULL REFERENCES permission_modules(module_key),

    can_view        BOOLEAN DEFAULT FALSE,
    can_edit        BOOLEAN DEFAULT FALSE,
    can_delete      BOOLEAN DEFAULT FALSE,
    can_approve     BOOLEAN DEFAULT FALSE,
    -- scope qualifies what can_view/can_edit actually reach: an
    -- 'own' department head editing leave does NOT mean editing
    -- every employee's leave company-wide
    scope           VARCHAR(20) DEFAULT 'none' CHECK (scope IN ('none','own','team','department','branch','all')),

    updated_by      UUID REFERENCES employees(id),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, role_key, module_key)
);

CREATE INDEX IF NOT EXISTS idx_pm_role ON permission_matrix(role_key, company_id);
CREATE INDEX IF NOT EXISTS idx_pm_module ON permission_matrix(module_key);

-- ================================================================
-- SEED: the default global posture (company_id NULL), derived
-- directly from the prior ROLE_PERMISSIONS dict in auth.py and the
-- existing RolePermissionPage.jsx mock data -- so switching this
-- system on does not silently change anyone's current access.
-- ================================================================
INSERT INTO permission_matrix (role_key, module_key, can_view, can_edit, can_delete, can_approve, scope) VALUES
    -- super_admin: full access everywhere
    ('super_admin','dashboard',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','employee_database',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','recruitment',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','onboarding',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','offboarding',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','attendance',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','leave',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','payroll',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','performance',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','learning_development',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','employee_experience',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','finance_assets',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','compliance_risk',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','reports_analytics',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','system_admin',TRUE,TRUE,TRUE,TRUE,'all'),
    ('super_admin','hr_services',TRUE,TRUE,TRUE,TRUE,'all'),

    -- hr_manager: full HR operations, no system admin, no delete on finance
    ('hr_manager','dashboard',TRUE,FALSE,FALSE,FALSE,'all'),
    ('hr_manager','employee_database',TRUE,TRUE,FALSE,FALSE,'all'),
    ('hr_manager','recruitment',TRUE,TRUE,TRUE,TRUE,'all'),
    ('hr_manager','onboarding',TRUE,TRUE,FALSE,TRUE,'all'),
    ('hr_manager','offboarding',TRUE,TRUE,FALSE,TRUE,'all'),
    ('hr_manager','attendance',TRUE,TRUE,FALSE,TRUE,'all'),
    ('hr_manager','leave',TRUE,TRUE,FALSE,TRUE,'all'),
    ('hr_manager','payroll',TRUE,TRUE,FALSE,FALSE,'all'),
    ('hr_manager','performance',TRUE,TRUE,FALSE,TRUE,'all'),
    ('hr_manager','learning_development',TRUE,TRUE,FALSE,TRUE,'all'),
    ('hr_manager','employee_experience',TRUE,TRUE,FALSE,FALSE,'all'),
    ('hr_manager','finance_assets',TRUE,FALSE,FALSE,FALSE,'none'),
    ('hr_manager','compliance_risk',TRUE,TRUE,FALSE,FALSE,'all'),
    ('hr_manager','reports_analytics',TRUE,FALSE,FALSE,FALSE,'all'),
    ('hr_manager','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),
    ('hr_manager','hr_services',TRUE,TRUE,FALSE,TRUE,'all'),

    -- department_head: own-department scope only, no payroll/system access
    ('department_head','dashboard',TRUE,FALSE,FALSE,FALSE,'department'),
    ('department_head','employee_database',TRUE,FALSE,FALSE,FALSE,'department'),
    ('department_head','attendance',TRUE,FALSE,FALSE,TRUE,'department'),
    ('department_head','leave',TRUE,FALSE,FALSE,TRUE,'department'),
    ('department_head','payroll',FALSE,FALSE,FALSE,FALSE,'none'),
    ('department_head','performance',TRUE,TRUE,FALSE,TRUE,'department'),
    ('department_head','employee_experience',TRUE,FALSE,FALSE,FALSE,'department'),
    ('department_head','finance_assets',FALSE,FALSE,FALSE,FALSE,'none'),
    ('department_head','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),
    ('department_head','hr_services',TRUE,FALSE,FALSE,TRUE,'department'),

    -- employee: own-record self-service only
    ('employee','dashboard',TRUE,FALSE,FALSE,FALSE,'own'),
    ('employee','employee_database',TRUE,FALSE,FALSE,FALSE,'own'),
    ('employee','attendance',TRUE,FALSE,FALSE,FALSE,'own'),
    ('employee','leave',TRUE,TRUE,FALSE,FALSE,'own'),
    ('employee','payroll',TRUE,FALSE,FALSE,FALSE,'own'),
    ('employee','performance',TRUE,FALSE,FALSE,FALSE,'own'),
    ('employee','learning_development',TRUE,FALSE,FALSE,FALSE,'own'),
    ('employee','employee_experience',TRUE,FALSE,FALSE,FALSE,'own'),
    ('employee','finance_assets',FALSE,FALSE,FALSE,FALSE,'none'),
    ('employee','system_admin',FALSE,FALSE,FALSE,FALSE,'none'),
    ('employee','hr_services',TRUE,TRUE,FALSE,FALSE,'own')
ON CONFLICT (company_id, role_key, module_key) DO NOTHING;

-- ================================================================
-- AUDIT: reuse the EXISTING audit_log table (system_settings_schema)
-- rather than creating a second log. Every permission change writes
-- here, because "who changed what role's access" is exactly the
-- kind of action that table already exists to track.
-- ================================================================
CREATE OR REPLACE FUNCTION fn_audit_permission_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO audit_log (company_id, actor_employee_id, action, module, detail, before_value, after_value, severity, created_at)
    VALUES (
        NEW.company_id, NEW.updated_by, 'UPDATE', 'Role & Permission',
        format('Permission changed: role=%s module=%s', NEW.role_key, NEW.module_key),
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        to_jsonb(NEW),
        'high',  -- permission changes are always high-severity audit events
        NOW()
    );
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_audit_permission_matrix
    AFTER INSERT OR UPDATE ON permission_matrix
    FOR EACH ROW EXECUTE FUNCTION fn_audit_permission_change();

-- ================================================================
-- VIEW: the exact shape the frontend matrix UI needs in one call --
-- role x module grid, ready to render without N+1 queries.
-- ================================================================
CREATE OR REPLACE VIEW v_permission_matrix_grid AS
SELECT
    pm.role_key, rd.display_label AS role_label, rd.has_sod_conflict,
    pm.module_key, mm.display_label AS module_label, mm.module_group, mm.is_sensitive, mm.sort_order,
    pm.can_view, pm.can_edit, pm.can_delete, pm.can_approve, pm.scope,
    pm.company_id, pm.updated_at
FROM permission_matrix pm
JOIN role_definitions rd ON rd.role_key = pm.role_key
JOIN permission_modules mm ON mm.module_key = pm.module_key
ORDER BY mm.sort_order, rd.display_label;
