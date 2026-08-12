-- ================================================================
-- FILE: database/schemas/attendance_processing_schema.sql
-- eLogix HRMS — Workforce Operations > Attendance Management >
-- Attendance Processing Module (5 pages)
--
-- Design note: this is the CONSOLIDATION layer sitting above all
-- prior attendance modules (daily_attendance_records, overtime_requests,
-- missed_punch_requests, attendance_regularization_requests,
-- late_early_exceptions). It does not duplicate capture logic -- it
-- unifies, approves, generates payroll batches from, analyzes, and
-- reports on the data those modules already produce.
--
--   1. Attendance Processing  -> processing_rules_config + v_processing_batch
--   2. Attendance Approval    -> v_unified_approval_queue (unions 3 source tables)
--   3. Payroll Attendance Gen -> payroll_attendance_batches (the STP output)
--   4. Attendance Analytics   -> v_bradford_factor + v_department_analytics
--   5. Attendance Reports     -> report_templates + report_generation_log
--
-- Nepal Labour Act 2074: 8hr/48hr caps, OT 4hr/day-24hr/week at 1.5x,
-- Section 20 attendance register, annual Labour Audit requirement,
-- SSF contributions mandatory alongside basic salary/PF/tax.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. PROCESSING RULES CONFIG (grace period, rounding, break deduction)
-- ================================================================
CREATE TABLE IF NOT EXISTS processing_rules_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL UNIQUE,

    grace_period_minutes    INT DEFAULT 10,
    rounding_rule            VARCHAR(20) DEFAULT 'nearest_15' CHECK (rounding_rule IN ('nearest_15','nearest_30','none')),
    mandatory_break_minutes     INT DEFAULT 30,  -- LA2074: 30 min after 5hrs continuous work
    break_trigger_after_hours      NUMERIC(4,2) DEFAULT 5,

    updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. PAYROLL ATTENDANCE BATCHES (the zero-touch STP output)
-- ================================================================
CREATE TABLE IF NOT EXISTS payroll_attendance_batches (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    batch_period_start         DATE NOT NULL,
    batch_period_end              DATE NOT NULL,
    generated_at                     TIMESTAMPTZ DEFAULT NOW(),
    generated_by                        UUID,

    status                                 VARCHAR(20) DEFAULT 'draft'
                                           CHECK (status IN ('draft','ready','pushed_to_payroll')),
    pushed_at                                 TIMESTAMPTZ,

    created_at                                   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, batch_period_start, batch_period_end)
);

CREATE TABLE IF NOT EXISTS payroll_attendance_batch_items (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_attendance_batch_id UUID    NOT NULL REFERENCES payroll_attendance_batches(id),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    payable_days                INT DEFAULT 0,
    lop_days                       INT DEFAULT 0,  -- Loss of Pay (unapproved absence)
    total_ot_hours                    NUMERIC(6,2) DEFAULT 0,
    ot_amount_npr                        NUMERIC(12,2) DEFAULT 0,
    ssf_contribution_npr                    NUMERIC(12,2) DEFAULT 0,

    -- Pre-payroll discrepancy gate -- blocks push until resolved
    has_unresolved_discrepancy                 BOOLEAN DEFAULT FALSE,
    discrepancy_note                              TEXT,
    ready_for_payroll                                BOOLEAN GENERATED ALWAYS AS (NOT has_unresolved_discrepancy) STORED,

    created_at                                          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (payroll_attendance_batch_id, employee_id)
);

-- ================================================================
-- 5. REPORT TEMPLATES & GENERATION LOG
-- ================================================================
CREATE TABLE IF NOT EXISTS report_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,  -- NULL = global default template
    template_key    VARCHAR(40) NOT NULL,
    label           VARCHAR(200) NOT NULL,
    description     TEXT,
    icon            VARCHAR(10) DEFAULT '📄',

    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (company_id, template_key)
);

INSERT INTO report_templates (template_key, label, description, icon) VALUES
    ('workhours',       'Workhours Distribution Report', 'Total hours by employee, department, regular vs overtime', '⏱'),
    ('missing_punch',   'Missing Punch Report',          'All unresolved and resolved missed punches in range', '🕐'),
    ('leave_liability', 'Leave Liability Report',        'Accrued leave balances and financial liability exposure', '📅'),
    ('late_coming',     'Late-Coming Summary',           'Tardiness frequency and total minutes by employee', '⏰'),
    ('overtime_cost',   'Overtime Cost Report',          'OT hours and cost breakdown by department', '💰'),
    ('labour_audit',    'Annual Labour Audit Pack',      'Full compliance bundle for Labour Office submission', '⚖')
