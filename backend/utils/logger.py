# FILE: backend/utils/logger.py
# eLogix HRMS — Structured Logging & Audit Trail
# Every HR action is logged with tenant, user, and timestamp
# Audit logs are queryable from the admin panel
# eLogix Technologies · www.elogix.com.np

import logging
import json
import traceback
from datetime import datetime, timezone
from functools import wraps
from flask import request, g, has_request_context


# ══════════════════════════════════════════════════════════════════════
# STRUCTURED LOG FORMATTER
# ══════════════════════════════════════════════════════════════════════

class ELogixFormatter(logging.Formatter):
    """JSON-structured log formatter for production."""

    def format(self, record: logging.LogRecord) -> str:
        log = {
            'timestamp' : datetime.now(timezone.utc).isoformat(),
            'level'     : record.levelname,
            'logger'    : record.name,
            'message'   : record.getMessage(),
            'module'    : record.module,
            'line'      : record.lineno,
        }

        # Attach request context if available
        if has_request_context():
            log['request'] = {
                'method'    : request.method,
                'path'      : request.path,
                'ip'        : request.remote_addr,
                'company_id': getattr(g, 'company_id', None),
                'user_id'   : getattr(g, 'user_id', None),
                'tenant'    : getattr(g, 'tenant_slug', None),
            }

        # Attach exception info
        if record.exc_info:
            log['exception'] = traceback.format_exception(*record.exc_info)

        # Extra fields added via logger.info('msg', extra={'key': 'val'})
        for key in ['event', 'entity', 'entity_id', 'old_value', 'new_value', 'duration_ms']:
            if hasattr(record, key):
                log[key] = getattr(record, key)

        return json.dumps(log, default=str, ensure_ascii=False)


def setup_logging(app, level: str = 'INFO'):
    """Configure application-wide logging."""
    import os

    log_level  = getattr(logging, level.upper(), logging.INFO)
    is_dev     = os.getenv('FLASK_ENV', 'production') == 'development'

    # Root eLogix logger
    root_logger = logging.getLogger('elogix')
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()

    handler = logging.StreamHandler()

    if is_dev:
        # Human-readable format for development
        handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(name)s %(levelname)s: %(message)s',
            datefmt='%H:%M:%S'
        ))
    else:
        # JSON format for production (parseable by log aggregators)
        handler.setFormatter(ELogixFormatter())

    root_logger.addHandler(handler)

    # Silence noisy third-party loggers
    for noisy in ['urllib3', 'werkzeug', 'sqlalchemy.engine']:
        logging.getLogger(noisy).setLevel(logging.WARNING)

    app.logger.handlers = root_logger.handlers
    app.logger.setLevel(log_level)

    return root_logger


# ══════════════════════════════════════════════════════════════════════
# AUDIT LOGGER — writes to DB
# ══════════════════════════════════════════════════════════════════════

class AuditLogger:
    """
    Writes audit events to the audit_logs table.
    Used for all HR actions: hire, fire, payroll, leave approval, etc.
    """

    ACTIONS = {
        # Employees
        'employee.create'    : 'Employee created',
        'employee.update'    : 'Employee updated',
        'employee.terminate' : 'Employee terminated',
        'employee.activate'  : 'Employee activated',
        # Leave
        'leave.apply'        : 'Leave applied',
        'leave.approve'      : 'Leave approved',
        'leave.reject'       : 'Leave rejected',
        'leave.cancel'       : 'Leave cancelled',
        # Payroll
        'payroll.process'    : 'Payroll processed',
        'payroll.finalize'   : 'Payroll finalized',
        'payroll.reverse'    : 'Payroll reversed',
        # Auth
        'auth.login'         : 'User logged in',
        'auth.logout'        : 'User logged out',
        'auth.failed'        : 'Login failed',
        'auth.password_reset': 'Password reset',
        # Admin
        'tenant.approve'     : 'Tenant approved',
        'tenant.suspend'     : 'Tenant suspended',
        'role.assign'        : 'Role assigned',
        'module.enable'      : 'Module enabled',
        'module.disable'     : 'Module disabled',
        # Data
        'data.export'        : 'Data exported',
        'data.import'        : 'Data imported',
        'data.delete'        : 'Data deleted',
    }

    @staticmethod
    def log(action: str, entity: str = None, entity_id = None,
            old_value: dict = None, new_value: dict = None,
            notes: str = None, company_id=None, user_id=None):
        """
        Write an audit record.
        Args:
            action    : Action code from ACTIONS dict (e.g. 'employee.create')
            entity    : Entity type ('Employee', 'Leave', 'Payroll')
            entity_id : ID of the affected record
            old_value : Previous state (for updates)
            new_value : New state (for creates/updates)
            notes     : Human-readable notes
        """
        try:
            from backend.extensions import db
            from sqlalchemy import text

            cid = company_id or getattr(g, 'company_id', None)
            uid = user_id    or getattr(g, 'user_id', None)

            db.session.execute(text("""
                INSERT INTO audit_logs (
                    company_id, user_id, action, entity_type, entity_id,
                    old_value, new_value, notes, ip_address, user_agent, created_at
                ) VALUES (
                    :cid, :uid, :action, :entity, :eid,
                    :old_val::jsonb, :new_val::jsonb, :notes, :ip, :ua, NOW()
                )
            """), {
                'cid'    : cid,
                'uid'    : uid,
                'action' : action,
                'entity' : entity,
                'eid'    : str(entity_id) if entity_id else None,
                'old_val': json.dumps(old_value) if old_value else None,
                'new_val': json.dumps(new_value) if new_value else None,
                'notes'  : notes,
                'ip'     : request.remote_addr if has_request_context() else None,
                'ua'     : request.headers.get('User-Agent', '')[:500] if has_request_context() else None,
            })
            db.session.commit()

        except Exception as e:
            # Never let audit logging crash the main request
            logging.getLogger('elogix.audit').warning(f'Audit log failed: {e}')


# Convenience instance
audit = AuditLogger()


# ══════════════════════════════════════════════════════════════════════
# REQUEST TIMING DECORATOR
# ══════════════════════════════════════════════════════════════════════

def log_request_time(f):
    """Decorator: log API response time for performance monitoring."""
    @wraps(f)
    def decorated(*args, **kwargs):
        import time
        start   = time.perf_counter()
        result  = f(*args, **kwargs)
        elapsed = round((time.perf_counter() - start) * 1000, 2)

        logger = logging.getLogger('elogix.perf')
        if elapsed > 2000:
            logger.warning(f'SLOW {request.method} {request.path}: {elapsed}ms')
        elif elapsed > 500:
            logger.info(f'MEDIUM {request.method} {request.path}: {elapsed}ms')

        return result
    return decorated
