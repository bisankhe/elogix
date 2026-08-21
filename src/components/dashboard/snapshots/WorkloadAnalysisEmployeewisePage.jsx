// FILE: WorkloadAnalysisEmployeewisePage.jsx - Workload Analysis (Employeewise)
// (Performance & Talent > Work & Performance)
// AI Burnout Radar gauge, capacity meter (planned vs actual hours), task
// allocation matrix, time-away summary. Aggregated from daily_attendance_records.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const EMPLOYEE_WORKLOAD = [
  { id:'w1', employee:'Bikash Rai', dept:'IT', planned_hrs:48, actual_hrs:58, utilization_pct:121,
    overtime_hrs:10, vacation_hrs_used:0, sick_hrs_used:0, burnout_risk:'high',
    tasks_assigned:14, tasks_completed:9, impact_links:['Overtime Calculation','Wellbeing Program'] },
  { id:'w2', employee:'Maya Pradhan', dept:'Finance', planned_hrs:48, actual_hrs:46, utilization_pct:96,
    overtime_hrs:0, vacation_hrs_used:8, sick_hrs_used:0, burnout_risk:'low',
    tasks_assigned:9, tasks_completed:9, impact_links:[] },
  { id:'w3', employee:'Ramesh KC', dept:'Sales', planned_hrs:48, actual_hrs:28, utilization_pct:58,
    overtime_hrs:0, vacation_hrs_used:0, sick_hrs_used:16, burnout_risk:'low',
    tasks_assigned:6, tasks_completed:3, impact_links:['Leave Balance'] },
]

const BURNOUT_CFG = {low:{c:'#10b981',bg:'#f0fdf4',label:'Low Risk'},medium:{c:'#f59e0b',bg:'#fffbeb',label:'Watch'},high:{c:'#ef4444',bg:'#fef2f2',label:'High Risk'}}

export default function WorkloadAnalysisEmployeewisePage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = EMPLOYEE_WORKLOAD.filter(w=>!search||w.employee.toLowerCase().includes(search.toLowerCase()))
  const highRiskCount = EMPLOYEE_WORKLOAD.filter(w=>w.burnout_risk==='high').length
  const avgUtilization = Math.round(EMPLOYEE_WORKLOAD.reduce((s,w)=>s+w.utilization_pct,0)/EMPLOYEE_WORKLOAD.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="👤" title="Workload Analysis - Employeewise"
        breadcrumb="Performance & Talent Management > Work & Performance > Workload Analysis"
        gradient={G}
        stats={[
          {icon:'👥',label:'Employees Tracked',  value:EMPLOYEE_WORKLOAD.length},
          {icon:'📊',label:'Avg Utilization',     value:avgUtilization+'%'},
          {icon:'🔴',label:'High Burnout Risk',   value:highRiskCount},
          {icon:'⏱',label:'OT This Week',        value:EMPLOYEE_WORKLOAD.reduce((s,w)=>s+w.overtime_hrs,0)+'h'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div style={{flex:1,minWidth:200}}><strong>Predictive, Not Punitive:</strong> AI evaluates hours logged, overtime patterns, and time-off usage to flag burnout risk before it escalates - a coaching signal for managers, never an automatic penalty. Per Nepal LA2074, standard hours are capped at 8/day, 48/week; OT at 4hr/day, 24hr/week, 1.5× pay.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(w=>{
          const bc = BURNOUT_CFG[w.burnout_risk]
          const capacityPct = Math.min(w.utilization_pct,150)
          return (
            <div key={w.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:w.employee,...w}})}}
              style={{background:'#fff',border:`1.5px solid ${bc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${bc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:12}}>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{w.employee}</span>
                    <span style={{background:bc.bg,color:bc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>🎯 {bc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{w.dept}</div>
                </div>

                {/* AI Burnout Radar gauge */}
                <div style={{position:'relative',width:64,height:64,flexShrink:0}}>
                  <svg width="64" height="64" style={{transform:'rotate(-90deg)'}}>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#f1f5f9" strokeWidth="7"/>
                    <circle cx="32" cy="32" r="26" fill="none" stroke={bc.c} strokeWidth="7"
                      strokeDasharray={2*Math.PI*26} strokeDashoffset={2*Math.PI*26*(1-capacityPct/150)} strokeLinecap="round"/>
                  </svg>
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:bc.c}}>{w.utilization_pct}%</div>
                </div>
              </div>

              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[{l:'Planned Hrs',v:w.planned_hrs+'h',c:'#3b82f6'},{l:'Actual Hrs',v:w.actual_hrs+'h',c:'#0f172a'},
                  {l:'Overtime',v:w.overtime_hrs+'h',c:w.overtime_hrs>0?'#ef4444':'#94a3b8'},{l:'Tasks',v:`${w.tasks_completed}/${w.tasks_assigned}`,c:'#10b981'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Time-away summary */}
              <div style={{padding:'8px 18px',display:'flex',gap:14,fontSize:9,color:'#64748b'}}>
                <span>🏖 Vacation: {w.vacation_hrs_used}h</span>
                <span>🤒 Sick: {w.sick_hrs_used}h</span>
              </div>

              <div style={{padding:'10px 18px',background:bc.bg,fontSize:10,color:bc.c}}>{w.burnout_note}</div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Task Breakdown',key:'view'},{icon:'💬',label:'Schedule Wellbeing Check-In',key:'checkin'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
