"""
FILE: backend/routes/okr_management_routes.py
NepHR Pro — Performance & Talent Management > Goal & Performance >
Goal Management > OKR Management (1 page)
URL prefix: /api/v1/okr-management

Self-referencing cascade tree (Company->Department->Team->Individual),
0.0-1.0 scoring with live aggregation from key results up to the parent
objective, weekly check-ins, peer praise. Reuses transaction_notifications
(built in kra_management_routes.py) -- no duplicate mechanism.

Nepal Labour Act 2074 Section 112: evaluation basis must be communicated
BEFORE the period starts; post-evaluation discussion mandatory; employee
has right to note disagreement and trigger review; 3 consecutive
unsatisfactory cycles = termination grounds with 7-day explanation right.
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

okr_bp = Blueprint("okr_management", __name__, url_prefix="/api/v1/okr-management")


# ════════════════════════════════════════════════════════════════
# OBJECTIVES (cascade tree)
# ════════════════════════════════════════════════════════════════

@okr_bp.get("")
@require_auth
def list_okrs():
    quarter = request.args.get("quarter_label")
    level = request.args.get("level")
    try:
        q = "SELECT * FROM v_okr_tree_dashboard WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if quarter: q += " AND quarter_label = :quarter"; params["quarter"] = quarter
        if level: q += " AND level = :level"; params["level"] = level
        q += " ORDER BY parent_okr_id NULLS FIRST"
        rows = db.session.execute(text(q), params).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "okrs": data,
            "avg_score": round(sum(float(r["overall_score"] or 0) for r in data) / max(len(data), 1), 2),
            "at_risk_count": sum(1 for r in data if r["status"] in ("at_risk", "off_track")),
        })
    except Exception:
        return success({"okrs": [], "avg_score": 0, "at_risk_count": 0})


@okr_bp.post("")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_okr():
    """
    Creates the objective + 2-3 key results in one call. Per Section 112,
    criteria_communicated_at should be set explicitly here, before publish.
    """
    body = request.get_json() or {}
    required = ["objective_text", "quarter_label", "key_results"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if len(body["key_results"]) < 1 or len(body["key_results"]) > 5:
        return error("Provide 2-3 key results (best practice); maximum 5.", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO okr_objectives
              (company_id, parent_okr_id, level, department_id, employee_id, objective_text,
               quarter_label, fiscal_year_label, criteria_communicated_at, created_by, created_at)
            VALUES
              (:cid, :parent, :level, :dept, :eid, :objective,
               :quarter, :fy, NOW(), :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "parent": body.get("parent_okr_id"), "level": body.get("level", "individual"),
            "dept": body.get("department_id"), "eid": body.get("employee_id"), "objective": body["objective_text"],
            "quarter": body["quarter_label"], "fy": body.get("fiscal_year_label"), "user": g.user_id,
        })
        okr_id = str(result.fetchone()[0])

        for kr in body["key_results"]:
            db.session.execute(text("""
                INSERT INTO okr_key_results (okr_objective_id, company_id, kr_text, current_value, target_value, unit, created_at)
                VALUES (:oid, :cid, :text, :current, :target, :unit, NOW())
            """), {"oid": okr_id, "cid": g.company_id, "text": kr["kr_text"], "current": kr.get("current_value", 0),
                   "target": kr["target_value"], "unit": kr.get("unit", "count")})

        db.session.commit()
        return created({"okr_id": okr_id, "key_results_created": len(body["key_results"])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@okr_bp.put("/<okr_id>/publish")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def publish_okr(okr_id):
    """DB trigger notifies the owner + reporting manager via the shared transaction_notifications mechanism."""
    try:
        db.session.execute(text("""
            UPDATE okr_objectives SET publish_status = 'published' WHERE id = :oid AND company_id = :cid AND publish_status = 'draft'
        """), {"oid": okr_id, "cid": g.company_id})
        db.session.commit()
        return success({"published": True, "notified": ["Objective owner", "Reporting manager"]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@okr_bp.put("/key-results/<kr_id>/update-progress")
def update_kr_progress(kr_id):
    """
    Public/ESS — self-service progress slider. DB trigger auto-recomputes
    the parent objective's overall_score and status (the cascade-up aggregation).
    """
    body = request.get_json() or {}
    if body.get("current_value") is None: return error("current_value required", 422)
    try:
        result = db.session.execute(text("""
            UPDATE okr_key_results SET current_value = :value, updated_at = NOW() WHERE id = :krid
            RETURNING score
        """), {"value": body["current_value"], "krid": kr_id})
        row = result.fetchone()
        db.session.commit()
        if not row: return not_found("Key Result")
        return success({"score": float(row[0]) if row[0] else None})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@okr_bp.put("/<okr_id>/disagree")
def file_disagreement(okr_id):
    """
    Public/ESS — implements Section 112's right to note disagreement with
    an evaluation score and trigger a formal review.
    """
    body = request.get_json() or {}
    if not body.get("disagreement_note"): return error("disagreement_note required", 422)
    try:
        db.session.execute(text("""
            UPDATE okr_objectives
               SET employee_disagreement_note = :note, review_requested = TRUE
             WHERE id = :oid
        """), {"note": body["disagreement_note"], "oid": okr_id})
        db.session.commit()
        return success({"review_requested": True, "note": "A formal review has been triggered per company policy."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@okr_bp.get("/pending-reviews")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def pending_reviews():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_okr_pending_reviews WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@okr_bp.put("/<okr_id>/resolve-review")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def resolve_review(okr_id):
    try:
        db.session.execute(text("""
            UPDATE okr_objectives SET review_resolved_at = NOW() WHERE id = :oid AND company_id = :cid
        """), {"oid": okr_id, "cid": g.company_id})
        db.session.commit()
        return success({"resolved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# CHECK-INS & PRAISE
# ════════════════════════════════════════════════════════════════

@okr_bp.post("/<okr_id>/checkin")
def submit_checkin(okr_id):
    """Public/ESS — weekly check-in modal: confidence score, roadblocks, next steps."""
    body = request.get_json() or {}
    required = ["checked_in_by"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO okr_checkins (okr_objective_id, company_id, checked_in_by, confidence_score, roadblocks_note, next_steps_note, checked_in_at)
            VALUES (:oid, :cid, :user, :conf, :roadblocks, :next_steps, NOW())
            RETURNING id
        """), {"oid": okr_id, "cid": body.get("company_id"), "user": body["checked_in_by"],
               "conf": body.get("confidence_score"), "roadblocks": body.get("roadblocks_note"), "next_steps": body.get("next_steps_note")})
        checkin_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"checkin_id": checkin_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@okr_bp.get("/<okr_id>/checkin-history")
