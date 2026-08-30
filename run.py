# FILE: run.py  (project root: /opt/elogix/run.py)
# eLogix HRMS — Gunicorn / Flask Entry Point
#
# Run from /opt/elogix (package mode — keeps backend.routes.* imports working):
#   gunicorn run:app
#   gunicorn run:app --workers 4 --bind 0.0.0.0:5000
#
# NOT from --chdir backend (breaks the 110 route files that use backend.* imports)
# eLogix Technologies · www.elogix.com.np

from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    import os
    port  = int(os.getenv('PORT', 5000))
    print("hiii")
    debug = os.getenv('FLASK_ENV', 'production') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
