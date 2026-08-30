"""
FILE: backend/routes/pms_360_routes.py
eLogix HRMS — Performance & Talent Management > Goal & Performance >
Goal Management > 360 Degree PMS (1 page)
URL prefix: /api/v1/pms-360

Competency radar, Feedback Hub (incoming/outgoing), Individual
Development Plan, HR calibration dashboard, anonymity-threshold gate
(min 3 reviewers per anonymous category before release). Reuses
transaction_notifications -- no duplicate mechanism.

Nepal Labour Act 2074 Section 112: evaluation basis must be communicated
before the period starts; post-evaluation discussion mandatory.
Individual Privacy Act 2018: explicit consent before processing.
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

pms360_bp = Blueprint("pms_360", __name__, url_prefix="/api/v1/pms-360")

MIN_REVIEWERS_FOR_ANONYMITY = 3


# ════════════════════════════════════════════════════════════════
# COMPETENCIES
# ════════════════════════════════════════════════════════════════

@pms360_bp.get("/competencies")
def list_competencies():
    """Public — the radar chart's axes."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM pms_360_competencies WHERE company_id = :cid AND is_active ORDER BY display_order"
        ), {"cid": g.company_id if hasattr(g, "company_id") else request.args.get("company_id")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@pms360_bp.post("/competencies")
@require_auth
@require_role("super_admin", "hr_manager")
def create_competency():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO pms_360_competencies (company_id, name, description, display_order, created_at)
            VALUES (:cid, :name, :desc, :order, NOW())
            ON CONFLICT (company_id, name) DO NOTHING
            RETURNING id
        """), {"cid": g.company_id, "name": body["name"], "desc": body.get("description"), "order": body.get("display_order", 0)})
        row = result.fetchone()
        db.session.commit()
        if not row: return success({"message": "Competency already exists."})
        return created({"competency_id": str(row[0])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# CYCLES & EVALUATORS
# ════════════════════════════════════════════════════════════════

@pms360_bp.post("/cycles")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_cycle():
    """
    DB trigger notifies the reviewee + reporting manager. Per Section
    112, criteria_communicated_at should be set here, before the period starts.
    """
    body = request.get_json() or {}
    required = ["employee_id", "cycle_label", "cycle_start_date", "cycle_end_date", "evaluators"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    evaluators = body["evaluators"]  # [{"evaluator_employee_id": ..., "relationship": "peer"}]
    anon_relationships = ["peer", "direct_report"]
    for rel in anon_relationships:
        count = sum(1 for e in evaluators if e["relationship"] == rel)
        if 0 < count < MIN_REVIEWERS_FOR_ANONYMITY:
            return error(f"At least {MIN_REVIEWERS_FOR_ANONYMITY} '{rel}' evaluators are required to protect anonymity, or zero.", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO pms_360_cycles
              (company_id, employee_id, cycle_label, cycle_start_date, cycle_end_date,
               criteria_communicated_at, employee_consent_obtained, min_reviewers_for_anonymity, created_by, created_at)
            VALUES
              (:cid, :eid, :label, :start, :end,
               NOW(), :consent, :min_rev, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "label": body["cycle_label"],
            "start": body["cycle_start_date"], "end": body["cycle_end_date"], "consent": body.get("employee_consent_obtained", False),
            "min_rev": body.get("min_reviewers_for_anonymity", MIN_REVIEWERS_FOR_ANONYMITY), "user": g.user_id,
        })
        cycle_id = str(result.fetchone()[0])

        for ev in evaluators:
            db.session.execute(text("""
                INSERT INTO pms_360_evaluators (pms_360_cycle_id, company_id, evaluator_employee_id, relationship, created_at)
                VALUES (:cid, :company, :eid, :rel, NOW())
                ON CONFLICT (pms_360_cycle_id, evaluator_employee_id) DO NOTHING
            """), {"cid": cycle_id, "company": g.company_id, "eid": ev["evaluator_employee_id"], "rel": ev["relationship"]})

        db.session.commit()
        return created({"cycle_id": cycle_id, "evaluators_assigned": len(evaluators)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@pms360_bp.get("/cycles/<cycle_id>/feedback-hub")
def feedback_hub(cycle_id):
    """Public/ESS — split-screen incoming/outgoing view for the page's Feedback Hub tab."""
    try:
        incoming = db.session.execute(text(
            "SELECT * FROM v_pms_360_incoming WHERE pms_360_cycle_id = :cid"
        ), {"cid": cycle_id}).fetchall()
        return success({"incoming": [dict(r._mapping) for r in incoming]})
    except Exception:
        return success({"incoming": []})


@pms360_bp.get("/my-outgoing/<employee_id>")
def my_outgoing(employee_id):
    """Public/ESS — feedback this person owes to others."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pms_360_outgoing WHERE evaluator_employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@pms360_bp.post("/evaluators/<evaluator_id>/submit")
def submit_rating(evaluator_id):
    """
    Public/ESS — evaluator submits their competency scores. DB trigger
    auto-advances the cycle to 'completed' once all evaluators are in.
    """
    body = request.get_json() or {}
    ratings = body.get("ratings", [])  # [{"competency_id": ..., "score": 8, "comment": "..."}]
    if not ratings: return error("ratings array required", 422)
    try:
        for r in ratings:
            db.session.execute(text("""
                INSERT INTO pms_360_ratings (pms_360_evaluator_id, pms_360_competency_id, company_id, score, comment, created_at)
                VALUES (:eval_id, :comp_id, :cid, :score, :comment, NOW())
                ON CONFLICT (pms_360_evaluator_id, pms_360_competency_id) DO UPDATE SET score = EXCLUDED.score, comment = EXCLUDED.comment
            """), {"eval_id": evaluator_id, "comp_id": r["competency_id"], "cid": g.company_id if hasattr(g, "company_id") else None,
                   "score": r["score"], "comment": r.get("comment")})

        db.session.execute(text("""
            UPDATE pms_360_evaluators SET status = 'submitted' WHERE id = :eid AND status = 'pending'
        """), {"eid": evaluator_id})
        db.session.commit()
        return success({"submitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@pms360_bp.put("/cycles/<cycle_id>/release")
@require_auth
@require_role("super_admin", "hr_manager")
def release_cycle(cycle_id):
    """Blocked by DB trigger if anonymous categories are below the reviewer threshold."""
    try:
        db.session.execute(text("""
            UPDATE pms_360_cycles SET status = 'released' WHERE id = :cid AND company_id = :company AND status = 'completed'
        """), {"cid": cycle_id, "company": g.company_id})
        db.session.commit()
        return success({"released": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


@pms360_bp.get("/cycles/<cycle_id>/radar")
def get_radar_data(cycle_id):
    """Public — the competency radar chart's data, released cycles only."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pms_360_radar WHERE cycle_id = :cid"
        ), {"cid": cycle_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@pms360_bp.get("/pending-reminders")
@require_auth
@require_role("super_admin", "hr_manager")
def pending_reminders():
    """Feeds the automatic reminder workflow -- evaluators not reminded in 3+ days."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pms_360_pending_reminders WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@pms360_bp.post("/evaluators/<evaluator_id>/send-reminder")
@require_auth
@require_role("super_admin", "hr_manager")
def send_reminder(evaluator_id):
    try:
        db.session.execute(text("""
            UPDATE pms_360_evaluators SET reminder_count = reminder_count + 1, last_reminded_at = NOW() WHERE id = :eid
        """), {"eid": evaluator_id})
        db.session.commit()
        return success({"reminder_sent": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# INDIVIDUAL DEVELOPMENT PLAN
# ════════════════════════════════════════════════════════════════

@pms360_bp.get("/cycles/<cycle_id>/idp")
def get_idp(cycle_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM pms_360_idp_items WHERE pms_360_cycle_id = :cid"
        ), {"cid": cycle_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@pms360_bp.post("/cycles/<cycle_id>/idp")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_idp_item(cycle_id):
    body = request.get_json() or {}
    required = ["gap_description", "action_plan"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO pms_360_idp_items (pms_360_cycle_id, company_id, gap_description, action_plan, linked_lms_course_id, target_date, created_at)
            VALUES (:cid, :company, :gap, :action, :lms, :target, NOW())
            RETURNING id
        """), {"cid": cycle_id, "company": g.company_id, "gap": body["gap_description"], "action": body["action_plan"],
               "lms": body.get("linked_lms_course_id"), "target": body.get("target_date")})
        idp_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"idp_id": idp_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@pms360_bp.put("/idp/<idp_id>/update-progress")
