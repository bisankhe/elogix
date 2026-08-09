"""
FILE: backend/routes/workforce_planning_routes.py
NepHR Pro — Workforce Planning Module (13 pages)
URL prefix: /api/v1/wfp

Endpoints for:
  1.  quota          — Existed Staff Quota (Darbadi) CRUD
  2.  current-status — Real-time fill rate snapshots
  3.  location-dept  — Location & department drill-down
  4.  annual-plan    — Annual Manpower Plan
  5.  quarterly      — Quarterly Workforce Review
  6.  monthly        — Monthly Workforce Review
  7.  headcount      — Headcount Planning
  8.  vacancy        — Vacancy Planning
  9.  replacement    — Replacement Planning
  10. expansion      — Expansion Planning
  11. contract-staff — Contract Staff Planning
  12. productivity   — Productivity Planning
  13. resource       — Resource Allocation

Nepal Labour Act 2074 compliance built in.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text, func
from datetime import datetime, date
import io, json, uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import paginate, success, error, created, not_found, apply_search
from ..utils.nepal_law import check_cba_required
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

wfp_bp = Blueprint("workforce_planning", __name__, url_prefix="/api/v1/wfp")

# ── Nepal law constants ───────────────────────────────────────
MAX_PROBATION_MONTHS    = 6
MAX_HOURS_DAY           = 8
MAX_HOURS_WEEK          = 48
OT_MULTIPLIER           = 1.5
MIN_WAGE_NPR            = 15000
RETRENCHMENT_NOTICE_D   = 30


# ════════════════════════════════════════════════════════════════
# 1. STAFF QUOTA / DARBADI
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/quota")
@require_auth
def list_quota():
    """GET all sanctioned positions (Darbadi) with fill status."""
    dept      = request.args.get("dept_id")
    branch    = request.args.get("branch_id")
    status    = request.args.get("status")
    emp_type  = request.args.get("employment_type")
    search    = request.args.get("search","")
    try:
        q = """
            SELECT p.*,
                   d.name AS dept_name, d.code AS dept_code,
                   b.name AS branch_name, b.code AS branch_code,
                   g.name AS grade_name, g.min_salary_npr, g.max_salary_npr,
                   e.full_name AS incumbent_name, e.employee_code AS incumbent_code
            FROM positions p
            LEFT JOIN departments d       ON p.department_id = d.id
            LEFT JOIN branches b          ON p.branch_id = b.id
            LEFT JOIN grade_levels g      ON p.grade_level_id = g.id
            LEFT JOIN employees e         ON p.incumbent_employee_id = e.id
            WHERE p.company_id = :cid AND NOT p.is_deleted
        """
        params = {"cid": g.company_id}
        if dept:     q += " AND p.department_id = :dept";   params["dept"]   = dept
        if branch:   q += " AND p.branch_id = :branch";     params["branch"] = branch
        if status:   q += " AND p.status = :status";        params["status"] = status
        if emp_type: q += " AND p.employment_type = :etype";params["etype"]  = emp_type
        if search:   q += " AND (p.title ILIKE :s OR p.code ILIKE :s)"; params["s"] = f"%{search}%"
        q += " ORDER BY p.department_id, p.grade_level_id DESC, p.title"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wfp_bp.post("/quota")
@require_auth
@require_role("super_admin","hr_manager")
def create_position():
    """Create a new sanctioned Darbadi position."""
    body = request.get_json() or {}
    required = ["title","department_id","employment_type","grade_level_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    # LA2074 validation
    if body.get("employment_type") == "casual" and body.get("hours_per_week",0) > 35:
        return error("Casual workers: max 35 hrs/week per Nepal Labour Act 2074 Section 10(d).", 422)
    if body.get("probation_months", 0) > MAX_PROBATION_MONTHS:
        return error(f"Probation cannot exceed {MAX_PROBATION_MONTHS} months per LA2074 Section 10.", 422)

    try:
        pos_no = f"POS-{str(uuid.uuid4())[:4].upper()}"
        db.session.execute(text("""
            INSERT INTO positions
              (company_id, code, title, department_id, branch_id, grade_level_id,
               employment_type, status, probation_months, approved_salary_npr,
               fiscal_year, justification, created_by, created_at)
            VALUES
              (:cid, :code, :title, :dept, :branch, :grade,
               :etype, 'vacant', :prob, :salary,
               :fy, :just, :user, NOW())
        """), {
            "cid":    g.company_id, "code": pos_no,
            "title":  body["title"], "dept": body["department_id"],
            "branch": body.get("branch_id"), "grade": body["grade_level_id"],
            "etype":  body["employment_type"],
            "prob":   min(body.get("probation_months",6), MAX_PROBATION_MONTHS),
            "salary": body.get("approved_salary_npr", MIN_WAGE_NPR),
            "fy":     body.get("fiscal_year","2081/82"),
            "just":   body.get("justification",""),
            "user":   g.user_id,
        })
        db.session.commit()
        return created({"position_code": pos_no,
                        "la2074_note": "Vacancy must be published in national newspaper and MoLESS portal per LA2074 Section 11."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wfp_bp.put("/quota/<pos_id>")
@require_auth
@require_role("super_admin","hr_manager")
def update_position(pos_id):
    body = request.get_json() or {}
    allowed = ["title","status","incumbent_employee_id","approved_salary_npr",
               "employment_type","probation_months","justification","fiscal_year","branch_id"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("Nothing to update",400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"pid": pos_id, "cid": g.company_id})
    try:
        db.session.execute(text(
            f"UPDATE positions SET {set_clause}, updated_at = NOW() WHERE id = :pid AND company_id = :cid"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wfp_bp.delete("/quota/<pos_id>")
@require_auth
@require_role("super_admin")
def deactivate_position(pos_id):
    try:
        db.session.execute(text("""
            UPDATE positions SET is_deleted=TRUE, deleted_at=NOW() WHERE id=:pid AND company_id=:cid
        """), {"pid": pos_id, "cid": g.company_id})
        db.session.commit()
        return success({"deactivated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. CURRENT STATUS (Ex-filled snapshot)
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/current-status")
@require_auth
def current_status():
    """Real-time fill rate by department and branch."""
    try:
        dept_rows = db.session.execute(text("""
            SELECT
                d.id, d.name AS dept_name, d.code AS dept_code,
                b.name AS branch_name,
                COUNT(p.id)                                        AS total_quota,
                COUNT(p.id) FILTER (WHERE p.status='filled')      AS filled,
                COUNT(p.id) FILTER (WHERE p.status='vacant')      AS vacant,
                COUNT(p.id) FILTER (WHERE p.status='onhold')      AS onhold,
                ROUND(COUNT(p.id) FILTER (WHERE p.status='filled')::NUMERIC
                      / NULLIF(COUNT(p.id),0) * 100, 1)           AS fill_rate_pct,
                COALESCE(SUM(p.approved_salary_npr) FILTER (WHERE p.status='filled'), 0) AS payroll_npr
            FROM departments d
            LEFT JOIN positions p ON p.department_id = d.id AND NOT p.is_deleted
            LEFT JOIN branches b ON d.branch_id = b.id
            WHERE d.company_id = :cid AND NOT d.is_deleted
            GROUP BY d.id, d.name, d.code, b.name
            ORDER BY fill_rate_pct ASC
        """), {"cid": g.company_id}).fetchall()

        data = [dict(r._mapping) for r in dept_rows]
        total_quota  = sum(r["total_quota"] for r in data)
        total_filled = sum(r["filled"]      for r in data)
        total_vacant = sum(r["vacant"]      for r in data)
        vacancy_rate = round(total_vacant / max(total_quota,1) * 100, 1)

        # AI insight
        ai = generate_ai_insights({
            "type": "current_status_analysis",
            "total_quota": total_quota, "total_filled": total_filled,
            "vacancy_rate": vacancy_rate,
            "departments": [{"name":r["dept_name"],"fill_rate":r["fill_rate_pct"]} for r in data[:5]],
        })

        return success({
            "departments":    data,
            "totals": {"quota": total_quota, "filled": total_filled,
                       "vacant": total_vacant, "vacancy_rate_pct": vacancy_rate},
            "ai_insight": ai,
            "as_of":      datetime.utcnow().isoformat(),
        })
    except Exception:
        return success({"departments":[],"totals":{}})


# ════════════════════════════════════════════════════════════════
# 3. LOCATION & DEPARTMENT-WIDE VIEW
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/location-dept")
@require_auth
def location_dept():
    """Drill-down by location or department."""
    view_type = request.args.get("view","location")  # location | department
    try:
        if view_type == "location":
            rows = db.session.execute(text("""
                SELECT b.id, b.name, b.code, b.province,
                       COUNT(p.id) AS quota, COUNT(p.id) FILTER(WHERE p.status='filled') AS filled,
                       COUNT(p.id) FILTER(WHERE p.status='vacant') AS vacant,
                       COALESCE(SUM(p.approved_salary_npr) FILTER(WHERE p.status='filled'),0) AS payroll_npr
                FROM branches b
                LEFT JOIN positions p ON p.branch_id = b.id AND NOT p.is_deleted
                WHERE b.company_id = :cid AND NOT b.is_deleted
                GROUP BY b.id, b.name, b.code, b.province ORDER BY b.name
            """), {"cid": g.company_id}).fetchall()
        else:
            rows = db.session.execute(text("""
                SELECT d.id, d.name, d.code,
                       COUNT(p.id) AS quota, COUNT(p.id) FILTER(WHERE p.status='filled') AS filled,
                       COUNT(p.id) FILTER(WHERE p.status='vacant') AS vacant,
                       COALESCE(SUM(p.approved_salary_npr) FILTER(WHERE p.status='filled'),0) AS payroll_npr
                FROM departments d
                LEFT JOIN positions p ON p.department_id = d.id AND NOT p.is_deleted
                WHERE d.company_id = :cid AND NOT d.is_deleted
                GROUP BY d.id, d.name, d.code ORDER BY quota DESC
            """), {"cid": g.company_id}).fetchall()

        data = [dict(r._mapping) for r in rows]
        for r in data:
            r["fill_rate_pct"] = round(r["filled"]/max(r["quota"],1)*100,1)
        return success({"view_type": view_type, "data": data})
    except Exception:
        return success({"view_type": view_type, "data": []})


# ════════════════════════════════════════════════════════════════
# 4-6. MANPOWER REVIEW PLANS (Annual / Quarterly / Monthly)
# ════════════════════════════════════════════════════════════════

def _get_plans(plan_type: str):
    """Generic plan list query."""
    try:
        rows = db.session.execute(text("""
            SELECT wp.*, d.name AS dept_name, b.name AS branch_name
            FROM workforce_plans wp
            LEFT JOIN departments d ON wp.department_id = d.id
            LEFT JOIN branches b    ON wp.branch_id = b.id
            WHERE wp.company_id = :cid AND wp.plan_type = :ptype AND NOT wp.is_deleted
            ORDER BY wp.created_at DESC
        """), {"cid": g.company_id, "ptype": plan_type}).fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception:
        return []


def _create_plan(plan_type: str):
    body = request.get_json() or {}
    required = ["title","fiscal_year"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        plan_no = f"WFP-{plan_type[:3].upper()}-{str(uuid.uuid4())[:4].upper()}"
        db.session.execute(text("""
            INSERT INTO workforce_plans
              (company_id, plan_no, plan_type, title, fiscal_year,
               department_id, branch_id, period_month, period_quarter,
               target_headcount, current_headcount, variance,
               budget_npr, priority, status, justification, ai_recommendation,
               created_by, created_at)
            VALUES
              (:cid, :no, :ptype, :title, :fy,
               :dept, :branch, :month, :quarter,
               :target, :current, :var,
               :budget, :priority, 'draft', :just, NULL,
               :user, NOW())
        """), {
            "cid":     g.company_id, "no": plan_no, "ptype": plan_type,
            "title":   body["title"], "fy": body["fiscal_year"],
            "dept":    body.get("department_id"), "branch": body.get("branch_id"),
            "month":   body.get("period_month"), "quarter": body.get("period_quarter"),
            "target":  body.get("target_headcount",0),
            "current": body.get("current_headcount",0),
            "var":     (body.get("target_headcount",0) - body.get("current_headcount",0)),
            "budget":  body.get("budget_npr",0),
            "priority":body.get("priority","medium"),
            "just":    body.get("justification",""),
            "user":    g.user_id,
        })
        db.session.commit()
        return created({"plan_no": plan_no, "plan_type": plan_type})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@wfp_bp.get("/annual-plan")
@require_auth
def get_annual(): return success(_get_plans("annual"))

@wfp_bp.post("/annual-plan")
@require_auth
@require_role("super_admin","hr_manager")
def create_annual(): return _create_plan("annual")


@wfp_bp.get("/quarterly-review")
@require_auth
def get_quarterly(): return success(_get_plans("quarterly"))

@wfp_bp.post("/quarterly-review")
@require_auth
@require_role("super_admin","hr_manager")
def create_quarterly(): return _create_plan("quarterly")


@wfp_bp.get("/monthly-review")
@require_auth
def get_monthly(): return success(_get_plans("monthly"))

@wfp_bp.post("/monthly-review")
@require_auth
@require_role("super_admin","hr_manager")
def create_monthly(): return _create_plan("monthly")


# ════════════════════════════════════════════════════════════════
# 7. HEADCOUNT PLANNING
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/headcount")
@require_auth
def headcount_plan():
    """Headcount plans with target vs actual gap analysis."""
    try:
        plans = _get_plans("headcount")
        # Enrich with current actual
        for p in plans:
            if p.get("department_id"):
                actual = db.session.execute(text("""
                    SELECT COUNT(*) FROM positions
                    WHERE department_id=:did AND status='filled' AND company_id=:cid AND NOT is_deleted
                """), {"did": p["department_id"], "cid": g.company_id}).scalar()
                p["actual_headcount"] = actual or 0
                p["gap"] = (p.get("target_headcount",0) or 0) - (actual or 0)
        return success(plans)
    except Exception:
        return success([])


@wfp_bp.post("/headcount")
@require_auth
@require_role("super_admin","hr_manager")
def create_headcount(): return _create_plan("headcount")


# ════════════════════════════════════════════════════════════════
# 8. VACANCY PLANNING
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/vacancy")
@require_auth
def vacancy_plan():
    """Open vacancies with priority and JRF status."""
    try:
        rows = db.session.execute(text("""
            SELECT p.id, p.code, p.title, p.employment_type,
                   p.approved_salary_npr, p.fiscal_year,
                   p.vacancy_reason, p.priority, p.jrf_raised, p.jrf_no,
                   d.name AS dept_name, b.name AS branch_name,
                   g.name AS grade_name,
                   CASE WHEN p.jrf_raised THEN 'JRF Raised'
                        WHEN p.priority='critical' THEN 'Urgent'
                        ELSE 'Open' END AS vacancy_status
            FROM positions p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN branches b    ON p.branch_id = b.id
            LEFT JOIN grade_levels g ON p.grade_level_id = g.id
            WHERE p.company_id = :cid AND p.status = 'vacant' AND NOT p.is_deleted
            ORDER BY CASE p.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@wfp_bp.post("/vacancy/<pos_id>/raise-jrf")
