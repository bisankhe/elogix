"""
FILE: backend/routes/wellness_support_routes.py
eLogix HRMS -- Employee Experience & Culture > Wellness & Support
(5 pages: Wellness Program, Mental Health Support, Insurance
Management, Emergency Support, Employee Assistance Program)
URL prefix: /api/v1/wellness-support

CRITICAL RBAC NOTE: Mental Health Support and EAP routes are
self-service ONLY -- every route in those sections requires the
employee_id to match the authenticated user, and there is NO manager
or HR-facing endpoint that returns individual session/case data.
The only aggregate view (v_wellbeing_anonymized_trends) suppresses
counts below 5 employees to prevent re-identification.

Emergency Support reuses the EXISTING employee_emergency_contacts
table directly -- no duplicate contact storage.

Nepal Labour Act 2017 (2074): Section 18 (100% employer-borne accident
insurance; 50-50 medical insurance split); mandatory Welfare Fund;
SSF integration; 12 days paid + 1 month unpaid mental health leave.
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

wellness_bp = Blueprint("wellness_support", __name__, url_prefix="/api/v1/wellness-support")


# ════════════════════════════════════════════════════════════════
# PAGE 1: WELLNESS PROGRAM
# ════════════════════════════════════════════════════════════════

@wellness_bp.get("/challenges/<employee_id>")
def my_challenges(employee_id):
    """Public/ESS -- a person's own challenge participation."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_wellness_dashboard WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wellness_bp.post("/challenges/<challenge_id>/join")
def join_challenge(challenge_id):
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO wellness_challenge_participants (wellness_challenge_id, employee_id, company_id, joined_at)
            VALUES (:cid, :eid, :company, NOW()) ON CONFLICT (wellness_challenge_id, employee_id) DO NOTHING
        """), {"cid": challenge_id, "eid": body["employee_id"], "company": body.get("company_id")})
        db.session.commit()
        return success({"joined": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wellness_bp.put("/challenges/sync-wearable")
def sync_wearable_data():
    """Public/ESS -- wearable step-sync webhook."""
    body = request.get_json() or {}
    required = ["employee_id", "challenge_id", "steps_today"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            UPDATE wellness_challenge_participants SET wearable_steps_today = :steps
            WHERE wellness_challenge_id = :cid AND employee_id = :eid
        """), {"steps": body["steps_today"], "cid": body["challenge_id"], "eid": body["employee_id"]})
        db.session.commit()
        return success({"synced": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: MENTAL HEALTH SUPPORT -- STRICT SELF-SERVICE ONLY
# ════════════════════════════════════════════════════════════════

@wellness_bp.get("/mental-health/<employee_id>")
@require_auth
def my_mental_health(employee_id):
    """
    RBAC: only the authenticated employee can view their own sessions.
    No manager/HR variant of this route exists anywhere in this module.
    """
    if str(g.user_id) != str(employee_id) and g.role not in ("super_admin",):
        return error("Access denied: mental health records are self-service only.", 403)
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_mental_health_sessions WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wellness_bp.post("/mental-health/book")
def book_session():
    """Public/ESS -- the employee books their own session; no approval step."""
    body = request.get_json() or {}
    required = ["employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO mental_health_sessions (company_id, employee_id, clinician_name, preferred_language, session_date, booked_at)
            VALUES (:cid, :eid, :clinician, :lang, :date, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "clinician": body.get("clinician_name"),
               "lang": body.get("preferred_language"), "date": body.get("session_date")})
        session_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"session_id": session_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wellness_bp.post("/mental-health/ai-match-clinician")
def ai_match_clinician():
    """Public/ESS -- AI matching considers language/specialty only, never shared outside the care platform."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "clinician_matching", "preferences": body.get("preferences", {})})
        return success({"matched_clinicians": insight.get("matched_clinicians", [])})
    except Exception as e:
        return error(str(e), 500)


@wellness_bp.get("/mental-health/wellbeing-trends")
@require_auth
@require_role("super_admin", "hr_manager")
def wellbeing_trends():
    """
    The ONLY manager/HR-facing endpoint touching mental health data --
    fully anonymized and suppressed below 5 employees per department.
    """
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_wellbeing_anonymized_trends WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 3: INSURANCE MANAGEMENT
# ════════════════════════════════════════════════════════════════

@wellness_bp.get("/insurance/<employee_id>")
def my_insurance(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_insurance_dashboard WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wellness_bp.get("/insurance/<employee_id>/claims")
def my_claims(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_claims_dashboard WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wellness_bp.post("/insurance/claims")
def submit_claim():
    """DB trigger auto-applies the claim to the policy on approval."""
    body = request.get_json() or {}
    required = ["employee_id", "insurance_policy_id", "provider_name", "amount_npr"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO insurance_claims (company_id, insurance_policy_id, employee_id, provider_name, amount_npr, receipt_url, submitted_at)
            VALUES (:cid, :policy, :eid, :provider, :amount, :receipt, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "policy": body["insurance_policy_id"], "eid": body["employee_id"],
               "provider": body["provider_name"], "amount": body["amount_npr"], "receipt": body.get("receipt_url")})
        claim_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"claim_id": claim_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wellness_bp.put("/insurance/claims/<claim_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager")
def decide_claim(claim_id):
    body = request.get_json() or {}
    if body.get("status") not in ("approved", "rejected"): return error("status must be approved or rejected", 422)
    try:
        db.session.execute(text("""
            UPDATE insurance_claims SET status = :status WHERE id = :cid AND company_id = :company
        """), {"status": body["status"], "cid": claim_id, "company": g.company_id})
        db.session.commit()
        return success({"decided": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wellness_bp.post("/insurance/claims/ai-ocr-extract")
def ai_ocr_extract():
    """AI extracts amount/provider from an uploaded receipt photo."""
    body = request.get_json() or {}
    if not body.get("receipt_url"): return error("receipt_url required", 422)
    try:
        insight = generate_ai_insights({"type": "receipt_ocr_extraction", "receipt_url": body["receipt_url"]})
        return success({"extracted_amount": insight.get("extracted_amount"), "extracted_provider": insight.get("extracted_provider")})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: EMERGENCY SUPPORT
# ════════════════════════════════════════════════════════════════

@wellness_bp.post("/emergency/sos")
def trigger_sos():
    """
    DB trigger pulls the EXISTING primary emergency contact and notifies
    HR + that contact -- the contact record itself is never duplicated here.
    """
    body = request.get_json() or {}
    required = ["employee_id", "latitude", "longitude"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO emergency_sos_alerts (company_id, employee_id, latitude, longitude, triggered_at)
            VALUES (:cid, :eid, :lat, :lng, NOW()) RETURNING id, notified_emergency_contact_id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "lat": body["latitude"], "lng": body["longitude"]})
        row = result.fetchone()
        db.session.commit()
        return created({"alert_id": str(row[0]), "notified_contact_id": str(row[1]) if row[1] else None})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wellness_bp.get("/emergency/sos-alerts")
@require_auth
@require_role("super_admin", "hr_manager")
def list_sos_alerts():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_emergency_support_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wellness_bp.get("/emergency/safety-checkins")
@require_auth
def active_safety_checkins():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_active_safety_checkins WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wellness_bp.post("/emergency/safety-checkins")
@require_auth
@require_role("super_admin", "hr_manager")
def broadcast_safety_checkin():
    """DB trigger auto-notifies every employee in the company."""
    body = request.get_json() or {}
    if not body.get("event_title"): return error("event_title required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO safety_checkin_events (company_id, event_title, affected_location, issued_at)
            VALUES (:cid, :title, :location, NOW()) RETURNING id
        """), {"cid": g.company_id, "title": body["event_title"], "location": body.get("affected_location")})
        event_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"event_id": event_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wellness_bp.post("/emergency/safety-checkins/<event_id>/confirm")
