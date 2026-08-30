-- ============================================================
-- FILE: database/schemas/employment_category_schema.sql
-- PURPOSE: Employment Category & Classification System
--          Nepal Labour Act 2074 (Section 10) compliant
--          Global best practice: Two-tier taxonomy
--          (Category + Classification/Sub-Category)
-- COMPLIANCE: Nepal Labour Act 2074, Labour Rules 2075,
--             GDPR, ISO 27001, global HR standards
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLE 1: employment_categories
-- PURPOSE: Master category definitions (Tier 1)
--          Defines how someone works + legal classification
-- ============================================================
CREATE TABLE employment_categories (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL,

    -- Identity
    code                    VARCHAR(30)  NOT NULL,      -- 'REGULAR','PROBATION','CONTRACT'
    name                    VARCHAR(100) NOT NULL,      -- 'Regular / Permanent'
    name_nepali             VARCHAR(100),               -- 'नियमित / स्थायी'
    short_name              VARCHAR(30),
    description             TEXT,
    description_nepali      TEXT,
    icon                    VARCHAR(10) DEFAULT '👤',
    color                   VARCHAR(7)  DEFAULT '#3b82f6',
    display_order           INTEGER DEFAULT 0,

    -- Two-tier taxonomy (Workday/Oracle global standard)
    tier1_category          VARCHAR(30)                 -- 'full_time_regular','full_time_temporary'
                            CHECK (tier1_category IN (
                                'full_time_regular','full_time_temporary',
                                'part_time_regular','part_time_temporary',
                                'contingent','external'
                            )),
    tier2_classification    VARCHAR(30)                 -- 'exempt','non_exempt','contractor'
                            CHECK (tier2_classification IN (
                                'exempt','non_exempt','intern',
                                'contractor','freelance','vendor',
                                'daily_wage','trainee'
                            )),

    -- Nepal Labour Act 2074 Section 10 mapping
    nepal_law_category      VARCHAR(30)
                            CHECK (nepal_law_category IN (
                                'regular',          -- Section 10(a)
                                'work_based',       -- Section 10(b)
                                'time_bound',       -- Section 10(c)
                                'casual',           -- Section 10(d) ≤7 days/month
                                'part_time',        -- Section 10(e) ≤35hrs/week
                                'intern',           -- educational institution
                                'probation',        -- max 6 months (Nepal) / 1 year
                                'outsource',        -- via licensed agency
                                'consultant'        -- via Accounts Payable
                            )),
    is_written_contract_req BOOLEAN DEFAULT true,      -- casual = false per LA2074

    -- Payroll / Benefits classification
    payroll_type            VARCHAR(20) DEFAULT 'direct'
                            CHECK (payroll_type IN (
                                'direct',           -- regular payroll
                                'prorated',         -- part-time / casual
                                'stipend',          -- intern / trainee
                                'daily',            -- daily wage
                                'vendor_ap',        -- accounts payable (outsource/consultant)
                                'not_applicable'
                            )),
    is_on_payroll           BOOLEAN DEFAULT true,
    payroll_ledger_type     VARCHAR(20) DEFAULT 'employee'
                            CHECK (payroll_ledger_type IN (
                                'employee','contingent','vendor','none'
                            )),

    -- FTE (Full-Time Equivalent) — global standard
    fte_value               NUMERIC(3,2) DEFAULT 1.00
                            CHECK (fte_value BETWEEN 0.01 AND 1.00),
    standard_hours_per_week NUMERIC(4,1) DEFAULT 48.0, -- Nepal: 48hrs/week max

    -- Probation settings
    has_probation           BOOLEAN DEFAULT false,
    probation_months_max    INTEGER,                   -- Nepal max: 6 months (LA2074)
    auto_confirm_on_complete BOOLEAN DEFAULT false,

    -- Contract / End Date settings
    requires_end_date       BOOLEAN DEFAULT false,
    expiry_alert_days       INTEGER DEFAULT 60,        -- alert 60 days before expiry
    auto_renewal_workflow   BOOLEAN DEFAULT false,
    auto_offboard_on_expiry BOOLEAN DEFAULT false,

    -- Nepal-specific time limits
    max_duration_months     INTEGER,                   -- casual: 7 days/month
    max_hours_per_week      NUMERIC(4,1),              -- part-time: 35hrs max

    -- Benefits eligibility (auto-triggers)
    eligible_gratuity       BOOLEAN DEFAULT false,     -- Nepal: regular only
    eligible_pf             BOOLEAN DEFAULT true,      -- Provident Fund
    eligible_ssf            BOOLEAN DEFAULT true,      -- Social Security Fund
    eligible_medical        BOOLEAN DEFAULT false,
    eligible_leave          BOOLEAN DEFAULT false,
    eligible_annual_leave   BOOLEAN DEFAULT false,
    eligible_sick_leave     BOOLEAN DEFAULT false,
    eligible_maternity      BOOLEAN DEFAULT false,
    eligible_paternity      BOOLEAN DEFAULT false,
    leave_proration_pct     NUMERIC(5,2) DEFAULT 100.00, -- 100% full, 50% half etc.

    -- Onboarding workflow
    onboarding_template_id  UUID,
    required_documents      JSONB,                     -- list of required docs to collect
    auto_create_ess         BOOLEAN DEFAULT true,      -- create ESS portal
    auto_create_email       BOOLEAN DEFAULT false,     -- create company email
    auto_assign_equipment   BOOLEAN DEFAULT false,

    -- RBAC — what this category can access
    rbac_profile            VARCHAR(30) DEFAULT 'standard'
                            CHECK (rbac_profile IN (
                                'full','standard','limited',
                                'project_only','external_only'
                            )),
    can_access_payroll      BOOLEAN DEFAULT false,
    can_access_org_chart    BOOLEAN DEFAULT true,
    can_access_hr_policies  BOOLEAN DEFAULT true,

    -- Headcount / Quota planning
    counts_in_headcount     BOOLEAN DEFAULT true,
    counts_in_fte_report    BOOLEAN DEFAULT true,
    counts_as_foreign_quota BOOLEAN DEFAULT false,     -- for Nepal foreign worker 5% rule

    -- Tax / compliance flags
    subject_to_tds          BOOLEAN DEFAULT true,      -- TDS deduction
    subject_to_pf           BOOLEAN DEFAULT true,
    subject_to_ssf          BOOLEAN DEFAULT true,
    subject_to_cit          BOOLEAN DEFAULT false,     -- Corporate Income Tax (consultants)
    requires_work_permit    BOOLEAN DEFAULT false,

    -- Compliance alerts
    requires_labour_audit   BOOLEAN DEFAULT true,
    protected_category      BOOLEAN DEFAULT false,     -- union / protected class

    -- AI metadata
    ai_risk_level           VARCHAR(10) DEFAULT 'low'
                            CHECK (ai_risk_level IN ('low','medium','high','critical')),
    ai_compliance_notes     TEXT,
    ai_misclassification_risk TEXT,

    -- Status
    is_active               BOOLEAN DEFAULT true,
    is_system_defined       BOOLEAN DEFAULT false,     -- built-in Nepal law categories
    is_custom               BOOLEAN DEFAULT false,

    -- Audit
    created_by              UUID,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_empcat_tenant ON employment_categories(tenant_id);
CREATE INDEX idx_empcat_law    ON employment_categories(nepal_law_category);
CREATE INDEX idx_empcat_active ON employment_categories(is_active);

-- ============================================================
-- TABLE 2: employment_category_rules
-- PURPOSE: Auto-trigger rules per category
--          Probation → Permanent conversion, expiry alerts etc.
-- ============================================================
CREATE TABLE employment_category_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    category_id     UUID NOT NULL REFERENCES employment_categories(id),

    rule_type       VARCHAR(40) NOT NULL
                    CHECK (rule_type IN (
                        'probation_review',         -- trigger review at X months
                        'probation_conversion',     -- convert to permanent
                        'contract_expiry_alert',    -- alert before expiry
                        'contract_auto_extend',     -- auto-extend contract
                        'contract_offboard',        -- trigger offboarding
                        'benefit_trigger',          -- enable benefits after X days
                        'leave_accrual_start',      -- when leave starts accruing
                        'confirmation_letter',      -- send confirmation
                        'performance_review',       -- schedule review
                        'custom'
                    )),

    trigger_days    INTEGER,                        -- days before/after event
    trigger_event   VARCHAR(40),                    -- 'join_date','probation_end','contract_end'
    action_type     VARCHAR(40),                    -- 'notify','create_task','change_category'
    action_target   VARCHAR(40),                    -- 'hr','manager','employee','system'
    action_data     JSONB,                          -- action configuration
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: employee_employment_records
-- PURPOSE: Tracks employment category history per employee
--          Every category change is versioned
-- ============================================================
CREATE TABLE employee_employment_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    employee_id         UUID NOT NULL,
    category_id         UUID NOT NULL REFERENCES employment_categories(id),

    -- Dates
    effective_from      DATE NOT NULL,
    effective_to        DATE,                           -- null = current/open-ended
    contract_start_date DATE,
    contract_end_date   DATE,                           -- for time-bound, work-based
    probation_end_date  DATE,                           -- if on probation

    -- Status
    status              VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN (
                            'active','converted','expired',
                            'terminated','on_hold','completed'
                        )),
    is_current          BOOLEAN DEFAULT true,

    -- Probation tracking
    probation_review_date DATE,
    probation_outcome    VARCHAR(20)                    -- 'confirmed','extended','terminated'
                        CHECK (probation_outcome IN (
                            'confirmed','extended','terminated',NULL
                        )),
    probation_notes      TEXT,

    -- Contract details
    contract_number     VARCHAR(50),
    contract_type       VARCHAR(30),                   -- 'work_based','time_bound'
    project_name        VARCHAR(200),                  -- for work-based
    project_id          UUID,
    work_scope          TEXT,                          -- deliverables for work-based

    -- Renewal tracking
    renewal_count       INTEGER DEFAULT 0,
    original_start_date DATE,                          -- first ever employment date
    alert_sent_30d      BOOLEAN DEFAULT false,
    alert_sent_60d      BOOLEAN DEFAULT false,
    alert_sent_90d      BOOLEAN DEFAULT false,

    -- Compensation
    fte_value           NUMERIC(3,2) DEFAULT 1.00,
    hours_per_week      NUMERIC(4,1),
    salary_type         VARCHAR(20),                   -- 'monthly','daily','hourly','stipend'
    daily_rate          NUMERIC(10,2),
    hourly_rate         NUMERIC(10,2),
    monthly_salary      NUMERIC(12,2),

    -- For outsource / consultant
    vendor_id           UUID,
    vendor_name         VARCHAR(200),
    po_number           VARCHAR(50),                   -- Purchase Order number
    invoice_basis       VARCHAR(20),                   -- 'fixed','hourly','milestone'

    -- Change tracking
    previous_record_id  UUID REFERENCES employee_employment_records(id),
    changed_by          UUID,
    change_reason       TEXT,
    approved_by         UUID,
    approved_at         TIMESTAMPTZ,

    -- AI
    ai_risk_flags       JSONB,
    misclassification_flag BOOLEAN DEFAULT false,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emp_record_employee  ON employee_employment_records(employee_id);
