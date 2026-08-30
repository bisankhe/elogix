-- ================================================================
-- FILE: database/schemas/employee_social_feed_schema.sql
-- eLogix HRMS -- Employee Social Feed / Employee Hub
-- (Employee Experience & Culture > Employee Engagement > Employee Social Feed)
--
-- GAP CONFIRMED before writing:
--   employee_engagement_schema.sql already has:
--     announcements + reactions + comments  (company broadcast layer)
--     peer_recognitions + points_ledger     (recognition/points)
--     community_groups + members            (group registry)
--     suggestions + votes                   (idea box)
--     company_events + rsvps               (event registry)
--
--   WHAT IS MISSING (all new, no duplicates):
--     1. social_feed_posts  -- the unified timeline aggregator:
--          one row per feed event regardless of source type
--          (birthday, kudos, promotion, training, job opening, photo,
--           video, idea, CSR, announcement). Avoids querying 7
--          separate tables to build the feed -- one table, one query.
--     2. feed_reactions      -- like/celebrate/thanks/congratulations
--          per post per employee. Separate from announcement_reactions
--          (that table is announcement-specific; this is feed-wide).
--     3. feed_comments       -- comments on feed posts (same reason).
--     4. feed_bookmarks      -- employee saves a post for later.
--     5. achievement_badges  -- badge definitions (catalogue).
--     6. employee_badges     -- which employee earned which badge.
--     7. gamification_config -- points per action, streak rules,
--          wellness challenge config. Admin-editable, not hardcoded.
--     8. engagement_streaks  -- tracks consecutive days/weeks of
--          activity (login, training, recognition given).
--     9. ai_feed_preferences -- per-employee AI personalization
--          signals: what they interact with, what to recommend.
--    10. feed_notifications  -- lightweight notification queue for
--          the feed (someone liked/commented on your post).
--          Separate from transaction_notifications (workflow events).
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. UNIFIED SOCIAL FEED -- the single timeline query target
-- ================================================================
CREATE TABLE IF NOT EXISTS social_feed_posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,

    -- Post type governs what the UI renders
    post_type       VARCHAR(40) NOT NULL CHECK (post_type IN (
        'birthday',           -- auto-generated from employee DOB
        'work_anniversary',   -- auto-generated from joining date
        'kudos',              -- from peer_recognitions
        'award',              -- formal award from HR
        'promotion',          -- from employee movement
        'announcement',       -- from announcements table
        'team_photo',         -- image upload by HR or team
        'company_video',      -- video link or upload
        'new_training',       -- new course published in LMS
        'internal_job',       -- new vacancy posted
        'idea',               -- from suggestions table
        'csr_activity',       -- corporate social responsibility event
        'event',              -- from company_events
        'wellness_challenge', -- gamification wellness event
        'policy_update'       -- policy change relevant to role/location
    )),

    -- Author: NULL = system-generated (birthdays, anniversaries, etc.)
    author_employee_id  UUID REFERENCES employees(id),

    -- Subject: the employee this post is ABOUT (for birthdays, kudos, promotions)
    subject_employee_id UUID REFERENCES employees(id),

    title           VARCHAR(500),
    body            TEXT,
    media_url       TEXT,           -- image/video URL
    media_type      VARCHAR(20) CHECK (media_type IN ('image','video','document',NULL)),
    link_url        TEXT,           -- for training/job/policy links
    link_label      VARCHAR(200),

    -- Targeting: NULL = visible to all company employees
    target_department_id UUID,      -- if set, only that dept sees it
    target_roles        VARCHAR(100)[],  -- role-specific targeting
    target_location_ids UUID[],     -- location-specific

    -- Source reference -- links back to the originating record
    source_table    VARCHAR(100),   -- 'peer_recognitions', 'company_events', etc.
    source_id       UUID,

    -- Moderation (HR can hide/approve posts)
    status          VARCHAR(20) DEFAULT 'published'
                    CHECK (status IN ('published','pending_review','hidden','archived')),
    moderated_by    UUID REFERENCES employees(id),
    moderated_at    TIMESTAMPTZ,
    moderation_note TEXT,

    -- Engagement counters (denormalized for fast feed rendering)
    reaction_count  INT DEFAULT 0,
    comment_count   INT DEFAULT 0,
    bookmark_count  INT DEFAULT 0,

    is_pinned       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sfp_company_ts ON social_feed_posts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sfp_type ON social_feed_posts(company_id, post_type);
