-- ================================================================
-- FILE: database/schemas/hr_analytics_governance_schema.sql
-- eLogix HRMS -- Reports, Analytics & BI > HR Analytics
-- (3 pages: Compliance Reports, Workforce Analytics, Annual HR Audit)
--
-- Design note: Annual HR Audit is the SAME Section 80 mandatory audit
-- already built as AnnualLabourAuditPage (Compliance Management
-- session) -- same legal mandate, same fiscal-year-end deadline, same
-- scope. This sidebar entry was genuinely missing (confirmed before
-- writing anything: the page existed and was routed, but only under
-- Compliance Management, never under this HR Analytics location).
-- Added the missing sidebar entry and reused the page verbatim --
-- never a duplicate Section 80 workflow.
--
-- Compliance Reports is the statutory-RETURNS lens (rosters,
-- attendance logs, work permits, accident reports, collective
-- bargaining filings) -- distinct from ComplianceRiskPage (risk-
-- severity) and PolicyCompliancePage (policy acknowledgment). It
-- reuses business_licenses (license_type='work_permit', Compliance
-- Management session) directly for the work-permit piece.
--
-- Workforce Analytics is the HCM-layer strategic synthesis -- distinct
-- from HRAnalyticsStandardPage (the minimalist board view, Standard
-- Reports) and the 4-page domain-specific deep-dive group. It reuses
-- v_kri_health_index (Risk Management) and v_workforce_summary_by_dept
-- (Standard Reports) directly for its baseline figures; what-if
-- scenarios and cross-domain pattern detection are the genuinely new
-- logic this page adds.
--
-- TWO genuine gaps closed: no workplace accident/injury reporting
-- existed anywhere in the build, and no collective bargaining
-- agreement filing record existed (only a generic enum value in a
-- document-type list, never a real table).
--
--   - workplace_accident_reports (NEW)
--   - collective_bargaining_filings (NEW)
--   - workforce_analytics_scenarios (NEW -- the what-if modeling
--     this page introduces)
--
-- Nepal legal grounding: Section 80 (10+ workers, fiscal year-end
-- deadline, qualified auditor); employee roster/attendance/leave-wage
-- recordkeeping for Labour Inspector review; foreign-national work
-- permits; IMMEDIATE accident/injury reporting duty; collective
-- bargaining agreement filing with the Labour Office; purpose-
-- limitation under the Privacy Act 2018 (data gathered for payroll/
-- compliance/performance cannot be silently repurposed).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: COMPLIANCE REPORTS -- the two genuinely new tables
-- ================================================================
CREATE TABLE IF NOT EXISTS workplace_accident_reports (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    affected_employee_id      UUID       REFERENCES employees(id),

    description                   TEXT NOT NULL,
    severity                          VARCHAR(20) NOT NULL CHECK (severity IN ('minor','serious','fatal')),

    -- the legal requirement: serious/fatal incidents must notify the
    -- Labour Office IMMEDIATELY, not in a batched monthly filing
    labour_office_notified_at            TIMESTAMPTZ,

    reported_by                              UUID NOT NULL,
    reported_at                                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_war_unnotified ON workplace_accident_reports(severity, labour_office_notified_at)
    WHERE severity IN ('serious','fatal') AND labour_office_notified_at IS NULL;

-- Immediate notification trigger for serious/fatal incidents -- the
-- brief's explicit "must be reported immediately" requirement, never
-- left to a human to remember
CREATE OR REPLACE FUNCTION fn_notify_serious_accident()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE hr_admin RECORD;
BEGIN
    IF NEW.severity IN ('serious','fatal') THEN
        FOR hr_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'workplace_accident_reports', NEW.id, 'serious_accident_immediate_notify', hr_admin.id, 'direct_party',
               format('%s workplace accident reported -- immediate Labour Office notification required.', NEW.severity), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_serious_accident
    AFTER INSERT ON workplace_accident_reports
    FOR EACH ROW EXECUTE FUNCTION fn_notify_serious_accident();

CREATE TABLE IF NOT EXISTS collective_bargaining_filings (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    union_name                 VARCHAR(200) NOT NULL,
    agreement_summary              TEXT,
    filed_with_labour_office_at        DATE,
    document_url                           VARCHAR(500),

    created_at                                 TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 2: WORKFORCE ANALYTICS -- the genuinely new what-if scenario layer
-- ================================================================
CREATE TABLE IF NOT EXISTS workforce_analytics_scenarios (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    scenario_name               VARCHAR(200) NOT NULL,
    headcount_delta                 INT NOT NULL DEFAULT 0,
    estimated_cost_impact_npr           NUMERIC(14,2),
    risk_note                               TEXT,  -- AI-generated risk callout (e.g. span-of-control or attrition implications)

    created_by                                  UUID NOT NULL,
    created_at                                      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Compliance Reports -- statutory returns dashboard, reusing
-- the EXISTING business_licenses for the work-permit piece
CREATE OR REPLACE VIEW v_compliance_reports_dashboard AS
SELECT
    (SELECT COUNT(*) FROM business_licenses WHERE license_type = 'work_permit' AND status = 'active'
       AND expires_date <= CURRENT_DATE + INTERVAL '30 days') AS work_permits_expiring_30d,
    (SELECT COUNT(*) FROM workplace_accident_reports war
       WHERE war.severity IN ('serious','fatal') AND war.labour_office_notified_at IS NULL) AS unnotified_serious_accidents,
    (SELECT MAX(filed_with_labour_office_at) FROM collective_bargaining_filings cbf WHERE cbf.company_id = bl.company_id) AS latest_cba_filing,
    bl.company_id
FROM (SELECT DISTINCT company_id FROM business_licenses) bl;

-- Page 2: Workforce Analytics -- the strategic synthesis, reusing
-- v_kri_health_index (Risk Management) and v_workforce_summary_by_dept
-- (Standard Reports) directly, never a duplicate calculation
CREATE OR REPLACE VIEW v_workforce_analytics_synthesis AS
SELECT
    kri.company_id, kri.payroll_score, kri.overall_alert_pressure,
    (SELECT SUM(actual_headcount) FROM v_workforce_summary_by_dept WHERE company_id = kri.company_id) AS total_headcount
FROM v_kri_health_index kri;

-- Page 3 (Annual HR Audit): intentionally NO new views here -- reuses
-- the EXISTING Section 80 audit tables/views (Compliance Management
-- session) verbatim.
