"""
FILE: backend/routes/exit_management_routes.py
eLogix HRMS — Offboarding > Exit Management Module (5 pages)
URL prefix: /api/v1/exit

  1. /resignations        — Resignation Management (notice calc, 15-day rule)
  2. /clearances             — Exit Clearance (cross-departmental, F&F freeze)
  3. /asset-returns             — Asset Return (24-48hr wipe window)
  4. /interviews                  — Exit Interview (AI sentiment)
  5. /knowledge-transfer             — Knowledge Transfer (checklist + sign-off)

Nepal Labour Act 2074: notice period 1/7/30 days by tenure, 15-day silent
acceptance, deduction for shortfall, F&F includes leave encashment + SSF.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date, timedelta
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

exit_bp = Blueprint("exit_management", __name__, url_prefix="/api/v1/exit")


def _required_notice_days(tenure_years: float) -> int:
    """Nepal LA2074: 1 day (<4wk), 7 days (4wk-1yr), 30 days (>1yr)."""
    if tenure_years is None: return 30
    if tenure_years < (4 / 52): return 1
    if tenure_years < 1: return 7
    return 30


# ════════════════════════════════════════════════════════════════
# 1. RESIGNATION MANAGEMENT
# ════════════════════════════════════════════════════════════════

@exit_bp.get("/resignations")
@require_auth
def list_resignations():
    status = request.args.get("status")
    try:
        q = """
            SELECT r.*, e.first_name, e.last_name, e.employee_code
            FROM employee_resignations r
            JOIN employees e ON r.employee_id = e.id
            WHERE r.company_id = :cid AND NOT r.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND r.status = :status"; params["status"] = status
        q += " ORDER BY r.submitted_date DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@exit_bp.post("/resignations")
