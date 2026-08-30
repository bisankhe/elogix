-- ================================================================
-- FILE: database/schemas/vendor_employee_schema.sql
-- eLogix HRMS — Vendor Employee Management Schema
-- Covers:
--   1. vendor_employees_extended   (Contingent workforce roster)
--   2. vendor_assets               (Inventory & Asset tracking)
--   3. vendor_leave_requests       (Leave requests & balances)
--   4. vendor_cash_advances        (Cash advance + repayment)
--   5. vendor_attendance_extended  (Daily attendance + ghost detection)
-- Nepal Labour Act 2074 Sections 52-64 enforced at DB level.
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. VENDOR EMPLOYEES (Extended Roster)
-- VE- prefix IDs, no payroll, no system access
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_employees_extended (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_id              UUID         NOT NULL,
    contract_id            UUID,

    emp_id                 VARCHAR(20)  NOT NULL,  -- VE-001
    name                   VARCHAR(200) NOT NULL,
    name_nepali            VARCHAR(200),
    gender                 VARCHAR(10),
    date_of_birth          DATE,
    citizenship_no         VARCHAR(50),
    phone                  VARCHAR(50),
    emergency_contact      VARCHAR(200),
    photo_url              VARCHAR(500),

    role                   VARCHAR(100) NOT NULL,
    service_category       VARCHAR(100) NOT NULL,
    assigned_branch_id     UUID,
    assigned_dept          VARCHAR(100),
    shift_type             VARCHAR(30),
    shift_code             VARCHAR(20),

    contract_start         DATE         NOT NULL,
    contract_end           DATE         NOT NULL,
    days_remaining         INT GENERATED ALWAYS AS (
                             (contract_end - CURRENT_DATE)::INT
                           ) STORED,

    -- Nepal LA2074 Section 64 compliance (main employer obligations)
    id_verified            BOOLEAN      DEFAULT FALSE,
    bg_verified            BOOLEAN      DEFAULT FALSE,
    bg_verified_date       DATE,
    ssf_paid               BOOLEAN      DEFAULT FALSE,
    ssf_last_verified      DATE,
    insurance_active       BOOLEAN      DEFAULT FALSE,
    insurance_expiry       DATE,
    min_wage_ok            BOOLEAN      DEFAULT TRUE,

    monthly_wage_npr       NUMERIC(10,2) CHECK (monthly_wage_npr IS NULL OR monthly_wage_npr >= 15000),
    badge_no               VARCHAR(50),
    has_badge              BOOLEAN      DEFAULT FALSE,
    has_system_access      BOOLEAN      DEFAULT FALSE  -- ALWAYS FALSE per LA2074

    CONSTRAINT ck_ve_no_system_access CHECK (has_system_access = FALSE),
    CONSTRAINT ck_ve_min_wage CHECK (monthly_wage_npr IS NULL OR monthly_wage_npr >= 15000),

    certifications         JSONB        DEFAULT '[]',
    nda_signed             BOOLEAN      DEFAULT FALSE,
    nda_signed_date        DATE,

    -- AI
    ai_ghost_risk          FLOAT        DEFAULT 0 CHECK (ai_ghost_risk BETWEEN 0 AND 100),
    ai_compliance_score    FLOAT        DEFAULT 100 CHECK (ai_compliance_score BETWEEN 0 AND 100),
    ai_flags               JSONB        DEFAULT '[]',

    status                 VARCHAR(30)  DEFAULT 'active'
                           CHECK (status IN ('active','inactive','contract_expired','offboarded','suspended')),

    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    created_by             UUID,
    is_deleted             BOOLEAN      DEFAULT FALSE,
    offboarded_at          TIMESTAMPTZ,

    UNIQUE (company_id, emp_id)
);

