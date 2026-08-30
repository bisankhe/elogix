"""Onboarding: an accepted offer becoming a person on the payroll.

The seam between phase 09 and phase 03, and the reason a requisition is tied to a
`Position` rather than free text. What is asserted here is mostly that nothing gets
retyped: the department, the grade and above all the salary come from records that
already exist, so the figure the candidate agreed to is the figure payroll pays.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth, login, make_tenant

NEXT_MONTH = str(date.today() + timedelta(days=30))
TOMORROW = str(date.today() + timedelta(days=1))


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def org(client: TestClient, headers: dict[str, str]) -> dict:
    """A fully specified position: department, designation-with-grade, location and a
    permanent category carrying six months' probation."""
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
    grade = client.post(
        "/api/v1/org/grade-levels",
        headers=headers,
        json={"code": "G3", "name": "Senior Officer", "rank": 3},
    ).json()
    designation = client.post(
        "/api/v1/org/designations",
        headers=headers,
        json={"code": "SSE", "name": "Senior Software Engineer", "grade_level_id": grade["id"]},
    ).json()
    location = client.post(
        "/api/v1/org/work-locations",
        headers=headers,
        json={"code": "LOC-KTM", "name": "Kathmandu Office"},
    ).json()
    category = client.post(
        "/api/v1/org/employment-categories",
        headers=headers,
        json={
            "code": "PERM",
            "name": "Permanent",
            "employment_type": "permanent",
            "probation_months": 6,
        },
    ).json()
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={
            "code": "POS-SSE",
            "title": "Senior Software Engineer",
            "org_unit_id": unit["id"],
            "designation_id": designation["id"],
            "work_location_id": location["id"],
            "employment_category_id": category["id"],
            "headcount": 2,
        },
    ).json()
    return {
        "unit": unit,
        "grade": grade,
        "designation": designation,
        "location": location,
        "category": category,
        "position": position,
    }


@pytest.fixture
def accepted_offer(client: TestClient, headers: dict[str, str], org: dict) -> dict:
    """A candidate all the way through to an accepted offer on 75,000."""
    requisition = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={
            "code": "REQ-001",
            "position_id": org["position"]["id"],
            "title": "Senior Software Engineer",
            "openings": 1,
        },
    ).json()
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )
    candidate = client.post(
        "/api/v1/recruitment/candidates",
        headers=headers,
        json={
            "full_name": "Asha Karki",
            "email": "asha@example.com.np",
            "phone": "+977-9800000000",
        },
    ).json()
    application = client.post(
        "/api/v1/recruitment/applications",
        headers=headers,
        json={"candidate_id": candidate["id"], "requisition_id": requisition["id"]},
    ).json()
    offer = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/offer",
        headers=headers,
        json={"basic": "75000.00", "starts_on": NEXT_MONTH, "expires_on": TOMORROW},
    ).json()
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]
    client.post(f"/api/v1/offer-response/{token}", json={"accept": True})

    return {
        "requisition": requisition,
        "candidate": candidate,
        "application": application,
        "offer": offer,
    }


def onboard(
    client: TestClient, headers: dict[str, str], offer_id: str, code: str = "EMP-100"
) -> dict:
    response = client.post(
        f"/api/v1/recruitment/offers/{offer_id}/onboard",
        headers=headers,
        json={"employee_code": code},
    )
    assert response.status_code == 201, response.text
    return response.json()


# ── The handoff ───────────────────────────────────────────────────────


def test_the_offered_salary_becomes_the_payroll_salary(
    client: TestClient, headers: dict[str, str], accepted_offer: dict
) -> None:
    """The single most important thing this endpoint does.

    A salary retyped between the offer letter and the payroll screen is one that will
    eventually differ from what the candidate agreed to, and the person who notices
    will be the employee.
    """
    result = onboard(client, headers, accepted_offer["offer"]["id"])

    history = client.get(
        f"/api/v1/payroll/salaries/{result['employee_id']}", headers=headers
    ).json()

    assert len(history) == 1
    assert Decimal(history[0]["basic"]) == Decimal("75000.00")
    assert history[0]["effective_from"] == NEXT_MONTH
    assert "offer accepted on" in history[0]["note"]


def test_the_placement_is_copied_from_the_requisitions_position(
    client: TestClient, headers: dict[str, str], org: dict, accepted_offer: dict
) -> None:
    """Nobody retypes a department. The position already says all of it."""
    result = onboard(client, headers, accepted_offer["offer"]["id"])

    employee = client.get(
        f"/api/v1/employees/{result['employee_id']}", headers=headers
    ).json()
    placement = employee["current_assignment"]

    assert placement["org_unit_id"] == org["unit"]["id"]
    assert placement["position_id"] == org["position"]["id"]
    assert placement["designation_id"] == org["designation"]["id"]
    assert placement["work_location_id"] == org["location"]["id"]
    assert placement["employment_category_id"] == org["category"]["id"]
    # The grade hangs off the designation, not the position, and is resolved through it.
    assert placement["grade_level_id"] == org["grade"]["id"]
    assert placement["reason"] == "hire"


