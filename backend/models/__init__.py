# FILE: backend/models/__init__.py
# eLogix HRMS — Model Package Init
# Fixed: Base added to __all__ so alembic/env.py can import it
# eLogix Technologies · www.elogix.com.np

from .org_models import (
    Base, GroupCompany, Company, CompanyLegalDocument,
    Branch, BusinessUnit, Department, Section, Unit,
    Team, CostCenter, WorkLocation,
)

# Import all other models so Base.metadata is fully populated
# (SQLAlchemy only registers tables when the model class is imported)
try: from .saas_models        import *
except ImportError: pass
try: from .employee_models    import *
except ImportError: pass
try: from .recruitment_models import *
except ImportError: pass
try: from .ats_models         import *
except ImportError: pass
try: from .attendance_log     import *
except ImportError: pass
try: from .payroll_tax_models import *
except ImportError: pass
try: from .hr_policy_models   import *
except ImportError: pass
try: from .audit_models       import *
except ImportError: pass
try: from .billing_models     import *
except ImportError: pass
try: from .ai_models          import *
except ImportError: pass
try: from .company_setup_models import *
except ImportError: pass
try: from .dept_team_models   import *
except ImportError: pass
try: from .group_branch_models import *
except ImportError: pass
try: from .org_setup_models   import *
except ImportError: pass
try: from .org_structure_models import *
except ImportError: pass
try: from .structure_models   import *
except ImportError: pass
try: from .structure_hierarchy_models import *
except ImportError: pass
try: from .position_management_models import *
except ImportError: pass
try: from .employment_category_models import *
except ImportError: pass
try: from .shift_holiday_models import *
except ImportError: pass
try: from .workforce_config_models import *
except ImportError: pass
try: from .attendance_reports_models import *
except ImportError: pass

# ── PUBLIC API ────────────────────────────────────────────────────────
# Base MUST be first so alembic/env.py can do: from backend.models import Base
__all__ = [
    "Base",                        # ← KEY: was missing, caused alembic to see no tables
    "GroupCompany", "Company", "CompanyLegalDocument",
    "Branch", "BusinessUnit", "Department", "Section", "Unit",
    "Team", "CostCenter", "WorkLocation",
]
