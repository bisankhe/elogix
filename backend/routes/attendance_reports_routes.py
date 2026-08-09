"""
FILE: backend/routes/attendance_reports_routes.py
eLogix HRMS — Attendance & Payroll Report Routes
  GET/POST/PUT  /api/v1/attendance/roster          Duty Roster
  GET/POST/PUT  /api/v1/attendance/monthly         Monthly Attendance Register
  GET/POST/PUT  /api/v1/attendance/leave-balance   Leave Balance Report
  GET/POST/PUT  /api/v1/attendance/absent-present  Absent / Present Report
  POST/GET/DEL  /api/v1/attendance/signatures      Digital Signatures
  POST          /api/v1/attendance/monthly/{id}/sync-payroll
eLogix Technologies · www.elogix.com.np · Nepal Labour Act 2074
"""
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone, date
from ..middleware.auth import require_auth, require_role, require_permission
from ..extensions import db

att_report_bp = Blueprint("attendance_reports", __name__,
                           url_prefix="/api/v1/attendance")
_now = lambda: datetime.now(timezone.utc)


# ══════════════════════════════════════════════════════════════
#  SHARED — Digital Signatures
# ══════════════════════════════════════════════════════════════

@att_report_bp.get("/signatures")
@require_auth
def get_signatures():
    """Fetch all 3 signatures for a report."""
    from ..models.attendance_reports_models import DigitalSignature
    rt   = request.args.get("report_type", "")
    ref  = request.args.get("report_ref",  "")
    sigs = db.session.query(DigitalSignature).filter_by(
        company_id=g.company_id, report_type=rt, report_ref=ref
    ).all()
    return jsonify({
        "success": True,
        "report_type": rt,
        "report_ref":  ref,
        "signatures": {s.role: s.to_dict() for s in sigs},
        "all_signed":  len(sigs) == 3 and all(s.is_signed for s in sigs),
    })


@att_report_bp.post("/signatures")
@require_auth
def apply_signature():
    """
    Apply or update a digital signature.
    Body: { report_type, report_ref, role, signer_name, designation, signed_date }
    Roles: prepared | verified | approved
    """
    from ..models.attendance_reports_models import DigitalSignature, SigRole
    data = request.get_json() or {}

    required = ["report_type","report_ref","role","signer_name","designation","signed_date"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"success": False, "error": f"Missing: {missing}"}), 400

    if data["role"] not in ("prepared","verified","approved"):
        return jsonify({"success": False, "error": "role must be prepared|verified|approved"}), 400

    # Role hierarchy check: verified ≥ level 4, approved ≥ level 3
    min_levels = {"prepared": 10, "verified": 4, "approved": 3}
    if g.level > min_levels[data["role"]]:
        return jsonify({"success": False,
                        "error": f"Your authority level ({g.level}) cannot sign as '{data['role']}'."}), 403

    # Upsert
    sig = db.session.query(DigitalSignature).filter_by(
        company_id  = g.company_id,
        report_type = data["report_type"],
        report_ref  = data["report_ref"],
        role        = data["role"],
    ).first()

    if sig:
        if sig.is_signed and not data.get("override"):
            return jsonify({"success": False,
                            "error": "Already signed. Pass override=true to re-sign."}), 409
        sig.signer_name  = data["signer_name"]
        sig.designation  = data["designation"]
        sig.signed_date  = data["signed_date"]
        sig.signed_at    = _now()
        sig.is_signed    = True
        sig.signer_id    = g.user_id
        sig.ip_address   = request.remote_addr
    else:
        sig = DigitalSignature(
            company_id  = g.company_id,
            report_type = data["report_type"],
            report_ref  = data["report_ref"],
            role        = data["role"],
            signer_id   = g.user_id,
            signer_name = data["signer_name"],
            designation = data["designation"],
            signed_date = data["signed_date"],
            signed_at   = _now(),
            is_signed   = True,
            ip_address  = request.remote_addr,
        )
        db.session.add(sig)

    db.session.commit()
    return jsonify({"success": True, "brand": "eLogix",
                    "signature": sig.to_dict(),
                    "message": f"✅ {data['role'].title()} signature applied by {data['signer_name']}"}), 201


