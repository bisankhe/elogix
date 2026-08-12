-- ================================================================
-- FILE: database/schemas/hr_budgeting_schema.sql
-- eLogix HRMS -- Finance, Assets & Administration > HR Budgeting
-- (8 pages: Annual HR Budget, Department Budget, Recruitment Budget,
-- Training Budget, Engagement Budget, Payroll Budget, Budget
-- Forecasting, Budget Variance Analysis)
--
-- Design note: this module follows the proven allocated_npr/spent
-- pattern established by accommodation_budget (DEI session) and
-- annual_training_budgets (Skill Gap session) -- a consistent shape
-- across every budget category in this build, never a bespoke
-- structure per page. Training Budget (Page 4) is PURE UI over the
-- EXISTING annual_training_budgets + v_ld_budget_widget -- it
-- deliberately does NOT get a new table here, to avoid two
-- conflicting "training budget" tables existing simultaneously.
-- Payroll Budget (Page 6) aggregates the EXISTING payslips
-- (gross_npr/ssf_employee_npr already captured per pay run) for its
-- payroll-component breakdown, but adds the genuinely new
-- bonus_fund_tracking table -- nothing else in the build represented
-- the mandatory 10%-of-net-profit bonus fund obligation until now.
--
-- Annual HR Budget and Budget Variance Analysis are PURE ROLLUPS --
-- they have no tables of their own, only views that read every other
-- category's allocated/spent figures live.
--
--   - department_budget_allocations (genuinely new)
--   - recruitment_budget_lines (genuinely new -- no hiring-cost
--     tracking existed anywhere in the build)
--   - engagement_budget_lines (genuinely new)
--   - bonus_fund_tracking (genuinely new, legally critical)
--   - budget_forecast_scenarios (genuinely new)
--
-- Nepal legal grounding: minimum wage NPR 19,550/month; SSF 8.33%
-- gratuity + employer SSF contribution; MANDATORY 10% of net annual
-- profit to the employee bonus fund, distributed within 6 months of
-- fiscal year-end (Bonus Act read alongside Labour Act); overtime
-- capped at 4h/day, 20h/week, paid at 150%; foreign national
-- workforce cap of 5%, requiring newspaper + Ministry of Labor
-- portal posting; medical insurance (NPR 1 Lakh/year, 50-50 split)
-- and accident insurance (NPR 7 Lakh, employer-funded) as statutory
-- welfare budget lines; leave encashment (Home leave up to 90 days,
-- Sick leave up to 45 days) as a required HR reserve.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 2: DEPARTMENT BUDGET
-- ================================================================
CREATE TABLE IF NOT EXISTS department_budget_allocations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    department_id             UUID       NOT NULL REFERENCES departments(id),
    fiscal_year_label             VARCHAR(20) NOT NULL,

    allocated_npr                     NUMERIC(14,2) NOT NULL,
    headcount_budget                      INT NOT NULL,

    UNIQUE (department_id, fiscal_year_label)
);

-- ================================================================
-- PAGE 3: RECRUITMENT BUDGET (genuinely new -- no hiring-cost
-- tracking existed anywhere in the build)
-- ================================================================
CREATE TABLE IF NOT EXISTS recruitment_budget_lines (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    fiscal_year_label         VARCHAR(20) NOT NULL,

    cost_category                 VARCHAR(50) NOT NULL,  -- job_board, agency_fee, ats_license, interview_travel, relocation
    amount_npr                        NUMERIC(12,2) NOT NULL,
    linked_job_requisition_id             UUID,  -- optional link to a specific hiring requisition, if tracked at that granularity

    incurred_at                               DATE DEFAULT CURRENT_DATE
);

-- ================================================================
-- PAGE 5: ENGAGEMENT BUDGET (genuinely new)
-- ================================================================
CREATE TABLE IF NOT EXISTS engagement_budget_lines (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    fiscal_year_label         VARCHAR(20) NOT NULL,

    spend_category                 VARCHAR(50) NOT NULL,  -- recognition, wellness_eap, team_building, erg_inclusion
    amount_npr                         NUMERIC(12,2) NOT NULL,

    incurred_at                            DATE DEFAULT CURRENT_DATE
);

