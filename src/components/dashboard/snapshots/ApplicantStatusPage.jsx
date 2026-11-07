// FILE: src/components/dashboard/snapshots/ApplicantStatusPage.jsx
// eLogix HRMS — Applicant Status
// Path: Employee Lifecycle > Recruitment & Hiring > Recruitment Management > Applicant Status
// Features: Inline editable cells, right-click context menu, Save/Print/Export/Import
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Session helper ─────────────────────────────────────────────
function getSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session') || localStorage.getItem('elogix_session') || 'null')
    return s || {}
  } catch(_e) { return {} }
}

// ── Color maps ─────────────────────────────────────────────────
const STATUS_COLORS = {
  'On-board':                  { bg:'#dcfce7', color:'#166534', border:'#bbf7d0' },
  'Interviewed':               { bg:'#dbeafe', color:'#1e40af', border:'#bfdbfe' },
  'WIP':                       { bg:'#fef9c3', color:'#854d0e', border:'#fde68a' },
  'Hold':                      { bg:'#f3e8ff', color:'#6b21a8', border:'#e9d5ff' },
  'Not Interested':            { bg:'#fee2e2', color:'#991b1b', border:'#fecaca' },
  'Not Selected':              { bg:'#fee2e2', color:'#991b1b', border:'#fecaca' },
  'Criteria not matched':      { bg:'#fff7ed', color:'#9a3412', border:'#fed7aa' },
  'Call Unreachable':          { bg:'#f1f5f9', color:'#475569', border:'#e2e8f0' },
  'Candidate decision Pending':{ bg:'#fef3c7', color:'#92400e', border:'#fde68a' },
  'Client Side Interview':     { bg:'#ede9fe', color:'#5b21b6', border:'#ddd6fe' },
  'First Round Interview':     { bg:'#cffafe', color:'#0e7490', border:'#a5f3fc' },
  'Location not preffered':    { bg:'#fce7f3', color:'#9d174d', border:'#fbcfe8' },
  'Working in Another Job':    { bg:'#f0fdf4', color:'#166534', border:'#bbf7d0' },
  'Interview Not Attended':    { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
  'default':                   { bg:'#f8fafc', color:'#475569', border:'#e2e8f0' },
}

function statusStyle(s) { return STATUS_COLORS[s] || STATUS_COLORS.default }

const SOURCES = ['Facebook','LinkedIn','Website','Google Form','Job Jee','Mero Tuiter',
  'Shram Bank','Vocal Panda','Job Fair','Phone Call','WhatsApp','Office Visit','Mail',
  'Old List','Reference','Instagram','Twitter','YouTube','TikTok','Other']

const WORKING_STATUS = ['Employed','Resigned','Fresher']
const STATUSES = Object.keys(STATUS_COLORS).filter(k => k !== 'default')
const VEHICLE = ['Yes','No']

// ── Breadcrumb ─────────────────────────────────────────────────
function Breadcrumb() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#64748b',
      padding:'6px 0', flexWrap:'wrap' }}>
      {['Employee Lifecycle Management','Recruitment & Hiring','Recruitment Management','Applicant Status']
        .map((part,i,arr) => (
          <span key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color: i===arr.length-1 ? '#0369a1' : '#94a3b8', fontWeight: i===arr.length-1 ? 700 : 400 }}>
              {part}
            </span>
            {i < arr.length-1 && <span style={{ color:'#d1d5db' }}>›</span>}
          </span>
        ))}
    </div>
  )
}

