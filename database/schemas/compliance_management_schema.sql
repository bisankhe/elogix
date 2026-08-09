-- ================================================================
-- FILE: database/schemas/compliance_management_schema.sql
-- NepHR Pro -- Compliance & Risk Management > Compliance Management
-- (6 pages: Labor Compliance, Statutory Compliance, Policy Compliance,
-- Audit Management, Annual Labour Audit, License Management)
--
-- Design note: this session's frontend pages already existed --
-- already well-built, already correctly cross-referencing real tables
-- (daily_attendance_records, safety_committee_inspections,
-- bonus_fund_tracking, hr_policies/hr_policy_acknowledgments) -- but
-- were never imported or routed in App.jsx, and NO database schema or
-- backend routes file existed for this module at all. This file closes
-- that second half of the gap.
--
-- THE CRITICAL FINDING: hr_policies_schema.sql already has
-- hr_policy_transaction_blocks with transaction_type literally
-- including 'salary' as a documented blockable type, and
-- hr_policy_acknowledgments.status already supports 'signed' -- but no
-- function ever actually CALLED that block. The brief's explicit
-- requirement -- "Each employee has to read and acknowledge all
-- assigned policies before getting first month salary" -- was
-- structurally anticipated but never wired up. fn_enforce_policy_gate
-- below is that missing trigger: it fires BEFORE INSERT on the
-- EXISTING payslips table, checks whether this is the employee's
-- FIRST payslip, and if so, verifies every is_mandatory policy
-- assigned to them shows status='signed' in hr_policy_acknowledgments
-- -- raising an exception (and logging to hr_policy_transaction_blocks)
-- if not. This is the one new enforcement mechanism this session adds;
-- everything else is read-only aggregation over tables that already exist.
--
-- License Management (Page 6) is the one page with a genuinely new
-- table -- no enterprise/work-permit license tracking existed
-- anywhere in the build until the frontend page was written, so this
-- schema provides the backing table it was always designed against.
--
--   - (NEW FUNCTION) fn_enforce_policy_gate -- the missing first-
--     salary enforcement trigger on the EXISTING payslips table
--   - business_licenses (genuinely new, backs the existing License
--     Management frontend page)
--
-- Nepal legal grounding: Section 80 (mandatory Annual Labour Audit,
-- 10+ workers, certified auditor, submitted to local Labour Office at
-- fiscal year-end); enterprise registration with the local Labour and
-- Employment Office; Work Permits for foreign nationals via the
-- Department of Labour; outsourcing-vendor license verification
-- (employer shares responsibility if the supplier lacks a valid
-- license); equal pay / non-discrimination as the foundational
-- standard any automated HR algorithm must respect; the brief's
-- explicit pre-salary policy-acknowledgment requirement.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- THE MISSING ENFORCEMENT: first-salary policy-acknowledgment gate
-- ================================================================
CREATE OR REPLACE FUNCTION fn_enforce_policy_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    is_first_payslip BOOLEAN;
    unsigned_count INT;
    unsigned_titles TEXT;
BEGIN
    -- Determine if this is the employee's very first payslip
    SELECT NOT EXISTS (
        SELECT 1 FROM payslips WHERE employee_id = NEW.employee_id AND id != NEW.id
    ) INTO is_first_payslip;

    IF is_first_payslip THEN
        -- Count mandatory policies still NOT signed for this employee
        SELECT COUNT(*), STRING_AGG(hp.title, ', ')
        INTO unsigned_count, unsigned_titles
        FROM hr_policies hp
        WHERE hp.is_mandatory = true AND hp.status = 'published'
          AND NOT EXISTS (
              SELECT 1 FROM hr_policy_acknowledgments hpa
              WHERE hpa.policy_id = hp.id AND hpa.employee_id = NEW.employee_id AND hpa.status = 'signed'
          );

        IF unsigned_count > 0 THEN
            -- Log the block to the EXISTING audit table before raising
            INSERT INTO hr_policy_transaction_blocks (tenant_id, employee_id, blocked_by, transaction_type, transaction_data, blocked_at)
            SELECT NEW.company_id, NEW.employee_id, hp.id, 'salary',
                   jsonb_build_object('payroll_run_batch_id', NEW.payroll_run_batch_id, 'pay_period', NEW.pay_period), NOW()
            FROM hr_policies hp
            WHERE hp.is_mandatory = true AND hp.status = 'published'
              AND NOT EXISTS (
                  SELECT 1 FROM hr_policy_acknowledgments hpa
                  WHERE hpa.policy_id = hp.id AND hpa.employee_id = NEW.employee_id AND hpa.status = 'signed'
              );

            RAISE EXCEPTION 'First salary blocked: % mandatory policy(ies) not yet acknowledged: %', unsigned_count, unsigned_titles;
        END IF;
    END IF;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_enforce_policy_gate
    BEFORE INSERT ON payslips
    FOR EACH ROW EXECUTE FUNCTION fn_enforce_policy_gate();

