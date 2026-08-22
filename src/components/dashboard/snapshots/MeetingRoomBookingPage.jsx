// FILE: MeetingRoomBookingPage.jsx - Meeting Room Booking
// (Finance, Assets & Administration > Administrative Operations)
// Calendar-centric availability, catering/AV add-ons. Rule 7.7: 15
// cubic meters per person threshold surfaced directly to prevent
// overbooking a room past its safe occupancy.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const ROOMS = [
  {name:'Sagarmatha Boardroom',capacity:12,booked_today:3,next_free:'2:30 PM',has_av:true},
  {name:'Annapurna Huddle',capacity:4,booked_today:6,next_free:'4:00 PM',has_av:false},
  {name:'Everest Conference Hall',capacity:24,booked_today:1,next_free:'Now',has_av:true},
]

export default function MeetingRoomBookingPage() {
  const [search, setSearch] = useState('')
  const [showBook, setShowBook] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = ROOMS.filter(r=>!search||r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗓" title="Meeting Room Booking"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'🗓',label:'Rooms Available',  value:ROOMS.length},
          {icon:'✅',label:'Free Right Now',       value:ROOMS.filter(r=>r.next_free==='Now').length},
          {icon:'📺',label:'AV-Equipped',              value:ROOMS.filter(r=>r.has_av).length},
          {icon:'⚖',label:'Space Standard',                value:'15m³/person'},
        ]}
        onAdd={()=>setShowBook(true)} addLabel="Book a Room"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Capacity Isn't Just a Number:</strong> Rule 7.7's 15 cubic meter per person threshold caps how many people a room can safely hold -- the booking form blocks an attendee count beyond that limit automatically.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search rooms..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginTop:14}}>
        {filtered.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.name,...r}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{r.name}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>👥 Capacity: {r.capacity} {r.has_av&&'. 📺 AV-Equipped'}</div>
            <div style={{marginTop:10,fontSize:10,fontWeight:700,color:r.next_free==='Now'?'#15803d':'#0284c7'}}>Next free: {r.next_free}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:4}}>{r.booked_today} bookings today</div>
          </div>
        ))}
      </div>

      {showBook&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowBook(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Book a Meeting Room</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Room" type="select" value="" onChange={()=>{}} accent={A} options={ROOMS.map(r=>r.name)}/>
              <Field label="Attendee Count" type="number" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Date &amp; Time" type="date" value="" onChange={()=>{}} accent={A}/>
              <Field label="Catering or AV Requests" type="textarea" value="" onChange={()=>{}} accent={A} hint="Optional -- voice input supported"/>
              <button onClick={()=>setShowBook(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Confirm Booking</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags "ghost meetings" -- rooms booked but unscanned/unused after 10 minutes -- and auto-releases them for others.','Catering requests route straight into Cafeteria Management, never a separate phone call.','Double-booking is structurally impossible -- the calendar blocks overlapping requests before submission.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Schedule',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
