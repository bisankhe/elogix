// FILE: ITInventoryPage.jsx - IT Inventory
// (Finance, Assets & Administration > Asset & Inventory)
// Category-filtered view over the NEW asset_items table (category =
// 'it_equipment'). Serial number, assigned employee, condition,
// warranty status -- all in one row.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const STATUS_CFG = { assigned:{c:'#10b981',label:'Assigned'},available:{c:'#94a3b8',label:'Available'},repair:{c:'#f59e0b',label:'In Repair'},retired:{c:'#ef4444',label:'Retired'} }

const IT_ITEMS = [
  { id:'i1', tag:'IT-LT-0042', item:'MacBook Pro 14" M3', serial:'C02XJ8K2Q6LR', status:'assigned', assigned_to:'Hari Thapa', condition:'Good', warranty_until:'2027-03-15' },
  { id:'i2', tag:'IT-MN-0118', item:'Dell UltraSharp 27" Monitor', serial:'CN-0K8M2P-PFD', status:'available', assigned_to:null, condition:'New', warranty_until:'2028-01-10' },
  { id:'i3', tag:'IT-LT-0019', item:'ThinkPad X1 Carbon', serial:'PF3JX9KL', status:'repair', assigned_to:'Bikash Rai', condition:'Screen flicker reported', warranty_until:'2025-08-20',
    flag_note:'Warranty expires in 53 days -- prioritize repair claim before it lapses.' },
]

export default function ITInventoryPage() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = IT_ITEMS.filter(i=>!search||i.item.toLowerCase().includes(search.toLowerCase())||i.tag.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="💻" title="IT Inventory"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'💻',label:'Total IT Assets',  value:IT_ITEMS.length},
          {icon:'✅',label:'Assigned',             value:IT_ITEMS.filter(i=>i.status==='assigned').length},
          {icon:'🔧',label:'In Repair',                value:IT_ITEMS.filter(i=>i.status==='repair').length},
          {icon:'⚠',label:'Warranty Risk',                value:IT_ITEMS.filter(i=>i.flag_note).length},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="Add IT Asset"/>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by asset tag or item..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden',overflowX:'auto',marginTop:14}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:700}}>
          <thead><tr style={{background:'#f8fafc'}}>
            {['Asset Tag','Item','Serial','Status','Assigned To','Condition'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:A}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(i=>{
              const sc = STATUS_CFG[i.status]
              return (
                <tr key={i.id} style={{borderBottom:'1px solid #f8fafc'}}
                  onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:i.item,...i,impact_links:['Warranty Tracking','Asset Allocation']}})}}>
                  <td style={{padding:'9px 12px',fontWeight:700,color:'#0f172a'}}>{i.tag}</td>
                  <td style={{padding:'9px 12px',color:'#374151'}}>{i.item}</td>
                  <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:9}}>{i.serial}</td>
                  <td style={{padding:'9px 12px'}}><span style={{background:`${sc.c}15`,color:sc.c,fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span></td>
                  <td style={{padding:'9px 12px',color:'#64748b'}}>{i.assigned_to||'--'}</td>
                  <td style={{padding:'9px 12px',color:i.flag_note?'#b45309':'#64748b',fontSize:9}}>{i.condition}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Add IT Asset</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Item Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Serial Number" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Vendor" value="" onChange={()=>{}} accent={A}/>
              <Field label="Warranty Until" type="date" value="" onChange={()=>{}} accent={A}/>
              <button onClick={()=>setShowAdd(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Add to Inventory -- Generate QR</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['A QR code generates automatically the moment an asset is added -- never a manual labeling step.','Serial numbers cross-check against vendor records to flag potential counterfeit or grey-market hardware.','Assets flagged for repair link directly to Warranty Tracking to check coverage before any out-of-pocket spend.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'📱',label:'View QR Code',key:'qr'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
