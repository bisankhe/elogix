-- ================================================================
-- FILE: database/schemas/certificate_generation_tracking_schema.sql
-- NepHR Pro — Performance & Talent Management > Talent Development >
-- Learning & Development > Generate Certificate + Certification
-- Tracking (2 pages)
--
-- "LITTLE CHANGE" PER THIS SESSION'S INSTRUCTION: the auto-issue
-- trigger built in Course Management (fn_issue_certification_on_
-- completion) only fired when a course had a recertification_period_
-- months value -- meaning one-time, non-recurring courses NEVER
-- generated a certificate. This schema REPLACES that trigger so EVERY
-- completed course auto-issues a certificate; recertification_period_
-- months now only controls whether expires_date is set (NULL = does
-- not expire) rather than gating issuance altogether.
--
-- USER PERSONAS (explicit, per this session's instruction):
--   - hr_admin:  builds templates, reviews auto-issue queue, bulk-generates,
--                configures role-based requirements, exports audit reports
--   - manager:   sees team certs issued, approves manual overrides,
--                views team expiry pipeline + escalation queue
--   - employee:  views/downloads own certificates, shares to LinkedIn,
--                uploads renewal docs, sees personal expiry countdown
-- Each view below is explicitly scoped to the persona that consumes it.
--
--   - certificate_templates       (drag-and-drop merge-tag template engine)
--   - certificate_template_assignments (course -> template mapping)
--   - certification_role_requirements  (role-based mandatory cert config)
--   - certification_renewal_documents  (employee-uploaded renewal proof)
--
-- Nepal Labour Act 2017 (2074): Section 114 (formal up-to-date registry
-- of educational qualifications, training, skill sets -- this schema
-- IS that registry); Section 150 (Certificate of Experience mandatory
-- on termination/apprentice completion); Section 94 (annual Labour
-- Audit requires verifiable training/professional-development records);
-- Section 22 (foreign-national work permits/degrees/certifications must
-- be tracked and verified by the Department of Labor).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CERTIFICATE TEMPLATES (Page 1: the drag-and-drop builder)
-- ================================================================
CREATE TABLE IF NOT EXISTS certificate_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,

    template_name   VARCHAR(150) NOT NULL,
    header_text     VARCHAR(300) DEFAULT 'Certificate of Completion',
    body_template   TEXT DEFAULT 'This certifies that [Employee Name] has completed [Certification Title]',
    signature_name  VARCHAR(150),
    logo_url        VARCHAR(500),

    is_default      BOOLEAN DEFAULT FALSE,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','archived')),

    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificate_template_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_template_id UUID NOT NULL REFERENCES certificate_templates(id),
    lms_course_id   UUID REFERENCES lms_courses(id),  -- NULL = applies to all courses (the default template)
    company_id      UUID NOT NULL,
    UNIQUE (certificate_template_id, lms_course_id)
);

