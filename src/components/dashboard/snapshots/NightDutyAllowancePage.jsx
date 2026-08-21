// FILE: NightDutyAllowancePage.jsx
// Night Duty Allowance Register — Auto-detected from Daily Attendance Log
// Cumulative tracking → Payroll sync (monthly / quarterly / bi-monthly / daily)
// Payroll sync triggers payroll engine to include allowance in monthly salary
import { useState, useRef } from 'react'

const G  = 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#6366f1 100%)'
const GD = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A  = '#4338ca'

const DEPARTMENTS  = ['All Staffs','Management','Human Resources','Finance & Accounts',
  'Information Technology','Sales & Marketing','Operations','Procurement',
  'Customer Service','Legal','Administration','Learning & Development']
const DESIGNATIONS = ['CEO','General Manager','Deputy GM','Manager','Assistant Manager',
  'Senior Officer','Officer','Junior Officer','Senior Executive','Executive',
  'Senior Associate','Associate','Supervisor','Team Lead','Intern','Trainee']
const SHIFTS      = ['Night','Split','Rotational']
const EMP_STATUS  = ['Permanent','Contract','Probation','Part-Time','Intern','Outsource']
const PERIODS     = ['Daily','Weekly','Bi-Monthly','Monthly','Quarterly','Yearly']
const ND_TYPES    = ['Night Shift Allowance','Night Differential Pay','On-Call Night',
  'Emergency Night Duty','Weekend Night Duty','Holiday Night Duty']
