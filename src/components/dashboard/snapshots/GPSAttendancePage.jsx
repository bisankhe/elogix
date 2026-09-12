// FILE: src/components/dashboard/snapshots/GPSAttendancePage.jsx
// eLogix HRMS — GPS Attendance
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// API: GET /api/v1/attendance/gps-punches
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch { return {} }
}
function _authH() {
  const s=_getSession(); const token=localStorage.getItem('access_token')||s?.token||''; const slug=s?.company?.slug||''
  return { 'Authorization':`Bearer ${token}`, 'X-Tenant-Slug':slug, 'Content-Type':'application/json' }
}

const G = 'linear-gradient(135deg,#064e3b 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

const STATUS_CFG = {
  accepted : { c:'#10b981', bg:'#f0fdf4', icon:'✅', label:'Accepted'  },
  rejected : { c:'#ef4444', bg:'#fef2f2', icon:'🚫', label:'Rejected'  },
  pending  : { c:'#f59e0b', bg:'#fffbeb', icon:'⏳', label:'Pending'   },
  wfh      : { c:'#3b82f6', bg:'#eff6ff', icon:'🏠', label:'WFH'       },
  field    : { c:'#8b5cf6', bg:'#f5f3ff', icon:'📍', label:'Field Work' },
}

export default function GPSAttendancePage() {
  const [punches,  setPunches]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [msg,      setMsg]      = useState('')
  const [ctx,      setCtx]      = useState(null)
  const [detail,   setDetail]   = useState(null)
  const [polling,  setPolling]  = useState(true)

  const s       = _getSession()
  const company = s?.company || {}
  const today   = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})

  const toast = (m,d=3500)=>{ setMsg(m); setTimeout(()=>setMsg(''),d) }

  function load() {
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug) return
    fetch('/api/v1/attendance/gps-punches',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null};return r.ok?r.json():null})
      .then(d=>d&&setPunches(d.data?.punches||d.punches||d.data||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }

  useEffect(()=>{
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug){ setLoading(false); return }
    setLoading(true); load()

    // Auto-refresh every 30s for live view
    const iv = setInterval(()=>{ if(polling) load() }, 30000)
    const close=()=>setCtx(null)
    document.addEventListener('click',close)
    return ()=>{ clearInterval(iv); document.removeEventListener('click',close) }
  },[])

  async function approveReject(id, action) {
    try {
      await fetch(`/api/v1/attendance/gps-punches/${id}/${action}`,{method:'PATCH',headers:_authH()})
    } catch {}
    setPunches(p=>p.map(x=>x.id===id?{...x,status:action==='approve'?'accepted':'rejected'}:x))
    toast(`✅ Punch ${action==='approve'?'approved':'rejected'}`)
  }

  const filtered = punches.filter(p=>{
    if(filter!=='all'&&p.status!==filter) return false
    if(search&&!p.employee?.toLowerCase().includes(search.toLowerCase())&&!p.emp_code?.toLowerCase().includes(search.toLowerCase())&&!p.dept?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const accepted = punches.filter(x=>x.status==='accepted').length
  const rejected = punches.filter(x=>x.status==='rejected').length
  const pending  = punches.filter(x=>x.status==='pending').length

  if(loading) return <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading GPS attendance for {company?.name}...</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f8fafc',minHeight:'100vh'}} onClick={()=>setCtx(null)}>

      {msg && <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 18px',fontSize:12,color:'#14532d',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxWidth:320}}>{msg}</div>}

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(8,145,178,.25)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:26}}>📍</span>
              <div><h2 style={{fontSize:19,fontWeight:900,color:'#fff',margin:0}}>GPS Attendance</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · {today} · Geo-validated clock-ins</div>
              </div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[{label:'Total Punches',value:punches.length,icon:'📍'},{label:'Accepted',value:accepted,icon:'✅'},{label:'Rejected',value:rejected,icon:'🚫'},{label:'Pending',value:pending,icon:'⏳'}].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'6px 14px',backdropFilter:'blur(10px)'}}>
                  <span style={{fontSize:12}}>{s.icon}</span>
                  <span style={{fontSize:16,fontWeight:800,color:'#fff',marginLeft:6}}>{s.value}</span>
                  <span style={{fontSize:10,color:'rgba(255,255,255,.7)',marginLeft:4}}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <label style={{display:'flex',alignItems:'center',gap:6,color:'#fff',fontSize:11,cursor:'pointer'}}>
              <input type="checkbox" checked={polling} onChange={e=>setPolling(e.target.checked)} style={{accentColor:'#fff'}}/>
              🔄 Auto-refresh
            </label>
            <button onClick={()=>load()} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄 Refresh</button>
          </div>
        </div>
      </div>

      {error && <div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search employee, code, dept..."
          style={{flex:1,minWidth:200,padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
        {['all','accepted','rejected','pending','wfh','field'].map(f=>{
          const cfg=STATUS_CFG[f]||{c:A,bg:'#f0f9ff',icon:'📍',label:'All'}
          return (
            <button key={f} onClick={()=>setFilter(f)}
              style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${filter===f?cfg.c:'#e2e8f0'}`,
                background:filter===f?cfg.c:'#fff',color:filter===f?'#fff':'#64748b',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {f==='all'?'📍 All':`${cfg.icon} ${cfg.label}`}
            </button>
          )
        })}
      </div>

      {/* Empty */}
      {punches.length===0&&!loading&&(
        <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #e2e8f0',color:'#94a3b8'}}>
          <div style={{fontSize:40,marginBottom:12}}>📍</div>
          <div style={{fontSize:14,fontWeight:700,color:'#475569',marginBottom:6}}>No GPS punches today for {company?.name}</div>
          <div style={{fontSize:12}}>GPS clock-ins appear here in real-time as employees check in</div>
        </div>
      )}

      {/* Punch cards */}
      {filtered.length>0&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:'#f8fafc'}}>
              {['Employee','Dept','Time','Location','Distance','Status','Actions'].map(h=>(
                <th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((p,i)=>{
                const cfg=STATUS_CFG[p.status]||STATUS_CFG.pending
                return (
                  <tr key={p.id} style={{borderBottom:'1px solid #f8fafc',background:i%2?'#fafafa':'#fff'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f0f9ff'}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2?'#fafafa':'#fff'}
                    onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtx({x:e.clientX,y:e.clientY,p})}}>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{fontWeight:700,color:'#0f172a'}}>{p.employee||p.employee_name||'—'}</div>
                      <div style={{fontSize:9,color:'#94a3b8'}}>{p.emp_code}</div>
                    </td>
                    <td style={{padding:'11px 14px',fontSize:12,color:'#64748b'}}>{p.dept||p.department||'—'}</td>
                    <td style={{padding:'11px 14px',fontFamily:'monospace',fontWeight:700,color:A}}>{p.time||p.punch_time||'—'}</td>
                    <td style={{padding:'11px 14px',fontSize:11,color:'#475569',maxWidth:150,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {p.location||p.location_name||'—'}
                      {p.task&&<div style={{fontSize:9,color:'#0284c7',marginTop:2}}>📋 {p.task}</div>}
                    </td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{fontSize:12,fontWeight:700,color:p.distance_m>100?'#ef4444':'#10b981'}}>
                        {p.distance_m!=null?`${p.distance_m}m`:'—'}
                      </span>
                      {p.distance_m>100&&<div style={{fontSize:8,color:'#ef4444'}}>⚠️ Far</div>}
                    </td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{padding:'3px 10px',borderRadius:20,fontSize:9,fontWeight:700,background:cfg.bg,color:cfg.c}}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>setDetail(p)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',fontSize:10,cursor:'pointer'}}>View</button>
                        {p.status==='pending'&&<>
                          <button onClick={()=>approveReject(p.id,'approve')} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#f0fdf4',color:'#15803d',fontSize:10,cursor:'pointer'}}>✅</button>
                          <button onClick={()=>approveReject(p.id,'reject')} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#fef2f2',color:'#dc2626',fontSize:10,cursor:'pointer'}}>🚫</button>
                        </>}
                        {p.lat&&p.lng&&<button onClick={()=>window.open(`https://maps.google.com/?q=${p.lat},${p.lng}`,'_blank')} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'#f0f9ff',color:'#0369a1',fontSize:10,cursor:'pointer'}}>🗺️</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Context menu */}
      {ctx&&(
        <div onClick={e=>e.stopPropagation()} style={{position:'fixed',zIndex:9999,left:ctx.x,top:ctx.y,background:'#fff',borderRadius:12,width:200,boxShadow:'0 20px 60px rgba(0,0,0,.2)',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{background:G,padding:'10px 14px'}}><div style={{fontSize:11,fontWeight:800,color:'#fff'}}>{ctx.p?.employee}</div></div>
          {[{icon:'👁',label:'View Detail',fn:()=>setDetail(ctx.p)},{icon:'✅',label:'Approve',fn:()=>approveReject(ctx.p?.id,'approve')},{icon:'🚫',label:'Reject',fn:()=>approveReject(ctx.p?.id,'reject'),danger:true},{icon:'🗺️',label:'Open in Maps',fn:()=>ctx.p?.lat&&window.open(`https://maps.google.com/?q=${ctx.p.lat},${ctx.p.lng}`,'_blank')}].map((a,i)=>(
            <button key={i} onClick={()=>{a.fn();setCtx(null)}} style={{width:'100%',padding:'9px 14px',border:'none',background:'transparent',textAlign:'left',fontSize:12,cursor:'pointer',color:a.danger?'#ef4444':'#334155',borderBottom:i<3?'1px solid #f8fafc':'none'}}
              onMouseEnter={e=>e.currentTarget.style.background=a.danger?'#fef2f2':'#f8fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {detail&&(
        <>
          <div onClick={()=>setDetail(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:3999}}/>
          <div style={{position:'fixed',right:0,top:0,bottom:0,width:380,background:'#fff',boxShadow:'-20px 0 60px rgba(0,0,0,.15)',zIndex:4000,overflow:'auto'}}>
            <div style={{padding:'20px 24px',background:G}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div><div style={{fontSize:16,fontWeight:900,color:'#fff'}}>📍 {detail.employee||detail.employee_name}</div><div style={{fontSize:10,color:'rgba(255,255,255,.75)',marginTop:2}}>{detail.emp_code} · {detail.dept}</div></div>
                <button onClick={()=>setDetail(null)} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:8,width:30,height:30,color:'#fff',cursor:'pointer',fontSize:16}}>×</button>
              </div>
            </div>
            <div style={{padding:'20px 24px'}}>
              {[['Punch Time',detail.time||detail.punch_time],['Location',detail.location||detail.location_name],['Distance',detail.distance_m!=null?`${detail.distance_m}m from assigned location`:'N/A'],['Status',(STATUS_CFG[detail.status]||{}).label||detail.status],['Task',detail.task||'No task assigned'],['Coordinates',detail.lat&&detail.lng?`${detail.lat}, ${detail.lng}`:'N/A'],['Device',detail.device||'Mobile App'],['IP Address',detail.ip||'N/A']].filter(([,v])=>v&&v!=='N/A').map(([l,v],i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
                  <span style={{color:'#64748b',minWidth:100}}>{l}</span>
                  <span style={{fontWeight:700,color:'#0f172a',textAlign:'right',maxWidth:'55%',wordBreak:'break-word'}}>{v}</span>
                </div>
              ))}
              {detail.lat&&detail.lng&&(
                <a href={`https://maps.google.com/?q=${detail.lat},${detail.lng}`} target="_blank" rel="noopener noreferrer"
                  style={{display:'block',marginTop:14,padding:'10px 14px',background:'#f0f9ff',borderRadius:8,fontSize:12,color:'#0369a1',fontWeight:600,textDecoration:'none'}}>
                  🗺️ Open in Google Maps →
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
