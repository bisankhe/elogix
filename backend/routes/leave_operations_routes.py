"""
FILE: backend/routes/leave_operations_routes.py
eLogix HRMS — Workforce Operations > Leave Management > Leave Operations (7 pages)
URL prefix: /api/v1/leave-operations

  1. /requests          — Leave Request
  2. /balance               — Leave Balance
  3. /approval                  — Leave Approval
  4. /calendar                      — Leave Calendar
  5. /holidays, /substitutes           — Holiday Management
  6. /half-day-policy                       — Half-Day Leave
  7. /adjustments                                — Leave Adjustment

Nepal Labour Act 2074: leave is a facility (not absolute right) except
Sick/Maternity/Mourning; substitute leave due within 21 days; pro-rata
for <1yr tenure; encashment above statutory accumulation caps.
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

leave_ops_bp = Blueprint("leave_operations", __name__, url_prefix="/api/v1/leave-operations")


# ════════════════════════════════════════════════════════════════
# 1. LEAVE REQUEST
# ════════════════════════════════════════════════════════════════

@leave_ops_bp.get("/requests/<employee_id>")
def my_requests(employee_id):
    """Public/ESS — employee's own request history."""
    try:
        rows = db.session.execute(text("""
            SELECT lr.*, lt.name AS leave_type_name FROM leave_requests lr
            JOIN leave_types lt ON lr.leave_type_id = lt.id
            WHERE lr.employee_id = :eid AND NOT lr.is_deleted
            ORDER BY lr.submitted_at DESC
        """), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_ops_bp.post("/requests")
def submit_request():
    """
    Public/ESS — wizard-style submission. DB trigger auto-computes
    balance-before/after preview, team overlap, and AI suggestion.
    """
    body = request.get_json() or {}
    required = ["employee_id", "leave_type_id", "start_date", "end_date", "reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    if body.get("is_half_day") and not body.get("half_day_period"):
        return error("half_day_period required when is_half_day is true", 422)

    try:
        emp = db.session.execute(text(
            "SELECT manager_id FROM employees WHERE id = :eid"
        ), {"eid": body["employee_id"]}).fetchone()

        hierarchy = db.session.execute(text("""
            SELECT id FROM leave_approval_hierarchies
            WHERE company_id = :cid AND is_active LIMIT 1
        """), {"cid": body.get("company_id")}).fetchone()

        result = db.session.execute(text("""
            INSERT INTO leave_requests
              (company_id, employee_id, leave_type_id, start_date, end_date,
               is_half_day, half_day_period, half_day_hours_worked,
               reason, supporting_document_url, approval_hierarchy_id, manager_employee_id, created_at)
            VALUES
              (:cid, :eid, :ltid, :start, :end,
               :half_day, :half_period, :half_hours,
               :reason, :doc, :hierarchy_id, :mgr_id, NOW())
            RETURNING id, total_days, balance_after_days, team_overlap_count, ai_suggestion, ai_suggestion_note
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "ltid": body["leave_type_id"],
            "start": body["start_date"], "end": body["end_date"], "half_day": body.get("is_half_day", False),
            "half_period": body.get("half_day_period"), "half_hours": body.get("half_day_hours_worked"),
            "reason": body["reason"], "doc": body.get("supporting_document_url"),
            "hierarchy_id": hierarchy.id if hierarchy else None, "mgr_id": emp.manager_id if emp else None,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "request_id": str(row[0]), "total_days": float(row[1]),
            "balance_after": float(row[2]) if row[2] else None,
            "team_overlap_count": row[3], "ai_suggestion": row[4], "ai_suggestion_note": row[5],
            "insufficient_balance_warning": "Insufficient balance for this request." if row[2] and row[2] < 0 else None,
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_ops_bp.put("/requests/<request_id>/cancel")
def cancel_request(request_id):
    """Public/ESS — employee cancels their own pending request."""
    try:
        db.session.execute(text("""
            UPDATE leave_requests SET status = 'cancelled', updated_at = NOW()
            WHERE id = :rid AND status = 'pending'
        """), {"rid": request_id})
        db.session.commit()
        return success({"cancelled": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. LEAVE BALANCE
# ════════════════════════════════════════════════════════════════

@leave_ops_bp.get("/balance/<employee_id>")
def get_balance_dashboard(employee_id):
    """Public/ESS — radial progress chart data source."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leave_balance_dashboard WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 3. LEAVE APPROVAL
# ════════════════════════════════════════════════════════════════

@leave_ops_bp.get("/approval/queue")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_queue():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leave_approval_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_ops_bp.put("/approval/<request_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_request(request_id):
    """DB trigger deducts the approved days from employee_leave_balances."""
    try:
        db.session.execute(text("""
            UPDATE leave_requests SET status = 'approved', decided_by = :user, updated_at = NOW()
            WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True, "synced_to": ["Leave Balance", "Leave Calendar"]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_ops_bp.put("/approval/<request_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reject_request(request_id):
    body = request.get_json() or {}
    if not body.get("rejection_reason"): return error("rejection_reason required", 422)
    try:
        db.session.execute(text("""
            UPDATE leave_requests
               SET status = 'rejected', decided_by = :user, rejection_reason = :reason, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "reason": body["rejection_reason"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_ops_bp.put("/approval/<request_id>/request-revision")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def request_revision(request_id):
    body = request.get_json() or {}
    if not body.get("revision_notes"): return error("revision_notes required", 422)
    try:
        db.session.execute(text("""
            UPDATE leave_requests
               SET status = 'revision_requested', revision_notes = :notes, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"notes": body["revision_notes"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"revision_requested": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. LEAVE CALENDAR
# ════════════════════════════════════════════════════════════════

@leave_ops_bp.get("/calendar")
@require_auth
def team_calendar():
    department_id = request.args.get("department_id")
    month = request.args.get("month")  # YYYY-MM
    try:
        q = "SELECT * FROM v_team_leave_calendar WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if department_id: q += " AND department_name = :dept"; params["dept"] = department_id
        if month: q += " AND TO_CHAR(start_date, 'YYYY-MM') = :month"; params["month"] = month
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 5. HOLIDAY MANAGEMENT
# ════════════════════════════════════════════════════════════════

@leave_ops_bp.get("/holidays")
@require_auth
def list_holidays():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM holiday_calendar WHERE company_id = :cid ORDER BY date_ad"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_ops_bp.post("/holidays")
@require_auth
@require_role("super_admin", "hr_manager")
def add_holiday():
    body = request.get_json() or {}
    required = ["name", "date_ad"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO holiday_calendar
              (company_id, name, name_nepali, date_bs, date_ad, year_bs, month_bs, type, category, created_at)
            VALUES
              (:cid, :name, :name_np, :date_bs, :date_ad, :year_bs, :month_bs, :type, :category, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "name": body["name"], "name_np": body.get("name_nepali"),
            "date_bs": body.get("date_bs"), "date_ad": body["date_ad"], "year_bs": body.get("year_bs"),
            "month_bs": body.get("month_bs"), "type": body.get("type", "statutory"),
            "category": body.get("category", "national"),
        })
        holiday_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"holiday_id": holiday_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_ops_bp.get("/substitutes")
@require_auth
@require_role("super_admin", "hr_manager")
def list_substitutes():
    """21-day substitute leave dashboard."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_substitute_leave_dashboard WHERE company_id = :cid ORDER BY substitute_due_by_date"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_ops_bp.post("/substitutes")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_substitute_entry():
    body = request.get_json() or {}
    required = ["employee_id", "holiday_calendar_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text(
            "SELECT fn_create_substitute_entry(:eid, :hcid, :cid) AS new_id"
        ), {"eid": body["employee_id"], "hcid": body["holiday_calendar_id"], "cid": g.company_id})
        new_id = str(result.fetchone().new_id)
        db.session.commit()
        return created({"substitute_entry_id": new_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_ops_bp.put("/substitutes/<entry_id>/mark-taken")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_substitute_taken(entry_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE substitute_leave_tracker
               SET status = 'taken', substitute_taken_date = :taken_date, updated_at = NOW()
             WHERE id = :eid AND company_id = :cid
        """), {"taken_date": body.get("substitute_taken_date", date.today().isoformat()), "eid": entry_id, "cid": g.company_id})
        db.session.commit()
        return success({"marked_taken": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 6. HALF-DAY LEAVE
# ════════════════════════════════════════════════════════════════

@leave_ops_bp.get("/half-day-policy")
@require_auth
def get_half_day_policy():
    try:
        row = db.session.execute(text(
            "SELECT * FROM half_day_policy_config WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        if not row:
            return success({"first_half_start": "09:00", "first_half_end": "13:00",
                            "second_half_start": "13:00", "second_half_end": "18:00", "min_hours_required": 4})
        return success(dict(row._mapping))
    except Exception:
        return success({"first_half_start": "09:00", "first_half_end": "13:00",
                        "second_half_start": "13:00", "second_half_end": "18:00", "min_hours_required": 4})


@leave_ops_bp.put("/half-day-policy")
@require_auth
@require_role("super_admin", "hr_manager")
def update_half_day_policy():
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            INSERT INTO half_day_policy_config
              (company_id, first_half_start, first_half_end, second_half_start, second_half_end, min_hours_required, updated_at)
            VALUES
              (:cid, :fhs, :fhe, :shs, :she, :min_hrs, NOW())
            ON CONFLICT (company_id)
            DO UPDATE SET first_half_start = EXCLUDED.first_half_start, first_half_end = EXCLUDED.first_half_end,
                          second_half_start = EXCLUDED.second_half_start, second_half_end = EXCLUDED.second_half_end,
                          min_hours_required = EXCLUDED.min_hours_required, updated_at = NOW()
        """), {
            "cid": g.company_id, "fhs": body.get("first_half_start", "09:00"), "fhe": body.get("first_half_end", "13:00"),
            "shs": body.get("second_half_start", "13:00"), "she": body.get("second_half_end", "18:00"),
            "min_hrs": body.get("min_hours_required", 4),
        })
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_ops_bp.get("/half-day-log")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def half_day_log():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_half_day_leave_log WHERE company_id = :cid ORDER BY start_date DESC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 7. LEAVE ADJUSTMENT
# ════════════════════════════════════════════════════════════════

@leave_ops_bp.get("/adjustments")
@require_auth
@require_role("super_admin", "hr_manager")
def list_adjustments():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leave_adjustment_audit WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_ops_bp.post("/adjustments")
@require_auth
@require_role("super_admin", "hr_manager")
def create_adjustment():
    """HR-only secure override. Mandatory documentation, immutable audit trail."""
    body = request.get_json() or {}
    required = ["employee_id", "leave_type_id", "adjustment_type", "days_delta", "reason", "supporting_document_url"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing (documentation is mandatory): {', '.join(missing)}", 422)

    try:
        balance = db.session.execute(text("""
            SELECT id, current_balance_days FROM employee_leave_balances
            WHERE employee_id = :eid AND leave_type_id = :ltid ORDER BY leave_year_label DESC LIMIT 1
        """), {"eid": body["employee_id"], "ltid": body["leave_type_id"]}).fetchone()

        if not balance: return not_found("Employee leave balance record")

        result = db.session.execute(text("""
            INSERT INTO leave_adjustments
              (company_id, employee_id, leave_type_id, employee_leave_balance_id, adjustment_type,
               days_delta, reason, supporting_document_url, balance_before_days, balance_after_days,
               adjusted_by, created_at)
            VALUES
              (:cid, :eid, :ltid, :balid, :atype,
               :delta, :reason, :doc, :before, :after,
               :user, NOW())
            RETURNING id, flags_payroll_revalidation
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "ltid": body["leave_type_id"], "balid": balance.id,
            "atype": body["adjustment_type"], "delta": body["days_delta"], "reason": body["reason"],
            "doc": body["supporting_document_url"], "before": balance.current_balance_days,
            "after": float(balance.current_balance_days) + float(body["days_delta"]), "user": g.user_id,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "adjustment_id": str(row[0]), "flags_payroll_revalidation": row[1],
            "note": "Adjustment applied. Audit log entry created." + (" Linked payroll batch flagged for re-validation." if row[1] else ""),
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@leave_ops_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["requests", "holidays", "adjustments"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"leave_ops_{module}")
    return jsonify(result), 200 if result["success"] else 422


@leave_ops_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"leave_ops_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"leave_operations_{module}_template.xlsx")
