"""Leave.

Phase 05's done-when: 'balances accrue correctly across a full year and approvals adjust
them atomically'. Both clauses have a test named after them; the rest defend the edges.

Leave is a statutory entitlement, so these read like compliance checks rather than unit
tests — each number here is one someone could be owed.
"""

from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth, login, make_tenant


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def setup(client: TestClient, headers: dict[str, str]) -> dict:
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
    employee = client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": "EMP-700",
            "first_name": "Sita",
            "last_name": "Sharma",
            "joined_on": "2026-01-01",
            "placement": {"org_unit_id": unit["id"]},
        },
    ).json()
    types = {t["code"]: t for t in client.get("/api/v1/leave/types", headers=headers).json()}
    return {"unit": unit, "employee": employee, "types": types}


def balance(client, headers, employee_id, code, year=2026):  # noqa: ANN001, ANN201
    rows = client.get(
        f"/api/v1/leave/balances/{employee_id}?leave_year={year}", headers=headers
    ).json()
    return Decimal(next(r["available_days"] for r in rows if r["code"] == code))


# ── Statutory catalogue ───────────────────────────────────────────────


def test_the_statutory_leave_types_are_seeded(
    client: TestClient, headers: dict[str, str]
) -> None:
    types = {t["code"]: t for t in client.get("/api/v1/leave/types", headers=headers).json()}

    assert set(types) == {"HL", "SL", "ML", "PL", "MR", "UL"}

    # Nepal Labour Act 2074, as documented in the prototype and still unverified.
    assert types["SL"]["days_per_year"] == "12.00"
    assert types["SL"]["max_accumulation_days"] == "45.00"
    assert types["SL"]["requires_document_after_days"] == 3
    assert types["HL"]["days_worked_per_day_earned"] == 20
    assert types["HL"]["max_accumulation_days"] == "90.00"
    assert types["HL"]["probation_eligible"] is False
    assert types["ML"]["days_per_year"] == "98.00"
    assert types["PL"]["days_per_year"] == "15.00"
    assert types["MR"]["days_per_year"] == "13.00"
    assert types["UL"]["is_paid"] is False


def test_seeding_is_idempotent(client: TestClient, headers: dict[str, str]) -> None:
    client.get("/api/v1/leave/types", headers=headers)
    types = client.get("/api/v1/leave/types", headers=headers).json()
    assert len(types) == 6


def test_a_statutory_default_can_be_corrected(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """The Act values are unverified, so every one of them must be editable."""
    updated = client.patch(
        f"/api/v1/leave/types/{setup['types']['SL']['id']}",
        headers=headers,
        json={"days_per_year": 15},
    ).json()
    assert updated["days_per_year"] == "15.00"


# ── Accrual ───────────────────────────────────────────────────────────


def test_balances_accrue_correctly_across_a_full_year(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Phase 05's done-when, first clause."""
    employee_id = setup["employee"]["id"]

    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})

    # Sick leave is an annual grant: the full 12 days for a January joiner.
    assert balance(client, headers, employee_id, "SL") == Decimal("12.00")
    # Home leave accrues from days worked, and no attendance has been processed yet.
    assert balance(client, headers, employee_id, "HL") == Decimal("0.00")


def test_a_mid_year_joiner_is_prorated(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    joiner = client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": "EMP-701",
            "first_name": "Bikash",
            "last_name": "Thapa",
            "joined_on": "2026-07-01",
            "placement": {"org_unit_id": setup["unit"]["id"]},
        },
    ).json()

    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})

    # Six months of a twelve-day entitlement.
    assert balance(client, headers, joiner["id"], "SL") == Decimal("6.00")


def test_accrual_is_idempotent(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """A cron job eventually runs twice; nobody should gain a year's leave from it."""
    employee_id = setup["employee"]["id"]
    body = {"year": 2026}

    client.post("/api/v1/leave/accrue", headers=headers, json=body)
    first = balance(client, headers, employee_id, "SL")
    client.post("/api/v1/leave/accrue", headers=headers, json=body)

    assert balance(client, headers, employee_id, "SL") == first


def test_home_leave_accrues_from_days_actually_worked(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """One day per twenty worked — so it depends on the attendance register, and
    someone absent all month earns nothing."""
    employee_id = setup["employee"]["id"]
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
            "employee_ids": [employee_id],
            "shift_id": shift["id"],
            "start_date": "2026-03-01",
            "end_date": "2026-03-31",
        },
    )
    for day in range(1, 32):
        stamp = f"2026-03-{day:02d}"
        if date(2026, 3, day).weekday() == 5:
            continue
        for moment, direction in ((f"{stamp}T09:00:00Z", "in"), (f"{stamp}T18:00:00Z", "out")):
            client.post(
                "/api/v1/attendance/punches",
                headers=headers,
                json={
                    "employee_id": employee_id,
                    "punched_at": moment,
                    "direction": direction,
                },
            )
    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": "2026-03-01", "end_date": "2026-03-31"},
    )

    client.post(
        "/api/v1/leave/accrue", headers=headers, json={"year": 2026, "month": 3}
    )

    # 27 working days in March 2026, so one day earned per twenty — floored to 1.
    assert balance(client, headers, employee_id, "HL") == Decimal("1.00")


