# FILE: backend/__init__.py
# eLogix HRMS — Backend Package Init
# FIXED: was `from .app import create_app` which triggered create_app() execution
#        at import time → db.init_app(app) → NameError: db not defined
#
# The __init__.py must NOT auto-execute create_app().
# create_app() is called explicitly by:
#   - wsgi.py (production Gunicorn entrypoint)
#   - run.py  (development flask run)
#   - tests   (test fixtures)
#
# alembic/env.py imports `from backend.models import Base` which triggers
# this __init__.py — if we call create_app() here it crashes.
# eLogix Technologies · www.elogix.com.np
