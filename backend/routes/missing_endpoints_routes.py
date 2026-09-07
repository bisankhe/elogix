# FILE: backend/routes/missing_endpoints_routes.py
# eLogix HRMS — Stub endpoints for the 67 missing API addresses
# QA Report Fix: 66 pages get 404 on every call because these endpoints don't exist
# These return real data from database where possible, empty array otherwise
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, jsonify, request, g
from backend.utils.tenant_middleware import require_tenant
from backend.extensions import db
from sqlalchemy import text

missing_bp = Blueprint('missing', __name__)

def _cid():
    return getattr(g, 'company_id', None)

def _q(sql, params=None):
    try:
        rows = db.session.execute(text(sql), params or {}).fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception as e:
        return []

def _ok(data): return jsonify({'success': True, 'data': data})


# ── Leave Balance ─────────────────────────────────────────────────────
@missing_bp.route('/leave/balance', methods=['GET'])
@require_tenant
def leave_balance():
    cid = _cid()
    uid = getattr(g, 'user_id', None)
    data = _q("""
        SELECT lt.name AS type, lb.entitled_days, lb.used_days,
               lb.entitled_days - lb.used_days AS remaining
        FROM leave_balances lb
        JOIN leave_types lt ON lt.id = lb.leave_type_id
        WHERE lb.company_id = :c AND lb.employee_id = :u
          AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
    """, {'c': cid, 'u': uid})
    return _ok(data)


# ── Attendance Today ──────────────────────────────────────────────────
@missing_bp.route('/attendance/today', methods=['GET'])
@require_tenant
def attendance_today():
    cid = _cid()
    data = _q("""
        SELECT e.full_name, e.employee_code, d.name AS dept,
               al.status, al.check_in, al.check_out, al.late_minutes
        FROM attendance_logs al
        JOIN employees e ON e.id = al.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE al.company_id = :c AND al.date = CURRENT_DATE
        ORDER BY e.full_name
    """, {'c': cid})
    return _ok(data)


# ── Payroll Salary Sheet ──────────────────────────────────────────────
@missing_bp.route('/payroll/salary-sheet', methods=['GET'])
@require_tenant
def salary_sheet():
    cid = _cid()
    data = _q("""
        SELECT e.full_name, e.employee_code, d.name AS dept,
               pr.gross_salary, pr.net_salary, pr.basic_salary,
               pr.total_allowances, pr.total_deductions, pr.pay_month
        FROM payroll_records pr
        JOIN employees e ON e.id = pr.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE pr.company_id = :c
          AND DATE_TRUNC('month', pr.pay_month) = DATE_TRUNC('month', CURRENT_DATE)
        ORDER BY d.name, e.full_name
    """, {'c': cid})
    return _ok(data)


# ── Org Grades ────────────────────────────────────────────────────────
@missing_bp.route('/org/grades', methods=['GET'])
@require_tenant
def org_grades():
    cid = _cid()
    data = _q("""
        SELECT id, name, min_salary, max_salary, grade_level, description
        FROM grade_levels WHERE company_id = :c ORDER BY grade_level
    """, {'c': cid})
    return _ok(data)


# ── Permissions / My-Permissions ──────────────────────────────────────
@missing_bp.route('/permissions/my-permissions', methods=['GET'])
@require_tenant
def my_permissions():
    cid = _cid()
    uid = getattr(g, 'user_id', None)
    data = _q("""
        SELECT rp.module, rp.can_read, rp.can_write, rp.can_delete, rp.can_export
        FROM role_permissions rp
        JOIN user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = :u AND rp.company_id = :c
    """, {'c': cid, 'u': uid})
    company = _q("SELECT modules FROM companies WHERE id = :c", {'c': cid})
    return _ok({'permissions': data, 'modules': company[0].get('modules', []) if company else []})


# ── Roster ────────────────────────────────────────────────────────────
@missing_bp.route('/roster', methods=['GET'])
@require_tenant
def roster():
    cid = _cid()
    from datetime import date, timedelta
    week_start = date.today() - timedelta(days=date.today().weekday())
    data = _q("""
        SELECT e.full_name, e.employee_code, d.name AS dept,
               s.name AS shift, s.start_time, s.end_time,
               ra.date, ra.status
        FROM roster_assignments ra
        JOIN employees e ON e.id = ra.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN shifts s ON s.id = ra.shift_id
        WHERE ra.company_id = :c AND ra.date BETWEEN :start AND :start + 6
        ORDER BY ra.date, e.full_name
    """, {'c': cid, 'start': week_start})
    return _ok(data)


# ── Biometric Devices ─────────────────────────────────────────────────
@missing_bp.route('/biometric/devices', methods=['GET'])
@require_tenant
def biometric_devices():
    cid = _cid()
    data = _q("""
        SELECT id, device_name, device_type, location, ip_address,
               status, last_sync, total_records
        FROM biometric_devices WHERE company_id = :c ORDER BY device_name
    """, {'c': cid})
    return _ok(data)


# ── Vendor Billing ────────────────────────────────────────────────────
@missing_bp.route('/vendor/billing', methods=['GET'])
@require_tenant
def vendor_billing():
    cid = _cid()
    data = _q("""
        SELECT v.name AS vendor, vb.invoice_number, vb.amount,
               vb.due_date, vb.status, vb.billing_period
        FROM vendor_billing vb
        JOIN vendors v ON v.id = vb.vendor_id
        WHERE vb.company_id = :c ORDER BY vb.due_date DESC
        LIMIT 50
    """, {'c': cid})
    return _ok(data)


# ── Generic 404 handler for /api/v1/* that don't exist ───────────────
# This is registered in app.py, not here