@att_report_bp.delete("/signatures")
@require_auth
@require_role("super_admin","hr_manager","hr_admin")
def revoke_signature():
    """Revoke/clear a signature (HR Manager or above)."""
    from ..models.attendance_reports_models import DigitalSignature
    data = request.get_json() or {}
    sig  = db.session.query(DigitalSignature).filter_by(
        company_id  = g.company_id,
        report_type = data.get("report_type"),
        report_ref  = data.get("report_ref"),
        role        = data.get("role"),
    ).first()
    if not sig:
        return jsonify({"success": False, "error": "Signature not found"}), 404
    sig.is_signed    = False
    sig.revoked      = True
    sig.revoked_at   = _now()
    sig.revoked_by   = g.user_id
    sig.revoke_reason= data.get("reason","")
    db.session.commit()
    return jsonify({"success": True, "message": "Signature revoked"})


# ══════════════════════════════════════════════════════════════
#  DUTY ROSTER
# ══════════════════════════════════════════════════════════════

@att_report_bp.get("/roster")
@require_auth
def list_rosters():
    """List duty rosters for company, filter by dept/month."""
    from ..models.attendance_reports_models import DutyRoster
    q = db.session.query(DutyRoster).filter_by(company_id=g.company_id)

    dept  = request.args.get("department")
    month = request.args.get("month")      # "2026-07"
    if dept:  q = q.filter(DutyRoster.department == dept)
    if month: q = q.filter(DutyRoster.roster_month == month)

    # Scope: dept heads see only their dept
    if g.level >= 4 and g.role in ("department_head","hod") and g.dept_id:
        q = q.filter(DutyRoster.department == g.dept_id)

    rosters = q.order_by(DutyRoster.roster_month.desc()).limit(50).all()
    return jsonify({"success": True, "total": len(rosters),
                    "rosters": [r.to_dict() for r in rosters]})


@att_report_bp.post("/roster")
@require_auth
@require_role("super_admin","hr_manager","hr_admin","department_head","hod")
def create_roster():
    """Create a new duty roster (header + entries)."""
    from ..models.attendance_reports_models import DutyRoster, DutyRosterEntry, ShiftCode
    data = request.get_json() or {}
    req  = ["department","roster_month","date_from","date_to","entries"]
    miss = [f for f in req if not data.get(f)]
    if miss:
        return jsonify({"success": False, "error": f"Missing: {miss}"}), 400

    # Check existing
    existing = db.session.query(DutyRoster).filter_by(
        company_id=g.company_id, department=data["department"],
        roster_month=data["roster_month"]
    ).first()
    if existing:
        return jsonify({"success": False,
                        "error": f"Roster for {data['department']} {data['roster_month']} already exists. Use PUT to update."}), 409

    roster = DutyRoster(
        company_id   = g.company_id,
        department   = data["department"],
        unit_ward    = data.get("unit_ward",""),
        period_type  = data.get("period_type","Monthly"),
        roster_month = data["roster_month"],
        date_from    = data["date_from"],
        date_to      = data["date_to"],
        created_by   = g.user_id,
    )
    db.session.add(roster)
    db.session.flush()

    # Add entries
    inserted = 0
    for e in data["entries"]:
        code = e.get("shift_code","D").upper()
        if code not in ShiftCode.__members__:
            code = "D"
        entry = DutyRosterEntry(
            roster_id   = roster.id,
            company_id  = g.company_id,
            emp_id      = e["emp_id"],
            emp_name    = e["emp_name"],
            designation = e.get("designation",""),
            department  = e.get("department", data["department"]),
            roster_date = e["roster_date"],
            shift_code  = code,
            is_night    = code in ("N","ND"),
            remarks     = e.get("remarks",""),
        )
        db.session.add(entry)
        inserted += 1

    db.session.commit()
    return jsonify({"success": True, "roster_id": roster.id,
                    "entries_created": inserted,
                    "message": f"Duty Roster created for {data['department']} {data['roster_month']}"}), 201


@att_report_bp.get("/roster/<roster_id>")
@require_auth
def get_roster(roster_id):
    """Get roster with all day entries."""
    from ..models.attendance_reports_models import DutyRoster, DutyRosterEntry
    roster = db.session.query(DutyRoster).filter_by(
        id=roster_id, company_id=g.company_id
    ).first()
    if not roster:
        return jsonify({"success": False, "error": "Roster not found"}), 404

    entries = db.session.query(DutyRosterEntry).filter_by(
        roster_id=roster_id
    ).order_by(DutyRosterEntry.emp_id, DutyRosterEntry.roster_date).all()

    # Signatures
    from ..models.attendance_reports_models import DigitalSignature
    sigs = db.session.query(DigitalSignature).filter_by(
        company_id=g.company_id,
        report_type="duty_roster",
        report_ref=roster_id,
    ).all()

    return jsonify({
        "success": True,
        "roster":  roster.to_dict(),
        "entries": [{"emp_id": e.emp_id, "emp_name": e.emp_name,
                     "designation": e.designation,
                     "roster_date": str(e.roster_date),
                     "shift_code": e.shift_code,
                     "is_night": e.is_night,
                     "remarks": e.remarks} for e in entries],
        "signatures": {s.role: s.to_dict() for s in sigs},
        "is_finalised": roster.is_locked,
    })


