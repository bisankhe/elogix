"""Payroll through the API.

`test_payroll_compute.py` proves the arithmetic against hand calculation. This proves the
assembly: that a run reads the attendance export rather than guessing, pays the salary
that was effective *in the period*, and cannot be recomputed once approved.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth, login, make_tenant

MARCH = ("2026-03-01", "2026-03-31")


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def setup(client: TestClient, headers: dict[str, str]) -> dict:
    """An org unit, a shift, an employee, and a full month of attendance."""
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
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
    employee = client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": "EMP-900",
            "first_name": "Sita",
            "last_name": "Sharma",
            "joined_on": "2025-01-01",
            "placement": {"org_unit_id": unit["id"]},
        },
    ).json()

    client.post(
        "/api/v1/attendance/roster",
        headers=headers,
        json={
            "employee_ids": [employee["id"]],
            "shift_id": shift["id"],
            "start_date": MARCH[0],
            "end_date": MARCH[1],
        },
    )
    day = date(2026, 3, 1)
    while day <= date(2026, 3, 31):
        if day.weekday() != 5:
            for moment, direction in (("T09:00:00Z", "in"), ("T18:00:00Z", "out")):
                client.post(
                    "/api/v1/attendance/punches",
                    headers=headers,
                    json={
                        "employee_id": employee["id"],
                        "punched_at": f"{day.isoformat()}{moment}",
                        "direction": direction,
                    },
                )
        day += timedelta(days=1)

    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": MARCH[0], "end_date": MARCH[1]},
    )
    return {"unit": unit, "shift": shift, "employee": employee}


def _set_salary(client, headers, employee_id, basic="50000", effective_from="2025-01-01"):  # noqa: ANN001, ANN202
    return client.post(
        f"/api/v1/payroll/salaries/{employee_id}",
        headers=headers,
        json={"basic": basic, "effective_from": effective_from},
    )


def _run(client, headers):  # noqa: ANN001, ANN202
    return client.post(
        "/api/v1/payroll/runs",
        headers=headers,
        json={"period_start": MARCH[0], "period_end": MARCH[1], "fiscal_year": "2082-83"},
    ).json()


# ── Tax scales ────────────────────────────────────────────────────────


def test_the_scales_are_seeded_unverified(client: TestClient, headers: dict[str, str]) -> None:
    """Nobody has checked these against the Finance Act, and the API says so."""
    scales = client.get("/api/v1/payroll/tax-scales", headers=headers).json()

    assert len(scales) == 4  # two years, single and married
    assert all(s["is_verified"] is False for s in scales)
    assert all(s["verified_by"] is None for s in scales)

    single = next(s for s in scales if s["fiscal_year"] == "2082-83" and not s["is_married"])
    assert single["slabs"][0]["rate"] == "0.0100"  # the social security tax band
    assert single["slabs"][0]["width"] == "500000.00"


def test_a_scale_is_editable_and_verification_needs_a_name(
    client: TestClient, headers: dict[str, str]
) -> None:
    """"Verified" should mean a person put their name to it, not that a box was ticked."""
    scales = client.get("/api/v1/payroll/tax-scales", headers=headers).json()
    scale = next(s for s in scales if s["fiscal_year"] == "2082-83" and not s["is_married"])

    updated = client.put(
        f"/api/v1/payroll/tax-scales/{scale['id']}",
        headers=headers,
        json={
            "slabs": [
                {"width": "600000", "rate": "0.01", "label": "First NPR 6 lakh"},
                {"width": None, "rate": "0.10", "label": "Above"},
            ],
            "verified_by": "R. Shrestha, CA",
        },
    ).json()

    assert len(updated["slabs"]) == 2
    assert updated["is_verified"] is True
    assert updated["verified_by"] == "R. Shrestha, CA"


def test_editing_without_naming_a_verifier_leaves_it_unverified(
    client: TestClient, headers: dict[str, str]
) -> None:
    scales = client.get("/api/v1/payroll/tax-scales", headers=headers).json()
    scale = scales[0]

    updated = client.put(
        f"/api/v1/payroll/tax-scales/{scale['id']}",
        headers=headers,
        json={"slabs": [{"width": None, "rate": "0.10", "label": "Flat"}]},
    ).json()

    assert updated["is_verified"] is False


def test_a_company_edit_changes_what_payroll_charges(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """The whole point of the scale being a table: a tenant is not trapped by our
    unverified defaults."""
    employee_id = setup["employee"]["id"]
    _set_salary(client, headers, employee_id)

    scales = client.get("/api/v1/payroll/tax-scales", headers=headers).json()
    single = next(s for s in scales if s["fiscal_year"] == "2082-83" and not s["is_married"])
    client.put(
        f"/api/v1/payroll/tax-scales/{single['id']}",
        headers=headers,
        json={"slabs": [{"width": None, "rate": "0", "label": "Tax free"}]},
    )

    run = _run(client, headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    slip = client.get(f"/api/v1/payroll/runs/{run['id']}/payslips", headers=headers).json()[0]

    assert Decimal(slip["annual_tax"]) == Decimal("0")


# ── Salary ────────────────────────────────────────────────────────────


def test_a_raise_opens_a_period_it_does_not_edit_the_old_one(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    _set_salary(client, headers, employee_id, basic="50000", effective_from="2025-01-01")
    _set_salary(client, headers, employee_id, basic="70000", effective_from="2026-06-01")

    history = client.get(f"/api/v1/payroll/salaries/{employee_id}", headers=headers).json()

    assert len(history) == 2
    current, previous = history
    assert Decimal(current["basic"]) == Decimal("70000")
    assert current["effective_to"] is None
    assert Decimal(previous["basic"]) == Decimal("50000")
    assert previous["effective_to"] == "2026-05-31"


def test_march_is_paid_at_marchs_salary_not_todays(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """A June raise must not rewrite a March payslip."""
    employee_id = setup["employee"]["id"]
    _set_salary(client, headers, employee_id, basic="50000", effective_from="2025-01-01")
    _set_salary(client, headers, employee_id, basic="90000", effective_from="2026-06-01")

    run = _run(client, headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    slip = client.get(f"/api/v1/payroll/runs/{run['id']}/payslips", headers=headers).json()[0]

    assert Decimal(slip["basic_earned"]) == Decimal("50000.00")


def test_a_salary_cannot_start_before_the_current_one(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    _set_salary(client, headers, employee_id, effective_from="2026-01-01")

    response = _set_salary(client, headers, employee_id, effective_from="2025-06-01")
    assert response.status_code == 409


# ── The run ───────────────────────────────────────────────────────────


def test_a_run_reads_the_attendance_export(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Payable days come from the register, not from a guess about the month."""
    employee_id = setup["employee"]["id"]
    _set_salary(client, headers, employee_id)

    run = _run(client, headers)
    result = client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    assert result.status_code == 200
    # Only one: the tenant fixture's own employee has no salary set, so it is skipped.
    assert result.json()["payslips_written"] == 1

    slip = next(
        s
        for s in client.get(
            f"/api/v1/payroll/runs/{run['id']}/payslips", headers=headers
        ).json()
        if s["employee_id"] == employee_id
    )

    # 27 working days present + 4 Saturdays payable = 31.
    assert Decimal(slip["payable_days"]) == Decimal("31.00")
    assert slip["present_days"] == 27
    assert slip["absent_days"] == 0


