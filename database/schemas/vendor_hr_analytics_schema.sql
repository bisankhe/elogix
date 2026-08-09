-- ================================================================
-- FILE: database/schemas/vendor_hr_analytics_schema.sql
-- NepHR Pro -- Reports, Analytics & BI > HR Analytics
-- (2 pages: Vendor-wise Headcount, Outsource Attendance Report)
--
-- Design note: both pages are PURE AGGREGATION over the EXISTING
-- vendor_employees_extended and vendor_attendance_extended tables
-- (vendor_employee_schema.sql) -- which already carry explicit
-- "Nepal LA2074 Section 64 compliance" columns (id_verified,
-- bg_verified, ssf_paid, insurance_active, min_wage_ok). Neither page
-- gets a duplicate worker registry or a second attendance-capture
-- system. Genuinely distinct from the EXISTING VendorBillingPage /
-- VendorBillingPayrollPage / VendorBillingPayrollProcPage (all three
-- are invoicing/payment execution) -- this module is headcount and
-- compliance VISIBILITY, not billing.
--
-- TWO genuine gaps were confirmed before writing this file: no
-- standalone vendor/staffing-agency MASTER table exists anywhere
-- (vendor_id is referenced loosely, without an FK target, in the
-- original table) and service_category has no core-vs-non-core
-- boolean classification, despite that distinction being legally
-- load-bearing under the brief's "core works cannot be outsourced"
-- requirement. Both gaps are closed here via ALTER TABLE rather than
-- a schema rebuild, since vendor_employees_extended is already in
-- active use by the Vendor Billing pages and Vendor Management.
--
--   - vendor_master (NEW -- the missing standalone registry)
--   - (ALTER) vendor_employees_extended: add is_core_work_flag,
--     vendor_master_id (optional FK, backfillable)
--
-- Nepal legal grounding: "main employer" liability under LA2074;
-- core-vs-non-core work restriction (Nepal Gazette-specified support
-- services only); licensed-supplier-only requirement; 10+ worker
-- threshold (including outsourced staff) triggering Labor Relations
-- Committee / Collective Bargaining Committee formation; mandatory
-- attendance/personal-detail recordkeeping for outsourced workers,
-- equal facilities/OHS-committee inclusion regardless of wage
-- differences; main-employer duty to verify and report minimum-wage
-- violations to the local Labour Office.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- THE MISSING VENDOR MASTER REGISTRY
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_master (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_name                VARCHAR(200) NOT NULL,

    -- the legally required check: a valid, government-issued Labour
    -- Supply License, and the authorized scope of work it covers
    labour_supply_license_no       VARCHAR(100),
    license_valid_until                 DATE,
    authorized_service_scope                VARCHAR(300),  -- e.g. 'Security, Cleaning, Reception' per Nepal Gazette

    contact_info                                TEXT,
    created_at                                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vm_license_expiring ON vendor_master(license_valid_until);

-- Extend the EXISTING vendor_employees_extended -- a backfillable FK
-- to the new master registry, plus the core-vs-non-core flag the
-- brief's legal requirement genuinely needs and never had
ALTER TABLE vendor_employees_extended ADD COLUMN IF NOT EXISTS vendor_master_id UUID REFERENCES vendor_master(id);
ALTER TABLE vendor_employees_extended ADD COLUMN IF NOT EXISTS is_core_work_flag BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vee_core_work ON vendor_employees_extended(is_core_work_flag) WHERE is_core_work_flag;

-- Auto-flag + notify HR the moment a vendor employee's service
-- category is marked as overlapping core business functions
CREATE OR REPLACE FUNCTION fn_flag_core_work_outsourcing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE hr_admin RECORD;
BEGIN
    IF NEW.is_core_work_flag AND (OLD.is_core_work_flag IS DISTINCT FROM NEW.is_core_work_flag) THEN
        FOR hr_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'vendor_employees_extended', NEW.id, 'core_work_outsourcing_risk', hr_admin.id, 'direct_party',
               format('Vendor employee "%s" (%s) is flagged for core-work overlap -- legal review recommended.', NEW.name, NEW.service_category), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_flag_core_work
    AFTER INSERT OR UPDATE OF is_core_work_flag ON vendor_employees_extended
    FOR EACH ROW EXECUTE FUNCTION fn_flag_core_work_outsourcing();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Vendor-wise Headcount -- pure rollup, joining the EXISTING
-- compliance columns with the NEW vendor_master license check
CREATE OR REPLACE VIEW v_vendor_wise_headcount AS
SELECT
    vm.vendor_name, vm.license_valid_until, vm.authorized_service_scope, vm.company_id,
    COUNT(vee.id) AS headcount,
    COUNT(*) FILTER (WHERE vee.is_core_work_flag) AS core_work_flag_count,
    COUNT(*) FILTER (WHERE NOT vee.ssf_paid) AS ssf_noncompliant_count,
    COUNT(*) FILTER (WHERE NOT vee.insurance_active) AS uninsured_count,
    COUNT(*) FILTER (WHERE NOT vee.min_wage_ok) AS minimum_wage_violation_count,
    MIN(vee.contract_end) AS earliest_contract_renewal
FROM vendor_master vm
LEFT JOIN vendor_employees_extended vee ON vee.vendor_master_id = vm.id
GROUP BY vm.vendor_name, vm.license_valid_until, vm.authorized_service_scope, vm.company_id;

-- Page 2: Outsource Attendance Report -- pure aggregation over the
-- EXISTING vendor_attendance_extended, compared against internal rates
CREATE OR REPLACE VIEW v_outsource_attendance_summary AS
SELECT
    vee.assigned_dept, vee.company_id,
    ROUND(COUNT(*) FILTER (WHERE vae.status = 'present')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS outsourced_attendance_rate_pct,
    ROUND(AVG(vae.late_minutes), 1) AS avg_late_minutes,
    SUM(vae.overtime_hours) AS total_overtime_hours
FROM vendor_attendance_extended vae
JOIN vendor_employees_extended vee ON vae.vendor_employee_id = vee.id
WHERE vae.attendance_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY vee.assigned_dept, vee.company_id;

-- Exception list: tardiness/unexcused absences worth a manual review,
-- the brief's explicit "Exception Management Module" requirement
CREATE OR REPLACE VIEW v_outsource_attendance_exceptions AS
SELECT vee.name, vee.vendor_master_id, vm.vendor_name, vae.company_id,
    COUNT(*) FILTER (WHERE vae.status = 'absent') AS unexcused_absences_30d,
    ROUND(AVG(vae.late_minutes), 1) AS avg_late_minutes_30d
FROM vendor_attendance_extended vae
JOIN vendor_employees_extended vee ON vae.vendor_employee_id = vee.id
LEFT JOIN vendor_master vm ON vee.vendor_master_id = vm.id
WHERE vae.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY vee.name, vee.vendor_master_id, vm.vendor_name, vae.company_id
HAVING COUNT(*) FILTER (WHERE vae.status = 'absent') >= 3 OR AVG(vae.late_minutes) > 15;
