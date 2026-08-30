"""Authentication and session logic, kept out of the router so it can be tested directly."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.core.security import (
    TokenClaims,
    create_token,
    hash_password,
    verify_and_upgrade,
    verify_password,
)
from elogix_api.modules.identity.models import AuthSession, Company, User
from elogix_api.settings import get_settings


def authenticate(db: Session, *, company_slug: str, email: str, password: str) -> User | None:
    """Return the user, or None for any failure.

    One return value for "no such tenant", "no such user" and "wrong password", so the
    endpoint cannot leak which tenants or accounts exist. The password is verified even
    when the user is missing, so a failed lookup and a wrong password take the same time.
    """
    company = db.execute(
        select(Company).where(Company.slug == company_slug, Company.is_active.is_(True))
    ).scalar_one_or_none()

    if company is None:
        verify_password(password, hash_password("dummy"))
        return None


    user = db.execute(
        select(User).where(
            User.company_id == company.id,
            User.email == email.lower(),
            User.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if user is None:
        verify_password(password, hash_password("dummy"))
        return None

    ok, upgraded_hash = verify_and_upgrade(password, user.password_hash)
    if not ok:
        return None

    # Transparently move a bcrypt hash carried over from the prototype to Argon2id.
    if upgraded_hash is not None:
        user.password_hash = upgraded_hash
        db.commit()

    return user


def start_session(db: Session, user: User) -> tuple[str, str]:
    """Issue an access/refresh pair and record the refresh token so it can be revoked."""
    settings = get_settings()
    access, _ = create_token(user_id=user.id, company_id=user.company_id)
    refresh, refresh_jti = create_token(
        user_id=user.id, company_id=user.company_id, kind="refresh"
    )

    db.add(
        AuthSession(
            company_id=user.company_id,
            user_id=user.id,
            refresh_jti=refresh_jti,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_ttl_days),
        )
    )
    db.commit()
    return access, refresh


def rotate_session(db: Session, claims: TokenClaims) -> tuple[str, str] | None:
    """Exchange a refresh token for a new pair, revoking the one just used.

    Rotation means a stolen refresh token is usable at most once, and its use burns the
    legitimate holder's token too — which surfaces the theft instead of hiding it.
    """

    session_row = db.execute(
        select(AuthSession).where(
            AuthSession.refresh_jti == claims.jti,
            AuthSession.company_id == claims.company_id,
            AuthSession.revoked_at.is_(None),
        )
    ).scalar_one_or_none()

    if session_row is None or session_row.expires_at <= datetime.now(UTC):
        return None

    user = db.execute(
        select(User).where(
            User.id == session_row.user_id,
            User.company_id == claims.company_id,
            User.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if user is None:
        return None

    session_row.revoked_at = datetime.now(UTC)
    db.flush()
    return start_session(db, user)


def revoke_session(db: Session, claims: TokenClaims) -> None:
    """Log out. Idempotent: revoking an unknown or already-revoked session is a no-op."""

    session_row = db.execute(
        select(AuthSession).where(
            AuthSession.refresh_jti == claims.jti,
            AuthSession.company_id == claims.company_id,
            AuthSession.revoked_at.is_(None),
        )
    ).scalar_one_or_none()

    if session_row is not None:
        session_row.revoked_at = datetime.now(UTC)
        db.commit()


def revoke_all_sessions(db: Session, *, user_id: uuid.UUID, company_id: uuid.UUID) -> None:
    """Used when a password changes or an account is disabled."""
    rows = db.execute(
        select(AuthSession).where(
            AuthSession.user_id == user_id,
            AuthSession.company_id == company_id,
            AuthSession.revoked_at.is_(None),
        )
    ).scalars()
    now = datetime.now(UTC)
    for row in rows:
        row.revoked_at = now
    db.commit()
