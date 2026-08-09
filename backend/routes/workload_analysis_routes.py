"""
FILE: backend/routes/workload_analysis_routes.py
NepHR Pro — Performance & Talent Management > Work & Performance >
Workload Analysis Module (2 pages)
URL prefix: /api/v1/workload-analysis

  1. /employeewise  — AI Burnout Radar, capacity meter, task allocation
  2. /departmentwise    — Workforce heatmap, resource allocation matrix

Aggregates from daily_attendance_records, leave_requests, employees --
no duplicate capture. Nepal Labour Act 2074: 8hr/day, 48hr/week standard;
minors 6hr/day, 36hr/week; OT capped 4hr/day, 24hr/week at 1.5x; mandatory
30-min break after 5hrs; equal-value-of-work by nature/time/skill/effort.
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

workload_bp = Blueprint("workload_analysis", __name__, url_prefix="/api/v1/workload-analysis")


# ════════════════════════════════════════════════════════════════
# 1. EMPLOYEEWISE
# ════════════════════════════════════════════════════════════════

@workload_bp.get("/employeewise")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def employeewise_dashboard():
    week_start = request.args.get("week_start")
    try:
        q = "SELECT * FROM v_employeewise_workload WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if week_start: q += " AND week_start = :wstart"; params["wstart"] = week_start
        rows = db.session.execute(text(q), params).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "employees": data,
            "avg_utilization_pct": round(sum(float(r["utilization_pct"] or 0) for r in data) / max(len(data), 1), 1),
            "high_risk_count": sum(1 for r in data if r["burnout_risk"] == "high"),
        })
    except Exception:
        return success({"employees": [], "avg_utilization_pct": 0, "high_risk_count": 0})


@workload_bp.get("/employeewise/my-workload/<employee_id>")
def my_workload(employee_id):
    """Public/ESS — self-service capacity tracker for the employee."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_employeewise_workload WHERE employee_id = :eid ORDER BY week_start DESC LIMIT 12"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@workload_bp.post("/employeewise/task-allocation")
def upsert_task_allocation():
    """
    Public/ESS or manager — set planned hours and task counts for a week.
    DB trigger auto-computes burnout risk from actual hours vs this plan.
    """
    body = request.get_json() or {}
    required = ["employee_id", "week_start"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO employee_task_allocations
              (company_id, employee_id, week_start, planned_hours, tasks_assigned, tasks_completed, created_at)
            VALUES
              (:cid, :eid, :wstart, :planned, :assigned, :completed, NOW())
            ON CONFLICT (employee_id, week_start)
            DO UPDATE SET planned_hours = EXCLUDED.planned_hours, tasks_assigned = EXCLUDED.tasks_assigned,
                          tasks_completed = EXCLUDED.tasks_completed, updated_at = NOW()
            RETURNING id
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "wstart": body["week_start"],
            "planned": body.get("planned_hours", 48), "assigned": body.get("tasks_assigned", 0),
            "completed": body.get("tasks_completed", 0),
        })
        allocation_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"allocation_id": allocation_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@workload_bp.get("/employeewise/burnout-queue")
@require_auth
@require_role("super_admin", "hr_manager")
def burnout_review_queue():
    """High-risk employees flagged for a wellbeing check-in -- human conversation, not auto-action."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_burnout_review_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@workload_bp.put("/employeewise/burnout-flags/<flag_id>/checkin")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def complete_checkin(flag_id):
    try:
        db.session.execute(text("""
            UPDATE employee_burnout_flags SET checkin_completed_at = NOW() WHERE id = :fid AND company_id = :cid
        """), {"fid": flag_id, "cid": g.company_id})
        db.session.commit()
        return success({"checkin_completed": True, "note": "Human conversation logged -- no automated action taken."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@workload_bp.post("/employeewise/ai-task-rebalance")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_task_rebalance_suggestion():
    """AI suggests task redistribution from overloaded to underutilized employees within a team."""
    body = request.get_json() or {}
    if not body.get("department_id"): return error("department_id required", 422)
    try:
        insight = generate_ai_insights({
            "type": "workload_rebalance_suggestion", "company_id": g.company_id, "department_id": body["department_id"],
        })
        return success({"suggestions": insight.get("suggestions", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. DEPARTMENTWISE
# ════════════════════════════════════════════════════════════════

@workload_bp.get("/departmentwise")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def departmentwise_dashboard():
    week_start = request.args.get("week_start")
    try:
        q = "SELECT * FROM v_departmentwise_workload WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if week_start: q += " AND week_start = :wstart"; params["wstart"] = week_start
        rows = db.session.execute(text(q), params).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "departments": data,
            "over_resourced_count": sum(1 for r in data if r["intensity"] == "over"),
            "net_fte_gap": round(sum(float(r["fte_gap"] or 0) for r in data), 1),
        })
    except Exception:
        return success({"departments": [], "over_resourced_count": 0, "net_fte_gap": 0})


@workload_bp.post("/departmentwise/capacity-target")
@require_auth
@require_role("super_admin", "hr_manager")
def set_capacity_target():
    """HR/manager sets the required hours/week (project demand) for a department."""
    body = request.get_json() or {}
    required = ["department_id", "week_start", "required_hours_week"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO department_capacity_targets (company_id, department_id, week_start, required_hours_week, fte_target, created_at)
            VALUES (:cid, :dept, :wstart, :req_hrs, :fte, NOW())
            ON CONFLICT (department_id, week_start)
            DO UPDATE SET required_hours_week = EXCLUDED.required_hours_week, fte_target = EXCLUDED.fte_target
            RETURNING id
        """), {
            "cid": g.company_id, "dept": body["department_id"], "wstart": body["week_start"],
            "req_hrs": body["required_hours_week"], "fte": body.get("fte_target"),
        })
        target_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"target_id": target_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@workload_bp.post("/departmentwise/ai-forecast")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_workload_forecast():
    """AI forecasts seasonal workload spikes for proactive staffing planning."""
    body = request.get_json() or {}
    if not body.get("department_id"): return error("department_id required", 422)
    try:
        insight = generate_ai_insights({
            "type": "departmental_workload_forecast", "company_id": g.company_id, "department_id": body["department_id"],
        })
        return success({
            "forecast_periods": insight.get("forecast_periods", []),
            "recommended_temp_staffing": insight.get("recommended_temp_staffing", 0),
        })
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@workload_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["employeewise", "departmentwise"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"workload_analysis_{module}")
    return jsonify(result), 200 if result["success"] else 422


@workload_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"workload_analysis_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"workload_analysis_{module}_template.xlsx")
