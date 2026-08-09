-- ================================================================
-- FILE: database/schemas/integration_api_schema.sql
-- NepHR Pro -- System Administration > Integration & API
-- (3 pages: API & Third Party Integration, Email & SMS Integration,
-- Biometric Integration)
--
-- Design note: Biometric Integration ALREADY existed
-- (BiometricIntegrationPage -- hardware terminal sync, anti-buddy-
-- punching, LA2074 Section 20) but its sidebar entry was split across
-- TWO ids ('biometric-integration' under Attendance Setup,
-- 'biometric-setup' under this brief's Integration & API group) and
-- the page was imported in App.jsx but routed to NEITHER -- a fully
-- orphaned import, confirmed before touching anything. Both keys now
-- point at the same page; no biometric_devices table is duplicated here.
--
-- API & Third Party Integration and Email & SMS Integration are
-- genuinely new -- confirmed before writing anything that no
-- webhook/connector configuration or SMTP/SMS-gateway credential
-- table existed anywhere in the build. notification_type_configs
-- (Workflow & Automation session) lists 'email'/'sms' as channel
-- TYPES but has no actual provider credentials -- email_sms_gateways
-- below is that missing layer underneath it, never a duplicate
-- channel-selection UI.
--
--   - third_party_integrations (NEW)
--   - integration_field_mappings (NEW -- the version-drift/field-
--     mismatch detection the brief explicitly names as a pain point)
--   - email_sms_gateways (NEW -- the real provider credentials)
--   - certified_message_log (NEW -- legal-admissibility delivery proof
--     for disciplinary/policy-update messages)
--
-- Global compliance grounding (no Nepal-specific legal mandate named
-- in this brief): API keys/SMTP credentials encrypted at rest;
-- certified delivery with read-receipt proof for labour-contract-
-- related messages (the brief's explicit GDPR/eIDAS-style legal-
-- admissibility concern); biometric data privacy/consent (handled by
-- the EXISTING BiometricIntegrationPage's own design, not duplicated here).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: API & THIRD PARTY INTEGRATION
-- ================================================================
CREATE TABLE IF NOT EXISTS third_party_integrations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    app_name                   VARCHAR(200) NOT NULL,
    category                       VARCHAR(50) NOT NULL,  -- Communication, ERP, ATS, Payroll, Other
    -- API key / webhook secret -- encrypted at rest, never displayed
    -- again after initial save (enforced at the application layer)
    api_credentials_encrypted      TEXT,
    webhook_url                        VARCHAR(500),

    status                                 VARCHAR(20) DEFAULT 'connected' CHECK (status IN ('connected','error','disconnected')),
    last_sync_at                               TIMESTAMPTZ,
    last_error_message                             TEXT,

    created_at                                         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_field_mappings (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    third_party_integration_id UUID     NOT NULL REFERENCES third_party_integrations(id),

    external_field_name           VARCHAR(150) NOT NULL,  -- the vendor's field name, e.g. 'emp_status'
    internal_field_name               VARCHAR(150) NOT NULL,  -- the mapped HR core field, e.g. 'employment_status'
    expected_value_set                    TEXT[],  -- the values this field should ever contain

    -- TRUE the moment a sync returns a value outside expected_value_set
    -- -- the brief's explicit "vendor changed their schema" pain point
    has_drift_flag                            BOOLEAN DEFAULT FALSE,
    last_unexpected_value                         TEXT
);

CREATE INDEX IF NOT EXISTS idx_ifm_drift ON integration_field_mappings(has_drift_flag) WHERE has_drift_flag;

-- Auto-flag drift and notify HR/IT the moment an unmapped value comes
-- through, before it silently corrupts a downstream payroll/benefits feed
CREATE OR REPLACE FUNCTION fn_flag_field_mapping_drift()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE integ_name VARCHAR(200); company UUID; admin_id UUID;
BEGIN
    IF NEW.has_drift_flag AND (OLD.has_drift_flag IS DISTINCT FROM NEW.has_drift_flag) THEN
        SELECT app_name, company_id INTO integ_name, company FROM third_party_integrations WHERE id = NEW.third_party_integration_id;
        FOR admin_id IN SELECT id FROM employees WHERE company_id = company AND role = 'hr_manager' LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (company, 'integration_field_mappings', NEW.id, 'integration_field_drift', admin_id, 'direct_party',
               format('%s sent an unexpected value for "%s": "%s" -- review before this propagates downstream.', integ_name, NEW.external_field_name, NEW.last_unexpected_value), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_flag_field_drift
    AFTER INSERT OR UPDATE OF has_drift_flag ON integration_field_mappings
    FOR EACH ROW EXECUTE FUNCTION fn_flag_field_mapping_drift();

-- ================================================================
-- PAGE 2: EMAIL & SMS INTEGRATION -- the missing gateway-credential
-- layer underneath the EXISTING notification_type_configs
-- ================================================================
CREATE TABLE IF NOT EXISTS email_sms_gateways (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    provider                    VARCHAR(50) NOT NULL,  -- SendGrid, Twilio, WhatsApp Business API, Custom SMTP
    gateway_type                    VARCHAR(20) NOT NULL CHECK (gateway_type IN ('email','sms','whatsapp')),
    credentials_encrypted               TEXT NOT NULL,
    verified_sender_identity                VARCHAR(200),  -- the sending email address or phone number

    status                                      VARCHAR(20) DEFAULT 'connected' CHECK (status IN ('connected','not_connected')),
    created_at                                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certified_message_log (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    email_sms_gateway_id      UUID       REFERENCES email_sms_gateways(id),

    message_type                  VARCHAR(100) NOT NULL,  -- e.g. 'Disciplinary Warning Letter', 'Policy Update'
    recipient_employee_id             UUID REFERENCES employees(id),
    is_legal_grade                        BOOLEAN DEFAULT FALSE,  -- TRUE for disciplinary/policy-update messages

    delivered_at                              TIMESTAMPTZ,
    read_receipt_captured_at                      TIMESTAMPTZ,

    created_at                                        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cml_legal_grade ON certified_message_log(is_legal_grade) WHERE is_legal_grade;
CREATE INDEX IF NOT EXISTS idx_cml_incomplete_receipt ON certified_message_log(is_legal_grade, read_receipt_captured_at)
    WHERE is_legal_grade AND read_receipt_captured_at IS NULL;

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Integration dashboard with mapping summary
CREATE OR REPLACE VIEW v_third_party_integrations_dashboard AS
SELECT tpi.*,
    (SELECT COUNT(*) FROM integration_field_mappings ifm WHERE ifm.third_party_integration_id = tpi.id) AS fields_mapped,
    (SELECT COUNT(*) FROM integration_field_mappings ifm WHERE ifm.third_party_integration_id = tpi.id AND ifm.has_drift_flag) AS drift_flags
FROM third_party_integrations tpi;

-- Page 2: Gateway dashboard joining the EXISTING notification volume
-- (Notification Engine session, never a duplicate count)
CREATE OR REPLACE VIEW v_email_sms_gateway_dashboard AS
SELECT esg.*,
    (SELECT COUNT(*) FROM certified_message_log cml WHERE cml.email_sms_gateway_id = esg.id AND cml.created_at >= NOW() - INTERVAL '30 days') AS sent_30d
FROM email_sms_gateways esg;

CREATE OR REPLACE VIEW v_certified_message_log_dashboard AS
SELECT *, (is_legal_grade AND read_receipt_captured_at IS NULL) AS receipt_incomplete FROM certified_message_log;
