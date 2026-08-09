-- ================================================================
-- FILE: database/schemas/probation_management_schema.sql
-- NepHR Pro — Onboarding > Probation Management Module Schema
-- Covers all 5 pages as one progressive lifecycle table set:
--   1. probation_records       (master record, 1 per employee per probation cycle)
--   2. probation_7day_reviews
--   3. probation_30day_reviews + probation_30day_goals
--   4. probation_60day_reviews + probation_60day_kpis + probation_360_feedback
--   5. probation_90day_reviews + probation_90day_competencies
--   6. probation_decisions     (Confirmation or Termination)
-- Nepal Labour Act 2074 Section 13: max 6 months, auto-confirm if no action taken,
-- termination without notice permitted during probation for unsatisfactory performance.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- MASTER PROBATION RECORD
-- One row per employee per probation cycle (supports re-probation on extension)
-- ================================================================
CREATE TABLE IF NOT EXISTS probation_records (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL,
    enrollment_id              UUID     REFERENCES employee_enrollments(id),

    employee_name                VARCHAR(200) NOT NULL,
    position                       VARCHAR(200),
    department_id                    UUID,
    branch_id                          UUID,
    manager_employee_id                  UUID,
    manager_name                           VARCHAR(200),

    join_date                                DATE NOT NULL,
    probation_months                            INT NOT NULL DEFAULT 6 CHECK (probation_months <= 6),
    probation_end_date                            DATE GENERATED ALWAYS AS (
                                                    join_date + (probation_months || ' months')::INTERVAL
                                                  ) STORED,

    -- Re-probation tracking (if extended)
    is_extension                                    BOOLEAN DEFAULT FALSE,
    original_probation_id                              UUID REFERENCES probation_records(id),
    extension_count                                       INT DEFAULT 0,

    current_phase                                            VARCHAR(20) DEFAULT 'day_7'
                                                              CHECK (current_phase IN ('day_7','day_30','day_60','day_90','decided')),
    overall_status                                              VARCHAR(20) DEFAULT 'active'
                                                                CHECK (overall_status IN ('active','confirmed','extended','terminated')),

    -- Legal deadline guard rails (Nepal LA2074 Section 13)
    days_until_auto_confirm                                        INT GENERATED ALWAYS AS (
                                                                      (join_date + (probation_months || ' months')::INTERVAL)::DATE - CURRENT_DATE
                                                                    ) STORED,

    created_at                                                        TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                            BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 1. 7-DAY REVIEWS (Foundation & Compliance Phase)
-- ================================================================
CREATE TABLE IF NOT EXISTS probation_7day_reviews (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    probation_record_id      UUID       NOT NULL REFERENCES probation_records(id),
    company_id                UUID      NOT NULL,

    review_due_date             DATE,
    buddy_employee_id              UUID,
    buddy_name                       VARCHAR(200),

    -- Checklist (JSONB for flexibility — matches frontend CHECKLIST_ITEMS)
    checklist                          JSONB NOT NULL DEFAULT '{
                                          "welcome_video": false, "it_hardware": false,
                                          "payroll_declaration": false, "compliance_signed": false,
                                          "policy_reviewed": false, "system_access": false,
                                          "role_clarity": false
                                        }',
    role_clarity_score                    INT CHECK (role_clarity_score BETWEEN 1 AND 5),
    manager_note                             TEXT,

    completion_pct                              INT GENERATED ALWAYS AS (
                                                  -- count true values / 7 total items, cast for percentage
                                                  (SELECT ROUND(
                                                    (SELECT COUNT(*) FROM jsonb_each(checklist) WHERE value::TEXT = 'true')::NUMERIC
                                                    / 7 * 100
                                                  ))
                                                ) STORED,
    status                                          VARCHAR(20) DEFAULT 'not_started'
                                                    CHECK (status IN ('not_started','in_progress','completed')),

    -- Auto IT/Finance notification tracking
    it_notified                                          BOOLEAN DEFAULT FALSE,
    finance_notified                                        BOOLEAN DEFAULT FALSE,

    created_at                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. 30-DAY REVIEWS (Assimilation & Expectation Phase)
-- ================================================================
CREATE TABLE IF NOT EXISTS probation_30day_reviews (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    probation_record_id      UUID       NOT NULL REFERENCES probation_records(id),
    company_id                UUID      NOT NULL,

    review_date                  DATE,

    -- Check-in survey (1-5 scale each)
    survey_role_clarity              INT CHECK (survey_role_clarity BETWEEN 1 AND 5),
    survey_team_integration             INT CHECK (survey_team_integration BETWEEN 1 AND 5),
    survey_manager_support                INT CHECK (survey_manager_support BETWEEN 1 AND 5),
    survey_tools_access                      INT CHECK (survey_tools_access BETWEEN 1 AND 5),
    survey_overall_satisfaction                 INT CHECK (survey_overall_satisfaction BETWEEN 1 AND 5),
    survey_avg                                     NUMERIC(3,2) GENERATED ALWAYS AS (
                                                      (COALESCE(survey_role_clarity,0) + COALESCE(survey_team_integration,0) +
                                                       COALESCE(survey_manager_support,0) + COALESCE(survey_tools_access,0) +
                                                       COALESCE(survey_overall_satisfaction,0))::NUMERIC / 5
                                                    ) STORED,

    manager_note                                       TEXT,
    employee_feedback                                     TEXT,  -- two-way dialogue

    -- AI red flag detection
    red_flags                                                INT DEFAULT 0,
    ai_flagged                                                  BOOLEAN GENERATED ALWAYS AS (red_flags > 0) STORED,

    status                                                        VARCHAR(20) DEFAULT 'pending'
                                                                  CHECK (status IN ('pending','completed')),
    employee_signed_off                                              BOOLEAN DEFAULT FALSE,
    manager_signed_off                                                  BOOLEAN DEFAULT FALSE,

    created_at                                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS probation_30day_goals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_30day_id     UUID NOT NULL REFERENCES probation_30day_reviews(id),
    company_id          UUID NOT NULL,
    goal_text           TEXT NOT NULL,
    met                 BOOLEAN DEFAULT FALSE,
    set_by              VARCHAR(200),  -- manager who set the goal on Day 1
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 3. 60-DAY REVIEWS (Productivity & Autonomy Phase)
-- ================================================================
CREATE TABLE IF NOT EXISTS probation_60day_reviews (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    probation_record_id      UUID       NOT NULL REFERENCES probation_records(id),
    company_id                UUID      NOT NULL,

    review_date                  DATE,
    attendance_pct                  NUMERIC(5,2),

    overall_kpi_avg                    NUMERIC(3,2),
    pip_triggered                         BOOLEAN GENERATED ALWAYS AS (overall_kpi_avg IS NOT NULL AND overall_kpi_avg < 3.0) STORED,
    pip_document_url                        VARCHAR(500),

    status                                     VARCHAR(20) DEFAULT 'pending'
                                               CHECK (status IN ('pending','completed')),

    created_at                                    TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS probation_60day_kpis (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_60day_id     UUID NOT NULL REFERENCES probation_60day_reviews(id),
    company_id          UUID NOT NULL,
    kpi_name            VARCHAR(100) NOT NULL,
    -- Job Knowledge, Quality of Work, Productivity/Output, Initiative & Independence, Collaboration, Reliability
    score               INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS probation_360_feedback (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_60day_id     UUID NOT NULL REFERENCES probation_60day_reviews(id),
    company_id          UUID NOT NULL,
    feedback_from_name  VARCHAR(200) NOT NULL,
    feedback_from_role  VARCHAR(200),
    comment             TEXT NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. 90-DAY REVIEWS (Integration & Role Mastery Phase)
-- ================================================================
CREATE TABLE IF NOT EXISTS probation_90day_reviews (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    probation_record_id      UUID       NOT NULL REFERENCES probation_records(id),
    company_id                UUID      NOT NULL,

    review_date                  DATE,
    competency_score                INT CHECK (competency_score BETWEEN 0 AND 100),

    -- Consolidated trajectory snapshot (denormalized for fast trend display)
    day7_completion_pct                INT,
    day30_survey_avg                      NUMERIC(3,2),
    day60_kpi_avg                            NUMERIC(3,2),

    -- AI recommendation engine output
    ai_recommendation                           VARCHAR(20)
                                                CHECK (ai_recommendation IN ('CONFIRM','EXTEND','TERMINATE')),
    ai_note                                        TEXT,
    ai_generated_at                                   TIMESTAMPTZ,

    status                                               VARCHAR(20) DEFAULT 'pending'
                                                         CHECK (status IN ('pending','completed')),

    created_at                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS probation_90day_competencies (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_90day_id     UUID NOT NULL REFERENCES probation_90day_reviews(id),
    company_id          UUID NOT NULL,
    competency_name     VARCHAR(100) NOT NULL,
    -- Role Mastery, Independent Execution, Team Leadership, Goal Achievement
    score               INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. PROBATION DECISIONS (Confirmation or Termination)
-- ================================================================
CREATE TABLE IF NOT EXISTS probation_decisions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    probation_record_id      UUID       NOT NULL REFERENCES probation_records(id),
    company_id                UUID      NOT NULL,

    decision                     VARCHAR(20) NOT NULL
                                 CHECK (decision IN ('confirmed','extended','terminated')),
    decided_date                    DATE NOT NULL DEFAULT CURRENT_DATE,
    decided_by_employee_id             UUID,
    decided_by_name                       VARCHAR(200),

    -- CONFIRMED path
    confirmation_letter_generated            BOOLEAN DEFAULT FALSE,
    confirmation_letter_url                     VARCHAR(500),
    employee_status_updated                        BOOLEAN DEFAULT FALSE,  -- Probation -> Permanent
    benefits_adjusted                                 BOOLEAN DEFAULT FALSE,
    payroll_scale_updated                                BOOLEAN DEFAULT FALSE,

    -- EXTENDED path
    extension_months                                        INT CHECK (extension_months BETWEEN 1 AND 3),
    new_probation_record_id                                    UUID REFERENCES probation_records(id),
    extension_letter_generated                                    BOOLEAN DEFAULT FALSE,
    new_goals_set                                                    BOOLEAN DEFAULT FALSE,

    -- TERMINATED path
    termination_reason                                                  TEXT,
    notice_required                                                        BOOLEAN DEFAULT FALSE,  -- FALSE during probation per LA2074 S.13
    it_access_revoked                                                         BOOLEAN DEFAULT FALSE,
    final_settlement_status                                                      VARCHAR(20) DEFAULT 'pending'
                                                                                 CHECK (final_settlement_status IN ('pending','processing','completed')),
    asset_recovery_status                                                          VARCHAR(20) DEFAULT 'pending'
                                                                                   CHECK (asset_recovery_status IN ('pending','processing','completed')),
    exit_paperwork_generated                                                          BOOLEAN DEFAULT FALSE,
    offboarding_checklist_id                                                            UUID,

    -- Legal compliance flag
    decided_before_deadline                                                                BOOLEAN,
    -- TRUE if decided_date <= probation_end_date (from probation_records); auto-confirm risk if FALSE

    created_at                                                                                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                 TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_pr_company          ON probation_records(company_id)         WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pr_employee           ON probation_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_pr_phase                ON probation_records(current_phase);
CREATE INDEX IF NOT EXISTS idx_pr_deadline               ON probation_records(probation_end_date) WHERE overall_status = 'active';
CREATE INDEX IF NOT EXISTS idx_pr_urgent                   ON probation_records(days_until_auto_confirm) WHERE overall_status = 'active' AND days_until_auto_confirm <= 14;

CREATE INDEX IF NOT EXISTS idx_p7_record                     ON probation_7day_reviews(probation_record_id);
CREATE INDEX IF NOT EXISTS idx_p7_status                       ON probation_7day_reviews(status);

CREATE INDEX IF NOT EXISTS idx_p30_record                        ON probation_30day_reviews(probation_record_id);
CREATE INDEX IF NOT EXISTS idx_p30_flagged                         ON probation_30day_reviews(ai_flagged) WHERE ai_flagged;
CREATE INDEX IF NOT EXISTS idx_p30g_review                           ON probation_30day_goals(review_30day_id);

CREATE INDEX IF NOT EXISTS idx_p60_record                              ON probation_60day_reviews(probation_record_id);
CREATE INDEX IF NOT EXISTS idx_p60_pip                                   ON probation_60day_reviews(pip_triggered) WHERE pip_triggered;
CREATE INDEX IF NOT EXISTS idx_p60k_review                                 ON probation_60day_kpis(review_60day_id);
CREATE INDEX IF NOT EXISTS idx_p360_review                                   ON probation_360_feedback(review_60day_id);

CREATE INDEX IF NOT EXISTS idx_p90_record                                      ON probation_90day_reviews(probation_record_id);
CREATE INDEX IF NOT EXISTS idx_p90_recommendation                                ON probation_90day_reviews(ai_recommendation);
CREATE INDEX IF NOT EXISTS idx_p90c_review                                          ON probation_90day_competencies(review_90day_id);

CREATE INDEX IF NOT EXISTS idx_pd_record                                              ON probation_decisions(probation_record_id);
CREATE INDEX IF NOT EXISTS idx_pd_decision                                              ON probation_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_pd_settlement                                              ON probation_decisions(final_settlement_status) WHERE decision = 'terminated';

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_probation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'probation_records','probation_7day_reviews','probation_30day_reviews',
  'probation_60day_reviews','probation_90day_reviews','probation_decisions'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_probation_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Nepal LA2074 Section 13: probation max 6 months
CREATE OR REPLACE FUNCTION fn_probation_max_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.probation_months > 6 THEN
        RAISE EXCEPTION 'Probation period cannot exceed 6 months per Nepal Labour Act 2074 Section 13.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_probation_max
    BEFORE INSERT OR UPDATE OF probation_months ON probation_records
    FOR EACH ROW EXECUTE FUNCTION fn_probation_max_check();

-- Auto-advance current_phase based on days since join
CREATE OR REPLACE FUNCTION fn_probation_phase_advance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE days_elapsed INT;
BEGIN
    days_elapsed := (CURRENT_DATE - NEW.join_date);
    IF NEW.overall_status = 'active' THEN
        IF days_elapsed >= 90 THEN NEW.current_phase := 'day_90';
        ELSIF days_elapsed >= 60 THEN NEW.current_phase := 'day_60';
        ELSIF days_elapsed >= 30 THEN NEW.current_phase := 'day_30';
        ELSE NEW.current_phase := 'day_7';
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_probation_phase
    BEFORE UPDATE ON probation_records
    FOR EACH ROW EXECUTE FUNCTION fn_probation_phase_advance();

-- Validate decision happens before legal deadline (warn, don't block — manager may act same-day)
CREATE OR REPLACE FUNCTION fn_decision_deadline_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p_end DATE;
BEGIN
    SELECT probation_end_date INTO p_end FROM probation_records WHERE id = NEW.probation_record_id;
    NEW.decided_before_deadline := (NEW.decided_date <= p_end);
    IF NOT NEW.decided_before_deadline AND NEW.decision != 'confirmed' THEN
        RAISE WARNING 'Decision made after probation_end_date (%). Nepal LA2074 Section 13: employee may already be automatically confirmed by law.', p_end;
    END IF;

    -- Update master record status
    UPDATE probation_records SET
        overall_status = CASE NEW.decision
            WHEN 'confirmed' THEN 'confirmed'
            WHEN 'extended'  THEN 'extended'
            WHEN 'terminated' THEN 'terminated'
        END,
        current_phase = 'decided'
    WHERE id = NEW.probation_record_id;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_decision_deadline
    BEFORE INSERT ON probation_decisions
    FOR EACH ROW EXECUTE FUNCTION fn_decision_deadline_check();

-- Auto-create new probation_records row on extension
CREATE OR REPLACE FUNCTION fn_create_extension_record()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE orig RECORD; new_id UUID;
BEGIN
    IF NEW.decision = 'extended' AND NEW.extension_months IS NOT NULL THEN
        SELECT * INTO orig FROM probation_records WHERE id = NEW.probation_record_id;
        INSERT INTO probation_records
          (company_id, employee_id, enrollment_id, employee_name, position, department_id, branch_id,
           manager_employee_id, manager_name, join_date, probation_months,
           is_extension, original_probation_id, extension_count, current_phase, overall_status)
        VALUES
          (orig.company_id, orig.employee_id, orig.enrollment_id, orig.employee_name, orig.position,
           orig.department_id, orig.branch_id, orig.manager_employee_id, orig.manager_name,
           CURRENT_DATE, NEW.extension_months,
           TRUE, COALESCE(orig.original_probation_id, orig.id), orig.extension_count + 1, 'day_7', 'active')
        RETURNING id INTO new_id;

        UPDATE probation_decisions SET new_probation_record_id = new_id WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_create_extension
    AFTER INSERT ON probation_decisions
    FOR EACH ROW EXECUTE FUNCTION fn_create_extension_record();

-- ================================================================
-- VIEWS
-- ================================================================

-- Full trajectory across all 4 checkpoints (used by 90-day review page)
CREATE OR REPLACE VIEW v_probation_trajectory AS
SELECT
    pr.id AS probation_record_id, pr.employee_name, pr.position, pr.join_date, pr.probation_end_date,
    pr.days_until_auto_confirm, pr.current_phase, pr.overall_status,
    r7.completion_pct AS day7_pct,
    r30.survey_avg AS day30_avg,
    r60.overall_kpi_avg AS day60_avg,
    r90.competency_score AS day90_score,
    r90.ai_recommendation,
    pr.company_id
FROM probation_records pr
LEFT JOIN probation_7day_reviews r7   ON r7.probation_record_id = pr.id
LEFT JOIN probation_30day_reviews r30 ON r30.probation_record_id = pr.id
LEFT JOIN probation_60day_reviews r60 ON r60.probation_record_id = pr.id
LEFT JOIN probation_90day_reviews r90 ON r90.probation_record_id = pr.id
WHERE NOT pr.is_deleted;

-- Urgent legal deadline alerts (within 14 days of auto-confirmation)
CREATE OR REPLACE VIEW v_probation_deadline_alerts AS
SELECT
    employee_name, position, manager_name, probation_end_date, days_until_auto_confirm, current_phase,
    company_id
FROM probation_records
WHERE overall_status = 'active' AND days_until_auto_confirm <= 14 AND NOT is_deleted
ORDER BY days_until_auto_confirm ASC;

-- PIP (Performance Improvement Plan) tracking
CREATE OR REPLACE VIEW v_pip_tracking AS
SELECT
    pr.employee_name, pr.position, r60.review_date, r60.overall_kpi_avg, r60.pip_triggered,
    pr.company_id
FROM probation_60day_reviews r60
JOIN probation_records pr ON r60.probation_record_id = pr.id
WHERE r60.pip_triggered AND NOT pr.is_deleted;

-- Termination/offboarding action status
CREATE OR REPLACE VIEW v_termination_offboarding_status AS
SELECT
    pr.employee_name, pr.position, pd.decided_date, pd.termination_reason,
    pd.it_access_revoked, pd.final_settlement_status, pd.asset_recovery_status, pd.exit_paperwork_generated,
    pr.company_id
FROM probation_decisions pd
JOIN probation_records pr ON pd.probation_record_id = pr.id
WHERE pd.decision = 'terminated'
ORDER BY pd.decided_date DESC;
