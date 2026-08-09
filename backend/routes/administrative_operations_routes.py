"""
FILE: backend/routes/administrative_operations_routes.py
NepHR Pro -- Finance, Assets & Administration > Administrative
Operations (11 pages: Visitor Management, Meeting Room Booking,
Minutes of Meeting, Travel Management, Transport Management,
Cafeteria Management, Helpdesk, Facility Management, Gate Pass
Management, ID Card Management, Event Management)
URL prefix: /api/v1/admin-ops

Minutes of Meeting reuses the EXISTING /api/v1/mss/meetings* endpoints
verbatim -- no routes duplicated here. Gate Pass / ID Card extend the
universal qr_codes registry. Helpdesk here is facility_tickets,
deliberately distinct from hr_helpdesk_tickets.

Nepal legal grounding: Section 70 (non-worker safety); Rule 7.7 room
capacity; Section 33 (mandatory female-employee transport); Section 28
(paid tiffin break); Section 74 (Safety Committee); Chapter 20 +
Section 77 (immediate safety-stop duty); Section 9 (employee records,
outsourced-vs-direct flagging).
"""

from flask import Blueprint, request, jsonify, g, send_file
from sqlalchemy import text
import io

from ..extensions import db
from ..middleware.auth import require_auth, require_role
from ..utils.pagination import success, error, created, not_found
from ..utils.excel_import import parse_excel_upload, build_template_xlsx
from ..ai.insights import generate_ai_insights

adminops_bp = Blueprint("administrative_operations", __name__, url_prefix="/api/v1/admin-ops")


# ════════════════════════════════════════════════════════════════
# PAGE 1: VISITOR MANAGEMENT
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/visitors")
@require_auth
@require_role("super_admin", "hr_manager")
def list_visitors():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_visitors_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.post("/visitors")
def pre_register_visitor():
    """Public/front-desk -- generates a QR pass via the universal qr_codes registry."""
    body = request.get_json() or {}
    required = ["visitor_name", "purpose", "host_employee_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO visitors (company_id, visitor_name, purpose, host_employee_id, expected_at, created_at)
            VALUES (:cid, :name, :purpose, :host, :expected, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "name": body["visitor_name"], "purpose": body["purpose"],
               "host": body["host_employee_id"], "expected": body.get("expected_at")})
        visitor_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"visitor_id": visitor_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@adminops_bp.put("/visitors/<visitor_id>/checkin")
