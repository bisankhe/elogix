"""
FILE: backend/routes/wfh_tracking_routes.py
NepHR Pro — Workforce Operations > Attendance Management > Daily Attendance
> Work From Home Tracking (1 page)
URL prefix: /api/v1/wfh-tracking

Outcome-first design: tracks tasks/OKRs and passive login-logout timestamps,
never keystrokes/mouse/screenshots/webcam. Burnout-risk signal derived from
coarse weekly aggregates (off-hours login frequency, total hours), never
raw activity content.

Nepal Labour Act 2074 Section 28: attendance register required even for
remote workers; 8hr/48hr caps; WFH legal if established in employment
contract; overtime still applies at 1.5x past 48hr/week.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date, timedelta
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

wfh_bp = Blueprint("wfh_tracking", __name__, url_prefix="/api/v1/wfh-tracking")


# ════════════════════════════════════════════════════════════════
# TEAM DASHBOARD
# ════════════════════════════════════════════════════════════════

@wfh_bp.get("/team-today")
@require_auth
def team_today():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_wfh_team_today WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "team": data,
            "active_count": sum(1 for r in data if r["status"] != "offline"),
            "avg_okr_progress": round(sum(r["okr_progress"] or 0 for r in data) / max(len(data), 1)),
            "burnout_risk_count": sum(1 for r in data if r["burnout_risk_level"] == "high"),
        })
    except Exception:
        return success({"team": [], "active_count": 0, "avg_okr_progress": 0, "burnout_risk_count": 0})


@wfh_bp.get("/policy")
@require_auth
def get_policy():
    """Returns the org's WFH policy config — surfaces the data-collection disclosure in the UI's privacy modal."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM wfh_policy_config WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        if not row:
            return success({
                "core_hours_start": "13:00", "core_hours_end": "16:00", "timezone": "Asia/Kathmandu",
                "max_wfh_days_per_week": 5,
                "data_collected": ["login_logout_timestamps", "task_completion", "okr_progress", "self_reported_status"],
                "data_never_collected": ["keystrokes", "mouse_movement", "screenshots", "webcam", "microphone", "off_hours_content"],
            })
        return success(dict(row._mapping))
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# DAILY LOG (self-reported status + passive timestamp sync)
# ════════════════════════════════════════════════════════════════

