-- =============================================================================
-- eLogix HRMS — PostgreSQL Schema
-- Multi-tenant with Row-Level Security (RLS)
-- All tables scoped by company_id — set via app.current_company_id
-- =============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- HELPER: updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. TENANT COMPANIES  (eLogix registry — not RLS scoped)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_companies (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  plan             TEXT        NOT NULL DEFAULT 'trial'
                               CHECK (plan IN ('trial','starter','growth','business','enterprise','unlimited')),
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','active','suspended','cancelled','trial')),
  business_type    TEXT        NOT NULL DEFAULT 'custom',
  industry         TEXT,
  admin_email      TEXT        NOT NULL,
  admin_name       TEXT,
  phone            TEXT,
  country          TEXT        NOT NULL DEFAULT 'Nepal',
  currency         TEXT        NOT NULL DEFAULT 'NPR',
  max_employees    INTEGER     NOT NULL DEFAULT 10,
  account_manager  TEXT,
  support_tier     TEXT        NOT NULL DEFAULT 'standard',
  approved_by      TEXT,
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_tenant_companies_updated_at
  BEFORE UPDATE ON tenant_companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 2. TENANT MODULE PERMISSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenant_module_permissions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  module_key   TEXT        NOT NULL,   -- e.g. 'recruitment', 'payroll', 'attendance'
  is_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
  config       JSONB       NOT NULL DEFAULT '{}',
  granted_by   TEXT,
  granted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, module_key)
);
CREATE TRIGGER trg_tenant_module_permissions_updated_at
  BEFORE UPDATE ON tenant_module_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 3. USERS  (login accounts — one per employee/admin per tenant)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  password_hash   TEXT        NOT NULL,
  full_name       TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'employee'
                              CHECK (role IN ('superadmin','admin','hr','manager','employee')),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  password_reset_token       TEXT,
  password_reset_expires_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, email)
);
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 4. DEPARTMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS departments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  code         TEXT,
  parent_id    UUID        REFERENCES departments(id),
  head_user_id UUID        REFERENCES users(id),
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name)
);
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 5. DESIGNATIONS  (job titles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS designations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  department_id UUID       REFERENCES departments(id),
  grade        TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, title)
);
CREATE TRIGGER trg_designations_updated_at
  BEFORE UPDATE ON designations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 6. BRANCH LOCATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS branch_locations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  address      TEXT,
  city         TEXT,
  country      TEXT        NOT NULL DEFAULT 'Nepal',
  phone        TEXT,
  is_head_office BOOLEAN   NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_branch_locations_updated_at
  BEFORE UPDATE ON branch_locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 7. EMPLOYEES
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  user_id           UUID        REFERENCES users(id),
  employee_code     TEXT        NOT NULL,
  full_name         TEXT        NOT NULL,
  email             TEXT,
  phone             TEXT,
  date_of_birth     DATE,
  gender            TEXT        CHECK (gender IN ('male','female','other')),
  address           TEXT,
  department_id     UUID        REFERENCES departments(id),
  designation_id    UUID        REFERENCES designations(id),
  branch_id         UUID        REFERENCES branch_locations(id),
  manager_id        UUID        REFERENCES employees(id),
  employment_type   TEXT        NOT NULL DEFAULT 'full_time'
                                CHECK (employment_type IN ('full_time','part_time','contract','intern','probation')),
  join_date         DATE        NOT NULL,
  confirm_date      DATE,
  end_date          DATE,
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','inactive','terminated','resigned','on_leave')),
  basic_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  bank_name         TEXT,
  bank_account      TEXT,
  pan_number        TEXT,
  citizenship_no    TEXT,
  passport_no       TEXT,
  profile_photo_url TEXT,
  meta              JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, employee_code)
);
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 8. EMPLOYEE CONTRACTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS employee_contracts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_type   TEXT        NOT NULL DEFAULT 'permanent'
                              CHECK (contract_type IN ('permanent','fixed_term','probation','internship')),
  start_date      DATE        NOT NULL,
  end_date        DATE,
  salary          NUMERIC(12,2) NOT NULL,
  position        TEXT,
  terms           TEXT,
  document_url    TEXT,
  signed_at       TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_employee_contracts_updated_at
  BEFORE UPDATE ON employee_contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 9. SHIFTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS shifts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  start_time    TIME        NOT NULL,
  end_time      TIME        NOT NULL,
  break_minutes INTEGER     NOT NULL DEFAULT 60,
  grace_minutes INTEGER     NOT NULL DEFAULT 10,
  is_night_shift BOOLEAN    NOT NULL DEFAULT FALSE,
  work_days     TEXT[]      NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name)
);
CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 10. ROSTER ASSIGNMENTS  (employee → shift → date range)
-- =============================================================================
CREATE TABLE IF NOT EXISTS roster_assignments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id   UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id      UUID        NOT NULL REFERENCES shifts(id),
  effective_from DATE       NOT NULL,
  effective_to   DATE,
  assigned_by   UUID        REFERENCES users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_roster_assignments_updated_at
  BEFORE UPDATE ON roster_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 11. BIOMETRIC DEVICES
