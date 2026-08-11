"""
FILE: backend/models/structure_hierarchy_models.py
COVERS:
  - Employment Category (all 12 types per Nepal Labour Act 2074)
  - Designation Setup
  - Grade & Level
  - Reporting Hierarchy
  - Organization Chart
  - Position Management
"""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Numeric,
    Text, ForeignKey, Enum, Float, CheckConstraint, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.types import UserDefinedType

try:
    from sqlalchemy.dialects.postgresql import LTREE
except ImportError:
    class LTREE(UserDefinedType):
        cache_ok = True

        def get_col_spec(self, **kw):
            return "LTREE"

        def bind_processor(self, dialect):
            return None

        def result_processor(self, dialect, coltype):
            return None

from .org_setup_models import Base, EntityStatus
import uuid
import enum


# ── Enums ──────────────────────────────────────────────────────
class EmploymentCategoryCode(str, enum.Enum):
    REGULAR     = "regular"
    PROBATION   = "probation"
    CONTRACT_TB = "contract_time_based"
    CONTRACT_WB = "contract_work_based"
    CASUAL      = "casual"
    PART_TIME   = "part_time"
    INTERN      = "intern"
    TRAINEE     = "trainee"
    DAILY_WAGE  = "daily_wage"
    OUTSOURCE   = "outsource"
    CONSULTANT  = "consultant"
    FIXED_TERM  = "fixed_term"

class GradeTrack(str, enum.Enum):
    INDIVIDUAL  = "individual"
    MANAGEMENT  = "management"
    EXECUTIVE   = "executive"

class PositionStatus(str, enum.Enum):
    FILLED    = "filled"
    VACANT    = "vacant"
    FROZEN    = "frozen"
    BUDGETED  = "budgeted"
    CLOSED    = "closed"

class ReportingType(str, enum.Enum):
    LINE    = "line"
    DOTTED  = "dotted"
    MATRIX  = "matrix"
    FUNCTIONAL = "functional"


# ── 1. Employment Category ────────────────────────────────────
class EmploymentCategory(Base):
    """
    Nepal Labour Act 2074, Section 10: 5 primary + extended categories
    """
    __tablename__ = "employment_categories"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id              = Column(UUID(as_uuid=True), nullable=False)

    code                    = Column(Enum(EmploymentCategoryCode), nullable=False)
    name                    = Column(String(100), nullable=False)
    name_nepali             = Column(String(100))
    description             = Column(Text)
    la_section              = Column(String(50))    # e.g. "Section 10(a)"

    # Nepal Labour Act rules
    written_contract_required = Column(Boolean, default=True)
    max_probation_months      = Column(Integer)          # 6 max per law
    max_duration_months       = Column(Integer)          # For contracts
    max_hours_per_week        = Column(Numeric(4,1))     # 35 for part-time
    max_days_per_month        = Column(Integer)          # 7 for casual
    is_managerial_category    = Column(Boolean, default=False)  # CBA exclusion
    cba_eligible              = Column(Boolean, default=True)
    overtime_eligible         = Column(Boolean, default=True)
    pf_required               = Column(Boolean, default=True)
    ssf_required              = Column(Boolean, default=True)
    gratuity_eligible         = Column(Boolean, default=True)

    # Benefits
    annual_leave_days         = Column(Integer, default=18)
    sick_leave_days           = Column(Integer, default=12)
    festival_bonus_eligible   = Column(Boolean, default=True)
    medical_allowance_eligible= Column(Boolean, default=True)

    # Probation auto-alert
    probation_alert_days      = Column(Integer, default=30)   # Alert before expiry

    # Counts
    employee_count            = Column(Integer, default=0)

    status                    = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ai_compliance_notes       = Column(JSONB, default=dict)
    created_at                = Column(DateTime, default=datetime.utcnow)
    updated_at                = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_emp_cat_per_company"),
        Index("idx_emp_cat_company", "company_id"),
        CheckConstraint("max_probation_months IS NULL OR max_probation_months <= 6",
                        name="ck_probation_max_6_months"),
        CheckConstraint("max_days_per_month IS NULL OR max_days_per_month <= 7",
                        name="ck_casual_max_7_days"),
        CheckConstraint("max_hours_per_week IS NULL OR max_hours_per_week <= 35",
                        name="ck_parttime_max_35hrs"),
    )


