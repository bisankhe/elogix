-- ================================================================
-- FILE: database/schemas/exit_management_schema.sql
-- NepHR Pro — Offboarding > Exit Management Module (5 pages)
--   1. employee_resignations        (Resignation Management)
--   2. exit_clearances + exit_clearance_departments (Exit Clearance)
--   3. exit_asset_returns + exit_asset_return_items   (Asset Return)
--   4. exit_interviews                                  (Exit Interview)
--   5. knowledge_transfer_plans + kt_checklist_items       (Knowledge Transfer)
--
-- Nepal Labour Act 2074: notice period by tenure (1/7/30 days), 15-day
-- silent-acceptance rule, deduction for notice shortfall, F&F settlement
-- includes leave encashment + SSF finalization, asset return as contractual
-- (not statutory) condition for settlement release.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. EMPLOYEE RESIGNATIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_resignations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    submitted_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    tenure_years_at_resignation     NUMERIC(5,2),
    reason_category                    VARCHAR(30) DEFAULT 'other'
                                       CHECK (reason_category IN ('better_opportunity','personal',
                                         'higher_studies','relocation','health','retirement','other')),
    resignation_letter_url                 VARCHAR(500),
    resignation_notes                         TEXT,

    -- Nepal LA2074: notice period scales by tenure
    required_notice_days                         INT GENERATED ALWAYS AS (
                                                    CASE WHEN tenure_years_at_resignation IS NULL THEN 30
                                                         WHEN tenure_years_at_resignation < (4.0/52) THEN 1
                                                         WHEN tenure_years_at_resignation < 1 THEN 7
                                                         ELSE 30 END
                                                  ) STORED,
    proposed_last_working_date                       DATE NOT NULL,
    actual_notice_days                                  INT GENERATED ALWAYS AS (
                                                          proposed_last_working_date - submitted_date
                                                        ) STORED,
    notice_shortfall_days                                  INT GENERATED ALWAYS AS (
                                                              GREATEST(0,
                                                                (CASE WHEN tenure_years_at_resignation IS NULL THEN 30
                                                                      WHEN tenure_years_at_resignation < (4.0/52) THEN 1
                                                                      WHEN tenure_years_at_resignation < 1 THEN 7
                                                                      ELSE 30 END)
                                                                - (proposed_last_working_date - submitted_date)
                                                              )
                                                            ) STORED,
    deduction_npr                                             NUMERIC(12,2) DEFAULT 0,

    -- Nepal LA2074: 15-day silent-acceptance rule
    employer_acceptance_deadline                                  DATE GENERATED ALWAYS AS (
                                                                    submitted_date + INTERVAL '15 days'
                                                                  ) STORED,
    employer_responded                                                BOOLEAN DEFAULT FALSE,
    response_date                                                        DATE,
    auto_accepted                                                           BOOLEAN DEFAULT FALSE,

    status                                                                     VARCHAR(30) DEFAULT 'pending_acceptance'
                                                                               CHECK (status IN ('pending_acceptance','accepted',
                                                                                 'auto_accepted_15day','withdrawn','rejected')),

    final_lwd                                                                     DATE,  -- confirmed after acceptance, may differ from proposed

    created_at                                                                       TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                        TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                         BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 2. EXIT CLEARANCE
