-- ================================================================
-- FILE: database/schemas/training_participation_reports_schema.sql
-- NepHR Pro — Performance & Talent Management > Talent Development >
-- Learning & Development > Employee Training Participation List +
-- Training Reports (2 pages, capstone of the entire L&D arc)
--
-- Design note: Page 1 is a pure operational data-grid over the
-- EXISTING lms_enrollments (Course Management) -- no new enrollment
-- data captured, only bulk-action logging and dynamic tagging. Page 2
-- is the executive rollup, aggregating across nearly every table built
-- this entire L&D arc: lms_enrollments, annual_training_budgets
-- (Calendars), v_course_scorecard (Feedback), skill_taxonomy +
-- employee_skill_levels (Course Management). Two genuinely new things:
-- scheduled_report_subscriptions (the brief's "Schedule Monthly
-- Report" button) and participation_bulk_actions_log (audit trail for
-- Reassign/Remind bulk operations).
--
--   - training_tags                      (dynamic Compliance/Skill Dev/Leadership tagging)
--   - participation_bulk_actions_log        (audit trail for bulk Reassign/Remind)
--   - scheduled_report_subscriptions          (auto-email monthly/weekly reports)
--   - custom_report_definitions                  (the drag-and-drop report builder's saved configs)
--
-- Nepal Labour Act 2074: trainee/intern participation logs and
-- institution-employer agreements must be maintained for inspection;
-- OSH/fire-drill participation lists must be formally recorded;
-- Skills Transfer Progress Reports required for foreign-national work
-- permit renewal; all training records presentable to Labour
-- Inspectors/Department of Labor officials on request.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- DYNAMIC TRAINING TAGGING (Compliance / Skill Development / Leadership)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_tags (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    lms_course_id   UUID NOT NULL REFERENCES lms_courses(id),
    tag             VARCHAR(30) NOT NULL CHECK (tag IN ('compliance','skill_development','leadership')),
    UNIQUE (lms_course_id, tag)
);

-- ================================================================
-- BULK ACTIONS AUDIT LOG (Reassign Course / Send Reminder)
-- ================================================================
CREATE TABLE IF NOT EXISTS participation_bulk_actions_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,

    action_type     VARCHAR(30) NOT NULL CHECK (action_type IN ('reassign_course','send_reminder')),
    target_enrollment_ids UUID[] NOT NULL,
    performed_by    UUID NOT NULL,

    performed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- SCHEDULED REPORT SUBSCRIPTIONS (the "Schedule Monthly Report" button)
-- ================================================================
CREATE TABLE IF NOT EXISTS scheduled_report_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    report_type          VARCHAR(30) NOT NULL DEFAULT 'training_reports_ld',
    frequency                VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly')),
    recipient_employee_ids      UUID[] NOT NULL,

    is_active                       BOOLEAN DEFAULT TRUE,
    last_sent_at                        TIMESTAMPTZ,
    next_send_at                            TIMESTAMPTZ,

    created_by                                 UUID,
    created_at                                    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CUSTOM REPORT BUILDER (drag-and-drop field selection, saved configs)
-- ================================================================
CREATE TABLE IF NOT EXISTS custom_report_definitions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    report_name          VARCHAR(150) NOT NULL,
    selected_fields          TEXT[] NOT NULL,  -- e.g. ['Employee Name','Course Name','Hours Completed']
    filter_config                JSONB DEFAULT '{}',

    created_by                      UUID,
    created_at                         TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_tt_course       ON training_tags(lms_course_id);
CREATE INDEX IF NOT EXISTS idx_pbal_performer       ON participation_bulk_actions_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_srs_active                ON scheduled_report_subscriptions(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_srs_next_send                 ON scheduled_report_subscriptions(next_send_at) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_crd_creator                       ON custom_report_definitions(created_by);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-set next_send_at when a subscription is created or its frequency changes
CREATE OR REPLACE FUNCTION fn_compute_next_send()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.next_send_at := CASE WHEN NEW.frequency = 'weekly' THEN NOW() + INTERVAL '7 days' ELSE NOW() + INTERVAL '1 month' END;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_compute_next_send
    BEFORE INSERT OR UPDATE OF frequency ON scheduled_report_subscriptions
    FOR EACH ROW EXECUTE FUNCTION fn_compute_next_send();

-- Log every bulk action and notify each affected employee + their
-- manager, reusing the EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_bulk_action()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE enroll_id UUID; emp_id UUID; mgr_id UUID;
BEGIN
    FOREACH enroll_id IN ARRAY NEW.target_enrollment_ids LOOP
        SELECT employee_id INTO emp_id FROM lms_enrollments WHERE id = enroll_id;
        IF emp_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'lms_enrollments', enroll_id, NEW.action_type, emp_id, 'direct_party',
               CASE WHEN NEW.action_type = 'send_reminder' THEN 'Reminder: you have an in-progress or overdue training assignment.'
                    ELSE 'Your training course has been reassigned.' END, NOW());

            SELECT manager_id INTO mgr_id FROM employees WHERE id = emp_id;
            IF mgr_id IS NOT NULL THEN
                INSERT INTO transaction_notifications
                  (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
                VALUES
                  (NEW.company_id, 'lms_enrollments', enroll_id, NEW.action_type, mgr_id, 'reporting_manager',
                   'A bulk training action was performed for your direct report.', NOW());
            END IF;
        END IF;
    END LOOP;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_bulk
    AFTER INSERT ON participation_bulk_actions_log
    FOR EACH ROW EXECUTE FUNCTION fn_notify_bulk_action();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: the participation list grid, with dynamic tags and overdue
-- detection computed live from the EXISTING lms_enrollments + lms_certifications
CREATE OR REPLACE VIEW v_training_participation_list AS
SELECT
    le.id AS enrollment_id, e.employee_code, e.first_name, e.last_name, e.job_title, d.name AS department_name,
    lc.title AS course_title, tt.tag, le.enrolled_at AS start_date, le.progress_pct, le.completed_at,
    lcert.expires_date,
    CASE
        WHEN le.completed_at IS NOT NULL THEN 'completed'
        WHEN lc.is_mandatory_compliance AND le.enrolled_at < NOW() - INTERVAL '30 days' AND le.progress_pct < 100 THEN 'overdue'
        WHEN le.progress_pct > 0 THEN 'in_progress'
        ELSE 'not_started'
    END AS status,
    le.company_id
FROM lms_enrollments le
JOIN employees e ON le.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
JOIN lms_courses lc ON le.lms_course_id = lc.id
LEFT JOIN training_tags tt ON tt.lms_course_id = lc.id
LEFT JOIN lms_certifications lcert ON lcert.employee_id = le.employee_id AND lcert.lms_course_id = le.lms_course_id;

-- Page 2: top-line KPI cards
CREATE OR REPLACE VIEW v_training_reports_kpis AS
SELECT
    company_id,
    SUM(duration_hours) AS total_training_hours,
    ROUND(AVG(completion_rate_pct), 1) AS overall_completion_rate_pct,
    (SELECT ROUND(SUM(utilized_npr) / NULLIF(COUNT(DISTINCT employee_id),0), 0) FROM training_roi_snapshots, lms_enrollments WHERE TRUE) AS avg_cost_per_employee_npr
FROM lms_courses
GROUP BY company_id;

-- Page 2: completion rate by department (bar chart source)
CREATE OR REPLACE VIEW v_training_completion_by_dept AS
SELECT d.name AS department_name, ROUND(AVG(le.progress_pct), 1) AS completion_rate_pct, le.company_id
FROM lms_enrollments le
JOIN employees e ON le.employee_id = e.id
JOIN departments d ON e.department_id = d.id
GROUP BY d.name, le.company_id;

-- Page 2: training type breakdown (pie chart source)
CREATE OR REPLACE VIEW v_training_type_breakdown AS
SELECT
    tt.tag, COUNT(DISTINCT le.id) AS enrollment_count,
    ROUND(COUNT(DISTINCT le.id)::NUMERIC / SUM(COUNT(DISTINCT le.id)) OVER () * 100, 1) AS pct,
    le.company_id
FROM lms_enrollments le
JOIN training_tags tt ON tt.lms_course_id = le.lms_course_id
GROUP BY tt.tag, le.company_id;

-- Page 2: skill gap closure index (correlates Skill Gap Matrix before/after)
CREATE OR REPLACE VIEW v_skill_gap_closure_index AS
SELECT
    company_id,
    ROUND(COUNT(*) FILTER (WHERE current_level >= required_level_for_role)::NUMERIC
          / NULLIF(COUNT(*) FILTER (WHERE required_level_for_role IS NOT NULL),0) * 100, 1) AS closure_pct
FROM employee_skill_levels
GROUP BY company_id;
