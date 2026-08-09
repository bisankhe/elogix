# ============================================================
# FILE: backend/routes/org_setup_routes.py
# PURPOSE: Flask REST API for Organization Setup
#          Company Profile, Company Setup, Group Company,
#          Branch & Location, Legal Document Upload
#          AI-powered document OCR extraction
# STACK: Python 3.11 + Flask + SQLAlchemy + Anthropic AI
# ============================================================

from flask import Blueprint, request, jsonify, g
from functools import wraps
from datetime import datetime, timezone
import uuid
import os
import anthropic
import base64

from ..models.org_setup_models import (
    GroupCompany, Company, BranchLocation, LegalDocument
)
from ..database import db_session

org_setup_bp = Blueprint("org_setup", __name__, url_prefix="/api/v1/org-setup")
ai_client    = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


# ── Auth ──────────────────────────────────────────────────────
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


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# ── AI Document Extractor ────────────────────────────────────
def extract_document_data_ai(image_base64: str,
                              document_type: str,
                              country_code: str) -> dict:
    """
    Uses Claude Vision to extract data from scanned legal documents.
    Works for OCR certificates, PAN, VAT, SSF, Labour documents etc.
    """
    try:
        doc_hints = {
            "ocr_certificate":  "OCR registration certificate from Office of Company Registrar Nepal. Extract: registration number, company name, registration date, registered office address, company type.",
            "pan_certificate":  "PAN (Permanent Account Number) certificate from IRD Nepal. Extract: PAN number, entity name, registration date, business type.",
            "vat_certificate":  "VAT registration certificate from IRD Nepal. Extract: VAT number, registration date, business name, address.",
            "ssf_registration": "Social Security Fund registration from SSF Nepal. Extract: SSF registration number, employer name, registration date, branch.",
            "labour_audit_report": "Annual Labour Audit report from DoL Nepal. Extract: audit period, total employees, compliance status, findings.",
            "ward_registration":"Ward office registration document. Extract: ward number, registration number, municipality, date, business name.",
        }
        hint = doc_hints.get(document_type, f"Legal document of type: {document_type}")

        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": f"""You are an expert in legal document analysis for {country_code} ({
                            'Nepal' if country_code == 'NP' else country_code
                        }).

This document is: {hint}

