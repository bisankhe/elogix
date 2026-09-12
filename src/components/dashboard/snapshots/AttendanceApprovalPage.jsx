// FILE: src/components/dashboard/snapshots/AttendanceApprovalPage.jsx
// eLogix HRMS — Attendance Approval Queue
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// Removes MOCK_QUEUE (6 fake employees), DeptSetupShared, tenantPermissions, AccessDenied.
// API: GET /api/v1/attendance/approvals
//      PATCH /api/v1/attendance/approvals/:id
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G='linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A='#7c3aed'

const TYPE_CFG={
  missed_punch  :{c:'#ef4444',bg:'#fef2f2',icon:'🕐',label:'Missed Punch'},
  overtime      :{c:'#f59e0b',bg:'#fffbeb',icon:'⏱️',label:'Overtime'},
  regularization:{c:'#7c3aed',bg:'#f5f3ff',icon:'📆',label:'Regularization'},
  early_departure:{c:'#0891b2',bg:'#f0f9ff',icon:'🚪',label:'Early Departure'},
  wfh           :{c:'#10b981',bg:'#f0fdf4',icon:'🏠',label:'WFH'},
}
const STATUS_CFG={
  pending :{c:'#f59e0b',label:'Pending'},
  approved:{c:'#10b981',label:'Approved'},
  rejected:{c:'#ef4444',label:'Rejected'},
}

