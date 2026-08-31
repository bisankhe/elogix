# FILE: backend/routes/snapshot_routes.py
# eLogix HRMS — Dashboard Snapshot API Routes
# ALL endpoints enforce tenant isolation via X-Tenant-Slug header
# No cross-tenant data leakage possible — company_id filter on every query
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, jsonify, g
from backend.utils.tenant_middleware import require_tenant, tenant_filter
from backend.extensions import db
from sqlalchemy import text, func
from datetime import date, timedelta
import logging

logger = logging.getLogger('elogix.snapshots')
snapshot_bp = Blueprint('snapshots', __name__)


def _company_id():
    """Get current tenant's company_id from request context (set by TenantMiddleware)."""
    return g.company_id


def _ok(data):
    return jsonify({'success': True, 'data': data})


def _empty(keys):
    """Return empty snapshot structure when no data exists."""
    return {k: [] if isinstance(v, list) else 0 for k, v in keys.items()}


# ══════════════════════════════════════════════════════════════════════
# ATTENDANCE SNAPSHOT
# GET /api/v1/attendance/snapshot
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/attendance/snapshot', methods=['GET'])
@require_tenant
def attendance_snapshot():
    cid   = _company_id()
    today = date.today()
    try:
        # Today's stats
        stats = db.session.execute(text("""
            SELECT
              COUNT(*) FILTER (WHERE status = 'present')  AS present,
              COUNT(*) FILTER (WHERE status = 'absent')   AS absent,
              COUNT(*) FILTER (WHERE status = 'late')     AS late,
              COUNT(*) FILTER (WHERE status = 'wfh')      AS wfh,
              COUNT(*) FILTER (WHERE status = 'on_leave') AS on_leave,
              COUNT(*)                                      AS total
            FROM attendance_logs
            WHERE company_id = :cid AND date = :today
        """), {'cid': cid, 'today': today}).fetchone()

        # Monthly trend (last 6 months)
        monthly = db.session.execute(text("""
            SELECT
              TO_CHAR(date, 'Mon') AS month,
              COUNT(*) FILTER (WHERE status = 'present') AS present,
              COUNT(*) FILTER (WHERE status = 'on_leave') AS leave,
              COUNT(*) FILTER (WHERE status = 'absent')  AS absent,
              COUNT(*) FILTER (WHERE status = 'wfh')     AS wfh
            FROM attendance_logs
            WHERE company_id = :cid
              AND date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(date, 'Mon'), DATE_TRUNC('month', date)
            ORDER BY DATE_TRUNC('month', date)
        """), {'cid': cid}).fetchall()

        # Department-wise
        dept_att = db.session.execute(text("""
            SELECT
              d.name AS dept,
              COUNT(*) FILTER (WHERE al.status = 'present') AS present,
              COUNT(*) AS total,
              ROUND(100.0 * COUNT(*) FILTER (WHERE al.status = 'present') / NULLIF(COUNT(*),0), 1) AS pct
            FROM attendance_logs al
            JOIN employees e ON e.id = al.employee_id
            JOIN departments d ON d.id = e.department_id
            WHERE al.company_id = :cid AND al.date = :today
            GROUP BY d.name
            ORDER BY pct DESC
        """), {'cid': cid, 'today': today}).fetchall()

        # Live attendance (last 20 punches today)
        live = db.session.execute(text("""
            SELECT e.full_name AS name, d.name AS dept,
                   TO_CHAR(al.check_in, 'HH24:MI') AS check_in,
                   al.punch_type AS type, al.status
            FROM attendance_logs al
            JOIN employees e ON e.id = al.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            WHERE al.company_id = :cid AND al.date = :today
            ORDER BY al.check_in DESC NULLS LAST
            LIMIT 20
        """), {'cid': cid, 'today': today}).fetchall()

        return _ok({
            'today'   : {
                'present' : stats.present or 0,
                'absent'  : stats.absent  or 0,
                'late'    : stats.late    or 0,
                'wfh'     : stats.wfh     or 0,
                'on_leave': stats.on_leave or 0,
                'total'   : stats.total   or 0,
            },
            'monthly' : [dict(r._mapping) for r in monthly],
            'departments': [dict(r._mapping) for r in dept_att],
            'live'    : [dict(r._mapping) for r in live],
        })
    except Exception as e:
        logger.error(f'attendance_snapshot error [{cid}]: {e}')
        return jsonify({'success': True, 'data': {
            'today': {'present':0,'absent':0,'late':0,'wfh':0,'on_leave':0,'total':0},
            'monthly': [], 'departments': [], 'live': []
        }})


