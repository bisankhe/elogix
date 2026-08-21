// FILE: DisciplinaryManagementPage.jsx - Disciplinary Management
// (Employee Experience & Culture > Employee Relations)
// Section 61: investigation committee, written notice, 7-day right to
// defend, proportional action. Distinct from the EXISTING
// performance_improvement_plans (performance gaps) -- this is
// misconduct (negligence, theft, unauthorized absence, rule violation).

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const STATUS_CFG = {
  notice_issued:{c:'#f59e0b',label:'Notice Issued -- Awaiting Defense'},investigating:{c:'#7c3aed',label:'Investigating'},
  action_decided:{c:'#0284c7',label:'Action Decided'},closed:{c:'#10b981',label:'Closed'},

const CASES = [
  { id:'d1', employee:'Hari Thapa', misconduct:'Repeated unauthorized absence', policy_violated:'Attendance Policy 4.2', status:'notice_issued',
    defense_deadline:'2025-06-29', days_remaining:4, impact_links:['Warning Letter','Daily Attendance'] },
  { id:'d2', employee:'Ramesh KC', misconduct:'Negligence resulting in client data exposure', policy_violated:'Data Security Policy 2.1', status:'investigating',
    investigation_committee:['HR Director','IT Security Lead','Legal Counsel'], impact_links:['Complaint Management'] },
  { id:'d3', employee:'Maya Pradhan', misconduct:'Minor policy infraction -- late submission of expense reports', policy_violated:'Finance Policy 6.3', status:'closed',
    action_taken:'Verbal Warning', resolution_note:'First offense -- coaching provided, no written warning required.' },
]

export default function DisciplinaryManagementPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = CASES.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase()))
  const defenseAtRisk = CASES.filter(c=>c.status==='notice_issued'&&c.days_remaining<=3).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📋" title="Disciplinary Management"
        breadcrumb="Employee Experience & Culture > Employee Relations"
        gradient={G}
        stats={[
          {icon:'📋',label:'Active Cases',  value:CASES.filter(c=>c.status!=='closed').length},
          {icon:'⏰',label:'Defense Deadline Near', value:defenseAtRisk},
          {icon:'✅',label:'Closed This Quarter',     value:CASES.filter(c=>c.status==='closed').length},
          {icon:'⚖',label:'Section',                    value:'Labour Act 61'},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="New Disciplinary Case"/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>⚖</span>
        <div style={{flex:1,minWidth:200}}><strong>Misconduct, Not Performance:</strong> This tracks negligence, theft, unauthorized absence, and rule violations under Section 61 -- distinct from Performance Improvement Plans, which address skill or output gaps. Every case requires a written notice and a minimum 7-day right to defend before any action is finalized.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:16,marginTop:14}}>
        {filtered.map(c=>{
          const sc = STATUS_CFG[c.status]
          return (
            <div key={c.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.employee,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'14px 18px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap',gap:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{c.employee}</div>
                  <div style={{fontSize:10,color:'#64748b'}}>{c.misconduct}</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'4px 12px',borderRadius:20}}>{sc.label}</span>
              </div>
              <div style={{padding:'12px 18px'}}>
                <div style={{fontSize:10,color:'#374151'}}>📜 Policy violated: {c.policy_violated}</div>
                {c.investigation_committee&&(
                  <div style={{marginTop:8,fontSize:9,color:'#94a3b8'}}>Committee: {c.investigation_committee.join(', ')}</div>
                )}
                {c.defense_deadline&&(
                  <div style={{marginTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:9,color:'#94a3b8'}}>Right-to-defend deadline: {c.defense_deadline}</span>
                    <span style={{fontSize:9,fontWeight:700,color:c.days_remaining<=3?'#ef4444':'#10b981'}}>{c.days_remaining} days remaining</span>
                  </div>
                )}
                {c.action_taken&&<div style={{marginTop:8,fontSize:10,fontWeight:700,color:A}}>Action: {c.action_taken}</div>}
                {c.resolution_note&&<div style={{marginTop:8,fontSize:9,color:'#15803d',background:'#f0fdf4',borderRadius:8,padding:'8px 10px'}}>✅ {c.resolution_note}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(540px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:17,fontWeight:900,color:'#fff'}}>New Disciplinary Case</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Employee" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Misconduct Description" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <Field label="Policy Violated" value="" onChange={()=>{}} accent={A} required/>
              <div style={{background:'#eef2ff',borderRadius:10,padding:'10px 14px',fontSize:9,color:'#3730a3',marginBottom:10}}>A written notice will be generated and the employee will have a minimum of 7 days to submit a defense, per Section 61.</div>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Issue Written Notice</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Disciplinary standards are checked against department-wide history to flag inconsistent enforcement before it becomes a discrimination claim.','The 7-day defense window cannot be bypassed -- the system blocks action finalization until it lapses or the employee responds.','Upheld cases auto-link to Warning Letter generation and feed the termination-eligibility tracker for repeated offenses.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Case',key:'view'},{icon:'📝',label:'Generate Warning Letter',key:'warning'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
