-- ============================================================
-- FILE: database/schemas/workforce_schema.sql
-- eLogix HRMS — Dedicated Workforce Configuration Schema
-- Covers: Insource config, Outsource vendor, SLA & Contract,
--         Vendor Employees, Billing & Invoice,
--         Vendor Attendance, Vendor Performance
-- Nepal Labour Act 2074 Sections 52–60 enforced at DB level
-- This file is a standalone for the Outsource module only.
-- Master schema in complete_schema.sql includes this.
-- ============================================================

-- Prerequisites: companies table must exist

-- ============================================================
-- EMPLOYMENT TYPE — INSOURCE CONFIGURATION
-- ============================================================
CREATE TABLE IF NOT EXISTS employment_type_configs (
    id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                UUID          NOT NULL REFERENCES companies(id),
    emp_category_code         VARCHAR(30)   NOT NULL,
    is_enabled                BOOLEAN       DEFAULT TRUE,
    custom_name               VARCHAR(200),
    probation_months_override INT           CHECK (probation_months_override IS NULL OR probation_months_override <= 6),
    notice_period_days        INT           DEFAULT 30,
    min_wage_override_npr     NUMERIC(12,2) CHECK (min_wage_override_npr IS NULL OR min_wage_override_npr >= 15000),
    auto_alert_days_before    INT           DEFAULT 30,
    benefits_matrix_override  JSONB         DEFAULT '{}',
    ai_misclassification_risk FLOAT,
    created_at                TIMESTAMPTZ   DEFAULT NOW(),
    updated_at                TIMESTAMPTZ   DEFAULT NOW(),
    UNIQUE (company_id, emp_category_code)
);

-- ============================================================
-- OUTSOURCE VENDOR — MoLESS Licensed Agency (Section 52)
-- ============================================================
CREATE TABLE IF NOT EXISTS outsource_vendors (
    id                         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                 UUID         NOT NULL REFERENCES companies(id),
    vendor_code                VARCHAR(30)  NOT NULL,
    vendor_name                VARCHAR(200) NOT NULL,
    vendor_name_nepali         VARCHAR(200),
    short_name                 VARCHAR(80),
    service_category           VARCHAR(100),
    -- Nepal Labour Act 2074, Section 52
    moless_license_no          VARCHAR(100) NOT NULL,  -- Mandatory
    moless_license_expiry      DATE,
    is_licensed_agency         BOOLEAN      DEFAULT FALSE,
    agency_pan                 VARCHAR(20),
    agency_registration_no     VARCHAR(50),
    -- Contact
    contact_person             VARCHAR(200),
    contact_email              VARCHAR(255),
    contact_phone              VARCHAR(50),
    address                    TEXT,
    -- AI Performance Summary
    overall_performance_score  FLOAT        DEFAULT 0 CHECK (overall_performance_score BETWEEN 0 AND 100),
    overall_risk_level         VARCHAR(20)  DEFAULT 'low',
    total_workers_deployed     INT          DEFAULT 0,
    active_contracts_count     INT          DEFAULT 0,
    status                     VARCHAR(20)  DEFAULT 'active',
    ai_vendor_insights         JSONB        DEFAULT '{}',
    ai_last_scored             TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  DEFAULT NOW(),
    created_by                 UUID,
    is_deleted                 BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, vendor_code),
    CONSTRAINT ck_vendor_moless_required CHECK (moless_license_no IS NOT NULL AND moless_license_no != '')
);

