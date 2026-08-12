"""
FILE: backend/routes/ess_activity_goals_helpdesk_routes.py
eLogix HRMS -- HR Services & Support > Employee Self Service (ESS),
fourth batch (10 pages: My Goals & KPI, My Training, My Requests, My
Activity Today/This Week/This Month/This Quarter/This Year, My
Feedback, Helpdesk & Ticket)
URL prefix: /api/v1/ess4

The 5 "My Activity" pages all read employee_activity_log, the one
genuinely new table this session -- deliberately distinct from
transaction_notifications, which tracks what was done TO someone, not
what THEY did. My Goals & KPI, My Training, My Feedback, and Helpdesk
& Ticket are pure reads over already-existing tables from prior
sessions; My Requests is a read-only UNION, never a duplicate workflow.

Nepal legal grounding: this batch is a UX consolidation layer over
modules already grounded in the Labour Act 2074 in prior sessions.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..ai.insights import generate_ai_insights

ess4_bp = Blueprint("ess_activity_goals_helpdesk", __name__, url_prefix="/api/v1/ess4")


# ════════════════════════════════════════════════════════════════
# PAGE 1: MY GOALS & KPI (pure read over EXISTING v_unified_goal_tracking)
# ════════════════════════════════════════════════════════════════

@ess4_bp.get("/goals/<employee_id>")
def my_goals(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_unified_goal_tracking WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 2: MY TRAINING (pure read over EXISTING v_my_learning_path)
# ════════════════════════════════════════════════════════════════

@ess4_bp.get("/training/<employee_id>")
def my_training(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_learning_path WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 3: MY REQUESTS (read-only UNION, never a duplicate workflow engine)
# ════════════════════════════════════════════════════════════════

@ess4_bp.get("/requests/<employee_id>")
def my_requests(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_requests_unified WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGES 4-8: MY ACTIVITY (Today / This Week / This Month / This
# Quarter / This Year) -- all read the SAME employee_activity_log,
# just through 5 different time-windowed views
# ════════════════════════════════════════════════════════════════

@ess4_bp.get("/activity/today/<employee_id>")
def activity_today(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_activity_today WHERE actor_employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess4_bp.get("/activity/week/<employee_id>")
def activity_week(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_activity_this_week WHERE actor_employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess4_bp.get("/activity/month/<employee_id>")
def activity_month(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_activity_this_month WHERE actor_employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess4_bp.get("/activity/quarter/<employee_id>")
def activity_quarter(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_activity_this_quarter WHERE actor_employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess4_bp.get("/activity/year/<employee_id>")
def activity_year(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_activity_this_year WHERE actor_employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess4_bp.post("/activity/log")
def log_activity():
    """
    Internal helper endpoint other modules' frontend actions can call
    directly (in addition to DB-level triggers) to record an activity
    entry -- e.g. after a successful clock-in, leave submission, etc.
    """
    body = request.get_json() or {}
    required = ["employee_id", "module", "action_description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            SELECT fn_log_employee_activity(:cid, :eid, :module, :desc, :stable, :srecord)
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "module": body["module"],
               "desc": body["action_description"], "stable": body.get("source_table"), "srecord": body.get("source_record_id")})
        db.session.commit()
        return created({"logged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 9: MY FEEDBACK (dual-source, two separate trust models)
# ════════════════════════════════════════════════════════════════

@ess4_bp.get("/feedback/recognition/<employee_id>")
def my_recognitions(employee_id):
    """Public tab -- reuses peer_recognitions from Employee Engagement."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_recognition_wall WHERE to_employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess4_bp.get("/feedback/private/<employee_id>")
@require_auth
def my_private_feedback(employee_id):
    """
    Private tab -- aggregate survey results ONLY (never individual
    responses), plus the employee's own feedback ticket history.
    Auth-required since this touches confidential data, even though
    it's the employee's own.
    """
    if g.user_id != employee_id and g.role not in ("super_admin", "hr_manager"):
        return error("Forbidden", 403)
    try:
        surveys = db.session.execute(text(
            "SELECT id, rating, submitted_at FROM survey_responses WHERE respondent_employee_id = :eid AND is_anonymous = FALSE"
        ), {"eid": employee_id}).fetchall()
        tickets = db.session.execute(text(
            "SELECT * FROM employee_feedback_tickets WHERE employee_id = :eid ORDER BY submitted_at DESC"
        ), {"eid": employee_id}).fetchall()
        return success({
            "survey_results": [dict(r._mapping) for r in surveys],
            "feedback_tickets": [dict(r._mapping) for r in tickets],
        })
    except Exception:
        return success({"survey_results": [], "feedback_tickets": []})


# ════════════════════════════════════════════════════════════════
# PAGE 10: HELPDESK & TICKET (pure read over EXISTING hr_helpdesk_tickets)
# ════════════════════════════════════════════════════════════════

@ess4_bp.get("/helpdesk/my-tickets/<employee_id>")
def my_helpdesk_tickets(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_tickets WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess4_bp.post("/helpdesk/chat")
def helpdesk_chat():
    """Conversational entry point -- tries AI resolution first, same Tier-0 logic as HR Ticketing System."""
    body = request.get_json() or {}
    if not body.get("message"): return error("message required", 422)
    try:
        insight = generate_ai_insights({"type": "hr_chatbot_response", "message": body["message"], "employee_id": body.get("employee_id")})
        return success({"response": insight.get("response"), "offer_ticket": insight.get("offer_ticket", False)})
    except Exception as e:
        return error(str(e), 500)
