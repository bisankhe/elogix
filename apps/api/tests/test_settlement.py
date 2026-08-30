"""Settlement through the API.

`test_settlement_compute.py` proves the arithmetic. This proves the assembly: that the
figures come from the salary history, the leave ledger, the attendance register and the
year's payslips rather than from anywhere else, and that approving one moves the leave
balance it just paid out.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.modules.leave.models import LeaveLedgerEntry, LedgerEntryKind
from tests.conftest import auth, login, make_tenant


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def setup(client: TestClient, headers: dict[str, str]) -> dict:
    """An employee on a known salary, with leave accrued and a month of attendance."""
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
    employee = client.get("/api/v1/employees", headers=headers).json()["items"][0]

    client.post(
        f"/api/v1/employees/{employee['id']}/assignments",
        headers=headers,
        json={
            "placement": {"org_unit_id": unit["id"]},
            "effective_from": "2024-01-15",
            "reason": "transfer",
        },
    )
    client.post(
        f"/api/v1/payroll/salaries/{employee['id']}",
        headers=headers,
        json={"basic": "60000.00", "effective_from": "2024-01-15"},
    )
    # Seeds the statutory leave catalogue.
    types = client.get("/api/v1/leave/types", headers=headers).json()
    return {"employee": employee, "unit": unit, "types": types}


def create(
    client: TestClient, headers: dict[str, str], setup: dict, **overrides: object
) -> dict:
    body = {
        "employee_id": setup["employee"]["id"],
        "last_working_day": "2026-03-31",
        "initiator": "neither",
        **overrides,
    }
    response = client.post("/api/v1/settlements", headers=headers, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def line(settlement: dict, code: str) -> dict | None:
    return next((line for line in settlement["lines"] if line["code"] == code), None)


# ── Creating and computing ────────────────────────────────────────────


def test_a_settlement_computes_on_creation(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """The fifteen-day clock starts at the last working day, not when someone
    remembers to press a button, so the figures exist from the moment the record does."""
    settlement = create(client, headers, setup)

    assert settlement["status"] == "computed"
    assert settlement["computed_at"] is not None
    assert settlement["deadline"] == "2026-04-15"
    assert settlement["basic_at_exit"] == "60000.00"


def test_every_line_carries_the_reason_for_its_figure(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """The column that makes the table worth having. A settlement of five numbers is
    one nobody can check."""
    settlement = create(client, headers, setup)

    assert settlement["lines"]
    assert all(line["basis"] for line in settlement["lines"])


def test_an_ssf_contributor_gets_a_nil_gratuity_with_its_reason(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """End to end for the regression: the seeded salary contributes to SSF, so the
    gratuity has already been paid monthly into the fund."""
    settlement = create(client, headers, setup)

    gratuity = line(settlement, "GRATUITY")
    assert gratuity is not None
    assert gratuity["amount"] == "0.00"
    assert "already paid monthly" in gratuity["basis"]


def test_settling_someone_with_no_salary_on_record_is_refused_with_a_reason(
    client: TestClient, headers: dict[str, str]
) -> None:
    """Not a zero settlement. A payout computed from a missing salary is a wrong
    number, and the fix is to set the salary."""
    employee = client.get("/api/v1/employees", headers=headers).json()["items"][0]

    response = client.post(
        "/api/v1/settlements",
        headers=headers,
        json={
            "employee_id": employee["id"],
            "last_working_day": "2026-03-31",
            "initiator": "neither",
        },
    )

    assert response.status_code == 409
    assert "No salary is on record" in response.json()["detail"]


def test_a_last_working_day_before_joining_is_refused(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    response = client.post(
        "/api/v1/settlements",
        headers=headers,
        json={
            "employee_id": setup["employee"]["id"],
            "last_working_day": "2020-01-01",
            "initiator": "neither",
        },
    )
    assert response.status_code == 409
    assert "predates the joining date" in response.json()["detail"]


def test_only_one_open_settlement_per_employee(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """A partial unique index. Two open settlements would make "what are we paying
    them?" have two answers."""
    first = create(client, headers, setup)

    duplicate = client.post(
        "/api/v1/settlements",
        headers=headers,
        json={
            "employee_id": setup["employee"]["id"],
            "last_working_day": "2026-03-31",
            "initiator": "neither",
        },
    )
    assert duplicate.status_code == 409
    assert "already has an open settlement" in duplicate.json()["detail"]

    # Cancelling frees them — a rehire who leaves again needs a second settlement.
    client.post(f"/api/v1/settlements/{first['id']}/cancel", headers=headers)
    assert (
        client.post(
            "/api/v1/settlements",
            headers=headers,
            json={
                "employee_id": setup["employee"]["id"],
                "last_working_day": "2026-03-31",
                "initiator": "neither",
            },
        ).status_code
        == 201
    )


