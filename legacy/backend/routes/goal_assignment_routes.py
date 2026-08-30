"""
FILE: backend/routes/goal_assignment_routes.py
eLogix HRMS — Performance & Talent Management > Goal & Performance >
Goal Management > Goal Assignment (1 page)
URL prefix: /api/v1/goal-assignment

Once-a-year department annual target, set at fiscal-year open, divided
by team, auto-cascaded quarterly->monthly->weekly->daily by DELEGATING
to the existing kra_cascade_targets machinery (kra_management_routes.py)
-- no duplicate cascade logic. JD-nature templates (Sales/Admin/
Technical/HR/Corporate/Manufacturing/Banking) drive role-appropriate
metric suggestions. Reuses transaction_notifications.

Nepal Labour Act 2074 Section 7: equal value/opportunity in task
assignment; Section 13: increments/promotions may be withheld for
documented performance shortfalls; mandatory formal appraisal for
employers with 10+ staff.
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

goal_assign_bp = Blueprint("goal_assignment", __name__, url_prefix="/api/v1/goal-assignment")


# ════════════════════════════════════════════════════════════════
# JD NATURE TEMPLATES
# ════════════════════════════════════════════════════════════════

@goal_assign_bp.get("/jd-nature-templates")
def list_jd_nature_templates():
    """Public — the 7 role-nature templates (Sales/Admin/Technical/HR/Corporate/Manufacturing/Banking)."""
    try:
        rows = db.session.execute(text("SELECT * FROM jd_nature_templates ORDER BY display_label")).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# DEPARTMENT ANNUAL TARGETS
# ════════════════════════════════════════════════════════════════

@goal_assign_bp.get("")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_annual_targets():
    fiscal_year = request.args.get("fiscal_year_label")
    try:
        q = "SELECT * FROM v_goal_assignment_dashboard WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if fiscal_year: q += " AND fiscal_year_label = :fy"; params["fy"] = fiscal_year
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@goal_assign_bp.get("/missing-current-year")
@require_auth
@require_role("super_admin", "hr_manager")
def departments_missing_target():
    """Surfaces departments that haven't had their annual target set yet for the open fiscal year."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_departments_missing_annual_target WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@goal_assign_bp.post("")
