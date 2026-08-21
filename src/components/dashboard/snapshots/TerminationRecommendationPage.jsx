// FILE: TerminationRecommendationPage.jsx - Termination Recommendation (Performance & Talent > Goal & Performance)
// HIGHLY CONFIDENTIAL, HR/Exec-only. Aggregates objective indicators
// (3+ unsatisfactory appraisals, unaddressed PIP, attendance breaches)
// into a flag - feeds INTO exit_management_schema, never replaces it.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e293b 0%,#334155 60%,#94a3b8 100%)'
const A = '#334155'

const FLAGS = [
  { id:'tf1', employee:'Bikash Rai', dept:'IT',
    indicators:{consecutive_unsatisfactory_appraisals:2,unaddressed_pip_count:0,attendance_breach_count:1},
    documented_warnings:2, due_process_status:'pip_active', explanation_period_used:true,
    recommendation:'continue_pip', impact_links:['PIP Management','Performance Appraisal'] },
]

const DUE_PROCESS_CFG = {pip_active:{c:'#f59e0b',bg:'#fffbeb',label:'PIP Active - Monitoring'},eligible:{c:'#ef4444',bg:'#fef2f2',label:'Legally Eligible for Termination'}}

export default function TerminationRecommendationPage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)
  const [acknowledged, setAcknowledged] = useState(false)

  const filtered = FLAGS.filter(f=>!search||f.employee.toLowerCase().includes(search.toLowerCase()))

  if (!acknowledged) {
    return (
      <div style={{maxWidth:560,margin:'60px auto',textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:16}}>🔒</div>
        <div style={{fontSize:16,fontWeight:900,color:'#0f172a',marginBottom:10}}>Highly Confidential - Restricted Access</div>
        <div style={{fontSize:12,color:'#64748b',marginBottom:20,lineHeight:1.6}}>This page contains sensitive termination-risk analysis accessible only to authorized HR and executive personnel. All views are logged for audit purposes. Continuing confirms you are authorized to view this content under company policy.</div>
        <button onClick={()=>setAcknowledged(true)} style={{padding:'12px 28px',borderRadius:12,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>I Understand - Continue</button>
      </div>
    )

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🔒" title="Termination Recommendation"
        breadcrumb="Performance & Talent Management > Goal & Performance"
        gradient={G}
        stats={[
          {icon:'🔒',label:'Confidentiality',  value:'HR/Exec Only'},
          {icon:'⚠',label:'Flagged Cases',      value:FLAGS.length},
          {icon:'📋',label:'Min Legal Cycles',   value:'3 Consecutive'},
          {icon:'📝',label:'7-Day Right',        value:'Tracked'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#334155',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Objective Evidence Only, Last Resort:</strong> This flags documented patterns - never auto-decides. Per Nepal Labour Act Section 142, lawful termination for performance requires 3 consecutive unsatisfactory formal appraisals AND a mandatory 7-day written-explanation opportunity. Approved cases route to Exit Management for the full offboarding workflow.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(f=>{
          const dc = DUE_PROCESS_CFG[f.due_process_status]
          return (
            <div key={f.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:f.employee,...f}})}}
              style={{background:'#fff',border:`1.5px solid ${dc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${dc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{f.employee}</span>
                    <span style={{background:dc.bg,color:dc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{dc.label}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748b'}}>{f.dept}</div>
                </div>
              </div>
              <div style={{padding:'12px 18px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[{l:'Unsatisfactory Cycles',v:f.indicators.consecutive_unsatisfactory_appraisals+'/3',c:'#ef4444'},
                  {l:'Unaddressed PIPs',v:f.indicators.unaddressed_pip_count,c:'#f59e0b'},
                  {l:'Attendance Breaches',v:f.indicators.attendance_breach_count,c:'#94a3b8'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:7,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'10px 18px',display:'flex',gap:8,flexWrap:'wrap'}}>
                <span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>📝 {f.documented_warnings} documented warnings</span>
                {f.explanation_period_used&&<span style={{background:'#f0fdf4',color:'#15803d',fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>✓ 7-day explanation completed</span>}
              </div>
              <div style={{padding:'10px 18px',fontSize:10,color:'#374151'}}>{f.flag_note}</div>
              <div style={{padding:'10px 18px',display:'flex',gap:8}}>
                <button style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#f59e0b',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Continue PIP Monitoring</button>
                <button disabled style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#e2e8f0',color:'#94a3b8',fontSize:11,fontWeight:700,cursor:'not-allowed'}}>🔒 Escalate to Exit Mgmt (Not Yet Eligible)</button>
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Documentation',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
