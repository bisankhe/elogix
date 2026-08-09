"""
FILE: backend/routes/leave_reports_routes.py
NepHR Pro - Workforce Operations > Leave Management > Leave Reports (3 pages)
URL prefix: /api/v1/leave-reports

  1. /sync           - Leave & Attendance Sync (bidirectional conflict detection)
  2. /analytics          - Leave Analytics (Bradford Factor, burnout/PTO-hoarding)
  3. /reports, /jurisdictions, /reminders  - Leave Reports (multi-jurisdiction,
                              automatic reminders, self-service progress)

Multi-jurisdiction compliance: Nepal, India, USA, UK, EU, Australia,
Singapore/Asia, UAE/Gulf -- statutory accrual caps and encashment limits
vary by region and are pre-seeded in jurisdiction_compliance_config.
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

leave_reports_bp = Blueprint("leave_reports", __name__, url_prefix="/api/v1/leave-reports")


# ════════════════════════════════════════════════════════════════
# 1. LEAVE & ATTENDANCE SYNC
# ════════════════════════════════════════════════════════════════

@leave_reports_bp.get("/sync/feed")
@require_auth
def sync_feed():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leave_attendance_sync_feed WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "feed": data,
            "conflict_count": sum(1 for r in data if r["sync_state"] == "conflict"),
            "exception_count": sum(1 for r in data if r["sync_state"] == "exception"),
        })
    except Exception:
        return success({"feed": [], "conflict_count": 0, "exception_count": 0})


@leave_reports_bp.post("/sync/run-check")
@require_auth
@require_role("super_admin", "hr_manager")
def run_sync_check():
    """
    Triggers the daily sync check for a given date across all employees.
    DB trigger auto-classifies matched/conflict/exception per employee.
    """
    body = request.get_json() or {}
    sync_date = body.get("sync_date", date.today().isoformat())
    try:
        employees = db.session.execute(text(
            "SELECT id FROM employees WHERE company_id = :cid AND employment_status = 'active'"
        ), {"cid": g.company_id}).fetchall()

        created_count = 0
        for emp in employees:
            db.session.execute(text("""
                INSERT INTO leave_attendance_sync_log (company_id, employee_id, sync_date, created_at)
                VALUES (:cid, :eid, :sdate, NOW())
                ON CONFLICT (employee_id, sync_date) DO NOTHING
            """), {"cid": g.company_id, "eid": emp.id, "sdate": sync_date})
            created_count += 1
        db.session.commit()
        return success({"checked_count": created_count, "sync_date": sync_date})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_reports_bp.put("/sync/<entry_id>/resolve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def resolve_sync_conflict(entry_id):
    try:
        db.session.execute(text("""
            UPDATE leave_attendance_sync_log
               SET resolved = TRUE, resolved_by = :user, resolved_at = NOW()
             WHERE id = :eid AND company_id = :cid
        """), {"user": g.user_id, "eid": entry_id, "cid": g.company_id})
        db.session.commit()
        return success({"resolved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. LEAVE ANALYTICS
# ════════════════════════════════════════════════════════════════

@leave_reports_bp.get("/analytics/bradford-by-department")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def bradford_by_department():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_bradford_factor_by_dept WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_reports_bp.get("/analytics/burnout-pto-flags")
@require_auth
@require_role("super_admin", "hr_manager")
def burnout_pto_flags():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_burnout_pto_review_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_reports_bp.post("/analytics/run-detection")
@require_auth
@require_role("super_admin", "hr_manager")
def run_burnout_detection():
    """AI scans leave patterns for hoarding/burnout signatures and writes flags."""
    try:
        insight = generate_ai_insights({"type": "burnout_pto_detection", "company_id": g.company_id})
        flags = insight.get("flags", [])
        for f in flags:
            db.session.execute(text("""
                INSERT INTO pto_hoarding_burnout_flags (company_id, employee_id, flag_type, detail_note, risk_level, flagged_at)
                VALUES (:cid, :eid, :ftype, :note, :risk, NOW())
                ON CONFLICT (employee_id, flag_type) DO UPDATE SET detail_note = EXCLUDED.detail_note, risk_level = EXCLUDED.risk_level
            """), {"cid": g.company_id, "eid": f.get("employee_id"), "ftype": f.get("flag_type"),
                   "note": f.get("detail_note"), "risk": f.get("risk_level", "medium")})
        db.session.commit()
        return success({"flags_created": len(flags)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_reports_bp.put("/analytics/flags/<flag_id>/schedule-checkin")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def schedule_checkin(flag_id):
    try:
        db.session.execute(text("""
            UPDATE pto_hoarding_burnout_flags SET flagged_for_checkin = TRUE WHERE id = :fid AND company_id = :cid
        """), {"fid": flag_id, "cid": g.company_id})
        db.session.commit()
        return success({"checkin_scheduled": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_reports_bp.post("/analytics/forecast-cost")
@require_auth
@require_role("super_admin", "hr_manager")
def forecast_absenteeism_cost():
    """AI predicts seasonal staffing shortages and the cost of unscheduled absence."""
    try:
        insight = generate_ai_insights({"type": "absenteeism_cost_forecast", "company_id": g.company_id})
        return success({
            "unscheduled_absence_cost_npr": insight.get("unscheduled_absence_cost_npr", 0),
            "ot_coverage_cost_npr": insight.get("ot_coverage_cost_npr", 0),
            "lost_productivity_days": insight.get("lost_productivity_days", 0),
            "seasonal_spike_forecast": insight.get("seasonal_spike_forecast", []),
        })
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. LEAVE REPORTS (multi-jurisdiction, reminders, self-service)
# ════════════════════════════════════════════════════════════════

@leave_reports_bp.get("/jurisdictions")
def list_jurisdictions():
    """Public - returns the supported compliance jurisdictions for the report builder dropdown."""
    try:
        rows = db.session.execute(text("SELECT * FROM jurisdiction_compliance_config")).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_reports_bp.get("/templates")
@require_auth
def list_templates():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leave_report_templates_catalog WHERE company_id IS NULL OR company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_reports_bp.post("/generate")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def generate_report():
    """
    Generates a jurisdiction-aware leave report. If scheduled, also marks
    reminder_sent_on_generation per the brief's automatic reminder requirement.
    """
    body = request.get_json() or {}
    required = ["template_key", "period_start", "period_end"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        template = db.session.execute(text(
            "SELECT id, is_jurisdiction_aware FROM leave_report_templates WHERE template_key = :key AND is_active LIMIT 1"
        ), {"key": body["template_key"]}).fetchone()
        if not template: return not_found("Report template")

        if template.is_jurisdiction_aware and not body.get("jurisdiction_code"):
            return error("jurisdiction_code required for this template", 422)

        result = db.session.execute(text("""
            INSERT INTO leave_report_generation_log
              (company_id, template_id, jurisdiction_code, period_start, period_end, department_filter,
               output_format, is_scheduled, schedule_cadence, delivery_emails, reminder_sent_on_generation, generated_by, generated_at)
            VALUES
              (:cid, :tid, :jcode, :start, :end, :dept,
               :format, :scheduled, :cadence, :emails, :reminder_sent, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "tid": template.id, "jcode": body.get("jurisdiction_code"),
            "start": body["period_start"], "end": body["period_end"], "dept": body.get("department_filter"),
            "format": body.get("output_format", "pdf"), "scheduled": body.get("is_scheduled", False),
            "cadence": body.get("schedule_cadence"), "emails": body.get("delivery_emails", []),
            "reminder_sent": bool(body.get("is_scheduled")), "user": g.user_id,
        })
        report_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"report_id": report_id, "note": "Report queued for generation."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_reports_bp.get("/recent")
