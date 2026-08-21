// FILE: LaborCompliancePage.jsx - Labor Compliance
// (Compliance & Risk Management > Compliance Management)
// Aggregates working-hours/overtime risk (daily_attendance_records),
// the Safety Committee inspection cadence (EXISTING
// safety_committee_inspections, Admin Operations session), and
// minimum-wage floor checks -- a unified compliance lens, never a
// duplicate of the operational tables underneath it.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const COMPLIANCE_CHECKS = [
  {check:'Working Hours Cap (8h/day, 48h/week)',status:'compliant',detail:'0 employees exceeding the weekly ceiling this cycle'},
  {check:'Overtime Cap (4h/day, 24h/week, 1.5x pay)',status:'at_risk',detail:'3 employees within 2h of the weekly OT ceiling',
   flag_note:'Review scheduling for the affected team before next cycle.'},
  {check:'Minimum Wage Floor (NPR 19,550/month)',status:'compliant',detail:'All active employees at or above the statutory minimum'},
  {check:'Safety & Health Committee (Section 74, 20+ workers)',status:'compliant',detail:'Last inspection 2025-06-10, next due 2025-09-10'},
]

const STATUS_CFG = { compliant:{c:'#10b981',label:'Compliant'},at_risk:{c:'#f59e0b',label:'At Risk'},violation:{c:'#ef4444',label:'Violation'} }

export default function LaborCompliancePage() {
  const [ctx, setCtx] = useState(null)
  const atRiskCount = COMPLIANCE_CHECKS.filter(c=>c.status!=='compliant').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚖" title="Labor Compliance"
        breadcrumb="Compliance & Risk Management > Compliance Management"
        gradient={G}
        stats={[
          {icon:'⚖',label:'Checks Tracked',  value:COMPLIANCE_CHECKS.length},
          {icon:'✅',label:'Compliant',          value:COMPLIANCE_CHECKS.filter(c=>c.status==='compliant').length},
          {icon:'⚠',label:'At Risk',                value:atRiskCount},
          {icon:'📐',label:'Health Score',              value:atRiskCount===0?'100%':'88%'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div style={{flex:1,minWidth:200}}><strong>Continuous, Not Annual:</strong> Every check here pulls live from the same attendance, payroll, and facility data already tracked elsewhere in the system -- never a separate annual scramble to assemble evidence.</div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {COMPLIANCE_CHECKS.map((c,i)=>{
          const sc = STATUS_CFG[c.status]
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.check,...c,impact_links:['Team Attendance','Facility Management']}})}}
              style={{background:'#fff',border:`1px solid ${sc.c}33`,borderRadius:16,padding:'18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{c.check}</div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              <div style={{marginTop:8,fontSize:9,color:'#374151'}}>{c.detail}</div>
              {c.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {c.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI scans attendance records continuously, flagging overtime risk days before the statutory cap is breached, not after.','Misclassification risk (contractor vs. employee) flags automatically when a worker\'s pattern resembles an employee relationship.','Each check links straight to the source page for the underlying evidence.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
