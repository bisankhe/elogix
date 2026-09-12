// FILE: src/components/dashboard/snapshots/WebCheckInOutPage.jsx
// eLogix HRMS — Web Check-In & Check-Out (HR Admin View)
// COMPLETE REWRITE — Real tenant API. Shows all web attendance today.
// HR can view, approve, override, export web punch records.
// API: GET  /api/v1/attendance/web-checkinout
//      PATCH /api/v1/attendance/web-checkinout/:id/approve
//      PATCH /api/v1/attendance/web-checkinout/:id/override
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch { return {} }
}
function _authH() {
  const s=_getSession(); const token=localStorage.getItem('access_token')||s?.token||''; const slug=s?.company?.slug||''
  return { 'Authorization':`Bearer ${token}`, 'X-Tenant-Slug':slug, 'Content-Type':'application/json' }
}

const G = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const A = '#4338ca'

const STATUS_CFG = {
  present      : { c:'#10b981', bg:'#f0fdf4', label:'Present'       },
  late         : { c:'#f59e0b', bg:'#fffbeb', label:'Late'          },
  half_day     : { c:'#8b5cf6', bg:'#f5f3ff', label:'Half Day'      },
  absent       : { c:'#ef4444', bg:'#fef2f2', label:'Absent'        },
  work_from_home:{ c:'#0ea5e9', bg:'#f0f9ff', label:'WFH'          },
  pending      : { c:'#94a3b8', bg:'#f8fafc', label:'Pending'       },
}

