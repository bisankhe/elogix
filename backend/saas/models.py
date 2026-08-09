"""
FILE: backend/saas/models.py
eLogix HRMS — Complete SaaS Data Models
Company · Users · Roles · Permissions · Billing · Audit
eLogix Technologies · www.elogix.com.np
SECURITY: All models enforce company_id isolation at ORM level.
"""
import uuid, secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy import event
from ..extensions import db

def _uuid(): return str(uuid.uuid4())
def _now():  return datetime.now(timezone.utc)

# ─────────────────────────────────────────────────────────────
#  TIER 1 — eLogix Platform (super admin, vendor)
# ─────────────────────────────────────────────────────────────

class ELogixAdmin(db.Model):
    """eLogix Technologies internal super-admins."""
    __tablename__ = "elogix_admins"
    id            = db.Column(db.String(36), primary_key=True, default=_uuid)
    full_name     = db.Column(db.String(200), nullable=False)
    email         = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role          = db.Column(db.String(50), default="support")
    # elogix_superadmin | sales | support | billing | technical
    is_active     = db.Column(db.Boolean, default=True)
    mfa_secret    = db.Column(db.String(100))
    mfa_enabled   = db.Column(db.Boolean, default=True)  # MFA mandatory for eLogix staff
    last_login_at = db.Column(db.DateTime(timezone=True))
    last_login_ip = db.Column(db.String(45))
    created_at    = db.Column(db.DateTime(timezone=True), default=_now)
    updated_at    = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now)

    def to_dict(self):
        return {"id":self.id,"full_name":self.full_name,"email":self.email,
                "role":self.role,"is_active":self.is_active}

# ─────────────────────────────────────────────────────────────
#  TIER 2 — Client Companies
# ─────────────────────────────────────────────────────────────

