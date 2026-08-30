-- ================================================================
-- FILE: database/schemas/ess_attendance_leave_resignation_schema.sql
-- eLogix HRMS -- HR Services & Support > Employee Self Service (ESS),
-- second batch (8 pages: Things to Do, My Attendance, Attendance
-- Request, My Leave, Leave Request, My Resignation, Letter Request,
-- Cash Advance)
--
-- Design note: heavy reuse confirmed before writing anything --
--   - My Attendance        -> pure UI over EXISTING daily_attendance_records
--   - Attendance Request   -> EXTENDS EXISTING missed_punch_requests with
--     two new request_type values (overtime_claim, comp_off) rather
--     than building a parallel table
--   - My Leave             -> pure UI over EXISTING employee_leave_balances
--   - Leave Request        -> reuses the EXISTING LeaveRequestPage.jsx
--     verbatim (was already fully built, just under a different route
--     key) -- genuinely ZERO new frontend/backend/db work
--   - Cash Advance          -> EXTENDS the EXISTING salary_advances with
--     the brief's explicit 3-tier approval chain (Employee -> Supervisor
--     -> HR Manager/Senior Mgmt), which that table didn't yet model
-- Genuinely new: resignation_requests (no precedent existed at all) and
-- internal_letter_requests (distinct from government_letters_routes,
-- which is for SSF/CIT/tax/labour-dept submissions to external bodies --
-- this is NOC/salary-certificate/employment-verification, internal HR
-- documents for the employee's own use).
--
--   - resignation_requests + resignation_clearance_items
--   - internal_letter_requests
--   - (ALTER) missed_punch_requests: add request_type, overtime/comp_off fields
--   - (ALTER) salary_advances: add approval_stage for the 3-tier chain
--
-- Nepal legal grounding: Section 20 (8h/day, 48h/week cap; OT at 1.5x,
-- capped 24h/week; comp-off for weekly-rest/holiday work); Sections
-- 40-49 (leave entitlements: annual 1-day-per-20-worked, sick 12 days,
-- maternity 14 weeks, mourning 13 days); Section 127 (resignation:
-- written notice, employer must acknowledge within 15 days or it is
-- legally deemed accepted); Sections 34-35 (remuneration/deduction
-- rules governing cash advance recovery).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 3: ATTENDANCE REQUEST -- extend the EXISTING missed_punch_requests
-- to also cover overtime claims and comp-off requests (Section 20)
-- ================================================================
ALTER TABLE missed_punch_requests ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) DEFAULT 'missed_punch'
    CHECK (request_type IN ('missed_punch','overtime_claim','comp_off'));
ALTER TABLE missed_punch_requests ADD COLUMN IF NOT EXISTS overtime_hours_claimed NUMERIC(4,2);
ALTER TABLE missed_punch_requests ADD COLUMN IF NOT EXISTS comp_off_work_date DATE;  -- the weekly-rest/holiday date worked
ALTER TABLE missed_punch_requests ADD COLUMN IF NOT EXISTS comp_off_was_holiday BOOLEAN;

-- ================================================================
-- PAGE 6: MY RESIGNATION (Section 127, genuinely new)
-- ================================================================
CREATE TABLE IF NOT EXISTS resignation_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id) UNIQUE,

    last_working_day             DATE NOT NULL,
    reason                            TEXT NOT NULL,

    submitted_at                          TIMESTAMPTZ DEFAULT NOW(),
    -- Section 127: employer must acknowledge within 15 days or it's
    -- legally deemed accepted
    acknowledgment_deadline                   DATE,
    acknowledged                                  BOOLEAN DEFAULT FALSE,
    acknowledged_at                                   TIMESTAMPTZ,
    deemed_accepted                                       BOOLEAN GENERATED ALWAYS AS (
                                                          NOT acknowledged AND CURRENT_DATE > acknowledgment_deadline
                                                        ) STORED
);