@att_report_bp.put("/roster/<roster_id>/lock")
@require_auth
@require_role("super_admin","hr_manager","hr_admin")
def lock_roster(roster_id):
    """Lock roster after all 3 signatures applied."""
    from ..models.attendance_reports_models import DutyRoster, DigitalSignature
    roster = db.session.query(DutyRoster).filter_by(
        id=roster_id, company_id=g.company_id
    ).first()
    if not roster:
        return jsonify({"success": False, "error": "Not found"}), 404

    # Verify all 3 signatures
    sigs = db.session.query(DigitalSignature).filter_by(
        company_id=g.company_id, report_type="duty_roster", report_ref=roster_id
    ).all()
    signed_roles = {s.role for s in sigs if s.is_signed}
    if not {"prepared","verified","approved"}.issubset(signed_roles):
        missing = {"prepared","verified","approved"} - signed_roles
        return jsonify({"success": False,
                        "error": f"Missing signatures: {missing}"}), 400

    roster.is_locked = True
    roster.status    = "locked"
    roster.locked_at = _now()
    db.session.commit()
    return jsonify({"success": True,
                    "message": "Duty Roster locked and finalised",
                    "locked_at": roster.locked_at.isoformat()})


# ══════════════════════════════════════════════════════════════
#  MONTHLY ATTENDANCE REGISTER
# ══════════════════════════════════════════════════════════════

@att_report_bp.get("/monthly")
@require_auth
def list_monthly():
    """Monthly attendance register — filter by dept/month."""
    from ..models.attendance_reports_models import MonthlyAttendance
    q = db.session.query(MonthlyAttendance).filter_by(company_id=g.company_id)

    month = request.args.get("month")
    dept  = request.args.get("department")
    if month: q = q.filter(MonthlyAttendance.att_month == month)
    if dept:  q = q.filter(MonthlyAttendance.department == dept)

    # Dept head scope
    if g.level >= 4 and g.dept_id:
        q = q.filter(MonthlyAttendance.department == g.dept_id)
    # Employee scope
    if g.level >= 10:
        q = q.filter(MonthlyAttendance.emp_id == g.user_id)

    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    total    = q.count()
    records  = q.order_by(MonthlyAttendance.emp_name).offset((page-1)*per_page).limit(per_page).all()

    # Summary
    total_present = sum(r.present_days or 0 for r in records)
    total_absent  = sum(r.absent_days  or 0 for r in records)
    total_lop_amt = sum(float(r.lop_amount or 0) for r in records)
    total_net_sal = sum(float(r.net_salary or 0) for r in records)

    return jsonify({
        "success": True,
        "total": total, "page": page,
        "records": [r.to_dict() for r in records],
        "summary": {
            "total_staff": total,
            "total_present_days": total_present,
            "total_absent_days":  total_absent,
            "total_lop_amount":   round(total_lop_amt, 2),
            "total_net_salary":   round(total_net_sal, 2),
        },
    })


