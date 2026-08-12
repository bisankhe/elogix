-- ================================================================
-- FILE: database/schemas/vendor_finance_schema.sql
-- eLogix HRMS — Vendor Finance & Analytics Schema
-- Covers:
--   1. vendor_billing_records  (Bill generation, TDS, 3-way match)
--   2. vendor_invoice_ocr      (OCR extraction metadata)
--   3. vendor_performance_extended (Enhanced scorecards)
--   4. vendor_clearances       (Contract-end checklist)
--   5. vendor_report_configs   (Saved report definitions)
-- Nepal IRD TDS 1.5%, VAT 13%, Labour Act 2074, DOL reporting
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. VENDOR BILLING RECORDS
-- Auto-generated from attendance + contract rates
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_billing_records (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_id              UUID         NOT NULL REFERENCES outsource_vendors(id),
    contract_id            UUID         REFERENCES sla_contracts(id),

    bill_no                VARCHAR(50)  NOT NULL,
    billing_period_month   INT          NOT NULL CHECK (billing_period_month BETWEEN 1 AND 12),
    billing_period_year    INT          NOT NULL,
    billing_cycle          VARCHAR(20)  DEFAULT 'monthly',
    issue_date             DATE         NOT NULL DEFAULT CURRENT_DATE,
    due_date               DATE,

    -- Calculation inputs
    workers_billed         INT          NOT NULL DEFAULT 0,
    days_billed            INT          NOT NULL DEFAULT 0,
    rate_per_day_npr       NUMERIC(10,2),
    contract_rate_npr      NUMERIC(10,2),  -- for discrepancy detection

    -- Amounts (Nepal IRD: TDS 1.5% on services, VAT 13%)
    gross_amount_npr       NUMERIC(15,2) NOT NULL,
    tds_rate_pct           NUMERIC(5,2)  DEFAULT 1.5,    -- Section 88, Income Tax Act
    tds_amount_npr         NUMERIC(12,2) DEFAULT 0,
    vat_rate_pct           NUMERIC(5,2)  DEFAULT 0,      -- 13% if VAT registered
    vat_amount_npr         NUMERIC(12,2) DEFAULT 0,
    net_payable_npr        NUMERIC(15,2) DEFAULT 0,

    -- 3-way match
    contract_verified      BOOLEAN      DEFAULT FALSE,
    attendance_verified    BOOLEAN      DEFAULT FALSE,
    invoice_received       BOOLEAN      DEFAULT FALSE,
    rate_discrepancy_npr   NUMERIC(10,2) DEFAULT 0,
    has_discrepancy        BOOLEAN      DEFAULT FALSE,

    -- AI validation
    ai_validated           BOOLEAN      DEFAULT FALSE,
    ai_fraud_risk_score    FLOAT        DEFAULT 0,
    ai_note                TEXT,
    ai_validated_at        TIMESTAMPTZ,

    -- Status workflow
    status                 VARCHAR(30)  DEFAULT 'draft'
                           CHECK (status IN ('draft','pending_approval','approved','disputed','paid','rejected')),
    approved_by            UUID,
    approved_at            TIMESTAMPTZ,
    dispute_reason         TEXT,
    payment_date           DATE,
    payment_reference      VARCHAR(100),
    tds_certificate_no     VARCHAR(50),

    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    created_by             UUID,
    is_deleted             BOOLEAN      DEFAULT FALSE,

    UNIQUE (company_id, bill_no),
    CHECK (due_date IS NULL OR due_date >= issue_date),
    CHECK (net_payable_npr >= 0)
);

-- ================================================================
-- 2. VENDOR INVOICE OCR RECORDS
-- OCR extraction metadata per invoice upload
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_invoice_ocr (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    invoice_id             UUID         REFERENCES vendor_invoices(id),
    vendor_id              UUID         REFERENCES outsource_vendors(id),

    -- OCR process
    uploaded_file_url      VARCHAR(500),
    file_type              VARCHAR(20)  DEFAULT 'pdf',
    ocr_provider           VARCHAR(50)  DEFAULT 'internal',
    ocr_status             VARCHAR(20)  DEFAULT 'pending'
                           CHECK (ocr_status IN ('pending','processing','completed','failed')),
    ocr_confidence_pct     FLOAT,
    ocr_processed_at       TIMESTAMPTZ,

    -- Extracted fields (JSONB for flexibility)
    extracted_data         JSONB        DEFAULT '{}',
    -- e.g. {"invoice_no":"INV-001","amount":50000,"date":"2025-07-01","vendor_pan":"123456"}

    -- 3-way match result
    po_number              VARCHAR(50),
    po_matched             BOOLEAN      DEFAULT FALSE,
    grn_matched            BOOLEAN      DEFAULT FALSE,
    invoice_matched        BOOLEAN      DEFAULT FALSE,
    match_confidence_pct   FLOAT,

    -- AI fraud detection
    ai_fraud_risk_score    FLOAT        DEFAULT 0,
    ai_anomaly_flags       JSONB        DEFAULT '[]',

    created_at             TIMESTAMPTZ  DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  DEFAULT NOW(),
    created_by             UUID
);

