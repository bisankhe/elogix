"""Tenant isolation.

Phase 01 adds row-level security underneath these guarantees. These tests are written
against the API's observable behaviour, not the mechanism, so they keep passing — and
keep being meaningful — once RLS lands.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.security import create_token
from tests.conftest import auth, login, make_tenant


def test_a_listing_shows_only_the_callers_own_employees(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "acme")
    make_tenant(db, "globex")

    body = client.get("/api/v1/employees", headers=auth(login(client, slug="acme"))).json()

    assert body["total"] == 1
    assert body["items"][0]["full_name"] == "Acme Employee"


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
