"""
FILE: backend/routes/hr_helpdesk_routes.py
NepHR Pro -- HR Services & Support > HR Helpdesk (4 pages:
HR Ticketing System, Employee Queries, HR Consultation, Case Tracking)
URL prefix: /api/v1/hr-helpdesk

Deliberately distinct from complaints (Employee Relations,
investigation-grade) and employee_feedback_tickets (Employee
Engagement, open personal channel). Escalation into the EXISTING
grievances table never recalculates the Section 113-115 statutory
clock a second time -- that table's own trigger handles its deadlines
independently.

Nepal legal grounding: Labour Relations Committee (10+ employees) as
the bipartite consultation forum this helpdesk digitizes; written
grievances trigger 7-day negotiation start, 21-day target resolution;
annual Labour Audit requires a presentable grievance-handling record.
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

helpdesk_bp = Blueprint("hr_helpdesk", __name__, url_prefix="/api/v1/hr-helpdesk")


# ════════════════════════════════════════════════════════════════
# PAGE 1: HR TICKETING SYSTEM
# ════════════════════════════════════════════════════════════════

@helpdesk_bp.get("/tickets")
@require_auth
@require_role("super_admin", "hr_manager")
def list_tickets():
    """The agent console queue, SLA-color-coded."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_hr_helpdesk_dashboard WHERE company_id = :cid ORDER BY sla_hours_left ASC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@helpdesk_bp.post("/tickets")
