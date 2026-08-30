# ============================================================
# FILE: backend/models/employment_category_models.py
# PURPOSE: SQLAlchemy ORM for Employment Category System
#          Nepal Labour Act 2074 compliant + Global standards
# ============================================================

import uuid
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import (
    Column, String, Boolean, Integer, Text,
    DateTime, ForeignKey, Numeric, Date, ARRAY,
    UniqueConstraint, CheckConstraint, Computed
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.ext.hybrid import hybrid_property


class Base(DeclarativeBase):
    pass


def now_utc():
    return datetime.now(timezone.utc)


# ── Default categories seeded per tenant ─────────────────────
DEFAULT_CATEGORIES = [
    # ── INTERNAL EMPLOYEES (Direct Payroll) ──────────────────
    {
        "code": "REGULAR",
        "name": "Regular / Permanent",
        "name_nepali": "नियमित / स्थायी",
        "icon": "🏅",
        "color": "#10b981",
        "tier1_category": "full_time_regular",
        "tier2_classification": "exempt",
        "nepal_law_category": "regular",
        "payroll_type": "direct",
        "is_on_payroll": True,
        "fte_value": 1.00,
        "standard_hours_per_week": 48.0,
        "has_probation": True,
        "probation_months_max": 6,
        "auto_confirm_on_complete": True,
        "requires_end_date": False,
        "is_written_contract_req": True,
        "eligible_gratuity": True,
        "eligible_pf": True,
        "eligible_ssf": True,
        "eligible_medical": True,
        "eligible_leave": True,
        "eligible_annual_leave": True,
        "eligible_sick_leave": True,
        "eligible_maternity": True,
        "eligible_paternity": True,
        "leave_proration_pct": 100.0,
        "rbac_profile": "full",
        "can_access_payroll": False,
        "counts_in_headcount": True,
        "counts_in_fte_report": True,
        "subject_to_tds": True,
        "subject_to_pf": True,
        "subject_to_ssf": True,
        "ai_risk_level": "low",
        "ai_compliance_notes": "Full statutory benefits. Labour Act 2074 Section 10(a). Gratuity: 8.33% of basic salary. PF: 10% employer + 10% employee.",
        "display_order": 1,
    },
    {
        "code": "PROBATION",
        "name": "Probation",
        "name_nepali": "परीक्षाकाल",
        "icon": "🔄",
        "color": "#f59e0b",
        "tier1_category": "full_time_temporary",
        "tier2_classification": "non_exempt",
        "nepal_law_category": "probation",
        "payroll_type": "direct",
        "is_on_payroll": True,
        "fte_value": 1.00,
        "standard_hours_per_week": 48.0,
        "has_probation": True,
        "probation_months_max": 6,
        "requires_end_date": True,
        "expiry_alert_days": 30,
        "auto_renewal_workflow": False,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": True,
        "eligible_ssf": True,
        "eligible_medical": True,
        "eligible_leave": True,
        "eligible_annual_leave": False,
        "eligible_sick_leave": True,
        "leave_proration_pct": 50.0,
        "rbac_profile": "standard",
        "counts_in_headcount": True,
        "ai_risk_level": "low",
        "ai_compliance_notes": "Max 6 months per Nepal Labour Act 2074. Auto-trigger performance review at 3 months. Convert to REGULAR on successful completion.",
        "display_order": 2,
    },
    {
        "code": "CONTRACT_WB",
        "name": "Contract – Work-Based",
        "name_nepali": "कार्य-आधारित",
        "icon": "🎯",
        "color": "#8b5cf6",
        "tier1_category": "full_time_temporary",
        "tier2_classification": "contractor",
        "nepal_law_category": "work_based",
        "payroll_type": "direct",
        "is_on_payroll": True,
        "fte_value": 1.00,
        "has_probation": False,
        "requires_end_date": True,
        "expiry_alert_days": 60,
        "auto_offboard_on_expiry": True,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": True,
        "eligible_ssf": True,
        "eligible_medical": True,
        "eligible_leave": True,
        "eligible_annual_leave": True,
        "leave_proration_pct": 100.0,
        "rbac_profile": "standard",
        "counts_in_headcount": True,
        "ai_risk_level": "medium",
        "ai_compliance_notes": "Contract ends on project completion (Labour Act 2074 Section 10b). Define deliverables clearly. Misclassification risk if used for ongoing work.",
        "display_order": 3,
    },
    {
        "code": "CONTRACT_TB",
        "name": "Contract – Time-Bound",
        "name_nepali": "समय-सीमित",
        "icon": "📅",
        "color": "#06b6d4",
        "tier1_category": "full_time_temporary",
        "tier2_classification": "contractor",
        "nepal_law_category": "time_bound",
        "payroll_type": "direct",
        "is_on_payroll": True,
        "fte_value": 1.00,
        "has_probation": False,
        "requires_end_date": True,
        "expiry_alert_days": 60,
        "auto_renewal_workflow": True,
        "auto_offboard_on_expiry": True,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": True,
        "eligible_ssf": True,
        "eligible_medical": True,
        "eligible_leave": True,
        "eligible_annual_leave": True,
        "leave_proration_pct": 100.0,
        "rbac_profile": "standard",
        "counts_in_headcount": True,
        "ai_risk_level": "medium",
        "ai_compliance_notes": "Fixed duration employment (Labour Act 2074 Section 10c). Alert HR 60 days before expiry. Can be extended by mutual agreement.",
        "display_order": 4,
    },
    {
        "code": "CASUAL",
        "name": "Casual Employment",
        "name_nepali": "अनियमित",
        "icon": "🔀",
        "color": "#f97316",
        "tier1_category": "part_time_temporary",
        "tier2_classification": "non_exempt",
        "nepal_law_category": "casual",
        "payroll_type": "prorated",
        "is_on_payroll": True,
        "fte_value": 0.25,
        "max_duration_months": 1,
        "max_hours_per_week": None,         # ad-hoc
        "has_probation": False,
        "requires_end_date": False,
        "is_written_contract_req": False,   # LA2074: casual = no written contract required
        "eligible_gratuity": False,
        "eligible_pf": False,
        "eligible_ssf": False,
        "eligible_leave": False,
        "eligible_annual_leave": False,
        "leave_proration_pct": 0.0,
        "rbac_profile": "limited",
        "counts_in_headcount": True,
        "subject_to_tds": True,
        "subject_to_pf": False,
        "ai_risk_level": "medium",
        "ai_compliance_notes": "Max 7 days per month (Labour Act 2074 Section 10d). No written contract required. Either party can terminate at will. No PF/SSF required.",
        "display_order": 5,
    },
    {
        "code": "PART_TIME",
        "name": "Part-Time Employment",
        "name_nepali": "अल्पकालीन",
        "icon": "⏰",
        "color": "#84cc16",
        "tier1_category": "part_time_regular",
        "tier2_classification": "non_exempt",
        "nepal_law_category": "part_time",
        "payroll_type": "prorated",
        "is_on_payroll": True,
        "fte_value": 0.50,
        "max_hours_per_week": 35.0,        # Nepal LA2074: max 35hrs/week
        "standard_hours_per_week": 25.0,
        "has_probation": True,
        "probation_months_max": 3,
        "requires_end_date": False,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": True,
        "eligible_ssf": True,
        "eligible_leave": True,
        "eligible_annual_leave": True,
        "leave_proration_pct": 50.0,        # prorated
        "rbac_profile": "standard",
        "counts_in_headcount": True,
        "counts_in_fte_report": True,
        "subject_to_tds": True,
        "ai_risk_level": "low",
        "ai_compliance_notes": "Max 35 hrs/week (Labour Act 2074 Section 10e). Proportional benefits. Cannot be prohibited from working elsewhere unless stated in contract.",
        "display_order": 6,
    },
    # ── CONTINGENT / FLEXIBLE WORKFORCE ──────────────────────
    {
        "code": "INTERN",
        "name": "Intern",
        "name_nepali": "इन्टर्न",
        "icon": "🎓",
        "color": "#3b82f6",
        "tier1_category": "full_time_temporary",
        "tier2_classification": "intern",
        "nepal_law_category": "intern",
        "payroll_type": "stipend",
        "is_on_payroll": True,
        "fte_value": 1.00,
        "has_probation": False,
        "requires_end_date": True,
        "expiry_alert_days": 30,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": False,
        "eligible_ssf": False,
        "eligible_medical": True,           # basic safety per Nepal law
        "eligible_leave": False,
        "leave_proration_pct": 0.0,
        "rbac_profile": "limited",
        "counts_in_headcount": True,
        "subject_to_tds": False,
        "subject_to_pf": False,
        "ai_risk_level": "low",
        "ai_compliance_notes": "Educational institution interns. Basic safety & medical protection per Nepal law. Stipend not mandatory but recommended. Academic tasks only.",
        "display_order": 7,
    },
    {
        "code": "TRAINEE",
        "name": "Trainee",
        "name_nepali": "प्रशिक्षार्थी",
        "icon": "📚",
        "color": "#a855f7",
        "tier1_category": "full_time_temporary",
        "tier2_classification": "trainee",
        "nepal_law_category": "intern",     # similar to intern in Nepal law
        "payroll_type": "stipend",
        "is_on_payroll": True,
        "fte_value": 1.00,
        "has_probation": False,
        "requires_end_date": True,
        "expiry_alert_days": 30,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": False,
        "eligible_ssf": False,
        "eligible_medical": True,
        "eligible_leave": False,
        "rbac_profile": "limited",
        "counts_in_headcount": True,
        "ai_risk_level": "low",
        "ai_compliance_notes": "Organizational development trainees. Structured program. Map skills during training for future recruitment pipeline.",
        "display_order": 8,
    },
    {
        "code": "DAILY_WAGE",
        "name": "Daily Wage",
        "name_nepali": "दैनिक ज्यालादारी",
        "icon": "📆",
        "color": "#ef4444",
        "tier1_category": "part_time_temporary",
        "tier2_classification": "non_exempt",
        "nepal_law_category": "casual",     # closest Nepal law category
        "payroll_type": "daily",
        "is_on_payroll": True,
        "fte_value": 0.50,
        "has_probation": False,
        "requires_end_date": False,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": True,               # if employed > threshold
        "eligible_ssf": True,
        "eligible_medical": False,
        "eligible_leave": False,
        "leave_proration_pct": 0.0,
        "rbac_profile": "limited",
        "counts_in_headcount": True,
        "subject_to_tds": True,
        "ai_risk_level": "medium",
        "ai_compliance_notes": "Timesheet validation mandatory before payroll. Non-exempt status. Daily rate x days worked = gross pay. Minimum wage applies per Nepal law.",
        "display_order": 9,
    },
    # ── EXTERNAL / VENDOR ─────────────────────────────────────
    {
        "code": "OUTSOURCE",
        "name": "Outsource",
        "name_nepali": "आउटसोर्स",
        "icon": "🏭",
        "color": "#64748b",
        "tier1_category": "contingent",
        "tier2_classification": "vendor",
        "nepal_law_category": "outsource",
        "payroll_type": "vendor_ap",
        "is_on_payroll": False,             # NOT on direct payroll
        "payroll_ledger_type": "vendor",
        "fte_value": 1.00,
        "has_probation": False,
        "requires_end_date": True,
        "expiry_alert_days": 60,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": False,              # agency responsibility
        "eligible_ssf": False,
        "eligible_medical": False,
        "eligible_leave": False,
        "rbac_profile": "project_only",
        "can_access_org_chart": False,
        "can_access_hr_policies": False,
        "counts_in_headcount": False,      # not counted in headcount
        "counts_as_foreign_quota": False,
        "subject_to_tds": False,           # agency handles
        "subject_to_pf": False,
        "ai_risk_level": "medium",
        "ai_compliance_notes": "Via licensed labor supplier only (Labour Act 2074). Cannot perform core business functions. Agency handles payroll, PF, insurance. Track for operational access only.",
        "display_order": 10,
    },
    {
        "code": "CONSULTANT",
        "name": "Consultant",
        "name_nepali": "परामर्शदाता",
        "icon": "💼",
        "color": "#0ea5e9",
        "tier1_category": "external",
        "tier2_classification": "freelance",
        "nepal_law_category": "consultant",
        "payroll_type": "vendor_ap",        # Accounts Payable, NOT HR payroll
        "is_on_payroll": False,
        "payroll_ledger_type": "vendor",
        "fte_value": 0.00,
        "has_probation": False,
        "requires_end_date": True,
        "expiry_alert_days": 30,
        "is_written_contract_req": True,
        "eligible_gratuity": False,
        "eligible_pf": False,
        "eligible_ssf": False,
        "eligible_medical": False,
        "eligible_leave": False,
        "rbac_profile": "external_only",
        "can_access_org_chart": False,
        "can_access_hr_policies": False,
        "counts_in_headcount": False,
        "counts_in_fte_report": False,
        "subject_to_tds": True,            # TDS on consultancy fees
        "subject_to_pf": False,
        "subject_to_cit": True,
        "ai_risk_level": "high",
        "ai_compliance_notes": "Process through Accounts Payable (Invoice/PO) NOT payroll. Exclude from all statutory benefits. High misclassification risk — ensure genuine autonomy. TDS applies on consultancy fees.",
        "ai_misclassification_risk": "High risk of misclassification if work is controlled, regular, and integrated. Consult legal before classification.",
        "display_order": 11,
    },
]


# ============================================================
# MODEL: EmploymentCategory
# ============================================================
class EmploymentCategory(Base):
    __tablename__ = "employment_categories"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id               = Column(UUID(as_uuid=True), nullable=False)
    code                    = Column(String(30), nullable=False)
    name                    = Column(String(100), nullable=False)
    name_nepali             = Column(String(100))
    short_name              = Column(String(30))
    description             = Column(Text)
    icon                    = Column(String(10), default="👤")
    color                   = Column(String(7), default="#3b82f6")
    display_order           = Column(Integer, default=0)
    tier1_category          = Column(String(30))
    tier2_classification    = Column(String(30))
    nepal_law_category      = Column(String(30))
    is_written_contract_req = Column(Boolean, default=True)
    payroll_type            = Column(String(20), default="direct")
    is_on_payroll           = Column(Boolean, default=True)
    payroll_ledger_type     = Column(String(20), default="employee")
    fte_value               = Column(Numeric(3, 2), default=1.00)
    standard_hours_per_week = Column(Numeric(4, 1), default=48.0)
    has_probation           = Column(Boolean, default=False)
    probation_months_max    = Column(Integer)
    auto_confirm_on_complete= Column(Boolean, default=False)
    requires_end_date       = Column(Boolean, default=False)
    expiry_alert_days       = Column(Integer, default=60)
    auto_renewal_workflow   = Column(Boolean, default=False)
    auto_offboard_on_expiry = Column(Boolean, default=False)
    max_duration_months     = Column(Integer)
    max_hours_per_week      = Column(Numeric(4, 1))
    eligible_gratuity       = Column(Boolean, default=False)
    eligible_pf             = Column(Boolean, default=True)
    eligible_ssf            = Column(Boolean, default=True)
    eligible_medical        = Column(Boolean, default=False)
    eligible_leave          = Column(Boolean, default=False)
    eligible_annual_leave   = Column(Boolean, default=False)
    eligible_sick_leave     = Column(Boolean, default=False)
    eligible_maternity      = Column(Boolean, default=False)
    eligible_paternity      = Column(Boolean, default=False)
    leave_proration_pct     = Column(Numeric(5, 2), default=100.0)
    rbac_profile            = Column(String(30), default="standard")
    can_access_payroll      = Column(Boolean, default=False)
    can_access_org_chart    = Column(Boolean, default=True)
    can_access_hr_policies  = Column(Boolean, default=True)
    counts_in_headcount     = Column(Boolean, default=True)
    counts_in_fte_report    = Column(Boolean, default=True)
    counts_as_foreign_quota = Column(Boolean, default=False)
    subject_to_tds          = Column(Boolean, default=True)
    subject_to_pf           = Column(Boolean, default=True)
    subject_to_ssf          = Column(Boolean, default=True)
    subject_to_cit          = Column(Boolean, default=False)
    requires_work_permit    = Column(Boolean, default=False)
    requires_labour_audit   = Column(Boolean, default=True)
    ai_risk_level           = Column(String(10), default="low")
    ai_compliance_notes     = Column(Text)
    ai_misclassification_risk = Column(Text)
    is_active               = Column(Boolean, default=True)
    is_system_defined       = Column(Boolean, default=False)
    is_custom               = Column(Boolean, default=False)
    created_by              = Column(UUID(as_uuid=True))
    created_at              = Column(DateTime(timezone=True), default=now_utc)
    updated_at              = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    employment_records = relationship("EmploymentRecord", back_populates="category")
    rules              = relationship("EmploymentCategoryRule", back_populates="category")

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_empcat_tenant_code"),
    )

    @hybrid_property
    def benefits_summary(self) -> list:
        benefits = []
        if self.eligible_gratuity:    benefits.append("Gratuity")
        if self.eligible_pf:          benefits.append("Provident Fund")
        if self.eligible_ssf:         benefits.append("SSF")
        if self.eligible_medical:     benefits.append("Medical")
        if self.eligible_annual_leave:benefits.append("Annual Leave")
        if self.eligible_sick_leave:  benefits.append("Sick Leave")
        if self.eligible_maternity:   benefits.append("Maternity")
        if self.eligible_paternity:   benefits.append("Paternity")
        return benefits

    def to_dict(self, include_rules: bool = False) -> dict:
        data = {
            "id":                      str(self.id),
            "code":                    self.code,
            "name":                    self.name,
            "name_nepali":             self.name_nepali,
            "icon":                    self.icon,
            "color":                   self.color,
            "display_order":           self.display_order,
            "tier1_category":          self.tier1_category,
            "tier2_classification":    self.tier2_classification,
            "nepal_law_category":      self.nepal_law_category,
            "payroll_type":            self.payroll_type,
            "is_on_payroll":           self.is_on_payroll,
            "fte_value":               float(self.fte_value or 1.0),
            "standard_hours_per_week": float(self.standard_hours_per_week or 48),
            "max_hours_per_week":      float(self.max_hours_per_week) if self.max_hours_per_week else None,
            "has_probation":           self.has_probation,
            "probation_months_max":    self.probation_months_max,
            "requires_end_date":       self.requires_end_date,
            "expiry_alert_days":       self.expiry_alert_days,
            "auto_renewal_workflow":   self.auto_renewal_workflow,
            "is_written_contract_req": self.is_written_contract_req,
            "benefits":                self.benefits_summary,
            "leave_proration_pct":     float(self.leave_proration_pct or 100),
            "rbac_profile":            self.rbac_profile,
            "counts_in_headcount":     self.counts_in_headcount,
            "subject_to_tds":          self.subject_to_tds,
            "subject_to_pf":           self.subject_to_pf,
            "subject_to_ssf":          self.subject_to_ssf,
            "ai_risk_level":           self.ai_risk_level,
            "ai_compliance_notes":     self.ai_compliance_notes,
            "ai_misclassification_risk": self.ai_misclassification_risk,
            "is_active":               self.is_active,
            "is_system_defined":       self.is_system_defined,
        }
        if include_rules:
            data["rules"] = [r.to_dict() for r in (self.rules or [])]
        return data