@require_auth
def submit_resignation():
    """Self-service submission. DB generated columns auto-calc notice/deduction/deadline."""
    body = request.get_json() or {}
    required = ["employee_id", "proposed_last_working_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        emp = db.session.execute(text(
            "SELECT join_date FROM employees WHERE id = :eid AND company_id = :cid"
        ), {"eid": body["employee_id"], "cid": g.company_id}).fetchone()
        tenure = None
        if emp and emp.join_date:
            tenure = (date.today() - emp.join_date).days / 365.25

        result = db.session.execute(text("""
            INSERT INTO employee_resignations
              (company_id, employee_id, submitted_date, tenure_years_at_resignation,
               reason_category, resignation_letter_url, resignation_notes,
               proposed_last_working_date, status, created_at)
            VALUES
              (:cid, :eid, NOW()::DATE, :tenure,
               :reason, :letter_url, :notes,
               :lwd, 'pending_acceptance', NOW())
            RETURNING id, required_notice_days, notice_shortfall_days, deduction_npr, employer_acceptance_deadline
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "tenure": tenure,
            "reason": body.get("reason_category", "other"), "letter_url": body.get("resignation_letter_url"),
            "notes": body.get("resignation_notes", ""), "lwd": body["proposed_last_working_date"],
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "resignation_id": str(row[0]),
            "required_notice_days": row[1],
            "notice_shortfall_days": row[2],
            "deduction_npr": float(row[3]) if row[3] else 0,
            "employer_acceptance_deadline": str(row[4]),
            "la2074_note": f"Required notice: {row[1]} days based on tenure. Employer must respond by {row[4]} or resignation auto-accepts.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.post("/resignations/<resignation_id>/accept")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def accept_resignation(resignation_id):
    """Manager/HR formally accepts. DB trigger auto-creates exit_clearances shell."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE employee_resignations
               SET status = 'accepted', employer_responded = TRUE, response_date = NOW()::DATE,
                   final_lwd = COALESCE(:final_lwd, proposed_last_working_date), updated_at = NOW()
             WHERE id = :rid AND company_id = :cid
        """), {"final_lwd": body.get("final_lwd"), "rid": resignation_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "accepted": True,
            "downstream_triggered": ["Exit Clearance initiated (IT, Finance, Facilities, HR)"],
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.get("/resignations/alerts")
@require_auth
@require_role("super_admin", "hr_manager")
def resignation_alerts():
    """15-day auto-accept deadline tracker."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_resignation_alerts WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 2. EXIT CLEARANCE (cross-departmental)
# ════════════════════════════════════════════════════════════════

@exit_bp.get("/clearances")
@require_auth
def list_clearances():
    try:
        clearances = db.session.execute(text("""
            SELECT c.*, e.first_name, e.last_name, e.employee_code
            FROM exit_clearances c
            JOIN employees e ON c.employee_id = e.id
            WHERE c.company_id = :cid AND NOT c.is_deleted
            ORDER BY c.ff_frozen DESC, c.last_working_date
        """), {"cid": g.company_id}).fetchall()
        result = []
        for c in clearances:
            depts = db.session.execute(text(
                "SELECT * FROM exit_clearance_departments WHERE exit_clearance_id = :cid_e"
            ), {"cid_e": c.id}).fetchall()
            d = dict(c._mapping)
            d["departments"] = {dp.department: dict(dp._mapping) for dp in depts}
            result.append(d)
        return success(result)
    except Exception:
        return success([])


@exit_bp.get("/clearances/kanban")
@require_auth
def clearance_kanban():
    """Cross-departmental Kanban swimlanes (Pending IT / Pending Finance / Pending Facilities)."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_exit_clearance_kanban WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        swimlanes = {"it": [], "finance": [], "facilities": [], "hr": []}
        for r in data:
            if r["dept_status"] == "pending":
                swimlanes[r["department"]].append(r)
        return success({"all": data, "pending_swimlanes": swimlanes})
    except Exception:
        return success({"all": [], "pending_swimlanes": {}})


@exit_bp.put("/clearances/departments/<dept_id>/clear")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def clear_department(dept_id):
    """
    Single department sign-off. DB triggers:
    - blocks IT clearance if assets still pending return
    - auto-unfreezes F&F once all 4 departments cleared
    """
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE exit_clearance_departments
               SET status = 'cleared', cleared_by = :user, cleared_date = NOW(),
                   notes = :notes, updated_at = NOW()
             WHERE id = :did AND company_id = :cid
        """), {"user": g.user_id, "notes": body.get("notes", ""), "did": dept_id, "cid": g.company_id})
        db.session.commit()
        return success({"cleared": True})
    except Exception as e:
        db.session.rollback()
        return error(
            str(e) if "assets still pending" not in str(e).lower()
            else "Cannot clear IT: assets still pending return. Complete Asset Return first.",
            422
        )


