# ============================================================
# FILE: backend/models/company_setup_models.py
# PURPOSE: SQLAlchemy ORM models for Organization Setup
# ============================================================

import uuid, hashlib
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import (
    Column, String, Boolean, Integer, Text,
    DateTime, ForeignKey, Numeric, Date, ARRAY,
    UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.ext.hybrid import hybrid_property


class Base(DeclarativeBase):
    pass


def now_utc():
    return datetime.now(timezone.utc)


# ── Nepal mandatory documents list ───────────────────────────
NEPAL_MANDATORY_DOCS = [
    {"category": "ocr_certificate",   "name": "Company Registration Certificate (OCR)", "authority": "Office of Company Registrar (OCR)", "mandatory": True,  "description": "Registration under Companies Act 2063"},
    {"category": "pan_certificate",   "name": "PAN Certificate",                         "authority": "Inland Revenue Department (IRD)",  "mandatory": True,  "description": "Permanent Account Number"},
    {"category": "vat_certificate",   "name": "VAT Registration Certificate",            "authority": "Inland Revenue Department (IRD)",  "mandatory": True,  "description": "VAT registration"},
    {"category": "tax_clearance",     "name": "Tax Clearance Certificate",               "authority": "Inland Revenue Department (IRD)",  "mandatory": True,  "description": "Annual IRD clearance"},
    {"category": "ssf_registration",  "name": "SSF Employer Registration",               "authority": "Social Security Fund (SSF)",       "mandatory": True,  "description": "Labour Act 2074 Section 102"},
    {"category": "labour_audit_report","name": "Annual Labour Audit Report",             "authority": "Department of Labour (DoL)",       "mandatory": True,  "description": "Labour Act 2074 Section 142"},
    {"category": "ward_registration", "name": "Ward/Municipality Registration",          "authority": "Local Ward Office",                "mandatory": True,  "description": "Local business registration"},
    {"category": "company_statute",   "name": "Memorandum & Articles of Association",    "authority": "Office of Company Registrar",      "mandatory": True,  "description": "MOA and AOA"},
    {"category": "trade_license",     "name": "Trade License / Firm Renewal",            "authority": "Department of Commerce",           "mandatory": True,  "description": "Annual renewal"},
    {"category": "audited_accounts",  "name": "Audited Financial Statements",            "authority": "Chartered Accountant (ICAN)",      "mandatory": True,  "description": "Annual audited accounts"},
]

COUNTRY_MANDATORY_DOCS = {
    "NP": NEPAL_MANDATORY_DOCS,
    "IN": [
        {"category": "incorporation_certificate", "name": "Certificate of Incorporation", "authority": "Ministry of Corporate Affairs (MCA)", "mandatory": True, "description": "CIN from MCA"},
        {"category": "pan_certificate",           "name": "Company PAN Card",              "authority": "Income Tax Department",              "mandatory": True, "description": "PAN for taxation"},
        {"category": "vat_certificate",           "name": "GST Registration Certificate",  "authority": "GSTN",                               "mandatory": True, "description": "GST registration"},
        {"category": "ssf_registration",          "name": "EPFO Employer Code",            "authority": "EPFO",                               "mandatory": True, "description": "Mandatory PF registration"},
        {"category": "trade_license",             "name": "Shop & Establishment License",  "authority": "State Labour Department",            "mandatory": True, "description": "State requirement"},
    ],
    "GB": [
        {"category": "incorporation_certificate", "name": "Certificate of Incorporation",  "authority": "Companies House",                    "mandatory": True, "description": "UK company registration"},
        {"category": "vat_certificate",           "name": "VAT Registration",              "authority": "HMRC",                               "mandatory": True, "description": "VAT registration"},
        {"category": "pan_certificate",           "name": "PAYE Reference",                "authority": "HMRC",                               "mandatory": True, "description": "Employer PAYE"},
        {"category": "insurance_certificate",     "name": "Employers Liability Insurance", "authority": "FCA Approved Insurer",               "mandatory": True, "description": "Legal requirement"},
    ],
}


# ============================================================
# MODEL 1: GroupCompany
# ============================================================
class GroupCompany(Base):
    __tablename__ = "group_companies"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id               = Column(UUID(as_uuid=True), nullable=False)
    code                    = Column(String(20),  nullable=False)
    name                    = Column(String(200), nullable=False)
    legal_name              = Column(String(200), nullable=False)
    short_name              = Column(String(50))
    description             = Column(Text)
    logo_url                = Column(Text)
    website                 = Column(String(200))
    group_type              = Column(String(30), default="holding")
    registration_number     = Column(String(100))
    registration_date       = Column(Date)
    registration_authority  = Column(String(200), default="Office of Company Registrar (OCR)")
    registration_country    = Column(String(5), default="NP")
    company_type            = Column(String(50))
    pan_number              = Column(String(20))
    vat_number              = Column(String(20))
    tax_office              = Column(String(100))
    fiscal_year_start       = Column(String(10), default="SHRAWAN")
    base_currency           = Column(String(5), default="NPR")
    authorized_capital      = Column(Numeric(18, 2))
    paid_up_capital         = Column(Numeric(18, 2))
    registered_address      = Column(Text)
    corporate_office        = Column(Text)
    phone                   = Column(String(30))
    email                   = Column(String(150))
    is_active               = Column(Boolean, default=True)
    incorporated_on         = Column(Date)
    ai_summary              = Column(Text)
    ai_compliance_score     = Column(Integer)
    created_by              = Column(UUID(as_uuid=True))
    created_at              = Column(DateTime(timezone=True), default=now_utc)
    updated_at              = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    companies       = relationship("Company", back_populates="group_company")
    legal_documents = relationship("LegalDocument",
                                   primaryjoin="and_(LegalDocument.entity_id==GroupCompany.id,"
                                               "LegalDocument.entity_type=='group_company')",
                                   foreign_keys="LegalDocument.entity_id",
                                   overlaps="legal_documents")

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_group_tenant_code"),
    )

    def to_dict(self) -> dict:
        return {
            "id":                     str(self.id),
            "code":                   self.code,
            "name":                   self.name,
            "legal_name":             self.legal_name,
            "group_type":             self.group_type,
            "registration_number":    self.registration_number,
            "pan_number":             self.pan_number,
            "base_currency":          self.base_currency,
            "is_active":              self.is_active,
            "companies_count":        len(self.companies) if self.companies else 0,
            "ai_summary":             self.ai_summary,
            "ai_compliance_score":    self.ai_compliance_score,
        }


