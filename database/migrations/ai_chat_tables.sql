-- FILE: database/migrations/ai_chat_tables.sql
-- eLogix HRMS — AI Chat & Usage Database Schema
-- Run: psql -U elogix -d elogix_hrms -f ai_chat_tables.sql
-- eLogix Technologies · www.elogix.com.np

-- ── ENUMS ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE ai_session_status AS ENUM ('active','closed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_message_role AS ENUM ('user','assistant','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_feedback_type AS ENUM ('helpful','unhelpful','neutral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_module_type AS ENUM
    ('hr_chatbot','bi_engine','hr_letters','job_desc','hr_policy','ai_pilot','process_flow');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── AI CHAT SESSIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    module          ai_module_type NOT NULL DEFAULT 'hr_chatbot',
    title           VARCHAR(200),
    status          ai_session_status NOT NULL DEFAULT 'active',
    language        VARCHAR(10) NOT NULL DEFAULT 'en',
    persona_role    VARCHAR(50),          -- super_admin, hr_manager, employee, etc.
    message_count   INTEGER DEFAULT 0,
    total_tokens    INTEGER DEFAULT 0,
    model_used      VARCHAR(50) DEFAULT 'claude-sonnet-4-6',
    context_data    JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ai_sessions_company  ON ai_chat_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user     ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_status   ON ai_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_module   ON ai_chat_sessions(module);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_created  ON ai_chat_sessions(created_at DESC);

-- Row-Level Security (RLS) — users see only their own sessions
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_sessions_company_isolation ON ai_chat_sessions
    USING (company_id = current_setting('app.current_company_id')::UUID);

-- ── AI CHAT MESSAGES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES employees(id) ON DELETE SET NULL,
    role            ai_message_role NOT NULL,
    content         TEXT NOT NULL,
    content_type    VARCHAR(20) DEFAULT 'markdown',  -- text, markdown, table, json
    tokens_in       INTEGER DEFAULT 0,
    tokens_out      INTEGER DEFAULT 0,
    latency_ms      INTEGER,
    model           VARCHAR(50),
    feedback        ai_feedback_type,
    feedback_note   TEXT,
    is_flagged      BOOLEAN DEFAULT FALSE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session  ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_company  ON ai_chat_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user     ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_role     ON ai_chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created  ON ai_chat_messages(created_at DESC);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_messages_company_isolation ON ai_chat_messages
    USING (company_id = current_setting('app.current_company_id')::UUID);

-- ── AI USAGE TRACKING ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES employees(id) ON DELETE SET NULL,
    month           CHAR(7) NOT NULL,        -- YYYY-MM e.g. '2026-08'
    module          VARCHAR(50) NOT NULL,
    tokens_used     INTEGER DEFAULT 0,
    queries_count   INTEGER DEFAULT 0,
    cost_npr        INTEGER DEFAULT 0,       -- in paisa (NPR × 100)
    plan_limit      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, user_id, month, module)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_company ON ai_usage_logs(company_id, month);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user    ON ai_usage_logs(user_id, month);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_company_isolation ON ai_usage_logs
    USING (company_id = current_setting('app.current_company_id')::UUID);

-- ── AI KNOWLEDGE BASE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category        VARCHAR(50),            -- policy, faq, procedure, template, labour_law
    title           VARCHAR(300) NOT NULL,
    content         TEXT NOT NULL,
    tags            JSONB DEFAULT '[]',
    language        VARCHAR(10) DEFAULT 'en',
    is_active       BOOLEAN DEFAULT TRUE,
    view_count      INTEGER DEFAULT 0,
    helpful_count   INTEGER DEFAULT 0,
    created_by      UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_kb_company   ON ai_knowledge_base(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_kb_category  ON ai_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_ai_kb_language  ON ai_knowledge_base(language);
CREATE INDEX IF NOT EXISTS idx_ai_kb_active    ON ai_knowledge_base(is_active);

-- Full-text search on knowledge base
CREATE INDEX IF NOT EXISTS idx_ai_kb_fts ON ai_knowledge_base
    USING GIN (to_tsvector('english', title || ' ' || content));

ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_kb_company_isolation ON ai_knowledge_base
    USING (company_id = current_setting('app.current_company_id')::UUID);

-- ── SEED: NEPAL LABOUR ACT KNOWLEDGE BASE ─────────────────────
-- Shared knowledge (company_id = NULL means available to all)
-- In production, insert with your system company_id

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_sessions_updated_at
    BEFORE UPDATE ON ai_chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_usage_updated_at
    BEFORE UPDATE ON ai_usage_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_kb_updated_at
    BEFORE UPDATE ON ai_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── VIEWS FOR ANALYTICS ───────────────────────────────────────
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT
    company_id,
    month,
    SUM(queries_count) AS total_queries,
    SUM(tokens_used)   AS total_tokens,
    COUNT(DISTINCT user_id) AS unique_users,
    jsonb_object_agg(module, queries_count) AS by_module
FROM ai_usage_logs
GROUP BY company_id, month;

CREATE OR REPLACE VIEW ai_popular_questions AS
SELECT
    m.company_id,
    LEFT(m.content, 100) AS question_preview,
    COUNT(*)             AS asked_count,
    AVG(m.tokens_out)    AS avg_response_tokens,
    SUM(CASE WHEN m.feedback = 'helpful' THEN 1 ELSE 0 END) AS helpful_count
FROM ai_chat_messages m
WHERE m.role = 'user'
GROUP BY m.company_id, LEFT(m.content, 100)
ORDER BY asked_count DESC;

-- ── COMMENTS ──────────────────────────────────────────────────
COMMENT ON TABLE ai_chat_sessions   IS 'eLogix HRMS: AI chat conversation sessions per user';
COMMENT ON TABLE ai_chat_messages   IS 'eLogix HRMS: Individual messages in AI chat sessions';
COMMENT ON TABLE ai_usage_logs      IS 'eLogix HRMS: Monthly AI credit usage tracking per company';
COMMENT ON TABLE ai_knowledge_base  IS 'eLogix HRMS: Company HR knowledge for AI context injection';

-- Done
SELECT 'eLogix AI Chat tables created successfully' AS status;
