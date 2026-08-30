import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from elogix_api.core.deps import CurrentUserDep, DbDep
from elogix_api.modules.employee.models import Employee
from elogix_api.modules.employee.schemas import EmployeeList, EmployeeOut

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=EmployeeList)
def list_employees(
    current_user: CurrentUserDep,
    db: DbDep,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> EmployeeList:
    # Every query in a tenant-scoped module filters on the caller's company_id, taken
    # from the signed token. Phase 01 adds RLS underneath; this filter stays regardless.
    scoped = select(Employee).where(Employee.company_id == current_user.company_id)

    total = db.execute(
        select(func.count()).select_from(scoped.subquery())
    ).scalar_one()

    rows = db.execute(
        scoped.order_by(Employee.employee_code).limit(limit).offset(offset)
    ).scalars()

    return EmployeeList(
        items=[EmployeeOut.model_validate(row) for row in rows],
        total=total,
    )


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: uuid.UUID, current_user: CurrentUserDep, db: DbDep) -> EmployeeOut:
    row = db.execute(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.company_id == current_user.company_id,
        )
    ).scalar_one_or_none()

    # 404 rather than 403 for another tenant's row: the caller must not be able to
    # distinguish "does not exist" from "exists, belongs to someone else".
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return EmployeeOut.model_validate(row)
