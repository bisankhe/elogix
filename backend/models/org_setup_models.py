"""
FILE: backend/models/org_setup_models.py
COVERS:
  - Company Profile
  - Company Setup
  - Group Company
  - Branch & Location Setup
  - Business Unit / Division Setup
"""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Numeric,
    Text, ForeignKey, Enum, JSON, Float, CheckConstraint, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, TSVECTOR
import uuid
import enum

Base = declarative_base()

# ── Enums ─────────────────────────────────────────────────────
class CompanyType(str, enum.Enum):
    PRIVATE_LTD   = "private_limited"
    PUBLIC_LTD    = "public_limited"
    PARTNERSHIP   = "partnership"
    SOLE_PROP     = "sole_proprietorship"
    NGO           = "ngo"
    COOPERATIVE   = "cooperative"
    BRANCH_OFFICE = "branch_office"
    LIAISON       = "liaison_office"

class GroupType(str, enum.Enum):
    HOLDING    = "holding_company"
    SUBSIDIARY = "subsidiary"
    ASSOCIATE  = "associate"
    JV         = "joint_venture"
    TRUST      = "trust"

class BranchType(str, enum.Enum):
    HEADQUARTERS      = "headquarters"
    BRANCH_OFFICE     = "branch_office"
    REGIONAL_OFFICE   = "regional_office"
    INTERNATIONAL     = "international_office"
    VIRTUAL           = "virtual"
    PROJECT_SITE      = "project_site"
    WAREHOUSE         = "warehouse"

class BUType(str, enum.Enum):
    BUSINESS_UNIT = "business_unit"
    DIVISION      = "division"
    DEPT_GROUP    = "department_group"
    PROFIT_CENTER = "profit_center"
    COST_CENTER   = "cost_center"
    PROJECT_UNIT  = "project_unit"

class EntityStatus(str, enum.Enum):
    ACTIVE   = "active"
    INACTIVE = "inactive"
    DRAFT    = "draft"
    ARCHIVED = "archived"


# ── 1. Group Company ──────────────────────────────────────────
class GroupCompany(Base):
    __tablename__ = "group_companies"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code              = Column(String(20),  nullable=False, unique=True)
    name              = Column(String(200), nullable=False)
    short_name        = Column(String(80))
    group_type        = Column(Enum(GroupType), default=GroupType.HOLDING)
    country           = Column(String(60),  default="Nepal")
    base_currency     = Column(String(10),  default="NPR")
    pan_tax_id        = Column(String(50))
    incorporated_date = Column(Date)
    contact_email     = Column(String(200))
    website           = Column(String(200))
    logo_url          = Column(Text)
    description       = Column(Text)
    status            = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)

    # AI fields
    ai_risk_score     = Column(Float,  default=0.0)
    ai_insights       = Column(JSONB,  default=dict)
    ai_last_analyzed  = Column(DateTime)

    # Audit
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by        = Column(UUID(as_uuid=True))

    # Relationships
    companies         = relationship("Company", back_populates="group", cascade="all, delete-orphan")
    legal_documents   = relationship("CompanyLegalDocument", back_populates="group")

    __table_args__ = (
        Index("idx_group_code",   "code"),
        Index("idx_group_status", "status"),
    )


