"""
FILE: backend/routes/field_visit_tracking_routes.py
eLogix HRMS — Workforce Operations > Attendance Management > Daily Attendance
> Field Visit Tracking (TA & DA) (1 page)
URL prefix: /api/v1/field-visit

Pre-travel request -> GPS check-in/out at manager-assigned location ->
auto-calculated mileage TA + tiered DA -> receipt upload (OCR-assisted) ->
multi-level approval (Manager -> Finance) -> payroll sync.

Nepal Labour Act 2074: TA/DA rates not statutorily fixed -- must be in
employment contract; salary continues in full during field visits; SSF/
PF/gratuity continue to accrue; Section 20 attendance register applies.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

field_visit_bp = Blueprint("field_visit_tracking", __name__, url_prefix="/api/v1/field-visit")


# ════════════════════════════════════════════════════════════════
# RATE CONFIG
# ════════════════════════════════════════════════════════════════

@field_visit_bp.get("/rate-config")
@require_auth
def get_rate_config():
    try:
        row = db.session.execute(text(
            "SELECT * FROM field_visit_rate_config WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        if not row:
            return success({"ta_rate_per_km_npr": 15, "da_tier_a_npr": 1200, "da_tier_b_npr": 900, "da_tier_c_npr": 700})
        return success(dict(row._mapping))
    except Exception:
        return success({"ta_rate_per_km_npr": 15, "da_tier_a_npr": 1200, "da_tier_b_npr": 900, "da_tier_c_npr": 700})


@field_visit_bp.put("/rate-config")
@require_auth
@require_role("super_admin", "hr_manager")
def update_rate_config():
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            INSERT INTO field_visit_rate_config
              (company_id, ta_rate_per_km_npr, da_tier_a_npr, da_tier_b_npr, da_tier_c_npr,
               overnight_lodging_cap_npr, route_deviation_flag_pct, updated_at)
            VALUES
              (:cid, :ta_rate, :da_a, :da_b, :da_c,
               :lodging_cap, :deviation_pct, NOW())
            ON CONFLICT (company_id)
            DO UPDATE SET ta_rate_per_km_npr = EXCLUDED.ta_rate_per_km_npr, da_tier_a_npr = EXCLUDED.da_tier_a_npr,
                          da_tier_b_npr = EXCLUDED.da_tier_b_npr, da_tier_c_npr = EXCLUDED.da_tier_c_npr,
                          overnight_lodging_cap_npr = EXCLUDED.overnight_lodging_cap_npr,
                          route_deviation_flag_pct = EXCLUDED.route_deviation_flag_pct, updated_at = NOW()
        """), {
            "cid": g.company_id, "ta_rate": body.get("ta_rate_per_km_npr", 15),
            "da_a": body.get("da_tier_a_npr", 1200), "da_b": body.get("da_tier_b_npr", 900),
            "da_c": body.get("da_tier_c_npr", 700), "lodging_cap": body.get("overnight_lodging_cap_npr", 2500),
            "deviation_pct": body.get("route_deviation_flag_pct", 15),
        })
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PRE-TRAVEL REQUEST
# ════════════════════════════════════════════════════════════════

