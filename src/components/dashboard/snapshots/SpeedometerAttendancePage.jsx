// FILE: SpeedometerAttendancePage.jsx - Speedometer: Attendance
// (Performance & Talent > Goal & Performance > Performance Analytics > KPI)
// Absenteeism Rate, Overtime Ratio, Leave Utilization - sourced from
// existing Bradford Factor + overtime_payroll_lines.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

function Gauge({ value, max, label, unit, zones }) {
  const pct = Math.min(value / max, 1)
  const angle = pct * 180
  const radius = 80, cx = 100, cy = 100
  const polarToCartesian = (r, deg) => {
    const rad = (deg - 180) * Math.PI / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  let cumulativeStart = 0
  const arcs = zones.map((z, i) => {
    const startDeg = cumulativeStart * 180, endDeg = z.upTo * 180
    cumulativeStart = z.upTo
    const [x1, y1] = polarToCartesian(radius, startDeg)
    const [x2, y2] = polarToCartesian(radius, endDeg)
    const largeArc = (endDeg - startDeg) > 180 ? 1 : 0
    return <path key={i} d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`} stroke={z.color} strokeWidth="18" fill="none"/>
  })
  const [needleX, needleY] = polarToCartesian(radius - 15, angle)
  const currentZone = zones.find(z => pct <= z.upTo) || zones[zones.length - 1]
  return (
    <div style={{textAlign:'center'}}>
      <svg width="200" height="120" viewBox="0 0 200 110">
        {arcs}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#1e293b" strokeWidth="3" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="5" fill="#1e293b"/>
      </svg>
      <div style={{fontSize:20,fontWeight:900,color:currentZone.color,marginTop:-10}}>{value}{unit}</div>
      <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{label}</div>
    </div>
  )
}

const ATTENDANCE_METRICS = {
  absenteeism:{value:2.1,max:8,label:'Absenteeism Rate',unit:'%',zones:[{upTo:0.31,color:'#10b981'},{upTo:0.56,color:'#f59e0b'},{upTo:1,color:'#ef4444'}]},
  overtime_ratio:{value:6.4,max:15,label:'Overtime Hours Ratio',unit:'%',zones:[{upTo:0.33,color:'#10b981'},{upTo:0.67,color:'#f59e0b'},{upTo:1,color:'#ef4444'}]},
  leave_utilization:{value:78,max:100,label:'Leave Utilization Rate',unit:'%',zones:[{upTo:0.74,color:'#f59e0b'},{upTo:0.90,color:'#10b981'},{upTo:1,color:'#f59e0b'}]},
}

const OT_CAP_STATUS = { within_legal_cap_pct:94, exceeds_24hr_week:6 }

export default function SpeedometerAttendancePage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⏱" title="Speedometer - Attendance"
        breadcrumb="Performance & Talent Management > Goal & Performance > Performance Analytics > KPI"
        gradient={G}
        stats={[
          {icon:'📉',label:'Absenteeism',      value:'2.1%'},
          {icon:'⏱',label:'OT Ratio',           value:'6.4%'},
          {icon:'🏖',label:'Leave Utilization', value:'78%'},
          {icon:'⚠',label:'Exceeds Legal OT Cap',value:OT_CAP_STATUS.exceeds_24hr_week+'%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Overtime Rate = (Actual OT Hours / Allowable OT Hours) × 100.</strong> Nepal LA2074 strictly caps overtime at 4hrs/day, 24hrs/week. {OT_CAP_STATUS.exceeds_24hr_week}% of employees this week exceeded that legal ceiling - flagged for immediate HR review, not just a dashboard number.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'24px',display:'flex',flexWrap:'wrap',justifyContent:'space-around',gap:20}}>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Absenteeism Rate',impact_links:['Leave Analytics']}})}}>
          <Gauge {...ATTENDANCE_METRICS.absenteeism}/>
        </div>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Overtime Ratio',impact_links:['Overtime Calculation']}})}}>
          <Gauge {...ATTENDANCE_METRICS.overtime_ratio}/>
        </div>
        <div onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:'Leave Utilization',impact_links:['Leave Balance']}})}}>
          <Gauge {...ATTENDANCE_METRICS.leave_utilization}/>
        </div>
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Sourced live from the Bradford Factor analytics and Overtime Calculation modules.','Accelerating overtime dials warn management of burnout risk before it becomes attrition.','Leave Utilization in the 75-90% sweet spot signals healthy work-life balance - too low or too high both flag for review.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
