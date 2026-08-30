"""Employee master.

Phase 03's done-when: 'an employee can be hired, edited, documented and offboarded, with
history preserved'. The last clause is the one that needs defending — it is easy to build
a system where a transfer overwrites where someone used to sit, which is exactly what the
prototype did.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth, login, make_tenant


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def org(client: TestClient, headers: dict[str, str]) -> dict[str, str]:
    """A minimal org to place people into."""
    eng = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
    fin = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "FIN", "name": "Finance"}
    ).json()
    grade = client.post(
        "/api/v1/org/grade-levels",
        headers=headers,
        json={"code": "G2", "name": "Officer", "rank": 2},
    ).json()
    return {"eng": eng["id"], "fin": fin["id"], "grade": grade["id"]}


def _hire(client: TestClient, headers: dict[str, str], org: dict[str, str], **kw) -> dict:  # noqa: ANN003
    body = {
        "employee_code": kw.pop("code", "EMP-100"),
        "first_name": kw.pop("first_name", "Sita"),
        "last_name": kw.pop("last_name", "Sharma"),
        "joined_on": kw.pop("joined_on", "2024-01-15"),
        "placement": {"org_unit_id": org["eng"], **kw.pop("placement", {})},
        **kw,
    }
    response = client.post("/api/v1/employees", headers=headers, json=body)
    assert response.status_code == 201, response.text
    return response.json()


# ── Hire ──────────────────────────────────────────────────────────────


def test_hiring_creates_the_person_an_assignment_and_an_event(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org)

    assert employee["full_name"] == "Sita Sharma"
    assert employee["current_assignment"]["org_unit_id"] == org["eng"]
    assert employee["current_assignment"]["reason"] == "hire"
    assert employee["current_assignment"]["effective_to"] is None

    events = client.get(
        f"/api/v1/employees/{employee['id']}/events", headers=headers
    ).json()
    assert [e["event_type"] for e in events] == ["hired"]


def test_a_probation_end_date_starts_the_employee_on_probation(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    with_probation = _hire(
        client, headers, org, code="EMP-200", probation_ends_on="2024-07-15"
    )
    without = _hire(client, headers, org, code="EMP-201")

    assert with_probation["status"] == "probation"
    assert without["status"] == "active"


def test_probation_cannot_end_before_joining(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": "EMP-300",
            "first_name": "A",
            "last_name": "B",
            "joined_on": "2024-06-01",
            "probation_ends_on": "2024-01-01",
            "placement": {"org_unit_id": org["eng"]},
        },
    )
    assert response.status_code == 409


def test_a_duplicate_employee_code_is_a_conflict(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    _hire(client, headers, org, code="EMP-DUP")
    response = client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": "EMP-DUP",
            "first_name": "A",
            "last_name": "B",
            "joined_on": "2024-01-01",
            "placement": {"org_unit_id": org["eng"]},
        },
    )
    assert response.status_code == 409


def test_hiring_into_another_tenants_org_unit_is_not_found(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "acme")
    make_tenant(db, "globex")
    globex_headers = auth(login(client, slug="globex"))
    globex_unit = client.post(
        "/api/v1/org/units", headers=globex_headers, json={"code": "GBX", "name": "Theirs"}
    ).json()

    response = client.post(
        "/api/v1/employees",
        headers=auth(login(client, slug="acme")),
        json={
            "employee_code": "EMP-X",
            "first_name": "A",
            "last_name": "B",
            "joined_on": "2024-01-01",
            "placement": {"org_unit_id": globex_unit["id"]},
        },
    )
    assert response.status_code == 404


# ── Edit ──────────────────────────────────────────────────────────────


def test_personal_details_can_be_edited(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org)

    updated = client.patch(
        f"/api/v1/employees/{employee['id']}",
        headers=headers,
        json={"phone": "+977-9800000000", "pan_number": "123456789", "district": "Kathmandu"},
    )

    assert updated.status_code == 200
    assert updated.json()["phone"] == "+977-9800000000"
    assert updated.json()["pan_number"] == "123456789"


def test_placement_cannot_be_edited_through_patch(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    """Placement changes must go through /assignments, or history would be editable away."""
    employee = _hire(client, headers, org)

    response = client.patch(
        f"/api/v1/employees/{employee['id']}",
        headers=headers,
        json={"org_unit_id": org["fin"]},
    )

    assert response.status_code == 422


# ── History ───────────────────────────────────────────────────────────


def test_a_transfer_closes_the_old_assignment_and_opens_a_new_one(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    """The heart of 'with history preserved'."""
    employee = _hire(client, headers, org, joined_on="2024-01-15")

    client.post(
        f"/api/v1/employees/{employee['id']}/assignments",
        headers=headers,
        json={
            "placement": {"org_unit_id": org["fin"], "grade_level_id": org["grade"]},
            "reason": "promotion",
            "effective_from": "2025-04-01",
        },
    )

    history = client.get(
        f"/api/v1/employees/{employee['id']}/assignments", headers=headers
    ).json()

    assert len(history) == 2
    current, previous = history

    assert current["org_unit_id"] == org["fin"]
    assert current["effective_to"] is None
    assert current["reason"] == "promotion"

    # The old placement survives, and its period is closed the day before the new one
    # begins — so no date belongs to two assignments at once.
    assert previous["org_unit_id"] == org["eng"]
    assert previous["effective_from"] == "2024-01-15"
    assert previous["effective_to"] == "2025-03-31"


def test_an_assignment_cannot_start_before_the_current_one(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org, joined_on="2024-06-01")

    response = client.post(
        f"/api/v1/employees/{employee['id']}/assignments",
        headers=headers,
        json={"placement": {"org_unit_id": org["fin"]}, "effective_from": "2024-01-01"},
    )

    assert response.status_code == 409


def test_an_employee_cannot_manage_themselves(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org)

    response = client.post(
        f"/api/v1/employees/{employee['id']}/assignments",
        headers=headers,
        json={
            "placement": {"org_unit_id": org["eng"], "manager_id": employee["id"]},
            "effective_from": "2025-01-01",
        },
    )

    assert response.status_code == 409


# ── Lifecycle ─────────────────────────────────────────────────────────


def test_confirming_moves_probation_to_active(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org, probation_ends_on="2024-07-15")

    confirmed = client.post(
        f"/api/v1/employees/{employee['id']}/confirm",
        headers=headers,
        json={"confirmed_on": "2024-07-15"},
    )

    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "active"
    assert confirmed.json()["confirmed_on"] == "2024-07-15"

    events = client.get(f"/api/v1/employees/{employee['id']}/events", headers=headers).json()
    assert "confirmed" in [e["event_type"] for e in events]


def test_an_active_employee_cannot_be_confirmed_again(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org)  # no probation date -> already active

    response = client.post(
        f"/api/v1/employees/{employee['id']}/confirm",
        headers=headers,
        json={"confirmed_on": "2024-02-01"},
    )
    assert response.status_code == 409


def test_offboarding_closes_the_assignment_and_keeps_the_record(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org, joined_on="2024-01-15")

    exited = client.post(
        f"/api/v1/employees/{employee['id']}/exit",
        headers=headers,
        json={"exited_on": "2026-03-31", "reason": "Resigned to study abroad"},
    )

    assert exited.status_code == 200
    body = exited.json()
    assert body["status"] == "exited"
    assert body["exited_on"] == "2026-03-31"
    assert body["exit_reason"] == "Resigned to study abroad"

    # The person and their whole history remain readable after they leave.
    history = client.get(
        f"/api/v1/employees/{employee['id']}/assignments", headers=headers
    ).json()
    assert len(history) == 1
    assert history[0]["effective_to"] == "2026-03-31"

    events = client.get(f"/api/v1/employees/{employee['id']}/events", headers=headers).json()
    assert [e["event_type"] for e in events] == ["exited", "hired"]


def test_an_exited_employee_cannot_be_reassigned(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org)
    client.post(
        f"/api/v1/employees/{employee['id']}/exit",
        headers=headers,
        json={"exited_on": "2026-03-31", "reason": "Resigned"},
    )

    response = client.post(
        f"/api/v1/employees/{employee['id']}/assignments",
        headers=headers,
        json={"placement": {"org_unit_id": org["fin"]}, "effective_from": "2026-06-01"},
    )
    assert response.status_code == 409


def test_exiting_twice_is_a_conflict(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org)
    payload = {"exited_on": "2026-03-31", "reason": "Resigned"}
    client.post(f"/api/v1/employees/{employee['id']}/exit", headers=headers, json=payload)

    again = client.post(
        f"/api/v1/employees/{employee['id']}/exit", headers=headers, json=payload
    )
    assert again.status_code == 409


# ── Documents ─────────────────────────────────────────────────────────


def test_documents_attach_to_the_employee(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org)

    created = client.post(
        f"/api/v1/employees/{employee['id']}/documents",
        headers=headers,
        json={
            "document_type": "citizenship",
            "title": "Citizenship certificate",
            "issued_on": "2015-06-01",
        },
    )
    assert created.status_code == 201

    documents = client.get(
        f"/api/v1/employees/{employee['id']}/documents", headers=headers
    ).json()
    assert [d["title"] for d in documents] == ["Citizenship certificate"]


def test_a_document_cannot_expire_before_it_was_issued(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    employee = _hire(client, headers, org)

    response = client.post(
        f"/api/v1/employees/{employee['id']}/documents",
        headers=headers,
        json={
            "document_type": "passport",
            "title": "Passport",
            "issued_on": "2024-01-01",
            "expires_on": "2020-01-01",
        },
    )
    assert response.status_code == 409


# ── Listing ───────────────────────────────────────────────────────────


def test_the_list_filters_by_status_and_org_unit(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    _hire(client, headers, org, code="ENG-1")
    _hire(client, headers, org, code="ENG-2", probation_ends_on="2024-12-31")
    _hire(
        client, headers, org, code="FIN-1", placement={"org_unit_id": org["fin"]}
    )

    # make_tenant's own employee has no assignment, so it is excluded by the org filter
    # but present in the unfiltered list.
    by_unit = client.get(
        f"/api/v1/employees?org_unit_id={org['eng']}", headers=headers
    ).json()
    assert sorted(e["employee_code"] for e in by_unit["items"]) == ["ENG-1", "ENG-2"]

    on_probation = client.get("/api/v1/employees?status=probation", headers=headers).json()
    assert [e["employee_code"] for e in on_probation["items"]] == ["ENG-2"]


def test_the_list_searches_by_name_and_code(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    _hire(client, headers, org, code="EMP-900", first_name="Anjali", last_name="Gurung")

    by_name = client.get("/api/v1/employees?q=anjali", headers=headers).json()
    assert [e["employee_code"] for e in by_name["items"]] == ["EMP-900"]

    by_code = client.get("/api/v1/employees?q=900", headers=headers).json()
    assert [e["employee_code"] for e in by_code["items"]] == ["EMP-900"]


def test_the_hire_date_is_returned_as_given(
    client: TestClient, headers: dict[str, str], org: dict[str, str]
) -> None:
    """Dates cross the wire as ISO strings; nothing should be timezone-shifted."""
    employee = _hire(client, headers, org, joined_on="2024-01-15")
    assert employee["joined_on"] == "2024-01-15"
    assert date.fromisoformat(employee["joined_on"]) == date(2024, 1, 15)
