"""
FILE: backend/routes/hr_analytics_routes.py
eLogix HRMS -- Reports, Analytics & BI > HR Analytics (4 pages:
Headcount Analysis, Attrition Analysis, Productivity Analysis, Cost
Analysis)
URL prefix: /api/v1/hr-analytics

Every endpoint here is a pure read over views built on top of
EXISTING tables confirmed across three prior sessions (Standard
Reports, Exit Analytics, Employer Branding, HR Budgeting). HCROI is
the one genuinely new calculation.

Nepal legal grounding: worker categorization for Headcount Analysis;
retrenchment notice/severance and 45-day dispute window for Attrition
Analysis; 8h/day & 48h/week caps for Productivity Analysis; SSF,
insurance, festival allowance, and the 10%-of-net-profit bonus fund
for Cost Analysis.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error
from ..ai.insights import generate_ai_insights

hr_analytics_bp = Blueprint("hr_analytics", __name__, url_prefix="/api/v1/hr-analytics")


# ════════════════════════════════════════════════════════════════
# PAGE 1: HEADCOUNT ANALYSIS
# ════════════════════════════════════════════════════════════════

@hr_analytics_bp.get("/headcount")
@require_auth
@require_role("super_admin", "hr_manager")
def headcount_analysis():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_headcount_analysis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 2: ATTRITION ANALYSIS
# ════════════════════════════════════════════════════════════════

@hr_analytics_bp.get("/attrition")
@require_auth
@require_role("super_admin", "hr_manager")
def attrition_analysis():
    try:
        summary = db.session.execute(text(
            "SELECT * FROM v_attrition_analysis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        by_manager = db.session.execute(text(
            "SELECT * FROM v_retention_by_manager WHERE company_id = :cid ORDER BY exits_under_manager DESC LIMIT 10"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "summary": dict(summary._mapping) if summary else {},
            "by_manager": [dict(r._mapping) for r in by_manager],
        })
    except Exception:
        return success({"summary": {}, "by_manager": []})


@hr_analytics_bp.post("/attrition/ai-root-cause")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_attrition_root_cause():
    """AI-assisted root-cause modeling -- distinguishes regrettable flight risk from routine, non-regrettable turnover."""
    try:
        insight = generate_ai_insights({"type": "attrition_root_cause_analysis", "company_id": g.company_id})
        return success({"root_causes": insight.get("root_causes", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 3: PRODUCTIVITY ANALYSIS
# ════════════════════════════════════════════════════════════════

@hr_analytics_bp.get("/productivity")
@require_auth
@require_role("super_admin", "hr_manager")
def productivity_analysis():
    try:
        rates = db.session.execute(text(
            "SELECT * FROM v_productivity_analysis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        perf_comp = db.session.execute(text(
            "SELECT * FROM v_performance_vs_compensation WHERE company_id = :cid LIMIT 20"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "rates": dict(rates._mapping) if rates else {},
            "performance_vs_compensation": [dict(r._mapping) for r in perf_comp],
        })
    except Exception:
        return success({"rates": {}, "performance_vs_compensation": []})


# ════════════════════════════════════════════════════════════════
# PAGE 4: COST ANALYSIS
# ════════════════════════════════════════════════════════════════

@hr_analytics_bp.get("/cost")
@require_auth
@require_role("super_admin", "hr_manager")
def cost_analysis():
    try:
        costs = db.session.execute(text(
            "SELECT * FROM v_cost_analysis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        hcroi = db.session.execute(text(
            "SELECT * FROM v_hcroi_calculation WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        bonus_fund = db.session.execute(text(
            "SELECT * FROM v_bonus_fund_status WHERE company_id = :cid ORDER BY fiscal_year_label DESC LIMIT 1"
        ), {"cid": g.company_id}).fetchone()
        return success({
            "costs": dict(costs._mapping) if costs else {},
            "hcroi": dict(hcroi._mapping) if hcroi else {},
            "bonus_fund": dict(bonus_fund._mapping) if bonus_fund else {},
        })
    except Exception:
        return success({"costs": {}, "hcroi": {}, "bonus_fund": {}})