-- ============================================================
-- SLA & CONTRACT
-- ============================================================
CREATE TABLE IF NOT EXISTS sla_contracts (
    id                         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                 UUID         NOT NULL REFERENCES companies(id),
    vendor_id                  UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_number            VARCHAR(50)  NOT NULL,
    contract_name              VARCHAR(200),
    service_type               VARCHAR(100) NOT NULL,
    contract_type              VARCHAR(50),
    start_date                 DATE         NOT NULL,
    end_date                   DATE         NOT NULL,
    renewal_alert_days         INT          DEFAULT 90,
    auto_renewal               BOOLEAN      DEFAULT FALSE,
    -- Financials
    total_contract_value_npr   NUMERIC(15,2),
    monthly_billing_rate_npr   NUMERIC(12,2),
    rate_per_worker_per_day    NUMERIC(10,2),
    billing_cycle              VARCHAR(20)  DEFAULT 'monthly',
    -- Headcount
    max_workers_allowed        INT          NOT NULL,
    min_workers_guaranteed     INT          DEFAULT 0,
    current_workers_deployed   INT          DEFAULT 0,
    -- Nepal Labour Act 2074 legal obligations (all TRUE by default)
    ensures_min_wage           BOOLEAN      DEFAULT TRUE,   -- NPR 15,000/month
    ensures_ssf_payment        BOOLEAN      DEFAULT TRUE,   -- 3.33% employer
    ensures_insurance          BOOLEAN      DEFAULT TRUE,
    non_core_work_only         BOOLEAN      DEFAULT TRUE,   -- Section 52(2)
    main_employer_co_liable    BOOLEAN      DEFAULT TRUE,   -- Section 55
    -- SLA Configuration
    sla_kpis                   JSONB        DEFAULT '[]',
    key_clauses                JSONB        DEFAULT '[]',
    penalty_clauses            JSONB        DEFAULT '[]',
    termination_notice_days    INT          DEFAULT 30,
    overall_compliance_pct     FLOAT        DEFAULT 100,
    status                     VARCHAR(20)  DEFAULT 'active',
    contract_pdf_url           VARCHAR(500),
    ai_risk_assessment         JSONB        DEFAULT '{}',
    ai_renewal_recommendation  TEXT,
    created_at                 TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  DEFAULT NOW(),
    created_by                 UUID,
    approved_by                UUID,
    approved_at                TIMESTAMPTZ,
    is_deleted                 BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, contract_number),
    CHECK (end_date > start_date),
    CHECK (max_workers_allowed > 0)
);

-- KPI monthly results
CREATE TABLE IF NOT EXISTS sla_kpi_results (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID        NOT NULL REFERENCES sla_contracts(id) ON DELETE CASCADE,
    company_id      UUID        NOT NULL REFERENCES companies(id),
    vendor_id       UUID        NOT NULL REFERENCES outsource_vendors(id),
    period_month    INT         NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year     INT         NOT NULL,
    kpi_name        VARCHAR(100) NOT NULL,
    kpi_unit        VARCHAR(20),
    target_value    NUMERIC(10,4),
    actual_value    NUMERIC(10,4),
    is_met          BOOLEAN,
    variance        NUMERIC(10,4) GENERATED ALWAYS AS (actual_value - target_value) STORED,
    weight_pct      NUMERIC(5,2),
    score           NUMERIC(5,2),
    ai_root_cause   TEXT,
    ai_action_items JSONB       DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (contract_id, period_year, period_month, kpi_name)
);

-- ============================================================
-- VENDOR EMPLOYEES (Extended Workforce — NOT on main payroll)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_employees (
    id                         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                 UUID         NOT NULL REFERENCES companies(id),
    vendor_id                  UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_id                UUID         REFERENCES sla_contracts(id),
    -- VE- prefix: visual distinction from direct employees
    vendor_emp_id              VARCHAR(30)  NOT NULL,
    name                       VARCHAR(200) NOT NULL,
    name_nepali                VARCHAR(200),
    role                       VARCHAR(100),
    service_category           VARCHAR(100),
    -- Assignment
    assigned_location          VARCHAR(200),
    assigned_branch_id         UUID,
    shift_type                 VARCHAR(30),
    shift_start                TIME,
    shift_end                  TIME,
    join_date                  DATE,
    assignment_end_date        DATE,
    -- Compliance Verification (LA 2074 Section 55 — main employer obligations)
    id_verified                BOOLEAN      DEFAULT FALSE,
    bg_verified                BOOLEAN      DEFAULT FALSE,
    bg_verified_date           DATE,
    insurance_active           BOOLEAN      DEFAULT FALSE,
    insurance_verified_date    DATE,
    ssf_paid_current_month     BOOLEAN      DEFAULT FALSE,
    ssf_last_verified_date     DATE,
    min_wage_compliant         BOOLEAN      DEFAULT TRUE,
    -- Compensation (agency pays; main employer verifies)
    monthly_wage_npr           NUMERIC(10,2) CHECK (monthly_wage_npr IS NULL OR monthly_wage_npr >= 15000),
    daily_rate_npr             NUMERIC(10,2),
    -- Access (deliberately limited vs direct employees)
    has_badge_access           BOOLEAN      DEFAULT FALSE,
    has_system_access          BOOLEAN      DEFAULT FALSE,   -- Must remain FALSE
    access_areas               TEXT[]       DEFAULT '{}',
    -- AI
    ai_ghost_risk_score        FLOAT        DEFAULT 0 CHECK (ai_ghost_risk_score BETWEEN 0 AND 100),
    ai_compliance_score        FLOAT        DEFAULT 100,
    ai_flags                   JSONB        DEFAULT '[]',
    status                     VARCHAR(20)  DEFAULT 'active',
    created_at                 TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  DEFAULT NOW(),
    created_by                 UUID,
    is_deleted                 BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, vendor_emp_id)
);

