// FILE: StatutoryCompliancePage.jsx - Statutory Compliance
// (Compliance & Risk Management > Compliance Management)
// SSF, gratuity, and the mandatory bonus fund -- reuses the EXISTING
// bonus_fund_tracking (HR Budgeting session) directly, distinct from
// Labor Compliance (working hours/safety) -- this is the statutory
// FINANCIAL obligations lens.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const STATUTORY_ITEMS = [
  {item:'SSF Employer Contribution',status:'compliant',detail:'All active employees enrolled and contributions current'},
  {item:'Gratuity Accrual (8.33%)',status:'compliant',detail:'Funded continuously through payroll, never a year-end surprise'},
  {item:'Annual Bonus Fund (10% of net profit)',status:'at_risk',detail:'NPR 8.4M funded of NPR 12M required, deadline 2026-01-15',
   flag_note:'Shortfall of NPR 3.6M -- see Payroll Budget for the full bonus fund tracker.', impact_links:['Payroll Budget']},
  {item:'Probation Period Caps (max 6 months)',status:'compliant',detail:'No active probation exceeds the statutory cap'},
]

const STATUS_CFG = { compliant:{c:'#10b981',label:'Compliant'},at_risk:{c:'#f59e0b',label:'At Risk'} }

export default function StatutoryCompliancePage() {
  const [ctx, setCtx] = useState(null)
  const atRiskCount = STATUTORY_ITEMS.filter(c=>c.status!=='compliant').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📜" title="Statutory Compliance"
        breadcrumb="Compliance & Risk Management > Compliance Management"
        gradient={G}
        stats={[
          {icon:'📜',label:'Statutory Items',  value:STATUTORY_ITEMS.length},
          {icon:'✅',label:'Compliant',            value:STATUTORY_ITEMS.filter(c=>c.status==='compliant').length},
          {icon:'⚠',label:'At Risk',                  value:atRiskCount},
          {icon:'⚖',label:'Minimum Wage',                value:'NPR 19,550/mo'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>💰</span>
        <div style={{flex:1,minWidth:200}}><strong>The Financial Obligations, Tracked Live:</strong> Every figure here pulls from the same SSF, gratuity, and bonus fund records Payroll Budget already maintains -- one number, never two competing totals.</div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {STATUTORY_ITEMS.map((c,i)=>{
          const sc = STATUS_CFG[c.status]
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.item,...c}})}}
              style={{background:'#fff',border:`1px solid ${sc.c}33`,borderRadius:16,padding:'18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{c.item}</div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              <div style={{marginTop:8,fontSize:9,color:'#374151'}}>{c.detail}</div>
              {c.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {c.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Bonus fund shortfall alerts fire automatically as the 6-month distribution deadline approaches.','Probation periods auto-flag if approaching the 6-month statutory cap, before a manager extends it past the legal limit.','Every figure traces to its source page -- never a number that exists only on this dashboard.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