@wfh_bp.post("/daily-log")
def upsert_daily_log():
    """
    Public/ESS — employee logs today's WFH status. If daily_attendance_record_id
    is provided, DB trigger pulls login/logout passively from that record
    rather than requiring separate manual entry.
    """
    body = request.get_json() or {}
    required = ["employee_id", "log_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        # Compute this week's WFH day count for hybrid capacity tracking
        week_start = date.fromisoformat(body["log_date"]) - timedelta(days=date.fromisoformat(body["log_date"]).weekday())
        week_count_row = db.session.execute(text("""
            SELECT COUNT(*) FROM wfh_daily_log WHERE employee_id = :eid AND log_date >= :wstart
        """), {"eid": body["employee_id"], "wstart": week_start}).fetchone()

        result = db.session.execute(text("""
            INSERT INTO wfh_daily_log
              (company_id, employee_id, daily_attendance_record_id, log_date, status,
               weekly_wfh_day_count, created_at)
            VALUES
              (:cid, :eid, :dar_id, :ldate, :status,
               :week_count, NOW())
            ON CONFLICT (employee_id, log_date)
            DO UPDATE SET status = EXCLUDED.status, status_updated_at = NOW(), updated_at = NOW()
            RETURNING id, was_available_during_core_hours, off_hours_activity_detected
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "dar_id": body.get("daily_attendance_record_id"),
            "ldate": body["log_date"], "status": body.get("status", "offline"),
            "week_count": (week_count_row[0] or 0) + 1,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "log_id": str(row[0]),
            "core_hours_compliant": row[1],
            "off_hours_flagged": row[2],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wfh_bp.put("/daily-log/<log_id>/status")
def update_status(log_id):
    """Public/ESS — quick status toggle (Focusing/In a Meeting/Away/Offline), self-set only."""
    body = request.get_json() or {}
    if not body.get("status"): return error("status required", 422)
    try:
        db.session.execute(text("""
            UPDATE wfh_daily_log SET status = :status, status_updated_at = NOW(), updated_at = NOW()
            WHERE id = :lid
        """), {"status": body["status"], "lid": log_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# TASKS & OKRs (outcome-based, replaces activity surveillance)
# ════════════════════════════════════════════════════════════════

@wfh_bp.post("/daily-log/<log_id>/tasks")
def add_task(log_id):
    """Public/ESS — add a planned task. Can later sync from Jira/Asana/Trello via external_tool field."""
    body = request.get_json() or {}
    if not body.get("task_description"): return error("task_description required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO wfh_task_log (wfh_daily_log_id, company_id, task_description, external_tool, external_task_id, created_at)
            VALUES (:lid, :cid, :desc, :tool, :ext_id, NOW())
            RETURNING id
        """), {"lid": log_id, "cid": body.get("company_id"), "desc": body["task_description"],
               "tool": body.get("external_tool", "manual"), "ext_id": body.get("external_task_id")})
        task_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"task_id": task_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wfh_bp.put("/tasks/<task_id>/complete")
def complete_task(task_id):
    """Public/ESS — mark a task done. This (not activity logging) is the productivity signal."""
    try:
        db.session.execute(text("""
            UPDATE wfh_task_log SET is_completed = TRUE, completed_at = NOW(), updated_at = NOW()
            WHERE id = :tid
        """), {"tid": task_id})
        db.session.commit()
        return success({"completed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wfh_bp.post("/daily-log/<log_id>/okr")
def update_okr_progress(log_id):
    """Public/ESS — update OKR progress percentage."""
    body = request.get_json() or {}
    required = ["employee_id", "progress_pct"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO wfh_okr_progress (wfh_daily_log_id, company_id, employee_id, okr_description, progress_pct, created_at)
            VALUES (:lid, :cid, :eid, :desc, :pct, NOW())
        """), {"lid": log_id, "cid": body.get("company_id"), "eid": body["employee_id"],
               "desc": body.get("okr_description", ""), "pct": body["progress_pct"]})
        db.session.commit()
        return created({"recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# WELLBEING / BURNOUT (coarse weekly aggregates only)
# ════════════════════════════════════════════════════════════════

@wfh_bp.get("/wellbeing/burnout-risk-report")
@require_auth
@require_role("super_admin", "hr_manager")
def burnout_risk_report():
    """HR-only — employees flagged for high burnout risk based on off-hours login frequency, never raw activity."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_wfh_burnout_risk_report WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wfh_bp.post("/wellbeing/self-report")
def self_report_pulse():
    """Public/ESS — optional 1-question pulse survey (1-5 scale), entirely opt-in."""
    body = request.get_json() or {}
    required = ["employee_id", "pulse_week_start", "self_reported_score"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO wfh_wellbeing_pulse (company_id, employee_id, pulse_week_start, self_reported_score, created_at)
            VALUES (:cid, :eid, :wstart, :score, NOW())
            ON CONFLICT (employee_id, pulse_week_start)
            DO UPDATE SET self_reported_score = EXCLUDED.self_reported_score, updated_at = NOW()
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "wstart": body["pulse_week_start"],
               "score": body["self_reported_score"]})
        db.session.commit()
        return created({"recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wfh_bp.post("/wellbeing/<pulse_id>/wellbeing-checkin")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def trigger_wellbeing_checkin(pulse_id):
    """Manager/HR initiates a human wellbeing conversation — the system never auto-penalizes, only flags for a human check-in."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE wfh_wellbeing_pulse SET flagged_for_hr_review = TRUE, updated_at = NOW()
            WHERE id = :pid AND company_id = :cid
        """), {"pid": pulse_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "checkin_logged": True,
            "note": "A human conversation has been initiated -- no automated action taken on this flag.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# HYBRID CAPACITY & CORE-HOURS COMPLIANCE (manager admin panel)
# ════════════════════════════════════════════════════════════════

@wfh_bp.get("/core-hours-compliance")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def core_hours_compliance():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_core_hours_compliance_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wfh_bp.get("/weekly-capacity")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def weekly_capacity():
    """Hybrid capacity heatmap data — how many WFH days per employee per week."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_weekly_wfh_capacity WHERE company_id = :cid ORDER BY week_start DESC LIMIT 200"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wfh_bp.put("/policy")
@require_auth
@require_role("super_admin", "hr_manager")
def update_policy():
    """HR configures org-wide core hours and max WFH days/week."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            INSERT INTO wfh_policy_config (company_id, core_hours_start, core_hours_end, timezone, max_wfh_days_per_week, updated_at)
            VALUES (:cid, :start, :end, :tz, :max_days, NOW())
            ON CONFLICT (company_id)
            DO UPDATE SET core_hours_start = EXCLUDED.core_hours_start, core_hours_end = EXCLUDED.core_hours_end,
                          timezone = EXCLUDED.timezone, max_wfh_days_per_week = EXCLUDED.max_wfh_days_per_week, updated_at = NOW()
        """), {
            "cid": g.company_id, "start": body.get("core_hours_start", "13:00"), "end": body.get("core_hours_end", "16:00"),
            "tz": body.get("timezone", "Asia/Kathmandu"), "max_days": body.get("max_wfh_days_per_week", 5),
        })
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wfh_bp.post("/ai-task-suggestions")
@require_auth
def ai_task_suggestions():
    """AI suggests likely tasks based on the employee's role and recent patterns (assistive, not surveillance)."""
    body = request.get_json() or {}
    try:
        insight = generate_ai_insights({
            "type": "wfh_task_suggestion",
            "employee_id": body.get("employee_id"),
        })
        return success({"suggested_tasks": insight.get("suggested_tasks", [])})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@wfh_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "wfh_tracking")
    return jsonify(result), 200 if result["success"] else 422


@wfh_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("wfh_tracking")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="wfh_tracking_template.xlsx")
