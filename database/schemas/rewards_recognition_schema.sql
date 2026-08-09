-- ================================================================
-- FILE: database/schemas/rewards_recognition_schema.sql
-- NepHR Pro — Performance & Talent Management > Goal & Performance >
-- Rewards & Recognition Module (6 pages)
--
-- Design note: Promotion/Incentive/Training/Termination Recommendation
-- pages are AI-DRIVEN DECISION-SUPPORT layers that read from existing
-- performance data (performance_appraisals, performance_improvement_plans,
-- v_kpi_dashboard, salary_range_bands, v_pms_360_radar) rather than
-- re-capturing it. Termination Recommendation explicitly does NOT
-- duplicate exit_management_schema.sql's employee_resignations/
-- exit_clearances tables -- it is upstream of that system, flagging
-- candidates and only "graduating" a case to Exit Management once
-- legally eligible (3 consecutive unsatisfactory appraisals + 7-day
-- explanation completed). Reuses transaction_notifications.
--
--   - reward_requests             (spot bonus / profit-sharing, tiered approval)
--   - recognition_kudos           (peer-to-peer points + leaderboard)
--   - promotion_recommendations   (readiness score, multi-manager calibration)
--   - incentive_recommendations   (KPI-tied bonus calculator)
--   - training_recommendations    (skill-gap -> course mapping)
--   - termination_flags           (confidential; feeds Exit Management
--                                   only once legally eligible)
--
-- Nepal Labour Act 2074: Sections 34/35 (Internal Work Procedure must
-- document reward/recognition criteria); Section 23 (withholding
-- promotion/increment as disciplinary measure); Section 40 (mandatory
-- annual training budget/quota); Section 142 (3 consecutive
-- unsatisfactory appraisals + 7-day explanation right before lawful
-- termination for poor performance).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. REWARD PROGRAM (spot bonus / profit-sharing, tiered approval)
-- ================================================================
CREATE TABLE IF NOT EXISTS reward_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    reward_type                  VARCHAR(30) NOT NULL CHECK (reward_type IN ('spot_bonus','profit_sharing')),
    amount_npr                      NUMERIC(12,2) NOT NULL,
    reason                              TEXT NOT NULL,

    requested_by                          UUID NOT NULL,
    approval_tier                            VARCHAR(20) GENERATED ALWAYS AS (
                                             CASE WHEN amount_npr <= 20000 THEN 'manager'
                                                  WHEN amount_npr <= 30000 THEN 'hr'
                                                  ELSE 'director' END
                                           ) STORED,

    status                                       VARCHAR(20) DEFAULT 'pending'
                                                 CHECK (status IN ('pending','approved','rejected')),
    approved_by                                     UUID,
    approved_at                                        TIMESTAMPTZ,

    created_at                                            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. RECOGNITION PROGRAM (peer kudos, points, leaderboard)
-- ================================================================
CREATE TABLE IF NOT EXISTS recognition_kudos (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    from_employee_id          UUID       NOT NULL REFERENCES employees(id),
    to_employee_id               UUID    NOT NULL REFERENCES employees(id),

    core_value                      VARCHAR(50) NOT NULL,
    message                            TEXT NOT NULL,
    points                                 INT DEFAULT 10 CHECK (points BETWEEN 5 AND 50),

    created_at                               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. PROMOTION RECOMMENDATION
-- ================================================================
CREATE TABLE IF NOT EXISTS promotion_recommendations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    current_role_label           VARCHAR(150),
    next_role_label                  VARCHAR(150),

    tenure_years                        NUMERIC(4,2),
    avg_appraisal_rating                   NUMERIC(3,2),  -- pulled from performance_appraisals
    compa_ratio                               NUMERIC(4,2),  -- pulled from v_compa_ratio_analysis

    readiness_score                              NUMERIC(5,2) GENERATED ALWAYS AS (
                                                  ROUND(LEAST(tenure_years / 3.0, 1) * 30 +
                                                        (avg_appraisal_rating / 5.0) * 50 +
                                                        LEAST(compa_ratio, 1.0) * 20, 1)
                                                ) STORED,

    status                                            VARCHAR(20) DEFAULT 'under_review'
                                                      CHECK (status IN ('under_review','recommended','rejected')),

    created_at                                              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotion_calibrations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_recommendation_id  UUID NOT NULL REFERENCES promotion_recommendations(id),
    company_id          UUID NOT NULL,

    calibrator_employee_id  UUID NOT NULL REFERENCES employees(id),
    calibrator_role          VARCHAR(30) NOT NULL CHECK (calibrator_role IN ('direct_manager','skip_level','hr_partner')),
    reviewed_at                 TIMESTAMPTZ DEFAULT NOW(),
    comments                       TEXT,

    UNIQUE (promotion_recommendation_id, calibrator_role)
);

