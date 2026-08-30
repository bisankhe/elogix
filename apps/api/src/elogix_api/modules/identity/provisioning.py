"""Creating a tenant.

The one operation with no tenant to be scoped by, which makes it the one place a mistake
is cross-tenant by construction rather than by a forgotten filter. Two callers share this
module so that rule lives in one place:

* `POST /auth/register-company` — public self-service signup, the screen at `/register`.
* `python -m elogix_api.modules.identity.provisioning` — the same thing from a shell,
  for onboarding somebody who is not going to fill in a form.

**What guards the public endpoint**, since it is the only unauthenticated write in the
system:

* A signup may only ever create a **trial** tenant. The plan is not an input, so no
  request can grant itself a paid tier.
* Slugs are validated, length-bounded and checked against a reserved list — `api`,
  `admin`, `www` and the rest — because the slug is the login identifier and, one day,
  a subdomain.
* Rate limited per IP. In-process and therefore per-worker, which is honest rather than
  sufficient: a real deployment wants this in front of the app, and the limiter says so.
* The response is deliberately the same whether the email was already registered or
  not, so signup cannot be used to enumerate who banks with whom.

The prototype built this endpoint too, and it is a fair warning about the shape: its
platform console skipped its key check entirely when `FLASK_ENV=development`, used one
shared static secret defaulting to `elogix-admin-2026`, and returned three fictional
companies with `success: true` whenever the database errored.

**Idempotent.** Re-running against an existing slug tops up whatever is missing rather
than failing or duplicating — every seeder it calls is idempotent, so a half-finished
provision can simply be run again.
"""

import argparse
import re
import secrets
import string
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

import elogix_api.db.registry  # noqa: F401  — maps every table; see seed_scenarios.py
from elogix_api.core.security import hash_password
from elogix_api.db.session import SessionLocal
from elogix_api.modules.attendance.service import get_or_create_policy
from elogix_api.modules.identity.models import (
    Company,
    PlanTier,
    RoleCode,
    User,
    UserRole,
)
from elogix_api.modules.leave.service import seed_statutory_types
from elogix_api.modules.payroll.service import seed_tax_scales
from elogix_api.modules.recruitment.service import seed_stages

# Long enough that it does not need rotating before the person logs in, and generated
# rather than chosen so it is never a pattern someone reuses. It is printed once.
PASSWORD_ALPHABET = string.ascii_letters + string.digits
PASSWORD_LENGTH = 20


# Slugs the product needs for itself, or that would be confusing to hand out. A signup
# cannot take one; provisioning from a shell can, because whoever has the shell is
# already trusted with far more than a slug.
RESERVED_SLUGS = frozenset(
    {
        "admin", "api", "app", "www", "mail", "static", "assets", "cdn", "docs",
        "support", "help", "status", "billing", "account", "accounts", "auth",
        "login", "register", "signup", "elogix", "system", "internal", "test",
        "demo", "dev", "staging", "production",
    }
)

SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$")


def _temp_password() -> str:
    return "".join(secrets.choice(PASSWORD_ALPHABET) for _ in range(PASSWORD_LENGTH))


def validate_public_slug(slug: str) -> str:
    """Check a slug a stranger chose. Raises `ValueError` with something readable."""
    slug = slug.strip().lower()

    if not SLUG_PATTERN.match(slug):
        raise ValueError(
            "The company URL must be 3 to 63 characters of lowercase letters, numbers "
            "and hyphens, and must start and end with a letter or number."
        )
    if slug in RESERVED_SLUGS:
        raise ValueError(f"'{slug}' is reserved. Please choose another company URL.")
    return slug


