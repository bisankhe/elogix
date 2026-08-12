"""
FILE: backend/routes/employee_enrollment_routes.py
eLogix HRMS — Employee Enrollment Module (Onboarding > Employee Joining)
URL prefix: /api/v1/enrollment

Single dynamic endpoint set mirroring the frontend's Insource/Outsource
progressive-disclosure form. Nepal Labour Act 2074 enforced:
  - Insource: 5 employment classifications, min wage NPR 15,000, probation <= 6mo,
    casual <= 7 days/month, part-time <= 35 hrs/week, SSF auto-trigger.
  - Outsource: MoLESS-licensed vendor mandatory, non-core work only (whitelist check),
    main employer co-liability acknowledgment.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date, timedelta
import io, json, uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

enrollment_bp = Blueprint("employee_enrollment", __name__, url_prefix="/api/v1/enrollment")

NEPAL_MIN_WAGE_NPR        = 15000
NEPAL_MAX_PROBATION_MONTHS = 6
NEPAL_MAX_CASUAL_DAYS      = 7
NEPAL_MAX_PARTTIME_HOURS   = 35


# ════════════════════════════════════════════════════════════════
# CORE ENROLLMENT CRUD
# ════════════════════════════════════════════════════════════════

@enrollment_bp.get("/")
@require_auth
def list_enrollments():
    """GET all enrollments with unified Insource/Outsource display fields."""
    emp_type = request.args.get("employee_type")
    status   = request.args.get("status")
    search   = request.args.get("search","")
    try:
        q = """
            SELECT ee.*,
                   d.name AS department_name, b.name AS branch_name,
                   ov.vendor_name AS vendor_full_name, ov.moless_license_no, ov.is_licensed_agency
            FROM employee_enrollments ee
            LEFT JOIN departments d        ON ee.department_id = d.id
            LEFT JOIN branches b           ON ee.branch_id = b.id
            LEFT JOIN outsource_vendors ov ON ee.vendor_id = ov.id
            WHERE ee.company_id = :cid AND NOT ee.is_deleted
        """
        params = {"cid": g.company_id}
        if emp_type: q += " AND ee.employee_type = :etype"; params["etype"] = emp_type
        if status:   q += " AND ee.status = :status";       params["status"] = status
        if search:   q += " AND ee.full_name ILIKE :s";      params["s"] = f"%{search}%"
        q += " ORDER BY ee.enrolled_date DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@enrollment_bp.get("/<enrollment_id>")
@require_auth
def get_enrollment(enrollment_id):
    try:
        row = db.session.execute(text("""
            SELECT ee.*, ov.vendor_name AS vendor_full_name, ov.moless_license_no
            FROM employee_enrollments ee
            LEFT JOIN outsource_vendors ov ON ee.vendor_id = ov.id
            WHERE ee.id = :eid AND ee.company_id = :cid AND NOT ee.is_deleted
        """), {"eid": enrollment_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Enrollment")
        return success(dict(row._mapping))
    except Exception:
        return not_found("Enrollment")


@enrollment_bp.post("/")
@require_auth
@require_role("super_admin","hr_manager")
def create_enrollment():
    """
    Dynamic create — validates and routes based on employee_type.
    Mirrors the frontend's progressive disclosure: Insource fields required
    when type=insource, Outsource fields required when type=outsource.
    """
    body = request.get_json() or {}
    emp_type = body.get("employee_type")

    if not body.get("full_name") or emp_type not in ("insource", "outsource"):
        return error("full_name and employee_type ('insource' or 'outsource') are required", 422)

    code = body.get("code") or f"ENR-{date.today().year}-{str(uuid.uuid4())[:4].upper()}"

    if emp_type == "insource":
        result = _create_insource(body, code)
    else:
        result = _create_outsource(body, code)

    return result


def _create_insource(body: dict, code: str):
    """Insource path: department/manager/payroll/SSF fields."""
    required = ["employment_classification", "department_id", "join_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing insource fields: {', '.join(missing)}", 422)

    classification = body["employment_classification"]
    if classification == "vendor_supplied":
        return error("'vendor_supplied' classification is reserved for outsource enrollments.", 422)

    # Nepal LA2074 validations
    salary = body.get("monthly_salary_npr")
    if salary is not None and float(salary) < NEPAL_MIN_WAGE_NPR:
        return error(f"Monthly salary must be at least NPR {NEPAL_MIN_WAGE_NPR:,} per Nepal Labour Act 2074.", 422)

    probation = min(body.get("probation_months", 6), NEPAL_MAX_PROBATION_MONTHS)
    if body.get("probation_months", 0) > NEPAL_MAX_PROBATION_MONTHS:
        return error(f"Probation cannot exceed {NEPAL_MAX_PROBATION_MONTHS} months (LA2074 Section 10).", 422)

    if classification == "casual" and body.get("casual_days_this_month", 0) > NEPAL_MAX_CASUAL_DAYS:
        return error(f"Casual employment limited to {NEPAL_MAX_CASUAL_DAYS} days/month per LA2074.", 422)

    if classification == "part_time" and body.get("part_time_hours_per_week", 0) > NEPAL_MAX_PARTTIME_HOURS:
        return error(f"Part-time limited to {NEPAL_MAX_PARTTIME_HOURS} hours/week per LA2074.", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO employee_enrollments
              (company_id, code, full_name, name_nepali, employee_type, employment_classification,
               department_id, branch_id, manager_employee_id, manager_name,
               join_date, monthly_salary_npr, probation_months,
               casual_days_this_month, part_time_hours_per_week,
               status, enrolled_date, created_by, created_at)
            VALUES
              (:cid, :code, :name, :nepali, 'insource', :classification,
               :dept, :branch, :mgr_id, :mgr_name,
               :join_date, :salary, :probation,
               :casual_days, :pt_hours,
               'pending_documents', NOW()::DATE, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "code": code, "name": body["full_name"], "nepali": body.get("name_nepali"),
            "classification": classification, "dept": body["department_id"], "branch": body.get("branch_id"),
            "mgr_id": body.get("manager_employee_id"), "mgr_name": body.get("manager_name"),
            "join_date": body["join_date"], "salary": salary, "probation": probation,
            "casual_days": body.get("casual_days_this_month", 0), "pt_hours": body.get("part_time_hours_per_week"),
            "user": g.user_id,
        })
        new_id = str(result.fetchone()[0])
        db.session.commit()
        return created({
            "id": new_id, "code": code, "employee_type": "insource",
            "next_steps": ["SSF Registration", "Payroll Setup", "Joining Checklist"],
            "la2074_note": f"Probation set to {probation} months. Min wage compliance verified.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


def _create_outsource(body: dict, code: str):
    """Outsource path: vendor search/select, non-core whitelist, license check."""
    required = ["vendor_id", "service_category", "contract_start_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing outsource fields: {', '.join(missing)}", 422)

    try:
        # Verify vendor exists and has valid MoLESS license
        vendor = db.session.execute(text("""
            SELECT vendor_name, moless_license_no, is_licensed_agency, moless_license_expiry
            FROM outsource_vendors WHERE id = :vid AND company_id = :cid
        """), {"vid": body["vendor_id"], "cid": g.company_id}).fetchone()
        if not vendor:
            return error("Vendor not found. Use the vendor search to select a pre-approved vendor or add a new one.", 404)

        license_valid = bool(vendor.is_licensed_agency) and (
            vendor.moless_license_expiry is None or vendor.moless_license_expiry >= date.today()
        )

        # Verify non-core whitelist
        non_core = db.session.execute(text("""
            SELECT 1 FROM non_core_service_categories WHERE name = :svc AND is_active = TRUE
        """), {"svc": body["service_category"]}).fetchone()
        is_non_core = bool(non_core)

        if not license_valid:
            return error(
                f"Vendor '{vendor.vendor_name}' does not have a valid MoLESS license. "
                "Nepal Labour Act 2074 Section 59: unlicensed vendor use makes this worker a "
                "direct employee of your company by law. Cannot proceed.",
                422
            )

        result = db.session.execute(text("""
            INSERT INTO employee_enrollments
              (company_id, code, full_name, employee_type, employment_classification,
               vendor_id, vendor_name_snapshot, vendor_license_no_snapshot, vendor_license_verified, vendor_license_verified_at,
               service_category, is_non_core_verified,
               contract_start_date, contract_end_date, billing_rate_npr_per_day, po_number, vendor_contact_email,
               sow_uploaded, status, enrolled_date, created_by, created_at)
            VALUES
              (:cid, :code, :name, 'outsource', 'vendor_supplied',
               :vid, :vname, :vlicense, :license_valid, NOW(),
               :svc, :non_core,
               :start, :end, :rate, :po, :vcontact,
               :sow, 'pending_documents', NOW()::DATE, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "code": code, "name": body["full_name"],
            "vid": body["vendor_id"], "vname": vendor.vendor_name, "vlicense": vendor.moless_license_no,
            "license_valid": license_valid, "svc": body["service_category"], "non_core": is_non_core,
            "start": body["contract_start_date"], "end": body.get("contract_end_date"),
            "rate": body.get("billing_rate_npr_per_day"), "po": body.get("po_number"),
            "vcontact": body.get("vendor_contact_email"), "sow": bool(body.get("sow_document_url")),
            "user": g.user_id,
        })
        new_id = str(result.fetchone()[0])
        db.session.commit()

        warning = None
        if not is_non_core:
            warning = (
                f"WARNING: Service category '{body['service_category']}' is not on the approved "
                "non-core whitelist. Nepal LA2074 restricts outsourcing to non-core work only "
                "(security, cleaning, drivers, etc.). Review before completing enrollment."
            )

        return created({
            "id": new_id, "code": code, "employee_type": "outsource",
            "vendor_license_valid": license_valid, "is_non_core_verified": is_non_core,
            "warning": warning,
            "next_steps": ["SOW Document Upload", "Vendor Attendance Setup", "Joining Checklist"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@enrollment_bp.put("/<enrollment_id>")
@require_auth
@require_role("super_admin","hr_manager")
def update_enrollment(enrollment_id):
    body = request.get_json() or {}
    allowed = [
        "full_name","name_nepali","department_id","branch_id","manager_employee_id","manager_name",
        "join_date","monthly_salary_npr","probation_months","ssf_enrolled","ssf_registration_no",
        "payroll_setup_complete","tax_withholding_configured","benefits_enrolled",
        "contract_end_date","billing_rate_npr_per_day","po_number","vendor_contact_email",
        "sow_document_url","sow_uploaded","status",
    ]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("Nothing to update", 400)

    if "probation_months" in updates and updates["probation_months"] > NEPAL_MAX_PROBATION_MONTHS:
        return error(f"Probation cannot exceed {NEPAL_MAX_PROBATION_MONTHS} months.", 422)
    if "monthly_salary_npr" in updates and updates["monthly_salary_npr"] < NEPAL_MIN_WAGE_NPR:
        return error(f"Salary must be at least NPR {NEPAL_MIN_WAGE_NPR:,}.", 422)

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"eid": enrollment_id, "cid": g.company_id})
    try:
        db.session.execute(text(
            f"UPDATE employee_enrollments SET {set_clause} WHERE id = :eid AND company_id = :cid"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@enrollment_bp.post("/<enrollment_id>/complete")
@require_auth
@require_role("super_admin","hr_manager")
def complete_enrollment(enrollment_id):
    """
    Finalize enrollment. Blocked by DB trigger if outsource vendor license
    is invalid. Auto-triggers SSF enrollment for insource hires.
    """
    try:
        row = db.session.execute(text(
            "SELECT employee_type, vendor_license_verified, monthly_salary_npr FROM employee_enrollments "
            "WHERE id = :eid AND company_id = :cid"
        ), {"eid": enrollment_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Enrollment")

        if row.employee_type == "outsource" and not row.vendor_license_verified:
            return error("Cannot complete: vendor license not verified.", 422)

        ssf_trigger = row.employee_type == "insource"

        db.session.execute(text("""
            UPDATE employee_enrollments
               SET status = 'completed',
                   ssf_enrolled = CASE WHEN :ssf THEN TRUE ELSE ssf_enrolled END,
                   ssf_enrolled_date = CASE WHEN :ssf THEN NOW()::DATE ELSE ssf_enrolled_date END,
                   payroll_setup_complete = CASE WHEN :ssf THEN TRUE ELSE payroll_setup_complete END
             WHERE id = :eid AND company_id = :cid
        """), {"ssf": ssf_trigger, "eid": enrollment_id, "cid": g.company_id})
        db.session.commit()

        return success({
            "completed": True,
            "ssf_auto_enrolled": ssf_trigger,
            "downstream_triggers": ["Joining Checklist initialized", "Payroll Setup"] if ssf_trigger
                                   else ["Vendor Billing linked", "SLA Contract monitoring"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@enrollment_bp.delete("/<enrollment_id>")
@require_auth
@require_role("super_admin")
def cancel_enrollment(enrollment_id):
    try:
        db.session.execute(text("""
            UPDATE employee_enrollments SET status = 'cancelled', is_deleted = TRUE
            WHERE id = :eid AND company_id = :cid
        """), {"eid": enrollment_id, "cid": g.company_id})
        db.session.commit()
        return success({"cancelled": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# VENDOR SMART SEARCH (type-ahead for Outsource field)
# ════════════════════════════════════════════════════════════════

@enrollment_bp.get("/vendors/search")
@require_auth
def search_vendors():
    """Type-ahead vendor search for the Outsource progressive-disclosure field."""
    q = request.args.get("q", "")
    if len(q) < 2: return success([])
    try:
        rows = db.session.execute(text("""
            SELECT id, vendor_name, vendor_code, moless_license_no, is_licensed_agency,
                   moless_license_expiry, service_category, contact_email
            FROM outsource_vendors
            WHERE company_id = :cid AND NOT is_deleted
              AND vendor_name ILIKE :q
            ORDER BY vendor_name
            LIMIT 10
        """), {"cid": g.company_id, "q": f"%{q}%"}).fetchall()
        data = []
        for r in rows:
            d = dict(r._mapping)
            d["license_valid"] = bool(d["is_licensed_agency"]) and (
                d["moless_license_expiry"] is None or d["moless_license_expiry"] >= date.today()
            )
            data.append(d)
        return success(data)
    except Exception:
        return success([])


@enrollment_bp.post("/vendors/quick-add")
@require_auth
@require_role("super_admin","hr_manager")
def quick_add_vendor():
    """'+ Add New Vendor' inline action from the enrollment form."""
    body = request.get_json() or {}
    required = ["vendor_name", "moless_license_no"]
    missing  = [f for f in required if not body.get(f)]
    if missing:
        return error(
            "vendor_name and moless_license_no are required. Nepal LA2074 Section 59: "
            "DOL/MoLESS license is mandatory for any labour supply vendor.",
            422
        )
    try:
        code = f"VND-{str(uuid.uuid4())[:4].upper()}"
        result = db.session.execute(text("""
            INSERT INTO outsource_vendors
              (company_id, vendor_code, vendor_name, moless_license_no, is_licensed_agency,
               contact_email, status, created_by, created_at)
            VALUES
              (:cid, :code, :name, :license, TRUE,
               :email, 'active', :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "code": code, "name": body["vendor_name"],
            "license": body["moless_license_no"], "email": body.get("contact_email"), "user": g.user_id,
        })
        new_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"id": new_id, "vendor_code": code, "message": "Vendor quick-profile created."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# NON-CORE SERVICE WHITELIST
# ════════════════════════════════════════════════════════════════

@enrollment_bp.get("/non-core-services")
@require_auth
def list_non_core_services():
    """Populates the Service Category dropdown for Outsource enrollments."""
    try:
        rows = db.session.execute(text("""
            SELECT name, gazette_ref FROM non_core_service_categories
            WHERE is_active = TRUE AND (company_id IS NULL OR company_id = :cid)
            ORDER BY name
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@enrollment_bp.post("/check-core-work")
@require_auth
def check_core_work():
    """Real-time validation as the user types/selects a service category."""
    body = request.get_json() or {}
    service = body.get("service_category", "")
    try:
        row = db.session.execute(text(
            "SELECT 1 FROM non_core_service_categories WHERE name = :svc AND is_active = TRUE"
        ), {"svc": service}).fetchone()
        is_non_core = bool(row)
        return success({
            "service_category": service,
            "is_non_core": is_non_core,
            "warning": None if is_non_core else (
                "This service may be classified as core business work. Nepal Labour Act 2074 "
                "restricts outsourcing to non-core functions only. Outsourcing core work risks "
                "automatic reclassification of the worker as your direct employee."
            ),
        })
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# AI COMPLIANCE SCORING
# ════════════════════════════════════════════════════════════════

@enrollment_bp.post("/<enrollment_id>/ai-compliance-check")
@require_auth
def ai_compliance_check(enrollment_id):
    try:
        row = db.session.execute(text(
            "SELECT * FROM employee_enrollments WHERE id = :eid AND company_id = :cid"
        ), {"eid": enrollment_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Enrollment")
        d = dict(row._mapping)

        flags = []
        if d["employee_type"] == "insource":
            if d.get("monthly_salary_npr") and d["monthly_salary_npr"] < NEPAL_MIN_WAGE_NPR:
                flags.append("Below minimum wage")
            if not d.get("ssf_enrolled") and d["status"] == "completed":
                flags.append("SSF enrollment pending")
        else:
            if not d.get("is_non_core_verified"):
                flags.append("Service category not verified as non-core")
            if not d.get("vendor_license_verified"):
                flags.append("Vendor license not verified")
            if not d.get("sow_uploaded"):
                flags.append("SOW document missing")

        score = max(0, 100 - len(flags) * 25)

        db.session.execute(text("""
            UPDATE employee_enrollments SET ai_compliance_score = :score, ai_flags = :flags::jsonb
            WHERE id = :eid AND company_id = :cid
        """), {"score": score, "flags": json.dumps(flags), "eid": enrollment_id, "cid": g.company_id})
        db.session.commit()

        return success({"ai_compliance_score": score, "flags": flags})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# DASHBOARD / ANALYTICS VIEWS
# ════════════════════════════════════════════════════════════════

@enrollment_bp.get("/dashboard")
@require_auth
def enrollment_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_enrollment_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@enrollment_bp.get("/outsource-compliance-risk")
@require_auth
def outsource_compliance_risk():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_outsource_compliance_risk WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({"records": data, "at_risk_count": sum(1 for r in data if r["risk_status"] != "COMPLIANT")})
    except Exception:
        return success({"records": [], "at_risk_count": 0})


@enrollment_bp.get("/insource-compliance")
@require_auth
def insource_compliance():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_insource_compliance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@enrollment_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "employee_enrollment")
    return jsonify(result), 200 if result["success"] else 422


@enrollment_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("employee_enrollment")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="employee_enrollment_template.xlsx")
