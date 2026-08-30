-- ================================================================
-- FILE: database/schemas/insource_outsource_attendance_schema.sql
-- eLogix HRMS — Workforce Operations > Attendance Management > Daily
-- Attendance > Insource / Outsource Attendance (2 pages)
--
-- Design note: Insource Attendance is a FILTERED VIEW over the
-- existing daily_attendance_records (employment_type = 'regular' etc)
-- — no new table needed there. Outsource Attendance needs a NEW table
-- because vendor-supplied staff attendance arrives via a different
-- pipeline (vendor API sync, not direct biometric/GPS capture) and
-- must track sync provenance + variance disputes, distinct from the
-- existing vendor_employees billing/SLA tables.
--
--   1. Insource Attendance -> v_insource_attendance_log (view only)
--   2. Outsource Attendance -> outsource_attendance_sync (new table)
--                            + outsource_attendance_disputes
--
-- Nepal Labour Act 2074: 8hr/48hr caps, 30-min mandatory break,
-- OT at 1.5x; outsourced staff restricted to non-core functions;
-- main employer retains legal duty to maintain attendance records
-- for outsourced personnel even though a vendor operates them.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- OUTSOURCE ATTENDANCE SYNC (vendor-supplied staff daily records)
-- ================================================================
CREATE TABLE IF NOT EXISTS outsource_attendance_sync (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_employee_id       UUID       NOT NULL REFERENCES vendor_employees(id),
    vendor_id                   UUID    NOT NULL REFERENCES vendors(id),

    attendance_date                DATE NOT NULL,
    login_time                        TIMESTAMPTZ,
    logout_time                          TIMESTAMPTZ,
    total_hours                            NUMERIC(5,2) GENERATED ALWAYS AS (
                                             CASE WHEN logout_time IS NOT NULL AND login_time IS NOT NULL
                                               THEN ROUND(EXTRACT(EPOCH FROM (logout_time - login_time)) / 3600.0, 2)
                                               ELSE NULL END
                                           ) STORED,

    location_name                              VARCHAR(300),
    latitude                                      NUMERIC(10,7),
    longitude                                        NUMERIC(10,7),
    geo_validated                                       BOOLEAN DEFAULT FALSE,
    -- cross-checked against existing geo_fences table (attendance_setup_schema.sql)

    -- Federated sync provenance (brief: vendor logs in their own system, pushed via API)
    sync_source                                            VARCHAR(20) DEFAULT 'vendor_api'
                                                           CHECK (sync_source IN ('vendor_api','manual_entry','biometric_shared_device')),
    sync_status                                               VARCHAR(20) DEFAULT 'pending_sync'
                                                              CHECK (sync_status IN ('synced','discrepancy','pending_sync')),
    synced_at                                                    TIMESTAMPTZ,
    vendor_raw_payload                                              JSONB,  -- original vendor API response, for audit

    -- Discrepancy / "ghost employee" risk detection
    variance_flag                                                      BOOLEAN DEFAULT FALSE,
    variance_note                                                         TEXT,
    ghost_employee_risk_score                                                FLOAT DEFAULT 0,  -- 0-100, AI-computed

    created_at                                                                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                     TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (vendor_employee_id, attendance_date)
);

