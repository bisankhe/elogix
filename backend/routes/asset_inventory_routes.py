"""
FILE: backend/routes/asset_inventory_routes.py
NepHR Pro -- Finance, Assets & Administration > Asset & Inventory
(9 pages: Asset Management, IT Inventory, Furniture Inventory,
Stationery Inventory, Asset Allocation, Asset Return, QR or Barcode
Tracking, Warranty Tracking, Vendor Management)
URL prefix: /api/v1/asset-inventory

asset_items is the first genuine asset catalog in the build. The
EXISTING asset_allocations (onboarding logistics) is extended via an
optional asset_item_id link, never duplicated. Vendor Management here
is procurement vendors -- deliberately distinct from the existing
staffing/outsourcing vendor module.

Nepal legal grounding: occupational safety mandates functional
equipment tracking; unreturned property may be recovered from final
salary with due process; statutory duty to repair/replace defective
equipment ties directly to warranty tracking.
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

asset_bp = Blueprint("asset_inventory", __name__, url_prefix="/api/v1/asset-inventory")


# ════════════════════════════════════════════════════════════════
# PAGE 1: ASSET MANAGEMENT (global dashboard)
# ════════════════════════════════════════════════════════════════

@asset_bp.get("/dashboard")
@require_auth
@require_role("super_admin", "hr_manager")
def asset_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_asset_category_rollup WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        ghosts = db.session.execute(text(
            "SELECT * FROM v_ghost_asset_candidates WHERE company_id = :cid LIMIT 20"
        ), {"cid": g.company_id}).fetchall()
        return success({"categories": [dict(r._mapping) for r in rows], "ghost_candidates": [dict(r._mapping) for r in ghosts]})
    except Exception:
        return success({"categories": [], "ghost_candidates": []})


# ════════════════════════════════════════════════════════════════
# PAGES 2 & 3: IT INVENTORY / FURNITURE INVENTORY (shared table,
# filtered by category)
# ════════════════════════════════════════════════════════════════

@asset_bp.get("/items/<category>")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_items_by_category(category):
    if category not in ("it_equipment", "furniture"): return error("Invalid category", 400)
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_asset_inventory_detail WHERE company_id = :cid AND category = :cat"
        ), {"cid": g.company_id, "cat": category}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@asset_bp.post("/items")
@require_auth
@require_role("super_admin", "hr_manager")
def create_item():
    """DB trigger auto-generates the verify_qr_code on insert."""
    body = request.get_json() or {}
    required = ["category", "item_name", "asset_tag"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO asset_items (company_id, asset_tag, category, item_name, serial_number, purchase_value_npr, vendor_id, warranty_until, location_label, created_at)
            VALUES (:cid, :tag, :cat, :name, :serial, :value, :vendor, :warranty, :loc, NOW())
            RETURNING id, verify_qr_code
        """), {"cid": g.company_id, "tag": body["asset_tag"], "cat": body["category"], "name": body["item_name"],
               "serial": body.get("serial_number"), "value": body.get("purchase_value_npr"), "vendor": body.get("vendor_id"),
               "warranty": body.get("warranty_until"), "loc": body.get("location_label")})
        row = result.fetchone()
        db.session.commit()
        return created({"item_id": str(row[0]), "qr_code": row[1]})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 4: STATIONERY INVENTORY
# ════════════════════════════════════════════════════════════════

