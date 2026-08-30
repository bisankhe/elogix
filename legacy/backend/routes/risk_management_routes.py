"""
FILE: backend/routes/risk_management_routes.py
eLogix HRMS -- Compliance & Risk Management > Risk Management (6 pages:
KRI Dashboard, Compliance Risk, Payroll Risk, Attrition Risk, Security
Risk, Risk Alerts)
URL prefix: /api/v1/risk-management

KRI Dashboard, Compliance Risk, and Attrition Risk are pure reads over
EXISTING tables from prior sessions -- never a second risk calculation
engine. Payroll Risk and Security Risk have genuinely new detection
tables. Risk Alerts is the unified, configurable remediation layer.

Nepal legal grounding: SSF 11%/10% contribution split validation;
overtime capped 4h/day, 24h/week at 1.5x; OHS Safety Committee and
stop-work orders; night-shift transport compliance for female employees.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..ai.insights import generate_ai_insights

risk_bp = Blueprint("risk_management", __name__, url_prefix="/api/v1/risk-management")


# ════════════════════════════════════════════════════════════════
# PAGE 1: KRI DASHBOARD (pure rollup)
# ════════════════════════════════════════════════════════════════

@risk_bp.get("/kri")
@require_auth
@require_role("super_admin", "hr_manager")
def kri_dashboard():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_kri_health_index WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@risk_bp.post("/kri/ai-correlate")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_correlate_risk_signals():
    """AI flags genuinely correlated risk clusters across domains (e.g. overtime + declining engagement on the same team)."""
    try:
        insight = generate_ai_insights({"type": "kri_cross_domain_correlation", "company_id": g.company_id})
        return success({"correlations": insight.get("correlations", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: COMPLIANCE RISK (reuses Compliance Management views verbatim)
# ════════════════════════════════════════════════════════════════

@risk_bp.get("/compliance")
@require_auth
@require_role("super_admin", "hr_manager")
def compliance_risk_dashboard():
    try:
        gate_status = db.session.execute(text(
            "SELECT * FROM v_first_salary_policy_gate_status WHERE company_id = :cid AND unsigned_mandatory_count > 0"
        ), {"cid": g.company_id}).fetchall()
        licenses = db.session.execute(text(
            "SELECT * FROM v_license_dashboard WHERE company_id = :cid AND days_until_expiry <= 30"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "policy_gate_risks": [dict(r._mapping) for r in gate_status],
            "expiring_licenses": [dict(r._mapping) for r in licenses],
        })
    except Exception:
        return success({"policy_gate_risks": [], "expiring_licenses": []})


# ════════════════════════════════════════════════════════════════
# PAGE 3: PAYROLL RISK
# ════════════════════════════════════════════════════════════════

@risk_bp.get("/payroll")
@require_auth
@require_role("super_admin", "hr_manager")
def payroll_risk_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_payroll_risk_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@risk_bp.post("/payroll/run-overtime-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def run_overtime_scan():
    """Triggers the weekly-overtime risk scan (normally run as a scheduled job)."""
    try:
        db.session.execute(text("SELECT fn_flag_overtime_risk()"))
        db.session.commit()
        return success({"scan_run": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@risk_bp.put("/payroll/<flag_id>/resolve")
@require_auth
@require_role("super_admin", "hr_manager")
def resolve_payroll_flag(flag_id):
    try:
        db.session.execute(text("""
            UPDATE payroll_risk_flags SET status = 'resolved', resolved_at = NOW() WHERE id = :fid AND company_id = :cid
        """), {"fid": flag_id, "cid": g.company_id})
        db.session.commit()
        return success({"resolved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: ATTRITION RISK (reuses Exit Analytics + Succession Planning views)
# ════════════════════════════════════════════════════════════════

@risk_bp.get("/attrition")
@require_auth
@require_role("super_admin", "hr_manager")
def attrition_risk_dashboard():
    try:
        manager_correlation = db.session.execute(text(
            "SELECT * FROM v_flight_risk_correlation WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        individual_risk = db.session.execute(text("""
            SELECT sc.employee_id, e.first_name, e.last_name, sc.incumbent_flight_risk
            FROM successor_candidates sc JOIN employees e ON sc.employee_id = e.id
            WHERE sc.company_id = :cid AND sc.incumbent_flight_risk IN ('high','medium')
        """), {"cid": g.company_id}).fetchall()
        return success({
            "manager_correlation": [dict(r._mapping) for r in manager_correlation],
            "individual_flight_risk": [dict(r._mapping) for r in individual_risk],
        })
    except Exception:
        return success({"manager_correlation": [], "individual_flight_risk": []})


# ════════════════════════════════════════════════════════════════
# PAGE 5: SECURITY RISK
# ════════════════════════════════════════════════════════════════

@risk_bp.get("/security")
@require_auth
@require_role("super_admin", "hr_manager")
def security_risk_dashboard():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_security_risk_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        safety_committee = db.session.execute(text(
            "SELECT * FROM safety_committee_inspections WHERE company_id = :cid ORDER BY inspection_date DESC LIMIT 1"
        ), {"cid": g.company_id}).fetchone()
        return success({
            "access_risk": dict(row._mapping) if row else {},
            "safety_committee": dict(safety_committee._mapping) if safety_committee else {},
        })
    except Exception:
        return success({"access_risk": {}, "safety_committee": {}})


@risk_bp.post("/security/log-access")
def log_security_access():
    """Internal -- called by the auth layer whenever sensitive data (payroll, PII) is accessed."""
    body = request.get_json() or {}
    required = ["employee_id", "accessed_resource"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO security_access_audit_log (company_id, employee_id, accessed_resource, access_ip, access_device, is_outside_business_hours, is_unusual_pattern, accessed_at)
            VALUES (:cid, :eid, :resource, :ip, :device, :outside_hours, :unusual, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "resource": body["accessed_resource"], "ip": body.get("access_ip"),
               "device": body.get("access_device"), "outside_hours": body.get("is_outside_business_hours", False), "unusual": body.get("is_unusual_pattern", False)})
        log_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"log_id": log_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 6: RISK ALERTS (configurable remediation layer)
# ════════════════════════════════════════════════════════════════

@risk_bp.get("/alerts")
@require_auth
@require_role("super_admin", "hr_manager")
def list_risk_alerts():
    domain = request.args.get("domain")
    try:
        q = "SELECT * FROM v_risk_alerts_feed WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if domain and domain != "all":
            q += " AND domain = :domain"
            params["domain"] = domain
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@risk_bp.post("/alerts/rules")
@require_auth
@require_role("super_admin", "hr_manager")
def configure_alert_rule():
    body = request.get_json() or {}
    required = ["domain", "rule_name"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO risk_alert_rules (company_id, domain, rule_name, threshold_value, is_active)
            VALUES (:cid, :domain, :name, :threshold, :active) RETURNING id
        """), {"cid": g.company_id, "domain": body["domain"], "name": body["rule_name"], "threshold": body.get("threshold_value"), "active": body.get("is_active", True)})
        rule_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"rule_id": rule_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@risk_bp.put("/alerts/<alert_id>/resolve")
@require_auth
@require_role("super_admin", "hr_manager")
def resolve_risk_alert(alert_id):
    """The direct remediation action -- closes the alert tied to its source record."""
    try:
        db.session.execute(text("""
            UPDATE risk_alerts SET status = 'resolved', resolved_at = NOW() WHERE id = :aid AND company_id = :cid
        """), {"aid": alert_id, "cid": g.company_id})
        db.session.commit()
        return success({"resolved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)
