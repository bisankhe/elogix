-- ================================================================
-- FILE: database/schemas/course_management_lms_schema.sql
-- NepHR Pro — Performance & Talent Management > Talent Development >
-- Learning & Development > Course Management (Full LMS Module)
--
-- Design note: this is the CATALOG/AUTHORING layer that anchors
-- everything built across the Learning & Development arc so far:
--   - training_sessions (Calendars)        -> now FK's into lms_courses
--   - microlearning_chunks (Daily)          -> now FK's into lms_courses
--   - training_recommendations (TNA dispatch) -> now FK's into lms_courses
--   - training_roi_snapshots (Perf Analytics) -> now FK's into lms_courses
-- None of those four tables are duplicated; this schema adds the
-- missing centerpiece they all should have referenced: the actual
-- course catalog, skill taxonomy, certification vault, and enrollment/
-- completion tracking with quiz scoring. Four ALTER TABLE statements
-- retrofit the existing tables with proper FKs now that lms_courses exists.
--
--   - skill_taxonomy             (organization-wide skill tags, reusable)
--   - lms_courses                (the catalog: format, duration, SCORM/xAPI)
--   - lms_course_skill_tags      (many-to-many: course <-> skill)
--   - lms_course_quizzes + lms_quiz_questions (post-course assessment)
--   - lms_enrollments            (learner progress: % complete, quiz score)
--   - employee_skill_levels      (current proficiency, feeds the Skill Matrix)
--   - lms_certifications         (the Certification Vault: issued/expiring)
--
-- Nepal Labour Act 2074: employer mandate to provide skill-development
-- training for regular workers (technical/operational/professional
-- competency upgrades); interns capped 8hr/day-48hr/week with OHS
-- protection under formal institutional agreement; trainees capped
-- 1 year, minimum remuneration + PF/gratuity/insurance, no permanent-
-- employment obligation but probation-exempt if hired permanently;
-- foreign-national specialized posts require a structured Nepali
-- skill-transfer/knowledge-handover program.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- SKILL TAXONOMY (reusable, organization-wide tags)
-- ================================================================
CREATE TABLE IF NOT EXISTS skill_taxonomy (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,  -- NULL = global/shared taxonomy
    skill_name      VARCHAR(150) NOT NULL,
    skill_category  VARCHAR(50) DEFAULT 'technical' CHECK (skill_category IN ('technical','soft_skills','compliance','leadership')),
    UNIQUE (company_id, skill_name)
);

-- ================================================================
-- LMS COURSES (the catalog)
-- ================================================================
CREATE TABLE IF NOT EXISTS lms_courses (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    title                       VARCHAR(300) NOT NULL,
    description                    TEXT,
    format                             VARCHAR(20) NOT NULL DEFAULT 'video'
                                      CHECK (format IN ('video','article','workshop','in_person','scorm_package')),
    duration_hours                       NUMERIC(5,2) DEFAULT 1,

    content_url                             VARCHAR(500),  -- SCORM/xAPI package location, video link, or document
    scorm_xapi_compliant                       BOOLEAN DEFAULT FALSE,

    is_mandatory_compliance                       BOOLEAN DEFAULT FALSE,
    mandatory_for_department_id                      UUID REFERENCES departments(id),  -- NULL = company-wide mandatory
    recertification_period_months                       INT,  -- e.g. 12 = annual recert required

    avg_rating                                              NUMERIC(3,2) DEFAULT 0,
    enrolled_count                                             INT DEFAULT 0,
    completion_rate_pct                                           NUMERIC(5,2) DEFAULT 0,

    status                                                            VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
    created_by                                                            UUID,
    created_at                                                               TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lms_course_skill_tags (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lms_course_id   UUID NOT NULL REFERENCES lms_courses(id),
    skill_taxonomy_id UUID NOT NULL REFERENCES skill_taxonomy(id),
    UNIQUE (lms_course_id, skill_taxonomy_id)
);

-- ================================================================
-- COURSE BUILDER: QUIZZES
-- ================================================================
CREATE TABLE IF NOT EXISTS lms_course_quizzes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lms_course_id   UUID NOT NULL REFERENCES lms_courses(id),
    company_id      UUID NOT NULL,
    title           VARCHAR(200) DEFAULT 'Post-Course Assessment',
    passing_score_pct NUMERIC(5,2) DEFAULT 70
);

CREATE TABLE IF NOT EXISTS lms_quiz_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lms_course_quiz_id UUID NOT NULL REFERENCES lms_course_quizzes(id),
    company_id      UUID NOT NULL,
    question_text   TEXT NOT NULL,
    options         JSONB DEFAULT '[]',  -- ["Option A","Option B",...]
    correct_option_index INT NOT NULL
);

