"""
FILE: backend/routes/insource_outsource_attendance_routes.py
eLogix HRMS — Workforce Operations > Attendance Management > Daily Attendance
> Insource / Outsource Attendance (2 pages)
URL prefix: /api/v1/insource-outsource-attendance

  1. /insource          — direct/permanent employees (filtered view over
                           existing daily_attendance_records, zero duplication)
  2. /outsource             — vendor-supplied staff (new sync + dispute tables)

Nepal Labour Act 2074: outsourced staff restricted to non-core functions;
main employer retains legal duty to maintain attendance records for
outsourced personnel even though a vendor operates them; 8hr/48hr caps,
30-min mandatory break, OT at 1.5x apply equally to both employment models.
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

io_att_bp = Blueprint("insource_outsource_attendance", __name__, url_prefix="/api/v1/insource-outsource-attendance")


# ════════════════════════════════════════════════════════════════
# 1. INSOURCE ATTENDANCE (reads existing daily_attendance_records)
# ════════════════════════════════════════════════════════════════

@io_att_bp.get("/insource")
@require_auth
def list_insource_attendance():
    department_id = request.args.get("department_id")
    att_date = request.args.get("date")
    try:
        q = "SELECT * FROM v_insource_attendance_log WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if department_id: q += " AND department_name = :dept"; params["dept"] = department_id
        if att_date: q += " AND attendance_date = :date"; params["date"] = att_date
        q += " ORDER BY attendance_date DESC LIMIT 200"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@io_att_bp.get("/insource/statutory-summary")
@require_auth
@require_role("super_admin", "hr_manager")
def insource_statutory_summary():
    """30-day rolling: night duties, holidays worked, OT, break violations — direct employees only."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_insource_statutory_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 2. OUTSOURCE ATTENDANCE (vendor sync + dispute tracker)
# ════════════════════════════════════════════════════════════════

@io_att_bp.get("/outsource/today")
@require_auth
def outsource_today():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_outsource_attendance_today WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "records": data,
            "synced_count": sum(1 for r in data if r["sync_status"] == "synced"),
            "discrepancy_count": sum(1 for r in data if r["sync_status"] == "discrepancy"),
            "pending_count": sum(1 for r in data if r["sync_status"] == "pending_sync"),
        })
    except Exception:
        return success({"records": [], "synced_count": 0, "discrepancy_count": 0, "pending_count": 0})


