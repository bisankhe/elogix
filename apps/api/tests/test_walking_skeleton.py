"""Phase 00's done-when, as executable assertions.

'A fresh clone builds the database from zero migrations, logs in, and reads one
employee.' The schema fixture runs the migrations from zero, so reaching any assertion
in this file already proves the first clause.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth, login, make_tenant


def test_health_reports_a_connected_database(client: TestClient) -> None:
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"


def test_login_then_read_one_employee(client: TestClient, db: Session) -> None:
    _, _, employee = make_tenant(db, "acme")

    token = login(client, slug="acme")

    listed = client.get("/api/v1/employees", headers=auth(token))
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] == 1
    assert body["items"][0]["employee_code"] == "EMP-001"

    one = client.get(f"/api/v1/employees/{employee.id}", headers=auth(token))
    assert one.status_code == 200
    assert one.json()["full_name"] == "Acme Employee"


def test_me_returns_the_authenticated_user(client: TestClient, db: Session) -> None:
    _, user, _ = make_tenant(db, "acme")
    token = login(client, slug="acme")

    body = client.get("/api/v1/auth/me", headers=auth(token)).json()
    assert body["email"] == user.email
    assert body["id"] == str(user.id)