def provision(
    db: Session,
    *,
    name: str,
    slug: str,
    admin_email: str,
    admin_name: str,
    plan_tier: PlanTier,
    password: str | None = None,
    quiet: bool = False,
) -> tuple[Company, User, str | None]:
    """Create or top up a tenant. Returns the company, its admin, and any new password.

    Does not commit — the caller owns the transaction, so a failure part-way leaves no
    half-built tenant behind. `quiet` silences the progress lines, which belong to the
    shell and not to an HTTP request.
    """
    say = (lambda *_: None) if quiet else print
    slug = slug.strip().lower()
    if not slug.replace("-", "").isalnum():
        raise ValueError("The slug may contain only letters, numbers and hyphens")

    company = db.execute(select(Company).where(Company.slug == slug)).scalar_one_or_none()
    if company is None:
        company = Company(name=name, slug=slug, plan_tier=plan_tier)
        db.add(company)
        db.flush()
        say(f"  created company    {name} ({slug}) on the {plan_tier.value} plan")
    else:
        say(f"  company {slug} already exists — topping up what is missing")

    user = db.execute(
        select(User).where(User.company_id == company.id, User.email == admin_email)
    ).scalar_one_or_none()

    issued: str | None = None
    if user is None:
        issued = password or _temp_password()
        user = User(
            company_id=company.id,
            email=admin_email,
            password_hash=hash_password(issued),
            full_name=admin_name,
        )
        db.add(user)
        db.flush()
        db.add(
            UserRole(company_id=company.id, user_id=user.id, role=RoleCode.SUPER_ADMIN)
        )
        say(f"  created admin      {admin_email} with role {RoleCode.SUPER_ADMIN.value}")
    else:
        say(f"  admin {admin_email} already exists — password unchanged")

    # Everything a tenant needs before anyone can do useful work. Each of these is
    # idempotent and each would otherwise be seeded lazily on first read, which means
    # the first person in pays the cost and a fresh tenant looks broken until they do.
    leave_types = seed_statutory_types(db, company_id=company.id)
    scales = seed_tax_scales(db, company_id=company.id)
    stages = seed_stages(db, company_id=company.id)
    get_or_create_policy(db, company_id=company.id)

    # Statutory documents are deliberately *not* pre-created as placeholder rows. The
    # compliance view is built from the list in `nepal/company.py`, so all ten appear
    # whether or not any exist — and a row with no file would read as *held*, telling a
    # brand-new company its paperwork was in order. A checklist that lies on day one is
    # worse than no checklist.
    say(f"  seeded             {leave_types} leave types, {scales} tax scales,")
    say(f"                     {stages} pipeline stages, 1 attendance policy")

    return company, user, issued


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="python -m elogix_api.modules.identity.provisioning",
        description="Onboard a company. Safe to re-run against an existing slug.",
    )
    parser.add_argument("--name", required=True, help="Trading name, e.g. 'Himalayan Bank'")
    parser.add_argument("--slug", required=True, help="Login identifier, e.g. 'himalayan'")
    parser.add_argument("--admin-email", required=True)
    parser.add_argument("--admin-name", required=True)
    parser.add_argument(
        "--plan",
        default=PlanTier.TRIAL.value,
        choices=[t.value for t in PlanTier],
        help="Plan tier, which decides the modules. Defaults to trial.",
    )
    parser.add_argument(
        "--password",
        help="Set the admin's first password. Omitted, one is generated and printed once.",
    )
    args = parser.parse_args()

    print(f"\nProvisioning '{args.slug}'…")
    with SessionLocal() as db:
        try:
            company, user, issued = provision(
                db,
                name=args.name,
                slug=args.slug,
                admin_email=args.admin_email,
                admin_name=args.admin_name,
                plan_tier=PlanTier(args.plan),
                password=args.password,
            )
            db.commit()
        except Exception as exc:
            db.rollback()
            # Loudly. The prototype's equivalent returned `success: true` on failure,
            # which is how a tenant that does not exist gets handed to a customer.
            print(f"\n  FAILED: {exc}\n", file=sys.stderr)
            raise SystemExit(1) from exc

    print(f"\n  {company.name} is ready.\n")
    print(f"    company slug   {company.slug}")
    print(f"    sign in as     {user.email}")
    if issued:
        print(f"    password       {issued}")
        print("\n  This password is shown once and is not recoverable. Send it to the")
        print("  admin over a channel you trust, and have them change it.")
        print("  There is no invite flow yet, so whoever runs this knows the password —")
        print("  a documented compromise, not an oversight.")
    print(
        "\n  Next: set the statutory identity at Company Profile. Payroll cannot file a"
        "\n  return without the PAN and the SSF employer code.\n"
    )


if __name__ == "__main__":
    main()
