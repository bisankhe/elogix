"""
FILE: backend/models/workforce_config_models.py
NepHR Pro — Workforce Configuration Models
COVERS:
  1. EmploymentTypeConfig  — Insource employment type overrides
  2. OutsourceVendor       — MoLESS-licensed labour supplier agencies
  3. SLAContract           — Service Level Agreements with vendors
  4. SLAKPIResult          — Monthly KPI tracking per contract
  5. VendorEmployee        — Extended workforce (NOT on main payroll)
  6. VendorInvoice         — Billing & Invoice with AI cross-validation
  7. VendorAttendance      — Clock-in/out + ghost worker detection
  8. VendorPerformanceCard — Monthly AI-generated vendor scorecard
Nepal Labour Act 2074, Sections 52–60 enforced at model level.
"""

from __future__ import annotations
from datetime import datetime, date, time as time_type
from decimal import Decimal
import uuid
import enum

from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Text, Date, DateTime,
    Numeric, Time, ForeignKey, Enum as SAEnum, Index,
    CheckConstraint, UniqueConstraint, event
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY


# ── Standalone Base (no external import dependency) ───────────
class Base(DeclarativeBase):
    pass


def _uuid():
    return str(uuid.uuid4())

def _now():
    return datetime.utcnow()


# ── Enums ─────────────────────────────────────────────────────

class InsourceTypeEnum(str, enum.Enum):
    REGULAR      = "regular"
    PROBATION    = "probation"
    TIME_BASED   = "contract_time_based"
    WORK_BASED   = "contract_work_based"
    PART_TIME    = "part_time"
    CASUAL       = "casual"
    INTERN       = "intern"
    TRAINEE      = "trainee"
    DAILY_WAGE   = "daily_wage"
    OUTSOURCE    = "outsource"
    CONSULTANT   = "consultant"

class ContractStatusEnum(str, enum.Enum):
    DRAFT        = "draft"
    ACTIVE       = "active"
    RENEWAL_DUE  = "renewal_due"
    EXPIRED      = "expired"
    TERMINATED   = "terminated"

class InvoiceStatusEnum(str, enum.Enum):
    DRAFT              = "draft"
    SUBMITTED          = "submitted"
    PENDING_APPROVAL   = "pending_approval"
    APPROVED           = "approved"
    DISPUTED           = "disputed"
    PAID               = "paid"
    REJECTED           = "rejected"

