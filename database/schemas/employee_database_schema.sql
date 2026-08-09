-- ================================================================
-- FILE: database/schemas/employee_database_schema.sql
-- NepHR Pro — Employee Records > Employee Database Module
-- Covers all 7 pages. The core `employees` table already exists
-- (see master_schema.sql / employee_models.py) — this file ADDS the
-- related tables that extend it: family, emergency contacts, assets,
-- employment history. Directory/Profile/Personal-Info pages read
-- directly from the existing `employees` table plus these additions.
--
--   1. Employee Directory     -> reads `employees` (existing)
--   2. Employee Profile       -> reads `employees` (existing) + all below
--   3. Personal Information   -> reads/writes `employees` (existing) + change_requests
--   4. Family Details         -> employee_family_members (new)
--   5. Emergency Contact      -> employee_emergency_contacts (new)
--   6. Employee Assets        -> employee_assets (new)
--   7. Employment History     -> employee_employment_history (new)
--
-- Nepal Labour Act 2074: family/dependent recording for SSF dependent
-- family protection scheme, asset custody liability tracking,
-- employment history retention for statutory audit periods.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 3. PERSONAL INFORMATION CHANGE REQUESTS
-- Self-service edits to sensitive fields (address, bank) route through
-- an approval workflow rather than updating `employees` directly.
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_info_change_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    field_name                 VARCHAR(100) NOT NULL,  -- e.g. 'temporary_address','bank_account_no'
    old_value                     TEXT,
    new_value                       TEXT NOT NULL,

    requires_approval                  BOOLEAN DEFAULT TRUE,
    -- Sensitive fields (bank, citizenship, PAN) always TRUE; phone/personal_email can auto-apply

    status                                VARCHAR(20) DEFAULT 'pending'
                                         CHECK (status IN ('pending','approved','rejected','auto_applied')),
    reviewed_by                             UUID,
    reviewed_at                                TIMESTAMPTZ,
    rejection_reason                              TEXT,

    requested_at                                    TIMESTAMPTZ DEFAULT NOW(),
    applied_at                                         TIMESTAMPTZ
);

-- ================================================================
-- 4. FAMILY DETAILS
-- Nepal LA2074: family background + dependents for SSF dependent
-- family protection scheme. Highly sensitive — RBAC restricted.
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_family_members (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    full_name                  VARCHAR(200) NOT NULL,
    relationship                  VARCHAR(30) NOT NULL
                                  CHECK (relationship IN ('Father','Mother','Spouse','Son','Daughter','Sibling','Other')),
    date_of_birth                    DATE,
    occupation                          VARCHAR(200),

    -- SSF dependent family protection scheme
    is_dependent                          BOOLEAN DEFAULT FALSE,
    benefits_enrolled                        BOOLEAN DEFAULT FALSE,
    benefits_enrolled_date                      DATE,
    health_insurance_covered                       BOOLEAN DEFAULT FALSE,

    -- Annual re-verification (data-privacy best practice)
    last_verified_date                                DATE DEFAULT CURRENT_DATE,
    verification_due_date                                DATE GENERATED ALWAYS AS (
                                                            last_verified_date + INTERVAL '1 year'
                                                          ) STORED,

    -- Documentation
    relationship_proof_url                                  VARCHAR(500),

    created_at                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                  TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                   BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 5. EMERGENCY CONTACTS
-- Best practice: minimum 2 required, exactly 1 primary, annual verification.
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    full_name                  VARCHAR(200) NOT NULL,
    relationship                  VARCHAR(30) NOT NULL,
    phone                            VARCHAR(50) NOT NULL,
    alt_phone                          VARCHAR(50),
    address                              TEXT,

    is_primary                             BOOLEAN DEFAULT FALSE,
    last_verified_date                        DATE DEFAULT CURRENT_DATE,
    verification_due_date                        DATE GENERATED ALWAYS AS (
                                                    last_verified_date + INTERVAL '1 year'
                                                  ) STORED,

    created_at                                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                        TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                         BOOLEAN DEFAULT FALSE
);

-- Partial unique index: only one primary contact per employee
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_primary_emergency_contact
    ON employee_emergency_contacts (employee_id)
    WHERE is_primary AND NOT is_deleted;

