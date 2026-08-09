"""
FILE: backend/routes/business_unit_routes.py
REST API — Business Unit / Division Setup
URL prefix: /api/v1/business-units
Full CRUD + AI insights + Excel import.
"""
from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import func, text
from datetime import datetime, date
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..middleware.tenant import apply_tenant_scope
from ..utils.pagination import paginate, success, error, created, not_found, apply_search, apply_sort, apply_filters
from ..utils.excel_import import parse_excel_upload, build_template_xlsx

bu_bp = Blueprint("business_units", __name__, url_prefix="/api/v1/business-units")


def _get_bu():
    from ..models.org_models import BusinessUnit
    return BusinessUnit


def _bu_dict(bu) -> dict:
    return {
        "id": str(bu.id), "company_id": str(bu.company_id) if bu.company_id else None,
        "parent_bu_id": str(bu.parent_bu_id) if bu.parent_bu_id else None,
        "code": bu.code, "name": bu.name, "name_nepali": bu.name_nepali,
        "description": bu.description, "bu_type": bu.bu_type,
        "is_profit_center": bu.is_profit_center,
        "revenue_target": float(bu.revenue_target) if bu.revenue_target else None,
        "budget_allocated": float(bu.budget_allocated) if bu.budget_allocated else None,
        "budget_utilized": float(bu.budget_utilized or 0),
        "headcount_target": bu.headcount_target, "headcount_actual": bu.headcount_actual,
        "manager_id": str(bu.manager_id) if bu.manager_id else None,
        "established_date": str(bu.established_date) if bu.established_date else None,
        "status": bu.status,
        "ai_bu_score": bu.ai_bu_score, "ai_insights": bu.ai_insights or {},
        "created_at": str(bu.created_at),
    }


@bu_bp.get("/")
@require_auth
def list_bus():
    BU = _get_bu()
    q = apply_tenant_scope(db.session.query(BU), BU)
    q = apply_search(q, BU, ["name", "name_nepali", "code"])
    q = apply_filters(q, BU, ["status", "bu_type", "is_profit_center"])
    q = apply_sort(q, BU, ["name", "code", "headcount_actual", "budget_allocated"])
    items, meta = paginate(q)
    result = []
    for bu in items:
        d = _bu_dict(bu)
        # dept count
        d["departments_count"] = db.session.execute(text(
            "SELECT COUNT(*) FROM departments WHERE business_unit_id = :bid AND NOT is_deleted"
        ), {"bid": str(bu.id)}).scalar()
        d["budget_utilization_pct"] = (
            round(float(bu.budget_utilized or 0) / float(bu.budget_allocated) * 100, 1)
            if bu.budget_allocated else 0
        )
        result.append(d)
    return success(result, meta=meta)


@bu_bp.post("/")
@require_auth
@require_role("super_admin", "hr_manager")
def create_bu():
    BU = _get_bu()
    body = request.get_json() or {}
    if not body.get("code") or not body.get("name"):
        return error("code and name are required", 422)
    exists = db.session.query(BU).filter_by(
        company_id=g.company_id, code=body["code"], is_deleted=False
    ).first()
    if exists:
        return error(f"Business Unit code '{body['code']}' already exists", 409)
    bu = BU(
        company_id       = g.company_id,
        parent_bu_id     = body.get("parent_bu_id"),
        code             = body["code"].upper().strip(),
        name             = body["name"].strip(),
        name_nepali      = body.get("name_nepali"),
        description      = body.get("description"),
        bu_type          = body.get("bu_type", "business_unit"),
        is_profit_center = body.get("is_profit_center", False),
        revenue_target   = body.get("revenue_target"),
        budget_allocated = body.get("budget_allocated"),
        headcount_target = body.get("headcount_target"),
        manager_id       = body.get("manager_id"),
        established_date = date.fromisoformat(body["established_date"]) if body.get("established_date") else None,
        created_by       = g.user_id,
    )
    db.session.add(bu)
    db.session.commit()
    return created(_bu_dict(bu))


