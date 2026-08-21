// FILE: StationeryInventoryPage.jsx - Stationery Inventory
// (Finance, Assets & Administration > Asset & Inventory)
// Consumable goods, not allocated assets -- stock levels, reorder
// thresholds, request fulfillment. Genuinely different lifecycle from
// IT/Furniture: no individual serial tracking, just quantity-on-hand.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const STOCK_ITEMS = [
  {item:'A4 Paper Reams',qty:340,reorder_threshold:100,unit:'reams',c:'#10b981'},
  {item:'Ballpoint Pens',qty:62,reorder_threshold:80,unit:'pcs',c:'#f59e0b',flag_note:'Below reorder threshold -- restock recommended.'},
  {item:'Sticky Notes',qty:18,reorder_threshold:50,unit:'pads',c:'#ef4444',flag_note:'Critical low stock.'},
  {item:'Printer Toner (Black)',qty:9,reorder_threshold:5,unit:'cartridges',c:'#10b981'},
]

export default function StationeryInventoryPage() {
  const [showRequest, setShowRequest] = useState(false)
  const [ctx, setCtx] = useState(null)

  const lowStockCount = STOCK_ITEMS.filter(s=>s.qty<s.reorder_threshold).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="✏️" title="Stationery Inventory"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'✏️',label:'Stock Items',  value:STOCK_ITEMS.length},
          {icon:'⚠',label:'Below Threshold', value:lowStockCount},
          {icon:'🔄',label:'Auto-Reorder',       value:'Enabled'},
          {icon:'📦',label:'Last Restock',          value:'2025-06-12'},
        ]}
        onAdd={()=>setShowRequest(true)} addLabel="Request Stationery"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📊</span>
        <div style={{flex:1,minWidth:200}}><strong>Consumables, Not Allocations:</strong> Stationery is tracked by quantity-on-hand, never individually serialized -- the focus here is stock levels and reorder timing, not who has which pen.</div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {STOCK_ITEMS.map((s,i)=>{
          const pct = Math.min(Math.round(s.qty/(s.reorder_threshold*2)*100),100)
          return (
            <div key={i}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.item,...s,impact_links:['Vendor Management']}})}}
              style={{background:'#fff',border:`1px solid ${s.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{s.item}</div>
                <div style={{fontSize:11,fontWeight:800,color:s.c}}>{s.qty} {s.unit}</div>
              </div>
              <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:s.c,borderRadius:7}}/></div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:6}}>Reorder threshold: {s.reorder_threshold} {s.unit}</div>
              {s.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {s.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {showRequest&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowRequest(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(440px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Request Stationery</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Item" type="select" value="" onChange={()=>{}} accent={A} options={STOCK_ITEMS.map(s=>s.item)}/>
              <Field label="Quantity" type="number" value="" onChange={()=>{}} accent={A} required/>
              <button onClick={()=>setShowRequest(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Items crossing the reorder threshold auto-generate a purchase request to Vendor Management -- never a manual stock-out surprise.','Consumption patterns by department flag over-requesting before it becomes wasted capital.','Bulk Excel upload supports a full physical stock-count reconciliation in one pass.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View History',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
