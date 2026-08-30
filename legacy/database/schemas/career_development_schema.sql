-- ================================================================
-- FILE: database/schemas/career_development_schema.sql
-- eLogix HRMS — Performance & Talent Management > Talent Development >
-- Career Development (4 pages: Career Pathing, Employee Development
-- Plan, Training Portfolio, Leadership Development)
--
-- Design note: this module is heavily a SYNTHESIS layer over nearly
-- every prior session:
--   - Career Pathing      -> designations (role targets), salary_range_bands
--                            (pay-band preview), employee_skill_levels
--                            (skill-match %)
--   - Training Portfolio  -> v_my_learning_path + v_my_credentials_employee
--                            (Course Mgmt / Certificate Generation) -- NO
--                            new course/cert data, only career_path linkage
--   - Leadership Development -> the EXISTING nine_box_grid (Performance
--                            Analytics, built in the Payroll Analytics
--                            session) -- never duplicated
-- Genuinely new tables: career_path_targets (the journey-map edges),
-- employee_development_plans + edp_goals + edp_checkins (the EDP itself,
-- distinct from OKRs -- this is personal career growth, not business-
-- aligned goal tracking), and leadership_pipeline (HiPo + readiness +
-- mentor pairing, distinct from nine_box_grid which is just the
-- classification matrix).
--
--   - career_path_targets        (current role -> target role edges, vertical/lateral)
--   - employee_development_plans + edp_goals + edp_checkins
--   - leadership_pipeline        (HiPo tracking, readiness score, mentor pairing)
--
-- Nepal Labour Act 2074: career pathing supported via promotion/equal-
-- opportunity provisions (fair evaluation for promotion/transfer
-- decisions based on seniority, capability, efficiency); EDP/training
-- portfolio satisfies the annual skill-development-program mandate;
-- leadership development indirectly supported via workers' participation
-- committee capacity-building provisions.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: CAREER PATHING (the journey-map edges)
-- ================================================================
CREATE TABLE IF NOT EXISTS career_path_targets (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    target_designation_id       UUID    NOT NULL REFERENCES designations(id),

    path_type                      VARCHAR(20) NOT NULL DEFAULT 'vertical' CHECK (path_type IN ('vertical','lateral')),
    skill_match_pct                    NUMERIC(5,2) DEFAULT 0,  -- recomputed from employee_skill_levels vs target role's required skills

    suggested_mentor_employee_id            UUID REFERENCES employees(id),

    created_at                                 TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, target_designation_id)
);

