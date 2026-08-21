// FILE: TravelManagementPage.jsx - Travel Management
// (Finance, Assets & Administration > Administrative Operations)
// Origin/destination/dates wizard, manager approval routing. Section
// 37 (Daily Allowance per bylaws) and the compensatory-rest trigger
// when travel pushes someone past the 8h/day, 48h/week ceiling.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const STATUS_CFG = { pending:{c:'#f59e0b',label:'Pending Manager Approval'},approved:{c:'#10b981',label:'Approved'},rejected:{c:'#ef4444',label:'Rejected'} }

const TRIPS = [
  { id:'t1', employee:'Hari Thapa', origin:'Kathmandu', destination:'Pokhara', dates:'2025-07-08 to 2025-07-10', purpose:'Client site visit', status:'pending', daily_allowance:1500 },
  { id:'t2', employee:'Gita Maharjan', origin:'Kathmandu', destination:'Dubai', dates:'2025-07-15 to 2025-07-18', purpose:'Vendor conference', status:'approved', daily_allowance:8000,
    flag_note:'Travel duration crosses standard hours -- compensatory rest auto-scheduled on return.' },
]

export default function TravelManagementPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = TRIPS.filter(t=>!search||t.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✈️" title="Travel Management"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'✈️',label:'Active Trips',  value:TRIPS.length},
          {icon:'⏳',label:'Pending Approval',  value:TRIPS.filter(t=>t.status==='pending').length},
          {icon:'⚖',label:'Comp Rest Triggered',    value:TRIPS.filter(t=>t.flag_note).length},
          {icon:'💰',label:'Total Allowance',          value:'NPR '+TRIPS.reduce((s,t)=>s+t.daily_allowance,0).toLocaleString()},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="Request Travel"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Duty of Care, Built In:</strong> Trips that push an employee past the 48-hour weekly ceiling auto-trigger compensatory rest scheduling on return -- never left to chance or forgotten in a calendar.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search trips..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(t=>{
          const sc = STATUS_CFG[t.status]
          return (
            <div key={t.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.employee,...t}})}}
              style={{background:'#fff',border:`1px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{t.employee}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{t.origin} {'>'} {t.destination} . {t.dates}</div>
                  <div style={{fontSize:9,color:'#374151',marginTop:3}}>{t.purpose}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              <div style={{marginTop:8,fontSize:9,color:'#94a3b8'}}>Daily Allowance: NPR {t.daily_allowance.toLocaleString()}/day</div>
              {t.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {t.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(500px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Request Travel</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Origin" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Destination" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Travel Dates" type="date" value="" onChange={()=>{}} accent={A}/>
              <Field label="Purpose" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit for Approval</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Out-of-policy requests (exceeding allowance caps or unapproved booking channels) flag before submission, not after rejection.','Itinerary and daily allowance calculate automatically from origin, destination, and trip length.','Real-time location tracking is opt-in and used solely for duty-of-care during emergencies -- never general surveillance.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Itinerary',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