class Company(db.Model):
    """Every SaaS client is one Company record."""
    __tablename__ = "companies"

    id              = db.Column(db.String(36), primary_key=True, default=_uuid)
    # Identity
    name            = db.Column(db.String(300), nullable=False)
    legal_name      = db.Column(db.String(300))
    slug            = db.Column(db.String(100), unique=True, nullable=False)  # himalayan → himalayan.elogix.com.np
    logo_url        = db.Column(db.String(500))
    industry        = db.Column(db.String(100))
    country         = db.Column(db.String(100), default="Nepal")
    currency        = db.Column(db.String(10),  default="NPR")
    timezone        = db.Column(db.String(50),  default="Asia/Kathmandu")
    language        = db.Column(db.String(10),  default="en")
    address         = db.Column(db.Text)
    phone           = db.Column(db.String(30))
    website         = db.Column(db.String(200))
    pan_number      = db.Column(db.String(50))   # Nepal PAN/VAT
    registration_no = db.Column(db.String(100))

    # Tenant isolation
    schema_name     = db.Column(db.String(100), unique=True)  # elogix_{slug}
    storage_prefix  = db.Column(db.String(100))               # tenant_{slug}
    encryption_key  = db.Column(db.String(255))               # AES key per tenant (encrypted at rest)

    # Subscription
    plan            = db.Column(db.String(50),  default="trial")
    plan_started_at = db.Column(db.DateTime(timezone=True))
    plan_expires_at = db.Column(db.DateTime(timezone=True))
    trial_ends_at   = db.Column(db.DateTime(timezone=True))
    billing_cycle   = db.Column(db.String(20),  default="monthly")
    max_employees   = db.Column(db.Integer,      default=10)
    max_storage_gb  = db.Column(db.Integer,      default=5)
    employee_count  = db.Column(db.Integer,      default=0)

    # Status lifecycle
    status          = db.Column(db.String(30),  default="trial")
    # trial → active → suspended → cancelled → churned | reactivated
    suspended_at    = db.Column(db.DateTime(timezone=True))
    suspended_reason= db.Column(db.Text)
    cancelled_at    = db.Column(db.DateTime(timezone=True))

    # eLogix account manager
    account_manager = db.Column(db.String(200))
    sales_rep       = db.Column(db.String(200))
    support_tier    = db.Column(db.String(20), default="standard")  # standard | priority | dedicated

    # Nepal compliance
    ssf_rate        = db.Column(db.Float, default=0.11)
    cit_rate        = db.Column(db.Float, default=0.25)
    labour_law      = db.Column(db.String(100), default="Nepal Labour Act 2074")

    # Audit
    created_by      = db.Column(db.String(36), db.ForeignKey("elogix_admins.id"))
    created_at      = db.Column(db.DateTime(timezone=True), default=_now)
    updated_at      = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now)

    # Relationships
    users           = db.relationship("CompanyUser",  backref="company", lazy="dynamic",
                                      cascade="all, delete-orphan")
    subscriptions   = db.relationship("Subscription", backref="company", lazy="dynamic",
                                      cascade="all, delete-orphan")
    invoices        = db.relationship("Invoice",       backref="company", lazy="dynamic",
                                      cascade="all, delete-orphan")
    audit_logs      = db.relationship("AuditLog",      backref="company", lazy="dynamic")

    def is_active(self):
        return self.status in ("active", "trial") and (
            self.plan_expires_at is None or self.plan_expires_at > _now()
        )

    def portal_url(self):
        return f"https://{self.slug}.elogix.com.np"

    def to_dict(self, include_sensitive=False):
        d = {
            "id": self.id, "name": self.name, "slug": self.slug,
            "industry": self.industry, "country": self.country,
            "currency": self.currency, "timezone": self.timezone,
            "plan": self.plan, "status": self.status,
            "max_employees": self.max_employees,
            "employee_count": self.employee_count,
            "is_active": self.is_active(),
            "portal_url": self.portal_url(),
            "trial_ends_at": self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            "plan_expires_at": self.plan_expires_at.isoformat() if self.plan_expires_at else None,
            "created_at": self.created_at.isoformat(),
        }
        if include_sensitive:
            d.update({"pan_number": self.pan_number, "account_manager": self.account_manager,
                       "support_tier": self.support_tier, "schema_name": self.schema_name})
        return d


# ─────────────────────────────────────────────────────────────
#  TIER 3 — Company Users & RBAC
# ─────────────────────────────────────────────────────────────

class CompanyRole(db.Model):
    """Configurable roles per company. Companies can create custom roles."""
    __tablename__ = "company_roles"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id  = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    name        = db.Column(db.String(100), nullable=False)      # "HR Manager", "Payroll Officer"
    slug        = db.Column(db.String(100), nullable=False)      # "hr_manager"
    level       = db.Column(db.Integer, default=5)               # 1=highest, 10=lowest
    is_system   = db.Column(db.Boolean, default=False)           # system roles cannot be deleted
    description = db.Column(db.Text)
    created_at  = db.Column(db.DateTime(timezone=True), default=_now)

    __table_args__ = (db.UniqueConstraint("company_id", "slug"),)

    def to_dict(self):
        return {"id":self.id,"name":self.name,"slug":self.slug,
                "level":self.level,"is_system":self.is_system}


class ModulePermission(db.Model):
    """Granular permission: which role can do what on which module."""
    __tablename__ = "module_permissions"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id  = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    role_id     = db.Column(db.String(36), db.ForeignKey("company_roles.id"), nullable=False)
    module      = db.Column(db.String(100), nullable=False)   # "payroll", "attendance", "leave"
    can_view    = db.Column(db.Boolean, default=False)
    can_create  = db.Column(db.Boolean, default=False)
    can_edit    = db.Column(db.Boolean, default=False)
    can_delete  = db.Column(db.Boolean, default=False)
    can_approve = db.Column(db.Boolean, default=False)
    can_export  = db.Column(db.Boolean, default=False)
    scope       = db.Column(db.String(20), default="all")
    # all | own_dept | own_branch | own_team | self_only
    updated_at  = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (db.UniqueConstraint("company_id", "role_id", "module"),)