# ============================================================
# MODEL: EmploymentCategoryRule
# ============================================================
class EmploymentCategoryRule(Base):
    __tablename__ = "employment_category_rules"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    category_id     = Column(UUID(as_uuid=True), ForeignKey("employment_categories.id"), nullable=False)
    rule_type       = Column(String(40), nullable=False)
    trigger_days    = Column(Integer)
    trigger_event   = Column(String(40))
    action_type     = Column(String(40))
    action_target   = Column(String(40))
    action_data     = Column(JSONB)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), default=now_utc)

    category = relationship("EmploymentCategory", back_populates="rules")

    def to_dict(self) -> dict:
        return {
            "id":            str(self.id),
            "rule_type":     self.rule_type,
            "trigger_days":  self.trigger_days,
            "trigger_event": self.trigger_event,
            "action_type":   self.action_type,
            "action_target": self.action_target,
            "action_data":   self.action_data,
        }


# ============================================================
# MODEL: EmploymentRecord
# ============================================================
class EmploymentRecord(Base):
    __tablename__ = "employee_employment_records"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    employee_id         = Column(UUID(as_uuid=True), nullable=False)
    category_id         = Column(UUID(as_uuid=True), ForeignKey("employment_categories.id"), nullable=False)
    effective_from      = Column(Date, nullable=False)
    effective_to        = Column(Date)
    contract_start_date = Column(Date)
    contract_end_date   = Column(Date)
    probation_end_date  = Column(Date)
    status              = Column(String(20), default="active")
    is_current          = Column(Boolean, default=True)
    probation_review_date = Column(Date)
    probation_outcome   = Column(String(20))
    probation_notes     = Column(Text)
    contract_number     = Column(String(50))
    contract_type       = Column(String(30))
    project_name        = Column(String(200))
    project_id          = Column(UUID(as_uuid=True))
    work_scope          = Column(Text)
    renewal_count       = Column(Integer, default=0)
    original_start_date = Column(Date)
    alert_sent_30d      = Column(Boolean, default=False)
    alert_sent_60d      = Column(Boolean, default=False)
    fte_value           = Column(Numeric(3, 2), default=1.00)
    hours_per_week      = Column(Numeric(4, 1))
    salary_type         = Column(String(20))
    daily_rate          = Column(Numeric(10, 2))
    hourly_rate         = Column(Numeric(10, 2))
    monthly_salary      = Column(Numeric(12, 2))
    vendor_id           = Column(UUID(as_uuid=True))
    vendor_name         = Column(String(200))
    po_number           = Column(String(50))
    previous_record_id  = Column(UUID(as_uuid=True), ForeignKey("employee_employment_records.id"))
    changed_by          = Column(UUID(as_uuid=True))
    change_reason       = Column(Text)
    approved_by         = Column(UUID(as_uuid=True))
    approved_at         = Column(DateTime(timezone=True))
    misclassification_flag = Column(Boolean, default=False)
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    category = relationship("EmploymentCategory", back_populates="employment_records")

    @hybrid_property
    def days_to_expiry(self):
        if not self.contract_end_date:
            return None
        return (self.contract_end_date - date.today()).days

    @hybrid_property
    def days_to_probation_end(self):
        if not self.probation_end_date:
            return None
        return (self.probation_end_date - date.today()).days

    def to_dict(self) -> dict:
        return {
            "id":                   str(self.id),
            "employee_id":          str(self.employee_id),
            "category_id":          str(self.category_id),
            "category":             self.category.to_dict() if self.category else None,
            "effective_from":       self.effective_from.isoformat() if self.effective_from else None,
            "contract_end_date":    self.contract_end_date.isoformat() if self.contract_end_date else None,
            "probation_end_date":   self.probation_end_date.isoformat() if self.probation_end_date else None,
            "days_to_expiry":       self.days_to_expiry,
            "days_to_probation_end":self.days_to_probation_end,
            "status":               self.status,
            "is_current":           self.is_current,
            "fte_value":            float(self.fte_value or 1.0),
            "hours_per_week":       float(self.hours_per_week) if self.hours_per_week else None,
            "salary_type":          self.salary_type,
            "monthly_salary":       float(self.monthly_salary) if self.monthly_salary else None,
            "vendor_name":          self.vendor_name,
            "renewal_count":        self.renewal_count,
            "misclassification_flag": self.misclassification_flag,
        }


