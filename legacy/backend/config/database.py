"""
FILE: backend/config/database.py
Database connection manager, session factory, and health check.
Supports PostgreSQL 15+ with connection pooling.
"""
import os
import logging
from contextlib import contextmanager
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.pool import QueuePool

log = logging.getLogger(__name__)

# ── Engine factory ────────────────────────────────────────────
def make_engine(database_url: str = None):
    url = database_url or os.getenv(
        "DATABASE_URL",
        "postgresql://elogix_user:elogix_pass@localhost:5432/elogix_hrms"
    )
    # Heroku / Render compat: replace postgres:// with postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(
        url,
        poolclass      = QueuePool,
        pool_size      = int(os.getenv("DB_POOL_SIZE", 10)),
        max_overflow   = int(os.getenv("DB_MAX_OVERFLOW", 20)),
        pool_timeout   = int(os.getenv("DB_POOL_TIMEOUT", 30)),
        pool_recycle   = int(os.getenv("DB_POOL_RECYCLE", 300)),
        pool_pre_ping  = True,       # reconnect on stale connections
        echo           = os.getenv("SQLALCHEMY_ECHO", "false").lower() == "true",
        connect_args   = {
            "options":           "-csearch_path=elogix,public",
            "connect_timeout":   10,
            "application_name":  "elogix_hrms_backend",
        },
    )
    # Set timezone to Nepal (UTC+5:45)
    @event.listens_for(engine, "connect")
    def set_timezone(dbapi_conn, conn_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("SET TIME ZONE 'Asia/Kathmandu'")
        cursor.close()

    return engine


# ── Session factory ───────────────────────────────────────────
def make_session_factory(engine):
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    return scoped_session(factory)


# ── Context manager for manual session use ────────────────────
@contextmanager
def db_session(engine):
    """
    Use for scripts / Celery tasks outside Flask context:
        with db_session(engine) as session:
            session.query(Company).all()
    """
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ── Health check ──────────────────────────────────────────────
def check_db_health(engine) -> dict:
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version(), NOW() AT TIME ZONE 'Asia/Kathmandu' AS nepal_time"))
            row = result.fetchone()
            return {
                "status":      "healthy",
                "pg_version":  str(row[0]).split(" ")[1],
                "nepal_time":  str(row[1]),
                "pool_size":   engine.pool.size(),
                "checked_out": engine.pool.checkedout(),
            }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


# ── Alembic config helper ─────────────────────────────────────
def get_alembic_url() -> str:
    """Used by alembic/env.py"""
    url = os.getenv("DATABASE_URL", "postgresql://elogix_user:elogix_pass@localhost:5432/elogix_hrms")
    return url.replace("postgres://", "postgresql://", 1) if url.startswith("postgres://") else url


# ── Schema initialiser ────────────────────────────────────────
def init_schema(engine, schema_file: str = None):
    """
    Run the complete schema SQL on a fresh DB.
    Usage: python -c "from backend.config.database import *; init_schema(make_engine())"
    """
    import pathlib
    if not schema_file:
        here = pathlib.Path(__file__).parent.parent.parent
        schema_file = str(here / "database" / "schemas" / "complete_schema.sql")

    with open(schema_file) as f:
        sql = f.read()

    with engine.connect() as conn:
        conn.execute(text(sql))
        conn.commit()
    log.info(f"Schema initialised from {schema_file}")
