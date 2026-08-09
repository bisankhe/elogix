-- ============================================================
--  NepHR Pro — Daily Attendance Log + Overtime Log Schema
--  Nepal Labour Act 2074 compliant
--  Run: psql -U postgres -d nephr_pro -f attendance_log_schema.sql
-- ============================================================

DO $$ BEGIN
  CREATE TYPE ot_status AS ENUM ('pending','processing','approved','rejected','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS attendance_logs (
    id               SERIAL PRIMARY KEY,
    sl_no            INTEGER,
    log_date         DATE NOT NULL,
    emp_id           VARCHAR(30)  NOT NULL,
    emp_name         VARCHAR(200) NOT NULL,
    department       VARCHAR(100),
    designation      VARCHAR(100),
    shift            VARCHAR(50)  DEFAULT 'Day',
    emp_status       VARCHAR(50)  DEFAULT 'Permanent',
    login1           VARCHAR(8),
    logout1          VARCHAR(8),
    session1_hrs     NUMERIC(5,2) DEFAULT 0,
    login2           VARCHAR(8),
    logout2          VARCHAR(8),
    session2_hrs     NUMERIC(5,2) DEFAULT 0,
    hrs_worked       NUMERIC(5,2) DEFAULT 0,
    lunch_in         VARCHAR(8),
    lunch_out        VARCHAR(8),
    lunch_hrs        NUMERIC(4,2) DEFAULT 0,
    break_in1        VARCHAR(8),
    break_out1       VARCHAR(8),
    break1_hrs       NUMERIC(4,2) DEFAULT 0,
    break_in2        VARCHAR(8),
    break_out2       VARCHAR(8),
    break2_hrs       NUMERIC(4,2) DEFAULT 0,
    total_breaks     NUMERIC(5,2) DEFAULT 0,
    net_hrs_worked   NUMERIC(5,2) DEFAULT 0,
    is_present       BOOLEAN DEFAULT TRUE,
    is_late          BOOLEAN DEFAULT FALSE,
    is_early_depart  BOOLEAN DEFAULT FALSE,
    is_half_day      BOOLEAN DEFAULT FALSE,
    notes            TEXT,
    created_by       INTEGER REFERENCES users(id),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
);

COMMENT ON TABLE attendance_logs IS 'Daily employee log: dual sessions + lunch + breaks. Mirrors Excel Daily_Attendance_Log.xls. net_hrs_worked feeds payroll LOP.';

CREATE OR REPLACE FUNCTION fn_attendance_sl_no()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(sl_no), 0) + 1 INTO NEW.sl_no
  FROM attendance_logs WHERE log_date = NEW.log_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_sl_no ON attendance_logs;
CREATE TRIGGER trg_attendance_sl_no
  BEFORE INSERT ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_sl_no();

CREATE OR REPLACE FUNCTION fn_attendance_calc()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hrs_worked    := COALESCE(NEW.session1_hrs,0) + COALESCE(NEW.session2_hrs,0);
  NEW.total_breaks  := COALESCE(NEW.lunch_hrs,0) + COALESCE(NEW.break1_hrs,0) + COALESCE(NEW.break2_hrs,0);
  NEW.net_hrs_worked:= GREATEST(0, NEW.hrs_worked - NEW.total_breaks);
  IF NEW.login1 IS NOT NULL THEN NEW.is_late := NEW.login1 > '09:00'; END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_calc ON attendance_logs;
CREATE TRIGGER trg_attendance_calc
  BEFORE INSERT OR UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_calc();

CREATE TABLE IF NOT EXISTS overtime_logs (
    id                SERIAL PRIMARY KEY,
    ot_date           DATE NOT NULL,
    emp_id            VARCHAR(30)  NOT NULL,
    emp_name          VARCHAR(200) NOT NULL,
    department        VARCHAR(100),
    designation       VARCHAR(100),
    shift             VARCHAR(50)  DEFAULT 'Day',
    attendance_log_id INTEGER REFERENCES attendance_logs(id) ON DELETE SET NULL,
    login1            VARCHAR(8),
    logout1           VARCHAR(8),
    login2            VARCHAR(8),
    logout2           VARCHAR(8),
    regular_hrs       NUMERIC(5,2) DEFAULT 0,
    ot_start          VARCHAR(8)   NOT NULL,
    ot_end            VARCHAR(8)   NOT NULL,
    ot_hrs            NUMERIC(5,2) NOT NULL,
    ot_type           VARCHAR(50)  DEFAULT 'Weekday OT',
    ot_rate           VARCHAR(10)  DEFAULT '1.5x',
    base_salary       NUMERIC(12,2),
    hourly_rate       NUMERIC(10,2),
    rate_multiplier   NUMERIC(4,2) DEFAULT 1.5,
    ot_pay            NUMERIC(12,2),
    total_pay         NUMERIC(12,2),
    status            ot_status    DEFAULT 'pending',
    processed_by      VARCHAR(150),
    processed_role    VARCHAR(100),
    processed_at      TIMESTAMPTZ,
    approved_by       VARCHAR(150),
    approved_role     VARCHAR(100),
    approved_at       TIMESTAMPTZ,
    rejection_reason  TEXT,
    payroll_period    VARCHAR(20),
    payroll_synced    BOOLEAN DEFAULT FALSE,
    payroll_ref       VARCHAR(100),
    remarks           TEXT,
    created_by        INTEGER REFERENCES users(id),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ
);

