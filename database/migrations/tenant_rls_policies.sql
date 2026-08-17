-- ============================================================
-- FILE: database/migrations/tenant_rls_policies.sql
-- eLogix HRMS — PostgreSQL Row Level Security (RLS) for Multi-Tenancy
-- Run ONCE on production database to enforce tenant data isolation
-- eLogix Technologies · www.elogix.com.np
-- ============================================================

-- ── STEP 1: Create app-level setting for tenant context ──────
-- This is set by Flask backend before each query
-- Flask: SET LOCAL app.current_company_id = '<uuid>';

-- ── STEP 2: Fix attendance_log — add company_id column ───────
ALTER TABLE attendance_logs
    ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE overtime_logs
    ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT gen_random_uuid();

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_attendance_logs_company
    ON attendance_logs(company_id, log_date);

CREATE INDEX IF NOT EXISTS ix_overtime_logs_company
    ON overtime_logs(company_id);

-- ── STEP 3: Enable RLS on all tenant tables ──────────────────
DO $$
DECLARE
    tbl TEXT;
    tenant_tables TEXT[] := ARRAY[
        -- Core HR
        'employees', 'employee_documents', 'employee_notes',
        -- Attendance
        'attendance_logs', 'overtime_logs', 'shifts', 'shift_assignments',
        -- Leave
        'leave_types', 'leave_requests', 'leave_balances', 'leave_encashments',
        -- Payroll
        'payroll_records', 'salary_components', 'payroll_deductions',
        'ssf_records', 'cit_records', 'gratuity_records',
        -- Recruitment
        'ats_jobs', 'ats_candidates', 'ats_applications', 'ats_interviews',
        -- Performance
        'performance_reviews', 'kpis', 'okrs', 'goals',
        -- Training
        'training_programs', 'training_enrollments', 'lms_courses',
        -- Organization
        'departments', 'designations', 'branches', 'business_units',
        'positions', 'job_families', 'grade_levels',
        -- Compliance
        'hr_policies', 'policy_acknowledgments', 'audit_logs',
        -- Finance
        'expense_claims', 'loans', 'advances',
        -- AI & Chat
        'ai_chat_sessions', 'ai_chat_messages', 'ai_usage_logs',
        -- Exit
        'exit_requests', 'clearances', 'fnf_settlements',
        -- Custom
        'employment_categories', 'announcements', 'helpdesk_tickets'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        -- Check if table exists before enabling RLS
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = tbl AND table_schema = 'public'
        ) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

            -- Drop existing policy if any
            EXECUTE format(
                'DROP POLICY IF EXISTS tenant_isolation ON %I', tbl
            );

            -- Create isolation policy
            -- company_id column must exist on the table
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = tbl
                AND column_name IN ('company_id', 'tenant_id')
                AND table_schema = 'public'
            ) THEN
                -- Handle both company_id and tenant_id column names
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = tbl AND column_name = 'company_id'
                ) THEN
                    EXECUTE format(
                        'CREATE POLICY tenant_isolation ON %I
                         USING (company_id = current_setting(''app.current_company_id'', TRUE)::UUID)',
                        tbl
                    );
                ELSE
                    EXECUTE format(
                        'CREATE POLICY tenant_isolation ON %I
                         USING (tenant_id = current_setting(''app.current_company_id'', TRUE)::UUID)',
                        tbl
                    );
                END IF;
                RAISE NOTICE 'RLS enabled: %', tbl;
            ELSE
                RAISE WARNING 'Table % has no company_id or tenant_id column — SKIPPED', tbl;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ── STEP 4: SuperAdmin bypass (eLogix admin sees ALL tenants) ─
-- The elogix_admin role bypasses RLS for platform management
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'elogix_admin') THEN
        CREATE ROLE elogix_admin;
    END IF;
END $$;

-- Grant elogix_admin to bypass RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO elogix_admin;

-- ── STEP 5: Tenant-aware DB user (optional but recommended) ──
-- Create a role for tenant queries (cannot bypass RLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'elogix_tenant') THEN
        CREATE ROLE elogix_tenant LOGIN PASSWORD 'change_in_production';
    END IF;
END $$;

GRANT CONNECT ON DATABASE elogix_hrms TO elogix_tenant;
GRANT USAGE ON SCHEMA public TO elogix_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO elogix_tenant;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO elogix_tenant;

-- ── STEP 6: Function to set tenant context safely ────────────
CREATE OR REPLACE FUNCTION set_tenant_context(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_company_id', p_company_id::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── STEP 7: Audit log for cross-tenant access attempts ───────
CREATE TABLE IF NOT EXISTS tenant_security_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type  VARCHAR(50) NOT NULL,  -- 'rls_bypass', 'cross_tenant_attempt', 'admin_access'
    user_id     UUID,
    company_id  UUID,
    target_company_id UUID,
    endpoint    VARCHAR(500),
    ip_address  INET,
    details     JSONB DEFAULT '{}'
);

-- ── STEP 8: Verify RLS is working ─────────────────────────────
DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = TRUE;

    RAISE NOTICE 'RLS enabled on % tables', rls_count;
END $$;

SELECT
    tablename,
    rowsecurity AS rls_enabled,
    policyname
FROM pg_tables
LEFT JOIN pg_policies ON pg_tables.tablename = pg_policies.tablename
WHERE pg_tables.schemaname = 'public'
AND rowsecurity = TRUE
ORDER BY tablename;

SELECT 'eLogix Multi-Tenant RLS setup complete' AS status;
