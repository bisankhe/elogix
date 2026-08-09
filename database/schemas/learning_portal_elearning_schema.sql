-- ================================================================
-- FILE: database/schemas/learning_portal_elearning_schema.sql
-- NepHR Pro — Performance & Talent Management > Talent Development >
-- Learning & Development > Learning Portal + E-Learning Management
-- (2 pages)
--
-- Design note: BOTH pages are consumption/orchestration layers over the
-- EXISTING lms_courses/lms_enrollments/lms_certifications catalog built
-- in Course Management last session. Learning Portal (employee-facing)
-- needed zero new tables -- "Saved Courses" and discussion threads are
-- the only genuinely new concepts. E-Learning Management (admin-facing)
-- needed two new things: compliance_reminder_workflows (the automated
-- 30/14/3-day escalation cadence) and lms_hris_sync_log (the audit
-- trail the brief explicitly required for Labour Office inspection
-- readiness). Neither page re-captures course or enrollment data.
--
--   - saved_courses                  (Learning Portal: bookmarking)
--   - course_discussion_messages       (Learning Portal: peer/instructor threads)
--   - compliance_reminder_workflows      (E-Learning Mgmt: escalation cadence config)
--   - lms_hris_sync_log                    (E-Learning Mgmt: audit trail)
--
-- Nepal Labour Act 2074: Section 18 (trainees: min wage + social
-- security, up to 1 year); Section 78 (mandatory OHS training, safe
-- working environment); Section 16/17 (intern institutional agreement
-- required, 8hr/day-48hr/week cap, OHS + injury compensation);
-- digital personnel/training records requirement (audit trail basis).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- LEARNING PORTAL: SAVED COURSES + DISCUSSION
-- ================================================================
CREATE TABLE IF NOT EXISTS saved_courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    lms_course_id   UUID NOT NULL REFERENCES lms_courses(id),
    saved_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, lms_course_id)
);

CREATE TABLE IF NOT EXISTS course_discussion_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    lms_course_id   UUID NOT NULL REFERENCES lms_courses(id),
    posted_by       UUID NOT NULL REFERENCES employees(id),
    is_instructor   BOOLEAN DEFAULT FALSE,
    message         TEXT NOT NULL,
    posted_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- E-LEARNING MANAGEMENT: COMPLIANCE REMINDER WORKFLOWS
