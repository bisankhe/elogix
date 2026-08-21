// FILE: DraftHRPolicyPage.jsx  — Compliance & Risk > Compliance Management > Draft HR Policy
// Professional 5-step wizard: Category → Details → Requirements → AI Generate → Review & Submit
// Draft saved to DRAFT_KEY → appears in Publish page immediately

import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

export const DRAFT_KEY = 'elogix_policy_drafts_v2'

const G   = 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%)'
const P   = '#1e40af'
const VK  = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''

// ── 43 Standard Templates ──────────────────────────────────────
const CATS = [
  { code:'EMP', name:'Employment Policies',          icon:'📋', color:'#3b82f6', bg:'#eff6ff' },
  { code:'WBP', name:'Workplace Behaviour',          icon:'🤝', color:'#8b5cf6', bg:'#faf5ff' },
  { code:'RCP', name:'Recruitment & Compensation',   icon:'💰', color:'#10b981', bg:'#f0fdf4' },
  { code:'SCP', name:'Safety & Compliance',          icon:'🛡️', color:'#ef4444', bg:'#fef2f2' },
  { code:'ECA', name:'Conduct & Attendance',         icon:'📅', color:'#f59e0b', bg:'#fffbeb' },
  { code:'LWS', name:'Leave & Work Schedule',        icon:'🏖️', color:'#06b6d4', bg:'#ecfeff' },
  { code:'WRT', name:'Workplace Tech & Relations',   icon:'💻', color:'#f97316', bg:'#fff7ed' },
  { code:'LDP', name:'Learning & Development',       icon:'🎓', color:'#a855f7', bg:'#faf5ff' },
]
const TEMPLATES = {
  EMP:['Employment Contracts & Terms','Code of Conduct Policy','At-Will Employment Policy Statement','Non-Discrimination Policy','Anti-Harassment Policy','Retaliation Policy','Intellectual Property Policy','Conflict of Interest Policy','Telecommuting Policy'],
  WBP:['Social Media Policy','Remote Work Policy','Workplace Violence Policy','Drug and Alcohol Policy','Anti-Bribery & Corruption Policy','Diversity & Inclusion Policy','Workplace Bullying Policy'],
  RCP:['Recruiting & Hiring Policy','Employee Onboarding Policy','Compensation Policy','Travel & Expense Policy','Expense Reimbursement Policy'],
  SCP:['Workplace Injury Reporting','ADA Reasonable Accommodation','Religious Accommodations Policy','Health & Safety Policy'],
  ECA:['Disciplinary Policy','Dress Code Policy','Attendance Policy','Tardiness Policy','Performance Management Policy','Disciplinary & Grievance Procedure','Whistleblower Policy','Termination of Employment Policy'],
  LWS:['Leave Policies (Annual/Sick/etc.)','Bereavement Leave Policy','Meals & Break Periods Policy'],
  WRT:['Nepotism Policy','Immigration Policy','Equal Employment Opportunity (EEO)','Electronic Communications Policy','Confidentiality & NDA Policy','Data Protection & Privacy Policy','Email Use Policy'],
  LDP:['Employee Training & Development'],
const LA_REFS = [
  'Section 10 — Written Employment Contract','Section 13 — Probation Max 6 Months',
  'Section 26 — Minimum Wage NPR 17,300','Section 28 — 8h/day 48h/week Max',
  'Section 36 — Overtime 1.5× Max 4h/day','Section 45 — Maternity Leave 98 Days',
  'Section 52 — Disciplinary Process','Section 53 — Annual Leave 18 Days',
  'Section 54 — Sick Leave 12 Days','SSF — 11% Employee + 20% Employer Contribution',
]
const MODULE_LINKS = {
  EMP:['Employee Profile','Employment Contract','Onboarding','Offboarding'],
  WBP:['HR Helpdesk','Grievance Management','Compliance Risk'],
  RCP:['Payroll','Finance Claims','Recruitment','Expense Claims'],
  SCP:['Attendance','Health & Safety','Risk Management'],
  ECA:['Attendance','Leave Management','Performance Management','Disciplinary'],
  LWS:['Leave Management','Payroll','Attendance'],
  WRT:['IT Administration','Data Protection','Email System'],
  LDP:['Training & Development','LMS','Certification Tracking'],
const STEPS = ['Category & Template','Policy Details','Requirements','AI Generating','Review & Submit']

// ── AI CALL ────────────────────────────────────────────────────
async function callClaude(form) {
  const prompt = `Write a complete, professional HR policy document for:

Policy: ${form.title}
Company: ${form.company}
Policy Number: ${form.control}
Category: ${form.catName}
Audience: ${form.audience}
Owner: ${form.owner}
Approver: ${form.approver}
Effective Date: ${form.effectiveDate}
Review Cycle: ${form.reviewCycle}
Purpose: ${form.purpose}
Key Requirements: ${form.requirements}
Additional Context: ${form.context || 'Standard Nepal company environment'}
Nepal Labour Act 2074 References: ${form.laRefs.length > 0 ? form.laRefs.join('; ') : 'General compliance'}
Linked HRIS Modules: ${form.linkedModules?.join(', ') || 'HR System'}

Write a formal policy with these 7 sections, separated by clear dividers:
1. PURPOSE
2. SCOPE
3. POLICY STATEMENT
4. KEY PROVISIONS (numbered, specific, measurable)
5. ROLES & RESPONSIBILITIES
6. COMPLIANCE & CONSEQUENCES
7. REVIEW & AMENDMENT

Then add a DOCUMENT CONTROL table. Keep language formal, clear, and legally sound for Nepal.`

  const sys = `You are a senior HR Policy specialist for Nepal-based organisations. Write policies that are:
- Legally compliant with Nepal Labour Act 2074
- Professional and formal in tone
- Specific and actionable (not vague)
- Structured with clear numbered sections
- Free of jargon
Return only the policy document text, no preamble.`

  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ system:sys, messages:[{role:'user',content:prompt}], model:'claude-sonnet-4-6', max_tokens:4000 }),
      signal:AbortSignal.timeout(30000),
    })
    if (r.ok) { const d=await r.json(); if(d.content) return d.content }
  } catch {}
  if (VK && VK.startsWith('sk-ant') && VK!=='sk-ant-your-key-here') {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-only-beta': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system: sys, messages: [{ role: 'user', content: prompt }] }),
      })
      const d = await r.json()
      if (r.ok && d?.content?.[0]?.text) return d.content[0].text
    } catch {}
  return buildOffline(form)

