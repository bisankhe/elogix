-- ================================================================
-- FILE: database/schemas/field_visit_tracking_schema.sql
-- eLogix HRMS — Workforce Operations > Attendance Management > Daily
-- Attendance > Field Visit Tracking (TA & DA) (1 page)
--
-- Design note: integrates directly with task_location_assignments and
-- geo_fences (attendance_setup_schema.sql) — a field visit IS a task
-- assignment with a TA/DA allowance layer on top. The auto-created
-- temporary geo-fence from task assignment is what GPS check-in/out
-- validates against here. gps_punches (daily_attendance_schema.sql)
-- supplies the actual check-in/out coordinates and timestamps.
--
--   field_visit_requests       — pre-travel authorization + advance request
--   field_visit_expense_items  — itemized receipts (OCR-assisted)
--   field_visit_rate_config    — org-wide TA per-km + DA tier rates
--
-- Nepal Labour Act 2074: TA/DA rates not statutorily fixed -- must be
-- explicitly written into employment contract; salary continues in full
-- during field visits, TA/DA is a supplementary reimbursement; SSF/PF/
-- gratuity continue to accrue during deputation; Section 20 attendance
-- register applies equally to field staff.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- RATE CONFIGURATION (org-wide TA per-km + tiered DA brackets)
-- ================================================================
CREATE TABLE IF NOT EXISTS field_visit_rate_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL UNIQUE,

    ta_rate_per_km_npr  NUMERIC(8,2) DEFAULT 15.00,

    -- City-tier DA brackets (A/B/C class, per brief's "approved by Labour Office" framework)
    da_tier_a_npr       NUMERIC(8,2) DEFAULT 1200.00,  -- Kathmandu/Pokhara/major cities
    da_tier_b_npr       NUMERIC(8,2) DEFAULT 900.00,   -- district HQs
    da_tier_c_npr       NUMERIC(8,2) DEFAULT 700.00,   -- rural/remote

    -- Overnight stay supplement
    overnight_lodging_cap_npr NUMERIC(10,2) DEFAULT 2500.00,

    -- Route-deviation threshold that triggers an AI flag for manager review
    route_deviation_flag_pct NUMERIC(5,2) DEFAULT 15.00,

    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- FIELD VISIT REQUESTS (the core record — pre-travel through reimbursement)
-- ================================================================
CREATE TABLE IF NOT EXISTS field_visit_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    task_location_assignment_id UUID    REFERENCES task_location_assignments(id),
    -- the mandatory pre-assignment from supervisor/manager (attendance_setup_schema.sql)

    visit_date                  DATE NOT NULL,
    purpose                        TEXT NOT NULL,
    destination_name                  VARCHAR(300) NOT NULL,
    city_tier                            VARCHAR(1) DEFAULT 'A' CHECK (city_tier IN ('A','B','C')),

    -- Pre-travel advance request
    advance_requested_npr                  NUMERIC(10,2) DEFAULT 0,
    advance_approved                          BOOLEAN DEFAULT FALSE,
    advance_disbursed_npr                        NUMERIC(10,2) DEFAULT 0,

    -- GPS check-in/out (links to gps_punches from daily_attendance_schema.sql)
    checkin_gps_punch_id                            UUID,
    checkout_gps_punch_id                              UUID,
    checkin_time                                          TIMESTAMPTZ,
    checkout_time                                            TIMESTAMPTZ,
    geo_validated                                               BOOLEAN DEFAULT FALSE,

    -- Route & distance (auto-calculated)
    estimated_distance_km                                          NUMERIC(7,2),
    actual_distance_km                                                NUMERIC(7,2),
    route_deviation_pct                                                  NUMERIC(5,2),

    -- Auto-calculated allowances
    ta_amount_npr                                                           NUMERIC(10,2) GENERATED ALWAYS AS (NULL) STORED,
    -- (computed via trigger into a separate mutable column below, since
    --  GENERATED columns can't reference other tables for rate lookup)

    overnight_stay                                                              BOOLEAN DEFAULT FALSE,
    is_extra_duty                                                                  BOOLEAN DEFAULT FALSE,  -- mirrors daily_attendance_records flag

    -- AI anomaly detection
    ai_flag_triggered                                                                 BOOLEAN DEFAULT FALSE,
    ai_flag_reason                                                                       TEXT,

    -- Multi-level approval (Employee -> Manager -> Finance -> Payroll)
    status                                                                                  VARCHAR(20) DEFAULT 'draft'
                                                                                            CHECK (status IN ('draft','pending_manager','approved_manager',
                                                                                              'approved_finance','rejected')),

    manager_employee_id                                                                        UUID,
    manager_approved_by                                                                            UUID,
    manager_approved_at                                                                               TIMESTAMPTZ,
    finance_approved_by                                                                                UUID,
    finance_approved_at                                                                                   TIMESTAMPTZ,
    rejection_reason                                                                                        TEXT,

    -- Final computed allowance (mutable, set by trigger)
    ta_npr                                                                                                     NUMERIC(10,2) DEFAULT 0,
    da_npr                                                                                                        NUMERIC(10,2) DEFAULT 0,
    total_allowance_npr                                                                                            NUMERIC(10,2) GENERATED ALWAYS AS (
                                                                                                                    COALESCE(ta_npr,0) + COALESCE(da_npr,0)
                                                                                                                  ) STORED,

    -- Payroll sync
    synced_to_payroll                                                                                              BOOLEAN DEFAULT FALSE,
    payroll_sync_date                                                                                                DATE,

    created_at                                                                                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                                            TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                                                              BOOLEAN DEFAULT FALSE
);

ALTER TABLE field_visit_requests DROP COLUMN IF EXISTS ta_amount_npr;  -- remove the placeholder generated column above

-- ================================================================
-- EXPENSE ITEMS (itemized receipts, OCR-assisted per brief)
-- ================================================================
CREATE TABLE IF NOT EXISTS field_visit_expense_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_visit_request_id UUID NOT NULL REFERENCES field_visit_requests(id),
    company_id          UUID NOT NULL,

    category             VARCHAR(30) NOT NULL
                         CHECK (category IN ('food_lodging','local_transit','fuel','toll_parking','other')),
    amount_npr           NUMERIC(10,2) NOT NULL,
    receipt_photo_url    VARCHAR(500),

    -- OCR-extracted fields (brief: "Smart HRIS tools scan receipts to auto-populate fields")
    ocr_extracted_amount NUMERIC(10,2),
    ocr_extracted_vendor VARCHAR(200),
    ocr_extracted_date   DATE,
    ocr_confidence_pct   FLOAT,

    exceeds_policy_cap   BOOLEAN DEFAULT FALSE,  -- flagged if over the category's per-visit cap

    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_fvr_employee       ON field_visit_requests(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_fvr_status            ON field_visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_fvr_manager              ON field_visit_requests(manager_employee_id) WHERE status = 'pending_manager';
CREATE INDEX IF NOT EXISTS idx_fvr_ai_flag                 ON field_visit_requests(ai_flag_triggered) WHERE ai_flag_triggered;
CREATE INDEX IF NOT EXISTS idx_fvr_date                       ON field_visit_requests(visit_date);
CREATE INDEX IF NOT EXISTS idx_fvr_unsynced                      ON field_visit_requests(synced_to_payroll) WHERE status = 'approved_finance' AND NOT synced_to_payroll;

CREATE INDEX IF NOT EXISTS idx_fvei_request                          ON field_visit_expense_items(field_visit_request_id);
CREATE INDEX IF NOT EXISTS idx_fvei_exceeds_cap                         ON field_visit_expense_items(exceeds_policy_cap) WHERE exceeds_policy_cap;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_field_visit_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_fvr_upd
    BEFORE UPDATE ON field_visit_requests
    FOR EACH ROW EXECUTE FUNCTION fn_field_visit_updated_at();

-- Auto-calculate TA (mileage x rate) and DA (city-tier rate) once
-- actual_distance_km is recorded after checkout
CREATE OR REPLACE FUNCTION fn_calculate_ta_da()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE rates RECORD;
BEGIN
    SELECT * INTO rates FROM field_visit_rate_config WHERE company_id = NEW.company_id;
    IF rates IS NULL THEN
        -- fallback defaults if no org config exists yet
        rates.ta_rate_per_km_npr := 15; rates.da_tier_a_npr := 1200;
        rates.da_tier_b_npr := 900; rates.da_tier_c_npr := 700;
        rates.route_deviation_flag_pct := 15;
    END IF;

    IF NEW.actual_distance_km IS NOT NULL THEN
        NEW.ta_npr := ROUND(NEW.actual_distance_km * rates.ta_rate_per_km_npr, 2);
    END IF;

    NEW.da_npr := CASE NEW.city_tier
        WHEN 'A' THEN rates.da_tier_a_npr
        WHEN 'B' THEN rates.da_tier_b_npr
        ELSE rates.da_tier_c_npr END;

    -- Route deviation calculation + AI flag
    IF NEW.estimated_distance_km IS NOT NULL AND NEW.actual_distance_km IS NOT NULL AND NEW.estimated_distance_km > 0 THEN
        NEW.route_deviation_pct := ROUND(
            ABS(NEW.actual_distance_km - NEW.estimated_distance_km) / NEW.estimated_distance_km * 100, 2);

        IF NEW.route_deviation_pct > rates.route_deviation_flag_pct THEN
            NEW.ai_flag_triggered := TRUE;
            NEW.ai_flag_reason := format('Route deviated %s%% from planned path -- flagged for manager review.', NEW.route_deviation_pct);
        END IF;
    END IF;

    -- No geo-validation = no allowance (mirrors the brief's strict odd-location rule)
    IF NOT NEW.geo_validated THEN
        NEW.ai_flag_triggered := TRUE;
        NEW.ai_flag_reason := 'No manager-assigned task/location found -- GPS could not validate the claimed site. TA/DA withheld pending review.';
    END IF;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_calculate_ta_da
    BEFORE INSERT OR UPDATE OF actual_distance_km, city_tier, geo_validated ON field_visit_requests
    FOR EACH ROW EXECUTE FUNCTION fn_calculate_ta_da();

-- Block geo-invalidated requests from progressing past manager approval
-- (no attendance accepted from odd location -> no TA/DA either)
CREATE OR REPLACE FUNCTION fn_block_invalid_location_approval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IN ('approved_manager', 'approved_finance') AND NOT NEW.geo_validated THEN
        RAISE EXCEPTION 'Cannot approve: field visit was not GPS-validated against an assigned task/location.';
    END IF;
    IF NEW.status = 'approved_manager' AND OLD.status = 'pending_manager' THEN
        NEW.manager_approved_at := NOW();
    END IF;
    IF NEW.status = 'approved_finance' AND OLD.status = 'approved_manager' THEN
        NEW.finance_approved_at := NOW();
        NEW.synced_to_payroll := TRUE;
        NEW.payroll_sync_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_invalid_approval
    BEFORE UPDATE OF status ON field_visit_requests
    FOR EACH ROW EXECUTE FUNCTION fn_block_invalid_location_approval();

-- Flag expense items exceeding category caps (policy rule engine, per brief)
CREATE OR REPLACE FUNCTION fn_check_expense_policy_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE cap NUMERIC;
BEGIN
    cap := CASE NEW.category
        WHEN 'food_lodging' THEN 2500
        WHEN 'local_transit' THEN 800
        WHEN 'fuel' THEN 1500
        WHEN 'toll_parking' THEN 300
        ELSE 500 END;

    IF NEW.amount_npr > cap THEN
        NEW.exceeds_policy_cap := TRUE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_expense_policy_cap
    BEFORE INSERT ON field_visit_expense_items
    FOR EACH ROW EXECUTE FUNCTION fn_check_expense_policy_cap();

-- ================================================================
-- VIEWS
-- ================================================================

-- Field visit dashboard with employee + receipt summary (powers the page directly)
CREATE OR REPLACE VIEW v_field_visit_dashboard AS
SELECT
    fvr.*, e.employee_code, e.first_name, e.last_name, des.title AS position_title,
    (SELECT COUNT(*) FROM field_visit_expense_items WHERE field_visit_request_id = fvr.id) AS receipts_uploaded,
    (SELECT COALESCE(SUM(amount_npr),0) FROM field_visit_expense_items WHERE field_visit_request_id = fvr.id) AS receipt_total_npr
FROM field_visit_requests fvr
JOIN employees e ON fvr.employee_id = e.id
LEFT JOIN designations des ON e.designation_id = des.id
WHERE NOT fvr.is_deleted
ORDER BY fvr.visit_date DESC;

-- Manager's pending approval queue
CREATE OR REPLACE VIEW v_field_visit_approval_queue AS
SELECT * FROM v_field_visit_dashboard
WHERE status = 'pending_manager'
ORDER BY ai_flag_triggered DESC, visit_date ASC;

-- Live map data (today's active field visits)
CREATE OR REPLACE VIEW v_field_visit_live_map AS
SELECT
    e.first_name, e.last_name, fvr.destination_name, fvr.checkin_time, fvr.geo_validated,
    fvr.status, fvr.company_id
FROM field_visit_requests fvr
JOIN employees e ON fvr.employee_id = e.id
WHERE fvr.visit_date = CURRENT_DATE AND NOT fvr.is_deleted AND fvr.status != 'rejected';

-- AI-flagged visits requiring review (route deviation or geo-validation failure)
CREATE OR REPLACE VIEW v_field_visit_ai_flagged AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    fvr.visit_date, fvr.destination_name, fvr.route_deviation_pct, fvr.ai_flag_reason,
    fvr.geo_validated, fvr.company_id
FROM field_visit_requests fvr
JOIN employees e ON fvr.employee_id = e.id
WHERE fvr.ai_flag_triggered AND NOT fvr.is_deleted
ORDER BY fvr.visit_date DESC;

-- Pending payroll sync (approved by finance, not yet pushed)
CREATE OR REPLACE VIEW v_field_visit_payroll_queue AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    fvr.visit_date, fvr.ta_npr, fvr.da_npr, fvr.total_allowance_npr,
    fvr.company_id
FROM field_visit_requests fvr
JOIN employees e ON fvr.employee_id = e.id
WHERE fvr.status = 'approved_finance' AND NOT fvr.synced_to_payroll AND NOT fvr.is_deleted;

-- Monthly TA/DA spend summary by department (HCM budget/ROI analytics, per brief)
CREATE OR REPLACE VIEW v_field_visit_monthly_spend AS
SELECT
    d.name AS department_name,
    DATE_TRUNC('month', fvr.visit_date)::DATE AS month,
    COUNT(*) AS visit_count,
    SUM(fvr.total_allowance_npr) AS total_spend_npr,
    fvr.company_id
FROM field_visit_requests fvr
JOIN employees e ON fvr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE fvr.status IN ('approved_manager','approved_finance') AND NOT fvr.is_deleted
GROUP BY d.name, DATE_TRUNC('month', fvr.visit_date), fvr.company_id;
