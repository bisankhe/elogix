// ATSCommunicationPage.jsx — AI Communication Centre
// All stage-based auto Email + WhatsApp + SMS templates
// AI writer, send history, bulk send, template editor
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800,
        system: sys || 'You are an expert HR communication specialist. Write professional, warm, personalized messages.',
        messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(20000)
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return null

const STAGES = [
  { id:'received',    label:'Application Received',       icon:'📩', color:'#3b82f6' },
  { id:'shortlisted', label:'CV Shortlisted',             icon:'⭐', color:'#8b5cf6' },
  { id:'exam',        label:'Written Test Invitation',    icon:'📝', color:'#0891b2' },
  { id:'video',       label:'Video Interview Invitation', icon:'🎥', color:'#f59e0b' },
  { id:'interview',   label:'Interview Schedule',         icon:'📅', color:'#f97316' },
  { id:'offer',       label:'Offer Letter Sent',          icon:'💼', color:'#059669' },
  { id:'selected',    label:'Selected — Congratulations', icon:'🎉', color:'#10b981' },
  { id:'rejected',    label:'Rejected — Thank You',       icon:'📋', color:'#94a3b8' },
  { id:'joining',     label:'Joining Reminder',           icon:'🚀', color:'#1e40af' },
  { id:'thankyou',    label:'Thank You / Withdraw',       icon:'🙏', color:'#64748b' },
]

