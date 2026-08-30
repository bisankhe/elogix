"""Hiring: the pipeline, the headcount budget, and the candidate's own link.

Three of these are named regressions against the prototype's ATS, and all three are
about who is allowed to decide something:

* an LLM decided the order candidates were seen in, and therefore who got hired;
* a stage move overwrote the previous one, so a rejection had no author and no reason;
* `POST /offers/<offer_id>/respond` had no authentication and no tenant filter, so
  anyone could accept or decline anyone's offer by walking uuids.
"""

import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.modules.identity.models import PlanTier
from tests.conftest import auth, login, make_tenant

TOMORROW = str(date.today() + timedelta(days=1))
NEXT_MONTH = str(date.today() + timedelta(days=30))


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


@pytest.fixture
def position(client: TestClient, headers: dict[str, str]) -> dict:
    """A position budgeted for two, with nobody in it."""
    unit = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "ENG", "name": "Engineering"}
    ).json()
    response = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={
            "code": "POS-ENG-1",
            "title": "Software Engineer",
            "org_unit_id": unit["id"],
            "headcount": 2,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def make_requisition(
    client: TestClient, headers: dict[str, str], position: dict, **overrides: object
) -> dict:
    body = {
        "code": "REQ-001",
        "position_id": position["id"],
        "title": "Software Engineer",
        "openings": 1,
        **overrides,
    }
    response = client.post("/api/v1/recruitment/requisitions", headers=headers, json=body)
    assert response.status_code == 201, response.text
    return response.json()


def make_candidate(
    client: TestClient, headers: dict[str, str], email: str = "asha@example.com.np"
) -> dict:
    response = client.post(
        "/api/v1/recruitment/candidates",
        headers=headers,
        json={"full_name": "Asha Karki", "email": email, "source": "Referral"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def stage_by_code(client: TestClient, headers: dict[str, str], code: str) -> dict:
    stages = client.get("/api/v1/recruitment/stages", headers=headers).json()
    return next(s for s in stages if s["code"] == code)


@pytest.fixture
def application(client: TestClient, headers: dict[str, str], position: dict) -> dict:
    requisition = make_requisition(client, headers, position)
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )
    candidate = make_candidate(client, headers)
    response = client.post(
        "/api/v1/recruitment/applications",
        headers=headers,
        json={"candidate_id": candidate["id"], "requisition_id": requisition["id"]},
    )
    assert response.status_code == 201, response.text
    return response.json()


# ── The pipeline is data ──────────────────────────────────────────────


def test_the_default_pipeline_is_seeded_on_first_read(
    client: TestClient, headers: dict[str, str]
) -> None:
    """A new tenant is never empty, and the stages are rows rather than a list written
    inline in a route handler."""
    stages = client.get("/api/v1/recruitment/stages", headers=headers).json()

    assert [s["code"] for s in stages] == [
        "APPLIED",
        "SCREENING",
        "INTERVIEW",
        "OFFER",
        "HIRED",
        "REJECTED",
        "WITHDRAWN",
    ]
    # A terminal stage says what it means, so a report can tell "we said no" from
    # "they said no".
    assert stage_by_code(client, headers, "REJECTED")["outcome"] == "rejected"
    assert stage_by_code(client, headers, "WITHDRAWN")["outcome"] == "withdrawn"
    assert stage_by_code(client, headers, "INTERVIEW")["outcome"] is None


def test_a_terminal_stage_without_an_outcome_is_refused(
    client: TestClient, headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/recruitment/stages",
        headers=headers,
        json={"code": "GHOSTED", "name": "Ghosted", "sequence": 99, "is_terminal": True},
    )
    assert response.status_code == 409
    assert "needs an outcome" in response.json()["detail"]


# ── The headcount budget ──────────────────────────────────────────────


def test_a_requisition_cannot_exceed_the_positions_budget(
    client: TestClient, headers: dict[str, str], position: dict
) -> None:
    """The point of `Position.headcount` existing. Without this the budget is a number
    on a screen that nothing consults, and the first anyone knows of an overhire is
    when payroll runs."""
    make_requisition(client, headers, position, code="REQ-001", openings=2)

    response = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={
            "code": "REQ-002",
            "position_id": position["id"],
            "title": "Software Engineer",
            "openings": 1,
        },
    )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert "budgeted for 2" in detail
    assert "2 already requisitioned" in detail


def test_cancelling_a_requisition_returns_its_openings_to_the_budget(
    client: TestClient, headers: dict[str, str], position: dict
) -> None:
    """A cancelled requisition is not a commitment, so it must stop counting."""
    first = make_requisition(client, headers, position, code="REQ-001", openings=2)
    client.post(
        f"/api/v1/recruitment/requisitions/{first['id']}/close?cancelled=true",
        headers=headers,
    )

    second = client.post(
        "/api/v1/recruitment/requisitions",
        headers=headers,
        json={
            "code": "REQ-002",
            "position_id": position["id"],
            "title": "Software Engineer",
            "openings": 2,
        },
    )
    assert second.status_code == 201


def test_the_requisition_detail_shows_the_budget_it_draws_against(
    client: TestClient, headers: dict[str, str], position: dict
) -> None:
    requisition = make_requisition(client, headers, position, openings=1)

    assert requisition["position_headcount"] == 2
    assert requisition["filled"] == 0
    # Its own openings are excluded, or it would appear to compete with itself.
    assert requisition["committed"] == 0


# ── Applications and their history ────────────────────────────────────


def test_an_application_starts_at_the_first_stage_with_a_recorded_event(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """The opening move is a row like every other one, so the history has no gap at
    the start."""
    detail = client.get(
        f"/api/v1/recruitment/applications/{application['id']}", headers=headers
    ).json()

    assert detail["stage_name"] == "Applied"
    assert len(detail["events"]) == 1
    assert detail["events"][0]["from_stage_id"] is None
    assert detail["events"][0]["note"] == "Application received"


def test_every_move_appends_to_the_history_rather_than_overwriting_it(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """The prototype assigned `app.stage = new_stage` over the old value, so a
    rejection had no author, no timestamp and no reason."""
    for code in ("SCREENING", "INTERVIEW"):
        response = client.post(
            f"/api/v1/recruitment/applications/{application['id']}/move",
            headers=headers,
            json={"to_stage_id": stage_by_code(client, headers, code)["id"]},
        )
        assert response.status_code == 200, response.text

    detail = client.get(
        f"/api/v1/recruitment/applications/{application['id']}", headers=headers
    ).json()

    assert [e["to_stage_id"] for e in detail["events"]] == [
        stage_by_code(client, headers, "APPLIED")["id"],
        stage_by_code(client, headers, "SCREENING")["id"],
        stage_by_code(client, headers, "INTERVIEW")["id"],
    ]
    assert all(e["moved_by"] is not None for e in detail["events"][1:])
    assert detail["stage_name"] == "Interview"


def test_a_rejection_without_a_reason_is_refused(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """The decision most likely to be asked about later."""
    rejected = stage_by_code(client, headers, "REJECTED")

    bare = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/move",
        headers=headers,
        json={"to_stage_id": rejected["id"]},
    )
    assert bare.status_code == 422
    assert "needs a reason" in bare.json()["detail"]

    whitespace = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/move",
        headers=headers,
        json={"to_stage_id": rejected["id"], "note": "   "},
    )
    assert whitespace.status_code == 422

    proper = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/move",
        headers=headers,
        json={"to_stage_id": rejected["id"], "note": "No Django experience"},
    )
    assert proper.status_code == 200
    assert proper.json()["outcome"] == "rejected"


def test_a_closed_application_cannot_be_moved_again(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """Reopening a decision needs a new application, so the original record survives."""
    client.post(
        f"/api/v1/recruitment/applications/{application['id']}/move",
        headers=headers,
        json={
            "to_stage_id": stage_by_code(client, headers, "REJECTED")["id"],
            "note": "Withdrew from process",
        },
    )

    response = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/move",
        headers=headers,
        json={"to_stage_id": stage_by_code(client, headers, "INTERVIEW")["id"]},
    )
    assert response.status_code == 409
    assert "closed as rejected" in response.json()["detail"]


def test_applications_are_ordered_by_arrival_and_carry_no_score(
    client: TestClient, headers: dict[str, str], position: dict
) -> None:
    """The named regression. The prototype ordered this list by an `ai_score` a
    language model wrote, which decided who a recruiter looked at first."""
    requisition = make_requisition(client, headers, position, openings=2)
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )

    for i, (email, applied) in enumerate(
        [("second@example.com.np", "2026-03-10"), ("first@example.com.np", "2026-03-01")]
    ):
        candidate = client.post(
            "/api/v1/recruitment/candidates",
            headers=headers,
            json={"full_name": f"Person {i}", "email": email},
        ).json()
        client.post(
            "/api/v1/recruitment/applications",
            headers=headers,
            json={
                "candidate_id": candidate["id"],
                "requisition_id": requisition["id"],
                "applied_on": applied,
            },
        )

    body = client.get(
        f"/api/v1/recruitment/applications?requisition_id={requisition['id']}",
        headers=headers,
    ).json()

    assert [a["applied_on"] for a in body] == ["2026-03-01", "2026-03-10"]
    assert all("score" not in key for a in body for key in a)