class RiskLevelEnum(str, enum.Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


# ── Audit mixin ───────────────────────────────────────────────

class AuditMixin:
    created_at  = Column(DateTime, default=_now, nullable=False)
    updated_at  = Column(DateTime, default=_now, onupdate=_now, nullable=False)
    created_by  = Column(UUID(as_uuid=False), nullable=True)
    is_deleted  = Column(Boolean, default=False, nullable=False)
    deleted_at  = Column(DateTime, nullable=True)
    ai_metadata = Column(JSONB, default=dict)


# ═══════════════════════════════════════════════════════════════
# 1. EMPLOYMENT TYPE CONFIG  (Insource)
# ═══════════════════════════════════════════════════════════════

class EmploymentTypeConfig(AuditMixin, Base):
    """
    Per-company configuration for each insource employment type.
    Allows overriding Nepal law defaults with company-specific values,
    subject to Labour Act 2074 floor limits.
    """
    __tablename__ = "employment_type_configs"

    id                         = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id                 = Column(UUID(as_uuid=False), nullable=False)
    emp_category_code          = Column(String(30),  nullable=False)      # REG / PROB / PT etc.

    insource_type              = Column(SAEnum(InsourceTypeEnum), nullable=False)
    is_enabled                 = Column(Boolean,  default=True)
    custom_name                = Column(String(200))

    # Nepal-law-bounded overrides
    probation_months_override  = Column(Integer)       # MUST be <= 6
    notice_period_days         = Column(Integer,  default=30)
    min_wage_override_npr      = Column(Numeric(12, 2))  # MUST be >= 15000
    auto_alert_days_before     = Column(Integer,  default=30)

    # JSON {benefit_name: true/false} — company-specific eligibility tweaks
    benefits_matrix_override   = Column(JSONB,  default=dict)

    # AI
    ai_misclassification_risk  = Column(Float,  default=0.0)
    ai_compliance_notes        = Column(JSONB,  default=dict)

    __table_args__ = (
        UniqueConstraint("company_id", "emp_category_code", name="uq_etc_per_company"),
        Index("idx_etc_company", "company_id"),
        CheckConstraint(
            "probation_months_override IS NULL OR probation_months_override <= 6",
            name="ck_etc_probation_max_6"
        ),
        CheckConstraint(
            "min_wage_override_npr IS NULL OR min_wage_override_npr >= 15000",
            name="ck_etc_min_wage"
        ),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "emp_category_code": self.emp_category_code,
            "insource_type": self.insource_type.value if self.insource_type else None,
            "is_enabled": self.is_enabled, "custom_name": self.custom_name,
            "probation_months_override": self.probation_months_override,
            "notice_period_days": self.notice_period_days,
            "min_wage_override_npr": float(self.min_wage_override_npr) if self.min_wage_override_npr else None,
            "auto_alert_days_before": self.auto_alert_days_before,
            "benefits_matrix_override": self.benefits_matrix_override or {},
            "ai_misclassification_risk": self.ai_misclassification_risk,
        }


# ═══════════════════════════════════════════════════════════════
# 2. OUTSOURCE VENDOR
# ═══════════════════════════════════════════════════════════════

class OutsourceVendor(AuditMixin, Base):
    """
    Labour supplier / outsource agency.
    Nepal Labour Act 2074 Section 52: MUST be MoLESS-licensed.
    Using an unlicensed agency = workers become direct employees of main employer.
    """
    __tablename__ = "outsource_vendors"

    id                        = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id                = Column(UUID(as_uuid=False), nullable=False)

    vendor_code               = Column(String(30),  nullable=False)
    vendor_name               = Column(String(200), nullable=False)
    vendor_name_nepali        = Column(String(200))
    short_name                = Column(String(80))
    service_category          = Column(String(100))   # Security / Housekeeping / IT / Catering

    # Nepal Labour Act 2074, Section 52 — MoLESS licensing mandatory
    moless_license_no         = Column(String(100))   # LS-MoLESS-YYYY-NNNN
    moless_license_expiry     = Column(Date)
    is_licensed_agency        = Column(Boolean, default=False)
    agency_pan                = Column(String(20))
    agency_registration_no    = Column(String(50))

    # Contact
    contact_person            = Column(String(200))
    contact_email             = Column(String(255))
    contact_phone             = Column(String(50))
    address                   = Column(Text)

    # Aggregate performance (refreshed by AI monthly)
    overall_performance_score = Column(Float, default=0.0)
    overall_risk_level        = Column(SAEnum(RiskLevelEnum), default=RiskLevelEnum.LOW)
    total_workers_deployed    = Column(Integer, default=0)
    active_contracts_count    = Column(Integer, default=0)

    status                    = Column(String(20), default="active")
    ai_vendor_insights        = Column(JSONB, default=dict)
    ai_last_scored            = Column(DateTime)

    # Relationships
    contracts          = relationship("SLAContract",          back_populates="vendor", lazy="dynamic")
    vendor_employees   = relationship("VendorEmployee",       back_populates="vendor", lazy="dynamic")
    invoices           = relationship("VendorInvoice",        back_populates="vendor", lazy="dynamic")
    performance_cards  = relationship("VendorPerformanceCard",back_populates="vendor", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id", "vendor_code", name="uq_vendor_per_company"),
        Index("idx_vendor_company",  "company_id"),
        Index("idx_vendor_license",  "moless_license_no"),
        Index("idx_vendor_service",  "service_category"),
        Index("idx_vendor_status",   "status"),
    )

    @property
    def license_valid(self) -> bool:
        if not self.is_licensed_agency:
            return False
        if self.moless_license_expiry and self.moless_license_expiry < date.today():
            return False
        return True

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "vendor_code": self.vendor_code, "vendor_name": self.vendor_name,
            "vendor_name_nepali": self.vendor_name_nepali, "short_name": self.short_name,
            "service_category": self.service_category,
            "moless_license_no": self.moless_license_no,
            "moless_license_expiry": self.moless_license_expiry.isoformat() if self.moless_license_expiry else None,
            "is_licensed_agency": self.is_licensed_agency,
            "license_valid": self.license_valid,
            "agency_pan": self.agency_pan,
            "contact_person": self.contact_person, "contact_email": self.contact_email,
            "contact_phone": self.contact_phone, "address": self.address,
            "overall_performance_score": self.overall_performance_score,
            "overall_risk_level": self.overall_risk_level.value if self.overall_risk_level else "low",
            "total_workers_deployed": self.total_workers_deployed,
            "active_contracts_count": self.active_contracts_count,
            "status": self.status,
            "ai_vendor_insights": self.ai_vendor_insights or {},
            "ai_last_scored": self.ai_last_scored.isoformat() if self.ai_last_scored else None,
        }


# ═══════════════════════════════════════════════════════════════
# 3. SLA CONTRACT
# ═══════════════════════════════════════════════════════════════