class Department(db.Model):
    """Departments per company for hierarchical data isolation."""
    __tablename__ = "departments"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id  = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    name        = db.Column(db.String(200), nullable=False)
    code        = db.Column(db.String(30))
    parent_id   = db.Column(db.String(36), db.ForeignKey("departments.id"))  # supports nested dept
    head_user_id= db.Column(db.String(36))
    is_active   = db.Column(db.Boolean, default=True)
    created_at  = db.Column(db.DateTime(timezone=True), default=_now)

    children    = db.relationship("Department", backref=db.backref("parent", remote_side=[id]))


class Branch(db.Model):
    """Branch / location for geography-based isolation."""
    __tablename__ = "branches"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id  = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    name        = db.Column(db.String(200), nullable=False)
    code        = db.Column(db.String(30))
    location    = db.Column(db.String(200))
    is_active   = db.Column(db.Boolean, default=True)
    created_at  = db.Column(db.DateTime(timezone=True), default=_now)


class CompanyUser(db.Model):
    """All users across all eLogix tenants. company_id enforces isolation."""
    __tablename__ = "company_users"

    id              = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id      = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False, index=True)
    emp_id          = db.Column(db.String(50))                 # HR employee code
    full_name       = db.Column(db.String(200), nullable=False)
    email           = db.Column(db.String(200), nullable=False)
    phone           = db.Column(db.String(30))
    password_hash   = db.Column(db.String(255), nullable=False)

    # Role & hierarchy
    role_id         = db.Column(db.String(36), db.ForeignKey("company_roles.id"))
    role_slug       = db.Column(db.String(100), default="employee")
    level           = db.Column(db.Integer, default=10)           # mirrors role.level
    department_id   = db.Column(db.String(36), db.ForeignKey("departments.id"))
    branch_id       = db.Column(db.String(36), db.ForeignKey("branches.id"))
    reports_to_id   = db.Column(db.String(36), db.ForeignKey("company_users.id"))

    # Status
    is_active       = db.Column(db.Boolean, default=True)
    is_verified     = db.Column(db.Boolean, default=False)
    must_change_pw  = db.Column(db.Boolean, default=True)
    mfa_enabled     = db.Column(db.Boolean, default=False)
    mfa_secret      = db.Column(db.String(100))

    # Security tracking
    failed_logins   = db.Column(db.Integer, default=0)
    locked_until    = db.Column(db.DateTime(timezone=True))
    last_login_at   = db.Column(db.DateTime(timezone=True))
    last_login_ip   = db.Column(db.String(45))
    password_changed_at = db.Column(db.DateTime(timezone=True))

    # Tokens
    email_verify_token  = db.Column(db.String(100))
    pw_reset_token      = db.Column(db.String(100))
    pw_reset_expires_at = db.Column(db.DateTime(timezone=True))

    created_by      = db.Column(db.String(36))
    created_at      = db.Column(db.DateTime(timezone=True), default=_now)
    updated_at      = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now)

    # Relationships
    role            = db.relationship("CompanyRole", foreign_keys=[role_id])
    department      = db.relationship("Department",  foreign_keys=[department_id])
    branch          = db.relationship("Branch",       foreign_keys=[branch_id])
    reports_to      = db.relationship("CompanyUser",  foreign_keys=[reports_to_id], remote_side=[id])

    # SECURITY: email unique only within company (different companies can share email)
    __table_args__ = (db.UniqueConstraint("company_id", "email"),)

    def is_locked(self):
        return self.locked_until and self.locked_until > _now()

    def set_password(self, password: str):
        import bcrypt
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()
        self.password_changed_at = _now()

    def check_password(self, password: str) -> bool:
        import bcrypt
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())

    def to_dict(self):
        return {
            "id": self.id, "emp_id": self.emp_id, "full_name": self.full_name,
            "email": self.email, "role_slug": self.role_slug, "level": self.level,
            "is_active": self.is_active, "must_change_pw": self.must_change_pw,
            "mfa_enabled": self.mfa_enabled, "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "company_id": self.company_id,
        }


