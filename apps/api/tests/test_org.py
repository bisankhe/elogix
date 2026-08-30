"""Organization structure.

Phase 02's done-when: 'a new tenant can be provisioned into a complete org chart through
the UI'. The tree is the part that can corrupt itself, so most of this file is about the
invariants that keep it a tree rather than a ring.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth, login, make_tenant


def _unit(client: TestClient, headers: dict[str, str], code: str, **kw) -> dict:  # noqa: ANN003
    response = client.post(
        "/api/v1/org/units",
        headers=headers,
        json={"code": code, "name": kw.pop("name", code.title()), **kw},
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def headers(client: TestClient, db: Session) -> dict[str, str]:
    make_tenant(db, "acme")
    return auth(login(client, slug="acme"))


# ── The tree ──────────────────────────────────────────────────────────


def test_a_tenant_can_be_provisioned_into_a_complete_org_chart(
    client: TestClient, headers: dict[str, str]
) -> None:
    """Phase 02's done-when, end to end through the API."""
    group = _unit(client, headers, "GRP", name="Acme Group", kind="group")
    ktm = _unit(client, headers, "KTM", name="Kathmandu Branch", kind="branch",
                parent_id=group["id"])
    eng = _unit(client, headers, "ENG", name="Engineering", kind="department",
                parent_id=ktm["id"])
    _unit(client, headers, "QA", name="Quality", kind="team", parent_id=eng["id"])

    tree = client.get("/api/v1/org/tree", headers=headers).json()

    assert len(tree) == 1
    assert tree[0]["code"] == "GRP"
    assert tree[0]["children"][0]["code"] == "KTM"
    assert tree[0]["children"][0]["children"][0]["code"] == "ENG"
    assert tree[0]["children"][0]["children"][0]["children"][0]["code"] == "QA"


def test_depth_is_maintained_as_units_are_created(
    client: TestClient, headers: dict[str, str]
) -> None:
    root = _unit(client, headers, "ROOT")
    mid = _unit(client, headers, "MID", parent_id=root["id"])
    leaf = _unit(client, headers, "LEAF", parent_id=mid["id"])

    assert (root["depth"], mid["depth"], leaf["depth"]) == (0, 1, 2)


def test_a_unit_cannot_be_moved_under_its_own_descendant(
    client: TestClient, headers: dict[str, str]
) -> None:
    """The one move that turns the tree into a ring — and an easy accident in a
    drag-and-drop org chart."""
    root = _unit(client, headers, "ROOT")
    mid = _unit(client, headers, "MID", parent_id=root["id"])
    leaf = _unit(client, headers, "LEAF", parent_id=mid["id"])

    response = client.patch(
        f"/api/v1/org/units/{root['id']}", headers=headers, json={"parent_id": leaf["id"]}
    )

    assert response.status_code == 409
    assert "descendant" in response.json()["detail"]


def test_a_unit_cannot_be_its_own_parent(client: TestClient, headers: dict[str, str]) -> None:
    unit = _unit(client, headers, "SOLO")

    response = client.patch(
        f"/api/v1/org/units/{unit['id']}", headers=headers, json={"parent_id": unit["id"]}
    )

    assert response.status_code == 409


def test_moving_a_subtree_reindexes_the_depth_of_everything_below(
    client: TestClient, headers: dict[str, str]
) -> None:
    root = _unit(client, headers, "ROOT")
    branch = _unit(client, headers, "BR", parent_id=root["id"])
    mid = _unit(client, headers, "MID", parent_id=branch["id"])
    _unit(client, headers, "LEAF", parent_id=mid["id"])

    # Promote MID to sit directly under ROOT; LEAF must follow it up a level.
    client.patch(f"/api/v1/org/units/{mid['id']}", headers=headers, json={"parent_id": root["id"]})

    units = {u["code"]: u for u in client.get("/api/v1/org/units", headers=headers).json()}
    assert units["MID"]["depth"] == 1
    assert units["LEAF"]["depth"] == 2


def test_a_unit_with_active_children_cannot_be_deactivated(
    client: TestClient, headers: dict[str, str]
) -> None:
    parent = _unit(client, headers, "PARENT")
    _unit(client, headers, "CHILD", parent_id=parent["id"])

    response = client.delete(f"/api/v1/org/units/{parent['id']}", headers=headers)

    assert response.status_code == 409


def test_a_duplicate_code_is_a_conflict_not_a_crash(
    client: TestClient, headers: dict[str, str]
) -> None:
    _unit(client, headers, "DUP")

    response = client.post(
        "/api/v1/org/units", headers=headers, json={"code": "DUP", "name": "Again"}
    )

    assert response.status_code == 409


def test_the_same_code_is_free_for_another_tenant(client: TestClient, db: Session) -> None:
    """Codes are unique per tenant, not globally — two companies may both have 'ENG'."""
    make_tenant(db, "acme")
    make_tenant(db, "globex")

    for slug in ("acme", "globex"):
        response = client.post(
            "/api/v1/org/units",
            headers=auth(login(client, slug=slug)),
            json={"code": "ENG", "name": "Engineering"},
        )
        assert response.status_code == 201, f"{slug}: {response.text}"


