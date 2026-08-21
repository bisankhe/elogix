// FILE: AutoReminderSetupPage.jsx - Auto Reminder Setup
// (System Administration > Workflow & Automation)
// Checkbox/toggle configuration for reminder cadence -- the config
// layer ABOVE transaction_notifications (the universal delivery log
// reused throughout this entire build). Alert-fatigue pain point
// addressed directly via a per-rule max-reminders cap.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const REMINDER_RULES = [
  {process:'Pending Leave Approval',interval_hours:24,max_reminders:3,active:true,context_template:'{{employee_name}} leave request has been pending for {{hours_elapsed}}h'},
  {process:'Unsigned Mandatory Policy',interval_hours:48,max_reminders:5,active:true,context_template:'{{policy_title}} is still unacknowledged -- blocks first salary'},
  {process:'Expense Claim Awaiting Review',interval_hours:12,max_reminders:10,active:true,
   flag_note:'10 reminders at 12-hour intervals risks alert fatigue -- recommend capping at 4-5.'},
]

export default function AutoReminderSetupPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = REMINDER_RULES.filter(r=>!search||r.process.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⏰" title="Auto Reminder Setup"
        breadcrumb="System Administration > Workflow & Automation"
        gradient={G}
        stats={[
          {icon:'⏰',label:'Active Rules',  value:REMINDER_RULES.filter(r=>r.active).length},
          {icon:'⚠',label:'Fatigue Risk',      value:REMINDER_RULES.filter(r=>r.flag_note).length},
          {icon:'📨',label:'Sent Today',            value:'47'},
          {icon:'🎯',label:'Context-Aware',                value:'Always'},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="New Reminder Rule"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🎯</span>
        <div style={{flex:1,minWidth:200}}><strong>Capped, Not Endless:</strong> Every rule has a maximum reminder count -- past that, it escalates instead of nagging indefinitely, so a real bottleneck gets resolved rather than buried under noise.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search reminder rules..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.process,...r,impact_links:['Escalation Rules']}})}}
            style={{background:'#fff',border:`1px solid ${r.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{r.process}</div>
              <span style={{background:r.active?'#f0fdf4':'#f8fafc',color:r.active?'#15803d':'#94a3b8',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{r.active?'Active':'Off'}</span>
            </div>
            <div style={{display:'flex',gap:14,fontSize:9,color:'#94a3b8'}}>
              <span>Every {r.interval_hours}h</span><span>Max {r.max_reminders} reminders</span>
            </div>
            <div style={{marginTop:8,fontSize:8,color:'#94a3b8',fontFamily:'monospace'}}>"{r.context_template}"</div>
            {r.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {r.flag_note}</div>}
          </div>
        ))}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>New Reminder Rule</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Process" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Remind Every (hours)" type="number" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Maximum Reminders" type="number" value="" onChange={()=>{}} accent={A} required hint="After this count, the request escalates instead"/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save Rule</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags rules whose frequency-x-count combination risks alert fatigue -- before recipients start ignoring every notification.','Templates pull live context (who, what, how long pending) -- never a generic "you have a pending item" with no specifics.','Hitting the max-reminders cap auto-hands off to Escalation Rules, never silently going quiet.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Rule',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
