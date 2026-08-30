"""
eLogix HRMS — Organization Management Models
Covers ALL modules from the Excel requirement:
  Group Company | Company Profile | Company Setup | Branch & Location |
  Business Unit | Department | Section & Unit | Team | Cost Center | Work Location
Nepal Labour Act 2074 compliant. AI-driven, production-grade SQLAlchemy ORM.
"""

from __future__      import annotations
from datetime        import datetime, date
from typing          import Optional, List
from sqlalchemy      import (Column, String, Boolean, Integer, Float, Text,
                             Date, DateTime, ForeignKey, Enum, JSON, DECIMAL,
                             Index, CheckConstraint, UniqueConstraint, event)
from sqlalchemy.orm  import relationship, validates, DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import uuid
import enum

# ──────────────────────────────────────────────────────────────────────────────
# Base
# ──────────────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass

def gen_uuid():
    return str(uuid.uuid4())

def now():
    return datetime.utcnow()

# ──────────────────────────────────────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────────────────────────────────────
class CompanyStatusEnum(str, enum.Enum):
    active   = "active"
    inactive = "inactive"
    pending  = "pending"
    suspended= "suspended"

class RegistrationTypeEnum(str, enum.Enum):
    private_limited = "private_limited"
    public_limited  = "public_limited"
    partnership     = "partnership"
    proprietorship  = "proprietorship"
    ngo             = "ngo"
    ingo            = "ingo"
    cooperative     = "cooperative"
    government      = "government"

class BranchTypeEnum(str, enum.Enum):
    headquarters  = "headquarters"
    regional      = "regional"
    branch        = "branch"
    liaison       = "liaison"
    project_office= "project_office"
    warehouse     = "warehouse"

class DeptModelEnum(str, enum.Enum):
    # Ulrich HR model types
    strategic_hrbp   = "strategic_hrbp"
    shared_services  = "shared_services"
    center_of_excellence = "center_of_excellence"
    line_management  = "line_management"
    functional       = "functional"

class TeamTypeEnum(str, enum.Enum):
    cross_functional = "cross_functional"
    project          = "project"
    functional       = "functional"
    self_managed     = "self_managed"
    virtual          = "virtual"
    committee        = "committee"

class CostCenterTypeEnum(str, enum.Enum):
    profit_center  = "profit_center"
    cost_center    = "cost_center"
    investment_center = "investment_center"
    service_center = "service_center"

class WorkLocationTypeEnum(str, enum.Enum):
    office    = "office"
    remote    = "remote"
    hybrid    = "hybrid"
    site      = "site"
    warehouse = "warehouse"
    factory   = "factory"

# ──────────────────────────────────────────────────────────────────────────────
# Mixin: Timestamps + Soft Delete + Audit
# ──────────────────────────────────────────────────────────────────────────────
class AuditMixin:
    created_at   = Column(DateTime, default=now, nullable=False)
    updated_at   = Column(DateTime, default=now, onupdate=now, nullable=False)
    created_by   = Column(UUID(as_uuid=False), nullable=True)
    updated_by   = Column(UUID(as_uuid=False), nullable=True)
    is_deleted   = Column(Boolean, default=False, nullable=False)
    deleted_at   = Column(DateTime, nullable=True)
    deleted_by   = Column(UUID(as_uuid=False), nullable=True)
    ai_metadata  = Column(JSONB, default=dict)   # AI insights, risk flags, suggestions

