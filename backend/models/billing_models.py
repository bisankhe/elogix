# FILE: backend/models/billing_models.py
# Subscription, invoice, and payment database models
from datetime import datetime
from ..__init__ import db

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    id             = db.Column(db.Integer, primary_key=True)
    company_id     = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, unique=True)
    plan           = db.Column(db.String(50), nullable=False, default='trial')
    status         = db.Column(db.String(20), nullable=False, default='active')  # active, cancelled, expired
    trial_ends_at  = db.Column(db.DateTime)
    billing_cycle  = db.Column(db.String(20), default='monthly')  # monthly, annual
    price_per_head = db.Column(db.Integer, default=0)   # NPR
    max_employees  = db.Column(db.Integer, default=50)
    storage_gb     = db.Column(db.Integer, default=10)
    ai_req_limit   = db.Column(db.Integer, default=100)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_trial(self):
        return self.plan == 'trial'

    def is_active(self):
        if self.status != 'active': return False
        if self.is_trial() and self.trial_ends_at:
            return datetime.utcnow() < self.trial_ends_at
        return True

    def to_dict(self):
        return {
            'plan': self.plan, 'status': self.status,
            'is_active': self.is_active(), 'is_trial': self.is_trial(),
            'max_employees': self.max_employees, 'storage_gb': self.storage_gb,
            'trial_ends_at': self.trial_ends_at.isoformat() if self.trial_ends_at else None,
        }


class Invoice(db.Model):
    __tablename__ = 'invoices'
    id             = db.Column(db.Integer, primary_key=True)
    company_id     = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    invoice_number = db.Column(db.String(20), unique=True, nullable=False)
    period_month   = db.Column(db.String(20), nullable=False)    # e.g. "2026-07"
    employee_count = db.Column(db.Integer, default=0)
    subtotal_npr   = db.Column(db.Integer, default=0)
    vat_npr        = db.Column(db.Integer, default=0)
    total_npr      = db.Column(db.Integer, default=0)
    status         = db.Column(db.String(20), default='pending')  # pending, paid, overdue
    due_date       = db.Column(db.DateTime)
    paid_at        = db.Column(db.DateTime)
    payment_method = db.Column(db.String(50))   # esewa, stripe, bank_transfer
    payment_ref    = db.Column(db.String(100))
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'invoice_number': self.invoice_number,
            'period_month': self.period_month,
            'employee_count': self.employee_count,
            'total_npr': self.total_npr, 'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_at':  self.paid_at.isoformat()  if self.paid_at  else None,
        }


class UsageLog(db.Model):
    """Track per-tenant feature usage for billing and limits."""
    __tablename__ = 'usage_logs'
    id           = db.Column(db.Integer, primary_key=True)
    company_id   = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    feature      = db.Column(db.String(50), nullable=False)  # ai_chat, report, export
    count        = db.Column(db.Integer, default=1)
    month        = db.Column(db.String(7), nullable=False)   # e.g. "2026-07"
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('company_id', 'feature', 'month'),)
