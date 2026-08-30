"""
FILE: backend/routes/workforce_config_routes.py
REST API — Vendor Mapping, Shift Setup, Holiday Calendar, Weekend Policy
URL prefix: /api/v1/wfconfig
All endpoints: Auth-protected, Nepal Labour Act 2074 compliant.
"""
from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text, func
from datetime import datetime, date, time
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import paginate, success, error, created, not_found, apply_search, apply_filters
from ..utils.nepal_law import check_outsource_compliance, check_cba_required
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

wfc_bp = Blueprint("wfconfig", __name__, url_prefix="/api/v1/wfconfig")

# ── lazy model loader ─────────────────────────────────────────
def _m(n):
    from ..models.workforce_config_models import (
        OutsourceVendor, SLAContract, VendorEmployee
    )
    try:
        from ..models.shift_holiday_models import (
            ShiftType, HolidayCalendar, WeekendPolicy
        )
        return {"OutsourceVendor":OutsourceVendor,"SLAContract":SLAContract,
                "VendorEmployee":VendorEmployee,"ShiftType":ShiftType,
                "HolidayCalendar":HolidayCalendar,"WeekendPolicy":WeekendPolicy}[n]
    except (ImportError, KeyError):
        return {"OutsourceVendor":OutsourceVendor,"SLAContract":SLAContract,
                "VendorEmployee":VendorEmployee}[n]


# ═══════════════════════════════════════════════════════════════
# VENDOR & OUTSOURCE EMPLOYEE MAPPING
# ═══════════════════════════════════════════════════════════════

@wfc_bp.get("/vendor-mapping")
@require_auth
def list_vendor_mapping():
    """GET all vendor mappings with compliance status."""
    rows = db.session.execute(text("""
        SELECT
            ov.id, ov.vendor_code, ov.vendor_name, ov.vendor_name_nepali,
            ov.service_category, ov.moless_license_no, ov.moless_license_expiry,
            ov.is_licensed_agency, ov.contact_person, ov.contact_email, ov.contact_phone,
            ov.overall_performance_score, ov.overall_risk_level,
            ov.total_workers_deployed, ov.active_contracts_count, ov.status,
            COUNT(ve.id)                                          AS total_workers,
            COUNT(ve.id) FILTER (WHERE ve.status = 'active')     AS active_workers,
            COUNT(ve.id) FILTER (WHERE NOT ve.ssf_paid_current_month) AS ssf_issues,
            COUNT(ve.id) FILTER (WHERE NOT ve.insurance_active)  AS insurance_issues,
            COUNT(ve.id) FILTER (WHERE NOT ve.bg_verified)       AS bg_pending,
            COALESCE(SUM(vi.total_amount_npr),0)                 AS monthly_billing_npr
        FROM outsource_vendors ov
        LEFT JOIN vendor_employees ve ON ve.vendor_id = ov.id AND ve.status = 'active'
        LEFT JOIN vendor_invoices vi  ON vi.vendor_id = ov.id
            AND vi.invoice_period_month = EXTRACT(MONTH FROM NOW())::INT
            AND vi.invoice_period_year  = EXTRACT(YEAR  FROM NOW())::INT
        WHERE ov.company_id = :cid AND NOT ov.is_deleted
        GROUP BY ov.id
        ORDER BY ov.overall_performance_score DESC
    """), {"cid": g.company_id}).fetchall()

    data = []
    for r in rows:
        d = dict(r._mapping)
        # Nepal law compliance check
        compliance = check_outsource_compliance(
            is_licensed_agency  = d["is_licensed_agency"],
            license_expiry      = d["moless_license_expiry"],
            is_core_function    = False,  # assume non-core (verified at contract level)
            ssf_paid            = d["ssf_issues"] == 0,
            min_wage_paid       = True,
            insurance_provided  = d["insurance_issues"] == 0,
        )
        d["compliance_risk"]   = compliance["risk_level"]
        d["compliance_issues"] = compliance["issues_count"]
        d["compliance_ok"]     = compliance["compliant"]
        data.append(d)
    return success(data)


