# ============================================================
# FILE: backend/models/group_branch_models.py
# COVERS: Group Company · Branch & Location Setup
# ============================================================
import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime, Numeric, Date, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase
from flask import Blueprint, request, jsonify, g
from functools import wraps

class Base(DeclarativeBase):
    pass

def now_utc():
    return datetime.now(timezone.utc)


# ── GROUP COMPANY ─────────────────────────────────────────────
class GroupCompany(Base):
    __tablename__ = "group_companies"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    code            = Column(String(20), nullable=False)      # NHG
    name            = Column(String(200), nullable=False)
    short_name      = Column(String(80))
    company_type    = Column(String(50), default="Holding Company")
    # Types: Holding Company | Subsidiary | Associate | Joint Venture | Trust
    country         = Column(String(60), default="Nepal")
    currency_code   = Column(String(5), default="NPR")
    pan_number      = Column(String(30))
    incorporated_date = Column(Date)
    contact_email   = Column(String(150))
    website         = Column(String(200))
    description     = Column(Text)
    logo_url        = Column(String(500))
    is_active       = Column(Boolean, default=True)
    created_by      = Column(UUID(as_uuid=True))
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    companies       = relationship("Company", back_populates="group")
    __table_args__  = (UniqueConstraint("tenant_id", "code"),)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "short_name": self.short_name, "company_type": self.company_type,
            "country": self.country, "currency_code": self.currency_code,
            "pan_number": self.pan_number,
            "incorporated_date": self.incorporated_date.isoformat() if self.incorporated_date else None,
            "contact_email": self.contact_email, "website": self.website,
            "description": self.description, "is_active": self.is_active,
            "companies_count": len(self.companies) if self.companies else 0,
        }


# ── COMPANY ───────────────────────────────────────────────────
class Company(Base):
    __tablename__ = "companies"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    group_id            = Column(UUID(as_uuid=True))   # FK to group_companies
    code                = Column(String(20), nullable=False)   # NP-001
    name                = Column(String(200), nullable=False)
    legal_name          = Column(String(300))
    short_name          = Column(String(80))
    company_type        = Column(String(60), default="Private Limited")
    industry            = Column(String(100))
    pan_number          = Column(String(30))
    vat_number          = Column(String(40))
    ocr_number          = Column(String(60))           # Office of Company Registrar
    ssf_employer_code   = Column(String(60))           # Social Security Fund
    is_primary          = Column(Boolean, default=False)
    is_active           = Column(Boolean, default=True)
    base_currency       = Column(String(5), default="NPR")
    fiscal_year_type    = Column(String(20), default="NEPALI")  # NEPALI | GREGORIAN
    min_wage_applicable = Column(Numeric(10, 2), default=15000)
    foreign_worker_pct  = Column(Numeric(4, 2), default=0)
    # Address
    province            = Column(String(80))
    district            = Column(String(80))
    municipality        = Column(String(100))
    ward_no             = Column(String(10))
    address             = Column(Text)
    phone               = Column(String(30))
    email               = Column(String(150))
    hr_email            = Column(String(150))
    website             = Column(String(200))
    labour_office_zone  = Column(String(200))
    established_date    = Column(Date)
    # Setup completion
    setup_completion_pct= Column(Integer, default=0)
    setup_completed     = Column(Boolean, default=False)
    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    group               = relationship("GroupCompany", back_populates="companies",
                                       foreign_keys=[group_id],
                                       primaryjoin="Company.group_id == GroupCompany.id")
    branches            = relationship("Branch", back_populates="company")
    legal_documents     = relationship("CompanyLegalDoc", back_populates="company")

    __table_args__ = (UniqueConstraint("tenant_id", "code"),)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "legal_name": self.legal_name, "short_name": self.short_name,
            "company_type": self.company_type, "industry": self.industry,
            "pan_number": self.pan_number, "vat_number": self.vat_number,
            "ocr_number": self.ocr_number, "ssf_employer_code": self.ssf_employer_code,
            "is_primary": self.is_primary, "is_active": self.is_active,
            "base_currency": self.base_currency, "fiscal_year_type": self.fiscal_year_type,
            "min_wage_applicable": float(self.min_wage_applicable or 15000),
            "foreign_worker_pct": float(self.foreign_worker_pct or 0),
            "province": self.province, "district": self.district,
            "municipality": self.municipality, "ward_no": self.ward_no,
            "address": self.address, "phone": self.phone,
            "email": self.email, "hr_email": self.hr_email,
            "labour_office_zone": self.labour_office_zone,
            "established_date": self.established_date.isoformat() if self.established_date else None,
            "setup_completion_pct": self.setup_completion_pct,
            "branches_count": len(self.branches) if self.branches else 0,
        }


# ── COMPANY LEGAL DOCUMENT ────────────────────────────────────
class CompanyLegalDoc(Base):
    __tablename__ = "company_legal_docs"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    company_id      = Column(UUID(as_uuid=True), nullable=False)
    category        = Column(String(50), nullable=False)
    # Categories: ocr_certificate | pan_certificate | vat_certificate |
    #   tax_clearance | ssf_registration | labour_audit_report |
    #   ward_registration | company_statute | trade_license | audited_accounts
    name            = Column(String(200))
    doc_number      = Column(String(100))
    issue_date      = Column(Date)
    expiry_date     = Column(Date)
    issued_by       = Column(String(200))
    status          = Column(String(20), default="pending")
    # Status: pending | uploaded | verified | expired | renewal_due
    file_url        = Column(String(500))
    notes           = Column(Text)
    alert_days      = Column(Integer, default=30)  # alert X days before expiry
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    company         = relationship("Company", back_populates="legal_documents",
                                   foreign_keys=[company_id],
                                   primaryjoin="CompanyLegalDoc.company_id == Company.id")

    @property
    def days_to_expiry(self):
        if not self.expiry_date:
            return None
        return (self.expiry_date - date.today()).days

    def to_dict(self):
        return {
            "id": str(self.id), "category": self.category, "name": self.name,
            "doc_number": self.doc_number,
            "issue_date":  self.issue_date.isoformat()  if self.issue_date  else None,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "issued_by": self.issued_by, "status": self.status,
            "file_url": self.file_url,
            "days_to_expiry": self.days_to_expiry,
        }


