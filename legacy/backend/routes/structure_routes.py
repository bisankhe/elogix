"""
FILE: backend/routes/structure_routes.py
REST API — Employment Category, Designation, Grade Level,
           Reporting Hierarchy, Org Chart, Position Management
URL prefix: /api/v1/structure
AI-driven endpoints: JD generation, attrition risk, org restructure.
"""
from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import func, text, or_
from datetime import datetime, date
import uuid, io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..middleware.tenant import apply_tenant_scope
from ..utils.pagination import paginate, success, error, created, not_found, apply_search, apply_sort, apply_filters
from ..utils.nepal_law import check_probation, check_casual_days, get_leave_entitlement
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_jd, analyze_attrition_risk, generate_org_restructure_recommendations

struct_bp = Blueprint("structure", __name__, url_prefix="/api/v1/structure")


def get_model(name):
    from ..models.structure_models import (
        EmploymentCategory, JobFamily, GradeLevel, Designation,
        ReportingRelationship, OrgChartNode, Position
    )
    return {
        "employment_category":   EmploymentCategory,
        "job_family":            JobFamily,
        "grade_level":           GradeLevel,
        "designation":           Designation,
        "reporting_relationship":ReportingRelationship,
        "org_chart_node":        OrgChartNode,
        "position":              Position,
    }[name]


# ============================================================
# EMPLOYMENT CATEGORY — Full CRUD + Nepal Law Validation
# ============================================================
@struct_bp.get("/employment-categories")
@require_auth
def list_employment_categories():
    EC = get_model("employment_category")
    q = db.session.query(EC).filter(
        or_(EC.company_id == g.company_id, EC.company_id == None),
        EC.is_deleted == False
    )
    q = apply_search(q, EC, ["name", "name_nepali", "code"])
    q = apply_filters(q, EC, ["la_type", "is_active"])
    q = q.order_by(EC.sort_order)
    items, meta = paginate(q)
    return success([e.to_dict() for e in items], meta=meta)


@struct_bp.get("/employment-categories/<cat_id>")
@require_auth
def get_employment_category(cat_id):
    EC = get_model("employment_category")
    e = db.session.query(EC).filter_by(id=cat_id, is_deleted=False).first()
    if not e: return not_found("Employment Category")
    result = e.to_dict()
    # Append Nepal law summary
    result["nepal_law_summary"] = _build_nepal_law_summary(e)
    return success(result)


@struct_bp.post("/employment-categories")
@require_auth
@require_role("super_admin", "hr_manager")
def create_employment_category():
    EC = get_model("employment_category")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name") or not body.get("la_type"):
        return error("code, name and la_type are required", 422)

    # Nepal law validation
    prob_months = body.get("max_probation_months", 0)
    if prob_months and int(prob_months) > 6:
        return error("max_probation_months cannot exceed 6 per Nepal Labour Act 2074 Section 10", 422)
    max_days = body.get("max_days_per_month", 0)
    if max_days and int(max_days) > 7:
        return error("max_days_per_month cannot exceed 7 for casual workers per Section 10(d)", 422)

    e = EC(
        company_id               = g.company_id,
        code                     = body["code"].upper(),
        name                     = body["name"],
        name_nepali              = body.get("name_nepali"),
        la_type                  = body["la_type"],
        la_section               = body.get("la_section"),
        tier2_classification     = body.get("tier2_classification"),
        written_contract_required= body.get("written_contract_required", True),
        max_probation_months     = prob_months,
        max_duration_months      = body.get("max_duration_months"),
        max_days_per_month       = max_days,
        termination_notice_days  = body.get("termination_notice_days", 0),
        pf_eligible              = body.get("pf_eligible", False),
        ssf_eligible             = body.get("ssf_eligible", False),
        gratuity_eligible        = body.get("gratuity_eligible", False),
        medical_eligible         = body.get("medical_eligible", False),
        annual_leave_days        = body.get("annual_leave_days", 0),
        sick_leave_days          = body.get("sick_leave_days", 0),
        maternity_eligible       = body.get("maternity_eligible", False),
        paternity_eligible       = body.get("paternity_eligible", False),
        cba_eligible             = body.get("cba_eligible", False),
        max_daily_hrs            = body.get("max_daily_hrs"),
        max_weekly_hrs           = body.get("max_weekly_hrs"),
        statutory_color          = body.get("statutory_color", "#64748b"),
        sort_order               = body.get("sort_order", 99),
    )
    db.session.add(e)
    db.session.commit()
    return created(e.to_dict())


