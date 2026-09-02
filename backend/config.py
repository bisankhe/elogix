# FILE: backend/config.py
# eLogix HRMS — Configuration
# Single source of truth for all settings.
# All values read from environment variables.
# eLogix Technologies · www.elogix.com.np

import os
from datetime import timedelta


class Config:
    SECRET_KEY                     = os.getenv('SECRET_KEY', 'elogix-change-in-production')
    JWT_SECRET_KEY                 = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES       = timedelta(hours=int(os.getenv('JWT_ACCESS_HOURS', '8')))
    JWT_REFRESH_TOKEN_EXPIRES      = timedelta(days=int(os.getenv('JWT_REFRESH_DAYS', '30')))

    SQLALCHEMY_DATABASE_URI        = os.getenv('DATABASE_URL',
        'postgresql://postgres:postgres@elogix_db:5432/postgres'
    ).replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS      = {
        'pool_size'    : int(os.getenv('DB_POOL_SIZE',    '10')),
        'max_overflow' : int(os.getenv('DB_MAX_OVERFLOW', '20')),
        'pool_recycle' : int(os.getenv('DB_POOL_RECYCLE', '300')),
        'pool_pre_ping': True,
    }

    REDIS_URL                 = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    ELOGIX_ADMIN_KEY          = os.getenv('ELOGIX_ADMIN_KEY', 'elogix-admin-2026')
    INTERNAL_KEY              = os.getenv('INTERNAL_KEY', ELOGIX_ADMIN_KEY)
    ANTHROPIC_API_KEY         = os.getenv('ANTHROPIC_API_KEY', '')
    MAX_CONTENT_LENGTH         = int(os.getenv('MAX_UPLOAD_MB', '50')) * 1024 * 1024
    CORS_ORIGINS               = [o.strip() for o in os.getenv(
        'CORS_ORIGINS',
        'http://localhost:5173,http://localhost:8080,https://elogix.com.np,https://elogix.ktm.yetiappcloud.com'
    ).split(',')]

    # Nepal compliance
    DEFAULT_CURRENCY           = 'NPR'
    DEFAULT_TIMEZONE           = 'Asia/Kathmandu'
    SSF_EMPLOYER_RATE          = 0.20
    SSF_EMPLOYEE_RATE          = 0.11
    PF_EMPLOYER_RATE           = 0.10
    PF_EMPLOYEE_RATE           = 0.10


class DevelopmentConfig(Config):
    DEBUG                      = True
    SQLALCHEMY_ECHO            = False
    JWT_ACCESS_TOKEN_EXPIRES   = timedelta(days=7)


class ProductionConfig(Config):
    DEBUG                      = False
    SESSION_COOKIE_SECURE      = True
    SESSION_COOKIE_HTTPONLY    = True


class TestingConfig(Config):
    TESTING                    = True
    SQLALCHEMY_DATABASE_URI    = 'sqlite:///:memory:'


CONFIG = {
    'development': DevelopmentConfig,
    'production' : ProductionConfig,
    'testing'    : TestingConfig,
    'default'    : DevelopmentConfig,
}

def get_config():
    env = os.getenv('FLASK_ENV', os.getenv('APP_ENV', 'production'))
    return CONFIG.get(env, ProductionConfig)