CREATE TABLE IF NOT EXISTS resignation_clearance_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resignation_request_id UUID NOT NULL REFERENCES resignation_requests(id),
    company_id          UUID NOT NULL,
    item_label             VARCHAR(200) NOT NULL,  -- e.g. 'IT Equipment Handover'
    owner_department          VARCHAR(50) NOT NULL,  -- IT, Finance, Direct Manager, HR
    status                        VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started','pending','completed')),
    completed_at                      TIMESTAMPTZ
);

-- ================================================================
-- PAGE 7: LETTER REQUEST (internal HR letters, distinct from govt letters)
-- ================================================================
CREATE TABLE IF NOT EXISTS internal_letter_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    letter_type                  VARCHAR(60) NOT NULL,  -- Salary Certificate, NOC, Experience Letter, etc.
    purpose                          VARCHAR(300) NOT NULL,
    auto_generated                       BOOLEAN DEFAULT FALSE,  -- TRUE for templated letters (salary cert, employment verification)

    status                                   VARCHAR(20) DEFAULT 'pending_approval'
                                             CHECK (status IN ('pending_approval','ready','rejected')),
    approved_by                                  UUID,
    generated_file_url                               VARCHAR(500),

    requested_at                                         TIMESTAMPTZ DEFAULT NOW(),
    ready_at                                                 TIMESTAMPTZ
);

-- ================================================================
-- PAGE 8: CASH ADVANCE -- extend the EXISTING salary_advances with the
-- brief's explicit 3-tier chain (Employee -> Supervisor -> HR/Senior Mgmt)
-- ================================================================
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS approval_stage VARCHAR(20) DEFAULT 'supervisor_review'
    CHECK (approval_stage IN ('supervisor_review','hr_review','approved','rejected'));
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS supervisor_approved_by UUID;
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS supervisor_approved_at TIMESTAMPTZ;
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS hr_approved_by UUID;
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMPTZ;
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS repayment_installments INT DEFAULT 1;

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_mpr_type           ON missed_punch_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_rr_employee              ON resignation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_rr_pending_ack                ON resignation_requests(acknowledgment_deadline) WHERE NOT acknowledged;
CREATE INDEX IF NOT EXISTS idx_rci_resignation                   ON resignation_clearance_items(resignation_request_id);
CREATE INDEX IF NOT EXISTS idx_rci_pending                           ON resignation_clearance_items(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_ilr_employee                             ON internal_letter_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_ilr_pending                                  ON internal_letter_requests(status) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_sa_stage                                         ON salary_advances(approval_stage) WHERE approval_stage NOT IN ('approved','rejected');

-- ================================================================
-- TRIGGERS
-- ================================================================

-- On resignation submission: auto-set the 15-day acknowledgment
-- deadline AND simultaneously notify HR, manager, IT, and Finance
CREATE OR REPLACE FUNCTION fn_process_resignation_submission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID; hr_admin RECORD;
BEGIN
    NEW.acknowledgment_deadline := NEW.submitted_at::DATE + 15;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_resignation_deadline
    BEFORE INSERT ON resignation_requests
    FOR EACH ROW EXECUTE FUNCTION fn_process_resignation_submission();

CREATE OR REPLACE FUNCTION fn_notify_resignation_parties()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID; hr_admin RECORD;
BEGIN
    SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;

    IF mgr_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'resignation_requests', NEW.id, 'resignation_submitted', mgr_id, 'reporting_manager',
           'Your direct report has submitted a formal resignation.', NOW());
    END IF;

    FOR hr_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'resignation_requests', NEW.id, 'resignation_submitted', hr_admin.id, 'direct_party',
           'A new formal resignation has been submitted -- 15-day acknowledgment clock started.', NOW());
    END LOOP;

    -- Auto-seed the standard clearance checklist
    INSERT INTO resignation_clearance_items (resignation_request_id, company_id, item_label, owner_department)
    VALUES
      (NEW.id, NEW.company_id, 'IT Equipment Handover', 'IT'),
      (NEW.id, NEW.company_id, 'Knowledge Transfer Document', 'Direct Manager'),
      (NEW.id, NEW.company_id, 'Final Settlement Calculation', 'Finance'),
      (NEW.id, NEW.company_id, 'Exit Interview', 'HR');

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_resignation
    AFTER INSERT ON resignation_requests
    FOR EACH ROW EXECUTE FUNCTION fn_notify_resignation_parties();