def test_a_parent_in_another_tenant_is_not_found(client: TestClient, db: Session) -> None:
    make_tenant(db, "acme")
    make_tenant(db, "globex")

    globex_unit = _unit(client, auth(login(client, slug="globex")), "GBX")

    response = client.post(
        "/api/v1/org/units",
        headers=auth(login(client, slug="acme")),
        json={"code": "SNEAK", "name": "Sneak", "parent_id": globex_unit["id"]},
    )

    assert response.status_code == 404


# ── Reference tables ──────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("cost-centres", {"code": "CC1", "name": "Head Office"}),
        ("work-locations", {"code": "LOC1", "name": "Kathmandu", "district": "Kathmandu"}),
        ("grade-levels", {"code": "G1", "name": "Officer", "rank": 1}),
        ("designations", {"code": "D1", "name": "Software Engineer"}),
        (
            "employment-categories",
            {"code": "PERM", "name": "Permanent", "employment_type": "permanent"},
        ),
    ],
)
def test_reference_tables_round_trip(
    client: TestClient, headers: dict[str, str], path: str, payload: dict
) -> None:
    created = client.post(f"/api/v1/org/{path}", headers=headers, json=payload)
    assert created.status_code == 201, created.text

    listed = client.get(f"/api/v1/org/{path}", headers=headers).json()
    assert [row["code"] for row in listed] == [payload["code"]]

    # Deactivate, not delete — the row must survive for anything already pointing at it.
    assert client.delete(
        f"/api/v1/org/{path}/{created.json()['id']}", headers=headers
    ).status_code == 204
    assert client.get(f"/api/v1/org/{path}", headers=headers).json() == []
    assert len(client.get(f"/api/v1/org/{path}?include_inactive=true", headers=headers).json()) == 1


def test_grade_levels_are_ordered_by_rank_not_code(
    client: TestClient, headers: dict[str, str]
) -> None:
    """A pay ladder read alphabetically is meaningless."""
    for code, rank in (("ZZ", 1), ("AA", 2), ("MM", 3)):
        client.post(
            "/api/v1/org/grade-levels",
            headers=headers,
            json={"code": code, "name": code, "rank": rank},
        )

    listed = client.get("/api/v1/org/grade-levels", headers=headers).json()
    assert [g["code"] for g in listed] == ["ZZ", "AA", "MM"]


def test_probation_beyond_the_statutory_cap_is_rejected(
    client: TestClient, headers: dict[str, str]
) -> None:
    """Nepal Labour Act 2074 caps probation at six months."""
    response = client.post(
        "/api/v1/org/employment-categories",
        headers=headers,
        json={
            "code": "LONG",
            "name": "Very Long Probation",
            "employment_type": "probation",
            "probation_months": 12,
        },
    )

    assert response.status_code == 422


# ── Positions ─────────────────────────────────────────────────────────


def test_a_position_ties_together_the_org_cluster(
    client: TestClient, headers: dict[str, str]
) -> None:
    unit = _unit(client, headers, "ENG", name="Engineering")
    grade = client.post(
        "/api/v1/org/grade-levels",
        headers=headers,
        json={"code": "G5", "name": "Senior", "rank": 5},
    ).json()
    designation = client.post(
        "/api/v1/org/designations",
        headers=headers,
        json={"code": "SE", "name": "Software Engineer", "grade_level_id": grade["id"]},
    ).json()

    created = client.post(
        "/api/v1/org/positions",
        headers=headers,
        json={
            "code": "POS-1",
            "title": "Senior Software Engineer",
            "org_unit_id": unit["id"],
            "designation_id": designation["id"],
            "headcount": 2,
        },
    )

    assert created.status_code == 201, created.text
    assert created.json()["headcount"] == 2

    filtered = client.get(
        f"/api/v1/org/positions?org_unit_id={unit['id']}", headers=headers
    ).json()
    assert [p["code"] for p in filtered] == ["POS-1"]


def test_a_position_cannot_point_at_another_tenants_org_unit(
    client: TestClient, db: Session
) -> None:
    """The foreign key alone would permit this; only the tenant check stops it."""
    make_tenant(db, "acme")
    make_tenant(db, "globex")
    globex_unit = _unit(client, auth(login(client, slug="globex")), "GBX")

    response = client.post(
        "/api/v1/org/positions",
        headers=auth(login(client, slug="acme")),
        json={"code": "P1", "title": "Smuggled", "org_unit_id": globex_unit["id"]},
    )

    assert response.status_code == 404


def test_org_endpoints_require_the_org_module(client: TestClient, db: Session) -> None:
    from elogix_api.core.entitlements import ModuleCode
    from elogix_api.modules.identity.models import CompanyModule, PlanTier

    company, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.ENTERPRISE)
    db.add(CompanyModule(company_id=company.id, module=ModuleCode.ORG.value, is_enabled=False))
    db.commit()

    response = client.get("/api/v1/org/units", headers=auth(login(client, slug="acme")))
    assert response.status_code == 403