// ── Column definitions ─────────────────────────────────────────
const COLS = [
  { key:'sn',               label:'S.N',          w:50,  type:'number',   fixed:true },
  { key:'candidateCode',    label:'Candidate Code', w:130, type:'text'   },
  { key:'pooledBy',         label:'Pooled By',     w:130, type:'text'   },
  { key:'candidateName',    label:'Candidate Name', w:140, type:'text'  },
  { key:'contact',          label:'Contact',        w:120, type:'text'   },
  { key:'email',            label:'Email',          w:160, type:'text'   },
  { key:'position',         label:'Position',       w:150, type:'text'   },
  { key:'currentAddress',   label:'Current Address', w:140, type:'text'  },
  { key:'permanentAddress', label:'Permanent Address', w:140, type:'text' },
  { key:'preferredLocation',label:'Preferred Location', w:130, type:'text' },
  { key:'dobEng',           label:'DOB (Eng)',      w:110, type:'text'   },
  { key:'dobNep',           label:'DOB (Nep)',      w:110, type:'text'   },
  { key:'qualification',    label:'Qualification',  w:150, type:'text'   },
  { key:'skills',           label:'Skills',         w:180, type:'text'   },
  { key:'experience',       label:'Experience',     w:220, type:'textarea' },
  { key:'workingStatus',    label:'Working Status', w:120, type:'select', options:WORKING_STATUS },
  { key:'reasonLeaving',    label:'Reason for Leaving', w:180, type:'text' },
  { key:'salaryExpectation',label:'Salary Expectation', w:120, type:'text' },
  { key:'vehicle',          label:'Vehicle',        w:80,  type:'select', options:VEHICLE },
  { key:'drivingLicense',   label:'Driving License', w:110, type:'select', options:VEHICLE },
  { key:'citizenship',      label:'Citizenship',    w:90,  type:'select', options:VEHICLE },
  { key:'abroadPlanning',   label:'Abroad Plan',    w:90,  type:'select', options:VEHICLE },
  { key:'status',           label:'Status',         w:180, type:'select', options:STATUSES },
  { key:'leadsEntryDate',   label:'Leads Entry Date', w:120, type:'text' },
  { key:'followUpDate',     label:'Follow Up Date', w:120, type:'text'   },
  { key:'callDescription',  label:'Call Description', w:200, type:'textarea' },
  { key:'interviewDate',    label:'Interview Date', w:120, type:'text'   },
  { key:'doj',              label:'DOJ',            w:110, type:'text'   },
  { key:'client',           label:'Client',         w:140, type:'text'   },
  { key:'location',         label:'Location',       w:120, type:'text'   },
  { key:'post',             label:'Post',           w:140, type:'text'   },
  { key:'vacancyCode',      label:'Vacancy Code',   w:130, type:'text'   },
  { key:'followupCount',    label:'Followup Count', w:100, type:'number'  },
  { key:'cvLink',           label:'CV Link',        w:120, type:'text'   },
  { key:'month',            label:'Month',          w:90,  type:'text'   },
  { key:'source',           label:'Source',         w:120, type:'select', options:SOURCES },
  { key:'remarks',          label:'Remarks',        w:200, type:'textarea' },
]

