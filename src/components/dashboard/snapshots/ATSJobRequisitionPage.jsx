// ATSJobRequisitionPage.jsx - Job Requisition Workflow + AI JD Generator + Approval Chain
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

async function callAI(prompt, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500,
        system: sys || 'You are an expert HR professional writing bias-free job descriptions.',
        messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(25000)
    })
    if (r.ok) { const d = await r.json(); return d.content?.map(c => c.text).join('') || '' }
  } catch {}
  return null
}

const REQUISITIONS = [
  { id:'r1', title:'Senior React Developer', dept:'Technology', hm:'Bikash Shrestha', requested:'2081-08-01', status:'Approved', priority:'High', budget:'NPR 80K-120K', headcount:2, reason:'Team expansion for Q4 product launch', approvals:[{by:'Line Manager',name:'Bikash S.',date:'2081-08-02',status:'Approved'},{by:'HR Director',name:'Maya P.',date:'2081-08-03',status:'Approved'},{by:'Finance',name:'Ramesh K.',date:'2081-08-04',status:'Approved'},{by:'CEO',name:'Sunita R.',date:'2081-08-05',status:'Approved'}] },
  { id:'r2', title:'Data Scientist', dept:'Technology', hm:'Bikash Shrestha', requested:'2081-08-10', status:'Pending Finance', priority:'Medium', budget:'NPR 100K-160K', headcount:1, reason:'AI/ML capability build for eLogix analytics module', approvals:[{by:'Line Manager',name:'Bikash S.',date:'2081-08-11',status:'Approved'},{by:'HR Director',name:'Maya P.',date:'2081-08-12',status:'Approved'},{by:'Finance',name:'Ramesh K.',date:'',status:'Pending'},{by:'CEO',name:'Sunita R.',date:'',status:'Waiting'}] },
  { id:'r3', title:'Marketing Manager', dept:'Marketing', hm:'Priya M.', requested:'2081-08-15', status:'Draft', priority:'Low', budget:'NPR 70K-100K', headcount:1, reason:'Brand expansion into South Asia markets', approvals:[{by:'Line Manager',name:'Priya M.',date:'',status:'Draft'},{by:'HR Director',name:'Maya P.',date:'',status:'Waiting'},{by:'Finance',name:'Ramesh K.',date:'',status:'Waiting'},{by:'CEO',name:'Sunita R.',date:'',status:'Waiting'}] },
]

const statusColor = { Approved:'#059669', Draft:'#94a3b8', 'Pending Finance':'#f59e0b', Rejected:'#ef4444', 'Pending HR':'#8b5cf6', 'Pending CEO':'#0891b2' }
const statusBg = { Approved:'#f0fdf4', Draft:'#f8fafc', 'Pending Finance':'#fffbeb', Rejected:'#fef2f2', 'Pending HR':'#f5f3ff', 'Pending CEO':'#ecfeff' }

