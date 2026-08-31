# FILE: backend/config.py
# eLogix HRMS — Application Configuration
# All settings read from environment variables with safe defaults
# eLogix Technologies · www.elogix.com.np

import os
from datetime import timedelta


class Config:
    """Base configuration — all envs inherit from this."""

    # ── Core ──────────────────────────────────────────────────────────
    SECRET_KEY              = os.getenv('SECRET_KEY', 'change-me-in-production-use-32-chars')
    PRODUCT_VERSION         = os.getenv('PRODUCT_VERSION', '3.0.0')
    PRODUCT_NAME            = 'eLogix HRMS'
    COMPANY_NAME            = 'eLogix Technologies'
    SUPPORT_EMAIL           = os.getenv('SUPPORT_EMAIL', 'support@elogix.com.np')

    # ── Database ──────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:postgres@elogix_db:5432/postgres'
    ).replace('postgres://', 'postgresql://', 1)   # fix Heroku-style URLs

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size'    : int(os.getenv('DB_POOL_SIZE',    '10')),
        'max_overflow' : int(os.getenv('DB_MAX_OVERFLOW', '20')),
        'pool_recycle' : int(os.getenv('DB_POOL_RECYCLE', '300')),
        'pool_pre_ping': True,
    }

    # ── Redis ─────────────────────────────────────────────────────────
    REDIS_URL               = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_BROKER_URL       = os.getenv('CELERY_BROKER_URL', REDIS_URL)
    CELERY_RESULT_BACKEND   = os.getenv('CELERY_RESULT_BACKEND', REDIS_URL)

    # ── JWT ───────────────────────────────────────────────────────────
    JWT_SECRET_KEY          = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=int(os.getenv('JWT_ACCESS_HOURS', '8')))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', '30')))
    JWT_ALGORITHM           = 'HS256'

    # ── eLogix SaaS Admin ─────────────────────────────────────────────
    ELOGIX_ADMIN_KEY        = os.getenv('ELOGIX_ADMIN_KEY', 'elogix-admin-2026')

    # ── CORS ──────────────────────────────────────────────────────────
    CORS_ORIGINS = [
        o.strip() for o in os.getenv(
            'CORS_ORIGINS',
            'http://localhost:5173,https://elogix.com.np,https://elogix.ktm.yetiappcloud.com'
        ).split(',')
    ]

    # ── File Storage ──────────────────────────────────────────────────
    MAX_CONTENT_LENGTH      = int(os.getenv('MAX_UPLOAD_MB', '50')) * 1024 * 1024
    UPLOAD_FOLDER           = os.getenv('UPLOAD_FOLDER', '/opt/elogix/uploads')
    ALLOWED_EXTENSIONS      = {'pdf','doc','docx','xls','xlsx','png','jpg','jpeg','csv'}
    STORAGE_BACKEND         = os.getenv('STORAGE_BACKEND', 'local')  # local | s3 | gcs

    # ── Email ─────────────────────────────────────────────────────────
    MAIL_SERVER             = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT               = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS            = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME           = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD           = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER     = os.getenv('MAIL_SENDER', 'noreply@elogix.com.np')

    # ── Rate Limiting ─────────────────────────────────────────────────
    RATELIMIT_DEFAULT       = os.getenv('RATELIMIT_DEFAULT', '200 per hour')
    RATELIMIT_AUTH          = os.getenv('RATELIMIT_AUTH',    '20 per minute')
    RATELIMIT_API           = os.getenv('RATELIMIT_API',     '500 per hour')
    RATELIMIT_STORAGE_URL   = REDIS_URL

    # ── Pagination ────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE       = int(os.getenv('DEFAULT_PAGE_SIZE', '20'))
    MAX_PAGE_SIZE           = int(os.getenv('MAX_PAGE_SIZE', '200'))

    # ── AI ────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY       = os.getenv('ANTHROPIC_API_KEY', '')
    OPENAI_API_KEY          = os.getenv('OPENAI_API_KEY', '')
    AI_MODEL                = os.getenv('AI_MODEL', 'claude-sonnet-4-6')
    AI_MAX_TOKENS           = int(os.getenv('AI_MAX_TOKENS', '2000'))

    # ── Nepal-specific ────────────────────────────────────────────────
    DEFAULT_CURRENCY        = 'NPR'
    DEFAULT_TIMEZONE        = 'Asia/Kathmandu'
    DEFAULT_LANGUAGE        = 'en'
    FISCAL_YEAR_START_MONTH = 4   # Nepali fiscal year starts Shrawan (≈ July/Aug)
    SSF_RATE_EMPLOYER       = Decimal('20')   if False else 0.20   # 20%
    SSF_RATE_EMPLOYEE       = 0.11            # 11%
    PF_RATE_EMPLOYER        = 0.10            # 10%
    PF_RATE_EMPLOYEE        = 0.10            # 10%


class DevelopmentConfig(Config):
    DEBUG                   = True
    SQLALCHEMY_ECHO         = False   # set True to log SQL
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)   # longer for dev


class ProductionConfig(Config):
    DEBUG                   = False
    SESSION_COOKIE_SECURE   = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    PREFERRED_URL_SCHEME    = 'https'

    # Stricter rate limits in production
    RATELIMIT_AUTH          = '10 per minute'


class TestingConfig(Config):
    TESTING                 = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    WTF_CSRF_ENABLED        = False


# ── Config factory ────────────────────────────────────────────────────
CONFIG_MAP = {
    'development': DevelopmentConfig,
    'production' : ProductionConfig,
    'testing'    : TestingConfig,
    'default'    : DevelopmentConfig,
}

def get_config():
    env = os.getenv('FLASK_ENV', os.getenv('APP_ENV', 'production'))
    return CONFIG_MAP.get(env, ProductionConfig)
