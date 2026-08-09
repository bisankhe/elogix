"""
FILE: backend/routes/attendance_processing_routes.py
NepHR Pro — Workforce Operations > Attendance Management >
Attendance Processing Module (5 pages)
URL prefix: /api/v1/attendance-processing

  1. /processing             — Attendance Processing (multi-source consolidation)
  2. /approval                  — Attendance Approval (unified batch-approval inbox)
  3. /payroll-generation            — Payroll Attendance Generation (zero-touch STP)
  4. /analytics                        — Attendance Analytics (Bradford Factor, anomalies)
  5. /reports                             — Attendance Reports (templates, scheduling)

Nepal Labour Act 2074: 8hr/48hr caps, OT 4hr/day-24hr/week at 1.5x,
Section 20 attendance register, annual Labour Audit requirement.
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

att_processing_bp = Blueprint("attendance_processing", __name__, url_prefix="/api/v1/attendance-processing")


# ════════════════════════════════════════════════════════════════
# 1. ATTENDANCE PROCESSING
# ════════════════════════════════════════════════════════════════

@att_processing_bp.get("/processing/today")
@require_auth
def processing_today():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_processing_batch_today WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "records": data,
            "processed_count": sum(1 for r in data if r["processed"]),
            "exception_count": sum(1 for r in data if r["exception_type"]),
        })
    except Exception:
        return success({"records": [], "processed_count": 0, "exception_count": 0})


@att_processing_bp.get("/processing/rules-config")
@require_auth
def get_rules_config():
    try:
        row = db.session.execute(text(
            "SELECT * FROM processing_rules_config WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        if not row:
            return success({"grace_period_minutes": 10, "rounding_rule": "nearest_15", "mandatory_break_minutes": 30})
        return success(dict(row._mapping))
    except Exception:
        return success({"grace_period_minutes": 10, "rounding_rule": "nearest_15", "mandatory_break_minutes": 30})


@att_processing_bp.put("/processing/rules-config")
@require_auth
@require_role("super_admin", "hr_manager")
def update_rules_config():
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            INSERT INTO processing_rules_config
              (company_id, grace_period_minutes, rounding_rule, mandatory_break_minutes, break_trigger_after_hours, updated_at)
            VALUES
              (:cid, :grace, :rounding, :break_min, :break_trigger, NOW())
            ON CONFLICT (company_id)
            DO UPDATE SET grace_period_minutes = EXCLUDED.grace_period_minutes, rounding_rule = EXCLUDED.rounding_rule,
                          mandatory_break_minutes = EXCLUDED.mandatory_break_minutes,
                          break_trigger_after_hours = EXCLUDED.break_trigger_after_hours, updated_at = NOW()
        """), {
            "cid": g.company_id, "grace": body.get("grace_period_minutes", 10),
            "rounding": body.get("rounding_rule", "nearest_15"), "break_min": body.get("mandatory_break_minutes", 30),
            "break_trigger": body.get("break_trigger_after_hours", 5),
        })
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. ATTENDANCE APPROVAL
# ════════════════════════════════════════════════════════════════

