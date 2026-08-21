// FILE: ThingsToDoPage.jsx - Things to Do
// (HR Services & Support > Employee Self Service)
// The ESS homepage: a personal inbox aggregating pending approvals,
// missing timesheets, expiring documents, and signature requests --
// pure read-only UNION across many EXISTING tables, never new data.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const TASKS = [
  { id:'t1', type:'signature', icon:'✍', title:'Sign: Written Warning -- Attendance Policy', urgency:'high', target:'my-digital-signature' },
  { id:'t2', type:'attendance', icon:'⏰', title:'Missed clock-out yesterday -- submit a request', urgency:'high', target:'attendance-request' },
  { id:'t3', type:'leave', icon:'🏖', title:'Leave request pending manager approval', urgency:'medium', target:'leave-request-ess' },
  { id:'t4', type:'document', icon:'📂', title:'Work permit expires in 43 days', urgency:'medium', target:'my-documents' },
  { id:'t5', type:'survey', icon:'📊', title:'New pulse survey available', urgency:'low', target:'employee-survey' },
]

const URGENCY_CFG = { high:{c:'#ef4444',label:'Urgent'},medium:{c:'#f59e0b',label:'This Week'},low:{c:'#94a3b8',label:'Whenever'} }

export default function ThingsToDoPage() {
  const [ctx, setCtx] = useState(null)
  const urgentCount = TASKS.filter(t=>t.urgency==='high').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✅" title="Things to Do"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'✅',label:'Total Tasks',  value:TASKS.length},
          {icon:'🔴',label:'Urgent',          value:urgentCount},
          {icon:'🟡',label:'This Week',          value:TASKS.filter(t=>t.urgency==='medium').length},
          {icon:'🤖',label:'AI Assistant',          value:'Ask Anytime'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📥</span>
        <div style={{flex:1,minWidth:200}}><strong>Your Personal Inbox:</strong> Everything that needs your attention -- pending signatures, missing punches, leave approvals, expiring documents -- pulled live from across the system into one place.</div>
      </div>

      <div style={{display:'grid',gap:12}}>
        {TASKS.map(t=>{
          const uc = URGENCY_CFG[t.urgency]
          return (
            <div key={t.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.title,impact_links:[t.target]}})}}
              style={{background:'#fff',border:`1.5px solid ${uc.c}33`,borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,borderLeft:`4px solid ${uc.c}`,cursor:'pointer'}}>
              <div style={{display:'flex',gap:14,alignItems:'center'}}>
                <span style={{fontSize:24}}>{t.icon}</span>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{t.title}</div>
              </div>
              <span style={{background:`${uc.c}15`,color:uc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{uc.label}</span>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Tasks pull live from every ESS module -- nothing here is manually maintained or can go stale.','Urgent items resurface daily until resolved -- never silently buried after one dismissal.','Ask the AI assistant directly from here -- "How many leave days do I have left?" resolves instantly without a ticket.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Open Task',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