-- ================================================================
-- 2. VENDOR ASSETS (Inventory & Asset Tracking)
-- Linked to employee for offboarding automation
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_assets (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    asset_code             VARCHAR(50)  NOT NULL,
    name                   VARCHAR(200) NOT NULL,
    category               VARCHAR(50)  NOT NULL
                           CHECK (category IN (
                             'uniform','badge','equipment','it_hardware',
                             'vehicle_key','communication','safety','furniture',
                             'medical','stationery','other')),
    description            TEXT,
    serial_no              VARCHAR(100),
    make_model             VARCHAR(200),
    value_npr              NUMERIC(12,2) DEFAULT 0,

    -- Assignment tracking
    assigned_to_ve_id      UUID         REFERENCES vendor_employees_extended(id),
    assigned_name          VARCHAR(200),
    assigned_vendor        VARCHAR(200),
    assigned_date          DATE,
    return_date            DATE,
    return_condition       VARCHAR(20),

    condition              VARCHAR(20)  DEFAULT 'good'
                           CHECK (condition IN ('new','good','fair','poor','damaged','lost')),
    location               VARCHAR(200),
    last_checked           DATE,
    next_service_date      DATE,

    -- Lifecycle
    purchase_date          DATE,
    warranty_expiry        DATE,
    disposal_date          DATE,
    disposal_reason        TEXT,

    status                 VARCHAR(30)  DEFAULT 'available'
                           CHECK (status IN ('available','assigned','returned','damaged','lost','disposed','maintenance')),

    -- AI
    ai_utilization_score   FLOAT        DEFAULT 0,
    ai_replacement_due     BOOLEAN      DEFAULT FALSE,

    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    created_by             UUID,
    is_deleted             BOOLEAN      DEFAULT FALSE,

    UNIQUE (company_id, asset_code)
);

-- ================================================================
-- 3. VENDOR LEAVE REQUESTS
-- Same statutory entitlements as direct employees per LA2074 Section 53
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_leave_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_employee_id     UUID         NOT NULL REFERENCES vendor_employees_extended(id),
    vendor_id              UUID         NOT NULL,

    request_no             VARCHAR(30)  NOT NULL,
    leave_type             VARCHAR(20)  NOT NULL
                           CHECK (leave_type IN (
                             'sick','annual','festival','casual',
                             'maternity','paternity','unpaid','compensatory')),
    from_date              DATE         NOT NULL,
    to_date                DATE         NOT NULL,
    days_requested         INT          NOT NULL CHECK (days_requested > 0),
    reason                 TEXT,
    applied_via            VARCHAR(20)  DEFAULT 'web'
                           CHECK (applied_via IN ('web','mobile','in_person','email')),

    -- Leave balance snapshot
    balance_before         INT,
    balance_after          INT,

    -- Coverage
    cover_arrangement      TEXT,
    cover_ve_id            UUID,

    -- Approval
    status                 VARCHAR(20)  DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','rejected','cancelled','withdrawn')),
    approved_by            UUID,
    approved_date          DATE,
    rejected_by            UUID,
    rejected_date          DATE,
    rejection_reason       TEXT,

    -- AI
    ai_recommendation      TEXT,
    ai_auto_approved       BOOLEAN      DEFAULT FALSE,
    ai_sla_impact          TEXT,

    applied_on             TIMESTAMPTZ  DEFAULT NOW(),
    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),

    UNIQUE (company_id, request_no),
    CHECK (to_date >= from_date)
);

-- Leave balances per employee per year
CREATE TABLE IF NOT EXISTS vendor_leave_balances (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_employee_id     UUID         NOT NULL REFERENCES vendor_employees_extended(id),
    year                   INT          NOT NULL,
    leave_type             VARCHAR(20)  NOT NULL,
    entitled_days          INT          NOT NULL DEFAULT 0,
    used_days              INT          NOT NULL DEFAULT 0,
    balance_days           INT          GENERATED ALWAYS AS (entitled_days - used_days) STORED,
    carried_forward        INT          DEFAULT 0,
    encashable_days        INT          DEFAULT 0,
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (vendor_employee_id, year, leave_type)
);

