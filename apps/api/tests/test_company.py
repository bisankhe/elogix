"""The company's own record, and the documents Nepal expects it to hold.

Payroll has been complete since phase 06 and still could not produce a return, because
a return names the employer by its PAN and its SSF employer code and the tenant record
held neither. This is that gap, plus the checklist that chases the paperwork behind it.
"""

from datetime import date, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.storage import LocalStorage, set_storage
from elogix_api.nepal import company as statutory
from tests.conftest import auth, login, make_tenant

PDF = b"%PDF-1.4\n%%EOF\n"


@pytest.fixture(autouse=True)
def storage(tmp_path: Path):  # noqa: ANN201
    set_storage(LocalStorage(tmp_path))
    yield tmp_path
    set_storage(None)


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


def add_document(
    client: TestClient, headers: dict[str, str], **overrides: object
) -> dict:
    body = {"category": "PAN_CERTIFICATE", "title": "PAN Certificate", **overrides}
    response = client.post("/api/v1/org/company/documents", headers=headers, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def item(compliance: dict, code: str) -> dict:
    return next(i for i in compliance["items"] if i["code"] == code)


# ── The statutory identity ────────────────────────────────────────────


def test_a_new_tenant_has_no_filing_identity_and_says_which(
    client: TestClient, headers: dict[str, str]
) -> None:
    """Named, not counted. "You cannot file without the SSF employer code" is
    actionable; "the profile is 40% complete" is not."""
    body = client.get("/api/v1/org/company/compliance", headers=headers).json()

    assert "SSF employer code" in body["missing_filing_fields"]
    assert "PAN number" in body["missing_filing_fields"]


def test_the_statutory_identity_can_be_set_and_read_back(
    client: TestClient, headers: dict[str, str]
) -> None:
    updated = client.patch(
        "/api/v1/org/company",
        headers=headers,
        json={
            "legal_name": "Acme Nepal Private Limited",
            "pan_number": "301234567",
            "registration_number": "OCR-123456",
            "ssf_employer_code": "SSF-EMP-0099",
            "ird_office": "IRD Kathmandu",
            "address": "Baluwatar",
            "ward": "4",
            "municipality": "Kathmandu Metropolitan City",
            "district": "Kathmandu",
            "province": "Bagmati",
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["ssf_employer_code"] == "SSF-EMP-0099"

    compliance = client.get("/api/v1/org/company/compliance", headers=headers).json()
    assert compliance["missing_filing_fields"] == []


def test_the_name_and_slug_are_not_editable_here(
    client: TestClient, headers: dict[str, str]
) -> None:
    """The slug is the login identifier — changing it would lock every user out of
    their own company. Unknown keys are dropped rather than applied."""
    before = client.get("/api/v1/org/company", headers=headers).json()

    client.patch(
        "/api/v1/org/company",
        headers=headers,
        json={"slug": "hijacked", "name": "Someone Else", "pan_number": "301234567"},
    )

    after = client.get("/api/v1/org/company", headers=headers).json()
    assert after["slug"] == before["slug"]
    assert after["name"] == before["name"]
    assert after["pan_number"] == "301234567"


def test_a_company_only_ever_sees_its_own_record(
    client: TestClient, db: Session, headers: dict[str, str]
) -> None:
    """There is no company id in the path. One company per tenant means the caller's
    company is the one on their token, so there is nothing to substitute."""
    make_tenant(db, "globex")
    client.patch(
        "/api/v1/org/company", headers=headers, json={"pan_number": "301234567"}
    )

    globex = client.get(
        "/api/v1/org/company", headers=auth(login(client, slug="globex"))
    ).json()

    assert globex["slug"] == "globex"
    assert globex["pan_number"] is None


# ── The checklist ─────────────────────────────────────────────────────


def test_the_checklist_lists_what_is_missing_not_only_what_is_held(
    client: TestClient, headers: dict[str, str]
) -> None:
    """The inversion is the whole value. A list built from the rows on file cannot tell
    you what you lack."""
    body = client.get("/api/v1/org/company/compliance", headers=headers).json()

    assert len(body["items"]) == len(statutory.NEPAL_COMPANY_DOCUMENTS)
    assert body["missing"] == len(statutory.NEPAL_COMPANY_DOCUMENTS)
    assert body["held"] == 0
    assert all(i["status"] == "missing" for i in body["items"])


def test_each_item_names_its_authority_and_citation(
    client: TestClient, headers: dict[str, str]
) -> None:
    """So a reviewer can check ten items against ten offices — which is what makes this
    the cheapest of the unverified statutory lists to sign off."""
    body = client.get("/api/v1/org/company/compliance", headers=headers).json()

    ssf = item(body, "SSF_REGISTRATION")
    assert ssf["authority"] == "Social Security Fund"
    assert ssf["citation"] == "Labour Act 2074, section 102"

    audit = item(body, "LABOUR_AUDIT")
    assert audit["citation"] == "Labour Act 2074, section 142"


def test_holding_a_document_moves_it_off_the_missing_list(
    client: TestClient, headers: dict[str, str]
) -> None:
    add_document(
        client,
        headers,
        category="SSF_REGISTRATION",
        title="SSF Employer Registration",
        expires_on=None,
    )

    body = client.get("/api/v1/org/company/compliance", headers=headers).json()

    assert item(body, "SSF_REGISTRATION")["status"] == "held"
    assert body["missing"] == len(statutory.NEPAL_COMPANY_DOCUMENTS) - 1


def test_expiry_drives_the_status_and_the_worst_sorts_first(
    client: TestClient, headers: dict[str, str]
) -> None:
    """A lapsed trade licence stops a company trading. It belongs at the top."""
    today = date.today()
    add_document(
        client,
        headers,
        category="TRADE_LICENSE",
        title="Trade Licence",
        expires_on=str(today - timedelta(days=12)),
    )
    add_document(
        client,
        headers,
        category="TAX_CLEARANCE",
        title="Tax Clearance",
        expires_on=str(today + timedelta(days=20)),
    )
    add_document(
        client,
        headers,
        category="AUDITED_ACCOUNTS",
        title="Audited Accounts",
        expires_on=str(today + timedelta(days=300)),
    )

    body = client.get("/api/v1/org/company/compliance", headers=headers).json()

    assert item(body, "TRADE_LICENSE")["status"] == "expired"
    assert "Expired 12 day(s) ago" in item(body, "TRADE_LICENSE")["detail"]
    assert item(body, "TAX_CLEARANCE")["status"] == "due"
    assert "Renews in 20 day(s)" in item(body, "TAX_CLEARANCE")["detail"]
    assert item(body, "AUDITED_ACCOUNTS")["status"] == "held"

    # Expired first, then due — the order somebody acts in.
    assert body["items"][0]["code"] == "TRADE_LICENSE"
    assert body["items"][1]["code"] == "TAX_CLEARANCE"
    assert (body["expired"], body["due"]) == (1, 1)


def test_a_renewing_document_with_no_expiry_says_so(
    client: TestClient, headers: dict[str, str]
) -> None:
    """Held, but not silently — an annual licence with no recorded expiry is a gap in
    the record rather than a document that never lapses."""
    add_document(client, headers, category="TRADE_LICENSE", title="Trade Licence")

    body = client.get("/api/v1/org/company/compliance", headers=headers).json()
    entry = item(body, "TRADE_LICENSE")

    assert entry["status"] == "held"
    assert "no expiry date is recorded and this one renews" in entry["detail"]


def test_the_issuing_authority_is_filled_from_the_statutory_list(
    client: TestClient, headers: dict[str, str]
) -> None:
    """Nobody should retype "Office of the Company Registrar"."""
    record = add_document(
        client, headers, category="OCR_CERTIFICATE", title="Registration Certificate"
    )
    assert record["issuing_authority"] == "Office of the Company Registrar"


def test_a_document_that_expires_before_it_was_issued_is_refused(
    client: TestClient, headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/org/company/documents",
        headers=headers,
        json={
            "category": "TAX_CLEARANCE",
            "title": "Tax Clearance",
            "issued_on": "2026-06-01",
            "expires_on": "2026-01-01",
        },
    )
    assert response.status_code == 409
    assert "expire before it was issued" in response.json()["detail"]


# ── The file behind the record ────────────────────────────────────────


def test_a_document_file_uploads_and_serves_back_as_an_attachment(
    client: TestClient, headers: dict[str, str]
) -> None:
    """Same allowlist, size cap and content-addressed key as every other upload —
    `documents.receive` and `documents.stream` are shared with employee documents."""
    record = add_document(client, headers, category="PAN_CERTIFICATE", title="PAN")

    uploaded = client.post(
        f"/api/v1/org/company/documents/{record['id']}/file",
        headers=headers,
        files={"file": ("pan.pdf", PDF, "application/pdf")},
    )
    assert uploaded.status_code == 200, uploaded.text
    assert uploaded.json()["original_filename"] == "pan.pdf"

    downloaded = client.get(
        f"/api/v1/org/company/documents/{record['id']}/file", headers=headers
    )
    assert downloaded.content == PDF
    assert downloaded.headers["content-disposition"].startswith("attachment;")
    assert downloaded.headers["x-content-type-options"] == "nosniff"


def test_an_executable_content_type_is_refused_here_too(
    client: TestClient, headers: dict[str, str]
) -> None:
    record = add_document(client, headers)

    response = client.post(
        f"/api/v1/org/company/documents/{record['id']}/file",
        headers=headers,
        files={"file": ("x.html", b"<script>alert(1)</script>", "text/html")},
    )
    assert response.status_code == 415


def test_verifying_names_the_verifier_from_the_token(
    client: TestClient, headers: dict[str, str]
) -> None:
    record = add_document(client, headers)

    verified = client.post(
        f"/api/v1/org/company/documents/{record['id']}/verify", headers=headers
    ).json()

    assert verified["is_verified"] is True
    assert verified["verified_by"] == "Acme Admin"
    assert verified["verified_at"] is not None


def test_another_tenants_company_document_is_a_404(
    client: TestClient, db: Session, headers: dict[str, str]
) -> None:
    record = add_document(client, headers)
    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))

    assert (
        client.get(
            f"/api/v1/org/company/documents/{record['id']}/file", headers=globex
        ).status_code
        == 404
    )
    assert client.get("/api/v1/org/company/documents", headers=globex).json() == []
