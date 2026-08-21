// FILE: EmployeeEventsPage.jsx - Employee Events
// (Employee Experience & Culture > Employee Engagement)
// Centralized calendar, one-click RSVP, .ics calendar sync, time-zone-
// aware for distributed/hybrid teams, virtual-meeting links.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const EVENTS = [
  { id:'ev1', title:'Q3 Town Hall', date:'2025-06-25', time:'4:00 PM NPT', type:'town_hall', format:'hybrid', rsvp_count:184, my_rsvp:'going', impact_links:['Internal Communication'] },
  { id:'ev2', title:'Dashain Tihar Celebration', date:'2025-10-02', time:'12:00 PM NPT', type:'cultural', format:'in_person', rsvp_count:240, my_rsvp:null },
  { id:'ev3', title:'Cloud Architecture Workshop', date:'2025-06-30', time:'10:00 AM NPT', type:'training', format:'virtual', rsvp_count:42, my_rsvp:null,
    flag_note:'Scheduled across 3 time zones for remote team members -- recording will be available after.' },
]

const TYPE_CFG = { town_hall:{c:'#7c3aed',icon:'🏛'},cultural:{c:'#f59e0b',icon:'🎉'},training:{c:'#0284c7',icon:'🎓'} }

export default function EmployeeEventsPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = EVENTS.filter(e=>!search||e.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📅" title="Employee Events"
        breadcrumb="Employee Experience & Culture > Employee Engagement"
        gradient={G}
        stats={[
          {icon:'📅',label:'Upcoming Events',  value:EVENTS.length},
          {icon:'✅',label:'My RSVPs',            value:EVENTS.filter(e=>e.my_rsvp).length},
          {icon:'👥',label:'Total Attendees',       value:EVENTS.reduce((s,e)=>s+e.rsvp_count,0)},
          {icon:'🌐',label:'Hybrid/Virtual',          value:EVENTS.filter(e=>e.format!=='in_person').length},
        ]}
        onAdd={()=>{}} addLabel="+ New Event"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🌐</span>
        <div style={{flex:1,minWidth:200}}><strong>Inclusive by Design:</strong> Events accommodate hybrid and distributed teams across time zones -- one-click RSVP syncs straight to your calendar (.ics), and virtual sessions are recorded for anyone who can't attend live.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search events..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(e=>{
          const tc = TYPE_CFG[e.type]
          return (
            <div key={e.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.title,...e}})}}
              style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px',display:'flex',gap:14,borderLeft:`4px solid ${tc.c}`}}>
              <div style={{fontSize:26,flexShrink:0}}>{tc.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{e.title}</div>
                    <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{e.date} . {e.time} . {e.format.replace('_',' ')}</div>
                  </div>
                  <button style={{padding:'6px 16px',borderRadius:8,border:e.my_rsvp?'1px solid #10b981':'none',background:e.my_rsvp?'#f0fdf4':tc.c,color:e.my_rsvp?'#15803d':'#fff',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                    {e.my_rsvp?'✓ Going':'RSVP'}
                  </button>
                </div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:8}}>👥 {e.rsvp_count} attending</div>
                {e.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#581c87'}}>🌐 {e.flag_note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Calendar invite auto-syncs to Outlook/Google the moment you RSVP -- no manual download step.','Recordings auto-post to Internal Communication for anyone in a different time zone.','Low-RSVP events flag automatically so organizers can adjust timing or format.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'📅',label:'Add to Calendar',key:'calendar'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
