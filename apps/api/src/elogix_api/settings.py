"""Application settings.

Every value the app needs is declared here and validated at import time. A missing
or malformed secret is a startup crash, not a runtime surprise — the prototype had
two different SECRET_KEY defaults silently disagreeing across modules.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# One .env, at the repo root, regardless of which directory the process starts in.
# apps/api/src/elogix_api/settings.py -> repo root is four levels up from the package.
REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # The runtime connection. Must be a NOSUPERUSER, NOBYPASSRLS role, or row-level
    # security is silently skipped — Postgres exempts superusers from policies even
    # when the table is FORCE ROW LEVEL SECURITY.
    database_url: str
    # The owner/DDL connection, used only by Alembic. Falls back to database_url so a
    # plain local setup still works; production should keep the two separate.
    database_admin_url: str | None = None
    app_db_role: str = "elogix_app"
    app_db_password: str = "elogix_app"
    secret_key: str
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 30
    environment: Literal["development", "test", "production"] = "development"
    cors_origins: str = "http://localhost:5173"

    @field_validator("secret_key")
    @classmethod
    def _secret_is_long_enough(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def migration_url(self) -> str:
        """Alembic runs DDL, so it needs the owner, not the restricted runtime role."""
        return self.database_admin_url or self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
