// FILE: RouteMonitoringPage.jsx - Route Monitoring
// (System Administration > Integration & API > Mobile App Configuration)
// The continuous breadcrumb trail -- distinct from GPS Tracking (the
// polling config) and Field Visit Tracking (the discrete visit log).
// Trust-building "Privacy Mode" is the centerpiece, not an
// afterthought: the brief is explicit that breadcrumb tracking can
// trigger resentment, so the pause control and an ambiguous-detour
// annotation flow are surfaced directly, never buried in settings.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const TODAY_ROUTE = [
  {time:'9:02 AM',location:'Client A -- Thamel Office',duration:'42 min'},
  {time:'10:05 AM',location:'In Transit',duration:'18 min'},
  {time:'10:23 AM',location:'Lunch Break -- Privacy Mode Active',duration:'35 min',privacy_paused:true},
  {time:'11:10 AM',location:'Client B -- Patan Showroom',duration:'55 min'},
  {time:'12:30 PM',location:'Unscheduled Detour -- 14 min',duration:'14 min',flag_note:'Route deviated from the planned path -- could be traffic, could be a personal errand. Employee can annotate the reason directly; nobody assumes the worst from raw GPS data alone.'},
]

export default function RouteMonitoringPage() {
  const [privacyMode, setPrivacyMode] = useState(false)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗺" title="Route Monitoring"
        breadcrumb="System Administration > Integration & API > Mobile App Configuration"
        gradient={G}
        stats={[
          {icon:'🗺',label:'Stops Today',  value:TODAY_ROUTE.length},
          {icon:'⏱',label:'Total Tracked Time',   value:'2h 24m'},
          {icon:'🔍',label:'Unannotated Detours',      value:TODAY_ROUTE.filter(r=>r.flag_note).length},
          {icon:'🔒',label:'Privacy Mode',                 value:privacyMode?'Active':'Off'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:18}}>🔒</span>
          <div style={{fontSize:11,color:'#581c87',maxWidth:380}}><strong>Tracking only runs during working hours.</strong> Pause it any time for a personal errand -- nobody sees it, nobody asks about it.</div>
        </div>
        <button onClick={()=>setPrivacyMode(p=>!p)}
          style={{padding:'9px 18px',borderRadius:10,background:privacyMode?'#7c3aed':'#fff',color:privacyMode?'#fff':'#7c3aed',
            fontSize:10,fontWeight:700,cursor:'pointer',border:privacyMode?'none':'1px solid #e9d5ff',flexShrink:0}}>
          {privacyMode?'🔒 Privacy Mode ON':'Pause Tracking'}
        </button>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📍 Today's Breadcrumb Trail</div>
        {TODAY_ROUTE.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.location,...r,impact_links:['Field Visit Tracking']}})}}
            style={{display:'flex',gap:14,paddingBottom:16,position:'relative'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:r.flag_note?'#f59e0b':r.privacy_paused?'#94a3b8':A,flexShrink:0}}/>
              {i<TODAY_ROUTE.length-1&&<div style={{width:2,flex:1,background:'#f1f5f9',marginTop:4}}/>}
            </div>
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <span style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{r.location}</span>
                <span style={{fontSize:9,color:'#94a3b8'}}>{r.time} . {r.duration}</span>
              </div>
              {r.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>ℹ {r.flag_note}</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Ambiguous detours get an annotation field, not an automatic flag -- the employee explains the gap in their own words before anyone else interprets it.','Privacy Mode is a real pause, not a cosmetic toggle -- no location data is captured or stored while it\'s active.','Managers see the route as a trust tool for safety and planning, never a surveillance feed to second-guess every stop.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