def checkin_visitor(visitor_id):
    """DB trigger notifies the host immediately."""
    try:
        db.session.execute(text("UPDATE visitors SET status = 'checked_in' WHERE id = :vid"), {"vid": visitor_id})
        db.session.commit()
        return success({"checked_in": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@adminops_bp.put("/visitors/<visitor_id>/checkout")
def checkout_visitor(visitor_id):
    try:
        db.session.execute(text("UPDATE visitors SET status = 'checked_out', checked_out_at = NOW() WHERE id = :vid"), {"vid": visitor_id})
        db.session.commit()
        return success({"checked_out": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 2: MEETING ROOM BOOKING
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/meeting-rooms")
def list_meeting_rooms():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_meeting_room_availability WHERE company_id = :cid"
        ), {"cid": request.args.get("company_id")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.post("/meeting-rooms/book")
def book_meeting_room():
    """DB trigger BLOCKS the booking if attendee_count exceeds the room's safe capacity (Rule 7.7)."""
    body = request.get_json() or {}
    required = ["meeting_room_id", "booked_by_employee_id", "starts_at", "ends_at", "attendee_count"]
    missing  = [f for f in required if body.get(f) is None]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO meeting_room_bookings (company_id, meeting_room_id, booked_by_employee_id, starts_at, ends_at, attendee_count, catering_or_av_request, created_at)
            VALUES (:cid, :room, :booker, :start, :end, :count, :request, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "room": body["meeting_room_id"], "booker": body["booked_by_employee_id"],
               "start": body["starts_at"], "end": body["ends_at"], "count": body["attendee_count"], "request": body.get("catering_or_av_request")})
        booking_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"booking_id": booking_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 422)  # likely the capacity-exceeded trigger firing


# PAGE 3 (Minutes of Meeting): intentionally NO routes here -- reuses
# the EXISTING /api/v1/mss/meetings* endpoints (MSS session) verbatim.


# ════════════════════════════════════════════════════════════════
# PAGE 4: TRAVEL MANAGEMENT
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/travel")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def list_travel_requests():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_travel_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.post("/travel")
def request_travel():
    """Public/ESS -- the wizard submission."""
    body = request.get_json() or {}
    required = ["employee_id", "origin", "destination", "travel_start_date", "travel_end_date", "purpose"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO travel_requests (company_id, employee_id, origin, destination, travel_start_date, travel_end_date, purpose, daily_allowance_npr, created_at)
            VALUES (:cid, :eid, :origin, :dest, :start, :end, :purpose, :allowance, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "origin": body["origin"], "dest": body["destination"],
               "start": body["travel_start_date"], "end": body["travel_end_date"], "purpose": body["purpose"], "allowance": body.get("daily_allowance_npr")})
        travel_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"travel_request_id": travel_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@adminops_bp.put("/travel/<request_id>/decide")
@require_auth
@require_role("super_admin", "hr_manager", "department_head")
def decide_travel(request_id):
    body = request.get_json() or {}
    decision = body.get("decision")
    if decision not in ("approved", "rejected"): return error("decision must be approved or rejected", 422)
    try:
        db.session.execute(text("""
            UPDATE travel_requests SET status = :decision, approved_by = :user WHERE id = :rid AND company_id = :cid
        """), {"decision": decision, "user": g.user_id, "rid": request_id, "cid": g.company_id})
        db.session.commit()
        return success({"decided": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 5: TRANSPORT MANAGEMENT
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/transport")
def transport_dashboard():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_shuttle_dashboard WHERE company_id = :cid"
        ), {"cid": request.args.get("company_id")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.post("/transport/ai-route-optimize")
@require_auth
@require_role("super_admin", "hr_manager")
def ai_optimize_routes():
    """AI dynamically routes vehicles based on live traffic and employee locations."""
    try:
        insight = generate_ai_insights({"type": "shuttle_route_optimization", "company_id": g.company_id})
        return success({"optimized_routes": insight.get("optimized_routes", [])})
    except Exception as e:
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 6: CAFETERIA MANAGEMENT
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/cafeteria/menu")
def cafeteria_menu():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM cafeteria_menu_items WHERE company_id = :cid AND available_date = CURRENT_DATE"
        ), {"cid": request.args.get("company_id")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.post("/cafeteria/preorder")
def preorder_meal():
    body = request.get_json() or {}
    required = ["employee_id", "cafeteria_menu_item_id"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO cafeteria_preorders (company_id, employee_id, cafeteria_menu_item_id, quantity, payment_method, ordered_at)
            VALUES (:cid, :eid, :item, :qty, :method, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["employee_id"], "item": body["cafeteria_menu_item_id"],
               "qty": body.get("quantity", 1), "method": body.get("payment_method", "payroll_deduction")})
        order_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"order_id": order_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 7: HELPDESK (facility tickets, distinct from HR Helpdesk)
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/facility-tickets")
@require_auth
@require_role("super_admin", "hr_manager")
def list_facility_tickets():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_facility_tickets_dashboard WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.post("/facility-tickets")
def report_facility_issue():
    """
    Public/ESS. DB trigger fires an immediate notification to facilities
    leadership if is_immediate_safety_hazard is TRUE -- the Section 77/
    Chapter 20 safety-stop duty, never delayed by normal queue priority.
    """
    body = request.get_json() or {}
    required = ["reported_by_employee_id", "category", "description"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO facility_tickets (company_id, reported_by_employee_id, category, description, priority, is_immediate_safety_hazard, floor_location, created_at)
            VALUES (:cid, :eid, :cat, :desc, :priority, :hazard, :floor, NOW()) RETURNING id
        """), {"cid": body.get("company_id"), "eid": body["reported_by_employee_id"], "cat": body["category"],
               "desc": body["description"], "priority": body.get("priority", "medium"), "hazard": body.get("is_immediate_safety_hazard", False),
               "floor": body.get("floor_location")})
        ticket_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"ticket_id": ticket_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 8: FACILITY MANAGEMENT (floor occupancy, distinct from Asset & Inventory)
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/facility/floors")
def facility_floors():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_facility_floors_dashboard WHERE company_id = :cid"
        ), {"cid": request.args.get("company_id")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.get("/facility/safety-committee")
@require_auth
@require_role("super_admin", "hr_manager")
def safety_committee_status():
    try:
        row = db.session.execute(text(
            "SELECT * FROM safety_committee_inspections WHERE company_id = :cid ORDER BY inspection_date DESC LIMIT 1"
        ), {"cid": g.company_id}).fetchone()
        return success(dict(row._mapping) if row else {})
    except Exception:
        return success({})


# ════════════════════════════════════════════════════════════════
# PAGE 9: GATE PASS MANAGEMENT
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/gate-passes")
@require_auth
@require_role("super_admin", "hr_manager")
def list_gate_passes():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_gate_passes_active WHERE company_id = :cid"
        ), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.post("/gate-passes")
@require_auth
@require_role("super_admin", "hr_manager")
def issue_gate_pass():
    """Generates a QR via the universal qr_codes registry (qr_type='gate_pass')."""
    body = request.get_json() or {}
    required = ["holder_name", "purpose", "authorized_zones", "valid_until"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        qr_result = db.session.execute(text("""
            INSERT INTO qr_codes (company_id, qr_type, transaction_reference_table, qr_payload, generated_at)
            VALUES (:cid, 'gate_pass', 'gate_passes', :payload, NOW()) RETURNING id
        """), {"cid": g.company_id, "payload": f"GATEPASS-{body['holder_name'][:20]}-{body['valid_until']}"})
        qr_id = qr_result.fetchone()[0]
        result = db.session.execute(text("""
            INSERT INTO gate_passes (company_id, holder_name, purpose, authorized_zones, valid_from, valid_until, qr_codes_id, created_by, created_at)
            VALUES (:cid, :name, :purpose, :zones, :from_date, :until, :qr, :user, NOW()) RETURNING id
        """), {"cid": g.company_id, "name": body["holder_name"], "purpose": body["purpose"], "zones": body["authorized_zones"],
               "from_date": body.get("valid_from", "CURRENT_DATE"), "until": body["valid_until"], "qr": qr_id, "user": g.user_id})
        pass_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"gate_pass_id": pass_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 10: ID CARD MANAGEMENT (reuses qr_codes qr_type='employee_badge')
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/id-cards")
@require_auth
@require_role("super_admin", "hr_manager")
def list_id_cards():
    """Joins employees with their employee_badge QR -- the Section 9 record fields + outsourced-vs-direct flag."""
    try:
        rows = db.session.execute(text("""
            SELECT e.id, e.first_name, e.last_name, d.title AS designation, e.is_outsourced, e.employment_status,
                   qc.qr_image_url, qc.generated_at AS issued_at
            FROM employees e
            LEFT JOIN designations d ON e.designation_id = d.id
            LEFT JOIN qr_codes qc ON qc.employee_id = e.id AND qc.qr_type = 'employee_badge'
            WHERE e.company_id = :cid
        """), {"cid": g.company_id}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.put("/id-cards/<employee_id>/deactivate")
@require_auth
@require_role("super_admin", "hr_manager")
def deactivate_id_card(employee_id):
    """Fires the instant, irreversible deactivation -- typically triggered by final settlement clearing."""
    try:
        db.session.execute(text("""
            UPDATE qr_codes SET is_active = FALSE WHERE employee_id = :eid AND qr_type = 'employee_badge'
        """), {"eid": employee_id})
        db.session.commit()
        return success({"deactivated": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ════════════════════════════════════════════════════════════════
# PAGE 11: EVENT MANAGEMENT
# ════════════════════════════════════════════════════════════════

@adminops_bp.get("/events")
def list_events():
    try:
        rows = db.session.execute(text(
            "SELECT * FROM v_admin_events_dashboard WHERE company_id = :cid"
        ), {"cid": request.args.get("company_id")}).fetchall()
        return success([dict(r._mapping) for r in rows])
    except Exception:
        return success([])


@adminops_bp.post("/events")
@require_auth
@require_role("super_admin", "hr_manager")
def create_event():
    body = request.get_json() or {}
    required = ["organizer_employee_id", "title", "event_date"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        result = db.session.execute(text("""
            INSERT INTO admin_events (company_id, organizer_employee_id, title, event_date, venue_meeting_room_id, catering_or_equipment_request, extends_past_standard_hours, created_at)
            VALUES (:cid, :org, :title, :date, :venue, :catering, :extends, NOW()) RETURNING id
        """), {"cid": g.company_id, "org": body["organizer_employee_id"], "title": body["title"], "date": body["event_date"],
               "venue": body.get("venue_meeting_room_id"), "catering": body.get("catering_or_equipment_request"),
               "extends": body.get("extends_past_standard_hours", False)})
        event_id = str(result.fetchone()[0])
        db.session.commit()
        return created({"event_id": event_id})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


@adminops_bp.post("/events/<event_id>/rsvp")
def rsvp_event(event_id):
    """DB trigger notifies the event organizer."""
    body = request.get_json() or {}
    required = ["employee_id", "rsvp_status"]
    missing  = [f for f in required if not body.get(f)]
    if missing: return error(f"Missing: {', '.join(missing)}", 422)
    try:
        db.session.execute(text("""
            INSERT INTO event_rsvps_admin (admin_event_id, employee_id, company_id, rsvp_status)
            VALUES (:eid, :empid, :cid, :status)
            ON CONFLICT (admin_event_id, employee_id) DO UPDATE SET rsvp_status = EXCLUDED.rsvp_status
        """), {"eid": event_id, "empid": body["employee_id"], "cid": body.get("company_id"), "status": body["rsvp_status"]})
        db.session.commit()
        return success({"rsvp_recorded": True})
    except Exception as e:
        db.session.rollback()
        return error(str(e), 500)


# ── Excel import/export ───────────────────────────────────────
@adminops_bp.post("/excel-import/<module>")
@require_auth
@require_role("super_admin", "hr_manager")
def excel_import(module):
    allowed = ["visitors", "travel", "facility-tickets", "events"]
    if module not in allowed: return error(f"Allowed: {', '.join(allowed)}", 400)
    if "file" not in request.files: return error("No file", 400)
    result = parse_excel_upload(request.files["file"], f"adminops_{module}")
    return jsonify(result), 200 if result["success"] else 422


@adminops_bp.get("/excel-template/<module>")
@require_auth
def excel_template(module):
    b = build_template_xlsx(f"adminops_{module}")
    if not b: return error("openpyxl required", 500)
    return send_file(io.BytesIO(b),
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                     as_attachment=True, download_name=f"adminops_{module}_template.xlsx")
