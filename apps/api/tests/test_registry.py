"""Guards the one rule that keeps the schema honest.

Alembic generates migrations from `Base.metadata`, which only knows about models whose
module has been imported. If someone adds `modules/leave/models.py` and forgets to list
it in `db/registry.py`, autogenerate produces a migration that looks fine and silently
omits — or drops — those tables. This test makes that a build failure.
"""

from pathlib import Path

from elogix_api.db.registry import MODEL_MODULES

MODULES_DIR = Path(__file__).resolve().parents[1] / "src" / "elogix_api" / "modules"


def test_every_models_file_is_registered() -> None:
    on_disk = {
        f"elogix_api.modules.{path.parent.name}.models"
        for path in MODULES_DIR.glob("*/models.py")
    }
    missing = on_disk - set(MODEL_MODULES)
    assert not missing, (
        f"models modules not listed in db/registry.MODEL_MODULES: {sorted(missing)}. "
        "Add them, or Alembic will generate migrations that omit their tables."
    )


def test_registry_entries_all_exist() -> None:
    on_disk = {
        f"elogix_api.modules.{path.parent.name}.models"
        for path in MODULES_DIR.glob("*/models.py")
    }
    stale = set(MODEL_MODULES) - on_disk
    assert not stale, f"registry lists modules that no longer exist: {sorted(stale)}"