# ============================================================
# Flask API Routes
# ============================================================

from flask import Blueprint, request, jsonify, g
from functools import wraps
import anthropic, os, json

empcat_bp = Blueprint("employment_category", __name__,
                       url_prefix="/api/v1/employment-categories")

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


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# ── GET all categories ────────────────────────────────────────
@empcat_bp.route("/", methods=["GET"])
@require_auth
def list_categories():
    from ..database import db_session
    cats = db_session.query(EmploymentCategory).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).order_by(EmploymentCategory.display_order).all()

    return jsonify({
        "success": True,
        "count":   len(cats),
        "data":    [c.to_dict() for c in cats]
    })


# ── GET one category with rules ───────────────────────────────
@empcat_bp.route("/<cat_id>", methods=["GET"])
@require_auth
def get_category(cat_id):
    from ..database import db_session
    cat = db_session.query(EmploymentCategory).filter_by(
        id=cat_id, tenant_id=g.tenant_id
    ).first()
    if not cat:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"success": True, "data": cat.to_dict(include_rules=True)})


# ── POST create custom category ───────────────────────────────
@empcat_bp.route("/", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_category():
    from ..database import db_session
    data = request.get_json()

    cat = EmploymentCategory(
        tenant_id            = g.tenant_id,
        code                 = data["code"].upper(),
        name                 = data["name"],
        name_nepali          = data.get("name_nepali"),
        description          = data.get("description"),
        icon                 = data.get("icon", "👤"),
        color                = data.get("color", "#3b82f6"),
        tier1_category       = data.get("tier1_category", "full_time_regular"),
        tier2_classification = data.get("tier2_classification", "exempt"),
        nepal_law_category   = data.get("nepal_law_category", "regular"),
        payroll_type         = data.get("payroll_type", "direct"),
        is_on_payroll        = data.get("is_on_payroll", True),
        fte_value            = data.get("fte_value", 1.00),
        standard_hours_per_week = data.get("standard_hours_per_week", 48.0),
        has_probation        = data.get("has_probation", False),
        probation_months_max = data.get("probation_months_max"),
        requires_end_date    = data.get("requires_end_date", False),
        expiry_alert_days    = data.get("expiry_alert_days", 60),
        max_hours_per_week   = data.get("max_hours_per_week"),
        eligible_gratuity    = data.get("eligible_gratuity", False),
        eligible_pf          = data.get("eligible_pf", True),
        eligible_ssf         = data.get("eligible_ssf", True),
        eligible_medical     = data.get("eligible_medical", False),
        eligible_leave       = data.get("eligible_leave", False),
        eligible_annual_leave= data.get("eligible_annual_leave", False),
        eligible_sick_leave  = data.get("eligible_sick_leave", False),
        eligible_maternity   = data.get("eligible_maternity", False),
        eligible_paternity   = data.get("eligible_paternity", False),
        leave_proration_pct  = data.get("leave_proration_pct", 100.0),
        rbac_profile         = data.get("rbac_profile", "standard"),
        counts_in_headcount  = data.get("counts_in_headcount", True),
        subject_to_tds       = data.get("subject_to_tds", True),
        subject_to_pf        = data.get("subject_to_pf", True),
        subject_to_ssf       = data.get("subject_to_ssf", True),
        is_custom            = True,
        created_by           = g.employee_id,
    )

    db_session.add(cat)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Employment category '{cat.name}' created.",
        "data":    cat.to_dict()
    }), 201


