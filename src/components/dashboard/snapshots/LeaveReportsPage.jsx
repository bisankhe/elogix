// FILE: LeaveReportsPage.jsx - Leave Reports (Leave Reports)
// Multi-jurisdiction compliance report builder, auto-scheduled reminders,
// self-service "my progress & benefits" tracker. Fully responsive: template
// grid collapses 3->2->1 columns; modal goes full-screen on mobile widths.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const JURISDICTIONS = ['Nepal','India','USA','UK','EU (Germany/France)','Australia','Singapore/Asia','UAE/Gulf']

const REPORT_TEMPLATES = [
  {key:'statutory',label:'Statutory Compliance Report',icon:'⚖',desc:'Accrued, used, carried-over leave per local labor law',jurisdiction_aware:true},
  {key:'liability',label:'Leave Liability Report',icon:'💰',desc:'Financial exposure from unutilized leave balances',jurisdiction_aware:true},
  {key:'utilization',label:'Utilization Rate Report',icon:'📊',desc:'% of allotted annual leave actually taken by team',jurisdiction_aware:false},
  {key:'departmental',label:'Departmental Absenteeism',icon:'🏢',desc:'Weekly digest of upcoming absences by department',jurisdiction_aware:false},
  {key:'comp_audit',label:'Comp-Off & Encashment Audit',icon:'🔐',desc:'Full audit trail of adjustments and payouts',jurisdiction_aware:true},
]

const MY_PROGRESS = { leave_used_pct:38, benefits_enrolled:5, benefits_total:7, pending_actions:2 }

const RECENT_REPORTS = [
  {name:'Statutory Compliance - Nepal - June 2025',jurisdiction:'Nepal',generated:'2025-06-21 09:00 AM',format:'PDF',scheduled:true},
  {name:'Leave Liability - All Regions - Q2 2025',jurisdiction:'Multi-region',generated:'2025-06-15 11:00 AM',format:'Excel',scheduled:false},
]

const REMINDER_RULES = [
  {trigger:'Pending approval > 24h',action:'Remind manager via email + in-app',active:true},
  {trigger:'Pending approval > 48h',action:'Escalate to HR + notify employee',active:true},
  {trigger:'Comp-off expiring in 3 days',action:'Remind employee to use or it converts to payout',active:true},
  {trigger:'Leave balance >80% of statutory cap',active:true,action:'Nudge employee to plan time off before forced encashment'},
]

