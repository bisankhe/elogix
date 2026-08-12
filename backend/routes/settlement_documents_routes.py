"""
FILE: backend/routes/settlement_documents_routes.py
eLogix HRMS — Offboarding > Settlement & Documents Module (3 pages)
URL prefix: /api/v1/settlement

  1. /fnf              — Full & Final Settlement (computation grid + payout)
  2. /experience-letters  — Experience Letter (LA2074 §150, strictly factual)
  3. /relieving-letters     — Relieving Letter (3-condition gate, no-ransom)

Nepal Labour Act 2074: 15-day settlement deadline (penalty = continued pay
obligation), Section 150 mandatory factual experience certificate,
relieving letter never withheld over F&F amount disputes alone.
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

settlement_bp = Blueprint("settlement_documents", __name__, url_prefix="/api/v1/settlement")


# ════════════════════════════════════════════════════════════════
# 1. FULL & FINAL SETTLEMENT
# ════════════════════════════════════════════════════════════════

@settlement_bp.get("/fnf")
@require_auth
def list_fnf():
    status = request.args.get("status")
    try:
        q = """
            SELECT f.*, e.first_name, e.last_name, e.employee_code
            FROM fnf_settlements f
            JOIN employees e ON f.employee_id = e.id
            WHERE f.company_id = :cid AND NOT f.is_deleted
        """
        params = {"cid": g.company_id}
        if status: q += " AND f.status = :status"; params["status"] = status
        q += " ORDER BY f.days_remaining ASC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@settlement_bp.post("/fnf/initialize")
@require_auth
@require_role("super_admin", "hr_manager")
def initialize_fnf():
    """
    Auto-computes Step 2 (Computation Grid): pulls salary, leave balance,
    and gratuity from employee profile + attendance/leave modules.
    """
    body = request.get_json() or {}
    required = ["employee_id", "exit_clearance_id", "last_working_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        emp = db.session.execute(text(
            "SELECT basic_salary_npr, join_date FROM employees WHERE id = :eid AND company_id = :cid"
        ), {"eid": body["employee_id"], "cid": g.company_id}).fetchone()
        if not emp: return not_found("Employee")

        # Gratuity: 8.33% of basic monthly salary x months of service (Nepal SSF rule)
        lwd = date.fromisoformat(body["last_working_date"])
        months_service = max(1, (lwd.year - emp.join_date.year) * 12 + (lwd.month - emp.join_date.month))
        gratuity = round(float(emp.basic_salary_npr or 0) * 0.0833 * months_service, 2)

        insight = generate_ai_insights({
            "type": "fnf_computation",
            "basic_salary": float(emp.basic_salary_npr or 0),
            "months_service": months_service,
        })

        result = db.session.execute(text("""
            INSERT INTO fnf_settlements
              (company_id, employee_id, exit_clearance_id, resignation_date, last_working_date,
               unpaid_salary_npr, leave_encashment_npr, gratuity_npr, pf_employer_npr,
               status, created_by, created_at)
            VALUES
              (:cid, :eid, :clr_id, :resign_date, :lwd,
               :salary, :leave, :gratuity, :pf,
               'computed', :user, NOW())
            RETURNING id, settlement_deadline, days_remaining, net_payable_npr
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "clr_id": body["exit_clearance_id"],
            "resign_date": body.get("resignation_date"), "lwd": body["last_working_date"],
            "salary": insight.get("unpaid_salary_npr", float(emp.basic_salary_npr or 0)),
            "leave": insight.get("leave_encashment_npr", 0), "gratuity": gratuity,
            "pf": insight.get("pf_employer_npr", 0), "user": g.user_id,
        })
        row = result.fetchone()
        db.session.commit()

        return created({
            "settlement_id": str(row[0]), "settlement_deadline": str(row[1]),
            "days_remaining": row[2], "net_payable_npr": float(row[3]) if row[3] else 0,
            "la2074_note": "Total Pay = Unpaid Salary + Leave Encashment + Gratuity + PF - Deductions. Must settle within 15 days.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@settlement_bp.put("/fnf/<settlement_id>/update-deductions")
@require_auth
@require_role("super_admin", "hr_manager")
def update_deductions(settlement_id):
    body = request.get_json() or {}
    allowed = ["tds_npr", "advance_recovery_npr", "asset_damage_npr", "notice_shortfall_npr", "loan_recovery_npr"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("No valid deduction fields provided", 400)

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"sid": settlement_id, "cid": g.company_id})
    try:
        db.session.execute(text(
            f"UPDATE fnf_settlements SET {set_clause}, updated_at = NOW() WHERE id = :sid AND company_id = :cid"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@settlement_bp.put("/fnf/<settlement_id>/mark-clearance-complete")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_clearance_complete(settlement_id):
    """Unlocks Step 3 (Payout) — should be called once exit_clearances.ff_frozen = FALSE."""
    try:
        db.session.execute(text("""
            UPDATE fnf_settlements SET clearance_complete = TRUE, updated_at = NOW()
            WHERE id = :sid AND company_id = :cid
        """), {"sid": settlement_id, "cid": g.company_id})
        db.session.commit()
        return success({"unlocked": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@settlement_bp.post("/fnf/<settlement_id>/process-payout")
@require_auth
@require_role("super_admin", "hr_manager")
def process_payout(settlement_id):
    """Step 3: Payout. Blocked by DB trigger if clearance_complete = FALSE."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE fnf_settlements
               SET payout_status = 'processed', payout_method = :method,
                   payout_reference = :ref, payslip_url = :payslip, updated_at = NOW()
             WHERE id = :sid AND company_id = :cid
        """), {
            "method": body.get("payout_method", "bank_transfer"), "ref": body.get("payout_reference"),
            "payslip": body.get("payslip_url"), "sid": settlement_id, "cid": g.company_id,
        })
        db.session.commit()
        return success({
            "processed": True,
            "downstream_unlocked": ["Experience Letter generation", "Relieving Letter generation"],
        })
    except Exception as e:
        db.session.rollback()
        return error(
            str(e) if "clearance" not in str(e).lower()
            else "Cannot process payout: exit clearance not complete.",
            422
        )


@settlement_bp.get("/fnf/deadline-compliance")
@require_auth
@require_role("super_admin", "hr_manager")
def fnf_deadline_compliance():
    """15-day deadline tracker — surfaces overdue + at-risk settlements."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_fnf_deadline_compliance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        overdue = [r for r in data if r["is_overdue"]]
        return success({"records": data, "overdue": overdue, "overdue_count": len(overdue)})
    except Exception:
        return success({"records": [], "overdue": [], "overdue_count": 0})


# ════════════════════════════════════════════════════════════════
# 2. EXPERIENCE LETTER (Nepal LA2074 Section 150)
# ════════════════════════════════════════════════════════════════

@settlement_bp.get("/experience-letters")
@require_auth
def list_experience_letters():
    try:
        rows = db.session.execute(text("""
            SELECT el.*, e.first_name, e.last_name
            FROM experience_letters el
            JOIN employees e ON el.employee_id = e.id
            WHERE el.company_id = :cid AND NOT el.is_deleted
            ORDER BY el.requested_date DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@settlement_bp.post("/experience-letters/request")
def request_experience_letter():
    """
    Public/ESS — employee requests letter. Nepal LA2074 Section 150:
    employer MUST provide on request — cannot be arbitrarily withheld,
    and is NOT contingent on F&F settlement status.
    """
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        emp = db.session.execute(text(
            "SELECT join_date FROM employees WHERE id = :eid AND company_id = :cid"
        ), {"eid": body["employee_id"], "cid": g.company_id}).fetchone()
        if not emp: return not_found("Employee")

        db.session.execute(text("""
            INSERT INTO experience_letters
              (company_id, employee_id, requested_date, join_date_snapshot,
               last_working_date_snapshot, position_snapshot, department_snapshot,
               tenure_display, status, created_at)
            VALUES
              (:cid, :eid, NOW()::DATE, :join_date,
               :lwd, :position, :dept,
               :tenure, 'pending_request', NOW())
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "join_date": emp.join_date,
            "lwd": body.get("last_working_date"), "position": body.get("position_snapshot", ""),
            "dept": body.get("department_snapshot", ""), "tenure": body.get("tenure_display", ""),
        })
        db.session.commit()
        return created({
            "message": "Request logged. Cannot be denied per Nepal Labour Act 2074 Section 150.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@settlement_bp.post("/experience-letters/<letter_id>/generate")
@require_auth
@require_role("super_admin", "hr_manager")
def generate_experience_letter(letter_id):
    """AI drafts strictly-factual content: tenure + position only, no subjective evaluation."""
    body = request.get_json() or {}
    try:
        insight = generate_ai_insights({
            "type": "experience_letter_drafting",
            "core_responsibilities": body.get("core_responsibilities_summary", ""),
            "strict_factual_only": True,  # explicit guard: no performance commentary
        })

        db.session.execute(text("""
            UPDATE experience_letters
               SET core_responsibilities_summary = :summary, document_url = :doc_url,
                   contains_negative_remarks = FALSE, status = 'drafting', updated_at = NOW()
             WHERE id = :lid AND company_id = :cid
        """), {"summary": insight.get("factual_summary", body.get("core_responsibilities_summary", "")),
               "doc_url": body.get("document_url"), "lid": letter_id, "cid": g.company_id})
        db.session.commit()

        return success({
            "drafted": True,
            "factual_summary": insight.get("factual_summary", ""),
            "legal_note": "Content limited to period of service and position held per Section 150 — no subjective evaluation included.",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@settlement_bp.post("/experience-letters/<letter_id>/issue")
@require_auth
@require_role("super_admin", "hr_manager")
def issue_experience_letter(letter_id):
    """Blocked by DB trigger if contains_negative_remarks = TRUE."""
    try:
        db.session.execute(text("""
            UPDATE experience_letters SET status = 'issued', updated_at = NOW()
            WHERE id = :lid AND company_id = :cid
        """), {"lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({
            "issued": True,
            "legal_note": "Cannot be arbitrarily withheld; contains no negative remarks regardless of departure reason.",
        })
    except Exception as e:
        db.session.rollback()
        return error(
            str(e) if "negative remarks" not in str(e).lower()
            else "Cannot issue: letter contains negative remarks, which violates Nepal Labour Act 2074 Section 150.",
            422
        )


@settlement_bp.post("/experience-letters/<letter_id>/export")
@require_auth
def export_experience_letter(letter_id):
    body = request.get_json() or {}
    target = body.get("target")  # 'linkedin' or 'verification_agency'
    field = "exported_to_linkedin" if target == "linkedin" else "shared_with_verification_agency"
    try:
        db.session.execute(text(
            f"UPDATE experience_letters SET {field} = TRUE WHERE id = :lid"
        ), {"lid": letter_id})
        db.session.commit()
        return success({"exported_to": target})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. RELIEVING LETTER (3-condition gate, no-ransom policy)
# ════════════════════════════════════════════════════════════════

@settlement_bp.get("/relieving-letters")
@require_auth
def list_relieving_letters():
    try:
        rows = db.session.execute(text("""
            SELECT rl.*, e.first_name, e.last_name
            FROM relieving_letters rl
            JOIN employees e ON rl.employee_id = e.id
            WHERE rl.company_id = :cid AND NOT rl.is_deleted
            ORDER BY rl.created_at DESC
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@settlement_bp.post("/relieving-letters/initialize")
@require_auth
@require_role("super_admin", "hr_manager")
def initialize_relieving_letter():
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO relieving_letters
              (company_id, employee_id, fnf_settlement_id, exit_clearance_id, last_working_date, created_at)
            VALUES
              (:cid, :eid, :fnf_id, :clr_id, :lwd, NOW())
            RETURNING id, status
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "fnf_id": body.get("fnf_settlement_id"),
            "clr_id": body.get("exit_clearance_id"), "lwd": body["last_working_date"],
        })
        row = result.fetchone()
        db.session.commit()
        return created({"letter_id": str(row[0]), "status": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@settlement_bp.put("/relieving-letters/<letter_id>/update-conditions")
@require_auth
@require_role("super_admin", "hr_manager")
def update_release_conditions(letter_id):
    """
    Updates the 3 release conditions. DB trigger auto-flips status to 'ready'
    once all 3 are TRUE. If marking blocked, must specify a legitimate
    (non-amount-dispute) reason or the no-ransom guard will reject it.
    """
    body = request.get_json() or {}
    allowed = ["notice_period_completed", "clearance_complete", "fnf_settled"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("No valid condition fields provided", 400)

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"lid": letter_id, "cid": g.company_id})
    try:
        db.session.execute(text(
            f"UPDATE relieving_letters SET {set_clause}, updated_at = NOW() WHERE id = :lid AND company_id = :cid"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@settlement_bp.put("/relieving-letters/<letter_id>/withhold")
@require_auth
@require_role("super_admin", "hr_manager")
def withhold_relieving_letter(letter_id):
    """
    Explicitly withhold with a documented reason. Blocked by DB trigger
    if is_amount_dispute_only = TRUE — enforces the no-ransom policy.
    """
    body = request.get_json() or {}
    if not body.get("withholding_reason"):
        return error("withholding_reason required to document why letter is withheld.", 422)
    try:
        db.session.execute(text("""
            UPDATE relieving_letters
               SET status = 'blocked', withholding_reason = :reason,
                   is_amount_dispute_only = :amount_only, updated_at = NOW()
             WHERE id = :lid AND company_id = :cid
        """), {"reason": body["withholding_reason"], "amount_only": body.get("is_amount_dispute_only", False),
               "lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"withheld": True})
    except Exception as e:
        db.session.rollback()
        return error(
            str(e) if "amount dispute" not in str(e).lower()
            else "Cannot withhold relieving letter solely due to F&F amount dispute. This violates the no-ransom policy — resolve disputes separately.",
            422
        )


@settlement_bp.post("/relieving-letters/<letter_id>/issue")
@require_auth
@require_role("super_admin", "hr_manager")
def issue_relieving_letter(letter_id):
    """Issue — should be called once status = 'ready' (all 3 conditions met)."""
    try:
        row = db.session.execute(text(
            "SELECT status FROM relieving_letters WHERE id = :lid AND company_id = :cid"
        ), {"lid": letter_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Relieving letter")
        if row.status != "ready":
            return error("Cannot issue: release conditions not yet fully met.", 422)

        db.session.execute(text("""
            UPDATE relieving_letters SET status = 'issued', issued_by = :user, updated_at = NOW()
            WHERE id = :lid AND company_id = :cid
        """), {"user": g.user_id, "lid": letter_id, "cid": g.company_id})
        db.session.commit()
        return success({"issued": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@settlement_bp.get("/relieving-letters/blocked-legitimate")
@require_auth
@require_role("super_admin")
def blocked_legitimate_queue():
    """Audit view: letters legitimately blocked (excludes any amount-dispute-only cases)."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_relieving_blocked_legitimate WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# CROSS-MODULE: pending document queue
# ════════════════════════════════════════════════════════════════

@settlement_bp.get("/documents/pending")
@require_auth
@require_role("super_admin", "hr_manager")
def pending_documents_queue():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pending_separation_documents WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@settlement_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["fnf", "experience-letters", "relieving-letters"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"settlement_{module}")
    return jsonify(result), 200 if result["success"] else 422


@settlement_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"settlement_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"settlement_{module}_template.xlsx")