# ──────────────────────────────────────────────────────────────────────────────
# 1. GROUP COMPANY
# ──────────────────────────────────────────────────────────────────────────────
class GroupCompany(AuditMixin, Base):
    """
    Holding / parent group. Multi-tenant root.
    One GroupCompany can have multiple Companies (subsidiaries).
    """
    __tablename__ = "group_companies"

    id               = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name             = Column(String(200), nullable=False)
    name_nepali      = Column(String(200))
    short_name       = Column(String(50))
    registration_no  = Column(String(100), unique=True)
    pan_no           = Column(String(20))
    vat_no           = Column(String(20))
    established_year = Column(Integer)
    headquarters_country = Column(String(100), default="Nepal")
    headquarters_address = Column(Text)
    group_type       = Column(String(50))              # conglomerate, holding, etc.
    industry_sectors = Column(ARRAY(String))
    total_subsidiaries = Column(Integer, default=0)
    total_employees  = Column(Integer, default=0)
    website          = Column(String(255))
    logo_url         = Column(String(500))
    status           = Column(Enum(CompanyStatusEnum), default=CompanyStatusEnum.active)
    ai_group_insights = Column(JSONB, default=dict)   # AI: consolidation risk, compliance overview
    sap_group_code   = Column(String(50))             # SAP integration
    erp_sync_at      = Column(DateTime)

    # Relationships
    companies   = relationship("Company", back_populates="group", lazy="dynamic")

    __table_args__ = (
        Index("idx_group_name", "name"),
        Index("idx_group_status", "status"),
        Index("idx_group_deleted", "is_deleted"),
    )

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "name_nepali": self.name_nepali,
            "short_name": self.short_name, "registration_no": self.registration_no,
            "pan_no": self.pan_no, "vat_no": self.vat_no,
            "established_year": self.established_year,
            "headquarters_address": self.headquarters_address,
            "industry_sectors": self.industry_sectors or [],
            "total_subsidiaries": self.total_subsidiaries,
            "total_employees": self.total_employees,
            "status": self.status.value if self.status else None,
            "ai_group_insights": self.ai_group_insights or {},
            "created_at": str(self.created_at),
        }