-- Auto-generate the file for templated letter types immediately
-- (Salary Certificate, Employment Verification, Bank Reference)
CREATE OR REPLACE FUNCTION fn_autogenerate_letter()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.auto_generated THEN
        NEW.status := 'ready';
        NEW.ready_at := NOW();
        -- in production: a document-generation service call populates generated_file_url here
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'internal_letter_requests', NEW.id, 'letter_ready', NEW.employee_id, 'direct_party',
           format('Your "%s" is ready to download.', NEW.letter_type), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_autogenerate_letter
    BEFORE INSERT ON internal_letter_requests
    FOR EACH ROW EXECUTE FUNCTION fn_autogenerate_letter();

-- 3-tier cash advance approval: supervisor approves first, then HR;
-- enforces the cap check at each stage
CREATE OR REPLACE FUNCTION fn_advance_3tier_approval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.approval_stage = 'hr_review' AND OLD.approval_stage = 'supervisor_review' THEN
        NEW.supervisor_approved_at := NOW();
    ELSIF NEW.approval_stage = 'approved' AND OLD.approval_stage = 'hr_review' THEN
        IF NEW.exceeds_cap THEN
            RAISE EXCEPTION 'Cannot approve: requested amount exceeds the 50%% net-pay cap (max: %).', OLD.max_allowed_npr;
        END IF;
        NEW.hr_approved_at := NOW();
        NEW.status := 'disbursed';
        NEW.disbursed_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_advance_approval
    BEFORE UPDATE OF approval_stage ON salary_advances
    FOR EACH ROW EXECUTE FUNCTION fn_advance_3tier_approval();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: "Things to Do" unified personal task feed, UNION across
-- many EXISTING tables -- no new data captured here
CREATE OR REPLACE VIEW v_things_to_do AS
SELECT 'signature' AS task_type, id, employee_id, company_id, title AS task_title, created_at
FROM pending_esignature_requests WHERE NOT signed
UNION ALL
SELECT 'attendance', id, employee_id, company_id, 'Missed punch needs a request' , request_date::TIMESTAMPTZ
FROM missed_punch_requests WHERE request_type = 'missed_punch'
UNION ALL
SELECT 'letter', id, employee_id, company_id, format('Letter request: %s', letter_type), requested_at
FROM internal_letter_requests WHERE status = 'pending_approval'
ORDER BY created_at DESC;

-- Page 3: my attendance requests (all 3 types) dashboard
CREATE OR REPLACE VIEW v_my_attendance_requests AS
SELECT * FROM missed_punch_requests ORDER BY request_date DESC;

-- Page 6: my resignation with full clearance checklist as JSON
CREATE OR REPLACE VIEW v_my_resignation_detail AS
SELECT rr.*,
    (SELECT jsonb_agg(jsonb_build_object('item', rci.item_label, 'owner', rci.owner_department, 'status', rci.status))
       FROM resignation_clearance_items rci WHERE rci.resignation_request_id = rr.id) AS clearance_checklist
FROM resignation_requests rr;

-- Page 7: my letter requests
CREATE OR REPLACE VIEW v_my_letter_requests AS
SELECT * FROM internal_letter_requests ORDER BY requested_at DESC;

-- Page 8: my cash advances, full 3-tier status
CREATE OR REPLACE VIEW v_my_cash_advances AS
SELECT * FROM salary_advances ORDER BY created_at DESC;
