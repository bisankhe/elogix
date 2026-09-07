# FILE: backend/tasks/leave_tasks.py
# eLogix HRMS — Leave Celery Tasks
# eLogix Technologies · www.elogix.com.np

import logging
from celery import shared_task
from sqlalchemy import text
from datetime import date

log = logging.getLogger('elogix.tasks.leave')


@shared_task(name='tasks.leave_tasks.refresh_all_leave_balances')
def refresh_all_leave_balances():
    """Recalculate leave balances for all active tenants. Runs weekly."""
    try:
        from extensions import db
        year = date.today().year

        db.session.execute(text("""
            INSERT INTO leave_balances
                (company_id, employee_id, leave_type_id, year,
                 entitled_days, used_days, created_at)
            SELECT
                e.company_id, e.id, lt.id, :year,
                lt.annual_days, 0, NOW()
            FROM employees e
            CROSS JOIN leave_types lt
            WHERE e.status = 'active'
              AND lt.company_id = e.company_id
              AND lt.is_active = true
            ON CONFLICT (company_id, employee_id, leave_type_id, year)
            DO UPDATE SET
                entitled_days = EXCLUDED.entitled_days,
                updated_at    = NOW()
        """), {'year': year})

        # Recalculate used days from approved leave requests
        db.session.execute(text("""
            UPDATE leave_balances lb
            SET used_days = (
                SELECT COALESCE(SUM(lr.days), 0)
                FROM leave_requests lr
                WHERE lr.employee_id    = lb.employee_id
                  AND lr.leave_type_id  = lb.leave_type_id
                  AND lr.company_id     = lb.company_id
                  AND lr.status         = 'approved'
                  AND EXTRACT(YEAR FROM lr.from_date) = lb.year
            )
            WHERE lb.year = :year
        """), {'year': year})

        db.session.commit()
        log.info(f"✅ Leave balances refreshed for {year}")
        return {'year': year, 'status': 'refreshed'}
    except Exception as exc:
        log.error(f"refresh_all_leave_balances failed: {exc}")
        return {'error': str(exc)}


@shared_task(name='tasks.leave_tasks.approve_leave')
def approve_leave(company_id: str, leave_request_id: str, approved_by: str):
    """Approve a leave request and update attendance logs."""
    try:
        from extensions import db
        from tasks.notification_tasks import notify_leave_status

        req = db.session.execute(text("""
            SELECT lr.*, e.full_name, lt.name AS leave_type
            FROM leave_requests lr
            JOIN employees e ON e.id = lr.employee_id
            JOIN leave_types lt ON lt.id = lr.leave_type_id
            WHERE lr.id = :lid AND lr.company_id = :cid
        """), {'lid': leave_request_id, 'cid': company_id}).fetchone()

        if not req:
            return {'error': 'Leave request not found'}

        # Update status
        db.session.execute(text("""
            UPDATE leave_requests
            SET status = 'approved', approved_by = :approver,
                approved_at = NOW(), updated_at = NOW()
            WHERE id = :lid AND company_id = :cid
        """), {'approver': approved_by, 'lid': leave_request_id, 'cid': company_id})

        # Update leave balance
        db.session.execute(text("""
            UPDATE leave_balances
            SET used_days = used_days + :days, updated_at = NOW()
            WHERE company_id = :cid
              AND employee_id = :eid
              AND leave_type_id = :ltid
              AND year = EXTRACT(YEAR FROM :from_date::date)
        """), {
            'days': req.days, 'cid': company_id,
            'eid': req.employee_id, 'ltid': req.leave_type_id,
            'from_date': req.from_date,
        })

        # Mark attendance as on_leave for each day
        db.session.execute(text("""
            UPDATE attendance_logs
            SET status = 'on_leave'
            WHERE company_id = :cid
              AND employee_id = :eid
              AND date BETWEEN :from_date AND :to_date
        """), {
            'cid': company_id, 'eid': req.employee_id,
            'from_date': req.from_date, 'to_date': req.to_date,
        })

        db.session.commit()

        # Notify employee
        notify_leave_status.apply_async(
            args=[company_id, str(req.employee_id),
                  req.leave_type, 'approved', req.days],
            queue='high'
        )

        log.info(f"✅ Leave approved: {leave_request_id}")
        return {'approved': True, 'days': req.days}
    except Exception as exc:
        log.error(f"approve_leave failed: {exc}")
        return {'error': str(exc)}
