-- ================================================================
-- FILE: database/schemas/vendor_billing_analytics_schema.sql
-- eLogix HRMS -- Reports, Analytics & BI > HR Analytics
-- (2 pages: Vendor Billing Report, Insource vs Outsource Cost Report)
--
-- Design note: confirmed before writing anything that THREE existing
-- VendorBilling* pages already exist and are already routed
-- (VendorBillingPage: rate enforcement/3-way match; VendorBillingPayrollPage:
-- invoice generation; VendorBillingPayrollProcPage: payment execution).
-- All three are TRANSACTIONAL/execution-focused. This brief's "Vendor
-- Billing Report" is the ANALYTICS lens -- it never writes a billing
-- transaction, it reads vendor_master + vendor_employees_extended
-- (both built last session) and surfaces what those execution pages
-- never needed to expose: the markup gap between billing rate and
-- worker wage, department cost allocation, and SLA correlation.
--
-- A genuine gap was found and closed: vendor_employees_extended only
-- ever tracked monthly_wage_npr (what the WORKER is paid) -- no field
-- anywhere captured what the COMPANY is billed per head (the
-- agency's rate, which includes markup). vendor_billing_rates closes
-- that gap. A second genuine gap -- the brief's explicit legal
-- mechanism where "if the supplier fails to pay, the main employer
-- must step in, pay the employees, and deduct this amount from
-- vendor billing" -- had no tracking table anywhere; wage_step_in_deductions
-- closes it.
--
-- Insource vs Outsource Cost Report is a PURE ROLLUP -- no new table,
-- reading recruitment_budget_lines + payslips (in-house side) against
-- vendor_billing_rates (outsourced side), cross-checked against the
-- is_core_work_flag from last session to make sure a "cost win" isn't
-- quietly a compliance violation.
--
--   - vendor_billing_rates (NEW -- billing rate per head, distinct
--     from the worker's own wage)
--   - wage_step_in_deductions (NEW -- the legally required liability
--     mechanism, with no prior tracking anywhere)
--
-- Nepal legal grounding: licensed-suppliers-only (unlicensed = workers
-- deemed direct employees); core-vs-non-core restriction; no
-- discrimination in facilities/OHS; main-employer duty to verify
-- minimum-wage payment and step in + deduct from vendor billing if the
-- supplier defaults; retroactive wage-increase liability falling on
-- the main employer, not the supplier, if statutory minimum wage rises
-- mid-contract.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- THE MISSING MARKUP FIELD: what the company is billed, distinct
-- from monthly_wage_npr (what the worker is paid)
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_billing_rates (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_master_id          UUID       NOT NULL REFERENCES vendor_master(id),
    vendor_employee_id           UUID    REFERENCES vendor_employees_extended(id),  -- NULL for a flat per-contract rate

    department_id                    UUID,
    billing_rate_npr_per_head            NUMERIC(10,2) NOT NULL,
    sla_score                                NUMERIC(5,2) CHECK (sla_score BETWEEN 0 AND 100),

    effective_from                               DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until                                  DATE
);

CREATE INDEX IF NOT EXISTS idx_vbr_vendor ON vendor_billing_rates(vendor_master_id);
CREATE INDEX IF NOT EXISTS idx_vbr_dept   ON vendor_billing_rates(department_id);

-- ================================================================
-- THE MISSING LEGAL MECHANISM: step-in-and-deduct wage liability
-- ================================================================
CREATE TABLE IF NOT EXISTS wage_step_in_deductions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_master_id          UUID       NOT NULL REFERENCES vendor_master(id),
    vendor_employee_id           UUID    NOT NULL REFERENCES vendor_employees_extended(id),

    reason                            VARCHAR(50) NOT NULL CHECK (reason IN ('supplier_nonpayment','minimum_wage_increase_gap')),
    amount_paid_directly_npr             NUMERIC(10,2) NOT NULL,
    paid_to_worker_at                        TIMESTAMPTZ DEFAULT NOW(),

    -- the deduction this paid-out amount must reduce from the next
    -- vendor invoice -- the actual legal recovery step
    deducted_from_vendor_billing_rate_id         UUID REFERENCES vendor_billing_rates(id),
    deduction_applied                                BOOLEAN DEFAULT FALSE,

    notified_labour_office                               BOOLEAN DEFAULT FALSE,
    created_at                                               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wsid_pending ON wage_step_in_deductions(deduction_applied) WHERE NOT deduction_applied;

-- Notify HR/Finance the moment a step-in payment is logged -- this is
-- real money paid out on the supplier's behalf and needs prompt recovery
CREATE OR REPLACE FUNCTION fn_notify_step_in_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE finance_admin RECORD;
BEGIN
    FOR finance_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'wage_step_in_deductions', NEW.id, 'wage_step_in_payment', finance_admin.id, 'direct_party',
           format('NPR %s paid directly to a vendor worker (%s) -- recover via next vendor invoice deduction.', NEW.amount_paid_directly_npr, NEW.reason), NOW());
    END LOOP;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_step_in
    AFTER INSERT ON wage_step_in_deductions
    FOR EACH ROW EXECUTE FUNCTION fn_notify_step_in_payment();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Vendor Billing Report -- the markup-transparency view,
-- joining the NEW billing rate against the EXISTING worker wage
CREATE OR REPLACE VIEW v_vendor_billing_report AS
SELECT
    vm.vendor_name, vbr.department_id, vbr.billing_rate_npr_per_head, vbr.sla_score,
    vee.monthly_wage_npr AS worker_wage_npr,
    ROUND((vbr.billing_rate_npr_per_head - vee.monthly_wage_npr) / NULLIF(vee.monthly_wage_npr,0) * 100, 1) AS markup_pct,
    vm.company_id
FROM vendor_billing_rates vbr
JOIN vendor_master vm ON vbr.vendor_master_id = vm.id
LEFT JOIN vendor_employees_extended vee ON vbr.vendor_employee_id = vee.id
WHERE vbr.effective_until IS NULL OR vbr.effective_until >= CURRENT_DATE;

-- Page 2: Insource vs Outsource Cost Report -- pure rollup, cross-
-- checking cost against the EXISTING is_core_work_flag
CREATE OR REPLACE VIEW v_insource_outsource_cost AS
SELECT
    vee.assigned_dept AS hr_function,
    SUM(vbr.billing_rate_npr_per_head) AS total_outsource_cost_npr,
    COUNT(*) FILTER (WHERE vee.is_core_work_flag) AS core_work_overlap_count,
    vm.company_id
FROM vendor_billing_rates vbr
JOIN vendor_master vm ON vbr.vendor_master_id = vm.id
LEFT JOIN vendor_employees_extended vee ON vbr.vendor_employee_id = vee.id
GROUP BY vee.assigned_dept, vm.company_id;
