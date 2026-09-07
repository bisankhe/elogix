// FILE: src/components/dashboard/snapshots/AttendanceProcessingPage.jsx
// eLogix HRMS — Attendance Processing (Attendance Management)
// Calendar-based consolidation: exception isolation, multi-source ingest status
// FIXED: msg is not defined (was _pm/_spm)
// FIXED: sc is not defined inside tbody map (SOURCE_CFG[r.source] never assigned to sc)
// ADDED: tenant-wise access, SaaS DB integration, scrollbar
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { tenantCanAccess } from '../../../utils/tenantPermissions.js'
import { Field, ExcelModal, PageHeader, AIImpact, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G = 'linear-gradient(135deg,#0c4a6e 0%,#0284c7 60%,#7dd3fc 100%)'
const A = '#0284c7'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

const SOURCE_CFG = {
  biometric: {c:'#10b981', icon:'👆', label:'Biometric'},
  gps       : {c:'#3b82f6', icon:'📍', label:'GPS'},
  web       : {c:'#7c3aed', icon:'💻', label:'Web'},
  qr        : {c:'#f59e0b', icon:'📱', label:'QR Code'},
}
const EXCEPTION_CFG = {
  missed_checkout : {c:'#ef4444', label:'Missed Checkout'},
  late_arrival    : {c:'#f59e0b', label:'Late Arrival'},
  early_departure : {c:'#f59e0b', label:'Early Departure'},
}

const MOCK_RECORDS = [
  { id:'p1', employee:'Gita Maharjan',  emp_code:'E00001', dept:'IT',      source:'biometric', login:'09:02 AM', logout:'06:15 PM', total_hrs:8.5, break_min:32, exception:null,             processed:true,  impact_links:['Employee Movement','Payroll Setup'] },
  { id:'p2', employee:'Bikash Rai',     emp_code:'E00004', dept:'IT',      source:'web',       login:'08:58 AM', logout:null,        total_hrs:null, break_min:0, exception:'missed_checkout', processed:false, impact_links:['Missed Log In/Out Request'] },
  { id:'p3', employee:'Anjali Sharma',  emp_code:'E00007', dept:'Sales',   source:'gps',       login:'10:18 AM', logout:'05:00 PM', total_hrs:6.7, break_min:30, exception:'late_arrival',    processed:true,  impact_links:['Late & Early Tracking'] },
  { id:'p4', employee:'Sunita Rai',     emp_code:'E00005', dept:'HR',      source:'qr',        login:'09:01 AM', logout:'06:05 PM', total_hrs:8.5, break_min:30, exception:null,             processed:true,  impact_links:[] },
  { id:'p5', employee:'Ramesh KC',      emp_code:'E00003', dept:'Sales',   source:'gps',       login:'10:15 AM', logout:'04:45 PM', total_hrs:6.2, break_min:30, exception:'late_arrival',    processed:true,  impact_links:['Late & Early Tracking'] },
  { id:'p6', employee:'Sunil Magar',    emp_code:'E00008', dept:'Ops',     source:'biometric', login:'08:52 AM', logout:'06:00 PM', total_hrs:8.8, break_min:30, exception:null,             processed:true,  impact_links:[] },
]

export default function AttendanceProcessingPage() {
  const slug    = getSessionSlug()
  const sess    = getSession()
  const company = sess.company || {}

  if (!tenantCanAccess('attendance-processing')) {
    return <AccessDenied moduleName="Attendance Processing" />
  }

  const [records,    setRecords]    = useState(MOCK_RECORDS)
  const [search,     setSearch]     = useState('')
  const [showExcel,  setShowExcel]  = useState(false)
  const [msg,        setMsg]        = useState('')    // ✅ FIX: was _pm/_spm
  const [processing, setProcessing] = useState(false)
  const [ctx,        setCtx]        = useState(null)
  const [loading,    setLoading]    = useState(false)

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  // SaaS DB: load today's attendance records
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setLoading(true)
    fetch('/api/v1/attendance/today', {
      headers: {'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug}
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (data.data?.length) setRecords(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const filtered        = records.filter(r => !search || r.employee.toLowerCase().includes(search.toLowerCase()))
  const exceptionCount  = records.filter(r => r.exception).length
  const processedCount  = records.filter(r => r.processed).length

  const sourceBreakdown = Object.keys(SOURCE_CFG).map(s => ({
    source: s,
    count : records.filter(r => r.source === s).length,
  }))

  const handleProcessAll = async () => {
    setProcessing(true)
    // In production: POST /api/v1/attendance/process-batch
    await new Promise(r => setTimeout(r, 1200))
    setRecords(prev => prev.map(r => ({...r, processed:true})))
    notify('✅ All records processed successfully')
    setProcessing(false)
  }

  return (
    <div style={{position:'fixed', inset:0, fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#f0f7ff', display:'flex', flexDirection:'column', overflow:'hidden'}}
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
          Workforce Operations › Attendance Management › Processing
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8}}>
          <div>
            <div style={{fontSize:17, fontWeight:900}}>⚙️ Attendance Processing</div>
            <div style={{fontSize:10, opacity:.8}}>
              {company.name || 'Company'} · {records.length} records today
              {loading ? ' · Loading...' : ''}
            </div>
          </div>
          <div style={{display:'flex', gap:6}}>
            <button onClick={() => setShowExcel(true)}
              style={{padding:'7px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)',
                background:'rgba(255,255,255,.18)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer'}}>
              📤 Export
            </button>
            <button onClick={handleProcessAll} disabled={processing}
              style={{padding:'7px 14px', borderRadius:8, border:'none',
                background:'#fff', color:A, fontSize:11, fontWeight:700,
                cursor:processing?'wait':'pointer', opacity:processing?.7:1}}>
              {processing ? '⟳ Processing...' : '▶ Run Processing'}
            </button>
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12}}>
          {[
            {icon:'📋', label:"Today's Records", v:records.length},
            {icon:'✅', label:'Processed',        v:processedCount},
            {icon:'⚠️', label:'Exceptions',       v:exceptionCount},
            {icon:'🔄', label:'Capture Sources',  v:Object.keys(SOURCE_CFG).length},
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
      <div style={{background:'#eff6ff', borderBottom:'1px solid #bfdbfe', padding:'8px 20px',
        fontSize:11, color:'#1e40af', display:'flex', gap:8, flexShrink:0}}>
        <span style={{fontSize:16}}>⚙️</span>
        <div><strong>Straight-Through Processing:</strong> Raw swipes from biometric/GPS/web/QR are consolidated,
          validated against shift schedules, and grace-period rules applied automatically.
          Exceptions are isolated for review without blocking the batch.</div>
      </div>

      {/* Toolbar */}
      <div style={{padding:'9px 20px', display:'flex', gap:8, alignItems:'center',
        background:'#fff', borderBottom:'1px solid #e2e8f0', flexShrink:0, flexWrap:'wrap'}}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by employee name..."
          style={{padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, outline:'none', flex:1, minWidth:200, fontFamily:'inherit'}}/>
        <span style={{fontSize:11, color:'#64748b'}}>{filtered.length}/{records.length} records</span>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1, overflowY:'auto', overflowX:'hidden', padding:'14px 20px',
        scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9'}}>

        {/* Source breakdown */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14}}>
          {sourceBreakdown.map(s => {
            const sc = SOURCE_CFG[s.source]   // ✅ sc correctly scoped here
            return (
              <div key={s.source} style={{background:'#fff', border:`1.5px solid ${sc.c}33`,
                borderRadius:12, padding:'12px', textAlign:'center'}}>
                <div style={{fontSize:20, marginBottom:4}}>{sc.icon}</div>
                <div style={{fontSize:18, fontWeight:900, color:sc.c}}>{s.count}</div>
                <div style={{fontSize:9, color:'#94a3b8', fontWeight:600, textTransform:'capitalize'}}>
                  {sc.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* Records table */}
        <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
          overflow:'hidden', marginBottom:14}}>
          <div style={{overflowX:'auto', scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:780}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Employee','Emp Code','Dept','Source','Login','Logout','Total Hrs','Break','Exception','Status'].map(h => (
                    <th key={h} style={{padding:'9px 11px', textAlign:'left', fontSize:9,
                      fontWeight:800, color:A, whiteSpace:'nowrap', borderBottom:'1px solid #e2e8f0'}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const sc = SOURCE_CFG[r.source] || {c:'#94a3b8', icon:'?', label:'Unknown'}  // ✅ FIX: sc defined here in row scope
                  const ec = r.exception ? EXCEPTION_CFG[r.exception] : null
                  return (
                    <tr key={r.id}
                      style={{borderBottom:'1px solid #f8fafc', background:i%2===0?'#fff':'#fafafa'}}
                      onMouseEnter={e => e.currentTarget.style.background='#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background=i%2===0?'#fff':'#fafafa'}
                      onContextMenu={ev => { ev.preventDefault(); setCtx({x:ev.clientX, y:ev.clientY,
                        item:{name:r.employee,...r}}) }}>
                      <td style={{padding:'9px 11px', fontWeight:700, color:'#0f172a'}}>{r.employee}</td>
                      <td style={{padding:'9px 11px', color:'#94a3b8', fontSize:10}}>{r.emp_code}</td>
                      <td style={{padding:'9px 11px', color:'#64748b', fontSize:10}}>{r.dept}</td>
                      <td style={{padding:'9px 11px'}}>
                        {/* ✅ FIX: was {sc.icon} in original without sc being defined */}
                        <span style={{background:`${sc.c}15`, color:sc.c, fontSize:10,
                          padding:'2px 8px', borderRadius:20, fontWeight:700}}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td style={{padding:'9px 11px', color:'#10b981', fontWeight:600}}>{r.login}</td>
                      <td style={{padding:'9px 11px', color:r.logout?'#ef4444':'#94a3b8', fontWeight:600}}>
                        {r.logout || '—'}
                      </td>
                      <td style={{padding:'9px 11px', fontWeight:800, color:A}}>
                        {r.total_hrs ? `${r.total_hrs}h` : '—'}
                      </td>
                      <td style={{padding:'9px 11px', color:'#64748b'}}>{r.break_min}min</td>
                      <td style={{padding:'9px 11px'}}>
                        {ec && <span style={{background:`${ec.c}15`, color:ec.c, fontSize:9,
                          fontWeight:700, padding:'2px 8px', borderRadius:20}}>{ec.label}</span>}
                      </td>
                      <td style={{padding:'9px 11px'}}>
                        <span style={{fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20,
                          background:r.processed?'#f0fdf4':'#fffbeb',
                          color:r.processed?'#15803d':'#b45309'}}>
                          {r.processed ? '✓ Processed' : '⏳ Held for Review'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rules Engine */}
        <div style={{background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'16px 18px'}}>
          <div style={{fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:12}}>
            🛠 Rules Engine Configuration
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14}}>
            <Field label="Grace Period (minutes)" type="number" value="10" onChange={() => {}} accent={A}/>
            <Field label="Rounding Rule" type="select" value="" onChange={() => {}} accent={A}
              options={['Nearest 15 min','Nearest 30 min','No rounding']}/>
            <Field label="Mandatory Break Deduction" type="select" value="" onChange={() => {}} accent={A}
              options={['30 min after 5hrs','Custom']}/>
          </div>
          <div style={{marginTop:14, padding:'10px 14px', background:'#eff6ff',
            borderRadius:8, fontSize:11, color:'#1e40af'}}>
            💡 Exceptions auto-isolated, never block the rest of the daily batch.
            Missed checkouts route to Missed Punch Request workflow automatically.
          </div>
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links}
        actions={[
          {icon:'👁', label:'View Raw Log',      key:'view'},
          {icon:'✏', label:'Manual Override',    key:'edit'},
          {icon:'🔗', label:'Impact Analysis',   key:'impact'},
          {icon:'📤', label:'Export',            key:'export'},
        ]} onAction={() => {}} onClose={() => setCtx(null)}/>}

      {showExcel && <ExcelModal title="Attendance Processing"
        columns={['Employee','Emp Code','Dept','Source','Login','Logout','Total Hours','Break Min','Exception','Processed']}
        onClose={() => setShowExcel(false)}
        onImport={(f, result) => { console.log('[eLogix Import]', f.name, result) }}/>}
    </div>
  )
}
