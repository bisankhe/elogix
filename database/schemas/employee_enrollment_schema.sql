-- ================================================================
-- FILE: database/schemas/employee_enrollment_schema.sql
-- eLogix HRMS — Employee Enrollment Module (Onboarding > Employee Joining)
-- Single table with conditional Insource/Outsource fields, mirroring the
-- dynamic progressive-disclosure form on the frontend.
-- Nepal Labour Act 2074: 5 employment classifications (insource) +
-- non-core restriction + MoLESS vendor license requirement (outsource).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- EMPLOYEE ENROLLMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_enrollments (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID         NOT NULL,
    preboarding_offer_id          UUID       REFERENCES preboarding_offers(id),

    code                            VARCHAR(50) NOT NULL,  -- ENR-2025-041
    full_name                          VARCHAR(200) NOT NULL,
    name_nepali                          VARCHAR(200),

    -- ── THE MASTER SWITCH ──────────────────────────────────────
    employee_type                          VARCHAR(20) NOT NULL
                                           CHECK (employee_type IN ('insource','outsource')),

    -- ════════════════════════════════════════════════════════════
    -- INSOURCE-ONLY FIELDS (NULL when employee_type = 'outsource')
    -- ════════════════════════════════════════════════════════════
    employment_classification               VARCHAR(30)
                                             CHECK (employment_classification IN (
                                               'regular','time_bound','work_based','casual','part_time',
                                               'vendor_supplied')),  -- 'vendor_supplied' used for outsource rows

    department_id                              UUID,
    branch_id                                     UUID,
    manager_employee_id                              UUID,
    manager_name                                       VARCHAR(200),

    join_date                                             DATE,
    monthly_salary_npr                                       NUMERIC(12,2)
                                                              CHECK (monthly_salary_npr IS NULL OR monthly_salary_npr >= 15000),

    -- Direct payroll / tax / benefits (insource)
    payroll_setup_complete                                       BOOLEAN DEFAULT FALSE,
    tax_withholding_configured                                      BOOLEAN DEFAULT FALSE,
    benefits_enrolled                                                  BOOLEAN DEFAULT FALSE,
    ssf_enrolled                                                          BOOLEAN DEFAULT FALSE,
    ssf_registration_no                                                      VARCHAR(50),
    ssf_enrolled_date                                                           DATE,

    -- Probation (LA2074: max 6 months)
    probation_months                                                               INT DEFAULT 6 CHECK (probation_months <= 6),
    probation_end_date                                                                DATE,

    -- Casual/part-time compliance limits
    casual_days_this_month                                                             INT DEFAULT 0 CHECK (casual_days_this_month <= 7),
    part_time_hours_per_week                                                              NUMERIC(5,2) CHECK (part_time_hours_per_week IS NULL OR part_time_hours_per_week <= 35),

    -- ════════════════════════════════════════════════════════════
    -- OUTSOURCE-ONLY FIELDS (NULL when employee_type = 'insource')
    -- ════════════════════════════════════════════════════════════
    vendor_id                                                                                UUID REFERENCES outsource_vendors(id),
    vendor_name_snapshot                                                                        VARCHAR(200),  -- denormalized for fast display
    vendor_license_no_snapshot                                                                     VARCHAR(100),
    vendor_license_verified                                                                           BOOLEAN DEFAULT FALSE,
    vendor_license_verified_at                                                                           TIMESTAMPTZ,

    service_category                                                                                        VARCHAR(100),
    is_non_core_verified                                                                                       BOOLEAN DEFAULT FALSE,
    -- TRUE only if service_category is in the approved non-core list

    contract_start_date                                                                                           DATE,
    contract_end_date                                                                                                DATE,
    billing_rate_npr_per_day                                                                                           NUMERIC(10,2),
    po_number                                                                                                             VARCHAR(50),
    vendor_contact_email                                                                                                     VARCHAR(255),

    sow_document_url                                                                                                            VARCHAR(500),
    sow_uploaded                                                                                                                   BOOLEAN DEFAULT FALSE,

    -- ════════════════════════════════════════════════════════════
    -- SHARED FIELDS
    -- ════════════════════════════════════════════════════════════
    status                                                                                                                              VARCHAR(30) DEFAULT 'draft'
                                                                                                                                          CHECK (status IN ('draft','pending_documents','pending_vendor_check','completed','cancelled')),

    -- AI compliance scoring
    ai_compliance_score                                                                                                                       FLOAT DEFAULT 100,
    ai_flags                                                                                                                                       JSONB DEFAULT '[]',

    enrolled_date                                                                                                                                     DATE DEFAULT CURRENT_DATE,
    completed_date                                                                                                                                       DATE,

    created_at                                                                                                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                                                                               TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                                                                                                UUID,
    is_deleted                                                                                                                                                 BOOLEAN DEFAULT FALSE,

    UNIQUE (company_id, code),

    -- ── Cross-field validation: exactly the right fields populated for each type ──
    CONSTRAINT ck_enroll_insource_fields CHECK (
        employee_type != 'insource' OR (
            employment_classification IS NOT NULL
            AND employment_classification != 'vendor_supplied'
        )
    ),
    CONSTRAINT ck_enroll_outsource_fields CHECK (
        employee_type != 'outsource' OR (
            vendor_id IS NOT NULL
            AND service_category IS NOT NULL
        )
    ),
    CONSTRAINT ck_enroll_probation_max CHECK (probation_months IS NULL OR probation_months <= 6),
    CONSTRAINT ck_enroll_casual_days CHECK (casual_days_this_month IS NULL OR casual_days_this_month <= 7),
    CONSTRAINT ck_enroll_parttime_hours CHECK (part_time_hours_per_week IS NULL OR part_time_hours_per_week <= 35),
    CONSTRAINT ck_enroll_min_wage CHECK (monthly_salary_npr IS NULL OR monthly_salary_npr >= 15000)
);

