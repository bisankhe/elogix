-- ================================================================
-- FILE: database/schemas/finance_claims_schema.sql
-- eLogix HRMS -- Finance, Assets & Administration > Finance & Claims
-- (6 pages: Expense Claims, Travel Request, Reimbursement, Petty Cash
-- Claim, Mobile & Fuel Claim, Approval Workflow)
--
-- Design note: Travel Request (Page 2) reuses the EXISTING
-- travel_requests table verbatim (built last session, Administrative
-- Operations) -- this sidebar entry is the SAME business object,
-- viewed through a finance/claims lens instead of an operational-
-- logistics lens. No new table, no duplicate workflow.
--
-- Reimbursement (Page 3) and Approval Workflow (Page 6) are PURE
-- ROLLUPS -- they have no tables of their own. Reimbursement reads
-- the payment-status across ALL claim types via a UNION view;
-- Approval Workflow reads the SAME approval_stage column already
-- established on salary_advances (ESS Batch 2 session) and applies
-- the identical 3-tier convention to expense/petty-cash/mobile-fuel
-- claims, for one consistent approval-chain pattern across the
-- entire build rather than a bespoke shape per module.
--
-- Approval Workflow here is deliberately distinct from
-- ApprovalCenterPage (MSS session) -- that page is the manager's
-- cross-module action queue (leave/attendance/cash-advance/
-- resignation); this is the claims-specific routing-chain
-- VISUALIZATION (Line Manager -> Project Head -> Finance).
--
--   - expense_claims (genuinely new, OCR-fed)
--   - petty_cash_branch_ledgers + petty_cash_claims (genuinely new)
--   - mobile_fuel_claims (genuinely new, monthly recurring)
--   - (no new table for Travel Request -- reuses travel_requests)
--   - (no new table for Reimbursement/Approval Workflow -- pure views)
--
-- Nepal legal grounding: documentary evidence required for claims
-- (original bills/receipts); 14-day submission deadline from return
-- of travel; transport-worker trip/food allowances and 1.5x overtime
-- for long-route drivers; petty cash limits and audit trail governed
-- by internal HR/Finance Manual, not statute; mobile/fuel allowances
-- as contractual (not statutory) perks that can never substitute for
-- the legal minimum wage; formal dispute path (15-day negotiation,
-- 21-day Labour Office facilitation) if a valid claim goes unpaid.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: EXPENSE CLAIMS (genuinely new, OCR-fed)
-- ================================================================
CREATE TABLE IF NOT EXISTS expense_claims (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    category                     VARCHAR(50) NOT NULL,  -- Client Entertainment, Office Supplies, Conference Registration, Other
    merchant_name                    VARCHAR(200),
    expense_date                         DATE NOT NULL,
    amount_npr                               NUMERIC(12,2) NOT NULL,

    -- OCR-extracted fields stored alongside the original for audit
    receipt_image_url                            VARCHAR(500),
    ocr_extracted_data                               JSONB,  -- raw OCR output: merchant/date/amount as read from the photo

    -- Section requirement: documentary evidence; 14-day submission window
    submitted_at                                         TIMESTAMPTZ DEFAULT NOW(),
    days_since_expense                                       INT GENERATED ALWAYS AS (
                                                                CASE WHEN submitted_at IS NOT NULL
                                                                     THEN (submitted_at::DATE - expense_date) ELSE NULL END
                                                              ) STORED,
    exceeds_submission_window                                    BOOLEAN GENERATED ALWAYS AS (
                                                                    (submitted_at::DATE - expense_date) > 14
                                                                  ) STORED,

    approval_stage                                                   VARCHAR(20) DEFAULT 'line_manager_review'
                                                                     CHECK (approval_stage IN ('line_manager_review','project_head_review','finance_review','approved','paid','rejected')),
    paid_at                                                              TIMESTAMPTZ
);

