-- ================================================================
-- FILE: database/schemas/kra_management_schema.sql
-- eLogix HRMS — Performance & Talent Management > Goal & Performance >
-- Goal Management > KRA Management (1 page)
--
-- Design note: reuses designations.jd_responsibilities (JSONB, already
-- exists in position_management_schema.sql) as the source of truth for
-- JD matching -- no JD content is duplicated here, only cross-referenced.
-- This is also the FIRST module needing a general-purpose transaction
-- notification mechanism (brief: "after every transaction, notify
-- linked parties and their reporting chain") -- adds a lightweight,
-- reusable notifications table other modules can adopt going forward.
--
--   - kra_definitions          (the KRA itself, weightage, cascade level)
--   - kra_jd_links             (many-to-many: which JD responsibility
--                                lines this KRA covers)
--   - kra_cascade_targets      (annual -> quarterly -> monthly -> weekly
--                                -> daily breakdown, auto-divided)
--   - kra_review_schedule      (review cadence per organizational level)
--   - transaction_notifications (general-purpose: who's linked + their
--                                reporting chain gets notified)
--
-- Nepal Labour Act 2074 Section 112: annual performance evaluation
-- standard practice; Rule 63: evaluation records retained 3+ years;
-- Section 142: 3 consecutive unsatisfactory evaluations = grounds for
-- termination, with 7 days' explanation right; transparency and
-- discussion of evaluation results mandatory before finalization.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- KRA DEFINITIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS kra_definitions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    designation_id            UUID       REFERENCES designations(id),
    department_id                UUID    REFERENCES departments(id),
    employee_id                     UUID REFERENCES employees(id),  -- set if cascade_level = 'individual'

    kra_title                          VARCHAR(300) NOT NULL,
    description                           TEXT,
    weightage_pct                            NUMERIC(5,2) NOT NULL CHECK (weightage_pct BETWEEN 0 AND 100),

    cascade_level                               VARCHAR(20) DEFAULT 'individual'
                                                CHECK (cascade_level IN ('department','team','individual')),

    fiscal_year_label                              VARCHAR(20),  -- e.g. '2082/83 BS'
    annual_target_description                         TEXT,

    status                                                VARCHAR(20) DEFAULT 'draft'
                                                          CHECK (status IN ('draft','published','archived')),

    created_by                                              UUID,
    created_at                                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- KRA <-> JD LINKING (the core "KRA-JD matching" requirement)
-- Each row links a KRA to one specific responsibility line item from
-- designations.jd_responsibilities (referenced by array index/text,
-- since jd_responsibilities is a JSONB array, not a normalized table)
-- ================================================================
CREATE TABLE IF NOT EXISTS kra_jd_links (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kra_definition_id   UUID NOT NULL REFERENCES kra_definitions(id),
    company_id          UUID NOT NULL,

    jd_responsibility_text   TEXT NOT NULL,  -- the matched line, copied for audit stability
    jd_responsibility_index     INT,  -- position within designations.jd_responsibilities array

    created_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CASCADE TARGETS (annual -> quarterly -> monthly -> weekly -> daily)
-- ================================================================
CREATE TABLE IF NOT EXISTS kra_cascade_targets (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    kra_definition_id        UUID       NOT NULL REFERENCES kra_definitions(id),
    company_id             UUID         NOT NULL,

    period_type                VARCHAR(10) NOT NULL CHECK (period_type IN ('quarterly','monthly','weekly','daily')),
    period_label                  VARCHAR(20) NOT NULL,  -- e.g. 'Q1', '2025-07', 'Wk-28', '2025-07-15'
    period_start_date                DATE NOT NULL,
    period_end_date                     DATE NOT NULL,

    target_pct                             NUMERIC(5,2) NOT NULL,  -- e.g. 25.0 for each quarter (100/4)
    achieved_pct                              NUMERIC(5,2) DEFAULT 0,

    -- Team-level division (brief: "divide in the team of the department")
    assigned_team_id                             UUID REFERENCES departments(id),  -- sub-team treated as a dept-like unit
    assigned_employee_id                            UUID REFERENCES employees(id),
    team_share_pct                                     NUMERIC(5,2),  -- this team's % of the department total

    created_at                                            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (kra_definition_id, period_type, period_label, assigned_team_id, assigned_employee_id)
);

-- ================================================================
-- REVIEW SCHEDULE (brief's explicit cadence matrix)
-- ================================================================
CREATE TABLE IF NOT EXISTS kra_review_schedule (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kra_definition_id   UUID NOT NULL REFERENCES kra_definitions(id),
    company_id          UUID NOT NULL,

    review_level          VARCHAR(20) NOT NULL
                          CHECK (review_level IN ('management','hr','hod','supervisor','team_lead')),
    review_frequency         VARCHAR(20) NOT NULL CHECK (review_frequency IN ('quarterly','monthly','weekly','daily')),

    last_reviewed_at            TIMESTAMPTZ,
    last_reviewed_by               UUID,
    next_review_due_date              DATE,

    created_at                           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- GENERAL-PURPOSE TRANSACTION NOTIFICATIONS
-- Brief: "after every transaction, notify the linked parties and their
-- reporting chain." Built here as a reusable mechanism -- any module
-- can insert into this table going forward.
-- ================================================================
CREATE TABLE IF NOT EXISTS transaction_notifications (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    source_table               VARCHAR(100) NOT NULL,  -- e.g. 'kra_definitions'
    source_record_id              UUID NOT NULL,
    transaction_type                 VARCHAR(50) NOT NULL,  -- e.g. 'kra_published', 'kra_updated'

    recipient_employee_id               UUID NOT NULL REFERENCES employees(id),
    recipient_relationship                  VARCHAR(30) NOT NULL
                                            CHECK (recipient_relationship IN ('direct_party','reporting_manager','department_head','hr')),

    message                                    TEXT NOT NULL,
    is_read                                       BOOLEAN DEFAULT FALSE,
    read_at                                          TIMESTAMPTZ,

    created_at                                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_kd_designation       ON kra_definitions(designation_id);
CREATE INDEX IF NOT EXISTS idx_kd_department            ON kra_definitions(department_id);
CREATE INDEX IF NOT EXISTS idx_kd_employee                  ON kra_definitions(employee_id);
CREATE INDEX IF NOT EXISTS idx_kd_status                       ON kra_definitions(status);

CREATE INDEX IF NOT EXISTS idx_kjl_kra                              ON kra_jd_links(kra_definition_id);

CREATE INDEX IF NOT EXISTS idx_kct_kra                                  ON kra_cascade_targets(kra_definition_id, period_type);
CREATE INDEX IF NOT EXISTS idx_kct_employee                                ON kra_cascade_targets(assigned_employee_id);

CREATE INDEX IF NOT EXISTS idx_krs_kra                                        ON kra_review_schedule(kra_definition_id);
CREATE INDEX IF NOT EXISTS idx_krs_due                                            ON kra_review_schedule(next_review_due_date);

CREATE INDEX IF NOT EXISTS idx_tn_recipient                                          ON transaction_notifications(recipient_employee_id) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_tn_source                                                ON transaction_notifications(source_table, source_record_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_kra_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_kd_upd
    BEFORE UPDATE ON kra_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_kra_updated_at();

-- Auto-create quarterly cascade rows (25% each) when a department-level
-- KRA is published, per the brief's "divide equally in 4 quarters"
CREATE OR REPLACE FUNCTION fn_auto_cascade_quarterly()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE q INT; fy_start DATE;
BEGIN
    IF NEW.status = 'published' AND OLD.status = 'draft' THEN
        fy_start := DATE_TRUNC('year', CURRENT_DATE)::DATE;  -- simplified; real FY-start config lives in leave_year_config
        FOR q IN 1..4 LOOP
            INSERT INTO kra_cascade_targets
              (kra_definition_id, company_id, period_type, period_label, period_start_date, period_end_date, target_pct, created_at)
            VALUES
              (NEW.id, NEW.company_id, 'quarterly', 'Q' || q,
               fy_start + ((q-1) * INTERVAL '3 months'), fy_start + (q * INTERVAL '3 months') - INTERVAL '1 day',
               25.0, NOW())
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Auto-seed the review cadence matrix per the brief's explicit levels
        INSERT INTO kra_review_schedule (kra_definition_id, company_id, review_level, review_frequency, created_at)
        VALUES
          (NEW.id, NEW.company_id, 'management', 'quarterly', NOW()),
          (NEW.id, NEW.company_id, 'hr', 'monthly', NOW()),
          (NEW.id, NEW.company_id, 'hod', 'monthly', NOW()),
          (NEW.id, NEW.company_id, 'supervisor', 'weekly', NOW()),
          (NEW.id, NEW.company_id, 'team_lead', 'daily', NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_auto_cascade
    BEFORE UPDATE OF status ON kra_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_auto_cascade_quarterly();

-- On publish, notify the position holder + their reporting manager
-- (brief: "kosko lagi gareko ho, ko-ko involve party xa, reporting level
-- harulai notification jana paryo")
CREATE OR REPLACE FUNCTION fn_notify_kra_published()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_employee_id UUID; mgr_id UUID;
BEGIN
    IF NEW.status = 'published' AND OLD.status = 'draft' THEN
        target_employee_id := NEW.employee_id;

        IF target_employee_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'kra_definitions', NEW.id, 'kra_published', target_employee_id, 'direct_party',
               format('A new KRA "%s" (%.0f%% weightage) has been assigned to you.', NEW.kra_title, NEW.weightage_pct), NOW());

            SELECT manager_id INTO mgr_id FROM employees WHERE id = target_employee_id;
            IF mgr_id IS NOT NULL THEN
                INSERT INTO transaction_notifications
                  (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
                VALUES
                  (NEW.company_id, 'kra_definitions', NEW.id, 'kra_published', mgr_id, 'reporting_manager',
                   format('A new KRA "%s" has been assigned to your direct report.', NEW.kra_title), NOW());
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_kra_published
    AFTER UPDATE OF status ON kra_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_notify_kra_published();

-- ================================================================
-- VIEWS
-- ================================================================

-- The page's main data source: KRA + computed JD match %
CREATE OR REPLACE VIEW v_kra_jd_match_dashboard AS
SELECT
    kd.*, d.name AS designation_name,
    jsonb_array_length(des.jd_responsibilities) AS total_jd_items,
    (SELECT COUNT(*) FROM kra_jd_links kjl WHERE kjl.kra_definition_id = kd.id) AS matched_jd_items,
    ROUND(
        (SELECT COUNT(*) FROM kra_jd_links kjl WHERE kjl.kra_definition_id = kd.id)::NUMERIC
        / NULLIF(jsonb_array_length(des.jd_responsibilities), 0) * 100, 1
    ) AS jd_match_pct
FROM kra_definitions kd
LEFT JOIN designations des ON kd.designation_id = des.id
LEFT JOIN departments d ON kd.department_id = d.id
WHERE kd.status != 'archived';

-- Unmatched JD responsibilities (the gap-finder, per brief's matching requirement)
CREATE OR REPLACE VIEW v_jd_responsibilities_uncovered AS
SELECT
    des.id AS designation_id, des.name AS designation_name,
    jsonb_array_elements_text(des.jd_responsibilities) AS responsibility_text,
    des.company_id
FROM designations des
WHERE NOT EXISTS (
    SELECT 1 FROM kra_definitions kd
    JOIN kra_jd_links kjl ON kjl.kra_definition_id = kd.id
    WHERE kd.designation_id = des.id
      AND kjl.jd_responsibility_text = jsonb_array_elements_text(des.jd_responsibilities)
);

-- Cascade progress rollup
CREATE OR REPLACE VIEW v_kra_cascade_progress AS
SELECT
    kd.kra_title, kct.period_type, kct.period_label, kct.target_pct, kct.achieved_pct,
    (kct.achieved_pct >= kct.target_pct) AS on_track,
    kd.company_id
FROM kra_cascade_targets kct
JOIN kra_definitions kd ON kct.kra_definition_id = kd.id;

-- Review schedule due-soon feed (for automatic reminders)
CREATE OR REPLACE VIEW v_kra_reviews_due AS
SELECT
    kd.kra_title, krs.review_level, krs.review_frequency, krs.next_review_due_date,
    kd.company_id
FROM kra_review_schedule krs
JOIN kra_definitions kd ON krs.kra_definition_id = kd.id
WHERE krs.next_review_due_date <= CURRENT_DATE + INTERVAL '3 days';

-- My notifications (ESS feed)
CREATE OR REPLACE VIEW v_my_transaction_notifications AS
SELECT tn.* FROM transaction_notifications tn WHERE NOT tn.is_read ORDER BY tn.created_at DESC;