# ══════════════════════════════════════════════════════════════════════
# LEAVE SNAPSHOT
# GET /api/v1/leave/snapshot
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/leave/snapshot', methods=['GET'])
@require_tenant
def leave_snapshot():
    cid = _company_id()
    try:
        # Pending approvals
        pending = db.session.execute(text("""
            SELECT COUNT(*) AS cnt FROM leave_requests
            WHERE company_id = :cid AND status = 'pending'
        """), {'cid': cid}).scalar() or 0

        # Leave by type this year
        by_type = db.session.execute(text("""
            SELECT lt.name AS type, lt.color,
              SUM(lr.days) FILTER (WHERE lr.status = 'approved') AS used,
              lt.annual_entitlement AS entitled
            FROM leave_requests lr
            JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE lr.company_id = :cid
              AND EXTRACT(YEAR FROM lr.from_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY lt.name, lt.color, lt.annual_entitlement
            ORDER BY used DESC NULLS LAST
        """), {'cid': cid}).fetchall()

        # Monthly trend
        monthly = db.session.execute(text("""
            SELECT TO_CHAR(from_date, 'Mon') AS month,
                   SUM(days) AS leave
            FROM leave_requests
            WHERE company_id = :cid AND status = 'approved'
              AND from_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY TO_CHAR(from_date, 'Mon'), DATE_TRUNC('month', from_date)
            ORDER BY DATE_TRUNC('month', from_date)
        """), {'cid': cid}).fetchall()

        # Pending approvals list
        pending_list = db.session.execute(text("""
            SELECT e.full_name AS employee, lt.name AS type,
                   lr.from_date, lr.to_date, lr.days,
                   lr.reason, lr.applied_at
            FROM leave_requests lr
            JOIN employees e ON e.id = lr.employee_id
            JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE lr.company_id = :cid AND lr.status = 'pending'
            ORDER BY lr.applied_at DESC
            LIMIT 10
        """), {'cid': cid}).fetchall()

        return _ok({
            'pending_count': pending,
            'by_type'      : [dict(r._mapping) for r in by_type],
            'monthly'      : [dict(r._mapping) for r in monthly],
            'pending_list' : [dict(r._mapping) for r in pending_list],
        })
    except Exception as e:
        logger.error(f'leave_snapshot [{cid}]: {e}')
        return _ok({'pending_count':0,'by_type':[],'monthly':[],'pending_list':[]})


# ══════════════════════════════════════════════════════════════════════
# PAYROLL SNAPSHOT
# GET /api/v1/payroll/snapshot
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/payroll/snapshot', methods=['GET'])
@require_tenant
def payroll_snapshot():
    cid = _company_id()
    try:
        # This month's payroll summary
        summary = db.session.execute(text("""
            SELECT
              SUM(gross_salary)   AS gross,
              SUM(net_salary)     AS net,
              SUM(pf_deduction)   AS pf,
              SUM(tax_deduction)  AS tax,
              COUNT(*)            AS employee_count,
              AVG(gross_salary)   AS avg_salary
            FROM payroll_records
            WHERE company_id = :cid
              AND pay_month = DATE_TRUNC('month', CURRENT_DATE)
        """), {'cid': cid}).fetchone()

        # Monthly trend (6 months)
        trend = db.session.execute(text("""
            SELECT TO_CHAR(pay_month, 'Mon') AS month,
                   SUM(gross_salary) AS amount,
                   SUM(overtime_amount) AS ot
            FROM payroll_records
            WHERE company_id = :cid
              AND pay_month >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY pay_month ORDER BY pay_month
        """), {'cid': cid}).fetchall()

        # Dept breakdown
        dept_pay = db.session.execute(text("""
            SELECT d.name AS dept,
                   SUM(pr.gross_salary) AS gross,
                   COUNT(*) AS headcount,
                   ROUND(AVG(pr.gross_salary),0) AS avg_salary
            FROM payroll_records pr
            JOIN employees e ON e.id = pr.employee_id
            JOIN departments d ON d.id = e.department_id
            WHERE pr.company_id = :cid
              AND pr.pay_month = DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY d.name ORDER BY gross DESC
        """), {'cid': cid}).fetchall()

        return _ok({
            'summary' : {
                'gross'         : float(summary.gross  or 0),
                'net'           : float(summary.net    or 0),
                'pf'            : float(summary.pf     or 0),
                'tax'           : float(summary.tax    or 0),
                'employee_count': summary.employee_count or 0,
                'avg_salary'    : float(summary.avg_salary or 0),
            },
            'trend'   : [dict(r._mapping) for r in trend],
            'departments': [dict(r._mapping) for r in dept_pay],
        })
    except Exception as e:
        logger.error(f'payroll_snapshot [{cid}]: {e}')
        return _ok({'summary':{},'trend':[],'departments':[]})


