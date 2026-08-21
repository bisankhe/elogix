// FILE: WeeklyTrainingCalendarPage.jsx - Weekly Training Calendar
// (Performance & Talent > Talent Development > Learning & Development)
// Mon-Sun split panel with time-slot blocks, microlearning side-widget,
// Register/Add-to-Calendar/Prerequisites actions.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const WEEK_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const TIME_SLOTS = ['9-11 AM','11 AM-1 PM','2-4 PM','4-6 PM']

const WEEK_SESSIONS = {
  'Mon-9-11 AM':{course:'Sprint Retrospective Facilitation',prerequisites:['Agile Fundamentals'],registered:true},
  'Wed-2-4 PM':{course:'Cloud Architecture - Module 3',prerequisites:['AWS Fundamentals','Module 1-2'],registered:false},
  'Fri-11 AM-1 PM':{course:'Manager Coaching Workshop',prerequisites:[],registered:false},

const MICROLEARNING = [
  {title:'5-min: Giving Constructive Feedback',duration:'5 min',slotted:false},
  {title:'8-min: SSF Contribution Basics Refresher',duration:'8 min',slotted:true},
  {title:'3-min: Data Privacy Quick Quiz',duration:'3 min',slotted:false},
]

export default function WeeklyTrainingCalendarPage() {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [ctx, setCtx] = useState(null)

  const registeredCount = Object.values(WEEK_SESSIONS).filter(s=>s.registered).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📆" title="Weekly Training Calendar"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'📆',label:'Sessions This Week', value:Object.keys(WEEK_SESSIONS).length},
          {icon:'✅',label:'Registered',           value:registeredCount},
          {icon:'⚡',label:'Microlearning Chunks',  value:MICROLEARNING.length},
          {icon:'📋',label:'Prerequisites Pending',  value:1},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📌</span>
        <div style={{flex:1,minWidth:200}}><strong>Day-to-Day Skill Building:</strong> Mapped against your actual work calendar to avoid operational disruption. Unfilled microlearning chunks on the side panel slot into your least-busy days automatically - no manager pushback over taking a whole team off the floor.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:16}}>
        {/* Main week grid */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px',overflowX:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:`90px repeat(7,1fr)`,gap:4,minWidth:680}}>
            <div></div>
            {WEEK_DAYS.map(d=>(<div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#64748b',padding:'6px 0'}}>{d}</div>))}
            {TIME_SLOTS.map(slot=>(
              <>
                <div key={slot} style={{fontSize:9,color:'#94a3b8',display:'flex',alignItems:'center'}}>{slot}</div>
                {WEEK_DAYS.map(day=>{
                  const key = `${day}-${slot}`
                  const session = WEEK_SESSIONS[key]
                  return (
                    <div key={key} onClick={()=>session&&setSelectedSlot(session)}
                      onContextMenu={ev=>{if(session){ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:session.course,impact_links:['Course Management']}})}}}
                      style={{minHeight:48,borderRadius:8,border:'1px solid #f1f5f9',padding:5,cursor:session?'pointer':'default',
                        background:session?(session.registered?'#f0fdf4':'#fff7ed'):'#fff'}}>
                      {session&&<div style={{fontSize:8,fontWeight:700,color:session.registered?'#15803d':'#b45309',lineHeight:1.3}}>{session.course.slice(0,20)}{session.course.length>20?'…':''}</div>}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>

        {/* Microlearning side widget */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px'}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚡ Microlearning Chunks</div>
          {MICROLEARNING.map((m,i)=>(
            <div key={i} style={{background:m.slotted?'#f0fdf4':'#f8fafc',borderRadius:10,padding:'10px',marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{m.title}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <span style={{fontSize:8,color:'#94a3b8'}}>{m.duration}</span>
                {m.slotted?<span style={{fontSize:8,color:'#15803d',fontWeight:700}}>✓ Slotted</span>:<button style={{fontSize:8,color:A,fontWeight:700,background:'none',border:'none',cursor:'pointer'}}>Slot It In {'>'}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSlot&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setSelectedSlot(null)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(440px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>{selectedSlot.course}</div></div>
            <div style={{padding:'20px 24px'}}>
              {selectedSlot.prerequisites.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:'#374151',marginBottom:6}}>📋 Prerequisites Checklist</div>
                  {selectedSlot.prerequisites.map((p,i)=>(<div key={i} style={{fontSize:10,color:'#64748b',marginBottom:3}}>☐ {p}</div>))}
                </div>
              )}
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button style={{flex:1,minWidth:120,padding:11,borderRadius:10,border:'none',background:selectedSlot.registered?'#e2e8f0':G,color:selectedSlot.registered?'#64748b':'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>{selectedSlot.registered?'✓ Registered':'Register'}</button>
                <button style={{flex:1,minWidth:120,padding:11,borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:12,fontWeight:600,cursor:'pointer'}}>📅 Add to Calendar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Push notification + email alert sent 30 minutes before any registered session.','Prerequisites auto-checked against your completed-course history before allowing registration.','Add-to-Calendar generates an .ics file compatible with Outlook and Google Calendar.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Session Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
