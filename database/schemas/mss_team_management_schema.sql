-- ================================================================
-- FILE: database/schemas/mss_team_management_schema.sql
-- NepHR Pro -- HR Services & Support > Manager Self Service (MSS)
-- (11 pages: Team Dashboard, Team Attendance, Approval Center,
-- Performance Review, Team Activity Today/This Week/This Month/This
-- Quarter/This Year, Forward Cash Advance Request, Minutes of Meeting)
--
-- Design note: the 5 "Team Activity" pages reuse the EXISTING
-- employee_activity_log (ESS Batch 4 session) verbatim -- just
-- filtered to actor_employee_id IN (direct reports) instead of a
-- single self ID. The SAME 5 time-windowed views from that session
-- are reused via a manager-scoped wrapper view rather than duplicated
-- per-window logic a second time.
--
-- Forward Cash Advance Request EXTENDS the EXISTING salary_advances
-- (already cap-checked and 3-tier-stage-aware from ESS Batch 2) with
-- only the genuinely new "forward to alternate approver" branch and
-- its audit trail -- never a second cash-advance table.
--
-- Performance Review (MSS) is deliberately distinct from the EXISTING
-- PerformanceReviewPage's underlying performance_appraisals (the
-- whole-cycle collaborative discussion) -- this page's state machine
-- (Self-Eval -> Manager Assessment -> HR Review) tracks PROCESS stage,
-- a genuinely new concept layered on top of the same appraisal record.
--
-- Minutes of Meeting was a completely orphaned concept -- two sidebar
-- entries referenced it across prior sessions but no table or page
-- ever existed. Built fresh here.
--
--   - cash_advance_forwards (the new forward-to-alternate-approver branch)
--   - performance_review_stages (the Self-Eval/Manager/HR state machine)
--   - meeting_minutes + meeting_action_items (genuinely new)
--
-- Nepal legal grounding: Section 20 (8h/day, 48h/week, OT at 1.5x up
-- to 4h/day & 24h/week -- Team Attendance surfaces this directly to
-- the approving manager); Labour Act delegated-authority requirement
-- (employers must explicitly designate who may approve leave/overtime
-- -- modeled via department_head/manager role checks already in the
-- system); Section 34-35 deduction-consent rules (cash advance
-- forwarding never bypasses written consent already captured at
-- request time); probation up to 6 months for performance assessment.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 4: PERFORMANCE REVIEW (MSS) -- the process state machine,
-- layered on the EXISTING performance_appraisals
-- ================================================================
CREATE TABLE IF NOT EXISTS performance_review_stages (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    performance_appraisal_id UUID       NOT NULL REFERENCES performance_appraisals(id) UNIQUE,

    stage                         VARCHAR(20) DEFAULT 'self_evaluation'
                                  CHECK (stage IN ('self_evaluation','manager_assessment','hr_review','completed')),

    self_eval_score                  NUMERIC(4,2),
    manager_assessment_notes             TEXT,
    manager_assessed_by                      UUID,
    manager_assessed_at                          TIMESTAMPTZ,

    due_date                                         DATE,
    created_at                                           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 10: FORWARD CASH ADVANCE REQUEST -- the new forwarding branch,
-- extending the EXISTING salary_advances
-- ================================================================
CREATE TABLE IF NOT EXISTS cash_advance_forwards (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    salary_advance_id         UUID       NOT NULL REFERENCES salary_advances(id),

    forwarded_by                  UUID NOT NULL,  -- the manager
    forwarded_to                      UUID NOT NULL,  -- the alternate approver (Finance, HR Director, etc.)
    justification_note                    TEXT NOT NULL,  -- mandatory, per the brief's wireframe spec

    forwarded_at                              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 11: MINUTES OF MEETING (genuinely new, no prior precedent)
-- ================================================================
CREATE TABLE IF NOT EXISTS meeting_minutes (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    organizer_employee_id     UUID       NOT NULL REFERENCES employees(id),

    title                         VARCHAR(300) NOT NULL,
    attendee_employee_ids             UUID[],
    meeting_date                          DATE NOT NULL DEFAULT CURRENT_DATE,

    capture_mode                              VARCHAR(10) DEFAULT 'text' CHECK (capture_mode IN ('voice','text')),
    transcript_raw                                TEXT,  -- raw AI transcription, if voice
    summary_text                                      TEXT,  -- AI-generated or manually written summary

    status                                                VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
    finalized_at                                              TIMESTAMPTZ,

    -- optional link if this meeting was a 1-on-1 tied to a performance review cycle
    linked_performance_review_stage_id                            UUID REFERENCES performance_review_stages(id),

    created_at                                                        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_action_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_minutes_id    UUID NOT NULL REFERENCES meeting_minutes(id),
    company_id          UUID NOT NULL,

    description             TEXT NOT NULL,
    assigned_to_employee_id   UUID REFERENCES employees(id),
    due_date                     DATE,
    status                           VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','completed')),

    created_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_prs_stage       ON performance_review_stages(stage) WHERE stage != 'completed';
CREATE INDEX IF NOT EXISTS idx_prs_overdue          ON performance_review_stages(due_date) WHERE stage != 'completed';
CREATE INDEX IF NOT EXISTS idx_caf_advance               ON cash_advance_forwards(salary_advance_id);
CREATE INDEX IF NOT EXISTS idx_mm_organizer                  ON meeting_minutes(organizer_employee_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_mm_draft                          ON meeting_minutes(status) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_mai_meeting                           ON meeting_action_items(meeting_minutes_id);
CREATE INDEX IF NOT EXISTS idx_mai_open                                  ON meeting_action_items(status) WHERE status = 'open';

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-set the 6-month probation-aligned due date if not provided,
-- and notify the employee on stage transitions
CREATE OR REPLACE FUNCTION fn_notify_review_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE emp_id UUID;
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        SELECT employee_id INTO emp_id FROM performance_appraisals WHERE id = NEW.performance_appraisal_id;
        IF NEW.stage = 'manager_assessment' THEN
            NEW.manager_assessed_at := NOW();
        END IF;
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'performance_review_stages', NEW.id, 'review_stage_changed', emp_id, 'direct_party',
           format('Your performance review has moved to: %s', NEW.stage), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_review_stage
    BEFORE UPDATE OF stage ON performance_review_stages
    FOR EACH ROW EXECUTE FUNCTION fn_notify_review_stage_change();

-- On cash advance forward: update the underlying salary_advances stage
-- AND notify the new approver, reusing the EXISTING transaction_notifications
CREATE OR REPLACE FUNCTION fn_process_cash_advance_forward()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE emp_name TEXT;
BEGIN
    UPDATE salary_advances SET approval_stage = 'hr_review' WHERE id = NEW.salary_advance_id;

    SELECT format('%s %s', e.first_name, e.last_name) INTO emp_name
    FROM salary_advances sa JOIN employees e ON sa.employee_id = e.id WHERE sa.id = NEW.salary_advance_id;

    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    VALUES
      (NEW.company_id, 'cash_advance_forwards', NEW.id, 'cash_advance_forwarded', NEW.forwarded_to, 'direct_party',
       format('A cash advance request for %s has been forwarded to you for review.', emp_name), NOW());

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_process_forward
    AFTER INSERT ON cash_advance_forwards
    FOR EACH ROW EXECUTE FUNCTION fn_process_cash_advance_forward();

-- On meeting finalization: notify all attendees and mark completion time
CREATE OR REPLACE FUNCTION fn_finalize_meeting()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE attendee_id UUID;
BEGIN
    IF NEW.status = 'finalized' AND OLD.status = 'draft' THEN
        NEW.finalized_at := NOW();
        FOREACH attendee_id IN ARRAY NEW.attendee_employee_ids LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'meeting_minutes', NEW.id, 'meeting_minutes_shared', attendee_id, 'direct_party',
               format('Minutes shared: "%s"', NEW.title), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_finalize_meeting
    BEFORE UPDATE OF status ON meeting_minutes
    FOR EACH ROW EXECUTE FUNCTION fn_finalize_meeting();

-- Notify the assigned owner when a new action item is created
CREATE OR REPLACE FUNCTION fn_notify_action_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.assigned_to_employee_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'meeting_action_items', NEW.id, 'action_item_assigned', NEW.assigned_to_employee_id, 'direct_party',
           format('New action item from a meeting: "%s"', NEW.description), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_action_item
    AFTER INSERT ON meeting_action_items
    FOR EACH ROW EXECUTE FUNCTION fn_notify_action_item();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Team Dashboard KPI rollup, manager-scoped
CREATE OR REPLACE VIEW v_team_dashboard_kpis AS
SELECT e.manager_id,
    COUNT(DISTINCT e.id) AS headcount,
    (SELECT COUNT(*) FROM salary_advances sa WHERE sa.employee_id IN (SELECT id FROM employees WHERE manager_id = e.manager_id) AND sa.approval_stage = 'supervisor_review') AS pending_cash_advances,
    e.company_id
FROM employees e
WHERE e.manager_id IS NOT NULL
GROUP BY e.manager_id, e.company_id;

-- Page 2: Team Attendance, manager-scoped over the EXISTING daily_attendance_records
CREATE OR REPLACE VIEW v_team_attendance_today AS
SELECT dar.*, e.first_name, e.last_name, e.manager_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
WHERE dar.attendance_date = CURRENT_DATE;

-- Page 3: Approval Center, unified across leave/cash-advance/resignation
CREATE OR REPLACE VIEW v_approval_center AS
SELECT 'Leave Request' AS request_type, id, employee_id, company_id, status::TEXT AS stage, created_at AS submitted_at
FROM leave_applications WHERE status = 'pending_manager'
UNION ALL
SELECT 'Cash Advance', id, employee_id, company_id, approval_stage, created_at
FROM salary_advances WHERE approval_stage = 'supervisor_review'
UNION ALL
SELECT 'Resignation', id, employee_id, company_id, 'pending_acknowledgment', submitted_at
FROM resignation_requests WHERE NOT acknowledged;

-- Page 4: Performance Review (MSS) team queue
CREATE OR REPLACE VIEW v_team_performance_reviews AS
SELECT prs.*, pa.employee_id, e.first_name, e.last_name
FROM performance_review_stages prs
JOIN performance_appraisals pa ON prs.performance_appraisal_id = pa.id
JOIN employees e ON pa.employee_id = e.id;

-- Pages 5-9: Team Activity, manager-scoped wrappers over the EXISTING
-- employee_activity_log time-windowed views (ESS Batch 4 session) --
-- the SAME views, just joined through the manager relationship
CREATE OR REPLACE VIEW v_team_activity_today AS
SELECT eal.* FROM employee_activity_log eal
JOIN employees e ON eal.actor_employee_id = e.id
WHERE eal.occurred_at::DATE = CURRENT_DATE;

CREATE OR REPLACE VIEW v_team_activity_this_week AS
SELECT eal.*, e.manager_id FROM employee_activity_log eal
JOIN employees e ON eal.actor_employee_id = e.id
WHERE eal.occurred_at >= date_trunc('week', CURRENT_DATE);

CREATE OR REPLACE VIEW v_team_activity_this_month AS
SELECT eal.*, e.manager_id FROM employee_activity_log eal
JOIN employees e ON eal.actor_employee_id = e.id
WHERE eal.occurred_at >= date_trunc('month', CURRENT_DATE);

CREATE OR REPLACE VIEW v_team_activity_this_quarter AS
SELECT eal.*, e.manager_id FROM employee_activity_log eal
JOIN employees e ON eal.actor_employee_id = e.id
WHERE eal.occurred_at >= date_trunc('quarter', CURRENT_DATE);

CREATE OR REPLACE VIEW v_team_activity_this_year AS
SELECT eal.*, e.manager_id FROM employee_activity_log eal
JOIN employees e ON eal.actor_employee_id = e.id
WHERE eal.occurred_at >= date_trunc('year', CURRENT_DATE);

-- Page 10: cash advances pending the manager's approval, with cap context
CREATE OR REPLACE VIEW v_pending_cash_advances_for_manager AS
SELECT sa.*, e.first_name, e.last_name, e.manager_id,
    (sa.requested_npr > sa.max_allowed_npr) AS exceeds_manager_limit
FROM salary_advances sa
JOIN employees e ON sa.employee_id = e.id
WHERE sa.approval_stage = 'supervisor_review';

-- Page 11: meeting minutes dashboard with action-item rollup
CREATE OR REPLACE VIEW v_meeting_minutes_dashboard AS
SELECT mm.*,
    (SELECT COUNT(*) FROM meeting_action_items mai WHERE mai.meeting_minutes_id = mm.id AND mai.status = 'open') AS open_action_items
FROM meeting_minutes mm
ORDER BY mm.meeting_date DESC;