-- ================================================================
-- 4. VENDOR CASH ADVANCES
-- Max 1.5x monthly wage, repayment via payroll deduction
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_cash_advances (
    id                      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              UUID         NOT NULL,
    vendor_employee_id      UUID         NOT NULL REFERENCES vendor_employees_extended(id),
    vendor_id               UUID         NOT NULL,

    request_no              VARCHAR(30)  NOT NULL,
    amount_requested        NUMERIC(12,2) NOT NULL CHECK (amount_requested > 0),
    amount_approved         NUMERIC(12,2),
    monthly_wage_snapshot   NUMERIC(12,2),
    wage_ratio_pct          FLOAT GENERATED ALWAYS AS (
                              CASE WHEN monthly_wage_snapshot > 0
                              THEN ROUND((amount_requested / monthly_wage_snapshot * 100)::NUMERIC, 1)
                              ELSE 0 END
                            ) STORED,

    purpose_category        VARCHAR(30)  NOT NULL
                            CHECK (purpose_category IN (
                              'medical_emergency','education','festival',
                              'personal','housing','vehicle','other')),
    purpose_description     TEXT,
    supporting_docs         JSONB        DEFAULT '[]',

    disbursement_date       DATE,
    repayment_months        INT          CHECK (repayment_months BETWEEN 1 AND 6),
    repayment_per_month     NUMERIC(12,2),
    outstanding_balance     NUMERIC(12,2) DEFAULT 0,
    total_paid_back         NUMERIC(12,2) DEFAULT 0,

    approval_chain          JSONB        DEFAULT '[]',
    status                  VARCHAR(30)  DEFAULT 'pending'
                            CHECK (status IN (
                              'pending','approved','rejected','pending_disbursement',
                              'disbursed','partially_repaid','fully_repaid','written_off')),
    approved_by             UUID,
    approved_date           TIMESTAMPTZ,
    rejected_by             UUID,
    rejected_date           TIMESTAMPTZ,
    rejection_reason        TEXT,
    disbursed_by            UUID,
    disbursed_date          TIMESTAMPTZ,
    disbursement_ref        VARCHAR(100),

    -- AI fraud detection
    ai_risk_score           FLOAT        DEFAULT 0 CHECK (ai_risk_score BETWEEN 0 AND 100),
    ai_recommendation       TEXT,
    ai_fraud_flag           BOOLEAN      DEFAULT FALSE,

    applied_on              TIMESTAMPTZ  DEFAULT NOW(),
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW(),

    UNIQUE (company_id, request_no),
    -- Policy: max 1.5x monthly wage
    CONSTRAINT ck_advance_max_wage CHECK (
        monthly_wage_snapshot IS NULL OR
        amount_requested <= monthly_wage_snapshot * 1.5
    )
);

-- Advance repayment schedule
CREATE TABLE IF NOT EXISTS vendor_advance_repayments (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    advance_id           UUID         NOT NULL REFERENCES vendor_cash_advances(id),
    company_id           UUID         NOT NULL,
    installment_no       INT          NOT NULL,
    due_date             DATE         NOT NULL,
    amount_due           NUMERIC(12,2) NOT NULL,
    amount_paid          NUMERIC(12,2) DEFAULT 0,
    paid_date            DATE,
    deduction_method     VARCHAR(30)  DEFAULT 'payroll_deduction',
    status               VARCHAR(20)  DEFAULT 'pending'
                         CHECK (status IN ('pending','paid','overdue','waived')),
    created_at           TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (advance_id, installment_no)
);