-- ================================================================
-- NON-CORE SERVICE WHITELIST (Nepal LA2074 outsourcing restriction)
-- Used to validate is_non_core_verified at the application layer
-- and surfaced in the frontend dropdown.
-- ================================================================
CREATE TABLE IF NOT EXISTS non_core_service_categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID,  -- NULL = global default list, applies to all companies
    name        VARCHAR(100) NOT NULL UNIQUE,
    is_active   BOOLEAN DEFAULT TRUE,
    gazette_ref VARCHAR(200),  -- Nepal Gazette notification reference, if published
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO non_core_service_categories (name, is_active, gazette_ref) VALUES
    ('Security Services',           TRUE, 'MoLESS Gazette Notice 2074'),
    ('Housekeeping & Sanitation',   TRUE, 'MoLESS Gazette Notice 2074'),
    ('Driver & Transport',          TRUE, 'MoLESS Gazette Notice 2074'),
    ('Gardening & Landscaping',     TRUE, 'MoLESS Gazette Notice 2074'),
    ('Cafeteria & Catering',        TRUE, 'MoLESS Gazette Notice 2074'),
    ('Business Assistance',         TRUE, 'MoLESS Gazette Notice 2074'),
    ('Call Center Support',         TRUE, 'MoLESS Gazette Notice 2074'),
    ('IT Support Staff (Non-Core)', TRUE, 'MoLESS Gazette Notice 2074')
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- ENROLLMENT AUDIT LOG (every save/edit event)
-- ================================================================
CREATE TABLE IF NOT EXISTS enrollment_audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id   UUID NOT NULL REFERENCES employee_enrollments(id),
    company_id      UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,  -- created | type_changed | vendor_verified | completed | cancelled
    old_value       JSONB,
    new_value       JSONB,
    performed_by    UUID,
    performed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_enroll_company       ON employee_enrollments(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_enroll_type           ON employee_enrollments(employee_type);
CREATE INDEX IF NOT EXISTS idx_enroll_status          ON employee_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enroll_vendor            ON employee_enrollments(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enroll_dept               ON employee_enrollments(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enroll_non_core            ON employee_enrollments(is_non_core_verified) WHERE employee_type = 'outsource';
CREATE INDEX IF NOT EXISTS idx_enroll_license              ON employee_enrollments(vendor_license_verified) WHERE employee_type = 'outsource';
CREATE INDEX IF NOT EXISTS idx_aud_enrollment                ON enrollment_audit_log(enrollment_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_enroll_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_enroll_upd
    BEFORE UPDATE ON employee_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_enroll_updated_at();

-- Auto-validate non-core service category against whitelist
CREATE OR REPLACE FUNCTION fn_enroll_non_core_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.employee_type = 'outsource' AND NEW.service_category IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM non_core_service_categories
            WHERE name = NEW.service_category AND is_active = TRUE
        ) THEN
            NEW.is_non_core_verified := TRUE;
        ELSE
            NEW.is_non_core_verified := FALSE;
            RAISE WARNING 'Service category "%" is not on the approved non-core whitelist. Nepal LA2074: outsourcing restricted to non-core work. Risk of worker reclassification as direct employee.', NEW.service_category;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_enroll_non_core
    BEFORE INSERT OR UPDATE OF service_category ON employee_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_enroll_non_core_check();

-- Block enrollment completion if outsource vendor license invalid
CREATE OR REPLACE FUNCTION fn_enroll_vendor_license_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.employee_type = 'outsource' AND NOT NEW.vendor_license_verified THEN
        RAISE EXCEPTION 'Cannot complete enrollment: vendor MoLESS license not verified. Nepal Labour Act 2074 Section 59 — unlicensed vendor use makes the worker a direct employee by law.';
    END IF;
    IF NEW.status = 'completed' THEN
        NEW.completed_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_enroll_vendor_gate
    BEFORE UPDATE OF status ON employee_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_enroll_vendor_license_gate();

-- Auto-calc probation_end_date for insource hires
CREATE OR REPLACE FUNCTION fn_enroll_probation_calc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.employee_type = 'insource' AND NEW.join_date IS NOT NULL AND NEW.probation_months IS NOT NULL THEN
        NEW.probation_end_date := NEW.join_date + (NEW.probation_months || ' months')::INTERVAL;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_enroll_probation
    BEFORE INSERT OR UPDATE OF join_date, probation_months ON employee_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_enroll_probation_calc();

-- Audit log on every status change
CREATE OR REPLACE FUNCTION fn_enroll_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO enrollment_audit_log (enrollment_id, company_id, action, new_value, performed_by)
        VALUES (NEW.id, NEW.company_id, 'created', to_jsonb(NEW), NEW.created_by);
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO enrollment_audit_log (enrollment_id, company_id, action, old_value, new_value)
        VALUES (NEW.id, NEW.company_id, 'status_changed',
                jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_enroll_audit
    AFTER INSERT OR UPDATE ON employee_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_enroll_audit();

-- ================================================================
-- VIEWS
-- ================================================================

-- Combined enrollment dashboard (unifies insource/outsource display)
CREATE OR REPLACE VIEW v_enrollment_dashboard AS
SELECT
    ee.code, ee.full_name, ee.employee_type, ee.status,
    CASE WHEN ee.employee_type = 'insource' THEN d.name ELSE ov.vendor_name END AS dept_or_vendor,
    CASE WHEN ee.employee_type = 'insource' THEN ee.employment_classification ELSE 'vendor_supplied' END AS classification,
    CASE WHEN ee.employee_type = 'insource' THEN ee.join_date ELSE ee.contract_start_date END AS effective_date,
    CASE WHEN ee.employee_type = 'insource' THEN ee.monthly_salary_npr ELSE ee.billing_rate_npr_per_day END AS rate_npr,
    ee.ai_compliance_score, ee.enrolled_date, ee.completed_date,
    ee.company_id
FROM employee_enrollments ee
LEFT JOIN departments d ON ee.department_id = d.id
LEFT JOIN outsource_vendors ov ON ee.vendor_id = ov.id
WHERE NOT ee.is_deleted
ORDER BY ee.enrolled_date DESC;

-- Outsource compliance risk monitor
CREATE OR REPLACE VIEW v_outsource_compliance_risk AS
SELECT
    ee.code, ee.full_name, ee.service_category,
    ov.vendor_name, ov.moless_license_no, ov.is_licensed_agency,
    ee.is_non_core_verified, ee.vendor_license_verified,
    CASE WHEN NOT ee.is_non_core_verified THEN 'CORE_WORK_RISK'
         WHEN NOT ee.vendor_license_verified THEN 'UNLICENSED_VENDOR_RISK'
         ELSE 'COMPLIANT' END AS risk_status,
    ee.company_id
FROM employee_enrollments ee
LEFT JOIN outsource_vendors ov ON ee.vendor_id = ov.id
WHERE ee.employee_type = 'outsource' AND NOT ee.is_deleted
ORDER BY risk_status DESC;

-- Insource statutory compliance (SSF, probation, casual/part-time limits)
CREATE OR REPLACE VIEW v_insource_compliance AS
SELECT
    ee.code, ee.full_name, ee.employment_classification,
    ee.ssf_enrolled, ee.probation_end_date, ee.casual_days_this_month, ee.part_time_hours_per_week,
    CASE WHEN NOT ee.ssf_enrolled AND ee.status = 'completed' THEN 'SSF_PENDING'
         WHEN ee.employment_classification = 'casual' AND ee.casual_days_this_month > 7 THEN 'CASUAL_LIMIT_BREACH'
         WHEN ee.employment_classification = 'part_time' AND ee.part_time_hours_per_week > 35 THEN 'PARTTIME_LIMIT_BREACH'
         ELSE 'COMPLIANT' END AS compliance_status,
    ee.company_id
FROM employee_enrollments ee
WHERE ee.employee_type = 'insource' AND NOT ee.is_deleted;
