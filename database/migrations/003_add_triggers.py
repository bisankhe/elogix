"""
FILE: database/migrations/003_add_triggers.py
Alembic migration — Database triggers for auto-computed fields.
"""
from alembic import op

revision = '003_add_triggers'
down_revision = '002_add_indexes'

def upgrade():
    # 1. Auto updated_at for all tables
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$
    """)

    # Apply to all tables that have updated_at
    for tbl in [
        "group_companies","companies","company_legal_documents","branches",
        "business_units","cost_centers","departments","sections","units",
        "teams","work_locations","employment_categories","job_families",
        "grade_levels","designations","reporting_relationships","positions",
        "outsource_vendors","sla_contracts","vendor_employees",
        "vendor_invoices","vendor_attendance","vendor_performance_cards",
    ]:
        op.execute(f"""
            DROP TRIGGER IF EXISTS trg_{tbl}_upd ON {tbl};
            CREATE TRIGGER trg_{tbl}_upd
            BEFORE UPDATE ON {tbl}
            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()
        """)

    # 2. Nepal Labour Act 2074 — CBA + Safety Committee auto-flags on team
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_team_nepal_law()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.cba_required := CASE WHEN NEW.is_managerial THEN FALSE
                                     ELSE COALESCE(NEW.member_count,0) >= 10 END;
            NEW.safety_committee_required := COALESCE(NEW.member_count,0) >= 20;
            RETURN NEW;
        END;$$
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS trg_team_nepal_law ON teams;
        CREATE TRIGGER trg_team_nepal_law
        BEFORE INSERT OR UPDATE OF member_count, is_managerial ON teams
        FOR EACH ROW EXECUTE FUNCTION fn_team_nepal_law()
    """)

    # 3. Sync department headcount from positions
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_sync_dept_headcount()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        DECLARE did UUID;
        BEGIN
            did := COALESCE(NEW.department_id, OLD.department_id);
            IF did IS NOT NULL THEN
                UPDATE departments SET
                    headcount_actual = (
                        SELECT COUNT(*) FROM positions
                        WHERE department_id = did AND status = 'filled' AND NOT is_deleted
                    ), updated_at = NOW()
                WHERE id = did;
            END IF;
            RETURN NEW;
        END;$$
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS trg_position_headcount ON positions;
        CREATE TRIGGER trg_position_headcount
        AFTER INSERT OR UPDATE OF status OR DELETE ON positions
        FOR EACH ROW EXECUTE FUNCTION fn_sync_dept_headcount()
    """)

    # 4. Auto-flag invoice discrepancy
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_invoice_discrepancy()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            IF NEW.timesheet_amount_npr IS NOT NULL THEN
                NEW.has_discrepancy := ABS(NEW.total_amount_npr - NEW.timesheet_amount_npr) > 100;
            END IF;
            RETURN NEW;
        END;$$
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS trg_invoice_discrepancy ON vendor_invoices;
        CREATE TRIGGER trg_invoice_discrepancy
        BEFORE INSERT OR UPDATE ON vendor_invoices
        FOR EACH ROW EXECUTE FUNCTION fn_invoice_discrepancy()
    """)

    # 5. Sync vendor worker count
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_vendor_worker_count()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            UPDATE outsource_vendors SET
                total_workers_deployed = (
                    SELECT COUNT(*) FROM vendor_employees
                    WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id)
                      AND status = 'active' AND NOT is_deleted
                ), updated_at = NOW()
            WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
            RETURN NEW;
        END;$$
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS trg_vendor_worker_count ON vendor_employees;
        CREATE TRIGGER trg_vendor_worker_count
        AFTER INSERT OR UPDATE OF status OR DELETE ON vendor_employees
        FOR EACH ROW EXECUTE FUNCTION fn_vendor_worker_count()
    """)

    # 6. Protect system employment categories
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_protect_system_emp_cat()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            IF OLD.is_system AND NEW.is_deleted THEN
                RAISE EXCEPTION 'System employment category % cannot be deleted — required by Nepal Labour Act 2074', OLD.code;
            END IF;
            RETURN NEW;
        END;$$
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS trg_protect_emp_cat ON employment_categories;
        CREATE TRIGGER trg_protect_emp_cat
        BEFORE UPDATE ON employment_categories
        FOR EACH ROW EXECUTE FUNCTION fn_protect_system_emp_cat()
    """)

    # 7. Dept CBA flag on headcount change
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_dept_cba()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.cba_applicable := COALESCE(NEW.headcount_actual,0) >= 10;
            RETURN NEW;
        END;$$
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS trg_dept_cba ON departments;
        CREATE TRIGGER trg_dept_cba
        BEFORE INSERT OR UPDATE OF headcount_actual ON departments
        FOR EACH ROW EXECUTE FUNCTION fn_dept_cba()
    """)


def downgrade():
    funcs = ["fn_set_updated_at","fn_team_nepal_law","fn_sync_dept_headcount",
             "fn_invoice_discrepancy","fn_vendor_worker_count",
             "fn_protect_system_emp_cat","fn_dept_cba"]
    for fn in funcs:
        op.execute(f"DROP FUNCTION IF EXISTS {fn}() CASCADE")
