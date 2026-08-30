-- ================================================================
-- FILE: database/schemas/succession_planning_schema.sql
-- eLogix HRMS -- Performance & Talent Management > Talent Development >
-- Succession Planning (5 pages: Successor Identification, Talent
-- Mapping, HiPo Employees, Readiness Assessment, Leadership Pipeline)
--
-- Design note: this module is heavily a SURFACING layer over EXISTING
-- tables from prior sessions:
--   - Talent Mapping        -> pure drag-and-drop UI over nine_box_grid
--                              (Payroll Analytics session) -- no new
--                              classification table needed
--   - HiPo Employees         -> reads leadership_pipeline.is_hipo
--                              (Career Development session) directly
--   - Leadership Pipeline       -> reads the EXISTING leadership_pipeline
--                              + v_leadership_pipeline_dashboard view
--                              verbatim -- zero new core data
-- Genuinely new tables, for what those prior sessions didn't cover:
--   - critical_roles            (the 1:N role -> candidate mapping engine)
--   - successor_candidates          (candidates per critical role, with
--                                  readiness tier + skill-match snapshot)
--   - readiness_calibrations           (3-tier sign-off: Manager + Skip-
--                                  Level + HR, preventing the "Ready Now
--                                  Fallacy" the brief explicitly names)
--   - idp_stretch_assignments               (mentor/rotation/stretch
--                                  tracking, linked to leadership_pipeline)
--   - talent_mapping_audit_log                  (drag-and-drop move history
--                                  for calibration defensibility)
--
-- Nepal Labour Act 2017 (2074): Section 18 (non-discrimination in
-- promotion/training -- talent-mapping/readiness criteria must be
-- applied equally and objectively); contract/designation must be
-- formally updated if a HiPo assumes a higher role; up-to-6-month
-- probation permitted for internal candidates transitioning into new
-- leadership roles; retrenchment/dismissal protocols still apply --
-- succession planning never authorizes arbitrarily replacing an
-- incumbent.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: SUCCESSOR IDENTIFICATION (critical role -> 1:N candidates)
-- ================================================================
CREATE TABLE IF NOT EXISTS critical_roles (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    designation_id            UUID       NOT NULL REFERENCES designations(id),
    incumbent_employee_id        UUID    REFERENCES employees(id),

    retirement_eligible              BOOLEAN DEFAULT FALSE,
    incumbent_flight_risk                VARCHAR(10) DEFAULT 'low' CHECK (incumbent_flight_risk IN ('low','medium','high')),

    created_at                              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (designation_id)
);

CREATE TABLE IF NOT EXISTS successor_candidates (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    critical_role_id          UUID       NOT NULL REFERENCES critical_roles(id),
    company_id             UUID         NOT NULL,
    candidate_employee_id        UUID    NOT NULL REFERENCES employees(id),

    readiness_tier                   VARCHAR(20) DEFAULT 'ready_3plus_yr'
                                     CHECK (readiness_tier IN ('ready_now','ready_1_2yr','ready_3plus_yr')),
    skill_match_pct                      NUMERIC(5,2) DEFAULT 0,  -- recomputed from employee_skill_levels

    added_at                                TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (critical_role_id, candidate_employee_id)
);

-- ================================================================
-- PAGE 4: READINESS ASSESSMENT (3-tier calibration, prevents the
-- "Ready Now Fallacy")
-- ================================================================
CREATE TABLE IF NOT EXISTS readiness_calibrations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    successor_candidate_id    UUID       NOT NULL REFERENCES successor_candidates(id),

    competency_name              VARCHAR(150) NOT NULL,
    current_level                    INT CHECK (current_level BETWEEN 1 AND 10),
    required_level                       INT CHECK (required_level BETWEEN 1 AND 10),

    manager_signed_off                      BOOLEAN DEFAULT FALSE,
    skip_level_signed_off                       BOOLEAN DEFAULT FALSE,
    hr_partner_signed_off                           BOOLEAN DEFAULT FALSE,

    fully_calibrated                                    BOOLEAN GENERATED ALWAYS AS (
                                                         manager_signed_off AND skip_level_signed_off AND hr_partner_signed_off
                                                       ) STORED,

    assessed_at                                                TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 5: LEADERSHIP PIPELINE -- IDP/stretch tracking (extends the
-- EXISTING leadership_pipeline, never duplicating its core columns)
-- ================================================================
CREATE TABLE IF NOT EXISTS idp_stretch_assignments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    leadership_pipeline_id    UUID       NOT NULL REFERENCES leadership_pipeline(id),

    stretch_assignment_description    TEXT,
    rotation_description                  TEXT,  -- cross-functional rotation, NULL/blank if none scheduled
    idp_progress_pct                          NUMERIC(5,2) DEFAULT 0,

    updated_at                                    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (leadership_pipeline_id)
);

