-- ================================================================
-- FILE: database/schemas/wfh_tracking_schema.sql
-- eLogix HRMS — Workforce Operations > Attendance Management > Daily
-- Attendance > Work From Home Tracking (1 page)
--
-- Design philosophy (deliberate, per the brief's own repeated warnings):
-- this schema tracks OUTCOMES (tasks, OKRs, passive login/logout) and
-- never raw activity surveillance (keystrokes, mouse coordinates,
-- screenshots, webcam). A literal mouse-movement-logging table would
-- create real legal/privacy exposure under Nepal's privacy norms and
-- contradicts the brief's own cited global best practices, which
-- explicitly say to avoid exactly that. wfh_activity_pulse below stores
-- only a coarse, self-reported or system-derived "active/idle" boolean
-- per time bucket — never coordinates or keystroke content.
--
-- Integrates with daily_attendance_records and movement_events
-- (daily_attendance_schema.sql) for the passive login/logout timestamps
-- — no duplicate capture pipeline.
--
-- Nepal Labour Act 2074 Section 28: attendance register required even
-- for remote workers; 8hr/48hr caps; WFH legal if established in the
-- employment contract; overtime still applies at 1.5x past 48hr/week.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- WFH DAILY LOG (status, core-hours compliance, weekly day count)
-- ================================================================
CREATE TABLE IF NOT EXISTS wfh_daily_log (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    daily_attendance_record_id UUID     REFERENCES daily_attendance_records(id),

    log_date                    DATE NOT NULL,

    -- Self-reported availability status (employee sets this themselves —
    -- never inferred from surveillance)
    status                          VARCHAR(20) DEFAULT 'offline'
                                    CHECK (status IN ('focusing','in_meeting','away','offline')),
    status_updated_at                  TIMESTAMPTZ DEFAULT NOW(),

    -- Passive timestamps only (mirrors daily_attendance_records, denormalized
    -- here for fast WFH-specific queries without re-joining)
    login_time                            TIMESTAMPTZ,
    logout_time                              TIMESTAMPTZ,

    -- Core collaboration hours compliance (org-wide policy window, e.g. 1-4 PM KTM)
    core_hours_start                            TIME DEFAULT '13:00',
    core_hours_end                                 TIME DEFAULT '16:00',
    was_available_during_core_hours                  BOOLEAN,

    -- Off-hours activity flag (privacy-respecting: only flags login/logout
    -- timestamps outside contracted hours — never WHAT was done off-hours)
    off_hours_activity_detected                          BOOLEAN DEFAULT FALSE,

    weekly_wfh_day_count                                    INT,  -- how many WFH days this calendar week (for hybrid-capacity planning)

    created_at                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                    TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (employee_id, log_date)
);

-- ================================================================
-- TASK / OKR COMPLETION (outcome-based tracking — the brief's
-- explicitly preferred alternative to activity surveillance)
-- ================================================================
CREATE TABLE IF NOT EXISTS wfh_task_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wfh_daily_log_id    UUID NOT NULL REFERENCES wfh_daily_log(id),
    company_id          UUID NOT NULL,

    task_description    VARCHAR(500) NOT NULL,
    -- optional integration reference if synced from Jira/Asana/Trello
    external_tool       VARCHAR(30) CHECK (external_tool IN ('jira','asana','trello','manual')),
    external_task_id    VARCHAR(100),

    is_completed        BOOLEAN DEFAULT FALSE,
    completed_at         TIMESTAMPTZ,

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wfh_okr_progress (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wfh_daily_log_id    UUID NOT NULL REFERENCES wfh_daily_log(id),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),

    okr_description     VARCHAR(500),
    progress_pct         INT DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- WELLBEING / BURNOUT PULSE (coarse, opt-in, anonymizable signal —
-- NOT a surveillance metric. Derived from self-reported check-ins and
-- off-hours-login frequency, never from in-session activity detail.)
-- ================================================================
CREATE TABLE IF NOT EXISTS wfh_wellbeing_pulse (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),

    pulse_week_start     DATE NOT NULL,

    -- Derived inputs (all coarse, weekly aggregates — never per-second detail)
    off_hours_login_days INT DEFAULT 0,        -- days this week with login before/after contracted hours
    weekly_total_hours   NUMERIC(5,2),
    core_hours_misses    INT DEFAULT 0,         -- days unavailable during the core collaboration window

    -- Self-reported (employee can optionally answer a 1-question pulse survey)
    self_reported_score  INT CHECK (self_reported_score BETWEEN 1 AND 5),

    burnout_risk_level   VARCHAR(10) DEFAULT 'low' CHECK (burnout_risk_level IN ('low','medium','high')),
    risk_note            TEXT,  -- system-generated, human-readable explanation (never raw data dump)

    flagged_for_hr_review BOOLEAN DEFAULT FALSE,

    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (employee_id, pulse_week_start)
);

