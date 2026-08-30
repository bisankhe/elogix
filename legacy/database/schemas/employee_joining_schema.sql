-- ================================================================
-- FILE: database/schemas/employee_joining_schema.sql
-- eLogix HRMS — Onboarding > Employee Joining Module Schema
-- Covers all 9 pages (Biometric Capture reuses preboarding_schema.sql's
-- biometric_captures table — same concept, post-acceptance context):
--   1. digital_signatures        (Digital Signature Creation)
--   2. (biometric_captures — see preboarding_schema.sql)
--   3. orientation_programs + orientation_modules (Orientation Program)
--   4. account_provisioning      (Account Creation)
--   5. nda_acknowledgments       (Non-Disclosure Agreement)
--   6. asset_allocations + asset_allocation_items (Asset Allocation)
--   7. buddy_assignments         (Buddy Assignment)
--   8. welcome_communications + welcome_comm_steps (Welcome Communication)
--   9. department_introductions + intro_meetings (Department Introduction)
-- Nepal Labour Act 2074 Sections 10, 68, 108 + Electronic Transactions Act 2063.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. DIGITAL SIGNATURES (Digital Signature Creation)
-- ================================================================
CREATE TABLE IF NOT EXISTS digital_signatures (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    enrollment_id            UUID       REFERENCES employee_enrollments(id),

    employee_name              VARCHAR(200) NOT NULL,
    document_type                 VARCHAR(50) DEFAULT 'employment_contract',
    document_url                     VARCHAR(500),
    total_pages                         INT DEFAULT 1,

    -- Scroll-lock read tracking
    scroll_pct_read                       INT DEFAULT 0 CHECK (scroll_pct_read BETWEEN 0 AND 100),
    fully_read                              BOOLEAN GENERATED ALWAYS AS (scroll_pct_read >= 100) STORED,

    status                                    VARCHAR(20) DEFAULT 'pending'
                                              CHECK (status IN ('pending','in_progress','signed','declined')),

    -- e-Signature details
    signature_type                              VARCHAR(20) DEFAULT 'typed'
                                                CHECK (signature_type IN ('typed','drawn','click_to_sign')),
    signature_text_value                           VARCHAR(255),
    signed_at                                        TIMESTAMPTZ,
    signer_ip_address                                  VARCHAR(50),
    signer_device_info                                    VARCHAR(255),

    -- Nepal Electronic Transactions Act 2063: CA certification
    ca_certified                                            BOOLEAN DEFAULT FALSE,
    certifying_authority                                       VARCHAR(200) DEFAULT 'Nepal Certification Company',
    certified_at                                                  TIMESTAMPTZ,

    -- Tamper-evident audit hash
    audit_hash                                                       VARCHAR(100),

    created_at                                                          TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                           TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                            BOOLEAN DEFAULT FALSE,

    CONSTRAINT ck_sig_requires_full_read CHECK (status != 'signed' OR scroll_pct_read >= 100)
);