-- ================================================================
-- 3. VENDOR CLEARANCES
-- Contract-end 10-point checklist, Nepal LA2074 Section 64
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_clearances (
    id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id                  UUID         NOT NULL,
    vendor_id                   UUID         NOT NULL REFERENCES outsource_vendors(id),

    clearance_no                VARCHAR(50)  NOT NULL,
    contract_end_date           DATE         NOT NULL,
    workers_count               INT          DEFAULT 0,
    reason                      VARCHAR(100) DEFAULT 'contract_end'
                                CHECK (reason IN (
                                  'contract_end','mutual_termination',
                                  'performance_breach','vendor_initiated','force_majeure')),

    -- 10-point checklist (JSONB: each key = {done:bool, date:str, by:str})
    checklist                   JSONB        NOT NULL DEFAULT '{
                                  "final_invoice_cleared":    {"done":false,"date":null,"by":null},
                                  "wages_verified_paid":      {"done":false,"date":null,"by":null},
                                  "ssf_deposits_cleared":     {"done":false,"date":null,"by":null},
                                  "insurance_closed":         {"done":false,"date":null,"by":null},
                                  "assets_returned":          {"done":false,"date":null,"by":null},
                                  "badges_revoked":           {"done":false,"date":null,"by":null},
                                  "system_access_revoked":    {"done":false,"date":null,"by":null},
                                  "nda_confirmed":            {"done":false,"date":null,"by":null},
                                  "labour_office_reported":   {"done":false,"date":null,"by":null},
                                  "no_discrimination_cert":   {"done":false,"date":null,"by":null}
                                }',

    -- Financial settlement
    outstanding_amount          NUMERIC(12,2) DEFAULT 0,
    penalty_deducted            NUMERIC(12,2) DEFAULT 0,
    final_payment_amount        NUMERIC(12,2) DEFAULT 0,
    final_payment_date          DATE,
    final_payment_ref           VARCHAR(100),

    -- Nepal LA2074 specific
    la2074_compliant            BOOLEAN      DEFAULT FALSE,
    labour_office_report        BOOLEAN      DEFAULT FALSE,
    labour_office_report_ref    VARCHAR(100),
    labour_office_report_date   DATE,

    -- Status
    status                      VARCHAR(20)  DEFAULT 'pending'
                                CHECK (status IN ('pending','in_progress','completed','cancelled')),
    initiated_on                TIMESTAMPTZ,
    completed_on                TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ  DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  DEFAULT NOW(),
    created_by                  UUID,
    is_deleted                  BOOLEAN      DEFAULT FALSE,

    UNIQUE (company_id, clearance_no)
);

