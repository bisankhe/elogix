-- ================================================================
-- FILE: database/schemas/leave_operations_schema.sql
-- eLogix HRMS — Workforce Operations > Leave Management > Leave
-- Operations Module (7 pages)
--
-- Design note: this is the TRANSACTIONAL layer sitting on top of
-- leave_setup_schema.sql (leave_types, leave_balance_rules,
-- employee_leave_balances, leave_approval_hierarchies, leave_policies)
-- and the existing holiday_calendar table. No setup tables are
-- duplicated -- this file adds only the request/approval/adjustment
-- transaction tables and consumes the rest via FK + views.
--
--   1. Leave Request    -> leave_requests
--   2. Leave Balance     -> v_leave_balance_dashboard (view, reuses employee_leave_balances)
--   3. Leave Approval     -> v_leave_approval_queue (view) + AI suggestion fields
--   4. Leave Calendar      -> v_team_leave_calendar (view)
--   5. Holiday Management   -> substitute_leave_tracker (new, reuses holiday_calendar)
--   6. Half-Day Leave        -> half_day fields on leave_requests + half_day_policy_config
--   7. Leave Adjustment        -> leave_adjustments (HR-only secure override)
--
-- Nepal Labour Act 2074: leave is a facility (not absolute right) except
-- Sick/Maternity/Mourning; Home Leave 1/20 worked, accumulate 90, encash
-- above; Sick 12/yr, accumulate 45, encash above; substitute leave due
-- within 21 days if working a holiday/weekly-off; pro-rata for <1yr tenure.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1 & 6. LEAVE REQUESTS (covers both full-day and half-day in one table)
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    leave_type_id               UUID    NOT NULL REFERENCES leave_types(id),

    start_date                     DATE NOT NULL,
    end_date                          DATE NOT NULL,

    -- Half-day support (brief: "First Half vs Second Half" toggle)
    is_half_day                          BOOLEAN DEFAULT FALSE,
    half_day_period                         VARCHAR(15) CHECK (half_day_period IN ('first_half','second_half')),
    half_day_hours_worked                      NUMERIC(4,2),  -- actual hours worked on the half-day
    half_day_min_hours_required                   NUMERIC(4,2) DEFAULT 4,
    half_day_valid                                   BOOLEAN GENERATED ALWAYS AS (
                                                      NOT is_half_day OR half_day_hours_worked >= half_day_min_hours_required
                                                    ) STORED,

    total_days                                          NUMERIC(5,2) GENERATED ALWAYS AS (
                                                          CASE WHEN is_half_day THEN 0.5
                                                               ELSE (end_date - start_date + 1)::NUMERIC END
                                                        ) STORED,

    reason                                                  TEXT NOT NULL,
    supporting_document_url                                    VARCHAR(500),

    -- Team-overlap preview, computed at submission (brief: "auto see impact on upcoming projects")
    team_overlap_count                                            INT DEFAULT 0,
    team_overlap_employee_ids                                        UUID[],

    -- AI-assisted scheduling (brief: "AI evaluates workloads... auto-approve or flag")
    ai_suggestion                                                       VARCHAR(20) CHECK (ai_suggestion IN ('approve','review','reject')),
    ai_suggestion_note                                                     TEXT,

    -- Balance impact preview, computed at submission
    balance_before_days                                                       NUMERIC(6,2),
    balance_after_days                                                           NUMERIC(6,2),

    approval_hierarchy_id                                                          UUID REFERENCES leave_approval_hierarchies(id),
    current_approval_level                                                            INT DEFAULT 1,
    manager_employee_id                                                                  UUID,

    status                                                                                VARCHAR(20) DEFAULT 'pending'
                                                                                          CHECK (status IN ('pending','approved','rejected','revision_requested','cancelled')),
    decided_by                                                                              UUID,
    decided_at                                                                                 TIMESTAMPTZ,
    rejection_reason                                                                              TEXT,
    revision_notes                                                                                   TEXT,

    -- SLA tracking (brief: 24-48hr approval window)
    submitted_at                                                                                        TIMESTAMPTZ DEFAULT NOW(),
    sla_hours                                                                                              INT DEFAULT 48,
    sla_breached                                                                                              BOOLEAN GENERATED ALWAYS AS (
                                                                                                              status = 'pending' AND
                                                                                                              EXTRACT(EPOCH FROM (NOW() - submitted_at)) / 3600 > sla_hours
                                                                                                            ) STORED,

    created_at                                                                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                                    TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                                                       BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 5. SUBSTITUTE LEAVE TRACKER (21-day rule, reuses existing holiday_calendar)
