"""
FILE: backend/routes/mss_team_management_routes.py
NepHR Pro -- HR Services & Support > Manager Self Service (MSS)
(11 pages: Team Dashboard, Team Attendance, Approval Center,
Performance Review, Team Activity Today/This Week/This Month/This
Quarter/This Year, Forward Cash Advance Request, Minutes of Meeting)
URL prefix: /api/v1/mss

The 5 "Team Activity" endpoints reuse the EXISTING
employee_activity_log (ESS Batch 4 session) via manager-scoped views
-- never a second log. Forward Cash Advance Request extends the
EXISTING salary_advances. Performance Review (MSS) tracks process
stage on top of the EXISTING performance_appraisals.

Nepal legal grounding: Section 20 (8h/day, 48h/week, OT compliance
surfaced to the approving manager); delegated-authority requirement
for leave/overtime approval; Section 34-35 (deduction-consent rules
for cash advances); probation up to 6 months for performance assessment.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..ai.insights import generate_ai_insights

mss_bp = Blueprint("mss_team_management", __name__, url_prefix="/api/v1/mss")


def _direct_report_ids(manager_id):
    """Helper: resolve the manager's direct report employee IDs."""
    rows = db.session.execute(text(
        "SELECT id FROM employees WHERE manager_id = :mid"
    ), {"mid": manager_id}).fetchall()
    return [str(r[0]) for r in rows]


# ════════════════════════════════════════════════════════════════
# PAGE 1: TEAM DASHBOARD
# ════════════════════════════════════════════════════════════════

