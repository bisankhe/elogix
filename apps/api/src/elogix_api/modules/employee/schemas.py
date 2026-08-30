import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

from elogix_api.modules.employee.models import (
    AssignmentReason,
    DocumentType,
    EmployeeEventType,
    EmployeeStatus,
    Gender,
    MaritalStatus,
)


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Placement, shared by hire and transfer ────────────────────────────


class Placement(BaseModel):
    """Where an employee sits. The same shape whether hiring or moving someone."""

    org_unit_id: uuid.UUID
    position_id: uuid.UUID | None = None
    designation_id: uuid.UUID | None = None
    grade_level_id: uuid.UUID | None = None
    work_location_id: uuid.UUID | None = None
    employment_category_id: uuid.UUID | None = None
    cost_centre_id: uuid.UUID | None = None
    manager_id: uuid.UUID | None = None


# ── Employee ──────────────────────────────────────────────────────────


class PersonalDetails(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    full_name_nepali: str | None = Field(default=None, max_length=200)
    gender: Gender = Gender.UNDISCLOSED
    date_of_birth: date | None = None
    marital_status: MaritalStatus = MaritalStatus.SINGLE
    blood_group: str | None = Field(default=None, max_length=8)
    nationality: str = Field(default="Nepali", max_length=64)

    work_email: EmailStr | None = None
    personal_email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = None
    province: str | None = Field(default=None, max_length=64)
    district: str | None = Field(default=None, max_length=64)
    emergency_contact_name: str | None = Field(default=None, max_length=200)
    emergency_contact_phone: str | None = Field(default=None, max_length=32)

    citizenship_number: str | None = Field(default=None, max_length=64)
    pan_number: str | None = Field(default=None, max_length=32)
    ssf_number: str | None = Field(default=None, max_length=32)
    provident_fund_number: str | None = Field(default=None, max_length=32)
    bank_name: str | None = Field(default=None, max_length=128)
    bank_account_number: str | None = Field(default=None, max_length=64)


class HireRequest(PersonalDetails):
    """One call creates the person, their opening assignment and the HIRED event."""

    employee_code: str = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
    joined_on: date
    probation_ends_on: date | None = None
    placement: Placement


class EmployeeUpdate(BaseModel):
    """Personal details only. Placement changes go through /assignments, and lifecycle
    changes through /confirm and /exit, so history cannot be edited away."""

    model_config = ConfigDict(extra="forbid")

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    middle_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    full_name_nepali: str | None = Field(default=None, max_length=200)
    gender: Gender | None = None
    date_of_birth: date | None = None
    marital_status: MaritalStatus | None = None
    blood_group: str | None = Field(default=None, max_length=8)
    nationality: str | None = Field(default=None, max_length=64)
    work_email: EmailStr | None = None
    personal_email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = None
    province: str | None = Field(default=None, max_length=64)
    district: str | None = Field(default=None, max_length=64)
    emergency_contact_name: str | None = Field(default=None, max_length=200)
    emergency_contact_phone: str | None = Field(default=None, max_length=32)
    citizenship_number: str | None = Field(default=None, max_length=64)
    pan_number: str | None = Field(default=None, max_length=32)
    ssf_number: str | None = Field(default=None, max_length=32)
    provident_fund_number: str | None = Field(default=None, max_length=32)
    bank_name: str | None = Field(default=None, max_length=128)
    bank_account_number: str | None = Field(default=None, max_length=64)


class EmployeeSummary(_Out):
    """The list row. Deliberately small — an employee list is the highest-traffic
    screen in the product and does not need the full record."""

    id: uuid.UUID
    employee_code: str
    first_name: str
    middle_name: str | None
    last_name: str
    status: EmployeeStatus
    joined_on: date
    work_email: str | None

    @computed_field
    @property
    def full_name(self) -> str:
        return " ".join(p for p in (self.first_name, self.middle_name, self.last_name) if p)


class EmployeeList(BaseModel):
    items: list[EmployeeSummary]
    total: int


class AssignmentOut(_Out):
    id: uuid.UUID
    org_unit_id: uuid.UUID
    position_id: uuid.UUID | None
    designation_id: uuid.UUID | None
    grade_level_id: uuid.UUID | None
    work_location_id: uuid.UUID | None
    employment_category_id: uuid.UUID | None
    cost_centre_id: uuid.UUID | None
    manager_id: uuid.UUID | None
    reason: AssignmentReason
    effective_from: date
    effective_to: date | None
    note: str | None


class EmployeeDetail(EmployeeSummary):
    full_name_nepali: str | None
    gender: Gender
    date_of_birth: date | None
    marital_status: MaritalStatus
    blood_group: str | None
    nationality: str
    personal_email: str | None
    phone: str | None
    address: str | None
    province: str | None
    district: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    citizenship_number: str | None
    pan_number: str | None
    ssf_number: str | None
    provident_fund_number: str | None
    bank_name: str | None
    bank_account_number: str | None
    probation_ends_on: date | None
    confirmed_on: date | None
    exited_on: date | None
    exit_reason: str | None
    current_assignment: AssignmentOut | None = None


# ── Lifecycle ─────────────────────────────────────────────────────────


class AssignmentRequest(BaseModel):
    placement: Placement
    reason: AssignmentReason = AssignmentReason.TRANSFER
    effective_from: date
    note: str | None = None


class ConfirmRequest(BaseModel):
    confirmed_on: date


class ExitRequest(BaseModel):
    exited_on: date
    reason: str = Field(min_length=1, max_length=2000)


class EventOut(_Out):
    id: uuid.UUID
    event_type: EmployeeEventType
    occurred_on: date
    note: str | None


# ── Documents ─────────────────────────────────────────────────────────


class DocumentCreate(BaseModel):
    document_type: DocumentType
    title: str = Field(min_length=1, max_length=200)
    storage_key: str | None = Field(default=None, max_length=500)
    issued_on: date | None = None
    expires_on: date | None = None


class DocumentOut(_Out):
    id: uuid.UUID
    employee_id: uuid.UUID
    document_type: DocumentType
    title: str
    storage_key: str | None
    issued_on: date | None
    expires_on: date | None
    is_verified: bool
    verified_by: str | None = None
    verified_at: datetime | None = None
    original_filename: str | None = None
    content_type: str | None = None
    size_bytes: int | None = None
    checksum: str | None = None


class DocumentVerify(BaseModel):
    """Who checked the paper against the person. A bare boolean would not say."""

    is_verified: bool
    note: str | None = Field(default=None, max_length=500)


class ExpiringDocument(DocumentOut):
    employee_code: str
    employee_name: str
    days_remaining: int
