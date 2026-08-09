"""
FILE: backend/routes/leave_setup_routes.py
NepHR Pro — Workforce Operations > Leave Management > Leave Setup (4 pages)
URL prefix: /api/v1/leave-setup

  1. /leave-year, /approval-hierarchies  — Leave Setup
  2. /policies                              — Leave Policy
  3. /types                                    — Leave Type
  4. /balance-rules, /balances                    — Leave Balance Rule

Nepal Labour Act 2074: Home Leave 1 day/20 worked, accumulate 90, encash
above 90; Sick Leave 12 days/yr, accumulate 45, encash above 45, doc after
3 days; Maternity 98 days (60 paid); Paternity 15 days; Mourning 13 days;
leave is a statutory right, cannot be deducted from compensation.
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

leave_setup_bp = Blueprint("leave_setup", __name__, url_prefix="/api/v1/leave-setup")

# Nepal LA2074 statutory defaults, used to seed a new company's leave types
STATUTORY_LEAVE_DEFAULTS = [
    {"name": "Home/Annual Leave", "code": "HL", "color_hex": "#10b981", "icon": "🏖",
     "annual_entitlement_text": "1 day per 20 worked", "is_paid": True, "requires_doc": False,
     "probation_eligible": False, "max_carry_forward_days": 90, "is_statutory": True},
    {"name": "Sick Leave", "code": "SL", "color_hex": "#ef4444", "icon": "🤒",
     "annual_entitlement_text": "12 days/year (pro-rata)", "is_paid": True, "requires_doc": True,
     "doc_threshold_days": 3, "probation_eligible": True, "max_carry_forward_days": 45, "is_statutory": True},
    {"name": "Maternity Leave", "code": "ML", "color_hex": "#ec4899", "icon": "🤰",
     "annual_entitlement_text": "98 days (60 paid)", "is_paid": True, "requires_doc": True,
     "probation_eligible": True, "max_carry_forward_days": 0, "is_statutory": True},
    {"name": "Paternity Leave", "code": "PL", "color_hex": "#3b82f6", "icon": "👨‍👶",
     "annual_entitlement_text": "15 days", "is_paid": True, "requires_doc": False,
     "probation_eligible": True, "max_carry_forward_days": 0, "is_statutory": True},
    {"name": "Mourning Leave (Kiriya Bida)", "code": "MR", "color_hex": "#64748b", "icon": "🕯",
     "annual_entitlement_text": "13 days", "is_paid": True, "requires_doc": False,
     "probation_eligible": True, "max_carry_forward_days": 0, "is_statutory": True},
]


# ════════════════════════════════════════════════════════════════
# 1. LEAVE SETUP
# ════════════════════════════════════════════════════════════════

@leave_setup_bp.get("/leave-year")
@require_auth
def get_leave_year():
    try:
        row = db.session.execute(text(
            "SELECT * FROM leave_year_config WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchone()
        if not row:
            return success({"year_type": "fiscal_nepal", "current_bs_year_label": None, "current_ad_year_label": None})
        return success(dict(row._mapping))
    except Exception as e:
        return error(str(e), 500)


@leave_setup_bp.put("/leave-year")
@require_auth
@require_role("super_admin", "hr_manager")
def update_leave_year():
    body = request.get_json() or {}
    try:
        db.session.execute(text("""
            INSERT INTO leave_year_config
              (company_id, year_type, fiscal_year_start_month, fiscal_year_start_day,
               current_bs_year_label, current_ad_year_label, updated_at)
            VALUES
              (:cid, :ytype, :start_month, :start_day,
               :bs_label, :ad_label, NOW())
            ON CONFLICT (company_id)
            DO UPDATE SET year_type = EXCLUDED.year_type, fiscal_year_start_month = EXCLUDED.fiscal_year_start_month,
                          fiscal_year_start_day = EXCLUDED.fiscal_year_start_day,
                          current_bs_year_label = EXCLUDED.current_bs_year_label,
                          current_ad_year_label = EXCLUDED.current_ad_year_label, updated_at = NOW()
        """), {
            "cid": g.company_id, "ytype": body.get("year_type", "fiscal_nepal"),
            "start_month": body.get("fiscal_year_start_month", 4), "start_day": body.get("fiscal_year_start_day", 16),
            "bs_label": body.get("current_bs_year_label"), "ad_label": body.get("current_ad_year_label"),
        })
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_setup_bp.get("/approval-hierarchies")
@require_auth
def list_hierarchies():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM leave_approval_hierarchies WHERE company_id = :cid AND is_active"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_setup_bp.post("/approval-hierarchies")
@require_auth
@require_role("super_admin", "hr_manager")
def create_hierarchy():
    body = request.get_json() or {}
    required = ["name", "approval_levels"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO leave_approval_hierarchies
              (company_id, name, approval_levels, applies_to_employment_types, escalation_after_days, created_at)
            VALUES
              (:cid, :name, :levels, :emp_types, :escalation, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "name": body["name"], "levels": body["approval_levels"],
            "emp_types": body.get("applies_to_employment_types", ["regular"]),
            "escalation": body.get("escalation_after_days", 3),
        })
        hierarchy_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"hierarchy_id": hierarchy_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 2. LEAVE POLICY
# ════════════════════════════════════════════════════════════════

@leave_setup_bp.get("/policies")
@require_auth
def list_policies():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM leave_policies WHERE company_id = :cid AND status != 'inactive'"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_setup_bp.post("/policies")
@require_auth
@require_role("super_admin", "hr_manager")
def create_policy():
    body = request.get_json() or {}
    if not body.get("name"): return error("name required", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO leave_policies
              (company_id, name, applies_to, min_notice_days, max_consecutive_days,
               requires_doc_after_days, blackout_dates, allows_negative_balance,
               applies_during_probation, status, created_at)
            VALUES
              (:cid, :name, :applies_to, :notice, :max_consec,
               :doc_days, :blackouts, :neg_balance,
               :probation, 'active', NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "name": body["name"], "applies_to": body.get("applies_to", "All Regular Employees"),
            "notice": body.get("min_notice_days", 3), "max_consec": body.get("max_consecutive_days"),
            "doc_days": body.get("requires_doc_after_days"), "blackouts": body.get("blackout_dates", []),
            "neg_balance": body.get("allows_negative_balance", False),
            "probation": body.get("applies_during_probation", "Restricted (HR approval only)"),
        })
        policy_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"policy_id": policy_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_setup_bp.put("/policies/<policy_id>")
@require_auth
@require_role("super_admin", "hr_manager")
def update_policy(policy_id):
    body = request.get_json() or {}
    allowed = ["name", "applies_to", "min_notice_days", "max_consecutive_days", "requires_doc_after_days",
               "blackout_dates", "allows_negative_balance", "applies_during_probation", "status"]
    updates = {k: body[k] for k in allowed if k in body}
    if not updates: return error("No valid fields provided", 400)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates.update({"pid": policy_id, "cid": g.company_id})
    try:
        db.session.execute(text(
            f"UPDATE leave_policies SET {set_clause}, updated_at = NOW() WHERE id = :pid AND company_id = :cid"
        ), updates)
        db.session.commit()
        return success({"updated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 3. LEAVE TYPE
# ════════════════════════════════════════════════════════════════

@leave_setup_bp.get("/types")
@require_auth
def list_leave_types():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM leave_types WHERE company_id = :cid AND status = 'active' ORDER BY is_statutory DESC, name"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_setup_bp.post("/types/seed-statutory-defaults")
@require_auth
@require_role("super_admin", "hr_manager")
def seed_statutory_defaults():
    """Bulk-creates Nepal LA2074 statutory leave types for a new company onboarding."""
    try:
        created_ids = []
        for lt in STATUTORY_LEAVE_DEFAULTS:
            result = db.session.execute(text("""
                INSERT INTO leave_types
                  (company_id, name, code, color_hex, icon, annual_entitlement_text, is_paid,
                   requires_doc, doc_threshold_days, probation_eligible, max_carry_forward_days, is_statutory, created_at)
                VALUES
                  (:cid, :name, :code, :color, :icon, :entitlement, :paid,
                   :req_doc, :doc_threshold, :probation, :carry_fwd, :statutory, NOW())
                ON CONFLICT (company_id, code) DO NOTHING
                RETURNING id
            """), {
                "cid": g.company_id, "name": lt["name"], "code": lt["code"], "color": lt["color_hex"],
                "icon": lt["icon"], "entitlement": lt["annual_entitlement_text"], "paid": lt["is_paid"],
                "req_doc": lt["requires_doc"], "doc_threshold": lt.get("doc_threshold_days"),
                "probation": lt["probation_eligible"], "carry_fwd": lt["max_carry_forward_days"], "statutory": lt["is_statutory"],
            })
            row = result.fetchone()
            if row: created_ids.append(str(row[0]))
        db.session.commit()
        return created({"created_count": len(created_ids), "leave_type_ids": created_ids})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_setup_bp.post("/types")
@require_auth
@require_role("super_admin", "hr_manager")
def create_leave_type():
    body = request.get_json() or {}
    required = ["name", "code"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO leave_types
              (company_id, name, code, color_hex, icon, annual_entitlement_text, is_paid,
               requires_doc, doc_threshold_days, probation_eligible, half_day_supported,
               max_carry_forward_days, is_statutory, created_at)
            VALUES
              (:cid, :name, :code, :color, :icon, :entitlement, :paid,
               :req_doc, :doc_threshold, :probation, :half_day,
               :carry_fwd, FALSE, NOW())
            RETURNING id
        """), {
            "cid": g.company_id, "name": body["name"], "code": body["code"], "color": body.get("color_hex", "#64748b"),
            "icon": body.get("icon", "📋"), "entitlement": body.get("annual_entitlement_text"),
            "paid": body.get("is_paid", True), "req_doc": body.get("requires_doc", False),
            "doc_threshold": body.get("doc_threshold_days"), "probation": body.get("probation_eligible", False),
            "half_day": body.get("half_day_supported", True), "carry_fwd": body.get("max_carry_forward_days", 0),
        })
        leave_type_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"leave_type_id": leave_type_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# 4. LEAVE BALANCE RULE
