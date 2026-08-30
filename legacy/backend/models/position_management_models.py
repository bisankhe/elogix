# ============================================================
# FILE: backend/models/position_management_models.py
# PURPOSE: SQLAlchemy ORM + Flask API for Designation Setup,
#          Grade & Level, Reporting Hierarchy, Position Mgmt
# STACK: Python 3.11 + SQLAlchemy 2.0 + Flask + Claude AI
# ============================================================

import uuid, json, os
from datetime import datetime, timezone, date
from sqlalchemy import (
    Column, String, Boolean, Integer, Text,
    DateTime, ForeignKey, Numeric, Date,
    UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.ext.hybrid import hybrid_property
from flask import Blueprint, request, jsonify, g
from functools import wraps
import anthropic


class Base(DeclarativeBase):
    pass

def now_utc():
    return datetime.now(timezone.utc)


# ============================================================
# MODEL 1: JobFamily
# ============================================================
class JobFamily(Base):
    __tablename__ = "job_families"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id   = Column(UUID(as_uuid=True), nullable=False)
    code        = Column(String(20),  nullable=False)
    name        = Column(String(100), nullable=False)
    description = Column(Text)
    icon        = Column(String(10), default="💼")
    color       = Column(String(7),  default="#3b82f6")
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
    updated_at  = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    designations = relationship("Designation", back_populates="job_family")
    positions    = relationship("Position",    back_populates="job_family")

    __table_args__ = (UniqueConstraint("tenant_id", "code"),)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "description": self.description, "icon": self.icon, "color": self.color,
            "designation_count": len(self.designations) if self.designations else 0,
            "position_count":    len(self.positions)    if self.positions    else 0,
        }

    # Seed data
    DEFAULTS = [
        {"code": "IT",   "name": "Information Technology", "icon": "💻", "color": "#3b82f6"},
        {"code": "FIN",  "name": "Finance & Accounts",     "icon": "💰", "color": "#10b981"},
        {"code": "HR",   "name": "Human Resources",        "icon": "👥", "color": "#8b5cf6"},
        {"code": "SALES","name": "Sales & Marketing",      "icon": "📈", "color": "#f59e0b"},
        {"code": "OPS",  "name": "Operations",             "icon": "⚙️", "color": "#ef4444"},
        {"code": "LEGAL","name": "Legal & Compliance",     "icon": "⚖️", "color": "#06b6d4"},
        {"code": "ADMIN","name": "Administration",         "icon": "🏢", "color": "#64748b"},
        {"code": "EXEC", "name": "Executive",              "icon": "🎯", "color": "#0ea5e9"},
    ]


