-- ============================================================
--  eLogix HRMS — Attendance & Payroll Reports Schema
--  Duty Roster · Monthly Attendance · Leave Balance
--  Absent/Present Report · Digital Signatures
--  eLogix Technologies · www.elogix.com.np
--  Nepal Labour Act 2074 Compliant
--  Run: psql -U elogix_user -d elogix_hrms -f attendance_reports_schema.sql
-- ============================================================

-- ── ENUMS ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE shift_code AS ENUM (
    'M','D','E','N','W','PH','L',
    'CL','EL','SL','ML','PL','BL','CWL','HD',
    'A','OT','WFH','ND','R','S'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sig_role AS ENUM ('prepared','verified','approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('draft','submitted','finalised','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════
--  DIGITAL SIGNATURES  (shared across all 4 report types)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS digital_signatures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    report_type     VARCHAR(50)  NOT NULL,   -- duty_roster|monthly_attendance|leave_balance|absent_present
    report_ref      VARCHAR(100) NOT NULL,   -- e.g. "2026-07_IT" or roster UUID
    role            sig_role     NOT NULL,

    -- Signatory
    signer_id       UUID,                    -- company_users.id
    signer_name     VARCHAR(200) NOT NULL,
    designation     VARCHAR(150) NOT NULL,
    signed_at       TIMESTAMPTZ,
    signed_date     DATE,                    -- date chosen by signatory
    ip_address      VARCHAR(45),

    -- Status
    is_signed       BOOLEAN DEFAULT FALSE,
    revoked         BOOLEAN DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ,
    revoked_by      VARCHAR(200),
    revoke_reason   TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_sig_company_report_role
        UNIQUE (company_id, report_type, report_ref, role)
);

CREATE INDEX IF NOT EXISTS idx_sig_company_report
    ON digital_signatures(company_id, report_type, report_ref);

COMMENT ON TABLE digital_signatures IS
    'Digital signatures for eLogix reports. One prepared+verified+approved per report. Immutable once locked.';

-- Prevent modifying a signed+locked signature
CREATE OR REPLACE FUNCTION fn_protect_signature()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_signed = TRUE AND OLD.revoked = FALSE
       AND NEW.signer_name != OLD.signer_name THEN
        RAISE EXCEPTION 'Cannot modify a signed eLogix signature. Revoke first.';
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_sig ON digital_signatures;
CREATE TRIGGER trg_protect_sig
    BEFORE UPDATE ON digital_signatures
    FOR EACH ROW EXECUTE FUNCTION fn_protect_signature();


-- ══════════════════════════════════════════════════════════════
--  DUTY ROSTER  — header
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS duty_rosters (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department   VARCHAR(150) NOT NULL,
    unit_ward    VARCHAR(150),
    period_type  VARCHAR(30)  DEFAULT 'Monthly',  -- Daily|Weekly|Bi-Monthly|Monthly
    roster_month VARCHAR(7)   NOT NULL,            -- "2026-07"
    date_from    DATE NOT NULL,
    date_to      DATE NOT NULL,
    status       report_status DEFAULT 'draft',
    is_locked    BOOLEAN DEFAULT FALSE,
    locked_at    TIMESTAMPTZ,
    created_by   UUID,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_roster_dept_month
        UNIQUE (company_id, department, roster_month)
);

CREATE INDEX IF NOT EXISTS idx_roster_company_month
    ON duty_rosters(company_id, roster_month);
CREATE INDEX IF NOT EXISTS idx_roster_company_dept
    ON duty_rosters(company_id, department);

COMMENT ON TABLE duty_rosters IS
    'Duty Roster header. Each row = one department × one month. Night shift cells rendered dark indigo.';


-- ── DUTY ROSTER ENTRIES  (one row per employee per day) ───────
CREATE TABLE IF NOT EXISTS duty_roster_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roster_id    UUID NOT NULL REFERENCES duty_rosters(id) ON DELETE CASCADE,
    company_id   UUID NOT NULL,
    emp_id       VARCHAR(50)  NOT NULL,
    emp_name     VARCHAR(200) NOT NULL,
    designation  VARCHAR(150),
    department   VARCHAR(150),
    roster_date  DATE NOT NULL,
    shift_code   shift_code NOT NULL DEFAULT 'D',
    is_night     BOOLEAN DEFAULT FALSE,  -- TRUE when shift_code IN ('N','ND')
    remarks      VARCHAR(300),
    created_at   TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_roster_entry_emp_date
        UNIQUE (roster_id, emp_id, roster_date)
);

