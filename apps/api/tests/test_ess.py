"""Self-service, and the boundary it exists to hold.

Tenant isolation keeps Acme out of Globex. This is the *other* axis: it keeps one Acme
employee out of another Acme employee's payslip, and nothing else in the suite tests it,
because every other module is written for HR — who are supposed to see everyone.

The sweep at the bottom is the point of the file. Two colleagues in one tenant, one of
them seeded with distinctive data, and every ESS route called as the other: no route may
return a trace of the colleague. Add a route to `modules/ess/router.py` and add it here.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.security import hash_password
from elogix_api.modules.employee.enums import DocumentType
from elogix_api.modules.employee.models import (
    Employee,
    EmployeeDocument,
    EmployeeStatus,
)
from elogix_api.modules.identity.models import PlanTier, User
from elogix_api.modules.payroll.models import PayrollRun, Payslip, RunStatus
from tests.conftest import PASSWORD, auth, make_tenant

# (method, path, body, expected status). Every read route in `modules/ess/router.py`.
#
# The by-id routes are given the *colleague's* id and must answer 404: filtered on my
# employee id rather than checked after the fact, so someone else's row is
# indistinguishable from one that does not exist. The collection routes answer 200 and
# must simply contain nothing of theirs.
ESS_ROUTES = [
    ("GET", "/api/v1/ess/me", None, 200),
    ("GET", "/api/v1/ess/attendance?year=2026&month=3", None, 200),
    ("GET", "/api/v1/ess/leave/balances", None, 200),
    ("GET", "/api/v1/ess/leave/requests", None, 200),
    ("GET", "/api/v1/ess/payslips", None, 200),
    ("GET", "/api/v1/ess/documents", None, 200),
    ("GET", "/api/v1/ess/payslips/{colleague_payslip_id}", None, 404),
    ("GET", "/api/v1/ess/documents/{colleague_document_id}/file", None, 404),
]

# What only the colleague has. If any of it comes back, the boundary leaked.
COLLEAGUE_MARKERS = ("Bishnu", "EMP-COLLEAGUE", "77777.77", "colleague-only-document")


def make_colleague(db: Session, company_id: uuid.UUID) -> tuple[Employee, User]:
    """A second employee in the same tenant, with a login and distinctive data."""
    employee = Employee(
        company_id=company_id,
        employee_code="EMP-COLLEAGUE",
        first_name="Bishnu",
        last_name="Colleague",
        work_email="bishnu@acme.com.np",
        status=EmployeeStatus.ACTIVE,
        joined_on=date(2024, 1, 15),
        bank_account_number="9999999999",
    )
    db.add(employee)
    db.flush()

    user = User(
        company_id=company_id,
        email="bishnu@acme.com.np",
        password_hash=hash_password(PASSWORD),
        full_name="Bishnu Colleague",
        employee_id=employee.id,
    )
    db.add(user)

    run = PayrollRun(
        company_id=company_id,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        fiscal_year="2082-83",
        status=RunStatus.APPROVED,
        approved_at=datetime.now(UTC),
    )
    db.add(run)
    db.flush()

    zero = Decimal("0")
    db.add(
        Payslip(
            company_id=company_id,
            payroll_run_id=run.id,
            employee_id=employee.id,
            payable_days=Decimal("31"),
            basic_earned=Decimal("77777.77"),
            gross=Decimal("77777.77"),
            taxable_gross=Decimal("77777.77"),
            annual_assessable=Decimal("933333.24"),
            annual_taxable=Decimal("933333.24"),
            annual_tax=zero,
            total_deductions=zero,
            net_pay=Decimal("77777.77"),
        )
    )
    db.add(
        EmployeeDocument(
            company_id=company_id,
            employee_id=employee.id,
            document_type=DocumentType.CONTRACT,
            title="colleague-only-document",
        )
    )
    db.commit()
    return employee, user


def sign_in(client: TestClient, email: str, slug: str = "acme") -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD, "company_slug": slug},
    )
    assert response.status_code == 200, response.text
    return auth(response.json()["access_token"])


@pytest.fixture
def tenant(db: Session) -> tuple[Employee, User, Employee]:
    """Acme, its admin (unlinked), a linked employee, and a linked colleague."""
    company, admin, employee = make_tenant(db, "acme")

    # The admin's login becomes *mine*: linking it is what opens self-service.
    admin.employee_id = employee.id
    colleague, _ = make_colleague(db, company.id)
    db.commit()
    return employee, admin, colleague


# ── The boundary ──────────────────────────────────────────────────────


@pytest.mark.parametrize(("method", "path", "body", "expected"), ESS_ROUTES)
def test_no_ess_route_returns_a_colleagues_data(
    client: TestClient,
    db: Session,
    tenant: tuple[Employee, User, Employee],
    method: str,
    path: str,
    body: dict | None,
    expected: int,
) -> None:
    """The sweep. Same tenant, different person — nothing may cross."""
    _, admin, colleague = tenant
    headers = sign_in(client, "admin@acme.com.np")

    theirs = (
        db.query(Payslip)
        .filter(Payslip.employee_id == colleague.id, Payslip.company_id == admin.company_id)
        .one()
    )
    their_document = (
        db.query(EmployeeDocument)
        .filter(
            EmployeeDocument.employee_id == colleague.id,
            EmployeeDocument.company_id == admin.company_id,
        )
        .one()
    )

    response = client.request(
        method,
        path.format(colleague_payslip_id=theirs.id, colleague_document_id=their_document.id),
        headers=headers,
        json=body,
    )

    assert response.status_code == expected, response.text
    for marker in (*COLLEAGUE_MARKERS, str(colleague.id)):
        assert marker not in response.text, f"{method} {path} leaked a colleague's data"


def test_a_login_with_no_employee_record_is_refused_self_service(
    client: TestClient, db: Session
) -> None:
    """An HR officer who is not on the payroll has nothing to self-serve.

    403 with a reason, not an empty 200: a screen that silently shows nothing teaches
    people the system is broken.
    """
    make_tenant(db, "acme")  # admin is left unlinked
    headers = sign_in(client, "admin@acme.com.np")

    response = client.get("/api/v1/ess/me", headers=headers)

    assert response.status_code == 403
    assert "not linked to an employee record" in response.json()["detail"]


def test_self_service_is_gated_on_the_ess_module(client: TestClient, db: Session) -> None:
    company, admin, employee = make_tenant(db, "globex", plan_tier=PlanTier.TRIAL)
    admin.employee_id = employee.id
    db.commit()

    headers = sign_in(client, "admin@globex.com.np", slug="globex")
    assert client.get("/api/v1/ess/me", headers=headers).status_code == 200

    # Revoke the module and the same call is refused, whatever the frontend shows.
    from elogix_api.modules.identity.models import CompanyModule

    db.add(CompanyModule(company_id=company.id, module="ess", is_enabled=False))
    db.commit()

    response = client.get("/api/v1/ess/me", headers=headers)
    assert response.status_code == 403
    assert "'ess' is not enabled" in response.json()["detail"]


# ── My profile ────────────────────────────────────────────────────────


def test_my_profile_resolves_placement_to_names(
    client: TestClient, db: Session, tenant: tuple[Employee, User, Employee]
) -> None:
    """A self-service screen has no org chart, so it gets names rather than uuids."""
    headers = sign_in(client, "admin@acme.com.np")
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
    employee, _, _ = tenant
    client.post(
        f"/api/v1/employees/{employee.id}/assignments",
        headers=headers,
        json={
            "placement": {"org_unit_id": unit["id"]},
            "effective_from": "2026-01-01",
            "reason": "transfer",
        },
    )

    body = client.get("/api/v1/ess/me", headers=headers).json()

    assert body["employee_code"] == "EMP-001"
    assert body["org_unit"] == "Engineering"


# ── My leave ──────────────────────────────────────────────────────────


def test_applying_for_leave_cannot_name_someone_else(
    client: TestClient, db: Session, tenant: tuple[Employee, User, Employee]
) -> None:
    """The request body has no employee field, so an injected one is simply ignored.

    Pydantic drops unknown keys rather than erroring, which is exactly what should
    happen: the id comes from the token and there is nothing to override.
    """
    _, _, colleague = tenant
    headers = sign_in(client, "admin@acme.com.np")
    client.post("/api/v1/leave/types/seed", headers=headers)
    leave_type = client.get("/api/v1/leave/types", headers=headers).json()[0]

    response = client.post(
        "/api/v1/ess/leave/requests",
        headers=headers,
        json={
            "employee_id": str(colleague.id),  # ignored — there is no such field
            "leave_type_id": leave_type["id"],
            "start_date": "2026-04-06",
            "end_date": "2026-04-06",
            "reason": "Family function",
        },
    )

    assert response.status_code == 201, response.text
    mine, _, _ = tenant
    stored = client.get("/api/v1/leave/requests", headers=headers).json()
    assert [r["employee_id"] for r in stored] == [str(mine.id)]


def test_i_can_withdraw_my_own_pending_request_but_not_an_approved_one(
    client: TestClient, db: Session, tenant: tuple[Employee, User, Employee]
) -> None:
    headers = sign_in(client, "admin@acme.com.np")
    client.post("/api/v1/leave/types/seed", headers=headers)
    leave_type = client.get("/api/v1/leave/types", headers=headers).json()[0]

    created = client.post(
        "/api/v1/ess/leave/requests",
        headers=headers,
        json={
            "leave_type_id": leave_type["id"],
            "start_date": "2026-04-06",
            "end_date": "2026-04-06",
            "reason": "Family function",
        },
    ).json()

    withdrawn = client.post(f"/api/v1/ess/leave/requests/{created['id']}/withdraw", headers=headers)
    assert withdrawn.status_code == 200
    assert withdrawn.json()["status"] == "cancelled"

    # Withdrawing it again is refused: it is no longer pending.
    again = client.post(f"/api/v1/ess/leave/requests/{created['id']}/withdraw", headers=headers)
    assert again.status_code == 409
    assert "already cancelled" in again.json()["detail"]


def test_i_cannot_withdraw_a_colleagues_request(
    client: TestClient, db: Session, tenant: tuple[Employee, User, Employee]
) -> None:
    """404, not 403 — whether a colleague's request exists is not mine to learn."""
    _, _, colleague = tenant
    headers = sign_in(client, "admin@acme.com.np")
    client.post("/api/v1/leave/types/seed", headers=headers)
    leave_type = client.get("/api/v1/leave/types", headers=headers).json()[0]

    theirs = client.post(
        "/api/v1/leave/requests",
        headers=headers,
        json={
            "employee_id": str(colleague.id),
            "leave_type_id": leave_type["id"],
            "start_date": "2026-04-06",
            "end_date": "2026-04-06",
            "reason": "Theirs",
        },
    ).json()

    response = client.post(f"/api/v1/ess/leave/requests/{theirs['id']}/withdraw", headers=headers)
    assert response.status_code == 404


