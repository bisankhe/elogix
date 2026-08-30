"""Engine and request-scoped session.

Sync SQLAlchemy, deliberately. Async forbids lazy loading and surfaces violations as
MissingGreenlet errors that are hard to trace; FastAPI runs plain `def` endpoints in a
threadpool perfectly well at this scale. Only genuinely IO-bound routes (the AI proxy)
should be `async def`.
"""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from elogix_api.settings import get_settings

_settings = get_settings()

engine = create_engine(
    _settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
