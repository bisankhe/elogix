// FILE: src/components/dashboard/snapshots/AIHRAnalyticsPage.jsx
// eLogix HRMS — AI HR Analytics
// COMPLETE REWRITE — Real tenant API data. Claude AI insights.
// API: GET /api/v1/analytics/hr-snapshot  +  /api/v1/ai-proxy/chat
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { BarChart,Bar,AreaChart,Area,PieChart,Pie,Cell,LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer } from 'recharts'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authHeaders(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}
const VITE_KEY=import.meta?.env?.VITE_ANTHROPIC_API_KEY||''
const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const COLORS=['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899']

async function callAI(prompt,sys){
  try{const r=await fetch('/api/v1/ai-proxy/chat',{method:'POST',headers:_authHeaders(),body:JSON.stringify({system:sys,messages:[{role:'user',content:prompt}],model:'claude-sonnet-4-6',max_tokens:600}),signal:AbortSignal.timeout(12000)});if(r.ok){const d=await r.json();const t=Array.isArray(d.content)?d.content.find(b=>b.type==='text')?.text:d.content||'';if(t)return t}}catch{}
  if(VITE_KEY?.startsWith('sk-ant')){try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:600,system:sys,messages:[{role:'user',content:prompt}]})});const d=await r.json();if(r.ok&&d?.content?.[0]?.text)return d.content[0].text}catch{}}
  return null
}