def test_probation_comes_from_the_employment_category(
    client: TestClient, headers: dict[str, str], accepted_offer: dict
) -> None:
    """Six months from the start date, and the status that follows from it."""
    result = onboard(client, headers, accepted_offer["offer"]["id"])

    assert result["status"] == "probation"
    employee = client.get(
        f"/api/v1/employees/{result['employee_id']}", headers=headers
    ).json()

    start = date.fromisoformat(employee["joined_on"])
    ends = date.fromisoformat(employee["probation_ends_on"])
    assert (ends.year - start.year) * 12 + (ends.month - start.month) == 6


def test_a_category_with_no_probation_starts_the_employee_active(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    """A contract hire is not on probation and should not read as if they were."""
    contract = client.post(
        "/api/v1/org/employment-categories",
        headers=headers,
        json={
            "code": "CONT",
            "name": "Contract",
            "employment_type": "contract",
            "probation_months": 0,
        },
    ).json()
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={
            "code": "POS-CONT",
            "title": "Contractor",
            "org_unit_id": org["unit"]["id"],
            "employment_category_id": contract["id"],
            "headcount": 1,
        },
    ).json()
    requisition = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-C", "position_id": position["id"], "title": "Contractor"},
    ).json()
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )
    candidate = client.post(
        "/api/v1/recruitment/candidates",
        headers=headers,
        json={"full_name": "Ram Bahadur", "email": "ram@example.com.np"},
    ).json()
    application = client.post(
        "/api/v1/recruitment/applications",
        headers=headers,
        json={"candidate_id": candidate["id"], "requisition_id": requisition["id"]},
    ).json()
    offer = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/offer",
        headers=headers,
        json={"basic": "50000.00", "starts_on": NEXT_MONTH, "expires_on": TOMORROW},
    ).json()
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]
    client.post(f"/api/v1/offer-response/{token}", json={"accept": True})

    result = onboard(client, headers, offer["id"], code="EMP-200")

    assert result["status"] == "active"
    employee = client.get(
        f"/api/v1/employees/{result['employee_id']}", headers=headers
    ).json()
    assert employee["probation_ends_on"] is None


def test_the_hire_event_names_the_requisition_it_came_from(
    client: TestClient, headers: dict[str, str], accepted_offer: dict
) -> None:
    """So the employee's timeline explains where this person came from."""
    result = onboard(client, headers, accepted_offer["offer"]["id"])

    events = client.get(
        f"/api/v1/employees/{result['employee_id']}/events", headers=headers
    ).json()

    hired = next(e for e in events if e["event_type"] == "hired")
    assert "REQ-001" in hired["note"]


# ── Guards ────────────────────────────────────────────────────────────


def test_only_an_accepted_offer_becomes_an_employee(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    """Otherwise the payroll carries someone who never agreed to join."""
    requisition = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-9", "position_id": org["position"]["id"], "title": "SSE"},
    ).json()
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )
    candidate = client.post(
        "/api/v1/recruitment/candidates",
        headers=headers,
        json={"full_name": "Sita Rai", "email": "sita@example.com.np"},
    ).json()
    application = client.post(
        "/api/v1/recruitment/applications",
        headers=headers,
        json={"candidate_id": candidate["id"], "requisition_id": requisition["id"]},
    ).json()
    offer = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/offer",
        headers=headers,
        json={"basic": "60000.00", "starts_on": NEXT_MONTH, "expires_on": TOMORROW},
    ).json()

    response = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/onboard",
        headers=headers,
        json={"employee_code": "EMP-300"},
    )

    assert response.status_code == 409
    assert "never agreed to join" in response.json()["detail"]


def test_an_offer_cannot_be_onboarded_twice(
    client: TestClient, headers: dict[str, str], accepted_offer: dict
) -> None:
    """It would put the same person on the payroll twice."""
    onboard(client, headers, accepted_offer["offer"]["id"])

    again = client.post(
        f"/api/v1/recruitment/offers/{accepted_offer['offer']['id']}/onboard",
        headers=headers,
        json={"employee_code": "EMP-101"},
    )
    assert again.status_code == 409
    assert "already been onboarded" in again.json()["detail"]


