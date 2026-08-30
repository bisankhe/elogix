"""
FILE: backend/routes/employment_category_routes.py
Dedicated CRUD + Nepal law validation for Employment Categories.
URL prefix: /api/v1/employment-categories
Covers all 11 types: Regular, Probation, Contract-WB, Contract-TB,
Casual, Part-Time, Intern, Trainee, Daily Wage, Outsource, Consultant.
"""
from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import or_, text
from datetime import date, datetime
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import paginate, success, error, created, not_found
from ..utils.nepal_law import (check_probation, check_casual_days,
                                check_minimum_wage, get_leave_entitlement,
                                calculate_statutory_benefits)
from ..utils.excel_import import parse_excel_upload, build_template_xlsx

ec_bp = Blueprint("employment_category", __name__,
                   url_prefix="/api/v1/employment-categories")


def _get_ec_model():
    from ..models.structure_models import EmploymentCategory
    return EmploymentCategory


# ── LIST ──────────────────────────────────────────────────────
@ec_bp.get("/")
@require_auth
def list_categories():
    """GET /api/v1/employment-categories/ — All categories for this company + global seeds."""
    EC = _get_ec_model()
    q = db.session.query(EC).filter(
        or_(EC.company_id == g.company_id, EC.company_id == None),
        EC.is_deleted == False,
        EC.is_active  == True,
    ).order_by(EC.sort_order, EC.name)
    items, meta = paginate(q)
    return success([e.to_dict() for e in items], meta=meta)


# ── GET ONE ───────────────────────────────────────────────────
@ec_bp.get("/<cat_id>")
@require_auth
def get_category(cat_id):
    EC = _get_ec_model()
    e = db.session.query(EC).filter_by(id=cat_id, is_deleted=False).first()
    if not e:
        return not_found("Employment Category")
    return success({**e.to_dict(), "nepal_law": _nepal_law_summary(e)})


# ── CREATE ────────────────────────────────────────────────────
@ec_bp.post("/")
@require_auth
@require_role("super_admin", "hr_manager")
def create_category():
    EC = _get_ec_model()
    body = request.get_json() or {}

    # Required fields
    for fld in ["code", "name", "la_type"]:
        if not body.get(fld):
            return error(f"'{fld}' is required", 422)

    # Nepal Labour Act 2074 hard limits
    prob = int(body.get("max_probation_months") or 0)
    if prob > 6:
        return error("max_probation_months cannot exceed 6 — Nepal Labour Act 2074, Section 10", 422)

    days = int(body.get("max_days_per_month") or 0)
    if days > 7:
        return error("max_days_per_month cannot exceed 7 for casual — Labour Act 2074, Section 10(d)", 422)

    hrs = float(body.get("max_weekly_hrs") or 0)
    if body.get("la_type") == "part_time" and hrs > 35:
        return error("max_weekly_hrs cannot exceed 35 for part-time — Labour Act 2074, Section 10(e)", 422)

    # Duplicate check (per company)
    exists = db.session.query(EC).filter_by(
        company_id=g.company_id, code=body["code"].upper(), is_deleted=False
    ).first()
    if exists:
        return error(f"Employment category code '{body['code']}' already exists", 409)

    e = EC(
        company_id               = g.company_id,
        code                     = body["code"].upper().strip(),
        name                     = body["name"].strip(),
        name_nepali              = body.get("name_nepali"),
        la_type                  = body["la_type"],
        la_section               = body.get("la_section"),
        tier2_classification     = body.get("tier2_classification"),
        written_contract_required= body.get("written_contract_required", True),
        max_probation_months     = prob or None,
        max_duration_months      = body.get("max_duration_months"),
        max_days_per_month       = days or None,
        max_weekly_hrs           = hrs or None,
        max_daily_hrs            = body.get("max_daily_hrs"),
        termination_notice_days  = int(body.get("termination_notice_days") or 0),
        pf_eligible              = bool(body.get("pf_eligible", False)),
        ssf_eligible             = bool(body.get("ssf_eligible", False)),
        gratuity_eligible        = bool(body.get("gratuity_eligible", False)),
        medical_eligible         = bool(body.get("medical_eligible", False)),
        annual_leave_days        = int(body.get("annual_leave_days") or 0),
        sick_leave_days          = int(body.get("sick_leave_days") or 0),
        maternity_eligible       = bool(body.get("maternity_eligible", False)),
        paternity_eligible       = bool(body.get("paternity_eligible", False)),
        cba_eligible             = bool(body.get("cba_eligible", False)),
        statutory_color          = body.get("statutory_color", "#64748b"),
        ai_compliance_notes      = body.get("ai_compliance_notes"),
        ai_risk_level            = body.get("ai_risk_level", "low"),
        sort_order               = int(body.get("sort_order") or 99),
    )
    db.session.add(e)
    db.session.commit()
    return created({**e.to_dict(), "nepal_law": _nepal_law_summary(e)},
                   "Employment category created")