CREATE INDEX IF NOT EXISTS idx_roster_entry_date
    ON duty_roster_entries(roster_id, roster_date);
CREATE INDEX IF NOT EXISTS idx_roster_entry_emp
    ON duty_roster_entries(emp_id, roster_date);
CREATE INDEX IF NOT EXISTS idx_roster_entry_night
    ON duty_roster_entries(is_night) WHERE is_night = TRUE;

COMMENT ON COLUMN duty_roster_entries.is_night IS
    'True = Night Duty. Frontend renders with dark indigo #1e1b4b background.';
COMMENT ON COLUMN duty_roster_entries.shift_code IS
    'M=Morning D=Day E=Evening N=Night W=WeeklyOff PH=PublicHoliday CL=Casual EL=Earned SL=Sick ML=Maternity BL=Bereavement CWL=ChildWelfare HD=HalfDay A=Absent ND=NightDuty OT=Overtime WFH=WorkFromHome';


-- Auto-set is_night based on shift_code
CREATE OR REPLACE FUNCTION fn_roster_entry_night()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_night := NEW.shift_code IN ('N','ND');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roster_night ON duty_roster_entries;
CREATE TRIGGER trg_roster_night
    BEFORE INSERT OR UPDATE ON duty_roster_entries
    FOR EACH ROW EXECUTE FUNCTION fn_roster_entry_night();


