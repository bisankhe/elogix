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
    # Null until someone links this login to a person. Self-service is closed until
    # then; see `core/deps.get_current_employee`.
    employee_id: uuid.UUID | None = None


class UserCreate(BaseModel):
    """Create a login.

    The initial password is set by whoever creates the account, which means they know
    it. That is the normal shape for HR onboarding and it is not the end state — an
    invite-and-set-your-own-password flow is the right answer and is not built yet.
    Until it is, this is a deliberate, documented compromise rather than an oversight.
    """

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=12, max_length=128)
    employee_id: uuid.UUID | None = None
    roles: list[RoleCode] = Field(default_factory=lambda: [RoleCode.EMPLOYEE])


class UserEmployeeLink(BaseModel):
    """Null unlinks. Linking is what opens self-service for this login."""

    employee_id: uuid.UUID | None


class EntitlementsOut(BaseModel):
    """What the frontend may use to decide what to show. Never what the server uses to
    decide what to allow — that is `require_module`, on the router."""

    company_id: uuid.UUID
    plan_tier: PlanTier
    modules: list[ModuleCode]
