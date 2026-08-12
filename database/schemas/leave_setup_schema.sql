-- ================================================================
-- FILE: database/schemas/leave_setup_schema.sql
-- eLogix HRMS — Workforce Operations > Leave Management > Leave Setup (4 pages)
--
-- Design note: holiday_calendar already exists (workforce_config_schema.sql)
-- and is reused directly by leave_year_config below — no duplication.
--
--   1. Leave Setup        -> leave_year_config + approval_hierarchies
--   2. Leave Policy       -> leave_policies
--   3. Leave Type         -> leave_types (master control list)
--   4. Leave Balance Rule -> leave_balance_rules + employee_leave_balances
--
-- Nepal Labour Act 2074 statutory minimums (pre-seeded as defaults):
--   Home/Annual: 1 day per 20 worked, accumulate to 90, encash above 90
--   Sick: 12 days/yr paid, accumulate to 45, encash above 45, doc after 3 days
--   Maternity: 98 days (14 weeks), 60 paid
--   Paternity: 15 days paid
--   Mourning (Kiriya Bida): 13 days paid
--   Public Holidays: 13/yr (14 for women, incl. International Women's Day)
--   Weekly Off: minimum 1 day/week
-- Leave is a statutory right -- cannot be deducted from compensation.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. LEAVE SETUP — fiscal/leave year + approval hierarchies
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_year_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL UNIQUE,

    year_type            VARCHAR(20) DEFAULT 'fiscal_nepal' CHECK (year_type IN ('fiscal_nepal','calendar','custom')),
    -- Nepal fiscal year: Shrawan 1 to Ashadh end (mid-July to mid-July)
    fiscal_year_start_month INT DEFAULT 4,  -- Shrawan = ~mid-July, approximated to Gregorian month
    fiscal_year_start_day   INT DEFAULT 16,

    current_bs_year_label   VARCHAR(20),  -- e.g. '2082/83 BS'
    current_ad_year_label    VARCHAR(20),  -- e.g. '2025/26 AD'

    updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_approval_hierarchies (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    name                 VARCHAR(150) NOT NULL,
    -- approval chain stored as ordered array of role labels
    approval_levels       TEXT[] NOT NULL,
    applies_to_employment_types TEXT[] DEFAULT ARRAY['regular'],
    escalation_after_days    INT DEFAULT 3,  -- auto-escalate to next level if no action

    is_active                 BOOLEAN DEFAULT TRUE,
    created_at                   TIMESTAMPTZ DEFAULT NOW(),
    updated_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. LEAVE POLICY — governing rules: notice, blackout, documentation
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_policies (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    name                 VARCHAR(150) NOT NULL,
    applies_to            VARCHAR(200) DEFAULT 'All Regular Employees',

    min_notice_days        INT DEFAULT 3,
    max_consecutive_days     INT,
    requires_doc_after_days     INT,  -- e.g. 3 days for sick leave per LA2074

    blackout_dates                TEXT[],  -- array of 'YYYY-MM-DD to YYYY-MM-DD' ranges
    allows_negative_balance          BOOLEAN DEFAULT FALSE,
    applies_during_probation             VARCHAR(50) DEFAULT 'Restricted (HR approval only)'
                                         CHECK (applies_during_probation IN ('Allowed','Restricted (HR approval only)','Not Allowed')),

    status                                  VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),

    created_at                                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. LEAVE TYPE — master control list
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_types (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    name                 VARCHAR(150) NOT NULL,
    code                  VARCHAR(10) NOT NULL,
    color_hex              VARCHAR(7) DEFAULT '#64748b',
    icon                     VARCHAR(10) DEFAULT '📋',

    annual_entitlement_text     VARCHAR(200),  -- human-readable, e.g. '1 day per 20 worked'
    is_paid                        BOOLEAN DEFAULT TRUE,
    requires_doc                     BOOLEAN DEFAULT FALSE,
    doc_threshold_days                  INT,  -- doc required if leave exceeds this many days

    probation_eligible                     BOOLEAN DEFAULT FALSE,
    half_day_supported                        BOOLEAN DEFAULT TRUE,
    max_carry_forward_days                       INT DEFAULT 0,

    is_statutory                                    BOOLEAN DEFAULT FALSE,  -- LA2074 mandated vs. discretionary
    status                                              VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),

    created_at                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                 TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, code)
);

