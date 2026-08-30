"""Tenant isolation.

There is no database-level backstop: the `.where(Model.company_id == ...)` clause in each
query is the entire boundary. That makes this file the security boundary's only proof, so
**every tenant-scoped endpoint added from here on needs a case in `TENANT_SCOPED_READS`**
— a forgotten filter is otherwise a silent cross-tenant leak with nothing to catch it.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.security import create_token
from tests.conftest import auth, login, make_tenant

# (method, path template). `{employee_id}` is filled with the *other* tenant's row.
TENANT_SCOPED_READS = [
    ("GET", "/api/v1/employees"),
    ("GET", "/api/v1/employees/{employee_id}"),
]


def test_a_listing_shows_only_the_callers_own_employees(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "acme")
    make_tenant(db, "globex")

    body = client.get("/api/v1/employees", headers=auth(login(client, slug="acme"))).json()

    assert body["total"] == 1
    assert body["items"][0]["full_name"] == "Acme Employee"


@pytest.mark.parametrize(("method", "path"), TENANT_SCOPED_READS)
def test_no_endpoint_returns_another_tenants_row(
    client: TestClient, db: Session, method: str, path: str
) -> None:
    """Sweeps every tenant-scoped read: nothing may surface the other tenant's data."""
    make_tenant(db, "acme")
    _, _, globex_employee = make_tenant(db, "globex")

    response = client.request(
        method,
        path.format(employee_id=globex_employee.id),
        headers=auth(login(client, slug="acme")),
    )

    assert "Globex" not in response.text, f"{method} {path} leaked another tenant's data"


def test_another_tenants_employee_is_not_readable_by_id(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "acme")
    _, _, globex_employee = make_tenant(db, "globex")

    response = client.get(
        f"/api/v1/employees/{globex_employee.id}",
        headers=auth(login(client, slug="acme")),
    )

    # 404, not 403: the caller must not be able to tell "does not exist" from
    # "exists, belongs to someone else".
    assert response.status_code == 404


def test_a_token_cannot_name_a_company_its_user_does_not_belong_to(
    client: TestClient, db: Session
) -> None:
    """The tenant comes from the signed token, but the user must still belong to it.

    A token forged with this service's key — an insider, or a leaked secret — still
    cannot cross tenants, because the lookup requires the user and company to match.
    """
    _, acme_user, _ = make_tenant(db, "acme")
    globex_company, _, globex_employee = make_tenant(db, "globex")

    crafted = create_token(user_id=acme_user.id, company_id=globex_company.id)[0]

    assert client.get("/api/v1/auth/me", headers=auth(crafted)).status_code == 401
    assert (
        client.get(f"/api/v1/employees/{globex_employee.id}", headers=auth(crafted)).status_code
        == 401
    )


def test_deleting_a_company_does_not_touch_another_tenants_rows(
    client: TestClient, db: Session
) -> None:
    """The ON DELETE CASCADE fans out from companies; it must stop at the tenant edge."""
    acme, _, _ = make_tenant(db, "acme")
    make_tenant(db, "globex")

    db.delete(acme)
    db.commit()

    body = client.get("/api/v1/employees", headers=auth(login(client, slug="globex"))).json()
    assert body["total"] == 1
