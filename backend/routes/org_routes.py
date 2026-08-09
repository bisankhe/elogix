"""
FILE: backend/routes/org_routes.py
NepHR Pro — Organization Management REST API
Covers: Group Company, Company Profile/Setup, Branches,
        Departments, Designations, Grade Levels,
        Positions, Org Chart, Teams, Employment Categories
URL prefix: /api/v1/org
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, text, or_
from datetime import datetime, date
import uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import paginate, success, error, created, not_found, apply_search, apply_filters

org_bp = Blueprint("org", __name__, url_prefix="/api/v1/org")

# ── lazy model loader (avoids circular imports) ───────────────
def _m(name):
    from ..models.org_models import (
        GroupCompany, Company, CompanyLegalDocument,
        Branch, BusinessUnit, Department, Section, Unit,
        Team, CostCenter, WorkLocation,
    )
    from ..models.structure_models import (
        EmploymentCategory, JobFamily, GradeLevel,
        Designation, ReportingRelationship, OrgChartNode, Position,
    )
    return {
        "GroupCompany": GroupCompany, "Company": Company,
        "CompanyLegalDocument": CompanyLegalDocument,
        "Branch": Branch, "BusinessUnit": BusinessUnit,
        "Department": Department, "Section": Section,
        "Unit": Unit, "Team": Team,
        "CostCenter": CostCenter, "WorkLocation": WorkLocation,
        "EmploymentCategory": EmploymentCategory,
        "JobFamily": JobFamily, "GradeLevel": GradeLevel,
        "Designation": Designation,
        "ReportingRelationship": ReportingRelationship,
        "OrgChartNode": OrgChartNode, "Position": Position,
    }[name]


# ════════════════════════════════════════════════════════════════
# GROUP COMPANY
# ════════════════════════════════════════════════════════════════

@org_bp.get("/group-companies")
@require_auth
def list_group_companies():
    GC = _m("GroupCompany")
    q  = db.session.query(GC).filter_by(is_deleted=False)
    q  = apply_search(q, GC, ["name", "name_nepali"])
    if request.args.get("status"):
        q = q.filter(GC.status == request.args["status"])
    items, meta = paginate(q)
    result = []
    for gc in items:
        d = gc.to_dict()
        d["companies_count"] = db.session.query(func.count(_m("Company").id)).filter_by(
            group_id=str(gc.id), is_deleted=False).scalar()
        result.append(d)
    return success(result, meta=meta)


@org_bp.post("/group-companies")
@require_auth
@require_role("super_admin", "hr_manager")
def create_group_company():
    GC   = _m("GroupCompany")
    body = request.get_json() or {}
    if not body.get("name"):
        return error("name is required", 422)
    gc = GC(
        name                 = body["name"].strip(),
        name_nepali          = body.get("name_nepali"),
        short_name           = body.get("short_name"),
        registration_no      = body.get("registration_no"),
        pan_no               = body.get("pan_no"),
        vat_no               = body.get("vat_no"),
        established_year     = body.get("established_year"),
        headquarters_country = body.get("headquarters_country", "Nepal"),
        headquarters_address = body.get("headquarters_address"),
        group_type           = body.get("group_type"),
        industry_sectors     = body.get("industry_sectors", []),
        website              = body.get("website"),
        sap_group_code       = body.get("sap_group_code"),
        status               = "active",
        created_by           = g.user_id,
    )
    db.session.add(gc)
    db.session.commit()
    return created(gc.to_dict())


@org_bp.get("/group-companies/<gc_id>")
@require_auth
def get_group_company(gc_id):
    GC = _m("GroupCompany")
    gc = db.session.query(GC).filter_by(id=gc_id, is_deleted=False).first()
    if not gc: return not_found("Group Company")
    d = gc.to_dict()
    d["companies"] = [c.to_dict() for c in db.session.query(_m("Company")).filter_by(
        group_id=gc_id, is_deleted=False).all()]
    return success(d)


@org_bp.put("/group-companies/<gc_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_group_company(gc_id):
    GC = _m("GroupCompany")
    gc = db.session.query(GC).filter_by(id=gc_id, is_deleted=False).first()
    if not gc: return not_found("Group Company")
    body = request.get_json() or {}
    for k in ["name","name_nepali","short_name","registration_no","pan_no","website",
               "group_type","industry_sectors","headquarters_address","status","sap_group_code"]:
        if k in body: setattr(gc, k, body[k])
    gc.updated_at = datetime.utcnow()
    db.session.commit()
    return success(gc.to_dict())


@org_bp.delete("/group-companies/<gc_id>")
@require_auth
@require_role("super_admin")
def delete_group_company(gc_id):
    GC = _m("GroupCompany")
    gc = db.session.query(GC).filter_by(id=gc_id, is_deleted=False).first()
    if not gc: return not_found("Group Company")
    count = db.session.query(func.count(_m("Company").id)).filter_by(group_id=gc_id, is_deleted=False).scalar()
    if count:
        return error(f"Cannot delete: {count} active company/ies linked.", 409)
    gc.is_deleted = True; gc.deleted_at = datetime.utcnow()
    db.session.commit()
    return success({"deleted": True})


# ════════════════════════════════════════════════════════════════
# COMPANY (PROFILE + SETUP)
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies")
@require_auth
def list_companies():
    C = _m("Company")
    q = db.session.query(C).filter_by(is_deleted=False)
    if request.args.get("group_id"): q = q.filter(C.group_id == request.args["group_id"])
    if request.args.get("status"):   q = q.filter(C.status   == request.args["status"])
    q = apply_search(q, C, ["name", "name_nepali", "pan_no"])
    items, meta = paginate(q)
    return success([c.to_dict() for c in items], meta=meta)


@org_bp.post("/companies")
@require_auth
@require_role("super_admin", "hr_manager")
def create_company():
    C    = _m("Company")
    body = request.get_json() or {}
    if not body.get("name"):
        return error("name is required", 422)
    c = C(
        group_id                   = body.get("group_id"),
        name                       = body["name"].strip(),
        name_nepali                = body.get("name_nepali"),
        short_name                 = body.get("short_name"),
        registration_type          = body.get("registration_type", "private_limited"),
        registration_no            = body.get("registration_no"),
        pan_no                     = body.get("pan_no"),
        vat_registered             = body.get("vat_registered", False),
        vat_no                     = body.get("vat_no"),
        industry                   = body.get("industry"),
        established_year           = body.get("established_year"),
        fiscal_year_type           = body.get("fiscal_year_type", "BS"),
        province                   = body.get("province"),
        district                   = body.get("district"),
        municipality               = body.get("municipality"),
        street                     = body.get("street"),
        phone                      = body.get("phone"),
        email                      = body.get("email"),
        website                    = body.get("website"),
        labour_office_zone         = body.get("labour_office_zone"),
        ssf_employer_no            = body.get("ssf_employer_no"),
        pf_employer_no             = body.get("pf_employer_no"),
        min_wage_applicable        = max(float(body.get("min_wage_applicable", 15000)), 15000),
        collective_bargaining_active = body.get("collective_bargaining_active", False),
        sap_company_code           = body.get("sap_company_code"),
        status                     = "active",
        setup_step                 = 1,
        created_by                 = g.user_id,
    )
    db.session.add(c)
    db.session.flush()
    # Seed employment categories per Nepal Labour Act 2074
    try:
        db.session.execute(text("SELECT fn_seed_company_emp_categories(:cid)"),
                           {"cid": str(c.id)})
    except Exception:
        pass   # function may not exist in dev; ignore
    db.session.commit()
    return created(c.to_dict(), "Company created. Labour Act 2074 employment categories seeded.")


@org_bp.get("/companies/<company_id>")
@require_auth
def get_company(company_id):
    C  = _m("Company")
    co = db.session.query(C).filter_by(id=company_id, is_deleted=False).first()
    if not co: return not_found("Company")
    d = co.to_dict()
    d["branches_count"]    = db.session.query(func.count(_m("Branch").id)).filter_by(
        company_id=company_id, is_deleted=False).scalar()
    d["departments_count"] = db.session.query(func.count(_m("Department").id)).filter_by(
        company_id=company_id, is_deleted=False).scalar()
    return success(d)


@org_bp.put("/companies/<company_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_company(company_id):
    C  = _m("Company")
    co = db.session.query(C).filter_by(id=company_id, is_deleted=False).first()
    if not co: return not_found("Company")
    body = request.get_json() or {}
    editable = [
        "name","name_nepali","short_name","tagline","registration_type","registration_no",
        "registration_date","pan_no","vat_registered","vat_no","industry","sub_industry",
        "established_year","fiscal_year_type","employee_count_band","website","logo_url",
        "company_color","province","district","municipality","ward_no","street","postal_code",
        "phone","fax","email","hr_contact_email","labour_office_zone","ssf_employer_no",
        "pf_employer_no","cit_registration","moles_registered","factory_act_applicable",
        "trade_union_registered","collective_bargaining_active","min_wage_applicable",
        "setup_step","setup_completed","sap_company_code","oracle_org_id","status",
    ]
    for k in editable:
        if k in body:
            val = body[k]
            if k == "min_wage_applicable":
                val = max(float(val), 15000)
            setattr(co, k, val)
    co.updated_at = datetime.utcnow()
    db.session.commit()
    return success(co.to_dict())


@org_bp.get("/companies/<company_id>/setup-wizard")
@require_auth
def setup_wizard(company_id):
    """Setup wizard progress — drives CompanySetupPage 5-step wizard."""
    C  = _m("Company")
    co = db.session.query(C).filter_by(id=company_id, is_deleted=False).first()
    if not co: return not_found("Company")
    steps = {
        "company_profile":       bool(co.name and co.pan_no),
        "branch_setup":          db.session.query(_m("Branch")).filter_by(company_id=company_id, is_deleted=False).count() > 0,
        "department_setup":      db.session.query(_m("Department")).filter_by(company_id=company_id, is_deleted=False).count() > 0,
        "grade_levels":          db.session.query(_m("GradeLevel")).filter_by(company_id=company_id, is_deleted=False).count() > 0,
        "employment_categories": db.session.query(_m("EmploymentCategory")).filter(
            or_(_m("EmploymentCategory").company_id == company_id,
                _m("EmploymentCategory").company_id == None),
            _m("EmploymentCategory").is_deleted == False,
        ).count() > 0,
    }
    progress = round(sum(steps.values()) / len(steps) * 100, 0)
    co.setup_step       = sum(steps.values()) + 1
    co.setup_completed  = (progress == 100)
    db.session.commit()
    return success({"steps": steps, "progress_pct": int(progress),
                    "setup_completed": co.setup_completed, "current_step": co.setup_step})


@org_bp.get("/companies/<company_id>/ai-compliance")
@require_auth
def ai_compliance_check(company_id):
    """AI compliance health check for CompanyProfilePage compliance rings."""
    C  = _m("Company")
    co = db.session.query(C).filter_by(id=company_id, is_deleted=False).first()
    if not co: return not_found("Company")
    issues, score = [], 100.0
    def flag(sev, msg, deduct):
        issues.append({"severity": sev, "message": msg})
        return deduct
    if not co.pan_no:              score -= flag("high",   "PAN certificate missing",           15)
    if not co.ssf_employer_no:     score -= flag("high",   "SSF employer registration missing", 15)
    if not co.labour_office_zone:  score -= flag("medium", "Labour office zone not set",         8)
    if not co.pf_employer_no:      score -= flag("medium", "PF employer number missing",         8)
    if co.min_wage_applicable < 15000:
        score -= flag("critical", "Min wage below NPR 15,000 — Labour Act 2074 violation", 25)

    # Expiring docs
    D = _m("CompanyLegalDocument")
    expiring = db.session.execute(text("""
        SELECT doc_type, expiry_date FROM company_legal_documents
        WHERE company_id = :cid AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
          AND NOT is_deleted
    """), {"cid": company_id}).fetchall()
    for doc in expiring:
        score -= flag("medium", f"{doc.doc_type} expires {doc.expiry_date}", 5)

    co.ai_risk_score = max(score, 0)
    db.session.commit()
    return success({
        "company_id": company_id, "compliance_score": max(score, 0),
        "issues": issues, "issues_count": len(issues),
        "last_checked": datetime.utcnow().isoformat(),
    })


# ════════════════════════════════════════════════════════════════
# COMPANY LEGAL DOCUMENTS
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/documents")
@require_auth
def list_documents(company_id):
    D = _m("CompanyLegalDocument")
    docs = db.session.query(D).filter_by(company_id=company_id, is_deleted=False).all()
    return success([d.to_dict() for d in docs])


@org_bp.post("/companies/<company_id>/documents")
@require_auth
@require_role("super_admin", "hr_manager")
def add_document(company_id):
    D    = _m("CompanyLegalDocument")
    body = request.get_json() or {}
    if not body.get("doc_type") or not body.get("doc_name"):
        return error("doc_type and doc_name required", 422)
    doc = D(
        company_id        = company_id,
        doc_type          = body["doc_type"],
        doc_name          = body["doc_name"],
        doc_number        = body.get("doc_number"),
        issue_date        = date.fromisoformat(body["issue_date"])  if body.get("issue_date")  else None,
        expiry_date       = date.fromisoformat(body["expiry_date"]) if body.get("expiry_date") else None,
        issuing_authority = body.get("issuing_authority"),
        file_url          = body.get("file_url"),
        is_mandatory      = body.get("is_mandatory", True),
        renewal_alert_days= body.get("renewal_alert_days", 90),
        status            = "valid",
        notes             = body.get("notes"),
    )
    db.session.add(doc)
    db.session.commit()
    return created(doc.to_dict())


@org_bp.put("/companies/<company_id>/documents/<doc_id>")
@require_auth
def update_document(company_id, doc_id):
    D   = _m("CompanyLegalDocument")
    doc = db.session.query(D).filter_by(id=doc_id, company_id=company_id, is_deleted=False).first()
    if not doc: return not_found("Document")
    body = request.get_json() or {}
    for k in ["doc_name","doc_number","issue_date","expiry_date","issuing_authority",
               "file_url","status","notes","renewal_alert_days"]:
        if k in body:
            val = body[k]
            if k in ("issue_date","expiry_date") and val:
                val = date.fromisoformat(val)
            setattr(doc, k, val)
    db.session.commit()
    return success(doc.to_dict())


# ════════════════════════════════════════════════════════════════
# BRANCHES
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/branches")
@require_auth
def list_branches(company_id):
    B = _m("Branch")
    q = db.session.query(B).filter_by(company_id=company_id, is_deleted=False)
    q = apply_search(q, B, ["name", "name_nepali", "code"])
    q = apply_filters(q, B, ["branch_type", "status", "province"])
    items, meta = paginate(q)
    return success([b.to_dict() for b in items], meta=meta)


@org_bp.post("/companies/<company_id>/branches")
@require_auth
@require_role("super_admin", "hr_manager")
def create_branch(company_id):
    B    = _m("Branch")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name"):
        return error("code and name required", 422)
    exists = db.session.query(B).filter_by(company_id=company_id, code=body["code"], is_deleted=False).first()
    if exists: return error(f"Branch code '{body['code']}' already exists", 409)
    b = B(
        company_id           = company_id,
        code                 = body["code"].upper(),
        name                 = body["name"],
        name_nepali          = body.get("name_nepali"),
        branch_type          = body.get("branch_type", "branch"),
        is_headquarters      = body.get("is_headquarters", False),
        province             = body.get("province"),
        district             = body.get("district"),
        municipality         = body.get("municipality"),
        ward_no              = body.get("ward_no"),
        street_address       = body.get("street_address"),
        phone                = body.get("phone"),
        email                = body.get("email"),
        labour_office_zone   = body.get("labour_office_zone"),
        local_registration_no= body.get("local_registration_no"),
        capacity             = body.get("capacity", 0),
        latitude             = body.get("latitude"),
        longitude            = body.get("longitude"),
        status               = "active",
        created_by           = g.user_id,
    )
    db.session.add(b)
    db.session.commit()
    return created(b.to_dict())


@org_bp.put("/companies/<company_id>/branches/<branch_id>")
@require_auth
def update_branch(company_id, branch_id):
    B = _m("Branch")
    b = db.session.query(B).filter_by(id=branch_id, company_id=company_id, is_deleted=False).first()
    if not b: return not_found("Branch")
    body = request.get_json() or {}
    for k in ["name","name_nepali","branch_type","province","district","municipality",
               "ward_no","street_address","phone","email","labour_office_zone",
               "employee_count","capacity","status","is_headquarters"]:
        if k in body: setattr(b, k, body[k])
    db.session.commit()
    return success(b.to_dict())


@org_bp.delete("/companies/<company_id>/branches/<branch_id>")
@require_auth
@require_role("super_admin")
def delete_branch(company_id, branch_id):
    B = _m("Branch")
    b = db.session.query(B).filter_by(id=branch_id, company_id=company_id, is_deleted=False).first()
    if not b: return not_found("Branch")
    b.is_deleted = True; b.deleted_at = datetime.utcnow()
    db.session.commit()
    return success({"deleted": True})


# ════════════════════════════════════════════════════════════════
# DEPARTMENTS
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/departments")
@require_auth
def list_departments(company_id):
    D = _m("Department")
    q = db.session.query(D).filter_by(company_id=company_id, is_deleted=False)
    q = apply_search(q, D, ["name", "name_nepali", "code"])
    q = apply_filters(q, D, ["status", "function_type", "ulrich_model", "business_unit_id"])
    items, meta = paginate(q)
    return success([d.to_dict() for d in items], meta=meta)


@org_bp.post("/companies/<company_id>/departments")
@require_auth
@require_role("super_admin", "hr_manager")
def create_department(company_id):
    D    = _m("Department")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name"):
        return error("code and name required", 422)
    d = D(
        company_id       = company_id,
        business_unit_id = body.get("business_unit_id"),
        branch_id        = body.get("branch_id"),
        code             = body["code"].upper(),
        name             = body["name"],
        name_nepali      = body.get("name_nepali"),
        description      = body.get("description"),
        function_type    = body.get("function_type"),
        ulrich_model     = body.get("ulrich_model"),
        headcount_target = body.get("headcount_target"),
        annual_budget    = body.get("annual_budget"),
        is_core_function = body.get("is_core_function", True),
        status           = "active",
        created_by       = g.user_id,
    )
    db.session.add(d)
    db.session.commit()
    return created(d.to_dict())


# ════════════════════════════════════════════════════════════════
# GRADE LEVELS
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/grade-levels")
@require_auth
def list_grade_levels(company_id):
    GL = _m("GradeLevel")
    grades = db.session.query(GL).filter_by(
        company_id=company_id, is_deleted=False
    ).order_by(GL.level_order).all()
    return success([g.to_dict() for g in grades])


@org_bp.post("/companies/<company_id>/grade-levels")
@require_auth
@require_role("super_admin", "hr_manager")
def create_grade_level(company_id):
    GL   = _m("GradeLevel")
    body = request.get_json() or {}
    if not all(body.get(k) for k in ["code", "name", "salary_min", "salary_max"]):
        return error("code, name, salary_min, salary_max required", 422)
    if float(body["salary_min"]) < 15000:
        return error("salary_min must be >= NPR 15,000 (Nepal minimum wage)", 422)
    gl = GL(
        company_id       = company_id,
        code             = body["code"].upper(),
        name             = body["name"],
        name_nepali      = body.get("name_nepali"),
        grade_number     = body.get("grade_number"),
        level_order      = body.get("level_order", 99),
        category         = body.get("category"),
        salary_min       = body["salary_min"],
        salary_mid       = body.get("salary_mid"),
        salary_max       = body["salary_max"],
        is_active        = True,
        created_by       = g.user_id,
    )
    db.session.add(gl)
    db.session.commit()
    return created(gl.to_dict())


# ════════════════════════════════════════════════════════════════
# DESIGNATIONS + AI JD
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/designations")
@require_auth
def list_designations(company_id):
    D = _m("Designation")
    q = db.session.query(D).filter_by(company_id=company_id, is_deleted=False)
    q = apply_search(q, D, ["name", "name_nepali", "code"])
    q = apply_filters(q, D, ["is_active", "job_family_id", "grade_level_id", "is_managerial"])
    items, meta = paginate(q)
    return success([d.to_dict() for d in items], meta=meta)


@org_bp.post("/companies/<company_id>/designations/<desig_id>/generate-jd")
@require_auth
def generate_ai_jd(company_id, desig_id):
    """AI Job Description generator — Claude API."""
    from ..ai.insights import generate_jd
    D  = _m("Designation")
    GL = _m("GradeLevel")
    JF = _m("JobFamily")
    d  = db.session.query(D).filter_by(id=desig_id, company_id=company_id, is_deleted=False).first()
    if not d: return not_found("Designation")
    grade  = db.session.get(GL, d.grade_level_id) if d.grade_level_id else None
    family = db.session.get(JF, d.job_family_id)  if d.job_family_id  else None
    jd = generate_jd({
        "title": d.name, "title_nepali": d.name_nepali, "job_code": d.code,
        "job_family": family.name if family else "General",
        "grade": f"{grade.code} – {grade.name}" if grade else "Not specified",
        "salary_range": f"NPR {grade.salary_min:,.0f} – {grade.salary_max:,.0f}" if grade else None,
        "experience_years": d.jd_experience_years or 0,
        "education": d.jd_education_level or "",
        "skills": d.jd_skills or [],
        "is_managerial": d.is_managerial,
        "country": "Nepal",
        "nepal_la_note": ("Managerial — excluded from CBA per Labour Act 2074 Section 7"
                          if d.is_managerial else "General — CBA eligible"),
    })
    d.jd_summary          = jd.get("summary", "")
    d.jd_full_text        = jd.get("full_text", "")
    d.jd_responsibilities = jd.get("responsibilities", [])
    d.jd_qualifications   = jd.get("qualifications", [])
    d.jd_skills           = jd.get("skills", d.jd_skills or [])
    d.ai_jd_generated     = True
    d.ai_jd_generated_at  = datetime.utcnow()
    d.ai_jd_content       = jd
    db.session.commit()
    return success({"designation_id": desig_id, "jd": jd})


# ════════════════════════════════════════════════════════════════
# POSITIONS + AI ATTRITION RISK
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/positions")
@require_auth
def list_positions(company_id):
    P = _m("Position")
    q = db.session.query(P).filter_by(company_id=company_id, is_deleted=False)
    q = apply_filters(q, P, ["status", "department_id", "designation_id",
                               "grade_level_id", "is_critical", "headcount_type"])
    items, meta = paginate(q)
    return success([p.to_dict() for p in items], meta=meta)


@org_bp.post("/companies/<company_id>/positions/<position_id>/ai-attrition-risk")
@require_auth
def ai_attrition_risk(company_id, position_id):
    from ..ai.insights import analyze_attrition_risk
    P = _m("Position")
    p = db.session.query(P).filter_by(id=position_id, company_id=company_id).first()
    if not p: return not_found("Position")
    risk = analyze_attrition_risk({
        "position_code": p.position_code, "title": p.position_title,
        "incumbent_name": p.incumbent_name, "status": p.status,
        "is_critical": p.is_critical, "succession_ready": p.succession_ready,
        "fte": float(p.fte or 1), "headcount_type": p.headcount_type,
    })
    p.ai_vacancy_risk     = risk.get("level", "low")
    p.ai_time_to_fill_est = risk.get("time_to_fill_days")
    p.ai_insights         = risk
    db.session.commit()
    return success({"position_id": position_id, "risk": risk})


# ════════════════════════════════════════════════════════════════
# ORG CHART
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/org-chart")
@require_auth
def get_org_chart(company_id):
    ON = _m("OrgChartNode")
    nodes = db.session.query(ON).filter_by(
        company_id=company_id, is_visible=True, is_deleted=False
    ).order_by(ON.depth, ON.sort_order).all()
    return success([n.to_dict() for n in nodes])


# ════════════════════════════════════════════════════════════════
# TEAMS — Nepal Labour Act 2074 auto-flags
# ════════════════════════════════════════════════════════════════

@org_bp.post("/companies/<company_id>/teams")
@require_auth
@require_role("super_admin", "hr_manager")
def create_team(company_id):
    from ..utils.nepal_law import check_cba_required
    T    = _m("Team")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name") or not body.get("department_id"):
        return error("code, name, department_id required", 422)
    mc = int(body.get("member_count", 0))
    is_mgr = bool(body.get("is_managerial", False))
    t = T(
        company_id    = company_id,
        department_id = body["department_id"],
        section_id    = body.get("section_id"),
        code          = body["code"].upper(),
        name          = body["name"],
        name_nepali   = body.get("name_nepali"),
        team_type     = body.get("team_type", "functional"),
        member_count  = mc,
        max_size      = body.get("max_size"),
        is_managerial = is_mgr,
        purpose       = body.get("purpose"),
        status        = "active",
        created_by    = g.user_id,
    )
    db.session.add(t)
    db.session.commit()
    nepal = check_cba_required(mc, is_mgr)
    return created({**t.to_dict(), "nepal_compliance": nepal})


# ════════════════════════════════════════════════════════════════
# EMPLOYMENT CATEGORIES
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/employment-categories")
@require_auth
def list_employment_categories(company_id):
    EC = _m("EmploymentCategory")
    cats = db.session.query(EC).filter(
        or_(EC.company_id == company_id, EC.company_id == None),
        EC.is_deleted == False, EC.is_active == True
    ).order_by(EC.sort_order).all()
    return success([c.to_dict() for c in cats])


# ════════════════════════════════════════════════════════════════
# AI WORKFORCE SUMMARY
# ════════════════════════════════════════════════════════════════

@org_bp.get("/companies/<company_id>/ai-insights/workforce-summary")
@require_auth
def ai_workforce_summary(company_id):
    from ..ai.insights import generate_ai_insights
    P = _m("Position")
    total    = db.session.query(func.count(P.id)).filter_by(company_id=company_id, is_deleted=False).scalar() or 0
    filled   = db.session.query(func.count(P.id)).filter_by(company_id=company_id, status="filled", is_deleted=False).scalar() or 0
    vacant   = db.session.query(func.count(P.id)).filter_by(company_id=company_id, status="vacant", is_deleted=False).scalar() or 0
    critical = db.session.query(func.count(P.id)).filter_by(company_id=company_id, is_critical=True,
               succession_ready=False, is_deleted=False).scalar() or 0
    insights = generate_ai_insights({
        "type": "workforce_summary", "company_id": company_id,
        "total_positions": total, "filled": filled, "vacant": vacant,
        "critical_no_succession": critical,
        "fill_rate_pct": round(filled/total*100, 1) if total else 0,
    })
    return success({
        "total_positions": total, "filled": filled, "vacant": vacant,
        "fill_rate_pct": round(filled/total*100, 1) if total else 0,
        "critical_no_succession": critical,
        "ai_insights": insights,
        "generated_at": datetime.utcnow().isoformat(),
    })
