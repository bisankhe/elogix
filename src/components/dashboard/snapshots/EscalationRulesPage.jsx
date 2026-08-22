// FILE: EscalationRulesPage.jsx - Escalation Rules
// (System Administration > Workflow & Automation)
// Generic, cross-module "if no action in N hours, escalate to X"
// engine -- distinct from the EXISTING risk_alert_rules (Risk
// Management session), which is domain-scoped (compliance/payroll/
// attrition/security only). This page governs escalation for ANY
// approval type system-wide. Directly addresses "escalation to
// nowhere" by requiring the escalation target to be empowered to act.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const ESCALATION_RULES = [
  {transaction_type:'Leave Request',threshold_hours:24,escalates_to:'Skip-Level Manager',escalates_can_act:true,active_escalations:2},
  {transaction_type:'Expense Claim',threshold_hours:48,escalates_to:'Project Head',escalates_can_act:true,active_escalations:1},
  {transaction_type:'Ethics Report',threshold_hours:72,escalates_to:'Ethics Committee Chair',escalates_can_act:true,active_escalations:0},
  {transaction_type:'Cross-Team Access Request',threshold_hours:24,escalates_to:'IT Security Lead',escalates_can_act:false,active_escalations:1,
   flag_note:'IT Security Lead is not configured with approval authority for this request type -- this is "escalation to nowhere." Reassign to an empowered approver.'},
]

export default function EscalationRulesPage() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = ESCALATION_RULES.filter(r=>!search||r.transaction_type.toLowerCase().includes(search.toLowerCase()))
  const nowhereCount = ESCALATION_RULES.filter(r=>!r.escalates_can_act).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📶" title="Escalation Rules"
        breadcrumb="System Administration > Workflow & Automation"
        gradient={G}
        stats={[
          {icon:'📶',label:'Rules Configured',  value:ESCALATION_RULES.length},
          {icon:'🚨',label:'Escalation to Nowhere',   value:nowhereCount},
          {icon:'⏳',label:'Active Escalations',          value:ESCALATION_RULES.reduce((s,r)=>s+r.active_escalations,0)},
          {icon:'📋',label:'Audit Logged',                    value:'Always'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Escalation Rule"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🚨</span>
        <div style={{flex:1,minWidth:200}}><strong>Never Escalate to Nowhere:</strong> A rule pointing at someone who isn't actually empowered to act on that request type is worse than no escalation at all -- this is checked and flagged before it happens, never discovered after a request sits ignored a second time.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search escalation rules..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.transaction_type,...r,impact_links:['Multi-Level Approval']}})}}
            style={{background:'#fff',border:`1px solid ${r.flag_note?'#fecaca':'#e2e8f0'}`,borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:'#0f172a'}}>{r.transaction_type}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>No action in {r.threshold_hours}h {'>'} escalates to {r.escalates_to}</div>
              </div>
              <span style={{background:r.escalates_can_act?'#f0fdf4':'#fef2f2',color:r.escalates_can_act?'#15803d':'#dc2626',fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>
                {r.escalates_can_act?'✓ Empowered':'⛔ Not Empowered'}
              </span>
            </div>
            {r.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#dc2626'}}>🚨 {r.flag_note}</div>}
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(460px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>New Escalation Rule</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Transaction Type" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Threshold (hours, no action)" type="number" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Escalates To" value="" onChange={()=>{}} accent={A} required/>
              <button onClick={()=>setShowAdd(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save Rule</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Every escalation is logged with the exact reason and timestamp -- a transparent audit trail, never a silent reroute nobody can later explain.','Thresholds tuned per transaction type, never one global timer that\'s too aggressive for some requests and too lax for others.','If the assigned escalation target is on leave, the rule automatically checks their delegated approver before escalating further.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Escalation History',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
