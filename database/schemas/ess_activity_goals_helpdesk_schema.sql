-- ================================================================
-- FILE: database/schemas/ess_activity_goals_helpdesk_schema.sql
-- NepHR Pro -- HR Services & Support > Employee Self Service (ESS),
-- fourth batch (10 pages: My Goals & KPI, My Training, My Requests,
-- My Activity Today/This Week/This Month/This Quarter/This Year, My
-- Feedback, Helpdesk & Ticket)
--
-- Design note: the centerpiece of this session is ONE genuinely new
-- table -- employee_activity_log -- feeding all FIVE "My Activity"
-- pages at different time-window aggregations. This is deliberately
-- distinct from the EXISTING transaction_notifications table: that
-- table tracks what was done TO/FOR a recipient (it has
-- recipient_employee_id as its key field); this table tracks what the
-- ACTOR themselves did (actor_employee_id). Conflating the two would
-- have been a real correctness bug -- a notification a manager
-- receives is not "their activity."
--
-- Every other page in this batch reuses EXISTING tables verbatim:
--   - My Goals & KPI   -> v_unified_goal_tracking (Goal Tracking session)
--   - My Training      -> v_my_learning_path (Course Management session)
--   - My Requests      -> a read-only UNION across many existing
--                         request tables (leave, attendance, cash
--                         advance, letters, accommodation) -- no new
--                         workflow engine
--   - My Feedback       -> peer_recognitions + survey_responses +
--                         employee_feedback_tickets (Employee
--                         Engagement session) -- kept on TWO separate
--                         tabs deliberately, since public recognition
--                         and confidential pulse/1-on-1 data have
--                         fundamentally different trust models
--   - Helpdesk & Ticket  -> hr_helpdesk_tickets (HR Helpdesk session)
--
--   - employee_activity_log (the new activity-trace table)
--
-- Nepal legal grounding: this batch is primarily a UX/consolidation
-- layer over modules already grounded in the Labour Act 2074 (leave,
-- attendance, payroll, grievance) in prior sessions; the activity log
-- itself satisfies the general Section 107/109 record-keeping spirit
-- by making the employee's own system usage transparent to themselves.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- THE CORE NEW TABLE: feeds all 5 "My Activity" pages
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_activity_log (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    actor_employee_id         UUID       NOT NULL REFERENCES employees(id),  -- WHO performed the action (not who it's about)

    module                        VARCHAR(30) NOT NULL,  -- attendance, leave, payroll, training, document, signature, goal, feedback, helpdesk, login
    action_description               TEXT NOT NULL,
    source_table                         VARCHAR(100),  -- optional pointer back to the originating record
    source_record_id                         UUID,

    occurred_at                                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES (each "My Activity X" page queries a different time window
-- off the SAME table, so the index strategy must support all 5 efficiently)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_eal_actor_time ON employee_activity_log(actor_employee_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_eal_module      ON employee_activity_log(module);
CREATE INDEX IF NOT EXISTS idx_eal_company          ON employee_activity_log(company_id, occurred_at DESC);

-- ================================================================
-- VIEWS (one per time window, all reading the SAME table -- this is
-- the structural guarantee that Today/Week/Month/Quarter/Year never drift)
-- ================================================================

CREATE OR REPLACE VIEW v_my_activity_today AS
SELECT * FROM employee_activity_log
WHERE occurred_at::DATE = CURRENT_DATE
ORDER BY occurred_at ASC;

CREATE OR REPLACE VIEW v_my_activity_this_week AS
SELECT
    date_trunc('day', occurred_at)::DATE AS activity_date,
    actor_employee_id, company_id,
    COUNT(*) AS action_count,
    mode() WITHIN GROUP (ORDER BY module) AS top_module
FROM employee_activity_log
WHERE occurred_at >= date_trunc('week', CURRENT_DATE)
GROUP BY date_trunc('day', occurred_at), actor_employee_id, company_id
ORDER BY activity_date ASC;

CREATE OR REPLACE VIEW v_my_activity_this_month AS
SELECT
    'Week ' || CEIL(EXTRACT(DAY FROM occurred_at) / 7.0)::INT AS week_label,
    actor_employee_id, company_id,
    COUNT(*) AS action_count
FROM employee_activity_log
WHERE occurred_at >= date_trunc('month', CURRENT_DATE)
GROUP BY 'Week ' || CEIL(EXTRACT(DAY FROM occurred_at) / 7.0)::INT, actor_employee_id, company_id
ORDER BY week_label ASC;

CREATE OR REPLACE VIEW v_my_activity_this_quarter AS
SELECT
    to_char(occurred_at, 'Month') AS month_label,
    actor_employee_id, company_id,
    COUNT(*) AS action_count
FROM employee_activity_log
WHERE occurred_at >= date_trunc('quarter', CURRENT_DATE)
GROUP BY to_char(occurred_at, 'Month'), date_trunc('month', occurred_at), actor_employee_id, company_id
ORDER BY date_trunc('month', occurred_at) ASC;

CREATE OR REPLACE VIEW v_my_activity_this_year AS
SELECT
    'Q' || EXTRACT(QUARTER FROM occurred_at)::INT AS quarter_label,
    actor_employee_id, company_id,
    COUNT(*) AS action_count
FROM employee_activity_log
WHERE occurred_at >= date_trunc('year', CURRENT_DATE)
GROUP BY EXTRACT(QUARTER FROM occurred_at), actor_employee_id, company_id
ORDER BY EXTRACT(QUARTER FROM occurred_at) ASC;

-- ================================================================
-- TRIGGER HELPER: a single reusable function other modules can call
-- (via a wrapper trigger on their own tables) to log activity without
-- this schema needing to know about every other table in the system
-- ================================================================
CREATE OR REPLACE FUNCTION fn_log_employee_activity(
    p_company_id UUID, p_actor_id UUID, p_module VARCHAR, p_description TEXT,
    p_source_table VARCHAR DEFAULT NULL, p_source_record_id UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO employee_activity_log (company_id, actor_employee_id, module, action_description, source_table, source_record_id, occurred_at)
    VALUES (p_company_id, p_actor_id, p_module, p_description, p_source_table, p_source_record_id, NOW());
END;$$;

-- Example wiring (illustrative -- actual triggers on attendance/leave/
-- training tables would call fn_log_employee_activity in their own
-- AFTER INSERT triggers, e.g.:
--   PERFORM fn_log_employee_activity(NEW.company_id, NEW.employee_id, 'attendance', 'Clock-in recorded');

-- ================================================================
-- PAGE 3: MY REQUESTS -- the unified read-only aggregation view
-- ================================================================
CREATE OR REPLACE VIEW v_my_requests_unified AS
SELECT 'Leave Request' AS request_type, id, employee_id, company_id, status::TEXT AS stage, created_at AS submitted_at
FROM leave_applications
UNION ALL
SELECT 'Attendance Request', id, employee_id, company_id,
       CASE WHEN request_type = 'missed_punch' THEN 'Submitted' ELSE 'Submitted' END, request_date::TIMESTAMPTZ
FROM missed_punch_requests
UNION ALL
SELECT 'Cash Advance', id, employee_id, company_id, approval_stage, created_at
FROM salary_advances
UNION ALL
SELECT 'Letter Request', id, employee_id, company_id, status, requested_at
FROM internal_letter_requests
UNION ALL
SELECT 'Accommodation Request', id, employee_id, company_id, status, requested_at
FROM accommodation_requests
ORDER BY submitted_at DESC;
