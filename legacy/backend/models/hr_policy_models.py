# ============================================================
# FILE: backend/models/hr_policy_models.py
# PURPOSE: SQLAlchemy ORM models for HR Policy Management
#          System - multi-tenant, version-controlled,
#          AI-driven acknowledgment tracking
# STACK: Python 3.11 + SQLAlchemy 2.0 + PostgreSQL
# ============================================================

import uuid
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy import (
    Column, String, Boolean, Integer, Text, DateTime,
    ForeignKey, JSON, ARRAY, Date, UniqueConstraint,
    Index, CheckConstraint, func, event
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase, Mapped
from sqlalchemy.ext.hybrid import hybrid_property


class Base(DeclarativeBase):
    pass


# ── Helper: generate control number ──────────────────────────
def generate_control_number(category_code: str, sequence: int) -> str:
    """Generate ISO-style control number: POL-EMP-001"""
    return f"POL-{category_code}-{sequence:03d}"


# ── Helper: generate signature hash ──────────────────────────
def generate_signature_hash(employee_id: str, policy_id: str,
                             version: str, signed_at: datetime,
                             ip: str) -> str:
    """SHA-256 hash for digital signature verification"""
    data = f"{employee_id}|{policy_id}|{version}|{signed_at.isoformat()}|{ip}"
    return hashlib.sha256(data.encode()).hexdigest()


# ============================================================
# MODEL 1: HRPolicyCategory
# ============================================================
class HRPolicyCategory(Base):
    __tablename__ = "hr_policy_categories"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id     = Column(UUID(as_uuid=True), nullable=False)
    code          = Column(String(20), nullable=False)
    name          = Column(String(100), nullable=False)
    description   = Column(Text)
    icon          = Column(String(50))
    display_order = Column(Integer, default=0)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at    = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    policies = relationship("HRPolicy", back_populates="category")

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_category_tenant_code"),
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "display_order": self.display_order,
            "policy_count": len(self.policies) if self.policies else 0
        }

    # ── Seed Data ────────────────────────────────────────────
    SEED_CATEGORIES = [
        {"code": "EMP",  "name": "Employment Policies",              "icon": "📋", "order": 1},
        {"code": "WBP",  "name": "Workplace Behavior Policies",      "icon": "🤝", "order": 2},
        {"code": "RCP",  "name": "Recruitment & Compensation",       "icon": "💰", "order": 3},
        {"code": "SCP",  "name": "Safety & Compliance",              "icon": "🛡️", "order": 4},
        {"code": "ECA",  "name": "Employee Conduct & Attendance",    "icon": "📅", "order": 5},
        {"code": "LWS",  "name": "Leave & Work Schedule",            "icon": "🏖️", "order": 6},
        {"code": "WRT",  "name": "Workplace Relations & Technology", "icon": "💻", "order": 7},
        {"code": "LDP",  "name": "Learning & Development",           "icon": "🎓", "order": 8},
    ]