# ══════════════════════════════════════════════════════════════════════
# HEADCOUNT ANALYSIS
# GET /api/v1/hr-analytics/headcount
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/hr-analytics/headcount', methods=['GET'])
@require_tenant
def headcount_analysis():
    cid = _company_id()
    try:
        stats = db.session.execute(text("""
            SELECT
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE gender = 'male')   AS male,
              COUNT(*) FILTER (WHERE gender = 'female') AS female,
              COUNT(*) FILTER (WHERE gender NOT IN ('male','female') OR gender IS NULL) AS other
            FROM employees WHERE company_id = :cid AND status = 'active'
        """), {'cid': cid}).fetchone()

        depts = db.session.execute(text("""
            SELECT d.name, COUNT(e.id) AS count
            FROM employees e
            JOIN departments d ON d.id = e.department_id
            WHERE e.company_id = :cid AND e.status = 'active'
            GROUP BY d.name ORDER BY count DESC
        """), {'cid': cid}).fetchall()

        gender_split = [
            {'name': 'Male',   'value': stats.male   or 0},
            {'name': 'Female', 'value': stats.female or 0},
            {'name': 'Other',  'value': stats.other  or 0},
        ]

        return _ok({
            'total'       : stats.total  or 0,
            'male'        : stats.male   or 0,
            'female'      : stats.female or 0,
            'other'       : stats.other  or 0,
            'gender_split': gender_split,
            'departments' : [{'name': r.name, 'count': r.count} for r in depts],
        })
    except Exception as e:
        logger.error(f'headcount [{cid}]: {e}')
        return _ok({'total':0,'male':0,'female':0,'other':0,'gender_split':[],'departments':[]})


# ══════════════════════════════════════════════════════════════════════
# BIRTHDAYS & ANNIVERSARIES
# GET /api/v1/employees/birthdays
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/employees/birthdays', methods=['GET'])
@require_tenant
def birthdays():
    cid   = _company_id()
    today = date.today()
    try:
        upcoming = db.session.execute(text("""
            SELECT e.full_name, e.department_id,
                   d.name AS dept,
                   e.date_of_birth AS dob,
                   e.joining_date,
                   EXTRACT(YEAR FROM AGE(e.date_of_birth)) AS age,
                   EXTRACT(YEAR FROM AGE(e.joining_date))  AS years_of_service,
                   CASE
                     WHEN TO_CHAR(e.date_of_birth, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN 'Today'
                     WHEN TO_CHAR(e.joining_date,  'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN 'Today'
                     ELSE 'Upcoming'
                   END AS occasion_today
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            WHERE e.company_id = :cid AND e.status = 'active'
              AND (
                TO_CHAR(e.date_of_birth, 'MM-DD') BETWEEN
                  TO_CHAR(CURRENT_DATE, 'MM-DD') AND
                  TO_CHAR(CURRENT_DATE + INTERVAL '30 days', 'MM-DD')
                OR
                TO_CHAR(e.joining_date, 'MM-DD') BETWEEN
                  TO_CHAR(CURRENT_DATE, 'MM-DD') AND
                  TO_CHAR(CURRENT_DATE + INTERVAL '30 days', 'MM-DD')
              )
            ORDER BY TO_CHAR(e.date_of_birth, 'MM-DD')
            LIMIT 20
        """), {'cid': cid}).fetchall()

        return _ok({'data': [dict(r._mapping) for r in upcoming]})
    except Exception as e:
        logger.error(f'birthdays [{cid}]: {e}')
        return _ok({'data': []})