# ============================================================
# MODEL 2: Company
# ============================================================
class Company(Base):
    __tablename__ = "companies"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id               = Column(UUID(as_uuid=True), nullable=False)
    group_company_id        = Column(UUID(as_uuid=True), ForeignKey("group_companies.id"))
    code                    = Column(String(20),  nullable=False)
    name                    = Column(String(200), nullable=False)
    legal_name              = Column(String(200), nullable=False)
    short_name              = Column(String(50))
    description             = Column(Text)
    logo_url                = Column(Text)
    website                 = Column(String(200))
    industry                = Column(String(100))
    company_type            = Column(String(50))
    employee_size_range     = Column(String(30))
    ocr_registration_number = Column(String(100))
    ocr_registration_date   = Column(Date)
    ocr_expiry_date         = Column(Date)
    pan_number              = Column(String(20), nullable=False)
    vat_number              = Column(String(20))
    ird_office              = Column(String(100))
    tax_clearance_date      = Column(Date)
    tax_clearance_valid_to  = Column(Date)
    ssf_employer_code       = Column(String(50))
    ssf_registration_date   = Column(Date)
    epf_number              = Column(String(50))
    labour_audit_date       = Column(Date)
    next_labour_audit_due   = Column(Date)
    labour_office_zone      = Column(String(100))
    collective_agreement    = Column(Boolean, default=False)
    min_wage_applicable     = Column(Numeric(10, 2), default=15000)
    ward_number             = Column(String(10))
    municipality            = Column(String(100))
    district                = Column(String(100))
    province                = Column(String(50))
    base_currency           = Column(String(5), default="NPR")
    fiscal_year_type        = Column(String(20), default="NEPALI")
    fiscal_year_start_month = Column(Integer, default=4)
    authorized_capital      = Column(Numeric(18, 2))
    paid_up_capital         = Column(Numeric(18, 2))
    registered_address      = Column(Text)
    corporate_address       = Column(Text)
    phone                   = Column(String(30))
    email                   = Column(String(150))
    hr_email                = Column(String(150))
    is_listed_company       = Column(Boolean, default=False)
    is_foreign_company      = Column(Boolean, default=False)
    foreign_worker_pct      = Column(Numeric(5, 2), default=0)
    requires_audit          = Column(Boolean, default=True)
    is_active               = Column(Boolean, default=True)
    is_primary              = Column(Boolean, default=False)
    setup_completed         = Column(Boolean, default=False)
    setup_completion_pct    = Column(Integer, default=0)
    ai_summary              = Column(Text)
    ai_compliance_score     = Column(Integer)
    ai_insights             = Column(JSONB)
    created_by              = Column(UUID(as_uuid=True))
    created_at              = Column(DateTime(timezone=True), default=now_utc)
    updated_at              = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    group_company   = relationship("GroupCompany", back_populates="companies")
    branches        = relationship("Branch", back_populates="company")
    legal_documents = relationship("LegalDocument",
                                   primaryjoin="and_(LegalDocument.entity_id==Company.id,"
                                               "LegalDocument.entity_type=='company')",
                                   foreign_keys="LegalDocument.entity_id",
                                   overlaps="legal_documents")
    setup_progress  = relationship("CompanySetupProgress", back_populates="company")

    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_company_tenant_code"),
    )

    @hybrid_property
    def doc_compliance_pct(self) -> float:
        if not self.legal_documents:
            return 0.0
        mandatory = [d for d in self.legal_documents if d.is_mandatory]
        if not mandatory:
            return 100.0
        uploaded = [d for d in mandatory
                    if d.upload_status in ("uploaded", "verified")]
        return round(len(uploaded) * 100 / len(mandatory), 1)

    @hybrid_property
    def expiring_docs(self) -> list:
        today = date.today()
        threshold = today + timedelta(days=30)
        return [
            d for d in self.legal_documents
            if d.expiry_date and today <= d.expiry_date <= threshold
        ]

    def to_dict(self, include_docs: bool = False) -> dict:
        data = {
            "id":                     str(self.id),
            "code":                   self.code,
            "name":                   self.name,
            "legal_name":             self.legal_name,
            "pan_number":             self.pan_number,
            "vat_number":             self.vat_number,
            "ocr_registration_number":self.ocr_registration_number,
            "ssf_employer_code":      self.ssf_employer_code,
            "industry":               self.industry,
            "company_type":           self.company_type,
            "base_currency":          self.base_currency,
            "municipality":           self.municipality,
            "district":               self.district,
            "province":               self.province,
            "min_wage_applicable":    float(self.min_wage_applicable or 15000),
            "foreign_worker_pct":     float(self.foreign_worker_pct or 0),
            "setup_completed":        self.setup_completed,
            "setup_completion_pct":   self.setup_completion_pct,
            "doc_compliance_pct":     self.doc_compliance_pct,
            "expiring_docs_count":    len(self.expiring_docs),
            "branches_count":         len(self.branches) if self.branches else 0,
            "is_active":              self.is_active,
            "ai_summary":             self.ai_summary,
            "ai_compliance_score":    self.ai_compliance_score,
        }
        if include_docs:
            data["legal_documents"] = [d.to_dict() for d in self.legal_documents]
        return data


