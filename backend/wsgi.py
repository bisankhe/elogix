"""
FILE: backend/wsgi.py
eLogix HRMS — Gunicorn / uWSGI entry point
eLogix Technologies · www.elogix.com.np
Run: gunicorn -w 4 -k uvicorn.workers.UvicornWorker wsgi:app --bind 127.0.0.1:8000
"""
import os
from app import create_app

app = create_app(os.getenv("FLASK_ENV", "production"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