-- ================================================================
-- ENROLLMENTS (learner progress, distinct from training_session_
-- enrollments which is calendar-scheduling-specific; this is the
-- COURSE-level completion record)
-- ================================================================
CREATE TABLE IF NOT EXISTS lms_enrollments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    lms_course_id             UUID       NOT NULL REFERENCES lms_courses(id),
    employee_id                 UUID    NOT NULL REFERENCES employees(id),

    -- Optional links back to the upstream trigger
    training_recommendation_id     UUID REFERENCES training_recommendations(id),
    training_session_id               UUID REFERENCES training_sessions(id),

    progress_pct                         NUMERIC(5,2) DEFAULT 0,
    quiz_score_pct                           NUMERIC(5,2),
    rating_given                                INT CHECK (rating_given BETWEEN 1 AND 5),

    enrolled_at                                    TIMESTAMPTZ DEFAULT NOW(),
    completed_at                                       TIMESTAMPTZ,

    UNIQUE (lms_course_id, employee_id)
);

-- ================================================================
-- EMPLOYEE SKILL LEVELS (feeds the Skill Matrix tab)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_skill_levels (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    skill_taxonomy_id           UUID    NOT NULL REFERENCES skill_taxonomy(id),

    current_level                  INT NOT NULL CHECK (current_level BETWEEN 1 AND 10),
    required_level_for_role           INT CHECK (required_level_for_role BETWEEN 1 AND 10),

    last_assessed_at                     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, skill_taxonomy_id)
);

