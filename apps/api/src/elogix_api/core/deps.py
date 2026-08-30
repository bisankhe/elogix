"""Request dependencies.

`CurrentUser` is the only sanctioned way to learn who is calling, which tenant they act
on, what roles they hold and which modules their company has. Nothing reads the tenant
from a header — it comes from the signed token.

Tenant isolation is enforced in the queries themselves: every read or write in a
tenant-scoped module must carry `.where(Model.company_id == current_user.company_id)`.
There is no database-level backstop, so that clause is the whole boundary — omitting one
leaks another tenant's rows silently. `tests/test_tenant_isolation.py` is what holds the
line; extend it whenever a tenant-scoped endpoint is added.
"""

import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.core.entitlements import ModuleCode, effective_modules
from elogix_api.core.security import decode_token
from elogix_api.db.session import get_db
from elogix_api.modules.identity.models import Company, RoleCode, User, UserRole

_bearer = HTTPBearer(auto_error=False)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


@dataclass(frozen=True, slots=True)
class CurrentUser:
    id: uuid.UUID
    company_id: uuid.UUID
    email: str
    full_name: str
    roles: frozenset[RoleCode] = field(default_factory=frozenset)
    modules: frozenset[ModuleCode] = field(default_factory=frozenset)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    if credentials is None:
        raise _UNAUTHENTICATED
    try:
        claims = decode_token(credentials.credentials)
    except jwt.InvalidTokenError as exc:
        raise _UNAUTHENTICATED from exc

    # Both the user id and the company id come from the signed token, and both must
    # match — a token naming a company its user does not belong to resolves to nothing.
    row = db.execute(
        select(User, Company)
        .join(Company, Company.id == User.company_id)
        .where(
            User.id == claims.user_id,
            User.company_id == claims.company_id,
            User.is_active.is_(True),
            Company.is_active.is_(True),
        )
    ).one_or_none()

    if row is None:
        raise _UNAUTHENTICATED

    user, company = row

    roles = db.execute(
        select(UserRole.role).where(
            UserRole.user_id == user.id, UserRole.company_id == user.company_id
        )
    ).scalars()

    return CurrentUser(
        id=user.id,
        company_id=user.company_id,
        email=user.email,
        full_name=user.full_name,
        roles=frozenset(roles),
        modules=effective_modules(db, company_id=company.id, plan_tier=company.plan_tier),
    )


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
DbDep = Annotated[Session, Depends(get_db)]


def require_module(module: ModuleCode) -> Callable[..., None]:
    """403 unless the caller's company has this module enabled.

    Attach with `dependencies=[Depends(require_module(ModuleCode.EMPLOYEE))]` on the
    router, so every route in a module is covered by construction rather than by each
    author remembering.
    """

    def _dependency(current_user: CurrentUserDep) -> None:
        if module not in current_user.modules:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Module '{module.value}' is not enabled for this company",
            )

    return _dependency


def require_role(*roles: RoleCode) -> Callable[..., None]:
    """403 unless the caller holds at least one of these roles."""
    allowed = frozenset(roles)

    def _dependency(current_user: CurrentUserDep) -> None:
        if not (allowed & current_user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

    return _dependency