-- ================================================================
CREATE TABLE IF NOT EXISTS substitute_leave_tracker (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id         UUID NOT NULL REFERENCES employees(id),
    holiday_calendar_id UUID NOT NULL REFERENCES holiday_calendar(id),

    worked_on_holiday_date DATE NOT NULL,
    substitute_due_by_date  DATE GENERATED ALWAYS AS (worked_on_holiday_date + INTERVAL '21 days') STORED,

    substitute_taken_date     DATE,
    status                       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','taken','expired')),

    created_at                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 6. HALF-DAY POLICY CONFIG (org-wide time windows)
-- ================================================================
CREATE TABLE IF NOT EXISTS half_day_policy_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL UNIQUE,

    first_half_start     TIME DEFAULT '09:00',
    first_half_end        TIME DEFAULT '13:00',
    second_half_start        TIME DEFAULT '13:00',
    second_half_end           TIME DEFAULT '18:00',
    min_hours_required           NUMERIC(4,2) DEFAULT 4,

    updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 7. LEAVE ADJUSTMENTS (HR-only secure override, immutable audit)
-- ================================================================
CREATE TABLE IF NOT EXISTS leave_adjustments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    leave_type_id               UUID    NOT NULL REFERENCES leave_types(id),
    employee_leave_balance_id      UUID REFERENCES employee_leave_balances(id),

    adjustment_type              VARCHAR(30) NOT NULL
                                 CHECK (adjustment_type IN ('bonus_grant','retroactive_correction','paid_to_lwp_conversion','carry_over_adjustment')),
    days_delta                      NUMERIC(6,2) NOT NULL,  -- positive = credit, negative = debit

    reason                              TEXT NOT NULL,
    supporting_document_url                VARCHAR(500) NOT NULL,  -- mandatory per brief's "must mandate documentation"

    balance_before_days                       NUMERIC(6,2),
    balance_after_days                           NUMERIC(6,2),

    -- Immutable audit fields -- never updated after creation
    adjusted_by                                     UUID NOT NULL,
    adjusted_at                                         TIMESTAMPTZ DEFAULT NOW(),

    -- Downstream flag: retroactive paid-leave changes need payroll re-validation
    flags_payroll_revalidation                              BOOLEAN DEFAULT FALSE,

    created_at                                                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_lreq_employee       ON leave_requests(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_lreq_status            ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_lreq_manager              ON leave_requests(manager_employee_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_lreq_dates                   ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_lreq_sla_breach                  ON leave_requests(sla_breached) WHERE sla_breached;
CREATE INDEX IF NOT EXISTS idx_lreq_leave_type                     ON leave_requests(leave_type_id);

CREATE INDEX IF NOT EXISTS idx_slt_employee                            ON substitute_leave_tracker(employee_id);
CREATE INDEX IF NOT EXISTS idx_slt_pending                                ON substitute_leave_tracker(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_slt_due_soon                                  ON substitute_leave_tracker(substitute_due_by_date) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ladj_employee                                       ON leave_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_ladj_company_date                                      ON leave_adjustments(company_id, adjusted_at);
CREATE INDEX IF NOT EXISTS idx_ladj_payroll_flag                                          ON leave_adjustments(flags_payroll_revalidation) WHERE flags_payroll_revalidation;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_leave_ops_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY['leave_requests','substitute_leave_tracker','half_day_policy_config'] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_leave_ops_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-compute balance_before/after preview + team overlap at submission
CREATE OR REPLACE FUNCTION fn_compute_leave_request_preview()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE current_bal NUMERIC; overlap_ids UUID[]; emp_dept UUID;
BEGIN
    SELECT current_balance_days INTO current_bal
    FROM employee_leave_balances
    WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id
    ORDER BY leave_year_label DESC LIMIT 1;

    NEW.balance_before_days := COALESCE(current_bal, 0);
    NEW.balance_after_days := COALESCE(current_bal, 0) - NEW.total_days;

    SELECT department_id INTO emp_dept FROM employees WHERE id = NEW.employee_id;

    SELECT ARRAY_AGG(DISTINCT lr.employee_id) INTO overlap_ids
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    WHERE e.department_id = emp_dept AND lr.employee_id != NEW.employee_id
      AND lr.status = 'approved' AND NOT lr.is_deleted
      AND lr.start_date <= NEW.end_date AND lr.end_date >= NEW.start_date;

    NEW.team_overlap_employee_ids := overlap_ids;
    NEW.team_overlap_count := COALESCE(array_length(overlap_ids, 1), 0);

    -- Simple AI suggestion heuristic
    IF NEW.balance_after_days < 0 THEN
        NEW.ai_suggestion := 'reject';
        NEW.ai_suggestion_note := 'Insufficient leave balance for this request.';
    ELSIF NEW.team_overlap_count >= 2 THEN
        NEW.ai_suggestion := 'review';
        NEW.ai_suggestion_note := format('%s teammates already approved off during this period -- check coverage.', NEW.team_overlap_count);
    ELSE
        NEW.ai_suggestion := 'approve';
        NEW.ai_suggestion_note := 'Sufficient balance, no significant team coverage conflict.';
    END IF;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_leave_request_preview
    BEFORE INSERT ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION fn_compute_leave_request_preview();

-- On approval: deduct from employee_leave_balances (closes the loop with leave_setup_schema)
CREATE OR REPLACE FUNCTION fn_apply_approved_leave()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        NEW.decided_at := NOW();
        UPDATE employee_leave_balances
           SET used_days = used_days + NEW.total_days, updated_at = NOW()
         WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id;
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        NEW.decided_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_approved_leave
    BEFORE UPDATE OF status ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION fn_apply_approved_leave();

-- Auto-create a substitute-leave-due entry if an employee is scheduled to
-- work on a statutory holiday (called by the application layer on roster assignment;
-- exposed here as a callable function for the backend to invoke)
CREATE OR REPLACE FUNCTION fn_create_substitute_entry(p_employee_id UUID, p_holiday_calendar_id UUID, p_company_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE new_id UUID; holiday_date DATE;
BEGIN
    SELECT date_ad INTO holiday_date FROM holiday_calendar WHERE id = p_holiday_calendar_id;

    INSERT INTO substitute_leave_tracker (company_id, employee_id, holiday_calendar_id, worked_on_holiday_date, created_at)
    VALUES (p_company_id, p_employee_id, p_holiday_calendar_id, holiday_date, NOW())
    RETURNING id INTO new_id;

    RETURN new_id;
END;$$;

-- Apply leave adjustments directly to the balance ledger
CREATE OR REPLACE FUNCTION fn_apply_leave_adjustment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE employee_leave_balances
       SET opening_balance_days = opening_balance_days + NEW.days_delta, updated_at = NOW()
     WHERE id = NEW.employee_leave_balance_id;

    IF NEW.adjustment_type IN ('retroactive_correction', 'paid_to_lwp_conversion') THEN
        NEW.flags_payroll_revalidation := TRUE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_adjustment
    BEFORE INSERT ON leave_adjustments
    FOR EACH ROW EXECUTE FUNCTION fn_apply_leave_adjustment();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 2: Leave Balance dashboard (reuses employee_leave_balances directly)
CREATE OR REPLACE VIEW v_leave_balance_dashboard AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    lt.name AS leave_type, lt.code, lt.color_hex, lt.icon,
    elb.current_balance_days, elb.used_days, elb.accrued_to_date_days,
    lbr.max_carry_forward_days, lbr.encashable_above_days, lbr.expiration_policy,
    (lbr.expiration_policy = 'use_it_or_lose_it' AND elb.current_balance_days > 0) AS expiring_soon,
    (lbr.encashable_above_days IS NOT NULL AND elb.current_balance_days > lbr.encashable_above_days) AS encashment_eligible,
    elb.company_id, elb.employee_id
FROM employee_leave_balances elb
JOIN employees e ON elb.employee_id = e.id
JOIN leave_types lt ON elb.leave_type_id = lt.id
LEFT JOIN leave_balance_rules lbr ON lbr.leave_type_id = lt.id AND lbr.company_id = elb.company_id;

-- Page 3: Manager approval queue, sorted SLA-risk first
CREATE OR REPLACE VIEW v_leave_approval_queue AS
SELECT
    lr.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name, lt.name AS leave_type_name
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.status = 'pending' AND NOT lr.is_deleted
ORDER BY lr.sla_breached DESC, lr.submitted_at ASC;

-- Page 4: Team leave calendar (approved leaves, for the color-coded grid)
CREATE OR REPLACE VIEW v_team_leave_calendar AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    lt.name AS leave_type, lt.color_hex,
    lr.start_date, lr.end_date, lr.is_half_day, lr.half_day_period,
    lr.company_id
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.status = 'approved' AND NOT lr.is_deleted;

-- Page 5: Substitute leave dashboard (pending + overdue)
CREATE OR REPLACE VIEW v_substitute_leave_dashboard AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    hc.name AS holiday_name, slt.worked_on_holiday_date, slt.substitute_due_by_date,
    slt.status, (slt.substitute_due_by_date < CURRENT_DATE AND slt.status = 'pending') AS is_overdue,
    slt.company_id
FROM substitute_leave_tracker slt
JOIN employees e ON slt.employee_id = e.id
JOIN holiday_calendar hc ON slt.holiday_calendar_id = hc.id;

-- Page 6: Half-day leave log with validity check
CREATE OR REPLACE VIEW v_half_day_leave_log AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    lr.start_date, lr.half_day_period, lt.name AS leave_type,
    lr.half_day_hours_worked, lr.half_day_min_hours_required, lr.half_day_valid,
    (SELECT COUNT(*) FROM leave_requests lr2 WHERE lr2.employee_id = lr.employee_id AND lr2.is_half_day
       AND DATE_TRUNC('month', lr2.start_date) = DATE_TRUNC('month', lr.start_date)) AS occurrences_this_month,
    lr.company_id
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.is_half_day AND NOT lr.is_deleted;

-- Page 7: Leave adjustment audit log
CREATE OR REPLACE VIEW v_leave_adjustment_audit AS
SELECT
    la.*, e.employee_code, e.first_name, e.last_name, lt.name AS leave_type_name
FROM leave_adjustments la
JOIN employees e ON la.employee_id = e.id
JOIN leave_types lt ON la.leave_type_id = lt.id
ORDER BY la.adjusted_at DESC;
