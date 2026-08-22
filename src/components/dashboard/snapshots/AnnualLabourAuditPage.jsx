// FILE: AnnualLabourAuditPage.jsx - Annual Labour Audit
// (Compliance & Risk Management > Compliance Management)
// Section 80: the SPECIFIC mandatory annual audit (10+ workers,
// certified auditor, submitted to the local Labour Office at fiscal
// year-end) -- distinct from the general Audit Management workroom.
// One-click evidence pack assembly for the certified auditor.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const CURRENT_AUDIT = {
  fiscal_year:'2082/83', auditor_name:'Certified Labour Auditor, KC & Associates', status:'in_progress',
  submission_deadline:'2026-07-15', days_remaining:142,
  evidence_categories:[
    {category:'Statutory Wages & Payroll Records',status:'ready'},
    {category:'Working Conditions Documentation',status:'ready'},
    {category:'Safety Provisions & Committee Minutes',status:'ready'},
    {category:'Leave & Overtime Registers',status:'pending',flag:'Q4 overtime register still being compiled.'},
  ],
}

const PAST_AUDITS = [
  {fiscal_year:'2081/82',submitted_date:'2025-07-10',status:'accepted',penalties:'None'},
  {fiscal_year:'2080/81',submitted_date:'2024-07-08',status:'accepted',penalties:'None'},
]

export default function AnnualLabourAuditPage() {
  const [ctx, setCtx] = useState(null)
  const readyCount = CURRENT_AUDIT.evidence_categories.filter(e=>e.status==='ready').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏛" title="Annual Labour Audit"
        breadcrumb="Compliance & Risk Management > Compliance Management"
        gradient={G}
        stats={[
          {icon:'🏛',label:'Fiscal Year',  value:CURRENT_AUDIT.fiscal_year},
          {icon:'⏰',label:'Days to Deadline',  value:CURRENT_AUDIT.days_remaining},
          {icon:'📋',label:'Evidence Ready',         value:`${readyCount}/${CURRENT_AUDIT.evidence_categories.length}`},
          {icon:'⚖',label:'Legal Basis',                value:'Section 80'},
        ]}
        onAdd={()=>{}} addLabel="Generate Evidence Pack"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Mandatory at Your Headcount:</strong> Section 80 requires this audit using a certified labour expert, submitted to the local Labour Office by fiscal year-end -- failure to file carries administrative penalties.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:4}}>FY {CURRENT_AUDIT.fiscal_year} -- {CURRENT_AUDIT.auditor_name}</div>
        <div style={{fontSize:9,color:'#94a3b8',marginBottom:14}}>Submission deadline: {CURRENT_AUDIT.submission_deadline}</div>
        {CURRENT_AUDIT.evidence_categories.map((e,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.category,...e,impact_links:['Labor Compliance']}})}}
            style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<CURRENT_AUDIT.evidence_categories.length-1?'1px solid #f8fafc':'none'}}>
            <div>
              <span style={{fontSize:10,color:'#374151'}}>{e.category}</span>
              {e.flag&&<div style={{fontSize:8,color:'#b45309',marginTop:2}}>⚠ {e.flag}</div>}
            </div>
            <span style={{background:e.status==='ready'?'#f0fdf4':'#fffbeb',color:e.status==='ready'?'#15803d':'#b45309',fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{e.status}</span>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📚 Past Audit History</div>
        {PAST_AUDITS.map((p,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<PAST_AUDITS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>FY {p.fiscal_year} -- Submitted {p.submitted_date}</span>
            <span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{p.status} . {p.penalties}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Evidence categories auto-populate from the same wage, working-condition, and safety records tracked across the system -- never a manual compilation from scratch.','Deadline countdown is precise to the fiscal year-end, never an estimate.','Past audit acceptance history is preserved permanently, useful proof of consistent compliance for future filings or disputes.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Evidence Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
