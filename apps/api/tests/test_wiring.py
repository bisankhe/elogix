"""Things that were built but unreachable.

Each of these existed as a column or a status with no way to set it — which is worse
than not existing, because the code that reads them looks correct and never fires.
"""

import uuid
from datetime import date, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.storage import LocalStorage, set_storage
from tests.conftest import auth, login, make_tenant

PDF = b"%PDF-1.4\n%%EOF\n"
NEXT_MONTH = str(date.today() + timedelta(days=30))
TOMORROW = str(date.today() + timedelta(days=1))


@pytest.fixture(autouse=True)
def storage(tmp_path: Path):  # noqa: ANN201
    set_storage(LocalStorage(tmp_path))
    yield tmp_path
    set_storage(None)


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def unit(client: TestClient, headers: dict[str, str]) -> dict:
    return client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()


# ── A candidate's CV ──────────────────────────────────────────────────


@pytest.fixture
def candidate(client: TestClient, headers: dict[str, str]) -> dict:
    return client.post(
        "/api/v1/recruitment/candidates",
        headers=headers,
        json={"full_name": "Asha Karki", "email": "asha@example.com.np"},
    ).json()


def test_a_cv_can_be_uploaded_and_read_back(
    client: TestClient, headers: dict[str, str], candidate: dict
) -> None:
    """`Candidate.resume_key` was read by onboarding and set by nothing, so the CV that
    was meant to become the employee's first document never existed."""
    uploaded = client.post(
        f"/api/v1/recruitment/candidates/{candidate['id']}/resume",
        headers=headers,
        files={"file": ("asha-cv.pdf", PDF, "application/pdf")},
    )
    assert uploaded.status_code == 200, uploaded.text
    assert uploaded.json()["resume_filename"] == "asha-cv.pdf"

    downloaded = client.get(
        f"/api/v1/recruitment/candidates/{candidate['id']}/resume", headers=headers
    )
    assert downloaded.status_code == 200
    assert downloaded.content == PDF
    # The same headers as every other file this system serves.
    assert downloaded.headers["content-disposition"].startswith("attachment;")
    assert downloaded.headers["x-content-type-options"] == "nosniff"


def test_a_cv_is_held_to_the_same_rules_as_any_other_upload(
    client: TestClient, headers: dict[str, str], candidate: dict
) -> None:
    """One allowlist, one size cap, one place — `documents.receive`."""
    response = client.post(
        f"/api/v1/recruitment/candidates/{candidate['id']}/resume",
        headers=headers,
        files={"file": ("payload.html", b"<script>alert(1)</script>", "text/html")},
    )
    assert response.status_code == 415


def test_a_candidate_with_no_cv_says_so(
    client: TestClient, headers: dict[str, str], candidate: dict
) -> None:
    response = client.get(
        f"/api/v1/recruitment/candidates/{candidate['id']}/resume", headers=headers
    )
    assert response.status_code == 404
    assert "No CV has been uploaded" in response.json()["detail"]


def test_another_tenants_candidate_cv_is_a_404(
    client: TestClient, db: Session, headers: dict[str, str], candidate: dict
) -> None:
    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))
    client.post(
        f"/api/v1/recruitment/candidates/{candidate['id']}/resume",
        headers=headers,
        files={"file": ("asha-cv.pdf", PDF, "application/pdf")},
    )

    assert (
        client.get(
            f"/api/v1/recruitment/candidates/{candidate['id']}/resume", headers=globex
        ).status_code
        == 404
    )


def test_the_cv_follows_the_candidate_into_their_employee_file(
    client: TestClient, headers: dict[str, str], unit: dict, candidate: dict
) -> None:
    """The whole reason the column existed. Content addressing means the employee
    document references the same bytes rather than copying them."""
    client.post(
        f"/api/v1/recruitment/candidates/{candidate['id']}/resume",
        headers=headers,
        files={"file": ("asha-cv.pdf", PDF, "application/pdf")},
    )
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={"code": "POS-1", "title": "Engineer", "org_unit_id": unit["id"], "headcount": 1},
    ).json()
    requisition = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-1", "position_id": position["id"], "title": "Engineer"},
    ).json()
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )
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
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]
    client.post(f"/api/v1/offer-response/{token}", json={"accept": True})

    result = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/onboard",
        headers=headers,
        json={"employee_code": "EMP-900"},
    ).json()

    docs = client.get(
        f"/api/v1/employees/{result['employee_id']}/documents", headers=headers
    ).json()
    cv = next(d for d in docs if d["document_type"] == "cv")
    assert cv["original_filename"] == "asha-cv.pdf"

    downloaded = client.get(
        f"/api/v1/employees/{result['employee_id']}/documents/{cv['id']}/file",
        headers=headers,
    )
    assert downloaded.status_code == 200
    assert downloaded.content == PDF


# ── Editing the org chart ─────────────────────────────────────────────


def test_a_positions_headcount_can_be_raised(
    client: TestClient, headers: dict[str, str], unit: dict
) -> None:
    """A budget nothing can change is a budget nobody maintains. Until this existed the
    only way past a stale number was deleting the position, which the foreign keys from
    assignments correctly refuse."""
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={"code": "POS-1", "title": "Engineer", "org_unit_id": unit["id"], "headcount": 1},
    ).json()
    client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-1", "position_id": position["id"], "title": "Engineer"},
    )

    # Budget full at one.
    blocked = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-2", "position_id": position["id"], "title": "Engineer"},
    )
    assert blocked.status_code == 409

    raised = client.patch(
        f"/api/v1/org/positions/{position['id']}", headers=headers, json={"headcount": 3}
    )
    assert raised.status_code == 200
    assert raised.json()["headcount"] == 3

    allowed = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-2", "position_id": position["id"], "title": "Engineer"},
    )
    assert allowed.status_code == 201