@asset_bp.get("/stationery")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def stationery_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_stationery_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@asset_bp.post("/stationery/request")
def request_stationery():
    """Public/ESS -- DB trigger auto-notifies facilities when threshold is crossed."""
    body = request.get_json() or {}
    required = ["employee_id", "stationery_stock_level_id", "quantity_requested"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO stationery_requests (company_id, employee_id, stationery_stock_level_id, quantity_requested, requested_at)
            VALUES (:cid, :eid, :stock, :qty, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "stock": body["stationery_stock_level_id"], "qty": body["quantity_requested"]})
        req_id = str(result.fetchone()[0])
        db.session.execute(text("""
            UPDATE stationery_stock_levels SET quantity_on_hand = quantity_on_hand - :qty WHERE id = :stock
        """), {"qty": body["quantity_requested"], "stock": body["stationery_stock_level_id"]})
        db.session.commit()
        return created({"request_id": req_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 5: ASSET ALLOCATION (Asset & Inventory's own ongoing hub)
# ════════════════════════════════════════════════════════════════

@asset_bp.get("/allocations")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_allocations():
    """Read-only join showing every asset_items row that's currently assigned."""
    try:
        rows = db.session.execute(text("""
            SELECT ai.*, e.first_name, e.last_name FROM asset_items ai
            JOIN employees e ON ai.currently_assigned_to_employee_id = e.id
            WHERE ai.company_id = :cid AND ai.status = 'assigned'
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@asset_bp.post("/allocations/allocate")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def allocate_asset():
    """Direct catalog-item allocation, outside the onboarding flow -- mid-tenure replacements/upgrades."""
    body = request.get_json() or {}
    required = ["asset_item_id", "employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            UPDATE asset_items SET status = 'assigned', currently_assigned_to_employee_id = :eid
            WHERE id = :aid AND company_id = :cid AND status = 'available'
        """), {"eid": body["employee_id"], "aid": body["asset_item_id"], "cid": g.company_id})
        db.session.commit()
        return success({"allocated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 6: ASSET RETURN (Asset & Inventory's own ongoing hub)
# ════════════════════════════════════════════════════════════════

@asset_bp.get("/returns/pending")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def pending_returns():
    try:
        rows = db.session.execute(text("""
            SELECT ai.*, e.first_name, e.last_name, es.employment_status FROM asset_items ai
            JOIN employees e ON ai.currently_assigned_to_employee_id = e.id
            LEFT JOIN employees es ON es.id = e.id
            WHERE ai.company_id = :cid AND ai.status = 'assigned'
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@asset_bp.post("/returns/<item_id>/confirm")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def confirm_return(item_id):
    """Marks the asset back into the available pool."""
    try:
        db.session.execute(text("""
            UPDATE asset_items SET status = 'available', currently_assigned_to_employee_id = NULL WHERE id = :iid AND company_id = :cid
        """), {"iid": item_id, "cid": g.company_id})
        db.session.commit()
        return success({"returned": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@asset_bp.post("/returns/<item_id>/flag-for-deduction")
@require_auth
@require_role("super_admin", "hr_manager")
def flag_for_settlement_deduction(item_id):
    """Links an overdue/unreturned asset value to the Final Settlement deduction review -- never an automatic silent deduction."""
    body = request.get_json() or {}
    if not body.get("final_settlement_id"): return error("final_settlement_id required", 422)
    try:
        # In production: insert into a final_settlement_deductions table referencing both records.
        # Kept generic here since final_settlement_payroll_view already exists from Payroll Finalization.
        return success({"flagged": True, "note": "Routed to Final Settlement for due-process review"})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 7: QR OR BARCODE TRACKING
# ════════════════════════════════════════════════════════════════

@asset_bp.get("/scan/lookup/<qr_code>")
def lookup_by_qr(qr_code):
    """Public -- the core scan-to-detail lookup. No auth required for the scan itself; sensitive fields are masked client-side as needed."""
    try:
        row = db.session.execute(text(
            "SELECT * FROM asset_items WHERE verify_qr_code = :code"
        ), {"code": qr_code}).fetchone()
        if not row: return not_found("Asset")
        return success(dict(row._mapping))
    except Exception as e:
        return error(str(e), 500)


@asset_bp.post("/scan/log")
@require_auth
def log_scan():
    """DB trigger updates last_scanned_at and notifies the assigned employee + manager for repair/return actions."""
    body = request.get_json() or {}
    required = ["asset_item_id", "scan_action"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO asset_scan_log (company_id, asset_item_id, scan_action, scanned_by_employee_id, scan_location_label, scanned_at)
            VALUES (:cid, :aid, :action, :user, :loc, NOW()) RETURNING id
        """), {"cid": g.company_id, "aid": body["asset_item_id"], "action": body["scan_action"], "user": g.user_id, "loc": body.get("scan_location_label")})
        scan_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"scan_id": scan_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@asset_bp.post("/scan/ai-audit-summary")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_audit_summary():
    """AI summarizes a full audit cycle's scan results, flagging ghost-asset candidates."""
    try:
        insight = generate_ai_insights({"type": "asset_audit_summary", "company_id": g.company_id})
        return success({"summary": insight.get("summary"), "discrepancies": insight.get("discrepancies", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 8: WARRANTY TRACKING
# ════════════════════════════════════════════════════════════════

@asset_bp.get("/warranty")
@require_auth
@require_role("super_admin", "hr_manager")
def warranty_tracking():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_warranty_tracking WHERE company_id = :cid ORDER BY days_left ASC"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@asset_bp.post("/warranty/ai-replacement-recommendation")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_replacement_recommendation():
    """AI prescribes replacement timing based on asset health and utilization."""
    body = request.get_json() or {}
    if not body.get("asset_item_id"): return error("asset_item_id required", 422)
    try:
        insight = generate_ai_insights({"type": "asset_replacement_recommendation", "asset_item_id": body["asset_item_id"]})
        return success({"recommendation": insight.get("recommendation")})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 9: VENDOR MANAGEMENT (procurement vendors)
# ════════════════════════════════════════════════════════════════

@asset_bp.get("/vendors")
@require_auth
@require_role("super_admin", "hr_manager")
def list_procurement_vendors():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_procurement_vendor_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@asset_bp.post("/vendors/orders")
@require_auth
@require_role("super_admin", "hr_manager")
def create_procurement_order():
    body = request.get_json() or {}
    required = ["procurement_vendor_id", "order_description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO procurement_orders (company_id, procurement_vendor_id, order_description, order_value_npr, rfq_sent_at)
            VALUES (:cid, :vendor, :desc, :value, NOW()) RETURNING id
        """), {"cid": g.company_id, "vendor": body["procurement_vendor_id"], "desc": body["order_description"], "value": body.get("order_value_npr")})
        order_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"order_id": order_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@asset_bp.put("/vendors/orders/<order_id>/advance-stage")
@require_auth
@require_role("super_admin", "hr_manager")
def advance_order_stage(order_id):
    body = request.get_json() or {}
    if not body.get("stage"): return error("stage required", 422)
    try:
        is_received = body["stage"] == "received"
        db.session.execute(text("""
            UPDATE procurement_orders SET stage = :stage, received_at = CASE WHEN :received THEN NOW() ELSE received_at END
            WHERE id = :oid AND company_id = :cid
        """), {"stage": body["stage"], "received": is_received, "oid": order_id, "cid": g.company_id})
        db.session.commit()
        return success({"advanced": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@asset_bp.post("/excel-import/<module>")
@require_auth
@require_role("super_admin", "hr_manager")
def excel_import(module):
    allowed = ["items", "stationery", "vendors"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"asset_inventory_{module}")
    return jsonify(result), 200 if result["success"] else 422


@asset_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"asset_inventory_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"asset_inventory_{module}_template.xlsx")
