-- ================================================================
-- FILE: database/schemas/leave_reports_schema.sql
-- NepHR Pro — Workforce Operations > Leave Management > Leave
-- Reports Module (3 pages)
--
-- Design note: this is the FINAL consolidation layer over the entire
-- Leave Management super-module (leave_setup, leave_operations,
-- leave_settlement schemas) plus daily_attendance_records. No capture
-- tables are duplicated -- this file adds sync-conflict detection,
-- multi-jurisdiction compliance config, automatic reminder rules, and
-- report generation tracking.
--
--   1. Leave & Attendance Sync -> leave_attendance_sync_log (view-backed
--                                  conflict/exception detection)
--   2. Leave Analytics          -> v_bradford_factor_by_dept (reuses pattern
--                                  from attendance_processing_schema.sql)
--                                  + pto_hoarding_burnout_flags
--   3. Leave Reports             -> jurisdiction_compliance_config
--                                  + leave_report_generation_log
--                                  + leave_reminder_rules
--
-- Multi-jurisdiction statutory thresholds pre-seeded for Nepal, India,
-- USA, UK, EU, Australia, Singapore/Asia, UAE/Gulf -- each region's
-- accrual cap, encashment limit, and mandatory leave types differ.
-- Nepal LA2074: Home Leave cap 90d, Sick Leave cap 45d, both encashable
-- above cap; substitute leave due within 21 days.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. LEAVE & ATTENDANCE SYNC LOG
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_attendance_sync_log (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    sync_date                   DATE NOT NULL,

    leave_request_id               UUID REFERENCES leave_requests(id),
    daily_attendance_record_id        UUID REFERENCES daily_attendance_records(id),

    sync_state                            VARCHAR(20) NOT NULL DEFAULT 'matched'
                                          CHECK (sync_state IN ('matched','conflict','exception')),
    -- matched: leave approved + attendance correctly Excused
    -- conflict: leave approved BUT employee also clocked in (double-dip risk)
    -- exception: absent with NO leave request on file (routes to Regularization)

    detail_note                               TEXT,
    resolved                                     BOOLEAN DEFAULT FALSE,
    resolved_by                                     UUID,
    resolved_at                                        TIMESTAMPTZ,

    created_at                                            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, sync_date)
);

-- ================================================================
-- 2. LEAVE ANALYTICS — BURNOUT / PTO-HOARDING FLAGS
-- ================================================================
CREATE TABLE IF NOT EXISTS pto_hoarding_burnout_flags (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),

    flag_type            VARCHAR(30) NOT NULL
                         CHECK (flag_type IN ('pto_hoarding','frequent_short_absences','no_consecutive_days_off','high_bradford_score')),
    detail_note           TEXT,
    risk_level             VARCHAR(10) DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high')),

    flagged_at               TIMESTAMPTZ DEFAULT NOW(),
    flagged_for_checkin         BOOLEAN DEFAULT FALSE,
    checkin_completed_at           TIMESTAMPTZ,

    UNIQUE (employee_id, flag_type)
);

-- ================================================================
-- 3. MULTI-JURISDICTION COMPLIANCE CONFIG
-- ================================================================
CREATE TABLE IF NOT EXISTS jurisdiction_compliance_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurisdiction_code   VARCHAR(10) NOT NULL UNIQUE,  -- 'NP','IN','US','UK','EU','AU','SG','AE'
    jurisdiction_name   VARCHAR(100) NOT NULL,

    annual_leave_accrual_cap_days  NUMERIC(5,1),
    sick_leave_accrual_cap_days       NUMERIC(5,1),
    encashment_allowed                  BOOLEAN DEFAULT TRUE,
    encashment_max_days_per_year           NUMERIC(5,1),
    mandatory_leave_types_json                JSONB,  -- e.g. ["annual","sick","maternity","paternity"]

    statutory_reference_note                     TEXT,  -- e.g. 'Nepal Labour Act 2074 Section 49'
    updated_at                                       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO jurisdiction_compliance_config
  (jurisdiction_code, jurisdiction_name, annual_leave_accrual_cap_days, sick_leave_accrual_cap_days,
   encashment_allowed, encashment_max_days_per_year, mandatory_leave_types_json, statutory_reference_note)
VALUES
  ('NP','Nepal',90,45,TRUE,NULL,'["home","sick","maternity","paternity","mourning"]','Nepal Labour Act 2074 Section 49 (accumulation) / Section 42 (substitute leave)'),
  ('IN','India',30,12,TRUE,30,'["earned","sick","casual","maternity"]','Varies by state Shops & Establishments Acts'),
  ('US','USA',NULL,NULL,FALSE,NULL,'["sick (varies by state)","FMLA unpaid"]','No federal PTO mandate; state-level variation (e.g. CA, NY sick leave laws)'),
  ('UK','United Kingdom',28,NULL,FALSE,NULL,'["annual (statutory min 28 days incl. bank holidays)","sick (SSP)","maternity","paternity"]','Working Time Regulations 1998'),
  ('EU','European Union (general)',20,NULL,FALSE,NULL,'["annual (statutory min 20 days)","sick","parental"]','EU Working Time Directive 2003/88/EC -- varies by member state'),
  ('AU','Australia',NULL,10,TRUE,NULL,'["annual (4 weeks)","personal/sick","long service"]','Fair Work Act 2009 National Employment Standards'),
  ('SG','Singapore / Asia (general)',14,14,TRUE,NULL,'["annual","sick","maternity","paternity"]','Singapore Employment Act -- varies across Asia'),
  ('AE','UAE / Gulf (general)',30,90,FALSE,NULL,'["annual (30 days)","sick (graduated pay)","maternity"]','UAE Federal Decree-Law No. 33 of 2021')