# ══════════════════════════════════════════════════════════════════════
# CONTRACT EXPIRY
# GET /api/v1/employees/contracts/expiring
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/employees/contracts/expiring', methods=['GET'])
@require_tenant
def contract_expiry():
    cid = _company_id()
    try:
        contracts = db.session.execute(text("""
            SELECT e.full_name, e.employee_code,
                   d.name AS dept,
                   ec.contract_type, ec.end_date,
                   ec.end_date - CURRENT_DATE AS days_left
            FROM employee_contracts ec
            JOIN employees e ON e.id = ec.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            WHERE ec.company_id = :cid
              AND ec.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
              AND ec.status = 'active'
            ORDER BY ec.end_date ASC
        """), {'cid': cid}).fetchall()

        return _ok({'contracts': [dict(r._mapping) for r in contracts]})
    except Exception as e:
        logger.error(f'contracts [{cid}]: {e}')
        return _ok({'contracts': []})


# ══════════════════════════════════════════════════════════════════════
# RECRUITMENT SNAPSHOT
# GET /api/v1/recruitment/snapshot
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/recruitment/snapshot', methods=['GET'])
@require_tenant
def recruitment_snapshot():
    cid = _company_id()
    try:
        stats = db.session.execute(text("""
            SELECT
              COUNT(*) FILTER (WHERE status = 'open')       AS open_jobs,
              COUNT(*) FILTER (WHERE status = 'closed')     AS closed_jobs,
              (SELECT COUNT(*) FROM candidates WHERE company_id = :cid) AS total_candidates,
              (SELECT COUNT(*) FROM candidates WHERE company_id = :cid
                AND stage = 'interview') AS in_interview,
              (SELECT COUNT(*) FROM candidates WHERE company_id = :cid
                AND stage = 'offered')  AS offered,
              (SELECT COUNT(*) FROM candidates WHERE company_id = :cid
                AND stage = 'hired' AND EXTRACT(YEAR FROM updated_at) = EXTRACT(YEAR FROM CURRENT_DATE)) AS hired_ytd
            FROM job_requisitions WHERE company_id = :cid
        """), {'cid': cid}).fetchone()

        # Pipeline stages
        pipeline = db.session.execute(text("""
            SELECT stage, COUNT(*) AS count
            FROM candidates WHERE company_id = :cid
            GROUP BY stage ORDER BY count DESC
        """), {'cid': cid}).fetchall()

        return _ok({
            'stats'   : dict(stats._mapping) if stats else {},
            'pipeline': [dict(r._mapping) for r in pipeline],
        })
    except Exception as e:
        logger.error(f'recruitment_snapshot [{cid}]: {e}')
        return _ok({'stats':{},'pipeline':[]})


# ══════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# GET /api/v1/notifications
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/notifications', methods=['GET'])
@require_tenant
def notifications():
    cid = _company_id()
    try:
        notifs = db.session.execute(text("""
            SELECT id, title, body, type, is_read, created_at
            FROM notifications
            WHERE company_id = :cid AND recipient_id = :uid
            ORDER BY created_at DESC LIMIT 50
        """), {'cid': cid, 'uid': g.user_id}).fetchall()

        unread = sum(1 for n in notifs if not n.is_read)

        return _ok({
            'notifications': [dict(r._mapping) for r in notifs],
            'unread': unread,
        })
    except Exception as e:
        logger.error(f'notifications [{cid}]: {e}')
        return _ok({'notifications': [], 'unread': 0})


