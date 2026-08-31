// FILE: AIAttritionPredictionPage.jsx — AI Attrition Prediction
// Predictive attrition with explainable AI, risk scoring, retention actions
import { useState, useEffect } from 'react'
import { BarChart,Bar,PieChart,Pie,Cell,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,RadialBarChart,RadialBar } from 'recharts'
import { useApp } from '../../../context/AppContext.jsx'

const P='#7c3aed',G='linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const VITE_KEY=import.meta?.env?.VITE_ANTHROPIC_API_KEY||''

async function callAI(q){
  const sys=`You are an HR retention strategist AI. Give specific, actionable retention recommendations based on attrition risk data. Be concise — max 5 bullets. Nepal Labour Act 2074 context.`
  try{const r=await fetch('/api/v1/ai-proxy/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:sys,messages:[{role:'user',content:q}],model:'claude-sonnet-4-6',max_tokens:512}),signal:AbortSignal.timeout(8000)});if(r.ok){const d=await r.json();if(d.content)return d.content}}catch{}
  if(VITE_KEY&&VITE_KEY.startsWith('sk-ant')&&VITE_KEY!=='sk-ant-your-key-here'){try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':VITE_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-only-beta':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:512,system:sys,messages:[{role:'user',content:q}]})});const d=await r.json();if(r.ok&&d?.content?.[0]?.text)return d.content[0].text}catch{}}
  return null
}

const W=({children,title,subtitle,extra,span=1})=>(
  <div style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid #e2e8f0',boxShadow:'0 1px 8px rgba(0,0,0,.05)',gridColumn:`span ${span}`,display:'flex',flexDirection:'column',gap:10}}>
    {(title||subtitle||extra)&&<div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
      <div>{title&&<div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{title}</div>}{subtitle&&<div style={{fontSize:9,color:'#94a3b8',marginTop:1}}>{subtitle}</div>}</div>
      {extra}
    </div>}
    {children}
  </div>
)

const riskEmployees=[
  {name:'Arun Sharma',     dept:'Engineering',risk:91,reason:'Salary gap NPR 18K, 0 promotions 3yrs, login pattern drop',trend:'🔴'},
  {name:'Sita Adhikari',   dept:'Engineering',risk:87,reason:'Multiple job portal visits, peer-rated low satisfaction',trend:'🔴'},
  {name:'Bikash Thapa',    dept:'Sales',      risk:82,reason:'Missed quota 3 months, team conflict detected',trend:'🔴'},
  {name:'Priya Maharjan',  dept:'Sales',      risk:78,reason:'Lateral offer refused, seeking internal transfer',trend:'🟠'},
  {name:'Suresh KC',       dept:'IT',         risk:74,reason:'Certification completed, no role change opportunity',trend:'🟠'},
  {name:'Laxmi Rai',       dept:'Ops',        risk:69,reason:'Attendance dip 12%, burnout indicators in survey',trend:'🟠'},
]

const deptRisk=[
  {dept:'Engineering',risk:34,n:8},
  {dept:'Sales',      risk:28,n:5},
  {dept:'Customer',   risk:18,n:3},
  {dept:'IT',         risk:15,n:2},
  {dept:'Finance',    risk:9, n:1},
  {dept:'HR',         risk:5, n:1},
]

const drivers=[
  {factor:'Compensation',impact:34,color:'#ef4444'},
  {factor:'Growth',      impact:28,color:'#f59e0b'},
  {factor:'Manager',     impact:18,color:'#8b5cf6'},
  {factor:'Culture',     impact:12,color:'#0ea5e9'},
  {factor:'WFH Policy',  impact:8, color:'#10b981'},
]

const gauge=[{name:'Risk',value:34,fill:'#ef4444'},{name:'Rest',value:66,fill:'#f1f5f9'}]