COMMENT ON TABLE overtime_logs IS 'OT records: auto pay calc + 3-level approval. Nepal LA2074: OT = Basic/(22x8) x hrs x multiplier. Feeds payroll monthly run.';

CREATE OR REPLACE FUNCTION fn_overtime_calc()
RETURNS TRIGGER AS $$
DECLARE
  sh INTEGER; sm INTEGER; eh INTEGER; em INTEGER;
  mult NUMERIC;
BEGIN
  sh := EXTRACT(HOUR   FROM NEW.ot_start::TIME)::INTEGER;
  sm := EXTRACT(MINUTE FROM NEW.ot_start::TIME)::INTEGER;
  eh := EXTRACT(HOUR   FROM NEW.ot_end::TIME)::INTEGER;
  em := EXTRACT(MINUTE FROM NEW.ot_end::TIME)::INTEGER;
  NEW.ot_hrs := GREATEST(0, ((eh*60+em) - (sh*60+sm)) / 60.0);
  mult := CASE NEW.ot_rate
    WHEN '1.0x' THEN 1.0 WHEN '1.5x' THEN 1.5
    WHEN '2.0x' THEN 2.0 WHEN '2.5x' THEN 2.5
    WHEN '3.0x' THEN 3.0 ELSE 1.5 END;
  NEW.rate_multiplier := mult;
  IF NEW.base_salary IS NOT NULL AND NEW.base_salary > 0 THEN
    NEW.hourly_rate := ROUND(NEW.base_salary / 22.0 / 8.0, 2);
    NEW.ot_pay      := ROUND(NEW.ot_hrs * NEW.hourly_rate * mult, 0);
    NEW.total_pay   := NEW.ot_pay;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_overtime_calc ON overtime_logs;
CREATE TRIGGER trg_overtime_calc
  BEFORE INSERT OR UPDATE OF ot_start, ot_end, ot_rate, base_salary ON overtime_logs
  FOR EACH ROW EXECUTE FUNCTION fn_overtime_calc();

CREATE INDEX IF NOT EXISTS idx_att_log_date     ON attendance_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_att_emp_date     ON attendance_logs(emp_id, log_date);
CREATE INDEX IF NOT EXISTS idx_att_dept_date    ON attendance_logs(department, log_date);
CREATE INDEX IF NOT EXISTS idx_att_present      ON attendance_logs(log_date, is_present);
CREATE INDEX IF NOT EXISTS idx_att_late         ON attendance_logs(log_date, is_late) WHERE is_late = TRUE;
CREATE INDEX IF NOT EXISTS idx_ot_date          ON overtime_logs(ot_date);
CREATE INDEX IF NOT EXISTS idx_ot_emp_date      ON overtime_logs(emp_id, ot_date);
CREATE INDEX IF NOT EXISTS idx_ot_status        ON overtime_logs(status);
CREATE INDEX IF NOT EXISTS idx_ot_payroll       ON overtime_logs(payroll_period, payroll_synced);

CREATE OR REPLACE VIEW vw_daily_attendance_summary AS
SELECT log_date, department,
    COUNT(*)                                          AS total_staff,
    COUNT(*) FILTER (WHERE is_present = TRUE)         AS present,
    COUNT(*) FILTER (WHERE is_present = FALSE)        AS absent,
    COUNT(*) FILTER (WHERE is_late    = TRUE)         AS late,
    ROUND(AVG(net_hrs_worked) FILTER (WHERE is_present), 2) AS avg_net_hrs,
    SUM(net_hrs_worked)                               AS total_net_hrs
FROM attendance_logs GROUP BY log_date, department ORDER BY log_date DESC;

CREATE OR REPLACE VIEW vw_ot_pending_approvals AS
SELECT id, ot_date, emp_id, emp_name, department,
    ot_hrs, ot_type, ot_rate, ot_pay, status, processed_by,
    EXTRACT(DAY FROM NOW() - created_at) AS days_pending
FROM overtime_logs WHERE status IN ('pending','processing') ORDER BY created_at ASC;

CREATE OR REPLACE VIEW vw_monthly_ot_cost AS
SELECT TO_CHAR(ot_date,'YYYY-MM') AS month, department,
    COUNT(*)       AS ot_entries,
    SUM(ot_hrs)    AS total_ot_hrs,
    SUM(ot_pay)    AS total_ot_pay,
    COUNT(*) FILTER (WHERE status='approved') AS approved,
    COUNT(*) FILTER (WHERE status='paid')     AS paid
FROM overtime_logs
GROUP BY TO_CHAR(ot_date,'YYYY-MM'), department
ORDER BY month DESC, total_ot_pay DESC;

CREATE OR REPLACE VIEW vw_attendance_ot_combined AS
SELECT a.log_date, a.emp_id, a.emp_name, a.department, a.shift,
    a.net_hrs_worked   AS regular_net_hrs,
    a.is_present, a.is_late,
    COALESCE(o.ot_hrs, 0)  AS ot_hrs,
    COALESCE(o.ot_pay, 0)  AS ot_pay,
    o.status               AS ot_status,
    a.net_hrs_worked + COALESCE(o.ot_hrs, 0) AS total_hrs_day
FROM attendance_logs a
LEFT JOIN overtime_logs o ON a.emp_id = o.emp_id AND a.log_date = o.ot_date
ORDER BY a.log_date DESC, a.emp_id;