# ============================================================
# MODEL 3: LegalDocument
# ============================================================
class LegalDocument(Base):
    __tablename__ = "legal_documents"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    entity_type         = Column(String(30), nullable=False)
    entity_id           = Column(UUID(as_uuid=True), nullable=False)
    doc_category        = Column(String(50), nullable=False)
    doc_name            = Column(String(200), nullable=False)
    doc_number          = Column(String(100))
    is_mandatory        = Column(Boolean, default=True)
    file_name           = Column(String(255))
    file_url            = Column(Text)
    file_size_kb        = Column(Integer)
    file_type           = Column(String(20))
    file_hash           = Column(String(64))
    issue_date          = Column(Date)
    expiry_date         = Column(Date)
    issued_by           = Column(String(200))
    upload_status       = Column(String(20), default="pending")
    verified_by         = Column(UUID(as_uuid=True))
    verified_at         = Column(DateTime(timezone=True))
    verification_notes  = Column(Text)
    ai_extracted_data   = Column(JSONB)
    ai_verified         = Column(Boolean, default=False)
    ai_expiry_alert     = Column(Boolean, default=False)
    uploaded_by         = Column(UUID(as_uuid=True))
    uploaded_at         = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    reminder_30_sent    = Column(Boolean, default=False)
    reminder_7_sent     = Column(Boolean, default=False)
    reminder_sent_at    = Column(DateTime(timezone=True))

    @hybrid_property
    def days_to_expiry(self) -> int | None:
        if not self.expiry_date:
            return None
        return (self.expiry_date - date.today()).days

    @hybrid_property
    def is_expired(self) -> bool:
        return bool(self.expiry_date and self.expiry_date < date.today())

    @hybrid_property
    def expiry_urgency(self) -> str:
        days = self.days_to_expiry
        if days is None:
            return "no_expiry"
        if days < 0:
            return "expired"
        if days <= 7:
            return "critical"
        if days <= 30:
            return "warning"
        return "ok"

    def to_dict(self) -> dict:
        return {
            "id":                 str(self.id),
            "doc_category":       self.doc_category,
            "doc_name":           self.doc_name,
            "doc_number":         self.doc_number,
            "is_mandatory":       self.is_mandatory,
            "file_name":          self.file_name,
            "file_url":           self.file_url,
            "file_type":          self.file_type,
            "issue_date":         self.issue_date.isoformat() if self.issue_date else None,
            "expiry_date":        self.expiry_date.isoformat() if self.expiry_date else None,
            "issued_by":          self.issued_by,
            "upload_status":      self.upload_status,
            "days_to_expiry":     self.days_to_expiry,
            "is_expired":         self.is_expired,
            "expiry_urgency":     self.expiry_urgency,
            "ai_verified":        self.ai_verified,
            "ai_extracted_data":  self.ai_extracted_data,
            "uploaded_at":        self.uploaded_at.isoformat() if self.uploaded_at else None,
        }


