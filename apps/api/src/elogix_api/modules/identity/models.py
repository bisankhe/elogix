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
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
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
    """A tenant, and the legal entity that employs people and files returns.

    **One company per tenant, by decision on 2026-08-30.** The prototype modelled
    tenant → group companies → companies → branches, but defined `companies` twice with
    clashing id types, never created a `tenants` table for the `tenant_id` those rows
    carried, and took that `tenant_id` from a request header. There was no coherent
    hierarchy to inherit.

    If a customer later needs several registered companies under one group, the cheap
    path is deliberately preserved: `company_id` here means *one legal entity*, never
    "the SaaS account", and the caller's active company arrives on the token as a single
    value. A group feature then adds a `groups` table, a nullable `group_id` here, and a
    company **switcher** — it does not widen the filter. That distinction is what keeps
    the change small: the 164 `.where(Model.company_id == user.company_id)` clauses stay
    exactly as they are. Letting one request span several companies at once is the
    expensive version, and it is the one to refuse.
    """

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

    # ── Statutory identity ────────────────────────────────────────────
    #
    # Every one of these appears on a filing. Payroll has been complete since phase 06
    # and still cannot produce a return, because a return names the employer by its PAN
    # and its SSF employer code and this table held neither. Nullable throughout: a
    # tenant is provisioned before its paperwork is gathered, and the document checklist
    # in `nepal/company.py` is what chases the gaps.
    legal_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    pan_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    vat_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Office of the Company Registrar — the registration every Nepali company has.
    registration_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    registered_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Inland Revenue Department office the company files with.
    ird_office: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # Social Security Fund employer code. Without it no SSF contribution can be remitted,
    # which makes it the single most consequential blank on this record.
    ssf_employer_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    labour_office: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # ── Registered address ────────────────────────────────────────────
    #
    # Nepal addresses down to the ward, because that is the level a municipality
    # registration and a labour audit are filed at.
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    ward: Mapped[str | None] = mapped_column(String(16), nullable=True)
    municipality: Mapped[str | None] = mapped_column(String(120), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    province: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # ── Contact ───────────────────────────────────────────────────────
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    website: Mapped[str | None] = mapped_column(String(200), nullable=True)


class CompanyDocument(Base, TimestampMixin):
    """A statutory document the company itself holds.

    Deliberately not `EmployeeDocument`. These belong to the company, not to a person —
    an OCR certificate has no employee — and filing them against a member of staff would
    make them disappear when that person left. The storage layer is shared, so the
    upload rules, the content-addressed key and the attachment headers are identical;
    see `modules/employee/documents.py`.

    Expiry is the reason this table earns its place. A trade licence or a tax clearance
    that lapses unnoticed stops a company operating, and nobody finds it by opening
    records one at a time.
    """

    __tablename__ = "company_documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    # Matches a `code` in `nepal/company.py` for a statutory document, or free text for
    # anything else the company keeps.
    category: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    issuing_authority: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    issued_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    expires_on: Mapped[date | None] = mapped_column(Date, nullable=True)

    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verified_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(127), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


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
