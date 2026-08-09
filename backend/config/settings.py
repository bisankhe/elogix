"""
FILE: backend/config/settings.py
eLogix HRMS — Environment-based configuration
eLogix Technologies · www.elogix.com.np
"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class BaseConfig:
    # ── eLogix Identity ──────────────────────────────────────
    APP_NAME            = "eLogix HRMS"
    BRAND               = "eLogix"
    COMPANY             = "eLogix Technologies"
    WEBSITE             = "https://www.elogix.com.np"
    VERSION             = "2.0.0"

    # ── Security ─────────────────────────────────────────────
    SECRET_KEY          = os.getenv("SECRET_KEY", "elogix-dev-secret-change-in-prod")
    JWT_SECRET_KEY      = os.getenv("JWT_SECRET_KEY", "elogix-jwt-secret-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 480)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 30)))
    BCRYPT_ROUNDS       = int(os.getenv("BCRYPT_ROUNDS", 12))

    # ── Database ─────────────────────────────────────────────
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", 300)),
    }

    # ── Cache ────────────────────────────────────────────────
    CACHE_TYPE              = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT   = 300

    # ── eLogix AI (Claude) ────────────────────────────────────
    ANTHROPIC_API_KEY   = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL     = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    AI_MAX_TOKENS       = int(os.getenv("AI_MAX_TOKENS", 2000))
    AI_TIMEOUT          = int(os.getenv("AI_TIMEOUT_SECONDS", 30))

    # ── File Storage ─────────────────────────────────────────
    STORAGE_BACKEND     = os.getenv("STORAGE_BACKEND", "local")
    MINIO_ENDPOINT      = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY    = os.getenv("MINIO_ACCESS_KEY", "")
    MINIO_SECRET_KEY    = os.getenv("MINIO_SECRET_KEY", "")
    MINIO_BUCKET        = os.getenv("MINIO_BUCKET", "elogix-hrms-files")
    MINIO_SECURE        = os.getenv("MINIO_SECURE", "False").lower() == "true"
    MAX_UPLOAD_SIZE_MB  = int(os.getenv("MAX_UPLOAD_SIZE_MB", 25))
    LOCAL_STORAGE_PATH  = os.getenv("LOCAL_STORAGE_PATH", "/tmp/elogix-uploads")

    # ── Email ────────────────────────────────────────────────
    SENDGRID_API_KEY    = os.getenv("SENDGRID_API_KEY", "")
    FROM_EMAIL          = os.getenv("FROM_EMAIL", "hr@elogix.com.np")
    FROM_NAME           = os.getenv("FROM_NAME", "eLogix HRMS")
    SUPPORT_EMAIL       = os.getenv("SUPPORT_EMAIL", "support@elogix.com.np")

    # ── WhatsApp ─────────────────────────────────────────────
    WHATSAPP_ACCESS_TOKEN    = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")

    # ── SMS (Sparrow — Nepal) ─────────────────────────────────
    SPARROW_TOKEN       = os.getenv("SPARROW_TOKEN", "")
    SPARROW_FROM        = os.getenv("SPARROW_FROM", "eLogix")

    # ── SaaS Multi-Tenant ────────────────────────────────────
    SAAS_MODE           = os.getenv("SAAS_MODE", "True").lower() == "true"
    SAAS_DOMAIN         = os.getenv("SAAS_DOMAIN", "elogix.com.np")
    TENANT_ISOLATION    = os.getenv("TENANT_ISOLATION", "schema")
    TENANT_HEADER       = os.getenv("TENANT_HEADER", "X-Tenant-Id")
    SUPERADMIN_EMAIL    = os.getenv("SUPERADMIN_EMAIL", "admin@elogix.com.np")

    # ── Nepal Labour Act 2074 Defaults ───────────────────────
    DEFAULT_CURRENCY    = "NPR"
    DEFAULT_TIMEZONE    = "Asia/Kathmandu"
    MIN_WAGE_NPR        = int(os.getenv("MIN_WAGE_NPR", 15000))
    SSF_EMPLOYEE_RATE   = float(os.getenv("SSF_EMPLOYEE_RATE", 0.11))
    SSF_EMPLOYER_RATE   = float(os.getenv("SSF_EMPLOYER_RATE", 0.20))
    CIT_RATE            = float(os.getenv("CIT_RATE", 0.25))
    ANNUAL_LEAVE_DAYS   = int(os.getenv("ANNUAL_LEAVE_DAYS", 18))
    SICK_LEAVE_DAYS     = int(os.getenv("SICK_LEAVE_DAYS", 12))
    FESTIVAL_LEAVE_DAYS = int(os.getenv("FESTIVAL_LEAVE_DAYS", 13))
    MATERNITY_LEAVE_DAYS= int(os.getenv("MATERNITY_LEAVE_DAYS", 98))
    PROBATION_MAX_MONTHS= int(os.getenv("PROBATION_MAX_MONTHS", 6))
    MAX_OVERTIME_HRS_WEEK = 24  # Labour Act 2074 limit

    # ── Rate Limiting ────────────────────────────────────────
    RATELIMIT_DEFAULT   = os.getenv("RATE_LIMIT_DEFAULT", "200 per minute")
    RATELIMIT_STORAGE_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # ── Logging ──────────────────────────────────────────────
    LOG_LEVEL           = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR             = os.getenv("LOG_DIR", "/var/log/elogix")

class DevelopmentConfig(BaseConfig):
    DEBUG               = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://elogix_user:elogix_dev@localhost:5432/elogix_hrms_dev"
    )
    CACHE_TYPE          = "SimpleCache"
    STORAGE_BACKEND     = "local"

class ProductionConfig(BaseConfig):
    DEBUG               = False
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    CACHE_TYPE          = "RedisCache"
    CACHE_REDIS_URL     = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size":     int(os.getenv("DB_POOL_SIZE", 20)),
        "pool_recycle":  int(os.getenv("DB_POOL_RECYCLE", 300)),
        "pool_pre_ping": True,
        "max_overflow":  int(os.getenv("DB_MAX_OVERFLOW", 40)),
    }
    STORAGE_BACKEND     = os.getenv("STORAGE_BACKEND", "minio")

class TestingConfig(BaseConfig):
    TESTING             = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    CACHE_TYPE          = "SimpleCache"
    STORAGE_BACKEND     = "local"
    BCRYPT_ROUNDS       = 4  # faster tests

config = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "testing":     TestingConfig,
}