# ============================================================
# MODEL 2: GradeLevel
# ============================================================
class GradeLevel(Base):
    __tablename__ = "grade_levels"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id            = Column(UUID(as_uuid=True), nullable=False)
    code                 = Column(String(20),  nullable=False)
    name                 = Column(String(100), nullable=False)
    short_name           = Column(String(30))
    description          = Column(Text)
    level_number         = Column(Integer, nullable=False)
    level_type           = Column(String(20), default="individual")
    salary_band_min_npr  = Column(Numeric(14, 2))
    salary_band_mid_npr  = Column(Numeric(14, 2))
    salary_band_max_npr  = Column(Numeric(14, 2))
    currency_code        = Column(String(5), default="NPR")
    bonus_eligibility_pct= Column(Numeric(5, 2), default=0)
    leave_days_annual    = Column(Integer, default=18)
    approval_limit_npr   = Column(Numeric(14, 2))
    can_approve_leave    = Column(Boolean, default=False)
    can_hire             = Column(Boolean, default=False)
    span_of_control_max  = Column(Integer)
    managerial_category  = Column(Boolean, default=False)
    exempt_from_overtime = Column(Boolean, default=False)
    is_active            = Column(Boolean, default=True)
    created_at           = Column(DateTime(timezone=True), default=now_utc)
    updated_at           = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    designations = relationship("Designation", back_populates="grade_level")
    positions    = relationship("Position",    back_populates="grade_level")

    __table_args__ = (UniqueConstraint("tenant_id", "code"),)

    @hybrid_property
    def salary_band_display(self):
        if self.salary_band_min_npr and self.salary_band_max_npr:
            return f"NPR {int(self.salary_band_min_npr):,} – {int(self.salary_band_max_npr):,}"
        return "Not set"

    def to_dict(self):
        return {
            "id":                   str(self.id),
            "code":                 self.code,
            "name":                 self.name,
            "short_name":           self.short_name,
            "level_number":         self.level_number,
            "level_type":           self.level_type,
            "salary_band_min":      float(self.salary_band_min_npr) if self.salary_band_min_npr else None,
            "salary_band_mid":      float(self.salary_band_mid_npr) if self.salary_band_mid_npr else None,
            "salary_band_max":      float(self.salary_band_max_npr) if self.salary_band_max_npr else None,
            "salary_band_display":  self.salary_band_display,
            "bonus_pct":            float(self.bonus_eligibility_pct or 0),
            "leave_days":           self.leave_days_annual,
            "can_approve_leave":    self.can_approve_leave,
            "can_hire":             self.can_hire,
            "span_of_control_max":  self.span_of_control_max,
            "managerial_category":  self.managerial_category,
            "exempt_from_overtime": self.exempt_from_overtime,
        }

    # Nepal-context default grades
    DEFAULTS = [
        # Individual Contributor track
        {"code":"L1","name":"Level 1 — Junior",         "level_number":1, "level_type":"individual","salary_band_min_npr":15000, "salary_band_max_npr":25000,  "bonus_eligibility_pct":0,   "leave_days_annual":18,"managerial_category":False,"exempt_from_overtime":False,"span_of_control_max":0},
        {"code":"L2","name":"Level 2 — Associate",      "level_number":2, "level_type":"individual","salary_band_min_npr":25000, "salary_band_max_npr":45000,  "bonus_eligibility_pct":5,   "leave_days_annual":18,"managerial_category":False,"exempt_from_overtime":False,"span_of_control_max":0},
        {"code":"L3","name":"Level 3 — Senior",         "level_number":3, "level_type":"individual","salary_band_min_npr":45000, "salary_band_max_npr":75000,  "bonus_eligibility_pct":10,  "leave_days_annual":20,"managerial_category":False,"exempt_from_overtime":False,"span_of_control_max":0},
        {"code":"L4","name":"Level 4 — Lead",           "level_number":4, "level_type":"individual","salary_band_min_npr":75000, "salary_band_max_npr":120000, "bonus_eligibility_pct":15,  "leave_days_annual":20,"managerial_category":False,"exempt_from_overtime":True, "span_of_control_max":0},
        {"code":"L5","name":"Level 5 — Principal",      "level_number":5, "level_type":"individual","salary_band_min_npr":120000,"salary_band_max_npr":200000, "bonus_eligibility_pct":20,  "leave_days_annual":22,"managerial_category":False,"exempt_from_overtime":True, "span_of_control_max":0},
        # Management track
        {"code":"M1","name":"Manager Level 1",          "level_number":6, "level_type":"management","salary_band_min_npr":80000, "salary_band_max_npr":150000, "bonus_eligibility_pct":20,  "leave_days_annual":22,"managerial_category":True, "exempt_from_overtime":True, "span_of_control_max":8,  "can_approve_leave":True,"can_hire":False},
        {"code":"M2","name":"Manager Level 2 — Senior", "level_number":7, "level_type":"management","salary_band_min_npr":150000,"salary_band_max_npr":250000, "bonus_eligibility_pct":25,  "leave_days_annual":22,"managerial_category":True, "exempt_from_overtime":True, "span_of_control_max":12, "can_approve_leave":True,"can_hire":True},
        {"code":"M3","name":"Director",                 "level_number":8, "level_type":"management","salary_band_min_npr":250000,"salary_band_max_npr":450000, "bonus_eligibility_pct":35,  "leave_days_annual":24,"managerial_category":True, "exempt_from_overtime":True, "span_of_control_max":15, "can_approve_leave":True,"can_hire":True},
        # Executive track
        {"code":"E1","name":"VP / Executive",           "level_number":9, "level_type":"executive", "salary_band_min_npr":450000,"salary_band_max_npr":800000, "bonus_eligibility_pct":50,  "leave_days_annual":24,"managerial_category":True, "exempt_from_overtime":True, "span_of_control_max":20, "can_approve_leave":True,"can_hire":True},
        {"code":"E2","name":"C-Suite / CEO-1",          "level_number":10,"level_type":"executive", "salary_band_min_npr":800000,"salary_band_max_npr":2000000,"bonus_eligibility_pct":100, "leave_days_annual":24,"managerial_category":True, "exempt_from_overtime":True, "span_of_control_max":30, "can_approve_leave":True,"can_hire":True},
    ]