-- =============================================================================
CREATE TABLE IF NOT EXISTS biometric_devices (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  branch_id      UUID        REFERENCES branch_locations(id),
  device_name    TEXT        NOT NULL,
  device_serial  TEXT,
  model          TEXT,
  ip_address     TEXT,
  port           INTEGER     DEFAULT 4370,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_biometric_devices_updated_at
  BEFORE UPDATE ON biometric_devices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 12. ATTENDANCE LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  log_date        DATE        NOT NULL,
  check_in        TIMESTAMPTZ,
  check_out       TIMESTAMPTZ,
  source          TEXT        NOT NULL DEFAULT 'manual'
                              CHECK (source IN ('biometric','mobile','web','manual','import')),
  device_id       UUID        REFERENCES biometric_devices(id),
  status          TEXT        NOT NULL DEFAULT 'present'
                              CHECK (status IN ('present','absent','late','half_day','holiday','weekend','on_leave')),
  late_minutes    INTEGER     NOT NULL DEFAULT 0,
  overtime_minutes INTEGER    NOT NULL DEFAULT 0,
  work_minutes    INTEGER     NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, employee_id, log_date)
);
CREATE TRIGGER trg_attendance_logs_updated_at
  BEFORE UPDATE ON attendance_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 13. LEAVE TYPES
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_types (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  code            TEXT        NOT NULL,
  days_per_year   NUMERIC(5,1) NOT NULL DEFAULT 0,
  is_paid         BOOLEAN     NOT NULL DEFAULT TRUE,
  is_carry_forward BOOLEAN    NOT NULL DEFAULT FALSE,
  max_carry_days  NUMERIC(5,1) NOT NULL DEFAULT 0,
  requires_docs   BOOLEAN     NOT NULL DEFAULT FALSE,
  applicable_gender TEXT      CHECK (applicable_gender IN ('all','male','female')),
  color           TEXT        NOT NULL DEFAULT '#6366f1',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);
