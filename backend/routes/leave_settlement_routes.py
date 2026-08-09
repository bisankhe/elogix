"""
FILE: backend/routes/leave_settlement_routes.py
NepHR Pro — Workforce Operations > Leave Management > Leave Settlement (2 pages)
URL prefix: /api/v1/leave-settlement

  1. /encashment  — Leave Encashment (annual excess + terminal payout)
  2. /comp-off        — Compensatory Leave (overtime-earned comp-off, distinct
                         from the statutory substitute_leave_tracker)

Nepal Labour Act 2074 Section 49: Home Leave >90d and Sick Leave >45d must
be encashed annually at current basic salary; terminal encashment on exit
pays full accumulated balance. Section 42: holiday/weekly-off work earns
substitute leave within 21 days.
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

leave_settlement_bp = Blueprint("leave_settlement", __name__, url_prefix="/api/v1/leave-settlement")


# ════════════════════════════════════════════════════════════════
# 1. LEAVE ENCASHMENT
# ════════════════════════════════════════════════════════════════

@leave_settlement_bp.get("/encashment/eligible/<employee_id>")
def eligible_balances(employee_id):
    """Public/ESS — shows the employee's encashment-eligible balances above statutory caps."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_encashment_eligible_balances WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_settlement_bp.post("/encashment")
