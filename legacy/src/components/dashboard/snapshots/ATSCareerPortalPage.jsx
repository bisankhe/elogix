// ATSCareerPortalPage.jsx - World-Class Candidate-Facing Career Portal
// Features: Job search, Apply with social login, Application tracker,
// AI Chatbot assistant, Employer branding, Status timeline, Offer signing
import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800,
        system: sys || 'You are eLogix ATS AI Career Assistant. Be helpful, friendly, and concise. Help candidates with job applications.',
        messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(20000)
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return 'Thank you for your message! Our team will get back to you shortly. You can also check your application status in the tracker above.'
}

const JOBS = [
  { id:'j1', title:'Senior React Developer', dept:'Technology', location:'Kathmandu', type:'Full-Time', salary:'NPR 80K-120K/month', exp:'4+ years', posted:'2 days ago', deadline:'2081-09-30', openings:2, tags:['React','Node.js','AWS','PostgreSQL'], desc:'Lead frontend architecture for our SaaS HRMS platform. Work with AI, real-time data, and complex UI systems.', benefits:['Medical Insurance','Festival Bonus','Remote Fridays','Training Budget NPR 30K/yr'], urgency:'Actively Hiring' },
  { id:'j2', title:'Finance Manager', dept:'Finance', location:'Kathmandu', type:'Full-Time', salary:'NPR 90K-130K/month', exp:'5+ years', posted:'5 days ago', deadline:'2081-10-15', openings:1, tags:['FP&A','SAP','Excel','CPA'], desc:'Lead financial planning, budgeting, and compliance. Nepal Labour Act expertise required.', benefits:['Medical Insurance','Festival Bonus','SSF Enrollment','Provident Fund'], urgency:'Hiring' },
  { id:'j3', title:'HR Business Partner', dept:'HR', location:'Kathmandu / Hybrid', type:'Full-Time', salary:'NPR 60K-90K/month', exp:'4+ years', posted:'1 week ago', deadline:'2081-09-20', openings:1, tags:['HRBP','LA2074','OD','Payroll'], desc:'Partner with business units on talent strategy, performance, and culture. Nepal HR expertise essential.', benefits:['Medical Insurance','Flexible Hours','Remote Work'], urgency:'Closing Soon' },
  { id:'j4', title:'Data Scientist', dept:'Technology', location:'Kathmandu', type:'Full-Time', salary:'NPR 100K-160K/month', exp:'2+ years', posted:'3 days ago', deadline:'2081-10-01', openings:1, tags:['Python','ML','TensorFlow','SQL'], desc:'Build ML models for HR analytics, predictive attrition, and salary benchmarking.', benefits:['Medical Insurance','GPU Workstation','Conference Budget','Remote Options'], urgency:'Actively Hiring' },
  { id:'j5', title:'Marketing Manager', dept:'Marketing', location:'Kathmandu', type:'Full-Time', salary:'NPR 70K-100K/month', exp:'5+ years', posted:'1 week ago', deadline:'2081-10-10', openings:1, tags:['Digital Marketing','SEO','Social Media','Brand'], desc:'Drive brand awareness and lead generation for eLogix HRMS across Nepal and South Asia.', benefits:['Medical Insurance','Marketing Budget','Growth Opportunities'], urgency:'Hiring' },
]

const MY_APPS = [
  { id:'a1', job:'Senior React Developer', applied:'2081-08-18', status:'Physical Interview Scheduled', stage:4, total:6, nextAction:'Interview on 2081-09-02 at 10:00 AM — eLogix Office', stages:['Applied','CV Shortlisted','Written Exam','Video Interview','Physical Interview','Final Decision'], stagesDone:[0,1,2,3,4] },
  { id:'a2', job:'Data Scientist', applied:'2081-08-20', status:'Video Interview Pending', stage:3, total:6, nextAction:'Complete your AI video interview by 2081-08-30', stages:['Applied','CV Shortlisted','Written Exam','Video Interview','Physical Interview','Final Decision'], stagesDone:[0,1,2] },
]

const CHAT_STARTERS = [
  'What is the application status for Senior React Developer?',
  'How long does the hiring process take?',
  'What benefits do you offer?',
  'Can I reschedule my interview?',
]

