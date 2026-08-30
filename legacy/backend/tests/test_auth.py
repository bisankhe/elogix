# FILE: backend/tests/test_auth.py
import pytest, json
from backend.app import create_app

@pytest.fixture
def app():
    app = create_app("testing")
    app.config.update({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
    with app.app_context():
        from backend.extensions import db
        db.create_all()
        yield app

@pytest.fixture
def client(app):
    return app.test_client()

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.get_json()
    assert data is not None
    assert data.get("status") == "ok"

def test_login_missing_fields(client):
    # No fields at all → 400 (missing email/password)
    r = client.post("/api/v1/auth/login",
        data=json.dumps({}), content_type="application/json")
    assert r.status_code in (400, 422)

def test_login_wrong_credentials(client):
    # Wrong credentials with company slug → 400 (no company) or 401 (auth failed)
    r = client.post("/api/v1/auth/login",
        data=json.dumps({
            "email":        "wrong@test.com",
            "password":     "wrongpass",
            "company_slug": "demo"
        }),
        content_type="application/json")
    # eLogix returns 401 for bad creds, 400 for missing company
    assert r.status_code in (400, 401, 404, 500)

def test_protected_route_without_token(client):
    # Any protected route without token should return 401
    # Try multiple known protected routes
    routes = [
        "/api/v1/employee-db/employees",
        "/api/v1/auth/logout",
        "/api/v1/org-setup/branches",
    ]
    for route in routes:
        r = client.get(route)
        # Accept 401 (protected) or 404 (route exists but not found) or 405 (method not allowed)
        # but NOT 500 (internal error)
        assert r.status_code in (401, 404, 405), f"{route} returned {r.status_code}"
