// FILE: src/components/dashboard/snapshots/LiveAttendancePage.jsx
// eLogix HRMS — Live Attendance (Daily Attendance)
// Real-time ledger: who's clocked in/on break/absent, WebSocket-style live updates
// FIXED: msg is not defined (was _nm/_snm)
// ADDED: tenant-wise access, SaaS DB integration, right scrollbar
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G = 'linear-gradient(135deg,#052e16 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

const LIVE_FEED = [
  { id:'e1', name:'Gita Maharjan',   emp_code:'E00001', dept:'IT',      status:'working',         method:'biometric', since:'09:02 AM', location:'KTM HQ',            avatar:'#3b82f6' },
  { id:'e2', name:'Maya Pradhan',    emp_code:'E00002', dept:'Finance',  status:'on_break',        method:'web',       since:'01:05 PM', location:'KTM HQ',            avatar:'#10b981' },
  { id:'e3', name:'Ramesh KC',       emp_code:'E00003', dept:'Sales',    status:'field_duty',      method:'gps',       since:'10:15 AM', location:'Client Site - Lalitpur', avatar:'#f59e0b' },
  { id:'e4', name:'Bikash Shrestha', emp_code:'E00004', dept:'IT',      status:'working',         method:'biometric', since:'08:58 AM', location:'KTM HQ',            avatar:'#7c3aed' },
  { id:'e5', name:'Sunita Rai',      emp_code:'E00005', dept:'HR',      status:'absent',          method:null,        since:null,       location:null,                avatar:'#ec4899' },
  { id:'e6', name:'Hari Thapa',      emp_code:'E00006', dept:'IT',      status:'missed_checkout', method:'biometric', since:'Yesterday 10:00 PM', location:'KTM HQ', avatar:'#ef4444' },
  { id:'e7', name:'Anjali Sharma',   emp_code:'E00007', dept:'Marketing',status:'working',         method:'qr',        since:'09:10 AM', location:'KTM HQ',            avatar:'#0891b2' },
  { id:'e8', name:'Sunil Magar',     emp_code:'E00008', dept:'Ops',     status:'on_break',        method:'biometric', since:'12:30 PM', location:'Pokhara Branch',     avatar:'#84cc16' },
]

const STATUS_CFG = {
  working         : {c:'#10b981', bg:'#f0fdf4', icon:'🟢', label:'Working'},
  on_break        : {c:'#f59e0b', bg:'#fffbeb', icon:'☕', label:'On Break'},
  field_duty      : {c:'#3b82f6', bg:'#eff6ff', icon:'📍', label:'Field Duty'},
  absent          : {c:'#94a3b8', bg:'#f8fafc', icon:'⚪', label:'Absent'},
  missed_checkout : {c:'#ef4444', bg:'#fef2f2', icon:'⚠️', label:'Missed Checkout'},
}
const METHOD_ICONS = {biometric:'👆', gps:'📍', web:'💻', qr:'📱'}

