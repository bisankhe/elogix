-- ============================================================
--  eLogix HRMS — Complete SaaS Database Schema
--  eLogix Technologies · www.elogix.com.np
--  Run: psql -U elogix_user -d elogix_hrms -f saas_schema.sql
-- ============================================================

-- ══ eLogix Internal Admins ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS elogix_admins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(200) NOT NULL,
    email         VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50) DEFAULT 'support',
    -- elogix_superadmin | sales | support | billing | technical
    is_active     BOOLEAN DEFAULT TRUE,
    mfa_secret    VARCHAR(100),
    mfa_enabled   BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE elogix_admins IS 'eLogix Technologies internal staff only. Separate from all client companies.';

-- ══ Client Companies ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(300) NOT NULL,
    legal_name      VARCHAR(300),
    slug            VARCHAR(100) UNIQUE NOT NULL,
    logo_url        VARCHAR(500),
    industry        VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'Nepal',
    currency        VARCHAR(10)  DEFAULT 'NPR',
    timezone        VARCHAR(50)  DEFAULT 'Asia/Kathmandu',
    language        VARCHAR(10)  DEFAULT 'en',
    address         TEXT,
    phone           VARCHAR(30),
    website         VARCHAR(200),
    pan_number      VARCHAR(50),
    registration_no VARCHAR(100),

    -- Tenant isolation
    schema_name     VARCHAR(100) UNIQUE,
    storage_prefix  VARCHAR(100),
    encryption_key  VARCHAR(255),  -- AES-256 key per tenant, encrypted at rest

    -- Subscription
    plan            VARCHAR(50) DEFAULT 'trial',
    plan_started_at TIMESTAMPTZ,
    plan_expires_at TIMESTAMPTZ,
    trial_ends_at   TIMESTAMPTZ,
    billing_cycle   VARCHAR(20) DEFAULT 'monthly',
    max_employees   INTEGER DEFAULT 10,
    max_storage_gb  INTEGER DEFAULT 5,
    employee_count  INTEGER DEFAULT 0,

    -- Status lifecycle
    status          VARCHAR(30) DEFAULT 'trial',
    -- trial → active → suspended → cancelled → churned | reactivated
    suspended_at    TIMESTAMPTZ,
    suspended_reason TEXT,
    cancelled_at    TIMESTAMPTZ,

    -- eLogix CRM fields
    account_manager VARCHAR(200),
    sales_rep       VARCHAR(200),
    support_tier    VARCHAR(20) DEFAULT 'standard',
    -- standard | priority | dedicated

    -- Nepal compliance
    ssf_rate        NUMERIC(5,4) DEFAULT 0.11,
    cit_rate        NUMERIC(5,4) DEFAULT 0.25,
    labour_law      VARCHAR(100) DEFAULT 'Nepal Labour Act 2074',

    created_by      UUID REFERENCES elogix_admins(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_slug   ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
COMMENT ON TABLE companies IS 'Each row = one eLogix SaaS client. Data strictly isolated by company_id.';
COMMENT ON COLUMN companies.encryption_key IS 'Per-tenant AES-256 encryption key. Encrypted at rest. NEVER logged.';

-- ══ Company Roles ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS company_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    level       INTEGER DEFAULT 5,  -- 1=highest auth, 10=lowest
    is_system   BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_roles_company ON company_roles(company_id);
COMMENT ON COLUMN company_roles.level IS '1=SuperAdmin, 2=Executive, 3=HRManager, 4=HOD/BranchMgr, 5=Officer, 6=Supervisor, 10=Employee';

-- ══ Module Permissions ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS module_permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES company_roles(id) ON DELETE CASCADE,
    module      VARCHAR(100) NOT NULL,
    can_view    BOOLEAN DEFAULT FALSE,
    can_create  BOOLEAN DEFAULT FALSE,
    can_edit    BOOLEAN DEFAULT FALSE,
    can_delete  BOOLEAN DEFAULT FALSE,
    can_approve BOOLEAN DEFAULT FALSE,
    can_export  BOOLEAN DEFAULT FALSE,
    scope       VARCHAR(20) DEFAULT 'all',
    -- all | own_dept | own_branch | own_team | self_only
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, role_id, module)
);
CREATE INDEX IF NOT EXISTS idx_perms_company_role ON module_permissions(company_id, role_id);
COMMENT ON COLUMN module_permissions.scope IS 'Data visibility scope — enforced at query level, not just UI.';

-- ══ Departments ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS departments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(30),
    parent_id   UUID REFERENCES departments(id),
    head_user_id UUID,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, code)
);

