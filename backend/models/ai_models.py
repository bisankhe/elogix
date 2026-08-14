"""
FILE: backend/models/ai_models.py
eLogix HRMS — AI Chat & Conversation Database Models
Stores: chat sessions, messages, AI usage credits, feedback
Nepal-compliant: all data encrypted at rest, RBAC on all queries
eLogix Technologies · www.elogix.com.np
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid, enum

try:
    from .org_models import Base, AuditMixin, gen_uuid, now
except ImportError:
    from sqlalchemy.orm import DeclarativeBase
    class Base(DeclarativeBase): pass
    def gen_uuid(): return str(uuid.uuid4())
    def now(): return datetime.now(timezone.utc)

# ── ENUMS ──────────────────────────────────────────────────────
class AISessionStatus(str, enum.Enum):
    active   = 'active'
    closed   = 'closed'
    archived = 'archived'

class AIMessageRole(str, enum.Enum):
    user      = 'user'
    assistant = 'assistant'
    system    = 'system'

class AIFeedback(str, enum.Enum):
    helpful   = 'helpful'
    unhelpful = 'unhelpful'
    neutral   = 'neutral'

class AIModule(str, enum.Enum):
    hr_chatbot   = 'hr_chatbot'
    bi_engine    = 'bi_engine'
    hr_letters   = 'hr_letters'
    job_desc     = 'job_desc'
    hr_policy    = 'hr_policy'
    ai_pilot     = 'ai_pilot'
    process_flow = 'process_flow'

# ── AI CHAT SESSION ────────────────────────────────────────────
class AIChatSession(Base):
    """One conversation thread — groups multiple messages together."""
    __tablename__ = 'ai_chat_sessions'

    id           = Column(UUID(as_uuid=True), primary_key=True, default=gen_uuid)
    company_id   = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    user_id      = Column(UUID(as_uuid=True), ForeignKey('employees.id'), nullable=False)
    module       = Column(SAEnum(AISessionStatus), default=AIModule.hr_chatbot)
    title        = Column(String(200))              # auto-generated from first message
    status       = Column(SAEnum(AISessionStatus), default=AISessionStatus.active)
    language     = Column(String(10), default='en') # en, ne, hi, etc.
    persona_role = Column(String(50))               # super_admin, hr_manager, employee, etc.
    message_count= Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    model_used   = Column(String(50), default='claude-sonnet-4-6')
    context_data = Column(JSONB, default=dict)      # extra context passed to AI
    created_at   = Column(DateTime(timezone=True), default=now)
    updated_at   = Column(DateTime(timezone=True), default=now, onupdate=now)
    closed_at    = Column(DateTime(timezone=True))

    # Relationships
    messages     = relationship('AIChatMessage', back_populates='session',
                                 cascade='all, delete-orphan', order_by='AIChatMessage.created_at')

    def to_dict(self):
        return {
            'id':           str(self.id),
            'company_id':   str(self.company_id),
            'user_id':      str(self.user_id),
            'title':        self.title,
            'status':       self.status.value if hasattr(self.status,'value') else self.status,
            'language':     self.language,
            'persona_role': self.persona_role,
            'message_count':self.message_count,
            'total_tokens': self.total_tokens,
            'model_used':   self.model_used,
            'created_at':   self.created_at.isoformat() if self.created_at else None,
            'updated_at':   self.updated_at.isoformat() if self.updated_at else None,
        }

# ── AI CHAT MESSAGE ────────────────────────────────────────────
class AIChatMessage(Base):
    """Individual message inside a chat session."""
    __tablename__ = 'ai_chat_messages'

    id           = Column(UUID(as_uuid=True), primary_key=True, default=gen_uuid)
    session_id   = Column(UUID(as_uuid=True), ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=False)
    company_id   = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    user_id      = Column(UUID(as_uuid=True), ForeignKey('employees.id'))
    role         = Column(SAEnum(AIMessageRole), nullable=False)
    content      = Column(Text, nullable=False)
    content_type = Column(String(20), default='text')  # text, markdown, table, json
    tokens_in    = Column(Integer, default=0)
    tokens_out   = Column(Integer, default=0)
    model        = Column(String(50))
    latency_ms   = Column(Integer)                     # response time in ms
    feedback     = Column(SAEnum(AIFeedback))
    feedback_note= Column(Text)
    is_flagged   = Column(Boolean, default=False)
    metadata_    = Column('metadata', JSONB, default=dict)
    created_at   = Column(DateTime(timezone=True), default=now)

    # Relationships
    session      = relationship('AIChatSession', back_populates='messages')

    def to_dict(self):
        return {
            'id':         str(self.id),
            'session_id': str(self.session_id),
            'role':       self.role.value if hasattr(self.role,'value') else self.role,
            'content':    self.content,
            'tokens_in':  self.tokens_in,
            'tokens_out': self.tokens_out,
            'feedback':   self.feedback.value if self.feedback and hasattr(self.feedback,'value') else self.feedback,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# ── AI USAGE TRACKING ─────────────────────────────────────────
class AIUsageLog(Base):
    """Monthly AI credit tracking per company and user."""
    __tablename__ = 'ai_usage_logs'

    id           = Column(UUID(as_uuid=True), primary_key=True, default=gen_uuid)
    company_id   = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    user_id      = Column(UUID(as_uuid=True), ForeignKey('employees.id'))
    month        = Column(String(7))    # YYYY-MM
    module       = Column(String(50))   # hr_chatbot, bi_engine, etc.
    tokens_used  = Column(Integer, default=0)
    queries_count= Column(Integer, default=0)
    cost_npr     = Column(Integer, default=0)   # in paisa (1/100 NPR)
    plan_limit   = Column(Integer)              # plan's monthly limit
    created_at   = Column(DateTime(timezone=True), default=now)
    updated_at   = Column(DateTime(timezone=True), default=now, onupdate=now)

    def to_dict(self):
        return {
            'id':           str(self.id),
            'company_id':   str(self.company_id),
            'user_id':      str(self.user_id) if self.user_id else None,
            'month':        self.month,
            'module':       self.module,
            'tokens_used':  self.tokens_used,
            'queries_count':self.queries_count,
            'plan_limit':   self.plan_limit,
        }

# ── AI KNOWLEDGE BASE (company-specific) ──────────────────────
class AIKnowledgeBase(Base):
    """Company-specific knowledge the AI can reference (policies, FAQs, etc.)"""
    __tablename__ = 'ai_knowledge_base'

    id           = Column(UUID(as_uuid=True), primary_key=True, default=gen_uuid)
    company_id   = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    category     = Column(String(50))   # policy, faq, procedure, template
    title        = Column(String(300), nullable=False)
    content      = Column(Text, nullable=False)
    tags         = Column(JSONB, default=list)
    language     = Column(String(10), default='en')
    is_active    = Column(Boolean, default=True)
    created_by   = Column(UUID(as_uuid=True), ForeignKey('employees.id'))
    created_at   = Column(DateTime(timezone=True), default=now)
    updated_at   = Column(DateTime(timezone=True), default=now, onupdate=now)

    def to_dict(self):
        return {
            'id':       str(self.id),
            'category': self.category,
            'title':    self.title,
            'content':  self.content,
            'tags':     self.tags or [],
            'language': self.language,
        }