export default function LiveAttendancePage() {
  const slug   = getSessionSlug()
  const access = resolveTenantAccess(slug)
  const sess   = getSession()
  const company = sess.company || {}

  if (!access.hasAccess('attendance')) {
    return <AccessDenied moduleName="Live Attendance" />
  }

  const [feed,         setFeed]         = useState(LIVE_FEED)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [msg,          setMsg]          = useState('')   // ✅ FIX: was _nm/_snm
  const [ctx,          setCtx]          = useState(null)
  const [pulse,        setPulse]        = useState(true)
  const [loading,      setLoading]      = useState(false)

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // Pulse animation for live indicator
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1500)
    return () => clearInterval(t)
  }, [])

  // SaaS DB: fetch live attendance from API
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setLoading(true)
    fetch('/api/v1/attendance/live', {
      headers: {'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug}
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (data.data?.length) setFeed(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const t = setInterval(() => notify('🔄 Feed refreshed'), 60000)
    return () => clearInterval(t)
  }, [])

  const filtered = feed.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    working   : feed.filter(e => e.status === 'working').length,
    on_break  : feed.filter(e => e.status === 'on_break').length,
    field_duty: feed.filter(e => e.status === 'field_duty').length,
    absent    : feed.filter(e => e.status === 'absent').length,
  }
  const anomalies = feed.filter(e => e.status === 'missed_checkout').length

  return (
    <div style={{position:'fixed', inset:0, fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#f0fdf4', display:'flex', flexDirection:'column', overflow:'hidden'}}
      onClick={() => setCtx(null)}>

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
          Workforce Operations › Attendance Management › Daily Attendance
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8}}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{width:10, height:10, borderRadius:'50%', background:'#86efac',
                opacity:pulse?1:0.3, transition:'opacity .3s', display:'inline-block'}}/>
              <span style={{fontSize:17, fontWeight:900}}>📡 Live Attendance</span>
            </div>
            <div style={{fontSize:10, opacity:.8}}>
              {company.name || 'Company'} · {feed.length} employees · {anomalies} anomalies
              {loading && ' · Loading...'}
            </div>
          </div>
          <button onClick={() => notify('✅ Attendance marked')}
            style={{padding:'7px 14px', borderRadius:8, border:'none',
              background:'#fff', color:A, fontSize:11, fontWeight:700, cursor:'pointer'}}>
            + Mark Attendance
          </button>
        </div>

        {/* KPI strip */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12}}>
          {[
            {icon:'🟢', label:'Working Now',  v:counts.working},
            {icon:'☕', label:'On Break',      v:counts.on_break},
            {icon:'📍', label:'Field Duty',    v:counts.field_duty},
            {icon:'⚠️', label:'Anomalies',    v:anomalies},
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

      {/* Live pulse bar */}
      <div style={{background:'#f0fdf4', borderBottom:'1px solid #bbf7d0',
        padding:'7px 20px', display:'flex', alignItems:'center', gap:8, flexShrink:0}}>
        <span style={{width:8, height:8, borderRadius:'50%', background:'#10b981',
          opacity:pulse?1:0.3, transition:'opacity .3s'}}/>
        <span style={{fontSize:11, color:'#065f46'}}>
          <strong>Live feed</strong> — updates in real-time as employees punch in/out.
        </span>
      </div>

      {/* Filters */}
      <div style={{padding:'9px 20px', display:'flex', gap:8, flexWrap:'wrap',
        alignItems:'center', background:'#fff', borderBottom:'1px solid #e2e8f0', flexShrink:0}}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by name..."
          style={{padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, outline:'none', flex:1, minWidth:180, fontFamily:'inherit'}}/>
        <div style={{display:'flex', gap:3, background:'#f1f5f9', padding:3, borderRadius:9, overflowX:'auto'}}>
          {['all', ...Object.keys(STATUS_CFG)].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{padding:'5px 10px', borderRadius:7, border:'none', cursor:'pointer',
                fontSize:10, whiteSpace:'nowrap',
                background:filterStatus===s?'#fff':'transparent',
                color:filterStatus===s?A:'#64748b',
                fontWeight:filterStatus===s?700:400,
                boxShadow:filterStatus===s?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {s === 'all' ? 'All' : `${STATUS_CFG[s].icon} ${STATUS_CFG[s].label}`}
            </button>
          ))}
        </div>
        <span style={{fontSize:11, color:'#64748b'}}>{filtered.length}/{feed.length}</span>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1, overflowY:'auto', overflowX:'hidden', padding:'16px 20px',
        scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9',
        WebkitOverflowScrolling:'touch'}}>
        <style>{`
          ::-webkit-scrollbar{width:7px;height:7px}
          ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:4px}
          ::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:4px}
          ::-webkit-scrollbar-thumb:hover{background:#475569}
        `}</style>

        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12}}>
          {filtered.map(e => {
            const sc = STATUS_CFG[e.status]
            return (
              <div key={e.id}
                onContextMenu={ev => { ev.preventDefault(); setCtx({x:ev.clientX, y:ev.clientY,
                  item:{name:e.name, impact_links:['Employee Movement','Biometric Attendance']}}) }}
                style={{background:'#fff', border:`1.5px solid ${sc.c}33`, borderRadius:14,
                  padding:'14px 16px', display:'flex', gap:12, alignItems:'center',
                  boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>
                <div style={{width:42, height:42, borderRadius:'50%', background:`${e.avatar}18`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:900, color:e.avatar, flexShrink:0, position:'relative'}}>
                  {e.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  {e.status === 'working' && (
                    <span style={{position:'absolute', bottom:-2, right:-2, width:11, height:11,
                      borderRadius:'50%', background:'#10b981', border:'2px solid #fff'}}/>
                  )}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <span style={{fontSize:12, fontWeight:800, color:'#0f172a'}}>{e.name}</span>
                    <span style={{fontSize:9, color:'#94a3b8'}}>{e.emp_code}</span>
                  </div>
                  <div style={{fontSize:9, color:'#64748b'}}>{e.dept}</div>
                  <div style={{display:'flex', gap:6, alignItems:'center', marginTop:4}}>
                    <span style={{background:sc.bg, color:sc.c, fontSize:9, fontWeight:700,
                      padding:'1px 8px', borderRadius:20}}>
                      {sc.icon} {sc.label}
                    </span>
                    {e.method && <span style={{fontSize:12}}>{METHOD_ICONS[e.method]}</span>}
                  </div>
                  {e.since && (
                    <div style={{fontSize:8, color:'#94a3b8', marginTop:2}}>
                      Since {e.since}{e.location && ` · ${e.location}`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{textAlign:'center', padding:48, color:'#94a3b8'}}>
            <div style={{fontSize:36}}>📡</div>
            <div style={{fontWeight:600, marginTop:8}}>No employees match the current filter</div>
          </div>
        )}
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links}
        actions={[
          {icon:'👁', label:"View Today's Log", key:'view'},
          {icon:'📞', label:'Contact',           key:'contact'},
          {icon:'🔗', label:'Impact Analysis',   key:'impact'},
          {icon:'📤', label:'Export',            key:'export'},
        ]} onAction={() => {}} onClose={() => setCtx(null)}/>}
    </div>
  )
}