class SLAContract(AuditMixin, Base):
    """
    Service Level Agreement between main employer and outsource vendor.
    Nepal Labour Act 2074 Section 55: Main employer co-liable for vendor
    failures in wage payment, SSF, insurance.
    """
    __tablename__ = "sla_contracts"

    id                        = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id                = Column(UUID(as_uuid=False), nullable=False)
    vendor_id                 = Column(UUID(as_uuid=False), ForeignKey("outsource_vendors.id"), nullable=False)

    contract_number           = Column(String(50), nullable=False)
    contract_name             = Column(String(200))
    service_type              = Column(String(100), nullable=False)
    contract_type             = Column(String(50), default="Service Agreement")

    # Period
    start_date                = Column(Date, nullable=False)
    end_date                  = Column(Date, nullable=False)
    renewal_alert_days        = Column(Integer, default=90)
    auto_renewal              = Column(Boolean, default=False)

    # Financials (NPR)
    total_contract_value_npr  = Column(Numeric(15, 2))
    monthly_billing_rate_npr  = Column(Numeric(12, 2))
    rate_per_worker_per_day   = Column(Numeric(10, 2))
    billing_cycle             = Column(String(20), default="monthly")

    # Workforce
    max_workers_allowed       = Column(Integer, nullable=False)
    min_workers_guaranteed    = Column(Integer, default=0)
    current_workers_deployed  = Column(Integer, default=0)

    # Nepal Labour Act 2074 mandatory clauses (all default TRUE)
    ensures_min_wage          = Column(Boolean, default=True)   # NPR 15,000/month minimum
    ensures_ssf_payment       = Column(Boolean, default=True)   # SSF 3.33%
    ensures_insurance         = Column(Boolean, default=True)
    non_core_work_only        = Column(Boolean, default=True)   # Section 52(2): non-core only
    main_employer_co_liable   = Column(Boolean, default=True)   # Section 55: always TRUE

    # SLA configuration
    sla_kpis                  = Column(JSONB, default=list)    # [{kpi_name, target, unit, weight_pct}]
    key_clauses               = Column(JSONB, default=list)
    penalty_clauses           = Column(JSONB, default=list)
    termination_notice_days   = Column(Integer, default=30)

    overall_compliance_pct    = Column(Float, default=100.0)
    status                    = Column(SAEnum(ContractStatusEnum), default=ContractStatusEnum.ACTIVE)

    contract_pdf_url          = Column(Text)
    ai_risk_assessment        = Column(JSONB, default=dict)
    ai_renewal_recommendation = Column(Text)

    approved_by               = Column(UUID(as_uuid=False))
    approved_at               = Column(DateTime)

    # Relationships
    vendor           = relationship("OutsourceVendor", back_populates="contracts")
    vendor_employees = relationship("VendorEmployee",  back_populates="contract", lazy="dynamic")
    invoices         = relationship("VendorInvoice",   back_populates="contract", lazy="dynamic")
    kpi_results      = relationship("SLAKPIResult",    back_populates="contract", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id", "contract_number", name="uq_contract_per_company"),
        Index("idx_contract_vendor",  "vendor_id"),
        Index("idx_contract_company", "company_id"),
        Index("idx_contract_status",  "status"),
        Index("idx_contract_end",     "end_date"),
        CheckConstraint("end_date > start_date",        name="ck_contract_dates"),
        CheckConstraint("max_workers_allowed > 0",      name="ck_contract_workers_positive"),
    )

    @property
    def days_remaining(self) -> int | None:
        if not self.end_date:
            return None
        return (self.end_date - date.today()).days

    @property
    def renewal_status(self) -> str:
        if not self.end_date:
            return "unknown"
        days = self.days_remaining
        if days < 0:
            return "expired"
        if days <= (self.renewal_alert_days or 90):
            return "renewal_due"
        return "active"

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id, "vendor_id": self.vendor_id,
            "contract_number": self.contract_number, "contract_name": self.contract_name,
            "service_type": self.service_type, "contract_type": self.contract_type,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date":   self.end_date.isoformat()   if self.end_date   else None,
            "days_remaining": self.days_remaining,
            "renewal_status": self.renewal_status,
            "renewal_alert_days": self.renewal_alert_days,
            "auto_renewal": self.auto_renewal,
            "total_contract_value_npr": float(self.total_contract_value_npr or 0),
            "monthly_billing_rate_npr": float(self.monthly_billing_rate_npr or 0),
            "rate_per_worker_per_day":  float(self.rate_per_worker_per_day  or 0),
            "billing_cycle": self.billing_cycle,
            "max_workers_allowed":      self.max_workers_allowed,
            "min_workers_guaranteed":   self.min_workers_guaranteed,
            "current_workers_deployed": self.current_workers_deployed,
            "ensures_min_wage":         self.ensures_min_wage,
            "ensures_ssf_payment":      self.ensures_ssf_payment,
            "ensures_insurance":        self.ensures_insurance,
            "non_core_work_only":       self.non_core_work_only,
            "main_employer_co_liable":  self.main_employer_co_liable,
            "sla_kpis":      self.sla_kpis      or [],
            "key_clauses":   self.key_clauses   or [],
            "penalty_clauses": self.penalty_clauses or [],
            "termination_notice_days": self.termination_notice_days,
            "overall_compliance_pct":  self.overall_compliance_pct,
            "status": self.status.value if self.status else "active",
            "ai_renewal_recommendation": self.ai_renewal_recommendation,
        }