-- ============================================================
-- BILLING & INVOICE
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_invoices (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID         NOT NULL REFERENCES companies(id),
    vendor_id                   UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_id                 UUID         NOT NULL REFERENCES sla_contracts(id),
    invoice_number              VARCHAR(50)  NOT NULL,
    invoice_period_month        INT          NOT NULL CHECK (invoice_period_month BETWEEN 1 AND 12),
    invoice_period_year         INT          NOT NULL,
    issue_date                  DATE         NOT NULL,
    due_date                    DATE         NOT NULL,
    payment_date                DATE,
    -- Billing details
    workers_billed              INT,
    days_billed                 INT,
    rate_per_day_npr            NUMERIC(10,2),
    amount_before_tax_npr       NUMERIC(12,2) NOT NULL,
    tds_rate_pct                NUMERIC(5,2)  DEFAULT 1.5,  -- Nepal TDS on services
    tds_amount_npr              NUMERIC(12,2) DEFAULT 0,
    total_amount_npr            NUMERIC(12,2) NOT NULL,
    -- AI Cross-Validation (timesheet vs attendance vs contract rate)
    timesheet_amount_npr        NUMERIC(12,2),
    attendance_amount_npr       NUMERIC(12,2),
    discrepancy_amount_npr      NUMERIC(12,2) GENERATED ALWAYS AS (
                                  CASE WHEN timesheet_amount_npr IS NOT NULL
                                  THEN total_amount_npr - timesheet_amount_npr
                                  ELSE 0 END) STORED,
    has_discrepancy             BOOLEAN      DEFAULT FALSE,
    ai_validated                BOOLEAN      DEFAULT FALSE,
    ai_validation_result        TEXT,
    ai_validated_at             TIMESTAMPTZ,
    ai_fraud_risk_score         FLOAT        DEFAULT 0,
    -- Approval workflow
    timesheet_approved          BOOLEAN      DEFAULT FALSE,
    timesheet_approved_by       UUID,
    timesheet_approved_at       TIMESTAMPTZ,
    attendance_verified         BOOLEAN      DEFAULT FALSE,
    attendance_verified_by      UUID,
    -- Status
    status                      VARCHAR(30)  DEFAULT 'pending_approval'
                                CHECK (status IN ('draft','submitted','pending_approval',
                                  'approved','disputed','paid','rejected')),
    dispute_reason              TEXT,
    dispute_raised_by           UUID,
    dispute_raised_at           TIMESTAMPTZ,
    dispute_resolved_at         TIMESTAMPTZ,
    approved_by                 UUID,
    approved_at                 TIMESTAMPTZ,
    payment_reference           VARCHAR(100),
    invoice_pdf_url             VARCHAR(500),
    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW(),
    is_deleted                  BOOLEAN      DEFAULT FALSE,
    UNIQUE (company_id, invoice_number),
    CHECK (due_date >= issue_date),
    CHECK (total_amount_npr >= 0)
);

