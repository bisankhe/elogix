# FILE: backend/utils/logging_config.py
# Structured JSON logging for eLogix HRMS
# Compatible with: ELK Stack, Grafana Loki, AWS CloudWatch
# eLogix Technologies · www.elogix.com.np
import logging, json, os, traceback
from datetime import datetime, timezone

APP_NAME  = 'elogix-hrms'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')   # 'json' or 'text'


class JSONFormatter(logging.Formatter):
    """Outputs every log line as a JSON object — parseable by log collectors."""
    def format(self, record: logging.LogRecord) -> str:
        log = {
            'timestamp':  datetime.now(timezone.utc).isoformat(),
            'level':      record.levelname,
            'app':        APP_NAME,
            'module':     record.module,
            'message':    record.getMessage(),
        }
        for key in ('company_id', 'user_id', 'request_id', 'duration_ms'):
            if hasattr(record, key):
                log[key] = getattr(record, key)
        if record.exc_info:
            log['exception'] = traceback.format_exception(*record.exc_info)
        return json.dumps(log, ensure_ascii=False)


def setup_logging(app=None):
    """Configure logging — call once in create_app()."""
    root = logging.getLogger()
    root.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
    root.handlers.clear()

    handler = logging.StreamHandler()
    if LOG_FORMAT == 'json':
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        ))
    root.addHandler(handler)

    log_file = os.getenv('LOG_FILE', '')
    if log_file and os.path.exists(os.path.dirname(log_file)):
        fh = logging.FileHandler(log_file)
        fh.setFormatter(JSONFormatter())
        root.addHandler(fh)

    if app:
        app.logger.info(
            f'Logging initialised \u2014 level={LOG_LEVEL} format={LOG_FORMAT}'
        )

    return root


# Convenience module-level logger
logger = logging.getLogger(APP_NAME)


def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger.
    Usage: logger = get_logger('elogix.email')
    Identical to logging.getLogger(name).
    """
    return logging.getLogger(name)
