# ============================================================
# FILE: backend/models/org_structure_models.py
# PURPOSE: SQLAlchemy ORM models for Organization Management
#          Business Unit, Department, Section, Team,
#          Cost Center, Work Location
# STACK: Python 3.11 + SQLAlchemy 2.0 + PostgreSQL 15
# COMPLIANCE: Nepal Labour Act 2074, Global HR Best Practice
# ============================================================

import uuid
from datetime import datetime, timezone, date
from typing import Optional
from sqlalchemy import (
    Column, String, Boolean, Integer, Text, DateTime,
    ForeignKey, Numeric, Date, UniqueConstraint,
    CheckConstraint, ARRAY, event
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.ext.hybrid import hybrid_property


class Base(DeclarativeBase):
    pass


# ── Helper ────────────────────────────────────────────────────
def now_utc():
    return datetime.now(timezone.utc)


# ============================================================
# MODEL 1: BusinessUnit
# ============================================================
class BusinessUnit(Base):
    __tablename__ = "business_units"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)

    code                = Column(String(20),  nullable=False)
    name                = Column(String(150), nullable=False)
    short_name          = Column(String(50))
    description         = Column(Text)
    bu_type             = Column(String(30), default="division")

    parent_bu_id        = Column(UUID(as_uuid=True), ForeignKey("business_units.id"))
    hierarchy_level     = Column(Integer, default=1)

    gl_account_code     = Column(String(30))
    annual_budget       = Column(Numeric(18, 2))
    currency_code       = Column(String(5), default="NPR")
    fiscal_year_start   = Column(Integer, default=4)        # April = Nepal FY

    legal_entity_name   = Column(String(200))
    registration_number = Column(String(100))
    tax_number          = Column(String(50))
    country_code        = Column(String(5), default="NP")
    applicable_laws     = Column(JSONB)

    # Nepal Labour Act 2074 compliance
    requires_cba        = Column(Boolean, default=False)    # 10+ employees
    requires_lrc        = Column(Boolean, default=False)    # 10+ employees
    requires_safety_com = Column(Boolean, default=False)    # 20+ employees
    employee_count      = Column(Integer, default=0)

    is_active           = Column(Boolean, default=True)
    effective_from      = Column(Date)
    effective_to        = Column(Date)

    ai_summary          = Column(Text)
    ai_insights         = Column(JSONB)

    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc,
                                 onupdate=now_utc)

    # Relationships
    departments         = relationship("Department", back_populates="business_unit",
                                       foreign_keys="Department.business_unit_id")
    cost_centers        = relationship("CostCenter", back_populates="business_unit")
    work_locations      = relationship("WorkLocation", back_populates="business_unit")
    children_bus        = relationship("BusinessUnit",
                                       foreign_keys="BusinessUnit.parent_bu_id")

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_bu_tenant_code"),
        CheckConstraint(
            "bu_type IN ('division','region','product_line','legal_entity','subsidiary','holding')",
            name="ck_bu_type"
        ),
    )

    @hybrid_property
    def compliance_alerts(self) -> list:
        """Returns list of required committees based on employee count"""
        alerts = []
        if self.employee_count >= 10:
            if not self.requires_cba:
                alerts.append("Collective Bargaining Committee required (10+ employees)")
            if not self.requires_lrc:
                alerts.append("Labour Relations Committee required (10+ employees)")
        if self.employee_count >= 20 and not self.requires_safety_com:
            alerts.append("Safety & Health Committee required (20+ employees)")
        return alerts

    @hybrid_property
    def budget_utilization(self) -> float:
        """Calculate budget utilization across departments"""
        if not self.annual_budget or self.annual_budget == 0:
            return 0.0
        used = sum(
            (d.annual_budget or 0)
            for d in self.departments
            if d.is_active
        )
        return round(used * 100 / float(self.annual_budget), 1)

    def to_dict(self, include_children: bool = False) -> dict:
        data = {
            "id":                 str(self.id),
            "code":               self.code,
            "name":               self.name,
            "short_name":         self.short_name,
            "description":        self.description,
            "bu_type":            self.bu_type,
            "employee_count":     self.employee_count,
            "annual_budget":      float(self.annual_budget) if self.annual_budget else 0,
            "currency_code":      self.currency_code,
            "country_code":       self.country_code,
            "hierarchy_level":    self.hierarchy_level,
            "is_active":          self.is_active,
            "requires_cba":       self.requires_cba,
            "requires_lrc":       self.requires_lrc,
            "requires_safety_com":self.requires_safety_com,
            "compliance_alerts":  self.compliance_alerts,
            "ai_summary":         self.ai_summary,
            "ai_insights":        self.ai_insights,
            "created_at":         self.created_at.isoformat() if self.created_at else None,
        }
        if include_children:
            data["departments"] = [d.to_dict() for d in self.departments if d.is_active]
        return data