-- ============================================================
-- VENDOR ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_attendance (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID         NOT NULL REFERENCES companies(id),
    vendor_id            UUID         NOT NULL REFERENCES outsource_vendors(id),
    vendor_employee_id   UUID         NOT NULL REFERENCES vendor_employees(id),
    contract_id          UUID         REFERENCES sla_contracts(id),
    invoice_id           UUID         REFERENCES vendor_invoices(id),
    attendance_date      DATE         NOT NULL,
    period_month         INT          GENERATED ALWAYS AS (EXTRACT(MONTH FROM attendance_date)::INT) STORED,
    period_year          INT          GENERATED ALWAYS AS (EXTRACT(YEAR  FROM attendance_date)::INT) STORED,
    shift_type           VARCHAR(30),
    check_in_time        TIMESTAMPTZ,
    check_out_time       TIMESTAMPTZ,
    hours_worked         FLOAT        GENERATED ALWAYS AS (
                           CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL
                           THEN ROUND(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600.0, 2)
                           ELSE NULL END
                         ) STORED,
    overtime_hours       FLOAT        DEFAULT 0,
    -- Attendance status
    is_present           BOOLEAN      DEFAULT FALSE,
    is_absent            BOOLEAN      DEFAULT FALSE,
    is_late              BOOLEAN      DEFAULT FALSE,
    late_minutes         INT          DEFAULT 0,
    is_half_day          BOOLEAN      DEFAULT FALSE,
    leave_type           VARCHAR(50),
    -- Verification
    biometric_verified   BOOLEAN      DEFAULT FALSE,
    gps_verified         BOOLEAN      DEFAULT FALSE,
    gps_latitude         FLOAT,
    gps_longitude        FLOAT,
    verified_by          UUID,
    verification_method  VARCHAR(50),
    -- AI Ghost Worker Detection
    ghost_risk_score     FLOAT        DEFAULT 0 CHECK (ghost_risk_score BETWEEN 0 AND 100),
    ghost_risk_flags     JSONB        DEFAULT '[]',
    ai_anomaly_detected  BOOLEAN      DEFAULT FALSE,
    included_in_invoice  BOOLEAN      DEFAULT FALSE,
    remarks              TEXT,
    created_at           TIMESTAMPTZ  DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (vendor_employee_id, attendance_date)
);

-- ============================================================
-- VENDOR PERFORMANCE CARDS (Monthly AI Scorecard)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_performance_cards (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID         NOT NULL REFERENCES companies(id),
    vendor_id                   UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_id                 UUID         NOT NULL REFERENCES sla_contracts(id),
    period_month                INT          NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year                 INT          NOT NULL,
    -- KPIs
    fill_rate_target_pct        FLOAT,  fill_rate_actual_pct        FLOAT,  fill_rate_met        BOOLEAN,
    attendance_target_pct       FLOAT,  attendance_actual_pct       FLOAT,  attendance_met       BOOLEAN,
    legal_compliance_target_pct FLOAT,  legal_compliance_actual_pct FLOAT,  legal_compliance_met BOOLEAN,
    billing_accuracy_target_pct FLOAT,  billing_accuracy_actual_pct FLOAT,  billing_accuracy_met BOOLEAN,
    turnover_rate_target_pct    FLOAT,  turnover_rate_actual_pct    FLOAT,  turnover_rate_met    BOOLEAN,
    custom_kpi_results          JSONB        DEFAULT '[]',
    -- Overall AI Score
    overall_score               FLOAT        CHECK (overall_score BETWEEN 0 AND 100),
    overall_risk_level          VARCHAR(20)  DEFAULT 'low',
    -- AI Generated
    ai_generated                BOOLEAN      DEFAULT TRUE,
    ai_generated_at             TIMESTAMPTZ,
    ai_summary                  TEXT,
    ai_recommendation           TEXT,     -- renew/warn/performance_review/terminate
    ai_trend                    VARCHAR(20),
    -- Review & Actions
    warning_issued              BOOLEAN      DEFAULT FALSE,
    warning_issued_at           TIMESTAMPTZ,
    action_plan_received        BOOLEAN      DEFAULT FALSE,
    reviewed_by                 UUID,
    reviewed_at                 TIMESTAMPTZ,
    review_notes                TEXT,
    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (vendor_id, contract_id, period_year, period_month)
);