CREATE INDEX idx_emp_record_category  ON employee_employment_records(category_id);
CREATE INDEX idx_emp_record_current   ON employee_employment_records(is_current);
CREATE INDEX idx_emp_record_expiry    ON employee_employment_records(contract_end_date);

-- ============================================================
-- TABLE 4: headcount_plan
-- PURPOSE: Annual manpower / darbadi quota planning
--          Per department + employment category
-- ============================================================
CREATE TABLE headcount_plan (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    fiscal_year         VARCHAR(10) NOT NULL,           -- '2081-82' (Nepal BS)
    department_id       UUID,
    category_id         UUID NOT NULL REFERENCES employment_categories(id),

    -- Quota
    approved_headcount  INTEGER DEFAULT 0,              -- Darbadi
    current_filled      INTEGER DEFAULT 0,              -- Ex-filled
    vacant_positions    INTEGER GENERATED ALWAYS AS
                        (approved_headcount - current_filled) STORED,
    fte_budget          NUMERIC(6,2) DEFAULT 0,

    -- Budget
    salary_budget       NUMERIC(14,2) DEFAULT 0,
    ytd_spend           NUMERIC(14,2) DEFAULT 0,
    currency_code       VARCHAR(5) DEFAULT 'NPR',

    -- Nepal Labour Act compliance
    is_foreign_quota    BOOLEAN DEFAULT false,
    foreign_worker_count INTEGER DEFAULT 0,             -- must be ≤5% total

    -- Status
    status              VARCHAR(20) DEFAULT 'draft'
                        CHECK (status IN ('draft','approved','active','closed')),

    approved_by         UUID,
    approved_at         TIMESTAMPTZ,
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, fiscal_year, department_id, category_id)
);

