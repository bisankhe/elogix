-- ================================================================
-- FILE: database/schemas/administrative_operations_schema.sql
-- NepHR Pro -- Finance, Assets & Administration > Administrative
-- Operations (11 pages: Visitor Management, Meeting Room Booking,
-- Minutes of Meeting, Travel Management, Transport Management,
-- Cafeteria Management, Helpdesk, Facility Management, Gate Pass
-- Management, ID Card Management, Event Management)
--
-- Design note: Minutes of Meeting reuses the EXISTING
-- meeting_minutes/meeting_action_items tables verbatim (built in the
-- MSS session) -- this section's sidebar entry just points the same
-- page at a different navigation location, never a duplicate feature.
--
-- Gate Pass and ID Card Management both extend the EXISTING universal
-- qr_codes registry (daily_attendance_schema -- already supports
-- employee_badge/asset/transaction/goods types) by adding a new
-- 'gate_pass' qr_type, rather than building a second QR system.
--
-- Helpdesk here (facility_tickets) is deliberately DISTINCT from
-- hr_helpdesk_tickets (HR policy/payroll queries, HR Helpdesk session)
-- -- this is broken-AC, leaking-pipe, IT-hardware territory, with its
-- own immediate-danger safety-stop trigger per the legal requirement.
--
-- Facility Management (floor occupancy/IoT sensors) is distinct from
-- the Asset & Inventory module (individual serialized items) --
-- genuinely different unit of tracking (floor space vs. discrete items).
--
--   - visitors + visitor_qr_passes
--   - meeting_rooms + meeting_room_bookings
--   - travel_requests
--   - shuttle_routes + shuttle_riders
--   - cafeteria_menu_items + cafeteria_preorders
--   - facility_tickets (the new, distinct Helpdesk)
--   - facility_floors (IoT occupancy/environment readings)
--   - (ALTER) qr_codes: add 'gate_pass' to the qr_type CHECK constraint
--   - gate_passes
--   - events + event_rsvps_admin
--
-- Nepal legal grounding: Section 70 (employer duty toward non-workers
-- -- visitor logs); Labour Rules 7.7/7.8 (15m³/person room threshold,
-- fatigue-prevention modifications); Section 37 (Daily Allowance per
-- bylaws), Section 86 (mandatory rest stops for long-haul drivers);
-- Section 33 (mandatory transport for female employees on shifts
-- outside daylight hours); Section 28 (30-min tiffin break after 5
-- continuous hours, paid); Chapter 20 (grievance protocols), immediate
-- safety-stop duty; Section 74 (Safety Committee for 20+ workers),
-- 55kg/45kg lifting caps; gate monitoring tied to 8h/day & 24h/week OT
-- caps, mandatory emergency fail-safe unlock; Section 9 (employee
-- record fields, outsourced-vs-direct flagging).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 1: VISITOR MANAGEMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS visitors (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    visitor_name               VARCHAR(200) NOT NULL,
    purpose                        TEXT NOT NULL,
    host_employee_id                   UUID NOT NULL REFERENCES employees(id),

    status                                 VARCHAR(20) DEFAULT 'pre_registered'
                                           CHECK (status IN ('pre_registered','checked_in','checked_out')),

    expected_at                                DATE,
    checked_in_at                                  TIMESTAMPTZ,
    checked_out_at                                     TIMESTAMPTZ,

    qr_codes_id                                            UUID,  -- links to the universal qr_codes registry (qr_type='gate_pass')
    created_at                                                 TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 2: MEETING ROOM BOOKING
-- ================================================================
CREATE TABLE IF NOT EXISTS meeting_rooms (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    room_name                  VARCHAR(100) NOT NULL,
    capacity                       INT NOT NULL,  -- the safe-occupancy ceiling for Rule 7.7
    has_av_equipment                  BOOLEAN DEFAULT FALSE,
    branch_id                              UUID
);

CREATE TABLE IF NOT EXISTS meeting_room_bookings (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    meeting_room_id           UUID       NOT NULL REFERENCES meeting_rooms(id),
    booked_by_employee_id        UUID    NOT NULL REFERENCES employees(id),

    starts_at                        TIMESTAMPTZ NOT NULL,
    ends_at                              TIMESTAMPTZ NOT NULL,
    attendee_count                          INT NOT NULL,
    catering_or_av_request                      TEXT,

    created_at                                      TIMESTAMPTZ DEFAULT NOW()
);

-- PAGE 3 (Minutes of Meeting): intentionally NO new tables -- reuses
-- the EXISTING meeting_minutes + meeting_action_items (MSS session).

-- ================================================================
-- PAGE 4: TRAVEL MANAGEMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS travel_requests (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    origin                        VARCHAR(150) NOT NULL,
    destination                       VARCHAR(150) NOT NULL,
    travel_start_date                     DATE NOT NULL,
    travel_end_date                           DATE NOT NULL,
    purpose                                       TEXT NOT NULL,

    daily_allowance_npr                               NUMERIC(10,2),
    -- Section 86 / compensatory-rest trigger: set TRUE if the trip's
    -- total hours push the employee past the 48h/week ceiling
    triggers_compensatory_rest                            BOOLEAN DEFAULT FALSE,

    status                                                    VARCHAR(20) DEFAULT 'pending'
                                                              CHECK (status IN ('pending','approved','rejected')),
    approved_by                                                  UUID,
    created_at                                                       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 5: TRANSPORT MANAGEMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS shuttle_routes (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    route_name                 VARCHAR(150) NOT NULL,
    departure_time                 TIME NOT NULL,
    capacity                           INT NOT NULL,
    driver_employee_id                     UUID,
    first_aid_kit_verified                     BOOLEAN DEFAULT TRUE  -- statutory requirement for company vehicles
);

CREATE TABLE IF NOT EXISTS shuttle_riders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shuttle_route_id      UUID NOT NULL REFERENCES shuttle_routes(id),
    employee_id              UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    ride_date                DATE DEFAULT CURRENT_DATE,
    -- Section 33: TRUE if this rider's shift falls outside daylight
    -- hours, making transport mandatory rather than optional
    section_33_mandatory          BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- PAGE 6: CAFETERIA MANAGEMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS cafeteria_menu_items (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    item_name                  VARCHAR(150) NOT NULL,
    dietary_tags                   TEXT[],  -- vegan, gluten_free, vegetarian, high_protein
    price_npr                          NUMERIC(8,2) NOT NULL,
    calories                               INT,
    available_date                             DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS cafeteria_preorders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    employee_id            UUID NOT NULL REFERENCES employees(id),
    cafeteria_menu_item_id   UUID NOT NULL REFERENCES cafeteria_menu_items(id),
    quantity                    INT NOT NULL DEFAULT 1,
    payment_method                  VARCHAR(20) DEFAULT 'payroll_deduction' CHECK (payment_method IN ('payroll_deduction','wallet')),
    ordered_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 7: HELPDESK (facility tickets, distinct from hr_helpdesk_tickets)
-- ================================================================
CREATE TABLE IF NOT EXISTS facility_tickets (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    reported_by_employee_id   UUID       NOT NULL REFERENCES employees(id),

    category                      VARCHAR(30) NOT NULL,  -- Facility, IT Hardware, Furniture, Cleaning
    description                       TEXT NOT NULL,
    priority                              VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),

    -- Section 77 / Chapter 20: an immediate-danger flag triggers a
    -- legal duty to halt operations in the affected area
    is_immediate_safety_hazard               BOOLEAN DEFAULT FALSE,

    stage                                        VARCHAR(20) DEFAULT 'open' CHECK (stage IN ('open','in_progress','resolved')),
    assigned_to                                      UUID,
    floor_location                                       VARCHAR(50),

    created_at                                               TIMESTAMPTZ DEFAULT NOW(),
    resolved_at                                                  TIMESTAMPTZ
);

-- ================================================================
-- PAGE 8: FACILITY MANAGEMENT (floor-level, distinct from Asset & Inventory)
-- ================================================================
CREATE TABLE IF NOT EXISTS facility_floors (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    floor_label                VARCHAR(50) NOT NULL,
    desks_total                    INT NOT NULL,
    desks_occupied                     INT DEFAULT 0,
    temperature_c                          NUMERIC(4,1),
    humidity_pct                               NUMERIC(4,1),
    last_reading_at                                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_committee_inspections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    inspection_date         DATE NOT NULL,
    next_due_date              DATE NOT NULL,  -- Section 74 cadence
    committee_member_count        INT NOT NULL
);

-- ================================================================
-- PAGE 9: GATE PASS MANAGEMENT -- extends the EXISTING universal
-- qr_codes registry rather than duplicating QR infrastructure
-- ================================================================
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_qr_type_check;
ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_qr_type_check
    CHECK (qr_type IN ('employee_badge','asset','transaction','goods','gate_pass'));

CREATE TABLE IF NOT EXISTS gate_passes (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    holder_name                VARCHAR(200) NOT NULL,  -- contractor/visitor name (not always an employees row)
    purpose                        TEXT NOT NULL,
    authorized_zones                   VARCHAR(300) NOT NULL,

    valid_from                             DATE NOT NULL,
    valid_until                                DATE NOT NULL,

    qr_codes_id                                    UUID REFERENCES qr_codes(id),  -- the actual QR lives in the universal registry
    created_by                                         UUID NOT NULL,
    created_at                                             TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 11: EVENT MANAGEMENT
-- ================================================================
CREATE TABLE IF NOT EXISTS admin_events (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    organizer_employee_id     UUID       NOT NULL REFERENCES employees(id),

    title                         VARCHAR(200) NOT NULL,
    event_date                       TIMESTAMPTZ NOT NULL,
    venue_meeting_room_id                 UUID REFERENCES meeting_rooms(id),
    catering_or_equipment_request             TEXT,

    -- TRUE if the event extends past standard shift hours -- counts
    -- toward weekly overtime per the legal note
    extends_past_standard_hours                   BOOLEAN DEFAULT FALSE,

    created_at                                        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_rsvps_admin (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_event_id        UUID NOT NULL REFERENCES admin_events(id),
    employee_id              UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    rsvp_status              VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN ('pending','yes','no')),
    UNIQUE (admin_event_id, employee_id)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_vis_status        ON visitors(status) WHERE status != 'checked_out';
CREATE INDEX IF NOT EXISTS idx_vis_host               ON visitors(host_employee_id);
CREATE INDEX IF NOT EXISTS idx_mrb_room                   ON meeting_room_bookings(meeting_room_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_tr_employee                      ON travel_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_tr_pending                            ON travel_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sr_riders                                 ON shuttle_riders(shuttle_route_id, ride_date);
CREATE INDEX IF NOT EXISTS idx_cp_employee                                   ON cafeteria_preorders(employee_id, ordered_at);
CREATE INDEX IF NOT EXISTS idx_ft_open                                          ON facility_tickets(stage) WHERE stage != 'resolved';
CREATE INDEX IF NOT EXISTS idx_ft_hazard                                            ON facility_tickets(is_immediate_safety_hazard) WHERE is_immediate_safety_hazard;
CREATE INDEX IF NOT EXISTS idx_gp_valid                                                ON gate_passes(valid_until) WHERE valid_until >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_ae_date                                                     ON admin_events(event_date);
CREATE INDEX IF NOT EXISTS idx_era_event                                                       ON event_rsvps_admin(admin_event_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- On visitor check-in: notify the host via the EXISTING transaction_notifications
CREATE OR REPLACE FUNCTION fn_notify_visitor_checkin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'checked_in' AND OLD.status = 'pre_registered' THEN
        NEW.checked_in_at := NOW();
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'visitors', NEW.id, 'visitor_arrived', NEW.host_employee_id, 'direct_party',
           format('Your visitor %s has checked in.', NEW.visitor_name), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_visitor
    BEFORE UPDATE OF status ON visitors
    FOR EACH ROW EXECUTE FUNCTION fn_notify_visitor_checkin();

-- Block a booking that exceeds the room's safe-occupancy capacity (Rule 7.7)
CREATE OR REPLACE FUNCTION fn_enforce_room_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE room_capacity INT;
BEGIN
    SELECT capacity INTO room_capacity FROM meeting_rooms WHERE id = NEW.meeting_room_id;
    IF NEW.attendee_count > room_capacity THEN
        RAISE EXCEPTION 'Attendee count (%) exceeds the room''s safe capacity (%) per the occupancy standard.', NEW.attendee_count, room_capacity;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_room_capacity
    BEFORE INSERT ON meeting_room_bookings
    FOR EACH ROW EXECUTE FUNCTION fn_enforce_room_capacity();

-- Immediate safety hazard: notify facilities leadership instantly,
-- bypassing the normal ticket queue priority
CREATE OR REPLACE FUNCTION fn_escalate_safety_hazard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE facilities_lead RECORD;
BEGIN
    IF NEW.is_immediate_safety_hazard THEN
        FOR facilities_lead IN SELECT id FROM employees WHERE company_id = NEW.company_id AND role = 'hr_manager' LOOP
            INSERT INTO transaction_notifications
              (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
            VALUES
              (NEW.company_id, 'facility_tickets', NEW.id, 'immediate_safety_hazard', facilities_lead.id, 'direct_party',
               format('IMMEDIATE SAFETY HAZARD reported: %s', NEW.description), NOW());
        END LOOP;
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_escalate_hazard
    AFTER INSERT ON facility_tickets
    FOR EACH ROW EXECUTE FUNCTION fn_escalate_safety_hazard();

-- On RSVP: notify the event organizer
CREATE OR REPLACE FUNCTION fn_notify_rsvp_admin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE organizer_id UUID;
BEGIN
    SELECT organizer_employee_id INTO organizer_id FROM admin_events WHERE id = NEW.admin_event_id;
    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    VALUES
      (NEW.company_id, 'event_rsvps_admin', NEW.id, 'rsvp_received', organizer_id, 'direct_party',
       format('New RSVP: %s', NEW.rsvp_status), NOW());
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_rsvp
    AFTER INSERT OR UPDATE OF rsvp_status ON event_rsvps_admin
    FOR EACH ROW EXECUTE FUNCTION fn_notify_rsvp_admin();

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW v_visitors_dashboard AS
SELECT v.*, e.first_name AS host_first_name, e.last_name AS host_last_name FROM visitors v
JOIN employees e ON v.host_employee_id = e.id;

CREATE OR REPLACE VIEW v_meeting_room_availability AS
SELECT mr.*,
    (SELECT MIN(starts_at) FROM meeting_room_bookings mrb WHERE mrb.meeting_room_id = mr.id AND mrb.starts_at > NOW()) AS next_available_check
FROM meeting_rooms mr;

CREATE OR REPLACE VIEW v_travel_dashboard AS
SELECT tr.*, e.first_name, e.last_name FROM travel_requests tr JOIN employees e ON tr.employee_id = e.id;

CREATE OR REPLACE VIEW v_shuttle_dashboard AS
SELECT sr.*, COUNT(sri.id) AS current_riders
FROM shuttle_routes sr
LEFT JOIN shuttle_riders sri ON sri.shuttle_route_id = sr.id AND sri.ride_date = CURRENT_DATE
GROUP BY sr.id;

CREATE OR REPLACE VIEW v_facility_tickets_dashboard AS
SELECT * FROM facility_tickets ORDER BY is_immediate_safety_hazard DESC, created_at DESC;

CREATE OR REPLACE VIEW v_facility_floors_dashboard AS
SELECT *, ROUND(desks_occupied::NUMERIC / NULLIF(desks_total,0) * 100, 1) AS occupancy_pct FROM facility_floors;

CREATE OR REPLACE VIEW v_gate_passes_active AS
SELECT * FROM gate_passes WHERE valid_until >= CURRENT_DATE;

CREATE OR REPLACE VIEW v_admin_events_dashboard AS
SELECT ae.*,
    COUNT(*) FILTER (WHERE era.rsvp_status = 'yes') AS rsvp_yes,
    COUNT(*) FILTER (WHERE era.rsvp_status = 'pending') AS rsvp_pending
FROM admin_events ae
LEFT JOIN event_rsvps_admin era ON era.admin_event_id = ae.id
GROUP BY ae.id;
