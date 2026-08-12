// FILE: ATSCommandCenterPage.jsx
// World-class AI-Powered ATS — Executive Command Center Dashboard
// Live KPIs · AI Insights · Hiring Funnel · Pipeline · Activity Feed · Alerts

import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext.jsx'

const G   = 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)'
const GA  = 'linear-gradient(135deg,#4338ca 0%,#7c3aed 100%)'
const P   = '#4338ca'
const VK  = ''

const JOBS = [
  { id:'j1', title:'Senior Software Engineer', dept:'Engineering', openings:3, applied:127, shortlisted:18, interviewed:8, offered:2, hired:1, daysOpen:12, priority:'High',   budget:'NPR 80,000-120,000', source:'LinkedIn 45 · Indeed 38 · Portal 44' },
  { id:'j2', title:'Finance Manager',          dept:'Finance',     openings:1, applied:84,  shortlisted:12, interviewed:5, offered:1, hired:0, daysOpen:8,  priority:'High',   budget:'NPR 90,000-130,000', source:'LinkedIn 52 · Indeed 22 · Portal 10' },
  { id:'j3', title:'HR Business Partner',      dept:'HR',          openings:2, applied:63,  shortlisted:9,  interviewed:4, offered:1, hired:1, daysOpen:21, priority:'Medium', budget:'NPR 70,000-100,000', source:'LinkedIn 31 · Indeed 15 · Portal 17' },
  { id:'j4', title:'Product Manager',          dept:'Product',     openings:1, applied:56,  shortlisted:7,  interviewed:3, offered:0, hired:0, daysOpen:5,  priority:'High',   budget:'NPR 100,000-150,000', source:'LinkedIn 40 · Indeed 10 · Portal 6' },
  { id:'j5', title:'DevOps Engineer',          dept:'IT',          openings:2, applied:41,  shortlisted:6,  interviewed:3, offered:1, hired:0, daysOpen:15, priority:'Medium', budget:'NPR 85,000-115,000', source:'LinkedIn 28 · Indeed 8 · Portal 5' },
]

const PIPELINE = [
  { stage:'Applied',       count:371, color:'#64748b', pct:100 },
  { stage:'AI Screened',   count:186, color:'#8b5cf6', pct:50  },
  { stage:'HR Review',     count:92,  color:'#3b82f6', pct:25  },
  { stage:'Written Test',  count:44,  color:'#0891b2', pct:12  },
  { stage:'Video Intv',    count:28,  color:'#f59e0b', pct:8   },
  { stage:'Panel Intv',    count:18,  color:'#7c3aed', pct:5   },
  { stage:'Offer',         count:6,   color:'#10b981', pct:2   },
  { stage:'Hired',         count:2,   color:'#059669', pct:0.5 },
]

const ACTIVITY = [
  { time:'2 min ago',  icon:'🤖', msg:'AI screened 23 new CVs for Senior SW Engineer — 6 shortlisted',         color:'#8b5cf6' },
  { time:'14 min ago', icon:'📧', msg:'Auto-email sent to 18 candidates: Written Test Invitation',              color:'#3b82f6' },
  { time:'28 min ago', icon:'🎥', msg:'AI Video Interview completed: Rajan Shrestha — Score 91/100',           color:'#f59e0b' },
  { time:'45 min ago', icon:'✅', msg:'Offer accepted: Gita Maharjan — Senior SW Engineer — Joining 1 Aug',    color:'#10b981' },
  { time:'1 hr ago',   icon:'📋', msg:'Interview scorecard submitted by CTO Rajesh Sharma for 3 candidates',  color:'#7c3aed' },
  { time:'2 hr ago',   icon:'🌐', msg:'Job posted to LinkedIn, Indeed, Naukri, Facebook: Product Manager',    color:'#ea580c' },
  { time:'3 hr ago',   icon:'🔍', msg:'AI Talent Pool matched 12 passive candidates for DevOps Engineer',     color:'#0891b2' },
  { time:'4 hr ago',   icon:'📄', msg:'147 new applications received across all active jobs today',            color:'#64748b' },
]

