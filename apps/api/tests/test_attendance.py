"""Attendance through the API.

Phase 04's done-when: 'a month of attendance can be captured, corrected, approved and
exported as payroll input'. `test_a_month_can_be_captured_corrected_and_exported` is that
sentence end to end; the rest defend the edges around it.
"""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth, login, make_tenant

MONDAY = "2026-03-02"
SATURDAY = "2026-03-07"


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def setup(client: TestClient, headers: dict[str, str]) -> dict:
    """An org unit, a shift, and one hired employee — the minimum to record attendance."""
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
            "employee_code": "EMP-500",
            "first_name": "Sita",
            "last_name": "Sharma",
            "joined_on": "2026-01-01",
            "placement": {"org_unit_id": unit["id"]},
        },
    ).json()
    return {"unit": unit, "shift": shift, "employee": employee}


def punch(client, headers, employee_id, moment, direction, work_date=None):  # noqa: ANN001, ANN201
    return client.post(
        "/api/v1/attendance/punches",
        headers=headers,
        json={
            "employee_id": employee_id,
            "punched_at": moment,
            "direction": direction,
            **({"work_date": work_date} if work_date else {}),
        },
    )


# ── Policy ────────────────────────────────────────────────────────────


def test_the_default_policy_encodes_the_labour_act(
    client: TestClient, headers: dict[str, str]
) -> None:
    policy = client.get("/api/v1/attendance/policy", headers=headers).json()

    assert policy["standard_daily_minutes"] == 8 * 60
    assert policy["standard_weekly_minutes"] == 48 * 60
    assert policy["max_overtime_minutes_per_day"] == 4 * 60
    assert policy["max_overtime_minutes_per_week"] == 24 * 60
    # Saturday, not Sunday. Getting this wrong would silently misclassify every week.
    assert policy["weekly_off_weekdays"] == [5]


def test_the_policy_can_be_overridden_per_company(
    client: TestClient, headers: dict[str, str]
) -> None:
    """The statutory defaults are unverified, so a tenant must not be trapped by them."""
    updated = client.put(
        "/api/v1/attendance/policy",
        headers=headers,
        json={"grace_minutes": 20, "weekly_off_weekdays": [4, 5]},
    ).json()

    assert updated["grace_minutes"] == 20
    assert updated["weekly_off_weekdays"] == [4, 5]


def test_an_invalid_weekday_is_rejected(client: TestClient, headers: dict[str, str]) -> None:
    response = client.put(
        "/api/v1/attendance/policy", headers=headers, json={"weekly_off_weekdays": [9]}
    )
    assert response.status_code == 422


# ── Shifts ────────────────────────────────────────────────────────────


def test_a_shift_reports_its_scheduled_minutes(
    client: TestClient, headers: dict[str, str]
) -> None:
    shift = client.post(
        "/api/v1/attendance/shifts",
        headers=headers,
        json={
            "code": "GEN",
            "name": "General",
            "starts_at": "09:00:00",
            "ends_at": "18:00:00",
            "break_minutes": 60,
        },
    ).json()

    assert shift["scheduled_minutes"] == 8 * 60
    assert shift["crosses_midnight"] is False


def test_a_night_shift_is_recognised_as_crossing_midnight(
    client: TestClient, headers: dict[str, str]
) -> None:
    shift = client.post(
        "/api/v1/attendance/shifts",
        headers=headers,
        json={
            "code": "NGT",
            "name": "Night",
            "starts_at": "22:00:00",
            "ends_at": "06:00:00",
            "break_minutes": 60,
        },
    ).json()

    assert shift["crosses_midnight"] is True
    assert shift["scheduled_minutes"] == 7 * 60


def test_a_break_longer_than_the_shift_is_rejected(
    client: TestClient, headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/attendance/shifts",
        headers=headers,
        json={
            "code": "ODD",
            "name": "Odd",
            "starts_at": "09:00:00",
            "ends_at": "10:00:00",
            "break_minutes": 120,
        },
    )
    assert response.status_code == 409


# ── Roster ────────────────────────────────────────────────────────────


