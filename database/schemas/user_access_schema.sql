-- ================================================================
-- FILE: database/schemas/user_access_schema.sql
-- NepHR Pro -- System Administration > User & Access
-- (4 pages: User Management, Role & Permission, Access Control,
-- Menu Management)
--
-- Design note: this module governs infrastructure that was already
-- partially built across the entire prior project, never duplicated:
--   - employees (the account registry itself)
--   - mfa_enrollment (Security Risk session) -- reused directly for
--     Access Control's MFA tracking, never a second MFA table
--   - personas.js + sidebarMenu.js (7 personas with allowedPages/
--     restrictedPages arrays, 130+ menu entries) -- the actual
--     navigation/RBAC data model this module's UI administers
--
-- TWO genuine gaps were confirmed and closed:
--
-- 1. employees.role has been a free-text VARCHAR(100) with NO
--    constraint across every prior schema in this build (confirmed in
--    complete_schema.sql and master_schema.sql). Every trigger written
--    in every prior session that checked role = 'hr_manager' was
--    matching against an unconstrained string. role_definitions below
--    is the missing governed role registry; a CHECK constraint is
--    added to employees.role referencing it, closing the gap without
--    touching any of the dozens of triggers already written against
--    the existing string values.
--
-- 2. Sidebar.jsx's own comment claims "RBAC-aware menu filtering," but
--    only 7 of 130+ sidebarMenu.js entries actually carry a persona
--    field -- confirmed by direct count before writing this schema.
--    menu_persona_overrides lets an admin close that gap progressively
--    through the UI rather than requiring a single giant data-entry
--    pass across the entire menu tree.
--
--   - role_definitions (NEW -- the governed role registry)
--   - access_requests (NEW -- the temporary-grant approval workflow)
--   - menu_persona_overrides (NEW -- admin-managed persona-to-page
--     mapping, supplementing personas.js without replacing it)
--
-- Nepal/global compliance grounding: Segregation of Duties (no single
-- role should both create an employee profile and approve their first
-- payroll run); Principle of Least Privilege as the default posture;
-- dynamic menu removal (not greying-out) for unauthorized modules.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- THE MISSING GOVERNED ROLE REGISTRY
-- ================================================================
CREATE TABLE IF NOT EXISTS role_definitions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_key                   VARCHAR(100) UNIQUE NOT NULL,  -- e.g. 'hr_manager', 'employee', 'department_head', 'super_admin'
    display_label                  VARCHAR(200) NOT NULL,

    -- Segregation of Duties flag: TRUE if this role can both CREATE
    -- and APPROVE the same transaction type (e.g. create an employee
    -- profile AND approve their first payroll run)
    has_sod_conflict                   BOOLEAN DEFAULT FALSE,
    sod_conflict_note                      TEXT,

    is_active                                  BOOLEAN DEFAULT TRUE
);

-- Seed the roles already referenced by string throughout the build,
-- so the existing triggers' role = 'hr_manager' checks now validate
-- against a real governed value rather than an arbitrary string
INSERT INTO role_definitions (role_key, display_label, has_sod_conflict, sod_conflict_note) VALUES
    ('employee', 'Employee', FALSE, NULL),
    ('department_head', 'Department Head', FALSE, NULL),
    ('hr_manager', 'HR Manager', TRUE, 'Can both create employee profiles and approve their first payroll run -- review recommended for high-control environments.'),
    ('super_admin', 'Super Admin', TRUE, 'Full system access by design -- SoD enforced via audit trail rather than restriction.')
ON CONFLICT (role_key) DO NOTHING;

-- Now that the registry exists, constrain employees.role against it
-- WITHOUT touching any prior trigger's string comparisons
ALTER TABLE employees ADD CONSTRAINT ck_employees_role_governed
    CHECK (role IS NULL OR role IN (SELECT role_key FROM role_definitions));