ON CONFLICT (company_id, template_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS report_generation_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    template_id         UUID NOT NULL REFERENCES report_templates(id),

    period_start         DATE,
    period_end            DATE,
    department_filter      UUID,
    output_format           VARCHAR(10) DEFAULT 'pdf' CHECK (output_format IN ('pdf','excel')),

    file_url                  VARCHAR(500),
    file_size_kb                 INT,

    -- Scheduled recurring delivery
    is_scheduled                    BOOLEAN DEFAULT FALSE,
    schedule_cadence                   VARCHAR(20) CHECK (schedule_cadence IN ('daily','weekly','monthly')),
    delivery_emails                       TEXT[],

    generated_by                             UUID,
    generated_at                                TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_pab_company         ON payroll_attendance_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_pab_status             ON payroll_attendance_batches(status);
CREATE INDEX IF NOT EXISTS idx_pabi_batch                ON payroll_attendance_batch_items(payroll_attendance_batch_id);
CREATE INDEX IF NOT EXISTS idx_pabi_employee                ON payroll_attendance_batch_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_pabi_discrepancy                 ON payroll_attendance_batch_items(has_unresolved_discrepancy) WHERE has_unresolved_discrepancy;

CREATE INDEX IF NOT EXISTS idx_rgl_template                          ON report_generation_log(template_id);
CREATE INDEX IF NOT EXISTS idx_rgl_company_date                        ON report_generation_log(company_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_rgl_scheduled                              ON report_generation_log(is_scheduled) WHERE is_scheduled;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_attendance_processing_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_prc_upd
    BEFORE UPDATE ON processing_rules_config
    FOR EACH ROW EXECUTE FUNCTION fn_attendance_processing_updated_at();

-- Auto-populate batch items from daily_attendance_records + overtime_requests
-- when a payroll batch is generated -- the core STP automation
CREATE OR REPLACE FUNCTION fn_generate_batch_items()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE emp RECORD; unresolved_count INT;
BEGIN
    FOR emp IN
        SELECT DISTINCT e.id AS employee_id, e.basic_salary_npr
        FROM employees e WHERE e.company_id = NEW.company_id AND e.employment_status = 'active'
    LOOP
        -- Count unresolved discrepancies (pending missed punches / regularizations) in the period
        SELECT (
            (SELECT COUNT(*) FROM missed_punch_requests WHERE employee_id = emp.employee_id AND status = 'pending'
               AND request_date BETWEEN NEW.batch_period_start AND NEW.batch_period_end) +
            (SELECT COUNT(*) FROM attendance_regularization_requests WHERE employee_id = emp.employee_id AND status = 'pending'
               AND regularization_date BETWEEN NEW.batch_period_start AND NEW.batch_period_end)
        ) INTO unresolved_count;

        INSERT INTO payroll_attendance_batch_items
          (payroll_attendance_batch_id, company_id, employee_id,
           payable_days, lop_days, total_ot_hours, ot_amount_npr, ssf_contribution_npr,
           has_unresolved_discrepancy, discrepancy_note, created_at)
        SELECT
            NEW.id, NEW.company_id, emp.employee_id,
            COUNT(*) FILTER (WHERE dar.current_status != 'absent'),
            COUNT(*) FILTER (WHERE dar.current_status = 'absent'),
            COALESCE(SUM(dar.overtime_hours), 0),
            COALESCE(SUM(dar.overtime_hours), 0) * COALESCE(emp.basic_salary_npr / 30 / 8, 0) * 1.5,
            COALESCE(emp.basic_salary_npr, 0) * 0.0833 * 12 / 12,  -- 8.33% monthly SSF estimate
            unresolved_count > 0,
            CASE WHEN unresolved_count > 0 THEN unresolved_count || ' unresolved attendance request(s) in this period' ELSE NULL END,
            NOW()
        FROM daily_attendance_records dar
        WHERE dar.employee_id = emp.employee_id
          AND dar.attendance_date BETWEEN NEW.batch_period_start AND NEW.batch_period_end
        ON CONFLICT (payroll_attendance_batch_id, employee_id) DO NOTHING;
    END LOOP;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_generate_batch_items
    AFTER INSERT ON payroll_attendance_batches
    FOR EACH ROW EXECUTE FUNCTION fn_generate_batch_items();

-- Block pushing a batch to payroll if any item has an unresolved discrepancy
CREATE OR REPLACE FUNCTION fn_block_payroll_push_with_discrepancy()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE unresolved INT;
BEGIN
    IF NEW.status = 'pushed_to_payroll' AND OLD.status != 'pushed_to_payroll' THEN
        SELECT COUNT(*) INTO unresolved FROM payroll_attendance_batch_items
        WHERE payroll_attendance_batch_id = NEW.id AND has_unresolved_discrepancy;

        IF unresolved > 0 THEN
            RAISE EXCEPTION 'Cannot push to payroll: % employee(s) have unresolved attendance discrepancies.', unresolved;
        END IF;
        NEW.pushed_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_payroll_push
    BEFORE UPDATE OF status ON payroll_attendance_batches
    FOR EACH ROW EXECUTE FUNCTION fn_block_payroll_push_with_discrepancy();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Today's processing batch (multi-source ingest with exceptions isolated)
CREATE OR REPLACE VIEW v_processing_batch_today AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    dar.primary_capture_method, dar.first_login_time, dar.last_logout_time,
    dar.total_hours_worked, dar.total_break_minutes,
    CASE WHEN dar.missed_checkout THEN 'missed_checkout'
         WHEN dar.late_arrival_minutes > 0 THEN 'late_arrival'
         WHEN dar.early_departure_minutes > 0 THEN 'early_departure'
         ELSE NULL END AS exception_type,
    (NOT dar.missed_checkout) AS processed,
    dar.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE dar.attendance_date = CURRENT_DATE;

-- Page 2: Unified approval queue (unions missed-punch, OT, regularization)
CREATE OR REPLACE VIEW v_unified_approval_queue AS
SELECT 'missed_punch' AS request_type, mpr.id, e.first_name, e.last_name, e.employee_code,
       mpr.reason_category::TEXT AS detail, mpr.request_date AS date, mpr.status, mpr.manager_employee_id,
       mpr.company_id
FROM missed_punch_requests mpr JOIN employees e ON mpr.employee_id = e.id
WHERE NOT mpr.is_deleted
UNION ALL
SELECT 'overtime' AS request_type, otr.id, e.first_name, e.last_name, e.employee_code,
       otr.reason AS detail, otr.request_date AS date, otr.status, otr.manager_employee_id,
       otr.company_id
FROM overtime_requests otr JOIN employees e ON otr.employee_id = e.id
WHERE NOT otr.is_deleted
UNION ALL
SELECT 'regularization' AS request_type, arr.id, e.first_name, e.last_name, e.employee_code,
       arr.regularization_type::TEXT AS detail, arr.regularization_date AS date, arr.status, arr.manager_employee_id,
       arr.company_id
FROM attendance_regularization_requests arr JOIN employees e ON arr.employee_id = e.id
WHERE NOT arr.is_deleted
ORDER BY date DESC;

-- Page 3: Payroll batch readiness summary
CREATE OR REPLACE VIEW v_payroll_batch_readiness AS
SELECT
    pab.id AS batch_id, pab.batch_period_start, pab.batch_period_end, pab.status,
    COUNT(*) AS total_employees,
    COUNT(*) FILTER (WHERE pabi.ready_for_payroll) AS ready_count,
    COUNT(*) FILTER (WHERE pabi.has_unresolved_discrepancy) AS discrepancy_count,
    SUM(pabi.ot_amount_npr) AS total_ot_cost_npr,
    pab.company_id
FROM payroll_attendance_batches pab
JOIN payroll_attendance_batch_items pabi ON pabi.payroll_attendance_batch_id = pab.id
GROUP BY pab.id, pab.batch_period_start, pab.batch_period_end, pab.status, pab.company_id;

-- Page 4: Bradford Factor per employee (S^2 x D formula)
CREATE OR REPLACE VIEW v_bradford_factor AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    COUNT(DISTINCT dar.attendance_date) AS total_absent_days,
    -- approximation of "spells": count distinct absence date groups (consecutive runs treated as 1 spell)
    GREATEST(1, COUNT(DISTINCT dar.attendance_date) - COUNT(DISTINCT dar.attendance_date - ROW_NUMBER() OVER (
        PARTITION BY dar.employee_id ORDER BY dar.attendance_date))) AS absence_spells,
    e.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE dar.current_status = 'absent' AND dar.attendance_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY e.employee_code, e.first_name, e.last_name, d.name, e.company_id, dar.employee_id;

-- Page 4: Department-level analytics (absenteeism %, avg OT, tardiness count)
CREATE OR REPLACE VIEW v_department_analytics AS
SELECT
    d.name AS department_name,
    ROUND(COUNT(*) FILTER (WHERE dar.current_status = 'absent')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS absenteeism_pct,
    ROUND(AVG(dar.overtime_hours), 1) AS avg_ot_hours,
    COUNT(*) FILTER (WHERE dar.late_arrival_minutes > 0) AS tardiness_count,
    e.company_id
FROM daily_attendance_records dar
JOIN employees e ON dar.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE dar.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY d.name, e.company_id;

-- Page 5: Recent report generation history
CREATE OR REPLACE VIEW v_recent_reports AS
SELECT
    rt.label AS template_label, rt.icon,
    rgl.period_start, rgl.period_end, rgl.output_format, rgl.file_url, rgl.file_size_kb,
    rgl.is_scheduled, rgl.generated_at, rgl.company_id
FROM report_generation_log rgl
JOIN report_templates rt ON rgl.template_id = rt.id
ORDER BY rgl.generated_at DESC;
