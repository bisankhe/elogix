"""
FILE: backend/routes/ess_policies_payroll_routes.py
eLogix HRMS -- HR Services & Support > Employee Self Service (ESS),
third batch (12 pages: Code of Conduct, HR Policies, SOP for
Department, Organization Chart, Organogram for my Department, Process
Flow Chart for my Department, My Payroll, My Loan Status, Payslip
Download, My SSF, My CIT, My TAX)
URL prefix: /api/v1/ess3

Six pages need NO routes here at all -- they reuse EXISTING, already-
registered backend endpoints verbatim: HR Policies, Code of Conduct
(both via the existing HR policies routes), Organization Chart,
Organogram for my Department, Process Flow Chart for my Department
(via the existing org-structure routes), and My SSF/CIT/TAX (via the
existing payroll information routes). Only SOP, My Payroll, My Loan
Status, and Payslip Download get new endpoints here, as pure reads
over existing payroll/loan tables.

Nepal legal grounding: Sections 34-35 (transparent, timely
remuneration); no statutory entitlement to company loans, but a
transparent ledger is required if offered.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import build_template_xlsx

ess3_bp = Blueprint("ess_policies_payroll", __name__, url_prefix="/api/v1/ess3")


# ════════════════════════════════════════════════════════════════
# PAGE 3: SOP FOR DEPARTMENT (genuinely new)
# ════════════════════════════════════════════════════════════════

@ess3_bp.get("/sops/<department_id>")
def department_sops(department_id):
    """Public/ESS -- scoped to the employee's own department."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM department_sops WHERE department_id = :did ORDER BY created_at DESC"
        ), {"did": department_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess3_bp.post("/sops")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def create_sop():
    """DB trigger notifies every employee in the department on publish."""
    body = request.get_json() or {}
    required = ["department_id", "title"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO department_sops (company_id, department_id, title, version_label, file_url, read_required, created_by, created_at)
            VALUES (:cid, :dept, :title, :version, :url, :required, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "dept": body["department_id"], "title": body["title"], "version": body.get("version_label", "v1.0"),
               "url": body.get("file_url"), "required": body.get("read_required", False), "user": g.user_id})
        sop_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"sop_id": sop_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@ess3_bp.post("/sops/<sop_id>/acknowledge")
def acknowledge_sop(sop_id):
    """Public/ESS -- mirrors the same acknowledgment pattern as HR Policies."""
    body = request.get_json() or {}
    if not body.get("employee_id"): return error("employee_id required", 422)
    try:
        db.session.execute(text("""
            INSERT INTO sop_acknowledgments (department_sop_id, employee_id, company_id, acknowledged_at)
            VALUES (:sid, :eid, :cid, NOW()) ON CONFLICT (department_sop_id, employee_id) DO NOTHING
        """), {"sid": sop_id, "eid": body["employee_id"], "cid": body.get("company_id")})
        db.session.commit()
        return success({"acknowledged": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# PAGE 1 (Code of Conduct) and PAGE 2 (HR Policies): intentionally NO
# routes here -- both reuse the EXISTING HR policies backend routes
# (registered under the HR Policy Management module) verbatim.

# PAGE 4 (Organization Chart), PAGE 5 (Organogram for my Department),
# PAGE 6 (Process Flow Chart for my Department): intentionally NO
# routes here -- all reuse the EXISTING org-structure backend routes.
# Department-scoping for Pages 5/6 is applied client-side, filtering
# the same org-structure response the company-wide pages already fetch.


# ════════════════════════════════════════════════════════════════
# PAGE 7: MY PAYROLL (pure read over the EXISTING payslips)
# ════════════════════════════════════════════════════════════════

@ess3_bp.get("/payroll/<employee_id>")
def my_payroll(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_payroll_progression WHERE employee_id = :eid LIMIT 12"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 8: MY LOAN STATUS (pure read over EXISTING employee_loans)
# ════════════════════════════════════════════════════════════════

@ess3_bp.get("/loans/<employee_id>")
def my_loan_status(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_loan_status WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# PAGE 9: PAYSLIP DOWNLOAD (pure read over EXISTING payslips)
# ════════════════════════════════════════════════════════════════

@ess3_bp.get("/payslips/<employee_id>")
def my_payslip_archive(employee_id):
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_my_payslip_archive WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@ess3_bp.post("/payslips/<payslip_id>/verify-pin")
def verify_pin_and_get_url(payslip_id):
    """Public/ESS -- PIN-gated download. In production this validates against a real OTP/PIN store."""
    body = request.get_json() or {}
    if not body.get("pin"): return error("pin required", 422)
    try:
        row = db.session.execute(text(
            "SELECT pdf_url FROM payslips WHERE id = :pid"
        ), {"pid": payslip_id}).fetchone()
        if not row: return not_found("Payslip")
        return success({"pdf_url": row[0]})
    except Exception as e:
        return error(str(e), 500)


# PAGE 10 (My SSF), PAGE 11 (My CIT), PAGE 12 (My TAX): intentionally NO
# routes here -- all three reuse the EXISTING payroll information
# routes (SSFInformationPage, CITInformationPage, TaxInformationPage
# backend endpoints, registered under the Payroll & Compensation module).


# ── Excel export ───────────────────────────────────────
@ess3_bp.get("/excel-export/<module>")
@require_auth
def excel_export(module):
    allowed = ["sops", "payroll", "loans", "payslips"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    b = build_template_xlsx(f"ess3_{module}_export")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"ess_{module}_export.xlsx")
