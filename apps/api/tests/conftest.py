"""Test configuration.

Tests run against a real PostgreSQL, never SQLite. Every defect the audit found was
Postgres-specific — row-level security, UUID types, `set_config` semantics — and a
SQLite suite would have passed while the production database refused to build.

Two connections, mirroring production: the suite builds the schema through the owner
(`DATABASE_ADMIN_URL`) by running the migrations from zero, and everything else runs
through the restricted runtime role, so RLS is in force for the tests exactly as it is
for the application.
"""

import os
from collections.abc import Iterator
from datetime import date

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://elogix_app:elogix_app@localhost:5432/elogix_test"
)
os.environ.setdefault(
    "DATABASE_ADMIN_URL", "postgresql+psycopg://elogix:elogix@localhost:5432/elogix_test"
)
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long")
os.environ.setdefault("ENVIRONMENT", "test")

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from elogix_api.core.security import hash_password  # noqa: E402
from elogix_api.core.tenancy import clear_current_company, set_current_company  # noqa: E402
from elogix_api.db.session import SessionLocal  # noqa: E402
from elogix_api.main import create_app  # noqa: E402
from elogix_api.modules.employee.models import Employee, EmployeeStatus  # noqa: E402
from elogix_api.modules.identity.models import Company, PlanTier, User  # noqa: E402
from elogix_api.settings import get_settings  # noqa: E402

PASSWORD = "correct-horse-battery-staple"

_API_DIR = os.path.dirname(os.path.dirname(__file__))
ALEMBIC_INI = os.path.join(_API_DIR, "alembic.ini")

TENANT_TABLES = ("users", "employees", "user_roles", "company_modules", "auth_sessions")


@pytest.fixture(scope="session")
def admin_engine():  # noqa: ANN201
    """Owner connection. Only for schema setup and teardown — never for exercising code."""
    engine = create_engine(get_settings().migration_url, poolclass=None)
    yield engine
    engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def _schema(admin_engine) -> Iterator[None]:  # noqa: ANN001
    """Build the schema once per session by running the migrations from zero."""
    with admin_engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))

    cfg = Config(ALEMBIC_INI)
    cfg.set_main_option("script_location", os.path.join(_API_DIR, "migrations"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean_tables(_schema: None, admin_engine) -> Iterator[None]:  # noqa: ANN001
    """Truncate through the owner: the runtime role has DML only, not TRUNCATE."""
    clear_current_company()
    yield
    clear_current_company()
    with admin_engine.begin() as conn:
        conn.execute(
            text(f"TRUNCATE companies, {', '.join(TENANT_TABLES)} RESTART IDENTITY CASCADE")
        )


@pytest.fixture
def db() -> Iterator[Session]:
    """A runtime-role session, subject to RLS exactly like the application's."""
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

    # `users` and `employees` are under RLS, and the fixture runs as the runtime role,
    # so the tenant has to be bound before either insert is allowed.
    set_current_company(db, company.id)

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
    clear_current_company()
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
