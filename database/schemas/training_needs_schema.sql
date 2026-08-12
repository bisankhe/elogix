-- ================================================================
-- FILE: database/schemas/training_needs_schema.sql
-- eLogix HRMS — Performance & Talent Management > Talent Development >
-- Learning & Development > Training Needs Identification + Analysis
-- (2 pages, first module of the new Talent Development top-level area)
--
-- Design note: TNI (page 1) is the SPOTTING layer; TNA (page 2) is the
-- DIAGNOSTIC/PRIORITIZATION layer. They form a pipeline:
--   training_needs_identified -> training_needs_analysis -> (approved)
--   -> training_recommendations (EXISTING table from rewards_recognition_
--   schema.sql -- the actual course dispatch, never duplicated here)
-- TNA cross-references the EXISTING okr_objectives, performance_appraisals,
-- and behaviour_evaluations tables to ground priority scoring in
-- objective business evidence, not subjective preference.
--
--   - training_needs_identified  (TNI: gap mapping, self-flag, pulse survey)
--   - pulse_surveys + pulse_survey_responses (manager-initiated team surveys)
--   - training_needs_analysis    (TNA: prioritization + business linkage)
--
-- Nepal Labour Act 2074: Clause 29 (employer's duty to arrange for
-- health/safety/welfare — TNA pinpoints exact safety/operational gaps);
-- Clauses 48-52 (OSH — deploying workers without proper technical/safety
-- instruction creates heavy employer liability if an accident occurs);
-- Clause 132 (enterprise-level internal rules registration, often
-- bridging performance review cycles to capacity-building).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. TRAINING NEEDS IDENTIFICATION (TNI)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_needs_identified (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       REFERENCES employees(id),  -- NULL if team-level (department_id used instead)
    department_id               UUID    REFERENCES departments(id),

    source                          VARCHAR(30) NOT NULL
                                    CHECK (source IN ('automated_skill_gap','self_flagged','manager_pulse_survey')),
    competency_label                   VARCHAR(200) NOT NULL,
    current_level                         INT CHECK (current_level BETWEEN 1 AND 10),
    required_level                           INT CHECK (required_level BETWEEN 1 AND 10),
    gap_size                                    INT GENERATED ALWAYS AS (GREATEST(required_level - current_level, 0)) STORED,

    context_note                                   TEXT,
    flagged_by                                        UUID,  -- employee_id of whoever raised it (self, manager, or NULL if system-automated)

    status                                               VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','reviewed','dismissed')),
    sent_to_tna_at                                          TIMESTAMPTZ,

    created_at                                                 TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PULSE SURVEYS (manager-initiated team-level identification source)
-- ================================================================
CREATE TABLE IF NOT EXISTS pulse_surveys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    department_id   UUID REFERENCES departments(id),

    question        TEXT NOT NULL,
    launched_by      UUID NOT NULL,
    launched_at         TIMESTAMPTZ DEFAULT NOW(),
    closes_at              TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pulse_survey_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pulse_survey_id UUID NOT NULL REFERENCES pulse_surveys(id),
    company_id      UUID NOT NULL,
    respondent_employee_id UUID NOT NULL REFERENCES employees(id),

    response_text   TEXT NOT NULL,
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (pulse_survey_id, respondent_employee_id)
);

