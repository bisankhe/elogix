-- ================================================================
-- FILE: database/schemas/attendance_regularization_schema.sql
-- NepHR Pro — Workforce Operations > Attendance Management > Daily
-- Attendance > Attendance Regularization (1 page)
--
-- Design note: Missed Log In/Out Request (missed_punch_request_schema.sql)
-- covers ONE specific subtype — a single missing clock-in or clock-out
-- timestamp. Attendance Regularization is the broader umbrella: it covers
-- whole-day status corrections (Absent -> Present, Half-Day -> Full-Day,
-- LWP -> Sanctioned Leave, On-Duty/Field-Work justification, System
-- Downtime fallback). This module integrates with daily_attendance_records
-- (recomputes totals on approval) and can optionally reference an existing
-- missed_punch_requests row when the regularization originated from a
-- punch-level issue.
--
-- Nepal Labour Rules 2075 Section 37: no worker may remain absent without
-- sanctioned leave; emergency absences regularized retroactively via
-- employer sanction; >30 consecutive days unsanctioned absence = grounds
-- for removal from service. 8hr/48hr caps, OT at 1.5x apply throughout.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- ATTENDANCE REGULARIZATION REQUESTS
-- ================================================================
CREATE TABLE IF NOT EXISTS attendance_regularization_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    daily_attendance_record_id UUID     REFERENCES daily_attendance_records(id),
    related_missed_punch_request_id UUID REFERENCES missed_punch_requests(id),  -- optional, if originated from a punch issue

    regularization_date         DATE NOT NULL,

    regularization_type            VARCHAR(40) NOT NULL
                                    CHECK (regularization_type IN ('absent_to_present','half_day_to_full_day',
                                      'on_duty_field_work','system_downtime_fallback','lwp_to_sanctioned_leave')),

    original_status                   VARCHAR(30) NOT NULL,   -- e.g. 'Absent', 'Half-Day', 'LWP'
    requested_status                     VARCHAR(30) NOT NULL,  -- e.g. 'Present', 'Full-Day', 'Sanctioned Sick Leave'

    reason_category                          VARCHAR(40) NOT NULL
                                             CHECK (reason_category IN ('forgot_to_punch','field_work_client_visit',
                                               'system_malfunction','medical_emergency','approved_verbally_not_logged',
                                               'network_device_failure','other')),
    justification                               TEXT NOT NULL,
    evidence_document_url                          VARCHAR(500),

    -- AI cross-checks (brief: "matches with their calendar events to validate attendance")
    calendar_event_matched                            BOOLEAN DEFAULT FALSE,
    calendar_event_reference                             VARCHAR(300),
    ai_confidence_score                                     FLOAT,  -- 0-100, how confident AI is this is legitimate

    -- Computed impact preview (same pattern as missed_punch_requests)
    weekly_hours_before                                        NUMERIC(5,2),
    weekly_hours_after                                            NUMERIC(5,2),
    exceeds_statutory_cap                                            BOOLEAN GENERATED ALWAYS AS (
                                                                      weekly_hours_after IS NOT NULL AND weekly_hours_after > 48
                                                                    ) STORED,
    overlap_conflict                                                    BOOLEAN DEFAULT FALSE,  -- e.g. clashes with team roster

    -- Submission deadline (best practice: 48-72hr window, brief reinforces this)
    submission_deadline_hours                                              INT DEFAULT 72,
    submitted_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    is_late_submission                                                          BOOLEAN GENERATED ALWAYS AS (
                                                                                EXTRACT(EPOCH FROM (submitted_at - regularization_date::TIMESTAMPTZ)) / 3600
                                                                                > submission_deadline_hours
                                                                              ) STORED,

    manager_employee_id                                                           UUID,
    status                                                                           VARCHAR(20) DEFAULT 'pending'
                                                                                     CHECK (status IN ('pending','approved','rejected','sent_back')),

    decided_by                                                                          UUID,
    decided_at                                                                             TIMESTAMPTZ,
    rejection_reason                                                                          TEXT,
    sent_back_notes                                                                              TEXT,

    -- Links the resulting daily_attendance_records update once approved
    applied_to_record                                                                              BOOLEAN DEFAULT FALSE,

    created_at                                                                                        TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                           TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                                             BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- AI AUTO-REGULARIZATION SUGGESTIONS
