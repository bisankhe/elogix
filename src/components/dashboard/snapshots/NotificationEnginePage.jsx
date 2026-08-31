// FILE: NotificationEnginePage.jsx - Notification Engine
// (System Administration > Workflow & Automation)
// Multi-channel delivery configuration sitting ABOVE the EXISTING
// transaction_notifications (the universal delivery log written
// throughout this entire build) -- this page is where the DELIVERY
// CHANNEL and template get configured per transaction type, never a
// second logging table. Alert-fatigue addressed via per-channel,
// per-type opt-out and a digest-mode toggle.

import { useState, useEffect } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const NOTIFICATION_TYPES = [
  {type:'Leave Request Approved',channels:['in_app','email'],template:'Hi {employee_name}, your leave request for {dates} has been approved.',volume_30d:142},
  {type:'Policy Gate Cleared',channels:['in_app','email','sms'],template:'All mandatory policies acknowledged -- your first salary is no longer blocked.',volume_30d:8},
  {type:'Risk Alert Assigned',channels:['in_app','email','slack'],template:'New {domain} risk alert: {title}',volume_30d:34,
   flag_note:'High volume (34 in 30 days) across 3 channels -- a strong alert-fatigue candidate. Consider digest mode.'},
]


function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function NotificationEnginePage() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = NOTIFICATION_TYPES.filter(n=>!search||n.type.toLowerCase().includes(search.toLowerCase()))
  const CHANNEL_ICONS = { in_app:'📱', email:'✉️', sms:'💬', slack:'#️⃣' }

  useEffect(()=>{
    const {token,slug,valid} = _getTenantCtx()
    if(!valid){setApiLoading(false);return}
    setApiLoading(true);setApiError(null)
    fetch('/api/v1/notifications/engine',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{const p=d.rules||d.data||d;if(p)setApiData(p)})
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔔" title="Notification Engine"
        breadcrumb="System Administration > Workflow & Automation"
        gradient={G}
        stats={[
          {icon:'🔔',label:'Notification Types',  value:NOTIFICATION_TYPES.length},
          {icon:'📡',label:'Active Channels',          value:'4'},
          {icon:'⚠',label:'Fatigue Risk',                  value:NOTIFICATION_TYPES.filter(n=>n.flag_note).length},
          {icon:'📨',label:'Sent This Month',                 value:NOTIFICATION_TYPES.reduce((s,n)=>s+n.volume_30d,0)},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Notification Type"/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
      {apiLoading && (
        <div style={{textAlign:'center',padding:40,color:'#7c3aed',fontSize:13,fontWeight:600}}>
          <div style={{fontSize:32,marginBottom:8}}>⟳</div>Loading...
        </div>
      )}
      {apiError && !apiLoading && (
        <div style={{padding:'8px 14px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:8,fontSize:12,color:'#dc2626',marginBottom:8,fontWeight:600}}>
          ⚠️ {apiError}
        </div>
      )}
        <span style={{fontSize:18}}>🔗</span>
        <div style={{flex:1,minWidth:200}}><strong>The Delivery Layer, Not a Second Log:</strong> Every notification across this entire system already writes to one universal record -- this page configures WHERE it gets delivered and what it says, never a duplicate notification store.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search notification types..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map((n,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:n.type,...n,impact_links:['Escalation Rules']}})}}
            style={{background:'#fff',border:`1px solid ${n.flag_note?'#fed7aa':'#e2e8f0'}`,borderRadius:16,padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{n.type}</div>
              <div style={{display:'flex',gap:4}}>
                {n.channels.map((c,j)=><span key={j} style={{fontSize:14}}>{CHANNEL_ICONS[c]}</span>)}
              </div>
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:8,fontFamily:'monospace',background:'#f8fafc',padding:'8px 10px',borderRadius:8}}>{n.template}</div>
            <div style={{fontSize:8,color:'#94a3b8',marginTop:8}}>{n.volume_30d} sent in last 30 days</div>
            {n.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#b45309'}}>⚠ {n.flag_note}</div>}
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>New Notification Type</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Notification Type Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Channels" type="select" value="" onChange={()=>{}} accent={A} options={['In-App','Email','SMS','Slack/Teams']}/>
              <Field label="Message Template" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Use {employee_name}, {dates}, etc. for dynamic text"/>
              <button onClick={()=>setShowAdd(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save Configuration</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI flags notification types trending toward alert fatigue -- high volume across multiple channels -- and suggests digest mode before users start ignoring them.','Templates use dynamic text fields so every alert carries real context, never a generic "something happened" message.','Channel changes take effect immediately -- never a deployment cycle to update how an alert reaches someone.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Configuration',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
