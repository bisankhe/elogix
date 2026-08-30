// ============================================================
// FILE: src/components/dashboard/ITAdministratorDashboard.jsx
// PURPOSE: IT Administrator workspace -- user management, roles
//          & permissions, security alerts, API monitoring, system
//          health, audit logs. Distinct from Super Admin (full
//          tenant/billing control) -- this persona is operational
//          IT, scoped to System Administration's own pages.
// ============================================================
import { useState } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { StatCard } from '../shared/StatCard.jsx'
import { Card } from '../shared/Card.jsx'

const SECURITY_ALERTS=[
  {detail:'5 failed login attempts from same IP -- account locked',severity:'high',ago:'12 min ago'},
  {detail:'Personal device accessing payroll data without MDM enrollment',severity:'medium',ago:'2 hours ago'},
]
const API_HEALTH=[
  {name:'SendGrid (Email Gateway)',status:'healthy',uptime:'99.98%'},
  {name:'Twilio (SMS Gateway)',status:'healthy',uptime:'99.95%'},
  {name:'LinkedIn Talent Hub',status:'degraded',uptime:'94.2%',flag:'Field mapping drift detected on employment_status'},
]

export default function ITAdministratorDashboard(){
  const { navTo, t } = useApp()
  return(
    <div>
      <h1 style={{fontSize:20,fontWeight:900,color:'#0f172a',marginBottom:4}}>🖥 IT Administrator Workspace</h1>
      <p style={{fontSize:11,color:'#94a3b8',marginBottom:18}}>Users, access, security posture, and system health -- one operational view</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="👤" label="Active Accounts" value="312"/>
        <StatCard icon="🔐" label="MFA Adoption" value="76%"/>
        <StatCard icon="🚨" label="Security Alerts" value={SECURITY_ALERTS.length}/>
        <StatCard icon="🔌" label="Connected APIs" value="9"/>
        <StatCard icon="✅" label="System Health" value="Healthy"/>
      </div>

      <Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🚨 Security Alerts</div>
        {SECURITY_ALERTS.map((a,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<SECURITY_ALERTS.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <span style={{fontSize:9,color:'#374151'}}>{a.detail}</span>
            <span style={{fontSize:8,color:a.severity==='high'?'#dc2626':'#b45309',fontWeight:700}}>{a.ago}</span>
          </div>
        ))}
        <button onClick={()=>navTo('audit-logs')} style={{marginTop:10,padding:'7px 14px',borderRadius:8,border:'none',background:'#4338ca',color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>View Audit Logs</button>
      </Card>

      <div style={{marginTop:16}}><Card>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📡 API & Integration Health</div>
        {API_HEALTH.map((a,i)=>(
          <div key={i} style={{padding:'9px 0',borderBottom:i<API_HEALTH.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <span style={{fontSize:9,fontWeight:700,color:'#0f172a'}}>{a.name}</span>
              <span style={{fontSize:8,color:a.status==='healthy'?'#15803d':'#b45309',fontWeight:700}}>{a.status} . {a.uptime}</span>
            </div>
            {a.flag&&<div style={{fontSize:8,color:'#b45309',marginTop:3}}>⚠ {a.flag}</div>}
          </div>
        ))}
      </Card></div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:8}}>🔗 Quick Links</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[['User Management','user-management'],['Role & Permission','role-permission'],['Security Settings','security-settings'],['Device Integration','device-integration'],['Backup & Restore','backup-restore']].map(([label,id])=>
            <button key={id} onClick={()=>navTo(id)} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e2e8f0',background:'#f8fafc',color:'#374151',fontSize:8,fontWeight:600,cursor:'pointer'}}>{label}</button>)}
        </div>
      </div>
    </div>
  )
}
