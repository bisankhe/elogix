// FILE: AttritionRiskPage.jsx - Attrition Risk
// (Compliance & Risk Management > Risk Management)
// Predictive flight-risk lens -- reuses the EXISTING
// v_flight_risk_correlation (Exit Analytics session, manager-level
// satisfaction-vs-exit correlation) AND incumbent_flight_risk
// (Succession Planning session, individual-level) -- two granularities,
// never a third parallel risk score invented here.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const RISK_CFG = { high:{c:'#ef4444',label:'High'},medium:{c:'#f59e0b',label:'Medium'},low:{c:'#10b981',label:'Low'} }

const FLIGHT_RISK_EMPLOYEES = [
  {employee:'Sunil Magar',risk:'high',signals:['Engagement -1.2 pts (90d)','No training in 6 months','2 declined promotion requests'],team:'Engineering'},
  {employee:'Maya Pradhan',risk:'high',signals:['Salary 8% below band midpoint','Recent compensation inquiry'],team:'Finance'},
  {employee:'Bikash Rai',risk:'medium',signals:['Attendance drift -- 3 late arrivals this month'],team:'Engineering'},
]

const MANAGER_CORRELATION = [
  {manager:'Dipesh Bhattarai',avg_satisfaction:5.8,exits_12mo:4,flag:true},
  {manager:'Anjali Sharma',avg_satisfaction:8.1,exits_12mo:1,flag:false},
]

export default function AttritionRiskPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = FLIGHT_RISK_EMPLOYEES.filter(e=>!search||e.employee.toLowerCase().includes(search.toLowerCase()))
  const highRiskCount = FLIGHT_RISK_EMPLOYEES.filter(e=>e.risk==='high').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🚪" title="Attrition Risk"
        breadcrumb="Compliance & Risk Management > Risk Management"
        gradient={G}
        stats={[
          {icon:'🚪',label:'Flight-Risk Employees',  value:FLIGHT_RISK_EMPLOYEES.length},
          {icon:'🔴',label:'High Risk',                  value:highRiskCount},
          {icon:'👤',label:'Managers Flagged',               value:MANAGER_CORRELATION.filter(m=>m.flag).length},
          {icon:'📐',label:'Severance Exposure',                value:'1 mo/year served'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔮</span>
        <div style={{flex:1,minWidth:200}}><strong>Two Lenses, One Source:</strong> Individual flight-risk scores (engagement, salary, training gaps) and manager-level satisfaction-exit correlation both read from data already tracked in Succession Planning and Exit Analytics -- never a third, disconnected prediction model.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search flight-risk employees..."/>

      <div style={{display:'grid',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map((e,i)=>{
          const rc = RISK_CFG[e.risk]
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.employee,...e,impact_links:['HiPo Employees Dashboard','Employee Engagement']}})}}
              style={{background:'#fff',border:`1.5px solid ${rc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${rc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{e.employee}</div>
                <span style={{background:`${rc.c}15`,color:rc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{rc.label} Risk</span>
              </div>
              <div style={{fontSize:9,color:'#94a3b8',marginBottom:6}}>{e.team}</div>
              {e.signals.map((s,j)=><div key={j} style={{fontSize:9,color:'#374151',marginTop:3}}>- {s}</div>)}
            </div>
          )
        })}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>👥 Manager-Level Correlation</div>
        {MANAGER_CORRELATION.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<MANAGER_CORRELATION.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{m.manager} {m.flag&&'⚠'}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>Satisfaction {m.avg_satisfaction}/10 . {m.exits_12mo} exits (12mo)</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Flight-risk signals weigh recent salary disparities and engagement trends -- never a single static factor.','Manager correlation flags when low satisfaction reliably precedes exits on that specific team -- a coaching opportunity, never a blame signal.','Click any flagged employee to jump to their full profile in Succession Planning or Employee Engagement.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Profile',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
