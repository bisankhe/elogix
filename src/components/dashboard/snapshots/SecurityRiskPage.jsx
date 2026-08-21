// FILE: SecurityRiskPage.jsx - Security Risk
// (Compliance & Risk Management > Risk Management)
// MFA compliance, RBAC audit, data-access logs -- genuinely new, no
// MFA/login-audit infrastructure existed anywhere in the build. Also
// covers OHS workplace-safety risk per the brief's legal mapping
// (Section 74 Safety Committee, stop-work orders) -- a second,
// physical-security dimension this category legitimately spans.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const ACCESS_RISKS = [
  {label:'MFA Adoption Rate',value:'76%',risk:'medium',detail:'24% of admin-level accounts have not enabled MFA'},
  {label:'Stale Admin Sessions',value:3,risk:'high',detail:'3 super_admin accounts with no login in 90+ days -- still active'},
  {label:'Unusual Access Pattern',value:1,risk:'high',detail:'Payroll data accessed from a new device/location outside business hours',employee:'Finance Admin'},
]

const PHYSICAL_SAFETY = [
  {label:'OSH Safety Committee Status',value:'Active',risk:'low'},
  {label:'Open Stop-Work Risk Flags',value:0,risk:'low'},
  {label:'Night-Shift Transport Compliance',value:'100%',risk:'low'},
]

export default function SecurityRiskPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = ACCESS_RISKS.filter(r=>!search||r.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔐" title="Security Risk"
        breadcrumb="Compliance & Risk Management > Risk Management"
        gradient={G}
        stats={[
          {icon:'🔐',label:'MFA Adoption',  value:'76%'},
          {icon:'🔴',label:'High Severity',    value:ACCESS_RISKS.filter(r=>r.risk==='high').length},
          {icon:'🏗',label:'OSH Status',           value:'Compliant'},
          {icon:'📋',label:'Audit Trail',              value:'Tamper-Proof'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔐</span>
        <div style={{flex:1,minWidth:200}}><strong>Two Kinds of Security:</strong> Data access risk (MFA, stale sessions, unusual login patterns) and physical workplace safety risk (OSH committee cadence, stop-work triggers) -- both genuinely fall under this category, tracked together.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search access risks..."/>

      <div style={{display:'grid',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map((r,i)=>{
          const riskColor = r.risk==='high'?'#ef4444':r.risk==='medium'?'#f59e0b':'#10b981'
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.label,...r,impact_links:['Facility Management']}})}}
              style={{background:'#fff',border:`1px solid ${riskColor}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${riskColor}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.label}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{r.detail}{r.employee&&` . ${r.employee}`}</div>
                </div>
                <span style={{fontSize:16,fontWeight:900,color:riskColor}}>{r.value}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🏗 Physical Workplace Safety</div>
        {PHYSICAL_SAFETY.map((p,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<PHYSICAL_SAFETY.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{p.label}</span>
            <span style={{fontSize:10,fontWeight:700,color:'#15803d'}}>{p.value}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Unusual access patterns flag in real time -- payroll or PII access outside normal hours or location triggers immediate review, never discovered weeks later.','Stale admin accounts with elevated access auto-flag for deactivation review, closing a real insider-threat gap.','OSH metrics sync live with Facility Management -- never a separately maintained safety log.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