# ============================================================
# MODEL 2: Department
# ============================================================
class Department(Base):
    __tablename__ = "departments"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    business_unit_id    = Column(UUID(as_uuid=True),
                                  ForeignKey("business_units.id"), nullable=False)

    code                = Column(String(20),  nullable=False)
    name                = Column(String(150), nullable=False)
    short_name          = Column(String(50))
    description         = Column(Text)
    dept_type           = Column(String(30), default="functional")

    parent_dept_id      = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    hierarchy_level     = Column(Integer, default=2)

    dept_head_id        = Column(UUID(as_uuid=True))
    dept_head_name      = Column(String(150))
    deputy_head_id      = Column(UUID(as_uuid=True))

    annual_budget       = Column(Numeric(18, 2))
    headcount_budget    = Column(Integer)
    current_headcount   = Column(Integer, default=0)

    ulrich_pillar       = Column(String(20))               # hrbp | coe | hrss | general
    primary_kpis        = Column(JSONB)
    okr_cycle           = Column(String(10), default="quarterly")

    requires_committee  = Column(Boolean, default=False)
    committee_type      = Column(String(50))

    is_active           = Column(Boolean, default=True)
    is_billable         = Column(Boolean, default=True)
    effective_from      = Column(Date)
    effective_to        = Column(Date)
    ai_insights         = Column(JSONB)

    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc,
                                 onupdate=now_utc)

    # Relationships
    business_unit = relationship("BusinessUnit", back_populates="departments",
                                  foreign_keys=[business_unit_id])
    parent_dept   = relationship("Department", remote_side="Department.id",
                                  foreign_keys="Department.parent_dept_id")
    sections      = relationship("SectionUnit", back_populates="department")
    teams         = relationship("Team", back_populates="department")
    cost_centers  = relationship("CostCenter", back_populates="department")

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_dept_tenant_code"),
    )

    def to_dict(self, include_children: bool = False) -> dict:
        data = {
            "id":               str(self.id),
            "code":             self.code,
            "name":             self.name,
            "short_name":       self.short_name,
            "business_unit_id": str(self.business_unit_id),
            "bu_name":          self.business_unit.name if self.business_unit else None,
            "dept_type":        self.dept_type,
            "dept_head_name":   self.dept_head_name,
            "current_headcount":self.current_headcount,
            "headcount_budget": self.headcount_budget,
            "annual_budget":    float(self.annual_budget) if self.annual_budget else 0,
            "ulrich_pillar":    self.ulrich_pillar,
            "primary_kpis":     self.primary_kpis,
            "is_active":        self.is_active,
            "hierarchy_level":  self.hierarchy_level,
        }
        if include_children:
            data["sections"] = [s.to_dict() for s in self.sections if s.is_active]
            data["teams"]    = [t.to_dict() for t in self.teams if t.status == "active"]
        return data


