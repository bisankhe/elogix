"""
eLogix HRMS — Structure & Hierarchy Models
Covers ALL structure modules from Excel requirement:
  Employment Category (13 types) | Designation Setup | Grade & Level |
  Reporting Hierarchy | Organization Chart | Position Management
Nepal Labour Act 2074 compliant. AI-driven.
"""

from __future__     import annotations
from datetime       import datetime, date
from decimal        import Decimal
from sqlalchemy     import (Column, String, Boolean, Integer, Float, Text,
                            Date, DateTime, ForeignKey, Enum, DECIMAL, JSON,
                            Index, CheckConstraint, UniqueConstraint, event)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.types import UserDefinedType

# Custom LTREE type definition for PostgreSQL
class LTREE(UserDefinedType):
    def get_col_spec(self, **kw):
        return "LTREE"
import uuid, enum

try:
    from .org_models import Base, AuditMixin, gen_uuid, now
except ImportError:
    class Base:
        pass
    class AuditMixin:
        created_at  = Column(DateTime, default=datetime.utcnow)
        updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        is_deleted  = Column(Boolean, default=False)
        ai_metadata = Column(JSONB, default=dict)
    def gen_uuid(): return str(uuid.uuid4())
    def now(): return datetime.utcnow()

# ──────────────────────────────────────────────────────────────────────────────
# 10. EMPLOYMENT CATEGORY (13 types from Excel)
# ──────────────────────────────────────────────────────────────────────────────

class EmpCatEnum(str, enum.Enum):
    regular        = "regular"       # Permanent
    probation      = "probation"
    work_based     = "work_based"    # Contract - work based
    time_bound     = "time_bound"    # Contract - time bound
    casual         = "casual"
    part_time      = "part_time"
    intern         = "intern"
    trainee        = "trainee"
    daily_wage     = "daily_wage"
    outsource      = "outsource"
    consultant     = "consultant"