# ══════════════════════════════════════════════════════════════════════
# CALENDAR EVENTS
# GET /api/v1/calendar/events
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/calendar/events', methods=['GET'])
@require_tenant
def calendar_events():
    cid = _company_id()
    try:
        events = db.session.execute(text("""
            SELECT id, title, description, event_date, event_type,
                   is_public, created_by
            FROM calendar_events
            WHERE company_id = :cid
              AND event_date >= CURRENT_DATE
              AND event_date <= CURRENT_DATE + INTERVAL '60 days'
            ORDER BY event_date ASC
            LIMIT 30
        """), {'cid': cid}).fetchall()

        # Also get public holidays
        holidays = db.session.execute(text("""
            SELECT name AS title, holiday_date AS event_date,
                   'public_holiday' AS event_type
            FROM public_holidays
            WHERE country = (SELECT country FROM tenant_companies WHERE id = :cid)
              AND holiday_date >= CURRENT_DATE
            ORDER BY holiday_date ASC LIMIT 20
        """), {'cid': cid}).fetchall()

        return _ok({
            'events'  : [dict(r._mapping) for r in events],
            'holidays': [dict(r._mapping) for r in holidays],
        })
    except Exception as e:
        logger.error(f'calendar_events [{cid}]: {e}')
        return _ok({'events': [], 'holidays': []})


# ══════════════════════════════════════════════════════════════════════
# ONBOARDING THIS MONTH
# GET /api/v1/employees/onboarding
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/employees/onboarding', methods=['GET'])
@require_tenant
def onboarding_month():
    cid = _company_id()
    try:
        joiners = db.session.execute(text("""
            SELECT e.full_name, e.employee_code,
                   d.name AS department,
                   des.title AS designation,
                   e.joining_date,
                   CASE WHEN e.joining_date = CURRENT_DATE THEN 'Today'
                        WHEN e.joining_date > CURRENT_DATE  THEN 'Upcoming'
                        ELSE 'Joined'
                   END AS status
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN designations des ON des.id = e.designation_id
            WHERE e.company_id = :cid
              AND DATE_TRUNC('month', e.joining_date) = DATE_TRUNC('month', CURRENT_DATE)
            ORDER BY e.joining_date ASC
        """), {'cid': cid}).fetchall()

        return _ok({'employees': [dict(r._mapping) for r in joiners]})
    except Exception as e:
        logger.error(f'onboarding [{cid}]: {e}')
        return _ok({'employees': []})


# ══════════════════════════════════════════════════════════════════════
# AGE GROUP ANALYSIS
# GET /api/v1/hr-analytics/age-groups
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/hr-analytics/age-groups', methods=['GET'])
@require_tenant
def age_groups():
    cid = _company_id()
    try:
        groups = db.session.execute(text("""
            SELECT
              CASE
                WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 25 THEN 'Under 25'
                WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 35 THEN '25-34'
                WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 45 THEN '35-44'
                WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 55 THEN '45-54'
                ELSE '55+'
              END AS age_group,
              COUNT(*) AS count
            FROM employees
            WHERE company_id = :cid AND status = 'active'
              AND date_of_birth IS NOT NULL
            GROUP BY age_group ORDER BY age_group
        """), {'cid': cid}).fetchall()

        return _ok({'data': [dict(r._mapping) for r in groups]})
    except Exception as e:
        logger.error(f'age_groups [{cid}]: {e}')
        return _ok({'data': []})


# ══════════════════════════════════════════════════════════════════════
# ROSTER DETAILS
# GET /api/v1/roster/details
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/roster/details', methods=['GET'])
@require_tenant
def roster_details():
    cid = _company_id()
    try:
        roster = db.session.execute(text("""
            SELECT e.full_name, d.name AS dept,
                   s.name AS shift, s.start_time, s.end_time,
                   r.date, r.status
            FROM roster_assignments r
            JOIN employees e ON e.id = r.employee_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN shifts s ON s.id = r.shift_id
            WHERE r.company_id = :cid
              AND r.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
            ORDER BY r.date, d.name, e.full_name
            LIMIT 100
        """), {'cid': cid}).fetchall()

        return _ok({'roster': [dict(r._mapping) for r in roster]})
    except Exception as e:
        logger.error(f'roster_details [{cid}]: {e}')
        return _ok({'roster': []})