ON CONFLICT (jurisdiction_code) DO NOTHING;

-- ================================================================
-- AUTOMATIC REMINDER RULES (brief: "Send automatic Reminders within
-- processes and tasks")
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_reminder_rules (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,

    trigger_event         VARCHAR(60) NOT NULL,  -- e.g. 'pending_approval_24h', 'comp_off_expiring_3d'
    trigger_threshold_hours  INT,
    action_description          VARCHAR(300) NOT NULL,
    notify_channels                TEXT[] DEFAULT ARRAY['email','in_app'],

    is_active                         BOOLEAN DEFAULT TRUE,
    created_at                           TIMESTAMPTZ DEFAULT NOW(),
    updated_at                              TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO leave_reminder_rules (company_id, trigger_event, trigger_threshold_hours, action_description, notify_channels)
SELECT id, t.event, t.hours, t.action, ARRAY['email','in_app']
FROM companies c
CROSS JOIN (VALUES
  ('pending_approval_24h', 24, 'Remind manager via email + in-app'),
  ('pending_approval_48h', 48, 'Escalate to HR + notify employee'),
  ('comp_off_expiring_3d', 72, 'Remind employee to use comp-off or it converts to payout'),
  ('balance_above_80pct_cap', NULL, 'Nudge employee to plan time off before forced encashment')
) AS t(event, hours, action)
ON CONFLICT DO NOTHING;

-- ================================================================
-- LEAVE REPORT GENERATION LOG (jurisdiction-aware, mirrors
-- report_generation_log from attendance_processing_schema.sql but
-- scoped to leave-specific templates)
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_report_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,
    template_key    VARCHAR(40) NOT NULL,
    label           VARCHAR(200) NOT NULL,
    description     TEXT,
    icon            VARCHAR(10) DEFAULT '📄',
    is_jurisdiction_aware BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, template_key)
);

INSERT INTO leave_report_templates (template_key, label, description, icon, is_jurisdiction_aware) VALUES
    ('statutory',    'Statutory Compliance Report',     'Accrued, used, carried-over leave per local labor law', '⚖', TRUE),
    ('liability',    'Leave Liability Report',          'Financial exposure from unutilized leave balances', '💰', TRUE),
    ('utilization',  'Utilization Rate Report',         '% of allotted annual leave actually taken', '📊', FALSE),
    ('departmental', 'Departmental Absenteeism',        'Weekly digest of upcoming absences by department', '🏢', FALSE),
    ('comp_audit',   'Comp-Off & Encashment Audit',     'Full audit trail of adjustments and payouts', '🔐', TRUE)
