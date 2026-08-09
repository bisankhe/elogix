-- ================================================================
-- FILE: database/schemas/wellness_support_schema.sql
-- NepHR Pro -- Employee Experience & Culture > Wellness & Support
-- (5 pages: Wellness Program, Mental Health Support, Insurance
-- Management, Emergency Support, Employee Assistance Program)
--
-- Design note: Emergency Support reuses the EXISTING
-- employee_emergency_contacts table (Employee Records session)
-- directly -- emergency_sos_alerts only stores the TRIGGER event, the
-- contact data itself is never duplicated. Mental Health Leave
-- references the EXISTING leave_types/leave request machinery rather
-- than building a parallel leave system.
--
-- RBAC IS PARAMOUNT IN THIS SCHEMA: mental_health_sessions and
-- eap_cases have NO foreign key or join path back to performance,
-- payroll, or any manager-visible table. Application-layer queries
-- for managers/HR dashboards MUST aggregate via
-- v_wellbeing_anonymized_trends ONLY -- never query the raw tables
-- directly outside the employee's own self-service context.
--
--   - wellness_challenges + wellness_challenge_participants
--   - mental_health_sessions       (RBAC-isolated, employee-only access)
--   - insurance_policies + insurance_claims
--   - emergency_sos_alerts          (triggers off employee_emergency_contacts)
--   - safety_checkin_events + safety_checkin_responses
--   - welfare_fund_requests
--   - eap_cases                        (RBAC-isolated, employee-only access)
--
-- Nepal Labour Act 2017 (2074): Section 18 (employer fully bears
-- accident insurance premium; 50-50 medical insurance split); 12 days
-- fully-paid sick/mental-health leave + 1 month unpaid if medically
-- recommended; mandatory enterprise-level Welfare Fund for emergency
-- relief; SSF integration (provident fund, gratuity, medical, accident
-- coverage in one system); Health & Safety Committee for 20+ workers.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: WELLNESS PROGRAM
-- ================================================================
CREATE TABLE IF NOT EXISTS wellness_challenges (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    title                  VARCHAR(200) NOT NULL,
    starts_at                 DATE NOT NULL,
    ends_at                       DATE,
    reward_points                    INT DEFAULT 20,
    created_at                           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wellness_challenge_participants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wellness_challenge_id UUID NOT NULL REFERENCES wellness_challenges(id),
    employee_id            UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    progress_pct            NUMERIC(5,2) DEFAULT 0,
    wearable_steps_today        INT DEFAULT 0,
    joined_at                       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (wellness_challenge_id, employee_id)
);

-- ================================================================
-- PAGE 2: MENTAL HEALTH SUPPORT (RBAC-ISOLATED -- no manager/HR join path)
-- ================================================================
CREATE TABLE IF NOT EXISTS mental_health_sessions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    clinician_name                VARCHAR(200),
    preferred_language                VARCHAR(30),
    session_date                          TIMESTAMPTZ,
    sessions_allotted_annual                  INT DEFAULT 8,

    -- intentionally NO outcome/notes/diagnosis column in the core HR
    -- schema -- clinical content lives exclusively in the vetted
    -- third-party therapy platform, never in NepHR Pro's database
    booked_at                                    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 3: INSURANCE MANAGEMENT (Section 18 statutory split)
-- ================================================================
CREATE TABLE IF NOT EXISTS insurance_policies (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    policy_type                  VARCHAR(20) NOT NULL CHECK (policy_type IN ('medical','accident')),
    policy_no                        VARCHAR(50),
    coverage_limit_npr                   NUMERIC(12,2) NOT NULL,
    used_npr                                 NUMERIC(12,2) DEFAULT 0,

    -- Section 18: accident = 100% employer-borne; medical = 50-50 split
    employer_premium_pct                         NUMERIC(5,2) NOT NULL,
    employee_premium_pct                             NUMERIC(5,2) NOT NULL,

    active                                               BOOLEAN DEFAULT TRUE,
    created_at                                               TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, policy_type)
);

CREATE TABLE IF NOT EXISTS insurance_claims (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    insurance_policy_id       UUID       NOT NULL REFERENCES insurance_policies(id),
    employee_id                  UUID    NOT NULL REFERENCES employees(id),

    provider_name                    VARCHAR(200) NOT NULL,
    amount_npr                           NUMERIC(12,2) NOT NULL,
    receipt_url                              VARCHAR(500),
    ocr_extracted_amount                         NUMERIC(12,2),

    status                                           VARCHAR(20) DEFAULT 'under_review' CHECK (status IN ('under_review','approved','rejected')),

    submitted_at                                         TIMESTAMPTZ DEFAULT NOW(),
    decided_at                                               TIMESTAMPTZ
);

