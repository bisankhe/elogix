// FILE: src/components/dashboard/snapshots/GPSTrackingPage.jsx
// eLogix HRMS — GPS Staff Tracking (Duty Hours Only)
// COMPLETE REWRITE — Real tenant API. Privacy-first design.
// HR / Authorised persons can trace staff DURING DUTY TIME ONLY.
// Shows: exact current location + movement history from login to now.
// After check-out: tracking disabled — shows "Duty ended" message.
// API: GET /api/v1/gps/live-location
//      GET /api/v1/gps/movement-history/:emp_id
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch { return {} }
}
function _authH() {
  const s=_getSession(); const token=localStorage.getItem('access_token')||s?.token||''; const slug=s?.company?.slug||''
  return { 'Authorization':`Bearer ${token}`, 'X-Tenant-Slug':slug, 'Content-Type':'application/json' }
}

const G  = 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0ea5e9 100%)'
const A  = '#0ea5e9'
const GR = '#10b981'

const STATUS_C = { on_duty:'#10b981', checked_out:'#94a3b8', not_checked_in:'#f59e0b', on_leave:'#8b5cf6', field:'#0ea5e9' }

export default function GPSTrackingPage() {
  const [employees,  setEmployees]  = useState([])
  const [selected,   setSelected]   = useState(null)
  const [history,    setHistory]    = useState([])
  const [histLoad,   setHistLoad]   = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [statusF,    setStatusF]    = useState('on_duty')
  const [polling,    setPolling]    = useState(true)
  const [lastSync,   setLastSync]   = useState(null)
  const [msg,        setMsg]        = useState('')

  const s       = _getSession()
  const company = s?.company || {}
  const user    = s?.user    || {}
  const role    = user?.role || s?.persona || 'employee'
  const canTrack= ['admin','hr','hr_manager','manager','superadmin'].includes(role?.toLowerCase())

  const toast = (m,d=3500)=>{ setMsg(m); setTimeout(()=>setMsg(''),d) }

  function load() {
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug) return
    fetch('/api/v1/gps/live-location',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null};return r.ok?r.json():null})
      .then(d=>{if(d){setEmployees(d.data?.employees||d.employees||d.data||[]);setLastSync(new Date())}})
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
  },[])

  const loadHistory = async (emp) => {
    if(emp.status==='checked_out'||emp.status==='not_checked_in') return
    setSelected(emp); setHistory([]); setHistLoad(true)
    try {
      const r=await fetch(`/api/v1/gps/movement-history/${emp.id}`,{headers:_authH()})
      const d=await r.json()
      setHistory(d.data?.movements||d.movements||d.data||[])
    } catch { setHistory([]) }
    finally { setHistLoad(false) }
  }

  const filtered   = employees.filter(e=>{
    if(statusF!=='all'&&e.status!==statusF) return false
    if(search&&!e.name?.toLowerCase().includes(search.toLowerCase())&&!e.dept?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const onDuty     = employees.filter(e=>e.status==='on_duty').length
  const checkedOut = employees.filter(e=>e.status==='checked_out').length
  const field      = employees.filter(e=>e.status==='field').length

  if(!canTrack) return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",textAlign:'center',padding:60,color:'#94a3b8'}}>
      <div style={{fontSize:48,marginBottom:16}}>🔒</div>
      <div style={{fontSize:15,fontWeight:700,color:'#475569',marginBottom:6}}>Access Restricted</div>
      <div style={{fontSize:13}}>GPS tracking is available to HR Managers and Authorised personnel only.</div>
      <div style={{fontSize:12,marginTop:8,color:'#94a3b8'}}>Contact your HR administrator to request access.</div>
    </div>
  )

  if(loading&&employees.length===0) return <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading GPS data for {company?.name}...</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#0f172a',minHeight:'100vh'}}>
      {msg&&<div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#0f172a',border:'1px solid #1e3a5f',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#e2e8f0',boxShadow:'0 4px 16px rgba(0,0,0,.4)',maxWidth:360}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(14,165,233,.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:26}}>🛰️</span>
              <div><h2 style={{fontSize:19,fontWeight:900,color:'#fff',margin:0}}>GPS Staff Tracking</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginTop:2}}>{company?.name} · Duty hours only · Privacy protected</div>
              </div>
              <span style={{background:'#ef4444',color:'#fff',padding:'2px 10px',borderRadius:20,fontSize:9,fontWeight:800}}>🔴 LIVE</span>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[{l:'On Duty',v:onDuty,c:'#4ade80'},{l:'Checked Out',v:checkedOut,c:'#94a3b8'},{l:'Field',v:field,c:'#38bdf8'},{l:'Tracked Now',v:employees.length,c:'#fff'}].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.1)',borderRadius:10,padding:'6px 12px'}}>
                  <span style={{fontSize:15,fontWeight:800,color:s.c}}>{s.v}</span>
                  <span style={{fontSize:9,color:'rgba(255,255,255,.6)',marginLeft:5}}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexDirection:'column'}}>
            <button onClick={load} style={{padding:'7px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄 Refresh</button>
            {lastSync&&<div style={{fontSize:9,color:'rgba(255,255,255,.5)'}}>{lastSync.toLocaleTimeString()}</div>}
            <label style={{display:'flex',alignItems:'center',gap:5,color:'rgba(255,255,255,.7)',fontSize:10,cursor:'pointer'}}>
              <input type="checkbox" checked={polling} onChange={e=>setPolling(e.target.checked)} style={{accentColor:A}}/>Auto 30s
            </label>
          </div>
        </div>
      </div>

      {/* Privacy notice */}
      <div style={{background:'#1e3a5f',border:'1px solid #0ea5e920',borderRadius:12,padding:'10px 16px',marginBottom:14,fontSize:11,color:'#7dd3fc',display:'flex',gap:10}}>
        <span style={{fontSize:16}}>🔒</span>
        <div><strong>Privacy Policy:</strong> Tracking is active only during registered duty hours (check-in to check-out). Once an employee checks out, location tracking stops immediately and is not retained. This system is for operational oversight only, not personal surveillance.</div>
      </div>

      {error&&<div style={{padding:'12px 16px',background:'#1e1b4b',border:'1px solid #4338ca',borderRadius:10,fontSize:12,color:'#a5b4fc',marginBottom:14}}>⚠️ {error}</div>}

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search employee, dept..."
          style={{flex:1,minWidth:200,padding:'8px 14px',borderRadius:10,border:'1px solid #1e3a5f',fontSize:12,outline:'none',background:'#1e293b',color:'#e2e8f0'}}/>
        {[{v:'all',l:'All'},{v:'on_duty',l:'On Duty'},{v:'field',l:'Field'},{v:'checked_out',l:'Checked Out'}].map(f=>(
          <button key={f.v} onClick={()=>setStatusF(f.v)} style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${statusF===f.v?A:'#1e3a5f'}`,background:statusF===f.v?A:'#1e293b',color:statusF===f.v?'#fff':'#94a3b8',fontSize:10,fontWeight:700,cursor:'pointer'}}>{f.l}</button>
        ))}
      </div>

      {/* Main layout */}
      <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:16,minHeight:500}}>
        {/* Employee list */}
        <div style={{display:'flex',flexDirection:'column',gap:8,overflowY:'auto',maxHeight:'70vh'}}>
          {employees.length===0&&!loading&&(
            <div style={{textAlign:'center',padding:60,color:'#475569'}}>
              <div style={{fontSize:36,marginBottom:12}}>🛰️</div>
              <div style={{fontSize:13,fontWeight:600,color:'#64748b'}}>No GPS data yet for {company?.name}</div>
              <div style={{fontSize:11,marginTop:6,color:'#475569'}}>Employees must clock in via GPS/mobile app</div>
            </div>
          )}
          {filtered.map(e=>{
            const c   = STATUS_C[e.status]||'#64748b'
            const sel = selected?.id===e.id
            const canSelect = e.status==='on_duty'||e.status==='field'
            return (
              <div key={e.id} onClick={()=>canSelect?loadHistory(e):toast('🔒 Tracking ended — employee has checked out')}
                style={{background:sel?'#1e3a5f':'#1e293b',borderRadius:12,padding:'12px 14px',border:`1.5px solid ${sel?A:'#0f172a'}`,cursor:canSelect?'pointer':'default',transition:'all .15s'}}
                onMouseEnter={e2=>{if(canSelect)e2.currentTarget.style.borderColor=A}}
                onMouseLeave={e2=>{if(!sel)e2.currentTarget.style.borderColor='#0f172a'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:`${c}20`,border:`2px solid ${c}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,flexShrink:0,color:c}}>
                    {(e.name||'?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#f1f5f9',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</div>
                    <div style={{fontSize:9,color:'#64748b'}}>{e.dept} · {e.emp_code}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:9,fontWeight:700,color:c,padding:'2px 8px',borderRadius:20,background:`${c}15`}}>{e.status==='on_duty'?'🟢 On Duty':e.status==='field'?'📍 Field':e.status==='checked_out'?'⚫ Off Duty':'🟡 Not In'}</div>
                    {e.status==='on_duty'&&e.check_in&&<div style={{fontSize:8,color:'#64748b',marginTop:2}}>In: {e.check_in}</div>}
                    {e.status==='checked_out'&&<div style={{fontSize:8,color:'#475569',marginTop:2}}>🔒 Tracking off</div>}
                  </div>
                </div>
                {e.status==='on_duty'&&e.last_location&&(
                  <div style={{fontSize:9,color:'#64748b',marginTop:6,display:'flex',gap:6,alignItems:'center'}}>
                    <span style={{color:GR,fontSize:8}}>●</span>
                    <span>{e.last_location}</span>
                    {e.last_seen&&<span style={{marginLeft:'auto',color:'#475569'}}>{e.last_seen}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Map / history panel */}
        <div style={{background:'#1e293b',borderRadius:16,border:'1px solid #1e3a5f',overflow:'hidden',minHeight:400}}>
          {!selected&&(
            <div style={{textAlign:'center',padding:80,color:'#475569'}}>
              <div style={{fontSize:48,marginBottom:16}}>🛰️</div>
              <div style={{fontSize:14,fontWeight:600,color:'#64748b'}}>Select an on-duty employee</div>
              <div style={{fontSize:12,marginTop:6}}>Click a green (on duty) employee on the left to view their current location and movement history</div>
            </div>
          )}
          {selected&&(
            <>
              {/* Selected employee header */}
              <div style={{padding:'14px 18px',background:G,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{selected.name} · {selected.dept}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.7)',marginTop:2}}>
                    Check-in: {selected.check_in||'—'} · Duty tracking active
                  </div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {selected.lat&&selected.lng&&<a href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`} target="_blank" rel="noopener noreferrer" style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:10,fontWeight:700,textDecoration:'none'}}>🗺️ Maps</a>}
                  <button onClick={()=>setSelected(null)} style={{background:'rgba(255,255,255,.15)',border:'none',borderRadius:8,width:28,height:28,color:'#fff',cursor:'pointer',fontSize:14}}>×</button>
                </div>
              </div>

              {/* Current location */}
              {selected.status==='checked_out'?(
                <div style={{textAlign:'center',padding:40,color:'#475569'}}>
                  <div style={{fontSize:36,marginBottom:12}}>🔒</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#64748b'}}>Duty Ended — Tracking Disabled for Privacy</div>
                  <div style={{fontSize:11,marginTop:6}}>Check-out: {selected.check_out||'—'}</div>
                </div>
              ):(
                <div style={{padding:'14px 18px'}}>
                  {/* Current position */}
                  <div style={{background:'#0f172a',borderRadius:12,padding:'12px 14px',marginBottom:14,border:'1px solid #1e3a5f'}}>
                    <div style={{fontSize:11,fontWeight:700,color:GR,marginBottom:6}}>📍 Current Location (Live)</div>
                    <div style={{fontSize:13,fontWeight:700,color:'#f1f5f9'}}>{selected.last_location||selected.current_location||'Location updating…'}</div>
                    {selected.lat&&selected.lng&&<div style={{fontSize:10,color:'#64748b',marginTop:3}}>Coords: {selected.lat}, {selected.lng}</div>}
                    {selected.last_seen&&<div style={{fontSize:9,color:'#475569',marginTop:2}}>Updated: {selected.last_seen}</div>}
                    {selected.speed_kmh!=null&&<div style={{fontSize:10,color:'#0ea5e9',marginTop:3}}>🚗 Speed: {selected.speed_kmh} km/h</div>}
                  </div>

                  {/* Map placeholder */}
                  <div style={{height:180,background:'linear-gradient(135deg,#0f172a,#1e3a5f)',borderRadius:12,position:'relative',overflow:'hidden',marginBottom:14,border:'1px solid #0ea5e920'}}>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
                      <span style={{fontSize:32}}>🗺️</span>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.5)',textAlign:'center'}}>
                        Map view<br/>
                        <a href={selected.lat&&selected.lng?`https://maps.google.com/?q=${selected.lat},${selected.lng}`:'#'} target="_blank" rel="noopener noreferrer" style={{color:A,textDecoration:'none',fontWeight:700}}>Open in Google Maps ↗</a>
                      </div>
                    </div>
                    {/* Animated location dot */}
                    <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>
                      <div style={{width:14,height:14,borderRadius:'50%',background:GR,boxShadow:`0 0 0 4px ${GR}40,0 0 0 8px ${GR}20`}}/>
                    </div>
                  </div>

                  {/* Movement history */}
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:8}}>📋 Movement History (Check-in to Now)</div>
                    {histLoad&&<div style={{textAlign:'center',padding:20,color:A,fontSize:12}}>⟳ Loading history…</div>}
                    {!histLoad&&history.length===0&&<div style={{textAlign:'center',padding:20,color:'#475569',fontSize:11}}>No movement data yet</div>}
                    {!histLoad&&history.length>0&&(
                      <div style={{display:'flex',flexDirection:'column',gap:0}}>
                        {history.map((h,i)=>(
                          <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'8px 0',borderBottom:i<history.length-1?'1px solid #0f172a':'none'}}>
                            <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:4}}>
                              <div style={{width:8,height:8,borderRadius:'50%',background:i===0?GR:'#0ea5e9',flexShrink:0}}/>
                              {i<history.length-1&&<div style={{width:1,height:20,background:'#1e3a5f',marginTop:2}}/>}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:10,fontWeight:600,color:'#e2e8f0'}}>{h.location||h.address||'—'}</div>
                              <div style={{fontSize:8,color:'#475569',marginTop:1}}>{h.time||h.timestamp||'—'}{h.duration?` · ${h.duration}`:''}</div>
                            </div>
                            {h.lat&&h.lng&&<a href={`https://maps.google.com/?q=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer" style={{fontSize:8,color:A,textDecoration:'none',flexShrink:0}}>📍</a>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