# ============================================================
# MODEL 3: Designation
# ============================================================
class Designation(Base):
    __tablename__ = "designations"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id               = Column(UUID(as_uuid=True), nullable=False)
    job_family_id           = Column(UUID(as_uuid=True), ForeignKey("job_families.id"))
    grade_level_id          = Column(UUID(as_uuid=True), ForeignKey("grade_levels.id"))
    job_code                = Column(String(30), nullable=False)
    title                   = Column(String(150), nullable=False)
    title_nepali            = Column(String(150))
    short_title             = Column(String(60))
    description             = Column(Text)
    is_managerial           = Column(Boolean, default=False)
    required_skills         = Column(JSONB)
    required_experience_years = Column(Integer, default=0)
    required_education      = Column(String(100))
    competency_profile      = Column(JSONB)
    jd_summary              = Column(Text)
    jd_full                 = Column(Text)
    ai_generated_jd         = Column(Boolean, default=False)
    ai_last_generated       = Column(DateTime(timezone=True))
    fte_value               = Column(Numeric(3, 2), default=1.00)
    is_active               = Column(Boolean, default=True)
    created_by              = Column(UUID(as_uuid=True))
    created_at              = Column(DateTime(timezone=True), default=now_utc)
    updated_at              = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    job_family   = relationship("JobFamily",   back_populates="designations")
    grade_level  = relationship("GradeLevel",  back_populates="designations")
    positions    = relationship("Position",    back_populates="designation")

    __table_args__ = (UniqueConstraint("tenant_id", "job_code"),)

    def to_dict(self, include_jd=False):
        data = {
            "id":                        str(self.id),
            "job_code":                  self.job_code,
            "title":                     self.title,
            "title_nepali":              self.title_nepali,
            "short_title":               self.short_title,
            "is_managerial":             self.is_managerial,
            "required_skills":           self.required_skills,
            "required_experience_years": self.required_experience_years,
            "required_education":        self.required_education,
            "jd_summary":                self.jd_summary,
            "fte_value":                 float(self.fte_value or 1.0),
            "is_active":                 self.is_active,
            "ai_generated_jd":           self.ai_generated_jd,
            "job_family":                self.job_family.to_dict() if self.job_family else None,
            "grade_level":               self.grade_level.to_dict() if self.grade_level else None,
            "position_count":            len(self.positions) if self.positions else 0,
        }
        if include_jd:
            data["jd_full"]            = self.jd_full
            data["competency_profile"] = self.competency_profile
        return data


