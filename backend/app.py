"""
FILE: backend/app.py
eLogix HRMS — Flask Application Factory
eLogix Technologies · www.elogix.com.np
SaaS multi-tenant · Nepal Labour Act 2074 · Datahub Nepal deployment
"""
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os, time

cache   = Cache()
limiter = Limiter(key_func=get_remote_address)

def create_app(config_name: str = None) -> Flask:
    app = Flask(__name__)
    env = config_name or os.getenv("FLASK_ENV", "production")

    # ── Load eLogix Config ────────────────────────────────────
    from .config.settings import config
    app.config.from_object(config.get(env, config["production"]))

    # ── Logging (must be first) ───────────────────────────────
    from .utils.logging_config import setup_logging
    setup_logging(app)
    app.logger.info(f"eLogix HRMS starting in '{env}' mode — www.elogix.com.np")

    # ── CORS — allow elogix.com.np and all subdomains ────────────
    allowed_origins = os.getenv(
        "CORS_ORIGINS",
        "https://www.elogix.com.np,https://*.elogix.com.np,http://localhost:5173"
    ).split(",")
    CORS(app, origins=allowed_origins, supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Tenant-Id"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

    # ── Extensions ────────────────────────────────────────────
    cache.init_app(app)
    limiter.init_app(app)

    # ── Database ──────────────────────────────────────────────
    from .extensions import db
    db.init_app(app)
    with app.app_context():
        from . import models
        db.create_all()

    # ── Security headers on every response ────────────────────
    from .middleware.security import add_security_headers
    app.after_request(add_security_headers)

    # ── SaaS Tenant identification on every request ───────────
    from .middleware.tenant import resolve_tenant
    @app.before_request
    def identify_tenant():
        g.tenant_id  = resolve_tenant()
        g.company_id = g.tenant_id  # alias used across models
        g.brand      = "eLogix"

    # ── Request timing + audit logging ───────────────────────
    @app.before_request
    def start_timer():
        request._start_time = time.time()

    @app.after_request
    def log_request(response):
        if hasattr(request, "_start_time"):
            ms = round((time.time() - request._start_time) * 1000, 2)
            app.logger.info("elogix.request", extra={
                "method":      request.method,
                "path":        request.path,
                "status":      response.status_code,
                "duration_ms": ms,
                "tenant":      getattr(g, "tenant_id", "—"),
                "ip":          request.remote_addr,
            })
        return response

    # ── Health check ──────────────────────────────────────────
    @app.get("/health")
    @app.get("/api/health")
    def health():
        from flask import jsonify as _j
        db_ok = redis_ok = True
        try:
            from .extensions import db
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            db_ok = False
        try:
            from .utils.health_check import check_redis
            redis_ok = check_redis()
        except Exception:
            redis_ok = False
        status = "ok" if (db_ok and redis_ok) else "degraded"
        return jsonify({
            "status":    status,
            "app":       "eLogix HRMS",
            "brand":     "eLogix",
            "company":   "eLogix Technologies",
            "website":   "https://www.elogix.com.np",
            "version":   app.config["VERSION"],
            "db":        "ok" if db_ok    else "error",
            "redis":     "ok" if redis_ok else "error",
            "env":       env,
        }), (200 if status == "ok" else 503)

    # ── eLogix Blueprints (all routes) ───────────────────────
    from .routes import ALL_BLUEPRINTS
    for bp in ALL_BLUEPRINTS:
        app.register_blueprint(bp)

    # ── eLogix SaaS admin routes ──────────────────────────────
    from .saas.admin_routes import saas_bp
    app.register_blueprint(saas_bp, url_prefix="/api/v1/saas")

    # ── Error handlers ────────────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "error": str(e), "brand": "eLogix"}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"success": False, "error": "Unauthorized — please log in to eLogix", "brand": "eLogix"}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"success": False, "error": "Access denied — check your eLogix permissions", "brand": "eLogix"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "eLogix: endpoint not found", "brand": "eLogix"}), 404

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify({"success": False, "error": "Too many requests — eLogix rate limit exceeded", "brand": "eLogix"}), 429

    @app.errorhandler(500)
    def server_error(e):
        app.logger.error(f"eLogix 500: {e}")
        return jsonify({"success": False, "error": "eLogix internal error — support@elogix.com.np", "brand": "eLogix"}), 500

    app.logger.info("eLogix HRMS ready · www.elogix.com.np")
    return app
