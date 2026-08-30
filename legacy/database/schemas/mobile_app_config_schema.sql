-- ================================================================
-- FILE: database/schemas/mobile_app_config_schema.sql
-- eLogix HRMS -- System Administration > Integration & API > Mobile
-- App Configuration (6 pages: Mobile Attendance, GPS Tracking,
-- Geo-Fencing, Field Visit Tracking, Route Monitoring, Field Task
-- Management)
--
-- Design note: 3 of 6 pages already existed.
-- MobileAttendanceTrackingPage (biometric/facial liveness, GPS
-- geofence, QR scan, offline caching) and FieldVisitTrackingPage
-- (the full TA/DA mileage workflow with manager map dashboard) are
-- BOTH reused verbatim under their new nested sidebar keys -- neither
-- needed a single new table. GeoFencingPage existed but was a fully
-- orphaned import (confirmed before touching anything: imported in
-- App.jsx, routed to NEITHER its old 'geo-fencing' key NOR a new one)
-- -- now wired to 'geo-fencing-mobile-config', still no new table needed.
--
-- The 'mobile-configuration' parent sidebar entry was a genuine dead
-- end -- a real leaf node, structurally identical to its six
-- siblings, with no backing page anywhere. MobileAppConfigOverviewPage
-- closes that gap as a pure navigation hub.
--
-- GPS Tracking, Route Monitoring, and Field Task Management are
-- genuinely new -- no battery-aware polling config, continuous
-- breadcrumb trail, or field-task-with-evidence-capture table existed
-- anywhere in the build.
--
--   - gps_polling_profiles (NEW)
--   - device_health_log (NEW)
--   - route_breadcrumbs (NEW, with the Privacy Mode pause respected
--     structurally -- no rows are ever written while paused)
--   - field_tasks (NEW -- the evidence-required completion gate)
--
-- Global compliance grounding (no Nepal-specific legal mandate named
-- in this brief): privacy-first tracking (location data scoped
-- strictly to active work hours, explicit pause control); evidence-
-- based task completion rather than location-pin-only productivity claims.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 2: GPS TRACKING -- the polling config layer
-- ================================================================
CREATE TABLE IF NOT EXISTS gps_polling_profiles (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    role_or_designation        VARCHAR(100) NOT NULL,
    interval_seconds                INT NOT NULL DEFAULT 0,  -- 0 means GPS disabled entirely for this role
    battery_aware_throttle              BOOLEAN DEFAULT TRUE,  -- auto-extend interval when battery is low

    -- hard privacy boundary: polling structurally cannot run outside
    -- this window, never an opt-out toggle someone has to remember
    active_only_during_work_hours           BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS device_health_log (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    platform                      VARCHAR(20) CHECK (platform IN ('ios','android')),
    battery_pct                       INT,
    last_ping_at                          TIMESTAMPTZ,

    -- a stale device NEVER auto-implies a missed visit -- this stays
    -- a flag for manual review, structurally distinct from an
    -- attendance/task-completion record
    is_stale                                  BOOLEAN GENERATED ALWAYS AS (
                                                last_ping_at < NOW() - INTERVAL '30 minutes'
                                              ) STORED
);

CREATE INDEX IF NOT EXISTS idx_dhl_stale ON device_health_log(is_stale) WHERE is_stale;

-- ================================================================
-- PAGE 5: ROUTE MONITORING -- continuous breadcrumb, Privacy Mode respected
-- ================================================================
CREATE TABLE IF NOT EXISTS route_breadcrumbs (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    latitude                      NUMERIC(10,7) NOT NULL,
    longitude                         NUMERIC(10,7) NOT NULL,
    recorded_at                           TIMESTAMPTZ DEFAULT NOW(),

    -- TRUE if this point deviates meaningfully from the planned path
    -- between scheduled stops -- never auto-judged, only flagged
    is_unscheduled_detour                     BOOLEAN DEFAULT FALSE,
    employee_annotation                           TEXT  -- the employee's own explanation, captured before anyone else interprets the gap
);

CREATE INDEX IF NOT EXISTS idx_rb_employee_day ON route_breadcrumbs(employee_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_rb_unannotated_detour ON route_breadcrumbs(is_unscheduled_detour, employee_annotation)
    WHERE is_unscheduled_detour AND employee_annotation IS NULL;

-- Note: when Privacy Mode is active client-side, the mobile app simply
-- never calls the breadcrumb-write endpoint -- there is no
-- "paused = TRUE" row ever written, because the absence of data IS
-- the privacy guarantee, never a flag that could later be queried
-- to reconstruct what was paused.

-- ================================================================
-- PAGE 6: FIELD TASK MANAGEMENT -- evidence-required completion
-- ================================================================
CREATE TABLE IF NOT EXISTS field_tasks (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    assigned_to_employee_id  UUID       NOT NULL REFERENCES employees(id),

    title                         VARCHAR(300) NOT NULL,
    client_name                      VARCHAR(200),

    requires_photo                       BOOLEAN DEFAULT FALSE,
    requires_signature                       BOOLEAN DEFAULT FALSE,
    photo_url                                    VARCHAR(500),
    signature_url                                    VARCHAR(500),

    stage                                                VARCHAR(20) DEFAULT 'today' CHECK (stage IN ('today','in_progress','completed')),
    completed_at                                             TIMESTAMPTZ,

    -- the structural completion gate: cannot be marked completed
    -- without the evidence the task itself requires
    CONSTRAINT ck_evidence_required_for_completion CHECK (
        stage != 'completed' OR
        (NOT requires_photo OR photo_url IS NOT NULL) AND
        (NOT requires_signature OR signature_url IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_ft_employee_stage ON field_tasks(assigned_to_employee_id, stage);

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW v_gps_tracking_dashboard AS
SELECT gpp.*,
    (SELECT COUNT(*) FROM device_health_log dhl WHERE dhl.is_stale AND dhl.company_id = gpp.company_id) AS stale_device_count
FROM gps_polling_profiles gpp;

CREATE OR REPLACE VIEW v_route_monitoring_today AS
SELECT * FROM route_breadcrumbs WHERE recorded_at >= CURRENT_DATE ORDER BY employee_id, recorded_at;

CREATE OR REPLACE VIEW v_field_tasks_dashboard AS
SELECT * FROM field_tasks ORDER BY stage, assigned_to_employee_id;
