// FILE: src/components/dashboard/snapshots/GPSAttendancePage.jsx
// eLogix HRMS — GPS Attendance (Attendance Management > Daily Attendance)
// Mobile clock-in map view, odd-location rejection, assigned-location validation
// FIXED: msg is not defined (was _nm/_snm) 
// ADDED: tenant-wise access via resolveTenantAccess, SaaS DB API integration
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { PageHeader, SearchBar, ContextMenu, ExcelModal } from './DeptSetupShared.jsx'
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G = 'linear-gradient(135deg,#064e3b 0%,#0891b2 60%,#67e8f9 100%)'
const A = '#0891b2'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

const MOCK_PUNCHES = [
  { id:'p1', employee:'Gita Maharjan', emp_code:'E00001', dept:'IT', location:'KTM HQ Office',
    distance_m:12, status:'accepted', time:'09:02 AM', task:null, lat:27.7172, lng:85.3240,
    impact_links:['Geo-Fencing','Attendance Policy'] },
  { id:'p2', employee:'Ramesh KC', emp_code:'E00002', dept:'Sales', location:'Field Visit - Client ABC Pvt Ltd',
    distance_m:8, status:'accepted', time:'10:15 AM', task:'Site survey - assigned by Dipak Tamang', lat:27.6727, lng:85.3146,
    impact_links:['Task & Location Assignment'] },
  { id:'p3', employee:'Anjali Sharma', emp_code:'E00003', dept:'Marketing', location:'Unknown / Odd Location',
    distance_m:340, status:'rejected', time:'09:08 AM', task:null, lat:27.6520, lng:85.3750,
    impact_links:['Geo-Fencing'] },
  { id:'p4', employee:'Sunil Magar', emp_code:'E00004', dept:'Operations', location:'Pokhara Branch',
    distance_m:6, status:'accepted', time:'08:55 AM', task:null, lat:28.2096, lng:83.9856,
    impact_links:[] },
]

const STATUS_CFG = {
  accepted: {c:'#10b981', bg:'#f0fdf4', icon:'✅'},
  rejected : {c:'#ef4444', bg:'#fef2f2', icon:'🚫'},
}

