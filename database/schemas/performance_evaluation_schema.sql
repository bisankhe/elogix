-- ================================================================
-- FILE: database/schemas/performance_evaluation_schema.sql
-- NepHR Pro — Performance & Talent Management > Goal & Performance >
-- Performance Evaluation Module (7 pages)
--
-- Design note: this module sits ABOVE the Goal Management layer built
-- in prior sessions and consumes it rather than duplicating it:
--   - Performance Appraisal pulls live scores from v_kra_jd_match_dashboard,
--     v_kpi_dashboard, v_okr_tree_dashboard (no re-capture of those scores)
--   - 360 Degree Feedback (page 3) is the RESULTS/INSIGHTS view over
--     RELEASED pms_360_cycles -- the cycle-management UI itself lives in
--     Goal Management > 360 Degree PMS (pms_360_schema.sql); this page
--     never creates or edits a cycle, only displays development-focused
--     summaries from v_pms_360_radar
--   - Continuous Feedback feeds INTO Performance Appraisal as evidence
--   - Performance Review consolidates Appraisal + Continuous Feedback +
--     Behaviour Evaluation for the whole-cycle discussion
--   - PIP links to performance_appraisals + training (loose FK, schema-
--     agnostic since LMS schema may evolve independently)
-- All four reuse goal_audit_trail (goal_tracking_schema.sql) and
-- transaction_notifications (kra_management_schema.sql) directly.
--
--   - performance_appraisals     (formal cycle, pulls KRA/KPI/OKR scores)
--   - continuous_feedback_entries (praise/checkin/constructive log)
--   - behaviour_evaluations       (soft-skill competency scoring)
--   - performance_reviews          (whole-cycle discussion record)
--   - performance_improvement_plans (PIP with milestones)
--   - pip_milestones                 (structured, measurable goals)
--
-- Nepal Labour Act 2074 Section 112: criteria communicated before period
-- starts; post-evaluation discussion mandatory; disagreement/review
-- right; Section 142/52(1): 3 consecutive unsatisfactory appraisals =
-- termination grounds, mandatory 7-day written-explanation period first.
-- Behavioral assessments must be non-discriminatory (gender/caste/age).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. PERFORMANCE APPRAISAL
-- ================================================================
CREATE TABLE IF NOT EXISTS performance_appraisals (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    cycle_label                  VARCHAR(50) NOT NULL,  -- e.g. 'Annual FY 2082/83'
    cycle_start_date                 DATE NOT NULL,
    cycle_end_date                      DATE NOT NULL,

    -- Snapshotted goal scores (pulled live at appraisal time, then frozen)
    kra_avg_pct                            NUMERIC(5,2),
    kpi_avg_pct                               NUMERIC(5,2),
    okr_avg_pct                                  NUMERIC(5,2),

    self_rating                                     INT CHECK (self_rating BETWEEN 1 AND 5),
    manager_rating                                     INT CHECK (manager_rating BETWEEN 1 AND 5),
    final_rating                                          INT CHECK (final_rating BETWEEN 1 AND 5),

    manager_comments                                         TEXT,

    -- Section 112: criteria must be communicated BEFORE the period starts
    criteria_communicated_at                                    TIMESTAMPTZ,

    -- Disagreement/review right
    employee_disagreement_note                                     TEXT,
    review_requested                                                  BOOLEAN DEFAULT FALSE,
    review_resolved_at                                                   TIMESTAMPTZ,

    status                                                                  VARCHAR(20) DEFAULT 'pending_manager'
                                                                            CHECK (status IN ('pending_manager','acknowledged','disputed')),
    acknowledged_at                                                            TIMESTAMPTZ,

    created_by                                                                    UUID,
    created_at                                                                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. CONTINUOUS FEEDBACK
-- ================================================================
CREATE TABLE IF NOT EXISTS continuous_feedback_entries (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    from_employee_id          UUID       NOT NULL REFERENCES employees(id),
    to_employee_id               UUID    NOT NULL REFERENCES employees(id),

    feedback_type                   VARCHAR(20) NOT NULL CHECK (feedback_type IN ('praise','checkin','constructive')),
    message                            TEXT NOT NULL,

    -- Links this feedback as evidence for a later appraisal
    linked_appraisal_id                   UUID REFERENCES performance_appraisals(id),

    created_at                               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. BEHAVIOUR EVALUATION
-- ================================================================
CREATE TABLE IF NOT EXISTS behaviour_evaluations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    evaluator_employee_id       UUID    NOT NULL REFERENCES employees(id),

    cycle_label                    VARCHAR(50) NOT NULL,

    -- Standardized dimensions (company-wide, same rubric every department)
    communication_score               INT CHECK (communication_score BETWEEN 1 AND 10),
    teamwork_score                       INT CHECK (teamwork_score BETWEEN 1 AND 10),
    core_values_score                       INT CHECK (core_values_score BETWEEN 1 AND 10),
    adaptability_score                         INT CHECK (adaptability_score BETWEEN 1 AND 10),
    integrity_score                               INT CHECK (integrity_score BETWEEN 1 AND 10),

    overall_avg                                      NUMERIC(4,2) GENERATED ALWAYS AS (
                                                      ROUND((COALESCE(communication_score,0) + COALESCE(teamwork_score,0) +
                                                             COALESCE(core_values_score,0) + COALESCE(adaptability_score,0) +
                                                             COALESCE(integrity_score,0))::NUMERIC / 5, 2)
                                                    ) STORED,

    -- Evidence requirement: any score below threshold needs cited proof
    evidence_note                                        TEXT,
    requires_evidence                                       BOOLEAN GENERATED ALWAYS AS (
                                                             COALESCE(communication_score,10) < 6 OR COALESCE(teamwork_score,10) < 6 OR
                                                             COALESCE(core_values_score,10) < 6 OR COALESCE(adaptability_score,10) < 6 OR
                                                             COALESCE(integrity_score,10) < 6
                                                           ) STORED,

    created_at                                                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. PERFORMANCE REVIEW (whole-cycle discussion, consolidates the rest)
-- ================================================================
CREATE TABLE IF NOT EXISTS performance_reviews (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    performance_appraisal_id    UUID    REFERENCES performance_appraisals(id),

    cycle_label                    VARCHAR(50) NOT NULL,
    meeting_date                      DATE,

    discussion_notes                     TEXT,
    career_development_topics               TEXT[],

    status                                     VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed')),
    completed_at                                  TIMESTAMPTZ,

    created_at                                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. PERFORMANCE IMPROVEMENT PLAN (PIP)
-- ================================================================
CREATE TABLE IF NOT EXISTS performance_improvement_plans (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    triggering_appraisal_id     UUID    REFERENCES performance_appraisals(id),

    reason                          TEXT NOT NULL,
    duration_days                      INT NOT NULL CHECK (duration_days BETWEEN 30 AND 90),
    start_date                            DATE NOT NULL,
    end_date                                 DATE GENERATED ALWAYS AS (start_date + duration_days) STORED,

    linked_training_note                        VARCHAR(300),
    checkin_frequency                              VARCHAR(20) DEFAULT 'weekly' CHECK (checkin_frequency IN ('weekly','bi_weekly')),

    -- Section 112/142: mandatory 7-day written-explanation right BEFORE
    -- any PIP/disciplinary escalation
    explanation_period_status                          VARCHAR(20) DEFAULT 'pending'
                                                       CHECK (explanation_period_status IN ('pending','completed','waived_by_employee')),
    explanation_note                                       TEXT,
    explanation_deadline                                      DATE,

    status                                                       VARCHAR(20) DEFAULT 'active'
                                                                 CHECK (status IN ('active','completed_success','completed_unsuccessful')),

    created_by                                                       UUID,
    created_at                                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pip_milestones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pip_id              UUID NOT NULL REFERENCES performance_improvement_plans(id),
    company_id          UUID NOT NULL,

    goal_description       TEXT NOT NULL,
    target_date                DATE NOT NULL,
    progress_pct                  NUMERIC(5,2) DEFAULT 0,
    completed_at                     TIMESTAMPTZ,

    created_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_pa_employee       ON performance_appraisals(employee_id, cycle_label);
CREATE INDEX IF NOT EXISTS idx_pa_status             ON performance_appraisals(status);
CREATE INDEX IF NOT EXISTS idx_pa_disputed               ON performance_appraisals(review_requested) WHERE review_requested;

CREATE INDEX IF NOT EXISTS idx_cfe_to                        ON continuous_feedback_entries(to_employee_id);
CREATE INDEX IF NOT EXISTS idx_cfe_from                          ON continuous_feedback_entries(from_employee_id);
CREATE INDEX IF NOT EXISTS idx_cfe_appraisal                         ON continuous_feedback_entries(linked_appraisal_id);

CREATE INDEX IF NOT EXISTS idx_be_employee                              ON behaviour_evaluations(employee_id, cycle_label);
CREATE INDEX IF NOT EXISTS idx_be_below_threshold                           ON behaviour_evaluations(overall_avg) WHERE overall_avg < 6;

CREATE INDEX IF NOT EXISTS idx_pr_employee                                       ON performance_reviews(employee_id, cycle_label);
CREATE INDEX IF NOT EXISTS idx_pr_appraisal                                          ON performance_reviews(performance_appraisal_id);

CREATE INDEX IF NOT EXISTS idx_pip_employee                                              ON performance_improvement_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_pip_status                                                    ON performance_improvement_plans(status);
CREATE INDEX IF NOT EXISTS idx_pip_pending_explanation                                           ON performance_improvement_plans(explanation_period_status) WHERE explanation_period_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pm_pip                                                               ON pip_milestones(pip_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_perf_eval_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_pa_upd
    BEFORE UPDATE ON performance_appraisals
    FOR EACH ROW EXECUTE FUNCTION fn_perf_eval_updated_at();

CREATE TRIGGER trg_pip_upd
    BEFORE UPDATE ON performance_improvement_plans
    FOR EACH ROW EXECUTE FUNCTION fn_perf_eval_updated_at();

-- Auto-pull live KRA/KPI/OKR averages from the existing Goal Management
-- views at appraisal creation time (snapshot, not a live join, so the
-- record stays stable even if underlying goals change later)
CREATE OR REPLACE FUNCTION fn_snapshot_goal_scores()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    SELECT ROUND(AVG(jd_match_pct), 2) INTO NEW.kra_avg_pct FROM v_kra_jd_match_dashboard WHERE employee_id = NEW.employee_id;
    SELECT ROUND(AVG(progress_pct), 2) INTO NEW.kpi_avg_pct FROM v_kpi_dashboard WHERE employee_id = NEW.employee_id;
    SELECT ROUND(AVG(overall_score) * 100, 2) INTO NEW.okr_avg_pct FROM v_okr_tree_dashboard WHERE employee_id = NEW.employee_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_snapshot_scores
    BEFORE INSERT ON performance_appraisals
    FOR EACH ROW EXECUTE FUNCTION fn_snapshot_goal_scores();

-- Block evidence-free low behaviour scores (DB-level enforcement of the
-- "specific evidence required for scores below 6" rule)
CREATE OR REPLACE FUNCTION fn_require_behaviour_evidence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.requires_evidence AND (NEW.evidence_note IS NULL OR LENGTH(TRIM(NEW.evidence_note)) < 10) THEN
        RAISE EXCEPTION 'A score below 6 requires specific, cited evidence (minimum 10 characters) -- vague impressions are not permitted.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_require_evidence
    BEFORE INSERT OR UPDATE OF communication_score, teamwork_score, core_values_score, adaptability_score, integrity_score, evidence_note
    ON behaviour_evaluations
    FOR EACH ROW EXECUTE FUNCTION fn_require_behaviour_evidence();

-- Block PIP creation/escalation if the 7-day explanation period hasn't
-- been completed (Section 112/142 enforcement)
CREATE OR REPLACE FUNCTION fn_block_pip_without_explanation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status != 'active' AND OLD.status = 'active' AND NEW.explanation_period_status = 'pending' THEN
        RAISE EXCEPTION 'Cannot finalize this PIP: the mandatory 7-day written-explanation period has not been completed or waived.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_pip_no_explanation
    BEFORE UPDATE OF status ON performance_improvement_plans
    FOR EACH ROW EXECUTE FUNCTION fn_block_pip_without_explanation();

-- Notify the employee + reporting manager on appraisal finalization and
-- PIP publication, reusing the EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_appraisal_finalized()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID;
BEGIN
    IF NEW.status = 'acknowledged' AND OLD.status = 'pending_manager' THEN
        NEW.acknowledged_at := NOW();
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'performance_appraisals', NEW.id, 'appraisal_finalized', NEW.employee_id, 'direct_party',
           format('Your performance appraisal for %s has been finalized with a rating of %s/5.', NEW.cycle_label, NEW.final_rating), NOW());

        SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
        IF mgr_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'performance_appraisals', NEW.id, 'appraisal_finalized', mgr_id, 'reporting_manager',
               format('Appraisal finalized for your direct report (%s/5).', NEW.final_rating), NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_appraisal
    BEFORE UPDATE OF status ON performance_appraisals
    FOR EACH ROW EXECUTE FUNCTION fn_notify_appraisal_finalized();

CREATE OR REPLACE FUNCTION fn_notify_pip_published()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID;
BEGIN
    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    VALUES
      (NEW.company_id, 'performance_improvement_plans', NEW.id, 'pip_published', NEW.employee_id, 'direct_party',
       format('A Performance Improvement Plan has been initiated, running %s days from %s.', NEW.duration_days, NEW.start_date), NOW());

    SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
    IF mgr_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'performance_improvement_plans', NEW.id, 'pip_published', mgr_id, 'reporting_manager',
           'A Performance Improvement Plan has been initiated for your direct report.', NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_pip
    AFTER INSERT ON performance_improvement_plans
    FOR EACH ROW EXECUTE FUNCTION fn_notify_pip_published();

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW v_performance_appraisal_dashboard AS
SELECT pa.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM performance_appraisals pa
JOIN employees e ON pa.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;

CREATE OR REPLACE VIEW v_continuous_feedback_feed AS
SELECT
    cfe.*, fe.first_name AS from_first_name, fe.last_name AS from_last_name,
    te.first_name AS to_first_name, te.last_name AS to_last_name
FROM continuous_feedback_entries cfe
JOIN employees fe ON cfe.from_employee_id = fe.id
JOIN employees te ON cfe.to_employee_id = te.id
ORDER BY cfe.created_at DESC;

CREATE OR REPLACE VIEW v_behaviour_evaluation_dashboard AS
SELECT be.*, e.employee_code, e.first_name, e.last_name, e.department_id, ev.first_name AS evaluator_first_name, ev.last_name AS evaluator_last_name
FROM behaviour_evaluations be
JOIN employees e ON be.employee_id = e.id
JOIN employees ev ON be.evaluator_employee_id = ev.id;

-- Whole-cycle evidence rollup for the Performance Review page
CREATE OR REPLACE VIEW v_performance_review_evidence AS
SELECT
    pr.*, e.employee_code, e.first_name, e.last_name,
    pa.final_rating AS appraisal_rating,
    (SELECT COUNT(*) FROM continuous_feedback_entries cfe WHERE cfe.to_employee_id = pr.employee_id
       AND cfe.created_at BETWEEN pa.cycle_start_date AND pa.cycle_end_date) AS continuous_feedback_count,
    (SELECT ROUND(AVG(overall_avg),2) FROM behaviour_evaluations be WHERE be.employee_id = pr.employee_id AND be.cycle_label = pr.cycle_label) AS behaviour_avg
FROM performance_reviews pr
JOIN employees e ON pr.employee_id = e.id
LEFT JOIN performance_appraisals pa ON pr.performance_appraisal_id = pa.id;

CREATE OR REPLACE VIEW v_pip_dashboard AS
SELECT pip.*, e.employee_code, e.first_name, e.last_name, e.department_id,
    (SELECT jsonb_agg(jsonb_build_object('goal', pm.goal_description, 'progress_pct', pm.progress_pct, 'target_date', pm.target_date))
       FROM pip_milestones pm WHERE pm.pip_id = pip.id) AS milestones
FROM performance_improvement_plans pip
JOIN employees e ON pip.employee_id = e.id;

-- Rating distribution (the bell-curve report)
CREATE OR REPLACE VIEW v_rating_distribution AS
SELECT final_rating, COUNT(*) AS employee_count, company_id
FROM performance_appraisals WHERE final_rating IS NOT NULL
GROUP BY final_rating, company_id;

-- Appraisal completion rate by department
CREATE OR REPLACE VIEW v_appraisal_completion_by_dept AS
SELECT
    d.name AS department_name,
    COUNT(*) AS total_assigned,
    COUNT(*) FILTER (WHERE pa.status = 'acknowledged') AS completed,
    ROUND(COUNT(*) FILTER (WHERE pa.status = 'acknowledged')::NUMERIC / COUNT(*) * 100, 1) AS completion_pct,
    pa.company_id
FROM performance_appraisals pa
JOIN employees e ON pa.employee_id = e.id
JOIN departments d ON e.department_id = d.id
GROUP BY d.name, pa.company_id;