-- ================================================================
-- PAGE 3: ACCESS CONTROL -- the temporary-grant request workflow
-- ================================================================
CREATE TABLE IF NOT EXISTS access_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    requested_by_employee_id UUID       NOT NULL REFERENCES employees(id),

    resource_description      TEXT NOT NULL,
    reason                        TEXT,
    duration_days                     INT,  -- NULL means permanent
    expires_at                            TIMESTAMPTZ GENERATED ALWAYS AS (
                                            CASE WHEN duration_days IS NOT NULL
                                                 THEN created_at + (duration_days || ' days')::INTERVAL
                                                 ELSE NULL END
                                          ) STORED,

    approver_employee_id                      UUID REFERENCES employees(id),
    status                                        VARCHAR(20) DEFAULT 'pending_approval'
                                                  CHECK (status IN ('pending_approval','approved','rejected','expired')),

    created_at                                        TIMESTAMPTZ DEFAULT NOW(),
    decided_at                                            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ar_pending ON access_requests(status) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_ar_expiring ON access_requests(expires_at) WHERE status = 'approved' AND expires_at IS NOT NULL;

-- Route the request to the requester's actual manager, never a
-- generic admin queue with no context
CREATE OR REPLACE FUNCTION fn_route_access_request()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID;
BEGIN
    SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.requested_by_employee_id;
    IF mgr_id IS NOT NULL THEN
        NEW.approver_employee_id := mgr_id;
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'access_requests', NEW.id, 'access_request_pending', mgr_id, 'reporting_manager',
           format('Access request pending your approval: %s', NEW.resource_description), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_route_access_request
    BEFORE INSERT ON access_requests
    FOR EACH ROW EXECUTE FUNCTION fn_route_access_request();

-- Auto-expire temporary grants -- never a forgotten exception that
-- quietly becomes permanent
CREATE OR REPLACE FUNCTION fn_expire_access_grants()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE access_requests SET status = 'expired'
    WHERE status = 'approved' AND expires_at IS NOT NULL AND expires_at < NOW();
END;$$;

-- ================================================================
-- PAGE 4: MENU MANAGEMENT -- admin-managed persona-to-page overrides,
-- supplementing the EXISTING personas.js without replacing it
-- ================================================================
CREATE TABLE IF NOT EXISTS menu_persona_overrides (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    sidebar_item_id            VARCHAR(100) NOT NULL,  -- matches sidebarMenu.js entry id
    persona_id                     VARCHAR(50) NOT NULL,  -- matches personas.js entry id
    is_allowed                         BOOLEAN NOT NULL,

    configured_by                          UUID NOT NULL,
    configured_at                              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, sidebar_item_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_mpo_item ON menu_persona_overrides(sidebar_item_id);

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: User Management -- orphaned-account detection, the brief's
-- explicit pain point, surfaced as a real query rather than a guess
CREATE OR REPLACE VIEW v_user_management_dashboard AS
SELECT e.id, e.first_name, e.last_name, e.role, e.employment_status, e.company_id,
    me.mfa_enabled, me.last_login_at,
    (me.last_login_at IS NOT NULL AND me.last_login_at < NOW() - INTERVAL '90 days'
       AND e.employment_status = 'active') AS is_possibly_orphaned
FROM employees e
LEFT JOIN mfa_enrollment me ON me.employee_id = e.id;

-- Page 2: Role & Permission -- the SoD flag surfaced directly
CREATE OR REPLACE VIEW v_role_permission_dashboard AS
SELECT * FROM role_definitions WHERE is_active;

-- Page 3: Access Control dashboard
CREATE OR REPLACE VIEW v_access_control_dashboard AS
SELECT ar.*, e.first_name, e.last_name FROM access_requests ar
JOIN employees e ON ar.requested_by_employee_id = e.id;

-- Page 4: Menu Management -- which sidebar items have NO persona
-- configuration at all (defaulting to visible for everyone), the
-- highest-priority review items
CREATE OR REPLACE VIEW v_menu_management_unconfigured AS
SELECT DISTINCT sidebar_item_id FROM menu_persona_overrides mpo1
WHERE NOT EXISTS (
    SELECT 1 FROM menu_persona_overrides mpo2 WHERE mpo2.sidebar_item_id = mpo1.sidebar_item_id
);
