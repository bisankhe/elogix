-- ================================================================
-- FILE: database/schemas/integration_hub_schema.sql
-- NepHR Pro -- Integration Hub
-- (System Administration > Integration & API > Integration Hub)
--
-- GAP CONFIRMED BEFORE WRITING:
--   integration_api_schema.sql has:
--     third_party_integrations    -- generic API connector registry
--     integration_field_mappings  -- field-mapping drift detection
--     email_sms_gateways          -- SMTP/Twilio credentials
--     certified_message_log       -- delivery proof
--   workflow_automation_schema.sql has:
--     notification_type_configs   -- channel types (email/sms/push)
--
-- WHAT IS MISSING (all genuinely new tables, no duplicates):
--   1. integration_hub_platforms  -- WhatsApp Business, Teams, Slack,
--        Zoom, Google Meet, Gmail, Outlook, Discord connector configs
--        (different from third_party_integrations which is for generic
--        REST API connectors like ATS, LMS, ERP -- not collaboration
--        tools with OAuth/webhook-specific auth flows)
--   2. integration_hub_credentials -- OAuth tokens, bot tokens, webhook
--        URLs per tenant per platform (encrypted, never stored plain)
--   3. hr_event_routing_rules -- which HR events (leave approved,
--        payroll run, interview scheduled...) trigger a message on
--        which platforms to which recipients -- the "automation" brain
--   4. integration_hub_message_log -- delivery audit: what sent,
--        to whom, on which platform, outcome (delivered/failed/read)
--   5. integration_hub_meeting_links -- meeting auto-creation log:
--        interview scheduled → Zoom/Teams/Google Meet link auto-created
--        and sent to all participants
-- PostgreSQL 15+
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. PLATFORM REGISTRY -- the collaboration tools we support.
-- Inserted once globally; tenants connect/disconnect, but the
-- platform definitions themselves are maintained by the operator.
-- ================================================================
CREATE TABLE IF NOT EXISTS integration_hub_platforms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_key    VARCHAR(50) UNIQUE NOT NULL,   -- 'whatsapp','teams','slack','zoom','google_meet','gmail','outlook','discord'
    display_name    VARCHAR(100) NOT NULL,
    category        VARCHAR(30) CHECK (category IN ('messaging','video','email','all-in-one')),
    auth_type       VARCHAR(30) CHECK (auth_type IN ('oauth2','api_key','webhook','bot_token','smtp')),
    -- What this platform can do in the context of NepHR Pro
    supports_dm     BOOLEAN DEFAULT TRUE,   -- direct messages to individuals
    supports_channel BOOLEAN DEFAULT FALSE, -- posting to a team channel/workspace
    supports_meeting BOOLEAN DEFAULT FALSE, -- auto-creating meeting links
    supports_email  BOOLEAN DEFAULT FALSE,  -- sending actual email (Gmail/Outlook)
    icon_emoji      VARCHAR(10),
    docs_url        VARCHAR(500),
    priority_rating SMALLINT DEFAULT 3      -- 5 = highest priority per brief
);

INSERT INTO integration_hub_platforms
    (platform_key, display_name, category, auth_type, supports_dm, supports_channel, supports_meeting, supports_email, icon_emoji, priority_rating)
VALUES
    ('whatsapp',    'WhatsApp Business',  'messaging',  'api_key',   TRUE,  FALSE, FALSE, FALSE, '💬', 5),
    ('teams',       'Microsoft Teams',    'all-in-one', 'oauth2',    TRUE,  TRUE,  TRUE,  FALSE, '🟦', 5),
    ('slack',       'Slack',              'messaging',  'oauth2',    TRUE,  TRUE,  FALSE, FALSE, '💜', 5),
    ('zoom',        'Zoom',               'video',      'oauth2',    FALSE, FALSE, TRUE,  FALSE, '📹', 5),
    ('google_meet', 'Google Meet',        'video',      'oauth2',    FALSE, FALSE, TRUE,  FALSE, '📞', 4),
    ('gmail',       'Gmail',              'email',      'oauth2',    FALSE, FALSE, FALSE, TRUE,  '📧', 4),
    ('outlook',     'Microsoft Outlook',  'email',      'oauth2',    FALSE, FALSE, FALSE, TRUE,  '📨', 4),
    ('discord',     'Discord',            'messaging',  'bot_token', TRUE,  TRUE,  FALSE, FALSE, '🎮', 3)
