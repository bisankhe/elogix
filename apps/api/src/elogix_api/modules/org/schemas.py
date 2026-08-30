import uuid

from pydantic import BaseModel, ConfigDict, Field

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
