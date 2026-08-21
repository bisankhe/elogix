// FILE: FurnitureInventoryPage.jsx - Furniture Inventory
// (Finance, Assets & Administration > Asset & Inventory)
// Same NEW asset_items catalog, category = 'furniture'. Location
// tracking is the emphasis here -- the brief's "scattered storage
// locations" pain point -- not just assignment status.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const FURNITURE_ITEMS = [
  {id:'f1',tag:'FUR-CH-0203',item:'Ergonomic Office Chair',location:'IT Floor 3 -- Desk 14',status:'assigned',assigned_to:'Gita Maharjan',condition:'Good'},
  {id:'f2',tag:'FUR-DK-0091',item:'Standing Desk',location:'Storage Room B',status:'available',assigned_to:null,condition:'Good'},
  {id:'f3',tag:'FUR-CB-0044',item:'4-Drawer Filing Cabinet',location:'Unknown -- last seen Floor 2',status:'available',assigned_to:null,condition:'Unverified',
   flag_note:'Location not confirmed in last audit cycle -- flagged for physical verification.'},
]

export default function FurnitureInventoryPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = FURNITURE_ITEMS.filter(f=>!search||f.item.toLowerCase().includes(search.toLowerCase()))
  const unverifiedCount = FURNITURE_ITEMS.filter(f=>f.flag_note).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🪑" title="Furniture Inventory"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'🪑',label:'Total Furniture',  value:FURNITURE_ITEMS.length},
          {icon:'✅',label:'Assigned',             value:FURNITURE_ITEMS.filter(f=>f.status==='assigned').length},
          {icon:'⚠',label:'Unverified Location',      value:unverifiedCount},
          {icon:'📍',label:'Tracked Locations',           value:[...new Set(FURNITURE_ITEMS.map(f=>f.location.split(' -- ')[0]))].length},
        ]}
        onAdd={()=>{}} addLabel="Add Furniture"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📍</span>
        <div style={{flex:1,minWidth:200}}><strong>Location, Not Just Status:</strong> Furniture moves between floors and storage rooms more than IT equipment does -- this view tracks exactly where each item physically is, not just who it's assigned to.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search furniture items..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(f=>(
          <div key={f.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.item,...f,impact_links:['Asset Allocation']}})}}
            style={{background:'#fff',border:`1px solid ${f.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{f.item}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{f.tag} . 📍 {f.location}</div>
              {f.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {f.flag_note}</div>}
            </div>
            <span style={{background:f.assigned_to?'#f0fdf4':'#f8fafc',color:f.assigned_to?'#15803d':'#64748b',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{f.assigned_to||'Available'}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['QR scan during a physical audit auto-updates the location field -- no manual spreadsheet reconciliation.','Items unverified for 2+ audit cycles flag here before they\'re quietly written off as shrinkage.','Over/under-stocking patterns surface by floor or department, guiding smarter future procurement.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'📱',label:'Scan to Verify Location',key:'scan'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