const AI_ALERTS = [
  { type:'🔴', msg:'Finance Manager role — 0 hires in 8 days. Top candidate Priya Sharma may accept competitor offer. Act within 24h.' },
  { type:'🟡', msg:'HR Business Partner pipeline slow. Only 4 interviewed vs 63 applied. Recommend scheduling batch interviews.' },
  { type:'🟢', msg:'Senior SW Engineer — Gita Maharjan (96% match) accepted offer. Expected ROI: NPR 2.4M value hire.' },
  { type:'💡', msg:'AI detected 3 passive candidates in Talent Pool matching Product Manager JD. Recommend outreach.' },
]

const SOURCES = [
  { name:'LinkedIn',    pct:42, color:'#0077b5', count:156 },
  { name:'Indeed',      pct:24, color:'#003a9b', count:89  },
  { name:'Career Portal',pct:18,color:'#4338ca', count:67  },
  { name:'Naukri',      pct:8,  color:'#ef4444', count:30  },
  { name:'Referral',    pct:5,  color:'#10b981', count:19  },
  { name:'WhatsApp',    pct:3,  color:'#22c55e', count:11  },
]

const RECRUITERS = [
  { name:'Sunita Rana',    hires:4, pipeline:28, cph:'NPR 12,400', tth:'14d', rating:94 },
  { name:'Bikash KC',      hires:3, pipeline:22, cph:'NPR 15,200', tth:'18d', rating:88 },
  { name:'Anita Tamang',   hires:2, pipeline:19, cph:'NPR 11,800', tth:'12d', rating:91 },
  { name:'Ramesh Sharma',  hires:1, pipeline:14, cph:'NPR 18,000', tth:'22d', rating:76 },
]

function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, padding:'16px 20px', border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,.05)', display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        {trend && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:8, background:trend>0?'#f0fdf4':'#fef2f2', color:trend>0?'#15803d':'#dc2626' }}>{trend>0?'▲':'▼'} {Math.abs(trend)}%</span>}
      </div>
      <div style={{ fontSize:22, fontWeight:900, color:color||'#0f172a' }}>{value}</div>
      <div style={{ fontSize:10, fontWeight:700, color:'#374151' }}>{label}</div>
      {sub && <div style={{ fontSize:9, color:'#94a3b8' }}>{sub}</div>}
    </div>
  )
}