const W=({children,title,subtitle,span=1})=>(
  <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>
    {(title||subtitle)&&<div>{title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}{subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}</div>}
    {children}
  </div>
)
const Stat=({icon,label,val,sub,color='#7c3aed',trendUp,trendVal})=>(
  <div style={{background:`${color}08`,borderRadius:12,padding:'14px',border:`1px solid ${color}20`}}>
    <div style={{fontSize:22}}>{icon}</div>
    <div style={{fontSize:22,fontWeight:900,color,marginTop:4,lineHeight:1}}>{val||'—'}</div>
    <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginTop:2}}>{label}</div>
    {sub&&<div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{sub}</div>}
    {trendVal&&<div style={{fontSize:8,fontWeight:700,color:trendUp?'#10b981':'#ef4444',marginTop:4}}>{trendUp?'▲':'▼'} {trendVal}</div>}
  </div>
)
function Md({text}){return(<div style={{fontSize:10,lineHeight:1.7,color:'#0f172a'}}>{(text||'').split('\n').map((l,i)=>{const h=l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`);if(!l.trim())return<div key={i} style={{height:4}}/>;if(l.startsWith('- '))return<div key={i} style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>;return<div key={i} dangerouslySetInnerHTML={{__html:h}}/>})}</div>)}

export default function AIHRAnalyticsPage(){
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [insight, setInsight] = useState('')
  const [aiLoad,  setAiLoad]  = useState(false)
  const [tab,     setTab]     = useState('overview')

  const s       = _getSession()
  const company = s?.company || {}
  const date    = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/analytics/hr-snapshot',{headers:_authHeaders()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')};if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{setData(d.data||d);getInsight(d.data||d,'overall workforce health')})
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  const getInsight=async(d,topic)=>{
    setAiLoad(true)
    const kpis=d?.kpis||{}
    const sys=`You are an expert HR Analytics AI for eLogix HRMS. Analyse ${company?.name}'s HR data. Be concise — 4-5 bullet points with specific numbers. Nepal Labour Act 2074 context.`
    const r=await callAI(`HR data for ${company?.name}: Total employees: ${kpis.total_employees}, Attrition: ${kpis.attrition_rate}%, Time-to-fill: ${kpis.time_to_fill} days, Payroll: ${kpis.total_payroll}. Topic: ${topic}. Dept breakdown: ${JSON.stringify(d?.by_dept||[])}.`,sys)
    setInsight(r||`Analysis unavailable — ensure attendance and payroll data exists for ${company?.name}`)
    setAiLoad(false)
  }

  const kpis    = data?.kpis      || {}
  const hcTrend = data?.hc_trend  || []
  const deptData= data?.by_dept   || []
  const attrTrend=data?.attrition_trend||[]
  const costData = data?.payroll_by_dept||[]
  const hireData = data?.hire_trend||[]
  const genderPie= data?.gender   || []

  if(loading)return<div style={{textAlign:'center',padding:60,color:P,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading HR analytics for {company?.name}...</div></div>

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>📊 AI HR Analytics</div>
            <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{company?.name} · {date} · claude-sonnet-4-6</div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {['Overview','Cost','Trends'].map(t=>(
              <button key={t} onClick={()=>{setTab(t.toLowerCase());if(data)getInsight(data,t.toLowerCase()+' analytics')}}
                style={{padding:'6px 14px',borderRadius:20,border:'none',background:tab===t.toLowerCase()?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e'}}>⚠️ {error}</div>}

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        <Stat icon="👥" label="Total Employees" val={kpis.total_employees} sub={kpis.yoy_growth?`YoY +${kpis.yoy_growth}%`:''} color="#7c3aed" trendUp={true} trendVal={kpis.vs_last_month}/>
        <Stat icon="📉" label="Attrition Rate"  val={kpis.attrition_rate?`${kpis.attrition_rate}%`:null} sub={kpis.industry_attrition?`Industry: ${kpis.industry_attrition}%`:''} color="#0ea5e9"/>
        <Stat icon="⏱️" label="Time to Fill"    val={kpis.time_to_fill?`${kpis.time_to_fill} days`:null} sub="Target: 21 days" color="#f59e0b"/>
        <Stat icon="💰" label="Cost per Hire"    val={kpis.cost_per_hire?`NPR ${Number(kpis.cost_per_hire).toLocaleString('en-IN')}`:null} color="#10b981"/>
      </div>

      {/* AI Insight */}
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:16,padding:'16px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{fontSize:18}}>🧠</span>
          <span style={{fontSize:11,fontWeight:800,color:P}}>AI Strategic Insight</span>
          <span style={{fontSize:8,color:'#94a3b8',marginLeft:'auto'}}>{aiLoad?'Generating…':'claude-sonnet-4-6'}</span>
        </div>
        {aiLoad?<div style={{display:'flex',gap:5,alignItems:'center',padding:'8px'}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}</div>:<Md text={insight}/>}
        {data&&<div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
          {['Attrition deep dive','Payroll efficiency','Gender diversity','Skill gaps'].map(t=>(
            <button key={t} onClick={()=>getInsight(data,t)} style={{padding:'4px 10px',borderRadius:20,border:`1px solid ${P}22`,background:`${P}08`,color:P,fontSize:8,fontWeight:700,cursor:'pointer'}}>{t}</button>
          ))}
        </div>}
      </div>

      {!data&&!loading?(
        <div style={{textAlign:'center',padding:60,color:'#94a3b8',background:'#fff',borderRadius:14}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <div style={{fontSize:14,fontWeight:700}}>No HR analytics data yet for {company?.name}</div>
          <div style={{fontSize:12,marginTop:6}}>Add employees, run payroll, and record attendance to see analytics</div>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          <W title="Headcount Trend" subtitle="Monthly" span={2}>
            {hcTrend.length>0?<div style={{height:180}}><ResponsiveContainer><AreaChart data={hcTrend} margin={{top:0,right:10,left:-20,bottom:0}}><defs><linearGradient id="hcG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={P} stopOpacity={0.3}/><stop offset="95%" stopColor={P} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}}/><Area type="monotone" dataKey="count" name="Headcount" stroke={P} fill="url(#hcG)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>:<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:12}}>No headcount trend data yet</div>}
          </W>
          <W title="Gender Distribution">
            {genderPie.length>0?<div style={{height:140}}><ResponsiveContainer><PieChart><Pie data={genderPie} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={55} innerRadius={28} paddingAngle={3}>{genderPie.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={(v,n)=>[v+' employees',n]}/></PieChart></ResponsiveContainer></div>:<div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No gender data</div>}
          </W>
          <W title="Dept Headcount" subtitle="Current" span={2}>
            {deptData.length>0?<div style={{height:180}}><ResponsiveContainer><BarChart data={deptData} layout="vertical" margin={{top:0,right:10,left:40,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis type="number" tick={{fontSize:8}}/><YAxis type="category" dataKey="dept" tick={{fontSize:8}} width={60}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}}/><Bar dataKey="count" name="Employees" radius={[0,4,4,0]}>{deptData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div>:<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:12}}>No department data yet</div>}
          </W>
          <W title="Attrition Trend" subtitle="Monthly %">
            {attrTrend.length>0?<div style={{height:150}}><ResponsiveContainer><LineChart data={attrTrend} margin={{top:0,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[v+'%','Attrition']}/><Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{r:3,fill:'#ef4444'}}/></LineChart></ResponsiveContainer></div>:<div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No attrition trend data</div>}
          </W>
          <W title="Monthly Hires" subtitle="Recruitment velocity">
            {hireData.length>0?<div style={{height:150}}><ResponsiveContainer><BarChart data={hireData} margin={{top:0,right:10,left:-20,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}}/><Bar dataKey="hires" name="New Hires" fill="#10b981" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>:<div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No hire data yet</div>}
          </W>
          <W title="Dept Payroll Cost" subtitle="Monthly">
            {costData.length>0?<div style={{height:150}}><ResponsiveContainer><BarChart data={costData} layout="vertical" margin={{top:0,right:10,left:50,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis type="number" tick={{fontSize:8}}/><YAxis type="category" dataKey="dept" tick={{fontSize:8}}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}}/><Bar dataKey="cost" name="Payroll" radius={[0,4,4,0]}>{costData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer></div>:<div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No payroll data yet</div>}
          </W>
        </div>
      )}
    </div>
  )
}
