// FILE: AdminHelpdeskPage.jsx - Helpdesk (Administrative Operations)
// (Finance, Assets & Administration > Administrative Operations)
// Facility/IT/maintenance ticket Kanban -- deliberately distinct from
// the EXISTING hr_helpdesk_tickets (HR policy/payroll/benefits
// queries) and the ESS "Helpdesk & Ticket" page (the same HR desk,
// employee-facing lens). This is broken-AC, leaking-pipe, IT-hardware
// territory, with a hard safety-stop trigger.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const PRIORITY_CFG = { high:{c:'#ef4444',label:'High'},medium:{c:'#f59e0b',label:'Medium'},low:{c:'#94a3b8',label:'Low'} }
const STAGES = ['Open','In Progress','Resolved']

const TICKETS = [
  { id:'h1', title:'AC not cooling -- 3rd Floor East Wing', category:'Facility', priority:'medium', stage_idx:1, assigned_to:'Facilities Team' },
  { id:'h2', title:'Exposed wiring near reception -- safety hazard', category:'Facility', priority:'high', stage_idx:0, assigned_to:'Unassigned',
    flag_note:'Immediate operational danger -- per legal requirement, area should be cordoned and operations halted until resolved.' },
  { id:'h3', title:'Replace office chair -- broken wheel', category:'Furniture', priority:'low', stage_idx:2, assigned_to:'Facilities Team' },
]

export default function AdminHelpdeskPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = TICKETS.filter(t=>!search||t.title.toLowerCase().includes(search.toLowerCase()))
  const byStage = STAGES.reduce((acc,s,i)=>{acc[i]=filtered.filter(t=>t.stage_idx===i); return acc},{})

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🛠" title="Helpdesk"
        breadcrumb="Finance, Assets & Administration > Administrative Operations"
        gradient={G}
        stats={[
          {icon:'🛠',label:'Open Tickets',  value:TICKETS.filter(t=>t.stage_idx<2).length},
          {icon:'🔴',label:'High Priority',     value:TICKETS.filter(t=>t.priority==='high').length},
          {icon:'⚠',label:'Safety Triggers',        value:TICKETS.filter(t=>t.flag_note).length},
          {icon:'✅',label:'Resolved Today',           value:TICKETS.filter(t=>t.stage_idx===2).length},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="Report an Issue"/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🛠</span>
        <div style={{flex:1,minWidth:200}}><strong>Facility &amp; Maintenance, Not HR Queries:</strong> Broken AC, IT hardware, leaking pipes, furniture repairs -- this is the physical-workplace desk. HR policy or payroll questions still go through Helpdesk &amp; Ticket in Employee Self Service.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search tickets..."/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginTop:14,overflowX:'auto'}}>
        {STAGES.map((stage,i)=>(
          <div key={i} style={{background:'#f8fafc',borderRadius:14,padding:'14px',minWidth:200}}>
            <div style={{fontSize:10,fontWeight:800,color:'#0f172a',marginBottom:12}}>{stage} ({byStage[i].length})</div>
            <div style={{display:'grid',gap:10}}>
              {byStage[i].map(t=>{
                const pc = PRIORITY_CFG[t.priority]
                return (
                  <div key={t.id}
                    onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.title,...t,impact_links:['Facility Management']}})}}
                    style={{background:'#fff',border:`1px solid ${t.flag_note?'#fecaca':'#e2e8f0'}`,borderRadius:10,padding:'10px 12px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{background:`${pc.c}15`,color:pc.c,fontSize:7,fontWeight:700,padding:'2px 6px',borderRadius:20}}>{pc.label}</span>
                    </div>
                    <div style={{fontSize:9,color:'#374151'}}>{t.title}</div>
                    {t.flag_note&&<div style={{marginTop:6,fontSize:8,color:'#dc2626',fontWeight:700}}>🚨 {t.flag_note}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(480px,100%)'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'18px 24px'}}><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>Report an Issue</div></div>
            <div style={{padding:'20px 24px'}}>
              <Field label="Category" type="select" value="" onChange={()=>{}} accent={A} options={['Facility','IT Hardware','Furniture','Cleaning']}/>
              <Field label="Description" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <label style={{display:'flex',gap:8,alignItems:'center',marginBottom:14,fontSize:10,color:'#dc2626'}}>
                <input type="checkbox" style={{accentColor:'#dc2626'}}/> This is an immediate safety hazard
              </label>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Ticket</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Immediate-danger flags route to facilities leadership instantly -- the legal duty to halt unsafe operations is never delayed by a normal ticket queue.','Auto-routes by category and floor to the right maintenance staff, never a manual triage step.','Recurring issues at the same location flag a pattern -- 3 AC tickets on one floor signals a real maintenance need, not bad luck.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Ticket',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
