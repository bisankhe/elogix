-- ================================================================
-- FILE: database/schemas/workload_analysis_schema.sql
-- NepHR Pro — Performance & Talent Management > Work & Performance >
-- Workload Analysis Module (2 pages)
--
-- Design note: this is the FIRST module of the Performance & Talent
-- super-module. It aggregates heavily from existing tables --
-- daily_attendance_records (hours/overtime), employees (department_id,
-- grade_level), leave_requests/employee_leave_balances (time-away) --
-- rather than re-capturing attendance data. New tables are added only
-- for the genuinely new concepts: task allocation records (assigned vs
-- completed, not tracked anywhere yet), burnout risk flags, and
-- department-level FTE/capacity targets.
--
--   1. Employeewise -> employee_task_allocations + employee_burnout_flags
--                       (aggregates daily_attendance_records for hours)
--   2. Departmentwise -> department_capacity_targets
--                       (aggregates daily_attendance_records + employees)
--
-- Nepal Labour Act 2074: 8hr/day, 48hr/week standard; minors 6hr/day,
-- 36hr/week; OT capped 4hr/day, 24hr/week at 1.5x; mandatory 30-min
-- break after 5hrs continuous work; pregnant/nursing women get +30min;
-- equal-value-of-work assessed by nature, time, skill, effort, productivity;
-- retrenchment must be first-in-first-out with severance (1 month/year of service).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. EMPLOYEEWISE — task allocation + burnout flags
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_task_allocations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    week_start                  DATE NOT NULL,
    planned_hours                   NUMERIC(5,2) DEFAULT 48,  -- LA2074 standard weekly cap

    tasks_assigned                     INT DEFAULT 0,
    tasks_completed                       INT DEFAULT 0,
    completion_rate_pct                      NUMERIC(5,2) GENERATED ALWAYS AS (
                                              CASE WHEN tasks_assigned > 0
                                                THEN ROUND(tasks_completed::NUMERIC / tasks_assigned * 100, 1)
                                                ELSE NULL END
                                            ) STORED,

    created_at                                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, week_start)
);

CREATE TABLE IF NOT EXISTS employee_burnout_flags (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),

    week_start            DATE NOT NULL,
    utilization_pct          NUMERIC(6,2),  -- actual_hrs / planned_hrs * 100
    risk_level                VARCHAR(10) DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
    risk_note                   TEXT,

    flagged_for_checkin            BOOLEAN DEFAULT FALSE,
    checkin_completed_at              TIMESTAMPTZ,

    created_at                           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, week_start)
);

-- ================================================================
-- 2. DEPARTMENTWISE — capacity targets
-- ================================================================
CREATE TABLE IF NOT EXISTS department_capacity_targets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    department_id        UUID NOT NULL REFERENCES departments(id),

    week_start             DATE NOT NULL,
    required_hours_week       NUMERIC(8,2) NOT NULL,  -- project/operational demand
    fte_target                   NUMERIC(6,2),  -- target FTE count for this demand level

    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (department_id, week_start)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_eta_employee       ON employee_task_allocations(employee_id, week_start);
CREATE INDEX IF NOT EXISTS idx_ebf_employee           ON employee_burnout_flags(employee_id, week_start);
CREATE INDEX IF NOT EXISTS idx_ebf_high_risk             ON employee_burnout_flags(risk_level) WHERE risk_level = 'high';
CREATE INDEX IF NOT EXISTS idx_dct_department               ON department_capacity_targets(department_id, week_start);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_workload_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_eta_upd
    BEFORE UPDATE ON employee_task_allocations
    FOR EACH ROW EXECUTE FUNCTION fn_workload_updated_at();

-- Auto-compute burnout risk from actual hours (daily_attendance_records)
-- vs planned hours + overtime patterns, written whenever a task
-- allocation row is touched for that week
CREATE OR REPLACE FUNCTION fn_compute_burnout_risk()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    actual_hrs NUMERIC;
    ot_hrs NUMERIC;
    vacation_used NUMERIC;
    util_pct NUMERIC;
    risk VARCHAR(10);
    note TEXT;
