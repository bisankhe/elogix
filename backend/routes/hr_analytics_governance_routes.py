"""
FILE: backend/routes/hr_analytics_governance_routes.py
NepHR Pro -- Reports, Analytics & BI > HR Analytics (3 pages:
Compliance Reports, Workforce Analytics, Annual HR Audit)
URL prefix: /api/v1/hr-analytics-governance

Annual HR Audit reuses the EXISTING /api/v1/compliance/annual-labour-audit*
endpoints verbatim -- the same Section 80 audit, just a second
navigation entry point. Compliance Reports and Workforce Analytics
have genuinely new endpoints for accident reporting, CBA filings, and
what-if scenario modeling.

Nepal legal grounding: Section 80 audit; immediate accident-reporting
duty; work-permit and CBA filing tracking; Privacy Act purpose
limitation for workforce analytics.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created
from ..ai.insights import generate_ai_insights

hr_gov_bp = Blueprint("hr_analytics_governance", __name__, url_prefix="/api/v1/hr-analytics-governance")


# ════════════════════════════════════════════════════════════════
# PAGE 1: COMPLIANCE REPORTS
# ════════════════════════════════════════════════════════════════

@hr_gov_bp.get("/compliance-reports")
@require_auth
@require_role("super_admin", "hr_manager")
def compliance_reports_dashboard():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_compliance_reports_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@hr_gov_bp.post("/accidents")
def report_workplace_accident():
    """Public/ESS -- DB trigger fires an immediate notification for serious/fatal severity, the legal 'report immediately' duty."""
    body = request.get_json() or {}
    required = ["description", "severity", "reported_by"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO workplace_accident_reports (company_id, affected_employee_id, description, severity, reported_by, reported_at)
            VALUES (:cid, :emp, :desc, :severity, :reporter, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "emp": body.get("affected_employee_id"), "desc": body["description"],
               "severity": body["severity"], "reporter": body["reported_by"]})
        report_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"report_id": report_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@hr_gov_bp.put("/accidents/<report_id>/mark-notified")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_accident_notified(report_id):
    """Confirms the Labour Office has been notified for a serious/fatal incident."""
    try:
        db.session.execute(text("""
            UPDATE workplace_accident_reports SET labour_office_notified_at = NOW() WHERE id = :rid AND company_id = :cid
        """), {"rid": report_id, "cid": g.company_id})
        db.session.commit()
        return success({"notified": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@hr_gov_bp.post("/collective-bargaining-filings")
@require_auth
@require_role("super_admin", "hr_manager")
def file_collective_bargaining_agreement():
    body = request.get_json() or {}
    required = ["union_name"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO collective_bargaining_filings (company_id, union_name, agreement_summary, filed_with_labour_office_at, document_url, created_at)
            VALUES (:cid, :union, :summary, :filed, :doc, NOW()) RETURNING id
        """), {"cid": g.company_id, "union": body["union_name"], "summary": body.get("agreement_summary"),
               "filed": body.get("filed_with_labour_office_at"), "doc": body.get("document_url")})
        filing_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"filing_id": filing_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: WORKFORCE ANALYTICS
# ════════════════════════════════════════════════════════════════

@hr_gov_bp.get("/workforce-analytics")
@require_auth
@require_role("super_admin", "hr_manager")
def workforce_analytics_synthesis():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_workforce_analytics_synthesis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        scenarios = db.session.execute(text(
            "SELECT * FROM workforce_analytics_scenarios WHERE company_id = :cid ORDER BY created_at DESC LIMIT 10"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "synthesis": dict(row._mapping) if row else {},
            "scenarios": [dict(r._mapping) for r in scenarios],
        })
    except Exception:
        return success({"synthesis": {}, "scenarios": []})


@hr_gov_bp.post("/workforce-analytics/run-scenario")
@require_auth
@require_role("super_admin", "hr_manager")
def run_what_if_scenario():
    """AI models the scenario against real headcount/cost data and generates a risk callout."""
    body = request.get_json() or {}
    required = ["scenario_name", "headcount_delta"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        insight = generate_ai_insights({"type": "workforce_what_if_scenario", "headcount_delta": body["headcount_delta"], "company_id": g.company_id})
        result = db.session.execute(text("""
            INSERT INTO workforce_analytics_scenarios (company_id, scenario_name, headcount_delta, estimated_cost_impact_npr, risk_note, created_by, created_at)
            VALUES (:cid, :name, :delta, :cost, :risk, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["scenario_name"], "delta": body["headcount_delta"],
               "cost": insight.get("estimated_cost_impact_npr"), "risk": insight.get("risk_note"), "user": g.user_id})
        scenario_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"scenario_id": scenario_id, "risk_note": insight.get("risk_note")})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# PAGE 3 (Annual HR Audit): intentionally NO routes here -- reuses the
# EXISTING /api/v1/compliance/annual-labour-audit* endpoints
# (Compliance Management session) verbatim.
