# FILE: backend/tasks/ai_tasks.py
# eLogix HRMS — AI Celery Tasks
# Handles: AI insights generation, attrition prediction, performance analysis
# eLogix Technologies · www.elogix.com.np

import logging
from celery import shared_task
from sqlalchemy import text

log = logging.getLogger('elogix.tasks.ai')


@shared_task(name='tasks.ai_tasks.generate_all_tenant_insights')
def generate_all_tenant_insights():
    """Generate AI HR insights for all active tenants nightly."""
    try:
        from extensions import db
        companies = db.session.execute(text("""
            SELECT id, slug FROM companies WHERE status = 'active'
        """)).fetchall()

        for co in companies:
            generate_tenant_insights.apply_async(
                args=[str(co.id), co.slug], queue='low'
            )

        return {'queued': len(companies)}
    except Exception as exc:
        log.error(f"generate_all_tenant_insights failed: {exc}")
        return {'error': str(exc)}


@shared_task(name='tasks.ai_tasks.generate_tenant_insights',
             soft_time_limit=600)
def generate_tenant_insights(company_id: str, slug: str):
    """Generate and cache AI insights for one tenant."""
    try:
        from extensions import db
        from datetime import date
        import json

        # Gather metrics
        att_rate = db.session.execute(text("""
            SELECT ROUND(100.0 * COUNT(*) FILTER(WHERE status='present')
                   / NULLIF(COUNT(*), 0), 1)
            FROM attendance_logs
            WHERE company_id = :cid AND date >= CURRENT_DATE - 30
        """), {'cid': company_id}).scalar() or 0

        pending_leave = db.session.execute(text("""
            SELECT COUNT(*) FROM leave_requests
            WHERE company_id = :cid AND status = 'pending'
        """), {'cid': company_id}).scalar() or 0

        headcount = db.session.execute(text("""
            SELECT COUNT(*) FROM employees
            WHERE company_id = :cid AND status = 'active'
        """), {'cid': company_id}).scalar() or 0

        # Store insights
        insights = {
            'company_id': company_id,
            'generated_at': str(date.today()),
            'attendance_rate_30d': float(att_rate),
            'pending_leave': pending_leave,
            'headcount': headcount,
        }

        db.session.execute(text("""
            INSERT INTO ai_insights_cache
                (company_id, insights_json, generated_at)
            VALUES (:cid, :json, NOW())
            ON CONFLICT (company_id)
            DO UPDATE SET insights_json = :json, generated_at = NOW()
        """), {'cid': company_id, 'json': json.dumps(insights)})
        db.session.commit()

        log.info(f"✅ AI insights generated: {slug}")
        return insights
    except Exception as exc:
        log.error(f"generate_tenant_insights failed {slug}: {exc}")
        return {'error': str(exc)}