# Seed data for all 13 employment categories per Labour Act 2074 + Excel
EMPLOYMENT_CATEGORY_SEEDS = [
    # code, name, nepali, tier2, la_section, statutory_benefits, max_hrs, max_days, ai_notes
    {
        "code": "REG", "name": "Regular / Permanent", "name_nepali": "नियमित / स्थायी",
        "tier2": "permanent", "la_section": "Section 10(a)", "la_type": "regular",
        "written_contract_required": True, "max_probation_months": 6,
        "pf_eligible": True, "ssf_eligible": True, "gratuity_eligible": True,
        "medical_eligible": True, "annual_leave_days": 18, "sick_leave_days": 12,
        "maternity_eligible": True, "paternity_eligible": True, "cba_eligible": True,
        "max_daily_hrs": 8, "max_weekly_hrs": 48,
        "termination_notice_days": 30,
        "ai_compliance_notes": "Full Labour Act 2074 benefits mandatory. PF 10% employer + 10% employee. SSF 3.33% employer. Gratuity after 1yr continuous service. Minimum wage NPR 15,000/month.",
        "ai_risk_level": "low",
        "statutory_color": "#10b981",
    },
    {
        "code": "PROB", "name": "Probation", "name_nepali": "परीक्षाकाल",
        "tier2": "probation", "la_section": "Section 10", "la_type": "probation",
        "written_contract_required": True, "max_probation_months": 6,
        "pf_eligible": True, "ssf_eligible": True, "gratuity_eligible": False,
        "medical_eligible": True, "annual_leave_days": 0, "sick_leave_days": 6,
        "maternity_eligible": True, "paternity_eligible": True, "cba_eligible": False,
        "max_daily_hrs": 8, "max_weekly_hrs": 48,
        "termination_notice_days": 0,
        "ai_compliance_notes": "Must confirm or terminate within 6 months. Auto-alert at 5 months. Cannot extend probation beyond 6 months per Nepal law. PF and SSF required from day 1.",
        "ai_risk_level": "medium",
        "statutory_color": "#f59e0b",
    },
    {
        "code": "CONTRACT-WB", "name": "Contract - Work Based", "name_nepali": "कार्य-आधारित अनुबन्ध",
        "tier2": "contractor", "la_section": "Section 10(b)", "la_type": "work_based",
        "written_contract_required": True, "max_probation_months": 3,
        "pf_eligible": True, "ssf_eligible": True, "gratuity_eligible": True,
        "medical_eligible": True, "annual_leave_days": 18, "sick_leave_days": 12,
        "maternity_eligible": True, "paternity_eligible": True, "cba_eligible": False,
        "max_daily_hrs": 8, "max_weekly_hrs": 48,
        "termination_notice_days": 15,
        "ai_compliance_notes": "Contract ends on completion of defined deliverable. Must define deliverables clearly in contract. Misclassification risk if work is ongoing in nature.",
        "ai_risk_level": "medium",
        "statutory_color": "#8b5cf6",
    },
    {
        "code": "CONTRACT-TB", "name": "Contract - Time Bound", "name_nepali": "समय-सीमित अनुबन्ध",
        "tier2": "contractor", "la_section": "Section 10(c)", "la_type": "time_bound",
        "written_contract_required": True, "max_probation_months": 3,
        "pf_eligible": True, "ssf_eligible": True, "gratuity_eligible": True,
        "medical_eligible": True, "annual_leave_days": 18, "sick_leave_days": 12,
        "maternity_eligible": True, "paternity_eligible": True, "cba_eligible": False,
        "max_daily_hrs": 8, "max_weekly_hrs": 48,
        "termination_notice_days": 15,
        "ai_compliance_notes": "Fixed end date. Auto-alert HR 60 days before expiry. Can extend by mutual written agreement. Cannot be used to avoid permanent employment if role is continuous.",
        "ai_risk_level": "low",
        "statutory_color": "#06b6d4",
    },
    {
        "code": "CASUAL", "name": "Casual", "name_nepali": "अनियमित",
        "tier2": "casual", "la_section": "Section 10(d)", "la_type": "casual",
        "written_contract_required": False, "max_probation_months": 0,
        "pf_eligible": False, "ssf_eligible": False, "gratuity_eligible": False,
        "medical_eligible": False, "annual_leave_days": 0, "sick_leave_days": 0,
        "maternity_eligible": False, "paternity_eligible": False, "cba_eligible": False,
        "max_daily_hrs": 8, "max_weekly_hrs": 48, "max_days_per_month": 7,
        "termination_notice_days": 0,
        "ai_compliance_notes": "Maximum 7 days per month per Labour Act 2074 Section 10(d). Alert if employee exceeds 7 days - auto-converts to regular employment risk. No written contract required. Only category without contract.",
        "ai_risk_level": "high",
        "statutory_color": "#ef4444",
    },
    {
        "code": "PT", "name": "Part-Time", "name_nepali": "अंशकालिक",
        "tier2": "part_time", "la_section": "Section 10(e)", "la_type": "part_time",
        "written_contract_required": True, "max_probation_months": 3,
        "pf_eligible": True, "ssf_eligible": True, "gratuity_eligible": True,
        "medical_eligible": True, "annual_leave_days": 9, "sick_leave_days": 6,
        "maternity_eligible": True, "paternity_eligible": True, "cba_eligible": True,
        "max_daily_hrs": 4, "max_weekly_hrs": 35,
        "termination_notice_days": 15,
        "ai_compliance_notes": "Max 35 hours/week per Nepal law. Benefits prorated based on hours. Cannot restrict from other employment without written agreement. PF/SSF prorated.",
        "ai_risk_level": "low",
        "statutory_color": "#84cc16",
    },
    {
        "code": "INTERN", "name": "Intern", "name_nepali": "इन्टर्न",
        "tier2": "intern", "la_section": "N/A (institutional attachment)", "la_type": "intern",
        "written_contract_required": True, "max_probation_months": 0,
        "pf_eligible": False, "ssf_eligible": False, "gratuity_eligible": False,
        "medical_eligible": True, "annual_leave_days": 0, "sick_leave_days": 0,
        "maternity_eligible": False, "paternity_eligible": False, "cba_eligible": False,
        "max_daily_hrs": 8, "max_weekly_hrs": 40, "max_duration_months": 6,
        "termination_notice_days": 7,
        "ai_compliance_notes": "Educational institution attachment. Basic safety & medical protection mandatory. Stipend not legally required but recommended. Academic tasks only - cannot replace regular employee roles.",
        "ai_risk_level": "medium",
        "statutory_color": "#a78bfa",
    },
    {
        "code": "TRAINEE", "name": "Trainee", "name_nepali": "तालिम लिने",
        "tier2": "trainee", "la_section": "Section 10", "la_type": "trainee",
        "written_contract_required": True, "max_probation_months": 0,
        "pf_eligible": False, "ssf_eligible": True, "gratuity_eligible": False,
        "medical_eligible": True, "annual_leave_days": 0, "sick_leave_days": 6,
        "maternity_eligible": False, "paternity_eligible": False, "cba_eligible": False,
        "max_daily_hrs": 8, "max_weekly_hrs": 48, "max_duration_months": 12,
        "termination_notice_days": 7,
        "ai_compliance_notes": "Organizational development trainees. Structured training program required. Track skills for future recruitment pipeline. SSF contribution recommended.",
        "ai_risk_level": "low",
        "statutory_color": "#d946ef",
    },
    {
        "code": "DW", "name": "Daily Wage", "name_nepali": "दैनिक ज्यालादारी",
        "tier2": "daily_wage", "la_section": "Section 10(d)", "la_type": "daily_wage",
        "written_contract_required": False, "max_probation_months": 0,
        "pf_eligible": False, "ssf_eligible": False, "gratuity_eligible": False,
        "medical_eligible": False, "annual_leave_days": 0, "sick_leave_days": 0,
        "maternity_eligible": False, "paternity_eligible": False, "cba_eligible": False,
        "max_daily_hrs": 8, "max_weekly_hrs": 48,
        "termination_notice_days": 0,
        "ai_compliance_notes": "Paid per day of work. Minimum daily wage = NPR 15,000/26 = NPR 577/day. Similar to casual but typically for construction/labor work. Monitor for conversion risk if regular attendance.",
        "ai_risk_level": "high",
        "statutory_color": "#f97316",
    },
    {
        "code": "OUT", "name": "Outsource", "name_nepali": "आउटसोर्स",
        "tier2": "vendor", "la_section": "Section 52-60 (Outsourcing)", "la_type": "outsource",
        "written_contract_required": False, "max_probation_months": 0,
        "pf_eligible": False, "ssf_eligible": False, "gratuity_eligible": False,
        "medical_eligible": False, "annual_leave_days": 0, "sick_leave_days": 0,
        "maternity_eligible": False, "paternity_eligible": False, "cba_eligible": False,
        "max_daily_hrs": None, "max_weekly_hrs": None,
        "termination_notice_days": 0,
        "ai_compliance_notes": "NOT on company payroll. Managed by licensed MoLESS agency. Only non-core work allowed (security, housekeeping, catering, support). Main employer co-liable if agency fails to pay. Cannot use for core business functions.",
        "ai_risk_level": "high",
        "statutory_color": "#dc2626",
    },
    {
        "code": "CONSULT", "name": "Consultant", "name_nepali": "परामर्शदाता",
        "tier2": "freelance", "la_section": "N/A (Service Agreement)", "la_type": "consultant",
        "written_contract_required": True, "max_probation_months": 0,
        "pf_eligible": False, "ssf_eligible": False, "gratuity_eligible": False,
        "medical_eligible": False, "annual_leave_days": 0, "sick_leave_days": 0,
        "maternity_eligible": False, "paternity_eligible": False, "cba_eligible": False,
        "max_daily_hrs": None, "max_weekly_hrs": None,
        "termination_notice_days": 30,
        "ai_compliance_notes": "Process through Accounts Payable (Invoice/PO) NOT payroll. TDS deductible on consultancy fees. High misclassification risk if work is controlled, regular, and integrated. Must demonstrate genuine autonomy.",
        "ai_risk_level": "high",
        "statutory_color": "#64748b",
    },
]

