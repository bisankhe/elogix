"""Refresh sessions, rotation and revocation.

Phase 00 kept both tokens in localStorage, which meant any injected script could read a
30-day credential. The refresh token now lives in an httpOnly cookie and has a row in
`auth_sessions`, so it can be revoked server-side rather than merely expiring.
"""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.core.tenancy import set_current_company
from elogix_api.modules.identity.models import AuthSession
from elogix_api.modules.identity.router import REFRESH_COOKIE
from tests.conftest import PASSWORD, auth, make_tenant


def _login(client: TestClient, slug: str = "acme"):  # noqa: ANN202
    return client.post(
        "/api/v1/auth/login",
        json={"email": f"admin@{slug}.com.np", "password": PASSWORD, "company_slug": slug},
    )


def test_the_refresh_token_never_appears_in_the_response_body(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "acme")

    response = _login(client)

    assert response.status_code == 200
    assert "refresh_token" not in response.json()
    assert REFRESH_COOKIE in response.cookies


def test_the_refresh_cookie_is_httponly_and_scoped(client: TestClient, db: Session) -> None:
    make_tenant(db, "acme")

    response = _login(client)

    cookie_header = response.headers["set-cookie"]
    assert "HttpOnly" in cookie_header
    # Scoped to the auth routes so it is not replayed on every ordinary API call.
    assert "Path=/api/v1/auth" in cookie_header


def test_refresh_issues_a_working_access_token(client: TestClient, db: Session) -> None:
    make_tenant(db, "acme")
    _login(client)

    refreshed = client.post("/api/v1/auth/refresh")

    assert refreshed.status_code == 200
    token = refreshed.json()["access_token"]
    assert client.get("/api/v1/auth/me", headers=auth(token)).status_code == 200


def test_a_used_refresh_token_cannot_be_used_again(client: TestClient, db: Session) -> None:
    """Rotation: a stolen refresh token is good at most once, and using it burns the
    legitimate holder's copy too, which surfaces the theft instead of hiding it."""
    make_tenant(db, "acme")
    original = _login(client).cookies[REFRESH_COOKIE]

    assert client.post("/api/v1/auth/refresh").status_code == 200

    client.cookies.set(REFRESH_COOKIE, original)
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_logout_revokes_the_session(client: TestClient, db: Session) -> None:
    company, _, _ = make_tenant(db, "acme")
    _login(client)

    assert client.post("/api/v1/auth/logout").status_code == 204
    assert client.post("/api/v1/auth/refresh").status_code == 401

    set_current_company(db, company.id)
    row = db.execute(select(AuthSession).where(AuthSession.company_id == company.id)).scalar_one()
    assert row.revoked_at is not None


def test_logout_without_a_cookie_is_a_no_op(client: TestClient, db: Session) -> None:
    make_tenant(db, "acme")
    assert client.post("/api/v1/auth/logout").status_code == 204


def test_refresh_without_a_cookie_is_rejected(client: TestClient, db: Session) -> None:
    make_tenant(db, "acme")
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_an_access_token_is_not_accepted_as_a_refresh_token(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "acme")
    access = _login(client).json()["access_token"]

    client.cookies.set(REFRESH_COOKIE, access)
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_login_records_one_session_row(client: TestClient, db: Session) -> None:
    company, user, _ = make_tenant(db, "acme")
    _login(client)

    set_current_company(db, company.id)
    rows = db.execute(select(AuthSession).where(AuthSession.user_id == user.id)).scalars().all()

    assert len(rows) == 1
    assert rows[0].revoked_at is None