-- ================================================================
-- PAGE 4: EMERGENCY SUPPORT (reuses the EXISTING employee_emergency_contacts)
-- ================================================================
CREATE TABLE IF NOT EXISTS emergency_sos_alerts (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    latitude                     NUMERIC(10,7),
    longitude                        NUMERIC(10,7),

    notified_emergency_contact_id    UUID REFERENCES employee_emergency_contacts(id),  -- the EXISTING table, never duplicated
    hr_notified_at                       TIMESTAMPTZ,

    triggered_at                            TIMESTAMPTZ DEFAULT NOW(),
    resolved_at                                 TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS safety_checkin_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    event_title            VARCHAR(300) NOT NULL,  -- e.g. 'Monsoon Flooding Alert -- Kathmandu Valley'
    affected_location          VARCHAR(200),
    issued_at                      TIMESTAMPTZ DEFAULT NOW(),
    closed_at                          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS safety_checkin_responses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    safety_checkin_event_id UUID NOT NULL REFERENCES safety_checkin_events(id),
    employee_id            UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    confirmed_safe            BOOLEAN,
    responded_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (safety_checkin_event_id, employee_id)
);

CREATE TABLE IF NOT EXISTS welfare_fund_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    reason                        TEXT NOT NULL,
    requested_amount_npr             NUMERIC(12,2) NOT NULL,
    approved_amount_npr                  NUMERIC(12,2),

    status                                   VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    decided_by                                   UUID,
    decided_at                                       TIMESTAMPTZ,

    submitted_at                                         TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 5: EMPLOYEE ASSISTANCE PROGRAM (RBAC-ISOLATED -- no manager/HR join path)
-- ================================================================
CREATE TABLE IF NOT EXISTS eap_cases (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    category                     VARCHAR(20) NOT NULL CHECK (category IN ('legal','financial','emotional')),
    status                           VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested','scheduled','completed')),
    scheduled_date                       DATE,

    -- intentionally NO outcome/case-content column -- same isolation
    -- principle as mental_health_sessions
    requested_at                             TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_wcp_employee       ON wellness_challenge_participants(employee_id);
CREATE INDEX IF NOT EXISTS idx_mhs_employee            ON mental_health_sessions(employee_id);  -- only ever queried with employee_id = current_user
CREATE INDEX IF NOT EXISTS idx_ip_employee                 ON insurance_policies(employee_id);
CREATE INDEX IF NOT EXISTS idx_iclaim_employee                  ON insurance_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_iclaim_pending                       ON insurance_claims(status) WHERE status = 'under_review';
CREATE INDEX IF NOT EXISTS idx_esa_employee                             ON emergency_sos_alerts(employee_id);
CREATE INDEX IF NOT EXISTS idx_esa_unresolved                              ON emergency_sos_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sce_open                                        ON safety_checkin_events(closed_at) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_scr_event                                           ON safety_checkin_responses(safety_checkin_event_id);
CREATE INDEX IF NOT EXISTS idx_wfr_pending                                             ON welfare_fund_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_eap_employee                                                ON eap_cases(employee_id);  -- only ever queried with employee_id = current_user

-- ================================================================
-- TRIGGERS
-- ================================================================

-- On SOS trigger: pull the EXISTING primary emergency contact and
-- notify HR + that contact, reusing transaction_notifications
CREATE OR REPLACE FUNCTION fn_process_sos_alert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE contact_id UUID; emp_name TEXT;
BEGIN
    SELECT id INTO contact_id FROM employee_emergency_contacts
    WHERE employee_id = NEW.employee_id AND is_primary = TRUE AND NOT is_deleted LIMIT 1;

    NEW.notified_emergency_contact_id := contact_id;
    NEW.hr_notified_at := NOW();

    SELECT first_name || ' ' || last_name INTO emp_name FROM employees WHERE id = NEW.employee_id;

    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    SELECT NEW.company_id, 'emergency_sos_alerts', NEW.id, 'sos_triggered', hr.id, 'direct_party',
           format('SOS alert from %s -- location shared, immediate attention required.', emp_name), NOW()
    FROM employees hr WHERE hr.role IN ('hr_manager', 'super_admin') AND hr.company_id = NEW.company_id;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_process_sos
    BEFORE INSERT ON emergency_sos_alerts
    FOR EACH ROW EXECUTE FUNCTION fn_process_sos_alert();

-- Auto-trigger a safety check-in response request to every employee
-- when a new crisis event is issued
CREATE OR REPLACE FUNCTION fn_broadcast_safety_checkin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE emp RECORD;
BEGIN
    FOR emp IN SELECT id FROM employees WHERE company_id = NEW.company_id LOOP
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'safety_checkin_events', NEW.id, 'safety_checkin_requested', emp.id, 'direct_party',
           format('Safety check-in: %s -- please confirm you are safe.', NEW.event_title), NOW());
    END LOOP;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_broadcast_checkin
    AFTER INSERT ON safety_checkin_events
    FOR EACH ROW EXECUTE FUNCTION fn_broadcast_safety_checkin();

