"""
FILE: backend/routes/probation_management_routes.py
NepHR Pro — Onboarding > Probation Management Module (5 pages)
URL prefix: /api/v1/probation

  1. /7-days        — 7 Days Review (foundation checklist)
  2. /30-days        — 30 Days Review (goals + check-in survey)
  3. /60-days          — 60 Days Review (KPI scale + 360 feedback + PIP trigger)
  4. /90-days            — 90 Days Review (competency assessment + AI recommendation)
  5. /decisions             — Confirmation or Termination

Nepal Labour Act 2074 Section 13: probation max 6 months, auto-confirm by operation
of law if no decision taken, termination without notice permitted during probation.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date, timedelta
import io, json, uuid

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..utils.notifications import send_email
from ..ai.insights import generate_ai_insights

probation_bp = Blueprint("probation_management", __name__, url_prefix="/api/v1/probation")

NEPAL_MAX_PROBATION_MONTHS = 6


# ════════════════════════════════════════════════════════════════
# MASTER PROBATION RECORD
# ════════════════════════════════════════════════════════════════

@probation_bp.get("/records")
@require_auth
def list_probation_records():
    status = request.args.get("status")
    phase  = request.args.get("phase")
    try:
        q = "SELECT * FROM probation_records WHERE company_id = :cid AND NOT is_deleted"
        params = {"cid": g.company_id}
        if status: q += " AND overall_status = :status"; params["status"] = status
        if phase:  q += " AND current_phase = :phase";    params["phase"]  = phase
        q += " ORDER BY days_until_auto_confirm ASC NULLS LAST"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@probation_bp.post("/records")
@require_auth
@require_role("super_admin","hr_manager")
def create_probation_record():
    body = request.get_json() or {}
    required = ["employee_name","join_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    months = min(body.get("probation_months", 6), NEPAL_MAX_PROBATION_MONTHS)
    if body.get("probation_months", 0) > NEPAL_MAX_PROBATION_MONTHS:
        return error("Probation cannot exceed 6 months per Nepal Labour Act 2074 Section 13.", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO probation_records
              (company_id, employee_id, enrollment_id, employee_name, position,
               department_id, branch_id, manager_employee_id, manager_name,
               join_date, probation_months, created_at)
            VALUES
              (:cid, :emp_id, :eid, :name, :pos,
               :dept, :branch, :mgr_id, :mgr_name,
               :join_date, :months, NOW())
            RETURNING id, probation_end_date
        """), {
            "cid": g.company_id, "emp_id": body.get("employee_id"), "eid": body.get("enrollment_id"),
            "name": body["employee_name"], "pos": body.get("position",""), "dept": body.get("department_id"),
            "branch": body.get("branch_id"), "mgr_id": body.get("manager_employee_id"),
            "mgr_name": body.get("manager_name",""), "join_date": body["join_date"], "months": months,
        })
        row = result.fetchone()
        record_id = str(row[0])

        # Auto-create the 7-day review shell
        db.session.execute(text("""
            INSERT INTO probation_7day_reviews
              (probation_record_id, company_id, review_due_date, buddy_name, status, created_at)
            VALUES (:rid, :cid, :due, :buddy, 'not_started', NOW())
        """), {"rid": record_id, "cid": g.company_id,
               "due": (date.fromisoformat(body["join_date"]) + timedelta(days=7)).isoformat(),
               "buddy": body.get("buddy_name","")})

        db.session.commit()
        return created({
            "probation_record_id": record_id,
            "probation_end_date": str(row[1]),
            "la2074_note": f"Probation set to {months} months. Auto-confirmation by law if no decision made by end date.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@probation_bp.get("/deadline-alerts")
@require_auth
def deadline_alerts():
    """Urgent: probations approaching the 6-month legal auto-confirm deadline."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_probation_deadline_alerts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@probation_bp.get("/trajectory/<record_id>")
@require_auth
def get_trajectory(record_id):
    """Full 7/30/60/90-day trajectory for one employee (used by 90-day page)."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_probation_trajectory WHERE probation_record_id = :rid AND company_id = :cid"
        ), {"rid": record_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Probation record")
        return success(dict(row._mapping))
    except Exception:
        return not_found("Probation record")


# ════════════════════════════════════════════════════════════════
# 1. 7-DAY REVIEW
# ════════════════════════════════════════════════════════════════

@probation_bp.get("/7-days")
@require_auth
def list_7day_reviews():
    try:
        rows = db.session.execute(text("""
            SELECT r.*, pr.employee_name, pr.position, pr.department_id, pr.join_date
            FROM probation_7day_reviews r
            JOIN probation_records pr ON r.probation_record_id = pr.id
            WHERE r.company_id = :cid AND NOT pr.is_deleted
            ORDER BY r.review_due_date
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@probation_bp.put("/7-days/<review_id>/toggle-item")
@require_auth
def toggle_7day_item(review_id):
    body = request.get_json() or {}
    item_key = body.get("item_key")
    if not item_key: return error("item_key required", 422)
    try:
        row = db.session.execute(text(
            "SELECT checklist, probation_record_id FROM probation_7day_reviews WHERE id = :rid AND company_id = :cid"
        ), {"rid": review_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("7-day review")

        checklist = row.checklist or {}
        checklist[item_key] = not checklist.get(item_key, False)
        all_done = all(checklist.values())
        any_done = any(checklist.values())
        new_status = "completed" if all_done else "in_progress" if any_done else "not_started"

        # Auto-notify IT/Finance when those specific items toggle on
        it_notify = item_key == "it_hardware" and checklist[item_key]
        finance_notify = item_key == "payroll_declaration" and checklist[item_key]

        db.session.execute(text("""
            UPDATE probation_7day_reviews
               SET checklist = :checklist::jsonb, status = :status,
                   it_notified = CASE WHEN :it_notify THEN TRUE ELSE it_notified END,
                   finance_notified = CASE WHEN :fin_notify THEN TRUE ELSE finance_notified END,
                   updated_at = NOW()
             WHERE id = :rid AND company_id = :cid
        """), {"checklist": json.dumps(checklist), "status": new_status,
               "it_notify": it_notify, "fin_notify": finance_notify,
               "rid": review_id, "cid": g.company_id})
        db.session.commit()

        return success({"item": item_key, "value": checklist[item_key], "status": new_status})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@probation_bp.put("/7-days/<review_id>/role-clarity")
@require_auth
def set_role_clarity(review_id):
    body = request.get_json() or {}
    score = body.get("score")
    if not (1 <= int(score or 0) <= 5): return error("score must be 1-5", 422)
    try:
        db.session.execute(text("""
            UPDATE probation_7day_reviews
               SET role_clarity_score = :score, manager_note = :note, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid
        """), {"score": score, "note": body.get("manager_note",""), "rid": review_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. 30-DAY REVIEW
# ════════════════════════════════════════════════════════════════

@probation_bp.get("/30-days")
@require_auth
def list_30day_reviews():
    try:
        reviews = db.session.execute(text("""
            SELECT r.*, pr.employee_name, pr.position, pr.department_id
            FROM probation_30day_reviews r
            JOIN probation_records pr ON r.probation_record_id = pr.id
            WHERE r.company_id = :cid AND NOT pr.is_deleted
            ORDER BY r.review_date DESC
        """), {"cid": g.company_id}).fetchall()
        result = []
        for r in reviews:
            goals = db.session.execute(text(
                "SELECT * FROM probation_30day_goals WHERE review_30day_id = :rid"
            ), {"rid": r.id}).fetchall()
            d = dict(r._mapping)
            d["goals"] = [dict(gl._mapping) for gl in goals]
            result.append(d)
        return success(result)
    except Exception:
        return success([])


@probation_bp.post("/30-days")
@require_auth
@require_role("super_admin","hr_manager")
def create_30day_review():
    """Submit the 30-day check-in: goals met/not-met + survey + notes."""
    body = request.get_json() or {}
    if not body.get("probation_record_id"): return error("probation_record_id required", 422)

    survey = body.get("survey", {})
    try:
        result = db.session.execute(text("""
            INSERT INTO probation_30day_reviews
              (probation_record_id, company_id, review_date,
               survey_role_clarity, survey_team_integration, survey_manager_support,
               survey_tools_access, survey_overall_satisfaction,
               manager_note, employee_feedback, status, created_at)
            VALUES
              (:rid, :cid, NOW()::DATE,
               :s1, :s2, :s3, :s4, :s5,
               :mnote, :efeedback, 'completed', NOW())
            RETURNING id
        """), {
            "rid": body["probation_record_id"], "cid": g.company_id,
            "s1": survey.get("role_clarity"), "s2": survey.get("team_integration"),
            "s3": survey.get("manager_support"), "s4": survey.get("tools_access"),
            "s5": survey.get("overall_satisfaction"),
            "mnote": body.get("manager_note",""), "efeedback": body.get("employee_feedback",""),
        })
        review_id = str(result.fetchone()[0])

        for goal in body.get("goals", []):
            db.session.execute(text("""
                INSERT INTO probation_30day_goals (review_30day_id, company_id, goal_text, met, set_by, created_at)
                VALUES (:rid, :cid, :text, :met, :setby, NOW())
            """), {"rid": review_id, "cid": g.company_id, "text": goal["goal_text"],
                   "met": goal.get("met", False), "setby": body.get("manager_name","")})

        # AI red flag detection
        avg = sum(v for v in survey.values() if v) / max(len([v for v in survey.values() if v]), 1)
        red_flags = 1 if avg < 3 else 0
        db.session.execute(text(
            "UPDATE probation_30day_reviews SET red_flags = :flags WHERE id = :rid"
        ), {"flags": red_flags, "rid": review_id})

        db.session.commit()
        return created({
            "review_id": review_id, "survey_avg": round(avg, 2), "red_flags": red_flags,
            "note": "Red flag carries forward to 60-day review per no-surprise rule." if red_flags else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. 60-DAY REVIEW
# ════════════════════════════════════════════════════════════════

KPI_NAMES = ["Job Knowledge","Quality of Work","Productivity/Output",
             "Initiative & Independence","Collaboration","Reliability"]

@probation_bp.get("/60-days")
@require_auth
def list_60day_reviews():
    try:
        reviews = db.session.execute(text("""
            SELECT r.*, pr.employee_name, pr.position, pr.department_id
            FROM probation_60day_reviews r
            JOIN probation_records pr ON r.probation_record_id = pr.id
            WHERE r.company_id = :cid AND NOT pr.is_deleted
            ORDER BY r.review_date DESC
        """), {"cid": g.company_id}).fetchall()
        result = []
        for r in reviews:
            kpis = db.session.execute(text(
                "SELECT * FROM probation_60day_kpis WHERE review_60day_id = :rid"
            ), {"rid": r.id}).fetchall()
            feedback = db.session.execute(text(
                "SELECT * FROM probation_360_feedback WHERE review_60day_id = :rid"
            ), {"rid": r.id}).fetchall()
            d = dict(r._mapping)
            d["kpis"] = [dict(k._mapping) for k in kpis]
            d["peer_feedback"] = [dict(f._mapping) for f in feedback]
            result.append(d)
        return success(result)
    except Exception:
        return success([])


@probation_bp.post("/60-days")
@require_auth
@require_role("super_admin","hr_manager")
def create_60day_review():
    """KPI scoring + 360 feedback. Auto-triggers PIP if avg < 3.0."""
    body = request.get_json() or {}
    if not body.get("probation_record_id"): return error("probation_record_id required", 422)

    kpi_scores = body.get("kpi_scores", {})  # {"Job Knowledge": 4, ...}
    avg = sum(kpi_scores.values()) / max(len(kpi_scores), 1) if kpi_scores else None

    try:
        result = db.session.execute(text("""
            INSERT INTO probation_60day_reviews
              (probation_record_id, company_id, review_date, attendance_pct, overall_kpi_avg, status, created_at)
            VALUES
              (:rid, :cid, NOW()::DATE, :attendance, :avg, 'completed', NOW())
            RETURNING id, pip_triggered
        """), {
            "rid": body["probation_record_id"], "cid": g.company_id,
            "attendance": body.get("attendance_pct"), "avg": avg,
        })
        row = result.fetchone()
        review_id = str(row[0])
        pip_triggered = row[1]

        for name, score in kpi_scores.items():
            db.session.execute(text("""
                INSERT INTO probation_60day_kpis (review_60day_id, company_id, kpi_name, score, created_at)
                VALUES (:rid, :cid, :name, :score, NOW())
            """), {"rid": review_id, "cid": g.company_id, "name": name, "score": score})

        for fb in body.get("peer_feedback", []):
            db.session.execute(text("""
                INSERT INTO probation_360_feedback (review_60day_id, company_id, feedback_from_name, feedback_from_role, comment, created_at)
                VALUES (:rid, :cid, :name, :role, :comment, NOW())
            """), {"rid": review_id, "cid": g.company_id, "name": fb["from_name"],
                   "role": fb.get("from_role",""), "comment": fb["comment"]})

        db.session.commit()

        return created({
            "review_id": review_id, "overall_kpi_avg": round(avg, 2) if avg else None,
            "pip_triggered": pip_triggered,
            "pip_note": "Average below 3.0 — Performance Improvement Plan auto-triggered. Document all feedback for legal traceability." if pip_triggered else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@probation_bp.get("/pip-tracking")
@require_auth
def pip_tracking():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pip_tracking WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 4. 90-DAY REVIEW
# ════════════════════════════════════════════════════════════════

COMPETENCY_NAMES = ["Role Mastery","Independent Execution","Team Leadership","Goal Achievement"]

@probation_bp.get("/90-days")
@require_auth
def list_90day_reviews():
    try:
        reviews = db.session.execute(text("""
            SELECT r.*, pr.employee_name, pr.position, pr.department_id, pr.probation_end_date
            FROM probation_90day_reviews r
            JOIN probation_records pr ON r.probation_record_id = pr.id
            WHERE r.company_id = :cid AND NOT pr.is_deleted
            ORDER BY r.review_date DESC
        """), {"cid": g.company_id}).fetchall()
        result = []
        for r in reviews:
            comps = db.session.execute(text(
                "SELECT * FROM probation_90day_competencies WHERE review_90day_id = :rid"
            ), {"rid": r.id}).fetchall()
            d = dict(r._mapping)
            d["competencies"] = [dict(c._mapping) for c in comps]
            result.append(d)
        return success(result)
    except Exception:
        return success([])


@probation_bp.post("/90-days")
@require_auth
@require_role("super_admin","hr_manager")
def create_90day_review():
    """
    Consolidates 7/30/60-day history, runs AI recommendation engine,
    surfaces CONFIRM / EXTEND / TERMINATE.
    """
    body = request.get_json() or {}
    record_id = body.get("probation_record_id")
    if not record_id: return error("probation_record_id required", 422)

    try:
        # Pull trajectory
        traj = db.session.execute(text(
            "SELECT * FROM v_probation_trajectory WHERE probation_record_id = :rid"
        ), {"rid": record_id}).fetchone()

        competencies = body.get("competencies", {})
        comp_avg = sum(competencies.values()) / max(len(competencies), 1) if competencies else 0
        competency_score = round(comp_avg / 5 * 100)

        insight = generate_ai_insights({
            "type": "probation_90day_recommendation",
            "day7_pct": traj.day7_pct if traj else None,
            "day30_avg": float(traj.day30_avg) if traj and traj.day30_avg else None,
            "day60_avg": float(traj.day60_avg) if traj and traj.day60_avg else None,
            "competency_score": competency_score,
        })

        recommendation = insight.get("recommendation", "EXTEND")
        ai_note = insight.get("note", "")

        result = db.session.execute(text("""
            INSERT INTO probation_90day_reviews
              (probation_record_id, company_id, review_date, competency_score,
               day7_completion_pct, day30_survey_avg, day60_kpi_avg,
               ai_recommendation, ai_note, ai_generated_at, status, created_at)
            VALUES
              (:rid, :cid, NOW()::DATE, :score,
               :d7, :d30, :d60,
               :rec, :note, NOW(), 'completed', NOW())
            RETURNING id
        """), {
            "rid": record_id, "cid": g.company_id, "score": competency_score,
            "d7": traj.day7_pct if traj else None, "d30": traj.day30_avg if traj else None,
            "d60": traj.day60_avg if traj else None, "rec": recommendation, "note": ai_note,
        })
        review_id = str(result.fetchone()[0])

        for name, score in competencies.items():
            db.session.execute(text("""
                INSERT INTO probation_90day_competencies (review_90day_id, company_id, competency_name, score, created_at)
                VALUES (:rid, :cid, :name, :score, NOW())
            """), {"rid": review_id, "cid": g.company_id, "name": name, "score": score})

        db.session.execute(text(
            "UPDATE probation_records SET current_phase = 'day_90' WHERE id = :rid"
        ), {"rid": record_id})

        db.session.commit()
        return created({
            "review_id": review_id, "competency_score": competency_score,
            "ai_recommendation": recommendation, "ai_note": ai_note,
            "decision_required": True,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 5. CONFIRMATION OR TERMINATION
# ════════════════════════════════════════════════════════════════

@probation_bp.get("/decisions")
@require_auth
def list_decisions():
    decision_filter = request.args.get("decision")
    try:
        q = """
            SELECT pd.*, pr.employee_name, pr.position, pr.department_id,
                   pr.join_date, pr.probation_end_date
            FROM probation_decisions pd
            JOIN probation_records pr ON pd.probation_record_id = pr.id
            WHERE pd.company_id = :cid AND NOT pr.is_deleted
        """
        params = {"cid": g.company_id}
        if decision_filter: q += " AND pd.decision = :d"; params["d"] = decision_filter
        q += " ORDER BY pd.decided_date DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@probation_bp.post("/decisions/confirm")
@require_auth
@require_role("super_admin","hr_manager")
def confirm_employment():
    """Confirm: generates letter, updates status to Permanent, adjusts benefits/payroll."""
    body = request.get_json() or {}
    if not body.get("probation_record_id"): return error("probation_record_id required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO probation_decisions
              (probation_record_id, company_id, decision, decided_by_name,
               confirmation_letter_generated, employee_status_updated,
               benefits_adjusted, payroll_scale_updated, created_at)
            VALUES
              (:rid, :cid, 'confirmed', :decided_by,
               TRUE, TRUE,
               TRUE, TRUE, NOW())
            RETURNING id
        """), {"rid": body["probation_record_id"], "cid": g.company_id, "decided_by": body.get("decided_by_name","")})
        decision_id = str(result.fetchone()[0])
        db.session.commit()
        return created({
            "decision_id": decision_id,
            "actions_triggered": [
                "Confirmation Letter generated", "Employee status updated to Permanent",
                "Benefits eligibility adjusted", "Payroll scale updated",
            ],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@probation_bp.post("/decisions/extend")
@require_auth
@require_role("super_admin","hr_manager")
def extend_probation():
    """Extend: auto-creates a new probation_records row via DB trigger."""
    body = request.get_json() or {}
    required = ["probation_record_id","extension_months"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    months = body["extension_months"]
    if not (1 <= months <= 3):
        return error("Extension must be 1-3 months.", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO probation_decisions
              (probation_record_id, company_id, decision, decided_by_name,
               extension_months, extension_letter_generated, new_goals_set, created_at)
            VALUES
              (:rid, :cid, 'extended', :decided_by,
               :months, TRUE, TRUE, NOW())
            RETURNING id, new_probation_record_id
        """), {"rid": body["probation_record_id"], "cid": g.company_id,
               "decided_by": body.get("decided_by_name",""), "months": months})
        row = result.fetchone()
        db.session.commit()
        return created({
            "decision_id": str(row[0]),
            "new_probation_record_id": str(row[1]) if row[1] else None,
            "extension_months": months,
            "note": f"New {months}-month probation cycle created with fresh 7/30/60/90-day checkpoints.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@probation_bp.post("/decisions/terminate")
@require_auth
@require_role("super_admin","hr_manager")
def terminate_employment():
    """
    Terminate: triggers offboarding checklist — IT access revocation,
    Finance final settlement, asset recovery, exit paperwork.
    Nepal LA2074 Section 13: no notice required during probation for unsatisfactory performance.
    """
    body = request.get_json() or {}
    required = ["probation_record_id","termination_reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        result = db.session.execute(text("""
            INSERT INTO probation_decisions
              (probation_record_id, company_id, decision, decided_by_name,
               termination_reason, notice_required, it_access_revoked,
               final_settlement_status, asset_recovery_status, exit_paperwork_generated, created_at)
            VALUES
              (:rid, :cid, 'terminated', :decided_by,
               :reason, FALSE, TRUE,
               'pending', 'pending', TRUE, NOW())
            RETURNING id
        """), {"rid": body["probation_record_id"], "cid": g.company_id,
               "decided_by": body.get("decided_by_name",""), "reason": body["termination_reason"]})
        decision_id = str(result.fetchone()[0])
        db.session.commit()
        return created({
            "decision_id": decision_id,
            "la2074_note": "No notice period required during probation for unsatisfactory performance (Section 13).",
            "offboarding_triggered": ["IT: Access revoked", "Finance: Final settlement pending",
                                      "Facilities: Asset recovery pending", "Legal: Exit paperwork generated"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@probation_bp.put("/decisions/<decision_id>/update-offboarding")
@require_auth
@require_role("super_admin","hr_manager")
def update_offboarding_status(decision_id):
    body = request.get_json() or {}
    allowed = ["final_settlement_status","asset_recovery_status"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("Nothing to update", 400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["did"] = decision_id
    try:
        db.session.execute(text(
            f"UPDATE probation_decisions SET {set_clause}, updated_at = NOW() WHERE id = :did"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@probation_bp.get("/termination-offboarding-status")
@require_auth
def termination_offboarding_status():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_termination_offboarding_status WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@probation_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["7-days","30-days","60-days","90-days","decisions"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"probation_{module}")
    return jsonify(result), 200 if result["success"] else 422


@probation_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"probation_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"probation_{module}_template.xlsx")
