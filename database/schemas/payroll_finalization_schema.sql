-- ================================================================
-- FILE: database/schemas/payroll_finalization_schema.sql
-- eLogix HRMS — Workforce Operations > Payroll & Compensation >
-- Payroll Finalization Module (4 pages)
--
-- Design note: Final Settlement (page 4) reuses fnf_settlements directly
-- (settlement_documents_schema.sql, built in the Offboarding module) --
-- NO new table is created for it. This schema adds only the genuinely
-- new pieces: the 4-level maker-checker approval chain that gates
-- payroll_run_batches finalization, the immutable payslip ledger, and
-- the bank transfer file generation/export log.
--
--   1. Payroll Approval    -> payroll_approval_chain + payroll_exceptions
--   2. Payslip Generation  -> payslips (immutable post-approval)
--   3. Bank Transfer File  -> bank_transfer_files + bank_transfer_file_lines
--   4. Final Settlement    -> reuses fnf_settlements (no new table)
--
-- Nepal Labour Act 2074: Sections 34-36 (gross salary determination),
-- Sections 7/19 of Labour Rules (internal audit, equal remuneration),
-- Section 37 (itemized payslip requirement), Rule 21 (formal banking
-- channel mandate), Sections 49/53/145 (final settlement: gratuity
-- 8.33%, leave encashment, severance 1 month/year for retrenchment).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. PAYROLL APPROVAL — 4-level maker-checker chain
-- ================================================================
CREATE TABLE IF NOT EXISTS payroll_approval_chain (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    payroll_run_batch_id      UUID       NOT NULL REFERENCES payroll_run_batches(id),

    approval_level               INT NOT NULL CHECK (approval_level BETWEEN 1 AND 4),
    -- 1=Payroll Processor (Maker), 2=HR Manager, 3=Finance Controller, 4=CFO (Final Signatory)
    role_label                      VARCHAR(50) NOT NULL,
    approver_employee_id               UUID REFERENCES employees(id),

    status                                 VARCHAR(20) DEFAULT 'pending'
                                           CHECK (status IN ('pending','in_progress','complete','rejected')),
    action_at                                 TIMESTAMPTZ,
    comments                                     TEXT,

    created_at                                      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (payroll_run_batch_id, approval_level)
);

CREATE TABLE IF NOT EXISTS payroll_exceptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    payroll_run_batch_id   UUID NOT NULL REFERENCES payroll_run_batches(id),
    employee_id         UUID REFERENCES employees(id),

    exception_type        VARCHAR(50) NOT NULL,  -- 'overtime_spike','new_hire_prorated','retroactive_adjustment','termination'
    severity                VARCHAR(10) DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
    detail_note               TEXT,

    reviewed                    BOOLEAN DEFAULT FALSE,
    reviewed_by                    UUID,
    reviewed_at                        TIMESTAMPTZ,

    created_at                            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. PAYSLIP GENERATION — immutable post-approval ledger
-- ================================================================
CREATE TABLE IF NOT EXISTS payslips (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    payroll_run_batch_id        UUID    NOT NULL REFERENCES payroll_run_batches(id),
    payroll_register_id            UUID REFERENCES payroll_register(id),

    pay_period                        VARCHAR(20) NOT NULL,

    gross_npr                            NUMERIC(12,2) NOT NULL,
    ssf_employee_npr                        NUMERIC(12,2) DEFAULT 0,
    tds_npr                                    NUMERIC(12,2) DEFAULT 0,
    other_deductions_npr                          NUMERIC(12,2) DEFAULT 0,
    net_npr                                          NUMERIC(12,2) GENERATED ALWAYS AS (
                                                      gross_npr - ssf_employee_npr - tds_npr - other_deductions_npr
                                                    ) STORED,

    ytd_gross_npr                                       NUMERIC(14,2) DEFAULT 0,
    ytd_net_npr                                            NUMERIC(14,2) DEFAULT 0,

    -- Immutability guard: once generated, line items cannot change
    is_locked                                                 BOOLEAN DEFAULT TRUE,
    generated_at                                                 TIMESTAMPTZ DEFAULT NOW(),

    published_to_ess                                                BOOLEAN DEFAULT FALSE,
    published_at                                                       TIMESTAMPTZ,
    pdf_url                                                               VARCHAR(500),

    UNIQUE (employee_id, pay_period)
);

