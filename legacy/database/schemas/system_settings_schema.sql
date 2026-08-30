-- FILE: database/schemas/system_settings_schema.sql
-- System Administration > System Settings (8 pages)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Audit logs: append-only, never updated or deleted
CREATE TABLE IF NOT EXISTS audit_log (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id     UUID,
    actor_employee_id UUID REFERENCES employees(id),
    action         VARCHAR(50) NOT NULL,  -- CREATE UPDATE DELETE EXPORT LOGIN_FAIL etc.
    module         VARCHAR(100),
    detail         TEXT,
    before_value   JSONB,
    after_value    JSONB,
    source_ip      INET,
    severity       VARCHAR(10) DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_al_company ON audit_log(company_id, severity);
CREATE INDEX IF NOT EXISTS idx_al_ts ON audit_log(created_at DESC);

-- System-global settings: key-value with tenant override support
CREATE TABLE IF NOT EXISTS system_settings (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id     UUID,  -- NULL = global default; non-null = tenant override
    setting_key    VARCHAR(100) NOT NULL,
    setting_value  TEXT NOT NULL,
    updated_by     UUID REFERENCES employees(id),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, setting_key)
);

-- Backup registry
CREATE TABLE IF NOT EXISTS backup_registry (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id     UUID,
    backup_type    VARCHAR(20) DEFAULT 'automated' CHECK (backup_type IN ('automated','manual')),
    size_bytes     BIGINT,
    storage_region VARCHAR(50),
    status         VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success','failed','in_progress')),
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Device registry (MDM)
CREATE TABLE IF NOT EXISTS device_registry (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id     UUID NOT NULL,
    employee_id    UUID REFERENCES employees(id),
    device_name    VARCHAR(200),
    device_type    VARCHAR(30) CHECK (device_type IN ('laptop','mobile','kiosk','biometric','other')),
    serial_number  VARCHAR(100),
    mdm_enrolled   BOOLEAN DEFAULT FALSE,
    last_seen_at   TIMESTAMPTZ,
    status         VARCHAR(20) DEFAULT 'enrolled'
);

-- Audit log is append-only: block UPDATE and DELETE
CREATE OR REPLACE RULE no_update_audit AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit AS ON DELETE TO audit_log DO INSTEAD NOTHING;