export default function AttendanceApprovalPage(){
  const [queue,      setQueue]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus,setFilterStatus]=useState('pending')
  const [selected,   setSelected]   = useState([])
  const [msg,        setMsg]        = useState('')

  const s=_getSession(); const company=s?.company||{}
  const toast=(m,d=3500)=>{setMsg(m);setTimeout(()=>setMsg(''),d)}

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);setError('Not authenticated');return}
    setLoading(true)
    fetch('/api/v1/attendance/approvals',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')};if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>setQueue(d.data?.requests||d.requests||d.data||[]))
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false))
  },[])

  const patchStatus=async(ids,status)=>{
    try{
      await Promise.all(ids.map(id=>fetch(`/api/v1/attendance/approvals/${id}`,{method:'PATCH',headers:_authH(),body:JSON.stringify({status})})))
    }catch{}
    setQueue(p=>p.map(q=>ids.includes(q.id)?{...q,status}:q))
    toast(`${status==='approved'?'✅ Approved':'🚫 Rejected'} ${ids.length} request${ids.length>1?'s':''}`)
    setSelected([])
  }

  const filtered=queue.filter(q=>{
    if(filterStatus!=='all'&&q.status!==filterStatus)return false
    if(filterType!=='all'&&q.type!==filterType)return false
    const name=q.employee||q.employee_name||''
    if(search&&!name.toLowerCase().includes(search.toLowerCase()))return false
    return true
  })
  const pending=queue.filter(q=>q.status==='pending').length
  const toggleSel=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])

  // Payroll cutoff from company settings or default
  const cutoff=company?.payroll_cutoff||'—'
  const daysLeft=cutoff!=='—'?Math.ceil((new Date(cutoff)-new Date())/(1000*60*60*24)):null

  if(loading&&queue.length===0)return<div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading approval queue for {company?.name}...</div></div>

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#faf5ff',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#4c1d95',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(124,58,237,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:24}}>📥</span>
              <div><h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Attendance Approval Queue</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · {pending} pending{cutoff!=='—'&&daysLeft!=null?` · Payroll cutoff: ${cutoff} (${daysLeft>0?daysLeft+'d left':'OVERDUE'})`:''}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[{l:'Total',v:queue.length,i:'📥'},{l:'Pending',v:pending,i:'⏳'},{l:'Approved',v:queue.filter(q=>q.status==='approved').length,i:'✅'},{l:'Rejected',v:queue.filter(q=>q.status==='rejected').length,i:'🚫'}].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'6px 12px'}}>
                  <span style={{fontSize:11}}>{s.i}</span><span style={{fontSize:15,fontWeight:800,color:'#fff',marginLeft:5}}>{s.v}</span>
                  <span style={{fontSize:9,color:'rgba(255,255,255,.7)',marginLeft:3}}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            {selected.length>0&&<>
              <button onClick={()=>patchStatus(selected,'approved')} style={{padding:'8px 14px',borderRadius:10,border:'none',background:'#10b981',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>✅ Approve ({selected.length})</button>
              <button onClick={()=>patchStatus(selected,'rejected')} style={{padding:'8px 14px',borderRadius:10,border:'none',background:'#ef4444',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🚫 Reject ({selected.length})</button>
            </>}
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* Info banner */}
      <div style={{background:'#faf5ff',border:'1px solid #e9d5ff',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#581c87',display:'flex',gap:8}}>
        <span style={{fontSize:16}}>⏰</span>
        <div><strong>Unified Approval Inbox:</strong> Aggregates missed-punch, overtime, regularization and WFH requests. All must be resolved before payroll cutoff. Every action is timestamped for audit trail.</div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search employee..." style={{flex:1,minWidth:180,padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
        <div style={{display:'flex',gap:3,background:'#f1f5f9',borderRadius:10,padding:3}}>
          {['all','pending','approved','rejected'].map(st=>(
            <button key={st} onClick={()=>setFilterStatus(st)} style={{padding:'6px 12px',borderRadius:8,border:'none',fontSize:10,fontWeight:filterStatus===st?700:400,cursor:'pointer',background:filterStatus===st?'#fff':'transparent',color:filterStatus===st?A:'#64748b',boxShadow:filterStatus===st?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {st==='all'?'All':STATUS_CFG[st]?.label||st}
            </button>
          ))}
        </div>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:11,outline:'none',background:'#fff',appearance:'none'}}>
          <option value="all">All Types</option>
          {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <span style={{fontSize:11,color:'#64748b'}}>{filtered.length}/{queue.length}</span>
      </div>

      {/* Empty */}
      {queue.length===0&&!loading&&(
        <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #e9d5ff',color:'#94a3b8'}}>
          <div style={{fontSize:40,marginBottom:12}}>📥</div>
          <div style={{fontSize:14,fontWeight:700,color:'#475569',marginBottom:6}}>No approval requests for {company?.name}</div>
          <div style={{fontSize:12}}>Requests appear when employees submit missed punch, OT or regularization requests</div>
        </div>
      )}

      {/* Queue list */}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(q=>{
          const tc=TYPE_CFG[q.type]||{c:'#64748b',bg:'#f8fafc',icon:'📋',label:q.type||'Request'}
          const sc=STATUS_CFG[q.status]||STATUS_CFG.pending
          const name=q.employee||q.employee_name||'—'
          return(
            <div key={q.id} style={{background:'#fff',border:`1.5px solid ${tc.c}20`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
              {q.status==='pending'&&<input type="checkbox" checked={selected.includes(q.id)} onChange={()=>toggleSel(q.id)} style={{width:18,height:18,accentColor:A,cursor:'pointer',flexShrink:0}}/>}
              <div style={{width:40,height:40,borderRadius:10,background:tc.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{tc.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:800,color:'#0f172a'}}>{name}</span>
                  <span style={{fontSize:9,color:'#94a3b8'}}>{q.emp_code}</span>
                  <span style={{background:tc.bg,color:tc.c,fontSize:9,fontWeight:700,padding:'1px 8px',borderRadius:20}}>{tc.label}</span>
                  <span style={{color:sc.c,fontSize:9,fontWeight:700}}>· {sc.label}</span>
                </div>
                <div style={{fontSize:10,color:'#64748b'}}>{q.detail||q.reason||q.description||'—'}</div>
                <div style={{fontSize:9,color:'#94a3b8',marginTop:2}}>
                  {q.dept||q.department||'—'} · {q.date||q.request_date||'—'} · Manager: {q.manager||q.manager_name||'—'} · Impact: {q.impact_hrs||q.hours||'—'}h
                </div>
              </div>
              {q.status==='pending'&&(
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button onClick={()=>patchStatus([q.id],'approved')} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#10b981',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>✅ Approve</button>
                  <button onClick={()=>patchStatus([q.id],'rejected')} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#ef4444',color:'#fff',fontSize:10,fontWeight:700,cursor:'pointer'}}>🚫 Reject</button>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length===0&&queue.length>0&&<div style={{textAlign:'center',padding:40,color:'#94a3b8',background:'#fff',borderRadius:14}}><div style={{fontSize:32,marginBottom:8}}>📭</div>No requests match the current filters</div>}
      </div>
    </div>
  )
}