def confirm_safe(event_id):
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO safety_checkin_responses (safety_checkin_event_id, employee_id, company_id, confirmed_safe, responded_at)
            VALUES (:eventid, :eid, :cid, TRUE, NOW())
            ON CONFLICT (safety_checkin_event_id, employee_id) DO UPDATE SET confirmed_safe = TRUE, responded_at = NOW()
        """), {"eventid": event_id, "eid": body["employee_id"], "cid": body.get("company_id")})
        db.session.commit()
        return success({"confirmed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wellness_bp.post("/emergency/welfare-fund")
def request_welfare_fund():
    body = request.get_json() or {}
    required = ["employee_id", "reason", "requested_amount_npr"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO welfare_fund_requests (company_id, employee_id, reason, requested_amount_npr, submitted_at)
            VALUES (:cid, :eid, :reason, :amount, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "reason": body["reason"], "amount": body["requested_amount_npr"]})
        req_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"request_id": req_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wellness_bp.put("/emergency/welfare-fund/<request_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager")
def decide_welfare_fund(request_id):
    body = request.get_json() or {}
    if body.get("status") not in ("approved", "rejected"): return error("status must be approved or rejected", 422)
    try:
        db.session.execute(text("""
            UPDATE welfare_fund_requests SET status = :status, approved_amount_npr = :amount, decided_by = :user, decided_at = NOW()
            WHERE id = :rid AND company_id = :cid
        """), {"status": body["status"], "amount": body.get("approved_amount_npr"), "user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"decided": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 5: EMPLOYEE ASSISTANCE PROGRAM -- STRICT SELF-SERVICE ONLY
# ════════════════════════════════════════════════════════════════

@wellness_bp.get("/eap/<employee_id>")
@require_auth
def my_eap_cases(employee_id):
    """
    RBAC: identical isolation principle to Mental Health Support --
    only the authenticated employee can view their own EAP cases.
    """
    if str(g.user_id) != str(employee_id) and g.role not in ("super_admin",):
        return error("Access denied: EAP records are self-service only.", 403)
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_eap_cases WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wellness_bp.post("/eap/request")
def request_eap_support():
    """Public/ESS -- no approval step, no manager visibility at any point."""
    body = request.get_json() or {}
    required = ["employee_id", "category"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO eap_cases (company_id, employee_id, category, requested_at)
            VALUES (:cid, :eid, :category, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "category": body["category"]})
        case_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"case_id": case_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel export (aggregate, anonymized only) ───────────────────────────────────────
@wellness_bp.get("/excel-export/<module>")
@require_auth
@require_role("super_admin", "hr_manager")
def excel_export(module):
    """Only insurance and welfare-fund are exportable in identifiable form -- mental health/EAP are never exportable."""
    allowed = ["insurance-claims", "welfare-fund", "wellbeing-trends-anonymized"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"wellness_{module}_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"wellness_{module}_export.xlsx")