@att_report_bp.post("/monthly")
@require_auth
@require_role("super_admin","hr_manager","hr_admin","payroll_officer")
def create_monthly():
    """
    Create/update monthly attendance records.
    Accepts array of employee records. Auto-calculates payroll fields.
    """
    from ..models.attendance_reports_models import MonthlyAttendance
    data    = request.get_json() or {}
    month   = data.get("month")      # "2026-07"
    records = data.get("records", [])

    if not month or not records:
        return jsonify({"success": False, "error": "month and records[] required"}), 400

    created, updated = 0, 0
    for rec in records:
        existing = db.session.query(MonthlyAttendance).filter_by(
            company_id=g.company_id, emp_id=rec["emp_id"], att_month=month
        ).first()

        if existing:
            for k, v in rec.items():
                if hasattr(existing, k): setattr(existing, k, v)
            existing.calculate_payroll()
            updated += 1
        else:
            m = MonthlyAttendance(
                company_id      = g.company_id,
                emp_id          = rec["emp_id"],
                emp_name        = rec.get("emp_name",""),
                designation     = rec.get("designation",""),
                department      = rec.get("department",""),
                att_month       = month,
                working_days    = rec.get("working_days", 22),
                present_days    = rec.get("present_days", 0),
                absent_days     = rec.get("absent_days", 0),
                leave_days      = rec.get("leave_days", 0),
                night_duty_days = rec.get("night_duty_days", 0),
                weekly_off_days = rec.get("weekly_off_days", 0),
                holiday_days    = rec.get("holiday_days", 0),
                half_days       = rec.get("half_days", 0),
                wfh_days        = rec.get("wfh_days", 0),
                basic_salary    = rec.get("basic_salary", 0),
                lop_days        = rec.get("lop_days", rec.get("absent_days", 0)),
                night_allowance = rec.get("night_allowance", 0),
                ot_amount       = rec.get("ot_amount", 0),
            )
            m.calculate_payroll()
            db.session.add(m)
            created += 1

    db.session.commit()
    return jsonify({"success": True,
                    "created": created, "updated": updated,
                    "month": month,
                    "message": f"Monthly attendance: {created} created, {updated} updated"}), 201


@att_report_bp.post("/monthly/<monthly_id>/sync-payroll")
@require_auth
@require_role("super_admin","hr_manager","payroll_officer")
def sync_payroll(monthly_id):
    """
    Sync attendance register to payroll.
    Requires all 3 digital signatures.
    Generates payroll reference number.
    """
    import secrets
    from ..models.attendance_reports_models import MonthlyAttendance, DigitalSignature

    rec = db.session.query(MonthlyAttendance).filter_by(
        id=monthly_id, company_id=g.company_id
    ).first()
    if not rec:
        return jsonify({"success": False, "error": "Record not found"}), 404

    # Check all 3 signatures
    sigs = db.session.query(DigitalSignature).filter_by(
        company_id  = g.company_id,
        report_type = "monthly_attendance",
        report_ref  = f"{rec.att_month}_{rec.department}",
    ).all()
    signed_roles = {s.role for s in sigs if s.is_signed}
    if not {"prepared","verified","approved"}.issubset(signed_roles):
        return jsonify({
            "success": False,
            "error": f"Cannot sync: missing signatures {{'prepared','verified','approved'} - signed_roles}",
            "signed": list(signed_roles),
        }), 400

    ref = f"PR-{rec.att_month}-{rec.department[:4].upper()}-{secrets.token_hex(3).upper()}"
    rec.payroll_synced    = True
    rec.payroll_ref       = ref
    rec.payroll_synced_at = _now()
    rec.status            = "locked"
    rec.is_locked         = True
    db.session.commit()

    return jsonify({
        "success":     True,
        "payroll_ref": ref,
        "net_salary":  str(rec.net_salary),
        "message":     f"✅ Synced to payroll — Ref: {ref}",
    })


@att_report_bp.get("/monthly/<monthly_id>/day-entries")
@require_auth
def get_day_entries(monthly_id):
    """Return all day-level attendance entries for a monthly record."""
    from ..models.attendance_reports_models import MonthlyAttendance, AttendanceDayEntry
    rec = db.session.query(MonthlyAttendance).filter_by(
        id=monthly_id, company_id=g.company_id
    ).first()
    if not rec:
        return jsonify({"success": False, "error": "Not found"}), 404

    entries = db.session.query(AttendanceDayEntry).filter_by(
        company_id=g.company_id, emp_id=rec.emp_id
    ).order_by(AttendanceDayEntry.entry_date).all()

    return jsonify({
        "success": True,
        "emp_id":  rec.emp_id,
        "month":   rec.att_month,
        "entries": [e.to_dict() for e in entries],
    })


# ══════════════════════════════════════════════════════════════
#  LEAVE BALANCE REPORT
# ══════════════════════════════════════════════════════════════

