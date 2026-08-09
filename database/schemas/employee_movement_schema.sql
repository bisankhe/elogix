-- ================================================================
-- FILE: database/schemas/employee_movement_schema.sql
-- NepHR Pro — Employee Records > Employee Movement Module (6 pages)
--
-- Design note: employee_employment_history (from employee_database_schema.sql)
-- already provides the lightweight append-only career log that powers
-- "Employee Timeline" (Page 6). This file adds the RICH, workflow-specific
-- tables for the 4 movement types — each links back to a history row
-- via history_event_id so the timeline can deep-link to full case detail.
--
--   1. employee_promotions      (Promotion & History)
--   2. employee_demotions       (Demotion & History — legally restricted)
--   3. confirmation_tracking    (Confirmation Management — org-wide dashboard)
--   4. employee_transfers       (Transfer & History)
--   5. disciplinary_records     (Disciplinary Records — restricted access)
--   6. (Employee Timeline reads from employee_employment_history + all of the above)
--
-- Nepal Labour Act 2074: promotions on merit/seniority, demotion requires
-- consent for salary changes, transfers cannot reduce salary/grade,
-- progressive discipline (warning -> deduction -> increment withhold -> dismissal),
-- 6-month probation auto-confirm rule.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. EMPLOYEE PROMOTIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_promotions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    history_event_id           UUID     REFERENCES employee_employment_history(id),

    from_title                   VARCHAR(200),
    to_title                        VARCHAR(200) NOT NULL,
    from_department_id                 UUID,
    to_department_id                      UUID,

    effective_date                          DATE NOT NULL,
    old_salary_npr                             NUMERIC(12,2),
    new_salary_npr                                NUMERIC(12,2) NOT NULL,
    salary_increase_pct                              NUMERIC(5,2) GENERATED ALWAYS AS (
                                                        CASE WHEN old_salary_npr > 0
                                                          THEN ROUND((new_salary_npr - old_salary_npr) / old_salary_npr * 100, 2)
                                                          ELSE NULL END
                                                      ) STORED,

    -- Objective competency scoring (Nepal LA2074: performance, capacity, qualification, seniority)
    competency_scores                                   JSONB DEFAULT '[]',
    -- [{"name":"Technical Leadership","score":5},...]

    rationale                                              TEXT NOT NULL,
    approved_by_employee_id                                   UUID,
    approved_by_name                                             VARCHAR(200),
    digital_signoff                                                 BOOLEAN DEFAULT FALSE,
    digital_signoff_date                                               TIMESTAMPTZ,

    -- AI bias mitigation
    ai_bias_check_status                                                  VARCHAR(20) DEFAULT 'pending'
                                                                          CHECK (ai_bias_check_status IN ('pending','passed','flagged')),
    ai_bias_check_notes                                                      TEXT,

    status                                                                    VARCHAR(20) DEFAULT 'pending_approval'
                                                                              CHECK (status IN ('pending_approval','completed','rejected')),

    created_at                                                                   TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                    TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                     UUID,
    is_deleted                                                                      BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 2. EMPLOYEE DEMOTIONS (legally restricted — strict gating)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_demotions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    history_event_id           UUID     REFERENCES employee_employment_history(id),

    from_title                   VARCHAR(200) NOT NULL,
    to_title                        VARCHAR(200) NOT NULL,
    from_department_id                 UUID,
    to_department_id                      UUID,

    effective_date                          DATE NOT NULL,
    old_salary_npr                             NUMERIC(12,2),
    new_salary_npr                                NUMERIC(12,2),
    salary_changed                                   BOOLEAN GENERATED ALWAYS AS (
                                                       old_salary_npr IS DISTINCT FROM new_salary_npr
                                                     ) STORED,

    -- Nepal LA2074: demotion only valid on these grounds
    legal_basis                                          VARCHAR(30) NOT NULL
                                                         CHECK (legal_basis IN ('restructuring','disciplinary_alternative','voluntary')),

    -- Mandatory consent gate when salary changes
    employee_consent                                        BOOLEAN DEFAULT FALSE,
    consent_document_url                                       VARCHAR(500),
    consent_date                                                  TIMESTAMPTZ,

    -- Links prior disciplinary/PIP history justifying this action
    related_disciplinary_record_ids                                 UUID[],
    pip_history                                                        JSONB DEFAULT '[]',

    rationale                                                             TEXT NOT NULL,
    approved_by_employee_id                                                  UUID,
    approved_by_name                                                            VARCHAR(200),

    -- Mandatory HR legal review before finalization
    hr_legal_review_complete                                                       BOOLEAN DEFAULT FALSE,
    hr_legal_reviewer_id                                                              UUID,
    hr_legal_review_date                                                                TIMESTAMPTZ,
    hr_legal_review_notes                                                                  TEXT,

    status                                                                                  VARCHAR(20) DEFAULT 'pending_legal_review'
                                                                                            CHECK (status IN ('pending_legal_review','completed','rejected')),

    created_at                                                                                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                 TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                                  UUID,
    is_deleted                                                                                   BOOLEAN DEFAULT FALSE,

    -- THE CORE LEGAL GUARD: cannot reduce salary without consent
    CONSTRAINT ck_demotion_salary_consent CHECK (
        NOT salary_changed OR employee_consent = TRUE
    )
);