# ═══════════════════════════════════════════════════════════════
# 4. SLA KPI RESULT  (monthly per contract)
# ═══════════════════════════════════════════════════════════════

class SLAKPIResult(AuditMixin, Base):
    __tablename__ = "sla_kpi_results"

    id            = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    contract_id   = Column(UUID(as_uuid=False), ForeignKey("sla_contracts.id"), nullable=False)
    company_id    = Column(UUID(as_uuid=False), nullable=False)
    vendor_id     = Column(UUID(as_uuid=False), nullable=False)

    period_month  = Column(Integer, nullable=False)
    period_year   = Column(Integer, nullable=False)

    kpi_name      = Column(String(100), nullable=False)
    kpi_unit      = Column(String(20))
    target_value  = Column(Numeric(10, 4))
    actual_value  = Column(Numeric(10, 4))
    is_met        = Column(Boolean)
    weight_pct    = Column(Numeric(5, 2))
    score         = Column(Float)

    ai_root_cause   = Column(Text)
    ai_action_items = Column(JSONB, default=list)

    contract = relationship("SLAContract", back_populates="kpi_results")

    __table_args__ = (
        UniqueConstraint("contract_id", "period_year", "period_month", "kpi_name",
                         name="uq_kpi_per_period"),
        Index("idx_kpi_contract", "contract_id"),
        Index("idx_kpi_period",   "period_year", "period_month"),
        CheckConstraint("period_month BETWEEN 1 AND 12", name="ck_kpi_month"),
    )

    @property
    def variance(self):
        if self.actual_value is not None and self.target_value is not None:
            return float(self.actual_value) - float(self.target_value)
        return None

    def to_dict(self) -> dict:
        return {
            "id": self.id, "contract_id": self.contract_id,
            "period_month": self.period_month, "period_year": self.period_year,
            "kpi_name": self.kpi_name, "kpi_unit": self.kpi_unit,
            "target_value": float(self.target_value) if self.target_value else None,
            "actual_value": float(self.actual_value) if self.actual_value else None,
            "variance": self.variance,
            "is_met": self.is_met,
            "weight_pct": float(self.weight_pct) if self.weight_pct else None,
            "score": self.score,
            "ai_root_cause": self.ai_root_cause,
            "ai_action_items": self.ai_action_items or [],
        }


# ═══════════════════════════════════════════════════════════════
# 5. VENDOR EMPLOYEE
# ═══════════════════════════════════════════════════════════════

