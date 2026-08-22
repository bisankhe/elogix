// FILE: AutomationRulesPage.jsx - Automation Rules
// (System Administration > Workflow & Automation)
// Generic If/Then condition-dropdown engine -- the no-code layer that
// directly answers the brief's "Heavy IT Dependency" pain point. HR
// admins build conditional logic here instead of filing a dev ticket.
// Includes an explicit exception/override path so rigid automation
// never blocks a genuine edge case (visa delays, off-cycle leave).

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const AUTOMATION_RULES = [
  {name:'Auto-approve short leave',condition:'Leave duration <= 1 day AND requester tenure >= 1 year',action:'Auto-approve, skip manager review',runs_30d:38,active:true},
  {name:'Block payroll on unsigned policy',condition:'First payslip AND mandatory policy unsigned',action:'Block payslip generation, notify HR',runs_30d:3,active:true},
  {name:'Flag salary spike',condition:'Gross pay increase > 25% month-over-month',action:'Create payroll risk flag',runs_30d:2,active:true},
];

const PENDING_EXCEPTIONS = [
  {request:'Visa delay -- onboarding day-1 IT provisioning blocked','reason':'Standard rule requires verified citizenship doc; visa processing pending','requested_by':'HR Admin'},
]

export default function AutomationRulesPage() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = AUTOMATION_RULES.filter(r=>!search||r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⚙️" title="Automation Rules"
        breadcrumb="System Administration > Workflow & Automation"
        gradient={G}
        stats={[
          {icon:'⚙️',label:'Active Rules',  value:AUTOMATION_RULES.filter(r=>r.active).length},
          {icon:'▶',label:'Runs This Month',   value:AUTOMATION_RULES.reduce((s,r)=>s+r.runs_30d,0)},
          {icon:'🆘',label:'Pending Exceptions',   value:PENDING_EXCEPTIONS.length},
          {icon:'🧑‍💻',label:'IT Tickets Avoided',         value:'~40/mo'},
        ]}
        onAdd={()=>setShowAdd(true)} addLabel="New Automation Rule"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🧑‍💻</span>
        <div style={{flex:1,minWidth:200}}><strong>No IT Ticket Required:</strong> An HR admin builds and edits If/Then logic directly here -- changing a rule takes effect immediately, never a development sprint away.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search automation rules..."/>

      <div style={{display:'grid',gap:14,marginTop:14,marginBottom:18}}>
        {filtered.map((r,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.name,...r,impact_links:['Workflow Builder']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{r.name}</div>
              <span style={{fontSize:8,color:'#94a3b8'}}>{r.runs_30d} runs (30d)</span>
            </div>
            <div style={{fontSize:9,color:'#374151',background:'#f8fafc',padding:'8px 10px',borderRadius:8}}>
              <strong style={{color:A}}>IF</strong> {r.condition} <strong style={{color:A}}>THEN</strong> {r.action}
            </div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #fed7aa',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🆘 Pending Exception Requests</div>
        {PENDING_EXCEPTIONS.map((e,i)=>(
          <div key={i} style={{padding:'9px 0',borderBottom:i<PENDING_EXCEPTIONS.length-1?'1px solid #f8fafc':'none'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{e.request}</div>
            <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{e.reason} . Requested by {e.requested_by}</div>
          </div>
        ))}
      </div>

      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowAdd(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(500px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>New Automation Rule</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Rule Name" value="" onChange={()=>{}} accent={A} required/>
              <Field label="IF Condition" value="" onChange={()=>{}} accent={A} required hint="e.g. Leave duration <= 1 day AND tenure >= 1 year"/>
              <Field label="THEN Action" value="" onChange={()=>{}} accent={A} required hint="e.g. Auto-approve, skip manager review"/>
              <button onClick={()=>setShowAdd(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Save Rule</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Genuine edge cases -- visa delays, off-cycle leave -- route to a manual exception queue instead of silently failing the standard rule.','Every rule run is logged: which condition matched, what action fired, and when -- a defensible trail if a decision is ever questioned.','AI suggests new automation rules based on repetitive manual approvals it notices across the system.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Run History',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
