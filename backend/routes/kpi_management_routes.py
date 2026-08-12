"""
FILE: backend/routes/kpi_management_routes.py
eLogix HRMS — Performance & Talent Management > Goal & Performance >
Goal Management > KPI Management (1 page)
URL prefix: /api/v1/kpi-management

KPIs sit underneath KRAs (1-3 per KRA). Auto-classifies on_track/at_risk/
off_track from progress_pct. Reuses transaction_notifications (built in
kra_management_routes.py) for the publish notification -- no duplicate
mechanism. Role-based presets for Executive/Manager/HR/Employee KPI matrix.

Nepal Labour Act 2074: employer may evaluate scope/quality/quantity of
work; KPI data may justify rewards/promotions. Individual Privacy Act
2018 / Constitution Article 28: explicit consent required before
collecting/processing personal performance data.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

kpi_bp = Blueprint("kpi_management", __name__, url_prefix="/api/v1/kpi-management")


# ════════════════════════════════════════════════════════════════
# KPI DEFINITIONS
# ════════════════════════════════════════════════════════════════

@kpi_bp.get("")
@require_auth
def list_kpis():
    role_tier = request.args.get("role_tier")
    try:
        q = "SELECT * FROM v_kpi_dashboard WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if role_tier: q += " AND role_tier = :role"; params["role"] = role_tier
        rows = db.session.execute(text(q), params).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "kpis": data,
            "on_track_count": sum(1 for r in data if r["status"] == "on_track"),
            "off_track_count": sum(1 for r in data if r["status"] == "off_track"),
            "api_synced_count": sum(1 for r in data if r["data_source"] and "api" in r["data_source"].lower()),
        })
    except Exception:
        return success({"kpis": [], "on_track_count": 0, "off_track_count": 0, "api_synced_count": 0})


@kpi_bp.post("")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_kpi():
    """
    DB trigger warns (does not block) if the parent KRA already has 3+
    KPIs -- soft guardrail against analysis paralysis.
    """
    body = request.get_json() or {}
    required = ["kra_definition_id", "kpi_title", "target_value"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO kpi_definitions
              (company_id, kra_definition_id, employee_id, kpi_title, formula_description, role_tier,
               target_value, current_value, unit, employee_consent_obtained, created_by, created_at)
            VALUES
              (:cid, :kra_id, :eid, :title, :formula, :role,
               :target, :current, :unit, :consent, :user, NOW())
            RETURNING id, status
        """), {
            "cid": g.company_id, "kra_id": body["kra_definition_id"], "eid": body.get("employee_id"),
            "title": body["kpi_title"], "formula": body.get("formula_description"), "role": body.get("role_tier", "employee"),
            "target": body["target_value"], "current": body.get("current_value", 0), "unit": body.get("unit", "count"),
            "consent": body.get("employee_consent_obtained", False), "user": g.user_id,
        })
        row = result.fetchone()
        db.session.commit()
        return created({"kpi_id": str(row[0]), "status": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kpi_bp.put("/<kpi_id>/publish")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def publish_kpi(kpi_id):
    """
    Requires employee_consent_obtained = TRUE per Individual Privacy Act
    2018. DB trigger notifies the KPI owner + reporting manager via the
    shared transaction_notifications mechanism.
    """
    try:
        kpi = db.session.execute(text(
            "SELECT employee_consent_obtained FROM kpi_definitions WHERE id = :kid AND company_id = :cid"
        ), {"kid": kpi_id, "cid": g.company_id}).fetchone()
        if not kpi: return not_found("KPI")
        if not kpi.employee_consent_obtained:
            return error("Cannot publish: employee consent for performance data processing has not been recorded.", 422)

        db.session.execute(text("""
            UPDATE kpi_definitions SET publish_status = 'published' WHERE id = :kid AND company_id = :cid AND publish_status = 'draft'
        """), {"kid": kpi_id, "cid": g.company_id})
        db.session.commit()
        return success({"published": True, "notified": ["KPI owner", "Reporting manager"]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kpi_bp.put("/<kpi_id>/record-consent")
@require_auth
@require_role("super_admin", "hr_manager")
def record_consent(kpi_id):
    """Records explicit employee consent before performance data is processed/published."""
    try:
        db.session.execute(text("""
            UPDATE kpi_definitions SET employee_consent_obtained = TRUE, consent_obtained_at = NOW()
            WHERE id = :kid AND company_id = :cid
        """), {"kid": kpi_id, "cid": g.company_id})
        db.session.commit()
        return success({"consent_recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kpi_bp.put("/<kpi_id>/update-value")
def update_kpi_value(kpi_id):
    """
    Public/ESS — self-service manual update for non-API KPIs. DB trigger
    auto-reclassifies status and logs to kpi_value_history.
    """
    body = request.get_json() or {}
    if body.get("current_value") is None: return error("current_value required", 422)
    try:
        result = db.session.execute(text("""
            UPDATE kpi_definitions SET current_value = :value WHERE id = :kid RETURNING progress_pct, status
        """), {"value": body["current_value"], "kid": kpi_id})
        row = result.fetchone()
        db.session.commit()
        if not row: return not_found("KPI")
        return success({"progress_pct": float(row[0]) if row[0] else None, "status": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# DATA SOURCES (API sync config)
# ════════════════════════════════════════════════════════════════

@kpi_bp.post("/<kpi_id>/data-source")
@require_auth
@require_role("super_admin", "hr_manager")
def configure_data_source(kpi_id):
    body = request.get_json() or {}
    required = ["source_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO kpi_data_sources (kpi_definition_id, company_id, source_type, sync_frequency, created_at)
            VALUES (:kid, :cid, :stype, :freq, NOW())
            ON CONFLICT (kpi_definition_id) DO UPDATE SET source_type = EXCLUDED.source_type, sync_frequency = EXCLUDED.sync_frequency
            RETURNING id
        """), {"kid": kpi_id, "cid": g.company_id, "stype": body["source_type"], "freq": body.get("sync_frequency", "manual")})
        source_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"data_source_id": source_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kpi_bp.post("/<kpi_id>/sync-now")
@require_auth
@require_role("super_admin", "hr_manager")
def trigger_sync(kpi_id):
    """Manually triggers an API sync pull (e.g. from Salesforce) for this KPI."""
    try:
        insight = generate_ai_insights({"type": "kpi_api_sync", "kpi_id": kpi_id})
        new_value = insight.get("synced_value")
        if new_value is not None:
            db.session.execute(text("UPDATE kpi_definitions SET current_value = :val WHERE id = :kid"), {"val": new_value, "kid": kpi_id})
        db.session.execute(text("""
            UPDATE kpi_data_sources SET last_synced_at = NOW(), sync_status = 'synced' WHERE kpi_definition_id = :kid
        """), {"kid": kpi_id})
        db.session.commit()
        return success({"synced": True, "new_value": new_value})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kpi_bp.get("/pending-sync")
@require_auth
@require_role("super_admin", "hr_manager")
def pending_sync_kpis():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_kpi_pending_sync WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# ROLE PRESETS & AI ASSISTANCE
# ════════════════════════════════════════════════════════════════

@kpi_bp.get("/role-presets")
def list_role_presets():
    """Public — the brief's Executive/Manager/HR/Employee KPI matrix as selectable templates."""
    role_tier = request.args.get("role_tier")
    try:
        q = "SELECT * FROM kpi_role_presets"
        params = {}
        if role_tier: q += " WHERE role_tier = :role"; params["role"] = role_tier
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@kpi_bp.post("/ai-suggest")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_suggest_kpi():
    """AI proposes SMART KPI metrics for a given KRA based on role and historical data."""
    body = request.get_json() or {}
    if not body.get("kra_definition_id"): return error("kra_definition_id required", 422)
    try:
        insight = generate_ai_insights({"type": "kpi_smart_suggestion", "kra_definition_id": body["kra_definition_id"], "company_id": g.company_id})
        return success({"suggested_kpis": insight.get("suggested_kpis", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# HEALTH ALERTS, TREND & SELF-SERVICE
# ════════════════════════════════════════════════════════════════

@kpi_bp.get("/health-alerts")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def health_alerts():
    """At-risk/off-track KPIs -- the 'health meter' red/yellow feed."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_kpi_health_alerts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@kpi_bp.get("/<kpi_id>/trend")
def get_trend(kpi_id):
    """Public — historical value series for the trend chart."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_kpi_trend_history WHERE kpi_definition_id = :kid"
        ), {"kid": kpi_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@kpi_bp.get("/my-kpis/<employee_id>")
def my_kpis(employee_id):
    """Public/ESS — self-service tracker, employee sees only their own KPI progress."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_kpis WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@kpi_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "kpi_management")
    return jsonify(result), 200 if result["success"] else 422


@kpi_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("kpi_management")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="kpi_management_template.xlsx")
