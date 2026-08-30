# FILE: backend/models/__init__.py
# eLogix HRMS — SQLAlchemy Models Package
#
# CRITICAL: Every model file MUST be imported here.
# Alembic's autogenerate scans db.metadata — it only sees models
# that have been imported at least once. If a model file is not
# imported here, its tables will NOT appear in migrations.
#
# This is why "autogenerate" was producing 0 tables — models/__init__.py
# was not importing all the model files.
#
# eLogix Technologies · www.elogix.com.np

# ── Core Models ────────────────────────────────────────────────────────
from backend.models.org_models             import *   # noqa: F401,F403
from backend.models.org_setup_models       import *   # noqa: F401,F403
from backend.models.org_structure_models   import *   # noqa: F401,F403
from backend.models.company_setup_models   import *   # noqa: F401,F403
from backend.models.structure_models       import *   # noqa: F401,F403
from backend.models.structure_hierarchy_models import * # noqa: F401,F403
from backend.models.group_branch_models    import *   # noqa: F401,F403

# ── Employees ──────────────────────────────────────────────────────────
from backend.models.employee_models        import *   # noqa: F401,F403
from backend.models.employment_category_models import * # noqa: F401,F403
from backend.models.position_management_models import * # noqa: F401,F403

# ── Department & Team ──────────────────────────────────────────────────
from backend.models.dept_team_models       import *   # noqa: F401,F403
from backend.models.workforce_config_models import *  # noqa: F401,F403

# ── Attendance ─────────────────────────────────────────────────────────
from backend.models.attendance_log         import *   # noqa: F401,F403
from backend.models.attendance_reports_models import * # noqa: F401,F403
from backend.models.shift_holiday_models   import *   # noqa: F401,F403

# ── Payroll & Tax ──────────────────────────────────────────────────────
from backend.models.payroll_tax_models     import *   # noqa: F401,F403

# ── Recruitment / ATS ─────────────────────────────────────────────────
from backend.models.recruitment_models     import *   # noqa: F401,F403
from backend.models.ats_models             import *   # noqa: F401,F403

# ── HR Policy ─────────────────────────────────────────────────────────
from backend.models.hr_policy_models       import *   # noqa: F401,F403

# ── Billing / SaaS ────────────────────────────────────────────────────
from backend.models.billing_models         import *   # noqa: F401,F403
from backend.saas.models                   import *   # noqa: F401,F403

# ── AI / Analytics ────────────────────────────────────────────────────
from backend.models.ai_models              import *   # noqa: F401,F403
from backend.models.audit_models           import *   # noqa: F401,F403

# ── Expose db and Base for Alembic ────────────────────────────────────
from backend.extensions import db
Base = db.Model