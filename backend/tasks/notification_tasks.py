# FILE: backend/tasks/notification_tasks.py
# eLogix HRMS — Notification Celery Tasks
# Handles: birthday/anniversary alerts, contract expiry, leave status, system alerts
# eLogix Technologies · www.elogix.com.np

import logging
from celery import shared_task
from sqlalchemy import text
from datetime import date, timedelta

log = logging.getLogger('elogix.tasks.notifications')


def _insert_notification(db, company_id, recipient_id, title, body, ntype, action_url=None):
    """Insert a notification record into the database."""
    db.session.execute(text("""
        INSERT INTO notifications
            (company_id, recipient_id, title, body, type, action_url, is_read, created_at)
        VALUES (:cid, :rid, :title, :body, :type, :url, false, NOW())
    """), {
        'cid': company_id, 'rid': recipient_id,
        'title': title, 'body': body, 'type': ntype, 'url': action_url
    })


@shared_task(name='tasks.notification_tasks.send_birthday_anniversary_alerts')
def send_birthday_anniversary_alerts():
    """Send birthday and work anniversary notifications every morning."""
    try:
        from extensions import db
        today = date.today()

        # Birthdays today
        birthdays = db.session.execute(text("""
            SELECT e.id, e.full_name, e.company_id, e.date_of_birth,
                   m.id AS manager_id
            FROM employees e
            LEFT JOIN employees m ON m.id = e.reports_to
            WHERE e.status = 'active'
              AND TO_CHAR(e.date_of_birth, 'MM-DD') = :today
        """), {'today': today.strftime('%m-%d')}).fetchall()

        for emp in birthdays:
            # Notify the employee
            _insert_notification(
                db, emp.company_id, emp.id,
                f"🎂 Happy Birthday, {emp.full_name.split()[0]}!",
                f"Wishing you a wonderful birthday from the eLogix HRMS team!",
                'birthday'
            )
            # Notify their manager
            if emp.manager_id:
                age = today.year - emp.date_of_birth.year
                _insert_notification(
                    db, emp.company_id, emp.manager_id,
                    f"🎂 {emp.full_name}'s Birthday Today",
                    f"{emp.full_name} celebrates their {age}th birthday today!",
                    'birthday', f'/employee-profile/{emp.id}'
                )

        # Work anniversaries today
        anniversaries = db.session.execute(text("""
            SELECT e.id, e.full_name, e.company_id, e.joining_date,
                   EXTRACT(YEAR FROM AGE(e.joining_date))::int AS years
            FROM employees e
            WHERE e.status = 'active'
              AND TO_CHAR(e.joining_date, 'MM-DD') = :today
              AND e.joining_date < CURRENT_DATE
        """), {'today': today.strftime('%m-%d')}).fetchall()

        for emp in anniversaries:
            _insert_notification(
                db, emp.company_id, emp.id,
                f"🎉 {emp.years} Year{'s' if emp.years > 1 else ''} Anniversary!",
                f"Congratulations on {emp.years} year{'s' if emp.years > 1 else ''} at the company!",
                'anniversary'
            )

        db.session.commit()
        log.info(f"✅ Sent {len(birthdays)} birthday + {len(anniversaries)} anniversary alerts")
        return {'birthdays': len(birthdays), 'anniversaries': len(anniversaries)}

    except Exception as exc:
        log.error(f"birthday/anniversary alerts failed: {exc}")
        return {'error': str(exc)}


@shared_task(name='tasks.notification_tasks.send_contract_expiry_warnings')
def send_contract_expiry_warnings():
    """Send warnings for contracts expiring in 7, 30, 60 days."""
    try:
        from extensions import db
        today = date.today()

        for days_ahead in [7, 30, 60]:
            target = today + timedelta(days=days_ahead)
            contracts = db.session.execute(text("""
                SELECT ec.id, ec.employee_id, ec.end_date, ec.company_id,
                       e.full_name, e.company_id,
                       m.id AS hr_id
                FROM employee_contracts ec
                JOIN employees e ON e.id = ec.employee_id
                LEFT JOIN (
                    SELECT id, company_id FROM employees
                    WHERE role IN ('hr_manager','super_admin')
                    LIMIT 1
                ) m ON m.company_id = ec.company_id
                WHERE ec.status = 'active'
                  AND ec.end_date = :target
            """), {'target': target}).fetchall()

            for c in contracts:
                urgency = '🔴' if days_ahead == 7 else '🟡' if days_ahead == 30 else '🔵'
                _insert_notification(
                    db, c.company_id, c.employee_id,
                    f"{urgency} Contract Expiring in {days_ahead} Days",
                    f"Your employment contract expires on {c.end_date}. Please contact HR.",
                    'contract_expiry', '/ess/my-documents'
                )
                if c.hr_id:
                    _insert_notification(
                        db, c.company_id, c.hr_id,
                        f"{urgency} {c.full_name}'s Contract Expires in {days_ahead} Days",
                        f"Employee contract expires on {c.end_date}. Action may be required.",
                        'contract_expiry', f'/contract-expiry'
                    )

        db.session.commit()
        log.info("✅ Contract expiry warnings sent")
        return {'status': 'ok'}
    except Exception as exc:
        log.error(f"contract_expiry_warnings failed: {exc}")
        return {'error': str(exc)}


@shared_task(name='tasks.notification_tasks.notify_leave_status')
def notify_leave_status(company_id: str, employee_id: str,
                         leave_type: str, status: str, days: int):
    """Notify employee that their leave request was approved/rejected."""
    try:
        from extensions import db
        emoji = '✅' if status == 'approved' else '❌'
        _insert_notification(
            db, company_id, employee_id,
            f"{emoji} Leave {status.capitalize()}",
            f"Your {days}-day {leave_type} leave has been {status}.",
            'leave', '/leave-request'
        )
        db.session.commit()
        return {'notified': True}
    except Exception as exc:
        log.error(f"notify_leave_status failed: {exc}")
        return {'error': str(exc)}


@shared_task(name='tasks.notification_tasks.send_attendance_alert')
def send_attendance_alert(company_id: str, employee_id: str,
                           alert_type: str, message: str):
    """Send attendance-related alert (late, absent, missed punch)."""
    try:
        from extensions import db
        icons = {'late': '⏰', 'absent': '❌', 'missed_punch': '🔴', 'wfh': '🏠'}
        icon = icons.get(alert_type, '📋')
        _insert_notification(
            db, company_id, employee_id,
            f"{icon} Attendance Alert",
            message,
            f'attendance_{alert_type}', '/live-attendance'
        )
        db.session.commit()
        return {'sent': True}
    except Exception as exc:
        log.error(f"send_attendance_alert failed: {exc}")
        return {'error': str(exc)}
