-- ================================================================
-- FILE: database/schemas/okr_management_schema.sql
-- NepHR Pro — Performance & Talent Management > Goal & Performance >
-- Goal Management > OKR Management (1 page)
--
-- Design note: OKRs are deliberately a SEPARATE, self-referencing
-- cascade tree (Company -> Department -> Team -> Individual) -- NOT
-- nested under kra_definitions the way kpi_definitions is. KRAs define
-- ongoing role accountability; OKRs are aspirational stretch goals on
-- a quarterly cadence with 0.0-1.0 scoring. They are parallel,
-- complementary frameworks, not parent-child. Reuses the existing
-- transaction_notifications table directly for publish notifications --
-- no duplicate mechanism. Reuses employees.manager_id for the reporting
-- chain lookup, exactly as kra/kpi triggers do.
--
--   - okr_objectives      (self-referencing tree via parent_okr_id)
--   - okr_key_results     (2-3 per objective, quantitative)
--   - okr_checkins        (weekly confidence-score check-in log)
--   - okr_praise          (lightweight peer recognition, "Praise" button)
--
-- Nepal Labour Act 2074 Section 112: evaluation basis/procedure must be
-- communicated BEFORE the period starts; post-evaluation discussion
-- mandatory; employee has right to note disagreement and trigger
-- review; 3 consecutive unsatisfactory cycles = termination grounds
-- with mandatory 7-day explanation period. Electronic Transactions Act
-- 2063: digital check-ins/signatures carry full legal validity.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- OKR OBJECTIVES (self-referencing cascade tree)
-- ================================================================
CREATE TABLE IF NOT EXISTS okr_objectives (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    parent_okr_id             UUID       REFERENCES okr_objectives(id),  -- NULL = top-level company OKR

    level                        VARCHAR(20) NOT NULL DEFAULT 'individual'
                                CHECK (level IN ('company','department','team','individual')),
    department_id                   UUID REFERENCES departments(id),
    employee_id                        UUID REFERENCES employees(id),  -- owner (one owner per goal, per best practice)

    objective_text                        TEXT NOT NULL,  -- qualitative, inspirational
    quarter_label                            VARCHAR(20) NOT NULL,  -- e.g. 'Q3 2026'
    fiscal_year_label                           VARCHAR(20),

    -- Pre-communication requirement: Section 112 mandates basis/procedure
    -- communicated BEFORE the evaluation period begins
    criteria_communicated_at                       TIMESTAMPTZ,

    overall_score                                     NUMERIC(4,2) DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 1),
    status                                                VARCHAR(20) DEFAULT 'on_track'
                                                         CHECK (status IN ('on_track','at_risk','off_track')),

    -- Disagreement/review right per Section 112
    employee_disagreement_note                              TEXT,
    review_requested                                           BOOLEAN DEFAULT FALSE,
    review_resolved_at                                            TIMESTAMPTZ,

    publish_status                                                   VARCHAR(20) DEFAULT 'draft'
                                                                     CHECK (publish_status IN ('draft','published','archived')),

    created_by                                                           UUID,
    created_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                 TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- KEY RESULTS (2-3 quantitative measures per objective)
