-- ================================================================
-- FILE: database/schemas/settlement_documents_schema.sql
-- NepHR Pro — Offboarding > Settlement & Documents Module (3 pages)
--
-- Design note: exit_clearances (from exit_management_schema.sql) already
-- has summary F&F fields (ff_amount_npr, ff_frozen, unpaid_salary_npr,
-- leave_encashment_npr, overtime_pay_npr). This file adds the DETAILED
-- computation breakdown table needed for the full earnings/deductions
-- grid UI, plus the document generation tables for Experience and
-- Relieving Letters.
--
--   1. fnf_settlements (extends exit_clearances 1:1 with full computation)
--   2. experience_letters   (Nepal LA2074 Section 150 — strictly factual)
--   3. relieving_letters    (3-condition release gate, no-ransom policy)
--
-- Nepal Labour Act 2074: 15-day settlement deadline (penalty = continued
-- pay obligation), Section 150 mandatory factual experience certificate,
-- relieving letter never withheld over F&F amount disputes.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. FULL & FINAL SETTLEMENT (detailed computation, 1:1 with exit_clearances)
-- ================================================================
CREATE TABLE IF NOT EXISTS fnf_settlements (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    exit_clearance_id           UUID     UNIQUE REFERENCES exit_clearances(id),

    resignation_date               DATE,
    last_working_date                 DATE NOT NULL,

    -- Nepal LA2074: 15-day statutory deadline
    settlement_deadline                  DATE GENERATED ALWAYS AS (
                                           COALESCE(resignation_date, last_working_date) + INTERVAL '15 days'
                                         ) STORED,
    days_remaining                          INT GENERATED ALWAYS AS (
                                              (COALESCE(resignation_date, last_working_date) + INTERVAL '15 days')::DATE - CURRENT_DATE
                                            ) STORED,
    is_overdue                                  BOOLEAN GENERATED ALWAYS AS (
                                                  (COALESCE(resignation_date, last_working_date) + INTERVAL '15 days')::DATE < CURRENT_DATE
                                                ) STORED,

    clearance_complete                              BOOLEAN DEFAULT FALSE,

    -- EARNINGS breakdown (Total Pay equation components)
    unpaid_salary_npr                                  NUMERIC(12,2) DEFAULT 0,
    leave_encashment_npr                                  NUMERIC(12,2) DEFAULT 0,
    gratuity_npr                                             NUMERIC(12,2) DEFAULT 0,
    -- Nepal: 8.33% of basic remuneration per month of service, since day 1
    pf_employer_npr                                            NUMERIC(12,2) DEFAULT 0,
    bonus_npr                                                     NUMERIC(12,2) DEFAULT 0,
    overtime_npr                                                     NUMERIC(12,2) DEFAULT 0,
    total_earnings_npr                                                  NUMERIC(12,2) GENERATED ALWAYS AS (
                                                                          unpaid_salary_npr + leave_encashment_npr + gratuity_npr +
                                                                          pf_employer_npr + bonus_npr + overtime_npr
                                                                        ) STORED,

    -- DEDUCTIONS breakdown
    tds_npr                                                                NUMERIC(12,2) DEFAULT 0,
    advance_recovery_npr                                                      NUMERIC(12,2) DEFAULT 0,
    asset_damage_npr                                                             NUMERIC(12,2) DEFAULT 0,
    notice_shortfall_npr                                                            NUMERIC(12,2) DEFAULT 0,
    loan_recovery_npr                                                                  NUMERIC(12,2) DEFAULT 0,
    total_deductions_npr                                                                  NUMERIC(12,2) GENERATED ALWAYS AS (
                                                                                            tds_npr + advance_recovery_npr + asset_damage_npr +
                                                                                            notice_shortfall_npr + loan_recovery_npr
                                                                                          ) STORED,

    net_payable_npr                                                                          NUMERIC(12,2) GENERATED ALWAYS AS (
                                                                                                (unpaid_salary_npr + leave_encashment_npr + gratuity_npr +
                                                                                                 pf_employer_npr + bonus_npr + overtime_npr) -
                                                                                                (tds_npr + advance_recovery_npr + asset_damage_npr +
                                                                                                 notice_shortfall_npr + loan_recovery_npr)
                                                                                              ) STORED,

    -- Payout
    payout_method                                                                              VARCHAR(30) DEFAULT 'bank_transfer'
                                                                                                CHECK (payout_method IN ('bank_transfer','cheque','cash')),
    payout_status                                                                                  VARCHAR(20) DEFAULT 'pending'
                                                                                                    CHECK (payout_status IN ('pending','processing','processed','failed')),
    payout_date                                                                                       DATE,
    payout_reference                                                                                     VARCHAR(100),  -- bank transaction ID
    payslip_url                                                                                            VARCHAR(500),

    -- Nepal LA2074 Section 9-style penalty tracking: continued pay obligation if overdue
    penalty_triggered                                                                                        BOOLEAN DEFAULT FALSE,
    penalty_days_accrued                                                                                        INT DEFAULT 0,
    penalty_amount_npr                                                                                            NUMERIC(12,2) DEFAULT 0,

    status                                                                                                          VARCHAR(20) DEFAULT 'awaiting_clearance'
                                                                                                                    CHECK (status IN ('awaiting_clearance','computed','settled')),

    created_at                                                                                                        TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                                          TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                                                            UUID,
    is_deleted                                                                                                              BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 2. EXPERIENCE LETTER (Nepal LA2074 Section 150)
-- ================================================================
CREATE TABLE IF NOT EXISTS experience_letters (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    fnf_settlement_id            UUID    REFERENCES fnf_settlements(id),

    -- Requested by employee per LA2074 Section 150 (employer must comply on request)
    requested_date                  DATE DEFAULT CURRENT_DATE,
    requested_by_employee              BOOLEAN DEFAULT TRUE,

    -- Snapshot data (immutable once issued — factual only, no editorializing)
    join_date_snapshot                    DATE NOT NULL,
    last_working_date_snapshot               DATE NOT NULL,
    position_snapshot                           VARCHAR(200) NOT NULL,
    department_snapshot                            VARCHAR(200),
    tenure_display                                    VARCHAR(50),  -- e.g. "1 year 3 months"

    -- Optional, policy-permitted additions (never subjective/evaluative)
    core_responsibilities_summary                        TEXT,  -- factual duties only

    -- THE LEGAL GUARD: no negative/subjective content permitted
    contains_negative_remarks                                BOOLEAN DEFAULT FALSE,

    document_url                                                VARCHAR(500),
    digital_signature_applied                                      BOOLEAN DEFAULT FALSE,
    signed_by_employee_id                                             UUID,
    signed_by_name                                                       VARCHAR(200),

    status                                                                  VARCHAR(20) DEFAULT 'pending_request'
                                                                            CHECK (status IN ('pending_request','drafting','issued')),
    issued_date                                                               DATE,

    -- Export tracking
    exported_to_linkedin                                                        BOOLEAN DEFAULT FALSE,
    shared_with_verification_agency                                                BOOLEAN DEFAULT FALSE,

    created_at                                                                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                        TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                         BOOLEAN DEFAULT FALSE,

    -- THE CORE LEGAL GUARD: cannot issue with negative remarks (LA2074 §150)
    CONSTRAINT ck_experience_no_negative CHECK (
        status != 'issued' OR contains_negative_remarks = FALSE
    )
);

-- ================================================================
-- 3. RELIEVING LETTER (3-condition release gate)
-- ================================================================
CREATE TABLE IF NOT EXISTS relieving_letters (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    fnf_settlement_id            UUID    REFERENCES fnf_settlements(id),
    exit_clearance_id               UUID REFERENCES exit_clearances(id),

    last_working_date                  DATE NOT NULL,

    -- THE 3 RELEASE CONDITIONS (all must be TRUE before issuance)
    notice_period_completed               BOOLEAN DEFAULT FALSE,
    clearance_complete                       BOOLEAN DEFAULT FALSE,
    fnf_settled                                 BOOLEAN DEFAULT FALSE,

    all_conditions_met                             BOOLEAN GENERATED ALWAYS AS (
                                                     notice_period_completed AND clearance_complete AND fnf_settled
                                                   ) STORED,

    -- Withholding — ONLY for the 3 conditions above, NEVER for F&F amount disputes
    withholding_reason                                  TEXT,
    is_amount_dispute_only                                 BOOLEAN DEFAULT FALSE,
    -- if TRUE and someone tries to withhold based on this alone, app layer blocks it

    document_url                                              VARCHAR(500),
    digital_signature_applied                                    BOOLEAN DEFAULT FALSE,

    status                                                          VARCHAR(20) DEFAULT 'blocked'
                                                                    CHECK (status IN ('blocked','ready','issued')),
    issued_date                                                        DATE,
    issued_by                                                             UUID,

    created_at                                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                             TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                              BOOLEAN DEFAULT FALSE,

    -- THE NO-RANSOM GUARD: cannot block solely due to amount dispute
    CONSTRAINT ck_relieving_no_ransom CHECK (
        status != 'blocked' OR NOT is_amount_dispute_only
    )
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_fnf_employee          ON fnf_settlements(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_fnf_overdue             ON fnf_settlements(is_overdue) WHERE is_overdue;
CREATE INDEX IF NOT EXISTS idx_fnf_status                ON fnf_settlements(status);
CREATE INDEX IF NOT EXISTS idx_fnf_payout                  ON fnf_settlements(payout_status) WHERE payout_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_exp_employee                    ON experience_letters(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_exp_status                        ON experience_letters(status);

CREATE INDEX IF NOT EXISTS idx_rel_employee                        ON relieving_letters(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_rel_status                            ON relieving_letters(status);
CREATE INDEX IF NOT EXISTS idx_rel_blocked                              ON relieving_letters(status) WHERE status = 'blocked';

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_settlement_docs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['fnf_settlements','experience_letters','relieving_letters'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_settlement_docs_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Block payout processing until clearance complete (mirrors exit_clearances.ff_frozen)
CREATE OR REPLACE FUNCTION fn_fnf_clearance_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.payout_status = 'processed' AND NOT NEW.clearance_complete THEN
        RAISE EXCEPTION 'Cannot process payout: exit clearance not complete.';
    END IF;
    IF NEW.payout_status = 'processed' AND OLD.payout_status != 'processed' THEN
        NEW.status := 'settled';
        NEW.payout_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_fnf_clearance_gate
    BEFORE UPDATE OF payout_status ON fnf_settlements
    FOR EACH ROW EXECUTE FUNCTION fn_fnf_clearance_gate();

-- Nepal LA2074 penalty: auto-accrue continued-pay obligation if overdue
CREATE OR REPLACE FUNCTION fn_fnf_penalty_accrual()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE daily_rate NUMERIC;
BEGIN
    IF NEW.is_overdue AND NEW.status != 'settled' THEN
        SELECT (basic_salary_npr / 30) INTO daily_rate FROM employees WHERE id = NEW.employee_id;
        NEW.penalty_triggered := TRUE;
        NEW.penalty_days_accrued := ABS(NEW.days_remaining);
        NEW.penalty_amount_npr := ROUND(COALESCE(daily_rate, 0) * ABS(NEW.days_remaining), 2);
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_fnf_penalty
    BEFORE UPDATE ON fnf_settlements
    FOR EACH ROW EXECUTE FUNCTION fn_fnf_penalty_accrual();

-- Experience letter: blocks negative remarks at issuance (LA2074 Section 150)
CREATE OR REPLACE FUNCTION fn_experience_letter_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'issued' AND NEW.contains_negative_remarks THEN
        RAISE EXCEPTION 'Experience letter cannot contain negative remarks per Nepal Labour Act 2074 Section 150 — strictly factual content only.';
    END IF;
    IF NEW.status = 'issued' AND OLD.status != 'issued' THEN
        NEW.issued_date := CURRENT_DATE;
        NEW.digital_signature_applied := TRUE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_experience_letter_guard
    BEFORE UPDATE OF status ON experience_letters
    FOR EACH ROW EXECUTE FUNCTION fn_experience_letter_guard();

-- Relieving letter: auto-flip blocked -> ready when all 3 conditions met
CREATE OR REPLACE FUNCTION fn_relieving_auto_ready()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.all_conditions_met AND NEW.status = 'blocked' THEN
        NEW.status := 'ready';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_relieving_auto_ready
    BEFORE UPDATE OF notice_period_completed, clearance_complete, fnf_settled ON relieving_letters
    FOR EACH ROW EXECUTE FUNCTION fn_relieving_auto_ready();

-- No-ransom enforcement: cannot set status=blocked using only amount-dispute reasoning
CREATE OR REPLACE FUNCTION fn_relieving_no_ransom_guard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'blocked' AND NEW.is_amount_dispute_only THEN
        RAISE EXCEPTION 'Cannot withhold relieving letter solely due to F&F amount dispute. Disputes must be resolved separately per global best practice no-ransom policy.';
    END IF;
    IF NEW.status = 'issued' AND OLD.status != 'issued' THEN
        NEW.issued_date := CURRENT_DATE;
        NEW.digital_signature_applied := TRUE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_relieving_no_ransom
    BEFORE UPDATE OF status ON relieving_letters
    FOR EACH ROW EXECUTE FUNCTION fn_relieving_no_ransom_guard();

-- Auto-sync fnf_settlements totals back to parent exit_clearances summary fields
CREATE OR REPLACE FUNCTION fn_sync_exit_clearance_ff()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE exit_clearances
       SET ff_amount_npr = NEW.net_payable_npr,
           unpaid_salary_npr = NEW.unpaid_salary_npr,
           leave_encashment_npr = NEW.leave_encashment_npr,
           overtime_pay_npr = NEW.overtime_npr
     WHERE id = NEW.exit_clearance_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_sync_exit_clearance
    AFTER INSERT OR UPDATE ON fnf_settlements
    FOR EACH ROW EXECUTE FUNCTION fn_sync_exit_clearance_ff();

-- ================================================================
-- VIEWS
-- ================================================================

-- 15-day deadline compliance dashboard (urgent-first)
CREATE OR REPLACE VIEW v_fnf_deadline_compliance AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    f.last_working_date, f.settlement_deadline, f.days_remaining, f.is_overdue,
    f.net_payable_npr, f.payout_status, f.penalty_amount_npr,
    f.company_id
FROM fnf_settlements f
JOIN employees e ON f.employee_id = e.id
WHERE f.status != 'settled' AND NOT f.is_deleted
ORDER BY f.days_remaining ASC;

-- Full F&F computation grid (used directly by the frontend page)
CREATE OR REPLACE VIEW v_fnf_computation_grid AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    f.unpaid_salary_npr, f.leave_encashment_npr, f.gratuity_npr, f.pf_employer_npr,
    f.bonus_npr, f.overtime_npr, f.total_earnings_npr,
    f.tds_npr, f.advance_recovery_npr, f.asset_damage_npr, f.notice_shortfall_npr, f.loan_recovery_npr,
    f.total_deductions_npr, f.net_payable_npr,
    f.payout_status, f.status, f.company_id
FROM fnf_settlements f
JOIN employees e ON f.employee_id = e.id
WHERE NOT f.is_deleted;

-- Pending document requests (Experience + Relieving combined queue)
CREATE OR REPLACE VIEW v_pending_separation_documents AS
SELECT 'experience' AS doc_type, el.id, e.employee_code, e.first_name, e.last_name,
       el.requested_date, el.status, el.company_id
FROM experience_letters el JOIN employees e ON el.employee_id = e.id
WHERE el.status != 'issued' AND NOT el.is_deleted
UNION ALL
SELECT 'relieving' AS doc_type, rl.id, e.employee_code, e.first_name, e.last_name,
       rl.created_at::DATE, rl.status, rl.company_id
FROM relieving_letters rl JOIN employees e ON rl.employee_id = e.id
WHERE rl.status != 'issued' AND NOT rl.is_deleted
ORDER BY requested_date ASC;

-- Relieving letters blocked for legitimate reasons (excludes amount disputes)
CREATE OR REPLACE VIEW v_relieving_blocked_legitimate AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    rl.notice_period_completed, rl.clearance_complete, rl.fnf_settled,
    rl.withholding_reason, rl.company_id
FROM relieving_letters rl
JOIN employees e ON rl.employee_id = e.id
WHERE rl.status = 'blocked' AND NOT rl.is_amount_dispute_only AND NOT rl.is_deleted;
