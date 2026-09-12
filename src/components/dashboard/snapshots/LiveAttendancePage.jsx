// FILE: src/components/dashboard/snapshots/LiveAttendancePage.jsx
// eLogix HRMS — Live Attendance Dashboard
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// API: GET /api/v1/attendance/live  (polls every 30s)
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch { return {} }
}
function _authH() {
  const s=_getSession(); const token=localStorage.getItem('access_token')||s?.token||''; const slug=s?.company?.slug||''
  return { 'Authorization':`Bearer ${token}`, 'X-Tenant-Slug':slug, 'Content-Type':'application/json' }
}

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#0369a1 60%,#38bdf8 100%)'
const A  = '#0369a1'

const STATUS_C  = { Present:'#10b981', Late:'#f59e0b', WFH:'#3b82f6', Absent:'#ef4444', 'On Leave':'#8b5cf6', Field:'#0891b2' }
const STATUS_BG = { Present:'#f0fdf4', Late:'#fffbeb', WFH:'#eff6ff', Absent:'#fef2f2', 'On Leave':'#f5f3ff', Field:'#f0f9ff' }

export default function LiveAttendancePage() {
  const [feed,     setFeed]     = useState([])
  const [summary,  setSummary]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState('all')
  const [deptF,    setDeptF]    = useState('All')
  const [polling,  setPolling]  = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [detail,   setDetail]   = useState(null)
  const [ctx,      setCtx]      = useState(null)

  const s       = _getSession()
  const company = s?.company || {}
  const user    = s?.user    || {}
  const today   = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})

  function load() {
    const token=localStorage.getItem('access_token')||s?.token||''
    const slug=s?.company?.slug||''
    if(!token||!slug) return
    fetch('/api/v1/attendance/live',{headers:_authH()})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));return null};return r.ok?r.json():null})
      .then(d=>{
        if(!d) return
        setFeed(d.data?.feed||d.feed||d.data||[])
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
    const close=()=>setCtx(null)
    document.addEventListener('click',close)
    return ()=>{ clearInterval(iv); document.removeEventListener('click',close) }
  },[])

  const depts = ['All',...new Set(feed.map(e=>e.dept||e.department).filter(Boolean))]
  const filtered = feed.filter(e=>{
    if(statusF!=='all'&&e.status!==statusF) return false
    if(deptF!=='All'&&(e.dept||e.department)!==deptF) return false
    if(search&&!e.name?.toLowerCase().includes(search.toLowerCase())&&!e.emp_code?.toLowerCase().includes(search.toLowerCase())&&!(e.dept||e.department)?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const present    = summary.present    || feed.filter(e=>e.status==='Present').length
  const absent     = summary.absent     || feed.filter(e=>e.status==='Absent').length
  const late       = summary.late       || feed.filter(e=>e.status==='Late').length
  const onLeave    = summary.on_leave   || feed.filter(e=>e.status==='On Leave').length
  const wfh        = summary.wfh        || feed.filter(e=>e.status==='WFH').length
  const total      = summary.total      || feed.length
  const attRate    = total>0 ? Math.round(((present+late+wfh)/total)*100) : 0

  if(loading) return <div style={{textAlign:'center',padding:60,color:A,fontFamily:'system-ui'}}><div style={{fontSize:36,marginBottom:12}}>⟳</div><div style={{fontSize:13,fontWeight:600}}>Loading live attendance for {company?.name}...</div></div>

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",padding:24,background:'#f8fafc',minHeight:'100vh'}} onClick={()=>setCtx(null)}>

      {/* Header */}
      <div style={{background:G,borderRadius:16,padding:'20px 24px',marginBottom:20,boxShadow:'0 4px 24px rgba(3,105,161,.25)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-20,top:-20,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,.07)'}}/>
        <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:26}}>🔴</span>
              <div>
                <h2 style={{fontSize:19,fontWeight:900,color:'#fff',margin:0}}>Live Attendance</h2>
                <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{company?.name} · {today}</div>
              </div>
              <span style={{background:'#ef4444',color:'#fff',padding:'2px 10px',borderRadius:20,fontSize:9,fontWeight:800,animation:'pulse 2s infinite'}}>● LIVE</span>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[{label:'Present',value:present,color:'#4ade80'},{label:'Late',value:late,color:'#fbbf24'},{label:'WFH',value:wfh,color:'#60a5fa'},{label:'Absent',value:absent,color:'#f87171'},{label:'On Leave',value:onLeave,color:'#c4b5fd'},{label:'Rate',value:`${attRate}%`,color:'#fff'}].map((s,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.12)',borderRadius:10,padding:'6px 12px',backdropFilter:'blur(10px)',textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:900,color:s.color}}>{s.value}</div>
                  <div style={{fontSize:9,color:'rgba(255,255,255,.65)'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexDirection:'column'}}>
            <button onClick={()=>load()} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.15)',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄 Refresh</button>
            {lastSync&&<div style={{fontSize:9,color:'rgba(255,255,255,.6)',textAlign:'center'}}>Synced: {lastSync.toLocaleTimeString()}</div>}
            <label style={{display:'flex',alignItems:'center',gap:6,color:'rgba(255,255,255,.8)',fontSize:10,cursor:'pointer'}}>
              <input type="checkbox" checked={polling} onChange={e=>setPolling(e.target.checked)} style={{accentColor:A}}/> Auto (30s)
            </label>
          </div>
        </div>
      </div>

      {/* Attendance Rate Bar */}
      <div style={{background:'#fff',borderRadius:14,padding:'14px 18px',marginBottom:14,border:'1px solid #e2e8f0'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:11,fontWeight:600}}>
          <span style={{color:'#0f172a'}}>Attendance Rate Today</span>
          <span style={{color:attRate>=90?'#10b981':attRate>=75?'#f59e0b':'#ef4444',fontWeight:800,fontSize:14}}>{attRate}%</span>
        </div>
        <div style={{height:10,background:'#f1f5f9',borderRadius:5,overflow:'hidden'}}>
          <div style={{height:10,borderRadius:5,background:attRate>=90?'#10b981':attRate>=75?'#f59e0b':'#ef4444',width:`${attRate}%`,transition:'width .6s'}}/>
        </div>
        <div style={{display:'flex',gap:4,marginTop:8,height:10,borderRadius:5,overflow:'hidden'}}>
          {[{val:present,c:'#10b981'},{val:late,c:'#f59e0b'},{val:wfh,c:'#3b82f6'},{val:onLeave,c:'#8b5cf6'},{val:absent,c:'#ef4444'}].map((s,i)=>
            total>0&&<div key={i} style={{flex:s.val,background:s.c,transition:'flex .6s'}}/>
          )}
        </div>
        <div style={{display:'flex',gap:12,marginTop:6,flexWrap:'wrap'}}>
          {[{label:'Present',val:present,c:'#10b981'},{label:'Late',val:late,c:'#f59e0b'},{label:'WFH',val:wfh,c:'#3b82f6'},{label:'On Leave',val:onLeave,c:'#8b5cf6'},{label:'Absent',val:absent,c:'#ef4444'}].map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:10}}>
              <div style={{width:8,height:8,borderRadius:2,background:s.c}}/>
              <span style={{color:'#64748b'}}>{s.label}: <strong style={{color:s.c}}>{s.val}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{padding:'12px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:14}}>⚠️ {error}</div>}

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search employee, code, dept..."
          style={{flex:1,minWidth:200,padding:'8px 14px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff'}}/>
        <select value={deptF} onChange={e=>setDeptF(e.target.value)}
          style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e2e8f0',fontSize:12,outline:'none',background:'#fff',appearance:'none'}}>
          {depts.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        {['all','Present','Late','WFH','Absent','On Leave','Field'].map(st=>{
          const c=STATUS_C[st]||A; const bg=STATUS_BG[st]||'#f0f9ff'
          return <button key={st} onClick={()=>setStatusF(st)}
            style={{padding:'6px 12px',borderRadius:20,border:`1.5px solid ${statusF===st?c:'#e2e8f0'}`,
              background:statusF===st?c:'#fff',color:statusF===st?'#fff':'#64748b',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            {st==='all'?'All':st}
          </button>
        })}
      </div>

      {/* Empty */}
      {feed.length===0&&!loading&&(
        <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:14,border:'2px dashed #e2e8f0',color:'#94a3b8'}}>
          <div style={{fontSize:40,marginBottom:12}}>🔴</div>
          <div style={{fontSize:14,fontWeight:700,color:'#475569',marginBottom:6}}>No live attendance data yet for {company?.name}</div>
          <div style={{fontSize:12}}>Data appears as employees clock in via GPS, biometric, or web</div>
        </div>
      )}

      {/* Live feed table */}
      {filtered.length>0&&(
        <div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>🔴 Live Feed — {filtered.length} records</div>
            {lastSync&&<div style={{fontSize:9,color:'#94a3b8'}}>Last updated: {lastSync.toLocaleTimeString()}</div>}
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'#f8fafc'}}>
                {['Employee','Dept','Shift','Check-In','Check-Out','OT','Method','Status'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((e,i)=>{
                  const c=STATUS_C[e.status]||'#64748b'; const bg=STATUS_BG[e.status]||'#f8fafc'
                  return (
                    <tr key={e.id||i} style={{borderBottom:'1px solid #f8fafc',background:i%2?'#fafafa':'#fff',cursor:'pointer'}}
                      onClick={()=>setDetail(e)}
                      onContextMenu={ev=>{ev.preventDefault();ev.stopPropagation();setCtx({x:ev.clientX,y:ev.clientY,e})}}
                      onMouseEnter={ev=>ev.currentTarget.style.background='#f0f9ff'}
                      onMouseLeave={ev=>ev.currentTarget.style.background=i%2?'#fafafa':'#fff'}>
                      <td style={{padding:'10px 14px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:30,height:30,borderRadius:'50%',background:`${c}15`,border:`1.5px solid ${c}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,color:c}}>
                            {(e.name||e.employee_name||'?').charAt(0).toUpperCase()}
                          </div>
                          <div><div style={{fontWeight:700,color:'#0f172a'}}>{e.name||e.employee_name||'—'}</div><div style={{fontSize:9,color:'#94a3b8'}}>{e.emp_code}</div></div>
                        </div>
                      </td>
                      <td style={{padding:'10px 14px',color:'#64748b'}}>{e.dept||e.department||'—'}</td>
                      <td style={{padding:'10px 14px',fontSize:11}}>{e.shift||e.shift_name||'—'}</td>
                      <td style={{padding:'10px 14px',fontFamily:'monospace',fontWeight:700,color:A}}>{e.check_in||e.in||'—'}</td>
                      <td style={{padding:'10px 14px',fontFamily:'monospace',color:'#64748b'}}>{e.check_out||e.out||'—'}</td>
                      <td style={{padding:'10px 14px',fontSize:11,color:e.overtime?'#f59e0b':'#94a3b8',fontWeight:e.overtime?700:400}}>{e.overtime||'—'}</td>
                      <td style={{padding:'10px 14px',fontSize:11,color:'#64748b'}}>{e.method||e.punch_method||'—'}</td>
                      <td style={{padding:'10px 14px'}}>
                        <span style={{padding:'3px 10px',borderRadius:20,fontSize:9,fontWeight:700,background:bg,color:c}}>
                          {e.status}
                        </span>
                        {e.status==='Late'&&e.late_by&&<div style={{fontSize:8,color:'#f59e0b',marginTop:2}}>{e.late_by} late</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctx&&(
        <div onClick={ev=>ev.stopPropagation()} style={{position:'fixed',zIndex:9999,left:ctx.x,top:ctx.y,background:'#fff',borderRadius:12,width:180,boxShadow:'0 20px 60px rgba(0,0,0,.2)',border:'1px solid #e2e8f0',overflow:'hidden'}}>
          {[{icon:'👁',label:'View Details',fn:()=>setDetail(ctx.e)}].map((a,i)=>(
            <button key={i} onClick={()=>{a.fn();setCtx(null)}} style={{width:'100%',padding:'9px 14px',border:'none',background:'transparent',textAlign:'left',fontSize:12,cursor:'pointer',color:'#334155'}}
              onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
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
                <div><div style={{fontSize:16,fontWeight:900,color:'#fff'}}>{detail.name||detail.employee_name}</div><div style={{fontSize:10,color:'rgba(255,255,255,.75)',marginTop:2}}>{detail.emp_code} · {detail.dept||detail.department}</div></div>
                <button onClick={()=>setDetail(null)} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:8,width:30,height:30,color:'#fff',cursor:'pointer',fontSize:16}}>×</button>
              </div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{textAlign:'center',marginBottom:16}}>
                <span style={{padding:'5px 16px',borderRadius:20,fontSize:11,fontWeight:700,background:STATUS_BG[detail.status]||'#f8fafc',color:STATUS_C[detail.status]||'#64748b'}}>{detail.status}</span>
              </div>
              {[['Check-In',detail.check_in||detail.in||'—'],['Check-Out',detail.check_out||detail.out||'—'],['Shift',detail.shift||detail.shift_name||'—'],['Method',detail.method||detail.punch_method||'—'],['Overtime',detail.overtime||'—'],['Late By',detail.late_by||'—'],['Location',detail.location||'—'],['Task',detail.task||'—'],['Device',detail.device||'Mobile/Web']].filter(([,v])=>v&&v!=='—').map(([l,v],i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f8fafc',fontSize:12}}>
                  <span style={{color:'#64748b',minWidth:100}}>{l}</span>
                  <span style={{fontWeight:700,color:'#0f172a',textAlign:'right'}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