# ── UPDATE ────────────────────────────────────────────────────
@ec_bp.put("/<cat_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_category(cat_id):
    EC = _get_ec_model()
    e = db.session.query(EC).filter_by(id=cat_id, is_deleted=False).first()
    if not e:
        return not_found("Employment Category")
    if e.is_system:
        return error("System employment categories cannot be modified. Create a company override instead.", 403)

    body = request.get_json() or {}

    # Nepal law validation on update
    if "max_probation_months" in body and int(body["max_probation_months"] or 0) > 6:
        return error("max_probation_months cannot exceed 6 — Labour Act 2074", 422)
    if "max_days_per_month" in body and int(body["max_days_per_month"] or 0) > 7:
        return error("max_days_per_month cannot exceed 7 for casual — Labour Act 2074", 422)

    allowed = ["name","name_nepali","la_section","tier2_classification",
               "written_contract_required","max_probation_months","max_duration_months",
               "max_days_per_month","max_weekly_hrs","max_daily_hrs","termination_notice_days",
               "pf_eligible","ssf_eligible","gratuity_eligible","medical_eligible",
               "annual_leave_days","sick_leave_days","maternity_eligible","paternity_eligible",
               "cba_eligible","statutory_color","ai_compliance_notes","ai_risk_level",
               "sort_order","is_active"]
    for k in allowed:
        if k in body:
            setattr(e, k, body[k])
    e.updated_at = datetime.utcnow()
    db.session.commit()
    return success({**e.to_dict(), "nepal_law": _nepal_law_summary(e)})


# ── SOFT DELETE ───────────────────────────────────────────────
@ec_bp.delete("/<cat_id>")
@require_auth
@require_role("super_admin")
def delete_category(cat_id):
    EC = _get_ec_model()
    e = db.session.query(EC).filter_by(id=cat_id, company_id=g.company_id, is_deleted=False).first()
    if not e:
        return not_found("Employment Category")
    if e.is_system:
        return error("System categories cannot be deleted — required by Nepal Labour Act 2074", 403)
    e.is_deleted = True
    e.is_active  = False
    e.deleted_at = datetime.utcnow()
    db.session.commit()
    return success({"deleted": True, "id": cat_id})


# ── SEED (all 11 types for this company) ─────────────────────
@ec_bp.post("/seed")
@require_auth
@require_role("super_admin", "hr_manager")
def seed_categories():
    """Seeds all 11 Nepal Labour Act 2074 employment types for the company."""
    try:
        db.session.execute(
            text("SELECT fn_seed_company_emp_categories(:cid)"),
            {"cid": g.company_id}
        )
        db.session.commit()
    except Exception:
        # Fallback: insert from global seeds
        db.session.execute(text("""
            INSERT INTO employment_categories
              (company_id, code, name, name_nepali, la_type, la_section,
               written_contract_required, max_probation_months, max_days_per_month,
               max_weekly_hrs, pf_eligible, ssf_eligible, gratuity_eligible,
               medical_eligible, annual_leave_days, sick_leave_days,
               maternity_eligible, paternity_eligible, cba_eligible,
               max_daily_hrs, statutory_color, is_system, sort_order,
               ai_compliance_notes, ai_risk_level)
            SELECT :cid, code, name, name_nepali, la_type, la_section,
                   written_contract_required, max_probation_months, max_days_per_month,
                   max_weekly_hrs, pf_eligible, ssf_eligible, gratuity_eligible,
                   medical_eligible, annual_leave_days, sick_leave_days,
                   maternity_eligible, paternity_eligible, cba_eligible,
                   max_daily_hrs, statutory_color, TRUE, sort_order,
                   ai_compliance_notes, ai_risk_level
            FROM employment_categories
            WHERE company_id IS NULL
            ON CONFLICT (company_id, code) DO NOTHING
        """), {"cid": g.company_id})
        db.session.commit()

    EC = _get_ec_model()
    count = db.session.query(EC).filter_by(
        company_id=g.company_id, is_deleted=False
    ).count()
    return success({"seeded": True, "total_categories": count,
                    "message": f"{count} employment categories available for {g.company_id}"})


# ── NEPAL LAW CHECK ───────────────────────────────────────────
@ec_bp.post("/<cat_id>/validate-employee")
@require_auth
def validate_employee_for_category(cat_id):
    """
    Validates an employee assignment against this category's Nepal law rules.
    Body: { start_date, monthly_salary_npr, days_worked_this_month?,
            hours_worked_this_week?, years_service? }
    """
    EC   = _get_ec_model()
    e    = db.session.query(EC).filter_by(id=cat_id, is_deleted=False).first()
    if not e:
        return not_found("Employment Category")

    body    = request.get_json() or {}
    results = {}
    alerts  = []

    # Probation check
    if e.max_probation_months and body.get("start_date"):
        prob = check_probation(
            date.fromisoformat(body["start_date"]),
            int(e.max_probation_months)
        )
        results["probation"] = prob
        if prob.get("alert"):
            alerts.append({"severity": "high", "msg": prob["alert_message"]})

    # Casual days check
    if e.la_type and e.la_type.value == "casual" and body.get("days_worked_this_month"):
        casual = check_casual_days(int(body["days_worked_this_month"]))
        results["casual_days"] = casual
        if casual["exceeds_limit"]:
            alerts.append({"severity": "critical", "msg": casual["alert"]})

    # Minimum wage check
    if body.get("monthly_salary_npr"):
        wage = check_minimum_wage(float(body["monthly_salary_npr"]),
                                   e.la_type.value if e.la_type else "regular")
        results["minimum_wage"] = wage
        if not wage.get("compliant") and wage.get("applicable"):
            alerts.append({"severity": "critical", "msg": wage["alert"]})

    # Part-time hours check
    if e.max_weekly_hrs and body.get("hours_worked_this_week"):
        hrs = float(body["hours_worked_this_week"])
        if hrs > float(e.max_weekly_hrs):
            alerts.append({"severity": "high",
                            "msg": f"Hours {hrs} exceed max {e.max_weekly_hrs} hrs/week for {e.name} (Section 10(e))"})

    # Statutory benefits calculation
    if body.get("monthly_salary_npr"):
        results["statutory_benefits"] = calculate_statutory_benefits(
            float(body["monthly_salary_npr"]),
            float(body.get("years_service", 0)),
            e.la_type.value if e.la_type else "regular"
        )

    return success({
        "category":     e.to_dict(),
        "validations":  results,
        "alerts":       alerts,
        "compliant":    len([a for a in alerts if a["severity"] == "critical"]) == 0,
    })


# ── BENEFITS MATRIX ───────────────────────────────────────────
@ec_bp.get("/benefits-matrix")
@require_auth
def benefits_matrix():
    """Returns full benefits comparison matrix for all categories."""
    EC = _get_ec_model()
    cats = db.session.query(EC).filter(
        or_(EC.company_id == g.company_id, EC.company_id == None),
        EC.is_deleted == False, EC.is_active == True
    ).order_by(EC.sort_order).all()

    matrix = []
    for e in cats:
        matrix.append({
            "code":                       e.code,
            "name":                       e.name,
            "name_nepali":                e.name_nepali,
            "la_type":                    e.la_type.value if e.la_type else None,
            "la_section":                 e.la_section,
            "written_contract":           e.written_contract_required,
            "max_probation_months":       e.max_probation_months,
            "max_days_per_month":         e.max_days_per_month,
            "max_weekly_hrs":             float(e.max_weekly_hrs) if e.max_weekly_hrs else None,
            "pf":                         e.pf_eligible,
            "ssf":                        e.ssf_eligible,
            "gratuity":                   e.gratuity_eligible,
            "medical":                    e.medical_eligible,
            "annual_leave_days":          e.annual_leave_days,
            "sick_leave_days":            e.sick_leave_days,
            "maternity":                  e.maternity_eligible,
            "paternity":                  e.paternity_eligible,
            "cba":                        e.cba_eligible,
            "termination_notice_days":    e.termination_notice_days,
            "ai_risk_level":              e.ai_risk_level,
            "statutory_color":            e.statutory_color,
        })
    return success(matrix)


# ── LEAVE ENTITLEMENTS ────────────────────────────────────────
@ec_bp.get("/<cat_id>/leave-entitlements")
@require_auth
def leave_entitlements(cat_id):
    """Returns all leave entitlements for this employment category per Nepal law."""
    EC = _get_ec_model()
    e  = db.session.query(EC).filter_by(id=cat_id, is_deleted=False).first()
    if not e:
        return not_found("Employment Category")
    la_type = e.la_type.value if e.la_type else "regular"
    entitlements = {
        lt: get_leave_entitlement(lt, la_type)
        for lt in ["annual", "sick", "maternity", "paternity", "mourning",
                   "festival", "study"]
    }
    return success({"category": e.name, "la_type": la_type, "entitlements": entitlements})


# ── EXCEL IMPORT/EXPORT ───────────────────────────────────────
@ec_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files:
        return error("No file uploaded. Use field name 'file'.", 400)
    result = parse_excel_upload(request.files["file"], "employment_category")
    return jsonify(result), 200 if result["success"] else 422


@ec_bp.get("/excel-template")
@require_auth
def excel_template():
    xlsx = build_template_xlsx("employment_category")
    if not xlsx:
        return error("openpyxl not installed. pip install openpyxl", 500)
    return send_file(io.BytesIO(xlsx),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True,
                     download_name="elogix_hrms_employment_category_template.xlsx")


# ── Helper ────────────────────────────────────────────────────
def _nepal_law_summary(e) -> dict:
    return {
        "la_type":    e.la_type.value if e.la_type else None,
        "la_section": e.la_section,
        "key_limits": {
            "max_probation_months": e.max_probation_months,
            "max_days_per_month":   e.max_days_per_month,
            "max_weekly_hrs":       float(e.max_weekly_hrs) if e.max_weekly_hrs else None,
        },
        "mandatory_benefits": {
            "pf_10pct":       e.pf_eligible,
            "ssf_3_33pct":    e.ssf_eligible,
            "gratuity_8_33pct": e.gratuity_eligible,
            "annual_leave":   e.annual_leave_days,
            "sick_leave":     e.sick_leave_days,
        },
        "cba_eligible":           e.cba_eligible,
        "written_contract":       e.written_contract_required,
        "termination_notice_days": e.termination_notice_days,
        "ai_compliance_notes":    e.ai_compliance_notes,
        "ai_risk_level":          e.ai_risk_level,
    }
