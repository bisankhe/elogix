-- ================================================================
-- FILE: database/schemas/employee_engagement_schema.sql
-- NepHR Pro -- Employee Experience & Culture > Employee Engagement
-- (9 pages: Engagement Dashboard, Announcement Board, Employee
-- Engagement, Employee Survey, Employee Feedback, Suggestion Box,
-- Employee Events, Appreciation Program, Internal Communication)
--
-- Design note: this is the FIRST module under Employee Experience &
-- Culture, so all core tables are genuinely new. The EngagementSnapshot
-- frontend widget (eNPS gauge styling) is design precedent only --
-- no data tables existed for it, so nothing is duplicated. Reuses the
-- EXISTING transaction_notifications mechanism throughout for all
-- "who is linked, notify them" requirements from the brief.
--
--   - announcements + announcement_reactions
--   - community_groups + community_group_members
--   - engagement_surveys + survey_responses (pulse + annual, anonymity-aware)
--   - employee_feedback_tickets (closed-loop: Submitted -> Under Review -> Resolved)
--   - suggestions + suggestion_votes (Kanban-style: New -> Reviewing -> Implementing -> Implemented)
--   - company_events + event_rsvps
--   - peer_recognitions (tied to company_values, never generic)
--   - recognition_points_ledger
--   - communication_threads + thread_replies
--   - knowledge_base_articles
--
-- Nepal Labour Act 2017 (2074): Section 114 (Labor Relations Committee
-- -- the primary forum these engagement tools digitize); Section 108
-- (Company Bylaws/Standing Orders act as the formal announcement
-- board); Chapter 5 OHS communication duties; privacy/confidentiality
-- for personal/medical/remuneration data in surveys and feedback;
-- non-discrimination in announcements and recognition (gender, caste,
-- religion, political affiliation).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PAGE 2: ANNOUNCEMENT BOARD
-- ================================================================
CREATE TABLE IF NOT EXISTS announcements (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    title                     VARCHAR(300) NOT NULL,
    message                      TEXT NOT NULL,
    channel                          VARCHAR(30) NOT NULL DEFAULT 'company_updates'
                                     CHECK (channel IN ('leadership','company_updates','departmental_news')),

    target_department_id                 UUID REFERENCES departments(id),  -- NULL = all employees
    target_location_id                       UUID,  -- NULL = all locations

    is_pinned                                    BOOLEAN DEFAULT FALSE,
    posted_by                                        UUID NOT NULL,
    posted_at                                            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement_reactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id     UUID NOT NULL REFERENCES announcements(id),
    employee_id          UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    reaction_type            VARCHAR(20) DEFAULT 'like',
    UNIQUE (announcement_id, employee_id)
);

CREATE TABLE IF NOT EXISTS announcement_comments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id     UUID NOT NULL REFERENCES announcements(id),
    employee_id          UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    comment_text             TEXT NOT NULL,
    commented_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 3: EMPLOYEE ENGAGEMENT (community groups)
