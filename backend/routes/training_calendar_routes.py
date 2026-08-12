"""
FILE: backend/routes/training_calendar_routes.py
eLogix HRMS — Performance & Talent Management > Talent Development >
Learning & Development > Training Calendars (4 pages: Annual, Monthly,
Weekly, Daily)
URL prefix: /api/v1/training-calendar

Unified training_sessions table serves annual/monthly/weekly via
period_type; daily microlearning runs through a separate, lighter-weight
progress table. Integrates with the EXISTING training_needs_analysis
(approved needs become sessions) and transaction_notifications.

Nepal Labour Act 2074 Chapter 10: mandatory OSH/safety training,
no prescribed calendar but must be regular; trainee cap 1 year,
8hr/day-48hr/week; foreign-national posts require gradual
Nepali-replacement training strategy.
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

training_cal_bp = Blueprint("training_calendar", __name__, url_prefix="/api/v1/training-calendar")


# ════════════════════════════════════════════════════════════════
# 1. ANNUAL TRAINING CALENDAR
# ════════════════════════════════════════════════════════════════

@training_cal_bp.get("/annual/budget")
@require_auth
@require_role("super_admin", "hr_manager")
def annual_budget():
    fiscal_year = request.args.get("fiscal_year_label")
    try:
        q = "SELECT * FROM v_annual_training_dashboard WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if fiscal_year: q += " AND fiscal_year_label = :fy"; params["fy"] = fiscal_year
        row = db.session.execute(text(q), params).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@training_cal_bp.post("/annual/budget")
@require_auth
@require_role("super_admin", "hr_manager")
def set_annual_budget():
    body = request.get_json() or {}
    required = ["fiscal_year_label", "allocated_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO annual_training_budgets (company_id, fiscal_year_label, allocated_npr, created_at)
            VALUES (:cid, :fy, :allocated, NOW())
            ON CONFLICT (company_id, fiscal_year_label) DO UPDATE SET allocated_npr = EXCLUDED.allocated_npr
        """), {"cid": g.company_id, "fy": body["fiscal_year_label"], "allocated": body["allocated_npr"]})
        db.session.commit()
        return created({"budget_set": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_cal_bp.get("/annual/quarterly-themes")
@require_auth
def quarterly_themes():
    fiscal_year = request.args.get("fiscal_year_label")
    try:
        q = "SELECT * FROM v_quarterly_themes WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if fiscal_year: q += " AND fiscal_year_label = :fy"; params["fy"] = fiscal_year
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_cal_bp.post("/annual/quarterly-themes")
@require_auth
@require_role("super_admin", "hr_manager")
def set_quarterly_theme():
    body = request.get_json() or {}
    required = ["fiscal_year_label", "quarter_label", "theme_title"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO quarterly_org_themes (company_id, fiscal_year_label, quarter_label, theme_title, color_hex)
            VALUES (:cid, :fy, :quarter, :theme, :color)
            ON CONFLICT (company_id, fiscal_year_label, quarter_label) DO UPDATE SET theme_title = EXCLUDED.theme_title
        """), {"cid": g.company_id, "fy": body["fiscal_year_label"], "quarter": body["quarter_label"],
               "theme": body["theme_title"], "color": body.get("color_hex", "#7c3aed")})
        db.session.commit()
        return created({"theme_set": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2 & 3. MONTHLY / WEEKLY TRAINING SESSIONS (unified table)
# ════════════════════════════════════════════════════════════════

@training_cal_bp.get("/sessions")
@require_auth
def list_sessions():
    period_type = request.args.get("period_type", "monthly")
    department_id = request.args.get("department_id")
    try:
        view = "v_monthly_training_calendar" if period_type == "monthly" else "v_weekly_training_calendar"
        q = f"SELECT * FROM {view} WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if department_id: q += " AND department_id = :dept"; params["dept"] = department_id
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_cal_bp.post("/sessions")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_session():
    body = request.get_json() or {}
    required = ["title", "period_type", "session_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO training_sessions
              (company_id, training_needs_analysis_id, title, category, period_type, session_date, start_time, end_time,
               department_id, quarterly_theme_id, trainer_name, trainer_type, location_or_link, seats_total,
               prerequisites, budget_cost_npr, created_by, created_at)
            VALUES
              (:cid, :tna_id, :title, :category, :period, :sdate, :start, :end,
               :dept, :theme_id, :trainer, :trainer_type, :location, :seats,
               :prereqs, :cost, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "tna_id": body.get("training_needs_analysis_id"), "title": body["title"],
            "category": body.get("category", "technical"), "period": body["period_type"], "sdate": body["session_date"],
            "start": body.get("start_time"), "end": body.get("end_time"), "dept": body.get("department_id"),
            "theme_id": body.get("quarterly_theme_id"), "trainer": body.get("trainer_name"), "trainer_type": body.get("trainer_type", "internal"),
            "location": body.get("location_or_link"), "seats": body.get("seats_total", 20), "prereqs": body.get("prerequisites", []),
            "cost": body.get("budget_cost_npr", 0), "user": g.user_id,
        })
        session_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"session_id": session_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_cal_bp.post("/sessions/<session_id>/enroll")
def enroll_in_session(session_id):
    """Public/ESS — self-nomination. DB trigger notifies the reporting manager for one-click approval."""
    body = request.get_json() or {}
    required = ["employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO training_session_enrollments (training_session_id, company_id, employee_id, enrollment_type, created_at)
            VALUES (:sid, :cid, :eid, :etype, NOW())
            ON CONFLICT (training_session_id, employee_id) DO NOTHING
            RETURNING id
        """), {"sid": session_id, "cid": body.get("company_id"), "eid": body["employee_id"], "etype": body.get("enrollment_type", "self_nominated")})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Already enrolled."})
        return created({"enrollment_id": str(row[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_cal_bp.get("/sessions/pending-approvals")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def pending_approvals():
    """Manager queue: self-nominations awaiting one-click approval."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pending_enrollment_approvals WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@training_cal_bp.put("/enrollments/<enrollment_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_enrollment(enrollment_id):
    """DB trigger increments seats_filled and auto-marks the session 'full' if at capacity."""
    try:
        db.session.execute(text("""
            UPDATE training_session_enrollments SET approval_status = 'approved', approved_by = :user
            WHERE id = :eid AND company_id = :cid AND approval_status = 'pending'
        """), {"user": g.user_id, "eid": enrollment_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_cal_bp.put("/enrollments/<enrollment_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reject_enrollment(enrollment_id):
    try:
        db.session.execute(text("""
            UPDATE training_session_enrollments SET approval_status = 'rejected' WHERE id = :eid AND company_id = :cid
        """), {"eid": enrollment_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. DAILY TRAINING CALENDAR
# ════════════════════════════════════════════════════════════════

@training_cal_bp.get("/daily/agenda/<employee_id>")
def daily_agenda(employee_id):
    """Public/ESS — today's clean agenda list."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_daily_training_agenda WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "agenda": data,
            "completed_count": sum(1 for r in data if r["completed"]),
            "total_count": len(data),
        })
    except Exception:
        return success({"agenda": [], "completed_count": 0, "total_count": 0})


@training_cal_bp.post("/daily/microlearning-chunks")
@require_auth
@require_role("super_admin", "hr_manager")
def create_microlearning_chunk():
    body = request.get_json() or {}
    required = ["title", "chunk_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO microlearning_chunks (company_id, title, chunk_type, duration_minutes, created_at)
            VALUES (:cid, :title, :ctype, :duration, NOW()) RETURNING id
        """), {"cid": g.company_id, "title": body["title"], "ctype": body["chunk_type"], "duration": body.get("duration_minutes", 5)})
        chunk_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"chunk_id": chunk_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_cal_bp.put("/daily/progress/<progress_id>/complete")
def mark_daily_complete(progress_id):
    """Public/ESS — mark a microlearning chunk or session as completed today."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE daily_training_progress SET completed = TRUE, completed_at = NOW(), quiz_score_pct = :score
            WHERE id = :pid
        """), {"score": body.get("quiz_score_pct"), "pid": progress_id})
        db.session.commit()
        return success({"completed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@training_cal_bp.post("/daily/ai-coach-adapt")
def ai_coach_adapt(employee_id=None):
    """AI adapts tomorrow's microlearning difficulty based on today's quiz performance."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "daily_microlearning_adaptation", "employee_id": body["employee_id"]})
        return success({"recommended_chunks": insight.get("recommended_chunks", [])})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@training_cal_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["sessions", "annual-budget"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"training_calendar_{module}")
    return jsonify(result), 200 if result["success"] else 422


@training_cal_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"training_calendar_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"training_calendar_{module}_template.xlsx")
