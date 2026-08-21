// FILE: AuditManagementPage.jsx - Audit Management
// (Compliance & Risk Management > Compliance Management)
// The secure, permissioned auditor workroom -- distinct from Annual
// Labour Audit (the specific Section 80 statutory filing). This is
// the general continuous-audit evidence repository and one-click report
// generator, spanning ad-hoc internal audits too.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const AUDITS = [
  {title:'Q2 Internal Payroll Audit',type:'Internal',status:'completed',auditor:'Internal Finance Team',date:'2025-06-15'},
  {title:'Pay Equity Continuous Verification',type:'Continuous',status:'in_progress',auditor:'AI Compliance Agent',date:'Ongoing'},
  {title:'External ISO Compliance Review',type:'External',status:'scheduled',auditor:'Certified Third-Party Auditor',date:'2025-08-01',
   flag_note:'External auditor access link expires 7 days after the review window closes.'},
]

const STATUS_CFG = { completed:{c:'#10b981',label:'Completed'},in_progress:{c:'#0284c7',label:'In Progress'},scheduled:{c:'#f59e0b',label:'Scheduled'} }

export default function AuditManagementPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = AUDITS.filter(a=>!search||a.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔍" title="Audit Management"
        breadcrumb="Compliance & Risk Management > Compliance Management"
        gradient={G}
        stats={[
          {icon:'🔍',label:'Active Audits',  value:AUDITS.length},
          {icon:'✅',label:'Completed',          value:AUDITS.filter(a=>a.status==='completed').length},
          {icon:'🤖',label:'Continuous Monitoring', value:AUDITS.filter(a=>a.type==='Continuous').length},
          {icon:'🔒',label:'External Access',          value:'Permissioned'},
        ]}
        onAdd={()=>{}} addLabel="Schedule Audit"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>A Secure Workroom, Not a Shared Drive:</strong> External auditors get a permissioned, time-bound access link -- never standing credentials to the full HR system. Every action they take is logged in the same tamper-proof trail as internal users.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search audits..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((a,i)=>{
          const sc = STATUS_CFG[a.status]
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.title,...a,impact_links:['Annual Labour Audit']}})}}
              style={{background:'#fff',border:`1px solid ${a.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{a.title}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{a.type} . {a.auditor} . {a.date}</div>
                {a.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {a.flag_note}</div>}
              </div>
              <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['One-click report generation pulls evidence straight from source records -- never a manual spreadsheet assembly.','Continuous pay-equity verification runs in the background year-round, not just during a scheduled audit window.','Every system action -- policy change, payroll edit, approval -- writes to the same tamper-proof audit log auditors can review.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Open Workroom',key:'view'},{icon:'📄',label:'Generate Report',key:'report'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
