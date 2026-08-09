-- ============================================================
-- FILE: database/schemas/workforce_config_schema.sql
-- NepHR Pro — Workforce Configuration Schema
-- Covers: Vendor & Outsource Mapping, Shift Setup,
--         Holiday Calendar, Weekend Policy
-- Nepal Labour Act 2074 compliant | PostgreSQL 15+
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SHIFT TYPES
-- Nepal Labour Act 2074:
--   Section 28: Max 8 hrs/day, 48 hrs/week
--   Section 30: OT = 1.5x rate
--   Section 32: Night shift premium mandatory
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_types (
    id                      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              UUID         NOT NULL,

    code                    VARCHAR(20)  NOT NULL,
    name                    VARCHAR(100) NOT NULL,
    name_nepali             VARCHAR(100),
    type                    VARCHAR(20)  NOT NULL
                            CHECK (type IN ('day','morning','evening','night',
                              'rotational','flexible','split','custom')),
    description             TEXT,
    icon                    VARCHAR(10)  DEFAULT '⏰',
    color                   VARCHAR(7)   DEFAULT '#64748b',

    -- Time Configuration
    start_time              TIME         NOT NULL DEFAULT '09:00',
    end_time                TIME         NOT NULL DEFAULT '18:00',
    working_hours           NUMERIC(4,1) NOT NULL DEFAULT 8.0
                            CHECK (working_hours > 0 AND working_hours <= 8),  -- LA2074 S.28
    break_minutes           INT          DEFAULT 60,
    grace_minutes           INT          DEFAULT 15,   -- Clock-in tolerance

    -- Compensation
    allowance_npr           NUMERIC(10,2) DEFAULT 0,   -- Daily allowance
    night_premium_pct       NUMERIC(5,2)  DEFAULT 0,   -- % extra for night (LA2074 S.32)
    weekend_ot_multiplier   NUMERIC(4,2)  DEFAULT 1.5, -- OT multiplier (LA2074 S.30)
    holiday_ot_multiplier   NUMERIC(4,2)  DEFAULT 2.0,

    -- Assignment
    dept_count              INT          DEFAULT 0,
    emp_count               INT          DEFAULT 0,

    -- Nepal Law Reference
    la_note                 TEXT,

    status                  VARCHAR(20)  DEFAULT 'active',
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW(),
    created_by              UUID,
    is_deleted              BOOLEAN      DEFAULT FALSE,

    UNIQUE (company_id, code),
    CHECK (working_hours <= 8)  -- Maximum 8 hrs standard per LA2074
);

-- ============================================================
-- HOLIDAY CALENDAR
-- Centralized master with branch-level inheritance
-- Nepal Public Holidays + Optional/Floating holidays
-- ============================================================
CREATE TABLE IF NOT EXISTS holiday_calendar (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID         NOT NULL,

    name            VARCHAR(200) NOT NULL,
    name_nepali     VARCHAR(200),
    date_bs         VARCHAR(15),       -- Bikram Sambat e.g. 2081-09-27
    date_ad         DATE         NOT NULL,
    year_bs         VARCHAR(7),        -- 2081 for BS filtering
    month_bs        VARCHAR(3),        -- 09 for BS month filtering

    type            VARCHAR(20)  NOT NULL DEFAULT 'statutory'
                    CHECK (type IN ('statutory','cultural','optional','floating','restricted')),
    category        VARCHAR(30)  DEFAULT 'national'
                    CHECK (category IN ('national','religious','international','major_festival','regional')),

    region          VARCHAR(100) DEFAULT 'Nepal',
    applicable_to   VARCHAR(50)  DEFAULT 'all',
    -- all | women | ktm | branch_specific | optional_pool

    -- Entitlement
    is_paid         BOOLEAN      DEFAULT TRUE,
    is_optional     BOOLEAN      DEFAULT FALSE,   -- Floating/optional holidays

    -- Display
    color           VARCHAR(7)   DEFAULT '#dc2626',

    -- Payroll/Leave impact
    payroll_impact  BOOLEAN      DEFAULT TRUE,
    leave_encashable BOOLEAN     DEFAULT FALSE,

    -- AI auto-import flag (from external holiday API)
    ai_imported     BOOLEAN      DEFAULT FALSE,
    ai_imported_at  TIMESTAMPTZ,
    source          VARCHAR(100) DEFAULT 'manual',

    notes           TEXT,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),
    created_by      UUID,
    is_deleted      BOOLEAN      DEFAULT FALSE
);