@exit_bp.put("/clearances/<clearance_id>/finalize-settlement")
@require_auth
@require_role("super_admin", "hr_manager")
def finalize_settlement(clearance_id):
    """Records F&F components — only effective once ff_frozen = FALSE (all cleared)."""
    body = request.get_json() or {}
    try:
        row = db.session.execute(text(
            "SELECT ff_frozen FROM exit_clearances WHERE id = :cid_e AND company_id = :cid"
        ), {"cid_e": clearance_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Exit clearance")
        if row.ff_frozen:
            return error("Full & Final settlement is frozen until all departments clear.", 422)

        db.session.execute(text("""
            UPDATE exit_clearances
               SET unpaid_salary_npr = :salary, leave_encashment_npr = :leave,
                   overtime_pay_npr = :ot, ssf_finalized = TRUE, ssf_withdrawal_initiated = TRUE,
                   updated_at = NOW()
             WHERE id = :cid_e AND company_id = :cid
        """), {"salary": body.get("unpaid_salary_npr", 0), "leave": body.get("leave_encashment_npr", 0),
               "ot": body.get("overtime_pay_npr", 0), "cid_e": clearance_id, "cid": g.company_id})
        db.session.commit()
        return success({"settlement_finalized": True, "ssf_withdrawal_initiated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. ASSET RETURN
# ════════════════════════════════════════════════════════════════

@exit_bp.get("/asset-returns")
@require_auth
def list_asset_returns():
    try:
        returns = db.session.execute(text("""
            SELECT r.*, e.first_name, e.last_name
            FROM exit_asset_returns r
            JOIN employees e ON r.employee_id = e.id
            WHERE r.company_id = :cid AND NOT r.is_deleted
            ORDER BY r.last_working_date
        """), {"cid": g.company_id}).fetchall()
        result = []
        for r in returns:
            items = db.session.execute(text(
                "SELECT * FROM exit_asset_return_items WHERE exit_asset_return_id = :rid"
            ), {"rid": r.id}).fetchall()
            d = dict(r._mapping)
            d["items"] = [dict(i._mapping) for i in items]
            result.append(d)
        return success(result)
    except Exception:
        return success([])


@exit_bp.post("/asset-returns/initialize")
@require_auth
@require_role("super_admin", "hr_manager")
def initialize_asset_return():
    """Auto-populates from employee's currently assigned employee_assets (reverse of onboarding)."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        assigned = db.session.execute(text("""
            SELECT id, item_type, model, serial_number FROM employee_assets
            WHERE employee_id = :eid AND status = 'assigned' AND NOT is_deleted
        """), {"eid": body["employee_id"]}).fetchall()

        result = db.session.execute(text("""
            INSERT INTO exit_asset_returns (company_id, employee_id, exit_clearance_id, last_working_date, created_at)
            VALUES (:cid, :eid, :clr_id, :lwd, NOW())
            RETURNING id
        """), {"cid": g.company_id, "eid": body["employee_id"], "clr_id": body.get("exit_clearance_id"),
               "lwd": body.get("last_working_date")})
        return_id = str(result.fetchone()[0])

        for a in assigned:
            db.session.execute(text("""
                INSERT INTO exit_asset_return_items
                  (exit_asset_return_id, company_id, original_asset_id, item_type, model, serial_number, status, created_at)
                VALUES (:rid, :cid, :asset_id, :item, :model, :serial, 'pending', NOW())
            """), {"rid": return_id, "cid": g.company_id, "asset_id": a.id, "item": a.item_type,
                   "model": a.model, "serial": a.serial_number})

        db.session.commit()
        return created({"return_id": return_id, "items_pulled_from_onboarding": len(assigned)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.put("/asset-returns/items/<item_id>/mark-returned")
@require_auth
def mark_item_returned(item_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE exit_asset_return_items
               SET status = 'returned', condition_notes = :cond, return_photo_url = :photo,
                   returned_date = NOW()::DATE, updated_at = NOW()
             WHERE id = :iid
        """), {"cond": body.get("condition_notes", "Good"), "photo": body.get("return_photo_url"), "iid": item_id})
        db.session.commit()
        return success({"returned": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.put("/asset-returns/items/<item_id>/mark-wiped")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_item_wiped(item_id):
    """IT confirms 24-48hr data wipe complete — greenlights settlement progression."""
    try:
        db.session.execute(text("""
            UPDATE exit_asset_return_items
               SET data_wiped = TRUE, data_wiped_date = NOW()::DATE, data_wiped_by = :user, updated_at = NOW()
             WHERE id = :iid
        """), {"user": g.user_id, "iid": item_id})
        db.session.commit()
        return success({"wiped": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.get("/asset-returns/compliance")
@require_auth
@require_role("super_admin", "hr_manager")
def asset_return_compliance():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_asset_return_compliance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        flagged = [r for r in data if r["compliance_flag"] != "OK"]
        return success({"records": data, "flagged": flagged})
    except Exception:
        return success({"records": [], "flagged": []})


# ════════════════════════════════════════════════════════════════
# 4. EXIT INTERVIEW
# ════════════════════════════════════════════════════════════════

@exit_bp.get("/interviews")
@require_auth
def list_interviews():
    try:
        rows = db.session.execute(text("""
            SELECT i.*, e.first_name, e.last_name
            FROM exit_interviews i
            JOIN employees e ON i.employee_id = e.id
            WHERE i.company_id = :cid AND NOT i.is_deleted
            ORDER BY i.interview_date DESC NULLS LAST
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@exit_bp.post("/interviews")
@require_auth
@require_role("super_admin", "hr_manager")
def schedule_interview():
    """Best practice: conducted_by must never equal employee's direct manager."""
    body = request.get_json() or {}
    required = ["employee_id", "conducted_by_employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    emp = db.session.execute(text(
        "SELECT manager_id FROM employees WHERE id = :eid"
    ), {"eid": body["employee_id"]}).fetchone()
    if emp and emp.manager_id == body["conducted_by_employee_id"]:
        return error("Exit interviews must be conducted by a neutral HR professional, never the direct manager.", 422)

    try:
        db.session.execute(text("""
            INSERT INTO exit_interviews
              (company_id, employee_id, interview_date, conducted_by_employee_id, conducted_by_name,
               mode, status, created_at)
            VALUES
              (:cid, :eid, :date, :conductor, :conductor_name,
               :mode, 'scheduled', NOW())
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "date": body.get("interview_date"),
            "conductor": body["conducted_by_employee_id"], "conductor_name": body.get("conducted_by_name", ""),
            "mode": body.get("mode", "in_person"),
        })
        db.session.commit()
        return created({"message": "Interview scheduled."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.post("/interviews/<interview_id>/submit-responses")
@require_auth
def submit_interview_responses(interview_id):
    """Submits structured responses + open feedback. Runs AI sentiment analysis."""
    body = request.get_json() or {}
    try:
        insight = generate_ai_insights({
            "type": "exit_interview_sentiment",
            "responses": body.get("responses", {}),
            "open_feedback": body.get("open_feedback_text", ""),
        })

        db.session.execute(text("""
            UPDATE exit_interviews
               SET overall_satisfaction = :s1, management_quality = :s2, growth_opportunities = :s3,
                   compensation_fairness = :s4, would_recommend = :s5,
                   open_feedback_text = :feedback,
                   ai_sentiment = :sentiment, ai_sentiment_score = :score, ai_key_themes = :themes::jsonb,
                   rehire_eligible = :rehire, status = 'completed', updated_at = NOW()
             WHERE id = :iid AND company_id = :cid
        """), {
            "s1": body.get("responses", {}).get("overall_satisfaction"),
            "s2": body.get("responses", {}).get("management_quality"),
            "s3": body.get("responses", {}).get("growth_opportunities"),
            "s4": body.get("responses", {}).get("compensation_fairness"),
            "s5": body.get("responses", {}).get("would_recommend"),
            "feedback": body.get("open_feedback_text", ""),
            "sentiment": insight.get("sentiment", "mixed"), "score": insight.get("sentiment_score", 50),
            "themes": json.dumps(insight.get("key_themes", [])), "rehire": body.get("rehire_eligible"),
            "iid": interview_id, "cid": g.company_id,
        })
        db.session.commit()

        return success({
            "ai_sentiment": insight.get("sentiment"), "ai_sentiment_score": insight.get("sentiment_score"),
            "key_themes": insight.get("key_themes", []),
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.get("/interviews/trends")
@require_auth
@require_role("super_admin", "hr_manager")
def interview_trends():
    """Anonymized aggregate trends for leadership."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_exit_interview_trends WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 5. KNOWLEDGE TRANSFER
# ════════════════════════════════════════════════════════════════

@exit_bp.get("/knowledge-transfer")
@require_auth
def list_kt_plans():
    try:
        plans = db.session.execute(text("""
            SELECT kt.*, e.first_name, e.last_name
            FROM knowledge_transfer_plans kt
            JOIN employees e ON kt.employee_id = e.id
            WHERE kt.company_id = :cid AND NOT kt.is_deleted
            ORDER BY kt.manager_signoff ASC, kt.last_working_date
        """), {"cid": g.company_id}).fetchall()
        result = []
        for p in plans:
            items = db.session.execute(text(
                "SELECT * FROM kt_checklist_items WHERE kt_plan_id = :pid"
            ), {"pid": p.id}).fetchall()
            d = dict(p._mapping)
            d["checklist"] = [dict(i._mapping) for i in items]
            result.append(d)
        return success(result)
    except Exception:
        return success([])


@exit_bp.post("/knowledge-transfer")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_kt_plan():
    body = request.get_json() or {}
    required = ["employee_id", "last_working_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        items = body.get("checklist_items", [])
        result = db.session.execute(text("""
            INSERT INTO knowledge_transfer_plans
              (company_id, employee_id, successor_employee_id, successor_name, manager_employee_id,
               overlap_days_scheduled, last_working_date, tasks_total, created_at)
            VALUES
              (:cid, :eid, :successor_id, :successor_name, :mgr_id,
               :overlap, :lwd, :tasks_total, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "successor_id": body.get("successor_employee_id"),
            "successor_name": body.get("successor_name", "TBD"), "mgr_id": body.get("manager_employee_id"),
            "overlap": body.get("overlap_days_scheduled", 0), "lwd": body["last_working_date"],
            "tasks_total": len(items),
        })
        plan_id = str(result.fetchone()[0])

        for item in items:
            db.session.execute(text("""
                INSERT INTO kt_checklist_items (kt_plan_id, company_id, item_description, created_at)
                VALUES (:pid, :cid, :desc, NOW())
            """), {"pid": plan_id, "cid": g.company_id, "desc": item})

        db.session.commit()
        return created({"plan_id": plan_id, "checklist_items": len(items)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.put("/knowledge-transfer/items/<item_id>/toggle")
@require_auth
def toggle_kt_item(item_id):
    body = request.get_json() or {}
    field = body.get("field")  # 'document_uploaded' or 'task_reassigned'
    if field not in ("document_uploaded", "task_reassigned"):
        return error("field must be 'document_uploaded' or 'task_reassigned'", 422)
    try:
        db.session.execute(text(
            f"UPDATE kt_checklist_items SET {field} = :val, updated_at = NOW() WHERE id = :iid"
        ), {"val": body.get("value", True), "iid": item_id})

        # Recalc plan's aggregate counters
        db.session.execute(text("""
            UPDATE knowledge_transfer_plans kt SET
                sop_documents_count = (SELECT COUNT(*) FROM kt_checklist_items WHERE kt_plan_id = kt.id AND document_uploaded),
                tasks_reassigned = (SELECT COUNT(*) FROM kt_checklist_items WHERE kt_plan_id = kt.id AND task_reassigned)
            WHERE kt.id = (SELECT kt_plan_id FROM kt_checklist_items WHERE id = :iid)
        """), {"iid": item_id})
        db.session.commit()
        return success({"toggled": field})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.post("/knowledge-transfer/<plan_id>/manager-signoff")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def kt_manager_signoff(plan_id):
    try:
        db.session.execute(text("""
            UPDATE knowledge_transfer_plans
               SET manager_signoff = TRUE, manager_signoff_date = NOW(), status = 'completed', updated_at = NOW()
             WHERE id = :pid AND company_id = :cid
        """), {"pid": plan_id, "cid": g.company_id})
        db.session.commit()
        return success({"signed_off": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@exit_bp.get("/knowledge-transfer/completion-status")
@require_auth
@require_role("super_admin", "hr_manager")
def kt_completion_status():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_kt_completion_status WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@exit_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["resignations", "clearances", "asset-returns", "interviews", "knowledge-transfer"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"exit_{module}")
    return jsonify(result), 200 if result["success"] else 422


@exit_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"exit_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"exit_{module}_template.xlsx")
