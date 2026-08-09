"""
FILE: backend/routes/government_letters_routes.py
NepHR Pro — Workforce Operations > Letters Module (5 pages)
URL prefix: /api/v1/govt-letters

  1. /ssf            — Social Security Fund correspondence
  2. /cit               — Citizen Investment Trust correspondence
  3. /labour-dept          — Labour Department correspondence
  4. /tax-dept               — Tax Department correspondence
  5. /other-entities            — Other Government Entities correspondence

Nepal Social Security Act 2074: employee enrollment within 3 months of hire.
Nepal Labour Act 2074: 30-day advance notice for mass retrenchment.
Income Tax Act 2058: 30-day administrative appeal window, 3-month annual filing.
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

govt_letters_bp = Blueprint("government_letters", __name__, url_prefix="/api/v1/govt-letters")


def _ai_draft_letter(entity: str, letter_type: str, context: dict) -> dict:
    """Shared helper: AI drafts formal B2G letter language matching the entity's legal requirements."""
    return generate_ai_insights({
        "type": "government_letter_drafting",
        "entity": entity,
        "letter_type": letter_type,
        "context": context,
    })


# ════════════════════════════════════════════════════════════════
# 1. SSF (SOCIAL SECURITY FUND)
# ════════════════════════════════════════════════════════════════

@govt_letters_bp.get("/ssf")
@require_auth
def list_ssf_letters():
    letter_type = request.args.get("letter_type")
    try:
        q = """
            SELECT s.*, e.first_name, e.last_name
            FROM ssf_correspondence s
            LEFT JOIN employees e ON s.employee_id = e.id
            WHERE s.company_id = :cid AND NOT s.is_deleted
        """
        params = {"cid": g.company_id}
        if letter_type: q += " AND s.letter_type = :lt"; params["lt"] = letter_type
        q += " ORDER BY s.date_sent DESC NULLS LAST"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@govt_letters_bp.post("/ssf/draft")