CREATE INDEX IF NOT EXISTS idx_sfp_subject ON social_feed_posts(subject_employee_id);
CREATE INDEX IF NOT EXISTS idx_sfp_pinned ON social_feed_posts(company_id, is_pinned) WHERE is_pinned;

-- ================================================================
-- 2. REACTIONS -- like / celebrate / congratulations / thanks / wow
-- ================================================================
CREATE TABLE IF NOT EXISTS feed_reactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES social_feed_posts(id) ON DELETE CASCADE,
    employee_id     UUID NOT NULL REFERENCES employees(id),
    reaction_type   VARCHAR(30) NOT NULL CHECK (reaction_type IN
        ('like','celebrate','congratulations','thanks','wow','heart')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, employee_id)  -- one reaction per employee per post
);
CREATE INDEX IF NOT EXISTS idx_fr_post ON feed_reactions(post_id);

-- Auto-update the denormalized counter
CREATE OR REPLACE FUNCTION fn_update_reaction_count() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE social_feed_posts
    SET reaction_count = (SELECT COUNT(*) FROM feed_reactions WHERE post_id = COALESCE(NEW.post_id, OLD.post_id))
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
    RETURN NULL;
END;$$;
CREATE TRIGGER trg_reaction_count
    AFTER INSERT OR DELETE ON feed_reactions
    FOR EACH ROW EXECUTE FUNCTION fn_update_reaction_count();

-- ================================================================
-- 3. COMMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS feed_comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id         UUID NOT NULL REFERENCES social_feed_posts(id) ON DELETE CASCADE,
    author_employee_id UUID NOT NULL REFERENCES employees(id),
    parent_comment_id  UUID REFERENCES feed_comments(id),  -- thread replies
    body            TEXT NOT NULL,
    is_hidden       BOOLEAN DEFAULT FALSE,  -- HR moderation
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fc_post ON feed_comments(post_id, created_at);

CREATE OR REPLACE FUNCTION fn_update_comment_count() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE social_feed_posts
    SET comment_count = (SELECT COUNT(*) FROM feed_comments WHERE post_id = COALESCE(NEW.post_id, OLD.post_id) AND NOT is_hidden)
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
    RETURN NULL;
END;$$;
CREATE TRIGGER trg_comment_count
    AFTER INSERT OR DELETE ON feed_comments
    FOR EACH ROW EXECUTE FUNCTION fn_update_comment_count();

-- ================================================================
-- 4. BOOKMARKS -- employee saves a post
-- ================================================================
CREATE TABLE IF NOT EXISTS feed_bookmarks (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id     UUID NOT NULL REFERENCES social_feed_posts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    saved_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, employee_id)
);

-- ================================================================
-- 5. BADGE DEFINITIONS -- the achievement catalogue
-- ================================================================
CREATE TABLE IF NOT EXISTS achievement_badges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,  -- NULL = global (system badges); non-null = company-custom
    badge_key       VARCHAR(100) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    icon_emoji      VARCHAR(10),
    category        VARCHAR(40) CHECK (category IN (
        'learning','recognition','attendance','milestone',
        'wellness','innovation','engagement','leadership'
    )),
    points_value    INT DEFAULT 50,
    -- Auto-award rule: how many times an action must happen
    auto_award_event VARCHAR(100),   -- e.g. 'training_completed', 'kudos_given_5x'
    auto_award_threshold INT,
    is_active       BOOLEAN DEFAULT TRUE
);

