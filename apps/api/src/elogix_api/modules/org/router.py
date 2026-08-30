"""Organization structure endpoints.

The five reference tables share `ReferenceMixin`, so the list/create/deactivate work is
done by four small helpers typed against that mixin. The routes themselves are written
out per entity rather than generated: a factory saved about a hundred lines but cost
every one of them its type checking, and produced worse OpenAPI operation names.

Org units and positions get real logic, because they have real invariants.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from elogix_api.core.deps import CurrentUser, CurrentUserDep, DbDep, require_module
from elogix_api.core.entitlements import ModuleCode
from elogix_api.modules.org import service
from elogix_api.modules.org.models import (
    CostCentre,
    Designation,
    EmploymentCategory,
    GradeLevel,
    OrgUnit,
    Position,
    ReferenceMixin,
    WorkLocation,
)
from elogix_api.modules.org.schemas import (
    CostCentreCreate,
    CostCentreOut,
    DesignationCreate,
    DesignationOut,
    EmploymentCategoryCreate,
    EmploymentCategoryOut,
    GradeLevelCreate,
    GradeLevelOut,
    OrgUnitCreate,
    OrgUnitNode,
    OrgUnitOut,
    OrgUnitUpdate,
    PositionCreate,
    PositionOut,
    WorkLocationCreate,
    WorkLocationOut,
)

router = APIRouter(
    prefix="/org",
    tags=["org"],
    dependencies=[Depends(require_module(ModuleCode.ORG))],
)

_DUPLICATE_CODE = "A record with this code already exists"


# ── Shared helpers for the reference tables ───────────────────────────


def _list[R: ReferenceMixin](
    db: Session, model: type[R], user: CurrentUser, *, include_inactive: bool
) -> list[R]:
    stmt = select(model).where(model.company_id == user.company_id)
    if not include_inactive:
        stmt = stmt.where(model.is_active.is_(True))
    return list(db.execute(stmt.order_by(model.code)).scalars().all())


def _get[R: ReferenceMixin](
    db: Session, model: type[R], record_id: uuid.UUID, user: CurrentUser
) -> R:
    row = db.execute(
        select(model).where(model.id == record_id, model.company_id == user.company_id)
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return row


def _deactivate[R: ReferenceMixin](
    db: Session, model: type[R], record_id: uuid.UUID, user: CurrentUser
) -> None:
    """Deactivate rather than delete: positions and, later, employment history point at
    these rows. Hard-deleting a grade that payslips reference is not recoverable."""
    row = _get(db, model, record_id, user)
    row.is_active = False
    db.commit()


def _commit[T](db: Session, row: T) -> T:
    """Turn the per-tenant unique-code violation into a 409 rather than a 500."""
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, _DUPLICATE_CODE) from exc
    db.refresh(row)
    return row


# ── Cost centres ──────────────────────────────────────────────────────


@router.get("/cost-centres", response_model=list[CostCentreOut])
def list_cost_centres(
    user: CurrentUserDep, db: DbDep, include_inactive: bool = False
) -> list[CostCentre]:
    return _list(db, CostCentre, user, include_inactive=include_inactive)


@router.post("/cost-centres", response_model=CostCentreOut, status_code=status.HTTP_201_CREATED)
def create_cost_centre(payload: CostCentreCreate, user: CurrentUserDep, db: DbDep) -> CostCentre:
    return _commit(db, CostCentre(company_id=user.company_id, **payload.model_dump()))


@router.delete("/cost-centres/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_cost_centre(record_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> None:
    _deactivate(db, CostCentre, record_id, user)


# ── Work locations ────────────────────────────────────────────────────


@router.get("/work-locations", response_model=list[WorkLocationOut])
def list_work_locations(
    user: CurrentUserDep, db: DbDep, include_inactive: bool = False
) -> list[WorkLocation]:
    return _list(db, WorkLocation, user, include_inactive=include_inactive)


@router.post(
    "/work-locations", response_model=WorkLocationOut, status_code=status.HTTP_201_CREATED
)
def create_work_location(
    payload: WorkLocationCreate, user: CurrentUserDep, db: DbDep
) -> WorkLocation:
    return _commit(db, WorkLocation(company_id=user.company_id, **payload.model_dump()))


@router.delete("/work-locations/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_work_location(record_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> None:
    _deactivate(db, WorkLocation, record_id, user)


# ── Grade levels ──────────────────────────────────────────────────────


@router.get("/grade-levels", response_model=list[GradeLevelOut])
def list_grade_levels(
    user: CurrentUserDep, db: DbDep, include_inactive: bool = False
) -> list[GradeLevel]:
    stmt = select(GradeLevel).where(GradeLevel.company_id == user.company_id)
    if not include_inactive:
        stmt = stmt.where(GradeLevel.is_active.is_(True))
    # Ordered by rank, not code: a pay ladder read alphabetically is meaningless.
    return list(db.execute(stmt.order_by(GradeLevel.rank)).scalars().all())


@router.post("/grade-levels", response_model=GradeLevelOut, status_code=status.HTTP_201_CREATED)
def create_grade_level(payload: GradeLevelCreate, user: CurrentUserDep, db: DbDep) -> GradeLevel:
    return _commit(db, GradeLevel(company_id=user.company_id, **payload.model_dump()))


@router.delete("/grade-levels/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_grade_level(record_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> None:
    _deactivate(db, GradeLevel, record_id, user)


# ── Designations ──────────────────────────────────────────────────────


@router.get("/designations", response_model=list[DesignationOut])
def list_designations(
    user: CurrentUserDep, db: DbDep, include_inactive: bool = False
) -> list[Designation]:
    return _list(db, Designation, user, include_inactive=include_inactive)


@router.post("/designations", response_model=DesignationOut, status_code=status.HTTP_201_CREATED)
def create_designation(
    payload: DesignationCreate, user: CurrentUserDep, db: DbDep
) -> Designation:
    if payload.grade_level_id is not None:
        _get(db, GradeLevel, payload.grade_level_id, user)
    return _commit(db, Designation(company_id=user.company_id, **payload.model_dump()))


@router.delete("/designations/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_designation(record_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> None:
    _deactivate(db, Designation, record_id, user)


# ── Employment categories ─────────────────────────────────────────────


@router.get("/employment-categories", response_model=list[EmploymentCategoryOut])
def list_employment_categories(
    user: CurrentUserDep, db: DbDep, include_inactive: bool = False
) -> list[EmploymentCategory]:
    return _list(db, EmploymentCategory, user, include_inactive=include_inactive)


@router.post(
    "/employment-categories",
    response_model=EmploymentCategoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_employment_category(
    payload: EmploymentCategoryCreate, user: CurrentUserDep, db: DbDep
) -> EmploymentCategory:
    return _commit(db, EmploymentCategory(company_id=user.company_id, **payload.model_dump()))


@router.delete("/employment-categories/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_employment_category(
    record_id: uuid.UUID, user: CurrentUserDep, db: DbDep
) -> None:
    _deactivate(db, EmploymentCategory, record_id, user)


# ── Org units ─────────────────────────────────────────────────────────


@router.get("/units", response_model=list[OrgUnitOut])
def list_units(user: CurrentUserDep, db: DbDep, include_inactive: bool = False) -> list[OrgUnit]:
    stmt = select(OrgUnit).where(OrgUnit.company_id == user.company_id)
    if not include_inactive:
        stmt = stmt.where(OrgUnit.is_active.is_(True))
    return list(db.execute(stmt.order_by(OrgUnit.depth, OrgUnit.code)).scalars().all())


@router.get("/tree", response_model=list[OrgUnitNode])
def org_tree(user: CurrentUserDep, db: DbDep) -> list[OrgUnitNode]:
    """The whole chart in one request — one query, assembled in memory, no N+1."""
    units = list(
        db.execute(
            select(OrgUnit)
            .where(OrgUnit.company_id == user.company_id, OrgUnit.is_active.is_(True))
            .order_by(OrgUnit.depth, OrgUnit.code)
        )
        .scalars()
        .all()
    )
    return service.build_tree(units)


@router.post("/units", response_model=OrgUnitOut, status_code=status.HTTP_201_CREATED)
def create_unit(payload: OrgUnitCreate, user: CurrentUserDep, db: DbDep) -> OrgUnit:
    parent_id, depth = service.resolve_parent(
        db, company_id=user.company_id, parent_id=payload.parent_id
    )
    return _commit(
        db,
        OrgUnit(
            company_id=user.company_id,
            code=payload.code,
            name=payload.name,
            kind=payload.kind,
            parent_id=parent_id,
            depth=depth,
        ),
    )


@router.patch("/units/{unit_id}", response_model=OrgUnitOut)
def update_unit(
    unit_id: uuid.UUID, payload: OrgUnitUpdate, user: CurrentUserDep, db: DbDep
) -> OrgUnit:
    unit = service.get_unit(db, company_id=user.company_id, unit_id=unit_id)
    fields = payload.model_dump(exclude_unset=True)

    if "parent_id" in fields:
        parent_id, depth = service.resolve_parent(
            db, company_id=user.company_id, parent_id=fields.pop("parent_id"), moving=unit.id
        )
        unit.parent_id = parent_id
        unit.depth = depth
        service.reindex_subtree(db, company_id=user.company_id, root=unit)

    for key, value in fields.items():
        setattr(unit, key, value)

    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_unit(unit_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> None:
    unit = service.get_unit(db, company_id=user.company_id, unit_id=unit_id)

    has_children = db.execute(
        select(OrgUnit.id).where(
            OrgUnit.parent_id == unit.id,
            OrgUnit.company_id == user.company_id,
            OrgUnit.is_active.is_(True),
        )
    ).first()
    if has_children:
        raise HTTPException(status.HTTP_409_CONFLICT, "Move or deactivate the child units first")

    unit.is_active = False
    db.commit()


# ── Positions ─────────────────────────────────────────────────────────


@router.get("/positions", response_model=list[PositionOut])
def list_positions(
    user: CurrentUserDep,
    db: DbDep,
    org_unit_id: Annotated[uuid.UUID | None, Query()] = None,
    include_inactive: bool = False,
) -> list[Position]:
    stmt = select(Position).where(Position.company_id == user.company_id)
    if org_unit_id is not None:
        stmt = stmt.where(Position.org_unit_id == org_unit_id)
    if not include_inactive:
        stmt = stmt.where(Position.is_active.is_(True))
    return list(db.execute(stmt.order_by(Position.code)).scalars().all())


@router.post("/positions", response_model=PositionOut, status_code=status.HTTP_201_CREATED)
def create_position(payload: PositionCreate, user: CurrentUserDep, db: DbDep) -> Position:
    # Every foreign key is re-checked against the caller's tenant. The database
    # constraint alone would happily let a position point at another tenant's org unit.
    service.get_unit(db, company_id=user.company_id, unit_id=payload.org_unit_id)

    if payload.designation_id is not None:
        _get(db, Designation, payload.designation_id, user)
    if payload.cost_centre_id is not None:
        _get(db, CostCentre, payload.cost_centre_id, user)
    if payload.work_location_id is not None:
        _get(db, WorkLocation, payload.work_location_id, user)
    if payload.employment_category_id is not None:
        _get(db, EmploymentCategory, payload.employment_category_id, user)
    if payload.reports_to_id is not None:
        _get_position(db, payload.reports_to_id, user, missing="Reporting position not found")

    return _commit(db, Position(company_id=user.company_id, **payload.model_dump()))


@router.delete("/positions/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_position(position_id: uuid.UUID, user: CurrentUserDep, db: DbDep) -> None:
    position = _get_position(db, position_id, user)
    position.is_active = False
    db.commit()


def _get_position(
    db: Session,
    position_id: uuid.UUID,
    user: CurrentUser,
    *,
    missing: str = "Position not found",
) -> Position:
    """Positions do not use `ReferenceMixin`, so they need their own scoped lookup."""
    row = db.execute(
        select(Position).where(
            Position.id == position_id, Position.company_id == user.company_id
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, missing)
    return row
