-- ================================================================
-- FILE: database/schemas/hr_helpdesk_schema.sql
-- NepHR Pro -- HR Services & Support > HR Helpdesk (4 pages:
-- HR Ticketing System, Employee Queries, HR Consultation, Case Tracking)
--
-- Design note: deliberately distinct from THREE existing tables from
-- prior sessions, each addressing a different category of need:
--   - complaints (Employee Relations)      -> investigation-grade
--     (harassment, policy violation), RBAC-restricted to an investigator
--   - employee_feedback_tickets (Employee Engagement) -> open personal
--     feedback channel, manager-or-HR routing choice
--   - grievances (Employee Relations)      -> the FORMAL Section 113-115
--     statutory legal clock (negotiation -> Labour Office -> Labour Court)
-- hr_helpdesk_tickets here is the general-purpose Tier-0/1/2 SERVICE
-- DESK for routine questions (payroll, benefits, leave, policy lookups)
-- -- a different category entirely. Crucially, when a helpdesk ticket
-- becomes a formal grievance, fn_escalate_ticket_to_grievance INSERTS
-- into the EXISTING grievances table (which already computes its own
-- Section 113-115 deadlines via its own trigger) rather than
-- recalculating a second, possibly-conflicting statutory timeline here.
-- Employee Queries reuses the EXISTING knowledge_base_articles
-- (Internal Communication, Employee Engagement session) directly for
-- predictive search -- no parallel KB.
--
--   - hr_helpdesk_tickets        (omnichannel Tier-0/1/2 service desk)
--   - hr_helpdesk_ticket_updates (canned responses + internal notes, audit trail)
--   - hr_consultants             (the bookable specialist directory)
--   - hr_consultations           (scheduled 1-on-1s, confidential by default)
--
-- Nepal legal grounding (this brief's reading): written appointment
-- letters reduce query volume at the source; Labour Relations
-- Committee (10+ employees) is the bipartite consultation forum this
-- helpdesk digitizes day-to-day; written grievances trigger negotiation
-- within 7 days, target resolution within 21 days -- tracked via
-- escalation into the EXISTING grievances table's own statutory engine,
-- never duplicated here; annual Labour Audit requires a presentable
-- grievance-handling record, which this audit trail satisfies.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1 & 2: HR TICKETING SYSTEM / EMPLOYEE QUERIES (shared table,
-- different UI lens: agent console vs. ESS self-service)
-- ================================================================
CREATE TABLE IF NOT EXISTS hr_helpdesk_tickets (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    ticket_no                 VARCHAR(30) UNIQUE NOT NULL,  -- e.g. HRT-2025-248
    employee_id                  UUID    NOT NULL REFERENCES employees(id),

    category                         VARCHAR(50) NOT NULL,  -- Payroll, Benefits, Leave, Policy Question, IT/Access, Other
    subject                              VARCHAR(300) NOT NULL,
    description                             TEXT NOT NULL,
    channel                                     VARCHAR(20) DEFAULT 'web_portal'
                                                CHECK (channel IN ('web_portal','mobile_app','ms_teams','slack','email')),

    tier                                            VARCHAR(10) DEFAULT 'tier_0' CHECK (tier IN ('tier_0','tier_1','tier_2')),
    assigned_agent_id                                   UUID,

    status                                                  VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
    sla_target_hours                                            INT DEFAULT 72,  -- varies by category: payroll=24h, policy=72-120h
    sla_deadline                                                    TIMESTAMPTZ,

    resolution_note                                                     TEXT,
    resolved_at                                                             TIMESTAMPTZ,

    -- set when a ticket is escalated into the formal grievance process
    escalated_grievance_id                                                      UUID REFERENCES grievances(id),

    created_at                                                                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_helpdesk_ticket_updates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hr_helpdesk_ticket_id UUID NOT NULL REFERENCES hr_helpdesk_tickets(id),
    company_id          UUID NOT NULL,
    author_id              UUID NOT NULL,
    is_internal_note          BOOLEAN DEFAULT FALSE,  -- TRUE = hidden from the employee's My Tickets view
    note_text                    TEXT NOT NULL,
    logged_at                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 3: HR CONSULTATION (scheduled 1-on-1s)
-- ================================================================
CREATE TABLE IF NOT EXISTS hr_consultants (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id            UUID NOT NULL REFERENCES employees(id),  -- the HR staff member acting as consultant
    specialty_label           VARCHAR(300),  -- e.g. 'Workplace Conflicts, Sensitive Matters'
    is_active                     BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS hr_consultations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),
    hr_consultant_id             UUID    NOT NULL REFERENCES hr_consultants(id),

    topic                            VARCHAR(300) NOT NULL,
    is_confidential                      BOOLEAN DEFAULT TRUE,  -- discreet by default

    scheduled_for                            TIMESTAMPTZ NOT NULL,
    status                                       VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','cancelled')),
    notes                                            TEXT,  -- post-consultation summary, visible to the employee unless marked internal

    created_at                                           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_hht_employee       ON hr_helpdesk_tickets(employee_id);
CREATE INDEX IF NOT EXISTS idx_hht_open                ON hr_helpdesk_tickets(status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_hht_sla_at_risk              ON hr_helpdesk_tickets(sla_deadline) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_hhtu_ticket                       ON hr_helpdesk_ticket_updates(hr_helpdesk_ticket_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_hc_consultant                         ON hr_consultations(hr_consultant_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_hc_employee                               ON hr_consultations(employee_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-set the SLA deadline on ticket creation, varying target hours
-- by category (payroll issues get a tighter window than general questions)
CREATE OR REPLACE FUNCTION fn_set_ticket_sla()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.sla_target_hours := CASE NEW.category
        WHEN 'Payroll' THEN 24
        WHEN 'Benefits' THEN 48
        WHEN 'Leave' THEN 24
        ELSE 72
    END;
    NEW.sla_deadline := NOW() + (NEW.sla_target_hours || ' hours')::INTERVAL;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_ticket_sla
    BEFORE INSERT ON hr_helpdesk_tickets
    FOR EACH ROW EXECUTE FUNCTION fn_set_ticket_sla();

-- Notify the employee on every status change, reusing the EXISTING
-- transaction_notifications table -- "Received -> In Progress -> Resolved"
CREATE OR REPLACE FUNCTION fn_notify_ticket_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'resolved' THEN NEW.resolved_at := NOW(); END IF;
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'hr_helpdesk_tickets', NEW.id, 'ticket_status_changed', NEW.employee_id, 'direct_party',
           format('Your ticket "%s" is now: %s', NEW.subject, NEW.status), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_ticket_status
    BEFORE UPDATE OF status ON hr_helpdesk_tickets
    FOR EACH ROW EXECUTE FUNCTION fn_notify_ticket_status();

-- THE ESCALATION BRIDGE: when a helpdesk ticket is flagged as escalated
-- (escalated_grievance_id gets set), this does NOT recalculate any
-- statutory deadline -- the EXISTING grievances table's own
-- fn_calculate_grievance_deadlines trigger (Employee Relations session)
-- handles that independently the moment the grievance row is created.
-- This trigger only keeps the ticket's own status in sync.
CREATE OR REPLACE FUNCTION fn_sync_escalated_ticket()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.escalated_grievance_id IS NOT NULL AND OLD.escalated_grievance_id IS NULL THEN
        NEW.status := 'in_progress';  -- escalated tickets stay open in the helpdesk view, never silently closed
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'hr_helpdesk_tickets', NEW.id, 'ticket_escalated', NEW.employee_id, 'direct_party',
           'Your ticket has been escalated to a formal grievance for statutory handling.', NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_sync_escalation
    BEFORE UPDATE OF escalated_grievance_id ON hr_helpdesk_tickets
    FOR EACH ROW EXECUTE FUNCTION fn_sync_escalated_ticket();

-- Notify both parties when an HR consultation is booked
CREATE OR REPLACE FUNCTION fn_notify_consultation_booked()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE consultant_emp_id UUID;
BEGIN
    SELECT employee_id INTO consultant_emp_id FROM hr_consultants WHERE id = NEW.hr_consultant_id;
    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    VALUES
      (NEW.company_id, 'hr_consultations', NEW.id, 'consultation_booked', consultant_emp_id, 'direct_party',
       format('New consultation booked: "%s"', NEW.topic), NOW());
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_booking
    AFTER INSERT ON hr_consultations
    FOR EACH ROW EXECUTE FUNCTION fn_notify_consultation_booked();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: HR Ticketing System / agent console dashboard
CREATE OR REPLACE VIEW v_hr_helpdesk_dashboard AS
SELECT hht.*, e.first_name, e.last_name, e.department_id,
    EXTRACT(EPOCH FROM (hht.sla_deadline - NOW()))/3600 AS sla_hours_left
FROM hr_helpdesk_tickets hht
JOIN employees e ON hht.employee_id = e.id;

-- Page 2: Employee Queries -- "My Tickets" personal view
CREATE OR REPLACE VIEW v_my_tickets AS
SELECT * FROM hr_helpdesk_tickets ORDER BY created_at DESC;

-- Page 3: consultant directory with available-slot count (placeholder
-- logic -- real implementation would diff against a calendar/availability table)
CREATE OR REPLACE VIEW v_consultant_directory AS
SELECT hc.*, e.first_name, e.last_name,
    (SELECT COUNT(*) FROM hr_consultations WHERE hr_consultant_id = hc.id AND status = 'upcoming') AS booked_this_week
FROM hr_consultants hc
JOIN employees e ON hc.employee_id = e.id
WHERE hc.is_active;

-- Page 4: Case Tracking -- the 360-degree view joined with full audit timeline
CREATE OR REPLACE VIEW v_case_tracking_360 AS
SELECT
    hht.*, e.first_name, e.last_name, e.manager_id, d.name AS department_name,
    (SELECT EXTRACT(YEAR FROM AGE(NOW(), e.hire_date)))::NUMERIC AS tenure_years,
    (SELECT jsonb_agg(jsonb_build_object('logged_at', hhtu.logged_at, 'note', hhtu.note_text, 'internal', hhtu.is_internal_note) ORDER BY hhtu.logged_at)
       FROM hr_helpdesk_ticket_updates hhtu WHERE hhtu.hr_helpdesk_ticket_id = hht.id) AS timeline
FROM hr_helpdesk_tickets hht
JOIN employees e ON hht.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;

-- Department-level SLA performance, for the agent console's reporting needs
CREATE OR REPLACE VIEW v_helpdesk_sla_performance AS
SELECT
    category, company_id,
    COUNT(*) AS total_tickets,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600), 1) AS avg_resolution_hours,
    COUNT(*) FILTER (WHERE resolved_at > sla_deadline) AS sla_breaches
FROM hr_helpdesk_tickets
WHERE resolved_at IS NOT NULL
GROUP BY category, company_id;