-- ================================================================
-- 3. CONFIRMATION TRACKING (org-wide "Pending Confirmations" dashboard)
-- Distinct from probation_management_schema.sql's per-employee 90-day
-- decision flow — this is the AGGREGATE command-center view + checklist.
-- ================================================================
CREATE TABLE IF NOT EXISTS confirmation_tracking (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    probation_record_id        UUID      REFERENCES probation_records(id),  -- links to probation module if exists

    join_date                    DATE NOT NULL,
    probation_end_date              DATE NOT NULL,
    days_remaining                     INT GENERATED ALWAYS AS (probation_end_date - CURRENT_DATE) STORED,

    -- Confirmation checklist (matches frontend exactly)
    performance_feedback_collected         BOOLEAN DEFAULT FALSE,
    goals_achieved                            BOOLEAN DEFAULT FALSE,
    manager_recommendation_received              BOOLEAN DEFAULT FALSE,
    confirmation_letter_issued                      BOOLEAN DEFAULT FALSE,

    checklist_completion_pct                           INT GENERATED ALWAYS AS (
                                                          (performance_feedback_collected::INT + goals_achieved::INT +
                                                           manager_recommendation_received::INT + confirmation_letter_issued::INT) * 25
                                                        ) STORED,

    risk_level                                              VARCHAR(20) GENERATED ALWAYS AS (
                                                              CASE WHEN (probation_end_date - CURRENT_DATE) <= 30 THEN 'urgent'
                                                                   WHEN (probation_end_date - CURRENT_DATE) <= 90 THEN 'medium'
                                                                   ELSE 'low' END
                                                            ) STORED,

    manager_employee_id                                          UUID,
    manager_name                                                    VARCHAR(200),

    final_decision                                                    VARCHAR(20)
                                                                       CHECK (final_decision IN ('confirmed','extended','terminated')),
    final_decision_date                                                  DATE,

    created_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                               TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 4. EMPLOYEE TRANSFERS
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_transfers (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),
    history_event_id           UUID     REFERENCES employee_employment_history(id),

    from_department_id           UUID,
    to_department_id                UUID NOT NULL,
    from_branch_id                     UUID,
    to_branch_id                          UUID NOT NULL,
    from_manager_id                          UUID,
    to_manager_id                                UUID,
    from_manager_name                               VARCHAR(200),
    to_manager_name                                    VARCHAR(200),

    effective_date                                        DATE NOT NULL,
    reason                                                    VARCHAR(40) NOT NULL
                                                              CHECK (reason IN ('lateral_skill_alignment','restructuring',
                                                                'geographic_request','business_need')),

    -- LA2074: cannot move to inferior position or reduce salary
    old_salary_npr                                                NUMERIC(12,2),
    new_salary_npr                                                   NUMERIC(12,2),
    salary_unchanged                                                    BOOLEAN GENERATED ALWAYS AS (
                                                                          old_salary_npr IS NULL OR old_salary_npr <= new_salary_npr
                                                                        ) STORED,
    old_grade_level_id                                                       UUID,
    new_grade_level_id                                                          UUID,
    position_level_unchanged                                                       BOOLEAN DEFAULT TRUE,

    relocation_allowance_npr                                                          NUMERIC(12,2) DEFAULT 0,
    is_inter_branch                                                                       BOOLEAN GENERATED ALWAYS AS (
                                                                                            from_branch_id IS DISTINCT FROM to_branch_id
                                                                                          ) STORED,

    employee_consent                                                                          BOOLEAN DEFAULT FALSE,
    rationale                                                                                     TEXT,

    -- Downstream auto-update tracking
    tax_jurisdiction_updated                                                                          BOOLEAN DEFAULT FALSE,
    payroll_updated                                                                                       BOOLEAN DEFAULT FALSE,
    org_chart_updated                                                                                        BOOLEAN DEFAULT FALSE,

    status                                                                                                      VARCHAR(20) DEFAULT 'pending'
                                                                                                                CHECK (status IN ('pending','completed','rejected')),

    created_at                                                                                                     TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                                                      TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                                                       UUID,
    is_deleted                                                                                                        BOOLEAN DEFAULT FALSE,

    -- THE CORE LEGAL GUARD: transfer cannot reduce salary (inferior position rule)
    CONSTRAINT ck_transfer_no_salary_reduction CHECK (salary_unchanged = TRUE)
);

