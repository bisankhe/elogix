# FILE: backend/middleware/rate_limit.py
# Per-tenant API rate limiting — prevents one company overloading the server
from flask import request, jsonify, g
from functools import wraps
from datetime import datetime, timedelta
import os, redis, json

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

try:
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    REDIS_OK = True
except Exception:
    REDIS_OK = False
    r = None

# Rate limit tiers (requests per minute)
LIMITS = {
    'ai_endpoint':    {'per_min': 20,  'per_hour': 200},
    'auth_endpoint':  {'per_min': 10,  'per_hour': 100},
    'general_api':    {'per_min': 120, 'per_hour': 2000},
    'file_upload':    {'per_min': 10,  'per_hour': 50},
}

def get_rate_limit_key(endpoint_type: str) -> str:
    company_id = getattr(g, 'company_id', 'anonymous')
    user_id    = getattr(g, 'user_id', request.remote_addr)
    minute     = datetime.utcnow().strftime('%Y%m%d%H%M')
    return f"ratelimit:{endpoint_type}:{company_id}:{user_id}:{minute}"

def check_rate_limit(endpoint_type: str = 'general_api'):
    """Returns (allowed: bool, remaining: int, reset_seconds: int)"""
    if not REDIS_OK:
        return True, 999, 60   # Redis down → allow (fail open)
    limit = LIMITS.get(endpoint_type, LIMITS['general_api'])
    key   = get_rate_limit_key(endpoint_type)
    pipe  = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 60)
    count, _ = pipe.execute()
    allowed   = count <= limit['per_min']
    remaining = max(0, limit['per_min'] - count)
    return allowed, remaining, 60

def rate_limit(endpoint_type: str = 'general_api'):
    """Decorator: apply rate limit to any route."""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            allowed, remaining, reset = check_rate_limit(endpoint_type)
            if not allowed:
                resp = jsonify({
                    'success': False,
                    'error': 'Rate limit exceeded. Please slow down.',
                    'retry_after': reset,
                })
                resp.status_code = 429
                resp.headers['X-RateLimit-Remaining'] = '0'
                resp.headers['Retry-After'] = str(reset)
                return resp
            response = f(*args, **kwargs)
            return response
        return wrapped
    return decorator
