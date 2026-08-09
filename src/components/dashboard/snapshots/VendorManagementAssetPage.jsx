// FILE: VendorManagementAssetPage.jsx - Vendor Management (Asset & Inventory)
// (Finance, Assets & Administration > Asset & Inventory)
// Procurement vendors (hardware/furniture/stationery suppliers) --
// deliberately distinct from the EXISTING "Vendor Management" sidebar
// group, which covers staffing/outsourcing agencies supplying contract
// workers. Genuinely different vendor relationship, genuinely
// different table. RFQ -> Order Placed -> In Transit -> Received kanban.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const STAGES = ['RFQ','Order Placed','In Transit','Received']

const PROCUREMENT_VENDORS = [
  {id:'v1',vendor:'Lenovo Nepal',category:'IT Equipment',order:'24x ThinkPad refresh',stage_idx:2,value:2880000},
  {id:'v2',vendor:'Himalayan Office Supplies',category:'Stationery',order:'Quarterly A4 paper + toner restock',stage_idx:3,value:84000},
  {id:'v3',vendor:'WorkSpace Furnishings',category:'Furniture',order:'18x ergonomic chairs',stage_idx:0,value:540000,
   flag_note:'RFQ outstanding for 9 days -- follow up recommended.'},
]

export default function VendorManagementAssetPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = PROCUREMENT_VENDORS.filter(v=>!search||v.vendor.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🏭" title="Vendor Management"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'🏭',label:'Active Vendors',  value:PROCUREMENT_VENDORS.length},
          {icon:'📦',label:'Orders In Progress', value:PROCUREMENT_VENDORS.filter(v=>v.stage_idx<3).length},
          {icon:'⚠',label:'Needs Follow-up',         value:PROCUREMENT_VENDORS.filter(v=>v.flag_note).length},
          {icon:'💰',label:'Total Order Value',          value:'NPR '+(PROCUREMENT_VENDORS.reduce((s,v)=>s+v.value,0)/1000).toFixed(0)+'K'},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="New Order"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🏭</span>
        <div style={{flex:1,minWidth:200}}><strong>Procurement Vendors, Not Staffing Agencies:</strong> This tracks the companies that supply your hardware, furniture, and stationery -- a separate relationship from the outsourcing/manpower vendors tracked elsewhere in this system.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search vendors..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(v=>(
          <div key={v.id}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:v.vendor,...v,impact_links:['IT Inventory','Furniture Inventory']}})}}
            style={{background:'#fff',border:`1px solid ${v.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{v.vendor}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{v.category} . {v.order}</div>
              </div>
              <div style={{fontSize:12,fontWeight:900,color:A}}>NPR {(v.value/1000).toFixed(0)}K</div>
            </div>
            <div style={{display:'flex',gap:4}}>
              {STAGES.map((s,i)=>(
                <div key={s} style={{flex:1,textAlign:'center'}}>
                  <div style={{height:6,borderRadius:6,background:i<=v.stage_idx?A:'#f1f5f9'}}/>
                  <div style={{fontSize:7,color:i<=v.stage_idx?A:'#94a3b8',fontWeight:i===v.stage_idx?700:400,marginTop:4}}>{s}</div>
                </div>
              ))}
            </div>
            {v.flag_note&&<div style={{marginTop:10,fontSize:9,color:'#b45309'}}>⚠ {v.flag_note}</div>}
          </div>
        ))}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>New Procurement Order</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Vendor" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Category" type="select" value="" onChange={()=>{}} accent={A} options={['IT Equipment','Furniture','Stationery']}/>
              <Field label="Order Description" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Create RFQ</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['RFQs outstanding for 7+ days auto-flag for follow-up -- never a quietly stalled procurement.','Received items auto-generate QR-tagged catalog entries in the right inventory page, no manual re-entry.','Auto-renewal subscriptions and SLA terms surface 30 days ahead, preventing hidden cost surprises.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Order',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
