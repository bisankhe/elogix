# FILE: backend/models/audit_models.py
# Audit log — every important action is recorded
# Required for: Nepal Labour Act compliance, security, dispute resolution
from datetime import datetime
from ..__init__ import db
import json

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id           = db.Column(db.Integer, primary_key=True)
    company_id   = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    user_id      = db.Column(db.Integer)
    user_email   = db.Column(db.String(255))
    action       = db.Column(db.String(100), nullable=False)   # e.g. "employee.create"
    resource     = db.Column(db.String(100))                   # e.g. "Employee"
    resource_id  = db.Column(db.Integer)
    old_values   = db.Column(db.Text)    # JSON — what was before
    new_values   = db.Column(db.Text)    # JSON — what it changed to
    ip_address   = db.Column(db.String(45))
    user_agent   = db.Column(db.String(500))
    status       = db.Column(db.String(20), default='success')  # success, failed
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def log(cls, company_id: int, user_id: int, action: str,
            resource: str = None, resource_id: int = None,
            old_values: dict = None, new_values: dict = None,
            ip: str = None, status: str = 'success'):
        entry = cls(
            company_id  = company_id,
            user_id     = user_id,
            action      = action,
            resource    = resource,
            resource_id = resource_id,
            old_values  = json.dumps(old_values, default=str) if old_values else None,
            new_values  = json.dumps(new_values, default=str) if new_values else None,
            ip_address  = ip,
            status      = status,
        )
        db.session.add(entry)
        db.session.commit()
        return entry

    def to_dict(self):
        return {
            'id':          self.id,
            'action':      self.action,
            'resource':    self.resource,
            'resource_id': self.resource_id,
            'user_id':     self.user_id,
            'ip_address':  self.ip_address,
            'status':      self.status,
            'created_at':  self.created_at.isoformat(),
        }
