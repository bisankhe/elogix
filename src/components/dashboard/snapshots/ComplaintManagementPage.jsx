// FILE: ComplaintManagementPage.jsx - Complaint Management
// (Employee Experience & Culture > Employee Relations)
// Broader intake than formal Grievances -- harassment, unfair
// treatment, policy violations. SLA-timed case dashboard, evidence
// upload, RBAC-restricted to assigned investigator only.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const PRIORITY_CFG = { high:{c:'#ef4444',label:'High'},medium:{c:'#f59e0b',label:'Medium'},low:{c:'#10b981',label:'Low'} }
const STATUS_CFG = { intake:{c:'#94a3b8',label:'Intake'},assigned:{c:'#0284c7',label:'Assigned'},investigating:{c:'#7c3aed',label:'Investigating'},closed:{c:'#10b981',label:'Closed'} }

const COMPLAINTS = [
  { id:'c1', case_no:'CMP-2025-014', type:'Harassment', priority:'high', status:'investigating', investigator:'HR Director', sla_days_left:2, has_evidence:true,
    impact_links:['Conflict Resolution','Disciplinary Management'] },
  { id:'c2', case_no:'CMP-2025-018', type:'Policy Violation', priority:'medium', status:'assigned', investigator:'HR Manager', sla_days_left:6, has_evidence:false },
  { id:'c3', case_no:'CMP-2025-009', type:'Unfair Treatment', priority:'low', status:'closed', investigator:'HR Manager', sla_days_left:null, has_evidence:true,
    resolution_note:'Investigation found no policy violation -- coaching provided to both parties.' },
]

export default function ComplaintManagementPage() {
  const [search, setSearch] = useState('')
  const [showSubmit, setShowSubmit] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = COMPLAINTS.filter(c=>!search||c.type.toLowerCase().includes(search.toLowerCase())||c.case_no.toLowerCase().includes(search.toLowerCase()))
  const slaBreachRisk = COMPLAINTS.filter(c=>c.sla_days_left!=null&&c.sla_days_left<=3).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗂" title="Complaint Management"
        breadcrumb="Employee Experience & Culture > Employee Relations"
        gradient={G}
        stats={[
          {icon:'🗂',label:'Open Cases',  value:COMPLAINTS.filter(c=>c.status!=='closed').length},
          {icon:'⏰',label:'SLA Breach Risk', value:slaBreachRisk},
          {icon:'✅',label:'Closed',         value:COMPLAINTS.filter(c=>c.status==='closed').length},
          {icon:'🔒',label:'Access',           value:'Investigator-Only'},
        ]}
        onAdd={()=>setShowSubmit(true)} addLabel="File a Complaint"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Restricted by Design:</strong> Case visibility is limited to the assigned investigator and necessary management only -- never visible company-wide. SLA timers auto-escalate if acknowledgment lags beyond 48 hours.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by case number or type..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',overflowX:'auto',marginTop:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:600}}>
          <thead><tr style={{background:'#f8fafc'}}>
            {['Case #','Type','Priority','Status','Investigator','SLA','Evidence'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(c=>{
              const pc = PRIORITY_CFG[c.priority], sc = STATUS_CFG[c.status]
              return (
                <tr key={c.id} style={{borderBottom:'1px solid #f8fafc'}}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.case_no,...c}})}}>
                  <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{c.case_no}</td>
                  <td style={{padding:'9px 12px',color:'#374151'}}>{c.type}</td>
                  <td style={{padding:'9px 12px'}}><span style={{background:`${pc.c}15`,color:pc.c,fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{pc.label}</span></td>
                  <td style={{padding:'9px 12px'}}><span style={{background:`${sc.c}15`,color:sc.c,fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span></td>
                  <td style={{padding:'9px 12px',color:'#64748b',fontSize:9}}>{c.investigator}</td>
                  <td style={{padding:'9px 12px',fontSize:9,fontWeight:700,color:c.sla_days_left!=null&&c.sla_days_left<=3?'#ef4444':'#10b981'}}>{c.sla_days_left!=null?`${c.sla_days_left}d left`:'--'}</td>
                  <td style={{padding:'9px 12px'}}>{c.has_evidence?'📎':'--'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showSubmit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSubmit(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(520px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:17,fontWeight:900,color:'#fff'}}>File a Complaint</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Type" type="select" value="" onChange={()=>{}} accent={A} options={['Harassment','Unfair Treatment','Policy Violation','Other']}/>
              <Field label="Involved Parties" value="" onChange={()=>{}} accent={A}/>
              <Field label="Description" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <div style={{border:'2px dashed #bfdbfe',borderRadius:12,padding:'20px',textAlign:'center',background:'#eff6ff',marginBottom:14}}>
                <div style={{fontSize:20,marginBottom:6}}>📎</div>
                <div style={{fontSize:10,color:'#1e40af'}}>Upload evidence (screenshots, documents, emails)</div>
              </div>
              <button onClick={()=>setShowSubmit(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Complaint</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags complaint clusters by department to surface cultural red flags before they escalate.','Evidence files are encrypted at rest and accessible only to the assigned investigator.','Closed complaints with upheld findings can auto-trigger Disciplinary Management workflows.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Case File',key:'view'},{icon:'👤',label:'Reassign Investigator',key:'reassign'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
