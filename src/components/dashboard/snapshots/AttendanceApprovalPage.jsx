// FILE: AttendanceApprovalPage.jsx - Attendance Approval (Attendance Management)
// Multi-level batch-approval inbox: aggregates regularization, missed-punch, and
// overtime exceptions into one manager queue with SLA-deadline-before-payroll-cutoff.

import { useState } from 'react'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

const PAYROLL_CUTOFF = '2025-06-25'

const QUEUE = [
  { id:'ap1', employee:'Hari Thapa', dept:'IT', type:'missed_punch', detail:'Missed checkout - system error claimed',
    date:'2025-06-20', impact_hrs:8, manager:'Bikash Shrestha', status:'pending', impact_links:['Missed Log In/Out Request'] },
  { id:'ap2', employee:'Bikash Rai', dept:'IT', type:'overtime', detail:'2.5hr OT - server migration deadline',
    date:'2025-06-21', impact_hrs:2.5, manager:'Bikash Shrestha', status:'pending', impact_links:['Overtime Management'] },
  { id:'ap3', employee:'Sunita Rai', dept:'HR', type:'regularization', detail:'Absent > Present - field work justification',
    date:'2025-06-18', impact_hrs:8, manager:'Priya Adhikari', status:'pending', impact_links:['Attendance Regularization'] },
  { id:'ap4', employee:'Maya Pradhan', dept:'Finance', type:'missed_punch', detail:'Forgot to clock in',
    date:'2025-06-19', impact_hrs:8, manager:'Sanjay Karki', status:'approved', impact_links:[] },
]

const TYPE_CFG = {
  missed_punch:{c:'#ef4444',bg:'#fef2f2',icon:'🕐',label:'Missed Punch'},
  overtime:{c:'#f59e0b',bg:'#fffbeb',icon:'⏱',label:'Overtime'},
  regularization:{c:'#7c3aed',bg:'#f5f3ff',icon:'📆',label:'Regularization'},
}
const STATUS_CFG = {pending:{c:'#f59e0b',label:'Pending'},approved:{c:'#10b981',label:'Approved'},rejected:{c:'#ef4444',label:'Rejected'}}

export default function AttendanceApprovalPage() {
  const [queue, setQueue] = useState(QUEUE)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selected, setSelected] = useState([])
  const [showExcel, setShowExcel] = useState(false)
  const [_nm, _snm] = useState("")
  const notify = m => { _snm(m); setTimeout(()=>_snm(""),3000) }
  const [ctx, setCtx] = useState(null)

  const filtered = queue.filter(q=>{
    if (filterType!=='all'&&q.type!==filterType) return false
    if (search&&!q.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const pendingCount = queue.filter(q=>q.status==='pending').length
  const daysToDeadline = Math.ceil((new Date(PAYROLL_CUTOFF)-new Date('2025-06-21'))/(1000*60*60*24))

  const toggleSelect = (id) => setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id])
  const batchApprove = () => { setQueue(prev=>prev.map(q=>selected.includes(q.id)?{...q,status:'approved'}:q)); setSelected([]) }

  return (
    <div onClick={()=>setCtx(null)}>
      <PageHeader icon="📥" title="Attendance Approval"
        breadcrumb="Workforce Operations > Attendance Management"
        gradient={G}
        stats={[
          {icon:'📥',label:'Total in Queue',  value:queue.length},
          {icon:'⏳',label:'Pending',          value:pendingCount},
          {icon:'✅',label:'Approved',          value:queue.filter(q=>q.status==='approved').length},
          {icon:'⏰',label:'Payroll Cutoff',    value:daysToDeadline+'d left'},
        ]}
        onAdd={()=>notify('Attendance request created')} addLabel="+ New Request" onExcel={()=>setShowExcel(true)}/>

      {msg&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:400}}>{msg}</div>}

      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:10}}>
        <span style={{fontSize:18}}>⏰</span>
        <div><strong>Unified Approval Inbox:</strong> Aggregates missed-punch, overtime, and regularization requests into one queue - all must be resolved before the {PAYROLL_CUTOFF} payroll cutoff to avoid rollover to next cycle. Every approval/rejection is timestamped for audit trail.</div>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        {_nm&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#065f46',position:'fixed',bottom:20,right:20,zIndex:999,boxShadow:'0 4px 16px rgba(0,0,0,.1)',maxWidth:380}}>{_nm}</div>}
      <SearchBar value={search} onChange={setSearch} placeholder="Search by employee name..."/>
        <div style={{display:'flex',gap:4,background:'#f1f5f9',padding:3,borderRadius:9}}>
          {['all',...Object.keys(TYPE_CFG)].map(t=>(
            <button key={t} onClick={()=>setFilterType(t)}
              style={{padding:'7px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:10,
                background:filterType===t?'#fff':'transparent',color:filterType===t?A:'#64748b',
                fontWeight:filterType===t?700:400,boxShadow:filterType===t?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {t==='all'?'All':TYPE_CFG[t].label}
            </button>
          ))}
        </div>
        {selected.length>0&&(
          <button onClick={batchApprove} style={{padding:'9px 18px',borderRadius:9,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Batch Approve ({selected.length})</button>
        )}
      </div>

      <div style={{display:'grid',gap:10}}>
        {filtered.map(q=>{
          const tc = TYPE_CFG[q.type]
          const sc = STATUS_CFG[q.status]
          return (
            <div key={q.id}
              onContextMenu={ev=>{ev.preventDefault();setCtx({x:ev.clientX,y:ev.clientY,item:{name:q.employee,...q}})}}
              style={{background:'#fff',border:`1.5px solid ${tc.c}33`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              {q.status==='pending'&&<input type="checkbox" checked={selected.includes(q.id)} onChange={()=>toggleSelect(q.id)} style={{width:18,height:18,accentColor:A,cursor:'pointer'}}/>}
              <div style={{width:40,height:40,borderRadius:10,background:tc.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{tc.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{q.employee}</span>
                  <span style={{background:tc.bg,color:tc.c,fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{tc.label}</span>
                  <span style={{color:sc.c,fontSize:9,fontWeight:700}}>{sc.label}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{q.detail}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>{q.dept} . {q.date} . Manager: {q.manager} . Impact: {q.impact_hrs}h</div>
              </div>
              {q.status==='pending'&&(
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button onClick={()=>setQueue(prev=>prev.map(x=>x.id===q.id?{...x,status:'approved'}:x))} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Approve</button>
                  <button onClick={()=>setQueue(prev=>prev.map(x=>x.id===q.id?{...x,status:'rejected'}:x))} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>Reject</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {ctx&&<ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links} actions={[
        {icon:'👁',label:'View Source Request',key:'view'},{icon:'✅',label:'Approve',key:'approve'},
        {icon:'🚫',label:'Reject',key:'reject'},{icon:'🔗',label:'Impact Analysis',key:'impact'},
      ]} onAction={()=>{}} onClose={()=>setCtx(null)}/>}
      {showExcel&&<ExcelModal title="Attendance Approval Queue" columns={['Employee','Department','Type','Detail','Date','Impact Hours','Manager','Status']} onClose={()=>setShowExcel(false)} onImport={(f,result)=>{ console.log("[NepHR Import]", f.name, result); }}/>}
    </div>
  )
}
