// FILE: WarrantyTrackingPage.jsx - Warranty Tracking
// (Finance, Assets & Administration > Asset & Inventory)
// Pure UI over the EXISTING asset_items.warranty_until column --
// never a separate warranty table. Multi-tier expiry alerts (90/60/30
// day), mirroring the proven pattern from Certificate Generation.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const TIER_CFG = { expired:{c:'#ef4444',label:'Expired'},critical:{c:'#ef4444',label:'< 30 Days'},warning:{c:'#f59e0b',label:'< 90 Days'},healthy:{c:'#10b981',label:'Healthy'} }

const WARRANTY_ITEMS = [
  {item:'ThinkPad X1 Carbon',tag:'IT-LT-0019',vendor:'Lenovo Nepal',expires:'2025-08-20',days_left:53,tier:'critical'},
  {item:'Dell UltraSharp 27" Monitor',tag:'IT-MN-0118',vendor:'Dell Authorized Reseller',expires:'2025-10-05',days_left:99,tier:'warning'},
  {item:'MacBook Pro 14" M3',tag:'IT-LT-0042',vendor:'iStore Nepal',expires:'2027-03-15',days_left:624,tier:'healthy'},
]

export default function WarrantyTrackingPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = WARRANTY_ITEMS.filter(w=>!search||w.item.toLowerCase().includes(search.toLowerCase()))
  const atRiskCount = WARRANTY_ITEMS.filter(w=>w.tier==='critical'||w.tier==='warning').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛡" title="Warranty Tracking"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'🛡',label:'Tracked Warranties',  value:WARRANTY_ITEMS.length},
          {icon:'⚠',label:'At Risk (< 90 Days)',      value:atRiskCount},
          {icon:'🔴',label:'Critical (< 30 Days)',         value:WARRANTY_ITEMS.filter(w=>w.tier==='critical').length},
          {icon:'✅',label:'Healthy',                          value:WARRANTY_ITEMS.filter(w=>w.tier==='healthy').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Lapsed Coverage Becomes Out-of-Pocket Cost:</strong> The Labour Act requires safe, functional equipment -- a missed warranty window means any future repair comes straight out of the budget instead of the vendor's.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by item or tag..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((w,i)=>{
          const tc = TIER_CFG[w.tier]
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:w.item,...w,impact_links:['Vendor Management','IT Inventory']}})}}
              style={{background:'#fff',border:`1.5px solid ${tc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${tc.c}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{w.item}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{w.tag} . Vendor: {w.vendor}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <span style={{background:`${tc.c}15`,color:tc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{tc.label}</span>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Expires {w.expires}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Alerts fire at 90, 60, and 30 days before expiry -- the same multi-tier pattern proven across this build\'s other compliance trackers.','AI prescribes replacement timing based on asset health and utilization, before a warranty lapse forces a reactive decision.','Renewal or replacement requests route straight to Vendor Management with full context attached.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
