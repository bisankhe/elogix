"""
FILE: backend/routes/ess_attendance_leave_resignation_routes.py
eLogix HRMS -- HR Services & Support > Employee Self Service (ESS),
second batch (8 pages: Things to Do, My Attendance, Attendance
Request, My Leave, Leave Request, My Resignation, Letter Request,
Cash Advance)
URL prefix: /api/v1/ess2

Leave Request reuses the EXISTING LeaveRequestPage.jsx and its
existing backend routes entirely -- nothing duplicated here. Attendance
Request extends missed_punch_requests; Cash Advance extends
salary_advances with the brief's explicit 3-tier chain.

Nepal legal grounding: Section 20 (OT 1.5x, capped 24h/week; comp-off);
Sections 40-49 (leave entitlements); Section 127 (resignation, 15-day
acknowledgment); Sections 34-35 (deduction rules for cash advance).
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import build_template_xlsx
from ..ai.insights import generate_ai_insights

ess2_bp = Blueprint("ess_attendance_leave_resignation", __name__, url_prefix="/api/v1/ess2")


# ════════════════════════════════════════════════════════════════
# PAGE 1: THINGS TO DO
# ════════════════════════════════════════════════════════════════

@ess2_bp.get("/things-to-do/<employee_id>")
def things_to_do(employee_id):
    """Public/ESS -- unified task feed, a pure UNION across many existing tables."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_things_to_do WHERE employee_id = :eid LIMIT 30"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess2_bp.post("/ai-ask")
def ai_ask():
    """Public/ESS -- 'How many leave days do I have left?' style instant chatbot answers."""
    body = request.get_json() or {}
    if not body.get("question"): return error("question required", 422)
    try:
        insight = generate_ai_insights({"type": "ess_quick_question", "question": body["question"], "employee_id": body.get("employee_id")})
        return success({"answer": insight.get("answer")})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: MY ATTENDANCE (pure read over EXISTING daily_attendance_records)
# ════════════════════════════════════════════════════════════════

@ess2_bp.get("/attendance/<employee_id>")
def my_attendance(employee_id):
    month = request.args.get("month")
    try:
        q = "SELECT * FROM daily_attendance_records WHERE employee_id = :eid"
        params = {"eid": employee_id}
        if month: q += " AND to_char(attendance_date,'YYYY-MM') = :month"; params["month"] = month
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 3: ATTENDANCE REQUEST (extends EXISTING missed_punch_requests)
# ════════════════════════════════════════════════════════════════

@ess2_bp.get("/attendance-requests/<employee_id>")
def my_attendance_requests(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_attendance_requests WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess2_bp.post("/attendance-requests")
def submit_attendance_request():
    """Public/ESS -- covers missed_punch, overtime_claim, and comp_off in one endpoint."""
    body = request.get_json() or {}
    required = ["employee_id", "request_type", "request_date", "comment"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO missed_punch_requests (company_id, employee_id, request_date, request_type, punch_type, requested_time,
                                                reason_category, comment, overtime_hours_claimed, comp_off_work_date, comp_off_was_holiday, created_at)
            VALUES (:cid, :eid, :date, :rtype, :punch, :time, :reason, :comment, :ot_hours, :comp_date, :was_holiday, NOW())
            RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "date": body["request_date"], "rtype": body["request_type"],
               "punch": body.get("punch_type", "clock_in"), "time": body.get("requested_time"), "reason": body.get("reason_category", "other"),
               "comment": body["comment"], "ot_hours": body.get("overtime_hours_claimed"), "comp_date": body.get("comp_off_work_date"),
               "was_holiday": body.get("comp_off_was_holiday")})
        req_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"request_id": req_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: MY LEAVE (pure read over EXISTING employee_leave_balances)
# ════════════════════════════════════════════════════════════════

