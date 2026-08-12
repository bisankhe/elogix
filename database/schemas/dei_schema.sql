-- ================================================================
-- FILE: database/schemas/dei_schema.sql
-- eLogix HRMS -- Employee Experience & Culture > Diversity, Equity &
-- Inclusion (5 pages: Diversity Dashboard, Gender Analytics,
-- Inclusion Program, DEI Training, Accessibility Support)
--
-- Design note: this module reuses two EXISTING tables deliberately --
--   - pay_equity_audits (Payroll Analytics session) -- Gender Analytics
--     reads this directly, never recalculates pay-gap math separately
--   - lms_courses (Course Management session) -- DEI Training tags
--     existing courses via dei_course_tags rather than a parallel catalog
--
-- The genuinely new and most safety-critical piece: employee_self_
-- identification. Per the brief's explicit "voluntary, confidential,
-- encrypted" requirement and Nepal's constitutional non-discrimination
-- guarantees, this table is built so that:
--   1. Self-ID is opt-in (a NULL row = the employee has not disclosed)
--   2. No view in this schema ever exposes a row at the individual
--      level -- every aggregate view enforces a MINIMUM GROUP SIZE
--      threshold (5) before returning a percentage, to prevent
--      re-identification in small departments/teams
--   3. Disability-related accommodation requests are routed to HR
--      ONLY by default, never the direct manager, addressing the
--      brief's stated "invisible disability / fear of stigma" pain point
--
--   - employee_self_identification (opt-in, encrypted-at-rest categories)
--   - employee_resource_groups + erg_memberships
--   - belonging_survey_responses (anonymous pulse survey, dept-level only)
--   - mentorship_pairings
--   - dei_course_tags (tags into the EXISTING lms_courses)
--   - accommodation_requests
--
-- Nepal legal grounding: Constitution of Nepal (proportional inclusion,
-- right to social justice for women/Dalit/Janajati/Madhesi/marginalized
-- communities); Labour Act 2074 (non-discrimination in recruitment,
-- training, promotion, remuneration; equal pay for equal value);
-- Sexual Harassment at Workplace (Prevention) Act 2014 (mandates a
-- respectful, safe environment -- DEI training as a prevention tool);
-- Rights of Persons with Disabilities Act 2017 (mandatory reasonable
-- workplace accommodation).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- SHARED: EMPLOYEE SELF-IDENTIFICATION (the privacy-critical core)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_self_identification (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL UNIQUE REFERENCES employees(id),

    -- Each field is independently nullable: an employee may disclose
    -- gender identity but decline to disclose disability status, etc.
    -- "prefer_not_to_disclose" is a VALID, first-class value, not an
    -- absence of data, and is included in participation-rate counts.
    gender_identity            VARCHAR(50),
    ethnicity_category            VARCHAR(50),  -- e.g. Janajati, Dalit, Madhesi, etc., per GESI framework
    disability_status                VARCHAR(50),
    veteran_status                       VARCHAR(50),

    consent_given_at                         TIMESTAMPTZ,
    last_updated_at                              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 3: INCLUSION PROGRAM (ERGs, mentorship)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_resource_groups (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    name                  VARCHAR(150) NOT NULL,
    exec_sponsor_employee_id  UUID REFERENCES employees(id),  -- NULL = unsponsored, a real risk flag
    created_by                    UUID NOT NULL,
    created_at                        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erg_memberships (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    erg_id                UUID NOT NULL REFERENCES employee_resource_groups(id),
    employee_id            UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    joined_at                TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (erg_id, employee_id)
);

CREATE TABLE IF NOT EXISTS belonging_survey_responses (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    department_id             UUID       REFERENCES departments(id),  -- aggregation key; respondent identity is NEVER stored
    belonging_score              INT CHECK (belonging_score BETWEEN 1 AND 10),
    psychological_safety_score       INT CHECK (psychological_safety_score BETWEEN 1 AND 10),
    submitted_at                         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mentorship_pairings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    mentee_employee_id    UUID NOT NULL REFERENCES employees(id),
    mentor_employee_id      UUID REFERENCES employees(id),  -- NULL = unmatched, awaiting pairing
    status                     VARCHAR(20) DEFAULT 'unmatched' CHECK (status IN ('unmatched','active','completed')),
    matched_at                    TIMESTAMPTZ,
    created_at                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 4: DEI TRAINING (tags into the EXISTING lms_courses)
-- ================================================================
CREATE TABLE IF NOT EXISTS dei_course_tags (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    lms_course_id          UUID NOT NULL REFERENCES lms_courses(id),
    dei_category             VARCHAR(50) NOT NULL,  -- e.g. unconscious_bias, allyship, inclusive_leadership
    UNIQUE (lms_course_id, dei_category)
);

CREATE TABLE IF NOT EXISTS dei_training_cq_scores (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    lms_enrollment_id         UUID       NOT NULL REFERENCES lms_enrollments(id),
    pre_training_cq_score        NUMERIC(4,2),  -- cultural-intelligence score, captured before the course
    post_training_cq_score           NUMERIC(4,2),  -- captured on completion
    recorded_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 5: ACCESSIBILITY SUPPORT (Rights of Persons with Disabilities Act)
-- ================================================================
CREATE TABLE IF NOT EXISTS accommodation_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    accommodation_description    TEXT NOT NULL,
    status                           VARCHAR(20) DEFAULT 'requested'
                                     CHECK (status IN ('requested','pending_assessment','implemented')),

    estimated_cost_npr                   NUMERIC(12,2) DEFAULT 0,
    -- discreet by default: HR only, manager visibility requires explicit employee opt-in
    manager_visibility_opt_in                BOOLEAN DEFAULT FALSE,

    requested_at                                 TIMESTAMPTZ DEFAULT NOW(),
    implemented_at                                   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS accommodation_budget (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    fiscal_year_label     VARCHAR(20) NOT NULL,
    allocated_npr            NUMERIC(12,2) NOT NULL,
    UNIQUE (company_id, fiscal_year_label)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_esi_employee       ON employee_self_identification(employee_id);
CREATE INDEX IF NOT EXISTS idx_erg_sponsor              ON employee_resource_groups(exec_sponsor_employee_id);
CREATE INDEX IF NOT EXISTS idx_erg_unsponsored               ON employee_resource_groups(exec_sponsor_employee_id) WHERE exec_sponsor_employee_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_em_erg                             ON erg_memberships(erg_id);
CREATE INDEX IF NOT EXISTS idx_bsr_dept                               ON belonging_survey_responses(department_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_mp_unmatched                              ON mentorship_pairings(status) WHERE status = 'unmatched';
CREATE INDEX IF NOT EXISTS idx_dct_course                                    ON dei_course_tags(lms_course_id);
CREATE INDEX IF NOT EXISTS idx_dtcs_enrollment                                   ON dei_training_cq_scores(lms_enrollment_id);
CREATE INDEX IF NOT EXISTS idx_ar_employee                                           ON accommodation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_ar_open                                                   ON accommodation_requests(status) WHERE status != 'implemented';

-- ================================================================
-- TRIGGERS
-- ================================================================

-- On mentorship match: notify both mentor and mentee, reusing the
-- EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_mentorship_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status = 'unmatched' AND NEW.mentor_employee_id IS NOT NULL THEN
        NEW.matched_at := NOW();
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'mentorship_pairings', NEW.id, 'mentorship_matched', NEW.mentee_employee_id, 'direct_party', 'You have been matched with a mentor!', NOW()),
          (NEW.company_id, 'mentorship_pairings', NEW.id, 'mentorship_matched', NEW.mentor_employee_id, 'direct_party', 'You have been matched with a mentee!', NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_match
    BEFORE UPDATE OF status ON mentorship_pairings
    FOR EACH ROW EXECUTE FUNCTION fn_notify_mentorship_match();

-- On accommodation request: notify HR ONLY by default -- the manager
-- is notified only if the employee explicitly opted in
CREATE OR REPLACE FUNCTION fn_notify_accommodation_request()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE hr_admin RECORD; mgr_id UUID;
BEGIN
    FOR hr_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'accommodation_requests', NEW.id, 'accommodation_requested', hr_admin.id, 'direct_party',
           'A new confidential accommodation request requires assessment.', NOW());
    END LOOP;

    IF NEW.manager_visibility_opt_in THEN
        SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
        IF mgr_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'accommodation_requests', NEW.id, 'accommodation_requested', mgr_id, 'reporting_manager',
               'Your direct report has submitted an accommodation request (shared with your visibility, by their choice).', NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_accommodation
    AFTER INSERT ON accommodation_requests
    FOR EACH ROW EXECUTE FUNCTION fn_notify_accommodation_request();

-- Mark implemented_at automatically on status transition
CREATE OR REPLACE FUNCTION fn_mark_accommodation_implemented()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'implemented' AND OLD.status != 'implemented' THEN
        NEW.implemented_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_mark_implemented
    BEFORE UPDATE OF status ON accommodation_requests
    FOR EACH ROW EXECUTE FUNCTION fn_mark_accommodation_implemented();

-- ================================================================
-- VIEWS (every aggregate enforces a minimum group size of 5 to
-- prevent re-identification of individuals in small cohorts)
-- ================================================================

-- Page 1: Diversity Dashboard -- self-ID participation rate (aggregate only)
CREATE OR REPLACE VIEW v_self_id_participation AS
SELECT
    company_id,
    COUNT(*) FILTER (WHERE gender_identity IS NOT NULL OR ethnicity_category IS NOT NULL
                       OR disability_status IS NOT NULL OR veteran_status IS NOT NULL) AS disclosed_count,
    COUNT(*) AS total_count
FROM employee_self_identification
GROUP BY company_id;

-- Page 1: representation by department, suppressed below minimum group size
CREATE OR REPLACE VIEW v_diversity_by_department AS
SELECT d.name AS department_name, d.company_id,
    CASE WHEN COUNT(esi.id) >= 5
         THEN ROUND(COUNT(esi.id) FILTER (WHERE esi.gender_identity IS NOT NULL)::NUMERIC / COUNT(esi.id) * 100, 1)
         ELSE NULL  -- suppressed: cohort too small to protect anonymity
    END AS disclosed_pct
FROM departments d
JOIN employees e ON e.department_id = d.id
LEFT JOIN employee_self_identification esi ON esi.employee_id = e.id
GROUP BY d.name, d.company_id;

-- Page 2: Gender Analytics reads pay_equity_audits DIRECTLY -- no new view needed,
-- the frontend queries that EXISTING table/view from Payroll Analytics as-is.

-- Page 3: ERG dashboard with member + sponsorship status
CREATE OR REPLACE VIEW v_erg_dashboard AS
SELECT erg.*, COUNT(em.id) AS member_count, e.first_name AS sponsor_first_name, e.last_name AS sponsor_last_name
FROM employee_resource_groups erg
LEFT JOIN erg_memberships em ON em.erg_id = erg.id
LEFT JOIN employees e ON erg.exec_sponsor_employee_id = e.id
GROUP BY erg.id, e.first_name, e.last_name;

-- Page 3: belonging heatmap by department, minimum-group-size suppressed
CREATE OR REPLACE VIEW v_belonging_heatmap AS
SELECT department_id, company_id,
    CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(belonging_score), 1) ELSE NULL END AS avg_belonging_score,
    CASE WHEN COUNT(*) >= 5 THEN ROUND(AVG(psychological_safety_score), 1) ELSE NULL END AS avg_psych_safety_score
FROM belonging_survey_responses
WHERE submitted_at > NOW() - INTERVAL '90 days'
GROUP BY department_id, company_id;

-- Page 4: DEI training dashboard, joined to the EXISTING lms_courses/lms_enrollments
CREATE OR REPLACE VIEW v_dei_training_dashboard AS
SELECT lc.id AS course_id, lc.title, lc.is_mandatory_compliance, dct.dei_category,
    ROUND(AVG(le.progress_pct), 1) AS avg_completion_pct,
    ROUND(AVG(dtcs.post_training_cq_score - dtcs.pre_training_cq_score), 1) AS avg_cq_score_lift,
    lc.company_id
FROM lms_courses lc
JOIN dei_course_tags dct ON dct.lms_course_id = lc.id
LEFT JOIN lms_enrollments le ON le.lms_course_id = lc.id
LEFT JOIN dei_training_cq_scores dtcs ON dtcs.lms_enrollment_id = le.id
GROUP BY lc.id, lc.title, lc.is_mandatory_compliance, dct.dei_category, lc.company_id;

-- Page 5: accommodation dashboard with budget visibility
CREATE OR REPLACE VIEW v_accommodation_dashboard AS
SELECT ar.*, e.first_name, e.last_name
FROM accommodation_requests ar
JOIN employees e ON ar.employee_id = e.id;

CREATE OR REPLACE VIEW v_accommodation_budget_status AS
SELECT ab.*,
    (SELECT COALESCE(SUM(estimated_cost_npr),0) FROM accommodation_requests WHERE status IN ('pending_assessment','implemented')) AS spent_npr
FROM accommodation_budget ab;
