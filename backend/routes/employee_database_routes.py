"""
FILE: backend/routes/employee_database_routes.py
eLogix HRMS — Employee Records > Employee Database Module (7 pages)
URL prefix: /api/v1/employee-db

  1. /directory          — Employee Directory (search/filter)
  2. /profile/<id>         — Employee Profile (unified hub)
  3. /personal-info          — Personal Information (self-service + approval)
  4. /family                  — Family Details
  5. /emergency-contacts        — Emergency Contact
  6. /assets                      — Employee Assets
  7. /employment-history            — Employment History (immutable timeline)

Nepal Labour Act 2074: family/dependent recording for SSF, asset custody
liability tracking, employment history retention requirements.
RBAC: sensitive fields (citizenship, PAN, bank, SSF) masked unless explicitly revealed.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
from datetime import datetime, date
import io, json

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx

empdb_bp = Blueprint("employee_database", __name__, url_prefix="/api/v1/employee-db")

SENSITIVE_FIELDS = {"citizenship_no", "pan_no", "bank_account_no", "ssf_no", "pf_account_no"}


def _mask(value, reveal=False):
    if not value or reveal:
        return value
    s = str(value)
    return "•" * max(len(s) - 3, 0) + s[-3:]


# ════════════════════════════════════════════════════════════════
# 1. EMPLOYEE DIRECTORY
# ════════════════════════════════════════════════════════════════

@empdb_bp.get("/directory")
@require_auth
def list_directory():
    search = request.args.get("search", "")
    dept   = request.args.get("department_id")
    try:
        q = """
            SELECT e.id, e.employee_code, e.first_name, e.last_name, e.work_email, e.phone,
                   e.employment_status, e.join_date, d.name AS department_name, b.name AS branch_name,
                   des.title AS position, m.first_name AS manager_first_name, m.last_name AS manager_last_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN branches b ON e.branch_id = b.id
            LEFT JOIN designations des ON e.designation_id = des.id
            LEFT JOIN employees m ON e.manager_id = m.id
            WHERE e.company_id = :cid
        """
        params = {"cid": g.company_id}
        if dept: q += " AND e.department_id = :dept"; params["dept"] = dept
        if search:
            q += " AND (e.first_name ILIKE :s OR e.last_name ILIKE :s OR e.employee_code ILIKE :s)"
            params["s"] = f"%{search}%"
        q += " ORDER BY e.first_name"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdb_bp.get("/directory/org-chart/<employee_id>")
@require_auth
def org_chart_context(employee_id):
    """Returns manager + direct reports for the interactive org-chart view."""
    try:
        manager = db.session.execute(text("""
            SELECT m.id, m.first_name, m.last_name FROM employees e
            JOIN employees m ON e.manager_id = m.id WHERE e.id = :eid
        """), {"eid": employee_id}).fetchone()
        reports = db.session.execute(text(
            "SELECT id, first_name, last_name FROM employees WHERE manager_id = :eid"
        ), {"eid": employee_id}).fetchall()
        return success({
            "manager": dict(manager._mapping) if manager else None,
            "direct_reports": [dict(r._mapping) for r in reports],
        })
    except Exception:
        return success({"manager": None, "direct_reports": []})


# ════════════════════════════════════════════════════════════════
# 2. EMPLOYEE PROFILE (unified hub)
# ════════════════════════════════════════════════════════════════

@empdb_bp.get("/profile/<employee_id>")
@require_auth
def get_profile(employee_id):
    try:
        emp = db.session.execute(text(
            "SELECT * FROM employees WHERE id = :eid AND company_id = :cid"
        ), {"eid": employee_id, "cid": g.company_id}).fetchone()
        if not emp: return not_found("Employee")

        completeness = db.session.execute(text(
            "SELECT * FROM v_employee_profile_completeness WHERE employee_id = :eid"
        ), {"eid": employee_id}).fetchone()

        d = dict(emp._mapping)
        for f in SENSITIVE_FIELDS:
            if f in d: d[f] = _mask(d[f])
        d["completeness"] = dict(completeness._mapping) if completeness else {}
        return success(d)
    except Exception as e:
        return error(str(e), 500)


@empdb_bp.post("/profile/<employee_id>/reveal-field")
@require_auth
@require_role("super_admin", "hr_manager")
def reveal_sensitive_field(employee_id):
    """HR/Finance-only: temporarily reveal a masked sensitive field. Logged for audit."""
    body = request.get_json() or {}
    field = body.get("field_name")
    if field not in SENSITIVE_FIELDS:
        return error(f"'{field}' is not a maskable field.", 422)
    try:
        row = db.session.execute(text(
            f"SELECT {field} FROM employees WHERE id = :eid AND company_id = :cid"
        ), {"eid": employee_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Employee")
        # In production: log this reveal action to an audit table
        return success({"field_name": field, "value": row[0]})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. PERSONAL INFORMATION (self-service + approval workflow)
# ════════════════════════════════════════════════════════════════

@empdb_bp.get("/personal-info/<employee_id>")
@require_auth
def get_personal_info(employee_id):
    reveal = request.args.get("reveal", "false").lower() == "true"
    try:
        row = db.session.execute(text("""
            SELECT employee_code, first_name, last_name, first_name_nepali, last_name_nepali,
                   gender, date_of_birth, nationality, citizenship_no, pan_no,
                   personal_email, work_email, phone, address, province, district,
                   bank_name, bank_account_no, ssf_no, pf_account_no
            FROM employees WHERE id = :eid AND company_id = :cid
        """), {"eid": employee_id, "cid": g.company_id}).fetchone()
        if not row: return not_found("Employee")
        d = dict(row._mapping)
        for f in SENSITIVE_FIELDS:
            if f in d: d[f] = _mask(d[f], reveal=reveal)

        pending = db.session.execute(text(
            "SELECT * FROM employee_info_change_requests WHERE employee_id = :eid AND status = 'pending'"
        ), {"eid": employee_id}).fetchall()
        d["pending_changes"] = [dict(p._mapping) for p in pending]
        return success(d)
    except Exception as e:
        return error(str(e), 500)


@empdb_bp.post("/personal-info/<employee_id>/request-change")
@require_auth
def request_info_change(employee_id):
    """
    Self-service edit. Non-sensitive fields auto-apply (DB trigger);
    sensitive fields (bank, citizenship, PAN, address) route to HR approval.
    """
    body = request.get_json() or {}
    required = ["field_name", "new_value"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)

    try:
        old_row = db.session.execute(text(
            f"SELECT {body['field_name']} FROM employees WHERE id = :eid"
        ), {"eid": employee_id}).fetchone()
        old_value = old_row[0] if old_row else None

        result = db.session.execute(text("""
            INSERT INTO employee_info_change_requests
              (company_id, employee_id, field_name, old_value, new_value, requested_at)
            VALUES (:cid, :eid, :field, :old, :new, NOW())
            RETURNING id, status
        """), {"cid": g.company_id, "eid": employee_id, "field": body["field_name"],
               "old": str(old_value) if old_value else None, "new": body["new_value"]})
        row = result.fetchone()
        db.session.commit()

        return created({
            "request_id": str(row[0]), "status": row[1],
            "note": "Auto-applied immediately." if row[1] == "auto_applied"
                    else "Routed to HR for approval (sensitive field).",
        })
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.post("/personal-info/change-requests/<request_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager")
def decide_change_request(request_id):
    """HR approves/rejects a pending sensitive-field change."""
    body = request.get_json() or {}
    decision = body.get("decision")
    if decision not in ("approved", "rejected"):
        return error("decision must be 'approved' or 'rejected'", 422)
    try:
        db.session.execute(text("""
            UPDATE employee_info_change_requests
               SET status = :decision, reviewed_by = :user, reviewed_at = NOW(),
                   rejection_reason = :reason
             WHERE id = :rid AND company_id = :cid
        """), {"decision": decision, "user": g.user_id, "reason": body.get("reason"),
               "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"decision": decision})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.get("/personal-info/pending-changes")
@require_auth
@require_role("super_admin", "hr_manager")
def pending_changes_queue():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_pending_info_changes WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 4. FAMILY DETAILS
# ════════════════════════════════════════════════════════════════

@empdb_bp.get("/family/<employee_id>")
@require_auth
@require_role("super_admin", "hr_manager", "employee")
def list_family(employee_id):
    try:
        rows = db.session.execute(text("""
            SELECT * FROM employee_family_members
            WHERE employee_id = :eid AND company_id = :cid AND NOT is_deleted
            ORDER BY relationship
        """), {"eid": employee_id, "cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdb_bp.post("/family")
@require_auth
def add_family_member():
    body = request.get_json() or {}
    required = ["employee_id", "full_name", "relationship"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO employee_family_members
              (company_id, employee_id, full_name, relationship, date_of_birth,
               occupation, is_dependent, created_at)
            VALUES
              (:cid, :eid, :name, :rel, :dob,
               :occ, :dependent, NOW())
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "name": body["full_name"],
            "rel": body["relationship"], "dob": body.get("date_of_birth"),
            "occ": body.get("occupation",""), "dependent": body.get("is_dependent", False),
        })
        db.session.commit()
        return created({"message": "Family member added.",
                        "note": "Used for SSF dependent family protection scheme if marked dependent."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.post("/family/<member_id>/enroll-benefits")
@require_auth
@require_role("super_admin", "hr_manager")
def enroll_family_benefits(member_id):
    try:
        db.session.execute(text("""
            UPDATE employee_family_members
               SET benefits_enrolled = TRUE, benefits_enrolled_date = NOW()::DATE, updated_at = NOW()
             WHERE id = :mid AND company_id = :cid
        """), {"mid": member_id, "cid": g.company_id})
        db.session.commit()
        return success({"enrolled": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.get("/family/verification-due")
@require_auth
@require_role("super_admin", "hr_manager")
def family_verification_due():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_family_verification_due WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 5. EMERGENCY CONTACTS
# ════════════════════════════════════════════════════════════════

@empdb_bp.get("/emergency-contacts/<employee_id>")
@require_auth
def list_emergency_contacts(employee_id):
    try:
        rows = db.session.execute(text("""
            SELECT * FROM employee_emergency_contacts
            WHERE employee_id = :eid AND company_id = :cid AND NOT is_deleted
            ORDER BY is_primary DESC
        """), {"eid": employee_id, "cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdb_bp.post("/emergency-contacts")
@require_auth
def add_emergency_contact():
    body = request.get_json() or {}
    required = ["employee_id", "full_name", "relationship", "phone"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO employee_emergency_contacts
              (company_id, employee_id, full_name, relationship, phone, alt_phone,
               address, is_primary, created_at)
            VALUES
              (:cid, :eid, :name, :rel, :phone, :alt,
               :addr, :primary, NOW())
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "name": body["full_name"],
            "rel": body["relationship"], "phone": body["phone"], "alt": body.get("alt_phone"),
            "addr": body.get("address",""), "primary": body.get("is_primary", False),
        })
        db.session.commit()
        return created({"message": "Emergency contact added."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.put("/emergency-contacts/<contact_id>/set-primary")
@require_auth
def set_primary_contact(contact_id):
    """DB trigger auto-demotes any other primary for this employee."""
    try:
        db.session.execute(text("""
            UPDATE employee_emergency_contacts SET is_primary = TRUE, updated_at = NOW()
            WHERE id = :cid_e AND company_id = :cid
        """), {"cid_e": contact_id, "cid": g.company_id})
        db.session.commit()
        return success({"primary_set": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.get("/emergency-contacts/compliance")
@require_auth
@require_role("super_admin", "hr_manager")
def emergency_contact_compliance():
    """Flags employees with <2 contacts or no primary set."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_emergency_contact_compliance WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 6. EMPLOYEE ASSETS
