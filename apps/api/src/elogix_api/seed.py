"""Create one tenant, one login and a handful of employees for local development.

    uv run python -m elogix_api.seed

Idempotent: re-running leaves the existing rows alone. Development credentials only —
nothing here is used by tests, which build their own fixtures.
"""

import uuid
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.core.security import hash_password
from elogix_api.db.session import SessionLocal
from elogix_api.modules.attendance.models import (
    AttendancePunch,
    Holiday,
    PunchDirection,
    PunchSource,
    RosterEntry,
    Shift,
)
from elogix_api.modules.attendance.service import process_range
from elogix_api.modules.employee.models import (
    AssignmentReason,
    Employee,
    EmployeeAssignment,
    EmployeeEvent,
    EmployeeEventType,
    EmployeeStatus,
)
from elogix_api.modules.identity.models import Company, PlanTier, RoleCode, User, UserRole
from elogix_api.modules.org.models import (
    CostCentre,
    Designation,
    EmploymentCategory,
    EmploymentType,
    GradeLevel,
    OrgUnit,
    OrgUnitKind,
    Position,
    WorkLocation,
)

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

        _seed_org(db, company.id)

        existing = db.execute(
            select(Employee.employee_code).where(Employee.company_id == company.id)
        ).scalars()
        known = set(existing)

        eng = db.execute(
            select(OrgUnit).where(OrgUnit.company_id == company.id, OrgUnit.code == "ENG")
        ).scalar_one()

        for code, first, last, emp_status, joined in [
            ("EMP-001", "Sita", "Sharma", EmployeeStatus.ACTIVE, date(2023, 4, 17)),
            ("EMP-002", "Bikash", "Thapa", EmployeeStatus.PROBATION, date(2026, 6, 1)),
            ("EMP-003", "Anjali", "Gurung", EmployeeStatus.ACTIVE, date(2021, 11, 8)),
        ]:
            if code in known:
                continue
            employee = Employee(
                company_id=company.id,
                employee_code=code,
                first_name=first,
                last_name=last,
                work_email=f"{code.lower()}@acme.com.np",
                status=emp_status,
                joined_on=joined,
            )
            db.add(employee)
            db.flush()
            # Every employee gets an opening assignment and a hire event, the same way
            # the API's /employees POST would create them.
            db.add(
                EmployeeAssignment(
                    company_id=company.id,
                    employee_id=employee.id,
                    org_unit_id=eng.id,
                    reason=AssignmentReason.HIRE,
                    effective_from=joined,
                )
            )
            db.add(
                EmployeeEvent(
                    company_id=company.id,
                    employee_id=employee.id,
                    event_type=EmployeeEventType.HIRED,
                    occurred_on=joined,
                )
            )
            print(f"created employee {code}")

        db.commit()
        _seed_attendance(db, company.id)
        db.commit()

    print(f"\nlog in with  {LOGIN_EMAIL} / {LOGIN_PASSWORD}  at company '{COMPANY_SLUG}'")


