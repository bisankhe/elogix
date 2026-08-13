"""
FILE: backend/extensions.py
Shared Flask extension instances — imported by all models and routes.
eLogix Technologies · www.elogix.com.np
"""
from flask_sqlalchemy import SQLAlchemy
from flask_caching    import Cache
from flask_limiter    import Limiter
from flask_limiter.util import get_remote_address

# Core database extension
db = SQLAlchemy()

# Cache (Redis in prod, SimpleCache in dev/test)
cache = Cache()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


def init_extensions(app):
    """Initialise all Flask extensions with the app."""
    db.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