@ess2_bp.get("/leave-balance/<employee_id>")
def my_leave_balance(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM employee_leave_balances WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# PAGE 5: LEAVE REQUEST -- intentionally NOT duplicated here.
# The existing LeaveRequestPage.jsx and its established backend routes
# (registered under the Leave Operations module) already fully cover
# this page's requirements.


# ════════════════════════════════════════════════════════════════
# PAGE 6: MY RESIGNATION (Section 127, genuinely new)
# ════════════════════════════════════════════════════════════════

@ess2_bp.get("/resignation/<employee_id>")
def my_resignation(employee_id):
    try:
        row = db.session.execute(text(
            "SELECT * FROM v_my_resignation_detail WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


@ess2_bp.post("/resignation")
def submit_resignation():
    """
    Public/ESS -- the formal Section 127 written notice. DB trigger
    sets the 15-day acknowledgment deadline AND simultaneously notifies
    HR, manager, and auto-seeds the clearance checklist.
    """
    body = request.get_json() or {}
    required = ["employee_id", "last_working_day", "reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO resignation_requests (company_id, employee_id, last_working_day, reason, submitted_at)
            VALUES (:cid, :eid, :lwd, :reason, NOW()) RETURNING id, acknowledgment_deadline
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "lwd": body["last_working_day"], "reason": body["reason"]})
        row = result.fetchone()
        db.session.commit()
        return created({"resignation_id": str(row[0]), "acknowledgment_deadline": str(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ess2_bp.put("/resignation/<resignation_id>/acknowledge")
@require_auth
@require_role("super_admin", "hr_manager")
def acknowledge_resignation(resignation_id):
    try:
        db.session.execute(text("""
            UPDATE resignation_requests SET acknowledged = TRUE, acknowledged_at = NOW() WHERE id = :rid AND company_id = :cid
        """), {"rid": resignation_id, "cid": g.company_id})
        db.session.commit()
        return success({"acknowledged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ess2_bp.put("/resignation/clearance/<item_id>/complete")
@require_auth
def complete_clearance_item(item_id):
    try:
        db.session.execute(text("""
            UPDATE resignation_clearance_items SET status = 'completed', completed_at = NOW() WHERE id = :iid
        """), {"iid": item_id})
        db.session.commit()
        return success({"completed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 7: LETTER REQUEST (distinct from government_letters_routes)
# ════════════════════════════════════════════════════════════════

@ess2_bp.get("/letter-requests/<employee_id>")
def my_letter_requests(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_letter_requests WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess2_bp.post("/letter-requests")
def request_letter():
    """
    Public/ESS -- auto-generated letter types (Salary Certificate,
    Employment Verification, Bank Reference) skip approval via the DB
    trigger; NOC/Experience Letter route to pending_approval.
    """
    body = request.get_json() or {}
    required = ["employee_id", "letter_type", "purpose"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    auto_types = {"Salary Certificate", "Employment Verification Letter", "Bank Reference Letter"}
    try:
        result = db.session.execute(text("""
            INSERT INTO internal_letter_requests (company_id, employee_id, letter_type, purpose, auto_generated, requested_at)
            VALUES (:cid, :eid, :ltype, :purpose, :auto, NOW()) RETURNING id, status
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "ltype": body["letter_type"],
               "purpose": body["purpose"], "auto": body["letter_type"] in auto_types})
        row = result.fetchone()
        db.session.commit()
        return created({"letter_request_id": str(row[0]), "status": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ess2_bp.put("/letter-requests/<request_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_letter_request(request_id):
    try:
        db.session.execute(text("""
            UPDATE internal_letter_requests SET status = 'ready', approved_by = :user, ready_at = NOW()
            WHERE id = :rid AND company_id = :cid
        """), {"user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 8: CASH ADVANCE (extends EXISTING salary_advances)
# ════════════════════════════════════════════════════════════════

@ess2_bp.get("/cash-advances/<employee_id>")
def my_cash_advances(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_cash_advances WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess2_bp.post("/cash-advances")
def request_cash_advance():
    """Public/ESS -- reuses the EXISTING salary_advances cap logic (50% of expected net pay)."""
    body = request.get_json() or {}
    required = ["employee_id", "expected_net_pay_npr", "requested_npr", "reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO salary_advances (company_id, employee_id, expected_net_pay_npr, requested_npr, reason, repayment_installments, deduction_pay_period, created_at)
            VALUES (:cid, :eid, :netpay, :amount, :reason, :installments, :period, NOW())
            RETURNING id, exceeds_cap, max_allowed_npr
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "netpay": body["expected_net_pay_npr"],
               "amount": body["requested_npr"], "reason": body["reason"], "installments": body.get("repayment_installments", 1),
               "period": body.get("deduction_pay_period")})
        row = result.fetchone()
        db.session.commit()
        return created({"advance_id": str(row[0]), "exceeds_cap": row[1], "max_allowed_npr": float(row[2])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ess2_bp.put("/cash-advances/<advance_id>/advance-stage")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def advance_cash_advance_stage(advance_id):
    """
    Moves the request through supervisor_review -> hr_review -> approved.
    DB trigger blocks final approval if the amount exceeds the cap.
    """
    body = request.get_json() or {}
    if not body.get("next_stage"): return error("next_stage required", 422)
    try:
        db.session.execute(text("""
            UPDATE salary_advances SET approval_stage = :stage WHERE id = :aid AND company_id = :cid
        """), {"stage": body["next_stage"], "aid": advance_id, "cid": g.company_id})
        db.session.commit()
        return success({"advanced": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)  # likely the cap-exceeded trigger firing


# ── Excel export ───────────────────────────────────────
@ess2_bp.get("/excel-export/<module>")
@require_auth
def excel_export(module):
    allowed = ["attendance", "leave", "resignation", "letters", "cash-advances"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"ess2_{module}_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"ess_{module}_export.xlsx")