class VendorEmployee(AuditMixin, Base):
    """
    Extended / contingent workforce.
    CRITICAL: Do NOT add to main employees table — co-employment risk.
    All IDs prefixed VE- to visually distinguish from direct hires.
    Compliance verification is main employer's obligation (LA2074 Section 55).
    """
    __tablename__ = "vendor_employees"

    id                       = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id               = Column(UUID(as_uuid=False), nullable=False)
    vendor_id                = Column(UUID(as_uuid=False), ForeignKey("outsource_vendors.id"), nullable=False)
    contract_id              = Column(UUID(as_uuid=False), ForeignKey("sla_contracts.id"))

    vendor_emp_id            = Column(String(30), nullable=False)   # e.g. VE-001
    name                     = Column(String(200), nullable=False)
    name_nepali              = Column(String(200))
    role                     = Column(String(100))
    service_category         = Column(String(100))

    # Assignment
    assigned_location        = Column(String(200))
    assigned_branch_id       = Column(UUID(as_uuid=False))
    shift_type               = Column(String(30))
    shift_start              = Column(Time)
    shift_end                = Column(Time)
    join_date                = Column(Date)
    assignment_end_date      = Column(Date)

    # Compliance verification (main employer's legal duty)
    id_verified              = Column(Boolean, default=False)
    bg_verified              = Column(Boolean, default=False)
    bg_verified_date         = Column(Date)
    insurance_active         = Column(Boolean, default=False)
    insurance_verified_date  = Column(Date)
    ssf_paid_current_month   = Column(Boolean, default=False)
    ssf_last_verified_date   = Column(Date)
    min_wage_compliant       = Column(Boolean, default=True)

    # Contact
    phone                    = Column(String(50))
    emergency_contact        = Column(String(200))

    # Pay (agency pays; main employer verifies)
    monthly_wage_npr         = Column(Numeric(10, 2))
    daily_rate_npr           = Column(Numeric(10, 2))

    # Access — intentionally LIMITED (not like direct employees)
    has_badge_access         = Column(Boolean, default=False)
    has_system_access        = Column(Boolean, default=False)   # MUST stay FALSE
    access_areas             = Column(ARRAY(String), default=list)

    status                   = Column(String(20), default="active")
    ai_ghost_risk_score      = Column(Float, default=0.0)
    ai_compliance_score      = Column(Float, default=100.0)
    ai_flags                 = Column(JSONB, default=list)

    # Relationships
    vendor           = relationship("OutsourceVendor", back_populates="vendor_employees")
    contract         = relationship("SLAContract",     back_populates="vendor_employees")
    attendance_records = relationship("VendorAttendance", back_populates="vendor_employee",
                                       lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id", "vendor_emp_id", name="uq_ve_per_company"),
        Index("idx_ve_vendor",   "vendor_id"),
        Index("idx_ve_contract", "contract_id"),
        Index("idx_ve_company",  "company_id"),
        Index("idx_ve_status",   "status"),
        Index("idx_ve_ghost",    "ai_ghost_risk_score"),
        CheckConstraint(
            "monthly_wage_npr IS NULL OR monthly_wage_npr >= 15000",
            name="ck_ve_min_wage_15000"
        ),
        CheckConstraint(
            "has_system_access = FALSE",
            name="ck_ve_no_system_access"   # Enforced at DB level
        ),
    )

    @property
    def compliance_issues(self) -> list[str]:
        issues = []
        if not self.id_verified:         issues.append("ID not verified")
        if not self.bg_verified:         issues.append("Background check pending")
        if not self.insurance_active:    issues.append("No insurance — main employer co-liable")
        if not self.ssf_paid_current_month: issues.append("SSF unpaid this month — main employer co-liable")
        if not self.min_wage_compliant:  issues.append("Below NPR 15,000 minimum wage")
        return issues

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "vendor_id": self.vendor_id, "contract_id": self.contract_id,
            "vendor_emp_id": self.vendor_emp_id,
            "name": self.name, "name_nepali": self.name_nepali,
            "role": self.role, "service_category": self.service_category,
            "assigned_location": self.assigned_location,
            "shift_type": self.shift_type,
            "shift_start": self.shift_start.isoformat() if self.shift_start else None,
            "shift_end":   self.shift_end.isoformat()   if self.shift_end   else None,
            "join_date":   self.join_date.isoformat()   if self.join_date   else None,
            "assignment_end_date": self.assignment_end_date.isoformat() if self.assignment_end_date else None,
            # Compliance
            "id_verified": self.id_verified,
            "bg_verified": self.bg_verified,
            "insurance_active": self.insurance_active,
            "ssf_paid_current_month": self.ssf_paid_current_month,
            "min_wage_compliant": self.min_wage_compliant,
            "compliance_issues": self.compliance_issues,
            # Pay
            "monthly_wage_npr": float(self.monthly_wage_npr) if self.monthly_wage_npr else None,
            "daily_rate_npr":   float(self.daily_rate_npr)   if self.daily_rate_npr   else None,
            # Access
            "has_badge_access":  self.has_badge_access,
            "has_system_access": False,   # Always
            "access_areas": self.access_areas or [],
            "status": self.status,
            "ai_ghost_risk_score": self.ai_ghost_risk_score,
            "ai_compliance_score": self.ai_compliance_score,
            "ai_flags": self.ai_flags or [],
        }


# ═══════════════════════════════════════════════════════════════
# 6. VENDOR INVOICE / BILLING
# ═══════════════════════════════════════════════════════════════

