-- ================================================================
-- FILE: database/schemas/daily_attendance_schema.sql
-- NepHR Pro — Workforce Operations > Attendance Management > Daily Attendance (5 pages)
--
-- Design note: gps_punches and biometric_punch_log already exist
-- (attendance_setup_schema.sql) as the raw capture layer with geo/biometric
-- validation triggers. This file adds the CONSOLIDATED daily attendance
-- record (one row per employee per day, aggregating all punch sources)
-- plus the web check-in session table and the QR code infrastructure
-- explicitly requested in the brief — QR codes for employees, assets,
-- AND transactions/goods.
--
--   1. Live Attendance        -> reads from daily_attendance_records (live view)
--   2. Employee Movement      -> movement_events (granular login/break/movement log)
--   3. Biometric Attendance   -> reads from existing biometric_punch_log
--   4. Geo Attendance         -> reads from existing gps_punches
--   5. Web Check-In & Out     -> web_checkin_sessions
--
--   + qr_codes (universal QR registry: employees, assets, transactions)
--
-- Nepal Labour Act 2074 Section 20: attendance register, 8hr/48hr caps,
-- mandatory 30-min break after 5hrs, OT at 1.5x capped 4hr/day-24hr/week,
-- Section 13: falsifying check-ins is misconduct.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CONSOLIDATED DAILY ATTENDANCE RECORD
-- One row per employee per day — aggregates biometric/GPS/web/manual
-- punches into the canonical record used for payroll.
-- ================================================================
CREATE TABLE IF NOT EXISTS daily_attendance_records (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    attendance_date            DATE NOT NULL,

    -- Canonical login/logout (earliest in, latest out across all sources)
    first_login_time              TIMESTAMPTZ,
    last_logout_time                  TIMESTAMPTZ,
    primary_capture_method               VARCHAR(20)
                                         CHECK (primary_capture_method IN ('biometric','gps','web','qr','manual')),

    -- Live status (drives Page 1)
    current_status                          VARCHAR(20) DEFAULT 'absent'
                                            CHECK (current_status IN ('working','on_break','field_duty','absent','missed_checkout','logged_out')),

    -- Computed working time
    total_hours_worked                          NUMERIC(5,2),
    total_break_minutes                            INT DEFAULT 0,
    break_compliant                                   BOOLEAN,  -- did they take the mandatory 30-min break?

    -- Statutory counters (auto-computed, mirrored from weekly_rosters logic but per-day)
    is_night_duty                                        BOOLEAN DEFAULT FALSE,
    is_public_holiday_worked                                BOOLEAN DEFAULT FALSE,
    is_weekly_rest_day_worked                                  BOOLEAN DEFAULT FALSE,
    is_extra_duty                                                 BOOLEAN DEFAULT FALSE,
    overtime_hours                                                   NUMERIC(4,2) DEFAULT 0
                                                                     CHECK (overtime_hours <= 4),  -- LA2074 daily OT cap
    overtime_rate_multiplier                                            NUMERIC(3,2) DEFAULT 1.5,

    -- Anomaly flags
    missed_checkout                                                        BOOLEAN DEFAULT FALSE,
    late_arrival_minutes                                                      INT DEFAULT 0,
    early_departure_minutes                                                      INT DEFAULT 0,

    -- Manager/supervisor amendment trail (brief: can edit anytime, anywhere)
    last_amended_by                                                                 UUID,
    last_amended_at                                                                    TIMESTAMPTZ,
    amendment_reason                                                                      TEXT,

    created_at                                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                 TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (employee_id, attendance_date)
);