# ============================================================
# MODEL 4: Branch
# ============================================================
class Branch(Base):
    __tablename__ = "branches"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id           = Column(UUID(as_uuid=True), nullable=False)
    company_id          = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    code                = Column(String(20),  nullable=False)
    name                = Column(String(200), nullable=False)
    short_name          = Column(String(50))
    description         = Column(Text)
    branch_type         = Column(String(30), default="branch")
    is_headquarters     = Column(Boolean, default=False)
    address_line1       = Column(String(200))
    address_line2       = Column(String(200))
    ward_number         = Column(String(10))
    tole                = Column(String(100))
    city                = Column(String(100))
    municipality        = Column(String(100))
    district            = Column(String(100))
    province            = Column(String(50))
    country_code        = Column(String(5), default="NP")
    country_name        = Column(String(100), default="Nepal")
    postal_code         = Column(String(20))
    latitude            = Column(Numeric(10, 7))
    longitude           = Column(Numeric(10, 7))
    google_maps_url     = Column(Text)
    timezone            = Column(String(50), default="Asia/Kathmandu")
    utc_offset          = Column(String(10), default="+05:45")
    working_days        = Column(ARRAY(String), default=["Sun","Mon","Tue","Wed","Thu"])
    standard_hours      = Column(Numeric(4, 1), default=8.0)
    branch_pan          = Column(String(20))
    branch_vat          = Column(String(20))
    ward_registration_no= Column(String(50))
    ssf_employer_code   = Column(String(50))
    local_tax_office    = Column(String(100))
    labour_office_zone  = Column(String(100))
    phone               = Column(String(30))
    email               = Column(String(150))
    branch_head_name    = Column(String(150))
    branch_head_id      = Column(UUID(as_uuid=True))
    employee_count      = Column(Integer, default=0)
    is_active           = Column(Boolean, default=True)
    established_date    = Column(Date)
    ai_compliance_score = Column(Integer)
    created_by          = Column(UUID(as_uuid=True))
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    company         = relationship("Company", back_populates="branches")
    legal_documents = relationship("LegalDocument",
                                   primaryjoin="and_(LegalDocument.entity_id==Branch.id,"
                                               "LegalDocument.entity_type=='branch')",
                                   foreign_keys="LegalDocument.entity_id",
                                   overlaps="legal_documents")

    def to_dict(self) -> dict:
        return {
            "id":                str(self.id),
            "code":              self.code,
            "name":              self.name,
            "branch_type":       self.branch_type,
            "is_headquarters":   self.is_headquarters,
            "city":              self.city,
            "district":          self.district,
            "province":          self.province,
            "country_code":      self.country_code,
            "timezone":          self.timezone,
            "utc_offset":        self.utc_offset,
            "working_days":      self.working_days,
            "standard_hours":    float(self.standard_hours or 8),
            "branch_pan":        self.branch_pan,
            "ssf_employer_code": self.ssf_employer_code,
            "labour_office_zone":self.labour_office_zone,
            "employee_count":    self.employee_count,
            "branch_head_name":  self.branch_head_name,
            "latitude":          float(self.latitude) if self.latitude else None,
            "longitude":         float(self.longitude) if self.longitude else None,
            "is_active":         self.is_active,
        }


