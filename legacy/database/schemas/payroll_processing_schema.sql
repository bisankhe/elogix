-- ================================================================
-- FILE: database/schemas/payroll_processing_schema.sql
-- eLogix HRMS — Workforce Operations > Payroll & Compensation >
-- Payroll Processing Module (8 pages)
--
-- Design note: this is the EXECUTION layer on top of payroll_setup_schema.sql
-- (salary_structures, tax_slabs, allowance_types, deduction_types,
-- cash_advance_recovery) and vendor_finance_schema.sql (vendor_billing_records).
-- No setup/config tables are duplicated -- this file adds the per-cycle
-- transactional records: OT batches, bonuses, incentives, loans, salary
-- advances (distinct from cash_advance_recovery), and 3-way billing matches.
--
--   1. Automated Payroll      -> payroll_run_batches (wraps payroll_register)
--   2. Overtime Calculation   -> overtime_payroll_lines
--   3. Bonus Processing       -> bonus_payments
--   4. Incentive Processing   -> incentive_payments + incentive_tiers
--   5. Loan Management        -> employee_loans + loan_installments
--   6. Advance Salary         -> salary_advances (EWA-style, distinct from
--                                cash_advance_recovery's longer-window advances)
--   7. Tax & Compliance       -> compliance_alerts
--   8. Vendor Billing Payroll -> vendor_billing_3way_match (extends
--                                vendor_billing_records with matching logic)
--
-- Nepal Labour Act 2074 / Labour Rules 2075: OT 4hr/day-24hr/week at 1.5x;
-- Basic Salary >=60% of gross (Rule 77); Festival Allowance = 1 month
-- basic/year; deductions capped at 33% of gross; loan eligibility cap
-- 3 months basic salary; salary advance capped at 50% of net pay; TDS
-- deposited to IRD by 25th of following month; SSF employer 20%/employee
-- 11% of basic.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. AUTOMATED PAYROLL — pay-run batches (wraps payroll_register rows)
-- ================================================================
CREATE TABLE IF NOT EXISTS payroll_run_batches (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    pay_period                 VARCHAR(20) NOT NULL,  -- '2025-06'

    stage                          VARCHAR(20) DEFAULT 'attendance'
                                   CHECK (stage IN ('attendance','variable_pay','deductions','tax_billing','finalized')),
    total_employees                    INT DEFAULT 0,
    employees_processed                   INT DEFAULT 0,
    flagged_count                            INT DEFAULT 0,

    status                                       VARCHAR(20) DEFAULT 'in_progress'
                                                 CHECK (status IN ('in_progress','finalized','paid')),

    started_at                                      TIMESTAMPTZ DEFAULT NOW(),
    finalized_at                                        TIMESTAMPTZ,
    paid_at                                                TIMESTAMPTZ,

    UNIQUE (company_id, pay_period)
);

-- ================================================================
-- 2. OVERTIME CALCULATION (per-cycle OT lines, distinct from the
-- pre-approval overtime_requests table in overtime_monitoring_schema.sql --
-- this is the FINAL calculated payroll line after approval)
-- ================================================================
CREATE TABLE IF NOT EXISTS overtime_payroll_lines (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    payroll_run_batch_id        UUID    REFERENCES payroll_run_batches(id),

    scheduled_hours                NUMERIC(6,2) NOT NULL,
    worked_hours                      NUMERIC(6,2) NOT NULL,
    ot_hours                              NUMERIC(5,2) GENERATED ALWAYS AS (
                                          GREATEST(worked_hours - scheduled_hours, 0)
                                        ) STORED,

    weekly_ot_used_hours                       NUMERIC(5,2) DEFAULT 0,
    weekly_ot_cap_hours                           NUMERIC(5,2) DEFAULT 24,
    exceeds_weekly_cap                               BOOLEAN GENERATED ALWAYS AS (
                                                      weekly_ot_used_hours > weekly_ot_cap_hours
                                                    ) STORED,

    base_hourly_rate_npr                                NUMERIC(10,2) NOT NULL,
    ot_multiplier                                          NUMERIC(3,2) DEFAULT 1.5,
    ot_rate_npr                                               NUMERIC(10,2) GENERATED ALWAYS AS (
                                                               ROUND(base_hourly_rate_npr * ot_multiplier, 2)
                                                             ) STORED,
    ot_amount_npr                                                NUMERIC(12,2) GENERATED ALWAYS AS (
                                                                  ROUND(ot_hours * base_hourly_rate_npr * ot_multiplier, 2)
                                                                ) STORED,

    created_at                                                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. BONUS PROCESSING
-- ================================================================
CREATE TABLE IF NOT EXISTS bonus_payments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    payroll_run_batch_id        UUID    REFERENCES payroll_run_batches(id),

    bonus_type                     VARCHAR(100) NOT NULL,
    category                          VARCHAR(20) NOT NULL DEFAULT 'discretionary'
                                     CHECK (category IN ('discretionary','non_discretionary')),
    -- non_discretionary bonuses (e.g. festival allowance) legally must factor
    -- into the blended OT rate for the period -- flag used by payroll engine

    full_amount_npr                          NUMERIC(12,2) NOT NULL,
    proration_pct                               NUMERIC(5,2) DEFAULT 100,
    prorated_amount_npr                            NUMERIC(12,2) GENERATED ALWAYS AS (
                                                    ROUND(full_amount_npr * proration_pct / 100, 2)
                                                  ) STORED,

    basis_note                                        TEXT,
    is_statutory                                         BOOLEAN DEFAULT FALSE,  -- e.g. Festival Allowance

    status                                                   VARCHAR(20) DEFAULT 'pending'
                                                             CHECK (status IN ('pending','approved','paid')),
    approved_by                                                 UUID,
    created_at                                                     TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. INCENTIVE PROCESSING
-- ================================================================
CREATE TABLE IF NOT EXISTS incentive_tiers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    tier_label           VARCHAR(50) NOT NULL,
    sales_from_npr        NUMERIC(14,2) NOT NULL,
    sales_to_npr           NUMERIC(14,2),  -- NULL = unbounded top tier
    incentive_rate_pct       NUMERIC(5,2) NOT NULL,
    tier_order                INT NOT NULL,

    UNIQUE (company_id, tier_order)
);

CREATE TABLE IF NOT EXISTS incentive_payments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    payroll_run_batch_id        UUID    REFERENCES payroll_run_batches(id),

    sales_amount_npr               NUMERIC(14,2) DEFAULT 0,
    kpi_metric_text                   VARCHAR(200),  -- for non-sales-based incentives
    matched_tier_id                      UUID REFERENCES incentive_tiers(id),

    incentive_amount_npr                    NUMERIC(12,2) NOT NULL,
    is_taxable                                 BOOLEAN DEFAULT TRUE,
    factors_into_blended_ot_rate                  BOOLEAN DEFAULT TRUE,

    crm_synced                                       BOOLEAN DEFAULT FALSE,
    crm_sync_reference                                  VARCHAR(200),

    status                                                 VARCHAR(20) DEFAULT 'calculated'
                                                           CHECK (status IN ('pending_sync','calculated','paid')),
    created_at                                                TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. LOAN MANAGEMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_loans (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    loan_type                   VARCHAR(50) NOT NULL,
    principal_npr                  NUMERIC(12,2) NOT NULL,
    interest_pct                      NUMERIC(5,2) DEFAULT 0,
    tenure_months                        INT NOT NULL,

    -- Eligibility cap: 3 months basic salary (best-practice default, configurable)
    basic_salary_at_request_npr             NUMERIC(12,2),
    max_eligible_npr                           NUMERIC(12,2) GENERATED ALWAYS AS (
                                                basic_salary_at_request_npr * 3
                                              ) STORED,
    exceeds_eligibility_cap                       BOOLEAN GENERATED ALWAYS AS (
                                                  principal_npr > (basic_salary_at_request_npr * 3)
                                                ) STORED,

    emi_npr                                          NUMERIC(12,2) GENERATED ALWAYS AS (
                                                      ROUND((principal_npr * (1 + interest_pct/100)) / tenure_months, 2)
                                                    ) STORED,

    paid_installments                                       INT DEFAULT 0,
    total_paid_npr                                             NUMERIC(12,2) DEFAULT 0,
    remaining_balance_npr                                         NUMERIC(12,2) GENERATED ALWAYS AS (
                                                                   ROUND((principal_npr * (1 + interest_pct/100)) - total_paid_npr, 2)
                                                                 ) STORED,

    status                                                              VARCHAR(20) DEFAULT 'pending'
                                                                        CHECK (status IN ('pending','active','cleared','defaulted','exceeds_cap')),
    approved_by                                                            UUID,
    requested_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_installments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_loan_id    UUID NOT NULL REFERENCES employee_loans(id),
    company_id          UUID NOT NULL,

    pay_period            VARCHAR(20) NOT NULL,
    amount_npr               NUMERIC(12,2) NOT NULL,
    deducted_at                  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (employee_loan_id, pay_period)
);

-- ================================================================
-- 6. ADVANCE SALARY (EWA-style, distinct from cash_advance_recovery
-- which has a 1-month recovery window for non-payroll cash disbursements;
-- this is a draw against the NEXT payroll cycle specifically, capped at 50%)
-- ================================================================
CREATE TABLE IF NOT EXISTS salary_advances (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    expected_net_pay_npr        NUMERIC(12,2) NOT NULL,
    max_allowed_pct                 NUMERIC(5,2) DEFAULT 50,
    max_allowed_npr                    NUMERIC(12,2) GENERATED ALWAYS AS (
                                       ROUND(expected_net_pay_npr * max_allowed_pct / 100, 2)
                                     ) STORED,

    requested_npr                          NUMERIC(12,2) NOT NULL,
    exceeds_cap                               BOOLEAN GENERATED ALWAYS AS (
                                              requested_npr > (expected_net_pay_npr * max_allowed_pct / 100)
                                            ) STORED,

    reason                                        TEXT NOT NULL,
    deduction_pay_period                             VARCHAR(20),  -- always the NEXT cycle

    status                                              VARCHAR(20) DEFAULT 'pending'
                                                        CHECK (status IN ('pending','disbursed','rejected','recovered')),
    rejection_reason                                       TEXT,
    disbursed_at                                              TIMESTAMPTZ,
    recovered_at                                                 TIMESTAMPTZ,

    created_at                                                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                         TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 7. TAX & COMPLIANCE (real-time anomaly alerts, pre-paycheck)
-- ================================================================
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID REFERENCES employees(id),

    alert_type            VARCHAR(50) NOT NULL,  -- 'missing_pan','expiring_permit','ssf_enrollment_pending', etc.
    severity                VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
    detail_note               TEXT,

    blocks_payroll               BOOLEAN DEFAULT FALSE,  -- TRUE for e.g. missing PAN
    resolved                        BOOLEAN DEFAULT FALSE,
    resolved_at                        TIMESTAMPTZ,

    created_at                            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 8. VENDOR BILLING PAYROLL (3-way match, extends vendor_billing_records)
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_billing_3way_match (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_billing_record_id  UUID      NOT NULL REFERENCES vendor_billing_records(id),
    company_id             UUID         NOT NULL,

    contract_rate_npr           NUMERIC(10,2) NOT NULL,
    billed_rate_npr                NUMERIC(10,2) NOT NULL,
    delivery_log_verified              BOOLEAN DEFAULT FALSE,

    match_status                          VARCHAR(20) DEFAULT 'pending'
                                          CHECK (match_status IN ('pending','matched','discrepancy')),
    discrepancy_amount_npr                    NUMERIC(12,2) GENERATED ALWAYS AS (
                                               (billed_rate_npr - contract_rate_npr)
                                             ) STORED,
    discrepancy_note                              TEXT,

    payout_scheduled                                 BOOLEAN DEFAULT FALSE,
    payout_blocked_reason                               TEXT,

    checked_at                                             TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_prb_company       ON payroll_run_batches(company_id, pay_period);
CREATE INDEX IF NOT EXISTS idx_opl_employee          ON overtime_payroll_lines(employee_id);
CREATE INDEX IF NOT EXISTS idx_opl_exceeds_cap           ON overtime_payroll_lines(exceeds_weekly_cap) WHERE exceeds_weekly_cap;
CREATE INDEX IF NOT EXISTS idx_bp_employee                  ON bonus_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_bp_status                       ON bonus_payments(status);
CREATE INDEX IF NOT EXISTS idx_ip_employee                        ON incentive_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_el_employee                           ON employee_loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_el_status                                ON employee_loans(status);
CREATE INDEX IF NOT EXISTS idx_li_loan                                      ON loan_installments(employee_loan_id);
CREATE INDEX IF NOT EXISTS idx_sa_employee                                     ON salary_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_sa_status                                          ON salary_advances(status);
CREATE INDEX IF NOT EXISTS idx_ca_unresolved                                         ON compliance_alerts(resolved) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_ca_blocks                                                ON compliance_alerts(blocks_payroll) WHERE blocks_payroll;
CREATE INDEX IF NOT EXISTS idx_vbm_record                                                   ON vendor_billing_3way_match(vendor_billing_record_id);
CREATE INDEX IF NOT EXISTS idx_vbm_discrepancy                                                 ON vendor_billing_3way_match(match_status) WHERE match_status = 'discrepancy';

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_payroll_processing_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['employee_loans','salary_advances'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_payroll_processing_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Block loan approval if it exceeds the 3-month-basic eligibility cap
CREATE OR REPLACE FUNCTION fn_block_loan_cap_breach()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status = 'pending' AND NEW.exceeds_eligibility_cap THEN
        RAISE EXCEPTION 'Cannot approve: loan principal (%) exceeds the 3-month-basic eligibility cap (%).',
            NEW.principal_npr, NEW.max_eligible_npr;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_loan_cap
    BEFORE UPDATE OF status ON employee_loans
    FOR EACH ROW EXECUTE FUNCTION fn_block_loan_cap_breach();

-- Auto-apply loan installment: update paid_installments and total_paid_npr
CREATE OR REPLACE FUNCTION fn_apply_loan_installment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE employee_loans
       SET paid_installments = paid_installments + 1, total_paid_npr = total_paid_npr + NEW.amount_npr, updated_at = NOW()
     WHERE id = NEW.employee_loan_id;

    UPDATE employee_loans SET status = 'cleared' WHERE id = NEW.employee_loan_id AND remaining_balance_npr <= 0;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_loan_installment
    AFTER INSERT ON loan_installments
    FOR EACH ROW EXECUTE FUNCTION fn_apply_loan_installment();

-- Block salary advance disbursement if it exceeds the 50% cap
CREATE OR REPLACE FUNCTION fn_block_advance_cap_breach()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'disbursed' AND OLD.status = 'pending' AND NEW.exceeds_cap THEN
        RAISE EXCEPTION 'Cannot disburse: requested amount (%) exceeds the 50%% cap of expected net pay (%).',
            NEW.requested_npr, NEW.max_allowed_npr;
    END IF;
    IF NEW.status = 'disbursed' AND OLD.status = 'pending' THEN
        NEW.disbursed_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_advance_cap
    BEFORE UPDATE OF status ON salary_advances
    FOR EACH ROW EXECUTE FUNCTION fn_block_advance_cap_breach();

-- Auto-create a compliance alert if a high-severity blocking issue exists
-- when a payroll batch tries to advance stages
CREATE OR REPLACE FUNCTION fn_check_blocking_alerts_before_stage_advance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE blocking_count INT;
BEGIN
    IF NEW.stage = 'finalized' AND OLD.stage != 'finalized' THEN
        SELECT COUNT(*) INTO blocking_count FROM compliance_alerts
        WHERE company_id = NEW.company_id AND blocks_payroll AND NOT resolved;

        IF blocking_count > 0 THEN
            RAISE EXCEPTION 'Cannot finalize payroll: % unresolved blocking compliance alert(s) exist.', blocking_count;
        END IF;
        NEW.finalized_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_blocking_alerts
    BEFORE UPDATE OF stage ON payroll_run_batches
    FOR EACH ROW EXECUTE FUNCTION fn_check_blocking_alerts_before_stage_advance();

-- Auto-classify 3-way match status based on rate comparison + delivery verification
CREATE OR REPLACE FUNCTION fn_classify_3way_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.billed_rate_npr > NEW.contract_rate_npr OR NOT NEW.delivery_log_verified THEN
        NEW.match_status := 'discrepancy';
        NEW.discrepancy_note := CASE
            WHEN NEW.billed_rate_npr > NEW.contract_rate_npr THEN
                format('Billed rate (NPR %s) exceeds contract rate (NPR %s).', NEW.billed_rate_npr, NEW.contract_rate_npr)
            ELSE 'Delivery/attendance log not yet verified.' END;
        NEW.payout_blocked_reason := 'Held pending reconciliation -- 3-way match failed.';
    ELSE
        NEW.match_status := 'matched';
        NEW.payout_scheduled := TRUE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_classify_3way_match
    BEFORE INSERT OR UPDATE OF billed_rate_npr, delivery_log_verified ON vendor_billing_3way_match
    FOR EACH ROW EXECUTE FUNCTION fn_classify_3way_match();

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW v_payroll_run_pipeline AS
SELECT prb.*, ROUND(prb.employees_processed::NUMERIC / NULLIF(prb.total_employees,0) * 100, 1) AS pct_complete
FROM payroll_run_batches prb;

CREATE OR REPLACE VIEW v_overtime_calculation_batch AS
SELECT opl.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM overtime_payroll_lines opl
JOIN employees e ON opl.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;

CREATE OR REPLACE VIEW v_bonus_processing_dashboard AS
SELECT bp.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM bonus_payments bp
JOIN employees e ON bp.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;

CREATE OR REPLACE VIEW v_incentive_dashboard AS
SELECT ip.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name, it.tier_label
FROM incentive_payments ip
JOIN employees e ON ip.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN incentive_tiers it ON ip.matched_tier_id = it.id;

CREATE OR REPLACE VIEW v_loan_management_dashboard AS
SELECT el.*, e.employee_code, e.first_name, e.last_name
FROM employee_loans el
JOIN employees e ON el.employee_id = e.id;

CREATE OR REPLACE VIEW v_salary_advance_dashboard AS
SELECT sa.*, e.employee_code, e.first_name, e.last_name
FROM salary_advances sa
JOIN employees e ON sa.employee_id = e.id;

CREATE OR REPLACE VIEW v_compliance_alerts_active AS
SELECT ca.*, e.employee_code, e.first_name, e.last_name
FROM compliance_alerts ca
LEFT JOIN employees e ON ca.employee_id = e.id
WHERE NOT ca.resolved
ORDER BY ca.severity DESC, ca.created_at DESC;

CREATE OR REPLACE VIEW v_vendor_billing_3way_dashboard AS
SELECT vbm.*, vbr.bill_no, vbr.workers_billed, vbr.days_billed, vbr.gross_amount_npr, v.name AS vendor_name
FROM vendor_billing_3way_match vbm
JOIN vendor_billing_records vbr ON vbm.vendor_billing_record_id = vbr.id
JOIN outsource_vendors v ON vbr.vendor_id = v.id;
