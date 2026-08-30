"""Module entitlements, decided server-side.

In the prototype, module access lived in `localStorage` — any user could edit their own
plan and unlock any module. The server is the only authority here. The frontend may read
`/api/v1/entitlements` to decide what to *show*, but a hidden module is a cosmetic
convenience, never a control.

This module stays free of FastAPI imports so it can be tested directly; the dependency
that enforces it lives in `core.deps`, next to `CurrentUser`.
"""

import enum
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.modules.identity.models import CompanyModule, PlanTier


class ModuleCode(enum.StrEnum):
    ORG = "org"
    EMPLOYEE = "employee"
    ATTENDANCE = "attendance"
    LEAVE = "leave"
    PAYROLL = "payroll"
    ESS = "ess"
    REPORTS = "reports"
    ATS = "ats"
    PERFORMANCE = "performance"
    TRAINING = "training"
    VENDOR = "vendor"
    COMPLIANCE = "compliance"
    FINANCE = "finance"
    AI = "ai"


# The plan ladder from the prototype's own taxonomy. Each tier is cumulative, and the
# ordering tracks the build phases: trial is roughly phases 02–05, starter adds payroll.
_TRIAL = frozenset(
    {ModuleCode.ORG, ModuleCode.EMPLOYEE, ModuleCode.ATTENDANCE, ModuleCode.LEAVE, ModuleCode.ESS}
)
_STARTER = _TRIAL | {ModuleCode.PAYROLL, ModuleCode.REPORTS}
_GROWTH = _STARTER | {ModuleCode.ATS, ModuleCode.PERFORMANCE, ModuleCode.TRAINING}
_BUSINESS = _GROWTH | {ModuleCode.VENDOR, ModuleCode.COMPLIANCE, ModuleCode.FINANCE}
_ENTERPRISE = _BUSINESS | {ModuleCode.AI}

PLAN_MODULES: dict[PlanTier, frozenset[ModuleCode]] = {
    PlanTier.TRIAL: _TRIAL,
    PlanTier.STARTER: _STARTER,
    PlanTier.GROWTH: _GROWTH,
    PlanTier.BUSINESS: _BUSINESS,
    PlanTier.ENTERPRISE: _ENTERPRISE,
}


def effective_modules(
    db: Session, *, company_id: uuid.UUID, plan_tier: PlanTier
) -> frozenset[ModuleCode]:
    """Plan defaults, with per-company overrides applied on top."""
    granted = set(PLAN_MODULES[plan_tier])

    overrides = db.execute(
        select(CompanyModule.module, CompanyModule.is_enabled).where(
            CompanyModule.company_id == company_id
        )
    ).all()

    for module, is_enabled in overrides:
        try:
            code = ModuleCode(module)
        except ValueError:
            # An override naming a module this build does not know about. Ignore it
            # rather than crash — a stale row must not take the tenant down.
            continue
        if is_enabled:
            granted.add(code)
        else:
            granted.discard(code)

    return frozenset(granted)
