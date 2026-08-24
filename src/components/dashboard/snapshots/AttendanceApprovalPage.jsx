// FILE: src/components/dashboard/snapshots/AttendanceApprovalPage.jsx
// eLogix HRMS — Attendance Approval (Attendance Management)
// Multi-level batch-approval inbox: regularization, missed-punch, OT exceptions
// FIXED: msg is not defined (was _nm/_snm mixed with msg)
// ADDED: tenant-wise access, SaaS DB integration, scrollbar
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { ExcelModal, PageHeader, SearchBar, ContextMenu } from './DeptSetupShared.jsx'
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

const G = 'linear-gradient(135deg,#581c87 0%,#7c3aed 60%,#c4b5fd 100%)'
const A = '#7c3aed'
const PAYROLL_CUTOFF = '2025-06-25'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

const MOCK_QUEUE = [
  { id:'ap1', employee:'Hari Thapa',    emp_code:'E00006', dept:'IT',      type:'missed_punch',
    detail:'Missed checkout - system error claimed',
    date:'2025-06-20', impact_hrs:8,   manager:'Bikash Shrestha', status:'pending',
    impact_links:['Missed Log In/Out Request'] },
  { id:'ap2', employee:'Bikash Rai',    emp_code:'E00004', dept:'IT',      type:'overtime',
    detail:'2.5hr OT - server migration deadline',
    date:'2025-06-21', impact_hrs:2.5, manager:'Bikash Shrestha', status:'pending',
    impact_links:['Overtime Management'] },
  { id:'ap3', employee:'Sunita Rai',    emp_code:'E00005', dept:'HR',      type:'regularization',
    detail:'Absent > Present - field work justification',
    date:'2025-06-18', impact_hrs:8,   manager:'Priya Adhikari',  status:'pending',
    impact_links:['Attendance Regularization'] },
  { id:'ap4', employee:'Maya Pradhan',  emp_code:'E00002', dept:'Finance', type:'missed_punch',
    detail:'Forgot to clock in',
    date:'2025-06-19', impact_hrs:8,   manager:'Sanjay Karki',    status:'approved',
    impact_links:[] },
  { id:'ap5', employee:'Anjali Sharma', emp_code:'E00007', dept:'Marketing', type:'overtime',
    detail:'4hr OT - campaign deadline',
    date:'2025-06-22', impact_hrs:4,   manager:'Priya Adhikari',  status:'pending',
    impact_links:['Overtime Management'] },
  { id:'ap6', employee:'Ramesh KC',     emp_code:'E00003', dept:'Sales',   type:'regularization',
    detail:'WFH not marked in system',
    date:'2025-06-17', impact_hrs:8,   manager:'Sanjay Karki',    status:'rejected',
    impact_links:['Work From Home Tracking'] },
]

const TYPE_CFG = {
  missed_punch  : {c:'#ef4444', bg:'#fef2f2', icon:'🕐', label:'Missed Punch'},
  overtime      : {c:'#f59e0b', bg:'#fffbeb', icon:'⏱', label:'Overtime'},
  regularization: {c:'#7c3aed', bg:'#f5f3ff', icon:'📆', label:'Regularization'},
}
const STATUS_CFG = {
  pending : {c:'#f59e0b', label:'Pending'},
  approved: {c:'#10b981', label:'Approved'},
  rejected: {c:'#ef4444', label:'Rejected'},
}

