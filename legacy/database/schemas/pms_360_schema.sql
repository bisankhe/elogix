-- ================================================================
-- FILE: database/schemas/pms_360_schema.sql
-- eLogix HRMS — Performance & Talent Management > Goal & Performance >
-- Goal Management > 360 Degree PMS (1 page)
--
-- Design note: this is the cycle/competency layer of 360 review --
-- distinct from the existing '360-feedback' sidebar entry under
-- Performance Evaluation (which will house the periodic written review
-- output). This page manages: competency definitions, the review
-- cycle + evaluator assignments, the anonymity-threshold gate (brief's
-- "Performance Evaluation" research specified min 3 reviewers), the
-- Individual Development Plan, and rater-bias calibration. Reuses
-- transaction_notifications directly for all publish/reminder events --
-- no duplicate mechanism built.
--
--   - pms_360_competencies   (the axes of the radar chart)
--   - pms_360_cycles         (review cycle config per employee)
--   - pms_360_evaluators     (who's assigned, role, anonymity status)
--   - pms_360_ratings        (per-competency scores, gated by anonymity threshold)
--   - pms_360_idp_items      (Individual Development Plan, gap -> action -> progress)
--   - pms_360_calibration    (rater-bias tracking for HR)
--
-- Nepal Labour Act 2074 Section 112: evaluation basis/procedure must be
-- communicated before the period starts; post-evaluation discussion
-- mandatory; employee right to disagreement and review. Individual
-- Privacy Act 2018: explicit consent before processing personal
-- performance data; anonymity protections for peer/report feedback.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS pms_360_competencies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    name            VARCHAR(100) NOT NULL,  -- e.g. 'Leadership', 'Teamwork'
    description     TEXT,
    display_order   INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS pms_360_cycles (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),  -- the reviewee

    cycle_label                 VARCHAR(50) NOT NULL,  -- e.g. 'Q3 2026 Mid-Cycle', 'Annual FY 2082/83'
    cycle_start_date                DATE NOT NULL,
    cycle_end_date                     DATE NOT NULL,

    -- Section 112: criteria must be communicated before the period starts
    criteria_communicated_at               TIMESTAMPTZ,
    employee_consent_obtained                 BOOLEAN DEFAULT FALSE,

    min_reviewers_for_anonymity                  INT DEFAULT 3,
    status                                          VARCHAR(20) DEFAULT 'pending'
                                                    CHECK (status IN ('pending','in_progress','completed','released')),

    created_by                                          UUID,
    created_at                                             TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pms_360_evaluators (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    pms_360_cycle_id          UUID       NOT NULL REFERENCES pms_360_cycles(id),
    company_id             UUID         NOT NULL,
    evaluator_employee_id     UUID       NOT NULL REFERENCES employees(id),

    relationship                 VARCHAR(20) NOT NULL
                                 CHECK (relationship IN ('self','manager','peer','direct_report','skip_level')),
    is_anonymous                    BOOLEAN GENERATED ALWAYS AS (relationship IN ('peer','direct_report')) STORED,

    status                              VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','submitted')),
    submitted_at                            TIMESTAMPTZ,
    reminder_count                             INT DEFAULT 0,
    last_reminded_at                              TIMESTAMPTZ,

    created_at                                       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (pms_360_cycle_id, evaluator_employee_id)
);

CREATE TABLE IF NOT EXISTS pms_360_ratings (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    pms_360_evaluator_id      UUID       NOT NULL REFERENCES pms_360_evaluators(id),
    pms_360_competency_id        UUID    NOT NULL REFERENCES pms_360_competencies(id),
    company_id             UUID         NOT NULL,

    score                       INT NOT NULL CHECK (score BETWEEN 1 AND 10),
    comment                        TEXT,

    created_at                        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (pms_360_evaluator_id, pms_360_competency_id)
);

CREATE TABLE IF NOT EXISTS pms_360_idp_items (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    pms_360_cycle_id          UUID       NOT NULL REFERENCES pms_360_cycles(id),
    company_id             UUID         NOT NULL,

    gap_description              TEXT NOT NULL,
    action_plan                     TEXT NOT NULL,
    linked_lms_course_id               UUID,  -- FK target depends on LMS schema, kept loose intentionally

    progress_pct                          NUMERIC(5,2) DEFAULT 0,
    target_date                              DATE,
    completed_at                                TIMESTAMPTZ,

    created_at                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pms_360_calibration (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    reviewer_employee_id   UUID NOT NULL REFERENCES employees(id),

    review_period          VARCHAR(20) NOT NULL,  -- e.g. '2026-Q3'
    avg_rating_given           NUMERIC(4,2),
    company_avg_rating            NUMERIC(4,2),
    bias_flag                        VARCHAR(20) DEFAULT 'none' CHECK (bias_flag IN ('none','lenient','strict')),

    computed_at                          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (reviewer_employee_id, review_period)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_pc_company       ON pms_360_cycles(employee_id);
CREATE INDEX IF NOT EXISTS idx_pc_status            ON pms_360_cycles(status);
CREATE INDEX IF NOT EXISTS idx_pe_cycle                ON pms_360_evaluators(pms_360_cycle_id);
CREATE INDEX IF NOT EXISTS idx_pe_evaluator                ON pms_360_evaluators(evaluator_employee_id);
CREATE INDEX IF NOT EXISTS idx_pe_pending_reminder             ON pms_360_evaluators(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pr_evaluator                        ON pms_360_ratings(pms_360_evaluator_id);
CREATE INDEX IF NOT EXISTS idx_pidp_cycle                              ON pms_360_idp_items(pms_360_cycle_id);
CREATE INDEX IF NOT EXISTS idx_pcal_reviewer                              ON pms_360_calibration(reviewer_employee_id, review_period);
CREATE INDEX IF NOT EXISTS idx_pcal_biased                                    ON pms_360_calibration(bias_flag) WHERE bias_flag != 'none';

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_pms360_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_pc_upd
    BEFORE UPDATE ON pms_360_cycles
    FOR EACH ROW EXECUTE FUNCTION fn_pms360_updated_at();

CREATE TRIGGER trg_pidp_upd
    BEFORE UPDATE ON pms_360_idp_items
    FOR EACH ROW EXECUTE FUNCTION fn_pms360_updated_at();

-- Mark evaluator submitted + check if the cycle should auto-advance to
-- 'completed' once all evaluators are in
CREATE OR REPLACE FUNCTION fn_check_cycle_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE pending_count INT;
BEGIN
    IF NEW.status = 'submitted' AND OLD.status = 'pending' THEN
        NEW.submitted_at := NOW();

        SELECT COUNT(*) INTO pending_count FROM pms_360_evaluators
        WHERE pms_360_cycle_id = NEW.pms_360_cycle_id AND status = 'pending' AND id != NEW.id;

        IF pending_count = 0 THEN
            UPDATE pms_360_cycles SET status = 'completed' WHERE id = NEW.pms_360_cycle_id;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_completion
    BEFORE UPDATE OF status ON pms_360_evaluators
    FOR EACH ROW EXECUTE FUNCTION fn_check_cycle_completion();

-- Anonymity gate: a cycle can only move to 'released' if anonymous
-- (peer/direct_report) categories each have >= min_reviewers_for_anonymity
-- submissions, OR contain zero anonymous evaluators for that category
CREATE OR REPLACE FUNCTION fn_block_release_below_anonymity_threshold()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE peer_submitted INT; report_submitted INT;
BEGIN
    IF NEW.status = 'released' AND OLD.status = 'completed' THEN
        SELECT COUNT(*) INTO peer_submitted FROM pms_360_evaluators
        WHERE pms_360_cycle_id = NEW.id AND relationship = 'peer' AND status = 'submitted';
        SELECT COUNT(*) INTO report_submitted FROM pms_360_evaluators
        WHERE pms_360_cycle_id = NEW.id AND relationship = 'direct_report' AND status = 'submitted';

        IF (peer_submitted > 0 AND peer_submitted < NEW.min_reviewers_for_anonymity)
           OR (report_submitted > 0 AND report_submitted < NEW.min_reviewers_for_anonymity) THEN
            RAISE EXCEPTION 'Cannot release: anonymous feedback categories must each have at least % submissions to protect rater identity.', NEW.min_reviewers_for_anonymity;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_release_anonymity
    BEFORE UPDATE OF status ON pms_360_cycles
    FOR EACH ROW EXECUTE FUNCTION fn_block_release_below_anonymity_threshold();

-- On cycle creation: notify the reviewee + reporting manager, reusing
-- the EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_360_cycle_started()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID;
BEGIN
    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    VALUES
      (NEW.company_id, 'pms_360_cycles', NEW.id, '360_cycle_started', NEW.employee_id, 'direct_party',
       format('Your 360-degree review cycle "%s" has started.', NEW.cycle_label), NOW());

    SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
    IF mgr_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'pms_360_cycles', NEW.id, '360_cycle_started', mgr_id, 'reporting_manager',
           format('A 360-degree review cycle has started for your direct report.'), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_cycle_started
    AFTER INSERT ON pms_360_cycles
    FOR EACH ROW EXECUTE FUNCTION fn_notify_360_cycle_started();

-- ================================================================
-- VIEWS
-- ================================================================

-- Competency radar data: averaged scores per relationship type per competency
CREATE OR REPLACE VIEW v_pms_360_radar AS
SELECT
    pc.id AS cycle_id, pc.employee_id, comp.name AS competency_name,
    ROUND(AVG(r.score) FILTER (WHERE ev.relationship = 'self'), 1) AS self_score,
    ROUND(AVG(r.score) FILTER (WHERE ev.relationship = 'peer'), 1) AS peer_score,
    ROUND(AVG(r.score) FILTER (WHERE ev.relationship = 'manager'), 1) AS manager_score,
    ROUND(AVG(r.score) FILTER (WHERE ev.relationship = 'direct_report'), 1) AS report_score,
    pc.company_id
FROM pms_360_cycles pc
JOIN pms_360_evaluators ev ON ev.pms_360_cycle_id = pc.id
JOIN pms_360_ratings r ON r.pms_360_evaluator_id = ev.id
JOIN pms_360_competencies comp ON r.pms_360_competency_id = comp.id
WHERE pc.status = 'released'
GROUP BY pc.id, pc.employee_id, comp.name, pc.company_id;

-- Feedback Hub: incoming (about me) + outgoing (I owe others)
CREATE OR REPLACE VIEW v_pms_360_incoming AS
SELECT pc.employee_id AS reviewee_id, ev.*, e.first_name AS evaluator_first_name, e.last_name AS evaluator_last_name
FROM pms_360_evaluators ev
JOIN pms_360_cycles pc ON ev.pms_360_cycle_id = pc.id
JOIN employees e ON ev.evaluator_employee_id = e.id;

CREATE OR REPLACE VIEW v_pms_360_outgoing AS
SELECT ev.evaluator_employee_id, pc.employee_id AS about_employee_id, e.first_name, e.last_name,
       ev.relationship, ev.status, ev.pms_360_cycle_id
FROM pms_360_evaluators ev
JOIN pms_360_cycles pc ON ev.pms_360_cycle_id = pc.id
JOIN employees e ON pc.employee_id = e.id
WHERE ev.status = 'pending';

-- Pending reminders (for the automatic reminder workflow)
CREATE OR REPLACE VIEW v_pms_360_pending_reminders AS
SELECT ev.*, pc.cycle_label, e.first_name, e.last_name
FROM pms_360_evaluators ev
JOIN pms_360_cycles pc ON ev.pms_360_cycle_id = pc.id
JOIN employees e ON ev.evaluator_employee_id = e.id
WHERE ev.status = 'pending'
  AND (ev.last_reminded_at IS NULL OR ev.last_reminded_at < NOW() - INTERVAL '3 days');

-- Calibration flags for HR review
CREATE OR REPLACE VIEW v_pms_360_calibration_flags AS
SELECT cal.*, e.first_name, e.last_name
FROM pms_360_calibration cal
JOIN employees e ON cal.reviewer_employee_id = e.id
WHERE cal.bias_flag != 'none';