-- ================================================================
-- 5. DISCIPLINARY RECORDS (restricted access)
-- ================================================================
CREATE TABLE IF NOT EXISTS disciplinary_records (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id              UUID       NOT NULL REFERENCES employees(id),

    infraction_description      TEXT NOT NULL,
    incident_date                  DATE NOT NULL,
    issued_date                       DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Nepal LA2074 progressive discipline ladder
    action_type                         VARCHAR(30) NOT NULL
                                        CHECK (action_type IN ('warning','salary_deduction','increment_withhold','dismissal')),
    salary_deduction_days                  INT,  -- for salary_deduction type
    increment_withhold_until_date             DATE,  -- for increment_withhold type (typically +1 year)

    investigated_by_employee_id                  UUID,
    investigated_by_name                            VARCHAR(200),
    investigation_documents_urls                       JSONB DEFAULT '[]',

    -- Due process: show-cause notice + employee response
    show_cause_notice_issued                              BOOLEAN DEFAULT FALSE,
    show_cause_notice_date                                   DATE,
    employee_statement                                          TEXT,
    employee_signed                                                BOOLEAN DEFAULT FALSE,
    employee_signed_date                                              TIMESTAMPTZ,
    employee_signature_refused                                           BOOLEAN DEFAULT FALSE,

    -- Strict RBAC (separate from main career timeline visibility)
    confidentiality_level                                                   VARCHAR(20) DEFAULT 'hr_manager_only'
                                                                            CHECK (confidentiality_level IN ('hr_manager_only','executive_only')),

    status                                                                      VARCHAR(20) DEFAULT 'under_review'
                                                                                CHECK (status IN ('under_review','closed','appealed')),

    -- Links to downstream actions this may justify
    triggered_demotion_id                                                          UUID REFERENCES employee_demotions(id),

    created_at                                                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                           TIMESTAMPTZ DEFAULT NOW(),
    created_by                                                                            UUID,
    is_deleted                                                                             BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- DISCIPLINARY ACCESS LOG (every view of a restricted record is logged)
-- ================================================================
CREATE TABLE IF NOT EXISTS disciplinary_access_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disciplinary_record_id UUID NOT NULL REFERENCES disciplinary_records(id),
    company_id      UUID NOT NULL,
    accessed_by     UUID NOT NULL,
    accessed_by_name VARCHAR(200),
    access_granted  BOOLEAN DEFAULT TRUE,
    accessed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_promo_employee        ON employee_promotions(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_promo_status            ON employee_promotions(status);
CREATE INDEX IF NOT EXISTS idx_promo_bias               ON employee_promotions(ai_bias_check_status) WHERE ai_bias_check_status = 'flagged';

CREATE INDEX IF NOT EXISTS idx_demo_employee                ON employee_demotions(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_demo_legal_review               ON employee_demotions(hr_legal_review_complete) WHERE NOT hr_legal_review_complete;
CREATE INDEX IF NOT EXISTS idx_demo_status                       ON employee_demotions(status);

CREATE INDEX IF NOT EXISTS idx_conf_employee                        ON confirmation_tracking(employee_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_conf_risk                              ON confirmation_tracking(risk_level) WHERE final_decision IS NULL;
CREATE INDEX IF NOT EXISTS idx_conf_days_remaining                      ON confirmation_tracking(days_remaining) WHERE final_decision IS NULL;

CREATE INDEX IF NOT EXISTS idx_trans_employee                              ON employee_transfers(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_trans_status                                  ON employee_transfers(status);
CREATE INDEX IF NOT EXISTS idx_trans_inter_branch                              ON employee_transfers(is_inter_branch);

CREATE INDEX IF NOT EXISTS idx_disc_employee                                      ON disciplinary_records(employee_id)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_disc_confidentiality                                 ON disciplinary_records(confidentiality_level);
CREATE INDEX IF NOT EXISTS idx_disc_status                                            ON disciplinary_records(status);
CREATE INDEX IF NOT EXISTS idx_dal2_record                                              ON disciplinary_access_log(disciplinary_record_id);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_movement_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'employee_promotions','employee_demotions','confirmation_tracking',
  'employee_transfers','disciplinary_records'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_movement_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-write to employee_employment_history on promotion completion
CREATE OR REPLACE FUNCTION fn_log_promotion_to_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE new_history_id UUID;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO employee_employment_history
          (company_id, employee_id, event_date, event_type, title_at_event,
           department_id_at_event, salary_npr_at_event, note, recorded_by, created_at)
        VALUES (NEW.company_id, NEW.employee_id, NEW.effective_date, 'promotion', NEW.to_title,
                NEW.to_department_id, NEW.new_salary_npr, NEW.rationale, NEW.created_by, NOW())
        RETURNING id INTO new_history_id;
        NEW.history_event_id := new_history_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_promotion_history
    BEFORE UPDATE OF status ON employee_promotions
    FOR EACH ROW EXECUTE FUNCTION fn_log_promotion_to_history();

-- Auto-write to employee_employment_history on demotion completion (legal-review gated)
CREATE OR REPLACE FUNCTION fn_log_demotion_to_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE new_history_id UUID;
BEGIN
    IF NEW.status = 'completed' AND NOT NEW.hr_legal_review_complete THEN
        RAISE EXCEPTION 'Cannot finalize demotion: mandatory HR legal review not yet complete.';
    END IF;
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO employee_employment_history
          (company_id, employee_id, event_date, event_type, title_at_event,
           department_id_at_event, salary_npr_at_event, note, recorded_by, created_at)
        VALUES (NEW.company_id, NEW.employee_id, NEW.effective_date, 'demotion', NEW.to_title,
                NEW.to_department_id, NEW.new_salary_npr, NEW.rationale, NEW.created_by, NOW())
        RETURNING id INTO new_history_id;
        NEW.history_event_id := new_history_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_demotion_history
    BEFORE UPDATE OF status ON employee_demotions
    FOR EACH ROW EXECUTE FUNCTION fn_log_demotion_to_history();

-- Auto-write to employee_employment_history on transfer completion
CREATE OR REPLACE FUNCTION fn_log_transfer_to_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE new_history_id UUID;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO employee_employment_history
          (company_id, employee_id, event_date, event_type, department_id_at_event,
           manager_id_at_event, manager_name_at_event, note, recorded_by, created_at)
        VALUES (NEW.company_id, NEW.employee_id, NEW.effective_date, 'transfer', NEW.to_department_id,
                NEW.to_manager_id, NEW.to_manager_name, NEW.rationale, NEW.created_by, NOW())
        RETURNING id INTO new_history_id;
        NEW.history_event_id := new_history_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_transfer_history
    BEFORE UPDATE OF status ON employee_transfers
    FOR EACH ROW EXECUTE FUNCTION fn_log_transfer_to_history();

-- Log every access to a disciplinary record (restricted-access audit)
CREATE OR REPLACE FUNCTION fn_disciplinary_access_log()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO disciplinary_access_log (disciplinary_record_id, company_id, accessed_by, accessed_by_name)
    VALUES (NEW.id, NEW.company_id, NEW.created_by, 'System');
    RETURN NEW;
END;$$;

-- (Applied at application layer on every SELECT in practice; this trigger covers creation event)
CREATE TRIGGER trg_disciplinary_created_log
    AFTER INSERT ON disciplinary_records
    FOR EACH ROW EXECUTE FUNCTION fn_disciplinary_access_log();

-- Auto-update confirmation_tracking.final_decision when probation_decisions resolves
CREATE OR REPLACE FUNCTION fn_sync_confirmation_tracking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE confirmation_tracking
       SET final_decision = NEW.decision, final_decision_date = NEW.decided_date,
           confirmation_letter_issued = (NEW.decision = 'confirmed')
     WHERE probation_record_id = NEW.probation_record_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_sync_confirmation
    AFTER INSERT ON probation_decisions
    FOR EACH ROW EXECUTE FUNCTION fn_sync_confirmation_tracking();

-- ================================================================
-- VIEWS
-- ================================================================

-- Unified Employee Timeline (the master view powering Page 6)
CREATE OR REPLACE VIEW v_employee_timeline AS
SELECT h.employee_id, h.event_date, h.event_type, h.title_at_event AS title,
       h.note, h.recorded_by, h.created_at,
       CASE WHEN h.event_type = 'demotion' THEN 'restricted' ELSE 'all' END AS visibility,
       h.company_id
FROM employee_employment_history h
UNION ALL
SELECT dr.employee_id, dr.incident_date, 'disciplinary', dr.action_type,
       'Restricted detail', dr.created_by, dr.created_at,
       'hr_only', dr.company_id
FROM disciplinary_records dr
ORDER BY event_date DESC;

-- Confirmation command center (urgent-first ordering)
CREATE OR REPLACE VIEW v_confirmation_dashboard AS
SELECT
    e.employee_code, e.first_name, e.last_name, ct.*
FROM confirmation_tracking ct
JOIN employees e ON ct.employee_id = e.id
WHERE ct.final_decision IS NULL AND NOT ct.is_deleted
ORDER BY ct.risk_level = 'urgent' DESC, ct.days_remaining ASC;

-- Promotions pending AI bias review
CREATE OR REPLACE VIEW v_promotions_bias_review_queue AS
SELECT e.employee_code, e.first_name, e.last_name, p.from_title, p.to_title,
       p.ai_bias_check_status, p.ai_bias_check_notes, p.company_id
FROM employee_promotions p
JOIN employees e ON p.employee_id = e.id
WHERE p.ai_bias_check_status = 'flagged' AND NOT p.is_deleted;

-- Demotions pending legal review
CREATE OR REPLACE VIEW v_demotions_legal_queue AS
SELECT e.employee_code, e.first_name, e.last_name, d.from_title, d.to_title,
       d.legal_basis, d.salary_changed, d.employee_consent, d.company_id
FROM employee_demotions d
JOIN employees e ON d.employee_id = e.id
WHERE NOT d.hr_legal_review_complete AND NOT d.is_deleted;

-- Disciplinary records access audit
CREATE OR REPLACE VIEW v_disciplinary_access_audit AS
SELECT dr.id AS record_id, e.employee_code, dal.accessed_by_name, dal.accessed_at, dal.access_granted,
       dr.company_id
FROM disciplinary_access_log dal
JOIN disciplinary_records dr ON dal.disciplinary_record_id = dr.id
JOIN employees e ON dr.employee_id = e.id
ORDER BY dal.accessed_at DESC;
