-- ================================================================
-- FILE: database/schemas/payroll_setup_schema.sql
-- NepHR Pro — Workforce Operations > Payroll & Compensation >
-- Payroll Setup Module (10 pages)
--
-- Design note: deeply integrates with prior modules rather than
-- duplicating: overtime_requests (overtime_monitoring_schema.sql) feeds
-- Overtime Payroll; vendor_billing_records (vendor_finance_schema.sql)
-- feeds Vendor Billing Payroll; daily_attendance_records feeds the
-- absence-redistribution trigger. New tables cover genuinely new ground:
-- salary structures, tax engine, allowances/deductions catalog, and
-- multi-jurisdiction compliance.
--
--   1. Payroll Setup        -> pay_groups + absence_redistribution_log
--   2. Salary Structure      -> salary_structures + salary_structure_components
--   3. Overtime Payroll       -> v_overtime_payroll_batch (view over overtime_requests)
--   4. Insource Payroll        -> payroll_register (the core gross-to-net record)
--   5. Outsource Payroll        -> v_outsource_payroll_compliance (view, min-wage check)
--   6. Vendor Billing Payroll    -> reuses vendor_billing_records directly
--   7. Tax Setup                  -> tax_slabs + tax_deduction_caps
--   8. Allowance                   -> allowance_types
--   9. Deduction                    -> deduction_types + cash_advance_recovery
--   10. Compliance Setup              -> statutory_filing_deadlines
--
-- Nepal Labour Act 2074 / Labour Rules 2075 / Social Security Act:
-- Basic Salary >=60% of gross (Rule 77); min wage NPR 19,550/month;
-- OT capped 4hr/day-24hr/week at 1.5x; Festival Allowance = 1 month
-- basic/year; total deductions capped at 33% of gross unless mutually
-- agreed; SSF 20% employer + 11% employee of basic; TDS deposit by
-- 25th of following month; Annual Labour Audit due mid-Poush.
-- FY 2083/84 tax slabs (effective Shrawan 1, 2083): 5 bands, 1%-29%,
-- 1% threshold doubled to NPR 10,00,000, top rate cut from 39% to 29%.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. PAY GROUPS + ABSENCE SALARY REDISTRIBUTION (company-specific policy)
-- ================================================================
CREATE TABLE IF NOT EXISTS pay_groups (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    name                 VARCHAR(150) NOT NULL,
    pay_frequency           VARCHAR(30) DEFAULT 'monthly' CHECK (pay_frequency IN ('monthly','bi_weekly','weekly','monthly_plus_commission')),
    pay_day_rule              VARCHAR(100) DEFAULT 'Last working day of the month',
    cutoff_day                   INT DEFAULT 25,
    currency_code                   VARCHAR(5) DEFAULT 'NPR',

    absence_redistribution_enabled     BOOLEAN DEFAULT FALSE,
    night_allowance_enabled               BOOLEAN DEFAULT FALSE,

    status                                   VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at                                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                     TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks the team-pool redistribution of an absent employee's basic
-- salary share, weighted by covering employees' own salary % and grade
CREATE TABLE IF NOT EXISTS absence_redistribution_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    pay_period           VARCHAR(20) NOT NULL,  -- e.g. '2025-06'

    absent_employee_id    UUID NOT NULL REFERENCES employees(id),
    absent_days             INT NOT NULL,
    redistributed_basic_npr    NUMERIC(12,2) NOT NULL,

    created_at                    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS absence_redistribution_shares (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    absence_redistribution_log_id UUID NOT NULL REFERENCES absence_redistribution_log(id),
    receiving_employee_id   UUID NOT NULL REFERENCES employees(id),

    weight_basis              VARCHAR(20) DEFAULT 'salary_and_grade' CHECK (weight_basis IN ('salary_and_grade','equal_split')),
    share_pct                    NUMERIC(5,2) NOT NULL,
    share_amount_npr                NUMERIC(12,2) NOT NULL,

    created_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. SALARY STRUCTURES (drag-drop component tree)
-- ================================================================
CREATE TABLE IF NOT EXISTS salary_structures (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    pay_group_id         UUID REFERENCES pay_groups(id),

    name                  VARCHAR(150) NOT NULL,
    gross_monthly_npr        NUMERIC(12,2) NOT NULL,
    basic_pct                   NUMERIC(5,2) NOT NULL CHECK (basic_pct >= 60),  -- LA2074 Rule 77 hard floor
    basic_amount_npr                NUMERIC(12,2) GENERATED ALWAYS AS (
                                     ROUND(gross_monthly_npr * basic_pct / 100, 2)
                                   ) STORED,

    net_pay_npr                        NUMERIC(12,2),  -- computed by trigger after components are added

    status                                 VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','draft','inactive')),
    created_at                                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_structure_components (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salary_structure_id UUID NOT NULL REFERENCES salary_structures(id),
    company_id          UUID NOT NULL,

    component_name        VARCHAR(150) NOT NULL,
    component_type           VARCHAR(15) NOT NULL CHECK (component_type IN ('earning','deduction')),
    calc_formula                 VARCHAR(200),  -- human-readable, e.g. '20% of basic'
    amount_npr                      NUMERIC(12,2) NOT NULL,  -- positive=earning, negative=deduction

    allowance_type_id                  UUID,  -- FK set below, after allowance_types exists
    deduction_type_id                     UUID,

    display_order                            INT DEFAULT 0,
    created_at                                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. PAYROLL REGISTER (insource — the core gross-to-net record per employee/period)
-- ================================================================
CREATE TABLE IF NOT EXISTS payroll_register (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    salary_structure_id         UUID    REFERENCES salary_structures(id),
    pay_period                     VARCHAR(20) NOT NULL,  -- '2025-06'

    gross_npr                          NUMERIC(12,2) NOT NULL,
    ssf_employee_npr                      NUMERIC(12,2) DEFAULT 0,
    tds_npr                                  NUMERIC(12,2) DEFAULT 0,
    other_deductions_npr                        NUMERIC(12,2) DEFAULT 0,
    -- includes cash_advance_recovery, loan/garnishment, etc.

    net_npr                                        NUMERIC(12,2) GENERATED ALWAYS AS (
                                                    gross_npr - ssf_employee_npr - tds_npr - other_deductions_npr
                                                  ) STORED,

    total_deduction_pct                                   NUMERIC(5,2) GENERATED ALWAYS AS (
                                                           ROUND((ssf_employee_npr + tds_npr + other_deductions_npr) / NULLIF(gross_npr,0) * 100, 2)
                                                         ) STORED,
    exceeds_deduction_cap                                       BOOLEAN GENERATED ALWAYS AS (
                                                                 (ssf_employee_npr + tds_npr + other_deductions_npr) / NULLIF(gross_npr,0) * 100 > 33
                                                               ) STORED,

    status                                                          VARCHAR(20) DEFAULT 'pending'
                                                                    CHECK (status IN ('pending','finalized','paid')),
    finalized_at                                                       TIMESTAMPTZ,
    paid_at                                                               TIMESTAMPTZ,

    created_at                                                               TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, pay_period)
);

-- ================================================================
-- 7. TAX SETUP — FY 2083/84 progressive slabs + deduction caps
-- ================================================================
CREATE TABLE IF NOT EXISTS tax_slabs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurisdiction_code    VARCHAR(10) NOT NULL DEFAULT 'NP',
    fiscal_year_label    VARCHAR(20) NOT NULL,  -- '2083/84'
    slab_order             INT NOT NULL,

    income_from_npr           NUMERIC(14,2) NOT NULL,
    income_to_npr                 NUMERIC(14,2),  -- NULL = no upper limit
    tax_rate_pct                     NUMERIC(5,2) NOT NULL,
    max_tax_in_band_npr                 NUMERIC(14,2),

    effective_from_date                    DATE,
    is_active                                 BOOLEAN DEFAULT TRUE,

    UNIQUE (jurisdiction_code, fiscal_year_label, slab_order)
);

-- Nepal FY 2083/84 (effective Shrawan 1, 2083 / mid-July 2026)
INSERT INTO tax_slabs (jurisdiction_code, fiscal_year_label, slab_order, income_from_npr, income_to_npr, tax_rate_pct, max_tax_in_band_npr, effective_from_date) VALUES
    ('NP','2083/84',1,0,1000000,1,10000,'2026-07-16'),
    ('NP','2083/84',2,1000001,1500000,10,50000,'2026-07-16'),
    ('NP','2083/84',3,1500001,2500000,20,200000,'2026-07-16'),
    ('NP','2083/84',4,2500001,4000000,27,405000,'2026-07-16'),
    ('NP','2083/84',5,4000001,NULL,29,NULL,'2026-07-16')
ON CONFLICT (jurisdiction_code, fiscal_year_label, slab_order) DO NOTHING;

-- Nepal FY 2082/83 (prior year, retained for historical payroll reprocessing)
INSERT INTO tax_slabs (jurisdiction_code, fiscal_year_label, slab_order, income_from_npr, income_to_npr, tax_rate_pct, max_tax_in_band_npr, effective_from_date) VALUES
    ('NP','2082/83',1,0,500000,1,5000,'2025-07-17'),
    ('NP','2082/83',2,500001,700000,10,20000,'2025-07-17'),
    ('NP','2082/83',3,700001,1000000,20,60000,'2025-07-17'),
    ('NP','2082/83',4,1000001,2000000,30,300000,'2025-07-17'),
    ('NP','2082/83',5,2000001,NULL,36,NULL,'2025-07-17')
ON CONFLICT (jurisdiction_code, fiscal_year_label, slab_order) DO NOTHING;

CREATE TABLE IF NOT EXISTS tax_deduction_caps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurisdiction_code    VARCHAR(10) NOT NULL DEFAULT 'NP',
    deduction_name        VARCHAR(150) NOT NULL,
    cap_type                VARCHAR(20) NOT NULL CHECK (cap_type IN ('flat_amount','pct_of_income','lower_of_pct_or_flat')),
    cap_amount_npr             NUMERIC(14,2),
    cap_pct                       NUMERIC(5,2),

    UNIQUE (jurisdiction_code, deduction_name)
);

INSERT INTO tax_deduction_caps (jurisdiction_code, deduction_name, cap_type, cap_amount_npr, cap_pct) VALUES
    ('NP','SSF/EPF/CIT Combined','lower_of_pct_or_flat',500000,33.33),
    ('NP','Life Insurance Premium','flat_amount',40000,NULL),
    ('NP','Health/Medical Insurance Premium','flat_amount',20000,NULL)
ON CONFLICT (jurisdiction_code, deduction_name) DO NOTHING;

-- ================================================================
-- 8. ALLOWANCE TYPES (master catalog)
-- ================================================================
CREATE TABLE IF NOT EXISTS allowance_types (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    name                  VARCHAR(150) NOT NULL,
    code                    VARCHAR(15) NOT NULL,
    calc_type                  VARCHAR(15) NOT NULL CHECK (calc_type IN ('flat','percentage')),
    calc_value_text               VARCHAR(200),  -- human-readable, e.g. '20% of basic'
    calc_pct_of_basic                 NUMERIC(5,2),  -- if percentage-based
    calc_flat_amount_npr                 NUMERIC(12,2),  -- if flat

    is_taxable                              BOOLEAN DEFAULT TRUE,
    is_statutory                               BOOLEAN DEFAULT FALSE,  -- e.g. Festival Allowance

    status                                        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at                                       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- ================================================================
-- 9. DEDUCTION TYPES + CASH ADVANCE AUTO-RECOVERY
-- ================================================================
CREATE TABLE IF NOT EXISTS deduction_types (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    name                  VARCHAR(150) NOT NULL,
    code                    VARCHAR(15) NOT NULL,
    timing                    VARCHAR(15) NOT NULL CHECK (timing IN ('pre_tax','post_tax')),
    calc_value_text               VARCHAR(200),
    is_mandatory                     BOOLEAN DEFAULT FALSE,

    status                               VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at                              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, code)
);

-- Cash advance tracking with the brief's explicit auto-recovery-after-1-month rule
CREATE TABLE IF NOT EXISTS cash_advance_recovery (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    advance_amount_npr           NUMERIC(12,2) NOT NULL,
    disbursed_date                  DATE NOT NULL,
    recovery_due_date                  DATE GENERATED ALWAYS AS (disbursed_date + INTERVAL '1 month') STORED,

    cleared_amount_npr                    NUMERIC(12,2) DEFAULT 0,
    outstanding_amount_npr                    NUMERIC(12,2) GENERATED ALWAYS AS (
                                              advance_amount_npr - cleared_amount_npr
                                            ) STORED,

    auto_recovery_triggered                      BOOLEAN DEFAULT FALSE,
    auto_recovery_pay_period                        VARCHAR(20),

    status                                             VARCHAR(20) DEFAULT 'outstanding'
                                                       CHECK (status IN ('outstanding','cleared','auto_recovered')),

    created_at                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 10. COMPLIANCE SETUP — statutory filing deadlines + multi-jurisdiction
-- ================================================================
CREATE TABLE IF NOT EXISTS statutory_filing_deadlines (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    filing_name           VARCHAR(150) NOT NULL,
    authority                VARCHAR(150) NOT NULL,
    jurisdiction_code           VARCHAR(10) DEFAULT 'NP',
    recurrence                     VARCHAR(20) DEFAULT 'monthly' CHECK (recurrence IN ('monthly','quarterly','annual','one_time')),

    due_date                          DATE NOT NULL,
    status                                VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('on_track','upcoming','overdue','filed')),
    filed_at                                TIMESTAMPTZ,

    created_at                                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                     TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_pg_company           ON pay_groups(company_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_arl_period              ON absence_redistribution_log(company_id, pay_period);
CREATE INDEX IF NOT EXISTS idx_ars_log                    ON absence_redistribution_shares(absence_redistribution_log_id);

CREATE INDEX IF NOT EXISTS idx_ss_company                    ON salary_structures(company_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ssc_structure                     ON salary_structure_components(salary_structure_id);

CREATE INDEX IF NOT EXISTS idx_pr_employee_period                   ON payroll_register(employee_id, pay_period);
CREATE INDEX IF NOT EXISTS idx_pr_company_period                        ON payroll_register(company_id, pay_period);
CREATE INDEX IF NOT EXISTS idx_pr_exceeds_cap                              ON payroll_register(exceeds_deduction_cap) WHERE exceeds_deduction_cap;
CREATE INDEX IF NOT EXISTS idx_pr_status                                      ON payroll_register(status);

CREATE INDEX IF NOT EXISTS idx_ts_jurisdiction_year                              ON tax_slabs(jurisdiction_code, fiscal_year_label) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_at_company                                           ON allowance_types(company_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_dt_company                                              ON deduction_types(company_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_car_employee                                               ON cash_advance_recovery(employee_id);
CREATE INDEX IF NOT EXISTS idx_car_due_date                                                  ON cash_advance_recovery(recovery_due_date) WHERE status = 'outstanding';

CREATE INDEX IF NOT EXISTS idx_sfd_company                                                      ON statutory_filing_deadlines(company_id);
CREATE INDEX IF NOT EXISTS idx_sfd_due_date                                                         ON statutory_filing_deadlines(due_date) WHERE status != 'filed';

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_payroll_setup_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'pay_groups','salary_structures','payroll_register','cash_advance_recovery','statutory_filing_deadlines'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_payroll_setup_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Enforce Rule 77: Basic Salary must be >=60% of gross (already a CHECK
-- constraint on salary_structures.basic_pct, this trigger additionally
-- blocks if adding a component would retroactively violate it)
CREATE OR REPLACE FUNCTION fn_validate_basic_floor_on_component()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE struct_basic_pct NUMERIC;
BEGIN
    SELECT basic_pct INTO struct_basic_pct FROM salary_structures WHERE id = NEW.salary_structure_id;
    IF struct_basic_pct < 60 THEN
        RAISE EXCEPTION 'Basic Salary percentage (%) is below the 60%% statutory floor per Nepal Labour Rules 2075 Rule 77.', struct_basic_pct;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_validate_basic_floor
    BEFORE INSERT ON salary_structure_components
    FOR EACH ROW EXECUTE FUNCTION fn_validate_basic_floor_on_component();

-- Auto-flag cash advances past their 1-month recovery window for payroll deduction
CREATE OR REPLACE FUNCTION fn_check_cash_advance_recovery()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.outstanding_amount_npr > 0 AND NEW.recovery_due_date <= CURRENT_DATE AND NOT NEW.auto_recovery_triggered THEN
        NEW.auto_recovery_triggered := TRUE;
        NEW.status := 'auto_recovered';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_cash_advance_check
    BEFORE UPDATE OF cleared_amount_npr ON cash_advance_recovery
    FOR EACH ROW EXECUTE FUNCTION fn_check_cash_advance_recovery();

-- Auto-update statutory_filing_deadlines status based on due_date proximity
CREATE OR REPLACE FUNCTION fn_update_filing_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.filed_at IS NOT NULL THEN
        NEW.status := 'filed';
    ELSIF NEW.due_date < CURRENT_DATE THEN
        NEW.status := 'overdue';
    ELSIF NEW.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN
        NEW.status := 'upcoming';
    ELSE
        NEW.status := 'on_track';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_filing_status
    BEFORE INSERT OR UPDATE ON statutory_filing_deadlines
    FOR EACH ROW EXECUTE FUNCTION fn_update_filing_status();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 3: Overtime Payroll batch (reuses overtime_requests directly, zero duplication)
CREATE OR REPLACE VIEW v_overtime_payroll_batch AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    DATE_TRUNC('month', otr.request_date)::DATE AS pay_period,
    SUM(otr.requested_hours) AS total_ot_hours,
    AVG(otr.base_hourly_rate_npr) AS avg_base_hourly_npr,
    SUM(otr.ot_amount_npr) AS total_ot_amount_npr,
    COUNT(*) FILTER (WHERE otr.exceeds_weekly_cap) AS weekly_cap_breaches,
    (COUNT(*) FILTER (WHERE otr.exceeds_weekly_cap) = 0) AS ready_for_payroll,
    e.company_id
FROM overtime_requests otr
JOIN employees e ON otr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE otr.status = 'approved'
GROUP BY e.employee_code, e.first_name, e.last_name, d.name, DATE_TRUNC('month', otr.request_date), e.company_id;

-- Page 5: Outsource Payroll minimum-wage compliance check
CREATE OR REPLACE VIEW v_outsource_payroll_compliance AS
SELECT
    ve.employee_name, v.name AS vendor_name, ve.role_designation,
    obs.attendance_date, ve.id AS vendor_employee_id,
    (19550 <= COALESCE(ve.monthly_pay_npr, 0)) AS min_wage_compliant,
    v.company_id
FROM vendor_employees ve
JOIN vendors v ON ve.vendor_id = v.id
LEFT JOIN outsource_attendance_sync obs ON obs.vendor_employee_id = ve.id;

-- Page 4: Insource payroll register with employee detail
CREATE OR REPLACE VIEW v_insource_payroll_register AS
SELECT
    pr.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM payroll_register pr
JOIN employees e ON pr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
ORDER BY pr.pay_period DESC;

-- Page 7: active tax slabs for the current/selected fiscal year
CREATE OR REPLACE VIEW v_active_tax_slabs AS
SELECT * FROM tax_slabs WHERE is_active ORDER BY jurisdiction_code, fiscal_year_label DESC, slab_order;

-- Page 9: outstanding cash advances nearing/past their recovery deadline
CREATE OR REPLACE VIEW v_cash_advance_due AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    car.advance_amount_npr, car.outstanding_amount_npr, car.disbursed_date, car.recovery_due_date,
    car.status, car.company_id
FROM cash_advance_recovery car
JOIN employees e ON car.employee_id = e.id
WHERE car.status != 'cleared'
ORDER BY car.recovery_due_date ASC;

-- Page 10: compliance health score (% of non-overdue filings)
CREATE OR REPLACE VIEW v_compliance_health_score AS
SELECT
    company_id,
    ROUND(COUNT(*) FILTER (WHERE status != 'overdue')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS health_score_pct,
    COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
    COUNT(*) AS total_filings
FROM statutory_filing_deadlines
GROUP BY company_id;