# ──────────────────────────────────────────────────────────────────────────────
# 2. COMPANY PROFILE + COMPANY SETUP
# ──────────────────────────────────────────────────────────────────────────────
class Company(AuditMixin, Base):
    """
    Core company entity. Covers both Company Profile (public info)
    and Company Setup (configuration, wizard steps).
    Nepal Labour Act 2074 registration fields included.
    """
    __tablename__ = "companies"

    id                  = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    group_id            = Column(UUID(as_uuid=False), ForeignKey("group_companies.id"), nullable=True)

    # --- Profile ---
    name                = Column(String(200), nullable=False)
    name_nepali         = Column(String(200))
    short_name          = Column(String(50))
    tagline             = Column(String(500))
    registration_type   = Column(Enum(RegistrationTypeEnum))
    registration_no     = Column(String(100), unique=True)
    registration_date   = Column(Date)
    pan_no              = Column(String(20), unique=True)
    vat_registered      = Column(Boolean, default=False)
    vat_no              = Column(String(20))
    industry            = Column(String(100))
    sub_industry        = Column(String(100))
    established_year    = Column(Integer)
    fiscal_year_type    = Column(String(20), default="BS")  # BS (Nepali) or AD
    fiscal_year_start   = Column(String(10), default="04-01") # month-day Shrawan
    employee_count_band = Column(String(30))               # <10,10-50,50-200,200+
    website             = Column(String(255))
    logo_url            = Column(String(500))
    favicon_url         = Column(String(500))
    company_color       = Column(String(7), default="#1e40af")
    status              = Column(Enum(CompanyStatusEnum), default=CompanyStatusEnum.active)

    # --- Address ---
    province            = Column(String(100))
    district            = Column(String(100))
    municipality        = Column(String(100))
    ward_no             = Column(String(10))
    street              = Column(String(255))
    postal_code         = Column(String(20))
    country             = Column(String(100), default="Nepal")
    latitude            = Column(Float)
    longitude           = Column(Float)

    # --- Contacts ---
    phone               = Column(String(50))
    fax                 = Column(String(50))
    email               = Column(String(255))
    hr_contact_email    = Column(String(255))

    # --- Nepal Statutory Compliance (Company Setup) ---
    labour_office_zone  = Column(String(100))          # zonal labour office
    ssf_employer_no     = Column(String(50))           # Social Security Fund
    pf_employer_no      = Column(String(50))           # Provident Fund
    cit_registration    = Column(String(50))           # Citizens Investment Trust
    labour_act_compliance_level = Column(String(20), default="full")
    moles_registered    = Column(Boolean, default=False) # Ministry of Labour
    factory_act_applicable = Column(Boolean, default=False)
    trade_union_registered = Column(Boolean, default=False)
    collective_bargaining_active = Column(Boolean, default=False)
    min_wage_applicable = Column(DECIMAL(12,2), default=15000)  # Nepal min wage NPR

    # --- Setup Wizard Progress ---
    setup_step          = Column(Integer, default=1)   # 1-5 wizard steps
    setup_completed     = Column(Boolean, default=False)
    setup_completed_at  = Column(DateTime)
    onboarding_checklist = Column(JSONB, default=dict)

    # --- AI Driven ---
    ai_risk_score       = Column(Float)               # 0-100 compliance risk
    ai_insights         = Column(JSONB, default=dict)
    ai_benchmarks       = Column(JSONB, default=dict) # vs industry peers

    # --- ERP Integration ---
    sap_company_code    = Column(String(20))
    oracle_org_id       = Column(String(50))
    erp_sync_enabled    = Column(Boolean, default=False)
    erp_last_sync       = Column(DateTime)

    # Relationships
    group               = relationship("GroupCompany", back_populates="companies")
    legal_documents     = relationship("CompanyLegalDocument", back_populates="company", cascade="all, delete-orphan")
    branches            = relationship("Branch", back_populates="company", lazy="dynamic")
    business_units      = relationship("BusinessUnit", back_populates="company", lazy="dynamic")
    departments         = relationship("Department", back_populates="company", lazy="dynamic")
    cost_centers        = relationship("CostCenter", back_populates="company", lazy="dynamic")

    __table_args__ = (
        Index("idx_company_name",     "name"),
        Index("idx_company_status",   "status"),
        Index("idx_company_group",    "group_id"),
        Index("idx_company_pan",      "pan_no"),
        Index("idx_company_deleted",  "is_deleted"),
    )

    def to_dict(self):
        return {
            "id": self.id, "group_id": self.group_id,
            "name": self.name, "name_nepali": self.name_nepali,
            "short_name": self.short_name,
            "registration_type": self.registration_type.value if self.registration_type else None,
            "registration_no": self.registration_no, "pan_no": self.pan_no,
            "vat_registered": self.vat_registered, "vat_no": self.vat_no,
            "industry": self.industry, "established_year": self.established_year,
            "fiscal_year_type": self.fiscal_year_type,
            "province": self.province, "district": self.district,
            "municipality": self.municipality, "country": self.country,
            "phone": self.phone, "email": self.email,
            "ssf_employer_no": self.ssf_employer_no,
            "pf_employer_no": self.pf_employer_no,
            "labour_office_zone": self.labour_office_zone,
            "min_wage_applicable": str(self.min_wage_applicable),
            "collective_bargaining_active": self.collective_bargaining_active,
            "setup_step": self.setup_step, "setup_completed": self.setup_completed,
            "status": self.status.value if self.status else None,
            "ai_risk_score": self.ai_risk_score,
            "ai_insights": self.ai_insights or {},
            "created_at": str(self.created_at),
        }

class CompanyLegalDocument(AuditMixin, Base):
    """
    Stores all compliance documents: PAN cert, VAT cert, Labour permit,
    SSF cert, Factory act cert, Trade union cert, etc.
    """
    __tablename__ = "company_legal_documents"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    doc_type        = Column(String(100), nullable=False)
    doc_name        = Column(String(200), nullable=False)
    doc_number      = Column(String(100))
    issue_date      = Column(Date)
    expiry_date     = Column(Date)
    issuing_authority = Column(String(200))
    file_url        = Column(String(500))
    is_mandatory    = Column(Boolean, default=True)
    renewal_alert_days = Column(Integer, default=90)
    status          = Column(String(20), default="valid")  # valid/expired/pending
    ai_expiry_risk  = Column(String(20))                   # high/medium/low
    notes           = Column(Text)

    company = relationship("Company", back_populates="legal_documents")

    __table_args__ = (
        Index("idx_doc_company",  "company_id"),
        Index("idx_doc_expiry",   "expiry_date"),
        Index("idx_doc_type",     "doc_type"),
    )

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "doc_type": self.doc_type, "doc_name": self.doc_name,
            "doc_number": self.doc_number,
            "issue_date": str(self.issue_date) if self.issue_date else None,
            "expiry_date": str(self.expiry_date) if self.expiry_date else None,
            "issuing_authority": self.issuing_authority,
            "is_mandatory": self.is_mandatory,
            "renewal_alert_days": self.renewal_alert_days,
            "status": self.status, "ai_expiry_risk": self.ai_expiry_risk,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 3. BRANCH & LOCATION SETUP