# ── 2. Company ────────────────────────────────────────────────
class Company(Base):
    __tablename__ = "companies"

    id                    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id              = Column(UUID(as_uuid=True), ForeignKey("group_companies.id"), nullable=False)
    code                  = Column(String(20),  nullable=False, unique=True)
    name                  = Column(String(200), nullable=False)
    name_nepali           = Column(String(200))
    short_name            = Column(String(80))
    company_type          = Column(Enum(CompanyType), default=CompanyType.PRIVATE_LTD)
    industry              = Column(String(100))
    sector                = Column(String(100))
    sub_sector            = Column(String(100))

    # Nepal-specific registration
    pan_number            = Column(String(20))
    vat_number            = Column(String(20))
    company_reg_number    = Column(String(50))
    ocr_registration_no   = Column(String(50))    # Office of Company Registrar
    labour_reg_number     = Column(String(50))    # Labour Office registration
    ssf_reg_number        = Column(String(50))    # Social Security Fund

    # Addresses
    registered_address    = Column(Text)
    operational_address   = Column(Text)
    province              = Column(String(80))
    district              = Column(String(80))
    municipality          = Column(String(80))
    ward_no               = Column(String(10))
    country               = Column(String(60), default="Nepal")

    # Contacts
    phone                 = Column(String(30))
    fax                   = Column(String(30))
    email                 = Column(String(200))
    website               = Column(String(200))

    # Corporate
    fiscal_year_start     = Column(String(10), default="Shrawan 1")   # Nepal BS calendar
    calendar_type         = Column(String(10), default="BS")          # BS or AD
    logo_url              = Column(Text)
    incorporated_date     = Column(Date)
    paid_up_capital_npr   = Column(Numeric(15,2))
    authorized_capital_npr= Column(Numeric(15,2))

    # HR defaults
    probation_months      = Column(Integer, default=6)
    working_days_week     = Column(Integer, default=5)
    daily_working_hours   = Column(Numeric(4,2), default=8.0)
    ot_rate_multiplier    = Column(Numeric(4,2), default=1.5)

    status                = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)

    # AI / setup wizard
    setup_complete        = Column(Boolean, default=False)
    setup_progress_pct    = Column(Integer, default=0)
    setup_steps_json      = Column(JSONB, default=dict)
    ai_compliance_score   = Column(Float, default=0.0)
    ai_insights           = Column(JSONB, default=dict)

    # Audit
    created_at            = Column(DateTime, default=datetime.utcnow)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by            = Column(UUID(as_uuid=True))

    # Relationships
    group                 = relationship("GroupCompany", back_populates="companies")
    branches              = relationship("Branch",       back_populates="company", cascade="all, delete-orphan")
    business_units        = relationship("BusinessUnit", back_populates="company", cascade="all, delete-orphan")
    legal_documents       = relationship("CompanyLegalDocument", back_populates="company")

    __table_args__ = (
        Index("idx_company_group",  "group_id"),
        Index("idx_company_code",   "code"),
        Index("idx_company_pan",    "pan_number"),
        Index("idx_company_status", "status"),
    )


# ── 3. Company Legal Documents ────────────────────────────────
class CompanyLegalDocument(Base):
    __tablename__ = "company_legal_documents"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id      = Column(UUID(as_uuid=True), ForeignKey("companies.id"))
    group_id        = Column(UUID(as_uuid=True), ForeignKey("group_companies.id"))
    doc_type        = Column(String(80), nullable=False)  # PAN, VAT, OCR, Labour, SSF, Insurance
    doc_number      = Column(String(100))
    issued_by       = Column(String(200))
    issue_date      = Column(Date)
    expiry_date     = Column(Date)
    file_url        = Column(Text)
    notes           = Column(Text)
    is_mandatory    = Column(Boolean, default=True)
    alert_days      = Column(Integer, default=30)          # Alert X days before expiry

    # AI expiry prediction
    ai_renewal_prediction = Column(JSONB, default=dict)
    ai_risk_level         = Column(String(20))             # low / medium / high / critical

    status          = Column(String(20), default="valid")  # valid / expired / pending_renewal
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company         = relationship("Company",      back_populates="legal_documents")
    group           = relationship("GroupCompany", back_populates="legal_documents")

    __table_args__ = (
        Index("idx_legal_doc_company",  "company_id"),
        Index("idx_legal_doc_expiry",   "expiry_date"),
        Index("idx_legal_doc_type",     "doc_type"),
    )


# ── 4. Branch / Location ──────────────────────────────────────
class Branch(Base):
    __tablename__ = "branches"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id          = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    code                = Column(String(20), nullable=False)
    name                = Column(String(200), nullable=False)
    short_name          = Column(String(80))
    branch_type         = Column(Enum(BranchType), default=BranchType.BRANCH_OFFICE)
    is_headquarters     = Column(Boolean, default=False)

    # Location
    country             = Column(String(60), default="Nepal")
    province            = Column(String(80))
    district            = Column(String(80))
    municipality        = Column(String(80))
    ward_no             = Column(String(10))
    full_address        = Column(Text)
    postal_code         = Column(String(20))
    latitude            = Column(Numeric(10, 7))
    longitude           = Column(Numeric(10, 7))
    map_url             = Column(Text)

    # Operations
    phone               = Column(String(30))
    email               = Column(String(200))
    manager_id          = Column(UUID(as_uuid=True))   # FK to employees table
    manager_name        = Column(String(200))           # Denormalized for quick display
    cost_center_code    = Column(String(30))
    established_date    = Column(Date)

    # Attendance
    attendance_device   = Column(String(100))           # Biometric / Mobile / Card
    labour_office_zone  = Column(String(200))           # Regional Labour Office

    # Capacity
    capacity            = Column(Integer, default=0)
    current_headcount   = Column(Integer, default=0)

    # Amenities
    amenities           = Column(ARRAY(String), default=[])
    work_policy         = Column(String(50), default="Office-First")

    status              = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ai_insights         = Column(JSONB, default=dict)

    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by          = Column(UUID(as_uuid=True))

    # Relationships
    company             = relationship("Company", back_populates="branches")
    business_units      = relationship("BusinessUnit", back_populates="branch")
    work_locations      = relationship("WorkLocation", back_populates="branch")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_branch_code_per_company"),
        Index("idx_branch_company",  "company_id"),
        Index("idx_branch_type",     "branch_type"),
        Index("idx_branch_status",   "status"),
    )