# ============================================================
# MODEL 5: CompanySetupProgress
# ============================================================
class CompanySetupProgress(Base):
    __tablename__ = "company_setup_progress"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), nullable=False)
    company_id      = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    step_code       = Column(String(50), nullable=False)
    step_name       = Column(String(100))
    step_order      = Column(Integer)
    is_completed    = Column(Boolean, default=False)
    is_mandatory    = Column(Boolean, default=True)
    completed_at    = Column(DateTime(timezone=True))
    completed_by    = Column(UUID(as_uuid=True))
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    company = relationship("Company", back_populates="setup_progress")

    SETUP_STEPS = [
        {"code": "company_profile",   "name": "Company Profile",         "order": 1, "mandatory": True},
        {"code": "statutory_details", "name": "Statutory Registration",  "order": 2, "mandatory": True},
        {"code": "tax_details",       "name": "Tax & PAN/VAT Setup",     "order": 3, "mandatory": True},
        {"code": "financial_setup",   "name": "Financial Configuration",  "order": 4, "mandatory": True},
        {"code": "contact_info",      "name": "Contact & Address",       "order": 5, "mandatory": True},
        {"code": "legal_documents",   "name": "Legal Documents Upload",  "order": 6, "mandatory": True},
        {"code": "group_setup",       "name": "Group Company Link",      "order": 7, "mandatory": False},
        {"code": "branch_setup",      "name": "Branch & Location",       "order": 8, "mandatory": False},
        {"code": "bu_setup",          "name": "Business Unit / Division","order": 9, "mandatory": False},
        {"code": "review_complete",   "name": "Review & Activate",       "order": 10,"mandatory": True},
    ]

    def to_dict(self) -> dict:
        return {
            "step_code":    self.step_code,
            "step_name":    self.step_name,
            "step_order":   self.step_order,
            "is_completed": self.is_completed,
            "is_mandatory": self.is_mandatory,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
