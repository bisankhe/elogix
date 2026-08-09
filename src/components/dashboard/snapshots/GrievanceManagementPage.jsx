// FILE: GrievanceManagementPage.jsx - Grievance Management
// (Employee Experience & Culture > Employee Relations)
// Labour Act Sections 113-115: written application -> 15-day internal
// negotiation -> Labour Office escalation (21-day facilitation, 15-day
// decision) -> Labour Court appeal (35 days). Confidential, RBAC-gated.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const STAGE_CFG = {
  submitted:{c:'#94a3b8',label:'Submitted'},negotiation:{c:'#0284c7',label:'Internal Negotiation'},
  labour_office:{c:'#f59e0b',label:'Labour Office Review'},labour_court:{c:'#ef4444',label:'Labour Court Appeal'},resolved:{c:'#10b981',label:'Resolved'},
}

const GRIEVANCES = [
  { id:'g1', employee:'Bikash Rai', category:'Unfair Treatment', stage:'negotiation', submitted_at:'2025-06-15', deadline:'2025-06-30',
    days_remaining:5, assigned_to:'HR Manager', impact_links:['Conflict Resolution'] },
  { id:'g2', employee:'Anonymous', category:'Workplace Safety', stage:'labour_office', submitted_at:'2025-05-20', deadline:'2025-07-04',
    days_remaining:9, assigned_to:'Labour Office, Kathmandu',
    flag_note:'Internal negotiation period expired without resolution -- escalated per Section 113.', impact_links:[] },
  { id:'g3', employee:'Sushila Gurung', category:'Compensation Dispute', stage:'resolved', submitted_at:'2025-04-10', deadline:null,
    resolution_note:'Resolved via mutual agreement within the 15-day negotiation window -- back-pay processed.' },
]

export default function GrievanceManagementPage() {
  const [search, setSearch] = useState('')
  const [showSubmit, setShowSubmit] = useState(false)
  const [anonymous, setAnonymous] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = GRIEVANCES.filter(g=>!search||g.employee.toLowerCase().includes(search.toLowerCase())||g.category.toLowerCase().includes(search.toLowerCase()))
  const atRiskCount = GRIEVANCES.filter(g=>g.days_remaining!=null&&g.days_remaining<=7).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚖" title="Grievance Management"
        breadcrumb="Employee Experience & Culture > Employee Relations"
        gradient={G}
        stats={[
          {icon:'⚖',label:'Active Cases',  value:GRIEVANCES.filter(g=>g.stage!=='resolved').length},
          {icon:'⏰',label:'SLA At Risk',     value:atRiskCount},
          {icon:'✅',label:'Resolved',          value:GRIEVANCES.filter(g=>g.stage==='resolved').length},
          {icon:'📐',label:'Statutory Window',    value:'15 + 21 + 15 days'},
        ]}
        onAdd={()=>setShowSubmit(true)} addLabel="Submit Grievance"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📜</span>
        <div style={{flex:1,minWidth:200}}><strong>Statutory Clock, Not a Guideline:</strong> Section 113-115 mandates a written application, 15 days for internal negotiation, then automatic Labour Office escalation (21-day facilitation + 15-day decision), and a 35-day window to appeal at Labour Court. Every deadline here is a legal one.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee or category..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(g=>{
          const sc = STAGE_CFG[g.stage]
          return (
            <div key={g.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:g.category,...g}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{g.category}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{g.employee} {g.employee==='Anonymous'&&'🔒'} . Submitted {g.submitted_at}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'4px 12px',borderRadius:20}}>{sc.label}</span>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{fontSize:10,color:'#374151'}}>👤 Assigned to: {g.assigned_to||'Pending assignment'}</div>
                {g.deadline&&(
                  <div style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:9,color:'#94a3b8'}}>Statutory deadline: {g.deadline}</span>
                    <span style={{fontSize:9,fontWeight:700,color:g.days_remaining<=7?'#ef4444':'#10b981'}}>{g.days_remaining} days remaining</span>
                  </div>
                )}
                {g.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {g.flag_note}</div>}
                {g.resolution_note&&<div style={{marginTop:8,fontSize:9,color:'#15803d',background:'#f0fdf4',borderRadius:8,padding:'8px 10px'}}>✅ {g.resolution_note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {showSubmit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSubmit(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(520px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:17,fontWeight:900,color:'#fff'}}>Submit a Grievance</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Category" type="select" value="" onChange={()=>{}} accent={A} options={['Unfair Treatment','Workplace Safety','Compensation Dispute','Harassment','Other']}/>
              <Field label="Description" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <label style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,fontSize:10,color:'#374151'}}>
                <input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} style={{accentColor:A}}/>
                Submit anonymously
              </label>
              <div style={{background:'#faf5ff',borderRadius:10,padding:'10px 14px',fontSize:9,color:'#581c87',marginBottom:10}}>Per Section 113, your employer has 15 days to respond once this written application is received.</div>
              <button onClick={()=>setShowSubmit(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Grievance</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Statutory deadlines auto-calculate from submission date -- HR is alerted 7, 3, and 1 day before each window closes.','Case access is restricted to the assigned investigator and necessary management only -- never company-wide visibility.','Unresolved cases auto-escalate to Labour Office tracking the moment the 15-day window lapses.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Case',key:'view'},{icon:'📧',label:'Send Update',key:'notify'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
