// FILE: QRBarcodeTrackingPage.jsx - QR or Barcode Tracking
// (Finance, Assets & Administration > Asset & Inventory)
// Mobile-first scanner interface -- the single entry point linking a
// physical scan to the asset_items catalog. Every asset across IT,
// Furniture, and Stationery gets a QR code generated here, following
// the same verify_qr_code pattern already used for certificates.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const RECENT_SCANS = [
  {tag:'IT-LT-0042',item:'MacBook Pro 14" M3',action:'Audit Verification',time:'2 min ago',by:'Facilities Admin'},
  {tag:'FUR-CH-0203',item:'Ergonomic Office Chair',action:'Location Update',time:'1 hour ago',by:'Gita Maharjan'},
  {tag:'IT-LT-0019',item:'ThinkPad X1 Carbon',action:'Repair Check-in',time:'Yesterday',by:'IT Support'},
]

export default function QRBarcodeTrackingPage() {
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = RECENT_SCANS.filter(s=>!search||s.item.toLowerCase().includes(search.toLowerCase())||s.tag.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📱" title="QR or Barcode Tracking"
        breadcrumb="Finance, Assets & Administration > Asset & Inventory"
        gradient={G}
        stats={[
          {icon:'📱',label:'Scans Today',  value:RECENT_SCANS.length},
          {icon:'🏷',label:'Tagged Assets',    value:'2,336'},
          {icon:'⏱',label:'Avg Scan Time',         value:'1.2s'},
          {icon:'📋',label:'Audit Mode',               value:'Ready'},
        ]}
        onAdd={()=>setShowScanner(true)} addLabel="Open Scanner"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📱</span>
        <div style={{flex:1,minWidth:200}}><strong>One Scan, Full Context:</strong> Point your phone camera at any asset's QR code to instantly pull up specifications, assignment history, warranty status, and maintenance log -- on any device, no specialized scanner needed.</div>
      </div>

      {showScanner&&(
        <div style={{background:'#0f172a',borderRadius:18,padding:'30px',marginBottom:18,textAlign:'center'}}>
          <div style={{width:160,height:160,border:'3px dashed #4338ca',borderRadius:16,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40}}>📷</div>
          <div style={{fontSize:11,color:'#cbd5e1',marginTop:14}}>Point your camera at a QR code or barcode</div>
          <button onClick={()=>setShowScanner(false)} style={{marginTop:14,padding:'8px 20px',borderRadius:20,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Close Scanner</button>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by tag or item name..."/>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px',marginTop:14}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🕐 Recent Scans</div>
        {filtered.map((s,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:s.item,...s,impact_links:['IT Inventory','Asset Management']}})}}
            style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:i<filtered.length-1?'1px solid #f8fafc':'none'}}>
            <div>
              <div style={{fontSize:10,color:'#374151'}}>{s.item} <span style={{color:'#94a3b8'}}>({s.tag})</span></div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:2}}>{s.action} by {s.by}</div>
            </div>
            <span style={{fontSize:8,color:'#94a3b8'}}>{s.time}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Audit Mode lets a single person scan every asset on a floor in minutes -- a process that used to take days of manual checklists.','Each scan is timestamped and geo-tagged, building an automatic chain of custody for high-value equipment.','Unscanned assets for 180+ days surface as "ghost asset" candidates in Asset Management.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Asset Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