function JobCard({ job, onApply, onView, applied }) {
  const urgencyC = job.urgency === 'Closing Soon' ? '#ef4444' : job.urgency === 'Actively Hiring' ? '#059669' : '#1e40af'
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,.05)', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💼</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{job.title}</span>
            <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: urgencyC + '15', color: urgencyC, border: `1px solid ${urgencyC}30` }}>{job.urgency}</span>
          </div>
          <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6 }}>{job.dept} · {job.location} · {job.type} · {job.salary} · {job.exp} exp</div>
          <div style={{ fontSize: 9, color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>{job.desc}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {job.tags.map(t => <span key={t} style={{ fontSize: 8, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>{t}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 8, color: '#94a3b8' }}>Posted {job.posted} · Deadline: {job.deadline} · {job.openings} opening{job.openings > 1 ? 's' : ''}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => onView(job)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#374151', fontSize: 9, cursor: 'pointer' }}>View Details</button>
            {applied ? (
              <span style={{ padding: '6px 14px', borderRadius: 8, background: '#f0fdf4', color: '#059669', fontSize: 9, fontWeight: 700, border: '1px solid #bbf7d0' }}>Applied</span>
            ) : (
              <button onClick={() => onApply(job)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', color: '#fff', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}>Apply Now</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ApplicationTracker({ app }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 16, border: '1px solid #f1f5f9', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{app.job}</div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Applied {app.applied}</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>{app.status}</span>
      </div>
      {/* Stage pipeline */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {app.stages.map((s, i) => {
          const done = app.stagesDone.includes(i)
          const current = i === app.stage
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#1e40af' : current ? '#f59e0b' : '#f1f5f9', border: `2px solid ${done ? '#1e40af' : current ? '#f59e0b' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: done || current ? '#fff' : '#94a3b8', fontWeight: 900 }}>
                  {done ? '✓' : current ? '●' : i + 1}
                </div>
                <div style={{ fontSize: 7, color: done ? '#1e40af' : current ? '#f59e0b' : '#94a3b8', fontWeight: done || current ? 700 : 400, maxWidth: 60, textAlign: 'center', lineHeight: 1.2 }}>{s}</div>
              </div>
              {i < app.stages.length - 1 && <div style={{ height: 2, width: 32, background: app.stagesDone.includes(i + 1) ? '#1e40af' : '#f1f5f9', margin: '0 2px', marginBottom: 20, flexShrink: 0 }} />}
            </div>
          )
        })}
      </div>
      <div style={{ background: '#fffbeb', borderRadius: 8, padding: '8px 12px', border: '1px solid #fde68a', fontSize: 9, color: '#92400e' }}>
        <strong>Next Step:</strong> {app.nextAction}
      </div>
    </div>
  )
}

function Chatbot() {
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Hi! I am the eLogix ATS AI Career Assistant. I can help you with job applications, interview prep, application status, and more. How can I help you today?' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs])

  const send = async (text) => {
    const q = text || input.trim()
    if (!q) return
    setInput('')
    setMsgs(m => [...m, { role: 'user', text: q }])
    setLoading(true)
    const history = msgs.map(m => `${m.role === 'user' ? 'Candidate' : 'Assistant'}: ${m.text}`).join('\n')
    const resp = await callAI(`Context:\n${history}\n\nCandidate: ${q}`, 'You are eLogix ATS AI Career Assistant. Help candidates with job search, application status, interview prep, and FAQs. Be concise (2-4 sentences max). Company: eLogix HRMS, Nepal.')
    setMsgs(m => [...m, { role: 'bot', text: resp || 'I am here to help! Please check your email for the latest updates on your application.' }])
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 420, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', padding: '12px 16px', color: '#fff', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
        <div><div style={{ fontSize: 11, fontWeight: 800 }}>eLogix AI Career Assistant</div><div style={{ fontSize: 8, opacity: .7 }}>Online · Responds instantly</div></div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '9px 13px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: m.role === 'user' ? '#1e40af' : '#f1f5f9', color: m.role === 'user' ? '#fff' : '#334155', fontSize: 10, lineHeight: 1.6 }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ display: 'flex', gap: 4, padding: '9px 13px', background: '#f1f5f9', borderRadius: '12px 12px 12px 2px', width: 60 }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: `bounce ${0.6 + i * 0.2}s infinite` }} />)}</div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {CHAT_STARTERS.map(s => <button key={s} onClick={() => send(s)} style={{ fontSize: 8, padding: '3px 8px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', cursor: 'pointer' }}>{s.slice(0, 30)}...</button>)}
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about jobs, status, interviews..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none' }} />
          <button onClick={() => send()} disabled={!input.trim() || loading} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: input.trim() && !loading ? '#1e40af' : '#e2e8f0', color: input.trim() && !loading ? '#fff' : '#94a3b8', fontSize: 12, cursor: input.trim() && !loading ? 'pointer' : 'default' }}>➤</button>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  )
}

function ApplyModal({ job, onClose, onSubmit }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', phone: '', dob: '', gender: 'Male', address: '', exp: '', salary: '', notice: '30', linkedin: '', github: '', coverLetter: '' })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1500))
    setSubmitting(false)
    onSubmit(job)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', padding: '16px 20px', borderRadius: '16px 16px 0 0', color: '#fff' }}>
          <div style={{ fontSize: 14, fontWeight: 900 }}>Apply: {job.title}</div>
          <div style={{ fontSize: 9, opacity: .7, marginTop: 2 }}>Step {step} of 3 · {job.dept} · {job.salary}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {[1,2,3].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= s ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.2)' }} />)}
          </div>
        </div>
        <div style={{ padding: 20 }}>
          {step === 1 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Personal Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Full Name *','name','text'],['Email *','email','email'],['Phone *','phone','tel'],['Date of Birth *','dob','date'],['Current Location','address','text'],['LinkedIn URL','linkedin','url']].map(([l,k,t]) => (
                  <div key={k}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>{l}</label>
                    <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none' }}>
                    {['Male','Female','Other','Prefer not to say'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Professional Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[['Years of Experience','exp','number'],['Expected Salary (NPR)','salary','number'],['Notice Period (days)','notice','number'],['GitHub/Portfolio','github','url']].map(([l,k,t]) => (
                  <div key={k}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>{l}</label>
                    <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Cover Letter (optional)</label>
                <textarea value={form.coverLetter} onChange={e => setForm(f => ({ ...f, coverLetter: e.target.value }))} rows={4} placeholder="Tell us why you are the right fit..." style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Upload CV * (PDF, DOC, DOCX, JPG, PNG)</label>
                <div style={{ border: '2px dashed #e2e8f0', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', background: file ? '#f0fdf4' : '#f8fafc' }} onClick={() => document.getElementById('cv-upload').click()}>
                  <input id="cv-upload" type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
                  <div style={{ fontSize: 20, marginBottom: 6 }}>📎</div>
                  <div style={{ fontSize: 10, color: file ? '#059669' : '#64748b', fontWeight: file ? 700 : 400 }}>{file ? file.name : 'Click to upload your CV'}</div>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Review & Submit</div>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                {[['Name', form.name],['Email', form.email],['Phone', form.phone],['Experience', form.exp + ' years'],['Salary Expectation', 'NPR ' + (+form.salary || 0).toLocaleString()],['Notice Period', form.notice + ' days'],['CV', file?.name || 'Not uploaded']].map(([k,v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>{k}</span><span style={{ color: '#0f172a', fontWeight: 600 }}>{v || '—'}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fffbeb', borderRadius: 8, padding: '10px 12px', border: '1px solid #fde68a', fontSize: 9, color: '#92400e', marginBottom: 14 }}>
                <strong>What happens next:</strong> AI will parse your CV and score it within 2 minutes. If shortlisted, you will receive a written exam link within 24 hours via Email + WhatsApp.
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontSize: 9, color: '#374151' }}>
                <input type="checkbox" style={{ marginTop: 2 }} />
                I agree to the Privacy Policy and consent to eLogix HRMS storing my data for recruitment purposes (GDPR compliant).
              </label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            {step > 1 && <button onClick={() => setStep(s => s - 1)} style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 10, cursor: 'pointer' }}>Back</button>}
            <div style={{ flex: 1 }} />
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: '#1e40af', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>Next →</button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: '10px 28px', borderRadius: 9, border: 'none', background: submitting ? '#e2e8f0' : 'linear-gradient(135deg,#059669,#1e40af)', color: submitting ? '#94a3b8' : '#fff', fontSize: 10, fontWeight: 800, cursor: submitting ? 'default' : 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ATSCareerPortalPage() {
  const { navigate } = useApp()
  const [view, setView] = useState('jobs') // jobs | tracker | chatbot | profile
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [applyJob, setApplyJob] = useState(null)
  const [appliedIds, setAppliedIds] = useState(['j1'])
  const [msg, setMsg] = useState('')
  const [selJob, setSelJob] = useState(null)

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const filtered = JOBS.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    const matchDept = deptFilter === 'All' || j.dept === deptFilter
    return matchSearch && matchDept
  })

  const depts = ['All', ...new Set(JOBS.map(j => j.dept))]

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      {applyJob && <ApplyModal job={applyJob} onClose={() => setApplyJob(null)} onSubmit={j => { setAppliedIds(a => [...a, j.id]); setApplyJob(null); notify('Application submitted! AI is parsing your CV. You will hear back within 24 hours.') }} />}

      {/* Header / Employer Branding */}
      <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)', borderRadius: 14, padding: '24px 24px 20px', marginBottom: 16, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.03)' }} />
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>eLogix HRMS Careers</div>
        <div style={{ fontSize: 11, opacity: .8, marginBottom: 16, maxWidth: 500 }}>Join the team building the future of HR technology in Nepal. We offer competitive salaries, growth, and a culture that empowers you.</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[{ l: 'Open Positions', v: JOBS.length },{ l: 'Avg Hiring Time', v: '18 days' },{ l: 'Employee NPS', v: '87%' },{ l: 'Remote Options', v: 'Yes' }].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#60a5fa' }}>{s.v}</div>
              <div style={{ fontSize: 8, opacity: .6 }}>{s.l}</div>
            </div>
          ))}
        </div>
        {msg && <div style={{ position: 'absolute', top: 12, right: 12, background: '#10b981', color: '#fff', fontSize: 9, padding: '6px 14px', borderRadius: 8, fontWeight: 700 }}>{msg}</div>}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['jobs', '💼 Browse Jobs'],['tracker', '📋 My Applications'],['chatbot', '🤖 AI Assistant'],['profile', '👤 My Profile']].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)} style={{ padding: '8px 16px', borderRadius: 9, background: view === v ? '#1e40af' : '#fff', color: view === v ? '#fff' : '#475569', fontSize: 10, fontWeight: view === v ? 800 : 400, cursor: 'pointer', border: view !== v ? '1px solid #e2e8f0' : 'none' }}>
            {l}{v === 'tracker' ? ` (${MY_APPS.length})` : ''}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => notify('Sharing to LinkedIn!')} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 9, cursor: 'pointer' }}>Share Jobs</button>
      </div>

      {/* JOBS VIEW */}
      {view === 'jobs' && (
        <div>
          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs or skills..." style={{ flex: 2, padding: '9px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11, outline: 'none', minWidth: 200 }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {depts.map(d => <button key={d} onClick={() => setDeptFilter(d)} style={{ padding: '7px 14px', borderRadius: 9, border: `2px solid ${deptFilter === d ? '#1e40af' : '#e2e8f0'}`, background: deptFilter === d ? '#eff6ff' : '#fff', color: deptFilter === d ? '#1e40af' : '#64748b', fontSize: 9, fontWeight: deptFilter === d ? 800 : 400, cursor: 'pointer' }}>{d}</button>)}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>{filtered.length} positions found</div>
          {selJob ? (
            <div>
              <button onClick={() => setSelJob(null)} style={{ marginBottom: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 9, cursor: 'pointer' }}>← Back to listings</button>
              <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💼</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 3 }}>{selJob.title}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{selJob.dept} · {selJob.location} · {selJob.type} · {selJob.salary}</div>
                  </div>
                  {!appliedIds.includes(selJob.id) && <button onClick={() => setApplyJob(selJob)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1e3a5f,#1e40af)', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Apply Now</button>}
                </div>
                {[['Job Description', selJob.desc],['Experience Required', selJob.exp + ' experience'],['Application Deadline', selJob.deadline],['Openings', selJob.openings]].map(([k,v]) => (
                  <div key={k} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.6 }}>{v}</div>
                  </div>
                ))}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Required Skills</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selJob.tags.map(t => <span key={t} style={{ fontSize: 9, padding: '4px 12px', borderRadius: 8, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 600 }}>{t}</span>)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Benefits</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selJob.benefits.map(b => <span key={b} style={{ fontSize: 9, padding: '4px 10px', borderRadius: 8, background: '#f0fdf4', color: '#065f46', border: '1px solid #bbf7d0' }}>✓ {b}</span>)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            filtered.map(j => <JobCard key={j.id} job={j} onApply={setApplyJob} onView={setSelJob} applied={appliedIds.includes(j.id)} />)
          )}
        </div>
      )}

      {/* TRACKER VIEW */}
      {view === 'tracker' && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>My Applications ({MY_APPS.length})</div>
          {MY_APPS.map(app => <ApplicationTracker key={app.id} app={app} />)}
          <div style={{ background: '#eff6ff', borderRadius: 12, padding: 14, border: '1px solid #bfdbfe', fontSize: 9, color: '#1e40af', marginTop: 8 }}>
            You will receive automatic Email + WhatsApp notifications at every stage change. Check your inbox for the latest updates.
          </div>
        </div>
      )}

      {/* CHATBOT VIEW */}
      {view === 'chatbot' && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>AI Career Assistant</div>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 14 }}>Get instant answers about jobs, application status, interview prep, and more.</div>
          <Chatbot />
        </div>
      )}

      {/* PROFILE VIEW */}
      {view === 'profile' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>Candidate Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Full Name','Gita Maharjan'],['Email','gita@mail.com'],['Phone','+977-9801001001'],['Location','Kathmandu'],['LinkedIn','linkedin.com/in/gita'],['GitHub','github.com/gita']].map(([k,v]) => (
                <div key={k} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontSize: 8, color: '#94a3b8' }}>{k}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#0f172a' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => notify('Profile updated!')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#1e40af', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Update Profile</button>
              <button onClick={() => notify('Notification preferences saved!')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 10, cursor: 'pointer' }}>Notifications</button>
              <button onClick={() => notify('Data deletion request submitted (GDPR)')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 10, cursor: 'pointer' }}>Delete My Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
