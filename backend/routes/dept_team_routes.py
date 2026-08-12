"""
FILE: backend/routes/dept_team_routes.py
REST API — Department, Section, Unit, Team, Cost Center, Work Location
URL prefix: /api/v1/dept
Nepal Labour Act 2074 auto-compliance checks included.
"""
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, text
from datetime import datetime, date
import uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..middleware.tenant import apply_tenant_scope
from ..utils.pagination import paginate, success, error, created, not_found, apply_search, apply_sort, apply_filters
from ..utils.nepal_law import check_cba_required, check_minimum_wage
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from flask import send_file
import io

dept_bp = Blueprint("dept_team", __name__, url_prefix="/api/v1/dept")

# ── helper ────────────────────────────────────────────────────
def get_model(name):
    from ..models.org_models import (
        Department, Section, Unit, Team, CostCenter, WorkLocation
    )
    return {"department": Department, "section": Section, "unit": Unit,
            "team": Team, "cost_center": CostCenter, "work_location": WorkLocation}[name]


# ============================================================
# DEPARTMENTS
# ============================================================
@dept_bp.get("/departments")
@require_auth
def list_departments():
    Dept = get_model("department")
    q = apply_tenant_scope(db.session.query(Dept), Dept)
    q = apply_search(q, Dept, ["name", "name_nepali", "code"])
    q = apply_filters(q, Dept, ["status", "function_type", "ulrich_model",
                                 "business_unit_id", "branch_id"])
    q = apply_sort(q, Dept, ["name", "code", "headcount_actual", "created_at"])
    items, meta = paginate(q)
    return success([d.to_dict() for d in items], meta=meta)


@dept_bp.post("/departments")
@require_auth
@require_role("super_admin", "hr_manager")
def create_department():
    Dept = get_model("department")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name"):
        return error("code and name are required", 422)

    # Duplicate check
    exists = db.session.query(Dept).filter_by(
        company_id=g.company_id, code=body["code"], is_deleted=False
    ).first()
    if exists:
        return error(f"Department code '{body['code']}' already exists", 409)

    d = Dept(
        company_id       = g.company_id,
        business_unit_id = body.get("business_unit_id"),
        branch_id        = body.get("branch_id"),
        cost_center_id   = body.get("cost_center_id"),
        parent_dept_id   = body.get("parent_dept_id"),
        code             = body["code"].upper().strip(),
        name             = body["name"].strip(),
        name_nepali      = body.get("name_nepali"),
        description      = body.get("description"),
        function_type    = body.get("function_type"),
        ulrich_model     = body.get("ulrich_model"),
        headcount_target = body.get("headcount_target"),
        annual_budget    = body.get("annual_budget"),
        is_core_function = body.get("is_core_function", True),
    )
    db.session.add(d)
    db.session.commit()
    return created(d.to_dict(), "Department created")


@dept_bp.get("/departments/<dept_id>")
@require_auth
def get_department(dept_id):
    Dept = get_model("department")
    d = db.session.query(Dept).filter_by(id=dept_id, company_id=g.company_id, is_deleted=False).first()
    if not d: return not_found("Department")
    result = d.to_dict()
    # Include section count
    Sec = get_model("section")
    result["sections_count"] = db.session.query(func.count(Sec.id)).filter_by(
        department_id=dept_id, is_deleted=False).scalar()
    Team = get_model("team")
    result["teams_count"] = db.session.query(func.count(Team.id)).filter_by(
        department_id=dept_id, is_deleted=False).scalar()
    return success(result)