class VendorInvoice(AuditMixin, Base):
    """
    Monthly invoice from outsource vendor.
    AI cross-validates billed amount vs approved timesheets + attendance.
    Nepal TDS rate on services = 1.5%.
    """
    __tablename__ = "vendor_invoices"

    id                       = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id               = Column(UUID(as_uuid=False), nullable=False)
    vendor_id                = Column(UUID(as_uuid=False), ForeignKey("outsource_vendors.id"), nullable=False)
    contract_id              = Column(UUID(as_uuid=False), ForeignKey("sla_contracts.id"),     nullable=False)

    invoice_number           = Column(String(50),  nullable=False)
    invoice_period_month     = Column(Integer,     nullable=False)
    invoice_period_year      = Column(Integer,     nullable=False)
    issue_date               = Column(Date,        nullable=False)
    due_date                 = Column(Date,        nullable=False)
    payment_date             = Column(Date)

    # Billed amounts
    workers_billed           = Column(Integer)
    days_billed              = Column(Integer)
    rate_per_day_npr         = Column(Numeric(10, 2))
    amount_before_tax_npr    = Column(Numeric(12, 2), nullable=False)
    tds_rate_pct             = Column(Numeric(5, 2), default=Decimal("1.5"))  # Nepal TDS
    tds_amount_npr           = Column(Numeric(12, 2), default=0)
    total_amount_npr         = Column(Numeric(12, 2), nullable=False)

    # AI validation fields
    timesheet_amount_npr     = Column(Numeric(12, 2))   # What timesheets show
    attendance_amount_npr    = Column(Numeric(12, 2))   # What attendance shows
    discrepancy_amount_npr   = Column(Numeric(12, 2), default=0)
    has_discrepancy          = Column(Boolean, default=False)
    ai_validated             = Column(Boolean, default=False)
    ai_validation_result     = Column(Text)
    ai_validated_at          = Column(DateTime)
    ai_fraud_risk_score      = Column(Float, default=0.0)

    # Approval workflow
    timesheet_approved       = Column(Boolean, default=False)
    timesheet_approved_by    = Column(UUID(as_uuid=False))
    timesheet_approved_at    = Column(DateTime)
    attendance_verified      = Column(Boolean, default=False)
    attendance_verified_by   = Column(UUID(as_uuid=False))

    status                   = Column(SAEnum(InvoiceStatusEnum), default=InvoiceStatusEnum.PENDING_APPROVAL)
    dispute_reason           = Column(Text)
    dispute_raised_by        = Column(UUID(as_uuid=False))
    dispute_raised_at        = Column(DateTime)
    dispute_resolved_at      = Column(DateTime)
    approved_by              = Column(UUID(as_uuid=False))
    approved_at              = Column(DateTime)
    payment_reference        = Column(String(100))
    invoice_pdf_url          = Column(Text)

    # Relationships
    vendor   = relationship("OutsourceVendor", back_populates="invoices")
    contract = relationship("SLAContract",     back_populates="invoices")

    __table_args__ = (
        UniqueConstraint("company_id", "invoice_number", name="uq_invoice_per_company"),
        Index("idx_inv_vendor",   "vendor_id"),
        Index("idx_inv_contract", "contract_id"),
        Index("idx_inv_status",   "status"),
        Index("idx_inv_period",   "invoice_period_year", "invoice_period_month"),
        Index("idx_inv_disc",     "has_discrepancy"),
        CheckConstraint("total_amount_npr >= 0",      name="ck_inv_amount_positive"),
        CheckConstraint("due_date >= issue_date",     name="ck_inv_due_after_issue"),
        CheckConstraint("invoice_period_month BETWEEN 1 AND 12", name="ck_inv_month"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "vendor_id": self.vendor_id, "contract_id": self.contract_id,
            "invoice_number": self.invoice_number,
            "invoice_period_month": self.invoice_period_month,
            "invoice_period_year":  self.invoice_period_year,
            "period": f"{self.invoice_period_month}/{self.invoice_period_year}",
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "due_date":   self.due_date.isoformat()   if self.due_date   else None,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "workers_billed": self.workers_billed,
            "days_billed":    self.days_billed,
            "rate_per_day_npr": float(self.rate_per_day_npr or 0),
            "amount_before_tax_npr": float(self.amount_before_tax_npr or 0),
            "tds_rate_pct":    float(self.tds_rate_pct or 1.5),
            "tds_amount_npr":  float(self.tds_amount_npr or 0),
            "total_amount_npr": float(self.total_amount_npr),
            "timesheet_amount_npr": float(self.timesheet_amount_npr) if self.timesheet_amount_npr else None,
            "discrepancy_amount_npr": float(self.discrepancy_amount_npr or 0),
            "has_discrepancy": self.has_discrepancy,
            "ai_validated": self.ai_validated,
            "ai_validation_result": self.ai_validation_result,
            "ai_fraud_risk_score": self.ai_fraud_risk_score,
            "timesheet_approved": self.timesheet_approved,
            "attendance_verified": self.attendance_verified,
            "status": self.status.value if self.status else "pending_approval",
            "dispute_reason": self.dispute_reason,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "payment_reference": self.payment_reference,
        }


# ═══════════════════════════════════════════════════════════════
# 7. VENDOR ATTENDANCE
# ═══════════════════════════════════════════════════════════════

class VendorAttendance(AuditMixin, Base):
    """
    Daily attendance for each vendor employee.
    Main employer must track attendance per Labour Act 2074 Section 55.
    AI ghost-worker detection runs monthly on attendance patterns.
    """
    __tablename__ = "vendor_attendance"

    id                   = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id           = Column(UUID(as_uuid=False), nullable=False)
    vendor_id            = Column(UUID(as_uuid=False), nullable=False)
    vendor_employee_id   = Column(UUID(as_uuid=False), ForeignKey("vendor_employees.id"), nullable=False)
    contract_id          = Column(UUID(as_uuid=False))
    invoice_id           = Column(UUID(as_uuid=False), ForeignKey("vendor_invoices.id"))

    attendance_date      = Column(Date,     nullable=False)
    period_month         = Column(Integer)  # auto-set by event listener
    period_year          = Column(Integer)
    shift_type           = Column(String(30))

    check_in_time        = Column(DateTime)
    check_out_time       = Column(DateTime)
    hours_worked         = Column(Numeric(5, 2))   # computed in listener
    overtime_hours       = Column(Numeric(5, 2), default=0)

    is_present           = Column(Boolean, default=False)
    is_absent            = Column(Boolean, default=False)
    is_late              = Column(Boolean, default=False)
    late_minutes         = Column(Integer, default=0)
    is_half_day          = Column(Boolean, default=False)
    leave_type           = Column(String(50))

    biometric_verified   = Column(Boolean, default=False)
    gps_verified         = Column(Boolean, default=False)
    gps_latitude         = Column(Numeric(10, 7))
    gps_longitude        = Column(Numeric(10, 7))
    verified_by          = Column(UUID(as_uuid=False))
    verification_method  = Column(String(50))   # biometric/mobile/card/manual/gps

    # AI ghost worker detection
    ghost_risk_score     = Column(Float, default=0.0)
    ghost_risk_flags     = Column(JSONB, default=list)
    ai_anomaly_detected  = Column(Boolean, default=False)
    included_in_invoice  = Column(Boolean, default=False)

    remarks              = Column(Text)

    # Relationships
    vendor_employee = relationship("VendorEmployee", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("vendor_employee_id", "attendance_date",
                         name="uq_va_emp_date"),
        Index("idx_va_emp",    "vendor_employee_id"),
        Index("idx_va_date",   "attendance_date"),
        Index("idx_va_period", "period_year", "period_month"),
        Index("idx_va_vendor", "vendor_id", "company_id"),
        Index("idx_va_ghost",  "ghost_risk_score"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "vendor_employee_id": self.vendor_employee_id,
            "attendance_date": self.attendance_date.isoformat() if self.attendance_date else None,
            "shift_type": self.shift_type,
            "check_in_time":  self.check_in_time.isoformat()  if self.check_in_time  else None,
            "check_out_time": self.check_out_time.isoformat() if self.check_out_time else None,
            "hours_worked": float(self.hours_worked or 0),
            "overtime_hours": float(self.overtime_hours or 0),
            "is_present": self.is_present, "is_absent": self.is_absent,
            "is_late": self.is_late, "late_minutes": self.late_minutes,
            "is_half_day": self.is_half_day, "leave_type": self.leave_type,
            "biometric_verified": self.biometric_verified,
            "gps_verified": self.gps_verified,
            "verification_method": self.verification_method,
            "ghost_risk_score": self.ghost_risk_score,
            "ai_anomaly_detected": self.ai_anomaly_detected,
            "included_in_invoice": self.included_in_invoice,
            "remarks": self.remarks,
        }


@event.listens_for(VendorAttendance, "before_insert")
@event.listens_for(VendorAttendance, "before_update")
def _set_period_and_hours(mapper, connection, target):
    """Auto-compute period month/year and hours_worked."""
    if target.attendance_date:
        target.period_month = target.attendance_date.month
        target.period_year  = target.attendance_date.year
    if target.check_in_time and target.check_out_time:
        delta = target.check_out_time - target.check_in_time
        target.hours_worked = round(delta.total_seconds() / 3600, 2)


# ═══════════════════════════════════════════════════════════════
# 8. VENDOR PERFORMANCE CARD  (monthly AI scorecard)
# ═══════════════════════════════════════════════════════════════

class VendorPerformanceCard(AuditMixin, Base):
    """
    Monthly AI-generated scorecard for each vendor per contract.
    Aggregates: fill rate, attendance %, legal compliance,
    billing accuracy, worker turnover.
    AI recommends: renew / warn / performance_review / terminate.
    """
    __tablename__ = "vendor_performance_cards"

    id                          = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id                  = Column(UUID(as_uuid=False), nullable=False)
    vendor_id                   = Column(UUID(as_uuid=False), ForeignKey("outsource_vendors.id"), nullable=False)
    contract_id                 = Column(UUID(as_uuid=False), nullable=False)

    period_month                = Column(Integer, nullable=False)
    period_year                 = Column(Integer, nullable=False)

    # KPI results (target vs actual vs met)
    fill_rate_target_pct        = Column(Numeric(5, 2))
    fill_rate_actual_pct        = Column(Numeric(5, 2))
    fill_rate_met               = Column(Boolean)

    attendance_target_pct       = Column(Numeric(5, 2))
    attendance_actual_pct       = Column(Numeric(5, 2))
    attendance_met              = Column(Boolean)

    legal_compliance_target_pct = Column(Numeric(5, 2))
    legal_compliance_actual_pct = Column(Numeric(5, 2))
    legal_compliance_met        = Column(Boolean)

    billing_accuracy_target_pct = Column(Numeric(5, 2))
    billing_accuracy_actual_pct = Column(Numeric(5, 2))
    billing_accuracy_met        = Column(Boolean)

    turnover_rate_target_pct    = Column(Numeric(5, 2))
    turnover_rate_actual_pct    = Column(Numeric(5, 2))
    turnover_rate_met           = Column(Boolean)

    custom_kpi_results          = Column(JSONB, default=list)

    # Overall score
    overall_score               = Column(Float)
    overall_risk_level          = Column(SAEnum(RiskLevelEnum), default=RiskLevelEnum.LOW)

    # AI-generated content
    ai_generated                = Column(Boolean, default=True)
    ai_generated_at             = Column(DateTime)
    ai_summary                  = Column(Text)
    ai_recommendation           = Column(Text)   # renew/warn/performance_review/terminate
    ai_trend                    = Column(String(20))  # improving/stable/declining

    # Actions
    warning_issued              = Column(Boolean, default=False)
    warning_issued_at           = Column(DateTime)
    action_plan_received        = Column(Boolean, default=False)
    reviewed_by                 = Column(UUID(as_uuid=False))
    reviewed_at                 = Column(DateTime)
    review_notes                = Column(Text)

    # Relationships
    vendor = relationship("OutsourceVendor", back_populates="performance_cards")

    __table_args__ = (
        UniqueConstraint("vendor_id", "contract_id", "period_year", "period_month",
                         name="uq_perf_card_per_period"),
        Index("idx_perf_vendor",  "vendor_id"),
        Index("idx_perf_company", "company_id"),
        Index("idx_perf_period",  "period_year", "period_month"),
        Index("idx_perf_score",   "overall_score"),
        CheckConstraint("overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)",
                        name="ck_perf_score_range"),
        CheckConstraint("period_month BETWEEN 1 AND 12", name="ck_perf_month"),
    )

    @property
    def kpis_met_count(self) -> int:
        return sum(1 for v in [
            self.fill_rate_met, self.attendance_met, self.legal_compliance_met,
            self.billing_accuracy_met, self.turnover_rate_met
        ] if v is True)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "vendor_id": self.vendor_id, "contract_id": self.contract_id,
            "period_month": self.period_month, "period_year": self.period_year,
            "period": f"{self.period_month}/{self.period_year}",
            "kpis": {
                "fill_rate":        {"target": float(self.fill_rate_target_pct or 0),        "actual": float(self.fill_rate_actual_pct or 0),        "met": self.fill_rate_met},
                "attendance":       {"target": float(self.attendance_target_pct or 0),       "actual": float(self.attendance_actual_pct or 0),       "met": self.attendance_met},
                "legal_compliance": {"target": float(self.legal_compliance_target_pct or 0), "actual": float(self.legal_compliance_actual_pct or 0), "met": self.legal_compliance_met},
                "billing_accuracy": {"target": float(self.billing_accuracy_target_pct or 0), "actual": float(self.billing_accuracy_actual_pct or 0), "met": self.billing_accuracy_met},
                "turnover_rate":    {"target": float(self.turnover_rate_target_pct or 0),    "actual": float(self.turnover_rate_actual_pct or 0),    "met": self.turnover_rate_met},
            },
            "custom_kpi_results": self.custom_kpi_results or [],
            "kpis_met_count": self.kpis_met_count,
            "overall_score": self.overall_score,
            "overall_risk_level": self.overall_risk_level.value if self.overall_risk_level else "low",
            "ai_generated": self.ai_generated,
            "ai_generated_at": self.ai_generated_at.isoformat() if self.ai_generated_at else None,
            "ai_summary": self.ai_summary,
            "ai_recommendation": self.ai_recommendation,
            "ai_trend": self.ai_trend,
            "warning_issued": self.warning_issued,
            "warning_issued_at": self.warning_issued_at.isoformat() if self.warning_issued_at else None,
            "action_plan_received": self.action_plan_received,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "review_notes": self.review_notes,
        }
