-- ================================================================
-- FILE: database/schemas/employee_relations_schema.sql
-- NepHR Pro -- Employee Experience & Culture > Employee Relations
-- (5 pages: Grievance Management, Complaint Management, Conflict
-- Resolution, Disciplinary Management, Warning Letter)
--
-- Design note: deliberately distinct from EXISTING tables built in
-- prior sessions:
--   - performance_improvement_plans (Performance Evaluation session)
--     addresses PERFORMANCE gaps with the Section 112/142 7-day
--     explanation right. disciplinary_cases here addresses MISCONDUCT
--     under Section 61 with its OWN 7-day defense right -- a different
--     legal trigger, never merged into one table.
--   - termination_flags (Rewards & Recognition session) already has a
--     documented_warnings_count column with NO source feeding it.
--     fn_increment_termination_warning_count below closes that gap --
--     this is the FIRST module to actually populate that field.
--
--   - grievances             (Sections 113-115: statutory timeline engine)
--   - complaints + complaint_evidence (broader intake, RBAC-gated)
--   - conflict_cases + conflict_timeline_entries (immutable audit log)
--   - disciplinary_cases     (Section 61: investigation + 7-day defense)
--   - warning_letters        (auto-templated, e-signature, progressive)
--
-- Nepal Labour Act 2017 (2074): Sections 113-115 (grievance: 15-day
-- internal negotiation, 21-day Labour Office facilitation + 15-day
-- decision, 35-day Labour Court appeal); Section 61 (disciplinary
-- investigation committee, written notice, minimum 7-day right to
-- defend, proportional action); Section 142 (progressive warnings as
-- legal evidence for eventual termination).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: GRIEVANCE MANAGEMENT (Sections 113-115, statutory timeline)
-- ================================================================
CREATE TABLE IF NOT EXISTS grievances (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       REFERENCES employees(id),  -- NULL if anonymous
    is_anonymous                  BOOLEAN DEFAULT FALSE,

    category                          VARCHAR(100) NOT NULL,
    description                          TEXT NOT NULL,

    stage                                    VARCHAR(20) DEFAULT 'submitted'
                                             CHECK (stage IN ('submitted','negotiation','labour_office','labour_court','resolved')),
    assigned_to                                  UUID,  -- HR investigator

    -- Section 113: 15-day internal negotiation window
    negotiation_deadline                             DATE,
    -- Section 113: 21-day Labour Office facilitation + 15-day decision
    labour_office_deadline                               DATE,
    -- Section 113: 35-day Labour Court appeal window
    labour_court_deadline                                    DATE,

    resolution_note                                              TEXT,
    resolved_at                                                      TIMESTAMPTZ,

    submitted_at                                                        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 2: COMPLAINT MANAGEMENT (broader intake, RBAC-restricted)
-- ================================================================
CREATE TABLE IF NOT EXISTS complaints (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    case_no                   VARCHAR(30) UNIQUE NOT NULL,  -- e.g. CMP-2025-014
    complainant_employee_id      UUID    REFERENCES employees(id),  -- NULL if anonymous
    is_anonymous                     BOOLEAN DEFAULT FALSE,

    complaint_type                       VARCHAR(50) NOT NULL,  -- Harassment, Unfair Treatment, Policy Violation, etc.
    involved_parties                         TEXT,
    description                                  TEXT NOT NULL,

    priority                                        VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
    status                                              VARCHAR(20) DEFAULT 'intake'
                                                        CHECK (status IN ('intake','assigned','investigating','closed')),
    assigned_investigator_id                                UUID,

    sla_acknowledgment_deadline                                 TIMESTAMPTZ,  -- 48h default
    resolution_note                                                 TEXT,
    upheld                                                              BOOLEAN,  -- whether the complaint was substantiated

    created_at                                                              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_evidence (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id          UUID NOT NULL REFERENCES complaints(id),
    company_id          UUID NOT NULL,
    file_name              VARCHAR(300) NOT NULL,
    file_url                  VARCHAR(500) NOT NULL,
    uploaded_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 3: CONFLICT RESOLUTION (immutable timeline, secure mediation)
-- ================================================================
CREATE TABLE IF NOT EXISTS conflict_cases (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    parties_employee_ids       UUID[]   NOT NULL,
    issue_summary                  VARCHAR(300) NOT NULL,
    mediator_employee_id              UUID,

    stage                                 VARCHAR(30) DEFAULT 'submitted'
                                          CHECK (stage IN ('submitted','assigned','under_investigation','mediation','closed')),

    created_at                               TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable by application convention: rows are INSERT-only, never UPDATE/DELETE
CREATE TABLE IF NOT EXISTS conflict_timeline_entries (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conflict_case_id      UUID NOT NULL REFERENCES conflict_cases(id),
    company_id          UUID NOT NULL,
    stage_at_entry          VARCHAR(30) NOT NULL,
    note                        TEXT NOT NULL,
    logged_by                      UUID NOT NULL,
    logged_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 4: DISCIPLINARY MANAGEMENT (Section 61, distinct from PIPs)
-- ================================================================
CREATE TABLE IF NOT EXISTS disciplinary_cases (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    misconduct_description        TEXT NOT NULL,
    policy_violated                   VARCHAR(300) NOT NULL,

    status                                VARCHAR(20) DEFAULT 'notice_issued'
                                          CHECK (status IN ('notice_issued','investigating','action_decided','closed')),
    investigation_committee                  UUID[],  -- employee_ids forming the investigation committee/officer

    -- Section 61: minimum 7-day right to defend, BEFORE any action finalizes
    defense_deadline                             DATE,
    defense_submitted_at                             TIMESTAMPTZ,
    defense_note                                         TEXT,

    action_taken                                            VARCHAR(30),  -- verbal_warning, written_warning, final_warning, salary_withhold, demotion, termination
    resolution_note                                             TEXT,

    created_at                                                      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 5: WARNING LETTER (auto-templated, e-signature, progressive)
-- ================================================================
CREATE TABLE IF NOT EXISTS warning_letters (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),
    disciplinary_case_id          UUID    REFERENCES disciplinary_cases(id),  -- optional: linked source case

    warning_level                    VARCHAR(10) NOT NULL CHECK (warning_level IN ('verbal','written','final')),
    offense                              VARCHAR(300) NOT NULL,
    required_corrective_action               TEXT,

    issued_date                                  DATE NOT NULL DEFAULT CURRENT_DATE,
    issued_by                                        UUID NOT NULL,

    acknowledged                                         BOOLEAN DEFAULT FALSE,
    signature_data                                           TEXT,  -- e-signature capture (base64 or signature service reference)
    signed_at                                                    TIMESTAMPTZ,
    signature_refused                                                BOOLEAN DEFAULT FALSE,  -- logged as a timestamped attempt, never a dead end

    created_at                                                           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_griev_employee       ON grievances(employee_id);
CREATE INDEX IF NOT EXISTS idx_griev_stage               ON grievances(stage) WHERE stage != 'resolved';
CREATE INDEX IF NOT EXISTS idx_comp_status                   ON complaints(status) WHERE status != 'closed';
CREATE INDEX IF NOT EXISTS idx_comp_investigator                 ON complaints(assigned_investigator_id);
CREATE INDEX IF NOT EXISTS idx_ce_complaint                          ON complaint_evidence(complaint_id);
CREATE INDEX IF NOT EXISTS idx_cc_stage                                  ON conflict_cases(stage) WHERE stage != 'closed';
CREATE INDEX IF NOT EXISTS idx_cte_case                                      ON conflict_timeline_entries(conflict_case_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_dc_employee                                       ON disciplinary_cases(employee_id);
CREATE INDEX IF NOT EXISTS idx_dc_pending_defense                                    ON disciplinary_cases(defense_deadline) WHERE defense_submitted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wl_employee                                               ON warning_letters(employee_id);
CREATE INDEX IF NOT EXISTS idx_wl_unsigned                                                   ON warning_letters(acknowledged) WHERE NOT acknowledged;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-calculate the full statutory timeline on grievance submission
CREATE OR REPLACE FUNCTION fn_calculate_grievance_deadlines()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.negotiation_deadline := NEW.submitted_at::DATE + 15;
    NEW.labour_office_deadline := NEW.negotiation_deadline + 21 + 15;
    NEW.labour_court_deadline := NEW.labour_office_deadline + 35;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_grievance_deadlines
    BEFORE INSERT ON grievances
    FOR EACH ROW EXECUTE FUNCTION fn_calculate_grievance_deadlines();

-- Auto-escalate a grievance to Labour Office stage if the 15-day
-- negotiation window lapses without resolution
CREATE OR REPLACE FUNCTION fn_escalate_grievance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.stage = 'negotiation' AND NEW.negotiation_deadline < CURRENT_DATE AND NEW.resolved_at IS NULL THEN
        NEW.stage := 'labour_office';
        IF NEW.employee_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'grievances', NEW.id, 'grievance_escalated', NEW.employee_id, 'direct_party',
               'Your grievance has escalated to Labour Office review per Section 113.', NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_escalate_grievance
    BEFORE UPDATE ON grievances
    FOR EACH ROW EXECUTE FUNCTION fn_escalate_grievance();

-- Set the 48-hour SLA acknowledgment deadline on complaint intake
CREATE OR REPLACE FUNCTION fn_set_complaint_sla()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.sla_acknowledgment_deadline := NOW() + INTERVAL '48 hours';
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_complaint_sla
    BEFORE INSERT ON complaints
    FOR EACH ROW EXECUTE FUNCTION fn_set_complaint_sla();

-- Log every conflict_cases stage transition into the immutable
-- conflict_timeline_entries (insert-only audit trail)
CREATE OR REPLACE FUNCTION fn_log_conflict_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        INSERT INTO conflict_timeline_entries (conflict_case_id, company_id, stage_at_entry, note, logged_by, logged_at)
        VALUES (NEW.id, NEW.company_id, NEW.stage, format('Case moved to %s', NEW.stage), NEW.mediator_employee_id, NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_log_conflict_stage
    AFTER UPDATE OF stage ON conflict_cases
    FOR EACH ROW EXECUTE FUNCTION fn_log_conflict_stage_change();

-- Set the Section 61 minimum 7-day defense deadline on disciplinary
-- case creation, and BLOCK finalizing an action before it lapses
CREATE OR REPLACE FUNCTION fn_set_defense_deadline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.defense_deadline := CURRENT_DATE + 7;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_defense_deadline
    BEFORE INSERT ON disciplinary_cases
    FOR EACH ROW EXECUTE FUNCTION fn_set_defense_deadline();

CREATE OR REPLACE FUNCTION fn_block_premature_action()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'action_decided' AND NEW.defense_submitted_at IS NULL AND CURRENT_DATE < OLD.defense_deadline THEN
        RAISE EXCEPTION 'Cannot finalize action before the Section 61 7-day defense window closes (deadline: %).', OLD.defense_deadline;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_block_premature_action
    BEFORE UPDATE OF status ON disciplinary_cases
    FOR EACH ROW EXECUTE FUNCTION fn_block_premature_action();

-- THE GAP CLOSER: on every warning letter issuance, increment the
-- EXISTING termination_flags.documented_warnings_count -- this column
-- existed since the Rewards & Recognition session with no source
-- feeding it until now
CREATE OR REPLACE FUNCTION fn_increment_termination_warning_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO termination_flags (company_id, employee_id, documented_warnings_count)
    VALUES (NEW.company_id, NEW.employee_id, 1)
    ON CONFLICT (employee_id) DO UPDATE
      SET documented_warnings_count = termination_flags.documented_warnings_count + 1;

    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    VALUES
      (NEW.company_id, 'warning_letters', NEW.id, 'warning_letter_issued', NEW.employee_id, 'direct_party',
       format('A %s warning letter has been issued -- please review and sign.', NEW.warning_level), NOW());

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_increment_warning_count
    AFTER INSERT ON warning_letters
    FOR EACH ROW EXECUTE FUNCTION fn_increment_termination_warning_count();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: grievance dashboard with computed days-remaining per stage
CREATE OR REPLACE VIEW v_grievance_dashboard AS
SELECT g.*, e.first_name, e.last_name,
    CASE g.stage
        WHEN 'negotiation' THEN g.negotiation_deadline - CURRENT_DATE
        WHEN 'labour_office' THEN g.labour_office_deadline - CURRENT_DATE
        WHEN 'labour_court' THEN g.labour_court_deadline - CURRENT_DATE
        ELSE NULL
    END AS days_remaining
FROM grievances g
LEFT JOIN employees e ON g.employee_id = e.id;

-- Page 2: complaint dashboard with SLA countdown
CREATE OR REPLACE VIEW v_complaint_dashboard AS
SELECT c.*,
    EXTRACT(DAY FROM (c.sla_acknowledgment_deadline - NOW()))::INT AS sla_days_left,
    (SELECT COUNT(*) FROM complaint_evidence ce WHERE ce.complaint_id = c.id) > 0 AS has_evidence
FROM complaints c;

-- Page 3: conflict dashboard with full timeline as JSON
CREATE OR REPLACE VIEW v_conflict_dashboard AS
SELECT cc.*,
    (SELECT jsonb_agg(jsonb_build_object('stage', cte.stage_at_entry, 'note', cte.note, 'logged_at', cte.logged_at) ORDER BY cte.logged_at)
       FROM conflict_timeline_entries cte WHERE cte.conflict_case_id = cc.id) AS timeline
FROM conflict_cases cc;

-- Page 4: disciplinary dashboard with computed defense-window days-remaining
CREATE OR REPLACE VIEW v_disciplinary_dashboard AS
SELECT dc.*, e.first_name, e.last_name,
    CASE WHEN dc.defense_submitted_at IS NULL THEN dc.defense_deadline - CURRENT_DATE ELSE NULL END AS defense_days_remaining
FROM disciplinary_cases dc
JOIN employees e ON dc.employee_id = e.id;

-- Page 5: warning letter dashboard joined with the employee's prior count
CREATE OR REPLACE VIEW v_warning_letter_dashboard AS
SELECT wl.*, e.first_name, e.last_name,
    (SELECT COUNT(*) FROM warning_letters wl2 WHERE wl2.employee_id = wl.employee_id AND wl2.issued_date < wl.issued_date) AS prior_warnings,
    tf.legally_eligible AS nearing_termination_threshold
FROM warning_letters wl
JOIN employees e ON wl.employee_id = e.id
LEFT JOIN termination_flags tf ON tf.employee_id = wl.employee_id;
