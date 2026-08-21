// FILE: TaxCompliancePage.jsx - Tax & Compliance (Payroll Processing)
// Real-time anomaly alerts (expiring PAN, missing docs), multi-jurisdiction
// TDS filing tracker (25th-of-month IRD deadline), audit-ready trail.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const COMPLIANCE_ALERTS = [
  { id:'ca1', employee:'Ramesh KC', issue:'PAN Number Missing', severity:'high', detail:'Cannot process payroll without a valid PAN per IRD requirements.', impact_links:['Tax Setup'] },
  { id:'ca2', employee:'Sita Tamang', issue:'Work Permit Expiring in 12 Days', severity:'high', detail:'Foreign-national work permit renewal required before next pay cycle.', impact_links:['Letters - Labour Department'] },
  { id:'ca3', employee:'Hari Thapa', issue:'SSF Enrollment Pending', severity:'medium', detail:'Approaching the 3-month statutory enrollment deadline.', impact_links:['Letters - SSF'] },
]

const FILING_TRACKER = [
  { filing:'TDS Deposit - June 2025', authority:'Inland Revenue Department', due_date:'2025-07-25', status:'pending', days_left:34 },
  { filing:'SSF Contribution - June 2025', authority:'Social Security Fund', due_date:'2025-07-15', status:'pending', days_left:24 },
  { filing:'Annual Labour Audit FY 2024/25', authority:'Local Labour Office', due_date:'2026-01-13', status:'upcoming', days_left:206 },
]

const SEVERITY_CFG = {high:{c:'#ef4444',bg:'#fef2f2'},medium:{c:'#f59e0b',bg:'#fffbeb'}}

export default function TaxCompliancePage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = COMPLIANCE_ALERTS.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase()))
  const highSeverity = COMPLIANCE_ALERTS.filter(c=>c.severity==='high').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚖" title="Tax & Compliance"
        breadcrumb="Workforce Operations > Payroll & Compensation > Payroll Processing"
        gradient={G}
        stats={[
          {icon:'⚠',label:'Active Alerts',     value:COMPLIANCE_ALERTS.length},
          {icon:'🚨',label:'High Severity',     value:highSeverity},
          {icon:'📅',label:'Upcoming Filings',  value:FILING_TRACKER.length},
          {icon:'⚖',label:'Jurisdiction',      value:'Nepal'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🤖</span>
        <div style={{flex:1,minWidth:200}}><strong>Real-Time Compliance Alerts:</strong> System flags issues (missing PAN, expiring documents, SSF deadlines) BEFORE paychecks process - never discovered after the fact. TDS must be deposited to IRD by the 25th of the following month.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:10,marginTop:14,marginBottom:18}}>
        {filtered.map(c=>{
          const sc = SEVERITY_CFG[c.severity]
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',gap:14,alignItems:'flex-start'}}>
              <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20,flexShrink:0}}>{c.severity}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.employee} - {c.issue}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{c.detail}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filing tracker */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px'}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 Statutory Filing Tracker</div>
        {FILING_TRACKER.map((f,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<FILING_TRACKER.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{f.filing}</div>
              <div style={{fontSize:9,color:'#94a3b8'}}>{f.authority} . Due {f.due_date}</div>
            </div>
            <span style={{background:f.days_left<=15?'#fef2f2':'#f0fdf4',color:f.days_left<=15?'#dc2626':'#15803d',fontSize:9,fontWeight:700,padding:'2px 10px',borderRadius:20,flexShrink:0}}>{f.days_left}d left</span>
          </div>
        ))}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Detail',key:'view'},{icon:'🔧',label:'Resolve',key:'resolve'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