-- ================================================================
CREATE TABLE IF NOT EXISTS exit_clearances (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    resignation_id              UUID    REFERENCES employee_resignations(id),

    last_working_date              DATE NOT NULL,

    -- Full & Final settlement — frozen until all departments clear
    ff_amount_npr                     NUMERIC(12,2),
    ff_frozen                            BOOLEAN DEFAULT TRUE,
    ff_released_date                        DATE,

    -- Nepal LA2074 mandatory F&F components
    unpaid_salary_npr                          NUMERIC(12,2) DEFAULT 0,
    leave_encashment_npr                          NUMERIC(12,2) DEFAULT 0,
    overtime_pay_npr                                 NUMERIC(12,2) DEFAULT 0,
    ssf_finalized                                       BOOLEAN DEFAULT FALSE,
    ssf_withdrawal_initiated                               BOOLEAN DEFAULT FALSE,

    status                                                    VARCHAR(20) DEFAULT 'in_progress'
                                                              CHECK (status IN ('in_progress','fully_cleared')),

    created_at                                                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                   TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                    BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS exit_clearance_departments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exit_clearance_id UUID NOT NULL REFERENCES exit_clearances(id),
    company_id      UUID NOT NULL,

    department      VARCHAR(20) NOT NULL CHECK (department IN ('it','finance','facilities','hr')),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','cleared','flagged')),
    cleared_by      UUID,
    cleared_date    TIMESTAMPTZ,
    notes           TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (exit_clearance_id, department)
);

