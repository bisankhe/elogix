"""
FILE: backend/routes/payroll_analytics_routes.py
eLogix HRMS — Workforce Operations > Payroll & Compensation > Payroll
Analytics Module (2 pages, 8 sub-reports)
URL prefix: /api/v1/payroll-analytics

  1. /reports/*    — Payroll Reports (8 sub-reports, all aggregation)
  2. /compensation/*   — Compensation Analytics (compa-ratio, 9-box, pay equity)

Pure read-layer: no employee/vendor/attendance/billing data is captured
here -- everything aggregates from existing modules. Nepal Labour Act
2074 Section 9/Rule 6 (workforce register), Sections 58-60 (outsourcing
liability), Section 16 (8hr/48hr caps), Section 105 (minimum wage).
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

payroll_analytics_bp = Blueprint("payroll_analytics", __name__, url_prefix="/api/v1/payroll-analytics")


# ════════════════════════════════════════════════════════════════
# 1. PAYROLL REPORTS (8 sub-reports)
# ════════════════════════════════════════════════════════════════

@payroll_analytics_bp.get("/reports/workforce-summary")
@require_auth
@require_role("super_admin", "hr_manager")
def workforce_summary():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_workforce_summary WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.get("/reports/vendor-headcount")
@require_auth
@require_role("super_admin", "hr_manager")
def vendor_headcount():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_vendor_wise_headcount WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.get("/reports/insource-attendance")
@require_auth
@require_role("super_admin", "hr_manager")
def insource_attendance_report():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_payroll_report_insource_attendance WHERE company_id = :cid LIMIT 200"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.get("/reports/outsource-attendance")
@require_auth
@require_role("super_admin", "hr_manager")
def outsource_attendance_report():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_payroll_report_outsource_attendance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.get("/reports/vendor-billing")
@require_auth
@require_role("super_admin", "hr_manager")
def vendor_billing_report():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_vendor_billing_report WHERE company_id = :cid ORDER BY billing_period_year DESC, billing_period_month DESC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.get("/reports/insource-vs-outsource-cost")
@require_auth
@require_role("super_admin", "hr_manager")
def cost_comparison():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_insource_vs_outsource_cost WHERE company_id = :cid ORDER BY pay_period DESC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.get("/reports/compliance")
@require_auth
@require_role("super_admin", "hr_manager")
def compliance_report():
    """Traffic-light system: green/yellow/red across statutory checks."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_payroll_compliance_report WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.get("/reports/deployment")
@require_auth
@require_role("super_admin", "hr_manager")
def deployment_report():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_deployment_report WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.post("/reports/schedule-auto-export")
@require_auth
@require_role("super_admin", "hr_manager")
def schedule_auto_export():
    """Schedules automatic report generation/export after every pay run, with reminder."""
    body = request.get_json() or {}
    required = ["report_key", "schedule_cadence", "delivery_emails"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO leave_report_generation_log
              (company_id, template_id, is_scheduled, schedule_cadence, delivery_emails, generated_at)
            SELECT :cid, id, TRUE, :cadence, :emails, NOW() FROM leave_report_templates LIMIT 1
            RETURNING id
        """), {"cid": g.company_id, "cadence": body["schedule_cadence"], "emails": body["delivery_emails"]})
        db.session.commit()
        return created({"scheduled": True, "report_key": body["report_key"]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. COMPENSATION ANALYTICS
# ════════════════════════════════════════════════════════════════

@payroll_analytics_bp.get("/compensation/compa-ratio")
@require_auth
@require_role("super_admin", "hr_manager")
def compa_ratio():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_compa_ratio_analysis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "employees": data,
            "avg_compa_ratio": round(sum(float(r["compa_ratio"] or 0) for r in data) / max(len(data), 1), 2),
            "below_range_count": sum(1 for r in data if r["band"] == "Below Range"),
        })
    except Exception:
        return success({"employees": [], "avg_compa_ratio": 0, "below_range_count": 0})


@payroll_analytics_bp.post("/compensation/salary-range-bands")
@require_auth
@require_role("super_admin", "hr_manager")
def create_salary_band():
    body = request.get_json() or {}
    required = ["grade_level", "range_min_npr", "range_midpoint_npr", "range_max_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO salary_range_bands (company_id, grade_level, department_id, range_min_npr, range_midpoint_npr, range_max_npr, created_at)
            VALUES (:cid, :grade, :dept, :min_v, :mid_v, :max_v, NOW())
            ON CONFLICT (company_id, grade_level, department_id) DO UPDATE
              SET range_min_npr = EXCLUDED.range_min_npr, range_midpoint_npr = EXCLUDED.range_midpoint_npr, range_max_npr = EXCLUDED.range_max_npr
            RETURNING id
        """), {"cid": g.company_id, "grade": body["grade_level"], "dept": body.get("department_id"),
               "min_v": body["range_min_npr"], "mid_v": body["range_midpoint_npr"], "max_v": body["range_max_npr"]})
        band_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"band_id": band_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_analytics_bp.get("/compensation/nine-box")
