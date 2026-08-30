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
from elogix_api.modules.identity.models import RoleCode, UserRole
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


def test_a_deactivated_user_cannot_use_an_existing_token(client: TestClient, db: Session) -> None:
    _, user, _ = make_tenant(db, "acme")
    token = login(client, slug="acme")
    assert client.get("/api/v1/auth/me", headers=auth(token)).status_code == 200

    # `users` is under RLS, so even the test has to bind the tenant to write to it.
    user.is_active = False
    db.commit()

    assert client.get("/api/v1/auth/me", headers=auth(token)).status_code == 401


# ── User administration ───────────────────────────────────────────────
#
# Added in phase 07: creating logins and pointing them at people is what makes
# self-service reachable at all.

PW = "correct-horse-battery-staple"


def _hr_headers(client: TestClient, db: Session, slug: str = "acme") -> dict[str, str]:
    """The seeded admin, given the role the user-admin routes require."""
    company, user, _ = make_tenant(db, slug)
    db.add(UserRole(company_id=company.id, user_id=user.id, role=RoleCode.SUPER_ADMIN))
    db.commit()
    return auth(login(client, slug=slug))


def _sign_in(client: TestClient, email: str, slug: str = "acme") -> dict[str, str]:
    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PW, "company_slug": slug},
    ).json()["access_token"]
    return auth(token)


def test_creating_a_login_for_an_employee_opens_self_service(
    client: TestClient, db: Session
) -> None:
    headers = _hr_headers(client, db)
    employee = client.get("/api/v1/employees", headers=headers).json()["items"][0]

    created = client.post(
        "/api/v1/auth/users",
        headers=headers,
        json={
            "email": "sita@acme.com.np",
            "full_name": "Sita Sharma",
            "password": PW,
            "employee_id": employee["id"],
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["employee_id"] == employee["id"]

    mine = client.get("/api/v1/ess/me", headers=_sign_in(client, "sita@acme.com.np"))
    assert mine.status_code == 200
    assert mine.json()["employee_code"] == employee["employee_code"]


def test_two_logins_cannot_claim_the_same_employee(client: TestClient, db: Session) -> None:
    """Otherwise "whose leave request is this?" has two answers."""
    headers = _hr_headers(client, db)
    employee = client.get("/api/v1/employees", headers=headers).json()["items"][0]
    body = {"full_name": "Sita Sharma", "password": PW, "employee_id": employee["id"]}

    first = client.post(
        "/api/v1/auth/users", headers=headers, json={**body, "email": "one@acme.com.np"}
    )
    assert first.status_code == 201, first.text

    second = client.post(
        "/api/v1/auth/users", headers=headers, json={**body, "email": "two@acme.com.np"}
    )
    assert second.status_code == 409
    assert "already has one" in second.json()["detail"]


def test_unlinking_a_login_closes_self_service(client: TestClient, db: Session) -> None:
    """The account survives; only the link goes. The leave and the pay belong to the
    employee record, not to the login."""
    headers = _hr_headers(client, db)
    employee = client.get("/api/v1/employees", headers=headers).json()["items"][0]
    user = client.post(
        "/api/v1/auth/users",
        headers=headers,
        json={
            "email": "sita@acme.com.np",
            "full_name": "Sita Sharma",
            "password": PW,
            "employee_id": employee["id"],
        },
    ).json()

    unlinked = client.put(
        f"/api/v1/auth/users/{user['id']}/employee",
        headers=headers,
        json={"employee_id": None},
    )
    assert unlinked.status_code == 200
    assert unlinked.json()["employee_id"] is None

    closed = client.get("/api/v1/ess/me", headers=_sign_in(client, "sita@acme.com.np"))
    assert closed.status_code == 403


def test_managing_logins_needs_an_hr_role(client: TestClient, db: Session) -> None:
    """An ordinary employee must not be able to mint accounts."""
    company, user, _ = make_tenant(db, "acme")
    db.add(UserRole(company_id=company.id, user_id=user.id, role=RoleCode.EMPLOYEE))
    db.commit()
    headers = auth(login(client, slug="acme"))

    assert client.get("/api/v1/auth/users", headers=headers).status_code == 403
    created = client.post(
        "/api/v1/auth/users",
        headers=headers,
        json={"email": "sneaky@acme.com.np", "full_name": "Sneaky", "password": PW},
    )
    assert created.status_code == 403


def test_a_login_cannot_be_linked_to_another_tenants_employee(
    client: TestClient, db: Session
) -> None:
    headers = _hr_headers(client, db)
    _, _, globex_employee = make_tenant(db, "globex")

    response = client.post(
        "/api/v1/auth/users",
        headers=headers,
        json={
            "email": "sneaky@acme.com.np",
            "full_name": "Sneaky",
            "password": PW,
            "employee_id": str(globex_employee.id),
        },
    )
    assert response.status_code == 404
