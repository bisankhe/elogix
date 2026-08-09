"""
FILE: backend/routes/workflow_automation_routes.py
NepHR Pro -- System Administration > Workflow & Automation (7 pages:
Workflow Builder, Auto Reminder Setup, Approval Matrix / Workflow
Setup, Multi-Level Approval, Notification Engine, Escalation Rules,
Automation Rules)
URL prefix: /api/v1/workflow-automation

Workflow Builder, Auto Reminder Setup, Approval Matrix, and Multi-
Level Approval are the configurable meta-layer above dozens of
already-built triggers -- no new tables for those 4; this file's
genuinely new surface is Notification Engine, Escalation Rules, and
Automation Rules.

Compliance grounding: transparent escalation audit logging; the
"escalation to nowhere" structural guard; the manual exception path
for genuine edge cases.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

workflow_bp = Blueprint("workflow_automation", __name__, url_prefix="/api/v1/workflow-automation")


# ════════════════════════════════════════════════════════════════
# PAGE 5: NOTIFICATION ENGINE
# ════════════════════════════════════════════════════════════════

@workflow_bp.get("/notifications/types")
@require_auth
@require_role("super_admin", "hr_manager")
def list_notification_types():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_notification_engine_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@workflow_bp.post("/notifications/types")
@require_auth
@require_role("super_admin", "hr_manager")
def create_notification_type():
    body = request.get_json() or {}
    required = ["notification_type", "message_template"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO notification_type_configs (company_id, notification_type, channels, message_template, digest_mode_enabled)
            VALUES (:cid, :type, :channels, :template, :digest) RETURNING id
        """), {"cid": g.company_id, "type": body["notification_type"], "channels": body.get("channels", ["in_app"]),
               "template": body["message_template"], "digest": body.get("digest_mode_enabled", False)})
        config_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"config_id": config_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 6: ESCALATION RULES
# ════════════════════════════════════════════════════════════════

@workflow_bp.get("/escalation-rules")
@require_auth
@require_role("super_admin", "hr_manager")
def list_escalation_rules():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_escalation_rules_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@workflow_bp.post("/escalation-rules")
@require_auth
@require_role("super_admin", "hr_manager")
def create_escalation_rule():
    """DB trigger raises a WARNING (not a hard block) if escalates_can_act is FALSE -- 'escalation to nowhere'."""
    body = request.get_json() or {}
    required = ["transaction_type", "threshold_hours"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO escalation_rules (company_id, transaction_type, threshold_hours, escalates_to_role, escalates_to_employee_id, escalates_can_act)
            VALUES (:cid, :type, :hours, :role, :emp, :can_act) RETURNING id
        """), {"cid": g.company_id, "type": body["transaction_type"], "hours": body["threshold_hours"],
               "role": body.get("escalates_to_role"), "emp": body.get("escalates_to_employee_id"), "can_act": body.get("escalates_can_act", True)})
        rule_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"rule_id": rule_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@workflow_bp.post("/escalation-rules/<rule_id>/log-escalation")
@require_auth
def log_escalation(rule_id):
    """Called whenever a real escalation actually fires -- the transparent audit trail the brief explicitly requires."""
    body = request.get_json() or {}
    required = ["source_table", "source_record_id", "reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO escalation_log (company_id, escalation_rule_id, source_table, source_record_id, escalated_from_employee_id, escalated_to_employee_id, reason, escalated_at)
            VALUES (:cid, :rule, :stable, :srid, :from_emp, :to_emp, :reason, NOW()) RETURNING id
        """), {"cid": g.company_id, "rule": rule_id, "stable": body["source_table"], "srid": body["source_record_id"],
               "from_emp": body.get("escalated_from_employee_id"), "to_emp": body.get("escalated_to_employee_id"), "reason": body["reason"]})
        log_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"log_id": log_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 7: AUTOMATION RULES
# ════════════════════════════════════════════════════════════════

@workflow_bp.get("/automation-rules")
@require_auth
@require_role("super_admin", "hr_manager")
def list_automation_rules():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_automation_rules_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@workflow_bp.post("/automation-rules")
@require_auth
@require_role("super_admin", "hr_manager")
def create_automation_rule():
    body = request.get_json() or {}
    required = ["rule_name", "condition_text", "action_text"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO automation_rules (company_id, rule_name, condition_text, action_text, created_by, created_at)
            VALUES (:cid, :name, :condition, :action, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["rule_name"], "condition": body["condition_text"], "action": body["action_text"], "user": g.user_id})
        rule_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"rule_id": rule_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@workflow_bp.get("/automation-rules/exceptions")
@require_auth
@require_role("super_admin", "hr_manager")
def list_automation_exceptions():
    """The manual override queue -- genuine edge cases that the standard rule would otherwise silently block."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM automation_exceptions WHERE company_id = :cid AND status = 'pending'"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@workflow_bp.post("/automation-rules/exceptions")
@require_auth
def request_automation_exception():
    body = request.get_json() or {}
    required = ["request_description", "reason_for_exception"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO automation_exceptions (company_id, request_description, blocked_by_rule_id, reason_for_exception, requested_by, created_at)
            VALUES (:cid, :desc, :rule, :reason, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "desc": body["request_description"], "rule": body.get("blocked_by_rule_id"), "reason": body["reason_for_exception"], "user": g.user_id})
        exception_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"exception_id": exception_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@workflow_bp.put("/automation-rules/exceptions/<exception_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager")
def decide_automation_exception(exception_id):
    body = request.get_json() or {}
    decision = body.get("decision")
    if decision not in ("approved", "rejected"): return error("decision must be approved or rejected", 422)
    try:
        db.session.execute(text("""
            UPDATE automation_exceptions SET status = :decision, decided_by = :user, decided_at = NOW() WHERE id = :eid AND company_id = :cid
        """), {"decision": decision, "user": g.user_id, "eid": exception_id, "cid": g.company_id})
        db.session.commit()
        return success({"decided": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# PAGES 1-4 (Workflow Builder, Auto Reminder Setup, Approval Matrix,
# Multi-Level Approval): intentionally NO new routes here -- all 4 are
# the configurable meta-layer reading/writing the EXISTING tables they
# already document reusing (transaction_notifications, approval_stage
# columns established across many prior sessions).
