// FILE: src/components/dashboard/snapshots/AIAttendanceInsightsPage.jsx
// eLogix HRMS — AI Attendance Insights
// COMPLETE REWRITE — Real tenant data. Claude AI analysis.
// API: GET /api/v1/attendance/snapshot  +  /api/v1/ai-proxy/chat
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch { return {} }
}
function _authHeaders() {
  const s = _getSession()
  const token = localStorage.getItem('access_token') || s?.token || ''
  const slug  = s?.company?.slug || ''
  return { 'Authorization':`Bearer ${token}`, 'X-Tenant-Slug':slug, 'Content-Type':'application/json' }
}
const VITE_KEY = import.meta?.env?.VITE_ANTHROPIC_API_KEY || ''
const P = '#7c3aed'
const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS = ['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6']

async function callClaude(prompt, sys) {
  try {
    const r = await fetch('/api/v1/ai-proxy/chat', { method:'POST', headers:_authHeaders(),
      body:JSON.stringify({ system:sys, messages:[{role:'user',content:prompt}], model:'claude-sonnet-4-6', max_tokens:600 }),
      signal:AbortSignal.timeout(12000) })
    if (r.ok) { const d = await r.json(); const t = Array.isArray(d.content)?d.content.find(b=>b.type==='text')?.text:d.content||''; if(t) return t }
  } catch {}
  if (VITE_KEY?.startsWith('sk-ant')) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},
        body:JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:600, system:sys, messages:[{role:'user',content:prompt}] }) })
      const d = await r.json(); if (r.ok && d?.content?.[0]?.text) return d.content[0].text
    } catch {}
  }
  return null
}

const W = ({children,title,subtitle,span=1}) => (
  <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',
    boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>
    {(title||subtitle)&&<div>
      {title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}
      {subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}
    </div>}
    {children}
  </div>
)

