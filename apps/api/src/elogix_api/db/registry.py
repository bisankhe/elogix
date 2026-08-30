"""The single place Alembic learns about tables.

`Base.metadata` only contains models whose module has actually been imported. A
hand-maintained import list is exactly the kind of thing that drifts silently, and a
missing entry here produces a migration that quietly drops tables. So the list is
explicit *and* `tests/test_registry.py` walks `modules/` and fails if anything is
missing from it.

Add a module's models here in the same commit that creates them.
"""

from importlib import import_module

from elogix_api.db.base import Base

MODEL_MODULES: tuple[str, ...] = (
    "elogix_api.modules.identity.models",
    "elogix_api.modules.employee.models",
    # "elogix_api.modules.org.models",        # phase 02
    # "elogix_api.modules.attendance.models", # phase 04
    # "elogix_api.modules.leave.models",      # phase 05
    # "elogix_api.modules.payroll.models",    # phase 06
    # "elogix_api.modules.ess.models",        # phase 07
)

for _module_name in MODEL_MODULES:
    import_module(_module_name)

target_metadata = Base.metadata
