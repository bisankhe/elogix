# FILE: backend/routes/dashboard_routes.py
# eLogix HRMS — Role-Based Dashboard API Routes
# Every endpoint enforces tenant isolation via company_id
# No cross-tenant data possible — PostgreSQL WHERE company_id = :cid on every query
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, jsonify, g
from backend.utils.tenant_middleware import require_tenant
from backend.extensions import db
from sqlalchemy import text
from datetime import date
import logging

logger = logging.getLogger('elogix.dashboard')
dashboard_bp = Blueprint('dashboard', __name__)


def _cid():
    return g.company_id


def _ok(data):
    return jsonify({'success': True, 'data': data})


def _safe_query(sql, params):
    """Execute SQL safely — returns rows or [] on error."""
    try:
        return db.session.execute(text(sql), params).fetchall()
    except Exception as e:
        logger.warning(f'Query failed: {e}')
        return []


def _safe_scalar(sql, params, default=0):
    """Execute scalar query safely."""
    try:
        result = db.session.execute(text(sql), params).scalar()
        return result if result is not None else default
    except Exception as e:
        logger.warning(f'Scalar query failed: {e}')
        return default


# ══════════════════════════════════════════════════════════════════════
# SUPER ADMIN / COMPANY ADMIN DASHBOARD
# GET /api/v1/dashboard/summary
# Shows full company overview — headcount, attendance, payroll, alerts
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/summary', methods=['GET'])
@require_tenant
def super_admin_dashboard():
    cid   = _cid()
    today = date.today()
    try:
        # Core KPIs
        total_emp = _safe_scalar("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
        present_today = _safe_scalar("""
            SELECT COUNT(*) FROM attendance_logs
            WHERE company_id=:c AND date=:d AND status='present'
        """, {'c':cid,'d':today})
        pending_leaves = _safe_scalar("SELECT COUNT(*) FROM leave_requests WHERE company_id=:c AND status='pending'", {'c':cid})
        this_month_payroll = _safe_scalar("""
            SELECT COALESCE(SUM(gross_salary),0) FROM payroll_records
            WHERE company_id=:c AND DATE_TRUNC('month',pay_month)=DATE_TRUNC('month',CURRENT_DATE)
        """, {'c':cid})

        # Department headcount
        dept_rows = _safe_query("""
            SELECT d.name AS dept, COUNT(e.id) AS count
            FROM employees e JOIN departments d ON d.id=e.department_id
            WHERE e.company_id=:c AND e.status='active'
            GROUP BY d.name ORDER BY count DESC LIMIT 10
        """, {'c':cid})

        # Recent joiners
        joiners = _safe_query("""
            SELECT full_name, joining_date FROM employees
            WHERE company_id=:c
            ORDER BY joining_date DESC LIMIT 5
        """, {'c':cid})

        # Alerts
        expiring = _safe_scalar("""
            SELECT COUNT(*) FROM employee_contracts
            WHERE company_id=:c AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30 AND status='active'
        """, {'c':cid})

        return _ok({
            'kpis': {
                'total_employees' : total_emp,
                'present_today'   : present_today,
                'attendance_rate' : round(100*present_today/total_emp, 1) if total_emp else 0,
                'pending_leaves'  : pending_leaves,
                'monthly_payroll' : float(this_month_payroll),
            },
            'departments'    : [dict(r._mapping) for r in dept_rows],
            'recent_joiners' : [dict(r._mapping) for r in joiners],
            'alerts'         : {
                'expiring_contracts': expiring,
                'pending_approvals' : pending_leaves,
            },
        })
    except Exception as e:
        logger.error(f'super_admin_dashboard [{cid}]: {e}')
        return _ok({'kpis':{},'departments':[],'recent_joiners':[],'alerts':{}})


# ══════════════════════════════════════════════════════════════════════
# HR MANAGER / HR OFFICER DASHBOARD
# GET /api/v1/dashboard/hr
# GET /api/v1/dashboard/hr-officer
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/hr', methods=['GET'])
@dashboard_bp.route('/hr-officer', methods=['GET'])
@require_tenant
def hr_dashboard():
    cid   = _cid()
    today = date.today()
    try:
        total = _safe_scalar("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
        male  = _safe_scalar("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active' AND gender='male'", {'c':cid})
        female= _safe_scalar("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active' AND gender='female'", {'c':cid})

        dept_comparison = _safe_query("""
            SELECT d.name AS dept, COUNT(e.id) AS curr
            FROM employees e JOIN departments d ON d.id=e.department_id
            WHERE e.company_id=:c AND e.status='active'
            GROUP BY d.name ORDER BY curr DESC LIMIT 8
        """, {'c':cid})

        onboarding = _safe_query("""
            SELECT full_name, joining_date FROM employees
            WHERE company_id=:c
              AND DATE_TRUNC('month',joining_date)=DATE_TRUNC('month',CURRENT_DATE)
            ORDER BY joining_date
        """, {'c':cid})

        pending_leaves = _safe_query("""
            SELECT e.full_name, lt.name AS leave_type, lr.from_date, lr.to_date, lr.days
            FROM leave_requests lr
            JOIN employees e ON e.id=lr.employee_id
            JOIN leave_types lt ON lt.id=lr.leave_type_id
            WHERE lr.company_id=:c AND lr.status='pending'
            ORDER BY lr.applied_at DESC LIMIT 10
        """, {'c':cid})

        return _ok({
            'headcount'      : {'total':total,'male':male,'female':female,'other':total-male-female},
            'dept_comparison': [dict(r._mapping) for r in dept_comparison],
            'onboarding'     : [dict(r._mapping) for r in onboarding],
            'pending_leaves' : [dict(r._mapping) for r in pending_leaves],
        })
    except Exception as e:
        logger.error(f'hr_dashboard [{cid}]: {e}')
        return _ok({'headcount':{},'dept_comparison':[],'onboarding':[],'pending_leaves':[]})


# ══════════════════════════════════════════════════════════════════════
# EXECUTIVE DASHBOARD
# GET /api/v1/dashboard/executive
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/executive', methods=['GET'])
@require_tenant
def executive_dashboard():
    cid = _cid()
    try:
        total_emp    = _safe_scalar("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
        monthly_cost = _safe_scalar("""
            SELECT COALESCE(SUM(gross_salary),0) FROM payroll_records
            WHERE company_id=:c AND DATE_TRUNC('month',pay_month)=DATE_TRUNC('month',CURRENT_DATE)
        """, {'c':cid})
        att_rate     = _safe_scalar("""
            SELECT ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1)
            FROM attendance_logs WHERE company_id=:c AND date>=CURRENT_DATE-30
        """, {'c':cid}, 0)

        payroll_trend = _safe_query("""
            SELECT TO_CHAR(pay_month,'Mon YYYY') AS month,
                   SUM(gross_salary) AS amount
            FROM payroll_records WHERE company_id=:c
            GROUP BY pay_month ORDER BY pay_month DESC LIMIT 6
        """, {'c':cid})

        dept_cost = _safe_query("""
            SELECT d.name AS dept, SUM(pr.gross_salary) AS cost, COUNT(*) AS headcount
            FROM payroll_records pr
            JOIN employees e ON e.id=pr.employee_id
            JOIN departments d ON d.id=e.department_id
            WHERE pr.company_id=:c AND DATE_TRUNC('month',pr.pay_month)=DATE_TRUNC('month',CURRENT_DATE)
            GROUP BY d.name ORDER BY cost DESC
        """, {'c':cid})

        return _ok({
            'kpis'        : {'total_employees':total_emp,'monthly_cost':float(monthly_cost),'attendance_rate':float(att_rate)},
            'payroll_trend': [dict(r._mapping) for r in payroll_trend],
            'dept_cost'    : [dict(r._mapping) for r in dept_cost],
        })
    except Exception as e:
        logger.error(f'executive_dashboard [{cid}]: {e}')
        return _ok({'kpis':{},'payroll_trend':[],'dept_cost':[]})


# ══════════════════════════════════════════════════════════════════════
# EMPLOYEE SELF-SERVICE DASHBOARD
# GET /api/v1/dashboard/employee
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/employee', methods=['GET'])
@require_tenant
def employee_dashboard():
    cid = _cid()
    uid = getattr(g, 'user_id', None)
    emp_id = getattr(g, 'employee_id', None)
    try:
        # Today's punch
        punch = _safe_query("""
            SELECT TO_CHAR(check_in,'HH24:MI') AS check_in,
                   TO_CHAR(check_out,'HH24:MI') AS check_out,
                   status, punch_type
            FROM attendance_logs
            WHERE company_id=:c AND employee_id=:e AND date=CURRENT_DATE
            LIMIT 1
        """, {'c':cid,'e':emp_id})

        # Leave balance
        leave_balance = _safe_query("""
            SELECT lt.name AS leave_type,
                   lb.entitled_days, lb.used_days,
                   lb.entitled_days - lb.used_days AS remaining
            FROM leave_balances lb
            JOIN leave_types lt ON lt.id=lb.leave_type_id
            WHERE lb.company_id=:c AND lb.employee_id=:e
              AND lb.year=EXTRACT(YEAR FROM CURRENT_DATE)
        """, {'c':cid,'e':emp_id})

        # Latest payslip
        payslip = _safe_query("""
            SELECT TO_CHAR(pay_month,'Mon YYYY') AS month,
                   gross_salary, net_salary
            FROM payroll_records
            WHERE company_id=:c AND employee_id=:e
            ORDER BY pay_month DESC LIMIT 1
        """, {'c':cid,'e':emp_id})

        # Upcoming events
        events = _safe_query("""
            SELECT title, event_date, event_type
            FROM calendar_events
            WHERE company_id=:c AND event_date>=CURRENT_DATE
            ORDER BY event_date LIMIT 5
        """, {'c':cid})

        return _ok({
            'today_punch'  : [dict(r._mapping) for r in punch],
            'leave_balance': [dict(r._mapping) for r in leave_balance],
            'last_payslip' : [dict(r._mapping) for r in payslip],
            'upcoming'     : [dict(r._mapping) for r in events],
        })
    except Exception as e:
        logger.error(f'employee_dashboard [{cid}]: {e}')
        return _ok({'today_punch':[],'leave_balance':[],'last_payslip':[],'upcoming':[]})


# ══════════════════════════════════════════════════════════════════════
# FINANCE DASHBOARD
# GET /api/v1/dashboard/finance
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/finance', methods=['GET'])
@require_tenant
def finance_dashboard():
    cid = _cid()
    try:
        summary = _safe_query("""
            SELECT SUM(gross_salary) AS gross, SUM(net_salary) AS net,
                   SUM(pf_deduction) AS pf, SUM(tax_deduction) AS tax,
                   COUNT(*) AS employee_count
            FROM payroll_records
            WHERE company_id=:c AND DATE_TRUNC('month',pay_month)=DATE_TRUNC('month',CURRENT_DATE)
        """, {'c':cid})

        cost_centers = _safe_query("""
            SELECT d.name, SUM(pr.gross_salary) AS actual
            FROM payroll_records pr
            JOIN employees e ON e.id=pr.employee_id
            JOIN departments d ON d.id=e.department_id
            WHERE pr.company_id=:c AND DATE_TRUNC('month',pr.pay_month)=DATE_TRUNC('month',CURRENT_DATE)
            GROUP BY d.name ORDER BY actual DESC
        """, {'c':cid})

        trend = _safe_query("""
            SELECT TO_CHAR(pay_month,'Mon') AS month, SUM(gross_salary) AS amount
            FROM payroll_records WHERE company_id=:c
            GROUP BY pay_month ORDER BY pay_month DESC LIMIT 6
        """, {'c':cid})

        return _ok({
            'summary'     : dict(summary[0]._mapping) if summary else {},
            'cost_centers': [dict(r._mapping) for r in cost_centers],
            'trend'       : [dict(r._mapping) for r in trend],
        })
    except Exception as e:
        logger.error(f'finance_dashboard [{cid}]: {e}')
        return _ok({'summary':{},'cost_centers':[],'trend':[]})


# ══════════════════════════════════════════════════════════════════════
# RECRUITMENT DASHBOARD
# GET /api/v1/dashboard/recruitment
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/recruitment', methods=['GET'])
@require_tenant
def recruitment_dashboard():
    cid = _cid()
    try:
        open_jobs   = _safe_scalar("SELECT COUNT(*) FROM job_requisitions WHERE company_id=:c AND status='open'",  {'c':cid})
        candidates  = _safe_scalar("SELECT COUNT(*) FROM candidates WHERE company_id=:c", {'c':cid})
        interviews  = _safe_scalar("SELECT COUNT(*) FROM candidates WHERE company_id=:c AND stage='interview'",    {'c':cid})
        hired_ytd   = _safe_scalar("""
            SELECT COUNT(*) FROM candidates WHERE company_id=:c AND stage='hired'
            AND EXTRACT(YEAR FROM updated_at)=EXTRACT(YEAR FROM CURRENT_DATE)
        """, {'c':cid})

        pipeline = _safe_query("""
            SELECT stage, COUNT(*) AS count FROM candidates
            WHERE company_id=:c GROUP BY stage ORDER BY count DESC
        """, {'c':cid})

        open_positions = _safe_query("""
            SELECT title, department, posted_date, applications_count
            FROM job_requisitions WHERE company_id=:c AND status='open'
            ORDER BY posted_date DESC LIMIT 10
        """, {'c':cid})

        return _ok({
            'kpis'          : {'open_jobs':open_jobs,'candidates':candidates,'interviews':interviews,'hired_ytd':hired_ytd},
            'pipeline'      : [dict(r._mapping) for r in pipeline],
            'open_positions': [dict(r._mapping) for r in open_positions],
        })
    except Exception as e:
        logger.error(f'recruitment_dashboard [{cid}]: {e}')
        return _ok({'kpis':{},'pipeline':[],'open_positions':[]})


# ══════════════════════════════════════════════════════════════════════
# GENERIC ROLE DASHBOARDS (Sales, Operations, IT, Marketing, etc.)
# These use the same pattern — returns role-specific KPIs
# ══════════════════════════════════════════════════════════════════════

def _generic_dashboard(role_name):
    """Generic dashboard for roles without specialized queries yet."""
    cid = _cid()
    try:
        total = _safe_scalar("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
        att   = _safe_scalar("""
            SELECT ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1)
            FROM attendance_logs WHERE company_id=:c AND date=CURRENT_DATE
        """, {'c':cid}, 0)

        return _ok({
            'kpis'    : {'total_employees': total, 'attendance_rate': float(att)},
            'role'    : role_name,
            'message' : f'{role_name} dashboard — real data from your company',
        })
    except Exception as e:
        logger.error(f'{role_name}_dashboard: {e}')
        return _ok({'kpis':{},'role':role_name})


@dashboard_bp.route('/sales',       methods=['GET'])
@require_tenant
def sales_dashboard():       return _generic_dashboard('Sales')

@dashboard_bp.route('/operations',  methods=['GET'])
@require_tenant
def operations_dashboard():  return _generic_dashboard('Operations')

@dashboard_bp.route('/it-admin',    methods=['GET'])
@require_tenant
def it_admin_dashboard():    return _generic_dashboard('IT Admin')

@dashboard_bp.route('/marketing',   methods=['GET'])
@require_tenant
def marketing_dashboard():   return _generic_dashboard('Marketing')

@dashboard_bp.route('/procurement', methods=['GET'])
@require_tenant
def procurement_dashboard(): return _generic_dashboard('Procurement')

@dashboard_bp.route('/legal',       methods=['GET'])
@require_tenant
def legal_dashboard():       return _generic_dashboard('Legal')

@dashboard_bp.route('/learning',    methods=['GET'])
@require_tenant
def learning_dashboard():    return _generic_dashboard('Learning & Development')


# ══════════════════════════════════════════════════════════════════════
# TENURE CHART
# GET /api/v1/hr-analytics/tenure
# ══════════════════════════════════════════════════════════════════════
@dashboard_bp.route('/tenure', methods=['GET'])
@require_tenant
def tenure_chart():
    cid = _cid()
    try:
        groups = _safe_query("""
            SELECT
              CASE
                WHEN EXTRACT(YEAR FROM AGE(joining_date)) < 1  THEN '< 1 Year'
                WHEN EXTRACT(YEAR FROM AGE(joining_date)) < 2  THEN '1-2 Years'
                WHEN EXTRACT(YEAR FROM AGE(joining_date)) < 5  THEN '2-5 Years'
                WHEN EXTRACT(YEAR FROM AGE(joining_date)) < 10 THEN '5-10 Years'
                ELSE '10+ Years'
              END AS tenure_group,
              COUNT(*) AS count
            FROM employees
            WHERE company_id=:c AND status='active' AND joining_date IS NOT NULL
            GROUP BY tenure_group ORDER BY count DESC
        """, {'c':cid})
        return _ok({'data': [dict(r._mapping) for r in groups]})
    except Exception as e:
        logger.error(f'tenure [{cid}]: {e}')
        return _ok({'data': []})