-- ================================================================
-- 2. TRAINING NEEDS ANALYSIS (TNA) — diagnosis + prioritization
-- ================================================================
CREATE TABLE IF NOT EXISTS training_needs_analysis (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    training_need_id          UUID       NOT NULL REFERENCES training_needs_identified(id),

    -- Objective business linkage (NEVER approved on preference alone)
    linked_okr_id                 UUID REFERENCES okr_objectives(id),
    linked_appraisal_id               UUID REFERENCES performance_appraisals(id),
    linked_behaviour_eval_id              UUID REFERENCES behaviour_evaluations(id),
    performance_link_note                    TEXT,

    employees_affected_count                    INT DEFAULT 1,
    business_impact                                VARCHAR(10) DEFAULT 'medium' CHECK (business_impact IN ('low','medium','high')),

    -- Priority score: weights impact x employees affected x evidence strength
    priority_score                                    NUMERIC(5,1) GENERATED ALWAYS AS (
                                                       (CASE business_impact WHEN 'high' THEN 50 WHEN 'medium' THEN 30 ELSE 15 END)
                                                       + LEAST(employees_affected_count * 5, 30)
                                                       + (CASE WHEN linked_okr_id IS NOT NULL THEN 10 ELSE 0 END)
                                                       + (CASE WHEN linked_appraisal_id IS NOT NULL THEN 10 ELSE 0 END)
                                                     ) STORED,

    recommended_course                                    VARCHAR(300),
    recommended_provider                                     VARCHAR(150),

    status                                                      VARCHAR(20) DEFAULT 'under_review'
                                                                CHECK (status IN ('under_review','approved','rejected')),
    approved_by                                                    UUID,
    approved_at                                                       TIMESTAMPTZ,

    -- Set once dispatched -- the integration point with the EXISTING
    -- training_recommendations table, never duplicated
    dispatched_training_recommendation_id                              UUID REFERENCES training_recommendations(id),

    created_at                                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_tni_employee       ON training_needs_identified(employee_id);
CREATE INDEX IF NOT EXISTS idx_tni_department          ON training_needs_identified(department_id);
CREATE INDEX IF NOT EXISTS idx_tni_status                  ON training_needs_identified(status);
CREATE INDEX IF NOT EXISTS idx_tni_source                      ON training_needs_identified(source);

CREATE INDEX IF NOT EXISTS idx_ps_department                       ON pulse_surveys(department_id);
CREATE INDEX IF NOT EXISTS idx_psr_survey                              ON pulse_survey_responses(pulse_survey_id);

CREATE INDEX IF NOT EXISTS idx_tna_need                                    ON training_needs_analysis(training_need_id);
CREATE INDEX IF NOT EXISTS idx_tna_status                                      ON training_needs_analysis(status);
CREATE INDEX IF NOT EXISTS idx_tna_priority                                        ON training_needs_analysis(priority_score DESC);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_training_needs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_tna_upd
    BEFORE UPDATE ON training_needs_analysis
    FOR EACH ROW EXECUTE FUNCTION fn_training_needs_updated_at();

-- When a TNI record is marked 'reviewed', stamp sent_to_tna_at (the
-- visual "→ Sent to TNA" badge on page 1 reflects this)
CREATE OR REPLACE FUNCTION fn_mark_sent_to_tna()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE training_needs_identified SET status = 'reviewed', sent_to_tna_at = NOW() WHERE id = NEW.training_need_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_mark_sent_to_tna
    AFTER INSERT ON training_needs_analysis
    FOR EACH ROW EXECUTE FUNCTION fn_mark_sent_to_tna();

-- On TNA approval: dispatch into the EXISTING training_recommendations
-- table (the actual course-assignment mechanism) -- this is the
-- "single click" handoff described in the brief
CREATE OR REPLACE FUNCTION fn_dispatch_to_training_recommendation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE tni RECORD; new_rec_id UUID;
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'under_review' THEN
        NEW.approved_at := NOW();

        SELECT * INTO tni FROM training_needs_identified WHERE id = NEW.training_need_id;

        INSERT INTO training_recommendations
          (company_id, employee_id, gap_source, gap_source_record_id, gap_identified, recommended_course, provider, created_at)
        VALUES
          (NEW.company_id, tni.employee_id, 'appraisal', NEW.id, tni.competency_label, NEW.recommended_course,
           COALESCE(NEW.recommended_provider, 'Internal LMS'), NOW())
        RETURNING id INTO new_rec_id;

        NEW.dispatched_training_recommendation_id := new_rec_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_dispatch_training
    BEFORE UPDATE OF status ON training_needs_analysis
    FOR EACH ROW EXECUTE FUNCTION fn_dispatch_to_training_recommendation();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: TNI dashboard
CREATE OR REPLACE VIEW v_training_needs_identified_dashboard AS
SELECT
    tni.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    fe.first_name AS flagged_by_first_name, fe.last_name AS flagged_by_last_name
FROM training_needs_identified tni
LEFT JOIN employees e ON tni.employee_id = e.id
LEFT JOIN departments d ON tni.department_id = d.id
LEFT JOIN employees fe ON tni.flagged_by = fe.id
WHERE tni.status != 'dismissed';

-- Page 2: TNA dashboard with business-linkage detail
CREATE OR REPLACE VIEW v_training_needs_analysis_dashboard AS
SELECT
    tna.*, tni.competency_label AS source_need, tni.department_id, d.name AS department_name,
    okr.objective_text AS linked_okr_text,
    pa.final_rating AS linked_appraisal_rating,
    be.overall_avg AS linked_behaviour_avg
FROM training_needs_analysis tna
JOIN training_needs_identified tni ON tna.training_need_id = tni.id
LEFT JOIN departments d ON tni.department_id = d.id
LEFT JOIN okr_objectives okr ON tna.linked_okr_id = okr.id
LEFT JOIN performance_appraisals pa ON tna.linked_appraisal_id = pa.id
LEFT JOIN behaviour_evaluations be ON tna.linked_behaviour_eval_id = be.id
ORDER BY tna.priority_score DESC;

-- Pulse survey results rollup (feeds back into TNI)
CREATE OR REPLACE VIEW v_pulse_survey_results AS
SELECT ps.question, ps.launched_at, d.name AS department_name,
    jsonb_agg(jsonb_build_object('respondent', e.first_name || ' ' || e.last_name, 'response', psr.response_text)) AS responses,
    ps.company_id
FROM pulse_surveys ps
LEFT JOIN departments d ON ps.department_id = d.id
LEFT JOIN pulse_survey_responses psr ON psr.pulse_survey_id = ps.id
LEFT JOIN employees e ON psr.respondent_employee_id = e.id
GROUP BY ps.id, ps.question, ps.launched_at, d.name, ps.company_id;