# ============================================================
# MODEL 3: SectionUnit
# ============================================================
class SectionUnit(Base):
    __tablename__ = "sections_units"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    department_id       = Column(UUID(as_uuid=True),
                                  ForeignKey("departments.id"), nullable=False)

    code                = Column(String(20),  nullable=False)
    name                = Column(String(150), nullable=False)
    short_name          = Column(String(50))
    description         = Column(Text)
    entity_type         = Column(String(10), default="section")  # section|unit|sub_unit

    parent_section_id   = Column(UUID(as_uuid=True),
                                  ForeignKey("sections_units.id"))
    hierarchy_level     = Column(Integer, default=3)

    section_head_id     = Column(UUID(as_uuid=True))
    section_head_name   = Column(String(150))
    specialization      = Column(String(200))
    swim_lane_color     = Column(String(7))                      # hex color

    primary_kpis        = Column(JSONB)
    current_headcount   = Column(Integer, default=0)

    is_active           = Column(Boolean, default=True)
    effective_from      = Column(Date)
    effective_to        = Column(Date)

    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc,
                                 onupdate=now_utc)

    department    = relationship("Department", back_populates="sections")
    parent_section= relationship("SectionUnit", remote_side="SectionUnit.id",
                                  foreign_keys="SectionUnit.parent_section_id")

    def to_dict(self) -> dict:
        return {
            "id":               str(self.id),
            "code":             self.code,
            "name":             self.name,
            "entity_type":      self.entity_type,
            "department_id":    str(self.department_id),
            "dept_name":        self.department.name if self.department else None,
            "section_head_name":self.section_head_name,
            "specialization":   self.specialization,
            "swim_lane_color":  self.swim_lane_color,
            "current_headcount":self.current_headcount,
            "is_active":        self.is_active,
        }


# ============================================================
# MODEL 4: Team
# ============================================================
class Team(Base):
    __tablename__ = "teams"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    department_id       = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    section_id          = Column(UUID(as_uuid=True), ForeignKey("sections_units.id"))

    code                = Column(String(20),  nullable=False)
    name                = Column(String(150), nullable=False)
    short_name          = Column(String(50))
    description         = Column(Text)
    team_type           = Column(String(30), default="functional")

    is_permanent        = Column(Boolean, default=True)
    is_cross_functional = Column(Boolean, default=False)
    allows_matrix_report= Column(Boolean, default=False)

    team_lead_id        = Column(UUID(as_uuid=True))
    team_lead_name      = Column(String(150))
    functional_mgr_id   = Column(UUID(as_uuid=True))
    project_mgr_id      = Column(UUID(as_uuid=True))

    max_headcount       = Column(Integer)
    current_headcount   = Column(Integer, default=0)
    target_headcount    = Column(Integer)

    project_id          = Column(UUID(as_uuid=True))
    sprint_velocity     = Column(Integer)
    agile_methodology   = Column(String(20))

    start_date          = Column(Date)
    end_date            = Column(Date)
    status              = Column(String(20), default="active")

    team_color          = Column(String(7))
    team_icon           = Column(String(50))

    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc,
                                 onupdate=now_utc)

    department  = relationship("Department", back_populates="teams")
    members     = relationship("TeamMember", back_populates="team")

    def to_dict(self, include_members: bool = False) -> dict:
        data = {
            "id":                   str(self.id),
            "code":                 self.code,
            "name":                 self.name,
            "team_type":            self.team_type,
            "status":               self.status,
            "department_id":        str(self.department_id) if self.department_id else None,
            "dept_name":            self.department.name if self.department else None,
            "team_lead_name":       self.team_lead_name,
            "current_headcount":    self.current_headcount,
            "max_headcount":        self.max_headcount,
            "is_cross_functional":  self.is_cross_functional,
            "allows_matrix_report": self.allows_matrix_report,
            "agile_methodology":    self.agile_methodology,
            "sprint_velocity":      self.sprint_velocity,
            "team_color":           self.team_color,
            "team_icon":            self.team_icon,
        }
        if include_members:
            data["members"] = [m.to_dict() for m in self.members if m.is_active]
        return data


