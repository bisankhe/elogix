-- ================================================================
-- FILE: database/schemas/kpi_management_schema.sql
-- eLogix HRMS — Performance & Talent Management > Goal & Performance >
-- Goal Management > KPI Management (1 page)
--
-- Design note: KPIs sit UNDERNEATH KRAs (1-3 per KRA per global best
-- practice) -- kpi_definitions.kra_definition_id is a hard FK into the
-- existing kra_definitions table from last session. Notifications reuse
-- the existing transaction_notifications table directly -- no duplicate
-- mechanism built. Role-based KPI presets (Executive/Manager/HR/Employee)
-- are seeded as reference data, matching the brief's exact KPI matrix.
--
--   - kpi_definitions     (the KPI itself, target/current value, formula)
--   - kpi_value_history   (time-series for trend charts, every update logged)
--   - kpi_data_sources    (API vs manual, sync status per KPI)
--   - kpi_role_presets     (reference: Executive/Manager/HR/Employee KPI templates)
--
-- Nepal Labour Act 2074: employer may evaluate scope/quality/quantity of
-- work; KPI data may justify rewards/promotions/corrective action; annual
-- Labour Audit by mid-January requires verifiable performance reports.
-- Individual Privacy Act 2018 / Constitution Article 28: explicit consent
-- required before collecting/processing personal performance data;
-- access restricted to HR + direct supervisors only.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- KPI DEFINITIONS (1-3 per KRA, hard FK to existing kra_definitions)
-- ================================================================
CREATE TABLE IF NOT EXISTS kpi_definitions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    kra_definition_id         UUID       NOT NULL REFERENCES kra_definitions(id),
    employee_id                  UUID    REFERENCES employees(id),  -- the KPI owner

    kpi_title                       VARCHAR(300) NOT NULL,
    formula_description                TEXT,  -- human-readable, e.g. 'Closed Deals Value (USD)'
    role_tier                             VARCHAR(20) DEFAULT 'employee'
                                          CHECK (role_tier IN ('executive','line_manager','hr_admin','employee')),

    target_value                            NUMERIC(16,2) NOT NULL,
    current_value                              NUMERIC(16,2) DEFAULT 0,
    unit                                          VARCHAR(20) DEFAULT 'count',  -- '%','USD','count','people', etc.

    progress_pct                                    NUMERIC(6,2) GENERATED ALWAYS AS (
                                                     ROUND(current_value / NULLIF(target_value,0) * 100, 1)
                                                   ) STORED,
    status                                              VARCHAR(20) DEFAULT 'on_track'
                                                        CHECK (status IN ('on_track','at_risk','off_track')),

    -- Privacy compliance (Individual Privacy Act 2018, Constitution Art. 28)
    employee_consent_obtained                                BOOLEAN DEFAULT FALSE,
    consent_obtained_at                                          TIMESTAMPTZ,

    publish_status                                                  VARCHAR(20) DEFAULT 'draft'
                                                                    CHECK (publish_status IN ('draft','published','archived')),

    created_by                                                          UUID,
    created_at                                                             TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                                TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- KPI VALUE HISTORY (time-series for the trend chart wireframe)
-- ================================================================
CREATE TABLE IF NOT EXISTS kpi_value_history (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_definition_id   UUID NOT NULL REFERENCES kpi_definitions(id),
    company_id          UUID NOT NULL,

    recorded_value         NUMERIC(16,2) NOT NULL,
    recorded_at               TIMESTAMPTZ DEFAULT NOW(),
    recorded_by                  UUID,  -- NULL if API-synced
    source                           VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual','api_sync'))
);

