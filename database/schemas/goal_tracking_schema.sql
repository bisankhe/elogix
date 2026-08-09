-- ================================================================
-- FILE: database/schemas/goal_tracking_schema.sql
-- NepHR Pro — Performance & Talent Management > Goal & Performance >
-- Goal Management > Goal Tracking (1 page)
--
-- Design note: this is the UNIFIED ROLLUP layer -- it does not capture
-- any new goal data. It UNION ALLs the four existing dashboards
-- (v_kra_jd_match_dashboard, v_kpi_dashboard, v_okr_tree_dashboard,
-- v_goal_assignment_dashboard) into one polymorphic feed so a manager
-- or HR admin never has to jump between four separate modules to see
-- if someone is on track. New tables are added only for what's
-- genuinely missing across all four: a shared audit-trail log (the
-- brief's "defensible at Labour Office audit" requirement, Section
-- 52(1)) and a generic reminder-schedule config (30/60/90-day nudges).
--
--   - goal_audit_trail        (polymorphic: works across KRA/KPI/OKR/Assignment)
--   - goal_reminder_config    (30/60/90-day automated nudge rules)
--   - goal_checkin_log        (polymorphic quick check-ins, distinct from
--                              okr_checkins which is OKR-specific)
--
-- Nepal Labour Act 2074 Section 52(1): employer may terminate for
-- unsatisfactory performance on 3+ occasions, but must conduct a formal
-- appraisal and allow 7 days for written explanation first -- audit
-- logs/appraisal reports serve as primary evidence in this process.
-- Electronic Transactions Act 2063: digital goal-tracking matrices and
-- audit trails carry the same legal weight as paper documents.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- POLYMORPHIC AUDIT TRAIL (works across all 4 goal types)
-- ================================================================
CREATE TABLE IF NOT EXISTS goal_audit_trail (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    goal_type                  VARCHAR(20) NOT NULL CHECK (goal_type IN ('kra','kpi','okr','assignment')),
    goal_record_id                 UUID NOT NULL,  -- points into kra_definitions / kpi_definitions / okr_objectives / department_annual_targets

    action_type                       VARCHAR(30) NOT NULL,  -- 'created','edited','approved','checked_in','status_changed'
    actor_employee_id                    UUID REFERENCES employees(id),
    field_changed                           VARCHAR(100),
    old_value                                  TEXT,
    new_value                                     TEXT,
    note                                              TEXT,

    occurred_at                                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- REMINDER CONFIG (30/60/90-day automated nudges per the brief)
-- ================================================================
CREATE TABLE IF NOT EXISTS goal_reminder_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,

    goal_type       VARCHAR(20) NOT NULL CHECK (goal_type IN ('kra','kpi','okr','assignment','all')),
    days_before_deadline  INT NOT NULL CHECK (days_before_deadline IN (30, 60, 90)),
    is_active       BOOLEAN DEFAULT TRUE,

    UNIQUE (company_id, goal_type, days_before_deadline)
);

INSERT INTO goal_reminder_config (company_id, goal_type, days_before_deadline)
SELECT id, 'all', d FROM companies CROSS JOIN (VALUES (30),(60),(90)) AS t(d)
ON CONFLICT DO NOTHING;

-- ================================================================
-- POLYMORPHIC CHECK-IN LOG (covers KRA/KPI/Assignment quick check-ins;
-- OKR retains its own richer okr_checkins table with confidence scores)
-- ================================================================
CREATE TABLE IF NOT EXISTS goal_checkin_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    goal_type              VARCHAR(20) NOT NULL CHECK (goal_type IN ('kra','kpi','assignment')),
    goal_record_id             UUID NOT NULL,

    checked_in_by              UUID NOT NULL REFERENCES employees(id),
    progress_note                 TEXT,

    checked_in_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_gat_goal       ON goal_audit_trail(goal_type, goal_record_id);
CREATE INDEX IF NOT EXISTS idx_gat_actor          ON goal_audit_trail(actor_employee_id);
CREATE INDEX IF NOT EXISTS idx_gat_occurred           ON goal_audit_trail(occurred_at);

