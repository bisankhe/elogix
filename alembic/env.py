# FILE: alembic/env.py
# eLogix HRMS — Alembic Migration Environment
#
# FIXES:
# 1. Imports backend.models (all models) so Alembic sees all 70+ tables
# 2. Uses backend.extensions.db.metadata (single shared metadata)
# 3. Reads DATABASE_URL from .env — no hardcoded credentials
# 4. Package mode: runs from /opt/elogix same as gunicorn run:app
#
# eLogix Technologies · www.elogix.com.np

import os
import sys
from logging.config import fileConfig
from pathlib import Path
from sqlalchemy import engine_from_config, pool
from alembic import context

HERE         = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load .env
for env_file in [PROJECT_ROOT / '.env', PROJECT_ROOT / 'backend' / '.env']:
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, _, v = line.partition('=')
                    os.environ.setdefault(k.strip(), v.strip().strip('"\''))
        break

def get_url() -> str:
    url = os.getenv('DATABASE_URL', '')
    if url:
        return url.replace('postgres://', 'postgresql://', 1)
    user = os.getenv('POSTGRES_USER', os.getenv('DB_USER', 'postgres'))
    pw   = os.getenv('POSTGRES_PASSWORD', os.getenv('DB_PASS', os.getenv('DB_PASSWORD', '')))
    host = os.getenv('POSTGRES_HOST', os.getenv('DB_HOST', 'elogix_db'))
    port = os.getenv('POSTGRES_PORT', os.getenv('DB_PORT', '5432'))
    db   = os.getenv('POSTGRES_DB', os.getenv('DB_NAME', 'postgres'))
    return f'postgresql://{user}:{pw}@{host}:{port}/{db}'

DATABASE_URL = get_url()

config = context.config
config.set_main_option('sqlalchemy.url', DATABASE_URL)
if config.config_file_name:
    fileConfig(config.config_file_name)

# ── THE KEY FIX: import ALL models ──────────────────────────────────
# Without this, Alembic sees 0 tables and generates empty migrations
target_metadata = None
try:
    import backend.models          # registers all 22+ model files
    from backend.extensions import db
    target_metadata = db.metadata
    n = len(target_metadata.tables)
    print(f'[alembic] ✅ {n} tables registered')
    if n == 0:
        print('[alembic] ⚠️  0 tables — check backend/models/__init__.py')
except Exception as e:
    print(f'[alembic] ❌ Model load failed: {e}')


def run_migrations_offline():
    context.configure(
        url=DATABASE_URL, target_metadata=target_metadata,
        literal_binds=True, compare_type=True, compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix='sqlalchemy.', poolclass=pool.NullPool, url=DATABASE_URL,
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