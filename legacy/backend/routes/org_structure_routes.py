# ============================================================
# FILE: backend/routes/org_structure_routes.py
# PURPOSE: Flask REST API for Organization Management
#          Business Unit, Department, Section, Team,
#          Cost Center, Work Location — with AI insights
# STACK: Python 3.11 + Flask + SQLAlchemy + Anthropic AI
# ============================================================

from flask import Blueprint, request, jsonify, g
from functools import wraps
from datetime import datetime, timezone
import uuid
import anthropic
import os

from ..models.org_structure_models import (
    BusinessUnit, Department, SectionUnit,
    Team, TeamMember, CostCenter, WorkLocation
)
from ..database import db_session

org_bp = Blueprint("org_structure", __name__, url_prefix="/api/v1/org")
ai_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


# ── Auth middleware ───────────────────────────────────────────
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        g.tenant_id   = request.headers.get("X-Tenant-Id")
        g.employee_id = request.headers.get("X-Employee-Id")
        g.role        = request.headers.get("X-Role", "employee")
        if not g.tenant_id:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# ── AI helper ─────────────────────────────────────────────────
def generate_ai_insight(entity_type: str, data: dict) -> dict:
    """Generate AI-powered org insight using Claude"""
    try:
        prompt = f"""You are an HR organizational design expert.
Analyze this {entity_type} data and provide insights:

{entity_type.upper()} DATA:
{data}

Provide a JSON response with:
{{
  "summary": "2-sentence plain-language description",
  "health_score": 85,  // 0-100
  "health_label": "Healthy",  // Healthy/At Risk/Critical
  "key_observations": ["obs1", "obs2", "obs3"],
  "recommendations": ["rec1", "rec2"],
  "nepal_compliance_note": "relevant Nepal Labour Act note if applicable"
}}"""

        response = ai_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        text = response.content[0].text
        try:
            return json.loads(text)
        except Exception:
            return {
                "summary": text[:200],
                "health_score": 75,
                "health_label": "Healthy",
                "key_observations": [],
                "recommendations": []
            }
    except Exception as e:
        return {
            "summary": f"AI insights temporarily unavailable.",
            "health_score": None,
            "error": str(e)
        }


# ============================================================
# SECTION A: BUSINESS UNITS
# ============================================================

@org_bp.route("/business-units", methods=["GET"])
@require_auth
def list_business_units():
    """GET /api/v1/org/business-units — List all BUs"""
    include_children = request.args.get("include_children", "false").lower() == "true"

    bus = db_session.query(BusinessUnit).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).order_by(BusinessUnit.hierarchy_level, BusinessUnit.name).all()

    return jsonify({
        "success": True,
        "count":   len(bus),
        "data":    [bu.to_dict(include_children=include_children) for bu in bus]
    })


@org_bp.route("/business-units/<bu_id>", methods=["GET"])
@require_auth
def get_business_unit(bu_id):
    """GET /api/v1/org/business-units/{id}"""
    bu = db_session.query(BusinessUnit).filter_by(
        id=bu_id, tenant_id=g.tenant_id
    ).first()
    if not bu:
        return jsonify({"error": "Business unit not found"}), 404

    return jsonify({
        "success": True,
        "data":    bu.to_dict(include_children=True)
    })


@org_bp.route("/business-units", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_business_unit():
    """POST /api/v1/org/business-units — Create a new BU"""
    data = request.get_json()

    bu = BusinessUnit(
        tenant_id           = g.tenant_id,
        code                = data["code"],
        name                = data["name"],
        short_name          = data.get("short_name"),
        description         = data.get("description"),
        bu_type             = data.get("bu_type", "division"),
        parent_bu_id        = data.get("parent_bu_id"),
        gl_account_code     = data.get("gl_account_code"),
        annual_budget       = data.get("annual_budget"),
        currency_code       = data.get("currency_code", "NPR"),
        legal_entity_name   = data.get("legal_entity_name"),
        registration_number = data.get("registration_number"),
        tax_number          = data.get("tax_number"),
        country_code        = data.get("country_code", "NP"),
        applicable_laws     = data.get("applicable_laws",
                               {"nepal_labour_act": True, "gdpr": False}),
        hierarchy_level     = data.get("hierarchy_level", 1),
        created_by          = g.employee_id,
    )

    db_session.add(bu)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Business Unit '{bu.name}' created successfully.",
        "data":    bu.to_dict()
    }), 201