def test_accrual_floors_rather_than_rounds_up(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Nineteen days worked earns nothing. Rounding up would hand out entitlement
    nobody worked for."""
    from elogix_api.nepal.leave import accrual_for_days_worked

    assert accrual_for_days_worked(19, days_worked_per_day_earned=20) == Decimal("0")
    assert accrual_for_days_worked(20, days_worked_per_day_earned=20) == Decimal("1")
    assert accrual_for_days_worked(59, days_worked_per_day_earned=20) == Decimal("2")


def test_the_accumulation_ceiling_is_respected(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Sick leave accumulates to 45 days and no further; the excess is encashable
    rather than silently dropped."""
    from elogix_api.nepal.leave import capped

    kept, excess = capped(Decimal("52"), ceiling=Decimal("45"))
    assert kept == Decimal("45")
    assert excess == Decimal("7")


def test_carry_forward_moves_the_closing_balance_into_the_next_year(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})
    assert balance(client, headers, employee_id, "SL", 2026) == Decimal("12.00")

    client.post("/api/v1/leave/carry-forward", headers=headers, json={"from_year": 2026})

    # Both years move: 2026 closes at zero, 2027 opens with the carried balance.
    assert balance(client, headers, employee_id, "SL", 2026) == Decimal("0.00")
    assert balance(client, headers, employee_id, "SL", 2027) == Decimal("12.00")


# ── Requests and approval ─────────────────────────────────────────────


def _request(client, headers, setup, **kw):  # noqa: ANN001, ANN202
    body = {
        "employee_id": setup["employee"]["id"],
        "leave_type_id": setup["types"][kw.pop("code", "SL")]["id"],
        "start_date": kw.pop("start", "2026-03-02"),
        "end_date": kw.pop("end", "2026-03-04"),
        "reason": kw.pop("reason", "Fever"),
        **kw,
    }
    return client.post("/api/v1/leave/requests", headers=headers, json=body)


def test_approvals_adjust_balances_atomically(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Phase 05's done-when, second clause."""
    employee_id = setup["employee"]["id"]
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})
    assert balance(client, headers, employee_id, "SL") == Decimal("12.00")

    request = _request(client, headers, setup).json()
    assert request["days"] == "3.00"
    # Raising a request reserves nothing; only approval consumes.
    assert balance(client, headers, employee_id, "SL") == Decimal("12.00")

    client.post(
        f"/api/v1/leave/requests/{request['id']}/decide",
        headers=headers,
        json={"approve": True},
    )

    assert balance(client, headers, employee_id, "SL") == Decimal("9.00")


def test_leave_is_counted_in_working_days(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Friday to Monday over a Saturday weekly off is three days, not four."""
    request = _request(
        client, headers, setup, start="2026-03-06", end="2026-03-09"
    ).json()
    assert request["days"] == "3.00"


def test_a_holiday_inside_a_leave_range_is_not_deducted(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    client.post(
        "/api/v1/attendance/holidays",
        headers=headers,
        json={"holiday_date": "2026-03-03", "name": "Ghode Jatra"},
    )
    request = _request(client, headers, setup, start="2026-03-02", end="2026-03-04").json()
    assert request["days"] == "2.00", "the public holiday should not consume entitlement"


def test_a_request_beyond_the_balance_is_refused(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})

    request = _request(
        client, headers, setup, start="2026-03-02", end="2026-04-30",
        document_key="doc",
    ).json()
    response = client.post(
        f"/api/v1/leave/requests/{request['id']}/decide",
        headers=headers,
        json={"approve": True},
    )

    assert response.status_code == 409
    assert "available" in response.json()["detail"]


def test_the_balance_is_rechecked_at_approval_not_at_request(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Two requests, each affordable alone, are not both affordable together — and the
    second is caught at approval rather than at submission."""
    employee_id = setup["employee"]["id"]
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})  # 12 days

    first = _request(
        client, headers, setup, start="2026-03-02", end="2026-03-13", document_key="d"
    ).json()
    second = _request(
        client, headers, setup, start="2026-03-16", end="2026-03-20", document_key="d"
    ).json()

    ok = client.post(
        f"/api/v1/leave/requests/{first['id']}/decide", headers=headers, json={"approve": True}
    )
    assert ok.status_code == 200
    # Eleven working days consumed from twelve, leaving one.
    assert balance(client, headers, employee_id, "SL") == Decimal("1.00")

    refused = client.post(
        f"/api/v1/leave/requests/{second['id']}/decide", headers=headers, json={"approve": True}
    )
    assert refused.status_code == 409