# ── 2. Job Family ─────────────────────────────────────────────
class JobFamily(Base):
    __tablename__ = "job_families"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id  = Column(UUID(as_uuid=True), nullable=False)
    code        = Column(String(20), nullable=False)
    name        = Column(String(100), nullable=False)
    icon        = Column(String(10))
    color_hex   = Column(String(10))
    description = Column(Text)
    status      = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    created_at  = Column(DateTime, default=datetime.utcnow)

    # Relationships
    designations = relationship("Designation", back_populates="job_family")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_jf_per_company"),
    )


# ── 3. Grade Level ────────────────────────────────────────────
class GradeLevel(Base):
    __tablename__ = "grade_levels"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id              = Column(UUID(as_uuid=True), nullable=False)

    code                    = Column(String(10), nullable=False)    # L1-L5, M1-M3, E1-E2
    name                    = Column(String(100), nullable=False)
    track                   = Column(Enum(GradeTrack), nullable=False)
    level_number            = Column(Integer, nullable=False)        # Sort order

    # Salary bands (NPR/month)
    salary_min_npr          = Column(Numeric(12,2), nullable=False)
    salary_mid_npr          = Column(Numeric(12,2), nullable=False)
    salary_max_npr          = Column(Numeric(12,2), nullable=False)

    # Annual bonus
    bonus_target_pct        = Column(Numeric(5,2), default=0)
    bonus_max_pct           = Column(Numeric(5,2), default=0)

    # Leave
    annual_leave_days       = Column(Integer, default=18)
    sick_leave_days         = Column(Integer, default=12)

    # Authority
    overtime_exempt         = Column(Boolean, default=False)
    is_managerial           = Column(Boolean, default=False)
    can_approve_leave       = Column(Boolean, default=False)
    can_hire                = Column(Boolean, default=False)
    span_of_control_max     = Column(Integer, default=0)
    financial_approval_limit_npr = Column(Numeric(15,2), default=0)

    # Nepal law
    nepal_law_note          = Column(Text)
    cba_excluded            = Column(Boolean, default=False)   # Managerial = excluded from CBA

    # AI market data
    market_p25_npr          = Column(Numeric(12,2))   # 25th percentile market rate
    market_p50_npr          = Column(Numeric(12,2))
    market_p75_npr          = Column(Numeric(12,2))
    ai_benchmark_date       = Column(Date)
    ai_market_insights      = Column(JSONB, default=dict)

    status                  = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    designations            = relationship("Designation", back_populates="grade")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_grade_per_company"),
        Index("idx_grade_company", "company_id"),
        Index("idx_grade_track",   "track"),
        CheckConstraint("salary_min_npr <= salary_mid_npr", name="ck_grade_min_lte_mid"),
        CheckConstraint("salary_mid_npr <= salary_max_npr", name="ck_grade_mid_lte_max"),
    )


# ── 4. Designation ────────────────────────────────────────────
class Designation(Base):
    __tablename__ = "designations"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id          = Column(UUID(as_uuid=True), nullable=False)
    job_family_id       = Column(UUID(as_uuid=True), ForeignKey("job_families.id"))
    grade_id            = Column(UUID(as_uuid=True), ForeignKey("grade_levels.id"))

    job_code            = Column(String(30), nullable=False)
    title               = Column(String(200), nullable=False)
    title_nepali        = Column(String(200))
    description         = Column(Text)
    is_managerial       = Column(Boolean, default=False)

    # Requirements
    min_experience_years= Column(Integer, default=0)
    education_required  = Column(Text)
    skills_required     = Column(ARRAY(String), default=[])
    certifications      = Column(ARRAY(String), default=[])

    # JD
    jd_summary          = Column(Text)
    jd_full_text        = Column(Text)
    jd_ai_generated     = Column(Boolean, default=False)
    jd_ai_generated_at  = Column(DateTime)
    jd_responsibilities = Column(JSONB, default=list)
    jd_qualifications   = Column(JSONB, default=list)
    jd_competencies     = Column(JSONB, default=list)

    # Nepal law
    nepal_law_category  = Column(String(50))  # Managerial / General
    la_cba_excluded     = Column(Boolean, default=False)

    # Headcount
    budgeted_positions  = Column(Integer, default=0)
    filled_positions    = Column(Integer, default=0)

    status              = Column(Enum(EntityStatus), default=EntityStatus.ACTIVE)
    ai_insights         = Column(JSONB, default=dict)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    job_family          = relationship("JobFamily",   back_populates="designations")
    grade               = relationship("GradeLevel",  back_populates="designations")
    positions           = relationship("Position",    back_populates="designation")

    __table_args__ = (
        UniqueConstraint("company_id", "job_code", name="uq_designation_job_code"),
        Index("idx_designation_company",  "company_id"),
        Index("idx_designation_grade",    "grade_id"),
        Index("idx_designation_family",   "job_family_id"),
    )