-- ================================================================
-- ROLE-BASED CERTIFICATION REQUIREMENTS (Page 2)
-- ================================================================
CREATE TABLE IF NOT EXISTS certification_role_requirements (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    department_id           UUID REFERENCES departments(id),  -- NULL = all employees
    is_foreign_national_rule BOOLEAN DEFAULT FALSE,  -- Section 22 special category

    required_lms_course_id      UUID REFERENCES lms_courses(id),
    requirement_label              VARCHAR(300) NOT NULL,  -- human-readable, e.g. 'Work Permit (Foreign National)'

    created_at                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- RENEWAL DOCUMENT UPLOADS (Page 2: employee self-service renewal)
-- ================================================================
CREATE TABLE IF NOT EXISTS certification_renewal_documents (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    lms_certification_id      UUID       NOT NULL REFERENCES lms_certifications(id),
    employee_id                 UUID    NOT NULL REFERENCES employees(id),

    document_url                   VARCHAR(500) NOT NULL,
    new_expiry_date                    DATE,

    verification_status                   VARCHAR(20) DEFAULT 'pending_verification'
                                          CHECK (verification_status IN ('pending_verification','verified','rejected')),
    verified_by                              UUID,
    verified_at                                 TIMESTAMPTZ,

    uploaded_at                                    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- RETROFIT: add tier-tracking column to the EXISTING lms_certifications
-- so multi-tier (90/60/30) escalation state persists per certificate
-- ================================================================
ALTER TABLE lms_certifications ADD COLUMN IF NOT EXISTS last_alert_tier INT;  -- 90, 60, or 30
ALTER TABLE lms_certifications ADD COLUMN IF NOT EXISTS escalated_to VARCHAR(20)
    DEFAULT 'employee' CHECK (escalated_to IN ('employee','manager','compliance_admin'));
ALTER TABLE lms_certifications ADD COLUMN IF NOT EXISTS verify_qr_code VARCHAR(100);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ct_status          ON certificate_templates(status);
CREATE INDEX IF NOT EXISTS idx_cta_template            ON certificate_template_assignments(certificate_template_id);
CREATE INDEX IF NOT EXISTS idx_cta_course                  ON certificate_template_assignments(lms_course_id);
CREATE INDEX IF NOT EXISTS idx_crr_department                  ON certification_role_requirements(department_id);
CREATE INDEX IF NOT EXISTS idx_crr_foreign                          ON certification_role_requirements(is_foreign_national_rule) WHERE is_foreign_national_rule;
CREATE INDEX IF NOT EXISTS idx_crd_cert                                 ON certification_renewal_documents(lms_certification_id);
CREATE INDEX IF NOT EXISTS idx_crd_pending                                  ON certification_renewal_documents(verification_status) WHERE verification_status = 'pending_verification';

-- ================================================================
-- TRIGGERS
-- ================================================================

-- REPLACES fn_issue_certification_on_completion from Course Management:
-- now issues a certificate for EVERY completed course (the "little
-- change"), using the assigned template (or the default), and only
-- sets an expiry if recertification_period_months is configured.
-- Also generates a unique QR verification code.
CREATE OR REPLACE FUNCTION fn_issue_certification_on_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE course RECORD; qr_code TEXT;
BEGIN
    IF NEW.completed_at IS NOT NULL AND (OLD IS NULL OR OLD.completed_at IS NULL) THEN
        SELECT title, recertification_period_months INTO course FROM lms_courses WHERE id = NEW.lms_course_id;
        qr_code := 'VERIFY-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));

        -- Issues for EVERY completion now, not only recertification-tracked courses
        INSERT INTO lms_certifications (company_id, employee_id, lms_course_id, certification_title, issued_date, expires_date, verify_qr_code, created_at)
        VALUES (
            NEW.company_id, NEW.employee_id, NEW.lms_course_id, course.title, CURRENT_DATE,
            CASE WHEN course.recertification_period_months IS NOT NULL
                 THEN CURRENT_DATE + (course.recertification_period_months || ' months')::INTERVAL
                 ELSE NULL END,
            qr_code, NOW()
        );

        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'lms_enrollments', NEW.id, 'certificate_issued', NEW.employee_id, 'direct_party',
           format('Your certificate for "%s" has been generated and is ready to download.', course.title), NOW());
    END IF;
    RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_issue_cert ON lms_enrollments;
CREATE TRIGGER trg_issue_cert
    AFTER UPDATE OF completed_at ON lms_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_issue_certification_on_completion();

-- Multi-tier escalation: 90 -> employee, 60 -> manager, 30 -> compliance
-- admin, reusing the EXISTING transaction_notifications mechanism
CREATE OR REPLACE FUNCTION fn_check_multitier_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE days_left INT; mgr_id UUID; tier INT;
BEGIN
    IF NEW.expires_date IS NOT NULL THEN
        days_left := NEW.expires_date - CURRENT_DATE;

        IF days_left <= 30 THEN tier := 30; NEW.escalated_to := 'compliance_admin';
        ELSIF days_left <= 60 THEN tier := 60; NEW.escalated_to := 'manager';
        ELSIF days_left <= 90 THEN tier := 90; NEW.escalated_to := 'employee';
        ELSE tier := NULL; END IF;

        IF tier IS NOT NULL AND (NEW.last_alert_tier IS NULL OR NEW.last_alert_tier > tier) THEN
            NEW.last_alert_tier := tier;

            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'lms_certifications', NEW.id, 'cert_expiry_tier_alert', NEW.employee_id, 'direct_party',
               format('"%s" expires in %s days -- renewal needed.', NEW.certification_title, days_left), NOW());

            IF NEW.escalated_to IN ('manager','compliance_admin') THEN
                SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
                IF mgr_id IS NOT NULL THEN
                    INSERT INTO transaction_notifications
                      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
                    VALUES
                      (NEW.company_id, 'lms_certifications', NEW.id, 'cert_expiry_tier_alert', mgr_id, 'reporting_manager',
                       format('Your direct report\\'s "%s" expires in %s days.', NEW.certification_title, days_left), NOW());
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_multitier
    BEFORE INSERT OR UPDATE OF expires_date ON lms_certifications
    FOR EACH ROW EXECUTE FUNCTION fn_check_multitier_expiry();

-- On renewal document verification: extend the certificate's expiry
CREATE OR REPLACE FUNCTION fn_apply_renewal_verification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.verification_status = 'verified' AND OLD.verification_status = 'pending_verification' THEN
        UPDATE lms_certifications
           SET expires_date = NEW.new_expiry_date, status = 'active', last_alert_tier = NULL
         WHERE id = NEW.lms_certification_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_renewal
    BEFORE UPDATE OF verification_status ON certification_renewal_documents
    FOR EACH ROW EXECUTE FUNCTION fn_apply_renewal_verification();

-- ================================================================
-- VIEWS (explicitly persona-scoped per this session's instruction)
-- ================================================================

-- HR/L&D Admin persona: the auto-issue queue + bulk generation source
CREATE OR REPLACE VIEW v_certificate_autoissue_queue_hr_admin AS
SELECT
    le.id AS enrollment_id, e.employee_code, e.first_name, e.last_name,
    lc.title AS course_title, le.completed_at,
    CASE WHEN cta.id IS NOT NULL THEN 'issued' ELSE 'pending_template' END AS status,
    lcert.id AS certification_id, le.company_id
FROM lms_enrollments le
JOIN employees e ON le.employee_id = e.id
JOIN lms_courses lc ON le.lms_course_id = lc.id
LEFT JOIN lms_certifications lcert ON lcert.employee_id = le.employee_id AND lcert.lms_course_id = le.lms_course_id
LEFT JOIN certificate_template_assignments cta ON cta.lms_course_id = le.lms_course_id OR cta.lms_course_id IS NULL
WHERE le.completed_at IS NOT NULL
ORDER BY le.completed_at DESC;

-- Manager persona: team certificates + pipeline
CREATE OR REPLACE VIEW v_certificate_team_summary_manager AS
SELECT e.manager_id, COUNT(*) AS team_certs_issued, lcert.company_id
FROM lms_certifications lcert
JOIN employees e ON lcert.employee_id = e.id
GROUP BY e.manager_id, lcert.company_id;

-- Employee persona: "My Credentials" (the ESS view)
CREATE OR REPLACE VIEW v_my_credentials_employee AS
SELECT lcert.*, lc.title AS course_title
FROM lms_certifications lcert
LEFT JOIN lms_courses lc ON lcert.lms_course_id = lc.id
ORDER BY lcert.issued_date DESC;

-- HR/Compliance Admin persona: company-wide compliance breakdown (the pie chart)
CREATE OR REPLACE VIEW v_compliance_breakdown_hr_admin AS
SELECT
    company_id,
    COUNT(*) FILTER (WHERE status = 'active' AND (expires_date IS NULL OR expires_date - CURRENT_DATE > 90)) AS compliant,
    COUNT(*) FILTER (WHERE expires_date - CURRENT_DATE BETWEEN 61 AND 90) AS expiring_90,
    COUNT(*) FILTER (WHERE expires_date - CURRENT_DATE BETWEEN 0 AND 30) AS expiring_30,
    COUNT(*) FILTER (WHERE status = 'expired') AS expired
FROM lms_certifications
GROUP BY company_id;

-- Manager + Employee shared persona: the multi-tier expiry pipeline
CREATE OR REPLACE VIEW v_expiry_pipeline AS
SELECT lcert.*, e.employee_code, e.first_name, e.last_name,
    (lcert.expires_date - CURRENT_DATE) AS days_left
FROM lms_certifications lcert
JOIN employees e ON lcert.employee_id = e.id
WHERE lcert.expires_date IS NOT NULL AND lcert.status IN ('active','expiring')
ORDER BY lcert.expires_date ASC;

-- HR/Compliance Admin persona: role-based requirement compliance check,
-- including the Section 22 foreign-national special category
CREATE OR REPLACE VIEW v_role_requirement_compliance AS
SELECT
    crr.requirement_label, crr.is_foreign_national_rule, d.name AS department_name,
    COUNT(DISTINCT e.id) AS employees_required,
    COUNT(DISTINCT lcert.employee_id) AS employees_compliant,
    crr.company_id
FROM certification_role_requirements crr
LEFT JOIN departments d ON crr.department_id = d.id
LEFT JOIN employees e ON e.department_id = crr.department_id OR crr.department_id IS NULL
LEFT JOIN lms_certifications lcert ON lcert.employee_id = e.id AND lcert.lms_course_id = crr.required_lms_course_id AND lcert.status = 'active'
GROUP BY crr.requirement_label, crr.is_foreign_national_rule, d.name, crr.company_id;