def update_idp_progress(idp_id):
    """Public/ESS — self-service progress tracking on development goals."""
    body = request.get_json() or {}
    if body.get("progress_pct") is None: return error("progress_pct required", 422)
    try:
        db.session.execute(text("""
            UPDATE pms_360_idp_items SET progress_pct = :pct,
                   completed_at = CASE WHEN :pct >= 100 THEN NOW() ELSE completed_at END
            WHERE id = :iid
        """), {"pct": body["progress_pct"], "iid": idp_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# HR CALIBRATION
# ════════════════════════════════════════════════════════════════

@pms360_bp.get("/calibration")
@require_auth
@require_role("super_admin", "hr_manager")
def calibration_flags():
    """Rater bias dashboard -- flags lenient/strict reviewers vs company average."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pms_360_calibration_flags WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@pms360_bp.post("/calibration/run-analysis")
@require_auth
@require_role("super_admin", "hr_manager")
def run_calibration_analysis():
    """AI computes each reviewer's average rating vs company average and flags bias."""
    body = request.get_json() or {}
    if not body.get("review_period"): return error("review_period required", 422)
    try:
        insight = generate_ai_insights({"type": "rater_calibration_analysis", "company_id": g.company_id, "review_period": body["review_period"]})
        results = insight.get("results", [])
        for r in results:
            db.session.execute(text("""
                INSERT INTO pms_360_calibration (company_id, reviewer_employee_id, review_period, avg_rating_given, company_avg_rating, bias_flag, computed_at)
                VALUES (:cid, :rid, :period, :avg, :company_avg, :flag, NOW())
                ON CONFLICT (reviewer_employee_id, review_period) DO UPDATE
                  SET avg_rating_given = EXCLUDED.avg_rating_given, bias_flag = EXCLUDED.bias_flag
            """), {"cid": g.company_id, "rid": r["reviewer_employee_id"], "period": body["review_period"],
                   "avg": r["avg_rating_given"], "company_avg": r["company_avg_rating"], "flag": r.get("bias_flag", "none")})
        db.session.commit()
        return success({"reviewers_analyzed": len(results)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@pms360_bp.post("/excel-import")
@require_auth
def excel_import():
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], "pms_360")
    return jsonify(result), 200 if result["success"] else 422


@pms360_bp.get("/excel-template")
@require_auth
def excel_template():
    b = build_template_xlsx("pms_360")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name="pms_360_template.xlsx")