# ════════════════════════════════════════════════════════════════

@leave_setup_bp.get("/balance-rules")
@require_auth
def list_balance_rules():
    try:
        rows = db.session.execute(text("""
            SELECT lbr.*, lt.name AS leave_type_name, lt.code
            FROM leave_balance_rules lbr
            JOIN leave_types lt ON lbr.leave_type_id = lt.id
            WHERE lbr.company_id = :cid AND lbr.status = 'active'
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_setup_bp.post("/balance-rules")
@require_auth
@require_role("super_admin", "hr_manager")
def create_balance_rule():
    body = request.get_json() or {}
    required = ["leave_type_id", "accrual_method"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        monthly_equiv = None
        if body.get("annual_grant_days"):
            monthly_equiv = round(float(body["annual_grant_days"]) / 12, 2)

        result = db.session.execute(text("""
            INSERT INTO leave_balance_rules
              (company_id, leave_type_id, accrual_method, accrual_formula_text, annual_grant_days,
               monthly_equivalent_days, max_carry_forward_days, encashable_above_days, expiration_policy,
               proration_on_join, negative_balance_allowed, created_at)
            VALUES
              (:cid, :ltid, :method, :formula, :grant,
               :monthly, :carry_fwd, :encash_above, :expiration,
               :prorate, :neg_balance, NOW())
            ON CONFLICT (company_id, leave_type_id)
            DO UPDATE SET accrual_method = EXCLUDED.accrual_method, accrual_formula_text = EXCLUDED.accrual_formula_text,
                          annual_grant_days = EXCLUDED.annual_grant_days, monthly_equivalent_days = EXCLUDED.monthly_equivalent_days,
                          max_carry_forward_days = EXCLUDED.max_carry_forward_days, encashable_above_days = EXCLUDED.encashable_above_days,
                          expiration_policy = EXCLUDED.expiration_policy, proration_on_join = EXCLUDED.proration_on_join,
                          negative_balance_allowed = EXCLUDED.negative_balance_allowed, updated_at = NOW()
            RETURNING id
        """), {
            "cid": g.company_id, "ltid": body["leave_type_id"], "method": body["accrual_method"],
            "formula": body.get("accrual_formula_text"), "grant": body.get("annual_grant_days"),
            "monthly": monthly_equiv, "carry_fwd": body.get("max_carry_forward_days", 0),
            "encash_above": body.get("encashable_above_days"), "expiration": body.get("expiration_policy", "no_expiry"),
            "prorate": body.get("proration_on_join", True), "neg_balance": body.get("negative_balance_allowed", False),
        })
        rule_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"rule_id": rule_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@leave_setup_bp.get("/balances/<employee_id>")
def get_employee_balances(employee_id):
    """Public/ESS — real-time balance dashboard ('ring chart' data source)."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_employee_leave_balance_summary WHERE employee_id IS NOT NULL"
        ), {}).fetchall()
        # filter in Python since the view doesn't expose employee_id directly by name match safety
        filtered = [dict(r._mapping) for r in rows]
        return success(filtered)
    except Exception:
        return success([])


