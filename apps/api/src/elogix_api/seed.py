"""Create one tenant, one login and a handful of employees for local development.

    uv run python -m elogix_api.seed

Idempotent: re-running leaves the existing rows alone. Development credentials only —
nothing here is used by tests, which build their own fixtures.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

import elogix_api.db.registry  # noqa: F401  — maps every table; see seed_scenarios.py
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
from elogix_api.modules.employee.enums import Gender, MaritalStatus
from elogix_api.modules.employee.models import (
    AssignmentReason,
    Employee,
    EmployeeAssignment,
    EmployeeEvent,
    EmployeeEventType,
    EmployeeStatus,
)
from elogix_api.modules.identity.models import (
    Company,
    CompanyDocument,
    PlanTier,
    RoleCode,
    User,
    UserRole,
)
from elogix_api.modules.leave.models import DayPortion, LeaveRequest, LeaveRequestStatus, LeaveType
from elogix_api.modules.leave.service import (
    accrue_month,
    approve,
    grant_annual,
    seed_statutory_types,
)
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
from elogix_api.modules.payroll.models import (
    ComponentKind,
    EmployeeSalary,
    EmployeeSalaryLine,
    PayrollRun,
    SalaryComponent,
)
from elogix_api.modules.payroll.service import compute_run, set_salary
from elogix_api.nepal import company as nepal_company

COMPANY_SLUG = "acme"
LOGIN_EMAIL = "admin@acme.com.np"
LOGIN_PASSWORD = "devpassword123"


@dataclass(frozen=True)
class SeedPerson:
    code: str
    status: EmployeeStatus
    joined_on: date
    designation: str
    location: str
    details: dict


# Three people, filled in rather than sketched. `marital_status` and `gender` are not
# decoration: the tax slabs differ for a married filer and there is a 10% rebate for
# women, so a payroll screenshot with everyone left at the enum default would exercise
# exactly one of four code paths.
PEOPLE = (
    SeedPerson(
        code="EMP-001",
        status=EmployeeStatus.ACTIVE,
        joined_on=date(2023, 4, 17),
        designation="SSE",
        location="LOC-KTM",
        details={
            "first_name": "Sita",
            "last_name": "Sharma",
            "full_name_nepali": "सीता शर्मा",
            "gender": Gender.FEMALE,
            "marital_status": MaritalStatus.MARRIED,
            "date_of_birth": date(1993, 8, 21),
            "phone": "+977-9801234567",
            "personal_email": "sita.sharma@example.com.np",
            "address": "Baluwatar, Kathmandu",
            "province": "Bagmati",
            "district": "Kathmandu",
            "emergency_contact_name": "Ramesh Sharma",
            "emergency_contact_phone": "+977-9807654321",
            "citizenship_number": "27-01-70-01234",
            "pan_number": "301234567",
            "ssf_number": "SSF-1000123",
            "bank_name": "Nabil Bank",
            "bank_account_number": "01512345678901",
            "confirmed_on": date(2023, 10, 17),
        },
    ),
    SeedPerson(
        code="EMP-002",
        status=EmployeeStatus.PROBATION,
        joined_on=date(2026, 6, 1),
        designation="SE",
        location="LOC-PKR",
        details={
            "first_name": "Bikash",
            "last_name": "Thapa",
            "full_name_nepali": "विकाश थापा",
            "gender": Gender.MALE,
            "marital_status": MaritalStatus.SINGLE,
            "date_of_birth": date(2000, 2, 4),
            "phone": "+977-9812345678",
            "address": "Lakeside, Pokhara",
            "province": "Gandaki",
            "district": "Kaski",
            "citizenship_number": "44-02-77-05678",
            "pan_number": "302345678",
            "bank_name": "Nabil Bank",
            "bank_account_number": "01598765432109",
            # No SSF number yet, and no confirmation date: this is what a record looks
            # like six weeks into probation, and the screens have to cope with it.
            "probation_ends_on": date(2026, 12, 1),
        },
    ),
    SeedPerson(
        code="EMP-003",
        status=EmployeeStatus.ACTIVE,
        joined_on=date(2021, 11, 8),
        designation="HOD",
        location="LOC-KTM",
        details={
            "first_name": "Anjali",
            "last_name": "Gurung",
            "full_name_nepali": "अञ्जली गुरुङ",
            "gender": Gender.FEMALE,
            "marital_status": MaritalStatus.SINGLE,
            "date_of_birth": date(1988, 12, 30),
            "phone": "+977-9843210987",
            "personal_email": "anjali.gurung@example.com.np",
            "address": "Jhamsikhel, Lalitpur",
            "province": "Bagmati",
            "district": "Lalitpur",
            "emergency_contact_name": "Maya Gurung",
            "emergency_contact_phone": "+977-9841122334",
            "citizenship_number": "27-03-68-09876",
            "pan_number": "303456789",
            "ssf_number": "SSF-1000456",
            "bank_name": "Himalayan Bank",
            "bank_account_number": "01234509876543",
            "confirmed_on": date(2022, 5, 8),
        },
    ),
)


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

        # The statutory identity a filing names the employer by. Seeded so the payroll
        # and compliance screens have something real rather than a column of blanks.
        if company.pan_number is None:
            company.legal_name = "Acme Nepal Private Limited"
            company.pan_number = "301234567"
            company.vat_number = "301234567"
            company.registration_number = "OCR-0091234"
            company.registered_on = date(2020, 3, 15)
            company.ird_office = "Inland Revenue Office, Kathmandu"
            company.ssf_employer_code = "SSF-EMP-100234"
            company.labour_office = "Department of Labour, Kathmandu"
            company.address = "Baluwatar Marg 12"
            company.ward = "4"
            company.municipality = "Kathmandu Metropolitan City"
            company.district = "Kathmandu"
            company.province = "Bagmati"
            company.phone = "+977-1-4001234"
            company.email = "info@acme.com.np"
            print("set the company's statutory identity")


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

        # Personal details are filled in rather than left null. Self-service shows a
        # person what their employer holds on them, and a screen of em-dashes proves
        # nothing about the layout, the labels or the fields that payroll depends on —
        # PAN and SSF number among them.
        designations = {
            d.code: d
            for d in db.execute(
                select(Designation).where(Designation.company_id == company.id)
            ).scalars()
        }
        locations = {
            loc.code: loc
            for loc in db.execute(
                select(WorkLocation).where(WorkLocation.company_id == company.id)
            ).scalars()
        }

        for person in PEOPLE:
            if person.code in known:
                continue
            employee = Employee(
                company_id=company.id,
                employee_code=person.code,
                work_email=f"{person.code.lower()}@acme.com.np",
                status=person.status,
                joined_on=person.joined_on,
                **person.details,
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
                    designation_id=designations[person.designation].id,
                    grade_level_id=designations[person.designation].grade_level_id,
                    work_location_id=locations[person.location].id,
                    reason=AssignmentReason.HIRE,
                    effective_from=person.joined_on,
                )
            )
            db.add(
                EmployeeEvent(
                    company_id=company.id,
                    employee_id=employee.id,
                    event_type=EmployeeEventType.HIRED,
                    occurred_on=person.joined_on,
                )
            )
            print(f"created employee {person.code}")

        db.commit()
        _seed_company_documents(db, company.id)
        db.commit()
        _seed_self_service(db, company.id, user)
        db.commit()
        _seed_attendance(db, company.id)
        db.commit()
        _seed_leave(db, company.id)
        db.commit()
        _seed_payroll(db, company.id)
        db.commit()

    print(f"\nlog in with  {LOGIN_EMAIL} / {LOGIN_PASSWORD}  at company '{COMPANY_SLUG}'")


def _seed_company_documents(db: Session, company_id: uuid.UUID) -> None:
    """A partly-collected paperwork file, which is what a real one looks like.

    Deliberately incomplete and deliberately lapsed: the compliance screen exists to
    show gaps, and a screen where everything is green proves nothing about it.
    """
    existing = db.execute(
        select(func.count())
        .select_from(CompanyDocument)
        .where(CompanyDocument.company_id == company_id)
    ).scalar_one()
    if existing:
        return

    today = date.today()
    for code, title, expires, verified in (
        ("OCR_CERTIFICATE", "Company Registration Certificate", None, True),
        ("PAN_CERTIFICATE", "PAN Certificate", None, True),
        ("SSF_REGISTRATION", "SSF Employer Registration", None, True),
        # Lapsed a fortnight ago — a trade licence that stops the company trading.
        ("TRADE_LICENSE", "Trade Licence 2082-83", today - timedelta(days=14), True),
        # Due inside the renewal window.
        ("TAX_CLEARANCE", "Tax Clearance 2081-82", today + timedelta(days=25), False),
    ):
        spec = nepal_company.BY_CODE[code]
        db.add(
            CompanyDocument(
                company_id=company_id,
                category=code,
                title=title,
                issuing_authority=spec.authority,
                expires_on=expires,
                is_verified=verified,
                verified_by="Acme Administrator" if verified else None,
                verified_at=datetime.now(UTC) if verified else None,
            )
        )
    print("created company documents: 5 of 10 statutory, 1 lapsed and 1 due")


def _seed_self_service(db: Session, company_id: uuid.UUID, user: User) -> None:
    """Point the dev login at a real employee so `/me` has something to show.

    Without this every self-service screen is a correct-but-useless 403, and the empty
    state you would be looking at is not the one users see.
    """
    if user.employee_id is not None:
        return

    employee = db.execute(
        select(Employee).where(
            Employee.company_id == company_id, Employee.employee_code == "EMP-001"
        )
    ).scalar_one_or_none()
    if employee is None:
        return

    user.employee_id = employee.id
    print(f"linked {user.email} to employee {employee.employee_code} for self-service")


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


def _seed_leave(db: Session, company_id: uuid.UUID) -> None:
    """Statutory leave types, a year of accrual, and a couple of requests to decide."""
    created = seed_statutory_types(db, company_id=company_id)
    if not created:
        return

    grant_annual(db, company_id=company_id, year=2026)
    for month in range(1, 13):
        accrue_month(db, company_id=company_id, year=2026, month=month)

    sick = db.execute(
        select(LeaveType).where(LeaveType.company_id == company_id, LeaveType.code == "SL")
    ).scalar_one()
    # The ledger records who approved, so use the seeded administrator rather than a
    # null actor — an approval with no approver is not a thing that happens.
    approver = db.execute(
        select(User).where(User.company_id == company_id, User.email == LOGIN_EMAIL)
    ).scalar_one()
    employees = list(
        db.execute(select(Employee).where(Employee.company_id == company_id)).scalars()
    )

    # One approved, one still waiting — so the queue is not empty on first look.
    approved = LeaveRequest(
        company_id=company_id,
        employee_id=employees[0].id,
        leave_type_id=sick.id,
        start_date=date(2026, 3, 17),
        end_date=date(2026, 3, 18),
        portion=DayPortion.FULL,
        days=Decimal("2"),
        reason="Fever, seen at Patan Hospital",
        status=LeaveRequestStatus.PENDING,
    )
    db.add(approved)
    db.flush()
    approve(db, request=approved, user_id=approver.id, note="Approved")

    db.add(
        LeaveRequest(
            company_id=company_id,
            employee_id=employees[-1].id,
            leave_type_id=sick.id,
            start_date=date(2026, 4, 6),
            end_date=date(2026, 4, 7),
            portion=DayPortion.FULL,
            days=Decimal("2"),
            reason="Dental surgery",
            status=LeaveRequestStatus.PENDING,
        )
    )
    db.commit()

    # The approved leave changes those days in the register, so rebuild March.
    process_range(db, company_id=company_id, start=date(2026, 3, 1), end=date(2026, 3, 31))
    print("created leave: 6 statutory types, 2026 accrued, 1 approved and 1 pending request")


def _seed_payroll(db: Session, company_id: uuid.UUID) -> None:
    """Salaries and a computed March run, so the payroll screen has something true."""
    if db.execute(
        select(EmployeeSalary.id).where(EmployeeSalary.company_id == company_id)
    ).first():
        return

    allowance = SalaryComponent(
        company_id=company_id,
        code="ALW",
        name="Transport allowance",
        kind=ComponentKind.EARNING,
    )
    db.add(allowance)
    db.flush()

    for index, employee in enumerate(
        db.execute(select(Employee).where(Employee.company_id == company_id)).scalars()
    ):
        basic = Decimal("45000") + Decimal(index) * Decimal("15000")
        salary = set_salary(
            db,
            company_id=company_id,
            employee_id=employee.id,
            basic=basic,
            effective_from=date(2025, 1, 1),
        )
        db.flush()
        db.add(
            EmployeeSalaryLine(
                company_id=company_id,
                employee_salary_id=salary.id,
                salary_component_id=allowance.id,
                amount=Decimal("5000"),
            )
        )
    db.commit()

    run = PayrollRun(
        company_id=company_id,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        fiscal_year="2082-83",
    )
    db.add(run)
    db.commit()
    written = compute_run(db, run=run)
    print(f"created payroll: salaries for all staff, March 2026 run with {written} payslips")


if __name__ == "__main__":
    main()