export default function LeaveReportsPage() {
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showQRScan, setShowQRScan] = useState(false)
  const [ctx, setCtx] = useState(null)

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📄" title="Leave Reports"
        breadcrumb="Workforce Operations > Leave Management > Leave Reports"
        gradient={G}
        stats={[
          {icon:'📄',label:'Report Templates', value:REPORT_TEMPLATES.length},
          {icon:'🌍',label:'Jurisdictions',      value:JURISDICTIONS.length},
          {icon:'🔔',label:'Active Reminders',   value:REMINDER_RULES.filter(r=>r.active).length},
          {icon:'📊',label:'My Leave Used',       value:MY_PROGRESS.leave_used_pct+'%'},
        ]}
        onAdd={()=>setShowBuilder(true)} addLabel="Generate Report"/>

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}>
        <button onClick={()=>setShowQRScan(true)} style={{padding:'9px 16px',borderRadius:9,border:`1.5px solid ${A}`,background:'#fff',color:A,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>📱 Scan Employee QR for Report</button>
      </div>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🌍</span>
        <div style={{flex:1,minWidth:200}}><strong>Multi-Jurisdiction Compliance:</strong> Templates auto-adapt statutory thresholds for Nepal, India, USA, UK, EU, Australia, Asia, and Gulf labor law - accrual caps, encashment limits, and mandatory leave types vary by region and are pre-configured per jurisdiction.</div>
      </div>

      {/* Self-service "my progress & benefits" widget */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🎯 My Progress & Benefits</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12}}>
          <div style={{textAlign:'center'}}>
            <div style={{position:'relative',width:80,height:80,margin:'0 auto'}}>
              <svg width="80" height="80" style={{transform:'rotate(-90deg)'}}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="7"/>
                <circle cx="40" cy="40" r="34" fill="none" stroke={A} strokeWidth="7"
                  strokeDasharray={2*Math.PI*34} strokeDashoffset={2*Math.PI*34*(1-MY_PROGRESS.leave_used_pct/100)} strokeLinecap="round"/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:A}}>{MY_PROGRESS.leave_used_pct}%</div>
            </div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>Annual Leave Used</div>
          </div>
          <div style={{textAlign:'center',display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:'#10b981'}}>{MY_PROGRESS.benefits_enrolled}/{MY_PROGRESS.benefits_total}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Benefits Enrolled</div>
          </div>
          <div style={{textAlign:'center',display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:'#f59e0b'}}>{MY_PROGRESS.pending_actions}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:4}}>Pending Actions</div>
          </div>
        </div>
      </div>

      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📋 Report Templates</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:12,marginBottom:24}}>
        {REPORT_TEMPLATES.map(t=>(
          <div key={t.key} onClick={()=>{setSelectedTemplate(t);setShowBuilder(true)}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=A}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}>
            <div style={{fontSize:24,marginBottom:8}}>{t.icon}</div>
            <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>{t.label}</div>
            <div style={{fontSize:10,color:'#64748b',marginBottom:6}}>{t.desc}</div>
            {t.jurisdiction_aware&&<span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🌍 Jurisdiction-Aware</span>}
          </div>
        ))}
      </div>

      {/* Automatic reminders config */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>🔔 Automatic Reminder Rules</div>
        {REMINDER_RULES.map((r,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:i<REMINDER_RULES.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:6}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{r.trigger}</div>
              <div style={{fontSize:9,color:'#64748b'}}>{r.action}</div>
            </div>
            <span style={{background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20,flexShrink:0}}>🔔 Active</span>
          </div>
        ))}
      </div>

      <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>🕐 Recently Generated</div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,overflow:'hidden'}}>
        {RECENT_REPORTS.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.name,impact_links:['Leave Analytics']}})}}
            style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:i<RECENT_REPORTS.length-1?'1px solid #f8fafc':'none',flexWrap:'wrap',gap:8}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{r.name}{r.scheduled&&<span style={{marginLeft:8,background:'#eff6ff',color:'#1d4ed8',fontSize:8,fontWeight:700,padding:'1px 7px',borderRadius:20}}>🔄 Scheduled</span>}</div>
              <div style={{fontSize:9,color:'#94a3b8'}}>{r.jurisdiction} . {r.generated} . {r.format}</div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#f8fafc',color:A,fontSize:10,fontWeight:600,cursor:'pointer'}}>📥 Download</button>
            </div>
          </div>
        ))}
      </div>

      {showBuilder&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>{setShowBuilder(false);setSelectedTemplate(null)}}>
          <div style={{background:'#fff',borderRadius:20,width:'min(580px, 100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{selectedTemplate?selectedTemplate.label:'Custom Report Builder'}</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Jurisdiction" type="select" value="" onChange={()=>{}} accent={A} options={JURISDICTIONS}/>
                <Field label="Department" type="select" value="" onChange={()=>{}} accent={A} options={['All Departments','IT','Finance','Sales','HR']}/>
                <Field label="Start Date" type="date" value="" onChange={()=>{}} accent={A}/>
                <Field label="End Date" type="date" value="" onChange={()=>{}} accent={A}/>
                <Field label="Format" type="select" value="" onChange={()=>{}} accent={A} options={['PDF','Excel']}/>
              </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" style={{accentColor:A}}/> Schedule recurring auto-delivery + reminder on generation
              </label>
              <Field label="Deliver To (email, comma-separated)" value="" onChange={()=>{}} accent={A} hint="Voice input supported"/>
              <AIImpact color={A} lines={['Statutory thresholds auto-adjust per selected jurisdiction (Nepal/India/USA/UK/EU/AU/Asia/Gulf).','Audit-ready format complies with local labor office submission requirements.','Scheduled reports trigger automatic reminders to recipients on generation.']}/>
              <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>{setShowBuilder(false);setSelectedTemplate(null)}} style={{flex:1,minWidth:140,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Generate Report</button>
                <button onClick={()=>{setShowBuilder(false);setSelectedTemplate(null)}} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR scan-to-view: manager scans an employee badge to instantly pull their leave report */}
      {showQRScan&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowQRScan(false)}>
          <div style={{background:'#fff',borderRadius:20,padding:'28px',maxWidth:360,textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:14}}>Scan Employee QR Badge</div>
            <div style={{width:200,height:200,margin:'0 auto',background:'#f8fafc',border:'2px dashed #cbd5e1',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:48}}>📷</div>
            <div style={{fontSize:11,color:'#64748b',marginTop:14}}>Scan an employee's QR badge to instantly pull up their leave report, balances, and pending requests - no manual lookup needed.</div>
            <button onClick={()=>setShowQRScan(false)} style={{marginTop:16,padding:'10px 24px',borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Close</button>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'📥',label:'Download',key:'download'},{icon:'📧',label:'Email',key:'email'},
        {icon:'🔄',label:'Re-generate',key:'regen'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