@io_att_bp.post("/outsource/sync")
def sync_vendor_attendance():
    """
    Public — vendor's API webhook pushes a daily attendance record.
    DB trigger auto-detects variance (e.g. missing checkout) and
    auto-creates a dispute ticket if flagged.
    """
    body = request.get_json() or {}
    required = ["vendor_employee_id", "vendor_id", "attendance_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO outsource_attendance_sync
              (company_id, vendor_employee_id, vendor_id, attendance_date,
               login_time, logout_time, location_name, latitude, longitude,
               geo_validated, sync_source, sync_status, synced_at, vendor_raw_payload, created_at)
            VALUES
              (:cid, :ve_id, :v_id, :adate,
               :login, :logout, :loc, :lat, :lng,
               :geo_valid, :source, 'synced', NOW(), :payload::jsonb, NOW())
            ON CONFLICT (vendor_employee_id, attendance_date)
            DO UPDATE SET login_time = EXCLUDED.login_time, logout_time = EXCLUDED.logout_time,
                          location_name = EXCLUDED.location_name, geo_validated = EXCLUDED.geo_validated,
                          synced_at = NOW(), vendor_raw_payload = EXCLUDED.vendor_raw_payload, updated_at = NOW()
            RETURNING id, sync_status, variance_flag
        """), {
            "cid": body.get("company_id"), "ve_id": body["vendor_employee_id"], "v_id": body["vendor_id"],
            "adate": body["attendance_date"], "login": body.get("login_time"), "logout": body.get("logout_time"),
            "loc": body.get("location_name"), "lat": body.get("latitude"), "lng": body.get("longitude"),
            "geo_valid": body.get("geo_validated", False), "source": body.get("sync_source", "vendor_api"),
            "payload": json.dumps(body.get("raw_payload", {})),
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "sync_id": str(row[0]), "sync_status": row[1],
            "variance_detected": row[2],
            "note": "Variance auto-flagged and a dispute ticket created." if row[2] else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@io_att_bp.put("/outsource/<sync_id>/manual-entry")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def manual_outsource_entry(sync_id):
    """HR manually records/corrects an outsource attendance entry when vendor sync is unavailable."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE outsource_attendance_sync
               SET login_time = :login, logout_time = :logout, sync_source = 'manual_entry',
                   sync_status = 'pending_sync', updated_at = NOW()
             WHERE id = :sid AND company_id = :cid
        """), {"login": body.get("login_time"), "logout": body.get("logout_time"),
               "sid": sync_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@io_att_bp.post("/outsource/<sync_id>/re-sync")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def resync_outsource_record(sync_id):
    """Manually re-trigger a sync attempt with the vendor's API (placeholder for actual integration call)."""
    try:
        db.session.execute(text("""
            UPDATE outsource_attendance_sync SET sync_status = 'pending_sync', updated_at = NOW()
            WHERE id = :sid AND company_id = :cid
        """), {"sid": sync_id, "cid": g.company_id})
        db.session.commit()
        return success({"resync_triggered": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Dispute / Variance Tracker ──
@io_att_bp.get("/outsource/disputes")
@require_auth
@require_role("super_admin", "hr_manager")
def open_disputes():
    """Automated Inquiry module — connects employee, internal HR, and external vendor."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_outsource_open_disputes WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@io_att_bp.post("/outsource/disputes")
def raise_dispute():
    """Public — employee or vendor can raise a dispute on an attendance sync record."""
    body = request.get_json() or {}
    required = ["outsource_attendance_sync_id", "vendor_id", "raised_by", "description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO outsource_attendance_disputes
              (company_id, outsource_attendance_sync_id, vendor_id, raised_by, raised_by_user_id,
               dispute_category, description, created_at)
            VALUES
              (:cid, :sync_id, :vendor_id, :raised_by, :user_id,
               :category, :description, NOW())
            RETURNING id
        """), {
            "cid": body.get("company_id"), "sync_id": body["outsource_attendance_sync_id"],
            "vendor_id": body["vendor_id"], "raised_by": body["raised_by"], "user_id": body.get("raised_by_user_id"),
            "category": body.get("dispute_category", "time_discrepancy"), "description": body["description"],
        })
        dispute_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"dispute_id": dispute_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@io_att_bp.put("/outsource/disputes/<dispute_id>/respond")
@require_auth
@require_role("super_admin", "hr_manager")
def respond_to_dispute(dispute_id):
    """Vendor or internal HR responds to a dispute."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE outsource_attendance_disputes
               SET vendor_response = :response, status = 'vendor_responded', updated_at = NOW()
             WHERE id = :did AND company_id = :cid
        """), {"response": body.get("vendor_response", ""), "did": dispute_id, "cid": g.company_id})
        db.session.commit()
        return success({"responded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@io_att_bp.put("/outsource/disputes/<dispute_id>/resolve")
@require_auth
@require_role("super_admin", "hr_manager")
def resolve_dispute(dispute_id):
    body = request.get_json() or {}
    if not body.get("resolution_notes"): return error("resolution_notes required", 422)
    try:
        db.session.execute(text("""
            UPDATE outsource_attendance_disputes
               SET status = 'resolved', resolution_notes = :notes, resolved_by = :user,
                   resolved_at = NOW(), updated_at = NOW()
             WHERE id = :did AND company_id = :cid
        """), {"notes": body["resolution_notes"], "user": g.user_id, "did": dispute_id, "cid": g.company_id})
        db.session.commit()
        return success({"resolved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Ghost-Employee Risk Report ──
@io_att_bp.get("/outsource/ghost-risk-report")
@require_auth
@require_role("super_admin", "hr_manager")
def ghost_risk_report():
    """Vendors with repeated unvalidated/discrepant attendance — flags potential ghost employees."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_ghost_employee_risk_report WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@io_att_bp.post("/outsource/ai-variance-check")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_variance_check():
    """AI cross-checks vendor-reported hours against SLA/contract terms and historical patterns."""
    body = request.get_json() or {}
    try:
        insight = generate_ai_insights({
            "type": "outsource_attendance_variance_analysis",
            "vendor_id": body.get("vendor_id"),
            "period_days": body.get("period_days", 30),
        })
        return success({
            "anomalies_detected": insight.get("anomalies", []),
            "sla_compliance_pct": insight.get("sla_compliance_pct", 100),
            "recommendation": insight.get("recommendation", "No action needed."),
        })
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@io_att_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["insource", "outsource"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"io_attendance_{module}")
    return jsonify(result), 200 if result["success"] else 422


@io_att_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"io_attendance_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"insource_outsource_{module}_template.xlsx")
