"""Test configuration.

Tests run against a real PostgreSQL, never SQLite. Every defect the audit found was
Postgres-specific — UUID types, enum handling, constraint semantics — and a SQLite suite
would have passed while the production database refused to build.

The schema is built by running the Alembic migrations from zero, not by
`metadata.create_all`, so the suite proves the migrations work — which is what a fresh
clone and a production deploy actually depend on.
"""

import os
from collections.abc import Iterator
from datetime import date

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://elogix:elogix@localhost:5432/elogix_test"
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long")
os.environ.setdefault("ENVIRONMENT", "test")

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from elogix_api.core.security import hash_password  # noqa: E402
from elogix_api.db.session import SessionLocal, engine  # noqa: E402
from elogix_api.main import create_app  # noqa: E402
from elogix_api.modules.employee.models import Employee, EmployeeStatus  # noqa: E402
from elogix_api.modules.identity.models import Company, PlanTier, User  # noqa: E402

PASSWORD = "correct-horse-battery-staple"

_API_DIR = os.path.dirname(os.path.dirname(__file__))
ALEMBIC_INI = os.path.join(_API_DIR, "alembic.ini")

# Every table carrying a company_id. Keep in step with the models — the isolation tests
# are the only thing standing between a forgotten filter and a cross-tenant leak.
TENANT_TABLES = ("users", "employees", "user_roles", "company_modules", "auth_sessions")


@pytest.fixture(scope="session", autouse=True)
def _schema() -> Iterator[None]:
    """Build the schema once per session by running the migrations from zero."""
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))

    cfg = Config(ALEMBIC_INI)
    cfg.set_main_option("script_location", os.path.join(_API_DIR, "migrations"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean_tables(_schema: None) -> Iterator[None]:
    yield
    with engine.begin() as conn:
        conn.execute(
            text(f"TRUNCATE companies, {', '.join(TENANT_TABLES)} RESTART IDENTITY CASCADE")
        )


@pytest.fixture
def db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
        session.rollback()


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app()) as c:
        yield c


def make_tenant(
    db: Session, slug: str, *, plan_tier: PlanTier = PlanTier.ENTERPRISE
) -> tuple[Company, User, Employee]:
    """One company, one login, one employee. The unit every tenancy test is built from.

    Defaults to the top plan so entitlement checks do not accidentally gate tests that
    are about something else; the entitlement tests set the tier explicitly.
    """
    company = Company(name=f"{slug.title()} Ltd", slug=slug, plan_tier=plan_tier)
    db.add(company)
    db.flush()

    user = User(
        company_id=company.id,
        email=f"admin@{slug}.com.np",
        password_hash=hash_password(PASSWORD),
        full_name=f"{slug.title()} Admin",
    )
    employee = Employee(
        company_id=company.id,
        employee_code="EMP-001",
        full_name=f"{slug.title()} Employee",
        email=f"emp001@{slug}.com.np",
        status=EmployeeStatus.ACTIVE,
        joined_on=date(2024, 1, 15),
    )
    db.add_all([user, employee])
    db.commit()
    return company, user, employee


def login(client: TestClient, *, slug: str) -> str:
    """Log in and return the access token. The refresh token stays in the cookie jar."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": f"admin@{slug}.com.np", "password": PASSWORD, "company_slug": slug},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
