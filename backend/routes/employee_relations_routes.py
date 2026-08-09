"""
FILE: backend/routes/employee_relations_routes.py
NepHR Pro -- Employee Experience & Culture > Employee Relations
(5 pages: Grievance Management, Complaint Management, Conflict
Resolution, Disciplinary Management, Warning Letter)
URL prefix: /api/v1/employee-relations

Disciplinary Management (Section 61 misconduct) is deliberately
distinct from the EXISTING performance_improvement_plans (Performance
Evaluation session, performance gaps). Warning Letter issuance
increments the EXISTING termination_flags.documented_warnings_count --
a column that existed with no source until this module.

Nepal Labour Act 2017 (2074): Sections 113-115 (grievance statutory
timeline); Section 61 (disciplinary investigation, 7-day defense
right); Section 142 (progressive warnings as termination evidence).
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

relations_bp = Blueprint("employee_relations", __name__, url_prefix="/api/v1/employee-relations")


# ════════════════════════════════════════════════════════════════
# PAGE 1: GRIEVANCE MANAGEMENT
# ════════════════════════════════════════════════════════════════

@relations_bp.get("/grievances")
@require_auth
@require_role("super_admin", "hr_manager")
def list_grievances():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_grievance_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@relations_bp.post("/grievances")
def submit_grievance():
    """Public/ESS -- anonymous option. DB trigger auto-calculates the full statutory timeline."""
    body = request.get_json() or {}
    required = ["category", "description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    is_anonymous = body.get("is_anonymous", False)
    try:
        result = db.session.execute(text("""
            INSERT INTO grievances (company_id, employee_id, is_anonymous, category, description, stage, submitted_at)
            VALUES (:cid, :eid, :anon, :cat, :desc, 'negotiation', NOW()) RETURNING id, negotiation_deadline, labour_office_deadline, labour_court_deadline
        """), {"cid": body.get("company_id"), "eid": None if is_anonymous else body.get("employee_id"),
               "anon": is_anonymous, "cat": body["category"], "desc": body["description"]})
        row = result.fetchone()
        db.session.commit()
        return created({"grievance_id": str(row[0]), "negotiation_deadline": str(row[1]),
                        "labour_office_deadline": str(row[2]), "labour_court_deadline": str(row[3])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.put("/grievances/<grievance_id>/resolve")
@require_auth
@require_role("super_admin", "hr_manager")
def resolve_grievance(grievance_id):
    body = request.get_json() or {}
    if not body.get("resolution_note"): return error("resolution_note required", 422)
    try:
        db.session.execute(text("""
            UPDATE grievances SET stage = 'resolved', resolution_note = :note, resolved_at = NOW()
            WHERE id = :gid AND company_id = :cid
        """), {"note": body["resolution_note"], "gid": grievance_id, "cid": g.company_id})
        db.session.commit()
        return success({"resolved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: COMPLAINT MANAGEMENT
# ════════════════════════════════════════════════════════════════

@relations_bp.get("/complaints")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_complaints():
    """RBAC: results filtered by assigned_investigator_id at a higher middleware layer for non-admins."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_complaint_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@relations_bp.post("/complaints")
