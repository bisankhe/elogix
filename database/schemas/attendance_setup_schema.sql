-- ================================================================
-- FILE: database/schemas/attendance_setup_schema.sql
-- eLogix HRMS — Workforce Operations > Attendance Management > Attendance Setup (8 pages)
--
-- Design note: shift_types, holiday_calendar, weekend_policies already
-- exist (workforce_config_schema.sql). This file ADDS: attendance policy
-- engine, break policies, weekly rosters (with the exact 2-day-advance
-- submission rule from the brief), biometric devices, GPS punches,
-- geo-fences, and task/location assignments — all linked back to shifts.
--
--   1. attendance_policies      (Attendance Policy)
--   2. (Shift Management -> reuses existing shift_types table)
--   3. break_policies + break_logs (Break Management)
--   4. weekly_rosters + roster_entries + shift_exchange_requests (Roster Management)
--   5. biometric_devices + biometric_punch_log (Biometric Integration)
--   6. gps_punches               (GPS Attendance)
--   7. geo_fences + geo_fence_assignments (Geo-Fencing)
--   8. task_location_assignments (Task & Location Assignment)
--
-- Nepal Labour Act 2074: 8hr/day, 48hr/week cap; OT max 4hr/day, 24hr/week
-- at 150% pay; mandatory 30-min break after 5hrs (counted as working);
-- extra 30-min break for pregnant/nursing mothers; 1 weekly rest day;
-- compensatory leave within 21 days for holiday/restday work; Section 20
-- attendance register + 5-year retention.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. ATTENDANCE POLICIES
-- ================================================================
CREATE TABLE IF NOT EXISTS attendance_policies (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    name                    VARCHAR(200) NOT NULL,
    applicable_to                 VARCHAR(50) DEFAULT 'all'
                                  CHECK (applicable_to IN ('all','department','branch','employment_type')),
    applicable_entity_id              UUID,

    -- Nepal LA2074 statutory caps (hard limits — see CHECK constraints)
    standard_hours_per_day               NUMERIC(4,2) DEFAULT 8 CHECK (standard_hours_per_day <= 8),
    standard_hours_per_week                 NUMERIC(5,2) DEFAULT 48 CHECK (standard_hours_per_week <= 48),
    max_overtime_hours_per_day                 NUMERIC(4,2) DEFAULT 4 CHECK (max_overtime_hours_per_day <= 4),
    max_overtime_hours_per_week                   NUMERIC(5,2) DEFAULT 24 CHECK (max_overtime_hours_per_week <= 24),
    overtime_rate_multiplier                         NUMERIC(3,2) DEFAULT 1.5 CHECK (overtime_rate_multiplier >= 1.5),

    -- Grace period / tolerance
    late_grace_period_minutes                           INT DEFAULT 10,
    early_leave_grace_period_minutes                       INT DEFAULT 10,

    -- Penalty deductions
    late_penalty_type                                         VARCHAR(20) DEFAULT 'none'
                                                              CHECK (late_penalty_type IN ('none','half_day','full_day','proportional')),
    consecutive_late_threshold_for_action                        INT DEFAULT 3,

    -- Weekly rest day (mandatory per LA2074)
    weekly_rest_day                                                 VARCHAR(10) DEFAULT 'Saturday',
    compensatory_leave_window_days                                     INT DEFAULT 21,

    is_active                                                          BOOLEAN DEFAULT TRUE,
    created_at                                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 3. BREAK MANAGEMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS break_policies (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    name                    VARCHAR(200) NOT NULL,
    duration_minutes           INT NOT NULL,
    trigger_after_hours            NUMERIC(4,2) DEFAULT 0,  -- 0 = available anytime
    is_mandatory                       BOOLEAN DEFAULT TRUE,
    counted_as_working_hours              BOOLEAN DEFAULT TRUE,
    -- LA2074: 30-min break after 5hrs is mandatory AND counted as working hours

    auto_lockout_enabled                     BOOLEAN DEFAULT FALSE,
    -- system prevents clock-in before break duration elapses

    applicable_to                               VARCHAR(100) DEFAULT 'All Employees',
    shift_type_ids                                 UUID[],  -- which shift_types this applies to

    -- Special statutory break (pregnant/nursing mothers - extra 30 min)
    is_statutory_maternity_break                       BOOLEAN DEFAULT FALSE,

    is_active                                             BOOLEAN DEFAULT TRUE,
    created_at                                               TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                  BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS break_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),
    break_policy_id      UUID REFERENCES break_policies(id),
    attendance_date     DATE NOT NULL,

    break_start_time     TIMESTAMPTZ NOT NULL,
    break_end_time       TIMESTAMPTZ,
    actual_duration_minutes INT GENERATED ALWAYS AS (
                            CASE WHEN break_end_time IS NOT NULL
                              THEN EXTRACT(EPOCH FROM (break_end_time - break_start_time)) / 60
                              ELSE NULL END
                          ) STORED,

    is_compliant         BOOLEAN,  -- did they take the full mandated duration?
    early_return_blocked BOOLEAN DEFAULT FALSE,  -- auto-lockout triggered

    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. ROSTER MANAGEMENT
-- Exact rule from brief: roster for next week must be submitted 2 days
-- in advance (e.g. submit by Thursday for the following Mon-Sun week).
-- ================================================================
CREATE TABLE IF NOT EXISTS weekly_rosters (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    week_start_date             DATE NOT NULL,  -- Monday
    week_end_date                  DATE NOT NULL,  -- Sunday

    -- 2-day-advance submission deadline (e.g. Thursday before the Monday start)
    submission_deadline               DATE GENERATED ALWAYS AS (week_start_date - INTERVAL '4 days') STORED,
    submitted                            BOOLEAN DEFAULT FALSE,
    submitted_at                            TIMESTAMPTZ,
    submitted_late                            BOOLEAN GENERATED ALWAYS AS (
                                                submitted_at IS NOT NULL AND submitted_at::DATE > submission_deadline
                                              ) STORED,

    -- Manager/Supervisor can amend anytime, anywhere (no lock after publish)
    published                                    BOOLEAN DEFAULT FALSE,
    last_amended_by                                 UUID,
    last_amended_at                                    TIMESTAMPTZ,

    -- Auto-counted statutory metrics (computed from roster_entries + actual attendance)
    night_duties_count                                    INT DEFAULT 0,
    public_holidays_worked_count                             INT DEFAULT 0,
    weekly_rest_days_worked_count                               INT DEFAULT 0,
    overtime_hours_total                                           NUMERIC(6,2) DEFAULT 0,
    extra_duties_count                                                INT DEFAULT 0,

    created_at                                                           TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                            TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                              BOOLEAN DEFAULT FALSE,

    UNIQUE (employee_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS roster_entries (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    weekly_roster_id    UUID NOT NULL REFERENCES weekly_rosters(id),
    company_id          UUID NOT NULL,

    entry_date           DATE NOT NULL,
    shift_type_id        UUID REFERENCES shift_types(id),  -- existing table
    is_off_day           BOOLEAN DEFAULT FALSE,
    is_public_holiday    BOOLEAN DEFAULT FALSE,  -- cross-checked against holiday_calendar
    is_weekly_rest_day   BOOLEAN DEFAULT FALSE,

    -- 1-month auto-shift-selector pattern weight (0=morning-heavy, 100=night-heavy)
    auto_generated       BOOLEAN DEFAULT FALSE,
    pattern_weight       INT,

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (weekly_roster_id, entry_date)
);

-- Exchange leave: employee-requested shift swap, supervisor+HR approval,
-- reflects directly in the roster + attendance per the brief
CREATE TABLE IF NOT EXISTS shift_exchange_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    requesting_employee_id   UUID       NOT NULL REFERENCES employees(id),
    target_employee_id          UUID    NOT NULL REFERENCES employees(id),

    requesting_entry_id             UUID NOT NULL REFERENCES roster_entries(id),
    target_entry_id                    UUID NOT NULL REFERENCES roster_entries(id),

    reason                                 TEXT,
    supervisor_approval                       BOOLEAN DEFAULT FALSE,
    supervisor_approved_by                       UUID,
    supervisor_approved_at                          TIMESTAMPTZ,
    hr_approval                                        BOOLEAN DEFAULT FALSE,
    hr_approved_by                                        UUID,
    hr_approved_at                                           TIMESTAMPTZ,

    status                                                      VARCHAR(20) DEFAULT 'pending'
                                                                CHECK (status IN ('pending','approved','rejected')),

    created_at                                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. BIOMETRIC INTEGRATION
-- ================================================================
CREATE TABLE IF NOT EXISTS biometric_devices (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    branch_id                UUID,

    device_name                VARCHAR(200) NOT NULL,
    device_type                   VARCHAR(50) DEFAULT 'fingerprint'
                                  CHECK (device_type IN ('fingerprint','face_recognition','fingerprint_face','iris')),
    model                            VARCHAR(200),
    ip_address                          VARCHAR(50),

    status                                 VARCHAR(20) DEFAULT 'offline'
                                           CHECK (status IN ('online','offline','maintenance')),
    last_sync_at                              TIMESTAMPTZ,
    enrolled_user_count                          INT DEFAULT 0,

    created_at                                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                         TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                            BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS biometric_punch_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    device_id           UUID NOT NULL REFERENCES biometric_devices(id),
    employee_id         UUID REFERENCES employees(id),  -- NULL if no match (potential buddy-punch attempt)

    punch_method         VARCHAR(30) CHECK (punch_method IN ('fingerprint','face','iris')),
    punch_time            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    match_status           VARCHAR(20) DEFAULT 'matched'
                           CHECK (match_status IN ('matched','rejected_no_match','rejected_low_confidence')),
    match_confidence_pct    FLOAT,

    -- 5-year retention per LA2074 Section 20
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 6. GPS ATTENDANCE
-- ================================================================
CREATE TABLE IF NOT EXISTS gps_punches (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    punch_type                 VARCHAR(10) NOT NULL CHECK (punch_type IN ('in','out')),
    punch_time                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude                         NUMERIC(10,7) NOT NULL,
    longitude                          NUMERIC(10,7) NOT NULL,

    -- Geo-fence validation result
    geo_fence_id                          UUID,  -- which fence (if any) this matched
    distance_from_fence_center_m             NUMERIC(8,2),
    is_within_fence                             BOOLEAN DEFAULT FALSE,

    -- Strict rule from brief: no attendance from odd/unassigned location
    status                                          VARCHAR(20) DEFAULT 'rejected'
                                                    CHECK (status IN ('accepted','rejected')),
    rejection_reason                                   VARCHAR(100),

    -- Links to task assignment if this was a field-visit punch
    task_location_assignment_id                           UUID,

    device_info                                              VARCHAR(255),  -- mobile device fingerprint
    created_at                                                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 7. GEO-FENCING
-- ================================================================
CREATE TABLE IF NOT EXISTS geo_fences (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    name                    VARCHAR(200) NOT NULL,
    fence_type                 VARCHAR(30) DEFAULT 'fixed_location'
                               CHECK (fence_type IN ('fixed_location','temporary_task_site')),
    branch_id                     UUID,  -- if fixed_location tied to a branch

    latitude                        NUMERIC(10,7) NOT NULL,
    longitude                          NUMERIC(10,7) NOT NULL,
    radius_meters                        INT NOT NULL DEFAULT 100,

    -- Privacy-respecting tracking window
    tracking_window                        VARCHAR(30) DEFAULT 'office_hours_only'
                                           CHECK (tracking_window IN ('office_hours_only','task_duration_only','always')),

    -- Temporary fences auto-expire (linked to task_location_assignments)
    expires_at                                TIMESTAMPTZ,

    status                                       VARCHAR(20) DEFAULT 'active'
                                                 CHECK (status IN ('active','expired','inactive')),

    created_at                                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                         TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                            BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS geo_fence_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    geo_fence_id    UUID NOT NULL REFERENCES geo_fences(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    company_id      UUID NOT NULL,
    is_primary      BOOLEAN DEFAULT TRUE,  -- their regular duty location vs occasional access
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (geo_fence_id, employee_id)
);

ALTER TABLE gps_punches
    ADD CONSTRAINT fk_gps_geo_fence FOREIGN KEY (geo_fence_id) REFERENCES geo_fences(id);

-- ================================================================
-- 8. TASK & LOCATION ASSIGNMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS task_location_assignments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    assigned_by_employee_id    UUID     NOT NULL,  -- supervisor/manager

    task_description              TEXT NOT NULL,
    location_name                    VARCHAR(300) NOT NULL,
    location_address                    TEXT,
    latitude                              NUMERIC(10,7),
    longitude                                NUMERIC(10,7),

    assignment_date                             DATE NOT NULL,
    start_time                                     TIME,
    end_time                                          TIME,

    -- Auto-creates a temporary geo-fence for the task duration
    auto_created_geo_fence_id                            UUID REFERENCES geo_fences(id),

    status                                                  VARCHAR(20) DEFAULT 'scheduled'
                                                            CHECK (status IN ('scheduled','in_progress','completed','cancelled')),

    -- Resulting GPS clock-in validation
    clock_in_punch_id                                          UUID REFERENCES gps_punches(id),
    clock_in_validated                                            BOOLEAN,

    created_at                                                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                             BOOLEAN DEFAULT FALSE
);

ALTER TABLE gps_punches
    ADD CONSTRAINT fk_gps_task_assignment FOREIGN KEY (task_location_assignment_id) REFERENCES task_location_assignments(id);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ap_company         ON attendance_policies(company_id)  WHERE NOT is_deleted;

CREATE INDEX IF NOT EXISTS idx_bp_company           ON break_policies(company_id)       WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_bl_employee             ON break_logs(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_bl_active                 ON break_logs(break_end_time) WHERE break_end_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_wr_employee                 ON weekly_rosters(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_wr_unsubmitted                 ON weekly_rosters(submitted) WHERE NOT submitted;
CREATE INDEX IF NOT EXISTS idx_wr_week                           ON weekly_rosters(week_start_date);
CREATE INDEX IF NOT EXISTS idx_re_roster                            ON roster_entries(weekly_roster_id);
CREATE INDEX IF NOT EXISTS idx_re_date                                ON roster_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_ser_status                               ON shift_exchange_requests(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bd_company                                  ON biometric_devices(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_bd_status                                     ON biometric_devices(status);
CREATE INDEX IF NOT EXISTS idx_bpl_device                                      ON biometric_punch_log(device_id);
CREATE INDEX IF NOT EXISTS idx_bpl_employee                                      ON biometric_punch_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_bpl_rejected                                         ON biometric_punch_log(match_status) WHERE match_status != 'matched';

CREATE INDEX IF NOT EXISTS idx_gps_employee                                            ON gps_punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_gps_time                                                  ON gps_punches(punch_time);
CREATE INDEX IF NOT EXISTS idx_gps_rejected                                                ON gps_punches(status) WHERE status = 'rejected';

CREATE INDEX IF NOT EXISTS idx_gf_company                                                    ON geo_fences(company_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_gf_active                                                       ON geo_fences(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_gfa_fence                                                          ON geo_fence_assignments(geo_fence_id);
CREATE INDEX IF NOT EXISTS idx_gfa_employee                                                          ON geo_fence_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_tla_employee                                                            ON task_location_assignments(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_tla_status                                                                 ON task_location_assignments(status);
CREATE INDEX IF NOT EXISTS idx_tla_date                                                                      ON task_location_assignments(assignment_date);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_attendance_setup_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'attendance_policies','break_policies','weekly_rosters','roster_entries',
  'shift_exchange_requests','biometric_devices','geo_fences','task_location_assignments'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_attendance_setup_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- THE CORE RULE FROM THE BRIEF: GPS punch rejected if outside ALL assigned fences
CREATE OR REPLACE FUNCTION fn_gps_punch_geo_validation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    nearest_fence RECORD;
    fence_distance NUMERIC;
BEGIN
    -- Find nearest active fence this employee is assigned to (haversine approximation)
    SELECT gf.id, gf.radius_meters,
           (6371000 * acos(
             cos(radians(NEW.latitude)) * cos(radians(gf.latitude)) *
             cos(radians(gf.longitude) - radians(NEW.longitude)) +
             sin(radians(NEW.latitude)) * sin(radians(gf.latitude))
           )) AS distance_m
    INTO nearest_fence
    FROM geo_fences gf
    JOIN geo_fence_assignments gfa ON gfa.geo_fence_id = gf.id
    WHERE gfa.employee_id = NEW.employee_id AND gf.status = 'active' AND NOT gf.is_deleted
    ORDER BY distance_m ASC
    LIMIT 1;

    IF nearest_fence.id IS NOT NULL AND nearest_fence.distance_m <= nearest_fence.radius_meters THEN
        NEW.geo_fence_id := nearest_fence.id;
        NEW.distance_from_fence_center_m := nearest_fence.distance_m;
        NEW.is_within_fence := TRUE;
        NEW.status := 'accepted';
        NEW.rejection_reason := NULL;
    ELSE
        NEW.distance_from_fence_center_m := nearest_fence.distance_m;
        NEW.is_within_fence := FALSE;
        NEW.status := 'rejected';
        NEW.rejection_reason := 'Punch location outside all assigned geo-fences. No task/location assignment found for this position.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_gps_punch_validation
    BEFORE INSERT ON gps_punches
    FOR EACH ROW EXECUTE FUNCTION fn_gps_punch_geo_validation();

-- Auto-create temporary geo-fence when a task/location is assigned (brief requirement)
CREATE OR REPLACE FUNCTION fn_auto_create_task_geofence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE new_fence_id UUID;
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND NEW.auto_created_geo_fence_id IS NULL THEN
        INSERT INTO geo_fences
          (company_id, name, fence_type, latitude, longitude, radius_meters,
           tracking_window, expires_at, status, created_at)
        VALUES
          (NEW.company_id, NEW.location_name, 'temporary_task_site', NEW.latitude, NEW.longitude, 150,
           'task_duration_only', (NEW.assignment_date + INTERVAL '1 day'), 'active', NOW())
        RETURNING id INTO new_fence_id;

        NEW.auto_created_geo_fence_id := new_fence_id;

        INSERT INTO geo_fence_assignments (geo_fence_id, employee_id, company_id, is_primary)
        VALUES (new_fence_id, NEW.employee_id, NEW.company_id, FALSE);
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_auto_task_geofence
    BEFORE INSERT ON task_location_assignments
    FOR EACH ROW EXECUTE FUNCTION fn_auto_create_task_geofence();

-- Expire temporary geo-fence once task is marked complete (privacy preservation)
CREATE OR REPLACE FUNCTION fn_expire_task_geofence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.auto_created_geo_fence_id IS NOT NULL THEN
        UPDATE geo_fences SET status = 'expired' WHERE id = NEW.auto_created_geo_fence_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_expire_geofence
    BEFORE UPDATE OF status ON task_location_assignments
    FOR EACH ROW EXECUTE FUNCTION fn_expire_task_geofence();

-- Auto-flag late roster submission (2-day-advance rule from brief)
CREATE OR REPLACE FUNCTION fn_roster_submission_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.submitted AND NOT OLD.submitted THEN
        NEW.submitted_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_roster_submission
    BEFORE UPDATE OF submitted ON weekly_rosters
    FOR EACH ROW EXECUTE FUNCTION fn_roster_submission_check();

-- Exchange leave: once both supervisor AND HR approve, swap the shift_type_id
-- on both roster_entries (reflects directly in roster + attendance per brief)
CREATE OR REPLACE FUNCTION fn_apply_shift_exchange()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE req_shift UUID; tgt_shift UUID;
BEGIN
    IF NEW.supervisor_approval AND NEW.hr_approval AND NEW.status != 'approved' THEN
        SELECT shift_type_id INTO req_shift FROM roster_entries WHERE id = NEW.requesting_entry_id;
        SELECT shift_type_id INTO tgt_shift FROM roster_entries WHERE id = NEW.target_entry_id;

        UPDATE roster_entries SET shift_type_id = tgt_shift WHERE id = NEW.requesting_entry_id;
        UPDATE roster_entries SET shift_type_id = req_shift WHERE id = NEW.target_entry_id;

        NEW.status := 'approved';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_exchange
    BEFORE UPDATE OF supervisor_approval, hr_approval ON shift_exchange_requests
    FOR EACH ROW EXECUTE FUNCTION fn_apply_shift_exchange();

-- Auto-update weekly_rosters statutory counters from roster_entries
-- (night duties, public holiday work, rest-day work, extra duties)
CREATE OR REPLACE FUNCTION fn_update_roster_counters()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE night_shift_id UUID;
BEGIN
    SELECT id INTO night_shift_id FROM shift_types WHERE shift_category = 'night' LIMIT 1;

    UPDATE weekly_rosters SET
        night_duties_count = (SELECT COUNT(*) FROM roster_entries WHERE weekly_roster_id = NEW.weekly_roster_id AND shift_type_id = night_shift_id),
        public_holidays_worked_count = (SELECT COUNT(*) FROM roster_entries WHERE weekly_roster_id = NEW.weekly_roster_id AND is_public_holiday AND NOT is_off_day),
        weekly_rest_days_worked_count = (SELECT COUNT(*) FROM roster_entries WHERE weekly_roster_id = NEW.weekly_roster_id AND is_weekly_rest_day AND NOT is_off_day)
    WHERE id = NEW.weekly_roster_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_roster_counters
    AFTER INSERT OR UPDATE ON roster_entries
    FOR EACH ROW EXECUTE FUNCTION fn_update_roster_counters();

-- ================================================================
-- VIEWS
-- ================================================================

-- Dashboard widget: who hasn't submitted next week's roster (brief requirement)
CREATE OR REPLACE VIEW v_roster_submission_status AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    wr.week_start_date, wr.week_end_date, wr.submission_deadline,
    wr.submitted, wr.submitted_late,
    (wr.submission_deadline - CURRENT_DATE) AS days_to_deadline,
    wr.company_id
FROM weekly_rosters wr
JOIN employees e ON wr.employee_id = e.id
WHERE NOT wr.submitted AND NOT wr.is_deleted
ORDER BY wr.submission_deadline ASC;

-- Biometric anti-buddy-punching alert feed
CREATE OR REPLACE VIEW v_biometric_unmatched_punches AS
SELECT
    bd.device_name, bpl.punch_method, bpl.punch_time, bpl.match_confidence_pct,
    bd.company_id
FROM biometric_punch_log bpl
JOIN biometric_devices bd ON bpl.device_id = bd.id
WHERE bpl.match_status != 'matched'
ORDER BY bpl.punch_time DESC;

-- GPS rejected punches (odd-location attempts) — for manager review
CREATE OR REPLACE VIEW v_gps_rejected_punches AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    gp.punch_type, gp.punch_time, gp.latitude, gp.longitude,
    gp.distance_from_fence_center_m, gp.rejection_reason,
    gp.company_id
FROM gps_punches gp
JOIN employees e ON gp.employee_id = e.id
WHERE gp.status = 'rejected'
ORDER BY gp.punch_time DESC;

-- Active task/location assignments with geo-fence link
CREATE OR REPLACE VIEW v_active_task_assignments AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    tla.task_description, tla.location_name, tla.assignment_date,
    tla.status, tla.clock_in_validated, gf.radius_meters,
    tla.company_id
FROM task_location_assignments tla
JOIN employees e ON tla.employee_id = e.id
LEFT JOIN geo_fences gf ON tla.auto_created_geo_fence_id = gf.id
WHERE tla.status IN ('scheduled','in_progress') AND NOT tla.is_deleted;

-- Pending shift exchange requests (dual approval queue)
CREATE OR REPLACE VIEW v_pending_shift_exchanges AS
SELECT
    req.first_name || ' ' || req.last_name AS requesting_employee,
    tgt.first_name || ' ' || tgt.last_name AS target_employee,
    ser.reason, ser.supervisor_approval, ser.hr_approval, ser.created_at,
    ser.company_id
FROM shift_exchange_requests ser
JOIN employees req ON ser.requesting_employee_id = req.id
JOIN employees tgt ON ser.target_employee_id = tgt.id
WHERE ser.status = 'pending'
ORDER BY ser.created_at ASC;
