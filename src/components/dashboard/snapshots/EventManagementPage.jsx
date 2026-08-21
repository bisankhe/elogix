// FILE: EventManagementPage.jsx - Event Management
// (Finance, Assets & Administration > Administrative Operations)
// Event pages, RSVP tracking, venue/catering/equipment bundling.
// Working-hours-extension awareness: events compelling employees past
// standard hours count toward weekly overtime thresholds.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const EVENTS = [
  {id:'e1',title:'Annual Team Retreat -- Pokhara',date:'2025-08-15',rsvp_yes:42,rsvp_pending:8,after_hours:false},
  {id:'e2',title:'Q3 All-Hands + Dinner',date:'2025-07-10',rsvp_yes:68,rsvp_pending:12,after_hours:true,
   flag_note:'Extends past standard shift hours -- counts toward weekly overtime for hourly staff attending.'},
  {id:'e3',title:'New Hire Welcome Lunch',date:'2025-07-03',rsvp_yes:6,rsvp_pending:2,after_hours:false},
]

export default function EventManagementPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = EVENTS.filter(e=>!search||e.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎭" title="Event Management"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'🎭',label:'Upcoming Events',  value:EVENTS.length},
          {icon:'✅',label:'Total RSVPs',          value:EVENTS.reduce((s,e)=>s+e.rsvp_yes,0)},
          {icon:'⏳',label:'Pending RSVPs',            value:EVENTS.reduce((s,e)=>s+e.rsvp_pending,0)},
          {icon:'⚖',label:'OT-Counted Events',            value:EVENTS.filter(e=>e.after_hours).length},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="Create Event"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>After-Hours Events Still Count:</strong> A mandatory all-hands dinner that runs past standard shift hours adds to weekly overtime totals just like any other extended workday -- flagged automatically, never overlooked because it "felt" social rather than work.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search events..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(e=>(
          <div key={e.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.title,...e,impact_links:['Meeting Room Booking','Cafeteria Management']}})}}
            style={{background:'#fff',border:`1px solid ${e.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{e.title}</div>
              <span style={{fontSize:10,fontWeight:700,color:A}}>{e.date}</span>
            </div>
            <div style={{display:'flex',gap:14,fontSize:9,color:'#94a3b8'}}>
              <span>✅ {e.rsvp_yes} attending</span><span>⏳ {e.rsvp_pending} pending</span>
            </div>
            {e.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {e.flag_note}</div>}
          </div>
        ))}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(500px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Create Event</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Event Title" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Date &amp; Time" type="date" value="" onChange={()=>{}} accent={A}/>
              <Field label="Venue / Room" value="" onChange={()=>{}} accent={A}/>
              <Field label="Catering or Equipment Needs" type="textarea" value="" onChange={()=>{}} accent={A} hint="Optional -- voice input supported"/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Create &amp; Send Invites</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Venue booking auto-checks Meeting Room Booking availability -- never a double-booked space for your event.','Catering needs route straight into Cafeteria Management headcount forecasting.','RSVP reminders fire automatically as the event date approaches, never a manually-chased spreadsheet.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Event',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