@struct_bp.post("/employment-categories/seed")
@require_auth
@require_role("super_admin")
def seed_employment_categories():
    """Seed all 11 Nepal Labour Act 2074 employment types for the company."""
    db.session.execute(
        text("SELECT fn_seed_company_emp_categories(:cid)"),
        {"cid": g.company_id}
    )
    db.session.commit()
    return success({"message": "11 employment categories seeded per Nepal Labour Act 2074"})


@struct_bp.get("/employment-categories/<cat_id>/nepal-law")
@require_auth
def category_nepal_law(cat_id):
    """Returns full Nepal Labour Act 2074 rules for this category."""
    EC = get_model("employment_category")
    e = db.session.query(EC).filter_by(id=cat_id).first()
    if not e: return not_found("Employment Category")
    return success(_build_nepal_law_summary(e))


def _build_nepal_law_summary(e) -> dict:
    return {
        "la_type":    e.la_type.value if e.la_type else None,
        "la_section": e.la_section,
        "rules": {
            "written_contract_required": e.written_contract_required,
            "max_probation_months":      e.max_probation_months,
            "max_days_per_month":        e.max_days_per_month,
            "max_weekly_hrs":            float(e.max_weekly_hrs) if e.max_weekly_hrs else None,
            "cba_eligible":              e.cba_eligible,
        },
        "benefits": {
            "pf_eligible":       e.pf_eligible,
            "ssf_eligible":      e.ssf_eligible,
            "gratuity_eligible": e.gratuity_eligible,
            "annual_leave_days": e.annual_leave_days,
            "sick_leave_days":   e.sick_leave_days,
            "maternity_eligible":e.maternity_eligible,
        },
        "ai_compliance_notes":      e.ai_compliance_notes,
        "ai_risk_level":            e.ai_risk_level,
        "ai_misclassification_risk":e.ai_misclassification_risk,
    }


# ============================================================
# JOB FAMILIES
# ============================================================
@struct_bp.get("/job-families")
@require_auth
def list_job_families():
    JF = get_model("job_family")
    q = apply_tenant_scope(db.session.query(JF), JF)
    q = apply_filters(q, JF, ["is_active"])
    items, meta = paginate(q)
    return success([j.to_dict() for j in items], meta=meta)


@struct_bp.post("/job-families")
@require_auth
@require_role("super_admin", "hr_manager")
def create_job_family():
    JF = get_model("job_family")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name"):
        return error("code and name required", 422)
    jf = JF(
        company_id  = g.company_id,
        code        = body["code"].upper(),
        name        = body["name"],
        name_nepali = body.get("name_nepali"),
        description = body.get("description"),
    )
    db.session.add(jf)
    db.session.commit()
    return created(jf.to_dict())


# ============================================================
# GRADE LEVELS
# ============================================================
@struct_bp.get("/grade-levels")
@require_auth
def list_grade_levels():
    GL = get_model("grade_level")
    q = apply_tenant_scope(db.session.query(GL), GL)
    q = apply_filters(q, GL, ["is_active", "category"])
    q = q.order_by(GL.level_order)
    items, meta = paginate(q)
    return success([g_.to_dict() for g_ in items], meta=meta)