@require_auth
def recent_reports():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_recent_leave_reports WHERE company_id = :cid LIMIT 50"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Automatic Reminders (brief: "Send automatic Reminders within processes and tasks") ──
@leave_reports_bp.get("/reminders")
@require_auth
@require_role("super_admin", "hr_manager")
def list_reminder_rules():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM leave_reminder_rules WHERE company_id = :cid AND is_active"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_reports_bp.put("/reminders/<rule_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_reminder_rule(rule_id):
    body = request.get_json() or {}
    allowed = ["action_description", "notify_channels", "is_active", "trigger_threshold_hours"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("No valid fields provided", 400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"rid": rule_id, "cid": g.company_id})
    try:
        db.session.execute(text(
            f"UPDATE leave_reminder_rules SET {set_clause}, updated_at = NOW() WHERE id = :rid AND company_id = :cid"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Self-Service Progress & Benefits ──
@leave_reports_bp.get("/my-progress/<employee_id>")
def my_progress(employee_id):
    """Public/ESS - self-service tracker of leave usage and benefits enrollment."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_my_leave_progress WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()
        return success(dict(row._mapping) if row else {"leave_used_pct": 0})
    except Exception:
        return success({"leave_used_pct": 0})


@leave_reports_bp.post("/qr-scan-lookup")
@require_auth
def qr_scan_lookup():
    """
    Manager/HR scans an employee's QR badge (qr_codes table, qr_type =
    'employee_badge') to instantly pull up that employee's leave report,
    balances, and pending requests -- no manual employee search needed.
    """
    body = request.get_json() or {}
    if not body.get("qr_payload"): return error("qr_payload required", 422)
    try:
        qr = db.session.execute(text("""
            SELECT employee_id FROM qr_codes
            WHERE qr_payload = :payload AND qr_type = 'employee_badge' AND is_active
        """), {"payload": body["qr_payload"]}).fetchone()

        if not qr: return error("Invalid or inactive employee QR badge.", 404)

        db.session.execute(text("""
            INSERT INTO qr_scan_log (qr_code_id, company_id, scanned_by, scan_purpose, scan_result, scanned_at)
            SELECT id, company_id, :scanner, 'leave_report_lookup', 'success', NOW()
            FROM qr_codes WHERE qr_payload = :payload
        """), {"scanner": g.user_id, "payload": body["qr_payload"]})

        progress = db.session.execute(text(
            "SELECT * FROM v_my_leave_progress WHERE employee_id = :eid"
        ), {"eid": qr.employee_id}).fetchone()

        sync_issues = db.session.execute(text(
            "SELECT COUNT(*) AS cnt FROM leave_attendance_sync_log WHERE employee_id = :eid AND sync_state != 'matched'"
        ), {"eid": qr.employee_id}).fetchone()

        db.session.commit()
        return success({
            "employee_id": str(qr.employee_id),
            "progress": dict(progress._mapping) if progress else None,
            "unresolved_sync_issues": sync_issues.cnt if sync_issues else 0,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@leave_reports_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    allowed = ["sync", "analytics", "reports"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"leave_reports_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"leave_reports_{module}_template.xlsx")
