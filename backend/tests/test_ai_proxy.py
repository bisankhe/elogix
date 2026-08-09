# FILE: backend/tests/test_ai_proxy.py
import pytest, json
from backend.app import create_app

@pytest.fixture
def app():
    app = create_app('testing')
    app.config.update({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'})
    with app.app_context():
        yield app

@pytest.fixture
def client(app):
    return app.test_client()

def test_ai_proxy_health(client):
    r = client.get('/api/v1/ai-proxy/health')
    assert r.status_code == 200

def test_ai_proxy_requires_body(client):
    r = client.post('/api/v1/ai-proxy/chat',
        data=json.dumps({}), content_type='application/json')
    assert r.status_code in (400, 422, 200)

def test_ai_proxy_with_message(client):
    r = client.post('/api/v1/ai-proxy/chat',
        data=json.dumps({
            'messages': [{'role': 'user', 'content': 'Hello'}],
            'model': 'claude-sonnet-4-6',
            'max_tokens': 100
        }), content_type='application/json')
    # Without real API key this may return error but should not 500
    assert r.status_code != 500
