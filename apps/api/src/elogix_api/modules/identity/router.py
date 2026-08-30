from fastapi import APIRouter, HTTPException, status

from elogix_api.core.deps import CurrentUserDep, DbDep
from elogix_api.core.security import create_token
from elogix_api.modules.identity.schemas import LoginRequest, TokenPair, UserOut
from elogix_api.modules.identity.service import authenticate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: DbDep) -> TokenPair:
    user = authenticate(
        db,
        company_slug=payload.company_slug,
        email=payload.email,
        password=payload.password,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return TokenPair(
        access_token=create_token(user_id=user.id, company_id=user.company_id),
        refresh_token=create_token(
            user_id=user.id, company_id=user.company_id, kind="refresh"
        ),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUserDep) -> UserOut:
    return UserOut(
        id=current_user.id,
        company_id=current_user.company_id,
        email=current_user.email,
        full_name=current_user.full_name,
    )
