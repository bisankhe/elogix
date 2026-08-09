-- ================================================================
-- FILE: database/schemas/overtime_monitoring_schema.sql
-- NepHR Pro — Workforce Operations > Attendance Management >
-- Overtime & Monitoring Module (5 pages)
--
-- Design note: daily_attendance_records already has overtime_hours,
-- late_arrival_minutes, early_departure_minutes (daily_attendance_schema.sql)
-- — no duplicate capture pipeline. This file adds the WORKFLOW layer:
-- pre-approval requests, weekly-cap tracking, chronic-pattern detection,
-- and mobile-device registry. Real-Time Monitoring is a live view, no
-- new table needed there.
--
--   1. Overtime & Monitoring  -> v_overtime_dept_summary (view, dashboard)
--   2. Overtime Management    -> overtime_requests (pre-approval workflow)
--   3. Late & Early Tracking  -> late_early_exceptions (grace-period engine)
--   4. Real-Time Monitoring   -> v_realtime_attendance_feed (view only)
--   5. Mobile Attendance      -> mobile_devices + offline_sync_queue
--
-- Nepal Labour Act 2074: OT capped 4hr/day, 24hr/week, paid at 150%;
-- employee consent required before OT assignment; minors (<18) barred
-- from OT; managerial OT may be substituted with contract benefits;
-- Section 20 attendance register requirement applies to all tracking methods.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 2. OVERTIME REQUESTS (pre-approval workflow)
-- ================================================================
CREATE TABLE IF NOT EXISTS overtime_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    daily_attendance_record_id UUID     REFERENCES daily_attendance_records(id),

    request_date                DATE NOT NULL,
    requested_hours                 NUMERIC(4,2) NOT NULL CHECK (requested_hours <= 4),
    -- LA2074: OT capped at 4hr/day

    reason                              TEXT NOT NULL,

    -- Employee consent (LA2074 mandatory requirement)
    employee_consent                       BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp                         TIMESTAMPTZ,

    -- Weekly cap impact preview (computed by trigger before manager sees it)
    weekly_hours_before                          NUMERIC(5,2),
    weekly_hours_after                              NUMERIC(5,2),
    weekly_cap_pct                                     NUMERIC(5,2) GENERATED ALWAYS AS (
                                                        CASE WHEN weekly_hours_after IS NOT NULL
                                                          THEN ROUND(weekly_hours_after / 48.0 * 100, 1)
                                                          ELSE NULL END
                                                      ) STORED,
    exceeds_weekly_cap                                    BOOLEAN GENERATED ALWAYS AS (
                                                            weekly_hours_after IS NOT NULL AND weekly_hours_after > 48
                                                          ) STORED,

    -- Pay calculation
    base_hourly_rate_npr                                     NUMERIC(10,2),
    ot_rate_multiplier                                           NUMERIC(3,2) DEFAULT 1.5 CHECK (ot_rate_multiplier >= 1.5),
    ot_amount_npr                                                   NUMERIC(10,2) GENERATED ALWAYS AS (
                                                                     ROUND(COALESCE(base_hourly_rate_npr,0) * ot_rate_multiplier * requested_hours, 2)
                                                                   ) STORED,

    -- Managerial substitution (LA2074: managers may get contract benefits instead of OT pay)
    is_managerial_substitution                                          BOOLEAN DEFAULT FALSE,
    substitution_benefit_note                                              TEXT,

    manager_employee_id                                                       UUID,
    status                                                                       VARCHAR(20) DEFAULT 'pending'
                                                                                 CHECK (status IN ('pending','approved','rejected')),
    decided_by                                                                     UUID,
    decided_at                                                                        TIMESTAMPTZ,
    rejection_reason                                                                     TEXT,

    synced_to_payroll                                                                       BOOLEAN DEFAULT FALSE,

    created_at                                                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                    TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                                      BOOLEAN DEFAULT FALSE,

    -- THE CORE LEGAL GUARD: no OT without consent
    CONSTRAINT ck_ot_requires_consent CHECK (status != 'approved' OR employee_consent = TRUE)
);

-- ================================================================
-- 3. LATE & EARLY EXCEPTIONS (grace-period-aware exception log)
-- ================================================================
CREATE TABLE IF NOT EXISTS late_early_exceptions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    daily_attendance_record_id UUID     REFERENCES daily_attendance_records(id),

    exception_date              DATE NOT NULL,
    exception_type                  VARCHAR(20) NOT NULL CHECK (exception_type IN ('late_arrival','early_departure')),

    scheduled_time                     TIME NOT NULL,
    actual_time                           TIME NOT NULL,
    deviation_minutes                        INT GENERATED ALWAYS AS (
                                              ABS(EXTRACT(EPOCH FROM (actual_time - scheduled_time)) / 60)::INT
                                            ) STORED,

    grace_period_minutes                        INT DEFAULT 10,  -- org policy, applied uniformly
    beyond_grace_period                            BOOLEAN GENERATED ALWAYS AS (
                                                    ABS(EXTRACT(EPOCH FROM (actual_time - scheduled_time)) / 60)::INT > grace_period_minutes
                                                  ) STORED,

    created_at                                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. MOBILE DEVICE REGISTRY
