# FILE: backend/utils/logging_config.py
# Structured JSON logging for data center / log management systems
# Compatible with: ELK Stack, Grafana Loki, AWS CloudWatch
import logging, json, os, traceback
from datetime import datetime, timezone

APP_NAME = 'nephr-pro'
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
        # Add extra fields if provided
        for key in ('company_id', 'user_id', 'request_id', 'duration_ms'):
            if hasattr(record, key):
                log[key] = getattr(record, key)
        # Add exception info if present
        if record.exc_info:
            log['exception'] = traceback.format_exception(*record.exc_info)
        return json.dumps(log, ensure_ascii=False)

def setup_logging(app=None):
    """Configure logging — call once in create_app()."""
    root = logging.getLogger()
    root.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    # Remove default handlers
    root.handlers.clear()

    handler = logging.StreamHandler()
    if LOG_FORMAT == 'json':
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(levelname)s] %(module)s: %(message)s'))
    root.addHandler(handler)

    # File handler for data center persistent logs
    log_file = os.getenv('LOG_FILE', '/var/log/nephr-pro/app.log')
    if os.path.exists(os.path.dirname(log_file)):
        fh = logging.FileHandler(log_file)
        fh.setFormatter(JSONFormatter())
        root.addHandler(fh)

    if app:
        app.logger.info(f'Logging initialised — level={LOG_LEVEL} format={LOG_FORMAT}')

    return root

# Convenience logger for use across the app
logger = logging.getLogger(APP_NAME)