# ─────────────────────────────────────────────────────────────
#  TIER 4 — Sessions & Security
# ─────────────────────────────────────────────────────────────

class UserSession(db.Model):
    """Active JWT sessions per user. Enables forced logout & session management."""
    __tablename__ = "user_sessions"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    user_id     = db.Column(db.String(36), db.ForeignKey("company_users.id"), nullable=False)
    company_id  = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    jti         = db.Column(db.String(64), unique=True, nullable=False)   # JWT ID — for token revocation
    device_info = db.Column(db.String(300))
    ip_address  = db.Column(db.String(45))
    user_agent  = db.Column(db.String(300))
    is_valid    = db.Column(db.Boolean, default=True)
    expires_at  = db.Column(db.DateTime(timezone=True))
    created_at  = db.Column(db.DateTime(timezone=True), default=_now)
    revoked_at  = db.Column(db.DateTime(timezone=True))
    revoked_by  = db.Column(db.String(36))


class BlacklistedToken(db.Model):
    """JWT blocklist for logout/revocation. Checked on every request."""
    __tablename__ = "blacklisted_tokens"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    jti         = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id     = db.Column(db.String(36))
    company_id  = db.Column(db.String(36))
    revoked_at  = db.Column(db.DateTime(timezone=True), default=_now)
    reason      = db.Column(db.String(100))  # logout | admin_force | pw_change | suspicious


# ─────────────────────────────────────────────────────────────
#  TIER 5 — Billing & Subscriptions
# ─────────────────────────────────────────────────────────────

ELOGIX_PLANS = {
    "trial":      {"max_emp": 10,    "price_npr": 0,     "storage_gb": 2,   "ai_req": 50,   "days": 14},
    "starter":    {"max_emp": 50,    "price_npr": 5000,  "storage_gb": 10,  "ai_req": 200,  "days": 0},
    "growth":     {"max_emp": 250,   "price_npr": 12000, "storage_gb": 50,  "ai_req": 1000, "days": 0},
    "business":   {"max_emp": 500,   "price_npr": 25000, "storage_gb": 100, "ai_req": 5000, "days": 0},
    "enterprise": {"max_emp": 1000,  "price_npr": 45000, "storage_gb": 200, "ai_req": 20000,"days": 0},
    "unlimited":  {"max_emp": 99999, "price_npr": 75000, "storage_gb": 500, "ai_req": 99999,"days": 0},
}

class Subscription(db.Model):
    __tablename__ = "subscriptions"
    id              = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id      = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    plan            = db.Column(db.String(50), default="trial")
    status          = db.Column(db.String(20), default="active")
    billing_cycle   = db.Column(db.String(20), default="monthly")
    price_npr       = db.Column(db.Integer, default=0)
    max_employees   = db.Column(db.Integer, default=10)
    storage_gb      = db.Column(db.Integer, default=2)
    ai_req_limit    = db.Column(db.Integer, default=50)
    started_at      = db.Column(db.DateTime(timezone=True), default=_now)
    expires_at      = db.Column(db.DateTime(timezone=True))
    trial_ends_at   = db.Column(db.DateTime(timezone=True))
    auto_renew      = db.Column(db.Boolean, default=True)
    created_at      = db.Column(db.DateTime(timezone=True), default=_now)
    updated_at      = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now)


