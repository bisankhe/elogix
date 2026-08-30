"""FastAPI application factory.

Module routers are mounted here explicitly, one line each. No dynamic discovery and no
try/except around imports: the prototype swallowed ImportError during blueprint
registration, so a broken route file became a silent 404 with nothing in the log. Here a
broken import stops the process.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from sqlalchemy import text

from elogix_api.db.session import engine
from elogix_api.modules.employee import router as employee_router
from elogix_api.modules.identity import router as identity_router
from elogix_api.settings import get_settings


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
    app.include_router(employee_router.router, prefix="/api/v1")

    @app.get("/api/health", tags=["meta"])
    def health() -> dict[str, str]:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            database = "connected"
        except Exception:
            database = "unavailable"
        return {
            "status": "ok",
            "environment": settings.environment,
            "database": database,
        }

    return app


app = create_app()
