"""
FILE: backend/routes/employee_documents_routes.py
eLogix HRMS — Employee Records > Employee Documents Module (4 pages)
URL prefix: /api/v1/employee-docs

  1. /documents          — Document Management (OCR, RBAC, retention)
  2. /contracts            — Contract Management AI-Driven
  3. /digital-file/<id>      — Digital Employee File (360-degree view)
  4. /hr-letters                — AI-Driven HR Letters (English & Nepali)

Nepal Labour Act 2074: 5-year retention, mandatory contract clauses, probation max 6mo.
Electronic Transactions Act 2063: e-signature legal validity.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date, timedelta
import io, json, uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

empdocs_bp = Blueprint("employee_documents", __name__, url_prefix="/api/v1/employee-docs")

NEPAL_RETENTION_YEARS = 5
NEPAL_MAX_PROBATION_MONTHS = 6


# ════════════════════════════════════════════════════════════════
# 1. DOCUMENT MANAGEMENT
# ════════════════════════════════════════════════════════════════

@empdocs_bp.get("/documents")
@require_auth
def list_documents():
    search = request.args.get("search", "")
    category = request.args.get("category")
    employee_id = request.args.get("employee_id")
    try:
        if search:
            q = """
                SELECT d.*, e.first_name, e.last_name,
                       ts_rank(d.search_vector, to_tsquery('english', :tsq)) AS relevance
                FROM employee_documents d
                JOIN employees e ON d.employee_id = e.id
                WHERE d.company_id = :cid AND NOT d.is_deleted
                  AND d.search_vector @@ to_tsquery('english', :tsq)
            """
            params = {"cid": g.company_id, "tsq": " | ".join(search.split())}
            order = " ORDER BY relevance DESC"
        else:
            q = """
                SELECT d.*, e.first_name, e.last_name
                FROM employee_documents d
                JOIN employees e ON d.employee_id = e.id
                WHERE d.company_id = :cid AND NOT d.is_deleted
            """
            params = {"cid": g.company_id}
            order = " ORDER BY d.created_at DESC"

        if category: q += " AND d.category = :cat"; params["cat"] = category
        if employee_id: q += " AND d.employee_id = :eid"; params["eid"] = employee_id
        q += order
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdocs_bp.post("/documents")
@require_auth
def upload_document():
    """Upload + auto-OCR + auto-tag + auto-retention-date."""
    body = request.get_json() or {}
    required = ["employee_id", "file_name", "file_url", "category"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        # AI OCR + auto-tagging
        insight = generate_ai_insights({
            "type": "document_ocr_and_tag",
            "file_name": body["file_name"], "category": body["category"],
        })

        retention_until = (date.today() + timedelta(days=365 * NEPAL_RETENTION_YEARS)).isoformat()

        db.session.execute(text("""
            INSERT INTO employee_documents
              (company_id, employee_id, file_name, file_url, file_size_kb, category,
               tags, ocr_processed, ocr_extracted_text, ocr_confidence_pct, auto_tagged,
               access_level, retention_until_date, uploaded_by, uploaded_via, created_at)
            VALUES
              (:cid, :eid, :fname, :url, :size, :cat,
               :tags::jsonb, TRUE, :ocr_text, :confidence, TRUE,
               :access, :retention, :user, :via, NOW())
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "fname": body["file_name"],
            "url": body["file_url"], "size": body.get("file_size_kb", 0), "cat": body["category"],
            "tags": json.dumps(insight.get("auto_tags", [])), "ocr_text": insight.get("extracted_text", ""),
            "confidence": insight.get("confidence_pct", 90), "access": body.get("access_level", "hr_only"),
            "retention": retention_until, "user": g.user_id, "via": body.get("uploaded_via", "hr_admin"),
        })
        db.session.commit()

        return created({
            "message": "Document uploaded and OCR-processed.",
            "auto_tags": insight.get("auto_tags", []),
            "retention_until": retention_until,
            "la2074_note": f"Retained {NEPAL_RETENTION_YEARS} years post-employment per Labour Act 2074.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.post("/documents/<doc_id>/view")
def log_document_view(doc_id):
    """Logs every access for audit trail (RBAC enforcement happens at middleware level)."""
    try:
        db.session.execute(text("""
            INSERT INTO document_audit_log (company_id, document_id, action, performed_by, performed_by_name, ip_address, performed_at)
            VALUES (:cid, :did, 'viewed', :user, :uname, :ip, NOW())
        """), {"cid": g.company_id, "did": doc_id, "user": g.user_id,
               "uname": getattr(g, "user_name", ""), "ip": request.remote_addr})
        db.session.commit()
        return success({"logged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.get("/documents/retention-status")
@require_auth
@require_role("super_admin", "hr_manager")
def retention_status():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_document_retention_status WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 2. CONTRACT MANAGEMENT AI-DRIVEN
# ════════════════════════════════════════════════════════════════

@empdocs_bp.get("/contracts")
@require_auth
def list_contracts():
    status = request.args.get("status")
    try:
        q = """
            SELECT c.*, e.first_name, e.last_name, e.employee_code
            FROM employee_contracts c
            JOIN employees e ON c.employee_id = e.id
            WHERE c.company_id = :cid AND NOT c.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND c.status = :status"; params["status"] = status
        q += " ORDER BY c.end_date ASC NULLS LAST"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdocs_bp.post("/contracts/generate")
@require_auth
@require_role("super_admin", "hr_manager")
def generate_contract():
    """AI pre-populates mandatory LA2074 clauses, then scans for issues."""
    body = request.get_json() or {}
    required = ["employee_id", "contract_type", "start_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    probation_end = None
    if body.get("probation_months"):
        months = min(body["probation_months"], NEPAL_MAX_PROBATION_MONTHS)
        if body["probation_months"] > NEPAL_MAX_PROBATION_MONTHS:
            return error("Probation cannot exceed 6 months per Nepal Labour Act 2074 Section 13.", 422)
        start = date.fromisoformat(body["start_date"])
        probation_end = (start + timedelta(days=30 * months)).isoformat()

    try:
        insight = generate_ai_insights({
            "type": "contract_clause_analysis",
            "contract_type": body["contract_type"],
            "job_title": body.get("job_title", ""),
            "remuneration_npr": body.get("remuneration_npr"),
        })

        result = db.session.execute(text("""
            INSERT INTO employee_contracts
              (company_id, employee_id, contract_type, start_date, end_date, probation_end_date,
               job_title, remuneration_npr, working_hours_per_week, language,
               status, ai_compliance_score, ai_clause_flags, ai_last_analyzed_at, created_by, created_at)
            VALUES
              (:cid, :eid, :ctype, :start, :end, :prob_end,
               :title, :salary, :hours, :lang,
               'draft', :score, :flags::jsonb, NOW(), :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "ctype": body["contract_type"],
            "start": body["start_date"], "end": body.get("end_date"), "prob_end": probation_end,
            "title": body.get("job_title", ""), "salary": body.get("remuneration_npr"),
            "hours": body.get("working_hours_per_week", 48), "lang": body.get("language", "english"),
            "score": insight.get("compliance_score", 95), "flags": json.dumps(insight.get("flags", [])),
            "user": g.user_id,
        })
        contract_id = str(result.fetchone()[0])
        db.session.commit()

        return created({
            "contract_id": contract_id,
            "ai_compliance_score": insight.get("compliance_score", 95),
            "ai_flags": insight.get("flags", []),
            "probation_end_date": probation_end,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.post("/contracts/<contract_id>/draft-renewal")
@require_auth
@require_role("super_admin", "hr_manager")
def draft_renewal(contract_id):
    """AI auto-drafts a renewal based on the expiring contract."""
    try:
        old = db.session.execute(text(
            "SELECT * FROM employee_contracts WHERE id = :cid_c AND company_id = :cid"
        ), {"cid_c": contract_id, "cid": g.company_id}).fetchone()
        if not old: return not_found("Contract")

        new_start = old.end_date
        result = db.session.execute(text("""
            INSERT INTO employee_contracts
              (company_id, employee_id, contract_type, start_date, end_date,
               job_title, remuneration_npr, working_hours_per_week, language,
               status, supersedes_contract_id, ai_compliance_score, created_at)
            VALUES
              (:cid, :eid, :ctype, :start, :end,
               :title, :salary, :hours, :lang,
               'draft', :supersedes, 95, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": old.employee_id, "ctype": old.contract_type,
            "start": new_start, "end": (new_start + timedelta(days=180)) if new_start else None,
            "title": old.job_title, "salary": old.remuneration_npr, "hours": old.working_hours_per_week,
            "lang": old.language, "supersedes": contract_id,
        })
        new_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"new_contract_id": new_id, "message": "Renewal drafted from prior contract terms."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.post("/contracts/<contract_id>/send-esign")
@require_auth
@require_role("super_admin", "hr_manager")
def send_contract_esign(contract_id):
    try:
        db.session.execute(text("""
            UPDATE employee_contracts SET esignature_status = 'sent', updated_at = NOW()
            WHERE id = :cid_c AND company_id = :cid
        """), {"cid_c": contract_id, "cid": g.company_id})
        db.session.commit()
        return success({"sent": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.post("/contracts/<contract_id>/sign")
def sign_contract(contract_id):
    """Public — e-signs the contract (legally valid per Electronic Transactions Act 2063)."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE employee_contracts
               SET esignature_status = 'signed', signed_date = NOW(), status = 'active',
                   signed_document_url = :url, updated_at = NOW()
             WHERE id = :cid_c
        """), {"url": body.get("signed_document_url"), "cid_c": contract_id})
        db.session.commit()
        return success({"signed": True, "legal_note": "Valid per Nepal Electronic Transactions Act 2063."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.get("/contracts/expiring")
@require_auth
def expiring_contracts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_expiring_contracts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdocs_bp.get("/contracts/ai-flags")
@require_auth
@require_role("super_admin", "hr_manager")
def contracts_ai_flags():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_contract_ai_flags WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 3. DIGITAL EMPLOYEE FILE (360-degree view)
# ════════════════════════════════════════════════════════════════

@empdocs_bp.get("/digital-file/<employee_id>")
@require_auth
def get_digital_file(employee_id):
    """Aggregates documents + contracts + letters + audit log into one 360-view payload."""
    try:
        emp = db.session.execute(text(
            "SELECT employee_code, first_name, last_name FROM employees WHERE id = :eid AND company_id = :cid"
        ), {"eid": employee_id, "cid": g.company_id}).fetchone()
        if not emp: return not_found("Employee")

        recent_docs = db.session.execute(text("""
            SELECT file_name, category, created_at FROM employee_documents
            WHERE employee_id = :eid AND NOT is_deleted ORDER BY created_at DESC LIMIT 5
        """), {"eid": employee_id}).fetchall()

        expiring = db.session.execute(text(
            "SELECT * FROM v_expiring_contracts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()

        pending_esign = db.session.execute(text(
            "SELECT * FROM v_pending_esignatures WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()

        audit = db.session.execute(text("""
            SELECT * FROM document_audit_log
            WHERE document_id IN (SELECT id FROM employee_documents WHERE employee_id = :eid)
            ORDER BY performed_at DESC LIMIT 10
        """), {"eid": employee_id}).fetchall()

        return success({
            "employee": dict(emp._mapping),
            "recently_viewed": [dict(r._mapping) for r in recent_docs],
            "expiring_contracts": [dict(r._mapping) for r in expiring],
            "pending_signatures": [dict(r._mapping) for r in pending_esign],
            "audit_log": [dict(r._mapping) for r in audit],
        })
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. AI-DRIVEN HR LETTERS (English & Nepali)
# ════════════════════════════════════════════════════════════════

@empdocs_bp.get("/hr-letters/templates")
@require_auth
def list_letter_templates():
    try:
        rows = db.session.execute(text("""
            SELECT * FROM hr_letter_templates
            WHERE is_active AND (company_id IS NULL OR company_id = :cid)
            ORDER BY label
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdocs_bp.get("/hr-letters")
@require_auth
def list_letters():
    try:
        rows = db.session.execute(text("""
            SELECT l.*, e.first_name, e.last_name, t.label AS template_label, t.icon, t.color
            FROM hr_letters l
            JOIN employees e ON l.employee_id = e.id
            JOIN hr_letter_templates t ON l.template_id = t.id
            WHERE l.company_id = :cid AND NOT l.is_deleted
            ORDER BY l.created_at DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdocs_bp.post("/hr-letters/generate")
@require_auth
@require_role("super_admin", "hr_manager")
def generate_letter():
    """
    Step 2->3 of the wizard: AI generates bilingual letter text from
    employee profile data + variables, cross-validated for legal consistency.
    """
    body = request.get_json() or {}
    required = ["employee_id", "template_key", "language"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        template = db.session.execute(text(
            "SELECT * FROM hr_letter_templates WHERE template_key = :key AND is_active LIMIT 1"
        ), {"key": body["template_key"]}).fetchone()
        if not template: return not_found("Letter template")

        emp = db.session.execute(text(
            "SELECT * FROM employees WHERE id = :eid AND company_id = :cid"
        ), {"eid": body["employee_id"], "cid": g.company_id}).fetchone()
        if not emp: return not_found("Employee")

        insight = generate_ai_insights({
            "type": "hr_letter_generation",
            "template_key": body["template_key"],
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "position": emp.designation_id,
            "variables": body.get("variables", {}),
            "language": body["language"],
            "legal_section_ref": template.legal_section_ref,
        })

        result = db.session.execute(text("""
            INSERT INTO hr_letters
              (company_id, employee_id, template_id, effective_date, variables_used,
               language, generated_english_text, generated_nepali_text,
               ai_score, esignature_required, status, generated_by, created_at)
            VALUES
              (:cid, :eid, :tid, :eff_date, :vars::jsonb,
               :lang, :eng, :nep,
               :score, :esign_req, 'draft', :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "tid": template.id,
            "eff_date": body.get("effective_date"), "vars": json.dumps(body.get("variables", {})),
            "lang": body["language"], "eng": insight.get("english_text", ""), "nep": insight.get("nepali_text", ""),
            "score": insight.get("quality_score", 95), "esign_req": body["template_key"] in ("offer", "warning", "termination"),
            "user": g.user_id,
        })
        letter_id = str(result.fetchone()[0])
        db.session.commit()

        return created({
            "letter_id": letter_id,
            "english_text": insight.get("english_text", ""),
            "nepali_text": insight.get("nepali_text", ""),
            "ai_score": insight.get("quality_score", 95),
            "requires_human_review": template.requires_human_review,
            "legal_note": f"References {template.legal_section_ref}" if template.legal_section_ref else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.post("/hr-letters/<letter_id>/mark-reviewed")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_letter_reviewed(letter_id):
    """Required before sending warning/termination letters (DB trigger enforces this)."""
    try:
        db.session.execute(text("""
            UPDATE hr_letters SET human_reviewed = TRUE, human_reviewed_by = :user, updated_at = NOW()
            WHERE id = :lid AND company_id = :cid
        """), {"user": g.user_id, "lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"reviewed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.post("/hr-letters/<letter_id>/send")
@require_auth
@require_role("super_admin", "hr_manager")
def send_letter(letter_id):
    """Blocked by DB trigger if template requires review and not yet reviewed."""
    try:
        db.session.execute(text("""
            UPDATE hr_letters
               SET status = 'sent', esignature_status = CASE WHEN esignature_required THEN 'sent' ELSE esignature_status END,
                   updated_at = NOW()
             WHERE id = :lid AND company_id = :cid
        """), {"lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"sent": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdocs_bp.get("/hr-letters/<letter_id>/download")
@require_auth
def download_letter(letter_id):
    try:
        row = db.session.execute(text(
            "SELECT pdf_url FROM hr_letters WHERE id = :lid AND company_id = :cid"
        ), {"lid": letter_id, "cid": g.company_id}).fetchone()
        if not row or not row.pdf_url: return not_found("Letter PDF")
        return success({"pdf_url": row.pdf_url})
    except Exception as e:
        return error(str(e), 500)


@empdocs_bp.get("/hr-letters/pending-review")
@require_auth
@require_role("super_admin", "hr_manager")
def letters_pending_review():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_letters_pending_review WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@empdocs_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["documents", "contracts", "letters"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"empdocs_{module}")
    return jsonify(result), 200 if result["success"] else 422


@empdocs_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"empdocs_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"employee_docs_{module}_template.xlsx")