def submit_encashment_request():
    """
    Public/ESS — apply wizard submission. Computes daily_rate from current
    basic salary; gross/tax/net are generated columns.
    """
    body = request.get_json() or {}
    required = ["employee_id", "leave_type_id", "encashable_days"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        emp = db.session.execute(text(
            "SELECT basic_salary_npr FROM employees WHERE id = :eid"
        ), {"eid": body["employee_id"]}).fetchone()
        daily_rate = (float(emp.basic_salary_npr) / 30) if emp and emp.basic_salary_npr else 0

        balance = db.session.execute(text("""
            SELECT id, current_balance_days FROM employee_leave_balances
            WHERE employee_id = :eid AND leave_type_id = :ltid ORDER BY leave_year_label DESC LIMIT 1
        """), {"eid": body["employee_id"], "ltid": body["leave_type_id"]}).fetchone()

        result = db.session.execute(text("""
            INSERT INTO leave_encashment_requests
              (company_id, employee_id, leave_type_id, employee_leave_balance_id, encashment_type,
               fnf_settlement_id, balance_before_days, encash_threshold_days, encashable_days,
               daily_rate_npr, tax_rate_pct, created_at)
            VALUES
              (:cid, :eid, :ltid, :balid, :etype,
               :fnf_id, :before, :threshold, :encashable,
               :rate, :tax_pct, NOW())
            RETURNING id, gross_amount_npr, tax_amount_npr, net_amount_npr
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "ltid": body["leave_type_id"],
            "balid": balance.id if balance else None, "etype": body.get("encashment_type", "annual_excess"),
            "fnf_id": body.get("fnf_settlement_id"), "before": balance.current_balance_days if balance else 0,
            "threshold": body.get("encash_threshold_days"), "encashable": body["encashable_days"],
            "rate": daily_rate, "tax_pct": body.get("tax_rate_pct", 10),
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "request_id": str(row[0]), "gross_amount_npr": float(row[1]),
            "tax_amount_npr": float(row[2]), "net_amount_npr": float(row[3]),
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_settlement_bp.get("/encashment/dashboard")
@require_auth
@require_role("super_admin", "hr_manager")
def encashment_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leave_encashment_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_settlement_bp.get("/encashment/batch-queue")
@require_auth
@require_role("super_admin", "hr_manager")
def batch_queue():
    """Admin batch-processing grid: bulk-preview pending annual encashments."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_encashment_batch_queue WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "requests": data,
            "total_gross_npr": sum(float(r["gross_amount_npr"] or 0) for r in data),
            "total_net_npr": sum(float(r["net_amount_npr"] or 0) for r in data),
        })
    except Exception:
        return success({"requests": [], "total_gross_npr": 0, "total_net_npr": 0})


@leave_settlement_bp.put("/encashment/<request_id>/approve-finance")
@require_auth
@require_role("super_admin", "hr_manager")
def approve_finance(request_id):
    try:
        db.session.execute(text("""
            UPDATE leave_encashment_requests
               SET status = 'approved_finance', approved_by = :user, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_settlement_bp.put("/encashment/<request_id>/mark-paid")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_paid(request_id):
    """DB trigger updates employee_leave_balances.encashed_days, closing the loop with leave_setup_schema."""
    try:
        db.session.execute(text("""
            UPDATE leave_encashment_requests
               SET status = 'paid', updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'approved_finance'
        """), {"rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"paid": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_settlement_bp.put("/encashment/<request_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager")
def reject_encashment(request_id):
    body = request.get_json() or {}
    if not body.get("rejection_reason"): return error("rejection_reason required", 422)
    try:
        db.session.execute(text("""
            UPDATE leave_encashment_requests
               SET status = 'rejected', rejection_reason = :reason, updated_at = NOW()
             WHERE id = :rid AND company_id = :cid AND status = 'pending'
        """), {"reason": body["rejection_reason"], "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. COMPENSATORY LEAVE
# ════════════════════════════════════════════════════════════════

@leave_settlement_bp.get("/comp-off/balance/<employee_id>")
def comp_off_balance(employee_id):
    """Public/ESS — combined comp-off balance (overtime-earned + statutory substitute)."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_comp_off_dashboard WHERE employee_id = :eid ORDER BY use_by_date"
        ), {"eid": employee_id}).fetchall()
        total_row = db.session.execute(text(
            "SELECT total_comp_off_days FROM v_combined_comp_off_balance WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()
        return success({
            "credits": [dict(r._mapping) for r in rows],
            "total_remaining_days": float(total_row.total_comp_off_days) if total_row else 0,
        })
    except Exception:
        return success({"credits": [], "total_remaining_days": 0})


@leave_settlement_bp.post("/comp-off/auto-credit")
def auto_credit_comp_off():
    """
    Public — called by the attendance processing pipeline when a work log
    is detected on a weekend/holiday. Implements the brief's "Auto-Credit"
    workflow automation.
    """
    body = request.get_json() or {}
    required = ["employee_id", "worked_date", "worked_reason"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        ratio = body.get("credit_ratio", 1.5 if body["worked_reason"] == "overtime_project_crunch" else 1.0)
        days_credited = body.get("days_credited", round((body.get("hours_worked", 8) / 8) * ratio, 2))

        result = db.session.execute(text("""
            INSERT INTO comp_off_credits
              (company_id, employee_id, worked_date, worked_reason, source_overtime_request_id,
               hours_worked, credit_ratio, days_credited, use_by_days_window, created_at)
            VALUES
              (:cid, :eid, :wdate, :reason, :ot_id,
               :hours, :ratio, :credited, :window, NOW())
            RETURNING id, use_by_date
        """), {
            "cid": body.get("company_id"), "eid": body["employee_id"], "wdate": body["worked_date"],
            "reason": body["worked_reason"], "ot_id": body.get("source_overtime_request_id"),
            "hours": body.get("hours_worked"), "ratio": ratio, "credited": days_credited,
            "window": body.get("use_by_days_window", 21 if body["worked_reason"] != "overtime_project_crunch" else 30),
        })
        row = result.fetchone()
        db.session.commit()

        return created({"credit_id": str(row[0]), "days_credited": days_credited, "use_by_date": str(row[1])})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_settlement_bp.post("/comp-off/<credit_id>/use")
def use_comp_off(credit_id):
    """Public/ESS — employee applies banked comp-off days against a leave date."""
    body = request.get_json() or {}
    required = ["used_date", "days_used"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        credit = db.session.execute(text(
            "SELECT days_remaining, company_id FROM comp_off_credits WHERE id = :cid"
        ), {"cid": credit_id}).fetchone()
        if not credit: return not_found("Comp-off credit")
        if float(body["days_used"]) > float(credit.days_remaining):
            return error(f"Cannot use {body['days_used']} days; only {credit.days_remaining} remaining.", 422)

        db.session.execute(text("""
            INSERT INTO comp_off_usage (comp_off_credit_id, company_id, used_date, days_used, approved_by, created_at)
            VALUES (:cid, :comp_cid, :used_date, :days, :user, NOW())
        """), {"cid": credit_id, "comp_cid": credit.company_id, "used_date": body["used_date"],
               "days": body["days_used"], "user": g.user_id if hasattr(g, "user_id") else None})
        db.session.commit()
        return created({"used": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_settlement_bp.get("/comp-off/expiring-soon")
@require_auth
@require_role("super_admin", "hr_manager")
def expiring_soon():
    """Proactive alert feed: comp-off credits nearing their use-by deadline."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_comp_off_expiring_soon WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_settlement_bp.put("/comp-off/<credit_id>/process-expiry-payout")
@require_auth
@require_role("super_admin", "hr_manager")
def process_expiry_payout(credit_id):
    """HR processes the monetary payout for an expired, unused comp-off credit."""
    try:
        credit = db.session.execute(text(
            "SELECT days_remaining, employee_id FROM comp_off_credits WHERE id = :cid"
        ), {"cid": credit_id}).fetchone()
        if not credit: return not_found("Comp-off credit")

        emp = db.session.execute(text(
            "SELECT basic_salary_npr FROM employees WHERE id = :eid"
        ), {"eid": credit.employee_id}).fetchone()
        daily_rate = (float(emp.basic_salary_npr) / 30) if emp and emp.basic_salary_npr else 0
        payout = round(float(credit.days_remaining) * daily_rate, 2)

        db.session.execute(text("""
            UPDATE comp_off_credits SET expiry_payout_npr = :payout, updated_at = NOW() WHERE id = :cid
        """), {"payout": payout, "cid": credit_id})
        db.session.commit()
        return success({"payout_npr": payout})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_settlement_bp.post("/comp-off/ai-forecast-liability")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_forecast_liability():
    """AI predicts upcoming comp-off/encashment financial liability for budget planning."""
    try:
        insight = generate_ai_insights({"type": "leave_liability_forecast", "company_id": g.company_id})
        return success({
            "forecasted_liability_npr": insight.get("forecasted_liability_npr", 0),
            "risk_departments": insight.get("risk_departments", []),
        })
    except Exception as e:
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@leave_settlement_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["encashment", "comp-off"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"leave_settlement_{module}")
    return jsonify(result), 200 if result["success"] else 422


@leave_settlement_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"leave_settlement_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"leave_settlement_{module}_template.xlsx")