-- ================================================================
-- 6. EMPLOYEE ASSETS
-- Custody/liability tracking. Links to onboarding (Asset Allocation)
-- and offboarding (mandatory recovery) workflows.
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_assets (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    asset_allocation_item_id   UUID,    -- links back to onboarding asset_allocation_items, if applicable

    item_type                    VARCHAR(50) NOT NULL,  -- Laptop, Monitor, Access Card, Phone, Chair, Headset
    model                           VARCHAR(200),
    serial_number                     VARCHAR(100),
    value_npr                            NUMERIC(12,2),
    condition_notes                         VARCHAR(300) DEFAULT 'New',

    issue_date                                 DATE NOT NULL DEFAULT CURRENT_DATE,
    status                                        VARCHAR(20) DEFAULT 'assigned'
                                                  CHECK (status IN ('assigned','in_repair','returned','lost','written_off')),

    -- Custody / liability sign-off (Nepal best practice)
    custody_receipt_signed                          BOOLEAN DEFAULT FALSE,
    custody_receipt_url                                VARCHAR(500),
    custody_signed_date                                   DATE,

    return_date                                              DATE,
    return_condition                                            VARCHAR(300),

    -- Biannual hardware audit tracking
    last_audited_date                                              DATE,
    audit_status                                                      VARCHAR(20) DEFAULT 'pending'
                                                                      CHECK (audit_status IN ('pending','verified','discrepancy')),

    created_at                                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                           TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                            BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 7. EMPLOYMENT HISTORY
-- Immutable timeline: hires, promotions, transfers, salary changes,
-- manager changes, confirmations. Append-only by design.
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_employment_history (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    event_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
    event_type                    VARCHAR(30) NOT NULL
                                  CHECK (event_type IN ('hire','promotion','transfer','salary_change',
                                    'manager_change','confirmation','demotion','department_change')),

    -- Snapshot at time of event (immutable — never updated after insert)
    title_at_event                  VARCHAR(200),
    department_id_at_event             UUID,
    branch_id_at_event                    UUID,
    manager_id_at_event                      UUID,
    manager_name_at_event                       VARCHAR(200),
    salary_npr_at_event                            NUMERIC(12,2),
    employment_classification_at_event                VARCHAR(30),

    note                                                  TEXT,
    detail                                                  TEXT,  -- expandable long-form detail shown on click

    recorded_by                                                UUID,
    created_at                                                    TIMESTAMPTZ DEFAULT NOW()

    -- No updated_at / is_deleted — this table is append-only for audit integrity
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_icr_employee         ON employee_info_change_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_icr_status             ON employee_info_change_requests(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_efm_employee              ON employee_family_members(employee_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_efm_dependent               ON employee_family_members(is_dependent) WHERE is_dependent;
CREATE INDEX IF NOT EXISTS idx_efm_verification_due           ON employee_family_members(verification_due_date) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_eec_employee                       ON employee_emergency_contacts(employee_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_eec_verification_due                  ON employee_emergency_contacts(verification_due_date) WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_ea_employee                              ON employee_assets(employee_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ea_status                                  ON employee_assets(status);
CREATE INDEX IF NOT EXISTS idx_ea_audit_pending                             ON employee_assets(audit_status) WHERE audit_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_eeh_employee                                   ON employee_employment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_eeh_type                                         ON employee_employment_history(event_type);
CREATE INDEX IF NOT EXISTS idx_eeh_date                                          ON employee_employment_history(event_date DESC);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_emp_db_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'employee_family_members','employee_emergency_contacts','employee_assets'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_emp_db_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-apply non-sensitive change requests immediately; sensitive ones stay pending
CREATE OR REPLACE FUNCTION fn_change_request_routing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE sensitive_fields TEXT[] := ARRAY['bank_account_no','bank_name','citizenship_no','pan_no',
                                          'permanent_address','temporary_address'];
BEGIN
    IF NEW.field_name = ANY(sensitive_fields) THEN
        NEW.requires_approval := TRUE;
        NEW.status := 'pending';
    ELSE
        NEW.requires_approval := FALSE;
        NEW.status := 'auto_applied';
        NEW.applied_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_change_request_routing
    BEFORE INSERT ON employee_info_change_requests
    FOR EACH ROW EXECUTE FUNCTION fn_change_request_routing();

-- On HR approval, apply the change to the employees table dynamically
CREATE OR REPLACE FUNCTION fn_apply_approved_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        EXECUTE format('UPDATE employees SET %I = $1 WHERE id = $2', NEW.field_name)
            USING NEW.new_value, NEW.employee_id;
        NEW.applied_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_approved_change
    BEFORE UPDATE OF status ON employee_info_change_requests
    FOR EACH ROW EXECUTE FUNCTION fn_apply_approved_change();

-- Ensure only one primary emergency contact (defensive, in addition to unique index)
CREATE OR REPLACE FUNCTION fn_single_primary_contact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_primary THEN
        UPDATE employee_emergency_contacts
           SET is_primary = FALSE
         WHERE employee_id = NEW.employee_id AND id != NEW.id AND is_primary;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_single_primary_contact
    BEFORE INSERT OR UPDATE OF is_primary ON employee_emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION fn_single_primary_contact();

-- Auto-record an employment_history row whenever a key employees field changes
CREATE OR REPLACE FUNCTION fn_auto_log_employment_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.designation_id IS DISTINCT FROM OLD.designation_id THEN
        INSERT INTO employee_employment_history
          (company_id, employee_id, event_type, title_at_event, department_id_at_event,
           salary_npr_at_event, note, created_at)
        VALUES (NEW.company_id, NEW.id, 'promotion', NULL, NEW.department_id,
                NEW.basic_salary_npr, 'Designation changed.', NOW());
    END IF;
    IF NEW.basic_salary_npr IS DISTINCT FROM OLD.basic_salary_npr THEN
        INSERT INTO employee_employment_history
          (company_id, employee_id, event_type, salary_npr_at_event, note, created_at)
        VALUES (NEW.company_id, NEW.id, 'salary_change', NEW.basic_salary_npr,
                format('Salary changed from %s to %s', OLD.basic_salary_npr, NEW.basic_salary_npr), NOW());
    END IF;
    IF NEW.manager_id IS DISTINCT FROM OLD.manager_id THEN
        INSERT INTO employee_employment_history
          (company_id, employee_id, event_type, manager_id_at_event, note, created_at)
        VALUES (NEW.company_id, NEW.id, 'manager_change', NEW.manager_id, 'Reporting manager changed.', NOW());
    END IF;
    IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
        INSERT INTO employee_employment_history
          (company_id, employee_id, event_type, department_id_at_event, note, created_at)
        VALUES (NEW.company_id, NEW.id, 'department_change', NEW.department_id, 'Department transfer.', NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_auto_log_employment_event
    AFTER UPDATE OF designation_id, basic_salary_npr, manager_id, department_id ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_auto_log_employment_event();

-- ================================================================
-- VIEWS
-- ================================================================

-- Profile completeness score (drives the Employee Profile "Overview" tab)
CREATE OR REPLACE VIEW v_employee_profile_completeness AS
SELECT
    e.id AS employee_id, e.employee_code, e.first_name, e.last_name,
    (e.personal_email IS NOT NULL AND e.citizenship_no IS NOT NULL)        AS personal_info_complete,
    (SELECT COUNT(*) > 0 FROM employee_family_members fm WHERE fm.employee_id = e.id AND NOT fm.is_deleted) AS has_family_details,
    (SELECT COUNT(*) >= 2 FROM employee_emergency_contacts ec WHERE ec.employee_id = e.id AND NOT ec.is_deleted) AS meets_emergency_contact_minimum,
    (SELECT COUNT(*) FROM employee_assets a WHERE a.employee_id = e.id AND a.status = 'assigned' AND NOT a.is_deleted) AS assets_assigned_count,
    (SELECT COUNT(*) FROM employee_employment_history h WHERE h.employee_id = e.id) AS employment_events_count,
    e.company_id
FROM employees e;

-- Emergency contact compliance (missing primary or below minimum count)
CREATE OR REPLACE VIEW v_emergency_contact_compliance AS
SELECT
    e.id AS employee_id, e.employee_code, e.first_name, e.last_name,
    COUNT(ec.id) AS contact_count,
    BOOL_OR(ec.is_primary) AS has_primary,
    MIN(ec.verification_due_date) AS earliest_verification_due,
    e.company_id
FROM employees e
LEFT JOIN employee_emergency_contacts ec ON ec.employee_id = e.id AND NOT ec.is_deleted
GROUP BY e.id, e.employee_code, e.first_name, e.last_name, e.company_id
HAVING COUNT(ec.id) < 2 OR NOT BOOL_OR(ec.is_primary);

-- Asset custody & audit dashboard
CREATE OR REPLACE VIEW v_asset_custody_dashboard AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    a.item_type, a.serial_number, a.value_npr, a.status,
    a.custody_receipt_signed, a.last_audited_date, a.audit_status,
    a.company_id
FROM employee_assets a
JOIN employees e ON a.employee_id = e.id
WHERE NOT a.is_deleted
ORDER BY a.audit_status, a.status;

-- Pending personal-info change approvals (HR action queue)
CREATE OR REPLACE VIEW v_pending_info_changes AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    icr.field_name, icr.old_value, icr.new_value, icr.requested_at,
    icr.company_id
FROM employee_info_change_requests icr
JOIN employees e ON icr.employee_id = e.id
WHERE icr.status = 'pending'
ORDER BY icr.requested_at ASC;

-- Family verification due (annual re-confirmation reminder)
CREATE OR REPLACE VIEW v_family_verification_due AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    fm.full_name AS family_member, fm.relationship, fm.verification_due_date,
    fm.company_id
FROM employee_family_members fm
JOIN employees e ON fm.employee_id = e.id
WHERE fm.verification_due_date <= CURRENT_DATE + INTERVAL '30 days' AND NOT fm.is_deleted
ORDER BY fm.verification_due_date ASC;
