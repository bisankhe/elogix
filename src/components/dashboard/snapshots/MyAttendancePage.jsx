// FILE: MyAttendancePage.jsx - My Attendance
// (HR Services & Support > Employee Self Service)
// ESS-facing calendar view, pure UI over the EXISTING
// daily_attendance_records (Daily Attendance session) -- never a
// second attendance table. Color-coded present/absent/late/overtime.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const STATUS_CFG = {
  present:{c:'#10b981',label:'Present'},late:{c:'#f59e0b',label:'Late'},absent:{c:'#ef4444',label:'Absent'},
  missed_checkout:{c:'#7c3aed',label:'Missed Checkout'},weekend:{c:'#cbd5e1',label:'Weekend'},
}

const CALENDAR_DAYS = [
  {day:1,status:'present',hours:8.5},{day:2,status:'present',hours:8.0},{day:3,status:'weekend',hours:0},
  {day:4,status:'weekend',hours:0},{day:5,status:'late',hours:7.5},{day:6,status:'present',hours:8.0},
  {day:7,status:'present',hours:9.2,overtime:1.2},{day:8,status:'missed_checkout',hours:null},
  {day:9,status:'present',hours:8.0},{day:10,status:'weekend',hours:0},
]

const SUMMARY = { present_days:7, late_days:1, absent_days:0, total_hours:65.2, overtime_hours:1.2 }

export default function MyAttendancePage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="My Attendance"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'✅',label:'Present Days',  value:SUMMARY.present_days},
          {icon:'⏱',label:'Total Hours',      value:SUMMARY.total_hours},
          {icon:'⚡',label:'Overtime',           value:SUMMARY.overtime_hours+'h'},
          {icon:'⚠',label:'Late/Missing',          value:SUMMARY.late_days},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📡</span>
        <div style={{flex:1,minWidth:200}}><strong>Synced Live, Never Manual:</strong> This calendar reflects the exact same attendance record HR and payroll see -- biometric, GPS, and web punches, all in sync the moment they're captured.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📅 This Month</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(70px,1fr))',gap:8}}>
          {CALENDAR_DAYS.map(d=>{
            const sc = STATUS_CFG[d.status]
            return (
              <div key={d.day}
                onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:`Day ${d.day}`,...d,impact_links:['Attendance Request']}})}}
                style={{background:`${sc.c}15`,borderRadius:10,padding:'10px 6px',textAlign:'center',border:`1px solid ${sc.c}33`}}>
                <div style={{fontSize:12,fontWeight:800,color:sc.c}}>{d.day}</div>
                <div style={{fontSize:7,color:sc.c,marginTop:2}}>{sc.label}</div>
                {d.hours!=null&&<div style={{fontSize:7,color:'#94a3b8',marginTop:2}}>{d.hours}h</div>}
                {d.overtime&&<div style={{fontSize:7,color:'#7c3aed',fontWeight:700}}>+{d.overtime}h OT</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Missed checkouts auto-suggest filing an Attendance Request the same day -- before it\'s forgotten.','Overtime hours calculated against the 4-hour daily statutory cap automatically.','Tap any day with an issue to jump straight into a pre-filled correction request.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'📝',label:'Request Correction',key:'correction'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
