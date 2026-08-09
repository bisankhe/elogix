-- ================================================================
-- FILE: database/schemas/leave_settlement_schema.sql
-- NepHR Pro — Workforce Operations > Leave Management > Leave
-- Settlement Module (2 pages)
--
-- Design note: integrates directly with employee_leave_balances and
-- leave_balance_rules (leave_setup_schema.sql) for encashment, and
-- fnf_settlements (settlement_documents_schema.sql) for terminal payouts
-- on exit. Compensatory Leave is DISTINCT from substitute_leave_tracker
-- (leave_operations_schema.sql, statutory Section 42 1:1 holiday-worked
-- substitute) -- this module adds the broader overtime-earned comp-off
-- mechanism (premium-rated, 21-30 day use-by windows, auto-payout on
-- expiry) while substitute_leave_tracker remains the strict statutory
-- subset. Both feed the same employee comp-off balance view.
--
--   1. Leave Encashment    -> leave_encashment_requests
--   2. Compensatory Leave  -> comp_off_credits + comp_off_usage
--
-- Nepal Labour Act 2074 Section 49: Home Leave >90d and Sick Leave >45d
-- must be encashed annually at current basic salary; terminal encashment
-- on exit/death pays out full accumulated balance. Section 42: holiday/
-- weekly-off work entitles substitute leave within 21 days; unused may
-- convert to monetary compensation per company policy (not statutory mandate).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. LEAVE ENCASHMENT REQUESTS
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_encashment_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    leave_type_id               UUID    NOT NULL REFERENCES leave_types(id),
    employee_leave_balance_id      UUID REFERENCES employee_leave_balances(id),

    encashment_type                   VARCHAR(20) NOT NULL DEFAULT 'annual_excess'
                                      CHECK (encashment_type IN ('annual_excess','terminal')),
    -- annual_excess: balance exceeds the statutory cap (90d Home / 45d Sick), paid out yearly
    -- terminal: full accumulated balance paid out on exit/retirement/death (FK to fnf_settlements)

    fnf_settlement_id                       UUID REFERENCES fnf_settlements(id),  -- set only for terminal type

    balance_before_days                        NUMERIC(6,2) NOT NULL,
    encash_threshold_days                         NUMERIC(6,2),  -- the statutory cap this exceeds (NULL for terminal)
    encashable_days                                  NUMERIC(6,2) NOT NULL,

    daily_rate_npr                                      NUMERIC(10,2) NOT NULL,  -- current basic salary / 30
    gross_amount_npr                                       NUMERIC(12,2) GENERATED ALWAYS AS (
                                                            ROUND(encashable_days * daily_rate_npr, 2)
                                                          ) STORED,
    tax_rate_pct                                              NUMERIC(5,2) DEFAULT 10,
    tax_amount_npr                                               NUMERIC(12,2) GENERATED ALWAYS AS (
                                                                  ROUND(encashable_days * daily_rate_npr * tax_rate_pct / 100, 2)
                                                                ) STORED,
    net_amount_npr                                                  NUMERIC(12,2) GENERATED ALWAYS AS (
                                                                     ROUND(encashable_days * daily_rate_npr * (1 - tax_rate_pct/100), 2)
                                                                   ) STORED,

    status                                                              VARCHAR(20) DEFAULT 'pending'
                                                                        CHECK (status IN ('pending','approved_finance','paid','rejected')),
    approved_by                                                            UUID,
    approved_at                                                               TIMESTAMPTZ,
    paid_at                                                                      TIMESTAMPTZ,
    rejection_reason                                                                TEXT,

    submitted_at                                                                       TIMESTAMPTZ DEFAULT NOW(),
    created_at                                                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. COMPENSATORY LEAVE — OVERTIME-EARNED COMP-OFF
