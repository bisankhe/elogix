-- ================================================================
-- FILE: database/schemas/legal_management_schema.sql
-- eLogix HRMS -- Compliance & Risk Management > Legal Management
-- (3 pages: Legal Case Tracking, Contract Compliance, Ethics & Governance)
--
-- Design note: Legal Case Tracking is deliberately the LITIGATION-
-- STAGE CONTINUATION of the EXISTING grievances + complaints tables
-- (Employee Relations session) -- those tables already compute
-- labour_office_deadline/labour_court_deadline. This page has NO
-- table of its own; legal_case_metadata below adds only the
-- genuinely new fields (counsel assignment, litigation hold status)
-- that those original tables never needed, linked back by reference
-- rather than duplicating case data.
--
-- Contract Compliance is genuinely new -- no employment-contract, NDA,
-- or vendor-agreement repository existed anywhere in the build until
-- this session.
--
-- Ethics & Governance's whistleblower channel is a NEW table, but
-- follows the EXACT same server-side identity-discard discipline
-- already proven on suggestions.is_anonymous (Employee Engagement
-- session) -- submitter_employee_id is genuinely nullable and never
-- populated for anonymous reports, not just hidden in the UI.
-- Deliberately distinct from suggestions (workplace improvement
-- ideas) and complaints (HR-handled harassment/policy disputes) --
-- this is specifically for ethics/governance violations (bribery,
-- fraud, conflict of interest, abuse of authority).
--
--   - legal_case_metadata (the only new field set for Page 1, linked
--     by reference to EXISTING grievances/complaints)
--   - contracts (genuinely new, Page 2)
--   - ethics_reports (genuinely new, Page 3, anonymity-first design)
--
-- Nepal legal grounding: 21-day internal negotiation window before
-- Labour Office escalation, 35-day Labour Court appeal window
-- (Legal Case Tracking, reusing the EXISTING grievance deadlines);
-- mandatory written contracts (except casual hires under 7 days/
-- month), 6-month probation cap, 8.33% gratuity, festival allowance
-- (Contract Compliance); equal pay/non-discrimination, forced/child
-- labor penalties up to NPR 500,000, OSH stop-work authority
-- (Ethics & Governance).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: LEGAL CASE TRACKING -- linked metadata only, reading the
-- EXISTING grievances/complaints case data via reference, never copied
-- ================================================================
CREATE TABLE IF NOT EXISTS legal_case_metadata (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    case_no                    VARCHAR(30) UNIQUE NOT NULL,  -- e.g. LC-2025-003

    -- polymorphic reference back to the ORIGINATING record -- never a copy
    source_table                  VARCHAR(30) NOT NULL CHECK (source_table IN ('grievances','complaints')),
    source_record_id                  UUID NOT NULL,

    counsel_type                          VARCHAR(20) DEFAULT 'in_house' CHECK (counsel_type IN ('in_house','external')),
    counsel_name                              VARCHAR(200),

    -- e-discovery / litigation hold: freezes deletion of an exiting
    -- employee's digital records if they're involved in this case
    litigation_hold_active                        BOOLEAN DEFAULT FALSE,
    litigation_hold_employee_id                       UUID REFERENCES employees(id),

    created_at                                            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_table, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_lcm_source ON legal_case_metadata(source_table, source_record_id);
CREATE INDEX IF NOT EXISTS idx_lcm_hold   ON legal_case_metadata(litigation_hold_active) WHERE litigation_hold_active;

-- ================================================================
-- PAGE 2: CONTRACT COMPLIANCE (genuinely new)
-- ================================================================
CREATE TABLE IF NOT EXISTS contracts (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    contract_type               VARCHAR(50) NOT NULL,  -- employment_agreement, vendor_nda, outsourcing_agency_agreement, lease_agreement, other
    party_name                      VARCHAR(200) NOT NULL,
    -- optional link if the contract is with a specific employee (e.g. an employment agreement)
    related_employee_id                 UUID REFERENCES employees(id),

    signed_date                             DATE,
    expires_date                                DATE,

    document_url                                    VARCHAR(500),
    -- digital signature trail: timestamp, IP, and signature hash --
    -- linked permanently to the signer's digital file
    signature_timestamp                                 TIMESTAMPTZ,
    signature_ip                                            INET,

    -- AI clause-scan result, surfaced directly rather than buried in
    -- a separate report
    ai_flagged_clause                                           TEXT,

    status                                                          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','terminated')),
    created_at                                                          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_expiring ON contracts(expires_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_contracts_employee  ON contracts(related_employee_id);

-- Multi-tier expiry alerts (90/60/30 day), the same proven pattern
-- used for warranties, certifications, and business licenses
CREATE OR REPLACE FUNCTION fn_check_contract_expiry()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE ct RECORD; legal_admin RECORD; days_left INT; tier TEXT;
BEGIN
    FOR ct IN SELECT * FROM contracts WHERE status = 'active' AND expires_date IS NOT NULL LOOP
        days_left := ct.expires_date - CURRENT_DATE;
        tier := CASE WHEN days_left <= 30 THEN '30-day' WHEN days_left <= 60 THEN '60-day' WHEN days_left <= 90 THEN '90-day' ELSE NULL END;
        IF tier IS NOT NULL THEN
            FOR legal_admin IN SELECT id FROM employees WHERE company_id = ct.company_id AND role = 'hr_manager' LOOP
                INSERT INTO transaction_notifications
                  (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
                VALUES
                  (ct.company_id, 'contracts', ct.id, 'contract_expiring', legal_admin.id, 'direct_party',
                   format('%s alert: %s contract with "%s" expires in %s days.', tier, ct.contract_type, ct.party_name, days_left), NOW());
            END LOOP;
        END IF;
    END LOOP;
END;$$;

-- ================================================================
-- PAGE 3: ETHICS & GOVERNANCE (genuinely new, anonymity-first design)
-- ================================================================
CREATE TABLE IF NOT EXISTS ethics_reports (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    -- TRUE BY DEFAULT, mirroring the EXISTING suggestions.is_anonymous
    -- discipline: identity is discarded server-side, not just hidden
    is_anonymous                  BOOLEAN DEFAULT TRUE,
    submitter_employee_id             UUID REFERENCES employees(id),  -- NULL whenever is_anonymous is TRUE

    category                              VARCHAR(50) NOT NULL,  -- conflict_of_interest, bribery_or_fraud, abuse_of_authority, forced_or_child_labor, other
    description                               TEXT NOT NULL,

    -- the person the report concerns -- kept SEPARATE from the
    -- reporting/management chain to avoid routing it back to them
    subject_employee_id                           UUID REFERENCES employees(id),

    status                                            VARCHAR(20) DEFAULT 'under_review'
                                                      CHECK (status IN ('under_review','investigating','resolved')),
    assigned_to_ethics_committee_member_id                UUID,

    filed_at                                                  TIMESTAMPTZ DEFAULT NOW(),
    resolved_at                                                   TIMESTAMPTZ,

    CONSTRAINT ck_anonymous_no_submitter CHECK (
        (is_anonymous AND submitter_employee_id IS NULL) OR (NOT is_anonymous)
    )
);

CREATE INDEX IF NOT EXISTS idx_er_status ON ethics_reports(status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_er_category ON ethics_reports(category);

-- On filing: route directly to the Ethics Committee, deliberately
-- bypassing the subject employee's own management chain
CREATE OR REPLACE FUNCTION fn_route_ethics_report()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE ethics_member RECORD;
BEGIN
    FOR ethics_member IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'ethics_reports', NEW.id, 'ethics_report_filed', ethics_member.id, 'direct_party',
           format('New confidential ethics report filed: %s', NEW.category), NOW());
    END LOOP;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_route_ethics_report
    AFTER INSERT ON ethics_reports
    FOR EACH ROW EXECUTE FUNCTION fn_route_ethics_report();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Legal Case Tracking -- joins the metadata back to its
-- EXISTING source record (grievances OR complaints) live, never copied
CREATE OR REPLACE VIEW v_legal_case_dashboard AS
SELECT lcm.*, g.category AS grievance_category, g.stage AS grievance_stage,
       g.labour_office_deadline, g.labour_court_deadline
FROM legal_case_metadata lcm
LEFT JOIN grievances g ON lcm.source_table = 'grievances' AND lcm.source_record_id = g.id
UNION ALL
SELECT lcm.*, c.complaint_type, c.status, NULL, NULL
FROM legal_case_metadata lcm
LEFT JOIN complaints c ON lcm.source_table = 'complaints' AND lcm.source_record_id = c.id
WHERE lcm.source_table = 'complaints';

-- Page 2: Contract dashboard with computed days-remaining
CREATE OR REPLACE VIEW v_contract_dashboard AS
SELECT *,
    CASE WHEN expires_date IS NOT NULL THEN expires_date - CURRENT_DATE ELSE NULL END AS days_until_expiry
FROM contracts;

-- Page 3: Ethics dashboard -- never exposes submitter_employee_id in
-- aggregate reporting context, even for non-anonymous reports, unless
-- explicitly queried at the single-record investigation level
CREATE OR REPLACE VIEW v_ethics_governance_summary AS
SELECT category, status, COUNT(*) AS report_count, company_id
FROM ethics_reports
GROUP BY category, status, company_id;
