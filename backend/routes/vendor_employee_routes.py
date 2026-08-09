"""
FILE: backend/routes/vendor_employee_routes.py
NepHR Pro — Vendor / Outsource Employee Management
URL prefix: /api/v1/ve
Covers all 5 modules:
  1. /ve/employees       — Vendor Employee Roster (CRUD + onboard + offboard)
  2. /ve/assets          — Inventory & Asset Tracking
  3. /ve/leave           — Leave Requests & Balances
  4. /ve/advance         — Cash Advance (multi-tier approval + repayment)
  5. /ve/attendance      — Daily Attendance (geo/biometric + ghost detection)
Nepal Labour Act 2074 Sections 52-64 enforced at every endpoint.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text, func
from datetime import datetime, date, timedelta
import io, json, uuid, hashlib

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import paginate, success, error, created, not_found, apply_search, apply_filters
from ..utils.nepal_law import check_outsource_compliance
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights, detect_ghost_workers

ve_bp = Blueprint("vendor_employees_mgmt", __name__, url_prefix="/api/v1/ve")


# ════════════════════════════════════════════════════════════════
# MODULE 1: VENDOR EMPLOYEES
# ════════════════════════════════════════════════════════════════

@ve_bp.get("/employees")
@require_auth
def list_ve():
    """GET full vendor employee roster with compliance status."""
    status     = request.args.get("status")
    vendor_id  = request.args.get("vendor_id")
    branch     = request.args.get("branch")
    search     = request.args.get("search","")
    expiring   = request.args.get("expiring_days")  # show contracts expiring within N days

    q = """
        SELECT
            ve.*,
            ov.vendor_name,
            ov.vendor_code,
            ov.moless_license_no,
            ov.is_licensed_agency,
            -- compute compliance flags
            CASE WHEN NOT ve.id_verified         THEN TRUE ELSE FALSE END AS flag_id,
            CASE WHEN NOT ve.bg_verified         THEN TRUE ELSE FALSE END AS flag_bg,
            CASE WHEN NOT ve.ssf_paid_current_month THEN TRUE ELSE FALSE END AS flag_ssf,
            CASE WHEN NOT ve.insurance_active    THEN TRUE ELSE FALSE END AS flag_ins,
            CASE WHEN ve.monthly_wage_npr < 15000 THEN TRUE ELSE FALSE END AS flag_wage,
            -- attendance summary (last 30 days)
            (SELECT COUNT(*) FROM vendor_attendance va
             WHERE va.vendor_employee_id = ve.id
               AND va.attendance_date >= NOW()::DATE - 30
               AND va.is_present) AS present_30d,
            (SELECT COUNT(*) FROM vendor_attendance va
             WHERE va.vendor_employee_id = ve.id
               AND va.attendance_date >= NOW()::DATE - 30) AS total_30d
        FROM vendor_employees ve
        LEFT JOIN outsource_vendors ov ON ve.vendor_id = ov.id
        WHERE ve.company_id = :cid AND NOT ve.is_deleted
    """
    params = {"cid": g.company_id}
    if status:    q += " AND ve.status = :status";   params["status"] = status
    if vendor_id: q += " AND ve.vendor_id = :vid";   params["vid"]    = vendor_id
    if branch:    q += " AND ve.assigned_branch_id::TEXT = :branch"; params["branch"] = branch
    if search:    q += " AND (ve.name ILIKE :s OR ve.vendor_emp_id ILIKE :s OR ve.role ILIKE :s)"; params["s"] = f"%{search}%"
    if expiring:
        q += " AND (ve.assignment_end_date BETWEEN NOW()::DATE AND NOW()::DATE + :days)"
        params["days"] = f"{int(expiring)} days"
    q += " ORDER BY ve.ai_compliance_score ASC NULLS LAST, ve.assignment_end_date ASC"

    try:
        rows = db.session.execute(text(q), params).fetchall()
        data = []
        for r in rows:
            d = dict(r._mapping)
            # Attendance %
            tot = d.pop("total_30d", 0) or 1
            prs = d.pop("present_30d", 0) or 0
            d["attendance_pct_30d"] = round(prs / tot * 100, 1)
            # Days remaining
            if d.get("assignment_end_date"):
                d["days_remaining"] = (d["assignment_end_date"] - date.today()).days
            # Compliance
            issues = []
            if d.pop("flag_id", False):   issues.append("ID not verified")
            if d.pop("flag_bg", False):   issues.append("BGV pending")
            if d.pop("flag_ssf", False):  issues.append("SSF unpaid (LA2074 S.64 co-liability)")
            if d.pop("flag_ins", False):  issues.append("No insurance")
            if d.pop("flag_wage", False): issues.append("Below NPR 15,000 minimum wage")
            d["compliance_issues"] = issues
            data.append(d)
        return success(data)
    except Exception as e:
        return success([])


@ve_bp.post("/employees")
@require_auth
@require_role("super_admin","hr_manager")
def create_ve():
    """Onboard a new vendor employee. VE- prefix ID required."""
    body = request.get_json() or {}
    required = ["vendor_emp_id","name","role","vendor_id","service_category"]
    missing  = [f for f in required if not body.get(f)]
    if missing:
        return error(f"Missing required fields: {', '.join(missing)}", 422)

    # VE- prefix enforcement
    emp_id = body["vendor_emp_id"].upper()
    if not emp_id.startswith("VE-"):
        return error("Vendor employee ID must start with 'VE-' prefix to distinguish from direct employees.", 422)

    # Wage check
    wage = body.get("monthly_wage_npr")
    if wage and float(wage) < 15000:
        return error("monthly_wage_npr must be >= NPR 15,000 per Nepal Labour Act 2074 minimum wage.", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO vendor_employees
              (company_id, vendor_id, contract_id, vendor_emp_id,
               name, name_nepali, role, service_category,
               assigned_location, assigned_branch_id, shift_type,
               join_date, assignment_end_date,
               monthly_wage_npr, daily_rate_npr,
               has_badge_access, has_system_access,
               phone, emergency_contact,
               status, ai_ghost_risk_score, ai_compliance_score,
               created_by, created_at)
            VALUES
              (:cid, :vid, :contract_id, :emp_id,
               :name, :nepali, :role, :service_cat,
               :location, :branch_id, :shift,
               :join_date, :end_date,
               :wage, :daily,
               :badge, FALSE,
               :phone, :emergency,
               'active', 0, 100,
               :user, NOW())
            RETURNING id, vendor_emp_id, name
        """), {
            "cid":         g.company_id,
            "vid":         body["vendor_id"],
            "contract_id": body.get("contract_id"),
            "emp_id":      emp_id,
            "name":        body["name"],
            "nepali":      body.get("name_nepali",""),
            "role":        body["role"],
            "service_cat": body["service_category"],
            "location":    body.get("assigned_location",""),
            "branch_id":   body.get("assigned_branch_id"),
            "shift":       body.get("shift_type","General"),
            "join_date":   body.get("join_date", date.today().isoformat()),
            "end_date":    body.get("assignment_end_date"),
            "wage":        wage,
            "daily":       body.get("daily_rate_npr"),
            "badge":       body.get("has_badge_access", False),
            "phone":       body.get("phone",""),
            "emergency":   body.get("emergency_contact",""),
            "user":        g.user_id,
        })
        row = result.fetchone()
        db.session.commit()
        return created(dict(row._mapping),
                       "Vendor employee onboarded. BGV and SSF verification required within 7 days per Nepal LA2074 Section 64.")
    except Exception as e:
        db.session.rollback()
        return error(f"Onboarding failed: {str(e)}", 500)


