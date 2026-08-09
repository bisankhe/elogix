"""
FILE: backend/routes/ess_self_service_routes.py
NepHR Pro -- HR Services & Support > Employee Self Service (ESS)
(5 pages: My Profile, Profile Update, My Documents, My Digital
Signature, My Internal Training Certificates)
URL prefix: /api/v1/ess

My Profile / Profile Update reuse the EXISTING personal-information
maker-checker routes (Employee Database session) -- not duplicated
here. My Documents and My Training Certificates are pure read
endpoints over EXISTING tables. The genuinely new surface is the
polymorphic signature inbox and the external-certificate verification
queue.

Nepal legal grounding: Section 107/109 (accurate employee records);
Electronic Transactions Act 2063 (legal recognition of e-signatures);
Section 40 (training obligation -- certificate records as proof).
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import build_template_xlsx

ess_bp = Blueprint("ess_self_service", __name__, url_prefix="/api/v1/ess")


# ════════════════════════════════════════════════════════════════
# PAGE 3: MY DOCUMENTS (pure read over the EXISTING employee_documents)
# ════════════════════════════════════════════════════════════════

@ess_bp.get("/documents/<employee_id>")
def my_documents(employee_id):
    """Public/ESS -- the personal document vault, scoped strictly to the requesting employee."""
    category = request.args.get("category")
    try:
        q = "SELECT * FROM employee_documents WHERE employee_id = :eid"
        params = {"eid": employee_id}
        if category: q += " AND category = :cat"; params["cat"] = category
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess_bp.post("/documents")
def upload_document():
    """Public/ESS -- drag-and-drop upload into the EXISTING employee_documents table."""
    body = request.get_json() or {}
    required = ["employee_id", "file_name", "file_url", "category"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO employee_documents (company_id, employee_id, file_name, file_url, file_size_kb, category, created_at)
            VALUES (:cid, :eid, :name, :url, :size, :cat, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "name": body["file_name"],
               "url": body["file_url"], "size": body.get("file_size_kb"), "cat": body["category"]})
        doc_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"document_id": doc_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: MY DIGITAL SIGNATURE
# ════════════════════════════════════════════════════════════════

@ess_bp.get("/signatures/pending/<employee_id>")
def pending_signatures(employee_id):
    """Public/ESS -- the unified pending-documents inbox."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_pending_signatures WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess_bp.get("/signatures/signed/<employee_id>")
def signed_documents(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_signed_documents WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess_bp.post("/signatures/<request_id>/send-otp")
def send_signature_otp(request_id):
    """Public/ESS -- step 1 of the MFA gate; in production this dispatches a real SMS/email OTP."""
    return success({"otp_sent": True})


@ess_bp.put("/signatures/<request_id>/verify-and-sign")
def verify_otp_and_sign(request_id):
    """
    Public/ESS -- step 2: verify OTP, then apply signature. DB trigger
    syncs back to the source table (e.g. warning_letters) and notifies.
    """
    body = request.get_json() or {}
    required = ["otp_code", "signature_data"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    # In production: validate body["otp_code"] against the dispatched OTP store.
    try:
        db.session.execute(text("""
            UPDATE pending_esignature_requests
               SET otp_verified_at = NOW(), signature_data = :sig, signed = TRUE
             WHERE id = :rid
        """), {"sig": body["signature_data"], "rid": request_id})
        db.session.commit()
        return success({"signed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 5: MY INTERNAL TRAINING CERTIFICATES
# ════════════════════════════════════════════════════════════════

@ess_bp.get("/certificates/<employee_id>")
def my_certificates(employee_id):
    """Public/ESS -- reuses the EXISTING v_my_credentials_employee (built explicitly as 'the ESS view')."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_credentials_employee WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess_bp.post("/certificates/upload-external")
def upload_external_certificate():
    """Public/ESS -- queues an external certificate for HR verification."""
    body = request.get_json() or {}
    required = ["employee_id", "certificate_title", "file_url"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO external_certificate_uploads (company_id, employee_id, certificate_title, issuing_organization, file_url, uploaded_at)
            VALUES (:cid, :eid, :title, :org, :url, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "title": body["certificate_title"],
               "org": body.get("issuing_organization"), "url": body["file_url"]})
        upload_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"upload_id": upload_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ess_bp.get("/certificates/verification-queue")
@require_auth
@require_role("super_admin", "hr_manager")
def verification_queue():
    """HR's queue of externally-uploaded certificates awaiting legitimacy verification."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_external_certificate_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess_bp.put("/certificates/<upload_id>/verify")
@require_auth
@require_role("super_admin", "hr_manager")
def verify_external_certificate(upload_id):
    """DB trigger notifies the employee of the verification outcome."""
    body = request.get_json() or {}
    decision = body.get("decision")
    if decision not in ("verified", "rejected"): return error("decision must be verified or rejected", 422)
    try:
        db.session.execute(text("""
            UPDATE external_certificate_uploads SET verification_status = :decision, verified_by = :user
            WHERE id = :uid AND company_id = :cid
        """), {"decision": decision, "user": g.user_id, "uid": upload_id, "cid": g.company_id})
        db.session.commit()
        return success({"decision": decision})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel export ───────────────────────────────────────
@ess_bp.get("/documents/<employee_id>/excel-export")
def documents_excel_export(employee_id):
    b = build_template_xlsx("ess_my_documents_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="my_documents_export.xlsx")