-- ============================================================
-- VIEW: v_employment_category_stats
-- Real-time headcount by category
-- ============================================================
CREATE OR REPLACE VIEW v_employment_category_stats AS
SELECT
    ec.tenant_id,
    ec.id           AS category_id,
    ec.code,
    ec.name,
    ec.icon,
    ec.color,
    ec.nepal_law_category,
    ec.payroll_type,
    ec.fte_value,
    COUNT(er.id)    AS employee_count,
    SUM(er.fte_value) AS total_fte,
    COUNT(er.id) FILTER (
        WHERE er.contract_end_date IS NOT NULL
          AND er.contract_end_date <= CURRENT_DATE + INTERVAL '60 days'
          AND er.contract_end_date > CURRENT_DATE
    )               AS expiring_60d,
    COUNT(er.id) FILTER (
        WHERE er.probation_end_date IS NOT NULL
          AND er.probation_end_date <= CURRENT_DATE + INTERVAL '30 days'
          AND er.probation_end_date > CURRENT_DATE
    )               AS probation_due_30d
FROM employment_categories ec
LEFT JOIN employee_employment_records er
    ON er.category_id = ec.id
    AND er.is_current = true
    AND er.status = 'active'
WHERE ec.is_active = true
GROUP BY ec.tenant_id, ec.id, ec.code, ec.name,
         ec.icon, ec.color, ec.nepal_law_category,
         ec.payroll_type, ec.fte_value;