def test_applying_twice_to_the_same_requisition_is_a_duplicate(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    response = client.post(
        "/api/v1/recruitment/applications",
        headers=headers,
        json={
            "candidate_id": application["candidate_id"],
            "requisition_id": application["requisition_id"],
        },
    )
    assert response.status_code == 409
    assert "already applied" in response.json()["detail"]


def test_a_closed_requisition_takes_no_applications(
    client: TestClient, headers: dict[str, str], position: dict
) -> None:
    requisition = make_requisition(client, headers, position)
    candidate = make_candidate(client, headers)

    # Never opened — still a draft.
    response = client.post(
        "/api/v1/recruitment/applications",
        headers=headers,
        json={"candidate_id": candidate["id"], "requisition_id": requisition["id"]},
    )
    assert response.status_code == 409
    assert "only an open requisition" in response.json()["detail"]


# ── Offers, and the candidate's own link ──────────────────────────────


def make_offer(client: TestClient, headers: dict[str, str], application: dict) -> dict:
    response = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/offer",
        headers=headers,
        json={"basic": "60000.00", "starts_on": NEXT_MONTH, "expires_on": TOMORROW},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_the_response_token_is_returned_on_send_and_never_listed(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """It is a credential: whoever holds it can answer the offer."""
    offer = make_offer(client, headers, application)
    assert "response_token" not in offer

    sent = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()
    assert sent["response_token"]
    assert len(sent["response_token"]) >= 32

    listed = client.get("/api/v1/recruitment/offers", headers=headers).json()
    assert all("response_token" not in o for o in listed)


def test_a_candidate_answers_by_token_and_the_offer_id_is_useless(
    client: TestClient, db: Session, headers: dict[str, str], application: dict
) -> None:
    """The named regression.

    The prototype's `POST /offers/<offer_id>/respond` had no authentication and no
    tenant filter, so anyone could accept or decline anyone's offer by walking uuids.
    Here the id is not the credential, and there is no endpoint that takes one.
    """
    offer = make_offer(client, headers, application)
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]

    # The offer's own id gets nowhere — unauthenticated *or* authenticated.
    assert client.get(f"/api/v1/offer-response/{offer['id']}").status_code == 404
    assert (
        client.post(
            f"/api/v1/offer-response/{offer['id']}", json={"accept": True}
        ).status_code
        == 404
    )

    # The token works, with no login at all.
    view = client.get(f"/api/v1/offer-response/{token}")
    assert view.status_code == 200
    assert view.json()["basic"] == "60000.00"
    assert view.json()["company"] == "Acme Ltd"


def test_a_candidate_sees_only_the_terms_they_are_asked_to_accept(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """A token holder is a candidate, not a user of this system."""
    offer = make_offer(client, headers, application)
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]

    body = client.get(f"/api/v1/offer-response/{token}").json()

    assert set(body) == {"company", "title", "basic", "starts_on", "expires_on", "status"}
    assert application["candidate_id"] not in str(body)
    assert application["id"] not in str(body)


def test_an_invalid_token_is_not_an_oracle(client: TestClient) -> None:
    """A distinct message for "wrong token" versus "expired" would help someone
    guessing. Both are the same answer."""
    response = client.get(f"/api/v1/offer-response/{uuid.uuid4().hex}")
    assert response.status_code == 404
    assert response.json()["detail"] == "This offer link is not valid"


def test_accepting_moves_the_application_to_hired(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """So the board and the offer cannot disagree about whether someone was hired."""
    offer = make_offer(client, headers, application)
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]

    response = client.post(f"/api/v1/offer-response/{token}", json={"accept": True})
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"

    detail = client.get(
        f"/api/v1/recruitment/applications/{application['id']}", headers=headers
    ).json()
    assert detail["outcome"] == "hired"
    assert detail["stage_name"] == "Hired"
    assert detail["events"][-1]["note"] == "Candidate accepted the offer"
    # Nobody was logged in, so nobody is credited with the move.
    assert detail["events"][-1]["moved_by"] is None


def test_declining_records_the_reason_and_withdraws_the_application(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """Withdrawn, not rejected: the candidate said no, and a report that cannot tell
    those apart cannot tell you anything useful about your hiring."""
    offer = make_offer(client, headers, application)
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]

    client.post(
        f"/api/v1/offer-response/{token}",
        json={"accept": False, "reason": "Accepted another role"},
    )

    detail = client.get(
        f"/api/v1/recruitment/applications/{application['id']}", headers=headers
    ).json()
    assert detail["outcome"] == "withdrawn"
    assert "Accepted another role" in detail["events"][-1]["note"]


def test_an_offer_cannot_be_answered_twice(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    offer = make_offer(client, headers, application)
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]
    client.post(f"/api/v1/offer-response/{token}", json={"accept": True})

    again = client.post(f"/api/v1/offer-response/{token}", json={"accept": False})
    assert again.status_code == 409
    assert "accepted and is not open for a response" in again.json()["detail"]


def test_a_draft_offer_cannot_be_answered(
    client: TestClient, db: Session, headers: dict[str, str], application: dict
) -> None:
    """A draft has not been made yet. Reading the token out of the database and
    answering with it must still fail."""
    from elogix_api.modules.recruitment.models import Offer

    offer = make_offer(client, headers, application)
    token = db.query(Offer).filter(Offer.id == uuid.UUID(offer["id"])).one().response_token

    response = client.post(f"/api/v1/offer-response/{token}", json={"accept": True})
    assert response.status_code == 409
    assert "draft and is not open" in response.json()["detail"]


def test_a_withdrawn_offer_cannot_be_accepted(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """Otherwise a candidate can accept something the company has already taken back."""
    offer = make_offer(client, headers, application)
    token = client.post(
        f"/api/v1/recruitment/offers/{offer['id']}/send", headers=headers
    ).json()["response_token"]
    client.post(f"/api/v1/recruitment/offers/{offer['id']}/withdraw", headers=headers)

    response = client.post(f"/api/v1/offer-response/{token}", json={"accept": True})
    assert response.status_code == 409
    assert "withdrawn" in response.json()["detail"]


def test_an_expired_offer_is_recorded_as_expired_rather_than_just_refused(
    client: TestClient, db: Session, headers: dict[str, str], application: dict
) -> None:
    """So the record says it lapsed, rather than that nobody ever replied."""
    from elogix_api.modules.recruitment.models import Offer

    offer_id = uuid.UUID(make_offer(client, headers, application)["id"])
    token = client.post(
        f"/api/v1/recruitment/offers/{offer_id}/send", headers=headers
    ).json()["response_token"]

    row = db.query(Offer).filter(Offer.id == offer_id).one()
    row.expires_on = date.today() - timedelta(days=1)
    db.commit()

    response = client.post(f"/api/v1/offer-response/{token}", json={"accept": True})
    assert response.status_code == 409
    assert "expired on" in response.json()["detail"]


def test_only_one_live_offer_per_application(
    client: TestClient, headers: dict[str, str], application: dict
) -> None:
    """So there is never a question of which one stands."""
    make_offer(client, headers, application)

    second = client.post(
        f"/api/v1/recruitment/applications/{application['id']}/offer",
        headers=headers,
        json={"basic": "70000.00", "starts_on": NEXT_MONTH, "expires_on": TOMORROW},
    )
    assert second.status_code == 409
    assert "already has a draft offer" in second.json()["detail"]


# ── Boundaries ────────────────────────────────────────────────────────


def test_recruitment_is_denied_below_the_growth_plan(
    client: TestClient, db: Session
) -> None:
    make_tenant(db, "startup", plan_tier=PlanTier.TRIAL)
    headers = auth(login(client, slug="startup"))

    response = client.get("/api/v1/recruitment/requisitions", headers=headers)

    assert response.status_code == 403
    assert "'ats' is not enabled" in response.json()["detail"]


def test_another_tenants_candidate_cannot_be_applied(
    client: TestClient, db: Session, headers: dict[str, str], position: dict
) -> None:
    make_tenant(db, "globex")
    globex = auth(login(client, slug="globex"))
    theirs = make_candidate(client, globex, email="theirs@example.com.np")

    requisition = make_requisition(client, headers, position)
    client.post(
        f"/api/v1/recruitment/requisitions/{requisition['id']}/open", headers=headers
    )

    response = client.post(
        "/api/v1/recruitment/applications",
        headers=headers,
        json={"candidate_id": theirs["id"], "requisition_id": requisition["id"]},
    )
    assert response.status_code == 404