-- Pre-seed Nepal LA2074 statutory leave types as defaults (per-company on first setup)
-- Application layer inserts these on company onboarding; schema just defines the shape.

-- ================================================================
-- 4. LEAVE BALANCE RULE — accrual math + employee running balances
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_balance_rules (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    leave_type_id             UUID       NOT NULL REFERENCES leave_types(id),

    accrual_method               VARCHAR(30) NOT NULL DEFAULT 'annual_upfront'
                                 CHECK (accrual_method IN ('monthly_accrual','annual_upfront','daily_continuous','pro_rata_on_join')),
    accrual_formula_text            VARCHAR(200),  -- human-readable summary
    annual_grant_days                  NUMERIC(5,2),
    monthly_equivalent_days               NUMERIC(5,2),

    max_carry_forward_days                   INT DEFAULT 0,
    encashable_above_days                       INT,  -- NULL = not encashable
    expiration_policy                              VARCHAR(50) DEFAULT 'no_expiry'
                                                   CHECK (expiration_policy IN ('no_expiry','use_it_or_lose_it','per_event_non_accumulating')),

    proration_on_join                                  BOOLEAN DEFAULT TRUE,
    negative_balance_allowed                              BOOLEAN DEFAULT FALSE,

    status                                                    VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),

    created_at                                                   TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, leave_type_id)
);

-- Per-employee running balance ledger (the "single source of truth" for
-- the brief's "transparent, real-time balance dashboard")
CREATE TABLE IF NOT EXISTS employee_leave_balances (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    leave_type_id               UUID    NOT NULL REFERENCES leave_types(id),
    leave_year_label                VARCHAR(20) NOT NULL,  -- e.g. '2082/83 BS'

    opening_balance_days                NUMERIC(6,2) DEFAULT 0,
    accrued_to_date_days                   NUMERIC(6,2) DEFAULT 0,
    used_days                                 NUMERIC(6,2) DEFAULT 0,
    encashed_days                                NUMERIC(6,2) DEFAULT 0,
    current_balance_days                            NUMERIC(6,2) GENERATED ALWAYS AS (
                                                     opening_balance_days + accrued_to_date_days - used_days - encashed_days
                                                   ) STORED,

    last_accrual_run_date                                  DATE,

    updated_at                                                 TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, leave_type_id, leave_year_label)
);