-- ================================================================
-- 4. INCENTIVE RECOMMENDATION (KPI-tied, distinct from reward_requests)
-- ================================================================
CREATE TABLE IF NOT EXISTS incentive_recommendations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    kpi_definition_id           UUID    REFERENCES kpi_definitions(id),

    kpi_basis_label                 VARCHAR(200),
    kpi_actual_pct                     NUMERIC(6,2),

    base_incentive_npr                    NUMERIC(12,2) NOT NULL,
    calculated_npr                           NUMERIC(12,2) GENERATED ALWAYS AS (
                                             ROUND(base_incentive_npr * kpi_actual_pct / 100, 2)
                                           ) STORED,
    manager_adjusted_npr                        NUMERIC(12,2),
    budget_cap_npr                                 NUMERIC(12,2) NOT NULL,
    exceeds_budget                                    BOOLEAN GENERATED ALWAYS AS (
                                                       COALESCE(manager_adjusted_npr, calculated_npr) > budget_cap_npr
                                                     ) STORED,

    status                                                VARCHAR(20) DEFAULT 'pending_approval'
                                                          CHECK (status IN ('pending_approval','approved','rejected')),
    approved_by                                              UUID,

    created_at                                                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. TRAINING RECOMMENDATION
-- ================================================================
CREATE TABLE IF NOT EXISTS training_recommendations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    gap_source                   VARCHAR(30) NOT NULL
                                 CHECK (gap_source IN ('behaviour_evaluation','pip_milestone','360_feedback','appraisal')),
    gap_source_record_id            UUID,  -- polymorphic pointer into the source table
    gap_identified                     TEXT NOT NULL,

    recommended_course                    VARCHAR(300) NOT NULL,
    provider                                 VARCHAR(100),  -- 'Internal LMS' or external vendor name

    enrolled                                    BOOLEAN DEFAULT FALSE,
    enrolled_at                                    TIMESTAMPTZ,
    progress_pct                                      NUMERIC(5,2) DEFAULT 0,
    completed_at                                         TIMESTAMPTZ,

    created_at                                              TIMESTAMPTZ DEFAULT NOW()
);

-- Statutory annual training quota tracking (Section 40)
CREATE TABLE IF NOT EXISTS statutory_training_quota (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    fiscal_year_label VARCHAR(20) NOT NULL,
    statutory_min_pct NUMERIC(5,2) DEFAULT 30,
    UNIQUE (company_id, fiscal_year_label)
);

