# ============================================================
# FILE: backend/models/dept_team_models.py
# COVERS: Business Unit · Department · Section & Unit ·
#         Team Setup · Cost Center · Work Location
# ============================================================
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime, Numeric, Date, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase
from flask import Blueprint, request, jsonify, g
from functools import wraps

class Base(DeclarativeBase):
    pass

def now_utc():
    return datetime.now(timezone.utc)


# ── BUSINESS UNIT ─────────────────────────────────────────────
class BusinessUnit(Base):
    __tablename__ = "business_units"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    company_id      = Column(UUID(as_uuid=True), nullable=False)
    code            = Column(String(20), nullable=False)     # BU-TECH
    name            = Column(String(200), nullable=False)
    short_name      = Column(String(80))
    unit_type       = Column(String(50), default="Business Unit")
    # Types: Business Unit | Division | Profit Center | Cost Center | Project Unit
    head_employee_id= Column(UUID(as_uuid=True))
    head_name       = Column(String(150))
    primary_branch_id = Column(UUID(as_uuid=True))
    cost_center_code= Column(String(30))
    budget_annual_npr= Column(Numeric(14, 2))
    description     = Column(Text)
    revenue_contribution_pct = Column(Numeric(5, 2), default=0)
    is_active       = Column(Boolean, default=True)
    created_by      = Column(UUID(as_uuid=True))
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    departments     = relationship("Department", back_populates="business_unit")
    __table_args__  = (UniqueConstraint("tenant_id", "code"),)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "short_name": self.short_name, "unit_type": self.unit_type,
            "head_name": self.head_name,
            "budget_annual_npr": float(self.budget_annual_npr) if self.budget_annual_npr else None,
            "revenue_contribution_pct": float(self.revenue_contribution_pct or 0),
            "is_active": self.is_active,
            "departments_count": len(self.departments) if self.departments else 0,
        }


# ── DEPARTMENT ────────────────────────────────────────────────
class Department(Base):
    __tablename__ = "departments"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    business_unit_id= Column(UUID(as_uuid=True))
    code            = Column(String(20), nullable=False)     # DEPT-IT
    name            = Column(String(200), nullable=False)
    short_name      = Column(String(80))
    dept_type       = Column(String(50), default="Technical")
    # Types: Technical | Support | Revenue | Corporate | Operations | Compliance
    head_employee_id= Column(UUID(as_uuid=True))
    head_name       = Column(String(150))
    hrbp_employee_id= Column(UUID(as_uuid=True))
    hrbp_name       = Column(String(150))
    cost_center_code= Column(String(30))
    work_location_id= Column(UUID(as_uuid=True))
    budget_annual_npr= Column(Numeric(14, 2))
    ulrich_type     = Column(String(10), default="general")
    # ulrich_type: CoE | HRSS | HRBP | general
    is_active       = Column(Boolean, default=True)
    cba_applicable  = Column(Boolean, default=False)  # CBA if 10+ employees
    description     = Column(Text)
    created_by      = Column(UUID(as_uuid=True))
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    business_unit   = relationship("BusinessUnit", back_populates="departments",
                                   foreign_keys=[business_unit_id],
                                   primaryjoin="Department.business_unit_id == BusinessUnit.id")
    sections        = relationship("SectionUnit", back_populates="department")
    __table_args__  = (UniqueConstraint("tenant_id", "code"),)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "short_name": self.short_name, "dept_type": self.dept_type,
            "head_name": self.head_name, "hrbp_name": self.hrbp_name,
            "cost_center_code": self.cost_center_code,
            "budget_annual_npr": float(self.budget_annual_npr) if self.budget_annual_npr else None,
            "ulrich_type": self.ulrich_type, "is_active": self.is_active,
            "cba_applicable": self.cba_applicable,
        }


# ── SECTION & UNIT ────────────────────────────────────────────
class SectionUnit(Base):
    __tablename__ = "section_units"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    department_id   = Column(UUID(as_uuid=True), nullable=False)
    code            = Column(String(20), nullable=False)     # SEC-FE
    name            = Column(String(200), nullable=False)
    short_name      = Column(String(80))
    section_type    = Column(String(60), default="Technical Section")
    head_employee_id= Column(UUID(as_uuid=True))
    head_name       = Column(String(150))
    ulrich_type     = Column(String(10), default="CoE")  # CoE | HRSS | HRBP
    description     = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    department      = relationship("Department", back_populates="sections",
                                   foreign_keys=[department_id],
                                   primaryjoin="SectionUnit.department_id == Department.id")
    teams           = relationship("Team", back_populates="section")
    __table_args__  = (UniqueConstraint("tenant_id", "code"),)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "short_name": self.short_name, "section_type": self.section_type,
            "head_name": self.head_name, "ulrich_type": self.ulrich_type,
            "is_active": self.is_active,
            "teams_count": len(self.teams) if self.teams else 0,
        }


