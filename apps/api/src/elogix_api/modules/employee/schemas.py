import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict

from elogix_api.modules.employee.models import EmployeeStatus


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_code: str
    full_name: str
    email: str | None
    status: EmployeeStatus
    joined_on: date


class EmployeeList(BaseModel):
    items: list[EmployeeOut]
    total: int