-- ================================================================
-- 6. TERMINATION RECOMMENDATION (highly confidential; upstream of
-- exit_management_schema.sql's employee_resignations/exit_clearances)
-- ================================================================
CREATE TABLE IF NOT EXISTS termination_flags (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    consecutive_unsatisfactory_appraisals INT DEFAULT 0,
    unaddressed_pip_count                    INT DEFAULT 0,
    attendance_breach_count                     INT DEFAULT 0,
    documented_warnings_count                      INT DEFAULT 0,

    -- Section 142: legally eligible only at 3+ consecutive cycles
    legally_eligible                                  BOOLEAN GENERATED ALWAYS AS (
                                                       consecutive_unsatisfactory_appraisals >= 3
                                                     ) STORED,

    explanation_period_status                            VARCHAR(20) DEFAULT 'not_applicable'
                                                         CHECK (explanation_period_status IN ('not_applicable','pending','completed')),
    explanation_completed_at                                TIMESTAMPTZ,

    due_process_status                                         VARCHAR(20) DEFAULT 'monitoring'
                                                               CHECK (due_process_status IN ('monitoring','pip_active','eligible','escalated','closed')),
    recommendation                                                VARCHAR(30) DEFAULT 'continue_pip'
                                                                  CHECK (recommendation IN ('continue_pip','escalate_to_exit','no_action')),

    -- Set only once a case is actually escalated -- the integration
    -- point with the existing exit management system, never forced
    linked_resignation_id                                            UUID REFERENCES employee_resignations(id),

    -- Access logging for this highly confidential table
    last_viewed_by                                                       UUID,
    last_viewed_at                                                          TIMESTAMPTZ,

    created_at                                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS termination_flag_access_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    termination_flag_id UUID NOT NULL REFERENCES termination_flags(id),
    viewed_by               UUID NOT NULL,
    viewed_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_rr_employee       ON reward_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_rr_status             ON reward_requests(status);
CREATE INDEX IF NOT EXISTS idx_rk_to                     ON recognition_kudos(to_employee_id);
CREATE INDEX IF NOT EXISTS idx_rk_from                       ON recognition_kudos(from_employee_id);

CREATE INDEX IF NOT EXISTS idx_pr_employee                       ON promotion_recommendations(employee_id);
CREATE INDEX IF NOT EXISTS idx_pr_status                             ON promotion_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_pc_recommendation                         ON promotion_calibrations(promotion_recommendation_id);

CREATE INDEX IF NOT EXISTS idx_ir_employee                                  ON incentive_recommendations(employee_id);
CREATE INDEX IF NOT EXISTS idx_ir_status                                        ON incentive_recommendations(status);

CREATE INDEX IF NOT EXISTS idx_tr_employee                                          ON training_recommendations(employee_id);
CREATE INDEX IF NOT EXISTS idx_tr_unenrolled                                            ON training_recommendations(enrolled) WHERE NOT enrolled;

CREATE INDEX IF NOT EXISTS idx_tf_employee                                                  ON termination_flags(employee_id);
CREATE INDEX IF NOT EXISTS idx_tf_eligible                                                      ON termination_flags(legally_eligible) WHERE legally_eligible;
CREATE INDEX IF NOT EXISTS idx_tfal_flag                                                            ON termination_flag_access_log(termination_flag_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_rewards_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_tf_upd
    BEFORE UPDATE ON termination_flags
    FOR EACH ROW EXECUTE FUNCTION fn_rewards_updated_at();

-- Notify employee + reporting manager when a reward is approved
CREATE OR REPLACE FUNCTION fn_notify_reward_approved()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID;
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        NEW.approved_at := NOW();
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'reward_requests', NEW.id, 'reward_approved', NEW.employee_id, 'direct_party',
           format('Your %s of NPR %s has been approved.', NEW.reward_type, NEW.amount_npr), NOW());

        SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
        IF mgr_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'reward_requests', NEW.id, 'reward_approved', mgr_id, 'reporting_manager',
               format('A reward has been approved for your direct report (NPR %s).', NEW.amount_npr), NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_reward
    BEFORE UPDATE OF status ON reward_requests
    FOR EACH ROW EXECUTE FUNCTION fn_notify_reward_approved();

-- Block escalation to Exit Management unless legally eligible AND the
-- 7-day explanation period is completed (hard Section 142 enforcement)
CREATE OR REPLACE FUNCTION fn_block_termination_escalation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.due_process_status = 'escalated' AND OLD.due_process_status != 'escalated' THEN
        IF NOT NEW.legally_eligible THEN
            RAISE EXCEPTION 'Cannot escalate: requires 3 consecutive unsatisfactory appraisals (currently %).', NEW.consecutive_unsatisfactory_appraisals;
        END IF;
        IF NEW.explanation_period_status != 'completed' THEN
            RAISE EXCEPTION 'Cannot escalate: the mandatory 7-day written-explanation period has not been completed.';
        END IF;
        NEW.recommendation := 'escalate_to_exit';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_escalation
    BEFORE UPDATE OF due_process_status ON termination_flags
    FOR EACH ROW EXECUTE FUNCTION fn_block_termination_escalation();

-- Log every view of a termination flag (confidentiality audit trail)
CREATE OR REPLACE FUNCTION fn_log_termination_view()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO termination_flag_access_log (termination_flag_id, viewed_by, viewed_at)
    VALUES (NEW.id, NEW.last_viewed_by, NOW());
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_log_view
    AFTER UPDATE OF last_viewed_by ON termination_flags
    FOR EACH ROW EXECUTE FUNCTION fn_log_termination_view();

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW v_reward_program_dashboard AS
SELECT rr.*, e.employee_code, e.first_name, e.last_name
FROM reward_requests rr JOIN employees e ON rr.employee_id = e.id;

CREATE OR REPLACE VIEW v_recognition_leaderboard AS
SELECT
    e.id AS employee_id, e.employee_code, e.first_name, e.last_name,
    SUM(rk.points) AS total_points, COUNT(*) AS kudos_received,
    rk.company_id
FROM recognition_kudos rk
JOIN employees e ON rk.to_employee_id = e.id
WHERE rk.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY e.id, e.employee_code, e.first_name, e.last_name, rk.company_id
ORDER BY total_points DESC;

CREATE OR REPLACE VIEW v_promotion_dashboard AS
SELECT
    pr.*, e.employee_code, e.first_name, e.last_name,
    (SELECT jsonb_agg(jsonb_build_object('role', pc.calibrator_role, 'reviewed_at', pc.reviewed_at))
       FROM promotion_calibrations pc WHERE pc.promotion_recommendation_id = pr.id) AS calibrations,
    (SELECT COUNT(*) FROM promotion_calibrations pc WHERE pc.promotion_recommendation_id = pr.id) AS calibration_count
FROM promotion_recommendations pr
JOIN employees e ON pr.employee_id = e.id;

CREATE OR REPLACE VIEW v_incentive_dashboard AS
SELECT ir.*, e.employee_code, e.first_name, e.last_name
FROM incentive_recommendations ir JOIN employees e ON ir.employee_id = e.id;

CREATE OR REPLACE VIEW v_training_recommendation_dashboard AS
SELECT tr.*, e.employee_code, e.first_name, e.last_name
FROM training_recommendations tr JOIN employees e ON tr.employee_id = e.id;

CREATE OR REPLACE VIEW v_statutory_training_coverage AS
SELECT
    e.company_id,
    COUNT(DISTINCT tr.employee_id) FILTER (WHERE tr.enrolled) AS employees_trained,
    COUNT(DISTINCT e.id) AS total_employees,
    ROUND(COUNT(DISTINCT tr.employee_id) FILTER (WHERE tr.enrolled)::NUMERIC / NULLIF(COUNT(DISTINCT e.id),0) * 100, 1) AS coverage_pct
FROM employees e
LEFT JOIN training_recommendations tr ON tr.employee_id = e.id AND tr.created_at >= DATE_TRUNC('year', CURRENT_DATE)
WHERE e.employment_status = 'active'
GROUP BY e.company_id;

-- Restricted, confidential view -- application layer must enforce
-- role-based access (HR/Exec only) before exposing this
CREATE OR REPLACE VIEW v_termination_flags_dashboard AS
SELECT tf.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM termination_flags tf
JOIN employees e ON tf.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id;