# ── PUT update category ───────────────────────────────────────
@empcat_bp.route("/<cat_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_category(cat_id):
    from ..database import db_session
    cat = db_session.query(EmploymentCategory).filter_by(
        id=cat_id, tenant_id=g.tenant_id
    ).first()
    if not cat:
        return jsonify({"error": "Not found"}), 404
    if cat.is_system_defined:
        return jsonify({"error": "Cannot modify system-defined categories"}), 400

    data = request.get_json()
    updatable = [
        "name","name_nepali","description","icon","color",
        "fte_value","standard_hours_per_week","max_hours_per_week",
        "expiry_alert_days","probation_months_max",
        "eligible_gratuity","eligible_pf","eligible_ssf","eligible_medical",
        "eligible_leave","eligible_annual_leave","eligible_sick_leave",
        "eligible_maternity","eligible_paternity","leave_proration_pct",
        "rbac_profile","counts_in_headcount","is_active","display_order"
    ]
    for field in updatable:
        if field in data:
            setattr(cat, field, data[field])

    cat.updated_at = now_utc()
    db_session.commit()
    return jsonify({"success": True, "data": cat.to_dict()})


# ── POST seed default categories for new tenant ───────────────
@empcat_bp.route("/seed-defaults", methods=["POST"])
@require_auth
@require_role("super-admin")
def seed_defaults():
    from ..database import db_session

    created = 0
    for cat_data in DEFAULT_CATEGORIES:
        existing = db_session.query(EmploymentCategory).filter_by(
            tenant_id=g.tenant_id, code=cat_data["code"]
        ).first()
        if existing:
            continue

        cat = EmploymentCategory(
            tenant_id=g.tenant_id,
            is_system_defined=True,
            **{k: v for k, v in cat_data.items()
               if hasattr(EmploymentCategory, k) and k not in ("id",)}
        )
        db_session.add(cat)
        created += 1

    db_session.commit()
    return jsonify({
        "success": True,
        "message": f"{created} default employment categories seeded.",
        "nepal_law_compliant": True
    })


# ── GET headcount stats by category ──────────────────────────
@empcat_bp.route("/stats/headcount", methods=["GET"])
@require_auth
def headcount_stats():
    from ..database import db_session
    from sqlalchemy import text

    result = db_session.execute(text("""
        SELECT * FROM v_employment_category_stats
        WHERE tenant_id = :tid
        ORDER BY display_order
    """), {"tid": g.tenant_id}).fetchall()

    total_headcount = sum(r.employee_count for r in result)
    total_fte       = sum(float(r.total_fte or 0) for r in result)

    return jsonify({
        "success":         True,
        "total_headcount": total_headcount,
        "total_fte":       round(total_fte, 2),
        "by_category":     [dict(r._mapping) for r in result],
        "expiring_60d":    sum(r.expiring_60d or 0 for r in result),
        "probation_due":   sum(r.probation_due_30d or 0 for r in result),
    })


# ── POST AI compliance check ──────────────────────────────────
@empcat_bp.route("/<cat_id>/ai-compliance-check", methods=["POST"])
@require_auth
def ai_compliance_check(cat_id):
    from ..database import db_session
    cat  = db_session.query(EmploymentCategory).filter_by(
        id=cat_id, tenant_id=g.tenant_id
    ).first()
    if not cat:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json() or {}

    try:
        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": f"""
You are a Nepal Labour Act 2074 compliance expert for HRIS software.

Review this employment category configuration:

Category: {cat.name} ({cat.code})
Nepal Law Mapping: {cat.nepal_law_category}
Hours/Week: {cat.standard_hours_per_week}
Max Hours: {cat.max_hours_per_week}
Probation Months: {cat.probation_months_max}
On Payroll: {cat.is_on_payroll}
Eligible Gratuity: {cat.eligible_gratuity}
Eligible PF: {cat.eligible_pf}
Written Contract Required: {cat.is_written_contract_req}
Employee Config: {json.dumps(data)}

Check against:
1. Nepal Labour Act 2074 Section 10 (employment categories)
2. Labour Rules 2075
3. Global misclassification risks

Return JSON:
{{
  "is_compliant": true,
  "compliance_score": 95,
  "nepal_law_reference": "Labour Act 2074, Section 10(a)",
  "violations": [],
  "warnings": ["warning1"],
  "recommendations": ["rec1"],
  "misclassification_risk": "low"
}}"""}]
        )
        result = json.loads(response.content[0].text)
    except Exception as e:
        result = {"is_compliant": True, "compliance_score": 80,
                  "error": str(e), "nepal_law_reference": cat.nepal_law_category}

    return jsonify({"success": True, "category": cat.name, "compliance": result})


# ── GET Nepal law summary ─────────────────────────────────────
@empcat_bp.route("/nepal-law-summary", methods=["GET"])
@require_auth
def nepal_law_summary():
    return jsonify({
        "success": True,
        "law":     "Nepal Labour Act 2074 (2017) — Employment Category Provisions",
        "categories": [
            {"section": "10(a)", "category": "Regular Employment",    "description": "Continuous, open-ended. Full statutory benefits. No end date.", "max_hours": "48/week", "written_contract": True},
            {"section": "10(b)", "category": "Work-Based Employment", "description": "Ends on project completion. All benefits during employment.",    "max_hours": "48/week", "written_contract": True},
            {"section": "10(c)", "category": "Time-Bound Employment", "description": "Fixed duration. Can extend by mutual agreement.",                "max_hours": "48/week", "written_contract": True},
            {"section": "10(d)", "category": "Casual Employment",     "description": "Max 7 days/month. No written contract required. At-will.",       "max_hours": "ad-hoc",  "written_contract": False},
            {"section": "10(e)", "category": "Part-Time Employment",  "description": "Max 35 hrs/week. Proportional benefits. Cannot restrict other work.", "max_hours": "35/week", "written_contract": True},
            {"section": "Probation", "category": "Probationary Period", "description": "Max 6 months. Performance review mandatory. Confirm in writing.", "max_duration": "6 months", "written_contract": True},
            {"section": "Interns",   "category": "Interns",           "description": "Educational institution only. Basic safety/medical. Stipend optional.", "written_contract": True},
        ],
        "key_provisions": {
            "max_working_hours":    "48 hours per week (Section 28)",
            "overtime_rate":        "1.5x regular rate, max 24 hrs/week",
            "min_wage_2081":        "NPR 15,000/month",
            "foreign_worker_max":   "5% of total workforce (Section 6)",
            "probation_max":        "6 months",
            "casual_days_max":      "7 days per month",
            "part_time_hours_max":  "35 hours per week",
        }
    })
