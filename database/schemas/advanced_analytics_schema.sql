-- ================================================================
-- FILE: database/schemas/advanced_analytics_schema.sql
-- eLogix HRMS -- Reports, Analytics & BI > Advanced Analytics
-- (5 pages: Predictive Analytics, AI Insights, BI Dashboard, Custom
-- Report Builder, Export Center)
--
-- Design note: Predictive Analytics and AI Insights both ALREADY
-- existed as the same comprehensive page (AIInsightsPage -- 427
-- lines, 5 tabs: Attrition, Salary, Seasonal, Performance, AI Models),
-- already routed to 'ai-insights-page'. Predictive Analytics' new
-- sidebar key now points at the SAME page rather than building a
-- third near-duplicate forecasting hub -- confirmed before writing
-- anything that the two briefs describe identical functionality
-- (attrition forecasting, what-if modeling, ML accuracy metrics).
--
-- BI Dashboard is a PURE ROLLUP -- no new table, reading one tile
-- each from EXISTING views across Risk Management, Standard Reports,
-- and HR Analytics sessions.
--
-- Custom Report Builder and Export Center carry the two genuinely
-- new, legally load-bearing mechanisms in this delivery:
--
-- 1. Section 139 (Labour Court appeal of algorithm-based decisions):
--    any report built from performance/disciplinary fields gets
--    marked evidence_grade and requires a human_signoff_employee_id
--    before it can be finalized -- never a purely algorithmic record
--    standing alone as the basis for a contested decision.
--
-- 2. PII export gate: any export flagged contains_pii cannot complete
--    without either legal_grounds_text or employee_consent_on_file
--    populated -- enforced as a database CHECK constraint, not an
--    application-layer checkbox that could be bypassed.
--
--   - report_field_dictionary (NEW -- the pre-mapped data dictionary)
--   - custom_reports (NEW -- with the evidence-grade safeguard)
--   - data_exports (NEW -- with the PII-grounds CHECK constraint)
--
-- Nepal legal grounding: Section 139 (right to appeal algorithm-based
-- disciplinary/termination decisions in Labour Court, requiring
-- verifiable human evidence); Privacy Act 2075 (consent + purpose
-- limitation); Section 31/32 (mandatory accurate per-employee
-- recordkeeping); Section 28/30 (overtime threshold tracking via BI
-- tools must log exact hours, never approximate).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 4: CUSTOM REPORT BUILDER
-- ================================================================
CREATE TABLE IF NOT EXISTS report_field_dictionary (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_key                  VARCHAR(100) UNIQUE NOT NULL,  -- e.g. 'base_salary', 'performance_rating'
    display_label                  VARCHAR(200) NOT NULL,
    category                           VARCHAR(50) NOT NULL,  -- Employee Profile, Compensation, Performance, Attendance
    source_table                           VARCHAR(100) NOT NULL,  -- which existing table this field actually reads from
    source_column                              VARCHAR(100) NOT NULL,
    is_sensitive                                   BOOLEAN DEFAULT FALSE  -- compensation/performance/disciplinary fields
);

