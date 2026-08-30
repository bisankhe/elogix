"""Reports, and the CSV they export to.

The export is the part with teeth. Every cell in an HR report is free text somebody
typed — a name, a leave reason, a department — and a spreadsheet treats a cell starting
`=` as a formula to run when the file is opened. The person opening the export is
usually the person being targeted.
"""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.csv_export import escape_cell
from elogix_api.modules.identity.models import CompanyModule, PlanTier
from tests.conftest import auth, login, make_tenant


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def org(client: TestClient, headers: dict[str, str]) -> dict:
    """An org unit and a second employee, so a grouping has more than one bucket."""
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
    second = client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": "EMP-002",
            "first_name": "Bikash",
            "last_name": "Thapa",
            "joined_on": "2025-01-01",
            "placement": {"org_unit_id": unit["id"]},
        },
    ).json()
    return {"unit": unit, "second": second}


# ── The CSV guard ─────────────────────────────────────────────────────


@pytest.mark.parametrize("payload", ["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "\rx"])
def test_a_cell_that_would_execute_is_defused(payload: str) -> None:
    """Every prefix a spreadsheet reads as the start of a formula."""
    assert escape_cell(payload).startswith("'")


def test_numbers_and_dates_are_not_quoted(
) -> None:
    """The guard is only for free text. Prefixing an apostrophe onto a number leaves a
    spreadsheet full of text that looks numeric and will not sum, which would make
    every exported report useless in the tool it was exported for."""
    assert escape_cell(Decimal("1234.50")) == "1234.50"
    assert escape_cell(42) == "42"
    assert escape_cell(date(2026, 3, 1)) == "2026-03-01"
    assert escape_cell(-5) == "-5"  # a negative number, not a formula
    assert escape_cell(None) == ""
    assert escape_cell(True) == "yes"


def test_an_export_carries_the_bom_so_excel_reads_utf8(
    client: TestClient, headers: dict[str, str]
) -> None:
    """Without it, every Devanagari name in the file is mojibake on Windows."""
    response = client.get("/api/v1/reports/headcount?format=csv", headers=headers)

    assert response.status_code == 200
    assert response.content.startswith(b"\xef\xbb\xbf")
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"].startswith("attachment;")


def test_an_injected_employee_name_survives_the_round_trip_defused(
    client: TestClient, headers: dict[str, str]
) -> None:
    """End to end: a name typed by an attacker, exported, and still inert."""
    client.get("/api/v1/leave/types", headers=headers)  # seeds the catalogue
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
    client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": "EMP-009",
            "first_name": "=cmd|'/c calc'!A1",
            "last_name": "Attacker",
            "joined_on": "2025-01-01",
            "placement": {"org_unit_id": unit["id"]},
        },
    )

    body = client.get(
        "/api/v1/reports/leave-balances?format=csv", headers=headers
    ).content.decode("utf-8")

    assert "=cmd" in body  # the name is still readable
    assert ",\"'=cmd|'/c calc'!A1 Attacker\"" in body or "'=cmd" in body
    # and never at the start of a cell without the guard in front of it
    for line in body.splitlines():
        for cell in line.split(","):
            assert not cell.lstrip('"').startswith("=")


# ── Headcount ─────────────────────────────────────────────────────────