# ──────────────────────────────────────────────────────────────────────────────
class Branch(AuditMixin, Base):
    """
    Physical branches/offices of a company.
    Each branch reports to its own Labour Office zone per Nepal law.
    """
    __tablename__ = "branches"

    id                = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id        = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    parent_branch_id  = Column(UUID(as_uuid=False), ForeignKey("branches.id"), nullable=True)

    code              = Column(String(20), nullable=False)
    name              = Column(String(200), nullable=False)
    name_nepali       = Column(String(200))
    branch_type       = Column(Enum(BranchTypeEnum), default=BranchTypeEnum.branch)
    is_headquarters   = Column(Boolean, default=False)

    # Location
    province          = Column(String(100))
    district          = Column(String(100))
    municipality      = Column(String(100))
    ward_no           = Column(String(10))
    street_address    = Column(Text)
    postal_code       = Column(String(20))
    latitude          = Column(Float)
    longitude         = Column(Float)
    google_maps_url   = Column(String(500))

    # Nepal Labour Act 2074
    labour_office_zone = Column(String(100))
    labour_office_address = Column(Text)
    local_registration_no = Column(String(100))
    local_pan_no      = Column(String(20))

    # Operations
    phone             = Column(String(50))
    email             = Column(String(255))
    manager_id        = Column(UUID(as_uuid=False))
    employee_count    = Column(Integer, default=0)
    floor_area_sqft   = Column(Float)
    capacity          = Column(Integer)                # max occupancy
    established_date  = Column(Date)
    status            = Column(String(20), default="active")

    # AI
    ai_branch_insights = Column(JSONB, default=dict)

    company         = relationship("Company", back_populates="branches")
    parent_branch   = relationship("Branch", remote_side="Branch.id")
    work_locations  = relationship("WorkLocation", back_populates="branch", lazy="dynamic")
    departments     = relationship("Department", back_populates="branch", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_branch_code"),
        Index("idx_branch_company",  "company_id"),
        Index("idx_branch_type",     "branch_type"),
        Index("idx_branch_province", "province"),
    )

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "branch_type": self.branch_type.value if self.branch_type else None,
            "is_headquarters": self.is_headquarters,
            "province": self.province, "district": self.district,
            "municipality": self.municipality, "latitude": self.latitude,
            "longitude": self.longitude, "phone": self.phone, "email": self.email,
            "labour_office_zone": self.labour_office_zone,
            "employee_count": self.employee_count,
            "status": self.status, "established_date": str(self.established_date) if self.established_date else None,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 4. BUSINESS UNIT / DIVISION SETUP
# ──────────────────────────────────────────────────────────────────────────────
class BusinessUnit(AuditMixin, Base):
    """
    Business Unit / Division. Strategic grouping above departments.
    Can represent P&L units, product lines, geographic divisions.
    """
    __tablename__ = "business_units"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    parent_bu_id    = Column(UUID(as_uuid=False), ForeignKey("business_units.id"), nullable=True)

    code            = Column(String(20), nullable=False)
    name            = Column(String(200), nullable=False)
    name_nepali     = Column(String(200))
    description     = Column(Text)
    bu_type         = Column(String(50))               # division/product_line/geographic
    is_profit_center= Column(Boolean, default=False)
    revenue_target  = Column(DECIMAL(18,2))
    budget_allocated= Column(DECIMAL(18,2))
    budget_utilized = Column(DECIMAL(18,2), default=0)
    headcount_target= Column(Integer)
    headcount_actual= Column(Integer, default=0)
    manager_id      = Column(UUID(as_uuid=False))
    established_date= Column(Date)
    status          = Column(String(20), default="active")

    # AI Strategic
    ai_bu_score     = Column(Float)                    # AI efficiency score
    ai_insights     = Column(JSONB, default=dict)

    company      = relationship("Company", back_populates="business_units")
    parent_bu    = relationship("BusinessUnit", remote_side="BusinessUnit.id")
    departments  = relationship("Department", back_populates="business_unit", lazy="dynamic")
    cost_centers = relationship("CostCenter", back_populates="business_unit", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_bu_code"),
        Index("idx_bu_company", "company_id"),
        Index("idx_bu_parent",  "parent_bu_id"),
    )

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "parent_bu_id": self.parent_bu_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "bu_type": self.bu_type, "is_profit_center": self.is_profit_center,
            "revenue_target": str(self.revenue_target) if self.revenue_target else None,
            "budget_allocated": str(self.budget_allocated) if self.budget_allocated else None,
            "headcount_target": self.headcount_target,
            "headcount_actual": self.headcount_actual, "status": self.status,
            "ai_bu_score": self.ai_bu_score, "ai_insights": self.ai_insights or {},
        }

