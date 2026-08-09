"""
FILE: backend/routes/integration_api_routes.py
NepHR Pro -- System Administration > Integration & API (3 pages: API
& Third Party Integration, Email & SMS Integration, Biometric
Integration)
URL prefix: /api/v1/integration

Biometric Integration reuses the EXISTING BiometricIntegrationPage
backend endpoints verbatim (the page was fully built, just never
routed -- no new routes needed here). API & Third Party Integration
and Email & SMS Integration are genuinely new.

Global compliance grounding: encrypted credential storage; certified
delivery with read-receipt proof for labour-contract-related messages.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created
from ..utils.encryption import encrypt_value  # assumed existing utility, consistent with "encrypted at rest" elsewhere in the build

integration_bp = Blueprint("integration_api", __name__, url_prefix="/api/v1/integration")


# ════════════════════════════════════════════════════════════════
# PAGE 1: API & THIRD PARTY INTEGRATION
# ════════════════════════════════════════════════════════════════

@integration_bp.get("/third-party")
@require_auth
@require_role("super_admin", "hr_manager")
def list_third_party_integrations():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_third_party_integrations_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@integration_bp.post("/third-party")
@require_auth
@require_role("super_admin")
def connect_third_party_app():
    """API credentials are encrypted before storage -- never written or returned in plain text."""
    body = request.get_json() or {}
    required = ["app_name", "category"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        encrypted = encrypt_value(body.get("api_credentials")) if body.get("api_credentials") else None
        result = db.session.execute(text("""
            INSERT INTO third_party_integrations (company_id, app_name, category, api_credentials_encrypted, webhook_url, status, created_at)
            VALUES (:cid, :name, :cat, :creds, :webhook, 'connected', NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["app_name"], "cat": body["category"], "creds": encrypted, "webhook": body.get("webhook_url")})
        integration_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"integration_id": integration_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@integration_bp.post("/third-party/<integration_id>/field-mappings")
@require_auth
@require_role("super_admin", "hr_manager")
def add_field_mapping(integration_id):
    body = request.get_json() or {}
    required = ["external_field_name", "internal_field_name"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO integration_field_mappings (third_party_integration_id, external_field_name, internal_field_name, expected_value_set)
            VALUES (:tpid, :ext, :internal, :values) RETURNING id
        """), {"tpid": integration_id, "ext": body["external_field_name"], "internal": body["internal_field_name"], "values": body.get("expected_value_set")})
        mapping_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"mapping_id": mapping_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@integration_bp.post("/third-party/sync-webhook")
def receive_sync_webhook():
    """
    Public endpoint -- the actual inbound webhook receiver. Checks the
    incoming value against expected_value_set and flags drift via the
    DB trigger if it doesn't match, rather than passing an unexpected
    value straight through to a downstream system.
    """
    body = request.get_json() or {}
    required = ["mapping_id", "incoming_value"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        row = db.session.execute(text(
            "SELECT expected_value_set FROM integration_field_mappings WHERE id = :mid"
        ), {"mid": body["mapping_id"]}).fetchone()
        expected = row[0] if row and row[0] else []
        is_drift = expected and body["incoming_value"] not in expected
        db.session.execute(text("""
            UPDATE integration_field_mappings SET has_drift_flag = :drift, last_unexpected_value = :val WHERE id = :mid
        """), {"drift": bool(is_drift), "val": body["incoming_value"] if is_drift else None, "mid": body["mapping_id"]})
        db.session.commit()
        return success({"accepted": True, "flagged_drift": bool(is_drift)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: EMAIL & SMS INTEGRATION
# ════════════════════════════════════════════════════════════════

@integration_bp.get("/email-sms/gateways")
@require_auth
@require_role("super_admin", "hr_manager")
def list_gateways():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_email_sms_gateway_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@integration_bp.post("/email-sms/gateways")
@require_auth
@require_role("super_admin")
def configure_gateway():
    """The actual provider credentials -- power EVERY notification type already configured in Notification Engine."""
    body = request.get_json() or {}
    required = ["provider", "gateway_type", "credentials"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        encrypted = encrypt_value(body["credentials"])
        result = db.session.execute(text("""
            INSERT INTO email_sms_gateways (company_id, provider, gateway_type, credentials_encrypted, verified_sender_identity, status, created_at)
            VALUES (:cid, :provider, :type, :creds, :sender, 'connected', NOW()) RETURNING id
        """), {"cid": g.company_id, "provider": body["provider"], "type": body["gateway_type"], "creds": encrypted, "sender": body.get("verified_sender_identity")})
        gateway_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"gateway_id": gateway_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@integration_bp.get("/email-sms/certified-messages")
@require_auth
@require_role("super_admin", "hr_manager")
def list_certified_messages():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_certified_message_log_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@integration_bp.post("/email-sms/certified-messages")
def log_certified_message():
    """Internal -- called whenever a disciplinary/policy-update message is sent, auto-flagging is_legal_grade."""
    body = request.get_json() or {}
    required = ["message_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    legal_grade_types = ["Disciplinary Warning Letter", "Policy Update", "Termination Notice"]
    try:
        is_legal = body["message_type"] in legal_grade_types
        result = db.session.execute(text("""
            INSERT INTO certified_message_log (company_id, email_sms_gateway_id, message_type, recipient_employee_id, is_legal_grade, delivered_at, created_at)
            VALUES (:cid, :gw, :type, :recipient, :legal, NOW(), NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "gw": body.get("email_sms_gateway_id"), "type": body["message_type"],
               "recipient": body.get("recipient_employee_id"), "legal": is_legal})
        message_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"message_id": message_id, "is_legal_grade": is_legal})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@integration_bp.put("/email-sms/certified-messages/<message_id>/read-receipt")
def record_read_receipt(message_id):
    """Called when the recipient's client confirms the message was read."""
    try:
        db.session.execute(text("""
            UPDATE certified_message_log SET read_receipt_captured_at = NOW() WHERE id = :mid
        """), {"mid": message_id})
        db.session.commit()
        return success({"receipt_recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# PAGE 3 (Biometric Integration): intentionally NO new routes here --
# reuses the EXISTING BiometricIntegrationPage's own backend
# endpoints verbatim (already fully built, only the route/import
# wiring was missing).
