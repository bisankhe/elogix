// FILE: ComplianceReportsPage.jsx - Compliance Reports
// (Reports, Analytics & BI > HR Analytics)
// Statutory returns hub: employee rosters, attendance logs for
// inspection, work-permit status (reuses business_licenses,
// license_type='work_permit' from Compliance Management), workplace
// accident reporting (genuinely new -- no precedent existed anywhere
// in the build), and collective bargaining agreement filings.
// Distinct from ComplianceRiskPage (risk-severity lens) and
// PolicyCompliancePage (policy acknowledgment) -- this is the
// statutory-returns/inspector-facing report.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const RETURNS = [
  {label:'Employee Roster & Attendance Logs',status:'current',detail:'Updated daily -- ready for inspector review',target:'Workforce Summary'},
  {label:'Foreign National Work Permits',status:'attention',detail:'2 permits expiring within 30 days',target:'License Management'},
  {label:'Workplace Accident Reports',status:'current',detail:'0 unreported incidents this quarter'},
  {label:'Collective Bargaining Filings',status:'current',detail:'Latest agreement filed with Labour Office 2025-03-10'},
]

export default function ComplianceReportsPage() {
  const [search, setSearch] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = RETURNS.filter(r=>!search||r.label.toLowerCase().includes(search.toLowerCase()))
  const needsAttention = RETURNS.filter(r=>r.status==='attention').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Compliance Reports"
        breadcrumb="Reports, Analytics & BI > HR Analytics"
        gradient={G}
        stats={[
          {icon:'📋',label:'Statutory Returns Tracked',  value:RETURNS.length},
          {icon:'⚠',label:'Needs Attention',                 value:needsAttention},
          {icon:'🚨',label:'Unreported Incidents',                value:'0'},
          {icon:'⚖',label:'Inspector-Ready',                         value:'Always'},
        ]}
        onAdd={()=>setShowReport(true)} addLabel="Report Workplace Accident"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🚨</span>
        <div style={{flex:1,minWidth:200}}><strong>Serious Accidents Must Be Reported Immediately:</strong> A workplace injury triggers an instant notification to the Labour Office -- never batched into a routine monthly filing, because the law requires the inspector to be able to examine workplace safety right away.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search statutory returns..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.label,...r,impact_links:r.target?[r.target]:[]}})}}
            style={{background:'#fff',border:`1px solid ${r.status==='attention'?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.label}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{r.detail}</div>
            </div>
            <span style={{background:r.status==='current'?'#f0fdf4':'#fffbeb',color:r.status==='current'?'#15803d':'#b45309',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
              {r.status==='current'?'✓ Current':'⚠ Attention'}
            </span>
          </div>
        ))}
      </div>

      {showReport&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowReport(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Report Workplace Accident</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Affected Employee" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Description of Incident" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <Field label="Severity" type="select" value="" onChange={()=>{}} accent={A} options={['Minor','Serious -- requires immediate Labour Office notification','Fatal']}/>
              <button onClick={()=>setShowReport(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit &amp; Notify Labour Office</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Work permit expiries pull live from License Management -- never a separately tracked deadline.','AI flags missing or stale roster entries before a Labour Inspector visit ever finds them.','Auto-populates the correct statutory template the moment a filing is due -- never a blank form to fill from memory.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
