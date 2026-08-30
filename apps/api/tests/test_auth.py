"""Authentication boundaries.

The prototype's backend registered 1,866 routes and never served an authenticated
request — it rejected tokens issued by its own auth service. These are the assertions
that would have caught that on day one.
"""

import uuid

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.security import ALGORITHM, create_token, decode_token
from elogix_api.core.tenancy import set_current_company
from tests.conftest import PASSWORD, auth, login, make_tenant


def test_a_token_this_service_issued_is_accepted_by_this_service(
    client: TestClient, db: Session
) -> None:
    """The regression test for the prototype's headline defect."""
    _, user, _ = make_tenant(db, "acme")
    token = create_token(user_id=user.id, company_id=user.company_id)[0]

    assert client.get("/api/v1/auth/me", headers=auth(token)).status_code == 200


def test_round_trip_preserves_the_claims(db: Session) -> None:
    _, user, _ = make_tenant(db, "acme")
    token, jti = create_token(user_id=user.id, company_id=user.company_id)
    claims = decode_token(token)

    assert claims.jti == jti

    assert claims.user_id == user.id
    assert claims.company_id == user.company_id
    assert claims.kind == "access"


@pytest.mark.parametrize(
    ("field", "value"),
    [("password", "wrong"), ("email", "nobody@acme.com.np"), ("company_slug", "nosuchtenant")],
)
def test_bad_credentials_are_rejected(
    client: TestClient, db: Session, field: str, value: str
) -> None:
    make_tenant(db, "acme")
    payload = {"email": "admin@acme.com.np", "password": PASSWORD, "company_slug": "acme"}
    payload[field] = value

    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    # Same message for every failure — the response must not reveal which tenants or
    # accounts exist.
    assert response.json()["detail"] == "Invalid credentials"


def test_protected_routes_reject_anonymous_callers(client: TestClient) -> None:
    assert client.get("/api/v1/employees").status_code == 401
    assert client.get("/api/v1/auth/me").status_code == 401


def test_a_refresh_token_is_not_accepted_as_an_access_token(
    client: TestClient, db: Session
) -> None:
    _, user, _ = make_tenant(db, "acme")
    refresh = create_token(user_id=user.id, company_id=user.company_id, kind="refresh")[0]

    assert client.get("/api/v1/auth/me", headers=auth(refresh)).status_code == 401


def test_a_token_signed_with_another_key_is_rejected(client: TestClient, db: Session) -> None:
    _, user, _ = make_tenant(db, "acme")
    forged = jwt.encode(
        {
            "sub": str(user.id),
            "company_id": str(user.company_id),
            "kind": "access",
            "jti": str(uuid.uuid4()),
            "iss": "elogix",
            "aud": "elogix-api",
            "exp": 9999999999,
            "iat": 1,
        },
        "an-attacker-controlled-secret-key-x",
        algorithm=ALGORITHM,
    )

    assert client.get("/api/v1/auth/me", headers=auth(forged)).status_code == 401


def test_a_deactivated_user_cannot_use_an_existing_token(
    client: TestClient, db: Session
) -> None:
    _, user, _ = make_tenant(db, "acme")
    token = login(client, slug="acme")
    assert client.get("/api/v1/auth/me", headers=auth(token)).status_code == 200

    # `users` is under RLS, so even the test has to bind the tenant to write to it.
    set_current_company(db, user.company_id)
    user.is_active = False
    db.commit()

    assert client.get("/api/v1/auth/me", headers=auth(token)).status_code == 401
