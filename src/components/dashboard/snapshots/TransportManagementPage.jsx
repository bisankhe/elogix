// FILE: TransportManagementPage.jsx - Transport Management
// (Finance, Assets & Administration > Administrative Operations)
// Daily shuttle routes, ad-hoc cab booking. Section 33: mandatory
// employer-provided transit for female employees whose shift starts
// before sunrise or ends after sunset -- enforced, not optional.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const SHUTTLE_ROUTES = [
  {route:'Baneshwor -- Office Express',departure:'8:15 AM',riders:18,capacity:20,driver:'Ramesh Tamang'},
  {route:'Lalitpur -- Office Express',departure:'8:30 AM',riders:12,capacity:20,driver:'Suresh Karki'},
  {route:'Evening Return -- All Routes',departure:'6:00 PM',riders:24,capacity:40,driver:'Multiple',
   flag_note:'3 female employees on shift past sunset -- transport mandatory per Section 33, auto-confirmed.'},
]

export default function TransportManagementPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = SHUTTLE_ROUTES.filter(r=>!search||r.route.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🚌" title="Transport Management"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'🚌',label:'Active Routes',  value:SHUTTLE_ROUTES.length},
          {icon:'👥',label:'Today\'s Riders',     value:SHUTTLE_ROUTES.reduce((s,r)=>s+r.riders,0)},
          {icon:'⚖',label:'Section 33 Triggers',      value:SHUTTLE_ROUTES.filter(r=>r.flag_note).length},
          {icon:'🩹',label:'First-Aid Equipped',          value:'All Vehicles'},
        ]}
        onAdd={()=>{}} addLabel="Request Ad-Hoc Cab"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Section 33, Enforced Not Optional:</strong> Female employees on a shift starting before sunrise or ending after sunset get round-trip transport automatically confirmed -- never something they have to request or be denied.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search routes..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((r,i)=>{
          const pct = Math.round(r.riders/r.capacity*100)
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.route,...r}})}}
              style={{background:'#fff',border:`1px solid ${r.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.route}</div>
                <span style={{fontSize:10,fontWeight:700,color:A}}>{r.departure}</span>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:A,borderRadius:7}}/></div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>{r.riders}/{r.capacity} riders . Driver: {r.driver}</div>
              {r.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#3730a3'}}>⚖ {r.flag_note}</div>}
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Routes dynamically adjust based on live traffic and rider locations, not a static fixed schedule.','Driver overtime auto-calculates at the 1.5x statutory rate the moment they exceed standard daily hours.','Vehicle first-aid kit checks are logged as part of routine facility maintenance, never assumed.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Route',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