INSERT INTO achievement_badges (badge_key, name, description, icon_emoji, category, points_value, auto_award_event, auto_award_threshold) VALUES
    ('first_login',          'Welcome Aboard',        'Logged in for the first time',                    '👋', 'milestone',   10, 'first_login',        1),
    ('training_first',       'First Learner',         'Completed your first training module',            '📚', 'learning',    50, 'training_completed', 1),
    ('training_5',           'Knowledge Seeker',      'Completed 5 training modules',                    '🎓', 'learning',   100, 'training_completed', 5),
    ('training_streak_7',    '7-Day Learning Streak', 'Logged into learning portal 7 days in a row',     '🔥', 'learning',   150, 'learning_streak',    7),
    ('training_streak_30',   'Learning Champion',     '30-day learning streak',                          '🏆', 'learning',   500, 'learning_streak',   30),
    ('kudos_given_1',        'Recognition Giver',     'Gave your first Kudos to a colleague',            '👏', 'recognition', 25, 'kudos_given',        1),
    ('kudos_given_10',       'Culture Champion',      'Given Kudos to 10 different colleagues',          '💛', 'recognition',200, 'kudos_given',       10),
    ('kudos_received_1',     'Team Player',           'Received your first Kudos from a colleague',      '⭐', 'recognition', 25, 'kudos_received',     1),
    ('kudos_received_5',     'Office MVP',            'Received Kudos from 5 different colleagues',      '🌟', 'recognition',200, 'kudos_received',     5),
    ('attendance_30',        '30-Day Attendance',     'Perfect attendance for 30 consecutive days',      '✅', 'attendance', 100, 'perfect_attendance', 30),
    ('attendance_90',        'Punctuality Pro',       'Perfect attendance for 90 consecutive days',      '🎯', 'attendance', 300, 'perfect_attendance', 90),
    ('idea_submitted',       'Idea Generator',        'Submitted your first idea or suggestion',         '💡', 'innovation',  30, 'idea_submitted',     1),
    ('idea_approved',        'Change Maker',          'Had an idea officially approved and implemented', '🚀', 'innovation', 200, 'idea_approved',      1),
    ('wellness_1',           'Wellness Starter',      'Joined your first wellness challenge',             '💪', 'wellness',    30, 'wellness_joined',    1),
    ('wellness_complete',    'Wellness Champion',     'Completed a full wellness challenge',              '🏅', 'wellness',   150, 'wellness_completed', 1),
    ('5_year_milestone',     '5-Year Milestone',      'Celebrated 5 years with the company',             '🎂', 'milestone',  500, 'work_anniversary',   5),
    ('10_year_milestone',    'Decade Legend',         '10 years with the company',                       '👑', 'milestone', 1000, 'work_anniversary',  10),
    ('onboarding_complete',  'Fully Onboarded',       'Completed all onboarding tasks',                  '🎉', 'milestone',  100, 'onboarding_done',    1),
    ('survey_contributor',   'Voice Heard',           'Responded to 5 employee surveys',                 '📣', 'engagement',  50, 'survey_completed',   5),
    ('csr_participant',      'Community Hero',        'Participated in a CSR or volunteer activity',     '❤️', 'wellness',   100, 'csr_joined',         1)
ON CONFLICT (badge_key) DO NOTHING;

-- ================================================================
-- 6. EMPLOYEE BADGE AWARDS
-- ================================================================
CREATE TABLE IF NOT EXISTS employee_badges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    company_id      UUID NOT NULL,
    badge_id        UUID NOT NULL REFERENCES achievement_badges(id),
    awarded_at      TIMESTAMPTZ DEFAULT NOW(),
    awarded_by      UUID REFERENCES employees(id),  -- NULL = auto-awarded
    note            TEXT,
    UNIQUE (employee_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_eb_employee ON employee_badges(employee_id, awarded_at DESC);

-- ================================================================
-- 7. GAMIFICATION CONFIG -- admin-editable point values per action
-- ================================================================
CREATE TABLE IF NOT EXISTS gamification_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,
    action_key      VARCHAR(100) NOT NULL,
    action_label    VARCHAR(200),
    points          INT NOT NULL DEFAULT 10,
    daily_cap       INT,    -- max points earnable per day from this action
    UNIQUE (company_id, action_key)
);

INSERT INTO gamification_config (action_key, action_label, points, daily_cap) VALUES
    ('login',                 'Daily Login',                       5,   5),
    ('training_completed',    'Completed a Training Module',      50, 150),
    ('training_day',          'Learning Day (any training activity)',10, 10),
    ('kudos_given',           'Gave Kudos to a Colleague',        15,  30),
    ('kudos_received',        'Received Kudos',                   20,  60),
    ('survey_completed',      'Completed an Employee Survey',     25,  25),
    ('idea_submitted',        'Submitted a Suggestion / Idea',    20,  20),
    ('event_attended',        'Attended a Company Event',         30, 120),
    ('wellness_activity',     'Completed a Wellness Activity',    20,  40),
    ('comment_posted',        'Posted a Comment on the Feed',      5,  15),
    ('onboarding_task_done',  'Completed an Onboarding Task',     25, 200),
    ('profile_complete',      'Completed Employee Profile',       50,  50),
    ('csr_activity',          'Participated in CSR Activity',     40,  40)
ON CONFLICT (company_id, action_key) DO NOTHING;

-- ================================================================
-- 8. ENGAGEMENT STREAKS
-- ================================================================
CREATE TABLE IF NOT EXISTS engagement_streaks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    company_id      UUID NOT NULL,
    streak_type     VARCHAR(40) CHECK (streak_type IN ('login','learning','wellness','recognition')),
    current_streak  INT DEFAULT 0,
    longest_streak  INT DEFAULT 0,
    last_activity_date DATE,
    UNIQUE (employee_id, streak_type)
);