class EmploymentCategory(AuditMixin, Base):
    """
    Master employment category. Populated with 11 types per Nepal Labour Act 2074
    and organizational need (intern, trainee, daily wage, consultant added beyond
    the 5 statutory types for completeness).
    """
    __tablename__ = "employment_categories"

    id                  = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id          = Column(UUID(as_uuid=False), nullable=True)  # null = global seed
    code                = Column(String(30), nullable=False)
    name                = Column(String(100), nullable=False)
    name_nepali         = Column(String(100))
    la_type             = Column(Enum(EmpCatEnum), nullable=False)
    la_section          = Column(String(100))
    tier2_classification= Column(String(50))  # permanent/contractor/casual/vendor/intern/etc.

    # Contract Requirements
    written_contract_required = Column(Boolean, default=True)
    max_probation_months      = Column(Integer, default=0)
    max_duration_months       = Column(Integer)         # for fixed-term categories
    max_days_per_month        = Column(Integer)         # for casual
    termination_notice_days   = Column(Integer, default=0)

    # Statutory Benefits (Nepal Labour Act 2074)
    pf_eligible         = Column(Boolean, default=False)   # Provident Fund
    ssf_eligible        = Column(Boolean, default=False)   # Social Security Fund
    gratuity_eligible   = Column(Boolean, default=False)
    medical_eligible    = Column(Boolean, default=False)
    annual_leave_days   = Column(Integer, default=0)
    sick_leave_days     = Column(Integer, default=0)
    maternity_eligible  = Column(Boolean, default=False)
    paternity_eligible  = Column(Boolean, default=False)
    cba_eligible        = Column(Boolean, default=False)   # Collective Bargaining

    # Working Hours
    max_daily_hrs       = Column(Float)
    max_weekly_hrs      = Column(Float)

    # UI / Classification
    statutory_color     = Column(String(7), default="#64748b")
    is_active           = Column(Boolean, default=True)
    is_system           = Column(Boolean, default=False)  # seed data, not deletable
    sort_order          = Column(Integer, default=0)

    # AI
    ai_compliance_notes      = Column(Text)
    ai_risk_level            = Column(String(20))  # low/medium/high
    ai_misclassification_risk= Column(Text)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_emp_cat_code"),
        Index("idx_emp_cat_la_type",  "la_type"),
        Index("idx_emp_cat_company",  "company_id"),
        Index("idx_emp_cat_active",   "is_active"),
    )

    def to_dict(self):
        return {
            "id": self.id, "code": self.code,
            "name": self.name, "name_nepali": self.name_nepali,
            "la_type": self.la_type.value if self.la_type else None,
            "la_section": self.la_section,
            "tier2_classification": self.tier2_classification,
            "written_contract_required": self.written_contract_required,
            "max_probation_months": self.max_probation_months,
            "max_duration_months": self.max_duration_months,
            "max_days_per_month": self.max_days_per_month,
            "termination_notice_days": self.termination_notice_days,
            "pf_eligible": self.pf_eligible, "ssf_eligible": self.ssf_eligible,
            "gratuity_eligible": self.gratuity_eligible,
            "medical_eligible": self.medical_eligible,
            "annual_leave_days": self.annual_leave_days,
            "sick_leave_days": self.sick_leave_days,
            "maternity_eligible": self.maternity_eligible,
            "cba_eligible": self.cba_eligible,
            "max_daily_hrs": self.max_daily_hrs, "max_weekly_hrs": self.max_weekly_hrs,
            "statutory_color": self.statutory_color,
            "ai_compliance_notes": self.ai_compliance_notes,
            "ai_risk_level": self.ai_risk_level,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 11. DESIGNATION SETUP
# ──────────────────────────────────────────────────────────────────────────────
class JobFamily(AuditMixin, Base):
    """Job Family grouping for designations (e.g., Engineering, Finance, HR)."""
    __tablename__ = "job_families"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id  = Column(UUID(as_uuid=False), nullable=False)
    code        = Column(String(20), nullable=False)
    name        = Column(String(100), nullable=False)
    name_nepali = Column(String(100))
    description = Column(Text)
    is_active   = Column(Boolean, default=True)

    designations= relationship("Designation", back_populates="job_family", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_jf_code"),
        Index("idx_jf_company", "company_id"),
    )

    def to_dict(self):
        return {"id": self.id, "code": self.code, "name": self.name,
                "name_nepali": self.name_nepali, "is_active": self.is_active}

class Designation(AuditMixin, Base):
    """
    Job title / designation with grade mapping and AI JD generation.
    Links to GradeLevel for compensation banding.
    """
    __tablename__ = "designations"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), nullable=False)
    job_family_id   = Column(UUID(as_uuid=False), ForeignKey("job_families.id"), nullable=True)
    grade_level_id  = Column(UUID(as_uuid=False), ForeignKey("grade_levels.id"), nullable=True)
    parent_desig_id = Column(UUID(as_uuid=False), ForeignKey("designations.id"), nullable=True)

    code            = Column(String(30), nullable=False)
    name            = Column(String(200), nullable=False)
    name_nepali     = Column(String(200))
    level           = Column(Integer)               # hierarchy level 1=top
    category        = Column(String(50))            # executive/managerial/staff/worker
    is_managerial   = Column(Boolean, default=False)
    is_executive    = Column(Boolean, default=False)
    is_supervisory  = Column(Boolean, default=False)

    # Headcount
    approved_positions = Column(Integer, default=0)
    filled_positions   = Column(Integer, default=0)
    vacancy_count      = Column(Integer, default=0)

    # Job Description
    jd_summary      = Column(Text)
    jd_responsibilities = Column(JSONB, default=list)
    jd_qualifications   = Column(JSONB, default=list)
    jd_skills           = Column(ARRAY(String))
    jd_experience_years = Column(Integer)
    jd_education_level  = Column(String(100))

    # AI
    ai_jd_generated      = Column(Boolean, default=False)
    ai_jd_content        = Column(JSONB, default=dict)   # full AI-generated JD
    ai_salary_benchmark  = Column(JSONB, default=dict)   # market salary data
    ai_skill_gap_report  = Column(JSONB, default=dict)

    status          = Column(String(20), default="active")
    is_active       = Column(Boolean, default=True)

    job_family  = relationship("JobFamily", back_populates="designations")
    grade_level = relationship("GradeLevel", back_populates="designations")
    parent_desig= relationship("Designation", remote_side="Designation.id")
    positions   = relationship("Position", back_populates="designation", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_desig_code"),
        Index("idx_desig_company",    "company_id"),
        Index("idx_desig_jf",         "job_family_id"),
        Index("idx_desig_grade",      "grade_level_id"),
        Index("idx_desig_level",      "level"),
    )

    @property
    def fill_rate(self):
        if self.approved_positions and self.approved_positions > 0:
            return round(self.filled_positions / self.approved_positions * 100, 1)
        return 0.0

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "job_family_id": self.job_family_id, "grade_level_id": self.grade_level_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "level": self.level, "category": self.category,
            "is_managerial": self.is_managerial, "is_executive": self.is_executive,
            "approved_positions": self.approved_positions,
            "filled_positions": self.filled_positions,
            "vacancy_count": self.vacancy_count, "fill_rate": self.fill_rate,
            "jd_summary": self.jd_summary, "jd_skills": self.jd_skills or [],
            "jd_experience_years": self.jd_experience_years,
            "ai_jd_generated": self.ai_jd_generated,
            "ai_salary_benchmark": self.ai_salary_benchmark or {},
            "status": self.status,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 12. GRADE & LEVEL
