"""Org tree invariants.

The tree is the part that can corrupt itself, so the rules live here rather than in the
router: a node's parent must belong to the same tenant, must not be the node itself, and
must not be one of its own descendants. A cycle here would hang every org chart render
and every "who reports to whom" walk in later phases.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from elogix_api.modules.org.models import OrgUnit
from elogix_api.modules.org.schemas import OrgUnitNode

MAX_DEPTH = 12


def get_unit(db: Session, *, company_id: uuid.UUID, unit_id: uuid.UUID) -> OrgUnit:
    unit = db.execute(
        select(OrgUnit).where(OrgUnit.id == unit_id, OrgUnit.company_id == company_id)
    ).scalar_one_or_none()
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Org unit not found")
    return unit


def resolve_parent(
    db: Session,
    *,
    company_id: uuid.UUID,
    parent_id: uuid.UUID | None,
    moving: uuid.UUID | None = None,
) -> tuple[uuid.UUID | None, int]:
    """Validate a proposed parent and return `(parent_id, depth)` for the child.

    `moving` is the unit being re-parented, if any; it is what makes the descendant check
    possible. Re-parenting a node under its own child is the one move that turns the tree
    into a ring, and it is easy to do by accident in a drag-and-drop org chart.
    """
    if parent_id is None:
        return None, 0

    parent = db.execute(
        select(OrgUnit).where(OrgUnit.id == parent_id, OrgUnit.company_id == company_id)
    ).scalar_one_or_none()

    # Same 404 whether the parent is missing or belongs to another tenant.
    if parent is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parent org unit not found")

    if moving is not None:
        if parent.id == moving:
            raise HTTPException(status.HTTP_409_CONFLICT, "A unit cannot be its own parent")
        if _is_descendant(db, company_id=company_id, ancestor=moving, candidate=parent.id):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Cannot move a unit beneath one of its own descendants",
            )

    depth = parent.depth + 1
    if depth >= MAX_DEPTH:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Org tree cannot nest deeper than {MAX_DEPTH} levels"
        )
    return parent.id, depth


def _is_descendant(
    db: Session, *, company_id: uuid.UUID, ancestor: uuid.UUID, candidate: uuid.UUID
) -> bool:
    """Walk up from `candidate`; if we meet `ancestor`, it is below it."""
    seen: set[uuid.UUID] = set()
    current: uuid.UUID | None = candidate

    while current is not None:
        if current == ancestor:
            return True
        # Defensive: if data is already cyclic, stop rather than loop forever.
        if current in seen:
            return False
        seen.add(current)
        current = db.execute(
            select(OrgUnit.parent_id).where(
                OrgUnit.id == current, OrgUnit.company_id == company_id
            )
        ).scalar_one_or_none()

    return False


def reindex_subtree(db: Session, *, company_id: uuid.UUID, root: OrgUnit) -> None:
    """Rewrite `depth` for everything under a node that just moved."""
    frontier = [root]
    while frontier:
        node = frontier.pop()
        children = (
            db.execute(
                select(OrgUnit).where(
                    OrgUnit.parent_id == node.id, OrgUnit.company_id == company_id
                )
            )
            .scalars()
            .all()
        )
        for child in children:
            child.depth = node.depth + 1
            frontier.append(child)


def build_tree(units: list[OrgUnit]) -> list[OrgUnitNode]:
    """Assemble the nested form from one flat query, without N+1 round trips."""
    nodes = {u.id: OrgUnitNode.model_validate(u, from_attributes=True) for u in units}
    roots: list[OrgUnitNode] = []

    for unit in units:
        node = nodes[unit.id]
        parent = nodes.get(unit.parent_id) if unit.parent_id else None
        if parent is None:
            roots.append(node)
        else:
            parent.children.append(node)

    return roots
