"""The digital employee file: uploading, serving back, and expiry.

Most of this is about refusing things. An HR system takes files from whoever HR lets
upload one and hands them to whoever asks, which makes it the part of the app most
worth being unfriendly in.
"""

import uuid
from datetime import date, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.storage import LocalStorage, set_storage
from elogix_api.settings import get_settings
from tests.conftest import auth, login, make_tenant

PDF = b"%PDF-1.4\n%%EOF\n"


@pytest.fixture(autouse=True)
def storage(tmp_path: Path):  # noqa: ANN201
    """A fresh storage root per test, so nothing leaks between them."""
    set_storage(LocalStorage(tmp_path))
    yield tmp_path
    set_storage(None)


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def employee_id(client: TestClient, headers: dict[str, str]) -> str:
    return client.get("/api/v1/employees", headers=headers).json()["items"][0]["id"]


def hire(client: TestClient, headers: dict[str, str], code: str) -> dict:
    """A second employee. Hiring requires a placement, so this makes the unit too."""
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    )
    unit_id = (
        unit.json()["id"]
        if unit.status_code == 201
        else client.get("/api/v1/org/units", headers=headers).json()[0]["id"]
    )
    response = client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_code": code,
            "first_name": "Bikash",
            "last_name": "Thapa",
            "joined_on": "2025-01-01",
            "placement": {"org_unit_id": unit_id},
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def make_document(
    client: TestClient, headers: dict[str, str], employee_id: str, **overrides: object
) -> dict:
    body = {"document_type": "contract", "title": "Employment contract", **overrides}
    response = client.post(
        f"/api/v1/employees/{employee_id}/documents", headers=headers, json=body
    )
    assert response.status_code == 201, response.text
    return response.json()


# ── Upload ────────────────────────────────────────────────────────────