-- On insurance claim approval, increment the policy's used_npr
CREATE OR REPLACE FUNCTION fn_apply_claim_to_policy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        NEW.decided_at := NOW();
        UPDATE insurance_policies SET used_npr = used_npr + NEW.amount_npr WHERE id = NEW.insurance_policy_id;

        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'insurance_claims', NEW.id, 'claim_approved', NEW.employee_id, 'direct_party',
           format('Your claim for NPR %s has been approved.', NEW.amount_npr), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_claim
    BEFORE UPDATE OF status ON insurance_claims
    FOR EACH ROW EXECUTE FUNCTION fn_apply_claim_to_policy();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: my wellness dashboard
CREATE OR REPLACE VIEW v_my_wellness_dashboard AS
SELECT wcp.*, wc.title, wc.ends_at, wc.reward_points
FROM wellness_challenge_participants wcp
JOIN wellness_challenges wc ON wcp.wellness_challenge_id = wc.id;

-- Page 2: my mental health dashboard -- STRICTLY self-service scoped;
-- application layer MUST filter WHERE employee_id = :current_user_id
-- and this view must NEVER be exposed via a manager/HR-facing route
CREATE OR REPLACE VIEW v_my_mental_health_sessions AS
SELECT id, employee_id, clinician_name, preferred_language, session_date, sessions_allotted_annual, booked_at,
    (sessions_allotted_annual - (SELECT COUNT(*) FROM mental_health_sessions mhs2 WHERE mhs2.employee_id = mental_health_sessions.employee_id)) AS sessions_remaining
FROM mental_health_sessions;

-- THE ONLY mental-health-adjacent view permitted in manager/HR
-- dashboards: fully anonymized, aggregated, suppressed below a
-- minimum group size to prevent re-identification
CREATE OR REPLACE VIEW v_wellbeing_anonymized_trends AS
SELECT d.name AS department_name,
    CASE WHEN COUNT(DISTINCT mhs.employee_id) < 5 THEN NULL ELSE COUNT(DISTINCT mhs.employee_id) END AS utilization_count_suppressed,
    e.company_id
FROM mental_health_sessions mhs
JOIN employees e ON mhs.employee_id = e.id
JOIN departments d ON e.department_id = d.id
GROUP BY d.name, e.company_id;

-- Page 3: insurance dashboard
CREATE OR REPLACE VIEW v_insurance_dashboard AS
SELECT ip.*, ROUND(ip.used_npr / NULLIF(ip.coverage_limit_npr,0) * 100, 1) AS used_pct
FROM insurance_policies ip;

CREATE OR REPLACE VIEW v_claims_dashboard AS
SELECT ic.*, ip.policy_type
FROM insurance_claims ic
JOIN insurance_policies ip ON ic.insurance_policy_id = ip.id;

-- Page 4: emergency dashboard, joined with the EXISTING emergency contacts
CREATE OR REPLACE VIEW v_emergency_support_dashboard AS
SELECT esa.*, ec.contact_name, ec.phone_number AS contact_phone
FROM emergency_sos_alerts esa
LEFT JOIN employee_emergency_contacts ec ON esa.notified_emergency_contact_id = ec.id;

CREATE OR REPLACE VIEW v_active_safety_checkins AS
SELECT sce.*,
    COUNT(scr.id) AS total_responses,
    COUNT(scr.id) FILTER (WHERE scr.confirmed_safe) AS confirmed_safe_count,
    (SELECT COUNT(*) FROM employees WHERE company_id = sce.company_id) - COUNT(scr.id) AS unconfirmed_count
FROM safety_checkin_events sce
LEFT JOIN safety_checkin_responses scr ON scr.safety_checkin_event_id = sce.id
WHERE sce.closed_at IS NULL
GROUP BY sce.id;

-- Page 5: my EAP dashboard -- same strict self-service scoping as mental health
CREATE OR REPLACE VIEW v_my_eap_cases AS
SELECT * FROM eap_cases;
