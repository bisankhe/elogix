# FILE: backend/celery_app.py
# eLogix HRMS — Celery Application Factory
# Handles async tasks: payroll processing, email notifications,
# report generation, AI analysis, attendance sync, leave calculations
# VPS-ready: Redis broker + PostgreSQL result backend
# eLogix Technologies · www.elogix.com.np

import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

REDIS_URL    = os.getenv('REDIS_URL',    'redis://localhost:6379/0')
BROKER_URL   = os.getenv('CELERY_BROKER_URL', REDIS_URL)
BACKEND_URL  = os.getenv('CELERY_RESULT_BACKEND',
               os.getenv('DATABASE_URL', '').replace('postgresql://', 'db+postgresql://') or REDIS_URL)


def make_celery(app=None):
    """Create Celery app, optionally binding to a Flask app."""
    celery = Celery(
        'elogix',
        broker        = BROKER_URL,
        backend       = BACKEND_URL,
        include       = [
            'tasks.payroll_tasks',
            'tasks.attendance_tasks',
            'tasks.leave_tasks',
            'tasks.notification_tasks',
            'tasks.report_tasks',
            'tasks.ai_tasks',
            'tasks.tenant_tasks',
        ],
    )

    celery.conf.update(
        # ── Serialization ──────────────────────────────────────────
        task_serializer        = 'json',
        result_serializer      = 'json',
        accept_content         = ['json'],
        # ── Timezone ───────────────────────────────────────────────
        timezone               = 'Asia/Kathmandu',
        enable_utc             = True,
        # ── Task behaviour ─────────────────────────────────────────
        task_acks_late         = True,           # ack only after task completes (safe)
        task_reject_on_worker_lost = True,       # requeue if worker crashes
        task_track_started     = True,
        task_time_limit        = 3600,           # 1 hour hard limit
        task_soft_time_limit   = 3300,           # 55 min soft limit (raises SoftTimeLimitExceeded)
        # ── Result backend ─────────────────────────────────────────
        result_expires         = 86400,          # results kept 24 hours
        result_persistent      = True,
        # ── Worker ─────────────────────────────────────────────────
        worker_prefetch_multiplier = 1,          # one task at a time per worker (safe for payroll)
        worker_max_tasks_per_child = 200,        # restart worker every 200 tasks (prevents memory leaks)
        worker_disable_rate_limits = False,
        # ── Retry ──────────────────────────────────────────────────
        task_max_retries       = 3,
        task_default_retry_delay = 60,           # 1 min between retries
        # ── Queue routing ──────────────────────────────────────────
        task_queues            = {
            'high':    {'exchange': 'high',    'routing_key': 'high'},
            'default': {'exchange': 'default', 'routing_key': 'default'},
            'low':     {'exchange': 'low',     'routing_key': 'low'},
            'reports': {'exchange': 'reports', 'routing_key': 'reports'},
        },
        task_default_queue     = 'default',
        task_routes            = {
            # High priority — user-facing, time-sensitive
            'tasks.notification_tasks.*': {'queue': 'high'},
            'tasks.leave_tasks.approve_leave': {'queue': 'high'},
            'tasks.attendance_tasks.process_today': {'queue': 'high'},
            # Default — background processing
            'tasks.payroll_tasks.*': {'queue': 'default'},
            'tasks.attendance_tasks.*': {'queue': 'default'},
            'tasks.leave_tasks.*': {'queue': 'default'},
            'tasks.tenant_tasks.*': {'queue': 'default'},
            # Low — AI analysis, can be slow
            'tasks.ai_tasks.*': {'queue': 'low'},
            # Reports — isolated queue to avoid blocking
            'tasks.report_tasks.*': {'queue': 'reports'},
        },
        # ── Scheduled tasks (Celery Beat) ──────────────────────────
        beat_schedule          = {
            # Attendance processing — every night at 11:30 PM NPT
            'process-daily-attendance': {
                'task'    : 'tasks.attendance_tasks.process_daily_attendance',
                'schedule': crontab(hour=18, minute=00),  # 18:00 UTC = 11:45 NPT
                'options' : {'queue': 'default'},
            },
            # Payroll auto-run — last working day of month at 10 PM NPT
            'monthly-payroll-trigger': {
                'task'    : 'tasks.payroll_tasks.trigger_monthly_payroll',
                'schedule': crontab(hour=16, minute=15, day_of_month='28-31'),
                'options' : {'queue': 'default'},
            },
            # Leave balance refresh — every Sunday at 1 AM NPT
            'refresh-leave-balances': {
                'task'    : 'tasks.leave_tasks.refresh_all_leave_balances',
                'schedule': crontab(hour=19, minute=30, day_of_week='sun'),
                'options' : {'queue': 'default'},
            },
            # Birthday/anniversary notifications — every day at 8 AM NPT
            'birthday-anniversary-notifications': {
                'task'    : 'tasks.notification_tasks.send_birthday_anniversary_alerts',
                'schedule': crontab(hour=2, minute=15),  # 2:15 UTC = 8:00 NPT
                'options' : {'queue': 'high'},
            },
            # Contract expiry warnings — every Monday at 9 AM NPT
            'contract-expiry-warnings': {
                'task'    : 'tasks.notification_tasks.send_contract_expiry_warnings',
                'schedule': crontab(hour=3, minute=15, day_of_week='mon'),
                'options' : {'queue': 'high'},
            },
            # AI insights generation — every day at 2 AM NPT
            'generate-ai-insights': {
                'task'    : 'tasks.ai_tasks.generate_all_tenant_insights',
                'schedule': crontab(hour=20, minute=15),  # 20:15 UTC = 2:00 NPT
                'options' : {'queue': 'low'},
            },
            # Database health check — every 5 minutes
            'db-health-check': {
                'task'    : 'tasks.tenant_tasks.health_check',
                'schedule': 300.0,   # every 5 minutes
                'options' : {'queue': 'high'},
            },
            # Clean up old task results — daily at 3 AM UTC
            'cleanup-old-results': {
                'task'    : 'tasks.report_tasks.cleanup_old_results',
                'schedule': crontab(hour=3, minute=0),
                'options' : {'queue': 'low'},
            },
        },
    )

    if app is not None:
        _bind_to_flask(celery, app)

    return celery


def _bind_to_flask(celery, app):
    """Push Flask app context into every Celery task."""
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask


# Standalone instance (used by worker and beat)
celery = make_celery()