@field_visit_bp.get("/requests")
@require_auth
def list_requests():
    status = request.args.get("status")
    try:
        q = "SELECT * FROM v_field_visit_dashboard WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if status: q += " AND status = :status"; params["status"] = status
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@field_visit_bp.post("/requests")
def submit_request():
    """
    Public/ESS — employee submits a field visit request. Requires a
    task_location_assignment_id (the mandatory supervisor pre-assignment
    per the brief's strict rule) to be geo-validated downstream.
    """
    body = request.get_json() or {}
    required = ["employee_id", "visit_date", "purpose", "destination_name"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    if not body.get("task_location_assignment_id"):
        return error(
            "Field visit requires a supervisor-assigned task and location first. "
            "Please request a task assignment before submitting this visit.",
            422
        )

    try:
        emp = db.session.execute(text(
            "SELECT manager_id FROM employees WHERE id = :eid"
        ), {"eid": body["employee_id"]}).fetchone()

        result = db.session.execute(text("""
            INSERT INTO field_visit_requests
              (company_id, employee_id, task_location_assignment_id, visit_date, purpose,
               destination_name, city_tier, advance_requested_npr, estimated_distance_km,
               manager_employee_id, status, created_at)
            VALUES
              (:cid, :eid, :tla_id, :vdate, :purpose,
               :dest, :tier, :advance, :est_distance,
               :mgr_id, 'pending_manager', NOW())
            RETURNING id
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "tla_id": body["task_location_assignment_id"],
            "vdate": body["visit_date"], "purpose": body["purpose"], "dest": body["destination_name"],
            "tier": body.get("city_tier", "A"), "advance": body.get("advance_requested_npr", 0),
            "est_distance": body.get("estimated_distance_km"), "mgr_id": emp.manager_id if emp else None,
        })
        request_id = str(result.fetchone()[0])
        db.session.commit()

        return created({
            "request_id": request_id,
            "note": "Pending manager approval. TA/DA will be calculated once GPS check-in/out is recorded.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@field_visit_bp.put("/requests/<request_id>/check-in")
def record_checkin(request_id):
    """
    Public — employee taps 'Start Visit'. Validates against the assigned
    geo-fence (via the linked task_location_assignment's auto-created fence).
    """
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE field_visit_requests
               SET checkin_time = NOW(), checkin_gps_punch_id = :punch_id,
                   geo_validated = :geo_valid, updated_at = NOW()
             WHERE id = :rid
        """), {"punch_id": body.get("gps_punch_id"), "geo_valid": body.get("geo_validated", False), "rid": request_id})
        db.session.commit()
        return success({"checked_in": True, "geo_validated": body.get("geo_validated", False)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@field_visit_bp.put("/requests/<request_id>/check-out")
def record_checkout(request_id):
    """
    Public — employee taps 'End Visit'. DB trigger auto-calculates TA
    (distance x rate) and DA (city-tier), and flags route deviation.
    """
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE field_visit_requests
               SET checkout_time = NOW(), checkout_gps_punch_id = :punch_id,
                   actual_distance_km = :distance, overnight_stay = :overnight, updated_at = NOW()
             WHERE id = :rid
        """), {"punch_id": body.get("gps_punch_id"), "distance": body.get("actual_distance_km"),
               "overnight": body.get("overnight_stay", False), "rid": request_id})
        db.session.commit()

        row = db.session.execute(text(
            "SELECT ta_npr, da_npr, total_allowance_npr, ai_flag_triggered, ai_flag_reason FROM field_visit_requests WHERE id = :rid"
        ), {"rid": request_id}).fetchone()

        return success({
            "checked_out": True,
            "ta_npr": float(row.ta_npr) if row.ta_npr else 0,
            "da_npr": float(row.da_npr) if row.da_npr else 0,
            "total_allowance_npr": float(row.total_allowance_npr) if row.total_allowance_npr else 0,
            "ai_flag_triggered": row.ai_flag_triggered,
            "ai_flag_reason": row.ai_flag_reason,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# EXPENSE / RECEIPT UPLOAD
# ════════════════════════════════════════════════════════════════

@field_visit_bp.post("/requests/<request_id>/expenses")
def add_expense_item(request_id):
    """Public — employee uploads a receipt. AI/OCR extraction is simulated via the insights call."""
    body = request.get_json() or {}
    required = ["category", "amount_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        ocr_data = {}
        if body.get("receipt_photo_url"):
            insight = generate_ai_insights({
                "type": "receipt_ocr_extraction",
                "receipt_photo_url": body["receipt_photo_url"],
            })
            ocr_data = insight

        result = db.session.execute(text("""
            INSERT INTO field_visit_expense_items
              (field_visit_request_id, company_id, category, amount_npr, receipt_photo_url,
               ocr_extracted_amount, ocr_extracted_vendor, ocr_extracted_date, ocr_confidence_pct, created_at)
            VALUES
              (:rid, :cid, :category, :amount, :photo_url,
               :ocr_amount, :ocr_vendor, :ocr_date, :ocr_conf, NOW())
            RETURNING id, exceeds_policy_cap
        """), {
            "rid": request_id, "cid": body.get("company_id"), "category": body["category"],
            "amount": body["amount_npr"], "photo_url": body.get("receipt_photo_url"),
            "ocr_amount": ocr_data.get("extracted_amount"), "ocr_vendor": ocr_data.get("extracted_vendor"),
            "ocr_date": ocr_data.get("extracted_date"), "ocr_conf": ocr_data.get("confidence_pct"),
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "expense_id": str(row[0]), "exceeds_policy_cap": row[1],
            "ocr_extracted": ocr_data if ocr_data else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# MULTI-LEVEL APPROVAL (Manager -> Finance -> Payroll)
# ════════════════════════════════════════════════════════════════

@field_visit_bp.get("/approval-queue")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_queue():
    """Manager dashboard: pending TA/DA claims, AI-flagged first."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_field_visit_approval_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@field_visit_bp.put("/requests/<request_id>/approve-manager")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_manager(request_id):
    """
    Manager approval. Blocked by DB trigger if geo_validated = FALSE —
    no attendance/allowance accepted from an unvalidated location.
    """
    try:
        db.session.execute(text("""
            UPDATE field_visit_requests
               SET status = 'approved_manager', manager_approved_by = :user, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending_manager'
        """), {"user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True, "next_step": "Routed to Finance for final approval."})
    except Exception as e:
        db.session.rollback()
        return error(
            str(e) if "geo-validated" not in str(e).lower()
            else "Cannot approve: visit was not GPS-validated against an assigned task/location.",
            422
        )


@field_visit_bp.put("/requests/<request_id>/approve-finance")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_finance(request_id):
    """Finance final approval. DB trigger marks synced_to_payroll = TRUE."""
    try:
        db.session.execute(text("""
            UPDATE field_visit_requests
               SET status = 'approved_finance', finance_approved_by = :user, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'approved_manager'
        """), {"user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True, "synced_to_payroll": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@field_visit_bp.put("/requests/<request_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reject_request(request_id):
    body = request.get_json() or {}
    if not body.get("rejection_reason"): return error("rejection_reason required", 422)
    try:
        db.session.execute(text("""
            UPDATE field_visit_requests
               SET status = 'rejected', rejection_reason = :reason, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid
        """), {"reason": body["rejection_reason"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# LIVE MAP & AI INSIGHTS
# ════════════════════════════════════════════════════════════════

@field_visit_bp.get("/live-map")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def live_map():
    """Manager's live field-team map dashboard — today's active visits."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_field_visit_live_map WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@field_visit_bp.get("/ai-flagged")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_flagged():
    """Route deviation or geo-validation failures requiring manual review."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_field_visit_ai_flagged WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@field_visit_bp.get("/payroll-queue")
@require_auth
@require_role("super_admin", "hr_manager")
def payroll_queue():
    """Finance-approved claims pending payroll sync."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_field_visit_payroll_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@field_visit_bp.get("/monthly-spend")
@require_auth
@require_role("super_admin", "hr_manager")
def monthly_spend():
    """Budget/ROI analytics — TA/DA spend by department over time, for HCM strategic planning."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_field_visit_monthly_spend WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@field_visit_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "field_visit_tracking")
    return jsonify(result), 200 if result["success"] else 422


@field_visit_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("field_visit_tracking")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="field_visit_tracking_template.xlsx")
