"""Public company signup.

The only unauthenticated write in the system, which makes this the file where the
guards get proved rather than described. Four of them: a trial-only plan that is not an
input, slug validation with a reserved list, a per-IP rate limit, and a response that
does not reveal whether an email was already registered.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.modules.identity.models import Company, PlanTier, RoleCode, UserRole
from elogix_api.modules.identity.provisioning import RESERVED_SLUGS
from elogix_api.modules.identity.router import _SIGNUP_LIMIT
from tests.conftest import auth, make_tenant

PASSWORD = "correct-horse-battery-staple"


@pytest.fixture(autouse=True)
def fresh_limiter():
    """The limiter is process-wide, so one test's signups would throttle the next."""
    _SIGNUP_LIMIT.reset()
    yield
    _SIGNUP_LIMIT.reset()


def signup(client: TestClient, **overrides: object):  # noqa: ANN201
    body = {
        "company_name": "Himalayan Bank",
        "slug": "himalayan",
        "admin_name": "HR Manager",
        "admin_email": "hr@himalayan.com.np",
        "password": PASSWORD,
        **overrides,
    }
    return client.post("/api/v1/auth/register-company", json=body)


# ── The happy path ────────────────────────────────────────────────────


def test_a_stranger_can_create_a_tenant_and_sign_into_it(
    client: TestClient, db: Session
) -> None:
    """Signup with no credential at all, then log in with the one just created."""
    created = signup(client)
    assert created.status_code == 201, created.text
    assert created.json()["slug"] == "himalayan"

    token = client.post(
        "/api/v1/auth/login",
        json={
            "email": "hr@himalayan.com.np",
            "password": PASSWORD,
            "company_slug": "himalayan",
        },
    )
    assert token.status_code == 200

    me = client.get("/api/v1/auth/me", headers=auth(token.json()["access_token"]))
    assert me.json()["email"] == "hr@himalayan.com.np"
    # The first user runs the company.
    assert RoleCode.SUPER_ADMIN.value in me.json()["roles"]


def test_a_new_tenant_arrives_usable_rather_than_empty(
    client: TestClient, db: Session
) -> None:
    """Everything a tenant needs is seeded at provisioning rather than lazily on first
    read — otherwise the first person in pays the cost and a fresh tenant looks broken
    until they do."""
    signup(client)
    token = client.post(
        "/api/v1/auth/login",
        json={
            "email": "hr@himalayan.com.np",
            "password": PASSWORD,
            "company_slug": "himalayan",
        },
    ).json()["access_token"]
    headers = auth(token)

    assert len(client.get("/api/v1/leave/types", headers=headers).json()) > 0
    assert len(client.get("/api/v1/attendance/shifts", headers=headers).json()) == 0
    policy = client.get("/api/v1/attendance/policy", headers=headers)
    assert policy.status_code == 200

    # The statutory paperwork reads as *missing*, which is the truth on day one.
    # Provisioning deliberately creates no placeholder document rows: a row with no
    # file behind it would read as "held" and tell a brand-new company its paperwork
    # was in order. Found in a screenshot of exactly this screen.
    compliance = client.get("/api/v1/org/company/compliance", headers=headers).json()
    assert len(compliance["items"]) == 10
    assert compliance["missing"] == 10
    assert compliance["held"] == 0
    assert compliance["missing_filing_fields"], "a new tenant cannot file yet"


def test_the_response_tells_them_what_to_do_next(client: TestClient) -> None:
    """The one thing that blocks payroll, said at the moment it can be acted on."""
    body = signup(client).json()
    assert "SSF employer code" in body["next_step"]


# ── A signup can never buy itself a plan ──────────────────────────────


def test_a_signup_always_creates_a_trial_no_matter_what_is_sent(
    client: TestClient, db: Session
) -> None:
    """`plan_tier` is not a field on the request, so an injected one is dropped rather
    than honoured. This is the guard that stops signup being a free upgrade."""
    signup(client, plan_tier="enterprise", plan="enterprise")

    company = db.query(Company).filter(Company.slug == "himalayan").one()
    assert company.plan_tier is PlanTier.TRIAL


def test_a_trial_tenant_is_gated_out_of_paid_modules(
    client: TestClient, db: Session
) -> None:
    """The plan is not decoration — the server refuses payroll on a trial."""
    signup(client)
    headers = auth(
        client.post(
            "/api/v1/auth/login",
            json={
                "email": "hr@himalayan.com.np",
                "password": PASSWORD,
                "company_slug": "himalayan",
            },
        ).json()["access_token"]
    )

    assert client.get("/api/v1/payroll/runs", headers=headers).status_code == 403


