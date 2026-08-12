// FILE: OvertimeManagementPage.jsx - Overtime Management (Attendance Management)
// Pre-approval workflow: employee request -> manager review (hours vs budget) ->
// approve/reject -> auto 1.5x multiplier -> payroll sync.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const REQUESTS = [
  { id:'ot1', employee:'Bikash Rai', dept:'IT', date:'2025-06-21', requested_hours:2.5,
    reason:'Server migration deadline', weekly_hours_before:19.5, weekly_hours_after:22,
    weekly_cap_pct:92, base_rate_npr:312.5, ot_rate_multiplier:1.5, ot_amount_npr:1171.88,
    employee_consent:true, manager:'Bikash Shrestha', status:'pending', submitted_at:'2025-06-21 05:30 PM',
    impact_links:['Employee Movement','Payroll Setup'] },
  { id:'ot2', employee:'Sunita Rai', dept:'HR', date:'2025-06-20', requested_hours:1.5,
    reason:'SSF enrollment deadline - finishing field visit documentation', weekly_hours_before:8, weekly_hours_after:9.5,
    weekly_cap_pct:40, base_rate_npr:250, ot_rate_multiplier:1.5, ot_amount_npr:562.5,
    employee_consent:true, manager:'Priya Adhikari', status:'approved', submitted_at:'2025-06-20 04:00 PM', approved_at:'2025-06-20 04:15 PM',
    impact_links:[] },
  { id:'ot3', employee:'Sunil Magar', dept:'Customer Service', date:'2025-06-21', requested_hours:3,
    reason:'Coverage for absent colleague', weekly_hours_before:22, weekly_hours_after:25,
    weekly_cap_pct:104, base_rate_npr:225, ot_rate_multiplier:1.5, ot_amount_npr:1012.5,
    employee_consent:true, manager:'Dipak Tamang', status:'rejected', submitted_at:'2025-06-21 02:00 PM', rejected_at:'2025-06-21 02:30 PM',
    rejection_reason:'Would exceed the 24hr/week statutory OT cap per Nepal LA2074. Please redistribute coverage to another team member.',
    impact_links:['Overtime & Monitoring'] },
]

const STATUS_CFG = {pending:{c:'#f59e0b',bg:'#fffbeb',icon:'⏳',label:'Pending Approval'},approved:{c:'#10b981',bg:'#f0fdf4',icon:'✅',label:'Approved'},rejected:{c:'#ef4444',bg:'#fef2f2',icon:'🚫',label:'Rejected'}}

