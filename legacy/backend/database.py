"""
FILE: backend/database.py
Compatibility shim — re-exports db and db_session so legacy route files
that do `from ..database import db_session` continue to work.
All new code should use `from .extensions import db` instead.
"""
from .extensions import db

# Some legacy route files import `db_session` directly
# We provide it as an alias for the Flask-SQLAlchemy session
db_session = db.session

__all__ = ["db", "db_session"]