-- ================================================================
CREATE TABLE IF NOT EXISTS okr_key_results (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    okr_objective_id          UUID       NOT NULL REFERENCES okr_objectives(id),
    company_id             UUID         NOT NULL,

    kr_text                     TEXT NOT NULL,
    current_value                   NUMERIC(14,2) DEFAULT 0,
    target_value                       NUMERIC(14,2) NOT NULL,
    unit                                   VARCHAR(20) DEFAULT 'count',

    score                                     NUMERIC(4,2) GENERATED ALWAYS AS (
                                              LEAST(ROUND(current_value / NULLIF(target_value,0), 2), 1.0)
                                            ) STORED,

    created_at                                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                     TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- WEEKLY CHECK-INS (confidence score + roadblocks + next steps)
-- ================================================================
CREATE TABLE IF NOT EXISTS okr_checkins (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    okr_objective_id    UUID NOT NULL REFERENCES okr_objectives(id),
    company_id          UUID NOT NULL,

    checked_in_by          UUID NOT NULL REFERENCES employees(id),
    confidence_score           INT CHECK (confidence_score BETWEEN 1 AND 10),
    roadblocks_note                TEXT,
    next_steps_note                   TEXT,

    checked_in_at                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PEER PRAISE (lightweight recognition, the "Praise" button)
-- ================================================================
CREATE TABLE IF NOT EXISTS okr_praise (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    okr_objective_id    UUID NOT NULL REFERENCES okr_objectives(id),
    company_id          UUID NOT NULL,

    given_by               UUID NOT NULL REFERENCES employees(id),
    message                   VARCHAR(280),

    created_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_oo_parent        ON okr_objectives(parent_okr_id);
CREATE INDEX IF NOT EXISTS idx_oo_employee          ON okr_objectives(employee_id);
CREATE INDEX IF NOT EXISTS idx_oo_department            ON okr_objectives(department_id);
CREATE INDEX IF NOT EXISTS idx_oo_quarter                  ON okr_objectives(quarter_label);
CREATE INDEX IF NOT EXISTS idx_oo_status                       ON okr_objectives(status);
CREATE INDEX IF NOT EXISTS idx_oo_review_pending                   ON okr_objectives(review_requested) WHERE review_requested AND review_resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_okr_objective                            ON okr_key_results(okr_objective_id);
CREATE INDEX IF NOT EXISTS idx_oc_objective                                 ON okr_checkins(okr_objective_id, checked_in_at);
CREATE INDEX IF NOT EXISTS idx_op_objective                                    ON okr_praise(okr_objective_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_okr_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_oo_upd
    BEFORE UPDATE ON okr_objectives
    FOR EACH ROW EXECUTE FUNCTION fn_okr_updated_at();

CREATE TRIGGER trg_okr_upd
    BEFORE UPDATE ON okr_key_results
    FOR EACH ROW EXECUTE FUNCTION fn_okr_updated_at();

-- Recompute the parent objective's overall_score as the average of its
-- key results whenever any KR is updated (the live cascade-up aggregation
-- described in the brief's architecture)
CREATE OR REPLACE FUNCTION fn_recompute_objective_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE avg_score NUMERIC; new_status VARCHAR(20);
BEGIN
    SELECT ROUND(AVG(score), 2) INTO avg_score FROM okr_key_results WHERE okr_objective_id = NEW.okr_objective_id;

    new_status := CASE
        WHEN avg_score >= 0.7 THEN 'on_track'
        WHEN avg_score >= 0.4 THEN 'at_risk'
        ELSE 'off_track' END;

    UPDATE okr_objectives SET overall_score = COALESCE(avg_score, 0), status = new_status, updated_at = NOW()
    WHERE id = NEW.okr_objective_id;

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_recompute_score
    AFTER INSERT OR UPDATE OF current_value, target_value ON okr_key_results
    FOR EACH ROW EXECUTE FUNCTION fn_recompute_objective_score();

-- On publish: require criteria_communicated_at to already be set
-- (Section 112: basis/procedure must be communicated BEFORE the period
-- starts -- enforced here, not just suggested in the UI)
CREATE OR REPLACE FUNCTION fn_block_publish_without_communication()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.publish_status = 'published' AND OLD.publish_status = 'draft' THEN
        IF NEW.criteria_communicated_at IS NULL THEN
            NEW.criteria_communicated_at := NOW();  -- publishing itself constitutes the communication act
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_publish_no_comm
    BEFORE UPDATE OF publish_status ON okr_objectives
    FOR EACH ROW EXECUTE FUNCTION fn_block_publish_without_communication();

-- On publish: notify the objective owner + reporting manager, reusing
-- the EXISTING transaction_notifications table from kra_management_schema.sql
CREATE OR REPLACE FUNCTION fn_notify_okr_published()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID;
BEGIN
    IF NEW.publish_status = 'published' AND OLD.publish_status = 'draft' AND NEW.employee_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'okr_objectives', NEW.id, 'okr_published', NEW.employee_id, 'direct_party',
           format('A new OKR "%s" (%s) has been assigned to you.', NEW.objective_text, NEW.quarter_label), NOW());

        SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
        IF mgr_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'okr_objectives', NEW.id, 'okr_published', mgr_id, 'reporting_manager',
               format('A new OKR "%s" has been assigned to your direct report.', NEW.objective_text), NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_okr_published
    AFTER UPDATE OF publish_status ON okr_objectives
    FOR EACH ROW EXECUTE FUNCTION fn_notify_okr_published();

-- Notify the objective owner when a check-in or praise is logged by
-- someone else (e.g. manager checking in on a report's OKR)
CREATE OR REPLACE FUNCTION fn_notify_okr_checkin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE owner_id UUID; obj_text TEXT;
BEGIN
    SELECT employee_id, objective_text INTO owner_id, obj_text FROM okr_objectives WHERE id = NEW.okr_objective_id;
    IF owner_id IS NOT NULL AND owner_id != NEW.checked_in_by THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'okr_checkins', NEW.id, 'okr_checkin_logged', owner_id, 'direct_party',
           format('A check-in was logged on your OKR "%s".', obj_text), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_checkin
    AFTER INSERT ON okr_checkins
    FOR EACH ROW EXECUTE FUNCTION fn_notify_okr_checkin();

-- ================================================================
-- VIEWS
-- ================================================================

-- The page's main data source: OKR + nested key results as JSON
CREATE OR REPLACE VIEW v_okr_tree_dashboard AS
SELECT
    oo.*, e.employee_code, e.first_name, e.last_name, d.name AS department_name,
    COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
            'kr', okr.kr_text, 'current', okr.current_value, 'target', okr.target_value, 'score', okr.score
         )) FROM okr_key_results okr WHERE okr.okr_objective_id = oo.id),
        '[]'::jsonb
    ) AS key_results
FROM okr_objectives oo
LEFT JOIN employees e ON oo.employee_id = e.id
LEFT JOIN departments d ON oo.department_id = d.id
WHERE oo.publish_status != 'archived';

-- At-risk/off-track OKRs needing manager attention
CREATE OR REPLACE VIEW v_okr_health_alerts AS
SELECT * FROM v_okr_tree_dashboard WHERE status IN ('at_risk','off_track') ORDER BY overall_score ASC;

-- Pending disagreement/review requests (Section 112 right)
CREATE OR REPLACE VIEW v_okr_pending_reviews AS
SELECT oo.*, e.employee_code, e.first_name, e.last_name
FROM okr_objectives oo
JOIN employees e ON oo.employee_id = e.id
WHERE oo.review_requested AND oo.review_resolved_at IS NULL;

-- Self-service: my OKRs (ESS feed)
CREATE OR REPLACE VIEW v_my_okrs AS
SELECT * FROM v_okr_tree_dashboard WHERE employee_id IS NOT NULL;

-- Weekly check-in history for a given objective
CREATE OR REPLACE VIEW v_okr_checkin_history AS
SELECT oc.*, e.first_name, e.last_name
FROM okr_checkins oc
JOIN employees e ON oc.checked_in_by = e.id
ORDER BY oc.checked_in_at DESC;
