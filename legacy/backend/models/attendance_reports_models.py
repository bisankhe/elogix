"""
FILE: backend/models/attendance_reports_models.py
eLogix HRMS — Attendance & Payroll Report Models
  • DutyRoster         — shift assignment per employee per day
  • MonthlyAttendance  — monthly register (payroll-linked, LOP calc)
  • LeaveBalance       — per-type leave balance with carry forward
  • AbsentPresentLog   — daily P/A with login/logout proof
  • DigitalSignature   — Prepared / Verified / Approved on any report
eLogix Technologies · www.elogix.com.np · Nepal Labour Act 2074
"""
import enum, uuid
from datetime import datetime, timezone, date as date_type
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Date, DateTime,
    Text, ForeignKey, Enum as SAEnum, Index, UniqueConstraint,
    SmallInteger
)
from sqlalchemy.orm import relationship
from ..extensions import db

def _uuid(): return str(uuid.uuid4())
def _now():  return datetime.now(timezone.utc)

# ── Shift / leave code enum (matches frontend colour palette) ─
class ShiftCode(str, enum.Enum):
    M   = "M"    # Morning
    D   = "D"    # Day
    E   = "E"    # Evening
    N   = "N"    # Night Duty      ← dark purple colour
    W   = "W"    # Weekly Off
    PH  = "PH"   # Public Holiday
    L   = "L"    # General Leave
    CL  = "CL"   # Casual Leave
    EL  = "EL"   # Earned Leave
    SL  = "SL"   # Sick Leave
    ML  = "ML"   # Maternity Leave
    PL  = "PL"   # Paternity Leave
    BL  = "BL"   # Bereavement
    CWL = "CWL"  # Child Welfare
    HD  = "HD"   # Half Day
    A   = "A"    # Absent
    OT  = "OT"   # Overtime
    WFH = "WFH"  # Work From Home
    ND  = "ND"   # Night Duty (alias for N in present report)
    R   = "R"    # Rotational
    S   = "S"    # Split

class SigRole(str, enum.Enum):
    prepared = "prepared"
    verified = "verified"
    approved = "approved"

# ─────────────────────────────────────────────────────────────
#  DIGITAL SIGNATURE  — shared across all report types
# ─────────────────────────────────────────────────────────────
class DigitalSignature(db.Model):
    """
    Stores Prepared-by / Verified-by / Approved-by for any report.
    report_type: duty_roster | monthly_attendance | leave_balance | absent_present
    report_ref:  e.g. "2026-07_IT" (month_dept key)
    """
    __tablename__ = "digital_signatures"

    id           = Column(String(36), primary_key=True, default=_uuid)
    company_id   = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    report_type  = Column(String(50), nullable=False)
    report_ref   = Column(String(100), nullable=False)   # "2026-07_IT" or roster_id
    role         = Column(SAEnum(SigRole), nullable=False)

    # Signatory details
    signer_id    = Column(String(36))                     # company_users.id
    signer_name  = Column(String(200), nullable=False)
    designation  = Column(String(150), nullable=False)
    signed_at    = Column(DateTime(timezone=True))
    signed_date  = Column(Date)                           # User-chosen date on the form
    ip_address   = Column(String(45))

    # Verification
    is_signed    = Column(Boolean, default=False)
    revoked      = Column(Boolean, default=False)
    revoked_at   = Column(DateTime(timezone=True))
    revoked_by   = Column(String(200))
    revoke_reason= Column(Text)

    created_at   = Column(DateTime(timezone=True), default=_now)
    updated_at   = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("company_id","report_type","report_ref","role",
                         name="uq_sig_company_report_role"),
        Index("idx_sig_company_report", "company_id", "report_type", "report_ref"),
    )

    def to_dict(self):
        return {
            "id": self.id, "role": self.role,
            "signer_name": self.signer_name, "designation": self.designation,
            "signed_date": str(self.signed_date) if self.signed_date else None,
            "signed_at":   self.signed_at.isoformat() if self.signed_at else None,
            "is_signed":   self.is_signed,
        }


