"""
FILE: backend/routes/performance_analytics_kpi_routes.py
eLogix HRMS — Performance & Talent Management > Goal & Performance >
Performance Analytics > KPI Module (6 pages)
URL prefix: /api/v1/performance-analytics-kpi

  1-2. /transformation/before, /transformation/after — Infographics
  3.   /speedometer/recruitment
  4.   /speedometer/compliance
  5.   /speedometer/attendance
  6.   /speedometer/documentation

Pure aggregation: every speedometer value is computed live from
existing tables (job_requisitions, compliance health score, attendance/
overtime records, employee documents/contracts) -- nothing re-captured.
Nepal Labour Act 2074: Time-to-Fill tracked against MOLESS portal
advertisement requirement; OT capped 4hr/day-24hr/week; documentation
must include signed appointment letters, citizenship copies, SSF data.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import build_template_xlsx

perf_kpi_bp = Blueprint("performance_analytics_kpi", __name__, url_prefix="/api/v1/performance-analytics-kpi")


# ════════════════════════════════════════════════════════════════
# 1-2. TRANSFORMATION INFOGRAPHICS
# ════════════════════════════════════════════════════════════════

@perf_kpi_bp.get("/transformation/comparison")
@require_auth
@require_role("super_admin", "hr_manager")
def transformation_comparison():
    """The Before/After page's shared data source -- live pct_change per metric."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_kpi_transformation_comparison WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@perf_kpi_bp.post("/transformation/capture-snapshot")
@require_auth
@require_role("super_admin", "hr_manager")
def capture_snapshot():
    """Captures a point-in-time KPI value as either the 'before' baseline or 'after' current state."""
    body = request.get_json() or {}
    required = ["snapshot_label", "metric_key", "metric_value"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if body["snapshot_label"] not in ("baseline_before", "current_after"):
        return error("snapshot_label must be baseline_before or current_after", 422)
    try:
        db.session.execute(text("""
            INSERT INTO kpi_snapshot_log (company_id, snapshot_label, metric_key, metric_value, metric_unit, captured_at)
            VALUES (:cid, :label, :key, :value, :unit, NOW())
            ON CONFLICT (company_id, snapshot_label, metric_key)
            DO UPDATE SET metric_value = EXCLUDED.metric_value, captured_at = NOW()
        """), {"cid": g.company_id, "label": body["snapshot_label"], "key": body["metric_key"],
               "value": body["metric_value"], "unit": body.get("metric_unit")})
        db.session.commit()
        return created({"captured": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. SPEEDOMETER: RECRUITMENT
# ════════════════════════════════════════════════════════════════

@perf_kpi_bp.get("/speedometer/recruitment")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def recruitment_speedometer():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_recruitment_speedometer WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        zones = db.session.execute(text(
            "SELECT * FROM kpi_benchmark_zones WHERE category = 'recruitment' AND (company_id = :cid OR company_id IS NULL) ORDER BY company_id NULLS LAST"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "metrics": dict(row._mapping) if row else {},
            "benchmark_zones": [dict(z._mapping) for z in zones],
        })
    except Exception:
        return success({"metrics": {}, "benchmark_zones": []})


# ════════════════════════════════════════════════════════════════
# 4. SPEEDOMETER: COMPLIANCE
# ════════════════════════════════════════════════════════════════

@perf_kpi_bp.get("/speedometer/compliance")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def compliance_speedometer():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_compliance_speedometer WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        zones = db.session.execute(text(
            "SELECT * FROM kpi_benchmark_zones WHERE category = 'compliance' AND (company_id = :cid OR company_id IS NULL) ORDER BY company_id NULLS LAST"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "metrics": dict(row._mapping) if row else {},
            "benchmark_zones": [dict(z._mapping) for z in zones],
        })
    except Exception:
        return success({"metrics": {}, "benchmark_zones": []})


# ════════════════════════════════════════════════════════════════
# 5. SPEEDOMETER: ATTENDANCE
# ════════════════════════════════════════════════════════════════

@perf_kpi_bp.get("/speedometer/attendance")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def attendance_speedometer():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_attendance_speedometer WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        zones = db.session.execute(text(
            "SELECT * FROM kpi_benchmark_zones WHERE category = 'attendance' AND (company_id = :cid OR company_id IS NULL) ORDER BY company_id NULLS LAST"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "metrics": dict(row._mapping) if row else {},
            "benchmark_zones": [dict(z._mapping) for z in zones],
        })
    except Exception:
        return success({"metrics": {}, "benchmark_zones": []})


# ════════════════════════════════════════════════════════════════
# 6. SPEEDOMETER: DOCUMENTATION
# ════════════════════════════════════════════════════════════════

@perf_kpi_bp.get("/speedometer/documentation")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def documentation_speedometer():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_documentation_speedometer WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        zones = db.session.execute(text(
            "SELECT * FROM kpi_benchmark_zones WHERE category = 'documentation' AND (company_id = :cid OR company_id IS NULL) ORDER BY company_id NULLS LAST"
        ), {"cid": g.company_id}).fetchall()
        expiry = db.session.execute(text(
            "SELECT * FROM v_contract_expiry_tracker WHERE company_id = :cid ORDER BY days_left"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "metrics": dict(row._mapping) if row else {},
            "benchmark_zones": [dict(z._mapping) for z in zones],
            "contract_expiry": [dict(c._mapping) for c in expiry],
        })
    except Exception:
        return success({"metrics": {}, "benchmark_zones": [], "contract_expiry": []})


# ── Benchmark zone config (HR can adjust thresholds per company) ──
@perf_kpi_bp.put("/benchmark-zones/<zone_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_benchmark_zone(zone_id):
    body = request.get_json() or {}
    allowed = ["green_zone_max", "yellow_zone_max"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("No valid fields provided", 400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["zid"] = zone_id
    try:
        db.session.execute(text(f"UPDATE kpi_benchmark_zones SET {set_clause} WHERE id = :zid"), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel export ───────────────────────────────────────
@perf_kpi_bp.get("/excel-export")
@require_auth
def excel_export():
    b = build_template_xlsx("performance_analytics_kpi_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="performance_kpi_dashboard_export.xlsx")
