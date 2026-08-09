"""
FILE: backend/routes/standard_reports_routes.py
NepHR Pro -- Reports, Analytics & BI > Standard Reports (9 pages: HR
Analytics, Workforce Summary, Department Reports, Attendance Reports,
Training Reports, Payroll Reports, Recruitment Reports, Performance
Reports, Leave Reports)
URL prefix: /api/v1/standard-reports

Attendance, Payroll, Recruitment, Performance, and Leave Reports
reuse their EXISTING dedicated backend routes verbatim -- nothing
duplicated here. Only HR Analytics, Workforce Summary, Department
Reports, and Training Reports (the generic version) get new endpoints,
and even those are pure reads over existing tables.

Nepal legal grounding: employee-type/department registry reportable
to the Department of Labor and Occupational Safety on request;
working-hour caps underpin HR Analytics; equal-pay verification feeds
the performance-vs-compensation correlation.
"""

from flask import Blueprint, request, jsonify, g
from sqlalchemy import text

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error

reports_bp = Blueprint("standard_reports", __name__, url_prefix="/api/v1/standard-reports")


# ════════════════════════════════════════════════════════════════
# PAGE 1: HR ANALYTICS
# ════════════════════════════════════════════════════════════════

@reports_bp.get("/hr-analytics")
@require_auth
@require_role("super_admin", "hr_manager")
def hr_analytics_kpis():
    try:
        kpis = db.session.execute(text(
            "SELECT * FROM v_hr_analytics_kpis WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        perf_comp = db.session.execute(text(
            "SELECT * FROM v_performance_vs_compensation WHERE company_id = :cid LIMIT 20"
        ), {"cid": g.company_id}).fetchall()
        return success({
            "kpis": dict(kpis._mapping) if kpis else {},
            "performance_vs_compensation": [dict(r._mapping) for r in perf_comp],
        })
    except Exception:
        return success({"kpis": {}, "performance_vs_compensation": []})


# ════════════════════════════════════════════════════════════════
# PAGE 2: WORKFORCE SUMMARY
# ════════════════════════════════════════════════════════════════

@reports_bp.get("/workforce-summary")
@require_auth
@require_role("super_admin", "hr_manager")
def workforce_summary():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_workforce_summary_by_dept WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 3: DEPARTMENT REPORTS
# ════════════════════════════════════════════════════════════════

@reports_bp.get("/department/<department_name>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def department_report_detail(department_name):
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_department_reports_detail WHERE company_id = :cid AND department_name = :dept"
        ), {"cid": g.company_id, "dept": department_name}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# PAGE 4 (Attendance Reports): intentionally NO routes here -- reuses
# the EXISTING AttendanceReportsPage backend endpoints verbatim.


# ════════════════════════════════════════════════════════════════
# PAGE 5: TRAINING REPORTS (Standard, generic version)
# ════════════════════════════════════════════════════════════════

@reports_bp.get("/training")
@require_auth
@require_role("super_admin", "hr_manager")
def training_reports_standard():
    """The simple, at-a-glance version -- the full executive rollup lives under the L&D module's own routes."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_training_reports_standard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# PAGE 6 (Payroll Reports): intentionally NO routes here -- reuses the
# EXISTING PayrollReportsPage 8-tab hub's backend endpoints verbatim.

# PAGE 7 (Recruitment Reports): intentionally NO routes here -- reuses
# the EXISTING RecruitmentAnalyticsPage backend endpoints verbatim
# (this page was previously orphaned in the frontend -- now wired).

# PAGE 8 (Performance Reports): intentionally NO routes here -- reuses
# the EXISTING PerformanceReportsPage backend endpoints verbatim.

# PAGE 9 (Leave Reports): intentionally NO routes here -- reuses the
# EXISTING LeaveReportsPage backend endpoints verbatim.