const TEMPLATES = {
  received: {
    email: { subject:'We received your application — {JOB_TITLE} | eLogix HRMS', body:`Dear {CANDIDATE_NAME},

Thank you for applying for the position of {JOB_TITLE} at {COMPANY_NAME}.

We have received your application and our AI is currently reviewing your profile. You will hear from us within {X} business days.

In the meantime, you can track your application status here: {PORTAL_LINK}

If you have any questions, feel free to reply to this email or message our AI Assistant on WhatsApp.

Warm regards,
{HR_NAME}
HR Team | {COMPANY_NAME}` },
    whatsapp: `Hi {CANDIDATE_NAME}! 👋

Thank you for applying for *{JOB_TITLE}* at *{COMPANY_NAME}*.

✅ Your application has been received!

Our team will review your profile and get back to you within {X} business days.

Track your status: {PORTAL_LINK}

For queries, reply to this message anytime. 🙏

— {COMPANY_NAME} HR Team`,
    sms: `Hi {CANDIDATE_NAME}, your application for {JOB_TITLE} at {COMPANY_NAME} is received. We will contact you within {X} days. Track: {PORTAL_LINK}`
  },
  shortlisted: {
    email: { subject:'Great news! You have been shortlisted — {JOB_TITLE}', body:`Dear {CANDIDATE_NAME},

We are pleased to inform you that your profile has been shortlisted for the {JOB_TITLE} position at {COMPANY_NAME}!

Your AI Match Score: {AI_SCORE}%

NEXT STEP: {NEXT_STEP}

Please complete this by {DEADLINE}.

We look forward to moving forward with your application!

Best regards,
{HR_NAME}
{COMPANY_NAME}` },
    whatsapp: `🎉 Great news, {CANDIDATE_NAME}!

Your CV has been *shortlisted* for *{JOB_TITLE}* at {COMPANY_NAME}!

Your AI Match Score: *{AI_SCORE}%* ⭐

*Next Step:* {NEXT_STEP}
*Deadline:* {DEADLINE}

Click here to proceed: {LINK}

Good luck! 💪`,
    sms: `Congratulations {CANDIDATE_NAME}! Your CV for {JOB_TITLE} at {COMPANY_NAME} is shortlisted. Next: {NEXT_STEP}. Deadline: {DEADLINE}. {LINK}`
  },
  exam: {
    email: { subject:'Written Test Invitation — {JOB_TITLE} | Action Required', body:`Dear {CANDIDATE_NAME},

Congratulations on being shortlisted for {JOB_TITLE} at {COMPANY_NAME}!

You are invited to complete our online written assessment:

📝 Test Details:
• Duration: {DURATION} minutes
• Sections: MCQ, Coding, Essay
• Link: {TEST_LINK}
• Deadline: {DEADLINE}

Please ensure you are in a quiet environment with a stable internet connection. The test is AI-proctored.

Important:
• Do not use external resources
• Complete in one sitting
• Camera and microphone must be enabled

Best of luck!

{HR_NAME}
{COMPANY_NAME}` },
    whatsapp: `📝 *Written Test Invitation* — {CANDIDATE_NAME}

You have been invited to take the online written assessment for *{JOB_TITLE}* at {COMPANY_NAME}!

⏱ Duration: *{DURATION} minutes*
📅 Deadline: *{DEADLINE}*

🔗 Start your test here: {TEST_LINK}

*Tips:*
✅ Find a quiet space
✅ Stable internet connection
✅ Camera enabled (AI proctoring)

Best of luck! 💪`,
    sms: `{CANDIDATE_NAME}, written test for {JOB_TITLE} at {COMPANY_NAME}. Duration: {DURATION} min. Deadline: {DEADLINE}. Start: {TEST_LINK}`
  },
  interview: {
    email: { subject:'Interview Confirmation — {JOB_TITLE} | {DATE} at {TIME}', body:`Dear {CANDIDATE_NAME},

We are pleased to confirm your interview for {JOB_TITLE} at {COMPANY_NAME}.

📅 Interview Details:
• Date: {DATE}
• Time: {TIME}
• Duration: {DURATION}
• Mode: {MODE}
• {LOCATION_OR_LINK}

Panel: {PANEL_NAMES}

Please prepare:
• Updated CV
• Portfolio / work samples (if applicable)
• Government ID

If you need to reschedule, please contact us at least 24 hours before.

We look forward to meeting you!

{HR_NAME}
{COMPANY_NAME}` },
    whatsapp: `📅 *Interview Confirmation* — {CANDIDATE_NAME}

Your interview for *{JOB_TITLE}* is confirmed!

📆 Date: *{DATE}*
⏰ Time: *{TIME}*
🎥 Mode: *{MODE}*
🔗 {LOCATION_OR_LINK}

Panel: {PANEL_NAMES}

*Reminder will be sent 2 hours before.* ⏰

Best of luck! 🌟`,
    sms: `Interview confirmed for {CANDIDATE_NAME} — {JOB_TITLE} at {COMPANY_NAME}. Date: {DATE} {TIME}. Mode: {MODE}. {LOCATION_OR_LINK}`
  },
  selected: {
    email: { subject:'Congratulations! You have been selected — {JOB_TITLE}', body:`Dear {CANDIDATE_NAME},

We are delighted to inform you that you have been selected for the position of {JOB_TITLE} at {COMPANY_NAME}!

🎉 Congratulations!

Your offer letter will be sent to you shortly for your review and digital signature.

Offered Salary: {SALARY}
Start Date: {START_DATE}
Probation: 6 months (Nepal Labour Act 2074, Section 13)

Please confirm your acceptance by {DEADLINE}.

Welcome to the team!

{HR_NAME}
{COMPANY_NAME}` },
    whatsapp: `🎉 *CONGRATULATIONS, {CANDIDATE_NAME}!*

You have been *selected* for *{JOB_TITLE}* at {COMPANY_NAME}! 🥳

💰 Offer: *{SALARY}*
📅 Start Date: *{START_DATE}*

Your offer letter will be sent shortly for digital signing.

Please accept by *{DEADLINE}*.

Welcome to the family! 🚀`,
    sms: `Congratulations {CANDIDATE_NAME}! You are selected for {JOB_TITLE} at {COMPANY_NAME}. Offer letter coming soon. Start: {START_DATE}.`
  },
  rejected: {
    email: { subject:'Your application update — {JOB_TITLE} | {COMPANY_NAME}', body:`Dear {CANDIDATE_NAME},

Thank you for your interest in the {JOB_TITLE} position at {COMPANY_NAME} and for the time you invested in our application process.

After careful consideration, we have decided to move forward with other candidates whose profiles more closely match our current requirements.

This was a difficult decision as we received many strong applications. We encourage you to apply again for future openings that match your profile.

We wish you all the very best in your career journey.

With regards,
{HR_NAME}
{COMPANY_NAME}` },
    whatsapp: `Dear {CANDIDATE_NAME},

Thank you for applying for *{JOB_TITLE}* at {COMPANY_NAME} and for your time throughout our process.

After careful review, we have decided to move forward with other candidates at this time.

We appreciate your interest and encourage you to apply for future openings. 

Wishing you all the best! 🙏

— {COMPANY_NAME} HR Team`,
    sms: `Hi {CANDIDATE_NAME}, thank you for applying for {JOB_TITLE} at {COMPANY_NAME}. We appreciate your time. We will keep your profile for future opportunities.`
  },

const HISTORY = [
  { to:'Gita Maharjan',   type:'Email + WhatsApp', stage:'Selected',      sent:'Today 2:30 PM',    status:'Delivered', opened:true },
  { to:'Anil KC',         type:'WhatsApp',         stage:'Interview',     sent:'Today 11:00 AM',   status:'Read',      opened:true },
  { to:'Rajan Shrestha',  type:'Email',            stage:'Written Test',  sent:'Yesterday 4:00 PM',status:'Delivered', opened:false },
  { to:'Priya Tamang',    type:'SMS',              stage:'Shortlisted',   sent:'2 days ago',        status:'Delivered', opened:null },
  { to:'Bikash Tamang',   type:'Email + SMS',      stage:'Rejected',      sent:'3 days ago',        status:'Delivered', opened:true },
  { to:'Sunita Rai',      type:'WhatsApp',         stage:'Application Received', sent:'4 days ago', status:'Failed',    opened:false },
]

export default function ATSCommunicationPage() {
  const { navigate } = useApp()
  const [selStage, setSelStage] = useState(STAGES[0])
  const [channel, setChannel] = useState('email')
  const [editedContent, setEditedContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState(false)
  const [tab, setTab] = useState('templates') // templates | compose | history | bulk

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }
  const tpl = TEMPLATES[selStage.id]
  const currentTpl = channel === 'email' ? tpl?.email?.body : tpl?.[channel]

  const generateAI = async () => {
    setGenerating(true)
    const prompt = `Rewrite this ${channel} communication template for the "${selStage.label}" stage of recruitment. Make it warmer, more personal, and culturally appropriate for Nepal. Keep all {PLACEHOLDER} variables intact.\n\nOriginal:\n${currentTpl}`
    const result = await callAI(prompt)
    setEditedContent(result || currentTpl || '')
    setGenerating(false)

  const sendNow = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 1200))
    setSending(false)
    notify(`✅ ${selStage.label} message sent via ${channel.toUpperCase()} to selected candidates!`)

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#059669)', borderRadius: 14, padding: '16px 22px', marginBottom: 16, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>AI Communication Centre</h2>
          <p style={{ margin: '3px 0 0', fontSize: 10, opacity: .8 }}>Auto Email · WhatsApp · SMS · Stage-based templates · AI writer · Bulk send · Delivery tracking</p>
        </div>
        {msg && <span style={{ fontSize: 9, padding: '5px 14px', background: 'rgba(255,255,255,.2)', borderRadius: 8 }}>{msg}</span>}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[{ l: 'Sent This Month', v: '1,847', c: '#3b82f6' },{ l: 'Email Open Rate', v: '68%', c: '#10b981' },{ l: 'WhatsApp Read Rate', v: '94%', c: '#059669' },{ l: 'SMS Delivery', v: '97%', c: '#f59e0b' }].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '9px 14px', border: '1px solid #f1f5f9', flex: '1 1 100px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 8, color: '#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['templates', 'Templates'], ['compose', 'Compose & Send'], ['history', 'Send History'], ['bulk', 'Bulk Send']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 14px', borderRadius: 9, background: tab === t ? '#059669' : '#fff', color: tab === t ? '#fff' : '#475569', fontSize: 10, fontWeight: tab === t ? 800 : 400, cursor: 'pointer', border: tab !== t ? '1px solid #e2e8f0' : 'none' }}>{l}</button>
        ))}
      </div>

      {/* TEMPLATES TAB */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14 }}>
          {/* Stage list */}
          <div>
            {STAGES.map(s => (
              <button key={s.id} onClick={() => { setSelStage(s); setEditedContent('') }} style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', padding: '9px 12px', borderRadius: 10, border: `2px solid ${selStage.id === s.id ? s.color : '#e2e8f0'}`, background: selStage.id === s.id ? s.color + '10' : '#fff', color: selStage.id === s.id ? s.color : '#334155', fontSize: 9, fontWeight: selStage.id === s.id ? 800 : 400, cursor: 'pointer', marginBottom: 6, textAlign: 'left' }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
          {/* Template content */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', flex: 1 }}>{selStage.icon} {selStage.label}</div>
              <div style={{ display: 'flex', gap: 5 }}>
                {['email', 'whatsapp', 'sms'].map(ch => (
                  <button key={ch} onClick={() => setChannel(ch)} style={{ padding: '5px 10px', borderRadius: 7, border: `2px solid ${channel === ch ? selStage.color : '#e2e8f0'}`, background: channel === ch ? selStage.color + '15' : '#f8fafc', color: channel === ch ? selStage.color : '#64748b', fontSize: 8, fontWeight: channel === ch ? 800 : 400, cursor: 'pointer' }}>
                    {ch === 'email' ? '📧 Email' : ch === 'whatsapp' ? '💬 WhatsApp' : '📱 SMS'}
                  </button>
                ))}
              </div>
            </div>
            {channel === 'email' && tpl?.email?.subject && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 10, color: '#374151', border: '1px solid #e2e8f0' }}>
                <strong>Subject:</strong> {tpl.email.subject}
              </div>
            )}
            <textarea
              value={editedContent || currentTpl || ''}
              onChange={e => setEditedContent(e.target.value)}
              rows={12}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 9, outline: 'none', resize: 'vertical', lineHeight: 1.7, fontFamily: 'system-ui', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: 8, color: '#94a3b8', marginBottom: 10 }}>Variables: {'{CANDIDATE_NAME}'} {'{JOB_TITLE}'} {'{COMPANY_NAME}'} {'{DATE}'} {'{LINK}'} {'{SALARY}'} — auto-filled when sending</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={generateAI} disabled={generating} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: generating ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#1e40af)', color: generating ? '#94a3b8' : '#fff', fontSize: 9, fontWeight: 700, cursor: generating ? 'default' : 'pointer' }}>{generating ? '⏳ Generating...' : '🤖 AI Rewrite'}</button>
              <button onClick={() => notify('Template saved!')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 9, cursor: 'pointer' }}>💾 Save Template</button>
              <button onClick={() => setTab('compose')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#059669', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>📤 Use & Send</button>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSE TAB */}
      {tab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Compose & Send</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Stage / Template</label>
                <select value={selStage.id} onChange={e => setSelStage(STAGES.find(s => s.id === e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none' }}>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Send Via</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['email', 'whatsapp', 'sms'].map(ch => (
                    <button key={ch} onClick={() => setChannel(ch)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${channel === ch ? '#059669' : '#e2e8f0'}`, background: channel === ch ? '#f0fdf4' : '#f8fafc', color: channel === ch ? '#059669' : '#64748b', fontSize: 8, fontWeight: channel === ch ? 800 : 400, cursor: 'pointer' }}>
                      {ch === 'email' ? '📧' : ch === 'whatsapp' ? '💬' : '📱'}<br />{ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>To (Candidates)</label>
              <select multiple style={{ width: '100%', height: 80, padding: '6px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none' }}>
                {['Gita Maharjan — Senior React Dev','Anil KC — Senior React Dev','Rajan Shrestha — Senior React Dev','Priya Tamang — Senior React Dev'].map(c => <option key={c}>{c}</option>)}
              </select>
              <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>Ctrl+Click to select multiple</div>
            </div>
            <textarea
              value={editedContent || currentTpl || ''}
              onChange={e => setEditedContent(e.target.value)}
              rows={10}
              placeholder="Message content will be auto-filled from template..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 9, outline: 'none', resize: 'vertical', lineHeight: 1.7, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={generateAI} disabled={generating} style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: generating ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#1e40af)', color: generating ? '#94a3b8' : '#fff', fontSize: 10, fontWeight: 700, cursor: generating ? 'default' : 'pointer' }}>{generating ? '⏳...' : '🤖 AI Write'}</button>
              <button onClick={sendNow} disabled={sending} style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: sending ? '#e2e8f0' : '#059669', color: sending ? '#94a3b8' : '#fff', fontSize: 10, fontWeight: 800, cursor: sending ? 'default' : 'pointer' }}>{sending ? '⏳ Sending...' : '📤 Send Now'}</button>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Send Preview</div>
            <div style={{ background: channel === 'whatsapp' ? '#e8fde8' : channel === 'sms' ? '#f0f4ff' : '#f8fafc', borderRadius: 10, padding: 12, border: '1px solid #e2e8f0', minHeight: 200, fontSize: 9, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {(editedContent || currentTpl || 'Select a stage to preview the template...').replace('{CANDIDATE_NAME}', 'Gita Maharjan').replace('{JOB_TITLE}', 'Senior React Developer').replace('{COMPANY_NAME}', 'eLogix HRMS').replace('{HR_NAME}', 'Maya Pradhan')}
            </div>
            <div style={{ marginTop: 10, fontSize: 8, color: '#94a3b8' }}>Variables auto-filled per candidate when sending to multiple recipients.</div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Send History</div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ background: '#1e3a5f', color: '#fff', display: 'grid', gridTemplateColumns: '160px 120px 150px 120px 80px 80px', padding: '9px 14px', fontSize: 9, fontWeight: 700, gap: 8 }}>
              {['Recipient', 'Channel', 'Stage', 'Sent', 'Status', 'Opened'].map(h => <div key={h}>{h}</div>)}
            </div>
            {HISTORY.map((h, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 120px 150px 120px 80px 80px', padding: '9px 14px', borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#0f172a' }}>{h.to}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>{h.type}</div>
                <div style={{ fontSize: 9, color: '#334155' }}>{h.stage}</div>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>{h.sent}</div>
                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: h.status === 'Delivered' ? '#d1fae5' : h.status === 'Read' ? '#eff6ff' : '#fee2e2', color: h.status === 'Delivered' ? '#065f46' : h.status === 'Read' ? '#1e40af' : '#dc2626' }}>{h.status}</span>
                <div style={{ fontSize: 10, textAlign: 'center' }}>{h.opened === null ? '—' : h.opened ? '✅' : '❌'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BULK TAB */}
      {tab === 'bulk' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Bulk Send by Stage</div>
            {STAGES.slice(0, 6).map(s => (
              <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 9, marginBottom: 7, border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#0f172a' }}>{s.label}</div>
                  <div style={{ fontSize: 8, color: '#94a3b8' }}>4 candidates at this stage</div>
                </div>
                <button onClick={() => notify(`Bulk ${s.label} sent to 4 candidates via Email + WhatsApp!`)} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: s.color, color: '#fff', fontSize: 8, fontWeight: 700, cursor: 'pointer' }}>Send All</button>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Auto-Send Settings</div>
            {[
              ['Application Received', true, 'Instant on application submit'],
              ['CV Shortlisted', true, 'When AI score > 70%'],
              ['Written Test Invitation', true, 'When shortlisted'],
              ['Video Interview', true, 'When exam score > 60%'],
              ['Interview Confirmation', true, '24h before interview'],
              ['Interview Reminder', true, '2h before interview'],
              ['Offer Letter', false, 'Manual approval required'],
              ['Rejection', true, 'When decision = rejected'],
              ['Joining Reminder', true, '7 days before start date'],
            ].map(([l, active, note], i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: i < 8 ? '1px solid #f8fafc' : 'none' }}>
                <div style={{ width: 32, height: 18, borderRadius: 9, background: active ? '#059669' : '#e2e8f0', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: active ? 16 : 2, transition: 'left .2s' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#0f172a' }}>{l}</div>
                  <div style={{ fontSize: 7, color: '#94a3b8' }}>{note}</div>
                </div>
                <span style={{ fontSize: 8, color: active ? '#059669' : '#94a3b8', fontWeight: 700 }}>{active ? 'Auto' : 'Manual'}</span>
              </div>
            ))}
            <button onClick={() => notify('Auto-send settings saved!')} style={{ width: '100%', marginTop: 14, padding: '10px', borderRadius: 9, border: 'none', background: '#059669', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Save Auto-Send Rules</button>
          </div>
        </div>
      )}
    </div>
  )
