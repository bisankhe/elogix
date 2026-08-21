// FILE: PolicyCompliancePage.jsx - Policy Compliance
// (Compliance & Risk Management > Compliance Management)
// AI Policy Hub over the EXISTING hr_policies + hr_policy_acknowledgments
// (already tracks status/signed_at/scroll%/time-spent) -- never a
// second policy store. THE CRITICAL RULE: an employee cannot receive
// their first salary until every is_mandatory policy assigned to them
// shows status='signed' -- enforced at the payroll-gate level, not
// just a UI reminder.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const NEW_HIRE_GATES = [
  { employee:'Bipana Karki', hire_date:'2025-06-15', policies_assigned:6, policies_signed:6, first_payroll_cleared:true },
  { employee:'Ramesh KC', hire_date:'2025-06-22', policies_assigned:6, policies_signed:3, first_payroll_cleared:false,
    flag_note:'3 mandatory policies unsigned -- first salary is BLOCKED until all are acknowledged.' },
]

const DEPT_COMPLIANCE = [
  {dept:'IT',compliance_pct:96},{dept:'Sales & Marketing',compliance_pct:82,flag:'Below 90% -- send a reminder sweep.'},
  {dept:'Finance',compliance_pct:100},
]

export default function PolicyCompliancePage() {
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = NEW_HIRE_GATES.filter(g=>!search||g.employee.toLowerCase().includes(search.toLowerCase()))
  const blockedCount = NEW_HIRE_GATES.filter(g=>!g.first_payroll_cleared).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📘" title="Policy Compliance"
        breadcrumb="Compliance & Risk Management > Compliance Management"
        gradient={G}
        stats={[
          {icon:'📘',label:'New Hires Tracked',  value:NEW_HIRE_GATES.length},
          {icon:'🚫',label:'Payroll Blocked',         value:blockedCount},
          {icon:'📊',label:'Company-Wide Compliance',     value:'93%'},
          {icon:'🤖',label:'AI Policy Hub',                  value:'All Departments'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:12,padding:'12px 16px',marginBottom:14,fontSize:11,color:'#991b1b',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🚫</span>
        <div style={{flex:1,minWidth:200}}><strong>First Salary Is Gated, Not Just Tracked:</strong> Every assigned mandatory policy must show "signed" before a new hire's first payroll run can clear. This isn't a dashboard reminder -- payroll itself blocks until every signature is in.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search new hires..."/>

      <div style={{display:'grid',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map((g,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:g.employee,...g,impact_links:['My Payroll','HR Policies']}})}}
            style={{background:'#fff',border:`1.5px solid ${g.first_payroll_cleared?'#bbf7d0':'#fecaca'}`,borderRadius:16,padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{g.employee}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>Hired {g.hire_date}</div>
              </div>
              <span style={{background:g.first_payroll_cleared?'#f0fdf4':'#fef2f2',color:g.first_payroll_cleared?'#15803d':'#dc2626',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
                {g.first_payroll_cleared?'✅ Payroll Cleared':'🚫 Payroll Blocked'}
              </span>
            </div>
            <div style={{height:8,background:'#f1f5f9',borderRadius:8,overflow:'hidden',marginTop:10}}><div style={{width:`${g.policies_signed/g.policies_assigned*100}%`,height:'100%',background:g.first_payroll_cleared?'#15803d':'#f59e0b',borderRadius:8}}/></div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:6}}>{g.policies_signed}/{g.policies_assigned} mandatory policies signed</div>
            {g.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#dc2626',fontWeight:700}}>⚠ {g.flag_note}</div>}
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'20px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:14}}>🏢 Compliance by Department</div>
        {DEPT_COMPLIANCE.map((d,i)=>(
          <div key={i} style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:10}}>
              <span style={{color:'#374151'}}>{d.dept}</span><span style={{fontWeight:700,color:d.compliance_pct<90?'#f59e0b':A}}>{d.compliance_pct}%</span>
            </div>
            <div style={{height:7,background:'#f1f5f9',borderRadius:7,overflow:'hidden'}}><div style={{width:`${d.compliance_pct}%`,height:'100%',background:d.compliance_pct<90?'#f59e0b':A,borderRadius:7}}/></div>
            {d.flag&&<div style={{marginTop:4,fontSize:8,color:'#b45309'}}>⚠ {d.flag}</div>}
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['The payroll gate checks hr_policy_acknowledgments directly -- the same record that already tracks reading time, scroll depth, and digital signature.','Ask the AI Policy Hub a plain-language question like "is this employee eligible for maternity leave?" for an instant, policy-grounded answer.','SOPs and policies can be generated or updated for any department in minutes, never a from-scratch drafting exercise.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Acknowledgment Detail',key:'view'},{icon:'📧',label:'Send Reminder',key:'remind'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