def test_headcount_by_department_counts_the_unassigned_too(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    """EMP-001 from `make_tenant` has no assignment. Dropping them would make the
    headcount quietly disagree with the employee list."""
    body = client.get(
        "/api/v1/reports/headcount?group_by=department", headers=headers
    ).json()

    groups = {row["group"]: row for row in body["rows"]}
    assert groups["Engineering"]["total"] == 1
    assert groups["Unassigned"]["total"] == 1
    assert body["total_active"] == 2
    assert body["grouped_by"] == "department"


def test_headcount_shows_exits_rather_than_hiding_them(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    """A department that lost people is what the report exists to show."""
    client.post(
        f"/api/v1/employees/{org['second']['id']}/exit",
        headers=headers,
        json={"exited_on": "2026-03-31", "reason": "resigned"},
    )

    body = client.get(
        "/api/v1/reports/headcount?group_by=department", headers=headers
    ).json()

    engineering = next(r for r in body["rows"] if r["group"] == "Engineering")
    assert engineering["exited"] == 1
    assert engineering["active"] == 0
    assert engineering["total"] == 1  # still counted, just not as staff
    assert body["total_active"] == 1


def test_headcount_rejects_a_grouping_it_does_not_know(
    client: TestClient, headers: dict[str, str]
) -> None:
    """The dimension picks a query, so it is refused at the edge rather than inside it."""
    response = client.get(
        "/api/v1/reports/headcount?group_by=salary", headers=headers
    )
    assert response.status_code == 422


# ── Leave balances ────────────────────────────────────────────────────


def test_leave_balances_are_a_grid_with_zeros_not_gaps(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    """A leave type someone has no ledger rows in is a zero. A gap reads as unknown."""
    types = client.get("/api/v1/leave/types", headers=headers).json()

    body = client.get("/api/v1/reports/leave-balances", headers=headers).json()

    # Two employees times every active leave type, no holes.
    assert len(body["rows"]) == 2 * len(types)
    assert all(row["available_days"] is not None for row in body["rows"])


def test_an_exited_employee_is_not_owed_leave(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    client.get("/api/v1/leave/types", headers=headers)  # seeds the catalogue
    client.post(
        f"/api/v1/employees/{org['second']['id']}/exit",
        headers=headers,
        json={"exited_on": "2026-03-31", "reason": "resigned"},
    )

    body = client.get("/api/v1/reports/leave-balances", headers=headers).json()

    assert all(row["employee_code"] != "EMP-002" for row in body["rows"])


# ── Payroll register ──────────────────────────────────────────────────


def test_the_register_totals_the_columns_a_filing_needs(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    """Totalled on the server so the export and the screen cannot disagree."""
    client.post("/api/v1/payroll/tax-scales/seed", headers=headers)
    client.post(
        f"/api/v1/payroll/salaries/{org['second']['id']}",
        headers=headers,
        json={"basic": "50000.00", "effective_from": "2025-01-01"},
    )
    run = client.post(
        "/api/v1/payroll/runs",
        headers=headers,
        json={"period_start": "2026-03-01", "period_end": "2026-03-31"},
    ).json()
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)

    body = client.get(
        f"/api/v1/reports/payroll-register/{run['id']}", headers=headers
    ).json()

    assert body["totals"]["employees"] == len(body["rows"])
    assert Decimal(body["totals"]["gross"]) == sum(
        Decimal(r["gross"]) for r in body["rows"]
    )
    # The employer's contribution is a company cost, not a deduction — totalled apart
    # so nobody puts it on the wrong side of a return.
    assert Decimal(body["totals"]["ssf_employer"]) == sum(
        Decimal(r["ssf_employer"]) for r in body["rows"]
    )


def test_the_register_is_available_before_approval(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    """It is how somebody checks a run before approving it. Withholding it until after
    approval would make the check impossible."""
    run = client.post(
        "/api/v1/payroll/runs",
        headers=headers,
        json={"period_start": "2026-03-01", "period_end": "2026-03-31"},
    ).json()

    body = client.get(
        f"/api/v1/reports/payroll-register/{run['id']}", headers=headers
    ).json()

    assert body["status"] == "draft"


def test_another_tenants_run_is_not_a_register(
    client: TestClient, db: Session, headers: dict[str, str]
) -> None:
    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))
    theirs = client.post(
        "/api/v1/payroll/runs",
        headers=globex,
        json={"period_start": "2026-03-01", "period_end": "2026-03-31"},
    ).json()

    response = client.get(
        f"/api/v1/reports/payroll-register/{theirs['id']}", headers=headers
    )

    assert response.status_code == 404


# ── The module gate ───────────────────────────────────────────────────


def test_reports_are_denied_below_the_starter_plan(
    client: TestClient, db: Session
) -> None:
    """Trial does not include reports, and the server is what decides that."""
    company, _, _ = make_tenant(db, "startup", plan_tier=PlanTier.TRIAL)
    headers = auth(login(client, slug="startup"))

    response = client.get("/api/v1/reports/headcount", headers=headers)

    assert response.status_code == 403
    assert "'reports' is not enabled" in response.json()["detail"]

    # And a per-company override turns it on without changing the plan.
    db.add(CompanyModule(company_id=company.id, module="reports", is_enabled=True))
    db.commit()
    assert client.get("/api/v1/reports/headcount", headers=headers).status_code == 200
