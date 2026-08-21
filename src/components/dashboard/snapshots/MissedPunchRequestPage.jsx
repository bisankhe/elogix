// FILE: MissedPunchRequestPage.jsx - Missed Log In/Out Request (Daily Attendance)
// 3-step ESS flow: Flag -> Submit Request -> Manager Approval. Mirrors brief's
// exact wireframe: Action Items banner, request modal, approval interface with
// overlapping-schedule/weekly-hours warnings.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const REASON_OPTIONS = ['Forgot to clock out','Forgot to clock in','System/device error','Client visit - no access to device','Network/connectivity failure','Other']

const REQUESTS = [
  { id:'mp1', employee:'Hari Thapa', dept:'IT', date:'2025-06-20', punch_type:'clock_out',
    scheduled_time:'06:00 AM', requested_time:'06:05 AM', reason:'System/device error',
    evidence_uploaded:true, weekly_hours_after:46, overtime_triggered:false,
    status:'pending', submitted_at:'2025-06-21 08:10 AM', manager:'Bikash Shrestha',
    impact_links:['Employee Movement','Live Attendance'] },
  { id:'mp2', employee:'Maya Pradhan', dept:'Finance', date:'2025-06-19', punch_type:'clock_in',
    scheduled_time:'09:00 AM', requested_time:'09:00 AM', reason:'Forgot to clock in',
    evidence_uploaded:false, weekly_hours_after:40, overtime_triggered:false,
    status:'approved', submitted_at:'2025-06-19 02:15 PM', manager:'Sanjay Karki',
    impact_links:['Employee Movement'] },
  { id:'mp3', employee:'Anjali Sharma', dept:'Sales', date:'2025-06-18', punch_type:'clock_out',
    scheduled_time:'05:00 PM', requested_time:'08:30 PM', reason:'Client visit - no access to device',
    evidence_uploaded:true, weekly_hours_after:52, overtime_triggered:true,
    status:'rejected', submitted_at:'2025-06-19 09:00 AM', manager:'Dipak Tamang',
    rejected_at:'2025-06-19 11:20 AM', rejection_reason:'Pushes weekly hours past LA2074 48hr cap without prior OT approval. Please resubmit with manager pre-authorization.',
    impact_links:[] },
]

