// ATSReferralPage.jsx - Employee Referral Programme Management
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const REFERRALS = [
  { id:'r1', referrer:'Bikash Shrestha', candidate:'Sanjay Thapa',   job:'Senior React Dev',  date:'2081-08-10', status:'Hired',    bonus:'NPR 15,000', paid:true },
  { id:'r2', referrer:'Maya Pradhan',    candidate:'Priya Shrestha', job:'Product Manager',   date:'2081-08-15', status:'Shortlisted',bonus:'NPR 10,000',paid:false },
  { id:'r3', referrer:'Anita Gurung',    candidate:'Dev Karki',      job:'Data Scientist',    date:'2081-08-20', status:'Interview', bonus:'NPR 12,000', paid:false },
  { id:'r4', referrer:'Ramesh Koirala',  candidate:'Sita Rai',       job:'Finance Analyst',   date:'2081-08-22', status:'Rejected',  bonus:'—',          paid:false },
  { id:'r5', referrer:'Bikash Shrestha', candidate:'Rohan Acharya',  job:'Senior React Dev',  date:'2081-08-25', status:'Applied',   bonus:'NPR 15,000', paid:false },
]

const JOBS_OPEN = [
  { title:'Senior React Developer', bonus:'NPR 15,000', dept:'Technology' },
  { title:'Finance Manager',        bonus:'NPR 12,000', dept:'Finance' },
  { title:'Data Scientist',         bonus:'NPR 12,000', dept:'Technology' },
  { title:'HR Business Partner',    bonus:'NPR 8,000',  dept:'HR' },
]

const statusColor = { Hired:'#059669', Shortlisted:'#1e40af', Interview:'#8b5cf6', Applied:'#f59e0b', Rejected:'#ef4444' }
const statusBg = { Hired:'#f0fdf4', Shortlisted:'#eff6ff', Interview:'#f5f3ff', Applied:'#fffbeb', Rejected:'#fef2f2' }

export default function ATSReferralPage() {
  const { navigate } = useApp()
  const [form, setForm] = useState({ name:'', email:'', phone:'', job:'', relationship:'', note:'' })
  const [submitted, setSubmitted] = useState(false)
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const totalBonus = REFERRALS.filter(r => r.status === 'Hired').reduce((s, r) => s + 15000, 0)

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'linear-gradient(135deg,#f59e0b,#dc2626)', borderRadius:14, padding:'16px 22px', marginBottom:16, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>Employee Referral Programme</h2>
          <p style={{ margin:'3px 0 0', fontSize:10, opacity:.8 }}>Refer great people · Earn bonuses · Fastest quality hires · Track status</p>
        </div>
        {msg && <span style={{ fontSize:9, padding:'5px 12px', background:'rgba(255,255,255,.2)', borderRadius:8 }}>{msg}</span>}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[{ l:'Total Referrals', v:REFERRALS.length, c:'#f59e0b' },{ l:'Hired via Referral', v:REFERRALS.filter(r=>r.status==='Hired').length, c:'#059669' },{ l:'Conversion Rate', v:'20%', c:'#1e40af' },{ l:'Bonus Paid', v:'NPR '+totalBonus.toLocaleString(), c:'#8b5cf6' }].map((s,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:10, padding:'9px 14px', border:'1px solid #f1f5f9', flex:'1 1 100px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:900, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:8, color:'#94a3b8' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14 }}>
        <div>
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>Submit a Referral</div>
            {submitted ? (
              <div style={{ textAlign:'center', padding:'30px 0' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🎉</div>
                <div style={{ fontSize:13, fontWeight:800, color:'#059669' }}>Referral Submitted!</div>
                <div style={{ fontSize:10, color:'#64748b', marginTop:4 }}>We will contact your referral within 24 hours. Track status in the table below.</div>
                <button onClick={() => setSubmitted(false)} style={{ marginTop:14, padding:'9px 20px', borderRadius:9, border:'none', background:'#f59e0b', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>Refer Another</button>
              </div>
            ) : (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['Candidate Name *','name','text'],['Candidate Email *','email','email'],['Candidate Phone','phone','tel'],['Your Relationship','relationship','text']].map(([l,k,t]) => (
                    <div key={k}>
                      <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>{l}</label>
                      <input type={t} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={l.replace(' *','')} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12 }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Referring for Job Position *</label>
                  <select value={form.job} onChange={e => setForm(f => ({ ...f, job: e.target.value }))} style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none' }}>
                    <option value="">-- Select Position --</option>
                    {JOBS_OPEN.map(j => <option key={j.title} value={j.title}>{j.title} — Bonus: {j.bonus}</option>)}
                  </select>
                </div>
                <div style={{ marginTop:12 }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'#374151', display:'block', marginBottom:3 }}>Why are you recommending this person?</label>
                  <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} placeholder="Brief note on their skills, experience, and why they would be a great fit..." style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:10, outline:'none', resize:'vertical', boxSizing:'border-box' }} />
                </div>
                <button onClick={() => { if (form.name && form.email && form.job) { setSubmitted(true); notify('Referral submitted! Candidate will be contacted within 24h.') } else notify('Please fill in required fields.') }}
                  style={{ marginTop:14, width:'100%', padding:'11px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#f59e0b,#dc2626)', color:'#fff', fontSize:11, fontWeight:800, cursor:'pointer' }}>
                  Submit Referral
                </button>
              </div>
            )}
          </div>

          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:12 }}>My Referral Tracker</div>
            {REFERRALS.map(r => (
              <div key={r.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'9px 0', borderBottom:'1px solid #f8fafc', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{r.candidate}</div>
                  <div style={{ fontSize:8, color:'#64748b' }}>{r.job} · Referred by {r.referrer} · {r.date}</div>
                </div>
                <span style={{ fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:6, background:statusBg[r.status]||'#f8fafc', color:statusColor[r.status]||'#64748b' }}>{r.status}</span>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:9, fontWeight:700, color:r.paid?'#059669':'#94a3b8' }}>{r.bonus}</div>
                  <div style={{ fontSize:7, color:r.paid?'#059669':'#94a3b8' }}>{r.paid?'Paid':'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Open Positions with Bonus</div>
            {JOBS_OPEN.map(j => (
              <div key={j.title} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 10px', background:'#f8fafc', borderRadius:9, marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{j.title}</div>
                  <div style={{ fontSize:8, color:'#64748b' }}>{j.dept}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, fontWeight:900, color:'#f59e0b' }}>{j.bonus}</div>
                  <div style={{ fontSize:7, color:'#94a3b8' }}>if hired</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:'#fffbeb', borderRadius:12, padding:14, border:'1px solid #fde68a' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#92400e', marginBottom:8 }}>How Referral Bonus Works</div>
            {[['Submit referral','Candidate application tracked to you'],['Candidate gets hired','Referral bonus approved by HR'],['After 3-month probation','Bonus credited to your salary'],['Track real-time status','See progress in tracker above']].map(([t,d],i) => (
              <div key={i} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:i<3?'1px solid #fde68a30':'none' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'#f59e0b', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, flexShrink:0 }}>{i+1}</div>
                <div><div style={{ fontSize:9, fontWeight:700, color:'#92400e' }}>{t}</div><div style={{ fontSize:8, color:'#b45309' }}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