# ── TEAM ──────────────────────────────────────────────────────
class Team(Base):
    __tablename__ = "teams"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    section_id      = Column(UUID(as_uuid=True))
    department_id   = Column(UUID(as_uuid=True))
    code            = Column(String(20), nullable=False)
    name            = Column(String(200), nullable=False)
    short_name      = Column(String(80))
    team_type       = Column(String(50), default="Permanent")
    # Types: Permanent | Project-Based | Virtual | Cross-Functional | Tiger Team
    lead_employee_id= Column(UUID(as_uuid=True))
    lead_name       = Column(String(150))
    deputy_lead_name= Column(String(150))
    max_members     = Column(Integer, default=10)
    work_mode       = Column(String(30), default="Office")
    # Modes: Office | Remote-First | Hybrid | Field + Office | On-Site
    sprint_cycle    = Column(String(20), default="Monthly")
    tools_used      = Column(String(300))
    slack_channel   = Column(String(100))
    # Nepal Labour Act 2074 compliance
    cba_eligible    = Column(Boolean, default=False)   # true if members >= 10
    safety_committee= Column(Boolean, default=False)   # true if members >= 20
    is_active       = Column(Boolean, default=True)
    created_by      = Column(UUID(as_uuid=True))
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    section         = relationship("SectionUnit", back_populates="teams",
                                   foreign_keys=[section_id],
                                   primaryjoin="Team.section_id == SectionUnit.id")
    members         = relationship("TeamMember", back_populates="team")
    __table_args__  = (UniqueConstraint("tenant_id", "code"),)

    @property
    def member_count(self):
        return len(self.members) if self.members else 0

    def check_nepal_compliance(self):
        count = self.member_count
        self.cba_eligible    = count >= 10
        self.safety_committee = count >= 20
        return {"cba_eligible": self.cba_eligible, "safety_committee": self.safety_committee}

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "team_type": self.team_type, "lead_name": self.lead_name,
            "max_members": self.max_members, "current_members": self.member_count,
            "work_mode": self.work_mode, "sprint_cycle": self.sprint_cycle,
            "cba_eligible": self.cba_eligible,
            "safety_committee": self.safety_committee,
            "is_active": self.is_active,
        }


class TeamMember(Base):
    __tablename__ = "team_members"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id         = Column(UUID(as_uuid=True), nullable=False)
    employee_id     = Column(UUID(as_uuid=True), nullable=False)
    employee_name   = Column(String(150))
    role_in_team    = Column(String(80), default="Member")
    join_date       = Column(Date)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), default=now_utc)

    team            = relationship("Team", back_populates="members",
                                   foreign_keys=[team_id],
                                   primaryjoin="TeamMember.team_id == Team.id")


# ── COST CENTER ───────────────────────────────────────────────
class CostCenter(Base):
    __tablename__ = "cost_centers"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    code            = Column(String(30), nullable=False)     # CC-IT-001
    name            = Column(String(200), nullable=False)
    short_name      = Column(String(80))
    center_type     = Column(String(30), default="Department")
    # Types: Department | Branch | Project | Product | Business Unit | Corporate
    owner_employee_id   = Column(UUID(as_uuid=True))
    owner_name          = Column(String(150))
    approver_employee_id= Column(UUID(as_uuid=True))
    approver_name       = Column(String(150))
    linked_entity_id    = Column(UUID(as_uuid=True))  # dept / branch / BU
    linked_entity_type  = Column(String(30))           # department | branch | business_unit
    gl_account          = Column(String(20))            # General Ledger account
    erp_code            = Column(String(30))            # ERP system code
    profit_center       = Column(String(30))
    budget_annual_npr   = Column(Numeric(14, 2), default=0)
    ytd_spend_npr       = Column(Numeric(14, 2), default=0)
    currency_code       = Column(String(5), default="NPR")
    is_active           = Column(Boolean, default=True)
    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    __table_args__ = (UniqueConstraint("tenant_id", "code"),)

    @property
    def utilization_pct(self):
        if not self.budget_annual_npr or self.budget_annual_npr == 0:
            return 0
        return round(float(self.ytd_spend_npr or 0) / float(self.budget_annual_npr) * 100, 1)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "center_type": self.center_type,
            "owner_name": self.owner_name, "approver_name": self.approver_name,
            "gl_account": self.gl_account, "erp_code": self.erp_code,
            "profit_center": self.profit_center,
            "budget_annual_npr": float(self.budget_annual_npr or 0),
            "ytd_spend_npr": float(self.ytd_spend_npr or 0),
            "utilization_pct": self.utilization_pct,
            "currency_code": self.currency_code, "is_active": self.is_active,
        }


