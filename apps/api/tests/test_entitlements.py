"""Module entitlements.

Phase 01's other done-when: 'module access is denied server-side'. In the prototype the
plan lived in localStorage and any user could edit it, so these tests care about one
thing above all — that the answer does not depend on anything the client sends.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from elogix_api.core.entitlements import PLAN_MODULES, ModuleCode, effective_modules
from elogix_api.core.tenancy import set_current_company
from elogix_api.modules.identity.models import CompanyModule, PlanTier
from tests.conftest import auth, login, make_tenant


def test_the_plan_ladder_is_cumulative() -> None:
    tiers = [PlanTier.TRIAL, PlanTier.STARTER, PlanTier.GROWTH, PlanTier.BUSINESS]
    for lower, higher in zip(tiers, tiers[1:], strict=False):
        assert PLAN_MODULES[lower] < PLAN_MODULES[higher], f"{higher} must include {lower}"


def test_a_trial_tenant_does_not_get_payroll(db: Session) -> None:
    company, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.TRIAL)

    modules = effective_modules(db, company_id=company.id, plan_tier=PlanTier.TRIAL)

    assert ModuleCode.EMPLOYEE in modules
    assert ModuleCode.PAYROLL not in modules


def test_an_override_can_revoke_a_module_the_plan_includes(
    client: TestClient, db: Session
) -> None:
    company, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.ENTERPRISE)
    set_current_company(db, company.id)
    db.add(
        CompanyModule(company_id=company.id, module=ModuleCode.EMPLOYEE.value, is_enabled=False)
    )
    db.commit()

    response = client.get("/api/v1/employees", headers=auth(login(client, slug="acme")))

    assert response.status_code == 403
    assert "not enabled" in response.json()["detail"]


def test_a_module_the_plan_excludes_is_denied(client: TestClient, db: Session) -> None:
    make_tenant(db, "acme", plan_tier=PlanTier.TRIAL)

    body = client.get("/api/v1/auth/entitlements", headers=auth(login(client, slug="acme"))).json()

    assert body["plan_tier"] == "trial"
    assert "payroll" not in body["modules"]
    assert "employee" in body["modules"]


def test_an_override_can_grant_a_module_above_the_plan(db: Session) -> None:
    company, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.TRIAL)
    set_current_company(db, company.id)
    db.add(
        CompanyModule(company_id=company.id, module=ModuleCode.PAYROLL.value, is_enabled=True)
    )
    db.commit()

    modules = effective_modules(db, company_id=company.id, plan_tier=PlanTier.TRIAL)
    assert ModuleCode.PAYROLL in modules


def test_an_override_naming_an_unknown_module_is_ignored(db: Session) -> None:
    """A stale row from a removed feature must not take the tenant down."""
    company, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.TRIAL)
    set_current_company(db, company.id)
    db.add(CompanyModule(company_id=company.id, module="module_from_the_future", is_enabled=True))
    db.commit()

    modules = effective_modules(db, company_id=company.id, plan_tier=PlanTier.TRIAL)
    assert modules == PLAN_MODULES[PlanTier.TRIAL]


def test_one_tenants_override_does_not_affect_another(client: TestClient, db: Session) -> None:
    acme, _, _ = make_tenant(db, "acme", plan_tier=PlanTier.ENTERPRISE)
    make_tenant(db, "globex", plan_tier=PlanTier.ENTERPRISE)
    set_current_company(db, acme.id)
    db.add(
        CompanyModule(company_id=acme.id, module=ModuleCode.EMPLOYEE.value, is_enabled=False)
    )
    db.commit()

    assert (
        client.get("/api/v1/employees", headers=auth(login(client, slug="acme"))).status_code
        == 403
    )
    assert (
        client.get("/api/v1/employees", headers=auth(login(client, slug="globex"))).status_code
        == 200
    )


@pytest.mark.parametrize(
    "header",
    [
        {"X-Plan-Tier": "enterprise"},
        {"X-Modules": "payroll,employee"},
        {"X-Tenant-Id": "00000000-0000-0000-0000-000000000001"},
    ],
)
def test_no_client_header_can_change_entitlements(
    client: TestClient, db: Session, header: dict[str, str]
) -> None:
    """The prototype read tenancy and plan from client-supplied headers. Nothing here does."""
    make_tenant(db, "acme", plan_tier=PlanTier.TRIAL)
    headers = auth(login(client, slug="acme")) | header

    body = client.get("/api/v1/auth/entitlements", headers=headers).json()

    assert body["plan_tier"] == "trial"
    assert "payroll" not in body["modules"]
