"""
FILE: backend/models/employee_models.py
eLogix HRMS — Employee & HR Policy Application Models
Covers: Employee Profile, Policy Acknowledgement, Policy Audit
Used by: hr_policy_routes.py
"""
from __future__ import annotations
from datetime import datetime, date
import uuid
import enum

from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Text,
    Date, DateTime, Numeric, ForeignKey, Index,
    UniqueConstraint, Enum as SAEnum,
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY


class Base(DeclarativeBase):
    pass


def _uuid(): return str(uuid.uuid4())
def _now():  return datetime.utcnow()


class EmploymentStatusEnum(str, enum.Enum):
    ACTIVE      = "active"
    INACTIVE    = "inactive"
    PROBATION   = "probation"
    ON_LEAVE    = "on_leave"
    TERMINATED  = "terminated"
    RESIGNED    = "resigned"
    RETIRED     = "retired"


class Employee(Base):
    """
    Core employee profile.
    Intentionally lightweight — full HRMS employee module is a separate roadmap item.
    Used here for HR Policy acknowledgement tracking.
    """
    __tablename__ = "employees"

    id                  = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id          = Column(UUID(as_uuid=False), nullable=False)
    branch_id           = Column(UUID(as_uuid=False))
    department_id       = Column(UUID(as_uuid=False))
    designation_id      = Column(UUID(as_uuid=False))
    grade_level_id      = Column(UUID(as_uuid=False))
    position_id         = Column(UUID(as_uuid=False))

    # Identity
    employee_code       = Column(String(30), nullable=False)
    first_name          = Column(String(100), nullable=False)
    last_name           = Column(String(100), nullable=False)
    first_name_nepali   = Column(String(100))
    last_name_nepali    = Column(String(100))
    gender              = Column(String(10))
    date_of_birth       = Column(Date)
    nationality         = Column(String(50), default="Nepali")
    citizenship_no      = Column(String(50))
    pan_no              = Column(String(20))

    # Contact
    personal_email      = Column(String(255))
    work_email          = Column(String(255))
    phone               = Column(String(50))
    emergency_contact   = Column(String(200))
    address             = Column(Text)
    province            = Column(String(100))
    district            = Column(String(100))

    # Employment
    employment_category = Column(String(30))
    employment_status   = Column(SAEnum(EmploymentStatusEnum), default=EmploymentStatusEnum.ACTIVE)
    join_date           = Column(Date)
    probation_end_date  = Column(Date)
    confirmation_date   = Column(Date)
    termination_date    = Column(Date)
    termination_reason  = Column(Text)

    # Reporting
    manager_id          = Column(UUID(as_uuid=False))
    dotted_manager_id   = Column(UUID(as_uuid=False))

    # Compensation
    basic_salary_npr    = Column(Numeric(12, 2))
    total_ctc_npr       = Column(Numeric(12, 2))

    # SSF / PF
    ssf_no              = Column(String(30))
    pf_account_no       = Column(String(30))
    bank_account_no     = Column(String(50))
    bank_name           = Column(String(100))

    # HR Policy
    policy_acknowledgements = relationship(
        "PolicyAcknowledgement", back_populates="employee", lazy="dynamic"
    )

    # AI
    ai_attrition_risk   = Column(Float, default=0.0)
    ai_insights         = Column(JSONB, default=dict)

    # Audit
    created_at          = Column(DateTime, default=_now)
    updated_at          = Column(DateTime, default=_now, onupdate=_now)
    created_by          = Column(UUID(as_uuid=False))
    is_deleted          = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("company_id", "employee_code", name="uq_emp_code"),
        Index("idx_emp_company",    "company_id"),
        Index("idx_emp_dept",       "department_id"),
        Index("idx_emp_status",     "employment_status"),
        Index("idx_emp_manager",    "manager_id"),
        Index("idx_emp_code",       "employee_code"),
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name_nepali(self) -> str | None:
        if self.first_name_nepali and self.last_name_nepali:
            return f"{self.first_name_nepali} {self.last_name_nepali}"
        return None

    def to_dict(self) -> dict:
        return {
            "id": self.id, "company_id": self.company_id,
            "employee_code": self.employee_code,
            "full_name": self.full_name,
            "first_name": self.first_name, "last_name": self.last_name,
            "full_name_nepali": self.full_name_nepali,
            "gender": self.gender,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "nationality": self.nationality,
            "personal_email": self.personal_email,
            "work_email": self.work_email,
            "phone": self.phone,
            "employment_category": self.employment_category,
            "employment_status": self.employment_status.value if self.employment_status else None,
            "join_date": self.join_date.isoformat() if self.join_date else None,
            "probation_end_date": self.probation_end_date.isoformat() if self.probation_end_date else None,
            "department_id": self.department_id,
            "designation_id": self.designation_id,
            "branch_id": self.branch_id,
            "manager_id": self.manager_id,
            "basic_salary_npr": float(self.basic_salary_npr) if self.basic_salary_npr else None,
            "ssf_no": self.ssf_no,
            "pf_account_no": self.pf_account_no,
            "ai_attrition_risk": self.ai_attrition_risk,
        }


