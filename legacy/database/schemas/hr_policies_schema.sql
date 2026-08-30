-- ============================================================
-- FILE: database/schemas/hr_policies_schema.sql
-- PURPOSE: Complete PostgreSQL schema for HR Policy Management
--          System with acknowledgment tracking, version control,
--          AI-driven reminders, and compliance logging
-- COMPLIANCE: ISO 27001, GDPR, Nepal Privacy Act 2018
-- ============================================================

-- ── Enable UUID extension ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ============================================================
-- TABLE 1: hr_policy_categories
-- PURPOSE: Groups policies into logical sections
-- ============================================================
CREATE TABLE hr_policy_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,                    -- multi-tenant
    code            VARCHAR(20) NOT NULL,              -- e.g. "EMP", "WBP"
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),                       -- emoji or icon name
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, code)
);

-- Seed data: 7 main categories
COMMENT ON TABLE hr_policy_categories IS
'HR Policy categories: Employment, Workplace Behavior, Recruitment, Safety, Conduct, Leave, Workplace Relations, Learning';

-- ============================================================
-- TABLE 2: hr_policies
-- PURPOSE: Master policy table - all HR policies
-- ============================================================
CREATE TABLE hr_policies (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,

    -- Document Control
    control_number      VARCHAR(30) NOT NULL,          -- e.g. "POL-EMP-001"
    category_id         UUID REFERENCES hr_policy_categories(id),

    -- Policy Identity
    title               VARCHAR(200) NOT NULL,
    slug                VARCHAR(200) NOT NULL,          -- URL-friendly
    purpose             TEXT NOT NULL,
    scope               TEXT NOT NULL,                 -- who it applies to
    policy_statement    TEXT NOT NULL,                 -- core rules
    procedures          TEXT,                          -- step-by-step
    responsibilities    JSONB,                         -- {employee:[], manager:[], hr:[]}
    related_policies    UUID[],                        -- FK to other policies
    local_law_alignment JSONB,                         -- {nepal:{}, india:{}, uk:{}, eu:{}, usa:{}}

    -- Version Control
    version             VARCHAR(10) NOT NULL DEFAULT '1.0',
    version_notes       TEXT,
    is_current_version  BOOLEAN DEFAULT true,
    parent_policy_id    UUID REFERENCES hr_policies(id), -- previous version

    -- Status
    status              VARCHAR(20) DEFAULT 'draft'
                        CHECK (status IN ('draft','review','approved','published','archived')),
    is_mandatory        BOOLEAN DEFAULT true,           -- must be read
    is_active           BOOLEAN DEFAULT true,

    -- Blocking Rules
    blocks_salary       BOOLEAN DEFAULT true,           -- blocks salary if unread
    blocks_promotion    BOOLEAN DEFAULT true,
    blocks_transactions BOOLEAN DEFAULT true,

    -- Scope targeting
    applies_to_roles    VARCHAR(50)[],                  -- ['employee','manager','all']
    applies_to_countries VARCHAR(10)[],                 -- ['NP','IN','GB','US']
    applies_to_depts    UUID[],                         -- specific departments

    -- Content
    content_html        TEXT,                           -- rich text content
    content_plain       TEXT,                           -- plain text for AI
    attachments         JSONB,                          -- [{name, url, type}]
    estimated_read_mins INTEGER DEFAULT 5,

    -- Approval
    approved_by         UUID,                           -- user ID
    approved_by_name    VARCHAR(100),
    approved_by_role    VARCHAR(100),
    approved_at         TIMESTAMPTZ,
    review_date         DATE NOT NULL,
    next_review_date    DATE,

    -- AI
    ai_summary          TEXT,                           -- AI-generated summary
    ai_key_points       JSONB,                          -- AI-extracted key points
    ai_last_updated     TIMESTAMPTZ,

    -- Timestamps
    published_at        TIMESTAMPTZ,
    created_by          UUID,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, control_number, version)
);

CREATE INDEX idx_policies_tenant    ON hr_policies(tenant_id);
CREATE INDEX idx_policies_status    ON hr_policies(status);
CREATE INDEX idx_policies_mandatory ON hr_policies(is_mandatory);
CREATE INDEX idx_policies_search    ON hr_policies USING gin(to_tsvector('english', title || ' ' || COALESCE(content_plain,'')));

