"""
FILE: backend/models/tenant_integration_models.py
eLogix HRMS — Per-Tenant Integration Models
Each tenant configures their own biometric devices, job portals,
accounting software, payment gateways, and communication tools.
ALL credentials are encrypted at rest and isolated by company_id.
eLogix Technologies · www.elogix.com.np
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from ..extensions import db

Base = db.Model


class TenantBiometricDevice(Base):
    """Per-tenant biometric device configuration."""
    __tablename__ = 'tenant_biometric_devices'

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id  = Column(UUID(as_uuid=True), nullable=False, index=True)  # TENANT ISOLATION

    # Device identity
    device_name = Column(String(100), nullable=False)   # "Main Gate", "Floor 2"
    device_type = Column(String(50),  nullable=False)   # 'zkteco'|'suprema'|'realtime'|'faceid'|'gps'|'qr'
    model       = Column(String(100))                   # "ZKTeco ZK9500", "Suprema BioStation"
    serial_no   = Column(String(100))
    location    = Column(String(200))                   # "Head Office - Ground Floor"
    branch_id   = Column(UUID(as_uuid=True))            # which branch this device belongs to

    # Connection config (encrypted)
    device_ip   = Column(String(50))                    # 192.168.1.100
    device_port = Column(Integer, default=4370)
    api_url     = Column(String(500))                   # for cloud biometric APIs
    api_key_enc = Column(Text)                          # encrypted API key
    username    = Column(String(100))
    password_enc= Column(Text)                          # encrypted password
    comm_key    = Column(String(50))                    # ZKTeco communication key

    # Sync settings
    sync_interval_min = Column(Integer, default=5)      # how often to pull data
    last_sync_at      = Column(DateTime)
    last_sync_status  = Column(String(20), default='pending')  # ok|error|timeout
    last_sync_count   = Column(Integer, default=0)
    last_error        = Column(Text)

    # Status
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.Index('ix_biometric_company', 'company_id', 'is_active'),
    )


class TenantPlatformCredential(Base):
    """
    Per-tenant API credentials for external platforms.
    One row per tenant per platform (job portals, accounting, payment, etc.)
    Credentials are encrypted at rest.
    """
    __tablename__ = 'tenant_platform_credentials'

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id  = Column(UUID(as_uuid=True), nullable=False, index=True)  # TENANT ISOLATION

    # Platform identity
    platform_id    = Column(String(50), nullable=False)   # 'merojob'|'linkedin'|'tally'|'esewa'|...
    platform_group = Column(String(50))                   # 'job_portal'|'accounting'|'payment'|'biometric'
    platform_label = Column(String(100))                  # display name

    # Connection credentials (all encrypted)
    api_key_enc    = Column(Text)
    api_secret_enc = Column(Text)
    access_token_enc = Column(Text)
    refresh_token_enc= Column(Text)
    username       = Column(String(200))
    webhook_url    = Column(String(500))
    custom_config  = Column(JSON, default=dict)         # platform-specific settings

    # Token lifecycle
    token_expires_at = Column(DateTime)
    is_connected   = Column(Boolean, default=False)
    connected_at   = Column(DateTime)
    last_tested_at = Column(DateTime)
    last_test_ok   = Column(Boolean)
    last_error     = Column(Text)

    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('company_id', 'platform_id', name='uq_tenant_platform'),
        db.Index('ix_platform_company', 'company_id', 'is_connected'),
    )


class TenantAttendancePunchLog(Base):
    """
    Raw punch logs from biometric devices, GPS, or manual.
    Tenant-isolated. Processed into daily_attendance_records by cron.
    """
    __tablename__ = 'tenant_attendance_punch_logs'

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id  = Column(UUID(as_uuid=True), nullable=False, index=True)  # TENANT ISOLATION
    device_id   = Column(UUID(as_uuid=True))            # which device
    employee_id = Column(String(30), nullable=False)
    punch_time  = Column(DateTime, nullable=False)
    punch_type  = Column(String(10))                    # 'IN'|'OUT'|'BREAK'|'RETURN'
    source      = Column(String(20), default='biometric') # 'biometric'|'gps'|'manual'|'qr'|'mobile'
    latitude    = Column(db.Float)
    longitude   = Column(db.Float)
    device_raw  = Column(JSON)                          # raw payload from device
    processed   = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('ix_punch_company_date', 'company_id', 'punch_time'),
        db.Index('ix_punch_employee', 'company_id', 'employee_id', 'punch_time'),
    )
