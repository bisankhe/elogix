// ATSRecruiterDashPage.jsx - World-Class Recruiter Dashboard
// KPIs, pipeline, jobs, revenue, performance ranking, time to hire, cost per hire
import { useState } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const RECRUITERS = [
  { id:'r1', name:'Anita Gurung',   avatar:'AG', title:'Senior Recruiter', jobs:8, candidates:124, shortlisted:28, interviews:18, offers:6, joined:5, rejected:96, ttHire:14, costPerHire:38000, revenue:450000, quality:89, nps:82, rank:1 },
  { id:'r2', name:'Priya Maharjan', avatar:'PM', title:'Recruiter',        jobs:6, candidates:88,  shortlisted:19, interviews:12, offers:4, joined:3, rejected:72, ttHire:19, costPerHire:52000, revenue:280000, quality:81, nps:74, rank:2 },
  { id:'r3', name:'Dev Karki',      avatar:'DK', title:'Junior Recruiter', jobs:4, candidates:56,  shortlisted:11, interviews:7,  offers:2, joined:2, rejected:46, ttHire:24, costPerHire:61000, revenue:160000, quality:74, nps:68, rank:3 },
]

const PIPELINE = [
  { stage:'Total Applications', v:342, color:'#3b82f6' },
  { stage:'AI Screened',        v:284, color:'#8b5cf6' },
  { stage:'Shortlisted',        v:47,  color:'#0891b2' },
  { stage:'Written Exam',       v:38,  color:'#f59e0b' },
  { stage:'Video Interview',    v:24,  color:'#f97316' },
  { stage:'Physical Interview', v:14,  color:'#ec4899' },
  { stage:'Offers Made',        v:8,   color:'#10b981' },
  { stage:'Joined',             v:6,   color:'#059669' },
]

const MY_JOBS = [
  { title:'Senior React Developer', status:'Active',    apps:58, shortlisted:14, stage:'Interview', daysOpen:12, target:2, filled:0, urgent:true },
  { title:'Finance Manager',        status:'Active',    apps:42, shortlisted:8,  stage:'Offer',     daysOpen:28, target:1, filled:0, urgent:false },
  { title:'Data Scientist',         status:'Active',    apps:36, shortlisted:6,  stage:'Exam',      daysOpen:8,  target:1, filled:0, urgent:true },
  { title:'Marketing Manager',      status:'Completed', apps:67, shortlisted:10, stage:'Hired',     daysOpen:35, target:1, filled:1, urgent:false },
]