-- ================================================================
-- 3. ORIENTATION PROGRAMS (LMS-style first-week schedule)
-- ================================================================
CREATE TABLE IF NOT EXISTS orientation_programs (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    enrollment_id            UUID       REFERENCES employee_enrollments(id),

    employee_name              VARCHAR(200) NOT NULL,
    position                     VARCHAR(200),
    timezone                       VARCHAR(50) DEFAULT 'Asia/Kathmandu',
    week_label                       VARCHAR(20) DEFAULT 'Week 1',

    overall_pct                        INT DEFAULT 0,
    created_at                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                              TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS orientation_modules (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orientation_program_id UUID NOT NULL REFERENCES orientation_programs(id),
    company_id          UUID NOT NULL,

    scheduled_date      DATE NOT NULL,
    scheduled_time      TIME NOT NULL,
    title               VARCHAR(300) NOT NULL,
    module_type         VARCHAR(30) NOT NULL
                        CHECK (module_type IN ('compliance','culture','technical','oneOnOne','safety')),
    duration_minutes    INT DEFAULT 60,
    facilitator_name    VARCHAR(200),

    -- Nepal LA2074 mandatory modules
    is_la2074_mandatory BOOLEAN DEFAULT FALSE,
    la2074_section      VARCHAR(20),  -- e.g. 'Section 68' or 'Section 108'

    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending','completed','rescheduled','skipped')),
    completed_at         TIMESTAMPTZ,

    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 4. ACCOUNT PROVISIONING (Account Creation — zero-touch)
-- ================================================================
CREATE TABLE IF NOT EXISTS account_provisioning (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    enrollment_id            UUID       REFERENCES employee_enrollments(id),

    employee_name              VARCHAR(200) NOT NULL,

    -- Gating conditions (NDA + Contract must both be true to provision)
    nda_signed                    BOOLEAN DEFAULT FALSE,
    contract_signed                  BOOLEAN DEFAULT FALSE,
    trigger_status                      VARCHAR(20) DEFAULT 'blocked'
                                        CHECK (trigger_status IN ('blocked','ready','completed')),

    -- Per-system provisioning status (JSONB for flexibility)
    systems                                JSONB DEFAULT '{}',
    -- {"email":"done","hris":"done","slack":"pending","erp":"na","vpn":"pending","attendance":"pending","software":"pending"}

    overall_pct                               INT DEFAULT 0,
    twofa_enabled                                BOOLEAN DEFAULT FALSE,
    it_ticket_no                                    VARCHAR(50),
    it_ticket_created_at                               TIMESTAMPTZ,

    created_at                                            TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                             TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                              BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 5. NDA ACKNOWLEDGMENTS (separate legal gate from cultural tasks)
-- ================================================================
CREATE TABLE IF NOT EXISTS nda_acknowledgments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    enrollment_id            UUID       REFERENCES employee_enrollments(id),

    employee_name              VARCHAR(200) NOT NULL,
    department                     VARCHAR(200),
    nda_version                      VARCHAR(20) DEFAULT 'v1.0',
    sensitivity_level                   VARCHAR(20) DEFAULT 'medium'
                                        CHECK (sensitivity_level IN ('critical','high','medium','low')),
    ip_clauses                            JSONB DEFAULT '[]',

    scroll_pct_read                          INT DEFAULT 0,
    status                                      VARCHAR(20) DEFAULT 'pending'
                                                CHECK (status IN ('pending','acknowledged')),
    acknowledged_at                                TIMESTAMPTZ,

    -- THE GATE: blocks downstream HRIS progression
    blocks_progression                                BOOLEAN GENERATED ALWAYS AS (status = 'pending') STORED,

    created_at                                           TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                            TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                             BOOLEAN DEFAULT FALSE,

    CONSTRAINT ck_nda_full_read CHECK (status != 'acknowledged' OR scroll_pct_read >= 100)
);

-- ================================================================
-- 6. ASSET ALLOCATIONS (Logistics hub)
-- ================================================================
CREATE TABLE IF NOT EXISTS asset_allocations (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    enrollment_id            UUID       REFERENCES employee_enrollments(id),

    employee_name              VARCHAR(200) NOT NULL,
    work_mode                     VARCHAR(20) DEFAULT 'on_site'
                                  CHECK (work_mode IN ('on_site','hybrid','remote')),
    branch_id                       UUID,
    shipping_address                   TEXT,
    hardware_preference                   TEXT,  -- e.g. "Mac vs PC: PC", "Ergonomic chair requested"

    signed_receipt                           BOOLEAN DEFAULT FALSE,
    signed_receipt_url                          VARCHAR(500),
    signed_receipt_date                            DATE,

    created_at                                        TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                         TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                          BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS asset_allocation_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id       UUID NOT NULL REFERENCES asset_allocations(id),
    company_id          UUID NOT NULL,

    item_name           VARCHAR(200) NOT NULL,  -- Laptop, Monitor, Access Card, Chair
    model               VARCHAR(200),
    serial_number       VARCHAR(100),
    value_npr           NUMERIC(12,2),

    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending','in_transit','delivered','returned')),
    shipped_at          TIMESTAMPTZ,
    delivered_at         TIMESTAMPTZ,

    -- Tracking link to general asset management module (offboarding reconciliation)
    asset_register_id     UUID,

    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 7. BUDDY ASSIGNMENTS (Peer mentorship — never the manager)
-- ================================================================
CREATE TABLE IF NOT EXISTS buddy_assignments (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    enrollment_id            UUID       REFERENCES employee_enrollments(id),

    new_hire_name               VARCHAR(200) NOT NULL,
    new_hire_role                  VARCHAR(200),
    new_hire_dept                     VARCHAR(200),

    buddy_employee_id                    UUID,
    buddy_name                              VARCHAR(200) NOT NULL,
    buddy_role                                 VARCHAR(200),
    buddy_dept                                    VARCHAR(200),
    buddy_tenure_years                               NUMERIC(4,1),

    -- AI matching rationale
    matched_on                                          JSONB DEFAULT '[]',  -- ["Same Department","Similar Tech Stack"]
    ai_match_score                                         FLOAT DEFAULT 0,

    status                                                    VARCHAR(20) DEFAULT 'pending_response'
                                                              CHECK (status IN ('pending_response','active','declined','completed')),
    buddy_notified                                              BOOLEAN DEFAULT FALSE,
    buddy_notified_at                                              TIMESTAMPTZ,

    coffee_chat_scheduled_at                                          TIMESTAMPTZ,
    coffee_chat_completed                                                BOOLEAN DEFAULT FALSE,

    -- Constraint: buddy must not be the new hire's direct manager
    CONSTRAINT ck_buddy_not_manager CHECK (buddy_employee_id IS DISTINCT FROM enrollment_id),

    created_at                                                              TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                                               TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- 8. WELCOME COMMUNICATIONS (branded feed, type-tailored sequence)
-- ================================================================
CREATE TABLE IF NOT EXISTS welcome_communications (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    enrollment_id            UUID       REFERENCES employee_enrollments(id),

    employee_name              VARCHAR(200) NOT NULL,
    employee_type                 VARCHAR(20) NOT NULL CHECK (employee_type IN ('insource','outsource')),
    position                        VARCHAR(200),
    vendor_name                       VARCHAR(200),  -- only for outsource

    engagement_summary                  VARCHAR(100),  -- e.g. "opened all 4"
    created_at                             TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS welcome_comm_steps (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    welcome_communication_id UUID NOT NULL REFERENCES welcome_communications(id),
    company_id            UUID NOT NULL,

    step_name             VARCHAR(200) NOT NULL,  -- "Pre-start Welcome Email","CEO Welcome Video"...
    channel                VARCHAR(50) DEFAULT 'Email',  -- Email | Portal | Slack | Email + SMS
    sequence_order          INT DEFAULT 1,

    sent                      BOOLEAN DEFAULT FALSE,
    sent_at                      TIMESTAMPTZ,
    opened                          BOOLEAN DEFAULT FALSE,
    opened_at                          TIMESTAMPTZ,

    created_at                            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 9. DEPARTMENT INTRODUCTIONS (org chart + stakeholder 1:1s)
-- ================================================================
CREATE TABLE IF NOT EXISTS department_introductions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    enrollment_id            UUID       REFERENCES employee_enrollments(id),

    employee_name              VARCHAR(200) NOT NULL,
    position                     VARCHAR(200),
    department_id                  UUID,
    manager_employee_id               UUID,
    manager_name                         VARCHAR(200),
    org_position_summary                    VARCHAR(300),  -- "Reports to CTO · Peer to 4 Senior Engineers"

    created_at                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                  TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                   BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS intro_meetings (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_intro_id  UUID NOT NULL REFERENCES department_introductions(id),
    company_id           UUID NOT NULL,

    meeting_type         VARCHAR(20) DEFAULT 'team_member'
                         CHECK (meeting_type IN ('team_member','key_stakeholder')),
    person_name           VARCHAR(200) NOT NULL,
    person_role            VARCHAR(200),
    reason_for_meeting        TEXT,  -- for key_stakeholder type

    scheduled_at                TIMESTAMPTZ,
    status                         VARCHAR(20) DEFAULT 'scheduled'
                                   CHECK (status IN ('scheduled','completed','cancelled')),
    completed_at                      TIMESTAMPTZ,

    created_at                           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_dsig_company       ON digital_signatures(company_id)      WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_dsig_status          ON digital_signatures(status);
CREATE INDEX IF NOT EXISTS idx_dsig_enrollment        ON digital_signatures(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_op_company               ON orientation_programs(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_om_program                 ON orientation_modules(orientation_program_id);
CREATE INDEX IF NOT EXISTS idx_om_la2074                   ON orientation_modules(is_la2074_mandatory) WHERE is_la2074_mandatory;
CREATE INDEX IF NOT EXISTS idx_om_pending                    ON orientation_modules(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ap_company                       ON account_provisioning(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_ap_trigger                          ON account_provisioning(trigger_status);

CREATE INDEX IF NOT EXISTS idx_nda_company                            ON nda_acknowledgments(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_nda_blocking                              ON nda_acknowledgments(blocks_progression) WHERE blocks_progression;

CREATE INDEX IF NOT EXISTS idx_aa_company                                   ON asset_allocations(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_aai_allocation                                  ON asset_allocation_items(allocation_id);
CREATE INDEX IF NOT EXISTS idx_aai_status                                        ON asset_allocation_items(status);

CREATE INDEX IF NOT EXISTS idx_buddy_company                                        ON buddy_assignments(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_buddy_status                                            ON buddy_assignments(status);

CREATE INDEX IF NOT EXISTS idx_wc_company                                                  ON welcome_communications(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_wcs_comm                                                       ON welcome_comm_steps(welcome_communication_id);
CREATE INDEX IF NOT EXISTS idx_wcs_pending                                                       ON welcome_comm_steps(sent) WHERE NOT sent;

CREATE INDEX IF NOT EXISTS idx_di_company                                                           ON department_introductions(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_im_intro                                                                ON intro_meetings(department_intro_id);
CREATE INDEX IF NOT EXISTS idx_im_status                                                                  ON intro_meetings(status);

-- ================================================================
-- TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION fn_joining_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;

DO $$ DECLARE t TEXT;
BEGIN FOREACH t IN ARRAY ARRAY[
  'digital_signatures','orientation_programs','account_provisioning','nda_acknowledgments',
  'asset_allocations','asset_allocation_items','buddy_assignments','department_introductions'
] LOOP
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%s_upd ON %s;
     CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION fn_joining_updated_at()',
    t,t,t,t);
END LOOP; END$$;

-- Block signature without full scroll-read
CREATE OR REPLACE FUNCTION fn_signature_read_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'signed' AND NEW.scroll_pct_read < 100 THEN
        RAISE EXCEPTION 'Cannot sign: document must be fully read (scroll-lock at 100%%).';
    END IF;
    IF NEW.status = 'signed' AND OLD.status != 'signed' THEN
        NEW.signed_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_signature_gate
    BEFORE UPDATE OF status ON digital_signatures
    FOR EACH ROW EXECUTE FUNCTION fn_signature_read_gate();

-- Block NDA acknowledgment without full read
CREATE OR REPLACE FUNCTION fn_nda_read_gate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'acknowledged' AND NEW.scroll_pct_read < 100 THEN
        RAISE EXCEPTION 'Cannot acknowledge NDA: must be fully read first.';
    END IF;
    IF NEW.status = 'acknowledged' AND OLD.status != 'acknowledged' THEN
        NEW.acknowledged_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_nda_gate
    BEFORE UPDATE OF status ON nda_acknowledgments
    FOR EACH ROW EXECUTE FUNCTION fn_nda_read_gate();

-- Auto-flip account provisioning trigger_status when NDA + contract both done
CREATE OR REPLACE FUNCTION fn_account_provisioning_unlock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.nda_signed AND NEW.contract_signed AND NEW.trigger_status = 'blocked' THEN
        NEW.trigger_status := 'ready';
        NEW.it_ticket_no := 'IT-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD((RANDOM()*9999)::INT::TEXT, 4, '0');
        NEW.it_ticket_created_at := NOW();
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_account_unlock
    BEFORE UPDATE OF nda_signed, contract_signed ON account_provisioning
    FOR EACH ROW EXECUTE FUNCTION fn_account_provisioning_unlock();

-- Auto-update orientation_programs.overall_pct from module completion
CREATE OR REPLACE FUNCTION fn_orientation_pct_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE orientation_programs SET overall_pct = (
        SELECT ROUND(COUNT(*) FILTER (WHERE status='completed')::NUMERIC / NULLIF(COUNT(*),0) * 100)
        FROM orientation_modules WHERE orientation_program_id = NEW.orientation_program_id
    ) WHERE id = NEW.orientation_program_id;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_orientation_pct
    AFTER INSERT OR UPDATE OF status ON orientation_modules
    FOR EACH ROW EXECUTE FUNCTION fn_orientation_pct_update();

-- ================================================================
-- VIEWS
-- ================================================================

-- Unified Employee Joining checklist (all 9 modules in one row per employee)
CREATE OR REPLACE VIEW v_employee_joining_overview AS
SELECT
    ee.code, ee.full_name,
    ds.status                       AS signature_status,
    nda.status                       AS nda_status,
    ap.trigger_status                AS account_status,
    aa.signed_receipt                 AS asset_receipt_signed,
    ba.status                          AS buddy_status,
    op.overall_pct                      AS orientation_pct,
    ee.company_id
FROM employee_enrollments ee
LEFT JOIN digital_signatures ds      ON ds.enrollment_id = ee.id
LEFT JOIN nda_acknowledgments nda    ON nda.enrollment_id = ee.id
LEFT JOIN account_provisioning ap    ON ap.enrollment_id = ee.id
LEFT JOIN asset_allocations aa       ON aa.enrollment_id = ee.id
LEFT JOIN buddy_assignments ba       ON ba.enrollment_id = ee.id
LEFT JOIN orientation_programs op    ON op.enrollment_id = ee.id
WHERE NOT ee.is_deleted;

-- LA2074 mandatory orientation compliance
CREATE OR REPLACE VIEW v_la2074_orientation_compliance AS
SELECT
    op.employee_name, om.title, om.la2074_section, om.status,
    op.company_id
FROM orientation_modules om
JOIN orientation_programs op ON om.orientation_program_id = op.id
WHERE om.is_la2074_mandatory
ORDER BY om.status, op.employee_name;

-- NDA blocking queue (HR action needed)
CREATE OR REPLACE VIEW v_nda_blocking_queue AS
SELECT employee_name, department, sensitivity_level, created_at, company_id
FROM nda_acknowledgments
WHERE blocks_progression AND NOT is_deleted
ORDER BY sensitivity_level DESC, created_at ASC;