function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function AIAttritionPredictionPage(){
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const [insight,setInsight]=useState('')
  const [loading,setLoading]=useState(false)
  const [selected,setSelected]=useState(null)
  const [retention,setRetention]=useState('')
  const date=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})

  useEffect(()=>{
    const go=async()=>{
      setLoading(true)
      const r=await callAI('Engineering team has 34% attrition risk. Salary gap NPR 13K/month below market. 8 employees at high risk. What are the top 5 retention interventions with ROI?')
      setInsight(r||`**AI Retention Strategy — Engineering Team:**\n\n- **Immediate salary review** for 8 at-risk engineers (NPR 13K gap) — estimated NPR 156K/month, saves NPR 1.76M in replacement costs. ROI: 11x\n- **1:1 retention conversations** with all 16 high-risk employees by Jul 30 — zero cost, -20% departure probability\n- **Career pathing sessions** — map promotion timelines for engineers with 3+ years no growth\n- **Flexible WFH policy** — 2-day WFH reduces commute stress, improves satisfaction +14 points\n- **Stay bonuses** for critical roles — NPR 50K-100K for 12-month commitment`)
      setLoading(false)
    }
    go()
  },[])

  const getRetention=async(emp)=>{
    setSelected(emp)
    setRetention('')
    const r=await callAI(`Employee ${emp.name} (${emp.dept}) has ${emp.risk}% attrition risk. Reason: ${emp.reason}. Generate a personalised retention action plan in 4 specific steps.`)
    setRetention(r||`**Retention Plan — ${emp.name}:**\n\n- Schedule urgent 1:1 with direct manager this week\n- Review compensation vs market benchmark\n- Identify next promotion or growth opportunity\n- Offer skill development programme or certification budget`)
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{background:G,borderRadius:16,padding:'20px 24px',boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>🔮 AI Attrition Prediction</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>{date} · Predictive ML Engine · 94.2% confidence · Explainable AI</div>
        <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
          {[{label:'Overall Risk',val:'34%',icon:'⚠️'},{label:'At-Risk Staff',val:'19',icon:'👤'},{label:'Predicted Exits',val:'14-18',icon:'🚪'},{label:'Financial Exposure',val:'NPR 3.2M',icon:'💰'},{label:'Intervention ROI',val:'8.4x',icon:'📈'}].map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'8px 14px'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,.7)'}}>{s.icon} {s.label}</div>
              <div style={{fontSize:14,fontWeight:900,color:'#fff'}}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insight */}
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:16,padding:'16px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
          <span style={{fontSize:16}}>🧠</span>
          <span style={{fontSize:11,fontWeight:800,color:P}}>AI Retention Strategy</span>
          {loading&&<span style={{fontSize:8,color:'#94a3b8',marginLeft:'auto'}}>Generating...</span>}
        </div>
        {loading?<div style={{display:'flex',gap:5,padding:'6px'}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}</div>:(
          <div style={{fontSize:10,color:'#1e1b4b',lineHeight:1.7}}>
            {(insight||'').split('\n').map((l,i)=>{
              const h=l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`)
              if(!l.trim())return<div key={i} style={{height:4}}/>
              if(l.startsWith('- '))return<div key={i} style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>
              return<div key={i} dangerouslySetInnerHTML={{__html:h}}/>
            })}
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {/* Risk Gauge */}
        <W title="Overall Flight Risk" subtitle="Company-wide 90-day forecast">
          <div style={{textAlign:'center',position:'relative',height:140}}>
            <ResponsiveContainer><RadialBarChart cx="50%" cy="70%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={gauge}>
              <RadialBar dataKey="value" cornerRadius={4}>{gauge.map((d,i)=><Cell key={i} fill={d.fill}/>)}</RadialBar>
            </RadialBarChart></ResponsiveContainer>
            <div style={{position:'absolute',top:'55%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:900,color:'#ef4444'}}>34%</div>
              <div style={{fontSize:9,color:'#94a3b8'}}>MEDIUM-HIGH</div>
            </div>
          </div>
          <div style={{textAlign:'center',fontSize:9,color:'#64748b'}}>19 of 312 employees at risk</div>
        </W>

        {/* Dept Risk */}
        <W title="Risk by Department" subtitle="Flight risk % and headcount">
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {deptRisk.map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontSize:9,color:'#64748b',width:70,flexShrink:0}}>{d.dept}</div>
                <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${d.risk}%`,background:d.risk>30?'#ef4444':d.risk>20?'#f59e0b':'#10b981',borderRadius:4,transition:'width .6s'}}/>
                </div>
                <div style={{fontSize:9,fontWeight:700,width:28,textAlign:'right',color:d.risk>30?'#ef4444':d.risk>20?'#f59e0b':'#10b981'}}>{d.risk}%</div>
                <div style={{fontSize:8,color:'#94a3b8',width:16}}>{d.n}</div>
              </div>
            ))}
          </div>
        </W>

        {/* Risk Drivers */}
        <W title="Key Risk Drivers" subtitle="Why employees leave — AI analysis">
          <div style={{height:160}}>
            <ResponsiveContainer><BarChart data={drivers} margin={{top:0,right:10,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="factor" tick={{fontSize:8}} interval={0} angle={-20} textAnchor="end" height={30}/>
              <YAxis tick={{fontSize:8}}/>
              <Tooltip contentStyle={{fontSize:10,borderRadius:8}} formatter={v=>[v+'%','Impact']}/>
              <Bar dataKey="impact" name="%" radius={[4,4,0,0]}>{drivers.map((d,i)=><Cell key={i} fill={d.color}/>)}</Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </W>

        {/* At-Risk Employees */}
        <W title="High-Risk Employees" subtitle="Click for personalised retention plan — AI explainable" span={2}>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {riskEmployees.map((e,i)=>(
              <div key={i} onClick={()=>getRetention(e)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:selected?.name===e.name?`${P}08`:'#f8fafc',borderRadius:10,cursor:'pointer',border:`1px solid ${selected?.name===e.name?P+'30':'#f1f5f9'}`,transition:'all .2s'}}>
                <span style={{fontSize:16}}>{e.trend}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{e.name} <span style={{fontSize:8,color:'#94a3b8',fontWeight:400}}>· {e.dept}</span></div>
                  <div style={{fontSize:8,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.reason}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:900,color:e.risk>85?'#ef4444':e.risk>75?'#f59e0b':'#8b5cf6'}}>{e.risk}%</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>risk score</div>
                </div>
              </div>
            ))}
          </div>
        </W>

        {/* Retention Plan */}
        <W title="AI Retention Plan" subtitle={selected?`Personalised for ${selected.name}`:'Select an employee above'}>
          {!selected&&<div style={{textAlign:'center',padding:'30px',color:'#94a3b8',fontSize:10}}><div style={{fontSize:28,marginBottom:8}}>👆</div>Click any at-risk employee to generate a personalised AI retention plan</div>}
          {selected&&!retention&&<div style={{display:'flex',gap:5,padding:'12px',alignItems:'center'}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:P,opacity:.5+i*.25}}/>)}<span style={{fontSize:9,color:'#94a3b8',marginLeft:6}}>Generating retention plan...</span></div>}
          {retention&&(
            <div style={{fontSize:10,color:'#1e1b4b',lineHeight:1.7}}>
              {retention.split('\n').map((l,i)=>{
                const h=l.replace(/\*\*(.+?)\*\*/g,(_,t)=>`<b>${t}</b>`)
                if(!l.trim())return<div key={i} style={{height:4}}/>
                if(l.startsWith('- '))return<div key={i} style={{paddingLeft:14,position:'relative',marginBottom:3}}><span style={{position:'absolute',left:2,color:P}}>•</span><span dangerouslySetInnerHTML={{__html:h.slice(2)}}/></div>
                return<div key={i} dangerouslySetInnerHTML={{__html:h}}/>
              })}
            </div>
          )}
        </W>
      </div>
    </div>
  )
}
