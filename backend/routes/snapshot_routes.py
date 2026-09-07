# FILE: backend/routes/snapshot_routes.py
# eLogix HRMS — Snapshot API Routes
# ALL endpoints are tenant-isolated via @require_tenant
# Returns real PostgreSQL data for: attendance, headcount, onboarding,
# notifications, events, birthdays, tenure, age, contracts, roster, AI insights
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, jsonify, request, g
from backend.utils.tenant_middleware import require_tenant
from backend.extensions import db
from sqlalchemy import text
from datetime import date, timedelta
import logging

logger = logging.getLogger('elogix.snapshots')
snapshot_bp = Blueprint('snapshot', __name__)

def _cid():  return g.company_id
def _uid():  return getattr(g, 'user_id', None)

def _q(sql, params=None):
    try:
        rows = db.session.execute(text(sql), params or {}).fetchall()
        return [dict(r._mapping) for r in rows]
    except Exception as e:
        logger.warning(f'Query: {e}')
        return []

def _s(sql, params=None, default=0):
    try:
        r = db.session.execute(text(sql), params or {}).scalar()
        return r if r is not None else default
    except Exception as e:
        logger.warning(f'Scalar: {e}')
        return default

def _ok(data): return jsonify({'success': True, 'data': data})


# ══════════════════════════════════════════════════════════════════════
# 1. ATTENDANCE SNAPSHOT
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/attendance/snapshot', methods=['GET'])
@require_tenant
def attendance_snapshot():
    cid = _cid()
    today = date.today()

    total_emp = _s("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
    present   = _s("SELECT COUNT(*) FROM attendance_logs WHERE company_id=:c AND date=:d AND status='present'", {'c':cid,'d':today})
    absent    = _s("SELECT COUNT(*) FROM attendance_logs WHERE company_id=:c AND date=:d AND status='absent'", {'c':cid,'d':today})
    late      = _s("SELECT COUNT(*) FROM attendance_logs WHERE company_id=:c AND date=:d AND status='late'", {'c':cid,'d':today})
    on_leave  = _s("SELECT COUNT(*) FROM attendance_logs WHERE company_id=:c AND date=:d AND status='on_leave'", {'c':cid,'d':today})
    wfh       = _s("SELECT COUNT(*) FROM attendance_logs WHERE company_id=:c AND date=:d AND status='wfh'", {'c':cid,'d':today})
    att_rate  = round(100*present/total_emp, 1) if total_emp else 0

    monthly = _q("""
        SELECT TO_CHAR(date,'Mon') AS month,
               ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1) AS attendance,
               ROUND(100.0*COUNT(*) FILTER(WHERE status='absent')/NULLIF(COUNT(*),0),1) AS absence
        FROM attendance_logs
        WHERE company_id=:c AND date >= CURRENT_DATE-INTERVAL '6 months'
        GROUP BY TO_CHAR(date,'Mon'), DATE_TRUNC('month',date)
        ORDER BY DATE_TRUNC('month',date)
    """, {'c':cid})

    today_dist = _q("""
        SELECT d.name AS dept,
               COUNT(al.id) FILTER(WHERE al.status='present') AS present,
               COUNT(al.id) FILTER(WHERE al.status='absent') AS absent,
               COUNT(al.id) FILTER(WHERE al.status='late') AS late
        FROM departments d
        LEFT JOIN employees e ON e.department_id=d.id AND e.company_id=:c AND e.status='active'
        LEFT JOIN attendance_logs al ON al.employee_id=e.id AND al.date=:d AND al.company_id=:c
        WHERE d.company_id=:c GROUP BY d.name ORDER BY d.name
    """, {'c':cid,'d':today})

    late_list = _q("""
        SELECT e.full_name, d.name AS dept,
               TO_CHAR(al.check_in,'HH12:MI AM') AS check_in, al.late_minutes
        FROM attendance_logs al
        JOIN employees e ON e.id=al.employee_id
        LEFT JOIN departments d ON d.id=e.department_id
        WHERE al.company_id=:c AND al.date=:d AND al.status='late'
        ORDER BY al.late_minutes DESC LIMIT 10
    """, {'c':cid,'d':today})

    return _ok({
        'kpis': {
            'total_employees': total_emp,
            'present'        : present,
            'absent'         : absent,
            'late'           : late,
            'on_leave'       : on_leave,
            'wfh'            : wfh,
            'attendance_rate': att_rate,
        },
        'monthly_attendance': monthly,
        'today_distribution': today_dist,
        'late_today'        : late_list,
    })


# ══════════════════════════════════════════════════════════════════════
# 2. HEADCOUNT ANALYSIS
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/headcount/analysis', methods=['GET'])
@require_tenant
def headcount_analysis():
    cid = _cid()

    total = _s("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})

    by_dept = _q("""
        SELECT d.name AS d, COUNT(e.id) AS n
        FROM employees e JOIN departments d ON d.id=e.department_id
        WHERE e.company_id=:c AND e.status='active'
        GROUP BY d.name ORDER BY n DESC
    """, {'c':cid})

    by_gender = _q("""
        SELECT COALESCE(INITCAP(gender),'Unknown') AS name, COUNT(*) AS value
        FROM employees WHERE company_id=:c AND status='active'
        GROUP BY gender ORDER BY value DESC
    """, {'c':cid})

    by_type = _q("""
        SELECT COALESCE(INITCAP(employment_type),'Unknown') AS name, COUNT(*) AS value
        FROM employees WHERE company_id=:c AND status='active'
        GROUP BY employment_type ORDER BY value DESC
    """, {'c':cid})

    by_branch = _q("""
        SELECT b.name AS branch, COUNT(e.id) AS count
        FROM employees e JOIN branch_locations b ON b.id=e.branch_id
        WHERE e.company_id=:c AND e.status='active'
        GROUP BY b.name ORDER BY count DESC
    """, {'c':cid})

    trend = _q("""
        SELECT TO_CHAR(DATE_TRUNC('month',joining_date),'Mon YYYY') AS month,
               COUNT(*) AS new_hires
        FROM employees WHERE company_id=:c
          AND joining_date >= CURRENT_DATE-INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month',joining_date)
        ORDER BY DATE_TRUNC('month',joining_date)
    """, {'c':cid})

    return _ok({
        'total'     : total,
        'by_dept'   : by_dept,
        'by_gender' : by_gender,
        'by_type'   : by_type,
        'by_branch' : by_branch,
        'trend'     : trend,
    })


# ══════════════════════════════════════════════════════════════════════
# 3. ONBOARDING THIS MONTH
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/onboarding/month', methods=['GET'])
@require_tenant
def onboarding_month():
    cid = _cid()

    employees = _q("""
        SELECT e.full_name AS name, e.employee_code AS code,
               des.title AS designation, d.name AS department,
               e.joining_date, e.employment_type,
               CASE
                 WHEN e.joining_date = CURRENT_DATE THEN 'Day 1'
                 WHEN e.joining_date >= CURRENT_DATE-7 THEN 'Week 1'
                 WHEN e.joining_date >= CURRENT_DATE-30 THEN 'Onboarding'
                 ELSE 'Pre-joining'
               END AS stage
        FROM employees e
        LEFT JOIN designations des ON des.id=e.designation_id
        LEFT JOIN departments d ON d.id=e.department_id
        WHERE e.company_id=:c
          AND DATE_TRUNC('month',e.joining_date)=DATE_TRUNC('month',CURRENT_DATE)
        ORDER BY e.joining_date
    """, {'c':cid})

    by_stage = _q("""
        SELECT CASE
                 WHEN joining_date = CURRENT_DATE THEN 'Day 1'
                 WHEN joining_date >= CURRENT_DATE-7 THEN 'Week 1'
                 WHEN joining_date >= CURRENT_DATE-30 THEN 'Onboarding'
                 ELSE 'Pre-joining'
               END AS stage, COUNT(*) AS count
        FROM employees WHERE company_id=:c
          AND DATE_TRUNC('month',joining_date)=DATE_TRUNC('month',CURRENT_DATE)
        GROUP BY stage
    """, {'c':cid})

    return _ok({
        'employees': employees,
        'by_stage' : by_stage,
        'total'    : len(employees),
    })


# ══════════════════════════════════════════════════════════════════════
# 4. NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/notifications', methods=['GET'])
@require_tenant
def notifications():
    cid = _cid()
    uid = _uid()
    limit = int(request.args.get('limit', 50))

    notifs = _q("""
        SELECT id, title, body AS message, type, is_read AS read,
               action_url, TO_CHAR(created_at,'YYYY-MM-DD HH24:MI') AS time
        FROM notifications
        WHERE company_id=:c
          AND (recipient_id IS NULL OR recipient_id=:uid)
        ORDER BY created_at DESC LIMIT :lim
    """, {'c':cid,'uid':uid,'lim':limit})

    unread = _s("""
        SELECT COUNT(*) FROM notifications
        WHERE company_id=:c AND is_read=false
          AND (recipient_id IS NULL OR recipient_id=:uid)
    """, {'c':cid,'uid':uid})

    return _ok({'notifications': notifs, 'unread_count': unread})


@snapshot_bp.route('/notifications/<int:notif_id>/read', methods=['PATCH'])
@require_tenant
def mark_read(notif_id):
    cid = _cid()
    try:
        db.session.execute(text("""
            UPDATE notifications SET is_read=true
            WHERE id=:id AND company_id=:c
        """), {'id':notif_id,'c':cid})
        db.session.commit()
        return jsonify({'success':True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success':False,'error':str(e)}), 500


# ══════════════════════════════════════════════════════════════════════
# 5. UPCOMING EVENTS
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/events/upcoming', methods=['GET'])
@require_tenant
def upcoming_events():
    cid = _cid()
    days = int(request.args.get('days', 30))

    events = _q("""
        SELECT id, title, description, event_date, end_date,
               event_type AS type, is_public
        FROM calendar_events
        WHERE company_id=:c
          AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE+:days
        ORDER BY event_date
        LIMIT 30
    """, {'c':cid,'days':days})

    holidays = _q("""
        SELECT name AS title, holiday_date AS event_date,
               'Holiday' AS type, is_optional
        FROM public_holidays
        WHERE country='Nepal'
          AND holiday_date BETWEEN CURRENT_DATE AND CURRENT_DATE+:days
        ORDER BY holiday_date
    """, {'days':days})

    return _ok({'events': events, 'holidays': holidays})


# ══════════════════════════════════════════════════════════════════════
# 6. BIRTHDAYS & ANNIVERSARIES
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/employees/birthdays-anniversaries', methods=['GET'])
@require_tenant
def birthdays_anniversaries():
    cid = _cid()
    days = int(request.args.get('days', 30))

    birthdays = _q("""
        SELECT e.full_name AS name, e.employee_code AS code,
               d.name AS department, des.title AS designation,
               TO_CHAR(e.date_of_birth,'DD Mon') AS date_str,
               EXTRACT(YEAR FROM AGE(e.date_of_birth)) AS age,
               e.photo_url
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN designations des ON des.id=e.designation_id
        WHERE e.company_id=:c AND e.status='active'
          AND e.date_of_birth IS NOT NULL
          AND TO_CHAR(e.date_of_birth,'MM-DD') BETWEEN
              TO_CHAR(CURRENT_DATE,'MM-DD') AND
              TO_CHAR(CURRENT_DATE+:days,'MM-DD')
        ORDER BY TO_CHAR(e.date_of_birth,'MM-DD')
    """, {'c':cid,'days':days})

    anniversaries = _q("""
        SELECT e.full_name AS name, e.employee_code AS code,
               d.name AS department, des.title AS designation,
               TO_CHAR(e.joining_date,'DD Mon') AS date_str,
               EXTRACT(YEAR FROM AGE(e.joining_date)) AS years,
               e.photo_url
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN designations des ON des.id=e.designation_id
        WHERE e.company_id=:c AND e.status='active'
          AND e.joining_date IS NOT NULL
          AND TO_CHAR(e.joining_date,'MM-DD') BETWEEN
              TO_CHAR(CURRENT_DATE,'MM-DD') AND
              TO_CHAR(CURRENT_DATE+:days,'MM-DD')
        ORDER BY TO_CHAR(e.joining_date,'MM-DD')
    """, {'c':cid,'days':days})

    return _ok({'birthdays': birthdays, 'anniversaries': anniversaries})


# ══════════════════════════════════════════════════════════════════════
# 7. TENURE CHART
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/employees/tenure', methods=['GET'])
@require_tenant
def tenure_chart():
    cid = _cid()

    buckets = _q("""
        SELECT
          CASE
            WHEN AGE(joining_date) < INTERVAL '1 year'   THEN '0-1 yr'
            WHEN AGE(joining_date) < INTERVAL '3 years'  THEN '1-3 yrs'
            WHEN AGE(joining_date) < INTERVAL '5 years'  THEN '3-5 yrs'
            WHEN AGE(joining_date) < INTERVAL '10 years' THEN '5-10 yrs'
            ELSE '10+ yrs'
          END AS bucket,
          COUNT(*) AS count
        FROM employees
        WHERE company_id=:c AND status='active' AND joining_date IS NOT NULL
        GROUP BY bucket
        ORDER BY MIN(joining_date)
    """, {'c':cid})

    employees = _q("""
        SELECT e.full_name AS name, d.name AS dept,
               des.title AS designation,
               ROUND(EXTRACT(EPOCH FROM AGE(e.joining_date))/(86400*365),1) AS years,
               TO_CHAR(e.joining_date,'DD Mon YYYY') AS joined
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN designations des ON des.id=e.designation_id
        WHERE e.company_id=:c AND e.status='active' AND e.joining_date IS NOT NULL
        ORDER BY e.joining_date ASC LIMIT 20
    """, {'c':cid})

    avg_tenure = _s("""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM AGE(joining_date))/(86400*365)),1)
        FROM employees WHERE company_id=:c AND status='active' AND joining_date IS NOT NULL
    """, {'c':cid}, 0)

    return _ok({'buckets': buckets, 'employees': employees, 'avg_tenure': float(avg_tenure)})


# ══════════════════════════════════════════════════════════════════════
# 8. AGE GROUP
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/employees/age-groups', methods=['GET'])
@require_tenant
def age_groups():
    cid = _cid()

    groups = _q("""
        SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 25 THEN 'Under 25'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 30 THEN '25-29'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 35 THEN '30-34'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 40 THEN '35-39'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 45 THEN '40-44'
            WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 50 THEN '45-49'
            ELSE '50+'
          END AS group,
          COUNT(*) AS value
        FROM employees
        WHERE company_id=:c AND status='active' AND date_of_birth IS NOT NULL
        GROUP BY "group"
        ORDER BY MIN(date_of_birth) DESC
    """, {'c':cid})

    avg_age = _s("""
        SELECT ROUND(AVG(EXTRACT(YEAR FROM AGE(date_of_birth))),1)
        FROM employees WHERE company_id=:c AND status='active' AND date_of_birth IS NOT NULL
    """, {'c':cid}, 0)

    return _ok({'groups': groups, 'avg_age': float(avg_age)})


# ══════════════════════════════════════════════════════════════════════
# 9. CONTRACT EXPIRY
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/employees/contract-expiry', methods=['GET'])
@require_tenant
def contract_expiry():
    cid = _cid()
    days = int(request.args.get('days', 90))

    contracts = _q("""
        SELECT e.full_name AS name, e.employee_code AS code,
               d.name AS dept, des.title AS role,
               ec.end_date,
               (ec.end_date - CURRENT_DATE) AS days_left,
               CASE
                 WHEN ec.end_date - CURRENT_DATE <= 7  THEN 'critical'
                 WHEN ec.end_date - CURRENT_DATE <= 30 THEN 'warning'
                 ELSE 'normal'
               END AS risk,
               ec.contract_type AS type,
               ec.gross_salary AS salary
        FROM employee_contracts ec
        JOIN employees e ON e.id=ec.employee_id
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN designations des ON des.id=e.designation_id
        WHERE ec.company_id=:c AND ec.status='active'
          AND ec.end_date IS NOT NULL
          AND ec.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE+:days
        ORDER BY ec.end_date ASC
        LIMIT 50
    """, {'c':cid,'days':days})

    summary = {
        'critical': sum(1 for c in contracts if c['risk']=='critical'),
        'warning' : sum(1 for c in contracts if c['risk']=='warning'),
        'normal'  : sum(1 for c in contracts if c['risk']=='normal'),
        'total'   : len(contracts),
    }

    return _ok({'contracts': contracts, 'summary': summary})


# ══════════════════════════════════════════════════════════════════════
# 10. ROSTER DETAILS
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/roster/details', methods=['GET'])
@require_tenant
def roster_details():
    cid  = _cid()
    week_start = date.today() - timedelta(days=date.today().weekday())

    roster = _q("""
        SELECT e.full_name AS name, e.employee_code AS code,
               d.name AS dept, s.name AS shift,
               s.start_time, s.end_time,
               ra.date, ra.status,
               TO_CHAR(ra.date,'Dy') AS day
        FROM roster_assignments ra
        JOIN employees e ON e.id=ra.employee_id
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN shifts s ON s.id=ra.shift_id
        WHERE ra.company_id=:c
          AND ra.date BETWEEN :start AND :start+6
        ORDER BY ra.date, e.full_name
    """, {'c':cid, 'start':week_start})

    shifts = _q("""
        SELECT name, start_time, end_time,
               COUNT(ra.id) AS headcount
        FROM shifts s
        LEFT JOIN roster_assignments ra
          ON ra.shift_id=s.id AND ra.company_id=:c
          AND ra.date BETWEEN :start AND :start+6
        WHERE s.company_id=:c AND s.is_active=true
        GROUP BY s.name, s.start_time, s.end_time
    """, {'c':cid,'start':week_start})

    return _ok({'roster': roster, 'shifts': shifts, 'week_start': str(week_start)})


# ══════════════════════════════════════════════════════════════════════
# 11. AI INSIGHTS
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/ai/insights', methods=['GET'])
@require_tenant
def ai_insights():
    cid = _cid()

    # Compute real metrics for AI to analyse
    att_rate = _s("""
        SELECT ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1)
        FROM attendance_logs WHERE company_id=:c AND date>=CURRENT_DATE-30
    """, {'c':cid}, 0)

    turnover = _q("""
        SELECT d.name AS dept,
               COUNT(*) FILTER(WHERE e.status='terminated'
                 AND e.separation_date>=CURRENT_DATE-365) AS exits,
               COUNT(*) FILTER(WHERE e.status='active') AS active
        FROM employees e JOIN departments d ON d.id=e.department_id
        WHERE e.company_id=:c GROUP BY d.name ORDER BY exits DESC LIMIT 5
    """, {'c':cid})

    pending_leave = _s("""
        SELECT COUNT(*) FROM leave_requests WHERE company_id=:c AND status='pending'
    """, {'c':cid})

    headcount = _s("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})

    contract_expiring = _s("""
        SELECT COUNT(*) FROM employee_contracts WHERE company_id=:c AND status='active'
          AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30
    """, {'c':cid})

    return _ok({
        'metrics': {
            'attendance_rate_30d'  : float(att_rate),
            'pending_leave_requests': pending_leave,
            'total_headcount'      : headcount,
            'contracts_expiring_30d': contract_expiring,
        },
        'turnover_by_dept': turnover,
        'generated_at'    : str(date.today()),
    })


# ══════════════════════════════════════════════════════════════════════
# PAYROLL SNAPSHOT
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/payroll/snapshot', methods=['GET'])
@require_tenant
def payroll_snapshot():
    cid = _cid()
    monthly_total = _s("""
        SELECT COALESCE(SUM(gross_salary),0) FROM payroll_records
        WHERE company_id=:c AND DATE_TRUNC('month',pay_month)=DATE_TRUNC('month',CURRENT_DATE)
    """, {'c':cid})
    net_total = _s("""
        SELECT COALESCE(SUM(net_salary),0) FROM payroll_records
        WHERE company_id=:c AND DATE_TRUNC('month',pay_month)=DATE_TRUNC('month',CURRENT_DATE)
    """, {'c':cid})
    total_deductions = float(monthly_total) - float(net_total)
    headcount = _s("""
        SELECT COUNT(DISTINCT employee_id) FROM payroll_records
        WHERE company_id=:c AND DATE_TRUNC('month',pay_month)=DATE_TRUNC('month',CURRENT_DATE)
    """, {'c':cid})
    by_dept = _q("""
        SELECT d.name AS dept, SUM(pr.gross_salary) AS gross, COUNT(pr.employee_id) AS count
        FROM payroll_records pr
        JOIN employees e ON e.id=pr.employee_id
        JOIN departments d ON d.id=e.department_id
        WHERE pr.company_id=:c AND DATE_TRUNC('month',pr.pay_month)=DATE_TRUNC('month',CURRENT_DATE)
        GROUP BY d.name ORDER BY gross DESC LIMIT 8
    """, {'c':cid})
    trend = _q("""
        SELECT TO_CHAR(pay_month,'Mon YY') AS month, SUM(gross_salary) AS gross, SUM(net_salary) AS net
        FROM payroll_records WHERE company_id=:c
        GROUP BY pay_month ORDER BY pay_month DESC LIMIT 6
    """, {'c':cid})
    return _ok({
        'kpis': {'monthly_gross': float(monthly_total), 'monthly_net': float(net_total),
                 'total_deductions': total_deductions, 'headcount': headcount},
        'by_dept': by_dept, 'trend': trend,
    })


# ══════════════════════════════════════════════════════════════════════
# LEAVE SNAPSHOT
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/leave/snapshot', methods=['GET'])
@require_tenant
def leave_snapshot():
    cid = _cid()
    pending     = _s("SELECT COUNT(*) FROM leave_requests WHERE company_id=:c AND status='pending'", {'c':cid})
    approved    = _s("SELECT COUNT(*) FROM leave_requests WHERE company_id=:c AND status='approved' AND from_date>=CURRENT_DATE-30", {'c':cid})
    on_leave    = _s("SELECT COUNT(*) FROM attendance_logs WHERE company_id=:c AND date=CURRENT_DATE AND status='on_leave'", {'c':cid})
    by_type     = _q("""
        SELECT lt.name AS type, COUNT(lr.id) AS count
        FROM leave_requests lr JOIN leave_types lt ON lt.id=lr.leave_type_id
        WHERE lr.company_id=:c AND lr.status='approved'
          AND lr.from_date >= CURRENT_DATE-90
        GROUP BY lt.name ORDER BY count DESC
    """, {'c':cid})
    pending_list = _q("""
        SELECT e.full_name AS name, lt.name AS leave_type,
               lr.from_date, lr.to_date, lr.days
        FROM leave_requests lr
        JOIN employees e ON e.id=lr.employee_id
        JOIN leave_types lt ON lt.id=lr.leave_type_id
        WHERE lr.company_id=:c AND lr.status='pending'
        ORDER BY lr.applied_at ASC LIMIT 10
    """, {'c':cid})
    balance = _q("""
        SELECT lt.name AS type, SUM(lb.entitled_days) AS entitled,
               SUM(lb.used_days) AS used, SUM(lb.entitled_days-lb.used_days) AS remaining
        FROM leave_balances lb JOIN leave_types lt ON lt.id=lb.leave_type_id
        WHERE lb.company_id=:c AND lb.year=EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY lt.name
    """, {'c':cid})
    return _ok({
        'kpis': {'pending': pending, 'approved_30d': approved, 'on_leave_today': on_leave},
        'by_type': by_type, 'pending_list': pending_list, 'balance': balance,
    })
