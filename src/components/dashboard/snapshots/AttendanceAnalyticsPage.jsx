// FILE: AttendanceAnalyticsPage.jsx - Attendance Analytics (Attendance Management)
// Behavioral-trend dashboard: Bradford Factor absenteeism score, OT-cost-vs-
// productivity correlation, branch-level anomaly detection, drill-down by dept.

import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const DEPT_METRICS = [
  {dept:'Customer Service',absenteeism_pct:8.2,avg_ot_hrs:14.2,tardiness_count:18,bradford_avg:42,risk:'high'},
  {dept:'Sales & Marketing',absenteeism_pct:5.1,avg_ot_hrs:9.8,tardiness_count:9,bradford_avg:22,risk:'medium'},
  {dept:'Information Technology',absenteeism_pct:2.4,avg_ot_hrs:6.4,tardiness_count:4,bradford_avg:8,risk:'low'},
  {dept:'Finance & Accounts',absenteeism_pct:1.8,avg_ot_hrs:2.2,tardiness_count:2,bradford_avg:4,risk:'low'},
]

const ANOMALIES = [
  {branch:'KTM HQ - Main Entrance',detail:'12 clock-ins logged within 90 seconds of each other at 9:00 AM sharp - pattern consistent with buddy-punching, not organic arrival.',severity:'high'},
  {branch:'Pokhara Branch',detail:'Average clock-in time drifted 14 minutes later over the past 3 weeks - possible commute/shift-timing mismatch worth reviewing.',severity:'medium'},
]

const RISK_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'},low:{c:'#10b981',bg:'#f0fdf4'}}

export default function AttendanceAnalyticsPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const avgBradford = Math.round(DEPT_METRICS.reduce((s,d)=>s+d.bradford_avg,0)/DEPT_METRICS.length)
  const totalOTHours = DEPT_METRICS.reduce((s,d)=>s+d.avg_ot_hrs,0)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📊" title="Attendance Analytics"
        breadcrumb="Workforce Operations > Attendance Management"
        gradient={G}
        stats={[
          {icon:'📊',label:'Avg Bradford Factor', value:avgBradford},
          {icon:'⏱',label:'Total Avg OT Hrs',     value:totalOTHours.toFixed(1)},
          {icon:'🚨',label:'Anomalies Detected',  value:ANOMALIES.length},
          {icon:'🏢',label:'Departments Tracked',  value:DEPT_METRICS.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>📈</span>
        <div><strong>Bradford Factor:</strong> S² × D (S=spells of absence, D=total days absent) - weights frequent short absences higher than one long absence. Used here to spot burnout/disengagement patterns, not for automatic penalty. Cross-referenced with OT trends to find cost-vs-coverage drivers.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search departments..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginTop:14,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔥 Department Risk Drill-Down</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {DEPT_METRICS.filter(d=>!search||d.dept.toLowerCase().includes(search.toLowerCase())).map((d,i)=>{
            const rc = RISK_CFG[d.risk]
            return (
              <div key={i}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:d.dept,impact_links:['Overtime & Monitoring','Late & Early Tracking']}})}}
                style={{background:rc.bg,border:`2px solid ${rc.c}33`,borderRadius:12,padding:'14px 12px',cursor:'pointer'}}>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:8}}>{d.dept}</div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:4}}>
                  <span style={{color:'#64748b'}}>Absenteeism</span><span style={{fontWeight:700,color:rc.c}}>{d.absenteeism_pct}%</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:4}}>
                  <span style={{color:'#64748b'}}>Avg OT/wk</span><span style={{fontWeight:700,color:rc.c}}>{d.avg_ot_hrs}h</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,marginBottom:4}}>
                  <span style={{color:'#64748b'}}>Tardiness</span><span style={{fontWeight:700,color:rc.c}}>{d.tardiness_count}x</span>
                </div>
                <div style={{height:5,background:'#fff',borderRadius:5,overflow:'hidden',marginTop:8}}>
                  <div style={{width:`${Math.min(d.bradford_avg,100)}%`,height:'100%',background:rc.c,borderRadius:5}}/>
                </div>
                <div style={{fontSize:8,color:'#94a3b8',marginTop:3,textAlign:'center'}}>Bradford Score: {d.bradford_avg}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #fecaca',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#991b1b',marginBottom:12}}>🚨 AI Anomaly Detection</div>
        {ANOMALIES.map((a,i)=>(
          <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:i<ANOMALIES.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{background:a.severity==='high'?'#fef2f2':'#fffbeb',color:a.severity==='high'?'#dc2626':'#b45309',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20,flexShrink:0}}>{a.severity}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{a.branch}</div>
              <div style={{fontSize:10,color:'#64748b'}}>{a.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'🔍',label:'Drill Into Department',key:'drill'},{icon:'📤',label:'Export Report',key:'export'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