@struct_bp.post("/grade-levels")
@require_auth
@require_role("super_admin", "hr_manager")
def create_grade_level():
    GL = get_model("grade_level")
    body = request.get_json() or {}
    if not all(body.get(k) for k in ["code", "name", "salary_min", "salary_max"]):
        return error("code, name, salary_min and salary_max are required", 422)

    if float(body["salary_min"]) < 15000:
        return error("salary_min must be >= NPR 15,000 (Nepal minimum wage)", 422)
    if float(body["salary_min"]) > float(body["salary_max"]):
        return error("salary_min cannot exceed salary_max", 422)

    gl = GL(
        company_id            = g.company_id,
        code                  = body["code"].upper(),
        name                  = body["name"],
        name_nepali           = body.get("name_nepali"),
        grade_number          = body.get("grade_number"),
        level_order           = body.get("level_order", 99),
        category              = body.get("category"),
        salary_min            = body["salary_min"],
        salary_mid            = body.get("salary_mid"),
        salary_max            = body["salary_max"],
        currency              = body.get("currency", "NPR"),
        pf_pct_employer       = body.get("pf_pct_employer", 10.0),
        pf_pct_employee       = body.get("pf_pct_employee", 10.0),
        ssf_pct_employer      = body.get("ssf_pct_employer", 3.33),
        gratuity_pct          = body.get("gratuity_pct", 8.33),
        annual_bonus_months   = body.get("annual_bonus_months", 1.0),
        medical_allowance_npr = body.get("medical_allowance_npr"),
        increment_pct_min     = body.get("increment_pct_min", 5.0),
        increment_pct_max     = body.get("increment_pct_max", 15.0),
    )
    db.session.add(gl)
    db.session.commit()
    return created(gl.to_dict())