-- ================================================================
-- 3. ASSET RETURN
-- ================================================================
CREATE TABLE IF NOT EXISTS exit_asset_returns (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    exit_clearance_id           UUID    REFERENCES exit_clearances(id),

    last_working_date              DATE NOT NULL,
    all_items_returned                BOOLEAN DEFAULT FALSE,
    deduction_for_damage_npr             NUMERIC(12,2) DEFAULT 0,

    created_at                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                  BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS exit_asset_return_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exit_asset_return_id UUID NOT NULL REFERENCES exit_asset_returns(id),
    company_id          UUID NOT NULL,
    original_asset_id   UUID REFERENCES employee_assets(id),  -- links back to original onboarding allocation

    item_type           VARCHAR(50) NOT NULL,
    model                VARCHAR(200),
    serial_number        VARCHAR(100),

    status               VARCHAR(20) DEFAULT 'pending'
                         CHECK (status IN ('pending','returned','damaged','lost')),
    condition_notes        VARCHAR(300),
    return_photo_url         VARCHAR(500),
    returned_date              DATE,

    -- 24-48hr data wipe window
    data_wiped                  BOOLEAN DEFAULT FALSE,
    data_wiped_date                DATE,
    data_wiped_by                     UUID,

    deduction_npr                      NUMERIC(12,2) DEFAULT 0,  -- for damaged/lost items

    created_at                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. EXIT INTERVIEW
-- ================================================================
CREATE TABLE IF NOT EXISTS exit_interviews (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    resignation_id              UUID    REFERENCES employee_resignations(id),

    interview_date                  DATE,
    conducted_by_employee_id           UUID,
    conducted_by_name                     VARCHAR(200),
    -- Best practice: enforced at app layer to never equal the employee's direct manager_id
    mode                                      VARCHAR(30) DEFAULT 'in_person'
                                              CHECK (mode IN ('in_person','video_call','ai_conversational_bot','async_survey')),

    -- Structured response scores (1-5 scale)
    overall_satisfaction                          INT CHECK (overall_satisfaction BETWEEN 1 AND 5),
    management_quality                               INT CHECK (management_quality BETWEEN 1 AND 5),
    growth_opportunities                                INT CHECK (growth_opportunities BETWEEN 1 AND 5),
    compensation_fairness                                  INT CHECK (compensation_fairness BETWEEN 1 AND 5),
    would_recommend                                           INT CHECK (would_recommend BETWEEN 1 AND 5),

    open_feedback_text                                            TEXT,

    -- AI sentiment analysis
    ai_sentiment                                                     VARCHAR(20)
                                                                     CHECK (ai_sentiment IN ('positive','mixed','negative')),
    ai_sentiment_score                                                  FLOAT,  -- 0-100
    ai_key_themes                                                          JSONB DEFAULT '[]',

    rehire_eligible                                                           BOOLEAN,
    rehire_notes                                                                 TEXT,

    -- Confidentiality (anonymized for aggregate leadership reporting)
    anonymized_for_reporting                                                       BOOLEAN DEFAULT TRUE,

    status                                                                            VARCHAR(20) DEFAULT 'scheduled'
                                                                                      CHECK (status IN ('scheduled','completed','declined','no_show')),

    created_at                                                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                           TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                            BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 5. KNOWLEDGE TRANSFER
-- ================================================================
CREATE TABLE IF NOT EXISTS knowledge_transfer_plans (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    resignation_id              UUID    REFERENCES employee_resignations(id),

    successor_employee_id          UUID,
    successor_name                    VARCHAR(200),  -- may be "TBD" if successor not yet hired
    manager_employee_id                  UUID,

    overlap_days_scheduled                  INT DEFAULT 0,
    last_working_date                          DATE,

    tasks_total                                   INT DEFAULT 0,
    tasks_reassigned                                 INT DEFAULT 0,
    sop_documents_count                                 INT DEFAULT 0,

    manager_signoff                                        BOOLEAN DEFAULT FALSE,
    manager_signoff_date                                      TIMESTAMPTZ,

    status                                                       VARCHAR(20) DEFAULT 'in_progress'
                                                                 CHECK (status IN ('in_progress','completed')),

    created_at                                                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                       TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                        BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS kt_checklist_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kt_plan_id          UUID NOT NULL REFERENCES knowledge_transfer_plans(id),
    company_id          UUID NOT NULL,

    item_description    VARCHAR(300) NOT NULL,
    document_uploaded   BOOLEAN DEFAULT FALSE,
    document_url        VARCHAR(500),
    task_reassigned     BOOLEAN DEFAULT FALSE,
    reassigned_to_employee_id UUID,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_resign_employee        ON employee_resignations(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_resign_status            ON employee_resignations(status);
CREATE INDEX IF NOT EXISTS idx_resign_deadline            ON employee_resignations(employer_acceptance_deadline) WHERE status = 'pending_acceptance';

CREATE INDEX IF NOT EXISTS idx_exclr_employee                ON exit_clearances(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_exclr_frozen                    ON exit_clearances(ff_frozen) WHERE ff_frozen;
CREATE INDEX IF NOT EXISTS idx_exclrd_clearance                  ON exit_clearance_departments(exit_clearance_id);
CREATE INDEX IF NOT EXISTS idx_exclrd_pending                      ON exit_clearance_departments(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_exar_employee                          ON exit_asset_returns(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_exari_return                              ON exit_asset_return_items(exit_asset_return_id);
CREATE INDEX IF NOT EXISTS idx_exari_pending                                ON exit_asset_return_items(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_exari_wipe_pending                              ON exit_asset_return_items(data_wiped) WHERE status = 'returned' AND NOT data_wiped;

CREATE INDEX IF NOT EXISTS idx_exint_employee                                    ON exit_interviews(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_exint_sentiment                                      ON exit_interviews(ai_sentiment);
CREATE INDEX IF NOT EXISTS idx_exint_status                                            ON exit_interviews(status);

CREATE INDEX IF NOT EXISTS idx_kt_employee                                                ON knowledge_transfer_plans(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_kt_signoff                                                    ON knowledge_transfer_plans(manager_signoff) WHERE NOT manager_signoff;
CREATE INDEX IF NOT EXISTS idx_ktci_plan                                                        ON kt_checklist_items(kt_plan_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_exit_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'employee_resignations','exit_clearances','exit_clearance_departments',
  'exit_asset_returns','exit_asset_return_items','exit_interviews',
  'knowledge_transfer_plans','kt_checklist_items'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_exit_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-calc deduction for notice shortfall (Nepal LA2074: deduct equivalent remuneration)
CREATE OR REPLACE FUNCTION fn_resignation_deduction_calc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE daily_rate NUMERIC;
BEGIN
    IF NEW.notice_shortfall_days > 0 THEN
        SELECT (basic_salary_npr / 30) INTO daily_rate FROM employees WHERE id = NEW.employee_id;
        NEW.deduction_npr := ROUND(COALESCE(daily_rate, 0) * NEW.notice_shortfall_days, 2);
    ELSE
        NEW.deduction_npr := 0;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_resignation_deduction
    BEFORE INSERT OR UPDATE OF proposed_last_working_date ON employee_resignations
    FOR EACH ROW EXECUTE FUNCTION fn_resignation_deduction_calc();

-- Auto-accept resignation if 15 days pass without employer response
CREATE OR REPLACE FUNCTION fn_resignation_auto_accept_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'pending_acceptance' AND NOT NEW.employer_responded
       AND CURRENT_DATE > NEW.employer_acceptance_deadline THEN
        NEW.status := 'auto_accepted_15day';
        NEW.auto_accepted := TRUE;
        NEW.final_lwd := NEW.proposed_last_working_date;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_resignation_auto_accept
    BEFORE UPDATE ON employee_resignations
    FOR EACH ROW EXECUTE FUNCTION fn_resignation_auto_accept_check();

-- On resignation creation, auto-create exit_clearances shell with 4 department rows
CREATE OR REPLACE FUNCTION fn_create_exit_clearance_shell()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE clearance_id UUID; dept TEXT;
BEGIN
    IF NEW.status IN ('accepted','auto_accepted_15day') AND
       (OLD IS NULL OR OLD.status != NEW.status) THEN
        INSERT INTO exit_clearances (company_id, employee_id, resignation_id, last_working_date, created_at)
        VALUES (NEW.company_id, NEW.employee_id, NEW.id, COALESCE(NEW.final_lwd, NEW.proposed_last_working_date), NOW())
        RETURNING id INTO clearance_id;

        FOREACH dept IN ARRAY ARRAY['it','finance','facilities','hr'] LOOP
            INSERT INTO exit_clearance_departments (exit_clearance_id, company_id, department, status)
            VALUES (clearance_id, NEW.company_id, dept, 'pending');
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_create_clearance_shell
    AFTER UPDATE OF status ON employee_resignations
    FOR EACH ROW EXECUTE FUNCTION fn_create_exit_clearance_shell();

-- Auto-unfreeze F&F when all 4 departments cleared
CREATE OR REPLACE FUNCTION fn_check_all_cleared()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE pending_count INT;
BEGIN
    SELECT COUNT(*) INTO pending_count
    FROM exit_clearance_departments
    WHERE exit_clearance_id = NEW.exit_clearance_id AND status != 'cleared';

    IF pending_count = 0 THEN
        UPDATE exit_clearances
           SET ff_frozen = FALSE, status = 'fully_cleared', ff_released_date = CURRENT_DATE
         WHERE id = NEW.exit_clearance_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_all_cleared
    AFTER UPDATE OF status ON exit_clearance_departments
    FOR EACH ROW EXECUTE FUNCTION fn_check_all_cleared();

-- Auto-update exit_asset_returns.all_items_returned
CREATE OR REPLACE FUNCTION fn_check_all_assets_returned()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE pending_count INT;
BEGIN
    SELECT COUNT(*) INTO pending_count
    FROM exit_asset_return_items
    WHERE exit_asset_return_id = NEW.exit_asset_return_id AND status = 'pending';

    UPDATE exit_asset_returns
       SET all_items_returned = (pending_count = 0)
     WHERE id = NEW.exit_asset_return_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_check_assets_returned
    AFTER UPDATE OF status ON exit_asset_return_items
    FOR EACH ROW EXECUTE FUNCTION fn_check_all_assets_returned();

-- Block IT clearance sign-off until all assets are returned
CREATE OR REPLACE FUNCTION fn_it_clearance_requires_assets()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE assets_pending BOOLEAN;
BEGIN
    IF NEW.department = 'it' AND NEW.status = 'cleared' THEN
        SELECT EXISTS (
            SELECT 1 FROM exit_asset_return_items i
            JOIN exit_asset_returns r ON i.exit_asset_return_id = r.id
            JOIN exit_clearances c ON r.exit_clearance_id = c.id
            WHERE c.id = NEW.exit_clearance_id AND i.status = 'pending'
        ) INTO assets_pending;

        IF assets_pending THEN
            RAISE EXCEPTION 'Cannot clear IT: assets still pending return.';
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_it_clearance_assets
    BEFORE UPDATE OF status ON exit_clearance_departments
    FOR EACH ROW EXECUTE FUNCTION fn_it_clearance_requires_assets();

-- ================================================================
-- VIEWS
-- ================================================================

-- Cross-departmental exit dashboard (Kanban swimlanes for admin)
CREATE OR REPLACE VIEW v_exit_clearance_kanban AS
SELECT
    e.employee_code, e.first_name, e.last_name, c.last_working_date, c.ff_frozen, c.ff_amount_npr,
    ecd.department, ecd.status AS dept_status, ecd.notes,
    c.company_id
FROM exit_clearances c
JOIN employees e ON c.employee_id = e.id
JOIN exit_clearance_departments ecd ON ecd.exit_clearance_id = c.id
WHERE NOT c.is_deleted
ORDER BY c.ff_frozen DESC, c.last_working_date ASC;

-- Resignation deadline alerts (15-day rule + notice shortfall)
CREATE OR REPLACE VIEW v_resignation_alerts AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    r.submitted_date, r.employer_acceptance_deadline,
    (r.employer_acceptance_deadline - CURRENT_DATE) AS days_to_auto_accept,
    r.notice_shortfall_days, r.deduction_npr, r.company_id
FROM employee_resignations r
JOIN employees e ON r.employee_id = e.id
WHERE r.status = 'pending_acceptance' AND NOT r.is_deleted
ORDER BY days_to_auto_accept ASC;

-- Exit interview aggregate sentiment trends (anonymized)
CREATE OR REPLACE VIEW v_exit_interview_trends AS
SELECT
    DATE_TRUNC('month', interview_date) AS month,
    COUNT(*) AS total_interviews,
    ROUND(AVG(ai_sentiment_score)::NUMERIC, 1) AS avg_sentiment_score,
    COUNT(*) FILTER (WHERE ai_sentiment = 'negative') AS negative_count,
    COUNT(*) FILTER (WHERE rehire_eligible) AS rehire_eligible_count,
    company_id
FROM exit_interviews
WHERE status = 'completed' AND NOT is_deleted
GROUP BY DATE_TRUNC('month', interview_date), company_id
ORDER BY month DESC;

-- Knowledge transfer completion dashboard
CREATE OR REPLACE VIEW v_kt_completion_status AS
SELECT
    e.employee_code, e.first_name, e.last_name,
    kt.successor_name, kt.overlap_days_scheduled, kt.last_working_date,
    kt.tasks_reassigned, kt.tasks_total,
    ROUND(kt.tasks_reassigned::NUMERIC / NULLIF(kt.tasks_total,0) * 100, 1) AS completion_pct,
    kt.manager_signoff, kt.company_id
FROM knowledge_transfer_plans kt
JOIN employees e ON kt.employee_id = e.id
WHERE NOT kt.is_deleted
ORDER BY kt.manager_signoff ASC, kt.last_working_date ASC;

-- Asset return + data wipe compliance
CREATE OR REPLACE VIEW v_asset_return_compliance AS
SELECT
    e.employee_code, e.first_name, e.last_name, r.last_working_date,
    i.item_type, i.serial_number, i.status, i.data_wiped,
    CASE WHEN i.status = 'returned' AND NOT i.data_wiped THEN 'WIPE_PENDING'
         WHEN i.status = 'pending' AND r.last_working_date <= CURRENT_DATE THEN 'OVERDUE'
         ELSE 'OK' END AS compliance_flag,
    r.company_id
FROM exit_asset_return_items i
JOIN exit_asset_returns r ON i.exit_asset_return_id = r.id
JOIN employees e ON r.employee_id = e.id
WHERE NOT r.is_deleted;