-- ================================================================
-- 5. VENDOR ATTENDANCE (Extended)
-- Biometric/GPS/Card sync, ghost detection, timesheet generation
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_attendance_extended (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_employee_id     UUID         NOT NULL REFERENCES vendor_employees_extended(id),
    vendor_id              UUID         NOT NULL,
    contract_id            UUID,

    attendance_date        DATE         NOT NULL,
    period_month           INT          GENERATED ALWAYS AS (EXTRACT(MONTH FROM attendance_date)::INT) STORED,
    period_year            INT          GENERATED ALWAYS AS (EXTRACT(YEAR  FROM attendance_date)::INT) STORED,

    shift_type             VARCHAR(30),
    scheduled_start        TIME,
    scheduled_end          TIME,

    check_in_time          TIMESTAMPTZ,
    check_out_time         TIMESTAMPTZ,
    hours_worked           FLOAT        GENERATED ALWAYS AS (
                             CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL
                             THEN ROUND(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600.0::NUMERIC, 2)
                             ELSE NULL END
                           ) STORED,
    overtime_hours         FLOAT        DEFAULT 0,
    late_minutes           INT          DEFAULT 0,
    early_leave_minutes    INT          DEFAULT 0,

    status                 VARCHAR(20)  DEFAULT 'absent'
                           CHECK (status IN ('present','absent','half_day','on_leave','holiday','suspended')),
    is_late                BOOLEAN      DEFAULT FALSE,
    is_early_leave         BOOLEAN      DEFAULT FALSE,
    is_half_day            BOOLEAN      DEFAULT FALSE,
    leave_type             VARCHAR(20),

    -- Verification sources
    biometric_verified     BOOLEAN      DEFAULT FALSE,
    gps_verified           BOOLEAN      DEFAULT FALSE,
    card_verified          BOOLEAN      DEFAULT FALSE,
    manual_override        BOOLEAN      DEFAULT FALSE,
    override_by            UUID,
    override_reason        TEXT,
    gps_latitude           NUMERIC(10,7),
    gps_longitude          NUMERIC(10,7),
    gps_accuracy_m         FLOAT,
    gps_location_name      VARCHAR(200),
    verification_method    VARCHAR(50)  DEFAULT 'manual',

    -- AI ghost detection (LA2074 Section 64: attendance records mandatory)
    ghost_risk_score       FLOAT        DEFAULT 0 CHECK (ghost_risk_score BETWEEN 0 AND 100),
    ghost_risk_flags       JSONB        DEFAULT '[]',
    ai_anomaly_detected    BOOLEAN      DEFAULT FALSE,
    anomaly_type           VARCHAR(100),

    -- Billing
    billable               BOOLEAN      DEFAULT TRUE,
    included_in_invoice    BOOLEAN      DEFAULT FALSE,
    invoice_id             UUID,

    remarks                TEXT,
    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),

    UNIQUE (vendor_employee_id, attendance_date)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ve_ext_company     ON vendor_employees_extended(company_id)   WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ve_ext_vendor      ON vendor_employees_extended(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ve_ext_status      ON vendor_employees_extended(status);
CREATE INDEX IF NOT EXISTS idx_ve_ext_contract    ON vendor_employees_extended(contract_end)  WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_ve_ext_ghost       ON vendor_employees_extended(ai_ghost_risk DESC) WHERE ai_ghost_risk > 50;
CREATE INDEX IF NOT EXISTS idx_ve_ext_ssf         ON vendor_employees_extended(company_id)   WHERE NOT ssf_paid;

CREATE INDEX IF NOT EXISTS idx_va_company         ON vendor_assets(company_id)               WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_va_category        ON vendor_assets(category);
CREATE INDEX IF NOT EXISTS idx_va_status          ON vendor_assets(status);
CREATE INDEX IF NOT EXISTS idx_va_assigned        ON vendor_assets(assigned_to_ve_id)        WHERE assigned_to_ve_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vlr_employee       ON vendor_leave_requests(vendor_employee_id);
CREATE INDEX IF NOT EXISTS idx_vlr_status         ON vendor_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_vlr_dates          ON vendor_leave_requests(from_date, to_date);

CREATE INDEX IF NOT EXISTS idx_vca_employee       ON vendor_cash_advances(vendor_employee_id);
CREATE INDEX IF NOT EXISTS idx_vca_status         ON vendor_cash_advances(status);
CREATE INDEX IF NOT EXISTS idx_vca_risk           ON vendor_cash_advances(ai_risk_score DESC) WHERE ai_risk_score > 60;

CREATE INDEX IF NOT EXISTS idx_vae_employee       ON vendor_attendance_extended(vendor_employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_vae_period         ON vendor_attendance_extended(period_year, period_month, vendor_id);
CREATE INDEX IF NOT EXISTS idx_vae_ghost          ON vendor_attendance_extended(ghost_risk_score DESC) WHERE ghost_risk_score > 50;
CREATE INDEX IF NOT EXISTS idx_vae_billing        ON vendor_attendance_extended(billable, included_in_invoice);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto updated_at
CREATE OR REPLACE FUNCTION fn_ve_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'vendor_employees_extended','vendor_assets','vendor_leave_requests',
  'vendor_cash_advances','vendor_attendance_extended'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_ve_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Contract expiry: auto update status
CREATE OR REPLACE FUNCTION fn_ve_contract_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.contract_end < CURRENT_DATE AND NEW.status = 'active' THEN
        NEW.status := 'contract_expired';
        -- Trigger asset return
        UPDATE vendor_assets SET status = 'returned', return_date = CURRENT_DATE
        WHERE assigned_to_ve_id = NEW.id AND status = 'assigned';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_ve_contract_expiry
    BEFORE UPDATE ON vendor_employees_extended
    FOR EACH ROW EXECUTE FUNCTION fn_ve_contract_expiry();

-- Leave balance deduction on approval
CREATE OR REPLACE FUNCTION fn_vlr_deduct_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE vendor_leave_balances SET
            used_days = used_days + NEW.days_requested,
            updated_at = NOW()
        WHERE vendor_employee_id = NEW.vendor_employee_id
          AND year = EXTRACT(YEAR FROM NEW.from_date)::INT
          AND leave_type = NEW.leave_type;
    END IF;
    IF NEW.status IN ('rejected','cancelled') AND OLD.status = 'approved' THEN
        UPDATE vendor_leave_balances SET
            used_days = GREATEST(used_days - NEW.days_requested, 0),
            updated_at = NOW()
        WHERE vendor_employee_id = NEW.vendor_employee_id
          AND year = EXTRACT(YEAR FROM NEW.from_date)::INT
          AND leave_type = NEW.leave_type;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_vlr_deduct_balance
    AFTER UPDATE OF status ON vendor_leave_requests
    FOR EACH ROW EXECUTE FUNCTION fn_vlr_deduct_balance();

-- Cash advance: auto-compute repayment schedule
CREATE OR REPLACE FUNCTION fn_vca_repayment_schedule()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE i INT;
BEGIN
    IF NEW.status = 'disbursed' AND OLD.status != 'disbursed' AND NEW.repayment_months IS NOT NULL THEN
        FOR i IN 1..NEW.repayment_months LOOP
            INSERT INTO vendor_advance_repayments
              (advance_id, company_id, installment_no, due_date, amount_due)
            VALUES
              (NEW.id, NEW.company_id, i,
               NEW.disbursed_date::DATE + (i * INTERVAL '1 month'),
               ROUND(NEW.amount_approved / NEW.repayment_months, 2))
            ON CONFLICT (advance_id, installment_no) DO NOTHING;
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_vca_repayment
    AFTER UPDATE OF status ON vendor_cash_advances
    FOR EACH ROW EXECUTE FUNCTION fn_vca_repayment_schedule();

-- Attendance: auto-detect late arrival
CREATE OR REPLACE FUNCTION fn_vae_late_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.scheduled_start IS NOT NULL THEN
        DECLARE late_seconds FLOAT;
        BEGIN
            late_seconds := EXTRACT(EPOCH FROM (
                NEW.check_in_time - (NEW.attendance_date + NEW.scheduled_start)
            ));
            IF late_seconds > 900 THEN  -- > 15 minutes
                NEW.is_late := TRUE;
                NEW.late_minutes := ROUND(late_seconds / 60)::INT;
            END IF;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_vae_late_check
    BEFORE INSERT OR UPDATE OF check_in_time ON vendor_attendance_extended
    FOR EACH ROW EXECUTE FUNCTION fn_vae_late_check();

-- ================================================================
-- VIEWS
-- ================================================================

-- Vendor employee compliance dashboard
CREATE OR REPLACE VIEW v_ve_compliance_dashboard AS
SELECT
    ve.emp_id, ve.name, ve.role, ve.service_category,
    ve.contract_end, ve.days_remaining,
    ve.id_verified, ve.bg_verified, ve.ssf_paid, ve.insurance_active, ve.min_wage_ok,
    ve.ai_ghost_risk, ve.ai_compliance_score,
    CASE WHEN NOT ve.id_verified         THEN 'FAIL'
         WHEN NOT ve.bg_verified         THEN 'WARN'
         WHEN NOT ve.ssf_paid            THEN 'FAIL'  -- LA2074 S.64 co-liability
         WHEN NOT ve.insurance_active    THEN 'WARN'
         WHEN ve.days_remaining < 0      THEN 'EXPIRED'
         WHEN ve.days_remaining < 30     THEN 'EXPIRING'
         WHEN ve.ai_ghost_risk > 60      THEN 'GHOST_RISK'
         ELSE 'OK' END                                AS compliance_status,
    ve.company_id
FROM vendor_employees_extended ve
WHERE NOT ve.is_deleted
ORDER BY ve.ai_compliance_score ASC, ve.ai_ghost_risk DESC;

-- Monthly attendance summary for billing
CREATE OR REPLACE VIEW v_ve_monthly_attendance AS
SELECT
    ve.emp_id, ve.name, ve.role, ve.service_category,
    va.period_year, va.period_month,
    COUNT(*)                                              AS total_days_recorded,
    COUNT(*) FILTER (WHERE va.status = 'present')        AS present_days,
    COUNT(*) FILTER (WHERE va.status = 'absent')         AS absent_days,
    COUNT(*) FILTER (WHERE va.is_late)                   AS late_count,
    COALESCE(SUM(va.hours_worked), 0)                    AS total_hours,
    COALESCE(SUM(va.overtime_hours), 0)                  AS total_ot_hours,
    ROUND(COUNT(*) FILTER (WHERE va.status='present')::NUMERIC
          / NULLIF(COUNT(*), 0) * 100, 1)                AS attendance_pct,
    ROUND(AVG(va.ghost_risk_score)::NUMERIC, 1)          AS avg_ghost_risk,
    BOOL_AND(va.biometric_verified)                      AS all_biometric,
    va.company_id
FROM vendor_attendance_extended va
JOIN vendor_employees_extended ve ON va.vendor_employee_id = ve.id
WHERE NOT ve.is_deleted
GROUP BY ve.emp_id, ve.name, ve.role, ve.service_category,
         va.period_year, va.period_month, va.company_id
ORDER BY va.period_year DESC, va.period_month DESC, attendance_pct ASC;

-- Leave balance overview
CREATE OR REPLACE VIEW v_ve_leave_overview AS
SELECT
    ve.emp_id, ve.name, ve.role,
    vlb.year, vlb.leave_type,
    vlb.entitled_days, vlb.used_days, vlb.balance_days, vlb.carried_forward,
    ROUND(vlb.used_days::NUMERIC / NULLIF(vlb.entitled_days, 0) * 100, 1) AS utilization_pct,
    ve.company_id
FROM vendor_leave_balances vlb
JOIN vendor_employees_extended ve ON vlb.vendor_employee_id = ve.id
WHERE NOT ve.is_deleted
ORDER BY ve.name, vlb.leave_type;

-- Asset return alert (contract expired with assets still assigned)
CREATE OR REPLACE VIEW v_ve_asset_return_alerts AS
SELECT
    ve.emp_id, ve.name, ve.contract_end, ve.days_remaining,
    va.asset_code, va.name AS asset_name, va.category,
    va.value_npr, va.serial_no,
    CASE WHEN ve.days_remaining < 0  THEN 'OVERDUE_RETURN'
         WHEN ve.days_remaining < 7  THEN 'RETURN_IN_7_DAYS'
         WHEN ve.days_remaining < 30 THEN 'RETURN_IN_30_DAYS'
         ELSE 'ON_TIME' END AS return_urgency,
    ve.company_id
FROM vendor_assets va
JOIN vendor_employees_extended ve ON va.assigned_to_ve_id = ve.id
WHERE va.status = 'assigned' AND NOT va.is_deleted
  AND (ve.status = 'contract_expired' OR ve.days_remaining < 30)
ORDER BY ve.days_remaining ASC;
