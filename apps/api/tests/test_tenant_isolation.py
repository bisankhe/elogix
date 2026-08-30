"""Tenant isolation.

There is no database-level backstop: the `.where(Model.company_id == ...)` clause in each
query is the entire boundary. That makes this file the security boundary's only proof, so
**every tenant-scoped endpoint added from here on needs a case in `TENANT_SCOPED_READS`**
— a forgotten filter is otherwise a silent cross-tenant leak with nothing to catch it.
"""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.security import create_token
from elogix_api.modules.employee.enums import DocumentType
from elogix_api.modules.employee.models import Employee, EmployeeDocument
from elogix_api.modules.identity.models import Company, RoleCode, UserRole
from elogix_api.modules.payroll.models import PayrollRun, Payslip, RunStatus
from tests.conftest import auth, login, make_tenant

# (method, path template). `{employee_id}`, `{run_id}` and `{payslip_id}` are filled
# with the *other* tenant's rows.
TENANT_SCOPED_READS = [
    ("GET", "/api/v1/employees"),
    ("GET", "/api/v1/employees/{employee_id}"),
    ("GET", "/api/v1/payroll/runs"),
    ("GET", "/api/v1/payroll/salaries/{employee_id}"),
    ("GET", "/api/v1/payroll/runs/{run_id}/payslips"),
    ("GET", "/api/v1/payroll/payslips/{payslip_id}"),
    ("GET", "/api/v1/auth/users"),
    ("GET", "/api/v1/employees/documents/expiring"),
    ("GET", "/api/v1/employees/{employee_id}/documents"),
    ("GET", "/api/v1/reports/headcount"),
    ("GET", "/api/v1/reports/leave-balances"),
    ("GET", "/api/v1/reports/payroll-register/{run_id}"),
    ("GET", "/api/v1/settlements"),
    ("GET", "/api/v1/settlements/due"),
]


def seed_payroll(
    db: Session, company: Company, employee: Employee
) -> tuple[PayrollRun, Payslip]:
    """A run and a payslip inserted directly.

    The point here is the read filters, not the engine — `test_payroll.py` proves the
    compute path. Going through the API would only make this sweep slower.
    """
    run = PayrollRun(
        company_id=company.id,
        period_start=date(2026, 3, 1),
        period_end=date(2026, 3, 31),
        fiscal_year="2082-83",
        status=RunStatus.COMPUTED,
    )
    db.add(run)
    db.flush()

    zero = Decimal("0")
    payslip = Payslip(
        company_id=company.id,
        payroll_run_id=run.id,
        employee_id=employee.id,
        payable_days=Decimal("31"),
        basic_earned=Decimal("50000"),
        gross=Decimal("50000"),
        taxable_gross=Decimal("50000"),
        annual_assessable=Decimal("600000"),
        annual_taxable=Decimal("600000"),
        annual_tax=zero,
        total_deductions=zero,
        net_pay=Decimal("50000"),
    )
    db.add(payslip)

    # An expiring document too, so the expiry report has something of this tenant's to
    # leak if its filter is ever dropped.
    db.add(
        EmployeeDocument(
            company_id=company.id,
            employee_id=employee.id,
            document_type=DocumentType.CONTRACT,
            title=f"{company.name} contract",
            expires_on=date(2026, 4, 30),
        )
    )
    db.commit()
    return run, payslip


def test_a_listing_shows_only_the_callers_own_employees(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "acme")
    make_tenant(db, "globex")

    body = client.get("/api/v1/employees", headers=auth(login(client, slug="acme"))).json()

    assert body["total"] == 1
    assert body["items"][0]["full_name"] == "Acme Employee"


@pytest.mark.parametrize(("method", "path"), TENANT_SCOPED_READS)
def test_no_endpoint_returns_another_tenants_row(
    client: TestClient, db: Session, method: str, path: str
) -> None:
    """Sweeps every tenant-scoped read: nothing may surface the other tenant's data."""
    acme, acme_admin, _ = make_tenant(db, "acme")
    globex, _, globex_employee = make_tenant(db, "globex")
    run, payslip = seed_payroll(db, globex, globex_employee)

    # The caller gets the top role on purpose. A route this sweep cannot reach is a
    # route it cannot test: without it the role-gated reads would 403 and the
    # assertion would pass on an empty body, proving nothing about the filter.
    db.add(UserRole(company_id=acme.id, user_id=acme_admin.id, role=RoleCode.SUPER_ADMIN))
    db.commit()

    response = client.request(
        method,
        path.format(employee_id=globex_employee.id, run_id=run.id, payslip_id=payslip.id),
        headers=auth(login(client, slug="acme")),
    )

    # The name catches a leaked employee record; the ids catch what carries no name at
    # all — a payslip is numbers and foreign keys, so "Globex" alone would let one
    # straight through.
    assert "Globex" not in response.text, f"{method} {path} leaked another tenant's data"
    for leaked in (globex_employee.id, run.id, payslip.id):
        assert str(leaked) not in response.text, (
            f"{method} {path} returned another tenant's row"
        )


def test_another_tenants_employee_is_not_readable_by_id(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "acme")
    _, _, globex_employee = make_tenant(db, "globex")

    response = client.get(
        f"/api/v1/employees/{globex_employee.id}",
        headers=auth(login(client, slug="acme")),
    )

    # 404, not 403: the caller must not be able to tell "does not exist" from
    # "exists, belongs to someone else".
    assert response.status_code == 404


def test_a_token_cannot_name_a_company_its_user_does_not_belong_to(
    client: TestClient, db: Session
) -> None:
    """The tenant comes from the signed token, but the user must still belong to it.

    A token forged with this service's key — an insider, or a leaked secret — still
    cannot cross tenants, because the lookup requires the user and company to match.
    """
    _, acme_user, _ = make_tenant(db, "acme")
    globex_company, _, globex_employee = make_tenant(db, "globex")

    crafted = create_token(user_id=acme_user.id, company_id=globex_company.id)[0]

    assert client.get("/api/v1/auth/me", headers=auth(crafted)).status_code == 401
    assert (
        client.get(f"/api/v1/employees/{globex_employee.id}", headers=auth(crafted)).status_code
        == 401
    )


def test_deleting_a_company_does_not_touch_another_tenants_rows(
    client: TestClient, db: Session
) -> None:
    """The ON DELETE CASCADE fans out from companies; it must stop at the tenant edge."""
    acme, _, _ = make_tenant(db, "acme")
    make_tenant(db, "globex")

    db.delete(acme)
    db.commit()

    body = client.get("/api/v1/employees", headers=auth(login(client, slug="globex"))).json()
    assert body["total"] == 1
