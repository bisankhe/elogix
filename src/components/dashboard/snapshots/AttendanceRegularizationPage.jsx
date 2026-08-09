// FILE: AttendanceRegularizationPage.jsx - Attendance Regularization (Daily Attendance)
// Broader umbrella than Missed Punch Request: covers Absent->Present, Half-Day->Full-Day,
// On-Duty/Field-Work justification, System Downtime fallback. Calendar view with color-coded
// alerts, AI auto-suggestion for recurring patterns, manager audit-trail approval card.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fdba74 100%)'
const A = '#c2410c'

const STATUS_TYPES = ['Absent > Present','Half-Day > Full-Day','On-Duty / Field Work','System Downtime Fallback','Leave Without Pay > Sanctioned Leave']
const REASON_OPTIONS = ['Forgot to punch','Field work / client visit','System malfunction','Medical emergency','Approved verbally, not logged','Network/device failure','Other']

const CALENDAR_DAYS = [
  {day:1,status:'present'},{day:2,status:'present'},{day:3,status:'present'},{day:4,status:'present'},
  {day:5,status:'present'},{day:6,status:'weekend'},{day:7,status:'weekend'},
  {day:8,status:'present'},{day:9,status:'missed'},{day:10,status:'present'},{day:11,status:'present'},
  {day:12,status:'present'},{day:13,status:'weekend'},{day:14,status:'weekend'},
  {day:15,status:'present'},{day:16,status:'pending'},{day:17,status:'present'},{day:18,status:'absent'},
  {day:19,status:'present'},{day:20,status:'weekend'},{day:21,status:'present'},
]
const CAL_CFG = {
  present:{c:'#10b981',bg:'#f0fdf4'}, missed:{c:'#ef4444',bg:'#fef2f2'},
  pending:{c:'#f59e0b',bg:'#fffbeb'}, absent:{c:'#dc2626',bg:'#fee2e2'},
  weekend:{c:'#cbd5e1',bg:'#f8fafc'},
}

const REQUESTS = [
  { id:'rg1', employee:'Sunita Rai', dept:'HR', date:'2025-06-18', status_type:'Absent > Present',
    original_status:'Absent', requested_status:'Present (On-Duty)', reason:'Field work / client visit',
    comment:'Visited 3 clients in Lalitpur for the SSF enrollment drive - calendar event attached, no office punch.',
    evidence_uploaded:true, calendar_match:true, manager:'Priya Adhikari',
    weekly_hours_after:42, overlap_conflict:false,
    status:'pending', submitted_at:'2025-06-19 09:00 AM',
    impact_links:['Employee Movement','Task & Location Assignment'] },
  { id:'rg2', employee:'Bikash Rai', dept:'IT', date:'2025-06-16', status_type:'Half-Day > Full-Day',
    original_status:'Half-Day', requested_status:'Full-Day', reason:'System malfunction',
    comment:'Biometric device at IT Helpdesk was down from 1 PM to close - I was on-site the full shift.',
    evidence_uploaded:false, calendar_match:false, manager:'Bikash Shrestha',
    weekly_hours_after:46, overlap_conflict:false,
    status:'approved', submitted_at:'2025-06-17 08:30 AM', approved_at:'2025-06-17 11:15 AM',
    impact_links:['Employee Movement'] },
  { id:'rg3', employee:'Anjali Sharma', dept:'Sales', date:'2025-06-14', status_type:'Leave Without Pay > Sanctioned Leave',
    original_status:'LWP', requested_status:'Sanctioned Sick Leave', reason:'Medical emergency',
    comment:'Hospitalized for 1 day, family submitted notice late. Medical certificate attached.',
    evidence_uploaded:true, calendar_match:false, manager:'Dipak Tamang',
    weekly_hours_after:48, overlap_conflict:false,
    status:'rejected', submitted_at:'2025-06-15 10:00 AM', rejected_at:'2025-06-15 02:00 PM',
    rejection_reason:'Medical certificate date does not match the requested absence date - please resubmit with correct documentation.',
    impact_links:[] },
]

