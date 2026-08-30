"""The employee record.

Thin on purpose. Phase 03 owns the real field set, documents, the digital employee file
and the lifecycle states; what exists here is only enough to prove the pipe end to end.
Adding fields later is a migration. Getting `company_id` wrong is not recoverable, which
is why that part is already final.
"""

import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from elogix_api.db.base import Base
from elogix_api.db.types import TimestampMixin, company_fk, uuid_pk


class EmployeeStatus(enum.StrEnum):
    ACTIVE = "active"
    PROBATION = "probation"
    SUSPENDED = "suspended"
    EXITED = "exited"


class Employee(Base, TimestampMixin):
    __tablename__ = "employees"
    __table_args__ = (UniqueConstraint("company_id", "employee_code"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    company_id: Mapped[uuid.UUID] = company_fk()
    employee_code: Mapped[str] = mapped_column(String(32), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    status: Mapped[EmployeeStatus] = mapped_column(
        Enum(EmployeeStatus, name="employee_status", native_enum=True),
        nullable=False,
        default=EmployeeStatus.ACTIVE,
    )
    joined_on: Mapped[date] = mapped_column(Date, nullable=False)
