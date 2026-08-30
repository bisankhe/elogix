# ============================================================
#  eLogix HRMS — Attendance Log & Overtime Log Models
#  Daily Login/Logout + Net Hours + OT with approval workflow
#  Nepal Labour Act 2074 compliant
# ============================================================
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy import (Column, Integer, String, Float, Boolean, Date,
                        DateTime, Text, ForeignKey, Enum as SAEnum,
                        Numeric, Index, event)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class OTStatus(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    approved   = "approved"
    rejected   = "rejected"
    paid       = "paid"

class OTType(str, enum.Enum):
    weekday  = "Weekday OT"
    weekend  = "Weekend OT"
    holiday  = "Public Holiday OT"
    special  = "Special OT"
    night    = "Night OT"

class AttendanceLog(Base):
    """
    Daily Attendance Log — one row per employee per day.
    Records dual login/logout sessions (split shifts),
    lunch break, two additional breaks, and net hours worked.
    Mirrors the Excel template structure exactly.
    """
    __tablename__ = "attendance_logs"

    id              = Column(Integer, primary_key=True, index=True)
    sl_no           = Column(Integer)                           # Auto-sequence per day

    # Multi-Tenant Isolation (CRITICAL)
    company_id      = Column(UUID(as_uuid=True), nullable=False, index=True)  # Tenant isolation

    # Date & Employee
    log_date        = Column(Date, nullable=False, index=True)
    emp_id          = Column(String(30), nullable=False, index=True)
    emp_name        = Column(String(200), nullable=False)
    department      = Column(String(100), index=True)
    designation     = Column(String(100))
    shift           = Column(String(50), default="Day")         # Day/Morning/Evening/Night/Split
    emp_status      = Column(String(50), default="Permanent")   # Permanent/Contract/Probation/etc.

    # Session 1 (Login1 / Logout1)
    login1          = Column(String(8))   # HH:MM
    logout1         = Column(String(8))
    session1_hrs    = Column(Numeric(5,2), default=0)           # Total 1

    # Session 2 (Login2 / Logout2)
    login2          = Column(String(8))
    logout2         = Column(String(8))
    session2_hrs    = Column(Numeric(5,2), default=0)           # Total 2

    # Hours Worked (Session1 + Session2)
    hrs_worked      = Column(Numeric(5,2), default=0)

    # Lunch
    lunch_in        = Column(String(8))
    lunch_out       = Column(String(8))
    lunch_hrs       = Column(Numeric(4,2), default=0)           # Total 3

    # Break 1
    break_in1       = Column(String(8))
    break_out1      = Column(String(8))
    break1_hrs      = Column(Numeric(4,2), default=0)           # Total 4

    # Break 2
    break_in2       = Column(String(8))
    break_out2      = Column(String(8))
    break2_hrs      = Column(Numeric(4,2), default=0)           # Total 5

    # Summary
    total_breaks    = Column(Numeric(5,2), default=0)           # Total Breaks (T3+T4+T5)
    net_hrs_worked  = Column(Numeric(5,2), default=0)           # Net = Hrs Worked - Total Breaks

    # Status flags
    is_present      = Column(Boolean, default=True)
    is_late         = Column(Boolean, default=False)            # Login1 >= 09:00
    is_early_depart = Column(Boolean, default=False)
    is_half_day     = Column(Boolean, default=False)

    # Audit
    notes           = Column(Text)
    created_by      = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    created_by_user = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index("idx_att_log_date_dept", "log_date", "department"),
        Index("idx_att_log_emp_date",  "emp_id", "log_date"),
    )

    def __repr__(self):
        return f"<AttendanceLog {self.emp_id} {self.log_date} Net:{self.net_hrs_worked}h>"


class OvertimeLog(Base):
    """
    Overtime Log — extends attendance data with OT hours,
    rate multipliers, pay calculation, and 3-level approval workflow.
    Process: Supervisor/Manager/HOD → Approve: HOD/Payroll/HR Manager
    Nepal Labour Act 2074: OT = Basic/(26 days × 8 hrs) × hours × 1.5
    """
    __tablename__ = "overtime_logs"

    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(UUID(as_uuid=True), nullable=False, index=True)  # Tenant isolation

    # Date & Employee
    ot_date         = Column(Date, nullable=False, index=True)
    emp_id          = Column(String(30), nullable=False, index=True)
    emp_name        = Column(String(200), nullable=False)
    department      = Column(String(100), index=True)
    designation     = Column(String(100))
    shift           = Column(String(50), default="Day")

    # Regular attendance (mirrored from AttendanceLog)
    attendance_log_id = Column(Integer, ForeignKey("attendance_logs.id"), nullable=True)
    login1          = Column(String(8))
    logout1         = Column(String(8))
    login2          = Column(String(8))
    logout2         = Column(String(8))
    regular_hrs     = Column(Numeric(5,2), default=0)

    # OT specific
    ot_start        = Column(String(8), nullable=False)     # HH:MM
    ot_end          = Column(String(8), nullable=False)
    ot_hrs          = Column(Numeric(5,2), nullable=False)  # Computed
    ot_type         = Column(String(50), default="Weekday OT")
    ot_rate         = Column(String(10), default="1.5×")    # 1.0×/1.5×/2.0×/2.5×/3.0×

    # Pay calculation
    base_salary     = Column(Numeric(12,2))                 # Monthly basic NPR
    hourly_rate     = Column(Numeric(10,2))                 # base/22days/8hrs
    rate_multiplier = Column(Numeric(4,2), default=1.5)
    ot_pay          = Column(Numeric(12,2))                 # ot_hrs × hourly_rate × multiplier
    total_pay       = Column(Numeric(12,2))                 # same as ot_pay (for future bonuses)

    # Approval workflow
    status          = Column(SAEnum(OTStatus), default=OTStatus.pending, index=True)

    # Level 1: Process (Supervisor/Manager/HOD)
    processed_by    = Column(String(150))
    processed_role  = Column(String(100))                   # Supervisor/Manager/HOD
    processed_at    = Column(DateTime(timezone=True))

    # Level 2: Approve (HOD/Payroll Officer/HR Manager)
    approved_by     = Column(String(150))
    approved_role   = Column(String(100))
    approved_at     = Column(DateTime(timezone=True))
    rejection_reason= Column(Text)

    # Payroll integration
    payroll_period  = Column(String(20))                    # YYYY-MM
    payroll_synced  = Column(Boolean, default=False)
    payroll_ref     = Column(String(100))

    remarks         = Column(Text)
    created_by      = Column(Integer, ForeignKey("users.id"))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    attendance_log  = relationship("AttendanceLog", foreign_keys=[attendance_log_id])
    created_by_user = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index("idx_ot_date_dept",   "ot_date", "department"),
        Index("idx_ot_emp_date",    "emp_id",  "ot_date"),
        Index("idx_ot_status",      "status"),
        Index("idx_ot_payroll",     "payroll_period", "payroll_synced"),
    )

    def __repr__(self):
        return f"<OvertimeLog {self.emp_id} {self.ot_date} {self.ot_hrs}h {self.status}>"
