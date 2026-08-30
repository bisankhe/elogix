import contextlib
import uuid

import jwt
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from elogix_api.core.deps import CurrentUserDep, DbDep, require_role
from elogix_api.core.ratelimit import SlidingWindow, enforce
from elogix_api.core.security import decode_token, hash_password
from elogix_api.modules.employee.service import get_employee
from elogix_api.modules.identity import provisioning
from elogix_api.modules.identity.models import (
    Company,
    PlanTier,
    RoleCode,
    User,
    UserRole,
)
from elogix_api.modules.identity.schemas import (
    AccessToken,
    EntitlementsOut,
    LoginRequest,
    RegisterCompany,
    RegisteredCompany,
    UserCreate,
    UserEmployeeLink,
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


# ── User administration ───────────────────────────────────────────────
#
# Managing logins is HR's job, not an employee's, so these carry an explicit role
# gate. The rest of `/auth` is deliberately open to any authenticated caller — you
# have to be able to ask who you are.

_HR_ONLY = Depends(require_role(RoleCode.SUPER_ADMIN, RoleCode.HR_MANAGER))


def _to_out(db: Session, user: User) -> UserOut:
    roles = db.execute(
        select(UserRole.role).where(
            UserRole.user_id == user.id, UserRole.company_id == user.company_id
        )
    ).scalars()
    return UserOut(
        id=user.id,
        company_id=user.company_id,
        email=user.email,
        full_name=user.full_name,
        roles=list(roles),
        employee_id=user.employee_id,
    )


def _get_user(db: Session, user_id: uuid.UUID, company_id: uuid.UUID) -> User:
    user = db.execute(
        select(User).where(User.id == user_id, User.company_id == company_id)
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.get("/users", response_model=list[UserOut], dependencies=[_HR_ONLY])
def list_users(current_user: CurrentUserDep, db: DbDep) -> list[UserOut]:
    users = db.execute(
        select(User).where(User.company_id == current_user.company_id).order_by(User.email)
    ).scalars()
    return [_to_out(db, user) for user in users]


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[_HR_ONLY],
)
def create_user(payload: UserCreate, current_user: CurrentUserDep, db: DbDep) -> UserOut:
    """Create a login, optionally linked to an employee straight away."""
    if payload.employee_id is not None:
        get_employee(db, company_id=current_user.company_id, employee_id=payload.employee_id)

    user = User(
        company_id=current_user.company_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        employee_id=payload.employee_id,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        # Either the email or the employee is already taken. Both uniques are per
        # company, so the message is safe to be specific about.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "That email already has a login, or that employee already has one",
        ) from exc

    for role in dict.fromkeys(payload.roles):
        db.add(UserRole(company_id=user.company_id, user_id=user.id, role=role))

    db.commit()
    db.refresh(user)
    return _to_out(db, user)


@router.put("/users/{user_id}/employee", response_model=UserOut, dependencies=[_HR_ONLY])
def link_user_to_employee(
    user_id: uuid.UUID, payload: UserEmployeeLink, current_user: CurrentUserDep, db: DbDep
) -> UserOut:
    """Point a login at a person, or unlink it.

    Unlinking closes self-service for that login rather than deleting anything — the
    leave requests and payslips belong to the employee record, not to the account.
    """
    user = _get_user(db, user_id, current_user.company_id)

    if payload.employee_id is not None:
        get_employee(db, company_id=current_user.company_id, employee_id=payload.employee_id)

    user.employee_id = payload.employee_id
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That employee already has a login") from exc

    db.refresh(user)
    return _to_out(db, user)


# ── Public signup ─────────────────────────────────────────────────────
#
# The only unauthenticated write in the system, so it is worth being explicit about
# what stands between it and abuse: a trial-only plan that is not an input, slug
# validation with a reserved list, a per-IP rate limit, and a response that does not
# reveal whether an email was already registered. See `identity/provisioning.py`.

# Six an hour per address. Generous for a person filling in a form once, and slow
# enough that a script is not worth writing.
_SIGNUP_LIMIT = SlidingWindow(limit=6, window_seconds=3600)


@router.post(
    "/register-company",
    response_model=RegisteredCompany,
    status_code=status.HTTP_201_CREATED,
)
def register_company(
    payload: RegisterCompany, request: Request, db: DbDep
) -> RegisteredCompany:
    """Create a trial tenant and its first administrator.

    Always a trial: `plan_tier` is not in the request body, so a signup cannot grant
    itself a paid tier however it is crafted.
    """
    enforce(_SIGNUP_LIMIT, request, what="signup attempts")

    try:
        slug = provisioning.validate_public_slug(payload.slug)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    taken = db.execute(select(Company).where(Company.slug == slug)).scalar_one_or_none()
    if taken is not None:
        # Naming the conflict is fine — a slug is public by design, and the person
        # needs to know to pick another. The *email* is the thing not to confirm.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"The company URL '{slug}' is already taken. Please choose another.",
        )

    try:
        company, _user, _password = provisioning.provision(
            db,
            name=payload.company_name.strip(),
            slug=slug,
            admin_email=payload.admin_email,
            admin_name=payload.admin_name.strip(),
            plan_tier=PlanTier.TRIAL,
            password=payload.password,
            quiet=True,
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # Two signups racing for the same slug. The unique index is the arbiter.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "That company URL was taken a moment ago. Please choose another.",
        ) from exc

    return RegisteredCompany(
        company_name=company.name,
        slug=company.slug,
        admin_email=payload.admin_email,
        next_step=(
            "Sign in, then set your PAN and SSF employer code under Company Profile — "
            "payroll cannot file a return without them."
        ),
    )
