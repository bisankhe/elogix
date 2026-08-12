-- ================================================================
-- FILE: database/schemas/skill_gap_training_request_schema.sql
-- eLogix HRMS — Performance & Talent Management > Talent Development >
-- Learning & Development > Skill Gap Matrix + Skill Gap Analysis +
-- Training Request (3 pages, the brief's explicit pipeline)
--
-- Design note: per the brief's diagram —
--   [Employee Skill Matrix Data] -> [Skill Gap Analysis Calibration]
--   -> [Training Request Form Submission] -> [Approval Workflow Routing]
--   -> [LMS / Course Enrollment]
-- Page 1 (Matrix) is PURE UI over the EXISTING employee_skill_levels/
-- v_skill_matrix (built in Course Management) -- zero new data capture.
-- Page 2 (Analysis) adds the genuinely missing piece: a formal
-- Manager+HR CALIBRATION record, distinct from training_needs_analysis
-- (which prioritizes business-linked needs at the org level) -- this is
-- a per-cell confirmation step before any action is taken on a specific
-- employee's specific skill gap.
-- Page 3 (Training Request) adds the self-service request + multi-stage
-- approval chain, which auto-dispatches into the EXISTING
-- training_recommendations/lms_enrollments on final approval -- never
-- duplicating the LMS enrollment mechanism.
--
--   - skill_gap_calibrations    (Page 2: per-cell Manager+HR confirmation)
--   - training_requests          (Page 3: self-service request)
--   - training_request_approval_stages (Page 3: Manager->Dept Head->L&D/Budget)
--
-- Nepal Labour Act 2074: enterprises must formulate an annual training
-- plan and allocate a defined budget percentage to capacity building;
-- objective, non-discriminatory skill assessment underpins lawful,
-- merit-based promotion/compensation decisions (equal-opportunity basis).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 2: SKILL GAP CALIBRATION (per-cell Manager+HR confirmation)
-- ================================================================
CREATE TABLE IF NOT EXISTS skill_gap_calibrations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    skill_taxonomy_id           UUID    NOT NULL REFERENCES skill_taxonomy(id),

    actual_level_at_calibration     INT NOT NULL,
    required_level_at_calibration       INT NOT NULL,
    gap_size                               INT GENERATED ALWAYS AS (GREATEST(required_level_at_calibration - actual_level_at_calibration, 0)) STORED,

    manager_note                              TEXT,
    manager_confirmed_by                         UUID,
    manager_confirmed_at                            TIMESTAMPTZ,

    hr_confirmed_by                                    UUID,
    hr_confirmed_at                                       TIMESTAMPTZ,

    adjacent_skill_suggestions                               TEXT[],  -- AI-suggested related skills

    status                                                       VARCHAR(20) DEFAULT 'awaiting_hr'
                                                                 CHECK (status IN ('awaiting_manager','awaiting_hr','calibrated')),

    created_at                                                      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 3: TRAINING REQUEST + APPROVAL CHAIN
-- ================================================================
CREATE TABLE IF NOT EXISTS training_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    skill_gap_calibration_id     UUID    REFERENCES skill_gap_calibrations(id),  -- optional: pre-populated from Analysis

    skill_gap_label                  VARCHAR(200) NOT NULL,
    proposed_course_label                VARCHAR(300) NOT NULL,
    lms_course_id                            UUID REFERENCES lms_courses(id),  -- if matched to internal catalog

    business_justification                      TEXT NOT NULL,
    estimated_cost_npr                             NUMERIC(12,2) DEFAULT 0,

    status                                            VARCHAR(20) DEFAULT 'pending'
                                                      CHECK (status IN ('pending','approved','rejected','enrolled')),

    -- Set once approved and dispatched -- the integration point with
    -- the EXISTING training_recommendations table
    dispatched_training_recommendation_id                UUID REFERENCES training_recommendations(id),

    created_at                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_request_approval_stages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    training_request_id UUID NOT NULL REFERENCES training_requests(id),
    company_id          UUID NOT NULL,

    stage_order         INT NOT NULL,  -- 1=Manager, 2=Dept Head, 3=L&D/Budget
    stage_role           VARCHAR(30) NOT NULL CHECK (stage_role IN ('manager','dept_head','ld_budget')),
    approver_employee_id    UUID REFERENCES employees(id),

    status                  VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started','pending','approved','rejected')),
    decided_at                  TIMESTAMPTZ,
    comments                       TEXT,

    UNIQUE (training_request_id, stage_order)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_sgc_employee       ON skill_gap_calibrations(employee_id);
CREATE INDEX IF NOT EXISTS idx_sgc_status              ON skill_gap_calibrations(status);
CREATE INDEX IF NOT EXISTS idx_sgc_awaiting_hr              ON skill_gap_calibrations(status) WHERE status = 'awaiting_hr';

CREATE INDEX IF NOT EXISTS idx_tr_employee                       ON training_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_tr_status                             ON training_requests(status);
CREATE INDEX IF NOT EXISTS idx_tras_request                              ON training_request_approval_stages(training_request_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_tras_pending                                  ON training_request_approval_stages(status) WHERE status = 'pending';

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_skill_gap_tr_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_tr_upd
    BEFORE UPDATE ON training_requests
    FOR EACH ROW EXECUTE FUNCTION fn_skill_gap_tr_updated_at();

-- When HR confirms, flip calibration status; notify the employee +
-- reporting manager, reusing the EXISTING transaction_notifications
CREATE OR REPLACE FUNCTION fn_finalize_calibration()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID; skill_name TEXT;
BEGIN
    IF NEW.hr_confirmed_at IS NOT NULL AND (OLD IS NULL OR OLD.hr_confirmed_at IS NULL) THEN
        NEW.status := 'calibrated';
        SELECT skill_name INTO skill_name FROM skill_taxonomy WHERE id = NEW.skill_taxonomy_id;

        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'skill_gap_calibrations', NEW.id, 'gap_calibrated', NEW.employee_id, 'direct_party',
           format('Your skill gap in "%s" has been formally calibrated -- ready for a development action.', skill_name), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_finalize_calibration
    BEFORE UPDATE OF hr_confirmed_at ON skill_gap_calibrations
    FOR EACH ROW EXECUTE FUNCTION fn_finalize_calibration();

-- On training request creation: auto-seed the 3-stage approval chain
CREATE OR REPLACE FUNCTION fn_seed_approval_chain()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID; dept_head_id UUID;
BEGIN
    SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
    SELECT d.department_head_id INTO dept_head_id FROM employees e JOIN departments d ON e.department_id = d.id WHERE e.id = NEW.employee_id;

    INSERT INTO training_request_approval_stages (training_request_id, company_id, stage_order, stage_role, approver_employee_id, status)
    VALUES
      (NEW.id, NEW.company_id, 1, 'manager', mgr_id, 'pending'),
      (NEW.id, NEW.company_id, 2, 'dept_head', dept_head_id, 'not_started'),
      (NEW.id, NEW.company_id, 3, 'ld_budget', NULL, 'not_started');

    -- Notify the first-stage approver
    IF mgr_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'training_requests', NEW.id, 'approval_pending', mgr_id, 'reporting_manager',
           format('A training request for "%s" awaits your approval.', NEW.proposed_course_label), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_seed_chain
    AFTER INSERT ON training_requests
    FOR EACH ROW EXECUTE FUNCTION fn_seed_approval_chain();

-- When a stage is approved, activate the next stage; when the final
-- stage (L&D/Budget) is approved, dispatch into the EXISTING
-- training_recommendations table and mark the request 'enrolled'
CREATE OR REPLACE FUNCTION fn_advance_approval_stage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE next_stage RECORD; req RECORD; new_rec_id UUID;
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        NEW.decided_at := NOW();

        SELECT * INTO next_stage FROM training_request_approval_stages
        WHERE training_request_id = NEW.training_request_id AND stage_order = NEW.stage_order + 1;

        IF next_stage.id IS NOT NULL THEN
            UPDATE training_request_approval_stages SET status = 'pending' WHERE id = next_stage.id;
        ELSE
            -- Final stage approved: dispatch to training_recommendations
            SELECT * INTO req FROM training_requests WHERE id = NEW.training_request_id;

            INSERT INTO training_recommendations
              (company_id, employee_id, gap_source, gap_source_record_id, gap_identified, recommended_course, provider, created_at)
            VALUES
              (req.company_id, req.employee_id, 'appraisal', req.id, req.skill_gap_label, req.proposed_course_label, 'Internal LMS', NOW())
            RETURNING id INTO new_rec_id;

            UPDATE training_requests SET status = 'enrolled', dispatched_training_recommendation_id = new_rec_id WHERE id = req.id;
        END IF;
    ELSIF NEW.status = 'rejected' THEN
        UPDATE training_requests SET status = 'rejected' WHERE id = NEW.training_request_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_advance_stage
    BEFORE UPDATE OF status ON training_request_approval_stages
    FOR EACH ROW EXECUTE FUNCTION fn_advance_approval_stage();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 2: calibration dashboard, joined with the employee's existing
-- skill matrix record for current/required context
CREATE OR REPLACE VIEW v_skill_gap_calibration_dashboard AS
SELECT sgc.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name, st.skill_name
FROM skill_gap_calibrations sgc
JOIN employees e ON sgc.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
JOIN skill_taxonomy st ON sgc.skill_taxonomy_id = st.id;

-- Page 3: training request dashboard with the full approval pipeline
-- aggregated as JSON for the card UI
CREATE OR REPLACE VIEW v_training_request_dashboard AS
SELECT
    tr.*, e.employee_code, e.first_name, e.last_name,
    (SELECT jsonb_agg(jsonb_build_object('role', tras.stage_role, 'status', tras.status, 'order', tras.stage_order) ORDER BY tras.stage_order)
       FROM training_request_approval_stages tras WHERE tras.training_request_id = tr.id) AS approval_chain
FROM training_requests tr
JOIN employees e ON tr.employee_id = e.id;

-- L&D budget visibility widget (annual budget minus all committed/approved requests)
CREATE OR REPLACE VIEW v_ld_budget_widget AS
SELECT
    atb.company_id, atb.fiscal_year_label, atb.allocated_npr,
    COALESCE((SELECT SUM(estimated_cost_npr) FROM training_requests WHERE status IN ('approved','enrolled')), 0) AS committed_npr,
    atb.allocated_npr - COALESCE((SELECT SUM(estimated_cost_npr) FROM training_requests WHERE status IN ('approved','enrolled')), 0) AS available_npr
FROM annual_training_budgets atb;

-- Pending approvals queue, by approver
CREATE OR REPLACE VIEW v_training_request_pending_approvals AS
SELECT tras.*, tr.proposed_course_label, tr.estimated_cost_npr, e.first_name, e.last_name
FROM training_request_approval_stages tras
JOIN training_requests tr ON tras.training_request_id = tr.id
JOIN employees e ON tr.employee_id = e.id
WHERE tras.status = 'pending';