# ── 5. Business Unit / Division ───────────────────────────────
class BusinessUnit(Base):
    __tablename__ = "business_units"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id              = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    branch_id               = Column(UUID(as_uuid=True), ForeignKey("branches.id"))
    parent_bu_id            = Column(UUID(as_uuid=True), ForeignKey("business_units.id"))  # For nested BUs

    code                    = Column(String(20), nullable=False)
    name                    = Column(String(200), nullable=False)
    short_name              = Column(String(80))
    bu_type                 = Column(Enum(BUType), default=BUType.BUSINESS_UNIT)
    description             = Column(Text)

    # Leadership
    head_employee_id        = Column(UUID(as_uuid=True))
    head_name               = Column(String(200))   # Denormalized
    hrbp_employee_id        = Column(UUID(as_uuid=True))
    hrbp_name               = Column(String(200))

    # Finance
    cost_center_code        = Column(String(30))
    gl_account              = Column(String(30))
    profit_center_code      = Column(String(30))
    annual_budget_npr       = Column(Numeric(15,2), default=0)
    revenue_contribution_pct= Column(Numeric(5,2))

    # Metrics
    current_headcount       = Column(Integer, default=0)
    budgeted_headcount      = Column(Integer, default=0)

    status                  = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ai_insights             = Column(JSONB, default=dict)

    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by              = Column(UUID(as_uuid=True))

    # Relationships
    company                 = relationship("Company",      back_populates="business_units")
    branch                  = relationship("Branch",       back_populates="business_units")
    parent_bu               = relationship("BusinessUnit", remote_side=[id], back_populates="child_bus")
    child_bus               = relationship("BusinessUnit", back_populates="parent_bu")
    departments             = relationship("Department",   back_populates="business_unit")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_bu_code_per_company"),
        Index("idx_bu_company", "company_id"),
        Index("idx_bu_branch",  "branch_id"),
        Index("idx_bu_type",    "bu_type"),
        Index("idx_bu_status",  "status"),
    )


# ── 6. Department ─────────────────────────────────────────────
class Department(Base):
    __tablename__ = "departments"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id          = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    business_unit_id    = Column(UUID(as_uuid=True), ForeignKey("business_units.id"))
    parent_dept_id      = Column(UUID(as_uuid=True), ForeignKey("departments.id"))

    code                = Column(String(20), nullable=False)
    name                = Column(String(200), nullable=False)
    short_name          = Column(String(80))
    dept_type           = Column(String(50))  # Technical, Support, Revenue, Corporate
    description         = Column(Text)
    icon                = Column(String(10))
    color_hex           = Column(String(10))

    # Leadership
    head_employee_id    = Column(UUID(as_uuid=True))
    head_name           = Column(String(200))
    hrbp_employee_id    = Column(UUID(as_uuid=True))
    hrbp_name           = Column(String(200))

    # Finance
    cost_center_code    = Column(String(30))
    annual_budget_npr   = Column(Numeric(15,2), default=0)

    # Work
    work_location_id    = Column(UUID(as_uuid=True))
    primary_work_mode   = Column(String(30), default="Office")

    # Metrics
    current_headcount   = Column(Integer, default=0)
    open_positions      = Column(Integer, default=0)

    status              = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ulrich_type         = Column(String(20))  # CoE, HRSS, HRBP
    ai_insights         = Column(JSONB, default=dict)

    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company             = relationship("Company",      back_populates=None)
    business_unit       = relationship("BusinessUnit", back_populates="departments")
    sections            = relationship("SectionUnit",  back_populates="department")
    parent_dept         = relationship("Department",   remote_side=[id])

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_dept_code_per_company"),
        Index("idx_dept_bu",      "business_unit_id"),
        Index("idx_dept_company", "company_id"),
    )


# ── 7. Section / Unit ─────────────────────────────────────────
class SectionUnit(Base):
    __tablename__ = "sections"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id          = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    department_id       = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)

    code                = Column(String(20), nullable=False)
    name                = Column(String(200), nullable=False)
    short_name          = Column(String(80))
    section_type        = Column(String(50))
    description         = Column(Text)
    ulrich_type         = Column(String(20))  # CoE, HRSS, HRBP
    head_employee_id    = Column(UUID(as_uuid=True))
    head_name           = Column(String(200))
    current_headcount   = Column(Integer, default=0)
    status              = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ai_insights         = Column(JSONB, default=dict)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    department          = relationship("Department", back_populates="sections")
    teams               = relationship("Team", back_populates="section")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_section_code_per_company"),
        Index("idx_section_dept", "department_id"),
    )