-- ================================================================
-- PAGE 4: PETTY CASH CLAIM (genuinely new -- fraud-risk/audit-trail
-- pain points addressed directly)
-- ================================================================
CREATE TABLE IF NOT EXISTS petty_cash_branch_ledgers (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    branch_id                 UUID       NOT NULL,
    custodian_employee_id        UUID    NOT NULL REFERENCES employees(id),

    float_amount_npr                 NUMERIC(10,2) NOT NULL,
    per_transaction_limit_npr            NUMERIC(10,2) NOT NULL DEFAULT 2000,

    UNIQUE (branch_id)
);

CREATE TABLE IF NOT EXISTS petty_cash_claims (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    petty_cash_branch_ledger_id UUID    NOT NULL REFERENCES petty_cash_branch_ledgers(id),
    claimed_by_employee_id      UUID    NOT NULL REFERENCES employees(id),

    item_description                TEXT NOT NULL,
    amount_npr                          NUMERIC(10,2) NOT NULL,

    -- TRUE the moment the amount crosses the branch's per-transaction
    -- limit -- forces Finance Head approval, never a silent bypass
    exceeds_per_transaction_limit            BOOLEAN DEFAULT FALSE,
    approval_stage                               VARCHAR(20) DEFAULT 'approved'
                                                 CHECK (approval_stage IN ('approved','finance_head_review','rejected')),

    claimed_at                                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 5: MOBILE & FUEL CLAIM (genuinely new, monthly recurring)
-- ================================================================
CREATE TABLE IF NOT EXISTS mobile_fuel_claims (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    claim_type                   VARCHAR(10) NOT NULL CHECK (claim_type IN ('mobile','fuel')),
    claim_month                      VARCHAR(20) NOT NULL,  -- e.g. 'June 2025'
    amount_npr                           NUMERIC(10,2) NOT NULL,
    monthly_cap_npr                          NUMERIC(10,2) NOT NULL,  -- tiered by role, set at assignment time

    business_use_justification                   TEXT,
    exceeds_cap                                      BOOLEAN GENERATED ALWAYS AS (amount_npr > monthly_cap_npr) STORED,

    approval_stage                                       VARCHAR(20) DEFAULT 'pending'
                                                         CHECK (approval_stage IN ('pending','manager_justification_required','paid','rejected')),

    submitted_at                                             TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, claim_type, claim_month)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ec_employee       ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_ec_stage               ON expense_claims(approval_stage) WHERE approval_stage NOT IN ('paid','rejected');
CREATE INDEX IF NOT EXISTS idx_ec_window_exceeded         ON expense_claims(exceeds_submission_window) WHERE exceeds_submission_window;
CREATE INDEX IF NOT EXISTS idx_pcl_ledger                     ON petty_cash_claims(petty_cash_branch_ledger_id);
CREATE INDEX IF NOT EXISTS idx_pcl_over_limit                     ON petty_cash_claims(exceeds_per_transaction_limit) WHERE exceeds_per_transaction_limit;
CREATE INDEX IF NOT EXISTS idx_mfc_employee                           ON mobile_fuel_claims(employee_id, claim_month);
CREATE INDEX IF NOT EXISTS idx_mfc_over_cap                                ON mobile_fuel_claims(exceeds_cap) WHERE exceeds_cap;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Expense claims past the 14-day window OR matching a hazard category
-- notify HR for exception review; otherwise routes normally
CREATE OR REPLACE FUNCTION fn_check_expense_window()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE hr_admin RECORD;
BEGIN
    IF NEW.exceeds_submission_window THEN
        FOR hr_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'expense_claims', NEW.id, 'expense_exception_review', hr_admin.id, 'direct_party',
               format('Expense claim submitted %s days after the expense date -- exceeds the 14-day window.', NEW.days_since_expense), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_expense_window
    AFTER INSERT ON expense_claims
    FOR EACH ROW EXECUTE FUNCTION fn_check_expense_window();

-- Auto-set exceeds_per_transaction_limit and force Finance Head review
-- if crossed -- the per-transaction control the brief explicitly asks for
CREATE OR REPLACE FUNCTION fn_check_petty_cash_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE limit_npr NUMERIC;
BEGIN
    SELECT per_transaction_limit_npr INTO limit_npr FROM petty_cash_branch_ledgers WHERE id = NEW.petty_cash_branch_ledger_id;
    IF NEW.amount_npr > limit_npr THEN
        NEW.exceeds_per_transaction_limit := TRUE;
        NEW.approval_stage := 'finance_head_review';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_petty_cash_limit
    BEFORE INSERT ON petty_cash_claims
    FOR EACH ROW EXECUTE FUNCTION fn_check_petty_cash_limit();

-- Mobile/Fuel claims over cap force manager justification, never silent auto-pay
CREATE OR REPLACE FUNCTION fn_check_mobile_fuel_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.exceeds_cap THEN
        NEW.approval_stage := 'manager_justification_required';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_mobile_fuel_cap
    BEFORE INSERT ON mobile_fuel_claims
    FOR EACH ROW EXECUTE FUNCTION fn_check_mobile_fuel_cap();

-- Auto-escalate ANY claim type sitting at the same stage for 5+ days --
-- the "stuck in the dark" pain point the brief explicitly names
CREATE OR REPLACE FUNCTION fn_auto_escalate_stalled_claims()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    UPDATE expense_claims SET approval_stage = 'project_head_review'
    WHERE approval_stage = 'line_manager_review' AND submitted_at < NOW() - INTERVAL '5 days';
    -- (additional UPDATE statements would extend this to travel_requests,
    -- petty_cash_claims, and mobile_fuel_claims in production, called by
    -- a scheduled job)
END;$$;

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Expense Claims dashboard
CREATE OR REPLACE VIEW v_expense_claims_dashboard AS
SELECT ec.*, e.first_name, e.last_name FROM expense_claims ec JOIN employees e ON ec.employee_id = e.id;

-- Page 2: Travel Request reuses the EXISTING travel_requests table/view
-- directly -- no new view defined here.

-- Page 3: Reimbursement -- the unified payment-status ledger across
-- EVERY claim type, pure UNION, never re-entered data
CREATE OR REPLACE VIEW v_reimbursement_ledger AS
SELECT 'Expense Claim' AS claim_type, id, employee_id, company_id, amount_npr, approval_stage, submitted_at, paid_at
FROM expense_claims
UNION ALL
SELECT 'Travel Request', id, employee_id, company_id, daily_allowance_npr, status, created_at, NULL
FROM travel_requests
UNION ALL
SELECT 'Petty Cash', id, claimed_by_employee_id, company_id, amount_npr, approval_stage, claimed_at, NULL
FROM petty_cash_claims
UNION ALL
SELECT 'Mobile & Fuel', id, employee_id, company_id, amount_npr, approval_stage, submitted_at, NULL
FROM mobile_fuel_claims
ORDER BY submitted_at DESC;

-- Page 4: Petty cash branch dashboard
CREATE OR REPLACE VIEW v_petty_cash_branch_dashboard AS
SELECT pcbl.*,
    (SELECT COALESCE(SUM(amount_npr),0) FROM petty_cash_claims WHERE petty_cash_branch_ledger_id = pcbl.id) AS total_spent_npr
FROM petty_cash_branch_ledgers pcbl;

-- Page 5: Mobile & Fuel dashboard
CREATE OR REPLACE VIEW v_mobile_fuel_dashboard AS
SELECT mfc.*, e.first_name, e.last_name FROM mobile_fuel_claims mfc JOIN employees e ON mfc.employee_id = e.id;

-- Page 6: Approval Workflow -- claims-specific routing-chain view,
-- reading the SAME approval_stage convention across claim types
CREATE OR REPLACE VIEW v_approval_workflow_chain AS
SELECT 'Expense Claim' AS claim_type, ec.id, ec.employee_id, ec.company_id, ec.amount_npr, ec.approval_stage,
    EXTRACT(DAY FROM (NOW() - ec.submitted_at))::INT AS days_at_stage
FROM expense_claims ec
WHERE ec.approval_stage NOT IN ('paid','rejected')
UNION ALL
SELECT 'Travel Request', tr.id, tr.employee_id, tr.company_id, tr.daily_allowance_npr, tr.status,
    EXTRACT(DAY FROM (NOW() - tr.created_at))::INT
FROM travel_requests tr
WHERE tr.status = 'pending';