# ============================================================
# MODEL 4: Position
# ============================================================
class Position(Base):
    __tablename__ = "positions"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id               = Column(UUID(as_uuid=True), nullable=False)
    position_code           = Column(String(30), nullable=False)
    position_title          = Column(String(150), nullable=False)
    designation_id          = Column(UUID(as_uuid=True), ForeignKey("designations.id"))
    job_family_id           = Column(UUID(as_uuid=True), ForeignKey("job_families.id"))
    grade_level_id          = Column(UUID(as_uuid=True), ForeignKey("grade_levels.id"))
    department_id           = Column(UUID(as_uuid=True))
    section_id              = Column(UUID(as_uuid=True))
    team_id                 = Column(UUID(as_uuid=True))
    work_location_id        = Column(UUID(as_uuid=True))
    cost_center_id          = Column(UUID(as_uuid=True))
    business_unit_id        = Column(UUID(as_uuid=True))
    incumbent_employee_id   = Column(UUID(as_uuid=True))
    incumbent_name          = Column(String(150))
    incumbent_since         = Column(Date)
    reports_to_position_id  = Column(UUID(as_uuid=True), ForeignKey("positions.id"))
    dotted_line_to_id       = Column(UUID(as_uuid=True), ForeignKey("positions.id"))
    hierarchy_level         = Column(Integer, default=1)
    hierarchy_depth         = Column(Integer, default=0)
    status                  = Column(String(20), default="vacant")
    position_type           = Column(String(20), default="permanent")
    fte_value               = Column(Numeric(3, 2), default=1.00)
    is_budgeted             = Column(Boolean, default=True)
    budget_annual_npr       = Column(Numeric(14, 2))
    effective_date          = Column(Date, default=date.today)
    end_date                = Column(Date)
    succession_ready        = Column(Boolean, default=False)
    successor_names         = Column(JSONB)
    attrition_risk          = Column(String(10), default="low")
    ai_risk_score           = Column(Integer)
    ai_insights             = Column(JSONB)
    created_by              = Column(UUID(as_uuid=True))
    approved_by             = Column(UUID(as_uuid=True))
    approved_at             = Column(DateTime(timezone=True))
    created_at              = Column(DateTime(timezone=True), default=now_utc)
    updated_at              = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    designation  = relationship("Designation", back_populates="positions")
    job_family   = relationship("JobFamily",   back_populates="positions")
    grade_level  = relationship("GradeLevel",  back_populates="positions")
    reports_to   = relationship("Position",
                                foreign_keys="Position.reports_to_position_id",
                                remote_side="Position.id")
    direct_reports = relationship("Position",
                                  foreign_keys="Position.reports_to_position_id",
                                  primaryjoin="Position.reports_to_position_id==Position.id")

    __table_args__ = (UniqueConstraint("tenant_id", "position_code"),)

    def to_dict(self, include_children=False):
        data = {
            "id":                str(self.id),
            "position_code":     self.position_code,
            "position_title":    self.position_title,
            "status":            self.status,
            "position_type":     self.position_type,
            "fte_value":         float(self.fte_value or 1.0),
            "is_budgeted":       self.is_budgeted,
            "budget_annual_npr": float(self.budget_annual_npr) if self.budget_annual_npr else None,
            "hierarchy_level":   self.hierarchy_level,
            "incumbent_name":    self.incumbent_name,
            "incumbent_since":   self.incumbent_since.isoformat() if self.incumbent_since else None,
            "attrition_risk":    self.attrition_risk,
            "ai_risk_score":     self.ai_risk_score,
            "succession_ready":  self.succession_ready,
            "designation":       self.designation.to_dict() if self.designation else None,
            "grade_level":       self.grade_level.to_dict() if self.grade_level else None,
            "job_family":        self.job_family.to_dict() if self.job_family else None,
            "reports_to_title":  self.reports_to.position_title if self.reports_to else None,
            "direct_report_count": len(self.direct_reports) if self.direct_reports else 0,
        }
        if include_children:
            data["direct_reports"] = [dr.to_dict() for dr in (self.direct_reports or [])]
        return data


# ============================================================
# FLASK API ROUTES
# ============================================================

pos_bp = Blueprint("position_mgmt", __name__, url_prefix="/api/v1/positions")
ai_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


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


def hr_only(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if g.role not in ("super-admin","hr","executive"):
            return jsonify({"error": "Forbidden"}), 403
        return f(*args, **kwargs)
    return decorated


# ── Grade Levels ──────────────────────────────────────────────

@pos_bp.route("/grades", methods=["GET"])
@require_auth
def list_grades():
    from ..database import db_session
    grades = db_session.query(GradeLevel).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).order_by(GradeLevel.level_number).all()
    return jsonify({"success": True, "data": [g_.to_dict() for g_ in grades]})