def test_a_duplicate_employee_code_is_refused(
    client: TestClient, headers: dict[str, str], accepted_offer: dict
) -> None:
    response = client.post(
        f"/api/v1/recruitment/offers/{accepted_offer['offer']['id']}/onboard",
        headers=headers,
        # `make_tenant` already seeded EMP-001.
        json={"employee_code": "EMP-001"},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


# ── The budget, after a hire ──────────────────────────────────────────


def test_a_filled_requisition_closes_and_stops_holding_budget(
    client: TestClient, headers: dict[str, str], accepted_offer: dict
) -> None:
    result = onboard(client, headers, accepted_offer["offer"]["id"])
    assert result["requisition_closed"] is True

    requisition = client.get(
        f"/api/v1/recruitment/requisitions/{accepted_offer['requisition']['id']}",
        headers=headers,
    ).json()
    assert requisition["status"] == "filled"
    assert requisition["filled"] == 1


def test_a_hire_does_not_count_against_the_budget_twice(
    client: TestClient, headers: dict[str, str], org: dict, accepted_offer: dict
) -> None:
    """The bug this fixture would otherwise hide.

    Once someone is hired they count in `filled_headcount`. If their requisition's
    opening still counted as committed as well, a position budgeted for two would
    refuse a second requisition right after the first hire — which is exactly when you
    need one.
    """
    onboard(client, headers, accepted_offer["offer"]["id"])

    second = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={
            "code": "REQ-002",
            "position_id": org["position"]["id"],
            "title": "Senior Software Engineer",
            "openings": 1,
        },
    )

    assert second.status_code == 201, second.text
    assert second.json()["filled"] == 1
    assert second.json()["committed"] == 0


def test_the_budget_still_refuses_a_third_hire(
    client: TestClient, headers: dict[str, str], org: dict, accepted_offer: dict
) -> None:
    """One filled, one requisitioned, on a headcount of two — nothing left."""
    onboard(client, headers, accepted_offer["offer"]["id"])
    client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={
            "code": "REQ-002",
            "position_id": org["position"]["id"],
            "title": "Senior Software Engineer",
            "openings": 1,
        },
    )

    third = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={
            "code": "REQ-003",
            "position_id": org["position"]["id"],
            "title": "Senior Software Engineer",
            "openings": 1,
        },
    )

    assert third.status_code == 409
    detail = third.json()["detail"]
    assert "1 filled and 1 already requisitioned, leaving 0" in detail


def test_a_partly_filled_requisition_only_holds_its_remaining_openings(
    client: TestClient, headers: dict[str, str], org: dict
) -> None:
    """The case the subtraction in `committed_openings` exists for.

    A requisition for two with one hired stays open, so it keeps counting as committed.
    Counting both of its openings *and* the person now sitting in the position charges
    the budget twice for the same hire — a position budgeted for three would look full
    after one.

    A fully filled requisition closes and leaves the live set on its own, which is why
    the single-opening case does not exercise this: it passed with the bug in place.
    """
    # A position of its own, budgeted for three. There is no endpoint to change a
    # position's headcount, which is its own gap but not this test's subject.
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={
            "code": "POS-TEAM",
            "title": "Engineer",
            "org_unit_id": org["unit"]["id"],
            "designation_id": org["designation"]["id"],
            "employment_category_id": org["category"]["id"],
            "headcount": 3,
        },
    ).json()
    requisition = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={
            "code": "REQ-BIG",
            "position_id": position["id"],
            "title": "Engineer",
            "openings": 2,
        },
    ).json()
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )

    for i, email in enumerate(["one@example.com.np", "two@example.com.np"]):
        candidate = client.post(
            "/api/v1/recruitment/candidates",
            headers=headers,
            json={"full_name": f"Person {i}", "email": email},
        ).json()
        application = client.post(
            "/api/v1/recruitment/applications",
            headers=headers,
            json={"candidate_id": candidate["id"], "requisition_id": requisition["id"]},
        ).json()
        if i:
            continue
        # Hire the first of the two.
        offer = client.post(
            f"/api/v1/recruitment/applications/{application['id']}/offer",
            headers=headers,
            json={"basic": "70000.00", "starts_on": NEXT_MONTH, "expires_on": TOMORROW},
        ).json()
        token = client.post(
            f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
        ).json()["response_token"]
        client.post(f"/api/v1/offer-response/{token}", json={"accept": True})
        onboard(client, headers, offer["id"], code="EMP-700")

    detail = client.get(
        f"/api/v1/recruitment/requisitions/{requisition['id']}", headers=headers
    ).json()
    # Still open — one of its two openings is unfilled.
    assert detail["status"] == "open"
    assert detail["filled"] == 1

    # 3 budgeted - 1 filled - 1 still-open opening = 1 available.
    allowed = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={
            "code": "REQ-NEXT",
            "position_id": position["id"],
            "title": "Engineer",
            "openings": 1,
        },
    )
    assert allowed.status_code == 201, allowed.text


def test_another_tenants_offer_cannot_be_onboarded(
    client: TestClient, db: Session, headers: dict[str, str], accepted_offer: dict
) -> None:
    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))

    response = client.post(
        f"/api/v1/recruitment/offers/{accepted_offer['offer']['id']}/onboard",
        headers=globex,
        json={"employee_code": "EMP-500"},
    )
    assert response.status_code == 404
    assert uuid.UUID(accepted_offer["offer"]["id"])
