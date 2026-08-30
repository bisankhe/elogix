"""Shared column types and mixins.

One id type across the whole schema: UUID. The prototype had 536 UUID and 29 INTEGER
`company_id` columns, and 202 foreign keys Postgres refused to create as a result.
Nothing here offers an integer primary key, so that divergence cannot start again.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def company_fk() -> Mapped[uuid.UUID]:
    """Tenant discriminator. Every tenant-scoped table carries exactly this column."""
    return mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