-- ================================================================
-- PAGE 2: TALENT MAPPING -- drag-and-drop audit trail (the 9-box grid
-- classification itself lives in the EXISTING nine_box_grid table)
-- ================================================================
CREATE TABLE IF NOT EXISTS talent_mapping_audit_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id          UUID NOT NULL REFERENCES employees(id),

    moved_from_box          VARCHAR(20),  -- e.g. 'medium,low' (performance,potential)
    moved_to_box                VARCHAR(20) NOT NULL,
    moved_by                       UUID NOT NULL,
    review_cycle                       VARCHAR(20) NOT NULL,  -- links conceptually to nine_box_grid.review_cycle

    moved_at                              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_cr_designation       ON critical_roles(designation_id);
CREATE INDEX IF NOT EXISTS idx_cr_incumbent              ON critical_roles(incumbent_employee_id);
CREATE INDEX IF NOT EXISTS idx_sc_role                       ON successor_candidates(critical_role_id);
CREATE INDEX IF NOT EXISTS idx_sc_candidate                       ON successor_candidates(candidate_employee_id);
CREATE INDEX IF NOT EXISTS idx_sc_ready_now                            ON successor_candidates(readiness_tier) WHERE readiness_tier = 'ready_now';
CREATE INDEX IF NOT EXISTS idx_rcal_candidate                              ON readiness_calibrations(successor_candidate_id);
CREATE INDEX IF NOT EXISTS idx_rcal_incomplete                                  ON readiness_calibrations(fully_calibrated) WHERE NOT fully_calibrated;
CREATE INDEX IF NOT EXISTS idx_isa_pipeline                                          ON idp_stretch_assignments(leadership_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_isa_no_rotation                                            ON idp_stretch_assignments((rotation_description IS NULL));
CREATE INDEX IF NOT EXISTS idx_tmal_employee                                                  ON talent_mapping_audit_log(employee_id, moved_at);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_succession_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_isa_upd
    BEFORE UPDATE ON idp_stretch_assignments
    FOR EACH ROW EXECUTE FUNCTION fn_succession_updated_at();

-- Recompute skill_match_pct for a successor candidate whenever their
-- skill levels change (reuses the EXISTING employee_skill_levels,
-- mirroring the same pattern used in career_development_schema.sql)
CREATE OR REPLACE FUNCTION fn_recompute_successor_match()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE successor_candidates sc SET skill_match_pct = (
        SELECT ROUND(AVG(LEAST(esl.current_level::NUMERIC / NULLIF(esl.required_level_for_role,0), 1)) * 100, 1)
        FROM employee_skill_levels esl WHERE esl.employee_id = sc.candidate_employee_id AND esl.required_level_for_role IS NOT NULL
    )
    WHERE sc.candidate_employee_id = NEW.employee_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_recompute_successor_match
    AFTER INSERT OR UPDATE OF current_level ON employee_skill_levels
    FOR EACH ROW EXECUTE FUNCTION fn_recompute_successor_match();

-- Block a candidate from being marked "ready_now" unless all three
-- calibration tiers have signed off on EVERY tracked competency --
-- the database-level fix for the "Ready Now Fallacy"
CREATE OR REPLACE FUNCTION fn_block_uncalibrated_ready_now()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE incomplete_count INT;
BEGIN
    IF NEW.readiness_tier = 'ready_now' THEN
        SELECT COUNT(*) INTO incomplete_count
        FROM readiness_calibrations WHERE successor_candidate_id = NEW.id AND NOT fully_calibrated;

        IF incomplete_count > 0 THEN
            RAISE EXCEPTION 'Cannot mark Ready Now: % competenc(y/ies) still missing full Manager + Skip-Level + HR sign-off.', incomplete_count;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_ready_now
    BEFORE UPDATE OF readiness_tier ON successor_candidates
    FOR EACH ROW EXECUTE FUNCTION fn_block_uncalibrated_ready_now();

-- Log every drag-and-drop box move for calibration audit history,
-- and notify HR if an employee hasn't moved boxes in 3+ cycles is out
-- of scope for a single trigger (handled at query time via the view below)
CREATE OR REPLACE FUNCTION fn_log_talent_mapping_move()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.performance_rating IS DISTINCT FROM OLD.performance_rating
       OR NEW.potential_rating IS DISTINCT FROM OLD.potential_rating THEN
        INSERT INTO talent_mapping_audit_log (company_id, employee_id, moved_from_box, moved_to_box, moved_by, review_cycle, moved_at)
        VALUES (NEW.company_id, NEW.employee_id,
                OLD.performance_rating || ',' || OLD.potential_rating,
                NEW.performance_rating || ',' || NEW.potential_rating,
                NEW.employee_id, NEW.review_cycle, NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_log_move
    AFTER UPDATE OF performance_rating, potential_rating ON nine_box_grid
    FOR EACH ROW EXECUTE FUNCTION fn_log_talent_mapping_move();

-- On adding a candidate to a critical role: notify HR + the candidate's
-- manager, reusing the EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_candidate_added()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID; role_title TEXT;
BEGIN
    SELECT d.name INTO role_title FROM critical_roles cr JOIN designations d ON cr.designation_id = d.id WHERE cr.id = NEW.critical_role_id;
    SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.candidate_employee_id;

    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    VALUES
      (NEW.company_id, 'successor_candidates', NEW.id, 'successor_candidate_added', NEW.candidate_employee_id, 'direct_party',
       format('You have been identified as a potential successor for "%s".', role_title), NOW());

    IF mgr_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'successor_candidates', NEW.id, 'successor_candidate_added', mgr_id, 'reporting_manager',
           format('Your direct report has been added as a succession candidate for "%s".', role_title), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_candidate
    AFTER INSERT ON successor_candidates
    FOR EACH ROW EXECUTE FUNCTION fn_notify_candidate_added();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Successor Identification dashboard
CREATE OR REPLACE VIEW v_successor_identification_dashboard AS
SELECT
    cr.*, d.name AS role_title, e.first_name AS incumbent_first_name, e.last_name AS incumbent_last_name,
    (SELECT jsonb_agg(jsonb_build_object('employee_id', sc.candidate_employee_id, 'readiness_tier', sc.readiness_tier, 'skill_match_pct', sc.skill_match_pct))
       FROM successor_candidates sc WHERE sc.critical_role_id = cr.id) AS candidates,
    (SELECT COUNT(*) FROM successor_candidates sc WHERE sc.critical_role_id = cr.id) AS candidate_count
FROM critical_roles cr
JOIN designations d ON cr.designation_id = d.id
LEFT JOIN employees e ON cr.incumbent_employee_id = e.id;

-- Critical roles with ZERO coverage -- the brief's explicit risk signal
CREATE OR REPLACE VIEW v_critical_roles_no_coverage AS
SELECT cr.*, d.name AS role_title
FROM critical_roles cr
JOIN designations d ON cr.designation_id = d.id
WHERE NOT EXISTS (SELECT 1 FROM successor_candidates sc WHERE sc.critical_role_id = cr.id);

-- Page 3: HiPo dashboard, reading the EXISTING leadership_pipeline directly
CREATE OR REPLACE VIEW v_hipo_dashboard AS
SELECT lp.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name
FROM leadership_pipeline lp
JOIN employees e ON lp.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
WHERE lp.is_hipo = TRUE;

-- Page 4: readiness assessment dashboard with calibration-tier rollup
CREATE OR REPLACE VIEW v_readiness_assessment_dashboard AS
SELECT
    sc.*, e.first_name, e.last_name, cr.designation_id, d.name AS target_role_title,
    (SELECT jsonb_agg(jsonb_build_object('competency', rc.competency_name, 'current', rc.current_level, 'required', rc.required_level, 'fully_calibrated', rc.fully_calibrated))
       FROM readiness_calibrations rc WHERE rc.successor_candidate_id = sc.id) AS competency_calibrations,
    (SELECT COUNT(*) FROM readiness_calibrations rc WHERE rc.successor_candidate_id = sc.id AND NOT rc.fully_calibrated) AS incomplete_calibration_count
FROM successor_candidates sc
JOIN employees e ON sc.candidate_employee_id = e.id
JOIN critical_roles cr ON sc.critical_role_id = cr.id
JOIN designations d ON cr.designation_id = d.id;

-- Page 5: Leadership Pipeline -- bench-strength funnel + IDP detail,
-- joined onto the EXISTING v_leadership_pipeline_dashboard
CREATE OR REPLACE VIEW v_leadership_pipeline_full AS
SELECT vlpd.*, isa.stretch_assignment_description, isa.rotation_description, isa.idp_progress_pct,
    (isa.rotation_description IS NULL OR isa.rotation_description = '') AS no_rotation_flag
FROM v_leadership_pipeline_dashboard vlpd
LEFT JOIN idp_stretch_assignments isa ON isa.leadership_pipeline_id = vlpd.id;

-- Department bench coverage (critical roles vs. roles with >=1 candidate)
CREATE OR REPLACE VIEW v_department_bench_coverage AS
SELECT
    d.name AS department_name,
    COUNT(DISTINCT cr.id) AS critical_roles_count,
    COUNT(DISTINCT cr.id) FILTER (WHERE EXISTS (SELECT 1 FROM successor_candidates sc WHERE sc.critical_role_id = cr.id)) AS covered_count,
    cr.company_id
FROM critical_roles cr
JOIN designations des ON cr.designation_id = des.id
JOIN employees e ON cr.incumbent_employee_id = e.id
JOIN departments d ON e.department_id = d.id
GROUP BY d.name, cr.company_id;
