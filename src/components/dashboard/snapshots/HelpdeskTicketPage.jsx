// FILE: HelpdeskTicketPage.jsx - Helpdesk & Ticket
// (HR Services & Support > Employee Self Service)
// ESS-facing chat-style entry point + ticket history, pure UI over the
// EXISTING hr_helpdesk_tickets (HR Helpdesk session) -- never a second
// ticketing engine. The conversational AI-first lens on the same data
// HR Ticketing System's agent console already manages.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const CHAT_HISTORY = [
  {from:'me',text:'How many vacation days do I have left?'},
  {from:'bot',text:'You have 14 days of Annual Leave remaining out of 18 entitled this year. Want to start a leave request?'},
]

const MY_TICKETS = [
  {ticket_no:'HRT-2025-248',subject:'Payroll deduction looks incorrect',status:'in_progress',c:'#f59e0b',category:'Payroll'},
  {ticket_no:'HRT-2025-241',subject:'Holiday balance not updating',status:'resolved',c:'#10b981',category:'Leave'},
]

export default function HelpdeskTicketPage() {
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = MY_TICKETS.filter(t=>!search||t.subject.toLowerCase().includes(search.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🎫" title="Helpdesk & Ticket"
        breadcrumb="HR Services & Support > Employee Self Service"
        gradient={G}
        stats={[
          {icon:'🎫',label:'My Tickets',  value:MY_TICKETS.length},
          {icon:'⏳',label:'In Progress',     value:MY_TICKETS.filter(t=>t.status==='in_progress').length},
          {icon:'✅',label:'Resolved',           value:MY_TICKETS.filter(t=>t.status==='resolved').length},
          {icon:'🤖',label:'AI Assistant',          value:'Available Now'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#1e40af',display:'flex',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:18}}>💬</span>
        <div style={{flex:1,minWidth:200}}><strong>Ask First, Ticket Second:</strong> Most routine questions resolve instantly in chat -- a formal ticket only gets created if you need a human to step in.</div>
      </div>

      {/* Chat-style assistant */}
      <div style={{background:'#0f172a',borderRadius:16,padding:'18px',marginBottom:18}}>
        {CHAT_HISTORY.map((c,i)=>(
          <div key={i} style={{display:'flex',justifyContent:c.from==='me'?'flex-end':'flex-start',marginBottom:10}}>
            <div style={{background:c.from==='me'?A:'#1e293b',color:'#fff',borderRadius:14,padding:'10px 14px',maxWidth:'75%',fontSize:10}}>{c.text}</div>
          </div>
        ))}
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Ask anything..." style={{flex:1,padding:'10px 14px',borderRadius:20,border:'none',fontSize:11,outline:'none'}}/>
          <button style={{padding:'10px 18px',borderRadius:20,border:'none',background:A,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Send</button>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search my tickets..."/>

      <div style={{display:'grid',gap:12,marginTop:14}}>
        {filtered.map((t,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.subject,...t,impact_links:['HR Ticketing System']}})}}
            style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{t.subject}</div>
              <div style={{fontSize:8,color:'#94a3b8',marginTop:3}}>{t.ticket_no} . {t.category}</div>
            </div>
            <span style={{background:`${t.c}15`,color:t.c,fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{t.status.replace('_',' ')}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Tickets here are the exact same record HR\'s agent console manages -- one source of truth, two views.','AI suggests the right category automatically -- you never have to guess between Payroll, Benefits, or IT.','SLA timers shown here mirror exactly what HR sees -- full transparency, no surprises.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Ticket',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
