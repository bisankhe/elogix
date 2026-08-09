"""
FILE: database/migrations/002_add_indexes.py
Alembic migration — Performance indexes for all modules.
Run: alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa

revision  = '002_add_indexes'
down_revision = '001_initial'

def upgrade():
    # Full-text search indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_company_name_trgm ON companies USING GIN(name gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_dept_name_trgm    ON departments USING GIN(name gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_desig_name_trgm   ON designations USING GIN(name gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pos_title_trgm    ON positions USING GIN(position_title gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ve_name_trgm      ON vendor_employees USING GIN(name gin_trgm_ops)")

    # Partial indexes for active-only queries (huge performance boost)
    op.execute("CREATE INDEX IF NOT EXISTS idx_companies_active       ON companies(status) WHERE status = 'active' AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_depts_active           ON departments(company_id) WHERE status = 'active' AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_positions_vacant       ON positions(company_id, designation_id) WHERE status = 'vacant' AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_positions_critical     ON positions(company_id) WHERE is_critical AND status = 'filled' AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_teams_cba              ON teams(company_id) WHERE cba_required AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_teams_safety           ON teams(company_id) WHERE safety_committee_required AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vendors_active         ON outsource_vendors(company_id) WHERE status = 'active' AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_contracts_expiring     ON sla_contracts(end_date) WHERE status = 'active' AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_invoices_pending       ON vendor_invoices(company_id) WHERE status IN ('pending_approval','disputed') AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ve_ssf_risk            ON vendor_employees(vendor_id) WHERE NOT ssf_paid_current_month AND status = 'active'")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ve_insurance_risk      ON vendor_employees(vendor_id) WHERE NOT insurance_active AND status = 'active'")
    op.execute("CREATE INDEX IF NOT EXISTS idx_att_ghost_high         ON vendor_attendance(vendor_id, attendance_date) WHERE ghost_risk_score > 60")
    op.execute("CREATE INDEX IF NOT EXISTS idx_docs_expiring          ON company_legal_documents(company_id, expiry_date) WHERE expiry_date IS NOT NULL AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_grades_salary          ON grade_levels(company_id, salary_min, salary_max) WHERE NOT is_deleted")

    # Composite indexes for common multi-column queries
    op.execute("CREATE INDEX IF NOT EXISTS idx_pos_dept_status      ON positions(department_id, status) WHERE NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_rr_active            ON reporting_relationships(employee_id, manager_id) WHERE status = 'active' AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_emp_cat_type_co      ON employment_categories(company_id, la_type) WHERE is_active AND NOT is_deleted")
    op.execute("CREATE INDEX IF NOT EXISTS idx_kpi_contract_period  ON sla_kpi_results(contract_id, period_year, period_month)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_perf_cards_score     ON vendor_performance_cards(company_id, overall_score) WHERE overall_score < 70")
    op.execute("CREATE INDEX IF NOT EXISTS idx_att_period_vendor    ON vendor_attendance(vendor_id, period_year, period_month)")


def downgrade():
    indexes = [
        "idx_company_name_trgm","idx_dept_name_trgm","idx_desig_name_trgm",
        "idx_pos_title_trgm","idx_ve_name_trgm","idx_companies_active",
        "idx_depts_active","idx_positions_vacant","idx_positions_critical",
        "idx_teams_cba","idx_teams_safety","idx_vendors_active",
        "idx_contracts_expiring","idx_invoices_pending","idx_ve_ssf_risk",
        "idx_ve_insurance_risk","idx_att_ghost_high","idx_docs_expiring",
        "idx_grades_salary","idx_pos_dept_status","idx_rr_active",
        "idx_emp_cat_type_co","idx_kpi_contract_period",
        "idx_perf_cards_score","idx_att_period_vendor",
    ]
    for idx in indexes:
        op.execute(f"DROP INDEX IF EXISTS {idx}")