function MetricCard({ icon, label, value, sub, color, badge }) {
  return (
    <div style={{ background:'#fff', borderRadius:13, padding:'14px 16px', border:'1px solid #f1f5f9', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
        {badge && <span style={{ fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:5, background:badge.bg, color:badge.c }}>{badge.v}</span>}
      </div>
      <div style={{ fontSize:22, fontWeight:900, color }}>{value}</div>
      <div style={{ fontSize:10, fontWeight:700, color:'#334155', marginTop:1 }}>{label}</div>
      {sub && <div style={{ fontSize:8, color:'#94a3b8', marginTop:2 }}>{sub}</div>}
    </div>
  )

export default function ATSRecruiterDashPage() {
  const { navigate } = useApp()
  const [selRec, setSelRec] = useState(RECRUITERS[0])
  const [period, setPeriod] = useState('This Month')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#059669)', borderRadius:14, padding:'16px 22px', marginBottom:16, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900 }}>Recruiter Dashboard</h2>
          <p style={{ margin:'3px 0 0', fontSize:10, opacity:.8 }}>Personal KPIs · Pipeline · Revenue · Quality of Hire · Time to Hire · Team Ranking</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {msg && <span style={{ fontSize:9, padding:'5px 12px', background:'rgba(255,255,255,.2)', borderRadius:8 }}>{msg}</span>}
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding:'7px 12px', borderRadius:8, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:9, outline:'none' }}>
            {['This Month','Last Month','Last 3 Months','This FY 2081'].map(p => <option key={p} style={{ color:'#000' }}>{p}</option>)}
          </select>
          <button onClick={() => notify('Report exported!')} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)', background:'transparent', color:'#fff', fontSize:9, cursor:'pointer' }}>Export Report</button>
        </div>
      </div>

      {/* My KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        <MetricCard icon="💼" label="Active Jobs" value={MY_JOBS.filter(j=>j.status==='Active').length} sub="Assigned to me" color="#1e40af" />
        <MetricCard icon="👥" label="Total Candidates" value={selRec.candidates} sub={`${selRec.shortlisted} shortlisted`} color="#7c3aed" />
        <MetricCard icon="⏱" label="Avg Time to Hire" value={selRec.ttHire+'d'} sub="vs 24d benchmark" color="#059669" badge={{ v:'↓ Better', bg:'#f0fdf4', c:'#059669' }} />
        <MetricCard icon="💰" label="Revenue Generated" value={'NPR '+selRec.revenue.toLocaleString()} sub="from placements" color="#f59e0b" />
        <MetricCard icon="🎯" label="Quality of Hire" value={selRec.quality+'%'} sub="Hiring manager rating" color="#0891b2" />
        <MetricCard icon="📊" label="Offer Acceptance" value={Math.round(selRec.joined/selRec.offers*100)+'%'} sub={`${selRec.offers} offers, ${selRec.joined} joined`} color="#8b5cf6" />
        <MetricCard icon="💵" label="Cost per Hire" value={'NPR '+selRec.costPerHire.toLocaleString()} sub="all channels avg" color="#f97316" badge={{ v: selRec.costPerHire < 50000 ? '✓ Under Budget':'⚠️ Over', bg: selRec.costPerHire<50000?'#f0fdf4':'#fff7ed', c: selRec.costPerHire<50000?'#059669':'#92400e' }} />
        <MetricCard icon="⭐" label="Candidate NPS" value={selRec.nps} sub="candidate experience score" color="#ec4899" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14 }}>
        <div>
          {/* Hiring pipeline */}
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #f1f5f9', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:14 }}>Hiring Pipeline — {period}</div>
            {PIPELINE.map((p,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ fontSize:9, color:'#64748b', width:140, flexShrink:0 }}>{p.stage}</div>
                <div style={{ flex:1, height:22, background:'#f1f5f9', borderRadius:5, overflow:'hidden', position:'relative' }}>
                  <div style={{ height:'100%', width:Math.round(p.v/342*100)+'%', background:p.color, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:6 }}>
                    {Math.round(p.v/342*100) > 10 && <span style={{ fontSize:8, color:'#fff', fontWeight:700 }}>{Math.round(p.v/342*100)}%</span>}
                  </div>
                </div>
                <div style={{ fontSize:12, fontWeight:900, color:p.color, width:36, textAlign:'right', flexShrink:0 }}>{p.v}</div>
              </div>
            ))}
            <div style={{ fontSize:9, color:'#64748b', marginTop:6 }}>Overall conversion: {Math.round(6/342*100*10)/10}% · Industry avg: 1.5–2.5%</div>
          </div>

          {/* My jobs */}
          <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:12 }}>My Active Jobs</div>
            {MY_JOBS.map((j,i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 12px', background:'#f8fafc', borderRadius:10, marginBottom:8, border:`1px solid ${j.urgent?'#fecaca':'#f1f5f9'}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:3, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'#0f172a' }}>{j.title}</span>
                    {j.urgent && <span style={{ fontSize:8, fontWeight:700, padding:'1px 6px', borderRadius:5, background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}>🔥 Urgent</span>}
                    <span style={{ fontSize:8, padding:'1px 6px', borderRadius:5, background:j.status==='Completed'?'#f0fdf4':'#eff6ff', color:j.status==='Completed'?'#059669':'#1e40af' }}>{j.status}</span>
                  </div>
                  <div style={{ fontSize:9, color:'#64748b' }}>{j.daysOpen} days open · Stage: {j.stage} · {j.filled}/{j.target} filled</div>
                </div>
                <div style={{ display:'flex', gap:10, flexShrink:0 }}>
                  {[{l:'Apps',v:j.apps},{l:'Short.',v:j.shortlisted}].map(s => (
                    <div key={s.l} style={{ textAlign:'center', padding:'4px 10px', background:'#fff', borderRadius:7, border:'1px solid #f1f5f9' }}>
                      <div style={{ fontSize:14, fontWeight:900, color:'#1e40af' }}>{s.v}</div>
                      <div style={{ fontSize:7, color:'#94a3b8' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => notify('Opening job details!')} style={{ padding:'6px 12px', borderRadius:7, border:'none', background:'#1e40af', color:'#fff', fontSize:8, cursor:'pointer' }}>View</button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Team ranking + AI tips */}
        <div>
          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #f1f5f9', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:12 }}>Team Performance Ranking</div>
            {RECRUITERS.map((r,i) => (
              <div key={r.id} onClick={() => setSelRec(r)} style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background:selRec.id===r.id?'#eff6ff':'#f8fafc', borderRadius:10, marginBottom:8, border:`1.5px solid ${selRec.id===r.id?'#1e40af':'#f1f5f9'}`, cursor:'pointer' }}>
                <div style={{ fontSize:20, flexShrink:0 }}>{i===0?'🥇':i===1?'🥈':'🥉'}</div>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1e3a5f,#1e40af)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff', flexShrink:0 }}>{r.avatar}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{r.name}</div>
                  <div style={{ fontSize:8, color:'#64748b' }}>{r.title} · {r.joined} hires</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:14, fontWeight:900, color: i===0?'#059669':i===1?'#1e40af':'#f59e0b' }}>{r.ttHire}d</div>
                  <div style={{ fontSize:7, color:'#94a3b8' }}>time-to-hire</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #f1f5f9', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:10 }}>Selected: {selRec.name}</div>
            {[['Jobs Assigned',selRec.jobs],['Candidates Managed',selRec.candidates],['Interviews Arranged',selRec.interviews],['Offers Made',selRec.offers],['Successful Hires',selRec.joined],['Revenue Generated','NPR '+selRec.revenue.toLocaleString()],['Quality Score',selRec.quality+'%'],['Candidate NPS',selRec.nps]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:9, padding:'4px 0', borderBottom:'1px solid #f8fafc' }}>
                <span style={{ color:'#94a3b8' }}>{k}</span>
                <span style={{ color:'#0f172a', fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background:'linear-gradient(135deg,#eff6ff,#f5f3ff)', borderRadius:14, padding:14, border:'1px solid #bfdbfe' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#1e40af', marginBottom:8 }}>🤖 AI Coaching Tips</div>
            {['Your time-to-hire (14d) is 41% faster than team avg — great pipeline management!','Senior React Developer has been open 12 days — consider widening search to Pokhara candidates.','Data Scientist pipeline has high exam drop-off rate — recommend exam time reduction to 45 min.','3 candidates in your pipeline have not heard back in 7+ days — send follow-up today.'].map((tip,i) => (
              <div key={i} style={{ fontSize:8, color:'#334155', padding:'4px 0', display:'flex', gap:5, borderBottom:i<3?'1px solid rgba(0,0,0,.05)':'none' }}>
                <span style={{ color:'#1e40af', flexShrink:0 }}>💡</span>{tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
