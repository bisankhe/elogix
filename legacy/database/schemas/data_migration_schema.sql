-- ================================================================
-- FILE: database/schemas/data_migration_schema.sql
-- eLogix HRMS -- System Administration > Operations > Data Migration
--
-- Platform-operator (super_admin) tooling: operates BEFORE a tenant
-- fully exists, to pull a new client's entire HRIS dataset out of a
-- competitor system, validate it in staging, and promote it into a
-- brand-new company_id once a human signs off. Every other table in
-- this build scopes to an EXISTING company_id. This module creates
-- and populates a new company_id. The staging design means nothing
-- ever touches a live tenant during migration work.
--
--   - data_migration_jobs (NEW)
--   - migration_staging_rows (NEW)
--   - migration_field_mappings (NEW)
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS data_migration_jobs (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name                VARCHAR(200) NOT NULL,
    source_system                  VARCHAR(100) NOT NULL,
    module                             VARCHAR(100) NOT NULL,
    target_company_id                      UUID REFERENCES companies(id),

    status                                     VARCHAR(20) DEFAULT 'staged'
                                               CHECK (status IN ('staged','validated','promoted','failed')),
    rows_total                                     INT DEFAULT 0,
    rows_clean                                         INT DEFAULT 0,
    rows_flagged                                           INT DEFAULT 0,

    promoted_by                                                UUID REFERENCES employees(id),
    promoted_at                                                    TIMESTAMPTZ,
    created_at                                                         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_staging_rows (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_job_id          UUID       NOT NULL REFERENCES data_migration_jobs(id),
    row_number                    INT NOT NULL,
    raw_data                          JSONB NOT NULL,
    mapped_data                           JSONB,
    is_flagged                                BOOLEAN DEFAULT FALSE,
    flag_reasons                                  TEXT[],
    resolved                                          BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_msr_job ON migration_staging_rows(migration_job_id);
CREATE INDEX IF NOT EXISTS idx_msr_flagged ON migration_staging_rows(is_flagged) WHERE is_flagged AND NOT resolved;

CREATE TABLE IF NOT EXISTS migration_field_mappings (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_job_id          UUID       NOT NULL REFERENCES data_migration_jobs(id),
    source_field                  VARCHAR(150) NOT NULL,
    target_field                      VARCHAR(150) NOT NULL,
    confidence                            VARCHAR(10) DEFAULT 'high' CHECK (confidence IN ('high','medium','low')),
    requires_manual_review                    BOOLEAN DEFAULT FALSE,
    UNIQUE (migration_job_id, source_field)
);
