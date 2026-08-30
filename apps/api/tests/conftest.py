"""Test configuration.

Tests run against a real PostgreSQL, never SQLite. Every defect the audit found was
Postgres-specific — row-level security, UUID types, `set_config` semantics — and a
SQLite suite would have passed while the production database refused to build.

`docker compose up -d db` provides the server; this points the suite at a separate
database on it so a test run cannot clobber development data.
"""

import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://elogix:elogix@localhost:5432/elogix_test"
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long")
os.environ.setdefault("ENVIRONMENT", "test")