CREATE TABLE IF NOT EXISTS leave_balance_transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_leave_balance_id UUID NOT NULL REFERENCES employee_leave_balances(id),
    company_id          UUID NOT NULL,

    transaction_type     VARCHAR(20) NOT NULL
                         CHECK (transaction_type IN ('accrual','usage','encashment','carry_forward','adjustment','expiration')),
    days_delta            NUMERIC(6,2) NOT NULL,  -- positive for credit, negative for debit
    reference_table         VARCHAR(100),  -- e.g. 'leave_requests' (future module)
    reference_id              UUID,
    note                         TEXT,

    transacted_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_lah_company       ON leave_approval_hierarchies(company_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_lp_company            ON leave_policies(company_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_lt_company               ON leave_types(company_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_lt_statutory                ON leave_types(is_statutory) WHERE is_statutory;
CREATE INDEX IF NOT EXISTS idx_lbr_company                    ON leave_balance_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_lbr_leave_type                    ON leave_balance_rules(leave_type_id);

CREATE INDEX IF NOT EXISTS idx_elb_employee                          ON employee_leave_balances(employee_id, leave_year_label);
CREATE INDEX IF NOT EXISTS idx_elb_leave_type                           ON employee_leave_balances(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_elb_encashable_threshold                    ON employee_leave_balances(current_balance_days);

CREATE INDEX IF NOT EXISTS idx_lbt_balance                                     ON leave_balance_transactions(employee_leave_balance_id);
CREATE INDEX IF NOT EXISTS idx_lbt_type                                           ON leave_balance_transactions(transaction_type);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_leave_setup_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'leave_year_config','leave_approval_hierarchies','leave_policies',
  'leave_types','leave_balance_rules','employee_leave_balances'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_leave_setup_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-log every balance mutation to the transaction ledger (audit trail)
CREATE OR REPLACE FUNCTION fn_log_balance_transaction()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE delta NUMERIC;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        delta := (NEW.accrued_to_date_days - OLD.accrued_to_date_days)
               - (NEW.used_days - OLD.used_days)
               - (NEW.encashed_days - OLD.encashed_days);
        IF delta != 0 THEN
            INSERT INTO leave_balance_transactions
              (employee_leave_balance_id, company_id, transaction_type, days_delta, transacted_at)
            VALUES
              (NEW.id, NEW.company_id,
               CASE WHEN NEW.accrued_to_date_days > OLD.accrued_to_date_days THEN 'accrual'
                    WHEN NEW.used_days > OLD.used_days THEN 'usage'
                    WHEN NEW.encashed_days > OLD.encashed_days THEN 'encashment'
                    ELSE 'adjustment' END,
               delta, NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_log_balance_txn
    AFTER UPDATE ON employee_leave_balances
    FOR EACH ROW EXECUTE FUNCTION fn_log_balance_transaction();

-- Pro-rate a new employee's balance on creation, per their join date and
-- the linked leave_balance_rule's annual_grant_days
CREATE OR REPLACE FUNCTION fn_prorate_balance_on_join()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE rule RECORD; join_date DATE; days_remaining_in_year INT;
BEGIN
    SELECT lbr.* INTO rule FROM leave_balance_rules lbr WHERE lbr.leave_type_id = NEW.leave_type_id AND lbr.company_id = NEW.company_id;
    IF rule IS NULL OR NOT rule.proration_on_join THEN RETURN NEW; END IF;

    SELECT e.join_date INTO join_date FROM employees e WHERE e.id = NEW.employee_id;
    IF join_date IS NULL THEN RETURN NEW; END IF;

    -- Simplified pro-ration: (days remaining in fiscal year / 365) x annual grant
    days_remaining_in_year := 365 - EXTRACT(DOY FROM join_date)::INT;
    IF rule.annual_grant_days IS NOT NULL THEN
        NEW.accrued_to_date_days := ROUND(rule.annual_grant_days * days_remaining_in_year / 365.0, 2);
    END IF;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_prorate_on_join
    BEFORE INSERT ON employee_leave_balances
    FOR EACH ROW EXECUTE FUNCTION fn_prorate_balance_on_join();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 4 + ESS dashboard: real-time balance summary per employee
CREATE OR REPLACE VIEW v_employee_leave_balance_summary AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    lt.name AS leave_type, lt.code, lt.color_hex, lt.icon,
    elb.current_balance_days, elb.used_days, elb.accrued_to_date_days, elb.leave_year_label,
    lbr.max_carry_forward_days, lbr.encashable_above_days,
    (elb.current_balance_days > lbr.encashable_above_days) AS encashment_eligible,
    elb.company_id
FROM employee_leave_balances elb
JOIN employees e ON elb.employee_id = e.id
JOIN leave_types lt ON elb.leave_type_id = lt.id
LEFT JOIN leave_balance_rules lbr ON lbr.leave_type_id = lt.id AND lbr.company_id = elb.company_id;

-- Use-it-or-lose-it expiration warning (employees approaching year-end with unused balance)
CREATE OR REPLACE VIEW v_leave_expiration_warnings AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    lt.name AS leave_type, elb.current_balance_days, lbr.expiration_policy,
    elb.company_id
FROM employee_leave_balances elb
JOIN employees e ON elb.employee_id = e.id
JOIN leave_types lt ON elb.leave_type_id = lt.id
JOIN leave_balance_rules lbr ON lbr.leave_type_id = lt.id AND lbr.company_id = elb.company_id
WHERE lbr.expiration_policy = 'use_it_or_lose_it' AND elb.current_balance_days > 0;

-- Financial liability report (accumulated leave balance sheet exposure)
CREATE OR REPLACE VIEW v_leave_liability_report AS
SELECT
    lt.name AS leave_type,
    SUM(elb.current_balance_days) AS total_outstanding_days,
    SUM(elb.current_balance_days * COALESCE(e.basic_salary_npr / 30, 0)) AS estimated_liability_npr,
    elb.company_id
FROM employee_leave_balances elb
JOIN employees e ON elb.employee_id = e.id
JOIN leave_types lt ON elb.leave_type_id = lt.id
WHERE lt.is_paid
GROUP BY lt.name, elb.company_id;