@mss_bp.get("/dashboard/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_dashboard(manager_id):
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_team_dashboard_kpis WHERE manager_id = :mid"
        ), {"mid": manager_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# ════════════════════════════════════════════════════════════════
# PAGE 2: TEAM ATTENDANCE (manager-scoped over EXISTING attendance records)
# ════════════════════════════════════════════════════════════════

@mss_bp.get("/attendance/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_attendance(manager_id):
    try:
        report_ids = _direct_report_ids(manager_id)
        if not report_ids: return success([])
        rows = db.session.execute(text(
            "SELECT * FROM v_team_attendance_today WHERE manager_id = :mid"
        ), {"mid": manager_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 3: APPROVAL CENTER (unified queue)
# ════════════════════════════════════════════════════════════════

@mss_bp.get("/approvals/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_center(manager_id):
    try:
        report_ids = _direct_report_ids(manager_id)
        if not report_ids: return success([])
        rows = db.session.execute(text(
            "SELECT * FROM v_approval_center WHERE employee_id = ANY(:ids)"
        ), {"ids": report_ids}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.put("/approvals/<request_type>/<request_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def decide_approval(request_type, request_id):
    """Routes the approve/reject decision to the correct underlying table based on request_type."""
    body = request.get_json() or {}
    decision = body.get("decision")
    if decision not in ("approved", "rejected"): return error("decision must be approved or rejected", 422)
    table_map = {
        "leave": ("leave_applications", "status"),
        "cash_advance": ("salary_advances", "approval_stage"),
    }
    if request_type not in table_map: return error("Unsupported request_type", 400)
    table, column = table_map[request_type]
    new_value = "approved" if decision == "approved" else "rejected"
    try:
        db.session.execute(text(f"""
            UPDATE {table} SET {column} = :val WHERE id = :rid AND company_id = :cid
        """), {"val": new_value, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"decided": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: PERFORMANCE REVIEW (MSS)
# ════════════════════════════════════════════════════════════════

@mss_bp.get("/performance-reviews/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_performance_reviews(manager_id):
    try:
        report_ids = _direct_report_ids(manager_id)
        if not report_ids: return success([])
        rows = db.session.execute(text(
            "SELECT * FROM v_team_performance_reviews WHERE employee_id = ANY(:ids)"
        ), {"ids": report_ids}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.put("/performance-reviews/<stage_id>/submit-assessment")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def submit_manager_assessment(stage_id):
    """DB trigger notifies the employee on the stage transition."""
    body = request.get_json() or {}
    if not body.get("manager_assessment_notes"): return error("manager_assessment_notes required", 422)
    try:
        db.session.execute(text("""
            UPDATE performance_review_stages SET stage = 'hr_review', manager_assessment_notes = :notes, manager_assessed_by = :user
            WHERE id = :sid AND company_id = :cid
        """), {"notes": body["manager_assessment_notes"], "user": g.user_id, "sid": stage_id, "cid": g.company_id})
        db.session.commit()
        return success({"submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@mss_bp.post("/performance-reviews/ai-check-calibration")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_check_calibration():
    """AI flags vague/uncalibrated language before the manager submits."""
    body = request.get_json() or {}
    if not body.get("notes"): return error("notes required", 422)
    try:
        insight = generate_ai_insights({"type": "performance_review_calibration_check", "notes": body["notes"]})
        return success({"flags": insight.get("flags", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGES 5-9: TEAM ACTIVITY (manager-scoped over EXISTING employee_activity_log)
# ════════════════════════════════════════════════════════════════

@mss_bp.get("/team-activity/today/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_activity_today(manager_id):
    try:
        report_ids = _direct_report_ids(manager_id)
        if not report_ids: return success([])
        rows = db.session.execute(text(
            "SELECT * FROM v_team_activity_today WHERE actor_employee_id = ANY(:ids)"
        ), {"ids": report_ids}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.get("/team-activity/week/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_activity_week(manager_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_team_activity_this_week WHERE manager_id = :mid"
        ), {"mid": manager_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.get("/team-activity/month/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_activity_month(manager_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_team_activity_this_month WHERE manager_id = :mid"
        ), {"mid": manager_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.get("/team-activity/quarter/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_activity_quarter(manager_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_team_activity_this_quarter WHERE manager_id = :mid"
        ), {"mid": manager_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.get("/team-activity/year/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_activity_year(manager_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_team_activity_this_year WHERE manager_id = :mid"
        ), {"mid": manager_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.post("/team-activity/ai-retention-scan")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_retention_scan():
    """AI surfaces retention-risk signals from activity-drop patterns -- for Team Activity This Year."""
    body = request.get_json() or {}
    if not body.get("manager_id"): return error("manager_id required", 422)
    try:
        insight = generate_ai_insights({"type": "team_retention_signal_scan", "manager_id": body["manager_id"]})
        return success({"signals": insight.get("signals", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 10: FORWARD CASH ADVANCE REQUEST
# ════════════════════════════════════════════════════════════════

@mss_bp.get("/cash-advances/pending/<manager_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def pending_cash_advances(manager_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pending_cash_advances_for_manager WHERE manager_id = :mid"
        ), {"mid": manager_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.post("/cash-advances/<advance_id>/forward")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def forward_cash_advance(advance_id):
    """DB trigger advances salary_advances.approval_stage and notifies the new approver."""
    body = request.get_json() or {}
    required = ["forwarded_to", "justification_note"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO cash_advance_forwards (company_id, salary_advance_id, forwarded_by, forwarded_to, justification_note, forwarded_at)
            VALUES (:cid, :advance, :user, :to_id, :note, NOW()) RETURNING id
        """), {"cid": g.company_id, "advance": advance_id, "user": g.user_id, "to_id": body["forwarded_to"], "note": body["justification_note"]})
        forward_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"forward_id": forward_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 11: MINUTES OF MEETING
# ════════════════════════════════════════════════════════════════

@mss_bp.get("/meetings/<organizer_id>")
def my_meetings(organizer_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_meeting_minutes_dashboard WHERE organizer_employee_id = :oid"
        ), {"oid": organizer_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@mss_bp.post("/meetings")
def create_meeting():
    body = request.get_json() or {}
    required = ["organizer_employee_id", "title"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO meeting_minutes (company_id, organizer_employee_id, title, attendee_employee_ids, meeting_date, capture_mode, transcript_raw, summary_text, created_at)
            VALUES (:cid, :org, :title, :attendees, :date, :mode, :transcript, :summary, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "org": body["organizer_employee_id"], "title": body["title"],
               "attendees": body.get("attendee_employee_ids", []), "date": body.get("meeting_date"),
               "mode": body.get("capture_mode", "text"), "transcript": body.get("transcript_raw"), "summary": body.get("summary_text")})
        meeting_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"meeting_id": meeting_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@mss_bp.post("/meetings/ai-transcribe")
def ai_transcribe():
    """AI transcribes + summarizes a voice recording, extracting action items automatically."""
    body = request.get_json() or {}
    if not body.get("audio_reference"): return error("audio_reference required", 422)
    try:
        insight = generate_ai_insights({"type": "meeting_transcription_summary", "audio_reference": body["audio_reference"]})
        return success({
            "transcript": insight.get("transcript"),
            "summary": insight.get("summary"),
            "extracted_action_items": insight.get("action_items", []),
        })
    except Exception as e:
        return error(str(e), 500)


@mss_bp.post("/meetings/<meeting_id>/action-items")
def add_action_item(meeting_id):
    """DB trigger notifies the assigned owner."""
    body = request.get_json() or {}
    if not body.get("description"): return error("description required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO meeting_action_items (meeting_minutes_id, company_id, description, assigned_to_employee_id, due_date, created_at)
            VALUES (:mid, :cid, :desc, :assignee, :due, NOW()) RETURNING id
        """), {"mid": meeting_id, "cid": body.get("company_id"), "desc": body["description"], "assignee": body.get("assigned_to_employee_id"), "due": body.get("due_date")})
        item_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"action_item_id": item_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@mss_bp.put("/meetings/<meeting_id>/finalize")
def finalize_meeting(meeting_id):
    """DB trigger notifies all attendees."""
    try:
        db.session.execute(text("""
            UPDATE meeting_minutes SET status = 'finalized' WHERE id = :mid
        """), {"mid": meeting_id})
        db.session.commit()
        return success({"finalized": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)
