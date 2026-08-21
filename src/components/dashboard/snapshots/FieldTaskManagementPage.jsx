// FILE: FieldTaskManagementPage.jsx - Field Task Management
// (System Administration > Integration & API > Mobile App Configuration)
// Kanban-style task cards with photo/signature capture -- the layer
// that gives raw GPS data actual work context, directly answering the
// brief's explicit gap: "Basic GPS tracking only logs location,
// lacking context for actual work performed." Distinct from Field
// Visit Tracking (the TA/DA financial workflow) -- this is the task-
// completion and evidence-capture layer.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const STAGES = ['Today', 'In Progress', 'Completed']

const TASKS = [
  {id:'t1',title:'Inventory check -- Patan Showroom',client:'Client B',stage_idx:0,requires_signature:false,requires_photo:true},
  {id:'t2',title:'Contract renewal -- Thamel Office',client:'Client A',stage_idx:1,requires_signature:true,requires_photo:false},
  {id:'t3',title:'Equipment delivery confirmation',client:'Client C',stage_idx:2,requires_signature:true,requires_photo:true,
   evidence_captured:true,flag_note:'Customer signature and delivery photo both attached -- task closed with full evidence, not just a GPS pin.'},
]

export default function FieldTaskManagementPage() {
  const [ctx, setCtx] = useState(null)
  const byStage = STAGES.reduce((acc,s,i)=>{acc[i]=TASKS.filter(t=>t.stage_idx===i); return acc},{})

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✅" title="Field Task Management"
        breadcrumb="System Administration > Integration & API > Mobile App Configuration"
        gradient={G}
        stats={[
          {icon:'📋',label:"Today's Tasks",  value:TASKS.length},
          {icon:'✅',label:'Completed',          value:TASKS.filter(t=>t.stage_idx===2).length},
          {icon:'📸',label:'Evidence Captured',      value:TASKS.filter(t=>t.evidence_captured).length},
          {icon:'✍',label:'Signatures Required',        value:TASKS.filter(t=>t.requires_signature).length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📸</span>
        <div style={{flex:1,minWidth:200}}><strong>A Location Pin Isn't a Completed Task:</strong> Showing up and doing the work are two different facts -- every task here can require a customer signature or a photo before it counts as done, giving real productivity evidence instead of just a coordinate.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,overflowX:'auto'}}>
        {STAGES.map((stage,i)=>(
          <div key={i} style={{background:'#f8fafc',borderRadius:14,padding:'14px',minWidth:200}}>
            <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:12}}>{stage} ({byStage[i].length})</div>
            <div style={{display:'grid',gap:10}}>
              {byStage[i].map(t=>(
                <div key={t.id}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.title,...t,impact_links:['Field Visit Tracking']}})}}
                  style={{background:'#fff',border:`1px solid ${t.flag_note?'#bbf7d0':'#e2e8f0'}`,borderRadius:10,padding:'10px 12px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{t.title}</div>
                  <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{t.client}</div>
                  <div style={{display:'flex',gap:4,marginTop:6}}>
                    {t.requires_photo&&<span style={{fontSize:9}}>📸</span>}
                    {t.requires_signature&&<span style={{fontSize:9}}>✍</span>}
                  </div>
                  {t.flag_note&&<div style={{marginTop:6,fontSize:7,color:'#15803d'}}>✓ {t.flag_note}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Swipe right on a mobile device to mark a task complete -- the action captures the required photo or signature in the same motion, never a separate upload step later.','Tasks requiring evidence cannot be marked complete without it -- a structural requirement, never just a friendly reminder.','Skills and certifications logged on the employee profile auto-filter which tasks they\'re eligible to be assigned in the first place.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Task Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