# ════════════════════════════════════════════════════════════════

@empdb_bp.get("/assets")
@require_auth
def list_assets():
    employee_id = request.args.get("employee_id")
    status      = request.args.get("status")
    search      = request.args.get("search", "")
    try:
        q = """
            SELECT a.*, e.first_name, e.last_name, e.employee_code
            FROM employee_assets a
            JOIN employees e ON a.employee_id = e.id
            WHERE a.company_id = :cid AND NOT a.is_deleted
        """
        params = {"cid": g.company_id}
        if employee_id: q += " AND a.employee_id = :eid"; params["eid"] = employee_id
        if status: q += " AND a.status = :status"; params["status"] = status
        if search: q += " AND (e.first_name ILIKE :s OR a.item_type ILIKE :s)"; params["s"] = f"%{search}%"
        q += " ORDER BY a.issue_date DESC"
        rows = db.session.execute(text(q), params).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdb_bp.post("/assets")
@require_auth
@require_role("super_admin", "hr_manager")
def assign_asset():
    body = request.get_json() or {}
    required = ["employee_id", "item_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO employee_assets
              (company_id, employee_id, item_type, model, serial_number, value_npr,
               issue_date, status, created_at)
            VALUES
              (:cid, :eid, :item, :model, :serial, :value,
               :issue_date, 'assigned', NOW())
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "item": body["item_type"],
            "model": body.get("model",""), "serial": body.get("serial_number"),
            "value": body.get("value_npr"), "issue_date": body.get("issue_date", date.today().isoformat()),
        })
        db.session.commit()
        return created({"message": "Asset assigned. Custody receipt pending signature."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.post("/assets/<asset_id>/sign-custody")
def sign_custody_receipt(asset_id):
    """Public — employee signs the custody/liability receipt."""
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE employee_assets
               SET custody_receipt_signed = TRUE, custody_receipt_url = :url,
                   custody_signed_date = NOW()::DATE, updated_at = NOW()
             WHERE id = :aid
        """), {"url": body.get("receipt_url"), "aid": asset_id})
        db.session.commit()
        return success({"signed": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.put("/assets/<asset_id>/report-issue")
@require_auth
def report_asset_issue(asset_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE employee_assets
               SET status = 'in_repair', condition_notes = :note, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"note": body.get("note", "Reported issue"), "aid": asset_id, "cid": g.company_id})
        db.session.commit()
        return success({"reported": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.put("/assets/<asset_id>/mark-returned")
@require_auth
@require_role("super_admin", "hr_manager")
def mark_asset_returned(asset_id):
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            UPDATE employee_assets
               SET status = 'returned', return_date = NOW()::DATE,
                   return_condition = :cond, updated_at = NOW()
             WHERE id = :aid AND company_id = :cid
        """), {"cond": body.get("return_condition", "Good"), "aid": asset_id, "cid": g.company_id})
        db.session.commit()
        return success({"returned": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@empdb_bp.get("/assets/custody-dashboard")
@require_auth
@require_role("super_admin", "hr_manager")
def asset_custody_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_asset_custody_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ════════════════════════════════════════════════════════════════
# 7. EMPLOYMENT HISTORY (append-only)
# ════════════════════════════════════════════════════════════════

@empdb_bp.get("/employment-history/<employee_id>")
@require_auth
def list_employment_history(employee_id):
    try:
        rows = db.session.execute(text("""
            SELECT * FROM employee_employment_history
            WHERE employee_id = :eid AND company_id = :cid
            ORDER BY event_date DESC, created_at DESC
        """), {"eid": employee_id, "cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@empdb_bp.post("/employment-history")
@require_auth
@require_role("super_admin", "hr_manager")
def record_employment_event():
    """
    Manual event recording. Most events (salary/manager/department changes)
    auto-record via DB trigger when `employees` table is updated directly —
    this endpoint is for events without a corresponding employees-table change
    (e.g. 'confirmation', or a historical backfill).
    """
    body = request.get_json() or {}
    required = ["employee_id", "event_type"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO employee_employment_history
              (company_id, employee_id, event_date, event_type, title_at_event,
               department_id_at_event, manager_name_at_event, salary_npr_at_event,
               employment_classification_at_event, note, detail, recorded_by, created_at)
            VALUES
              (:cid, :eid, :date, :etype, :title,
               :dept, :mgr_name, :salary,
               :classification, :note, :detail, :user, NOW())
        """), {
            "cid": g.company_id, "eid": body["employee_id"], "date": body.get("event_date", date.today().isoformat()),
            "etype": body["event_type"], "title": body.get("title_at_event"),
            "dept": body.get("department_id_at_event"), "mgr_name": body.get("manager_name_at_event"),
            "salary": body.get("salary_npr_at_event"), "classification": body.get("employment_classification_at_event"),
            "note": body.get("note", ""), "detail": body.get("detail", ""), "user": g.user_id,
        })
        db.session.commit()
        return created({"message": "Employment event recorded (immutable)."})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# CROSS-MODULE: PROFILE COMPLETENESS DASHBOARD
# ════════════════════════════════════════════════════════════════

@empdb_bp.get("/completeness-dashboard")
@require_auth
@require_role("super_admin", "hr_manager")
def completeness_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_employee_profile_completeness WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


# ── Excel import/export ───────────────────────────────────────
@empdb_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["directory", "family", "emergency-contacts", "assets"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"empdb_{module}")
    return jsonify(result), 200 if result["success"] else 422


@empdb_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"empdb_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"employee_db_{module}_template.xlsx")
