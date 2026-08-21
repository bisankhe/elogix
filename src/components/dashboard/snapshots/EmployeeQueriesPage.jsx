// FILE: EmployeeQueriesPage.jsx - Employee Queries
// (HR Services & Support > HR Helpdesk)
// ESS-facing: global search bar with predictive KB suggestions (reuses
// the EXISTING knowledge_base_articles from Internal Communication),
// categorized help tree, "My Tickets" personal dashboard.

import { useState } from 'react'
import { PageHeader, AIImpact, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const HELP_TREE = [
  {icon:'💰',label:'Ask a Benefits Question'},{icon:'⏱',label:'Report Timecard Issue'},
  {icon:'📅',label:'Schedule a Consultation'},{icon:'📋',label:'Policy Lookup'},
  {icon:'💵',label:'Payroll Question'},{icon:'🏖',label:'Leave Balance'},
]

const SUGGESTED_KB = [
  {title:'How to submit a leave request',category:'HR Policies'},
  {title:'Understanding your payslip deductions',category:'Payroll'},
  {title:'Maternity and paternity leave entitlements',category:'Benefits'},
]

const MY_TICKETS = [
  {ticket_no:'HRT-2025-248',subject:'Payroll deduction looks incorrect',status:'in_progress',c:'#f59e0b'},
  {ticket_no:'HRT-2025-241',subject:'Holiday balance not updating',status:'resolved',c:'#10b981'},
]

export default function EmployeeQueriesPage() {
  const [query, setQuery] = useState('')
  const [ctx, setCtx] = useState(null)

  const filteredKB = SUGGESTED_KB.filter(k=>!query||k.title.toLowerCase().includes(query.toLowerCase()))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="❓" title="Employee Queries"
        breadcrumb="HR Services & Support > HR Helpdesk"
        gradient={G}
        stats={[
          {icon:'❓',label:'My Open Queries',  value:MY_TICKETS.filter(t=>t.status!=='resolved').length},
          {icon:'📚',label:'KB Articles',          value:SUGGESTED_KB.length+'+'},
          {icon:'✅',label:'Resolved',              value:MY_TICKETS.filter(t=>t.status==='resolved').length},
          {icon:'🤖',label:'AI Assistant',            value:'24/7'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      {/* Global search bar -- the centerpiece */}
      <div style={{background:G,borderRadius:18,padding:'28px 24px',marginBottom:18,textAlign:'center'}}>
        <div style={{fontSize:14,fontWeight:800,color:'#fff',marginBottom:14}}>What can we help you with?</div>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search policies, payroll, benefits..."
          style={{width:'100%',maxWidth:480,padding:'14px 20px',borderRadius:30,border:'none',fontSize:13,outline:'none'}}/>
      </div>

      {/* Predictive KB suggestions */}
      {filteredKB.length>0&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px',marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>📚 Suggested Articles</div>
          {filteredKB.map((k,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<filteredKB.length-1?'1px solid #f8fafc':'none',cursor:'pointer'}}>
              <span style={{fontSize:10,color:'#374151'}}>{k.title}</span>
              <span style={{background:'#eff6ff',color:'#1e40af',fontSize:7,fontWeight:600,padding:'2px 8px',borderRadius:20}}>{k.category}</span>
            </div>
          ))}
        </div>
      )}

      {/* Categorized help tree */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:18}}>
        {HELP_TREE.map((h,i)=>(
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:'16px',textAlign:'center',cursor:'pointer'}}>
            <div style={{fontSize:24,marginBottom:8}}>{h.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:'#0f172a'}}>{h.label}</div>
          </div>
        ))}
      </div>

      {/* My Tickets dashboard */}
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px'}}>
        <div style={{fontSize:11,fontWeight:800,color:'#0f172a',marginBottom:12}}>🎫 My Tickets</div>
        {MY_TICKETS.map((t,i)=>(
          <div key={i}
            onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:t.subject,impact_links:['HR Ticketing System','Case Tracking']}})}}
            style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<MY_TICKETS.length-1?'1px solid #f8fafc':'none'}}>
            <span style={{fontSize:10,color:'#374151'}}>{t.ticket_no} -- {t.subject}</span>
            <span style={{background:`${t.c}15`,color:t.c,fontSize:8,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{t.status.replace('_',' ')}</span>
          </div>
        ))}
      </div>

      <div style={{marginTop:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'16px 20px'}}>
        <AIImpact color={A} lines={['Predictive search surfaces the right article before you even finish typing -- often resolving the question without a ticket at all.','Help tree categories adapt to your role -- a manager sees approval workflows, an individual contributor sees self-service requests.','Every category routes directly into HR Ticketing System with the right tier pre-assigned.']}/>
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Ticket',key:'view'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