# ──────────────────────────────────────────────────────────────────────────────
# 5. DEPARTMENT SETUP
# ──────────────────────────────────────────────────────────────────────────────
class Department(AuditMixin, Base):
    """
    Department — Ulrich HR model aware.
    Nepal Labour Act: CBA applies if >= 10 workers (team level).
    """
    __tablename__ = "departments"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    business_unit_id= Column(UUID(as_uuid=False), ForeignKey("business_units.id"), nullable=True)
    branch_id       = Column(UUID(as_uuid=False), ForeignKey("branches.id"), nullable=True)
    parent_dept_id  = Column(UUID(as_uuid=False), ForeignKey("departments.id"), nullable=True)

    code            = Column(String(20), nullable=False)
    name            = Column(String(200), nullable=False)
    name_nepali     = Column(String(200))
    description     = Column(Text)
    function_type   = Column(String(50))               # core/support/strategic
    ulrich_model    = Column(Enum(DeptModelEnum))
    headcount_actual= Column(Integer, default=0)
    headcount_target= Column(Integer)
    annual_budget   = Column(DECIMAL(18,2))
    budget_utilized = Column(DECIMAL(18,2), default=0)
    manager_id      = Column(UUID(as_uuid=False))
    cost_center_id  = Column(UUID(as_uuid=False), ForeignKey("cost_centers.id"), nullable=True)
    established_date= Column(Date)
    status          = Column(String(20), default="active")
    floor_plan_info = Column(Text)
    process_flow_url= Column(String(500))

    # Nepal Labour Act 2074
    is_core_function= Column(Boolean, default=True)    # outsource not allowed for core
    has_union_rep   = Column(Boolean, default=False)
    cba_applicable  = Column(Boolean, default=False)   # auto if headcount >= 10

    # AI
    ai_dept_health  = Column(Float)                    # 0-100
    ai_attrition_risk = Column(String(20))
    ai_insights     = Column(JSONB, default=dict)

    company      = relationship("Company", back_populates="departments")
    business_unit= relationship("BusinessUnit", back_populates="departments")
    branch       = relationship("Branch", back_populates="departments")
    parent_dept  = relationship("Department", remote_side="Department.id")
    sections     = relationship("Section", back_populates="department", lazy="dynamic")
    teams        = relationship("Team", back_populates="department", lazy="dynamic")
    cost_center  = relationship("CostCenter", foreign_keys=[cost_center_id])

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_dept_code"),
        Index("idx_dept_company", "company_id"),
        Index("idx_dept_bu",      "business_unit_id"),
        Index("idx_dept_branch",  "branch_id"),
        Index("idx_dept_parent",  "parent_dept_id"),
        CheckConstraint("headcount_actual >= 0", name="ck_dept_headcount"),
    )

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "business_unit_id": self.business_unit_id, "branch_id": self.branch_id,
            "parent_dept_id": self.parent_dept_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "function_type": self.function_type,
            "ulrich_model": self.ulrich_model.value if self.ulrich_model else None,
            "headcount_actual": self.headcount_actual,
            "headcount_target": self.headcount_target,
            "annual_budget": str(self.annual_budget) if self.annual_budget else None,
            "is_core_function": self.is_core_function,
            "cba_applicable": self.cba_applicable,
            "status": self.status,
            "ai_dept_health": self.ai_dept_health,
            "ai_attrition_risk": self.ai_attrition_risk,
            "ai_insights": self.ai_insights or {},
        }

