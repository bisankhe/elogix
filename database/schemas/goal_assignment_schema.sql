-- ================================================================
-- FILE: database/schemas/goal_assignment_schema.sql
-- eLogix HRMS — Performance & Talent Management > Goal & Performance >
-- Goal Management > Goal Assignment (1 page)
--
-- Design note: this is the ORCHESTRATION layer sitting ABOVE the
-- existing kra_cascade_targets (kra_management_schema.sql), not a
-- replacement for it. department_annual_targets is the top-of-funnel
-- object management sets once per fiscal year; when published, it
-- AUTO-GENERATES rows in kra_cascade_targets (quarterly/monthly/weekly/
-- daily) by creating an underlying kra_definitions row and delegating
-- to that table's existing trigger machinery -- zero duplicate cascade
-- logic. JD-nature templates (Sales/Admin/Technical/HR/Corporate/
-- Manufacturing/Banking) are reference data driving which metric type
-- gets suggested per department, matching the brief's explicit list.
-- Reuses transaction_notifications + designations.jd_responsibilities.
--
--   - jd_nature_templates           (reference: 7 role-nature metric templates)
--   - department_annual_targets    (the once-a-year top-level object)
--   - department_team_splits        (how the annual target divides across teams)
--
-- Nepal Labour Act 2074 Section 7: equal value/opportunity in task
-- assignment regardless of gender/caste/religion/ethnicity; Section 13:
-- withholding increments/promotions permitted for failure to meet
-- documented performance criteria; mandatory formal appraisal for
-- employers with 10+ employees; 3+ below-standard periods = termination
-- grounds with written-explanation right.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- JD NATURE TEMPLATES (reference data: brief's explicit role-type list)
-- ================================================================
CREATE TABLE IF NOT EXISTS jd_nature_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nature_key      VARCHAR(30) NOT NULL UNIQUE
                    CHECK (nature_key IN ('sales','admin','technical','hr','corporate','manufacturing','banking')),
    display_label   VARCHAR(50) NOT NULL,
    metric_basis    VARCHAR(200) NOT NULL,  -- e.g. 'Revenue / Deals Closed'
    example_target  VARCHAR(300),
    icon            VARCHAR(10)
);

INSERT INTO jd_nature_templates (nature_key, display_label, metric_basis, example_target, icon) VALUES
    ('sales','Sales','Revenue / Deals Closed','Close NPR 2M in new business this quarter','💰'),
    ('admin','Admin','Process Turnaround Time','Process 95% of requests within 24 hours','📋'),
    ('technical','Technical','Delivery Velocity / Uptime','Ship 12 story points/sprint, 99.5% uptime','⚙'),
    ('hr','HR','Time-to-Fill / Engagement','Reduce time-to-fill to 21 days','👥'),
    ('corporate','Corporate','Strategic Initiative Completion','Launch 2 of 3 planned initiatives','🏢'),
    ('manufacturing','Manufacturing','Units Produced / Defect Rate','Produce 5,000 units, defect rate <1%','🏭'),
    ('banking','Banking','Portfolio Growth / NPA Ratio','Grow deposit portfolio by 8%','🏦')
ON CONFLICT (nature_key) DO NOTHING;

-- ================================================================
-- DEPARTMENT ANNUAL TARGETS (set once per fiscal year, at FY open)
-- ================================================================
CREATE TABLE IF NOT EXISTS department_annual_targets (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    department_id             UUID       NOT NULL REFERENCES departments(id),
    jd_nature_template_id         UUID    REFERENCES jd_nature_templates(id),

    fiscal_year_label                  VARCHAR(20) NOT NULL,  -- e.g. '2082/83 BS'
    fiscal_year_start_date                DATE NOT NULL,
    annual_target_description                TEXT NOT NULL,

    -- Generated KRA that backs the cascade (delegates to existing
    -- kra_cascade_targets machinery -- this is the integration point)
    linked_kra_definition_id                    UUID REFERENCES kra_definitions(id),

    -- Equal-opportunity compliance note (Section 7): assignment basis
    -- must be objective/JD-driven, not discretionary
    assignment_basis_note                          TEXT DEFAULT 'Assigned per documented job description and department JD nature.',

    cascade_quarterly_done                            BOOLEAN DEFAULT FALSE,
    cascade_monthly_done                                 BOOLEAN DEFAULT FALSE,
    cascade_weekly_done                                     BOOLEAN DEFAULT FALSE,
    cascade_daily_done                                         BOOLEAN DEFAULT FALSE,

    publish_status                                                VARCHAR(20) DEFAULT 'draft'
                                                                  CHECK (publish_status IN ('draft','published','archived')),

    set_by                                                            UUID,  -- the management-level user who set it
    created_at                                                           TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (department_id, fiscal_year_label)
);