@dept_bp.put("/departments/<dept_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_department(dept_id):
    Dept = get_model("department")
    d = db.session.query(Dept).filter_by(id=dept_id, company_id=g.company_id, is_deleted=False).first()
    if not d: return not_found("Department")
    body = request.get_json() or {}
    allowed = ["name", "name_nepali", "description", "function_type", "ulrich_model",
               "headcount_target", "annual_budget", "is_core_function", "status",
               "business_unit_id", "branch_id", "cost_center_id"]
    for k in allowed:
        if k in body:
            setattr(d, k, body[k])
    d.updated_at = datetime.utcnow()
    db.session.commit()
    return success(d.to_dict())


@dept_bp.delete("/departments/<dept_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def delete_department(dept_id):
    Dept = get_model("department")
    d = db.session.query(Dept).filter_by(id=dept_id, company_id=g.company_id, is_deleted=False).first()
    if not d: return not_found("Department")
    d.is_deleted = True
    d.deleted_at = datetime.utcnow()
    db.session.commit()
    return success({"deleted": True, "id": dept_id})


# ============================================================
# SECTIONS
# ============================================================
@dept_bp.get("/sections")
@require_auth
def list_sections():
    Sec = get_model("section")
    q = apply_tenant_scope(db.session.query(Sec), Sec)
    q = apply_search(q, Sec, ["name", "name_nepali", "code"])
    q = apply_filters(q, Sec, ["status", "department_id", "section_model"])
    items, meta = paginate(q)
    return success([s.to_dict() for s in items], meta=meta)


@dept_bp.post("/sections")
@require_auth
@require_role("super_admin", "hr_manager")
def create_section():
    Sec = get_model("section")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name") or not body.get("department_id"):
        return error("code, name and department_id are required", 422)
    s = Sec(
        company_id    = g.company_id,
        department_id = body["department_id"],
        code          = body["code"].upper(),
        name          = body["name"],
        name_nepali   = body.get("name_nepali"),
        description   = body.get("description"),
        section_model = body.get("section_model"),
        headcount_target = body.get("headcount_target"),
    )
    db.session.add(s)
    db.session.commit()
    return created(s.to_dict())


@dept_bp.put("/sections/<sec_id>")
@require_auth
def update_section(sec_id):
    Sec = get_model("section")
    s = db.session.query(Sec).filter_by(id=sec_id, company_id=g.company_id, is_deleted=False).first()
    if not s: return not_found("Section")
    body = request.get_json() or {}
    for k in ["name", "name_nepali", "description", "section_model", "headcount_target", "status"]:
        if k in body: setattr(s, k, body[k])
    db.session.commit()
    return success(s.to_dict())


# ============================================================
# UNITS
# ============================================================
@dept_bp.get("/units")
@require_auth
def list_units():
    Unit = get_model("unit")
    q = apply_tenant_scope(db.session.query(Unit), Unit)
    q = apply_filters(q, Unit, ["section_id", "status"])
    q = apply_search(q, Unit, ["name", "code"])
    items, meta = paginate(q)
    return success([u.to_dict() for u in items], meta=meta)


@dept_bp.post("/units")
@require_auth
def create_unit():
    Unit = get_model("unit")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name") or not body.get("section_id"):
        return error("code, name and section_id are required", 422)
    u = Unit(
        company_id  = g.company_id,
        section_id  = body["section_id"],
        code        = body["code"].upper(),
        name        = body["name"],
        name_nepali = body.get("name_nepali"),
        description = body.get("description"),
    )
    db.session.add(u)
    db.session.commit()
    return created(u.to_dict())


# ============================================================
# TEAMS — Nepal Labour Act 2074 Auto-Compliance
# ============================================================
@dept_bp.get("/teams")
@require_auth
def list_teams():
    Team = get_model("team")
    q = apply_tenant_scope(db.session.query(Team), Team)
    q = apply_search(q, Team, ["name", "name_nepali", "code"])
    q = apply_filters(q, Team, ["status", "team_type", "department_id", "section_id"])
    items, meta = paginate(q)
    return success([t.to_dict() for t in items], meta=meta)


@dept_bp.post("/teams")
@require_auth
@require_role("super_admin", "hr_manager")
def create_team():
    Team = get_model("team")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name") or not body.get("department_id"):
        return error("code, name and department_id are required", 422)

    member_count  = int(body.get("member_count", 0))
    is_managerial = bool(body.get("is_managerial", False))

    t = Team(
        company_id    = g.company_id,
        department_id = body["department_id"],
        section_id    = body.get("section_id"),
        code          = body["code"].upper(),
        name          = body["name"],
        name_nepali   = body.get("name_nepali"),
        description   = body.get("description"),
        team_type     = body.get("team_type", "functional"),
        member_count  = member_count,
        max_size      = body.get("max_size"),
        is_managerial = is_managerial,
        purpose       = body.get("purpose"),
        start_date    = date.fromisoformat(body["start_date"]) if body.get("start_date") else None,
        end_date      = date.fromisoformat(body["end_date"]) if body.get("end_date") else None,
        project_code  = body.get("project_code"),
    )
    db.session.add(t)
    db.session.commit()   # triggers fn_nepal_team_compliance

    # Return Nepal law flags
    nepal = check_cba_required(member_count, is_managerial)
    return created({**t.to_dict(), "nepal_compliance": nepal})


@dept_bp.put("/teams/<team_id>")
@require_auth
def update_team(team_id):
    Team = get_model("team")
    t = db.session.query(Team).filter_by(id=team_id, company_id=g.company_id, is_deleted=False).first()
    if not t: return not_found("Team")
    body = request.get_json() or {}
    for k in ["name", "name_nepali", "description", "team_type", "member_count",
               "max_size", "is_managerial", "purpose", "status", "project_code"]:
        if k in body: setattr(t, k, body[k])
    db.session.commit()
    nepal = check_cba_required(t.member_count or 0, t.is_managerial or False)
    return success({**t.to_dict(), "nepal_compliance": nepal})


@dept_bp.get("/teams/<team_id>/nepal-law-check")
@require_auth
def team_nepal_check(team_id):
    """Real-time Nepal Labour Act 2074 compliance check for a team."""
    Team = get_model("team")
    t = db.session.query(Team).filter_by(id=team_id, company_id=g.company_id, is_deleted=False).first()
    if not t: return not_found("Team")
    nepal = check_cba_required(t.member_count or 0, t.is_managerial or False)
    return success({
        "team_id":    team_id,
        "team_name":  t.name,
        "member_count": t.member_count,
        "is_managerial": t.is_managerial,
        **nepal,
        "actions_needed": [
            "Form Collective Bargaining Committee" if nepal["cba_required"] else None,
            "Form Safety & Health Committee"       if nepal["safety_committee_required"] else None,
        ],
    })


# ============================================================
# COST CENTERS
# ============================================================
@dept_bp.get("/cost-centers")
@require_auth
def list_cost_centers():
    CC = get_model("cost_center")
    q = apply_tenant_scope(db.session.query(CC), CC)
    q = apply_search(q, CC, ["name", "code", "name_nepali"])
    q = apply_filters(q, CC, ["status", "cc_type", "fiscal_year", "business_unit_id"])
    q = apply_sort(q, CC, ["code", "name", "budget_annual", "actuals_ytd"])
    items, meta = paginate(q)
    return success([c.to_dict() for c in items], meta=meta)


@dept_bp.post("/cost-centers")
@require_auth
@require_role("super_admin", "hr_manager")
def create_cost_center():
    CC = get_model("cost_center")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name") or not body.get("fiscal_year"):
        return error("code, name and fiscal_year are required", 422)
    cc = CC(
        company_id       = g.company_id,
        business_unit_id = body.get("business_unit_id"),
        parent_cc_id     = body.get("parent_cc_id"),
        code             = body["code"].upper(),
        name             = body["name"],
        name_nepali      = body.get("name_nepali"),
        description      = body.get("description"),
        cc_type          = body.get("cc_type", "cost_center"),
        fiscal_year      = body["fiscal_year"],
        budget_annual    = body.get("budget_annual", 0),
        budget_q1        = body.get("budget_q1", 0),
        budget_q2        = body.get("budget_q2", 0),
        budget_q3        = body.get("budget_q3", 0),
        budget_q4        = body.get("budget_q4", 0),
        gl_account_code  = body.get("gl_account_code"),
        sap_cost_center  = body.get("sap_cost_center"),
        oracle_cc_code   = body.get("oracle_cc_code"),
        manager_id       = body.get("manager_id"),
        approver_id      = body.get("approver_id"),
        currency         = body.get("currency", "NPR"),
    )
    db.session.add(cc)
    db.session.commit()
    return created(cc.to_dict())


@dept_bp.put("/cost-centers/<cc_id>")
@require_auth
def update_cost_center(cc_id):
    CC = get_model("cost_center")
    cc = db.session.query(CC).filter_by(id=cc_id, company_id=g.company_id, is_deleted=False).first()
    if not cc: return not_found("Cost Center")
    body = request.get_json() or {}
    for k in ["name", "name_nepali", "description", "cc_type", "budget_annual",
               "budget_q1", "budget_q2", "budget_q3", "budget_q4", "actuals_ytd",
               "gl_account_code", "sap_cost_center", "manager_id", "status"]:
        if k in body: setattr(cc, k, body[k])
    db.session.commit()
    return success(cc.to_dict())


@dept_bp.get("/cost-centers/<cc_id>/budget-summary")
@require_auth
def cc_budget_summary(cc_id):
    CC = get_model("cost_center")
    cc = db.session.query(CC).filter_by(id=cc_id, company_id=g.company_id).first()
    if not cc: return not_found("Cost Center")
    budget = float(cc.budget_annual or 0)
    actuals = float(cc.actuals_ytd or 0)
    committed = float(cc.committed or 0)
    return success({
        "code": cc.code, "name": cc.name,
        "fiscal_year": cc.fiscal_year,
        "budget_annual": budget,
        "actuals_ytd":  actuals,
        "committed":    committed,
        "available":    budget - actuals - committed,
        "utilization_pct": round(actuals / budget * 100, 1) if budget else 0,
        "forecast_eoy":    actuals / 9 * 12 if actuals else 0,   # simple YTD projection
        "overspend_risk":  "high" if actuals > budget * 0.9 else "medium" if actuals > budget * 0.75 else "low",
    })


# ============================================================
# WORK LOCATIONS
# ============================================================
@dept_bp.get("/work-locations")
@require_auth
def list_work_locations():
    WL = get_model("work_location")
    q = apply_tenant_scope(db.session.query(WL), WL)
    q = apply_search(q, WL, ["name", "code", "name_nepali"])
    q = apply_filters(q, WL, ["status", "location_type", "branch_id"])
    items, meta = paginate(q)
    return success([w.to_dict() for w in items], meta=meta)


@dept_bp.post("/work-locations")
@require_auth
@require_role("super_admin", "hr_manager")
def create_work_location():
    WL = get_model("work_location")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name") or not body.get("branch_id"):
        return error("code, name and branch_id are required", 422)

    # Nepal law: creche required if > 50 women workers (Section 116)
    warnings = []
    if int(body.get("max_capacity", 0)) > 50 and not body.get("has_creche"):
        warnings.append("Labour Act 2074, Section 116: Creche facility mandatory if >50 women workers at this location.")

    wl = WL(
        company_id            = g.company_id,
        branch_id             = body["branch_id"],
        code                  = body["code"].upper(),
        name                  = body["name"],
        name_nepali           = body.get("name_nepali"),
        location_type         = body.get("location_type", "office"),
        floor                 = body.get("floor"),
        wing                  = body.get("wing"),
        area_sqft             = body.get("area_sqft"),
        max_capacity          = body.get("max_capacity"),
        has_canteen           = body.get("has_canteen", False),
        has_creche            = body.get("has_creche", False),
        has_first_aid         = body.get("has_first_aid", False),
        has_fire_exit         = body.get("has_fire_exit", False),
        safety_cert_expiry    = date.fromisoformat(body["safety_cert_expiry"]) if body.get("safety_cert_expiry") else None,
        labour_zone           = body.get("labour_zone"),
        is_remote             = body.get("is_remote", False),
        biometric_enabled     = body.get("biometric_enabled", False),
        cctv_enabled          = body.get("cctv_enabled", False),
    )
    db.session.add(wl)
    db.session.commit()
    return created({**wl.to_dict(), "warnings": warnings})


@dept_bp.put("/work-locations/<wl_id>")
@require_auth
def update_work_location(wl_id):
    WL = get_model("work_location")
    wl = db.session.query(WL).filter_by(id=wl_id, company_id=g.company_id, is_deleted=False).first()
    if not wl: return not_found("Work Location")
    body = request.get_json() or {}
    for k in ["name", "name_nepali", "location_type", "floor", "wing", "max_capacity",
               "current_occupancy", "has_canteen", "has_creche", "has_first_aid",
               "has_fire_exit", "biometric_enabled", "labour_zone", "status"]:
        if k in body: setattr(wl, k, body[k])
    db.session.commit()
    return success(wl.to_dict())


# ============================================================
# EXCEL IMPORT/EXPORT (SAP-style — for all dept/team modules)
# ============================================================
@dept_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    """SAP-style Excel import for departments, teams, sections, cost centers, work locations."""
    allowed = ["department", "section", "team", "cost_center", "work_location"]
    if module not in allowed:
        return error(f"Module must be one of: {', '.join(allowed)}", 400)
    if "file" not in request.files:
        return error("No file uploaded. Field name must be 'file'", 400)
    result = parse_excel_upload(request.files["file"], module)
    return jsonify(result), 200 if result["success"] else 422


@dept_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    """Download Excel template for a given module."""
    xlsx_bytes = build_template_xlsx(module)
    if not xlsx_bytes:
        return error("Could not generate template. openpyxl not installed.", 500)
    return send_file(
        io.BytesIO(xlsx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"elogix_hrms_{module}_template.xlsx"
    )
