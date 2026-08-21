// FILE: CertificationTrackingPage.jsx - Certification Tracking
// (Performance & Talent > Talent Development > Learning & Development)
// Multi-tier (90/60/30-day) expiry alert engine + compliance dashboard,
// over the EXISTING lms_certifications. Distinct from the simple list
// in Course Management's Vault tab -- this is the active management
// layer: role-based requirements, manual document upload, audit reports.
//
// USER PERSONAS:
//  - HR/Compliance Admin: company-wide compliance %, audit report export, role requirements config
//  - Manager: team expiry pipeline, escalation queue
//  - Employee (ESS): My Credentials, upload renewal doc, Renew Now action

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const PERSONAS = {
  hr_admin: { label: 'HR / Compliance Admin', icon:'🛡',
    data: ['Company-wide compliance %', 'Role-based requirement config', 'Audit-ready export', 'Foreign-employee permit tracker'] },
  manager: { label: 'Manager', icon:'👔',
    data: ['Team expiry pipeline (90/60/30d)', 'Escalation queue', 'Non-compliant staff flag'] },
  employee: { label: 'Employee (ESS)', icon:'🙋',
    data: ['My Credentials', 'Upload renewal document', 'Renew Now action', 'Expiry countdown'] },

const COMPLIANCE_PIE = { compliant:284, expiring_90:9, expiring_30:5, expired:0 }

const EXPIRY_PIPELINE = [
  { id:'e1', employee:'Maya Pradhan', cert:'OSH Fire Safety Certification', expires:'2025-07-05', days_left:11, tier:'30', escalated_to:'manager' },
  { id:'e2', employee:'Sunil Magar', cert:'AWS Solutions Architect Associate', expires:'2025-09-10', days_left:78, tier:'90', escalated_to:'employee' },
  { id:'e3', employee:'Ramesh KC', cert:'Work Permit (Foreign National)', expires:'2025-08-01', days_left:38, tier:'60', escalated_to:'compliance_admin',
    flag_note:'Section 22: Department of Labor verification required before renewal.' },
]

const ROLE_REQUIREMENTS = [
  {role:'All Employees',required_certs:['OSH Fire Safety (annual)']},
  {role:'IT Department',required_certs:['Data Privacy Compliance (annual)','AWS Solutions Architect (3-year)']},
  {role:'Foreign Nationals',required_certs:['Work Permit (per Dept of Labor schedule)','Skill/Expertise Certification']},
]

const TIER_CFG = {90:{c:'#0284c7',bg:'#eff6ff'},60:{c:'#f59e0b',bg:'#fffbeb'},30:{c:'#ef4444',bg:'#fef2f2'}}

export default function CertificationTrackingPage() {
  const [persona, setPersona] = useState('hr_admin')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [ctx, setCtx] = useState(null)

  const totalCerts = Object.values(COMPLIANCE_PIE).reduce((a,b)=>a+b,0)
  const compliancePct = Math.round(COMPLIANCE_PIE.compliant/totalCerts*100)
  const filtered = EXPIRY_PIPELINE.filter(e=>!search||e.employee.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Certification Tracking"
        breadcrumb="Performance & Talent Management > Talent Development > Learning & Development"
        gradient={G}
        stats={[
          {icon:'✅',label:'Compliance Rate',  value:compliancePct+'%'},
          {icon:'⚠',label:'Expiring (90d)',      value:COMPLIANCE_PIE.expiring_90},
          {icon:'🚨',label:'Expiring (30d)',       value:COMPLIANCE_PIE.expiring_30},
          {icon:'❌',label:'Expired',               value:COMPLIANCE_PIE.expired},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap',background:'#f1f5f9',padding:6,borderRadius:12}}>
        {Object.entries(PERSONAS).map(([key,p])=>(
          <button key={key} onClick={()=>setPersona(key)}
            style={{padding:'8px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:10,whiteSpace:'nowrap',
              background:persona===key?'#fff':'transparent',color:persona===key?A:'#64748b',
              fontWeight:persona===key?700:500,boxShadow:persona===key?'0 1px 4px rgba(0,0,0,.08)':'none'}}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af'}}>
        <strong>{PERSONAS[persona].icon} {PERSONAS[persona].label} sees:</strong> {PERSONAS[persona].data.join(' . ')}
      </div>

      {persona==='hr_admin'&&(<>
        {/* Compliance pie summary */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:18,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
          <svg width="120" height="120" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="5"/>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray={`${compliancePct} 100`} strokeDashoffset="25" transform="rotate(-90 18 18)"/>
          </svg>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:20,fontWeight:900,color:'#10b981'}}>{compliancePct}% Compliant</div>
            <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>{COMPLIANCE_PIE.compliant} of {totalCerts} certifications current across the workforce</div>
          </div>
          <button style={{padding:'10px 20px',borderRadius:10,border:`1px solid ${A}33`,background:'#eff6ff',color:A,fontSize:11,fontWeight:700,cursor:'pointer'}}>📊 Export Audit Report</button>
        </div>

        {/* Role requirements config */}
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:18}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>⚖ Role-Based Certification Requirements</div>
          {ROLE_REQUIREMENTS.map((r,i)=>(
            <div key={i} style={{padding:'8px 0',borderBottom:i<ROLE_REQUIREMENTS.length-1?'1px solid #f8fafc':'none'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a',marginBottom:4}}>{r.role}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{r.required_certs.map((c,j)=>(<span key={j} style={{background:'#f8fafc',color:'#475569',fontSize:8,fontWeight:600,padding:'2px 9px',borderRadius:20}}>{c}</span>))}</div>
            </div>
          ))}
        </div>
      </>)}

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map(e=>{
          const tc = TIER_CFG[e.tier]
          return (
            <div key={e.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:e.employee,...e,impact_links:['Employee Documents','Generate Certificate']}})}}
              style={{background:'#fff',border:`1.5px solid ${tc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:800,color:'#0f172a'}}>{e.employee} - {e.cert}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>Expires {e.expires} . escalated to {e.escalated_to.replace('_',' ')}</div>
                {e.flag_note&&<div style={{fontSize:9,color:'#b45309',marginTop:4}}>⚠ {e.flag_note}</div>}
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{background:tc.bg,color:tc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{e.days_left}d left</span>
                <button onClick={()=>setShowUpload(e)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:tc.c,color:'#fff',fontSize:9,fontWeight:700,cursor:'pointer'}}>Renew Now</button>
              </div>
            </div>
          )
        })}
      </div>

      {showUpload&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowUpload(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(440px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Renew: {showUpload.cert}</div></div>
            <div style={{padding:'20px 24px'}}>
              <div style={{border:'2px dashed #bfdbfe',borderRadius:12,padding:'24px',textAlign:'center',background:'#eff6ff',marginBottom:14}}>
                <div style={{fontSize:24,marginBottom:6}}>📷</div>
                <div style={{fontSize:10,color:'#1e40af'}}>Photograph or upload your renewal document</div>
              </div>
              <Field label="New Expiry Date" type="date" value="" onChange={()=>{}} accent={A}/>
              <button onClick={()=>setShowUpload(false)} style={{width:'100%',padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',marginTop:8}}>Submit for Verification</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Multi-tier alerts fire at 90, 60, and 30 days -- escalating from employee, to manager, to compliance admin.','Section 114 record-keeping is satisfied automatically -- every credential, training, and skill is logged here for the annual Labour Audit (Section 94).','Foreign-national work permits are flagged for Department of Labor verification per Section 22.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Record',key:'view'},{icon:'📧',label:'Send Reminder',key:'remind'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