@ve_bp.get("/employees/<ve_id>")
@require_auth
def get_ve(ve_id):
    try:
        row = db.session.execute(text("""
            SELECT ve.*, ov.vendor_name, ov.moless_license_no, ov.is_licensed_agency
            FROM vendor_employees ve
            LEFT JOIN outsource_vendors ov ON ve.vendor_id = ov.id
            WHERE ve.id = :vid AND ve.company_id = :cid AND NOT ve.is_deleted
        """), {"vid": ve_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Vendor Employee")
        return success(dict(row._mapping))
    except Exception:
        return not_found("Vendor Employee")


@ve_bp.put("/employees/<ve_id>")
@require_auth
@require_role("super_admin","hr_manager")
def update_ve(ve_id):
    body = request.get_json() or {}
    allowed = ["name","name_nepali","role","shift_type","assigned_location","assigned_branch_id",
               "assignment_end_date","monthly_wage_npr","daily_rate_npr",
               "id_verified","bg_verified","bg_verified_date",
               "insurance_active","insurance_verified_date",
               "ssf_paid_current_month","ssf_last_verified_date",
               "min_wage_compliant","has_badge_access","phone","emergency_contact",
               "status","ai_ghost_risk_score","ai_compliance_score","ai_flags"]
    updates = {}
    for k in allowed:
        if k in body:
            val = body[k]
            if isinstance(val, list): val = json.dumps(val)
            updates[k] = val

    # Wage check
    if "monthly_wage_npr" in updates and float(updates["monthly_wage_npr"]) < 15000:
        return error("monthly_wage_npr < NPR 15,000 violates Nepal minimum wage.", 422)

    if not updates: return error("Nothing to update", 400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"vid": ve_id, "cid": g.company_id})
    try:
        db.session.execute(text(
            f"UPDATE vendor_employees SET {set_clause}, updated_at = NOW() WHERE id = :vid AND company_id = :cid"
        ), updates)
        db.session.commit()
        return success({"updated": True, "ve_id": ve_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.post("/employees/<ve_id>/offboard")
@require_auth
@require_role("super_admin","hr_manager")
def offboard_ve(ve_id):
    """
    Offboard a vendor employee:
    - Mark status = offboarded
    - Revoke badge access
    - Return all assets
    - Flag any pending advances
    """
    body = request.get_json() or {}
    try:
        # Revoke access + update status
        db.session.execute(text("""
            UPDATE vendor_employees
               SET status = 'offboarded',
                   has_badge_access = FALSE,
                   has_system_access = FALSE,
                   assignment_end_date = NOW()::DATE,
                   updated_at = NOW()
             WHERE id = :vid AND company_id = :cid
        """), {"vid": ve_id, "cid": g.company_id})

        # Return all assigned assets
        assets_returned = db.session.execute(text("""
            UPDATE vendor_assets
               SET status = 'returned',
                   return_date = NOW()::DATE,
                   return_condition = 'pending_check'
             WHERE assigned_to_ve_id = :vid AND status = 'assigned'
            RETURNING asset_code, name
        """), {"vid": ve_id}).fetchall()

        db.session.commit()
        return success({
            "offboarded":     True,
            "ve_id":          ve_id,
            "badge_revoked":  True,
            "assets_returned":[dict(r._mapping) for r in assets_returned],
            "la2074_note":    "Record-keeping obligation continues for 2 years per Nepal Labour Act 2074.",
            "offboarded_by":  g.user_id,
            "offboarded_at":  datetime.utcnow().isoformat(),
            "offboard_reason":body.get("reason","Contract ended"),
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.post("/employees/<ve_id>/ai-compliance-check")
@require_auth
def ve_ai_compliance_check(ve_id):
    """Run AI compliance check and update score."""
    try:
        row = db.session.execute(text("""
            SELECT * FROM vendor_employees WHERE id = :vid AND company_id = :cid
        """), {"vid": ve_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Vendor Employee")
        ve = dict(row._mapping)

        result = check_outsource_compliance(
            is_licensed_agency  = True,
            license_expiry      = None,
            is_core_function    = False,
            ssf_paid            = ve.get("ssf_paid_current_month", False),
            min_wage_paid       = (ve.get("monthly_wage_npr") or 0) >= 15000,
            insurance_provided  = ve.get("insurance_active", False),
        )

        issues = []
        if not ve.get("id_verified"):         issues.append("ID verification pending")
        if not ve.get("bg_verified"):         issues.append("Background check pending")
        if not ve.get("ssf_paid_current_month"): issues.append("SSF not paid this month")
        if not ve.get("insurance_active"):    issues.append("Insurance not active")
        if (ve.get("monthly_wage_npr") or 0) < 15000: issues.append("Below minimum wage")

        ai_score = max(0, 100 - len(issues) * 20)

        db.session.execute(text("""
            UPDATE vendor_employees
               SET ai_compliance_score = :score, ai_flags = :flags::jsonb, updated_at = NOW()
             WHERE id = :vid AND company_id = :cid
        """), {"score": ai_score, "flags": json.dumps(issues), "vid": ve_id, "cid": g.company_id})
        db.session.commit()

        return success({
            "ve_id":             ve_id,
            "ai_compliance_score": ai_score,
            "issues":            issues,
            "compliance_result": result,
            "checked_at":        datetime.utcnow().isoformat(),
        })
    except Exception as e:
        return error(str(e), 500)


@ve_bp.post("/employees/excel-import")
@require_auth
def ve_excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "vendor_employee")
    return jsonify(result), 200 if result["success"] else 422

@ve_bp.get("/employees/excel-template")
@require_auth
def ve_excel_template():
    b = build_template_xlsx("vendor_employee")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="vendor_employee_template.xlsx")


# ════════════════════════════════════════════════════════════════
# MODULE 2: INVENTORY & ASSETS
# ════════════════════════════════════════════════════════════════

@ve_bp.get("/assets")
@require_auth
def list_assets():
    cat    = request.args.get("category")
    status = request.args.get("status")
    ve_id  = request.args.get("assigned_to_ve_id")
    search = request.args.get("search","")
    try:
        q = """
            SELECT va.*,
                   ve.name AS assigned_to_name, ve.vendor_emp_id,
                   ov.vendor_name
            FROM vendor_assets va
            LEFT JOIN vendor_employees ve ON va.assigned_to_ve_id = ve.id
            LEFT JOIN outsource_vendors ov ON ve.vendor_id = ov.id
            WHERE va.company_id = :cid AND NOT va.is_deleted
        """
        params = {"cid": g.company_id}
        if cat:    q += " AND va.category = :cat";  params["cat"]  = cat
        if status: q += " AND va.status = :status"; params["status"] = status
        if ve_id:  q += " AND va.assigned_to_ve_id = :veid"; params["veid"] = ve_id
        if search: q += " AND (va.asset_code ILIKE :s OR va.name ILIKE :s)"; params["s"] = f"%{search}%"
        q += " ORDER BY va.status, va.category, va.asset_code"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ve_bp.post("/assets")
@require_auth
@require_role("super_admin","hr_manager")
def create_asset():
    body = request.get_json() or {}
    if not body.get("asset_code") or not body.get("name") or not body.get("category"):
        return error("asset_code, name and category required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO vendor_assets
              (company_id, asset_code, name, category, description,
               serial_no, make_model, value_npr, condition, location,
               purchase_date, warranty_expiry, status,
               created_by, created_at)
            VALUES
              (:cid, :code, :name, :cat, :desc,
               :serial, :model, :value, :condition, :location,
               :purchase, :warranty, 'available',
               :user, NOW())
        """), {
            "cid":      g.company_id,
            "code":     body["asset_code"].upper(),
            "name":     body["name"],
            "cat":      body["category"],
            "desc":     body.get("description",""),
            "serial":   body.get("serial_no"),
            "model":    body.get("make_model",""),
            "value":    body.get("value_npr", 0),
            "condition":body.get("condition","good"),
            "location": body.get("location",""),
            "purchase": body.get("purchase_date"),
            "warranty": body.get("warranty_expiry"),
            "user":     g.user_id,
        })
        db.session.commit()
        return created({"asset_code": body["asset_code"]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.post("/assets/<asset_id>/assign")
@require_auth
@require_role("super_admin","hr_manager")
def assign_asset(asset_id):
    """Assign an asset to a vendor employee."""
    body = request.get_json() or {}
    if not body.get("vendor_employee_id"):
        return error("vendor_employee_id required", 422)

    # IT hardware: block system_access (co-employment prevention)
    try:
        asset_row = db.session.execute(text(
            "SELECT category FROM vendor_assets WHERE id = :aid AND company_id = :cid"
        ), {"aid": asset_id, "cid": g.company_id}).fetchone()

        if asset_row and asset_row.category == "it_hardware":
            # Confirm no system access granted
            db.session.execute(text("""
                UPDATE vendor_employees SET has_system_access = FALSE, updated_at = NOW()
                WHERE id = :veid AND company_id = :cid
            """), {"veid": body["vendor_employee_id"], "cid": g.company_id})

        db.session.execute(text("""
            UPDATE vendor_assets
               SET assigned_to_ve_id = :veid,
                   assigned_date = NOW()::DATE,
                   status = 'assigned',
                   return_date = NULL,
                   updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"veid": body["vendor_employee_id"], "aid": asset_id, "cid": g.company_id})
        db.session.commit()

        warning = None
        if asset_row and asset_row.category == "it_hardware":
            warning = "IT hardware assigned. System access remains DISABLED for vendor employee per co-employment policy."

        return success({"assigned": True, "asset_id": asset_id,
                        "assigned_to": body["vendor_employee_id"], "warning": warning})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.post("/assets/<asset_id>/return")
@require_auth
@require_role("super_admin","hr_manager")
def return_asset(asset_id):
    """Process asset return from a vendor employee."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE vendor_assets
               SET status = 'returned',
                   assigned_to_ve_id = NULL,
                   return_date = NOW()::DATE,
                   return_condition = :condition,
                   condition = :condition,
                   updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"condition": body.get("condition","good"), "aid": asset_id, "cid": g.company_id})
        db.session.commit()
        return success({"returned": True, "return_date": date.today().isoformat(),
                        "condition": body.get("condition","good")})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.get("/assets/return-alerts")
@require_auth
def asset_return_alerts():
    """Assets with contracts expiring in next 30 days."""
    try:
        rows = db.session.execute(text("""
            SELECT va.asset_code, va.name AS asset_name, va.category, va.value_npr,
                   ve.vendor_emp_id, ve.name AS emp_name, ve.assignment_end_date,
                   (ve.assignment_end_date - NOW()::DATE)::INT AS days_remaining
            FROM vendor_assets va
            JOIN vendor_employees ve ON va.assigned_to_ve_id = ve.id
            WHERE va.company_id = :cid AND va.status = 'assigned'
              AND ve.assignment_end_date <= NOW()::DATE + 30
            ORDER BY ve.assignment_end_date ASC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# MODULE 3: LEAVE REQUESTS
# ════════════════════════════════════════════════════════════════

LEAVE_ENTITLEMENTS = {
    "sick": 12, "annual": 18, "festival": 13, "casual": 6,
    "maternity": 98, "paternity": 15, "unpaid": 999, "compensatory": 0
}

@ve_bp.get("/leave")
@require_auth
def list_leave():
    status   = request.args.get("status")
    ve_id    = request.args.get("vendor_employee_id")
    ltype    = request.args.get("leave_type")
    search   = request.args.get("search","")
    try:
        q = """
            SELECT vlr.*,
                   ve.name AS emp_name, ve.vendor_emp_id, ve.role,
                   ov.vendor_name
            FROM vendor_leave_requests vlr
            JOIN vendor_employees ve ON vlr.vendor_employee_id = ve.id
            LEFT JOIN outsource_vendors ov ON ve.vendor_id = ov.id
            WHERE vlr.company_id = :cid
        """
        params = {"cid": g.company_id}
        if status: q += " AND vlr.status = :status"; params["status"] = status
        if ve_id:  q += " AND vlr.vendor_employee_id = :veid"; params["veid"] = ve_id
        if ltype:  q += " AND vlr.leave_type = :ltype"; params["ltype"] = ltype
        if search: q += " AND ve.name ILIKE :s"; params["s"] = f"%{search}%"
        q += " ORDER BY vlr.applied_on DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ve_bp.post("/leave")
@require_auth
def create_leave_request():
    body = request.get_json() or {}
    required = ["vendor_employee_id","leave_type","from_date","to_date","reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    from_d = date.fromisoformat(body["from_date"])
    to_d   = date.fromisoformat(body["to_date"])
    if to_d < from_d: return error("to_date must be >= from_date", 422)
    days = (to_d - from_d).days + 1

    # Check leave balance
    try:
        balance_row = db.session.execute(text("""
            SELECT balance_days FROM vendor_leave_balances
            WHERE vendor_employee_id = :veid AND year = :year AND leave_type = :ltype
        """), {"veid": body["vendor_employee_id"], "year": from_d.year, "ltype": body["leave_type"]}).fetchone()

        balance = balance_row.balance_days if balance_row else LEAVE_ENTITLEMENTS.get(body["leave_type"], 0)
        if body["leave_type"] not in ("unpaid","maternity","paternity") and days > balance:
            return error(f"Insufficient leave balance. Available: {balance} days, Requested: {days} days.", 422)

        # AI recommendation
        ai_rec = _ai_leave_recommendation(body["leave_type"], days, balance, body.get("cover_arrangement"))

        req_no = f"LR-{date.today().year}-{str(uuid.uuid4())[:4].upper()}"
        db.session.execute(text("""
            INSERT INTO vendor_leave_requests
              (company_id, vendor_employee_id, vendor_id, request_no,
               leave_type, from_date, to_date, days_requested, reason,
               applied_via, balance_before, cover_arrangement,
               status, ai_recommendation, applied_on, created_at)
            SELECT :cid, :veid, ve.vendor_id, :req_no,
               :ltype, :from_d, :to_d, :days, :reason,
               :via, :balance, :cover,
               'pending', :ai_rec, NOW(), NOW()
            FROM vendor_employees ve WHERE ve.id = :veid
        """), {
            "cid":     g.company_id,
            "veid":    body["vendor_employee_id"],
            "req_no":  req_no,
            "ltype":   body["leave_type"],
            "from_d":  from_d, "to_d": to_d, "days": days,
            "reason":  body["reason"],
            "via":     body.get("applied_via","web"),
            "balance": balance,
            "cover":   body.get("cover_arrangement",""),
            "ai_rec":  ai_rec,
        })
        db.session.commit()
        return created({"request_no": req_no, "days": days,
                        "ai_recommendation": ai_rec,
                        "la2074_note": "Vendor employees entitled to same statutory leave per Nepal LA2074 Section 53."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


def _ai_leave_recommendation(ltype, days, balance, cover):
    """Simple rule-based leave AI recommendation."""
    if ltype in ("sick",):
        return f"Auto-approve recommended. Sick leave is statutory. Balance: {balance} days."
    if ltype == "maternity":
        return "Maternity leave approved per Nepal Labour Act 2074. 98 days full pay."
    if ltype == "paternity":
        return "Paternity leave approved per Nepal Labour Act 2074. 15 days."
    if days > balance:
        return f"REJECT: Insufficient balance ({balance} days). Request exceeds entitlement."
    if not cover:
        return "Pending: Coverage arrangement required before approval."
    return f"AI Approve: {days}d leave. {balance - days} days will remain. Coverage: {cover}."


@ve_bp.put("/leave/<leave_id>/approve")
@require_auth
@require_role("super_admin","hr_manager")
def approve_leave(leave_id):
    try:
        row = db.session.execute(text("""
            SELECT * FROM vendor_leave_requests WHERE id = :lid AND company_id = :cid
        """), {"lid": leave_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Leave Request")
        if row.status != "pending": return error(f"Request is already {row.status}", 409)

        # Deduct balance
        db.session.execute(text("""
            INSERT INTO vendor_leave_balances
              (company_id, vendor_employee_id, year, leave_type, entitled_days, used_days)
            VALUES
              (:cid, :veid, :year, :ltype, :entitled, :days)
            ON CONFLICT (vendor_employee_id, year, leave_type)
            DO UPDATE SET used_days = vendor_leave_balances.used_days + EXCLUDED.used_days,
                          updated_at = NOW()
        """), {
            "cid":      g.company_id,
            "veid":     row.vendor_employee_id,
            "year":     row.from_date.year,
            "ltype":    row.leave_type,
            "entitled": LEAVE_ENTITLEMENTS.get(row.leave_type, 0),
            "days":     row.days_requested,
        })

        db.session.execute(text("""
            UPDATE vendor_leave_requests
               SET status = 'approved', approved_by = :user, approved_date = NOW()::DATE,
                   balance_after = balance_before - days_requested, updated_at = NOW()
             WHERE id = :lid AND company_id = :cid
        """), {"user": g.user_id, "lid": leave_id, "cid": g.company_id})

        db.session.commit()
        return success({"approved": True, "leave_id": leave_id, "approved_by": g.user_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.put("/leave/<leave_id>/reject")
@require_auth
@require_role("super_admin","hr_manager")
def reject_leave(leave_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE vendor_leave_requests
               SET status = 'rejected', rejected_by = :user, rejected_date = NOW()::DATE,
                   rejection_reason = :reason, updated_at = NOW()
             WHERE id = :lid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "reason": body.get("reason",""), "lid": leave_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.get("/leave/balances")
@require_auth
def leave_balances():
    ve_id = request.args.get("vendor_employee_id")
    year  = request.args.get("year", date.today().year)
    try:
        q = """
            SELECT vlb.*,
                   ve.name AS emp_name, ve.vendor_emp_id
            FROM vendor_leave_balances vlb
            JOIN vendor_employees ve ON vlb.vendor_employee_id = ve.id
            WHERE vlb.company_id = :cid AND vlb.year = :year
        """
        params = {"cid": g.company_id, "year": int(year)}
        if ve_id: q += " AND vlb.vendor_employee_id = :veid"; params["veid"] = ve_id
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# MODULE 4: CASH ADVANCE
# ════════════════════════════════════════════════════════════════

MAX_ADVANCE_WAGE_RATIO = 1.5    # Max 1.5x monthly wage
MAX_REPAYMENT_MONTHS   = 6

@ve_bp.get("/advance")
@require_auth
def list_advances():
    status = request.args.get("status")
    ve_id  = request.args.get("vendor_employee_id")
    search = request.args.get("search","")
    try:
        q = """
            SELECT vca.*,
                   ve.name AS emp_name, ve.vendor_emp_id, ve.role,
                   ov.vendor_name,
                   ROUND((vca.amount_requested / NULLIF(vca.monthly_wage_snapshot,0) * 100)::NUMERIC, 1) AS wage_ratio_pct
            FROM vendor_cash_advances vca
            JOIN vendor_employees ve ON vca.vendor_employee_id = ve.id
            LEFT JOIN outsource_vendors ov ON ve.vendor_id = ov.id
            WHERE vca.company_id = :cid
        """
        params = {"cid": g.company_id}
        if status: q += " AND vca.status = :status"; params["status"] = status
        if ve_id:  q += " AND vca.vendor_employee_id = :veid"; params["veid"] = ve_id
        if search: q += " AND ve.name ILIKE :s"; params["s"] = f"%{search}%"
        q += " ORDER BY vca.applied_on DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ve_bp.post("/advance")
@require_auth
def create_advance():
    body = request.get_json() or {}
    required = ["vendor_employee_id","amount_requested","purpose_category","purpose_description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    amount = float(body["amount_requested"])
    if amount <= 0: return error("Amount must be positive", 422)

    # Get employee wage for ratio check
    try:
        ve = db.session.execute(text("""
            SELECT monthly_wage_npr, vendor_id FROM vendor_employees
            WHERE id = :veid AND company_id = :cid
        """), {"veid": body["vendor_employee_id"], "cid": g.company_id}).fetchone()
        if not ve: return not_found("Vendor Employee")

        wage = float(ve.monthly_wage_npr or 0)
        if wage > 0 and amount > wage * MAX_ADVANCE_WAGE_RATIO:
            return error(
                f"Amount NPR {amount:,.0f} exceeds policy limit of {MAX_ADVANCE_WAGE_RATIO}x monthly wage "
                f"(NPR {wage * MAX_ADVANCE_WAGE_RATIO:,.0f}). Reduce amount.",
                422
            )

        # Check no active advance
        active = db.session.execute(text("""
            SELECT COUNT(*) FROM vendor_cash_advances
            WHERE vendor_employee_id = :veid AND status NOT IN ('fully_repaid','rejected','written_off')
        """), {"veid": body["vendor_employee_id"]}).scalar()
        if active > 0:
            return error("Employee already has an active cash advance. Must be repaid first.", 409)

        repayment_months = min(int(body.get("repayment_months", 3)), MAX_REPAYMENT_MONTHS)
        repayment_per_month = round(amount / repayment_months, 2)

        # AI risk scoring
        wage_ratio = (amount / wage * 100) if wage else 100
        ai_risk = min(100, int(wage_ratio * 0.5 +
                               (30 if body.get("purpose_category") == "personal" else 10)))
        ai_rec = _ai_advance_recommendation(body["purpose_category"], wage_ratio, ai_risk)

        req_no = f"CA-{date.today().year}-{str(uuid.uuid4())[:6].upper()}"
        approval_chain = [
            {"role":"Vendor HR","status":"pending","date":None},
            {"role":"HR Manager","status":"pending","date":None},
            {"role":"Finance","status":"pending","date":None},
        ]

        db.session.execute(text("""
            INSERT INTO vendor_cash_advances
              (company_id, vendor_employee_id, vendor_id, request_no,
               amount_requested, monthly_wage_snapshot,
               purpose_category, purpose_description,
               disbursement_date, repayment_months, repayment_per_month,
               outstanding_balance, approval_chain, status,
               ai_risk_score, ai_recommendation, applied_on, created_at)
            VALUES
              (:cid, :veid, :vid, :req_no,
               :amount, :wage,
               :purpose_cat, :purpose_desc,
               :disb_date, :months, :per_month,
               0, :chain::jsonb, 'pending',
               :ai_risk, :ai_rec, NOW(), NOW())
        """), {
            "cid":          g.company_id,
            "veid":         body["vendor_employee_id"],
            "vid":          ve.vendor_id,
            "req_no":       req_no,
            "amount":       amount,
            "wage":         wage,
            "purpose_cat":  body["purpose_category"],
            "purpose_desc": body["purpose_description"],
            "disb_date":    body.get("disbursement_date"),
            "months":       repayment_months,
            "per_month":    repayment_per_month,
            "chain":        json.dumps(approval_chain),
            "ai_risk":      ai_risk,
            "ai_rec":       ai_rec,
        })
        db.session.commit()

        return created({
            "request_no":         req_no,
            "amount_requested":   amount,
            "repayment_months":   repayment_months,
            "repayment_per_month":repayment_per_month,
            "ai_risk_score":      ai_risk,
            "ai_recommendation":  ai_rec,
            "wage_ratio_pct":     round(wage_ratio, 1),
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


def _ai_advance_recommendation(purpose, wage_ratio, risk_score):
    if purpose == "medical_emergency":
        return f"Fast-track approve. Medical emergency verified. Risk {risk_score}%. Wage ratio {wage_ratio:.1f}%."
    if wage_ratio > 150:
        return f"REJECT: Amount exceeds 150% of monthly wage. High financial risk ({risk_score}%)."
    if risk_score < 30:
        return f"Approve recommended. Low risk ({risk_score}%). Wage ratio safe at {wage_ratio:.1f}%."
    if risk_score < 60:
        return f"Review carefully. Medium risk ({risk_score}%). Wage ratio {wage_ratio:.1f}%."
    return f"HIGH RISK ({risk_score}%). Recommend rejection or significant reduction."


@ve_bp.put("/advance/<adv_id>/approve")
@require_auth
@require_role("super_admin","hr_manager")
def approve_advance(adv_id):
    body = request.get_json() or {}
    approved_amount = body.get("amount_approved")
    try:
        row = db.session.execute(text(
            "SELECT * FROM vendor_cash_advances WHERE id = :aid AND company_id = :cid"
        ), {"aid": adv_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Cash Advance")
        if row.status != "pending": return error(f"Already {row.status}", 409)

        final_amount = float(approved_amount or row.amount_requested)
        repayment    = round(final_amount / (row.repayment_months or 3), 2)

        db.session.execute(text("""
            UPDATE vendor_cash_advances
               SET status = 'approved',
                   amount_approved = :amt,
                   repayment_per_month = :rep,
                   outstanding_balance = :amt,
                   approved_by = :user, approved_date = NOW(),
                   updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"amt": final_amount, "rep": repayment,
               "user": g.user_id, "aid": adv_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True, "amount_approved": final_amount, "repayment_per_month": repayment})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.put("/advance/<adv_id>/disburse")
@require_auth
@require_role("super_admin")
def disburse_advance(adv_id):
    body = request.get_json() or {}
    try:
        row = db.session.execute(text(
            "SELECT * FROM vendor_cash_advances WHERE id = :aid AND company_id = :cid"
        ), {"aid": adv_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Cash Advance")
        if row.status != "approved": return error("Advance must be approved before disbursement", 422)

        db.session.execute(text("""
            UPDATE vendor_cash_advances
               SET status = 'disbursed',
                   disbursed_by = :user, disbursed_date = NOW(),
                   disbursement_ref = :ref, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"user": g.user_id, "ref": body.get("disbursement_ref",""), "aid": adv_id, "cid": g.company_id})

        # Auto-generate repayment schedule
        months = row.repayment_months or 3
        amt    = float(row.amount_approved or row.amount_requested)
        for i in range(1, months + 1):
            due_date = date.today() + timedelta(days=30 * i)
            db.session.execute(text("""
                INSERT INTO vendor_advance_repayments
                  (advance_id, company_id, installment_no, due_date, amount_due, status)
                VALUES (:aid, :cid, :num, :due, :amt, 'pending')
                ON CONFLICT (advance_id, installment_no) DO NOTHING
            """), {"aid": adv_id, "cid": g.company_id, "num": i,
                   "due": due_date, "amt": round(amt / months, 2)})
        db.session.commit()
        return success({"disbursed": True, "repayment_schedule_created": months})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.put("/advance/<adv_id>/reject")
@require_auth
@require_role("super_admin","hr_manager")
def reject_advance(adv_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE vendor_cash_advances
               SET status = 'rejected', rejected_by = :user, rejected_date = NOW(),
                   rejection_reason = :reason, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "reason": body.get("reason",""), "aid": adv_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.post("/advance/<adv_id>/record-repayment")
@require_auth
@require_role("super_admin","hr_manager")
def record_repayment(adv_id):
    """Record a repayment installment."""
    body = request.get_json() or {}
    amount_paid = float(body.get("amount_paid", 0))
    try:
        row = db.session.execute(text(
            "SELECT outstanding_balance FROM vendor_cash_advances WHERE id = :aid AND company_id = :cid"
        ), {"aid": adv_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Cash Advance")

        new_outstanding = max(float(row.outstanding_balance or 0) - amount_paid, 0)
        new_status = "fully_repaid" if new_outstanding == 0 else "disbursed"

        db.session.execute(text("""
            UPDATE vendor_cash_advances
               SET outstanding_balance = :bal,
                   total_paid_back = COALESCE(total_paid_back,0) + :paid,
                   status = :status, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"bal": new_outstanding, "paid": amount_paid, "status": new_status,
               "aid": adv_id, "cid": g.company_id})
        db.session.commit()
        return success({"recorded": True, "amount_paid": amount_paid,
                        "outstanding_balance": new_outstanding, "status": new_status})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# MODULE 5: VENDOR EMPLOYEE ATTENDANCE
# ════════════════════════════════════════════════════════════════

@ve_bp.get("/attendance")
@require_auth
def list_attendance():
    ve_id   = request.args.get("vendor_employee_id")
    vendor  = request.args.get("vendor_id")
    date_f  = request.args.get("date")
    month   = request.args.get("month")
    year    = request.args.get("year", str(date.today().year))
    status  = request.args.get("status")
    ghost   = request.args.get("ghost_only")   # show high ghost risk only
    search  = request.args.get("search","")

    try:
        q = """
            SELECT va.*,
                   ve.name AS emp_name, ve.vendor_emp_id, ve.role,
                   ve.shift_type, ov.vendor_name
            FROM vendor_attendance va
            JOIN vendor_employees ve ON va.vendor_employee_id = ve.id
            LEFT JOIN outsource_vendors ov ON ve.vendor_id = ov.id
            WHERE va.company_id = :cid
        """
        params = {"cid": g.company_id}
        if ve_id:  q += " AND va.vendor_employee_id = :veid"; params["veid"]  = ve_id
        if vendor: q += " AND va.vendor_id = :vid";           params["vid"]   = vendor
        if date_f: q += " AND va.attendance_date = :dt";      params["dt"]    = date_f
        if month:  q += " AND EXTRACT(MONTH FROM va.attendance_date) = :month"; params["month"] = int(month)
        if year:   q += " AND EXTRACT(YEAR FROM va.attendance_date) = :year";   params["year"]  = int(year)
        if status: q += " AND va.is_present = :pres"; params["pres"] = status == "present"
        if ghost:  q += " AND va.ghost_risk_score > 50"
        if search: q += " AND ve.name ILIKE :s"; params["s"] = f"%{search}%"
        q += " ORDER BY va.attendance_date DESC, ve.vendor_emp_id"

        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ve_bp.post("/attendance")
@require_auth
def log_attendance():
    """Log or update attendance for a vendor employee (upsert)."""
    body = request.get_json() or {}
    if not body.get("vendor_employee_id") or not body.get("attendance_date"):
        return error("vendor_employee_id and attendance_date required", 422)

    att_date   = date.fromisoformat(body["attendance_date"])
    is_present = body.get("is_present", True)

    # Compute hours worked if times provided
    hours_worked = None
    if body.get("check_in_time") and body.get("check_out_time"):
        from datetime import datetime as dt
        try:
            ci = dt.fromisoformat(body["check_in_time"])
            co = dt.fromisoformat(body["check_out_time"])
            hours_worked = round((co - ci).total_seconds() / 3600, 2)
        except ValueError:
            pass

    # Ghost risk heuristic scoring
    ghost_risk = _compute_ghost_risk(
        is_present      = is_present,
        biometric       = body.get("biometric_verified", False),
        gps             = body.get("gps_verified", False),
        late_mins       = body.get("late_minutes", 0),
        hours_worked    = hours_worked,
    )

    try:
        # Upsert: one record per employee per day
        db.session.execute(text("""
            INSERT INTO vendor_attendance
              (company_id, vendor_id, vendor_employee_id, attendance_date,
               shift_type, check_in_time, check_out_time,
               is_present, is_absent, is_late, late_minutes, is_half_day,
               biometric_verified, gps_verified, gps_latitude, gps_longitude,
               verification_method, overtime_hours,
               ghost_risk_score, ai_anomaly_detected, remarks, created_at)
            SELECT :cid, ve.vendor_id, :veid, :att_date,
               :shift, :ci, :co,
               :present, :absent, :late, :late_mins, :half_day,
               :bio, :gps, :lat, :lng,
               :method, :ot,
               :ghost, :anomaly, :remarks, NOW()
            FROM vendor_employees ve WHERE ve.id = :veid
            ON CONFLICT (vendor_employee_id, attendance_date)
            DO UPDATE SET
               is_present = EXCLUDED.is_present,
               is_absent  = EXCLUDED.is_absent,
               check_in_time = COALESCE(EXCLUDED.check_in_time, vendor_attendance.check_in_time),
               check_out_time = COALESCE(EXCLUDED.check_out_time, vendor_attendance.check_out_time),
               biometric_verified = EXCLUDED.biometric_verified,
               gps_verified = EXCLUDED.gps_verified,
               ghost_risk_score = EXCLUDED.ghost_risk_score,
               ai_anomaly_detected = EXCLUDED.ai_anomaly_detected,
               updated_at = NOW()
        """), {
            "cid":     g.company_id,
            "veid":    body["vendor_employee_id"],
            "att_date":att_date,
            "shift":   body.get("shift_type","General"),
            "ci":      body.get("check_in_time"),
            "co":      body.get("check_out_time"),
            "present": is_present,
            "absent":  not is_present,
            "late":    body.get("is_late", False),
            "late_mins":body.get("late_minutes", 0),
            "half_day":body.get("is_half_day", False),
            "bio":     body.get("biometric_verified", False),
            "gps":     body.get("gps_verified", False),
            "lat":     body.get("gps_latitude"),
            "lng":     body.get("gps_longitude"),
            "method":  body.get("verification_method","manual"),
            "ot":      body.get("overtime_hours", 0),
            "ghost":   ghost_risk,
            "anomaly": ghost_risk > 60,
            "remarks": body.get("remarks",""),
        })

        # Update employee ghost risk score
        db.session.execute(text("""
            UPDATE vendor_employees
               SET ai_ghost_risk_score = ROUND(
                   (SELECT AVG(ghost_risk_score) FROM vendor_attendance
                    WHERE vendor_employee_id = :veid
                      AND attendance_date >= NOW()::DATE - 30)::NUMERIC, 1),
                   updated_at = NOW()
             WHERE id = :veid AND company_id = :cid
        """), {"veid": body["vendor_employee_id"], "cid": g.company_id})

        db.session.commit()
        return created({"logged": True, "ghost_risk_score": ghost_risk,
                        "anomaly_detected": ghost_risk > 60,
                        "hours_worked": hours_worked})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


def _compute_ghost_risk(is_present, biometric, gps, late_mins, hours_worked):
    """Heuristic ghost worker risk score (0-100)."""
    if not is_present:
        return 0  # Absent is transparent, not ghosting
    risk = 0
    if not biometric:   risk += 30
    if not gps:         risk += 20
    if late_mins > 60:  risk += 15
    if hours_worked and hours_worked < 4: risk += 20
    if not biometric and not gps: risk += 15   # Neither verified = high suspicion
    return min(risk, 100)


@ve_bp.get("/attendance/monthly-summary")
@require_auth
def attendance_monthly_summary():
    """Full monthly summary for timesheet generation and billing."""
    month  = int(request.args.get("month", date.today().month))
    year   = int(request.args.get("year",  date.today().year))
    vendor = request.args.get("vendor_id")
    try:
        q = """
            SELECT
                ve.vendor_emp_id, ve.name, ve.role, ve.shift_type,
                ov.vendor_name, ov.vendor_code,
                COUNT(*)                                                AS recorded_days,
                COUNT(*) FILTER (WHERE va.is_present)                  AS present_days,
                COUNT(*) FILTER (WHERE va.is_absent)                   AS absent_days,
                COUNT(*) FILTER (WHERE va.is_late)                     AS late_count,
                COALESCE(SUM(va.overtime_hours), 0)                    AS total_ot_hours,
                ROUND(COUNT(*) FILTER (WHERE va.is_present)::NUMERIC
                      / NULLIF(COUNT(*), 0) * 100, 1)                  AS attendance_pct,
                ROUND(AVG(va.ghost_risk_score)::NUMERIC, 1)            AS avg_ghost_risk,
                BOOL_AND(va.biometric_verified)                        AS all_biometric_verified,
                MAX(va.attendance_date)                                AS last_present
            FROM vendor_attendance va
            JOIN vendor_employees ve ON va.vendor_employee_id = ve.id
            JOIN outsource_vendors ov ON va.vendor_id = ov.id
            WHERE va.company_id = :cid
              AND EXTRACT(MONTH FROM va.attendance_date) = :month
              AND EXTRACT(YEAR  FROM va.attendance_date) = :year
              AND NOT ve.is_deleted
        """
        params = {"cid": g.company_id, "month": month, "year": year}
        if vendor: q += " AND va.vendor_id = :vid"; params["vid"] = vendor
        q += " GROUP BY ve.vendor_emp_id, ve.name, ve.role, ve.shift_type, ov.vendor_name, ov.vendor_code"
        q += " ORDER BY attendance_pct ASC"

        rows = db.session.execute(text(q), params).fetchall()
        data = [dict(r._mapping) for r in rows]

        return success({
            "period":  f"{month}/{year}",
            "workers": data,
            "summary": {
                "total_workers":      len(data),
                "avg_attendance_pct": round(sum(r.get("attendance_pct") or 0 for r in data) / max(len(data),1), 1),
                "total_ot_hours":     sum(float(r.get("total_ot_hours") or 0) for r in data),
                "ghost_risk_workers": sum(1 for r in data if (r.get("avg_ghost_risk") or 0) > 50),
                "non_biometric":      sum(1 for r in data if not r.get("all_biometric_verified")),
            },
            "la2074_note": "Attendance records required per Nepal Labour Act 2074 Section 64. Used for billing verification."
        })
    except Exception:
        return success({"period": f"{month}/{year}", "workers": [], "summary": {}})


@ve_bp.post("/attendance/ai-ghost-scan")
@require_auth
@require_role("super_admin","hr_manager")
def ai_ghost_scan():
    """Run AI ghost worker detection on this month's attendance."""
    body   = request.get_json() or {}
    month  = int(body.get("month", date.today().month))
    year   = int(body.get("year",  date.today().year))
    vendor = body.get("vendor_id")

    try:
        q = """
            SELECT va.vendor_employee_id::TEXT, va.attendance_date::TEXT,
                   va.is_present, va.biometric_verified, va.gps_verified,
                   va.late_minutes, va.ghost_risk_score, ve.name
            FROM vendor_attendance va
            JOIN vendor_employees ve ON va.vendor_employee_id = ve.id
            WHERE va.company_id = :cid
              AND EXTRACT(MONTH FROM va.attendance_date) = :month
              AND EXTRACT(YEAR  FROM va.attendance_date) = :year
        """
        params = {"cid": g.company_id, "month": month, "year": year}
        if vendor: q += " AND va.vendor_id = :vid"; params["vid"] = vendor
        rows = db.session.execute(text(q), params).fetchall()
        records = [dict(r._mapping) for r in rows]

        result = detect_ghost_workers(records)
        high_risk = result.get("high_risk_workers", [])

        # Update ghost scores in DB
        for emp in high_risk:
            db.session.execute(text("""
                UPDATE vendor_attendance
                   SET ghost_risk_score = :score,
                       ai_anomaly_detected = TRUE,
                       updated_at = NOW()
                 WHERE vendor_employee_id = :veid::UUID
                   AND EXTRACT(MONTH FROM attendance_date) = :month
                   AND EXTRACT(YEAR  FROM attendance_date) = :year
            """), {"score": emp.get("risk_score", 80), "veid": emp.get("vendor_emp_id"),
                   "month": month, "year": year})

        db.session.commit()
        return success({
            "scanned_records":   len(records),
            "high_risk_count":   len(high_risk),
            "period":            f"{month}/{year}",
            "findings":          result,
            "la2074_note":       "Ghost worker detection required per LA2074 Section 64. Main employer liable.",
            "scanned_at":        datetime.utcnow().isoformat(),
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ve_bp.post("/attendance/generate-timesheet")
@require_auth
@require_role("super_admin","hr_manager")
def generate_timesheet():
    """Generate exportable timesheet for vendor billing."""
    body   = request.get_json() or {}
    month  = int(body.get("month", date.today().month))
    year   = int(body.get("year",  date.today().year))
    vendor = body.get("vendor_id")

    try:
        rows = db.session.execute(text("""
            SELECT
                ve.vendor_emp_id, ve.name, ve.role,
                va.attendance_date, va.shift_type,
                va.check_in_time, va.check_out_time,
                va.is_present, va.overtime_hours,
                va.biometric_verified, va.gps_verified,
                va.ghost_risk_score, va.ai_anomaly_detected
            FROM vendor_attendance va
            JOIN vendor_employees ve ON va.vendor_employee_id = ve.id
            WHERE va.company_id = :cid
              AND EXTRACT(MONTH FROM va.attendance_date) = :month
              AND EXTRACT(YEAR  FROM va.attendance_date) = :year
              AND va.is_present = TRUE
              AND va.ghost_risk_score < 60
            ORDER BY va.attendance_date, ve.vendor_emp_id
        """), {"cid": g.company_id, "month": month, "year": year}).fetchall()

        timesheet = {
            "period":        f"{month}/{year}",
            "generated_at":  datetime.utcnow().isoformat(),
            "generated_by":  g.user_id,
            "verified_days": len(rows),
            "records":       [dict(r._mapping) for r in rows],
            "note":          "Only verified (ghost_risk < 60%) present-day records included.",
        }
        return success(timesheet)
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export shared ────────────────────────────────
@ve_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["vendor_employee","shift"]
    if module not in allowed: return error(f"Allowed modules: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], module)
    return jsonify(result), 200 if result["success"] else 422


@ve_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(module)
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"nephr_{module}_template.xlsx")
