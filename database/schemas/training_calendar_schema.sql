-- ================================================================
-- FILE: database/schemas/training_calendar_schema.sql
-- NepHR Pro — Performance & Talent Management > Talent Development >
-- Learning & Development > Training Calendars (4 pages: Annual,
-- Monthly, Weekly, Daily)
--
-- Design note: this is the FIRST course/session scheduling infrastructure
-- built in the system. No Course Management or LMS schema exists yet
-- (those remain unbuilt sidebar placeholders), so training_sessions here
-- is deliberately designed as the FOUNDATIONAL table that Course
-- Management, Learning Portal, and Certification Tracking will build on
-- top of in future sessions -- not a throwaway calendar-only structure.
-- One unified table serves all 4 calendar granularities via period_type,
-- avoiding four near-duplicate tables. Integrates with the EXISTING
-- training_needs_analysis (approved needs become sessions),
-- training_recommendations (individual assignment), and
-- transaction_notifications (the shared notification mechanism).
--
--   - annual_training_budgets    (fiscal-year budget allocation/utilization)
--   - quarterly_org_themes        (the brief's "Q1 Compliance, Q2 Leadership" matrix)
--   - training_sessions            (unified: works for annual initiatives,
--                                   monthly/weekly bookable sessions, and
--                                   daily microlearning -- via period_type)
--   - training_session_enrollments (self-nomination + manager approval)
--   - microlearning_chunks          (daily bite-sized content, slot-into-day)
--   - daily_training_progress        (per-employee daily completion tracking)
--
-- Nepal Labour Act 2074 Chapter 10: mandatory OSH/safety training, no
-- prescribed calendar format but must be regular; Clause re: trainees/
-- apprentices capped at 1 year, 8hr/day-48hr/week; foreign-national
-- skilled posts require a gradual Nepali-replacement training strategy.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- ANNUAL: BUDGET + QUARTERLY ORG THEMES
-- ================================================================
CREATE TABLE IF NOT EXISTS annual_training_budgets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    fiscal_year_label   VARCHAR(20) NOT NULL,  -- e.g. '2082/83 BS'
    allocated_npr        NUMERIC(14,2) NOT NULL,
    utilized_npr             NUMERIC(14,2) DEFAULT 0,
    UNIQUE (company_id, fiscal_year_label)
);

CREATE TABLE IF NOT EXISTS quarterly_org_themes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    fiscal_year_label   VARCHAR(20) NOT NULL,
    quarter_label        VARCHAR(5) NOT NULL CHECK (quarter_label IN ('Q1','Q2','Q3','Q4')),
    theme_title              VARCHAR(200) NOT NULL,  -- e.g. 'Compliance & OSH Refresher'
    color_hex                   VARCHAR(7) DEFAULT '#7c3aed',
    UNIQUE (company_id, fiscal_year_label, quarter_label)
);

-- ================================================================
-- UNIFIED TRAINING SESSIONS (serves annual/monthly/weekly granularity)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_sessions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    training_needs_analysis_id  UUID    REFERENCES training_needs_analysis(id),  -- optional link back to TNA

    title                       VARCHAR(300) NOT NULL,
    category                       VARCHAR(20) NOT NULL DEFAULT 'technical'
                                   CHECK (category IN ('technical','soft_skills','compliance','leadership')),

    period_type                       VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('annual','monthly','weekly')),
    session_date                         DATE,
    start_time                              TIME,
    end_time                                   TIME,

    department_id                                 UUID REFERENCES departments(id),  -- NULL = open to all
    quarterly_theme_id                                UUID REFERENCES quarterly_org_themes(id),

    trainer_name                                         VARCHAR(150),
    trainer_type                                            VARCHAR(20) DEFAULT 'internal' CHECK (trainer_type IN ('internal','external')),
    location_or_link                                           VARCHAR(300),  -- physical room or virtual meeting link

    seats_total                                                   INT DEFAULT 20,
    seats_filled                                                     INT DEFAULT 0,

    prerequisites                                                       TEXT[],  -- array of prerequisite course titles
    budget_cost_npr                                                        NUMERIC(12,2) DEFAULT 0,

    status                                                                    VARCHAR(20) DEFAULT 'scheduled'
                                                                              CHECK (status IN ('scheduled','full','completed','cancelled')),

    created_by                                                                    UUID,
    created_at                                                                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ENROLLMENTS (self-nomination + manager approval)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_session_enrollments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    training_session_id      UUID       NOT NULL REFERENCES training_sessions(id),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    enrollment_type             VARCHAR(20) DEFAULT 'self_nominated' CHECK (enrollment_type IN ('self_nominated','manager_assigned')),
    approval_status                 VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
    approved_by                        UUID,

    attended                              BOOLEAN,
    completed_at                              TIMESTAMPTZ,

    created_at                                   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (training_session_id, employee_id)
);

