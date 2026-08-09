"""
FILE: backend/routes/employee_engagement_routes.py
NepHR Pro -- Employee Experience & Culture > Employee Engagement
(9 pages: Engagement Dashboard, Announcement Board, Employee
Engagement, Employee Survey, Employee Feedback, Suggestion Box,
Employee Events, Appreciation Program, Internal Communication)
URL prefix: /api/v1/engagement

Nepal Labour Act 2017 (2074): Section 114 (Labor Relations Committee);
Section 108 (Company Bylaws act as the formal announcement board);
Chapter 5 OHS communication duties; privacy for personal/medical/
remuneration data; non-discrimination in announcements and recognition.
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

engagement_bp = Blueprint("employee_engagement", __name__, url_prefix="/api/v1/engagement")


# ════════════════════════════════════════════════════════════════
# PAGE 1: ENGAGEMENT DASHBOARD
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/dashboard/kpis")
@require_auth
def dashboard_kpis():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_engagement_dashboard_kpis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@engagement_bp.get("/dashboard/activity-feed")
@require_auth
def activity_feed():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_activity_feed WHERE company_id = :cid LIMIT 30"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 2: ANNOUNCEMENT BOARD
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/announcements")
@require_auth
def list_announcements():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_announcement_board WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.post("/announcements")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_announcement():
    """DB trigger auto-notifies every targeted employee."""
    body = request.get_json() or {}
    required = ["title", "message"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO announcements (company_id, title, message, channel, target_department_id, is_pinned, posted_by, posted_at)
            VALUES (:cid, :title, :msg, :channel, :dept, :pinned, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "title": body["title"], "msg": body["message"], "channel": body.get("channel", "company_updates"),
               "dept": body.get("target_department_id"), "pinned": body.get("is_pinned", False), "user": g.user_id})
        ann_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"announcement_id": ann_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.post("/announcements/<ann_id>/react")
def react_announcement(ann_id):
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO announcement_reactions (announcement_id, employee_id, company_id, reaction_type)
            VALUES (:ann, :eid, :cid, :rtype) ON CONFLICT (announcement_id, employee_id) DO NOTHING
        """), {"ann": ann_id, "eid": body["employee_id"], "cid": body.get("company_id"), "rtype": body.get("reaction_type", "like")})
        db.session.commit()
        return success({"reacted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: EMPLOYEE ENGAGEMENT (community groups)
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/groups")
@require_auth
def list_groups():
    try:
        rows = db.session.execute(text("""
            SELECT cg.*, COUNT(cgm.id) AS member_count
            FROM community_groups cg LEFT JOIN community_group_members cgm ON cgm.community_group_id = cg.id
            WHERE cg.company_id = :cid GROUP BY cg.id
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.post("/groups")
def create_group():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO community_groups (company_id, name, category, created_by, created_at)
            VALUES (:cid, :name, :category, :user, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "name": body["name"], "category": body.get("category", "interest_group"), "user": body.get("created_by")})
        group_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"group_id": group_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.post("/groups/<group_id>/join")
def join_group(group_id):
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO community_group_members (community_group_id, employee_id, company_id, joined_at)
            VALUES (:gid, :eid, :cid, NOW()) ON CONFLICT (community_group_id, employee_id) DO NOTHING
        """), {"gid": group_id, "eid": body["employee_id"], "cid": body.get("company_id")})
        db.session.commit()
        return success({"joined": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: EMPLOYEE SURVEY
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/surveys")
@require_auth
def list_surveys():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM engagement_surveys WHERE company_id = :cid AND is_active = TRUE"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.get("/surveys/results")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def survey_results():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_survey_results_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.post("/surveys/<survey_id>/respond")
def submit_survey_response(survey_id):
    """Public/ESS -- anonymous by default. AI sentiment analysis runs on open-text responses."""
    body = request.get_json() or {}
    if body.get("rating") is None: return error("rating required", 422)
    is_anonymous = body.get("is_anonymous", True)
    try:
        sentiment = None
        flag_note = None
        if body.get("open_text_response"):
            insight = generate_ai_insights({"type": "survey_sentiment_analysis", "text": body["open_text_response"]})
            sentiment = insight.get("sentiment")
            flag_note = insight.get("flag_note")

        result = db.session.execute(text("""
            INSERT INTO survey_responses (engagement_survey_id, company_id, respondent_employee_id, is_anonymous, rating, open_text_response, sentiment, sentiment_flag_note, submitted_at)
            VALUES (:sid, :cid, :eid, :anon, :rating, :text, :sentiment, :flag, NOW()) RETURNING id
        """), {"sid": survey_id, "cid": body.get("company_id"), "eid": None if is_anonymous else body.get("employee_id"),
               "anon": is_anonymous, "rating": body["rating"], "text": body.get("open_text_response"), "sentiment": sentiment, "flag": flag_note})
        resp_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"response_id": resp_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 5: EMPLOYEE FEEDBACK
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/feedback/<employee_id>")
def my_feedback(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM employee_feedback_tickets WHERE employee_id = :eid ORDER BY submitted_at DESC"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.post("/feedback")
def submit_feedback():
    """Public/ESS -- option to route directly to HR, bypassing the manager."""
    body = request.get_json() or {}
    required = ["employee_id", "topic", "details"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO employee_feedback_tickets (company_id, employee_id, topic, details, is_confidential, routed_to, submitted_at)
            VALUES (:cid, :eid, :topic, :details, :confidential, :routed, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "topic": body["topic"], "details": body["details"],
               "confidential": body.get("is_confidential", False), "routed": body.get("routed_to", "manager")})
        ticket_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"ticket_id": ticket_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.put("/feedback/<ticket_id>/status")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def update_feedback_status(ticket_id):
    """DB trigger notifies the employee on every status change."""
    body = request.get_json() or {}
    if not body.get("status"): return error("status required", 422)
    try:
        db.session.execute(text("""
            UPDATE employee_feedback_tickets SET status = :status, resolution_note = :note WHERE id = :tid AND company_id = :cid
        """), {"status": body["status"], "note": body.get("resolution_note"), "tid": ticket_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 6: SUGGESTION BOX
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/suggestions")
@require_auth
def list_suggestions():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_suggestions_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.post("/suggestions")
def submit_suggestion():
    """Public/ESS -- anonymous by default."""
    body = request.get_json() or {}
    if not body.get("idea_text"): return error("idea_text required", 422)
    is_anonymous = body.get("is_anonymous", True)
    try:
        result = db.session.execute(text("""
            INSERT INTO suggestions (company_id, submitted_by_employee_id, is_anonymous, idea_text, submitted_at)
            VALUES (:cid, :eid, :anon, :idea, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": None if is_anonymous else body.get("employee_id"), "anon": is_anonymous, "idea": body["idea_text"]})
        sug_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"suggestion_id": sug_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.post("/suggestions/<suggestion_id>/vote")
def vote_suggestion(suggestion_id):
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO suggestion_votes (suggestion_id, employee_id, company_id, voted_at)
            VALUES (:sid, :eid, :cid, NOW()) ON CONFLICT (suggestion_id, employee_id) DO NOTHING
        """), {"sid": suggestion_id, "eid": body["employee_id"], "cid": body.get("company_id")})
        db.session.commit()
        return success({"voted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.put("/suggestions/<suggestion_id>/status")
@require_auth
@require_role("super_admin", "hr_manager")
def update_suggestion_status(suggestion_id):
    """DB trigger notifies the (non-anonymous) submitter when implemented."""
    body = request.get_json() or {}
    if not body.get("status"): return error("status required", 422)
    try:
        db.session.execute(text("""
            UPDATE suggestions SET status = :status, resolution_note = :note WHERE id = :sid AND company_id = :cid
        """), {"status": body["status"], "note": body.get("resolution_note"), "sid": suggestion_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.post("/suggestions/ai-detect-duplicates")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_detect_duplicates():
    """AI groups similar/duplicate suggestions before HR review."""
    try:
        insight = generate_ai_insights({"type": "suggestion_duplicate_detection", "company_id": g.company_id})
        return success({"duplicate_groups": insight.get("duplicate_groups", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 7: EMPLOYEE EVENTS
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/events")
@require_auth
def list_events():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_events_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.post("/events")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_event():
    body = request.get_json() or {}
    required = ["title", "event_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO company_events (company_id, title, event_type, event_format, event_date, event_time_label, virtual_meeting_url, created_by, created_at)
            VALUES (:cid, :title, :etype, :format, :date, :time, :url, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "title": body["title"], "etype": body.get("event_type", "town_hall"), "format": body.get("event_format", "in_person"),
               "date": body["event_date"], "time": body.get("event_time_label"), "url": body.get("virtual_meeting_url"), "user": g.user_id})
        event_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"event_id": event_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.post("/events/<event_id>/rsvp")
def rsvp_event(event_id):
    """One-click RSVP. DB trigger notifies the event organizer."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO event_rsvps (company_event_id, employee_id, company_id, rsvp_status, rsvp_at)
            VALUES (:eventid, :eid, :cid, :status, NOW())
            ON CONFLICT (company_event_id, employee_id) DO UPDATE SET rsvp_status = EXCLUDED.rsvp_status
        """), {"eventid": event_id, "eid": body["employee_id"], "cid": body.get("company_id"), "status": body.get("rsvp_status", "going")})
        db.session.commit()
        return success({"rsvp_recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 8: APPRECIATION PROGRAM
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/recognition/wall")
@require_auth
def recognition_wall():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_recognition_wall WHERE company_id = :cid LIMIT 50"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.get("/recognition/points/<employee_id>")
def my_points_balance(employee_id):
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_employee_points_balance WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()
        return success(dict(row._mapping) if row else {"balance": 0})
    except Exception:
        return success({"balance": 0})


@engagement_bp.post("/recognition")
def give_recognition():
    """DB trigger credits the points ledger AND notifies the recipient."""
    body = request.get_json() or {}
    required = ["from_employee_id", "to_employee_id", "value_tag", "message"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO peer_recognitions (company_id, from_employee_id, to_employee_id, value_tag, message, points_awarded, created_at)
            VALUES (:cid, :fromid, :toid, :tag, :msg, :points, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "fromid": body["from_employee_id"], "toid": body["to_employee_id"],
               "tag": body["value_tag"], "msg": body["message"], "points": body.get("points_awarded", 20)})
        rec_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"recognition_id": rec_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.post("/recognition/ai-overdue-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_overdue_recognition_scan():
    """AI nudges managers when a team member hasn't been recognized in 60+ days."""
    try:
        insight = generate_ai_insights({"type": "overdue_recognition_scan", "company_id": g.company_id})
        return success({"flagged_employees": insight.get("flagged_employees", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 9: INTERNAL COMMUNICATION
# ════════════════════════════════════════════════════════════════

@engagement_bp.get("/threads")
@require_auth
def list_threads():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_communication_threads WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@engagement_bp.post("/threads")
def create_thread():
    body = request.get_json() or {}
    required = ["title", "started_by"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO communication_threads (company_id, title, started_by, department_id, created_at)
            VALUES (:cid, :title, :user, :dept, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "title": body["title"], "user": body["started_by"], "dept": body.get("department_id")})
        thread_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"thread_id": thread_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.post("/threads/<thread_id>/reply")
def reply_thread(thread_id):
    body = request.get_json() or {}
    required = ["employee_id", "reply_text"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO thread_replies (communication_thread_id, company_id, employee_id, reply_text, replied_at)
            VALUES (:tid, :cid, :eid, :text, NOW()) RETURNING id
        """), {"tid": thread_id, "cid": body.get("company_id"), "eid": body["employee_id"], "text": body["reply_text"]})
        reply_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"reply_id": reply_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@engagement_bp.get("/knowledge-base/search")
def search_knowledge_base():
    """Full-text search across the company knowledge base."""
    query = request.args.get("q", "")
    try:
        rows = db.session.execute(text("""
            SELECT * FROM knowledge_base_articles
            WHERE company_id = :cid AND to_tsvector('english', title || ' ' || COALESCE(content_body,'')) @@ to_tsquery('english', :query)
        """), {"cid": request.args.get("company_id"), "query": query.replace(" ", " & ")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@engagement_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["announcements", "surveys", "events"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"engagement_{module}")
    return jsonify(result), 200 if result["success"] else 422


@engagement_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"engagement_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"engagement_{module}_template.xlsx")
