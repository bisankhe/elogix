"""Tenant, users, roles, sessions and module grants.

Every tenant-scoped table here carries `company_id` — including the join tables, which
do not strictly need it. That redundancy is deliberate: it lets one uniform row-level
security policy apply to every table, instead of some being protected directly and
others only through a join that a future query might forget to make.

`companies` itself has no `company_id` and no RLS policy. It is the tenant registry, not
tenant data, and login has to resolve a slug to an id before any tenant context exists.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from elogix_api.db.base import Base
from elogix_api.db.types import TimestampMixin, company_fk, uuid_pk


class PlanTier(enum.StrEnum):
    """The five-tier plan ladder. Also the build order — each tier is roughly a phase."""

    TRIAL = "trial"
    STARTER = "starter"
    GROWTH = "growth"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class RoleCode(enum.StrEnum):
    SUPER_ADMIN = "super_admin"
    HR_MANAGER = "hr_manager"
    HR_OFFICER = "hr_officer"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class Company(Base, TimestampMixin):
    """A tenant."""

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(63), nullable=False, unique=True, index=True)
    plan_tier: Mapped[PlanTier] = mapped_column(
        Enum(PlanTier, name="plan_tier", native_enum=True),
        nullable=False,
        default=PlanTier.TRIAL,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class User(Base, TimestampMixin):
    """A login. Distinct from Employee: not every user is staff, and not every
    employee has a login."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("company_id", "email"),
        # One login per employee. Two logins claiming the same person would make
        # "whose leave request is this?" unanswerable.
        UniqueConstraint("company_id", "employee_id", name="uq_users_company_id_employee_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Nullable on purpose, and it is the whole of self-service. An HR officer who is
    # not on the payroll has no employee record; an employee who never logs in has no
    # user. Only when both exist can someone ask the ESS endpoints for "my" anything,
    # and `RESTRICT` means deleting an employee with a live login is refused rather
    # than quietly orphaning the account.
    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )


class UserRole(Base, TimestampMixin):
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[RoleCode] = mapped_column(
        Enum(RoleCode, name="role_code", native_enum=True), nullable=False
    )


class CompanyModule(Base, TimestampMixin):
    """Per-company override of the plan's default module set.

    Module access was granted client-side in the prototype — a value in localStorage that
    any user could edit to give themselves any plan. This table, and only this table, is
    what the server consults.
    """

    __tablename__ = "company_modules"
    __table_args__ = (UniqueConstraint("company_id", "module"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    module: Mapped[str] = mapped_column(String(64), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)


class AuthSession(Base, TimestampMixin):
    """One row per issued refresh token, so a session can be revoked server-side.

    The prototype's AuthService had JTI revocation and it was the one genuinely
    production-grade piece of that codebase. This is that idea, ported.
    """

    __tablename__ = "auth_sessions"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    refresh_jti: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), nullable=False, unique=True, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