class PolicyAcknowledgement(Base):
    """
    Tracks which employees have acknowledged which HR policies.
    """
    __tablename__ = "policy_acknowledgements"

    id              = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id      = Column(UUID(as_uuid=False), nullable=False)
    policy_id       = Column(UUID(as_uuid=False), nullable=False)
    employee_id     = Column(UUID(as_uuid=False), ForeignKey("employees.id"), nullable=False)

    acknowledged_at = Column(DateTime)
    acknowledged_via= Column(String(50), default="portal")  # portal / email / paper
    ip_address      = Column(String(50))
    device_info     = Column(String(200))
    signature_url   = Column(String(500))

    is_acknowledged = Column(Boolean, default=False)
    reminder_sent   = Column(Boolean, default=False)
    reminder_sent_at= Column(DateTime)
    overdue         = Column(Boolean, default=False)

    created_at      = Column(DateTime, default=_now)
    updated_at      = Column(DateTime, default=_now, onupdate=_now)

    employee = relationship("Employee", back_populates="policy_acknowledgements")

    __table_args__ = (
        UniqueConstraint("policy_id", "employee_id", name="uq_policy_ack"),
        Index("idx_ack_policy",    "policy_id"),
        Index("idx_ack_employee",  "employee_id"),
        Index("idx_ack_company",   "company_id"),
        Index("idx_ack_pending",   "is_acknowledged"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "policy_id": self.policy_id,
            "employee_id": self.employee_id,
            "is_acknowledged": self.is_acknowledged,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "acknowledged_via": self.acknowledged_via,
            "overdue": self.overdue,
            "reminder_sent": self.reminder_sent,
        }


class PolicyAuditLog(Base):
    """
    Full audit trail of every policy action — creation, update, publish, revoke.
    """
    __tablename__ = "policy_audit_logs"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    company_id  = Column(UUID(as_uuid=False), nullable=False)
    policy_id   = Column(UUID(as_uuid=False), nullable=False)
    action      = Column(String(50), nullable=False)
    # create | update | publish | archive | revoke | acknowledge | view | export
    performed_by = Column(UUID(as_uuid=False))
    performed_at = Column(DateTime, default=_now)
    old_value    = Column(JSONB)
    new_value    = Column(JSONB)
    ip_address   = Column(String(50))
    note         = Column(Text)

    __table_args__ = (
        Index("idx_audit_policy",  "policy_id"),
        Index("idx_audit_company", "company_id"),
        Index("idx_audit_action",  "action"),
        Index("idx_audit_time",    "performed_at"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "policy_id": self.policy_id,
            "action": self.action,
            "performed_by": self.performed_by,
            "performed_at": self.performed_at.isoformat() if self.performed_at else None,
            "note": self.note,
        }