-- Auto-resolve the transaction block log the moment the last
-- mandatory policy gets signed, so the audit trail shows a clean
-- resolution rather than a permanently open block
CREATE OR REPLACE FUNCTION fn_resolve_policy_blocks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE remaining_unsigned INT;
BEGIN
    IF NEW.status = 'signed' AND OLD.status != 'signed' THEN
        SELECT COUNT(*) INTO remaining_unsigned
        FROM hr_policies hp
        WHERE hp.is_mandatory = true AND hp.status = 'published'
          AND NOT EXISTS (
              SELECT 1 FROM hr_policy_acknowledgments hpa
              WHERE hpa.policy_id = hp.id AND hpa.employee_id = NEW.employee_id AND hpa.status = 'signed'
          );

        IF remaining_unsigned = 0 THEN
            UPDATE hr_policy_transaction_blocks
               SET resolved_at = NOW(), resolved_by = NEW.employee_id
             WHERE employee_id = NEW.employee_id AND resolved_at IS NULL AND transaction_type = 'salary';

            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.tenant_id, 'hr_policy_acknowledgments', NEW.id, 'policy_gate_cleared', NEW.employee_id, 'direct_party',
               'All mandatory policies acknowledged -- your first salary is no longer blocked.', NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_resolve_policy_blocks
    AFTER UPDATE OF status ON hr_policy_acknowledgments
    FOR EACH ROW EXECUTE FUNCTION fn_resolve_policy_blocks();

-- ================================================================
-- PAGE 6: LICENSE MANAGEMENT -- genuinely new, backs the EXISTING
-- frontend page which was written against this exact shape
-- ================================================================
CREATE TABLE IF NOT EXISTS business_licenses (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    license_type               VARCHAR(50) NOT NULL,  -- enterprise_registration, work_permit, outsourcing_vendor_license
    license_name                   VARCHAR(200) NOT NULL,
    issuing_authority                   VARCHAR(200) NOT NULL,  -- e.g. 'Department of Labour', 'Local Labour and Employment Office'

    license_number                          VARCHAR(100),
    -- For work permits: the specific foreign-national employee this license covers
    related_employee_id                         UUID REFERENCES employees(id),
    -- For outsourcing vendor licenses: the specific procurement/staffing vendor
    related_vendor_name                             VARCHAR(200),

    issued_date                                     DATE NOT NULL,
    expires_date                                        DATE,

    status                                                  VARCHAR(20) DEFAULT 'active'
                                                            CHECK (status IN ('active','expired','pending_renewal','revoked')),

    document_url                                                VARCHAR(500),
    created_at                                                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bl_expiring ON business_licenses(expires_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bl_type     ON business_licenses(license_type);

-- Multi-tier expiry alerts (90/60/30 day), the same proven pattern
-- used for warranty tracking and certification tracking elsewhere
CREATE OR REPLACE FUNCTION fn_check_license_expiry()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE lic RECORD; hr_admin RECORD; days_left INT; tier TEXT;
BEGIN
    FOR lic IN SELECT * FROM business_licenses WHERE status = 'active' AND expires_date IS NOT NULL LOOP
        days_left := lic.expires_date - CURRENT_DATE;
        tier := CASE WHEN days_left <= 30 THEN '30-day' WHEN days_left <= 60 THEN '60-day' WHEN days_left <= 90 THEN '90-day' ELSE NULL END;
        IF tier IS NOT NULL THEN
            FOR hr_admin IN SELECT id FROM employees WHERE company_id = lic.company_id AND role = 'hr_manager' LOOP
                INSERT INTO transaction_notifications
                  (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
                VALUES
                  (lic.company_id, 'business_licenses', lic.id, 'license_expiring', hr_admin.id, 'direct_party',
                   format('%s alert: "%s" expires in %s days.', tier, lic.license_name, days_left), NOW());
            END LOOP;
        END IF;
    END LOOP;
END;$$;

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 3: Policy Compliance -- which employees are NOT yet cleared
-- for their first salary, surfaced directly for HR/Finance coordination
CREATE OR REPLACE VIEW v_first_salary_policy_gate_status AS
SELECT e.id AS employee_id, e.first_name, e.last_name, e.company_id,
    COUNT(*) FILTER (WHERE hpa.status != 'signed' OR hpa.status IS NULL) AS unsigned_mandatory_count,
    NOT EXISTS (SELECT 1 FROM payslips p WHERE p.employee_id = e.id) AS awaiting_first_payslip
FROM employees e
CROSS JOIN hr_policies hp
LEFT JOIN hr_policy_acknowledgments hpa ON hpa.policy_id = hp.id AND hpa.employee_id = e.id
WHERE hp.is_mandatory = true AND hp.status = 'published'
GROUP BY e.id, e.first_name, e.last_name, e.company_id;

-- Page 6: License dashboard with computed days-remaining
CREATE OR REPLACE VIEW v_license_dashboard AS
SELECT *,
    CASE WHEN expires_date IS NOT NULL THEN expires_date - CURRENT_DATE ELSE NULL END AS days_until_expiry
FROM business_licenses;
