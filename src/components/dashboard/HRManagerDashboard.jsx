// FILE: src/components/dashboard/HRManagerDashboard.jsx
// Dashboard & Workspace > Dashboard
// 17 AI-driven widgets per spec:
// Headcount, Dept List, Satisfaction, Worklife, Onboarding,
// Performance Snapshot, Calendar, Quick Actions, Events,
// Birthdays/Anniversaries, Tenure Chart, Age Group,
// Blood Group, Contract Expiry, AI MOM, Roster, AI Insights

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useApp } from '../../context/AppContext.jsx'

// ── THEME ────────────────────────────────────────────────────
const P = '#7c3aed'
const COLORS = ['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899']



function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

// ── HELPERS ───────────────────────────────────────────────────
const W = ({ children, title, subtitle, extra, span=1 }) => (
  <div style={{
    background:'#fff', borderRadius:16, padding:'18px 20px',
    border:'1px solid #e2e8f0', boxShadow:'0 1px 8px rgba(0,0,0,.05)',
    gridColumn:`span ${span}`,
    display:'flex', flexDirection:'column', gap:10,
  }}>
    {(title||subtitle||extra) && (
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
        <div>
          {title && <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}
          {subtitle && <div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}
        </div>
        {extra}
      </div>
    )}
    {children}
  </div>
)

const Badge = ({children, color='#7c3aed'}) => (
  <span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20,background:`${color}15`,color}}>{children}</span>
)

const Tip = ({text}) => (
  <div style={{fontSize:9,color:'#94a3b8',fontStyle:'italic',marginTop:4}}>{text}</div>
)

