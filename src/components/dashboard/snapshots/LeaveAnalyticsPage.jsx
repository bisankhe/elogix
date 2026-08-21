// FILE: LeaveAnalyticsPage.jsx - Leave Analytics (Leave Reports)
// Predictive workforce-health dashboard: Bradford Factor, PTO-hoarding vs
// burnout-risk dual flags, seasonal absence forecast, cost-of-absenteeism.
// Responsive grid collapses to 1-column stacked cards on mobile.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const DEPT_TRENDS = [
  {dept:'Customer Service',absenteeism_pct:8.2,bradford_avg:42,seasonal_spike:'Dashain/Tihar (Oct)',risk:'high'},
  {dept:'Sales & Marketing',absenteeism_pct:5.1,bradford_avg:22,seasonal_spike:'Fiscal year-end (mid-July)',risk:'medium'},
  {dept:'Information Technology',absenteeism_pct:2.4,bradford_avg:8,seasonal_spike:'None significant',risk:'low'},
]

const BURNOUT_PTO_FLAGS = [
  {employee:'Hari Thapa',pattern:'PTO Hoarding',balance:88,note:'88 days banked, only 2 used in 12 months - approaching the 90-day cap with no rest taken.',risk:'high'},
  {employee:'Sunil Magar',pattern:'Frequent Short Absences',occurrences:6,note:'6 separate 1-day sick absences in 90 days - classic Bradford Factor burnout signature, not random.',risk:'high'},
  {employee:'Priya Shah',pattern:'No Consecutive Days Off',note:'Never taken more than 1 day at a time in 18 months - flagged for a wellbeing check-in.',risk:'medium'},
]

const COST_IMPACT = { unscheduled_absence_cost_npr: 142000, ot_coverage_cost_npr: 68000, lost_productivity_days: 24 }

const RISK_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'},low:{c:'#10b981',bg:'#f0fdf4'}}

export default function LeaveAnalyticsPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const avgBradford = Math.round(DEPT_TRENDS.reduce((s,d)=>s+d.bradford_avg,0)/DEPT_TRENDS.length)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Leave Analytics"
        breadcrumb="Workforce Operations > Leave Management > Leave Reports"
        gradient={G}
        stats={[
          {icon:'📊',label:'Avg Bradford Factor', value:avgBradford},
          {icon:'💰',label:'Absenteeism Cost',     value:'NPR '+(COST_IMPACT.unscheduled_absence_cost_npr/1000).toFixed(0)+'K'},
          {icon:'⚠',label:'Burnout/PTO Flags',    value:BURNOUT_PTO_FLAGS.length},
          {icon:'📅',label:'Lost Productivity',    value:COST_IMPACT.lost_productivity_days+'d'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div style={{flex:1,minWidth:200}}><strong>Predictive, Not Punitive:</strong> Bradford Factor (S² × D) weights frequent short absences over one long one - used here to spot burnout and disengagement, never to auto-penalize. PTO-hoarding is flagged with equal concern: unused leave is a financial liability AND a wellbeing risk.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search departments..."/>

      {/* Department trend cards - responsive: 3-col desktop, 1-col mobile via auto-fill */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14,marginTop:14,marginBottom:18}}>
        {DEPT_TRENDS.filter(d=>!search||d.dept.toLowerCase().includes(search.toLowerCase())).map((d,i)=>{
          const rc = RISK_CFG[d.risk]
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,impact_links:['Attendance Analytics','Leave Calendar']}})}}
              style={{background:rc.bg,border:`2px solid ${rc.c}33`,borderRadius:14,padding:'16px 14px'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>{d.dept}</div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:6}}>
                <span style={{color:'#64748b'}}>Absenteeism</span><span style={{fontWeight:700,color:rc.c}}>{d.absenteeism_pct}%</span>
              </div>
              <div style={{height:6,background:'#fff',borderRadius:6,overflow:'hidden',marginBottom:10}}>
                <div style={{width:`${Math.min(d.bradford_avg,100)}%`,height:'100%',background:rc.c,borderRadius:6}}/>
              </div>
              <div style={{fontSize:9,color:'#94a3b8'}}>Bradford: {d.bradford_avg} . Seasonal spike: {d.seasonal_spike}</div>
            </div>
          )
        })}
      </div>

      {/* Burnout & PTO flags */}
      <div style={{background:'#fff',border:'1px solid #fecaca',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#991b1b',marginBottom:12}}>🚨 Burnout & PTO-Hoarding Flags</div>
        {BURNOUT_PTO_FLAGS.map((b,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.employee,impact_links:['Wellbeing Program','Leave Balance']}})}}
            style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:i<BURNOUT_PTO_FLAGS.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap'}}>
            <span style={{background:RISK_CFG[b.risk].bg,color:RISK_CFG[b.risk].c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20,flexShrink:0}}>{b.risk}</span>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{b.employee} <span style={{color:'#7c3aed',fontWeight:600}}>. {b.pattern}</span></div>
              <div style={{fontSize:10,color:'#64748b'}}>{b.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost impact */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
        {[{l:'Unscheduled Absence Cost',v:'NPR '+COST_IMPACT.unscheduled_absence_cost_npr.toLocaleString(),c:'#ef4444'},
          {l:'OT Coverage Cost',v:'NPR '+COST_IMPACT.ot_coverage_cost_npr.toLocaleString(),c:'#f59e0b'},
          {l:'Lost Productivity Days',v:COST_IMPACT.lost_productivity_days+' days',c:'#7c3aed'}].map((s,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 16px'}}>
            <div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>{s.l}</div>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'🔍',label:'Drill Into Detail',key:'drill'},{icon:'💬',label:'Schedule Check-In',key:'checkin'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},{icon:'📤',label:'Export',key:'export'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