def checkin_history(okr_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_okr_checkin_history WHERE okr_objective_id = :oid"
        ), {"oid": okr_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@okr_bp.post("/<okr_id>/praise")
def give_praise(okr_id):
    """Public — lightweight peer recognition, the 'Praise' button."""
    body = request.get_json() or {}
    required = ["given_by"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO okr_praise (okr_objective_id, company_id, given_by, message, created_at)
            VALUES (:oid, :cid, :user, :msg, NOW()) RETURNING id
        """), {"oid": okr_id, "cid": body.get("company_id"), "user": body["given_by"], "msg": body.get("message")})
        praise_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"praise_id": praise_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# HEALTH ALERTS, AI ASSISTANCE & SELF-SERVICE
# ════════════════════════════════════════════════════════════════

@okr_bp.get("/health-alerts")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def health_alerts():
    """At-risk/off-track OKRs -- the traffic-light alert feed."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_okr_health_alerts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@okr_bp.post("/ai-suggest-targets")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_suggest_targets():
    """AI suggests realistic-but-ambitious key result targets based on historical team velocity."""
    body = request.get_json() or {}
    if not body.get("department_id") and not body.get("employee_id"):
        return error("department_id or employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "okr_target_suggestion", "company_id": g.company_id, **body})
        return success({"suggested_key_results": insight.get("suggested_key_results", [])})
    except Exception as e:
        return error(str(e), 500)


@okr_bp.get("/my-okrs/<employee_id>")
def my_okrs(employee_id):
    """Public/ESS — self-service tracker, employee sees their own + cascaded parent OKRs."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_okrs WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@okr_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "okr_management")
    return jsonify(result), 200 if result["success"] else 422


@okr_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("okr_management")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="okr_management_template.xlsx")