# ──────────────────────────────────────────────────────────────────────────────
class GradeLevel(AuditMixin, Base):
    """
    Salary grade / pay band system.
    Supports Nepal government grade structure and private sector bands.
    """
    __tablename__ = "grade_levels"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), nullable=False)

    code            = Column(String(20), nullable=False)
    name            = Column(String(100), nullable=False)
    name_nepali     = Column(String(100))
    grade_number    = Column(Integer)                  # numeric grade (1-20, etc.)
    level_order     = Column(Integer)                  # 1 = highest
    category        = Column(String(50))               # executive/senior/middle/junior/staff

    # Salary Band (NPR)
    salary_min      = Column(DECIMAL(12,2), nullable=False)
    salary_mid      = Column(DECIMAL(12,2))
    salary_max      = Column(DECIMAL(12,2), nullable=False)
    currency        = Column(String(3), default="NPR")

    # Benefits Matrix
    pf_pct_employer       = Column(Float, default=10.0)  # 10% Nepal law
    pf_pct_employee       = Column(Float, default=10.0)
    ssf_pct_employer      = Column(Float, default=3.33)  # 3.33% Nepal law
    gratuity_pct          = Column(Float, default=8.33)  # 8.33% (1/12 of annual salary)
    annual_bonus_months   = Column(Float, default=1.0)   # months of salary as bonus
    medical_allowance_npr = Column(DECIMAL(10,2))
    festival_bonus_pct    = Column(Float, default=100.0) # 100% = one month

    # Progression
    increment_pct_min    = Column(Float, default=5.0)
    increment_pct_max    = Column(Float, default=15.0)
    promotion_criteria   = Column(JSONB, default=dict)

    # AI
    ai_market_benchmark  = Column(JSONB, default=dict)   # market P25/P50/P75
    ai_competitiveness   = Column(String(20))            # below/at/above market
    ai_insights          = Column(JSONB, default=dict)

    is_active       = Column(Boolean, default=True)

    designations    = relationship("Designation", back_populates="grade_level", lazy="dynamic")
    positions       = relationship("Position", back_populates="grade_level", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_grade_code"),
        Index("idx_grade_company", "company_id"),
        Index("idx_grade_order",   "level_order"),
        CheckConstraint("salary_min <= salary_max", name="ck_salary_band"),
        CheckConstraint("salary_min >= 15000", name="ck_nepal_min_wage"),
    )

    @property
    def salary_spread(self):
        if self.salary_min and self.salary_max:
            return round((float(self.salary_max) - float(self.salary_min)) / float(self.salary_min) * 100, 1)
        return 0.0

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "code": self.code, "name": self.name, "name_nepali": self.name_nepali,
            "grade_number": self.grade_number, "level_order": self.level_order,
            "category": self.category,
            "salary_min": str(self.salary_min), "salary_mid": str(self.salary_mid) if self.salary_mid else None,
            "salary_max": str(self.salary_max), "currency": self.currency,
            "salary_spread": self.salary_spread,
            "pf_pct_employer": self.pf_pct_employer, "pf_pct_employee": self.pf_pct_employee,
            "ssf_pct_employer": self.ssf_pct_employer,
            "gratuity_pct": self.gratuity_pct,
            "annual_bonus_months": self.annual_bonus_months,
            "increment_pct_min": self.increment_pct_min,
            "increment_pct_max": self.increment_pct_max,
            "ai_market_benchmark": self.ai_market_benchmark or {},
            "ai_competitiveness": self.ai_competitiveness, "is_active": self.is_active,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 13. REPORTING HIERARCHY
