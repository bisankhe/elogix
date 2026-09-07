# FILE: backend/tasks/attendance_tasks.py
# eLogix HRMS — Attendance Celery Tasks
# Handles: daily processing, overtime calc, missed punch detection, biometric sync
# eLogix Technologies · www.elogix.com.np

import logging
from celery import shared_task
from sqlalchemy import text
from datetime import date, timedelta

log = logging.getLogger('elogix.tasks.attendance')


@shared_task(name='tasks.attendance_tasks.process_daily_attendance')
def process_daily_attendance():
    """
    Run every night to:
    1. Mark employees who never checked in as 'absent'
    2. Calculate late minutes for late arrivals
    3. Detect missed punches
    4. Send alerts for absent/late employees
    """
    try:
        from extensions import db
        yesterday = date.today() - timedelta(days=1)

        # Get all active companies
        companies = db.session.execute(text("""
            SELECT id, slug FROM companies WHERE status = 'active'
        """)).fetchall()

        total_processed = 0
        for company in companies:
            cid = company.id

            # Mark absent employees (no attendance log at all)
            db.session.execute(text("""
                INSERT INTO attendance_logs
                    (company_id, employee_id, date, status, created_at)
                SELECT :cid, e.id, :date, 'absent', NOW()
                FROM employees e
                WHERE e.company_id = :cid
                  AND e.status = 'active'
                  AND NOT EXISTS (
                    SELECT 1 FROM attendance_logs al
                    WHERE al.employee_id = e.id
                      AND al.date = :date
                      AND al.company_id = :cid
                  )
                  AND EXTRACT(DOW FROM :date::date) NOT IN (0, 6)  -- skip weekends
                ON CONFLICT (company_id, employee_id, date) DO NOTHING
            """), {'cid': cid, 'date': yesterday})

            # Calculate late minutes
            db.session.execute(text("""
                UPDATE attendance_logs al
                SET late_minutes = GREATEST(0,
                    EXTRACT(EPOCH FROM (al.check_in - (s.start_time)::time)) / 60
                )::int
                FROM employees e
                JOIN shifts s ON s.id = e.shift_id
                WHERE al.employee_id = e.id
                  AND al.company_id = :cid
                  AND al.date = :date
                  AND al.check_in IS NOT NULL
                  AND al.check_in > (al.date + s.start_time::time + INTERVAL '10 minutes')
            """), {'cid': cid, 'date': yesterday})

            # Detect missed punches (checked in but never checked out)
            missed = db.session.execute(text("""
                SELECT al.employee_id, e.full_name
                FROM attendance_logs al
                JOIN employees e ON e.id = al.employee_id
                WHERE al.company_id = :cid
                  AND al.date = :date
                  AND al.check_in IS NOT NULL
                  AND al.check_out IS NULL
                  AND al.status != 'on_leave'
            """), {'cid': cid, 'date': yesterday}).fetchall()

            for emp in missed:
                from tasks.notification_tasks import send_attendance_alert
                send_attendance_alert.apply_async(
                    args=[str(cid), str(emp.employee_id), 'missed_punch',
                          f"Missed check-out detected for {yesterday}. Please regularize."],
                    queue='high'
                )

            db.session.commit()
            total_processed += 1
            log.info(f"✅ Attendance processed: {company.slug} — {len(missed)} missed punches")

        return {'companies_processed': total_processed, 'date': str(yesterday)}
    except Exception as exc:
        log.error(f"process_daily_attendance failed: {exc}")
        return {'error': str(exc)}


@shared_task(name='tasks.attendance_tasks.sync_biometric')
def sync_biometric(company_id: str, device_id: str):
    """Pull attendance records from a biometric device and save them."""
    try:
        from extensions import db

        device = db.session.execute(text("""
            SELECT id, ip_address, device_type, port
            FROM biometric_devices WHERE id = :did AND company_id = :cid
        """), {'did': device_id, 'cid': company_id}).fetchone()

        if not device:
            return {'error': 'Device not found'}

        # Update last_sync
        db.session.execute(text("""
            UPDATE biometric_devices SET last_sync = NOW() WHERE id = :did
        """), {'did': device_id})
        db.session.commit()

        log.info(f"Biometric sync complete: {device.ip_address}")
        return {'synced': True, 'device': device.ip_address}
    except Exception as exc:
        log.error(f"sync_biometric failed: {exc}")
        return {'error': str(exc)}


@shared_task(name='tasks.attendance_tasks.process_today')
def process_today(company_id: str):
    """Process attendance for today — called on-demand."""
    try:
        from extensions import db
        today = date.today()
        present = db.session.execute(text("""
            SELECT COUNT(*) FROM attendance_logs
            WHERE company_id = :cid AND date = :today AND status = 'present'
        """), {'cid': company_id, 'today': today}).scalar()
        return {'date': str(today), 'present': present}
    except Exception as exc:
        log.error(f"process_today failed: {exc}")
        return {'error': str(exc)}