def test_someone_with_no_salary_set_is_skipped_not_paid_zero(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Nobody has told us what they earn; inventing zero would be worse than skipping."""
    run = _run(client, headers)
    result = client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    assert result.json()["payslips_written"] == 0


def test_recomputing_a_draft_replaces_rather_than_duplicates(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    _set_salary(client, headers, setup["employee"]["id"])
    run = _run(client, headers)

    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)

    slips = client.get(f"/api/v1/payroll/runs/{run['id']}/payslips", headers=headers).json()
    assert len(slips) == 1


def test_two_runs_cannot_cover_the_same_period(
    client: TestClient, headers: dict[str, str]
) -> None:
    _run(client, headers)
    duplicate = client.post(
        "/api/v1/payroll/runs",
        headers=headers,
        json={"period_start": MARCH[0], "period_end": MARCH[1]},
    )
    assert duplicate.status_code == 409


# ── Approval and locking ──────────────────────────────────────────────


def test_approving_locks_the_attendance_it_was_computed_from(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Once a month is paid, reprocessing it must not move a figure someone was paid on."""
    _set_salary(client, headers, setup["employee"]["id"])
    run = _run(client, headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)

    approved = client.post(f"/api/v1/payroll/runs/{run['id']}/approve", headers=headers)
    assert approved.status_code == 200
    assert approved.json()["attendance_days_locked"] > 0

    days = client.get(
        f"/api/v1/attendance/days?start_date={MARCH[0]}&end_date={MARCH[1]}", headers=headers
    ).json()
    assert all(d["is_locked"] for d in days)


def test_an_approved_run_cannot_be_recomputed(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    _set_salary(client, headers, setup["employee"]["id"])
    run = _run(client, headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/approve", headers=headers)

    again = client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    assert again.status_code == 409


def test_a_draft_run_cannot_be_approved(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    run = _run(client, headers)
    response = client.post(f"/api/v1/payroll/runs/{run['id']}/approve", headers=headers)
    assert response.status_code == 409


def test_locked_attendance_survives_a_reprocess(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """The lock has to actually bite, or approval is decorative."""
    employee_id = setup["employee"]["id"]
    _set_salary(client, headers, employee_id)
    run = _run(client, headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/approve", headers=headers)

    # A late punch correction arrives for a paid month.
    client.post(
        "/api/v1/attendance/punches",
        headers=headers,
        json={
            "employee_id": employee_id,
            "punched_at": "2026-03-02T21:00:00Z",
            "direction": "out",
        },
    )
    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": MARCH[0], "end_date": MARCH[1]},
    )

    day = next(
        d
        for d in client.get(
            f"/api/v1/attendance/days?start_date=2026-03-02&end_date=2026-03-02"
            f"&employee_id={employee_id}",
            headers=headers,
        ).json()
    )
    assert day["worked_minutes"] == 8 * 60, "a locked day must not be recomputed"


# ── The payslip ───────────────────────────────────────────────────────


def test_a_payslip_itemises_its_lines_and_its_tax_bands(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """A payslip nobody can check is a payslip nobody will trust."""
    employee_id = setup["employee"]["id"]
    _set_salary(client, headers, employee_id)
    run = _run(client, headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)

    listed = next(
        s
        for s in client.get(
            f"/api/v1/payroll/runs/{run['id']}/payslips", headers=headers
        ).json()
        if s["employee_id"] == employee_id
    )
    detail = client.get(f"/api/v1/payroll/payslips/{listed['id']}", headers=headers).json()

    earnings = [line for line in detail["lines"] if line["kind"] == "earning"]
    deductions = [line for line in detail["lines"] if line["kind"] == "deduction"]

    assert [line["code"] for line in earnings] == ["BASIC"]
    assert {line["code"] for line in deductions} == {"SSF", "TDS"}
    assert sum(Decimal(line["amount"]) for line in earnings) == Decimal(detail["gross"])
    assert sum(Decimal(line["amount"]) for line in deductions) == Decimal(
        detail["total_deductions"]
    )

    # The bands account for the tax, so a dispute can be answered line by line.
    assert len(detail["tax_bands"]) >= 1
    assert sum(Decimal(b["tax"]) for b in detail["tax_bands"]) == Decimal(
        detail["annual_tax"]
    )


def test_an_allowance_flows_through_to_the_payslip(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    component = client.post(
        "/api/v1/payroll/components",
        headers=headers,
        json={"code": "ALW", "name": "Allowance", "kind": "earning"},
    ).json()
    client.post(
        f"/api/v1/payroll/salaries/{employee_id}",
        headers=headers,
        json={
            "basic": "50000",
            "effective_from": "2025-01-01",
            "lines": [{"salary_component_id": component["id"], "amount": "10000"}],
        },
    )

    run = _run(client, headers)
    client.post(f"/api/v1/payroll/runs/{run['id']}/compute", headers=headers)
    listed = next(
        s
        for s in client.get(
            f"/api/v1/payroll/runs/{run['id']}/payslips", headers=headers
        ).json()
        if s["employee_id"] == employee_id
    )
    detail = client.get(f"/api/v1/payroll/payslips/{listed['id']}", headers=headers).json()

    assert Decimal(detail["gross"]) == Decimal("60000.00")
    assert any(line["code"] == "ALW" for line in detail["lines"])


def test_payroll_endpoints_require_the_payroll_module(
    client: TestClient, db: Session
) -> None:
    from elogix_api.core.entitlements import ModuleCode
    from elogix_api.modules.identity.models import CompanyModule, PlanTier

    company, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.ENTERPRISE)
    db.add(
        CompanyModule(company_id=company.id, module=ModuleCode.PAYROLL.value, is_enabled=False)
    )
    db.commit()

    response = client.get("/api/v1/payroll/runs", headers=auth(login(client, slug="acme")))
    assert response.status_code == 403