# ──────────────────────────────────────────────────────────────────────────────
class ReportingRelationship(AuditMixin, Base):
    """
    Employee-to-employee reporting lines. Supports:
    - Direct line reporting
    - Dotted-line (matrix)
    - Project-based
    AI attrition risk analysis based on span of control.
    """
    __tablename__ = "reporting_relationships"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), nullable=False)
    employee_id     = Column(UUID(as_uuid=False), nullable=False)
    manager_id      = Column(UUID(as_uuid=False), nullable=False)
    relationship_type = Column(String(30), default="direct")  # direct/dotted_line/project
    is_primary      = Column(Boolean, default=True)
    effective_from  = Column(Date, nullable=False)
    effective_to    = Column(Date)
    reason          = Column(String(200))
    status          = Column(String(20), default="active")
    ai_risk_notes   = Column(Text)

    __table_args__ = (
        Index("idx_rr_employee",  "employee_id"),
        Index("idx_rr_manager",   "manager_id"),
        Index("idx_rr_company",   "company_id"),
        Index("idx_rr_type",      "relationship_type"),
    )

    def to_dict(self):
        return {
            "id": self.id, "employee_id": self.employee_id, "manager_id": self.manager_id,
            "relationship_type": self.relationship_type, "is_primary": self.is_primary,
            "effective_from": str(self.effective_from),
            "effective_to": str(self.effective_to) if self.effective_to else None,
            "status": self.status,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 14. ORGANIZATION CHART (Nodes)
# ──────────────────────────────────────────────────────────────────────────────
class OrgChartNode(AuditMixin, Base):
    """
    Organization chart node. Each node = one box in the org chart.
    Uses PostgreSQL LTREE for efficient hierarchy traversal.
    """
    __tablename__ = "org_chart_nodes"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id      = Column(UUID(as_uuid=False), nullable=False)
    parent_node_id  = Column(UUID(as_uuid=False), ForeignKey("org_chart_nodes.id"), nullable=True)

    node_type       = Column(String(30), nullable=False)  # company/group/bu/dept/section/team/position
    entity_id       = Column(UUID(as_uuid=False))         # FK to the actual entity
    entity_name     = Column(String(200), nullable=False)
    entity_code     = Column(String(30))
    path            = Column(LTREE)                        # e.g. "ROOT.BU1.DEPT2.TEAM1"
    depth           = Column(Integer, default=0)
    sort_order      = Column(Integer, default=0)

    # Display
    display_title   = Column(String(200))
    display_subtitle= Column(String(200))
    position_count  = Column(Integer, default=0)
    employee_count  = Column(Integer, default=0)
    avatar_url      = Column(String(500))
    color_code      = Column(String(7))

    is_visible      = Column(Boolean, default=True)
    is_collapsed    = Column(Boolean, default=False)

    parent_node = relationship("OrgChartNode", remote_side="OrgChartNode.id")

    __table_args__ = (
        Index("idx_ocn_company", "company_id"),
        Index("idx_ocn_parent",  "parent_node_id"),
        Index("idx_ocn_type",    "node_type"),
        Index("idx_ocn_path",    "path", postgresql_using="gist"),
    )

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "parent_node_id": self.parent_node_id, "node_type": self.node_type,
            "entity_id": self.entity_id, "entity_name": self.entity_name,
            "entity_code": self.entity_code,
            "path": str(self.path) if self.path else None,
            "depth": self.depth, "sort_order": self.sort_order,
            "display_title": self.display_title, "display_subtitle": self.display_subtitle,
            "position_count": self.position_count, "employee_count": self.employee_count,
            "is_visible": self.is_visible,
        }

