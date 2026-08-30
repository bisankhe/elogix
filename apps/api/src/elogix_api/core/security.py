"""Password hashing and token issue/verify.

Argon2id for new hashes, with bcrypt kept for verification only so hashes carried over
from the prototype still validate and can be upgraded on next login.

Tokens carry the tenant. `company_id` is in the claims because the tenant a request acts
on must never come from a header the caller controls — the prototype read
`X-Tenant-Id` off the request in several routes, which made tenant choice a client
decision.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from elogix_api.settings import get_settings

ISSUER = "elogix"
AUDIENCE = "elogix-api"
ALGORITHM = "HS256"

# First hasher is used for new hashes; the rest verify only.
_password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))


def hash_password(plain: str) -> str:
    return _password_hash.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _password_hash.verify(plain, hashed)


def verify_and_upgrade(plain: str, hashed: str) -> tuple[bool, str | None]:
    """Verify, and return a replacement hash when the stored one is outdated.

    The second element is non-None for a bcrypt hash carried over from the prototype,
    so callers can transparently move it to Argon2id on a successful login.
    """
    return _password_hash.verify_and_update(plain, hashed)


@dataclass(frozen=True, slots=True)
class TokenClaims:
    user_id: uuid.UUID
    company_id: uuid.UUID
    kind: Literal["access", "refresh"]
    jti: uuid.UUID


def create_token(
    *,
    user_id: uuid.UUID,
    company_id: uuid.UUID,
    kind: Literal["access", "refresh"] = "access",
) -> tuple[str, uuid.UUID]:
    """Return the encoded token and its JTI, so a refresh token can be recorded and
    later revoked."""
    settings = get_settings()
    now = datetime.now(UTC)
    ttl = (
        timedelta(minutes=settings.access_token_ttl_minutes)
        if kind == "access"
        else timedelta(days=settings.refresh_token_ttl_days)
    )
    jti = uuid.uuid4()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "company_id": str(company_id),
        "kind": kind,
        "jti": str(jti),
        "iat": now,
        "exp": now + ttl,
        "iss": ISSUER,
        "aud": AUDIENCE,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM), jti


def decode_token(token: str, *, expect: Literal["access", "refresh"] = "access") -> TokenClaims:
    """Raises jwt.InvalidTokenError (or a subclass) on anything not exactly right."""
    payload = jwt.decode(
        token,
        get_settings().secret_key,
        algorithms=[ALGORITHM],
        audience=AUDIENCE,
        issuer=ISSUER,
        options={"require": ["exp", "iat", "sub", "aud", "iss"]},
    )
    if payload.get("kind") != expect:
        raise jwt.InvalidTokenError(f"expected a {expect} token")
    return TokenClaims(
        user_id=uuid.UUID(payload["sub"]),
        company_id=uuid.UUID(payload["company_id"]),
        kind=expect,
        jti=uuid.UUID(payload["jti"]),
    )
