-- FILE: backend/database/saas_schema.sql
-- eLogix HRMS — Complete PostgreSQL Schema
-- Multi-tenant SaaS: every table has company_id FK for row-level isolation
-- eLogix Technologies · www.elogix.com.np

-- ═══════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fast ILIKE search

-- ═══════════════════════════════════════════════════════════════
-- 1. ELOGIX SAAS CONTROL (SuperAdmin level — no company_id)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS elogix_admins (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(50) DEFAULT 'elogix_superadmin',
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_companies (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(100) UNIQUE NOT NULL,          -- e.g. 'himalayan', 'abasar'
    name            VARCHAR(255) NOT NULL,
    legal_name      VARCHAR(255),
    pan_number      VARCHAR(50),
    vat_number      VARCHAR(50),
    industry        VARCHAR(100),
    business_type   VARCHAR(80) DEFAULT 'custom',          -- matches tenantPermissions.js keys
    plan            VARCHAR(50) DEFAULT 'trial',           -- trial|starter|growth|business|enterprise|unlimited
    status          VARCHAR(30) DEFAULT 'pending',         -- pending|active|suspended|trial|dissolved
    max_employees   INTEGER DEFAULT 10,
    country         VARCHAR(80) DEFAULT 'Nepal',
    currency        VARCHAR(10) DEFAULT 'NPR',
    timezone        VARCHAR(50) DEFAULT 'Asia/Kathmandu',
    fiscal_year_start_month INTEGER DEFAULT 4,             -- Baisakh = 4
    calendar_type   VARCHAR(20) DEFAULT 'bikram_sambat',
    portal_url      VARCHAR(255),
    logo_url        TEXT,
    primary_color   VARCHAR(7) DEFAULT '#0369a1',
    admin_email     VARCHAR(255),
    phone           VARCHAR(30),
    address_line1   VARCHAR(255),
    address_line2   VARCHAR(255),
    city            VARCHAR(100),
    district        VARCHAR(100),
    province        VARCHAR(100),
    postal_code     VARCHAR(20),
    plan_expires_at TIMESTAMPTZ,
    trial_ends_at   TIMESTAMPTZ,
    approved_at     TIMESTAMPTZ,
    approved_by     VARCHAR(100),
    suspended_at    TIMESTAMPTZ,
    suspended_reason TEXT,
    modules         JSONB DEFAULT '[]',                    -- admin-granted module overrides
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_slug    ON tenant_companies(slug);
CREATE INDEX idx_tenant_status  ON tenant_companies(status);
CREATE INDEX idx_tenant_plan    ON tenant_companies(plan);

CREATE TABLE IF NOT EXISTS tenant_module_permissions (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES tenant_companies(id) ON DELETE CASCADE,
    modules         JSONB NOT NULL DEFAULT '[]',           -- granted module keys
    granted_by      VARCHAR(100) DEFAULT 'elogix_superadmin',
    granted_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS saas_invoices (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES tenant_companies(id),
    invoice_number  VARCHAR(50) UNIQUE,
    period_month    VARCHAR(10),                            -- '2026-08'
    amount_npr      NUMERIC(12,2) DEFAULT 0,
    status          VARCHAR(30) DEFAULT 'pending',         -- pending|paid|overdue
    due_date        DATE,
    paid_at         TIMESTAMPTZ,
    payment_ref     VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saas_audit_log (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES tenant_companies(id),
    performed_by    VARCHAR(100),
    action          VARCHAR(100),
    resource        VARCHAR(100),
    resource_id     VARCHAR(100),
    details         JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. USERS & AUTH (tenant-scoped)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_users (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    emp_id          VARCHAR(50),                           -- ELX-XXXX-0001
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(30),
    password_hash   TEXT,
    role            VARCHAR(80) DEFAULT 'employee',
    level           INTEGER DEFAULT 10,                    -- 1=superadmin, 10=employee
    department_id   INTEGER,
    branch_id       INTEGER,
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email),
    UNIQUE(company_id, emp_id)
);

CREATE INDEX idx_users_company ON company_users(company_id);
CREATE INDEX idx_users_email   ON company_users(company_id, email);
CREATE INDEX idx_users_role    ON company_users(company_id, role);

-- ═══════════════════════════════════════════════════════════════
-- 3. ORGANISATION STRUCTURE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS departments (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    code            VARCHAR(50),
    parent_id       INTEGER REFERENCES departments(id),
    head_user_id    INTEGER REFERENCES company_users(id),
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS designations (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    grade           VARCHAR(50),
    department_id   INTEGER REFERENCES departments(id),
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS branches (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    code            VARCHAR(50),
    address         TEXT,
    city            VARCHAR(100),
    district        VARCHAR(100),
    province        VARCHAR(100),
    is_head_office  BOOLEAN DEFAULT FALSE,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- ═══════════════════════════════════════════════════════════════
-- 4. EMPLOYEES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS employees (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    emp_code            VARCHAR(50),                       -- ELX-XXXX-0001
    user_id             INTEGER REFERENCES company_users(id),
    full_name           VARCHAR(150) NOT NULL,
    first_name          VARCHAR(80),
    last_name           VARCHAR(80),
    email               VARCHAR(255),
    phone               VARCHAR(30),
    gender              VARCHAR(20),
    dob_eng             DATE,
    dob_nep             VARCHAR(20),
    blood_group         VARCHAR(10),
    marital_status      VARCHAR(20),
    nationality         VARCHAR(50) DEFAULT 'Nepali',
    citizenship_no      VARCHAR(50),
    pan_no              VARCHAR(50),
    ssf_no              VARCHAR(50),
    department_id       INTEGER REFERENCES departments(id),
    designation_id      INTEGER REFERENCES designations(id),
    branch_id           INTEGER REFERENCES branches(id),
    reporting_to        INTEGER REFERENCES employees(id),
    employment_type     VARCHAR(50) DEFAULT 'permanent',   -- permanent|contract|intern|outsource
    join_date           DATE,
    confirm_date        DATE,
    status              VARCHAR(30) DEFAULT 'active',      -- active|probation|inactive|terminated
    current_address     TEXT,
    permanent_address   TEXT,
    emergency_contact   VARCHAR(150),
    emergency_phone     VARCHAR(30),
    profile_photo_url   TEXT,
    documents           JSONB DEFAULT '{}',
    custom_fields       JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, emp_code)
);

CREATE INDEX idx_employees_company    ON employees(company_id);
CREATE INDEX idx_employees_dept       ON employees(company_id, department_id);
CREATE INDEX idx_employees_status     ON employees(company_id, status);
CREATE INDEX idx_employees_name       ON employees USING gin(full_name gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════
-- 5. RECRUITMENT — APPLICANT STATUS & VACANCY STATUS
-- (These back the ApplicantStatusPage.jsx and VacancyStatusPage.jsx)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vacancies (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    vacancy_code        VARCHAR(50),                       -- AV-26080008
    client_company_name VARCHAR(255) NOT NULL,             -- client company (for agencies) or own company
    client_address      VARCHAR(255),
    position            VARCHAR(200) NOT NULL,
    no_of_vacancy       INTEGER DEFAULT 1,
    assigned_to         VARCHAR(150),
    assigned_user_id    INTEGER REFERENCES company_users(id),
    status              VARCHAR(50) DEFAULT 'Open',        -- Open|WIP|Pending|Hold|Closed|Dissolved|Client Fulfilled
    level               VARCHAR(10),                       -- L1-L12
    month               INTEGER,                           -- Nepali calendar month
    opening_date        DATE DEFAULT CURRENT_DATE,
    closed_date         DATE,
    timeline_days       INTEGER,                           -- days vacancy has been open
    -- Recruitment Funnel Counts (auto-updated by triggers)
    total_leads         INTEGER DEFAULT 0,
    follow_up_count     INTEGER DEFAULT 0,
    shortlist_count     INTEGER DEFAULT 0,
    interview_count     INTEGER DEFAULT 0,
    onboard_count       INTEGER DEFAULT 0,
    client_fulfilled    INTEGER DEFAULT 0,
    conversion_pct      NUMERIC(5,2) DEFAULT 0,
    remarks             TEXT,
    created_by          INTEGER REFERENCES company_users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, vacancy_code)
);

CREATE INDEX idx_vacancies_company ON vacancies(company_id);
CREATE INDEX idx_vacancies_status  ON vacancies(company_id, status);
CREATE INDEX idx_vacancies_code    ON vacancies(company_id, vacancy_code);

CREATE TABLE IF NOT EXISTS applicants (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    candidate_code      VARCHAR(50),                       -- AL-830001
    vacancy_id          INTEGER REFERENCES vacancies(id),
    vacancy_code        VARCHAR(50),
    pooled_by           VARCHAR(150),                      -- recruiter name
    pooled_by_user_id   INTEGER REFERENCES company_users(id),
    candidate_name      VARCHAR(200) NOT NULL,
    contact             VARCHAR(30),
    email               VARCHAR(255),
    position            VARCHAR(200),
    current_address     TEXT,
    permanent_address   TEXT,
    preferred_location  VARCHAR(200),
    dob_eng             DATE,
    dob_nep             VARCHAR(20),
    age                 INTEGER,
    qualification       VARCHAR(200),
    skills              TEXT,
    experience          TEXT,                              -- JSON array or text
    working_status      VARCHAR(50),                       -- Employed|Resigned|Fresher
    reason_leaving      TEXT,
    salary_expectation  VARCHAR(50),
    vehicle             VARCHAR(10),                       -- Yes|No
    driving_license     VARCHAR(10),
    citizenship         VARCHAR(10),
    abroad_planning     VARCHAR(10),
    status              VARCHAR(80) DEFAULT 'New Lead',    -- matches STATUS_COLORS keys
    leads_entry_date    DATE DEFAULT CURRENT_DATE,
    follow_up_date      DATE,
    call_description    TEXT,
    interview_date      DATE,
    doj                 DATE,                              -- Date of Join
    client              VARCHAR(200),
    location            VARCHAR(200),
    post                VARCHAR(200),
    followup_count      INTEGER DEFAULT 0,
    cv_link             TEXT,
    month               VARCHAR(50),
    source              VARCHAR(80),                       -- Facebook|LinkedIn|etc.
    remarks             TEXT,
    created_by          INTEGER REFERENCES company_users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, candidate_code)
);

CREATE INDEX idx_applicants_company  ON applicants(company_id);
CREATE INDEX idx_applicants_status   ON applicants(company_id, status);
CREATE INDEX idx_applicants_vacancy  ON applicants(company_id, vacancy_id);
CREATE INDEX idx_applicants_name     ON applicants USING gin(candidate_name gin_trgm_ops);
CREATE INDEX idx_applicants_code     ON applicants(company_id, candidate_code);
CREATE INDEX idx_applicants_source   ON applicants(company_id, source);

-- Auto-update vacancy funnel counts when applicant status changes
CREATE OR REPLACE FUNCTION update_vacancy_funnel()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.vacancy_id IS NOT NULL OR NEW.vacancy_id IS NOT NULL THEN
        UPDATE vacancies v
        SET
            total_leads      = (SELECT COUNT(*) FROM applicants WHERE vacancy_id = v.id AND company_id = v.company_id),
            interview_count  = (SELECT COUNT(*) FROM applicants WHERE vacancy_id = v.id AND company_id = v.company_id AND status IN ('Interviewed','Client Side Interview','First Round Interview')),
            onboard_count    = (SELECT COUNT(*) FROM applicants WHERE vacancy_id = v.id AND company_id = v.company_id AND status = 'On-board'),
            timeline_days    = CASE WHEN v.closed_date IS NOT NULL THEN (v.closed_date - v.opening_date) ELSE (CURRENT_DATE - v.opening_date) END,
            conversion_pct   = CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'On-board')::NUMERIC / COUNT(*)::NUMERIC * 100), 2) ELSE 0 END,
            updated_at       = NOW()
        FROM applicants a
        WHERE v.id = COALESCE(NEW.vacancy_id, OLD.vacancy_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vacancy_funnel ON applicants;
CREATE TRIGGER trg_vacancy_funnel
AFTER INSERT OR UPDATE OR DELETE ON applicants
FOR EACH ROW EXECUTE FUNCTION update_vacancy_funnel();

-- ═══════════════════════════════════════════════════════════════
-- 6. ATTENDANCE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attendance_logs (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id),
    employee_id     INTEGER NOT NULL REFERENCES employees(id),
    log_date        DATE NOT NULL,
    check_in        TIMESTAMPTZ,
    check_out       TIMESTAMPTZ,
    source          VARCHAR(30) DEFAULT 'manual',          -- biometric|web|mobile|manual
    status          VARCHAR(30) DEFAULT 'present',         -- present|absent|late|half_day
    remarks         TEXT,
    approved_by     INTEGER REFERENCES employees(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, employee_id, log_date)
);

CREATE INDEX idx_att_company_date ON attendance_logs(company_id, log_date);
CREATE INDEX idx_att_employee     ON attendance_logs(company_id, employee_id, log_date);

-- ═══════════════════════════════════════════════════════════════
-- 7. LEAVE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leave_types (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES tenant_companies(id),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20),
    days_allowed INTEGER DEFAULT 0,
    is_paid     BOOLEAN DEFAULT TRUE,
    status      VARCHAR(20) DEFAULT 'active',
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id),
    employee_id     INTEGER NOT NULL REFERENCES employees(id),
    leave_type_id   INTEGER REFERENCES leave_types(id),
    from_date       DATE NOT NULL,
    to_date         DATE NOT NULL,
    days            NUMERIC(4,1),
    reason          TEXT,
    status          VARCHAR(30) DEFAULT 'pending',         -- pending|approved|rejected|cancelled
    approved_by     INTEGER REFERENCES employees(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 8. PAYROLL
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS salary_structures (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id),
    name            VARCHAR(100) NOT NULL,
    basic_pct       NUMERIC(5,2) DEFAULT 60,               -- % of gross
    hra_pct         NUMERIC(5,2) DEFAULT 20,
    ta_pct          NUMERIC(5,2) DEFAULT 10,
    ssf_employee    NUMERIC(5,2) DEFAULT 11,               -- SSF employee contribution %
    ssf_employer    NUMERIC(5,2) DEFAULT 20,               -- SSF employer contribution %
    pf_employee     NUMERIC(5,2) DEFAULT 10,
    pf_employer     NUMERIC(5,2) DEFAULT 10,
    status          VARCHAR(20) DEFAULT 'active',
    UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id),
    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,
    total_gross     NUMERIC(14,2) DEFAULT 0,
    total_deductions NUMERIC(14,2) DEFAULT 0,
    total_net       NUMERIC(14,2) DEFAULT 0,
    status          VARCHAR(30) DEFAULT 'draft',           -- draft|approved|paid
    run_by          INTEGER REFERENCES company_users(id),
    approved_by     INTEGER REFERENCES company_users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, month, year)
);

