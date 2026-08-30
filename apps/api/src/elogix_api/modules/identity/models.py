"""Tenant and user. The root of the tenancy graph.

Deliberately thin — phase 01 adds roles, sessions, module entitlements and row-level
security. What is settled here is the shape everything else hangs off: `companies.id` is
a UUID, and every tenant-scoped table in the system carries `company_id` referencing it.
"""

import uuid

from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from elogix_api.db.base import Base
from elogix_api.db.types import TimestampMixin, company_fk, uuid_pk


class Company(Base, TimestampMixin):
    """A tenant."""

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(63), nullable=False, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class User(Base, TimestampMixin):
    """A login. Distinct from Employee: not every user is staff, and not every
    employee has a login."""

    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("company_id", "email"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