CREATE TRIGGER trg_leave_types_updated_at
  BEFORE UPDATE ON leave_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 14. LEAVE BALANCES  (per employee per leave type per fiscal year)
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_balances (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id   UUID        NOT NULL REFERENCES leave_types(id),
  fiscal_year     TEXT        NOT NULL,  -- e.g. '2081-82'
  allocated       NUMERIC(5,1) NOT NULL DEFAULT 0,
  used            NUMERIC(5,1) NOT NULL DEFAULT 0,
  carried_forward NUMERIC(5,1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, employee_id, leave_type_id, fiscal_year)
);
CREATE TRIGGER trg_leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 15. LEAVE REQUESTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id   UUID        NOT NULL REFERENCES leave_types(id),
  from_date       DATE        NOT NULL,
  to_date         DATE        NOT NULL,
  days            NUMERIC(5,1) NOT NULL,
  reason          TEXT,
  document_url    TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by     UUID        REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 16. PUBLIC HOLIDAYS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public_holidays (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  holiday_date DATE        NOT NULL,
  is_optional  BOOLEAN     NOT NULL DEFAULT FALSE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, holiday_date)
);
CREATE TRIGGER trg_public_holidays_updated_at
  BEFORE UPDATE ON public_holidays
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 17. CALENDAR EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  created_by     UUID        REFERENCES users(id),
  title          TEXT        NOT NULL,
  description    TEXT,
  event_type     TEXT        NOT NULL DEFAULT 'general'
                             CHECK (event_type IN ('general','meeting','training','birthday','anniversary','reminder')),
  start_at       TIMESTAMPTZ NOT NULL,
  end_at         TIMESTAMPTZ,
  all_day        BOOLEAN     NOT NULL DEFAULT FALSE,
  location       TEXT,
  color          TEXT        NOT NULL DEFAULT '#6366f1',
  audience       TEXT        NOT NULL DEFAULT 'all'
                             CHECK (audience IN ('all','department','individual')),
  department_id  UUID        REFERENCES departments(id),
  employee_id    UUID        REFERENCES employees(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 18. PAYROLL STRUCTURES  (salary component templates)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_structures (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  components      JSONB       NOT NULL DEFAULT '[]',
  -- [{name, type: earnings|deductions, calc_type: fixed|percent, value, taxable}]
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name)
);
CREATE TRIGGER trg_payroll_structures_updated_at
  BEFORE UPDATE ON payroll_structures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 19. ALLOWANCE TYPES
-- =============================================================================
CREATE TABLE IF NOT EXISTS allowance_types (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  code         TEXT        NOT NULL,
  calc_type    TEXT        NOT NULL DEFAULT 'fixed'
                           CHECK (calc_type IN ('fixed','percent_of_basic','percent_of_gross')),
  default_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_taxable   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);
CREATE TRIGGER trg_allowance_types_updated_at
  BEFORE UPDATE ON allowance_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 20. PAYROLL RECORDS  (monthly payslip per employee)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_records (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id       UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payroll_month     TEXT        NOT NULL,  -- 'YYYY-MM' e.g. '2081-07'
  basic_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions  NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,
  earnings          JSONB       NOT NULL DEFAULT '{}',
  deductions        JSONB       NOT NULL DEFAULT '{}',
  working_days      INTEGER     NOT NULL DEFAULT 0,
  present_days      NUMERIC(5,1) NOT NULL DEFAULT 0,
  absent_days       NUMERIC(5,1) NOT NULL DEFAULT 0,
  overtime_hours    NUMERIC(6,2) NOT NULL DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','approved','paid','cancelled')),
  approved_by       UUID        REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  payment_method    TEXT        CHECK (payment_method IN ('bank','cash','cheque')),
  remarks           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, employee_id, payroll_month)
);
CREATE TRIGGER trg_payroll_records_updated_at
  BEFORE UPDATE ON payroll_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 21. SALARY ADVANCES
