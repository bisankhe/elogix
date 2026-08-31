-- FILE: database/complete_schema.sql
-- eLogix HRMS — Complete PostgreSQL Database Schema
-- Run this to create ALL tables required by the application
-- Covers: Auth, Employees, Attendance, Leave, Payroll, Recruitment, Performance, HR, SaaS
-- Nepal Labour Act 2074 compliant
-- eLogix Technologies · www.elogix.com.np

-- ══════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ══════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════════════════════════════
-- SAAS: TENANT COMPANIES
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenant_companies (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(50)  UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    plan            VARCHAR(20)  NOT NULL DEFAULT 'trial'
                    CHECK (plan IN ('trial','starter','growth','business','enterprise')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','trial','suspended','rejected')),
    business_type   VARCHAR(100),
    industry        VARCHAR(100),
    admin_email     VARCHAR(200) NOT NULL,
    admin_name      VARCHAR(200),
    phone           VARCHAR(20),
    address         TEXT,
    country         VARCHAR(100) DEFAULT 'Nepal',
    currency        VARCHAR(10)  DEFAULT 'NPR',
    timezone        VARCHAR(50)  DEFAULT 'Asia/Kathmandu',
    logo_url        TEXT,
    website         TEXT,
    employee_limit  INTEGER      DEFAULT 10,
    modules         JSONB        DEFAULT '[]',
    settings        JSONB        DEFAULT '{}',
    approved_at     TIMESTAMPTZ,
    approved_by     VARCHAR(200),
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- AUTH: USERS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES tenant_companies(id) ON DELETE CASCADE,
    email           VARCHAR(200) NOT NULL,
    password_hash   VARCHAR(256) NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'employee',
    is_active       BOOLEAN      DEFAULT TRUE,
    is_verified     BOOLEAN      DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    last_login_ip   VARCHAR(45),
    failed_attempts INTEGER      DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    refresh_token   TEXT,
    otp_secret      VARCHAR(100),
    otp_expires_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE (company_id, email)
);

-- ══════════════════════════════════════════════════════════════════════
-- ORG STRUCTURE
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS departments (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(20),
    parent_id       INTEGER REFERENCES departments(id),
    head_employee_id INTEGER,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS designations (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    level           INTEGER DEFAULT 1,
    department_id   INTEGER REFERENCES departments(id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branch_locations (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(20),
    address         TEXT,
    city            VARCHAR(100),
    province        VARCHAR(100),
    country         VARCHAR(100) DEFAULT 'Nepal',
    phone           VARCHAR(20),
    email           VARCHAR(200),
    is_head_office  BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- EMPLOYEES
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS employees (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    user_id             INTEGER REFERENCES users(id),
    employee_code       VARCHAR(50),
    full_name           VARCHAR(200) NOT NULL,
    email               VARCHAR(200),
    phone               VARCHAR(20),
    gender              VARCHAR(20) CHECK (gender IN ('male','female','other','prefer_not_to_say')),
    date_of_birth       DATE,
    blood_group         VARCHAR(5),
    nationality         VARCHAR(100) DEFAULT 'Nepali',
    religion            VARCHAR(50),
    marital_status      VARCHAR(20),
    -- Address
    permanent_address   TEXT,
    temporary_address   TEXT,
    -- Employment
    department_id       INTEGER REFERENCES departments(id),
    designation_id      INTEGER REFERENCES designations(id),
    branch_id           INTEGER REFERENCES branch_locations(id),
    employment_type     VARCHAR(50) DEFAULT 'permanent'
                        CHECK (employment_type IN ('permanent','contract','part_time','intern','probation')),
    status              VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active','inactive','terminated','resigned','retired')),
    joining_date        DATE,
    probation_end_date  DATE,
    confirmation_date   DATE,
    separation_date     DATE,
    separation_reason   TEXT,
    -- Banking & Tax (Nepal)
    bank_name           VARCHAR(100),
    bank_account        VARCHAR(50),
    bank_branch         VARCHAR(100),
    pan_number          VARCHAR(20),
    ssf_number          VARCHAR(30),
    pf_number           VARCHAR(30),
    citizenship_number  VARCHAR(50),
    -- HR Info
    supervisor_id       INTEGER REFERENCES employees(id),
    grade_level         VARCHAR(20),
    -- Photo
    photo_url           TEXT,
    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, employee_code)
);

CREATE TABLE IF NOT EXISTS employee_contracts (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_type   VARCHAR(50) DEFAULT 'permanent',
    start_date      DATE NOT NULL,
    end_date        DATE,
    gross_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active','expired','terminated')),
    document_url    TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- ATTENDANCE
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS shifts (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    break_minutes   INTEGER DEFAULT 60,
    late_grace_mins INTEGER DEFAULT 15,
    is_default      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roster_assignments (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id        INTEGER REFERENCES shifts(id),
    date            DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'scheduled',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, employee_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    check_in        TIMESTAMPTZ,
    check_out       TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'present'
                    CHECK (status IN ('present','absent','late','half_day','wfh','on_leave','holiday','weekend')),
    punch_type      VARCHAR(20) DEFAULT 'manual'
                    CHECK (punch_type IN ('manual','biometric','gps','web','mobile')),
    work_hours      NUMERIC(5,2) DEFAULT 0,
    overtime_hours  NUMERIC(5,2) DEFAULT 0,
    late_minutes    INTEGER DEFAULT 0,
    location_lat    NUMERIC(10,7),
    location_lng    NUMERIC(10,7),
    device_id       VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, employee_id, date)
);

CREATE TABLE IF NOT EXISTS biometric_devices (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    device_id       VARCHAR(100) UNIQUE,
    ip_address      VARCHAR(45),
    branch_id       INTEGER REFERENCES branch_locations(id),
    is_active       BOOLEAN DEFAULT TRUE,
    last_sync_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- LEAVE MANAGEMENT
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leave_types (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    code                VARCHAR(20),
    annual_entitlement  NUMERIC(5,2) DEFAULT 0,
    carry_forward       BOOLEAN DEFAULT FALSE,
    max_carry_forward   NUMERIC(5,2) DEFAULT 0,
    paid                BOOLEAN DEFAULT TRUE,
    requires_document   BOOLEAN DEFAULT FALSE,
    min_notice_days     INTEGER DEFAULT 0,
    color               VARCHAR(20) DEFAULT '#7c3aed',
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id   INTEGER NOT NULL REFERENCES leave_types(id),
    year            INTEGER NOT NULL,
    entitled_days   NUMERIC(5,2) DEFAULT 0,
    used_days       NUMERIC(5,2) DEFAULT 0,
    pending_days    NUMERIC(5,2) DEFAULT 0,
    carried_forward NUMERIC(5,2) DEFAULT 0,
    UNIQUE (company_id, employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id   INTEGER NOT NULL REFERENCES leave_types(id),
    from_date       DATE NOT NULL,
    to_date         DATE NOT NULL,
    days            NUMERIC(5,2) NOT NULL DEFAULT 1,
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
    approved_by     INTEGER REFERENCES employees(id),
    approved_at     TIMESTAMPTZ,
    reject_reason   TEXT,
    document_url    TEXT,
    applied_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- PAYROLL
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payroll_structures (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_default      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allowance_types (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    amount          NUMERIC(12,2) DEFAULT 0,
    type            VARCHAR(20) DEFAULT 'fixed' CHECK (type IN ('fixed','percentage')),
    taxable         BOOLEAN DEFAULT TRUE,
    effective_date  DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pay_month       DATE NOT NULL,   -- First day of the pay month
    basic_salary    NUMERIC(12,2) DEFAULT 0,
    gross_salary    NUMERIC(12,2) DEFAULT 0,
    net_salary      NUMERIC(12,2) DEFAULT 0,
    -- Allowances
    allowances      NUMERIC(12,2) DEFAULT 0,
    overtime_amount NUMERIC(12,2) DEFAULT 0,
    bonus           NUMERIC(12,2) DEFAULT 0,
    -- Deductions
    pf_deduction    NUMERIC(12,2) DEFAULT 0,
    ssf_deduction   NUMERIC(12,2) DEFAULT 0,
    tax_deduction   NUMERIC(12,2) DEFAULT 0,
    other_deductions NUMERIC(12,2) DEFAULT 0,
    -- Working details
    working_days    INTEGER DEFAULT 0,
    present_days    INTEGER DEFAULT 0,
    absent_days     INTEGER DEFAULT 0,
    overtime_hours  NUMERIC(6,2) DEFAULT 0,
    -- Status
    status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','processed','finalized','paid')),
    processed_by    INTEGER REFERENCES users(id),
    processed_at    TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    -- Nepal compliance
    ssf_registered  BOOLEAN DEFAULT FALSE,
    breakdown       JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, employee_id, pay_month)
);

CREATE TABLE IF NOT EXISTS salary_advances (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL,
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','recovered')),
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    approved_at     TIMESTAMPTZ,
    approved_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- RECRUITMENT / ATS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS job_requisitions (
    id                  SERIAL PRIMARY KEY,
    company_id          INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    department          VARCHAR(100),
    department_id       INTEGER REFERENCES departments(id),
    experience_years    INTEGER DEFAULT 0,
    education           VARCHAR(100),
    skills              JSONB DEFAULT '[]',
    salary_min          NUMERIC(12,2),
    salary_max          NUMERIC(12,2),
    positions           INTEGER DEFAULT 1,
    job_type            VARCHAR(50) DEFAULT 'full_time',
    location            VARCHAR(200),
    description         TEXT,
    requirements        TEXT,
    status              VARCHAR(20) DEFAULT 'open'
                        CHECK (status IN ('draft','open','closed','on_hold')),
    posted_date         DATE DEFAULT CURRENT_DATE,
    closing_date        DATE,
    applications_count  INTEGER DEFAULT 0,
    created_by          INTEGER REFERENCES users(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    job_id          INTEGER REFERENCES job_requisitions(id) ON DELETE CASCADE,
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(200),
    phone           VARCHAR(20),
    stage           VARCHAR(50) DEFAULT 'applied'
                    CHECK (stage IN ('applied','screening','interview','assessment','offered','hired','rejected')),
    source          VARCHAR(50) DEFAULT 'direct',
    resume_url      TEXT,
    cover_letter    TEXT,
    expected_salary NUMERIC(12,2),
    notes           TEXT,
    score           INTEGER,
    rejected_reason TEXT,
    applied_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- PERFORMANCE MANAGEMENT
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS performance_reviews (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id     INTEGER REFERENCES employees(id),
    review_date     DATE DEFAULT CURRENT_DATE,
    period_from     DATE,
    period_to       DATE,
    rating          NUMERIC(3,1) CHECK (rating BETWEEN 1 AND 5),
    goals_score     NUMERIC(3,1),
    competency_score NUMERIC(3,1),
    comments        TEXT,
    strengths       TEXT,
    improvements    TEXT,
    status          VARCHAR(20) DEFAULT 'draft',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    target_value    NUMERIC(10,2),
    current_value   NUMERIC(10,2) DEFAULT 0,
    unit            VARCHAR(50),
    due_date        DATE,
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active','completed','cancelled','overdue')),
    progress_pct    INTEGER DEFAULT 0,
    category        VARCHAR(50) DEFAULT 'individual',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- ANNOUNCEMENTS & NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS announcements (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    body            TEXT NOT NULL,
    type            VARCHAR(50) DEFAULT 'general'
                    CHECK (type IN ('general','urgent','hr','payroll','event','policy')),
    target_dept     INTEGER REFERENCES departments(id),
    is_pinned       BOOLEAN DEFAULT FALSE,
    attachment_url  TEXT,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    recipient_id    INTEGER REFERENCES users(id),
    title           VARCHAR(300) NOT NULL,
    body            TEXT,
    type            VARCHAR(50) DEFAULT 'info',
    is_read         BOOLEAN DEFAULT FALSE,
    action_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- CALENDAR & HR POLICIES
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS calendar_events (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    event_date      DATE NOT NULL,
    end_date        DATE,
    event_type      VARCHAR(50) DEFAULT 'general',
    is_public       BOOLEAN DEFAULT TRUE,
    department_id   INTEGER REFERENCES departments(id),
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_holidays (
    id              SERIAL PRIMARY KEY,
    country         VARCHAR(100) DEFAULT 'Nepal',
    name            VARCHAR(200) NOT NULL,
    holiday_date    DATE NOT NULL,
    is_optional     BOOLEAN DEFAULT FALSE,
    year            INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_policies (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    category        VARCHAR(100),
    content         TEXT,
    version         VARCHAR(20) DEFAULT '1.0',
    effective_date  DATE,
    document_url    TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- HR BUDGET
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hr_budgets (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    fiscal_year     INTEGER NOT NULL,
    category        VARCHAR(100) NOT NULL,
    budgeted_amount NUMERIC(15,2) DEFAULT 0,
    actual_amount   NUMERIC(15,2) DEFAULT 0,
    department_id   INTEGER REFERENCES departments(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- DOCUMENTS & FILES
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS documents (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER REFERENCES employees(id),
    title           VARCHAR(300) NOT NULL,
    category        VARCHAR(100) DEFAULT 'general',
    file_url        TEXT NOT NULL,
    file_size       INTEGER,
    file_type       VARCHAR(50),
    is_confidential BOOLEAN DEFAULT FALSE,
    expires_at      DATE,
    uploaded_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_letters (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    employee_id     INTEGER REFERENCES employees(id),
    letter_type     VARCHAR(100) NOT NULL,
    content         TEXT NOT NULL,
    document_url    TEXT,
    generated_by    INTEGER REFERENCES users(id),
    generated_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- AUDIT LOGS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES tenant_companies(id),
    user_id         INTEGER REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100),
    entity_id       VARCHAR(100),
    old_value       JSONB,
    new_value       JSONB,
    notes           TEXT,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- MODULE PERMISSIONS (SaaS)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenant_module_permissions (
    id              SERIAL PRIMARY KEY,
    company_id      INTEGER NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    module_key      VARCHAR(100) NOT NULL,
    is_enabled      BOOLEAN DEFAULT FALSE,
    enabled_by      VARCHAR(200),
    enabled_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, module_key)
);

-- ══════════════════════════════════════════════════════════════════════
-- INDEXES (performance)
-- ══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_employees_company    ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_status     ON employees(company_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_date      ON attendance_logs(company_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee  ON attendance_logs(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_company        ON leave_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_employee       ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month        ON payroll_records(company_id, pay_month);
CREATE INDEX IF NOT EXISTS idx_payroll_employee     ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_company        ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_candidates_company   ON candidates(company_id, stage);
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company        ON users(company_id);

-- Done
SELECT 'eLogix HRMS schema created successfully.' AS result;