CREATE TABLE IF NOT EXISTS custom_reports (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    created_by_employee_id   UUID       NOT NULL REFERENCES employees(id),

    report_name                  VARCHAR(200) NOT NULL,
    selected_field_keys              TEXT[] NOT NULL,  -- references report_field_dictionary.field_key

    -- Section 139 safeguard: TRUE the moment any selected field
    -- touches performance/disciplinary data
    is_evidence_grade                    BOOLEAN DEFAULT FALSE,
    human_signoff_employee_id                UUID REFERENCES employees(id),  -- required before finalization if evidence-grade

    last_run_at                                  TIMESTAMPTZ,
    created_at                                       TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT ck_evidence_requires_signoff CHECK (
        (NOT is_evidence_grade) OR (is_evidence_grade AND human_signoff_employee_id IS NOT NULL) OR (last_run_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_cr_evidence ON custom_reports(is_evidence_grade) WHERE is_evidence_grade;

-- Auto-flag evidence_grade the moment a Performance/disciplinary
-- field is selected, never left to the user to remember
CREATE OR REPLACE FUNCTION fn_flag_evidence_grade_report()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE sensitive_count INT;
BEGIN
    SELECT COUNT(*) INTO sensitive_count
    FROM report_field_dictionary rfd
    WHERE rfd.field_key = ANY(NEW.selected_field_keys) AND rfd.category = 'Performance' AND rfd.is_sensitive;

    IF sensitive_count > 0 THEN
        NEW.is_evidence_grade := TRUE;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_flag_evidence_grade
    BEFORE INSERT OR UPDATE OF selected_field_keys ON custom_reports
    FOR EACH ROW EXECUTE FUNCTION fn_flag_evidence_grade_report();

-- ================================================================
-- PAGE 5: EXPORT CENTER -- the PII-grounds gate
-- ================================================================
CREATE TABLE IF NOT EXISTS data_exports (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    exported_by_employee_id  UUID       NOT NULL REFERENCES employees(id),

    custom_report_id             UUID    REFERENCES custom_reports(id),
    export_format                    VARCHAR(20) NOT NULL CHECK (export_format IN ('csv','xlsx','pdf','webhook')),

    contains_pii                         BOOLEAN DEFAULT FALSE,
    legal_grounds_text                       TEXT,  -- e.g. 'internal pay-equity audit, board-restricted'
    employee_consent_on_file                     BOOLEAN DEFAULT FALSE,

    status                                           VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed','blocked')),
    blocked_reason                                       TEXT,

    requested_at                                             TIMESTAMPTZ DEFAULT NOW(),

    -- THE HARD GATE: PII cannot leave without grounds or consent
    CONSTRAINT ck_pii_requires_grounds CHECK (
        (NOT contains_pii) OR (contains_pii AND (legal_grounds_text IS NOT NULL OR employee_consent_on_file)) OR (status = 'blocked')
    )
);

CREATE INDEX IF NOT EXISTS idx_de_pii ON data_exports(contains_pii) WHERE contains_pii;
CREATE INDEX IF NOT EXISTS idx_de_blocked ON data_exports(status) WHERE status = 'blocked';

-- Auto-block any PII export with no grounds, rather than silently
-- allowing the application layer to decide
CREATE OR REPLACE FUNCTION fn_enforce_pii_export_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.contains_pii AND NEW.legal_grounds_text IS NULL AND NOT NEW.employee_consent_on_file THEN
        NEW.status := 'blocked';
        NEW.blocked_reason := 'No legal grounds or employee consent recorded for PII export.';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_pii_export_gate
    BEFORE INSERT ON data_exports
    FOR EACH ROW EXECUTE FUNCTION fn_enforce_pii_export_gate();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 3: BI Dashboard -- pure rollup over EXISTING cross-module views
CREATE OR REPLACE VIEW v_bi_dashboard_summary AS
SELECT
    (SELECT total_headcount FROM v_workforce_summary_by_dept LIMIT 1) AS headcount_sample,
    (SELECT payroll_score FROM v_kri_health_index LIMIT 1) AS payroll_health_score,
    (SELECT avg_cost_per_hire_npr FROM v_cost_analysis LIMIT 1) AS avg_cost_per_hire_npr;

-- Page 4: Custom Report Builder dashboard
CREATE OR REPLACE VIEW v_custom_reports_dashboard AS
SELECT * FROM custom_reports ORDER BY created_at DESC;

-- Page 5: Export Center dashboard
CREATE OR REPLACE VIEW v_export_center_dashboard AS
SELECT de.*, cr.report_name FROM data_exports de
LEFT JOIN custom_reports cr ON de.custom_report_id = cr.id
ORDER BY de.requested_at DESC;