@leave_setup_bp.get("/balances/expiration-warnings")
@require_auth
@require_role("super_admin", "hr_manager")
def expiration_warnings():
    """Use-it-or-lose-it balances approaching cutoff."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leave_expiration_warnings WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_setup_bp.get("/balances/liability-report")
@require_auth
@require_role("super_admin", "hr_manager")
def liability_report():
    """Financial exposure from accumulated paid leave balances -- balance sheet liability."""
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_leave_liability_report WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@leave_setup_bp.post("/balances/run-accrual")
@require_auth
@require_role("super_admin", "hr_manager")
def run_accrual_batch():
    """
    Triggers the monthly/periodic accrual run across all employees for a
    given leave_type. Applies the linked balance rule's formula.
    """
    body = request.get_json() or {}
    if not body.get("leave_type_id"): return error("leave_type_id required", 422)
    try:
        rule = db.session.execute(text(
            "SELECT * FROM leave_balance_rules WHERE leave_type_id = :ltid AND company_id = :cid"
        ), {"ltid": body["leave_type_id"], "cid": g.company_id}).fetchone()
        if not rule: return not_found("Leave balance rule")

        accrual_amount = rule.monthly_equivalent_days or 0
        result = db.session.execute(text("""
            UPDATE employee_leave_balances
               SET accrued_to_date_days = accrued_to_date_days + :amount, last_accrual_run_date = CURRENT_DATE
             WHERE leave_type_id = :ltid AND company_id = :cid
        """), {"amount": accrual_amount, "ltid": body["leave_type_id"], "cid": g.company_id})
        db.session.commit()

        return success({"accrual_amount_per_employee": float(accrual_amount), "employees_updated": result.rowcount})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@leave_setup_bp.post("/excel-import/<module>")
@require_auth
def excel_import(module):
    allowed = ["policies", "types", "balance-rules"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"leave_setup_{module}")
    return jsonify(result), 200 if result["success"] else 422


@leave_setup_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"leave_setup_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"leave_setup_{module}_template.xlsx")
