# FILE: alembic/env.py
# eLogix HRMS — Alembic Migration Environment
# Reads DATABASE_URL from environment / .env file
# Works both in Docker container and on bare VPS
# eLogix Technologies · www.elogix.com.np

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Add project paths so models can be imported ───────────────────────
# This file is at: /opt/elogix/alembic/env.py
# Backend code is: /opt/elogix/backend/
HERE        = Path(__file__).resolve().parent          # /opt/elogix/alembic/
PROJECT_ROOT= HERE.parent                               # /opt/elogix/
BACKEND_DIR = PROJECT_ROOT / 'backend'                  # /opt/elogix/backend/

sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(BACKEND_DIR))

# ── Load .env file ────────────────────────────────────────────────────
# Try multiple locations so it works in Docker and on bare VPS
def load_env():
    env_files = [
        PROJECT_ROOT / '.env',           # /opt/elogix/.env
        BACKEND_DIR  / '.env',           # /opt/elogix/backend/.env
        Path('/etc/elogix/.env'),        # system-level env
    ]
    for env_file in env_files:
        if env_file.exists():
            print(f'[alembic] Loading env from: {env_file}')
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, _, val = line.partition('=')
                        os.environ.setdefault(key.strip(), val.strip().strip('"\''))
            return str(env_file)
    return None

env_path = load_env()
if not env_path:
    print('[alembic] WARNING: No .env file found — using environment variables only')

# ── Build database URL ────────────────────────────────────────────────
def get_database_url():
    # Priority 1: Full DATABASE_URL env var (Docker Compose sets this)
    url = os.getenv('DATABASE_URL')
    if url:
        # Fix Heroku-style postgres:// → postgresql://
        if url.startswith('postgres://'):
            url = 'postgresql://' + url[len('postgres://'):]
        return url

    # Priority 2: Individual components
    user   = os.getenv('POSTGRES_USER',     os.getenv('DB_USER',     'elogix'))
    pw     = os.getenv('POSTGRES_PASSWORD', os.getenv('DB_PASSWORD', ''))
    host   = os.getenv('DB_HOST',           os.getenv('POSTGRES_HOST','elogix_db'))
    port   = os.getenv('DB_PORT',           os.getenv('POSTGRES_PORT','5432'))
    dbname = os.getenv('POSTGRES_DB',       os.getenv('DB_NAME',     'elogix_prod'))

    url = f'postgresql://{user}:{pw}@{host}:{port}/{dbname}'
    return url

DATABASE_URL = get_database_url()
print(f'[alembic] Connecting to: {DATABASE_URL.replace(DATABASE_URL.split(":")[2].split("@")[0], "****")}')

# ── Alembic config ────────────────────────────────────────────────────
config = context.config
config.set_main_option('sqlalchemy.url', DATABASE_URL)

# Set up loggers from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import all models so Alembic can detect schema changes ────────────
# (needed for --autogenerate to work)
try:
    from config.database import db
    target_metadata = db.metadata
except ImportError:
    try:
        from backend.config.database import db
        target_metadata = db.metadata
    except ImportError:
        print('[alembic] WARNING: Could not import models — autogenerate may not detect all changes')
        target_metadata = None


# ── Migration functions ───────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (generate SQL without connecting)."""
    url = config.get_main_option('sqlalchemy.url')
    context.configure(
        url             = url,
        target_metadata = target_metadata,
        literal_binds   = True,
        dialect_opts    = {'paramstyle': 'named'},
        compare_type    = True,
        compare_server_default = True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (apply directly to DB)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix  = 'sqlalchemy.',
        poolclass = pool.NullPool,
        url     = DATABASE_URL,
    )
    with connectable.connect() as connection:
        context.configure(
            connection      = connection,
            target_metadata = target_metadata,
            compare_type    = True,
            compare_server_default = True,
            # Include schema for multi-tenant RLS
            include_schemas = False,
            # Don't drop tables that exist in DB but not in models
            # (safety: prevents accidental data loss)
            render_as_batch = False,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