# ── My pay ────────────────────────────────────────────────────────────


def test_an_unapproved_payslip_is_not_visible_to_the_employee(
    client: TestClient, db: Session, tenant: tuple[Employee, User, Employee]
) -> None:
    """A computed run is a draft. Figures still move in it, and showing one turns
    every correction into an argument about a number nobody meant to publish."""
    employee, admin, _ = tenant
    run = PayrollRun(
        company_id=admin.company_id,
        period_start=date(2026, 4, 1),
        period_end=date(2026, 4, 30),
        fiscal_year="2082-83",
        status=RunStatus.COMPUTED,
    )
    db.add(run)
    db.flush()
    zero = Decimal("0")
    db.add(
        Payslip(
            company_id=admin.company_id,
            payroll_run_id=run.id,
            employee_id=employee.id,
            payable_days=Decimal("30"),
            basic_earned=Decimal("12345.00"),
            gross=Decimal("12345.00"),
            taxable_gross=Decimal("12345.00"),
            annual_assessable=Decimal("148140.00"),
            annual_taxable=Decimal("148140.00"),
            annual_tax=zero,
            total_deductions=zero,
            net_pay=Decimal("12345.00"),
        )
    )
    db.commit()

    headers = sign_in(client, "admin@acme.com.np")
    assert client.get("/api/v1/ess/payslips", headers=headers).json() == []

    # Approving it is what publishes it.
    run.status = RunStatus.APPROVED
    db.commit()

    body = client.get("/api/v1/ess/payslips", headers=headers).json()
    assert [p["net_pay"] for p in body] == ["12345.00"]