// ── Format Excel serial date ──────────────────────────────────
function fmtDate(val) {
  if (!val) return ''
  const n = Number(val)
  if (!isNaN(n) && n > 40000) {
    const d = new Date(1900, 0, n - 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }
  return String(val)
}

const STORAGE_KEY = 'elogix_applicant_status'

// ── Load data: API-first, localStorage cache fallback, never hardcoded ──
async function fetchApplicants(companySlug, token) {
  if (!companySlug || !token) return null
  try {
    const res = await fetch(`/api/v1/recruitment/applicants`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
    if (!res.ok) return null
    return await res.json()
  } catch(_e) {
    return null
  }
}

function loadCachedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch(_e) { return [] }
}

// ── Cell component — inline editable ──────────────────────────
function Cell({ value, col, onChange, isEditing, onStartEdit, onEndEdit }) {
  const [local, setLocal] = useState(value)
  const ref = useRef(null)

  useEffect(() => { setLocal(value) }, [value])
  useEffect(() => { if (isEditing && ref.current) ref.current.focus() }, [isEditing])

  const commit = () => { onChange(local); onEndEdit() }

  const ss = { // shared cell style
    padding:'6px 8px', fontSize:12, minHeight:28,
    width:'100%', boxSizing:'border-box', lineHeight:1.4,
    fontFamily:"'Segoe UI',system-ui,sans-serif", border:'none',
    background:'transparent', outline:'none', color:'#0f172a',
  }

  if (!isEditing) {
    if (col.key === 'status') {
      const st = statusStyle(value)
      return (
        <div onDoubleClick={onStartEdit} style={{ cursor:'default', padding:'4px 6px' }}>
          {value ? (
            <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}`,
              fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
              display:'inline-block', whiteSpace:'nowrap' }}>
              {value}
            </span>
          ) : <span style={{ color:'#d1d5db', fontSize:11 }}>—</span>}
        </div>
      )
    }
    if (col.key === 'cvLink' && value) {
      return (
        <div onDoubleClick={onStartEdit} style={{ padding:'4px 6px' }}>
          <a href={value} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:11, color:'#0369a1', textDecoration:'underline' }}
            onClick={e => e.stopPropagation()}>
            View CV
          </a>
        </div>
      )
    }
    return (
      <div onDoubleClick={onStartEdit} style={{
        padding:'4px 6px', fontSize:11, color: value ? '#0f172a' : '#d1d5db',
        cursor:'default', whiteSpace: col.type==='textarea' ? 'pre-wrap' : 'nowrap',
        overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%',
        lineHeight:1.4,
      }}>
        {value || '—'}
      </div>
    )
  }

  if (col.type === 'select') {
    return (
      <select ref={ref} value={local} onChange={e => setLocal(e.target.value)}
        onBlur={commit} style={{ ...ss, cursor:'pointer' }}>
        <option value="">— select —</option>
        {col.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (col.type === 'textarea') {
    return (
      <textarea ref={ref} value={local} rows={3}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key==='Escape') { setLocal(value); onEndEdit() } }}
        style={{ ...ss, resize:'vertical', minHeight:60, background:'#fffbe6',
          border:'1px solid #fbbf24', borderRadius:4 }}/>
    )
  }
  return (
    <input ref={ref} type={col.type === 'number' ? 'number' : 'text'}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key==='Enter') commit()
        if (e.key==='Escape') { setLocal(value); onEndEdit() }
      }}
      style={{ ...ss, background:'#fffbe6', border:'1px solid #fbbf24', borderRadius:4 }}/>
  )
}

// ── Context Menu ───────────────────────────────────────────────
function ContextMenu({ x, y, row, col, onClose, onAddRowAbove, onAddRowBelow,
  onDeleteRow, onClearCell, onCopyRow, onSaveRow }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const items = [
    { icon:'💾', label:'Save Row',          action: onSaveRow,     color:'#16a34a' },
    { icon:'➕', label:'Add Row Above',      action: onAddRowAbove  },
    { icon:'➕', label:'Add Row Below',      action: onAddRowBelow  },
    { icon:'📋', label:'Copy Row',           action: onCopyRow      },
    null,
    { icon:'🗑️', label:'Clear Cell',         action: onClearCell    },
    { icon:'🗑️', label:'Delete Row',         action: onDeleteRow, color:'#dc2626' },
  ]

  return (
    <div ref={ref} style={{
      position:'fixed', left:x, top:y, zIndex:9999,
      background:'#fff', border:'1px solid #e2e8f0', borderRadius:10,
      boxShadow:'0 8px 32px rgba(0,0,0,.18)', minWidth:200,
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      overflow:'hidden',
    }}>
      <div style={{ padding:'6px 12px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9',
        fontSize:10, color:'#64748b', fontWeight:600 }}>
        Row {row?.sn} {col ? `· ${COLS.find(c=>c.key===col)?.label}` : ''}
      </div>
      {items.map((item, i) =>
        item === null
          ? <div key={i} style={{ height:1, background:'#f1f5f9', margin:'2px 0' }}/>
          : (
            <button key={i} onClick={() => { item.action?.(); onClose() }}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%',
                padding:'9px 14px', border:'none', background:'transparent',
                fontSize:12, cursor:'pointer', color: item.color || '#374151',
                textAlign:'left', transition:'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <span style={{ fontSize:15 }}>{item.icon}</span>
              {item.label}
            </button>
          )
      )}
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────
export default function ApplicantStatusPage() {
  const sess    = getSession()
  const company = sess.company || {}
  const user    = sess.user    || {}

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // {rowIdx, colKey}
  const [ctx,     setCtx]     = useState(null)   // context menu
  const [search,  setSearch]  = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [saved,   setSaved]   = useState(false)
  const [toast,   setToast]   = useState('')
  const [clipboard, setClipboard] = useState(null)
  const tableRef = useRef(null)

  const notify = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // Load data on mount: API-first, localStorage cache fallback, never hardcoded
  useEffect(() => {
    async function load() {
      setLoading(true)
      const token = sess.access_token || localStorage.getItem('access_token')
      const slug  = company.slug

      const apiData = await fetchApplicants(slug, token)
      if (apiData && Array.isArray(apiData)) {
        setRows(apiData)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(apiData)) } catch(_e) {}
      } else {
        // Fall back to localStorage cache (no data if cache also empty)
        setRows(loadCachedData())
      }
      setLoading(false)
    }
    load()
  }, [])

  // Auto-save to localStorage whenever rows change
  const save = useCallback((data=rows) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      notify('✅ Saved successfully')
    } catch(_e) { notify('❌ Save failed') }
  }, [rows])

  // Cell update
  const updateCell = (rowIdx, colKey, val) => {
    setRows(prev => {
      const next = prev.map((r,i) => i===rowIdx ? {...r, [colKey]: val} : r)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  // Context menu handler
  const handleContextMenu = (e, rowIdx, colKey) => {
    e.preventDefault()
    setEditing(null)
    setCtx({ x:e.clientX, y:e.clientY, rowIdx, colKey })
  }

  // Add row
  const addRow = (idx, above=false) => {
    const pos = above ? idx : idx+1
    const lastSn = Math.max(...rows.map(r => Number(r.sn)||0), 0)
    const newRow = COLS.reduce((acc,c) => ({...acc,[c.key]:''}), {})
    newRow.sn = lastSn+1
    newRow.candidateCode = `AL-${String(lastSn+1).padStart(6,'0')}`
    newRow.leadsEntryDate = new Date().toISOString().split('T')[0]
    setRows(prev => { const next=[...prev]; next.splice(pos,0,newRow); return next })
    notify('➕ Row added')
  }

  // Delete row
  const deleteRow = (idx) => {
    if (!window.confirm('Delete this row?')) return
    setRows(prev => prev.filter((_,i) => i!==idx))
    notify('🗑️ Row deleted')
  }

  // Export CSV
  const exportCSV = () => {
    const headers = COLS.map(c => `"${c.label}"`).join(',')
    const body    = rows.map(r => COLS.map(c => `"${(r[c.key]||'').toString().replace(/"/g,'""')}"`).join(','))
    const csv     = [headers, ...body].join('\n')
    const blob    = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a'); a.href=url
    a.download    = `Applicant_Status_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    notify('📤 Exported CSV')
  }

  // Export Excel (XLSX-like via CSV with BOM)
  const exportXLSX = () => { exportCSV() }  // CSV works in Excel

  // Import CSV
  const importCSV = () => {
    const input = document.createElement('input')
    input.type  = 'file'
    input.accept= '.csv,.xlsx,.xls'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const text  = ev.target.result.replace(/\r/g,'')
          const lines = text.split('\n').filter(Boolean)
          const hdrs  = lines[0].split(',').map(h => h.replace(/"/g,'').trim())
          const newRows = lines.slice(1).map((line, i) => {
            const vals = line.split(',').map(v => v.replace(/^"|"$/g,'').trim())
            const row  = { sn: i+1 }
            hdrs.forEach((h,j) => {
              const col = COLS.find(c => c.label===h || c.key===h)
              if (col) row[col.key] = vals[j] || ''
            })
            return row
          })
          if (window.confirm(`Import ${newRows.length} rows? This will append to existing data.`)) {
            setRows(prev => [...prev, ...newRows])
            notify(`✅ Imported ${newRows.length} rows`)
          }
        } catch(_e) { notify('❌ Import failed — check file format') }
      }
      reader.readAsText(file, 'UTF-8')
    }
    input.click()
  }

  // Print
  const handlePrint = () => {
    window.print()
    notify('🖨️ Sent to printer')
  }

  // Filter
  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (r.candidateName||'').toLowerCase().includes(q) ||
      (r.candidateCode||'').toLowerCase().includes(q) ||
      (r.position||'').toLowerCase().includes(q) ||
      (r.client||'').toLowerCase().includes(q) ||
      (r.pooledBy||'').toLowerCase().includes(q)
    const matchStatus = !filterStatus || r.status===filterStatus
    const matchSource = !filterSource || r.source===filterSource
    return matchSearch && matchStatus && matchSource
  })

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
        height:'100vh', fontFamily:"'Segoe UI',system-ui,sans-serif", color:'#64748b', fontSize:14 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>⏳</div>
          <div>Loading applicants...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position:'fixed', inset:0,
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#f0f9ff',
      overflowY:'scroll', overflowX:'hidden',
      scrollbarWidth:'thin', scrollbarColor:'#0369a1 #dbeafe',
      WebkitOverflowScrolling:'touch', zIndex:10,
    }}>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background: toast.startsWith('❌') ? '#fef2f2' : '#f0fdf4',
          border:`1px solid ${toast.startsWith('❌') ? '#fecaca' : '#bbf7d0'}`,
          borderRadius:10, padding:'10px 18px', fontSize:12,
          color: toast.startsWith('❌') ? '#dc2626' : '#065f46',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)', fontWeight:600 }}>
          {toast}
        </div>
      )}

      {/* Context Menu */}
      {ctx && (
        <ContextMenu
          x={ctx.x} y={ctx.y}
          row={rows[ctx.rowIdx]} col={ctx.colKey}
          onClose={() => setCtx(null)}
          onAddRowAbove={() => addRow(ctx.rowIdx, true)}
          onAddRowBelow={() => addRow(ctx.rowIdx, false)}
          onDeleteRow={() => deleteRow(ctx.rowIdx)}
          onClearCell={() => { updateCell(ctx.rowIdx, ctx.colKey, ''); notify('✓ Cell cleared') }}
          onCopyRow={() => { setClipboard({...rows[ctx.rowIdx]}); notify('📋 Row copied') }}
          onSaveRow={() => save()}
        />
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #applicant-table, #applicant-table * { visibility: visible !important; }
          #applicant-table { position: fixed; top:0; left:0; width:100%; }
          .no-print { display: none !important; }
        }
        .tbl-row:hover td { background: #f0f9ff !important; }
        .hdr-cell { position: sticky; top: 0; z-index: 10; }
        ::-webkit-scrollbar { height: 7px; width: 7px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #0369a1; border-radius: 4px; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%)',
        padding:'14px 20px', color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          flexWrap:'wrap', gap:10 }}>
          <div>
            <Breadcrumb />
            <div style={{ fontSize:18, fontWeight:900, marginTop:2 }}>
              👤 Applicant Status
            </div>
            <div style={{ fontSize:11, opacity:.8, marginTop:2 }}>
              {company.name || 'Your Company'} · {filtered.length} applicants
              {saved && <span style={{ marginLeft:10, background:'rgba(255,255,255,.2)',
                padding:'2px 10px', borderRadius:20, fontSize:10 }}>✓ Saved</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }} className="no-print">
            {[
              { label:'💾 Save',     action: () => save(),    bg:'#16a34a' },
              { label:'🖨️ Print',    action: handlePrint,     bg:'#0369a1' },
              { label:'📤 Export',   action: exportCSV,       bg:'#7c3aed' },
              { label:'📥 Import',   action: importCSV,       bg:'#0891b2' },
              { label:'➕ Add Row',  action: () => addRow(rows.length-1, false), bg:'#0369a1' },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action}
                style={{ padding:'8px 16px', borderRadius:9,
                  background:'rgba(255,255,255,.18)', color:'#fff',
                  fontSize:12, fontWeight:700, cursor:'pointer',
                  backdropFilter:'blur(4px)', transition:'background .15s',
                  border:'1px solid rgba(255,255,255,.3)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.3)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.18)'}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="no-print" style={{ background:'#fff', borderBottom:'1px solid #e2e8f0',
        padding:'10px 20px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search name, code, position, client..."
          style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, outline:'none', width:280, fontFamily:'inherit' }}/>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, fontFamily:'inherit', color:'#374151' }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, fontFamily:'inherit', color:'#374151' }}>
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || filterStatus || filterSource) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterSource('') }}
            style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
              background:'#fee2e2', color:'#dc2626', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            ✕ Clear
          </button>
        )}
        <span style={{ marginLeft:'auto', fontSize:11, color:'#64748b' }}>
          💡 Double-click any cell to edit · Right-click for more options
        </span>
      </div>

      {/* ── TABLE ── */}
      <div id="applicant-table" style={{ overflowX:'auto', padding:'16px 20px 60px',
        scrollbarWidth:'thin', scrollbarColor:'#94a3b8 #f1f5f9' }}>
        <table ref={tableRef} style={{ borderCollapse:'collapse', fontSize:12,
          background:'#fff', borderRadius:10, overflow:'hidden',
          boxShadow:'0 2px 12px rgba(0,0,0,.06)', width:'max-content', minWidth:'100%' }}>
          <thead>
            <tr style={{ background:'linear-gradient(135deg,#0369a1,#0ea5e9)', color:'#fff' }}>
              {COLS.map(col => (
                <th key={col.key} className="hdr-cell"
                  style={{ padding:'10px 10px', textAlign:'left', fontWeight:700,
                    fontSize:10, whiteSpace:'nowrap', width:col.w, minWidth:col.w,
                    letterSpacing:.3, background:'inherit',
                    borderRight:'1px solid rgba(255,255,255,.15)' }}>
                  {col.label}
                </th>
              ))}
              <th className="hdr-cell" style={{ padding:'10px', fontWeight:700,
                fontSize:10, background:'inherit', width:80 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, ri) => {
              const realIdx = rows.indexOf(row)
              return (
                <tr key={ri} className="tbl-row"
                  style={{ borderBottom:'1px solid #f1f5f9',
                    background: ri%2===0 ? '#fff' : '#fafafa' }}>
                  {COLS.map(col => {
                    const isEd = editing?.rowIdx===realIdx && editing?.colKey===col.key
                    return (
                      <td key={col.key}
                        style={{ padding:'1px', verticalAlign:'middle', position:'relative',
                          minWidth:col.w, maxWidth: col.type==='textarea' ? 300 : col.w,
                          borderRight:'1px solid #f1f5f9',
                          background: isEd ? '#fffbe6' : undefined }}
                        onContextMenu={(e) => handleContextMenu(e, realIdx, col.key)}>
                        <Cell
                          value={row[col.key]||''}
                          col={col}
                          onChange={val => updateCell(realIdx, col.key, val)}
                          isEditing={isEd}
                          onStartEdit={() => setEditing({rowIdx:realIdx, colKey:col.key})}
                          onEndEdit={() => setEditing(null)}
                        />
                      </td>
                    )
                  })}
                  <td style={{ padding:'4px 8px', whiteSpace:'nowrap', borderLeft:'1px solid #f1f5f9' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => save()}
                        title="Save"
                        style={{ padding:'3px 8px', borderRadius:6, border:'1px solid #bbf7d0',
                          background:'#f0fdf4', color:'#166534', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                        💾
                      </button>
                      <button onClick={() => addRow(realIdx, false)}
                        title="Add row below"
                        style={{ padding:'3px 8px', borderRadius:6, border:'1px solid #bfdbfe',
                          background:'#eff6ff', color:'#1d4ed8', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                        ➕
                      </button>
                      <button onClick={() => deleteRow(realIdx)}
                        title="Delete row"
                        style={{ padding:'3px 8px', borderRadius:6, border:'1px solid #fecaca',
                          background:'#fef2f2', color:'#dc2626', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLS.length+1} style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
                  <div style={{ fontSize:36 }}>🔍</div>
                  <div style={{ fontSize:14, fontWeight:600, marginTop:8 }}>No applicants found</div>
                  <div style={{ fontSize:12, marginTop:4 }}>
                    {rows.length === 0
                      ? 'No data loaded from API. Add applicants or import a CSV.'
                      : 'Try adjusting your search or filters'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Status legend */}
        <div className="no-print" style={{ marginTop:20, padding:'12px 16px',
          background:'#fff', borderRadius:10, border:'1px solid #e2e8f0',
          boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#374151', marginBottom:8 }}>
            Status Legend
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {STATUSES.map(s => {
              const st = statusStyle(s)
              return (
                <span key={s} style={{ background:st.bg, color:st.color,
                  border:`1px solid ${st.border}`, fontSize:10,
                  fontWeight:600, padding:'2px 10px', borderRadius:20 }}>
                  {s}
                </span>
              )
            })}
          </div>
        </div>

        {/* Summary stats */}
        <div className="no-print" style={{ marginTop:12, display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
          {[
            ['Total Applicants', rows.length, '👥', '#0369a1'],
            ['On-board', rows.filter(r=>r.status==='On-board').length, '✅', '#16a34a'],
            ['Interviewed', rows.filter(r=>r.status==='Interviewed').length, '🎤', '#0891b2'],
            ['Pending', rows.filter(r=>r.status==='Candidate decision Pending').length, '⏳', '#d97706'],
            ['Not Interested', rows.filter(r=>r.status==='Not Interested').length, '❌', '#dc2626'],
            ['Hold', rows.filter(r=>r.status==='Hold').length, '⏸️', '#7c3aed'],
          ].map(([label, count, icon, color]) => (
            <div key={label} style={{ background:'#fff', borderRadius:10, padding:'12px 14px',
              border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize:10, color:'#64748b', marginBottom:4 }}>{icon} {label}</div>
              <div style={{ fontSize:22, fontWeight:800, color }}>{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
