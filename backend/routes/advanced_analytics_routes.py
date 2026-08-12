"""
FILE: backend/routes/advanced_analytics_routes.py
eLogix HRMS -- Reports, Analytics & BI > Advanced Analytics (5 pages:
Predictive Analytics, AI Insights, BI Dashboard, Custom Report
Builder, Export Center)
URL prefix: /api/v1/advanced-analytics

Predictive Analytics and AI Insights both reuse the EXISTING
/api/v1/ai-insights* endpoints verbatim -- the same forecasting hub,
two navigation entry points. BI Dashboard is a pure read. Custom
Report Builder and Export Center carry the Section 139 evidence-grade
safeguard and the PII-export legal-grounds gate.

Nepal legal grounding: Section 139 (algorithm-based decisions must be
defensible with human evidence); Privacy Act 2075 (consent + purpose
limitation for PII exports); Section 31/32 (recordkeeping).
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created

adv_analytics_bp = Blueprint("advanced_analytics", __name__, url_prefix="/api/v1/advanced-analytics")


# PAGES 1 & 2 (Predictive Analytics, AI Insights): intentionally NO
# routes here -- both reuse the EXISTING /api/v1/ai-insights* endpoints
# verbatim (the same comprehensive forecasting hub).


# ════════════════════════════════════════════════════════════════
# PAGE 3: BI DASHBOARD
# ════════════════════════════════════════════════════════════════

@adv_analytics_bp.get("/bi-dashboard")
@require_auth
@require_role("super_admin", "hr_manager")
def bi_dashboard():
    try:
        row = db.session.execute(text("SELECT * FROM v_bi_dashboard_summary")).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# ════════════════════════════════════════════════════════════════
# PAGE 4: CUSTOM REPORT BUILDER
# ════════════════════════════════════════════════════════════════

@adv_analytics_bp.get("/field-dictionary")
@require_auth
def field_dictionary():
    """The pre-mapped data dictionary backing the drag-and-drop builder."""
    try:
        rows = db.session.execute(text("SELECT * FROM report_field_dictionary ORDER BY category")).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adv_analytics_bp.get("/custom-reports")
@require_auth
@require_role("super_admin", "hr_manager")
def list_custom_reports():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_custom_reports_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adv_analytics_bp.post("/custom-reports")
@require_auth
@require_role("super_admin", "hr_manager")
def create_custom_report():
    """DB trigger auto-flags is_evidence_grade if any Performance field is selected."""
    body = request.get_json() or {}
    required = ["report_name", "selected_field_keys"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO custom_reports (company_id, created_by_employee_id, report_name, selected_field_keys)
            VALUES (:cid, :user, :name, :fields) RETURNING id, is_evidence_grade
        """), {"cid": g.company_id, "user": g.user_id, "name": body["report_name"], "fields": body["selected_field_keys"]})
        row = result.fetchone()
        db.session.commit()
        return created({"report_id": str(row[0]), "is_evidence_grade": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@adv_analytics_bp.put("/custom-reports/<report_id>/run")
@require_auth
@require_role("super_admin", "hr_manager")
def run_custom_report(report_id):
    """
    Evidence-grade reports REQUIRE human_signoff_employee_id before
    they can be marked as run -- the DB CHECK constraint enforces this,
    this endpoint just surfaces a clear error if it's missing.
    """
    body = request.get_json() or {}
    try:
        if body.get("human_signoff_employee_id"):
            db.session.execute(text("""
                UPDATE custom_reports SET human_signoff_employee_id = :signoff WHERE id = :rid AND company_id = :cid
            """), {"signoff": body["human_signoff_employee_id"], "rid": report_id, "cid": g.company_id})
        db.session.execute(text("""
            UPDATE custom_reports SET last_run_at = NOW() WHERE id = :rid AND company_id = :cid
        """), {"rid": report_id, "cid": g.company_id})
        db.session.commit()
        return success({"run": True})
    except Exception as e:
        db.session.rollback()
        return error("Evidence-grade reports require a human sign-off before they can be run.", 422)


# ════════════════════════════════════════════════════════════════
# PAGE 5: EXPORT CENTER
# ════════════════════════════════════════════════════════════════

@adv_analytics_bp.get("/exports")
@require_auth
@require_role("super_admin", "hr_manager")
def list_exports():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_export_center_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adv_analytics_bp.post("/exports")
@require_auth
def request_export():
    """
    DB trigger auto-blocks the export if contains_pii is TRUE with no
    legal_grounds_text or employee_consent_on_file -- the hard gate,
    never bypassable from the application layer.
    """
    body = request.get_json() or {}
    required = ["export_format"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO data_exports (company_id, exported_by_employee_id, custom_report_id, export_format, contains_pii, legal_grounds_text, employee_consent_on_file, requested_at)
            VALUES (:cid, :user, :report, :format, :pii, :grounds, :consent, NOW())
            RETURNING id, status, blocked_reason
        """), {"cid": g.company_id, "user": g.user_id, "report": body.get("custom_report_id"), "format": body["export_format"],
               "pii": body.get("contains_pii", False), "grounds": body.get("legal_grounds_text"), "consent": body.get("employee_consent_on_file", False)})
        row = result.fetchone()
        db.session.commit()
        return created({"export_id": str(row[0]), "status": row[1], "blocked_reason": row[2]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)
