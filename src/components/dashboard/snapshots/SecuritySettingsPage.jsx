// FILE: SecuritySettingsPage.jsx - Security Settings (System Settings)
// System-wide security policy (password rules, session timeout, IP
// whitelist, MFA enforcement) -- distinct from AccessControlPage
// (User & Access, which handles field-level masking and individual
// access requests) and RolePermissionPage (which defines what roles
// can do). This is the global security posture layer.
import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A='#c2410c'
const POLICIES=[
  {label:'Password Minimum Length',value:'12 characters',status:'configured'},
  {label:'Session Timeout (inactive)',value:'30 minutes',status:'configured'},
  {label:'MFA Enforcement',value:'All admin-level accounts',status:'configured'},
  {label:'IP Whitelist',value:'3 ranges configured',status:'configured'},
  {label:'Failed Login Lockout',value:'5 attempts > 15 min lock',status:'configured'},
  {label:'Data Export Restriction',value:'PII requires legal grounds',status:'configured'},
]
export default function SecuritySettingsPage(){
  const [ctx,setCtx]=useState(null)
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔐" title="Security Settings" breadcrumb="System Administration > System Settings" gradient={G}
        stats={[{icon:'🔐',label:'Active Policies',value:POLICIES.length},{icon:'🛡',label:'MFA Enforced',value:'Admin+'},{icon:'⏱',label:'Session Timeout',value:'30 min'},{icon:'⚠',label:'Failed Login Lock',value:'5 attempts'}]}
        onAdd={()=>{}} addLabel=""/>
      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🛡</span>
        <div style={{flex:1}}><strong>Zero-Trust by Default:</strong> Every policy here applies globally -- an admin cannot grant themselves an exemption from the session timeout or MFA requirement through the UI.</div>
      </div>
      <div style={{display:'grid',gap:12}}>
        {POLICIES.map((p,i)=>(
          <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:p.label,...p,impact_links:['Access Control']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{p.label}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:9,color:'#374151'}}>{p.value}</span>
              <span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>✓ Active</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Security policy changes here are logged immediately in Audit Logs -- every modification tracked with who, what, and when.','MFA enforcement status syncs with the mfa_enrollment table (Security Risk) -- one authoritative source, never two places to check.','IP whitelist changes take effect in seconds -- no server restart, no deployment window required.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[{icon:'⚙',label:'Edit Policy',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