function Md({ text }) {
  return (
    <div style={{fontSize:10,lineHeight:1.7,color:'#0f172a'}}>
      {(text||'').split('\n').map((l,i) => {
        const h = l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`)
        if (!l.trim()) return <div key={i} style={{height:4}}/>
        if (l.startsWith('- ')) return <div key={i} style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>
        return <div key={i} dangerouslySetInnerHTML={{__html:h}}/>
      })}
    </div>
  )
}

export default function AIAttendanceInsightsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [aiText,  setAiText]  = useState('')
  const [aiLoad,  setAiLoad]  = useState(false)

  const s       = _getSession()
  const company = s?.company || {}
  const today   = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/attendance/snapshot', { headers:_authHeaders() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')} if(!r.ok)throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => { setData(d.data||d); genAI(d.data||d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function genAI(d) {
    if (!d) return
    setAiLoad(true)
    const kpis = d.kpis || {}
    const sys = `You are an HR Attendance AI analyst for ${company?.name||'this company'}. 
Give 4-5 specific, actionable insights based on the attendance data provided. 
Reference Nepal Labour Act 2074 Section 36 where relevant (OT max 4hrs/day, 24hrs/week).`
    const prompt = `Attendance data for ${company?.name}: 
Present: ${kpis.present||0}, Absent: ${kpis.absent||0}, Late: ${kpis.late||0}, WFH: ${kpis.wfh||0}, Rate: ${kpis.attendance_rate||0}%.
By dept: ${JSON.stringify(d.by_dept||[])}.
OT data: ${JSON.stringify(d.overtime||[])}.
Give specific insights and recommendations.`
    const r = await callClaude(prompt, sys)
    setAiText(r || '- No AI analysis available. Ensure AI proxy is configured and attendance data is present.')
    setAiLoad(false)
  }

  const kpis    = data?.kpis          || {}
  const monthly = data?.monthly_trend || []
  const byDept  = data?.by_dept       || []
  const late    = data?.late_by_day   || []
  const overtime= data?.overtime      || []
  const alerts  = data?.ai_alerts     || []

  if (loading) return <div style={{textAlign:'center',padding:60,color:P,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading attendance data for {company?.name}...</div></div>

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>⏰ AI Attendance Insights</div>
          <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{company?.name} · {today}</div>
        </div>
        <div style={{display:'flex',gap:12}}>
          {[{label:'Present',val:kpis.present??'—',color:'#4ade80'},{label:'Absent',val:kpis.absent??'—',color:'#fbbf24'},{label:'On Leave',val:kpis.on_leave??'—',color:'#94a3b8'}].map((s,i)=>(
            <div key={i} style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.val}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.6)'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e'}}>⚠️ {error}</div>}

      {!data && !loading ? (
        <div style={{textAlign:'center',padding:60,color:'#94a3b8',background:'#fff',borderRadius:14}}>
          <div style={{fontSize:40,marginBottom:12}}>⏰</div>
          <div style={{fontSize:14,fontWeight:700}}>No attendance data yet for {company?.name}</div>
          <div style={{fontSize:12,marginTop:6}}>Data appears once employees clock in</div>
        </div>
      ) : (
        <>
          {/* AI insights box */}
          <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:16,padding:'16px 20px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:16}}>🧠</span>
              <span style={{fontSize:11,fontWeight:800,color:P}}>AI Attendance Analysis</span>
              <span style={{fontSize:8,color:'#94a3b8',marginLeft:'auto'}}>{aiLoad?'Analysing…':'claude-sonnet-4-6'}</span>
            </div>
            {aiLoad ? <div style={{display:'flex',gap:5,padding:'6px'}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}</div> : <Md text={aiText}/>}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {/* Monthly trend */}
            <W title="Attendance Rate Trend" subtitle="Monthly %" span={2}>
              {monthly.length > 0 ? (
                <div style={{height:150}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly} margin={{top:0,right:10,left:-20,bottom:0}}>
                      <defs><linearGradient id="attg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tick={{fontSize:8}} domain={[80,100]}/>
                      <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[`${v}%`,'']}/>
                      <Area type="monotone" dataKey="pct" stroke="#10b981" fill="url(#attg)" strokeWidth={2}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:12}}>No monthly trend data yet</div>}
            </W>

            {/* Today's status */}
            <W title="Today's Status" subtitle="Live breakdown">
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  {label:'On Time',val:kpis.on_time,     pct:kpis.on_time_pct,     color:'#10b981'},
                  {label:'Late',   val:kpis.late,        pct:kpis.late_pct,        color:'#f59e0b'},
                  {label:'WFH',    val:kpis.wfh,         pct:kpis.wfh_pct,         color:'#0ea5e9'},
                  {label:'Absent', val:kpis.absent,      pct:kpis.absent_pct,      color:'#ef4444'},
                ].map((s,i) => (
                  <div key={i}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                      <span style={{fontSize:9,color:'#64748b'}}>{s.label}</span>
                      <span style={{fontSize:9,fontWeight:700,color:s.color}}>{s.val??'—'} ({s.pct??0}%)</span>
                    </div>
                    <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${s.pct||0}%`,background:s.color,borderRadius:3}}/>
                    </div>
                  </div>
                ))}
              </div>
            </W>

            {/* Dept attendance */}
            <W title="Dept-wise Attendance" subtitle="This month %">
              {byDept.length > 0 ? (
                <div style={{height:160}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byDept} layout="vertical" margin={{top:0,right:30,left:30,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis type="number" domain={[80,100]} tick={{fontSize:8}}/><YAxis type="category" dataKey="dept" tick={{fontSize:9}}/>
                      <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[`${v}%`,'']}/>
                      <Bar dataKey="pct" radius={[0,4,4,0]}>{byDept.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No department data yet</div>}
            </W>

            {/* Late by day */}
            <W title="Late Arrivals by Day" subtitle="This week pattern">
              {late.length > 0 ? (
                <div style={{height:160}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={late} margin={{top:0,right:10,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="day" tick={{fontSize:9}}/><YAxis tick={{fontSize:8}}/>
                      <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                      <Bar dataKey="count" name="Late" fill="#f59e0b" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No late arrival data</div>}
            </W>

            {/* OT by dept */}
            <W title="Overtime by Dept" subtitle="Avg hrs/week — Labour Act: 4 hrs/day max">
              {overtime.length > 0 ? (
                <div style={{height:160}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overtime} margin={{top:0,right:10,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="dept" tick={{fontSize:8}} angle={-20} textAnchor="end" height={30}/><YAxis tick={{fontSize:8}}/>
                      <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
                      <Bar dataKey="hrs" name="OT hrs/week" radius={[4,4,0,0]}>{overtime.map((d,i)=><Cell key={i} fill={d.hrs>4?'#ef4444':'#10b981'}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No overtime data yet</div>}
            </W>
          </div>

          {/* AI Alerts */}
          {alerts.length > 0 && (
            <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔔 AI Alerts & Recommendations</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {alerts.map((a,i)=>(
                  <div key={i} style={{display:'flex',gap:10,padding:'10px 12px',background:'#f8fafc',borderRadius:10,border:'1px solid #f1f5f9'}}>
                    <span style={{fontSize:18,flexShrink:0}}>{a.icon||'🔵'}</span>
                    <span style={{fontSize:10,color:'#0f172a',lineHeight:1.5}}>{a.message||a.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