-- ══ Branches ══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS branches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(30),
    location    VARCHAR(200),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══ Company Users ═════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS company_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    emp_id          VARCHAR(50),
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(200) NOT NULL,
    phone           VARCHAR(30),
    password_hash   VARCHAR(255) NOT NULL,

    -- Role & hierarchy
    role_id         UUID REFERENCES company_roles(id),
    role_slug       VARCHAR(100) DEFAULT 'employee',
    level           INTEGER DEFAULT 10,
    department_id   UUID REFERENCES departments(id),
    branch_id       UUID REFERENCES branches(id),
    reports_to_id   UUID REFERENCES company_users(id),

    -- Status & security
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    must_change_pw  BOOLEAN DEFAULT TRUE,
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    mfa_secret      VARCHAR(100),
    failed_logins   INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    last_login_ip   VARCHAR(45),
    password_changed_at TIMESTAMPTZ,

    -- Tokens (hashed)
    email_verify_token  VARCHAR(255),
    pw_reset_token      VARCHAR(255),
    pw_reset_expires_at TIMESTAMPTZ,

    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    -- Email unique per company, not globally
    UNIQUE(company_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_company    ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email      ON company_users(company_id, email);
CREATE INDEX IF NOT EXISTS idx_users_dept       ON company_users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role       ON company_users(role_id);
COMMENT ON TABLE company_users IS 'Users are scoped to company_id. Same email can exist in different companies.';
COMMENT ON COLUMN company_users.password_hash IS 'bcrypt rounds=12. NEVER stored in plain text or logs.';

-- ══ Sessions & Token Revocation ════════════════════════════════
CREATE TABLE IF NOT EXISTS user_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    jti         VARCHAR(128) UNIQUE NOT NULL,
    device_info VARCHAR(300),
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(300),
    is_valid    BOOLEAN DEFAULT TRUE,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ,
    revoked_by  UUID
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, is_valid);
CREATE INDEX IF NOT EXISTS idx_sessions_jti  ON user_sessions(jti);

CREATE TABLE IF NOT EXISTS blacklisted_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti         VARCHAR(128) UNIQUE NOT NULL,
    user_id     UUID,
    company_id  UUID,
    revoked_at  TIMESTAMPTZ DEFAULT NOW(),
    reason      VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_blacklist_jti ON blacklisted_tokens(jti);
COMMENT ON TABLE blacklisted_tokens IS 'Revoked JWT tokens. Checked on every request. Cleaned up after token expiry.';

-- ══ Subscriptions ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan            VARCHAR(50) DEFAULT 'trial',
    status          VARCHAR(20) DEFAULT 'active',
    billing_cycle   VARCHAR(20) DEFAULT 'monthly',
    price_npr       INTEGER DEFAULT 0,
    max_employees   INTEGER DEFAULT 10,
    storage_gb      INTEGER DEFAULT 2,
    ai_req_limit    INTEGER DEFAULT 50,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    trial_ends_at   TIMESTAMPTZ,
    auto_renew      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══ Invoices ═════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    invoice_number  VARCHAR(30) UNIQUE NOT NULL,
    period_month    VARCHAR(7) NOT NULL,
    plan            VARCHAR(50),
    employee_count  INTEGER DEFAULT 0,
    subtotal_npr    INTEGER DEFAULT 0,
    vat_pct         NUMERIC(5,2) DEFAULT 13.0,
    vat_npr         INTEGER DEFAULT 0,
    total_npr       INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'pending',
    due_date        TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    payment_method  VARCHAR(50),
    payment_ref     VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id, status);

-- ══ Audit Logs (immutable) ═════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id),
    user_id     UUID,
    user_email  VARCHAR(200),
    user_role   VARCHAR(100),
    action      VARCHAR(200) NOT NULL,
    module      VARCHAR(100),
    resource_id UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(300),
    status      VARCHAR(20) DEFAULT 'success',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs(user_id);
-- Prevent modification of audit logs
CREATE RULE audit_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
COMMENT ON TABLE audit_logs IS 'Immutable. No UPDATE or DELETE allowed. Used for compliance and security.';

-- ══ Notifications ═════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id     UUID,
    type        VARCHAR(50),
    title       VARCHAR(300) NOT NULL,
    message     TEXT NOT NULL,
    channel     VARCHAR(30) DEFAULT 'in_app',
    is_read     BOOLEAN DEFAULT FALSE,
    priority    VARCHAR(20) DEFAULT 'normal',
    action_url  VARCHAR(500),
    sent_at     TIMESTAMPTZ,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══ Support Tickets ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS support_tickets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id),
    user_id     UUID,
    ticket_no   VARCHAR(20) UNIQUE,
    subject     VARCHAR(300) NOT NULL,
    description TEXT,
    priority    VARCHAR(20) DEFAULT 'normal',
    status      VARCHAR(30) DEFAULT 'open',
    category    VARCHAR(100),
    assigned_to UUID REFERENCES elogix_admins(id),
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══ Row Level Security (PostgreSQL RLS) ═══════════════════════
-- Ensure no query can cross company boundaries even if code has a bug
ALTER TABLE company_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions      ENABLE ROW LEVEL SECURITY;

-- App sets current_setting('app.company_id') on connection
CREATE POLICY company_isolation ON company_users
    USING (company_id::text = current_setting('app.company_id', TRUE));
CREATE POLICY company_isolation ON company_roles
    USING (company_id::text = current_setting('app.company_id', TRUE));
CREATE POLICY company_isolation ON module_permissions
    USING (company_id::text = current_setting('app.company_id', TRUE));
CREATE POLICY company_isolation ON departments
    USING (company_id::text = current_setting('app.company_id', TRUE));
CREATE POLICY company_isolation ON invoices
    USING (company_id::text = current_setting('app.company_id', TRUE));
CREATE POLICY company_isolation ON audit_logs
    USING (company_id::text = current_setting('app.company_id', TRUE));
CREATE POLICY company_isolation ON notifications
    USING (company_id::text = current_setting('app.company_id', TRUE));

\echo '✅ eLogix HRMS SaaS schema created with RLS!'
