# FILE: backend/routes/extended_routes.py
# eLogix HRMS — Extended API Routes
# Covers: Dashboards, Reports, HR Operations, AI endpoints
# ALL routes enforce tenant isolation via @require_tenant → g.company_id
# eLogix Technologies · www.elogix.com.np

from flask import Blueprint, jsonify, request, g
from backend.utils.tenant_middleware import require_tenant
from backend.extensions import db
from sqlalchemy import text
from datetime import date, datetime
import logging, os

logger = logging.getLogger('elogix.extended')
extended_bp = Blueprint('extended', __name__)


def _cid():    return g.company_id
def _uid():    return getattr(g, 'user_id', None)
def _ok(d):    return jsonify({'success': True, 'data': d})
def _err(m,c=400): return jsonify({'success': False, 'error': m}), c

def _q(sql, params):
    try:    return db.session.execute(text(sql), params).fetchall()
    except Exception as e: logger.warning(f'Query: {e}'); return []

def _s(sql, params, default=0):
    try:
        r = db.session.execute(text(sql), params).scalar()
        return r if r is not None else default
    except Exception as e: logger.warning(f'Scalar: {e}'); return default


# ══════════════════════════════════════════════════════════════════════
# DASHBOARD ROUTES
# ══════════════════════════════════════════════════════════════════════

@extended_bp.route('/dashboard/branch', methods=['GET'])
@require_tenant
def branch_dashboard():
    cid = _cid()
    branches = _q("""
        SELECT b.name, b.location,
               COUNT(e.id) AS headcount,
               COUNT(al.id) FILTER (WHERE al.date=CURRENT_DATE AND al.status='present') AS present_today
        FROM branch_locations b
        LEFT JOIN employees e ON e.branch_id=b.id AND e.status='active'
        LEFT JOIN attendance_logs al ON al.employee_id=e.id AND al.company_id=:c
        WHERE b.company_id=:c
        GROUP BY b.name, b.location ORDER BY headcount DESC
    """, {'c': cid})
    return _ok({'branches': [dict(r._mapping) for r in branches]})


@extended_bp.route('/dashboard/department', methods=['GET'])
@require_tenant
def department_dashboard():
    cid = _cid()
    depts = _q("""
        SELECT d.name AS dept,
               COUNT(e.id) AS headcount,
               COUNT(al.id) FILTER (WHERE al.date=CURRENT_DATE AND al.status='present') AS present,
               COUNT(lr.id) FILTER (WHERE lr.status='pending') AS pending_leaves
        FROM departments d
        LEFT JOIN employees e ON e.department_id=d.id AND e.status='active'
        LEFT JOIN attendance_logs al ON al.employee_id=e.id AND al.company_id=:c
        LEFT JOIN leave_requests lr ON lr.employee_id=e.id AND lr.company_id=:c
        WHERE d.company_id=:c
        GROUP BY d.name ORDER BY headcount DESC
    """, {'c': cid})
    return _ok({'departments': [dict(r._mapping) for r in depts]})