-- ================================================================
-- 9. AI FEED PREFERENCES -- personalization signals
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_feed_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     UUID NOT NULL UNIQUE REFERENCES employees(id),
    company_id      UUID NOT NULL,
    preferred_types VARCHAR(40)[],   -- post_types they engage with most
    engaged_tags    VARCHAR(100)[],  -- topics/departments they react to
    ignored_types   VARCHAR(40)[],   -- types they consistently scroll past
    last_updated    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 10. FEED NOTIFICATIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS feed_notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    recipient_employee_id UUID NOT NULL REFERENCES employees(id),
    post_id         UUID REFERENCES social_feed_posts(id),
    notif_type      VARCHAR(40) CHECK (notif_type IN (
        'reaction_on_post','comment_on_post','kudos_received',
        'badge_earned','birthday_reminder','anniversary_reminder',
        'new_post_mention','leaderboard_change','challenge_invite'
    )),
    actor_employee_id UUID REFERENCES employees(id),
    message         TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fn_recipient ON feed_notifications(recipient_employee_id, is_read, created_at DESC);

-- ================================================================
-- LEADERBOARD VIEW -- real-time, computed from points ledger
-- ================================================================
CREATE OR REPLACE VIEW v_engagement_leaderboard AS
SELECT
    e.id AS employee_id,
    e.full_name,
    e.department_id,
    e.company_id,
    COALESCE(SUM(rpl.points_delta), 0)                        AS total_points,
    COUNT(DISTINCT eb.badge_id)                                AS badge_count,
    es_learn.current_streak                                    AS learning_streak,
    RANK() OVER (PARTITION BY e.company_id ORDER BY COALESCE(SUM(rpl.points_delta), 0) DESC) AS company_rank,
    RANK() OVER (PARTITION BY e.company_id, e.department_id ORDER BY COALESCE(SUM(rpl.points_delta), 0) DESC) AS dept_rank
FROM employees e
LEFT JOIN recognition_points_ledger rpl ON rpl.employee_id = e.id AND rpl.recorded_at >= NOW() - INTERVAL '30 days'
LEFT JOIN employee_badges eb ON eb.employee_id = e.id
LEFT JOIN engagement_streaks es_learn ON es_learn.employee_id = e.id AND es_learn.streak_type = 'learning'
GROUP BY e.id, e.full_name, e.department_id, e.company_id, es_learn.current_streak;

-- ================================================================
-- AUTO-GENERATE FEED POSTS for birthdays and anniversaries
-- Called daily by a scheduled job or admin trigger
-- ================================================================
CREATE OR REPLACE FUNCTION fn_generate_celebration_posts(p_company_id UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    v_count INT := 0;
    rec RECORD;
BEGIN
    -- Birthdays today
    FOR rec IN
        SELECT id, full_name FROM employees
        WHERE company_id = p_company_id
          AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY   FROM date_of_birth) = EXTRACT(DAY   FROM CURRENT_DATE)
          AND employment_status = 'active'
    LOOP
        INSERT INTO social_feed_posts (company_id, post_type, subject_employee_id, title, body, status)
        VALUES (p_company_id, 'birthday', rec.id,
                format('🎉 Happy Birthday, %s!', rec.full_name),
                format('Today is %s''s birthday. Send them a celebratory message!', rec.full_name),
                'published')
        ON CONFLICT DO NOTHING;
        v_count := v_count + 1;
    END LOOP;
    -- Work anniversaries today
    FOR rec IN
        SELECT id, full_name,
               EXTRACT(YEAR FROM AGE(joining_date))::INT AS years
        FROM employees
        WHERE company_id = p_company_id
          AND EXTRACT(MONTH FROM joining_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY   FROM joining_date) = EXTRACT(DAY   FROM CURRENT_DATE)
          AND employment_status = 'active'
          AND joining_date < CURRENT_DATE
    LOOP
        INSERT INTO social_feed_posts (company_id, post_type, subject_employee_id, title, body, status)
        VALUES (p_company_id, 'work_anniversary', rec.id,
                format('🏆 %s years with us — %s!', rec.years, rec.full_name),
                format('Congratulations to %s on %s year%s with the team. Thank you for your dedication!',
                       rec.full_name, rec.years, CASE WHEN rec.years = 1 THEN '' ELSE 's' END),
                'published')
        ON CONFLICT DO NOTHING;
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;$$;
