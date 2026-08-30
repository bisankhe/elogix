"""Request dependencies.

`CurrentUser` is the only sanctioned way to learn who is calling and which tenant they
act on. Nothing reads the tenant from a header — it comes from the signed token.

Phase 01 adds row-level security on top of this. The application-level filter stays even
once RLS lands: belt and braces, because in the prototype the braces were the security
boundary and were never fastened.
"""

import uuid
from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.core.security import decode_token
from elogix_api.db.session import get_db
from elogix_api.modules.identity.models import User

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

    user = db.execute(
        select(User).where(
            User.id == claims.user_id,
            User.company_id == claims.company_id,
            User.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if user is None:
        raise _UNAUTHENTICATED

    return CurrentUser(
        id=user.id,
        company_id=user.company_id,
        email=user.email,
        full_name=user.full_name,
    )


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
DbDep = Annotated[Session, Depends(get_db)]
