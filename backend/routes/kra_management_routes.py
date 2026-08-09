"""
FILE: backend/routes/kra_management_routes.py
NepHR Pro — Performance & Talent Management > Goal & Performance >
Goal Management > KRA Management (1 page)
URL prefix: /api/v1/kra-management

KRA-JD matching engine, department->team->quarterly->monthly->weekly->
daily cascade, review-cadence matrix (Management/HR/HOD/Supervisor/Team
Lead), and the general-purpose transaction_notifications mechanism that
notifies linked parties + their reporting chain on every KRA publish.

Nepal Labour Act 2074 Section 112: annual performance evaluation
standard; Rule 63: records retained 3+ years; Section 142: 3 consecutive
unsatisfactory evaluations = termination grounds with 7-day explanation right.
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

kra_bp = Blueprint("kra_management", __name__, url_prefix="/api/v1/kra-management")


# ════════════════════════════════════════════════════════════════
# KRA DEFINITIONS + JD MATCHING
# ════════════════════════════════════════════════════════════════

@kra_bp.get("")
@require_auth
def list_kras():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_kra_jd_match_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "kras": data,
            "avg_jd_match_pct": round(sum(float(r["jd_match_pct"] or 0) for r in data) / max(len(data), 1), 1),
            "gaps_found": sum(1 for r in data if (r["jd_match_pct"] or 100) < 100),
        })
    except Exception:
        return success({"kras": [], "avg_jd_match_pct": 0, "gaps_found": 0})


@kra_bp.post("")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_kra():
    body = request.get_json() or {}
    required = ["kra_title", "weightage_pct"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO kra_definitions
              (company_id, designation_id, department_id, employee_id, kra_title, description,
               weightage_pct, cascade_level, fiscal_year_label, annual_target_description, created_by, created_at)
            VALUES
              (:cid, :desig, :dept, :eid, :title, :desc,
               :weight, :cascade, :fy, :target_desc, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "desig": body.get("designation_id"), "dept": body.get("department_id"),
            "eid": body.get("employee_id"), "title": body["kra_title"], "desc": body.get("description"),
            "weight": body["weightage_pct"], "cascade": body.get("cascade_level", "individual"),
            "fy": body.get("fiscal_year_label"), "target_desc": body.get("annual_target_description"), "user": g.user_id,
        })
        kra_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"kra_id": kra_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kra_bp.post("/<kra_id>/jd-links")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def link_jd_responsibility(kra_id):
    """Links this KRA to a specific JD responsibility line item -- the core matching action."""
    body = request.get_json() or {}
    required = ["jd_responsibility_text"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO kra_jd_links (kra_definition_id, company_id, jd_responsibility_text, jd_responsibility_index, created_at)
            VALUES (:kid, :cid, :text, :idx, NOW())
            RETURNING id
        """), {"kid": kra_id, "cid": g.company_id, "text": body["jd_responsibility_text"], "idx": body.get("jd_responsibility_index")})
        link_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"link_id": link_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kra_bp.get("/jd-gaps")