const STATUS_CFG = {
  pending:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending Approval'},
  approved:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Approved'},
  rejected:{c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'Rejected'},
const PUNCH_TYPE_LABELS = {clock_in:'Clock In',clock_out:'Clock Out'}

export default function MissedPunchRequestPage() {
  const [requests, setRequests] = useState(REQUESTS)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showSubmit, setShowSubmit] = useState(false)
  const [showApproval, setShowApproval] = useState(null)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = requests.filter(r=>{
    if (filterStatus!=='all'&&r.status!==filterStatus) return false
    if (search&&!r.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const pendingCount = requests.filter(r=>r.status==='pending').length
  const thisMonthCount = requests.length

  const approve = (id) => setRequests(prev=>prev.map(r=>r.id===id?{...r,status:'approved',approved_at:new Date().toLocaleString()}:r))
  const reject = (id) => setRequests(prev=>prev.map(r=>r.id===id?{...r,status:'rejected',rejected_at:new Date().toLocaleString(),rejection_reason:'Rejected via dashboard.'}:r))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="🕐" title="Missed Log In/Out Request"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'🕐',label:'Total Requests',  value:requests.length},
          {icon:'⏳',label:'Pending Approval', value:pendingCount},
          {icon:'✅',label:'Approved',          value:requests.filter(r=>r.status==='approved').length},
          {icon:'📅',label:'This Pay Period',  value:thisMonthCount+'/3 cap'},
        ]}
        onAdd={()=>setShowSubmit(true)} addLabel="Resolve Missed Punch"
        onExcel={()=>setShowExcel(true)}/>

      {/* Action Items banner - exact wireframe element from brief */}
      {pendingCount>0&&(
        <div style={{background:'linear-gradient(135deg,#fff7ed,#fffbeb)',border:'2px solid #fed7aa',borderRadius:14,padding:'14px 18px',marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
          <span style={{fontSize:24}}>⚠</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:800,color:'#7c2d12'}}>You have {pendingCount} missed punch request{pendingCount>1?'s':''} awaiting approval</div>
            <div style={{fontSize:10,color:'#9a3412'}}>Resolve before the payroll cutoff to avoid your timesheet rolling to next cycle.</div>
          </div>
          <button onClick={()=>setFilterStatus('pending')} style={{padding:'8px 16px',borderRadius:9,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>Review Now</button>
        </div>
      )}

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Act 2074:</strong> Unapproved missed logs default to Absent Without Leave (AWOL) - Section 131 permits disciplinary action from warning to remuneration deduction. Submit within 48 hours. Max 3 regularization requests per pay period (progressive policy applies past that).</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending','approved','rejected'].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterStatus===s?'#fff':'transparent',color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:14}}>
        {filtered.map(r=>{
          const sc = STATUS_CFG[r.status]
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{PUNCH_TYPE_LABELS[r.punch_type]}</span>
                    {r.overtime_triggered&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚠ OT Triggered</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.dept} . Date: {r.date} . Manager: {r.manager}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:900,color:r.weekly_hours_after>48?'#ef4444':A}}>{r.weekly_hours_after}h</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>WEEKLY HRS AFTER</div>
                </div>
              </div>

              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Scheduled',v:r.scheduled_time,c:'#94a3b8'},{l:'Requested',v:r.requested_time,c:A},{l:'Reason',v:r.reason,c:'#7c3aed'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:11,fontWeight:800,color:s.c,lineHeight:1.3}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{padding:'10px 20px',fontSize:10,color:'#64748b',fontStyle:'italic',borderBottom:'1px solid #f8fafc'}}>
                "{r.comment}" {r.evidence_uploaded&&<span style={{color:A,fontWeight:700,fontStyle:'normal'}}>📎 Evidence attached</span>}
              </div>

              {r.status==='rejected'&&r.rejection_reason&&(
                <div style={{padding:'10px 20px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}>
                  <strong>Rejection note:</strong> {r.rejection_reason}
                </div>
              )}

              <div style={{padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:9,color:'#94a3b8'}}>Submitted {r.submitted_at}</span>
                {r.status==='pending'?(
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>setShowApproval(r)} style={{padding:'7px 16px',borderRadius:8,border:`1px solid ${A}33`,background:'#fff7ed',color:A,fontSize:11,fontWeight:600,cursor:'pointer'}}>Review Details</button>
                    <button onClick={()=>approve(r.id)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
                    <button onClick={()=>reject(r.id)} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🚫 Reject</button>
                  </div>
                ):(
                  <span style={{fontSize:9,color:'#94a3b8'}}>{r.status==='approved'?`Approved ${r.approved_at}`:`Rejected ${r.rejected_at}`}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Screen 2: Request Submission Form */}
      {showSubmit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSubmit(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Resolve Missed Punch</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>Your timesheet shows an incomplete entry - let's fix it.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <Field label="Punch Type" type="select" value="" onChange={()=>{}} accent={A} options={['Clock In','Clock Out']}/>
                <Field label="Date" type="date" value="2025-06-21" onChange={()=>{}} accent={A}/>
                <Field label="Actual Time" type="time" value="" onChange={()=>{}} accent={A} required/>
                <Field label="Reason" type="select" value="" onChange={()=>{}} accent={A} options={REASON_OPTIONS}/>
              </div>
              <Field label="Comment for Supervisor" type="textarea" value="" onChange={()=>{}} accent={A} required hint="Voice input supported - be specific"/>
              <div style={{margin:'10px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Optional Evidence (email approval, security log, etc.)</div>
                <div style={{border:'2px dashed #fed7aa',borderRadius:12,padding:'16px',textAlign:'center',background:'#fff7ed',cursor:'pointer'}}>
                  <div style={{fontSize:22,marginBottom:4}}>📎</div>
                  <div style={{fontSize:10,color:'#9a3412'}}>Click or drag to upload supporting document</div>
                </div>
              </div>
              <AIImpact color={A} lines={['AI auto-checks this won\'t push weekly hours past the 48hr LA2074 cap.','Auto-routes to your direct manager for approval with shift comparison.','Max 3 requests per pay period - this would be request #2 this cycle.','Approval instantly updates Employee Movement log and payroll.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowSubmit(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowSubmit(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen 3: Manager Approval Interface (detailed view) */}
      {showApproval&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowApproval(null)}>
          <div style={{background:'#fff',borderRadius:20,width:560,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Approval Review - {showApproval.employee}</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:9,color:'#94a3b8'}}>Scheduled</div>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{showApproval.scheduled_time}</div>
                </div>
                <div style={{background:'#fff7ed',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:9,color:'#9a3412'}}>Requested</div>
                  <div style={{fontSize:13,fontWeight:800,color:A}}>{showApproval.requested_time}</div>
                </div>
              </div>
              <div style={{background:showApproval.weekly_hours_after>48?'#fef2f2':'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:11,color:showApproval.weekly_hours_after>48?'#991b1b':'#065f46'}}>
                {showApproval.weekly_hours_after>48?'⚠':'✓'} This will set the employee's weekly hours to <strong>{showApproval.weekly_hours_after}h</strong> {showApproval.weekly_hours_after>48?'- exceeds the 48hr LA2074 cap, OT pre-authorization required.':'- within statutory limits.'}
              </div>
              <div style={{fontSize:11,color:'#374151',marginBottom:14,fontStyle:'italic'}}>"{showApproval.comment}"</div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{approve(showApproval.id);setShowApproval(null)}} style={{flex:1,padding:13,borderRadius:12,border:'none',background:'#10b981',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
                <button onClick={()=>{reject(showApproval.id);setShowApproval(null)}} style={{flex:1,padding:13,borderRadius:12,border:'none',background:'#ef4444',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>🚫 Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🚫',label:'Reject',key:'reject'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={(k,item)=>{if(k==='approve')approve(item.id);if(k==='reject')reject(item.id)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Missed Punch Requests" columns={['Employee','Department','Date','Punch Type','Scheduled Time','Requested Time','Reason','Status','Manager']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