# ──────────────────────────────────────────────────────────────────────────────
# 6. SECTION & UNIT
# ──────────────────────────────────────────────────────────────────────────────
class Section(AuditMixin, Base):
    """
    Section within a Department. Further subdivided into Units if needed.
    Supports CoE / HRSS / HRBP model designations.
    """
    __tablename__ = "sections"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    department_id   = Column(UUID(as_uuid=False), ForeignKey("departments.id"), nullable=False)
    company_id      = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)

    code            = Column(String(20), nullable=False)
    name            = Column(String(200), nullable=False)
    name_nepali     = Column(String(200))
    description     = Column(Text)
    section_model   = Column(String(30))              # coe/hrss/hrbp/standard
    headcount_actual= Column(Integer, default=0)
    headcount_target= Column(Integer)
    manager_id      = Column(UUID(as_uuid=False))
    status          = Column(String(20), default="active")
    ai_insights     = Column(JSONB, default=dict)

    # Sub-units
    units           = relationship("Unit", back_populates="section", lazy="dynamic", cascade="all, delete-orphan")
    department      = relationship("Department", back_populates="sections")

    __table_args__ = (
        UniqueConstraint("department_id", "code", name="uq_section_code"),
        Index("idx_section_dept",    "department_id"),
        Index("idx_section_company", "company_id"),
    )

    def to_dict(self):
        return {
            "id": self.id, "department_id": self.department_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "section_model": self.section_model,
            "headcount_actual": self.headcount_actual,
            "headcount_target": self.headcount_target,
            "status": self.status, "ai_insights": self.ai_insights or {},
        }

