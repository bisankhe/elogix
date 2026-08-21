// FILE: OvertimeAcceptancePage.jsx — Overtime Acceptance & Approval
// HOD → HR approval workflow. Only approved OT hits payroll.
import { useState } from 'react'
import { PageHeader, SearchBar, ContextMenu, ExcelModal } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#7c2d12 0%,#c2410c 60%,#fb923c 100%)'
const A = '#c2410c'

const OT_REQUESTS = [
  { id:'ot1', employee:'Bikash Shrestha', emp_id:'EMP-0029', dept:'IT', position:'Senior IT Lead',
    date:'2025-07-15', ot_hours:3.5, reason:'Production deployment — critical release night', type:'weekday',
    approved_by_supervisor:true, supervisor:'Rajesh Sharma (CTO)',
    status:'pending_hod', hod:'Rajesh Sharma (CTO)', hr_status:'waiting',
    estimated_pay:Math.round(150000/26/8*1.5*3.5), impact_links:['Payroll','Attendance'] },
  { id:'ot2', employee:'Maya Pradhan', emp_id:'EMP-0098', dept:'Finance', position:'Accountant',
    date:'2025-07-20', ot_hours:2, reason:'Monthly closing — balance sheet finalization', type:'weekend',
    approved_by_supervisor:true, supervisor:'Sanjay Karki (CFO)',
    status:'pending_hod', hod:'Sanjay Karki (CFO)', hr_status:'waiting',
    estimated_pay:Math.round(65000/26/8*2*2), impact_links:['Payroll'] },
  { id:'ot3', employee:'Sunita Rai', emp_id:'EMP-0141', dept:'IT', position:'Developer',
    date:'2025-07-10', ot_hours:4, reason:'Client project urgent deliverable', type:'weekday',
    approved_by_supervisor:true, supervisor:'Bikash Shrestha',
    status:'approved', hod:'Rajesh Sharma (CTO)', hr_status:'approved',
    approved_date:'2025-07-11', estimated_pay:Math.round(85000/26/8*1.5*4), impact_links:['Payroll'] },
  { id:'ot4', employee:'Hari Thapa', emp_id:'EMP-0067', dept:'Operations', position:'Driver',
    date:'2025-07-18', ot_hours:1.5, reason:'Late delivery run — client request', type:'weekday',
    approved_by_supervisor:false, supervisor:'Maya Gurung',
    status:'rejected', hod:'Maya Gurung', hr_status:'rejected', reject_reason:'Supervisor did not pre-approve',
    estimated_pay:0, impact_links:[] },
]

