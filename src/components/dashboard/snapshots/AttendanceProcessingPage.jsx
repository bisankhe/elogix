// FILE: src/components/dashboard/snapshots/AttendanceProcessingPage.jsx
// eLogix HRMS — Attendance Processing
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// Removes MOCK_RECORDS (6 fake Nepali employees), DeptSetupShared, tenantPermissions.
// API: GET /api/v1/attendance/today  POST /api/v1/attendance/process
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

const SOURCE_CFG = {
  biometric:{c:'#10b981',icon:'👆',label:'Biometric'},
  gps      :{c:'#3b82f6',icon:'📍',label:'GPS'},
  web      :{c:'#7c3aed',icon:'💻',label:'Web'},
  qr       :{c:'#f59e0b',icon:'📱',label:'QR Code'},
  mobile   :{c:'#0ea5e9',icon:'📲',label:'Mobile'},
  manual   :{c:'#64748b',icon:'📋',label:'Manual'},
}
const EXCEPTION_CFG = {
  missed_checkout:{c:'#ef4444',label:'Missed Checkout'},
  late_arrival   :{c:'#f59e0b',label:'Late Arrival'},
  early_departure:{c:'#f59e0b',label:'Early Departure'},
  missed_checkin :{c:'#dc2626',label:'Missed Check-In'},
  overtime       :{c:'#8b5cf6',label:'Overtime'},
}