# ─────────────────────────────────────────────────────────────
#  DUTY ROSTER
# ─────────────────────────────────────────────────────────────
class DutyRoster(db.Model):
    """Header record per department/period roster."""
    __tablename__ = "duty_rosters"

    id           = Column(String(36), primary_key=True, default=_uuid)
    company_id   = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    department   = Column(String(150), nullable=False)
    unit_ward    = Column(String(150))
    period_type  = Column(String(30), default="Monthly")  # Daily|Weekly|Bi-Monthly|Monthly
    roster_month = Column(String(7),  nullable=False)      # "2026-07"
    date_from    = Column(Date, nullable=False)
    date_to      = Column(Date, nullable=False)
    status       = Column(String(20), default="draft")     # draft|finalised|locked
    locked_at    = Column(DateTime(timezone=True))
    is_locked    = Column(Boolean, default=False)

    created_by   = Column(String(36))
    created_at   = Column(DateTime(timezone=True), default=_now)
    updated_at   = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    # Relationships
    entries      = relationship("DutyRosterEntry", backref="roster",
                                cascade="all, delete-orphan", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("company_id","department","roster_month",
                         name="uq_roster_dept_month"),
    )

    def to_dict(self):
        return {
            "id": self.id, "department": self.department,
            "period_type": self.period_type, "roster_month": self.roster_month,
            "date_from": str(self.date_from), "date_to": str(self.date_to),
            "status": self.status, "is_locked": self.is_locked,
        }


class DutyRosterEntry(db.Model):
    """One row = one employee × one day in the roster."""
    __tablename__ = "duty_roster_entries"

    id           = Column(String(36), primary_key=True, default=_uuid)
    roster_id    = Column(String(36), ForeignKey("duty_rosters.id"), nullable=False)
    company_id   = Column(String(36), nullable=False, index=True)
    emp_id       = Column(String(50),  nullable=False)
    emp_name     = Column(String(200), nullable=False)
    designation  = Column(String(150))
    department   = Column(String(150))
    roster_date  = Column(Date, nullable=False)
    shift_code   = Column(SAEnum(ShiftCode), nullable=False, default=ShiftCode.D)
    remarks      = Column(String(300))
    is_night     = Column(Boolean, default=False)  # True when shift_code == N / ND

    created_at   = Column(DateTime(timezone=True), default=_now)

    __table_args__ = (
        UniqueConstraint("roster_id","emp_id","roster_date",
                         name="uq_roster_entry_emp_date"),
        Index("idx_roster_entry_date", "roster_id", "roster_date"),
    )


# ─────────────────────────────────────────────────────────────
#  MONTHLY ATTENDANCE REGISTER  (payroll-linked)
# ─────────────────────────────────────────────────────────────
class MonthlyAttendance(db.Model):
    """
    One record per employee per month.
    Summarises P/A/Leave/ND counts + LOP days + Net Salary.
    Links to payroll run.
    """
    __tablename__ = "monthly_attendance"

    id              = Column(String(36), primary_key=True, default=_uuid)
    company_id      = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    emp_id          = Column(String(50),  nullable=False)
    emp_name        = Column(String(200), nullable=False)
    designation     = Column(String(150))
    department      = Column(String(150))
    att_month       = Column(String(7),   nullable=False)  # "2026-07"

    # Day counts
    working_days    = Column(SmallInteger, default=0)
    present_days    = Column(SmallInteger, default=0)
    absent_days     = Column(SmallInteger, default=0)
    leave_days      = Column(SmallInteger, default=0)
    night_duty_days = Column(SmallInteger, default=0)
    weekly_off_days = Column(SmallInteger, default=0)
    holiday_days    = Column(SmallInteger, default=0)
    half_days       = Column(SmallInteger, default=0)
    wfh_days        = Column(SmallInteger, default=0)

    # Payroll linkage
    basic_salary    = Column(Numeric(12,2), default=0)
    daily_rate      = Column(Numeric(10,2), default=0)  # basic / working_days
    lop_days        = Column(Numeric(5,2),  default=0)  # Loss-of-Pay days (absent)
    lop_amount      = Column(Numeric(12,2), default=0)  # daily_rate × lop_days
    net_salary      = Column(Numeric(12,2), default=0)  # basic - lop_amount
    night_allowance = Column(Numeric(12,2), default=0)
    ot_amount       = Column(Numeric(12,2), default=0)

    # Status
    status          = Column(String(20), default="draft")   # draft|submitted|approved|locked
    payroll_ref     = Column(String(100))                    # e.g. "PR-2026-07-0001"
    payroll_synced  = Column(Boolean, default=False)
    payroll_synced_at = Column(DateTime(timezone=True))
    is_locked       = Column(Boolean, default=False)

    created_at      = Column(DateTime(timezone=True), default=_now)
    updated_at      = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("company_id","emp_id","att_month",
                         name="uq_monthly_att_emp_month"),
        Index("idx_monthly_att_dept_month", "company_id", "department", "att_month"),
    )

    def calculate_payroll(self):
        """Auto-compute LOP and Net Salary per Nepal Labour Act 2074."""
        if self.working_days and self.basic_salary:
            self.daily_rate  = round(float(self.basic_salary) / float(self.working_days), 2)
            self.lop_amount  = round(float(self.daily_rate) * float(self.lop_days), 2)
            self.net_salary  = round(float(self.basic_salary) - float(self.lop_amount)
                                     + float(self.night_allowance or 0)
                                     + float(self.ot_amount or 0), 2)

    def to_dict(self):
        return {
            "id": self.id, "emp_id": self.emp_id, "emp_name": self.emp_name,
            "designation": self.designation, "department": self.department,
            "att_month": self.att_month,
            "present_days": self.present_days, "absent_days": self.absent_days,
            "leave_days": self.leave_days, "night_duty_days": self.night_duty_days,
            "lop_days": str(self.lop_days), "lop_amount": str(self.lop_amount),
            "basic_salary": str(self.basic_salary), "net_salary": str(self.net_salary),
            "status": self.status, "payroll_synced": self.payroll_synced,
        }