BEGIN
    SELECT COALESCE(SUM(total_hours_worked), 0), COALESCE(SUM(overtime_hours), 0)
      INTO actual_hrs, ot_hrs
      FROM daily_attendance_records
     WHERE employee_id = NEW.employee_id
       AND attendance_date BETWEEN NEW.week_start AND NEW.week_start + 6;

    util_pct := ROUND(actual_hrs / NULLIF(NEW.planned_hours,0) * 100, 1);

    IF util_pct > 115 OR ot_hrs > 8 THEN
        risk := 'high';
        note := format('Utilization at %s%% with %s hrs overtime this week -- possible overload.', util_pct, ot_hrs);
    ELSIF util_pct > 105 OR ot_hrs > 4 THEN
        risk := 'medium';
        note := format('Utilization at %s%% -- approaching capacity limits, worth monitoring.', util_pct);
    ELSE
        risk := 'low';
        note := 'Healthy utilization within planned capacity.';
    END IF;

    INSERT INTO employee_burnout_flags
      (company_id, employee_id, week_start, utilization_pct, risk_level, risk_note, flagged_for_checkin, created_at)
    VALUES
      (NEW.company_id, NEW.employee_id, NEW.week_start, util_pct, risk, note, risk = 'high', NOW())
    ON CONFLICT (employee_id, week_start)
    DO UPDATE SET utilization_pct = EXCLUDED.utilization_pct, risk_level = EXCLUDED.risk_level,
                  risk_note = EXCLUDED.risk_note, flagged_for_checkin = EXCLUDED.flagged_for_checkin;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_compute_burnout_risk
    AFTER INSERT OR UPDATE OF tasks_assigned, tasks_completed ON employee_task_allocations
    FOR EACH ROW EXECUTE FUNCTION fn_compute_burnout_risk();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Employeewise workload dashboard (the page's main data source)
CREATE OR REPLACE VIEW v_employeewise_workload AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    eta.week_start, eta.planned_hours,
    COALESCE(att.actual_hours, 0) AS actual_hours,
    ROUND(COALESCE(att.actual_hours,0) / NULLIF(eta.planned_hours,0) * 100, 1) AS utilization_pct,
    COALESCE(att.overtime_hours, 0) AS overtime_hours,
    COALESCE(lv.vacation_hours, 0) AS vacation_hrs_used,
    COALESCE(lv.sick_hours, 0) AS sick_hrs_used,
    eta.tasks_assigned, eta.tasks_completed, eta.completion_rate_pct,
    ebf.risk_level AS burnout_risk, ebf.risk_note AS burnout_note,
    eta.company_id, eta.employee_id
FROM employee_task_allocations eta
JOIN employees e ON eta.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN employee_burnout_flags ebf ON ebf.employee_id = eta.employee_id AND ebf.week_start = eta.week_start
LEFT JOIN (
    SELECT employee_id, attendance_date::DATE - (EXTRACT(DOW FROM attendance_date)::INT) AS week_start,
           SUM(total_hours_worked) AS actual_hours, SUM(overtime_hours) AS overtime_hours
    FROM daily_attendance_records GROUP BY employee_id, week_start
) att ON att.employee_id = eta.employee_id AND att.week_start = eta.week_start
LEFT JOIN (
    SELECT lr.employee_id, lr.start_date::DATE - (EXTRACT(DOW FROM lr.start_date)::INT) AS week_start,
           SUM(lr.total_days * 8) FILTER (WHERE lt.code = 'HL') AS vacation_hours,
           SUM(lr.total_days * 8) FILTER (WHERE lt.code = 'SL') AS sick_hours
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.status = 'approved'
    GROUP BY lr.employee_id, week_start
) lv ON lv.employee_id = eta.employee_id AND lv.week_start = eta.week_start;

-- Page 1: High-risk burnout review queue for HR/managers
CREATE OR REPLACE VIEW v_burnout_review_queue AS
SELECT e.employee_code, e.first_name, e.last_name, ebf.*
FROM employee_burnout_flags ebf
JOIN employees e ON ebf.employee_id = e.id
WHERE ebf.flagged_for_checkin AND ebf.checkin_completed_at IS NULL
ORDER BY ebf.week_start DESC;

-- Page 2: Departmentwise workload dashboard (resource allocation matrix)
CREATE OR REPLACE VIEW v_departmentwise_workload AS
SELECT
    d.name AS department_name,
    COUNT(DISTINCT e.id) AS headcount,
    dct.required_hours_week,
    COALESCE(SUM(att.actual_hours), 0) AS available_hours_week,
    ROUND((COALESCE(SUM(att.actual_hours),0) - dct.required_hours_week) / 40.0, 1) AS fte_gap,
    ROUND(AVG(att.overtime_hours), 1) AS avg_overtime_hrs,
    CASE
        WHEN (COALESCE(SUM(att.actual_hours),0) - dct.required_hours_week) / 40.0 < -1 THEN 'over'
        WHEN (COALESCE(SUM(att.actual_hours),0) - dct.required_hours_week) / 40.0 > 1 THEN 'under'
        ELSE 'balanced' END AS intensity,
    dct.company_id, dct.week_start
FROM department_capacity_targets dct
JOIN departments d ON dct.department_id = d.id
LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status = 'active'
LEFT JOIN (
    SELECT employee_id, attendance_date::DATE - (EXTRACT(DOW FROM attendance_date)::INT) AS week_start,
           SUM(total_hours_worked) AS actual_hours, SUM(overtime_hours) AS overtime_hours
    FROM daily_attendance_records GROUP BY employee_id, week_start
) att ON att.employee_id = e.id AND att.week_start = dct.week_start
GROUP BY d.name, dct.required_hours_week, dct.company_id, dct.week_start;