# ══════════════════════════════════════════════════════════════════════
# AI INSIGHTS
# GET /api/v1/ai/insights
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/ai/insights', methods=['GET'])
@require_tenant
def ai_insights():
    cid = _company_id()
    try:
        # Generate insights based on real tenant data
        att_rate = db.session.execute(text("""
            SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status='present') / NULLIF(COUNT(*),0), 1)
            FROM attendance_logs WHERE company_id = :cid AND date >= CURRENT_DATE - 30
        """), {'cid': cid}).scalar() or 0

        pending_leaves = db.session.execute(text("""
            SELECT COUNT(*) FROM leave_requests WHERE company_id = :cid AND status = 'pending'
        """), {'cid': cid}).scalar() or 0

        expiring_contracts = db.session.execute(text("""
            SELECT COUNT(*) FROM employee_contracts
            WHERE company_id = :cid AND end_date <= CURRENT_DATE + 30 AND status = 'active'
        """), {'cid': cid}).scalar() or 0

        # Build dynamic insights based on real data
        insights = []
        if att_rate < 85:
            insights.append({
                'type'    : 'warning',
                'icon'    : '⚠️',
                'title'   : f'Attendance Alert',
                'message' : f'Attendance rate is {att_rate}% — below the 85% threshold. Review absenteeism.',
                'action'  : 'attendance-processing',
            })
        elif att_rate >= 95:
            insights.append({
                'type'    : 'success',
                'icon'    : '✅',
                'title'   : f'Excellent Attendance',
                'message' : f'{att_rate}% attendance rate this month — great performance!',
                'action'  : 'live-attendance',
            })

        if pending_leaves > 5:
            insights.append({
                'type'    : 'info',
                'icon'    : '📅',
                'title'   : f'{pending_leaves} Leave Requests Pending',
                'message' : f'{pending_leaves} leave requests need your approval.',
                'action'  : 'leave-approval',
            })

        if expiring_contracts > 0:
            insights.append({
                'type'    : 'warning',
                'icon'    : '📋',
                'title'   : f'{expiring_contracts} Contracts Expiring',
                'message' : f'{expiring_contracts} employee contracts expire within 30 days.',
                'action'  : 'contract-expiry',
            })

        return _ok({'insights': insights, 'generated_at': date.today().isoformat()})
    except Exception as e:
        logger.error(f'ai_insights [{cid}]: {e}')
        return _ok({'insights': [], 'generated_at': date.today().isoformat()})


# ══════════════════════════════════════════════════════════════════════
# PERFORMANCE SNAPSHOT
# GET /api/v1/performance/snapshot
# ══════════════════════════════════════════════════════════════════════
@snapshot_bp.route('/performance/snapshot', methods=['GET'])
@require_tenant
def performance_snapshot():
    cid = _company_id()
    try:
        stats = db.session.execute(text("""
            SELECT
              COUNT(*) FILTER (WHERE rating >= 4)   AS high_performers,
              COUNT(*) FILTER (WHERE rating < 3)    AS needs_improvement,
              ROUND(AVG(rating), 2)                 AS avg_rating,
              COUNT(*)                               AS total_reviews
            FROM performance_reviews
            WHERE company_id = :cid
              AND EXTRACT(YEAR FROM review_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        """), {'cid': cid}).fetchone()

        dept_perf = db.session.execute(text("""
            SELECT d.name AS dept, ROUND(AVG(pr.rating), 2) AS avg_rating
            FROM performance_reviews pr
            JOIN employees e ON e.id = pr.employee_id
            JOIN departments d ON d.id = e.department_id
            WHERE pr.company_id = :cid
            GROUP BY d.name ORDER BY avg_rating DESC
        """), {'cid': cid}).fetchall()

        return _ok({
            'stats'      : dict(stats._mapping) if stats else {},
            'by_dept'    : [dict(r._mapping) for r in dept_perf],
        })
    except Exception as e:
        logger.error(f'performance_snapshot [{cid}]: {e}')
        return _ok({'stats':{},'by_dept':[]})