ON CONFLICT (platform_key) DO NOTHING;

-- ================================================================
-- 2. TENANT CREDENTIALS -- OAuth tokens, API keys, webhook secrets
-- per company per platform. Encrypted at rest (Fernet, same key
-- used in backend/utils/encryption.py). One row per platform per
-- tenant -- a tenant either has it connected or not.
-- ================================================================
CREATE TABLE IF NOT EXISTS integration_hub_credentials (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL,
    platform_key    VARCHAR(50) NOT NULL REFERENCES integration_hub_platforms(platform_key),
    status          VARCHAR(20) DEFAULT 'disconnected'
                    CHECK (status IN ('connected','disconnected','error','pending_auth')),

    -- Encrypted credential payload (JSON, encrypted with Fernet)
    -- Shape varies by platform:
    --   whatsapp:   { "api_key": "...", "phone_number_id": "...", "business_account_id": "..." }
    --   teams/slack: { "access_token": "...", "refresh_token": "...", "team_id": "...", "bot_user_id": "..." }
    --   zoom:       { "access_token": "...", "refresh_token": "...", "account_id": "..." }
    --   google_meet/gmail: { "access_token": "...", "refresh_token": "...", "client_id": "...", "calendar_id": "..." }
    --   outlook:    { "access_token": "...", "refresh_token": "...", "tenant_id": "...", "client_id": "..." }
    --   discord:    { "bot_token": "...", "guild_id": "...", "default_channel_id": "..." }
    credentials_enc TEXT,       -- Fernet-encrypted JSON, never plain text

    -- Config (non-secret, not encrypted)
    default_channel VARCHAR(200),   -- Teams channel name, Slack channel ID, Discord channel
    webhook_url     VARCHAR(1000),  -- Outbound webhook for platforms that use it
    connected_at    TIMESTAMPTZ,
    connected_by    UUID REFERENCES employees(id),
    last_verified   TIMESTAMPTZ,
    error_message   TEXT,

    UNIQUE (company_id, platform_key)
);
CREATE INDEX IF NOT EXISTS idx_ihc_company ON integration_hub_credentials(company_id, status);

