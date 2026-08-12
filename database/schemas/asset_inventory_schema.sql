-- ================================================================
-- FILE: database/schemas/asset_inventory_schema.sql
-- eLogix HRMS -- Finance, Assets & Administration > Asset & Inventory
-- (9 pages: Asset Management, IT Inventory, Furniture Inventory,
-- Stationery Inventory, Asset Allocation, Asset Return, QR or Barcode
-- Tracking, Warranty Tracking, Vendor Management)
--
-- Design note: this is the FIRST genuine asset catalog anywhere in
-- the build. The EXISTING asset_allocations (employee_joining_schema,
-- onboarding logistics: shipping preferences, signed receipt) tracks
-- the LOGISTICS EVENT of a new hire's initial setup -- it never
-- referenced a specific serialized item. asset_items is the actual
-- inventory catalog; asset_allocations is EXTENDED via ALTER TABLE to
-- optionally link to a specific asset_items row, rather than rebuilt.
--
-- The EXISTING "Vendor Management" sidebar group (15 entries) covers
-- staffing/outsourcing agencies supplying contract WORKERS --
-- procurement_vendors here is a genuinely different relationship
-- (companies supplying hardware/furniture/stationery), intentionally
-- never merged with that table.
--
-- QR codes follow the SAME verify_qr_code pattern already proven on
-- lms_certifications (Certificate Generation session) -- not a new
-- invention, a consistent convention applied to a new domain.
--
--   - asset_items (the genuine catalog -- IT/furniture/stationery via
--     a category column, never three separate tables)
--   - stationery_stock_levels (consumables -- quantity, not serialized)
--   - asset_scan_log (QR/barcode scan audit trail)
--   - procurement_vendors + procurement_orders (the RFQ -> Received kanban)
--   - (ALTER) asset_allocations: add optional asset_item_id link
--
-- Nepal legal grounding: occupational safety (functional, safe
-- equipment indirectly mandates maintenance tracking); PPE allocation
-- requires systematic tracking; unreturned company property may be
-- legally recovered from final salary with due process (Asset Return
-- links directly to the existing final-settlement flow); warranty/
-- service-log tracking supports the statutory duty to repair or
-- replace defective equipment; vendor due-diligence extends to
-- verifying any outsourced labor's safety-gear compliance.
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- THE CORE NEW CATALOG: serves Pages 1, 2, 3, 5, 6, 7, 8
-- ================================================================
CREATE TABLE IF NOT EXISTS asset_items (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    asset_tag                 VARCHAR(30) UNIQUE NOT NULL,  -- e.g. IT-LT-0042, FUR-CH-0203
    category                      VARCHAR(20) NOT NULL CHECK (category IN ('it_equipment','furniture')),
    item_name                         VARCHAR(200) NOT NULL,
    serial_number                        VARCHAR(100),

    status                                   VARCHAR(20) DEFAULT 'available'
                                             CHECK (status IN ('available','assigned','repair','retired')),
    condition_notes                              TEXT,
    location_label                                   VARCHAR(200),  -- e.g. 'IT Floor 3 -- Desk 14', 'Storage Room B'

    purchase_value_npr                                   NUMERIC(12,2),
    vendor_id                                                UUID,  -- references procurement_vendors, FK added after that table exists
    warranty_until                                               DATE,

    verify_qr_code                                                   VARCHAR(100) UNIQUE,
    last_scanned_at                                                      TIMESTAMPTZ,  -- feeds the "ghost asset" detection

    currently_assigned_to_employee_id                                        UUID REFERENCES employees(id),

    created_at                                                                   TIMESTAMPTZ DEFAULT NOW(),
    is_deleted                                                                       BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- PAGE 4: STATIONERY INVENTORY -- consumables, never individually
-- serialized, a genuinely different shape from asset_items
-- ================================================================
CREATE TABLE IF NOT EXISTS stationery_stock_levels (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    item_name                 VARCHAR(150) NOT NULL,
    unit_label                    VARCHAR(20) NOT NULL,  -- reams, pcs, pads, cartridges

    quantity_on_hand                  INT NOT NULL DEFAULT 0,
    reorder_threshold                     INT NOT NULL DEFAULT 50,

    last_restocked_at                         TIMESTAMPTZ,
    UNIQUE (company_id, item_name)
);

CREATE TABLE IF NOT EXISTS stationery_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id            UUID NOT NULL REFERENCES employees(id),
    stationery_stock_level_id UUID NOT NULL REFERENCES stationery_stock_levels(id),
    quantity_requested        INT NOT NULL,
    status                        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','fulfilled')),
    requested_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 7: QR OR BARCODE TRACKING -- the scan audit trail
-- ================================================================
CREATE TABLE IF NOT EXISTS asset_scan_log (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    asset_item_id             UUID       NOT NULL REFERENCES asset_items(id),

    scan_action                   VARCHAR(30) NOT NULL,  -- audit_verification, location_update, repair_checkin, return_confirmation
    scanned_by_employee_id            UUID NOT NULL,
    scan_location_label                   VARCHAR(200),  -- geo-tag / location label at time of scan

    scanned_at                                TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 9: VENDOR MANAGEMENT -- procurement vendors, genuinely
-- distinct from the staffing/outsourcing vendor tables elsewhere
-- ================================================================
CREATE TABLE IF NOT EXISTS procurement_vendors (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    vendor_name                 VARCHAR(200) NOT NULL,
    supplies_category               VARCHAR(20) CHECK (supplies_category IN ('it_equipment','furniture','stationery')),
    contact_info                        TEXT
);

ALTER TABLE asset_items ADD CONSTRAINT fk_asset_items_vendor
    FOREIGN KEY (vendor_id) REFERENCES procurement_vendors(id);

CREATE TABLE IF NOT EXISTS procurement_orders (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    procurement_vendor_id     UUID       NOT NULL REFERENCES procurement_vendors(id),

    order_description             TEXT NOT NULL,
    order_value_npr                   NUMERIC(12,2),

    stage                                 VARCHAR(20) DEFAULT 'rfq' CHECK (stage IN ('rfq','order_placed','in_transit','received')),
    rfq_sent_at                               TIMESTAMPTZ DEFAULT NOW(),
    received_at                                   TIMESTAMPTZ
);

-- ================================================================
-- EXTEND the EXISTING asset_allocations (employee_joining_schema) --
-- optional link to a specific catalog item, never a rebuild
-- ================================================================
ALTER TABLE asset_allocations ADD COLUMN IF NOT EXISTS asset_item_id UUID REFERENCES asset_items(id);
ALTER TABLE asset_allocations ADD COLUMN IF NOT EXISTS acknowledgment_reminder_sent_at TIMESTAMPTZ;

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ai_category       ON asset_items(category);
CREATE INDEX IF NOT EXISTS idx_ai_status              ON asset_items(status);
CREATE INDEX IF NOT EXISTS idx_ai_warranty                ON asset_items(warranty_until) WHERE status != 'retired';
CREATE INDEX IF NOT EXISTS idx_ai_assigned_employee           ON asset_items(currently_assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS idx_ai_ghost_candidate                 ON asset_items(last_scanned_at) WHERE status != 'retired';
CREATE INDEX IF NOT EXISTS idx_ssl_low_stock                          ON stationery_stock_levels(quantity_on_hand, reorder_threshold);
CREATE INDEX IF NOT EXISTS idx_asl_asset                                  ON asset_scan_log(asset_item_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_po_stage                                       ON procurement_orders(stage) WHERE stage != 'received';

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-generate a QR code the moment an asset enters the catalog --
-- the same convention as lms_certifications.verify_qr_code
CREATE OR REPLACE FUNCTION fn_generate_asset_qr()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.verify_qr_code := 'ASSET-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_generate_qr
    BEFORE INSERT ON asset_items
    FOR EACH ROW EXECUTE FUNCTION fn_generate_asset_qr();

-- Every scan updates last_scanned_at (closing the "ghost asset" gap)
-- and notifies the currently assigned employee + their manager if
-- the action is a repair_checkin or return_confirmation
CREATE OR REPLACE FUNCTION fn_process_asset_scan()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE asset_employee_id UUID; mgr_id UUID;
BEGIN
    UPDATE asset_items SET last_scanned_at = NEW.scanned_at,
        location_label = COALESCE(NEW.scan_location_label, location_label)
    WHERE id = NEW.asset_item_id
    RETURNING currently_assigned_to_employee_id INTO asset_employee_id;

    IF NEW.scan_action IN ('repair_checkin','return_confirmation') AND asset_employee_id IS NOT NULL THEN
        SELECT manager_id INTO mgr_id FROM employees WHERE id = asset_employee_id;
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'asset_scan_log', NEW.id, 'asset_scan_event', asset_employee_id, 'direct_party',
           format('Asset scan recorded: %s', NEW.scan_action), NOW());
        IF mgr_id IS NOT NULL THEN
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'asset_scan_log', NEW.id, 'asset_scan_event', mgr_id, 'reporting_manager',
               format('Asset belonging to your direct report was scanned: %s', NEW.scan_action), NOW());
        END IF;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_process_scan
    AFTER INSERT ON asset_scan_log
    FOR EACH ROW EXECUTE FUNCTION fn_process_asset_scan();

-- Auto-generate a stationery purchase request to procurement when
-- quantity drops below the reorder threshold
CREATE OR REPLACE FUNCTION fn_check_stationery_reorder()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE facilities_admin RECORD;
BEGIN
    IF NEW.quantity_on_hand < NEW.reorder_threshold AND (OLD.quantity_on_hand IS NULL OR OLD.quantity_on_hand >= NEW.reorder_threshold) THEN
        FOR facilities_admin IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'stationery_stock_levels', NEW.id, 'reorder_threshold_crossed', facilities_admin.id, 'direct_party',
               format('"%s" has dropped below reorder threshold (%s remaining).', NEW.item_name, NEW.quantity_on_hand), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_stationery_reorder
    AFTER INSERT OR UPDATE OF quantity_on_hand ON stationery_stock_levels
    FOR EACH ROW EXECUTE FUNCTION fn_check_stationery_reorder();

-- On allocation: mark the asset_items row as assigned; notify both
-- employee and manager
CREATE OR REPLACE FUNCTION fn_sync_allocation_to_catalog()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE emp_id UUID; mgr_id UUID;
BEGIN
    IF NEW.asset_item_id IS NOT NULL AND (OLD.asset_item_id IS NULL OR OLD.asset_item_id != NEW.asset_item_id) THEN
        SELECT employee_id INTO emp_id FROM employee_enrollments WHERE id = NEW.enrollment_id;
        UPDATE asset_items SET status = 'assigned', currently_assigned_to_employee_id = emp_id WHERE id = NEW.asset_item_id;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_sync_allocation
    AFTER UPDATE OF asset_item_id ON asset_allocations
    FOR EACH ROW EXECUTE FUNCTION fn_sync_allocation_to_catalog();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Asset Management -- category rollup with value and allocation %
CREATE OR REPLACE VIEW v_asset_category_rollup AS
SELECT category, COUNT(*) AS item_count, SUM(purchase_value_npr) AS total_value_npr,
    ROUND(COUNT(*) FILTER (WHERE status = 'assigned')::NUMERIC / NULLIF(COUNT(*),0) * 100, 1) AS allocated_pct,
    company_id
FROM asset_items
WHERE NOT is_deleted
GROUP BY category, company_id;

-- "Ghost asset" candidates -- unscanned for 180+ days
CREATE OR REPLACE VIEW v_ghost_asset_candidates AS
SELECT * FROM asset_items
WHERE status != 'retired' AND NOT is_deleted
  AND (last_scanned_at IS NULL OR last_scanned_at < NOW() - INTERVAL '180 days');

-- Pages 2 & 3: IT / Furniture Inventory, filtered by category in the WHERE clause at query time
CREATE OR REPLACE VIEW v_asset_inventory_detail AS
SELECT ai.*, e.first_name AS assigned_first_name, e.last_name AS assigned_last_name, pv.vendor_name
FROM asset_items ai
LEFT JOIN employees e ON ai.currently_assigned_to_employee_id = e.id
LEFT JOIN procurement_vendors pv ON ai.vendor_id = pv.id
WHERE NOT ai.is_deleted;

-- Page 4: Stationery dashboard
CREATE OR REPLACE VIEW v_stationery_dashboard AS
SELECT *, (quantity_on_hand < reorder_threshold) AS below_threshold FROM stationery_stock_levels;

-- Page 8: Warranty tracking with computed days-remaining tiers
CREATE OR REPLACE VIEW v_warranty_tracking AS
SELECT ai.*, pv.vendor_name,
    (warranty_until - CURRENT_DATE) AS days_left,
    CASE
        WHEN warranty_until < CURRENT_DATE THEN 'expired'
        WHEN warranty_until - CURRENT_DATE <= 30 THEN 'critical'
        WHEN warranty_until - CURRENT_DATE <= 90 THEN 'warning'
        ELSE 'healthy'
    END AS tier
FROM asset_items ai
LEFT JOIN procurement_vendors pv ON ai.vendor_id = pv.id
WHERE ai.warranty_until IS NOT NULL AND NOT ai.is_deleted;

-- Page 9: Vendor + order dashboard
CREATE OR REPLACE VIEW v_procurement_vendor_dashboard AS
SELECT pv.*,
    (SELECT jsonb_agg(jsonb_build_object('description', po.order_description, 'value', po.order_value_npr, 'stage', po.stage))
       FROM procurement_orders po WHERE po.procurement_vendor_id = pv.id) AS orders
FROM procurement_vendors pv;