class Invoice(db.Model):
    __tablename__ = "invoices"
    id              = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id      = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    invoice_number  = db.Column(db.String(30), unique=True, nullable=False)
    period_month    = db.Column(db.String(7),  nullable=False)   # 2026-07
    plan            = db.Column(db.String(50))
    employee_count  = db.Column(db.Integer, default=0)
    subtotal_npr    = db.Column(db.Integer, default=0)
    vat_pct         = db.Column(db.Float, default=13.0)          # Nepal VAT 13%
    vat_npr         = db.Column(db.Integer, default=0)
    total_npr       = db.Column(db.Integer, default=0)
    status          = db.Column(db.String(20), default="pending") # pending|paid|overdue|cancelled
    due_date        = db.Column(db.DateTime(timezone=True))
    paid_at         = db.Column(db.DateTime(timezone=True))
    payment_method  = db.Column(db.String(50))                    # esewa|khalti|bank_transfer|card
    payment_ref     = db.Column(db.String(100))
    notes           = db.Column(db.Text)
    created_at      = db.Column(db.DateTime(timezone=True), default=_now)

    def to_dict(self):
        return {"id":self.id,"invoice_number":self.invoice_number,
                "period_month":self.period_month,"plan":self.plan,
                "employee_count":self.employee_count,"total_npr":self.total_npr,
                "status":self.status,"due_date":str(self.due_date),"paid_at":str(self.paid_at)}


# ─────────────────────────────────────────────────────────────
#  TIER 6 — Audit & Communication
# ─────────────────────────────────────────────────────────────

class AuditLog(db.Model):
    """Immutable audit trail — every significant action logged."""
    __tablename__ = "audit_logs"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id  = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False, index=True)
    user_id     = db.Column(db.String(36), index=True)
    user_email  = db.Column(db.String(200))
    user_role   = db.Column(db.String(100))
    action      = db.Column(db.String(200), nullable=False)   # "employee.create", "payroll.approve"
    module      = db.Column(db.String(100))
    resource_id = db.Column(db.String(36))
    old_value   = db.Column(db.Text)   # JSON — previous state
    new_value   = db.Column(db.Text)   # JSON — new state
    ip_address  = db.Column(db.String(45))
    user_agent  = db.Column(db.String(300))
    status      = db.Column(db.String(20), default="success")  # success | failed | error
    created_at  = db.Column(db.DateTime(timezone=True), default=_now)

    # Audit logs are NEVER updated or deleted
    __table_args__ = {"sqlite_autoincrement": True} if False else {}


class Notification(db.Model):
    """eLogix → Company communications (billing, alerts, updates)."""
    __tablename__ = "notifications"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id  = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    user_id     = db.Column(db.String(36))   # None = system/broadcast
    type        = db.Column(db.String(50))   # billing|alert|update|marketing|security
    title       = db.Column(db.String(300), nullable=False)
    message     = db.Column(db.Text, nullable=False)
    channel     = db.Column(db.String(30), default="in_app")  # in_app|email|whatsapp|sms
    is_read     = db.Column(db.Boolean, default=False)
    priority    = db.Column(db.String(20), default="normal")  # critical|high|normal|low
    action_url  = db.Column(db.String(500))
    sent_at     = db.Column(db.DateTime(timezone=True))
    read_at     = db.Column(db.DateTime(timezone=True))
    created_at  = db.Column(db.DateTime(timezone=True), default=_now)


class SupportTicket(db.Model):
    """Company support tickets managed by eLogix team."""
    __tablename__ = "support_tickets"
    id          = db.Column(db.String(36), primary_key=True, default=_uuid)
    company_id  = db.Column(db.String(36), db.ForeignKey("companies.id"), nullable=False)
    user_id     = db.Column(db.String(36))
    ticket_no   = db.Column(db.String(20), unique=True)
    subject     = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    priority    = db.Column(db.String(20), default="normal")
    status      = db.Column(db.String(30), default="open")   # open|in_progress|resolved|closed
    category    = db.Column(db.String(100))                  # billing|technical|hr_config|training
    assigned_to = db.Column(db.String(36), db.ForeignKey("elogix_admins.id"))
    resolved_at = db.Column(db.DateTime(timezone=True))
    created_at  = db.Column(db.DateTime(timezone=True), default=_now)
    updated_at  = db.Column(db.DateTime(timezone=True), default=_now, onupdate=_now)