CREATE TABLE IF NOT EXISTS payslips (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id),
    payroll_run_id  INTEGER REFERENCES payroll_runs(id),
    employee_id     INTEGER NOT NULL REFERENCES employees(id),
    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,
    basic           NUMERIC(12,2) DEFAULT 0,
    hra             NUMERIC(12,2) DEFAULT 0,
    ta              NUMERIC(12,2) DEFAULT 0,
    gross           NUMERIC(12,2) DEFAULT 0,
    ssf             NUMERIC(12,2) DEFAULT 0,
    pf              NUMERIC(12,2) DEFAULT 0,
    tax             NUMERIC(12,2) DEFAULT 0,
    total_deduction NUMERIC(12,2) DEFAULT 0,
    net_pay         NUMERIC(12,2) DEFAULT 0,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, employee_id, month, year)
);

-- ═══════════════════════════════════════════════════════════════
-- 9. DOCUMENT STORAGE (tracks uploaded files per tenant)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_documents (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    entity_type     VARCHAR(50),                           -- employee|applicant|company|vacancy
    entity_id       INTEGER,
    doc_type        VARCHAR(80),                           -- cv|citizenship|certificate|contract|etc.
    file_name       VARCHAR(255),
    file_url        TEXT,                                  -- path on VPS or S3 URL
    file_size_kb    INTEGER,
    mime_type       VARCHAR(80),
    uploaded_by     INTEGER REFERENCES company_users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_docs_entity ON company_documents(company_id, entity_type, entity_id);

-- ═══════════════════════════════════════════════════════════════
-- 10. ROW-LEVEL SECURITY (RLS) — tenant isolation at DB level
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tenant tables
ALTER TABLE employees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips             ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches             ENABLE ROW LEVEL SECURITY;

-- RLS Policy: each query can only see rows where company_id matches current_setting
-- The backend sets this per-request in middleware/tenant.py:
--   db.session.execute(f"SET app.current_company_id = '{company_id}'")

CREATE POLICY tenant_isolation_employees ON employees
    USING (company_id = current_setting('app.current_company_id', TRUE)::INTEGER);

CREATE POLICY tenant_isolation_applicants ON applicants
    USING (company_id = current_setting('app.current_company_id', TRUE)::INTEGER);

CREATE POLICY tenant_isolation_vacancies ON vacancies
    USING (company_id = current_setting('app.current_company_id', TRUE)::INTEGER);

CREATE POLICY tenant_isolation_attendance ON attendance_logs
    USING (company_id = current_setting('app.current_company_id', TRUE)::INTEGER);

CREATE POLICY tenant_isolation_leave ON leave_requests
    USING (company_id = current_setting('app.current_company_id', TRUE)::INTEGER);

CREATE POLICY tenant_isolation_payroll ON payroll_runs
    USING (company_id = current_setting('app.current_company_id', TRUE)::INTEGER);

CREATE POLICY tenant_isolation_payslips ON payslips
    USING (company_id = current_setting('app.current_company_id', TRUE)::INTEGER);

CREATE POLICY tenant_isolation_docs ON company_documents
    USING (company_id = current_setting('app.current_company_id', TRUE)::INTEGER);

-- ═══════════════════════════════════════════════════════════════
-- 11. TENANT STORAGE DIRECTORIES
-- Each tenant gets their own directory on the VPS:
--   /var/www/elogix/uploads/{slug}/
--     ├── employees/     — employee photos, documents
--     ├── applicants/    — CVs, certificates
--     ├── company/       — logo, policy docs
--     └── exports/       — generated reports, CSV exports
-- ═══════════════════════════════════════════════════════════════

-- Tracked via company_documents table above.
-- Physical directory creation happens in saas/tenant_provisioner.py.

-- ═══════════════════════════════════════════════════════════════
-- ALEMBIC VERSION TABLE (Alembic manages migrations)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Seed the version so Alembic knows the DB is initialized
INSERT INTO alembic_version (version_num) VALUES ('elogix_initial_001')
ON CONFLICT DO NOTHING;