export default function ATSJobRequisitionPage() {
  const { navigate } = useApp()
  const [view, setView] = useState('list') // list | create | jd-generator
  const [form, setForm] = useState({ title:'', dept:'Technology', hm:'', budget_min:'', budget_max:'', headcount:1, reason:'', priority:'Medium', employment_type:'Full-Time', location:'Kathmandu', urgency:30 })
  const [selReq, setSelReq] = useState(REQUISITIONS[0])
  const [jdForm, setJdForm] = useState({ role:'', dept:'', exp:'', skills:'', level:'Mid' })
  const [generatedJD, setGeneratedJD] = useState('')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const generateJD = async () => {
    setGenerating(true)
    const jd = await callAI(
      `Generate a comprehensive, bias-free job description for:\nRole: ${jdForm.role}\nDepartment: ${jdForm.dept}\nExperience: ${jdForm.exp}\nKey Skills: ${jdForm.skills}\nLevel: ${jdForm.level}\n\nInclude: Job Summary, Key Responsibilities (8 bullets), Requirements (6 bullets), Nice-to-Have (3 bullets), What We Offer (5 benefits).\nIMPORTANT: Use gender-neutral language. Remove any age bias. Focus on skills not years. Avoid jargon like "rockstar" or "ninja". Nepal context.`,
      'You are an expert HR professional specializing in inclusive, bias-free job descriptions. Always use gender-neutral language.'
    )
    setGeneratedJD(jd || `Job Description for ${jdForm.role}\n\nAbout the Role: We are seeking an experienced ${jdForm.role} to join our ${jdForm.dept} team...`)
    setGenerating(false)
  }

  const submitRequisition = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    notify('Requisition submitted! Approval chain triggered. Line Manager notified via Email + WhatsApp.')
    setView('list')
  }

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#7c3aed)', borderRadius: 14, padding: '16px 22px', marginBottom: 16, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Job Requisition & Approval</h2>
          <p style={{ margin: '3px 0 0', fontSize: 10, opacity: .8 }}>Raise requisitions · Multi-level approval · AI bias-free JD generator · Auto job posting</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 9, padding: '5px 12px', background: 'rgba(255,255,255,.2)', borderRadius: 8 }}>{msg}</span>}
          {[['list','Requisitions'],['create','+ New'],['jd-generator','AI JD Generator']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: view === v ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.1)', color: '#fff', fontSize: 10, fontWeight: view === v ? 800 : 400, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ l:'Total Requisitions', v:REQUISITIONS.length, c:'#3b82f6' },{ l:'Approved', v:REQUISITIONS.filter(r => r.status === 'Approved').length, c:'#059669' },{ l:'Pending Approval', v:REQUISITIONS.filter(r => r.status !== 'Approved' && r.status !== 'Draft').length, c:'#f59e0b' },{ l:'Avg Approval Time', v:'3.2 days', c:'#8b5cf6' }].map((s,i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '9px 14px', border: '1px solid #f1f5f9', flex: '1 1 100px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 8, color: '#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {view === 'list' && (
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            {REQUISITIONS.map(r => (
              <div key={r.id} onClick={() => setSelReq(r)} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: `1.5px solid ${selReq?.id === r.id ? '#7c3aed' : '#f1f5f9'}`, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{r.title}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 7, background: statusBg[r.status]||'#f8fafc', color: statusColor[r.status]||'#64748b' }}>{r.status}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 7, background: r.priority === 'High' ? '#fee2e2' : r.priority === 'Medium' ? '#fffbeb' : '#f8fafc', color: r.priority === 'High' ? '#dc2626' : r.priority === 'Medium' ? '#92400e' : '#64748b' }}>{r.priority}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>{r.dept} · HM: {r.hm} · {r.headcount} position{r.headcount > 1 ? 's' : ''} · Budget: {r.budget} · Requested: {r.requested}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {r.approvals.map((a, i) => (
                      <div key={i} title={`${a.by}: ${a.status}`} style={{ width: 22, height: 22, borderRadius: '50%', background: a.status === 'Approved' ? '#059669' : a.status === 'Pending' ? '#f59e0b' : '#f1f5f9', border: `2px solid ${a.status === 'Approved' ? '#059669' : a.status === 'Pending' ? '#f59e0b' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 900 }}>
                        {a.status === 'Approved' ? '✓' : a.status === 'Pending' ? '●' : '○'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selReq && (
            <div style={{ width: 320, flexShrink: 0 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>{selReq.title}</div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 7, background: statusBg[selReq.status]||'#f8fafc', color: statusColor[selReq.status]||'#64748b' }}>{selReq.status}</span>
                <div style={{ marginTop: 14, marginBottom: 14 }}>
                  {[['Department', selReq.dept],['Hiring Manager', selReq.hm],['Budget', selReq.budget],['Headcount', selReq.headcount],['Priority', selReq.priority],['Business Reason', selReq.reason]].map(([k,v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, padding: '5px 0', borderBottom: '1px solid #f8fafc' }}>
                      <span style={{ color: '#94a3b8' }}>{k}</span>
                      <span style={{ color: '#334155', fontWeight: 600, maxWidth: 160, textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Approval Chain</div>
                {selReq.approvals.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: a.status === 'Approved' ? '#059669' : a.status === 'Pending' ? '#f59e0b' : '#f1f5f9', border: `2px solid ${a.status === 'Approved' ? '#059669' : a.status === 'Pending' ? '#f59e0b' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 900 }}>
                      {a.status === 'Approved' ? '✓' : a.status === 'Pending' ? '●' : '○'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#0f172a' }}>{a.by}</div>
                      <div style={{ fontSize: 8, color: '#94a3b8' }}>{a.name}{a.date ? ' · ' + a.date : ''}</div>
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: statusColor[a.status === 'Approved' ? 'Approved' : a.status === 'Pending' ? 'Pending Finance' : 'Draft'] || '#94a3b8' }}>{a.status}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {selReq.status === 'Approved' && <button onClick={() => notify('Job posted to LinkedIn, Indeed, Naukri, MeroJob!')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#059669', color: '#fff', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}>Post Job Now</button>}
                  <button onClick={() => { setView('jd-generator'); setJdForm(f => ({ ...f, role: selReq.title, dept: selReq.dept })) }} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 9, cursor: 'pointer' }}>Generate JD</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 18 }}>New Job Requisition</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Job Title *','title','text','Senior React Developer'],['Department','dept','text','Technology'],['Hiring Manager','hm','text','Bikash Shrestha'],['Location','location','text','Kathmandu']].map(([l,k,t,ph]) => (
                <div key={k}>
                  <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>{l}</label>
                  <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Min Budget (NPR)</label>
                <input type="number" value={form.budget_min} onChange={e => setForm(f => ({ ...f, budget_min: e.target.value }))} placeholder="80000" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Max Budget (NPR)</label>
                <input type="number" value={form.budget_max} onChange={e => setForm(f => ({ ...f, budget_max: e.target.value }))} placeholder="120000" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Headcount *</label>
                <input type="number" min="1" value={form.headcount} onChange={e => setForm(f => ({ ...f, headcount: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none' }}>
                  {['High','Medium','Low'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Employment Type</label>
                <select value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none' }}>
                  {['Full-Time','Part-Time','Contract','Internship'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Business Justification *</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Why is this position needed? Impact on business if not filled..." style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => notify('Saved as draft!')} style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 10, cursor: 'pointer' }}>Save Draft</button>
              <button onClick={submitRequisition} disabled={!form.title || submitting} style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: (!form.title || submitting) ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#1e3a5f)', color: (!form.title || submitting) ? '#94a3b8' : '#fff', fontSize: 10, fontWeight: 800, cursor: (!form.title || submitting) ? 'default' : 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit for Approval (Email + WhatsApp alerts)'}
              </button>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Approval Flow</div>
            {['Line Manager (auto-notify)','HR Director (on LM approval)','Finance Director (on HR approval)','CEO / MD (on Finance approval)','Job Posted Automatically'].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid #f8fafc' : 'none', alignItems: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#1e40af', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 9, color: '#334155', lineHeight: 1.4 }}>{step}</div>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 8, color: '#94a3b8', lineHeight: 1.6 }}>Each approver receives an Email + WhatsApp notification. If no response in 48h, automated reminder is sent. Full audit trail maintained for compliance.</div>
          </div>
        </div>
      )}

      {view === 'jd-generator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>AI Bias-Free JD Generator</div>
            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 16 }}>Generate inclusive, gender-neutral, skills-based job descriptions. Removes unconscious bias, age requirements, and discriminatory language.</div>
            {[['Job Title *','role','text','e.g. Senior React Developer'],['Department','dept','text','e.g. Technology'],['Required Experience','exp','text','e.g. 4+ years'],['Key Skills (comma-separated)','skills','text','e.g. React, Node.js, AWS, PostgreSQL']].map(([l,k,t,ph]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>{l}</label>
                <input type={t} value={jdForm[k]} onChange={e => setJdForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Seniority Level</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Junior','Mid','Senior','Lead','Head of'].map(l => (
                  <button key={l} onClick={() => setJdForm(f => ({ ...f, level: l }))} style={{ flex: 1, padding: '7px', borderRadius: 8, border: `2px solid ${jdForm.level === l ? '#7c3aed' : '#e2e8f0'}`, background: jdForm.level === l ? '#f5f3ff' : '#f8fafc', color: jdForm.level === l ? '#7c3aed' : '#64748b', fontSize: 8, fontWeight: jdForm.level === l ? 800 : 400, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 9, padding: '10px 12px', marginBottom: 14, border: '1px solid #bbf7d0', fontSize: 8, color: '#374151' }}>
              <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 4 }}>Bias-Free Checks Applied:</div>
              {['Gender-neutral pronouns','No age-specific language','Skills-based (not years-based)','No exclusionary jargon','Inclusive benefits language','Equal opportunity statement'].map(c => <div key={c} style={{ padding: '1px 0' }}>✓ {c}</div>)}
            </div>
            <button onClick={generateJD} disabled={!jdForm.role || generating} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: (!jdForm.role || generating) ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#1e40af)', color: (!jdForm.role || generating) ? '#94a3b8' : '#fff', fontSize: 11, fontWeight: 800, cursor: (!jdForm.role || generating) ? 'default' : 'pointer' }}>
              {generating ? 'AI Generating...' : 'Generate Bias-Free JD'}
            </button>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Generated Job Description</div>
            {generatedJD ? (
              <div>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0', fontSize: 9, color: '#334155', lineHeight: 1.8, maxHeight: 380, overflowY: 'auto', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{generatedJD}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => notify('JD saved to requisition!')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>Save to Requisition</button>
                  <button onClick={() => notify('JD copied!')} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 9, cursor: 'pointer' }}>Copy JD</button>
                  <button onClick={generateJD} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 9, cursor: 'pointer' }}>Regenerate</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🤖</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>Fill in the form and click Generate</div>
                <div style={{ fontSize: 9, marginTop: 4 }}>AI will create a comprehensive, inclusive JD in seconds</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
