-- ================================================================
-- FILE: database/schemas/training_feedback_roi_assessment_schema.sql
-- eLogix HRMS — Performance & Talent Management > Talent Development >
-- Learning & Development > Training Feedback + Effectiveness of
-- Training + ROI on Training + Assessment & Quiz (4 pages)
--
-- Design note: this is the L&D MEASUREMENT layer (Kirkpatrick Levels
-- 1-4), integrating with existing tables rather than duplicating any:
--   - Feedback (L1)        -> new pulse_survey_feedback, auto-triggered
--                             48h post lms_enrollments.completed_at
--   - Effectiveness (L3/4) -> new training_effectiveness_baselines,
--                             cross-references EXISTING performance_appraisals
--   - ROI                  -> extends the EXISTING training_roi_snapshots
--                             (Performance Analytics) with a full cost/
--                             benefit input breakdown, never duplicating
--                             the score-lift mechanism already there
--   - Assessment & Quiz    -> new quiz_attempts (per-attempt history),
--                             over the EXISTING lms_course_quizzes/
--                             lms_quiz_questions (Course Management),
--                             writing results back to
--                             lms_enrollments.quiz_score_pct
--
--   - pulse_survey_feedback        (Kirkpatrick L1, auto-triggered)
--   - training_effectiveness_baselines (Kirkpatrick L3/4, pre/post)
--   - training_roi_cost_inputs + training_roi_benefit_inputs (the
--     calculation engine's line items, distinct from the snapshot total)
--   - quiz_attempts + quiz_attempt_answers (per-attempt history + grading)
--
-- Nepal Labour Act 2017 (2074): training methodology/quizzes left to
-- management discretion; any assessment forming part of formal
-- Performance Appraisal must be transparently communicated beforehand;
-- non-discrimination applies to feedback/evaluation collection;
-- disciplinary action based on assessment results must follow lawful
-- procedure to avoid wrongful-dismissal disputes.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: TRAINING FEEDBACK (Kirkpatrick Level 1)
-- ================================================================
CREATE TABLE IF NOT EXISTS pulse_survey_feedback (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    lms_enrollment_id         UUID       NOT NULL REFERENCES lms_enrollments(id),
    employee_id                  UUID    NOT NULL REFERENCES employees(id),
    lms_course_id                    UUID NOT NULL REFERENCES lms_courses(id),

    csat_rating                          INT NOT NULL CHECK (csat_rating BETWEEN 1 AND 5),
    application_answer                      TEXT NOT NULL,  -- "How will you apply this to your current work?"

    sentiment                                  VARCHAR(10) GENERATED ALWAYS AS (
                                               CASE WHEN csat_rating >= 4 THEN 'positive'
                                                    WHEN csat_rating = 3 THEN 'neutral'
                                                    ELSE 'negative' END
                                             ) STORED,
    escalated_to_ld_lead                          BOOLEAN DEFAULT FALSE,

    submitted_at                                     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (lms_enrollment_id)
);

-- ================================================================
-- PAGE 2: EFFECTIVENESS OF TRAINING (Kirkpatrick Level 3/4)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_effectiveness_baselines (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    lms_course_id             UUID       NOT NULL REFERENCES lms_courses(id),
    employee_id                  UUID    NOT NULL REFERENCES employees(id),

    pre_training_score                       NUMERIC(4,2),  -- captured BEFORE the course starts
    post_training_score                          NUMERIC(4,2),  -- captured at the 90-day follow-up
    follow_up_due_date                                DATE,
    follow_up_completed_at                                TIMESTAMPTZ,

    applied_on_job                                           BOOLEAN,  -- L3: did behavior actually change
    linked_appraisal_id                                          UUID REFERENCES performance_appraisals(id),

    created_at                                                      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (lms_course_id, employee_id)
);

-- ================================================================
-- PAGE 3: ROI ON TRAINING (calculation engine, extends the EXISTING
-- training_roi_snapshots with full cost/benefit line items)
-- ================================================================
CREATE TABLE IF NOT EXISTS training_roi_cost_inputs (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    training_roi_snapshot_id UUID       NOT NULL REFERENCES training_roi_snapshots(id),

    course_fees_npr                          NUMERIC(12,2) DEFAULT 0,
    facilitator_cost_npr                         NUMERIC(12,2) DEFAULT 0,
    lost_productivity_npr                            NUMERIC(12,2) DEFAULT 0,
    lms_license_share_npr                                NUMERIC(12,2) DEFAULT 0,

    total_cost_npr                                          NUMERIC(12,2) GENERATED ALWAYS AS (
                                                            course_fees_npr + facilitator_cost_npr + lost_productivity_npr + lms_license_share_npr
                                                          ) STORED
);

CREATE TABLE IF NOT EXISTS training_roi_benefit_inputs (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    training_roi_snapshot_id UUID       NOT NULL REFERENCES training_roi_snapshots(id),

    error_reduction_value_npr                NUMERIC(12,2) DEFAULT 0,
    productivity_gain_value_npr                  NUMERIC(12,2) DEFAULT 0,

    total_benefit_npr                               NUMERIC(12,2) GENERATED ALWAYS AS (
                                                     error_reduction_value_npr + productivity_gain_value_npr
                                                   ) STORED
);

-- ================================================================
-- PAGE 4: ASSESSMENT & QUIZ (per-attempt history over the EXISTING
-- lms_course_quizzes/lms_quiz_questions)
-- ================================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    lms_course_quiz_id        UUID       NOT NULL REFERENCES lms_course_quizzes(id),
    lms_enrollment_id            UUID    NOT NULL REFERENCES lms_enrollments(id),
    employee_id                     UUID NOT NULL REFERENCES employees(id),

    score_pct                          NUMERIC(5,2),
    passed                                 BOOLEAN,

    started_at                               TIMESTAMPTZ DEFAULT NOW(),
    submitted_at                                TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_attempt_id     UUID NOT NULL REFERENCES quiz_attempts(id),
    lms_quiz_question_id UUID NOT NULL REFERENCES lms_quiz_questions(id),
    company_id          UUID NOT NULL,

    selected_option_index INT NOT NULL,
    is_correct          BOOLEAN
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_psf_employee       ON pulse_survey_feedback(employee_id);
CREATE INDEX IF NOT EXISTS idx_psf_negative            ON pulse_survey_feedback(sentiment) WHERE sentiment = 'negative';
CREATE INDEX IF NOT EXISTS idx_teb_course                  ON training_effectiveness_baselines(lms_course_id);
CREATE INDEX IF NOT EXISTS idx_teb_followup_due                ON training_effectiveness_baselines(follow_up_due_date) WHERE follow_up_completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trci_snapshot                       ON training_roi_cost_inputs(training_roi_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_trbi_snapshot                            ON training_roi_benefit_inputs(training_roi_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_qa_enrollment                                ON quiz_attempts(lms_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_qa_employee                                      ON quiz_attempts(employee_id);
CREATE INDEX IF NOT EXISTS idx_qaa_attempt                                          ON quiz_attempt_answers(quiz_attempt_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-escalate negative feedback to the L&D Lead, reusing the EXISTING
-- transaction_notifications table
CREATE OR REPLACE FUNCTION fn_escalate_negative_feedback()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE course_title TEXT;
BEGIN
    IF NEW.sentiment = 'negative' AND NOT NEW.escalated_to_ld_lead THEN
        NEW.escalated_to_ld_lead := TRUE;
        SELECT title INTO course_title FROM lms_courses WHERE id = NEW.lms_course_id;

        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        SELECT NEW.company_id, 'pulse_survey_feedback', NEW.id, 'negative_feedback_escalated', e.id, 'direct_party',
               format('Negative feedback (CSAT %s/5) received for "%s" -- review recommended.', NEW.csat_rating, course_title), NOW()
        FROM employees e WHERE e.id IN (SELECT created_by FROM lms_courses WHERE id = NEW.lms_course_id);
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_escalate_negative
    BEFORE INSERT ON pulse_survey_feedback
    FOR EACH ROW EXECUTE FUNCTION fn_escalate_negative_feedback();

-- Auto-schedule the 90-day follow-up the moment a baseline is created
CREATE OR REPLACE FUNCTION fn_schedule_followup()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.follow_up_due_date IS NULL THEN
        NEW.follow_up_due_date := CURRENT_DATE + INTERVAL '90 days';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_schedule_followup
    BEFORE INSERT ON training_effectiveness_baselines
    FOR EACH ROW EXECUTE FUNCTION fn_schedule_followup();

-- Auto-grade a quiz attempt: compute score_pct from quiz_attempt_answers,
-- write back to lms_enrollments.quiz_score_pct (no duplicate score field)
CREATE OR REPLACE FUNCTION fn_grade_quiz_attempt()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE total_q INT; correct_q INT; pct NUMERIC; passing NUMERIC; enrollment_id UUID;
BEGIN
    IF NEW.submitted_at IS NOT NULL AND (OLD IS NULL OR OLD.submitted_at IS NULL) THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct) INTO total_q, correct_q
        FROM quiz_attempt_answers WHERE quiz_attempt_id = NEW.id;

        pct := ROUND(correct_q::NUMERIC / NULLIF(total_q,0) * 100, 1);
        SELECT passing_score_pct INTO passing FROM lms_course_quizzes WHERE id = NEW.lms_course_quiz_id;

        NEW.score_pct := pct;
        NEW.passed := pct >= COALESCE(passing, 70);

        UPDATE lms_enrollments SET quiz_score_pct = pct WHERE id = NEW.lms_enrollment_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_grade_attempt
    BEFORE UPDATE OF submitted_at ON quiz_attempts
    FOR EACH ROW EXECUTE FUNCTION fn_grade_quiz_attempt();

-- Auto-mark each answer correct/incorrect against the question bank
CREATE OR REPLACE FUNCTION fn_check_answer_correctness()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE correct_idx INT;
BEGIN
    SELECT correct_option_index INTO correct_idx FROM lms_quiz_questions WHERE id = NEW.lms_quiz_question_id;
    NEW.is_correct := (NEW.selected_option_index = correct_idx);
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_correctness
    BEFORE INSERT ON quiz_attempt_answers
    FOR EACH ROW EXECUTE FUNCTION fn_check_answer_correctness();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: feedback dashboard + course scorecard
CREATE OR REPLACE VIEW v_training_feedback_dashboard AS
SELECT psf.*, e.first_name, e.last_name, lc.title AS course_title
FROM pulse_survey_feedback psf
JOIN employees e ON psf.employee_id = e.id
JOIN lms_courses lc ON psf.lms_course_id = lc.id;

CREATE OR REPLACE VIEW v_course_scorecard AS
SELECT
    lc.id AS course_id, lc.title, lc.completion_rate_pct,
    ROUND(AVG(psf.csat_rating), 2) AS avg_csat, COUNT(psf.id) AS response_count,
    lc.company_id
FROM lms_courses lc
LEFT JOIN pulse_survey_feedback psf ON psf.lms_course_id = lc.id
GROUP BY lc.id, lc.title, lc.completion_rate_pct, lc.company_id;

-- Page 2: effectiveness dashboard, including courses missing a baseline
CREATE OR REPLACE VIEW v_training_effectiveness_dashboard AS
SELECT
    lc.id AS course_id, lc.title AS course_title,
    EXISTS (SELECT 1 FROM training_effectiveness_baselines teb WHERE teb.lms_course_id = lc.id) AS has_baseline,
    (SELECT ROUND(AVG(pre_training_score),2) FROM training_effectiveness_baselines WHERE lms_course_id = lc.id) AS avg_pre_score,
    (SELECT ROUND(AVG(post_training_score),2) FROM training_effectiveness_baselines WHERE lms_course_id = lc.id) AS avg_post_score,
    (SELECT ROUND(COUNT(*) FILTER (WHERE applied_on_job)::NUMERIC / NULLIF(COUNT(*),0) * 100, 1)
       FROM training_effectiveness_baselines WHERE lms_course_id = lc.id AND follow_up_completed_at IS NOT NULL) AS applied_on_job_pct,
    lc.company_id
FROM lms_courses lc;

-- Page 3: ROI dashboard with full cost/benefit breakdown
CREATE OR REPLACE VIEW v_training_roi_full_breakdown AS
SELECT
    trs.*, lc.title AS course_title,
    trci.total_cost_npr, trbi.total_benefit_npr,
    (trbi.total_benefit_npr - trci.total_cost_npr) AS net_benefit_npr,
    ROUND((trbi.total_benefit_npr - trci.total_cost_npr) / NULLIF(trci.total_cost_npr,0) * 100, 1) AS roi_pct
FROM training_roi_snapshots trs
LEFT JOIN lms_courses lc ON trs.lms_course_id = lc.id
LEFT JOIN training_roi_cost_inputs trci ON trci.training_roi_snapshot_id = trs.id
LEFT JOIN training_roi_benefit_inputs trbi ON trbi.training_roi_snapshot_id = trs.id;

-- Page 4: My Assessments (ESS) + missed-topic recommendations
CREATE OR REPLACE VIEW v_my_assessments AS
SELECT
    le.id AS enrollment_id, le.employee_id, lc.title AS course_title, lcq.id AS quiz_id, lcq.passing_score_pct,
    qa.id AS attempt_id, qa.score_pct, qa.passed, qa.submitted_at,
    (SELECT array_agg(DISTINCT lqq.question_text) FROM quiz_attempt_answers qaa
       JOIN lms_quiz_questions lqq ON qaa.lms_quiz_question_id = lqq.id
       WHERE qaa.quiz_attempt_id = qa.id AND NOT qaa.is_correct) AS missed_topics
FROM lms_enrollments le
JOIN lms_courses lc ON le.lms_course_id = lc.id
LEFT JOIN lms_course_quizzes lcq ON lcq.lms_course_id = lc.id
LEFT JOIN quiz_attempts qa ON qa.lms_enrollment_id = le.id;
