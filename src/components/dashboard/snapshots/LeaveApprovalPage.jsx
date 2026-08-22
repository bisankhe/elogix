// FILE: LeaveApprovalPage.jsx - Leave Approval (Leave Operations)
// Manager inbox: team-overlap preview, balance check, SLA countdown,
// one-tap approve/reject/revision, AI auto-approve suggestion.

import { useState } from 'react'
import { PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const SLA_HOURS = 48

const QUEUE = [
  { id:'la1', employee:'Sunil Magar', dept:'Customer Service', leave_type:'Home/Annual Leave',
    start_date:'2025-07-10', end_date:'2025-07-12', days:3, reason:'Family trip to Pokhara',
    balance_after:15.5, team_overlap:1, overlap_names:['Priya Shah'], submitted:'2025-06-20 09:00 AM',
    hours_pending:30, ai_suggestion:'approve', ai_note:'Sufficient balance, low team impact, no blackout conflict.',
    impact_links:['Leave Balance','Leave Calendar'] },
  { id:'la2', employee:'Priya Shah', dept:'Customer Service', leave_type:'Home/Annual Leave',
    start_date:'2025-07-11', end_date:'2025-07-11', days:1, reason:'Personal errand',
    balance_after:9.5, team_overlap:1, overlap_names:['Sunil Magar'], submitted:'2025-06-19 02:00 PM',
    hours_pending:43, ai_suggestion:'review', ai_note:'Overlaps with another pending CS request - only 4 of 6 staff would remain on shift.',
    impact_links:['Leave Calendar'] },
  { id:'la3', employee:'Bikash Rai', dept:'IT', leave_type:'Sick Leave',
    start_date:'2025-06-22', end_date:'2025-06-22', days:1, reason:'Fever',
    balance_after:11, team_overlap:0, overlap_names:[], submitted:'2025-06-21 08:00 AM',
    hours_pending:2, ai_suggestion:'approve', ai_note:'Sick leave is a statutory right - auto-approval recommended.',
    impact_links:[] },
]

export default function LeaveApprovalPage() {
  const [queue, setQueue] = useState(QUEUE)
  const [search, setSearch] = useState('')
  const [ctx, setCtx] = useState(null)

  const filtered = queue.filter(q=>!search||q.employee.toLowerCase().includes(search.toLowerCase()))
  const approve = (id) => setQueue(prev=>prev.filter(q=>q.id!==id))
  const reject = (id) => setQueue(prev=>prev.filter(q=>q.id!==id))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📥" title="Leave Approval"
        breadcrumb="Workforce Operations > Leave Management > Leave Operations"
        gradient={G}
        stats={[
          {icon:'📥',label:'Pending Review',  value:queue.length},
          {icon:'👥',label:'With Overlap',     value:queue.filter(q=>q.team_overlap>0).length},
          {icon:'🤖',label:'AI Auto-Approve',  value:queue.filter(q=>q.ai_suggestion==='approve').length},
          {icon:'⏰',label:'SLA Window',       value:SLA_HOURS+'h'},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>{}}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>🤖</span>
        <div><strong>AI-Assisted Scheduling:</strong> AI evaluates team capacity, balance sufficiency, and calendar conflicts to suggest approve/review before you act - final decision always stays with you. Requests pending past the {SLA_HOURS}-hour SLA auto-escalate per your configured approval hierarchy.</div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>

      <div style={{display:'grid',gap:14,marginTop:14}}>
        {filtered.map(q=>{
          const slaUrgent = q.hours_pending >= SLA_HOURS*0.8
          return (
            <div key={q.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:q.employee,...q}})}}
              style={{background:'#fff',border:`1.5px solid ${slaUrgent?'#fecaca':'#e2e8f0'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${q.ai_suggestion==='approve'?'#10b981':'#f59e0b'}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{q.employee}</span>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{q.leave_type}</span>
                    {slaUrgent&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⏰ SLA at risk</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{q.dept} . {q.start_date}{q.end_date!==q.start_date?` > ${q.end_date}`:''} . {q.days}d</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:900,color:A}}>{q.balance_after}d</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>BALANCE AFTER</div>
                </div>
              </div>

              <div style={{padding:'10px 20px',fontSize:10,color:'#374151',fontStyle:'italic',borderBottom:'1px solid #f8fafc'}}>"{q.reason}"</div>

              {q.team_overlap>0&&(
                <div style={{padding:'10px 20px',background:'#fffbeb',fontSize:10,color:'#92400e',borderBottom:'1px solid #fed7aa'}}>
                  👥 <strong>Team overlap:</strong> {q.overlap_names.join(', ')} also off during this period
                </div>
              )}

              <div style={{padding:'10px 20px',background:q.ai_suggestion==='approve'?'#f0fdf4':'#fffbeb',fontSize:10,color:q.ai_suggestion==='approve'?'#065f46':'#92400e'}}>
                🤖 <strong>AI suggests: {q.ai_suggestion==='approve'?'Approve':'Review Closer'}</strong> - {q.ai_note}
              </div>

              <div style={{padding:'12px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:9,color:'#94a3b8'}}>Pending {q.hours_pending}h (of {SLA_HOURS}h SLA)</span>
                <div style={{display:'flex',gap:8}}>
                  <button style={{padding:'7px 14px',borderRadius:8,border:`1px solid ${A}33`,background:'#fff7ed',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>↩ Request Revision</button>
                  <button onClick={()=>approve(q.id)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
                  <button onClick={()=>reject(q.id)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🚫 Reject</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Full Request',key:'view'},{icon:'📅',label:'View Team Calendar',key:'calendar'},
        {icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
    </div>
  )
}