@require_auth
@require_role("super_admin","hr_manager")
def raise_jrf(pos_id):
    """Raise a Job Requisition Form for a vacancy."""
    jrf_no = f"JRF-{date.today().year}-{str(uuid.uuid4())[:4].upper()}"
    try:
        db.session.execute(text("""
            UPDATE positions SET jrf_raised=TRUE, jrf_no=:jno, updated_at=NOW()
            WHERE id=:pid AND company_id=:cid AND status='vacant'
        """), {"jno": jrf_no, "pid": pos_id, "cid": g.company_id})
        db.session.commit()
        return success({"jrf_no": jrf_no, "la2074_note": "Vacancy must be published in national newspaper and MoLESS portal per LA2074 Section 11."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 9. REPLACEMENT PLANNING
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/replacement")
@require_auth
def replacement_plan():
    """Positions at risk due to flight risk or upcoming retirement."""
    try:
        rows = db.session.execute(text("""
            SELECT p.id, p.code, p.title, p.employment_type,
                   e.full_name AS incumbent_name, e.employee_code,
                   e.date_of_birth,
                   EXTRACT(YEAR FROM AGE(NOW(), e.date_of_birth))::INT AS age,
                   e.attrition_risk_score, e.ai_attrition_risk,
                   d.name AS dept_name, b.name AS branch_name,
                   CASE WHEN e.ai_attrition_risk > 0.7 THEN 'high'
                        WHEN e.ai_attrition_risk > 0.4 THEN 'medium'
                        ELSE 'low' END AS replacement_urgency
            FROM positions p
            JOIN employees e ON p.incumbent_employee_id = e.id
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN branches b    ON p.branch_id = b.id
            WHERE p.company_id = :cid AND p.status = 'filled' AND NOT p.is_deleted
              AND (e.ai_attrition_risk > 0.4 OR EXTRACT(YEAR FROM AGE(NOW(), e.date_of_birth)) >= 55)
            ORDER BY e.ai_attrition_risk DESC NULLS LAST
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 10. EXPANSION PLANNING
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/expansion")
@require_auth
def expansion_plan(): return success(_get_plans("expansion"))


@wfp_bp.post("/expansion")
@require_auth
@require_role("super_admin","hr_manager")
def create_expansion():
    """Create expansion plan. Nepal LA2074: must notify Labour Office."""
    body = request.get_json() or {}
    new_positions = int(body.get("new_positions", 0))

    # Nepal law: notify Labour Office for significant expansion
    la_note = None
    if new_positions > 10:
        la_note = "Nepal Labour Act 2074 Section 11: Labour Office must be notified for hiring more than 10 new positions."

    result = _create_plan("expansion")

    # Patch in LA note if it's a created response
    if la_note and hasattr(result, 'json'):
        resp_data = result.get_json()
        if resp_data.get("data"):
            resp_data["data"]["la2074_note"] = la_note
            return jsonify(resp_data), 201
    return result


# ════════════════════════════════════════════════════════════════
# 11. CONTRACT STAFF PLANNING
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/contract-staff")
@require_auth
def contract_staff_plan():
    """Active and planned contract/time-bound positions."""
    try:
        rows = db.session.execute(text("""
            SELECT p.id, p.code, p.title, p.employment_type, p.status,
                   p.approved_salary_npr, p.contract_end_date,
                   EXTRACT(DAY FROM p.contract_end_date - NOW()::DATE)::INT AS days_to_expiry,
                   e.full_name AS incumbent_name,
                   d.name AS dept_name, b.name AS branch_name
            FROM positions p
            LEFT JOIN employees e ON p.incumbent_employee_id = e.id
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN branches b    ON p.branch_id = b.id
            WHERE p.company_id = :cid AND NOT p.is_deleted
              AND p.employment_type IN ('time_bound','work_based','casual')
            ORDER BY p.contract_end_date ASC NULLS LAST
        """), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        total = len(data)
        expiring_soon = sum(1 for r in data if 0 < (r.get("days_to_expiry") or 999) <= 30)
        return success({
            "positions": data,
            "summary": {"total_contract_staff": total, "expiring_in_30_days": expiring_soon},
            "la2074_note": "Casual employees: max 7 days/month. Time-bound: requires fixed end date. Cannot do core work.",
        })
    except Exception:
        return success({"positions":[],"summary":{}})


# ════════════════════════════════════════════════════════════════
# 12. PRODUCTIVITY PLANNING
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/productivity")
@require_auth
def productivity_plan():
    """Revenue per employee and output metrics by department."""
    try:
        rows = db.session.execute(text("""
            SELECT d.id, d.name AS dept_name,
                   COUNT(p.id) FILTER (WHERE p.status='filled') AS headcount,
                   COALESCE(SUM(p.approved_salary_npr) FILTER (WHERE p.status='filled'),0) AS total_payroll_npr,
                   COALESCE(AVG(kpi.score),0) AS avg_kpi_score
            FROM departments d
            LEFT JOIN positions p   ON p.department_id = d.id AND NOT p.is_deleted
            LEFT JOIN employee_kpis kpi ON kpi.department_id = d.id
                AND EXTRACT(YEAR FROM kpi.period_date) = EXTRACT(YEAR FROM NOW())
            WHERE d.company_id = :cid AND NOT d.is_deleted
            GROUP BY d.id, d.name ORDER BY avg_kpi_score DESC NULLS LAST
        """), {"cid": g.company_id}).fetchall()

        data = []
        for r in rows:
            d = dict(r._mapping)
            payroll = float(d.get("total_payroll_npr") or 0)
            hc      = int(d.get("headcount") or 1)
            d["cost_per_head_npr"] = round(payroll / max(hc,1), 0)
            data.append(d)

        ai = generate_ai_insights({
            "type":        "productivity_analysis",
            "departments": [{"name":r["dept_name"],"headcount":r["headcount"],"kpi":r["avg_kpi_score"]} for r in data[:5]],
        })
        return success({"departments": data, "ai_insight": ai})
    except Exception:
        return success({"departments":[]})


# ════════════════════════════════════════════════════════════════
# 13. RESOURCE ALLOCATION
# ════════════════════════════════════════════════════════════════

@wfp_bp.get("/resource-allocation")
@require_auth
def resource_allocation():
    """Budget vs actual payroll by dept/branch."""
    try:
        rows = db.session.execute(text("""
            SELECT d.id, d.name AS dept_name, d.annual_budget_npr,
                   COALESCE(SUM(p.approved_salary_npr * 12) FILTER (WHERE p.status='filled'), 0) AS projected_payroll_yr_npr,
                   COUNT(p.id) FILTER (WHERE p.status='filled')   AS filled_positions,
                   COUNT(p.id) FILTER (WHERE p.status='vacant')   AS vacant_positions,
                   COUNT(p.id)                                     AS total_quota
            FROM departments d
            LEFT JOIN positions p ON p.department_id = d.id AND NOT p.is_deleted
            WHERE d.company_id = :cid AND NOT d.is_deleted
            GROUP BY d.id, d.name, d.annual_budget_npr
            ORDER BY d.annual_budget_npr DESC NULLS LAST
        """), {"cid": g.company_id}).fetchall()

        data = []
        for r in rows:
            d = dict(r._mapping)
            budget  = float(d.get("annual_budget_npr") or 0)
            payroll = float(d.get("projected_payroll_yr_npr") or 0)
            d["budget_utilization_pct"] = round(payroll/max(budget,1)*100,1) if budget else 0
            d["budget_variance_npr"]    = round(budget - payroll, 0)
            d["is_over_budget"]         = payroll > budget
            data.append(d)

        ai = generate_ai_insights({
            "type":        "resource_allocation_analysis",
            "departments": [{"name":r["dept_name"],"utilization":r["budget_utilization_pct"]} for r in data[:5]],
        })
        return success({"allocations": data, "ai_insight": ai})
    except Exception:
        return success({"allocations":[]})


@wfp_bp.post("/resource-allocation/reallocate")
@require_auth
@require_role("super_admin","hr_manager")
def reallocate_resources():
    """Transfer budget allocation between departments."""
    body = request.get_json() or {}
    if not body.get("from_dept_id") or not body.get("to_dept_id") or not body.get("amount_npr"):
        return error("from_dept_id, to_dept_id, and amount_npr required", 422)
    try:
        # Deduct from source
        db.session.execute(text("""
            UPDATE departments SET annual_budget_npr = annual_budget_npr - :amount, updated_at = NOW()
            WHERE id = :from_id AND company_id = :cid
        """), {"amount": body["amount_npr"], "from_id": body["from_dept_id"], "cid": g.company_id})
        # Add to target
        db.session.execute(text("""
            UPDATE departments SET annual_budget_npr = annual_budget_npr + :amount, updated_at = NOW()
            WHERE id = :to_id AND company_id = :cid
        """), {"amount": body["amount_npr"], "to_id": body["to_dept_id"], "cid": g.company_id})
        db.session.commit()
        return success({
            "reallocated": True,
            "amount_npr":  body["amount_npr"],
            "la2074_note": "Reserve pool employees must receive min 50% salary during reallocation per LA2074.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── AI Workforce Insights (shared) ───────────────────────────
@wfp_bp.post("/ai-forecast")
@require_auth
def ai_forecast():
    """AI attrition and hiring forecast for next N months."""
    body = request.get_json() or {}
    months = int(body.get("months", 6))
    try:
        attrition = db.session.execute(text("""
            SELECT COUNT(*) FROM employees WHERE company_id=:cid AND ai_attrition_risk > 0.6
        """), {"cid": g.company_id}).scalar() or 0
        vacancies = db.session.execute(text("""
            SELECT COUNT(*) FROM positions WHERE company_id=:cid AND status='vacant' AND NOT is_deleted
        """), {"cid": g.company_id}).scalar() or 0
        insight = generate_ai_insights({
            "type":           "workforce_forecast",
            "months":         months,
            "high_risk_count":int(attrition),
            "current_vacancies": int(vacancies),
        })
        return success({
            "forecast_months":    months,
            "high_attrition_risk":int(attrition),
            "current_vacancies":  int(vacancies),
            "ai_forecast":        insight,
        })
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@wfp_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["quota","headcount","vacancy","workforce_plan"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], module)
    return jsonify(result), 200 if result["success"] else 422


@wfp_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(module)
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"wfp_{module}_template.xlsx")
