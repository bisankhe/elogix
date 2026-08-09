-- ================================================================
-- FILE: database/schemas/payroll_information_schema.sql
-- NepHR Pro — Workforce Operations > Payroll & Compensation >
-- Information Module (3 pages)
--
-- Design note: this module is the EMPLOYEE-FACING STATUTORY LEDGER,
-- distinct from government_letters_schema.sql's ssf_correspondence/
-- cit_correspondence (which handle employer-to-government registration
-- and dispute letters, not per-employee deposit tracking). It also does
-- not duplicate payroll_register/payslips' ssf_employee_npr/tds_npr
-- columns -- those capture the per-cycle amount; this schema adds the
-- ACCUMULATING ledger (running balance), CIT voluntary enrollment, and
-- the deposit-status tracking the brief explicitly asks for:
-- "how much deposited, who contributed, what amount on each topic,
-- reflected in Employee Self-Service."
--
--   1. SSF Information -> ssf_enrollments + ssf_deposit_ledger
--   2. CIT Information -> cit_enrollments + cit_deposit_ledger
--   3. TAX Information  -> tax_deposit_ledger (TDS, reuses tax_slabs
--                          from payroll_setup_schema.sql for rate lookup)
--
-- Nepal Contribution-Based Social Security Act 2074: SSF employee 11% +
-- employer 20% (31% total) of basic salary; late deposit recovers with
-- 10% interest; CIT voluntary 1-10%, deductible up to 1/3 income or
-- NPR 500,000 (combined with SSF/insurance); TDS deposited to IRD by
-- 25th of following month, requires valid PAN.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. SSF — enrollment + accumulating deposit ledger
-- ================================================================
CREATE TABLE IF NOT EXISTS ssf_enrollments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL UNIQUE REFERENCES employees(id),

    ssf_number                  VARCHAR(30) NOT NULL UNIQUE,
    enrollment_date                 DATE NOT NULL,
    employee_contribution_pct          NUMERIC(5,2) DEFAULT 11,   -- statutory: 11%
    employer_contribution_pct             NUMERIC(5,2) DEFAULT 20,   -- statutory: 20%

    status                                    VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at                                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ssf_deposit_ledger (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    ssf_enrollment_id         UUID       NOT NULL REFERENCES ssf_enrollments(id),
    payslip_id                   UUID    REFERENCES payslips(id),  -- links to the per-cycle payslip amount

    pay_period                      VARCHAR(20) NOT NULL,
    basic_salary_npr                   NUMERIC(12,2) NOT NULL,

    -- "Who contribution is made" -- explicit employee vs employer split
    employee_contrib_npr                  NUMERIC(12,2) NOT NULL,
    employer_contrib_npr                     NUMERIC(12,2) NOT NULL,
    total_deposit_npr                           NUMERIC(12,2) GENERATED ALWAYS AS (
                                                 employee_contrib_npr + employer_contrib_npr
                                               ) STORED,

    deposit_status                                 VARCHAR(20) DEFAULT 'pending'
                                                   CHECK (deposit_status IN ('pending','deposited','late','recovered_with_interest')),
    deposit_date                                      DATE,
    days_late                                            INT GENERATED ALWAYS AS (
                                                          CASE WHEN deposit_date IS NOT NULL
                                                            THEN GREATEST((deposit_date - (pay_period || '-25')::DATE)::INT, 0)
                                                            ELSE NULL END
                                                        ) STORED,
    interest_penalty_npr                                    NUMERIC(10,2) DEFAULT 0,  -- 10% recovery interest if late

    created_at                                                 TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ssf_enrollment_id, pay_period)
);

-- ================================================================
-- 2. CIT — voluntary enrollment + deposit ledger
-- ================================================================
CREATE TABLE IF NOT EXISTS cit_enrollments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL UNIQUE REFERENCES employees(id),

    cit_account_no               VARCHAR(30) NOT NULL UNIQUE,
    contribution_pct                 NUMERIC(5,2) NOT NULL CHECK (contribution_pct BETWEEN 0 AND 10),
    enrollment_date                     DATE NOT NULL,

    status                                  VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at                                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cit_deposit_ledger (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    cit_enrollment_id         UUID       NOT NULL REFERENCES cit_enrollments(id),
    payslip_id                    UUID    REFERENCES payslips(id),

    pay_period                       VARCHAR(20) NOT NULL,
    salary_basis_npr                    NUMERIC(12,2) NOT NULL,
    contribution_npr                       NUMERIC(12,2) NOT NULL,

    annual_income_npr_at_deposit               NUMERIC(14,2),  -- for tax-exempt cap calculation
    tax_exempt_cap_npr                            NUMERIC(12,2) DEFAULT 500000,
    tax_exempt_eligible_npr                          NUMERIC(12,2),  -- computed: min(1/3 income, 500000, actual contribution)
    exceeds_exempt_cap                                  BOOLEAN GENERATED ALWAYS AS (
                                                         tax_exempt_eligible_npr IS NOT NULL AND contribution_npr > tax_exempt_eligible_npr
                                                       ) STORED,

    deposit_status                                          VARCHAR(20) DEFAULT 'pending'
                                                            CHECK (deposit_status IN ('pending','deposited')),
    deposit_date                                               DATE,

    created_at                                                    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (cit_enrollment_id, pay_period)
);

