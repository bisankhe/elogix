# FILE: backend/routes/dashboard_routes.py
# eLogix HRMS — Role-Based Dashboard API Routes
# ALL endpoints enforce tenant isolation — company_id on every query
# No demo data — all data comes from PostgreSQL for the logged-in tenant
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, jsonify, request, g
from backend.utils.tenant_middleware import require_tenant
from backend.extensions import db
from sqlalchemy import text
from datetime import date, timedelta
import logging

logger = logging.getLogger('elogix.dashboard')
dashboard_bp = Blueprint('dashboard', __name__)

def _cid(): return g.company_id
def _uid(): return getattr(g, 'user_id', None)
def _emp(): return getattr(g, 'employee_id', None)
def _role(): return getattr(g, 'role', 'employee')

def _ok(data): return jsonify({'success': True, 'data': data})

def _q(sql, params=None):
    try:
        rows = db.session.execute(text(sql), params or {}).fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception as e:
        logger.warning(f'Query error: {e}')
        return []

def _s(sql, params=None, default=0):
    try:
        r = db.session.execute(text(sql), params or {}).scalar()
        return r if r is not None else default
    except Exception as e:
        logger.warning(f'Scalar error: {e}')
        return default


# ══════════════════════════════════════════════════════════════════════
# 1. SUPER ADMIN DASHBOARD (eLogix Technologies internal — all tenants)
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/super-admin', methods=['GET'])
@require_tenant
def super_admin():
    cid = _cid()
    today = date.today()

    total_companies = _s("SELECT COUNT(*) FROM tenant_companies WHERE status='active'")
    total_employees = _s("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
    pending_tenants = _s("SELECT COUNT(*) FROM tenant_companies WHERE status='pending'")
    mrr = _s("""
        SELECT COALESCE(SUM(CASE plan
            WHEN 'starter' THEN 5000 WHEN 'growth' THEN 12000
            WHEN 'business' THEN 25000 WHEN 'enterprise' THEN 50000
            ELSE 0 END), 0)
        FROM tenant_companies WHERE status IN ('active','trial')
    """)

    tenants = _q("""
        SELECT name, plan, status,
               (SELECT COUNT(*) FROM employees e WHERE e.company_id=tc.id AND e.status='active') AS users,
               created_at
        FROM tenant_companies tc WHERE status IN ('active','trial','pending')
        ORDER BY created_at DESC LIMIT 10
    """)

    audit_logs = _q("""
        SELECT action, entity_type, created_at,
               COALESCE(u.email, 'System') AS user_email
        FROM audit_logs al
        LEFT JOIN users u ON u.id=al.user_id
        WHERE al.company_id=:c
        ORDER BY al.created_at DESC LIMIT 10
    """, {'c': cid})

    plan_breakdown = _q("""
        SELECT plan, COUNT(*) AS count FROM tenant_companies
        WHERE status IN ('active','trial')
        GROUP BY plan ORDER BY count DESC
    """)

    return _ok({
        'kpis': {
            'total_companies': total_companies,
            'total_employees': total_employees,
            'pending_tenants': pending_tenants,
            'mrr'            : float(mrr),
        },
        'tenants'      : tenants,
        'audit_logs'   : audit_logs,
        'plan_breakdown': plan_breakdown,
    })


# ══════════════════════════════════════════════════════════════════════
# 2. EXECUTIVE DASHBOARD
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/executive', methods=['GET'])
@require_tenant
def executive():
    cid   = _cid()
    today = date.today()

    total_emp = _s("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
    monthly_payroll = _s("""
        SELECT COALESCE(SUM(gross_salary),0) FROM payroll_records
        WHERE company_id=:c AND DATE_TRUNC('month',pay_month)=DATE_TRUNC('month',CURRENT_DATE)
    """, {'c':cid})
    att_rate = _s("""
        SELECT ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1)
        FROM attendance_logs WHERE company_id=:c AND date>=CURRENT_DATE-30
    """, {'c':cid}, 0)
    open_positions = _s("""
        SELECT COUNT(*) FROM job_requisitions WHERE company_id=:c AND status='open'
    """, {'c':cid})

    headcount_trend = _q("""
        SELECT TO_CHAR(DATE_TRUNC('month',joining_date),'Mon') AS month,
               COUNT(*) AS headcount
        FROM employees WHERE company_id=:c
          AND joining_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month',joining_date)
        ORDER BY DATE_TRUNC('month',joining_date)
    """, {'c':cid})

    gender_split = _q("""
        SELECT gender AS name, COUNT(*) AS value
        FROM employees WHERE company_id=:c AND status='active' AND gender IS NOT NULL
        GROUP BY gender
    """, {'c':cid})

    dept_cost = _q("""
        SELECT d.name AS dept, SUM(pr.gross_salary) AS cost, COUNT(DISTINCT pr.employee_id) AS headcount
        FROM payroll_records pr
        JOIN employees e ON e.id=pr.employee_id
        JOIN departments d ON d.id=e.department_id
        WHERE pr.company_id=:c AND DATE_TRUNC('month',pr.pay_month)=DATE_TRUNC('month',CURRENT_DATE)
        GROUP BY d.name ORDER BY cost DESC LIMIT 8
    """, {'c':cid})

    okr_progress = _q("""
        SELECT title AS objective, progress_pct AS q2, 100 AS target
        FROM goals WHERE company_id=:c AND status='active'
        ORDER BY progress_pct DESC LIMIT 6
    """, {'c':cid})

    payroll_trend = _q("""
        SELECT TO_CHAR(pay_month,'Mon') AS month, SUM(gross_salary) AS amount
        FROM payroll_records WHERE company_id=:c
        GROUP BY pay_month ORDER BY pay_month DESC LIMIT 6
    """, {'c':cid})

    return _ok({
        'kpis': {
            'total_employees': total_emp,
            'monthly_payroll': float(monthly_payroll),
            'attendance_rate': float(att_rate),
            'open_positions' : open_positions,
        },
        'headcount_trend': headcount_trend,
        'gender_split'   : gender_split,
        'dept_cost'      : dept_cost,
        'okr_progress'   : okr_progress,
        'payroll_trend'  : payroll_trend,
    })


# ══════════════════════════════════════════════════════════════════════
# 3. HR MANAGER DASHBOARD
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/hr-manager', methods=['GET'])
@require_tenant
def hr_manager():
    cid   = _cid()
    today = date.today()

    total_emp     = _s("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
    pending_leave = _s("SELECT COUNT(*) FROM leave_requests WHERE company_id=:c AND status='pending'", {'c':cid})
    onboarding    = _s("""
        SELECT COUNT(*) FROM employees WHERE company_id=:c
        AND DATE_TRUNC('month',joining_date)=DATE_TRUNC('month',CURRENT_DATE)
    """, {'c':cid})
    att_today = _s("""
        SELECT ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1)
        FROM attendance_logs WHERE company_id=:c AND date=CURRENT_DATE
    """, {'c':cid}, 0)

    pending_leaves_list = _q("""
        SELECT e.full_name, lt.name AS leave_type,
               lr.from_date, lr.to_date, lr.days, lr.applied_at
        FROM leave_requests lr
        JOIN employees e ON e.id=lr.employee_id
        JOIN leave_types lt ON lt.id=lr.leave_type_id
        WHERE lr.company_id=:c AND lr.status='pending'
        ORDER BY lr.applied_at ASC LIMIT 10
    """, {'c':cid})

    onboarding_list = _q("""
        SELECT e.full_name, d.name AS dept, e.joining_date,
               des.title AS designation
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN designations des ON des.id=e.designation_id
        WHERE e.company_id=:c
          AND DATE_TRUNC('month',e.joining_date)=DATE_TRUNC('month',CURRENT_DATE)
        ORDER BY e.joining_date
    """, {'c':cid})

    dept_headcount = _q("""
        SELECT d.name AS dept, COUNT(e.id) AS count
        FROM employees e JOIN departments d ON d.id=e.department_id
        WHERE e.company_id=:c AND e.status='active'
        GROUP BY d.name ORDER BY count DESC LIMIT 8
    """, {'c':cid})

    calendar_events = _q("""
        SELECT title, event_date, event_type
        FROM calendar_events WHERE company_id=:c
          AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30
        ORDER BY event_date LIMIT 8
    """, {'c':cid})

    att_trend = _q("""
        SELECT TO_CHAR(date,'Mon') AS month,
               ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1) AS score
        FROM attendance_logs WHERE company_id=:c
          AND date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(date,'Mon'), DATE_TRUNC('month',date)
        ORDER BY DATE_TRUNC('month',date)
    """, {'c':cid})

    return _ok({
        'kpis': {
            'total_employees': total_emp,
            'pending_leaves' : pending_leave,
            'onboarding'     : onboarding,
            'attendance_today': float(att_today),
        },
        'pending_leaves' : pending_leaves_list,
        'onboarding_list': onboarding_list,
        'dept_headcount' : dept_headcount,
        'calendar_events': calendar_events,
        'attendance_trend': att_trend,
    })


# ══════════════════════════════════════════════════════════════════════
# 4. DEPARTMENT HEAD DASHBOARD
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/department', methods=['GET'])
@require_tenant
def department():
    cid    = _cid()
    emp_id = _emp()
    dept   = request.args.get('dept_id')

    # Get HOD's department if not specified
    if not dept and emp_id:
        dept_row = _s("""
            SELECT department_id FROM employees WHERE id=:eid AND company_id=:c
        """, {'eid': emp_id, 'c': cid})
        dept = dept_row

    dept_filter = "AND e.department_id=:dept" if dept else ""
    params = {'c': cid, 'dept': dept}

    headcount = _s(f"""
        SELECT COUNT(*) FROM employees e
        WHERE e.company_id=:c AND e.status='active' {dept_filter}
    """, params)

    present_today = _s(f"""
        SELECT COUNT(*) FROM attendance_logs al
        JOIN employees e ON e.id=al.employee_id
        WHERE al.company_id=:c AND al.date=CURRENT_DATE AND al.status='present' {dept_filter}
    """, params)

    pending_approvals = _s(f"""
        SELECT COUNT(*) FROM leave_requests lr
        JOIN employees e ON e.id=lr.employee_id
        WHERE lr.company_id=:c AND lr.status='pending' {dept_filter}
    """, params)

    active_goals = _s(f"""
        SELECT COUNT(*) FROM goals g
        JOIN employees e ON e.id=g.employee_id
        WHERE g.company_id=:c AND g.status='active' {dept_filter}
    """, params)

    team_list = _q(f"""
        SELECT e.full_name, des.title AS designation,
               al.status AS today_status,
               ROUND(AVG(pr.rating),1) AS avg_rating
        FROM employees e
        LEFT JOIN designations des ON des.id=e.designation_id
        LEFT JOIN attendance_logs al ON al.employee_id=e.id AND al.date=CURRENT_DATE
        LEFT JOIN performance_reviews pr ON pr.employee_id=e.id AND pr.company_id=:c
        WHERE e.company_id=:c AND e.status='active' {dept_filter}
        GROUP BY e.full_name, des.title, al.status
        ORDER BY e.full_name LIMIT 20
    """, params)

    performance_by_member = _q(f"""
        SELECT e.full_name, ROUND(AVG(pr.rating),1) AS avg_rating
        FROM performance_reviews pr
        JOIN employees e ON e.id=pr.employee_id
        WHERE pr.company_id=:c {dept_filter}
        GROUP BY e.full_name ORDER BY avg_rating DESC LIMIT 10
    """, params)

    return _ok({
        'kpis': {
            'headcount'        : headcount,
            'present_today'    : present_today,
            'pending_approvals': pending_approvals,
            'active_goals'     : active_goals,
            'attendance_rate'  : round(100*present_today/headcount,1) if headcount else 0,
        },
        'team_list'           : team_list,
        'performance_by_member': performance_by_member,
    })


# ══════════════════════════════════════════════════════════════════════
# 5. BRANCH DASHBOARD
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/branch', methods=['GET'])
@require_tenant
def branch():
    cid       = _cid()
    emp_id    = _emp()
    branch_id = request.args.get('branch_id')

    if not branch_id and emp_id:
        branch_id = _s("""
            SELECT branch_id FROM employees WHERE id=:eid AND company_id=:c
        """, {'eid': emp_id, 'c': cid})

    b_filter = "AND e.branch_id=:bid" if branch_id else ""
    params   = {'c': cid, 'bid': branch_id}

    headcount = _s(f"""
        SELECT COUNT(*) FROM employees e
        WHERE e.company_id=:c AND e.status='active' {b_filter}
    """, params)

    present_today = _s(f"""
        SELECT COUNT(*) FROM attendance_logs al
        JOIN employees e ON e.id=al.employee_id
        WHERE al.company_id=:c AND al.date=CURRENT_DATE AND al.status='present' {b_filter}
    """, params)

    pending_leaves = _s(f"""
        SELECT COUNT(*) FROM leave_requests lr
        JOIN employees e ON e.id=lr.employee_id
        WHERE lr.company_id=:c AND lr.status='pending' {b_filter}
    """, params)

    branch_info = _q("""
        SELECT name, city, address, phone FROM branch_locations
        WHERE company_id=:c AND id=:bid LIMIT 1
    """, {'c': cid, 'bid': branch_id}) if branch_id else []

    dept_breakdown = _q(f"""
        SELECT d.name AS dept, COUNT(e.id) AS count,
               COUNT(al.id) FILTER(WHERE al.status='present' AND al.date=CURRENT_DATE) AS present
        FROM employees e
        JOIN departments d ON d.id=e.department_id
        LEFT JOIN attendance_logs al ON al.employee_id=e.id AND al.company_id=:c
        WHERE e.company_id=:c AND e.status='active' {b_filter}
        GROUP BY d.name ORDER BY count DESC
    """, params)

    att_week = _q(f"""
        SELECT TO_CHAR(al.date,'Dy') AS day,
               ROUND(100.0*COUNT(*) FILTER(WHERE al.status='present')/NULLIF(COUNT(*),0),1) AS rate
        FROM attendance_logs al
        JOIN employees e ON e.id=al.employee_id
        WHERE al.company_id=:c AND al.date >= CURRENT_DATE-7 {b_filter}
        GROUP BY al.date ORDER BY al.date
    """, params)

    return _ok({
        'kpis': {
            'headcount'       : headcount,
            'present_today'   : present_today,
            'pending_leaves'  : pending_leaves,
            'attendance_rate' : round(100*present_today/headcount,1) if headcount else 0,
        },
        'branch_info'    : branch_info[0] if branch_info else {},
        'dept_breakdown' : dept_breakdown,
        'attendance_week': att_week,
    })


# ══════════════════════════════════════════════════════════════════════
# 6. EMPLOYEE SELF-SERVICE DASHBOARD
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/employee', methods=['GET'])
@require_tenant
def employee():
    cid    = _cid()
    emp_id = _emp()
    uid    = _uid()

    if not emp_id:
        emp_id = _s("SELECT id FROM employees WHERE user_id=:uid AND company_id=:c", {'uid':uid,'c':cid})

    if not emp_id:
        return _ok({'error': 'Employee record not found'})

    params = {'c': cid, 'eid': emp_id}

    # Today's punch
    punch = _q("""
        SELECT TO_CHAR(check_in,'HH12:MI AM') AS check_in,
               TO_CHAR(check_out,'HH12:MI AM') AS check_out,
               status, work_hours, late_minutes
        FROM attendance_logs
        WHERE company_id=:c AND employee_id=:eid AND date=CURRENT_DATE
        LIMIT 1
    """, params)

    # Employee profile
    profile = _q("""
        SELECT e.full_name, e.employee_code, e.photo_url,
               d.name AS department, des.title AS designation,
               e.joining_date, b.name AS branch
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN designations des ON des.id=e.designation_id
        LEFT JOIN branch_locations b ON b.id=e.branch_id
        WHERE e.id=:eid AND e.company_id=:c
    """, params)

    # Leave balance
    leave_balance = _q("""
        SELECT lt.name, lt.color,
               lb.entitled_days, lb.used_days,
               lb.entitled_days - lb.used_days AS remaining
        FROM leave_balances lb
        JOIN leave_types lt ON lt.id=lb.leave_type_id
        WHERE lb.company_id=:c AND lb.employee_id=:eid
          AND lb.year=EXTRACT(YEAR FROM CURRENT_DATE)
    """, params)

    # Last 3 payslips
    payslips = _q("""
        SELECT TO_CHAR(pay_month,'Mon YYYY') AS month,
               gross_salary, net_salary, status
        FROM payroll_records
        WHERE company_id=:c AND employee_id=:eid
        ORDER BY pay_month DESC LIMIT 3
    """, params)

    # Upcoming events for this employee
    upcoming = _q("""
        SELECT title, event_date, event_type
        FROM calendar_events
        WHERE company_id=:c AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE+14
        ORDER BY event_date LIMIT 5
    """, {'c':cid})

    # My goals
    goals = _q("""
        SELECT title, progress_pct, due_date, status
        FROM goals WHERE company_id=:c AND employee_id=:eid
          AND status='active'
        ORDER BY due_date LIMIT 5
    """, params)

    # Recent announcements
    announcements = _q("""
        SELECT title, body, type, created_at
        FROM announcements WHERE company_id=:c
        ORDER BY is_pinned DESC, created_at DESC LIMIT 5
    """, {'c':cid})

    return _ok({
        'profile'      : profile[0] if profile else {},
        'today_punch'  : punch[0] if punch else None,
        'leave_balance': leave_balance,
        'payslips'     : payslips,
        'upcoming'     : upcoming,
        'goals'        : goals,
        'announcements': announcements,
    })


# ══════════════════════════════════════════════════════════════════════
# 7. RECRUITMENT AGENCY DASHBOARD
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/recruitment', methods=['GET'])
@require_tenant
def recruitment():
    cid = _cid()

    open_jobs     = _s("SELECT COUNT(*) FROM job_requisitions WHERE company_id=:c AND status='open'", {'c':cid})
    total_cands   = _s("SELECT COUNT(*) FROM candidates WHERE company_id=:c", {'c':cid})
    in_interview  = _s("SELECT COUNT(*) FROM candidates WHERE company_id=:c AND stage='interview'", {'c':cid})
    hired_this_month = _s("""
        SELECT COUNT(*) FROM candidates WHERE company_id=:c AND stage='hired'
          AND DATE_TRUNC('month',updated_at)=DATE_TRUNC('month',CURRENT_DATE)
    """, {'c':cid})

    pipeline = _q("""
        SELECT stage, COUNT(*) AS count FROM candidates
        WHERE company_id=:c GROUP BY stage ORDER BY count DESC
    """, {'c':cid})

    open_positions = _q("""
        SELECT jr.title, d.name AS department, jr.posted_date,
               jr.closing_date, jr.positions,
               COUNT(c.id) AS applications
        FROM job_requisitions jr
        LEFT JOIN departments d ON d.id=jr.department_id
        LEFT JOIN candidates c ON c.job_id=jr.id AND c.company_id=:c
        WHERE jr.company_id=:c AND jr.status='open'
        GROUP BY jr.id, jr.title, d.name, jr.posted_date, jr.closing_date, jr.positions
        ORDER BY jr.posted_date DESC LIMIT 10
    """, {'c':cid})

    interviews_today = _q("""
        SELECT c.full_name AS candidate, jr.title AS position,
               i.interview_date, i.interview_type, i.status
        FROM ats_interviews i
        JOIN candidates c ON c.id=i.candidate_id
        JOIN job_requisitions jr ON jr.id=c.job_id
        WHERE i.company_id=:c
          AND DATE(i.interview_date) BETWEEN CURRENT_DATE AND CURRENT_DATE+7
        ORDER BY i.interview_date LIMIT 10
    """, {'c':cid}) if _table_exists('ats_interviews') else []

    placement_trend = _q("""
        SELECT TO_CHAR(DATE_TRUNC('month',updated_at),'Mon') AS month,
               COUNT(*) AS placements
        FROM candidates WHERE company_id=:c AND stage='hired'
          AND updated_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month',updated_at)
        ORDER BY DATE_TRUNC('month',updated_at)
    """, {'c':cid})

    source_breakdown = _q("""
        SELECT source AS name, COUNT(*) AS value
        FROM candidates WHERE company_id=:c AND source IS NOT NULL
        GROUP BY source ORDER BY value DESC
    """, {'c':cid})

    return _ok({
        'kpis': {
            'open_jobs'       : open_jobs,
            'total_candidates': total_cands,
            'in_interview'    : in_interview,
            'hired_this_month': hired_this_month,
        },
        'pipeline'       : pipeline,
        'open_positions' : open_positions,
        'interviews'     : interviews_today,
        'placement_trend': placement_trend,
        'source_breakdown': source_breakdown,
    })


def _table_exists(table_name):
    try:
        result = db.session.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name=:t AND table_schema='public'
            )
        """), {'t': table_name}).scalar()
        return result
    except Exception:
        return False
