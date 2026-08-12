// FILE: ATSAPIIntegrationsPage.jsx — API Integration Hub
// LinkedIn, Facebook, Indeed, Naukri, MeroJob, JobAxle, WhatsApp, Email,
// Instagram, Twitter/X, Google Jobs, Glassdoor, SMS, DocuSign, Calendar
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const INTEGRATIONS = [
  // ── JOB PLATFORMS ──────────────────────────────────────────
  { id: 'linkedin',  group: 'Job Platforms', name: 'LinkedIn Jobs',      icon: '🔗', color: '#0077b5', status: 'Connected',
    capabilities: ['Post jobs automatically', 'Import candidate CVs', 'InMail outreach', 'Easy Apply integration', 'Company Page sync'],
    stats: { jobs_posted: 12, candidates: 284, hires: 8, last_sync: '2 min ago' },
    fields: [{ k: 'access_token', l: 'Access Token', ph: 'Bearer eyJ0eXAiOiJKV1Q...', type: 'password' }, { k: 'org_id', l: 'Organization ID', ph: '123456789', type: 'text' }],
    docs: 'https://developer.linkedin.com/docs/guide/v2/jobs',
    webhook_url: 'https://api.elogix.com/ats/webhooks/linkedin',
    auto_features: ['Auto-post job on publish', 'Auto-import new applications every 15 min', 'Auto-notify candidates of status changes'] },

  { id: 'indeed',    group: 'Job Platforms', name: 'Indeed',             icon: '🔍', color: '#2164f3', status: 'Connected',
    capabilities: ['Job feed posting', 'Sponsored job ads', 'Resume database search', 'Webhook for applications', 'Analytics'],
    stats: { jobs_posted: 10, candidates: 196, hires: 5, last_sync: '5 min ago' },
    fields: [{ k: 'publisher_id', l: 'Publisher ID', ph: 'pub-1234567890abcdef', type: 'text' }, { k: 'api_token', l: 'API Token', ph: 'ind_***', type: 'password' }],
    docs: 'https://opensource.indeedeng.io/api-documentation',
    webhook_url: 'https://api.elogix.com/ats/webhooks/indeed',
    auto_features: ['Auto-post to Indeed on job publish', 'Auto-sync applications every 30 min'] },

  { id: 'naukri',    group: 'Job Platforms', name: 'Naukri.com',         icon: '📋', color: '#4a90e2', status: 'Connected',
    capabilities: ['Post jobs to Naukri India/Nepal', 'CV database access', 'Recruiter tools', 'Application tracking', 'Resdex search'],
    stats: { jobs_posted: 8, candidates: 142, hires: 3, last_sync: '10 min ago' },
    fields: [{ k: 'api_key', l: 'API Key', ph: 'naukri_***', type: 'password' }, { k: 'client_id', l: 'Client ID', ph: 'your-client-id', type: 'text' }],
    docs: 'https://developer.naukri.com',
    webhook_url: 'https://api.elogix.com/ats/webhooks/naukri',
    auto_features: ['Auto-post jobs', 'Resdex CV auto-import based on job keywords'] },

  { id: 'merojob',   group: 'Job Platforms', name: 'MeroJob Nepal',      icon: '🇳🇵', color: '#c0392b', status: 'Connected',
    capabilities: ['Nepal-specific job posting', 'CV bank access', 'SMS alerts to candidates', 'Featured listings', 'Daily digest'],
    stats: { jobs_posted: 15, candidates: 89, hires: 4, last_sync: '15 min ago' },
    fields: [{ k: 'api_key', l: 'MeroJob API Key', ph: 'mj_live_***', type: 'password' }, { k: 'employer_id', l: 'Employer ID', ph: 'emp-123', type: 'text' }],
    docs: 'https://merojob.com/api-docs',
    webhook_url: 'https://api.elogix.com/ats/webhooks/merojob',
    auto_features: ['Auto-post to MeroJob', 'Auto-receive CV applications', 'SMS candidate alerts'] },

  { id: 'jobaxle',   group: 'Job Platforms', name: 'JobAxle Nepal',      icon: '⚙️', color: '#8e44ad', status: 'Connected',
    capabilities: ['Nepal job market posting', 'Resume import', 'SMS alerts', 'Featured ads', 'Application management'],
    stats: { jobs_posted: 6, candidates: 67, hires: 2, last_sync: '20 min ago' },
    fields: [{ k: 'api_key', l: 'API Key', ph: 'ja_***', type: 'password' }],
    docs: 'https://jobaxle.com/api-docs',
    webhook_url: 'https://api.elogix.com/ats/webhooks/jobaxle',
    auto_features: ['Auto-publish jobs', 'Auto-import applications'] },

  { id: 'glassdoor', group: 'Job Platforms', name: 'Glassdoor',          icon: '🪟', color: '#0caa41', status: 'Disconnected',
    capabilities: ['Job posting', 'Employer brand pages', 'Interview reviews', 'Salary insights', 'Culture analytics'],
    stats: { jobs_posted: 0, candidates: 0, hires: 0, last_sync: 'Never' },
    fields: [{ k: 'partner_id', l: 'Partner ID', ph: 'partner-***', type: 'text' }, { k: 'api_key', l: 'API Key', ph: 'gd_***', type: 'password' }],
    docs: 'https://www.glassdoor.com/developer',
    webhook_url: 'https://api.elogix.com/ats/webhooks/glassdoor',
    auto_features: ['Post jobs to Glassdoor', 'Track employer reviews'] },

  // ── SOCIAL MEDIA ────────────────────────────────────────────
  { id: 'facebook',  group: 'Social Media', name: 'Facebook Jobs',       icon: '📘', color: '#1877f2', status: 'Connected',
    capabilities: ['Post jobs to Facebook Page', 'Facebook Jobs marketplace', 'Instagram cross-post', 'Messenger auto-reply bot', 'WhatsApp Business via Meta'],
    stats: { jobs_posted: 14, candidates: 118, hires: 6, last_sync: '3 min ago' },
    fields: [{ k: 'page_access_token', l: 'Page Access Token', ph: 'EAA***', type: 'password' }, { k: 'page_id', l: 'Facebook Page ID', ph: '123456789012345', type: 'text' }, { k: 'ig_account_id', l: 'Instagram Account ID', ph: '17841400000000000', type: 'text' }],
    docs: 'https://developers.facebook.com/docs/pages/jobs',
    webhook_url: 'https://api.elogix.com/ats/webhooks/facebook',
    auto_features: ['Auto-post job to Facebook + Instagram', 'Auto-reply DMs with application link', 'Auto-collect Facebook job applications'] },

  { id: 'twitter',   group: 'Social Media', name: 'Twitter / X',         icon: '🐦', color: '#000000', status: 'Connected',
    capabilities: ['Tweet job openings', 'Hashtag targeting', 'Auto job thread', 'DM candidates', 'Analytics'],
    stats: { jobs_posted: 8, candidates: 34, hires: 1, last_sync: '1 hr ago' },
    fields: [{ k: 'api_key', l: 'API Key', ph: 'x_api_key_***', type: 'password' }, { k: 'bearer_token', l: 'Bearer Token', ph: 'AAAA***', type: 'password' }],
    docs: 'https://developer.twitter.com/en/docs',
    webhook_url: 'https://api.elogix.com/ats/webhooks/twitter',
    auto_features: ['Auto-tweet job openings with hashtags', 'Thread with job details'] },

  { id: 'google',    group: 'Social Media', name: 'Google Jobs / Search', icon: '🔎', color: '#4285f4', status: 'Connected',
    capabilities: ['Google Jobs schema markup', 'Google Search indexing', 'Google for Jobs integration', 'Analytics data', 'Rich results'],
    stats: { jobs_posted: 12, candidates: 203, hires: 7, last_sync: '30 min ago' },
    fields: [{ k: 'site_url', l: 'Career Site URL', ph: 'https://yourcompany.com/careers', type: 'text' }, { k: 'search_console_key', l: 'Search Console API Key', ph: 'GSC_***', type: 'password' }],
    docs: 'https://developers.google.com/search/docs/appearance/structured-data/job-posting',
    webhook_url: 'https://api.elogix.com/ats/webhooks/google',
    auto_features: ['Auto structured data for Google Jobs', 'Real-time job indexing ping', 'Search Console monitoring'] },

  // ── COMMUNICATION ────────────────────────────────────────────
  { id: 'whatsapp',  group: 'Communication', name: 'WhatsApp Business',   icon: '💬', color: '#25d366', status: 'Connected',
    capabilities: ['Send application confirmations', 'Interview invites & reminders', 'Offer letter notifications', 'Status updates at each stage', 'Bulk messaging'],
    stats: { messages_sent: 1284, templates_active: 12, delivery_rate: 98.2, last_sync: '1 min ago' },
    fields: [{ k: 'access_token', l: 'WhatsApp Access Token', ph: 'EAA***', type: 'password' }, { k: 'phone_number_id', l: 'Phone Number ID', ph: '123456789012345', type: 'text' }, { k: 'business_account_id', l: 'Business Account ID', ph: '987654321098765', type: 'text' }],
    docs: 'https://developers.facebook.com/docs/whatsapp',
    webhook_url: 'https://api.elogix.com/ats/webhooks/whatsapp',
    auto_features: ['Application received confirmation', 'Shortlist notification', 'Exam invite with link', 'Video interview invite', 'Interview schedule', 'Offer letter notification', 'Rejection (professional)', 'Joining reminder'] },

  { id: 'email',     group: 'Communication', name: 'Email (SMTP / SendGrid)', icon: '📧', color: '#1a73e8', status: 'Connected',
    capabilities: ['HTML email templates', 'SendGrid transactional', 'Custom SMTP', 'Email tracking (open/click)', 'Bounce handling'],
    stats: { emails_sent: 3847, open_rate: 68.4, click_rate: 24.1, last_sync: '30 sec ago' },
    fields: [{ k: 'sendgrid_key', l: 'SendGrid API Key', ph: 'SG.***', type: 'password' }, { k: 'from_email', l: 'From Email', ph: 'hr@yourcompany.com', type: 'text' }, { k: 'from_name', l: 'From Name', ph: 'eLogix Recruitment Team', type: 'text' }],
    docs: 'https://docs.sendgrid.com',
    webhook_url: 'https://api.elogix.com/ats/webhooks/email-events',
    auto_features: ['All stage transition emails', 'HTML branded templates', 'Bulk campaign support'] },

  { id: 'sms',       group: 'Communication', name: 'SMS (Twilio / Sparrow)', icon: '📱', color: '#f22f46', status: 'Connected',
    capabilities: ['Nepal SMS via Sparrow SMS', 'International via Twilio', 'OTP for portal login', 'Interview reminders', 'Bulk SMS'],
    stats: { sms_sent: 847, delivery_rate: 96.8, cost_per_sms: 'NPR 0.50', last_sync: '5 min ago' },
    fields: [{ k: 'sparrow_token', l: 'Sparrow SMS Token (Nepal)', ph: 'sparrow_***', type: 'password' }, { k: 'sparrow_identity', l: 'Sender Identity', ph: 'YourBrand', type: 'text' }, { k: 'twilio_sid', l: 'Twilio Account SID (International)', ph: 'AC***', type: 'text' }],
    docs: 'https://api.sparrowsms.com',
    webhook_url: 'https://api.elogix.com/ats/webhooks/sms-events',
    auto_features: ['Interview reminder SMS 2h before', 'Offer notification SMS', 'OTP for candidate portal'] },

  // ── CALENDAR & MEETINGS ──────────────────────────────────────
  { id: 'gcal',      group: 'Calendar & Meetings', name: 'Google Calendar',  icon: '📅', color: '#4285f4', status: 'Connected',
    capabilities: ['Create interview events', 'Auto invite interviewers', 'Candidate calendar invite', 'Conflict detection', 'Google Meet link auto-generate'],
    stats: { events_created: 142, upcoming: 8, last_sync: '1 min ago' },
    fields: [{ k: 'service_account', l: 'Service Account JSON', ph: '{"type":"service_account"...}', type: 'textarea' }, { k: 'calendar_id', l: 'HR Calendar ID', ph: 'hr@yourcompany.com', type: 'text' }],
    docs: 'https://developers.google.com/calendar',
    webhook_url: 'https://api.elogix.com/ats/webhooks/gcal',
    auto_features: ['Auto-create events on panel schedule', 'Auto Google Meet link', 'Auto-invite all panel members'] },

  { id: 'outlook',   group: 'Calendar & Meetings', name: 'Outlook / Microsoft 365', icon: '💼', color: '#0078d4', status: 'Connected',
    capabilities: ['Outlook calendar events', 'Teams meeting link creation', 'Email from Outlook', 'AD/Entra integration', 'OWA access'],
    stats: { events_created: 67, upcoming: 4, last_sync: '2 min ago' },
    fields: [{ k: 'tenant_id', l: 'Azure Tenant ID', ph: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text' }, { k: 'client_id', l: 'App (Client) ID', ph: 'xxxxxxxx-xxxx-...', type: 'text' }, { k: 'client_secret', l: 'Client Secret', ph: 'xxx~***', type: 'password' }],
    docs: 'https://docs.microsoft.com/en-us/graph',
    webhook_url: 'https://api.elogix.com/ats/webhooks/outlook',
    auto_features: ['Teams meeting auto-create', 'Outlook calendar invite to interviewers'] },

  { id: 'zoom',      group: 'Calendar & Meetings', name: 'Zoom',            icon: '🔵', color: '#2D8CFF', status: 'Connected',
    capabilities: ['Create Zoom meetings', 'Send join links to candidates', 'Recording integration', 'Webinar for group interviews', 'Analytics'],
    stats: { meetings_created: 38, recordings: 22, last_sync: '5 min ago' },
    fields: [{ k: 'api_key', l: 'Zoom API Key', ph: 'zoom_***', type: 'password' }, { k: 'account_id', l: 'Account ID', ph: 'abc123***', type: 'text' }],
    docs: 'https://marketplace.zoom.us/docs/api-reference',
    webhook_url: 'https://api.elogix.com/ats/webhooks/zoom',
    auto_features: ['Auto-create Zoom link on interview schedule', 'Sync recordings to candidate profile'] },

  // ── ESIGNATURE & VERIFICATION ────────────────────────────────
  { id: 'docusign',  group: 'eSignature', name: 'DocuSign / eSign',      icon: '✍️', color: '#ffb900', status: 'Connected',
    capabilities: ['Digital offer letter signing', 'Employment contract signing', 'NDA signing', 'Signature tracking', 'Audit trail'],
    stats: { docs_sent: 42, signed: 38, pending: 4, last_sync: '10 min ago' },
    fields: [{ k: 'integration_key', l: 'Integration Key', ph: 'xxxxxxxx-xxxx-...', type: 'password' }, { k: 'account_id', l: 'Account ID', ph: 'your-account-id', type: 'text' }, { k: 'base_url', l: 'Base URL', ph: 'https://demo.docusign.net/restapi', type: 'text' }],
    docs: 'https://developers.docusign.com',
    webhook_url: 'https://api.elogix.com/ats/webhooks/docusign',
    auto_features: ['Auto-send offer letter for signature after HR approval', 'Auto-notify HR when signed', 'Archive signed docs to candidate profile'] },
]

const GROUPS = [...new Set(INTEGRATIONS.map(i => i.group))]
const statusColor = { Connected: '#10b981', Disconnected: '#ef4444', 'In Setup': '#f59e0b' }
const statusBg    = { Connected: '#f0fdf4', Disconnected: '#fef2f2', 'In Setup': '#fffbeb' }

export default function ATSAPIIntegrationsPage() {
  const { navigate } = useApp()
  const [selGroup, setSelGroup] = useState('All')
  const [selInteg, setSelInteg] = useState(INTEGRATIONS[0])
  const [credentials, setCredentials] = useState({})
  const [testResult, setTestResult] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const filtered = selGroup === 'All' ? INTEGRATIONS : INTEGRATIONS.filter(i => i.group === selGroup)
  const connected = INTEGRATIONS.filter(i => i.status === 'Connected').length

  const testConnection = async (id) => {
    setTestResult(t => ({ ...t, [id]: 'testing' }))
    await new Promise(r => setTimeout(r, 1200))
    setTestResult(t => ({ ...t, [id]: Math.random() > 0.1 ? 'success' : 'failed' }))
  }

  const saveCredentials = async (id) => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    notify(`✅ ${INTEGRATIONS.find(i => i.id === id)?.name} credentials saved! Testing connection...`)
    testConnection(id)
  }

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#0891b2)', borderRadius: 14, padding: '16px 22px', marginBottom: 16, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>API Integration Hub</h2>
            <p style={{ margin: '4px 0 0', fontSize: 10, opacity: 0.8 }}>LinkedIn · Facebook · Indeed · Naukri · MeroJob · WhatsApp · Google Jobs · Calendar · DocuSign · Zoom · Teams</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 9, padding: '5px 14px', background: 'rgba(255,255,255,.2)', borderRadius: 8 }}>{msg}</span>}
            <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 9, padding: '7px 14px', fontSize: 11, fontWeight: 800 }}>
              <span style={{ color: '#86efac' }}>{connected}</span>/{INTEGRATIONS.length} Connected
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ l: 'Job Platforms', v: INTEGRATIONS.filter(i => i.group === 'Job Platforms' && i.status === 'Connected').length + '/' + INTEGRATIONS.filter(i => i.group === 'Job Platforms').length, c: '#3b82f6' }, { l: 'Social Media', v: INTEGRATIONS.filter(i => i.group === 'Social Media' && i.status === 'Connected').length + '/' + INTEGRATIONS.filter(i => i.group === 'Social Media').length, c: '#f97316' }, { l: 'Communication', v: INTEGRATIONS.filter(i => i.group === 'Communication' && i.status === 'Connected').length + '/3', c: '#10b981' }, { l: 'Calendar/Meet', v: '3/3', c: '#8b5cf6' }, { l: 'CVs Sourced', v: INTEGRATIONS.reduce((s, i) => s + (i.stats?.candidates || 0), 0), c: '#059669' }].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', border: '1px solid #f1f5f9', flex: '1 1 100px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 8, color: '#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Group filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['All', ...GROUPS].map(g => (
          <button key={g} onClick={() => setSelGroup(g)} style={{ padding: '6px 14px', borderRadius: 9, border: `2px solid ${selGroup === g ? '#0891b2' : '#e2e8f0'}`, background: selGroup === g ? '#ecfeff' : '#fff', color: selGroup === g ? '#0891b2' : '#64748b', fontSize: 10, fontWeight: selGroup === g ? 800 : 400, cursor: 'pointer' }}>{g}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {/* Integration list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.map(integ => {
            const tr = testResult[integ.id]
            return (
              <div key={integ.id} onClick={() => setSelInteg(integ)}
                style={{ background: '#fff', borderRadius: 13, padding: '13px 15px', marginBottom: 8, border: `1.5px solid ${selInteg?.id === integ.id ? '#0891b2' : '#f1f5f9'}`, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: integ.color + '15', border: `1px solid ${integ.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{integ.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>{integ.name}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 8px', borderRadius: 7, background: statusBg[integ.status], color: statusColor[integ.status] }}>{integ.status}</span>
                      <span style={{ fontSize: 7, color: '#94a3b8', padding: '1px 6px', borderRadius: 5, background: '#f8fafc' }}>{integ.group}</span>
                    </div>
                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>
                      {integ.stats?.candidates != null ? `${integ.stats.candidates} CVs · ` : ''}
                      {integ.stats?.messages_sent != null ? `${integ.stats.messages_sent} msgs · ` : ''}
                      {integ.stats?.jobs_posted != null ? `${integ.stats.jobs_posted} jobs posted · ` : ''}
                      {integ.stats?.last_sync ? `Last sync: ${integ.stats.last_sync}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {tr === 'testing' ? <span style={{ fontSize: 8, color: '#f59e0b' }}>⏳ Testing...</span>
                      : tr === 'success' ? <span style={{ fontSize: 8, color: '#10b981', fontWeight: 700 }}>✅ OK</span>
                        : tr === 'failed' ? <span style={{ fontSize: 8, color: '#ef4444', fontWeight: 700 }}>❌ Failed</span>
                          : null}
                    <button onClick={e => { e.stopPropagation(); testConnection(integ.id) }}
                      style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 8, cursor: 'pointer' }}>Test</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Integration detail & config */}
        {selInteg && (
          <div style={{ width: 360, flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', position: 'sticky', top: 0 }}>
              {/* Integ header */}
              <div style={{ background: selInteg.color + '15', borderBottom: `3px solid ${selInteg.color}`, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 28 }}>{selInteg.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{selInteg.name}</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{selInteg.group}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: statusBg[selInteg.status], color: statusColor[selInteg.status] }}>{selInteg.status}</span>
              </div>

              <div style={{ padding: 18, maxHeight: '80vh', overflowY: 'auto' }}>
                {/* Capabilities */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 7 }}>Capabilities</div>
                  {selInteg.capabilities.map(c => (
                    <div key={c} style={{ fontSize: 9, color: '#334155', padding: '3px 0', display: 'flex', gap: 5 }}>
                      <span style={{ color: selInteg.color }}>✓</span> {c}
                    </div>
                  ))}
                </div>

                {/* Auto-features */}
                <div style={{ background: '#f0fdf4', borderRadius: 9, padding: '10px 12px', marginBottom: 14, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#065f46', marginBottom: 6 }}>🤖 Auto-Triggered Actions</div>
                  {selInteg.auto_features?.map(f => (
                    <div key={f} style={{ fontSize: 8, color: '#374151', padding: '2px 0', display: 'flex', gap: 5 }}>
                      <span style={{ color: '#10b981' }}>⚡</span> {f}
                    </div>
                  ))}
                </div>

                {/* Webhook URL */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Webhook URL (paste in platform)</div>
                  <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <code style={{ flex: 1, fontSize: 8, color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all' }}>{selInteg.webhook_url}</code>
                    <button onClick={() => notify('📋 Webhook URL copied!')} style={{ flexShrink: 0, padding: '3px 8px', borderRadius: 5, border: 'none', background: '#334155', color: '#94a3b8', fontSize: 8, cursor: 'pointer' }}>Copy</button>
                  </div>
                </div>

                {/* Credentials */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>API Credentials</div>
                  {selInteg.fields.map(field => (
                    <div key={field.k} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>{field.l}</label>
                      {field.type === 'textarea' ? (
                        <textarea value={credentials[selInteg.id + '_' + field.k] || ''} onChange={e => setCredentials(c => ({ ...c, [selInteg.id + '_' + field.k]: e.target.value }))} placeholder={field.ph} rows={3}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 9, outline: 'none', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
                      ) : (
                        <input type={field.type} value={credentials[selInteg.id + '_' + field.k] || ''} onChange={e => setCredentials(c => ({ ...c, [selInteg.id + '_' + field.k]: e.target.value }))} placeholder={field.ph}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 9, outline: 'none', boxSizing: 'border-box', fontFamily: field.type === 'password' ? 'monospace' : 'system-ui' }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* API docs */}
                <a href={selInteg.docs} target="_blank" rel="noreferrer"
                  style={{ display: 'block', textAlign: 'center', fontSize: 9, color: selInteg.color, marginBottom: 12, padding: '6px', background: selInteg.color + '10', borderRadius: 7, border: `1px solid ${selInteg.color}30`, textDecoration: 'none', fontWeight: 600 }}>
                  📖 View API Documentation →
                </a>

                {/* Stats */}
                {selInteg.stats && (
                  <div style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 12px', marginBottom: 14, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Current Stats</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {Object.entries(selInteg.stats).filter(([k]) => k !== 'last_sync').map(([k, v]) => (
                        <div key={k} style={{ textAlign: 'center', padding: '5px', background: '#fff', borderRadius: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: selInteg.color }}>{v}</div>
                          <div style={{ fontSize: 7, color: '#94a3b8' }}>{k.replace(/_/g, ' ')}</div>
                        </div>
                      ))}
                    </div>
                    {selInteg.stats.last_sync && <div style={{ fontSize: 8, color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>Last sync: {selInteg.stats.last_sync}</div>}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => saveCredentials(selInteg.id)} disabled={saving}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: saving ? '#e2e8f0' : `linear-gradient(135deg,${selInteg.color},${selInteg.color}cc)`, color: saving ? '#94a3b8' : '#fff', fontSize: 9, fontWeight: 800, cursor: saving ? 'default' : 'pointer' }}>
                    {saving ? '⏳ Saving...' : '💾 Save & Connect'}
                  </button>
                  <button onClick={() => testConnection(selInteg.id)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 9, cursor: 'pointer' }}>
                    🔌 Test Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