def test_never_having_been_paid_is_a_warning_not_a_silent_zero(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """No payroll run has ever covered this employee, so there is no window to compute
    unpaid salary from. Nothing is claimed — and the reader is told, because a missing
    salary line looks exactly like a settled one."""
    settlement = create(client, headers, setup)

    assert line(settlement, "UNPAID_SALARY") is None
    assert settlement["notes"] is not None
    assert "No approved payroll run covers this employee" in settlement["notes"]
    assert "add it as an adjustment" in settlement["notes"]


def test_an_unprocessed_register_refuses_rather_than_paying_nothing(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """The bug a dev screenshot found before this test existed.

    The seeded data was paid to 31 March and the leaver's last day was 15 August, but
    the register had no days after March — so the settlement computed with no unpaid
    salary line at all and paid four and a half months of work as nothing. Zero days
    and no data are different answers that look identical in a total.

    Refused, not noted: the fix is a minute of attendance processing, and a settlement
    that quietly pays nothing looks deliberate to everyone who reads it afterwards.
    """
    # A run that pays through March, so the unpaid window starts in April.
    run = client.post(
        "/api/v1/payroll/runs",
        headers=headers,
        json={"period_start": "2026-03-01", "period_end": "2026-03-31"},
    ).json()
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/approve", headers=headers)

    response = client.post(
        "/api/v1/settlements",
        headers=headers,
        json={
            "employee_id": setup["employee"]["id"],
            "last_working_day": "2026-08-15",
            "initiator": "neither",
        },
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert "no days between 2026-04-01 and 2026-08-15" in detail
    assert "look deliberate" in detail


# ── Notice, from the employment category ──────────────────────────────


def test_the_notice_period_is_read_from_the_employment_category(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Nobody should have to retype a contract term the org chart already holds."""
    category = client.post(
        "/api/v1/org/employment-categories",
        headers=headers,
        json={
            "code": "PERM",
            "name": "Permanent",
            "employment_type": "permanent",
            "notice_days": 30,
        },
    ).json()
    client.post(
        f"/api/v1/employees/{setup['employee']['id']}/assignments",
        headers=headers,
        json={
            "placement": {
                "org_unit_id": setup["unit"]["id"],
                "employment_category_id": category["id"],
            },
            "effective_from": "2025-01-01",
            "reason": "transfer",
        },
    )

    settlement = create(client, headers, setup, initiator="employee")

    assert settlement["notice_days_required"] == 30
    notice = line(settlement, "NOTICE_PAY")
    assert notice is not None
    assert notice["kind"] == "deduction"  # they resigned without serving it


# ── Leave encashment and the ledger ───────────────────────────────────


def test_approving_consumes_the_leave_it_pays_out(
    client: TestClient, db: Session, headers: dict[str, str], setup: dict
) -> None:
    """The phase 05 rule applied at exit: the payout is an insert of signed ledger
    rows, so the balance it settles cannot be paid a second time."""
    client.post(
        "/api/v1/leave/accrue", headers=headers, json={"year": 2026, "month": 1}
    )
    employee_id = setup["employee"]["id"]

    before = client.get(
        f"/api/v1/leave/balances/{employee_id}?leave_year=2026", headers=headers
    ).json()
    encashable = [b for b in before if Decimal(b["available_days"]) > 0]
    assert encashable, "the fixture needs a positive balance to be worth testing"

    settlement = create(client, headers, setup)
    approved = client.post(
        f"/api/v1/settlements/{settlement['id']}/approve", headers=headers
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["leave_balances_encashed"] >= 1

    after = client.get(
        f"/api/v1/leave/balances/{employee_id}?leave_year=2026", headers=headers
    ).json()
    paid_out = {
        line["code"].removeprefix("LEAVE_ENCASH_")
        for line in settlement["lines"]
        if line["code"].startswith("LEAVE_ENCASH_")
    }
    for balance in after:
        if balance["code"] in paid_out:
            assert Decimal(balance["available_days"]) == Decimal("0")

    # And the ledger says where the days went, rather than a counter having moved.
    entries = (
        db.query(LeaveLedgerEntry)
        .filter(
            LeaveLedgerEntry.employee_id == uuid.UUID(employee_id),
            LeaveLedgerEntry.kind == LedgerEntryKind.ENCASHMENT,
        )
        .all()
    )
    assert entries
    assert all(entry.days < 0 for entry in entries)
    assert all("Encashed on exit" in (entry.note or "") for entry in entries)


# ── Adjustments ───────────────────────────────────────────────────────


def test_an_adjustment_needs_a_reason_and_changes_the_total(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """An unexplained deduction from a final payment is the thing this exists to make
    impossible, so there is no way to add one without saying why."""
    settlement = create(client, headers, setup)
    before = Decimal(settlement["net_payable"])

    unreasoned = client.post(
        f"/api/v1/settlements/{settlement['id']}/adjustments",
        headers=headers,
        json={"kind": "deduction", "label": "Advance", "amount": "5000.00"},
    )
    assert unreasoned.status_code == 422

    added = client.post(
        f"/api/v1/settlements/{settlement['id']}/adjustments",
        headers=headers,
        json={
            "kind": "deduction",
            "label": "Salary advance",
            "amount": "5000.00",
            "reason": "Advance taken 2026-02-10, unrecovered",
        },
    )
    assert added.status_code == 201

    after = client.get(f"/api/v1/settlements/{settlement['id']}", headers=headers).json()
    assert Decimal(after["net_payable"]) == before - Decimal("5000.00")
    assert after["adjustments"][0]["reason"] == "Advance taken 2026-02-10, unrecovered"


# ── The snapshot rule ─────────────────────────────────────────────────


def test_an_approved_settlement_cannot_be_recomputed(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Like a payslip. A later leave accrual or attendance correction must not change
    what someone was already paid on their way out."""
    settlement = create(client, headers, setup)
    client.post(f"/api/v1/settlements/{settlement['id']}/approve", headers=headers)

    response = client.post(
        f"/api/v1/settlements/{settlement['id']}/compute", headers=headers
    )
    assert response.status_code == 409
    assert "snapshot" in response.json()["detail"]


def test_an_approved_settlement_cannot_be_cancelled(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Approving posted encashment rows. Cancelling would leave a balance paid out
    against a settlement that officially never happened."""
    settlement = create(client, headers, setup)
    client.post(f"/api/v1/settlements/{settlement['id']}/approve", headers=headers)

    response = client.post(
        f"/api/v1/settlements/{settlement['id']}/cancel", headers=headers
    )
    assert response.status_code == 409
    assert "already moved leave balances" in response.json()["detail"]


def test_only_an_approved_settlement_can_be_marked_paid(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    settlement = create(client, headers, setup)

    early = client.post(
        f"/api/v1/settlements/{settlement['id']}/pay",
        headers=headers,
        json={"paid_on": "2026-04-05"},
    )
    assert early.status_code == 409

    client.post(f"/api/v1/settlements/{settlement['id']}/approve", headers=headers)
    paid = client.post(
        f"/api/v1/settlements/{settlement['id']}/pay",
        headers=headers,
        json={"paid_on": "2026-04-05"},
    )
    assert paid.status_code == 200
    assert paid.json()["status"] == "paid"


# ── The statutory clock ───────────────────────────────────────────────


def test_the_due_report_puts_the_overdue_first_and_says_by_how_much(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """An unpaid final settlement is a compliance failure with a date attached.
    Already-overdue rows are the point of the report, not something to filter out."""
    overdue_by = 10
    last_day = date.today() - timedelta(days=15 + overdue_by)
    create(client, headers, setup, last_working_day=str(last_day))

    body = client.get("/api/v1/settlements/due", headers=headers).json()

    assert len(body) == 1
    assert body[0]["is_overdue"] is True
    assert body[0]["days_remaining"] == -overdue_by
    assert body[0]["employee_code"] == "EMP-001"


def test_a_paid_settlement_leaves_the_due_report(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Nothing is owed and no clock is running."""
    settlement = create(client, headers, setup)
    client.post(f"/api/v1/settlements/{settlement['id']}/approve", headers=headers)
    client.post(
        f"/api/v1/settlements/{settlement['id']}/pay",
        headers=headers,
        json={"paid_on": "2026-04-05"},
    )

    assert client.get("/api/v1/settlements/due", headers=headers).json() == []


# ── Boundaries ────────────────────────────────────────────────────────


def test_another_tenants_settlement_is_a_404(
    client: TestClient, db: Session, headers: dict[str, str], setup: dict
) -> None:
    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))
    mine = create(client, headers, setup)

    assert (
        client.get(f"/api/v1/settlements/{mine['id']}", headers=globex).status_code == 404
    )