-- ============================================================
-- WEEKEND POLICY
-- Nepal Labour Act 2074:
--   Section 26: At least 1 weekly rest day mandatory
--   Section 28: Standard workweek = 48 hrs
-- ============================================================
CREATE TABLE IF NOT EXISTS weekend_policies (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id           UUID         NOT NULL,

    code                 VARCHAR(20)  NOT NULL,
    name                 VARCHAR(100) NOT NULL,
    name_nepali          VARCHAR(100),
    country              VARCHAR(100) DEFAULT 'Nepal',
    region               VARCHAR(100),

    -- Workweek definition (0=Sun, 1=Mon, ..., 6=Sat)
    work_days            JSONB        NOT NULL DEFAULT '[1,2,3,4,5]',
    weekend_days         JSONB        NOT NULL DEFAULT '[0,6]',
    half_day_days        JSONB        DEFAULT '[]',

    -- OT rates when working on off days
    ot_rate_saturday     NUMERIC(4,2) DEFAULT 1.5,   -- LA2074 minimum
    ot_rate_sunday       NUMERIC(4,2) DEFAULT 2.0,
    ot_rate_holiday      NUMERIC(4,2) DEFAULT 2.0,

    -- Assignment
    is_default           BOOLEAN      DEFAULT FALSE,
    assigned_branches    TEXT[]       DEFAULT '{}',
    emp_count            INT          DEFAULT 0,

    -- Nepal Law note
    la_note              TEXT,
    color                VARCHAR(7)   DEFAULT '#1e40af',

    status               VARCHAR(20)  DEFAULT 'active',
    created_at           TIMESTAMPTZ  DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  DEFAULT NOW(),
    created_by           UUID,
    is_deleted           BOOLEAN      DEFAULT FALSE,

    UNIQUE (company_id, code),
    -- Nepal law: at least 1 rest day
    CONSTRAINT ck_wp_min_rest CHECK (jsonb_array_length(weekend_days) >= 1)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_shift_company   ON shift_types(company_id)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_shift_type      ON shift_types(type);
CREATE INDEX IF NOT EXISTS idx_shift_status    ON shift_types(status)            WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_hol_company     ON holiday_calendar(company_id)   WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_hol_date_ad     ON holiday_calendar(date_ad);
CREATE INDEX IF NOT EXISTS idx_hol_year_bs     ON holiday_calendar(company_id, year_bs);
CREATE INDEX IF NOT EXISTS idx_hol_type        ON holiday_calendar(type);
CREATE INDEX IF NOT EXISTS idx_hol_optional    ON holiday_calendar(is_optional)  WHERE is_optional;

CREATE INDEX IF NOT EXISTS idx_wp_company      ON weekend_policies(company_id)   WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_wp_default      ON weekend_policies(is_default)   WHERE is_default;
CREATE INDEX IF NOT EXISTS idx_wp_country      ON weekend_policies(country);

-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION fn_wfc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['shift_types','holiday_calendar','weekend_policies'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_wfc_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Trigger: enforce LA2074 night shift premium
CREATE OR REPLACE FUNCTION fn_shift_la2074_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Night shift must have premium
    IF NEW.type = 'night' AND (NEW.night_premium_pct IS NULL OR NEW.night_premium_pct <= 0) THEN
        RAISE EXCEPTION 'Night shift requires a premium percentage per Nepal Labour Act 2074 Section 32.';
    END IF;
    -- Max 8 hrs standard (enforcement)
    IF NEW.working_hours > 8 THEN
        RAISE EXCEPTION 'Standard shift cannot exceed 8 hours per Labour Act 2074 Section 28. Set OT for extra hours.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_shift_la2074
    BEFORE INSERT OR UPDATE ON shift_types
    FOR EACH ROW EXECUTE FUNCTION fn_shift_la2074_check();

-- Trigger: enforce weekend policy min 1 rest day
CREATE OR REPLACE FUNCTION fn_wp_la2074_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF jsonb_array_length(NEW.weekend_days) < 1 THEN
        RAISE EXCEPTION 'At least one weekly rest day is mandatory per Nepal Labour Act 2074 Section 26.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_wp_la2074
    BEFORE INSERT OR UPDATE ON weekend_policies
    FOR EACH ROW EXECUTE FUNCTION fn_wp_la2074_check();

-- ============================================================
-- SEED DATA — Nepal Standard Shift Types
-- ============================================================
INSERT INTO shift_types (company_id, code, name, name_nepali, type,
  start_time, end_time, working_hours, break_minutes, grace_minutes,
  allowance_npr, night_premium_pct, weekend_ot_multiplier, color, icon, la_note, status)
VALUES
  (NULL,'GEN',  'General Shift','साधारण सिफ्ट','day','09:00','18:00',8,60,15,0,0,1.5,'#3b82f6','☀','Standard office hours. Most departments.','active'),
  (NULL,'MORN', 'Morning Shift','बिहान सिफ्ट','morning','06:00','14:00',8,30,10,500,0,1.5,'#f59e0b','🌅','Early shift. Security & operations.','active'),
  (NULL,'EVE',  'Evening Shift','साँझ सिफ्ट','evening','14:00','22:00',8,30,10,800,0,1.5,'#8b5cf6','🌆','Evening operations.','active'),
  (NULL,'NIGHT','Night Shift','रात सिफ्ट','night','22:00','06:00',8,30,15,1500,25,2.0,'#1e40af','🌙','Section 32: Night premium 25% mandatory.','active'),
  (NULL,'FLEX', 'Flexible Shift','लचिलो सिफ्ट','flexible','10:00','16:00',8,60,0,0,0,1.5,'#06b6d4','⏰','Core hours 10-16. Remote-friendly.','active')
ON CONFLICT (company_id, code) DO NOTHING;

-- ============================================================
-- SEED DATA — Nepal 2081/82 BS Public Holidays
-- ============================================================
INSERT INTO holiday_calendar (company_id, name, name_nepali, date_bs, date_ad, type, category, region, is_paid, is_optional, color, year_bs, month_bs, source)
VALUES
  (NULL,'Prithvi Narayan Shah Jayanti','पृथ्वी नारायण शाह जयन्ती','2081-09-27','2025-01-10','statutory','national','Nepal',TRUE,FALSE,'#dc2626','2081','09','nepal_govt'),
  (NULL,'Martyrs Day','शहिद दिवस','2081-10-16','2025-01-30','statutory','national','Nepal',TRUE,FALSE,'#dc2626','2081','10','nepal_govt'),
  (NULL,'Democracy Day','प्रजातन्त्र दिवस','2081-11-07','2025-02-19','statutory','national','Nepal',TRUE,FALSE,'#dc2626','2081','11','nepal_govt'),
  (NULL,'International Women Day','अन्तर्राष्ट्रिय महिला दिवस','2081-11-24','2025-03-08','statutory','international','Nepal',TRUE,FALSE,'#8b5cf6','2081','11','nepal_govt'),
  (NULL,'Nepali New Year','नयाँ वर्ष','2082-01-01','2025-04-14','statutory','national','Nepal',TRUE,FALSE,'#dc2626','2082','01','nepal_govt'),
  (NULL,'International Labour Day','श्रमिक दिवस','2082-01-18','2025-05-01','statutory','international','Nepal',TRUE,FALSE,'#3b82f6','2082','01','nepal_govt'),
  (NULL,'Republic Day','गणतन्त्र दिवस','2082-01-15','2025-04-28','statutory','national','Nepal',TRUE,FALSE,'#dc2626','2082','01','nepal_govt'),
  (NULL,'Vijaya Dashami','विजया दशमी','2082-06-18','2025-10-01','statutory','major_festival','Nepal',TRUE,FALSE,'#dc2626','2082','06','nepal_govt'),
  (NULL,'Laxmi Puja / Deepawali','लक्ष्मी पूजा','2082-07-05','2025-10-18','statutory','major_festival','Nepal',TRUE,FALSE,'#dc2626','2082','07','nepal_govt'),
  (NULL,'Bhai Tika','भाइटीका','2082-07-07','2025-10-20','statutory','major_festival','Nepal',TRUE,FALSE,'#dc2626','2082','07','nepal_govt'),
  (NULL,'Constitution Day','संविधान दिवस','2082-06-03','2025-09-19','statutory','national','Nepal',TRUE,FALSE,'#dc2626','2082','06','nepal_govt'),
  (NULL,'Christmas','क्रिसमस','2082-09-10','2025-12-25','optional','religious','Global',FALSE,TRUE,'#10b981','2082','09','manual')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA — Nepal Standard Weekend Policies
-- ============================================================
INSERT INTO weekend_policies (company_id, code, name, name_nepali, country, region,
  work_days, weekend_days, ot_rate_saturday, ot_rate_sunday, is_default, la_note, color)
VALUES
  (NULL,'NPL-STD','Nepal Standard (5-Day)','नेपाल मानक (५ दिन)','Nepal','All',
   '[1,2,3,4,5]','[0,6]',1.5,2.0,TRUE,
   'Labour Act 2074 Section 26: Min 1 rest day/week. Section 28: 48 hrs/week max.','#1e40af'),
  (NULL,'GULF-FRI','Gulf Region (Fri-Sat Weekend)','खाडी क्षेत्र','UAE/Qatar','Gulf',
   '[0,1,2,3,4]','[5,6]',1.5,1.5,FALSE,
   'UAE/Qatar Labour Law: Friday-Saturday weekend.','#059669'),
  (NULL,'6DAY','6-Day Work Week','६ दिन कार्य सप्ताह','Nepal','Manufacturing',
   '[0,1,2,3,4,5]','[6]',1.5,2.0,FALSE,
   'Max 48 hrs/week. Saturday = extra work day at 1.5x OT.','#7c3aed')
ON CONFLICT (company_id, code) DO NOTHING;

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW v_shift_coverage AS
SELECT
    s.code, s.name, s.type, s.start_time, s.end_time,
    s.working_hours, s.allowance_npr, s.night_premium_pct,
    s.emp_count, s.dept_count,
    ROUND(s.emp_count::NUMERIC / NULLIF(SUM(s.emp_count) OVER (), 0) * 100, 1) AS coverage_pct,
    s.la_note
FROM shift_types s
WHERE NOT s.is_deleted AND s.status = 'active'
ORDER BY s.type, s.start_time;

CREATE OR REPLACE VIEW v_holiday_count_by_month AS
SELECT
    year_bs, month_bs,
    COUNT(*)                                   AS total_holidays,
    COUNT(*) FILTER (WHERE type = 'statutory') AS statutory,
    COUNT(*) FILTER (WHERE type = 'cultural')  AS cultural,
    COUNT(*) FILTER (WHERE is_optional)        AS optional
FROM holiday_calendar
WHERE NOT is_deleted
GROUP BY year_bs, month_bs
ORDER BY year_bs, month_bs;

CREATE OR REPLACE VIEW v_weekend_policy_coverage AS
SELECT
    wp.code, wp.name, wp.country, wp.region,
    jsonb_array_length(wp.work_days)    AS work_days_count,
    jsonb_array_length(wp.weekend_days) AS rest_days_count,
    jsonb_array_length(wp.work_days) * 8 AS std_hrs_per_week,
    wp.ot_rate_saturday, wp.ot_rate_sunday,
    wp.is_default, wp.emp_count,
    array_length(wp.assigned_branches, 1) AS branches_assigned
FROM weekend_policies wp
WHERE NOT wp.is_deleted
ORDER BY wp.is_default DESC, wp.emp_count DESC;
