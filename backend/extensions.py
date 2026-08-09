"""
FILE: backend/extensions.py
Shared SQLAlchemy db instance — imported by all models and routes.
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