Please extract all key information from this document and return as JSON:
{{
  "document_number": "...",
  "document_name": "...",
  "issued_by": "authority name",
  "issue_date": "YYYY-MM-DD or null",
  "expiry_date": "YYYY-MM-DD or null",
  "entity_name": "name of company/organization",
  "registration_address": "...",
  "document_type_detected": "...",
  "key_fields": {{}},
  "is_valid_document": true/false,
  "confidence_score": 0-100,
  "ocr_notes": "any issues with the scan quality"
}}"""
                    }
                ]
            }]
        )

        import json
        text = response.content[0].text
        try:
            return json.loads(text)
        except Exception:
            return {"ocr_notes": text[:500], "confidence_score": 50}

    except Exception as e:
        return {"error": str(e), "confidence_score": 0}


# ============================================================
# SECTION A: GROUP COMPANY
# ============================================================

@org_setup_bp.route("/group-company", methods=["GET"])
@require_auth
def get_group_company():
    """GET /api/v1/org-setup/group-company"""
    gc = db_session.query(GroupCompany).filter_by(
        tenant_id=g.tenant_id
    ).first()

    if not gc:
        return jsonify({
            "success": True,
            "exists":  False,
            "data":    None,
            "message": "Group company not set up yet. Please complete setup."
        })

    return jsonify({
        "success": True,
        "exists":  True,
        "data":    gc.to_dict()
    })


@org_setup_bp.route("/group-company", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_group_company():
    """POST /api/v1/org-setup/group-company"""
    # Only one per tenant
    existing = db_session.query(GroupCompany).filter_by(
        tenant_id=g.tenant_id
    ).first()
    if existing:
        return jsonify({
            "error": "Group company already exists for this tenant.",
            "existing_id": str(existing.id)
        }), 409

    data = request.get_json()

    gc = GroupCompany(
        tenant_id               = g.tenant_id,
        group_name              = data["group_name"],
        group_name_local        = data.get("group_name_local"),
        group_code              = data["group_code"],
        tagline                 = data.get("tagline"),
        description             = data.get("description"),
        incorporation_country   = data.get("incorporation_country", "NP"),
        incorporation_date      = data.get("incorporation_date"),
        company_type            = data.get("company_type"),
        ocr_registration_number = data.get("ocr_registration_number"),
        pan_number              = data.get("pan_number"),
        vat_number              = data.get("vat_number"),
        registered_address      = data.get("registered_address"),
        headquarters_address    = data.get("headquarters_address"),
        phone_primary           = data.get("phone_primary"),
        email_official          = data.get("email_official"),
        website_url             = data.get("website_url"),
        base_currency           = data.get("base_currency", "NPR"),
        fiscal_year_start_month = data.get("fiscal_year_start_month", 4),
        fiscal_year_type        = data.get("fiscal_year_type", "BS"),
        authorized_capital      = data.get("authorized_capital"),
        paid_up_capital         = data.get("paid_up_capital"),
        default_language        = data.get("default_language", "ne"),
        default_timezone        = data.get("default_timezone", "Asia/Kathmandu"),
        ssf_registration_number = data.get("ssf_registration_number"),
        epf_registration_number = data.get("epf_registration_number"),
        brand_color_primary     = data.get("brand_color_primary", "#2563eb"),
        created_by              = g.employee_id,
        setup_step              = 1,
    )

    db_session.add(gc)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Group company '{gc.group_name}' created successfully.",
        "data":    gc.to_dict()
    }), 201


@org_setup_bp.route("/group-company/<gc_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_group_company(gc_id):
    """PUT /api/v1/org-setup/group-company/{id}"""
    gc = db_session.query(GroupCompany).filter_by(
        id=gc_id, tenant_id=g.tenant_id
    ).first()
    if not gc:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    updatable = [
        "group_name", "group_name_local", "tagline", "description",
        "ocr_registration_number", "pan_number", "vat_number",
        "registered_address", "headquarters_address",
        "phone_primary", "email_official", "website_url",
        "ssf_registration_number", "epf_registration_number",
        "brand_color_primary", "brand_color_secondary",
        "logo_url", "fiscal_year_type", "default_language", "default_timezone",
        "authorized_capital", "paid_up_capital", "setup_step", "setup_completed"
    ]
    for field in updatable:
        if field in data:
            setattr(gc, field, data[field])

    gc.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({"success": True, "data": gc.to_dict()})


# ============================================================
# SECTION B: COMPANIES
# ============================================================

@org_setup_bp.route("/companies", methods=["GET"])
@require_auth
def list_companies():
    """GET /api/v1/org-setup/companies"""
    companies = db_session.query(Company).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).order_by(Company.is_primary.desc(), Company.company_name).all()

    return jsonify({
        "success": True,
        "count":   len(companies),
        "data":    [c.to_dict() for c in companies]
    })


@org_setup_bp.route("/companies/<company_id>", methods=["GET"])
@require_auth
def get_company(company_id):
    """GET /api/v1/org-setup/companies/{id}"""
    company = db_session.query(Company).filter_by(
        id=company_id, tenant_id=g.tenant_id
    ).first()
    if not company:
        return jsonify({"error": "Not found"}), 404

    return jsonify({
        "success": True,
        "data":    company.to_dict(include_docs=True)
    })


@org_setup_bp.route("/companies", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_company():
    """POST /api/v1/org-setup/companies"""
    data = request.get_json()

    gc = db_session.query(GroupCompany).filter_by(
        tenant_id=g.tenant_id
    ).first()
    if not gc:
        return jsonify({
            "error": "Please set up Group Company first before creating companies."
        }), 400

    company = Company(
        tenant_id               = g.tenant_id,
        group_company_id        = gc.id,
        company_name            = data["company_name"],
        company_name_local      = data.get("company_name_local"),
        company_name_short      = data.get("company_name_short"),
        company_code            = data["company_code"],
        description             = data.get("description"),
        industry                = data.get("industry"),
        sub_industry            = data.get("sub_industry"),
        company_size            = data.get("company_size"),
        legal_entity_type       = data.get("legal_entity_type"),
        parent_company_id       = data.get("parent_company_id"),
        ownership_type          = data.get("ownership_type"),
        ownership_pct           = data.get("ownership_pct"),
        ocr_registration_number = data.get("ocr_registration_number"),
        ocr_registration_date   = data.get("ocr_registration_date"),
        ocr_registration_office = data.get("ocr_registration_office"),
        pan_number              = data.get("pan_number"),
        vat_number              = data.get("vat_number"),
        ward_registration_number= data.get("ward_registration_number"),
        ward_office             = data.get("ward_office"),
        municipality            = data.get("municipality"),
        district                = data.get("district"),
        ssf_registration_number = data.get("ssf_registration_number"),
        ssf_registration_date   = data.get("ssf_registration_date"),
        epf_registration_number = data.get("epf_registration_number"),
        registered_address      = data.get("registered_address"),
        operational_address     = data.get("operational_address"),
        phone_primary           = data.get("phone_primary"),
        email_official          = data.get("email_official"),
        website_url             = data.get("website_url"),
        company_secretary_name  = data.get("company_secretary_name"),
        statutory_auditor_name  = data.get("statutory_auditor_name"),
        tax_consultant_name     = data.get("tax_consultant_name"),
        base_currency           = data.get("base_currency", "NPR"),
        authorized_capital      = data.get("authorized_capital"),
        paid_up_capital         = data.get("paid_up_capital"),
        is_primary              = data.get("is_primary", False),
        created_by              = g.employee_id,
    )

    db_session.add(company)
    db_session.commit()

    # Get missing documents list
    from sqlalchemy import text
    missing = db_session.execute(
        text("SELECT * FROM fn_get_missing_documents(:cid, :cc)"),
        {"cid": str(company.id), "cc": company.registered_address.get("country_code", "NP") if company.registered_address else "NP"}
    ).fetchall()

    return jsonify({
        "success":          True,
        "message":          f"Company '{company.company_name}' created.",
        "data":             company.to_dict(),
        "missing_documents": [dict(r._mapping) for r in missing],
        "next_step":        "Please upload all required legal documents."
    }), 201


@org_setup_bp.route("/companies/<company_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_company(company_id):
    """PUT /api/v1/org-setup/companies/{id}"""
    company = db_session.query(Company).filter_by(
        id=company_id, tenant_id=g.tenant_id
    ).first()
    if not company:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    updatable = [
        "company_name", "company_name_local", "company_name_short",
        "description", "industry", "sub_industry", "company_size",
        "legal_entity_type", "ocr_registration_number", "pan_number",
        "vat_number", "ssf_registration_number", "epf_registration_number",
        "ward_registration_number", "ward_office", "municipality",
        "registered_address", "operational_address", "phone_primary",
        "email_official", "website_url", "company_secretary_name",
        "statutory_auditor_name", "tax_consultant_name",
        "authorized_capital", "paid_up_capital", "logo_url",
        "total_employee_count", "foreign_worker_count",
        "is_active", "is_primary", "setup_completed"
    ]
    for field in updatable:
        if field in data:
            setattr(company, field, data[field])

    # Auto-update compliance flags
    if company.total_employee_count:
        company.requires_cba = company.total_employee_count >= 10
        company.requires_safety_committee = company.total_employee_count >= 20

    company.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({"success": True, "data": company.to_dict()})


# ============================================================
# SECTION C: BRANCHES & LOCATIONS
# ============================================================

@org_setup_bp.route("/branches", methods=["GET"])
@require_auth
def list_branches():
    """GET /api/v1/org-setup/branches?company_id=..."""
    company_id = request.args.get("company_id")

    q = db_session.query(BranchLocation).filter_by(
        tenant_id=g.tenant_id, is_active=True
    )
    if company_id:
        q = q.filter_by(company_id=company_id)

    branches = q.order_by(
        BranchLocation.is_headquarters.desc(),
        BranchLocation.branch_name
    ).all()

    return jsonify({
        "success": True,
        "count":   len(branches),
        "data":    [b.to_dict() for b in branches]
    })


@org_setup_bp.route("/branches", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_branch():
    """POST /api/v1/org-setup/branches"""
    data = request.get_json()

    branch = BranchLocation(
        tenant_id               = g.tenant_id,
        company_id              = data["company_id"],
        branch_name             = data["branch_name"],
        branch_name_local       = data.get("branch_name_local"),
        branch_code             = data["branch_code"],
        branch_type             = data.get("branch_type", "branch"),
        description             = data.get("description"),
        address_line1           = data.get("address_line1"),
        address_line2           = data.get("address_line2"),
        city                    = data.get("city"),
        district                = data.get("district"),
        province                = data.get("province"),
        postal_code             = data.get("postal_code"),
        country_code            = data.get("country_code", "NP"),
        country_name            = data.get("country_name", "Nepal"),
        latitude                = data.get("latitude"),
        longitude               = data.get("longitude"),
        google_maps_url         = data.get("google_maps_url"),
        pan_number              = data.get("pan_number"),
        ward_registration_number= data.get("ward_registration_number"),
        ward_office             = data.get("ward_office"),
        municipality_code       = data.get("municipality_code"),
        labour_office_zone      = data.get("labour_office_zone"),
        ssf_branch_code         = data.get("ssf_branch_code"),
        timezone                = data.get("timezone", "Asia/Kathmandu"),
        utc_offset              = data.get("utc_offset", "+05:45"),
        local_currency          = data.get("local_currency", "NPR"),
        working_days            = data.get("working_days", ["Sun","Mon","Tue","Wed","Thu"]),
        standard_work_hours     = data.get("standard_work_hours", 8.0),
        minimum_wage            = data.get("minimum_wage"),
        applicable_laws         = data.get("applicable_laws",
                                           {"nepal_labour_act": True}),
        phone_primary           = data.get("phone_primary"),
        email_branch            = data.get("email_branch"),
        branch_manager_name     = data.get("branch_manager_name"),
        max_employee_capacity   = data.get("max_employee_capacity"),
        supports_remote         = data.get("supports_remote", False),
        supports_hybrid         = data.get("supports_hybrid", False),
        has_canteen             = data.get("has_canteen", False),
        has_medical_room        = data.get("has_medical_room", False),
        is_headquarters         = data.get("is_headquarters", False),
        effective_from          = data.get("effective_from"),
        created_by              = g.employee_id,
    )

    db_session.add(branch)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Branch '{branch.branch_name}' created.",
        "data":    branch.to_dict()
    }), 201


@org_setup_bp.route("/branches/<branch_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_branch(branch_id):
    """PUT /api/v1/org-setup/branches/{id}"""
    branch = db_session.query(BranchLocation).filter_by(
        id=branch_id, tenant_id=g.tenant_id
    ).first()
    if not branch:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    updatable = [
        "branch_name", "branch_name_local", "description", "branch_type",
        "address_line1", "address_line2", "city", "district", "province",
        "pan_number", "ward_registration_number", "ssf_branch_code",
        "labour_office_zone", "branch_manager_name", "phone_primary",
        "email_branch", "supports_remote", "supports_hybrid",
        "has_canteen", "has_medical_room", "is_active", "is_registered"
    ]
    for field in updatable:
        if field in data:
            setattr(branch, field, data[field])

    branch.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({"success": True, "data": branch.to_dict()})


# ============================================================
# SECTION D: LEGAL DOCUMENTS
# ============================================================

@org_setup_bp.route("/documents/requirements", methods=["GET"])
@require_auth
def get_document_requirements():
    """
    GET /api/v1/org-setup/documents/requirements
    Returns the list of required documents for a given country + entity type.
    Query params: country_code, entity_type
    """
    from ..models.org_setup_models import Base  # for raw SQL
    from sqlalchemy import text

    country_code = request.args.get("country_code", "NP")
    entity_type  = request.args.get("entity_type", "company")

    result = db_session.execute(
        text("""
            SELECT document_type, display_name, description, issuing_authority,
                   is_mandatory, renewal_period_months, notes, display_order
            FROM document_requirements
            WHERE (country_code = :cc OR country_code = 'XX')
              AND entity_type = :et
            ORDER BY display_order
        """),
        {"cc": country_code, "et": entity_type}
    ).fetchall()

    requirements = [dict(r._mapping) for r in result]

    return jsonify({
        "success":      True,
        "country_code": country_code,
        "entity_type":  entity_type,
        "requirements": requirements,
        "total":        len(requirements),
        "mandatory":    sum(1 for r in requirements if r["is_mandatory"]),
    })


@org_setup_bp.route("/documents/upload", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def upload_document():
    """
    POST /api/v1/org-setup/documents/upload
    Handles legal document upload with AI extraction.
    Body (multipart/form-data):
      - file: the scanned document (PDF/JPG/PNG)
      - document_type: e.g. "ocr_certificate"
      - document_name: display name
      - entity_type: company | branch | group
      - entity_id: UUID of the entity
      - issue_date, expiry_date, document_number (optional)
    """
    # In production: handle file upload to S3/cloud storage
    # Here we handle the metadata + simulate AI extraction
    data = request.form.to_dict()

    if not data.get("document_type"):
        return jsonify({"error": "document_type is required"}), 400
    if not data.get("entity_id"):
        return jsonify({"error": "entity_id is required"}), 400

    entity_type = data.get("entity_type", "company")
    entity_id   = data.get("entity_id")

    # In production: upload file to S3 and get URL
    # file = request.files.get("file")
    # file_url = upload_to_s3(file, tenant_id=g.tenant_id)
    file_url = data.get("file_url", f"https://storage.nephrpro.com/docs/{g.tenant_id}/{uuid.uuid4()}.pdf")

    # AI extraction (if image file provided)
    ai_data = {}
    if request.files.get("file"):
        file = request.files["file"]
        if file.mimetype in ["image/jpeg", "image/png", "image/jpg"]:
            img_b64 = base64.b64encode(file.read()).decode("utf-8")
            ai_data = extract_document_data_ai(
                img_b64,
                data.get("document_type"),
                data.get("country_code", "NP")
            )

    # Create document record
    doc = LegalDocument(
        tenant_id           = g.tenant_id,
        document_type       = data["document_type"],
        document_name       = data.get("document_name", data["document_type"].replace("_", " ").title()),
        document_number     = data.get("document_number") or ai_data.get("document_number"),
        document_description= data.get("document_description"),
        file_url            = file_url,
        file_name           = data.get("file_name"),
        file_type           = data.get("file_type", "pdf"),
        issue_date          = data.get("issue_date") or ai_data.get("issue_date"),
        expiry_date         = data.get("expiry_date") or ai_data.get("expiry_date"),
        issued_by           = data.get("issued_by") or ai_data.get("issued_by"),
        status              = "uploaded",
        ai_extracted_data   = ai_data,
        ai_verified         = bool(ai_data and ai_data.get("confidence_score", 0) >= 85),
        is_mandatory        = data.get("is_mandatory", "true").lower() == "true",
        uploaded_by         = g.employee_id,
        uploaded_by_name    = data.get("uploaded_by_name"),
    )

    # Link to entity
    if entity_type == "company":
        doc.company_id = entity_id
    elif entity_type == "branch":
        doc.branch_id  = entity_id
    elif entity_type == "group":
        doc.group_company_id = entity_id

    db_session.add(doc)
    db_session.commit()

    return jsonify({
        "success":         True,
        "message":         f"Document '{doc.document_name}' uploaded successfully.",
        "data":            doc.to_dict(),
        "ai_extracted":    bool(ai_data),
        "ai_confidence":   ai_data.get("confidence_score", 0) if ai_data else 0,
        "auto_filled":     bool(ai_data and ai_data.get("document_number")),
    }), 201


@org_setup_bp.route("/documents", methods=["GET"])
@require_auth
def list_documents():
    """GET /api/v1/org-setup/documents?entity_type=company&entity_id=..."""
    entity_type = request.args.get("entity_type", "company")
    entity_id   = request.args.get("entity_id")

    q = db_session.query(LegalDocument).filter_by(
        tenant_id=g.tenant_id, is_active=True
    )
    if entity_type == "company" and entity_id:
        q = q.filter_by(company_id=entity_id)
    elif entity_type == "branch" and entity_id:
        q = q.filter_by(branch_id=entity_id)
    elif entity_type == "group" and entity_id:
        q = q.filter_by(group_company_id=entity_id)

    docs = q.order_by(LegalDocument.created_at.desc()).all()

    return jsonify({
        "success":         True,
        "count":           len(docs),
        "data":            [d.to_dict() for d in docs],
        "summary": {
            "verified":      sum(1 for d in docs if d.status == "verified"),
            "uploaded":      sum(1 for d in docs if d.status == "uploaded"),
            "expired":       sum(1 for d in docs if d.is_expired),
            "expiring_soon": sum(1 for d in docs if d.is_expiring_soon),
        }
    })


@org_setup_bp.route("/documents/<doc_id>/verify", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def verify_document(doc_id):
    """POST /api/v1/org-setup/documents/{id}/verify"""
    doc = db_session.query(LegalDocument).filter_by(
        id=doc_id, tenant_id=g.tenant_id
    ).first()
    if not doc:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    action = data.get("action", "verify")  # verify | reject

    if action == "verify":
        doc.status          = "verified"
        doc.verified_by     = g.employee_id
        doc.verified_by_name= data.get("verified_by_name", "HR Admin")
        doc.verified_at     = datetime.now(timezone.utc)
        doc.rejection_reason= None
    elif action == "reject":
        doc.status           = "rejected"
        doc.rejection_reason = data.get("rejection_reason", "Document not acceptable")

    doc.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Document {action}d successfully.",
        "data":    doc.to_dict()
    })


@org_setup_bp.route("/documents/<doc_id>/ai-extract", methods=["POST"])
@require_auth
def ai_extract_document(doc_id):
    """
    POST /api/v1/org-setup/documents/{id}/ai-extract
    Re-runs AI extraction on an already-uploaded document.
    Body: { image_base64: "...", country_code: "NP" }
    """
    doc = db_session.query(LegalDocument).filter_by(
        id=doc_id, tenant_id=g.tenant_id
    ).first()
    if not doc:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    image_b64    = data.get("image_base64")
    country_code = data.get("country_code", "NP")

    if not image_b64:
        return jsonify({"error": "image_base64 is required"}), 400

    ai_data = extract_document_data_ai(image_b64, doc.document_type, country_code)

    # Auto-fill missing fields
    if ai_data.get("document_number") and not doc.document_number:
        doc.document_number = ai_data["document_number"]
    if ai_data.get("issue_date") and not doc.issue_date:
        try:
            from datetime import date
            doc.issue_date = date.fromisoformat(ai_data["issue_date"])
        except Exception:
            pass
    if ai_data.get("expiry_date") and not doc.expiry_date:
        try:
            from datetime import date
            doc.expiry_date = date.fromisoformat(ai_data["expiry_date"])
        except Exception:
            pass
    if ai_data.get("issued_by") and not doc.issued_by:
        doc.issued_by = ai_data["issued_by"]

    doc.ai_extracted_data = ai_data
    doc.ai_verified = ai_data.get("confidence_score", 0) >= 85
    doc.updated_at  = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({
        "success":          True,
        "ai_extracted":     ai_data,
        "confidence_score": ai_data.get("confidence_score", 0),
        "auto_filled":      bool(ai_data.get("document_number")),
        "document":         doc.to_dict()
    })


# ============================================================
# SECTION E: ORG SETUP PROGRESS
# ============================================================

@org_setup_bp.route("/setup-progress", methods=["GET"])
@require_auth
def setup_progress():
    """
    GET /api/v1/org-setup/setup-progress
    Returns overall org setup completion status.
    Used for the setup wizard/onboarding progress.
    """
    gc = db_session.query(GroupCompany).filter_by(
        tenant_id=g.tenant_id
    ).first()

    companies = db_session.query(Company).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).all()

    branches = db_session.query(BranchLocation).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).all()

    docs = db_session.query(LegalDocument).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).all()

    steps = [
        {
            "step":      1,
            "title":     "Group Company Setup",
            "completed": gc is not None,
            "required":  True,
            "icon":      "🏛️",
        },
        {
            "step":      2,
            "title":     "Company Profile",
            "completed": len(companies) > 0,
            "required":  True,
            "icon":      "🏢",
            "count":     len(companies),
        },
        {
            "step":      3,
            "title":     "Branch & Location Setup",
            "completed": len(branches) > 0,
            "required":  True,
            "icon":      "📍",
            "count":     len(branches),
        },
        {
            "step":      4,
            "title":     "Legal Documents Upload",
            "completed": any(d.status in ("uploaded","verified") for d in docs),
            "required":  True,
            "icon":      "📄",
            "count":     len(docs),
            "verified":  sum(1 for d in docs if d.status == "verified"),
        },
        {
            "step":      5,
            "title":     "Document Verification",
            "completed": all(d.status == "verified" for d in docs if d.is_mandatory),
            "required":  False,
            "icon":      "✅",
        },
    ]

    completed_count = sum(1 for s in steps if s["completed"])
    total           = len(steps)
    pct             = round(completed_count * 100 / total, 1)

    return jsonify({
        "success":         True,
        "completion_pct":  pct,
        "completed_steps": completed_count,
        "total_steps":     total,
        "is_ready":        pct >= 80,
        "steps":           steps,
        "alerts": {
            "expiring_docs": sum(1 for d in docs if d.is_expiring_soon),
            "expired_docs":  sum(1 for d in docs if d.is_expired),
            "missing_docs":  "Check documents/requirements endpoint",
        }
    })