# ── 5. Position ───────────────────────────────────────────────
class Position(Base):
    """
    Position-based org model: position exists independent of incumbent.
    One position = one role = one slot in the org chart.
    """
    __tablename__ = "positions"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id              = Column(UUID(as_uuid=True), nullable=False)
    designation_id          = Column(UUID(as_uuid=True), ForeignKey("designations.id"))
    department_id           = Column(UUID(as_uuid=True), ForeignKey("departments.id"))

    code                    = Column(String(30), nullable=False)
    title                   = Column(String(200), nullable=False)
    status                  = Column(Enum(PositionStatus), default=PositionStatus.VACANT)

    # Incumbent
    incumbent_employee_id   = Column(UUID(as_uuid=True))
    incumbent_name          = Column(String(200))
    incumbent_start_date    = Column(Date)

    # Reporting
    reports_to_position_id  = Column(UUID(as_uuid=True), ForeignKey("positions.id"))
    dotted_reports_to_id    = Column(UUID(as_uuid=True), ForeignKey("positions.id"))
    reporting_type          = Column(Enum(ReportingType), default=ReportingType.LINE)

    # Hierarchy level
    level_in_org            = Column(Integer, default=0)  # 0 = CEO, 1 = C-Suite, etc.
    direct_reports_count    = Column(Integer, default=0)

    # Succession
    has_succession_plan     = Column(Boolean, default=False)
    succession_candidates   = Column(JSONB, default=list)

    # AI analytics
    ai_attrition_risk_score = Column(Float, default=0.0)   # 0-100%
    ai_attrition_risk_level = Column(String(20))           # low/medium/high/critical
    ai_flight_risk_factors  = Column(JSONB, default=list)
    ai_analyzed_at          = Column(DateTime)

    # Budget
    is_budgeted             = Column(Boolean, default=True)
    effective_date          = Column(Date)
    close_date              = Column(Date)

    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by              = Column(UUID(as_uuid=True))

    # Relationships
    designation             = relationship("Designation", back_populates="positions")
    reports_to              = relationship("Position", remote_side=[id],
                                           foreign_keys=[reports_to_position_id],
                                           backref="direct_reports")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_position_code_per_company"),
        Index("idx_position_company",    "company_id"),
        Index("idx_position_dept",       "department_id"),
        Index("idx_position_reports_to", "reports_to_position_id"),
        Index("idx_position_status",     "status"),
        Index("idx_position_incumbent",  "incumbent_employee_id"),
        Index("idx_position_risk",       "ai_attrition_risk_score"),
    )


# ── 6. Org Chart Node (denormalized for fast rendering) ───────
class OrgChartNode(Base):
    """
    Materialized view helper — updated on every position change.
    Stores path for fast ancestor/descendant queries (using LTREE).
    """
    __tablename__ = "org_chart_nodes"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id          = Column(UUID(as_uuid=True), nullable=False)
    position_id         = Column(UUID(as_uuid=True), ForeignKey("positions.id"), nullable=False, unique=True)

    # Denormalized for fast chart rendering
    incumbent_name      = Column(String(200))
    title               = Column(String(200))
    grade_code          = Column(String(10))
    department          = Column(String(200))
    color_hex           = Column(String(10))
    avatar_initials     = Column(String(5))
    status              = Column(String(20))
    is_vacant           = Column(Boolean, default=False)
    has_dotted_line     = Column(Boolean, default=False)

    # Hierarchy
    parent_node_id      = Column(UUID(as_uuid=True), ForeignKey("org_chart_nodes.id"))
    depth               = Column(Integer, default=0)
    path                = Column(LTREE)          # e.g. "ceo.cto.em_fe.tl"
    sort_order          = Column(Integer, default=0)

    # Metrics
    total_subtree_count = Column(Integer, default=0)   # Total reports including indirect
    direct_report_count = Column(Integer, default=0)
    span_status         = Column(String(20))           # optimal / overloaded / low

    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_org_chart_company",    "company_id"),
        Index("idx_org_chart_path",       "path", postgresql_using="gist"),
        Index("idx_org_chart_parent",     "parent_node_id"),
        Index("idx_org_chart_depth",      "depth"),
    )
