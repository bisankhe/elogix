// FILE: MobileAppConfigOverviewPage.jsx - Mobile App Configuration (overview)
// (System Administration > Integration & API)
// The landing page for the 'mobile-configuration' sidebar entry --
// confirmed before building that this was a genuine dead end (a real
// sidebar leaf, not a section header, with no backing page at all).
// Pure navigation hub linking to the 6 dedicated sub-pages, never
// duplicating any of their content.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const SUB_PAGES = [
  {icon:'📱',label:'Mobile Attendance',target:'mobile-attendance',desc:'Biometric/facial check-in, geofence validation, offline caching'},
  {icon:'📍',label:'GPS Tracking',target:'gps-tracking-config',desc:'Polling profiles, battery-aware intervals, device health'},
  {icon:'🛡',label:'Geo-Fencing',target:'geo-fencing-mobile-config',desc:'Virtual perimeter setup per location'},
  {icon:'🚗',label:'Field Visit Tracking',target:'field-visit-tracking-cfg',desc:'Pre-travel request, mileage TA, tiered DA, approvals'},
  {icon:'🗺',label:'Route Monitoring',target:'route-monitoring',desc:'Breadcrumb trail, Privacy Mode, detour annotation'},
  {icon:'✅',label:'Field Task Management',target:'field-task-management',desc:'Kanban tasks, photo/signature evidence capture'},
]

export default function MobileAppConfigOverviewPage() {
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📲" title="Mobile App Configuration"
        breadcrumb="System Administration > Integration & API"
        gradient={G}
        stats={[
          {icon:'📲',label:'Configuration Areas',  value:SUB_PAGES.length},
          {icon:'🔌',label:'Devices Connected',         value:'48'},
          {icon:'🔋',label:'Avg Battery Impact',            value:'Medium'},
          {icon:'🔒',label:'Privacy-First Design',              value:'Enabled'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:18,fontSize:11,color:'#334155',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📲</span>
        <div style={{flex:1,minWidth:200}}><strong>One Mobile App, Six Configuration Areas:</strong> Every setting that governs the field-employee mobile experience -- attendance, location, tasks -- lives in one of these six dedicated pages.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>
        {SUB_PAGES.map((s,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.label,...s}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px',cursor:'pointer'}}>
            <div style={{fontSize:24,marginBottom:10}}>{s.icon}</div>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{s.label}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Click any card to jump straight into its dedicated configuration page -- never a buried setting three clicks deep.','Settings here apply instantly to every connected mobile device -- never a separate app update or deployment cycle.','iOS and Android quirks are handled per-platform automatically, never a one-size-fits-all config that breaks on half your fleet.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={[]} actions={[
        {icon:'👁',label:'Open Configuration',key:'view'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
