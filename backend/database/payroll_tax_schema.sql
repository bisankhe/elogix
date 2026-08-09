-- ============================================================
--  eLogix HRMS — Final Salary Sheet & Tax Calculator Schema
--  Nepal Income Tax Act 2058 · SSF Regulation 2074 · FY 2083-84
--  eLogix Technologies · www.elogix.com.np
--  Run: psql -U elogix_user -d elogix_hrms -f payroll_tax_schema.sql
-- ============================================================

-- ── ENUMS ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('Male','Female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE marital_type AS ENUM ('Single','Married');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cit_freq AS ENUM ('MNT','QRT','ANN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE salary_status AS ENUM ('draft','submitted','approved','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ══════════════════════════════════════════════════════════════
--  FINAL SALARY SHEET
--  Mirrors all 65 columns of Excel sheet
--  Auto-calculated via trigger
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS final_salary_sheets (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Employee
    emp_id               VARCHAR(50)   NOT NULL,
    emp_code             VARCHAR(30)   NOT NULL,
    emp_name             VARCHAR(200)  NOT NULL,
    designation          VARCHAR(150),
    department           VARCHAR(150),
    date_of_joining      DATE,
    is_bod               BOOLEAN       DEFAULT FALSE,
    gender               gender_type   NOT NULL DEFAULT 'Male',
    marital_status       marital_type  NOT NULL DEFAULT 'Single',

    -- Period
    pay_month            VARCHAR(7)    NOT NULL,      -- "2026-07"
    fiscal_year          VARCHAR(7)    NOT NULL,      -- "2083-84"
    months_in_year       SMALLINT      DEFAULT 12,
    remaining_months     SMALLINT      DEFAULT 12,
    cit_freq             cit_freq      DEFAULT 'MNT',

    -- ── Earnings (from Excel cols C10–C19) ───────────────────
    basic_salary         NUMERIC(12,2) DEFAULT 0,
    other_allowance      NUMERIC(12,2) DEFAULT 0,
    dearness_allowance   NUMERIC(12,2) DEFAULT 0,
    ssf_col              NUMERIC(12,2) DEFAULT 0,
    laptop_allowance     NUMERIC(12,2) DEFAULT 0,
    rent_allowance       NUMERIC(12,2) DEFAULT 0,
    incentive            NUMERIC(12,2) DEFAULT 0,
    misc_deduct          NUMERIC(12,2) DEFAULT 0,
    leave_deduct         NUMERIC(12,2) DEFAULT 0,
    gross_salary         NUMERIC(12,2) DEFAULT 0,     -- auto: C19

    -- ── SSF (Social Security Fund) ───────────────────────────
    -- Employee: PF 10% + Gratuity 8.33% + Insurance 1.67% = 20% of Basic
    -- Employer: additional 20% of Basic
    ssf_pf               NUMERIC(12,2) DEFAULT 0,     -- 10% × basic
    ssf_gratuity         NUMERIC(12,2) DEFAULT 0,     -- 8.33% × basic
    ssf_insurance        NUMERIC(12,2) DEFAULT 0,     -- 1.67% × basic
    ssf_total_employee   NUMERIC(12,2) DEFAULT 0,     -- = pf + gratuity + ins
    ssf_total_employer   NUMERIC(12,2) DEFAULT 0,     -- = 20% × basic (employer share)
    ssf_contribution     NUMERIC(12,2) DEFAULT 0,     -- deducted from gross (C20)

    -- ── CIT (Citizen Investment Trust) ───────────────────────
    cit_deduct           NUMERIC(12,2) DEFAULT 0,     -- 50% × basic (C21)

    -- ── Other deductions ─────────────────────────────────────
    staff_advance        NUMERIC(12,2) DEFAULT 0,     -- C22
    dashain_allowance    NUMERIC(12,2) DEFAULT 0,     -- = 1 month basic (C23)

    -- ── Cumulative fields (cols C24–C30) ──────────────────────
    tax_deducted_prev    NUMERIC(12,2) DEFAULT 0,
    cumul_gross          NUMERIC(14,2) DEFAULT 0,
    cumul_cit_pf         NUMERIC(14,2) DEFAULT 0,
    cumul_incentive      NUMERIC(14,2) DEFAULT 0,
    quarterly_cit        NUMERIC(12,2) DEFAULT 0,
    leave_deduct_prev    NUMERIC(12,2) DEFAULT 0,

    -- ── Annual computations (cols C31–C36) ───────────────────
    annual_gross         NUMERIC(14,2) DEFAULT 0,     -- C31
    annual_gross_w_incv  NUMERIC(14,2) DEFAULT 0,     -- C32
    arf_contribution     NUMERIC(12,2) DEFAULT 0,     -- C33: actual SSF × months
    arf_allowable        NUMERIC(12,2) DEFAULT 0,     -- C34: min(actual,500K,1/3)
    life_insurance       NUMERIC(12,2) DEFAULT 0,     -- actual premium paid
    life_ins_allowable   NUMERIC(12,2) DEFAULT 0,     -- C35: max 60K
    school_fee           NUMERIC(12,2) DEFAULT 0,
    taxable_income       NUMERIC(14,2) DEFAULT 0,     -- C36

    -- ── Tax Slab breakdown FY 2083-84 Single (cols C37–C60) ──
    -- 0%: First NPR 10 Lakh
    tax_0pct_income      NUMERIC(14,2) DEFAULT 0,     -- C49
    -- 10%: Next NPR 5 Lakh
    tax_10pct_income     NUMERIC(12,2) DEFAULT 0,     -- C50
    tax_10pct_amount     NUMERIC(12,2) DEFAULT 0,     -- C51
    -- 20%: Next NPR 10 Lakh
    tax_20pct_income     NUMERIC(12,2) DEFAULT 0,     -- C52
    tax_20pct_amount     NUMERIC(12,2) DEFAULT 0,     -- C53
    -- 27%: Next NPR 15 Lakh
    tax_27pct_income     NUMERIC(12,2) DEFAULT 0,     -- C54
    tax_27pct_amount     NUMERIC(12,2) DEFAULT 0,     -- C55
    -- 29%: Exceeding 40 Lakh
    tax_29pct_income     NUMERIC(12,2) DEFAULT 0,     -- C56
    tax_29pct_amount     NUMERIC(12,2) DEFAULT 0,     -- C57

    total_tax_payable    NUMERIC(12,2) DEFAULT 0,     -- C40/C58
    female_tax_credit    NUMERIC(12,2) DEFAULT 0,     -- C41/C59: 10% (female only)
    net_tax_payable      NUMERIC(12,2) DEFAULT 0,     -- C42/C60
    tax_deducted_prev_yr NUMERIC(12,2) DEFAULT 0,     -- C43
    net_tax_remaining    NUMERIC(12,2) DEFAULT 0,     -- C44

    per_month_sst        NUMERIC(12,2) DEFAULT 0,     -- C45
    per_month_total      NUMERIC(12,2) DEFAULT 0,     -- C46
    monthly_tax          NUMERIC(12,2) DEFAULT 0,     -- TDS per month

    net_salary           NUMERIC(12,2) DEFAULT 0,     -- C65 (final)

    -- Status
    status               salary_status DEFAULT 'draft',
    is_locked            BOOLEAN       DEFAULT FALSE,
    payroll_ref          VARCHAR(100),
    payroll_synced       BOOLEAN       DEFAULT FALSE,
    payroll_synced_at    TIMESTAMPTZ,
    created_by           UUID,
    created_at           TIMESTAMPTZ   DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   DEFAULT NOW(),

    CONSTRAINT uq_salary_emp_month
        UNIQUE (company_id, emp_id, pay_month)
);

CREATE INDEX IF NOT EXISTS idx_salary_dept_month
    ON final_salary_sheets(company_id, department, pay_month);
CREATE INDEX IF NOT EXISTS idx_salary_fiscal
    ON final_salary_sheets(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_salary_emp
    ON final_salary_sheets(company_id, emp_id, pay_month);

COMMENT ON TABLE final_salary_sheets IS
    'Final salary sheet mirroring all 65 Excel columns. Nepal Income Tax Act 2058, FY 2083-84 slabs. Auto-calculated by eLogix salary engine. Locked after 3 digital signatures + payroll sync.';
COMMENT ON COLUMN final_salary_sheets.arf_allowable IS
    'Approved Retirement Fund allowable = MIN(Actual, NPR 500,000, 1/3 of Assessable Income). Nepal Income Tax Act 2058 s.63.';
COMMENT ON COLUMN final_salary_sheets.female_tax_credit IS
    'Female employees get 10% rebate on total income tax. Nepal Income Tax Act 2058 s.88.';
COMMENT ON COLUMN final_salary_sheets.dashain_allowance IS
    '1 month Basic Salary — included in Annual Assessable Income per IRD Nepal.';
COMMENT ON COLUMN final_salary_sheets.ssf_total_employee IS
    'Employee SSF = PF (10%) + Gratuity (8.33%) + Insurance (1.67%) of Basic Salary. Nepal SSF Regulation 2074.';
COMMENT ON COLUMN final_salary_sheets.ssf_total_employer IS
    'Employer SSF = 20% of Basic Salary. Separate from employee deduction. Nepal SSF Regulation 2074.';


-- Auto-calculate all tax fields on insert/update
CREATE OR REPLACE FUNCTION fn_salary_auto_calc()
RETURNS TRIGGER AS $$
DECLARE
    v_arf_actual    NUMERIC;
    v_arf_one_third NUMERIC;
    v_taxable       NUMERIC;
    v_tax_0pct      NUMERIC;
    v_tax_10pct     NUMERIC;
    v_tax_20pct     NUMERIC;
    v_tax_27pct     NUMERIC;
    v_tax_29pct     NUMERIC;
    v_total_tax     NUMERIC;
BEGIN
    -- SSF Employee
    NEW.ssf_pf               := ROUND(NEW.basic_salary * 0.10, 2);
    NEW.ssf_gratuity         := ROUND(NEW.basic_salary * 0.0833, 2);
    NEW.ssf_insurance        := ROUND(NEW.basic_salary * 0.0167, 2);
    NEW.ssf_total_employee   := NEW.ssf_pf + NEW.ssf_gratuity + NEW.ssf_insurance;
    NEW.ssf_total_employer   := ROUND(NEW.basic_salary * 0.20, 2);
    NEW.ssf_contribution     := NEW.ssf_total_employee;

    -- Gross salary (monthly)
    NEW.gross_salary := NEW.basic_salary + NEW.other_allowance + NEW.dearness_allowance
        + COALESCE(NEW.laptop_allowance,0) + COALESCE(NEW.rent_allowance,0)
        + COALESCE(NEW.incentive,0)
        - COALESCE(NEW.misc_deduct,0) - COALESCE(NEW.leave_deduct,0)
        - NEW.ssf_total_employee;

    -- CIT (50% of basic)
    NEW.cit_deduct := ROUND(NEW.basic_salary * 0.50, 2);

    -- Dashain (1 month basic)
    NEW.dashain_allowance := NEW.basic_salary;

    -- Annual gross
    NEW.annual_gross := NEW.gross_salary * NEW.months_in_year;
    NEW.annual_gross_w_incv := NEW.annual_gross + COALESCE(NEW.incentive,0) * NEW.months_in_year;

    -- ARF allowable = min(actual, 500000, 1/3 assessable)
    v_arf_actual    := NEW.ssf_total_employee * NEW.months_in_year;
    v_arf_one_third := (NEW.annual_gross_w_incv + NEW.dashain_allowance) / 3.0;
    NEW.arf_contribution := v_arf_actual;
    NEW.arf_allowable    := LEAST(v_arf_actual, 500000, v_arf_one_third);

    -- Life insurance allowable (max 60000)
    NEW.life_ins_allowable := LEAST(COALESCE(NEW.life_insurance,0), 60000);

    -- Taxable income
    v_taxable := GREATEST(0,
        NEW.annual_gross_w_incv + NEW.dashain_allowance
        - NEW.arf_allowable - NEW.life_ins_allowable
    );
    NEW.taxable_income := v_taxable;

    -- FY 2083-84 Single tax slabs
    v_tax_0pct  := 0;
    v_tax_10pct := 0;
    v_tax_20pct := 0;
    v_tax_27pct := 0;
    v_tax_29pct := 0;

    IF v_taxable > 0 THEN
        -- 0% on first 10L
        NEW.tax_0pct_income := LEAST(v_taxable, 1000000);
        v_taxable := v_taxable - NEW.tax_0pct_income;

        -- 10% on next 5L
        NEW.tax_10pct_income := LEAST(v_taxable, 500000);
        NEW.tax_10pct_amount := ROUND(NEW.tax_10pct_income * 0.10, 2);
        v_taxable := v_taxable - NEW.tax_10pct_income;

        -- 20% on next 10L
        NEW.tax_20pct_income := LEAST(v_taxable, 1000000);
        NEW.tax_20pct_amount := ROUND(NEW.tax_20pct_income * 0.20, 2);
        v_taxable := v_taxable - NEW.tax_20pct_income;

        -- 27% on next 15L
        NEW.tax_27pct_income := LEAST(v_taxable, 1500000);
        NEW.tax_27pct_amount := ROUND(NEW.tax_27pct_income * 0.27, 2);
        v_taxable := v_taxable - NEW.tax_27pct_income;

        -- 29% on exceeding 40L
        NEW.tax_29pct_income := v_taxable;
        NEW.tax_29pct_amount := ROUND(NEW.tax_29pct_income * 0.29, 2);
    END IF;

    v_total_tax := NEW.tax_10pct_amount + NEW.tax_20pct_amount
                 + NEW.tax_27pct_amount + NEW.tax_29pct_amount;
    NEW.total_tax_payable := v_total_tax;

    -- Female 10% rebate (Nepal Income Tax Act 2058 s.88)
    IF NEW.gender = 'Female' THEN
        NEW.female_tax_credit := ROUND(v_total_tax * 0.10, 2);
    ELSE
        NEW.female_tax_credit := 0;
    END IF;
    NEW.net_tax_payable := v_total_tax - NEW.female_tax_credit;

    -- Monthly TDS
    IF NEW.months_in_year > 0 THEN
        NEW.monthly_tax := ROUND(NEW.net_tax_payable / NEW.months_in_year, 2);
    END IF;

    -- Net salary = gross - SSF - CIT - TDS - staff advance
    NEW.net_salary := NEW.gross_salary
        - NEW.ssf_total_employee
        - NEW.cit_deduct
        - NEW.monthly_tax
        - COALESCE(NEW.staff_advance, 0);

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_salary_auto_calc ON final_salary_sheets;
CREATE TRIGGER trg_salary_auto_calc
    BEFORE INSERT OR UPDATE OF
        basic_salary, other_allowance, dearness_allowance, laptop_allowance,
        rent_allowance, incentive, misc_deduct, leave_deduct, staff_advance,
        life_insurance, months_in_year, gender, marital_status
    ON final_salary_sheets
    FOR EACH ROW EXECUTE FUNCTION fn_salary_auto_calc();

-- Prevent editing locked records
CREATE OR REPLACE FUNCTION fn_salary_lock_check()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = TRUE AND OLD.payroll_synced = TRUE THEN
        RAISE EXCEPTION 'eLogix: Cannot modify locked & payroll-synced salary record. Contact HR Manager.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_salary_lock_check ON final_salary_sheets;
CREATE TRIGGER trg_salary_lock_check
    BEFORE UPDATE ON final_salary_sheets
    FOR EACH ROW EXECUTE FUNCTION fn_salary_lock_check();


-- ══════════════════════════════════════════════════════════════
--  TAX CALCULATION LOG  (history of individual calculator runs)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tax_calculation_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    emp_id           VARCHAR(50),
    emp_name         VARCHAR(200),
    fiscal_year      VARCHAR(7)    DEFAULT '2083-84',
    gender           VARCHAR(10),
    marital_status   VARCHAR(10),
    months_in_year   SMALLINT      DEFAULT 12,

    -- Key inputs
    basic_salary     NUMERIC(12,2) DEFAULT 0,
    other_allowance  NUMERIC(12,2) DEFAULT 0,
    dearness_allow   NUMERIC(12,2) DEFAULT 0,
    other_inputs     JSONB,

    -- Key outputs
    monthly_gross    NUMERIC(12,2) DEFAULT 0,
    annual_assessable NUMERIC(14,2) DEFAULT 0,
    arf_allowable    NUMERIC(12,2) DEFAULT 0,
    taxable_income   NUMERIC(14,2) DEFAULT 0,
    ssf_employee     NUMERIC(12,2) DEFAULT 0,
    ssf_employer     NUMERIC(12,2) DEFAULT 0,
    cit_monthly      NUMERIC(12,2) DEFAULT 0,
    total_tax_annual NUMERIC(12,2) DEFAULT 0,
    female_credit    NUMERIC(12,2) DEFAULT 0,
    net_tax_annual   NUMERIC(12,2) DEFAULT 0,
    monthly_tax      NUMERIC(12,2) DEFAULT 0,
    net_salary       NUMERIC(12,2) DEFAULT 0,
    effective_rate   NUMERIC(6,4)  DEFAULT 0,
    tax_breakdown    JSONB,

    created_at       TIMESTAMPTZ   DEFAULT NOW(),
    created_by       UUID
);

CREATE INDEX IF NOT EXISTS idx_tax_log_company ON tax_calculation_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_log_emp     ON tax_calculation_logs(company_id, emp_id);
COMMENT ON TABLE tax_calculation_logs IS
    'History of all tax calculations run via eLogix Tax Calculator. Immutable audit trail.';


-- ══════════════════════════════════════════════════════════════
--  TAX SLAB CONFIG  (IRD Nepal — editable per fiscal year)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tax_slab_configs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fiscal_year   VARCHAR(7) NOT NULL,
    taxpayer_type VARCHAR(20) NOT NULL,   -- single | couple
    slab_order    SMALLINT NOT NULL,
    description   VARCHAR(200),
    upto_amount   NUMERIC(14,2),          -- NULL = unlimited
    tax_rate      NUMERIC(6,4) NOT NULL,
    cumul_tax     NUMERIC(12,2) DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, fiscal_year, taxpayer_type, slab_order)
);