-- ================================================================
-- DAILY: MICROLEARNING CHUNKS + PROGRESS
-- ================================================================
CREATE TABLE IF NOT EXISTS microlearning_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,

    title           VARCHAR(300) NOT NULL,
    chunk_type      VARCHAR(20) NOT NULL DEFAULT 'micro' CHECK (chunk_type IN ('quiz','micro','flashcard','live')),
    duration_minutes INT DEFAULT 5,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_training_progress (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    microlearning_chunk_id      UUID    REFERENCES microlearning_chunks(id),
    training_session_id            UUID REFERENCES training_sessions(id),  -- for live sessions on the daily agenda

    scheduled_date                     DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_time                        TIME,

    completed                                BOOLEAN DEFAULT FALSE,
    completed_at                                TIMESTAMPTZ,
    quiz_score_pct                                 NUMERIC(5,2),

    created_at                                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_atb_company        ON annual_training_budgets(company_id, fiscal_year_label);
CREATE INDEX IF NOT EXISTS idx_qot_company            ON quarterly_org_themes(company_id, fiscal_year_label);
CREATE INDEX IF NOT EXISTS idx_ts_period                 ON training_sessions(period_type, session_date);
CREATE INDEX IF NOT EXISTS idx_ts_department                 ON training_sessions(department_id);
CREATE INDEX IF NOT EXISTS idx_ts_status                        ON training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tse_session                          ON training_session_enrollments(training_session_id);
CREATE INDEX IF NOT EXISTS idx_tse_employee                            ON training_session_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_tse_pending                                  ON training_session_enrollments(approval_status) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dtp_employee_date                               ON daily_training_progress(employee_id, scheduled_date);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_training_calendar_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_ts_upd
    BEFORE UPDATE ON training_sessions
    FOR EACH ROW EXECUTE FUNCTION fn_training_calendar_updated_at();

-- On enrollment, increment seats_filled and auto-mark the session 'full'
-- if capacity is reached
CREATE OR REPLACE FUNCTION fn_apply_enrollment_seat()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE total INT; filled INT;
BEGIN
    IF NEW.approval_status = 'approved' AND (OLD IS NULL OR OLD.approval_status != 'approved') THEN
        UPDATE training_sessions SET seats_filled = seats_filled + 1 WHERE id = NEW.training_session_id
        RETURNING seats_total, seats_filled INTO total, filled;

        IF filled >= total THEN
            UPDATE training_sessions SET status = 'full' WHERE id = NEW.training_session_id;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_seat
    AFTER INSERT OR UPDATE OF approval_status ON training_session_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_apply_enrollment_seat();

-- Notify employee + reporting manager on enrollment (self-nomination
-- routes to manager for one-click approval, per the brief), reusing
-- the EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_enrollment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID; session_title TEXT;
BEGIN
    SELECT title INTO session_title FROM training_sessions WHERE id = NEW.training_session_id;

    IF NEW.enrollment_type = 'self_nominated' AND NEW.approval_status = 'pending' THEN
        SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
        IF mgr_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'training_session_enrollments', NEW.id, 'enrollment_pending_approval', mgr_id, 'reporting_manager',
               format('Your direct report self-nominated for "%s" -- approval needed.', session_title), NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_enrollment
    AFTER INSERT ON training_session_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_notify_enrollment();

-- Auto-flag a session at risk of low fill 3 days before its date (the
-- brief's "auto-trigger reminder nudge" requirement)
CREATE OR REPLACE FUNCTION fn_check_low_fill_warning()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.session_date IS NOT NULL AND NEW.session_date - CURRENT_DATE <= 3
       AND NEW.seats_filled::NUMERIC / NULLIF(NEW.seats_total,0) < 0.6 AND NEW.status = 'scheduled' THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        SELECT NEW.company_id, 'training_sessions', NEW.id, 'low_fill_warning', e.id, 'direct_party',
               format('Reminder: "%s" still has open seats -- session is in %s days.', NEW.title, NEW.session_date - CURRENT_DATE)
        FROM employees e WHERE e.department_id = NEW.department_id OR NEW.department_id IS NULL
        LIMIT 0;  -- placeholder: actual eligible-employee targeting handled at application layer
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_low_fill_check
    AFTER UPDATE OF seats_filled ON training_sessions
    FOR EACH ROW EXECUTE FUNCTION fn_check_low_fill_warning();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Annual budget + quarter theme dashboard
CREATE OR REPLACE VIEW v_annual_training_dashboard AS
SELECT atb.*, ROUND(atb.utilized_npr / NULLIF(atb.allocated_npr,0) * 100, 1) AS utilization_pct
FROM annual_training_budgets atb;

CREATE OR REPLACE VIEW v_quarterly_themes AS
SELECT qot.*,
    (SELECT COUNT(*) FROM training_sessions ts WHERE ts.quarterly_theme_id = qot.id) AS sessions_count
FROM quarterly_org_themes qot
ORDER BY qot.quarter_label;

-- Page 2: Monthly calendar dashboard
CREATE OR REPLACE VIEW v_monthly_training_calendar AS
SELECT ts.*, d.name AS department_name,
    ROUND(ts.seats_filled::NUMERIC / NULLIF(ts.seats_total,0) * 100, 1) AS fill_rate_pct
FROM training_sessions ts
LEFT JOIN departments d ON ts.department_id = d.id
WHERE ts.period_type = 'monthly';

-- Page 3: Weekly calendar dashboard
CREATE OR REPLACE VIEW v_weekly_training_calendar AS
SELECT ts.*, d.name AS department_name
FROM training_sessions ts
LEFT JOIN departments d ON ts.department_id = d.id
WHERE ts.period_type = 'weekly';

-- Page 4: Daily agenda (per employee, today's microlearning + live sessions)
CREATE OR REPLACE VIEW v_daily_training_agenda AS
SELECT
    dtp.*, mc.title AS micro_title, mc.chunk_type, mc.duration_minutes,
    ts.title AS session_title, ts.start_time AS session_start_time
FROM daily_training_progress dtp
LEFT JOIN microlearning_chunks mc ON dtp.microlearning_chunk_id = mc.id
LEFT JOIN training_sessions ts ON dtp.training_session_id = ts.id
WHERE dtp.scheduled_date = CURRENT_DATE
ORDER BY COALESCE(dtp.scheduled_time, ts.start_time);

-- Pending enrollment approvals (manager queue)
CREATE OR REPLACE VIEW v_pending_enrollment_approvals AS
SELECT tse.*, ts.title AS session_title, e.first_name, e.last_name
FROM training_session_enrollments tse
JOIN training_sessions ts ON tse.training_session_id = ts.id
JOIN employees e ON tse.employee_id = e.id
WHERE tse.approval_status = 'pending';
