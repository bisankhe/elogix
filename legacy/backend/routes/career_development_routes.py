"""
FILE: backend/routes/career_development_routes.py
eLogix HRMS — Performance & Talent Management > Talent Development >
Career Development (4 pages: Career Pathing, Employee Development
Plan, Training Portfolio, Leadership Development)
URL prefix: /api/v1/career-development

Heavily a synthesis layer: Career Pathing reuses designations/
salary_range_bands/employee_skill_levels; Training Portfolio reuses
v_my_learning_path/v_my_credentials_employee directly (zero new course
data); Leadership Development reuses the EXISTING nine_box_grid.

Nepal Labour Act 2074: career pathing supported via promotion/equal-
opportunity provisions; EDP/training portfolio satisfies the annual
skill-development mandate; leadership development indirectly supported
via workers' participation committee capacity-building provisions.
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

career_dev_bp = Blueprint("career_development", __name__, url_prefix="/api/v1/career-development")


# ════════════════════════════════════════════════════════════════
# PAGE 1: CAREER PATHING
# ════════════════════════════════════════════════════════════════

@career_dev_bp.get("/path/<employee_id>")
def career_pathing_dashboard(employee_id):
    """Public/ESS — the Career Journey Map's data source."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_career_pathing_dashboard WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@career_dev_bp.post("/path/targets")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def add_path_target():
    """Maps a new target role onto an employee's career journey. DB trigger computes skill_match_pct."""
    body = request.get_json() or {}
    required = ["employee_id", "target_designation_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO career_path_targets (company_id, employee_id, target_designation_id, path_type, suggested_mentor_employee_id, created_at)
            VALUES (:cid, :eid, :designation, :ptype, :mentor, NOW())
            ON CONFLICT (employee_id, target_designation_id) DO NOTHING
            RETURNING id
        """), {"cid": g.company_id, "eid": body["employee_id"], "designation": body["target_designation_id"],
               "ptype": body.get("path_type", "vertical"), "mentor": body.get("suggested_mentor_employee_id")})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Target already mapped."})
        return created({"target_id": str(row[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@career_dev_bp.post("/path/ai-suggest-roles")
def ai_suggest_target_roles():
    """Public/ESS — AI suggests adjacent/target roles based on current skills and career interests."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "career_path_suggestion", "employee_id": body["employee_id"]})
        return success({"suggested_roles": insight.get("suggested_roles", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: EMPLOYEE DEVELOPMENT PLAN
# ════════════════════════════════════════════════════════════════

@career_dev_bp.get("/edp/<employee_id>")
def get_edp(employee_id):
    """Public/ESS — the full living EDP document with nested goals + check-ins."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_edp_full_detail WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@career_dev_bp.post("/edp")
def create_edp():
    """Public/ESS — creates the development plan, optionally linked to a Career Pathing target."""
    body = request.get_json() or {}
    required = ["employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO employee_development_plans (company_id, employee_id, linked_career_path_target_id, created_at)
            VALUES (:cid, :eid, :target, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "target": body.get("linked_career_path_target_id")})
        plan_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"plan_id": plan_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@career_dev_bp.post("/edp/<plan_id>/goals")
def add_edp_goal(plan_id):
    """Public/ESS — add a short-term or long-term goal."""
    body = request.get_json() or {}
    required = ["goal_description", "goal_horizon"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO edp_goals (employee_development_plan_id, company_id, goal_description, goal_horizon, target_date, created_at)
            VALUES (:pid, :cid, :desc, :horizon, :target_date, NOW()) RETURNING id
        """), {"pid": plan_id, "cid": body.get("company_id"), "desc": body["goal_description"], "horizon": body["goal_horizon"], "target_date": body.get("target_date")})
        goal_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"goal_id": goal_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@career_dev_bp.put("/edp/goals/<goal_id>/progress")
def update_goal_progress(goal_id):
    """Public/ESS — self-service progress update."""
    body = request.get_json() or {}
    if body.get("progress_pct") is None: return error("progress_pct required", 422)
    try:
        db.session.execute(text("""
            UPDATE edp_goals SET progress_pct = :pct, completed_at = CASE WHEN :pct >= 100 THEN NOW() ELSE completed_at END WHERE id = :gid
        """), {"pct": body["progress_pct"], "gid": goal_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@career_dev_bp.post("/edp/<plan_id>/checkin")
def log_checkin(plan_id):
    """Public/ESS — continuous check-in, self or manager. DB trigger notifies the other party."""
    body = request.get_json() or {}
    required = ["logged_by", "note"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO edp_checkins (employee_development_plan_id, company_id, logged_by, is_manager_checkin, note, logged_at)
            VALUES (:pid, :cid, :user, :is_manager, :note, NOW()) RETURNING id
        """), {"pid": plan_id, "cid": body.get("company_id"), "user": body["logged_by"], "is_manager": body.get("is_manager_checkin", False), "note": body["note"]})
        checkin_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"checkin_id": checkin_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@career_dev_bp.post("/edp/ai-suggest-stretch-assignment")
def ai_suggest_stretch():
    """Public/ESS — AI suggests stretch assignments/mentorship that close the gap toward a long-term goal."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "stretch_assignment_suggestion", "employee_id": body["employee_id"]})
        return success({"suggestions": insight.get("suggestions", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: TRAINING PORTFOLIO (pure consumption, no new data)
# ════════════════════════════════════════════════════════════════

@career_dev_bp.get("/portfolio/<employee_id>")
def training_portfolio(employee_id):
    """Public/ESS — the Netflix-style portfolio, reusing v_my_learning_path + v_my_credentials_employee directly."""
    try:
        courses = db.session.execute(text(
            "SELECT * FROM v_training_portfolio WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        certs = db.session.execute(text(
            "SELECT * FROM v_my_credentials_employee WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success({
            "courses": [dict(c._mapping) for c in courses],
            "certificates": [dict(c._mapping) for c in certs],
            "total_cpe_hours": sum(float(c.get("duration_hours") or 0) for c in [dict(x._mapping) for x in courses]),
        })
    except Exception:
        return success({"courses": [], "certificates": [], "total_cpe_hours": 0})


@career_dev_bp.post("/portfolio/ai-recommend")
def ai_recommend_portfolio():
    """Public/ESS — recommendations weighted toward the employee's active Career Pathing targets."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "career_path_aware_course_recommendation", "employee_id": body["employee_id"]})
        return success({"recommended_courses": insight.get("recommended_courses", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: LEADERSHIP DEVELOPMENT
# ════════════════════════════════════════════════════════════════

@career_dev_bp.get("/leadership-pipeline")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def leadership_pipeline():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leadership_pipeline_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@career_dev_bp.post("/leadership-pipeline")
@require_auth
@require_role("super_admin", "hr_manager")
def add_to_pipeline():
    """Adds (or updates) an employee's leadership pipeline record, optionally linked to an existing 9-box classification."""
    body = request.get_json() or {}
    required = ["employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO leadership_pipeline (company_id, employee_id, nine_box_grid_id, is_hipo, readiness_score, target_designation_id, mentor_employee_id, development_track_label, created_at)
            VALUES (:cid, :eid, :nine_box, :hipo, :readiness, :target, :mentor, :track, NOW())
            ON CONFLICT (employee_id) DO UPDATE SET
              is_hipo = EXCLUDED.is_hipo, readiness_score = EXCLUDED.readiness_score,
              target_designation_id = EXCLUDED.target_designation_id, mentor_employee_id = EXCLUDED.mentor_employee_id,
              development_track_label = EXCLUDED.development_track_label, updated_at = NOW()
        """), {"cid": g.company_id, "eid": body["employee_id"], "nine_box": body.get("nine_box_grid_id"), "hipo": body.get("is_hipo", False),
               "readiness": body.get("readiness_score", 0), "target": body.get("target_designation_id"), "mentor": body.get("mentor_employee_id"),
               "track": body.get("development_track_label")})
        db.session.commit()
        return created({"added": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@career_dev_bp.post("/leadership-pipeline/ai-flight-risk-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_flight_risk_scan():
    """AI flags HiPo employees showing engagement decline before they leave."""
    try:
        insight = generate_ai_insights({"type": "hipo_flight_risk_prediction", "company_id": g.company_id})
        flagged = insight.get("flagged_employee_ids", [])
        for eid in flagged:
            db.session.execute(text(
                "UPDATE leadership_pipeline SET flight_risk_flag = TRUE WHERE employee_id = :eid"
            ), {"eid": eid})
        db.session.commit()
        return success({"flagged_count": len(flagged)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)