-- ================================================================
CREATE TABLE IF NOT EXISTS mobile_devices (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    device_model                VARCHAR(200),
    os_name                         VARCHAR(50),
    os_version                        VARCHAR(50),
    app_version                          VARCHAR(20),
    device_fingerprint                      VARCHAR(255) UNIQUE,  -- for anti-buddy-punching device binding

    biometric_enrolled                         BOOLEAN DEFAULT FALSE,
    biometric_enrolled_at                         TIMESTAMPTZ,

    last_sync_at                                     TIMESTAMPTZ,
    status                                              VARCHAR(20) DEFAULT 'active'
                                                        CHECK (status IN ('active','offline_cached','inactive')),

    registered_at                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- OFFLINE SYNC QUEUE (brief: "Offline Mode: 3 Pending Syncs")
-- ================================================================
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile_device_id    UUID NOT NULL REFERENCES mobile_devices(id),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),

    cached_punch_type    VARCHAR(10) CHECK (cached_punch_type IN ('in','out')),
    cached_timestamp     TIMESTAMPTZ NOT NULL,  -- when the punch actually happened, offline
    cached_latitude      NUMERIC(10,7),
    cached_longitude     NUMERIC(10,7),

    sync_status          VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed')),
    synced_at            TIMESTAMPTZ,

    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_otr_employee       ON overtime_requests(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_otr_status            ON overtime_requests(status);
CREATE INDEX IF NOT EXISTS idx_otr_manager              ON overtime_requests(manager_employee_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_otr_exceeds_cap             ON overtime_requests(exceeds_weekly_cap) WHERE exceeds_weekly_cap;
CREATE INDEX IF NOT EXISTS idx_otr_unsynced                  ON overtime_requests(synced_to_payroll) WHERE status = 'approved' AND NOT synced_to_payroll;

CREATE INDEX IF NOT EXISTS idx_lee_employee                       ON late_early_exceptions(employee_id, exception_date);
CREATE INDEX IF NOT EXISTS idx_lee_beyond_grace                      ON late_early_exceptions(beyond_grace_period) WHERE beyond_grace_period;
CREATE INDEX IF NOT EXISTS idx_lee_type                                  ON late_early_exceptions(exception_type);

CREATE INDEX IF NOT EXISTS idx_md_employee                                  ON mobile_devices(employee_id);
CREATE INDEX IF NOT EXISTS idx_md_status                                       ON mobile_devices(status);
CREATE INDEX IF NOT EXISTS idx_osq_device                                         ON offline_sync_queue(mobile_device_id);
CREATE INDEX IF NOT EXISTS idx_osq_pending                                           ON offline_sync_queue(sync_status) WHERE sync_status = 'pending';

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_overtime_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['overtime_requests','mobile_devices'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_overtime_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-compute weekly_hours_before/after preview at submission (mirrors
-- the missed_punch/regularization pattern for consistency)
CREATE OR REPLACE FUNCTION fn_compute_ot_weekly_preview()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE week_start DATE; week_end DATE; existing_hours NUMERIC;
BEGIN
    week_start := NEW.request_date - (EXTRACT(DOW FROM NEW.request_date)::INT);
    week_end := week_start + 6;

    SELECT COALESCE(SUM(total_hours_worked), 0) INTO existing_hours
    FROM daily_attendance_records
    WHERE employee_id = NEW.employee_id AND attendance_date BETWEEN week_start AND week_end;

    NEW.weekly_hours_before := existing_hours;
    NEW.weekly_hours_after := existing_hours + NEW.requested_hours;

    IF NEW.employee_consent THEN NEW.consent_timestamp := NOW(); END IF;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_ot_weekly_preview
    BEFORE INSERT ON overtime_requests
    FOR EACH ROW EXECUTE FUNCTION fn_compute_ot_weekly_preview();

-- Block approval if it would exceed the 24hr/week statutory OT cap
-- (the brief's brightest legal line — daily UI also disables the Approve button)
CREATE OR REPLACE FUNCTION fn_block_ot_cap_breach()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE weekly_ot_total NUMERIC;
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        SELECT COALESCE(SUM(requested_hours), 0) INTO weekly_ot_total
        FROM overtime_requests
        WHERE employee_id = NEW.employee_id AND status = 'approved'
          AND request_date BETWEEN (NEW.request_date - EXTRACT(DOW FROM NEW.request_date)::INT)
                                AND (NEW.request_date - EXTRACT(DOW FROM NEW.request_date)::INT + 6);

        IF weekly_ot_total + NEW.requested_hours > 24 THEN
            RAISE EXCEPTION 'Cannot approve: would exceed the 24-hour weekly overtime cap per Nepal Labour Act 2074.';
        END IF;

        NEW.decided_at := NOW();
        NEW.synced_to_payroll := TRUE;
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        NEW.decided_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_ot_cap
    BEFORE UPDATE OF status ON overtime_requests
    FOR EACH ROW EXECUTE FUNCTION fn_block_ot_cap_breach();

-- Mobile: when a sync_status flips to 'synced', update the device's last_sync_at
CREATE OR REPLACE FUNCTION fn_mark_device_synced()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.sync_status = 'synced' AND OLD.sync_status = 'pending' THEN
        NEW.synced_at := NOW();
        UPDATE mobile_devices SET last_sync_at = NOW(), status = 'active' WHERE id = NEW.mobile_device_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_mark_synced
    BEFORE UPDATE OF sync_status ON offline_sync_queue
    FOR EACH ROW EXECUTE FUNCTION fn_mark_device_synced();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Department OT cost summary (the org-wide dashboard)
CREATE OR REPLACE VIEW v_overtime_dept_summary AS
SELECT
    d.name AS department_name,
    COUNT(DISTINCT dar.employee_id) AS headcount,
    SUM(dar.overtime_hours) AS total_ot_hours,
    SUM(dar.overtime_hours * COALESCE(e.basic_salary_npr / 30 / 8, 0) * 1.5) AS estimated_ot_cost_npr,
    e.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE dar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY d.name, e.company_id;

-- Page 1: Employees approaching/at the weekly OT cap (burnout alert feed)
CREATE OR REPLACE VIEW v_ot_burnout_alerts AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    DATE_TRUNC('week', CURRENT_DATE)::DATE AS week_start,
    COALESCE(SUM(otr.requested_hours), 0) AS weekly_ot_hours,
    ROUND(COALESCE(SUM(otr.requested_hours), 0) / 24.0 * 100, 1) AS cap_pct,
    e.company_id
FROM employees e
LEFT JOIN overtime_requests otr ON otr.employee_id = e.id AND otr.status = 'approved'
    AND otr.request_date >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY e.employee_code, e.first_name, e.last_name, e.company_id
HAVING COALESCE(SUM(otr.requested_hours), 0) >= 18;  -- 75% of 24hr cap

-- Page 2: Manager approval queue
CREATE OR REPLACE VIEW v_ot_approval_queue AS
SELECT
    otr.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM overtime_requests otr
JOIN employees e ON otr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE otr.status = 'pending' AND NOT otr.is_deleted
ORDER BY otr.exceeds_weekly_cap DESC, otr.created_at ASC;

-- Page 3: Chronic late/early offenders (3+ occurrences this month)
CREATE OR REPLACE VIEW v_chronic_late_early_offenders AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    lee.exception_type, COUNT(*) AS occurrence_count,
    e.company_id
FROM late_early_exceptions lee
JOIN employees e ON lee.employee_id = e.id
WHERE lee.exception_date >= DATE_TRUNC('month', CURRENT_DATE) AND lee.beyond_grace_period
GROUP BY e.employee_code, e.first_name, e.last_name, lee.exception_type, e.company_id
HAVING COUNT(*) >= 3;

-- Page 4: Real-time attendance feed (live working/break/absent status)
CREATE OR REPLACE VIEW v_realtime_attendance_feed AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    dar.current_status, dar.first_login_time,
    CASE WHEN dar.current_status = 'working' AND dar.overtime_hours > 0 THEN TRUE ELSE FALSE END AS is_accruing_ot,
    dar.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE dar.attendance_date = CURRENT_DATE;

-- Page 5: Mobile device health overview
CREATE OR REPLACE VIEW v_mobile_device_health AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    md.device_model, md.os_name, md.os_version, md.app_version,
    md.last_sync_at, md.biometric_enrolled, md.status,
    (SELECT COUNT(*) FROM offline_sync_queue WHERE mobile_device_id = md.id AND sync_status = 'pending') AS pending_sync_count,
    md.company_id
FROM mobile_devices md
JOIN employees e ON md.employee_id = e.id
ORDER BY md.status DESC, md.last_sync_at ASC;