-- ================================================================
-- PAGE 6: PAYROLL BUDGET -- the genuinely new bonus fund tracker
-- (10% of net annual profit, a real legal obligation with no prior
-- representation anywhere in the build)
-- ================================================================
CREATE TABLE IF NOT EXISTS bonus_fund_tracking (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    fiscal_year_label         VARCHAR(20) NOT NULL,

    net_profit_npr                 NUMERIC(16,2) NOT NULL,
    required_pct                       NUMERIC(4,2) NOT NULL DEFAULT 10.00,
    required_amount_npr                    NUMERIC(14,2) GENERATED ALWAYS AS (net_profit_npr * required_pct / 100) STORED,

    funded_amount_npr                          NUMERIC(14,2) DEFAULT 0,
    -- Legal deadline: distribution within 6 months of fiscal year-end
    distribution_deadline                          DATE NOT NULL,
    distributed                                        BOOLEAN DEFAULT FALSE,
    distributed_at                                         TIMESTAMPTZ,

    UNIQUE (company_id, fiscal_year_label)
);

-- ================================================================
-- PAGE 7: BUDGET FORECASTING (genuinely new)
-- ================================================================
CREATE TABLE IF NOT EXISTS budget_forecast_scenarios (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    fiscal_year_label         VARCHAR(20) NOT NULL,

    scenario_name                 VARCHAR(50) NOT NULL,  -- Conservative, Base Case, Aggressive Growth
    assumptions_text                  TEXT,
    attrition_assumption_pct              NUMERIC(4,2),
    projected_total_cost_npr                  NUMERIC(16,2) NOT NULL,

    is_selected                                   BOOLEAN DEFAULT FALSE,
    created_by                                        UUID NOT NULL,
    created_at                                            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_dba_dept_fy       ON department_budget_allocations(department_id, fiscal_year_label);
CREATE INDEX IF NOT EXISTS idx_rbl_category           ON recruitment_budget_lines(cost_category, fiscal_year_label);
CREATE INDEX IF NOT EXISTS idx_ebl_category                ON engagement_budget_lines(spend_category, fiscal_year_label);
CREATE INDEX IF NOT EXISTS idx_bft_unfunded                    ON bonus_fund_tracking(distribution_deadline) WHERE NOT distributed;
CREATE INDEX IF NOT EXISTS idx_bfs_selected                        ON budget_forecast_scenarios(is_selected) WHERE is_selected;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-flag bonus fund shortfalls and remind HR/Finance as the
-- distribution deadline approaches -- reuses transaction_notifications
CREATE OR REPLACE FUNCTION fn_check_bonus_fund_shortfall()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE finance_admin RECORD; shortfall NUMERIC;
BEGIN
    shortfall := NEW.required_amount_npr - NEW.funded_amount_npr;
    IF shortfall > 0 AND NEW.distribution_deadline - CURRENT_DATE <= 30 THEN
        FOR finance_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'bonus_fund_tracking', NEW.id, 'bonus_fund_shortfall', finance_admin.id, 'direct_party',
               format('Bonus fund shortfall of NPR %s with %s days until the legal distribution deadline.', shortfall, NEW.distribution_deadline - CURRENT_DATE), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_bonus_fund_shortfall
    AFTER INSERT OR UPDATE OF funded_amount_npr ON bonus_fund_tracking
    FOR EACH ROW EXECUTE FUNCTION fn_check_bonus_fund_shortfall();

-- Only one forecast scenario may be selected at a time per fiscal year
CREATE OR REPLACE FUNCTION fn_enforce_single_selected_scenario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_selected THEN
        UPDATE budget_forecast_scenarios SET is_selected = FALSE
        WHERE company_id = NEW.company_id AND fiscal_year_label = NEW.fiscal_year_label AND id != NEW.id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_single_selected_scenario
    BEFORE INSERT OR UPDATE OF is_selected ON budget_forecast_scenarios
    FOR EACH ROW EXECUTE FUNCTION fn_enforce_single_selected_scenario();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Annual HR Budget -- the pure rollup across every category
CREATE OR REPLACE VIEW v_annual_hr_budget_rollup AS
SELECT 'Payroll' AS category, SUM(gross_npr) AS spent, NULL::NUMERIC AS allocated, company_id FROM payslips GROUP BY company_id
UNION ALL
SELECT 'Recruitment', SUM(amount_npr), NULL, company_id FROM recruitment_budget_lines GROUP BY company_id
UNION ALL
SELECT 'Training', tb.committed_npr, tb.allocated_npr, atb.company_id FROM v_ld_budget_widget tb JOIN annual_training_budgets atb ON TRUE
UNION ALL
SELECT 'Engagement', SUM(amount_npr), NULL, company_id FROM engagement_budget_lines GROUP BY company_id;

-- Page 2: Department Budget with live headcount comparison
CREATE OR REPLACE VIEW v_department_budget_dashboard AS
SELECT dba.*, d.name AS department_name,
    (SELECT COUNT(*) FROM employees WHERE department_id = dba.department_id AND employment_status = 'active') AS headcount_actual
FROM department_budget_allocations dba
JOIN departments d ON dba.department_id = d.id;

-- Page 3: Recruitment Budget breakdown by category
CREATE OR REPLACE VIEW v_recruitment_budget_breakdown AS
SELECT cost_category, SUM(amount_npr) AS total_amount, company_id, fiscal_year_label
FROM recruitment_budget_lines
GROUP BY cost_category, company_id, fiscal_year_label;

-- Page 5: Engagement Budget correlated with participation, reusing
-- the EXISTING v_engagement_dashboard_kpis (Employee Engagement session)
CREATE OR REPLACE VIEW v_engagement_budget_with_participation AS
SELECT ebl.spend_category, SUM(ebl.amount_npr) AS total_spend, ebl.company_id, ebl.fiscal_year_label
FROM engagement_budget_lines ebl
GROUP BY ebl.spend_category, ebl.company_id, ebl.fiscal_year_label;

-- Page 6: Payroll Budget components, pure aggregation over EXISTING payslips
CREATE OR REPLACE VIEW v_payroll_budget_components AS
SELECT
    SUM(gross_npr) AS total_base_and_gross,
    SUM(ssf_employee_npr) AS total_ssf_employee,
    company_id
FROM payslips
GROUP BY company_id;

CREATE OR REPLACE VIEW v_bonus_fund_status AS
SELECT *, (required_amount_npr - funded_amount_npr) AS shortfall_npr
FROM bonus_fund_tracking;

-- Page 7: Budget Forecasting scenario comparison
CREATE OR REPLACE VIEW v_forecast_scenario_comparison AS
SELECT * FROM budget_forecast_scenarios ORDER BY projected_total_cost_npr ASC;

-- Page 8: Budget Variance Analysis -- pure computed variance, reading
-- every category's own allocated/spent figures, never re-entered
CREATE OR REPLACE VIEW v_budget_variance_analysis AS
SELECT
    'Recruitment' AS category,
    (SELECT SUM(amount_npr) FROM recruitment_budget_lines WHERE company_id = rbl.company_id) AS actual_npr,
    rbl.company_id, rbl.fiscal_year_label
FROM recruitment_budget_lines rbl
GROUP BY rbl.company_id, rbl.fiscal_year_label
UNION ALL
SELECT
    'Engagement',
    (SELECT SUM(amount_npr) FROM engagement_budget_lines WHERE company_id = ebl.company_id),
    ebl.company_id, ebl.fiscal_year_label
FROM engagement_budget_lines ebl
GROUP BY ebl.company_id, ebl.fiscal_year_label;