-- ================================================================
-- 3. BANK TRANSFER FILE
-- ================================================================
CREATE TABLE IF NOT EXISTS bank_transfer_files (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    payroll_run_batch_id      UUID       REFERENCES payroll_run_batches(id),

    pay_group_label              VARCHAR(150),
    bank_name                       VARCHAR(150) NOT NULL,
    file_format                        VARCHAR(30) NOT NULL DEFAULT 'sif'
                                       CHECK (file_format IN ('sif','iso20022_xml','nacha','csv')),

    employee_count                         INT NOT NULL DEFAULT 0,
    total_amount_npr                          NUMERIC(14,2) NOT NULL DEFAULT 0,

    -- $0 test transaction verification (best practice from brief)
    test_transaction_sent                        BOOLEAN DEFAULT FALSE,
    test_transaction_verified                       BOOLEAN DEFAULT FALSE,

    file_url                                           VARCHAR(500),
    generated_by                                          UUID NOT NULL,  -- segregation-of-duties: must differ from payroll processor
    generated_at                                             TIMESTAMPTZ DEFAULT NOW(),

    status                                                      VARCHAR(20) DEFAULT 'draft'
                                                                CHECK (status IN ('draft','test_pending','generated','transmitted')),
    transmitted_at                                                 TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bank_transfer_file_lines (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_transfer_file_id  UUID NOT NULL REFERENCES bank_transfer_files(id),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),
    payslip_id          UUID REFERENCES payslips(id),

    account_number_masked  VARCHAR(50),  -- last 4 digits only, for audit display
    amount_npr               NUMERIC(12,2) NOT NULL,

    reconciliation_status      VARCHAR(20) DEFAULT 'pending'
                               CHECK (reconciliation_status IN ('pending','confirmed','bounced')),

    created_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_pac_batch          ON payroll_approval_chain(payroll_run_batch_id);
CREATE INDEX IF NOT EXISTS idx_pac_status            ON payroll_approval_chain(status);
CREATE INDEX IF NOT EXISTS idx_pe_batch                 ON payroll_exceptions(payroll_run_batch_id);
CREATE INDEX IF NOT EXISTS idx_pe_unreviewed                ON payroll_exceptions(reviewed) WHERE NOT reviewed;
CREATE INDEX IF NOT EXISTS idx_pe_severity                      ON payroll_exceptions(severity);

CREATE INDEX IF NOT EXISTS idx_pay_employee                        ON payslips(employee_id, pay_period);
CREATE INDEX IF NOT EXISTS idx_pay_batch                              ON payslips(payroll_run_batch_id);
CREATE INDEX IF NOT EXISTS idx_pay_unpublished                           ON payslips(published_to_ess) WHERE NOT published_to_ess;

CREATE INDEX IF NOT EXISTS idx_btf_batch                                     ON bank_transfer_files(payroll_run_batch_id);
CREATE INDEX IF NOT EXISTS idx_btf_status                                       ON bank_transfer_files(status);
CREATE INDEX IF NOT EXISTS idx_btfl_file                                            ON bank_transfer_file_lines(bank_transfer_file_id);
CREATE INDEX IF NOT EXISTS idx_btfl_bounced                                            ON bank_transfer_file_lines(reconciliation_status) WHERE reconciliation_status = 'bounced';

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-seed the 4-level approval chain when a payroll batch is created
CREATE OR REPLACE FUNCTION fn_seed_approval_chain()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO payroll_approval_chain (company_id, payroll_run_batch_id, approval_level, role_label, status, created_at)
    VALUES
      (NEW.company_id, NEW.id, 1, 'Payroll Processor (Maker)', 'in_progress', NOW()),
      (NEW.company_id, NEW.id, 2, 'HR Manager', 'pending', NOW()),
      (NEW.company_id, NEW.id, 3, 'Finance Controller', 'pending', NOW()),
      (NEW.company_id, NEW.id, 4, 'CFO (Final Signatory)', 'pending', NOW());
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_seed_approval_chain
    AFTER INSERT ON payroll_run_batches
    FOR EACH ROW EXECUTE FUNCTION fn_seed_approval_chain();

-- On level approval, activate the next level; on level 4 approval, finalize the batch
CREATE OR REPLACE FUNCTION fn_advance_approval_chain()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE unreviewed_high INT;
BEGIN
    IF NEW.status = 'complete' AND OLD.status = 'in_progress' THEN
        NEW.action_at := NOW();

        -- Block level 3+ approval if high-severity exceptions remain unreviewed
        IF NEW.approval_level >= 3 THEN
            SELECT COUNT(*) INTO unreviewed_high FROM payroll_exceptions
            WHERE payroll_run_batch_id = NEW.payroll_run_batch_id AND severity = 'high' AND NOT reviewed;
            IF unreviewed_high > 0 THEN
                RAISE EXCEPTION 'Cannot approve: % unreviewed high-severity exception(s) exist.', unreviewed_high;
            END IF;
        END IF;

        UPDATE payroll_approval_chain SET status = 'in_progress'
        WHERE payroll_run_batch_id = NEW.payroll_run_batch_id AND approval_level = NEW.approval_level + 1;

        IF NEW.approval_level = 4 THEN
            UPDATE payroll_run_batches SET stage = 'finalized', status = 'finalized', finalized_at = NOW()
            WHERE id = NEW.payroll_run_batch_id;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_advance_approval_chain
    BEFORE UPDATE OF status ON payroll_approval_chain
    FOR EACH ROW EXECUTE FUNCTION fn_advance_approval_chain();

-- Payslips are immutable: block any UPDATE to amount fields after generation
CREATE OR REPLACE FUNCTION fn_block_payslip_amount_edit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.is_locked AND (NEW.gross_npr != OLD.gross_npr OR NEW.net_npr IS DISTINCT FROM OLD.net_npr) THEN
        RAISE EXCEPTION 'Cannot modify a locked payslip. Generate a correction/reissue instead.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_payslip_edit
    BEFORE UPDATE ON payslips
    FOR EACH ROW EXECUTE FUNCTION fn_block_payslip_amount_edit();

-- Block bank file transmission until the $0 test transaction is verified
CREATE OR REPLACE FUNCTION fn_block_transmit_without_test()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'transmitted' AND NOT NEW.test_transaction_verified THEN
        RAISE EXCEPTION 'Cannot transmit: $0 test transaction has not been verified for this bank file.';
    END IF;
    IF NEW.status = 'transmitted' AND OLD.status != 'transmitted' THEN
        NEW.transmitted_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_transmit
    BEFORE UPDATE OF status ON bank_transfer_files
    FOR EACH ROW EXECUTE FUNCTION fn_block_transmit_without_test();

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW v_payroll_approval_status AS
SELECT pac.*, e.first_name, e.last_name, prb.pay_period
FROM payroll_approval_chain pac
LEFT JOIN employees e ON pac.approver_employee_id = e.id
JOIN payroll_run_batches prb ON pac.payroll_run_batch_id = prb.id
ORDER BY pac.approval_level;

CREATE OR REPLACE VIEW v_payroll_exceptions_queue AS
SELECT pe.*, e.employee_code, e.first_name, e.last_name
FROM payroll_exceptions pe
LEFT JOIN employees e ON pe.employee_id = e.id
WHERE NOT pe.reviewed
ORDER BY pe.severity DESC, pe.created_at ASC;

CREATE OR REPLACE VIEW v_payslip_dashboard AS
SELECT pay.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM payslips pay
JOIN employees e ON pay.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;

CREATE OR REPLACE VIEW v_bank_transfer_export_log AS
SELECT btf.*, prb.pay_period
FROM bank_transfer_files btf
LEFT JOIN payroll_run_batches prb ON btf.payroll_run_batch_id = prb.id
ORDER BY btf.generated_at DESC;

-- Bridges to the EXISTING fnf_settlements table for the payroll-side
-- Final Settlement dashboard (no new table -- pure read integration)
CREATE OR REPLACE VIEW v_final_settlement_payroll_view AS
SELECT
    fs.*, e.employee_code, e.first_name, e.last_name
FROM fnf_settlements fs
JOIN employees e ON fs.employee_id = e.id
ORDER BY fs.is_overdue DESC, fs.days_remaining ASC;