def _seed_org(db: Session, company_id: uuid.UUID) -> None:
    """A small but realistic Nepali org chart, so the UI has something true to render."""
    if db.execute(
        select(OrgUnit.id).where(OrgUnit.company_id == company_id)
    ).first() is not None:
        return

    def unit(code: str, name: str, kind: OrgUnitKind, parent: OrgUnit | None) -> OrgUnit:
        row = OrgUnit(
            company_id=company_id,
            code=code,
            name=name,
            kind=kind,
            parent_id=parent.id if parent else None,
            depth=(parent.depth + 1) if parent else 0,
        )
        db.add(row)
        db.flush()
        return row

    group = unit("ACME", "Acme Group", OrgUnitKind.GROUP, None)
    ktm = unit("KTM", "Kathmandu Head Office", OrgUnitKind.BRANCH, group)
    pkr = unit("PKR", "Pokhara Branch", OrgUnitKind.BRANCH, group)
    for code, name, parent in (
        ("ENG", "Engineering", ktm),
        ("FIN", "Finance", ktm),
        ("HR", "Human Resources", ktm),
        ("OPS", "Operations", pkr),
    ):
        dept = unit(code, name, OrgUnitKind.DEPARTMENT, parent)
        if code == "ENG":
            unit("ENG-QA", "Quality Assurance", OrgUnitKind.TEAM, dept)
            unit("ENG-PLT", "Platform", OrgUnitKind.TEAM, dept)

    for code, name, rank in (
        ("G1", "Assistant", 1),
        ("G2", "Officer", 2),
        ("G3", "Senior Officer", 3),
        ("G4", "Manager", 4),
        ("G5", "Head of Department", 5),
    ):
        db.add(GradeLevel(company_id=company_id, code=code, name=name, rank=rank))

    for code, name in (
        ("CC-HO", "Head Office"),
        ("CC-ENG", "Engineering"),
        ("CC-OPS", "Field Operations"),
    ):
        db.add(CostCentre(company_id=company_id, code=code, name=name))

    for code, name, district in (
        ("LOC-KTM", "Kathmandu Office", "Kathmandu"),
        ("LOC-PKR", "Pokhara Office", "Kaski"),
        ("LOC-WFH", "Remote", None),
    ):
        db.add(WorkLocation(company_id=company_id, code=code, name=name, district=district))

    # Nepal Labour Act 2074: probation capped at six months, overtime at 1.5x basic.
    for code, name, kind, probation, notice, ot in (
        ("PERM", "Permanent", EmploymentType.PERMANENT, 6, 30, True),
        ("CONT", "Contract", EmploymentType.CONTRACT, 0, 15, True),
        ("CASU", "Casual", EmploymentType.CASUAL, 0, 0, True),
        ("INTN", "Intern", EmploymentType.INTERN, 0, 7, False),
    ):
        db.add(
            EmploymentCategory(
                company_id=company_id,
                code=code,
                name=name,
                employment_type=kind,
                probation_months=probation,
                notice_days=notice,
                is_overtime_eligible=ot,
            )
        )

    db.flush()
    grades = {
        g.code: g
        for g in db.execute(
            select(GradeLevel).where(GradeLevel.company_id == company_id)
        ).scalars()
    }
    for code, name, grade in (
        ("SE", "Software Engineer", "G2"),
        ("SSE", "Senior Software Engineer", "G3"),
        ("ACC", "Accountant", "G2"),
        ("HRO", "HR Officer", "G2"),
        ("HOD", "Head of Department", "G5"),
    ):
        db.add(
            Designation(
                company_id=company_id, code=code, name=name, grade_level_id=grades[grade].id
            )
        )

    db.flush()
    units = {
        u.code: u
        for u in db.execute(
            select(OrgUnit).where(OrgUnit.company_id == company_id)
        ).scalars()
    }
    designations = {
        d.code: d
        for d in db.execute(
            select(Designation).where(Designation.company_id == company_id)
        ).scalars()
    }
    locations = {
        loc.code: loc
        for loc in db.execute(
            select(WorkLocation).where(WorkLocation.company_id == company_id)
        ).scalars()
    }
    categories = {
        c.code: c
        for c in db.execute(
            select(EmploymentCategory).where(EmploymentCategory.company_id == company_id)
        ).scalars()
    }
    cost_centres = {
        c.code: c
        for c in db.execute(
            select(CostCentre).where(CostCentre.company_id == company_id)
        ).scalars()
    }

    for code, title, unit_code, desig, cc, headcount in (
        ("POS-ENG-01", "Software Engineer", "ENG", "SE", "CC-ENG", 4),
        ("POS-ENG-02", "Senior Software Engineer", "ENG", "SSE", "CC-ENG", 2),
        ("POS-ENG-03", "Engineering Head", "ENG", "HOD", "CC-ENG", 1),
        ("POS-FIN-01", "Accountant", "FIN", "ACC", "CC-HO", 2),
        ("POS-HR-01", "HR Officer", "HR", "HRO", "CC-HO", 2),
        ("POS-OPS-01", "Operations Officer", "OPS", "HRO", "CC-OPS", 3),
    ):
        db.add(
            Position(
                company_id=company_id,
                code=code,
                title=title,
                org_unit_id=units[unit_code].id,
                designation_id=designations[desig].id,
                cost_centre_id=cost_centres[cc].id,
                work_location_id=locations["LOC-KTM"].id,
                employment_category_id=categories["PERM"].id,
                headcount=headcount,
            )
        )

    print(
        f"created org chart: {len(units)} units, 5 grades, {len(cost_centres)} cost centres, "
        f"{len(locations)} locations, {len(categories)} categories, 6 positions"
    )


def _seed_attendance(db: Session, company_id: uuid.UUID) -> None:
    """A shift, some holidays, a roster and a month of punches, then process it.

    Deliberately imperfect: one employee is late twice, one works overtime, and one day
    is missed entirely — so the register shows the states a user actually has to deal
    with rather than a wall of identical green rows.
    """
    if db.execute(
        select(Shift.id).where(Shift.company_id == company_id)
    ).first() is not None:
        return

    shift = Shift(
        company_id=company_id,
        code="GEN",
        name="General (09:00-18:00)",
        starts_at=time(9, 0),
        ends_at=time(18, 0),
        break_minutes=60,
    )
    db.add(shift)

    for holiday_date, name, bs in (
        (date(2026, 3, 8), "International Women's Day", "२०८२ फाल्गुन २४"),
        (date(2026, 3, 20), "Ghode Jatra", "२०८२ चैत ६"),
    ):
        db.add(
            Holiday(
                company_id=company_id, holiday_date=holiday_date, name=name, bs_label=bs
            )
        )
    db.flush()

    employees = list(
        db.execute(select(Employee).where(Employee.company_id == company_id)).scalars()
    )
    start, end = date(2026, 3, 1), date(2026, 3, 31)

    for index, employee in enumerate(employees):
        day = start
        while day <= end:
            # Sunday-Friday roster; Saturday is the weekly off in Nepal.
            if day.weekday() != 5:
                db.add(
                    RosterEntry(
                        company_id=company_id,
                        employee_id=employee.id,
                        work_date=day,
                        shift_id=shift.id,
                    )
                )
                in_hour, in_minute, out_hour = 9, 0, 18
                if day.day % 9 == index:            # a couple of late arrivals
                    in_minute = 35
                if day.day % 11 == index:           # and some overtime
                    out_hour = 20
                skip = day.day == 11 and index == 0  # one missed punch-out

                db.add(
                    AttendancePunch(
                        company_id=company_id,
                        employee_id=employee.id,
                        work_date=day,
                        punched_at=datetime(
                            day.year, day.month, day.day, in_hour, in_minute, tzinfo=UTC
                        ),
                        direction=PunchDirection.IN,
                        source=PunchSource.BIOMETRIC,
                    )
                )
                if not skip:
                    db.add(
                        AttendancePunch(
                            company_id=company_id,
                            employee_id=employee.id,
                            work_date=day,
                            punched_at=datetime(
                                day.year, day.month, day.day, out_hour, 0, tzinfo=UTC
                            ),
                            direction=PunchDirection.OUT,
                            source=PunchSource.BIOMETRIC,
                        )
                    )
            day += timedelta(days=1)

    db.commit()
    written = process_range(db, company_id=company_id, start=start, end=end)
    print(f"created attendance: 1 shift, 2 holidays, March 2026 rostered, {written} days processed")

if __name__ == "__main__":
    main()