@pos_bp.route("/grades", methods=["POST"])
@require_auth
@hr_only
def create_grade():
    from ..database import db_session
    data = request.get_json()
    grade = GradeLevel(
        tenant_id            = g.tenant_id,
        code                 = data["code"],
        name                 = data["name"],
        short_name           = data.get("short_name"),
        level_number         = data["level_number"],
        level_type           = data.get("level_type","individual"),
        salary_band_min_npr  = data.get("salary_band_min_npr"),
        salary_band_mid_npr  = data.get("salary_band_mid_npr"),
        salary_band_max_npr  = data.get("salary_band_max_npr"),
        bonus_eligibility_pct= data.get("bonus_eligibility_pct", 0),
        leave_days_annual    = data.get("leave_days_annual", 18),
        can_approve_leave    = data.get("can_approve_leave", False),
        can_hire             = data.get("can_hire", False),
        span_of_control_max  = data.get("span_of_control_max"),
        managerial_category  = data.get("managerial_category", False),
        exempt_from_overtime = data.get("exempt_from_overtime", False),
    )
    db_session.add(grade)
    db_session.commit()
    return jsonify({"success": True, "data": grade.to_dict()}), 201


@pos_bp.route("/grades/seed-defaults", methods=["POST"])
@require_auth
@hr_only
def seed_grades():
    from ..database import db_session
    created = 0
    for gd in GradeLevel.DEFAULTS:
        if not db_session.query(GradeLevel).filter_by(
            tenant_id=g.tenant_id, code=gd["code"]
        ).first():
            db_session.add(GradeLevel(tenant_id=g.tenant_id, **gd))
            created += 1
    db_session.commit()
    return jsonify({"success": True, "created": created})


# ── Designations ──────────────────────────────────────────────

@pos_bp.route("/designations", methods=["GET"])
@require_auth
def list_designations():
    from ..database import db_session
    family_id = request.args.get("job_family_id")
    grade_id  = request.args.get("grade_level_id")
    q = db_session.query(Designation).filter_by(tenant_id=g.tenant_id, is_active=True)
    if family_id: q = q.filter_by(job_family_id=family_id)
    if grade_id:  q = q.filter_by(grade_level_id=grade_id)
    desigs = q.order_by(Designation.title).all()
    return jsonify({"success": True, "count": len(desigs),
                    "data": [d.to_dict() for d in desigs]})


@pos_bp.route("/designations", methods=["POST"])
@require_auth
@hr_only
def create_designation():
    from ..database import db_session
    data = request.get_json()
    desig = Designation(
        tenant_id                 = g.tenant_id,
        job_family_id             = data.get("job_family_id"),
        grade_level_id            = data.get("grade_level_id"),
        job_code                  = data["job_code"],
        title                     = data["title"],
        title_nepali              = data.get("title_nepali"),
        short_title               = data.get("short_title"),
        description               = data.get("description"),
        is_managerial             = data.get("is_managerial", False),
        required_skills           = data.get("required_skills", []),
        required_experience_years = data.get("required_experience_years", 0),
        required_education        = data.get("required_education"),
        jd_summary                = data.get("jd_summary"),
        created_by                = g.employee_id,
    )
    db_session.add(desig)
    db_session.commit()
    return jsonify({"success": True, "data": desig.to_dict()}), 201


@pos_bp.route("/designations/<desig_id>/generate-jd", methods=["POST"])
@require_auth
@hr_only
def generate_jd(desig_id):
    """AI generates full job description for a designation"""
    from ..database import db_session
    desig = db_session.query(Designation).filter_by(
        id=desig_id, tenant_id=g.tenant_id
    ).first()
    if not desig:
        return jsonify({"error": "Not found"}), 404

    grade = desig.grade_level
    family = desig.job_family

    try:
        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1200,
            messages=[{"role": "user", "content": f"""
You are an expert HR professional. Generate a comprehensive job description for:

POSITION: {desig.title}
JOB FAMILY: {family.name if family else 'General'}
GRADE/LEVEL: {grade.code if grade else 'TBD'} — {grade.name if grade else ''}
EXPERIENCE REQUIRED: {desig.required_experience_years} years
EDUCATION: {desig.required_education or 'As applicable'}
REQUIRED SKILLS: {json.dumps(desig.required_skills or [])}
CONTEXT: Nepal-based company, globally operating HRIS/HRMS software company
LABOUR LAW: Nepal Labour Act 2074 compliant
MANAGERIAL: {'Yes — excluded from union per Nepal Labour Act 2074' if desig.is_managerial else 'No'}

Return JSON:
{{
  "summary": "2-3 sentence role summary",
  "key_responsibilities": ["responsibility 1", "..."],
  "qualifications": ["qualification 1", "..."],
  "skills_required": ["skill 1", "..."],
  "competencies": [
    {{"name": "Communication", "level": "Advanced", "mandatory": true}},
    ...
  ],
  "nepali_context": "Nepal-specific requirements or context"
}}"""}]
        )
        jd_data = json.loads(response.content[0].text)
    except Exception as e:
        return jsonify({"error": f"AI generation failed: {str(e)}"}), 500

    desig.jd_summary        = jd_data.get("summary", "")
    desig.jd_full           = json.dumps(jd_data)
    desig.competency_profile= jd_data.get("competencies", [])
    desig.required_skills   = [{"skill": s, "mandatory": True}
                                 for s in jd_data.get("skills_required", [])]
    desig.ai_generated_jd   = True
    desig.ai_last_generated = now_utc()
    db_session.commit()

    return jsonify({"success": True, "jd": jd_data, "designation": desig.to_dict(include_jd=True)})