@extended_bp.route('/dashboard/admin', methods=['GET'])
@extended_bp.route('/dashboard/customer-service', methods=['GET'])
@require_tenant
def admin_dashboard():
    cid = _cid()
    total   = _s("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
    present = _s("SELECT COUNT(*) FROM attendance_logs WHERE company_id=:c AND date=CURRENT_DATE AND status='present'", {'c':cid})
    return _ok({'kpis': {'total_employees': total, 'present_today': present, 'attendance_rate': round(100*present/total,1) if total else 0}})


# ══════════════════════════════════════════════════════════════════════
# ATTENDANCE REPORTS
# ══════════════════════════════════════════════════════════════════════

@extended_bp.route('/attendance-reports/absent-present', methods=['GET'])
@require_tenant
def absent_present_report():
    cid       = _cid()
    from_date = request.args.get('from', str(date.today().replace(day=1)))
    to_date   = request.args.get('to',   str(date.today()))
    dept      = request.args.get('dept', '')

    dept_filter = "AND d.name = :dept" if dept else ""

    rows = _q(f"""
        SELECT e.full_name, e.employee_code,
               d.name AS dept,
               COUNT(*) FILTER (WHERE al.status='present')  AS present_days,
               COUNT(*) FILTER (WHERE al.status='absent')   AS absent_days,
               COUNT(*) FILTER (WHERE al.status='late')     AS late_days,
               COUNT(*) FILTER (WHERE al.status='wfh')      AS wfh_days,
               COUNT(*) FILTER (WHERE al.status='on_leave') AS leave_days,
               COUNT(*) AS total_working_days
        FROM employees e
        LEFT JOIN attendance_logs al ON al.employee_id=e.id
            AND al.date BETWEEN :fd AND :td AND al.company_id=:c
        LEFT JOIN departments d ON d.id=e.department_id
        WHERE e.company_id=:c AND e.status='active' {dept_filter}
        GROUP BY e.full_name, e.employee_code, d.name
        ORDER BY e.full_name
    """, {'c': cid, 'fd': from_date, 'td': to_date, 'dept': dept})

    return _ok({'records': [dict(r._mapping) for r in rows], 'from_date': from_date, 'to_date': to_date})


# ══════════════════════════════════════════════════════════════════════
# HR BUDGET
# ══════════════════════════════════════════════════════════════════════

@extended_bp.route('/hr-budget/annual', methods=['GET'])
@require_tenant
def annual_hr_budget():
    cid  = _cid()
    year = request.args.get('year', date.today().year)

    budget_rows = _q("""
        SELECT category, budgeted_amount, actual_amount,
               budgeted_amount - actual_amount AS variance
        FROM hr_budgets
        WHERE company_id=:c AND fiscal_year=:y
        ORDER BY budgeted_amount DESC
    """, {'c': cid, 'y': year})

    monthly_actual = _q("""
        SELECT TO_CHAR(pay_month,'Mon') AS month, SUM(gross_salary) AS amount
        FROM payroll_records WHERE company_id=:c
          AND EXTRACT(YEAR FROM pay_month)=:y
        GROUP BY pay_month ORDER BY pay_month
    """, {'c': cid, 'y': year})

    return _ok({
        'budget'   : [dict(r._mapping) for r in budget_rows],
        'monthly'  : [dict(r._mapping) for r in monthly_actual],
        'year'     : year,
    })


# ══════════════════════════════════════════════════════════════════════
# LABOUR AUDIT
# ══════════════════════════════════════════════════════════════════════

@extended_bp.route('/compliance/labour-audit', methods=['GET'])
@require_tenant
def annual_labour_audit():
    cid  = _cid()
    year = request.args.get('year', date.today().year)

    # Check key Nepal Labour Act compliance items
    ssf_compliance = _s("""
        SELECT ROUND(100.0*COUNT(*) FILTER(WHERE ssf_registered=true)/NULLIF(COUNT(*),0),1)
        FROM employees WHERE company_id=:c AND status='active'
    """, {'c':cid}, 0)

    avg_ot_hrs = _s("""
        SELECT ROUND(AVG(overtime_hours),1) FROM attendance_logs
        WHERE company_id=:c AND EXTRACT(YEAR FROM date)=:y
    """, {'c':cid,'y':year}, 0)

    leave_compliance = _q("""
        SELECT lt.name, lt.annual_entitlement,
               ROUND(AVG(lb.used_days),1) AS avg_used
        FROM leave_balances lb
        JOIN leave_types lt ON lt.id=lb.leave_type_id
        WHERE lb.company_id=:c AND lb.year=:y
        GROUP BY lt.name, lt.annual_entitlement
    """, {'c':cid,'y':year})

    return _ok({
        'ssf_compliance_pct': float(ssf_compliance),
        'avg_overtime_hrs'  : float(avg_ot_hrs),
        'leave_compliance'  : [dict(r._mapping) for r in leave_compliance],
        'year'              : year,
    })


# ══════════════════════════════════════════════════════════════════════
# MANPOWER ANALYSIS
# ══════════════════════════════════════════════════════════════════════

@extended_bp.route('/hr-analytics/manpower', methods=['GET'])
@require_tenant
def annual_manpower():
    cid  = _cid()
    year = request.args.get('year', date.today().year)

    monthly_hires = _q("""
        SELECT TO_CHAR(joining_date,'Mon') AS month,
               COUNT(*) AS hired,
               (SELECT COUNT(*) FROM employees e2
                WHERE e2.company_id=:c
                  AND DATE_TRUNC('month',e2.separation_date)=DATE_TRUNC('month',e.joining_date)) AS separated
        FROM employees e WHERE company_id=:c
          AND EXTRACT(YEAR FROM joining_date)=:y
        GROUP BY TO_CHAR(joining_date,'Mon'), DATE_TRUNC('month',joining_date)
        ORDER BY DATE_TRUNC('month',joining_date)
    """, {'c':cid,'y':year})

    dept_headcount = _q("""
        SELECT d.name AS dept, COUNT(*) AS count
        FROM employees e JOIN departments d ON d.id=e.department_id
        WHERE e.company_id=:c AND e.status='active'
        GROUP BY d.name ORDER BY count DESC
    """, {'c':cid})

    turnover = _s("""
        SELECT ROUND(100.0*COUNT(*)/NULLIF((SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'),0),1)
        FROM employees WHERE company_id=:c AND EXTRACT(YEAR FROM separation_date)=:y
    """, {'c':cid,'y':year}, 0)

    return _ok({
        'monthly_hires'  : [dict(r._mapping) for r in monthly_hires],
        'dept_headcount' : [dict(r._mapping) for r in dept_headcount],
        'turnover_rate'  : float(turnover),
        'year'           : year,
    })


# ══════════════════════════════════════════════════════════════════════
# PAYROLL OPERATIONS
# ══════════════════════════════════════════════════════════════════════

@extended_bp.route('/payroll/advance-salary', methods=['GET', 'POST'])
@require_tenant
def advance_salary():
    cid = _cid()
    if request.method == 'POST':
        data = request.get_json() or {}
        try:
            db.session.execute(text("""
                INSERT INTO salary_advances (company_id, employee_id, amount, reason, requested_at, status)
                VALUES (:c, :e, :amount, :reason, NOW(), 'pending')
            """), {'c':cid, 'e':data.get('employee_id'), 'amount':data.get('amount'), 'reason':data.get('reason','')})
            db.session.commit()
            return _ok({'message': 'Advance salary request submitted'})
        except Exception as e:
            logger.error(f'advance_salary POST [{cid}]: {e}')
            return _err('Failed to submit advance salary request')

    advances = _q("""
        SELECT e.full_name, e.employee_code, sa.amount, sa.reason,
               sa.requested_at, sa.status, sa.approved_at
        FROM salary_advances sa
        JOIN employees e ON e.id=sa.employee_id
        WHERE sa.company_id=:c
        ORDER BY sa.requested_at DESC LIMIT 50
    """, {'c': cid})
    return _ok({'advances': [dict(r._mapping) for r in advances]})


@extended_bp.route('/payroll-setup/allowances', methods=['GET', 'POST'])
@require_tenant
def allowances():
    cid = _cid()
    if request.method == 'POST':
        data = request.get_json() or {}
        try:
            db.session.execute(text("""
                INSERT INTO allowance_types (company_id, name, amount, type, taxable, effective_date)
                VALUES (:c, :name, :amount, :type, :taxable, CURRENT_DATE)
            """), {'c':cid,'name':data.get('name'),'amount':data.get('amount',0),
                   'type':data.get('type','fixed'),'taxable':data.get('taxable',True)})
            db.session.commit()
            return _ok({'message': 'Allowance created'})
        except Exception as e:
            logger.error(f'allowances POST [{cid}]: {e}')
            return _err('Failed to create allowance')

    rows = _q("""
        SELECT id, name, amount, type, taxable, effective_date, is_active
        FROM allowance_types WHERE company_id=:c AND is_active=true
        ORDER BY name
    """, {'c': cid})
    return _ok({'allowances': [dict(r._mapping) for r in rows]})


# ══════════════════════════════════════════════════════════════════════
# ANNOUNCEMENTS
# ══════════════════════════════════════════════════════════════════════

@extended_bp.route('/announcements', methods=['GET', 'POST'])
@require_tenant
def announcements():
    cid = _cid()
    if request.method == 'POST':
        data = request.get_json() or {}
        try:
            db.session.execute(text("""
                INSERT INTO announcements (company_id, title, body, type, target_dept,
                    is_pinned, created_by, created_at)
                VALUES (:c, :title, :body, :type, :dept, :pinned, :by, NOW())
            """), {
                'c'    : cid,
                'title': data.get('title', ''),
                'body' : data.get('body', ''),
                'type' : data.get('type', 'general'),
                'dept' : data.get('target_dept'),
                'pinned': data.get('is_pinned', False),
                'by'   : _uid(),
            })
            db.session.commit()
            return _ok({'message': 'Announcement posted'})
        except Exception as e:
            logger.error(f'announcements POST [{cid}]: {e}')
            return _err('Failed to post announcement')

    dept = request.args.get('dept', '')
    dept_filter = "AND (a.target_dept IS NULL OR a.target_dept=:dept)" if dept else ""

    rows = _q(f"""
        SELECT a.id, a.title, a.body, a.type, a.target_dept,
               a.is_pinned, a.created_at,
               e.full_name AS posted_by
        FROM announcements a
        LEFT JOIN employees e ON e.user_id=a.created_by
        WHERE a.company_id=:c {dept_filter}
        ORDER BY a.is_pinned DESC, a.created_at DESC
        LIMIT 30
    """, {'c':cid, 'dept':dept})

    return _ok({'announcements': [dict(r._mapping) for r in rows]})


# ══════════════════════════════════════════════════════════════════════
# AI ENDPOINTS — Tenant context injected into every AI prompt
# The AI only sees THIS tenant's data, never another company's
# ══════════════════════════════════════════════════════════════════════

def _get_tenant_context(cid):
    """Build company context for AI prompts — only this tenant's real data."""
    try:
        company = db.session.execute(text("""
            SELECT tc.name, tc.business_type, tc.country, tc.currency,
                   COUNT(e.id) AS employee_count
            FROM tenant_companies tc
            LEFT JOIN employees e ON e.company_id=tc.id AND e.status='active'
            WHERE tc.id=:c GROUP BY tc.name, tc.business_type, tc.country, tc.currency
        """), {'c': cid}).fetchone()

        if company:
            return f"Company: {company.name}, Business: {company.business_type}, Country: {company.country}, Employees: {company.employee_count}"
        return ""
    except Exception:
        return ""


@extended_bp.route('/ai/bi', methods=['GET', 'POST'])
@require_tenant
def ai_bi():
    cid = _cid()
    ctx = _get_tenant_context(cid)
    # Return tenant context so frontend can inject into AI prompts
    att  = _s("SELECT ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1) FROM attendance_logs WHERE company_id=:c AND date>=CURRENT_DATE-30", {'c':cid}, 0)
    emp  = _s("SELECT COUNT(*) FROM employees WHERE company_id=:c AND status='active'", {'c':cid})
    return _ok({'tenant_context': ctx, 'kpis': {'attendance_rate': float(att), 'total_employees': emp}})


@extended_bp.route('/ai/attrition', methods=['GET', 'POST'])
@require_tenant
def ai_attrition():
    cid = _cid()
    ctx = _get_tenant_context(cid)
    # Risk factors from real data
    high_risk = _q("""
        SELECT e.full_name, d.name AS dept,
               EXTRACT(YEAR FROM AGE(e.joining_date)) AS tenure_years,
               COUNT(lr.id) FILTER (WHERE lr.status='pending') AS pending_leaves
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN leave_requests lr ON lr.employee_id=e.id AND lr.company_id=:c
        WHERE e.company_id=:c AND e.status='active'
        GROUP BY e.full_name, d.name, e.joining_date
        HAVING EXTRACT(YEAR FROM AGE(e.joining_date)) < 1
        ORDER BY pending_leaves DESC LIMIT 10
    """, {'c':cid})
    return _ok({'tenant_context': ctx, 'at_risk': [dict(r._mapping) for r in high_risk]})


@extended_bp.route('/ai/attendance-insights', methods=['GET', 'POST'])
@require_tenant
def ai_attendance_insights():
    cid = _cid()
    ctx = _get_tenant_context(cid)
    trend = _q("""
        SELECT TO_CHAR(date,'Dy') AS day_name,
               ROUND(100.0*COUNT(*) FILTER(WHERE status='present')/NULLIF(COUNT(*),0),1) AS att_rate
        FROM attendance_logs WHERE company_id=:c AND date>=CURRENT_DATE-7
        GROUP BY TO_CHAR(date,'Dy'), date ORDER BY date
    """, {'c':cid})
    return _ok({'tenant_context': ctx, 'weekly_trend': [dict(r._mapping) for r in trend]})


@extended_bp.route('/ai/hr-analytics', methods=['GET', 'POST'])
@require_tenant
def ai_hr_analytics():
    cid = _cid()
    ctx = _get_tenant_context(cid)
    return _ok({'tenant_context': ctx})


@extended_bp.route('/ai/performance-insights', methods=['GET', 'POST'])
@require_tenant
def ai_performance_insights():
    cid = _cid()
    ctx = _get_tenant_context(cid)
    perf = _q("""
        SELECT d.name AS dept, ROUND(AVG(pr.rating),2) AS avg_rating
        FROM performance_reviews pr
        JOIN employees e ON e.id=pr.employee_id
        JOIN departments d ON d.id=e.department_id
        WHERE pr.company_id=:c
        GROUP BY d.name ORDER BY avg_rating DESC
    """, {'c':cid})
    return _ok({'tenant_context': ctx, 'dept_performance': [dict(r._mapping) for r in perf]})


@extended_bp.route('/ai/policy-assistant', methods=['GET', 'POST'])
@require_tenant
def ai_policy_assistant():
    cid = _cid()
    ctx = _get_tenant_context(cid)
    policies = _q("""
        SELECT title, category, effective_date, version
        FROM hr_policies WHERE company_id=:c AND is_active=true
        ORDER BY category, title LIMIT 20
    """, {'c':cid})
    return _ok({'tenant_context': ctx, 'policies': [dict(r._mapping) for r in policies]})


@extended_bp.route('/ai/report-generator', methods=['GET', 'POST'])
@require_tenant
def ai_report_generator():
    cid = _cid()
    ctx = _get_tenant_context(cid)
    return _ok({'tenant_context': ctx, 'available_reports': [
        'Attendance Summary', 'Leave Balance Report', 'Payroll Summary',
        'Headcount Analysis', 'Performance Review', 'Turnover Report',
        'Recruitment Pipeline', 'Training Completion', 'OT Report',
    ]})


@extended_bp.route('/ai/hr-letters', methods=['GET', 'POST'])
@require_tenant
def ai_hr_letters():
    cid = _cid()
    ctx = _get_tenant_context(cid)
    if request.method == 'POST':
        data = request.get_json() or {}
        try:
            db.session.execute(text("""
                INSERT INTO hr_letters (company_id, employee_id, letter_type,
                    content, generated_by, generated_at)
                VALUES (:c, :e, :type, :content, :by, NOW())
            """), {'c':cid,'e':data.get('employee_id'),'type':data.get('letter_type',''),
                   'content':data.get('content',''),'by':_uid()})
            db.session.commit()
            return _ok({'message': 'Letter saved'})
        except Exception as e:
            logger.error(f'hr_letters POST [{cid}]: {e}')
            return _err('Failed to save letter')

    employees = _q("""
        SELECT e.id, e.full_name, e.employee_code, d.name AS dept,
               des.title AS designation
        FROM employees e
        LEFT JOIN departments d ON d.id=e.department_id
        LEFT JOIN designations des ON des.id=e.designation_id
        WHERE e.company_id=:c AND e.status='active'
        ORDER BY e.full_name LIMIT 200
    """, {'c':cid})

    company_info = db.session.execute(text(
        "SELECT name, address, phone, email FROM tenant_companies WHERE id=:c"
    ), {'c':cid}).fetchone()

    return _ok({
        'tenant_context': ctx,
        'employees'     : [dict(r._mapping) for r in employees],
        'company_info'  : dict(company_info._mapping) if company_info else {},
    })