const STATUS_CFG = {
  pending:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending Approval'},
  approved:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Approved'},
  rejected:{c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'Rejected'},
}

export default function AttendanceRegularizationPage() {
  const [requests, setRequests] = useState(REQUESTS)
  const [form, setForm] = useState({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [view, setView] = useState('list')
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

  const approve = (id) => setRequests(prev=>prev.map(r=>r.id===id?{...r,status:'approved',approved_at:new Date().toLocaleString()}:r))
  const reject = (id) => setRequests(prev=>prev.map(r=>r.id===id?{...r,status:'rejected',rejected_at:new Date().toLocaleString(),rejection_reason:'Rejected via dashboard.'}:r))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📆" title="Attendance Regularization"
        breadcrumb="Workforce Operations > Attendance Management > Daily Attendance"
        gradient={G}
        stats={[
          {icon:'📆',label:'Total Requests',  value:requests.length},
          {icon:'⏳',label:'Pending Approval', value:pendingCount},
          {icon:'✅',label:'Approved',          value:requests.filter(r=>r.status==='approved').length},
          {icon:'🚫',label:'Rejected',          value:requests.filter(r=>r.status==='rejected').length},
        ]}
        onAdd={()=>setShowSubmit(true)} addLabel="Request Regularization"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7c2d12',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Nepal Labour Rules 2075, Section 37:</strong> No worker should remain absent without sanctioned leave. Emergency absences can be regularized after the fact via employer sanction. Absence beyond 30 consecutive days without notice gives the employer legal grounds for removal from service. Submit within 48-72 hours of the discrepancy.</div>
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
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {[['list','📋 List'],['calendar','📅 Calendar']].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:view===v?'#fff':'transparent',color:view===v?A:'#64748b',
                fontWeight:view===v?700:400,boxShadow:view===v?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar view - color-coded monthly grid per brief */}
      {view==='calendar'&&(
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:16,padding:'18px 20px',marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:12}}>📅 June 2025 - Color-Coded Attendance</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
            {CALENDAR_DAYS.map(d=>{
              const cc = CAL_CFG[d.status]
              return (
                <div key={d.day} style={{background:cc.bg,border:`1.5px solid ${cc.c}33`,borderRadius:10,padding:'10px 4px',textAlign:'center',cursor:d.status!=='weekend'?'pointer':'default'}}
                  onClick={()=>d.status==='missed'||d.status==='absent'?setShowSubmit(true):null}>
                  <div style={{fontSize:12,fontWeight:800,color:cc.c}}>{d.day}</div>
                  <div style={{fontSize:7,color:cc.c,fontWeight:600,marginTop:2,textTransform:'capitalize'}}>{d.status}</div>
                </div>
              )
            })}
          </div>
          <div style={{display:'flex',gap:14,marginTop:14,flexWrap:'wrap'}}>
            {Object.entries(CAL_CFG).map(([k,v])=>(
              <div key={k} style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{width:10,height:10,borderRadius:3,background:v.c}}/>
                <span style={{fontSize:9,color:'#64748b',textTransform:'capitalize'}}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view==='list'&&(
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
                      <span style={{background:'#f5f3ff',color:'#7c3aed',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{r.status_type}</span>
                      {r.calendar_match&&<span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>📅 Calendar Matched</span>}
                    </div>
                    <div style={{fontSize:11,color:'#64748b'}}>{r.dept} . Date: {r.date} . Manager: {r.manager}</div>
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:900,color:r.weekly_hours_after>48?'#ef4444':A}}>{r.weekly_hours_after}h</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>WEEKLY HRS AFTER</div>
                  </div>
                </div>

                <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                  {[{l:'Original',v:r.original_status,c:'#94a3b8'},{l:'Requested',v:r.requested_status,c:A},{l:'Reason',v:r.reason,c:'#7c3aed'}].map((s,i)=>(
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
      )}

      {/* Submission Form */}
      {showSubmit&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSubmit(false)}>
          <div style={{background:'#fff',borderRadius:20,width:600,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Request Attendance Regularization</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.8)',marginTop:4}}>Fix an absence, half-day, or status discrepancy.</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Date *</label>
                <input type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Regularization Type</label>
                <input type="text" value={form.regularizationType||""} onChange={e=>setForm(p=>({...p,regularizationType:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Current Recorded Status</label>
                <input type="text" value={form.currentRecordedStatu||""} onChange={e=>setForm(p=>({...p,currentRecordedStatu:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Requested Status *</label>
                <input type="text" value={form.requestedStatus||""} onChange={e=>setForm(p=>({...p,requestedStatus:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Reason Category</label>
                <input type="text" value={form.reasonCategory||""} onChange={e=>setForm(p=>({...p,reasonCategory:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Justification / Remarks *</label>
                <textarea value={form.justificationRemarks||""} onChange={e=>setForm(p=>({...p,justificationRemarks:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
              <div style={{margin:'10px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#334155',marginBottom:6}}>Optional Evidence (calendar invite, email approval, medical certificate, etc.)</div>
                <label style={{display:"block",border:"2px dashed #bbf7d0",borderRadius:12,padding:"16px",textAlign:"center",background:"#f0fdf4",cursor:"pointer"}}>
                    <div style={{fontSize:22,marginBottom:4}}>📎</div>
                    <div style={{fontSize:10,color:"#065f46"}}>Click or drag to upload supporting document</div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>setForm(p=>({...p,doc_file:e.target.files[0]}))} style={{display:"none"}}/>
                  </label>
              </div>
              <AIImpact color={A} lines={['AI cross-checks your calendar for matching client-visit or meeting events.','Auto-suggests reason based on recurring patterns (e.g. weekly field visits).','Auto-flags if this conflicts with team roster or pushes weekly hours past 48hr cap.','Approval instantly updates Daily Attendance, Employee Movement, and payroll.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowSubmit(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowSubmit(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Approval Interface */}
      {showApproval&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowApproval(null)}>
          <div style={{background:'#fff',borderRadius:20,width:560,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Approval Review - {showApproval.employee}</div>
            </div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div style={{background:'#f8fafc',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:9,color:'#94a3b8'}}>Original Status</div>
                  <div style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>{showApproval.original_status}</div>
                </div>
                <div style={{background:'#fff7ed',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:9,color:'#9a3412'}}>Requested Status</div>
                  <div style={{fontSize:13,fontWeight:800,color:A}}>{showApproval.requested_status}</div>
                </div>
              </div>
              <div style={{background:showApproval.calendar_match?'#f0fdf4':'#fffbeb',borderRadius:10,padding:'10px 14px',marginBottom:10,fontSize:11,color:showApproval.calendar_match?'#065f46':'#92400e'}}>
                {showApproval.calendar_match?'✓ Calendar event matches the claimed field-work/client-visit timing.':'⚠ No matching calendar event found - verify manually.'}
              </div>
              <div style={{background:showApproval.weekly_hours_after>48?'#fef2f2':'#f0fdf4',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:11,color:showApproval.weekly_hours_after>48?'#991b1b':'#065f46'}}>
                {showApproval.weekly_hours_after>48?'⚠':'✓'} This will set weekly hours to <strong>{showApproval.weekly_hours_after}h</strong> {showApproval.weekly_hours_after>48?'- exceeds 48hr LA2074 cap.':'- within statutory limits.'}
              </div>
              <div style={{fontSize:11,color:'#374151',marginBottom:14,fontStyle:'italic'}}>"{showApproval.comment}"</div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{approve(showApproval.id);setShowApproval(null)}} style={{flex:1,padding:13,borderRadius:12,border:'none',background:'#10b981',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
                <button style={{flex:1,padding:13,borderRadius:12,border:'1px solid #fed7aa',background:'#fff7ed',color:'#c2410c',fontSize:13,fontWeight:700,cursor:'pointer'}}>↩ Send Back</button>
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
      {showExcel&&<ExcelModal title="Attendance Regularization" columns={['Employee','Department','Date','Type','Original Status','Requested Status','Reason','Status','Manager']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
