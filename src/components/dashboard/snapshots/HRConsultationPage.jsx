// FILE: HRConsultationPage.jsx - HR Consultation
// (HR Services & Support > HR Helpdesk)
// Direct scheduling for sensitive 1-on-1 conversations -- benefits
// disputes, workplace conflicts, leave-of-absence planning. Calendar-
// based booking, confidential by default, document upload in-thread.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const CONSULTANTS = [
  {name:'HR Director',specialty:'Workplace Conflicts, Sensitive Matters',available_slots:3},
  {name:'Benefits Specialist',specialty:'Insurance, Leave of Absence, Compensation',available_slots:5},
]

const MY_CONSULTATIONS = [
  { id:'cn1', topic:'Leave of absence planning for medical reasons', consultant:'Benefits Specialist', scheduled_for:'2025-06-28 2:00 PM',
    status:'upcoming', confidential:true, impact_links:['Wellness & Support'] },
  { id:'cn2', topic:'Clarifying my compensation structure post-promotion', consultant:'HR Director', scheduled_for:'2025-06-15 11:00 AM',
    status:'completed', confidential:false, notes:'Walked through new salary band and equity vesting schedule.' },
]

export default function HRConsultationPage() {
  const [search, setSearch] = useState('')
  const [showBook, setShowBook] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = MY_CONSULTATIONS.filter(c=>!search||c.topic.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="HR Consultation"
        breadcrumb="HR Services & Support > HR Helpdesk"
        gradient={G}
        stats={[
          {icon:'📅',label:'Upcoming',  value:MY_CONSULTATIONS.filter(c=>c.status==='upcoming').length},
          {icon:'✅',label:'Completed',   value:MY_CONSULTATIONS.filter(c=>c.status==='completed').length},
          {icon:'👤',label:'Consultants Available', value:CONSULTANTS.length},
          {icon:'🔒',label:'Confidentiality',           value:'Default On'},
        ]}
        onAdd={()=>setShowBook(true)} addLabel="Schedule Consultation"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📅</span>
        <div style={{flex:1,minWidth:200}}><strong>No More Phone Tag:</strong> Check a consultant's real availability and book directly -- for sensitive or complex matters that deserve a real conversation, not a ticket queue.</div>
      </div>

      {/* Available consultants */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:18}}>
        {CONSULTANTS.map((c,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.name}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>{c.specialty}</div>
            <div style={{marginTop:8,fontSize:9,fontWeight:700,color:A}}>{c.available_slots} slots open this week</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my consultations..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(c=>(
          <div key={c.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.topic,...c}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${c.status==='upcoming'?A:'#10b981'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{c.topic} {c.confidential&&'🔒'}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>With {c.consultant} . {c.scheduled_for}</div>
              </div>
              <span style={{background:c.status==='upcoming'?`${A}15`:'#f0fdf4',color:c.status==='upcoming'?A:'#15803d',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{c.status}</span>
            </div>
            {c.notes&&<div style={{marginTop:8,fontSize:9,color:'#374151'}}>📝 {c.notes}</div>}
          </div>
        ))}
      </div>

      {showBook&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowBook(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(500px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Schedule a Consultation</div></div>
            <div style={{padding:'22px 24px'}}>
              <Field label="Consultant" type="select" value="" onChange={()=>{}} accent={A} options={CONSULTANTS.map(c=>c.name)}/>
              <Field label="Topic" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <Field label="Preferred Date/Time" type="date" value="" onChange={()=>{}} accent={A}/>
              <button onClick={()=>setShowBook(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Book Consultation</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Calendar pulls real consultant availability -- never a stale, manually-updated schedule.','Documents and clarifications attach directly inside the consultation thread, not scattered email attachments.','AI suggests the right specialist based on your topic -- benefits disputes route differently than conflict mediation.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'📅',label:'Reschedule',key:'reschedule'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