# ──────────────────────────────────────────────────────────────────────────────
# 15. POSITION MANAGEMENT
# ──────────────────────────────────────────────────────────────────────────────
class Position(AuditMixin, Base):
    """
    Approved position / headcount slot.
    One position = one budgeted seat in the organization.
    May be filled (has incumbent_id) or vacant.
    """
    __tablename__ = "positions"

    id                  = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    company_id          = Column(UUID(as_uuid=False), nullable=False)
    designation_id      = Column(UUID(as_uuid=False), ForeignKey("designations.id"), nullable=False)
    grade_level_id      = Column(UUID(as_uuid=False), ForeignKey("grade_levels.id"), nullable=True)
    department_id       = Column(UUID(as_uuid=False), nullable=True)
    branch_id           = Column(UUID(as_uuid=False), nullable=True)
    cost_center_id      = Column(UUID(as_uuid=False), nullable=True)
    reports_to_position_id = Column(UUID(as_uuid=False), ForeignKey("positions.id"), nullable=True)

    position_code       = Column(String(30), nullable=False, unique=True)
    position_title      = Column(String(200), nullable=False)

    # Status
    status              = Column(String(30), default="vacant")  # vacant/filled/on_hold/eliminated
    incumbent_id        = Column(UUID(as_uuid=False))            # current employee
    incumbent_name      = Column(String(200))
    filled_date         = Column(Date)
    employment_category = Column(String(30))                     # FK to EmploymentCategory.code

    # Budget
    approved_salary_min = Column(DECIMAL(12,2))
    approved_salary_max = Column(DECIMAL(12,2))
    budget_code         = Column(String(50))
    headcount_type      = Column(String(20), default="permanent")  # permanent/contract/temp

    # FTE
    fte                 = Column(Float, default=1.0)             # 1.0=full-time, 0.5=half-time
    is_critical         = Column(Boolean, default=False)
    succession_ready    = Column(Boolean, default=False)
    succession_candidate_id = Column(UUID(as_uuid=False))

    # AI
    ai_vacancy_risk     = Column(String(20))        # low/medium/high
    ai_time_to_fill_est = Column(Integer)            # estimated days
    ai_insights         = Column(JSONB, default=dict)

    effective_from      = Column(Date)
    effective_to        = Column(Date)
    approved_by         = Column(UUID(as_uuid=False))
    approved_at         = Column(DateTime)

    designation         = relationship("Designation", back_populates="positions")
    grade_level         = relationship("GradeLevel",  back_populates="positions")
    reports_to          = relationship("Position", remote_side="Position.id")

    __table_args__ = (
        Index("idx_pos_company",     "company_id"),
        Index("idx_pos_designation", "designation_id"),
        Index("idx_pos_dept",        "department_id"),
        Index("idx_pos_status",      "status"),
        Index("idx_pos_incumbent",   "incumbent_id"),
        CheckConstraint("fte > 0 AND fte <= 1", name="ck_pos_fte"),
    )

    def to_dict(self):
        return {
            "id": self.id, "company_id": self.company_id,
            "designation_id": self.designation_id, "grade_level_id": self.grade_level_id,
            "department_id": self.department_id, "branch_id": self.branch_id,
            "position_code": self.position_code, "position_title": self.position_title,
            "status": self.status, "incumbent_id": self.incumbent_id,
            "incumbent_name": self.incumbent_name,
            "employment_category": self.employment_category,
            "approved_salary_min": str(self.approved_salary_min) if self.approved_salary_min else None,
            "approved_salary_max": str(self.approved_salary_max) if self.approved_salary_max else None,
            "fte": self.fte, "is_critical": self.is_critical,
            "succession_ready": self.succession_ready,
            "ai_vacancy_risk": self.ai_vacancy_risk,
            "ai_time_to_fill_est": self.ai_time_to_fill_est,
            "effective_from": str(self.effective_from) if self.effective_from else None,
        }
     