@org_bp.route("/business-units/<bu_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_business_unit(bu_id):
    """PUT /api/v1/org/business-units/{id}"""
    bu = db_session.query(BusinessUnit).filter_by(
        id=bu_id, tenant_id=g.tenant_id
    ).first()
    if not bu:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    allowed = ["name", "short_name", "description", "bu_type", "annual_budget",
               "gl_account_code", "legal_entity_name", "tax_number", "is_active"]
    for field in allowed:
        if field in data:
            setattr(bu, field, data[field])

    bu.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": "Business Unit updated.",
        "data":    bu.to_dict()
    })


@org_bp.route("/business-units/<bu_id>/ai-insight", methods=["POST"])
@require_auth
def bu_ai_insight(bu_id):
    """POST /api/v1/org/business-units/{id}/ai-insight — AI analysis"""
    bu = db_session.query(BusinessUnit).filter_by(
        id=bu_id, tenant_id=g.tenant_id
    ).first()
    if not bu:
        return jsonify({"error": "Not found"}), 404

    insight = generate_ai_insight("Business Unit", {
        "name": bu.name, "type": bu.bu_type,
        "employee_count": bu.employee_count,
        "annual_budget": float(bu.annual_budget or 0),
        "departments_count": len(bu.departments),
        "country": bu.country_code,
        "compliance_alerts": bu.compliance_alerts
    })

    # Cache it
    bu.ai_insights = insight
    bu.ai_summary  = insight.get("summary", "")
    db_session.commit()

    return jsonify({"success": True, "insight": insight})


# ============================================================
# SECTION B: DEPARTMENTS
# ============================================================

@org_bp.route("/departments", methods=["GET"])
@require_auth
def list_departments():
    """GET /api/v1/org/departments"""
    bu_id            = request.args.get("business_unit_id")
    include_children = request.args.get("include_children", "false").lower() == "true"

    q = db_session.query(Department).filter_by(
        tenant_id=g.tenant_id, is_active=True
    )
    if bu_id:
        q = q.filter_by(business_unit_id=bu_id)

    depts = q.order_by(Department.name).all()

    return jsonify({
        "success": True,
        "count":   len(depts),
        "data":    [d.to_dict(include_children=include_children) for d in depts]
    })


@org_bp.route("/departments/<dept_id>", methods=["GET"])
@require_auth
def get_department(dept_id):
    """GET /api/v1/org/departments/{id}"""
    dept = db_session.query(Department).filter_by(
        id=dept_id, tenant_id=g.tenant_id
    ).first()
    if not dept:
        return jsonify({"error": "Department not found"}), 404

    return jsonify({
        "success": True,
        "data":    dept.to_dict(include_children=True)
    })


@org_bp.route("/departments", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_department():
    """POST /api/v1/org/departments"""
    data = request.get_json()

    dept = Department(
        tenant_id        = g.tenant_id,
        business_unit_id = data["business_unit_id"],
        code             = data["code"],
        name             = data["name"],
        short_name       = data.get("short_name"),
        description      = data.get("description"),
        dept_type        = data.get("dept_type", "functional"),
        parent_dept_id   = data.get("parent_dept_id"),
        dept_head_name   = data.get("dept_head_name"),
        annual_budget    = data.get("annual_budget"),
        headcount_budget = data.get("headcount_budget"),
        ulrich_pillar    = data.get("ulrich_pillar", "general"),
        primary_kpis     = data.get("primary_kpis", []),
        hierarchy_level  = data.get("hierarchy_level", 2),
        created_by       = g.employee_id,
    )

    db_session.add(dept)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Department '{dept.name}' created.",
        "data":    dept.to_dict()
    }), 201