-- ================================================================
-- VARIANCE / DISPUTE TRACKER
-- Brief + best practice: "If an employee disputes outsourced time logs,
-- the UI provides an automated Inquiry module... connects employee,
-- internal HR, and external vendor."
-- ================================================================
CREATE TABLE IF NOT EXISTS outsource_attendance_disputes (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    outsource_attendance_sync_id UUID   NOT NULL REFERENCES outsource_attendance_sync(id),
    vendor_id                       UUID NOT NULL REFERENCES vendors(id),

    raised_by                          VARCHAR(20) NOT NULL
                                       CHECK (raised_by IN ('employee','internal_hr','vendor','system_auto')),
    raised_by_user_id                     UUID,

    dispute_category                         VARCHAR(30) DEFAULT 'time_discrepancy'
                                             CHECK (dispute_category IN ('time_discrepancy','missing_punch',
                                               'wrong_location','ghost_entry_suspected','billing_mismatch')),
    description                                 TEXT NOT NULL,

    status                                         VARCHAR(20) DEFAULT 'open'
                                                   CHECK (status IN ('open','vendor_responded','resolved','escalated')),
    vendor_response                                   TEXT,
    resolution_notes                                     TEXT,
    resolved_by                                             UUID,
    resolved_at                                                TIMESTAMPTZ,

    created_at                                                    TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_oas_vendor_emp      ON outsource_attendance_sync(vendor_employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_oas_vendor             ON outsource_attendance_sync(vendor_id);
CREATE INDEX IF NOT EXISTS idx_oas_status                ON outsource_attendance_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_oas_variance                 ON outsource_attendance_sync(variance_flag) WHERE variance_flag;
CREATE INDEX IF NOT EXISTS idx_oas_ghost_risk                  ON outsource_attendance_sync(ghost_employee_risk_score) WHERE ghost_employee_risk_score >= 50;

CREATE INDEX IF NOT EXISTS idx_oad_sync_record                     ON outsource_attendance_disputes(outsource_attendance_sync_id);
CREATE INDEX IF NOT EXISTS idx_oad_vendor                            ON outsource_attendance_disputes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_oad_open                                 ON outsource_attendance_disputes(status) WHERE status IN ('open','vendor_responded');

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_outsource_att_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['outsource_attendance_sync','outsource_attendance_disputes'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_outsource_att_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-detect variance: logout exists in vendor payload but no matching
-- geo-validated punch, or total_hours wildly exceeds scheduled shift
CREATE OR REPLACE FUNCTION fn_detect_outsource_variance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.login_time IS NOT NULL AND NEW.logout_time IS NULL
       AND NEW.attendance_date < CURRENT_DATE THEN
        -- Missing checkout on a past date = likely variance
        NEW.variance_flag := TRUE;
        NEW.sync_status := 'discrepancy';
        NEW.variance_note := COALESCE(NEW.variance_note,
            'Vendor record shows no checkout for a completed past shift — possible ghost entry or sync lag.');
    END IF;

    IF NOT NEW.geo_validated AND NEW.sync_source = 'vendor_api' THEN
        NEW.ghost_employee_risk_score := LEAST(NEW.ghost_employee_risk_score + 25, 100);
    END IF;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_detect_variance
    BEFORE INSERT OR UPDATE ON outsource_attendance_sync
    FOR EACH ROW EXECUTE FUNCTION fn_detect_outsource_variance();

-- Auto-create a dispute ticket when variance is flagged (brief's "automated Inquiry module")
CREATE OR REPLACE FUNCTION fn_auto_create_dispute()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.variance_flag AND (OLD IS NULL OR NOT OLD.variance_flag) THEN
        INSERT INTO outsource_attendance_disputes
          (company_id, outsource_attendance_sync_id, vendor_id, raised_by,
           dispute_category, description, created_at)
        VALUES
          (NEW.company_id, NEW.id, NEW.vendor_id, 'system_auto',
           'time_discrepancy', COALESCE(NEW.variance_note, 'Auto-flagged variance detected.'), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_auto_dispute
    AFTER INSERT OR UPDATE OF variance_flag ON outsource_attendance_sync
    FOR EACH ROW EXECUTE FUNCTION fn_auto_create_dispute();

-- ================================================================
-- VIEWS
-- ================================================================

-- Insource Attendance log (filtered view over existing daily_attendance_records
-- joined with employees to exclude any non-regular/non-direct staff)
CREATE OR REPLACE VIEW v_insource_attendance_log AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    e.employment_type,
    dar.attendance_date, dar.first_login_time, dar.last_logout_time,
    dar.total_hours_worked, dar.total_break_minutes, dar.break_compliant,
    dar.primary_capture_method, dar.is_night_duty, dar.is_public_holiday_worked,
    dar.is_weekly_rest_day_worked, dar.is_extra_duty, dar.overtime_hours,
    dar.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.employment_type IN ('regular', 'work_based', 'time_bound')  -- excludes vendor-supplied/outsourced
ORDER BY dar.attendance_date DESC;

-- Insource statutory counters summary (mirrors v_daily_statutory_counters but insource-only)
CREATE OR REPLACE VIEW v_insource_statutory_summary AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    COUNT(*) FILTER (WHERE dar.is_night_duty) AS night_duty_count,
    COUNT(*) FILTER (WHERE dar.is_public_holiday_worked) AS holiday_worked_count,
    SUM(dar.overtime_hours) AS total_overtime_hours,
    COUNT(*) FILTER (WHERE NOT dar.break_compliant) AS break_violation_count,
    e.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
WHERE e.employment_type IN ('regular', 'work_based', 'time_bound')
  AND dar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY e.employee_code, e.first_name, e.last_name, e.company_id;

-- Outsource attendance with vendor + dispute context (powers the page directly)
CREATE OR REPLACE VIEW v_outsource_attendance_today AS
SELECT
    ve.employee_name, v.name AS vendor_name, ve.role_designation,
    oas.attendance_date, oas.login_time, oas.logout_time, oas.total_hours,
    oas.sync_source, oas.sync_status, oas.synced_at,
    oas.variance_flag, oas.variance_note, oas.geo_validated, oas.location_name,
    oas.ghost_employee_risk_score,
    oas.company_id
FROM outsource_attendance_sync oas
JOIN vendor_employees ve ON oas.vendor_employee_id = ve.id
JOIN vendors v ON oas.vendor_id = v.id
WHERE oas.attendance_date = CURRENT_DATE
ORDER BY oas.variance_flag DESC, oas.sync_status;

-- Open disputes queue (cross-vendor)
CREATE OR REPLACE VIEW v_outsource_open_disputes AS
SELECT
    ve.employee_name, v.name AS vendor_name,
    oad.dispute_category, oad.description, oad.status, oad.created_at,
    oad.company_id
FROM outsource_attendance_disputes oad
JOIN outsource_attendance_sync oas ON oad.outsource_attendance_sync_id = oas.id
JOIN vendor_employees ve ON oas.vendor_employee_id = ve.id
JOIN vendors v ON oad.vendor_id = v.id
WHERE oad.status IN ('open', 'vendor_responded')
ORDER BY oad.created_at ASC;

-- Ghost-employee risk flagging (vendors with repeated unvalidated attendance)
CREATE OR REPLACE VIEW v_ghost_employee_risk_report AS
SELECT
    v.name AS vendor_name,
    COUNT(*) AS flagged_record_count,
    ROUND(AVG(oas.ghost_employee_risk_score)::NUMERIC, 1) AS avg_risk_score,
    oas.company_id
FROM outsource_attendance_sync oas
JOIN vendors v ON oas.vendor_id = v.id
WHERE oas.ghost_employee_risk_score >= 50
GROUP BY v.name, oas.company_id
ORDER BY avg_risk_score DESC;