export default function WebCheckInOutPage() {
  const [records,  setRecords]  = useState([])
  const [summary,  setSummary]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState('all')
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0])
  const [deptF,    setDeptF]    = useState('All')
  const [msg,      setMsg]      = useState('')
  const [detail,   setDetail]   = useState(null)
  const [polling,  setPolling]  = useState(true)
  const [lastSync, setLastSync] = useState(null)

  const s       = _getSession()
  const company = s?.company || {}
  const today   = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})

  const toast = (m,d=3500)=>{ setMsg(m); setTimeout(()=>setMsg(''),d) }

  function load() {
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug) return
    fetch(`/api/v1/attendance/web-checkinout?date=${date}`,{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null};return r.ok?r.json():null})
      .then(d=>{
        if(!d) return
        setRecords(d.data?.records||d.records||d.data||[])
        setSummary(d.data?.summary||d.summary||{})
        setLastSync(new Date())
      })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){ setLoading(false); return }
    setLoading(true); load()
    const iv=setInterval(()=>{ if(polling) load() },30000)
    return ()=>clearInterval(iv)
  },[date])

  const approve  = async (id) => {
    try { await fetch(`/api/v1/attendance/web-checkinout/${id}/approve`,{method:'PATCH',headers:_authH()}) } catch {}
    setRecords(p=>p.map(r=>r.id===id?{...r,approved:true,status:'present'}:r))
    toast('✅ Approved')
  }
  const override = async (id) => {
    try { await fetch(`/api/v1/attendance/web-checkinout/${id}/override`,{method:'PATCH',headers:_authH()}) } catch {}
    setRecords(p=>p.map(r=>r.id===id?{...r,overridden:true,status:'present'}:r))
    toast('⚡ Override applied')
  }

  const exportCSV = () => {
    const h=['#','Employee','Code','Dept','Check-In','Check-Out','Duration','Status','Method','Location','IP','Approved']
    const b=filtered.map((r,i)=>[i+1,r.employee_name||r.name||'—',r.emp_code||'—',r.dept||'—',r.check_in||'—',r.check_out||'—',r.duration||'—',r.status||'—',r.method||'web',r.location||'—',r.ip_address||'—',r.approved?'Yes':'No'].join(','))
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\uFEFF'+[h.join(','),...b].join('\n')],{type:'text/csv'})); a.download=`WebAttendance_${date}.csv`; a.click(); toast('📤 Exported')
  }

  const depts    = ['All',...new Set(records.map(r=>r.dept||r.department).filter(Boolean))]
  const filtered = records.filter(r=>{
    if(statusF!=='all'&&r.status!==statusF) return false
    if(deptF!=='All'&&(r.dept||r.department)!==deptF) return false
    if(search&&!(r.employee_name||r.name||'').toLowerCase().includes(search.toLowerCase())&&!(r.emp_code||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const present   = summary.present    || records.filter(r=>r.status==='present'||r.status==='late').length
  const wfh       = summary.wfh        || records.filter(r=>r.status==='work_from_home').length
  const pending   = summary.pending    || records.filter(r=>r.status==='pending'||!r.status).length
  const checkouts = records.filter(r=>r.check_out).length
  const totalEmp  = summary.total      || records.length

  if(loading&&records.length===0) return (
    <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}>
      <div style={{fontSize:36,marginBottom:12}}>⟳</div>
      <div style={{fontSize:13,fontWeight:600}}>Loading web attendance for {company?.name}...</div>
    </div>
  )

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f8fafc',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#4c1d95',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(67,56,202,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:24}}>💻</span>
              <div>
                <h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Web Check-In / Check-Out</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · {today} · Browser-based attendance log</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[{l:'Total Records',v:totalEmp,i:'📋'},{l:'Present',v:present,i:'✅'},{l:'WFH',v:wfh,i:'🏠'},{l:'Checked Out',v:checkouts,i:'🚪'},{l:'Pending',v:pending,i:'⏳'}].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'5px 12px'}}>
                  <span style={{fontSize:11}}>{s.i}</span>
                  <span style={{fontSize:15,fontWeight:800,color:'#fff',marginLeft:5}}>{s.v}</span>
                  <span style={{fontSize:9,color:'rgba(255,255,255,.7)',marginLeft:3}}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <label style={{display:'flex',alignItems:'center',gap:5,color:'rgba(255,255,255,.8)',fontSize:11,cursor:'pointer'}}>
              <input type="checkbox" checked={polling} onChange={e=>setPolling(e.target.checked)} style={{accentColor:'#fff'}}/>Auto
            </label>
            <button onClick={load} style={{padding:'7px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄 Refresh</button>
            <button onClick={exportCSV} style={{padding:'7px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>📤 Export</button>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search employee..." style={{flex:1,minWidth:180,padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
        <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff',appearance:'none'}}>
          {depts.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        {['all',...Object.keys(STATUS_CFG)].map(st=>{
          const c=STATUS_CFG[st]||{c:A,bg:'#f5f3ff',label:'All'}
          return <button key={st} onClick={()=>setStatusF(st)} style={{padding:'6px 12px',borderRadius:20,border:`1.5px solid ${statusF===st?c.c:'#e2e8f0'}`,background:statusF===st?c.c:'#fff',color:statusF===st?'#fff':'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            {st==='all'?'All':c.label}
          </button>
        })}
      </div>

      {/* Empty */}
      {records.length===0&&!loading&&(
        <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #e2e8f0',color:'#94a3b8'}}>
          <div style={{fontSize:40,marginBottom:12}}>💻</div>
          <div style={{fontSize:14,fontWeight:700,color:'#475569',marginBottom:6}}>No web attendance records for {date}</div>
          <div style={{fontSize:12}}>Records appear as employees check in via browser</div>
        </div>
      )}

      {/* Table */}
      {filtered.length>0&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>💻 {filtered.length} web records</div>
            {lastSync&&<div style={{fontSize:9,color:'#94a3b8'}}>Updated {lastSync.toLocaleTimeString()}</div>}
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'#f8fafc'}}>
                {['#','Employee','Dept','Check-In','Check-Out','Duration','Status','Method','Location','Browser','Actions'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((r,i)=>{
                  const sc=STATUS_CFG[r.status]||STATUS_CFG.pending
                  const name=r.employee_name||r.name||'—'
                  return (
                    <tr key={r.id||i} style={{borderBottom:'1px solid #f8fafc',background:i%2?'#fafafa':'#fff',cursor:'pointer'}}
                      onClick={()=>setDetail(r)}
                      onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
                      onMouseLeave={e=>e.currentTarget.style.background=i%2?'#fafafa':'#fff'}>
                      <td style={{padding:'10px 12px',color:'#94a3b8',fontSize:11}}>{i+1}</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{fontWeight:700,color:'#0f172a'}}>{name}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{r.emp_code}</div>
                      </td>
                      <td style={{padding:'10px 12px',color:'#64748b',fontSize:11}}>{r.dept||r.department||'—'}</td>
                      <td style={{padding:'10px 12px',fontFamily:'monospace',fontWeight:700,color:A}}>{r.check_in||'—'}</td>
                      <td style={{padding:'10px 12px',fontFamily:'monospace',color:'#64748b'}}>{r.check_out||'—'}</td>
                      <td style={{padding:'10px 12px',fontSize:11,color:'#475569'}}>{r.duration||'—'}</td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700,background:sc.bg,color:sc.c}}>{sc.label}</span>
                        {r.overridden&&<span style={{marginLeft:4,fontSize:8,color:'#d97706'}}>⚡</span>}
                        {r.approved &&<span style={{marginLeft:4,fontSize:8,color:'#10b981'}}>✅</span>}
                      </td>
                      <td style={{padding:'10px 12px',fontSize:10,color:'#64748b'}}>{r.method||'web'}</td>
                      <td style={{padding:'10px 12px',fontSize:10,color:'#64748b',maxWidth:120,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.location||'—'}</td>
                      <td style={{padding:'10px 12px',fontSize:9,color:'#94a3b8',maxWidth:100,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.browser||r.user_agent?.split(' ').slice(-1)[0]||'—'}</td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:4}}>
                          {!r.approved&&!r.overridden&&<>
                            <button onClick={e=>{e.stopPropagation();approve(r.id)}} style={{padding:'3px 8px',borderRadius:6,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:9,fontWeight:700,cursor:'pointer'}}>✅ OK</button>
                            <button onClick={e=>{e.stopPropagation();override(r.id)}} style={{padding:'3px 8px',borderRadius:6,border:'none',background:'#fffbeb',color:'#b45309',fontSize:9,cursor:'pointer'}}>⚡</button>
                          </>}
                          {r.ip_address&&<button onClick={e=>{e.stopPropagation();setDetail(r)}} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',fontSize:9,cursor:'pointer',color:'#64748b'}}>IP</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'10px 16px',fontSize:11,color:'#94a3b8',borderTop:'1px solid #f1f5f9'}}>
            {filtered.length} records · {date}
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detail&&(
        <>
          <div onClick={()=>setDetail(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:3999}}/>
          <div style={{position:'fixed',right:0,top:0,bottom:0,width:380,background:'#fff',boxShadow:'-20px 0 60px rgba(0,0,0,.15)',zIndex:4000,overflow:'auto'}}>
            <div style={{padding:'20px 24px',background:G}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div><div style={{fontSize:15,fontWeight:900,color:'#fff'}}>💻 {detail.employee_name||detail.name}</div><div style={{fontSize:10,color:'rgba(255,255,255,.75)',marginTop:2}}>{detail.emp_code} · {detail.dept}</div></div>
                <button onClick={()=>setDetail(null)} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:8,width:30,height:30,color:'#fff',cursor:'pointer',fontSize:16}}>×</button>
              </div>
            </div>
            <div style={{padding:'20px 24px'}}>
              {[['Check-In',detail.check_in],['Check-Out',detail.check_out],['Duration',detail.duration],['Status',detail.status],['Method',detail.method||'Web Browser'],['IP Address',detail.ip_address],['Browser',detail.browser||detail.user_agent],['Location',detail.location],['Coordinates',detail.lat&&detail.lng?`${detail.lat}, ${detail.lng}`:null],['Shift',detail.shift||detail.shift_name],['Approved',detail.approved?'✅ Yes':'Pending'],['Override',detail.overridden?'⚡ Yes':'No']].filter(([,v])=>v).map(([l,v],i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
                  <span style={{color:'#64748b',minWidth:100}}>{l}</span>
                  <span style={{fontWeight:700,color:'#0f172a',textAlign:'right',maxWidth:'55%',wordBreak:'break-word'}}>{v}</span>
                </div>
              ))}
              {detail.photo&&<img src={detail.photo} alt="selfie" style={{width:'100%',borderRadius:10,marginTop:14,objectFit:'cover',maxHeight:200}}/>}
              {detail.lat&&detail.lng&&<a href={`https://maps.google.com/?q=${detail.lat},${detail.lng}`} target="_blank" rel="noopener noreferrer" style={{display:'block',marginTop:14,padding:'10px 14px',background:'#f5f3ff',borderRadius:8,fontSize:12,color:A,fontWeight:600,textDecoration:'none'}}>🗺️ Open in Google Maps →</a>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
