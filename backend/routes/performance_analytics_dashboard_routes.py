"""
FILE: backend/routes/performance_analytics_dashboard_routes.py
eLogix HRMS — Performance & Talent Management > Goal & Performance >
Performance Analytics Module (3 pages: Performance Dashboard, Goal
Achievement, Productivity Analytics)
URL prefix: /api/v1/performance-analytics-dashboard

The capstone rollup of the entire Performance & Talent arc -- pure
aggregation across performance_appraisals, v_pms_360_radar,
v_unified_goal_tracking (KRA+KPI+OKR+Assignment), and
v_employeewise_workload/v_departmentwise_workload. Nothing re-captured.

Nepal Labour Act 2074 Section 112: employees must have access to their
own analytics; written disagreement right. Section 142: 3 consecutive
unsatisfactory appraisals = termination grounds. Section 7: no
gender-based productivity-pay discrimination. Bonus Act 1974: 10% of
net profit distributed if profitable.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import build_template_xlsx
from ..ai.insights import generate_ai_insights

perf_dash_bp = Blueprint("performance_analytics_dashboard", __name__, url_prefix="/api/v1/performance-analytics-dashboard")


# ════════════════════════════════════════════════════════════════
# 1. PERFORMANCE DASHBOARD
# ════════════════════════════════════════════════════════════════

@perf_dash_bp.get("/kpis")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def top_line_kpis():
    """The '5-second rule' header widgets."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_performance_dashboard_kpis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@perf_dash_bp.get("/by-department")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def department_snapshot():
    """Drill-down source: filterable department performance cards."""
    department = request.args.get("department")
    try:
        q = "SELECT * FROM v_performance_dashboard_by_dept WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if department: q += " AND department_name = :dept"; params["dept"] = department
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_dash_bp.get("/action-alerts")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def action_alerts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_ai_action_alerts_active WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_dash_bp.post("/action-alerts/ai-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_scan_for_alerts():
    """AI cross-references engagement, compa-ratio, and performance trends to surface proactive risk alerts."""
    try:
        insight = generate_ai_insights({"type": "performance_dashboard_risk_scan", "company_id": g.company_id})
        alerts = insight.get("alerts", [])
        for a in alerts:
            db.session.execute(text("""
                INSERT INTO ai_action_alerts (company_id, alert_type, severity, message, affected_employee_ids, affected_department_id, created_at)
                VALUES (:cid, :atype, :severity, :msg, :emp_ids, :dept_id, NOW())
            """), {"cid": g.company_id, "atype": a["alert_type"], "severity": a.get("severity", "medium"),
                   "msg": a["message"], "emp_ids": a.get("affected_employee_ids", []), "dept_id": a.get("affected_department_id")})
        db.session.commit()
        return success({"alerts_created": len(alerts)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_dash_bp.put("/action-alerts/<alert_id>/resolve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def resolve_alert(alert_id):
    try:
        db.session.execute(text("""
            UPDATE ai_action_alerts SET resolved = TRUE, resolved_by = :user, resolved_at = NOW()
            WHERE id = :aid AND company_id = :cid
        """), {"user": g.user_id, "aid": alert_id, "cid": g.company_id})
        db.session.commit()
        return success({"resolved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_dash_bp.get("/my-analytics/<employee_id>")
def my_analytics(employee_id):
    """Public/ESS — Section 112 requires employees have access to their own performance analytics."""
    try:
        appraisals = db.session.execute(text(
            "SELECT * FROM v_performance_appraisal_dashboard WHERE employee_id = :eid ORDER BY cycle_start_date DESC"
        ), {"eid": employee_id}).fetchall()
        radar = db.session.execute(text(
            "SELECT * FROM v_pms_360_radar WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success({
            "appraisal_history": [dict(a._mapping) for a in appraisals],
            "competency_radar": [dict(r._mapping) for r in radar],
        })
    except Exception:
        return success({"appraisal_history": [], "competency_radar": []})


# ════════════════════════════════════════════════════════════════
# 2. GOAL ACHIEVEMENT
# ════════════════════════════════════════════════════════════════

@perf_dash_bp.get("/corporate-okr-thermometer")
@require_auth
def corporate_okr_thermometer():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_corporate_okr_thermometer WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success({"overall_progress_pct": float(row.overall_progress_pct) if row else 0})
    except Exception:
        return success({"overall_progress_pct": 0})


@perf_dash_bp.get("/team-board")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_board():
    """The Goal Achievement page's card-based team view, aggregated live from v_unified_goal_tracking."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_goal_achievement_team_board WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_dash_bp.get("/team-board/<team_name>/members")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_member_drilldown(team_name):
    """Drill-down drawer: individual member goal contributions within a team."""
    try:
        rows = db.session.execute(text("""
            SELECT e.first_name, e.last_name, ugt.title, ugt.progress_pct, ugt.status
            FROM v_unified_goal_tracking ugt
            JOIN employees e ON ugt.owner_ref = e.id::TEXT
            JOIN departments d ON e.department_id = d.id
            WHERE d.name = :team AND ugt.company_id = :cid
        """), {"team": team_name, "cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 3. PRODUCTIVITY ANALYTICS
# ════════════════════════════════════════════════════════════════

@perf_dash_bp.get("/heatmap")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def productivity_heatmap():
    """Department-level output heatmap -- never individual activity monitoring."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_productivity_heatmap WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_dash_bp.get("/training-roi")
@require_auth
@require_role("super_admin", "hr_manager")
def training_roi():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_roi_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_dash_bp.post("/training-roi/capture")
@require_auth
@require_role("super_admin", "hr_manager")
def capture_training_roi():
    """Captures a pre/post performance score comparison for a completed training initiative."""
    body = request.get_json() or {}
    required = ["course_label", "pre_training_avg_score", "post_training_avg_score"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO training_roi_snapshots (company_id, course_label, pre_training_avg_score, post_training_avg_score, participant_count, measured_at)
            VALUES (:cid, :course, :pre, :post, :participants, NOW()) RETURNING id, (post_training_avg_score - pre_training_avg_score) AS lift
        """), {"cid": g.company_id, "course": body["course_label"], "pre": body["pre_training_avg_score"],
               "post": body["post_training_avg_score"], "participants": body.get("participant_count", 0)})
        row = result.fetchone()
        db.session.commit()
        return created({"snapshot_id": str(row[0]), "score_lift": float(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_dash_bp.get("/predictive-completions")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def predictive_completions():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_predictive_completions_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_dash_bp.post("/predictive-completions")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_prediction():
    """DB trigger auto-classifies on_track/at_risk from confidence_pct and velocity_trend."""
    body = request.get_json() or {}
    required = ["project_label", "confidence_pct"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO predictive_project_completions
              (company_id, project_label, department_id, confidence_pct, predicted_completion_date, velocity_trend, flag_note, updated_at)
            VALUES
              (:cid, :project, :dept, :confidence, :pred_date, :velocity, :note, NOW())
            RETURNING id, status
        """), {
            "cid": g.company_id, "project": body["project_label"], "dept": body.get("department_id"),
            "confidence": body["confidence_pct"], "pred_date": body.get("predicted_completion_date"),
            "velocity": body.get("velocity_trend", "stable"), "note": body.get("flag_note"),
        })
        row = result.fetchone()
        db.session.commit()
        return created({"prediction_id": str(row[0]), "status": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@perf_dash_bp.get("/labor-cost-per-unit")
@require_auth
@require_role("super_admin", "hr_manager")
def labor_cost_per_unit():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_labor_cost_per_unit WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel export ───────────────────────────────────────
@perf_dash_bp.get("/excel-export")
@require_auth
def excel_export():
    b = build_template_xlsx("performance_analytics_dashboard_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="performance_analytics_dashboard_export.xlsx")