@wfc_bp.post("/vendor-mapping")
@require_auth
@require_role("super_admin", "hr_manager")
def create_vendor_mapping():
    """Map a new outsource vendor. MoLESS license mandatory."""
    body = request.get_json() or {}
    required = ["vendor_code", "vendor_name", "service_category", "moless_license_no"]
    missing  = [f for f in required if not body.get(f)]
    if missing:
        return error(f"Missing: {', '.join(missing)}", 422)

    if not body.get("moless_license_no"):
        return error(
            "MoLESS license number is mandatory per Nepal Labour Act 2074 Section 52. "
            "Using unlicensed agency = workers become direct company employees.",
            422
        )

    V = _m("OutsourceVendor")
    exists = db.session.query(V).filter_by(
        company_id=g.company_id, vendor_code=body["vendor_code"], is_deleted=False
    ).first()
    if exists:
        return error(f"Vendor code '{body['vendor_code']}' already exists", 409)

    v = V(
        company_id          = g.company_id,
        vendor_code         = body["vendor_code"].upper(),
        vendor_name         = body["vendor_name"],
        vendor_name_nepali  = body.get("vendor_name_nepali"),
        short_name          = body.get("short_name"),
        service_category    = body["service_category"],
        moless_license_no   = body["moless_license_no"],
        moless_license_expiry = date.fromisoformat(body["moless_license_expiry"]) if body.get("moless_license_expiry") else None,
        is_licensed_agency  = True,
        agency_pan          = body.get("agency_pan"),
        contact_person      = body.get("contact_person"),
        contact_email       = body.get("contact_email"),
        contact_phone       = body.get("contact_phone"),
        address             = body.get("address"),
        status              = "active",
        created_by          = g.user_id,
    )
    db.session.add(v)
    db.session.commit()
    return created(v.to_dict(), "Vendor mapped. MoLESS license verified.")


@wfc_bp.put("/vendor-mapping/<vendor_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_vendor_mapping(vendor_id):
    V = _m("OutsourceVendor")
    v = db.session.query(V).filter_by(id=vendor_id, company_id=g.company_id, is_deleted=False).first()
    if not v: return not_found("Vendor")
    body = request.get_json() or {}
    for k in ["vendor_name","vendor_name_nepali","service_category","moless_license_no",
               "moless_license_expiry","contact_person","contact_email","contact_phone",
               "address","status"]:
        if k in body:
            val = body[k]
            if k == "moless_license_expiry" and val:
                val = date.fromisoformat(val)
            setattr(v, k, val)
    db.session.commit()
    return success(v.to_dict())


@wfc_bp.delete("/vendor-mapping/<vendor_id>")
@require_auth
@require_role("super_admin")
def delete_vendor_mapping(vendor_id):
    V  = _m("OutsourceVendor")
    VE = _m("VendorEmployee")
    v  = db.session.query(V).filter_by(id=vendor_id, company_id=g.company_id, is_deleted=False).first()
    if not v: return not_found("Vendor")
    active_workers = db.session.query(func.count(VE.id)).filter_by(
        vendor_id=vendor_id, status="active", is_deleted=False
    ).scalar()
    if active_workers:
        return error(f"Cannot delete: {active_workers} active workers still mapped.", 409)
    v.is_deleted = True; v.deleted_at = datetime.utcnow()
    db.session.commit()
    return success({"deleted": True})


@wfc_bp.get("/vendor-mapping/<vendor_id>/compliance-check")
@require_auth
def vendor_compliance_check(vendor_id):
    """Full Nepal Labour Act 2074 compliance check for one vendor."""
    V = _m("OutsourceVendor")
    v = db.session.query(V).filter_by(id=vendor_id, company_id=g.company_id).first()
    if not v: return not_found("Vendor")

    workers = db.session.execute(text("""
        SELECT COUNT(*) FILTER (WHERE ssf_paid_current_month) AS ssf_ok,
               COUNT(*) FILTER (WHERE insurance_active)       AS ins_ok,
               COUNT(*) FILTER (WHERE monthly_wage_npr >= 15000) AS wage_ok,
               COUNT(*) AS total
        FROM vendor_employees WHERE vendor_id = :vid AND status = 'active'
    """), {"vid": vendor_id}).fetchone()

    result = check_outsource_compliance(
        is_licensed_agency = v.is_licensed_agency,
        license_expiry     = v.moless_license_expiry,
        is_core_function   = False,
        ssf_paid           = workers.ssf_ok == workers.total if workers.total else True,
        min_wage_paid      = workers.wage_ok == workers.total if workers.total else True,
        insurance_provided = workers.ins_ok  == workers.total if workers.total else True,
    )
    return success({"vendor_id": vendor_id, "vendor_name": v.vendor_name, **result})


@wfc_bp.post("/vendor-mapping/excel-import")
@require_auth
def vendor_excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "outsource_vendor")
    return jsonify(result), 200 if result["success"] else 422


@wfc_bp.get("/vendor-mapping/excel-template")
@require_auth
def vendor_excel_template():
    b = build_template_xlsx("outsource_vendor")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="vendor_mapping_template.xlsx")