# ── Slugs ─────────────────────────────────────────────────────────────


@pytest.mark.parametrize("slug", sorted(RESERVED_SLUGS)[:6])
def test_reserved_slugs_are_refused(client: TestClient, slug: str) -> None:
    """The slug is the login identifier and one day a subdomain. `api` and `admin` are
    not available to whoever asks first."""
    response = signup(client, slug=slug)
    assert response.status_code == 422
    assert "reserved" in response.json()["detail"]


@pytest.mark.parametrize(
    "slug", ["ab", "-leading", "trailing-", "Has Capitals", "under_score", "a" * 64]
)
def test_malformed_slugs_are_refused(client: TestClient, slug: str) -> None:
    assert signup(client, slug=slug).status_code == 422


def test_a_taken_slug_is_refused_and_says_so(client: TestClient, db: Session) -> None:
    """Naming this conflict is fine — a slug is public by design and the person needs
    to pick another. The email is the thing not to confirm."""
    make_tenant(db, "acme")

    response = signup(client, slug="acme")
    assert response.status_code == 409
    assert "already taken" in response.json()["detail"]


# ── Not an enumeration oracle ─────────────────────────────────────────


def test_signup_does_not_reveal_whether_an_email_is_already_registered(
    client: TestClient, db: Session
) -> None:
    """Two signups with the same email under different companies both succeed, exactly
    as two strangers with the same address would. Email is unique per company, not
    globally, so there is nothing to leak and nothing to differ."""
    first = signup(client, slug="first-co", company_name="First Co")
    second = signup(client, slug="second-co", company_name="Second Co")

    assert first.status_code == second.status_code == 201
    assert first.json()["admin_email"] == second.json()["admin_email"]


def test_a_short_password_is_refused(client: TestClient) -> None:
    """Twelve is the floor everywhere else a password is set. One rule to remember."""
    assert signup(client, password="short").status_code == 422


# ── Rate limiting ─────────────────────────────────────────────────────


def test_signups_are_rate_limited_per_address(client: TestClient, db: Session) -> None:
    """In-process and therefore per-worker, which is stated plainly in
    `core/ratelimit.py` rather than pretended away. It still turns "thousands of tenants
    a minute" into "a few dozen"."""
    for i in range(_SIGNUP_LIMIT.limit):
        assert signup(client, slug=f"company-{i}").status_code == 201

    blocked = signup(client, slug="one-too-many")
    assert blocked.status_code == 429
    assert "Too many signup attempts" in blocked.json()["detail"]
    assert int(blocked.headers["Retry-After"]) > 0

    # And the refused one really was not created.
    assert db.query(Company).filter(Company.slug == "one-too-many").count() == 0


def test_the_limit_counts_refused_attempts_too(
    client: TestClient, db: Session
) -> None:
    """A refused attempt still costs the caller a slot.

    The probe worth throttling is slug availability — "is `nabilbank` taken?" tells
    somebody who already banks here. That request reaches the handler and so is counted.
    A malformed body is a different matter: Pydantic rejects it before the handler runs,
    so it never reaches the limiter, and it also tells an attacker nothing and touches
    no table. Not worth closing.
    """
    make_tenant(db, "acme")

    for _ in range(_SIGNUP_LIMIT.limit):
        assert signup(client, slug="acme").status_code == 409

    assert signup(client).status_code == 429


# ── Idempotence, for the shell path ───────────────────────────────────


def test_provisioning_an_existing_slug_tops_up_rather_than_duplicating(
    client: TestClient, db: Session
) -> None:
    """The shell path is re-runnable, so a half-finished provision can be finished."""
    from elogix_api.modules.identity.provisioning import provision

    signup(client)
    before = db.query(Company).filter(Company.slug == "himalayan").count()

    company, user, issued = provision(
        db,
        name="Himalayan Bank",
        slug="himalayan",
        admin_email="hr@himalayan.com.np",
        admin_name="HR Manager",
        plan_tier=PlanTier.TRIAL,
        quiet=True,
    )
    db.commit()

    assert db.query(Company).filter(Company.slug == "himalayan").count() == before
    # An existing admin keeps their password; nothing new is issued.
    assert issued is None
    assert (
        db.query(UserRole).filter(UserRole.user_id == user.id).count() == 1
    ), "the role should not be granted twice"
    assert company.plan_tier is PlanTier.TRIAL
