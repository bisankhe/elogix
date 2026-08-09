"""
FILE: run.py
NepHR Pro — Application Entry Point
Usage:
  Development: python run.py
  Production:  gunicorn "backend.app:create_app('production')" --workers 4 --bind 0.0.0.0:5000
"""
import os
from dotenv import load_dotenv

load_dotenv()

from backend.app import create_app

app = create_app(os.getenv("FLASK_ENV", "development"))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug= os.getenv("FLASK_ENV", "development") == "development"
    print(f"\n NepHR Pro API running on http://localhost:{port}")
    print(f" Environment: {os.getenv('FLASK_ENV', 'development')}")
    print(f" API Base: http://localhost:{port}/api/v1/")
    print(f" Health:   http://localhost:{port}/api/health\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