def create_ticket():
    """
    Public/ESS -- omnichannel intake. DB trigger auto-sets the SLA
    deadline based on category (payroll=24h, benefits/leave=24-48h,
    general=72h).
    """
    body = request.get_json() or {}
    required = ["employee_id", "category", "subject", "description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        ticket_no = f"HRT-{datetime.now().year}-{db.session.execute(text('SELECT COUNT(*)+1 FROM hr_helpdesk_tickets')).scalar():03d}"

        # Tier-0 AI triage attempt before creating a human-routed ticket
        ai_resolution = None
        triage = generate_ai_insights({"type": "tier0_chatbot_triage", "subject": body["subject"], "description": body["description"]})
        if triage.get("auto_resolved"):
            ai_resolution = triage.get("resolution_text")

        result = db.session.execute(text("""
            INSERT INTO hr_helpdesk_tickets (company_id, ticket_no, employee_id, category, subject, description, channel, tier, status, resolution_note, resolved_at, created_at)
            VALUES (:cid, :tno, :eid, :cat, :subj, :desc, :channel, :tier, :status, :resolution, :resolved_at, NOW())
            RETURNING id
        """), {"cid": body.get("company_id"), "tno": ticket_no, "eid": body["employee_id"], "cat": body["category"],
               "subj": body["subject"], "desc": body["description"], "channel": body.get("channel", "web_portal"),
               "tier": "tier_0" if ai_resolution else "tier_1", "status": "resolved" if ai_resolution else "open",
               "resolution": ai_resolution, "resolved_at": datetime.now() if ai_resolution else None})
        ticket_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"ticket_id": ticket_id, "ticket_no": ticket_no, "auto_resolved": bool(ai_resolution)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@helpdesk_bp.put("/tickets/<ticket_id>/status")
@require_auth
@require_role("super_admin", "hr_manager")
def update_ticket_status(ticket_id):
    """DB trigger notifies the employee on every Received -> In Progress -> Resolved transition."""
    body = request.get_json() or {}
    if not body.get("status"): return error("status required", 422)
    try:
        db.session.execute(text("""
            UPDATE hr_helpdesk_tickets SET status = :status, resolution_note = :note WHERE id = :tid AND company_id = :cid
        """), {"status": body["status"], "note": body.get("resolution_note"), "tid": ticket_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@helpdesk_bp.put("/tickets/<ticket_id>/reassign")
@require_auth
@require_role("super_admin", "hr_manager")
def reassign_ticket(ticket_id):
    body = request.get_json() or {}
    if not body.get("agent_id"): return error("agent_id required", 422)
    try:
        db.session.execute(text("""
            UPDATE hr_helpdesk_tickets SET assigned_agent_id = :agent, tier = :tier WHERE id = :tid AND company_id = :cid
        """), {"agent": body["agent_id"], "tier": body.get("tier", "tier_1"), "tid": ticket_id, "cid": g.company_id})
        db.session.commit()
        return success({"reassigned": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@helpdesk_bp.put("/tickets/<ticket_id>/escalate-to-grievance")
@require_auth
@require_role("super_admin", "hr_manager")
def escalate_to_grievance(ticket_id):
    """
    Creates a row in the EXISTING grievances table (Employee Relations)
    -- its own trigger computes the Section 113-115 statutory deadlines
    independently. This route never recalculates that timeline itself.
    """
    body = request.get_json() or {}
    try:
        ticket = db.session.execute(text(
            "SELECT employee_id, subject, description FROM hr_helpdesk_tickets WHERE id = :tid AND company_id = :cid"
        ), {"tid": ticket_id, "cid": g.company_id}).fetchone()
        if not ticket: return not_found("Ticket")

        grievance_result = db.session.execute(text("""
            INSERT INTO grievances (company_id, employee_id, category, description, stage, submitted_at)
            VALUES (:cid, :eid, :cat, :desc, 'negotiation', NOW()) RETURNING id
        """), {"cid": g.company_id, "eid": ticket.employee_id, "cat": body.get("category", "Escalated from Helpdesk"), "desc": ticket.description})
        grievance_id = grievance_result.fetchone()[0]

        db.session.execute(text("""
            UPDATE hr_helpdesk_tickets SET escalated_grievance_id = :gid WHERE id = :tid
        """), {"gid": grievance_id, "tid": ticket_id})

        db.session.commit()
        return created({"grievance_id": str(grievance_id)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@helpdesk_bp.get("/sla-performance")
@require_auth
@require_role("super_admin", "hr_manager")
def sla_performance():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_helpdesk_sla_performance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 2: EMPLOYEE QUERIES (ESS self-service lens)
# ════════════════════════════════════════════════════════════════

@helpdesk_bp.get("/my-tickets/<employee_id>")
def my_tickets(employee_id):
    """Public/ESS -- 'My Tickets' personal dashboard."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_tickets WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@helpdesk_bp.get("/knowledge-base/search")
def search_kb():
    """Reuses the EXISTING knowledge_base_articles (Employee Engagement session) for predictive suggestions."""
    query = request.args.get("q", "")
    try:
        rows = db.session.execute(text("""
            SELECT * FROM knowledge_base_articles
            WHERE company_id = :cid AND to_tsvector('english', title || ' ' || COALESCE(content_body,'')) @@ to_tsquery('english', :query)
            LIMIT 5
        """), {"cid": request.args.get("company_id"), "query": query.replace(" ", " & ")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@helpdesk_bp.post("/ai-chatbot")
def ai_chatbot():
    """Public/ESS -- conversational Tier-0 AI assistant, tries to resolve before a ticket is even created."""
    body = request.get_json() or {}
    if not body.get("message"): return error("message required", 422)
    try:
        insight = generate_ai_insights({"type": "hr_chatbot_response", "message": body["message"]})
        return success({"response": insight.get("response"), "suggested_kb_articles": insight.get("suggested_kb_articles", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: HR CONSULTATION
# ════════════════════════════════════════════════════════════════

@helpdesk_bp.get("/consultants")
@require_auth
def list_consultants():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_consultant_directory WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@helpdesk_bp.get("/consultations/<employee_id>")
def my_consultations(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM hr_consultations WHERE employee_id = :eid ORDER BY scheduled_for DESC"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@helpdesk_bp.post("/consultations")
def book_consultation():
    """Public/ESS -- direct calendar booking. DB trigger notifies the consultant."""
    body = request.get_json() or {}
    required = ["employee_id", "hr_consultant_id", "topic", "scheduled_for"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO hr_consultations (company_id, employee_id, hr_consultant_id, topic, is_confidential, scheduled_for, created_at)
            VALUES (:cid, :eid, :consultant, :topic, :confidential, :slot, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "consultant": body["hr_consultant_id"],
               "topic": body["topic"], "confidential": body.get("is_confidential", True), "slot": body["scheduled_for"]})
        consultation_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"consultation_id": consultation_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@helpdesk_bp.put("/consultations/<consultation_id>/complete")
@require_auth
@require_role("super_admin", "hr_manager")
def complete_consultation(consultation_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE hr_consultations SET status = 'completed', notes = :notes WHERE id = :cid_consult AND company_id = :cid
        """), {"notes": body.get("notes"), "cid_consult": consultation_id, "cid": g.company_id})
        db.session.commit()
        return success({"completed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@helpdesk_bp.post("/consultations/ai-suggest-specialist")
def ai_suggest_specialist():
    """AI routes the right specialist based on topic -- benefits disputes route differently than conflict mediation."""
    body = request.get_json() or {}
    if not body.get("topic"): return error("topic required", 422)
    try:
        insight = generate_ai_insights({"type": "consultation_specialist_routing", "topic": body["topic"]})
        return success({"suggested_consultant_id": insight.get("suggested_consultant_id")})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: CASE TRACKING (HR agent console)
# ════════════════════════════════════════════════════════════════

@helpdesk_bp.get("/cases/<ticket_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def case_360_view(ticket_id):
    """The 360-degree employee pane + full audit timeline, in one call."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_case_tracking_360 WHERE id = :tid AND company_id = :cid"
        ), {"tid": ticket_id, "cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@helpdesk_bp.post("/cases/<ticket_id>/notes")
@require_auth
@require_role("super_admin", "hr_manager")
def add_case_note(ticket_id):
    """Canned response (customer-facing) or internal note (hidden from the employee)."""
    body = request.get_json() or {}
    if not body.get("note_text"): return error("note_text required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO hr_helpdesk_ticket_updates (hr_helpdesk_ticket_id, company_id, author_id, is_internal_note, note_text, logged_at)
            VALUES (:tid, :cid, :user, :internal, :note, NOW()) RETURNING id
        """), {"tid": ticket_id, "cid": g.company_id, "user": g.user_id, "internal": body.get("is_internal_note", False), "note": body["note_text"]})
        note_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"note_id": note_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@helpdesk_bp.post("/cases/ai-next-best-action")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_next_best_action():
    """AI analyzes past HR consultation/case data to suggest the next best action for the agent."""
    body = request.get_json() or {}
    if not body.get("ticket_id"): return error("ticket_id required", 422)
    try:
        insight = generate_ai_insights({"type": "case_next_best_action", "ticket_id": body["ticket_id"]})
        return success({"suggested_action": insight.get("suggested_action")})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@helpdesk_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["tickets", "consultations"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"helpdesk_{module}")
    return jsonify(result), 200 if result["success"] else 422


@helpdesk_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"helpdesk_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"helpdesk_{module}_template.xlsx")
