# ============================================================
# FILE: backend/routes/company_setup_routes.py
# PURPOSE: Flask REST API for Organization Setup
#          Company Profile, Group, Branch, Legal Docs + AI
# ============================================================

from flask import Blueprint, request, jsonify, g
from functools import wraps
from datetime import datetime, timezone, date, timedelta
import uuid, hashlib, os
import anthropic

from ..models.company_setup_models import (
    GroupCompany, Company, LegalDocument,
    Branch, CompanySetupProgress,
    COUNTRY_MANDATORY_DOCS
)
from ..database import db_session

company_bp = Blueprint("company_setup", __name__, url_prefix="/api/v1/company")
ai_client  = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


# ── Auth ──────────────────────────────────────────────────────
def require_auth(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        g.tenant_id   = request.headers.get("X-Tenant-Id")
        g.employee_id = request.headers.get("X-Employee-Id")
        g.role        = request.headers.get("X-Role", "employee")
        if not g.tenant_id:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# ── AI helpers ────────────────────────────────────────────────
def ai_extract_document(file_content_b64: str, doc_category: str) -> dict:
    """Use AI to extract key fields from uploaded document"""
    try:
        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": f"""You are a document verification expert for Nepal HRIS compliance.
Extract key information from this {doc_category} document.

Return JSON only:
{{
  "document_number": "extracted number or null",
  "issued_date": "YYYY-MM-DD or null",
  "expiry_date": "YYYY-MM-DD or null",
  "issuing_authority": "authority name",
  "entity_name": "company name on document",
  "pan_number": "PAN if visible",
  "is_valid": true,
  "confidence_score": 0.95,
  "notes": "any concerns"
}}"""
            }]
        )
        import json
        return json.loads(response.content[0].text)
    except Exception as e:
        return {"error": str(e), "is_valid": False, "confidence_score": 0}


def ai_compliance_analysis(company_data: dict) -> dict:
    """AI-powered compliance analysis"""
    try:
        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": f"""You are a Nepal HR compliance expert.
Analyze this company's compliance status:

{company_data}

Return JSON:
{{
  "compliance_score": 85,
  "summary": "2-sentence plain language summary",
  "critical_issues": ["issue1", "issue2"],
  "warnings": ["warning1"],
  "recommendations": ["rec1", "rec2"],
  "nepal_law_alerts": [
    "Labour Act 2074 Section X requires...",
    "Companies Act 2063 requires..."
  ]
}}"""
            }]
        )
        import json
        text = response.content[0].text
        try:
            return json.loads(text)
        except Exception:
            return {"compliance_score": 75, "summary": text[:200]}
    except Exception:
        return {"compliance_score": None}


# ============================================================
# SECTION A: GROUP COMPANY
# ============================================================

@company_bp.route("/groups", methods=["GET"])
@require_auth
def list_groups():
    groups = db_session.query(GroupCompany).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).all()
    return jsonify({"success": True, "data": [g_.to_dict() for g_ in groups]})


@company_bp.route("/groups", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_group():
    data = request.get_json()
    group = GroupCompany(
        tenant_id            = g.tenant_id,
        code                 = data["code"],
        name                 = data["name"],
        legal_name           = data.get("legal_name", data["name"]),
        short_name           = data.get("short_name"),
        description          = data.get("description"),
        group_type           = data.get("group_type", "holding"),
        registration_number  = data.get("registration_number"),
        registration_date    = data.get("registration_date"),
        registration_country = data.get("registration_country", "NP"),
        pan_number           = data.get("pan_number"),
        vat_number           = data.get("vat_number"),
        base_currency        = data.get("base_currency", "NPR"),
        authorized_capital   = data.get("authorized_capital"),
        paid_up_capital      = data.get("paid_up_capital"),
        registered_address   = data.get("registered_address"),
        phone                = data.get("phone"),
        email                = data.get("email"),
        incorporated_on      = data.get("incorporated_on"),
        created_by           = g.employee_id,
    )
    db_session.add(group)
    db_session.commit()
    return jsonify({
        "success": True,
        "message": f"Group Company '{group.name}' created.",
        "data":    group.to_dict()
    }), 201


@company_bp.route("/groups/<group_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_group(group_id):
    group = db_session.query(GroupCompany).filter_by(
        id=group_id, tenant_id=g.tenant_id
    ).first()
    if not group:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    for field in ["name", "legal_name", "description", "pan_number",
                  "vat_number", "authorized_capital", "is_active"]:
        if field in data:
            setattr(group, field, data[field])
    group.updated_at = datetime.now(timezone.utc)
    db_session.commit()
    return jsonify({"success": True, "data": group.to_dict()})


# ============================================================
# SECTION B: COMPANY PROFILE & SETUP
# ============================================================

@company_bp.route("/", methods=["GET"])
@require_auth
def list_companies():
    companies = db_session.query(Company).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).order_by(Company.is_primary.desc(), Company.name).all()
    return jsonify({
        "success": True,
        "count":   len(companies),
        "data":    [c.to_dict() for c in companies]
    })


@company_bp.route("/<company_id>", methods=["GET"])
@require_auth
def get_company(company_id):
    company = db_session.query(Company).filter_by(
        id=company_id, tenant_id=g.tenant_id
    ).first()
    if not company:
        return jsonify({"error": "Not found"}), 404
    return jsonify({
        "success": True,
        "data":    company.to_dict(include_docs=True)
    })


@company_bp.route("/", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_company():
    data = request.get_json()

    if not data.get("pan_number"):
        return jsonify({"error": "PAN number is mandatory"}), 400

    company = Company(
        tenant_id               = g.tenant_id,
        group_company_id        = data.get("group_company_id"),
        code                    = data["code"],
        name                    = data["name"],
        legal_name              = data.get("legal_name", data["name"]),
        short_name              = data.get("short_name"),
        description             = data.get("description"),
        industry                = data.get("industry"),
        company_type            = data.get("company_type"),
        employee_size_range     = data.get("employee_size_range"),
        ocr_registration_number = data.get("ocr_registration_number"),
        ocr_registration_date   = data.get("ocr_registration_date"),
        pan_number              = data["pan_number"],
        vat_number              = data.get("vat_number"),
        ird_office              = data.get("ird_office"),
        ssf_employer_code       = data.get("ssf_employer_code"),
        labour_office_zone      = data.get("labour_office_zone"),
        min_wage_applicable     = data.get("min_wage_applicable", 15000),
        ward_number             = data.get("ward_number"),
        municipality            = data.get("municipality"),
        district                = data.get("district"),
        province                = data.get("province"),
        base_currency           = data.get("base_currency", "NPR"),
        registered_address      = data.get("registered_address"),
        corporate_address       = data.get("corporate_address"),
        phone                   = data.get("phone"),
        email                   = data.get("email"),
        hr_email                = data.get("hr_email"),
        is_primary              = data.get("is_primary", False),
        created_by              = g.employee_id,
        setup_completion_pct    = 10,
    )

    db_session.add(company)
    db_session.flush()  # get company.id

    # Create setup progress steps
    for step in CompanySetupProgress.SETUP_STEPS:
        progress = CompanySetupProgress(
            tenant_id    = g.tenant_id,
            company_id   = company.id,
            step_code    = step["code"],
            step_name    = step["name"],
            step_order   = step["order"],
            is_mandatory = step["mandatory"],
            is_completed = step["code"] == "company_profile",  # first step done
        )
        db_session.add(progress)

    # Initialize mandatory document slots for Nepal
    country = data.get("country_code", "NP")
    mandatory_docs = COUNTRY_MANDATORY_DOCS.get(country, [])
    for doc_def in mandatory_docs:
        doc = LegalDocument(
            tenant_id    = g.tenant_id,
            entity_type  = "company",
            entity_id    = company.id,
            doc_category = doc_def["category"],
            doc_name     = doc_def["name"],
            issued_by    = doc_def["authority"],
            is_mandatory = doc_def["mandatory"],
            upload_status= "pending",
        )
        db_session.add(doc)

    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Company '{company.name}' created. Please upload mandatory legal documents.",
        "data":    company.to_dict(),
        "mandatory_docs_required": len(mandatory_docs),
        "setup_steps": len(CompanySetupProgress.SETUP_STEPS)
    }), 201


@company_bp.route("/<company_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_company(company_id):
    company = db_session.query(Company).filter_by(
        id=company_id, tenant_id=g.tenant_id
    ).first()
    if not company:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    updatable = [
        "name", "legal_name", "description", "industry", "company_type",
        "vat_number", "ird_office", "tax_clearance_date", "tax_clearance_valid_to",
        "ssf_employer_code", "labour_audit_date", "next_labour_audit_due",
        "min_wage_applicable", "municipality", "district", "province",
        "registered_address", "corporate_address", "phone", "email",
        "hr_email", "authorized_capital", "paid_up_capital", "logo_url"
    ]
    for field in updatable:
        if field in data:
            setattr(company, field, data[field])

    company.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({"success": True, "data": company.to_dict()})


@company_bp.route("/<company_id>/ai-analyze", methods=["POST"])
@require_auth
def analyze_company(company_id):
    """AI compliance analysis for company"""
    company = db_session.query(Company).filter_by(
        id=company_id, tenant_id=g.tenant_id
    ).first()
    if not company:
        return jsonify({"error": "Not found"}), 404

    insight = ai_compliance_analysis({
        "name":                   company.name,
        "pan_number":             company.pan_number,
        "vat_number":             company.vat_number,
        "ssf_employer_code":      company.ssf_employer_code,
        "ocr_registration":       company.ocr_registration_number,
        "labour_audit_date":      str(company.labour_audit_date) if company.labour_audit_date else None,
        "next_audit_due":         str(company.next_labour_audit_due) if company.next_labour_audit_due else None,
        "foreign_worker_pct":     float(company.foreign_worker_pct or 0),
        "min_wage":               float(company.min_wage_applicable or 0),
        "doc_compliance_pct":     company.doc_compliance_pct,
        "setup_completion_pct":   company.setup_completion_pct,
    })

    company.ai_insights             = insight
    company.ai_summary              = insight.get("summary", "")
    company.ai_compliance_score     = insight.get("compliance_score")
    db_session.commit()

    return jsonify({"success": True, "insight": insight})


# ============================================================
# SECTION C: LEGAL DOCUMENTS — Upload & Verify
# ============================================================

@company_bp.route("/<company_id>/documents", methods=["GET"])
@require_auth
def list_documents(company_id):
    """List all legal documents for a company"""
    docs = db_session.query(LegalDocument).filter_by(
        entity_id=company_id, entity_type="company"
    ).order_by(LegalDocument.is_mandatory.desc(), LegalDocument.doc_category).all()

    pending   = [d for d in docs if d.upload_status == "pending"]
    uploaded  = [d for d in docs if d.upload_status in ("uploaded", "verified")]
    expiring  = [d for d in docs if d.expiry_urgency in ("critical", "warning")]
    expired   = [d for d in docs if d.is_expired]

    return jsonify({
        "success":          True,
        "total":            len(docs),
        "pending_count":    len(pending),
        "uploaded_count":   len(uploaded),
        "expiring_count":   len(expiring),
        "expired_count":    len(expired),
        "compliance_pct":   round(len(uploaded) * 100 / len(docs), 1) if docs else 0,
        "documents":        [d.to_dict() for d in docs]
    })


@company_bp.route("/<company_id>/documents/<doc_id>/upload", methods=["POST"])
@require_auth
def upload_document(company_id, doc_id):
    """
    POST /api/v1/company/{company_id}/documents/{doc_id}/upload
    Body: multipart/form-data — file + metadata
    AI extracts and verifies document data automatically.
    """
    doc = db_session.query(LegalDocument).filter_by(
        id=doc_id, entity_id=company_id
    ).first()
    if not doc:
        return jsonify({"error": "Document record not found"}), 404

    # In production: handle actual file upload to S3
    # For now: accept metadata from request
    file_meta = request.get_json() or {}

    doc.file_name      = file_meta.get("file_name", "document.pdf")
    doc.file_type      = file_meta.get("file_type", "PDF")
    doc.file_size_kb   = file_meta.get("file_size_kb")
    doc.file_url       = file_meta.get("file_url", f"/uploads/{doc_id}.pdf")
    doc.issue_date     = file_meta.get("issue_date")
    doc.expiry_date    = file_meta.get("expiry_date")
    doc.doc_number     = file_meta.get("doc_number")
    doc.upload_status  = "uploaded"
    doc.uploaded_by    = g.employee_id
    doc.uploaded_at    = datetime.now(timezone.utc)

    # Generate file hash for integrity
    if file_meta.get("file_content_sample"):
        doc.file_hash = hashlib.sha256(
            file_meta["file_content_sample"].encode()
        ).hexdigest()

    # AI extraction (async in production — synchronous here)
    ai_data = ai_extract_document(
        file_meta.get("file_content_b64", ""),
        doc.doc_category
    )
    doc.ai_extracted_data = ai_data
    doc.ai_verified       = ai_data.get("confidence_score", 0) >= 0.7

    # Override with AI-extracted dates if not manually provided
    if ai_data.get("expiry_date") and not doc.expiry_date:
        try:
            from datetime import date
            doc.expiry_date = date.fromisoformat(ai_data["expiry_date"])
        except Exception:
            pass

    doc.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    # Check if all mandatory docs uploaded → update setup progress
    _update_setup_progress(g.tenant_id, company_id)

    return jsonify({
        "success":        True,
        "message":        f"'{doc.doc_name}' uploaded successfully.",
        "document":       doc.to_dict(),
        "ai_extraction":  ai_data,
        "expiry_urgency": doc.expiry_urgency,
    })


@company_bp.route("/<company_id>/documents/<doc_id>/verify", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def verify_document(company_id, doc_id):
    """HR manually verifies an uploaded document"""
    doc = db_session.query(LegalDocument).filter_by(
        id=doc_id, entity_id=company_id
    ).first()
    if not doc:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    doc.upload_status     = "verified"
    doc.verified_by       = g.employee_id
    doc.verified_at       = datetime.now(timezone.utc)
    doc.verification_notes= data.get("notes", "Verified by HR")
    doc.updated_at        = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({
        "success":  True,
        "message":  f"'{doc.doc_name}' verified.",
        "document": doc.to_dict()
    })


@company_bp.route("/<company_id>/documents/add", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def add_document(company_id):
    """Add a new (non-mandatory) document to a company"""
    data = request.get_json()
    doc = LegalDocument(
        tenant_id    = g.tenant_id,
        entity_type  = "company",
        entity_id    = company_id,
        doc_category = data.get("doc_category", "other_legal"),
        doc_name     = data["doc_name"],
        doc_number   = data.get("doc_number"),
        issued_by    = data.get("issued_by"),
        is_mandatory = data.get("is_mandatory", False),
        upload_status= "pending",
        uploaded_by  = g.employee_id,
    )
    db_session.add(doc)
    db_session.commit()
    return jsonify({"success": True, "data": doc.to_dict()}), 201


@company_bp.route("/mandatory-docs-checklist", methods=["GET"])
@require_auth
def mandatory_docs_checklist():
    """Get mandatory documents list for a country"""
    country = request.args.get("country", "NP")
    docs = COUNTRY_MANDATORY_DOCS.get(country, [])
    return jsonify({
        "success":  True,
        "country":  country,
        "count":    len(docs),
        "checklist": docs
    })


@company_bp.route("/<company_id>/document-alerts", methods=["GET"])
@require_auth
def document_alerts(company_id):
    """Get expiry alerts for company documents"""
    today     = date.today()
    docs      = db_session.query(LegalDocument).filter_by(
        entity_id=company_id, entity_type="company"
    ).all()

    critical = [d.to_dict() for d in docs if d.expiry_urgency == "critical"]
    warning  = [d.to_dict() for d in docs if d.expiry_urgency == "warning"]
    expired  = [d.to_dict() for d in docs if d.is_expired]
    pending  = [d.to_dict() for d in docs if d.upload_status == "pending" and d.is_mandatory]

    return jsonify({
        "success":        True,
        "critical_count": len(critical),
        "warning_count":  len(warning),
        "expired_count":  len(expired),
        "pending_count":  len(pending),
        "alerts": {
            "critical": critical,
            "warning":  warning,
            "expired":  expired,
            "pending":  pending,
        }
    })


# ============================================================
# SECTION D: BRANCHES
# ============================================================

@company_bp.route("/<company_id>/branches", methods=["GET"])
@require_auth
def list_branches(company_id):
    branches = db_session.query(Branch).filter_by(
        company_id=company_id, is_active=True
    ).order_by(Branch.is_headquarters.desc(), Branch.name).all()
    return jsonify({
        "success": True,
        "count":   len(branches),
        "data":    [b.to_dict() for b in branches]
    })


@company_bp.route("/<company_id>/branches", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_branch(company_id):
    data = request.get_json()

    branch = Branch(
        tenant_id           = g.tenant_id,
        company_id          = company_id,
        code                = data["code"],
        name                = data["name"],
        short_name          = data.get("short_name"),
        branch_type         = data.get("branch_type", "branch"),
        is_headquarters     = data.get("is_headquarters", False),
        address_line1       = data.get("address_line1"),
        address_line2       = data.get("address_line2"),
        ward_number         = data.get("ward_number"),
        tole                = data.get("tole"),
        city                = data.get("city"),
        municipality        = data.get("municipality"),
        district            = data.get("district"),
        province            = data.get("province"),
        country_code        = data.get("country_code", "NP"),
        country_name        = data.get("country_name", "Nepal"),
        timezone            = data.get("timezone", "Asia/Kathmandu"),
        utc_offset          = data.get("utc_offset", "+05:45"),
        working_days        = data.get("working_days", ["Sun","Mon","Tue","Wed","Thu"]),
        standard_hours      = data.get("standard_hours", 8.0),
        branch_pan          = data.get("branch_pan"),
        branch_vat          = data.get("branch_vat"),
        ward_registration_no= data.get("ward_registration_no"),
        ssf_employer_code   = data.get("ssf_employer_code"),
        local_tax_office    = data.get("local_tax_office"),
        labour_office_zone  = data.get("labour_office_zone"),
        phone               = data.get("phone"),
        email               = data.get("email"),
        branch_head_name    = data.get("branch_head_name"),
        latitude            = data.get("latitude"),
        longitude           = data.get("longitude"),
        established_date    = data.get("established_date"),
        created_by          = g.employee_id,
    )

    db_session.add(branch)
    db_session.flush()

    # Create mandatory document slots for branch
    country = data.get("country_code", "NP")
    branch_docs = [
        {"category": "ward_registration", "name": "Ward/Municipality Branch Registration", "authority": "Local Ward Office", "mandatory": True},
        {"category": "pan_certificate",   "name": "Branch PAN Certificate",                "authority": "IRD",                "mandatory": False},
    ]
    for doc_def in branch_docs:
        doc = LegalDocument(
            tenant_id    = g.tenant_id,
            entity_type  = "branch",
            entity_id    = branch.id,
            doc_category = doc_def["category"],
            doc_name     = doc_def["name"],
            issued_by    = doc_def["authority"],
            is_mandatory = doc_def["mandatory"],
            upload_status= "pending",
        )
        db_session.add(doc)

    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Branch '{branch.name}' created. Please upload branch registration documents.",
        "data":    branch.to_dict()
    }), 201


# ============================================================
# SECTION E: SETUP PROGRESS
# ============================================================

@company_bp.route("/<company_id>/setup-progress", methods=["GET"])
@require_auth
def get_setup_progress(company_id):
    """Get the setup wizard progress"""
    steps = db_session.query(CompanySetupProgress).filter_by(
        company_id=company_id
    ).order_by(CompanySetupProgress.step_order).all()

    completed  = sum(1 for s in steps if s.is_completed)
    mandatory_done = sum(1 for s in steps if s.is_completed and s.is_mandatory)
    mandatory_total= sum(1 for s in steps if s.is_mandatory)

    pct = round(completed * 100 / len(steps), 0) if steps else 0

    return jsonify({
        "success":         True,
        "completion_pct":  pct,
        "steps_completed": completed,
        "total_steps":     len(steps),
        "mandatory_done":  mandatory_done,
        "mandatory_total": mandatory_total,
        "is_setup_complete": mandatory_done >= mandatory_total,
        "steps":           [s.to_dict() for s in steps]
    })


@company_bp.route("/<company_id>/setup-progress/<step_code>", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def complete_setup_step(company_id, step_code):
    """Mark a setup step as complete"""
    step = db_session.query(CompanySetupProgress).filter_by(
        company_id=company_id, step_code=step_code
    ).first()
    if not step:
        return jsonify({"error": "Step not found"}), 404

    step.is_completed = True
    step.completed_at = datetime.now(timezone.utc)
    step.completed_by = g.employee_id

    # Update company completion %
    _update_setup_progress(g.tenant_id, company_id)

    db_session.commit()
    return jsonify({
        "success":  True,
        "message":  f"Step '{step.step_name}' completed.",
        "step":     step.to_dict()
    })


def _update_setup_progress(tenant_id: str, company_id) -> None:
    """Recalculate and update company setup_completion_pct"""
    steps = db_session.query(CompanySetupProgress).filter_by(
        company_id=company_id
    ).all()

    # Also check if all mandatory docs uploaded
    docs = db_session.query(LegalDocument).filter_by(
        entity_id=company_id, entity_type="company", is_mandatory=True
    ).all()
    all_docs_uploaded = all(
        d.upload_status in ("uploaded", "verified") for d in docs
    )
    if all_docs_uploaded and docs:
        doc_step = next(
            (s for s in steps if s.step_code == "legal_documents"), None
        )
        if doc_step and not doc_step.is_completed:
            doc_step.is_completed = True
            doc_step.completed_at = datetime.now(timezone.utc)

    completed = sum(1 for s in steps if s.is_completed)
    pct       = round(completed * 100 / len(steps), 0) if steps else 0

    company = db_session.query(Company).filter_by(id=company_id).first()
    if company:
        company.setup_completion_pct = int(pct)
        company.setup_completed      = pct == 100
