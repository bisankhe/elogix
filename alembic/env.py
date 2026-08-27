# FILE: alembic/env.py
# eLogix HRMS — Alembic Migration Environment
# FIXED: imports db directly from extensions, NOT through backend/__init__.py
# which was triggering create_app() → db.init_app(app) → NameError: db
# eLogix Technologies · www.elogix.com.np

import os, sys
from logging.config import fileConfig
from pathlib import Path
from sqlalchemy import engine_from_config, pool
from alembic import context

HERE         = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
BACKEND_DIR  = PROJECT_ROOT / 'backend'

sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(BACKEND_DIR))

# Load .env
for env_file in [PROJECT_ROOT/'.env', BACKEND_DIR/'.env']:
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line=line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k,_,v=line.partition('=')
                    os.environ.setdefault(k.strip(), v.strip().strip('"\''))
        break

def get_url():
    url = os.getenv('DATABASE_URL')
    if url: return url.replace('postgres://','postgresql://',1)
    u=os.getenv('DB_USER', os.getenv('POSTGRES_USER','elogix_prod'))
    p=os.getenv('DB_PASS', os.getenv('DB_PASSWORD', os.getenv('POSTGRES_PASSWORD','')))
    h=os.getenv('DB_HOST', 'localhost')
    port=os.getenv('DB_PORT','5432')
    d=os.getenv('DB_NAME', os.getenv('POSTGRES_DB','elogix_hrms_prod'))
    return f'postgresql://{u}:{p}@{h}:{port}/{d}'

DATABASE_URL = get_url()
config = context.config
config.set_main_option('sqlalchemy.url', DATABASE_URL)

if config.config_file_name:
    fileConfig(config.config_file_name)

# Import metadata WITHOUT triggering backend/__init__.py
target_metadata = None
try:
    from extensions import db
    # Import model files directly
    try: from app.models import attendance_log
    except ImportError: pass
    target_metadata = db.metadata
    print(f'[alembic] ✅ {len(target_metadata.tables)} tables in metadata')
except Exception as e:
    print(f'[alembic] ⚠️  Could not load metadata: {e}')

def run_migrations_offline():
    context.configure(url=DATABASE_URL, target_metadata=target_metadata,
        literal_binds=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix='sqlalchemy.', poolclass=pool.NullPool, url=DATABASE_URL)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata,
            compare_type=True, compare_server_default=True)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