export default function ATSCommandCenterPage() {
  const { navTo } = useApp()
  const [tab, setTab] = useState('overview')
  const [aiSummary, setAiSummary] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x+1), 30000)
    return () => clearInterval(t)
  }, [])

  const totalApplied  = JOBS.reduce((s,j)=>s+j.applied, 0)
  const totalHired    = JOBS.reduce((s,j)=>s+j.hired, 0)
  const totalOffered  = JOBS.reduce((s,j)=>s+j.offered, 0)
  const avgTTH        = 15
  const offerRate     = Math.round(totalOffered/totalApplied*100*10)/10

  const getAISummary = async () => {
    setLoadingAI(true)
    await new Promise(r=>setTimeout(r,1500))
    setAiSummary(`📊 Today's Recruitment Intelligence:\n\n✅ Strong: Senior SW Engineer pipeline is healthy — 6 candidates at panel stage, 1 offer accepted.\n\n⚠️ Action needed: Finance Manager vacancy has 0 hires in 8 days. Top candidate Priya Sharma (88% AI match) is at risk — recommend immediate offer.\n\n🎯 AI Recommendation: Schedule batch video interviews for 14 HR Business Partner candidates to accelerate pipeline.\n\n📈 Trend: LinkedIn converting at 2.3x better than Indeed for technical roles. Recommend increasing LinkedIn ad spend by 40% for DevOps & Product roles.\n\n💰 Cost Efficiency: Current cost-per-hire is NPR 13,800 vs industry benchmark NPR 18,500 — excellent performance.`)
    setLoadingAI(false)
  }

  const G2 = (from,to)=>`linear-gradient(135deg,${from},${to})`

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, fontFamily:'system-ui,sans-serif' }}>

      {/* Command Header */}
      <div style={{ background:G, borderRadius:18, padding:'22px 28px', boxShadow:'0 8px 40px rgba(67,56,202,.3)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(124,58,237,.15)' }}/>
        <div style={{ position:'absolute', bottom:-30, left:200, width:120, height:120, borderRadius:'50%', background:'rgba(99,102,241,.1)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:GA, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:'0 4px 12px rgba(67,56,202,.4)' }}>🧠</div>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:-.3 }}>AI Recruitment Command Center</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', marginTop:1 }}>eLogix HRMS · World-Class ATS · AI-Powered End-to-End Recruitment Automation</div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
              {[
                { label:'+ New Job', id:'ats-job-manager', color:'#4338ca' },
                { label:'👥 Pipeline', id:'ats-candidate-pipeline', color:'#7c3aed' },
                { label:'📊 Analytics', id:'ats-analytics', color:'#0891b2' },
              ].map((b,i)=>(
                <button key={i} onClick={()=>navTo?.(b.id)} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:b.color, color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.2)' }}>{b.label}</button>
              ))}
            </div>
          </div>

          {/* Live KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:10, marginTop:16 }}>
            {[
              { label:'Active Jobs',      val:JOBS.length,              icon:'💼', color:'#c7d2fe' },
              { label:'Total Applied',    val:totalApplied,             icon:'📩', color:'#ddd6fe' },
              { label:'AI Shortlisted',   val:186,                      icon:'🤖', color:'#e9d5ff' },
              { label:'Interviews Today', val:12,                       icon:'🎥', color:'#bfdbfe' },
              { label:'Offers Sent',      val:totalOffered,             icon:'📋', color:'#bbf7d0' },
              { label:'Hired This Month', val:totalHired,               icon:'✅', color:'#99f6e4' },
              { label:'Avg Time-to-Hire', val:`${avgTTH}d`,            icon:'⚡', color:'#fde68a' },
            ].map((k,i)=>(
              <div key={i} style={{ background:'rgba(255,255,255,.08)', borderRadius:11, padding:'10px 12px', backdropFilter:'blur(10px)' }}>
                <div style={{ fontSize:16 }}>{k.icon}</div>
                <div style={{ fontSize:18, fontWeight:900, color:k.color, marginTop:4 }}>{k.val}</div>
                <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Alerts */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
        {AI_ALERTS.map((a,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:12, padding:'12px 16px', border:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{a.type}</span>
            <div style={{ fontSize:10, color:'#374151', lineHeight:1.5 }}>{a.msg}</div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div style={{ display:'flex', gap:4, background:'#f8fafc', borderRadius:12, padding:4, border:'1px solid #e2e8f0' }}>
        {[['overview','🏠 Overview'],['jobs','💼 Jobs'],['pipeline','🔄 Pipeline'],['sources','📡 Sources'],['recruiters','👤 Recruiters'],['activity','⚡ Activity']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px 4px', borderRadius:9, border:'none', background:tab===t?'#fff':'transparent', color:tab===t?P:'#64748b', fontWeight:tab===t?800:400, fontSize:10, cursor:'pointer', boxShadow:tab===t?'0 1px 4px rgba(0,0,0,.08)':'none' }}>{l}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab==='overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* Hiring Funnel */}
            <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
                🔄 AI Hiring Funnel — Live
                <span style={{ fontSize:9, color:'#94a3b8', fontWeight:400 }}>Auto-updates every 30s</span>
              </div>
              {PIPELINE.map((s,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:'#374151', width:100, flexShrink:0 }}>{s.stage}</div>
                  <div style={{ flex:1, height:28, background:'#f8fafc', borderRadius:8, overflow:'hidden', position:'relative' }}>
                    <div style={{ height:'100%', width:`${s.pct}%`, background:s.color, borderRadius:8, minWidth:24, transition:'width 1s', display:'flex', alignItems:'center', paddingLeft:8 }}>
                      <span style={{ fontSize:9, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{s.count}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:s.color, width:34, textAlign:'right' }}>{s.pct}%</div>
                </div>
              ))}
              <div style={{ display:'flex', gap:16, marginTop:12, padding:'10px 14px', background:'#f8fafc', borderRadius:10 }}>
                <div style={{ fontSize:9, color:'#64748b' }}>Conversion: Applied → Hired: <strong style={{ color:'#0f172a' }}>0.54%</strong></div>
                <div style={{ fontSize:9, color:'#64748b' }}>AI Efficiency: <strong style={{ color:'#8b5cf6' }}>50% auto-screened</strong></div>
                <div style={{ fontSize:9, color:'#64748b' }}>Offer Acceptance: <strong style={{ color:'#10b981' }}>67%</strong></div>
              </div>
            </div>

            {/* Active jobs table */}
            <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:14 }}>💼 Active Jobs Pipeline</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Position','Dept','Applied','Shortlisted','Interviewed','Offered','Hired','Priority','Days Open'].map((h,i)=>(
                      <th key={i} style={{ padding:'8px 10px', textAlign:i===0?'left':'center', fontSize:9, fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {JOBS.map(j=>(
                    <tr key={j.id} style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer' }} onClick={()=>navTo?.('ats-job-manager')}>
                      <td style={{ padding:'9px 10px' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{j.title}</div>
                        <div style={{ fontSize:8, color:'#94a3b8', marginTop:2 }}>{j.budget}</div>
                      </td>
                      <td style={{ padding:'9px 10px', textAlign:'center', fontSize:9, color:'#64748b' }}>{j.dept}</td>
                      <td style={{ padding:'9px 10px', textAlign:'center', fontSize:11, fontWeight:700, color:'#374151' }}>{j.applied}</td>
                      <td style={{ padding:'9px 10px', textAlign:'center', fontSize:11, fontWeight:700, color:'#8b5cf6' }}>{j.shortlisted}</td>
                      <td style={{ padding:'9px 10px', textAlign:'center', fontSize:11, fontWeight:700, color:'#3b82f6' }}>{j.interviewed}</td>
                      <td style={{ padding:'9px 10px', textAlign:'center', fontSize:11, fontWeight:700, color:'#10b981' }}>{j.offered}</td>
                      <td style={{ padding:'9px 10px', textAlign:'center' }}>
                        <span style={{ fontSize:10, fontWeight:900, color:j.hired>0?'#059669':'#94a3b8' }}>{j.hired}</span>
                      </td>
                      <td style={{ padding:'9px 10px', textAlign:'center' }}>
                        <span style={{ fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:8, background:j.priority==='High'?'#fef2f2':'#fffbeb', color:j.priority==='High'?'#dc2626':'#92400e' }}>{j.priority}</span>
                      </td>
                      <td style={{ padding:'9px 10px', textAlign:'center', fontSize:10, color:j.daysOpen>20?'#ef4444':'#374151', fontWeight:j.daysOpen>20?700:400 }}>{j.daysOpen}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* AI Copilot */}
            <div style={{ background:'#fff', borderRadius:14, padding:18, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:10 }}>🧠 AI Recruitment Copilot</div>
              {aiSummary ? (
                <div style={{ fontSize:9, color:'#374151', lineHeight:1.7, whiteSpace:'pre-line', background:'#f8fafc', borderRadius:10, padding:12 }}>{aiSummary}</div>
              ) : (
                <div style={{ textAlign:'center', padding:'20px 0' }}>
                  <div style={{ fontSize:30, marginBottom:8 }}>🤖</div>
                  <div style={{ fontSize:10, color:'#64748b', marginBottom:12 }}>Get AI-powered recruitment intelligence for today</div>
                  <button onClick={getAISummary} disabled={loadingAI} style={{ padding:'9px 20px', borderRadius:10, border:'none', background:GA, color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, margin:'0 auto' }}>
                    {loadingAI ? <><span style={{ width:12,height:12,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin 1s linear infinite'}}/>Analyzing...</> : '🧠 Get AI Insights'}
                  </button>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:10 }}>⚡ Quick Actions</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  { icon:'➕', label:'Post New Job',     id:'ats-job-manager',         bg:'#eff6ff', color:'#1e40af' },
                  { icon:'👥', label:'View Pipeline',    id:'ats-candidate-pipeline',  bg:'#f5f3ff', color:'#6d28d9' },
                  { icon:'🤖', label:'AI Resume Scan',  id:'ats-resume-parser',       bg:'#faf5ff', color:'#7c3aed' },
                  { icon:'✍️', label:'Schedule Test',   id:'ats-assessment',          bg:'#f0f9ff', color:'#0369a1' },
                  { icon:'🎥', label:'Video Interview', id:'ats-video-interview',     bg:'#fffbeb', color:'#92400e' },
                  { icon:'📋', label:'Offer Letter',    id:'ats-offer-management',    bg:'#f0fdf4', color:'#15803d' },
                  { icon:'🌐', label:'Talent Pool',     id:'ats-talent-pool',         bg:'#ecfeff', color:'#0e7490' },
                  { icon:'📊', label:'Analytics',       id:'ats-analytics',           bg:'#fef3c7', color:'#92400e' },
                ].map((a,i)=>(
                  <button key={i} onClick={()=>navTo?.(a.id)} style={{ padding:'10px 6px', borderRadius:10, border:'1px solid #e2e8f0', background:a.bg, color:a.color, fontSize:9, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:14 }}>{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#0f172a', marginBottom:10 }}>⚡ Live Activity</div>
              {ACTIVITY.slice(0,5).map((a,i)=>(
                <div key={i} style={{ display:'flex', gap:8, padding:'8px 0', borderBottom:i<4?'1px solid #f8fafc':'' }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:`${a.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{a.icon}</div>
                  <div>
                    <div style={{ fontSize:9, color:'#374151', lineHeight:1.4 }}>{a.msg}</div>
                    <div style={{ fontSize:8, color:'#94a3b8', marginTop:2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SOURCES TAB ── */}
      {tab==='sources' && (
        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:16 }}>📡 Candidate Source Analytics</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            {SOURCES.map((s,i) => (
              <div key={i} style={{ padding:'14px 16px', borderRadius:12, border:'1px solid #e2e8f0', background:'#fafafa' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{s.name}</span>
                  <span style={{ fontSize:11, fontWeight:900, color:s.color }}>{s.pct}%</span>
                </div>
                <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden', marginBottom:6 }}>
                  <div style={{ height:'100%', width:`${s.pct}%`, background:s.color, borderRadius:4 }}/>
                </div>
                <div style={{ fontSize:9, color:'#64748b' }}>{s.count} applications</div>
              </div>
            ))}
          </div>
          <div style={{ padding:'14px 16px', background:'#f8fafc', borderRadius:12, fontSize:10, color:'#374151', lineHeight:1.7 }}>
            <strong>🤖 AI Insight:</strong> LinkedIn is your highest-converting source (42% of applications, 58% of hires). Recommend increasing LinkedIn Recruiter budget by NPR 25,000/month. Indeed performs well for volume but lower quality-to-hire ratio. Career Portal referrals have highest retention rate (87% stay beyond 1 year).
          </div>
        </div>
      )}

      {/* ── RECRUITERS TAB ── */}
      {tab==='recruiters' && (
        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:16 }}>👤 Recruiter Performance Leaderboard</div>
          {RECRUITERS.map((r,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', borderBottom:i<RECRUITERS.length-1?'1px solid #f8fafc':'' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:['#ffd700','#c0c0c0','#cd7f32','#e2e8f0'][i], display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:['#92400e','#374151','#92400e','#64748b'][i], fontSize:14, flexShrink:0 }}>{i+1}</div>
              <div style={{ width:36, height:36, borderRadius:10, background:GA, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:900, flexShrink:0 }}>{r.name.split(' ').map(w=>w[0]).join('')}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#0f172a' }}>{r.name}</div>
                <div style={{ fontSize:8, color:'#94a3b8', marginTop:2 }}>Pipeline: {r.pipeline} candidates · TTH: {r.tth} · CPH: {r.cph}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:900, color:'#059669' }}>{r.hires}</div>
                <div style={{ fontSize:8, color:'#94a3b8' }}>Hires</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:14, fontWeight:900, color:r.rating>=90?'#059669':r.rating>=80?'#f59e0b':'#ef4444' }}>{r.rating}</div>
                <div style={{ fontSize:8, color:'#94a3b8' }}>AI Score</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab==='activity' && (
        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:16 }}>⚡ Live Recruitment Activity Feed</div>
          {ACTIVITY.map((a,i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:i<ACTIVITY.length-1?'1px solid #f8fafc':'' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${a.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{a.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:'#374151', lineHeight:1.5 }}>{a.msg}</div>
                <div style={{ fontSize:9, color:'#94a3b8', marginTop:3 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PIPELINE TAB ── */}
      {tab==='pipeline' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
            {[
              {icon:'📩',label:'Applied',     val:371, color:'#64748b'},
              {icon:'🤖',label:'AI Screened', val:186, color:'#8b5cf6'},
              {icon:'📋',label:'Shortlisted', val:92,  color:'#3b82f6'},
              {icon:'✅',label:'Hired',        val:2,   color:'#059669'},
            ].map((s,i)=>(
              <StatCard key={i} {...s} sub="All active jobs" />
            ))}
          </div>
          <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0', textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:12 }}>🔄 Full Candidate Pipeline</div>
            <button onClick={()=>navTo?.('ats-candidate-pipeline')} style={{ padding:'12px 28px', borderRadius:12, border:'none', background:GA, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Open Kanban Pipeline →</button>
          </div>
        </div>
      )}

      {/* ── JOBS TAB ── */}
      {tab==='jobs' && (
        <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>💼 All Active Positions</div>
            <button onClick={()=>navTo?.('ats-job-manager')} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:GA, color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>+ Post New Job</button>
          </div>
          {JOBS.map(j=>(
            <div key={j.id} style={{ padding:'14px 0', borderBottom:'1px solid #f8fafc' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{j.title}</div>
                  <div style={{ fontSize:9, color:'#64748b', marginTop:2 }}>{j.dept} · {j.openings} opening{j.openings>1?'s':''} · {j.budget}</div>
                  <div style={{ fontSize:8, color:'#94a3b8', marginTop:2 }}>{j.source}</div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:8, fontWeight:700, padding:'3px 9px', borderRadius:10, background:j.priority==='High'?'#fef2f2':'#fffbeb', color:j.priority==='High'?'#dc2626':'#92400e' }}>{j.priority}</span>
                  <span style={{ fontSize:8, color:'#64748b' }}>{j.daysOpen}d open</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {[{l:'Applied',v:j.applied,c:'#64748b'},{l:'Shortlisted',v:j.shortlisted,c:'#8b5cf6'},{l:'Interviewed',v:j.interviewed,c:'#3b82f6'},{l:'Offered',v:j.offered,c:'#10b981'},{l:'Hired',v:j.hired,c:'#059669'}].map((s,i)=>(
                  <div key={i} style={{ textAlign:'center', padding:'5px 10px', background:'#f8fafc', borderRadius:8 }}>
                    <div style={{ fontSize:13, fontWeight:900, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:7, color:'#94a3b8' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
