"""
FILE: backend/routes/hr_budgeting_routes.py
eLogix HRMS -- Finance, Assets & Administration > HR Budgeting (8 pages:
Annual HR Budget, Department Budget, Recruitment Budget, Training
Budget, Engagement Budget, Payroll Budget, Budget Forecasting, Budget
Variance Analysis)
URL prefix: /api/v1/hr-budgeting

Training Budget reuses the EXISTING annual_training_budgets +
v_ld_budget_widget verbatim -- no duplicate training-budget endpoint
exists here. Annual HR Budget and Budget Variance Analysis are pure
rollup reads with no write endpoints of their own.

Nepal legal grounding: minimum wage NPR 19,550/month; SSF 8.33%
gratuity; MANDATORY 10% of net annual profit to the employee bonus
fund within 6 months of fiscal year-end; overtime capped 4h/day,
20h/week at 150%; foreign national workforce cap of 5%.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

budgeting_bp = Blueprint("hr_budgeting", __name__, url_prefix="/api/v1/hr-budgeting")


# ════════════════════════════════════════════════════════════════
# PAGE 1: ANNUAL HR BUDGET (pure rollup)
# ════════════════════════════════════════════════════════════════

@budgeting_bp.get("/annual")
@require_auth
@require_role("super_admin", "hr_manager")
def annual_hr_budget():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_annual_hr_budget_rollup WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 2: DEPARTMENT BUDGET
# ════════════════════════════════════════════════════════════════

@budgeting_bp.get("/department")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def department_budget():
    """RBAC: department_head sees only their own department's row via a higher middleware filter."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_department_budget_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@budgeting_bp.post("/department")
@require_auth
@require_role("super_admin", "hr_manager")
def set_department_budget():
    body = request.get_json() or {}
    required = ["department_id", "fiscal_year_label", "allocated_npr", "headcount_budget"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO department_budget_allocations (company_id, department_id, fiscal_year_label, allocated_npr, headcount_budget)
            VALUES (:cid, :dept, :fy, :amount, :hc)
            ON CONFLICT (department_id, fiscal_year_label) DO UPDATE SET allocated_npr = EXCLUDED.allocated_npr, headcount_budget = EXCLUDED.headcount_budget
            RETURNING id
        """), {"cid": g.company_id, "dept": body["department_id"], "fy": body["fiscal_year_label"], "amount": body["allocated_npr"], "hc": body["headcount_budget"]})
        alloc_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"allocation_id": alloc_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: RECRUITMENT BUDGET (genuinely new)
# ════════════════════════════════════════════════════════════════

@budgeting_bp.get("/recruitment")
@require_auth
@require_role("super_admin", "hr_manager")
def recruitment_budget():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_recruitment_budget_breakdown WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@budgeting_bp.post("/recruitment")
@require_auth
@require_role("super_admin", "hr_manager")
def log_recruitment_cost():
    body = request.get_json() or {}
    required = ["fiscal_year_label", "cost_category", "amount_npr"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO recruitment_budget_lines (company_id, fiscal_year_label, cost_category, amount_npr, linked_job_requisition_id, incurred_at)
            VALUES (:cid, :fy, :cat, :amount, :reqid, NOW()) RETURNING id
        """), {"cid": g.company_id, "fy": body["fiscal_year_label"], "cat": body["cost_category"], "amount": body["amount_npr"], "reqid": body.get("linked_job_requisition_id")})
        line_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"line_id": line_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@budgeting_bp.get("/recruitment/foreign-national-cap")
@require_auth
@require_role("super_admin", "hr_manager")
def foreign_national_cap_check():
    """Checks current foreign-national headcount against the statutory 5% cap."""
    try:
        row = db.session.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE is_foreign_national) AS foreign_count,
                COUNT(*) AS total_count,
                ROUND(COUNT(*) FILTER (WHERE is_foreign_national)::NUMERIC / NULLIF(COUNT(*),0) * 100, 2) AS foreign_pct
            FROM employees WHERE company_id = :cid AND employment_status = 'active'
        """), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# ════════════════════════════════════════════════════════════════
# PAGE 4: TRAINING BUDGET -- intentionally NO write endpoints here.
# Reuses the EXISTING /api/v1/skill-gap training-budget endpoints
# (annual_training_budgets, v_ld_budget_widget) verbatim.
# ════════════════════════════════════════════════════════════════

@budgeting_bp.get("/training")
@require_auth
@require_role("super_admin", "hr_manager")
def training_budget_readonly():
    """Read-only mirror for this module's UI -- the source of truth and write path live in the L&D module."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_ld_budget_widget WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# ════════════════════════════════════════════════════════════════
# PAGE 5: ENGAGEMENT BUDGET (genuinely new)
# ════════════════════════════════════════════════════════════════

