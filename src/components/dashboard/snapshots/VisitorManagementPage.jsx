// FILE: VisitorManagementPage.jsx - Visitor Management
// (Finance, Assets & Administration > Administrative Operations)
// Pre-registration, QR-based check-in (reuses the EXISTING universal
// qr_codes registry, extended with a new 'visitor' qr_type), host
// auto-notification. Section 70: employer duty toward non-workers.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const STATUS_CFG = { pre_registered:{c:'#0284c7',label:'Pre-Registered'},checked_in:{c:'#10b981',label:'Checked In'},checked_out:{c:'#94a3b8',label:'Checked Out'} }

const VISITORS = [
  { id:'v1', name:'Rajan Bhattarai', purpose:'Vendor meeting -- IT Inventory', host:'Hari Thapa', status:'checked_in', checked_in_at:'10:15 AM', impact_links:['Vendor Management'] },
  { id:'v2', name:'Sita Adhikari', purpose:'Job interview -- Senior Engineer', host:'Sunil Magar', status:'pre_registered', expected:'2:00 PM' },
  { id:'v3', name:'Anil Sharma', purpose:'Equipment delivery', host:'Facilities Admin', status:'checked_out', checked_in_at:'9:00 AM', checked_out_at:'9:30 AM' },
]

export default function VisitorManagementPage() {
  const [search, setSearch] = useState('')
  const [showPreRegister, setShowPreRegister] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = VISITORS.filter(v=>!search||v.name.toLowerCase().includes(search.toLowerCase()))
  const onPremises = VISITORS.filter(v=>v.status==='checked_in').length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛃" title="Visitor Management"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'🛃',label:'On Premises Now',  value:onPremises},
          {icon:'📅',label:"Today's Visitors",     value:VISITORS.length},
          {icon:'⏳',label:'Pre-Registered',           value:VISITORS.filter(v=>v.status==='pre_registered').length},
          {icon:'⚖',label:'Safety Duty',                  value:'Section 70'},
        ]}
        onAdd={()=>setShowPreRegister(true)} addLabel="Pre-Register Visitor"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Accountability for Non-Workers:</strong> Section 70 requires tracing anyone inside the facility who isn't an employee -- this log is what makes an emergency headcount possible, not just a front-desk formality.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search visitors..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(v=>{
          const sc = STATUS_CFG[v.status]
          return (
            <div key={v.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:v.name,...v}})}}
              style={{background:'#fff',border:`1px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{v.name}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{v.purpose} . Host: {v.host}</div>
              </div>
              <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
            </div>
          )
        })}
      </div>

      {showPreRegister&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowPreRegister(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Pre-Register Visitor</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Visitor Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Purpose of Visit" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <Field label="Host (Employee)" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Expected Time" type="date" value="" onChange={()=>{}} accent={A}/>
              <button onClick={()=>setShowPreRegister(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Generate QR &amp; Send Invite</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['A QR code generates instantly and emails to the visitor -- scanning it at the kiosk checks them in automatically.','The host receives an SMS/email notification the moment their guest arrives, never a phone call from the front desk.','Hazard signage and safety briefing acknowledgment is captured at check-in for any restricted areas the visit requires.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
