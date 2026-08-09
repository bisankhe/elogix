// FILE: CaseTrackingPage.jsx - Case Tracking
// (HR Services & Support > HR Helpdesk)
// HR agent console: SLA-color-coded case queue, 360-degree employee
// pane on open, canned responses + internal notes, audit-trail timeline.
// Escalates into the EXISTING grievances table when a case becomes a
// formal Section 113-115 statutory grievance -- never a second legal clock.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const CASES = [
  { id:'cs1', case_no:'CASE-2025-088', employee:'Hari Thapa', dept:'IT', tenure_years:2.3, manager:'Sunil Magar',
    subject:'Payroll deduction looks incorrect', sla_status:'at_risk', sla_hours_left:4,
    timeline:[{ts:'2025-06-23 09:00',event:'Ticket received via Mobile App'},{ts:'2025-06-23 09:15',event:'Auto-routed to Payroll Tier 1'},{ts:'2025-06-24 14:00',event:'Agent requested payslip detail from employee'}],
    impact_links:['HR Ticketing System','Payroll Processing'] },
  { id:'cs2', case_no:'CASE-2025-091', employee:'Anjali Sharma', dept:'Sales', tenure_years:1.8, manager:'Dipesh Bhattarai',
    subject:'Formal grievance: unfair treatment in territory reassignment', sla_status:'escalated', sla_hours_left:null,
    timeline:[{ts:'2025-06-20 10:00',event:'Submitted via HR Ticketing System'},{ts:'2025-06-21 08:00',event:'Escalated to formal Grievance per Section 113'}],
    flag_note:'Escalated into Grievance Management -- tracked under the statutory legal clock there, not duplicated here.', impact_links:['Grievance Management'] },
]

const SLA_CFG = { on_track:{c:'#10b981',label:'On Track'},at_risk:{c:'#f59e0b',label:'At Risk'},escalated:{c:'#7c3aed',label:'Escalated'} }

export default function CaseTrackingPage() {
  const [search, setSearch] = useState('')
  const [selectedCase, setSelectedCase] = useState(null)
  const [ctx, setCtx] = useState(null)

  const filtered = CASES.filter(c=>!search||c.employee.toLowerCase().includes(search.toLowerCase())||c.case_no.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🗂" title="Case Tracking"
        breadcrumb="HR Services & Support > HR Helpdesk"
        gradient={G}
        stats={[
          {icon:'🗂',label:'Active Cases',  value:CASES.length},
          {icon:'⏰',label:'SLA At Risk',      value:CASES.filter(c=>c.sla_status==='at_risk').length},
          {icon:'⚖',label:'Escalated to Grievance', value:CASES.filter(c=>c.sla_status==='escalated').length},
          {icon:'📋',label:'Audit Entries',           value:CASES.reduce((s,c)=>s+c.timeline.length,0)},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>👤</span>
        <div style={{flex:1,minWidth:200}}><strong>Full Context, No App-Switching:</strong> Open any case and the employee's HRIS profile -- tenure, manager, department -- appears alongside it. When a case becomes a formal grievance, it links to Grievance Management's statutory tracker rather than running a second, conflicting legal clock.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee or case number..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(c=>{
          const sc = SLA_CFG[c.sla_status]
          return (
            <div key={c.id} onClick={()=>setSelectedCase(c)}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:c.subject,...c}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`,cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{c.subject}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{c.case_no} . {c.employee} ({c.dept})</div>
                </div>
                <span style={{background:`${sc.c}15`,color:sc.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{sc.label}</span>
              </div>
              {c.sla_hours_left!=null&&<div style={{marginTop:8,fontSize:9,fontWeight:700,color:'#ef4444'}}>⏰ {c.sla_hours_left}h SLA remaining</div>}
              {c.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#3730a3'}}>↪ {c.flag_note}</div>}
            </div>
          )
        })}
      </div>

      {selectedCase&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:5000,display:'flex',justifyContent:'flex-end'}} onClick={()=>setSelectedCase(null)}>
          <div style={{background:'#fff',width:'min(460px,100%)',height:'100%',overflow:'auto',boxShadow:'-4px 0 24px rgba(0,0,0,.15)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 24px'}}>
              <div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{selectedCase.case_no}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>{selectedCase.subject}</div>
            </div>
            {/* 360-degree employee pane */}
            <div style={{padding:'16px 24px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:8}}>👤 Employee Profile</div>
              <div style={{fontSize:10,color:'#374151'}}>{selectedCase.employee} . {selectedCase.dept}</div>
              <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{selectedCase.tenure_years} yrs tenure . Manager: {selectedCase.manager}</div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>📋 Audit Timeline</div>
              {selectedCase.timeline.map((t,i)=>(
                <div key={i} style={{display:'flex',gap:12,marginBottom:14}}>
                  <div style={{width:10,height:10,borderRadius:10,background:A,marginTop:3,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:9,color:'#94a3b8'}}>{t.ts}</div>
                    <div style={{fontSize:10,color:'#374151',marginTop:2}}>{t.event}</div>
                  </div>
                </div>
              ))}
              <textarea placeholder="Internal HR note (not visible to employee)..." style={{width:'100%',minHeight:60,borderRadius:10,border:'1px solid #e2e8f0',padding:10,fontSize:10,marginTop:10}}/>
              <button style={{width:'100%',padding:12,borderRadius:10,border:'none',background:G,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:10}}>+ Add Update</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI suggests the next best action based on similar past cases -- reducing average response time.','Internal notes stay invisible to the employee -- only customer-facing updates appear in their My Tickets view.','Sentiment scanning on case language flags tone shifts that may signal flight risk, surfaced privately to HR.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'Open Full Case',key:'view'},{icon:'⚖',label:'Escalate to Grievance',key:'escalate'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