ON CONFLICT (company_id, template_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS leave_report_generation_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    template_id         UUID NOT NULL REFERENCES leave_report_templates(id),
    jurisdiction_code      VARCHAR(10) REFERENCES jurisdiction_compliance_config(jurisdiction_code),

    period_start         DATE,
    period_end            DATE,
    department_filter        UUID,
    output_format              VARCHAR(10) DEFAULT 'pdf' CHECK (output_format IN ('pdf','excel')),

    file_url                     VARCHAR(500),
    file_size_kb                    INT,

    is_scheduled                       BOOLEAN DEFAULT FALSE,
    schedule_cadence                      VARCHAR(20) CHECK (schedule_cadence IN ('daily','weekly','monthly')),
    delivery_emails                          TEXT[],
    reminder_sent_on_generation                  BOOLEAN DEFAULT FALSE,

    generated_by                                    UUID,
    generated_at                                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_lasl_employee       ON leave_attendance_sync_log(employee_id, sync_date);
CREATE INDEX IF NOT EXISTS idx_lasl_state             ON leave_attendance_sync_log(sync_state) WHERE sync_state != 'matched';
CREATE INDEX IF NOT EXISTS idx_lasl_unresolved            ON leave_attendance_sync_log(resolved) WHERE NOT resolved;

CREATE INDEX IF NOT EXISTS idx_pbf_employee                  ON pto_hoarding_burnout_flags(employee_id);
CREATE INDEX IF NOT EXISTS idx_pbf_risk                         ON pto_hoarding_burnout_flags(risk_level) WHERE risk_level = 'high';

CREATE INDEX IF NOT EXISTS idx_lrr_company                         ON leave_reminder_rules(company_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_lrgl_company_date                      ON leave_report_generation_log(company_id, generated_at);
CREATE INDEX IF NOT EXISTS idx_lrgl_jurisdiction                         ON leave_report_generation_log(jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_lrgl_scheduled                               ON leave_report_generation_log(is_scheduled) WHERE is_scheduled;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_leave_reports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_lrr_upd
    BEFORE UPDATE ON leave_reminder_rules
    FOR EACH ROW EXECUTE FUNCTION fn_leave_reports_updated_at();

-- Auto-detect sync state by comparing leave_requests against daily_attendance_records
CREATE OR REPLACE FUNCTION fn_detect_leave_attendance_sync_state()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE has_approved_leave BOOLEAN; attendance_status VARCHAR(20);
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM leave_requests lr
        WHERE lr.employee_id = NEW.employee_id AND lr.status = 'approved'
          AND NEW.sync_date BETWEEN lr.start_date AND lr.end_date
    ) INTO has_approved_leave;

    SELECT current_status INTO attendance_status
    FROM daily_attendance_records
    WHERE employee_id = NEW.employee_id AND attendance_date = NEW.sync_date;

    IF has_approved_leave AND attendance_status = 'working' THEN
        NEW.sync_state := 'conflict';
        NEW.detail_note := 'Employee is on approved leave but has an active clock-in.';
    ELSIF NOT has_approved_leave AND attendance_status = 'absent' THEN
        NEW.sync_state := 'exception';
        NEW.detail_note := 'No pre-approved leave found for an absent day.';
    ELSE
        NEW.sync_state := 'matched';
        NEW.detail_note := 'Leave and attendance records are consistent.';
    END IF;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_detect_sync_state
    BEFORE INSERT ON leave_attendance_sync_log
    FOR EACH ROW EXECUTE FUNCTION fn_detect_leave_attendance_sync_state();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: today's sync feed with employee detail
CREATE OR REPLACE VIEW v_leave_attendance_sync_feed AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    lasl.sync_date, lasl.sync_state, lasl.detail_note, lasl.resolved,
    lasl.company_id
FROM leave_attendance_sync_log lasl
JOIN employees e ON lasl.employee_id = e.id
ORDER BY lasl.sync_state DESC, lasl.sync_date DESC;

-- Page 2: Bradford Factor by department (reuses the formula pattern
-- from attendance_processing_schema.sql, scoped here for leave-specific reporting)
CREATE OR REPLACE VIEW v_bradford_factor_by_dept AS
SELECT
    d.name AS department_name,
    ROUND(AVG(occ.spell_count)::NUMERIC, 1) AS avg_spells,
    ROUND(AVG(occ.spell_count * occ.spell_count * occ.total_days)::NUMERIC, 1) AS avg_bradford_score,
    e.company_id
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
JOIN (
    SELECT employee_id, COUNT(DISTINCT attendance_date) AS spell_count,
           COUNT(*) AS total_days
    FROM daily_attendance_records
    WHERE current_status = 'absent' AND attendance_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY employee_id
) occ ON occ.employee_id = e.id
GROUP BY d.name, e.company_id;

-- Page 2: active burnout/PTO-hoarding flags, HR review queue
CREATE OR REPLACE VIEW v_burnout_pto_review_queue AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    phf.flag_type, phf.detail_note, phf.risk_level, phf.flagged_at,
    phf.company_id
FROM pto_hoarding_burnout_flags phf
JOIN employees e ON phf.employee_id = e.id
WHERE NOT phf.flagged_for_checkin OR phf.checkin_completed_at IS NULL
ORDER BY phf.risk_level DESC;

-- Page 3: jurisdiction-aware report template catalog
CREATE OR REPLACE VIEW v_leave_report_templates_catalog AS
SELECT * FROM leave_report_templates WHERE is_active;

-- Page 3: recent report generation history
CREATE OR REPLACE VIEW v_recent_leave_reports AS
SELECT
    lrt.label AS template_label, lrt.icon,
    lrgl.jurisdiction_code, jcc.jurisdiction_name,
    lrgl.period_start, lrgl.period_end, lrgl.output_format, lrgl.file_url,
    lrgl.is_scheduled, lrgl.generated_at, lrgl.company_id
FROM leave_report_generation_log lrgl
JOIN leave_report_templates lrt ON lrgl.template_id = lrt.id
LEFT JOIN jurisdiction_compliance_config jcc ON lrgl.jurisdiction_code = jcc.jurisdiction_code
ORDER BY lrgl.generated_at DESC;

-- Self-service "my progress" widget data source
CREATE OR REPLACE VIEW v_my_leave_progress AS
SELECT
    e.id AS employee_id, e.employee_code,
    ROUND(SUM(elb.used_days) / NULLIF(SUM(elb.accrued_to_date_days + elb.opening_balance_days), 0) * 100, 1) AS leave_used_pct,
    e.company_id
FROM employee_leave_balances elb
JOIN employees e ON elb.employee_id = e.id
GROUP BY e.id, e.employee_code, e.company_id;
