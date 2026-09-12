// FILE: src/components/dashboard/snapshots/AIAttritionPredictionPage.jsx
// eLogix HRMS — AI Attrition Prediction
// COMPLETE REWRITE — Real tenant API. Claude AI. Zero mock data.
// API: GET /api/v1/attrition/prediction  +  /api/v1/ai-proxy/chat
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { BarChart,Bar,Cell,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,RadialBarChart,RadialBar } from 'recharts'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authHeaders(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}
const VITE_KEY=import.meta?.env?.VITE_ANTHROPIC_API_KEY||''
const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'

async function callAI(prompt,sys){
  try{const r=await fetch('/api/v1/ai-proxy/chat',{method:'POST',headers:_authHeaders(),body:JSON.stringify({system:sys,messages:[{role:'user',content:prompt}],model:'claude-sonnet-4-6',max_tokens:700}),signal:AbortSignal.timeout(14000)});if(r.ok){const d=await r.json();const t=Array.isArray(d.content)?d.content.find(b=>b.type==='text')?.text:d.content||'';if(t)return t}}catch{}
  if(VITE_KEY?.startsWith('sk-ant')){try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:700,system:sys,messages:[{role:'user',content:prompt}]})});const d=await r.json();if(r.ok&&d?.content?.[0]?.text)return d.content[0].text}catch{}}
  return null
}
function Md({text}){return(<div style={{fontSize:10,lineHeight:1.7,color:'#0f172a'}}>{(text||'').split('\n').map((l,i)=>{const h=l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`);if(!l.trim())return<div key={i} style={{height:4}}/>;if(l.startsWith('- '))return<div key={i} style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>;return<div key={i} dangerouslySetInnerHTML={{__html:h}}/>})}</div>)}
const W=({children,title,subtitle,span=1})=>(<div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>{(title||subtitle)&&<div>{title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}{subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}</div>}{children}</div>)

export default function AIAttritionPredictionPage(){
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [insight,   setInsight]   = useState('')
  const [insLoad,   setInsLoad]   = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [retPlan,   setRetPlan]   = useState('')
  const [retLoad,   setRetLoad]   = useState(false)

  const s       = _getSession()
  const company = s?.company || {}
  const date    = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);return}
    fetch('/api/v1/attrition/prediction',{headers:_authHeaders()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')};if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{setData(d.data||d);getStrategyInsight(d.data||d)})
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  const getStrategyInsight=async(d)=>{
    setInsLoad(true)
    const kpis=d?.kpis||{}
    const sys=`You are an HR retention strategist AI for ${company?.name}. Give 4-5 specific retention interventions with ROI. Nepal Labour Act 2074 context.`
    const r=await callAI(`${company?.name} attrition data: Overall risk: ${kpis.overall_risk}%, At-risk employees: ${kpis.at_risk_count}, Predicted exits: ${kpis.predicted_exits}, Financial exposure: ${kpis.financial_exposure}. Top risk dept: ${(d?.by_dept||[])[0]?.dept}. Give top 5 retention interventions with ROI.`,sys)
    setInsight(r||'Connect the AI proxy to get strategic retention recommendations based on your company data.')
    setInsLoad(false)
  }

  const getRetentionPlan=async(emp)=>{
    setSelected(emp); setRetPlan('')
    setRetLoad(true)
    const sys=`You are an HR retention specialist. Generate a personalised 4-step retention action plan. Be specific and actionable.`
    const r=await callAI(`Employee: ${emp.name}, Dept: ${emp.dept}, Risk: ${emp.risk_score}%, Reason: ${emp.risk_reason}. Generate a personalised retention action plan in 4 steps.`,sys)
    setRetPlan(r||`Personalised retention plan unavailable. Please ensure the AI proxy endpoint is configured.`)
    setRetLoad(false)
  }

  const kpis       = data?.kpis       || {}
  const riskEmployees = data?.at_risk_employees || []
  const deptRisk   = data?.by_dept    || []
  const drivers    = data?.risk_drivers|| []
  const overallRisk= kpis.overall_risk || 0
  const gauge      = [{name:'Risk',value:overallRisk,fill:'#ef4444'},{name:'Rest',value:100-overallRisk,fill:'#f1f5f9'}]

  if(loading)return<div style={{textAlign:'center',padding:60,color:P,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Generating attrition predictions for {company?.name}...</div></div>

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🔮 AI Attrition Prediction</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{company?.name} · {date} · Predictive ML Engine</div>
        <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
          {[
            {label:'Overall Risk',       val:kpis.overall_risk?`${kpis.overall_risk}%`:null, icon:'⚠️'},
            {label:'At-Risk Staff',      val:kpis.at_risk_count,                              icon:'👤'},
            {label:'Predicted Exits',    val:kpis.predicted_exits,                            icon:'🚪'},
            {label:'Financial Exposure', val:kpis.financial_exposure,                         icon:'💰'},
          ].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'8px 14px'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,.7)'}}>{s.icon} {s.label}</div>
              <div style={{fontSize:14,fontWeight:900,color:'#fff'}}>{s.val||'—'}</div>
            </div>
          ))}
        </div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e'}}>⚠️ {error}</div>}

      {/* AI Strategy */}
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:16,padding:'16px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
          <span style={{fontSize:16}}>🧠</span>
          <span style={{fontSize:11,fontWeight:800,color:P}}>AI Retention Strategy</span>
          {insLoad&&<span style={{fontSize:8,color:'#94a3b8',marginLeft:'auto'}}>Generating…</span>}
        </div>
        {insLoad?<div style={{display:'flex',gap:5,padding:'6px'}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}</div>:<Md text={insight}/>}
      </div>

      {!data&&!loading?(
        <div style={{textAlign:'center',padding:60,color:'#94a3b8',background:'#fff',borderRadius:14}}>
          <div style={{fontSize:40,marginBottom:12}}>🔮</div>
          <div style={{fontSize:14,fontWeight:700}}>No attrition prediction data yet for {company?.name}</div>
          <div style={{fontSize:12,marginTop:6}}>Predictions appear after 6+ months of employee data including attendance, performance, and payroll</div>
        </div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          {/* Risk Gauge */}
          <W title="Overall Flight Risk" subtitle="90-day forecast">
            {overallRisk>0?(
              <>
                <div style={{textAlign:'center',position:'relative',height:140}}>
                  <ResponsiveContainer><RadialBarChart cx="50%" cy="70%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={gauge}><RadialBar dataKey="value" cornerRadius={4}>{gauge.map((d,i)=><Cell key={i} fill={d.fill}/>)}</RadialBar></RadialBarChart></ResponsiveContainer>
                  <div style={{position:'absolute',top:'55%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
                    <div style={{fontSize:28,fontWeight:900,color:'#ef4444'}}>{overallRisk}%</div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>{overallRisk>50?'HIGH':'MEDIUM'}</div>
                  </div>
                </div>
                <div style={{textAlign:'center',fontSize:9,color:'#64748b'}}>{kpis.at_risk_count||0} of {kpis.total_employees||0} employees at risk</div>
              </>
            ):<div style={{padding:40,textAlign:'center',color:'#94a3b8',fontSize:12}}>No risk data yet</div>}
          </W>

          {/* Dept Risk */}
          <W title="Risk by Department" subtitle="Flight risk %">
            {deptRisk.length>0?(
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {deptRisk.map((d,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{fontSize:9,color:'#64748b',width:70,flexShrink:0}}>{d.dept}</div>
                    <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${d.risk_pct}%`,background:d.risk_pct>30?'#ef4444':d.risk_pct>20?'#f59e0b':'#10b981',borderRadius:4}}/>
                    </div>
                    <div style={{fontSize:9,fontWeight:700,width:28,textAlign:'right',color:d.risk_pct>30?'#ef4444':d.risk_pct>20?'#f59e0b':'#10b981'}}>{d.risk_pct}%</div>
                    <div style={{fontSize:8,color:'#94a3b8',width:16}}>{d.count}</div>
                  </div>
                ))}
              </div>
            ):<div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No department risk data</div>}
          </W>

          {/* Risk Drivers */}
          <W title="Key Risk Drivers" subtitle="AI analysis">
            {drivers.length>0?(
              <div style={{height:160}}>
                <ResponsiveContainer><BarChart data={drivers} margin={{top:0,right:10,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="factor" tick={{fontSize:8}} interval={0} angle={-20} textAnchor="end" height={30}/>
                  <YAxis tick={{fontSize:8}}/><Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[v+'%','Impact']}/>
                  <Bar dataKey="impact_pct" name="%" radius={[4,4,0,0]}>{drivers.map((d,i)=><Cell key={i} fill={d.color||P}/>)}</Bar>
                </BarChart></ResponsiveContainer>
              </div>
            ):<div style={{padding:30,textAlign:'center',color:'#94a3b8',fontSize:12}}>No driver data yet</div>}
          </W>

          {/* At-Risk Employees */}
          <W title="High-Risk Employees" subtitle="Click for personalised retention plan" span={2}>
            {riskEmployees.length>0?(
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {riskEmployees.map((e,i)=>(
                  <div key={i} onClick={()=>getRetentionPlan(e)}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:selected?.id===e.id?`${P}08`:'#f8fafc',borderRadius:10,cursor:'pointer',border:`1px solid ${selected?.id===e.id?P+'30':'#f1f5f9'}`,transition:'all .2s'}}>
                    <span style={{fontSize:16}}>{e.risk_score>85?'🔴':e.risk_score>70?'🟠':'🟡'}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{e.name} <span style={{fontSize:8,color:'#94a3b8',fontWeight:400}}>· {e.dept}</span></div>
                      <div style={{fontSize:8,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.risk_reason||e.reason}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:900,color:e.risk_score>85?'#ef4444':e.risk_score>70?'#f59e0b':'#8b5cf6'}}>{e.risk_score}%</div>
                      <div style={{fontSize:8,color:'#94a3b8'}}>risk score</div>
                    </div>
                  </div>
                ))}
              </div>
            ):<div style={{textAlign:'center',padding:40,color:'#94a3b8',fontSize:12}}><div style={{fontSize:32,marginBottom:8}}>✅</div>No high-risk employees identified for {company?.name}</div>}
          </W>

          {/* Retention Plan */}
          <W title="AI Retention Plan" subtitle={selected?`Personalised for ${selected.name}`:'Select an employee above'}>
            {!selected&&<div style={{textAlign:'center',padding:'30px',color:'#94a3b8',fontSize:10}}><div style={{fontSize:28,marginBottom:8}}>👆</div>Click any at-risk employee to generate a personalised AI retention plan</div>}
            {selected&&retLoad&&<div style={{display:'flex',gap:5,padding:'12px',alignItems:'center'}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}<span style={{fontSize:9,color:'#94a3b8',marginLeft:6}}>Generating…</span></div>}
            {selected&&!retLoad&&retPlan&&<Md text={retPlan}/>}
          </W>
        </div>
      )}
    </div>
  )
}
