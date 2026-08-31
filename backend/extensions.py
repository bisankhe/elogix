# FILE: backend/extensions.py
# eLogix HRMS — Flask Extension Instances
# All extensions created here, initialized in app.py via init_app()
# This prevents circular imports across the entire codebase
# eLogix Technologies · www.elogix.com.np

from flask_sqlalchemy import SQLAlchemy
from flask_migrate    import Migrate
from flask_jwt_extended import JWTManager
from flask_caching    import Cache
from flask_limiter    import Limiter
from flask_limiter.util import get_remote_address
from flask_mail       import Mail

# ── Core database ──────────────────────────────────────────────────────
db      = SQLAlchemy()
migrate = Migrate()

# ── Authentication ──────────────────────────────────────────────────────
jwt     = JWTManager()

# ── Caching (Redis in prod, SimpleCache in dev) ─────────────────────────
cache   = Cache()

# ── Rate limiting ───────────────────────────────────────────────────────
limiter = Limiter(
    key_func          = get_remote_address,
    default_limits    = ['200 per hour'],
    storage_uri       = 'memory://',   # overridden in init_app with Redis
)

# ── Email ───────────────────────────────────────────────────────────────
mail    = Mail()
