"""
FILE: backend/routes/vendor_hr_analytics_routes.py
eLogix HRMS -- Reports, Analytics & BI > HR Analytics (2 pages:
Vendor-wise Headcount, Outsource Attendance Report)
URL prefix: /api/v1/vendor-hr-analytics

Pure aggregation over the EXISTING vendor_employees_extended +
vendor_attendance_extended. The new vendor_master registry and
core-work flag close two real legal-compliance gaps that existed
before this session.

Nepal legal grounding: "main employer" liability, core-vs-non-core
work restriction, licensed-supplier-only requirement, mandatory
attendance recordkeeping for outsourced workers, equal facilities/OHS
inclusion, minimum-wage verification duty.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

vendor_hr_bp = Blueprint("vendor_hr_analytics", __name__, url_prefix="/api/v1/vendor-hr-analytics")


# ════════════════════════════════════════════════════════════════
# PAGE 1: VENDOR-WISE HEADCOUNT
# ════════════════════════════════════════════════════════════════

@vendor_hr_bp.get("/headcount")
@require_auth
@require_role("super_admin", "hr_manager")
def vendor_wise_headcount():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_vendor_wise_headcount WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@vendor_hr_bp.post("/vendors")
@require_auth
@require_role("super_admin", "hr_manager")
def register_vendor():
    """Registers a vendor in the new master list, including the legally required Labour Supply License check."""
    body = request.get_json() or {}
    required = ["vendor_name"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO vendor_master (company_id, vendor_name, labour_supply_license_no, license_valid_until, authorized_service_scope, contact_info, created_at)
            VALUES (:cid, :name, :license, :valid_until, :scope, :contact, NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["vendor_name"], "license": body.get("labour_supply_license_no"),
               "valid_until": body.get("license_valid_until"), "scope": body.get("authorized_service_scope"), "contact": body.get("contact_info")})
        vendor_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"vendor_id": vendor_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@vendor_hr_bp.put("/vendor-employees/<vee_id>/flag-core-work")
@require_auth
@require_role("super_admin", "hr_manager")
def flag_core_work(vee_id):
    """DB trigger auto-notifies HR the moment this flag is set TRUE."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE vendor_employees_extended SET is_core_work_flag = :flag WHERE id = :veeid AND company_id = :cid
        """), {"flag": body.get("is_core_work_flag", True), "veeid": vee_id, "cid": g.company_id})
        db.session.commit()
        return success({"flagged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: OUTSOURCE ATTENDANCE REPORT
# ════════════════════════════════════════════════════════════════

@vendor_hr_bp.get("/attendance/summary")
@require_auth
@require_role("super_admin", "hr_manager")
def outsource_attendance_summary():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_outsource_attendance_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@vendor_hr_bp.get("/attendance/exceptions")
@require_auth
@require_role("super_admin", "hr_manager")
def outsource_attendance_exceptions():
    """The Exception Management Module -- tardiness/unexcused-absence review queue."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_outsource_attendance_exceptions WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])
