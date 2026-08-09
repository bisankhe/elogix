"""
FILE: backend/routes/rewards_recognition_routes.py
NepHR Pro — Performance & Talent Management > Goal & Performance >
Rewards & Recognition Module (6 pages)
URL prefix: /api/v1/rewards-recognition

  1. /rewards          — Reward Program (spot bonus/profit-sharing, tiered approval)
  2. /kudos                — Recognition Program (peer-to-peer)
  3. /promotions               — Promotion Recommendation (readiness + calibration)
  4. /incentives                   — Incentive Recommendation (KPI-tied)
  5. /training-recommendations         — Training Recommendation
  6. /termination-flags                    — Termination Recommendation (CONFIDENTIAL)

Nepal Labour Act 2074: Sections 34/35 (bylaws-documented reward
criteria); Section 23 (withholding promotion as discipline); Section 40
(annual training quota); Section 142 (3 consecutive unsatisfactory
appraisals + 7-day explanation right before lawful termination).
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

rewards_bp = Blueprint("rewards_recognition", __name__, url_prefix="/api/v1/rewards-recognition")


# ════════════════════════════════════════════════════════════════
# 1. REWARD PROGRAM
# ════════════════════════════════════════════════════════════════

@rewards_bp.get("/rewards")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_rewards():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_reward_program_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@rewards_bp.post("/rewards")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_reward():
    """approval_tier is auto-computed by a generated column based on amount."""
    body = request.get_json() or {}
    required = ["employee_id", "reward_type", "amount_npr", "reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO reward_requests (company_id, employee_id, reward_type, amount_npr, reason, requested_by, created_at)
            VALUES (:cid, :eid, :rtype, :amount, :reason, :user, NOW())
            RETURNING id, approval_tier
        """), {"cid": g.company_id, "eid": body["employee_id"], "rtype": body["reward_type"],
               "amount": body["amount_npr"], "reason": body["reason"], "user": g.user_id})
        row = result.fetchone()
        db.session.commit()
        return created({"reward_id": str(row[0]), "approval_tier": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.put("/rewards/<reward_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_reward(reward_id):
    """DB trigger notifies the employee + reporting manager via the shared mechanism."""
    try:
        db.session.execute(text("""
            UPDATE reward_requests SET status = 'approved', approved_by = :user
            WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "rid": reward_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. RECOGNITION PROGRAM
# ════════════════════════════════════════════════════════════════

@rewards_bp.get("/kudos")
def kudos_feed():
    """Public — peer recognition feed, visible to all."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM recognition_kudos WHERE company_id = :cid ORDER BY created_at DESC LIMIT 100"
        ), {"cid": request.args.get("company_id") or (g.company_id if hasattr(g, "company_id") else None)}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@rewards_bp.post("/kudos")
def give_kudos():
    """Public — anyone can recognize anyone, per the brief's decentralized model."""
    body = request.get_json() or {}
    required = ["from_employee_id", "to_employee_id", "core_value", "message"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO recognition_kudos (company_id, from_employee_id, to_employee_id, core_value, message, points, created_at)
            VALUES (:cid, :from_eid, :to_eid, :value, :msg, :points, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "from_eid": body["from_employee_id"], "to_eid": body["to_employee_id"],
               "value": body["core_value"], "msg": body["message"], "points": body.get("points", 25)})
        kudos_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"kudos_id": kudos_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.get("/leaderboard")
def leaderboard():
    """Public — this month's top recognized employees."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_recognition_leaderboard WHERE company_id = :cid LIMIT 10"
        ), {"cid": request.args.get("company_id")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 3. PROMOTION RECOMMENDATION
# ════════════════════════════════════════════════════════════════

@rewards_bp.get("/promotions")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_promotions():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_promotion_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@rewards_bp.post("/promotions/ai-flag-candidates")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_flag_promotion_candidates():
    """AI cross-references tenure, appraisal history, and compa-ratio to flag readiness."""
    try:
        insight = generate_ai_insights({"type": "promotion_readiness_scan", "company_id": g.company_id})
        results = insight.get("candidates", [])
        created_ids = []
        for c in results:
            r = db.session.execute(text("""
                INSERT INTO promotion_recommendations
                  (company_id, employee_id, current_role_label, next_role_label, tenure_years, avg_appraisal_rating, compa_ratio, created_at)
                VALUES (:cid, :eid, :cur, :next_role, :tenure, :rating, :compa, NOW())
                RETURNING id
            """), {"cid": g.company_id, "eid": c["employee_id"], "cur": c.get("current_role_label"),
                   "next_role": c.get("next_role_label"), "tenure": c.get("tenure_years"),
                   "rating": c.get("avg_appraisal_rating"), "compa": c.get("compa_ratio")})
            created_ids.append(str(r.fetchone()[0]))
        db.session.commit()
        return success({"candidates_flagged": len(created_ids)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.post("/promotions/<rec_id>/calibrate")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def add_calibration(rec_id):
    """Multi-manager calibration to eliminate proximity/gut-feel bias."""
    body = request.get_json() or {}
    required = ["calibrator_employee_id", "calibrator_role"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO promotion_calibrations (promotion_recommendation_id, company_id, calibrator_employee_id, calibrator_role, comments, reviewed_at)
            VALUES (:rid, :cid, :calib, :role, :comments, NOW())
            ON CONFLICT (promotion_recommendation_id, calibrator_role) DO UPDATE SET comments = EXCLUDED.comments, reviewed_at = NOW()
        """), {"rid": rec_id, "cid": g.company_id, "calib": body["calibrator_employee_id"], "role": body["calibrator_role"], "comments": body.get("comments")})
        db.session.commit()
        return created({"calibration_recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.put("/promotions/<rec_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager")
def decide_promotion(rec_id):
    body = request.get_json() or {}
    decision = body.get("status")
    if decision not in ("recommended", "rejected"): return error("status must be recommended or rejected", 422)
    try:
        db.session.execute(text("""
            UPDATE promotion_recommendations SET status = :status WHERE id = :rid AND company_id = :cid
        """), {"status": decision, "rid": rec_id, "cid": g.company_id})
        db.session.commit()
        return success({"decided": True, "status": decision})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. INCENTIVE RECOMMENDATION
# ════════════════════════════════════════════════════════════════

@rewards_bp.get("/incentives")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_incentives():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_incentive_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@rewards_bp.post("/incentives")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_incentive_recommendation():
    """calculated_npr is auto-derived: base_incentive_npr * kpi_actual_pct / 100."""
    body = request.get_json() or {}
    required = ["employee_id", "base_incentive_npr", "kpi_actual_pct", "budget_cap_npr"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO incentive_recommendations
              (company_id, employee_id, kpi_definition_id, kpi_basis_label, kpi_actual_pct, base_incentive_npr, budget_cap_npr, created_at)
            VALUES
              (:cid, :eid, :kpi_id, :basis, :actual_pct, :base, :cap, NOW())
            RETURNING id, calculated_npr, exceeds_budget
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "kpi_id": body.get("kpi_definition_id"),
            "basis": body.get("kpi_basis_label"), "actual_pct": body["kpi_actual_pct"],
            "base": body["base_incentive_npr"], "cap": body["budget_cap_npr"],
        })
        row = result.fetchone()
        db.session.commit()
        return created({"recommendation_id": str(row[0]), "calculated_npr": float(row[1]), "exceeds_budget": row[2]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.put("/incentives/<rec_id>/adjust")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def adjust_incentive(rec_id):
    body = request.get_json() or {}
    if body.get("manager_adjusted_npr") is None: return error("manager_adjusted_npr required", 422)
    try:
        db.session.execute(text("""
            UPDATE incentive_recommendations SET manager_adjusted_npr = :amount WHERE id = :rid AND company_id = :cid
        """), {"amount": body["manager_adjusted_npr"], "rid": rec_id, "cid": g.company_id})
        db.session.commit()
        return success({"adjusted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.put("/incentives/<rec_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_incentive(rec_id):
    """One-click approval, per the brief's UX requirement."""
    try:
        db.session.execute(text("""
            UPDATE incentive_recommendations SET status = 'approved', approved_by = :user WHERE id = :rid AND company_id = :cid
        """), {"user": g.user_id, "rid": rec_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 5. TRAINING RECOMMENDATION
# ════════════════════════════════════════════════════════════════

@rewards_bp.get("/training-recommendations")
@require_auth
def list_training_recommendations():
    employee_id = request.args.get("employee_id")
    try:
        q = "SELECT * FROM v_training_recommendation_dashboard WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if employee_id: q += " AND employee_id = :eid"; params["eid"] = employee_id
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@rewards_bp.post("/training-recommendations/ai-generate")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def ai_generate_training_recommendations():
    """AI maps gaps from Behaviour Evaluation/PIP/360 Feedback to specific courses."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        insight = generate_ai_insights({"type": "training_gap_mapping", "employee_id": body["employee_id"], "company_id": g.company_id})
        recs = insight.get("recommendations", [])
        for r in recs:
            db.session.execute(text("""
                INSERT INTO training_recommendations
                  (company_id, employee_id, gap_source, gap_source_record_id, gap_identified, recommended_course, provider, created_at)
                VALUES (:cid, :eid, :source, :source_id, :gap, :course, :provider, NOW())
            """), {"cid": g.company_id, "eid": body["employee_id"], "source": r["gap_source"], "source_id": r.get("gap_source_record_id"),
                   "gap": r["gap_identified"], "course": r["recommended_course"], "provider": r.get("provider", "Internal LMS")})
        db.session.commit()
        return created({"recommendations_created": len(recs)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.put("/training-recommendations/<rec_id>/enroll")
def enroll_training(rec_id):
    """Public/ESS — employee self-enrolls."""
    try:
        db.session.execute(text("""
            UPDATE training_recommendations SET enrolled = TRUE, enrolled_at = NOW() WHERE id = :rid
        """), {"rid": rec_id})
        db.session.commit()
        return success({"enrolled": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.put("/training-recommendations/<rec_id>/update-progress")
def update_training_progress(rec_id):
    body = request.get_json() or {}
    if body.get("progress_pct") is None: return error("progress_pct required", 422)
    try:
        db.session.execute(text("""
            UPDATE training_recommendations SET progress_pct = :pct,
                   completed_at = CASE WHEN :pct >= 100 THEN NOW() ELSE completed_at END
            WHERE id = :rid
        """), {"pct": body["progress_pct"], "rid": rec_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.get("/training-recommendations/statutory-coverage")
@require_auth
@require_role("super_admin", "hr_manager")
def statutory_training_coverage():
    """Tracks Section 40's annual training quota compliance."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_statutory_training_coverage WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# ════════════════════════════════════════════════════════════════
# 6. TERMINATION RECOMMENDATION (CONFIDENTIAL — HR/Exec only)
# ════════════════════════════════════════════════════════════════

@rewards_bp.get("/termination-flags")
@require_auth
@require_role("super_admin", "hr_manager")
def list_termination_flags():
    """Restricted to super_admin/hr_manager only -- never department_head or below."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_termination_flags_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()

        for r in rows:
            db.session.execute(text(
                "UPDATE termination_flags SET last_viewed_by = :user WHERE id = :fid"
            ), {"user": g.user_id, "fid": r.id})
        db.session.commit()

        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@rewards_bp.post("/termination-flags/ai-scan")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_scan_termination_indicators():
    """AI aggregates objective indicators only -- never auto-decides."""
    try:
        insight = generate_ai_insights({"type": "termination_indicator_scan", "company_id": g.company_id})
        flags = insight.get("flags", [])
        for f in flags:
            db.session.execute(text("""
                INSERT INTO termination_flags
                  (company_id, employee_id, consecutive_unsatisfactory_appraisals, unaddressed_pip_count,
                   attendance_breach_count, documented_warnings_count, due_process_status, created_at)
                VALUES
                  (:cid, :eid, :unsatisfactory, :pip_count, :attendance, :warnings, :due_process, NOW())
                ON CONFLICT DO NOTHING
            """), {"cid": g.company_id, "eid": f["employee_id"], "unsatisfactory": f.get("consecutive_unsatisfactory_appraisals", 0),
                   "pip_count": f.get("unaddressed_pip_count", 0), "attendance": f.get("attendance_breach_count", 0),
                   "warnings": f.get("documented_warnings_count", 0), "due_process": f.get("due_process_status", "monitoring")})
        db.session.commit()
        return success({"flags_created": len(flags)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.put("/termination-flags/<flag_id>/explanation-completed")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_explanation_completed(flag_id):
    """Records that the mandatory 7-day written-explanation period has concluded."""
    try:
        db.session.execute(text("""
            UPDATE termination_flags SET explanation_period_status = 'completed', explanation_completed_at = NOW()
            WHERE id = :fid AND company_id = :cid
        """), {"fid": flag_id, "cid": g.company_id})
        db.session.commit()
        return success({"explanation_recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@rewards_bp.put("/termination-flags/<flag_id>/escalate")
@require_auth
@require_role("super_admin", "hr_manager")
def escalate_to_exit(flag_id):
    """Blocked by DB trigger unless legally_eligible AND explanation_period_status = 'completed'."""
    try:
        db.session.execute(text("""
            UPDATE termination_flags SET due_process_status = 'escalated' WHERE id = :fid AND company_id = :cid
        """), {"fid": flag_id, "cid": g.company_id})
        db.session.commit()
        return success({"escalated": True, "note": "Case is now eligible to be opened in Exit Management."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


# ── Excel import/export ───────────────────────────────────────
@rewards_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    allowed = ["rewards", "promotions", "incentives", "training"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"rewards_recognition_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"rewards_recognition_{module}_template.xlsx")