-- Brief: "If an employee consistently leaves early on Wednesdays for an
-- ongoing medical reason, the system can auto-suggest or pre-approve."
-- ================================================================
CREATE TABLE IF NOT EXISTS regularization_ai_patterns (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),

    pattern_description  TEXT NOT NULL,  -- e.g. "Leaves early every Wednesday ~3pm"
    day_of_week          INT,  -- 0-6, if pattern is day-specific
    occurrence_count     INT DEFAULT 1,
    suggested_reason     VARCHAR(40),
    confidence_score     FLOAT DEFAULT 0,

    auto_approve_eligible BOOLEAN DEFAULT FALSE,
    -- flips TRUE once occurrence_count crosses a threshold with consistent reason

    last_seen_date       DATE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (employee_id, pattern_description)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_arr_employee       ON attendance_regularization_requests(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_arr_status            ON attendance_regularization_requests(status);
CREATE INDEX IF NOT EXISTS idx_arr_manager              ON attendance_regularization_requests(manager_employee_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_arr_date                    ON attendance_regularization_requests(regularization_date);
CREATE INDEX IF NOT EXISTS idx_arr_late                       ON attendance_regularization_requests(is_late_submission) WHERE is_late_submission;
CREATE INDEX IF NOT EXISTS idx_arr_type                          ON attendance_regularization_requests(regularization_type);

CREATE INDEX IF NOT EXISTS idx_rap_employee                          ON regularization_ai_patterns(employee_id);
CREATE INDEX IF NOT EXISTS idx_rap_auto_eligible                        ON regularization_ai_patterns(auto_approve_eligible) WHERE auto_approve_eligible;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_regularization_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['attendance_regularization_requests','regularization_ai_patterns'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_regularization_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-compute weekly_hours_before/after preview at submission (mirrors
-- the missed_punch_requests pattern for consistency)
CREATE OR REPLACE FUNCTION fn_compute_regularization_hours_preview()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    week_start DATE;
    week_end DATE;
    existing_hours NUMERIC;
    added_hours NUMERIC := 8;  -- default: a full day's worth of hours added
BEGIN
    week_start := NEW.regularization_date - (EXTRACT(DOW FROM NEW.regularization_date)::INT);
    week_end := week_start + 6;

    SELECT COALESCE(SUM(total_hours_worked), 0) INTO existing_hours
    FROM daily_attendance_records
    WHERE employee_id = NEW.employee_id AND attendance_date BETWEEN week_start AND week_end;

    NEW.weekly_hours_before := existing_hours;

    IF NEW.regularization_type = 'half_day_to_full_day' THEN
        added_hours := 4;  -- the missing half
    ELSIF NEW.regularization_type IN ('absent_to_present','on_duty_field_work','system_downtime_fallback') THEN
        added_hours := 8;
    ELSIF NEW.regularization_type = 'lwp_to_sanctioned_leave' THEN
        added_hours := 0;  -- leave doesn't add worked hours, just changes pay status
    END IF;

    NEW.weekly_hours_after := existing_hours + added_hours;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_regularization_hours_preview
    BEFORE INSERT ON attendance_regularization_requests
    FOR EACH ROW EXECUTE FUNCTION fn_compute_regularization_hours_preview();

-- On approval: update the daily_attendance_records row's status flags
-- (closes the loop, recomputes totals via existing daily_attendance triggers)
CREATE OR REPLACE FUNCTION fn_apply_approved_regularization()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        NEW.decided_at := NOW();

        IF NEW.daily_attendance_record_id IS NOT NULL THEN
            UPDATE daily_attendance_records
               SET is_extra_duty = CASE WHEN NEW.regularization_type = 'on_duty_field_work' THEN TRUE ELSE is_extra_duty END,
                   amendment_reason = NEW.justification,
                   last_amended_by = NEW.decided_by,
                   last_amended_at = NOW()
             WHERE id = NEW.daily_attendance_record_id;
        END IF;

        NEW.applied_to_record := TRUE;

        -- Feed the AI pattern tracker for future auto-suggestion
        INSERT INTO regularization_ai_patterns
          (company_id, employee_id, pattern_description, day_of_week, occurrence_count, suggested_reason, last_seen_date, created_at)
        VALUES
          (NEW.company_id, NEW.employee_id,
           NEW.regularization_type || ' - ' || NEW.reason_category,
           EXTRACT(DOW FROM NEW.regularization_date)::INT, 1, NEW.reason_category, NEW.regularization_date, NOW())
        ON CONFLICT (employee_id, pattern_description)
        DO UPDATE SET occurrence_count = regularization_ai_patterns.occurrence_count + 1,
                      last_seen_date = NEW.regularization_date,
                      auto_approve_eligible = (regularization_ai_patterns.occurrence_count + 1) >= 3;
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        NEW.decided_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_approved_regularization
    BEFORE UPDATE OF status ON attendance_regularization_requests
    FOR EACH ROW EXECUTE FUNCTION fn_apply_approved_regularization();

-- ================================================================
-- VIEWS
-- ================================================================

-- Manager's pending approval queue (mirrors missed_punch pattern, statutory-risk-first)
CREATE OR REPLACE VIEW v_regularization_approval_queue AS
SELECT
    arr.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM attendance_regularization_requests arr
JOIN employees e ON arr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE arr.status = 'pending' AND NOT arr.is_deleted
ORDER BY arr.exceeds_statutory_cap DESC, arr.submitted_at ASC;

-- Calendar-view data (color-coded monthly grid per brief's wireframe)
CREATE OR REPLACE VIEW v_attendance_calendar_status AS
SELECT
    dar.employee_id, dar.attendance_date,
    CASE
        WHEN arr.id IS NOT NULL AND arr.status = 'pending' THEN 'pending'
        WHEN dar.missed_checkout THEN 'missed'
        WHEN dar.current_status = 'absent' THEN 'absent'
        WHEN dar.total_hours_worked IS NOT NULL THEN 'present'
        ELSE 'unknown'
    END AS calendar_status,
    dar.company_id
FROM daily_attendance_records dar
LEFT JOIN attendance_regularization_requests arr
    ON arr.employee_id = dar.employee_id AND arr.regularization_date = dar.attendance_date AND arr.status = 'pending'
WHERE dar.attendance_date >= CURRENT_DATE - INTERVAL '60 days';

-- AI auto-approve-eligible patterns (recurring, consistent regularizations)
CREATE OR REPLACE VIEW v_regularization_ai_suggestions AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    rap.pattern_description, rap.occurrence_count, rap.suggested_reason,
    rap.auto_approve_eligible, rap.last_seen_date, rap.company_id
FROM regularization_ai_patterns rap
JOIN employees e ON rap.employee_id = e.id
WHERE rap.auto_approve_eligible
ORDER BY rap.occurrence_count DESC;

-- Late-submitted requests (outside the 72hr window) — compliance audit
CREATE OR REPLACE VIEW v_late_regularization_submissions AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    arr.regularization_date, arr.submitted_at, arr.submission_deadline_hours,
    arr.company_id
FROM attendance_regularization_requests arr
JOIN employees e ON arr.employee_id = e.id
WHERE arr.is_late_submission AND NOT arr.is_deleted;

-- Employees with severe unsanctioned absence risk (LA Rules 2075 - 30 consecutive days)
CREATE OR REPLACE VIEW v_severe_absence_risk AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    COUNT(*) AS consecutive_absent_days,
    MAX(dar.attendance_date) AS last_absence_date,
    dar.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
WHERE dar.current_status = 'absent' AND dar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY e.employee_code, e.first_name, e.last_name, dar.company_id
HAVING COUNT(*) >= 20;  -- approaching the 30-day legal threshold
