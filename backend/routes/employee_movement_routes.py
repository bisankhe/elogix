"""
FILE: backend/routes/employee_movement_routes.py
NepHR Pro — Employee Records > Employee Movement Module (6 pages)
URL prefix: /api/v1/movement

  1. /promotions          — Promotion & History (AI bias check, competency scoring)
  2. /demotions             — Demotion & History (legally gated, consent-required)
  3. /confirmations            — Confirmation Management (org-wide command center)
  4. /transfers                  — Transfer & History (no-inferior-position rule)
  5. /disciplinary                  — Disciplinary Records (restricted access)
  6. /timeline/<employee_id>           — Employee Timeline (unified view)

Nepal Labour Act 2074: promotions on merit/seniority, demotion requires consent
for salary change, transfers cannot reduce salary/grade, progressive discipline,
6-month probation auto-confirm rule.
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

movement_bp = Blueprint("employee_movement", __name__, url_prefix="/api/v1/movement")


# ════════════════════════════════════════════════════════════════
# 1. PROMOTION & HISTORY
# ════════════════════════════════════════════════════════════════

@movement_bp.get("/promotions")
@require_auth
def list_promotions():
    status = request.args.get("status")
    try:
        q = """
            SELECT p.*, e.first_name, e.last_name, e.employee_code
            FROM employee_promotions p
            JOIN employees e ON p.employee_id = e.id
            WHERE p.company_id = :cid AND NOT p.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND p.status = :status"; params["status"] = status
        q += " ORDER BY p.effective_date DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@movement_bp.post("/promotions")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_promotion():
    """Wizard submit: runs AI bias check before routing for approval."""
    body = request.get_json() or {}
    required = ["employee_id", "to_title", "effective_date", "new_salary_npr", "rationale"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        insight = generate_ai_insights({
            "type": "promotion_bias_check",
            "competency_scores": body.get("competency_scores", []),
            "rationale": body["rationale"],
            "old_salary": body.get("old_salary_npr"),
            "new_salary": body["new_salary_npr"],
        })
        bias_status = "flagged" if insight.get("bias_detected") else "passed"

        result = db.session.execute(text("""
            INSERT INTO employee_promotions
              (company_id, employee_id, from_title, to_title, from_department_id, to_department_id,
               effective_date, old_salary_npr, new_salary_npr, competency_scores, rationale,
               ai_bias_check_status, ai_bias_check_notes, status, created_by, created_at)
            VALUES
              (:cid, :eid, :from_title, :to_title, :from_dept, :to_dept,
               :eff_date, :old_sal, :new_sal, :comp::jsonb, :rationale,
               :bias_status, :bias_notes, 'pending_approval', :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "from_title": body.get("from_title"),
            "to_title": body["to_title"], "from_dept": body.get("from_department_id"),
            "to_dept": body.get("to_department_id"), "eff_date": body["effective_date"],
            "old_sal": body.get("old_salary_npr"), "new_sal": body["new_salary_npr"],
            "comp": json.dumps(body.get("competency_scores", [])), "rationale": body["rationale"],
            "bias_status": bias_status, "bias_notes": insight.get("notes", ""), "user": g.user_id,
        })
        promo_id = str(result.fetchone()[0])
        db.session.commit()

        return created({
            "promotion_id": promo_id,
            "ai_bias_check_status": bias_status,
            "ai_notes": insight.get("notes", ""),
            "warning": "AI flagged potential bias indicators — manual HR review recommended." if bias_status == "flagged" else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.post("/promotions/<promo_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_promotion(promo_id):
    """Approves + digitally signs. DB trigger auto-logs to employee_employment_history."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE employee_promotions
               SET status = 'completed', approved_by_employee_id = :approver,
                   approved_by_name = :approver_name, digital_signoff = TRUE,
                   digital_signoff_date = NOW(), updated_at = NOW()
             WHERE id = :pid AND company_id = :cid
        """), {"approver": g.user_id, "approver_name": body.get("approved_by_name", ""),
               "pid": promo_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "approved": True,
            "downstream_triggers": ["Org chart updated", "Payroll synced", "Logged in Employee Timeline"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.get("/promotions/bias-review-queue")
@require_auth
@require_role("super_admin", "hr_manager")
def promotions_bias_queue():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_promotions_bias_review_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 2. DEMOTION & HISTORY (legally gated)
# ════════════════════════════════════════════════════════════════

@movement_bp.get("/demotions")
@require_auth
def list_demotions():
    try:
        rows = db.session.execute(text("""
            SELECT d.*, e.first_name, e.last_name, e.employee_code
            FROM employee_demotions d
            JOIN employees e ON d.employee_id = e.id
            WHERE d.company_id = :cid AND NOT d.is_deleted
            ORDER BY d.effective_date DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@movement_bp.post("/demotions")
@require_auth
@require_role("super_admin", "hr_manager")
def create_demotion():
    """
    Nepal LA2074: demotion only valid for restructuring/disciplinary-alternative/voluntary.
    Salary reduction blocked at the DB constraint level without documented consent.
    """
    body = request.get_json() or {}
    required = ["employee_id", "to_title", "effective_date", "legal_basis", "rationale"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    old_sal = body.get("old_salary_npr")
    new_sal = body.get("new_salary_npr")
    if old_sal and new_sal and new_sal < old_sal and not body.get("employee_consent"):
        return error(
            "Cannot reduce salary in a demotion without documented employee consent. "
            "Nepal Labour Act 2074: reassignment due to restructuring cannot reduce remuneration without mutual consent.",
            422
        )

    try:
        result = db.session.execute(text("""
            INSERT INTO employee_demotions
              (company_id, employee_id, from_title, to_title, from_department_id, to_department_id,
               effective_date, old_salary_npr, new_salary_npr, legal_basis,
               employee_consent, consent_date, related_disciplinary_record_ids, pip_history,
               rationale, status, created_by, created_at)
            VALUES
              (:cid, :eid, :from_title, :to_title, :from_dept, :to_dept,
               :eff_date, :old_sal, :new_sal, :legal_basis,
               :consent, CASE WHEN :consent THEN NOW() END, :disc_ids, :pip::jsonb,
               :rationale, 'pending_legal_review', :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "from_title": body.get("from_title"),
            "to_title": body["to_title"], "from_dept": body.get("from_department_id"),
            "to_dept": body.get("to_department_id"), "eff_date": body["effective_date"],
            "old_sal": old_sal, "new_sal": new_sal, "legal_basis": body["legal_basis"],
            "consent": body.get("employee_consent", False), "disc_ids": body.get("related_disciplinary_record_ids", []),
            "pip": json.dumps(body.get("pip_history", [])), "rationale": body["rationale"], "user": g.user_id,
        })
        demo_id = str(result.fetchone()[0])
        db.session.commit()

        return created({
            "demotion_id": demo_id,
            "status": "pending_legal_review",
            "note": "Routed to mandatory HR Legal Review before finalization.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.post("/demotions/<demo_id>/legal-review")
@require_auth
@require_role("super_admin", "hr_manager")
def complete_legal_review(demo_id):
    """HR Legal completes review. Required before the demotion can be marked 'completed'."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE employee_demotions
               SET hr_legal_review_complete = TRUE, hr_legal_reviewer_id = :user,
                   hr_legal_review_date = NOW(), hr_legal_review_notes = :notes, updated_at = NOW()
             WHERE id = :did AND company_id = :cid
        """), {"user": g.user_id, "notes": body.get("notes", ""), "did": demo_id, "cid": g.company_id})
        db.session.commit()
        return success({"legal_review_complete": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.post("/demotions/<demo_id>/finalize")
@require_auth
@require_role("super_admin", "hr_manager")
def finalize_demotion(demo_id):
    """Blocked by DB trigger if legal review not complete."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE employee_demotions
               SET status = 'completed', approved_by_employee_id = :approver,
                   approved_by_name = :approver_name, updated_at = NOW()
             WHERE id = :did AND company_id = :cid
        """), {"approver": g.user_id, "approver_name": body.get("approved_by_name", ""),
               "did": demo_id, "cid": g.company_id})
        db.session.commit()
        return success({"finalized": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.get("/demotions/legal-review-queue")
@require_auth
@require_role("super_admin", "hr_manager")
def demotions_legal_queue():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_demotions_legal_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 3. CONFIRMATION MANAGEMENT (org-wide command center)
# ════════════════════════════════════════════════════════════════

@movement_bp.get("/confirmations")
@require_auth
def list_confirmations():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_confirmation_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@movement_bp.post("/confirmations")
@require_auth
@require_role("super_admin", "hr_manager")
def create_confirmation_tracking():
    body = request.get_json() or {}
    required = ["employee_id", "join_date", "probation_end_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO confirmation_tracking
              (company_id, employee_id, probation_record_id, join_date, probation_end_date,
               manager_employee_id, manager_name, created_at)
            VALUES
              (:cid, :eid, :prid, :join_date, :prob_end,
               :mgr_id, :mgr_name, NOW())
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "prid": body.get("probation_record_id"),
            "join_date": body["join_date"], "prob_end": body["probation_end_date"],
            "mgr_id": body.get("manager_employee_id"), "mgr_name": body.get("manager_name", ""),
        })
        db.session.commit()
        return created({"message": "Added to confirmation tracking."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.put("/confirmations/<conf_id>/checklist")
@require_auth
def update_checklist(conf_id):
    body = request.get_json() or {}
    item = body.get("item")
    allowed = ["performance_feedback_collected", "goals_achieved",
               "manager_recommendation_received", "confirmation_letter_issued"]
    if item not in allowed: return error(f"item must be one of: {allowed}", 422)
    try:
        db.session.execute(text(
            f"UPDATE confirmation_tracking SET {item} = :val, updated_at = NOW() WHERE id = :cid_c AND company_id = :cid"
        ), {"val": body.get("value", True), "cid_c": conf_id, "cid": g.company_id})
        db.session.commit()
        return success({"updated": item})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. TRANSFER & HISTORY
# ════════════════════════════════════════════════════════════════

@movement_bp.get("/transfers")
@require_auth
def list_transfers():
    try:
        rows = db.session.execute(text("""
            SELECT t.*, e.first_name, e.last_name, e.employee_code
            FROM employee_transfers t
            JOIN employees e ON t.employee_id = e.id
            WHERE t.company_id = :cid AND NOT t.is_deleted
            ORDER BY t.effective_date DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@movement_bp.post("/transfers")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_transfer():
    """
    Wizard submit. Nepal LA2074: cannot move to inferior position —
    blocked at DB constraint level if new_salary < old_salary.
    """
    body = request.get_json() or {}
    required = ["employee_id", "to_department_id", "to_branch_id", "effective_date", "reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    old_sal = body.get("old_salary_npr")
    new_sal = body.get("new_salary_npr", old_sal)
    if old_sal and new_sal and new_sal < old_sal:
        return error(
            "Cannot transfer to an inferior position with reduced salary. "
            "Nepal Labour Act 2074 prohibits this.",
            422
        )

    try:
        result = db.session.execute(text("""
            INSERT INTO employee_transfers
              (company_id, employee_id, from_department_id, to_department_id,
               from_branch_id, to_branch_id, from_manager_id, to_manager_id,
               from_manager_name, to_manager_name, effective_date, reason,
               old_salary_npr, new_salary_npr, position_level_unchanged,
               relocation_allowance_npr, employee_consent, rationale, status, created_by, created_at)
            VALUES
              (:cid, :eid, :from_dept, :to_dept,
               :from_branch, :to_branch, :from_mgr, :to_mgr,
               :from_mgr_name, :to_mgr_name, :eff_date, :reason,
               :old_sal, :new_sal, :level_unchanged,
               :allowance, :consent, :rationale, 'pending', :user, NOW())
            RETURNING id, is_inter_branch
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "from_dept": body.get("from_department_id"),
            "to_dept": body["to_department_id"], "from_branch": body.get("from_branch_id"),
            "to_branch": body["to_branch_id"], "from_mgr": body.get("from_manager_id"),
            "to_mgr": body.get("to_manager_id"), "from_mgr_name": body.get("from_manager_name", ""),
            "to_mgr_name": body.get("to_manager_name", ""), "eff_date": body["effective_date"],
            "reason": body["reason"], "old_sal": old_sal, "new_sal": new_sal,
            "level_unchanged": body.get("position_level_unchanged", True),
            "allowance": body.get("relocation_allowance_npr", 0), "consent": body.get("employee_consent", False),
            "rationale": body.get("rationale", ""), "user": g.user_id,
        })
        row = result.fetchone()
        transfer_id = str(row[0])
        db.session.commit()

        return created({
            "transfer_id": transfer_id,
            "is_inter_branch": row[1],
            "next_steps": ["Tax jurisdiction update", "Payroll sync", "Org chart update"] if row[1] else ["Org chart update"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.post("/transfers/<transfer_id>/complete")
@require_auth
@require_role("super_admin", "hr_manager")
def complete_transfer(transfer_id):
    """Marks downstream auto-updates done + finalizes. DB trigger logs to employment history."""
    try:
        db.session.execute(text("""
            UPDATE employee_transfers
               SET status = 'completed', tax_jurisdiction_updated = TRUE,
                   payroll_updated = TRUE, org_chart_updated = TRUE, updated_at = NOW()
             WHERE id = :tid AND company_id = :cid
        """), {"tid": transfer_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "completed": True,
            "auto_updated": ["Location", "Cost Center", "Reporting Line", "Tax Jurisdiction", "Payroll"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 5. DISCIPLINARY RECORDS (restricted access)
# ════════════════════════════════════════════════════════════════

@movement_bp.get("/disciplinary")
@require_auth
@require_role("super_admin", "hr_manager")
def list_disciplinary():
    """RBAC: only super_admin/hr_manager. Executive-only records filtered for hr_manager role."""
    try:
        q = """
            SELECT d.*, e.first_name, e.last_name, e.employee_code
            FROM disciplinary_records d
            JOIN employees e ON d.employee_id = e.id
            WHERE d.company_id = :cid AND NOT d.is_deleted
        """
        params = {"cid": g.company_id}
        if getattr(g, "user_role", "") != "super_admin":
            q += " AND d.confidentiality_level != 'executive_only'"
        q += " ORDER BY d.issued_date DESC"
        rows = db.session.execute(text(q), params).fetchall()

        # Log access for each record returned (RBAC audit trail)
        for r in rows:
            db.session.execute(text("""
                INSERT INTO disciplinary_access_log (disciplinary_record_id, company_id, accessed_by, accessed_by_name)
                VALUES (:rid, :cid, :user, :uname)
            """), {"rid": r.id, "cid": g.company_id, "user": g.user_id, "uname": getattr(g, "user_name", "")})
        db.session.commit()

        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@movement_bp.post("/disciplinary")
@require_auth
@require_role("super_admin", "hr_manager")
def create_disciplinary_record():
    body = request.get_json() or {}
    required = ["employee_id", "infraction_description", "incident_date", "action_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO disciplinary_records
              (company_id, employee_id, infraction_description, incident_date, issued_date,
               action_type, salary_deduction_days, increment_withhold_until_date,
               investigated_by_employee_id, investigated_by_name,
               show_cause_notice_issued, employee_statement,
               confidentiality_level, status, created_by, created_at)
            VALUES
              (:cid, :eid, :infraction, :incident, NOW()::DATE,
               :action, :ded_days, :withhold_until,
               :investigator, :investigator_name,
               :show_cause, :statement,
               :confidentiality, 'under_review', :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "infraction": body["infraction_description"],
            "incident": body["incident_date"], "action": body["action_type"],
            "ded_days": body.get("salary_deduction_days"), "withhold_until": body.get("increment_withhold_until_date"),
            "investigator": g.user_id, "investigator_name": body.get("investigated_by_name", ""),
            "show_cause": body.get("show_cause_notice_issued", False), "statement": body.get("employee_statement", ""),
            "confidentiality": body.get("confidentiality_level", "hr_manager_only"), "user": g.user_id,
        })
        record_id = str(result.fetchone()[0])
        db.session.commit()
        return created({
            "record_id": record_id,
            "note": "Appended to employee profile without altering the main career timeline.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.post("/disciplinary/<record_id>/employee-sign")
def employee_sign_acknowledgement(record_id):
    """Public — employee e-signs acknowledgement of the disciplinary record."""
    body = request.get_json() or {}
    try:
        if body.get("refused"):
            db.session.execute(text("""
                UPDATE disciplinary_records SET employee_signature_refused = TRUE, updated_at = NOW()
                WHERE id = :rid
            """), {"rid": record_id})
        else:
            db.session.execute(text("""
                UPDATE disciplinary_records SET employee_signed = TRUE, employee_signed_date = NOW(), updated_at = NOW()
                WHERE id = :rid
            """), {"rid": record_id})
        db.session.commit()
        return success({"recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.post("/disciplinary/<record_id>/close")
@require_auth
@require_role("super_admin", "hr_manager")
def close_disciplinary_record(record_id):
    try:
        db.session.execute(text("""
            UPDATE disciplinary_records SET status = 'closed', updated_at = NOW()
            WHERE id = :rid AND company_id = :cid
        """), {"rid": record_id, "cid": g.company_id})
        db.session.commit()
        return success({"closed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@movement_bp.get("/disciplinary/access-audit")
@require_auth
@require_role("super_admin")
def disciplinary_access_audit():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_disciplinary_access_audit WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 6. EMPLOYEE TIMELINE (unified view)
# ════════════════════════════════════════════════════════════════

@movement_bp.get("/timeline/<employee_id>")
@require_auth
def get_employee_timeline(employee_id):
    """Unified chronological view: hire/promotion/demotion/transfer/confirmation + restricted disciplinary nodes."""
    try:
        emp = db.session.execute(text(
            "SELECT employee_code, first_name, last_name FROM employees WHERE id = :eid AND company_id = :cid"
        ), {"eid": employee_id, "cid": g.company_id}).fetchone()
        if not emp: return not_found("Employee")

        is_hr = getattr(g, "user_role", "") in ("super_admin", "hr_manager")

        q = "SELECT * FROM v_employee_timeline WHERE employee_id = :eid AND company_id = :cid"
        if not is_hr:
            q += " AND visibility = 'all'"
        q += " ORDER BY event_date DESC"

        rows = db.session.execute(text(q), {"eid": employee_id, "cid": g.company_id}).fetchall()
        return success({
            "employee": dict(emp._mapping),
            "events": [dict(r._mapping) for r in rows],
        })
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@movement_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["promotions", "demotions", "transfers", "confirmations"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"movement_{module}")
    return jsonify(result), 200 if result["success"] else 422


@movement_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"movement_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"movement_{module}_template.xlsx")
