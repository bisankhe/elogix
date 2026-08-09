-- ============================================================
-- FILE: database/schemas/branch_location_schema.sql
-- NepHR Pro — Branch & Location Setup Schema
-- Covers: branches table with Nepal Labour Act 2074 labour zones
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS branches (
    id                      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              UUID         NOT NULL,
    parent_branch_id        UUID         REFERENCES branches(id),
    code                    VARCHAR(20)  NOT NULL,
    name                    VARCHAR(200) NOT NULL,
    name_nepali             VARCHAR(200),
    branch_type             VARCHAR(30)  DEFAULT 'branch'
                            CHECK (branch_type IN (
                              'headquarters','regional','branch',
                              'liaison','project_office','warehouse')),
    is_headquarters         BOOLEAN      DEFAULT FALSE,
    -- Nepal Location
    province                VARCHAR(100),
    district                VARCHAR(100),
    municipality            VARCHAR(100),
    ward_no                 VARCHAR(10),
    street_address          TEXT,
    postal_code             VARCHAR(20),
    latitude                FLOAT,
    longitude               FLOAT,
    google_maps_url         VARCHAR(500),
    -- Nepal Labour Act 2074 — each branch reports to its own Labour Office
    labour_office_zone      VARCHAR(100),
    labour_office_address   TEXT,
    local_registration_no   VARCHAR(100),
    local_pan_no            VARCHAR(20),
    -- Operations
    phone                   VARCHAR(50),
    email                   VARCHAR(255),
    manager_id              UUID,
    employee_count          INT          DEFAULT 0  CHECK (employee_count >= 0),
    floor_area_sqft         FLOAT,
    capacity                INT,
    established_date        DATE,
    status                  VARCHAR(20)  DEFAULT 'active',
    ai_branch_insights      JSONB        DEFAULT '{}',
    -- Audit
    created_at              TIMESTAMPTZ  DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  DEFAULT NOW(),
    created_by              UUID,
    is_deleted              BOOLEAN      DEFAULT FALSE,
    ai_metadata             JSONB        DEFAULT '{}',
    UNIQUE (company_id, code)
);

-- Nepal's 7 Labour Office Zones — reference data
CREATE TABLE IF NOT EXISTS nepal_labour_zones (
    id              SERIAL       PRIMARY KEY,
    zone_code       VARCHAR(10)  NOT NULL UNIQUE,
    zone_name       VARCHAR(100) NOT NULL,
    office_address  TEXT,
    phone           VARCHAR(50),
    email           VARCHAR(100),
    provinces_covered TEXT[]
);

INSERT INTO nepal_labour_zones (zone_code, zone_name, office_address, provinces_covered)
VALUES
    ('LO-KTM',  'Kathmandu Labour Office',      'Thamel, Kathmandu',       ARRAY['Bagmati Province']),
    ('LO-PKR',  'Pokhara Labour Office',         'Lakeside, Pokhara',       ARRAY['Gandaki Province']),
    ('LO-BRT',  'Bharatpur Labour Office',       'Bharatpur, Chitwan',      ARRAY['Bagmati Province','Narayani Zone']),
    ('LO-BRT2', 'Birgunj Labour Office',         'Birgunj, Parsa',          ARRAY['Madhesh Province']),
    ('LO-DHR',  'Dhangadhi Labour Office',       'Dhangadhi, Kailali',      ARRAY['Sudurpashchim Province']),
    ('LO-SHP',  'Surkhet Labour Office',         'Surkhet, Birendranagar',  ARRAY['Karnali Province']),
    ('LO-BTW',  'Butwal Labour Office',          'Butwal, Rupandehi',       ARRAY['Lumbini Province']),
    ('LO-BHR',  'Biratnagar Labour Office',      'Biratnagar, Morang',      ARRAY['Koshi Province'])
ON CONFLICT (zone_code) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_br_company   ON branches(company_id)      WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_br_type      ON branches(branch_type);
CREATE INDEX IF NOT EXISTS idx_br_province  ON branches(province);
CREATE INDEX IF NOT EXISTS idx_br_parent    ON branches(parent_branch_id) WHERE parent_branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_br_hq        ON branches(is_headquarters)  WHERE is_headquarters = TRUE;

-- Trigger
CREATE OR REPLACE FUNCTION fn_br_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;
CREATE TRIGGER trg_br_upd BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION fn_br_updated_at();

-- View: Branch summary per company
CREATE OR REPLACE VIEW v_branch_summary AS
SELECT
    b.code, b.name, b.branch_type, b.is_headquarters,
    b.province, b.district, b.municipality,
    b.labour_office_zone,
    b.employee_count,
    b.capacity,
    CASE WHEN b.capacity > 0
         THEN ROUND(b.employee_count::NUMERIC / b.capacity * 100, 1)
         ELSE 0 END AS occupancy_pct,
    b.status
FROM branches b
WHERE NOT b.is_deleted
ORDER BY b.is_headquarters DESC, b.name;
