# FILE: alembic/env.py
# eLogix HRMS — Alembic Migration Environment
# Fixed: imports Base.metadata from backend.models (not db from config.database)
# eLogix Technologies · www.elogix.com.np

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Add project paths ─────────────────────────────────────────────────
HERE         = Path(__file__).resolve().parent     # /opt/elogix/alembic/
PROJECT_ROOT = HERE.parent                          # /opt/elogix/
BACKEND_DIR  = PROJECT_ROOT / 'backend'             # /opt/elogix/backend/

sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(BACKEND_DIR))

# ── Load .env ─────────────────────────────────────────────────────────
for env_file in [PROJECT_ROOT/'.env', BACKEND_DIR/'.env']:
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, _, v = line.partition('=')
                    os.environ.setdefault(k.strip(), v.strip().strip('"\''))
        break

# ── Database URL ──────────────────────────────────────────────────────
def get_database_url():
    url = os.getenv('DATABASE_URL')
    if url:
        return url.replace('postgres://', 'postgresql://', 1)
    user   = os.getenv('POSTGRES_USER',     os.getenv('DB_USER',     'postgres'))
    pw     = os.getenv('POSTGRES_PASSWORD', os.getenv('DB_PASSWORD', 'NeoHRMS@2026'))
    host   = os.getenv('DB_HOST',           os.getenv('POSTGRES_HOST','elogix_db'))
    port   = os.getenv('DB_PORT',           os.getenv('POSTGRES_PORT','5432'))
    dbname = os.getenv('POSTGRES_DB',       os.getenv('DB_NAME',     'postgres'))
    return f'postgresql://{user}:{pw}@{host}:{port}/{dbname}'

DATABASE_URL = get_database_url()

config = context.config
config.set_main_option('sqlalchemy.url', DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import Base.metadata — THE KEY FIX ───────────────────────────────
# Previously imported db.metadata from config.database, which is a plain
# SQLAlchemy engine/session factory with no model metadata.
# Our models inherit from Base in backend/models/org_models.py.
# We must import Base.metadata for autogenerate to see all tables.
try:
    from backend.models import Base
    target_metadata = Base.metadata
    print(f'[alembic] ✅ Loaded Base.metadata — {len(Base.metadata.tables)} tables registered')
except ImportError:
    try:
        from models import Base
        target_metadata = Base.metadata
        print(f'[alembic] ✅ Loaded Base.metadata (fallback) — {len(Base.metadata.tables)} tables registered')
    except ImportError as e:
        print(f'[alembic] ❌ Could not import Base from models ({e})')
        print('[alembic]    autogenerate will NOT detect table changes')
        target_metadata = None


def run_migrations_offline() -> None:
    url = config.get_main_option('sqlalchemy.url')
    context.configure(
        url=url, target_metadata=target_metadata,
        literal_binds=True, dialect_opts={'paramstyle': 'named'},
        compare_type=True, compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix='sqlalchemy.', poolclass=pool.NullPool,
        url=DATABASE_URL,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata,
            compare_type=True, compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