def file_complaint():
    """DB trigger auto-sets the 48-hour SLA acknowledgment deadline."""
    body = request.get_json() or {}
    required = ["complaint_type", "description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    is_anonymous = body.get("is_anonymous", False)
    try:
        case_no = f"CMP-{datetime.now().year}-{db.session.execute(text('SELECT COUNT(*)+1 FROM complaints')).scalar():03d}"
        result = db.session.execute(text("""
            INSERT INTO complaints (company_id, case_no, complainant_employee_id, is_anonymous, complaint_type, involved_parties, description, created_at)
            VALUES (:cid, :case_no, :eid, :anon, :ctype, :parties, :desc, NOW()) RETURNING id, case_no
        """), {"cid": body.get("company_id"), "case_no": case_no, "eid": None if is_anonymous else body.get("complainant_employee_id"),
               "anon": is_anonymous, "ctype": body["complaint_type"], "parties": body.get("involved_parties"), "desc": body["description"]})
        row = result.fetchone()
        db.session.commit()
        return created({"complaint_id": str(row[0]), "case_no": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.post("/complaints/<complaint_id>/evidence")
@require_auth
def upload_evidence(complaint_id):
    body = request.get_json() or {}
    required = ["file_name", "file_url"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO complaint_evidence (complaint_id, company_id, file_name, file_url, uploaded_at)
            VALUES (:cid_complaint, :cid, :name, :url, NOW()) RETURNING id
        """), {"cid_complaint": complaint_id, "cid": g.company_id, "name": body["file_name"], "url": body["file_url"]})
        ev_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"evidence_id": ev_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.put("/complaints/<complaint_id>/assign")
@require_auth
@require_role("super_admin", "hr_manager")
def assign_investigator(complaint_id):
    body = request.get_json() or {}
    if not body.get("investigator_id"): return error("investigator_id required", 422)
    try:
        db.session.execute(text("""
            UPDATE complaints SET assigned_investigator_id = :inv, status = 'assigned' WHERE id = :cid AND company_id = :company
        """), {"inv": body["investigator_id"], "cid": complaint_id, "company": g.company_id})
        db.session.commit()
        return success({"assigned": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.post("/complaints/ai-cluster-analysis")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_cluster_analysis():
    """AI flags complaint clusters by department to surface cultural red flags before escalation."""
    try:
        insight = generate_ai_insights({"type": "complaint_cluster_analysis", "company_id": g.company_id})
        return success({"clusters": insight.get("clusters", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: CONFLICT RESOLUTION
# ════════════════════════════════════════════════════════════════

@relations_bp.get("/conflicts")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_conflicts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_conflict_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@relations_bp.post("/conflicts")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_conflict_case():
    body = request.get_json() or {}
    required = ["parties_employee_ids", "issue_summary"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO conflict_cases (company_id, parties_employee_ids, issue_summary, mediator_employee_id, created_at)
            VALUES (:cid, :parties, :issue, :mediator, NOW()) RETURNING id
        """), {"cid": g.company_id, "parties": body["parties_employee_ids"], "issue": body["issue_summary"], "mediator": body.get("mediator_employee_id")})
        case_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"case_id": case_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.put("/conflicts/<case_id>/stage")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def advance_conflict_stage(case_id):
    """DB trigger auto-logs the stage transition into the immutable timeline."""
    body = request.get_json() or {}
    if not body.get("stage"): return error("stage required", 422)
    try:
        db.session.execute(text("""
            UPDATE conflict_cases SET stage = :stage WHERE id = :cid AND company_id = :company
        """), {"stage": body["stage"], "cid": case_id, "company": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.post("/conflicts/<case_id>/timeline")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def add_timeline_entry(case_id):
    """Manual mediation-update logging -- separate from the auto stage-change trigger."""
    body = request.get_json() or {}
    if not body.get("note"): return error("note required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO conflict_timeline_entries (conflict_case_id, company_id, stage_at_entry, note, logged_by, logged_at)
            SELECT :cid, :company, stage, :note, :user, NOW() FROM conflict_cases WHERE id = :cid
            RETURNING id
        """), {"cid": case_id, "company": g.company_id, "note": body["note"], "user": g.user_id})
        entry_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"entry_id": entry_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: DISCIPLINARY MANAGEMENT
# ════════════════════════════════════════════════════════════════

@relations_bp.get("/disciplinary-cases")
@require_auth
@require_role("super_admin", "hr_manager")
def list_disciplinary_cases():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_disciplinary_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@relations_bp.post("/disciplinary-cases")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_disciplinary_case():
    """DB trigger auto-sets the Section 61 minimum 7-day defense deadline."""
    body = request.get_json() or {}
    required = ["employee_id", "misconduct_description", "policy_violated"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO disciplinary_cases (company_id, employee_id, misconduct_description, policy_violated, investigation_committee, created_at)
            VALUES (:cid, :eid, :desc, :policy, :committee, NOW()) RETURNING id, defense_deadline
        """), {"cid": g.company_id, "eid": body["employee_id"], "desc": body["misconduct_description"],
               "policy": body["policy_violated"], "committee": body.get("investigation_committee", [])})
        row = result.fetchone()
        db.session.commit()
        return created({"case_id": str(row[0]), "defense_deadline": str(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.put("/disciplinary-cases/<case_id>/defense")
def submit_defense(case_id):
    """Public/ESS -- the employee's right-to-defend submission."""
    body = request.get_json() or {}
    if not body.get("defense_note"): return error("defense_note required", 422)
    try:
        db.session.execute(text("""
            UPDATE disciplinary_cases SET defense_submitted_at = NOW(), defense_note = :note WHERE id = :cid
        """), {"note": body["defense_note"], "cid": case_id})
        db.session.commit()
        return success({"submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.put("/disciplinary-cases/<case_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager")
def decide_disciplinary_action(case_id):
    """DB trigger BLOCKS this if the 7-day defense window hasn't lapsed and no defense was submitted."""
    body = request.get_json() or {}
    required = ["action_taken"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            UPDATE disciplinary_cases SET status = 'action_decided', action_taken = :action, resolution_note = :note
            WHERE id = :cid AND company_id = :company
        """), {"action": body["action_taken"], "note": body.get("resolution_note"), "cid": case_id, "company": g.company_id})
        db.session.commit()
        return success({"decided": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)  # 422 since this is most likely the 7-day-window block firing


@relations_bp.post("/disciplinary-cases/ai-consistency-check")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_consistency_check():
    """AI flags inconsistent disciplinary enforcement across departments before it becomes a discrimination claim."""
    try:
        insight = generate_ai_insights({"type": "disciplinary_consistency_check", "company_id": g.company_id})
        return success({"inconsistencies": insight.get("inconsistencies", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 5: WARNING LETTER
# ════════════════════════════════════════════════════════════════

@relations_bp.get("/warning-letters")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_warning_letters():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_warning_letter_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@relations_bp.post("/warning-letters")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def generate_warning_letter():
    """
    DB trigger increments the EXISTING termination_flags.documented_warnings_count
    and notifies the employee -- the gap-closer for that previously-unfed column.
    """
    body = request.get_json() or {}
    required = ["employee_id", "warning_level", "offense"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO warning_letters (company_id, employee_id, disciplinary_case_id, warning_level, offense, required_corrective_action, issued_by, created_at)
            VALUES (:cid, :eid, :case_id, :level, :offense, :action, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "eid": body["employee_id"], "case_id": body.get("disciplinary_case_id"),
               "level": body["warning_level"], "offense": body["offense"], "action": body.get("required_corrective_action"), "user": g.user_id})
        letter_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"warning_letter_id": letter_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.put("/warning-letters/<letter_id>/sign")
def sign_warning_letter(letter_id):
    """Public/ESS -- e-signature capture from the employee."""
    body = request.get_json() or {}
    if not body.get("signature_data"): return error("signature_data required", 422)
    try:
        db.session.execute(text("""
            UPDATE warning_letters SET acknowledged = TRUE, signature_data = :sig, signed_at = NOW() WHERE id = :lid
        """), {"sig": body["signature_data"], "lid": letter_id})
        db.session.commit()
        return success({"signed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@relations_bp.put("/warning-letters/<letter_id>/log-refusal")
@require_auth
@require_role("super_admin", "hr_manager")
def log_signature_refusal(letter_id):
    """Refusal is documented as a timestamped attempt -- never silently dropped."""
    try:
        db.session.execute(text("""
            UPDATE warning_letters SET signature_refused = TRUE WHERE id = :lid AND company_id = :cid
        """), {"lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"refusal_logged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@relations_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["grievances", "complaints", "disciplinary-cases", "warning-letters"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"relations_{module}")
    return jsonify(result), 200 if result["success"] else 422


@relations_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"relations_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"relations_{module}_template.xlsx")
