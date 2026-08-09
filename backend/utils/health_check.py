# FILE: backend/utils/health_check.py
# Deep health check — verifies DB, Redis, AI API, disk space
# Called by /api/health/deep (internal) and /api/health (public)
import os, time, psutil
from datetime import datetime, timezone

def check_database(db) -> dict:
    """Verify PostgreSQL connection and query performance."""
    try:
        start = time.time()
        db.session.execute(db.text('SELECT 1'))
        ms = round((time.time() - start) * 1000, 2)
        return {'status': 'ok', 'latency_ms': ms}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}

def check_redis() -> dict:
    """Verify Redis connection."""
    try:
        import redis as redis_lib
        r = redis_lib.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379/0'))
        start = time.time()
        r.ping()
        ms = round((time.time() - start) * 1000, 2)
        return {'status': 'ok', 'latency_ms': ms}
    except Exception as e:
        return {'status': 'unavailable', 'error': str(e)}

def check_ai_api() -> dict:
    """Verify Anthropic API key is configured (not a live call)."""
    key = os.getenv('ANTHROPIC_API_KEY', '')
    if key and key.startswith('sk-ant') and key != 'sk-ant-your-key-here':
        return {'status': 'configured', 'model': os.getenv('ANTHROPIC_MODEL', 'claude-sonnet-4-6')}
    return {'status': 'not_configured', 'note': 'Set ANTHROPIC_API_KEY in .env'}

def check_disk() -> dict:
    """Check disk usage on the data directory."""
    try:
        usage = psutil.disk_usage('/')
        pct   = usage.percent
        return {
            'status':      'ok' if pct < 85 else 'warning' if pct < 95 else 'critical',
            'used_pct':    pct,
            'free_gb':     round(usage.free / 1024**3, 2),
            'total_gb':    round(usage.total / 1024**3, 2),
        }
    except Exception as e:
        return {'status': 'unknown', 'error': str(e)}

def check_memory() -> dict:
    """Check system memory."""
    try:
        mem = psutil.virtual_memory()
        return {
            'status':    'ok' if mem.percent < 85 else 'warning',
            'used_pct':  mem.percent,
            'free_gb':   round(mem.available / 1024**3, 2),
        }
    except Exception as e:
        return {'status': 'unknown', 'error': str(e)}

def full_health_check(db=None) -> dict:
    """Run all checks and return combined status."""
    checks = {
        'redis':    check_redis(),
        'ai_api':   check_ai_api(),
        'disk':     check_disk(),
        'memory':   check_memory(),
    }
    if db:
        checks['database'] = check_database(db)

    # Overall status — worst of all individual statuses
    statuses = [v.get('status', 'unknown') for v in checks.values()]
    overall  = 'ok'
    if any(s == 'critical' for s in statuses): overall = 'critical'
    elif any(s == 'error'  for s in statuses): overall = 'degraded'
    elif any(s == 'warning' for s in statuses): overall = 'warning'

    return {
        'status':    overall,
        'app':       'NepHR Pro',
        'version':   '1.0.0',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'checks':    checks,
    }