-- ============================================================
-- FUNCTION: fn_check_nepal_compliance
-- Validates employment record against Nepal Labour Act 2074
-- ============================================================
CREATE OR REPLACE FUNCTION fn_check_nepal_compliance(
    p_category_code     VARCHAR,
    p_hours_per_week    NUMERIC,
    p_days_per_month    INTEGER,
    p_probation_months  INTEGER,
    p_is_foreign        BOOLEAN
) RETURNS TABLE (
    is_compliant    BOOLEAN,
    violations      JSONB,
    warnings        JSONB
) AS $$
DECLARE
    v_violations JSONB := '[]';
    v_warnings   JSONB := '[]';
BEGIN
    -- Part-time: max 35 hrs/week (LA2074 Section 10e)
    IF p_category_code = 'PART_TIME' AND p_hours_per_week > 35 THEN
        v_violations := v_violations || '["Part-time must be ≤35 hrs/week (Labour Act 2074 Section 10e)"]';
    END IF;

    -- Casual: max 7 days/month (LA2074 Section 10d)
    IF p_category_code = 'CASUAL' AND p_days_per_month > 7 THEN
        v_violations := v_violations || '["Casual employment must be ≤7 days/month (Labour Act 2074 Section 10d)"]';
    END IF;

    -- Probation: max 6 months (LA2074)
    IF p_probation_months IS NOT NULL AND p_probation_months > 6 THEN
        v_warnings := v_warnings || '["Probation period exceeds 6 months — Nepal max is 6 months (Labour Act 2074)"]';
    END IF;

    -- Standard hours: max 48/week (LA2074 Section 28)
    IF p_hours_per_week > 48 THEN
        v_violations := v_violations || '["Working hours exceed 48 hrs/week maximum (Labour Act 2074 Section 28)"]';
    END IF;

    RETURN QUERY SELECT
        jsonb_array_length(v_violations) = 0,
        v_violations,
        v_warnings;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED: Nepal Labour Act 2074 — Default Employment Categories
-- Run once per tenant after creation
-- ============================================================
-- INSERT INTO employment_categories (tenant_id, code, name, name_nepali, ...) VALUES
-- ('...', 'REGULAR',    'Regular / Permanent',   'नियमित / स्थायी',   ...),
-- ('...', 'PROBATION',  'Probation',              'परीक्षाकाल',         ...),
-- ('...', 'CONTRACT_WB','Contract – Work-Based',  'कार्य-आधारित',       ...),
-- ('...', 'CONTRACT_TB','Contract – Time-Bound',  'समय-सीमित',          ...),
-- ('...', 'CASUAL',     'Casual Employment',      'अस्थायी',            ...),
-- ('...', 'PART_TIME',  'Part-Time Employment',   'अल्पकालीन',          ...),
-- ('...', 'INTERN',     'Intern',                 'इन्टर्न',            ...),
-- ('...', 'TRAINEE',    'Trainee',                'प्रशिक्षार्थी',     ...),
-- ('...', 'DAILY_WAGE', 'Daily Wage',             'दैनिक ज्यालादारी', ...),
-- ('...', 'OUTSOURCE',  'Outsource',              'आउटसोर्स',           ...),
-- ('...', 'CONSULTANT', 'Consultant',             'परामर्शदाता',        ...);