CREATE TABLE IF NOT EXISTS cit_loans (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cit_enrollment_id   UUID NOT NULL REFERENCES cit_enrollments(id),
    company_id          UUID NOT NULL,

    loan_purpose          VARCHAR(50) CHECK (loan_purpose IN ('housing','education','medical','other')),
    principal_npr            NUMERIC(12,2) NOT NULL,
    outstanding_npr             NUMERIC(12,2) NOT NULL,

    status                        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','cleared')),
    created_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. TAX — TDS deposit ledger (reuses tax_slabs for rate lookup)
-- ================================================================
CREATE TABLE IF NOT EXISTS tax_deposit_ledger (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    payslip_id                  UUID    REFERENCES payslips(id),

    pay_period                     VARCHAR(20) NOT NULL,
    pan_number                        VARCHAR(20),  -- denormalized snapshot at deposit time
    pan_on_file                          BOOLEAN GENERATED ALWAYS AS (pan_number IS NOT NULL) STORED,

    annual_gross_npr                        NUMERIC(14,2) NOT NULL,
    ssf_deduction_npr                          NUMERIC(12,2) DEFAULT 0,
    cit_deduction_npr                             NUMERIC(12,2) DEFAULT 0,
    insurance_deduction_npr                          NUMERIC(12,2) DEFAULT 0,
    total_deductions_npr                                NUMERIC(12,2) GENERATED ALWAYS AS (
                                                         ssf_deduction_npr + cit_deduction_npr + insurance_deduction_npr
                                                       ) STORED,
    taxable_income_npr                                     NUMERIC(14,2) GENERATED ALWAYS AS (
                                                            annual_gross_npr - (ssf_deduction_npr + cit_deduction_npr + insurance_deduction_npr)
                                                          ) STORED,

    tds_amount_npr                                            NUMERIC(12,2) NOT NULL DEFAULT 0,
    effective_rate_pct                                           NUMERIC(5,2),

    deposit_status                                                  VARCHAR(20) DEFAULT 'pending'
                                                                    CHECK (deposit_status IN ('pending','deposited','blocked_missing_pan')),
    deposit_date                                                       DATE,

    created_at                                                            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, pay_period)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_se_employee        ON ssf_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_sdl_enrollment         ON ssf_deposit_ledger(ssf_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_sdl_pending               ON ssf_deposit_ledger(deposit_status) WHERE deposit_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sdl_late                     ON ssf_deposit_ledger(days_late) WHERE days_late > 0;

CREATE INDEX IF NOT EXISTS idx_ce_employee                     ON cit_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_cdl_enrollment                      ON cit_deposit_ledger(cit_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cdl_exceeds                            ON cit_deposit_ledger(exceeds_exempt_cap) WHERE exceeds_exempt_cap;
CREATE INDEX IF NOT EXISTS idx_cl_enrollment                              ON cit_loans(cit_enrollment_id);

CREATE INDEX IF NOT EXISTS idx_tdl_employee                                  ON tax_deposit_ledger(employee_id, pay_period);
CREATE INDEX IF NOT EXISTS idx_tdl_blocked                                      ON tax_deposit_ledger(deposit_status) WHERE deposit_status = 'blocked_missing_pan';

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-mark SSF deposit as late + apply 10% interest if past the 25th
CREATE OR REPLACE FUNCTION fn_check_ssf_deposit_lateness()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.deposit_date IS NOT NULL AND NEW.days_late > 0 THEN
        NEW.deposit_status := 'late';
        NEW.interest_penalty_npr := ROUND(NEW.total_deposit_npr * 0.10, 2);
    ELSIF NEW.deposit_date IS NOT NULL THEN
        NEW.deposit_status := 'deposited';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_ssf_lateness_check
    BEFORE INSERT OR UPDATE OF deposit_date ON ssf_deposit_ledger
    FOR EACH ROW EXECUTE FUNCTION fn_check_ssf_deposit_lateness();

-- Auto-compute CIT tax-exempt eligible amount: min(1/3 annual income, NPR 500k, actual contribution)
CREATE OR REPLACE FUNCTION fn_compute_cit_exempt_eligible()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.annual_income_npr_at_deposit IS NOT NULL THEN
        NEW.tax_exempt_eligible_npr := LEAST(
            NEW.annual_income_npr_at_deposit / 3.0,
            NEW.tax_exempt_cap_npr,
            NEW.contribution_npr
        );
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_cit_exempt_eligible
    BEFORE INSERT OR UPDATE OF contribution_npr, annual_income_npr_at_deposit ON cit_deposit_ledger
    FOR EACH ROW EXECUTE FUNCTION fn_compute_cit_exempt_eligible();

-- Block TDS deposit if PAN is missing -- mirrors the compliance_alerts
-- pattern from payroll_processing_schema.sql
CREATE OR REPLACE FUNCTION fn_block_tds_without_pan()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT NEW.pan_on_file THEN
        NEW.deposit_status := 'blocked_missing_pan';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_tds_no_pan
    BEFORE INSERT OR UPDATE OF pan_number ON tax_deposit_ledger
    FOR EACH ROW EXECUTE FUNCTION fn_block_tds_without_pan();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: SSF accumulated balance per employee (the "how much deposited" view)
CREATE OR REPLACE VIEW v_ssf_employee_summary AS
SELECT
    e.employee_code, e.first_name, e.last_name, se.ssf_number,
    se.employee_contribution_pct, se.employer_contribution_pct,
    COUNT(sdl.id) AS months_contributed,
    SUM(sdl.employee_contrib_npr) AS total_employee_contributed_npr,
    SUM(sdl.employer_contrib_npr) AS total_employer_contributed_npr,
    SUM(sdl.total_deposit_npr) AS accrued_balance_npr,
    se.company_id, se.employee_id
FROM ssf_enrollments se
JOIN employees e ON se.employee_id = e.id
LEFT JOIN ssf_deposit_ledger sdl ON sdl.ssf_enrollment_id = se.id AND sdl.deposit_status IN ('deposited','late')
GROUP BY e.employee_code, e.first_name, e.last_name, se.ssf_number,
         se.employee_contribution_pct, se.employer_contribution_pct, se.company_id, se.employee_id;

-- Page 1: SSF deposits pending or overdue (for reminder automation)
CREATE OR REPLACE VIEW v_ssf_pending_deposits AS
SELECT e.employee_code, e.first_name, e.last_name, sdl.pay_period, sdl.total_deposit_npr, sdl.company_id
FROM ssf_deposit_ledger sdl
JOIN ssf_enrollments se ON sdl.ssf_enrollment_id = se.id
JOIN employees e ON se.employee_id = e.id
WHERE sdl.deposit_status = 'pending';

-- Page 2: CIT accumulated balance per employee
CREATE OR REPLACE VIEW v_cit_employee_summary AS
SELECT
    e.employee_code, e.first_name, e.last_name, ce.cit_account_no, ce.contribution_pct,
    SUM(cdl.contribution_npr) AS accumulated_balance_npr,
    SUM(cdl.tax_exempt_eligible_npr) AS total_tax_exempt_eligible_npr,
    BOOL_OR(cdl.exceeds_exempt_cap) AS any_period_exceeds_cap,
    (SELECT COALESCE(SUM(outstanding_npr),0) FROM cit_loans WHERE cit_enrollment_id = ce.id AND status = 'active') AS loan_outstanding_npr,
    ce.company_id, ce.employee_id
FROM cit_enrollments ce
JOIN employees e ON ce.employee_id = e.id
LEFT JOIN cit_deposit_ledger cdl ON cdl.cit_enrollment_id = ce.id AND cdl.deposit_status = 'deposited'
GROUP BY e.employee_code, e.first_name, e.last_name, ce.cit_account_no, ce.contribution_pct, ce.id, ce.company_id, ce.employee_id;

-- Page 3: TDS / Tax summary per employee, YTD
CREATE OR REPLACE VIEW v_tax_employee_summary AS
SELECT
    e.employee_code, e.first_name, e.last_name, tdl.pan_number, tdl.pan_on_file,
    SUM(tdl.tds_amount_npr) AS ytd_tax_paid_npr,
    AVG(tdl.effective_rate_pct) AS avg_effective_rate_pct,
    MAX(tdl.annual_gross_npr) AS annual_gross_npr,
    MAX(tdl.taxable_income_npr) AS taxable_income_npr,
    BOOL_OR(tdl.deposit_status = 'blocked_missing_pan') AS has_blocked_deposit,
    tdl.company_id, tdl.employee_id
FROM tax_deposit_ledger tdl
JOIN employees e ON tdl.employee_id = e.id
WHERE tdl.pay_period >= TO_CHAR(DATE_TRUNC('year', CURRENT_DATE), 'YYYY-MM')
GROUP BY e.employee_code, e.first_name, e.last_name, tdl.pan_number, tdl.pan_on_file, tdl.company_id, tdl.employee_id;