@att_report_bp.get("/leave-balance")
@require_auth
def get_leave_balances():
    """Leave balance report — all employees or filtered."""
    from ..models.attendance_reports_models import LeaveBalance
    q = db.session.query(LeaveBalance).filter_by(company_id=g.company_id)

    year  = request.args.get("year",  "")
    month = request.args.get("month", "")
    dept  = request.args.get("department","")
    if year:  q = q.filter(LeaveBalance.leave_year == year)
    if month: q = q.filter(LeaveBalance.att_month  == month)
    if dept:  q = q.filter(LeaveBalance.department == dept)

    if g.level >= 4 and g.dept_id:
        q = q.filter(LeaveBalance.department == g.dept_id)
    if g.level >= 10:
        q = q.filter(LeaveBalance.emp_id == g.user_id)

    records = q.order_by(LeaveBalance.emp_name).all()

    # Signatures
    from ..models.attendance_reports_models import DigitalSignature
    ref  = f"{year or month}_{dept or 'ALL'}"
    sigs = db.session.query(DigitalSignature).filter_by(
        company_id=g.company_id, report_type="leave_balance", report_ref=ref
    ).all()

    return jsonify({
        "success":    True,
        "total":      len(records),
        "records":    [r.to_dict() for r in records],
        "signatures": {s.role: s.to_dict() for s in sigs},
        "all_signed": len(sigs) == 3 and all(s.is_signed for s in sigs),
    })


@att_report_bp.post("/leave-balance")
@require_auth
@require_role("super_admin","hr_manager","hr_admin")
def upsert_leave_balances():
    """Bulk upsert leave balances."""
    from ..models.attendance_reports_models import LeaveBalance
    data    = request.get_json() or {}
    year    = data.get("year","")
    month   = data.get("month","")
    records = data.get("records",[])

    if not records:
        return jsonify({"success": False, "error": "records[] required"}), 400

    created, updated = 0, 0
    for rec in records:
        existing = db.session.query(LeaveBalance).filter_by(
            company_id=g.company_id,
            emp_id=rec["emp_id"],
            leave_year=year,
            att_month=month or None,
        ).first()
        if existing:
            for code in ("cl","el","sl","ml","pl","bl","cwl","hd"):
                for sub in ("used","carry","entitled"):
                    k = f"{code}_{sub}"
                    if k in rec: setattr(existing, k, rec[k])
            existing.recalculate()
            updated += 1
        else:
            lb = LeaveBalance(
                company_id  = g.company_id,
                emp_id      = rec["emp_id"],
                emp_name    = rec.get("emp_name",""),
                designation = rec.get("designation",""),
                department  = rec.get("department",""),
                leave_year  = year,
                att_month   = month or None,
                days_attended = rec.get("days_attended", 0),
            )
            for code in ("cl","el","sl","ml","pl","bl","cwl","hd"):
                for sub in ("used","carry","entitled"):
                    k = f"{code}_{sub}"
                    if k in rec: setattr(lb, k, rec[k])
            lb.recalculate()
            db.session.add(lb)
            created += 1

    db.session.commit()
    return jsonify({"success": True,
                    "created": created, "updated": updated}), 201


# ══════════════════════════════════════════════════════════════
#  ABSENT / PRESENT REPORT
# ══════════════════════════════════════════════════════════════

@att_report_bp.get("/absent-present")
@require_auth
def get_absent_present():
    """
    Absent/present report: returns attendance_day_entries for a month.
    Each entry includes has_log (🟢/🔴) and att_code (colour).
    """
    from ..models.attendance_reports_models import AttendanceDayEntry
    month = request.args.get("month","")   # "2026-07"
    dept  = request.args.get("department","")

    if not month:
        return jsonify({"success": False, "error": "month required (YYYY-MM)"}), 400

    q = db.session.query(AttendanceDayEntry).filter(
        AttendanceDayEntry.company_id == g.company_id,
        AttendanceDayEntry.entry_date.cast(db.String).like(f"{month}%"),
    )
    if dept:  q = q.filter(AttendanceDayEntry.dept == dept)
    if g.level >= 4 and g.dept_id:
        q = q.filter(AttendanceDayEntry.dept == g.dept_id)
    if g.level >= 10:
        q = q.filter(AttendanceDayEntry.emp_id == g.user_id)

    entries = q.order_by(AttendanceDayEntry.emp_id,
                          AttendanceDayEntry.entry_date).all()

    # Group by employee
    emp_map = {}
    for e in entries:
        if e.emp_id not in emp_map:
            emp_map[e.emp_id] = {
                "emp_id": e.emp_id, "dept": e.dept,
                "present": 0, "absent": 0, "leave": 0,
                "days": [],
            }
        day = e.to_dict()
        emp_map[e.emp_id]["days"].append(day)
        if e.att_code == "P": emp_map[e.emp_id]["present"] += 1
        elif e.att_code == "A": emp_map[e.emp_id]["absent"] += 1
        else: emp_map[e.emp_id]["leave"] += 1

    # Signatures
    from ..models.attendance_reports_models import DigitalSignature
    ref  = f"{month}_{dept or 'ALL'}"
    sigs = db.session.query(DigitalSignature).filter_by(
        company_id=g.company_id, report_type="absent_present", report_ref=ref
    ).all()

    return jsonify({
        "success":    True,
        "month":      month,
        "total":      len(emp_map),
        "records":    list(emp_map.values()),
        "signatures": {s.role: s.to_dict() for s in sigs},
        "all_signed": len(sigs) == 3 and all(s.is_signed for s in sigs),
    })