@require_auth
@require_role("super_admin", "hr_manager")
def jd_uncovered_responsibilities():
    """The gap-finder: JD responsibility lines with no linked KRA -- per the brief's matching requirement."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_jd_responsibilities_uncovered WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@kra_bp.put("/<kra_id>/publish")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def publish_kra(kra_id):
    """
    DB triggers auto-generate the quarterly cascade (25% each) and the
    review schedule (Management/HR/HOD/Supervisor/Team Lead), and notify
    the position holder + reporting manager.
    """
    try:
        db.session.execute(text("""
            UPDATE kra_definitions SET status = 'published' WHERE id = :kid AND company_id = :cid AND status = 'draft'
        """), {"kid": kra_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "published": True,
            "downstream_actions": ["Quarterly cascade auto-generated", "Review schedule seeded", "Linked parties notified"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kra_bp.post("/ai-suggest")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_suggest_kra():
    """AI reviews the position's JD + department objectives to propose SMART KRA drafts."""
    body = request.get_json() or {}
    if not body.get("designation_id"): return error("designation_id required", 422)
    try:
        insight = generate_ai_insights({"type": "kra_smart_draft_suggestion", "designation_id": body["designation_id"], "company_id": g.company_id})
        return success({"suggested_kras": insight.get("suggested_kras", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# CASCADE TARGETS (quarterly -> monthly -> weekly -> daily)
# ════════════════════════════════════════════════════════════════

@kra_bp.get("/<kra_id>/cascade")
@require_auth
def get_cascade(kra_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM kra_cascade_targets WHERE kra_definition_id = :kid ORDER BY period_start_date"
        ), {"kid": kra_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@kra_bp.post("/<kra_id>/cascade/divide-to-teams")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def divide_cascade_to_teams(kra_id):
    """
    Brief: "divide in the team of the department or group to the target."
    Splits a department-level quarterly target across team_assignments,
    weighted equally unless custom shares are provided.
    """
    body = request.get_json() or {}
    teams = body.get("team_assignments", [])  # [{"team_id": ..., "share_pct": ...}]
    if not teams: return error("team_assignments array required", 422)
    try:
        cascades = db.session.execute(text(
            "SELECT id, target_pct FROM kra_cascade_targets WHERE kra_definition_id = :kid AND period_type = 'quarterly'"
        ), {"kid": kra_id}).fetchall()

        equal_share = round(100 / len(teams), 2)
        for c in cascades:
            for t in teams:
                share = t.get("share_pct", equal_share)
                db.session.execute(text("""
                    INSERT INTO kra_cascade_targets
                      (kra_definition_id, company_id, period_type, period_label, period_start_date, period_end_date,
                       target_pct, assigned_team_id, team_share_pct, created_at)
                    SELECT :kid, :cid, period_type, period_label || '-' || :team_suffix, period_start_date, period_end_date,
                           target_pct * :share / 100, :team_id, :share, NOW()
                    FROM kra_cascade_targets WHERE id = :cascade_id
                    ON CONFLICT DO NOTHING
                """), {"kid": kra_id, "cid": g.company_id, "team_suffix": t["team_id"][:8], "share": share,
                       "team_id": t["team_id"], "cascade_id": c.id})
        db.session.commit()
        return created({"divided_to_teams": len(teams)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kra_bp.put("/cascade/<cascade_id>/update-progress")
def update_cascade_progress(cascade_id):
    """Public/ESS — self-service progress tracking against the cascaded target."""
    body = request.get_json() or {}
    if body.get("achieved_pct") is None: return error("achieved_pct required", 422)
    try:
        db.session.execute(text("""
            UPDATE kra_cascade_targets SET achieved_pct = :pct WHERE id = :cid
        """), {"pct": body["achieved_pct"], "cid": cascade_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kra_bp.get("/cascade-progress")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def cascade_progress_rollup():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_kra_cascade_progress WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# REVIEW SCHEDULE (Management/HR/HOD/Supervisor/Team Lead cadence)
# ════════════════════════════════════════════════════════════════

@kra_bp.get("/<kra_id>/review-schedule")
@require_auth
def get_review_schedule(kra_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM kra_review_schedule WHERE kra_definition_id = :kid"
        ), {"kid": kra_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@kra_bp.put("/review-schedule/<schedule_id>/mark-reviewed")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def mark_reviewed(schedule_id):
    try:
        db.session.execute(text("""
            UPDATE kra_review_schedule SET last_reviewed_at = NOW(), last_reviewed_by = :user WHERE id = :sid AND company_id = :cid
        """), {"user": g.user_id, "sid": schedule_id, "cid": g.company_id})
        db.session.commit()
        return success({"reviewed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@kra_bp.get("/reviews-due")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reviews_due_soon():
    """Feeds the automatic-reminder workflow per the brief's requirement."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_kra_reviews_due WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# TRANSACTION NOTIFICATIONS (reusable mechanism)
# ════════════════════════════════════════════════════════════════

@kra_bp.get("/my-notifications/<employee_id>")
def my_notifications(employee_id):
    """Public/ESS — every linked party + their reporting chain sees transaction notifications here."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM transaction_notifications WHERE recipient_employee_id = :eid ORDER BY created_at DESC LIMIT 50"
        ), {"eid": employee_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({"notifications": data, "unread_count": sum(1 for n in data if not n["is_read"])})
    except Exception:
        return success({"notifications": [], "unread_count": 0})


@kra_bp.put("/notifications/<notification_id>/mark-read")
def mark_notification_read(notification_id):
    try:
        db.session.execute(text("""
            UPDATE transaction_notifications SET is_read = TRUE, read_at = NOW() WHERE id = :nid
        """), {"nid": notification_id})
        db.session.commit()
        return success({"marked_read": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@kra_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "kra_management")
    return jsonify(result), 200 if result["success"] else 422


@kra_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("kra_management")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="kra_management_template.xlsx")
