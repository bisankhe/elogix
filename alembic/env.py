"""
FILE: alembic/env.py
Alembic migration environment for eLogix HRMS.
Supports both offline (SQL generation) and online (live DB) modes.
Auto-imports all models so Alembic detects schema changes.
"""
import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Alembic Config ────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import ALL models so Alembic detects them ─────────────────
try:
    from backend.models.org_models import (
        Base, GroupCompany, Company, CompanyLegalDocument,
        Branch, BusinessUnit, Department, Section, Unit,
        Team, CostCenter, WorkLocation,
    )
    from backend.models.structure_models import (
        EmploymentCategory, JobFamily, GradeLevel,
        Designation, ReportingRelationship, OrgChartNode, Position,
    )
    from backend.models.workforce_config_models import (
        EmploymentTypeConfig, OutsourceVendor, SLAContract,
        SLAKPIResult, VendorEmployee, VendorInvoice,
        VendorAttendance, VendorPerformanceCard,
    )
    from backend.models.shift_holiday_models import (
        ShiftType, HolidayCalendar, WeekendPolicy,
    )
    target_metadata = Base.metadata
except ImportError as e:
    print(f"Warning: Could not import all models: {e}")
    target_metadata = None

# ── Override URL from environment if set ──────────────────────
db_url = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
config.set_main_option("sqlalchemy.url", db_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL script."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, target_metadata=target_metadata,
        literal_binds=True, dialect_opts={"paramstyle": "named"},
        compare_type=True, compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — applies to live DB."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.", poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