export default function AttendanceProcessingPage(){
  const [records,    setRecords]    = useState([])
  const [summary,    setSummary]    = useState({})
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [srcFilter,  setSrcFilter]  = useState('all')
  const [exFilter,   setExFilter]   = useState('all')
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0])
  const [processing, setProcessing] = useState(false)
  const [selected,   setSelected]   = useState([])
  const [msg,        setMsg]        = useState('')

  const s=_getSession(); const company=s?.company||{}
  const toast=(m,d=3500)=>{setMsg(m);setTimeout(()=>setMsg(''),d)}

  function load(){
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug)return
    fetch(`/api/v1/attendance/today?date=${date}`,{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null};return r.ok?r.json():null})
      .then(d=>{if(d){setRecords(d.data?.records||d.records||d.data||[]);setSummary(d.data?.summary||d.summary||{})}})
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){setLoading(false);setError('Not authenticated — please log in');return}
    setLoading(true);load()
  },[date])

  const processAttendance=async()=>{
    setProcessing(true)
    try{
      const body=selected.length>0?{record_ids:selected,date}:{date}
      const r=await fetch('/api/v1/attendance/process',{method:'POST',headers:_authH(),body:JSON.stringify(body)})
      const d=await r.json()
      toast(r.ok?`✅ Processed ${d.data?.count||0} records`:'⚠️ Processing error — check logs')
      if(r.ok)load()
    }catch{toast('⚠️ Network error during processing')}
    setProcessing(false);setSelected([])
  }

  const toggleSel=id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  const selAll=()=>setSelected(filtered.map(r=>r.id))

  const filtered=records.filter(r=>{
    if(srcFilter!=='all'&&r.source!==srcFilter)return false
    if(exFilter!=='all'){if(exFilter==='clean'&&r.exception)return false;if(exFilter!=='clean'&&r.exception!==exFilter)return false}
    if(search&&!(r.employee||r.employee_name||'').toLowerCase().includes(search.toLowerCase())&&!(r.emp_code||'').toLowerCase().includes(search.toLowerCase()))return false
    return true
  })
  const exceptions=records.filter(r=>r.exception)
  const processed=records.filter(r=>r.processed)

  if(loading&&records.length===0)return<div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading attendance records for {company?.name}...</div></div>

  return(
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f0f9ff',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#0c4a6e',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(2,132,199,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:24}}>⚙️</span>
              <div><h2 style={{fontSize:18,fontWeight:900,color:'#fff',margin:0}}>Attendance Processing</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · Multi-source consolidation · {date}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[{l:'Total',v:records.length,i:'📋'},{l:'Exceptions',v:exceptions.length,i:'⚠️'},{l:'Processed',v:processed.length,i:'✅'},{l:'Pending',v:records.length-processed.length,i:'⏳'}].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'6px 12px'}}>
                  <span style={{fontSize:11}}>{s.i}</span><span style={{fontSize:15,fontWeight:800,color:'#fff',marginLeft:5}}>{s.v}</span>
                  <span style={{fontSize:9,color:'rgba(255,255,255,.7)',marginLeft:3}}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={processAttendance} disabled={processing}
              style={{padding:'9px 18px',borderRadius:12,background:processing?'#94a3b8':'rgba(255,255,255,.2)',color:'#fff',fontSize:12,fontWeight:800,cursor:processing?'wait':'pointer', border: '1.5px solid rgba(255,255,255,.4)'}}>
              {processing?'⟳ Processing…':'⚙️ Process'+(selected.length>0?` (${selected.length})`:'  All')}
            </button>
          </div>
        </div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* Source Ingest Status */}
      <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'14px 18px',marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:10}}>📡 Data Source Ingest Status</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {Object.entries(SOURCE_CFG).map(([src,cfg])=>{
            const cnt=records.filter(r=>r.source===src).length
            return(
              <div key={src} onClick={()=>setSrcFilter(srcFilter===src?'all':src)}
                style={{flex:1,minWidth:100,background:srcFilter===src?`${cfg.c}12`:'#f8fafc',border:`1.5px solid ${srcFilter===src?cfg.c:'#e2e8f0'}`,borderRadius:10,padding:'10px 12px',cursor:'pointer',textAlign:'center',transition:'all .15s'}}>
                <div style={{fontSize:20,marginBottom:4}}>{cfg.icon}</div>
                <div style={{fontSize:16,fontWeight:900,color:cfg.c}}>{cnt}</div>
                <div style={{fontSize:9,color:'#64748b',marginTop:2}}>{cfg.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search employee..." style={{flex:1,minWidth:180,padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
        <select value={exFilter} onChange={e=>setExFilter(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff',appearance:'none'}}>
          <option value="all">All Records</option>
          <option value="clean">✅ Clean Only</option>
          {Object.entries(EXCEPTION_CFG).map(([k,v])=><option key={k} value={k}>⚠️ {v.label}</option>)}
        </select>
        {selected.length>0?(
          <button onClick={()=>setSelected([])} style={{padding:'7px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',color:'#64748b'}}>✕ Clear ({selected.length})</button>
        ):(
          <button onClick={selAll} style={{padding:'7px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:11,cursor:'pointer',color:A}}>Select All</button>
        )}
        <button onClick={load} style={{padding:'7px 14px',borderRadius:10,border:'none',background:A,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄</button>
      </div>

      {/* Empty */}
      {records.length===0&&!loading&&(
        <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #e2e8f0',color:'#94a3b8'}}>
          <div style={{fontSize:40,marginBottom:12}}>⚙️</div>
          <div style={{fontSize:14,fontWeight:700,color:'#475569',marginBottom:6}}>No attendance records for {date}</div>
          <div style={{fontSize:12}}>Records appear once employees clock in via biometric, GPS, web or QR</div>
        </div>
      )}

      {/* Records table */}
      {filtered.length>0&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>⚙️ {filtered.length} attendance records</div>
            {exceptions.length>0&&<div style={{fontSize:11,color:'#ef4444',fontWeight:600}}>⚠️ {exceptions.length} exceptions need attention</div>}
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'#f8fafc'}}>
                <th style={{padding:'10px 12px',textAlign:'center',width:40}}><input type="checkbox" onChange={e=>e.target.checked?selAll():setSelected([])} checked={selected.length===filtered.length&&filtered.length>0} style={{accentColor:A}}/></th>
                {['Employee','Dept','Check-In','Check-Out','Hours','Source','Exception','Status'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((r,i)=>{
                  const src=SOURCE_CFG[r.source]||SOURCE_CFG.manual
                  const exc=r.exception?EXCEPTION_CFG[r.exception]:null
                  const name=r.employee||r.employee_name||'—'
                  return(
                    <tr key={r.id||i} style={{borderBottom:'1px solid #f8fafc',background:r.exception?'#fffbeb':i%2?'#fafafa':'#fff'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                      onMouseLeave={e=>e.currentTarget.style.background=r.exception?'#fffbeb':i%2?'#fafafa':'#fff'}>
                      <td style={{padding:'10px 12px',textAlign:'center'}}>
                        {!r.processed&&<input type="checkbox" checked={selected.includes(r.id)} onChange={()=>toggleSel(r.id)} style={{accentColor:A}}/>}
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{fontWeight:700,color:'#0f172a'}}>{name}</div>
                        <div style={{fontSize:9,color:'#94a3b8'}}>{r.emp_code}</div>
                      </td>
                      <td style={{padding:'10px 12px',fontSize:11,color:'#64748b'}}>{r.dept||r.department||'—'}</td>
                      <td style={{padding:'10px 12px',fontFamily:'monospace',fontWeight:700,color:A}}>{r.check_in||r.login||'—'}</td>
                      <td style={{padding:'10px 12px',fontFamily:'monospace',color:'#64748b'}}>{r.check_out||r.logout||'—'}</td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:'#0f172a'}}>{r.total_hours||r.hours||'—'}</td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700,background:`${src.c}12`,color:src.c}}>{src.icon} {src.label}</span>
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        {exc?<span style={{padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:700,background:`${exc.c}15`,color:exc.c}}>⚠️ {exc.label}</span>:<span style={{fontSize:9,color:'#10b981'}}>✅ Clean</span>}
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{fontSize:9,fontWeight:700,color:r.processed?'#10b981':'#f59e0b'}}>
                          {r.processed?'✅ Done':'⏳ Pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:'10px 16px',fontSize:11,color:'#94a3b8',borderTop:'1px solid #f1f5f9'}}>
            {filtered.length} of {records.length} records · {selected.length} selected · {date}
          </div>
        </div>
      )}

      {/* LA 2074 banner */}
      <div style={{marginTop:14,background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:12,padding:'10px 16px',fontSize:11,color:'#0369a1'}}>
        ⚖️ <strong>Nepal Labour Act 2074:</strong> Processing consolidates biometric, GPS, QR and web punch data. Exceptions (late arrivals &gt;15min grace, missed checkouts, unauthorized OT) are flagged for approval before payroll lock.
      </div>
    </div>
  )
}