def test_a_roster_is_assigned_in_bulk_and_skips_excluded_weekdays(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    response = client.post(
        "/api/v1/attendance/roster",
        headers=headers,
        json={
            "employee_ids": [setup["employee"]["id"]],
            "shift_id": setup["shift"]["id"],
            "start_date": MONDAY,
            "end_date": SATURDAY,
            "weekdays": [0, 1, 2, 3, 4],  # Monday–Friday
        },
    )

    assert response.status_code == 201
    assert len(response.json()) == 5  # Saturday excluded


def test_reassigning_a_roster_replaces_rather_than_duplicates(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    body = {
        "employee_ids": [setup["employee"]["id"]],
        "shift_id": setup["shift"]["id"],
        "start_date": MONDAY,
        "end_date": MONDAY,
    }
    client.post("/api/v1/attendance/roster", headers=headers, json=body)
    client.post("/api/v1/attendance/roster", headers=headers, json=body)

    listed = client.get(
        f"/api/v1/attendance/roster?start_date={MONDAY}&end_date={MONDAY}", headers=headers
    ).json()
    assert len(listed) == 1


# ── Processing ────────────────────────────────────────────────────────


def _roster_and_punch(client, headers, setup):  # noqa: ANN001, ANN202
    client.post(
        "/api/v1/attendance/roster",
        headers=headers,
        json={
            "employee_ids": [setup["employee"]["id"]],
            "shift_id": setup["shift"]["id"],
            "start_date": MONDAY,
            "end_date": SATURDAY,
        },
    )
    punch(client, headers, setup["employee"]["id"], f"{MONDAY}T09:00:00Z", "in")
    punch(client, headers, setup["employee"]["id"], f"{MONDAY}T18:00:00Z", "out")


def test_processing_turns_punches_into_a_day_record(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    _roster_and_punch(client, headers, setup)

    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": MONDAY, "end_date": MONDAY},
    )

    days = client.get(
        f"/api/v1/attendance/days?start_date={MONDAY}&end_date={MONDAY}"
        f"&employee_id={setup['employee']['id']}",
        headers=headers,
    ).json()

    assert len(days) == 1
    assert days[0]["status"] == "present"
    # 09:00-18:00 is nine hours on the premises; the unpunched lunch hour comes off.
    assert days[0]["worked_minutes"] == 8 * 60


def test_processing_is_idempotent(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """A correction has to be able to trigger a rebuild without double-counting."""
    _roster_and_punch(client, headers, setup)
    body = {"start_date": MONDAY, "end_date": MONDAY}

    client.post("/api/v1/attendance/process", headers=headers, json=body)
    client.post("/api/v1/attendance/process", headers=headers, json=body)

    days = client.get(
        f"/api/v1/attendance/days?start_date={MONDAY}&end_date={MONDAY}"
        f"&employee_id={setup['employee']['id']}",
        headers=headers,
    ).json()
    assert len(days) == 1
    assert days[0]["worked_minutes"] == 8 * 60


def test_a_declared_holiday_changes_the_day_status(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    client.post(
        "/api/v1/attendance/holidays",
        headers=headers,
        json={"holiday_date": MONDAY, "name": "Ghode Jatra", "bs_label": "२०८२ चैत १८"},
    )
    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": MONDAY, "end_date": MONDAY},
    )

    days = client.get(
        f"/api/v1/attendance/days?start_date={MONDAY}&end_date={MONDAY}"
        f"&employee_id={setup['employee']['id']}",
        headers=headers,
    ).json()
    assert days[0]["status"] == "holiday"


def test_nothing_is_processed_before_someone_joined(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """An employee who joined in January has no December attendance to answer for."""
    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": "2025-12-01", "end_date": "2025-12-05"},
    )

    days = client.get(
        "/api/v1/attendance/days?start_date=2025-12-01&end_date=2025-12-05"
        f"&employee_id={setup['employee']['id']}",
        headers=headers,
    ).json()
    assert days == []


def test_a_backwards_range_is_rejected(client: TestClient, headers: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": "2026-03-10", "end_date": "2026-03-01"},
    )
    assert response.status_code == 409


# ── Regularisation ────────────────────────────────────────────────────


def test_approving_a_regularisation_writes_punches_and_recomputes(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """The correction becomes a punch, not an edit — so the day can still be rebuilt."""
    employee_id = setup["employee"]["id"]
    client.post(
        "/api/v1/attendance/roster",
        headers=headers,
        json={
            "employee_ids": [employee_id],
            "shift_id": setup["shift"]["id"],
            "start_date": MONDAY,
            "end_date": MONDAY,
        },
    )
    # Forgot to punch out entirely, so the day computes as absent.
    punch(client, headers, employee_id, f"{MONDAY}T09:00:00Z", "in")
    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": MONDAY, "end_date": MONDAY},
    )
    before = client.get(
        f"/api/v1/attendance/days?start_date={MONDAY}&end_date={MONDAY}"
        f"&employee_id={employee_id}",
        headers=headers,
    ).json()
    assert before[0]["status"] == "absent"
    assert "missing OUT" in before[0]["remarks"]

    request = client.post(
        "/api/v1/attendance/regularisations",
        headers=headers,
        json={
            "employee_id": employee_id,
            "work_date": MONDAY,
            "requested_out": f"{MONDAY}T18:00:00Z",
            "reason": "Device was down at the gate",
        },
    ).json()

    decided = client.post(
        f"/api/v1/attendance/regularisations/{request['id']}/decide",
        headers=headers,
        json={"approve": True},
    )
    assert decided.status_code == 200
    assert decided.json()["status"] == "approved"

    after = client.get(
        f"/api/v1/attendance/days?start_date={MONDAY}&end_date={MONDAY}"
        f"&employee_id={employee_id}",
        headers=headers,
    ).json()
    assert after[0]["status"] == "present"
    assert after[0]["worked_minutes"] == 8 * 60

    # The original reading survives alongside the correction.
    punches = client.get(
        f"/api/v1/attendance/punches?start_date={MONDAY}&end_date={MONDAY}", headers=headers
    ).json()
    assert {p["source"] for p in punches} == {"web", "regularisation"}


def test_rejecting_a_regularisation_changes_nothing(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    employee_id = setup["employee"]["id"]
    request = client.post(
        "/api/v1/attendance/regularisations",
        headers=headers,
        json={
            "employee_id": employee_id,
            "work_date": MONDAY,
            "requested_in": f"{MONDAY}T09:00:00Z",
            "reason": "Forgot",
        },
    ).json()

    client.post(
        f"/api/v1/attendance/regularisations/{request['id']}/decide",
        headers=headers,
        json={"approve": False, "note": "No supporting evidence"},
    )

    punches = client.get(
        f"/api/v1/attendance/punches?start_date={MONDAY}&end_date={MONDAY}", headers=headers
    ).json()
    assert punches == []


def test_a_decided_request_cannot_be_decided_again(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    request = client.post(
        "/api/v1/attendance/regularisations",
        headers=headers,
        json={
            "employee_id": setup["employee"]["id"],
            "work_date": MONDAY,
            "requested_in": f"{MONDAY}T09:00:00Z",
            "reason": "Forgot",
        },
    ).json()
    body = {"approve": True}
    client.post(
        f"/api/v1/attendance/regularisations/{request['id']}/decide", headers=headers, json=body
    )

    again = client.post(
        f"/api/v1/attendance/regularisations/{request['id']}/decide", headers=headers, json=body
    )
    assert again.status_code == 409


def test_a_regularisation_must_request_some_change(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    response = client.post(
        "/api/v1/attendance/regularisations",
        headers=headers,
        json={
            "employee_id": setup["employee"]["id"],
            "work_date": MONDAY,
            "reason": "Nothing in particular",
        },
    )
    assert response.status_code == 422


# ── The done-when ─────────────────────────────────────────────────────


def test_a_month_can_be_captured_corrected_and_exported(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Phase 04's done-when, end to end."""
    employee_id = setup["employee"]["id"]
    start, end = date(2026, 3, 1), date(2026, 3, 31)

    client.post(
        "/api/v1/attendance/roster",
        headers=headers,
        json={
            "employee_ids": [employee_id],
            "shift_id": setup["shift"]["id"],
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "weekdays": [0, 1, 2, 3, 4, 6],  # Sunday–Friday, Saturday off
        },
    )

    # A month of punches: a full day every working day, one day left un-punched.
    day = start
    missed = date(2026, 3, 11)
    while day <= end:
        if day.weekday() != 5 and day != missed:
            punch(client, headers, employee_id, f"{day.isoformat()}T09:00:00Z", "in")
            punch(client, headers, employee_id, f"{day.isoformat()}T18:00:00Z", "out")
        day += timedelta(days=1)

    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": start.isoformat(), "end_date": end.isoformat()},
    )

    export = client.get(
        f"/api/v1/attendance/payroll-export?start_date={start}&end_date={end}", headers=headers
    ).json()
    row = next(r for r in export["rows"] if r["employee_id"] == employee_id)

    assert row["absent_days"] == 1, "the un-punched day should read as absent"
    assert row["weekly_off_days"] == 4, "March 2026 has four Saturdays"
    assert row["present_days"] == 26

    # Correct the missed day, and the export must move with it.
    request = client.post(
        "/api/v1/attendance/regularisations",
        headers=headers,
        json={
            "employee_id": employee_id,
            "work_date": missed.isoformat(),
            "requested_in": f"{missed}T09:00:00Z",
            "requested_out": f"{missed}T18:00:00Z",
            "reason": "Was at a client site all day",
        },
    ).json()
    client.post(
        f"/api/v1/attendance/regularisations/{request['id']}/decide",
        headers=headers,
        json={"approve": True},
    )

    corrected = client.get(
        f"/api/v1/attendance/payroll-export?start_date={start}&end_date={end}", headers=headers
    ).json()
    row = next(r for r in corrected["rows"] if r["employee_id"] == employee_id)

    assert row["absent_days"] == 0
    assert row["present_days"] == 27
    assert row["payable_days"] == 31.0, "every day of March is now payable"
    assert row["unlocked_days"] == 31, "payroll should know these figures can still change"


def test_the_export_reports_overtime_separately_from_worked_time(
    client: TestClient, headers: dict[str, str], setup: dict
) -> None:
    """Payroll prorates salary on days but pays overtime on minutes; it needs both."""
    employee_id = setup["employee"]["id"]
    client.post(
        "/api/v1/attendance/roster",
        headers=headers,
        json={
            "employee_ids": [employee_id],
            "shift_id": setup["shift"]["id"],
            "start_date": MONDAY,
            "end_date": MONDAY,
        },
    )
    punch(client, headers, employee_id, f"{MONDAY}T09:00:00Z", "in")
    punch(client, headers, employee_id, f"{MONDAY}T20:00:00Z", "out")
    client.post(
        "/api/v1/attendance/process",
        headers=headers,
        json={"start_date": MONDAY, "end_date": MONDAY},
    )

    export = client.get(
        f"/api/v1/attendance/payroll-export?start_date={MONDAY}&end_date={MONDAY}",
        headers=headers,
    ).json()
    row = next(r for r in export["rows"] if r["employee_id"] == employee_id)

    assert row["worked_minutes"] == 10 * 60  # 11 on the premises, less the lunch hour
    assert row["overtime_minutes"] == 2 * 60
    assert row["payable_days"] == 1.0


def test_attendance_endpoints_require_the_attendance_module(
    client: TestClient, db: Session
) -> None:
    from elogix_api.core.entitlements import ModuleCode
    from elogix_api.modules.identity.models import CompanyModule, PlanTier

    company, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.ENTERPRISE)
    db.add(
        CompanyModule(
            company_id=company.id, module=ModuleCode.ATTENDANCE.value, is_enabled=False
        )
    )
    db.commit()

    response = client.get("/api/v1/attendance/policy", headers=auth(login(client, slug="acme")))
    assert response.status_code == 403
