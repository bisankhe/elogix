"""
FILE: backend/routes/payroll_finalization_routes.py
NepHR Pro — Workforce Operations > Payroll & Compensation > Payroll
Finalization Module (4 pages)
URL prefix: /api/v1/payroll-finalization

  1. /approval-chain, /exceptions  — Payroll Approval (4-level maker-checker)
  2. /payslips                        — Payslip Generation (immutable post-approval)
  3. /bank-transfer-files                — Bank Transfer File
  4. /final-settlements                     — Final Settlement (reuses fnf_settlements)

Nepal Labour Act 2074: Sections 34-36 (gross salary), Sections 7/19 of
Labour Rules (internal audit, equal remuneration), Section 37 (itemized
payslip requirement), Rule 21 (formal banking channel), Sections 49/53/145
(final settlement: gratuity 8.33%, leave encashment, severance).
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

payroll_final_bp = Blueprint("payroll_finalization", __name__, url_prefix="/api/v1/payroll-finalization")


# ════════════════════════════════════════════════════════════════
# 1. PAYROLL APPROVAL
# ════════════════════════════════════════════════════════════════

@payroll_final_bp.get("/approval-chain/<batch_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approval_chain(batch_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_payroll_approval_status WHERE payroll_run_batch_id = :bid"
        ), {"bid": batch_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_final_bp.get("/exceptions/<batch_id>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_exceptions(batch_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_payroll_exceptions_queue WHERE payroll_run_batch_id = :bid"
        ), {"bid": batch_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_final_bp.put("/exceptions/<exception_id>/review")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def review_exception(exception_id):
    try:
        db.session.execute(text("""
            UPDATE payroll_exceptions SET reviewed = TRUE, reviewed_by = :user, reviewed_at = NOW()
            WHERE id = :eid AND company_id = :cid
        """), {"user": g.user_id, "eid": exception_id, "cid": g.company_id})
        db.session.commit()
        return success({"reviewed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_final_bp.post("/exceptions/ai-detect")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_detect_exceptions():
    """AI flags unusual pay spikes, new hires, terminations, retroactive adjustments before submission."""
    body = request.get_json() or {}
    if not body.get("payroll_run_batch_id"): return error("payroll_run_batch_id required", 422)
    try:
        insight = generate_ai_insights({
            "type": "payroll_exception_detection", "batch_id": body["payroll_run_batch_id"],
        })
        flags = insight.get("exceptions", [])
        for f in flags:
            db.session.execute(text("""
                INSERT INTO payroll_exceptions (company_id, payroll_run_batch_id, employee_id, exception_type, severity, detail_note, created_at)
                VALUES (:cid, :bid, :eid, :etype, :severity, :note, NOW())
            """), {"cid": g.company_id, "bid": body["payroll_run_batch_id"], "eid": f.get("employee_id"),
                   "etype": f.get("exception_type"), "severity": f.get("severity", "low"), "note": f.get("detail_note")})
        db.session.commit()
        return success({"exceptions_created": len(flags)})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_final_bp.put("/approval-chain/<level_id>/approve")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def approve_level(level_id):
    """Blocked by DB trigger if unreviewed high-severity exceptions exist (for level 3+)."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE payroll_approval_chain
               SET status = 'complete', approver_employee_id = :approver, comments = :comments
             WHERE id = :lid AND company_id = :cid AND status = 'in_progress'
        """), {"approver": body.get("approver_employee_id"), "comments": body.get("comments"), "lid": level_id, "cid": g.company_id})
        db.session.commit()
        return success({"approved": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


@payroll_final_bp.put("/approval-chain/<level_id>/reject")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def reject_level(level_id):
    body = request.get_json() or {}
    if not body.get("comments"): return error("comments (rejection reason) required", 422)
    try:
        db.session.execute(text("""
            UPDATE payroll_approval_chain SET status = 'rejected', comments = :comments WHERE id = :lid AND company_id = :cid
        """), {"comments": body["comments"], "lid": level_id, "cid": g.company_id})
        db.session.commit()
        return success({"rejected": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. PAYSLIP GENERATION
# ════════════════════════════════════════════════════════════════

@payroll_final_bp.post("/payslips/generate-batch")
@require_auth
@require_role("super_admin", "hr_manager")
def generate_payslips():
    """Generates payslips for every employee in a finalized batch. Only callable after stage='finalized'."""
    body = request.get_json() or {}
    if not body.get("payroll_run_batch_id"): return error("payroll_run_batch_id required", 422)
    try:
        batch = db.session.execute(text(
            "SELECT stage FROM payroll_run_batches WHERE id = :bid AND company_id = :cid"
        ), {"bid": body["payroll_run_batch_id"], "cid": g.company_id}).fetchone()
        if not batch: return not_found("Payroll run batch")
        if batch.stage != "finalized":
            return error("Cannot generate payslips: payroll has not completed Level-4 approval.", 422)

        rows = db.session.execute(text("""
            SELECT employee_id, gross_npr, ssf_employee_npr, tds_npr, other_deductions_npr, pay_period
            FROM payroll_register WHERE company_id = :cid
              AND pay_period = (SELECT pay_period FROM payroll_run_batches WHERE id = :bid)
        """), {"cid": g.company_id, "bid": body["payroll_run_batch_id"]}).fetchall()

        created_count = 0
        for r in rows:
            db.session.execute(text("""
                INSERT INTO payslips
                  (company_id, employee_id, payroll_run_batch_id, pay_period, gross_npr, ssf_employee_npr, tds_npr, other_deductions_npr, generated_at)
                VALUES
                  (:cid, :eid, :bid, :period, :gross, :ssf, :tds, :other, NOW())
                ON CONFLICT (employee_id, pay_period) DO NOTHING
            """), {"cid": g.company_id, "eid": r.employee_id, "bid": body["payroll_run_batch_id"], "period": r.pay_period,
                   "gross": r.gross_npr, "ssf": r.ssf_employee_npr, "tds": r.tds_npr, "other": r.other_deductions_npr})
            created_count += 1
        db.session.commit()
        return created({"payslips_generated": created_count})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_final_bp.get("/payslips")
@require_auth
def list_payslips():
    employee_id = request.args.get("employee_id")
    try:
        q = "SELECT * FROM v_payslip_dashboard WHERE company_id = :cid"
        params = {"cid": g.company_id}
        if employee_id: q += " AND employee_id = :eid"; params["eid"] = employee_id
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_final_bp.put("/payslips/<payslip_id>/publish")
@require_auth
@require_role("super_admin", "hr_manager")
def publish_payslip(payslip_id):
    try:
        db.session.execute(text("""
            UPDATE payslips SET published_to_ess = TRUE, published_at = NOW() WHERE id = :pid AND company_id = :cid
        """), {"pid": payslip_id, "cid": g.company_id})
        db.session.commit()
        return success({"published": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_final_bp.put("/payslips/bulk-publish")
@require_auth
@require_role("super_admin", "hr_manager")
def bulk_publish():
    body = request.get_json() or {}
    if not body.get("payroll_run_batch_id"): return error("payroll_run_batch_id required", 422)
    try:
        result = db.session.execute(text("""
            UPDATE payslips SET published_to_ess = TRUE, published_at = NOW()
            WHERE payroll_run_batch_id = :bid AND company_id = :cid AND NOT published_to_ess
        """), {"bid": body["payroll_run_batch_id"], "cid": g.company_id})
        db.session.commit()
        return success({"published_count": result.rowcount})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. BANK TRANSFER FILE
# ════════════════════════════════════════════════════════════════

@payroll_final_bp.get("/bank-transfer-files")
@require_auth
@require_role("super_admin", "hr_manager")
def list_bank_files():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_bank_transfer_export_log WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@payroll_final_bp.post("/bank-transfer-files")
@require_auth
@require_role("super_admin", "hr_manager")
def create_bank_file():
    body = request.get_json() or {}
    required = ["bank_name", "file_format"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO bank_transfer_files
              (company_id, payroll_run_batch_id, pay_group_label, bank_name, file_format,
               employee_count, total_amount_npr, generated_by, generated_at)
            VALUES
              (:cid, :bid, :pgroup, :bank, :format,
               :emp_count, :total, :user, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "bid": body.get("payroll_run_batch_id"), "pgroup": body.get("pay_group_label"),
            "bank": body["bank_name"], "format": body["file_format"], "emp_count": body.get("employee_count", 0),
            "total": body.get("total_amount_npr", 0), "user": g.user_id,
        })
        file_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"bank_file_id": file_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_final_bp.post("/bank-transfer-files/<file_id>/send-test-transaction")
@require_auth
@require_role("super_admin", "hr_manager")
def send_test_transaction(file_id):
    try:
        db.session.execute(text("""
            UPDATE bank_transfer_files SET test_transaction_sent = TRUE, status = 'test_pending' WHERE id = :fid AND company_id = :cid
        """), {"fid": file_id, "cid": g.company_id})
        db.session.commit()
        return success({"test_transaction_sent": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_final_bp.put("/bank-transfer-files/<file_id>/verify-test")
@require_auth
@require_role("super_admin", "hr_manager")
def verify_test_transaction(file_id):
    try:
        db.session.execute(text("""
            UPDATE bank_transfer_files SET test_transaction_verified = TRUE, status = 'generated' WHERE id = :fid AND company_id = :cid
        """), {"fid": file_id, "cid": g.company_id})
        db.session.commit()
        return success({"verified": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@payroll_final_bp.put("/bank-transfer-files/<file_id>/transmit")
@require_auth
@require_role("super_admin", "hr_manager")
def transmit_bank_file(file_id):
    """Blocked by DB trigger unless test_transaction_verified is TRUE."""
    try:
        db.session.execute(text("""
            UPDATE bank_transfer_files SET status = 'transmitted' WHERE id = :fid AND company_id = :cid
        """), {"fid": file_id, "cid": g.company_id})
        db.session.commit()
        return success({"transmitted": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)


# ════════════════════════════════════════════════════════════════
# 4. FINAL SETTLEMENT (reuses fnf_settlements -- no new table)
# ════════════════════════════════════════════════════════════════

@payroll_final_bp.get("/final-settlements")
@require_auth
@require_role("super_admin", "hr_manager")
def list_final_settlements():
    """Payroll-side view into the existing fnf_settlements table (Offboarding module)."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_final_settlement_payroll_view WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        data = [dict(r._mapping) for r in rows]
        return success({
            "settlements": data,
            "overdue_count": sum(1 for r in data if r["is_overdue"]),
            "total_payable_npr": sum(float(r["net_payable_npr"] or 0) for r in data),
        })
    except Exception:
        return success({"settlements": [], "overdue_count": 0, "total_payable_npr": 0})


@payroll_final_bp.put("/final-settlements/<settlement_id>/release-payout")
@require_auth
@require_role("super_admin", "hr_manager")
def release_payout(settlement_id):
    """Blocks release if clearance_complete is FALSE on the existing fnf_settlements row."""
    try:
        row = db.session.execute(text(
            "SELECT clearance_complete FROM fnf_settlements WHERE id = :sid AND company_id = :cid"
        ), {"sid": settlement_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Final settlement")
        if not row.clearance_complete:
            return error("Cannot release payout: exit clearance is not yet complete.", 422)

        db.session.execute(text("""
            UPDATE fnf_settlements SET payout_status = 'released', payout_date = CURRENT_DATE WHERE id = :sid
        """), {"sid": settlement_id})
        db.session.commit()
        return success({"released": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@payroll_final_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    allowed = ["approval", "payslips", "bank-transfer", "final-settlement"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"payroll_finalization_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"payroll_finalization_{module}_template.xlsx")