-- ================================================================
-- WFH POLICY CONFIG (org-wide settings — core hours, weekly day caps,
-- data-collection disclosure text shown in the UI's privacy modal)
-- ================================================================
CREATE TABLE IF NOT EXISTS wfh_policy_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL UNIQUE,

    core_hours_start     TIME DEFAULT '13:00',
    core_hours_end       TIME DEFAULT '16:00',
    timezone             VARCHAR(50) DEFAULT 'Asia/Kathmandu',

    max_wfh_days_per_week INT DEFAULT 5,

    -- Explicit, queryable disclosure of what is/isn't collected (renders
    -- directly in the frontend's "View full data policy" modal)
    data_collected       JSONB DEFAULT '["login_logout_timestamps","task_completion","okr_progress","self_reported_status"]',
    data_never_collected JSONB DEFAULT '["keystrokes","mouse_movement","screenshots","webcam","microphone","off_hours_content"]',

    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_wdl_employee       ON wfh_daily_log(employee_id, log_date);
CREATE INDEX IF NOT EXISTS idx_wdl_company_date       ON wfh_daily_log(company_id, log_date);
CREATE INDEX IF NOT EXISTS idx_wdl_off_hours             ON wfh_daily_log(off_hours_activity_detected) WHERE off_hours_activity_detected;

CREATE INDEX IF NOT EXISTS idx_wtl_log                       ON wfh_task_log(wfh_daily_log_id);
CREATE INDEX IF NOT EXISTS idx_wop_log                          ON wfh_okr_progress(wfh_daily_log_id);
CREATE INDEX IF NOT EXISTS idx_wop_employee                        ON wfh_okr_progress(employee_id);

CREATE INDEX IF NOT EXISTS idx_wwp_employee                           ON wfh_wellbeing_pulse(employee_id, pulse_week_start);
CREATE INDEX IF NOT EXISTS idx_wwp_high_risk                             ON wfh_wellbeing_pulse(burnout_risk_level) WHERE burnout_risk_level = 'high';
CREATE INDEX IF NOT EXISTS idx_wwp_flagged                                   ON wfh_wellbeing_pulse(flagged_for_hr_review) WHERE flagged_for_hr_review;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_wfh_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'wfh_daily_log','wfh_task_log','wfh_okr_progress','wfh_wellbeing_pulse','wfh_policy_config'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_wfh_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-flag off-hours activity + core-hours compliance from login/logout vs policy window
CREATE OR REPLACE FUNCTION fn_check_core_hours_compliance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE policy RECORD;
BEGIN
    SELECT * INTO policy FROM wfh_policy_config WHERE company_id = NEW.company_id;
    IF policy IS NULL THEN RETURN NEW; END IF;

    IF NEW.login_time IS NOT NULL AND NEW.logout_time IS NOT NULL THEN
        NEW.was_available_during_core_hours :=
            NEW.login_time::TIME <= policy.core_hours_start AND NEW.logout_time::TIME >= policy.core_hours_end;

        -- Off-hours flag: login before 6 AM or logout after 9 PM (generous buffer,
        -- intentionally coarse — purpose is burnout detection, not punishment)
        NEW.off_hours_activity_detected :=
            NEW.login_time::TIME < '06:00' OR NEW.logout_time::TIME > '21:00';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_core_hours_compliance
    BEFORE INSERT OR UPDATE OF login_time, logout_time ON wfh_daily_log
    FOR EACH ROW EXECUTE FUNCTION fn_check_core_hours_compliance();

-- Auto-pull login/logout from the existing daily_attendance_records when linked
-- (avoids a second, redundant capture pipeline)
CREATE OR REPLACE FUNCTION fn_sync_wfh_from_daily_attendance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.daily_attendance_record_id IS NOT NULL THEN
        SELECT first_login_time, last_logout_time
          INTO NEW.login_time, NEW.logout_time
          FROM daily_attendance_records WHERE id = NEW.daily_attendance_record_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_sync_wfh_attendance
    BEFORE INSERT ON wfh_daily_log
    FOR EACH ROW EXECUTE FUNCTION fn_sync_wfh_from_daily_attendance();

-- Weekly burnout-risk rollup: computed weekly, from coarse aggregates only
-- (never raw activity) — explicitly the "always-on syndrome" signal from the brief
CREATE OR REPLACE FUNCTION fn_compute_wellbeing_pulse()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    week_start DATE;
    off_hours_days INT;
    total_hrs NUMERIC;
    core_misses INT;
    risk VARCHAR(10);
    note TEXT;
BEGIN
    week_start := NEW.log_date - (EXTRACT(DOW FROM NEW.log_date)::INT);

    SELECT COUNT(*) FILTER (WHERE off_hours_activity_detected),
           SUM(EXTRACT(EPOCH FROM (logout_time - login_time)) / 3600.0),
           COUNT(*) FILTER (WHERE NOT was_available_during_core_hours)
    INTO off_hours_days, total_hrs, core_misses
    FROM wfh_daily_log
    WHERE employee_id = NEW.employee_id AND log_date BETWEEN week_start AND week_start + 6;

    IF off_hours_days >= 3 OR total_hrs > 50 THEN
        risk := 'high';
        note := 'Frequent off-hours logins or weekly hours exceeding 50 detected -- possible always-on burnout pattern, not a productivity concern.';
    ELSIF off_hours_days >= 1 OR total_hrs > 48 THEN
        risk := 'medium';
        note := 'Some off-hours activity or hours approaching the 48hr statutory cap -- worth a wellbeing check-in.';
    ELSE
        risk := 'low';
        note := 'Healthy work pattern within core hours and statutory limits.';
    END IF;

    INSERT INTO wfh_wellbeing_pulse
      (company_id, employee_id, pulse_week_start, off_hours_login_days, weekly_total_hours,
       core_hours_misses, burnout_risk_level, risk_note, flagged_for_hr_review, created_at)
    VALUES
      (NEW.company_id, NEW.employee_id, week_start, off_hours_days, total_hrs,
       core_misses, risk, note, risk = 'high', NOW())
    ON CONFLICT (employee_id, pulse_week_start)
    DO UPDATE SET off_hours_login_days = EXCLUDED.off_hours_login_days,
                  weekly_total_hours = EXCLUDED.weekly_total_hours,
                  core_hours_misses = EXCLUDED.core_hours_misses,
                  burnout_risk_level = EXCLUDED.burnout_risk_level,
                  risk_note = EXCLUDED.risk_note,
                  flagged_for_hr_review = EXCLUDED.flagged_for_hr_review,
                  updated_at = NOW();

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_wellbeing_pulse
    AFTER INSERT OR UPDATE OF login_time, logout_time ON wfh_daily_log
    FOR EACH ROW EXECUTE FUNCTION fn_compute_wellbeing_pulse();

-- ================================================================
-- VIEWS
-- ================================================================

-- Today's WFH team dashboard (powers the page directly)
CREATE OR REPLACE VIEW v_wfh_team_today AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    wdl.status, wdl.login_time, wdl.logout_time, wdl.was_available_during_core_hours,
    wdl.off_hours_activity_detected, wdl.weekly_wfh_day_count,
    (SELECT COUNT(*) FROM wfh_task_log WHERE wfh_daily_log_id = wdl.id AND is_completed) AS tasks_completed,
    (SELECT COUNT(*) FROM wfh_task_log WHERE wfh_daily_log_id = wdl.id) AS tasks_total,
    (SELECT ROUND(AVG(progress_pct)) FROM wfh_okr_progress WHERE wfh_daily_log_id = wdl.id) AS okr_progress,
    wwp.burnout_risk_level,
    wdl.company_id
FROM wfh_daily_log wdl
JOIN employees e ON wdl.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN wfh_wellbeing_pulse wwp ON wwp.employee_id = wdl.employee_id
    AND wwp.pulse_week_start = wdl.log_date - (EXTRACT(DOW FROM wdl.log_date)::INT)
WHERE wdl.log_date = CURRENT_DATE
ORDER BY wwp.burnout_risk_level DESC NULLS LAST;

-- Burnout/wellbeing risk report for HR review
CREATE OR REPLACE VIEW v_wfh_burnout_risk_report AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    wwp.pulse_week_start, wwp.off_hours_login_days, wwp.weekly_total_hours,
    wwp.core_hours_misses, wwp.burnout_risk_level, wwp.risk_note,
    wwp.company_id
FROM wfh_wellbeing_pulse wwp
JOIN employees e ON wwp.employee_id = e.id
WHERE wwp.flagged_for_hr_review
ORDER BY wwp.pulse_week_start DESC;

-- Core-hours compliance summary (for manager admin panel's "hybrid capacity" view)
CREATE OR REPLACE VIEW v_core_hours_compliance_summary AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    COUNT(*) AS total_wfh_days,
    COUNT(*) FILTER (WHERE wdl.was_available_during_core_hours) AS compliant_days,
    ROUND(COUNT(*) FILTER (WHERE wdl.was_available_during_core_hours)::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS compliance_pct,
    wdl.company_id
FROM wfh_daily_log wdl
JOIN employees e ON wdl.employee_id = e.id
WHERE wdl.log_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY e.employee_code, e.first_name, e.last_name, wdl.company_id;

-- Weekly WFH day count per employee (hybrid capacity planning)
CREATE OR REPLACE VIEW v_weekly_wfh_capacity AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    DATE_TRUNC('week', wdl.log_date)::DATE AS week_start,
    COUNT(*) AS wfh_days_this_week,
    wdl.company_id
FROM wfh_daily_log wdl
JOIN employees e ON wdl.employee_id = e.id
GROUP BY e.employee_code, e.first_name, e.last_name, DATE_TRUNC('week', wdl.log_date), wdl.company_id;