# ── 8. Team ───────────────────────────────────────────────────
class Team(Base):
    __tablename__ = "teams"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id              = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    section_id              = Column(UUID(as_uuid=True), ForeignKey("sections.id"))
    department_id           = Column(UUID(as_uuid=True), ForeignKey("departments.id"))

    code                    = Column(String(20), nullable=False)
    name                    = Column(String(200), nullable=False)
    short_name              = Column(String(80))
    team_type               = Column(String(50), default="Permanent")
    work_mode               = Column(String(50), default="Office")
    sprint_cycle            = Column(String(30), default="Monthly")
    max_members             = Column(Integer, default=10)
    current_members         = Column(Integer, default=0)

    lead_employee_id        = Column(UUID(as_uuid=True))
    lead_name               = Column(String(200))
    deputy_lead_employee_id = Column(UUID(as_uuid=True))
    deputy_lead_name        = Column(String(200))

    tools_csv               = Column(Text)   # Jira, GitHub, Figma
    slack_channel           = Column(String(100))

    # Nepal Labour Act 2074 compliance flags
    cba_eligible            = Column(Boolean, default=False)    # >= 10 members
    safety_committee_required = Column(Boolean, default=False)  # >= 20 members
    cba_note                = Column(Text)

    status                  = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ai_insights             = Column(JSONB, default=dict)
    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    section                 = relationship("SectionUnit", back_populates="teams")

    __table_args__ = (
        Index("idx_team_section",    "section_id"),
        Index("idx_team_dept",       "department_id"),
        Index("idx_team_company",    "company_id"),
        CheckConstraint("max_members >= 1", name="ck_team_max_members"),
    )


# ── 9. Cost Center ────────────────────────────────────────────
class CostCenter(Base):
    __tablename__ = "cost_centers"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id          = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    code                = Column(String(30), nullable=False)
    name                = Column(String(200), nullable=False)
    short_name          = Column(String(80))
    cc_type             = Column(String(50))   # Department, Branch, Project, Corporate
    description         = Column(Text)

    # Finance
    gl_account          = Column(String(30))
    erp_code            = Column(String(30))
    profit_center_code  = Column(String(30))
    annual_budget_npr   = Column(Numeric(15,2), default=0)
    ytd_spend_npr       = Column(Numeric(15,2), default=0)

    # Ownership
    owner_employee_id   = Column(UUID(as_uuid=True))
    owner_name          = Column(String(200))
    approver_employee_id= Column(UUID(as_uuid=True))
    approver_name       = Column(String(200))
    linked_dept_id      = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    linked_branch_id    = Column(UUID(as_uuid=True), ForeignKey("branches.id"))

    status              = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ai_budget_forecast  = Column(JSONB, default=dict)
    ai_anomaly_flags    = Column(JSONB, default=list)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_cc_code_per_company"),
        Index("idx_cc_company", "company_id"),
        CheckConstraint("annual_budget_npr >= 0", name="ck_cc_budget_positive"),
    )


# ── 10. Work Location ─────────────────────────────────────────
class WorkLocation(Base):
    __tablename__ = "work_locations"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id          = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    branch_id           = Column(UUID(as_uuid=True), ForeignKey("branches.id"))

    code                = Column(String(20), nullable=False)
    name                = Column(String(200), nullable=False)
    short_name          = Column(String(80))
    location_type       = Column(String(50))   # Primary Office, Branch, Remote, International, Field

    # Address
    country             = Column(String(60), default="Nepal")
    province            = Column(String(80))
    district            = Column(String(80))
    full_address        = Column(Text)
    latitude            = Column(Numeric(10,7))
    longitude           = Column(Numeric(10,7))

    # Operations
    work_policy         = Column(String(50))    # Office-First, Remote-First, Hybrid
    shift_start         = Column(String(10))    # HH:MM
    shift_end           = Column(String(10))
    shift_type          = Column(String(50))    # Day, Night, Flexible

    # Capacity
    capacity            = Column(Integer, default=0)
    current_headcount   = Column(Integer, default=0)

    # Compliance
    labour_office_zone  = Column(String(200))
    attendance_device   = Column(String(100))
    amenities           = Column(ARRAY(String), default=[])

    status              = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ai_occupancy_score  = Column(Float, default=0.0)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    branch              = relationship("Branch", back_populates="work_locations")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_wl_code_per_company"),
        Index("idx_wl_company", "company_id"),
        Index("idx_wl_branch",  "branch_id"),
    )