# ── Positions ─────────────────────────────────────────────────

@pos_bp.route("/", methods=["GET"])
@require_auth
def list_positions():
    from ..database import db_session
    status     = request.args.get("status")
    dept_id    = request.args.get("department_id")
    attrition  = request.args.get("attrition_risk")
    q = db_session.query(Position).filter_by(
        tenant_id=g.tenant_id, is_budgeted=True
    )
    if status:    q = q.filter_by(status=status)
    if dept_id:   q = q.filter_by(department_id=dept_id)
    if attrition: q = q.filter_by(attrition_risk=attrition)
    positions = q.order_by(Position.hierarchy_level, Position.position_title).all()

    filled  = sum(1 for p in positions if p.status == "filled")
    vacant  = sum(1 for p in positions if p.status == "vacant")
    total   = len(positions)

    return jsonify({
        "success": True,
        "count":   total,
        "filled":  filled,
        "vacant":  vacant,
        "fill_rate": round(filled * 100 / total, 1) if total else 0,
        "data":    [p.to_dict() for p in positions]
    })


@pos_bp.route("/", methods=["POST"])
@require_auth
@hr_only
def create_position():
    from ..database import db_session
    data = request.get_json()
    pos = Position(
        tenant_id               = g.tenant_id,
        position_code           = data["position_code"],
        position_title          = data["position_title"],
        designation_id          = data.get("designation_id"),
        job_family_id           = data.get("job_family_id"),
        grade_level_id          = data.get("grade_level_id"),
        department_id           = data.get("department_id"),
        team_id                 = data.get("team_id"),
        work_location_id        = data.get("work_location_id"),
        cost_center_id          = data.get("cost_center_id"),
        business_unit_id        = data.get("business_unit_id"),
        reports_to_position_id  = data.get("reports_to_position_id"),
        dotted_line_to_id       = data.get("dotted_line_to_id"),
        status                  = data.get("status", "vacant"),
        position_type           = data.get("position_type", "permanent"),
        fte_value               = data.get("fte_value", 1.00),
        is_budgeted             = data.get("is_budgeted", True),
        budget_annual_npr       = data.get("budget_annual_npr"),
        hierarchy_level         = data.get("hierarchy_level", 1),
        effective_date          = data.get("effective_date", date.today().isoformat()),
        created_by              = g.employee_id,
    )
    db_session.add(pos)
    db_session.commit()
    return jsonify({"success": True, "data": pos.to_dict()}), 201


@pos_bp.route("/<pos_id>/fill", methods=["POST"])
@require_auth
@hr_only
def fill_position(pos_id):
    """Assign an employee to a position"""
    from ..database import db_session
    pos = db_session.query(Position).filter_by(id=pos_id, tenant_id=g.tenant_id).first()
    if not pos:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    pos.incumbent_employee_id = data["employee_id"]
    pos.incumbent_name        = data["employee_name"]
    pos.incumbent_since       = date.today()
    pos.status                = "filled"
    pos.updated_at            = now_utc()
    db_session.commit()
    return jsonify({"success": True, "message": f"Position filled by {pos.incumbent_name}"})


