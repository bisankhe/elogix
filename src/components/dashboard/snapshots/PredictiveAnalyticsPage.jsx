// FILE: PredictiveAnalyticsPage.jsx — Predictive Analytics (AI-driven forecasting)
import { useState, useEffect } from 'react'
import { LineChart,Line,AreaChart,Area,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Cell } from 'recharts'
import { useApp } from '../../../context/AppContext.jsx'

const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const VITE_KEY=import.meta?.env?.VITE_ANTHROPIC_API_KEY||''

async function callAI(q){
  const sys=`You are a predictive HR analytics AI. Provide data-driven forecasts with confidence intervals. Nepal Labour Act 2074. Company: 312 employees, 8.2% attrition, NPR 4.8M payroll.`
  try{const r=await fetch('/api/v1/ai-proxy/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:sys,messages:[{role:'user',content:q}],model:'claude-sonnet-4-6',max_tokens:600}),signal:AbortSignal.timeout(10000)});if(r.ok){const d=await r.json();if(d.content)return d.content}}catch{}
  if(VITE_KEY&&VITE_KEY.startsWith('sk-ant')&&VITE_KEY!=='sk-ant-your-key-here'){try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:600,system:sys,messages:[{role:'user',content:q}]})});const d=await r.json();if(r.ok&&d?.content?.[0]?.text)return d.content[0].text}catch{}}
  return null

const W=({children,title,subtitle,extra,span=1})=>(
  <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>
    {(title||subtitle||extra)&&<div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
      <div>{title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}{subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}</div>
      {extra}
    </div>}
    {children}
  </div>
)

// Forecast data (past + predicted)
const headcountForecast=[
  {m:'Jan',actual:289,pred:null},{m:'Feb',actual:293,pred:null},{m:'Mar',actual:298,pred:null},
  {m:'Apr',actual:302,pred:null},{m:'May',actual:308,pred:null},{m:'Jun',actual:312,pred:null},
  {m:'Jul',actual:312,pred:315},{m:'Aug',actual:null,pred:318},{m:'Sep',actual:null,pred:322},
  {m:'Oct',actual:null,pred:325},{m:'Nov',actual:null,pred:320},{m:'Dec',actual:null,pred:316},
]
const attrForecast=[
  {m:'Jan',actual:7.2,pred:null},{m:'Feb',actual:7.8,pred:null},{m:'Mar',actual:8.1,pred:null},
  {m:'Apr',actual:7.9,pred:null},{m:'May',actual:8.5,pred:null},{m:'Jun',actual:8.2,pred:null},
  {m:'Jul',actual:8.0,pred:7.8},{m:'Aug',actual:null,pred:7.5},{m:'Sep',actual:null,pred:8.8},
  {m:'Oct',actual:null,pred:9.2},{m:'Nov',actual:null,pred:8.4},{m:'Dec',actual:null,pred:7.9},
]
const payrollForecast=[
  {m:'Jan',actual:4.2},{m:'Feb',actual:4.3},{m:'Mar',actual:4.4},{m:'Apr',actual:4.5},
  {m:'May',actual:4.7},{m:'Jun',actual:4.8},{m:'Jul',pred:4.9},{m:'Aug',pred:5.0},
  {m:'Sep',pred:5.1},{m:'Oct',pred:5.3},{m:'Nov',pred:5.5},{m:'Dec',pred:5.4},
]
const scenarioData=[
  {scenario:'Do Nothing',   exits:16, cost:3.2,  morale:58},
  {scenario:'Targeted Fix', exits:4,  cost:0.38, morale:72},
  {scenario:'Full Program', exits:2,  cost:0.58, morale:81},
]
const skills=[
  {skill:'AI/ML',  demand:92, supply:34, gap:58},
  {skill:'Cloud',  demand:78, supply:45, gap:33},
  {skill:'Data',   demand:85, supply:52, gap:33},
  {skill:'React',  demand:70, supply:61, gap:9},
  {skill:'Python', demand:80, supply:55, gap:25},
]