class AttendanceDayEntry(db.Model):
    """One record per employee per day — the actual daily log."""
    __tablename__ = "attendance_day_entries"

    id            = Column(String(36), primary_key=True, default=_uuid)
    company_id    = Column(String(36), nullable=False, index=True)
    monthly_id    = Column(String(36), ForeignKey("monthly_attendance.id"), nullable=True)
    emp_id        = Column(String(50),  nullable=False)
    dept          = Column(String(150))
    entry_date    = Column(Date, nullable=False)
    day_of_week   = Column(String(10))                    # "Mon", "Tue" …

    # Status code (colour-coded)
    att_code      = Column(SAEnum(ShiftCode), nullable=False, default=ShiftCode.P)
    # Login/logout proof
    login_time    = Column(String(8))    # "08:45"  — HH:MM
    logout_time   = Column(String(8))    # "17:32"
    net_hours     = Column(Numeric(5,2))
    has_log       = Column(Boolean, default=False)   # True = biometric/web record exists

    remarks       = Column(String(300))
    created_at    = Column(DateTime(timezone=True), default=_now)

    __table_args__ = (
        UniqueConstraint("company_id","emp_id","entry_date",
                         name="uq_day_entry_emp_date"),
        Index("idx_day_entry_date", "company_id", "entry_date"),
        Index("idx_day_entry_dept_date", "company_id", "dept", "entry_date"),
    )

    def to_dict(self):
        return {
            "entry_date": str(self.entry_date), "att_code": self.att_code,
            "login_time": self.login_time, "logout_time": self.logout_time,
            "net_hours": str(self.net_hours) if self.net_hours else None,
            "has_log": self.has_log,
        }