-- ============================================================
-- TABLE 3: hr_policy_acknowledgments
-- PURPOSE: Tracks who read/signed each policy
--          CORE COMPLIANCE TABLE
-- ============================================================
CREATE TABLE hr_policy_acknowledgments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,
    policy_id           UUID NOT NULL REFERENCES hr_policies(id),
    employee_id         UUID NOT NULL,
    policy_version      VARCHAR(10) NOT NULL,

    -- Reading Tracking
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending','opened','reading','completed','signed','overdue')),
    opened_at           TIMESTAMPTZ,
    reading_started_at  TIMESTAMPTZ,
    reading_completed_at TIMESTAMPTZ,
    signed_at           TIMESTAMPTZ,
    time_spent_seconds  INTEGER DEFAULT 0,
    scroll_pct_reached  INTEGER DEFAULT 0,             -- how far they scrolled (0-100)
    pages_read          INTEGER DEFAULT 0,

    -- Digital Signature
    signature_text      TEXT,                          -- "I have read and agree"
    signature_ip        INET,
    signature_device    VARCHAR(200),
    signature_hash      VARCHAR(64),                   -- SHA-256 of signature data

    -- Reminders
    reminder_count      INTEGER DEFAULT 0,
    last_reminder_at    TIMESTAMPTZ,
    next_reminder_at    TIMESTAMPTZ,

    -- AI Quiz (optional)
    quiz_attempted      BOOLEAN DEFAULT false,
    quiz_score          INTEGER,
    quiz_passed         BOOLEAN,

    -- Metadata
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (tenant_id, policy_id, employee_id, policy_version)
);

CREATE INDEX idx_ack_employee   ON hr_policy_acknowledgments(employee_id);
CREATE INDEX idx_ack_policy     ON hr_policy_acknowledgments(policy_id);
CREATE INDEX idx_ack_status     ON hr_policy_acknowledgments(status);
CREATE INDEX idx_ack_tenant     ON hr_policy_acknowledgments(tenant_id);

-- ============================================================
-- TABLE 4: hr_policy_read_log
-- PURPOSE: Detailed audit trail of every read event
--          Required for ISO 27001 / SOC 2 compliance
-- ============================================================
CREATE TABLE hr_policy_read_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    acknowledgment_id UUID REFERENCES hr_policy_acknowledgments(id),
    employee_id     UUID NOT NULL,
    policy_id       UUID NOT NULL,

    event_type      VARCHAR(30) NOT NULL
                    CHECK (event_type IN (
                        'opened','scroll_update','reading_complete',
                        'signed','reminder_sent','overdue_flagged',
                        'quiz_started','quiz_completed','reopened'
                    )),
    event_data      JSONB,                             -- {scroll_pct, time_spent, page, etc}
    ip_address      INET,
    user_agent      TEXT,
    session_id      VARCHAR(100),

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_read_log_employee ON hr_policy_read_log(employee_id);
CREATE INDEX idx_read_log_policy   ON hr_policy_read_log(policy_id);
CREATE INDEX idx_read_log_tenant   ON hr_policy_read_log(tenant_id);
CREATE INDEX idx_read_log_date     ON hr_policy_read_log(created_at);

-- ============================================================
-- TABLE 5: hr_policy_transaction_blocks
-- PURPOSE: Records when a transaction was blocked due to
--          unread policies — audit trail
-- ============================================================
CREATE TABLE hr_policy_transaction_blocks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    employee_id     UUID NOT NULL,
    blocked_by      UUID NOT NULL REFERENCES hr_policies(id),

    transaction_type VARCHAR(50) NOT NULL,             -- 'salary','promotion','leave_request'
    transaction_data JSONB,                            -- details of what was blocked
    blocked_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,                       -- when they read & unblocked
    resolved_by     UUID,                              -- employee who resolved

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 6: hr_policy_versions
-- PURPOSE: Full version history archive
-- ============================================================
CREATE TABLE hr_policy_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id       UUID NOT NULL REFERENCES hr_policies(id),
    version         VARCHAR(10) NOT NULL,
    content_html    TEXT,
    content_plain   TEXT,
    change_summary  TEXT,
    changed_by      UUID,
    changed_by_name VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 7: hr_policy_ai_interactions
-- PURPOSE: AI chatbot interactions about policies
-- ============================================================
CREATE TABLE hr_policy_ai_interactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    employee_id     UUID NOT NULL,
    policy_id       UUID REFERENCES hr_policies(id),

    question        TEXT NOT NULL,
    ai_response     TEXT NOT NULL,
    helpful         BOOLEAN,                           -- user feedback
    session_id      VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIEWS for reporting
-- ============================================================

-- View: Policy compliance summary per employee
CREATE OR REPLACE VIEW v_employee_policy_compliance AS
SELECT
    e.tenant_id,
    e.id AS employee_id,
    e.full_name,
    e.department,
    e.role,
    COUNT(p.id) AS total_policies,
    COUNT(a.id) FILTER (WHERE a.status = 'signed') AS signed_count,
    COUNT(a.id) FILTER (WHERE a.status IN ('pending','overdue')) AS pending_count,
    COUNT(a.id) FILTER (WHERE a.status = 'overdue') AS overdue_count,
    ROUND(
        COUNT(a.id) FILTER (WHERE a.status = 'signed') * 100.0 /
        NULLIF(COUNT(p.id), 0), 1
    ) AS compliance_pct,
    BOOL_AND(a.status = 'signed') AS fully_compliant,
    MIN(a.next_reminder_at) AS next_reminder_due
