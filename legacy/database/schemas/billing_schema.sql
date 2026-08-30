-- FILE: database/schemas/billing_schema.sql
-- Billing, subscription, invoice, and audit tables for eLogix HRMS SaaS

-- Subscription plans per tenant
CREATE TABLE IF NOT EXISTS subscriptions (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan            VARCHAR(50)  NOT NULL DEFAULT 'trial',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    trial_ends_at   TIMESTAMP,
    billing_cycle   VARCHAR(20)  DEFAULT 'monthly',
    price_per_head  INTEGER      DEFAULT 0,
    max_employees   INTEGER      DEFAULT 50,
    storage_gb      INTEGER      DEFAULT 10,
    ai_req_limit    INTEGER      DEFAULT 100,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (company_id)
);

-- Monthly invoices per tenant
CREATE TABLE IF NOT EXISTS invoices (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number  VARCHAR(20)  NOT NULL UNIQUE,
    period_month    VARCHAR(7)   NOT NULL,        -- e.g. '2026-07'
    employee_count  INTEGER      DEFAULT 0,
    subtotal_npr    INTEGER      DEFAULT 0,
    vat_npr         INTEGER      DEFAULT 0,
    total_npr       INTEGER      DEFAULT 0,
    status          VARCHAR(20)  DEFAULT 'pending',
    due_date        TIMESTAMP,
    paid_at         TIMESTAMP,
    payment_method  VARCHAR(50),
    payment_ref     VARCHAR(100),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Usage tracking per tenant per month
CREATE TABLE IF NOT EXISTS usage_logs (
    id           SERIAL PRIMARY KEY,
    company_id   INTEGER     NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature      VARCHAR(50) NOT NULL,
    count        INTEGER     DEFAULT 1,
    month        VARCHAR(7)  NOT NULL,
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, feature, month)
);

-- Audit log — all important actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id           SERIAL PRIMARY KEY,
    company_id   INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id      INTEGER,
    user_email   VARCHAR(255),
    action       VARCHAR(100) NOT NULL,
    resource     VARCHAR(100),
    resource_id  INTEGER,
    old_values   TEXT,
    new_values   TEXT,
    ip_address   VARCHAR(45),
    user_agent   VARCHAR(500),
    status       VARCHAR(20)  DEFAULT 'success',
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company      ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_audit_company_date    ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action          ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_usage_company_month   ON usage_logs(company_id, month);

-- Seed trial plan for demo company
INSERT INTO subscriptions (company_id, plan, status, trial_ends_at, max_employees, storage_gb, ai_req_limit)
    SELECT 1, 'trial', 'active', NOW() + INTERVAL '30 days', 50, 10, 200
    WHERE EXISTS (SELECT 1 FROM companies WHERE id = 1)
    ON CONFLICT (company_id) DO NOTHING;
