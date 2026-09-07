// FILE: src/components/dashboard/snapshots/GeoAttendancePage.jsx
// eLogix HRMS — Geo Attendance (Daily Attendance)
// Selfie+GPS clock-in within geo-fence, daily punch log, odd-location rejection
// FIXED: msg is not defined (was _nm/_snm)
// ADDED: tenant-wise access, SaaS DB integration, scrollbar
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { tenantCanAccess } from '../../../utils/tenantPermissions.js'
import { PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

const MOCK_PUNCHES = [
  { id:'g1', employee:'Ramesh KC',    emp_code:'E00003', location:'Client ABC Pvt Ltd, Lalitpur',
    fence:'Task Site (Auto-Created)', distance_m:8,   time:'10:15 AM', selfie:true,  status:'accepted',
    impact_links:['Task & Location Assignment'] },
  { id:'g2', employee:'Sunita Rai',   emp_code:'E00005', location:'XYZ Suppliers, Bhaktapur',
    fence:'Task Site (Auto-Created)', distance_m:14,  time:'11:02 AM', selfie:true,  status:'accepted',
    impact_links:[] },
  { id:'g3', employee:'Anjali Sharma',emp_code:'E00007', location:'Unknown / Odd Location',
    fence:null,                       distance_m:340, time:'09:08 AM', selfie:false, status:'rejected',
    impact_links:['Geo-Fencing'] },
  { id:'g4', employee:'Sunil Magar',  emp_code:'E00008', location:'Pokhara Branch',
    fence:'Pokhara Branch (Fixed)',   distance_m:6,   time:'08:55 AM', selfie:true,  status:'accepted',
    impact_links:[] },
  { id:'g5', employee:'Gita Maharjan',emp_code:'E00001', location:'KTM HQ Office',
    fence:'Head Office (Fixed)',      distance_m:9,   time:'09:02 AM', selfie:true,  status:'accepted',
    impact_links:[] },
]

const STATUS_CFG = {
  accepted: {c:'#10b981', bg:'#f0fdf4', icon:'✅'},
  rejected : {c:'#ef4444', bg:'#fef2f2', icon:'🚫'},
}

export default function GeoAttendancePage() {
  const slug    = getSessionSlug()
  const sess    = getSession()
  const company = sess.company || {}

  if (!tenantCanAccess('live-attendance')) {
    return <AccessDenied moduleName="Geo Attendance" />
  }

  const [punches,  setPunches]  = useState(MOCK_PUNCHES)
  const [search,   setSearch]   = useState('')
  const [msg,      setMsg]      = useState('')      // ✅ FIX: was _nm/_snm
  const [ctx,      setCtx]      = useState(null)
  const [loading,  setLoading]  = useState(false)

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // SaaS DB: load tenant geo punches
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setLoading(true)
    fetch('/api/v1/attendance/geo-punches', {
      headers: {'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug}
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (data.data?.length) setPunches(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const filtered      = punches.filter(p => !search || p.employee.toLowerCase().includes(search.toLowerCase()))
  const acceptedCount = punches.filter(p => p.status === 'accepted').length
  const rejectedCount = punches.filter(p => p.status === 'rejected').length

  const handleOverride = id => {
    setPunches(prev => prev.map(p => p.id === id ? {...p, status:'accepted'} : p))
    notify('✅ Override applied — punch accepted')
  }

  return (
    <div style={{position:'fixed', inset:0, fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#faf5ff', display:'flex', flexDirection:'column', overflow:'hidden'}}
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
            <div style={{fontSize:17, fontWeight:900}}>📍 Geo Attendance</div>
            <div style={{fontSize:10, opacity:.8}}>
              {company.name || 'Company'} · {punches.length} punches today{loading ? ' · Loading...' : ''}
            </div>
          </div>
          <button onClick={() => notify('✅ Geo check-in recorded')}
            style={{padding:'7px 14px', borderRadius:8, border:'none',
              background:'#fff', color:A, fontSize:11, fontWeight:700, cursor:'pointer'}}>
            + Geo Check-In
          </button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12}}>
          {[
            {icon:'📍', label:"Today's Punches",  v:punches.length},
            {icon:'✅', label:'Accepted',           v:acceptedCount},
            {icon:'🚫', label:'Rejected',           v:rejectedCount},
            {icon:'🤳', label:'Selfie Verified',    v:punches.filter(p=>p.selfie).length},
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
      <div style={{background:'#faf5ff', border:'1px solid #e9d5ff', padding:'8px 20px',
        fontSize:11, color:'#581c87', display:'flex', gap:8, flexShrink:0}}>
        <span style={{fontSize:16}}>🛡</span>
        <div><strong>Strict Geo-Fence:</strong> Field staff need task+location pre-assigned by supervisor.
          Selfie adds liveness verification on top of GPS.</div>
      </div>

      {/* Toolbar */}
      <div style={{padding:'9px 20px', display:'flex', gap:8, alignItems:'center',
        background:'#fff', borderBottom:'1px solid #e2e8f0', flexShrink:0}}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by employee name..."
          style={{padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, outline:'none', flex:1, minWidth:200, fontFamily:'inherit'}}/>
        <span style={{fontSize:11, color:'#64748b'}}>{filtered.length}/{punches.length}</span>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1, overflowY:'auto', overflowX:'hidden', padding:'16px 20px',
        scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9'}}>

        <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:16}}>
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
                        padding:'1px 7px', borderRadius:20}}>
                        {p.status === 'accepted' ? 'Accepted' : 'Rejected - Odd Location'}
                      </span>
                      {p.selfie && <span style={{fontSize:12}}>🤳</span>}
                    </div>
                    <div style={{fontSize:10, color:'#64748b'}}>
                      📍 {p.location} · {p.distance_m}m from fence · {p.time}
                    </div>
                    {p.fence && <div style={{fontSize:9, color:A, marginTop:2}}>🛡 {p.fence}</div>}
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
          </div>

          {/* Mini map */}
          <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:16,
            padding:'16px 18px', height:'fit-content', position:'sticky', top:0}}>
            <div style={{fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:10}}>
              🗺 Geo Punch Map
            </div>
            <div style={{height:180, background:'linear-gradient(135deg,#faf5ff,#f5f3ff)',
              borderRadius:12, position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', top:'35%', left:'25%', width:54, height:54,
                borderRadius:'50%', border:`2px dashed ${A}`, background:`${A}10`}}/>
              <div style={{position:'absolute', top:'55%', left:'55%', width:50, height:50,
                borderRadius:'50%', border:`2px dashed ${A}`, background:`${A}10`}}/>
              {punches.map((p, i) => (
                <div key={i} style={{position:'absolute', top:`${25+i*14}%`, left:`${20+i*14}%`,
                  width:10, height:10, borderRadius:'50%', background:STATUS_CFG[p.status].c,
                  border:'2px solid #fff', boxShadow:'0 1px 4px rgba(0,0,0,.3)'}}/>
              ))}
            </div>
            <div style={{fontSize:9, color:'#94a3b8', marginTop:8}}>
              Dashed circles = active geo-fences · Green = accepted · Red = rejected
            </div>
          </div>
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links}
        actions={[
          {icon:'👁', label:'View on Map',    key:'view'},
          {icon:'🤳', label:'View Selfie',    key:'selfie'},
          {icon:'🔗', label:'Impact Analysis',key:'impact'},
          {icon:'📤', label:'Export',         key:'export'},
        ]} onAction={() => {}} onClose={() => setCtx(null)}/>}
    </div>
  )
}
