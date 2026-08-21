// FILE: HRTicketingSystemPage.jsx - HR Ticketing System
// (HR Services & Support > HR Helpdesk)
// General-purpose Tier-0/1/2 service desk for routine HR questions --
// distinct from Complaint Management (investigation-grade) and
// Employee Feedback (open personal channel). SLA-tiered, omnichannel intake.

import { useState } from 'react'
import { Field, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const TIER_CFG = { tier_0:{c:'#94a3b8',label:'Tier 0 (Chatbot)'},tier_1:{c:'#0284c7',label:'Tier 1 (Generalist)'},tier_2:{c:'#7c3aed',label:'Tier 2 (Specialist)'} }
const STATUS_CFG = { open:{c:'#94a3b8',label:'Open'},in_progress:{c:'#f59e0b',label:'In Progress'},resolved:{c:'#10b981',label:'Resolved'} }

const TICKETS = [
  { id:'t1', ticket_no:'HRT-2025-241', subject:'Holiday balance not updating', category:'Leave', tier:'tier_0', status:'resolved',
    channel:'Web Portal', sla_hours_left:null, resolution_note:'Resolved instantly via AI chatbot -- balance recalculated.', impact_links:[] },
  { id:'t2', ticket_no:'HRT-2025-248', subject:'Payroll deduction looks incorrect this month', category:'Payroll', tier:'tier_1', status:'in_progress',
    channel:'Mobile App', sla_hours_left:6, impact_links:['Payroll Processing'] },
  { id:'t3', ticket_no:'HRT-2025-252', subject:'Need clarification on maternity leave entitlement', category:'Benefits', tier:'tier_2', status:'open',
    channel:'MS Teams', sla_hours_left:18, flag_note:'Routed to Tier 2 specialist -- requires policy interpretation.', impact_links:['HR Consultation'] },
]

export default function HRTicketingSystemPage() {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = TICKETS.filter(t=>!search||t.subject.toLowerCase().includes(search.toLowerCase())||t.ticket_no.toLowerCase().includes(search.toLowerCase()))
  const slaAtRisk = TICKETS.filter(t=>t.sla_hours_left!=null&&t.sla_hours_left<=8).length

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎫" title="HR Ticketing System"
        breadcrumb="HR Services & Support > HR Helpdesk"
        gradient={G}
        stats={[
          {icon:'🎫',label:'Open Tickets',  value:TICKETS.filter(t=>t.status!=='resolved').length},
          {icon:'⏰',label:'SLA At Risk',       value:slaAtRisk},
          {icon:'🤖',label:'Auto-Resolved (Tier 0)', value:TICKETS.filter(t=>t.tier==='tier_0').length},
          {icon:'🌐',label:'Channels',                value:'Web . Mobile . Teams . Slack'},
        ]}
        onAdd={()=>setShowNew(true)} addLabel="New Ticket"/>

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>🌐</span>
        <div style={{flex:1,minWidth:200}}><strong>Omnichannel, One Queue:</strong> Whether submitted via the web portal, mobile app, Teams, or Slack, every query lands in this single standardized queue -- never scattered across inboxes again.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by subject or ticket number..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(t=>{
          const tc = TIER_CFG[t.tier], sc = STATUS_CFG[t.status]
          return (
            <div key={t.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.subject,...t}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,padding:'16px 18px',borderLeft:`4px solid ${sc.c}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{t.subject}</div>
                  <div style={{fontSize:9,color:'#94a3b8',marginTop:3}}>{t.ticket_no} . {t.category} . via {t.channel}</div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  <span style={{background:`${tc.c}15`,color:tc.c,fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{tc.label}</span>
                  <span style={{background:`${sc.c}15`,color:sc.c,fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{sc.label}</span>
                </div>
              </div>
              {t.sla_hours_left!=null&&(
                <div style={{marginTop:8,fontSize:9,fontWeight:700,color:t.sla_hours_left<=8?'#ef4444':'#10b981'}}>⏰ SLA: {t.sla_hours_left}h remaining</div>
              )}
              {t.flag_note&&<div style={{marginTop:8,fontSize:9,color:'#581c87'}}>↪ {t.flag_note}</div>}
              {t.resolution_note&&<div style={{marginTop:8,fontSize:9,color:'#15803d',background:'#f0fdf4',borderRadius:8,padding:'8px 10px'}}>✅ {t.resolution_note}</div>}
            </div>
          )
        })}
      </div>

      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNew(false)}>
          <div style={{background:'#fff',borderRadius:20,width:'min(520px,100%)',maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:17,fontWeight:900,color:'#fff'}}>New HR Ticket</div></div>
            <div style={{padding:'22px 28px'}}>
              <Field label="Category" type="select" value="" onChange={()=>{}} accent={A} options={['Payroll','Benefits','Leave','Policy Question','IT/Access','Other']}/>
              <Field label="Subject" value="" onChange={()=>{}} accent={A} required/>
              <Field label="Description" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported"/>
              <div style={{background:'#faf5ff',borderRadius:10,padding:'10px 14px',fontSize:9,color:'#581c87',marginBottom:10}}>Our AI assistant will check the Knowledge Base first -- if it can't resolve this instantly, it routes to the right HR specialist automatically.</div>
              <button onClick={()=>setShowNew(false)} style={{width:'100%',padding:13,borderRadius:11,border:'none',background:G,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Ticket</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['AI chatbot resolves up to 60% of Tier 0 queries instantly -- leave balances, policy links, FAQ lookups -- with zero human handling.','Smart routing assigns Tier 1/2 tickets by category, department, and location automatically.','SLA timers vary by severity: payroll issues target 24-hour resolution, general policy questions target 3-5 days.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Ticket',key:'view'},{icon:'👤',label:'Reassign',key:'reassign'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