class Unit(AuditMixin, Base):
    """
    Smallest organizational grouping within a Section.
    """
    __tablename__ = "units"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    section_id  = Column(UUID(as_uuid=False), ForeignKey("sections.id"), nullable=False)
    company_id  = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    code        = Column(String(20), nullable=False)
    name        = Column(String(200), nullable=False)
    name_nepali = Column(String(200))
    description = Column(Text)
    headcount_actual = Column(Integer, default=0)
    manager_id  = Column(UUID(as_uuid=False))
    status      = Column(String(20), default="active")

    section = relationship("Section", back_populates="units")

    __table_args__ = (
        UniqueConstraint("section_id", "code", name="uq_unit_code"),
        Index("idx_unit_section", "section_id"),
    )

    def to_dict(self):
        return {
            "id": self.id, "section_id": self.section_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "headcount_actual": self.headcount_actual, "status": self.status,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 7. TEAM SETUP
# ──────────────────────────────────────────────────────────────────────────────
class Team(AuditMixin, Base):
    """
    Team within a Department.
    Nepal Labour Act 2074:
      - CBA mandatory if team_size >= 10 (Section 108)
      - Safety Committee if >= 20 workers on premises (Section 155)
    """
    __tablename__ = "teams"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    department_id   = Column(UUID(as_uuid=False), ForeignKey("departments.id"), nullable=False)
    company_id      = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    section_id      = Column(UUID(as_uuid=False), ForeignKey("sections.id"), nullable=True)

    code            = Column(String(20), nullable=False)
    name            = Column(String(200), nullable=False)
    name_nepali     = Column(String(200))
    description     = Column(Text)
    team_type       = Column(Enum(TeamTypeEnum), default=TeamTypeEnum.functional)
    purpose         = Column(Text)
    objectives      = Column(JSONB, default=list)

    team_lead_id    = Column(UUID(as_uuid=False))
    member_count    = Column(Integer, default=0)
    max_size        = Column(Integer)

    # Nepal Labour Act 2074 auto-flags
    cba_required    = Column(Boolean, default=False)      # auto: member_count >= 10
    safety_committee_required = Column(Boolean, default=False)  # auto: >= 20
    is_managerial   = Column(Boolean, default=False)      # managerial excluded from CBA

    start_date      = Column(Date)
    end_date        = Column(Date)                        # null = permanent team
    status          = Column(String(20), default="active")
    project_code    = Column(String(50))
    ai_team_score   = Column(Float)
    ai_insights     = Column(JSONB, default=dict)

    department = relationship("Department", back_populates="teams")
    section    = relationship("Section")

    __table_args__ = (
        UniqueConstraint("department_id", "code", name="uq_team_code"),
        Index("idx_team_dept",    "department_id"),
        Index("idx_team_company", "company_id"),
        CheckConstraint("member_count >= 0", name="ck_team_members"),
    )

    def to_dict(self):
        return {
            "id": self.id, "department_id": self.department_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "team_type": self.team_type.value if self.team_type else None,
            "member_count": self.member_count, "max_size": self.max_size,
            "cba_required": self.cba_required,
            "safety_committee_required": self.safety_committee_required,
            "is_managerial": self.is_managerial,
            "start_date": str(self.start_date) if self.start_date else None,
            "end_date": str(self.end_date) if self.end_date else None,
            "status": self.status, "ai_team_score": self.ai_team_score,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 8. COST CENTER
# ──────────────────────────────────────────────────────────────────────────────
class CostCenter(AuditMixin, Base):
    """
    Financial cost center / profit center for budget tracking.
    Links to ERP (SAP / Oracle) for GL account mapping.
    """
    __tablename__ = "cost_centers"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    business_unit_id= Column(UUID(as_uuid=False), ForeignKey("business_units.id"), nullable=True)
    parent_cc_id    = Column(UUID(as_uuid=False), ForeignKey("cost_centers.id"), nullable=True)

    code            = Column(String(30), nullable=False)
    name            = Column(String(200), nullable=False)
    name_nepali     = Column(String(200))
    description     = Column(Text)
    cc_type         = Column(Enum(CostCenterTypeEnum), default=CostCenterTypeEnum.cost_center)

    # Budget
    fiscal_year     = Column(String(10), nullable=False)   # e.g. "2081-82" BS
    budget_annual   = Column(DECIMAL(18,2), default=0)
    budget_q1       = Column(DECIMAL(18,2), default=0)
    budget_q2       = Column(DECIMAL(18,2), default=0)
    budget_q3       = Column(DECIMAL(18,2), default=0)
    budget_q4       = Column(DECIMAL(18,2), default=0)
    actuals_ytd     = Column(DECIMAL(18,2), default=0)
    committed       = Column(DECIMAL(18,2), default=0)

    # GL Mapping
    gl_account_code = Column(String(50))
    sap_cost_center = Column(String(20))
    oracle_cc_code  = Column(String(50))

    manager_id      = Column(UUID(as_uuid=False))
    approver_id     = Column(UUID(as_uuid=False))
    currency        = Column(String(3), default="NPR")
    status          = Column(String(20), default="active")

    # AI Budget Intelligence
    ai_budget_forecast = Column(JSONB, default=dict)
    ai_overspend_risk  = Column(String(20))
    ai_utilization_score = Column(Float)

    company      = relationship("Company", back_populates="cost_centers", foreign_keys=[company_id])
    business_unit= relationship("BusinessUnit", back_populates="cost_centers")
    parent_cc    = relationship("CostCenter", remote_side="CostCenter.id")
    departments  = relationship("Department", back_populates="cost_center", foreign_keys="Department.cost_center_id")

    __table_args__ = (
        UniqueConstraint("company_id", "code", "fiscal_year", name="uq_cc_code_year"),
        Index("idx_cc_company",      "company_id"),
        Index("idx_cc_bu",           "business_unit_id"),
        Index("idx_cc_fiscal_year",  "fiscal_year"),
    )

    @property
    def utilization_pct(self):
        if self.budget_annual and self.budget_annual > 0:
            return round(float(self.actuals_ytd or 0) / float(self.budget_annual) * 100, 1)
        return 0.0

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "cc_type": self.cc_type.value if self.cc_type else None,
            "fiscal_year": self.fiscal_year,
            "budget_annual": str(self.budget_annual),
            "actuals_ytd": str(self.actuals_ytd),
            "utilization_pct": self.utilization_pct,
            "gl_account_code": self.gl_account_code,
            "sap_cost_center": self.sap_cost_center,
            "status": self.status,
            "ai_overspend_risk": self.ai_overspend_risk,
            "ai_utilization_score": self.ai_utilization_score,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 9. WORK LOCATION
# ──────────────────────────────────────────────────────────────────────────────
class WorkLocation(AuditMixin, Base):
    """
    Physical or virtual work locations within a branch.
    Floor-level tracking. Shift and labour zone aware.
    """
    __tablename__ = "work_locations"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), ForeignKey("companies.id"), nullable=False)
    branch_id       = Column(UUID(as_uuid=False), ForeignKey("branches.id"), nullable=False)

    code            = Column(String(20), nullable=False)
    name            = Column(String(200), nullable=False)
    name_nepali     = Column(String(200))
    location_type   = Column(Enum(WorkLocationTypeEnum), default=WorkLocationTypeEnum.office)
    floor           = Column(String(20))
    wing            = Column(String(50))
    area_sqft       = Column(Float)
    max_capacity    = Column(Integer)
    current_occupancy = Column(Integer, default=0)

    # Facilities
    has_canteen     = Column(Boolean, default=False)
    has_crèche      = Column(Boolean, default=False)    # Nepal Labour Act 2074 Section 116
    has_first_aid   = Column(Boolean, default=False)
    has_fire_exit   = Column(Boolean, default=False)
    safety_cert_expiry = Column(Date)

    # Shift & Labour
    default_shift_id = Column(UUID(as_uuid=False))
    labour_zone      = Column(String(100))
    is_remote        = Column(Boolean, default=False)
    remote_allowance_eligible = Column(Boolean, default=False)

    # Access Control
    access_card_required = Column(Boolean, default=False)
    biometric_enabled    = Column(Boolean, default=False)
    cctv_enabled         = Column(Boolean, default=False)

    status          = Column(String(20), default="active")
    ai_insights     = Column(JSONB, default=dict)

    branch = relationship("Branch", back_populates="work_locations")

    __table_args__ = (
        UniqueConstraint("branch_id", "code", name="uq_wl_code"),
        Index("idx_wl_branch",  "branch_id"),
        Index("idx_wl_company", "company_id"),
        CheckConstraint("current_occupancy >= 0", name="ck_wl_occupancy"),
    )

    @property
    def occupancy_pct(self):
        if self.max_capacity and self.max_capacity > 0:
            return round((self.current_occupancy or 0) / self.max_capacity * 100, 1)
        return 0.0

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id, "branch_id": self.branch_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "location_type": self.location_type.value if self.location_type else None,
            "floor": self.floor, "wing": self.wing, "area_sqft": self.area_sqft,
            "max_capacity": self.max_capacity, "current_occupancy": self.current_occupancy,
            "occupancy_pct": self.occupancy_pct,
            "has_canteen": self.has_canteen, "has_crèche": self.has_crèche,
            "has_first_aid": self.has_first_aid, "has_fire_exit": self.has_fire_exit,
            "safety_cert_expiry": str(self.safety_cert_expiry) if self.safety_cert_expiry else None,
            "biometric_enabled": self.biometric_enabled,
            "is_remote": self.is_remote, "status": self.status,
        }

# ──────────────────────────────────────────────────────────────────────────────
# SQLAlchemy Events: Auto-compute Nepal Labour Law flags
# ──────────────────────────────────────────────────────────────────────────────
@event.listens_for(Team, "before_insert")
@event.listens_for(Team, "before_update")
def auto_flag_team_nepal_law(mapper, connection, target):
    """Auto-set CBA and Safety Committee flags per Nepal Labour Act 2074."""
    if target.member_count is not None:
        target.cba_required = target.member_count >= 10 and not target.is_managerial
        target.safety_committee_required = target.member_count >= 20

@event.listens_for(Department, "before_insert")
@event.listens_for(Department, "before_update")
def auto_flag_dept_cba(mapper, connection, target):
    """Auto-set CBA flag if headcount >= 10."""
    if target.headcount_actual is not None:
        target.cba_applicable = target.headcount_actual >= 10