def test_a_request_cannot_be_approved_twice(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})
    request = _request(client, headers, setup).json()
    body = {"approve": True}

    client.post(f"/api/v1/leave/requests/{request['id']}/decide", headers=headers, json=body)
    again = client.post(
        f"/api/v1/leave/requests/{request['id']}/decide", headers=headers, json=body
    )

    assert again.status_code == 409
    # And the balance moved exactly once.
    assert balance(client, headers, employee_id, "SL") == Decimal("9.00")


def test_rejecting_does_not_touch_the_balance(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})
    request = _request(client, headers, setup).json()

    client.post(
        f"/api/v1/leave/requests/{request['id']}/decide",
        headers=headers,
        json={"approve": False, "note": "Peak season"},
    )

    assert balance(client, headers, employee_id, "SL") == Decimal("12.00")


def test_cancelling_approved_leave_returns_the_entitlement(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})
    request = _request(client, headers, setup).json()
    client.post(
        f"/api/v1/leave/requests/{request['id']}/decide", headers=headers, json={"approve": True}
    )
    assert balance(client, headers, employee_id, "SL") == Decimal("9.00")

    client.post(
        f"/api/v1/leave/requests/{request['id']}/cancel",
        headers=headers,
        json={"approve": False, "note": "Recovered early"},
    )

    assert balance(client, headers, employee_id, "SL") == Decimal("12.00")

    # The consumption is reversed, not erased — both movements remain visible.
    ledger = client.get(f"/api/v1/leave/ledger/{employee_id}", headers=headers).json()
    kinds = [e["kind"] for e in ledger]
    assert "consumption" in kinds
    assert "reversal" in kinds


def test_overlapping_requests_are_refused(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    _request(client, headers, setup, start="2026-03-02", end="2026-03-06")
    overlapping = _request(client, headers, setup, start="2026-03-04", end="2026-03-10")

    assert overlapping.status_code == 409


def test_sick_leave_beyond_three_days_needs_a_document(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Labour Act 2074: documentation required after three days of sick leave."""
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})
    # Monday to Friday: five working days, comfortably past the three-day threshold.
    request = _request(client, headers, setup, start="2026-03-02", end="2026-03-06").json()
    assert request["days"] == "5.00"

    refused = client.post(
        f"/api/v1/leave/requests/{request['id']}/decide", headers=headers, json={"approve": True}
    )
    assert refused.status_code == 409
    assert "documentation" in refused.json()["detail"]


def test_unpaid_leave_needs_no_balance(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """There is no entitlement to draw down, so it is always affordable."""
    request = _request(client, headers, setup, code="UL", reason="Personal").json()

    approved = client.post(
        f"/api/v1/leave/requests/{request['id']}/decide", headers=headers, json={"approve": True}
    )
    assert approved.status_code == 200


def test_a_half_day_must_be_a_single_day(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    response = _request(
        client, headers, setup, start="2026-03-02", end="2026-03-04", portion="first_half"
    )
    assert response.status_code == 409


def test_a_half_day_consumes_half_a_day(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})
    request = _request(
        client, headers, setup, start="2026-03-02", end="2026-03-02", portion="first_half"
    ).json()
    assert request["days"] == "0.50"

    client.post(
        f"/api/v1/leave/requests/{request['id']}/decide", headers=headers, json={"approve": True}
    )
    assert balance(client, headers, employee_id, "SL") == Decimal("11.50")


def test_leave_entirely_on_non_working_days_is_refused(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """A Saturday-only request would deduct nothing, so it is a mistake, not leave."""
    response = _request(client, headers, setup, start="2026-03-07", end="2026-03-07")
    assert response.status_code == 409


# ── The integration with attendance ───────────────────────────────────


def test_approved_leave_shows_as_leave_in_the_attendance_register(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """The two modules have to agree: a day on approved leave must not read as absent."""
    employee_id = setup["employee"]["id"]
    client.post("/api/v1/leave/accrue", headers=headers, json={"year": 2026})
    request = _request(client, headers, setup, start="2026-03-02", end="2026-03-03").json()
    client.post(
        f"/api/v1/leave/requests/{request['id']}/decide", headers=headers, json={"approve": True}
    )

    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": "2026-03-02", "end_date": "2026-03-04"},
    )
    days = {
        d["work_date"]: d["status"]
        for d in client.get(
            "/api/v1/attendance/days?start_date=2026-03-02&end_date=2026-03-04"
            f"&employee_id={employee_id}",
            headers=headers,
        ).json()
    }

    assert days["2026-03-02"] == "leave"
    assert days["2026-03-03"] == "leave"
    assert days["2026-03-04"] == "absent", "the day after the leave is still absent"


def test_leave_endpoints_require_the_leave_module(client: TestClient, db: Session) -> None:
    from elogix_api.core.entitlements import ModuleCode
    from elogix_api.modules.identity.models import CompanyModule, PlanTier

    company, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.ENTERPRISE)
    db.add(
        CompanyModule(company_id=company.id, module=ModuleCode.LEAVE.value, is_enabled=False)
    )
    db.commit()

    response = client.get("/api/v1/leave/types", headers=auth(login(client, slug="acme")))
    assert response.status_code == 403