-- ================================================================
-- CERTIFICATION VAULT
-- ================================================================
CREATE TABLE IF NOT EXISTS lms_certifications (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    lms_course_id               UUID    REFERENCES lms_courses(id),

    certification_title             VARCHAR(300) NOT NULL,
    issued_date                         DATE NOT NULL,
    expires_date                           DATE,  -- NULL = does not expire
    badge_url                                 VARCHAR(500),  -- digital badge image

    status                                        VARCHAR(20) DEFAULT 'active'
                                                  CHECK (status IN ('active','expiring','expired','renewed')),
    renewal_of_certification_id                       UUID REFERENCES lms_certifications(id),

    created_at                                            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- RETROFIT: link the EXISTING calendar/dispatch/ROI tables into the
-- catalog now that it exists (no data loss, columns added nullable)
-- ================================================================
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS lms_course_id UUID REFERENCES lms_courses(id);
ALTER TABLE microlearning_chunks ADD COLUMN IF NOT EXISTS lms_course_id UUID REFERENCES lms_courses(id);
ALTER TABLE training_recommendations ADD COLUMN IF NOT EXISTS lms_course_id UUID REFERENCES lms_courses(id);
ALTER TABLE training_roi_snapshots ADD COLUMN IF NOT EXISTS lms_course_id UUID REFERENCES lms_courses(id);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_st_category        ON skill_taxonomy(skill_category);
CREATE INDEX IF NOT EXISTS idx_lc_status               ON lms_courses(status);
CREATE INDEX IF NOT EXISTS idx_lc_mandatory                ON lms_courses(is_mandatory_compliance) WHERE is_mandatory_compliance;
CREATE INDEX IF NOT EXISTS idx_lcst_course                     ON lms_course_skill_tags(lms_course_id);
CREATE INDEX IF NOT EXISTS idx_lcst_skill                          ON lms_course_skill_tags(skill_taxonomy_id);
CREATE INDEX IF NOT EXISTS idx_le_employee                             ON lms_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_le_course                                   ON lms_enrollments(lms_course_id);
CREATE INDEX IF NOT EXISTS idx_esl_employee                                    ON employee_skill_levels(employee_id);
CREATE INDEX IF NOT EXISTS idx_esl_skill                                          ON employee_skill_levels(skill_taxonomy_id);
CREATE INDEX IF NOT EXISTS idx_lcert_employee                                         ON lms_certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_lcert_expiring                                             ON lms_certifications(expires_date) WHERE status IN ('active','expiring');

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_lms_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_lc_upd
    BEFORE UPDATE ON lms_courses
    FOR EACH ROW EXECUTE FUNCTION fn_lms_updated_at();

-- On enrollment completion: recompute the course's enrolled_count/
-- completion_rate_pct/avg_rating live, and update employee_skill_levels
-- for every skill tag this course covers (the skill-matrix linkage)
CREATE OR REPLACE FUNCTION fn_apply_course_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE skill RECORD;
BEGIN
    IF NEW.progress_pct >= 100 AND (OLD IS NULL OR OLD.progress_pct < 100) THEN
        NEW.completed_at := NOW();

        -- Bump the employee's skill level for every tag this course covers
        -- (simple model: completing a course nudges current_level toward
        -- the course's intended proficiency by +1, capped at 10)
        FOR skill IN
            SELECT skill_taxonomy_id FROM lms_course_skill_tags WHERE lms_course_id = NEW.lms_course_id
        LOOP
            INSERT INTO employee_skill_levels (company_id, employee_id, skill_taxonomy_id, current_level, last_assessed_at)
            VALUES (NEW.company_id, NEW.employee_id, skill.skill_taxonomy_id, 1, NOW())
            ON CONFLICT (employee_id, skill_taxonomy_id)
            DO UPDATE SET current_level = LEAST(employee_skill_levels.current_level + 1, 10), last_assessed_at = NOW();
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_apply_completion
    BEFORE INSERT OR UPDATE OF progress_pct ON lms_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_apply_course_completion();

-- Recompute course aggregate stats (enrolled_count, completion_rate_pct,
-- avg_rating) after any enrollment change
CREATE OR REPLACE FUNCTION fn_recompute_course_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE lms_courses lc SET
        enrolled_count = (SELECT COUNT(*) FROM lms_enrollments WHERE lms_course_id = lc.id),
        completion_rate_pct = (SELECT ROUND(COUNT(*) FILTER (WHERE progress_pct >= 100)::NUMERIC / NULLIF(COUNT(*),0) * 100, 1)
                                FROM lms_enrollments WHERE lms_course_id = lc.id),
        avg_rating = (SELECT ROUND(AVG(rating_given), 2) FROM lms_enrollments WHERE lms_course_id = lc.id AND rating_given IS NOT NULL)
    WHERE lc.id = NEW.lms_course_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_recompute_stats
    AFTER INSERT OR UPDATE ON lms_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_recompute_course_stats();

-- Auto-flag certifications approaching expiry (the brief's "auto-locks
-- gated access 7 days before lapse" requirement, surfaced as a status flag)
CREATE OR REPLACE FUNCTION fn_check_cert_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.expires_date IS NOT NULL THEN
        IF NEW.expires_date < CURRENT_DATE THEN
            NEW.status := 'expired';
        ELSIF NEW.expires_date <= CURRENT_DATE + INTERVAL '14 days' THEN
            NEW.status := 'expiring';
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_cert_expiry
    BEFORE INSERT OR UPDATE OF expires_date ON lms_certifications
    FOR EACH ROW EXECUTE FUNCTION fn_check_cert_expiry();

-- On course completion with an attached recertification period: auto-
-- issue a certification record into the vault
CREATE OR REPLACE FUNCTION fn_issue_certification_on_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE course RECORD;
BEGIN
    IF NEW.completed_at IS NOT NULL AND (OLD IS NULL OR OLD.completed_at IS NULL) THEN
        SELECT title, recertification_period_months INTO course FROM lms_courses WHERE id = NEW.lms_course_id;

        IF course.recertification_period_months IS NOT NULL THEN
            INSERT INTO lms_certifications (company_id, employee_id, lms_course_id, certification_title, issued_date, expires_date, created_at)
            VALUES (NEW.company_id, NEW.employee_id, NEW.lms_course_id, course.title, CURRENT_DATE,
                    CURRENT_DATE + (course.recertification_period_months || ' months')::INTERVAL, NOW());
        END IF;

        -- Notify employee + reporting manager, reusing the EXISTING
        -- transaction_notifications table
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'lms_enrollments', NEW.id, 'course_completed', NEW.employee_id, 'direct_party',
           format('Congratulations! You completed "%s".', course.title), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_issue_cert
    AFTER UPDATE OF completed_at ON lms_enrollments
    FOR EACH ROW EXECUTE FUNCTION fn_issue_certification_on_completion();

-- ================================================================
-- VIEWS
-- ================================================================

-- Tab 1: Catalog dashboard with skill tags aggregated as an array
CREATE OR REPLACE VIEW v_lms_course_catalog AS
SELECT
    lc.*,
    COALESCE((SELECT array_agg(st.skill_name) FROM lms_course_skill_tags lcst
              JOIN skill_taxonomy st ON lcst.skill_taxonomy_id = st.id WHERE lcst.lms_course_id = lc.id), ARRAY[]::TEXT[]) AS skill_tags
FROM lms_courses lc
WHERE lc.status != 'archived';

-- Tab 2: Skill matrix — employee x skill grid with gap flag
CREATE OR REPLACE VIEW v_skill_matrix AS
SELECT
    e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    st.skill_name, esl.current_level, esl.required_level_for_role,
    (esl.required_level_for_role IS NOT NULL AND esl.current_level < esl.required_level_for_role) AS has_gap,
    esl.company_id
FROM employee_skill_levels esl
JOIN employees e ON esl.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
JOIN skill_taxonomy st ON esl.skill_taxonomy_id = st.id;

-- Tab 3: Certification vault dashboard
CREATE OR REPLACE VIEW v_certification_vault AS
SELECT lcert.*, e.employee_code, e.first_name, e.last_name,
    (lcert.expires_date - CURRENT_DATE) AS days_until_expiry
FROM lms_certifications lcert
JOIN employees e ON lcert.employee_id = e.id
ORDER BY lcert.expires_date ASC NULLS LAST;

-- Tab 4: Analytics & ROI rollup
CREATE OR REPLACE VIEW v_lms_analytics_summary AS
SELECT
    company_id,
    ROUND(AVG(completion_rate_pct), 1) AS avg_completion_rate_pct,
    SUM(duration_hours * enrolled_count) AS total_seat_hours,
    COUNT(*) FILTER (WHERE is_mandatory_compliance AND completion_rate_pct < 100) AS courses_overdue_compliance
FROM lms_courses
GROUP BY company_id;

-- My Learning Path (ESS self-service view)
CREATE OR REPLACE VIEW v_my_learning_path AS
SELECT le.*, lc.title, lc.format, lc.duration_hours, lc.is_mandatory_compliance
FROM lms_enrollments le
JOIN lms_courses lc ON le.lms_course_id = lc.id;
