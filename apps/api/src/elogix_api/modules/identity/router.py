import contextlib

import jwt
from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy import select

from elogix_api.core.deps import CurrentUserDep, DbDep
from elogix_api.core.security import decode_token
from elogix_api.modules.identity.models import Company
from elogix_api.modules.identity.schemas import (
    AccessToken,
    EntitlementsOut,
    LoginRequest,
    UserOut,
)
from elogix_api.modules.identity.service import (
    authenticate,
    revoke_session,
    rotate_session,
    start_session,
)
from elogix_api.settings import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "elogix_refresh"

_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
)


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        # Scoped to the refresh and logout routes, so it is not attached to every
        # ordinary API call and cannot be replayed by one.
        path="/api/v1/auth",
    )


def _access_token(token: str) -> AccessToken:
    return AccessToken(
        access_token=token,
        expires_in=get_settings().access_token_ttl_minutes * 60,
    )


@router.post("/login", response_model=AccessToken)
def login(payload: LoginRequest, response: Response, db: DbDep) -> AccessToken:
    user = authenticate(
        db,
        company_slug=payload.company_slug,
        email=payload.email,
        password=payload.password,
    )
    if user is None:
        raise _INVALID_CREDENTIALS

    access, refresh = start_session(db, user)
    _set_refresh_cookie(response, refresh)
    return _access_token(access)


@router.post("/refresh", response_model=AccessToken)
def refresh(
    response: Response,
    db: DbDep,
    elogix_refresh: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
) -> AccessToken:
    if elogix_refresh is None:
        raise _INVALID_CREDENTIALS
    try:
        claims = decode_token(elogix_refresh, expect="refresh")
    except jwt.InvalidTokenError as exc:
        raise _INVALID_CREDENTIALS from exc

    rotated = rotate_session(db, claims)
    if rotated is None:
        raise _INVALID_CREDENTIALS

    access, new_refresh = rotated
    _set_refresh_cookie(response, new_refresh)
    return _access_token(access)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DbDep,
    elogix_refresh: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
) -> None:
    if elogix_refresh is not None:
        # An unreadable token is already unusable; clearing the cookie is all that is
        # left to do, so logout stays idempotent and never fails.
        with contextlib.suppress(jwt.InvalidTokenError):
            revoke_session(db, decode_token(elogix_refresh, expect="refresh"))
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUserDep) -> UserOut:
    return UserOut(
        id=current_user.id,
        company_id=current_user.company_id,
        email=current_user.email,
        full_name=current_user.full_name,
        roles=sorted(current_user.roles),
    )


@router.get("/entitlements", response_model=EntitlementsOut)
def entitlements(current_user: CurrentUserDep, db: DbDep) -> EntitlementsOut:
    plan_tier = db.execute(
        select(Company.plan_tier).where(Company.id == current_user.company_id)
    ).scalar_one()

    return EntitlementsOut(
        company_id=current_user.company_id,
        plan_tier=plan_tier,
        modules=sorted(current_user.modules),
    )
