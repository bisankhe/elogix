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


class RegisterCompany(BaseModel):
    """Public signup. Note what is *not* here: the plan.

    A signup always creates a trial tenant, so no request can grant itself a paid tier.
    Changing a plan is a commercial decision and belongs behind whatever tier ends up
    managing tenants.
    """

    company_name: str = Field(min_length=2, max_length=200)
    # The login identifier. Validated again in `provisioning.validate_public_slug`,
    # which also refuses the reserved list — this pattern is the cheap first pass.
    slug: str = Field(min_length=3, max_length=63, pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    admin_name: str = Field(min_length=1, max_length=200)
    admin_email: EmailStr
    # Twelve is the floor everywhere else a password is set in this system; keeping it
    # the same means one rule to remember and one rule to change.
    password: str = Field(min_length=12, max_length=128)


class RegisteredCompany(BaseModel):
    """What a brand-new tenant is told.

    No ids. The person who just signed up needs to know where to log in, not the
    primary keys of rows they have never seen.
    """

    company_name: str
    slug: str
    admin_email: str
    next_step: str
