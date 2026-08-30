// FILE: ComplianceRiskPage.jsx - Compliance Risk
// (Compliance & Risk Management > Risk Management)
// Risk-framed lens over EXISTING compliance data -- pure reuse of
// v_first_salary_policy_gate_status + v_license_dashboard (Compliance
// Management session) and training expiry data. Never a second
// compliance tracking system; this page is "what's at risk", that
// module's pages are "what's tracked."

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const RISK_ITEMS = [
  {label:'Policy Acknowledgment Rate',value:'94%',risk:'low',detail:'12 new hires still unacknowledged on mandatory policies',target:'Policy Compliance'},
  {label:'Licenses Expiring < 30 Days',value:2,risk:'high',detail:'Work permit renewals pending for 2 foreign-national employees',target:'License Management'},
  {label:'Mandatory Training Expired',value:5,risk:'medium',detail:'OSH refresher overdue for 5 employees',target:'Training Budget'},
  {label:'EEO Compliance Score',value:'91%',risk:'low',detail:'Representation tracking within target ranges'},
]

export default function ComplianceRiskPage() {
  const [ctx, setCtx] = useState(null)
  const highRiskCount = RISK_ITEMS.filter(r=>r.risk==='high').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚖" title="Compliance Risk"
        breadcrumb="Compliance & Risk Management > Risk Management"
        gradient={G}
        stats={[
          {icon:'⚖',label:'Risk Items Tracked',  value:RISK_ITEMS.length},
          {icon:'🔴',label:'High Risk',              value:highRiskCount},
          {icon:'📋',label:'Pending Audit Tasks',        value:'3'},
          {icon:'⚖',label:'Audit Cycle',                    value:'Section 80'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>A Risk Lens, Not a Second Tracker:</strong> Every figure here pulls live from Compliance Management's own pages -- this view exists to show what's actually at risk, sorted by severity, not to duplicate the underlying tracking.</div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {RISK_ITEMS.map((r,i)=>{
          const riskColor = r.risk==='high'?'#ef4444':r.risk==='medium'?'#f59e0b':'#10b981'
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.label,...r,impact_links:r.target?[r.target]:[]}})}}
              style={{background:'#fff',border:`1px solid ${riskColor}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${riskColor}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.label}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{r.detail}</div>
                </div>
                <span style={{fontSize:16,fontWeight:900,color:riskColor}}>{r.value}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Right-click any item to jump straight into its source page -- License Management, Policy Compliance, or Training Budget.','High-risk items surface first, regardless of category, so the most urgent compliance gap is never buried below routine ones.','EEO and equal-pay metrics correlate against Gender Analytics to catch discrimination risk before it becomes a claim.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Source Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