@att_processing_bp.get("/approval/queue")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_queue():
    """Unified inbox: missed-punch + overtime + regularization requests in one feed."""
    request_type = request.args.get("type")
    try:
        q = "SELECT * FROM v_unified_approval_queue WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if request_type: q += " AND request_type = :rtype"; params["rtype"] = request_type
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@att_processing_bp.post("/approval/batch-approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def batch_approve():
    """
    Approve multiple requests across different source tables in one call.
    Routes each ID to its correct source table based on request_type.
    """
    body = request.get_json() or {}
    items = body.get("items", [])  # [{"id": "...", "request_type": "missed_punch"}, ...]
    if not items: return error("items array required", 422)

    table_map = {
        "missed_punch": "missed_punch_requests",
        "overtime": "overtime_requests",
        "regularization": "attendance_regularization_requests",
    }
    approved, failed = [], []

    try:
        for item in items:
            table = table_map.get(item.get("request_type"))
            if not table:
                failed.append({"id": item.get("id"), "reason": "unknown request_type"})
                continue
            try:
                db.session.execute(text(
                    f"UPDATE {table} SET status = 'approved', decided_by = :user, updated_at = NOW() "
                    f"WHERE id = :rid AND company_id = :cid AND status = 'pending'"
                ), {"user": g.user_id, "rid": item["id"], "cid": g.company_id})
                approved.append(item["id"])
            except Exception as inner_e:
                failed.append({"id": item.get("id"), "reason": str(inner_e)})

        db.session.commit()
        return success({"approved": approved, "failed": failed})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. PAYROLL ATTENDANCE GENERATION
# ════════════════════════════════════════════════════════════════

@att_processing_bp.post("/payroll-generation/generate-batch")
@require_auth
@require_role("super_admin", "hr_manager")
def generate_batch():
    """
    Triggers the zero-touch STP batch. DB trigger auto-populates
    payroll_attendance_batch_items from daily_attendance_records +
    overtime_requests, flagging unresolved discrepancies.
    """
    body = request.get_json() or {}
    required = ["batch_period_start", "batch_period_end"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO payroll_attendance_batches (company_id, batch_period_start, batch_period_end, generated_by, created_at)
            VALUES (:cid, :start, :end, :user, NOW())
            ON CONFLICT (company_id, batch_period_start, batch_period_end) DO NOTHING
            RETURNING id
        """), {"cid": g.company_id, "start": body["batch_period_start"], "end": body["batch_period_end"], "user": g.user_id})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Batch already exists for this period."})
        return created({"batch_id": str(row[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@att_processing_bp.get("/payroll-generation/batches")
@require_auth
@require_role("super_admin", "hr_manager")
def list_batches():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_payroll_batch_readiness WHERE company_id = :cid ORDER BY batch_period_start DESC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@att_processing_bp.get("/payroll-generation/batches/<batch_id>/items")
@require_auth
@require_role("super_admin", "hr_manager")
def batch_items(batch_id):
    try:
        rows = db.session.execute(text("""
            SELECT pabi.*, e.first_name, e.last_name, e.employee_code
            FROM payroll_attendance_batch_items pabi
            JOIN employees e ON pabi.employee_id = e.id
            WHERE pabi.payroll_attendance_batch_id = :bid
        """), {"bid": batch_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@att_processing_bp.put("/payroll-generation/batches/<batch_id>/push")
@require_auth
@require_role("super_admin", "hr_manager")
def push_to_payroll(batch_id):
    """Blocked by DB trigger if any batch item has an unresolved discrepancy."""
    try:
        db.session.execute(text("""
            UPDATE payroll_attendance_batches SET status = 'pushed_to_payroll' WHERE id = :bid AND company_id = :cid
        """), {"bid": batch_id, "cid": g.company_id})
        db.session.commit()
        return success({"pushed": True})
    except Exception as e:
        db.session.rollback()
        return error(
            str(e) if "unresolved" not in str(e).lower()
            else str(e),
            422
        )


# ════════════════════════════════════════════════════════════════
# 4. ATTENDANCE ANALYTICS
# ════════════════════════════════════════════════════════════════

@att_processing_bp.get("/analytics/bradford-factor")
@require_auth
@require_role("super_admin", "hr_manager")
def bradford_factor():
    """Bradford Factor (S^2 x D) per employee — weights frequent short absences over one long absence."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_bradford_factor WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        for r in data:
            r["bradford_score"] = (r["absence_spells"] ** 2) * r["total_absent_days"]
        return success(data)
    except Exception:
        return success([])


@att_processing_bp.get("/analytics/department-summary")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def department_analytics():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_department_analytics WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@att_processing_bp.post("/analytics/detect-anomalies")
@require_auth
@require_role("super_admin", "hr_manager")
def detect_anomalies():
    """AI flags clock-in clustering (buddy-punching pattern) or drift trends."""
    try:
        insight = generate_ai_insights({
            "type": "attendance_anomaly_detection",
            "company_id": g.company_id,
        })
        return success({"anomalies": insight.get("anomalies", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 5. ATTENDANCE REPORTS
# ════════════════════════════════════════════════════════════════

@att_processing_bp.get("/reports/templates")
@require_auth
def list_templates():
    try:
        rows = db.session.execute(text("""
            SELECT * FROM report_templates WHERE is_active AND (company_id IS NULL OR company_id = :cid)
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@att_processing_bp.post("/reports/generate")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def generate_report():
    body = request.get_json() or {}
    required = ["template_key", "period_start", "period_end"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        template = db.session.execute(text(
            "SELECT id FROM report_templates WHERE template_key = :key AND is_active LIMIT 1"
        ), {"key": body["template_key"]}).fetchone()
        if not template: return not_found("Report template")

        result = db.session.execute(text("""
            INSERT INTO report_generation_log
              (company_id, template_id, period_start, period_end, department_filter, output_format,
               is_scheduled, schedule_cadence, delivery_emails, generated_by, generated_at)
            VALUES
              (:cid, :tid, :start, :end, :dept, :format,
               :scheduled, :cadence, :emails, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "tid": template.id, "start": body["period_start"], "end": body["period_end"],
            "dept": body.get("department_filter"), "format": body.get("output_format", "pdf"),
            "scheduled": body.get("is_scheduled", False), "cadence": body.get("schedule_cadence"),
            "emails": body.get("delivery_emails", []), "user": g.user_id,
        })
        report_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"report_id": report_id, "note": "Report queued for generation."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@att_processing_bp.get("/reports/recent")
@require_auth
def recent_reports():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_recent_reports WHERE company_id = :cid LIMIT 50"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@att_processing_bp.get("/reports/<report_id>/download")
@require_auth
def download_report(report_id):
    try:
        row = db.session.execute(text(
            "SELECT file_url FROM report_generation_log WHERE id = :rid AND company_id = :cid"
        ), {"rid": report_id, "cid": g.company_id}).fetchone()
        if not row or not row.file_url: return not_found("Report file")
        return success({"file_url": row.file_url})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@att_processing_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    allowed = ["processing", "approval", "payroll-generation", "analytics"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"attendance_processing_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"attendance_processing_{module}_template.xlsx")
