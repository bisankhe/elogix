"""FastAPI application factory.

Module routers are mounted here explicitly, one line each. No dynamic discovery and no
try/except around imports: the prototype swallowed ImportError during blueprint
registration, so a broken route file became a silent 404 with nothing in the log. Here a
broken import stops the process.
"""

import logging

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from sqlalchemy import func, select

from elogix_api.db.session import engine
from elogix_api.modules.attendance import router as attendance_router
from elogix_api.modules.employee import router as employee_router
from elogix_api.modules.ess import router as ess_router
from elogix_api.modules.identity import router as identity_router
from elogix_api.modules.identity.models import Company
from elogix_api.modules.leave import router as leave_router
from elogix_api.modules.org import router as org_router
from elogix_api.modules.payroll import router as payroll_router
from elogix_api.settings import get_settings

logger = logging.getLogger("elogix")


def _operation_id(route: APIRoute) -> str:
    """Name generated client functions after the route, not the URL.

    FastAPI's default turns `GET /api/health` into `healthApiHealthGet`. Prefixing with
    the tag instead gives `metaHealth`, so the generated SDK reads like an API rather
    than like a mangled path. Tags are therefore mandatory on every route.
    """
    tag = route.tags[0] if route.tags else "default"
    return f"{tag}-{route.name}"


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="eLogix HRMS API",
        version="0.1.0",
        openapi_url="/openapi.json",
        generate_unique_id_function=_operation_id,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Module routers ────────────────────────────────────────────────
    app.include_router(identity_router.router, prefix="/api/v1")
    app.include_router(org_router.router, prefix="/api/v1")
    app.include_router(employee_router.router, prefix="/api/v1")
    app.include_router(attendance_router.router, prefix="/api/v1")
    app.include_router(leave_router.router, prefix="/api/v1")
    app.include_router(payroll_router.router, prefix="/api/v1")
    app.include_router(ess_router.router, prefix="/api/v1")

    @app.get("/api/health", tags=["meta"])
    def health(response: Response) -> dict[str, str]:
        """Liveness plus a real database read.

        `SELECT 1` is not enough: it needs no table privileges and no schema, so it
        answers "connected" for a role that cannot read a single row and for a database
        with no tables at all. This once reported a healthy database while every request
        was failing with `permission denied for table companies`.

        Reading a real table exercises connectivity, privileges and the migrations
        together. Unhealthy returns 503, not 200 — a health check that always returns OK
        tells a load balancer nothing.
        """
        try:
            with engine.connect() as conn:
                conn.execute(select(func.count()).select_from(Company))
            database = "connected"
        except Exception:
            logger.exception("health check failed")
            database = "unavailable"
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        return {
            "status": "ok" if database == "connected" else "degraded",
            "environment": settings.environment,
            "database": database,
        }

    return app


app = create_app()