@budgeting_bp.get("/engagement")
@require_auth
@require_role("super_admin", "hr_manager")
def engagement_budget():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_engagement_budget_with_participation WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@budgeting_bp.post("/engagement")
@require_auth
@require_role("super_admin", "hr_manager")
def log_engagement_spend():
    body = request.get_json() or {}
    required = ["fiscal_year_label", "spend_category", "amount_npr"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO engagement_budget_lines (company_id, fiscal_year_label, spend_category, amount_npr, incurred_at)
            VALUES (:cid, :fy, :cat, :amount, NOW()) RETURNING id
        """), {"cid": g.company_id, "fy": body["fiscal_year_label"], "cat": body["spend_category"], "amount": body["amount_npr"]})
        line_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"line_id": line_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 6: PAYROLL BUDGET (pure aggregation + the new bonus fund tracker)
# ════════════════════════════════════════════════════════════════

@budgeting_bp.get("/payroll")
@require_auth
@require_role("super_admin", "hr_manager")
def payroll_budget():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_payroll_budget_components WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@budgeting_bp.get("/payroll/bonus-fund")
@require_auth
@require_role("super_admin", "hr_manager")
def bonus_fund_status():
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_bonus_fund_status WHERE company_id = :cid ORDER BY fiscal_year_label DESC LIMIT 1"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@budgeting_bp.post("/payroll/bonus-fund")
@require_auth
@require_role("super_admin", "hr_manager")
def set_bonus_fund():
    """DB trigger fires shortfall alerts as the 6-month legal deadline approaches."""
    body = request.get_json() or {}
    required = ["fiscal_year_label", "net_profit_npr", "distribution_deadline"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO bonus_fund_tracking (company_id, fiscal_year_label, net_profit_npr, funded_amount_npr, distribution_deadline)
            VALUES (:cid, :fy, :profit, :funded, :deadline)
            ON CONFLICT (company_id, fiscal_year_label) DO UPDATE SET net_profit_npr = EXCLUDED.net_profit_npr, funded_amount_npr = EXCLUDED.funded_amount_npr
            RETURNING id, required_amount_npr
        """), {"cid": g.company_id, "fy": body["fiscal_year_label"], "profit": body["net_profit_npr"],
               "funded": body.get("funded_amount_npr", 0), "deadline": body["distribution_deadline"]})
        row = result.fetchone()
        db.session.commit()
        return created({"tracking_id": str(row[0]), "required_amount_npr": float(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 7: BUDGET FORECASTING (genuinely new)
# ════════════════════════════════════════════════════════════════

@budgeting_bp.get("/forecasting")
@require_auth
@require_role("super_admin", "hr_manager")
def forecast_scenarios():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_forecast_scenario_comparison WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@budgeting_bp.post("/forecasting/ai-run-scenario")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_run_forecast_scenario():
    """AI runs a what-if scenario using real historical turnover and headcount data."""
    body = request.get_json() or {}
    required = ["scenario_name", "attrition_assumption_pct"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        insight = generate_ai_insights({"type": "budget_forecast_scenario", "attrition_pct": body["attrition_assumption_pct"], "company_id": g.company_id})
        result = db.session.execute(text("""
            INSERT INTO budget_forecast_scenarios (company_id, fiscal_year_label, scenario_name, assumptions_text, attrition_assumption_pct, projected_total_cost_npr, created_by)
            VALUES (:cid, :fy, :name, :assumptions, :attrition, :projected, :user) RETURNING id
        """), {"cid": g.company_id, "fy": body.get("fiscal_year_label"), "name": body["scenario_name"],
               "assumptions": insight.get("assumptions_text"), "attrition": body["attrition_assumption_pct"],
               "projected": insight.get("projected_total_cost_npr"), "user": g.user_id})
        scenario_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"scenario_id": scenario_id, "projected_total_cost_npr": insight.get("projected_total_cost_npr")})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@budgeting_bp.put("/forecasting/<scenario_id>/select")
@require_auth
@require_role("super_admin", "hr_manager")
def select_scenario(scenario_id):
    """DB trigger ensures only one scenario is selected at a time."""
    try:
        db.session.execute(text("""
            UPDATE budget_forecast_scenarios SET is_selected = TRUE WHERE id = :sid AND company_id = :cid
        """), {"sid": scenario_id, "cid": g.company_id})
        db.session.commit()
        return success({"selected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 8: BUDGET VARIANCE ANALYSIS (pure rollup)
# ════════════════════════════════════════════════════════════════

@budgeting_bp.get("/variance")
@require_auth
@require_role("super_admin", "hr_manager")
def variance_analysis():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_budget_variance_analysis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@budgeting_bp.post("/variance/ai-classify")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_classify_variance():
    """AI distinguishes a genuine overspend from a timing difference (e.g. an annual license paid upfront)."""
    body = request.get_json() or {}
    if not body.get("category"): return error("category required", 422)
    try:
        insight = generate_ai_insights({"type": "variance_classification", "category": body["category"], "company_id": g.company_id})
        return success({"classification": insight.get("classification"), "explanation": insight.get("explanation")})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@budgeting_bp.post("/excel-import/<module>")
@require_auth
@require_role("super_admin", "hr_manager")
def excel_import(module):
    allowed = ["department", "recruitment", "engagement"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"hr_budgeting_{module}")
    return jsonify(result), 200 if result["success"] else 422


@budgeting_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"hr_budgeting_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"hr_budgeting_{module}_template.xlsx")
