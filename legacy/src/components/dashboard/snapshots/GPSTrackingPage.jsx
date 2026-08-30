// FILE: GPSTrackingPage.jsx - GPS Tracking
// (System Administration > Integration & API > Mobile App Configuration)
// The location-polling CONFIG layer -- distinct from the EXISTING
// MobileAttendanceTrackingPage (the ESS check-in screen, which already
// uses GPS for geofence validation at a single moment) and
// RouteMonitoringPage (the continuous breadcrumb trail). This page
// governs polling frequency, battery-aware intervals, and the work-
// hours-only privacy boundary that EVERY other location feature reads from.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const POLLING_PROFILES = [
  {role:'Field Sales',interval_seconds:60,battery_impact:'Medium',active_during:'Work hours only (8am-6pm)'},
  {role:'Delivery Driver',interval_seconds:30,battery_impact:'High',active_during:'Work hours only (clock-in to clock-out)'},
  {role:'Office Staff',interval_seconds:0,battery_impact:'None',active_during:'Not tracked -- GPS disabled by default'},
]

const DEVICE_HEALTH = [
  {employee:'Sunil Magar',device:'Android . Battery 41%',last_ping:'3 min ago',status:'healthy'},
  {employee:'Maya Pradhan',device:'iOS . Battery 12%',last_ping:'47 min ago',status:'stale',
   flag_note:'No location ping in 47 minutes -- likely low battery or signal loss, not necessarily a missed visit. Flag for manual check, never an automatic disciplinary mark.'},
]

export default function GPSTrackingPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📍" title="GPS Tracking"
        breadcrumb="System Administration > Integration & API > Mobile App Configuration"
        gradient={G}
        stats={[
          {icon:'📍',label:'Roles Tracked',  value:POLLING_PROFILES.filter(p=>p.interval_seconds>0).length},
          {icon:'🔋',label:'Avg Battery Impact', value:'Medium'},
          {icon:'⚠',label:'Stale Devices',           value:DEVICE_HEALTH.filter(d=>d.status==='stale').length},
          {icon:'🔒',label:'Tracking Window',            value:'Work Hours Only'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1,minWidth:200}}><strong>Off the Clock, Off the Map:</strong> Location polling is hard-bound to active work hours -- the device's GPS isn't queried before clock-in or after clock-out, never an opt-out toggle someone has to remember to use.</div>
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📡 Polling Profiles by Role</div>
        {POLLING_PROFILES.map((p,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.role,...p,impact_links:['Route Monitoring']}})}}
            style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<POLLING_PROFILES.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{p.role}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{p.active_during}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:9,color:'#374151'}}>{p.interval_seconds>0?`Every ${p.interval_seconds}s`:'Disabled'}</div>
              <div style={{fontSize:8,color:'#94a3b8'}}>Battery impact: {p.battery_impact}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📱 Device Health</div>
        {DEVICE_HEALTH.map((d,i)=>(
          <div key={i} style={{padding:'10px 0',borderBottom:i<DEVICE_HEALTH.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <span style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{d.employee}</span>
              <span style={{fontSize:8,color:d.status==='healthy'?'#15803d':'#b45309'}}>{d.status==='healthy'?'🟢 Healthy':'🟡 Stale'}</span>
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{d.device} . Last ping: {d.last_ping}</div>
            {d.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {d.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Polling interval auto-adjusts when battery drops below 20% -- coverage continuity over draining a phone dead by 3pm.','A stale device never auto-flags as a missed visit -- weak signal and a skipped task look identical from raw GPS data alone, so this stays a manual check.','Offline check-ins queue locally and sync automatically the moment signal returns -- never a lost record from a rural dead zone.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