FROM employees e
CROSS JOIN hr_policies p
LEFT JOIN hr_policy_acknowledgments a
    ON a.employee_id = e.id AND a.policy_id = p.id AND a.policy_version = p.version
WHERE p.is_mandatory = true AND p.status = 'published' AND p.is_current_version = true
    AND p.tenant_id = e.tenant_id
GROUP BY e.tenant_id, e.id, e.full_name, e.department, e.role;

-- View: Policy acknowledgment status (per policy)
CREATE OR REPLACE VIEW v_policy_acknowledgment_summary AS
SELECT
    p.tenant_id,
    p.id AS policy_id,
    p.control_number,
    p.title,
    p.version,
    COUNT(a.id) AS total_assigned,
    COUNT(a.id) FILTER (WHERE a.status = 'signed') AS signed_count,
    COUNT(a.id) FILTER (WHERE a.status = 'overdue') AS overdue_count,
    ROUND(
        COUNT(a.id) FILTER (WHERE a.status = 'signed') * 100.0 /
        NULLIF(COUNT(a.id), 0), 1
    ) AS completion_pct,
    p.next_review_date,
    p.next_review_date <= CURRENT_DATE + INTERVAL '30 days' AS review_due_soon
FROM hr_policies p
LEFT JOIN hr_policy_acknowledgments a ON a.policy_id = p.id
WHERE p.is_current_version = true
GROUP BY p.tenant_id, p.id, p.control_number, p.title, p.version, p.next_review_date;

-- ============================================================
-- FUNCTION: Check if employee can perform a transaction
-- ============================================================
CREATE OR REPLACE FUNCTION fn_can_employee_transact(
    p_tenant_id UUID,
    p_employee_id UUID,
    p_transaction_type VARCHAR
) RETURNS TABLE (
    can_transact BOOLEAN,
    blocking_policies JSONB,
    message TEXT
) AS $$
DECLARE
    v_unread_policies JSONB;
    v_count INTEGER;
BEGIN
    -- Find mandatory unread policies that block this transaction type
    SELECT
        jsonb_agg(jsonb_build_object(
            'id', p.id,
            'control_number', p.control_number,
            'title', p.title,
            'category', pc.name
        )),
        COUNT(*)
    INTO v_unread_policies, v_count
    FROM hr_policies p
    JOIN hr_policy_categories pc ON pc.id = p.category_id
    WHERE p.tenant_id = p_tenant_id
      AND p.is_mandatory = true
      AND p.status = 'published'
      AND p.is_current_version = true
      AND (
          CASE p_transaction_type
              WHEN 'salary'    THEN p.blocks_salary = true
              WHEN 'promotion' THEN p.blocks_promotion = true
              ELSE p.blocks_transactions = true
          END
      )
      AND NOT EXISTS (
          SELECT 1 FROM hr_policy_acknowledgments a
          WHERE a.policy_id = p.id
            AND a.employee_id = p_employee_id
            AND a.status = 'signed'
            AND a.policy_version = p.version
      );

    RETURN QUERY SELECT
        v_count = 0,
        COALESCE(v_unread_policies, '[]'::jsonb),
        CASE
            WHEN v_count = 0 THEN 'All mandatory HR policies read and acknowledged.'
            ELSE format('Cannot process: %s unread mandatory HR polic%s must be acknowledged first.',
                v_count, CASE WHEN v_count = 1 THEN 'y' ELSE 'ies' END)
        END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Mark policy as overdue (called by scheduler)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_flag_overdue_policies() RETURNS void AS $$
BEGIN
    UPDATE hr_policy_acknowledgments
    SET status = 'overdue', updated_at = NOW()
    WHERE status IN ('pending', 'opened', 'reading')
      AND next_reminder_at < NOW()
      AND signed_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED DATA: Policy Categories
-- ============================================================
-- (Run after tenant is created with real tenant_id)
-- INSERT INTO hr_policy_categories (tenant_id, code, name, icon, display_order) VALUES
-- ('{tenant_id}', 'EMP',  'Employment Policies',              '📋', 1),
-- ('{tenant_id}', 'WBP',  'Workplace Behavior Policies',      '🤝', 2),
-- ('{tenant_id}', 'RCP',  'Recruitment & Compensation',       '💰', 3),
-- ('{tenant_id}', 'SCP',  'Safety & Compliance',              '🛡️', 4),
-- ('{tenant_id}', 'ECA',  'Employee Conduct & Attendance',    '📅', 5),
-- ('{tenant_id}', 'LWS',  'Leave & Work Schedule',            '🏖️', 6),
-- ('{tenant_id}', 'WRT',  'Workplace Relations & Technology', '💻', 7),
-- ('{tenant_id}', 'LDP',  'Learning & Development',           '🎓', 8);