# ============================================================
# MODEL 5: TeamMember
# ============================================================
class TeamMember(Base):
    __tablename__ = "team_members"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    team_id         = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    employee_id     = Column(UUID(as_uuid=True), nullable=False)
    employee_name   = Column(String(150))
    role_in_team    = Column(String(50), default="member")
    is_primary_team = Column(Boolean, default=True)
    allocation_pct  = Column(Integer, default=100)
    joined_at       = Column(Date, default=date.today)
    left_at         = Column(Date)
    is_active       = Column(Boolean, default=True)
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), default=now_utc)

    team = relationship("Team", back_populates="members")

    def to_dict(self) -> dict:
        return {
            "id":             str(self.id),
            "team_id":        str(self.team_id),
            "employee_id":    str(self.employee_id),
            "employee_name":  self.employee_name,
            "role_in_team":   self.role_in_team,
            "is_primary_team":self.is_primary_team,
            "allocation_pct": self.allocation_pct,
            "joined_at":      self.joined_at.isoformat() if self.joined_at else None,
        }


# ============================================================
# MODEL 6: CostCenter
# ============================================================
class CostCenter(Base):
    __tablename__ = "cost_centers"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    business_unit_id    = Column(UUID(as_uuid=True), ForeignKey("business_units.id"))
    department_id       = Column(UUID(as_uuid=True), ForeignKey("departments.id"))

    code                = Column(String(30),  nullable=False)
    name                = Column(String(150), nullable=False)
    short_name          = Column(String(50))
    description         = Column(Text)
    cc_type             = Column(String(30), default="operational")

    gl_account_code     = Column(String(30))
    erp_cost_center_id  = Column(String(50))
    budget_code         = Column(String(30))

    annual_budget       = Column(Numeric(18, 2), default=0)
    ytd_actual          = Column(Numeric(18, 2), default=0)
    ytd_committed       = Column(Numeric(18, 2), default=0)
    currency_code       = Column(String(5), default="NPR")

    payroll_allocation  = Column(JSONB)
    benefits_allocation = Column(JSONB)

    approver_id         = Column(UUID(as_uuid=True))
    approver_name       = Column(String(150))
    approval_limit      = Column(Numeric(14, 2))

    is_active           = Column(Boolean, default=True)
    is_billable         = Column(Boolean, default=True)
    effective_from      = Column(Date)
    effective_to        = Column(Date)

    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc,
                                 onupdate=now_utc)

    business_unit = relationship("BusinessUnit", back_populates="cost_centers")
    department    = relationship("Department", back_populates="cost_centers")

    @hybrid_property
    def budget_variance(self) -> float:
        if not self.annual_budget:
            return 0.0
        return float(self.annual_budget) - float(self.ytd_actual or 0)

    @hybrid_property
    def utilization_pct(self) -> float:
        if not self.annual_budget or float(self.annual_budget) == 0:
            return 0.0
        return round(float(self.ytd_actual or 0) * 100 / float(self.annual_budget), 1)

    def to_dict(self) -> dict:
        return {
            "id":               str(self.id),
            "code":             self.code,
            "name":             self.name,
            "cc_type":          self.cc_type,
            "department_id":    str(self.department_id) if self.department_id else None,
            "dept_name":        self.department.name if self.department else None,
            "gl_account_code":  self.gl_account_code,
            "annual_budget":    float(self.annual_budget or 0),
            "ytd_actual":       float(self.ytd_actual or 0),
            "ytd_committed":    float(self.ytd_committed or 0),
            "budget_variance":  self.budget_variance,
            "utilization_pct":  self.utilization_pct,
            "currency_code":    self.currency_code,
            "approver_name":    self.approver_name,
            "approval_limit":   float(self.approval_limit) if self.approval_limit else None,
            "is_active":        self.is_active,
        }