# ═══════════════════════════════════════════════════════════════
# SHIFT SETUP
# ═══════════════════════════════════════════════════════════════

@wfc_bp.get("/shifts")
@require_auth
def list_shifts():
    rows = db.session.execute(text("""
        SELECT id, code, name, name_nepali, type, start_time, end_time,
               break_minutes, grace_minutes, working_hours,
               allowance_npr, night_premium_pct, weekend_ot_multiplier,
               dept_count, emp_count, description, la_note, color, icon, status
        FROM shift_types
        WHERE company_id = :cid AND NOT is_deleted
        ORDER BY type, code
    """), {"cid": g.company_id}).fetchall()
    return success([dict(r._mapping) for r in rows])


@wfc_bp.post("/shifts")
@require_auth
@require_role("super_admin", "hr_manager")
def create_shift():
    body = request.get_json() or {}
    required = ["code", "name", "type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    # Nepal Labour Act 2074 validation
    if body.get("working_hours") and float(body["working_hours"]) > 8:
        return error("Standard shift cannot exceed 8 hours per Labour Act 2074 Section 28. Extra hours are OT.", 422)

    if body.get("type") == "night" and not body.get("night_premium_pct"):
        return error("Night shift must have a premium % per Labour Act 2074 Section 32.", 422)

    db.session.execute(text("""
        INSERT INTO shift_types
          (company_id, code, name, name_nepali, type,
           start_time, end_time, break_minutes, grace_minutes, working_hours,
           allowance_npr, night_premium_pct, weekend_ot_multiplier,
           description, la_note, color, icon, status, created_by, created_at)
        VALUES
          (:cid, :code, :name, :nepali, :type,
           :start, :end, :break_m, :grace, :hours,
           :allowance, :night_pct, :ot_multi,
           :desc, :la_note, :color, :icon, 'active', :user, NOW())
        RETURNING id
    """), {
        "cid": g.company_id, "code": body["code"].upper(), "name": body["name"],
        "nepali": body.get("name_nepali",""), "type": body["type"],
        "start": body.get("start_time","09:00"), "end": body.get("end_time","18:00"),
        "break_m": body.get("break_minutes", 60), "grace": body.get("grace_minutes", 15),
        "hours": body.get("working_hours", 8),
        "allowance": body.get("allowance_npr", 0),
        "night_pct": body.get("night_premium_pct", 0),
        "ot_multi": body.get("weekend_ot_multiplier", 1.5),
        "desc": body.get("description",""), "la_note": body.get("la_note",""),
        "color": body.get("color","#64748b"), "icon": body.get("icon","⏰"),
        "user": g.user_id,
    })
    db.session.commit()
    return created({"message": "Shift created", "code": body["code"]})


@wfc_bp.put("/shifts/<shift_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_shift(shift_id):
    body = request.get_json() or {}
    allowed = ["name","name_nepali","type","start_time","end_time","break_minutes",
               "grace_minutes","working_hours","allowance_npr","night_premium_pct",
               "weekend_ot_multiplier","description","la_note","color","status"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("No fields to update", 400)

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["shift_id"]   = shift_id
    updates["company_id"] = g.company_id
    db.session.execute(text(
        f"UPDATE shift_types SET {set_clause}, updated_at = NOW() WHERE id = :shift_id AND company_id = :company_id"
    ), updates)
    db.session.commit()
    return success({"updated": True})


@wfc_bp.delete("/shifts/<shift_id>")
@require_auth
@require_role("super_admin")
def delete_shift(shift_id):
    db.session.execute(text("""
        UPDATE shift_types SET is_deleted = TRUE, deleted_at = NOW()
        WHERE id = :sid AND company_id = :cid
    """), {"sid": shift_id, "cid": g.company_id})
    db.session.commit()
    return success({"deleted": True})


@wfc_bp.get("/shifts/ai-conflict-check")
@require_auth
def shift_conflict_check():
    """AI detects scheduling conflicts across shifts."""
    rows = db.session.execute(text("""
        SELECT code, name, start_time, end_time, emp_count
        FROM shift_types WHERE company_id = :cid AND NOT is_deleted
    """), {"cid": g.company_id}).fetchall()
    shifts = [dict(r._mapping) for r in rows]
    insight = generate_ai_insights({"type":"shift_conflict_check","shifts":shifts})
    return success({"conflicts_analysis": insight, "shifts_checked": len(shifts)})


# ═══════════════════════════════════════════════════════════════
# HOLIDAY CALENDAR
# ═══════════════════════════════════════════════════════════════

@wfc_bp.get("/holidays")
@require_auth
def list_holidays():
    year  = request.args.get("year",  "2081")
    month = request.args.get("month")
    htype = request.args.get("type")

    q_filter = "WHERE company_id = :cid AND NOT is_deleted"
    params   = {"cid": g.company_id}
    if year:  q_filter += " AND year_bs = :year";  params["year"]  = year
    if month: q_filter += " AND month_bs = :month"; params["month"] = int(month)
    if htype: q_filter += " AND type = :htype";     params["htype"] = htype

    rows = db.session.execute(text(f"""
        SELECT id, name, name_nepali, date_bs, date_ad, type, category,
               region, applicable_to, is_paid, is_optional, color, created_at
        FROM holiday_calendar
        {q_filter}
        ORDER BY date_ad
    """), params).fetchall()
    return success([dict(r._mapping) for r in rows])


@wfc_bp.post("/holidays")
@require_auth
@require_role("super_admin", "hr_manager")
def create_holiday():
    body = request.get_json() or {}
    required = ["name", "date_ad", "type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    date_ad = date.fromisoformat(body["date_ad"])
    db.session.execute(text("""
        INSERT INTO holiday_calendar
          (company_id, name, name_nepali, date_bs, date_ad,
           type, category, region, applicable_to,
           is_paid, is_optional, color, year_bs, month_bs, created_by, created_at)
        VALUES
          (:cid, :name, :nepali, :date_bs, :date_ad,
           :type, :category, :region, :applicable,
           :paid, :optional, :color, :year_bs, :month_bs, :user, NOW())
    """), {
        "cid": g.company_id, "name": body["name"],
        "nepali": body.get("name_nepali",""), "date_bs": body.get("date_bs",""),
        "date_ad": date_ad, "type": body["type"],
        "category": body.get("category","national"), "region": body.get("region","Nepal"),
        "applicable": body.get("applicable_to","all"),
        "paid": body.get("is_paid", True), "optional": body.get("is_optional", False),
        "color": body.get("color","#dc2626"), "year_bs": body.get("date_bs","")[:4],
        "month_bs": body.get("date_bs","")[5:7] if body.get("date_bs") else "",
        "user": g.user_id,
    })
    db.session.commit()
    return created({"message": "Holiday added", "name": body["name"]})


@wfc_bp.put("/holidays/<holiday_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_holiday(holiday_id):
    body = request.get_json() or {}
    allowed = ["name","name_nepali","date_bs","date_ad","type","category","region",
               "applicable_to","is_paid","is_optional","color"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("Nothing to update", 400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"hid": holiday_id, "cid": g.company_id})
    db.session.execute(text(
        f"UPDATE holiday_calendar SET {set_clause}, updated_at = NOW() WHERE id = :hid AND company_id = :cid"
    ), updates)
    db.session.commit()
    return success({"updated": True})


@wfc_bp.delete("/holidays/<holiday_id>")
@require_auth
@require_role("super_admin")
def delete_holiday(holiday_id):
    db.session.execute(text("""
        UPDATE holiday_calendar SET is_deleted = TRUE
        WHERE id = :hid AND company_id = :cid
    """), {"hid": holiday_id, "cid": g.company_id})
    db.session.commit()
    return success({"deleted": True})


@wfc_bp.get("/holidays/summary")
@require_auth
def holidays_summary():
    """Summary stats for HolidayCalendarPage header."""
    rows = db.session.execute(text("""
        SELECT type, COUNT(*) AS cnt,
               COUNT(*) FILTER (WHERE is_optional) AS optional_cnt,
               COUNT(*) FILTER (WHERE is_paid)     AS paid_cnt
        FROM holiday_calendar
        WHERE company_id = :cid AND NOT is_deleted
        GROUP BY type
    """), {"cid": g.company_id}).fetchall()
    return success([dict(r._mapping) for r in rows])


# ═══════════════════════════════════════════════════════════════
# WEEKEND POLICY
# ═══════════════════════════════════════════════════════════════

@wfc_bp.get("/weekend-policies")
@require_auth
def list_weekend_policies():
    rows = db.session.execute(text("""
        SELECT id, code, name, name_nepali, country, region,
               work_days, weekend_days, half_day_days,
               ot_rate_saturday, ot_rate_sunday, ot_rate_holiday,
               is_default, status,
               assigned_branches, emp_count, la_note, color
        FROM weekend_policies
        WHERE company_id = :cid AND NOT is_deleted
        ORDER BY is_default DESC, name
    """), {"cid": g.company_id}).fetchall()
    return success([dict(r._mapping) for r in rows])


@wfc_bp.post("/weekend-policies")
@require_auth
@require_role("super_admin", "hr_manager")
def create_weekend_policy():
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name"):
        return error("code and name required", 422)

    work_days    = body.get("work_days", [1,2,3,4,5])
    weekend_days = body.get("weekend_days", [0,6])

    # Nepal law: min 1 rest day per week (Section 26)
    if len(weekend_days) == 0:
        return error("At least one rest day per week is mandatory per Labour Act 2074 Section 26.", 422)

    import json
    db.session.execute(text("""
        INSERT INTO weekend_policies
          (company_id, code, name, name_nepali, country, region,
           work_days, weekend_days, half_day_days,
           ot_rate_saturday, ot_rate_sunday, ot_rate_holiday,
           is_default, la_note, color, status, created_by, created_at)
        VALUES
          (:cid, :code, :name, :nepali, :country, :region,
           :work_days, :weekend_days, :half_days,
           :ot_sat, :ot_sun, :ot_hol,
           :is_default, :la_note, :color, 'active', :user, NOW())
    """), {
        "cid": g.company_id, "code": body["code"].upper(), "name": body["name"],
        "nepali": body.get("name_nepali",""), "country": body.get("country","Nepal"),
        "region": body.get("region",""),
        "work_days":    json.dumps(work_days),
        "weekend_days": json.dumps(weekend_days),
        "half_days":    json.dumps(body.get("half_day_days",[])),
        "ot_sat": body.get("ot_rate_saturday", 1.5),
        "ot_sun": body.get("ot_rate_sunday", 2.0),
        "ot_hol": body.get("ot_rate_holiday", 2.0),
        "is_default": body.get("is_default", False),
        "la_note": body.get("la_note",""),
        "color": body.get("color","#1e40af"),
        "user": g.user_id,
    })
    db.session.commit()
    return created({"message": "Weekend policy created", "code": body["code"]})


@wfc_bp.put("/weekend-policies/<policy_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_weekend_policy(policy_id):
    body = request.get_json() or {}
    allowed = ["name","name_nepali","country","region","work_days","weekend_days","half_day_days",
               "ot_rate_saturday","ot_rate_sunday","ot_rate_holiday","is_default","la_note","status","color"]
    updates = {}
    import json
    for k in allowed:
        if k not in body: continue
        val = body[k]
        if k in ("work_days","weekend_days","half_day_days") and isinstance(val, list):
            val = json.dumps(val)
        updates[k] = val
    if not updates: return error("Nothing to update", 400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"pid": policy_id, "cid": g.company_id})
    db.session.execute(text(
        f"UPDATE weekend_policies SET {set_clause}, updated_at = NOW() WHERE id = :pid AND company_id = :cid"
    ), updates)
    db.session.commit()
    return success({"updated": True})


@wfc_bp.delete("/weekend-policies/<policy_id>")
@require_auth
@require_role("super_admin")
def delete_weekend_policy(policy_id):
    # Cannot delete default policy
    row = db.session.execute(text(
        "SELECT is_default FROM weekend_policies WHERE id = :pid AND company_id = :cid"
    ), {"pid": policy_id, "cid": g.company_id}).fetchone()
    if not row: return not_found("Policy")
    if row.is_default:
        return error("Cannot delete the default weekend policy. Set another policy as default first.", 409)
    db.session.execute(text(
        "UPDATE weekend_policies SET is_deleted = TRUE WHERE id = :pid AND company_id = :cid"
    ), {"pid": policy_id, "cid": g.company_id})
    db.session.commit()
    return success({"deleted": True})


@wfc_bp.post("/weekend-policies/<policy_id>/assign-branch")
@require_auth
@require_role("super_admin","hr_manager")
def assign_policy_to_branch(policy_id):
    body = request.get_json() or {}
    if not body.get("branch_id"): return error("branch_id required", 422)
    # Deassign existing policy for this branch
    db.session.execute(text("""
        UPDATE weekend_policies
        SET assigned_branches = array_remove(assigned_branches, :bid)
        WHERE company_id = :cid
    """), {"bid": body["branch_id"], "cid": g.company_id})
    # Assign to new policy
    db.session.execute(text("""
        UPDATE weekend_policies
        SET assigned_branches = array_append(assigned_branches, :bid)
        WHERE id = :pid AND company_id = :cid
    """), {"bid": body["branch_id"], "pid": policy_id, "cid": g.company_id})
    db.session.commit()
    return success({"assigned": True, "policy_id": policy_id, "branch_id": body["branch_id"]})


# ── Excel import/export (shared) ──────────────────────────────
@wfc_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["shift","holiday","weekend_policy","outsource_vendor"]
    if module not in allowed: return error(f"Module must be one of: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], module)
    return jsonify(result), 200 if result["success"] else 422