-- ================================================================
-- 4. VENDOR REPORT CONFIGS (Saved report definitions)
-- ================================================================
CREATE TABLE IF NOT EXISTS vendor_report_configs (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id     UUID        NOT NULL,
    name           VARCHAR(200) NOT NULL,
    report_type    VARCHAR(50) NOT NULL,
    filters        JSONB       DEFAULT '{}',
    columns        JSONB       DEFAULT '[]',
    schedule       VARCHAR(20) DEFAULT 'manual',
    recipients     JSONB       DEFAULT '[]',
    last_run_at    TIMESTAMPTZ,
    is_active      BOOLEAN     DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    created_by     UUID
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_vbr_company    ON vendor_billing_records(company_id)   WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_vbr_vendor     ON vendor_billing_records(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vbr_status     ON vendor_billing_records(status);
CREATE INDEX IF NOT EXISTS idx_vbr_period     ON vendor_billing_records(billing_period_year, billing_period_month);
CREATE INDEX IF NOT EXISTS idx_vbr_disc       ON vendor_billing_records(has_discrepancy) WHERE has_discrepancy;

CREATE INDEX IF NOT EXISTS idx_vio_vendor     ON vendor_invoice_ocr(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vio_status     ON vendor_invoice_ocr(ocr_status);

CREATE INDEX IF NOT EXISTS idx_vc_company     ON vendor_clearances(company_id)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_vc_vendor      ON vendor_clearances(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vc_status      ON vendor_clearances(status);
CREATE INDEX IF NOT EXISTS idx_vc_la2074      ON vendor_clearances(la2074_compliant)   WHERE NOT la2074_compliant;

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto updated_at
CREATE OR REPLACE FUNCTION fn_vf_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'vendor_billing_records','vendor_invoice_ocr','vendor_clearances'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_vf_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Auto-compute TDS and net payable on billing
CREATE OR REPLACE FUNCTION fn_vbr_compute_amounts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- TDS deduction (Nepal IRD Section 88: 1.5% on services)
    NEW.tds_amount_npr    := ROUND(NEW.gross_amount_npr * NEW.tds_rate_pct / 100, 2);
    NEW.vat_amount_npr    := ROUND(NEW.gross_amount_npr * NEW.vat_rate_pct / 100, 2);
    NEW.net_payable_npr   := NEW.gross_amount_npr + NEW.vat_amount_npr - NEW.tds_amount_npr;

    -- Rate discrepancy detection
    IF NEW.contract_rate_npr IS NOT NULL AND NEW.rate_per_day_npr IS NOT NULL THEN
        NEW.rate_discrepancy_npr := ROUND(NEW.rate_per_day_npr - NEW.contract_rate_npr, 2);
        NEW.has_discrepancy      := ABS(NEW.rate_discrepancy_npr) > 1;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_vbr_amounts
    BEFORE INSERT OR UPDATE OF gross_amount_npr, tds_rate_pct, vat_rate_pct, rate_per_day_npr
    ON vendor_billing_records
    FOR EACH ROW EXECUTE FUNCTION fn_vbr_compute_amounts();

-- Auto-flag clearance LA2074 compliance when all mandatory items done
CREATE OR REPLACE FUNCTION fn_vc_la2074_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE la_items TEXT[] := ARRAY['wages_verified_paid','ssf_deposits_cleared','labour_office_reported','no_discrimination_cert'];
        item TEXT; all_la_done BOOLEAN := TRUE;
BEGIN
    FOREACH item IN ARRAY la_items LOOP
        IF NOT (NEW.checklist->item->>'done')::BOOLEAN THEN
            all_la_done := FALSE;
        END IF;
    END LOOP;
    NEW.la2074_compliant := all_la_done;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_vc_la2074
    BEFORE INSERT OR UPDATE OF checklist ON vendor_clearances
    FOR EACH ROW EXECUTE FUNCTION fn_vc_la2074_check();

-- ================================================================
-- VIEWS
-- ================================================================

-- Vendor spend analysis (TCO)
CREATE OR REPLACE VIEW v_vendor_tco AS
SELECT
    ov.vendor_name, ov.vendor_code, ov.service_category,
    EXTRACT(YEAR FROM vi.issue_date)::INT                      AS year,
    COUNT(vi.id)                                               AS invoice_count,
    COALESCE(SUM(vi.total_amount_npr), 0)                      AS gross_spend,
    COALESCE(SUM(vi.tds_amount_npr), 0)                        AS tds_deducted,
    COALESCE(SUM(vi.total_amount_npr - vi.tds_amount_npr), 0)  AS net_spend,
    COUNT(vi.id) FILTER (WHERE vi.has_discrepancy)             AS dispute_count,
    ov.overall_performance_score                               AS performance_score,
    ov.overall_risk_level
FROM vendor_invoices vi
JOIN outsource_vendors ov ON vi.vendor_id = ov.id
WHERE NOT vi.is_deleted
GROUP BY ov.vendor_name, ov.vendor_code, ov.service_category,
         EXTRACT(YEAR FROM vi.issue_date), ov.overall_performance_score, ov.overall_risk_level
ORDER BY gross_spend DESC;

-- Nepal statutory compliance deadlines
CREATE OR REPLACE VIEW v_nepal_statutory_deadlines AS
SELECT
    'TDS Quarterly Return (IRD)'                               AS report_name,
    'Inland Revenue Department'                                AS authority,
    DATE_TRUNC('quarter', NOW()) + INTERVAL '3 months 15 days' AS deadline,
    'Quarterly'                                                AS frequency,
    'Income Tax Act Section 88 — 1.5% TDS on services'        AS la_reference
UNION ALL
SELECT
    'Poush Report — Vendor Employee Details',
    'Department of Labour (MoLESS)',
    (DATE_PART('year', NOW())::INT || '-01-15')::DATE,
    'Annual',
    'Nepal Labour Act 2074 Section 64'
UNION ALL
SELECT
    'Annual Labour Audit',
    'Department of Labour (MoLESS)',
    (DATE_PART('year', NOW())::INT + 1 || '-02-28')::DATE,
    'Annual',
    'Nepal Labour Act 2074';

-- Clearance pending alerts
CREATE OR REPLACE VIEW v_clearance_alerts AS
SELECT
    vc.clearance_no, ov.vendor_name, ov.vendor_code,
    vc.contract_end_date,
    (CURRENT_DATE - vc.contract_end_date)::INT AS days_since_end,
    vc.status, vc.la2074_compliant,
    jsonb_object_keys(vc.checklist) AS pending_item_check,
    vc.company_id
FROM vendor_clearances vc
JOIN outsource_vendors ov ON vc.vendor_id = ov.id
WHERE vc.status IN ('pending','in_progress')
  AND NOT vc.is_deleted
  AND NOT (vc.checklist->jsonb_object_keys(vc.checklist)->>'done')::BOOLEAN
ORDER BY vc.contract_end_date ASC;