-- ============================================================
-- INDEXES — Workforce Module
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_wf_vendors_co        ON outsource_vendors(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_vendors_license   ON outsource_vendors(moless_license_no);
CREATE INDEX IF NOT EXISTS idx_wf_vendors_expiry    ON outsource_vendors(moless_license_expiry) WHERE moless_license_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_contracts_vendor  ON sla_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_wf_contracts_end     ON sla_contracts(end_date, status);
CREATE INDEX IF NOT EXISTS idx_wf_contracts_status  ON sla_contracts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_kpi_period        ON sla_kpi_results(contract_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_wf_ve_vendor         ON vendor_employees(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_ve_ghost          ON vendor_employees(ai_ghost_risk_score DESC) WHERE ai_ghost_risk_score > 50;
CREATE INDEX IF NOT EXISTS idx_wf_ve_ssf_unpaid     ON vendor_employees(company_id) WHERE NOT ssf_paid_current_month;
CREATE INDEX IF NOT EXISTS idx_wf_ve_uninsured      ON vendor_employees(company_id) WHERE NOT insurance_active;
CREATE INDEX IF NOT EXISTS idx_wf_inv_status        ON vendor_invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_inv_period        ON vendor_invoices(invoice_period_year, invoice_period_month);
CREATE INDEX IF NOT EXISTS idx_wf_inv_discrepancy   ON vendor_invoices(has_discrepancy) WHERE has_discrepancy;
CREATE INDEX IF NOT EXISTS idx_wf_att_emp_date      ON vendor_attendance(vendor_employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_wf_att_period        ON vendor_attendance(period_year, period_month, vendor_id);
CREATE INDEX IF NOT EXISTS idx_wf_att_ghost         ON vendor_attendance(ghost_risk_score DESC) WHERE ghost_risk_score > 60;
CREATE INDEX IF NOT EXISTS idx_wf_perf_vendor       ON vendor_performance_cards(vendor_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_wf_perf_low          ON vendor_performance_cards(overall_score) WHERE overall_score < 70;

-- ============================================================
-- TRIGGER: Auto-flag invoice discrepancy > NPR 100
-- ============================================================
CREATE OR REPLACE FUNCTION fn_wf_invoice_discrepancy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.timesheet_amount_npr IS NOT NULL THEN
    NEW.has_discrepancy := ABS(NEW.total_amount_npr - NEW.timesheet_amount_npr) > 100;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_wf_invoice_discrepancy
  BEFORE INSERT OR UPDATE ON vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION fn_wf_invoice_discrepancy();

-- TRIGGER: Auto-update vendor aggregate metrics
CREATE OR REPLACE FUNCTION fn_wf_vendor_metrics()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE outsource_vendors SET
    total_workers_deployed = (
      SELECT COUNT(*) FROM vendor_employees
      WHERE vendor_id = NEW.vendor_id AND status = 'active' AND NOT is_deleted
    ),
    updated_at = NOW()
  WHERE id = NEW.vendor_id;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_wf_vendor_metrics
  AFTER INSERT OR UPDATE OF status ON vendor_employees
  FOR EACH ROW EXECUTE FUNCTION fn_wf_vendor_metrics();

-- ============================================================
-- VIEW: Vendor Co-Liability Risk (LA 2074 Section 55)
-- ============================================================
CREATE OR REPLACE VIEW v_vendor_coliability AS
SELECT
    ov.vendor_name,
    ov.service_category,
    ov.moless_license_no,
    ov.moless_license_expiry,
    CASE WHEN ov.moless_license_expiry IS NULL       THEN 'UNKNOWN'
         WHEN ov.moless_license_expiry < NOW()::DATE THEN 'EXPIRED'
         WHEN ov.moless_license_expiry < NOW()::DATE + 90 THEN 'EXPIRING_SOON'
         ELSE 'VALID' END                                  AS license_status,
    COUNT(ve.id)                                           AS total_workers,
    COUNT(ve.id) FILTER (WHERE NOT ve.ssf_paid_current_month)    AS ssf_violations,
    COUNT(ve.id) FILTER (WHERE NOT ve.insurance_active)          AS insurance_violations,
    COUNT(ve.id) FILTER (WHERE ve.monthly_wage_npr < 15000)      AS min_wage_violations,
    COUNT(ve.id) FILTER (WHERE ve.ai_ghost_risk_score > 60)      AS ghost_risk_workers,
    COUNT(vi.id) FILTER (WHERE vi.has_discrepancy)               AS invoice_discrepancies,
    ov.overall_performance_score,
    ov.overall_risk_level,
    ov.company_id
FROM outsource_vendors ov
LEFT JOIN vendor_employees ve ON ve.vendor_id = ov.id AND ve.status = 'active' AND NOT ve.is_deleted
LEFT JOIN vendor_invoices vi  ON vi.vendor_id = ov.id AND NOT vi.is_deleted
WHERE NOT ov.is_deleted
GROUP BY ov.id, ov.vendor_name, ov.service_category, ov.moless_license_no,
         ov.moless_license_expiry, ov.overall_performance_score,
         ov.overall_risk_level, ov.company_id;
