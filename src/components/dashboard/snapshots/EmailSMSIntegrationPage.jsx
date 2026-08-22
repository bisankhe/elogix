// FILE: EmailSMSIntegrationPage.jsx - Email & SMS Integration
// (System Administration > Integration & API)
// The gateway-credential layer UNDERNEATH the EXISTING
// notification_type_configs (Workflow & Automation session) -- that
// table lists 'email'/'sms' as channel TYPES but has no actual SMTP
// host or Twilio API key. This page is where those real provider
// credentials live, never a duplicate channel-selection UI.
// Certified-delivery tracking addresses the brief's explicit legal-
// admissibility pain point for labour-contract-related messages.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

const GATEWAYS = [
  {provider:'SendGrid (Email)',type:'email',status:'connected',sent_30d:1842,verified_sender:true},
  {provider:'Twilio (SMS)',type:'sms',status:'connected',sent_30d:340,verified_sender:true},
  {provider:'WhatsApp Business API',type:'whatsapp',status:'not_connected',sent_30d:0,verified_sender:false},
]

const CERTIFIED_MESSAGES = [
  {type:'Disciplinary Warning Letter',recipient:'Confidential',delivered_at:'2025-06-20 09:14',read_receipt:true,legal_grade:true},
  {type:'Policy Update -- Code of Conduct',recipient:'All Employees (312)',delivered_at:'2025-06-15 10:00',read_receipt:false,legal_grade:true,
   flag_note:'No read receipt captured for 18 recipients -- delivery proof incomplete for those individuals if this is ever contested.'},
]

export default function EmailSMSIntegrationPage() {
  const [showConfig, setShowConfig] = useState(false)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📧" title="Email &amp; SMS Integration"
        breadcrumb="System Administration > Integration & API"
        gradient={G}
        stats={[
          {icon:'📧',label:'Active Gateways',  value:GATEWAYS.filter(g=>g.status==='connected').length},
          {icon:'📨',label:'Sent This Month',       value:GATEWAYS.reduce((s,g)=>s+g.sent_30d,0)},
          {icon:'⚖',label:'Certified Messages',         value:CERTIFIED_MESSAGES.length},
          {icon:'🔒',label:'Incomplete Receipts',           value:CERTIFIED_MESSAGES.filter(c=>c.flag_note).length},
        ]}
        onAdd={()=>setShowConfig(true)} addLabel="Configure Gateway"/>

      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Certified, Not Just Sent:</strong> Disciplinary letters and policy updates need provable delivery -- a basic SMS doesn't hold up in a labor dispute. Messages flagged legal-grade here capture a read receipt as part of the actual record, not an afterthought.</div>
      </div>

      <div style={{display:'grid',gap:14,marginBottom:18}}>
        {GATEWAYS.map((g,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:g.provider,...g,impact_links:['Notification Engine']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{g.provider}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{g.sent_30d} sent this month {g.verified_sender&&'. Verified sender'}</div>
            </div>
            <span style={{background:g.status==='connected'?'#f0fdf4':'#f8fafc',color:g.status==='connected'?'#15803d':'#94a3b8',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
              {g.status==='connected'?'✓ Connected':'Not Connected'}
            </span>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚖ Certified Message Log</div>
        {CERTIFIED_MESSAGES.map((c,i)=>(
          <div key={i} style={{padding:'10px 0',borderBottom:i<CERTIFIED_MESSAGES.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <span style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{c.type}</span>
              <span style={{fontSize:8,color:c.read_receipt?'#15803d':'#b45309'}}>{c.read_receipt?'✓ Read receipt captured':'⚠ Receipt incomplete'}</span>
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{c.recipient} . Delivered {c.delivered_at}</div>
            {c.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#b45309'}}>⚠ {c.flag_note}</div>}
          </div>
        ))}
      </div>

      {showConfig&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowConfig(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Configure Gateway</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Provider" type="select" value="" onChange={()=>{}} accent={A} options={['SendGrid','Twilio','WhatsApp Business API','Custom SMTP']}/>
              <Field label="API Key / SMTP Credentials" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Sender Email or Number" value="" onChange={()=>{}} accent={A} required/>
              <button onClick={()=>setShowConfig(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save &amp; Verify</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Gateway credentials power EVERY notification type configured in Notification Engine -- never a separate channel setup per workflow.','Disciplinary and policy-update messages auto-flag as legal-grade, capturing delivery and read proof without anyone remembering to ask for it.','API keys and SMTP passwords are encrypted at rest -- never visible again after the initial save, even to an admin.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Delivery Log',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