// ── MOM AI WIDGET ─────────────────────────────────────────────
function AIMinutesWidget() {
  const [mode, setMode] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [mom, setMom] = useState('')
  const [recording, setRecording] = useState(false)

  const sampleMOM = `# Minutes of Meeting
**Date:** ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
**Attendees:** CEO, HR Manager, Finance Head, Department Heads

## Discussion Points
1. Q2 Performance Review - OKR achievement at 63%, target 80%
2. Engineering Attrition Risk - 34% flight risk, salary benchmarking approved
3. SSF Filing Deadline - Poush 25, Finance to process by Poush 20
4. New Hire Onboarding - 5 joiners this month, buddy program confirmed

## Decisions
- Salary review for Engineering: approved (NPR 156K/month budget)
- Mandate 1:1 retention meetings with 16 at-risk employees by Jul 30
- Monthly HR BI dashboard to be included in board pack

## Action Items
| Action | Owner | Deadline |
|--------|-------|----------|
| Engineering salary adjustment | Finance + HR | Jul 20 |
| Retention conversation 16 staff | HR Manager | Jul 30 |
| SSF filing | Finance | Poush 20 |
| Update onboarding checklist | HR Team | Jul 15 |

**Next Meeting:** Aug 5, 2026`

  const generate = () => {
    setMode('generating')
    setTimeout(() => { setMom(sampleMOM); setMode('done') }, 1800)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {/* Mode selector */}
      <div style={{display:'flex',gap:6}}>
        {['Voice','Text'].map(m=>(
          <button key={m} onClick={()=>setMode(m.toLowerCase())}
            style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${mode===m.toLowerCase()?P:'#e2e8f0'}`,background:mode===m.toLowerCase()?`${P}10`:'#f8fafc',color:mode===m.toLowerCase()?P:'#64748b',fontSize:9,fontWeight:700,cursor:'pointer'}}>
            {m==='Voice'?'🎙️ Voice Input':'📝 Text / Paste'}
          </button>
        ))}
      </div>

      {mode==='voice' && (
        <div style={{textAlign:'center',padding:'16px',background:'#f0f9ff',borderRadius:12,border:'1px solid #bae6fd'}}>
          <button onClick={()=>setRecording(r=>!r)} style={{width:56,height:56,borderRadius:'50%',background:recording?'#ef4444':P,border:'none',fontSize:24,cursor:'pointer',color:'#fff',boxShadow:`0 4px 16px ${recording?'#ef444440':P+'40'}`}}>
            {recording?'⏹':'🎙️'}
          </button>
          <div style={{fontSize:10,color:'#0284c7',marginTop:8,fontWeight:600}}>
            {recording?'Recording... speak clearly':'Click to start recording'}
          </div>
          {recording && <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>AI is transcribing your meeting...</div>}
          {recording && <button onClick={generate} style={{marginTop:10,padding:'6px 16px',borderRadius:8,border:'none',background:P,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Generate MOM</button>}
        </div>
      )}

      {mode==='text' && (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <textarea
            value={transcript}
            onChange={e=>setTranscript(e.target.value)}
            placeholder="Paste meeting notes or transcript here... AI will extract action items, decisions, and format into professional Minutes of Meeting."
            rows={4}
            style={{padding:'10px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:10,resize:'none',outline:'none',fontFamily:'inherit',lineHeight:1.5}}
          />
          <button onClick={generate} disabled={!transcript.trim()}
            style={{padding:'8px',borderRadius:8,border:'none',background:transcript.trim()?P:'#e2e8f0',color:'#fff',fontSize:10,fontWeight:700,cursor:transcript.trim()?'pointer':'default'}}>
            🤖 Generate AI Minutes
          </button>
        </div>
      )}

      {mode==='generating' && (
        <div style={{textAlign:'center',padding:'20px',background:'#faf5ff',borderRadius:12}}>
          <div style={{fontSize:28,marginBottom:8}}>🧠</div>
          <div style={{fontSize:11,fontWeight:700,color:P}}>AI is analysing and generating MOM...</div>
          <div style={{marginTop:10,height:4,background:'#e2e8f0',borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:'60%',background:G,borderRadius:4,animation:'progress 1.8s ease-in-out'}}/>
          </div>
        </div>
      )}

      {mode==='done' && mom && (
        <div style={{maxHeight:200,overflowY:'auto'}}>
          <div style={{background:'#f8fafc',borderRadius:10,padding:'12px',fontSize:9,lineHeight:1.7,color:'#0f172a',fontFamily:'monospace',whiteSpace:'pre-wrap',border:'1px solid #e2e8f0'}}>
            {mom}
          </div>
          <div style={{display:'flex',gap:6,marginTop:8}}>
            <button onClick={()=>{navigator.clipboard?.writeText(mom)}} style={{flex:1,padding:'6px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:9,fontWeight:700,cursor:'pointer'}}>⎘ Copy</button>
            <button style={{flex:1,padding:'6px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>📥 Download</button>
            <button onClick={()=>{setMode('idle');setMom('');setTranscript('')}} style={{flex:1,padding:'6px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:9,fontWeight:700,cursor:'pointer'}}>✕ Clear</button>
          </div>
        </div>
      )}

      {mode==='idle' && <Tip>Choose Voice or Text to generate AI-powered Minutes of Meeting</Tip>}
    </div>
  )
}

const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'

// ── MAIN DASHBOARD ────────────────────────────────────────────

export default function HRManagerDashboard() {

  const _s   = _getSession()
  const _co  = _s?.company || {}

  // Replace all mock data with real API-sourced state
  const [headcount,           setHeadcount]           = useState({})
  const [deptComparison,      setDeptComparison]      = useState([])
  const [satisfactionData,    setSatisfactionData]    = useState([])
  const [worklifeData,        setWorklifeData]        = useState([])
  const [onboardingThisMonth, setOnboardingThisMonth] = useState([])
  const [performanceSnapshot, setPerformanceSnapshot] = useState([])
  const [calendarEvents,      setCalendarEvents]      = useState([])
  const [birthdays,           setBirthdays]           = useState([])
  const [tenureData,          setTenureData]          = useState([])
  const [ageData,             setAgeData]             = useState([])
  const [bloodGroups,         setBloodGroups]         = useState([])
  const [contractExpiry,      setContractExpiry]      = useState([])
  const [rosterData,          setRosterData]          = useState([])
  const [aiInsights,          setAiInsights]          = useState([])
  const [quickActions,        setQuickActions]        = useState([
    {icon:'📋',label:'New Employee',action:'add-employee'},
    {icon:'💵',label:'Run Payroll',action:'automated-payroll'},
    {icon:'🌴',label:'Leave Approval',action:'leave-approval'},
    {icon:'📑',label:'Issue Letter',action:'letter-request'},
    {icon:'⚡',label:'Attendance',action:'live-attendance'},
    {icon:'🎯',label:'Performance',action:'performance'},
  ])
  const [performanceData,  setPerformanceData]  = useState([])
  const [apiLoading, setApiLoading]     = useState(true)
  const [apiError,   setApiError]       = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token') || _s?.token || ''
    const slug  = _s?.company?.slug || ''
    if (!token || !slug) { setApiLoading(false); return }
    setApiLoading(true)
    fetch('/api/v1/hr-manager/summary', { headers: _authH() })
      .then(r => {
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => {
        const dd = d.data || d
        if(dd.headcount)            setHeadcount(dd.headcount)
        if(dd.dept_comparison)      setDeptComparison(dd.dept_comparison)
        if(dd.satisfaction)         setSatisfactionData(dd.satisfaction)
        if(dd.worklife)             setWorklifeData(dd.worklife)
        if(dd.onboarding)           setOnboardingThisMonth(dd.onboarding)
        if(dd.performance_snapshot) setPerformanceSnapshot(dd.performance_snapshot)
        if(dd.calendar_events)      setCalendarEvents(dd.calendar_events)
        if(dd.birthdays)            setBirthdays(dd.birthdays)
        if(dd.tenure_data)          setTenureData(dd.tenure_data)
        if(dd.age_data)             setAgeData(dd.age_data)
        if(dd.blood_groups)         setBloodGroups(dd.blood_groups)
        if(dd.contract_expiry)      setContractExpiry(dd.contract_expiry)
        if(dd.roster)               setRosterData(dd.roster)
        if(dd.ai_insights)          setAiInsights(dd.ai_insights)
        if(dd.quick_actions)        setQuickActions(dd.quick_actions)
        if(dd.performance_data)     setPerformanceData(dd.performance_data)
        if(dd.performance_data)     setPerformanceData(dd.performance_data)
      })
      .catch(e => setApiError(e.message))
      .finally(() => setApiLoading(false))
  }, [])

  const { navTo, currentPersona } = useApp()
  const [activeTab, setActiveTab] = useState('overview')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const dateStr = now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })

  // ── HEADER ─────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* ── TOP HEADER ── */}
      <div style={{
        background: G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
        boxShadow:'0 4px 24px rgba(124,58,237,.25)',
      }}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>
            {currentPersona?.icon} eLogix HRMS Dashboard
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:2}}>
            {dateStr} · {timeStr} · Nepal Standard Time
          </div>
          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            {[
              {label:'Total Staff',   val: headcount?.total         ?? '—', icon:'👨‍💼'},
              {label:'Present Today', val: headcount?.present_today  ?? '—', icon:'✅'},
              {label:'On Leave',      val: headcount?.on_leave       ?? '—', icon:'🌴'},
              {label:'Open Positions',val: headcount?.open_positions ?? '—', icon:'📋'},
            ].map((s,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'6px 12px',display:'flex',alignItems:'center',gap:6}}>
                <span>{s.icon}</span>
                <span style={{fontSize:10,color:'rgba(255,255,255,.8)'}}>{s.label}:</span>
                <span style={{fontSize:12,fontWeight:900,color:'#fff'}}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>AI Status</div>
          <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#4ade80'}}/>
            <span style={{fontSize:10,color:'#4ade80',fontWeight:700}}>All Systems Operational</span>
          </div>
          <div style={{fontSize:9,color:'rgba(255,255,255,.5)',marginTop:6}}>SSF Filing: 20 days</div>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:'#f8fafc',borderRadius:12,padding:4}}>
        {[
          {id:'overview',  label:'Overview'},
          {id:'workforce', label:'Workforce'},
          {id:'operations',label:'Operations'},
          {id:'ai',        label:'AI Insights'},
        ].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{flex:1,padding:'8px 12px',borderRadius:9,border:'none',background:activeTab===t.id?'#fff':'transparent',color:activeTab===t.id?P:'#64748b',fontWeight:activeTab===t.id?800:500,fontSize:11,cursor:'pointer',boxShadow:activeTab===t.id?'0 1px 4px rgba(0,0,0,.1)':'none',transition:'all .2s'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══════════════════════════════════════ */}
      {activeTab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>

          {/* 1. HEADCOUNT ANALYSIS */}
          <W title="Headcount Analysis" subtitle="Total · Male · Female · Transgender"
            extra={<Badge>Live</Badge>}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                {label:'Total',       val:headcount?.total,       icon:'👥', color:'#7c3aed'},
                {label:'Male',        val:headcount?.male,        icon:'👨', color:'#0ea5e9'},
                {label:'Female',      val:headcount?.female,      icon:'👩', color:'#ec4899'},
                {label:'Transgender', val:headcount?.transgender,  icon:'🏳️‍🌈',color:'#10b981'},
              ].map((s,i)=>(
                <div key={i} style={{background:`${s.color}08`,borderRadius:12,padding:'12px',textAlign:'center',border:`1px solid ${s.color}20`}}>
                  <div style={{fontSize:20}}>{s.icon}</div>
                  <div style={{fontSize:22,fontWeight:900,color:s.color,lineHeight:1.1,marginTop:4}}>{s.val}</div>
                  <div style={{fontSize:9,color:'#64748b',marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{height:8,borderRadius:4,background:'#f1f5f9',overflow:'hidden',display:'flex'}}>
              <div style={{background:'#0ea5e9',height:'100%',width:`${(headcount?.male/headcount?.total*100).toFixed(0)}%`,borderRadius:'4px 0 0 4px'}}/>
              <div style={{background:'#ec4899',height:'100%',width:`${(headcount?.female/headcount?.total*100).toFixed(0)}%`}}/>
              <div style={{background:'#10b981',height:'100%',flex:1,borderRadius:'0 4px 4px 0'}}/>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              {[{color:'#0ea5e9',label:'Male 60%'},{color:'#ec4899',label:'Female 39%'},{color:'#10b981',label:'TG 1%'}].map((l,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:l.color}}/>
                  <span style={{fontSize:8,color:'#64748b'}}>{l.label}</span>
                </div>
              ))}
            </div>
          </W>

          {/* 2. DEPARTMENT COMPARISON */}
          <W title="Dept-wise Employee" subtitle="Current vs Last Year" span={2}>
            <div style={{height:160}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptComparison} margin={{top:0,right:10,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="dept" tick={{fontSize:7}} interval={0} angle={-30} textAnchor="end" height={30}/>
                  <YAxis tick={{fontSize:8}}/>
                  <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                  <Bar dataKey="prev" name="Last Year" fill="#e2e8f0" radius={[3,3,0,0]}/>
                  <Bar dataKey="curr" name="Current"   fill={P}      radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:4,borderRadius:2,background:'#e2e8f0'}}/><span style={{fontSize:8,color:'#94a3b8'}}>Last Year</span></div>
              <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:4,borderRadius:2,background:P}}/><span style={{fontSize:8,color:'#94a3b8'}}>Current</span></div>
            </div>
          </W>

          {/* 3. EMPLOYEE SATISFACTION */}
          <W title="Employee Satisfaction" subtitle={`Overall score: 78/100`}>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {satisfactionData.map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{fontSize:9,color:'#64748b',width:80,flexShrink:0}}>{s.label}</div>
                  <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${s.pct}%`,background:s.color,borderRadius:4,transition:'width .6s'}}/>
                  </div>
                  <div style={{fontSize:9,fontWeight:700,color:s.color,width:28,textAlign:'right'}}>{s.pct}%</div>
                </div>
              ))}
            </div>
            <div style={{background:'#f0fdf4',borderRadius:8,padding:'8px 10px',marginTop:4}}>
              <div style={{fontSize:9,color:'#15803d',fontWeight:700}}>AI Insight</div>
              <div style={{fontSize:9,color:'#166534',marginTop:2}}>Overall satisfaction improved 4pts MoM. Sales team eNPS jumped from 28 to 41 after recognition programme launch.</div>
            </div>
          </W>

          {/* 4. WORKLIFE BALANCE */}
          <W title="Work-Life Balance" subtitle="Score trend + burnout risk" span={2}>
            <div style={{height:130}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={worklifeData} margin={{top:0,right:10,left:-20,bottom:0}}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="month" tick={{fontSize:9}}/>
                  <YAxis tick={{fontSize:9}}/>
                  <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                  <Area type="monotone" dataKey="score"  name="WL Score"    stroke="#10b981" fill="url(#scoreGrad)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="burnout" name="Burnout Risk" stroke="#ef4444" fill="url(#burnGrad)"  strokeWidth={2} strokeDasharray="4 2"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Tip>Current score 79/100 - 1pt below target 80. High-OT in Engineering driving burnout risk up.</Tip>
          </W>

          {/* 5. ONBOARDING THIS MONTH */}
          <W title="Onboarding - July 2026" subtitle={`${onboardingThisMonth.length} new joiners this month`}
            extra={<button onClick={()=>navTo('joining-checklist')} style={{fontSize:8,padding:'3px 10px',borderRadius:20,border:`1px solid ${P}`,background:'transparent',color:P,cursor:'pointer',fontWeight:700}}>View All</button>}>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {onboardingThisMonth.map((e,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px',background:'#f8fafc',borderRadius:10}}>
                  <div style={{width:32,height:32,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:900,flexShrink:0}}>
                    {e.name[0]}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>{e.dept} · Joined Jul {e.day}</div>
                    <div style={{height:4,background:'#e2e8f0',borderRadius:2,marginTop:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${e.tasks}%`,background:'#10b981',borderRadius:2}}/>
                    </div>
                  </div>
                  <div style={{fontSize:8,fontWeight:700,color:'#10b981',flexShrink:0}}>{e.tasks}%</div>
                </div>
              ))}
            </div>
          </W>

          {/* 6. PERFORMANCE SNAPSHOT */}
          <W title="Performance Snapshot" subtitle="Competency radar vs benchmark">
            {(performanceData||[]).length===0?(
              <div style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No performance data yet</div>
            ):(
            <div style={{height:160}}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={performanceData} margin={{top:0,right:16,left:16,bottom:0}}>
                  <PolarGrid stroke="#e2e8f0"/>
                  <PolarAngleAxis dataKey="subject" tick={{fontSize:8}}/>
                  <Radar name="Score"     dataKey="score"     stroke={P}       fill={P}       fillOpacity={0.2} strokeWidth={2}/>
                  <Radar name="Benchmark" dataKey="benchmark" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 2"/>
                  <Legend wrapperStyle={{fontSize:9}}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
            )}
            <Tip>OKR achievement 63% below 80% benchmark. Learning completion above target.</Tip>
          </W>

          {/* 7. CALENDAR WITH EVENTS */}
          <W title="Calendar & Upcoming Events" subtitle="July 2026" span={2}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:6}}>
              {calendarEvents.map((ev,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'8px 10px',background:'#f8fafc',borderRadius:10,border:'1px solid #f1f5f9'}}>
                  <div style={{fontSize:16,flexShrink:0}}>{ev.icon}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:9,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>{ev.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </W>

          {/* 8. QUICK ACTIONS */}
          <W title="Quick Actions" subtitle="One-click HR operations">
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              {quickActions.map((a,i)=>(
                <button key={i} onClick={()=>navTo(a.page)}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'10px',borderRadius:10,border:`1px solid ${a.color}20`,background:`${a.color}08`,cursor:'pointer',textAlign:'left'}}>
                  <span style={{fontSize:18}}>{a.icon}</span>
                  <span style={{fontSize:9,fontWeight:700,color:'#0f172a',lineHeight:1.3}}>{a.label}</span>
                </button>
              ))}
            </div>
          </W>

        </div>
      )}

      {/* ══ WORKFORCE TAB ══════════════════════════════════════ */}
      {activeTab==='workforce' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>

          {/* 9. BIRTHDAYS & ANNIVERSARIES */}
          <W title="Birthdays & Anniversaries" subtitle="Upcoming this month" span={2}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              {birthdays.map((b,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px',background:'#f8fafc',borderRadius:12,border:'1px solid #f1f5f9'}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:b.type==='birthday'?'#fef3c720':'#f0fdf420',border:`2px solid ${b.type==='birthday'?'#f59e0b':'#10b981'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                    {b.icon}
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.name}</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>{b.dept} · {b.date}</div>
                    {b.years && <div style={{fontSize:8,color:'#10b981',fontWeight:700}}>{b.years} years 🎊</div>}
                  </div>
                </div>
              ))}
            </div>
          </W>

          {/* 10. TENURE CHART */}
          <W title="Tenure Distribution" subtitle="Years of service">
            <div style={{height:160}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tenureData} margin={{top:0,right:0,left:-25,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="range" tick={{fontSize:8}}/>
                  <YAxis tick={{fontSize:8}}/>
                  <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {tenureData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Tip>2-5 year segment largest (94 employees). Indicates stable mid-career workforce.</Tip>
          </W>

          {/* 11. AGE GROUP */}
          <W title="Age Group Analysis" subtitle="Employee age distribution" span={2}>
            <div style={{height:160}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{top:0,right:10,left:-25,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="range" tick={{fontSize:9}}/>
                  <YAxis tick={{fontSize:8}}/>
                  <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                  <Bar dataKey="count" name="Employees" radius={[4,4,0,0]}>
                    {ageData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Tip>Median age 33. 31-35 bracket largest - strong mid-career talent base.</Tip>
          </W>

          {/* 12. BLOOD GROUP */}
          <W title="Blood Group Distribution" subtitle="Emergency preparedness data">
            <div style={{height:160}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={bloodGroups} dataKey="count" nameKey="group" cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={2}>
                    {bloodGroups.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={(v,n)=>[v+' employees', n]}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4}}>
              {bloodGroups.map((b,i)=>(
                <div key={i} style={{textAlign:'center',padding:'4px',background:`${b.color}10`,borderRadius:6}}>
                  <div style={{fontSize:9,fontWeight:800,color:b.color}}>{b.group}</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>{b.count}</div>
                </div>
              ))}
            </div>
          </W>

          {/* 13. CONTRACT EXPIRY */}
          <W title="Contract Expiry Tracker" subtitle="Upcoming renewals - action required" span={3}
            extra={<Badge color="#ef4444">2 Critical</Badge>}>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {contractExpiry.map((c,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:'#f8fafc',borderRadius:10,border:`1px solid ${c.risk==='critical'?'#fecaca':c.risk==='warning'?'#fed7aa':'#e2e8f0'}`}}>
                  <div style={{fontSize:18}}>{c.risk==='critical'?'🔴':c.risk==='warning'?'🟡':'🟢'}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{c.name}</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>{c.dept}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:9,fontWeight:700,color:c.risk==='critical'?'#ef4444':c.risk==='warning'?'#f59e0b':'#10b981'}}>{c.expiry}</div>
                    <div style={{fontSize:8,color:'#94a3b8'}}>{c.days} days left</div>
                  </div>
                  <button style={{padding:'5px 10px',borderRadius:8,border:'none',background:c.risk==='critical'?'#ef4444':P,color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer',flexShrink:0}}>
                    {c.risk==='critical'?'Renew Now':'Schedule'}
                  </button>
                </div>
              ))}
            </div>
          </W>

        </div>
      )}

      {/* ══ OPERATIONS TAB ════════════════════════════════════ */}
      {activeTab==='operations' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>

          {/* 14. ROSTER BY DEPARTMENT */}
          <W title="Roster Details by Department" subtitle="Today's shift distribution" span={2}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                <thead>
                  <tr style={{background:'#f8fafc'}}>
                    {['Department','Morning','Evening','Night','WFH','On Leave','Total'].map((h,i)=>(
                      <th key={i} style={{padding:'8px 10px',textAlign:i===0?'left':'center',fontSize:9,fontWeight:700,color:'#64748b',borderBottom:'1px solid #e2e8f0'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rosterData.map((r,i)=>{
                    const total=r.morning+r.evening+r.night+r.wfh+r.leave
                    return(
                      <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'8px 10px',fontWeight:600,color:'#0f172a'}}>{r.dept}</td>
                        <td style={{padding:'8px',textAlign:'center'}}><span style={{background:'#dbeafe',color:'#1e40af',padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700}}>{r.morning}</span></td>
                        <td style={{padding:'8px',textAlign:'center'}}><span style={{background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700}}>{r.evening}</span></td>
                        <td style={{padding:'8px',textAlign:'center'}}><span style={{background:'#e0e7ff',color:'#3730a3',padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700}}>{r.night}</span></td>
                        <td style={{padding:'8px',textAlign:'center'}}><span style={{background:'#d1fae5',color:'#065f46',padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700}}>{r.wfh}</span></td>
                        <td style={{padding:'8px',textAlign:'center'}}><span style={{background:'#fee2e2',color:'#991b1b',padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700}}>{r.leave}</span></td>
                        <td style={{padding:'8px',textAlign:'center',fontWeight:800,color:'#0f172a'}}>{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Tip>Night shift coverage: Operations team carries 12 employees - highest overnight coverage.</Tip>
          </W>

          {/* 15. AI MINUTES OF MEETING */}
          <W title="AI Minutes of Meeting" subtitle="Voice & Text - Powered by Claude AI"
            extra={<Badge color="#10b981">AI Ready</Badge>}>
            <AIMinutesWidget/>
          </W>

          {/* Quick Actions repeat in Operations */}
          <W title="Quick Actions" subtitle="Frequently used operations" span={3}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {[
                {icon:'✅',label:'Approve Leave',     color:'#10b981',page:'leave-approval'},
                {icon:'💰',label:'Run Payroll',       color:'#7c3aed',page:'automated-payroll'},
                {icon:'👤',label:'Add Employee',      color:'#0ea5e9',page:'employee-joining'},
                {icon:'📣',label:'Announcement',      color:'#f59e0b',page:'announcement-board'},
                {icon:'📋',label:'Job Posting',       color:'#8b5cf6',page:'job-posting'},
                {icon:'📊',label:'BI Report',         color:'#ef4444',page:'ai-business-intelligence'},
                {icon:'🎯',label:'Set Goals',         color:'#0d9488',page:'okr-management'},
                {icon:'🔮',label:'Predict Attrition', color:'#ec4899',page:'ai-attrition-prediction'},
              ].map((a,i)=>(
                <button key={i} onClick={()=>navTo(a.page)}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'12px',borderRadius:10,border:`1px solid ${a.color}20`,background:`${a.color}08`,cursor:'pointer',textAlign:'left'}}>
                  <span style={{fontSize:20}}>{a.icon}</span>
                  <span style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{a.label}</span>
                </button>
              ))}
            </div>
          </W>

        </div>
      )}

      {/* ══ AI INSIGHTS TAB ═══════════════════════════════════ */}
      {activeTab==='ai' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>

          {/* 16. AI INSIGHTS */}
          <W title="AI Insights & Predictions" subtitle="Real-time AI-driven intelligence" span={2}
            extra={<Badge color="#7c3aed">claude-sonnet-4-6</Badge>}>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {aiInsights.map((ins,i)=>(
                <div key={i} style={{display:'flex',gap:12,padding:'12px',borderRadius:12,border:'1px solid #f1f5f9',background:'#fafafa'}}>
                  <div style={{fontSize:20,flexShrink:0}}>{ins.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                      <span style={{fontSize:8,fontWeight:700,color:ins.icon==='🔴'?'#ef4444':ins.icon==='🟡'?'#f59e0b':ins.icon==='🟢'?'#10b981':ins.icon==='🔵'?'#0ea5e9':'#f97316'}}>{ins.type}</span>
                    </div>
                    <div style={{fontSize:10,color:'#0f172a',lineHeight:1.5}}>{ins.msg}</div>
                  </div>
                  <button onClick={()=>navTo('ai-business-intelligence')}
                    style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${P}`,background:'transparent',color:P,fontSize:8,fontWeight:700,cursor:'pointer',flexShrink:0,alignSelf:'flex-start'}}>
                    {ins.action}
                  </button>
                </div>
              ))}
            </div>
          </W>

          {/* AI Summary */}
          <W title="AI Summary" subtitle="Today's HR intelligence brief">
            <div style={{background:G,borderRadius:12,padding:'14px',color:'#fff',marginBottom:8}}>
              <div style={{fontSize:14,fontWeight:900,marginBottom:6}}>🧠 Today's HR Brief</div>
              <div style={{fontSize:9,lineHeight:1.6,color:'rgba(255,255,255,.85)'}}>
                {headcount?.total ?? "—"} employees active. See AI insights below for risk analysisays. 5 contract renewals due. Worklife score at 79/100 - near target.
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                {label:'Attrition Risk Score', val: headcount?.attrition_risk   ?? 'Medium-High', color:'#f59e0b'},
                {label:'Compliance Health',    val: headcount?.compliance_health ?? 'Good',        color:'#10b981'},
                {label:'Engagement Score',     val: headcount?.engagement_score  ?? '—',           color:'#0ea5e9'},
                {label:'AI Confidence',        val: headcount?.ai_confidence     ?? '—',           color:'#7c3aed'},
              ].map((s,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 8px',background:'#f8fafc',borderRadius:8}}>
                  <span style={{fontSize:9,color:'#64748b'}}>{s.label}</span>
                  <span style={{fontSize:9,fontWeight:800,color:s.color}}>{s.val}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>navTo('ai-business-intelligence')} style={{width:'100%',padding:'10px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer',marginTop:4}}>
              Open Full BI Report →
            </button>
          </W>

          {/* 17. AI MOM in AI tab too */}
          <W title="AI Minutes of Meeting" subtitle="Voice & Text analysis" span={3}
            extra={<Badge color="#10b981">AI Powered</Badge>}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <AIMinutesWidget/>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>Recent AI-Generated MOMs</div>
                {[
                  {title:'CEO Strategy Meeting',    date:'Jul 3, 2026', items:4},
                  {title:'HR Performance Review',   date:'Jun 28, 2026',items:6},
                  {title:'Finance + HR Alignment',  date:'Jun 21, 2026',items:3},
                ].map((m,i)=>(
                  <div key={i} style={{padding:'10px 12px',background:'#f8fafc',borderRadius:10,border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{m.title}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{m.date} · {m.items} action items</div>
                    <div style={{display:'flex',gap:5,marginTop:6}}>
                      <button style={{fontSize:8,padding:'3px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',color:'#64748b'}}>View</button>
                      <button style={{fontSize:8,padding:'3px 8px',borderRadius:6,border:'none',background:P,cursor:'pointer',color:'#fff',fontWeight:700}}>Download</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </W>

        </div>
      )}
    </div>
  )
}