@bu_bp.get("/<bu_id>")
@require_auth
def get_bu(bu_id):
    BU = _get_bu()
    bu = db.session.query(BU).filter_by(id=bu_id, company_id=g.company_id, is_deleted=False).first()
    if not bu: return not_found("Business Unit")
    d = _bu_dict(bu)
    d["departments"] = db.session.execute(text("""
        SELECT id::TEXT, name, code, headcount_actual, status
        FROM departments
        WHERE business_unit_id = :bid AND NOT is_deleted
        ORDER BY name
    """), {"bid": bu_id}).mappings().all()
    d["budget_utilization_pct"] = (
        round(float(bu.budget_utilized or 0) / float(bu.budget_allocated) * 100, 1)
        if bu.budget_allocated else 0
    )
    return success(d)


@bu_bp.put("/<bu_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_bu(bu_id):
    BU = _get_bu()
    bu = db.session.query(BU).filter_by(id=bu_id, company_id=g.company_id, is_deleted=False).first()
    if not bu: return not_found("Business Unit")
    body = request.get_json() or {}
    for k in ["name", "name_nepali", "description", "bu_type", "is_profit_center",
               "revenue_target", "budget_allocated", "budget_utilized",
               "headcount_target", "headcount_actual", "manager_id", "status", "ai_insights"]:
        if k in body: setattr(bu, k, body[k])
    bu.updated_at = datetime.utcnow()
    db.session.commit()
    return success(_bu_dict(bu))


@bu_bp.delete("/<bu_id>")
@require_auth
@require_role("super_admin")
def delete_bu(bu_id):
    BU = _get_bu()
    bu = db.session.query(BU).filter_by(id=bu_id, company_id=g.company_id, is_deleted=False).first()
    if not bu: return not_found("Business Unit")
    dept_count = db.session.execute(text(
        "SELECT COUNT(*) FROM departments WHERE business_unit_id = :bid AND NOT is_deleted"
    ), {"bid": bu_id}).scalar()
    if dept_count > 0:
        return error(f"Cannot delete: {dept_count} active department(s) linked to this BU.", 409)
    bu.is_deleted = True
    bu.deleted_at = datetime.utcnow()
    db.session.commit()
    return success({"deleted": True, "id": bu_id})


@bu_bp.get("/<bu_id>/summary")
@require_auth
def bu_summary(bu_id):
    """Full BU summary — headcount, budget, departments."""
    rows = db.session.execute(text("""
        SELECT
            d.name            AS dept_name,
            d.headcount_actual,
            d.headcount_target,
            d.annual_budget,
            d.budget_utilized,
            d.status,
            d.cba_applicable
        FROM departments d
        WHERE d.business_unit_id = :bid AND NOT d.is_deleted
        ORDER BY d.name
    """), {"bid": bu_id}).mappings().all()
    return success({"bu_id": bu_id, "departments": [dict(r) for r in rows],
                    "total_headcount": sum(r["headcount_actual"] or 0 for r in rows)})


@bu_bp.post("/<bu_id>/ai-insight")
@require_auth
def bu_ai_insight(bu_id):
    """Trigger AI analysis for this BU."""
    from ..ai.insights import generate_ai_insights
    BU = _get_bu()
    bu = db.session.query(BU).filter_by(id=bu_id, company_id=g.company_id).first()
    if not bu: return not_found("Business Unit")
    insight = generate_ai_insights({
        "type": "business_unit", "name": bu.name, "bu_type": bu.bu_type,
        "headcount_actual": bu.headcount_actual, "headcount_target": bu.headcount_target,
        "budget_allocated": float(bu.budget_allocated or 0),
        "budget_utilized": float(bu.budget_utilized or 0),
        "is_profit_center": bu.is_profit_center,
    })
    bu.ai_insights = insight
    bu.ai_bu_score = insight.get("ai_confidence")
    db.session.commit()
    return success({"bu_id": bu_id, "insights": insight})


@bu_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files:
        return error("No file provided", 400)
    result = parse_excel_upload(request.files["file"], "business_unit")
    return jsonify(result), 200 if result["success"] else 422


@bu_bp.get("/excel-template")
@require_auth
def excel_template():
    xlsx = build_template_xlsx("business_unit")
    if not xlsx:
        return error("openpyxl not installed", 500)
    return send_file(io.BytesIO(xlsx),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="business_unit_template.xlsx")