-- ================================================================
CREATE TABLE IF NOT EXISTS community_groups (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    name                  VARCHAR(150) NOT NULL,
    category                  VARCHAR(30) DEFAULT 'interest_group' CHECK (category IN ('affinity_group','interest_group')),
    created_by                    UUID NOT NULL,
    created_at                        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_group_members (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_group_id   UUID NOT NULL REFERENCES community_groups(id),
    employee_id            UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    joined_at                TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (community_group_id, employee_id)
);

-- ================================================================
-- PAGE 4: EMPLOYEE SURVEY (pulse + annual, anonymity-aware)
-- ================================================================
CREATE TABLE IF NOT EXISTS engagement_surveys (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    title                  VARCHAR(300) NOT NULL,
    survey_type             VARCHAR(20) NOT NULL DEFAULT 'pulse' CHECK (survey_type IN ('pulse','annual')),
    est_minutes                INT DEFAULT 2,
    deadline                       DATE,
    is_active                        BOOLEAN DEFAULT TRUE,
    created_at                          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_responses (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_survey_id      UUID       NOT NULL REFERENCES engagement_surveys(id),
    company_id             UUID         NOT NULL,
    respondent_employee_id    UUID       REFERENCES employees(id),  -- NULL if anonymous (identity discarded at insert time)
    is_anonymous                 BOOLEAN DEFAULT TRUE,

    rating                            INT CHECK (rating BETWEEN 1 AND 10),
    open_text_response                   TEXT,

    sentiment                                VARCHAR(10),  -- AI-derived: positive/neutral/negative
    sentiment_flag_note                          TEXT,  -- e.g. burnout/safety language detected

    submitted_at                                    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 5: EMPLOYEE FEEDBACK (closed-loop ticketing, HR-bypass option)
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_feedback_tickets (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    employee_id               UUID       NOT NULL REFERENCES employees(id),

    topic                         VARCHAR(300) NOT NULL,
    details                          TEXT NOT NULL,
    is_confidential                      BOOLEAN DEFAULT FALSE,
    routed_to                                VARCHAR(20) DEFAULT 'manager' CHECK (routed_to IN ('manager','hr')),

    status                                        VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','resolved')),
    resolution_note                                   TEXT,
    resolved_at                                          TIMESTAMPTZ,

    submitted_at                                            TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 6: SUGGESTION BOX (anonymous, Kanban-tracked, public resolution)
-- ================================================================
CREATE TABLE IF NOT EXISTS suggestions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    submitted_by_employee_id  UUID       REFERENCES employees(id),  -- NULL if anonymous
    is_anonymous                 BOOLEAN DEFAULT TRUE,

    idea_text                        TEXT NOT NULL,
    status                                VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','reviewing','implementing','implemented')),
    resolution_note                          TEXT,

    submitted_at                                 TIMESTAMPTZ DEFAULT NOW(),
    updated_at                                       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestion_votes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id        UUID NOT NULL REFERENCES suggestions(id),
    employee_id            UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    voted_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (suggestion_id, employee_id)
);

-- ================================================================
-- PAGE 7: EMPLOYEE EVENTS (calendar, RSVP, hybrid/virtual aware)
-- ================================================================
CREATE TABLE IF NOT EXISTS company_events (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,

    title                     VARCHAR(300) NOT NULL,
    event_type                   VARCHAR(20) DEFAULT 'town_hall' CHECK (event_type IN ('town_hall','cultural','training','social')),
    event_format                     VARCHAR(20) DEFAULT 'in_person' CHECK (event_format IN ('in_person','virtual','hybrid')),

    event_date                           DATE NOT NULL,
    event_time_label                         VARCHAR(50),
    virtual_meeting_url                          VARCHAR(500),
    recording_url                                    VARCHAR(500),

    created_by                                           UUID NOT NULL,
    created_at                                               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_rsvps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_event_id     UUID NOT NULL REFERENCES company_events(id),
    employee_id            UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    rsvp_status              VARCHAR(20) DEFAULT 'going' CHECK (rsvp_status IN ('going','maybe','not_going')),
    rsvp_at                      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_event_id, employee_id)
);

-- ================================================================
-- PAGE 8: APPRECIATION PROGRAM (peer recognition tied to company values)
-- ================================================================
CREATE TABLE IF NOT EXISTS peer_recognitions (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    from_employee_id          UUID       NOT NULL REFERENCES employees(id),
    to_employee_id                UUID    NOT NULL REFERENCES employees(id),

    value_tag                         VARCHAR(100) NOT NULL,  -- must tie to a real company value, never generic
    message                              TEXT NOT NULL,
    points_awarded                           INT DEFAULT 20,

    created_at                                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recognition_points_ledger (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id           UUID NOT NULL REFERENCES employees(id),
    company_id          UUID NOT NULL,
    points_delta              INT NOT NULL,  -- positive = earned, negative = redeemed
    reason                        VARCHAR(200),
    peer_recognition_id               UUID REFERENCES peer_recognitions(id),
    recorded_at                          TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PAGE 9: INTERNAL COMMUNICATION (threads + searchable knowledge base)
-- ================================================================
CREATE TABLE IF NOT EXISTS communication_threads (
    id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID         NOT NULL,
    title                     VARCHAR(300) NOT NULL,
    started_by                   UUID NOT NULL,
    department_id                    UUID REFERENCES departments(id),  -- NULL = company-wide
    is_pinned                            BOOLEAN DEFAULT FALSE,
    created_at                               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thread_replies (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    communication_thread_id UUID NOT NULL REFERENCES communication_threads(id),
    company_id          UUID NOT NULL,
    employee_id            UUID NOT NULL REFERENCES employees(id),
    reply_text                TEXT NOT NULL,
    replied_at                    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_base_articles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL,
    title                  VARCHAR(300) NOT NULL,
    category                  VARCHAR(100),
    content_body                 TEXT,
    created_by                       UUID,
    created_at                           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_ann_pinned          ON announcements(is_pinned) WHERE is_pinned;
CREATE INDEX IF NOT EXISTS idx_ann_dept                 ON announcements(target_department_id);
CREATE INDEX IF NOT EXISTS idx_cgm_employee                  ON community_group_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_sr_survey                          ON survey_responses(engagement_survey_id);
CREATE INDEX IF NOT EXISTS idx_sr_negative_sentiment                   ON survey_responses(sentiment) WHERE sentiment = 'negative';
CREATE INDEX IF NOT EXISTS idx_eft_employee                                ON employee_feedback_tickets(employee_id);
CREATE INDEX IF NOT EXISTS idx_eft_open                                        ON employee_feedback_tickets(status) WHERE status != 'resolved';
CREATE INDEX IF NOT EXISTS idx_sug_status                                           ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_sv_suggestion                                            ON suggestion_votes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_ce_date                                                      ON company_events(event_date);
CREATE INDEX IF NOT EXISTS idx_er_event                                                        ON event_rsvps(company_event_id);
CREATE INDEX IF NOT EXISTS idx_pr_to                                                                ON peer_recognitions(to_employee_id);
CREATE INDEX IF NOT EXISTS idx_pr_from                                                                  ON peer_recognitions(from_employee_id);
CREATE INDEX IF NOT EXISTS idx_rpl_employee                                                                  ON recognition_points_ledger(employee_id);
CREATE INDEX IF NOT EXISTS idx_ct_dept                                                                            ON communication_threads(department_id);
CREATE INDEX IF NOT EXISTS idx_tr_thread                                                                              ON thread_replies(communication_thread_id);
CREATE INDEX IF NOT EXISTS idx_kba_search                                                                                  ON knowledge_base_articles USING GIN (to_tsvector('english', title || ' ' || COALESCE(content_body,'')));

-- ================================================================
-- TRIGGERS
-- ================================================================

-- On announcement post: notify the target audience (department or
-- company-wide), reusing the EXISTING transaction_notifications table
CREATE OR REPLACE FUNCTION fn_notify_announcement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE emp RECORD;
BEGIN
    FOR emp IN
        SELECT id FROM employees
        WHERE company_id = NEW.company_id
          AND (NEW.target_department_id IS NULL OR department_id = NEW.target_department_id)
    LOOP
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'announcements', NEW.id, 'new_announcement', emp.id, 'direct_party',
           format('New announcement: "%s"', NEW.title), NOW());
    END LOOP;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_announcement
    AFTER INSERT ON announcements
    FOR EACH ROW EXECUTE FUNCTION fn_notify_announcement();

-- On feedback ticket status change: notify the employee who submitted it
CREATE OR REPLACE FUNCTION fn_notify_feedback_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'resolved' THEN NEW.resolved_at := NOW(); END IF;
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'employee_feedback_tickets', NEW.id, 'feedback_status_changed', NEW.employee_id, 'direct_party',
           format('Your feedback on "%s" is now: %s', NEW.topic, NEW.status), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_feedback
    BEFORE UPDATE OF status ON employee_feedback_tickets
    FOR EACH ROW EXECUTE FUNCTION fn_notify_feedback_status();

-- On suggestion status change to implemented: notify the submitter
-- (only if not anonymous -- respects the anonymity choice)
CREATE OR REPLACE FUNCTION fn_notify_suggestion_resolved()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    IF NEW.status = 'implemented' AND OLD.status != 'implemented' AND NOT NEW.is_anonymous AND NEW.submitted_by_employee_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'suggestions', NEW.id, 'suggestion_implemented', NEW.submitted_by_employee_id, 'direct_party',
           'Your suggestion has been implemented!', NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_suggestion
    BEFORE UPDATE OF status ON suggestions
    FOR EACH ROW EXECUTE FUNCTION fn_notify_suggestion_resolved();

-- On RSVP: notify the event organizer (so they can track headcount)
CREATE OR REPLACE FUNCTION fn_notify_rsvp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE organizer_id UUID; event_title TEXT;
BEGIN
    SELECT created_by, title INTO organizer_id, event_title FROM company_events WHERE id = NEW.company_event_id;
    IF organizer_id IS NOT NULL THEN
        INSERT INTO transaction_notifications
          (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
        VALUES
          (NEW.company_id, 'event_rsvps', NEW.id, 'event_rsvp', organizer_id, 'direct_party',
           format('New RSVP (%s) for "%s"', NEW.rsvp_status, event_title), NOW());
    END IF;
    RETURN NEW;
END;$$;

CREATE TRIGGER trg_notify_rsvp
    AFTER INSERT ON event_rsvps
    FOR EACH ROW EXECUTE FUNCTION fn_notify_rsvp();

-- On peer recognition: notify the recipient AND credit points to the
-- ledger automatically (single source of truth for point balances)
CREATE OR REPLACE FUNCTION fn_process_recognition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO recognition_points_ledger (employee_id, company_id, points_delta, reason, peer_recognition_id, recorded_at)
    VALUES (NEW.to_employee_id, NEW.company_id, NEW.points_awarded, format('Recognition: %s', NEW.value_tag), NEW.id, NOW());

    INSERT INTO transaction_notifications
      (company_id, source_table, source_record_id, transaction_type, recipient_employee_id, recipient_relationship, message, created_at)
    VALUES
      (NEW.company_id, 'peer_recognitions', NEW.id, 'recognition_received', NEW.to_employee_id, 'direct_party',
       format('You were recognized for "%s"!', NEW.value_tag), NOW());

    RETURN NEW;
END;$$;

CREATE TRIGGER trg_process_recognition
    AFTER INSERT ON peer_recognitions
    FOR EACH ROW EXECUTE FUNCTION fn_process_recognition();

-- ================================================================
-- VIEWS
-- ================================================================

-- Page 1: Engagement Dashboard rollup
CREATE OR REPLACE VIEW v_engagement_dashboard_kpis AS
SELECT
    company_id,
    (SELECT ROUND(AVG(rating),1) FROM survey_responses WHERE submitted_at > NOW() - INTERVAL '90 days') AS avg_recent_rating,
    (SELECT COUNT(DISTINCT respondent_employee_id) FROM survey_responses WHERE submitted_at > NOW() - INTERVAL '30 days') AS recent_respondents,
    (SELECT COUNT(*) FROM peer_recognitions WHERE created_at > NOW() - INTERVAL '30 days') AS recognitions_this_month,
    (SELECT COUNT(*) FROM company_events WHERE event_date > CURRENT_DATE) AS upcoming_events
FROM (SELECT DISTINCT company_id FROM employees) sub;

-- Page 1: unified activity feed across recognition/events/feedback
CREATE OR REPLACE VIEW v_activity_feed AS
SELECT 'recognition' AS activity_type, pr.id, pr.created_at AS occurred_at, pr.company_id,
       format('%s recognized %s for "%s"', fe.first_name, te.first_name, pr.value_tag) AS description
FROM peer_recognitions pr
JOIN employees fe ON pr.from_employee_id = fe.id JOIN employees te ON pr.to_employee_id = te.id
UNION ALL
SELECT 'event', ce.id, ce.created_at, ce.company_id, format('Upcoming: %s on %s', ce.title, ce.event_date)
FROM company_events ce WHERE ce.event_date > CURRENT_DATE
UNION ALL
SELECT 'survey', es.id, es.created_at, es.company_id, format('New survey available: %s', es.title)
FROM engagement_surveys es WHERE es.is_active
ORDER BY occurred_at DESC;

-- Page 2: announcement board with reaction/comment counts
CREATE OR REPLACE VIEW v_announcement_board AS
SELECT a.*, d.name AS target_department_name,
    (SELECT COUNT(*) FROM announcement_reactions ar WHERE ar.announcement_id = a.id) AS reaction_count,
    (SELECT COUNT(*) FROM announcement_comments ac WHERE ac.announcement_id = a.id) AS comment_count
FROM announcements a
LEFT JOIN departments d ON a.target_department_id = d.id
ORDER BY a.is_pinned DESC, a.posted_at DESC;

-- Page 4: survey results summary
CREATE OR REPLACE VIEW v_survey_results_summary AS
SELECT
    es.id, es.title, es.survey_type,
    ROUND(AVG(sr.rating), 1) AS avg_score,
    COUNT(sr.id) AS response_count,
    ROUND(COUNT(sr.id)::NUMERIC / NULLIF((SELECT COUNT(*) FROM employees WHERE company_id = es.company_id),0) * 100, 1) AS response_rate_pct,
    es.company_id
FROM engagement_surveys es
LEFT JOIN survey_responses sr ON sr.engagement_survey_id = es.id
GROUP BY es.id, es.title, es.survey_type, es.company_id;

-- Page 6: suggestion box, sorted by votes
CREATE OR REPLACE VIEW v_suggestions_dashboard AS
SELECT s.*, COUNT(sv.id) AS vote_count
FROM suggestions s
LEFT JOIN suggestion_votes sv ON sv.suggestion_id = s.id
GROUP BY s.id
ORDER BY vote_count DESC;

-- Page 7: events with RSVP counts
CREATE OR REPLACE VIEW v_events_dashboard AS
SELECT ce.*, COUNT(er.id) FILTER (WHERE er.rsvp_status = 'going') AS going_count
FROM company_events ce
LEFT JOIN event_rsvps er ON er.company_event_id = ce.id
GROUP BY ce.id
ORDER BY ce.event_date ASC;

-- Page 8: recognition wall + current point balances
CREATE OR REPLACE VIEW v_recognition_wall AS
SELECT pr.*, fe.first_name AS from_first_name, fe.last_name AS from_last_name, te.first_name AS to_first_name, te.last_name AS to_last_name
FROM peer_recognitions pr
JOIN employees fe ON pr.from_employee_id = fe.id JOIN employees te ON pr.to_employee_id = te.id
ORDER BY pr.created_at DESC;

CREATE OR REPLACE VIEW v_employee_points_balance AS
SELECT employee_id, company_id, SUM(points_delta) AS balance
FROM recognition_points_ledger
GROUP BY employee_id, company_id;

-- Page 9: communication threads with reply counts
CREATE OR REPLACE VIEW v_communication_threads AS
SELECT ct.*, d.name AS department_name, COUNT(tr.id) AS reply_count, MAX(tr.replied_at) AS last_active_at
FROM communication_threads ct
LEFT JOIN departments d ON ct.department_id = d.id
LEFT JOIN thread_replies tr ON tr.communication_thread_id = ct.id
GROUP BY ct.id, d.name
ORDER BY ct.is_pinned DESC, last_active_at DESC NULLS LAST;