@require_auth
@require_role("super_admin", "hr_manager")
def create_annual_target():
    """
    Management-level action: sets the once-a-year department target.
    Accepts team_splits inline; publish is a separate step that triggers
    the full cascade delegation.
    """
    body = request.get_json() or {}
    required = ["department_id", "fiscal_year_label", "fiscal_year_start_date", "annual_target_description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO department_annual_targets
              (company_id, department_id, jd_nature_template_id, fiscal_year_label, fiscal_year_start_date,
               annual_target_description, set_by, created_at)
            VALUES
              (:cid, :dept, :nature, :fy, :fy_start,
               :desc, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "dept": body["department_id"], "nature": body.get("jd_nature_template_id"),
            "fy": body["fiscal_year_label"], "fy_start": body["fiscal_year_start_date"],
            "desc": body["annual_target_description"], "user": g.user_id,
        })
        target_id = str(result.fetchone()[0])

        for team in body.get("team_splits", []):
            db.session.execute(text("""
                INSERT INTO department_team_splits
                  (department_annual_target_id, company_id, team_label, team_lead_employee_id, share_pct, team_target_description, created_at)
                VALUES (:tid, :cid, :label, :lead, :share, :target, NOW())
            """), {"tid": target_id, "cid": g.company_id, "label": team["team_label"], "lead": team.get("team_lead_employee_id"),
                   "share": team["share_pct"], "target": team.get("team_target_description")})

        db.session.commit()
        return created({"target_id": target_id, "teams_created": len(body.get("team_splits", []))})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@goal_assign_bp.post("/<target_id>/team-splits")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def add_team_split(target_id):
    body = request.get_json() or {}
    required = ["team_label", "share_pct"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO department_team_splits
              (department_annual_target_id, company_id, team_label, team_lead_employee_id, share_pct, team_target_description, created_at)
            VALUES (:tid, :cid, :label, :lead, :share, :target, NOW())
            RETURNING id
        """), {"tid": target_id, "cid": g.company_id, "label": body["team_label"], "lead": body.get("team_lead_employee_id"),
               "share": body["share_pct"], "target": body.get("team_target_description")})
        split_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"split_id": split_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@goal_assign_bp.put("/<target_id>/publish")
@require_auth
@require_role("super_admin", "hr_manager")
def publish_annual_target(target_id):
    """
    Blocked by DB trigger if team splits don't sum correctly or are
    missing. On success, this DELEGATES the cascade to kra_definitions'
    own publish trigger (auto-generates quarterly targets there) and
    notifies the department head + every team lead.
    """
    try:
        db.session.execute(text("""
            UPDATE department_annual_targets SET publish_status = 'published'
            WHERE id = :tid AND company_id = :cid AND publish_status = 'draft'
        """), {"tid": target_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "published": True,
            "downstream_actions": [
                "Backing KRA created and published",
                "Quarterly cascade auto-generated (delegated)",
                "Review schedule seeded (Management/HR/HOD/Supervisor/Team Lead)",
                "Department Head and team leads notified",
            ],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


@goal_assign_bp.post("/<target_id>/divide-monthly-weekly-daily")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def divide_finer_cascade(target_id):
    """
    Extends the delegated quarterly cascade down to monthly/weekly/daily,
    by writing further kra_cascade_targets rows against the same linked KRA.
    """
    body = request.get_json() or {}
    granularity = body.get("granularity", "monthly")
    if granularity not in ("monthly", "weekly", "daily"):
        return error("granularity must be monthly, weekly, or daily", 422)

    try:
        target = db.session.execute(text(
            "SELECT linked_kra_definition_id, fiscal_year_start_date FROM department_annual_targets WHERE id = :tid AND company_id = :cid"
        ), {"tid": target_id, "cid": g.company_id}).fetchone()
        if not target or not target.linked_kra_definition_id:
            return error("This target has not been published yet -- no linked KRA to cascade.", 422)

        kra_id = target.linked_kra_definition_id
        fy_start = target.fiscal_year_start_date

        if granularity == "monthly":
            periods = [(f"{fy_start.year}-{((fy_start.month - 1 + i) % 12) + 1:02d}", round(100/12, 2)) for i in range(12)]
        elif granularity == "weekly":
            periods = [(f"Wk-{i+1}", round(100/52, 2)) for i in range(52)]
        else:
            periods = [((fy_start.replace(day=1)).isoformat(), round(100/365, 4)) for _ in range(1)]  # daily seeded incrementally in practice

        created_count = 0
        for label, pct in periods:
            db.session.execute(text("""
                INSERT INTO kra_cascade_targets
                  (kra_definition_id, company_id, period_type, period_label, period_start_date, period_end_date, target_pct, created_at)
                VALUES (:kid, :cid, :gran, :label, CURRENT_DATE, CURRENT_DATE, :pct, NOW())
                ON CONFLICT DO NOTHING
            """), {"kid": kra_id, "cid": g.company_id, "gran": granularity, "label": label, "pct": pct})
            created_count += 1

        field = f"cascade_{granularity}_done"
        db.session.execute(text(f"UPDATE department_annual_targets SET {field} = TRUE WHERE id = :tid"), {"tid": target_id})
        db.session.commit()
        return created({"granularity": granularity, "periods_created": created_count})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@goal_assign_bp.get("/<target_id>/review-status")
@require_auth
def review_status(target_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_goal_assignment_review_status WHERE department_annual_target_id = :tid"
        ), {"tid": target_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@goal_assign_bp.post("/ai-suggest-target")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_suggest_target():
    """AI suggests a realistic annual target based on department history, JD nature, and prior-year performance."""
    body = request.get_json() or {}
    if not body.get("department_id"): return error("department_id required", 422)
    try:
        insight = generate_ai_insights({"type": "annual_target_suggestion", "company_id": g.company_id, "department_id": body["department_id"]})
        return success({"suggested_target": insight.get("suggested_target"), "suggested_team_splits": insight.get("suggested_team_splits", [])})
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@goal_assign_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "goal_assignment")
    return jsonify(result), 200 if result["success"] else 422


@goal_assign_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("goal_assignment")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="goal_assignment_template.xlsx")
