"""Create one tenant, one login and a handful of employees for local development.

    uv run python -m elogix_api.seed

Idempotent: re-running leaves the existing rows alone. Development credentials only —
nothing here is used by tests, which build their own fixtures.
"""

from datetime import date

from sqlalchemy import select

from elogix_api.core.security import hash_password
from elogix_api.core.tenancy import set_current_company
from elogix_api.db.session import SessionLocal
from elogix_api.modules.employee.models import Employee, EmployeeStatus
from elogix_api.modules.identity.models import Company, PlanTier, RoleCode, User, UserRole

COMPANY_SLUG = "acme"
LOGIN_EMAIL = "admin@acme.com.np"
LOGIN_PASSWORD = "devpassword123"


def main() -> None:
    with SessionLocal() as db:
        company = db.execute(
            select(Company).where(Company.slug == COMPANY_SLUG)
        ).scalar_one_or_none()

        if company is None:
            company = Company(
                name="Acme Nepal Pvt. Ltd.", slug=COMPANY_SLUG, plan_tier=PlanTier.ENTERPRISE
            )
            db.add(company)
            db.flush()
            print(f"created company {COMPANY_SLUG}")

        # Everything below writes to tables under row-level security, so the tenant has
        # to be bound first — the seed runs as the restricted runtime role, same as the
        # application, rather than as the schema owner.
        set_current_company(db, company.id)

        user = db.execute(
            select(User).where(User.company_id == company.id, User.email == LOGIN_EMAIL)
        ).scalar_one_or_none()

        if user is None:
            user = User(
                company_id=company.id,
                email=LOGIN_EMAIL,
                password_hash=hash_password(LOGIN_PASSWORD),
                full_name="Acme Administrator",
            )
            db.add(user)
            db.flush()
            db.add(
                UserRole(
                    company_id=company.id, user_id=user.id, role=RoleCode.SUPER_ADMIN
                )
            )
            print(f"created user {LOGIN_EMAIL} with role {RoleCode.SUPER_ADMIN}")

        existing = db.execute(
            select(Employee.employee_code).where(Employee.company_id == company.id)
        ).scalars()
        known = set(existing)

        for code, name, status, joined in [
            ("EMP-001", "Sita Sharma", EmployeeStatus.ACTIVE, date(2023, 4, 17)),
            ("EMP-002", "Bikash Thapa", EmployeeStatus.PROBATION, date(2026, 6, 1)),
            ("EMP-003", "Anjali Gurung", EmployeeStatus.ACTIVE, date(2021, 11, 8)),
        ]:
            if code in known:
                continue
            db.add(
                Employee(
                    company_id=company.id,
                    employee_code=code,
                    full_name=name,
                    email=f"{code.lower()}@acme.com.np",
                    status=status,
                    joined_on=joined,
                )
            )
            print(f"created employee {code}")

        db.commit()

    print(f"\nlog in with  {LOGIN_EMAIL} / {LOGIN_PASSWORD}  at company '{COMPANY_SLUG}'")


if __name__ == "__main__":
    main()
