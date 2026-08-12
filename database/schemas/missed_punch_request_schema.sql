-- ================================================================
-- FILE: database/schemas/missed_punch_request_schema.sql
-- eLogix HRMS — Workforce Operations > Attendance Management > Daily
-- Attendance > Missed Log In/Out Request (1 page)
--
-- Design note: integrates directly with daily_attendance_records and
-- movement_events (daily_attendance_schema.sql). On approval, this
-- module INSERTS the missing movement_event, which (via existing
-- triggers) updates the daily_attendance_records row and recomputes
-- total hours/overtime — closing the loop with zero duplicated logic.
--
-- Nepal Labour Act 2074: 8hr/48hr caps, Section 131 — unapproved
-- absence/missing logs treated as misconduct (warning to deduction),
-- Section 20 — attendance register accuracy required for inspection.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- MISSED PUNCH REQUESTS
-- ================================================================
CREATE TABLE IF NOT EXISTS missed_punch_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    daily_attendance_record_id UUID     REFERENCES daily_attendance_records(id),

    request_date                DATE NOT NULL,  -- the day the punch was missed
    punch_type                     VARCHAR(15) NOT NULL CHECK (punch_type IN ('clock_in','clock_out')),

    scheduled_time                    TIME,  -- expected time per shift/roster, for comparison
    requested_time                       TIME NOT NULL,

    reason_category                          VARCHAR(50) NOT NULL
                                             CHECK (reason_category IN ('forgot_clock_out','forgot_clock_in',
                                               'system_device_error','client_visit_no_access',
                                               'network_connectivity_failure','other')),
    comment                                     TEXT NOT NULL,
    evidence_document_url                          VARCHAR(500),

    -- Computed impact preview (shown to manager before approval, per brief's wireframe)
    weekly_hours_before                               NUMERIC(5,2),
    weekly_hours_after                                   NUMERIC(5,2),
    overtime_triggered                                      BOOLEAN GENERATED ALWAYS AS (
                                                              weekly_hours_after IS NOT NULL AND weekly_hours_after > 48
                                                            ) STORED,
    exceeds_statutory_cap                                      BOOLEAN GENERATED ALWAYS AS (
                                                                weekly_hours_after IS NOT NULL AND weekly_hours_after > 48
                                                              ) STORED,

    -- Submission deadline enforcement (best practice: 24-48hr window)
    submission_deadline_hours                                     INT DEFAULT 48,
    submitted_at                                                      TIMESTAMPTZ DEFAULT NOW(),
    is_late_submission                                                   BOOLEAN GENERATED ALWAYS AS (
                                                                          EXTRACT(EPOCH FROM (submitted_at - (request_date + requested_time)::TIMESTAMPTZ)) / 3600
                                                                          > submission_deadline_hours
                                                                        ) STORED,

    manager_employee_id                                                       UUID,
    status                                                                       VARCHAR(20) DEFAULT 'pending'
                                                                                 CHECK (status IN ('pending','approved','rejected')),

    decided_by                                                                      UUID,
    decided_at                                                                         TIMESTAMPTZ,
    rejection_reason                                                                      TEXT,

    -- Links the resulting movement_event once approved (closes the loop)
    resulting_movement_event_id                                                              UUID,

    created_at                                                                                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                     TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                                       BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- REGULARIZATION CAP TRACKING (per-pay-period limit, brief requirement)
-- ================================================================
CREATE TABLE IF NOT EXISTS regularization_cap_tracking (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),
    pay_period_start    DATE NOT NULL,
    pay_period_end      DATE NOT NULL,

    request_count       INT DEFAULT 0,
    max_allowed         INT DEFAULT 3,  -- progressive policy threshold
    cap_exceeded         BOOLEAN GENERATED ALWAYS AS (request_count > max_allowed) STORED,

    flagged_for_progressive_discipline BOOLEAN DEFAULT FALSE,

    UNIQUE (employee_id, pay_period_start, pay_period_end)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_mpr_employee       ON missed_punch_requests(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_mpr_status            ON missed_punch_requests(status);
CREATE INDEX IF NOT EXISTS idx_mpr_manager              ON missed_punch_requests(manager_employee_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_mpr_date                    ON missed_punch_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_mpr_late                       ON missed_punch_requests(is_late_submission) WHERE is_late_submission;

CREATE INDEX IF NOT EXISTS idx_rct_employee                       ON regularization_cap_tracking(employee_id);
CREATE INDEX IF NOT EXISTS idx_rct_exceeded                          ON regularization_cap_tracking(cap_exceeded) WHERE cap_exceeded;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_missed_punch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_mpr_upd
    BEFORE UPDATE ON missed_punch_requests
    FOR EACH ROW EXECUTE FUNCTION fn_missed_punch_updated_at();

-- Auto-compute weekly_hours_before/after preview at submission time
-- (uses existing daily_attendance_records for the employee's current week)
CREATE OR REPLACE FUNCTION fn_compute_weekly_hours_preview()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    week_start DATE;
    week_end DATE;
    existing_hours NUMERIC;
    added_hours NUMERIC := 0;
BEGIN
    week_start := NEW.request_date - (EXTRACT(DOW FROM NEW.request_date)::INT);
    week_end := week_start + 6;

    SELECT COALESCE(SUM(total_hours_worked), 0) INTO existing_hours
    FROM daily_attendance_records
    WHERE employee_id = NEW.employee_id AND attendance_date BETWEEN week_start AND week_end;

    NEW.weekly_hours_before := existing_hours;

    -- Estimate added hours: if filling a missing clock_out, assume up to 8hrs added;
    -- if clock_in, similar estimate based on scheduled-to-requested gap
    IF NEW.scheduled_time IS NOT NULL THEN
        added_hours := ABS(EXTRACT(EPOCH FROM (NEW.requested_time - NEW.scheduled_time)) / 3600.0);
    ELSE
        added_hours := 8;  -- conservative full-day estimate when no scheduled reference
    END IF;

    NEW.weekly_hours_after := existing_hours + added_hours;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_weekly_hours_preview
    BEFORE INSERT ON missed_punch_requests
    FOR EACH ROW EXECUTE FUNCTION fn_compute_weekly_hours_preview();

-- On approval: insert the resulting movement_event (closes the loop with
-- existing daily_attendance_schema triggers which recompute totals/OT)
CREATE OR REPLACE FUNCTION fn_apply_approved_punch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE new_event_id UUID; event_timestamp TIMESTAMPTZ;
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        event_timestamp := (NEW.request_date + NEW.requested_time)::TIMESTAMPTZ;

        INSERT INTO movement_events
          (company_id, employee_id, event_type, event_time, source_method, created_at)
        VALUES
          (NEW.company_id, NEW.employee_id,
           CASE WHEN NEW.punch_type = 'clock_in' THEN 'login' ELSE 'logout' END,
           event_timestamp, 'manual', NOW())
        RETURNING id INTO new_event_id;

        NEW.resulting_movement_event_id := new_event_id;
        NEW.decided_at := NOW();

        -- Increment the pay-period regularization counter
        INSERT INTO regularization_cap_tracking (company_id, employee_id, pay_period_start, pay_period_end, request_count)
        VALUES (NEW.company_id, NEW.employee_id,
                DATE_TRUNC('month', NEW.request_date)::DATE,
                (DATE_TRUNC('month', NEW.request_date) + INTERVAL '1 month - 1 day')::DATE, 1)
        ON CONFLICT (employee_id, pay_period_start, pay_period_end)
        DO UPDATE SET request_count = regularization_cap_tracking.request_count + 1;
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        NEW.decided_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_approved_punch
    BEFORE UPDATE OF status ON missed_punch_requests
    FOR EACH ROW EXECUTE FUNCTION fn_apply_approved_punch();

-- Flag for progressive discipline once cap is exceeded
CREATE OR REPLACE FUNCTION fn_flag_progressive_discipline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.cap_exceeded AND NOT OLD.flagged_for_progressive_discipline THEN
        NEW.flagged_for_progressive_discipline := TRUE;
        RAISE NOTICE 'Employee % has exceeded the regularization cap for this pay period — review for progressive discipline.', NEW.employee_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_progressive_discipline
    BEFORE UPDATE OF request_count ON regularization_cap_tracking
    FOR EACH ROW EXECUTE FUNCTION fn_flag_progressive_discipline();

-- ================================================================
-- VIEWS
-- ================================================================

-- Manager's pending approval queue
CREATE OR REPLACE VIEW v_missed_punch_approval_queue AS
SELECT
    mpr.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM missed_punch_requests mpr
JOIN employees e ON mpr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE mpr.status = 'pending' AND NOT mpr.is_deleted
ORDER BY mpr.exceeds_statutory_cap DESC, mpr.submitted_at ASC;

-- Employee "Action Items" banner data (homepage widget per brief)
CREATE OR REPLACE VIEW v_employee_pending_missed_punches AS
SELECT employee_id, COUNT(*) AS pending_count, company_id
FROM missed_punch_requests
WHERE status = 'pending' AND NOT is_deleted
GROUP BY employee_id, company_id;

-- Habitual offenders (repeated requests) — feeds progressive discipline
CREATE OR REPLACE VIEW v_habitual_missed_punch_offenders AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    rct.pay_period_start, rct.pay_period_end, rct.request_count, rct.max_allowed,
    rct.company_id
FROM regularization_cap_tracking rct
JOIN employees e ON rct.employee_id = e.id
WHERE rct.cap_exceeded
ORDER BY rct.request_count DESC;

-- Late-submitted requests (outside the 48hr window) — compliance audit
CREATE OR REPLACE VIEW v_late_missed_punch_submissions AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    mpr.request_date, mpr.submitted_at, mpr.submission_deadline_hours,
    mpr.company_id
FROM missed_punch_requests mpr
JOIN employees e ON mpr.employee_id = e.id
WHERE mpr.is_late_submission AND NOT mpr.is_deleted;