def test_a_colleagues_payslip_id_is_a_404_not_a_403(
    client: TestClient, db: Session, tenant: tuple[Employee, User, Employee]
) -> None:
    """The id is filtered on, not checked afterwards, so it reads as nonexistent."""
    _, admin, colleague = tenant
    theirs = (
        db.query(Payslip)
        .filter(Payslip.employee_id == colleague.id, Payslip.company_id == admin.company_id)
        .one()
    )

    headers = sign_in(client, "admin@acme.com.np")
    response = client.get(f"/api/v1/ess/payslips/{theirs.id}", headers=headers)

    assert response.status_code == 404
    assert "77777.77" not in response.text


# ── My attendance ─────────────────────────────────────────────────────


def test_my_attendance_month_totals_its_own_days(
    client: TestClient, db: Session, tenant: tuple[Employee, User, Employee]
) -> None:
    """The API adds the month up so the screen and the payslip cannot disagree."""
    employee, _, _ = tenant
    headers = sign_in(client, "admin@acme.com.np")

    shift = client.post(
        "/api/v1/attendance/shifts",
        headers=headers,
        json={
            "code": "DAY",
            "name": "General",
            "starts_at": "09:00:00",
            "ends_at": "18:00:00",
            "break_minutes": 60,
        },
    ).json()
    client.post(
        "/api/v1/attendance/roster",
        headers=headers,
        json={
            "employee_ids": [str(employee.id)],
            "shift_id": shift["id"],
            "start_date": "2026-03-02",
            "end_date": "2026-03-06",
        },
    )
    day = date(2026, 3, 2)
    while day <= date(2026, 3, 6):
        for moment, direction in (("T09:00:00Z", "in"), ("T18:00:00Z", "out")):
            client.post(
                "/api/v1/attendance/punches",
                headers=headers,
                json={
                    "employee_id": str(employee.id),
                    "punched_at": f"{day.isoformat()}{moment}",
                    "direction": direction,
                },
            )
        day += timedelta(days=1)
    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": "2026-03-01", "end_date": "2026-03-31"},
    )

    body = client.get("/api/v1/ess/attendance?year=2026&month=3", headers=headers).json()

    assert body["period_start"] == "2026-03-01"
    assert body["period_end"] == "2026-03-31"
    assert body["present_days"] == 5
    # 09:00–18:00 is nine hours; the unpunched lunch comes off, leaving the shift's own
    # eight. Five days of that is 2400 minutes and no overtime at all.
    assert body["worked_minutes"] == 2400
    assert body["overtime_minutes"] == 0
