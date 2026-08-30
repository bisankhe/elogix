-- ============================================================
-- FILE: database/schemas/business_unit_schema.sql
-- eLogix HRMS — Business Unit / Division Setup Schema
-- Standalone dedicated schema for BU module
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS business_units (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID         NOT NULL,
    parent_bu_id        UUID         REFERENCES business_units(id) ON DELETE RESTRICT,
    code                VARCHAR(20)  NOT NULL,
    name                VARCHAR(200) NOT NULL,
    name_nepali         VARCHAR(200),
    description         TEXT,
    bu_type             VARCHAR(50)  DEFAULT 'business_unit'
                        CHECK (bu_type IN (
                          'business_unit','division','product_line',
                          'geographic_unit','profit_center','cost_center','project_unit')),
    is_profit_center    BOOLEAN      DEFAULT FALSE,
    revenue_target      NUMERIC(18,2),
    budget_allocated    NUMERIC(18,2) DEFAULT 0,
    budget_utilized     NUMERIC(18,2) DEFAULT 0,
    headcount_target    INT,
    headcount_actual    INT          DEFAULT 0,
    manager_id          UUID,
    established_date    DATE,
    status              VARCHAR(20)  DEFAULT 'active'
                        CHECK (status IN ('active','inactive','draft','archived')),
    -- AI
    ai_bu_score         FLOAT        CHECK (ai_bu_score BETWEEN 0 AND 100),
    ai_insights         JSONB        DEFAULT '{}',
    -- Audit
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  DEFAULT NOW(),
    created_by          UUID,
    updated_by          UUID,
    is_deleted          BOOLEAN      DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ,
    ai_metadata         JSONB        DEFAULT '{}',
    UNIQUE (company_id, code),
    CHECK (budget_utilized >= 0),
    CHECK (headcount_actual >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bunit_company ON business_units(company_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_bunit_parent  ON business_units(parent_bu_id);
CREATE INDEX IF NOT EXISTS idx_bunit_type    ON business_units(bu_type);
CREATE INDEX IF NOT EXISTS idx_bunit_status  ON business_units(status);

-- Trigger
CREATE OR REPLACE FUNCTION fn_bu_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;$$;
CREATE TRIGGER trg_bu_upd BEFORE UPDATE ON business_units FOR EACH ROW EXECUTE FUNCTION fn_bu_updated_at();

-- Trigger: auto-compute budget utilization %
CREATE OR REPLACE FUNCTION fn_bu_budget_alert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.budget_allocated > 0 AND
       (NEW.budget_utilized / NEW.budget_allocated) > 0.90 THEN
        NEW.ai_insights = jsonb_set(
            COALESCE(NEW.ai_insights, '{}'),
            '{budget_alert}',
            '"CRITICAL: Budget utilization > 90%"'
        );
    END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER trg_bu_budget BEFORE UPDATE OF budget_utilized ON business_units
    FOR EACH ROW EXECUTE FUNCTION fn_bu_budget_alert();

-- View: BU hierarchy tree
CREATE OR REPLACE VIEW v_bu_hierarchy AS
WITH RECURSIVE bu_tree AS (
    SELECT id, company_id, code, name, name_nepali, bu_type,
           parent_bu_id, is_profit_center,
           headcount_actual, headcount_target,
           budget_allocated, budget_utilized,
           0 AS depth,
           name AS path
    FROM business_units
    WHERE parent_bu_id IS NULL AND NOT is_deleted
    UNION ALL
    SELECT bu.id, bu.company_id, bu.code, bu.name, bu.name_nepali, bu.bu_type,
           bu.parent_bu_id, bu.is_profit_center,
           bu.headcount_actual, bu.headcount_target,
           bu.budget_allocated, bu.budget_utilized,
           bt.depth + 1,
           bt.path || ' > ' || bu.name
    FROM business_units bu
    JOIN bu_tree bt ON bu.parent_bu_id = bt.id
    WHERE NOT bu.is_deleted
)
SELECT *, ROUND(COALESCE(budget_utilized,0) / NULLIF(COALESCE(budget_allocated,0),0) * 100, 1)
          AS utilization_pct
FROM bu_tree
ORDER BY path;