CREATE INDEX IF NOT EXISTS idx_gcl_goal                  ON goal_checkin_log(goal_type, goal_record_id);
CREATE INDEX IF NOT EXISTS idx_gcl_checked_in_at             ON goal_checkin_log(checked_in_at);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-log to goal_audit_trail whenever a KRA's status changes (example
-- of the polymorphic pattern -- mirrored triggers would attach to
-- kpi_definitions and okr_objectives in the same way)
CREATE OR REPLACE FUNCTION fn_audit_kra_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO goal_audit_trail (company_id, goal_type, goal_record_id, action_type, field_changed, old_value, new_value, occurred_at)
        VALUES (NEW.company_id, 'kra', NEW.id, 'status_changed', 'status', OLD.status, NEW.status, NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_audit_kra_status
    AFTER UPDATE OF status ON kra_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_audit_kra_status_change();

CREATE OR REPLACE FUNCTION fn_audit_kpi_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO goal_audit_trail (company_id, goal_type, goal_record_id, action_type, field_changed, old_value, new_value, occurred_at)
        VALUES (NEW.company_id, 'kpi', NEW.id, 'status_changed', 'status', OLD.status, NEW.status, NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_audit_kpi_status
    AFTER UPDATE OF status ON kpi_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_audit_kpi_status_change();

CREATE OR REPLACE FUNCTION fn_audit_okr_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO goal_audit_trail (company_id, goal_type, goal_record_id, action_type, field_changed, old_value, new_value, occurred_at)
        VALUES (NEW.company_id, 'okr', NEW.id, 'status_changed', 'status', OLD.status, NEW.status, NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_audit_okr_status
    AFTER UPDATE OF status ON okr_objectives
    FOR EACH ROW EXECUTE FUNCTION fn_audit_okr_status_change();

-- Log every check-in to the audit trail too (defensibility: a check-in
-- IS an action worth recording for Section 52(1) evidence purposes)
CREATE OR REPLACE FUNCTION fn_audit_checkin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO goal_audit_trail (company_id, goal_type, goal_record_id, action_type, actor_employee_id, note, occurred_at)
    VALUES (NEW.company_id, NEW.goal_type, NEW.goal_record_id, 'checked_in', NEW.checked_in_by, NEW.progress_note, NOW());
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_audit_checkin
    AFTER INSERT ON goal_checkin_log
    FOR EACH ROW EXECUTE FUNCTION fn_audit_checkin();

-- ================================================================
-- VIEWS
-- ================================================================

-- THE UNIFIED ROLLUP: UNION ALL across all 4 existing goal-type
-- dashboards into one polymorphic feed -- this is the page's entire
-- data source
CREATE OR REPLACE VIEW v_unified_goal_tracking AS
SELECT
    id, 'KRA' AS goal_type, kra_title AS title,
    COALESCE(employee_id::TEXT, department_id::TEXT) AS owner_ref,
    jd_match_pct AS progress_pct,
    CASE WHEN jd_match_pct >= 90 THEN 'on_track' WHEN jd_match_pct >= 60 THEN 'at_risk' ELSE 'off_track' END AS status,
    company_id, updated_at AS last_activity_at
FROM v_kra_jd_match_dashboard

UNION ALL

SELECT
    id, 'KPI' AS goal_type, kpi_title AS title,
    employee_id::TEXT AS owner_ref,
    progress_pct, status, company_id, updated_at AS last_activity_at
FROM v_kpi_dashboard

UNION ALL

SELECT
    id, 'OKR' AS goal_type, objective_text AS title,
    COALESCE(employee_id::TEXT, department_id::TEXT) AS owner_ref,
    (overall_score * 100) AS progress_pct, status, company_id, updated_at AS last_activity_at
FROM v_okr_tree_dashboard

UNION ALL

SELECT
    id, 'Assignment' AS goal_type, annual_target_description AS title,
    department_id::TEXT AS owner_ref,
    CASE WHEN cascade_quarterly_done AND cascade_monthly_done AND cascade_weekly_done AND cascade_daily_done THEN 100
         WHEN cascade_quarterly_done THEN 50 ELSE 10 END AS progress_pct,
    'on_track' AS status,  -- assignment-level status derives from its linked KRA, surfaced via KRA row separately
    company_id, updated_at AS last_activity_at
FROM v_goal_assignment_dashboard;

-- Goals with no check-in/activity in 10+ days (the "overdue" flag feed)
CREATE OR REPLACE VIEW v_goal_tracking_overdue_checkins AS
SELECT * FROM v_unified_goal_tracking
WHERE last_activity_at < NOW() - INTERVAL '10 days' AND status != 'off_track';

-- At-risk/off-track goals needing manager attention, unified
CREATE OR REPLACE VIEW v_goal_tracking_health_alerts AS
SELECT * FROM v_unified_goal_tracking WHERE status IN ('at_risk','off_track') ORDER BY progress_pct ASC;

-- Full audit trail for a specific goal (the "View Full Audit Trail" context menu action)
CREATE OR REPLACE VIEW v_goal_audit_trail_detail AS
SELECT gat.*, e.first_name, e.last_name
FROM goal_audit_trail gat
LEFT JOIN employees e ON gat.actor_employee_id = e.id
ORDER BY gat.occurred_at DESC;