const PAY_MODES   = ['Fixed Per Night','Hourly Rate','% of Basic Salary','Custom Amount']
const PAY_STATUS  = {
  pending:   { c:'#d97706', bg:'#fffbeb', b:'#fde68a', icon:'⏳', l:'Pending' },
  approved:  { c:'#059669', bg:'#f0fdf4', b:'#bbf7d0', icon:'✅', l:'Approved' },
  processed: { c:'#0891b2', bg:'#f0f9ff', b:'#bae6fd', icon:'🔄', l:'Processing' },
  synced:    { c:'#7c3aed', bg:'#f5f3ff', b:'#ddd6fe', icon:'💳', l:'Payroll Synced' },
  paid:      { c:'#065f46', bg:'#ecfdf5', b:'#6ee7b7', icon:'💰', l:'Paid' },
  rejected:  { c:'#dc2626', bg:'#fef2f2', b:'#fecaca', icon:'❌', l:'Rejected' },

const rand   = a => a[Math.floor(Math.random()*a.length)]
const pad2   = n => String(n).padStart(2,'0')
const FIRST  = ['Ram','Shyam','Hari','Sita','Gita','Maya','Binod','Sunil','Priya','Anil',
  'Bikash','Sunita','Rajesh','Puja','Deepak','Anita','Sanjay','Rupa','Nabin','Sabita',
  'Kamal','Kamala','Roshan','Rekha','Nirmal','Nirmala','Dipak','Dipika','Arjun','Asha']
const LAST   = ['Thapa','Shrestha','Maharjan','Tamang','Gurung','Rai','Limbu','Karki',
  'Basnet','Adhikari','KC','Bhattarai','Sharma','Poudel','Joshi','Hamal']

// Night hours: 21:00 → 06:00 = 9 hrs max
const calcNightHrs = (start, end) => {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startMins = sh * 60 + sm
  let endMins   = eh * 60 + em
  // Handle cross-midnight
  if (endMins < startMins) endMins += 24 * 60
  return Math.max(0, (endMins - startMins) / 60)

const calcAllowance = (hrs, baseSalary, payMode, fixedRate, customAmt) => {
  switch (payMode) {
    case 'Fixed Per Night':    return fixedRate || 500
    case 'Hourly Rate':        return Math.round(hrs * (fixedRate || 100))
    case '% of Basic Salary':  return Math.round(baseSalary * ((fixedRate || 10) / 100) / 22)
    case 'Custom Amount':      return customAmt || 0
    default:                   return 500

function genNightRows(n = 70) {
  const rows = []
  const today = new Date()
  for (let i = 1; i <= n; i++) {
    const dept        = DEPARTMENTS[Math.floor(Math.random() * (DEPARTMENTS.length - 1)) + 1]
    const designation = rand(DESIGNATIONS)
    const shift       = rand(SHIFTS)
    const ndType      = rand(ND_TYPES)
    const payMode     = rand(PAY_MODES)
    const baseSalary  = 25000 + Math.floor(Math.random() * 95000)
    const fixedRate   = payMode === 'Hourly Rate' ? 80 + Math.floor(Math.random() * 70)
                      : payMode === '% of Basic Salary' ? 5 + Math.floor(Math.random() * 15)
                      : 300 + Math.floor(Math.random() * 500)

    // Date in past 30 days
    const d = new Date(today)
    d.setDate(d.getDate() - Math.floor(Math.random() * 30))
    const dateStr = d.toISOString().split('T')[0]
    const dayName = d.toLocaleDateString('en-NP', { weekday: 'short' })
    const isWeekend = d.getDay() === 0 || d.getDay() === 6

    const startH = 20 + Math.floor(Math.random() * 2)
    const startM = Math.floor(Math.random() * 30)
    const endH   = 5  + Math.floor(Math.random() * 3)
    const endM   = Math.floor(Math.random() * 59)
    const nightStart = `${pad2(startH)}:${pad2(startM)}`
    const nightEnd   = `${pad2(endH)}:${pad2(endM)}`
    const nightHrs   = calcNightHrs(nightStart, nightEnd)
    const allowance  = calcAllowance(nightHrs, baseSalary, payMode, fixedRate, 0)

    // Cumulative this month
    const prevNights = 1 + Math.floor(Math.random() * 12)
    const cumAllowance = allowance * prevNights

    const statuses = ['pending','pending','approved','processed','synced','paid','rejected']
    const status   = rand(statuses)

    rows.push({
      sl: i,
      empId:       `EMP-${String(Math.floor(Math.random() * 900) + 100).padStart(4, '0')}`,
      name:        `${rand(FIRST)} ${rand(LAST)}`,
      designation,
      dept,
      shift,
      empStatus:   rand(EMP_STATUS),
      date:        dateStr,
      day:         dayName,
      isWeekend,
      ndType,
      nightStart,
      nightEnd,
      nightHrs:    nightHrs.toFixed(2),
      baseSalary,
      payMode,
      fixedRate,
      allowancePerNight: allowance,
      nightsThisMonth:   prevNights,
      cumulativeAllowance: cumAllowance,
      payrollPeriod: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      status,
      approvedBy:  ['approved','processed','synced','paid'].includes(status) ? 'HR Manager' : '—',
      payrollRef:  ['synced','paid'].includes(status) ? `PR-${d.getFullYear()}${pad2(d.getMonth()+1)}-${String(i).padStart(4,'0')}` : '—',
      remarks:     status === 'rejected' ? 'Night duty not pre-approved' : '—',
    })
  return rows

const INIT_ROWS = genNightRows(70)
const inp = { padding:'7px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:10,
  outline:'none', background:'#fff', width:'100%', boxSizing:'border-box', fontFamily:'inherit' }

const CH = ({ lbl, sub, w=80, bg=A }) => (
  <th style={{ padding:'7px 5px', textAlign:'center', fontSize:8, fontWeight:700, color:'#fff',
    whiteSpace:'nowrap', width:w, minWidth:w, borderRight:'1px solid rgba(255,255,255,.15)',
    verticalAlign:'middle', lineHeight:1.3, background:bg, position:'sticky', top:0, zIndex:2 }}>
    {lbl}{sub && <><br/><span style={{ fontWeight:400, opacity:.75, fontSize:7 }}>{sub}</span></>}
  </th>
)
const GH = ({ lbl, span, bg }) => (
  <th colSpan={span} style={{ padding:'5px 6px', textAlign:'center', fontSize:8, fontWeight:700,
    color:'#fff', borderRight:'2px solid rgba(255,255,255,.25)', background:bg,
    position:'sticky', top:0, zIndex:2 }}>
    {lbl}
  </th>
)

export default function NightDutyAllowancePage() {
  const today = new Date().toISOString().split('T')[0]
  const [rows, setRows]         = useState(INIT_ROWS)
  const [period, setPeriod]     = useState('Monthly')
  const [dateFrom, setDateFrom] = useState(today.slice(0,7) + '-01')
  const [dateTo, setDateTo]     = useState(today)
  const [dept, setDept]         = useState('All Staffs')
  const [statusFilter, setStatusFilter] = useState('All')
  const [ndType, setNdType]     = useState('All')
  const [search, setSearch]     = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [showSync, setShowSync] = useState(false)
  const [bulkSel, setBulkSel]   = useState([])
  const [editSl, setEditSl]     = useState(null)
  const [msg, setMsg]           = useState('')
  const [form, setForm]         = useState({
    name:'', empId:'', designation:'', dept:'', shift:'Night', empStatus:'Permanent',
    date:today, ndType:'Night Shift Allowance', nightStart:'21:00', nightEnd:'06:00',
    payMode:'Fixed Per Night', fixedRate:'500', baseSalary:'', remarks:'',
  })
  const fileRef = useRef(null)
  const notify  = m => { setMsg(m); setTimeout(() => setMsg(''), 4000) }
  const sf      = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Filter
  const filtered = rows.filter(r => {
    if (dept !== 'All Staffs' && r.dept !== dept) return false
    if (statusFilter !== 'All' && r.status !== statusFilter) return false
    if (ndType !== 'All' && r.ndType !== ndType) return false
    if (r.date < dateFrom || r.date > dateTo) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.empId.includes(search) && !r.designation.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Summary stats
  const totalNights      = filtered.reduce((s, r) => s + (parseFloat(r.nightsThisMonth) || 1), 0)
  const totalNightHrs    = filtered.reduce((s, r) => s + parseFloat(r.nightHrs || 0), 0)
  const totalAllowance   = filtered.reduce((s, r) => s + (r.cumulativeAllowance || 0), 0)
  const pendingAmt       = filtered.filter(r => r.status === 'pending').reduce((s, r) => s + r.cumulativeAllowance, 0)
  const syncedAmt        = filtered.filter(r => ['synced','paid'].includes(r.status)).reduce((s, r) => s + r.cumulativeAllowance, 0)
  const approvedCount    = filtered.filter(r => r.status === 'approved').length

  // Bulk
  const toggleBulk = sl => setBulkSel(p => p.includes(sl) ? p.filter(x => x !== sl) : [...p, sl])
  const toggleAll  = () => setBulkSel(bulkSel.length === filtered.length ? [] : filtered.map(r => r.sl))

  const bulkApprove = () => {
    setRows(p => p.map(r => bulkSel.includes(r.sl) && r.status === 'pending'
      ? { ...r, status: 'approved', approvedBy: 'HR Manager' } : r))
    notify(`✅ ${bulkSel.length} night duty allowances approved`)
    setBulkSel([])
  const bulkSyncPayroll = () => {
    const period = filtered[0]?.payrollPeriod || today.slice(0,7)
    setRows(p => p.map(r => bulkSel.includes(r.sl) && r.status === 'approved'
      ? { ...r, status: 'synced', payrollRef: `PR-${period}-${String(r.sl).padStart(4,'0')}` } : r))
    notify(`💳 ${bulkSel.length} night duty allowances synced to payroll ${period}`)
    setBulkSel([])
    setShowSync(false)

  const handleSave = () => {
    if (!form.name || !form.empId) { notify('⚠️ Name and Employee ID required'); return }
    const hrs     = calcNightHrs(form.nightStart, form.nightEnd)
    const base    = parseFloat(form.baseSalary) || 30000
    const rate    = parseFloat(form.fixedRate) || 500
    const allowPn = calcAllowance(hrs, base, form.payMode, rate, 0)
    const entry   = {
      ...form,
      sl: editSl !== null ? editSl : rows.length + 1,
      day: new Date(form.date).toLocaleDateString('en-NP', { weekday:'short' }),
      isWeekend: [0,6].includes(new Date(form.date).getDay()),
      nightHrs: hrs.toFixed(2),
      baseSalary: base, fixedRate: rate,
      allowancePerNight: allowPn,
      nightsThisMonth: 1,
      cumulativeAllowance: allowPn,
      payrollPeriod: form.date.slice(0,7),
      status: 'pending',
      approvedBy: '—', payrollRef: '—',
    if (editSl !== null) {
      setRows(p => p.map(r => r.sl === editSl ? entry : r))
      notify('✅ Night duty record updated')
    } else {
      setRows(p => [...p, entry])
      notify('🌙 Night duty allowance entry added — status: Pending Approval → Payroll')
    setShowAdd(false); setEditSl(null)
    setForm({ name:'',empId:'',designation:'',dept:'',shift:'Night',empStatus:'Permanent',
      date:today,ndType:'Night Shift Allowance',nightStart:'21:00',nightEnd:'06:00',
      payMode:'Fixed Per Night',fixedRate:'500',baseSalary:'',remarks:'' })

  const exportCSV = () => {
    const h = ['Sl.No','Emp ID','Name','Designation','Department','Shift','Emp Status',
      'Date','Day','ND Type','Night Start','Night End','Night Hrs',
      'Pay Mode','Rate','Allowance/Night','Nights This Month','Cumulative NPR',
      'Payroll Period','Status','Approved By','Payroll Ref','Remarks']
    const csvR = [h.join(',')]
    filtered.forEach(r => csvR.push([
      r.sl, r.empId, `"${r.name}"`, `"${r.designation}"`, `"${r.dept}"`, r.shift, r.empStatus,
      r.date, r.day, `"${r.ndType}"`, r.nightStart, r.nightEnd, r.nightHrs,
      `"${r.payMode}"`, r.fixedRate, r.allowancePerNight, r.nightsThisMonth, r.cumulativeAllowance,
      r.payrollPeriod, r.status, r.approvedBy, r.payrollRef, `"${r.remarks}"`
    ].join(',')))
    const blob = new Blob([csvR.join('\n')], { type:'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `NightDutyAllowance_${dateFrom}_${dateTo}.csv`
    a.click()
    notify('📤 Night Duty Allowance register exported to CSV')

  // Live preview in Add modal
  const previewHrs      = calcNightHrs(form.nightStart, form.nightEnd)
  const previewBase     = parseFloat(form.baseSalary) || 30000
  const previewRate     = parseFloat(form.fixedRate) || 500
  const previewAllowance = calcAllowance(previewHrs, previewBase, form.payMode, previewRate, 0)

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', height:'100vh', display:'flex', flexDirection:'column', background:'#f8f7ff' }}>
      {msg && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999, background:'#f5f3ff',
          border:'1px solid #ddd6fe', borderRadius:10, padding:'10px 18px', fontSize:11,
          color:'#4c1d95', boxShadow:'0 4px 16px rgba(0,0,0,.12)', maxWidth:440 }}>
          {msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background:G, padding:'14px 20px', color:'#fff', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900 }}>🌙 Night Duty Allowance Register</div>
            <div style={{ fontSize:10, opacity:.8, marginTop:2 }}>
              Auto-detected from Daily Attendance Log · Cumulative Tracking · Payroll Sync
            </div>
            <div style={{ fontSize:9, opacity:.7, marginTop:2 }}>
              Flow: Night Duty Log → HR Approval → Payroll Sync → Monthly Salary Disbursement
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid rgba(255,255,255,.5)', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>
              📊 Import Excel
              <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv"
                onChange={e => notify(`📂 ${e.target.files[0]?.name} imported — processing night records...`)}
                style={{ display:'none' }}/>
            </button>
            <button onClick={exportCSV}
              style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid rgba(255,255,255,.5)', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>
              📤 Export CSV
            </button>
            <button onClick={() => notify('🖨 Sending allowance register to printer...')}
              style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid rgba(255,255,255,.5)', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>
              🖨 Print
            </button>
            <button onClick={() => { setEditSl(null); setShowAdd(true) }}
              style={{ padding:'7px 14px', borderRadius:8, border:'none', background:'#fff', color:A, fontSize:9, fontWeight:800, cursor:'pointer' }}>
              + Add Night Entry
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
          {[
            ['🌙','Total Nights', totalNights],
            ['⏱','Total Night Hrs', totalNightHrs.toFixed(1)+'h'],
            ['💰','Total Allowance', 'NPR '+totalAllowance.toLocaleString()],
            ['⏳','Pending Approval', 'NPR '+pendingAmt.toLocaleString()],
            ['✅','Approved', approvedCount],
            ['💳','Payroll Synced', 'NPR '+syncedAmt.toLocaleString()],
          ].map(([ic, lb, v]) => (
            <div key={lb} style={{ background:'rgba(255,255,255,.12)', borderRadius:8, padding:'6px 12px', textAlign:'center', minWidth:85 }}>
              <div style={{ fontSize:15, fontWeight:900 }}>{v}</div>
              <div style={{ fontSize:8, opacity:.75 }}>{ic} {lb}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PERIOD SELECTOR ── */}
      <div style={{ background:'#fff', padding:'8px 16px', flexShrink:0, borderBottom:'1px solid #f1f5f9', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${period===p?A:'#e2e8f0'}`,
              background:period===p?A+'15':'#fff', color:period===p?A:'#64748b',
              fontSize:9, fontWeight:period===p?800:400, cursor:'pointer', transition:'all .12s' }}>
            {p==='Daily'?'📅':p==='Weekly'?'📆':p==='Monthly'?'📁':p==='Quarterly'?'📊':'📂'} {p}
          </button>
        ))}
        <div style={{ marginLeft:'auto', fontSize:9, color:'#64748b' }}>
          Cumulative mode: <b style={{ color:A }}>{period}</b>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div style={{ background:'#fff', padding:'8px 16px', flexShrink:0,
        boxShadow:'0 1px 4px rgba(0,0,0,.06)', display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ flex:'1 1 110px', minWidth:105 }}>
          <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>📅 From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp}/>
        </div>
        <div style={{ flex:'1 1 110px', minWidth:105 }}>
          <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>📅 To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp}/>
        </div>
        <div style={{ flex:'1 1 140px', minWidth:130 }}>
          <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>🏢 Department</label>
          <select value={dept} onChange={e => setDept(e.target.value)} style={inp}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ flex:'1 1 130px', minWidth:120 }}>
          <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>🌙 ND Type</label>
          <select value={ndType} onChange={e => setNdType(e.target.value)} style={inp}>
            <option>All</option>
            {ND_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex:'1 1 120px', minWidth:110 }}>
          <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>📌 Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inp}>
            <option>All</option>
            {Object.keys(PAY_STATUS).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ flex:'2 1 180px', minWidth:160 }}>
          <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>🔍 Search Name / ID / Designation</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={inp}/>
        </div>
        <button onClick={() => { setSearch(''); setDept('All Staffs'); setStatusFilter('All'); setNdType('All') }}
          style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:9, cursor:'pointer', color:'#64748b', whiteSpace:'nowrap' }}>
          ↺ Reset
        </button>
      </div>

      {/* ── BULK ACTIONS ── */}
      {bulkSel.length > 0 && (
        <div style={{ background:'#f5f3ff', border:'none', borderBottom:'2px solid #ddd6fe',
          padding:'8px 16px', flexShrink:0, display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:10, fontWeight:700, color:'#4c1d95' }}>🌙 {bulkSel.length} selected</span>
          <button onClick={bulkApprove}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#059669', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>
            ✅ Bulk Approve
          </button>
          <button onClick={() => setShowSync(true)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', background:A, color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>
            💳 Sync to Payroll
          </button>
          <button onClick={() => { setRows(p => p.map(r => bulkSel.includes(r.sl) ? { ...r, status:'rejected', remarks:'Bulk rejected' } : r)); notify('❌ Rejected'); setBulkSel([]) }}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#dc2626', color:'#fff', fontSize:9, fontWeight:700, cursor:'pointer' }}>
            ❌ Bulk Reject
          </button>
          <button onClick={() => setBulkSel([])}
            style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #ddd6fe', background:'#fff', fontSize:9, cursor:'pointer', color:'#64748b' }}>
            ✕ Clear
          </button>
          <div style={{ marginLeft:'auto', fontSize:9, color:'#4c1d95', fontWeight:700 }}>
            Selected Total: NPR {filtered.filter(r => bulkSel.includes(r.sl)).reduce((s, r) => s + r.cumulativeAllowance, 0).toLocaleString()}
          </div>
        </div>
      )}

      {/* ── TABLE — dual scrollbars (X bottom, Y right) ── */}
      <div style={{
        flex:1, overflow:'auto', position:'relative',
        scrollbarWidth:'thin', scrollbarColor:`${A} #e2e8f0`,
      }}>
        <style>{`
          ::-webkit-scrollbar { width: 10px; height: 10px }
          ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 5px }
          ::-webkit-scrollbar-thumb { background: ${A}; border-radius: 5px }
          ::-webkit-scrollbar-thumb:hover { background: #312e81 }
          ::-webkit-scrollbar-corner { background: #f1f5f9 }
        `}</style>

        <table style={{ width:'max-content', minWidth:'100%', borderCollapse:'collapse', fontSize:9.5 }}>
          <thead style={{ position:'sticky', top:0, zIndex:10 }}>
            {/* GROUP ROW */}
            <tr>
              <GH lbl="SEL"             span={2}  bg="#1e1b4b"/>
              <GH lbl="EMPLOYEE INFO"   span={7}  bg="#0c4a6e"/>
              <GH lbl="NIGHT DUTY LOG"  span={5}  bg="#312e81"/>
              <GH lbl="ALLOWANCE CALC"  span={5}  bg="#78350f"/>
              <GH lbl="CUMULATIVE"      span={3}  bg="#14532d"/>
              <GH lbl="PAYROLL SYNC"    span={2}  bg="#134e4a"/>
              <GH lbl="WORKFLOW"        span={3}  bg="#1e3a5f"/>
              <GH lbl="ACTION"          span={1}  bg="#1e1b4b"/>
            </tr>
            {/* COLUMN ROW */}
            <tr>
              {/* Checkbox + Sl */}
              <th style={{ padding:'7px 5px', background:'#1e1b4b', color:'#fff', fontSize:9, width:30, position:'sticky', top:0, zIndex:2 }}>
                <input type="checkbox"
                  checked={bulkSel.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll} style={{ cursor:'pointer' }}/>
              </th>
              <CH lbl="Sl.No"        w={42}  bg="#1e1b4b"/>
              {/* Employee */}
              <CH lbl="Emp ID"       w={80}  bg="#0c4a6e"/>
              <CH lbl="Name"         w={135} bg="#0c4a6e"/>
              <CH lbl="Designation"  w={115} bg="#0c4a6e"/>
              <CH lbl="Department"   w={115} bg="#0c4a6e"/>
              <CH lbl="Shift"        w={65}  bg="#0c4a6e"/>
              <CH lbl="Emp Status"   w={75}  bg="#0c4a6e"/>
              <CH lbl="Date"         w={90}  bg="#0c4a6e"/>
              {/* Night duty */}
              <CH lbl="Day"          w={45}  bg="#312e81"/>
              <CH lbl="ND Type"      w={110} bg="#312e81"/>
              <CH lbl="Night Start" sub="HH:MM" w={75} bg="#312e81"/>
              <CH lbl="Night End"   sub="HH:MM" w={75} bg="#312e81"/>
              <CH lbl="Night Hrs"   sub="total"  w={65} bg="#312e81"/>
              {/* Allowance calc */}
              <CH lbl="Pay Mode"     w={120} bg="#78350f"/>
              <CH lbl="Base Salary" sub="NPR/mo" w={85} bg="#78350f"/>
              <CH lbl="Rate/Unit"   sub="NPR"    w={70} bg="#78350f"/>
              <CH lbl="Per Night"   sub="NPR"    w={75} bg="#78350f"/>
              <CH lbl="Formula"      w={120} bg="#78350f"/>
              {/* Cumulative */}
              <CH lbl="Nights" sub="This Period" w={65} bg="#14532d"/>
              <CH lbl="Cumulative" sub="NPR" w={90} bg="#14532d"/>
              <CH lbl="Period"       w={85}  bg="#14532d"/>
              {/* Payroll */}
              <CH lbl="Payroll Ref"  w={110} bg="#134e4a"/>
              <CH lbl="Sync Status"  w={95}  bg="#134e4a"/>
              {/* Workflow */}
              <CH lbl="Status"       w={100} bg="#1e3a5f"/>
              <CH lbl="Approved By"  w={95}  bg="#1e3a5f"/>
              <CH lbl="Remarks"      w={110} bg="#1e3a5f"/>
              {/* Action */}
              <CH lbl="Action"       w={80}  bg="#1e1b4b"/>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r, i) => {
              const sc       = PAY_STATUS[r.status] || PAY_STATUS.pending
              const isSelected = bulkSel.includes(r.sl)
              const rowBg    = isSelected ? '#f5f3ff'
                             : r.isWeekend ? '#fefce8'
                             : i % 2 === 0 ? '#fff' : '#fafafa'
              const formulaStr = r.payMode === 'Fixed Per Night'
                ? `NPR ${r.fixedRate}/night`
                : r.payMode === 'Hourly Rate'
                ? `NPR ${r.fixedRate} × ${r.nightHrs}h`
                : r.payMode === '% of Basic Salary'
                ? `${r.fixedRate}% of NPR ${r.baseSalary?.toLocaleString()}/22`
                : `Custom`

              return (
                <tr key={r.sl}
                  style={{ background:rowBg, transition:'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                  {/* Checkbox */}
                  <td style={{ padding:'5px 6px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleBulk(r.sl)} style={{ cursor:'pointer' }}/>
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontWeight:700, color:'#64748b', borderBottom:'1px solid #f1f5f9', fontSize:9 }}>{r.sl}</td>
                  {/* Employee */}
                  <td style={{ padding:'5px 6px', textAlign:'center', fontFamily:'monospace', fontSize:8.5, color:'#0369a1', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{r.empId}</td>
                  <td style={{ padding:'5px 7px', fontWeight:700, color:'#0f172a', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>
                    <span style={{ marginRight:3 }}>🌙</span>{r.name}
                  </td>
                  <td style={{ padding:'5px 6px', fontSize:8.5, color:'#475569', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{r.designation}</td>
                  <td style={{ padding:'5px 6px', fontSize:8.5, color:'#475569', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{r.dept}</td>
                  <td style={{ padding:'5px 6px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ background:G, color:'#fff', fontSize:7.5, fontWeight:700, padding:'2px 6px', borderRadius:20 }}>{r.shift}</span>
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ background:'#f1f5f9', color:'#475569', fontSize:7.5, fontWeight:600, padding:'2px 6px', borderRadius:20 }}>{r.empStatus}</span>
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontSize:9, color:'#374151', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>
                    {r.date}
                  </td>
                  {/* Night duty */}
                  <td style={{ padding:'5px 6px', textAlign:'center', fontSize:9, color: r.isWeekend?'#d97706':'#64748b', fontWeight:r.isWeekend?700:400, borderBottom:'1px solid #f1f5f9' }}>
                    {r.day}{r.isWeekend && <span style={{ fontSize:8, color:'#d97706' }}> WE</span>}
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ background:A+'15', color:A, fontSize:7.5, fontWeight:700, padding:'2px 7px', borderRadius:20, whiteSpace:'nowrap' }}>{r.ndType}</span>
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontFamily:'monospace', fontSize:9, fontWeight:700, color:'#312e81', borderBottom:'1px solid #f1f5f9', background:'#f5f3ff' }}>{r.nightStart}</td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontFamily:'monospace', fontSize:9, fontWeight:700, color:'#312e81', borderBottom:'1px solid #f1f5f9', background:'#f5f3ff' }}>{r.nightEnd}</td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontWeight:800, color:A, borderBottom:'1px solid #f1f5f9', background:'#f5f3ff' }}>{r.nightHrs}h</td>
                  {/* Allowance */}
                  <td style={{ padding:'5px 6px', fontSize:8, color:'#475569', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{r.payMode}</td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontSize:9, color:'#374151', borderBottom:'1px solid #f1f5f9' }}>
                    {r.baseSalary?.toLocaleString()}
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontSize:9, fontWeight:700, color:'#78350f', borderBottom:'1px solid #f1f5f9' }}>{r.fixedRate}</td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontWeight:800, color:'#059669', borderBottom:'1px solid #f1f5f9', background:'#f0fdf4' }}>
                    {r.allowancePerNight?.toLocaleString()}
                  </td>
                  <td style={{ padding:'5px 6px', fontSize:7.5, color:'#94a3b8', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{formulaStr}</td>
                  {/* Cumulative */}
                  <td style={{ padding:'5px 6px', textAlign:'center', fontWeight:700, color:'#0369a1', borderBottom:'1px solid #f1f5f9' }}>{r.nightsThisMonth}</td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontWeight:800, color:'#7c3aed', borderBottom:'1px solid #f1f5f9', background:'#faf5ff', fontSize:10 }}>
                    {r.cumulativeAllowance?.toLocaleString()}
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontSize:8.5, fontFamily:'monospace', color:'#64748b', borderBottom:'1px solid #f1f5f9' }}>{r.payrollPeriod}</td>
                  {/* Payroll */}
                  <td style={{ padding:'5px 6px', textAlign:'center', fontSize:8, fontFamily:'monospace', color:r.payrollRef==='—'?'#94a3b8':'#059669', fontWeight:r.payrollRef!=='—'?700:400, borderBottom:'1px solid #f1f5f9' }}>{r.payrollRef}</td>
                  <td style={{ padding:'5px 6px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                    {['synced','paid'].includes(r.status)
                      ? <span style={{ background:'#f5f3ff', color:'#7c3aed', fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>💳 Synced</span>
                      : r.status === 'approved'
                      ? <button onClick={() => { setRows(p => p.map(x => x.sl===r.sl ? {...x,status:'synced',payrollRef:`PR-${r.payrollPeriod}-${String(r.sl).padStart(4,'0')}`}:x)); notify('💳 Synced to payroll') }}
                          style={{ padding:'3px 8px', borderRadius:6, border:'none', background:'#7c3aed', color:'#fff', fontSize:7.5, fontWeight:700, cursor:'pointer' }}>
                          💳 Sync
                        </button>
                      : <span style={{ color:'#94a3b8', fontSize:9 }}>—</span>}
                  </td>
                  {/* Workflow */}
                  <td style={{ padding:'5px 6px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                    <span style={{ background:sc.bg, color:sc.c, fontSize:8, fontWeight:700, padding:'3px 7px', borderRadius:20, border:`1px solid ${sc.b}`, whiteSpace:'nowrap' }}>
                      {sc.icon} {sc.l}
                    </span>
                  </td>
                  <td style={{ padding:'5px 6px', textAlign:'center', fontSize:8, color:'#475569', borderBottom:'1px solid #f1f5f9' }}>{r.approvedBy}</td>
                  <td style={{ padding:'5px 6px', fontSize:8, color:'#94a3b8', borderBottom:'1px solid #f1f5f9', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.remarks}</td>
                  {/* Action */}
                  <td style={{ padding:'5px 6px', textAlign:'center', borderBottom:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', gap:4, justifyContent:'center', flexWrap:'wrap' }}>
                      <button onClick={() => {
                        setForm({ name:r.name, empId:r.empId, designation:r.designation||'', dept:r.dept, shift:r.shift, empStatus:r.empStatus, date:r.date, ndType:r.ndType, nightStart:r.nightStart, nightEnd:r.nightEnd, payMode:r.payMode, fixedRate:String(r.fixedRate), baseSalary:String(r.baseSalary||''), remarks:r.remarks==='—'?'':r.remarks })
                        setEditSl(r.sl); setShowAdd(true)
                      }} style={{ padding:'3px 7px', borderRadius:6, border:'none', background:'#eff6ff', color:'#1d4ed8', fontSize:7.5, fontWeight:700, cursor:'pointer' }}>✏️</button>
                      {r.status === 'pending' && (
                        <button onClick={() => { setRows(p => p.map(x => x.sl===r.sl ? {...x,status:'approved',approvedBy:'HR Manager'}:x)); notify('✅ Approved') }}
                          style={{ padding:'3px 7px', borderRadius:6, border:'none', background:'#f0fdf4', color:'#059669', fontSize:7.5, fontWeight:700, cursor:'pointer' }}>✅</button>
                      )}
                      {['pending','approved'].includes(r.status) && (
                        <button onClick={() => { setRows(p => p.map(x => x.sl===r.sl ? {...x,status:'rejected',remarks:'Rejected'}:x)); notify('❌ Rejected') }}
                          style={{ padding:'3px 7px', borderRadius:6, border:'none', background:'#fef2f2', color:'#dc2626', fontSize:7.5, fontWeight:700, cursor:'pointer' }}>❌</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* FOOTER TOTALS */}
          <tfoot>
            <tr style={{ background:'#1e1b4b', color:'#fff', position:'sticky', bottom:0 }}>
              <td colSpan={7} style={{ padding:'7px 10px', fontWeight:800, fontSize:10 }}>
                TOTALS — {filtered.length} records · {period}
              </td>
              <td colSpan={5}/>
              <td colSpan={2}/>
              <td style={{ padding:'7px', textAlign:'center', fontWeight:800, color:'#c4b5fd' }}>
                {totalNightHrs.toFixed(2)}h
              </td>
              <td colSpan={4}/>
              <td style={{ padding:'7px', textAlign:'center', fontWeight:800, color:'#86efac' }}>
                {totalNights}
              </td>
              <td style={{ padding:'7px', textAlign:'center', fontWeight:800, color:'#fcd34d', fontSize:11 }}>
                NPR {totalAllowance.toLocaleString()}
              </td>
              <td colSpan={5}/>
              <td/>
            </tr>
          </tfoot>
        </table>

        {filtered.length === 0 && (
          <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8', fontSize:12 }}>
            No night duty records found for selected filters.
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ background:'#fff', padding:'5px 16px', borderTop:'1px solid #f1f5f9', flexShrink:0,
        display:'flex', gap:16, fontSize:8.5, color:'#64748b', flexWrap:'wrap' }}>
        {Object.entries(PAY_STATUS).map(([k, v]) => (
          <span key={k} style={{ background:v.bg, color:v.c, padding:'2px 8px', borderRadius:20, border:`1px solid ${v.b}`, fontWeight:600 }}>
            {v.icon} {v.l}
          </span>
        ))}
        <span style={{ marginLeft:'auto', opacity:.7, fontSize:8 }}>
          🌙 WE = Weekend Night · Payroll Formula: OT = Basic/(22×8)×hrs×rate · Fixed/night or % of salary
        </span>
      </div>

      {/* ── PAYROLL SYNC MODAL ── */}
      {showSync && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:12 }} onClick={() => setShowSync(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:0, width:520, maxWidth:'96vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ background:G, padding:'13px 20px', borderRadius:'16px 16px 0 0', color:'#fff' }}>
              <div style={{ fontSize:14, fontWeight:900 }}>💳 Sync Night Duty Allowances to Payroll</div>
              <div style={{ fontSize:9, opacity:.8, marginTop:2 }}>{bulkSel.length} records · Total: NPR {filtered.filter(r => bulkSel.includes(r.sl)).reduce((s,r)=>s+r.cumulativeAllowance,0).toLocaleString()}</div>
            </div>
            <div style={{ padding:'16px 20px' }}>
              <div style={{ background:'#f5f3ff', borderRadius:10, padding:'12px', marginBottom:14, fontSize:10, color:'#4c1d95', lineHeight:2 }}>
                <div>📅 <b>Payroll Period:</b> {filtered[0]?.payrollPeriod || today.slice(0,7)}</div>
                <div>🌙 <b>Records:</b> {bulkSel.length} employees</div>
                <div>💰 <b>Total Night Duty Allowance:</b> NPR {filtered.filter(r=>bulkSel.includes(r.sl)).reduce((s,r)=>s+r.cumulativeAllowance,0).toLocaleString()}</div>
                <div>📊 <b>This will:</b> Add to salary component → Include in monthly payslip → Mark as payroll-synced</div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:8.5, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Payroll Month</label>
                <input type="month" defaultValue={today.slice(0,7)} style={inp}/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:8.5, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Approved By (Payroll Officer / HR Manager)</label>
                <select style={inp}>
                  <option>HR Manager</option>
                  <option>Payroll Officer</option>
                  <option>Finance Manager</option>
                </select>
              </div>
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:9, color:'#92400e' }}>
                ⚠️ Once synced, allowances will be locked and included in the monthly payroll run. This cannot be undone without payroll admin override.
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={bulkSyncPayroll}
                  style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  💳 Confirm Payroll Sync
                </button>
                <button onClick={() => setShowSync(false)}
                  style={{ padding:'10px 16px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', fontSize:11, cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MODAL ── */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:12 }} onClick={() => setShowAdd(false)}>
          <div style={{ background:'#fff', borderRadius:16, padding:0, width:680, maxWidth:'97vw', maxHeight:'94vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ background:G, padding:'13px 20px', borderRadius:'16px 16px 0 0', color:'#fff' }}>
              <div style={{ fontSize:14, fontWeight:900 }}>{editSl ? '✏️ Edit' : '+ Add'} Night Duty Entry</div>
              <div style={{ fontSize:9, opacity:.8, marginTop:1 }}>Allowance auto-calculated · Entry queued for HR approval → Payroll sync</div>
            </div>
            <div style={{ padding:'16px 20px' }}>
              {/* Employee Info */}
              <div style={{ fontSize:9, fontWeight:800, color:A, borderBottom:'1px solid #f1f5f9', paddingBottom:5, marginBottom:10 }}>👤 Employee Information</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                {[['Employee Name *','name','text'],['Employee ID *','empId','text']].map(([l,k,t]) => (
                  <div key={k}>
                    <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>{l}</label>
                    <input type={t} value={form[k]} onChange={e => sf(k,e.target.value)} style={inp} placeholder={l.replace(' *','')+'...'}/>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Designation</label>
                  <select value={form.designation} onChange={e => sf('designation',e.target.value)} style={inp}>
                    <option value="">— Select —</option>
                    {DESIGNATIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Department</label>
                  <select value={form.dept} onChange={e => sf('dept',e.target.value)} style={inp}>
                    <option value="">— Select —</option>
                    {DEPARTMENTS.slice(1).map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Shift</label>
                  <select value={form.shift} onChange={e => sf('shift',e.target.value)} style={inp}>
                    {SHIFTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Employment Status</label>
                  <select value={form.empStatus} onChange={e => sf('empStatus',e.target.value)} style={inp}>
                    {EMP_STATUS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Night Duty Details */}
              <div style={{ fontSize:9, fontWeight:800, color:'#312e81', borderBottom:'1px solid #f1f5f9', paddingBottom:5, marginBottom:10 }}>🌙 Night Duty Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Date *</label>
                  <input type="date" value={form.date} onChange={e => sf('date',e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Night Start</label>
                  <input type="time" value={form.nightStart} onChange={e => sf('nightStart',e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Night End (next day)</label>
                  <input type="time" value={form.nightEnd} onChange={e => sf('nightEnd',e.target.value)} style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Night Duty Type</label>
                  <select value={form.ndType} onChange={e => sf('ndType',e.target.value)} style={inp}>
                    {ND_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Allowance Calculation */}
              <div style={{ fontSize:9, fontWeight:800, color:'#78350f', borderBottom:'1px solid #f1f5f9', paddingBottom:5, marginBottom:10 }}>💰 Allowance Calculation</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Pay Mode</label>
                  <select value={form.payMode} onChange={e => sf('payMode',e.target.value)} style={inp}>
                    {PAY_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>
                    {form.payMode === 'Fixed Per Night' ? 'Fixed Amount (NPR/night)'
                     : form.payMode === 'Hourly Rate' ? 'Rate (NPR/hr)'
                     : form.payMode === '% of Basic Salary' ? 'Percentage (%)'
                     : 'Custom Amount (NPR)'}
                  </label>
                  <input type="number" value={form.fixedRate} onChange={e => sf('fixedRate',e.target.value)} style={inp} placeholder="Enter amount..."/>
                </div>
                {form.payMode === '% of Basic Salary' && (
                  <div>
                    <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Base Salary (NPR/month)</label>
                    <input type="number" value={form.baseSalary} onChange={e => sf('baseSalary',e.target.value)} style={inp} placeholder="e.g. 45000"/>
                  </div>
                )}
              </div>

              {/* Live preview */}
              <div style={{ background:'linear-gradient(135deg,#f5f3ff,#fffbeb)', border:'1px solid #ddd6fe', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:10 }}>
                <div style={{ fontWeight:800, color:'#4c1d95', marginBottom:5 }}>🌙 Allowance Preview (Auto-Calculated)</div>
                <div style={{ display:'flex', gap:20, color:'#374151', flexWrap:'wrap' }}>
                  <span>⏱ <b>{previewHrs.toFixed(2)}h</b> night hrs</span>
                  <span>📅 Date: <b>{form.date}</b></span>
                  <span>💰 Mode: <b>{form.payMode}</b></span>
                  <span style={{ color:'#7c3aed', fontWeight:800, fontSize:11 }}>= NPR <b>{previewAllowance.toLocaleString()}</b> / night</span>
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:8, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Remarks</label>
                <textarea value={form.remarks} onChange={e => sf('remarks',e.target.value)} rows={2}
                  style={{ ...inp, resize:'vertical', fontFamily:'inherit' }}
                  placeholder="Reason for night duty, project name, special assignment..."/>
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleSave}
                  style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:G, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
                  💾 {editSl ? 'Update' : 'Save'} Night Duty Entry
                </button>
                <button onClick={() => { setShowAdd(false); setEditSl(null) }}
                  style={{ padding:'10px 16px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', fontSize:11, cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
