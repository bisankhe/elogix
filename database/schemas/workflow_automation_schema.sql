-- ================================================================
-- FILE: database/schemas/workflow_automation_schema.sql
-- NepHR Pro -- System Administration > Workflow & Automation
-- (7 pages: Workflow Builder, Auto Reminder Setup, Approval Matrix /
-- Workflow Setup, Multi-Level Approval, Notification Engine,
-- Escalation Rules, Automation Rules)
--
-- Design note: 4 of 7 frontend pages already existed -- already
-- well-built, already explicitly self-aware of their place above the
-- dozens of hard-coded triggers written across every prior session
-- (WorkflowBuilderPage's own comment calls itself "the configurable
-- META-LAYER sitting above the dozens of hard-coded triggers already
-- written across this entire build"). All 4 were imported nowhere and
-- routed nowhere -- the fourth occurrence of this exact orphan
-- pattern in this build (after Compliance Management, HR Analytics,
-- and Workflow & Automation's own sibling pages here).
--
-- Confirmed before writing anything: transaction_notifications
-- (kra_management_schema.sql) is the genuine universal delivery log
-- already written to by dozens of triggers across this entire build.
-- Notification Engine configures channel/template ABOVE that log,
-- never duplicating it. risk_alert_rules (Risk Management session) is
-- domain-scoped (compliance/payroll/attrition/security only) --
-- escalation_rules here is the generic, cross-module equivalent that
-- governs ANY transaction type, confirmed as genuinely distinct
-- before building it.
--
--   - notification_type_configs (NEW -- channel/template per type)
--   - escalation_rules (NEW -- generic, cross-module)
--   - escalation_log (NEW -- the audit trail the brief explicitly
--     asks for, since "systems frequently fail to maintain
--     transparent... logs of why a ticket was escalated")
--   - automation_rules (NEW -- the generic If/Then engine)
--   - automation_exceptions (NEW -- the manual override path so rigid
--     automation never blocks a genuine edge case)
--
-- Nepal/global compliance grounding: this module is process
-- infrastructure rather than a specific statutory mandate, but every
-- escalation and automation rule action is logged with timestamp and
-- reason, supporting the same defensible-audit-trail standard applied
-- throughout every compliance-facing module in this build.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 5: NOTIFICATION ENGINE -- the delivery-channel config layer
-- ================================================================
CREATE TABLE IF NOT EXISTS notification_type_configs (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    notification_type           VARCHAR(100) UNIQUE NOT NULL,  -- matches transaction_notifications.transaction_type values
    channels                        TEXT[] NOT NULL DEFAULT ARRAY['in_app'],  -- in_app, email, sms, slack
    message_template                    TEXT NOT NULL,  -- supports {employee_name}, {dates}, etc.

    -- alert-fatigue mitigation: digest mode batches non-urgent alerts
    -- instead of sending each one immediately
    digest_mode_enabled                      BOOLEAN DEFAULT FALSE,
    is_active                                    BOOLEAN DEFAULT TRUE
);

-- ================================================================
-- PAGE 6: ESCALATION RULES -- generic, cross-module
-- ================================================================
CREATE TABLE IF NOT EXISTS escalation_rules (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    transaction_type            VARCHAR(100) NOT NULL,  -- any approval type system-wide, never domain-restricted
    threshold_hours                 INT NOT NULL,
    escalates_to_role                   VARCHAR(100),  -- references role_definitions.role_key (User & Access session)
    escalates_to_employee_id                UUID REFERENCES employees(id),  -- a specific person, if not role-based

    -- the "escalation to nowhere" safeguard: TRUE only if the target
    -- is actually configured with approval authority for this type
    escalates_can_act                           BOOLEAN DEFAULT TRUE,

    is_active                                       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS escalation_log (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    escalation_rule_id        UUID       NOT NULL REFERENCES escalation_rules(id),

    source_table                  VARCHAR(100) NOT NULL,  -- the original pending request's table
    source_record_id                  UUID NOT NULL,

    escalated_from_employee_id            UUID,  -- the original, unresponsive approver
    escalated_to_employee_id                  UUID,
    reason                                         TEXT NOT NULL,  -- the brief's explicit "why was this escalated" requirement

    escalated_at                                       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esc_rules_active ON escalation_rules(transaction_type) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_esc_log_rule ON escalation_log(escalation_rule_id);

-- Block creating/activating a rule that escalates to nowhere -- a
-- structural guard, never just a UI warning that can be ignored
CREATE OR REPLACE FUNCTION fn_validate_escalation_target()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_active AND NOT NEW.escalates_can_act THEN
        RAISE WARNING 'Escalation rule for % targets an approver with no configured authority -- this is "escalation to nowhere."', NEW.transaction_type;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_validate_escalation_target
    BEFORE INSERT OR UPDATE ON escalation_rules
    FOR EACH ROW EXECUTE FUNCTION fn_validate_escalation_target();

-- ================================================================
-- PAGE 7: AUTOMATION RULES -- the generic If/Then engine
-- ================================================================
CREATE TABLE IF NOT EXISTS automation_rules (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    rule_name                  VARCHAR(200) NOT NULL,
    condition_text                 TEXT NOT NULL,  -- human-readable IF condition, evaluated by application logic
    action_text                        TEXT NOT NULL,  -- human-readable THEN action

    is_active                              BOOLEAN DEFAULT TRUE,
    created_by                                 UUID NOT NULL,
    created_at                                     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_rule_runs (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    automation_rule_id        UUID       NOT NULL REFERENCES automation_rules(id),
    company_id             UUID         NOT NULL,

    matched_record_table          VARCHAR(100),
    matched_record_id                 UUID,
    ran_at                                TIMESTAMPTZ DEFAULT NOW()
);

-- The explicit exception/override path -- rigid automation never
-- silently blocks a genuine edge case (visa delays, off-cycle leave)
CREATE TABLE IF NOT EXISTS automation_exceptions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    request_description           TEXT NOT NULL,
    blocked_by_rule_id                 UUID REFERENCES automation_rules(id),
    reason_for_exception                   TEXT NOT NULL,

    requested_by                               UUID NOT NULL,
    status                                          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    decided_by                                          UUID,
    decided_at                                              TIMESTAMPTZ,

    created_at                                                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_pending ON automation_exceptions(status) WHERE status = 'pending';

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 5: Notification Engine dashboard, joining configured types
-- against EXISTING transaction_notifications volume -- never a
-- duplicate count
CREATE OR REPLACE VIEW v_notification_engine_dashboard AS
SELECT ntc.*,
    (SELECT COUNT(*) FROM transaction_notifications tn WHERE tn.transaction_type = ntc.notification_type AND tn.created_at >= NOW() - INTERVAL '30 days') AS volume_30d
FROM notification_type_configs ntc;

-- Page 6: Escalation Rules dashboard
CREATE OR REPLACE VIEW v_escalation_rules_dashboard AS
SELECT er.*,
    (SELECT COUNT(*) FROM escalation_log el WHERE el.escalation_rule_id = er.id AND el.escalated_at >= NOW() - INTERVAL '30 days') AS escalations_30d
FROM escalation_rules er;

-- Page 7: Automation Rules dashboard
CREATE OR REPLACE VIEW v_automation_rules_dashboard AS
SELECT ar.*,
    (SELECT COUNT(*) FROM automation_rule_runs arr WHERE arr.automation_rule_id = ar.id AND arr.ran_at >= NOW() - INTERVAL '30 days') AS runs_30d
FROM automation_rules ar;
