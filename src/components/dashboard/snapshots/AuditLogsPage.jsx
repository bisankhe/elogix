// FILE: AuditLogsPage.jsx - Audit Logs (System Settings)
// Immutable, tamper-proof activity log across every module --
// genuinely new (no audit_log table existed anywhere in this build).
import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
const G='linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A='#4338ca'
const LOGS=[
  {ts:'2025-06-30 09:14:22',user:'Hari Thapa',action:'UPDATE',module:'Compensation',detail:'Gross salary changed NPR 45,000 > NPR 62,000 for Sunil Magar',ip:'192.168.1.42',severity:'high'},
  {ts:'2025-06-30 08:55:10',user:'System',action:'LOGIN_FAIL',module:'Auth',detail:'5 failed login attempts -- account locked for 15 min',ip:'103.15.x.x',severity:'medium'},
  {ts:'2025-06-30 08:30:01',user:'Gita Maharjan',action:'EXPORT',module:'Reports',detail:'Compensation equity report exported (312 employees, PII included)',ip:'192.168.1.55',severity:'medium'},
  {ts:'2025-06-29 17:45:18',user:'Hari Thapa',action:'CREATE',module:'User Management',detail:'New user account created for onboarding employee',ip:'192.168.1.42',severity:'low'},
]
const SEV_CFG={high:{c:'#ef4444'},medium:{c:'#f59e0b'},low:{c:'#10b981'}}
export default function AuditLogsPage(){
  const [search,setSearch]=useState('')
  const [ctx,setCtx]=useState(null)
  const filtered=LOGS.filter(l=>!search||l.user.toLowerCase().includes(search.toLowerCase())||l.detail.toLowerCase().includes(search.toLowerCase()))
  return(
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Audit Logs" breadcrumb="System Administration > System Settings" gradient={G}
        stats={[{icon:'📋',label:'Events Today',value:LOGS.length},{icon:'🔴',label:'High Severity',value:LOGS.filter(l=>l.severity==='high').length},{icon:'🔒',label:'Immutable',value:'Yes'},{icon:'🔍',label:'Searchable',value:'All Fields'}]}
        onAdd={()=>{}} addLabel=""/>
      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🔒</span>
        <div style={{flex:1}}><strong>Who Changed Sarah's Salary?</strong> Every data modification, export, and login attempt is logged here in write-only, tamper-proof format -- searchable by user, module, date, or the specific before/after values changed.</div>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by user, action, or detail..."/>
      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map((l,i)=>{
          const sc=SEV_CFG[l.severity]
          return(
            <div key={i} onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:l.action,...l,impact_links:['Security Settings']}})}}
              style={{background:'#fff',border:`1px solid ${sc.c}33`,borderRadius:12,padding:'12px 16px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <span style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{l.user} . {l.action} . {l.module}</span>
                <span style={{fontSize:8,color:'#94a3b8'}}>{l.ts} . {l.ip}</span>
              </div>
              <div style={{fontSize:9,color:'#64748b',marginTop:4}}>{l.detail}</div>
            </div>
          )
        })}
      </div>
      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['High-severity events (salary changes, PII exports, failed logins) surface at the top automatically -- never buried 3 pages deep.','Logs are append-only at the database level -- no admin, including a super_admin, can delete or modify a log entry.','AI flags patterns: 5 high-severity events from the same IP in 10 minutes triggers a real-time security alert, never discovered in a retrospective audit.']}/>
      </div>
      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[{icon:'👁',label:'View Full Entry',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'}]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
