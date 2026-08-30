import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from elogix_api.modules.org.models import EmploymentType, OrgUnitKind

CODE = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
NAME = Field(min_length=1, max_length=200)


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Org units ─────────────────────────────────────────────────────────


class OrgUnitCreate(BaseModel):
    code: str = CODE
    name: str = NAME
    kind: OrgUnitKind = OrgUnitKind.DEPARTMENT
    parent_id: uuid.UUID | None = None


class OrgUnitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    kind: OrgUnitKind | None = None
    parent_id: uuid.UUID | None = None
    is_active: bool | None = None


class OrgUnitOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    kind: OrgUnitKind
    parent_id: uuid.UUID | None
    depth: int
    is_active: bool


class OrgUnitNode(OrgUnitOut):
    """One node with its subtree, for rendering the chart in a single request."""

    children: list["OrgUnitNode"] = []


# ── Simple reference tables ───────────────────────────────────────────


class CostCentreCreate(BaseModel):
    code: str = CODE
    name: str = NAME


class CostCentreUpdate(BaseModel):
    """Every field optional; only what is sent is changed.

    These records were creatable and deletable but not editable, which meant correcting
    a typo in a grade name, or raising a position's headcount, was a delete and
    recreate — and `RESTRICT` foreign keys from assignments and requisitions refuse
    exactly that, for good reason. The `code` stays immutable: it is what people quote
    to each other and what an import file matches on.
    """

    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None


class CostCentreOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    is_active: bool


class WorkLocationCreate(BaseModel):
    code: str = CODE
    name: str = NAME
    address: str | None = Field(default=None, max_length=500)
    district: str | None = Field(default=None, max_length=100)


class WorkLocationUpdate(CostCentreUpdate):
    address: str | None = Field(default=None, max_length=500)
    district: str | None = Field(default=None, max_length=100)


class WorkLocationOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    address: str | None
    district: str | None
    is_active: bool


class GradeLevelCreate(BaseModel):
    code: str = CODE
    name: str = NAME
    rank: int = Field(ge=1, le=100)


class GradeLevelUpdate(CostCentreUpdate):
    rank: int | None = Field(default=None, ge=1, le=100)


class GradeLevelOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    rank: int
    is_active: bool


class DesignationCreate(BaseModel):
    code: str = CODE
    name: str = NAME
    grade_level_id: uuid.UUID | None = None


class DesignationUpdate(CostCentreUpdate):
    grade_level_id: uuid.UUID | None = None


class DesignationOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    grade_level_id: uuid.UUID | None
    is_active: bool


class EmploymentCategoryCreate(BaseModel):
    code: str = CODE
    name: str = NAME
    employment_type: EmploymentType
    # Nepal Labour Act 2074 caps probation at six months; the API refuses more.
    probation_months: int = Field(default=0, ge=0, le=6)
    notice_days: int = Field(default=30, ge=0, le=365)
    is_overtime_eligible: bool = True


class EmploymentCategoryUpdate(CostCentreUpdate):
    probation_months: int | None = Field(default=None, ge=0, le=6)
    notice_days: int | None = Field(default=None, ge=0, le=365)
    is_overtime_eligible: bool | None = None


class EmploymentCategoryOut(_Out):
    id: uuid.UUID
    code: str
    name: str
    employment_type: EmploymentType
    probation_months: int
    notice_days: int
    is_overtime_eligible: bool
    is_active: bool


# ── Positions ─────────────────────────────────────────────────────────


class PositionCreate(BaseModel):
    code: str = CODE
    title: str = NAME
    org_unit_id: uuid.UUID
    designation_id: uuid.UUID | None = None
    cost_centre_id: uuid.UUID | None = None
    work_location_id: uuid.UUID | None = None
    employment_category_id: uuid.UUID | None = None
    reports_to_id: uuid.UUID | None = None
    headcount: int = Field(default=1, ge=0, le=9999)


class PositionUpdate(BaseModel):
    """Headcount above all. A budget nothing can change is a budget nobody maintains,
    and requisitions are refused against it."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    org_unit_id: uuid.UUID | None = None
    designation_id: uuid.UUID | None = None
    cost_centre_id: uuid.UUID | None = None
    work_location_id: uuid.UUID | None = None
    employment_category_id: uuid.UUID | None = None
    reports_to_id: uuid.UUID | None = None
    headcount: int | None = Field(default=None, ge=0, le=9999)
    is_active: bool | None = None


class PositionOut(_Out):
    id: uuid.UUID
    code: str
    title: str
    org_unit_id: uuid.UUID
    designation_id: uuid.UUID | None
    cost_centre_id: uuid.UUID | None
    work_location_id: uuid.UUID | None
    employment_category_id: uuid.UUID | None
    reports_to_id: uuid.UUID | None
    headcount: int
    is_active: bool


# ── The company's own record ──────────────────────────────────────────


class CompanyOut(_Out):
    id: uuid.UUID
    name: str
    slug: str
    plan_tier: str
    is_active: bool

    legal_name: str | None
    pan_number: str | None
    vat_number: str | None
    registration_number: str | None
    registered_on: date | None
    ird_office: str | None
    ssf_employer_code: str | None
    labour_office: str | None

    address: str | None
    ward: str | None
    municipality: str | None
    district: str | None
    province: str | None

    phone: str | None
    email: str | None
    website: str | None


class CompanyUpdate(BaseModel):
    """The tenant's own details. Name and slug are not here.

    Renaming a tenant is a platform operation, and the slug is the login identifier —
    changing it would lock every user out of their own company.
    """

    legal_name: str | None = Field(default=None, max_length=300)
    pan_number: str | None = Field(default=None, max_length=32)
    vat_number: str | None = Field(default=None, max_length=32)
    registration_number: str | None = Field(default=None, max_length=64)
    registered_on: date | None = None
    ird_office: str | None = Field(default=None, max_length=120)
    ssf_employer_code: str | None = Field(default=None, max_length=64)
    labour_office: str | None = Field(default=None, max_length=120)

    address: str | None = Field(default=None, max_length=300)
    ward: str | None = Field(default=None, max_length=16)
    municipality: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    province: str | None = Field(default=None, max_length=120)

    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    website: str | None = Field(default=None, max_length=200)


class CompanyDocumentCreate(BaseModel):
    """`category` matches a statutory code from `nepal/company.py`, or is free text."""

    category: str = Field(min_length=1, max_length=48)
    title: str = Field(min_length=1, max_length=200)
    issuing_authority: str | None = Field(default=None, max_length=200)
    reference_number: str | None = Field(default=None, max_length=120)
    issued_on: date | None = None
    expires_on: date | None = None
    notes: str | None = None


class CompanyDocumentOut(_Out):
    id: uuid.UUID
    category: str
    title: str
    issuing_authority: str | None
    reference_number: str | None
    issued_on: date | None
    expires_on: date | None
    is_verified: bool
    verified_by: str | None
    verified_at: datetime | None
    original_filename: str | None
    size_bytes: int | None
    checksum: str | None
    notes: str | None


class ComplianceItem(BaseModel):
    """One statutory document, held or not."""

    code: str
    name: str
    authority: str
    citation: str | None
    renews: bool
    note: str
    # held | due | expired | missing
    status: str
    detail: str
    document_id: uuid.UUID | None
    expires_on: date | None
    is_verified: bool


class CompanyCompliance(BaseModel):
    as_of: date
    # Filing identifiers still blank. Named rather than counted, because "you cannot
    # file without the SSF employer code" is actionable and "80% complete" is not.
    missing_filing_fields: list[str]
    items: list[ComplianceItem]
    held: int
    due: int
    expired: int
    missing: int