# ── WORK LOCATION ─────────────────────────────────────────────
class WorkLocation(Base):
    __tablename__ = "work_locations"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    branch_id       = Column(UUID(as_uuid=True))
    code            = Column(String(20), nullable=False)     # WL-KTM-HQ
    name            = Column(String(200), nullable=False)
    short_name      = Column(String(80))
    location_type   = Column(String(40), default="Branch Office")
    # Types: Primary Office|Branch Office|Remote/Virtual|International|Field Work
    country         = Column(String(60), default="Nepal")
    province        = Column(String(80))
    address         = Column(Text)
    capacity        = Column(Integer)                   # max persons
    current_headcount = Column(Integer, default=0)
    work_policy     = Column(String(30), default="Office-First")
    # Policies: Office-First | Remote-First | Hybrid | Field-Based | Flexible
    shift_start     = Column(String(10), default="09:00")
    shift_end       = Column(String(10), default="18:00")
    shift_type      = Column(String(20), default="Day Shift")
    attendance_device = Column(String(80), default="Biometric (Fingerprint)")
    labour_office_zone = Column(String(200))
    amenities       = Column(JSONB)                     # list of amenities
    latitude        = Column(Numeric(10, 7))
    longitude       = Column(Numeric(10, 7))
    is_active       = Column(Boolean, default=True)
    created_by      = Column(UUID(as_uuid=True))
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    __table_args__ = (UniqueConstraint("tenant_id", "code"),)

    @property
    def occupancy_pct(self):
        if not self.capacity or self.capacity <= 0:
            return None
        return round(self.current_headcount / self.capacity * 100, 1)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "location_type": self.location_type, "country": self.country,
            "province": self.province, "address": self.address,
            "capacity": self.capacity, "current_headcount": self.current_headcount,
            "occupancy_pct": self.occupancy_pct,
            "work_policy": self.work_policy,
            "shift_start": self.shift_start, "shift_end": self.shift_end,
            "attendance_device": self.attendance_device,
            "labour_office_zone": self.labour_office_zone,
            "amenities": self.amenities or [],
            "latitude": float(self.latitude) if self.latitude else None,
            "longitude": float(self.longitude) if self.longitude else None,
            "is_active": self.is_active,
        }


# ── FLASK BLUEPRINTS (all dept & team modules) ────────────────
dept_team_bp = Blueprint("dept_team", __name__, url_prefix="/api/v1")

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        g.tenant_id   = request.headers.get("X-Tenant-Id")
        g.employee_id = request.headers.get("X-Employee-Id")
        g.role        = request.headers.get("X-Role", "employee")
        if not g.tenant_id:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

def make_crud(model_cls, route_prefix, fields):
    """Generic CRUD factory for simple list/create endpoints."""
    @dept_team_bp.route(f"/{route_prefix}", methods=["GET"])
    @require_auth
    def list_items():
        from ..database import db_session
        items = db_session.query(model_cls).filter_by(
            tenant_id=g.tenant_id, is_active=True
        ).all()
        return jsonify({"success": True, "count": len(items),
                        "data": [i.to_dict() for i in items]})

    @dept_team_bp.route(f"/{route_prefix}", methods=["POST"])
    @require_auth
    def create_item():
        from ..database import db_session
        data = request.get_json()
        item = model_cls(tenant_id=g.tenant_id,
                         **{k: data.get(k) for k in fields if k in data})
        db_session.add(item); db_session.commit()
        return jsonify({"success": True, "data": item.to_dict()}), 201

# Register routes for each model
for (cls, prefix, flds) in [
    (BusinessUnit, "business-units",  ["code","name","short_name","unit_type","head_name","cost_center_code","budget_annual_npr","description"]),
    (Department,   "departments",     ["code","name","short_name","dept_type","head_name","hrbp_name","cost_center_code","ulrich_type","budget_annual_npr","description"]),
    (SectionUnit,  "section-units",   ["code","name","short_name","section_type","head_name","ulrich_type","description","department_id"]),
    (Team,         "teams",           ["code","name","short_name","team_type","lead_name","max_members","work_mode","sprint_cycle","tools_used","slack_channel","department_id"]),
    (CostCenter,   "cost-centers",    ["code","name","center_type","owner_name","approver_name","gl_account","erp_code","profit_center","budget_annual_npr","currency_code"]),
    (WorkLocation, "work-locations",  ["code","name","location_type","country","province","address","capacity","work_policy","shift_start","shift_end","attendance_device","labour_office_zone","branch_id"]),
]:
    make_crud(cls, prefix, flds)

# Nepal compliance check for teams
@dept_team_bp.route("/teams/<team_id>/nepal-compliance", methods=["GET"])
@require_auth
def team_nepal_compliance(team_id):
    from ..database import db_session
    team = db_session.query(Team).filter_by(id=team_id, tenant_id=g.tenant_id).first()
    if not team:
        return jsonify({"error": "Not found"}), 404
    result = team.check_nepal_compliance()
    db_session.commit()
    return jsonify({
        "success": True,
        "team": team.name,
        "member_count": team.member_count,
        "cba_eligible": result["cba_eligible"],
        "cba_note": "Collective Bargaining Committee required (Labour Act 2074 - 10+ employees)" if result["cba_eligible"] else "CBA not required",
        "safety_committee": result["safety_committee"],
        "safety_note": "Safety & Health Committee mandatory (Labour Act 2074 - 20+ employees)" if result["safety_committee"] else "Safety committee not required",
    })