@struct_bp.put("/grade-levels/<grade_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_grade_level(grade_id):
    GL = get_model("grade_level")
    gl = db.session.query(GL).filter_by(id=grade_id, company_id=g.company_id, is_deleted=False).first()
    if not gl: return not_found("Grade Level")
    body = request.get_json() or {}
    if "salary_min" in body and float(body["salary_min"]) < 15000:
        return error("salary_min < NPR 15,000 violates Nepal minimum wage", 422)
    for k in ["name", "name_nepali", "grade_number", "level_order", "category",
               "salary_min", "salary_mid", "salary_max", "increment_pct_min",
               "increment_pct_max", "annual_bonus_months", "is_active"]:
        if k in body: setattr(gl, k, body[k])
    db.session.commit()
    return success(gl.to_dict())


@struct_bp.get("/grade-levels/salary-matrix")
@require_auth
def salary_matrix():
    """Returns full salary band matrix for GradeLevelPage chart."""
    rows = db.session.execute(text("""
        SELECT code, name, category, level_order,
               salary_min, salary_mid, salary_max,
               ROUND((salary_max - salary_min)::NUMERIC / salary_min * 100, 1) AS spread_pct,
               pf_pct_employer, ssf_pct_employer, gratuity_pct,
               annual_bonus_months, ai_competitiveness,
               (SELECT COUNT(*) FROM designations WHERE grade_level_id = gl.id AND NOT is_deleted) AS designation_count,
               (SELECT COUNT(*) FROM positions WHERE grade_level_id = gl.id AND NOT is_deleted) AS position_count
        FROM grade_levels gl
        WHERE company_id = :cid AND is_deleted = FALSE
        ORDER BY level_order
    """), {"cid": g.company_id}).fetchall()
    return success([dict(r._mapping) for r in rows])


# ============================================================
# DESIGNATIONS + AI JD GENERATOR
# ============================================================
@struct_bp.get("/designations")
@require_auth
def list_designations():
    D = get_model("designation")
    q = apply_tenant_scope(db.session.query(D), D)
    q = apply_search(q, D, ["name", "name_nepali", "code"])
    q = apply_filters(q, D, ["is_active", "status", "job_family_id", "grade_level_id",
                               "is_managerial", "is_executive"])
    q = apply_sort(q, D, ["name", "code", "level", "approved_positions"])
    items, meta = paginate(q)
    return success([d.to_dict() for d in items], meta=meta)


@struct_bp.post("/designations")
@require_auth
@require_role("super_admin", "hr_manager")
def create_designation():
    D = get_model("designation")
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name"):
        return error("code and name required", 422)
    d = D(
        company_id         = g.company_id,
        job_family_id      = body.get("job_family_id"),
        grade_level_id     = body.get("grade_level_id"),
        parent_desig_id    = body.get("parent_desig_id"),
        code               = body["code"].upper(),
        name               = body["name"],
        name_nepali        = body.get("name_nepali"),
        level              = body.get("level"),
        category           = body.get("category"),
        is_managerial      = body.get("is_managerial", False),
        is_executive       = body.get("is_executive", False),
        is_supervisory     = body.get("is_supervisory", False),
        approved_positions = body.get("approved_positions", 0),
        jd_summary         = body.get("jd_summary"),
        jd_skills          = body.get("jd_skills", []),
        jd_experience_years= body.get("jd_experience_years"),
        jd_education_level = body.get("jd_education_level"),
    )
    db.session.add(d)
    db.session.commit()
    return created(d.to_dict())


@struct_bp.put("/designations/<desig_id>")
@require_auth
def update_designation(desig_id):
    D = get_model("designation")
    d = db.session.query(D).filter_by(id=desig_id, company_id=g.company_id, is_deleted=False).first()
    if not d: return not_found("Designation")
    body = request.get_json() or {}
    for k in ["name", "name_nepali", "category", "is_managerial", "is_executive",
               "approved_positions", "jd_summary", "jd_skills", "jd_experience_years",
               "jd_education_level", "status", "is_active"]:
        if k in body: setattr(d, k, body[k])
    db.session.commit()
    return success(d.to_dict())


@struct_bp.post("/designations/<desig_id>/generate-jd")
@require_auth
def ai_generate_jd(desig_id):
    """AI Job Description generator using Claude API."""
    D  = get_model("designation")
    GL = get_model("grade_level")
    JF = get_model("job_family")
    d  = db.session.query(D).filter_by(id=desig_id, company_id=g.company_id, is_deleted=False).first()
    if not d: return not_found("Designation")

    grade  = db.session.get(GL, d.grade_level_id)  if d.grade_level_id  else None
    family = db.session.get(JF, d.job_family_id)   if d.job_family_id   else None

    context = {
        "title":         d.name, "title_nepali": d.name_nepali,
        "job_code":      d.code, "job_family":   family.name if family else "General",
        "grade":         f"{grade.code} – {grade.name}" if grade else "Not specified",
        "salary_range":  f"NPR {grade.salary_min:,.0f}–{grade.salary_max:,.0f}" if grade else None,
        "experience_years": d.jd_experience_years or 0,
        "education":     d.jd_education_level or "",
        "skills":        d.jd_skills or [],
        "is_managerial": d.is_managerial,
        "country":       "Nepal",
        "nepal_la_note": ("Managerial category – excluded from CBA per Labour Act 2074 Section 7"
                          if d.is_managerial else "General category – CBA eligible"),
    }
    jd = generate_jd(context)

    d.jd_full_text        = jd.get("full_text") or jd.get("summary", "")
    d.jd_summary          = jd.get("summary", "")
    d.jd_responsibilities = jd.get("responsibilities", [])
    d.jd_qualifications   = jd.get("qualifications", [])
    d.jd_skills           = jd.get("skills", d.jd_skills or [])
    d.ai_jd_generated     = True
    d.ai_jd_content       = jd
    db.session.commit()
    return success({"designation_id": desig_id, "jd": jd})


# ============================================================
# REPORTING HIERARCHY
# ============================================================
@struct_bp.get("/reporting")
@require_auth
def list_reporting():
    RR = get_model("reporting_relationship")
    q = db.session.query(RR).filter_by(company_id=g.company_id, is_deleted=False, status="active")
    if request.args.get("employee_id"):
        q = q.filter(RR.employee_id == request.args["employee_id"])
    if request.args.get("manager_id"):
        q = q.filter(RR.manager_id  == request.args["manager_id"])
    if request.args.get("type"):
        q = q.filter(RR.relationship_type == request.args["type"])
    items, meta = paginate(q)
    return success([r.to_dict() for r in items], meta=meta)


@struct_bp.post("/reporting")
@require_auth
@require_role("super_admin", "hr_manager")
def create_reporting_line():
    RR = get_model("reporting_relationship")
    body = request.get_json() or {}
    if not body.get("employee_id") or not body.get("manager_id") or not body.get("effective_from"):
        return error("employee_id, manager_id and effective_from are required", 422)
    if body["employee_id"] == body["manager_id"]:
        return error("Employee cannot report to themselves", 422)

    # Deactivate any existing primary line for this employee
    if body.get("is_primary", True):
        db.session.query(RR).filter_by(
            company_id=g.company_id, employee_id=body["employee_id"],
            relationship_type="direct", is_primary=True, status="active"
        ).update({"status": "superseded", "effective_to": body["effective_from"]})

    rr = RR(
        company_id        = g.company_id,
        employee_id       = body["employee_id"],
        manager_id        = body["manager_id"],
        relationship_type = body.get("relationship_type", "direct"),
        is_primary        = body.get("is_primary", True),
        effective_from    = date.fromisoformat(body["effective_from"]),
        effective_to      = date.fromisoformat(body["effective_to"]) if body.get("effective_to") else None,
        reason            = body.get("reason"),
    )
    db.session.add(rr)
    db.session.commit()
    return created(rr.to_dict())


@struct_bp.get("/reporting/span-of-control")
@require_auth
def span_of_control():
    """Span of control analysis for ReportingHierarchyPage."""
    rows = db.session.execute(text("""
        SELECT
            manager_id,
            COUNT(*)                                               AS direct_reports,
            CASE WHEN COUNT(*) < 3  THEN 'underloaded'
                 WHEN COUNT(*) > 10 THEN 'overloaded'
                 ELSE 'optimal' END                               AS span_status,
            STRING_AGG(employee_id::TEXT, ',')                    AS report_ids
        FROM reporting_relationships
        WHERE company_id = :cid AND status = 'active'
          AND relationship_type = 'direct' AND NOT is_deleted
        GROUP BY manager_id
        ORDER BY direct_reports DESC
    """), {"cid": g.company_id}).fetchall()
    data = [dict(r._mapping) for r in rows]
    overloaded   = [r for r in data if r["span_status"] == "overloaded"]
    underloaded  = [r for r in data if r["span_status"] == "underloaded"]
    return success({
        "span_analysis": data,
        "summary": {
            "total_managers":       len(data),
            "optimal_count":        sum(1 for r in data if r["span_status"] == "optimal"),
            "overloaded_count":     len(overloaded),
            "underloaded_count":    len(underloaded),
            "avg_span":             round(sum(r["direct_reports"] for r in data) / len(data), 1) if data else 0,
        },
        "nepal_law_note": "Recommended span: 5–8 direct reports per manager for optimal Nepal HR governance.",
    })


@struct_bp.post("/reporting/ai-restructure")
@require_auth
def ai_restructure_recommendations():
    """AI org restructure recommendations."""
    rows = db.session.execute(text("""
        SELECT manager_id, COUNT(*) AS direct_reports
        FROM reporting_relationships
        WHERE company_id = :cid AND status = 'active' AND NOT is_deleted
        GROUP BY manager_id
    """), {"cid": g.company_id}).fetchall()
    P = get_model("position")
    total   = db.session.query(func.count(P.id)).filter_by(company_id=g.company_id, is_deleted=False).scalar()
    filled  = db.session.query(func.count(P.id)).filter_by(company_id=g.company_id, status="filled", is_deleted=False).scalar()
    no_succ = db.session.query(func.count(P.id)).filter_by(
        company_id=g.company_id, status="filled",
        succession_ready=False, is_critical=True, is_deleted=False
    ).scalar()
    result = generate_org_restructure_recommendations({
        "total_positions": total, "filled_positions": filled,
        "fill_rate_pct": round(filled/total*100, 1) if total else 0,
        "critical_no_succession": no_succ,
        "span_data": [dict(r._mapping) for r in rows],
    })
    return success(result)


# ============================================================
# ORG CHART
# ============================================================
@struct_bp.get("/org-chart")
@require_auth
def get_org_chart():
    """Full org chart tree data."""
    ON = get_model("org_chart_node")
    nodes = db.session.query(ON).filter_by(
        company_id=g.company_id, is_visible=True, is_deleted=False
    ).order_by(ON.depth, ON.sort_order).all()
    return success([n.to_dict() for n in nodes])


@struct_bp.post("/org-chart/rebuild")
@require_auth
@require_role("super_admin", "hr_manager")
def rebuild_org_chart():
    """Rebuilds org chart nodes from positions + reporting relationships."""
    db.session.execute(text("""
        DELETE FROM org_chart_nodes WHERE company_id = :cid
    """), {"cid": g.company_id})

    rows = db.session.execute(text("""
        WITH RECURSIVE hierarchy AS (
            SELECT p.id, p.position_title AS entity_name, p.position_code AS entity_code,
                   p.reports_to_position_id AS parent_id,
                   p.incumbent_name, d.name AS department,
                   0 AS depth,
                   p.id::TEXT AS path_text
            FROM positions p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.company_id = :cid AND p.reports_to_position_id IS NULL AND NOT p.is_deleted
            UNION ALL
            SELECT p.id, p.position_title, p.position_code,
                   p.reports_to_position_id, p.incumbent_name, d.name,
                   h.depth + 1,
                   h.path_text || '.' || p.id::TEXT
            FROM positions p
            LEFT JOIN departments d ON p.department_id = d.id
            JOIN hierarchy h ON p.reports_to_position_id = h.id
            WHERE NOT p.is_deleted
        )
        SELECT * FROM hierarchy ORDER BY depth, entity_name
    """), {"cid": g.company_id}).fetchall()

    for r in rows:
        node = get_model("org_chart_node")(
            company_id     = g.company_id,
            parent_node_id = None,
            node_type      = "position",
            entity_id      = r.id,
            entity_name    = r.entity_name,
            entity_code    = r.entity_code,
            depth          = r.depth,
            display_title  = r.entity_name,
            display_subtitle = r.department or "",
        )
        db.session.add(node)
    db.session.commit()
    return success({"rebuilt": len(rows), "message": "Org chart rebuilt from positions"})


# ============================================================
# POSITION MANAGEMENT
# ============================================================
@struct_bp.get("/positions")
@require_auth
def list_positions():
    P = get_model("position")
    q = apply_tenant_scope(db.session.query(P), P)
    q = apply_search(q, P, ["position_title", "position_code"])
    q = apply_filters(q, P, ["status", "department_id", "designation_id",
                               "grade_level_id", "is_critical", "headcount_type"])
    q = apply_sort(q, P, ["position_code", "position_title", "status", "created_at"])
    items, meta = paginate(q)
    return success([p.to_dict() for p in items], meta=meta)


@struct_bp.post("/positions")
@require_auth
@require_role("super_admin", "hr_manager")
def create_position():
    P = get_model("position")
    body = request.get_json() or {}
    if not body.get("position_code") or not body.get("position_title") or not body.get("designation_id"):
        return error("position_code, position_title and designation_id are required", 422)

    # Salary vs grade check
    if body.get("approved_salary_min") and float(body["approved_salary_min"]) < 15000:
        return error("approved_salary_min < NPR 15,000 violates Nepal minimum wage", 422)

    p = P(
        company_id             = g.company_id,
        designation_id         = body["designation_id"],
        grade_level_id         = body.get("grade_level_id"),
        department_id          = body.get("department_id"),
        branch_id              = body.get("branch_id"),
        cost_center_id         = body.get("cost_center_id"),
        reports_to_position_id = body.get("reports_to_position_id"),
        position_code          = body["position_code"].upper(),
        position_title         = body["position_title"],
        status                 = body.get("status", "vacant"),
        employment_category    = body.get("employment_category"),
        approved_salary_min    = body.get("approved_salary_min"),
        approved_salary_max    = body.get("approved_salary_max"),
        headcount_type         = body.get("headcount_type", "permanent"),
        fte                    = body.get("fte", 1.0),
        is_critical            = body.get("is_critical", False),
        effective_from         = date.fromisoformat(body["effective_from"]) if body.get("effective_from") else date.today(),
    )
    db.session.add(p)
    db.session.commit()
    return created(p.to_dict())


@struct_bp.put("/positions/<pos_id>")
@require_auth
def update_position(pos_id):
    P = get_model("position")
    p = db.session.query(P).filter_by(id=pos_id, company_id=g.company_id, is_deleted=False).first()
    if not p: return not_found("Position")
    body = request.get_json() or {}
    for k in ["position_title", "status", "incumbent_id", "incumbent_name",
               "filled_date", "is_critical", "succession_ready",
               "succession_candidate_id", "headcount_type", "fte"]:
        if k in body: setattr(p, k, body[k])
    db.session.commit()
    return success(p.to_dict())


@struct_bp.post("/positions/<pos_id>/ai-attrition-risk")
@require_auth
def ai_position_risk(pos_id):
    """AI attrition risk analysis for a specific position."""
    P = get_model("position")
    p = db.session.query(P).filter_by(id=pos_id, company_id=g.company_id).first()
    if not p: return not_found("Position")

    # Span of control
    RR = get_model("reporting_relationship")
    direct_reports = db.session.query(func.count(RR.id)).filter_by(
        manager_id=p.incumbent_id, status="active", is_deleted=False
    ).scalar() if p.incumbent_id else 0

    risk = analyze_attrition_risk({
        "position_id":       pos_id,
        "title":             p.position_title,
        "incumbent_name":    p.incumbent_name,
        "status":            p.status,
        "is_critical":       p.is_critical,
        "succession_ready":  p.succession_ready,
        "direct_reports":    direct_reports,
        "fte":               float(p.fte or 1),
        "headcount_type":    p.headcount_type,
    })
    p.ai_vacancy_risk      = risk.get("level", "low")
    p.ai_time_to_fill_est  = risk.get("time_to_fill_days")
    p.ai_insights          = risk
    db.session.commit()
    return success({"position_id": pos_id, "risk": risk})


@struct_bp.get("/positions/headcount-summary")
@require_auth
def headcount_summary():
    """Headcount summary grouped by status, dept, type — for PositionManagementPage."""
    rows = db.session.execute(text("""
        SELECT
            d.name  AS department,
            p.status,
            p.headcount_type,
            COUNT(*) AS count
        FROM positions p
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.company_id = :cid AND NOT p.is_deleted
        GROUP BY d.name, p.status, p.headcount_type
        ORDER BY d.name, p.status
    """), {"cid": g.company_id}).fetchall()
    return success([dict(r._mapping) for r in rows])


# ============================================================
# EXCEL IMPORT/EXPORT
# ============================================================
@struct_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["employment_category", "grade_level", "designation", "position"]
    if module not in allowed:
        return error(f"Module must be one of: {', '.join(allowed)}", 400)
    if "file" not in request.files:
        return error("No file uploaded", 400)
    result = parse_excel_upload(request.files["file"], module)
    return jsonify(result), 200 if result["success"] else 422


@struct_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    xlsx_bytes = build_template_xlsx(module)
    if not xlsx_bytes:
        return error("Could not generate template", 500)
    return send_file(
        io.BytesIO(xlsx_bytes),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"elogix_hrms_{module}_template.xlsx"
    )