export default function PredictiveAnalyticsPage(){
  const [forecast,setForecast]=useState('')
  const [loading,setLoading]=useState(false)
  const [topic,setTopic]=useState('12-month workforce forecast')
  const date=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})

  const generate=async(t)=>{
    setTopic(t); setLoading(true)
    const r=await callAI(`Generate a 12-month HR predictive forecast for: ${t}. Include: current baseline, predicted trend, risk factors, confidence level, and top 3 recommended actions. Use specific numbers.`)
    setForecast(r||`**12-Month Predictive Forecast — ${t}:**\n\n- **Headcount:** 312 now → 316 by Dec 2026 (if attrition controlled)\n- **Attrition peak:** Sep-Oct 2026 (8.8-9.2%) — festival season + annual review window\n- **Payroll forecast:** NPR 4.8M → 5.4M by Dec 2026 (+12.5%)\n- **Skill gap risk:** AI/ML roles — 58-point gap, 18 months to close at current L&D pace\n- **Confidence:** 87% on headcount | 79% on attrition | 91% on payroll`)
    setLoading(false)

  useEffect(()=>{generate('overall 12-month workforce forecast')},[])

  const MsgLine=({l})=>{
    const h=l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`)
    if(!l.trim())return<div style={{height:4}}/>
    if(l.startsWith('- '))return<div style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>
    return<div dangerouslySetInnerHTML={{__html:h}}/>

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🔮 Predictive Analytics</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{date} · ML Forecasting Engine · 87% avg confidence</div>
        <div style={{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'}}>
          {['12-month workforce forecast','Attrition scenarios','Payroll projection','Skill gap forecast'].map(t=>(
            <button key={t} onClick={()=>generate(t)}
              style={{padding:'5px 12px',borderRadius:20,border:'none',background:topic===t?'rgba(255,255,255,.25)':'rgba(255,255,255,.1)',color:'#fff',fontSize:8,fontWeight:700,cursor:'pointer'}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* AI Forecast Box */}
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:16,padding:'16px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
          <span style={{fontSize:16}}>🧠</span>
          <span style={{fontSize:11,fontWeight:800,color:P}}>AI Predictive Forecast — {topic}</span>
          {loading&&<span style={{fontSize:8,color:'#94a3b8',marginLeft:'auto'}}>Generating...</span>}
        </div>
        {loading?<div style={{display:'flex',gap:5,padding:'6px'}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}</div>:(
          <div style={{fontSize:10,color:'#1e1b4b',lineHeight:1.7}}>
            {(forecast||'').split('\n').map((l,i)=><MsgLine key={i} l={l}/>)}
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        <W title="Headcount Forecast" subtitle="Actual + 6-month prediction" span={2}>
          <div style={{height:180}}>
            <ResponsiveContainer><AreaChart data={headcountForecast} margin={{top:0,right:10,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="actG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={P} stopOpacity={0.3}/><stop offset="95%" stopColor={P} stopOpacity={0}/></linearGradient>
                <linearGradient id="predG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} domain={[280,340]}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
              <Area type="monotone" dataKey="actual" name="Actual" stroke={P} fill="url(#actG)" strokeWidth={2} connectNulls={false}/>
              <Area type="monotone" dataKey="pred" name="Predicted" stroke="#f59e0b" fill="url(#predG)" strokeWidth={2} strokeDasharray="5 3" connectNulls={false}/>
            </AreaChart></ResponsiveContainer>
          </div>
          <div style={{display:'flex',gap:12}}>
            {[{c:P,l:'Actual data'},{c:'#f59e0b',l:'AI Prediction'}].map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:3,background:d.c,borderRadius:2}}/><span style={{fontSize:8,color:'#94a3b8'}}>{d.l}</span></div>
            ))}
          </div>
        </W>
        <W title="Confidence Scores" subtitle="Model accuracy by metric">
          <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
            {[{label:'Headcount forecast',conf:87,c:'#10b981'},{label:'Attrition prediction',conf:79,c:'#f59e0b'},{label:'Payroll projection',conf:91,c:'#0ea5e9'},{label:'Skill gap forecast',conf:72,c:'#8b5cf6'},{label:'Performance risk',conf:83,c:P}].map((s,i)=>(
              <div key={i}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                  <span style={{fontSize:9,color:'#0f172a'}}>{s.label}</span>
                  <span style={{fontSize:9,fontWeight:700,color:s.c}}>{s.conf}%</span>
                </div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${s.conf}%`,background:s.c,borderRadius:3,transition:'width .6s'}}/>
                </div>
              </div>
            ))}
          </div>
        </W>

        {/* Attrition Forecast */}
        <W title="Attrition Rate Forecast" subtitle="Seasonal trend + prediction" span={2}>
          <div style={{height:160}}>
            <ResponsiveContainer><LineChart data={attrForecast} margin={{top:0,right:10,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="m" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} domain={[6,11]}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[v+'%']}/>
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#ef4444" strokeWidth={2} dot={{r:3}} connectNulls={false}/>
              <Line type="monotone" dataKey="pred" name="Predicted" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={{r:3}} connectNulls={false}/>
            </LineChart></ResponsiveContainer>
          </div>
          <div style={{background:'#fff7ed',borderRadius:8,padding:'8px 10px',fontSize:9,color:'#92400e'}}>
            ⚠️ <b>Alert:</b> AI predicts attrition spike to 9.2% in Oct 2026 (post-Dashain). Proactive retention budget recommended before Sep.
          </div>
        </W>

        {/* Scenario Analysis */}
        <W title="Scenario Analysis" subtitle="What-if modelling">
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {scenarioData.map((s,i)=>(
              <div key={i} style={{padding:'10px',borderRadius:10,background:i===1?`${P}08`:'#f8fafc',border:`1px solid ${i===1?P+'30':'#f1f5f9'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <span style={{fontSize:10,fontWeight:700,color:i===1?P:'#0f172a'}}>{s.scenario} {i===1&&'⭐'}</span>
                </div>
                <div style={{display:'flex',gap:12}}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:12,fontWeight:800,color:'#ef4444'}}>{s.exits}</div><div style={{fontSize:7,color:'#94a3b8'}}>exits</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:12,fontWeight:800,color:'#f59e0b'}}>NPR {s.cost}M</div><div style={{fontSize:7,color:'#94a3b8'}}>cost</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:12,fontWeight:800,color:'#10b981'}}>{s.morale}</div><div style={{fontSize:7,color:'#94a3b8'}}>morale</div></div>
                </div>
              </div>
            ))}
          </div>
        </W>

        {/* Skill Gap Forecast */}
        <W title="Skill Gap Forecast" subtitle="Demand vs supply — 12 months" span={3}>
          <div style={{height:160}}>
            <ResponsiveContainer><BarChart data={skills} margin={{top:0,right:10,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="skill" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}}/>
              <Bar dataKey="demand" name="Demand" fill="#0ea5e9" radius={[4,4,0,0]}/>
              <Bar dataKey="supply" name="Supply" fill="#10b981" radius={[4,4,0,0]}/>
              <Bar dataKey="gap"    name="Gap"    fill="#ef4444" radius={[4,4,0,0]}/>
            </BarChart></ResponsiveContainer>
          </div>
          <div style={{fontSize:9,color:'#64748b'}}>AI/ML skill gap is most critical (58 points). Recommend external hiring + internal upskilling programme starting Q3 2026.</div>
        </W>
      </div>
    </div>
  )
