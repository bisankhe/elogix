// FILE: IDCardManagementPage.jsx - ID Card Management
// (Finance, Assets & Administration > Administrative Operations)
// Permanent employee badges -- reuses the EXISTING universal qr_codes
// registry (qr_type = 'employee_badge', already supported). Section 9
// record fields + outsourced-vs-direct flag for audit-path clarity.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const BADGES = [
  {employee:'Hari Thapa',designation:'Software Engineer II',type:'direct',status:'active',issued:'2023-03-01'},
  {employee:'Bikash Rai',designation:'Software Engineer I',type:'direct',status:'active',issued:'2024-01-15'},
  {employee:'Ramesh Tamang',designation:'Shuttle Driver',type:'outsourced',status:'active',issued:'2024-06-10',
   flag_note:'Outsourced personnel -- flagged for separate benefits compliance audit path.'},
  {employee:'Maya Pradhan',designation:'Standing Desk Specialist',type:'direct',status:'deactivated',issued:'2022-08-01',
   flag_note:'Deactivated -- final settlement completed 2025-06-20.'},
]

export default function IDCardManagementPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = BADGES.filter(b=>!search||b.employee.toLowerCase().includes(search.toLowerCase()))
  const outsourcedCount = BADGES.filter(b=>b.type==='outsourced').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🪪" title="ID Card Management"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'🪪',label:'Active Badges',  value:BADGES.filter(b=>b.status==='active').length},
          {icon:'🏭',label:'Outsourced Flagged',  value:outsourcedCount},
          {icon:'🔴',label:'Deactivated',             value:BADGES.filter(b=>b.status==='deactivated').length},
          {icon:'📱',label:'Digital Wallet',               value:'Available'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Section 9 Records, Direct vs Outsourced:</strong> Every badge ties to a full employee profile -- name, designation, employment nature -- with outsourced personnel clearly flagged for their own benefits-compliance audit path.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((b,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:b.employee,...b}})}}
            style={{background:'#fff',border:`1px solid ${b.status==='deactivated'?'#e2e8f0':b.type==='outsourced'?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,opacity:b.status==='deactivated'?.6:1}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{b.employee}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{b.designation} . Issued {b.issued}</div>
              {b.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {b.flag_note}</div>}
            </div>
            <div style={{display:'flex',gap:6}}>
              {b.type==='outsourced'&&<span style={{background:'#fff7ed',color:'#c2410c',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>Outsourced</span>}
              <span style={{background:b.status==='active'?'#f0fdf4':'#f8fafc',color:b.status==='active'?'#15803d':'#94a3b8',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{b.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Digital badge generates automatically the moment onboarding completes -- no separate print request to remember.','Deactivation on exit happens instantly and irreversibly the moment final settlement clears, never left active by accident.','Add the badge to a mobile wallet for tap-based building access -- the physical card becomes a backup, not the only option.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Profile',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