# ============================================================
# MODEL 2: HRPolicy
# ============================================================
class HRPolicy(Base):
    __tablename__ = "hr_policies"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    control_number  = Column(String(30), nullable=False)
    category_id     = Column(UUID(as_uuid=True), ForeignKey("hr_policy_categories.id"))

    # Identity
    title               = Column(String(200), nullable=False)
    slug                = Column(String(200), nullable=False)
    purpose             = Column(Text, nullable=False)
    scope               = Column(Text, nullable=False)
    policy_statement    = Column(Text, nullable=False)
    procedures          = Column(Text)
    responsibilities    = Column(JSONB)          # {employee:[], manager:[], hr:[]}
    related_policies    = Column(ARRAY(UUID(as_uuid=True)))
    local_law_alignment = Column(JSONB)          # per-country legal refs

    # Version
    version             = Column(String(10), nullable=False, default="1.0")
    version_notes       = Column(Text)
    is_current_version  = Column(Boolean, default=True)
    parent_policy_id    = Column(UUID(as_uuid=True), ForeignKey("hr_policies.id"))

    # Status
    status = Column(String(20), default="draft",
                    server_default="draft")
    is_mandatory        = Column(Boolean, default=True)
    is_active           = Column(Boolean, default=True)

    # Blocking rules
    blocks_salary       = Column(Boolean, default=True)
    blocks_promotion    = Column(Boolean, default=True)
    blocks_transactions = Column(Boolean, default=True)

    # Targeting
    applies_to_roles     = Column(ARRAY(String))
    applies_to_countries = Column(ARRAY(String))
    applies_to_depts     = Column(ARRAY(UUID(as_uuid=True)))

    # Content
    content_html         = Column(Text)
    content_plain        = Column(Text)
    attachments          = Column(JSONB)
    estimated_read_mins  = Column(Integer, default=5)

    # Approval
    approved_by          = Column(UUID(as_uuid=True))
    approved_by_name     = Column(String(100))
    approved_by_role     = Column(String(100))
    approved_at          = Column(DateTime(timezone=True))
    review_date          = Column(Date, nullable=False)
    next_review_date     = Column(Date)

    # AI fields
    ai_summary           = Column(Text)
    ai_key_points        = Column(JSONB)
    ai_last_updated      = Column(DateTime(timezone=True))

    # Timestamps
    published_at         = Column(DateTime(timezone=True))
    created_by           = Column(UUID(as_uuid=True))
    created_at           = Column(DateTime(timezone=True),
                                  default=lambda: datetime.now(timezone.utc))
    updated_at           = Column(DateTime(timezone=True),
                                  default=lambda: datetime.now(timezone.utc),
                                  onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    category         = relationship("HRPolicyCategory", back_populates="policies")
    acknowledgments  = relationship("HRPolicyAcknowledgment", back_populates="policy")
    versions         = relationship("HRPolicyVersion", back_populates="policy")
    read_logs        = relationship("HRPolicyReadLog", back_populates="policy")

    __table_args__ = (
        UniqueConstraint("tenant_id", "control_number", "version",
                         name="uq_policy_control_version"),
        CheckConstraint("status IN ('draft','review','approved','published','archived')",
                        name="ck_policy_status"),
    )

    @hybrid_property
    def is_review_due_soon(self) -> bool:
        """Returns True if review is due within 30 days"""
        if self.next_review_date:
            from datetime import date
            return self.next_review_date <= (date.today() + timedelta(days=30))
        return False

    def to_dict(self, include_content: bool = False) -> dict:
        data = {
            "id": str(self.id),
            "control_number": self.control_number,
            "title": self.title,
            "slug": self.slug,
            "purpose": self.purpose,
            "scope": self.scope,
            "version": self.version,
            "status": self.status,
            "is_mandatory": self.is_mandatory,
            "blocks_salary": self.blocks_salary,
            "blocks_promotion": self.blocks_promotion,
            "estimated_read_mins": self.estimated_read_mins,
            "approved_by_name": self.approved_by_name,
            "approved_by_role": self.approved_by_role,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "review_date": self.review_date.isoformat() if self.review_date else None,
            "next_review_date": self.next_review_date.isoformat() if self.next_review_date else None,
            "ai_summary": self.ai_summary,
            "ai_key_points": self.ai_key_points,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "category": self.category.to_dict() if self.category else None,
        }
        if include_content:
            data.update({
                "policy_statement": self.policy_statement,
                "procedures": self.procedures,
                "responsibilities": self.responsibilities,
                "content_html": self.content_html,
                "local_law_alignment": self.local_law_alignment,
                "related_policies": [str(p) for p in (self.related_policies or [])],
                "attachments": self.attachments,
            })
        return data


# ============================================================
# MODEL 3: HRPolicyAcknowledgment
# ============================================================
class HRPolicyAcknowledgment(Base):
    __tablename__ = "hr_policy_acknowledgments"

    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id            = Column(UUID(as_uuid=True), nullable=False)
    policy_id            = Column(UUID(as_uuid=True), ForeignKey("hr_policies.id"), nullable=False)
    employee_id          = Column(UUID(as_uuid=True), nullable=False)
    policy_version       = Column(String(10), nullable=False)

    # Reading tracking
    status               = Column(String(20), default="pending")
    opened_at            = Column(DateTime(timezone=True))
    reading_started_at   = Column(DateTime(timezone=True))
    reading_completed_at = Column(DateTime(timezone=True))
    signed_at            = Column(DateTime(timezone=True))
    time_spent_seconds   = Column(Integer, default=0)
    scroll_pct_reached   = Column(Integer, default=0)
    pages_read           = Column(Integer, default=0)

    # Digital signature
    signature_text       = Column(Text)
    signature_ip         = Column(INET)
    signature_device     = Column(String(200))
    signature_hash       = Column(String(64))

    # Reminders
    reminder_count       = Column(Integer, default=0)
    last_reminder_at     = Column(DateTime(timezone=True))
    next_reminder_at     = Column(DateTime(timezone=True))

    # AI Quiz
    quiz_attempted       = Column(Boolean, default=False)
    quiz_score           = Column(Integer)
    quiz_passed          = Column(Boolean)

    notes                = Column(Text)
    created_at           = Column(DateTime(timezone=True),
                                  default=lambda: datetime.now(timezone.utc))
    updated_at           = Column(DateTime(timezone=True),
                                  default=lambda: datetime.now(timezone.utc),
                                  onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    policy    = relationship("HRPolicy", back_populates="acknowledgments")
    read_logs = relationship("HRPolicyReadLog", back_populates="acknowledgment")

    __table_args__ = (
        UniqueConstraint("tenant_id", "policy_id", "employee_id", "policy_version",
                         name="uq_ack_emp_policy_version"),
        CheckConstraint(
            "status IN ('pending','opened','reading','completed','signed','overdue')",
            name="ck_ack_status"
        ),
    )

    def sign(self, signature_text: str, ip: str, device: str) -> None:
        """Record digital signature"""
        now = datetime.now(timezone.utc)
        self.signed_at        = now
        self.signature_text   = signature_text
        self.signature_ip     = ip
        self.signature_device = device
        self.status           = "signed"
        self.signature_hash   = generate_signature_hash(
            str(self.employee_id), str(self.policy_id),
            self.policy_version, now, ip
        )

    def mark_opened(self) -> None:
        if not self.opened_at:
            self.opened_at = datetime.now(timezone.utc)
            self.status    = "opened"

    def update_reading_progress(self, scroll_pct: int, time_seconds: int) -> None:
        self.scroll_pct_reached = max(self.scroll_pct_reached or 0, scroll_pct)
        self.time_spent_seconds = (self.time_spent_seconds or 0) + time_seconds
        if not self.reading_started_at:
            self.reading_started_at = datetime.now(timezone.utc)
            self.status = "reading"
        if scroll_pct >= 95:
            self.reading_completed_at = datetime.now(timezone.utc)
            self.status = "completed"

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "policy_id": str(self.policy_id),
            "employee_id": str(self.employee_id),
            "policy_version": self.policy_version,
            "status": self.status,
            "scroll_pct_reached": self.scroll_pct_reached,
            "time_spent_seconds": self.time_spent_seconds,
            "signed_at": self.signed_at.isoformat() if self.signed_at else None,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
            "reading_completed_at": self.reading_completed_at.isoformat()
                                    if self.reading_completed_at else None,
            "reminder_count": self.reminder_count,
            "next_reminder_at": self.next_reminder_at.isoformat()
                                 if self.next_reminder_at else None,
            "quiz_score": self.quiz_score,
            "quiz_passed": self.quiz_passed,
            "is_signed": self.status == "signed",
            "is_overdue": self.status == "overdue",
        }


# ============================================================
# MODEL 4: HRPolicyReadLog
# ============================================================
class HRPolicyReadLog(Base):
    __tablename__ = "hr_policy_read_log"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id         = Column(UUID(as_uuid=True), nullable=False)
    acknowledgment_id = Column(UUID(as_uuid=True),
                               ForeignKey("hr_policy_acknowledgments.id"))
    employee_id       = Column(UUID(as_uuid=True), nullable=False)
    policy_id         = Column(UUID(as_uuid=True),
                               ForeignKey("hr_policies.id"), nullable=False)

    event_type        = Column(String(30), nullable=False)
    event_data        = Column(JSONB)
    ip_address        = Column(INET)
    user_agent        = Column(Text)
    session_id        = Column(String(100))
    created_at        = Column(DateTime(timezone=True),
                               default=lambda: datetime.now(timezone.utc))

    # Relationships
    acknowledgment = relationship("HRPolicyAcknowledgment", back_populates="read_logs")
    policy         = relationship("HRPolicy", back_populates="read_logs")

    VALID_EVENTS = {
        "opened", "scroll_update", "reading_complete",
        "signed", "reminder_sent", "overdue_flagged",
        "quiz_started", "quiz_completed", "reopened"
    }

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "employee_id": str(self.employee_id),
            "policy_id": str(self.policy_id),
            "event_type": self.event_type,
            "event_data": self.event_data,
            "created_at": self.created_at.isoformat(),
        }


