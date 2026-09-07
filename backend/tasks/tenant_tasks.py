# FILE: backend/tasks/tenant_tasks.py
# eLogix HRMS — Tenant Management Celery Tasks
# eLogix Technologies · www.elogix.com.np

import logging
from celery import shared_task
from sqlalchemy import text

log = logging.getLogger('elogix.tasks.tenant')


@shared_task(name='tasks.tenant_tasks.health_check')
def health_check():
    """Simple health check — verifies DB connection. Runs every 5 min."""
    try:
        from extensions import db
        db.session.execute(text('SELECT 1'))
        return {'status': 'healthy'}
    except Exception as exc:
        log.error(f"Health check failed: {exc}")
        return {'status': 'unhealthy', 'error': str(exc)}


@shared_task(name='tasks.tenant_tasks.provision_new_tenant')
def provision_new_tenant(company_id: str, slug: str, plan: str,
                          business_type: str = 'custom'):
    """Full tenant provisioning after approval. Creates all required DB records."""
    try:
        from extensions import db

        # Create leave types for tenant
        db.session.execute(text("""
            INSERT INTO leave_types
                (company_id, name, code, annual_days, is_paid, is_active)
            VALUES
                (:cid, 'Annual Leave',     'AL', 18, true, true),
                (:cid, 'Sick Leave',       'SL', 12, true, true),
                (:cid, 'Casual Leave',     'CL',  6, true, true),
                (:cid, 'Maternity Leave',  'ML', 98, true, true),
                (:cid, 'Paternity Leave',  'PL', 15, true, true),
                (:cid, 'Bereavement Leave','BL',  5, true, true),
                (:cid, 'Emergency Leave',  'EL',  3, true, true),
                (:cid, 'Compensatory',     'CO',  0, true, true)
            ON CONFLICT (company_id, code) DO NOTHING
        """), {'cid': company_id})

        # Create default departments
        db.session.execute(text("""
            INSERT INTO departments (company_id, name, code, is_active)
            VALUES
                (:cid, 'Human Resources', 'HR', true),
                (:cid, 'Administration',  'ADMIN', true),
                (:cid, 'Finance',         'FIN', true),
                (:cid, 'Operations',      'OPS', true),
                (:cid, 'IT',              'IT', true)
            ON CONFLICT (company_id, code) DO NOTHING
        """), {'cid': company_id})

        # Create default shifts
        db.session.execute(text("""
            INSERT INTO shifts (company_id, name, start_time, end_time, is_active)
            VALUES
                (:cid, 'Day Shift',     '09:00', '18:00', true),
                (:cid, 'Morning Shift', '06:00', '14:00', true),
                (:cid, 'Evening Shift', '14:00', '22:00', true),
                (:cid, 'Night Shift',   '22:00', '06:00', true)
            ON CONFLICT DO NOTHING
        """), {'cid': company_id})

        db.session.commit()
        log.info(f"✅ Tenant provisioned: {slug} ({plan})")
        return {'provisioned': True, 'slug': slug}
    except Exception as exc:
        log.error(f"provision_new_tenant failed {slug}: {exc}")
        try:
            from extensions import db
            db.session.rollback()
        except Exception:
            pass
        return {'error': str(exc)}


@shared_task(name='tasks.report_tasks.cleanup_old_results')
def cleanup_old_results():
    """Clean up old Celery task results and temp files."""
    try:
        from extensions import db
        db.session.execute(text("""
            DELETE FROM celery_taskmeta
            WHERE date_done < NOW() - INTERVAL '7 days'
        """))
        db.session.commit()
        return {'cleaned': True}
    except Exception:
        return {'cleaned': False}
