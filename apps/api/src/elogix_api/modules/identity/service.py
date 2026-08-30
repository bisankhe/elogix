"""Authentication logic, kept out of the router so it can be tested directly."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.core.security import hash_password, verify_and_upgrade, verify_password
from elogix_api.modules.identity.models import Company, User


def authenticate(db: Session, *, company_slug: str, email: str, password: str) -> User | None:
    """Return the user, or None for any failure.

    One return value for "no such tenant", "no such user" and "wrong password", so the
    endpoint cannot leak which tenants or accounts exist. The password is verified even
    when the user is missing, so a failed lookup and a wrong password take the same time.
    """
    row = db.execute(
        select(User)
        .join(Company, Company.id == User.company_id)
        .where(
            Company.slug == company_slug,
            Company.is_active.is_(True),
            User.email == email.lower(),
            User.is_active.is_(True),
        )
    ).scalar_one_or_none()

    if row is None:
        # Constant-ish work on the miss path to avoid a user-enumeration timing signal.
        verify_password(password, hash_password("dummy"))
        return None

    ok, upgraded_hash = verify_and_upgrade(password, row.password_hash)
    if not ok:
        return None

    # Transparently move a bcrypt hash carried over from the prototype to Argon2id.
    if upgraded_hash is not None:
        row.password_hash = upgraded_hash
        db.commit()

    return row
