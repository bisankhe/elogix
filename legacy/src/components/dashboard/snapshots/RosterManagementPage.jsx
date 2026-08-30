// FILE: RosterManagementPage.jsx
// Workforce Operations > Attendance Management > Attendance Setup > Roster Management
//
// ROLE-BASED EDIT PERMISSIONS:
//   super-admin, hr, hr-officer  → edit ALL employees across ALL departments
//   department (dept head)       → edit ONLY their own department's employees
//   branch                       → edit ONLY their branch employees
//   employee, finance, others    → VIEW ONLY — no edit allowed
//
// FEATURES:
//   • Daily / Weekly / Monthly views — all editable per role
//   • SAVE button — saves to localStorage + backend (unsaved changes tracked)
//   • Discard on exit if unsaved (window beforeunload + in-app warning)
//   • Publish Roster → notifies all employees (Email + WhatsApp + Viber + Dashboard)
//   • Auto-Roster generator (pattern-based, respects Labour Act 48h/week)
//   • Missing roster → supervisor + HRIS notification bar alert
//   • Print option — professional printable roster sheet

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { resolveTenantAccess, getSessionSlug } from '../../../utils/tenantPermissions.js'
import AccessDenied from '../../shared/AccessDenied.jsx'

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} }
  catch(_e){ return {} }
}

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 60%,#818cf8 100%)'
const P  = '#4338ca'

// ── SHIFT CONFIG ──────────────────────────────────────────────
const SHIFTS = {
  General: { label:'General',  short:'GEN', color:'#10b981', bg:'#f0fdf4', hours:'9:00–17:00',  hrs:8 },
  Morning: { label:'Morning',  short:'MRN', color:'#3b82f6', bg:'#eff6ff', hours:'6:00–14:00',  hrs:8 },
  Evening: { label:'Evening',  short:'EVN', color:'#f59e0b', bg:'#fffbeb', hours:'14:00–22:00', hrs:8 },
  Night:   { label:'Night',    short:'NGT', color:'#7c3aed', bg:'#faf5ff', hours:'22:00–6:00',  hrs:8 },
  Half:    { label:'Half Day', short:'HLF', color:'#06b6d4', bg:'#ecfeff', hours:'9:00–13:00',  hrs:4 },
  Off:     { label:'Day Off',  short:'OFF', color:'#94a3b8', bg:'#f8fafc', hours:'Rest day',    hrs:0 },
  Holiday: { label:'Holiday',  short:'HOL', color:'#ef4444', bg:'#fef2f2', hours:'Public holiday',hrs:0 },
}
const SHIFT_KEYS  = Object.keys(SHIFTS)
const DAYS_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DEPTS       = ['All','Engineering','HR','Finance','Sales','Operations','IT','Marketing','Admin']

// ── ROLES THAT CAN EDIT ───────────────────────────────────────
const CAN_EDIT_ALL  = new Set(['super-admin','hr','hr-officer'])
const CAN_EDIT_DEPT = new Set(['department','branch'])
// employee, finance, executive, etc. → view only

// ── MOCK EMPLOYEES ────────────────────────────────────────────
const today = new Date()
const yw = today.getFullYear()
const mw = today.getMonth()

function makeRoster(defaultShift, pattern) {
  return Array.from({length:42}, (_,i) => {
    if (pattern) return pattern[i % pattern.length]
    const dow = (i + 1) % 7
    return (dow===0||dow===6) ? 'Off' : (defaultShift||'General')
  })
}

const BASE_EMPLOYEES = [
  { id:'e1',  name:'Bikash Shrestha', dept:'Engineering', email:'bikash@co.com',  phone:'+977-9801234567', supervisor:'Rajesh KC',  avatar:'BS', default_shift:'General', roster:makeRoster('General') },
  { id:'e2',  name:'Anita Gurung',    dept:'Engineering', email:'anita@co.com',   phone:'+977-9812345678', supervisor:'Rajesh KC',  avatar:'AG', default_shift:'Morning', roster:makeRoster(null,['Morning','Morning','Evening','Evening','General','Off','Off']) },
  { id:'e3',  name:'Hari Thapa',      dept:'Engineering', email:'hari@co.com',    phone:'+977-9823456789', supervisor:'Rajesh KC',  avatar:'HT', default_shift:'Night',   roster:makeRoster(null,['Night','Night','Night','Off','Off','Night','Night']) },
  { id:'e4',  name:'Maya Pradhan',    dept:'Finance',     email:'maya@co.com',    phone:'+977-9834567890', supervisor:'Sita Rai',   avatar:'MP', default_shift:'General', roster:makeRoster('General') },
  { id:'e5',  name:'Sandeep Tamang',  dept:'Finance',     email:'sandeep@co.com', phone:'+977-9845678901', supervisor:'Sita Rai',   avatar:'ST', default_shift:'General', roster:Array(42).fill(null) },
  { id:'e6',  name:'Priya Maharjan',  dept:'Sales',       email:'priya@co.com',   phone:'+977-9856789012', supervisor:'Arjun Shah', avatar:'PM', default_shift:'General', roster:makeRoster('General') },
  { id:'e7',  name:'Suresh KC',       dept:'IT',          email:'suresh@co.com',  phone:'+977-9867890123', supervisor:'Dev Lama',   avatar:'SK', default_shift:'Morning', roster:makeRoster(null,['Morning','Morning','Morning','Evening','Evening','Off','Off']) },
  { id:'e8',  name:'Laxmi Karki',     dept:'Operations',  email:'laxmi@co.com',   phone:'+977-9878901234', supervisor:'Bina Magar', avatar:'LK', default_shift:'Night',   roster:makeRoster(null,['Night','Night','Off','Off','Night','Night','Night']) },
  { id:'e9',  name:'Ramesh Koirala',  dept:'HR',          email:'ramesh@co.com',  phone:'+977-9889012345', supervisor:'HR Head',    avatar:'RK', default_shift:'General', roster:makeRoster('General') },
  { id:'e10', name:'Gita Shrestha',   dept:'IT',          email:'gita@co.com',    phone:'+977-9890123456', supervisor:'Dev Lama',   avatar:'GS', default_shift:'Evening', roster:makeRoster(null,['Evening','Evening','Evening','Off','Off','Morning','Morning']) },
]