-- ══════════════════════════════════════════════════════════════
--  SEED: FY 2083-84 Tax Slabs (Single)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_seed_tax_slabs_2083(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Single slabs FY 2083-84
    INSERT INTO tax_slab_configs (company_id, fiscal_year, taxpayer_type, slab_order, description, upto_amount, tax_rate, cumul_tax)
    VALUES
        (p_company_id, '2083-84', 'single', 1, 'First NPR 10 Lakh',     1000000, 0.00,      0),
        (p_company_id, '2083-84', 'single', 2, 'Next NPR 5 Lakh',        500000, 0.10,  50000),
        (p_company_id, '2083-84', 'single', 3, 'Next NPR 10 Lakh',      1000000, 0.20, 250000),
        (p_company_id, '2083-84', 'single', 4, 'Next NPR 15 Lakh',      1500000, 0.27, 655000),
        (p_company_id, '2083-84', 'single', 5, 'Exceeding NPR 40 Lakh',    NULL, 0.29,   NULL)
    ON CONFLICT (company_id, fiscal_year, taxpayer_type, slab_order) DO NOTHING;

    -- Couple slabs FY 2083-84
    INSERT INTO tax_slab_configs (company_id, fiscal_year, taxpayer_type, slab_order, description, upto_amount, tax_rate, cumul_tax)
    VALUES
        (p_company_id, '2083-84', 'couple', 1, 'First NPR 12 Lakh',     1200000, 0.00,       0),
        (p_company_id, '2083-84', 'couple', 2, 'Next NPR 2 Lakh',        200000, 0.10,   20000),
        (p_company_id, '2083-84', 'couple', 3, 'Next NPR 3 Lakh',        300000, 0.20,   80000),
        (p_company_id, '2083-84', 'couple', 4, 'Next NPR 9 Lakh',        900000, 0.30,  350000),
        (p_company_id, '2083-84', 'couple', 5, 'Next NPR 30 Lakh',      3000000, 0.36, 1430000),
        (p_company_id, '2083-84', 'couple', 6, 'Exceeding NPR 50 Lakh',    NULL, 0.39,    NULL)
    ON CONFLICT (company_id, fiscal_year, taxpayer_type, slab_order) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION fn_seed_tax_slabs_2083 IS
    'Call during company provisioning to seed FY 2083-84 Nepal income tax slabs.';


-- ══════════════════════════════════════════════════════════════
--  VIEWS
-- ══════════════════════════════════════════════════════════════

-- Department salary summary
CREATE OR REPLACE VIEW vw_dept_salary_summary AS
SELECT
    company_id, department, pay_month, fiscal_year,
    COUNT(*)                          AS staff_count,
    ROUND(SUM(basic_salary),2)        AS total_basic,
    ROUND(SUM(gross_salary),2)        AS total_gross,
    ROUND(SUM(ssf_total_employee),2)  AS total_ssf_employee,
    ROUND(SUM(ssf_total_employer),2)  AS total_ssf_employer,
    ROUND(SUM(cit_deduct),2)          AS total_cit,
    ROUND(SUM(monthly_tax),2)         AS total_tax_tds,
    ROUND(SUM(net_salary),2)          AS total_net_salary,
    ROUND(AVG(monthly_tax),2)         AS avg_tax_per_head,
    COUNT(*) FILTER (WHERE gender='Female') AS female_count,
    ROUND(SUM(female_tax_credit),2)   AS total_female_credit
FROM final_salary_sheets
GROUP BY company_id, department, pay_month, fiscal_year
ORDER BY pay_month DESC, total_net_salary DESC;

-- Tax bracket distribution
CREATE OR REPLACE VIEW vw_tax_bracket_distribution AS
SELECT
    company_id, pay_month, fiscal_year,
    COUNT(*) FILTER (WHERE taxable_income <= 1000000)                         AS bracket_0pct,
    COUNT(*) FILTER (WHERE taxable_income > 1000000 AND taxable_income <=1500000) AS bracket_10pct,
    COUNT(*) FILTER (WHERE taxable_income > 1500000 AND taxable_income <=2500000) AS bracket_20pct,
    COUNT(*) FILTER (WHERE taxable_income > 2500000 AND taxable_income <=4000000) AS bracket_27pct,
    COUNT(*) FILTER (WHERE taxable_income > 4000000)                          AS bracket_29pct,
    ROUND(SUM(total_tax_payable),2)  AS total_gross_tax,
    ROUND(SUM(female_tax_credit),2)  AS total_female_rebate,
    ROUND(SUM(net_tax_payable),2)    AS total_net_tax
FROM final_salary_sheets
GROUP BY company_id, pay_month, fiscal_year;

-- SSF contribution summary (for SSF filing)
CREATE OR REPLACE VIEW vw_ssf_contribution_summary AS
SELECT
    company_id, pay_month, department,
    COUNT(*)                         AS employees,
    ROUND(SUM(ssf_pf),2)            AS total_pf_employee,
    ROUND(SUM(ssf_gratuity),2)      AS total_gratuity_employee,
    ROUND(SUM(ssf_insurance),2)     AS total_insurance_employee,
    ROUND(SUM(ssf_total_employee),2) AS total_ssf_employee,
    ROUND(SUM(ssf_total_employer),2) AS total_ssf_employer,
    ROUND(SUM(ssf_total_employee + ssf_total_employer),2) AS grand_total_ssf
FROM final_salary_sheets
GROUP BY company_id, pay_month, department;

\echo '✅ eLogix Payroll & Tax Schema applied!'
\echo '   Tables: final_salary_sheets, tax_calculation_logs, tax_slab_configs'
\echo '   Trigger: fn_salary_auto_calc (auto-calculates all 65 fields)'
\echo '   Trigger: fn_salary_lock_check (blocks editing locked records)'
\echo '   Views: dept_salary_summary, tax_bracket_distribution, ssf_contribution_summary'
\echo '   Seed: fn_seed_tax_slabs_2083(company_id) — call during provisioning'