-- ══════════════════════════════════════════════════════════════
--  MONTHLY ATTENDANCE REGISTER  (payroll-linked)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS monthly_attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    emp_id          VARCHAR(50)  NOT NULL,
    emp_name        VARCHAR(200) NOT NULL,
    designation     VARCHAR(150),
    department      VARCHAR(150),
    att_month       VARCHAR(7)   NOT NULL,      -- "2026-07"

    -- Day counts
    working_days    SMALLINT DEFAULT 0,
    present_days    SMALLINT DEFAULT 0,
    absent_days     SMALLINT DEFAULT 0,
    leave_days      SMALLINT DEFAULT 0,
    night_duty_days SMALLINT DEFAULT 0,
    weekly_off_days SMALLINT DEFAULT 0,
    holiday_days    SMALLINT DEFAULT 0,
    half_days       SMALLINT DEFAULT 0,
    wfh_days        SMALLINT DEFAULT 0,

    -- Nepal Labour Act 2074 Payroll fields
    basic_salary    NUMERIC(12,2) DEFAULT 0,
    daily_rate      NUMERIC(10,2) DEFAULT 0,   -- basic / working_days
    lop_days        NUMERIC(5,2)  DEFAULT 0,   -- Loss-of-Pay (absent days)
    lop_amount      NUMERIC(12,2) DEFAULT 0,   -- daily_rate × lop_days
    night_allowance NUMERIC(12,2) DEFAULT 0,
    ot_amount       NUMERIC(12,2) DEFAULT 0,
    net_salary      NUMERIC(12,2) DEFAULT 0,   -- basic − lop + night_allow + ot

    -- Payroll sync
    status          report_status DEFAULT 'draft',
    payroll_ref     VARCHAR(100),               -- "PR-2026-07-DEPT-XXXX"
    payroll_synced  BOOLEAN DEFAULT FALSE,
    payroll_synced_at TIMESTAMPTZ,
    is_locked       BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_monthly_att_emp_month
        UNIQUE (company_id, emp_id, att_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_att_month
    ON monthly_attendance(company_id, att_month);
CREATE INDEX IF NOT EXISTS idx_monthly_att_dept
    ON monthly_attendance(company_id, department, att_month);
CREATE INDEX IF NOT EXISTS idx_monthly_att_payroll
    ON monthly_attendance(company_id, payroll_synced, att_month);

COMMENT ON TABLE monthly_attendance IS
    'Monthly attendance register — auto-generated by eLogix HRMS. Payroll-linked. Net Salary = Basic − LOP (Nepal LA2074). Locked after 3 digital signatures + payroll sync.';
COMMENT ON COLUMN monthly_attendance.lop_days IS
    'Loss-of-Pay days. Equals absent_days by default. Can be manually adjusted by HR.';
COMMENT ON COLUMN monthly_attendance.daily_rate IS
    'Basic Salary ÷ Working Days. Nepal LA2074 uses 22 or actual working days.';

-- Auto-calculate payroll fields on insert/update
CREATE OR REPLACE FUNCTION fn_monthly_att_payroll()
RETURNS TRIGGER AS $$
BEGIN
    -- Compute daily rate
    IF NEW.working_days > 0 AND NEW.basic_salary > 0 THEN
        NEW.daily_rate := ROUND(NEW.basic_salary / NEW.working_days::NUMERIC, 2);
        NEW.lop_amount := ROUND(NEW.daily_rate * NEW.lop_days, 2);
        NEW.net_salary := ROUND(
            NEW.basic_salary
            - NEW.lop_amount
            + COALESCE(NEW.night_allowance, 0)
            + COALESCE(NEW.ot_amount, 0),
        2);
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monthly_att_payroll ON monthly_attendance;
CREATE TRIGGER trg_monthly_att_payroll
    BEFORE INSERT OR UPDATE OF basic_salary, lop_days, working_days,
                                 night_allowance, ot_amount
    ON monthly_attendance
    FOR EACH ROW EXECUTE FUNCTION fn_monthly_att_payroll();

-- Prevent editing locked records
CREATE OR REPLACE FUNCTION fn_monthly_att_lock_check()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_locked = TRUE AND OLD.payroll_synced = TRUE THEN
        RAISE EXCEPTION 'Cannot modify locked & payroll-synced attendance record. Contact HR Manager.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monthly_lock_check ON monthly_attendance;
CREATE TRIGGER trg_monthly_lock_check
    BEFORE UPDATE ON monthly_attendance
    FOR EACH ROW EXECUTE FUNCTION fn_monthly_att_lock_check();


-- ── ATTENDANCE DAY ENTRIES  (the detailed daily grid) ─────────
CREATE TABLE IF NOT EXISTS attendance_day_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL,
    monthly_id   UUID REFERENCES monthly_attendance(id) ON DELETE SET NULL,
    emp_id       VARCHAR(50)  NOT NULL,
    dept         VARCHAR(150),
    entry_date   DATE NOT NULL,
    day_of_week  VARCHAR(10),

    att_code     shift_code NOT NULL DEFAULT 'P',
    -- Presence proof (🟢 = has_log TRUE, 🔴 = has_log FALSE)
    login_time   VARCHAR(8),     -- "08:45" HH:MM
    logout_time  VARCHAR(8),     -- "17:32"
    net_hours    NUMERIC(5,2),
    has_log      BOOLEAN DEFAULT FALSE,   -- biometric/web-checkin record exists

    remarks      VARCHAR(300),
    created_at   TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_day_entry_emp_date
        UNIQUE (company_id, emp_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_day_entry_emp
    ON attendance_day_entries(company_id, emp_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_day_entry_date
    ON attendance_day_entries(company_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_day_entry_dept_date
    ON attendance_day_entries(company_id, dept, entry_date);
CREATE INDEX IF NOT EXISTS idx_day_entry_code
    ON attendance_day_entries(att_code, entry_date);
CREATE INDEX IF NOT EXISTS idx_day_entry_no_log
    ON attendance_day_entries(has_log) WHERE has_log = FALSE;

COMMENT ON COLUMN attendance_day_entries.has_log IS
    'TRUE = 🟢 Login/logout record exists (biometric/web). FALSE = 🔴 No log = absent or untracked.';
COMMENT ON COLUMN attendance_day_entries.att_code IS
    'Colour-coded: P=Green, A=Red, N/ND=DarkIndigo, CL=Orange, EL=Emerald, SL=Blue, ML=Purple, BL=Slate, CWL=Yellow, HD=Rose, W=SkyBlue, PH=Pink, WFH=Cyan, OT=Amber';

-- Auto-compute has_log and net_hours
CREATE OR REPLACE FUNCTION fn_day_entry_calc()
RETURNS TRIGGER AS $$
DECLARE
    start_mins INTEGER;
    end_mins   INTEGER;
BEGIN
    NEW.has_log := NEW.login_time IS NOT NULL;
    IF NEW.login_time IS NOT NULL AND NEW.logout_time IS NOT NULL THEN
        start_mins := EXTRACT(HOUR FROM NEW.login_time::TIME)*60
                    + EXTRACT(MINUTE FROM NEW.login_time::TIME);
        end_mins   := EXTRACT(HOUR FROM NEW.logout_time::TIME)*60
                    + EXTRACT(MINUTE FROM NEW.logout_time::TIME);
        IF end_mins > start_mins THEN
            NEW.net_hours := ROUND((end_mins - start_mins)::NUMERIC / 60, 2);
        END IF;
    END IF;
    NEW.day_of_week := TO_CHAR(NEW.entry_date,'Dy');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_day_entry_calc ON attendance_day_entries;
CREATE TRIGGER trg_day_entry_calc
    BEFORE INSERT OR UPDATE ON attendance_day_entries
    FOR EACH ROW EXECUTE FUNCTION fn_day_entry_calc();


-- ══════════════════════════════════════════════════════════════
--  LEAVE BALANCE REPORT
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leave_balances (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    emp_id        VARCHAR(50)  NOT NULL,
    emp_name      VARCHAR(200) NOT NULL,
    designation   VARCHAR(150),
    department    VARCHAR(150),
    leave_year    VARCHAR(7)   NOT NULL,    -- "2025-2026" or "2026-07"
    att_month     VARCHAR(7),              -- null for full-year balance
    days_attended SMALLINT DEFAULT 0,

    -- CL — Casual Leave (Orange #f97316) — Nepal LA2074: 6–12 days
    cl_entitled  NUMERIC(5,2) DEFAULT 12,
    cl_used      NUMERIC(5,2) DEFAULT 0,
    cl_carry     NUMERIC(5,2) DEFAULT 0,
    cl_available NUMERIC(5,2) DEFAULT 12,

    -- EL — Earned Leave (Emerald #10b981) — Nepal LA2074: 1 day per 20 working days
    el_entitled  NUMERIC(5,2) DEFAULT 18,
    el_used      NUMERIC(5,2) DEFAULT 0,
    el_carry     NUMERIC(5,2) DEFAULT 0,
    el_available NUMERIC(5,2) DEFAULT 18,

    -- SL — Sick Leave (Blue #3b82f6) — Nepal LA2074: 12 days
    sl_entitled  NUMERIC(5,2) DEFAULT 12,
    sl_used      NUMERIC(5,2) DEFAULT 0,
    sl_carry     NUMERIC(5,2) DEFAULT 0,
    sl_available NUMERIC(5,2) DEFAULT 12,

    -- ML — Maternity Leave (Purple #a855f7) — Nepal LA2074: 98 days
    ml_entitled  NUMERIC(5,2) DEFAULT 98,
    ml_used      NUMERIC(5,2) DEFAULT 0,
    ml_carry     NUMERIC(5,2) DEFAULT 0,
    ml_available NUMERIC(5,2) DEFAULT 98,

    -- PL — Paternity Leave (Cyan #0ea5e9) — Nepal LA2074: 15 days
    pl_entitled  NUMERIC(5,2) DEFAULT 15,
    pl_used      NUMERIC(5,2) DEFAULT 0,
    pl_carry     NUMERIC(5,2) DEFAULT 0,
    pl_available NUMERIC(5,2) DEFAULT 15,

    -- BL — Bereavement Leave (Slate #64748b) — Nepal LA2074: 13 days
    bl_entitled  NUMERIC(5,2) DEFAULT 13,
    bl_used      NUMERIC(5,2) DEFAULT 0,
    bl_carry     NUMERIC(5,2) DEFAULT 0,
    bl_available NUMERIC(5,2) DEFAULT 13,

    -- CWL — Child Welfare Leave (Yellow #eab308) — Nepal LA2074: 10 days
    cwl_entitled  NUMERIC(5,2) DEFAULT 10,
    cwl_used      NUMERIC(5,2) DEFAULT 0,
    cwl_carry     NUMERIC(5,2) DEFAULT 0,
    cwl_available NUMERIC(5,2) DEFAULT 10,

    -- HD — Half Day (Rose #f43f5e)
    hd_entitled  NUMERIC(5,2) DEFAULT 6,
    hd_used      NUMERIC(5,2) DEFAULT 0,
    hd_carry     NUMERIC(5,2) DEFAULT 0,
    hd_available NUMERIC(5,2) DEFAULT 6,

    -- Summary
    total_balance NUMERIC(6,2) DEFAULT 0,
    total_used    NUMERIC(6,2) DEFAULT 0,
    remarks       TEXT,

    status        report_status DEFAULT 'draft',
    is_locked     BOOLEAN DEFAULT FALSE,

    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_leave_bal_emp_year_month
        UNIQUE (company_id, emp_id, leave_year, att_month)
);

CREATE INDEX IF NOT EXISTS idx_leave_bal_dept_year
    ON leave_balances(company_id, department, leave_year);
CREATE INDEX IF NOT EXISTS idx_leave_bal_emp
    ON leave_balances(company_id, emp_id, leave_year);

COMMENT ON TABLE leave_balances IS
    'Leave balance per employee per year. Each leave type (CL/EL/SL/ML/PL/BL/CWL/HD) has own colour in frontend. Nepal LA2074 entitlements pre-seeded as defaults.';

-- Auto-recalculate totals
CREATE OR REPLACE FUNCTION fn_leave_balance_calc()
RETURNS TRIGGER AS $$
BEGIN
    -- available = entitled + carry - used  (floor at 0)
    NEW.cl_available  := GREATEST(0, NEW.cl_entitled  + NEW.cl_carry  - NEW.cl_used);
    NEW.el_available  := GREATEST(0, NEW.el_entitled  + NEW.el_carry  - NEW.el_used);
    NEW.sl_available  := GREATEST(0, NEW.sl_entitled  + NEW.sl_carry  - NEW.sl_used);
    NEW.ml_available  := GREATEST(0, NEW.ml_entitled  + NEW.ml_carry  - NEW.ml_used);
    NEW.pl_available  := GREATEST(0, NEW.pl_entitled  + NEW.pl_carry  - NEW.pl_used);
    NEW.bl_available  := GREATEST(0, NEW.bl_entitled  + NEW.bl_carry  - NEW.bl_used);
    NEW.cwl_available := GREATEST(0, NEW.cwl_entitled + NEW.cwl_carry - NEW.cwl_used);
    NEW.hd_available  := GREATEST(0, NEW.hd_entitled  + NEW.hd_carry  - NEW.hd_used);
    -- Totals
    NEW.total_used    := COALESCE(NEW.cl_used,0) + COALESCE(NEW.el_used,0) +
                         COALESCE(NEW.sl_used,0) + COALESCE(NEW.ml_used,0) +
                         COALESCE(NEW.pl_used,0) + COALESCE(NEW.bl_used,0) +
                         COALESCE(NEW.cwl_used,0)+ COALESCE(NEW.hd_used,0);
    NEW.total_balance := COALESCE(NEW.cl_available,0) + COALESCE(NEW.el_available,0) +
                         COALESCE(NEW.sl_available,0) + COALESCE(NEW.ml_available,0) +
                         COALESCE(NEW.pl_available,0) + COALESCE(NEW.bl_available,0) +
                         COALESCE(NEW.cwl_available,0)+ COALESCE(NEW.hd_available,0);
    NEW.updated_at    := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leave_balance_calc ON leave_balances;
CREATE TRIGGER trg_leave_balance_calc
    BEFORE INSERT OR UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION fn_leave_balance_calc();


-- ══════════════════════════════════════════════════════════════
--  VIEWS
-- ══════════════════════════════════════════════════════════════

-- Daily present count per dept (for dashboard)
CREATE OR REPLACE VIEW vw_daily_present_summary AS
SELECT
    company_id,
    dept,
    entry_date,
    COUNT(*) FILTER (WHERE att_code='P')  AS present,
    COUNT(*) FILTER (WHERE att_code='A')  AS absent,
    COUNT(*) FILTER (WHERE has_log=TRUE)  AS with_log,
    COUNT(*) FILTER (WHERE has_log=FALSE
                       AND att_code NOT IN ('W','PH')) AS no_log_not_off,
    COUNT(*)                               AS total
FROM attendance_day_entries
GROUP BY company_id, dept, entry_date;

-- Night duty count per employee per month
CREATE OR REPLACE VIEW vw_night_duty_monthly AS
SELECT
    company_id,
    emp_id,
    TO_CHAR(entry_date,'YYYY-MM') AS month,
    COUNT(*) AS night_duty_days
FROM attendance_day_entries
WHERE att_code IN ('N','ND')
GROUP BY company_id, emp_id, TO_CHAR(entry_date,'YYYY-MM');

-- Leave usage summary by type per department
CREATE OR REPLACE VIEW vw_leave_usage_by_dept AS
SELECT
    company_id, department, leave_year,
    ROUND(SUM(cl_used),2)  AS cl_total_used,
    ROUND(SUM(el_used),2)  AS el_total_used,
    ROUND(SUM(sl_used),2)  AS sl_total_used,
    ROUND(SUM(ml_used),2)  AS ml_total_used,
    ROUND(SUM(pl_used),2)  AS pl_total_used,
    ROUND(SUM(bl_used),2)  AS bl_total_used,
    ROUND(SUM(total_used),2) AS dept_total_used,
    ROUND(AVG(total_balance),2) AS avg_balance_remaining
FROM leave_balances
GROUP BY company_id, department, leave_year;

-- Monthly payroll summary per dept
CREATE OR REPLACE VIEW vw_monthly_payroll_summary AS
SELECT
    company_id, department, att_month,
    COUNT(*)                 AS staff_count,
    SUM(present_days)        AS total_present,
    SUM(absent_days)         AS total_absent,
    SUM(night_duty_days)     AS total_night_duty,
    SUM(lop_days)            AS total_lop_days,
    ROUND(SUM(lop_amount),2) AS total_lop_amount,
    ROUND(SUM(basic_salary),2) AS total_basic,
    ROUND(SUM(net_salary),2)   AS total_net_salary,
    COUNT(*) FILTER (WHERE payroll_synced=TRUE) AS synced_count,
    COUNT(*) FILTER (WHERE is_locked=TRUE)      AS locked_count
FROM monthly_attendance
GROUP BY company_id, department, att_month
ORDER BY att_month DESC, total_net_salary DESC;

-- Absent/present report with login proof status
CREATE OR REPLACE VIEW vw_absent_present_with_proof AS
SELECT
    d.company_id, d.emp_id, d.dept,
    d.entry_date, d.day_of_week, d.att_code,
    d.has_log,
    d.login_time, d.logout_time, d.net_hours,
    CASE
        WHEN d.att_code = 'P' AND d.has_log = TRUE  THEN 'green'   -- present + log
        WHEN d.att_code = 'P' AND d.has_log = FALSE THEN 'yellow'  -- present but no log
        WHEN d.att_code = 'A'                        THEN 'red'
        WHEN d.att_code IN ('N','ND')                THEN 'indigo'  -- night duty
        WHEN d.att_code = 'W'                        THEN 'sky'
        ELSE 'colour_coded'
    END AS colour_class
FROM attendance_day_entries d;

\echo '✅ eLogix HRMS Attendance & Payroll Reports schema applied!'
\echo '    Tables:   digital_signatures, duty_rosters, duty_roster_entries,'
\echo '              monthly_attendance, attendance_day_entries, leave_balances'
\echo '    Triggers: auto payroll calc, lock protection, night flag, has_log, day_of_week'
\echo '    Views:    daily_present_summary, night_duty_monthly, leave_usage_by_dept,'
\echo '              monthly_payroll_summary, absent_present_with_proof'