export default function GPSAttendancePage() {
  const slug   = getSessionSlug()
  const access = resolveTenantAccess(slug)
  const sess   = getSession()
  const company = sess.company || {}

  if (!access.hasAccess('attendance')) {
    return <AccessDenied moduleName="GPS Attendance" />
  }

  // ── State ─────────────────────────────────────────────────────────
  const [punches,   setPunches]   = useState(MOCK_PUNCHES)
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState('')          // ✅ FIX: was _nm/_snm
  const [showExcel, setShowExcel] = useState(false)
  const [ctx,       setCtx]       = useState(null)

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // ── SaaS DB: load from API on mount ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return  // dev mode: use mock data
    setLoading(true)
    fetch('/api/v1/attendance/gps-punches', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': slug,
      }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (data.data?.length) setPunches(data.data)
      })
      .catch(() => { /* keep mock data */ })
      .finally(() => setLoading(false))
  }, [slug])

  const filtered      = punches.filter(p => !search || p.employee.toLowerCase().includes(search.toLowerCase()))
  const rejectedCount = punches.filter(p => p.status === 'rejected').length

  const handleOverride = (id) => {
    setPunches(prev => prev.map(p => p.id === id ? {...p, status:'accepted'} : p))
    notify('✅ Override applied — punch accepted manually')
    // In production: PATCH /api/v1/attendance/gps-punches/{id}/override
  }

  const exportCSV = () => {
    const h = ['Employee','Emp Code','Dept','Location','Distance (m)','Status','Time','Task']
    const b = punches.map(p => [p.employee, p.emp_code, p.dept, p.location, p.distance_m, p.status, p.time, p.task||''].join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+[h.join(','), ...b].join('\n')], {type:'text/csv'}))
    a.download = `GPS_Attendance_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    notify('📤 Exported')
  }

  return (
    // ── Outer wrapper with fixed height + scroll ───────────────────
    <div style={{position:'relative', width:'100%', minHeight:'100vh', fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#f0f9ff', display:'flex', flexDirection:'column', overflow:'hidden'}}
      onClick={() => setCtx(null)}>

      <style>{`
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:4px}
        ::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#475569}
      `}</style>
      {/* Toast */}
      {msg && <div style={{position:'fixed', bottom:20, right:20, zIndex:9999,
        background:msg.startsWith('❌')?'#fef2f2':'#f0fdf4',
        border:`1px solid ${msg.startsWith('❌')?'#fecaca':'#bbf7d0'}`,
        borderRadius:10, padding:'10px 18px', fontSize:11, fontWeight:600,
        color:msg.startsWith('❌')?'#dc2626':'#065f46',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>
        {msg}
      </div>}

      {/* Header */}
      <div style={{background:G, padding:'12px 20px', color:'#fff', flexShrink:0}}>
        <div style={{fontSize:10, opacity:.7, marginBottom:2}}>
          Workforce Operations › Attendance Management › GPS Attendance
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8}}>
          <div>
            <div style={{fontSize:17, fontWeight:900}}>📍 GPS Attendance</div>
            <div style={{fontSize:10, opacity:.8}}>
              {company.name || 'Company'} · {punches.length} punches today · {rejectedCount} rejected
            </div>
          </div>
          <div style={{display:'flex', gap:6}}>
            <button onClick={exportCSV}
              style={{padding:'7px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)',
                background:'rgba(255,255,255,.18)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer'}}>
              📤 Export
            </button>
            <button onClick={() => { notify('GPS visit recorded'); }}
              style={{padding:'7px 14px', borderRadius:8, border:'none',
                background:'#fff', color:A, fontSize:11, fontWeight:700, cursor:'pointer'}}>
              + Record GPS Visit
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12}}>
          {[
            {icon:'📍', label:"Today's Punches", v:punches.length},
            {icon:'✅', label:'Accepted',        v:punches.filter(p=>p.status==='accepted').length},
            {icon:'🚫', label:'Rejected',        v:rejectedCount},
            {icon:'📋', label:'With Task',       v:punches.filter(p=>p.task).length},
          ].map(s => (
            <div key={s.label} style={{background:'rgba(255,255,255,.12)', borderRadius:8,
              padding:'7px 10px', textAlign:'center', border:'1px solid rgba(255,255,255,.2)'}}>
              <div style={{fontSize:14}}>{s.icon}</div>
              <div style={{fontSize:16, fontWeight:900, lineHeight:1, marginTop:2}}>{s.v}</div>
              <div style={{fontSize:9, opacity:.75, marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div style={{background:'#ecfeff', border:'1px solid #a5f3fc', padding:'9px 20px',
        fontSize:11, color:'#155e75', display:'flex', gap:8, alignItems:'flex-start', flexShrink:0}}>
        <span style={{fontSize:16}}>📍</span>
        <div><strong>Strict Location Rule:</strong> No attendance accepted from odd/unassigned locations.
          Field visits require supervisor pre-assignment of task+location before GPS validates the clock-in.</div>
      </div>

      {/* Toolbar */}
      <div style={{padding:'10px 20px', display:'flex', gap:8, flexWrap:'wrap',
        alignItems:'center', background:'#fff', borderBottom:'1px solid #e2e8f0', flexShrink:0}}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by employee name..."
          style={{padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, outline:'none', flex:1, minWidth:200, fontFamily:'inherit'}}/>
        <span style={{fontSize:11, color:'#64748b'}}>{filtered.length}/{punches.length} records</span>
        {loading && <span style={{fontSize:11, color:'#0891b2'}}>⟳ Loading...</span>}
      </div>

      {/* Scrollable content */}
      <div style={{flex:1, overflowY:'auto', overflowX:'hidden', padding:'16px 20px',
        scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9',
        WebkitOverflowScrolling:'touch'}}>

        <div style={{display:'grid', gridTemplateColumns:'1fr 300px', gap:16}}>
          {/* Punch list */}
          <div style={{display:'grid', gap:10}}>
            {filtered.map(p => {
              const sc = STATUS_CFG[p.status]
              return (
                <div key={p.id}
                  onContextMenu={ev => { ev.preventDefault(); setCtx({x:ev.clientX, y:ev.clientY, item:{name:p.employee,...p}}) }}
                  style={{background:'#fff', border:`1.5px solid ${sc.c}33`, borderRadius:14,
                    padding:'14px 18px', display:'flex', alignItems:'center', gap:14,
                    boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
                  <div style={{width:42, height:42, borderRadius:12, background:`${sc.c}15`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0}}>
                    {sc.icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:2}}>
                      <span style={{fontSize:12, fontWeight:800, color:'#0f172a'}}>{p.employee}</span>
                      <span style={{fontSize:9, color:'#94a3b8'}}>{p.emp_code}</span>
                      <span style={{background:sc.bg, color:sc.c, fontSize:9, fontWeight:700,
                        padding:'1px 8px', borderRadius:20}}>
                        {p.status === 'accepted' ? 'Accepted' : 'Rejected - Odd Location'}
                      </span>
                    </div>
                    <div style={{fontSize:10, color:'#64748b'}}>
                      📍 {p.location} · {p.distance_m}m from fence · {p.time}
                    </div>
                    {p.task && <div style={{fontSize:9, color:A, marginTop:2}}>📋 {p.task}</div>}
                  </div>
                  {p.status === 'rejected' && (
                    <button onClick={() => handleOverride(p.id)}
                      style={{padding:'5px 12px', borderRadius:7, border:'none', cursor:'pointer',
                        background:'#fffbeb', color:'#b45309', fontSize:9, fontWeight:700, flexShrink:0}}>
                      Override
                    </button>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{textAlign:'center', padding:48, color:'#94a3b8'}}>
                <div style={{fontSize:32}}>📍</div>
                <div style={{fontWeight:600, marginTop:8}}>No GPS punches found</div>
              </div>
            )}
          </div>

          {/* Mini map */}
          <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:16,
            padding:'16px 18px', height:'fit-content', position:'sticky', top:0}}>
            <div style={{fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:10}}>
              🗺 Live Punch Map
            </div>
            <div style={{height:200, background:'linear-gradient(135deg,#e0f2fe,#cffafe)',
              borderRadius:12, position:'relative', overflow:'visible'}}>
              <div style={{position:'absolute', top:'40%', left:'30%', width:60, height:60,
                borderRadius:'50%', border:`2px dashed ${A}`, background:`${A}10`}}/>
              {punches.map((p, i) => (
                <div key={i} style={{position:'absolute', top:`${30+i*15}%`, left:`${20+i*18}%`,
                  width:10, height:10, borderRadius:'50%', background:STATUS_CFG[p.status].c,
                  border:'2px solid #fff', boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
              ))}
            </div>
            <div style={{fontSize:9, color:'#94a3b8', marginTop:8}}>
              Dashed circle = geo-fence · Green = accepted · Red = rejected
            </div>

            {/* Legend */}
            <div style={{marginTop:12, display:'grid', gap:6}}>
              {punches.map((p, i) => (
                <div key={i} style={{display:'flex', alignItems:'center', gap:8, fontSize:10}}>
                  <div style={{width:8, height:8, borderRadius:'50%', background:STATUS_CFG[p.status].c, flexShrink:0}}/>
                  <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#374151'}}>{p.employee}</span>
                  <span style={{color:'#94a3b8', fontSize:9}}>{p.distance_m}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links}
        actions={[
          {icon:'👁', label:'View on Map',              key:'view'},
          {icon:'✏', label:'Override / Approve Manually', key:'override'},
          {icon:'🔗', label:'Impact Analysis',           key:'impact'},
          {icon:'📤', label:'Export',                    key:'export'},
        ]} onAction={() => {}} onClose={() => setCtx(null)}/>}
    </div>
  )
}
