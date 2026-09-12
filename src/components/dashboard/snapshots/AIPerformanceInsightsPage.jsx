// FILE: src/components/dashboard/snapshots/AIPerformanceInsightsPage.jsx
// eLogix HRMS — AI Performance Insights
// COMPLETE REWRITE — Real tenant API. Claude AI. Zero mock data.
// API: GET /api/v1/performance/snapshot  +  /api/v1/ai-proxy/chat
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { RadarChart,Radar,PolarGrid,PolarAngleAxis,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Cell,LineChart,Line } from 'recharts'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authHeaders(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}
const VITE_KEY=import.meta?.env?.VITE_ANTHROPIC_API_KEY||''
const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS=['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6']

async function callAI(prompt,sys){
  try{const r=await fetch('/api/v1/ai-proxy/chat',{method:'POST',headers:_authHeaders(),body:JSON.stringify({system:sys,messages:[{role:'user',content:prompt}],model:'claude-sonnet-4-6',max_tokens:600}),signal:AbortSignal.timeout(12000)});if(r.ok){const d=await r.json();const t=Array.isArray(d.content)?d.content.find(b=>b.type==='text')?.text:d.content||'';if(t)return t}}catch{}
  if(VITE_KEY?.startsWith('sk-ant')){try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:600,system:sys,messages:[{role:'user',content:prompt}]})});const d=await r.json();if(r.ok&&d?.content?.[0]?.text)return d.content[0].text}catch{}}
  return null
}
function Md({text}){return(<div style={{fontSize:10,lineHeight:1.7,color:'#0f172a'}}>{(text||'').split('\n').map((l,i)=>{const h=l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`);if(!l.trim())return<div key={i} style={{height:4}}/>;if(l.startsWith('- '))return<div key={i} style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>;return<div key={i} dangerouslySetInnerHTML={{__html:h}}/>})}</div>)}
const W=({children,title,subtitle,span=1})=>(<div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>{(title||subtitle)&&<div>{title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}{subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}</div>}{children}</div>)

export default function AIPerformanceInsightsPage(){
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [aiText,  setAiText]  = useState('')
  const [aiLoad,  setAiLoad]  = useState(false)

  const s       = _getSession()
  const company = s?.company || {}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/performance/snapshot',{headers:_authHeaders()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')};if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{setData(d.data||d);genAI(d.data||d)})
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  const genAI=async(d)=>{
    setAiLoad(true)
    const kpis=d?.kpis||{}
    const sys=`You are a Performance Analytics AI for ${company?.name}. Give 4 specific insights on performance data. Be concise.`
    const r=await callAI(`Performance data: Avg score: ${kpis.avg_score}/100, OKR hit rate: ${kpis.okr_hit_rate}%, Top performers: ${kpis.top_performers}, On PIP: ${kpis.on_pip}. Dept scores: ${JSON.stringify(d?.by_dept||[])}. Give strategic insights.`,sys)
    setAiText(r||'AI insights unavailable — ensure performance reviews and OKR data exist for your company.')
    setAiLoad(false)
  }

  const kpis    = data?.kpis         || {}
  const radar   = data?.competency   || []
  const deptPerf= data?.by_dept      || []
  const trend   = data?.trend        || []
  const topPerf = data?.top_performers_list || []
  const insights= data?.ai_insights  || []

  if(loading)return<div style={{textAlign:'center',padding:60,color:P,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading performance data for {company?.name}...</div></div>

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:G,borderRadius:16,padding:'18px 22px'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🎯 AI Performance Insights</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{company?.name} · OKR · KPI · 360° Feedback · Predictive AI</div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e'}}>⚠️ {error}</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[
          {label:'Avg Score',      val:kpis.avg_score?`${kpis.avg_score}/100`:null, icon:'📊',color:'#7c3aed'},
          {label:'OKR Hit Rate',   val:kpis.okr_hit_rate?`${kpis.okr_hit_rate}%`:null,  icon:'🎯',color:'#0ea5e9'},
          {label:'Top Performers', val:kpis.top_performers,                              icon:'🌟',color:'#10b981'},
          {label:'PIP Active',     val:kpis.on_pip,                                      icon:'⚠️',color:'#ef4444'},
        ].map((s,i)=>(
          <div key={i} style={{background:`${s.color}08`,borderRadius:12,padding:'14px',border:`1px solid ${s.color}20`,textAlign:'center'}}>
            <div style={{fontSize:20}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:s.color,marginTop:4}}>{s.val||'—'}</div>
            <div style={{fontSize:9,color:'#64748b'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI insights */}
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:16,padding:'16px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{fontSize:16}}>🧠</span>
          <span style={{fontSize:11,fontWeight:800,color:P}}>AI Performance Analysis</span>
          <span style={{fontSize:8,color:'#94a3b8',marginLeft:'auto'}}>{aiLoad?'Analysing…':'claude-sonnet-4-6'}</span>
        </div>
        {aiLoad?<div style={{display:'flex',gap:5,padding:'6px'}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}</div>:<Md text={aiText}/>}
      </div>

      {!data&&!loading?(
        <div style={{textAlign:'center',padding:60,color:'#94a3b8',background:'#fff',borderRadius:14}}>
          <div style={{fontSize:40,marginBottom:12}}>🎯</div>
          <div style={{fontSize:14,fontWeight:700}}>No performance data yet for {company?.name}</div>
          <div style={{fontSize:12,marginTop:6}}>Set OKRs and complete performance reviews to see insights</div>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          <W title="Competency Radar" subtitle="Score vs Benchmark">
            {radar.length>0?<div style={{height:170}}><ResponsiveContainer><RadarChart data={radar}><PolarGrid stroke="#e2e8f0"/><PolarAngleAxis dataKey="subject" tick={{fontSize:8}}/><Radar name="Score" dataKey="val" stroke={P} fill={P} fillOpacity={0.2} strokeWidth={2}/><Radar name="Benchmark" dataKey="bench" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 2"/><Tooltip contentStyle={{fontSize:10,borderRadius:8}}/></RadarChart></ResponsiveContainer></div>:<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:12}}>No competency data yet</div>}
          </W>
          <W title="Dept Performance Scores" subtitle="Average this quarter">
            {deptPerf.length>0?<div style={{height:170}}><ResponsiveContainer><BarChart data={deptPerf} layout="vertical" margin={{top:0,right:30,left:35,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis type="number" domain={[0,100]} tick={{fontSize:8}}/><YAxis type="category" dataKey="dept" tick={{fontSize:9}}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}}/><Bar dataKey="avg_score" radius={[0,4,4,0]}>{deptPerf.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div>:<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:12}}>No dept scores yet</div>}
          </W>
          <W title="Score Trend" subtitle="Monthly avg">
            {trend.length>0?<div style={{height:170}}><ResponsiveContainer><LineChart data={trend} margin={{top:0,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tick={{fontSize:8}} domain={[0,100]}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}}/><Line type="monotone" dataKey="avg_score" stroke={P} strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></div>:<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:12}}>No trend data yet</div>}
          </W>
          <W title="Top Performers" subtitle="This quarter" span={2}>
            {topPerf.length>0?(
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {topPerf.map((e,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px',background:'#f8fafc',borderRadius:10}}>
                    <div style={{width:34,height:34,borderRadius:10,background:G,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:900,flexShrink:0}}>{(e.name||'?').charAt(0)}</div>
                    <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{e.name}</div><div style={{fontSize:8,color:'#94a3b8'}}>{e.dept}</div></div>
                    <div style={{fontSize:14,fontWeight:900,color:P}}>{e.score}</div>
                    <span style={{fontSize:7,padding:'2px 8px',borderRadius:20,background:`${P}10`,color:P,fontWeight:700}}>{e.badge||'Top'}</span>
                  </div>
                ))}
              </div>
            ):<div style={{textAlign:'center',padding:40,color:'#94a3b8',fontSize:12}}>No top performer data yet</div>}
          </W>
          <W title="AI Insights">
            {insights.length>0?(
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {insights.map((ins,i)=>(
                  <div key={i} style={{display:'flex',gap:8,padding:'8px 10px',background:'#f8fafc',borderRadius:9,fontSize:9,lineHeight:1.5}}>
                    <span style={{flexShrink:0}}>{ins.icon||'🔵'}</span><span style={{color:'#0f172a'}}>{ins.text||ins.message}</span>
                  </div>
                ))}
              </div>
            ):<Md text={aiText}/>}
          </W>
        </div>
      )}
    </div>
  )
}