@org_bp.route("/departments/<dept_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_department(dept_id):
    """PUT /api/v1/org/departments/{id}"""
    dept = db_session.query(Department).filter_by(
        id=dept_id, tenant_id=g.tenant_id
    ).first()
    if not dept:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    allowed = ["name", "short_name", "description", "dept_type", "dept_head_name",
               "annual_budget", "headcount_budget", "ulrich_pillar",
               "primary_kpis", "is_active", "is_billable"]
    for field in allowed:
        if field in data:
            setattr(dept, field, data[field])

    dept.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({"success": True, "data": dept.to_dict()})


@org_bp.route("/departments/<dept_id>/ai-insight", methods=["POST"])
@require_auth
def dept_ai_insight(dept_id):
    """AI insight for a department"""
    dept = db_session.query(Department).filter_by(
        id=dept_id, tenant_id=g.tenant_id
    ).first()
    if not dept:
        return jsonify({"error": "Not found"}), 404

    insight = generate_ai_insight("Department", {
        "name":               dept.name,
        "type":               dept.dept_type,
        "ulrich_pillar":      dept.ulrich_pillar,
        "headcount":          dept.current_headcount,
        "headcount_budget":   dept.headcount_budget,
        "annual_budget":      float(dept.annual_budget or 0),
        "sections_count":     len(dept.sections),
        "teams_count":        len(dept.teams),
        "primary_kpis":       dept.primary_kpis,
    })

    dept.ai_insights = insight
    db_session.commit()

    return jsonify({"success": True, "insight": insight})


# ============================================================
# SECTION C: SECTIONS & UNITS
# ============================================================

@org_bp.route("/sections", methods=["GET"])
@require_auth
def list_sections():
    """GET /api/v1/org/sections?department_id=..."""
    dept_id = request.args.get("department_id")
    q = db_session.query(SectionUnit).filter_by(
        tenant_id=g.tenant_id, is_active=True
    )
    if dept_id:
        q = q.filter_by(department_id=dept_id)

    sections = q.order_by(SectionUnit.name).all()
    return jsonify({
        "success": True,
        "count":   len(sections),
        "data":    [s.to_dict() for s in sections]
    })


@org_bp.route("/sections", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_section():
    """POST /api/v1/org/sections"""
    data = request.get_json()
    section = SectionUnit(
        tenant_id         = g.tenant_id,
        department_id     = data["department_id"],
        code              = data["code"],
        name              = data["name"],
        short_name        = data.get("short_name"),
        description       = data.get("description"),
        entity_type       = data.get("entity_type", "section"),
        parent_section_id = data.get("parent_section_id"),
        section_head_name = data.get("section_head_name"),
        specialization    = data.get("specialization"),
        swim_lane_color   = data.get("swim_lane_color", "#3b82f6"),
        primary_kpis      = data.get("primary_kpis", []),
        created_by        = g.employee_id,
    )
    db_session.add(section)
    db_session.commit()
    return jsonify({"success": True, "data": section.to_dict()}), 201


@org_bp.route("/sections/<section_id>", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr")
def update_section(section_id):
    """PUT /api/v1/org/sections/{id}"""
    section = db_session.query(SectionUnit).filter_by(
        id=section_id, tenant_id=g.tenant_id
    ).first()
    if not section:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    for field in ["name", "description", "section_head_name",
                  "specialization", "swim_lane_color", "is_active"]:
        if field in data:
            setattr(section, field, data[field])

    section.updated_at = datetime.now(timezone.utc)
    db_session.commit()
    return jsonify({"success": True, "data": section.to_dict()})


# ============================================================
# SECTION D: TEAMS
# ============================================================

@org_bp.route("/teams", methods=["GET"])
@require_auth
def list_teams():
    """GET /api/v1/org/teams"""
    dept_id    = request.args.get("department_id")
    team_type  = request.args.get("team_type")
    status     = request.args.get("status", "active")

    q = db_session.query(Team).filter_by(
        tenant_id=g.tenant_id, status=status
    )
    if dept_id:   q = q.filter_by(department_id=dept_id)
    if team_type: q = q.filter_by(team_type=team_type)

    teams = q.order_by(Team.name).all()
    include_members = request.args.get("include_members","false").lower()=="true"

    return jsonify({
        "success": True,
        "count":   len(teams),
        "data":    [t.to_dict(include_members=include_members) for t in teams]
    })


@org_bp.route("/teams", methods=["POST"])
@require_auth
@require_role("super-admin", "hr", "department")
def create_team():
    """POST /api/v1/org/teams"""
    data = request.get_json()

    team = Team(
        tenant_id           = g.tenant_id,
        department_id       = data.get("department_id"),
        section_id          = data.get("section_id"),
        code                = data["code"],
        name                = data["name"],
        short_name          = data.get("short_name"),
        description         = data.get("description"),
        team_type           = data.get("team_type", "functional"),
        is_permanent        = data.get("is_permanent", True),
        is_cross_functional = data.get("is_cross_functional", False),
        allows_matrix_report= data.get("allows_matrix_report", False),
        team_lead_name      = data.get("team_lead_name"),
        max_headcount       = data.get("max_headcount"),
        target_headcount    = data.get("target_headcount"),
        agile_methodology   = data.get("agile_methodology"),
        sprint_velocity     = data.get("sprint_velocity"),
        start_date          = data.get("start_date"),
        end_date            = data.get("end_date"),
        team_color          = data.get("team_color", "#3b82f6"),
        team_icon           = data.get("team_icon", "👥"),
        created_by          = g.employee_id,
    )

    db_session.add(team)
    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"Team '{team.name}' created.",
        "data":    team.to_dict()
    }), 201


@org_bp.route("/teams/<team_id>/members", methods=["POST"])
@require_auth
@require_role("super-admin", "hr", "department")
def add_team_member(team_id):
    """POST /api/v1/org/teams/{id}/members"""
    data = request.get_json()

    member = TeamMember(
        tenant_id       = g.tenant_id,
        team_id         = team_id,
        employee_id     = data["employee_id"],
        employee_name   = data.get("employee_name"),
        role_in_team    = data.get("role_in_team", "member"),
        is_primary_team = data.get("is_primary_team", True),
        allocation_pct  = data.get("allocation_pct", 100),
    )

    db_session.add(member)

    # Update headcount
    team = db_session.query(Team).get(team_id)
    if team:
        team.current_headcount = db_session.query(TeamMember).filter_by(
            team_id=team_id, is_active=True
        ).count() + 1

    db_session.commit()

    return jsonify({
        "success": True,
        "message": f"{member.employee_name} added to team.",
        "data":    member.to_dict()
    }), 201


# ============================================================
# SECTION E: COST CENTERS
# ============================================================

@org_bp.route("/cost-centers", methods=["GET"])
@require_auth
def list_cost_centers():
    """GET /api/v1/org/cost-centers"""
    dept_id = request.args.get("department_id")
    q = db_session.query(CostCenter).filter_by(
        tenant_id=g.tenant_id, is_active=True
    )
    if dept_id:
        q = q.filter_by(department_id=dept_id)

    ccs = q.order_by(CostCenter.code).all()
    return jsonify({
        "success":  True,
        "count":    len(ccs),
        "data":     [cc.to_dict() for cc in ccs],
        "summary": {
            "total_budget":     sum(float(cc.annual_budget or 0) for cc in ccs),
            "total_actual":     sum(float(cc.ytd_actual or 0) for cc in ccs),
            "avg_utilization":  round(
                sum(cc.utilization_pct for cc in ccs) / len(ccs), 1
            ) if ccs else 0
        }
    })


@org_bp.route("/cost-centers", methods=["POST"])
@require_auth
@require_role("super-admin", "hr", "executive")
def create_cost_center():
    """POST /api/v1/org/cost-centers"""
    data = request.get_json()

    cc = CostCenter(
        tenant_id        = g.tenant_id,
        business_unit_id = data.get("business_unit_id"),
        department_id    = data.get("department_id"),
        code             = data["code"],
        name             = data["name"],
        short_name       = data.get("short_name"),
        description      = data.get("description"),
        cc_type          = data.get("cc_type", "operational"),
        gl_account_code  = data.get("gl_account_code"),
        erp_cost_center_id= data.get("erp_cost_center_id"),
        annual_budget    = data.get("annual_budget", 0),
        currency_code    = data.get("currency_code", "NPR"),
        approver_name    = data.get("approver_name"),
        approval_limit   = data.get("approval_limit"),
        created_by       = g.employee_id,
    )

    db_session.add(cc)
    db_session.commit()

    return jsonify({"success": True, "data": cc.to_dict()}), 201


@org_bp.route("/cost-centers/<cc_id>/actuals", methods=["PUT"])
@require_auth
@require_role("super-admin", "hr", "executive")
def update_cc_actuals(cc_id):
    """PUT /api/v1/org/cost-centers/{id}/actuals — Update YTD spending"""
    cc = db_session.query(CostCenter).filter_by(
        id=cc_id, tenant_id=g.tenant_id
    ).first()
    if not cc:
        return jsonify({"error": "Not found"}), 404

    data = request.get_json()
    if "ytd_actual" in data:
        cc.ytd_actual = data["ytd_actual"]
    if "ytd_committed" in data:
        cc.ytd_committed = data["ytd_committed"]

    cc.updated_at = datetime.now(timezone.utc)
    db_session.commit()

    return jsonify({
        "success":         True,
        "ytd_actual":      float(cc.ytd_actual),
        "budget_variance": cc.budget_variance,
        "utilization_pct": cc.utilization_pct
    })


# ============================================================
# SECTION F: WORK LOCATIONS
# ============================================================

@org_bp.route("/work-locations", methods=["GET"])
@require_auth
def list_work_locations():
    """GET /api/v1/org/work-locations"""
    country = request.args.get("country_code")
    loc_type= request.args.get("location_type")

    q = db_session.query(WorkLocation).filter_by(
        tenant_id=g.tenant_id, is_active=True
    )
    if country:   q = q.filter_by(country_code=country)
    if loc_type:  q = q.filter_by(location_type=loc_type)

    locations = q.order_by(WorkLocation.is_primary.desc(), WorkLocation.name).all()
    return jsonify({
        "success": True,
        "count":   len(locations),
        "data":    [l.to_dict() for l in locations]
    })


@org_bp.route("/work-locations", methods=["POST"])
@require_auth
@require_role("super-admin", "hr")
def create_work_location():
    """POST /api/v1/org/work-locations"""
    data = request.get_json()

    wl = WorkLocation(
        tenant_id           = g.tenant_id,
        business_unit_id    = data.get("business_unit_id"),
        code                = data["code"],
        name                = data["name"],
        short_name          = data.get("short_name"),
        description         = data.get("description"),
        location_type       = data.get("location_type", "office"),
        address_line1       = data.get("address_line1"),
        address_line2       = data.get("address_line2"),
        city                = data.get("city"),
        state_province      = data.get("state_province"),
        postal_code         = data.get("postal_code"),
        country_code        = data.get("country_code", "NP"),
        country_name        = data.get("country_name", "Nepal"),
        latitude            = data.get("latitude"),
        longitude           = data.get("longitude"),
        timezone            = data.get("timezone", "Asia/Kathmandu"),
        utc_offset          = data.get("utc_offset", "+05:45"),
        working_days        = data.get("working_days", ["Mon","Tue","Wed","Thu","Fri"]),
        standard_hours      = data.get("standard_hours", 8.0),
        tax_jurisdiction    = data.get("tax_jurisdiction"),
        payroll_rule_set    = data.get("payroll_rule_set"),
        local_minimum_wage  = data.get("local_minimum_wage"),
        minimum_wage_currency= data.get("minimum_wage_currency", "NPR"),
        labour_office_zone  = data.get("labour_office_zone"),
        supports_remote     = data.get("supports_remote", False),
        supports_hybrid     = data.get("supports_hybrid", False),
        max_capacity        = data.get("max_capacity"),
        has_canteen         = data.get("has_canteen", False),
        has_medical         = data.get("has_medical", False),
        has_parking         = data.get("has_parking", False),
        is_primary          = data.get("is_primary", False),
        applicable_laws     = data.get("applicable_laws", {"nepal_labour_act": True}),
        created_by          = g.employee_id,
    )

    db_session.add(wl)
    db_session.commit()

    return jsonify({"success": True, "data": wl.to_dict()}), 201


# ============================================================
# SECTION G: ORG TREE & ANALYTICS
# ============================================================

@org_bp.route("/tree", methods=["GET"])
@require_auth
def org_tree():
    """
    GET /api/v1/org/tree
    Returns the full org hierarchy as a nested tree.
    Used by the UI org chart component.
    """
    bus = db_session.query(BusinessUnit).filter_by(
        tenant_id=g.tenant_id, is_active=True,
        parent_bu_id=None
    ).order_by(BusinessUnit.hierarchy_level).all()

    def build_tree(bu):
        node = bu.to_dict()
        node["type"]     = "business_unit"
        node["children"] = []

        # Add departments
        for dept in bu.departments:
            if not dept.is_active:
                continue
            dept_node = dept.to_dict()
            dept_node["type"]     = "department"
            dept_node["children"] = []

            # Add sections
            for section in dept.sections:
                if not section.is_active:
                    continue
                sec_node = section.to_dict()
                sec_node["type"]     = "section"
                sec_node["children"] = []
                dept_node["children"].append(sec_node)

            # Add teams
            for team in dept.teams:
                if team.status != "active":
                    continue
                team_node = team.to_dict(include_members=False)
                team_node["type"] = "team"
                dept_node["children"].append(team_node)

            node["children"].append(dept_node)

        # Child BUs
        for child_bu in bu.children_bus:
            if child_bu.is_active:
                node["children"].append(build_tree(child_bu))

        return node

    tree = [build_tree(bu) for bu in bus]

    return jsonify({
        "success": True,
        "tree":    tree,
        "meta": {
            "total_bus":       db_session.query(BusinessUnit).filter_by(
                tenant_id=g.tenant_id, is_active=True).count(),
            "total_depts":     db_session.query(Department).filter_by(
                tenant_id=g.tenant_id, is_active=True).count(),
            "total_sections":  db_session.query(SectionUnit).filter_by(
                tenant_id=g.tenant_id, is_active=True).count(),
            "total_teams":     db_session.query(Team).filter_by(
                tenant_id=g.tenant_id, status="active").count(),
            "total_ccs":       db_session.query(CostCenter).filter_by(
                tenant_id=g.tenant_id, is_active=True).count(),
            "total_locations": db_session.query(WorkLocation).filter_by(
                tenant_id=g.tenant_id, is_active=True).count(),
        }
    })


@org_bp.route("/analytics", methods=["GET"])
@require_auth
@require_role("super-admin", "hr", "executive")
def org_analytics():
    """
    GET /api/v1/org/analytics
    AI-powered org health analytics dashboard.
    """
    # Headcount by dept
    depts = db_session.query(Department).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).all()

    dept_data = [{
        "name":    d.name,
        "code":    d.code,
        "headcount": d.current_headcount,
        "budget_headcount": d.headcount_budget or 0,
        "utilization": round(
            d.current_headcount * 100 / d.headcount_budget, 1
        ) if d.headcount_budget else 0
    } for d in depts]

    # Cost center summary
    ccs = db_session.query(CostCenter).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).all()

    total_budget = sum(float(cc.annual_budget or 0) for cc in ccs)
    total_actual = sum(float(cc.ytd_actual or 0) for cc in ccs)

    # Location summary
    locations = db_session.query(WorkLocation).filter_by(
        tenant_id=g.tenant_id, is_active=True
    ).all()

    loc_by_type = {}
    for loc in locations:
        loc_by_type[loc.location_type] = loc_by_type.get(loc.location_type, 0) + 1

    return jsonify({
        "success": True,
        "analytics": {
            "headcount_by_dept":    dept_data,
            "total_headcount":      sum(d["headcount"] for d in dept_data),
            "cost_center_summary": {
                "total_budget":     total_budget,
                "total_actual":     total_actual,
                "variance":         total_budget - total_actual,
                "utilization_pct":  round(total_actual * 100 / total_budget, 1)
                                    if total_budget else 0
            },
            "location_breakdown":   loc_by_type,
            "total_locations":      len(locations),
        }
    })