@require_auth
@require_role("super_admin", "hr_manager")
def draft_ssf_letter():
    body = request.get_json() or {}
    required = ["letter_type", "subject"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        emp = None
        if body.get("employee_id"):
            emp = db.session.execute(text(
                "SELECT join_date FROM employees WHERE id = :eid"
            ), {"eid": body["employee_id"]}).fetchone()

        insight = _ai_draft_letter("SSF", body["letter_type"], body)

        result = db.session.execute(text("""
            INSERT INTO ssf_correspondence
              (company_id, employee_id, letter_type, subject, reference_no, body_text,
               ssf_employer_id, employee_ssf_no, employee_hire_date, status, created_by, created_at)
            VALUES
              (:cid, :eid, :ltype, :subject, :ref, :body,
               :emp_ssf_id, :emp_ssf_no, :hire_date, 'draft', :user, NOW())
            RETURNING id, enrollment_deadline
        """), {
            "cid": g.company_id, "eid": body.get("employee_id"), "ltype": body["letter_type"],
            "subject": body["subject"], "ref": body.get("reference_no"),
            "body": insight.get("draft_text", body.get("body_text", "")),
            "emp_ssf_id": body.get("ssf_employer_id"), "emp_ssf_no": body.get("employee_ssf_no"),
            "hire_date": emp.join_date if emp else None, "user": g.user_id,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "letter_id": str(row[0]), "draft_text": insight.get("draft_text", ""),
            "enrollment_deadline": str(row[1]) if row[1] else None,
            "la_note": "Employee SSF enrollment required within 3 months of hire date." if body["letter_type"] == "employee_enrollment" else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@govt_letters_bp.put("/ssf/<letter_id>/mark-submitted")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_ssf_submitted(letter_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE ssf_correspondence
               SET status = 'submitted', date_sent = NOW()::DATE,
                   response_deadline = :deadline, document_url = :doc, updated_at = NOW()
             WHERE id = :lid AND company_id = :cid
        """), {"deadline": body.get("response_deadline"), "doc": body.get("document_url"),
               "lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@govt_letters_bp.put("/ssf/<letter_id>/record-response")
@require_auth
@require_role("super_admin", "hr_manager")
def record_ssf_response(letter_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE ssf_correspondence
               SET response_received = TRUE, response_notes = :notes,
                   acknowledgment_document_url = :ack_doc, updated_at = NOW()
             WHERE id = :lid AND company_id = :cid
        """), {"notes": body.get("response_notes", ""), "ack_doc": body.get("acknowledgment_document_url"),
               "lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@govt_letters_bp.get("/ssf/enrollment-deadlines")
@require_auth
@require_role("super_admin", "hr_manager")
def ssf_enrollment_deadlines():
    """Tracks employees approaching the 3-month SSF enrollment deadline."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_ssf_enrollment_deadlines WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 2. CIT (CITIZEN INVESTMENT TRUST)
# ════════════════════════════════════════════════════════════════

@govt_letters_bp.get("/cit")
@require_auth
def list_cit_letters():
    try:
        rows = db.session.execute(text("""
            SELECT c.*, e.first_name, e.last_name
            FROM cit_correspondence c
            LEFT JOIN employees e ON c.employee_id = e.id
            WHERE c.company_id = :cid AND NOT c.is_deleted
            ORDER BY c.date_sent DESC NULLS LAST
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@govt_letters_bp.post("/cit/draft")
@require_auth
@require_role("super_admin", "hr_manager")
def draft_cit_letter():
    body = request.get_json() or {}
    required = ["letter_type", "subject"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        insight = _ai_draft_letter("CIT", body["letter_type"], body)
        result = db.session.execute(text("""
            INSERT INTO cit_correspondence
              (company_id, employee_id, letter_type, subject, reference_no, body_text,
               cit_account_no, contribution_amount_npr, loan_amount_requested_npr, nominee_name,
               status, created_by, created_at)
            VALUES
              (:cid, :eid, :ltype, :subject, :ref, :body,
               :acct, :contrib, :loan, :nominee,
               'draft', :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body.get("employee_id"), "ltype": body["letter_type"],
            "subject": body["subject"], "ref": body.get("reference_no"),
            "body": insight.get("draft_text", body.get("body_text", "")),
            "acct": body.get("cit_account_no"), "contrib": body.get("contribution_amount_npr"),
            "loan": body.get("loan_amount_requested_npr"), "nominee": body.get("nominee_name"), "user": g.user_id,
        })
        letter_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"letter_id": letter_id, "draft_text": insight.get("draft_text", "")})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@govt_letters_bp.put("/cit/<letter_id>/mark-submitted")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_cit_submitted(letter_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE cit_correspondence
               SET status = 'submitted', date_sent = NOW()::DATE,
                   response_deadline = :deadline, document_url = :doc, updated_at = NOW()
             WHERE id = :lid AND company_id = :cid
        """), {"deadline": body.get("response_deadline"), "doc": body.get("document_url"),
               "lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. LABOUR DEPARTMENT
# ════════════════════════════════════════════════════════════════

@govt_letters_bp.get("/labour-dept")
@require_auth
def list_labour_letters():
    try:
        rows = db.session.execute(text("""
            SELECT l.*, e.first_name, e.last_name
            FROM labour_dept_correspondence l
            LEFT JOIN employees e ON l.employee_id = e.id
            WHERE l.company_id = :cid AND NOT l.is_deleted
            ORDER BY l.date_sent DESC NULLS LAST
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@govt_letters_bp.post("/labour-dept/draft")
@require_auth
@require_role("super_admin", "hr_manager")
def draft_labour_letter():
    """
    For mass_retrenchment: validates 30-day notice requirement (LA2074) and
    warns (does not block) if the gap is insufficient — DB trigger also fires.
    """
    body = request.get_json() or {}
    required = ["letter_type", "subject"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    warning = None
    if body["letter_type"] == "mass_retrenchment" and body.get("retrenchment_notice_date") and body.get("retrenchment_effective_date"):
        notice = date.fromisoformat(body["retrenchment_notice_date"])
        effective = date.fromisoformat(body["retrenchment_effective_date"])
        if (effective - notice).days < 30:
            warning = "Notice period is less than the legally required 30 days per Nepal Labour Act 2074."

    try:
        insight = _ai_draft_letter("Labour Department", body["letter_type"], body)
        result = db.session.execute(text("""
            INSERT INTO labour_dept_correspondence
              (company_id, employee_id, letter_type, subject, reference_no, body_text,
               retrenchment_notice_date, retrenchment_effective_date, affected_employee_count,
               local_vacancy_advertised, work_permit_no, status, created_by, created_at)
            VALUES
              (:cid, :eid, :ltype, :subject, :ref, :body,
               :notice_date, :effective_date, :affected,
               :advertised, :permit_no, 'draft', :user, NOW())
            RETURNING id, meets_30day_requirement
        """), {
            "cid": g.company_id, "eid": body.get("employee_id"), "ltype": body["letter_type"],
            "subject": body["subject"], "ref": body.get("reference_no"),
            "body": insight.get("draft_text", body.get("body_text", "")),
            "notice_date": body.get("retrenchment_notice_date"), "effective_date": body.get("retrenchment_effective_date"),
            "affected": body.get("affected_employee_count"), "advertised": body.get("local_vacancy_advertised", False),
            "permit_no": body.get("work_permit_no"), "user": g.user_id,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "letter_id": str(row[0]), "draft_text": insight.get("draft_text", ""),
            "meets_30day_requirement": row[1], "warning": warning,
            "la_note": "Foreign hire requires local vacancy advertisement first (Section 22/23)." if body["letter_type"] == "foreign_work_permit" else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@govt_letters_bp.get("/labour-dept/retrenchment-compliance-risk")
@require_auth
@require_role("super_admin", "hr_manager")
def retrenchment_compliance_risk():
    """Flags retrenchment notices not meeting the 30-day requirement."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_retrenchment_compliance_risk WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 4. TAX DEPARTMENT
# ════════════════════════════════════════════════════════════════

@govt_letters_bp.get("/tax-dept")
@require_auth
def list_tax_letters():
    try:
        rows = db.session.execute(text("""
            SELECT * FROM tax_dept_correspondence
            WHERE company_id = :cid AND NOT is_deleted
            ORDER BY date_sent DESC NULLS LAST
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@govt_letters_bp.post("/tax-dept/draft")
@require_auth
@require_role("super_admin", "hr_manager")
def draft_tax_letter():
    body = request.get_json() or {}
    required = ["letter_type", "subject"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        insight = _ai_draft_letter("Tax Department", body["letter_type"], body)
        result = db.session.execute(text("""
            INSERT INTO tax_dept_correspondence
              (company_id, letter_type, subject, reference_no, body_text,
               fiscal_year, tax_amount_npr, assessment_date, fiscal_year_end_date,
               status, created_by, created_at)
            VALUES
              (:cid, :ltype, :subject, :ref, :body,
               :fy, :amount, :assess_date, :fy_end,
               'draft', :user, NOW())
            RETURNING id, appeal_deadline, filing_deadline
        """), {
            "cid": g.company_id, "ltype": body["letter_type"], "subject": body["subject"],
            "ref": body.get("reference_no"), "body": insight.get("draft_text", body.get("body_text", "")),
            "fy": body.get("fiscal_year"), "amount": body.get("tax_amount_npr"),
            "assess_date": body.get("assessment_date"), "fy_end": body.get("fiscal_year_end_date"), "user": g.user_id,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "letter_id": str(row[0]), "draft_text": insight.get("draft_text", ""),
            "appeal_deadline": str(row[1]) if row[1] else None, "filing_deadline": str(row[2]) if row[2] else None,
            "ira_note": "Administrative appeal must be filed within 30 days of assessment." if body["letter_type"] == "administrative_appeal" else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@govt_letters_bp.put("/tax-dept/<letter_id>/issue-clearance-certificate")
@require_auth
@require_role("super_admin", "hr_manager")
def issue_clearance_certificate(letter_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE tax_dept_correspondence
               SET clearance_certificate_issued = TRUE, clearance_certificate_url = :url,
                   status = 'acknowledged', response_received = TRUE, updated_at = NOW()
             WHERE id = :lid AND company_id = :cid AND letter_type = 'tax_clearance'
        """), {"url": body.get("clearance_certificate_url"), "lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"certificate_issued": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@govt_letters_bp.get("/tax-dept/deadline-tracker")
@require_auth
@require_role("super_admin", "hr_manager")
def tax_deadline_tracker():
    """Upcoming filing and appeal deadlines."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_tax_deadline_tracker WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 5. OTHER GOVERNMENT ENTITIES
# ════════════════════════════════════════════════════════════════

@govt_letters_bp.get("/other-entities")
@require_auth
def list_other_entity_letters():
    entity_type = request.args.get("entity_type")
    try:
        q = """
            SELECT o.*, e.first_name, e.last_name
            FROM other_govt_correspondence o
            LEFT JOIN employees e ON o.employee_id = e.id
            WHERE o.company_id = :cid AND NOT o.is_deleted
        """
        params = {"cid": g.company_id}
        if entity_type: q += " AND o.entity_type = :et"; params["et"] = entity_type
        q += " ORDER BY o.date_sent DESC NULLS LAST"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@govt_letters_bp.post("/other-entities/draft")
@require_auth
@require_role("super_admin", "hr_manager")
def draft_other_entity_letter():
    body = request.get_json() or {}
    required = ["entity_type", "subject"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        insight = _ai_draft_letter(body["entity_type"], body.get("purpose", "other"), body)
        result = db.session.execute(text("""
            INSERT INTO other_govt_correspondence
              (company_id, employee_id, entity_type, entity_name_custom, subject,
               reference_no, body_text, purpose, status, created_by, created_at)
            VALUES
              (:cid, :eid, :etype, :ename, :subject,
               :ref, :body, :purpose, 'draft', :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body.get("employee_id"), "etype": body["entity_type"],
            "ename": body.get("entity_name_custom"), "subject": body["subject"], "ref": body.get("reference_no"),
            "body": insight.get("draft_text", body.get("body_text", "")), "purpose": body.get("purpose", "other"),
            "user": g.user_id,
        })
        letter_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"letter_id": letter_id, "draft_text": insight.get("draft_text", "")})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@govt_letters_bp.put("/other-entities/<letter_id>/mark-submitted")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_other_submitted(letter_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE other_govt_correspondence
               SET status = 'submitted', date_sent = NOW()::DATE,
                   response_deadline = :deadline, document_url = :doc, updated_at = NOW()
             WHERE id = :lid AND company_id = :cid
        """), {"deadline": body.get("response_deadline"), "doc": body.get("document_url"),
               "lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# CROSS-MODULE: unified compliance dashboard
# ════════════════════════════════════════════════════════════════

@govt_letters_bp.get("/dashboard")
@require_auth
@require_role("super_admin", "hr_manager")
def unified_dashboard():
    """Centralized compliance dashboard across all 5 government correspondence types."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_government_letters_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@govt_letters_bp.get("/pending-responses")
@require_auth
@require_role("super_admin", "hr_manager")
def pending_responses():
    """Cross-module action queue: all letters awaiting government response."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pending_government_responses WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@govt_letters_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["ssf", "cit", "labour-dept", "tax-dept", "other-entities"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"govt_letters_{module}")
    return jsonify(result), 200 if result["success"] else 422


@govt_letters_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"govt_letters_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"govt_letters_{module}_template.xlsx")