-- (distinct from substitute_leave_tracker's statutory 1:1 holiday rule)
-- ================================================================
CREATE TABLE IF NOT EXISTS comp_off_credits (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    worked_date                 DATE NOT NULL,
    worked_reason                  VARCHAR(50) NOT NULL
                                   CHECK (worked_reason IN ('weekly_rest_day','public_holiday','overtime_project_crunch')),
    source_overtime_request_id        UUID REFERENCES overtime_requests(id),  -- links to overtime_monitoring_schema.sql if OT-sourced

    hours_worked                         NUMERIC(5,2),
    credit_ratio                            NUMERIC(3,2) DEFAULT 1.0,  -- 1.0 for statutory substitute; up to 1.5 for OT-premium comp-off
    days_credited                              NUMERIC(5,2) NOT NULL,

    credited_on                                   DATE DEFAULT CURRENT_DATE,
    use_by_days_window                               INT DEFAULT 21,  -- Nepal LA2074 Section 42 default; configurable for OT-sourced credits
    use_by_date                                         DATE GENERATED ALWAYS AS (credited_on + use_by_days_window) STORED,

    days_used                                              NUMERIC(5,2) DEFAULT 0,
    days_remaining                                            NUMERIC(5,2) GENERATED ALWAYS AS (days_credited - days_used) STORED,

    status                                                       VARCHAR(20) DEFAULT 'pending_use'
                                                                 CHECK (status IN ('pending_use','expiring_soon','used','partially_used','expired_paid_out')),

    expiry_payout_npr                                                NUMERIC(10,2),  -- set if expired and company policy pays out

    created_at                                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comp_off_usage (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comp_off_credit_id  UUID NOT NULL REFERENCES comp_off_credits(id),
    company_id          UUID NOT NULL,

    used_date            DATE NOT NULL,
    days_used             NUMERIC(5,2) NOT NULL,
    approved_by              UUID,

    created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ler_employee       ON leave_encashment_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_ler_status            ON leave_encashment_requests(status);
CREATE INDEX IF NOT EXISTS idx_ler_type                 ON leave_encashment_requests(encashment_type);
CREATE INDEX IF NOT EXISTS idx_ler_fnf                     ON leave_encashment_requests(fnf_settlement_id) WHERE fnf_settlement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coc_employee                    ON comp_off_credits(employee_id);
CREATE INDEX IF NOT EXISTS idx_coc_status                         ON comp_off_credits(status);
CREATE INDEX IF NOT EXISTS idx_coc_expiring                          ON comp_off_credits(use_by_date) WHERE status IN ('pending_use','expiring_soon');
CREATE INDEX IF NOT EXISTS idx_coc_ot_source                            ON comp_off_credits(source_overtime_request_id) WHERE source_overtime_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cou_credit                                  ON comp_off_usage(comp_off_credit_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_leave_settlement_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['leave_encashment_requests','comp_off_credits'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_leave_settlement_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- On payment: deduct encashed days from employee_leave_balances (closes
-- the loop with leave_setup_schema.sql)
CREATE OR REPLACE FUNCTION fn_apply_encashment_payout()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'paid' AND OLD.status = 'approved_finance' THEN
        NEW.paid_at := NOW();
        IF NEW.employee_leave_balance_id IS NOT NULL THEN
            UPDATE employee_leave_balances
               SET encashed_days = encashed_days + NEW.encashable_days, updated_at = NOW()
             WHERE id = NEW.employee_leave_balance_id;
        END IF;
    ELSIF NEW.status = 'approved_finance' AND OLD.status = 'pending' THEN
        NEW.approved_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_encashment_payout
    BEFORE UPDATE OF status ON leave_encashment_requests
    FOR EACH ROW EXECUTE FUNCTION fn_apply_encashment_payout();

-- Auto-flag comp-off credits approaching/past their use-by date
CREATE OR REPLACE FUNCTION fn_check_comp_off_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.days_remaining <= 0 THEN
        NEW.status := 'used';
    ELSIF NEW.use_by_date <= CURRENT_DATE AND NEW.days_remaining > 0 THEN
        NEW.status := 'expired_paid_out';
        -- Company-policy payout: daily rate calculated by application layer at expiry-sweep time
    ELSIF NEW.use_by_date <= CURRENT_DATE + INTERVAL '3 days' AND NEW.days_remaining > 0 THEN
        NEW.status := 'expiring_soon';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_comp_off_expiry
    BEFORE INSERT OR UPDATE OF days_used ON comp_off_credits
    FOR EACH ROW EXECUTE FUNCTION fn_check_comp_off_expiry();

-- Apply comp-off usage: deduct from the credit, log to usage history
CREATE OR REPLACE FUNCTION fn_apply_comp_off_usage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE comp_off_credits
       SET days_used = days_used + NEW.days_used, updated_at = NOW()
     WHERE id = NEW.comp_off_credit_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_comp_off_usage
    AFTER INSERT ON comp_off_usage
    FOR EACH ROW EXECUTE FUNCTION fn_apply_comp_off_usage();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Employee's eligible-for-encashment balances (above statutory cap)
CREATE OR REPLACE VIEW v_encashment_eligible_balances AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    lt.name AS leave_type, elb.id AS employee_leave_balance_id, elb.current_balance_days,
    lbr.encashable_above_days,
    GREATEST(elb.current_balance_days - lbr.encashable_above_days, 0) AS encashable_days,
    elb.company_id, elb.employee_id, lt.id AS leave_type_id
FROM employee_leave_balances elb
JOIN employees e ON elb.employee_id = e.id
JOIN leave_types lt ON elb.leave_type_id = lt.id
JOIN leave_balance_rules lbr ON lbr.leave_type_id = lt.id AND lbr.company_id = elb.company_id
WHERE lbr.encashable_above_days IS NOT NULL AND elb.current_balance_days > lbr.encashable_above_days;

-- Page 1: Encashment requests with employee + payout detail
CREATE OR REPLACE VIEW v_leave_encashment_dashboard AS
SELECT
    ler.*, e.employee_code, e.first_name, e.last_name, lt.name AS leave_type_name
FROM leave_encashment_requests ler
JOIN employees e ON ler.employee_id = e.id
JOIN leave_types lt ON ler.leave_type_id = lt.id
ORDER BY ler.submitted_at DESC;

-- Page 1: Admin batch-processing grid (pending finance approval, ready for bulk push)
CREATE OR REPLACE VIEW v_encashment_batch_queue AS
SELECT * FROM v_leave_encashment_dashboard WHERE status = 'pending';

-- Page 2: Comp-off balance dashboard with employee detail
CREATE OR REPLACE VIEW v_comp_off_dashboard AS
SELECT
    coc.*, e.employee_code, e.first_name, e.last_name
FROM comp_off_credits coc
JOIN employees e ON coc.employee_id = e.id
ORDER BY coc.use_by_date ASC;

-- Page 2: Expiring-soon comp-off (proactive alert feed)
CREATE OR REPLACE VIEW v_comp_off_expiring_soon AS
SELECT * FROM v_comp_off_dashboard WHERE status = 'expiring_soon';

-- Combined comp-off balance (unifies overtime-earned credits with the
-- statutory substitute_leave_tracker for a single employee-facing total)
CREATE OR REPLACE VIEW v_combined_comp_off_balance AS
SELECT employee_id, SUM(days_remaining) AS total_comp_off_days, company_id
FROM comp_off_credits WHERE status IN ('pending_use','expiring_soon','partially_used')
GROUP BY employee_id, company_id;