# ─────────────────────────────────────────────────────────────
#  LEAVE BALANCE
# ─────────────────────────────────────────────────────────────
class LeaveBalance(db.Model):
    """
    Per employee per leave type per year.
    Matches Leave_balance.xlsx columns:
      CL / EL / SL / ML / PL / BL / CWL / HD — each as used/carry/available
    """
    __tablename__ = "leave_balances"

    id            = Column(String(36), primary_key=True, default=_uuid)
    company_id    = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    emp_id        = Column(String(50),  nullable=False)
    emp_name      = Column(String(200), nullable=False)
    designation   = Column(String(150))
    department    = Column(String(150))
    leave_year    = Column(String(7),  nullable=False)    # "2026-07" or "2025-2026"
    att_month     = Column(String(7))                     # optional month filter
    days_attended = Column(SmallInteger, default=0)

    # ── Per leave type: entitled / used / carry_forward / available ──
    cl_entitled   = Column(Numeric(5,2), default=12)
    cl_used       = Column(Numeric(5,2), default=0)
    cl_carry      = Column(Numeric(5,2), default=0)
    cl_available  = Column(Numeric(5,2), default=12)

    el_entitled   = Column(Numeric(5,2), default=18)
    el_used       = Column(Numeric(5,2), default=0)
    el_carry      = Column(Numeric(5,2), default=0)
    el_available  = Column(Numeric(5,2), default=18)

    sl_entitled   = Column(Numeric(5,2), default=12)
    sl_used       = Column(Numeric(5,2), default=0)
    sl_carry      = Column(Numeric(5,2), default=0)
    sl_available  = Column(Numeric(5,2), default=12)

    ml_entitled   = Column(Numeric(5,2), default=98)
    ml_used       = Column(Numeric(5,2), default=0)
    ml_carry      = Column(Numeric(5,2), default=0)
    ml_available  = Column(Numeric(5,2), default=98)

    pl_entitled   = Column(Numeric(5,2), default=15)
    pl_used       = Column(Numeric(5,2), default=0)
    pl_carry      = Column(Numeric(5,2), default=0)
    pl_available  = Column(Numeric(5,2), default=15)

    bl_entitled   = Column(Numeric(5,2), default=13)
    bl_used       = Column(Numeric(5,2), default=0)
    bl_carry      = Column(Numeric(5,2), default=0)
    bl_available  = Column(Numeric(5,2), default=13)

    cwl_entitled  = Column(Numeric(5,2), default=10)
    cwl_used      = Column(Numeric(5,2), default=0)
    cwl_carry     = Column(Numeric(5,2), default=0)
    cwl_available = Column(Numeric(5,2), default=10)

    hd_entitled   = Column(Numeric(5,2), default=6)
    hd_used       = Column(Numeric(5,2), default=0)
    hd_carry      = Column(Numeric(5,2), default=0)
    hd_available  = Column(Numeric(5,2), default=6)

    # Summary
    total_balance = Column(Numeric(6,2), default=0)
    total_used    = Column(Numeric(6,2), default=0)
    remarks       = Column(Text)

    status        = Column(String(20), default="draft")  # draft|finalised|locked
    is_locked     = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), default=_now)
    updated_at    = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("company_id","emp_id","leave_year","att_month",
                         name="uq_leave_bal_emp_year_month"),
        Index("idx_leave_bal_dept_year", "company_id", "department", "leave_year"),
    )

    def recalculate(self):
        """Recompute available = entitled + carry - used for each type."""
        for code in ("cl","el","sl","ml","pl","bl","cwl","hd"):
            ent   = float(getattr(self, f"{code}_entitled") or 0)
            used  = float(getattr(self, f"{code}_used")     or 0)
            carry = float(getattr(self, f"{code}_carry")    or 0)
            avail = round(ent + carry - used, 2)
            setattr(self, f"{code}_available", max(0, avail))
        self.total_used    = round(sum(float(getattr(self,f"{c}_used") or 0)
                                       for c in ("cl","el","sl","ml","pl","bl","cwl","hd")), 2)
        self.total_balance = round(sum(float(getattr(self,f"{c}_available") or 0)
                                       for c in ("cl","el","sl","ml","pl","bl","cwl","hd")), 2)

    def to_dict(self):
        return {
            "id": self.id, "emp_id": self.emp_id, "emp_name": self.emp_name,
            "designation": self.designation, "department": self.department,
            "leave_year": self.leave_year, "days_attended": self.days_attended,
            "balances": {
                code: {
                    "entitled":  float(getattr(self, f"{code}_entitled") or 0),
                    "used":      float(getattr(self, f"{code}_used")     or 0),
                    "carry":     float(getattr(self, f"{code}_carry")    or 0),
                    "available": float(getattr(self, f"{code}_available") or 0),
                } for code in ("cl","el","sl","ml","pl","bl","cwl","hd")
            },
            "total_balance": float(self.total_balance or 0),
            "total_used":    float(self.total_used    or 0),
        }
