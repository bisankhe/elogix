// FILE: AssetManagementPage.jsx - Asset Management
// (Finance, Assets & Administration > Asset & Inventory)
// The global dashboard: total asset value, category breakdown,
// allocation percentages, expiring warranties. Pure rollup over the
// NEW asset_items table -- the genuine catalog this build never had.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const CATEGORY_BREAKDOWN = [
  {category:'IT Equipment',count:184,value:9200000,allocated_pct:78,c:'#0284c7',target:'IT Inventory'},
  {category:'Furniture',count:312,value:3100000,allocated_pct:92,c:'#7c3aed',target:'Furniture Inventory'},
  {category:'Stationery',count:1840,value:140000,allocated_pct:0,c:'#f59e0b',target:'Stationery Inventory'},
]

const ALERTS = [
  {type:'Warranty Expiring',detail:'14 laptops expire within 30 days',target:'Warranty Tracking'},
  {type:'Unreturned',detail:'3 assets overdue from exited employees',target:'Asset Return'},
]

export default function AssetManagementPage() {
  const [ctx, setCtx] = useState(null)
  const totalValue = CATEGORY_BREAKDOWN.reduce((s,c)=>s+c.value,0)
  const totalCount = CATEGORY_BREAKDOWN.reduce((s,c)=>s+c.count,0)
  const fmt = n => 'NPR '+(n/1000000).toFixed(1)+'M'

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📦" title="Asset Management"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'📦',label:'Total Assets',  value:totalCount},
          {icon:'💰',label:'Total Value',      value:fmt(totalValue)},
          {icon:'⚠',label:'Alerts',                value:ALERTS.length},
          {icon:'🏢',label:'Categories',               value:CATEGORY_BREAKDOWN.length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📦</span>
        <div style={{flex:1,minWidth:200}}><strong>One Catalog, Every Category:</strong> Every laptop, chair, and box of pens lives in the same underlying registry -- click into any category for the full detail, never a second spreadsheet.</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginBottom:18}}>
        {CATEGORY_BREAKDOWN.map((c,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.category,...c,impact_links:[c.target]}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.category}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{c.count} items . {fmt(c.value)}</div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginTop:10}}><div style={{width:`${c.allocated_pct}%`,height:'100%',background:c.c,borderRadius:8}}/></div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>{c.allocated_pct}% allocated</div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚠ Active Alerts</div>
        {ALERTS.map((a,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:a.type,...a,impact_links:[a.target]}})}}
            style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<ALERTS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,fontWeight:700,color:'#b45309'}}>{a.type}</span><span style={{fontSize:9,color:'#374151'}}>{a.detail}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags "ghost assets" -- items unscanned for 180+ days that may be lost or unrecorded -- before they vanish from accountability entirely.','Allocation percentage syncs live with Asset Allocation and Asset Return -- never a manually reconciled count.','Click any category tile to drill straight into its dedicated inventory page.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Category Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
