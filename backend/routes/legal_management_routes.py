"""
FILE: backend/routes/legal_management_routes.py
NepHR Pro -- Compliance & Risk Management > Legal Management (3 pages:
Legal Case Tracking, Contract Compliance, Ethics & Governance)
URL prefix: /api/v1/legal

Legal Case Tracking reads the EXISTING grievances/complaints tables
via legal_case_metadata's polymorphic reference -- never a duplicate
case store. Ethics & Governance follows the same server-side identity-
discard discipline as suggestions.is_anonymous.

Nepal legal grounding: 21-day negotiation, 35-day Labour Court appeal
(reusing existing grievance deadlines); mandatory written contracts,
6-month probation cap; equal pay/non-discrimination, forced/child
labor penalties up to NPR 500,000.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..ai.insights import generate_ai_insights

legal_bp = Blueprint("legal_management", __name__, url_prefix="/api/v1/legal")


# ════════════════════════════════════════════════════════════════
# PAGE 1: LEGAL CASE TRACKING
# ════════════════════════════════════════════════════════════════

@legal_bp.get("/cases")
@require_auth
@require_role("super_admin", "hr_manager")
def list_legal_cases():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_legal_case_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@legal_bp.post("/cases/escalate")
@require_auth
@require_role("super_admin", "hr_manager")
def escalate_to_legal_tracking():
    """Promotes an EXISTING grievance/complaint into legal tracking once it reaches Labour Office/Court -- never copies the underlying case."""
    body = request.get_json() or {}
    required = ["source_table", "source_record_id", "case_no"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if body["source_table"] not in ("grievances", "complaints"): return error("Invalid source_table", 400)
    try:
        result = db.session.execute(text("""
            INSERT INTO legal_case_metadata (company_id, case_no, source_table, source_record_id, counsel_type, counsel_name)
            VALUES (:cid, :case_no, :stable, :srid, :ctype, :cname) RETURNING id
        """), {"cid": g.company_id, "case_no": body["case_no"], "stable": body["source_table"], "srid": body["source_record_id"],
               "ctype": body.get("counsel_type", "in_house"), "cname": body.get("counsel_name")})
        case_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"legal_case_id": case_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@legal_bp.put("/cases/<case_id>/litigation-hold")
@require_auth
@require_role("super_admin", "hr_manager")
def set_litigation_hold(case_id):
    """Freezes deletion of an involved employee's digital records -- even mid-offboarding."""
    body = request.get_json() or {}
    if not body.get("litigation_hold_employee_id"): return error("litigation_hold_employee_id required", 422)
    try:
        db.session.execute(text("""
            UPDATE legal_case_metadata SET litigation_hold_active = TRUE, litigation_hold_employee_id = :eid
            WHERE id = :cid_case AND company_id = :cid
        """), {"eid": body["litigation_hold_employee_id"], "cid_case": case_id, "cid": g.company_id})
        db.session.commit()
        return success({"hold_active": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: CONTRACT COMPLIANCE
# ════════════════════════════════════════════════════════════════

@legal_bp.get("/contracts")
@require_auth
@require_role("super_admin", "hr_manager")
def list_contracts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_contract_dashboard WHERE company_id = :cid ORDER BY days_until_expiry ASC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@legal_bp.post("/contracts")
@require_auth
@require_role("super_admin", "hr_manager")
def add_contract():
    """AI clause scan runs on upload; the result is stored directly, never buried in a separate report."""
    body = request.get_json() or {}
    required = ["contract_type", "party_name"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        ai_flag = None
        if body.get("document_url"):
            insight = generate_ai_insights({"type": "contract_clause_scan", "document_url": body["document_url"]})
            ai_flag = insight.get("flagged_clause")

        result = db.session.execute(text("""
            INSERT INTO contracts (company_id, contract_type, party_name, related_employee_id, signed_date, expires_date, document_url, ai_flagged_clause, created_at)
            VALUES (:cid, :type, :party, :emp, :signed, :expires, :doc, :flag, NOW()) RETURNING id
        """), {"cid": g.company_id, "type": body["contract_type"], "party": body["party_name"], "emp": body.get("related_employee_id"),
               "signed": body.get("signed_date"), "expires": body.get("expires_date"), "doc": body.get("document_url"), "flag": ai_flag})
        contract_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"contract_id": contract_id, "ai_flagged_clause": ai_flag})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@legal_bp.put("/contracts/<contract_id>/sign")
def sign_contract(contract_id):
    """Logs the digital signature timestamp and IP, permanently linked to the signer's digital file."""
    body = request.get_json() or {}
    if not body.get("signature_ip"): return error("signature_ip required", 422)
    try:
        db.session.execute(text("""
            UPDATE contracts SET signed_date = CURRENT_DATE, signature_timestamp = NOW(), signature_ip = :ip WHERE id = :cid
        """), {"ip": body["signature_ip"], "cid": contract_id})
        db.session.commit()
        return success({"signed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@legal_bp.post("/contracts/run-expiry-check")
@require_auth
@require_role("super_admin", "hr_manager")
def run_contract_expiry_check():
    """Triggers the 90/60/30-day expiry alert sweep (normally run as a scheduled job)."""
    try:
        db.session.execute(text("SELECT fn_check_contract_expiry()"))
        db.session.commit()
        return success({"expiry_check_run": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: ETHICS & GOVERNANCE
# ════════════════════════════════════════════════════════════════

@legal_bp.get("/ethics/summary")
@require_auth
@require_role("super_admin", "hr_manager")
def ethics_governance_summary():
    """Aggregated only -- never exposes submitter identity, even for non-anonymous reports, at the summary level."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_ethics_governance_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@legal_bp.get("/ethics/reports")
@require_auth
@require_role("super_admin")
def list_ethics_reports():
    """Restricted to super_admin (the Ethics Committee) -- individual-record access, not the general hr_manager role."""
    try:
        rows = db.session.execute(text(
            "SELECT id, category, description, status, filed_at, resolved_at, is_anonymous, subject_employee_id FROM ethics_reports WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@legal_bp.post("/ethics/reports")
def file_ethics_report():
    """
    Public -- the confidential whistleblower channel. If is_anonymous,
    submitter_employee_id is never written, period -- a DB constraint
    enforces this, not just application-layer discretion.
    """
    body = request.get_json() or {}
    required = ["category", "description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    is_anonymous = body.get("is_anonymous", True)
    try:
        result = db.session.execute(text("""
            INSERT INTO ethics_reports (company_id, is_anonymous, submitter_employee_id, category, description, subject_employee_id, filed_at)
            VALUES (:cid, :anon, :submitter, :cat, :desc, :subject, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "anon": is_anonymous,
               "submitter": None if is_anonymous else body.get("submitter_employee_id"),
               "cat": body["category"], "desc": body["description"], "subject": body.get("subject_employee_id")})
        report_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"report_id": report_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@legal_bp.put("/ethics/reports/<report_id>/advance-status")
@require_auth
@require_role("super_admin")
def advance_ethics_report_status(report_id):
    body = request.get_json() or {}
    if not body.get("status"): return error("status required", 422)
    try:
        is_resolved = body["status"] == "resolved"
        db.session.execute(text("""
            UPDATE ethics_reports SET status = :status, resolved_at = CASE WHEN :resolved THEN NOW() ELSE resolved_at END
            WHERE id = :rid AND company_id = :cid
        """), {"status": body["status"], "resolved": is_resolved, "rid": report_id, "cid": g.company_id})
        db.session.commit()
        return success({"advanced": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)
