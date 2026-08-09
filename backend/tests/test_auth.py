# FILE: backend/tests/test_auth.py
import pytest, json
from backend.app import create_app

@pytest.fixture
def app():
    app = create_app('testing')
    app.config.update({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'})
    with app.app_context():
        from backend.extensions import db
        db.create_all()
        yield app

@pytest.fixture
def client(app):
    return app.test_client()

def test_health(client):
    r = client.get('/api/health')
    assert r.status_code == 200
    assert r.json['status'] == 'ok'

def test_login_missing_fields(client):
    r = client.post('/api/v1/auth/login',
        data=json.dumps({}), content_type='application/json')
    assert r.status_code in (400, 422)

def test_login_wrong_credentials(client):
    r = client.post('/api/v1/auth/login',
        data=json.dumps({'email': 'wrong@test.com', 'password': 'wrongpass'}),
        content_type='application/json')
    assert r.status_code in (401, 404)

def test_protected_route_without_token(client):
    r = client.get('/api/v1/employee-db/employees')
    assert r.status_code == 401