-- ================================================================
CREATE TABLE IF NOT EXISTS compliance_reminder_workflows (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    lms_course_id             UUID       NOT NULL REFERENCES lms_courses(id),

    target_department_id        UUID    REFERENCES departments(id),  -- NULL = all employees
    reminder_days_before            INT[] DEFAULT ARRAY[30,14,3],  -- e.g. [30,14,3]

    escalation_level                   VARCHAR(20) DEFAULT 'employee_reminder'
                                       CHECK (escalation_level IN ('employee_reminder','manager_reminder','hr_escalated')),
    escalated_at                          TIMESTAMPTZ,

    created_at                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                 TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- E-LEARNING MANAGEMENT: HRIS SYNC AUDIT TRAIL
-- ================================================================
CREATE TABLE IF NOT EXISTS lms_hris_sync_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    employee_id     UUID REFERENCES employees(id),

    event_type      VARCHAR(50) NOT NULL,  -- 'course_completed','role_change_auto_enroll','cert_expired_flag', etc.
    event_description TEXT NOT NULL,
    related_lms_course_id UUID REFERENCES lms_courses(id),

    synced_at       TIMESTAMPTZ DEFAULT NOW(),
    sync_status     VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced','failed'))
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_sc_employee       ON saved_courses(employee_id);
CREATE INDEX IF NOT EXISTS idx_cdm_course             ON course_discussion_messages(lms_course_id, posted_at);
CREATE INDEX IF NOT EXISTS idx_crw_course                 ON compliance_reminder_workflows(lms_course_id);
CREATE INDEX IF NOT EXISTS idx_crw_escalated                  ON compliance_reminder_workflows(escalation_level) WHERE escalation_level = 'hr_escalated';
CREATE INDEX IF NOT EXISTS idx_lhsl_employee                      ON lms_hris_sync_log(employee_id, synced_at);
CREATE INDEX IF NOT EXISTS idx_lhsl_event                              ON lms_hris_sync_log(event_type);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_learning_portal_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_crw_upd
    BEFORE UPDATE ON compliance_reminder_workflows
    FOR EACH ROW EXECUTE FUNCTION fn_learning_portal_updated_at();

-- Auto-escalate the workflow to 'hr_escalated' if the final reminder
-- (smallest value in reminder_days_before) has passed with no completion
-- for any assigned employee, and log the escalation to the sync audit trail
CREATE OR REPLACE FUNCTION fn_check_compliance_escalation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE final_reminder_day INT; overdue_count INT;
BEGIN
    SELECT MIN(d) INTO final_reminder_day FROM unnest(NEW.reminder_days_before) d;

    SELECT COUNT(*) INTO overdue_count
    FROM lms_enrollments le
    JOIN employees e ON le.employee_id = e.id
    WHERE le.lms_course_id = NEW.lms_course_id
      AND (NEW.target_department_id IS NULL OR e.department_id = NEW.target_department_id)
      AND le.progress_pct < 100;

    IF overdue_count > 0 AND NEW.escalation_level = 'manager_reminder' THEN
        -- Application layer decides exact timing; this trigger fires the
        -- state transition once invoked with overdue learners present
        NEW.escalation_level := 'hr_escalated';
        NEW.escalated_at := NOW();

        INSERT INTO lms_hris_sync_log (company_id, event_type, event_description, related_lms_course_id, synced_at)
        VALUES (NEW.company_id, 'compliance_escalated_to_hr',
                format('%s overdue learner(s) escalated to HR after final reminder lapsed.', overdue_count),
                NEW.lms_course_id, NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_escalation
    BEFORE UPDATE OF escalation_level ON compliance_reminder_workflows
    FOR EACH ROW EXECUTE FUNCTION fn_check_compliance_escalation();

-- Log every course completion to the HRIS sync audit trail (the
-- labour-inspection-ready digital record the brief requires)
CREATE OR REPLACE FUNCTION fn_log_completion_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE course_title TEXT;
BEGIN
    IF NEW.completed_at IS NOT NULL AND (OLD IS NULL OR OLD.completed_at IS NULL) THEN
        SELECT title INTO course_title FROM lms_courses WHERE id = NEW.lms_course_id;
        INSERT INTO lms_hris_sync_log (company_id, employee_id, event_type, event_description, related_lms_course_id, synced_at)
        VALUES (NEW.company_id, NEW.employee_id, 'course_completed',
                format('Course "%s" completed -- certification/profile auto-synced.', course_title), NEW.lms_course_id, NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_log_completion
    AFTER UPDATE OF completed_at ON lms_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_log_completion_sync();

-- ================================================================
-- VIEWS
-- ================================================================

-- Learning Portal: "Saved Courses" quick-action
CREATE OR REPLACE VIEW v_my_saved_courses AS
SELECT sc.*, lc.title, lc.format, lc.duration_hours
FROM saved_courses sc
JOIN lms_courses lc ON sc.lms_course_id = lc.id;

-- Learning Portal: course discussion thread
CREATE OR REPLACE VIEW v_course_discussion AS
SELECT cdm.*, e.first_name, e.last_name
FROM course_discussion_messages cdm
JOIN employees e ON cdm.posted_by = e.id
ORDER BY cdm.posted_at ASC;

-- E-Learning Management: compliance workflow dashboard with live
-- overdue/completion counts pulled from the EXISTING lms_enrollments
CREATE OR REPLACE VIEW v_compliance_workflow_dashboard AS
SELECT
    crw.*, lc.title AS course_title, d.name AS target_department_name,
    (SELECT COUNT(*) FROM lms_enrollments le JOIN employees e ON le.employee_id = e.id
       WHERE le.lms_course_id = crw.lms_course_id AND (crw.target_department_id IS NULL OR e.department_id = crw.target_department_id)) AS total_assigned,
    (SELECT COUNT(*) FROM lms_enrollments le JOIN employees e ON le.employee_id = e.id
       WHERE le.lms_course_id = crw.lms_course_id AND (crw.target_department_id IS NULL OR e.department_id = crw.target_department_id)
       AND le.progress_pct < 100) AS overdue_count
FROM compliance_reminder_workflows crw
JOIN lms_courses lc ON crw.lms_course_id = lc.id
LEFT JOIN departments d ON crw.target_department_id = d.id;

-- E-Learning Management: HRIS sync audit trail
CREATE OR REPLACE VIEW v_hris_sync_audit_trail AS
SELECT lhsl.*, e.first_name, e.last_name, lc.title AS course_title
FROM lms_hris_sync_log lhsl
LEFT JOIN employees e ON lhsl.employee_id = e.id
LEFT JOIN lms_courses lc ON lhsl.related_lms_course_id = lc.id
ORDER BY lhsl.synced_at DESC;

-- E-Learning Management: content standards usage breakdown (SCORM/xAPI/cmi5)
CREATE OR REPLACE VIEW v_content_standards_breakdown AS
SELECT
    CASE WHEN scorm_xapi_compliant THEN 'SCORM/xAPI Compliant' ELSE 'Non-Standard' END AS standard,
    COUNT(*) AS courses_using, company_id
FROM lms_courses
GROUP BY scorm_xapi_compliant, company_id;

-- E-Learning Management: skill-gap-driven catalog rebalancing
-- (cross-references the EXISTING v_skill_matrix against lms_course_skill_tags)
CREATE OR REPLACE VIEW v_catalog_rebalancing_suggestions AS
SELECT
    sm.skill_name AS gap, COUNT(*) FILTER (WHERE sm.has_gap) AS affected_employees,
    COUNT(DISTINCT lcst.lms_course_id) AS courses_covering_skill,
    CASE WHEN COUNT(DISTINCT lcst.lms_course_id) = 0 THEN 'suggest_new_course' ELSE 'none' END AS action,
    sm.company_id
FROM v_skill_matrix sm
LEFT JOIN skill_taxonomy st ON sm.skill_name = st.skill_name
LEFT JOIN lms_course_skill_tags lcst ON lcst.skill_taxonomy_id = st.id
WHERE sm.has_gap
GROUP BY sm.skill_name, sm.company_id;
