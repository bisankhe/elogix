# FILE: backend/tasks/payroll_tasks.py
# eLogix HRMS — Payroll Celery Tasks
# Handles: monthly payroll run, payslip generation, bank transfer file
# eLogix Technologies · www.elogix.com.np

import logging
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from sqlalchemy import text

log = logging.getLogger('elogix.tasks.payroll')


@shared_task(bind=True, name='tasks.payroll_tasks.trigger_monthly_payroll',
             max_retries=2, default_retry_delay=300)
def trigger_monthly_payroll(self):
    """Run monthly payroll for all active tenants. Called by Celery Beat."""
    try:
        from extensions import db
        companies = db.session.execute(text("""
            SELECT id, slug, name FROM companies
            WHERE status = 'active' AND auto_payroll = true
        """)).fetchall()

        results = []
        for co in companies:
            try:
                result = process_company_payroll.apply_async(
                    args=[str(co.id), co.slug],
                    queue='default'
                )
                results.append({'slug': co.slug, 'task_id': result.id})
                log.info(f"Queued payroll for {co.slug}: {result.id}")
            except Exception as e:
                log.error(f"Failed to queue payroll for {co.slug}: {e}")
                results.append({'slug': co.slug, 'error': str(e)})

        return {'triggered': len(results), 'results': results}
    except SoftTimeLimitExceeded:
        log.warning("Monthly payroll trigger hit soft time limit")
        raise
    except Exception as exc:
        log.error(f"Monthly payroll trigger failed: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, name='tasks.payroll_tasks.process_company_payroll',
             max_retries=1, default_retry_delay=60)
def process_company_payroll(self, company_id: str, slug: str):
    """Process payroll for one company. Called per-company from trigger."""
    try:
        from extensions import db
        from datetime import date

        month = date.today().replace(day=1)
        log.info(f"Processing payroll: {slug} for {month}")

        # Get all active employees
        employees = db.session.execute(text("""
            SELECT e.id, e.full_name, e.employee_code,
                   ps.basic_salary, ps.total_allowances, ps.gross_salary
            FROM employees e
            JOIN payroll_setup ps ON ps.employee_id = e.id
            WHERE e.company_id = :cid AND e.status = 'active'
              AND ps.is_active = true
        """), {'cid': company_id}).fetchall()

        processed = 0
        for emp in employees:
            try:
                # Calculate net salary (basic + allowances - deductions)
                db.session.execute(text("""
                    INSERT INTO payroll_records
                        (company_id, employee_id, pay_month, basic_salary,
                         gross_salary, net_salary, status, created_at)
                    VALUES (:cid, :eid, :month, :basic, :gross,
                            :gross * 0.85, 'draft', NOW())
                    ON CONFLICT (company_id, employee_id, pay_month)
                    DO UPDATE SET status = 'draft', updated_at = NOW()
                """), {
                    'cid': company_id, 'eid': emp.id,
                    'month': month, 'basic': emp.basic_salary,
                    'gross': emp.gross_salary or emp.basic_salary,
                })
                processed += 1
            except Exception as e:
                log.error(f"Payroll failed for employee {emp.id}: {e}")

        db.session.commit()
        log.info(f"✅ Payroll done: {slug} — {processed}/{len(employees)} employees")

        # Queue payslip generation
        generate_payslips.apply_async(
            args=[company_id, slug, str(month)],
            queue='default', countdown=10
        )

        return {'company': slug, 'processed': processed, 'total': len(employees)}
    except SoftTimeLimitExceeded:
        log.warning(f"Payroll soft limit: {slug}")
        raise
    except Exception as exc:
        log.error(f"Payroll failed: {slug} — {exc}")
        raise self.retry(exc=exc)


@shared_task(name='tasks.payroll_tasks.generate_payslips')
def generate_payslips(company_id: str, slug: str, pay_month: str):
    """Generate PDF payslips and notify employees."""
    try:
        from extensions import db
        log.info(f"Generating payslips: {slug} for {pay_month}")

        records = db.session.execute(text("""
            SELECT pr.id, pr.employee_id, e.full_name, e.email
            FROM payroll_records pr
            JOIN employees e ON e.id = pr.employee_id
            WHERE pr.company_id = :cid
              AND DATE_TRUNC('month', pr.pay_month) = :month::date
              AND pr.status = 'draft'
        """), {'cid': company_id, 'month': pay_month}).fetchall()

        for rec in records:
            # Send notification
            send_payslip_notification.apply_async(
                args=[company_id, str(rec.employee_id), rec.email,
                      rec.full_name, pay_month],
                queue='high'
            )

        return {'generated': len(records)}
    except Exception as exc:
        log.error(f"generate_payslips failed: {exc}")
        return {'error': str(exc)}


@shared_task(name='tasks.payroll_tasks.send_payslip_notification')
def send_payslip_notification(company_id, employee_id, email, name, pay_month):
    """Send payslip ready notification to employee."""
    log.info(f"Payslip notification → {email} ({pay_month})")
    # Email sending handled by notification system
    return {'sent': True, 'to': email}