# ============================================================
# MODEL 5: HRPolicyTransactionBlock
# ============================================================
class HRPolicyTransactionBlock(Base):
    __tablename__ = "hr_policy_transaction_blocks"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id        = Column(UUID(as_uuid=True), nullable=False)
    employee_id      = Column(UUID(as_uuid=True), nullable=False)
    blocked_by       = Column(UUID(as_uuid=True), ForeignKey("hr_policies.id"), nullable=False)

    transaction_type = Column(String(50), nullable=False)
    transaction_data = Column(JSONB)
    blocked_at       = Column(DateTime(timezone=True),
                              default=lambda: datetime.now(timezone.utc))
    resolved_at      = Column(DateTime(timezone=True))
    resolved_by      = Column(UUID(as_uuid=True))
    created_at       = Column(DateTime(timezone=True),
                              default=lambda: datetime.now(timezone.utc))


# ============================================================
# MODEL 6: HRPolicyVersion (archive)
# ============================================================
class HRPolicyVersion(Base):
    __tablename__ = "hr_policy_versions"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id       = Column(UUID(as_uuid=True), ForeignKey("hr_policies.id"), nullable=False)
    version         = Column(String(10), nullable=False)
    content_html    = Column(Text)
    content_plain   = Column(Text)
    change_summary  = Column(Text)
    changed_by      = Column(UUID(as_uuid=True))
    changed_by_name = Column(String(100))
    created_at      = Column(DateTime(timezone=True),
                             default=lambda: datetime.now(timezone.utc))

    policy = relationship("HRPolicy", back_populates="versions")


# ============================================================
# MODEL 7: HRPolicyAIInteraction
# ============================================================
class HRPolicyAIInteraction(Base):
    __tablename__ = "hr_policy_ai_interactions"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id   = Column(UUID(as_uuid=True), nullable=False)
    employee_id = Column(UUID(as_uuid=True), nullable=False)
    policy_id   = Column(UUID(as_uuid=True), ForeignKey("hr_policies.id"))

    question    = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    helpful     = Column(Boolean)
    session_id  = Column(String(100))
    created_at  = Column(DateTime(timezone=True),
                         default=lambda: datetime.now(timezone.utc))