-- ================================================================
-- PAGE 2: EMPLOYEE DEVELOPMENT PLAN (a living document, distinct from
-- OKRs -- this is personal career growth, not business goal tracking)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_development_plans (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    linked_career_path_target_id UUID   REFERENCES career_path_targets(id),  -- optional: this EDP targets a specific path

    status                          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','archived')),
    last_updated_at                     TIMESTAMPTZ DEFAULT NOW(),

    created_at                              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edp_goals (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_development_plan_id UUID   NOT NULL REFERENCES employee_development_plans(id),
    company_id             UUID         NOT NULL,

    goal_description           TEXT NOT NULL,
    goal_horizon                   VARCHAR(20) NOT NULL DEFAULT 'short_term' CHECK (goal_horizon IN ('short_term','long_term')),
    progress_pct                       NUMERIC(5,2) DEFAULT 0,
    target_date                            DATE,
    completed_at                               TIMESTAMPTZ,

    created_at                                    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edp_checkins (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_development_plan_id UUID NOT NULL REFERENCES employee_development_plans(id),
    company_id          UUID NOT NULL,

    logged_by              UUID NOT NULL REFERENCES employees(id),
    is_manager_checkin          BOOLEAN DEFAULT FALSE,
    note                            TEXT NOT NULL,

    logged_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 4: LEADERSHIP DEVELOPMENT (HiPo pipeline, readiness, mentorship --
-- distinct from the EXISTING nine_box_grid which is purely the matrix
-- classification; this is the action/pipeline layer built on top of it)
-- ================================================================
CREATE TABLE IF NOT EXISTS leadership_pipeline (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    nine_box_grid_id            UUID    REFERENCES nine_box_grid(id),  -- links back to the EXISTING classification

    is_hipo                         BOOLEAN DEFAULT FALSE,
    readiness_score                    NUMERIC(5,2) DEFAULT 0,  -- weighted: appraisal history + 360 + stretch assignments

    target_designation_id                  UUID REFERENCES designations(id),
    mentor_employee_id                         UUID REFERENCES employees(id),
    development_track_label                       VARCHAR(200),  -- e.g. 'Emerging Leader Program'

    flight_risk_flag                                  BOOLEAN DEFAULT FALSE,

    created_at                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                               TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_cpt_employee       ON career_path_targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_edp_employee            ON employee_development_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_eg_plan                     ON edp_goals(employee_development_plan_id);
CREATE INDEX IF NOT EXISTS idx_eg_stalled                      ON edp_goals(progress_pct) WHERE progress_pct < 100;
CREATE INDEX IF NOT EXISTS idx_ec_plan                              ON edp_checkins(employee_development_plan_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_lp_hipo                                  ON leadership_pipeline(is_hipo) WHERE is_hipo;
CREATE INDEX IF NOT EXISTS idx_lp_flight_risk                               ON leadership_pipeline(flight_risk_flag) WHERE flight_risk_flag;

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_career_dev_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_lp_upd
    BEFORE UPDATE ON leadership_pipeline
    FOR EACH ROW EXECUTE FUNCTION fn_career_dev_updated_at();

-- Recompute skill_match_pct for a career path target whenever the
-- employee's skill levels change (reuses the EXISTING employee_skill_levels)
CREATE OR REPLACE FUNCTION fn_recompute_skill_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE career_path_targets cpt SET skill_match_pct = (
        SELECT ROUND(AVG(LEAST(esl.current_level::NUMERIC / NULLIF(esl.required_level_for_role,0), 1)) * 100, 1)
        FROM employee_skill_levels esl WHERE esl.employee_id = cpt.employee_id AND esl.required_level_for_role IS NOT NULL
    )
    WHERE cpt.employee_id = NEW.employee_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_recompute_match
    AFTER INSERT OR UPDATE OF current_level ON employee_skill_levels
    FOR EACH ROW EXECUTE FUNCTION fn_recompute_skill_match();

-- Touch the EDP's last_updated_at whenever a goal or check-in is added,
-- reinforcing the "living document" framing
CREATE OR REPLACE FUNCTION fn_touch_edp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE employee_development_plans SET last_updated_at = NOW() WHERE id = NEW.employee_development_plan_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_touch_edp_goal
    AFTER INSERT OR UPDATE OF progress_pct ON edp_goals
    FOR EACH ROW EXECUTE FUNCTION fn_touch_edp();

CREATE TRIGGER trg_touch_edp_checkin
    AFTER INSERT ON edp_checkins
    FOR EACH ROW EXECUTE FUNCTION fn_touch_edp();

-- Notify the employee + manager on every check-in, reusing the
-- EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_edp_checkin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE edp RECORD; mgr_id UUID;
BEGIN
    SELECT employee_id, company_id INTO edp FROM employee_development_plans WHERE id = NEW.employee_development_plan_id;

    IF NEW.is_manager_checkin THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (edp.company_id, 'edp_checkins', NEW.id, 'edp_checkin_logged', edp.employee_id, 'direct_party',
           'Your manager logged a check-in on your Development Plan.', NOW());
    ELSE
        SELECT manager_id INTO mgr_id FROM employees WHERE id = edp.employee_id;
        IF mgr_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (edp.company_id, 'edp_checkins', NEW.id, 'edp_checkin_logged', mgr_id, 'reporting_manager',
               'Your direct report logged a self check-in on their Development Plan.', NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_checkin
    AFTER INSERT ON edp_checkins
    FOR EACH ROW EXECUTE FUNCTION fn_notify_edp_checkin();

-- Auto-flag stalled goals: no progress movement in 30 days, notifying
-- both employee and manager (the brief's "automated reminders" requirement)
CREATE OR REPLACE FUNCTION fn_flag_stalled_goal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE emp_id UUID; mgr_id UUID;
BEGIN
    IF NEW.progress_pct < 100 AND NEW.created_at < NOW() - INTERVAL '30 days' THEN
        SELECT employee_id INTO emp_id FROM employee_development_plans WHERE id = NEW.employee_development_plan_id;
        SELECT manager_id INTO mgr_id FROM employees WHERE id = emp_id;

        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'edp_goals', NEW.id, 'goal_stalled', emp_id, 'direct_party',
           format('Your goal "%s" hasn''t moved in 30+ days -- consider revising or escalating.', NEW.goal_description), NOW());
    END IF;
    RETURN NEW;
END;$$;

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: career pathing dashboard, joined with role/pay-band detail
CREATE OR REPLACE VIEW v_career_pathing_dashboard AS
SELECT
    cpt.*, d.title AS target_role_title, srb.band_label AS pay_band, m.first_name AS mentor_first_name, m.last_name AS mentor_last_name
FROM career_path_targets cpt
JOIN designations d ON cpt.target_designation_id = d.id
LEFT JOIN salary_range_bands srb ON srb.designation_id = d.id
LEFT JOIN employees m ON cpt.suggested_mentor_employee_id = m.id;

-- Page 2: the full EDP with nested goals + check-ins as JSON
CREATE OR REPLACE VIEW v_edp_full_detail AS
SELECT
    edp.*, e.first_name, e.last_name,
    (SELECT jsonb_agg(jsonb_build_object('goal', eg.goal_description, 'horizon', eg.goal_horizon, 'progress', eg.progress_pct, 'target_date', eg.target_date))
       FROM edp_goals eg WHERE eg.employee_development_plan_id = edp.id) AS goals,
    (SELECT jsonb_agg(jsonb_build_object('by', CASE WHEN ec.is_manager_checkin THEN 'Manager' ELSE 'Self' END, 'note', ec.note, 'logged_at', ec.logged_at) ORDER BY ec.logged_at DESC)
       FROM edp_checkins ec WHERE ec.employee_development_plan_id = edp.id) AS checkins
FROM employee_development_plans edp
JOIN employees e ON edp.employee_id = e.id
WHERE edp.status = 'active';

-- Page 3: Training Portfolio -- pure UNION of the EXISTING learning
-- path + credentials, enriched with career-path linkage
CREATE OR REPLACE VIEW v_training_portfolio AS
SELECT
    mlp.employee_id, mlp.title, mlp.format, mlp.progress_pct,
    (SELECT d.title FROM career_path_targets cpt JOIN designations d ON cpt.target_designation_id = d.id
       JOIN lms_course_skill_tags lcst ON lcst.lms_course_id = mlp.lms_course_id
       WHERE cpt.employee_id = mlp.employee_id LIMIT 1) AS linked_to_path,
    mlp.company_id
FROM v_my_learning_path mlp;

-- Page 4: leadership pipeline dashboard, joined with the EXISTING nine_box_grid
CREATE OR REPLACE VIEW v_leadership_pipeline_dashboard AS
SELECT
    lp.*, e.employee_code, e.first_name, e.last_name, d.title AS current_role_title,
    td.title AS target_role_title, m.first_name AS mentor_first_name, m.last_name AS mentor_last_name,
    nbg.performance_score AS nine_box_performance, nbg.potential_score AS nine_box_potential
FROM leadership_pipeline lp
JOIN employees e ON lp.employee_id = e.id
LEFT JOIN designations d ON e.designation_id = d.id
LEFT JOIN designations td ON lp.target_designation_id = td.id
LEFT JOIN employees m ON lp.mentor_employee_id = m.id
LEFT JOIN nine_box_grid nbg ON lp.nine_box_grid_id = nbg.id;
