// FILE: EthicsGovernancePage.jsx - Ethics & Governance
// (Compliance & Risk Management > Legal Management)
// Confidential whistleblower channel -- genuinely new table, but
// follows the SAME server-side identity-discard discipline proven on
// suggestions.is_anonymous (Employee Engagement session). Distinct from
// suggestions (workplace improvement ideas) and complaints (HR-handled
// harassment/policy disputes) -- this is specifically for ethics/
// governance violations (bribery, fraud, abuse of authority).

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const STATUS_CFG = { under_review:{c:'#f59e0b',label:'Under Review'},investigating:{c:'#0284c7',label:'Investigating'},resolved:{c:'#10b981',label:'Resolved'} }

const REPORTS = [
  { id:'eg1', category:'Conflict of Interest', summary:'Anonymous report regarding a procurement decision favoring a vendor with an undisclosed personal connection', status:'investigating', filed:'2025-06-20',
    impact_links:['Vendor Management'] },
  { id:'eg2', category:'Abuse of Authority', summary:'Anonymous report -- a manager allegedly pressuring direct reports to falsify timesheet entries', status:'under_review', filed:'2025-06-26',
    flag_note:'Routed directly to the Ethics Committee, bypassing the reported manager\'s own chain of command.' },
]

const GOVERNANCE_METRICS = [
  {label:'Code of Conduct Acknowledgment',value:'97%',c:'#10b981'},
  {label:'Equal Pay Audit Status',value:'Compliant',c:'#10b981'},
  {label:'Open Ethics Reports',value:2,c:'#f59e0b'},
]

export default function EthicsGovernancePage() {
  const [showReport, setShowReport] = useState(false)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛡" title="Ethics &amp; Governance"
        breadcrumb="Compliance & Risk Management > Legal Management"
        gradient={G}
        stats={[
          {icon:'🛡',label:'Open Reports',  value:REPORTS.length},
          {icon:'✅',label:'Code Acknowledgment',  value:'97%'},
          {icon:'⚖',label:'Equal Pay Status',          value:'Compliant'},
          {icon:'🔒',label:'Anonymity',                    value:'Identity Discarded'},
        ]}
        onAdd={()=>setShowReport(true)} addLabel="File Confidential Report"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Identity Discarded, Not Just Hidden:</strong> An anonymous report's submitter identity is never stored in the first place -- not masked in the UI, genuinely never written to the database. Routing bypasses the reported person's own chain of command automatically.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:18}}>
        {GOVERNANCE_METRICS.map((m,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center'}}>
            <div style={{fontSize:16,fontWeight:900,color:m.c}}>{m.value}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gap:14}}>
        {REPORTS.map(r=>{
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.category,...r}})}}
              style={{background:'#fff',border:`1px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.category}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{r.summary}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              {r.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#581c87'}}>↪ {r.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {showReport&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowReport(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(520px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:16,fontWeight:900,color:'#fff'}}>File a Confidential Report</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Category" type="select" value="" onChange={()=>{}} accent={A} options={['Conflict of Interest','Bribery or Fraud','Abuse of Authority','Forced or Child Labor Concern','Other']}/>
              <Field label="Description" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported -- your identity is never recorded unless you choose to disclose it"/>
              <div style={{background:'#faf5ff',borderRadius:10,padding:'10px 14px',fontSize:9,color:'#581c87',marginBottom:10}}>This report routes directly to the Ethics Committee -- never through the reported person's management chain, regardless of seniority.</div>
              <button onClick={()=>setShowReport(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Confidentially</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Code of Conduct acknowledgment syncs live with Policy Compliance -- never a separately tracked number.','Equal pay and non-discrimination metrics correlate against Gender Analytics to catch compliance gaps proactively, not after a complaint.','Forced or child labor concerns route with the highest priority -- the legal exposure (up to NPR 500,000 in fines) demands it.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Report',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
