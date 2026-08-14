// FILE: AttritionDashboardPage.jsx - Attrition Dashboard (Exit Analytics)
// Executive command center: KPI cards, trend line, dept risk heatmap, demographic breakdown

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 60%,#fca5a5 100%)'
const A = '#dc2626'

const KPIS = {
  total_headcount:248, active_employees:236, total_exits_ytd:18,
  attrition_rate_pct:7.3, voluntary_pct:83, involuntary_pct:17,
  avg_tenure_years:2.4, regrettable_exits:6,
}

const TREND = [
  {month:'Jan',rate:5.2},{month:'Feb',rate:4.8},{month:'Mar',rate:6.1},{month:'Apr',rate:5.9},
  {month:'May',rate:8.4},{month:'Jun',rate:9.1},
]

const DEPT_HEATMAP = [
  {dept:'Customer Service',rate:14.2,exits:8,headcount:56,cost_npr:1840000,risk:'high'},
  {dept:'Sales & Marketing',rate:11.8,exits:5,headcount:42,cost_npr:1250000,risk:'high'},
  {dept:'Information Technology',rate:6.4,exits:3,headcount:47,cost_npr:980000,risk:'medium'},
  {dept:'Finance & Accounts',rate:4.1,exits:1,headcount:24,cost_npr:310000,risk:'low'},
  {dept:'Human Resources',rate:2.8,exits:1,headcount:14,cost_npr:180000,risk:'low'},
]

const DEMOGRAPHICS = {
  age_band:[{label:'18-25',pct:32},{label:'26-35',pct:41},{label:'36-45',pct:19},{label:'46+',pct:8}],
  tenure_band:[{label:'0-1yr',pct:38},{label:'1-3yr',pct:29},{label:'3-5yr',pct:22},{label:'5yr+',pct:11}],
  gender:[{label:'Male',pct:58},{label:'Female',pct:42}],
}

const RISK_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'},low:{c:'#10b981',bg:'#f0fdf4'}}

function MiniBarChart({data,color}) {
  const max = Math.max(...data.map(d=>d.pct||d.rate))
  return (
    <div style={{display:'flex',gap:6,alignItems:'flex-end',height:60}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,textAlign:'center'}}>
          <div style={{height:`${((d.pct||d.rate)/max)*48}px`,background:color,borderRadius:'4px 4px 0 0',marginBottom:4}}/>
          <div style={{fontSize:8,color:'#94a3b8'}}>{d.label||d.month}</div>
        </div>
      ))}
    </div>
  )
}

export default function AttritionDashboardPage() {
  const [filterDept, setFilterDept] = useState('all')
  const [msg, setMsg] = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Attrition Dashboard"
        breadcrumb="Employee Lifecycle > Offboarding > Exit Analytics"
        gradient={G}
        stats={[
          {icon:'👥',label:'Total Headcount',  value:KPIS.total_headcount},
          {icon:'📉',label:'Attrition Rate',    value:KPIS.attrition_rate_pct+'%'},
          {icon:'🚪',label:'Total Exits YTD',   value:KPIS.total_exits_ytd},
          {icon:'⚠',label:'Regrettable Exits', value:KPIS.regrettable_exits},
        ]}
        onAdd={()=>notify('📊 Generating Attrition Dashboard report...', setTimeout(()=>notify('✅ Report generated and ready to download'),1500))} addLabel="📊 Export Report" onExcel={()=>{}}/>

      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7f1d1d',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔒</span>
        <div><strong>Privacy by Design:</strong> All data shown is aggregated and anonymized per organizational privacy principles. No individual departure reasons are exposed - Nepal law requires personal/sensitive exit information remain confidential.</div>
      </div>

      {/* Section A: Executive KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:'Voluntary vs Involuntary',value:`${KPIS.voluntary_pct}% / ${KPIS.involuntary_pct}%`,icon:'🚶',color:'#3b82f6'},
          {label:'Avg Tenure at Exit',value:KPIS.avg_tenure_years+' yrs',icon:'⏳',color:'#7c3aed'},
          {label:'Active Employees',value:KPIS.active_employees,icon:'✅',color:'#10b981'},
          {label:'Cost of Turnover (Est.)',value:'NPR 4.6M',icon:'💰',color:'#f59e0b'},
        ].map((k,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 16px'}}>
            <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.color}}>{k.value}</div>
            <div style={{fontSize:9,color:'#94a3b8',fontWeight:600}}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* Trend Analysis */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>📈 Attrition Rate Trend (Monthly)</div>
          <div style={{fontSize:10,color:'#94a3b8',marginBottom:14}}>Spike detected in May-June - investigate via Exit Analysis</div>
          <MiniBarChart data={TREND} color={A}/>
        </div>

        {/* Demographic Breakdown */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>👤 Demographic Breakdown</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <div style={{fontSize:9,color:'#64748b',fontWeight:700,marginBottom:6}}>By Age Band</div>
              <MiniBarChart data={DEMOGRAPHICS.age_band} color="#7c3aed"/>
            </div>
            <div>
              <div style={{fontSize:9,color:'#64748b',fontWeight:700,marginBottom:6}}>By Tenure</div>
              <MiniBarChart data={DEMOGRAPHICS.tenure_band} color="#0891b2"/>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Heatmap */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔥 Department Risk Heatmap</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
          {DEPT_HEATMAP.map((d,i)=>{
            const rc = RISK_CFG[d.risk]
            return (
              <div key={i} onClick={()=>setFilterDept(d.dept)}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,impact_links:['Exit Analysis','Employee Directory']}})}}
                style={{background:rc.bg,border:`2px solid ${rc.c}33`,borderRadius:12,padding:'14px 12px',cursor:'pointer',textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:900,color:rc.c}}>{d.rate}%</div>
                <div style={{fontSize:9,fontWeight:700,color:'#0f172a',marginTop:4,lineHeight:1.3}}>{d.dept}</div>
                <div style={{fontSize:8,color:'#64748b',marginTop:4}}>{d.exits} exits / {d.headcount} HC</div>
                <div style={{fontSize:8,color:rc.c,fontWeight:700,marginTop:2}}>NPR {(d.cost_npr/1000000).toFixed(1)}M cost</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gender split */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚖ Gender Distribution of Exits</div>
        <div style={{display:'flex',height:24,borderRadius:12,overflow:'hidden'}}>
          {DEMOGRAPHICS.gender.map((g,i)=>(
            <div key={i} style={{width:`${g.(pct||0)}%`,background:i===0?'#3b82f6':'#ec4899',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:10,fontWeight:700,color:'#fff'}}>{g.label} {g.(pct||0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:360}}>{msg}</div>}

      {/* Export Report Modal placeholder */}
      <div style={{display:'none'}} id="report-placeholder"/>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'🔍',label:'Drill into Exit Analysis',key:'drill'},{icon:'👥',label:'View Department',key:'dept'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export Report (CSV)',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
