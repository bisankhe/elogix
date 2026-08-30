"""A second tenant, for the states the main seed cannot show.

    uv run python -m elogix_api.seed_scenarios

`startup` is a brand-new company on the trial plan with no data at all. That combination
exercises two things the fully-populated `acme` tenant never can: every empty state, and
a nav filtered down by entitlements rather than showing everything.
"""


from sqlalchemy import select

from elogix_api.core.security import hash_password
from elogix_api.db.session import SessionLocal
from elogix_api.modules.identity.models import Company, PlanTier, RoleCode, User, UserRole

COMPANY_SLUG = "startup"
LOGIN_EMAIL = "admin@startup.com.np"
LOGIN_PASSWORD = "devpassword123"


def main() -> None:
    with SessionLocal() as db:
        existing = db.execute(
            select(Company).where(Company.slug == COMPANY_SLUG)
        ).scalar_one_or_none()
        if existing is not None:
            print(f"{COMPANY_SLUG} already exists")
            return

        company = Company(
            name="Startup Nepal Pvt. Ltd.",
            slug=COMPANY_SLUG,
            # Trial: org, employee, attendance, leave and ESS only. No payroll, no ATS.
            plan_tier=PlanTier.TRIAL,
        )
        db.add(company)
        db.flush()

        user = User(
            company_id=company.id,
            email=LOGIN_EMAIL,
            password_hash=hash_password(LOGIN_PASSWORD),
            full_name="Startup Administrator",
        )
        db.add(user)
        db.flush()
        db.add(
            UserRole(company_id=company.id, user_id=user.id, role=RoleCode.HR_MANAGER)
        )
        db.commit()

        print(f"created empty trial tenant '{COMPANY_SLUG}'")
        print(f"log in with  {LOGIN_EMAIL} / {LOGIN_PASSWORD}  at company '{COMPANY_SLUG}'")



if __name__ == "__main__":
    main()