def test_a_position_update_re_checks_every_foreign_key_against_the_tenant(
    client: TestClient, db: Session, headers: dict[str, str], unit: dict
) -> None:
    """The update path must be as careful as the create path. The same field validated
    on one and not the other is the worse kind of hole, because the code looks right."""
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={"code": "POS-1", "title": "Engineer", "org_unit_id": unit["id"]},
    ).json()

    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))
    their_unit = client.post(
        "/api/v1/org/units", headers=globex, json={"code": "OPS", "name": "Ops"}
    ).json()
    their_grade = client.post(
        "/api/v1/org/grade-levels",
        headers=globex,
        json={"code": "G9", "name": "Theirs", "rank": 9},
    ).json()
    their_designation = client.post(
        "/api/v1/org/designations",
        headers=globex,
        json={"code": "THX", "name": "Theirs", "grade_level_id": their_grade["id"]},
    ).json()

    for field, value in (
        ("org_unit_id", their_unit["id"]),
        ("designation_id", their_designation["id"]),
    ):
        response = client.patch(
            f"/api/v1/org/positions/{position['id']}", headers=headers, json={field: value}
        )
        assert response.status_code == 404, f"{field} was not re-checked"


def test_a_position_cannot_be_made_to_report_to_itself(
    client: TestClient, headers: dict[str, str], unit: dict
) -> None:
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={"code": "POS-1", "title": "Engineer", "org_unit_id": unit["id"]},
    ).json()

    response = client.patch(
        f"/api/v1/org/positions/{position['id']}",
        headers=headers,
        json={"reports_to_id": position["id"]},
    )
    assert response.status_code == 409
    assert "report to itself" in response.json()["detail"]


@pytest.mark.parametrize(
    ("path", "create", "change", "field"),
    [
        ("grade-levels", {"code": "G1", "name": "Assistant", "rank": 1}, {"rank": 4}, "rank"),
        ("cost-centres", {"code": "CC1", "name": "Head Office"}, {"name": "Head Office 2"}, "name"),
        (
            "work-locations",
            {"code": "L1", "name": "Kathmandu"},
            {"district": "Kathmandu"},
            "district",
        ),
        (
            "employment-categories",
            {"code": "PERM", "name": "Permanent", "employment_type": "permanent"},
            {"notice_days": 60},
            "notice_days",
        ),
    ],
)
def test_reference_records_are_editable(
    client: TestClient,
    headers: dict[str, str],
    path: str,
    create: dict,
    change: dict,
    field: str,
) -> None:
    """Correcting a typo in a grade name used to mean delete and recreate, which the
    foreign keys from assignments and payslips refuse — correctly."""
    created = client.post(f"/api/v1/org/{path}", headers=headers, json=create).json()

    updated = client.patch(
        f"/api/v1/org/{path}/{created['id']}", headers=headers, json=change
    )

    assert updated.status_code == 200, updated.text
    assert updated.json()[field] == change[field]
    # Untouched fields survive: `exclude_unset`, not a whole-record replace.
    assert updated.json()["code"] == create["code"]


def test_another_tenants_reference_record_cannot_be_edited(
    client: TestClient, db: Session, headers: dict[str, str]
) -> None:
    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))
    theirs = client.post(
        "/api/v1/org/grade-levels",
        headers=globex,
        json={"code": "G1", "name": "Theirs", "rank": 1},
    ).json()

    response = client.patch(
        f"/api/v1/org/grade-levels/{theirs['id']}", headers=headers, json={"name": "Mine"}
    )
    assert response.status_code == 404
    assert uuid.UUID(theirs["id"])


# ── Pausing a requisition ─────────────────────────────────────────────


def test_a_requisition_on_hold_keeps_holding_its_budget(
    client: TestClient, headers: dict[str, str], unit: dict
) -> None:
    """A paused hire is still a hire somebody intends to make. Freeing the budget would
    let a second requisition be raised for the same slot."""
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={"code": "POS-1", "title": "Engineer", "org_unit_id": unit["id"], "headcount": 1},
    ).json()
    requisition = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-1", "position_id": position["id"], "title": "Engineer"},
    ).json()
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )

    held = client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/hold", headers=headers
    )
    assert held.status_code == 200
    assert held.json()["status"] == "on_hold"

    blocked = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-2", "position_id": position["id"], "title": "Engineer"},
    )
    assert blocked.status_code == 409

    # And it can be resumed, which is what `open` already accepted `on_hold` for.
    resumed = client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )
    assert resumed.status_code == 200
    assert resumed.json()["status"] == "open"


def test_only_an_open_requisition_can_be_held(
    client: TestClient, headers: dict[str, str], unit: dict
) -> None:
    position = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={"code": "POS-1", "title": "Engineer", "org_unit_id": unit["id"]},
    ).json()
    requisition = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={"code": "REQ-1", "position_id": position["id"], "title": "Engineer"},
    ).json()

    response = client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/hold", headers=headers
    )
    assert response.status_code == 409
    assert "this one is draft" in response.json()["detail"]