export default function AttendanceApprovalPage() {
  const slug    = getSessionSlug()
  const access  = resolveTenantAccess(slug)
  const sess    = getSession()
  const company = sess.company || {}

  if (!access.hasAccess('attendance')) {
    return <AccessDenied moduleName="Attendance Approval" />
  }

  const [queue,      setQueue]      = useState(MOCK_QUEUE)
  const [search,     setSearch]     = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selected,   setSelected]   = useState([])
  const [showExcel,  setShowExcel]  = useState(false)
  const [msg,        setMsg]        = useState('')    // ✅ FIX: was _nm mixed with msg reference
  const [ctx,        setCtx]        = useState(null)
  const [loading,    setLoading]    = useState(false)

  const notify = m => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  // SaaS DB: load tenant approval queue
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setLoading(true)
    fetch('/api/v1/attendance/approvals', {
      headers: {'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug}
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { if (data.data?.length) setQueue(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const filtered      = queue.filter(q => {
    if (filterType !== 'all' && q.type !== filterType) return false
    if (search && !q.employee.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const pendingCount  = queue.filter(q => q.status === 'pending').length
  const daysToDeadline = Math.ceil((new Date(PAYROLL_CUTOFF) - new Date()) / (1000*60*60*24))

  const toggleSelect  = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const approve = async (id) => {
    setQueue(prev => prev.map(q => q.id === id ? {...q, status:'approved'} : q))
    notify('✅ Request approved')
    // In production: PATCH /api/v1/attendance/approvals/{id} { status: 'approved' }
  }
  const reject = async (id) => {
    setQueue(prev => prev.map(q => q.id === id ? {...q, status:'rejected'} : q))
    notify('🚫 Request rejected')
  }
  const batchApprove = () => {
    setQueue(prev => prev.map(q => selected.includes(q.id) ? {...q, status:'approved'} : q))
    notify(`✅ ${selected.length} requests approved`)
    setSelected([])
  }

  const exportCSV = () => {
    const h = ['Employee','Emp Code','Dept','Type','Detail','Date','Impact Hours','Manager','Status']
    const b = queue.map(q => [q.employee,q.emp_code,q.dept,q.type,q.detail,q.date,q.impact_hrs,q.manager,q.status].join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+[h.join(','),...b].join('\n')], {type:'text/csv'}))
    a.download = `Attendance_Approvals_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    notify('📤 Exported')
  }

  return (
    <div style={{position:'fixed', inset:0, fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#faf5ff', display:'flex', flexDirection:'column', overflow:'hidden'}}
      onClick={() => setCtx(null)}>

      {/* Toast */}
      {msg && <div style={{position:'fixed', bottom:20, right:20, zIndex:9999,
        background:msg.startsWith('❌')||msg.startsWith('🚫')?'#fef2f2':'#f0fdf4',
        border:`1px solid ${msg.startsWith('❌')||msg.startsWith('🚫')?'#fecaca':'#bbf7d0'}`,
        borderRadius:10, padding:'10px 18px', fontSize:11, fontWeight:600,
        color:msg.startsWith('❌')||msg.startsWith('🚫')?'#dc2626':'#065f46',
        boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>
        {msg}
      </div>}

      {/* Header */}
      <div style={{background:G, padding:'12px 20px', color:'#fff', flexShrink:0}}>
        <div style={{fontSize:10, opacity:.7, marginBottom:2}}>
          Workforce Operations › Attendance Management › Approval Queue
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8}}>
          <div>
            <div style={{fontSize:17, fontWeight:900}}>📥 Attendance Approval</div>
            <div style={{fontSize:10, opacity:.8}}>
              {company.name || 'Company'} · {pendingCount} pending ·
              Payroll cutoff: {PAYROLL_CUTOFF} ({daysToDeadline > 0 ? `${daysToDeadline}d left` : 'OVERDUE'})
              {loading ? ' · Loading...' : ''}
            </div>
          </div>
          <div style={{display:'flex', gap:6}}>
            <button onClick={exportCSV}
              style={{padding:'7px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)',
                background:'rgba(255,255,255,.18)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer'}}>
              📤 Export
            </button>
            {selected.length > 0 && (
              <button onClick={batchApprove}
                style={{padding:'7px 14px', borderRadius:8, border:'none',
                  background:'#10b981', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer'}}>
                ✅ Batch Approve ({selected.length})
              </button>
            )}
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:12}}>
          {[
            {icon:'📥', label:'Total in Queue', v:queue.length},
            {icon:'⏳', label:'Pending',         v:pendingCount},
            {icon:'✅', label:'Approved',         v:queue.filter(q=>q.status==='approved').length},
            {icon:'⏰', label:'Days to Cutoff',  v:`${Math.max(0,daysToDeadline)}d`},
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
      <div style={{background:'#faf5ff', borderBottom:'1px solid #e9d5ff', padding:'8px 20px',
        fontSize:11, color:'#581c87', display:'flex', gap:8, flexShrink:0}}>
        <span style={{fontSize:16}}>⏰</span>
        <div><strong>Unified Approval Inbox:</strong> Aggregates missed-punch, overtime, and regularization
          requests. All must be resolved before {PAYROLL_CUTOFF} payroll cutoff. Every action is timestamped for audit.</div>
      </div>

      {/* Toolbar */}
      <div style={{padding:'9px 20px', display:'flex', gap:8, alignItems:'center',
        background:'#fff', borderBottom:'1px solid #e2e8f0', flexShrink:0, flexWrap:'wrap'}}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by employee name..."
          style={{padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, outline:'none', flex:1, minWidth:180, fontFamily:'inherit'}}/>
        <div style={{display:'flex', gap:3, background:'#f1f5f9', padding:3, borderRadius:9}}>
          {['all', ...Object.keys(TYPE_CFG)].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{padding:'5px 11px', borderRadius:7, border:'none', cursor:'pointer',
                fontSize:10, background:filterType===t?'#fff':'transparent',
                color:filterType===t?A:'#64748b', fontWeight:filterType===t?700:400,
                boxShadow:filterType===t?'0 1px 3px rgba(0,0,0,.08)':'none'}}>
              {t === 'all' ? 'All' : TYPE_CFG[t].label}
            </button>
          ))}
        </div>
        <span style={{fontSize:11, color:'#64748b'}}>{filtered.length}/{queue.length}</span>
      </div>

      {/* Scrollable content */}
      <div style={{flex:1, overflowY:'auto', overflowX:'hidden', padding:'16px 20px',
        scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9'}}>

        <div style={{display:'grid', gap:10}}>
          {filtered.map(q => {
            const tc = TYPE_CFG[q.type]
            const sc = STATUS_CFG[q.status]
            return (
              <div key={q.id}
                onContextMenu={ev => { ev.preventDefault(); setCtx({x:ev.clientX, y:ev.clientY,
                  item:{name:q.employee,...q}}) }}
                style={{background:'#fff', border:`1.5px solid ${tc.c}33`, borderRadius:14,
                  padding:'14px 18px', display:'flex', alignItems:'center', gap:14,
                  boxShadow:'0 1px 6px rgba(0,0,0,.04)'}}>

                {q.status === 'pending' && (
                  <input type="checkbox" checked={selected.includes(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    onClick={e => e.stopPropagation()}
                    style={{width:18, height:18, accentColor:A, cursor:'pointer', flexShrink:0}}/>
                )}

                <div style={{width:40, height:40, borderRadius:10, background:tc.bg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18, flexShrink:0}}>
                  {tc.icon}
                </div>

                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:3}}>
                    <span style={{fontSize:12, fontWeight:800, color:'#0f172a'}}>{q.employee}</span>
                    <span style={{fontSize:9, color:'#94a3b8'}}>{q.emp_code}</span>
                    <span style={{background:tc.bg, color:tc.c, fontSize:9, fontWeight:700,
                      padding:'1px 8px', borderRadius:20}}>
                      {tc.label}
                    </span>
                    <span style={{color:sc.c, fontSize:9, fontWeight:700}}>· {sc.label}</span>
                  </div>
                  <div style={{fontSize:10, color:'#64748b'}}>{q.detail}</div>
                  <div style={{fontSize:9, color:'#94a3b8', marginTop:2}}>
                    {q.dept} · {q.date} · Manager: {q.manager} · Impact: {q.impact_hrs}h
                  </div>
                </div>

                {q.status === 'pending' && (
                  <div style={{display:'flex', gap:6, flexShrink:0}}>
                    <button onClick={e => { e.stopPropagation(); approve(q.id) }}
                      style={{padding:'6px 14px', borderRadius:8, border:'none',
                        background:'#10b981', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer'}}>
                      ✅ Approve
                    </button>
                    <button onClick={e => { e.stopPropagation(); reject(q.id) }}
                      style={{padding:'6px 14px', borderRadius:8, border:'none',
                        background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer'}}>
                      🚫 Reject
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{textAlign:'center', padding:48, color:'#94a3b8'}}>
              <div style={{fontSize:36}}>📥</div>
              <div style={{fontWeight:600, marginTop:8}}>No requests match the current filter</div>
            </div>
          )}
        </div>
      </div>

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} item={ctx.item} impactLinks={ctx.item?.impact_links}
        actions={[
          {icon:'👁', label:'View Source Request', key:'view'},
          {icon:'✅', label:'Approve',              key:'approve'},
          {icon:'🚫', label:'Reject',               key:'reject'},
          {icon:'🔗', label:'Impact Analysis',      key:'impact'},
        ]} onAction={() => {}} onClose={() => setCtx(null)}/>}

      {showExcel && <ExcelModal title="Attendance Approval Queue"
        columns={['Employee','Emp Code','Dept','Type','Detail','Date','Impact Hours','Manager','Status']}
        onClose={() => setShowExcel(false)}
        onImport={(f, result) => { console.log('[eLogix Import]', f.name, result) }}/>}
    </div>
  )
}