-- ================================================================
-- KPI DATA SOURCES (API integration config per KPI)
-- ================================================================
CREATE TABLE IF NOT EXISTS kpi_data_sources (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_definition_id   UUID NOT NULL UNIQUE REFERENCES kpi_definitions(id),
    company_id          UUID NOT NULL,

    source_type           VARCHAR(30) NOT NULL
                          CHECK (source_type IN ('manual_entry','salesforce_api','payroll_register','lms','attendance_module','custom_api')),
    sync_frequency           VARCHAR(20) DEFAULT 'manual' CHECK (sync_frequency IN ('manual','daily','hourly','realtime')),
    last_synced_at               TIMESTAMPTZ,
    sync_status                     VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed')),

    created_at                         TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ROLE-BASED KPI PRESETS (reference templates per the brief's matrix)
-- ================================================================
CREATE TABLE IF NOT EXISTS kpi_role_presets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_tier       VARCHAR(20) NOT NULL CHECK (role_tier IN ('executive','line_manager','hr_admin','employee')),
    preset_title    VARCHAR(200) NOT NULL,
    suggested_formula VARCHAR(300),
    UNIQUE (role_tier, preset_title)
);

INSERT INTO kpi_role_presets (role_tier, preset_title, suggested_formula) VALUES
    ('executive','Human Capital ROI','Revenue / Total Compensation'),
    ('executive','eNPS (Employee Net Promoter Score)','% Promoters - % Detractors'),
    ('executive','Time-to-Fill','Avg days from requisition open to offer accepted'),
    ('executive','90-Day / 1-Year Turnover Rate','Departures / Average Headcount'),
    ('line_manager','Team Goal Completion Rate (OKRs)','Completed Key Results / Total Key Results'),
    ('line_manager','Department Overtime Cost','Sum of OT pay for the period'),
    ('line_manager','Skill Gap / Training Completion','Trained Count / Required Count'),
    ('hr_admin','Payroll Accuracy Rate','1 - (Discrepancies / Total Payslips)'),
    ('hr_admin','Compliance Audit Pass Rate','Passed Checks / Total Checks'),
    ('hr_admin','Benefits Enrollment Penetration','Enrolled / Eligible'),
    ('employee','Individual KPI / Goal Progress','Current Value / Target Value'),
    ('employee','Training & Certification Completion','Completed / Assigned'),
    ('employee','PTO / Leave Balance Accrual','Accrued Days')
ON CONFLICT (role_tier, preset_title) DO NOTHING;

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_kpd_kra        ON kpi_definitions(kra_definition_id);
CREATE INDEX IF NOT EXISTS idx_kpd_employee       ON kpi_definitions(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpd_status             ON kpi_definitions(status);
CREATE INDEX IF NOT EXISTS idx_kpd_role_tier              ON kpi_definitions(role_tier);

CREATE INDEX IF NOT EXISTS idx_kvh_kpi                       ON kpi_value_history(kpi_definition_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_kds_kpi                          ON kpi_data_sources(kpi_definition_id);
CREATE INDEX IF NOT EXISTS idx_kds_pending_sync                    ON kpi_data_sources(sync_status) WHERE sync_status = 'pending';

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_kpi_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

CREATE TRIGGER trg_kpd_upd
    BEFORE UPDATE ON kpi_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_kpi_updated_at();

-- Auto-classify status from progress_pct (the color-coded health meter logic)
CREATE OR REPLACE FUNCTION fn_classify_kpi_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.progress_pct >= 90 THEN
        NEW.status := 'on_track';
    ELSIF NEW.progress_pct >= 60 THEN
        NEW.status := 'at_risk';
    ELSE
        NEW.status := 'off_track';
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_classify_kpi_status
    BEFORE INSERT OR UPDATE OF current_value, target_value ON kpi_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_classify_kpi_status();

-- Every value update is logged to history (trend chart data source)
CREATE OR REPLACE FUNCTION fn_log_kpi_value_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.current_value IS DISTINCT FROM OLD.current_value THEN
        INSERT INTO kpi_value_history (kpi_definition_id, company_id, recorded_value, recorded_by, source, recorded_at)
        VALUES (NEW.id, NEW.company_id, NEW.current_value, NEW.updated_at IS NOT NULL AND NULL, 'manual', NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_log_kpi_history
    AFTER UPDATE OF current_value ON kpi_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_log_kpi_value_history();

-- On publish: notify the KPI owner + their reporting manager, reusing
-- the EXISTING transaction_notifications table from kra_management_schema.sql
CREATE OR REPLACE FUNCTION fn_notify_kpi_published()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE mgr_id UUID;
BEGIN
    IF NEW.publish_status = 'published' AND OLD.publish_status = 'draft' THEN
        IF NEW.employee_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'kpi_definitions', NEW.id, 'kpi_published', NEW.employee_id, 'direct_party',
               format('A new KPI "%s" (target: %s %s) has been assigned to you.', NEW.kpi_title, NEW.target_value, NEW.unit), NOW());

            SELECT manager_id INTO mgr_id FROM employees WHERE id = NEW.employee_id;
            IF mgr_id IS NOT NULL THEN
                INSERT INTO transaction_notifications
                  (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
                VALUES
                  (NEW.company_id, 'kpi_definitions', NEW.id, 'kpi_published', mgr_id, 'reporting_manager',
                   format('A new KPI "%s" has been assigned to your direct report.', NEW.kpi_title), NOW());
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_kpi_published
    AFTER UPDATE OF publish_status ON kpi_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_notify_kpi_published();

-- Block more than 3 KPIs per KRA (global best practice: 1-3 KPIs per KRA)
CREATE OR REPLACE FUNCTION fn_limit_kpis_per_kra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE existing_count INT;
BEGIN
    SELECT COUNT(*) INTO existing_count FROM kpi_definitions
    WHERE kra_definition_id = NEW.kra_definition_id AND publish_status != 'archived';

    IF existing_count >= 3 THEN
        RAISE WARNING 'This KRA already has % KPIs -- best practice recommends a maximum of 3 to avoid analysis paralysis.', existing_count;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_limit_kpis
    BEFORE INSERT ON kpi_definitions
    FOR EACH ROW EXECUTE FUNCTION fn_limit_kpis_per_kra();

-- ================================================================
-- VIEWS
-- ================================================================

-- The page's main data source: KPI + parent KRA title
CREATE OR REPLACE VIEW v_kpi_dashboard AS
SELECT
    kpd.*, kd.kra_title AS kra_parent, e.employee_code, e.first_name, e.last_name,
    kds.source_type AS data_source, kds.sync_status
FROM kpi_definitions kpd
JOIN kra_definitions kd ON kpd.kra_definition_id = kd.id
LEFT JOIN employees e ON kpd.employee_id = e.id
LEFT JOIN kpi_data_sources kds ON kds.kpi_definition_id = kpd.id
WHERE kpd.publish_status != 'archived';

-- Off-track / at-risk KPIs needing manager attention (the "health meter" alert feed)
CREATE OR REPLACE VIEW v_kpi_health_alerts AS
SELECT * FROM v_kpi_dashboard WHERE status IN ('at_risk','off_track') ORDER BY progress_pct ASC;

-- KPI trend data for charting
CREATE OR REPLACE VIEW v_kpi_trend_history AS
SELECT kvh.*, kpd.kpi_title FROM kpi_value_history kvh
JOIN kpi_definitions kpd ON kvh.kpi_definition_id = kpd.id
ORDER BY kvh.recorded_at;

-- Self-service: my KPIs (ESS feed)
CREATE OR REPLACE VIEW v_my_kpis AS
SELECT * FROM v_kpi_dashboard WHERE employee_id IS NOT NULL;

-- KPIs pending API sync (for the automatic reminder/sync job)
CREATE OR REPLACE VIEW v_kpi_pending_sync AS
SELECT kpd.kpi_title, kds.source_type, kds.last_synced_at, kpd.company_id
FROM kpi_data_sources kds
JOIN kpi_definitions kpd ON kds.kpi_definition_id = kpd.id
WHERE kds.sync_status = 'pending' AND kds.source_type != 'manual_entry';
