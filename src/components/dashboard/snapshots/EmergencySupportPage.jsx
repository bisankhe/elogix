// FILE: EmergencySupportPage.jsx - Emergency Support
// (Employee Experience & Culture > Wellness & Support)
// Floating SOS button: geo-tagged alert to HR + EXISTING
// employee_emergency_contacts (never duplicated, just triggered).
// Welfare Fund relief tracking per Section 18, automated Safety
// Check-In for crisis events (natural disaster, civil unrest).

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const MY_EMERGENCY_CONTACTS = [
  {name:'Gita Thapa',relation:'Spouse',phone:'+977-98XX-XXXXXX',is_primary:true},
  {name:'Ram Thapa',relation:'Father',phone:'+977-98XX-XXXXXX',is_primary:false},
]

const ACTIVE_CHECKINS = [
  { id:'sc1', event:'Monsoon Flooding Alert -- Kathmandu Valley', status:'awaiting_response', issued:'2025-06-23 8:00 AM',
    flag_note:'12 employees in the affected zone have not yet confirmed safety.', impact_links:[] },
]

const WELFARE_REQUESTS = [
  { id:'wf1', employee:'Bikash Rai', reason:'Medical emergency -- family member', status:'approved', amount_npr:15000 },
]

export default function EmergencySupportPage() {
  const [search, setSearch] = useState('')
  const [showSOSConfirm, setShowSOSConfirm] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = ACTIVE_CHECKINS.filter(c=>!search||c.event.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🆘" title="Emergency Support"
        breadcrumb="Employee Experience & Culture > Wellness & Support"
        gradient={G}
        stats={[
          {icon:'📍',label:'Active Safety Check-Ins',  value:ACTIVE_CHECKINS.length},
          {icon:'📇',label:'My Emergency Contacts',        value:MY_EMERGENCY_CONTACTS.length},
          {icon:'💰',label:'Welfare Fund Requests',           value:WELFARE_REQUESTS.length},
          {icon:'🌐',label:'Geo-Tagging',                       value:'Enabled'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>📇</span>
        <div style={{flex:1,minWidth:200}}><strong>Built on Your Existing Contacts:</strong> The SOS button uses the emergency contacts already on file in your Employee Records -- nothing new to fill out. One tap shares your live location with HR and notifies your designated contact instantly.</div>
      </div>

      {/* Floating-style SOS button, rendered inline for this view */}
      <div onClick={()=>setShowSOSConfirm(true)} style={{background:'linear-gradient(135deg,#dc2626,#ef4444)',borderRadius:18,padding:'20px 24px',marginBottom:18,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:16,boxShadow:'0 4px 14px rgba(220,38,38,.3)'}}>
        <span style={{fontSize:34}}>🆘</span>
        <div>
          <div style={{fontSize:14,fontWeight:900}}>Emergency SOS</div>
          <div style={{fontSize:10,opacity:.9,marginTop:2}}>Tap to share your location and alert HR + your emergency contact</div>
        </div>
      </div>

      {/* Active safety check-ins */}
      {filtered.length>0&&(
        <div style={{display:'grid',gap:14,marginBottom:18}}>
          {filtered.map(c=>(
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.event,...c}})}}
              style={{background:'#fff',border:'1.5px solid #fed7aa',borderRadius:16,padding:'16px 18px',borderLeft:'5px solid #f59e0b'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>📍 {c.event}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Issued {c.issued}</div>
              {c.flag_note&&<div style={{marginTop:8,fontSize:10,color:'#b45309'}}>⚠ {c.flag_note}</div>}
              <button style={{marginTop:10,padding:'8px 18px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ I'm Safe -- Confirm</button>
            </div>
          ))}
        </div>
      )}

      {/* Emergency contacts on file */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px',marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📇 My Emergency Contacts</div>
        {MY_EMERGENCY_CONTACTS.map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<MY_EMERGENCY_CONTACTS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{c.name} ({c.relation}) {c.is_primary&&'⭐'}</span>
            <span style={{fontSize:9,color:'#94a3b8'}}>{c.phone}</span>
          </div>
        ))}
      </div>

      {/* Welfare Fund */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🏦 Welfare Fund</div>
        {WELFARE_REQUESTS.map(w=>(
          <div key={w.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}>
            <span style={{fontSize:10,color:'#374151'}}>{w.employee} -- {w.reason}</span>
            <span style={{fontSize:10,fontWeight:700,color:'#10b981'}}>NPR {w.amount_npr.toLocaleString()} ({w.status})</span>
          </div>
        ))}
        <button style={{marginTop:10,padding:'8px 18px',borderRadius:10,border:`1px solid ${A}33`,background:'#fff7ed',color:A,fontSize:10,fontWeight:700,cursor:'pointer'}}>+ Request Welfare Fund Assistance</button>
      </div>

      {showSOSConfirm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:6000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSOSConfirm(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(420px,100%)',padding:'30px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:40,marginBottom:14}}>📍</div>
            <div style={{fontSize:14,fontWeight:900,color:'#0f172a',marginBottom:10}}>Share your location and alert HR?</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:20}}>This will immediately notify HR and your primary emergency contact with your current location.</div>
            <button style={{width:'100%',padding:14,borderRadius:12,border:'none',background:'#dc2626',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',marginBottom:10}}>🆘 Confirm SOS</button>
            <button onClick={()=>setShowSOSConfirm(false)} style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',color:'#64748b',fontSize:11,cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['SOS alerts route directly to HR and your designated primary emergency contact -- no delay waiting for manual review.','Safety Check-Ins auto-trigger for employees in a geo-fenced crisis zone -- nothing manual to configure during an actual emergency.','Welfare Fund requests route for rapid approval, per the Labour Act\'s relief-fund mandate.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Detail',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