@att_report_bp.post("/absent-present/bulk")
@require_auth
@require_role("super_admin","hr_manager","hr_admin")
def bulk_upsert_day_entries():
    """Bulk insert/update day-level attendance entries (from biometric sync)."""
    from ..models.attendance_reports_models import AttendanceDayEntry, ShiftCode
    data    = request.get_json() or {}
    entries = data.get("entries",[])
    if not entries:
        return jsonify({"success": False, "error": "entries[] required"}), 400

    created, updated = 0, 0
    for e in entries:
        existing = db.session.query(AttendanceDayEntry).filter_by(
            company_id = g.company_id,
            emp_id     = e["emp_id"],
            entry_date = e["entry_date"],
        ).first()
        code = e.get("att_code","P").upper()
        if code not in ShiftCode.__members__: code = "P"
        has_log = bool(e.get("login_time"))

        if existing:
            existing.att_code    = code
            existing.login_time  = e.get("login_time")
            existing.logout_time = e.get("logout_time")
            existing.has_log     = has_log
            existing.net_hours   = e.get("net_hours")
            updated += 1
        else:
            de = AttendanceDayEntry(
                company_id   = g.company_id,
                emp_id       = e["emp_id"],
                dept         = e.get("dept",""),
                entry_date   = e["entry_date"],
                day_of_week  = e.get("day_of_week",""),
                att_code     = code,
                login_time   = e.get("login_time"),
                logout_time  = e.get("logout_time"),
                has_log      = has_log,
                net_hours    = e.get("net_hours"),
            )
            db.session.add(de)
            created += 1

    db.session.commit()
    return jsonify({"success": True,
                    "created": created, "updated": updated,
                    "message": f"Day entries: {created} created, {updated} updated"}), 201


# ══════════════════════════════════════════════════════════════
#  EXPORT endpoints
# ══════════════════════════════════════════════════════════════

@att_report_bp.get("/roster/<roster_id>/export")
@require_auth
def export_roster(roster_id):
    """Return roster data formatted for CSV/Excel export."""
    from ..models.attendance_reports_models import DutyRoster, DutyRosterEntry
    roster = db.session.query(DutyRoster).filter_by(
        id=roster_id, company_id=g.company_id
    ).first()
    if not roster: return jsonify({"success": False, "error": "Not found"}), 404
    entries = db.session.query(DutyRosterEntry).filter_by(roster_id=roster_id).all()
    return jsonify({
        "success": True,
        "meta": roster.to_dict(),
        "csv_headers": ["Emp ID","Name","Designation","Date","Day","Shift Code","Is Night","Remarks"],
        "rows": [[e.emp_id, e.emp_name, e.designation,
                  str(e.roster_date), e.day_of_week if hasattr(e,'day_of_week') else "",
                  e.shift_code, e.is_night, e.remarks] for e in entries],
    })


@att_report_bp.get("/monthly/export")
@require_auth
def export_monthly():
    """Return monthly attendance data for CSV/Excel export."""
    from ..models.attendance_reports_models import MonthlyAttendance
    month = request.args.get("month","")
    dept  = request.args.get("department","")
    q = db.session.query(MonthlyAttendance).filter_by(company_id=g.company_id)
    if month: q = q.filter(MonthlyAttendance.att_month == month)
    if dept:  q = q.filter(MonthlyAttendance.department == dept)
    records = q.order_by(MonthlyAttendance.emp_name).all()
    return jsonify({
        "success": True,
        "csv_headers": ["Emp ID","Name","Designation","Dept","Month",
                        "Present","Absent","Leave","Night Duty","Weekly Off",
                        "LOP Days","LOP Amount","Basic Salary","Net Salary","Status"],
        "rows": [[r.emp_id, r.emp_name, r.designation, r.department, r.att_month,
                  r.present_days, r.absent_days, r.leave_days, r.night_duty_days, r.weekly_off_days,
                  str(r.lop_days), str(r.lop_amount), str(r.basic_salary), str(r.net_salary),
                  r.status] for r in records],
        "total_records": len(records),
    })
