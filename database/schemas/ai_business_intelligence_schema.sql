-- ================================================================
-- FILE: database/schemas/ai_business_intelligence_schema.sql
-- NepHR Pro -- AI Business Intelligence / AI Chatbot
-- (Dashboard & Workspace > AI Assistant > AI Business Intelligence)
--
-- CONFIRMED GAP: ai-hr-chatbot sidebar entry existed with no
-- backing page, no route, and no database tables anywhere.
-- ai_context.py builds context for page-level AI calls but there is
-- no conversational AI session/message persistence, no RAG document
-- store, no voice/MOM log, no generated-artifact registry, and no
-- multi-tenant isolation for AI knowledge bases.
-- This schema closes ALL of those gaps. PostgreSQL 15+ / pgvector.
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for text search on messages
-- Note: CREATE EXTENSION vector requires pgvector; fallback to JSONB
-- for embeddings if pgvector not installed in this environment.

-- ================================================================
-- 1. AI SESSIONS -- one per conversation / task context
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    employee_id     UUID NOT NULL REFERENCES employees(id),

    session_type    VARCHAR(40) DEFAULT 'chat' CHECK (session_type IN (
        'chat',             -- general conversational BI
        'mom',              -- minutes of meeting generation
        'document',         -- letter/report/proposal generation
        'analysis',         -- strategic HR data analysis
        'presentation',     -- slide deck generation
        'workflow',         -- agentic plan-mode workflow
        'voice_command'     -- pure voice-initiated session
    )),

    title           VARCHAR(500),       -- AI-generated from first message
    language        VARCHAR(10) DEFAULT 'en',   -- detected/preferred language
    model_used      VARCHAR(100),       -- claude-sonnet-4-6, etc.
    persona         VARCHAR(50),        -- 'executive','hr_manager','department_head'

    -- Plan Mode (agentic workflow): breakdown of a multi-step goal
    plan_goal       TEXT,
    plan_steps      JSONB,              -- [{step, description, status, output}]
    plan_status     VARCHAR(20) DEFAULT 'draft'
                    CHECK (plan_status IN ('draft','in_progress','completed','cancelled')),

    -- Metrics
    total_messages  INT DEFAULT 0,
    total_tokens    INT DEFAULT 0,
    total_cost_usd  NUMERIC(10,6) DEFAULT 0,

    is_pinned       BOOLEAN DEFAULT FALSE,
    is_archived     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ais_employee ON ai_sessions(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ais_company ON ai_sessions(company_id, session_type);

-- ================================================================
-- 2. AI MESSAGES -- every turn in the conversation
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL,
    employee_id     UUID NOT NULL REFERENCES employees(id),

    role            VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system','tool')),
    content         TEXT NOT NULL,
    content_type    VARCHAR(30) DEFAULT 'text' CHECK (content_type IN (
        'text', 'voice_transcript', 'file_analysis',
        'strategic_report', 'mom_draft', 'document_draft',
        'plan_output', 'image_analysis', 'tool_result'
    )),

    -- Input modality
    input_mode      VARCHAR(20) CHECK (input_mode IN ('text','voice','file','multimodal')),

    -- Attachments (files the user uploaded for this message)
    attachments     JSONB,   -- [{filename, type, size, storage_url, extracted_text}]

    -- AI metadata
    model_used      VARCHAR(100),
    prompt_tokens   INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    latency_ms      INT,

    -- Voice
    voice_audio_url TEXT,       -- if user spoke this message
    tts_audio_url   TEXT,       -- AI's spoken response (TTS output URL)

    -- RAG citations: which KB documents were used
    rag_citations   JSONB,   -- [{doc_id, title, excerpt, relevance_score}]

    -- Generated artifact (if AI produced a document/image/plan)
    artifact_id     UUID,       -- references ai_generated_artifacts

    -- Feedback
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    is_hidden       BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aim_session ON ai_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_aim_employee ON ai_messages(employee_id, created_at DESC);

-- Auto-update session message count and timestamp
CREATE OR REPLACE FUNCTION fn_update_session_on_message() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE ai_sessions SET
        total_messages = total_messages + 1,
        total_tokens = total_tokens + COALESCE(NEW.prompt_tokens,0) + COALESCE(NEW.completion_tokens,0),
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;$$;
CREATE TRIGGER trg_session_message
    AFTER INSERT ON ai_messages
    FOR EACH ROW EXECUTE FUNCTION fn_update_session_on_message();

-- ================================================================
-- 3. AI KNOWLEDGE BASE -- company documents for RAG retrieval
--    Each tenant's documents are isolated by company_id.
--    No company can access another company's KB. Enforced at:
--    (a) INSERT: company_id is always from g.company_id (auth context)
--    (b) SELECT: WHERE company_id = :cid in every query
--    (c) Row-Level Security (RLS) policy below as defense-in-depth
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,

    doc_type        VARCHAR(40) CHECK (doc_type IN (
        'hr_policy','labour_law','employee_handbook','job_description',
        'meeting_transcript','company_announcement','training_material',
        'org_chart','performance_template','payroll_rule','custom'
    )),
    title           VARCHAR(500) NOT NULL,
    source_filename VARCHAR(500),
    content         TEXT NOT NULL,      -- full extracted text

    -- Embedding stored as JSONB array (pgvector alternative)
    -- In production: use pgvector's vector type for sub-millisecond cosine search
    embedding       JSONB,              -- float array from Claude/OpenAI embedding API
    embedding_model VARCHAR(100),

    -- Chunking metadata (for large documents split into chunks)
    parent_doc_id   UUID REFERENCES ai_knowledge_base(id),
    chunk_index     INT,
    chunk_total     INT,

    metadata        JSONB,   -- {language, effective_date, jurisdiction, tags[]}
    is_active       BOOLEAN DEFAULT TRUE,
    uploaded_by     UUID REFERENCES employees(id),
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aikb_company ON ai_knowledge_base(company_id, doc_type, is_active);
CREATE INDEX IF NOT EXISTS idx_aikb_text ON ai_knowledge_base USING gin(to_tsvector('english', content));

-- Row-Level Security: defense-in-depth tenant isolation
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS ai_kb_company_isolation
    ON ai_knowledge_base
    USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- ================================================================
-- 4. AI GENERATED ARTIFACTS -- documents, images, MOMs, slides
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_generated_artifacts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID REFERENCES ai_sessions(id),
    company_id      UUID NOT NULL,
    employee_id     UUID REFERENCES employees(id),

    artifact_type   VARCHAR(40) NOT NULL CHECK (artifact_type IN (
        'mom',              -- minutes of meeting
        'strategic_report', -- full strategic analysis report
        'letter',           -- HR letter, offer letter, etc.
        'proposal',         -- business proposal
        'presentation',     -- slide deck outline/content
        'email',            -- email draft
        'image',            -- AI-generated image description/prompt
        'spreadsheet',      -- data table / analysis
        'workflow_plan',    -- agentic plan-mode output
        'policy_draft',     -- draft HR policy
        'job_description',  -- AI-written JD
        'custom'
    )),

    title           VARCHAR(500),
    content         TEXT NOT NULL,      -- markdown/HTML content
    format          VARCHAR(20) DEFAULT 'markdown'
                    CHECK (format IN ('markdown','html','json','csv','plain')),

    -- Source context: what triggered this artifact
    trigger_event   VARCHAR(200),   -- e.g. 'interview_scheduled', 'voice_command'
    source_files    JSONB,          -- files the AI read to produce this

    -- Export status
    exported_as     VARCHAR(20),    -- 'pdf','docx','pptx'
    export_url      TEXT,

    -- Sharing
    is_shared       BOOLEAN DEFAULT FALSE,
    shared_with     UUID[],         -- employee_ids who can view
    share_token     VARCHAR(100) UNIQUE,   -- public share link token

    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aiga_session ON ai_generated_artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_aiga_company ON ai_generated_artifacts(company_id, artifact_type);

-- ================================================================
-- 5. VOICE SESSIONS -- voice command log (STT/TTS records)
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_voice_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id      UUID REFERENCES ai_messages(id),
    company_id      UUID NOT NULL,
    employee_id     UUID REFERENCES employees(id),

    audio_input_url TEXT,           -- uploaded voice file
    transcript      TEXT,           -- STT result
    detected_language VARCHAR(10),
    confidence_score NUMERIC(4,3),

    tts_response_url TEXT,          -- AI spoken response
    tts_voice       VARCHAR(50) DEFAULT 'nova',
    tts_language    VARCHAR(10),

    duration_seconds NUMERIC(8,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 6. AI WORKFLOW RECIPES -- saved reusable agentic workflows
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_workflow_recipes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,   -- NULL = global template
    created_by      UUID REFERENCES employees(id),

    name            VARCHAR(300) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) CHECK (category IN (
        'reporting','onboarding','offboarding','performance',
        'recruitment','compliance','payroll','engagement','custom'
    )),
    icon_emoji      VARCHAR(10),

    -- The workflow definition
    trigger_type    VARCHAR(40),    -- 'manual','schedule','event','voice'
    steps           JSONB NOT NULL, -- [{order, name, type, prompt, tool, condition}]
    output_type     VARCHAR(40),    -- artifact_type from ai_generated_artifacts

    -- Usage stats
    run_count       INT DEFAULT 0,
    last_run_at     TIMESTAMPTZ,

    is_active       BOOLEAN DEFAULT TRUE,
    is_public       BOOLEAN DEFAULT FALSE,  -- shared across company
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- Seed global recipe templates
INSERT INTO ai_workflow_recipes (name, description, category, icon_emoji, trigger_type, steps, output_type, is_public) VALUES
    ('Generate Minutes of Meeting',
     'Upload or paste meeting notes/transcript, get professional MOM with action items and owners.',
     'reporting', '📝', 'manual',
     '[{"order":1,"name":"Extract participants","type":"analysis"},{"order":2,"name":"Identify action items","type":"analysis"},{"order":3,"name":"Draft MOM","type":"generate"},{"order":4,"name":"Review and export","type":"review"}]',
     'mom', TRUE),
    ('Monthly HR Strategic Report',
     'Pull HR KPIs from all modules and generate a full strategic analysis report for management.',
     'reporting', '📊', 'schedule',
     '[{"order":1,"name":"Pull HR metrics","type":"data_fetch"},{"order":2,"name":"Analyze trends","type":"analysis"},{"order":3,"name":"Generate report","type":"generate"},{"order":4,"name":"Distribute","type":"action"}]',
     'strategic_report', TRUE),
    ('New Employee Onboarding Pack',
     'Generate personalized onboarding checklist, welcome letter, and first-week schedule.',
     'onboarding', '👋', 'event',
     '[{"order":1,"name":"Fetch employee profile","type":"data_fetch"},{"order":2,"name":"Generate welcome letter","type":"generate"},{"order":3,"name":"Create onboarding checklist","type":"generate"},{"order":4,"name":"Send to employee","type":"action"}]',
     'letter', TRUE),
    ('Attrition Risk Strategic Brief',
     'Analyze flight-risk employees and generate an executive brief with recommended interventions.',
     'reporting', '⚠️', 'schedule',
     '[{"order":1,"name":"Run attrition model","type":"ml_analysis"},{"order":2,"name":"Identify high-risk cohorts","type":"analysis"},{"order":3,"name":"Draft executive brief","type":"generate"},{"order":4,"name":"Share with HR Manager","type":"action"}]',
     'strategic_report', TRUE),
    ('Job Description Generator',
     'Generate a complete, bias-checked job description from a role title and department.',
     'recruitment', '💼', 'manual',
     '[{"order":1,"name":"Fetch role requirements","type":"data_fetch"},{"order":2,"name":"Write JD draft","type":"generate"},{"order":3,"name":"Bias check","type":"analysis"},{"order":4,"name":"Finalize","type":"review"}]',
     'job_description', TRUE)
ON CONFLICT DO NOTHING;

-- ================================================================
-- 7. AI USAGE ANALYTICS -- per-tenant per-employee usage metrics
-- ================================================================
CREATE TABLE IF NOT EXISTS ai_usage_analytics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    employee_id     UUID REFERENCES employees(id),
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    sessions        INT DEFAULT 0,
    messages        INT DEFAULT 0,
    tokens          INT DEFAULT 0,
    artifacts_generated INT DEFAULT 0,
    voice_minutes   NUMERIC(8,2) DEFAULT 0,
    estimated_cost_usd NUMERIC(10,6) DEFAULT 0,
    UNIQUE (company_id, employee_id, date)
);
