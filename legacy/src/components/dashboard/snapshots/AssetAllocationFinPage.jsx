// FILE: AssetAllocationFinPage.jsx - Asset Allocation (Asset & Inventory)
// (Finance, Assets & Administration > Asset & Inventory)
// Distinct from the EXISTING AssetAllocationPage (Employee Joining,
// onboarding logistics: shipping preferences, signed receipt). This
// is the ONGOING allocation hub -- assign any catalog item to any
// employee, any time, not just at hire.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const ACTIVE_ALLOCATIONS = [
  {id:'al1',item:'MacBook Pro 14" M3',tag:'IT-LT-0042',employee:'Hari Thapa',allocated_date:'2025-01-15',acknowledged:true},
  {id:'al2',item:'Ergonomic Office Chair',tag:'FUR-CH-0203',employee:'Gita Maharjan',allocated_date:'2025-03-02',acknowledged:true},
  {id:'al3',item:'Dell UltraSharp 27" Monitor',tag:'IT-MN-0091',employee:'Sunil Magar',allocated_date:'2025-06-25',acknowledged:false,
   flag_note:'Awaiting employee acknowledgment via signed digital receipt.'},
]

export default function AssetAllocationFinPage() {
  const [search, setSearch] = useState('')
  const [showAllocate, setShowAllocate] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = ACTIVE_ALLOCATIONS.filter(a=>!search||a.employee.toLowerCase().includes(search.toLowerCase())||a.item.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Asset Allocation"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'📋',label:'Active Allocations',  value:ACTIVE_ALLOCATIONS.length},
          {icon:'⏳',label:'Awaiting Acknowledgment', value:ACTIVE_ALLOCATIONS.filter(a=>!a.acknowledged).length},
          {icon:'✅',label:'Acknowledged',                value:ACTIVE_ALLOCATIONS.filter(a=>a.acknowledged).length},
          {icon:'🔗',label:'Linked to Onboarding',           value:'Auto-Synced'},
        ]}
        onAdd={()=>setShowAllocate(true)} addLabel="Allocate Asset"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>Beyond Day One:</strong> New-hire allocations happen automatically during onboarding -- this hub is for everything after: replacements, upgrades, ad-hoc requests, any time during someone's tenure.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee or item..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(a=>(
          <div key={a.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.item,...a,impact_links:['IT Inventory','Asset Return']}})}}
            style={{background:'#fff',border:`1px solid ${a.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{a.item}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{a.tag} {'>'} {a.employee} . {a.allocated_date}</div>
              {a.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {a.flag_note}</div>}
            </div>
            <span style={{background:a.acknowledged?'#f0fdf4':'#fffbeb',color:a.acknowledged?'#15803d':'#b45309',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{a.acknowledged?'Acknowledged':'Pending'}</span>
          </div>
        ))}
      </div>

      {showAllocate&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAllocate(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Allocate Asset</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Asset (scan QR or search)" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Assign To" value="" onChange={()=>{}} accent={A} required/>
              <button onClick={()=>setShowAllocate(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Allocate &amp; Notify</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Allocating an item here instantly marks it unavailable in IT/Furniture Inventory -- never a double-booked asset.','Both the employee and their manager are notified the moment an asset is assigned to them.','Unacknowledged allocations auto-remind after 3 days, never silently stuck.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