-- ================================================================
-- TEAM SPLITS (brief: "divide in the team of the department or group")
-- ================================================================
CREATE TABLE IF NOT EXISTS department_team_splits (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_annual_target_id  UUID    NOT NULL REFERENCES department_annual_targets(id),
    company_id             UUID         NOT NULL,

    team_label                  VARCHAR(150) NOT NULL,  -- a named sub-team within the department
    team_lead_employee_id          UUID REFERENCES employees(id),
    share_pct                          NUMERIC(5,2) NOT NULL CHECK (share_pct > 0 AND share_pct <= 100),
    team_target_description               TEXT,

    created_at                               TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_dat_department       ON department_annual_targets(department_id, fiscal_year_label);
CREATE INDEX IF NOT EXISTS idx_dat_status               ON department_annual_targets(publish_status);
CREATE INDEX IF NOT EXISTS idx_dts_target                  ON department_team_splits(department_annual_target_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_goal_assignment_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_dat_upd
    BEFORE UPDATE ON department_annual_targets
    FOR EACH ROW EXECUTE FUNCTION fn_goal_assignment_updated_at();

-- Validate team splits sum to <= 100% before allowing publish
CREATE OR REPLACE FUNCTION fn_validate_team_split_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE total_pct NUMERIC;
BEGIN
    IF NEW.publish_status = 'published' AND OLD.publish_status = 'draft' THEN
        SELECT COALESCE(SUM(share_pct), 0) INTO total_pct
        FROM department_team_splits WHERE department_annual_target_id = NEW.id;

        IF total_pct > 100.01 THEN
            RAISE EXCEPTION 'Cannot publish: team splits total %% exceeds 100%%.', total_pct;
        END IF;
        IF total_pct = 0 THEN
            RAISE EXCEPTION 'Cannot publish: no team splits defined for this department target.';
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_validate_splits
    BEFORE UPDATE OF publish_status ON department_annual_targets
    FOR EACH ROW EXECUTE FUNCTION fn_validate_team_split_total();

-- On publish: create the backing KRA definition and DELEGATE the
-- quarterly cascade to the EXISTING kra_management_schema.sql machinery
-- (fn_auto_cascade_quarterly fires automatically via that table's own
-- trigger once we flip the linked KRA to 'published')
CREATE OR REPLACE FUNCTION fn_publish_and_delegate_cascade()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE new_kra_id UUID; dept_name TEXT;
BEGIN
    IF NEW.publish_status = 'published' AND OLD.publish_status = 'draft' THEN
        SELECT name INTO dept_name FROM departments WHERE id = NEW.department_id;

        INSERT INTO kra_definitions
          (company_id, department_id, kra_title, description, weightage_pct, cascade_level,
           fiscal_year_label, annual_target_description, created_by, created_at, status)
        VALUES
          (NEW.company_id, NEW.department_id, format('%s Annual Target — %s', dept_name, NEW.fiscal_year_label),
           NEW.annual_target_description, 100, 'department', NEW.fiscal_year_label, NEW.annual_target_description,
           NEW.set_by, NOW(), 'draft')
        RETURNING id INTO new_kra_id;

        NEW.linked_kra_definition_id := new_kra_id;

        -- Flipping the linked KRA to published triggers that table's own
        -- fn_auto_cascade_quarterly + fn_notify_kra_published automatically
        UPDATE kra_definitions SET status = 'published' WHERE id = new_kra_id;

        NEW.cascade_quarterly_done := TRUE;  -- delegated trigger handles quarterly; monthly/weekly/daily follow via divide-to-teams
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_publish_delegate
    BEFORE UPDATE OF publish_status ON department_annual_targets
    FOR EACH ROW EXECUTE FUNCTION fn_publish_and_delegate_cascade();

-- On publish: notify the Department Head + every team lead, reusing
-- the EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_goal_assignment_published()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE dept_head_id UUID; lead RECORD; dept_name TEXT;
BEGIN
    IF NEW.publish_status = 'published' AND OLD.publish_status = 'draft' THEN
        SELECT name, department_head_id INTO dept_name, dept_head_id FROM departments WHERE id = NEW.department_id;

        IF dept_head_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'department_annual_targets', NEW.id, 'goal_assignment_published', dept_head_id, 'direct_party',
               format('Annual target for %s (FY %s) has been published: %s', dept_name, NEW.fiscal_year_label, NEW.annual_target_description), NOW());
        END IF;

        FOR lead IN SELECT DISTINCT team_lead_employee_id AS id FROM department_team_splits
                    WHERE department_annual_target_id = NEW.id AND team_lead_employee_id IS NOT NULL LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'department_annual_targets', NEW.id, 'goal_assignment_published', lead.id, 'direct_party',
               format('Your team has been assigned a share of the %s annual target.', dept_name), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_goal_published
    AFTER UPDATE OF publish_status ON department_annual_targets
    FOR EACH ROW EXECUTE FUNCTION fn_notify_goal_assignment_published();

-- ================================================================
-- VIEWS
-- ================================================================

-- The page's main data source: annual target + team splits + delegated
-- cascade status (pulled live from kra_cascade_targets)
CREATE OR REPLACE VIEW v_goal_assignment_dashboard AS
SELECT
    dat.*, d.name AS department_name, jnt.display_label AS jd_nature, jnt.metric_basis, jnt.icon,
    (SELECT jsonb_agg(jsonb_build_object('team', dts.team_label, 'share_pct', dts.share_pct, 'target', dts.team_target_description))
       FROM department_team_splits dts WHERE dts.department_annual_target_id = dat.id) AS teams,
    EXISTS (SELECT 1 FROM kra_cascade_targets kct WHERE kct.kra_definition_id = dat.linked_kra_definition_id AND kct.period_type = 'quarterly') AS quarterly_cascade_exists,
    EXISTS (SELECT 1 FROM kra_cascade_targets kct WHERE kct.kra_definition_id = dat.linked_kra_definition_id AND kct.assigned_team_id IS NOT NULL) AS team_division_exists
FROM department_annual_targets dat
JOIN departments d ON dat.department_id = d.id
LEFT JOIN jd_nature_templates jnt ON dat.jd_nature_template_id = jnt.id
WHERE dat.publish_status != 'archived';

-- Departments with annual targets not yet set for the current fiscal year
-- (the brief's "department head has to get complete goal once a while
-- opening fiscal year" -- this surfaces who's missing one)
CREATE OR REPLACE VIEW v_departments_missing_annual_target AS
SELECT d.id AS department_id, d.name AS department_name, d.company_id
FROM departments d
WHERE NOT EXISTS (
    SELECT 1 FROM department_annual_targets dat
    WHERE dat.department_id = d.id AND dat.publish_status = 'published'
      AND dat.fiscal_year_label = (SELECT MAX(fiscal_year_label) FROM department_annual_targets)
);

-- Review cadence rollup, pulled from the delegated KRA's review schedule
CREATE OR REPLACE VIEW v_goal_assignment_review_status AS
SELECT
    dat.id AS department_annual_target_id, d.name AS department_name,
    krs.review_level, krs.review_frequency, krs.last_reviewed_at, krs.next_review_due_date
FROM department_annual_targets dat
JOIN departments d ON dat.department_id = d.id
JOIN kra_review_schedule krs ON krs.kra_definition_id = dat.linked_kra_definition_id;
