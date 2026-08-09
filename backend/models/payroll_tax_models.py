"""
FILE: backend/models/payroll_tax_models.py
eLogix HRMS — Final Salary Sheet & Tax Calculator Models
Nepal Income Tax Act 2058 · SSF Regulation 2074 · Labour Act 2074
FY 2083-84 Tax Slabs
eLogix Technologies · www.elogix.com.np
"""
import uuid, enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Date,
    DateTime, Text, ForeignKey, SmallInteger, Enum as SAEnum,
    Index, UniqueConstraint
)
from ..extensions import db

def _uuid(): return str(uuid.uuid4())
def _now():  return datetime.now(timezone.utc)

class GenderEnum(str, enum.Enum):
    male   = "Male"
    female = "Female"

class MaritalEnum(str, enum.Enum):
    single  = "Single"
    married = "Married"

class FrequencyEnum(str, enum.Enum):
    monthly   = "MNT"
    quarterly = "QRT"
    annual    = "ANN"


# ─────────────────────────────────────────────────────────────
#  FINAL SALARY SHEET  (one row per employee per month)
# ─────────────────────────────────────────────────────────────
class FinalSalarySheet(db.Model):
    """
    Mirrors all 65 columns of Final Salary Sheet Excel.
    Auto-calculated fields are populated by the salary engine.
    Payroll-signed: Prepared / Verified / Approved (DigitalSignature).
    """
    __tablename__ = "final_salary_sheets"

    id               = Column(String(36), primary_key=True, default=_uuid)
    company_id       = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)

    # Employee identifiers
    emp_id           = Column(String(50),  nullable=False)
    emp_code         = Column(String(30),  nullable=False)
    emp_name         = Column(String(200), nullable=False)
    designation      = Column(String(150))
    department       = Column(String(150))
    date_of_joining  = Column(Date)
    is_bod           = Column(Boolean, default=False)         # BOD/VP flag
    gender           = Column(SAEnum(GenderEnum), nullable=False, default=GenderEnum.male)
    marital_status   = Column(SAEnum(MaritalEnum), nullable=False, default=MaritalEnum.single)

    # Period
    pay_month        = Column(String(7),  nullable=False)    # "2026-07"
    fiscal_year      = Column(String(7),  nullable=False)    # "2083-84"
    months_in_year   = Column(SmallInteger, default=12)
    remaining_months = Column(SmallInteger, default=12)
    cit_freq         = Column(SAEnum(FrequencyEnum), default=FrequencyEnum.monthly)

    # ── EARNINGS ──────────────────────────────────────────────
    basic_salary         = Column(Numeric(12,2), default=0)
    other_allowance      = Column(Numeric(12,2), default=0)
    dearness_allowance   = Column(Numeric(12,2), default=0)
    ssf_col              = Column(Numeric(12,2), default=0)   # SSF contrib column
    laptop_allowance     = Column(Numeric(12,2), default=0)
    rent_allowance       = Column(Numeric(12,2), default=0)
    incentive            = Column(Numeric(12,2), default=0)
    misc_deduct          = Column(Numeric(12,2), default=0)
    leave_deduct         = Column(Numeric(12,2), default=0)
    gross_salary         = Column(Numeric(12,2), default=0)   # auto-calculated

    # ── SSF (Social Security Fund) ─────────────────────────────
    ssf_pf               = Column(Numeric(12,2), default=0)   # 10% of basic (employee)
    ssf_gratuity         = Column(Numeric(12,2), default=0)   # 8.33% of basic
    ssf_insurance        = Column(Numeric(12,2), default=0)   # 1.67% of basic
    ssf_total_employee   = Column(Numeric(12,2), default=0)   # 20% of basic (employee)
    ssf_total_employer   = Column(Numeric(12,2), default=0)   # 20% of basic (employer)
    ssf_contribution     = Column(Numeric(12,2), default=0)   # deducted from gross

    # ── CIT (Citizen Investment Trust) ────────────────────────
    cit_deduct           = Column(Numeric(12,2), default=0)   # 50% of basic

    # ── Other ──────────────────────────────────────────────────
    staff_advance        = Column(Numeric(12,2), default=0)
    dashain_allowance    = Column(Numeric(12,2), default=0)   # 1 month basic

    # ── Cumulative fields (from Excel columns) ─────────────────
    tax_deducted_prev    = Column(Numeric(12,2), default=0)
    cumul_gross          = Column(Numeric(14,2), default=0)
    cumul_cit_pf         = Column(Numeric(14,2), default=0)
    cumul_incentive      = Column(Numeric(14,2), default=0)
    quarterly_cit        = Column(Numeric(12,2), default=0)
    leave_deduct_prev    = Column(Numeric(12,2), default=0)

    # ── Annual computed fields ─────────────────────────────────
    annual_gross         = Column(Numeric(14,2), default=0)
    annual_gross_w_incv  = Column(Numeric(14,2), default=0)
    arf_contribution     = Column(Numeric(12,2), default=0)   # actual SSF × 12
    arf_allowable        = Column(Numeric(12,2), default=0)   # min(actual,500K,1/3)
    life_insurance       = Column(Numeric(12,2), default=0)   # actual paid
    life_ins_allowable   = Column(Numeric(12,2), default=0)   # max 60K
    school_fee           = Column(Numeric(12,2), default=0)
    taxable_income       = Column(Numeric(14,2), default=0)

    # ── Tax slabs (FY 2083-84 Single) ─────────────────────────
    tax_0pct_income      = Column(Numeric(14,2), default=0)
    tax_10pct_income     = Column(Numeric(12,2), default=0)
    tax_10pct_amount     = Column(Numeric(12,2), default=0)
    tax_20pct_income     = Column(Numeric(12,2), default=0)
    tax_20pct_amount     = Column(Numeric(12,2), default=0)
    tax_27pct_income     = Column(Numeric(12,2), default=0)
    tax_27pct_amount     = Column(Numeric(12,2), default=0)
    tax_29pct_income     = Column(Numeric(12,2), default=0)
    tax_29pct_amount     = Column(Numeric(12,2), default=0)

    total_tax_payable    = Column(Numeric(12,2), default=0)
    female_tax_credit    = Column(Numeric(12,2), default=0)   # 10% of tax (female)
    net_tax_payable      = Column(Numeric(12,2), default=0)
    tax_deducted_prev_yr = Column(Numeric(12,2), default=0)
    net_tax_remaining    = Column(Numeric(12,2), default=0)

    # Monthly deductions
    per_month_sst        = Column(Numeric(12,2), default=0)
    per_month_total      = Column(Numeric(12,2), default=0)
    monthly_tax          = Column(Numeric(12,2), default=0)   # TDS/month

    # ── Final net salary ───────────────────────────────────────
    net_salary           = Column(Numeric(12,2), default=0)

    # Status
    status               = Column(String(20), default="draft")
    is_locked            = Column(Boolean, default=False)
    payroll_ref          = Column(String(100))
    payroll_synced       = Column(Boolean, default=False)
    payroll_synced_at    = Column(DateTime(timezone=True))

    created_by           = Column(String(36))
    created_at           = Column(DateTime(timezone=True), default=_now)
    updated_at           = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("company_id","emp_id","pay_month", name="uq_salary_emp_month"),
        Index("idx_salary_dept_month", "company_id", "department", "pay_month"),
        Index("idx_salary_fiscal", "company_id", "fiscal_year"),
    )

    def to_dict(self):
        return {
            "id": self.id, "emp_id": self.emp_id, "emp_code": self.emp_code,
            "emp_name": self.emp_name, "designation": self.designation,
            "department": self.department, "pay_month": self.pay_month,
            "fiscal_year": self.fiscal_year, "gender": self.gender,
            "marital_status": self.marital_status,
            "basic_salary":    str(self.basic_salary    or 0),
            "gross_salary":    str(self.gross_salary    or 0),
            "ssf_total_employee": str(self.ssf_total_employee or 0),
            "ssf_total_employer": str(self.ssf_total_employer or 0),
            "cit_deduct":      str(self.cit_deduct      or 0),
            "taxable_income":  str(self.taxable_income  or 0),
            "total_tax_payable":str(self.total_tax_payable or 0),
            "female_tax_credit":str(self.female_tax_credit or 0),
            "net_tax_payable": str(self.net_tax_payable or 0),
            "monthly_tax":     str(self.monthly_tax     or 0),
            "net_salary":      str(self.net_salary      or 0),
            "status":          self.status,
            "is_locked":       self.is_locked,
            "payroll_ref":     self.payroll_ref,
        }