-- =============================================================================
CREATE TABLE IF NOT EXISTS salary_advances (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  reason          TEXT,
  request_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  repay_months    INTEGER     NOT NULL DEFAULT 1,
  deduct_per_month NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected','repaid')),
  approved_by     UUID        REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_salary_advances_updated_at
  BEFORE UPDATE ON salary_advances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 22. PERFORMANCE REVIEWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS performance_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id     UUID        REFERENCES users(id),
  review_period   TEXT        NOT NULL,  -- e.g. 'Q1-2081' or '2081-82'
  review_type     TEXT        NOT NULL DEFAULT 'annual'
                              CHECK (review_type IN ('annual','quarterly','probation','project')),
  overall_rating  NUMERIC(3,1) CHECK (overall_rating BETWEEN 1 AND 5),
  ratings         JSONB       NOT NULL DEFAULT '{}',
  -- {kpi_key: {score, comment}}
  strengths       TEXT,
  improvements    TEXT,
  goals_next      TEXT,
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','submitted','acknowledged','completed')),
  submitted_at    TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_performance_reviews_updated_at
  BEFORE UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 23. GOALS  (OKR / KPI goals per employee)
-- =============================================================================
CREATE TABLE IF NOT EXISTS goals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_by      UUID        REFERENCES users(id),
  title           TEXT        NOT NULL,
  description     TEXT,
  goal_type       TEXT        NOT NULL DEFAULT 'individual'
                              CHECK (goal_type IN ('individual','team','company')),
  period          TEXT        NOT NULL,  -- e.g. 'Q1-2081'
  target_value    NUMERIC(12,2),
  current_value   NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit            TEXT,
  due_date        DATE,
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','completed','cancelled','overdue')),
  progress_pct    NUMERIC(5,2) NOT NULL DEFAULT 0
                               CHECK (progress_pct BETWEEN 0 AND 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 24. HR BUDGETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS hr_budgets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  department_id   UUID        REFERENCES departments(id),
  budget_type     TEXT        NOT NULL DEFAULT 'payroll'
                              CHECK (budget_type IN ('payroll','recruitment','training','benefits','other')),
  fiscal_year     TEXT        NOT NULL,
  total_budget    NUMERIC(14,2) NOT NULL DEFAULT 0,
  spent           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'NPR',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, department_id, budget_type, fiscal_year)
);
CREATE TRIGGER trg_hr_budgets_updated_at
  BEFORE UPDATE ON hr_budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 25. HR LETTERS  (appointment, experience, NOC, warning, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hr_letters (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  letter_type     TEXT        NOT NULL
                              CHECK (letter_type IN ('appointment','confirmation','promotion',
                                                     'increment','warning','termination',
                                                     'experience','noc','transfer','other')),
  subject         TEXT        NOT NULL,
  letter_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  content         TEXT        NOT NULL,
  issued_by       UUID        REFERENCES users(id),
  document_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_hr_letters_updated_at
  BEFORE UPDATE ON hr_letters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 26. HR POLICIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS hr_policies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'general',
  content         TEXT        NOT NULL,
  version         TEXT        NOT NULL DEFAULT '1.0',
  effective_from  DATE        NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE,
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  published_by    UUID        REFERENCES users(id),
  document_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_hr_policies_updated_at
  BEFORE UPDATE ON hr_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 27. DOCUMENTS  (employee document vault)
-- =============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  employee_id     UUID        REFERENCES employees(id) ON DELETE CASCADE,
  uploaded_by     UUID        REFERENCES users(id),
  doc_type        TEXT        NOT NULL DEFAULT 'other'
                              CHECK (doc_type IN ('citizenship','passport','pan','cv',
                                                  'certificate','contract','photo',
                                                  'policy','payslip','noc','other')),
  title           TEXT        NOT NULL,
  file_url        TEXT        NOT NULL,
  file_size_bytes INTEGER,
  mime_type       TEXT,
  is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  expiry_date     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 28. ANNOUNCEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  created_by      UUID        REFERENCES users(id),
  title           TEXT        NOT NULL,
  content         TEXT        NOT NULL,
  priority        TEXT        NOT NULL DEFAULT 'normal'
                              CHECK (priority IN ('low','normal','high','urgent')),
  audience        TEXT        NOT NULL DEFAULT 'all'
                              CHECK (audience IN ('all','department','role')),
  department_id   UUID        REFERENCES departments(id),
  target_role     TEXT,
  publish_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expire_at       TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 29. NOTIFICATIONS  (per-user bell notifications)
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  body            TEXT,
  notif_type      TEXT        NOT NULL DEFAULT 'info'
                              CHECK (notif_type IN ('info','success','warning','error',
                                                    'leave','payroll','attendance','hr')),
  link_url        TEXT,
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (company_id, user_id, is_read)
  WHERE is_read = FALSE;

-- =============================================================================
-- 30. JOB REQUISITIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_requisitions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  department_id     UUID        REFERENCES departments(id),
  designation_id    UUID        REFERENCES designations(id),
  branch_id         UUID        REFERENCES branch_locations(id),
  requested_by      UUID        REFERENCES users(id),
  title             TEXT        NOT NULL,
  vacancies         INTEGER     NOT NULL DEFAULT 1,
  employment_type   TEXT        NOT NULL DEFAULT 'full_time',
  salary_min        NUMERIC(12,2),
  salary_max        NUMERIC(12,2),
  description       TEXT,
  requirements      TEXT,
  deadline          DATE,
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','open','on_hold','filled','cancelled')),
  approved_by       UUID        REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_job_requisitions_updated_at
  BEFORE UPDATE ON job_requisitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 31. CANDIDATES  (recruitment pipeline)
-- =============================================================================
CREATE TABLE IF NOT EXISTS candidates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
  requisition_id    UUID        REFERENCES job_requisitions(id),
  full_name         TEXT        NOT NULL,
  email             TEXT,
  phone             TEXT,
  current_company   TEXT,
  current_role      TEXT,
  experience_years  NUMERIC(4,1),
  expected_salary   NUMERIC(12,2),
  cv_url            TEXT,
  source            TEXT        NOT NULL DEFAULT 'direct'
                                CHECK (source IN ('direct','referral','linkedin','jobsite','agency','walk_in')),
  stage             TEXT        NOT NULL DEFAULT 'applied'
                                CHECK (stage IN ('applied','screening','interview','assessment',
                                                 'offer','hired','rejected','withdrawn')),
  assigned_to       UUID        REFERENCES users(id),
  interview_date    TIMESTAMPTZ,
  notes             TEXT,
  meta              JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 32. AUDIT LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGSERIAL   PRIMARY KEY,
  company_id   UUID        REFERENCES tenant_companies(id),
  user_id      UUID        REFERENCES users(id),
  action       TEXT        NOT NULL,  -- 'CREATE','UPDATE','DELETE','LOGIN','LOGOUT'
  entity_type  TEXT,                  -- 'employee','payroll', etc.
  entity_id    UUID,
  old_data     JSONB,
  new_data     JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company
  ON audit_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (company_id, entity_type, entity_id);

-- =============================================================================
-- INDEXES for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_employees_company       ON employees (company_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_department    ON employees (company_id, department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date         ON attendance_logs (company_id, log_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee     ON attendance_logs (company_id, employee_id, log_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests (company_id, employee_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_month           ON payroll_records (company_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_candidates_stage        ON candidates (company_id, stage);
CREATE INDEX IF NOT EXISTS idx_documents_employee      ON documents (company_id, employee_id);

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- Enable on all tenant-scoped tables so tenants can never see each other's data
-- Flask sets: SET LOCAL app.current_company_id = '<uuid>' per request
-- =============================================================================
DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'users','departments','designations','branch_locations','employees',
    'employee_contracts','shifts','roster_assignments','biometric_devices',
    'attendance_logs','leave_types','leave_balances','leave_requests',
    'public_holidays','calendar_events','payroll_structures','allowance_types',
    'payroll_records','salary_advances','performance_reviews','goals',
    'hr_budgets','hr_letters','hr_policies','documents','announcements',
    'notifications','job_requisitions','candidates','audit_logs',
    'tenant_module_permissions'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    -- Drop existing policy if any, then recreate
    EXECUTE format('DROP POLICY IF EXISTS rls_%I_company ON %I', tbl, tbl);
    EXECUTE format($p$
      CREATE POLICY rls_%I_company ON %I
        USING (company_id = current_setting(''app.current_company_id'', TRUE)::uuid)
    $p$, tbl, tbl);
  END LOOP;
END $$;

-- tenant_companies itself is NOT RLS-scoped — only eLogix admin can read it
-- (protected at the application layer by X-eLogix-Admin-Key)

-- =============================================================================
-- GRANT permissions to app user
-- =============================================================================
GRANT USAGE ON SCHEMA public TO webadmin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO webadmin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO webadmin;

-- =============================================================================
-- Done
-- =============================================================================
-- Run with:  psql -U postgres -d elogix_production -f elogix_schema.sql
-- =============================================================================
