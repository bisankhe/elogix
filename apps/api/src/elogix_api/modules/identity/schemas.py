import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.identity.models import PlanTier, RoleCode


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)
    company_slug: str = Field(min_length=1, max_length=63)


class AccessToken(BaseModel):
    """Only the access token crosses in the body.

    The refresh token goes back as an httpOnly cookie so no script on the page can read
    it — including a script injected into the page.
    """

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    email: str
    full_name: str
    roles: list[RoleCode]


class EntitlementsOut(BaseModel):
    """What the frontend may use to decide what to show. Never what the server uses to
    decide what to allow — that is `require_module`, on the router."""

    company_id: uuid.UUID
    plan_tier: PlanTier
    modules: list[ModuleCode]