# ─────────────────────────────────────────────────────────────
#  TAX CALCULATION LOG  (individual calculator history)
# ─────────────────────────────────────────────────────────────
class TaxCalculationLog(db.Model):
    """Saves each tax calculation run for audit / download / comparison."""
    __tablename__ = "tax_calculation_logs"

    id              = Column(String(36), primary_key=True, default=_uuid)
    company_id      = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    emp_id          = Column(String(50))
    emp_name        = Column(String(200))
    fiscal_year     = Column(String(7),  default="2083-84")
    gender          = Column(String(10))
    marital_status  = Column(String(10))
    months_in_year  = Column(SmallInteger, default=12)

    # Inputs
    basic_salary      = Column(Numeric(12,2), default=0)
    other_allowance   = Column(Numeric(12,2), default=0)
    dearness_allow    = Column(Numeric(12,2), default=0)
    other_inputs      = Column(Text)         # JSON for remaining inputs

    # Key outputs
    monthly_gross     = Column(Numeric(12,2), default=0)
    annual_assessable = Column(Numeric(14,2), default=0)
    arf_allowable     = Column(Numeric(12,2), default=0)
    taxable_income    = Column(Numeric(14,2), default=0)
    ssf_employee      = Column(Numeric(12,2), default=0)
    ssf_employer      = Column(Numeric(12,2), default=0)
    cit_monthly       = Column(Numeric(12,2), default=0)
    total_tax_annual  = Column(Numeric(12,2), default=0)
    female_credit     = Column(Numeric(12,2), default=0)
    net_tax_annual    = Column(Numeric(12,2), default=0)
    monthly_tax       = Column(Numeric(12,2), default=0)
    net_salary        = Column(Numeric(12,2), default=0)
    effective_rate    = Column(Numeric(6,4),  default=0)

    # Slab breakdown (JSON)
    tax_breakdown     = Column(Text)
    created_at        = Column(DateTime(timezone=True), default=_now)
    created_by        = Column(String(36))

    def to_dict(self):
        import json
        return {
            "id": self.id, "emp_name": self.emp_name,
            "fiscal_year": self.fiscal_year, "gender": self.gender,
            "marital_status": self.marital_status,
            "basic_salary": str(self.basic_salary or 0),
            "taxable_income": str(self.taxable_income or 0),
            "net_tax_annual": str(self.net_tax_annual or 0),
            "monthly_tax": str(self.monthly_tax or 0),
            "net_salary": str(self.net_salary or 0),
            "effective_rate": str(self.effective_rate or 0),
            "tax_breakdown": json.loads(self.tax_breakdown) if self.tax_breakdown else [],
            "created_at": self.created_at.isoformat(),
        }


# ─────────────────────────────────────────────────────────────
#  TAX SLAB CONFIG  (editable per fiscal year)
# ─────────────────────────────────────────────────────────────
class TaxSlabConfig(db.Model):
    """
    Nepal income tax slabs — editable per fiscal year by eLogix admin.
    Seeded with FY 2083-84 data from IRD Nepal.
    """
    __tablename__ = "tax_slab_configs"

    id           = Column(String(36), primary_key=True, default=_uuid)
    company_id   = Column(String(36), ForeignKey("companies.id"), nullable=False)
    fiscal_year  = Column(String(7),  nullable=False)   # "2083-84"
    taxpayer_type= Column(String(20), nullable=False)   # single | couple
    slab_order   = Column(SmallInteger, nullable=False)  # 1,2,3…
    description  = Column(String(200))
    upto_amount  = Column(Numeric(14,2))                # NULL = unlimited
    tax_rate     = Column(Numeric(6,4), nullable=False)
    cumul_tax    = Column(Numeric(12,2), default=0)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), default=_now)

    __table_args__ = (
        UniqueConstraint("company_id","fiscal_year","taxpayer_type","slab_order"),
    )