const STATUS_CFG = {
  pending_hod: { c:'#f59e0b', bg:'#fffbeb', icon:'👔', label:'Pending HOD Approval' },
  pending_hr:  { c:'#3b82f6', bg:'#eff6ff', icon:'👥', label:'Pending HR Approval' },
  approved:    { c:'#10b981', bg:'#f0fdf4', icon:'✅', label:'Approved — Payroll Ready' },
  rejected:    { c:'#ef4444', bg:'#fef2f2', icon:'❌', label:'Rejected' },
  forwarded:   { c:'#8b5cf6', bg:'#f5f3ff', icon:'📤', label:'Forwarded to HR' },

export default function OvertimeAcceptancePage() {
  const [requests, setRequests] = useState(OT_REQUESTS)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [showNote, setShowNote] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx]           = useState(null)
  const [msg, setMsg]           = useState('')
  const notify = m => { setMsg(m); setTimeout(()=>setMsg(''),3500) }

  const filtered = requests.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    return !search || r.employee.toLowerCase().includes(search.toLowerCase())
  })

  const totalPending  = requests.filter(r => r.status.startsWith('pending')).length
  const totalApproved = requests.filter(r => r.status === 'approved').length
  const totalPayable  = requests.filter(r => r.status === 'approved').reduce((s,r) => s+r.estimated_pay, 0)

  const approveOT = (id, action) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r
      if (action === 'approve_hod') return {...r, status:'pending_hr', hr_status:'pending'}
      if (action === 'approve_hr')  return {...r, status:'approved', hr_status:'approved', approved_date: new Date().toISOString().split('T')[0]}
      if (action === 'forward')     return {...r, status:'forwarded', hr_status:'pending'}
      if (action === 'reject')      return {...r, status:'rejected', reject_reason: noteText||'Rejected by approver'}
      return r
    }))
    setShowNote(null); setNoteText('')
    const labels = { approve_hod:'✅ Approved by HOD — forwarded to HR', approve_hr:'✅ OT Approved — will hit next payroll', forward:'📤 Forwarded to HR for final approval', reject:'❌ OT Rejected — employee notified' }
    notify(labels[action] || 'Done')

  return (
    <div onClick={()=>setCtx(null)} style={{fontFamily:'system-ui,sans-serif'}}>
      <PageHeader icon="⏰" title="Overtime Acceptance & Approval"
        breadcrumb="Workforce Operations > Overtime > Acceptance"
        gradient={G}
        stats={[
          {icon:'⏳',label:'Pending Approval', value:totalPending},
          {icon:'✅',label:'Approved this Month',value:totalApproved},
          {icon:'💰',label:'Total Payable',     value:'NPR '+totalPayable.toLocaleString()},
          {icon:'🚫',label:'Rejected',           value:requests.filter(r=>r.status==='rejected').length},
        ]}
        onAdd={()=>{}} addLabel="" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#9a3412',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖️</span>
        <div><strong>Nepal LA2074:</strong> OT on weekdays = 1.5× base rate. OT on weekends/holidays = 2× base rate. Max 4 hrs/day, 24 hrs/week. All OT must be pre-approved and will auto-debit payroll on approval.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all','pending_hod','pending_hr','approved','rejected'].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:'7px 10px',borderRadius:7,border:'none',cursor:'pointer',fontSize:9,
                background:filter===s?'#fff':'transparent',color:filter===s?A:'#64748b',
                fontWeight:filter===s?700:400,boxShadow:filter===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s==='all'?'All':STATUS_CFG[s]?.label||s}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gap:12}}>
        {filtered.map(r => {
          const sc = STATUS_CFG[r.status] || STATUS_CFG.pending_hod
          const isWeekend = r.type === 'weekend'
          const rate = isWeekend ? '2×' : '1.5×'
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${sc.c}33`,borderRadius:14,overflow:'hidden',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:14,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{fontSize:10,color:'#94a3b8'}}>{r.emp_id}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:'2px 9px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {isWeekend&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>🗓 Weekend (2×)</span>}
                  </div>
                  <div style={{fontSize:11,color:'#64748b'}}>{r.position} · {r.dept} · Date: {r.date} · {r.ot_hours} hrs OT @ {rate} rate</div>
                  <div style={{fontSize:10,color:'#475569',marginTop:3}}>📝 {r.reason}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:r.status==='approved'?'#10b981':A}}>NPR {r.estimated_pay.toLocaleString()}</div>
                  <div style={{fontSize:8,color:'#94a3b8'}}>EST. OT PAY</div>
                </div>
              </div>

              {/* Approval chain */}
              <div style={{padding:'10px 18px',display:'flex',gap:12,fontSize:10,flexWrap:'wrap',borderBottom:'1px solid #f8fafc'}}>
                <span style={{color:r.approved_by_supervisor?'#10b981':'#ef4444',fontWeight:700}}>
                  {r.approved_by_supervisor?'✅':'❌'} Supervisor: {r.supervisor}
                </span>
                <span>→</span>
                <span style={{color:r.status==='pending_hod'?A:r.status==='approved'?'#10b981':r.status==='rejected'?'#ef4444':'#3b82f6',fontWeight:700}}>
                  {r.status==='pending_hod'?'⏳':'✅'} HOD: {r.hod}
                </span>
                <span>→</span>
                <span style={{color:r.hr_status==='approved'?'#10b981':r.hr_status==='rejected'?'#ef4444':'#94a3b8',fontWeight:700}}>
                  {r.hr_status==='approved'?'✅':r.hr_status==='pending'?'⏳':'⌛'} HR: {r.hr_status}
                </span>
                {r.status==='approved'&&<span style={{color:'#10b981',fontWeight:700}}>→ 💰 Payroll Ready</span>}
              </div>

              {r.reject_reason&&<div style={{padding:'6px 18px',background:'#fef2f2',fontSize:10,color:'#991b1b'}}>❌ Rejection reason: {r.reject_reason}</div>}

              {/* Action buttons */}
              <div style={{padding:'10px 16px',display:'flex',gap:6,justifyContent:'flex-end',flexWrap:'wrap'}}>
                {r.status==='pending_hod'&&(
                  <>
                    <button onClick={()=>approveOT(r.id,'approve_hod')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Approve (HOD)</button>
                    <button onClick={()=>approveOT(r.id,'forward')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#3b82f6',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>📤 Forward to HR</button>
                    <button onClick={()=>{setShowNote({id:r.id,action:'reject'});setNoteText('')}} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>❌ Reject</button>
                  </>
                )}
                {r.status==='pending_hr'&&(
                  <>
                    <button onClick={()=>approveOT(r.id,'approve_hr')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Final Approve (HR)</button>
                    <button onClick={()=>{setShowNote({id:r.id,action:'reject'});setNoteText('')}} style={{padding:'7px 14px',borderRadius:8,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,fontWeight:700,cursor:'pointer'}}>❌ Reject</button>
                  </>
                )}
                {r.status==='forwarded'&&(
                  <button onClick={()=>approveOT(r.id,'approve_hr')} style={{padding:'7px 14px',borderRadius:8,border:'none',background:G,color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ HR Final Approve</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Reject Note Modal */}
      {showNote&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowNote(null)}>
          <div style={{background:'#fff',borderRadius:16,padding:24,width:400,maxWidth:'95vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:4,color:'#0f172a'}}>❌ Rejection Note</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:14}}>Please provide a reason for rejecting this OT request:</div>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={3}
              placeholder="e.g. Budget freeze / Not pre-approved / Insufficient justification..."
              style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box',marginBottom:14}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>approveOT(showNote.id,'reject')} style={{flex:1,padding:'10px',borderRadius:10,border:'none',background:'#dc2626',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer'}}>❌ Confirm Rejection</button>
              <button onClick={()=>setShowNote(null)} style={{padding:'10px 18px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} actions={[{icon:'✅',label:'Approve',key:'approve'},{icon:'📤',label:'Forward to HR',key:'forward'},{icon:'❌',label:'Reject',key:'reject',danger:true}]} onAction={(k,item)=>{if(k==='approve')approveOT(item.id,'approve_hod');if(k==='reject')setShowNote({id:item.id,action:'reject'})}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Overtime Acceptance" columns={['Employee','Emp ID','Dept','Date','OT Hours','Type','Rate','Est Pay','Status','Approved By','Date Approved']} onClose={()=>setShowExcel(false)} onImport={()=>{}}/>}
    </div>
  )