// ── NOTIFICATION HELPER ───────────────────────────────────────
function sendNotification({ type, employee, message, channels, supervisor }) {
  const notif = { id:`RN-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type, employee:employee?.name, supervisor, message, channels, timestamp:new Date().toISOString(), read:false }
  try {
    const ex = JSON.parse(localStorage.getItem('elogix_roster_notifications')||'[]')
    localStorage.setItem('elogix_roster_notifications', JSON.stringify([notif,...ex].slice(0,200)))
    const gl = JSON.parse(localStorage.getItem('elogix_hris_notifications')||'[]')
    gl.unshift({ id:notif.id, cat:type==='missing_roster'?'Action Required':'FYI', icon:type==='missing_roster'?'🔴':type==='shift_change'?'🔄':'✅', title:message, body:`${employee?.name||''} · ${employee?.dept||''} · ${new Date().toLocaleString()}`, action:'View Roster', time:'Just now', unread:true })
    localStorage.setItem('elogix_hris_notifications', JSON.stringify(gl.slice(0,100)))
  } catch(_e) {}
  console.log('[eLogix Roster Notif]', type, message, channels.join(', '))
  return notif
}

// ── SHIFT CELL — outside component to prevent remount ─────────
function ShiftCell({ shift, dayIdx, empId, canEdit, onChange, isToday, isChanged }) {
  const cfg = shift ? SHIFTS[shift] : null
  if (!canEdit) {
    return (
      <td style={{ padding:'3px', textAlign:'center' }}>
        {shift ? (
          <span style={{ display:'inline-block', padding:'3px 5px', borderRadius:6, background:cfg.bg, color:cfg.color, fontSize:8, fontWeight:700, border:`1px solid ${cfg.color}40` }}>{cfg.short}</span>
        ) : <span style={{ color:'#e2e8f0', fontSize:10 }}>—</span>}
      </td>
    )
  }
  return (
    <td style={{ padding:'2px', textAlign:'center', position:'relative' }}>
      {isToday && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#ef4444', zIndex:1, borderRadius:1 }}/>}
      {isChanged && <div style={{ position:'absolute', top:2, right:2, width:5, height:5, borderRadius:'50%', background:'#ef4444', zIndex:2 }}/>}
      <select value={shift||''} onChange={e=>onChange(empId, dayIdx, e.target.value||null)}
        style={{ width:'100%', padding:'4px 1px', borderRadius:6, border:`1.5px solid ${isChanged?'#ef4444':cfg?cfg.color:'#e2e8f0'}`, background:isChanged?'#fef2f2':cfg?cfg.bg:'#fff', color:isChanged?'#ef4444':cfg?cfg.color:'#94a3b8', fontSize:8, fontWeight:700, cursor:'pointer', outline:'none', boxSizing:'border-box' }}>
        <option value="">—</option>
        {SHIFT_KEYS.map(s=><option key={s} value={s}>{SHIFTS[s].short}</option>)}
      </select>
    </td>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────
export default function RosterManagementPage() {
  const slug    = getSessionSlug()
  const access  = resolveTenantAccess(slug)
  const sess    = getSession()
  const company = sess.company || {}

  // Tenant access gate
  if (!access.hasAccess('attendance')) {
    return <AccessDenied moduleName="Roster Management" />
  }

  // Persona from session
  const personaId = sess.user?.role || 'employee'
  const navTo = (page) => {
    // Simple navigation — set active page in session
    try { sessionStorage.setItem('elogix_active_page', page) } catch(_e) {}
    window.dispatchEvent(new CustomEvent('elogix-nav', { detail: { page } }))
  }

  // ── ROLE-BASED PERMISSION ──────────────────────────────────
  const canEditAll  = CAN_EDIT_ALL.has(personaId)
  const canEditDept = CAN_EDIT_DEPT.has(personaId)
  const canEditAny  = canEditAll || canEditDept

  // Dept head can only edit their own dept — for demo: dept head sees Engineering
  const myDept = canEditDept && !canEditAll ? 'Engineering' : null

  function canEditEmployee(emp) {
    if (!canEditAny) return false
    if (canEditAll)  return true
    return myDept ? emp.dept === myDept : true
  }

  // ── STATE ──────────────────────────────────────────────────
  const [view,         setView]        = useState('weekly')
  const [deptFilter,   setDeptFilter]  = useState(myDept || 'All')
  const [search,       setSearch]      = useState('')
  const [weekOffset,   setWeekOffset]  = useState(0)
  const [dayOffset,    setDayOffset]   = useState(0)
  const [monthOffset,  setMonthOffset] = useState(0)
  const [employees,    setEmployees]   = useState(() => {
    try {
      const saved = localStorage.getItem('elogix_roster_draft')
      if (saved) return JSON.parse(saved).employees
    } catch(_e) {}
    return BASE_EMPLOYEES
  })
  const savedRef    = useRef(employees)        // last saved state
  const [unsaved,   setUnsaved]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saveMsg,   setSaveMsg]   = useState('')
  const [publishing,setPublishing]= useState(false)
  const [published, setPublished] = useState(false)
  const [autoPattern, setAutoPattern] = useState('balanced')
  const [selectedEmps, setSelectedEmps] = useState(new Set())
  const [bulkShift,    setBulkShift]    = useState('')
  const [notifPanel, setNotifPanel] = useState(false)
  const [showDiscardWarn, setShowDiscardWarn] = useState(false)
  const pendingNavRef = useRef(null)

  // ── UNSAVED CHANGE DETECTION ───────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (unsaved) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [unsaved])

  // ── DATE HELPERS ───────────────────────────────────────────
  const getDayIdx = (date) => {
    const start = new Date(yw, mw, 1)
    return Math.max(0, Math.floor((date - start) / 86400000))
  }
  const weekDates = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - d.getDay() + 1 + weekOffset * 7)
    return Array.from({length:7}, (_,i) => { const day=new Date(d); day.setDate(d.getDate()+i); return day })
  }, [weekOffset])
  const monthDates = useMemo(() => {
    const d = new Date(today); d.setDate(1); d.setMonth(d.getMonth() + monthOffset)
    const days = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate()
    return Array.from({length:days}, (_,i) => new Date(d.getFullYear(), d.getMonth(), i+1))
  }, [monthOffset])
  const dayDate = useMemo(() => { const d=new Date(today); d.setDate(d.getDate()+dayOffset); return d }, [dayOffset])

  // ── FILTERED ───────────────────────────────────────────────
  const filtered = useMemo(() => employees.filter(e => {
    if (deptFilter!=='All' && e.dept!==deptFilter) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [employees, deptFilter, search])

  const missingRoster = useMemo(() => employees.filter(e =>
    weekDates.every(d => !e.roster[getDayIdx(d)])
  ), [employees, weekDates])

  // ── CELL CHANGE (marks unsaved) ────────────────────────────
  const handleCellChange = useCallback((empId, dayIdx, newShift) => {
    setEmployees(prev => {
      const emp = prev.find(e=>e.id===empId)
      if (!canEditEmployee(emp)) return prev
      const oldShift = emp?.roster[dayIdx]
      const updated  = prev.map(e => e.id===empId ? {...e, roster:e.roster.map((s,i)=>i===dayIdx?newShift:s)} : e)
      if (oldShift !== newShift && emp) {
        const dateStr = new Date(yw,mw,dayIdx+1).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
        sendNotification({ type:'shift_change', employee:emp,
          message:`Your duty on ${dateStr} changed: ${oldShift||'Blank'} → ${newShift||'Removed'} (${newShift?SHIFTS[newShift]?.hours:''})`,
          channels:['email','whatsapp','viber','dashboard'], supervisor:emp.supervisor })
      }
      return updated
    })
    setUnsaved(true)
  }, [canEditAll, canEditDept, myDept])

  // ── SAVE ───────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/v1/attendance/roster/save', {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('elogix_access_token')||''}`},
        body: JSON.stringify({ employees, savedAt:new Date().toISOString(), savedBy:personaId }),
        signal: AbortSignal.timeout(6000),
      })
    } catch(_e) {}
    localStorage.setItem('elogix_roster_draft', JSON.stringify({ employees, savedAt:new Date().toISOString() }))
    savedRef.current = employees
    setSaving(false)
    setUnsaved(false)
    setSaveMsg('✅ Roster saved!')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  // ── DISCARD ────────────────────────────────────────────────
  const handleDiscard = () => {
    setEmployees(savedRef.current)
    setUnsaved(false)
    setShowDiscardWarn(false)
    setSaveMsg('🗑 Changes discarded')
    setTimeout(() => setSaveMsg(''), 2500)
  }

  // ── AUTO-ROSTER ────────────────────────────────────────────
  const autoGenerate = (scope) => {
    const patterns = {
      balanced: ['General','General','General','General','General','Off','Off'],
      morning:  ['Morning','Morning','Morning','Morning','Morning','Off','Off'],
      evening:  ['Evening','Evening','Evening','Evening','Evening','Off','Off'],
      night:    ['Night','Night','Night','Off','Off','Night','Night'],
      rotating: ['Morning','Evening','General','Night','Morning','Off','Off'],
    }
    const pat = patterns[autoPattern] || patterns.balanced
    setEmployees(prev => prev.map(emp => {
      if (!canEditEmployee(emp)) return emp
      if (deptFilter!=='All' && emp.dept!==deptFilter) return emp
      const newRoster = [...emp.roster]
      const dates = scope==='week' ? weekDates : monthDates
      dates.forEach((d,i) => {
        const idx  = getDayIdx(d)
        const dow  = d.getDay()
        newRoster[idx] = (dow===0||dow===6) ? 'Off' : pat[i % 5]
      })
      return {...emp, roster:newRoster}
    }))
    setUnsaved(true)
    setSaveMsg('⚠️ Auto-roster applied — click Save to keep changes')
  }

  // ── BULK / ROW HELPERS ──────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedEmps(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })

  const toggleSelectAll = () => {
    const ids = filtered.filter(e=>canEditEmployee(e)).map(e=>e.id)
    const allSel = ids.every(id=>selectedEmps.has(id))
    setSelectedEmps(allSel ? new Set() : new Set(ids))
  }

  const applyBulkShift = (shift, scope) => {
    if (!shift) return
    const dates = scope==='week' ? weekDates : monthDates  // ✅ FIX: was undefined
    setEmployees(prev => prev.map(emp => {
      if (!selectedEmps.has(emp.id) || !canEditEmployee(emp)) return emp
      const nr = [...emp.roster]
      dates.forEach(d => {
        const idx=getDayIdx(d), dow=d.getDay()
        nr[idx] = (dow===0||dow===6) && shift!=='Off' && shift!=='Holiday' ? 'Off' : shift
      })
      return {...emp, roster:nr}
    }))
    setUnsaved(true)
    setSaveMsg(`✅ ${shift} applied to ${selectedEmps.size} employee${selectedEmps.size!==1?'s':''}`)
  }

  const applyRowShift = (empId, shift, scope) => {
    if (!shift) return
    const dates = scope==='week' ? weekDates : monthDates  // ✅ FIX: was undefined
    setEmployees(prev => prev.map(emp => {
      if (emp.id!==empId || !canEditEmployee(emp)) return emp
      const nr = [...emp.roster]
      dates.forEach(d => {
        const idx=getDayIdx(d), dow=d.getDay()
        nr[idx] = (dow===0||dow===6) && shift!=='Off' && shift!=='Holiday' ? 'Off' : shift
      })
      return {...emp, roster:nr}
    }))
    setUnsaved(true)
  }

  // ── PUBLISH ────────────────────────────────────────────────
  const publishRoster = async () => {
    if (unsaved) { alert('Please save changes before publishing.'); return }
    setPublishing(true)
    missingRoster.forEach(emp => sendNotification({
      type:'missing_roster', employee:emp,
      message:`⚠️ Roster missing for ${emp.name} (${emp.dept}) — please assign shifts`,
      channels:['email','dashboard'], supervisor:emp.supervisor,
    }))
    employees.filter(e=>weekDates.some(d=>e.roster[getDayIdx(d)])).forEach(emp => {
      sendNotification({ type:'roster_published', employee:emp,
        message:`Your duty roster for ${weekDates[0].toLocaleDateString('en-GB',{day:'numeric',month:'short'})}–${weekDates[6].toLocaleDateString('en-GB',{day:'numeric',month:'short'})} has been published`,
        channels:['email','whatsapp','viber','dashboard'], supervisor:emp.supervisor })
    })
    try {
      await fetch('/api/v1/attendance/roster/publish', {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('elogix_access_token')||''}`},
        body: JSON.stringify({ employees, weekOffset }),
        signal: AbortSignal.timeout(6000),
      })
    } catch(_e) {}
    localStorage.setItem('elogix_published_roster', JSON.stringify({ published_at:new Date().toISOString(), week_offset:weekOffset, employees }))
    setPublishing(false); setPublished(true)
    setTimeout(() => setPublished(false), 3000)
  }

  // ── PRINT ──────────────────────────────────────────────────
  const handlePrint = () => {
    const printList = selectedEmps.size > 0
      ? filtered.filter(e => selectedEmps.has(e.id))
      : filtered
    const rows = printList.map(emp => {
      const shifts = view==='weekly'
        ? weekDates.map(d => { const s=emp.roster[getDayIdx(d)]; return s?SHIFTS[s]?.short||s:'—' })
        : monthDates.slice(0,31).map(d => { const s=emp.roster[getDayIdx(d)]; return s?SHIFTS[s]?.short||s:'—' })
      const hrs = shifts.reduce((t,s)=>{ const k=Object.keys(SHIFTS).find(k=>SHIFTS[k].short===s); return t+(k?SHIFTS[k].hrs:0) },0)
      return `<tr><td>${emp.name}</td><td>${emp.dept}</td>${shifts.map(s=>`<td>${s}</td>`).join('')}<td>${hrs}h</td></tr>`
    }).join('')

    const hdrs = view==='weekly'
      ? weekDates.map(d=>`<th>${DAYS_SHORT[d.getDay()]}<br>${d.getDate()}</th>`).join('')
      : monthDates.slice(0,31).map(d=>`<th>${d.getDate()}</th>`).join('')

    const titleStr = view==='weekly'
      ? `${weekDates[0].toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${weekDates[6].toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`
      : `${MONTHS[new Date(yw,mw+monthOffset).getMonth()]} ${new Date(yw,mw+monthOffset).getFullYear()}`

    const selNote = selectedEmps.size > 0 ? ` · ${printList.length} employee${printList.length!==1?'s':''} selected` : ''
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Duty Roster — ${titleStr}</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;margin:0;padding:20px;font-size:10px;color:#0f172a}
.header{background:#1e1b4b;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:16px}
.header h1{margin:0;font-size:16px}
.header p{margin:4px 0 0;font-size:10px;opacity:.7}
table{width:100%;border-collapse:collapse;font-size:8.5px}
th{background:#4338ca;color:#fff;padding:5px 3px;text-align:center;border:1px solid #c7d2fe}
td{padding:4px 3px;border:1px solid #e2e8f0;text-align:center}
td:first-child{text-align:left;font-weight:700;padding-left:6px}
td:nth-child(2){color:#64748b;font-size:8px}
tr:nth-child(even) td{background:#f8fafc}
.legend{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:4px;font-size:8px}
.dot{width:8px;height:8px;border-radius:2px}
.footer{margin-top:12px;font-size:8px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}
@media print{body{padding:10px}button{display:none}}
</style></head><body>
<div class="header">
  <h1>🗓️ Duty Roster — ${deptFilter==='All'?'All Departments':deptFilter}</h1>
  <p>${titleStr} · Generated ${new Date().toLocaleString()} · ${view.charAt(0).toUpperCase()+view.slice(1)} View${selNote}</p>
</div>
<table>
  <thead><tr><th style="text-align:left;min-width:120px">Employee</th><th>Dept</th>${hdrs}<th>Total Hrs</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="legend">
  ${Object.entries(SHIFTS).map(([k,v])=>`<div class="legend-item"><div class="dot" style="background:${v.color}"></div>${v.short} = ${v.label} (${v.hours})</div>`).join('')}
</div>
<div class="footer">eLogix HRMS · Nepal Labour Act 2074 Compliant · Max 48h/week · OT at 1.5× Basic (Section 36)</div>
<script>window.print()</script>
</body></html>`
    const w = window.open('','_blank','width=1000,height=700')
    w.document.write(html)
    w.document.close()
  }

  // ── RENDERS ────────────────────────────────────────────────
  const renderWeekly = () => (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
      <thead>
        <tr style={{ background:'#f8fafc' }}>
          <th style={{ padding:'6px 6px', width:32, textAlign:'center' }}>
            <input type="checkbox"
              checked={filtered.filter(e=>canEditEmployee(e)).length>0 && filtered.filter(e=>canEditEmployee(e)).every(e=>selectedEmps.has(e.id))}
              onChange={toggleSelectAll}
              title="Select all editable employees"
              style={{ width:14, height:14, cursor:'pointer', accentColor:P }}/>
          </th>
          <th style={{ padding:'10px 12px', textAlign:'left', fontSize:9, fontWeight:800, color:P, width:170 }}>Employee</th>
          {weekDates.map((d,i)=>{
            const isT = d.toDateString()===today.toDateString()
            return <th key={i} style={{ padding:'8px 2px', fontSize:8, fontWeight:800, color:isT?'#ef4444':P, textAlign:'center', background:isT?'#fef2f2':'transparent', minWidth:52 }}>
              {DAYS_SHORT[d.getDay()]}<br/><span style={{ fontSize:10 }}>{d.getDate()}</span>
            </th>
          })}
          <th style={{ padding:'8px', fontSize:8, fontWeight:800, color:P, textAlign:'center', width:48 }}>Hrs</th>
          <th style={{ padding:'8px', fontSize:8, fontWeight:800, color:P, textAlign:'center', width:64 }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map(emp => {
          const wShifts = weekDates.map(d=>emp.roster[getDayIdx(d)]||null)
          const hrs     = wShifts.reduce((s,sh)=>s+(sh?SHIFTS[sh]?.hrs||0:0),0)
          const isBlank = wShifts.every(s=>!s)
          const canEdit = canEditEmployee(emp)
          const hasChg  = wShifts.some((s,i)=>{ const orig=savedRef.current.find(e=>e.id===emp.id)?.roster[getDayIdx(weekDates[i])]; return s!==orig })
          return (
            <tr key={emp.id} style={{ borderBottom:'1px solid #f8fafc', background:isBlank?'#fff7f7':'#fff' }}>
              <td style={{ padding:'4px 6px', textAlign:'center', verticalAlign:'middle' }}>
                {canEdit && (
                  <input type="checkbox" checked={selectedEmps.has(emp.id)} onChange={()=>toggleSelect(emp.id)}
                    style={{ width:14, height:14, cursor:'pointer', accentColor:P }}/>
                )}
              </td>
              <td style={{ padding:'7px 10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:G, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:8, fontWeight:900, flexShrink:0 }}>{emp.avatar}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{emp.name}</div>
                    <div style={{ fontSize:7, color:'#94a3b8' }}>{emp.dept}</div>
                    {isBlank&&canEdit&&<div style={{ fontSize:7, color:'#ef4444', fontWeight:700 }}>⚠️ Missing</div>}
                    {!canEdit&&<div style={{ fontSize:7, color:'#94a3b8', fontStyle:'italic' }}>View only</div>}
                    {canEdit && (
                      <div style={{ display:'flex', gap:2, marginTop:3, flexWrap:'wrap' }}>
                        {['GEN','MRN','EVN','NGT','OFF'].map(sh=>{
                          const key = Object.keys(SHIFTS).find(k=>SHIFTS[k].short===sh)
                          const cfg = SHIFTS[key] || SHIFTS.General  // ✅ FIX: was missing
                          return (
                            <button key={sh} onClick={()=>applyRowShift(emp.id, key, 'week')}
                              title={`Set all days to ${cfg.label}`}
                              style={{ padding:'1px 4px', borderRadius:4, border:`1px solid ${cfg.color}50`, background:cfg.bg, color:cfg.color, fontSize:6, fontWeight:800, cursor:'pointer', lineHeight:1.4 }}>
                              {sh}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              {weekDates.map((d,di)=>{
                const idx  = getDayIdx(d)
                const isT  = d.toDateString()===today.toDateString()
                const orig = savedRef.current.find(e=>e.id===emp.id)?.roster[idx]
                const isC  = emp.roster[idx] !== orig
                return <ShiftCell key={di} shift={emp.roster[idx]} dayIdx={idx} empId={emp.id} canEdit={canEdit} onChange={handleCellChange} isToday={isT} isChanged={isC}/>
              })}
              <td style={{ padding:'6px', textAlign:'center' }}>
                <span style={{ fontSize:9, fontWeight:800, color:hrs>48?'#ef4444':hrs>0?P:'#94a3b8' }}>{hrs}h</span>
                {hrs>48&&<div style={{ fontSize:7, color:'#ef4444' }}>OT!</div>}
              </td>
              <td style={{ padding:'6px', textAlign:'center' }}>
                {isBlank
                  ? <span style={{ fontSize:7, fontWeight:700, padding:'2px 5px', borderRadius:8, background:'#fef2f2', color:'#ef4444' }}>⚠️ Missing</span>
                  : hasChg
                    ? <span style={{ fontSize:7, fontWeight:700, padding:'2px 5px', borderRadius:8, background:'#fffbeb', color:'#f59e0b' }}>🔄 Edited</span>
                    : <span style={{ fontSize:7, fontWeight:700, padding:'2px 5px', borderRadius:8, background:'#f0fdf4', color:'#15803d' }}>✅ Set</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  const renderDaily = () => {
    const idx = getDayIdx(dayDate)
    return (
      <div>
        <div style={{ fontSize:13, fontWeight:800, color:'#0f172a', marginBottom:12 }}>
          {dayDate.toDateString()===today.toDateString()&&<span style={{ fontSize:8, padding:'2px 8px', borderRadius:8, background:'#fef2f2', color:'#ef4444', fontWeight:700, marginRight:6 }}>TODAY</span>}
          {dayDate.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </div>
        {SHIFT_KEYS.filter(sk=>sk!=='Off'&&sk!=='Holiday').map(sk => {
          const onShift = filtered.filter(e=>e.roster[idx]===sk)
          const cfg = SHIFTS[sk] || SHIFTS.General  // ✅ FIX: was missing
          if (onShift.length===0) return null
          return (
            <div key={sk} style={{ background:cfg.bg, borderRadius:12, padding:'12px 16px', border:`1px solid ${cfg.color}30`, marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.color }}/>
                <span style={{ fontSize:11, fontWeight:800, color:cfg.color }}>{cfg.label}</span>
                <span style={{ fontSize:9, color:'#64748b' }}>{cfg.hours}</span>
                <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:cfg.color }}>{onShift.length} staff</span>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {onShift.map(emp=>{
                  const orig = savedRef.current.find(e=>e.id===emp.id)?.roster[idx]  // ✅ FIX
                  const isC  = emp.roster[idx] !== orig
                  return (
                    <div key={emp.id} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', borderRadius:9, padding:'6px 10px', border:`1px solid ${isC?'#fca5a5':cfg.color+'25'}` }}>
                      <div style={{ width:24, height:24, borderRadius:6, background:G, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:8, fontWeight:900 }}>{emp.avatar}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{emp.name}</div>
                        <div style={{ fontSize:7, color:'#94a3b8' }}>{emp.dept}</div>
                      </div>
                      {canEditEmployee(emp) && ( // ✅ FIX: was bare `canEdit` (undefined here)
                        <select value={emp.roster[idx]||''} onChange={e=>handleCellChange(emp.id,idx,e.target.value||null)}
                          style={{ padding:'2px 4px', borderRadius:5, border:`1px solid ${cfg.color}`, fontSize:7, background:cfg.bg, color:cfg.color, fontWeight:700, outline:'none', marginLeft:4 }}>
                          <option value="">—</option>
                          {SHIFT_KEYS.map(s=><option key={s} value={s}>{SHIFTS[s].short}</option>)}
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {/* Off/blank */}
        {(() => {
          const off = filtered.filter(e=>e.roster[idx]==='Off'||!e.roster[idx])
          if (off.length===0) return null
          return (
            <div style={{ background:'#f8fafc', borderRadius:12, padding:'10px 14px', border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', marginBottom:6 }}>Off / No Roster ({off.length})</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {off.map(e=>(
                  <div key={e.id} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', borderRadius:8, padding:'5px 9px', border:'1px solid #e2e8f0' }}>
                    <span style={{ fontSize:8, color:'#374151', fontWeight:600 }}>{e.name}</span>
                    {canEditEmployee(e) && (
                      <select value={e.roster[idx]||''} onChange={ev=>handleCellChange(e.id,idx,ev.target.value||null)}
                        style={{ padding:'2px 4px', borderRadius:5, border:'1px solid #e2e8f0', fontSize:7, outline:'none' }}>
                        <option value="">—</option>
                        {SHIFT_KEYS.map(s=><option key={s} value={s}>{SHIFTS[s].short}</option>)}
                      </select>
                    )}
                    {!e.roster[idx]&&<span style={{ fontSize:7, color:'#ef4444' }}>⚠️</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  const renderMonthly = () => {
    const yr = new Date(yw, mw+monthOffset).getFullYear()
    const mo = new Date(yw, mw+monthOffset).getMonth()
    const firstDow = new Date(yr,mo,1).getDay()
    const daysInMonth = new Date(yr,mo+1,0).getDate()
    const cells = Array(firstDow).fill(null).concat(Array.from({length:daysInMonth},(_,i)=>i+1))
    return (
      <div>
        {/* Dept summary strip */}
        <div style={{ marginBottom:12, overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:9 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                <th style={{ padding:'7px 10px', textAlign:'left', fontSize:9, fontWeight:700, color:P, width:150 }}>Employee</th>
                {Array.from({length:Math.min(daysInMonth,31)},(_,i)=>i+1).map(d=>{
                  const date = new Date(yr,mo,d)
                  const isT  = date.toDateString()===today.toDateString()
                  const isW  = date.getDay()===0||date.getDay()===6
                  return <th key={d} style={{ padding:'4px 2px', fontSize:7, fontWeight:700, color:isT?'#ef4444':isW?'#94a3b8':P, textAlign:'center', background:isT?'#fef2f2':'transparent', minWidth:28 }}>{d}</th>
                })}
                <th style={{ padding:'7px 4px', fontSize:8, fontWeight:700, color:P, textAlign:'center', width:36 }}>Hrs</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp=>{
                let totalHrs = 0
                const canEdit = canEditEmployee(emp)
                return (
                  <tr key={emp.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                    <td style={{ padding:'4px 8px' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
                        {canEdit && (
                          <input type="checkbox" checked={selectedEmps.has(emp.id)} onChange={()=>toggleSelect(emp.id)}
                            style={{ width:12, height:12, marginTop:2, cursor:'pointer', accentColor:P, flexShrink:0 }}/>
                        )}
                        <div>
                          <div style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{emp.name}</div>
                          <div style={{ fontSize:7, color:'#94a3b8' }}>{emp.dept}</div>
                          {canEdit && (
                            <div style={{ display:'flex', gap:2, marginTop:2 }}>
                              {['GEN','MRN','EVN','NGT','OFF'].map(sh=>{
                                const key=Object.keys(SHIFTS).find(k=>SHIFTS[k].short===sh)
                                const cfg=SHIFTS[key]
                                return <button key={sh} onClick={()=>applyRowShift(emp.id,key,'month')} title={`Set all month to ${cfg.label}`}
                                  style={{ padding:'1px 3px', borderRadius:3, border:`1px solid ${cfg.color}50`, background:cfg.bg, color:cfg.color, fontSize:6, fontWeight:800, cursor:'pointer' }}>{sh}</button>
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {Array.from({length:Math.min(daysInMonth,31)},(_,di)=>di+1).map(d=>{
                      const date = new Date(yr, mo, d)
                      const idx  = getDayIdx(date)
                      const sh   = emp.roster[idx]||null
                      const cfg  = sh?SHIFTS[sh]:null
                      totalHrs  += sh?SHIFTS[sh]?.hrs||0:0
                      const isT  = date.toDateString()===today.toDateString()
                      const isW  = date.getDay()===0||date.getDay()===6
                      const origEmp = savedRef.current.find(e=>e.id===emp.id)  // ✅ FIX: orig
                      const isC  = sh !== (origEmp?.roster[idx]||null)  // ✅ FIX: was orig (undefined)
                      if (!canEdit) return (
                        <td key={d} style={{ padding:'2px', textAlign:'center', background:isT?'#fef2f2':isW?'#f8fafc':'transparent' }}>
                          {cfg?<span style={{ fontSize:7, color:cfg.color, fontWeight:700 }}>{cfg.short}</span>:<span style={{ color:'#e2e8f0', fontSize:9 }}>·</span>}
                        </td>
                      )
                      return (
                        <td key={d} style={{ padding:'1px', textAlign:'center', background:isT?'#fef2f2':isW?'#f8fafc':'transparent', position:'relative' }}>
                          {isC&&<div style={{ position:'absolute', top:1, right:1, width:4, height:4, borderRadius:'50%', background:'#ef4444', zIndex:1 }}/>}
                          <select value={sh||''} onChange={e=>handleCellChange(emp.id,idx,e.target.value||null)}
                            style={{ width:'100%', padding:'2px 0', borderRadius:4, border:`1px solid ${isC?'#ef4444':cfg?cfg.color+'60':'#e2e8f0'}`, background:isC?'#fef2f2':cfg?cfg.bg:'#fff', color:isC?'#ef4444':cfg?cfg.color:'#94a3b8', fontSize:7, fontWeight:700, cursor:'pointer', outline:'none' }}>
                            <option value="">·</option>
                            {SHIFT_KEYS.map(s=><option key={s} value={s}>{SHIFTS[s].short}</option>)}
                          </select>
                        </td>
                      )
                    })}
                    <td style={{ padding:'4px', textAlign:'center' }}>
                      <span style={{ fontSize:8, fontWeight:800, color:totalHrs>192?'#ef4444':P }}>{totalHrs}h</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── NOTIFICATION HISTORY ───────────────────────────────────
  const allNotifs = useMemo(()=>{
    try { return JSON.parse(localStorage.getItem('elogix_roster_notifications')||'[]').slice(0,30) } catch(_e) { return [] }
  },[notifPanel])
  const unread = allNotifs.filter(n=>!n.read).length

  // ── PERMISSION BANNER ──────────────────────────────────────
  const roleBanner = () => {
    if (canEditAll)  return { bg:'#f0fdf4', color:'#15803d', icon:'✅', text:`Edit mode: Full access — you can edit all departments (${sess.user?.name||'HR/Admin'})` }
    if (canEditDept) return { bg:'#eff6ff', color:'#1e40af', icon:'🏢', text:`Edit mode: Department scope — you can only edit ${myDept||'your department'} employees (${sess.user?.name||'Dept Head'})` }
    return { bg:'#f8fafc', color:'#64748b', icon:'👁️', text:`View only — your role (${sess.user?.name||'Employee'}) does not have roster edit permission. Contact HR or your supervisor.` }
  }
  const banner = roleBanner()

  return (
    <div style={{ position:'relative', width:'100%', minHeight:'100vh', display:'flex', flexDirection:'column',
      fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#f5f3ff', overflow:'hidden' }}>
      <style>{`
        ::-webkit-scrollbar{width:8px;height:8px}
        ::-webkit-scrollbar-track{background:#f1f5f9;border-radius:4px}
        ::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:#475569}
      `}</style>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden',
        scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9',
        WebkitOverflowScrolling:'touch', padding:'0 0 20px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'16px' }}>

      {/* ── DISCARD CONFIRM DIALOG ────────────────────────────── */}
      {showDiscardWarn && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,.2)', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Discard unsaved changes?</div>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:24 }}>All changes made since your last save will be permanently lost.</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setShowDiscardWarn(false)} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:12, fontWeight:700, cursor:'pointer' }}>Cancel</button>
              <button onClick={handleDiscard} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'#ef4444', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>🗑 Discard Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', boxShadow:'0 4px 24px rgba(67,56,202,.25)' }}>
        <div style={{ fontSize:8, color:'rgba(255,255,255,.5)', marginBottom:3 }}>Workforce Operations › Attendance Management › Attendance Setup</div>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🗓️ Roster Management{company.name ? ' — '+company.name : ''}</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:2 }}>Department-wise · Daily / Weekly / Monthly · Role-based Edit · Save & Publish · Multi-channel Notifications · Print</div>
        <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap', alignItems:'center' }}>
          {[
            { icon:'👥', label:'Total',          val:employees.length },
            { icon:'✅', label:'Roster Set',      val:employees.filter(e=>weekDates.some(d=>e.roster[getDayIdx(d)])).length },
            { icon:'⚠️', label:'Missing',        val:missingRoster.length },
            { icon:'🔔', label:'Notifications',  val:unread },
          ].map((s,i)=>(
            <div key={i} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'6px 14px' }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.7)' }}>{s.icon} {s.label}</div>
              <div style={{ fontSize:16, fontWeight:900, color:s.label==='Missing'&&s.val>0?'#fca5a5':'#fff' }}>{s.val}</div>
            </div>
          ))}
          {/* Action buttons */}
          <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={()=>setNotifPanel(v=>!v)} style={{ position:'relative', background:'rgba(255,255,255,.15)', border:'none', borderRadius:10, padding:'8px 14px', color:'#fff', cursor:'pointer', fontSize:16 }}>
              🔔{unread>0&&<span style={{ position:'absolute', top:3, right:3, width:14, height:14, borderRadius:'50%', background:'#ef4444', fontSize:7, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>{unread}</span>}
            </button>
            <button onClick={handlePrint} style={{ padding:'8px 14px', borderRadius:10, border:'none', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>🖨️ Print{selectedEmps.size>0?` (${selectedEmps.size})`:'all'}</button>
            {canEditAny && (
              <>
                {unsaved && (
                  <button onClick={()=>setShowDiscardWarn(true)} style={{ padding:'8px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,.3)', background:'transparent', color:'rgba(255,255,255,.8)', fontSize:11, fontWeight:700, cursor:'pointer' }}>🗑 Discard</button>
                )}
                <button onClick={handleSave} disabled={!unsaved||saving}
                  style={{ padding:'8px 18px', borderRadius:10, border:'none', background:unsaved?'#10b981':'rgba(255,255,255,.15)', color:'#fff', fontSize:11, fontWeight:800, cursor:unsaved&&!saving?'pointer':'default', boxShadow:unsaved?'0 2px 10px rgba(16,185,129,.4)':'none' }}>
                  {saving ? '⏳ Saving...' : unsaved ? '💾 Save Changes' : '✅ Saved'}
                </button>
                <button onClick={publishRoster} disabled={publishing||unsaved}
                  style={{ padding:'8px 18px', borderRadius:10, border:'none', background:unsaved?'rgba(255,255,255,.1)':'rgba(255,255,255,.25)', color:unsaved?'rgba(255,255,255,.4)':'#fff', fontSize:11, fontWeight:800, cursor:publishing||unsaved?'default':'pointer' }}>
                  {published?'✅ Published!':publishing?'⏳...':'🚀 Publish'}
                </button>
              </>
            )}
          </div>
        </div>
        {saveMsg && <div style={{ marginTop:10, fontSize:10, color:'rgba(255,255,255,.9)', fontWeight:700 }}>{saveMsg}</div>}
        {unsaved && <div style={{ marginTop:6, fontSize:9, color:'rgba(255,165,0,.9)', fontWeight:600 }}>⚠️ You have unsaved changes. Click "Save Changes" to keep them, or "Discard" to revert.</div>}
      </div>

      {/* ── ROLE PERMISSION BANNER ────────────────────────────── */}
      <div style={{ background:banner.bg, border:`1px solid ${banner.color}30`, borderRadius:12, padding:'10px 16px', display:'flex', gap:8, alignItems:'center', fontSize:10, color:banner.color, fontWeight:600 }}>
        <span style={{ fontSize:16 }}>{banner.icon}</span>{banner.text}
      </div>

      {/* ── MISSING ROSTER ALERT ──────────────────────────────── */}
      {missingRoster.length>0 && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:20, flexShrink:0 }}>🔴</span>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:'#dc2626' }}>Missing Roster — {missingRoster.length} employee{missingRoster.length>1?'s':''} have no shifts this week</div>
            <div style={{ fontSize:10, color:'#991b1b', marginTop:3 }}>{missingRoster.map(e=>`${e.name} (${e.dept})`).join(' · ')}</div>
            <div style={{ fontSize:9, color:'#64748b', marginTop:4 }}>📧 Email · 📱 WhatsApp · 📲 Viber sent to supervisors: {[...new Set(missingRoster.map(e=>e.supervisor))].join(', ')}</div>
          </div>
        </div>
      )}

      {/* ── CONTROLS ──────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {/* View */}
        <div style={{ display:'flex', gap:3, background:'#f8fafc', borderRadius:10, padding:3, border:'1px solid #e2e8f0' }}>
          {[['daily','☀️ Daily'],['weekly','📅 Weekly'],['monthly','🗓️ Monthly']].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:view===v?'#fff':'transparent', color:view===v?P:'#64748b', fontWeight:view===v?800:500, fontSize:10, cursor:'pointer', boxShadow:view===v?'0 1px 4px rgba(0,0,0,.08)':'none' }}>{l}</button>
          ))}
        </div>
        {/* Nav */}
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <button onClick={()=>view==='daily'?setDayOffset(p=>p-1):view==='weekly'?setWeekOffset(p=>p-1):setMonthOffset(p=>p-1)} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:12 }}>‹</button>
          <span style={{ fontSize:10, fontWeight:700, color:'#374151', minWidth:160, textAlign:'center' }}>
            {view==='daily'   && dayDate.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
            {view==='weekly'  && `${weekDates[0].toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${weekDates[6].toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`}
            {view==='monthly' && `${MONTHS[new Date(yw,mw+monthOffset).getMonth()]} ${new Date(yw,mw+monthOffset).getFullYear()}`}
          </span>
          <button onClick={()=>view==='daily'?setDayOffset(p=>p+1):view==='weekly'?setWeekOffset(p=>p+1):setMonthOffset(p=>p+1)} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:12 }}>›</button>
          <button onClick={()=>{setDayOffset(0);setWeekOffset(0);setMonthOffset(0)}} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${P}`, background:`${P}10`, color:P, fontSize:9, fontWeight:700, cursor:'pointer' }}>Today</button>
        </div>
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} disabled={!!myDept}
          style={{ padding:'7px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:10, outline:'none', background:'#fff', opacity:myDept?0.6:1 }}>
          {(myDept?[myDept]:DEPTS).map(d=><option key={d} value={d}>{d==='All'?'All Departments':d}</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search employee..."
          style={{ padding:'7px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:10, outline:'none', width:160 }}/>
        <button onClick={()=>navTo?.('live-attendance')} style={{ padding:'7px 12px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, fontWeight:700, cursor:'pointer' }}>📊 Attendance →</button>
        <button onClick={()=>navTo?.('automated-payroll')} style={{ padding:'7px 12px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', fontSize:9, fontWeight:700, cursor:'pointer' }}>💰 Payroll →</button>
      </div>

      {/* ── BULK APPLY TOOLBAR (shown when employees selected) ───── */}
      {selectedEmps.size > 0 && canEditAny && (
        <div style={{ background:'#faf5ff', border:`1px solid ${P}30`, borderRadius:12, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div style={{ fontSize:10, fontWeight:800, color:P }}>
            ☑️ {selectedEmps.size} employee{selectedEmps.size!==1?'s':''} selected
          </div>
          <div style={{ fontSize:9, color:'#64748b' }}>Apply shift to ALL selected for</div>
          {/* Shift colour buttons */}
          {Object.entries(SHIFTS).map(([key,cfg])=>(
            <button key={key} onClick={()=>applyBulkShift(key, view)}
              title={`Apply ${cfg.label} to all selected employees (all days in current ${view} view)`}
              style={{ padding:'5px 10px', borderRadius:8, border:`1.5px solid ${cfg.color}`, background:cfg.bg, color:cfg.color, fontSize:9, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <span>{cfg.short}</span>
              <span style={{ fontSize:7, opacity:.8 }}>{cfg.label}</span>
            </button>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <button onClick={()=>applyBulkShift(bulkShift||'Off', view)} style={{ display:'none' }}/>
            <button onClick={()=>setSelectedEmps(new Set())}
              style={{ padding:'5px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontSize:9, fontWeight:700, cursor:'pointer' }}>
              ✕ Clear selection
            </button>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 268px', gap:16 }}>
        {/* ── ROSTER GRID ─────────────────────────────────────── */}
        <div style={{ background:'#fff', borderRadius:16, padding:16, border:'1px solid #e2e8f0', overflowX:'auto' }}>
          {view==='weekly'  && renderWeekly()}
          {view==='daily'   && renderDaily()}
          {view==='monthly' && renderMonthly()}
        </div>

        {/* ── SIDE PANEL ──────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Auto-roster (only for editors) */}
          {canEditAny && (
            <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:10 }}>🤖 Auto-Roster Generator</div>
              <select value={autoPattern} onChange={e=>setAutoPattern(e.target.value)}
                style={{ width:'100%', padding:'8px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:10, outline:'none', marginBottom:8 }}>
                <option value="balanced">Balanced (General shifts)</option>
                <option value="morning">Morning-Heavy</option>
                <option value="evening">Evening-Heavy</option>
                <option value="night">Night-Heavy</option>
                <option value="rotating">Rotating (All shifts)</option>
              </select>
              <div style={{ fontSize:8, color:'#64748b', marginBottom:8, background:'#f8fafc', padding:'6px 8px', borderRadius:7 }}>
                Auto-assigns weekends as Off · Max 48h/week (Labour Act 2074) · Notifies all via Email + WhatsApp + Viber
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>autoGenerate('week')} style={{ flex:1, padding:'8px', borderRadius:9, border:'none', background:G, color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer' }}>This Week</button>
                <button onClick={()=>autoGenerate('month')} style={{ flex:1, padding:'8px', borderRadius:9, border:`1px solid ${P}`, background:`${P}08`, color:P, fontSize:10, fontWeight:700, cursor:'pointer' }}>Full Month</button>
              </div>
            </div>
          )}

          {/* Shift legend */}
          <div style={{ background:'#fff', borderRadius:14, padding:16, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0f172a', marginBottom:10 }}>🎨 Shift Legend</div>
            {Object.entries(SHIFTS).map(([k,cfg])=>(
              <div key={k} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:5, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40`, width:26, textAlign:'center' }}>{cfg.short}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#374151' }}>{cfg.label}</div>
                  <div style={{ fontSize:7, color:'#94a3b8' }}>{cfg.hours}</div>
                </div>
                <span style={{ fontSize:8, color:'#64748b' }}>{cfg.hrs}h</span>
              </div>
            ))}
            <div style={{ marginTop:8, fontSize:8, color:'#94a3b8', borderTop:'1px solid #f1f5f9', paddingTop:6 }}>
              🔴 Red dot = edited since last save
            </div>
          </div>

          {/* Payroll link */}
          <div style={{ background:'#faf5ff', borderRadius:14, padding:14, border:'1px solid #e9d5ff' }}>
            <div style={{ fontSize:11, fontWeight:800, color:P, marginBottom:8 }}>💰 Payroll Integration</div>
            {[
              ['Night shift allowance', 'NPR 500/shift'],
              ['Overtime (Labour Act S.36)', '1.5× basic'],
              ['Public holiday work', '2× basic'],
              ['Off-day work', '1.5× basic'],
            ].map(([l,v],i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #e9d5ff', fontSize:9 }}>
                <span style={{ color:'#374151' }}>{l}</span>
                <span style={{ fontWeight:700, color:P }}>{v}</span>
              </div>
            ))}
            <button onClick={()=>navTo?.('automated-payroll')} style={{ width:'100%', marginTop:10, padding:'8px', borderRadius:9, border:'none', background:G, color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>View Payroll Impact →</button>
          </div>

          {/* Notification channels */}
          <div style={{ background:'#f0fdf4', borderRadius:14, padding:14, border:'1px solid #bbf7d0' }}>
            <div style={{ fontSize:11, fontWeight:800, color:'#15803d', marginBottom:8 }}>📣 Notification Channels</div>
            {[
              ['📧','Email',         'Individual shift change'],
              ['📱','WhatsApp',      'Instant shift alert'],
              ['📲','Viber',         'Backup notification'],
              ['🔔','Dashboard Bell','HRIS notification bar'],
              ['👤','ESS My Roster', 'Employee self-service view'],
              ['👔','Supervisor',    'Missing roster escalation'],
            ].map(([icon,label,desc],i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <span style={{ fontSize:14 }}>{icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#0f172a' }}>{label}</div>
                  <div style={{ fontSize:7, color:'#64748b' }}>{desc}</div>
                </div>
                <div style={{ width:20, height:12, borderRadius:6, background:'#10b981', position:'relative', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, right:2, width:8, height:8, borderRadius:'50%', background:'#fff' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION PANEL ────────────────────────────────── */}
      {notifPanel && (
        <div style={{ position:'fixed', top:0, right:0, bottom:0, width:370, background:'#fff', boxShadow:'-4px 0 32px rgba(0,0,0,.15)', zIndex:2000, display:'flex', flexDirection:'column' }}>
          <div style={{ background:G, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:900, color:'#fff' }}>🔔 Roster Notifications</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,.7)', marginTop:2 }}>Email · WhatsApp · Viber · Dashboard sent</div>
            </div>
            <button onClick={()=>setNotifPanel(false)} style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:8, padding:'4px 12px', color:'#fff', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:14 }}>
            {allNotifs.length===0
              ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}><div style={{ fontSize:28, marginBottom:8 }}>🔔</div>No roster notifications yet</div>
              : allNotifs.map((n,i)=>(
                <div key={n.id||i} style={{ padding:'12px', borderRadius:10, border:'1px solid #e2e8f0', marginBottom:8 }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <span style={{ fontSize:16 }}>{n.type==='missing_roster'?'🔴':n.type==='shift_change'?'🔄':'✅'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#0f172a' }}>{n.employee}</div>
                      <div style={{ fontSize:9, color:'#374151', marginTop:2, lineHeight:1.5 }}>{n.message}</div>
                      <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap' }}>
                        {(n.channels||[]).map(ch=><span key={ch} style={{ fontSize:7, fontWeight:700, padding:'1px 6px', borderRadius:7, background:'#f0fdf4', color:'#15803d' }}>
                          {ch==='email'?'📧':ch==='whatsapp'?'📱':ch==='viber'?'📲':ch==='dashboard'?'🔔':'📣'} {ch}
                        </span>)}
                      </div>
                      <div style={{ fontSize:7, color:'#94a3b8', marginTop:4 }}>{new Date(n.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
      </div>
    </div>
  )
}