-- ================================================================
-- MOVEMENT EVENTS (granular login/break/movement log within a day)
-- Powers Page 2's timeline. References existing gps_punches/biometric
-- punches where applicable via source_punch_id.
-- ================================================================
CREATE TABLE IF NOT EXISTS movement_events (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    daily_attendance_record_id UUID     REFERENCES daily_attendance_records(id),

    event_type                  VARCHAR(20) NOT NULL
                                CHECK (event_type IN ('login','logout','break_start','break_end','movement')),
    event_time                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location_name                     VARCHAR(300),
    latitude                             NUMERIC(10,7),
    longitude                               NUMERIC(10,7),

    -- Links back to the raw capture source for audit traceability
    source_method                              VARCHAR(20) CHECK (source_method IN ('biometric','gps','web','qr','manual')),
    source_gps_punch_id                           UUID,  -- references gps_punches(id) from attendance_setup_schema
    source_biometric_punch_id                        UUID,  -- references biometric_punch_log(id)
    source_web_session_id                               UUID,  -- references web_checkin_sessions(id), defined below

    created_at                                              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- WEB CHECK-IN SESSIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS web_checkin_sessions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    login_time                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_time                   TIMESTAMPTZ,
    total_hours                     NUMERIC(5,2) GENERATED ALWAYS AS (
                                      CASE WHEN logout_time IS NOT NULL
                                        THEN ROUND(EXTRACT(EPOCH FROM (logout_time - login_time)) / 3600.0, 2)
                                        ELSE NULL END
                                    ) STORED,

    -- Audit trail (brief: capture IP, session ID per global best practice)
    ip_address                         VARCHAR(50) NOT NULL,
    session_token                         VARCHAR(100) NOT NULL,
    browser_user_agent                       VARCHAR(500),

    -- Security: same-IP concurrent session check (best-practice flag)
    duplicate_ip_flag                           BOOLEAN DEFAULT FALSE,

    breaks_deducted_minutes                        INT DEFAULT 0,

    status                                            VARCHAR(20) DEFAULT 'active'
                                                      CHECK (status IN ('active','completed')),

    created_at                                           TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- QR CODE REGISTRY (brief: "harek employee ko QR Code", "harek
-- transaction, assets ra goods ko QR Code huna parxa")
-- Universal QR system covering 3 entity types in one table.
-- ================================================================
CREATE TABLE IF NOT EXISTS qr_codes (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    qr_type                  VARCHAR(20) NOT NULL
                             CHECK (qr_type IN ('employee_badge','asset','transaction','goods')),

    -- Polymorphic reference (only one of these set, matching qr_type)
    employee_id                 UUID REFERENCES employees(id),
    asset_id                       UUID REFERENCES employee_assets(id),
    transaction_reference_table       VARCHAR(100),  -- e.g. 'fnf_settlements', 'employee_assets'
    transaction_reference_id             UUID,

    -- The actual encoded payload (a signed token, not raw PII)
    qr_payload                              VARCHAR(500) NOT NULL UNIQUE,
    qr_image_url                               VARCHAR(500),

    -- For employee badges: enables QR-based clock-in (brief's web check-in QR option)
    usable_for_attendance                         BOOLEAN DEFAULT FALSE,

    is_active                                        BOOLEAN DEFAULT TRUE,
    expires_at                                          TIMESTAMPTZ,  -- transaction QRs may expire; employee/asset QRs typically don't

    generated_at                                           TIMESTAMPTZ DEFAULT NOW(),
    last_scanned_at                                           TIMESTAMPTZ,
    scan_count                                                   INT DEFAULT 0,

    CONSTRAINT ck_qr_single_reference CHECK (
        (qr_type = 'employee_badge' AND employee_id IS NOT NULL AND asset_id IS NULL) OR
        (qr_type = 'asset' AND asset_id IS NOT NULL AND employee_id IS NULL) OR
        (qr_type IN ('transaction','goods') AND transaction_reference_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS qr_scan_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_code_id      UUID NOT NULL REFERENCES qr_codes(id),
    company_id      UUID NOT NULL,
    scanned_by      UUID,  -- employee who performed the scan (may differ from QR owner, e.g. asset audits)
    scan_purpose    VARCHAR(50),  -- 'attendance', 'asset_audit', 'transaction_verify', etc.
    scan_result     VARCHAR(20) DEFAULT 'success' CHECK (scan_result IN ('success','expired','invalid','inactive')),
    scanned_at      TIMESTAMPTZ DEFAULT NOW(),
    device_info     VARCHAR(255)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_dar_employee_date    ON daily_attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_dar_company_date        ON daily_attendance_records(company_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_dar_live_status            ON daily_attendance_records(current_status) WHERE current_status != 'logged_out';
CREATE INDEX IF NOT EXISTS idx_dar_missed_checkout            ON daily_attendance_records(missed_checkout) WHERE missed_checkout;
CREATE INDEX IF NOT EXISTS idx_dar_night_duty                    ON daily_attendance_records(is_night_duty) WHERE is_night_duty;

CREATE INDEX IF NOT EXISTS idx_mvt_employee                          ON movement_events(employee_id, event_time);
CREATE INDEX IF NOT EXISTS idx_mvt_record                               ON movement_events(daily_attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_mvt_type                                   ON movement_events(event_type);

CREATE INDEX IF NOT EXISTS idx_wcs_employee                                  ON web_checkin_sessions(employee_id, login_time);
CREATE INDEX IF NOT EXISTS idx_wcs_active                                      ON web_checkin_sessions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wcs_ip                                            ON web_checkin_sessions(ip_address, login_time);

CREATE INDEX IF NOT EXISTS idx_qr_company                                          ON qr_codes(company_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_qr_employee                                            ON qr_codes(employee_id) WHERE qr_type = 'employee_badge';
CREATE INDEX IF NOT EXISTS idx_qr_asset                                                  ON qr_codes(asset_id) WHERE qr_type = 'asset';
CREATE INDEX IF NOT EXISTS idx_qr_payload                                                   ON qr_codes(qr_payload);
CREATE INDEX IF NOT EXISTS idx_qrsl_qr                                                          ON qr_scan_log(qr_code_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_daily_att_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['daily_attendance_records','web_checkin_sessions'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_daily_att_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-create/update daily_attendance_records whenever a movement_event is logged
CREATE OR REPLACE FUNCTION fn_sync_daily_record_from_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE rec_id UUID; att_date DATE;
BEGIN
    att_date := NEW.event_time::DATE;

    INSERT INTO daily_attendance_records (company_id, employee_id, attendance_date, primary_capture_method, created_at)
    VALUES (NEW.company_id, NEW.employee_id, att_date, NEW.source_method, NOW())
    ON CONFLICT (employee_id, attendance_date) DO NOTHING
    RETURNING id INTO rec_id;

    IF rec_id IS NULL THEN
        SELECT id INTO rec_id FROM daily_attendance_records WHERE employee_id = NEW.employee_id AND attendance_date = att_date;
    END IF;

    NEW.daily_attendance_record_id := rec_id;

    IF NEW.event_type = 'login' THEN
        UPDATE daily_attendance_records
           SET first_login_time = LEAST(COALESCE(first_login_time, NEW.event_time), NEW.event_time),
               current_status = 'working'
         WHERE id = rec_id;
    ELSIF NEW.event_type = 'logout' THEN
        UPDATE daily_attendance_records
           SET last_logout_time = NEW.event_time, current_status = 'logged_out'
         WHERE id = rec_id;
    ELSIF NEW.event_type = 'break_start' THEN
        UPDATE daily_attendance_records SET current_status = 'on_break' WHERE id = rec_id;
    ELSIF NEW.event_type = 'break_end' THEN
        UPDATE daily_attendance_records SET current_status = 'working' WHERE id = rec_id;
    ELSIF NEW.event_type = 'movement' THEN
        UPDATE daily_attendance_records SET current_status = 'field_duty' WHERE id = rec_id;
    END IF;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_sync_daily_record
    BEFORE INSERT ON movement_events
    FOR EACH ROW EXECUTE FUNCTION fn_sync_daily_record_from_movement();

-- Compute total hours, break compliance, and overtime once logout is recorded
CREATE OR REPLACE FUNCTION fn_compute_daily_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    total_break_min INT;
    gross_hours NUMERIC;
    standard_hours NUMERIC := 8;
BEGIN
    IF NEW.last_logout_time IS NOT NULL AND NEW.first_login_time IS NOT NULL THEN
        gross_hours := EXTRACT(EPOCH FROM (NEW.last_logout_time - NEW.first_login_time)) / 3600.0;

        SELECT COALESCE(SUM(
            EXTRACT(EPOCH FROM (e2.event_time - e1.event_time)) / 60
        ), 0) INTO total_break_min
        FROM movement_events e1
        JOIN movement_events e2 ON e2.employee_id = e1.employee_id
            AND e2.event_type = 'break_end' AND e2.event_time > e1.event_time
        WHERE e1.employee_id = NEW.employee_id AND e1.event_type = 'break_start'
          AND e1.event_time::DATE = NEW.attendance_date
          AND e2.event_time = (
              SELECT MIN(e3.event_time) FROM movement_events e3
              WHERE e3.employee_id = e1.employee_id AND e3.event_type = 'break_end' AND e3.event_time > e1.event_time
          );

        NEW.total_break_minutes := total_break_min;
        NEW.break_compliant := total_break_min >= 30 OR gross_hours <= 5;
        NEW.total_hours_worked := ROUND(gross_hours - (total_break_min / 60.0), 2);

        -- Nepal LA2074: OT capped at 4hr/day, paid at min 1.5x
        NEW.overtime_hours := LEAST(GREATEST(NEW.total_hours_worked - standard_hours, 0), 4);
        NEW.missed_checkout := FALSE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_compute_daily_totals
    BEFORE UPDATE OF last_logout_time ON daily_attendance_records
    FOR EACH ROW EXECUTE FUNCTION fn_compute_daily_totals();

-- Web check-in: flag duplicate concurrent sessions from same IP (security best practice)
CREATE OR REPLACE FUNCTION fn_web_checkin_duplicate_ip()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE existing_count INT;
BEGIN
    SELECT COUNT(*) INTO existing_count
    FROM web_checkin_sessions
    WHERE ip_address = NEW.ip_address AND status = 'active' AND employee_id != NEW.employee_id;

    IF existing_count > 0 THEN
        NEW.duplicate_ip_flag := TRUE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_web_checkin_dup_ip
    BEFORE INSERT ON web_checkin_sessions
    FOR EACH ROW EXECUTE FUNCTION fn_web_checkin_duplicate_ip();

-- Auto-compute breaks_deducted_minutes and close out web session totals
CREATE OR REPLACE FUNCTION fn_web_checkin_close()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.logout_time IS NOT NULL AND OLD.logout_time IS NULL THEN
        NEW.status := 'completed';
        NEW.breaks_deducted_minutes := COALESCE(NEW.breaks_deducted_minutes, 30);  -- standard lunch deduction
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_web_checkin_close
    BEFORE UPDATE OF logout_time ON web_checkin_sessions
    FOR EACH ROW EXECUTE FUNCTION fn_web_checkin_close();

-- Auto-generate employee QR badge on employee creation (brief: every employee gets a QR)
CREATE OR REPLACE FUNCTION fn_auto_generate_employee_qr()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO qr_codes (company_id, qr_type, employee_id, qr_payload, usable_for_attendance, generated_at)
    VALUES (NEW.company_id, 'employee_badge', NEW.id,
            'EMP-QR-' || NEW.id || '-' || encode(gen_random_bytes(8), 'hex'),
            TRUE, NOW());
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_auto_employee_qr
    AFTER INSERT ON employees
    FOR EACH ROW EXECUTE FUNCTION fn_auto_generate_employee_qr();

-- Auto-generate asset QR on asset creation (brief: every asset gets a QR)
CREATE OR REPLACE FUNCTION fn_auto_generate_asset_qr()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO qr_codes (company_id, qr_type, asset_id, qr_payload, generated_at)
    VALUES (NEW.company_id, 'asset', NEW.id,
            'AST-QR-' || NEW.id || '-' || encode(gen_random_bytes(8), 'hex'),
            NOW());
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_auto_asset_qr
    AFTER INSERT ON employee_assets
    FOR EACH ROW EXECUTE FUNCTION fn_auto_generate_asset_qr();

-- Track scan count/last_scanned_at on every scan
CREATE OR REPLACE FUNCTION fn_qr_scan_tracking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE qr_codes SET scan_count = scan_count + 1, last_scanned_at = NEW.scanned_at WHERE id = NEW.qr_code_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_qr_scan_tracking
    AFTER INSERT ON qr_scan_log
    FOR EACH ROW EXECUTE FUNCTION fn_qr_scan_tracking();

-- ================================================================
-- VIEWS
-- ================================================================

-- Live attendance feed (Page 1)
CREATE OR REPLACE VIEW v_live_attendance_feed AS
SELECT
    e.employee_code, e.first_name, e.last_name, e.department_id,
    dar.current_status, dar.first_login_time, dar.primary_capture_method, dar.missed_checkout,
    dar.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
WHERE dar.attendance_date = CURRENT_DATE
ORDER BY dar.current_status, dar.first_login_time;

-- Daily statutory counters summary (Page 2 aggregate)
CREATE OR REPLACE VIEW v_daily_statutory_counters AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    COUNT(*) FILTER (WHERE dar.is_night_duty) AS night_duty_count,
    COUNT(*) FILTER (WHERE dar.is_public_holiday_worked) AS public_holiday_worked_count,
    COUNT(*) FILTER (WHERE dar.is_weekly_rest_day_worked) AS rest_day_worked_count,
    COUNT(*) FILTER (WHERE dar.is_extra_duty) AS extra_duty_count,
    SUM(dar.overtime_hours) AS total_overtime_hours,
    COUNT(*) FILTER (WHERE NOT dar.break_compliant) AS break_violation_count,
    dar.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
WHERE dar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY e.employee_code, e.first_name, e.last_name, dar.company_id;

-- Missed checkout alerts (Live Attendance anomaly)
CREATE OR REPLACE VIEW v_missed_checkout_alerts AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    dar.attendance_date, dar.first_login_time, dar.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
WHERE dar.missed_checkout AND dar.attendance_date >= CURRENT_DATE - INTERVAL '3 days';

-- QR codes overview (employees + assets + transactions in one registry view)
CREATE OR REPLACE VIEW v_qr_codes_overview AS
SELECT
    qc.qr_type,
    CASE WHEN qc.qr_type = 'employee_badge' THEN e.first_name || ' ' || e.last_name
         WHEN qc.qr_type = 'asset' THEN a.item_type || ' (' || a.serial_number || ')'
         ELSE qc.transaction_reference_table END AS subject,
    qc.scan_count, qc.last_scanned_at, qc.is_active, qc.company_id
FROM qr_codes qc
LEFT JOIN employees e ON qc.employee_id = e.id
LEFT JOIN employee_assets a ON qc.asset_id = a.id;