# ── BRANCH ───────────────────────────────────────────────────
class Branch(Base):
    __tablename__ = "branches"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    company_id      = Column(UUID(as_uuid=True), nullable=False)
    code            = Column(String(20), nullable=False)       # KTM-HQ
    name            = Column(String(200), nullable=False)
    short_name      = Column(String(80))
    branch_type     = Column(String(50), default="Branch Office")
    # Types: Headquarters | Branch Office | Regional Office | International | Virtual | Project Site
    country         = Column(String(60), default="Nepal")
    province        = Column(String(80))
    district        = Column(String(80))
    municipality    = Column(String(100))
    ward_no         = Column(String(10))
    address         = Column(Text)
    phone           = Column(String(30))
    email           = Column(String(150))
    manager_name    = Column(String(150))
    manager_id      = Column(UUID(as_uuid=True))
    cost_center_code= Column(String(30))
    is_primary      = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    established_date= Column(Date)
    latitude        = Column(Numeric(10, 7))
    longitude       = Column(Numeric(10, 7))
    labour_office   = Column(String(200))   # Labour office jurisdiction
    created_by      = Column(UUID(as_uuid=True))
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    company         = relationship("Company", back_populates="branches",
                                   foreign_keys=[company_id],
                                   primaryjoin="Branch.company_id == Company.id")
    __table_args__  = (UniqueConstraint("tenant_id", "code"),)

    def to_dict(self):
        return {
            "id": str(self.id), "code": self.code, "name": self.name,
            "short_name": self.short_name, "branch_type": self.branch_type,
            "country": self.country, "province": self.province,
            "district": self.district, "municipality": self.municipality,
            "ward_no": self.ward_no, "address": self.address,
            "phone": self.phone, "email": self.email,
            "manager_name": self.manager_name,
            "cost_center_code": self.cost_center_code,
            "is_primary": self.is_primary, "is_active": self.is_active,
            "latitude": float(self.latitude) if self.latitude else None,
            "longitude": float(self.longitude) if self.longitude else None,
            "labour_office": self.labour_office,
        }


# ── FLASK BLUEPRINTS ──────────────────────────────────────────
group_bp  = Blueprint("group_company", __name__, url_prefix="/api/v1/group-companies")
branch_bp = Blueprint("branches",      __name__, url_prefix="/api/v1/branches")

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        g.tenant_id   = request.headers.get("X-Tenant-Id")
        g.employee_id = request.headers.get("X-Employee-Id")
        g.role        = request.headers.get("X-Role", "employee")
        if not g.tenant_id:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# Group Company CRUD
@group_bp.route("/", methods=["GET"])
@require_auth
def list_groups():
    from ..database import db_session
    groups = db_session.query(GroupCompany).filter_by(tenant_id=g.tenant_id, is_active=True).all()
    return jsonify({"success": True, "count": len(groups), "data": [gr.to_dict() for gr in groups]})

@group_bp.route("/", methods=["POST"])
@require_auth
def create_group():
    from ..database import db_session
    data = request.get_json()
    grp = GroupCompany(tenant_id=g.tenant_id, created_by=g.employee_id, **{
        k: data.get(k) for k in ["code","name","short_name","company_type","country",
        "currency_code","pan_number","contact_email","website","description"]
        if data.get(k) is not None
    })
    db_session.add(grp); db_session.commit()
    return jsonify({"success": True, "data": grp.to_dict()}), 201

# Branch CRUD
@branch_bp.route("/", methods=["GET"])
@require_auth
def list_branches():
    from ..database import db_session
    company_id = request.args.get("company_id")
    q = db_session.query(Branch).filter_by(tenant_id=g.tenant_id, is_active=True)
    if company_id: q = q.filter_by(company_id=company_id)
    branches = q.order_by(Branch.is_primary.desc(), Branch.name).all()
    return jsonify({"success": True, "count": len(branches), "data": [b.to_dict() for b in branches]})

@branch_bp.route("/", methods=["POST"])
@require_auth
def create_branch():
    from ..database import db_session
    data = request.get_json()
    br = Branch(tenant_id=g.tenant_id, created_by=g.employee_id,
                company_id=data["company_id"], code=data["code"], name=data["name"],
                short_name=data.get("short_name"), branch_type=data.get("branch_type","Branch Office"),
                country=data.get("country","Nepal"), province=data.get("province"),
                district=data.get("district"), municipality=data.get("municipality"),
                ward_no=data.get("ward_no"), address=data.get("address"),
                phone=data.get("phone"), email=data.get("email"),
                manager_name=data.get("manager_name"), manager_id=data.get("manager_id"),
                cost_center_code=data.get("cost_center_code"),
                is_primary=data.get("is_primary", False),
                labour_office=data.get("labour_office"))
    db_session.add(br); db_session.commit()
    return jsonify({"success": True, "data": br.to_dict()}), 201