@pos_bp.route("/<pos_id>/vacate", methods=["POST"])
@require_auth
@hr_only
def vacate_position(pos_id):
    """Remove incumbent from position"""
    from ..database import db_session
    pos = db_session.query(Position).filter_by(id=pos_id, tenant_id=g.tenant_id).first()
    if not pos:
        return jsonify({"error": "Not found"}), 404
    pos.incumbent_employee_id = None
    pos.incumbent_name        = None
    pos.incumbent_since       = None
    pos.status                = "vacant"
    pos.updated_at            = now_utc()
    db_session.commit()
    return jsonify({"success": True, "message": "Position vacated."})


@pos_bp.route("/<pos_id>/ai-attrition-risk", methods=["POST"])
@require_auth
def ai_attrition_risk(pos_id):
    """AI calculates attrition risk for a position"""
    from ..database import db_session
    pos = db_session.query(Position).filter_by(id=pos_id, tenant_id=g.tenant_id).first()
    if not pos:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json() or {}
    try:
        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": f"""
Analyze attrition risk for this position in a Nepal HRIS company:

Position: {pos.position_title}
Status: {pos.status}
Incumbent Since: {pos.incumbent_since}
Grade: {pos.grade_level.code if pos.grade_level else 'N/A'}
Succession Ready: {pos.succession_ready}
Additional context: {json.dumps(data)}

Return JSON:
{{
  "risk_score": 42,
  "risk_level": "medium",
  "risk_factors": ["factor1", "factor2"],
  "recommendations": ["rec1", "rec2"],
  "succession_urgency": "moderate"
}}"""}]
        )
        result = json.loads(response.content[0].text)
    except Exception:
        result = {"risk_score": 50, "risk_level": "medium",
                  "risk_factors": ["Unable to analyze — AI unavailable"],
                  "recommendations": ["Manual review recommended"]}

    pos.ai_risk_score = result.get("risk_score")
    pos.attrition_risk = result.get("risk_level", "medium")
    pos.ai_insights   = result
    db_session.commit()

    return jsonify({"success": True, "position": pos.position_title, "analysis": result})


@pos_bp.route("/dashboard", methods=["GET"])
@require_auth
def position_dashboard():
    """KPI summary for position management"""
    from ..database import db_session
    from sqlalchemy import text
    row = db_session.execute(text(
        "SELECT * FROM v_position_dashboard WHERE tenant_id = :tid"
    ), {"tid": g.tenant_id}).first()

    if not row:
        return jsonify({"success": True, "data": {}})

    r = dict(row._mapping)
    r["fill_rate"] = round(
        r["filled_count"] * 100 / r["total_positions"], 1
    ) if r["total_positions"] else 0

    return jsonify({"success": True, "data": r})


@pos_bp.route("/org-tree", methods=["GET"])
@require_auth
def org_tree():
    """Returns positions as a nested org tree"""
    from ..database import db_session

    # Get all root-level positions (no reports_to)
    roots = db_session.query(Position).filter_by(
        tenant_id=g.tenant_id,
        is_budgeted=True,
        reports_to_position_id=None
    ).order_by(Position.position_title).all()

    def build_node(pos, depth=0):
        node = pos.to_dict()
        node["depth"] = depth
        node["children"] = [
            build_node(child, depth + 1)
            for child in pos.direct_reports
            if child.is_budgeted
        ]
        return node

    tree = [build_node(r) for r in roots]
    return jsonify({"success": True, "tree": tree})


@pos_bp.route("/span-of-control", methods=["GET"])
@require_auth
@hr_only
def span_of_control():
    """AI-assisted span of control analysis"""
    from ..database import db_session
    from sqlalchemy import text
    rows = db_session.execute(text(
        "SELECT * FROM fn_span_of_control_check(:tid)"
    ), {"tid": g.tenant_id}).fetchall()

    data = [dict(r._mapping) for r in rows]
    overloaded = [r for r in data if r["status"] == "overloaded"]
    under_util = [r for r in data if r["status"] == "under_utilized"]

    return jsonify({
        "success":        True,
        "total_managers": len(data),
        "overloaded":     len(overloaded),
        "under_utilized": len(under_util),
        "managers":       data
    })