# ============================================================
# MODEL 7: WorkLocation
# ============================================================
class WorkLocation(Base):
    __tablename__ = "work_locations"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    business_unit_id    = Column(UUID(as_uuid=True), ForeignKey("business_units.id"))

    code                = Column(String(20),  nullable=False)
    name                = Column(String(150), nullable=False)
    short_name          = Column(String(50))
    description         = Column(Text)
    location_type       = Column(String(30), default="office")

    address_line1       = Column(String(200))
    address_line2       = Column(String(200))
    city                = Column(String(100))
    state_province      = Column(String(100))
    postal_code         = Column(String(20))
    country_code        = Column(String(5), default="NP")
    country_name        = Column(String(100), default="Nepal")

    latitude            = Column(Numeric(10, 7))
    longitude           = Column(Numeric(10, 7))
    map_url             = Column(Text)

    # Nepal = Asia/Kathmandu UTC+5:45
    timezone            = Column(String(50), default="Asia/Kathmandu")
    utc_offset          = Column(String(10), default="+05:45")
    holiday_calendar_id = Column(UUID(as_uuid=True))
    working_days        = Column(ARRAY(String), default=["Mon","Tue","Wed","Thu","Fri"])
    standard_hours      = Column(Numeric(4, 1), default=8.0)

    # Compliance trigger fields
    applicable_laws     = Column(JSONB)
    tax_jurisdiction    = Column(String(100))
    tax_code            = Column(String(50))
    payroll_rule_set    = Column(String(50))
    local_minimum_wage  = Column(Numeric(10, 2))
    minimum_wage_currency= Column(String(5), default="NPR")

    labour_office_zone  = Column(String(100))
    labour_office_code  = Column(String(20))

    supports_remote     = Column(Boolean, default=False)
    supports_hybrid     = Column(Boolean, default=False)
    max_capacity        = Column(Integer)
    current_headcount   = Column(Integer, default=0)

    has_canteen         = Column(Boolean, default=False)
    has_medical         = Column(Boolean, default=False)
    has_parking         = Column(Boolean, default=False)
    facility_notes      = Column(Text)

    is_active           = Column(Boolean, default=True)
    is_primary          = Column(Boolean, default=False)
    effective_from      = Column(Date)

    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc,
                                 onupdate=now_utc)

    business_unit = relationship("BusinessUnit", back_populates="work_locations")

    @hybrid_property
    def capacity_utilization(self) -> float:
        if not self.max_capacity:
            return 0.0
        return round(self.current_headcount * 100 / self.max_capacity, 1)

    def to_dict(self) -> dict:
        return {
            "id":                   str(self.id),
            "code":                 self.code,
            "name":                 self.name,
            "location_type":        self.location_type,
            "address_line1":        self.address_line1,
            "city":                 self.city,
            "country_code":         self.country_code,
            "country_name":         self.country_name,
            "timezone":             self.timezone,
            "utc_offset":           self.utc_offset,
            "working_days":         self.working_days,
            "standard_hours":       float(self.standard_hours or 8),
            "latitude":             float(self.latitude) if self.latitude else None,
            "longitude":            float(self.longitude) if self.longitude else None,
            "supports_remote":      self.supports_remote,
            "supports_hybrid":      self.supports_hybrid,
            "current_headcount":    self.current_headcount,
            "max_capacity":         self.max_capacity,
            "capacity_utilization": self.capacity_utilization,
            "local_minimum_wage":   float(self.local_minimum_wage) if self.local_minimum_wage else None,
            "minimum_wage_currency":self.minimum_wage_currency,
            "tax_jurisdiction":     self.tax_jurisdiction,
            "payroll_rule_set":     self.payroll_rule_set,
            "labour_office_zone":   self.labour_office_zone,
            "is_active":            self.is_active,
            "is_primary":           self.is_primary,
            "facilities": {
                "canteen": self.has_canteen,
                "medical": self.has_medical,
                "parking": self.has_parking,
            }
        }
