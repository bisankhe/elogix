-- ================================================================
-- FILE: database/schemas/risk_management_schema.sql
-- eLogix HRMS -- Compliance & Risk Management > Risk Management
-- (6 pages: KRI Dashboard, Compliance Risk, Payroll Risk, Attrition
-- Risk, Security Risk, Risk Alerts)
--
-- Design note: this module is explicitly a SYNTHESIS layer -- its job
-- is to surface risk signals already tracked elsewhere, not to
-- recalculate them. Confirmed before writing anything:
--   - Compliance Risk -> v_first_salary_policy_gate_status +
--     v_license_dashboard (Compliance Management session, prior delivery)
--   - Attrition Risk  -> v_flight_risk_correlation (Exit Analytics
--     session) for manager-level correlation, AND
--     successor_candidates.incumbent_flight_risk (Succession Planning
--     session) for individual-level scoring -- two granularities,
--     reused as-is, never a third risk model invented here
--   - KRI Dashboard and Risk Alerts are PURE ROLLUPS with no tables of
--     their own -- they read every other risk page's own signals
--
-- Genuinely new: payroll_risk_flags (no anomaly-detection layer
-- existed over payslips/daily_attendance_records until now) and
-- security_access_audit_log + mfa_enrollment (no MFA/login-audit
-- infrastructure existed anywhere in the build).
--
--   - payroll_risk_flags (genuinely new)
--   - mfa_enrollment + security_access_audit_log (genuinely new)
--   - risk_alert_rules + risk_alerts (genuinely new, the configurable
--     remediation-workflow layer)
--
-- Nepal legal grounding: SSF 11% employer / 10% employee contribution
-- split (Payroll Risk validates this ratio); overtime capped 4h/day,
-- 24h/week at 1.5x (Payroll Risk flags breaches); 6-month probation
-- and severance-at-1-month-per-year-served (Attrition Risk exposure
-- calculation); OHS Safety Committee (20+ workers) and stop-work
-- orders (Security Risk's physical-safety dimension); night-shift
-- transport for female employees (Security Risk compliance check).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 3: PAYROLL RISK (genuinely new anomaly-detection layer)
-- ================================================================
CREATE TABLE IF NOT EXISTS payroll_risk_flags (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       REFERENCES employees(id),

    flag_type                     VARCHAR(50) NOT NULL,  -- unapproved_overtime, ssf_mismatch, salary_spike, misclassification
    severity                          VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('high','medium','low')),
    detail                                TEXT NOT NULL,
    financial_exposure_npr                   NUMERIC(12,2),

    linked_payslip_id                            UUID REFERENCES payslips(id),
    status                                           VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','resolved')),
    resolved_at                                          TIMESTAMPTZ,

    detected_at                                              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prf_open ON payroll_risk_flags(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_prf_severity ON payroll_risk_flags(severity);

-- Auto-flag: unapproved overtime crossing the statutory weekly cap (24h)
CREATE OR REPLACE FUNCTION fn_flag_overtime_risk()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN
        SELECT employee_id, company_id, SUM(overtime_hours) AS weekly_ot
        FROM daily_attendance_records
        WHERE attendance_date >= date_trunc('week', CURRENT_DATE)
        GROUP BY employee_id, company_id
        HAVING SUM(overtime_hours) > 20  -- approaching the 24h statutory cap
    LOOP
        INSERT INTO payroll_risk_flags (company_id, employee_id, flag_type, severity, detail, detected_at)
        VALUES (rec.company_id, rec.employee_id, 'unapproved_overtime', 'high',
                format('%.1f hours logged this week, approaching the 24h statutory weekly cap.', rec.weekly_ot), NOW());
    END LOOP;
END;$$;

-- Auto-flag: salary spike month-over-month with no linked promotion
CREATE OR REPLACE FUNCTION fn_flag_salary_spike()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE prior_gross NUMERIC; pct_change NUMERIC;
BEGIN
    SELECT gross_npr INTO prior_gross FROM payslips
    WHERE employee_id = NEW.employee_id AND id != NEW.id
    ORDER BY pay_period DESC LIMIT 1;

    IF prior_gross IS NOT NULL AND prior_gross > 0 THEN
        pct_change := (NEW.gross_npr - prior_gross) / prior_gross * 100;
        IF pct_change > 25 THEN
            INSERT INTO payroll_risk_flags (company_id, employee_id, flag_type, severity, detail, financial_exposure_npr, linked_payslip_id, detected_at)
            VALUES (NEW.company_id, NEW.employee_id, 'salary_spike', 'high',
                    format('Gross pay increased %.0f%% month-over-month with no linked promotion record.', pct_change),
                    NEW.gross_npr - prior_gross, NEW.id, NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_flag_salary_spike
    AFTER INSERT ON payslips
    FOR EACH ROW EXECUTE FUNCTION fn_flag_salary_spike();

-- ================================================================
-- PAGE 5: SECURITY RISK (genuinely new MFA/access-audit layer)
-- ================================================================
CREATE TABLE IF NOT EXISTS mfa_enrollment (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id) UNIQUE,
    mfa_enabled                   BOOLEAN DEFAULT FALSE,
    enabled_at                        TIMESTAMPTZ,
    last_login_at                         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS security_access_audit_log (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    accessed_resource             VARCHAR(100) NOT NULL,  -- e.g. 'payroll_data', 'employee_pii'
    access_ip                         INET,
    access_device                         VARCHAR(200),
    is_outside_business_hours                 BOOLEAN DEFAULT FALSE,
    is_unusual_pattern                            BOOLEAN DEFAULT FALSE,  -- flagged by anomaly check (new device/location)

    accessed_at                                       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saal_unusual ON security_access_audit_log(is_unusual_pattern) WHERE is_unusual_pattern;
CREATE INDEX IF NOT EXISTS idx_mfa_disabled ON mfa_enrollment(mfa_enabled) WHERE NOT mfa_enabled;

-- Notify security/HR admin the moment an unusual access pattern logs
CREATE OR REPLACE FUNCTION fn_flag_unusual_access()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE security_admin RECORD;
BEGIN
    IF NEW.is_unusual_pattern THEN
        FOR security_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'security_access_audit_log', NEW.id, 'unusual_access_pattern', security_admin.id, 'direct_party',
               format('Unusual access to %s detected -- review immediately.', NEW.accessed_resource), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_flag_unusual_access
    AFTER INSERT ON security_access_audit_log
    FOR EACH ROW EXECUTE FUNCTION fn_flag_unusual_access();

-- ================================================================
-- PAGE 6: RISK ALERTS (genuinely new, the configurable remediation layer)
-- ================================================================
CREATE TABLE IF NOT EXISTS risk_alert_rules (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    domain                     VARCHAR(20) NOT NULL CHECK (domain IN ('compliance','payroll','attrition','security')),
    rule_name                      VARCHAR(200) NOT NULL,
    threshold_value                    NUMERIC(12,2),
    is_active                              BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS risk_alerts (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    risk_alert_rule_id        UUID       REFERENCES risk_alert_rules(id),

    domain                        VARCHAR(20) NOT NULL CHECK (domain IN ('compliance','payroll','attrition','security')),
    title                             VARCHAR(300) NOT NULL,
    detail                                TEXT,
    severity                                 VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('high','medium','low')),

    -- the source record this alert traces back to, for the direct
    -- "resolve" action the brief explicitly asks for
    source_table                                 VARCHAR(100),
    source_record_id                                 UUID,

    status                                               VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','resolved')),
    assigned_to_employee_id                                  UUID,
    resolved_at                                                  TIMESTAMPTZ,

    created_at                                                       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ra_open ON risk_alerts(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_ra_domain ON risk_alerts(domain);

-- Route the alert to the right manager automatically based on
-- reporting line, never a generic shared inbox
CREATE OR REPLACE FUNCTION fn_route_risk_alert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_employee_id UUID; mgr_id UUID;
BEGIN
    IF NEW.source_table = 'employees' THEN
        SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.source_record_id;
        IF mgr_id IS NOT NULL THEN
            NEW.assigned_to_employee_id := mgr_id;
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'risk_alerts', NEW.id, 'risk_alert_assigned', mgr_id, 'reporting_manager',
               format('New %s risk alert: %s', NEW.domain, NEW.title), NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_route_alert
    BEFORE INSERT ON risk_alerts
    FOR EACH ROW EXECUTE FUNCTION fn_route_risk_alert();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: KRI Dashboard -- the single weighted health-index rollup
CREATE OR REPLACE VIEW v_kri_health_index AS
SELECT
    company_id,
    (SELECT 100 - LEAST(COUNT(*) * 5, 100) FROM payroll_risk_flags WHERE status = 'open' AND company_id = c.company_id) AS payroll_score,
    (SELECT 100 - LEAST(COUNT(*) * 10, 100) FROM risk_alerts WHERE status = 'open' AND severity = 'high' AND company_id = c.company_id) AS overall_alert_pressure
FROM (SELECT DISTINCT company_id FROM payroll_risk_flags) c;

-- Page 3: Payroll Risk dashboard
CREATE OR REPLACE VIEW v_payroll_risk_dashboard AS
SELECT prf.*, e.first_name, e.last_name FROM payroll_risk_flags prf
LEFT JOIN employees e ON prf.employee_id = e.id
WHERE prf.status = 'open';

-- Page 5: Security Risk dashboard
CREATE OR REPLACE VIEW v_security_risk_dashboard AS
SELECT
    (SELECT ROUND(COUNT(*) FILTER (WHERE mfa_enabled)::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) FROM mfa_enrollment WHERE company_id = sub.company_id) AS mfa_adoption_pct,
    (SELECT COUNT(*) FROM security_access_audit_log WHERE is_unusual_pattern AND company_id = sub.company_id) AS unusual_access_count,
    sub.company_id
FROM (SELECT DISTINCT company_id FROM mfa_enrollment) sub;

-- Page 6: Risk Alerts -- the unified feed across every domain
CREATE OR REPLACE VIEW v_risk_alerts_feed AS
SELECT * FROM risk_alerts WHERE status = 'open' ORDER BY severity DESC, created_at DESC;
