"""
FILE: backend/routes/certificate_generation_tracking_routes.py
eLogix HRMS — Performance & Talent Management > Talent Development >
Learning & Development > Generate Certificate + Certification Tracking
(2 pages)
URL prefix: /api/v1/certificates

"LITTLE CHANGE" per this session: certificates now auto-issue for EVERY
completed course (not only recertification-tracked ones) -- see the
replaced fn_issue_certification_on_completion trigger. Explicit user
personas (hr_admin / manager / employee) each get dedicated, scoped
endpoints rather than one generic view filtered client-side.

Nepal Labour Act 2017 (2074): Section 114 (training/skill registry);
Section 150 (Certificate of Experience on termination); Section 94
(annual Labour Audit); Section 22 (foreign-national permit tracking).
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

cert_bp = Blueprint("certificate_generation_tracking", __name__, url_prefix="/api/v1/certificates")


# ════════════════════════════════════════════════════════════════
# PAGE 1: GENERATE CERTIFICATE
# ════════════════════════════════════════════════════════════════

# ── Persona: hr_admin ──
@cert_bp.get("/auto-issue-queue")
@require_auth
@require_role("super_admin", "hr_manager")
def autoissue_queue_hr_admin():
    """hr_admin persona: every completion, issued status, and pending-template flags."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_certificate_autoissue_queue_hr_admin WHERE company_id = :cid LIMIT 100"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@cert_bp.post("/templates")
