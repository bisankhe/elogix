-- ================================================================
-- FILE: database/schemas/ess_policies_payroll_schema.sql
-- NepHR Pro -- HR Services & Support > Employee Self Service (ESS),
-- third batch (12 pages: Code of Conduct, HR Policies, SOP for
-- Department, Organization Chart, Organogram for my Department,
-- Process Flow Chart for my Department, My Payroll, My Loan Status,
-- Payslip Download, My SSF, My CIT, My TAX)
--
-- Design note: this batch had the heaviest reuse of any ESS session --
-- SIX of twelve pages required ZERO new tables:
--   - HR Policies          -> the EXISTING HRPoliciesPage.jsx (already
--                             aliased to 'my-policies') -- no new table
--   - Code of Conduct      -> drills into the SAME policy library, no
--                             second document store
--   - Organization Chart   -> the EXISTING OrgChartPage.jsx (already
--                             aliased to 'org-chart'/'organization-chart')
--   - Organogram for my Dept -> reads the SAME org-structure data,
--                             pre-filtered client-side to one department
--   - Process Flow for my Dept -> the EXISTING ProcessFlowPage.jsx,
--                             already persona/department-aware
--   - My SSF / My CIT / My TAX -> the EXISTING SSFInformationPage,
--                             CITInformationPage, TaxInformationPage
--                             (all three were explicitly built as
--                             "self-service transparency" ledgers --
--                             this brief's ask, word for word)
-- Genuinely new tables, for the three pages with no precedent:
--   - department_sops (SOP for Department)
--   - My Payroll / My Loan Status / Payslip Download are pure READ
--     views over the EXISTING payslips (Payroll Finalization) and
--     employee_loans/loan_installments (Payroll Processing) -- no new
--     core data, just ESS-scoped views
--
--   - department_sops + sop_acknowledgments
--   - v_my_payroll_progression, v_my_loan_status, v_my_payslip_archive (views only)
--
-- Nepal legal grounding: Sections 34-35 (transparent, timely
-- remuneration -- My Payroll/Payslip Download fulfill this directly);
-- no statutory entitlement to company loans, but a transparent ledger
-- is required if offered (My Loan Status); SSF/CIT contribution rates
-- and the NPR 19,550 minimum wage floor require system-enforced
-- accuracy without manual error.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 3: SOP FOR DEPARTMENT (genuinely new, no precedent existed)
-- ================================================================
CREATE TABLE IF NOT EXISTS department_sops (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    department_id             UUID       NOT NULL REFERENCES departments(id),

    title                         VARCHAR(300) NOT NULL,
    version_label                    VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    file_url                            VARCHAR(500),
    read_required                           BOOLEAN DEFAULT FALSE,

    created_by                                  UUID NOT NULL,
    created_at                                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sop_acknowledgments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_sop_id     UUID NOT NULL REFERENCES department_sops(id),
    employee_id            UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    acknowledged_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (department_sop_id, employee_id)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_dsop_dept       ON department_sops(department_id);
CREATE INDEX IF NOT EXISTS idx_dsop_required        ON department_sops(read_required) WHERE read_required;
CREATE INDEX IF NOT EXISTS idx_sopa_employee             ON sop_acknowledgments(employee_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- On new SOP publish: notify everyone in the department, reusing the
-- EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_new_sop()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE emp RECORD;
BEGIN
    FOR emp IN SELECT id FROM employees WHERE department_id = NEW.department_id AND company_id = NEW.company_id LOOP
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'department_sops', NEW.id, 'new_sop_published', emp.id, 'direct_party',
           format('New SOP published for your department: "%s" (%s)', NEW.title, NEW.version_label), NOW());
    END LOOP;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_sop
    AFTER INSERT ON department_sops
    FOR EACH ROW EXECUTE FUNCTION fn_notify_new_sop();

CREATE OR REPLACE FUNCTION fn_touch_sop_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_touch_sop
    BEFORE UPDATE ON department_sops
    FOR EACH ROW EXECUTE FUNCTION fn_touch_sop_updated();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 3: SOP dashboard with per-employee acknowledgment status
CREATE OR REPLACE VIEW v_department_sops_for_employee AS
SELECT ds.*,
    EXISTS (SELECT 1 FROM sop_acknowledgments sa WHERE sa.department_sop_id = ds.id AND sa.employee_id = sa.employee_id) AS acknowledged
FROM department_sops ds;

-- Page 7: My Payroll -- salary progression, pure read over the EXISTING payslips
CREATE OR REPLACE VIEW v_my_payroll_progression AS
SELECT employee_id, pay_period, gross_npr, net_npr, ytd_gross_npr, ytd_net_npr, company_id
FROM payslips
ORDER BY pay_period DESC;

-- Page 8: My Loan Status -- pure read over the EXISTING employee_loans + loan_installments
CREATE OR REPLACE VIEW v_my_loan_status AS
SELECT el.*,
    (SELECT jsonb_agg(jsonb_build_object('due_date', li.due_date, 'amount_npr', li.amount_npr, 'status', li.status) ORDER BY li.due_date)
       FROM loan_installments li WHERE li.employee_loan_id = el.id) AS installment_schedule
FROM employee_loans el;

-- Page 9: Payslip Download -- the secured historical archive, pure read
-- over the EXISTING payslips table (already has published_to_ess/pdf_url)
CREATE OR REPLACE VIEW v_my_payslip_archive AS
SELECT id, employee_id, pay_period, gross_npr, net_npr, pdf_url, published_at, company_id
FROM payslips
WHERE published_to_ess = TRUE
ORDER BY pay_period DESC;
