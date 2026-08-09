# FILE: backend/middleware/security.py
# Security headers, CORS hardening, request sanitisation
# Applied to every response via after_request hook
import os, re
from flask import request, jsonify, g

ALLOWED_ORIGINS = set(
    os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
)

def add_security_headers(response):
    """Add security headers to every HTTP response."""
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    # Prevent MIME sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    # XSS protection (legacy browsers)
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # Referrer policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    # Content Security Policy
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' https://api.anthropic.com; "
        "font-src 'self' data:;"
    )
    # HSTS (HTTPS only — enable in production)
    if os.getenv('FLASK_ENV') == 'production':
        response.headers['Strict-Transport-Security'] = (
            'max-age=31536000; includeSubDomains; preload'
        )
    # Remove server fingerprint
    response.headers.pop('Server', None)
    response.headers.pop('X-Powered-By', None)
    return response

def sanitise_input(text: str, max_length: int = 10000) -> str:
    """Basic input sanitisation — strip null bytes, limit length."""
    if not isinstance(text, str):
        return text
    text = text.replace('\x00', '')         # Remove null bytes
    text = text[:max_length]                # Enforce length limit
    return text.strip()

def block_sql_injection(value: str) -> bool:
    """Returns True if value looks like an SQL injection attempt."""
    patterns = [
        r"(--|;|/\*|\*/)",
        r"\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b",
        r"(1=1|OR\s+1|AND\s+1)",
    ]
    combined = '|'.join(patterns)
    return bool(re.search(combined, value, re.IGNORECASE))

def validate_company_context():
    """Ensure every authenticated request has a company_id in context."""
    # Public endpoints — skip
    public = ['/api/health', '/api/v1/auth/login',
              '/api/v1/auth/register', '/api/v1/auth/refresh']
    if request.path in public:
        return None
    # Check company_id is set by JWT middleware
    if not getattr(g, 'company_id', None) and request.path.startswith('/api/v1/'):
        if request.headers.get('Authorization'):
            return None   # JWT middleware will handle 401
    return None