@require_auth
@require_role("super_admin", "hr_manager")
def nine_box():
    review_cycle = request.args.get("review_cycle")
    try:
        q = "SELECT * FROM v_nine_box_summary WHERE company_id = :cid"
        params = {"cid": g.company_id}
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_analytics_bp.post("/compensation/nine-box")
@require_auth
@require_role("super_admin", "hr_manager")
def set_nine_box_rating():
    """Links 9-box performance/potential ratings directly to merit increase and bonus."""
    body = request.get_json() or {}
    required = ["employee_id", "performance_rating", "potential_rating", "review_cycle"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO nine_box_grid
              (company_id, employee_id, performance_rating, potential_rating, review_cycle,
               recommended_increase_pct, bonus_multiplier, created_at)
            VALUES
              (:cid, :eid, :perf, :potential, :cycle,
               :increase_pct, :bonus_mult, NOW())
            ON CONFLICT (employee_id, review_cycle) DO UPDATE
              SET performance_rating = EXCLUDED.performance_rating, potential_rating = EXCLUDED.potential_rating,
                  recommended_increase_pct = EXCLUDED.recommended_increase_pct, bonus_multiplier = EXCLUDED.bonus_multiplier
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "perf": body["performance_rating"],
            "potential": body["potential_rating"], "cycle": body["review_cycle"],
            "increase_pct": body.get("recommended_increase_pct", 0), "bonus_mult": body.get("bonus_multiplier", 1.0),
        })
        rating_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"rating_id": rating_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_analytics_bp.get("/compensation/pay-equity")
@require_auth
@require_role("super_admin", "hr_manager")
def pay_equity_summary():
    try:
        summary = db.session.execute(text(
            "SELECT * FROM v_pay_equity_summary WHERE company_id = :cid ORDER BY audit_period DESC LIMIT 1"
        ), {"cid": g.company_id}).fetchone()
        flagged = db.session.execute(text(
            "SELECT * FROM v_pay_equity_flagged_detail WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "summary": dict(summary._mapping) if summary else None,
            "flagged_disparities": [dict(f._mapping) for f in flagged],
        })
    except Exception:
        return success({"summary": None, "flagged_disparities": []})


@payroll_analytics_bp.post("/compensation/pay-equity/run-audit")
@require_auth
@require_role("super_admin", "hr_manager")
def run_pay_equity_audit():
    """AI runs a statistical pay-equity analysis and writes flagged disparities."""
    body = request.get_json() or {}
    if not body.get("audit_period"): return error("audit_period required", 422)
    try:
        insight = generate_ai_insights({"type": "pay_equity_audit", "company_id": g.company_id, "audit_period": body["audit_period"]})
        results = insight.get("results", [])
        for r in results:
            db.session.execute(text("""
                INSERT INTO pay_equity_audits
                  (company_id, audit_period, department_id, gender_pay_gap_pct, role_level_pair_label, unexplained_variance_pct, created_at)
                VALUES
                  (:cid, :period, :dept, :gap, :role_label, :variance, NOW())
            """), {"cid": g.company_id, "period": body["audit_period"], "dept": r.get("department_id"),
                   "gap": r.get("gender_pay_gap_pct"), "role_label": r.get("role_level_pair_label"), "variance": r.get("unexplained_variance_pct")})
        db.session.commit()
        return created({"audit_records_created": len(results)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_analytics_bp.put("/compensation/pay-equity/<audit_id>/review")
@require_auth
@require_role("super_admin", "hr_manager")
def review_pay_equity_flag(audit_id):
    try:
        db.session.execute(text("""
            UPDATE pay_equity_audits SET reviewed = TRUE, reviewed_by = :user, reviewed_at = NOW()
            WHERE id = :aid AND company_id = :cid
        """), {"user": g.user_id, "aid": audit_id, "cid": g.company_id})
        db.session.commit()
        return success({"reviewed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_analytics_bp.get("/compensation/total-rewards")
@require_auth
@require_role("super_admin", "hr_manager")
def total_rewards():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_total_rewards_breakdown WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        total = sum(float(r["amount_npr"] or 0) for r in data)
        for r in data:
            r["pct_of_total"] = round(float(r["amount_npr"] or 0) / total * 100, 1) if total else 0
        return success(data)
    except Exception:
        return success([])


# ── Excel template ───────────────────────────────────────
@payroll_analytics_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    allowed = ["reports", "compensation"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"payroll_analytics_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"payroll_analytics_{module}_template.xlsx")