export default function OvertimeManagementPage() {
  const [requests, setRequests] = useState(REQUESTS)
  const [form, setForm] = useState({})
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showRequest, setShowRequest] = useState(false)
  const [showExcel, setShowExcel] = useState(false)
  const [ctx, setCtx] = useState(null)

  const filtered = requests.filter(r=>{
    if (filterStatus!=='all'&&r.status!==filterStatus) return false
    if (search&&!r.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const totalOTCost = requests.filter(r=>r.status==='approved').reduce((s,r)=>s+r.ot_amount_npr,0)

  const approve = (id) => setRequests(prev=>prev.map(r=>r.id===id?{...r,status:'approved',approved_at:new Date().toLocaleString()}:r))
  const reject = (id) => setRequests(prev=>prev.map(r=>r.id===id?{...r,status:'rejected',rejected_at:new Date().toLocaleString(),rejection_reason:'Rejected via dashboard.'}:r))

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="⏱" title="Overtime Management"
        breadcrumb="Workforce Operations > Attendance Management > Overtime"
        gradient={G}
        stats={[
          {icon:'⏱',label:'Total Requests',  value:requests.length},
          {icon:'⏳',label:'Pending',          value:requests.filter(r=>r.status==='pending').length},
          {icon:'✅',label:'Approved',          value:requests.filter(r=>r.status==='approved').length},
          {icon:'💰',label:'Approved OT Cost',  value:'NPR '+totalOTCost.toFixed(0)},
        ]}
        onAdd={()=>setShowRequest(true)} addLabel="Request Overtime"
        onExcel={()=>setShowExcel(true)}/>

      <div style={{background:'#eef2ff',border:'1px solid #c7d2fe',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#3730a3',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⚖</span>
        <div><strong>Pre-Approval Required:</strong> Nepal LA2074 mandates employee consent before any OT assignment, capped at 4hrs/day, 24hrs/week, paid at 150%. This workflow shows weekly-hours-after impact before manager approval - requests exceeding the cap are auto-flagged.</div>
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
          const exceedsCap = r.weekly_cap_pct >= 100
          return (
            <div key={r.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:r.employee,...r}})}}
              style={{background:'#fff',border:`1.5px solid ${exceedsCap?'#fecaca':sc.c+'33'}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,.05)',borderLeft:`5px solid ${sc.c}`}}>
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',borderBottom:'1px solid #f1f5f9',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:900,color:'#0f172a'}}>{r.employee}</span>
                    <span style={{background:sc.bg,color:sc.c,fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>{sc.icon} {sc.label}</span>
                    {exceedsCap&&<span style={{background:'#fef2f2',color:'#dc2626',fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20}}>⚠ Exceeds 24hr Cap</span>}
                  </div>
                  <div style={{fontSize:11,color:'#374151',fontWeight:600}}>{r.reason}</div>
                  <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{r.dept} . {r.date} . Manager: {r.manager}</div>
                </div>
                <div style={{textAlign:'center',flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:A}}>NPR {r.ot_amount_npr.toFixed(0)}</div>
                  <div style={{fontSize:8,color:'#94a3b8',fontWeight:700}}>OT AMOUNT (1.5×)</div>
                </div>
              </div>

              <div style={{padding:'12px 20px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,borderBottom:'1px solid #f8fafc'}}>
                {[{l:'Requested Hours',v:r.requested_hours+'h',c:A},
                  {l:'Weekly Before',v:r.weekly_hours_before+'h',c:'#94a3b8'},
                  {l:'Weekly After',v:r.weekly_hours_after+'h',c:exceedsCap?'#ef4444':'#10b981'},
                  {l:'Cap Usage',v:r.weekly_cap_pct+'%',c:exceedsCap?'#ef4444':r.weekly_cap_pct>=80?'#f59e0b':'#10b981'}].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',background:'#f8fafc',borderRadius:8,padding:'8px 4px'}}>
                    <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:8,color:'#94a3b8',fontWeight:600,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{padding:'10px 20px',display:'flex',gap:16,fontSize:10,color:'#64748b',borderBottom:'1px solid #f8fafc'}}>
                <span><span style={{color:r.employee_consent?'#10b981':'#ef4444',fontWeight:700}}>{r.employee_consent?'✓ Consent on File':'✗ No Consent'}</span></span>
                <span>Base rate: NPR {r.base_rate_npr}/hr {'>'} OT rate: NPR {(r.base_rate_npr*r.ot_rate_multiplier).toFixed(2)}/hr</span>
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
                    <button onClick={()=>approve(r.id)} disabled={exceedsCap} style={{padding:'7px 16px',borderRadius:8,border:'none',background:exceedsCap?'#e2e8f0':'#10b981',color:exceedsCap?'#94a3b8':'#fff',fontSize:11,fontWeight:700,cursor:exceedsCap?'not-allowed':'pointer'}}>✅ Approve</button>
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

      {showRequest&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:5000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowRequest(false)}>
          <div style={{background:'#fff',borderRadius:20,width:580,maxHeight:'90vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:G,padding:'20px 28px'}}><div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Request Overtime</div></div>
            <div style={{padding:'22px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Date *</label>
                <input type="date" value={form.date||""} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Hours Requested *</label>
                <input type="number" value={form.hoursRequested||""} onChange={e=>setForm(p=>({...p,hoursRequested:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',boxSizing:'border-box'}}/>
                <div style={{fontSize:9,color:"#94a3b8",marginTop:2}}>Max 4hrs/day</div>
                </div>
              </div>
                <div>
                <label style={{fontSize:9,fontWeight:700,color:"#374151",display:"block",marginBottom:4}}>Reason / Justification *</label>
                <textarea value={form.reasonJustification||""} onChange={e=>setForm(p=>({...p,reasonJustification:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                </div>
              <label style={{display:'flex',gap:8,alignItems:'center',margin:'10px 0',fontSize:12,color:'#374151',cursor:'pointer'}}>
                <input type="checkbox" defaultChecked style={{accentColor:A}}/> I consent to this overtime assignment (required per LA2074)
              </label>
              <AIImpact color={A} lines={['Auto-calculates weekly-hours-after impact before submission.','Blocks requests that would exceed the 24hr/week statutory cap.','OT amount auto-computed at 1.5x base rate.','Approved OT instantly syncs to payroll - no manual timesheet entry.']}/>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button onClick={()=>setShowRequest(false)} style={{flex:1,padding:14,borderRadius:12,border:'none',background:G,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>Submit Request</button>
                <button onClick={()=>setShowRequest(false)} style={{padding:'14px 24px',borderRadius:12,border:'1px solid #e2e8f0',background:'#fff',color:'#475569',fontSize:13,cursor:'pointer'}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Details',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🚫',label:'Reject',key:'reject'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={(k,item)=>{if(k==='approve')approve(item.id);if(k==='reject')reject(item.id)}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Overtime Management" columns={['Employee','Department','Date','Requested Hours','Reason','Weekly Hours After','OT Amount NPR','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[eLogix Import]", f.name, result); }}/>}
    </div>
  )
}