-- ================================================================
-- 3. HR EVENT ROUTING RULES -- the automation brain.
-- "When leave_approved happens, send a message to the employee
-- on whatsapp AND to their manager on teams".
-- ================================================================
CREATE TABLE IF NOT EXISTS hr_event_routing_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,   -- NULL = global default for all tenants

    -- Which HR event triggers this rule
    event_key       VARCHAR(100) NOT NULL,   -- see HR_EVENT_KEYS insert below
    event_label     VARCHAR(200),

    -- Which platforms to send on (array -- can be multiple)
    platforms       VARCHAR(50)[] NOT NULL DEFAULT '{}',

    -- Who receives it
    recipient_type  VARCHAR(30) CHECK (recipient_type IN
        ('employee','manager','hr_team','department_head','all_stakeholders','custom_channel')),
    custom_channel  VARCHAR(200),   -- Teams channel, Slack channel ID, Discord channel ID

    -- Message template (supports {employee_name}, {leave_type}, {date}, etc.)
    message_template TEXT NOT NULL,

    -- For video meeting events -- auto-create a meeting link
    auto_create_meeting BOOLEAN DEFAULT FALSE,
    meeting_platform VARCHAR(50) REFERENCES integration_hub_platforms(platform_key),

    is_active       BOOLEAN DEFAULT TRUE,
    created_by      UUID REFERENCES employees(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_herr_event ON hr_event_routing_rules(event_key, company_id);

-- Seed: the HR events this platform can notify about (global defaults)
-- company_id NULL = global template every tenant gets on first setup
INSERT INTO hr_event_routing_rules
    (event_key, event_label, platforms, recipient_type, message_template, auto_create_meeting, is_active)
VALUES
    -- Leave
    ('leave_approved',      'Leave Approved',           ARRAY['whatsapp','teams','slack'],      'employee',       'Hi {employee_name}, your {leave_type} leave from {start_date} to {end_date} has been approved by {approver_name}. Enjoy your time off!', FALSE, TRUE),
    ('leave_rejected',      'Leave Rejected',           ARRAY['whatsapp','teams'],              'employee',       'Hi {employee_name}, your {leave_type} leave request for {start_date} has been declined. Reason: {reason}. Please contact HR for more information.', FALSE, TRUE),
    ('leave_pending',       'Leave Awaiting Approval',  ARRAY['teams','slack'],                 'manager',        '{employee_name} has requested {leave_type} leave from {start_date} to {end_date}. Please review and approve in NepHR Pro.', FALSE, TRUE),
    -- Attendance
    ('attendance_regularized', 'Attendance Regularized', ARRAY['whatsapp'],                    'employee',       'Hi {employee_name}, your attendance for {date} has been regularized successfully.', FALSE, TRUE),
    ('missed_punch_submitted', 'Missed Punch Submitted', ARRAY['teams','slack'],               'manager',        '{employee_name} submitted a missed punch correction for {date}. Please review.', FALSE, TRUE),
    -- Payroll
    ('payslip_generated',   'Payslip Generated',        ARRAY['whatsapp','email'],             'employee',       'Hi {employee_name}, your payslip for {month} {year} is ready. Please log in to NepHR Pro to download it.', FALSE, TRUE),
    ('payroll_approved',    'Payroll Run Approved',      ARRAY['teams','slack'],                'hr_team',        'Payroll for {month} {year} has been approved by {approver_name}. Salary disbursement is scheduled for {disbursement_date}.', FALSE, TRUE),
    -- Recruitment
    ('interview_scheduled', 'Interview Scheduled',       ARRAY['teams','zoom','google_meet','whatsapp'], 'employee', 'Hi {candidate_name}, your interview for {job_title} at {company_name} is scheduled on {interview_date} at {interview_time}. {meeting_link}', TRUE, TRUE),
    ('offer_released',      'Offer Letter Released',     ARRAY['whatsapp','email'],             'employee',       'Hi {candidate_name}, congratulations! Your offer letter for {job_title} has been released. Please log in to review and accept it.', FALSE, TRUE),
    ('offer_accepted',      'Offer Accepted',            ARRAY['teams','slack'],                'hr_team',        '{candidate_name} has accepted the offer for {job_title}. Onboarding date: {joining_date}.', FALSE, TRUE),
    -- Onboarding
    ('joining_confirmed',   'New Joiner Confirmed',      ARRAY['teams','slack'],                'department_head','New team member {employee_name} joins {department} on {joining_date}. Please prepare for their onboarding.', FALSE, TRUE),
    -- Performance
    ('appraisal_due',       'Appraisal Review Due',      ARRAY['teams','slack','whatsapp'],     'manager',        'Performance appraisal review for {employee_name} is due by {due_date}. Please complete it in NepHR Pro.', FALSE, TRUE),
    ('appraisal_completed', 'Appraisal Completed',       ARRAY['whatsapp','teams'],             'employee',       'Hi {employee_name}, your performance appraisal for {period} has been completed. Log in to view your review.', FALSE, TRUE),
    -- Documents & Certificates
    ('certificate_generated','Certificate Generated',    ARRAY['whatsapp','email'],             'employee',       'Hi {employee_name}, your {certificate_type} certificate has been generated and is ready for download in NepHR Pro.', FALSE, TRUE),
    ('document_ready',      'Document Ready',            ARRAY['whatsapp'],                     'employee',       'Hi {employee_name}, your {document_type} is ready. Please log in to NepHR Pro to download it.', FALSE, TRUE),
    -- Approvals (generic)
    ('approval_required',   'Approval Required',         ARRAY['teams','slack','whatsapp'],     'manager',        '{requester_name} has submitted a {request_type} request that requires your approval. Please review it in NepHR Pro.', FALSE, TRUE),
    ('approval_completed',  'Request Approved',          ARRAY['whatsapp'],                     'employee',       'Hi {employee_name}, your {request_type} request has been approved by {approver_name}.', FALSE, TRUE),
    -- Meetings & Webinars
    ('meeting_scheduled',   'Meeting / Webinar Scheduled',ARRAY['teams','zoom','google_meet','slack'], 'all_stakeholders', 'Meeting: {meeting_title} is scheduled on {meeting_date} at {meeting_time}. {meeting_link}', TRUE, TRUE),
    -- Announcements
    ('hr_announcement',     'HR Announcement',           ARRAY['teams','slack','discord','whatsapp'], 'all_stakeholders', '{announcement_title}: {announcement_body}', FALSE, TRUE),
    ('holiday_announced',   'Holiday Announced',         ARRAY['teams','slack','discord','whatsapp'], 'all_stakeholders', 'Public Holiday: {holiday_name} on {holiday_date}. The office will be closed. Enjoy!', FALSE, TRUE),
    -- Exit
    ('resignation_submitted','Resignation Submitted',    ARRAY['teams'],                        'hr_team',        '{employee_name} ({designation}) has submitted their resignation. Last working day: {last_working_day}. Please initiate the offboarding process.', FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- ================================================================
-- 4. MESSAGE DELIVERY LOG -- full audit trail of every message sent
-- through the Integration Hub. Immutable (append-only enforced via
-- trigger). Reuses the audit_log pattern from system_settings_schema
-- for consistency but keeps a separate table here since the volume
-- (one row per notification per user) would overwhelm the audit_log.
-- ================================================================
CREATE TABLE IF NOT EXISTS integration_hub_message_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,
    rule_id         UUID REFERENCES hr_event_routing_rules(id),
    event_key       VARCHAR(100),
    platform_key    VARCHAR(50),

    recipient_employee_id UUID REFERENCES employees(id),
    recipient_contact VARCHAR(200),   -- phone/email/slack-user-id -- never stored long-term for PII reasons

    message_body    TEXT,
    status          VARCHAR(20) DEFAULT 'sent'
                    CHECK (status IN ('sent','delivered','failed','read')),
    provider_message_id VARCHAR(500),   -- WhatsApp message ID, Teams message ID, etc.
    error_message   TEXT,
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ihml_company ON integration_hub_message_log(company_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_ihml_employee ON integration_hub_message_log(recipient_employee_id, sent_at DESC);
-- Append-only
CREATE OR REPLACE RULE no_update_hub_log AS ON UPDATE TO integration_hub_message_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_hub_log AS ON DELETE TO integration_hub_message_log DO INSTEAD NOTHING;

-- ================================================================
-- 5. MEETING LINKS LOG -- whenever an HR event auto-creates a
-- meeting (interview scheduled, webinar, team meeting), the created
-- link is stored here, linked back to the originating event and
-- message log entry for full traceability.
-- ================================================================
CREATE TABLE IF NOT EXISTS integration_hub_meeting_links (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID,
    platform_key    VARCHAR(50) REFERENCES integration_hub_platforms(platform_key),
    event_key       VARCHAR(100),
    event_reference_id UUID,   -- references the source record (interview_id, meeting_id, etc.)

    meeting_title   VARCHAR(500),
    meeting_link    TEXT NOT NULL,
    meeting_id      VARCHAR(500),   -- Zoom meeting ID, Teams meeting ID
    scheduled_at    TIMESTAMPTZ,
    duration_minutes INT,
    participants    JSONB,   -- [{employee_id, name, email, role}]
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES employees(id)
);
