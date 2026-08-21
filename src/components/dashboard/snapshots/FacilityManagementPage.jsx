// FILE: FacilityManagementPage.jsx - Facility Management
// (Finance, Assets & Administration > Administrative Operations)
// Floor-by-floor occupancy/desk status -- distinct from the EXISTING
// Asset & Inventory module (which tracks individual items, not floor
// space). Section 74: mandatory Safety Committee for 20+ workers.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const FLOORS = [
  {floor:'Floor 2',occupancy_pct:68,desks_total:40,desks_free:13,temp_c:23,humidity_pct:55},
  {floor:'Floor 3',occupancy_pct:91,desks_total:36,desks_free:3,temp_c:25,humidity_pct:48,
   flag_note:'High occupancy -- approaching the 15m³/person threshold for this floor plate.'},
  {floor:'Floor 4',occupancy_pct:42,desks_total:30,desks_free:17,temp_c:22,humidity_pct:50},
]

const SAFETY_COMMITTEE = { active:true, last_inspection:'2025-06-10', next_due:'2025-09-10', members:5 }

export default function FacilityManagementPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏢" title="Facility Management"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'🏢',label:'Floors Tracked',  value:FLOORS.length},
          {icon:'🪑',label:'Desks Free',          value:FLOORS.reduce((s,f)=>s+f.desks_free,0)},
          {icon:'⚠',label:'High Occupancy',           value:FLOORS.filter(f=>f.flag_note).length},
          {icon:'👥',label:'Safety Committee',            value:SAFETY_COMMITTEE.active?'Active':'Required'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>👥</span>
        <div style={{flex:1,minWidth:200}}><strong>Section 74 Compliance, Tracked Not Assumed:</strong> Last inspection {SAFETY_COMMITTEE.last_inspection}, next due {SAFETY_COMMITTEE.next_due} -- the Safety and Health Committee's cadence is a legal requirement at this headcount, not an optional best practice.</div>
      </div>

      <div style={{display:'grid',gap:16}}>
        {FLOORS.map((f,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.floor,...f,impact_links:['Meeting Room Booking']}})}}
            style={{background:'#fff',border:`1px solid ${f.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{f.floor}</div>
              <span style={{fontSize:10,fontWeight:700,color:f.occupancy_pct>85?'#dc2626':A}}>{f.occupancy_pct}% occupied</span>
            </div>
            <div style={{height:9,background:'#f1f5f9',borderRadius:9,overflow:'hidden'}}><div style={{width:`${f.occupancy_pct}%`,height:'100%',background:f.occupancy_pct>85?'#ef4444':A,borderRadius:9}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:10}}>
              <div style={{fontSize:8,color:'#94a3b8'}}>🪑 {f.desks_free}/{f.desks_total} free</div>
              <div style={{fontSize:8,color:'#94a3b8'}}>🌡 {f.temp_c}°C</div>
              <div style={{fontSize:8,color:'#94a3b8'}}>💧 {f.humidity_pct}% humidity</div>
            </div>
            {f.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {f.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Live IoT sensors feed temperature, humidity, and occupancy -- never a manual walk-through count.','Weight-lifting tasks routed through Helpdesk auto-check against the 55kg/45kg statutory caps before assignment.','Preventive maintenance schedules generate from actual usage patterns, not a fixed annual calendar.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Floor Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
