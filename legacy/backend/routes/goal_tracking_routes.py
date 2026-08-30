"""
FILE: backend/routes/goal_tracking_routes.py
eLogix HRMS — Performance & Talent Management > Goal & Performance >
Goal Management > Goal Tracking (1 page)
URL prefix: /api/v1/goal-tracking

THE UNIFIED ROLLUP across KRA + KPI + OKR + Goal Assignment -- a single
pane of glass via v_unified_goal_tracking (UNION ALL of the four
existing dashboards). 30/60/90-day automated reminders, polymorphic
check-ins, and a Labour-Office-defensible audit trail.

Nepal Labour Act 2074 Section 52(1): employer may terminate for
unsatisfactory performance on 3+ occasions, but must conduct formal
appraisal + allow 7 days written explanation first -- audit logs serve
as primary evidence. Electronic Transactions Act 2063: digital goal-
tracking matrices carry the same legal weight as paper documents.
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

goal_track_bp = Blueprint("goal_tracking", __name__, url_prefix="/api/v1/goal-tracking")


# ════════════════════════════════════════════════════════════════
# UNIFIED ROLLUP
# ════════════════════════════════════════════════════════════════

@goal_track_bp.get("")
@require_auth
def unified_dashboard():
    """The page's main data source: KRA + KPI + OKR + Assignment in one feed."""
    goal_type = request.args.get("goal_type")
    try:
        q = "SELECT * FROM v_unified_goal_tracking WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if goal_type and goal_type != "all": q += " AND goal_type = :gtype"; params["gtype"] = goal_type
        rows = db.session.execute(text(q), params).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "goals": data,
            "avg_progress_pct": round(sum(float(r["progress_pct"] or 0) for r in data) / max(len(data), 1), 1),
            "at_risk_count": sum(1 for r in data if r["status"] in ("at_risk", "off_track")),
        })
    except Exception:
        return success({"goals": [], "avg_progress_pct": 0, "at_risk_count": 0})


@goal_track_bp.get("/my-goals/<employee_id>")
def my_goals(employee_id):
    """Public/ESS — self-service unified view: every goal this employee owns, regardless of type."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_unified_goal_tracking WHERE owner_ref = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@goal_track_bp.get("/health-alerts")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def health_alerts():
    """Unified at-risk/off-track feed across all 4 goal types."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_goal_tracking_health_alerts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@goal_track_bp.get("/overdue-checkins")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def overdue_checkins():
    """Goals with no activity in 10+ days -- the auto-flag feed."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_goal_tracking_overdue_checkins WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# CHECK-INS (polymorphic, covers KRA/KPI/Assignment; OKR uses its own
# richer okr_checkins table directly)
# ════════════════════════════════════════════════════════════════

@goal_track_bp.post("/checkin")
def quick_checkin():
    """Public/ESS — one-click check-in across any goal type. DB trigger logs to the audit trail automatically."""
    body = request.get_json() or {}
    required = ["goal_type", "goal_record_id", "checked_in_by"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    if body["goal_type"] not in ("kra", "kpi", "assignment"):
        return error("goal_type must be kra, kpi, or assignment (OKR uses its dedicated check-in endpoint)", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO goal_checkin_log (company_id, goal_type, goal_record_id, checked_in_by, progress_note, checked_in_at)
            VALUES (:cid, :gtype, :grid, :user, :note, NOW())
            RETURNING id
        """), {"cid": body.get("company_id"), "gtype": body["goal_type"], "grid": body["goal_record_id"],
               "user": body["checked_in_by"], "note": body.get("progress_note")})
        checkin_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"checkin_id": checkin_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# AUDIT TRAIL (Labour Office defensibility, Section 52(1))
# ════════════════════════════════════════════════════════════════

@goal_track_bp.get("/audit-trail/<goal_type>/<goal_record_id>")
@require_auth
def goal_audit_trail(goal_type, goal_record_id):
    """Full edit/approval/check-in history for one goal -- evidentiary trail."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_goal_audit_trail_detail WHERE goal_type = :gtype AND goal_record_id = :grid"
        ), {"gtype": goal_type, "grid": goal_record_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@goal_track_bp.post("/audit-trail")
@require_auth
def log_manual_audit_entry():
    """For actions not auto-captured by DB triggers (e.g. manager note, approval comment)."""
    body = request.get_json() or {}
    required = ["goal_type", "goal_record_id", "action_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO goal_audit_trail (company_id, goal_type, goal_record_id, action_type, actor_employee_id, field_changed, old_value, new_value, note, occurred_at)
            VALUES (:cid, :gtype, :grid, :atype, :actor, :field, :old, :new, :note, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "gtype": body["goal_type"], "grid": body["goal_record_id"], "atype": body["action_type"],
            "actor": g.user_id, "field": body.get("field_changed"), "old": body.get("old_value"),
            "new": body.get("new_value"), "note": body.get("note"),
        })
        entry_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"audit_entry_id": entry_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# REMINDER CONFIG (30/60/90-day automated nudges)
# ════════════════════════════════════════════════════════════════

@goal_track_bp.get("/reminder-config")
@require_auth
@require_role("super_admin", "hr_manager")
def list_reminder_config():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM goal_reminder_config WHERE company_id = :cid AND is_active"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@goal_track_bp.put("/reminder-config/<config_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_reminder_config(config_id):
    body = request.get_json() or {}
    if "is_active" not in body: return error("is_active required", 422)
    try:
        db.session.execute(text("""
            UPDATE goal_reminder_config SET is_active = :active WHERE id = :cid AND company_id = :company
        """), {"active": body["is_active"], "cid": config_id, "company": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@goal_track_bp.post("/ai-predict-completion")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_predict_completion():
    """AI predicts whether a goal will hit its target by deadline based on current velocity."""
    body = request.get_json() or {}
    required = ["goal_type", "goal_record_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        insight = generate_ai_insights({"type": "goal_completion_prediction", **body})
        return success({
            "predicted_completion_pct": insight.get("predicted_completion_pct"),
            "likely_to_miss_deadline": insight.get("likely_to_miss_deadline", False),
            "recommendation": insight.get("recommendation"),
        })
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@goal_track_bp.get("/excel-export")
@require_auth
def excel_export():
    """Exports the full unified goal tracking view for offline reporting."""
    b = build_template_xlsx("goal_tracking_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="goal_tracking_export.xlsx")