def test_a_document_record_exists_before_any_file_does(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    """HR records what it still needs to collect. That is a real state, not a bug."""
    document = make_document(client, headers, employee_id)

    assert document["storage_key"] is None
    assert document["size_bytes"] is None

    # And downloading it says so, rather than pretending the record is missing.
    response = client.get(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/file", headers=headers
    )
    assert response.status_code == 404
    assert "No file has been uploaded" in response.json()["detail"]


def test_uploading_then_downloading_returns_the_same_bytes(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    document = make_document(client, headers, employee_id)

    uploaded = client.post(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/file",
        headers=headers,
        files={"file": ("contract.pdf", PDF, "application/pdf")},
    )
    assert uploaded.status_code == 200, uploaded.text
    body = uploaded.json()
    assert body["size_bytes"] == len(PDF)
    assert body["original_filename"] == "contract.pdf"
    # SHA-256 of the content, so the file served next year can be proved to be this one.
    assert len(body["checksum"]) == 64

    downloaded = client.get(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/file", headers=headers
    )
    assert downloaded.status_code == 200
    assert downloaded.content == PDF


def test_a_download_is_always_an_attachment_and_never_sniffed(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    """Served inline from the API's origin, an uploaded file is stored XSS against
    every colleague who opens it. Both headers are load-bearing."""
    document = make_document(client, headers, employee_id)
    client.post(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/file",
        headers=headers,
        files={"file": ("contract.pdf", PDF, "application/pdf")},
    )

    response = client.get(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/file", headers=headers
    )

    assert response.headers["content-disposition"].startswith("attachment;")
    assert response.headers["x-content-type-options"] == "nosniff"


def test_an_executable_content_type_is_refused(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    """An allowlist, so the answer to a type nobody considered is no."""
    document = make_document(client, headers, employee_id)

    response = client.post(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/file",
        headers=headers,
        files={"file": ("payload.html", b"<script>alert(1)</script>", "text/html")},
    )

    assert response.status_code == 415
    assert "not accepted" in response.json()["detail"]


def test_a_file_over_the_limit_is_refused_and_leaves_nothing_behind(
    client: TestClient, headers: dict[str, str], employee_id: str, storage: Path
) -> None:
    """The declared size is a claim; the read loop is the enforcement. Either way the
    partial write must not survive — `incoming/` filling with rejected uploads is its
    own denial of service."""
    document = make_document(client, headers, employee_id)
    oversized = b"x" * (get_settings().max_upload_bytes + 1024)

    response = client.post(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/file",
        headers=headers,
        files={"file": ("huge.pdf", oversized, "application/pdf")},
    )

    assert response.status_code == 413
    assert list((storage / "incoming").glob("*.part")) == []


def test_a_traversing_filename_is_stored_as_a_name_not_a_path(
    client: TestClient, headers: dict[str, str], employee_id: str, storage: Path
) -> None:
    """The key is the content hash; the uploader's filename never builds a location.
    This proves the file landed under the tenant's directory regardless."""
    document = make_document(client, headers, employee_id)

    response = client.post(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/file",
        headers=headers,
        files={"file": ("../../../etc/passwd", PDF, "application/pdf")},
    )

    assert response.status_code == 200
    body = response.json()
    # No separators of any kind. Dots surviving is fine — they are inert in a header,
    # and nothing builds a path from this string in the first place.
    assert not set(body["original_filename"]) & set("/\\\0")
    # Stored under <company_id>/<sha256>, nowhere else.
    company_id, _, digest = body["storage_key"].partition("/")
    assert uuid.UUID(company_id)
    assert (storage / company_id / digest).is_file()


def test_the_same_file_twice_is_stored_once(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    """Content addressing. The same appointment-letter template lands on dozens of
    records and should occupy the disk once."""
    first = make_document(client, headers, employee_id, title="Letter A")
    second = make_document(client, headers, employee_id, title="Letter B")

    keys = set()
    for document in (first, second):
        response = client.post(
            f"/api/v1/employees/{employee_id}/documents/{document['id']}/file",
            headers=headers,
            files={"file": ("letter.pdf", PDF, "application/pdf")},
        )
        keys.add(response.json()["storage_key"])

    assert len(keys) == 1


# ── Verification ──────────────────────────────────────────────────────


def test_verifying_names_the_verifier_from_the_token(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    """A document nobody will admit to checking is not checked, and letting the request
    body name the checker would make the field worth nothing."""
    document = make_document(client, headers, employee_id)

    response = client.post(
        f"/api/v1/employees/{employee_id}/documents/{document['id']}/verify",
        headers=headers,
        json={"is_verified": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_verified"] is True
    assert body["verified_by"] == "Acme Admin"
    assert body["verified_at"] is not None


def test_unverifying_clears_the_name_with_the_flag(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    """Otherwise the record keeps a name beside a false flag, which reads as an
    accusation."""
    document = make_document(client, headers, employee_id)
    path = f"/api/v1/employees/{employee_id}/documents/{document['id']}/verify"
    client.post(path, headers=headers, json={"is_verified": True})

    body = client.post(path, headers=headers, json={"is_verified": False}).json()

    assert body["is_verified"] is False
    assert body["verified_by"] is None
    assert body["verified_at"] is None


# ── Expiry ────────────────────────────────────────────────────────────


def test_expiring_lists_the_lapsed_first_and_ignores_the_distant(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    today = date.today()
    make_document(
        client,
        headers,
        employee_id,
        title="Lapsed work permit",
        expires_on=str(today - timedelta(days=10)),
    )
    make_document(
        client,
        headers,
        employee_id,
        title="Contract ending soon",
        expires_on=str(today + timedelta(days=20)),
    )
    make_document(
        client,
        headers,
        employee_id,
        title="Contract ending much later",
        expires_on=str(today + timedelta(days=300)),
    )
    make_document(client, headers, employee_id, title="No expiry at all")

    body = client.get("/api/v1/employees/documents/expiring", headers=headers).json()

    assert [d["title"] for d in body] == ["Lapsed work permit", "Contract ending soon"]
    # Already expired is the urgent case, not the one to hide.
    assert body[0]["days_remaining"] == -10
    assert body[1]["days_remaining"] == 20
    assert body[0]["employee_code"] == "EMP-001"


def test_an_exited_employees_lapsed_document_is_not_chased(
    client: TestClient, headers: dict[str, str], employee_id: str
) -> None:
    make_document(
        client,
        headers,
        employee_id,
        title="Lapsed work permit",
        expires_on=str(date.today() - timedelta(days=10)),
    )
    client.post(
        f"/api/v1/employees/{employee_id}/exit",
        headers=headers,
        json={"exited_on": str(date.today()), "reason": "resigned"},
    )

    body = client.get("/api/v1/employees/documents/expiring", headers=headers).json()

    assert body == []


# ── Boundaries ────────────────────────────────────────────────────────


def test_a_document_id_from_another_employee_is_a_404(
    client: TestClient, db: Session, headers: dict[str, str], employee_id: str
) -> None:
    """The id is filtered on the employee as well as the tenant, so a mismatched pair
    reads as nonexistent rather than as a hint."""
    other = hire(client, headers, "EMP-002")
    document = make_document(client, headers, employee_id)

    response = client.get(
        f"/api/v1/employees/{other['id']}/documents/{document['id']}/file", headers=headers
    )

    assert response.status_code == 404


def test_another_tenants_document_is_not_downloadable(
    client: TestClient, db: Session, headers: dict[str, str], employee_id: str
) -> None:
    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))
    globex_employee = client.get("/api/v1/employees", headers=globex).json()["items"][0]

    theirs = make_document(client, globex, globex_employee["id"], title="Globex contract")
    client.post(
        f"/api/v1/employees/{globex_employee['id']}/documents/{theirs['id']}/file",
        headers=globex,
        files={"file": ("contract.pdf", PDF, "application/pdf")},
    )

    # Acme knows the ids and still cannot read the file: the key is a handle, not a
    # permission, and the query filter is the boundary.
    response = client.get(
        f"/api/v1/employees/{globex_employee['id']}/documents/{theirs['id']}/file",
        headers=headers,
    )
    assert response.status_code == 404


def test_self_service_serves_my_own_document_and_not_a_colleagues(
    client: TestClient, db: Session, headers: dict[str, str], employee_id: str
) -> None:
    """A self-service download that checked only the tenant would hand any employee
    every contract in the company."""
    from elogix_api.modules.identity.models import User

    colleague = hire(client, headers, "EMP-002")

    mine = make_document(client, headers, employee_id, title="My contract")
    theirs = make_document(client, headers, colleague["id"], title="Their contract")
    for document, owner in ((mine, employee_id), (theirs, colleague["id"])):
        client.post(
            f"/api/v1/employees/{owner}/documents/{document['id']}/file",
            headers=headers,
            files={"file": (f"{document['title']}.pdf", PDF, "application/pdf")},
        )

    # Link the login to the first employee, which is what opens self-service.
    user = db.query(User).filter(User.email == "admin@acme.com.np").one()
    user.employee_id = uuid.UUID(employee_id)
    db.commit()
    me = auth(login(client, slug="acme"))

    assert client.get(f"/api/v1/ess/documents/{mine['id']}/file", headers=me).status_code == 200
    assert (
        client.get(f"/api/v1/ess/documents/{theirs['id']}/file", headers=me).status_code == 404
    )