function buildOffline(form) {
  const d = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
  const rev = new Date(Date.now()+365*86400000).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
  return `${form.control} | ${form.title}
${'═'.repeat(60)}

DOCUMENT CONTROL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document ID    : ${form.control}
Title          : ${form.title}
Version        : 1.0 — DRAFT
Status         : Pending Approval
Company        : ${form.company}
Owner          : ${form.owner}
Approver       : ${form.approver}
Audience       : ${form.audience}
Effective Date : ${form.effectiveDate || d}
Review Cycle   : ${form.reviewCycle}
Next Review    : ${rev}
Linked Modules : ${form.linkedModules?.join(', ') || 'HR System'}
LA2074 Refs    : ${form.laRefs?.join(' | ') || 'General compliance'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


1. PURPOSE
${'-'.repeat(60)}

${form.purpose || `This policy establishes the guidelines and expectations for ${form.title.toLowerCase()} at ${form.company}. It ensures consistent, fair, and legally compliant practices in alignment with Nepal Labour Act 2074 and applicable regulations.`}

This policy is issued to ensure that all employees, managers, and stakeholders understand their obligations and rights with respect to ${form.title.toLowerCase()}.


2. SCOPE
${'-'.repeat(60)}

This policy applies to:
• All permanent, probationary, and contract employees of ${form.company}
• Consultants, vendors, and third-party staff operating within company premises
• Remote employees and those working in hybrid arrangements
• All departments and locations operated by ${form.company}

${form.audience !== 'All Employees' ? `Special applicability: ${form.audience}` : ''}


3. POLICY STATEMENT
${'-'.repeat(60)}

${form.company} is committed to maintaining a professional, safe, and inclusive workplace. This policy reflects the organisation's values and legal obligations under the Nepal Labour Act 2074.

All employees are expected to read, understand, and comply with this policy as a condition of their employment. Ignorance of this policy shall not be accepted as an excuse for non-compliance.


4. KEY PROVISIONS
${'-'.repeat(60)}

${form.requirements ? form.requirements.split('\n').filter(Boolean).map((r,i)=>`4.${i+1}  ${r}`).join('\n\n') : `4.1  All employees must acknowledge receipt and understanding of this policy within 7 days of publication or joining, whichever is earlier.

4.2  This policy is aligned with Nepal Labour Act 2074 and shall be updated whenever legislation changes.

4.3  Violations of this policy will be handled through the formal disciplinary process per LA2074 Section 52.

4.4  This policy shall be reviewed ${form.reviewCycle.toLowerCase()} and updated as required by changes in law or business needs.`}

${form.laRefs?.length > 0 ? `\nNepal Labour Act 2074 References:\n${form.laRefs.map((r,i)=>`  ${i+1}. ${r}`).join('\n')}` : ''}


5. ROLES & RESPONSIBILITIES
${'-'.repeat(60)}

HR Department (${form.owner}):
• Maintain, update, and communicate this policy to all staff
• Track employee acknowledgements and compliance status
• Investigate alleged violations and recommend appropriate action
• Conduct orientation sessions for new employees within first week

Managers & Supervisors:
• Enforce this policy consistently within their teams
• Report policy violations to HR promptly
• Ensure new team members read and sign this policy within 7 days

Employees:
• Read and understand this policy in full before signing
• Sign the digital acknowledgement within 7 days of notification
• Report violations or seek clarification from HR


6. COMPLIANCE & CONSEQUENCES
${'-'.repeat(60)}

Non-compliance with this policy will result in progressive disciplinary action per Nepal Labour Act 2074, Section 52:

• First offence  : Verbal warning (documented in employee file)
• Second offence : Written warning
• Third offence  : Final written warning
• Serious breach : Immediate termination may apply

Serious breaches — including those involving fraud, harassment, or criminal conduct — may result in summary dismissal without prior warning steps.


7. REVIEW & AMENDMENT
${'-'.repeat(60)}

This policy is owned by ${form.owner} and is subject to review ${form.reviewCycle.toLowerCase()}.
Next scheduled review : ${rev}
Amendment requests must be submitted in writing to ${form.approver} for approval.
All amendments will be version-controlled and communicated to all staff.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This document is the confidential property of ${form.company}.
Unauthorised distribution or reproduction is strictly prohibited.`

// ── OUTSIDE COMPONENT — stable helpers ─────────────────────────
function FI({ label, value, onChange, type='text', placeholder, required, hint }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      {hint && <div style={{ fontSize:9, color:'#94a3b8', marginBottom:4 }}>{hint}</div>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
    </div>
  )
function TA({ label, value, onChange, rows=4, placeholder, required, hint }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      {hint && <div style={{ fontSize:9, color:'#94a3b8', marginBottom:4 }}>{hint}</div>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', fontFamily:'inherit', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }}/>
    </div>
  )
function SE({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>
        {label}{required && <span style={{ color:'#ef4444' }}> *</span>}
      </label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:11, outline:'none', fontFamily:'inherit', boxSizing:'border-box', background:'#fff' }}>
        <option value="">— Select —</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

// ── MAIN COMPONENT ─────────────────────────────────────────────
export default function DraftHRPolicyPage() {
  const { navTo } = useApp()
  const [step, setStep] = useState(0)
  const [gen,  setGen]  = useState(false)
  const [msg,  setMsg]  = useState('')
  const [drafts, setDrafts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)||'[]') } catch { return [] }
  })
  const [activeTab, setActiveTab] = useState('create')

  const [form, setForm] = useState({
    cat:'', catName:'', selectedTemplate:'', customTitle:'',
    control:'', company:'eLogix HRMS Pvt. Ltd.', owner:'HR Manager',
    effectiveDate: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),
    reviewCycle:'Annually', mandatory:true,
    audience:'All Employees', deptSpecific:'', purpose:'', requirements:'', context:'',
    laRefs:[], linkedModules:[],
  })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))
  const title = form.selectedTemplate || form.customTitle || 'Untitled Policy'

  const canNext = [
    !!(form.cat && (form.selectedTemplate || form.customTitle.trim())),
    !!(form.control && form.company && form.owner && form.approver),
    !!(form.audience && form.purpose.trim().length > 10),
    true, true,
  ]

  const generate = async () => {
    setGen(true); setStep(3)
    const result = await callClaude({ ...form, title })
    set('content', result)
    setGen(false); setStep(4)

  const saveDraft = (submitForApproval = false) => {
    const cat = CATS.find(c=>c.code===form.cat)
    const draft = {
      id:            `draft-${Date.now()}`,
      title,
      control:       form.control || `POL-${form.cat}-${Date.now().toString().slice(-4)}`,
      cat:           form.cat,
      catName:       form.catName,
      company:       form.company,
      owner:         form.owner,
      approver:      form.approver,
      effectiveDate: form.effectiveDate,
      reviewCycle:   form.reviewCycle,
      mandatory:     form.mandatory,
      audience:      form.audience,
      laRefs:        form.laRefs,
      linkedModules: form.linkedModules,
      content:       form.content,
      status:        submitForApproval ? 'pending_approval' : 'draft',
      version:       '1.0',
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    const existing = JSON.parse(localStorage.getItem(DRAFT_KEY)||'[]').filter(d=>d.id!==draft.id)
    const newDrafts = [draft, ...existing].slice(0,100)
    setDrafts(newDrafts)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(newDrafts))

    if (submitForApproval) {
      try {
        const notifs = JSON.parse(localStorage.getItem('elogix_hris_notifications')||'[]')
        notifs.unshift({ id:`POL-SUB-${Date.now()}`, cat:'Action Required', icon:'📋', title:`Policy Awaiting Approval: "${title}"`, body:`Submitted by HR · Awaiting review by ${form.approver}`, action:'Publish HR Policy', actionId:'publish-hr-policy', time:'Just now', unread:true })
        localStorage.setItem('elogix_hris_notifications', JSON.stringify(notifs.slice(0,100)))
      } catch {}
      setMsg('✅ Submitted for approval! Reviewer has been notified.')
      setTimeout(()=>{ setMsg(''); navTo?.('publish-hr-policy') }, 2000)
    } else {
      setMsg('✅ Draft saved successfully.')
      setTimeout(()=>setMsg(''), 2500)

  const Nav = ({ onNext, disabled }) => (
    <div style={{ display:'flex', gap:10, marginTop:24 }}>
      {step > 0 && step !== 3 && (
        <button onClick={()=>setStep(s=>s-1)} style={{ padding:'10px 24px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontSize:12, cursor:'pointer', fontWeight:600 }}>← Back</button>
      )}
      {step < 2 && (
        <button onClick={onNext||(() => setStep(s=>s+1))} disabled={disabled}
          style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:disabled?'#e2e8f0':G, color:'#fff', fontSize:12, fontWeight:800, cursor:disabled?'default':'pointer' }}>
          Next →
        </button>
      )}
      {step === 2 && (
        <button onClick={generate} disabled={!canNext[2]}
          style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:canNext[2]?G:'#e2e8f0', color:'#fff', fontSize:12, fontWeight:800, cursor:canNext[2]?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          🤖 Generate Policy with AI →
        </button>
      )}
    </div>
  )

  const Card = ({ children, title: t }) => (
    <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,.05)' }}>
      {t && <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:18, paddingBottom:10, borderBottom:'2px solid #f1f5f9' }}>{t}</div>}
      {children}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, fontFamily:'system-ui,sans-serif', maxWidth:1100, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'22px 28px', boxShadow:'0 4px 24px rgba(30,64,175,.3)' }}>
        <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginBottom:4, letterSpacing:1, textTransform:'uppercase' }}>Compliance & Risk Management › Compliance Management</div>
        <div style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-.3 }}>📝 Draft HR Policy</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:4 }}>AI-powered · 43 standard templates · 7-section professional format · Nepal Labour Act 2074 compliant</div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#f8fafc', borderRadius:12, padding:4, border:'1px solid #e2e8f0' }}>
        {[['create','✏️ Create New Policy'],['drafts',`📋 Saved Drafts (${drafts.length})`]].map(([t,l])=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', background:activeTab===t?'#fff':'transparent', color:activeTab===t?P:'#64748b', fontWeight:activeTab===t?800:500, fontSize:11, cursor:'pointer', boxShadow:activeTab===t?'0 2px 8px rgba(0,0,0,.08)':'none', transition:'all .2s' }}>{l}</button>
        ))}
      </div>

      {/* ── DRAFTS TAB ───────────────────────────────────────── */}
      {activeTab==='drafts' && (
        <div>
          {drafts.length===0 ? (
            <div style={{ textAlign:'center', padding:60, color:'#94a3b8', background:'#fff', borderRadius:14, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#374151', marginBottom:6 }}>No drafts yet</div>
              <div>Create your first policy above.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {drafts.map((d,i) => {
                const statusCfg = {
                  draft:            { bg:'#fef9c3', color:'#854d0e', label:'Draft'           },
                  pending_approval: { bg:'#dbeafe', color:'#1e40af', label:'Pending Approval' },
                  approved:         { bg:'#dcfce7', color:'#15803d', label:'Approved'         },
                  rejected:         { bg:'#fee2e2', color:'#dc2626', label:'Rejected'         },
                  published:        { bg:'#d1fae5', color:'#065f46', label:'Published'        },
                const sc = statusCfg[d.status] || statusCfg.draft
                return (
                  <div key={i} style={{ background:'#fff', borderRadius:12, padding:'14px 20px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:14, boxShadow:'0 1px 6px rgba(0,0,0,.04)' }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:cat?.bg||'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{cat?.icon||'📄'}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{d.title}</div>
                      <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>{d.control} · v{d.version} · {d.audience} · Created {new Date(d.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
                    </div>
                    <span style={{ fontSize:9, fontWeight:800, padding:'3px 10px', borderRadius:12, background:sc.bg, color:sc.color, flexShrink:0 }}>{sc.label}</span>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={()=>{ setForm(f=>({...f,...d,cat:d.cat,selectedTemplate:d.title})); setActiveTab('create'); setStep(4) }}
                        style={{ padding:'6px 14px', borderRadius:9, border:`1px solid ${P}`, background:`${P}10`, color:P, fontSize:9, fontWeight:700, cursor:'pointer' }}>Edit</button>
                      {d.status==='draft'&&(
                        <button onClick={()=>{ setForm(f=>({...f,...d})); setMsg(''); saveDraft(true) }}
                          style={{ padding:'6px 14px', borderRadius:9, border:'none', background:G, color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>Submit →</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE TAB ───────────────────────────────────────── */}
      {activeTab==='create' && (
        <div>
          {/* Step progress bar */}
          <div style={{ display:'flex', alignItems:'center', marginBottom:24 }}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', width:'100%' }}>
                  {i>0 && <div style={{ flex:1, height:2, background:step>i-1?P:'#e2e8f0', transition:'background .3s' }}/>}
                  <div style={{ width:30, height:30, borderRadius:'50%', background:step===i?P:step>i?'#10b981':'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:900, flexShrink:0, transition:'all .3s', cursor:i<step?'pointer':'default' }}
                    onClick={()=>i<step&&step!==3&&setStep(i)}>
                    {step>i?'✓':i+1}
                  </div>
                  {i<STEPS.length-1 && <div style={{ flex:1, height:2, background:step>i?P:'#e2e8f0', transition:'background .3s' }}/>}
                </div>
                <div style={{ fontSize:8, fontWeight:step===i?700:400, color:step===i?P:step>i?'#10b981':'#94a3b8', marginTop:6, textAlign:'center', maxWidth:80 }}>{s}</div>
              </div>
            ))}
          </div>

          {/* ── STEP 0: CATEGORY & TEMPLATE ─────────────────── */}
          {step===0 && (
            <Card title="Step 1 — Select Policy Category & Template">
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:10 }}>Select Category <span style={{ color:'#ef4444' }}>*</span></label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {CATS.map(cat => (
                    <div key={cat.code} onClick={()=>{ set('cat',cat.code); set('catName',cat.name); set('selectedTemplate','') }}
                      style={{ padding:'12px', borderRadius:11, border:`2px solid ${form.cat===cat.code?cat.color:'#e2e8f0'}`, background:form.cat===cat.code?cat.bg:'#fafafa', cursor:'pointer', textAlign:'center', transition:'all .2s' }}>
                      <div style={{ fontSize:22, marginBottom:4 }}>{cat.icon}</div>
                      <div style={{ fontSize:9, fontWeight:700, color:form.cat===cat.code?cat.color:'#374151', lineHeight:1.3 }}>{cat.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {form.cat && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:8 }}>Select Standard Template or Enter Custom Title</label>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6, marginBottom:10 }}>
                    {TEMPLATES[form.cat]?.map(t=>{
                      const active = form.selectedTemplate===t
                      return (
                        <div key={t} onClick={()=>{ set('selectedTemplate',t); set('customTitle',''); set('control',`POL-${form.cat}-${String(TEMPLATES[form.cat].indexOf(t)+1).padStart(3,'0')}`) }}
                          style={{ padding:'10px 14px', borderRadius:10, border:`1.5px solid ${active?cat.color:'#e2e8f0'}`, background:active?cat.bg:'#fff', cursor:'pointer', fontSize:10, fontWeight:active?700:400, color:active?cat.color:'#374151', transition:'all .2s' }}>
                          {cat.icon} {t}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
                    <span style={{ fontSize:9, color:'#94a3b8', fontWeight:500 }}>OR CREATE CUSTOM</span>
                    <div style={{ flex:1, height:1, background:'#e2e8f0' }}/>
                  </div>
                  <div style={{ marginTop:10 }}>
                    <input value={form.customTitle} onChange={e=>{ set('customTitle',e.target.value); set('selectedTemplate','') }}
                      placeholder="Type a custom policy name e.g. 'AI Usage Policy', 'Hybrid Work Policy'..."
                      style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', fontSize:11, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                </div>
              )}

              {(form.selectedTemplate||form.customTitle) && (
                <div style={{ padding:'12px 16px', background:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe', fontSize:10, color:'#1e40af', fontWeight:600 }}>
                  ✅ Selected: <strong>{title}</strong> — AI will generate a complete 7-section professional policy.
                </div>
              )}
              <Nav disabled={!canNext[0]}/>
            </Card>
          )}

          {/* ── STEP 1: POLICY DETAILS ───────────────────────── */}
          {step===1 && (
            <Card title="Step 2 — Policy Details & Metadata">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                <FI label="Policy Number / Control ID" value={form.control} onChange={v=>set('control',v)} required placeholder="e.g. POL-EMP-001" hint="Unique identifier for version control and tracking"/>
                <FI label="Company Name" value={form.company} onChange={v=>set('company',v)} required placeholder="eLogix HRMS Pvt. Ltd."/>
                <FI label="Policy Owner" value={form.owner} onChange={v=>set('owner',v)} required placeholder="e.g. HR Manager" hint="Department or role responsible for maintaining this policy"/>
                <FI label="Approving Authority" value={form.approver} onChange={v=>set('approver',v)} required placeholder="e.g. CHRO / CEO" hint="Who must approve this policy before publication"/>
                <FI label="Effective Date" value={form.effectiveDate} onChange={v=>set('effectiveDate',v)} placeholder="e.g. 1 August 2026" hint="Date this policy comes into force"/>
                <SE label="Review Cycle" value={form.reviewCycle} onChange={v=>set('reviewCycle',v)} options={['Annually','Every 6 months','Every 2 years','As required']} required/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                <SE label="Audience" value={form.audience} onChange={v=>set('audience',v)} required options={['All Employees','Management Only','New Joiners Only','Remote Employees','Senior Management','Department-specific']}/>
                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Mandatory Policy?</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {[['Yes',true],['No',false]].map(([l,v])=>(
                      <button key={l} onClick={()=>set('mandatory',v)} style={{ flex:1, padding:'9px', borderRadius:9, border:`1.5px solid ${form.mandatory===v?P:'#e2e8f0'}`, background:form.mandatory===v?`${P}10`:'#fff', color:form.mandatory===v?P:'#64748b', fontSize:11, fontWeight:form.mandatory===v?800:400, cursor:'pointer' }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Nepal Labour Act 2074 — Applicable Sections</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {LA_REFS.map(ref => {
                    return (
                      <button key={ref} onClick={()=>set('laRefs',active?form.laRefs.filter(r=>r!==ref):[...form.laRefs,ref])}
                        style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${active?P:'#e2e8f0'}`, background:active?`${P}10`:'#fff', color:active?P:'#64748b', fontSize:8, fontWeight:active?700:400, cursor:'pointer', transition:'all .2s' }}>
                        {active?'✓ ':''}{ref}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:10, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Linked HRIS Modules</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {(MODULE_LINKS[form.cat]||[]).map(mod => {
                    return (
                      <button key={mod} onClick={()=>set('linkedModules',active?form.linkedModules.filter(m=>m!==mod):[...form.linkedModules,mod])}
                        style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${active?'#10b981':'#e2e8f0'}`, background:active?'#f0fdf4':'#fff', color:active?'#15803d':'#64748b', fontSize:9, fontWeight:active?700:400, cursor:'pointer' }}>
                        {active?'✓ ':''}{mod}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Nav disabled={!canNext[1]}/>
            </Card>
          )}

          {/* ── STEP 2: REQUIREMENTS ─────────────────────────── */}
          {step===2 && (
            <Card title="Step 3 — Policy Requirements & Context">
              <div style={{ background:'#eff6ff', borderRadius:10, padding:'10px 14px', marginBottom:18, fontSize:9, color:'#1e40af', lineHeight:1.6 }}>
                ℹ️ The more detail you provide, the more accurate and specific the AI-generated policy will be. Each field feeds directly into a different section of the policy document.
              </div>
              <TA label="Purpose of this Policy" value={form.purpose} onChange={v=>set('purpose',v)} rows={3} required
                placeholder="Why is this policy needed? What problem does it solve? What is the organisation trying to achieve?"
                hint="This becomes Section 1 (Purpose) of the policy"/>
              <TA label="Key Requirements & Rules (one per line)" value={form.requirements} onChange={v=>set('requirements',v)} rows={6} required
                placeholder="List the specific rules, standards, or requirements this policy must include. E.g.:&#10;Employees must complete mandatory training within 30 days&#10;All expense claims must be submitted within 7 days with receipts&#10;Manager approval required for claims above NPR 5,000"
                hint="These become the numbered provisions in Section 4 of the policy"/>
              <TA label="Additional Context / Special Circumstances" value={form.context} onChange={v=>set('context',v)} rows={3}
                placeholder="Any special situations, exceptions, or company-specific context the AI should know about..."
                hint="Helps tailor the policy to your specific business environment"/>
              <Nav disabled={!canNext[2]}/>
            </Card>
          )}

          {/* ── STEP 3: GENERATING ───────────────────────────── */}
          {step===3 && (
            <div style={{ background:'#fff', borderRadius:14, padding:60, textAlign:'center', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>🧠</div>
              <div style={{ fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Claude AI is drafting your policy...</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:24, lineHeight:1.6 }}>
                Writing professional 7-section policy · Applying Nepal Labour Act 2074 · Linking to HRIS modules<br/>
                Policy: <strong>{title}</strong>
              </div>
              <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden', maxWidth:400, margin:'0 auto' }}>
                <div style={{ height:'100%', background:G, borderRadius:3, width:'80%', animation:'slide 2s ease-in-out infinite alternate' }}/>
              </div>
              <style>{`@keyframes slide{from{width:30%}to{width:90%}}`}</style>
            </div>
          )}

          {/* ── STEP 4: REVIEW & SUBMIT ──────────────────────── */}
          {step===4 && !gen && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>
              {/* Policy content editor */}
              <Card title={`📄 ${title} — Review & Edit`}>
                <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                  <span style={{ fontSize:9, padding:'3px 10px', borderRadius:10, background:'#fef9c3', color:'#854d0e', fontWeight:700 }}>DRAFT v1.0</span>
                  <span style={{ fontSize:9, padding:'3px 10px', borderRadius:10, background:'#eff6ff', color:'#1e40af', fontWeight:700 }}>{form.company}</span>
                  {form.mandatory && <span style={{ fontSize:9, padding:'3px 10px', borderRadius:10, background:'#fef2f2', color:'#dc2626', fontWeight:700 }}>Mandatory</span>}
                  <button onClick={generate} style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:9, border:`1px solid ${P}`, background:`${P}10`, color:P, fontSize:9, fontWeight:700, cursor:'pointer' }}>🔄 Regenerate</button>
                </div>
                <textarea value={form.content} onChange={e=>set('content',e.target.value)} rows={36}
                  style={{ width:'100%', padding:'18px 20px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:11, lineHeight:1.9, fontFamily:'"Times New Roman",Georgia,serif', resize:'vertical', outline:'none', boxSizing:'border-box', color:'#0f172a', background:'#fafafa' }}/>
              </Card>

              {/* Right actions panel */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>📋 Policy Summary</div>
                  {[
                    ['Policy',    title],
                    ['Control',   form.control],
                    ['Category',  form.catName],
                    ['Company',   form.company],
                    ['Owner',     form.owner],
                    ['Approver',  form.approver],
                    ['Audience',  form.audience],
                    ['Effective', form.effectiveDate],
                    ['Review',    form.reviewCycle],
                    ['Mandatory', form.mandatory?'Yes':'No'],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f8fafc', gap:8 }}>
                      <span style={{ fontSize:9, color:'#94a3b8', flexShrink:0 }}>{k}</span>
                      <span style={{ fontSize:9, fontWeight:700, color:'#0f172a', textAlign:'right', wordBreak:'break-word' }}>{v}</span>
                    </div>
                  ))}
                </div>
                {form.laRefs.length>0 && (
                  <div style={{ background:'#eff6ff', borderRadius:12, padding:14, border:'1px solid #bfdbfe' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#1e40af', marginBottom:8 }}>⚖️ LA2074 References</div>
                    {form.laRefs.map(r=><div key={r} style={{ fontSize:8, color:'#1d4ed8', marginBottom:4 }}>• {r}</div>)}
                  </div>
                )}
                {form.linkedModules.length>0 && (
                  <div style={{ background:'#f0fdf4', borderRadius:12, padding:14, border:'1px solid #bbf7d0' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#15803d', marginBottom:8 }}>🔗 Linked Modules</div>
                    {form.linkedModules.map(m=><div key={m||""} style={{ fontSize:9, color:'#15803d', marginBottom:3 }}>• {m||""}</div>)}
                  </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <button onClick={()=>saveDraft(false)} style={{ padding:'11px', borderRadius:10, border:`1px solid ${P}`, background:'#fff', color:P, fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    💾 Save as Draft
                  </button>
                  <button onClick={()=>saveDraft(true)} style={{ padding:'11px', borderRadius:10, border:'none', background:G, color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer' }}>
                    🚀 Submit for Approval →
                  </button>
                  {msg && <div style={{ fontSize:10, color:'#15803d', fontWeight:700, textAlign:'center', padding:'8px', background:'#f0fdf4', borderRadius:8 }}>{msg}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