@require_auth
@require_role("super_admin", "hr_manager")
def create_template():
    """hr_admin persona: drag-and-drop template builder."""
    body = request.get_json() or {}
    required = ["template_name"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO certificate_templates (company_id, template_name, header_text, body_template, signature_name, logo_url, is_default, created_by, created_at)
            VALUES (:cid, :name, :header, :body, :sig, :logo, :default, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["template_name"], "header": body.get("header_text", "Certificate of Completion"),
               "body": body.get("body_template"), "sig": body.get("signature_name"), "logo": body.get("logo_url"),
               "default": body.get("is_default", False), "user": g.user_id})
        template_id = str(result.fetchone()[0])

        for course_id in body.get("apply_to_course_ids", [None]):
            db.session.execute(text("""
                INSERT INTO certificate_template_assignments (certificate_template_id, lms_course_id, company_id)
                VALUES (:tid, :course, :cid) ON CONFLICT DO NOTHING
            """), {"tid": template_id, "course": course_id, "cid": g.company_id})

        db.session.commit()
        return created({"template_id": template_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@cert_bp.post("/bulk-generate")
@require_auth
@require_role("super_admin", "hr_manager")
def bulk_generate():
    """hr_admin persona: batch-generate for every completed-but-uncertified enrollment of a course."""
    body = request.get_json() or {}
    if not body.get("lms_course_id"): return error("lms_course_id required", 422)
    try:
        result = db.session.execute(text("""
            UPDATE lms_enrollments SET completed_at = COALESCE(completed_at, NOW())
            WHERE lms_course_id = :course AND progress_pct >= 100
              AND employee_id NOT IN (SELECT employee_id FROM lms_certifications WHERE lms_course_id = :course)
            RETURNING id
        """), {"course": body["lms_course_id"]})
        count = len(result.fetchall())
        db.session.commit()
        return success({"certificates_generated": count})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Persona: manager ──
@cert_bp.get("/team-summary")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def team_summary_manager():
    """manager persona: team certificates issued count."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_certificate_team_summary_manager WHERE manager_id = :mgr AND company_id = :cid"
        ), {"mgr": g.user_id, "cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {"team_certs_issued": 0})
    except Exception:
        return success({"team_certs_issued": 0})


# ── Persona: employee (ESS) ──
@cert_bp.get("/my-credentials/<employee_id>")
def my_credentials_employee(employee_id):
    """employee persona: 'My Credentials' -- view/download/share."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_credentials_employee WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@cert_bp.get("/verify/<qr_code>")
def verify_certificate(qr_code):
    """Public — the tamper-proof QR verification endpoint (no auth, anyone can verify authenticity)."""
    try:
        row = db.session.execute(text("""
            SELECT lcert.certification_title, lcert.issued_date, lcert.expires_date, lcert.status,
                   e.first_name, e.last_name
            FROM lms_certifications lcert JOIN employees e ON lcert.employee_id = e.id
            WHERE lcert.verify_qr_code = :qr
        """), {"qr": qr_code}).fetchone()
        if not row: return error("Certificate not found or invalid code.", 404)
        return success(dict(row._mapping))
    except Exception:
        return error("Certificate not found or invalid code.", 404)


# ════════════════════════════════════════════════════════════════
# PAGE 2: CERTIFICATION TRACKING
# ════════════════════════════════════════════════════════════════

# ── Persona: hr_admin ──
@cert_bp.get("/compliance-breakdown")
@require_auth
@require_role("super_admin", "hr_manager")
def compliance_breakdown_hr_admin():
    """hr_admin persona: the compliance pie-chart data."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_compliance_breakdown_hr_admin WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@cert_bp.get("/role-requirements")
@require_auth
@require_role("super_admin", "hr_manager")
def role_requirements_hr_admin():
    """hr_admin persona: role-based requirement config + compliance, including Section 22 foreign-national tracking."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_role_requirement_compliance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@cert_bp.post("/role-requirements")
@require_auth
@require_role("super_admin", "hr_manager")
def create_role_requirement():
    body = request.get_json() or {}
    required = ["requirement_label"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO certification_role_requirements (company_id, department_id, is_foreign_national_rule, required_lms_course_id, requirement_label, created_at)
            VALUES (:cid, :dept, :foreign, :course, :label, NOW()) RETURNING id
        """), {"cid": g.company_id, "dept": body.get("department_id"), "foreign": body.get("is_foreign_national_rule", False),
               "course": body.get("required_lms_course_id"), "label": body["requirement_label"]})
        req_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"requirement_id": req_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@cert_bp.get("/audit-report")
@require_auth
@require_role("super_admin", "hr_manager")
def export_audit_report():
    """hr_admin persona: Section 94 Labour Audit-ready export."""
    b = build_template_xlsx("certification_audit_report")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="certification_audit_report.xlsx")


# ── Persona: manager + employee (shared pipeline) ──
@cert_bp.get("/expiry-pipeline")
@require_auth
def expiry_pipeline():
    """manager + employee personas: the 90/60/30-day expiry pipeline."""
    employee_id = request.args.get("employee_id")
    try:
        q = "SELECT * FROM v_expiry_pipeline WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if employee_id: q += " AND employee_id = :eid"; params["eid"] = employee_id
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Persona: employee (ESS) ──
@cert_bp.post("/renewal-documents")
def upload_renewal_document():
    """employee persona: upload renewal proof, photographed or uploaded from mobile."""
    body = request.get_json() or {}
    required = ["lms_certification_id", "employee_id", "document_url"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO certification_renewal_documents (company_id, lms_certification_id, employee_id, document_url, new_expiry_date, uploaded_at)
            VALUES (:cid, :cert, :eid, :doc, :expiry, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "cert": body["lms_certification_id"], "eid": body["employee_id"],
               "doc": body["document_url"], "expiry": body.get("new_expiry_date")})
        doc_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"document_id": doc_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@cert_bp.put("/renewal-documents/<doc_id>/verify")
@require_auth
@require_role("super_admin", "hr_manager")
def verify_renewal_document(doc_id):
    """hr_admin persona: verify the uploaded renewal proof. DB trigger extends the cert's expiry on success."""
    body = request.get_json() or {}
    decision = body.get("decision", "verified")
    if decision not in ("verified", "rejected"): return error("decision must be verified or rejected", 422)
    try:
        db.session.execute(text("""
            UPDATE certification_renewal_documents SET verification_status = :decision, verified_by = :user, verified_at = NOW()
            WHERE id = :did AND company_id = :cid
        """), {"decision": decision, "user": g.user_id, "did": doc_id, "cid": g.company_id})
        db.session.commit()
        return success({"decision": decision})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@cert_bp.post("/ai-predict-renewal-risk")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_predict_renewal_risk():
    """AI preemptively flags employees likely to miss renewal based on past renewal-lateness patterns."""
    try:
        insight = generate_ai_insights({"type": "certification_renewal_risk_prediction", "company_id": g.company_id})
        return success({"at_risk_employees": insight.get("at_risk_employees", [])})
    except Exception as e:
        return error(str(e), 500)
