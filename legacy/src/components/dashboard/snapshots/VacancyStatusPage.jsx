// FILE: src/components/dashboard/snapshots/VacancyStatusPage.jsx
// eLogix HRMS — Vacancy Status
// Path: Employee Lifecycle > Recruitment & Hiring > Recruitment Management > Vacancy Status
// Features: Inline editable, right-click context menu, Save/Print/Export/Import, progress bars
// eLogix Technologies · www.elogix.com.np

import { useState, useRef, useCallback } from 'react'

function getSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem('elogix_session') || localStorage.getItem('elogix_session') || 'null')
    return s || {}
  } catch(_e) { return {} }
}

const VAC_STATUS_COLORS = {
  'Closed':           { bg:'#dcfce7', color:'#166534', border:'#bbf7d0' },
  'Client Fulfilled': { bg:'#dbeafe', color:'#1e40af', border:'#bfdbfe' },
  'WIP':              { bg:'#fef9c3', color:'#854d0e', border:'#fde68a' },
  'Pending':          { bg:'#fff7ed', color:'#9a3412', border:'#fed7aa' },
  'Hold':             { bg:'#f3e8ff', color:'#6b21a8', border:'#e9d5ff' },
  'Dissolved':        { bg:'#fee2e2', color:'#991b1b', border:'#fecaca' },
  'Open':             { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0' },
  'default':          { bg:'#f8fafc', color:'#475569', border:'#e2e8f0' },
}

function vstStyle(s) { return VAC_STATUS_COLORS[s] || VAC_STATUS_COLORS.default }

const LEVELS = ['L1','L2','L3','L4','L5','L6','L7','L8','L9','L10','L11','L12']
const MONTHS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const VAC_STATUSES = Object.keys(VAC_STATUS_COLORS).filter(k=>k!=='default')

function Breadcrumb() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#64748b',
      padding:'6px 0', flexWrap:'wrap' }}>
      {['Employee Lifecycle Management','Recruitment & Hiring','Recruitment Management','Vacancy Status']
        .map((part,i,arr) => (
          <span key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color: i===arr.length-1 ? '#0369a1' : '#94a3b8',
              fontWeight: i===arr.length-1 ? 700 : 400 }}>{part}</span>
            {i < arr.length-1 && <span style={{ color:'#d1d5db' }}>›</span>}
          </span>
        ))}
    </div>
  )
}

const VCOLS = [
  { key:'sn',              label:'S/N',              w:50,  type:'number'  },
  { key:'companyName',     label:'Company Name',      w:200, type:'text'   },
  { key:'address',         label:'Address',           w:130, type:'text'   },
  { key:'position',        label:'Position',          w:180, type:'text'   },
  { key:'noOfVacancy',     label:'No. of Vacancies',  w:80,  type:'number' },
  { key:'assignedTo',      label:'Assigned To',       w:160, type:'text'   },
  { key:'status',          label:'Status',            w:140, type:'select', options:VAC_STATUSES },
  { key:'level',           label:'Level',             w:70,  type:'select', options:LEVELS },
  { key:'month',           label:'Month',             w:80,  type:'select', options:MONTHS },
  { key:'openingDate',     label:'Opening Date',      w:120, type:'text'   },
  { key:'closedDate',      label:'Closed Date',       w:120, type:'text'   },
  { key:'timeline',        label:'Timeline (days)',   w:100, type:'number' },
  { key:'totalLeads',      label:'Total Leads',       w:90,  type:'number' },
  { key:'followUp',        label:'Follow-up',         w:80,  type:'number' },
  { key:'shortlist',       label:'Shortlist',         w:80,  type:'number' },
  { key:'interview',       label:'Interview',         w:80,  type:'number' },
  { key:'onBoard',         label:'On-Board',          w:80,  type:'number' },
  { key:'clientFulfilled', label:'Client Fulfilled',  w:110, type:'number' },
  { key:'conversion',      label:'Conversion %',      w:100, type:'number' },
  { key:'vacancyCode',     label:'Vacancy Code',      w:140, type:'text'   },
  { key:'remarks',         label:'Remarks',           w:200, type:'textarea' },
]

function fmtExcelDate(n) {
  if (!n || isNaN(n)) return n || ''
  const d = new Date(1900, 0, Number(n) - 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const INITIAL_VAC = [
  { sn:1,  companyName:'Folliderm-Hair Care Experts',         address:'Baluwatar',    position:'Staff Nurse',                         noOfVacancy:1, assignedTo:'Robijan Bajracharya',   status:'Closed',           level:'L1',  month:'8', openingDate:fmtExcelDate(46226), closedDate:'',  timeline:29, totalLeads:239, followUp:155, shortlist:3, interview:3, onBoard:2, clientFulfilled:0, conversion:'', vacancyCode:'AV-26080008', remarks:'' },
  { sn:2,  companyName:'Konnect',                             address:'Abukhaireni',  position:'POP Coordinator',                     noOfVacancy:1, assignedTo:'Asmita Gurung',         status:'Client Fulfilled', level:'L2',  month:'8', openingDate:fmtExcelDate(46208), closedDate:'',  timeline:47, totalLeads:189, followUp:98,  shortlist:1, interview:2, onBoard:1, clientFulfilled:0, conversion:'', vacancyCode:'AV-26080012', remarks:'' },
  { sn:3,  companyName:'Ghorahi Cement Industry Limited',     address:'Surkhet',      position:'Project Sales Officer',               noOfVacancy:1, assignedTo:'Rachana K.C',           status:'Pending',          level:'L3',  month:'8', openingDate:fmtExcelDate(46237), closedDate:'',  timeline:18, totalLeads:233, followUp:134, shortlist:0, interview:0, onBoard:0, clientFulfilled:1, conversion:'', vacancyCode:'AV-26080100', remarks:'' },
  { sn:4,  companyName:'Healthy Homes and Natural Health Care',address:'Kathmandu',   position:'Medicine Head',                       noOfVacancy:1, assignedTo:'Bibisha Katwal',        status:'WIP',              level:'L4',  month:'8', openingDate:fmtExcelDate(46233), closedDate:'',  timeline:22, totalLeads:367, followUp:236, shortlist:7, interview:4, onBoard:2, clientFulfilled:0, conversion:'', vacancyCode:'AV-26080104', remarks:'' },
  { sn:5,  companyName:'Oriflame Swedish Cosmetics Pvt. Ltd.',address:'Kathmandu',   position:'Regional Sales Manager',              noOfVacancy:1, assignedTo:'Sujita Sapkota',        status:'Hold',             level:'L5',  month:'8', openingDate:fmtExcelDate(46230), closedDate:'',  timeline:25, totalLeads:77,  followUp:45,  shortlist:0, interview:0, onBoard:0, clientFulfilled:1, conversion:'', vacancyCode:'AV-26080105', remarks:'' },
  { sn:6,  companyName:'Pathao Nepal',                        address:'Baneshwor',    position:'Sales Associate',                     noOfVacancy:1, assignedTo:'Sandesh Ulak',          status:'Dissolved',        level:'L6',  month:'8', openingDate:fmtExcelDate(46198), closedDate:'',  timeline:57, totalLeads:98,  followUp:22,  shortlist:5, interview:3, onBoard:2, clientFulfilled:0, conversion:'', vacancyCode:'AV-26080106', remarks:'' },
  { sn:7,  companyName:'Vatsalya Natural IVF',                address:'Nepalgunj',    position:'Medical Representative',              noOfVacancy:1, assignedTo:'Prashant Budhathoki',   status:'',                 level:'L7',  month:'8', openingDate:fmtExcelDate(46215), closedDate:'',  timeline:40, totalLeads:127, followUp:82,  shortlist:1, interview:0, onBoard:0, clientFulfilled:1, conversion:'', vacancyCode:'AV-26080065', remarks:'' },
  { sn:8,  companyName:'Abasar Nepal',                        address:'Koteshwor',    position:'HR Intern',                           noOfVacancy:2, assignedTo:'Sabina Rai',            status:'',                 level:'L8',  month:'8', openingDate:fmtExcelDate(46248), closedDate:'',  timeline:7,  totalLeads:189, followUp:93,  shortlist:2, interview:0, onBoard:0, clientFulfilled:2, conversion:'', vacancyCode:'AV-26080069', remarks:'' },
  { sn:9,  companyName:'Black Box Record',                    address:'Kamaladi',     position:'Packaging Staff',                     noOfVacancy:2, assignedTo:'Sabina Rai',            status:'',                 level:'L9',  month:'8', openingDate:fmtExcelDate(46250), closedDate:'',  timeline:5,  totalLeads:44,  followUp:21,  shortlist:9, interview:9, onBoard:4, clientFulfilled:0, conversion:'', vacancyCode:'AV-26080015', remarks:'' },
  { sn:10, companyName:'Gogoro Nebula',                       address:'Kamaladi',     position:'Fleet Operation & Onboarding Officer', noOfVacancy:1, assignedTo:'Sabina Rai',           status:'',                 level:'L10', month:'8', openingDate:fmtExcelDate(46250), closedDate:'',  timeline:5,  totalLeads:91,  followUp:49,  shortlist:4, interview:4, onBoard:2, clientFulfilled:0, conversion:'', vacancyCode:'AV-26080017', remarks:'' },
]

const VAC_STORAGE_KEY = 'elogix_vacancy_status'

function loadVacData() {
  try {
    const s = localStorage.getItem(VAC_STORAGE_KEY)
    return s ? JSON.parse(s) : INITIAL_VAC
  } catch(_e) { return INITIAL_VAC }
}

// ── Inline Cell ────────────────────────────────────────────────
function VCell({ value, col, onChange, isEditing, onStartEdit, onEndEdit }) {
  const [local, setLocal] = useState(value)
  const ref = useRef(null)
  const [, forceUpdate] = useState(0)

  const ss = { padding:'6px 8px', fontSize:12, border:'none', background:'transparent',
    outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box', color:'#0f172a' }

  const commit = () => { onChange(local); onEndEdit() }

  if (!isEditing) {
    if (col.key === 'status') {
      const st = vstStyle(value)
      return (
        <div onDoubleClick={onStartEdit} style={{ padding:'4px 6px', cursor:'default' }}>
          {value
            ? <span style={{ background:st.bg, color:st.color, border:`1px solid ${st.border}`,
                fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>
                {value}
              </span>
            : <span style={{ color:'#d1d5db', fontSize:11 }}>—</span>
          }
        </div>
      )
    }
    if (col.key === 'conversion') {
      const pct = Number(value) || 0
      return (
        <div onDoubleClick={onStartEdit} style={{ padding:'4px 6px', cursor:'default' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#374151', marginBottom:3 }}>
            {pct ? `${pct}%` : '—'}
          </div>
          {pct > 0 && (
            <div style={{ height:5, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.min(pct,100)}%`,
                background: pct>=50 ? '#16a34a' : pct>=25 ? '#f59e0b' : '#ef4444',
                borderRadius:3 }}/>
            </div>
          )}
        </div>
      )
    }
    // Funnel columns with progress bars
    if (['totalLeads','followUp','shortlist','interview','onBoard'].includes(col.key)) {
      const row = {} // can't get row here, show plain number
      return (
        <div onDoubleClick={onStartEdit} style={{ padding:'4px 8px', cursor:'default',
          textAlign:'center', fontSize:12, fontWeight:value ? 700 : 400,
          color: value ? '#0f172a' : '#d1d5db' }}>
          {value || '—'}
        </div>
      )
    }
    return (
      <div onDoubleClick={onStartEdit} style={{ padding:'4px 6px', fontSize:11,
        color: value ? '#0f172a' : '#d1d5db', cursor:'default', whiteSpace:'nowrap',
        overflow:'hidden', textOverflow:'ellipsis' }}>
        {value || '—'}
      </div>
    )
  }

  if (col.type === 'select') {
    return (
      <select ref={ref} value={local} autoFocus
        onChange={e => setLocal(e.target.value)} onBlur={commit}
        style={{ ...ss, cursor:'pointer', background:'#fffbe6', border:'1px solid #fbbf24', borderRadius:4 }}>
        <option value="">—</option>
        {col.options.map(o => <option key={o}>{o}</option>)}
      </select>
    )
  }
  if (col.type === 'textarea') {
    return (
      <textarea autoFocus value={local} rows={3}
        onChange={e => setLocal(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key==='Escape') { setLocal(value); onEndEdit() } }}
        style={{ ...ss, background:'#fffbe6', border:'1px solid #fbbf24',
          borderRadius:4, resize:'vertical', minHeight:60 }}/>
    )
  }
  return (
    <input autoFocus type={col.type==='number'?'number':'text'} value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if(e.key==='Enter') commit(); if(e.key==='Escape'){setLocal(value);onEndEdit()} }}
      style={{ ...ss, background:'#fffbe6', border:'1px solid #fbbf24', borderRadius:4 }}/>
  )
}

// ── Context Menu ───────────────────────────────────────────────
function VCtxMenu({ x, y, onClose, onAddAbove, onAddBelow, onDelete, onClear, onSave }) {
  const ref = useRef(null)
  const items = [
    { icon:'💾', label:'Save',          action:onSave,    color:'#16a34a' },
    { icon:'➕', label:'Add Row Above',  action:onAddAbove },
    { icon:'➕', label:'Add Row Below',  action:onAddBelow },
    null,
    { icon:'🗑️', label:'Clear Cell',    action:onClear    },
    { icon:'🗑️', label:'Delete Row',    action:onDelete,  color:'#dc2626' },
  ]
  return (
    <div ref={ref} style={{ position:'fixed', left:x, top:y, zIndex:9999,
      background:'#fff', border:'1px solid #e2e8f0', borderRadius:10,
      boxShadow:'0 8px 32px rgba(0,0,0,.18)', minWidth:180, overflow:'hidden',
      fontFamily:"'Segoe UI',system-ui,sans-serif" }}
      onMouseLeave={onClose}>
      {items.map((item,i) => item===null
        ? <div key={i} style={{ height:1, background:'#f1f5f9' }}/>
        : <button key={i} onClick={() => { item.action?.(); onClose() }}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%',
              padding:'9px 14px', border:'none', background:'transparent',
              fontSize:12, cursor:'pointer', color:item.color||'#374151', textAlign:'left' }}
            onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span>{item.icon}</span>{item.label}
          </button>
      )}
    </div>
  )
}

export default function VacancyStatusPage() {
  const sess    = getSession()
  const company = sess.company || {}

  const [rows,    setRows]    = useState(loadVacData)
  const [editing, setEditing] = useState(null)
  const [ctx,     setCtx]     = useState(null)
  const [search,  setSearch]  = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [toast,   setToast]   = useState('')

  const notify = (m) => { setToast(m); setTimeout(()=>setToast(''), 3000) }

  const save = useCallback((data=rows) => {
    try { localStorage.setItem(VAC_STORAGE_KEY, JSON.stringify(data)); notify('✅ Saved') }
    catch(_e) { notify('❌ Save failed') }
  }, [rows])

  const updateCell = (ri, key, val) => {
    setRows(prev => {
      const next = prev.map((r,i) => {
        if (i !== ri) return r
        const updated = { ...r, [key]: val }
        // Auto-compute conversion %
        if (['onBoard','clientFulfilled','totalLeads'].includes(key)) {
          const ob  = Number(key==='onBoard'          ? val : r.onBoard)          || 0
          const cf  = Number(key==='clientFulfilled'  ? val : r.clientFulfilled)  || 0
          const tl  = Number(key==='totalLeads'       ? val : r.totalLeads)       || 0
          updated.conversion = tl > 0 ? Math.round(((ob+cf)/tl)*100) : 0
        }
        return updated
      })
      localStorage.setItem(VAC_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleCtx = (e, ri, key) => { e.preventDefault(); setEditing(null); setCtx({x:e.clientX,y:e.clientY,ri,key}) }

  const addRow = (idx, above=false) => {
    const pos = above ? idx : idx+1
    const lastSn = Math.max(...rows.map(r=>Number(r.sn)||0), 0)
    const nr = VCOLS.reduce((a,c)=>({...a,[c.key]:''}),{})
    nr.sn = lastSn+1
    nr.noOfVacancy = 1
    nr.openingDate = new Date().toISOString().split('T')[0]
    nr.vacancyCode = `AV-${new Date().getFullYear()%100}${String(new Date().getMonth()+1).padStart(2,'0')}${String(lastSn+1).padStart(3,'0')}`
    setRows(prev => { const n=[...prev]; n.splice(pos,0,nr); return n })
    notify('➕ Row added')
  }

  const delRow = (idx) => {
    if (!window.confirm('Delete this row?')) return
    setRows(prev => prev.filter((_,i)=>i!==idx))
    notify('🗑️ Row deleted')
  }

  const exportCSV = () => {
    const h = VCOLS.map(c=>`"${c.label}"`).join(',')
    const b = rows.map(r=>VCOLS.map(c=>`"${(r[c.key]||'').toString().replace(/"/g,'""')}"`).join(','))
    const csv = [h,...b].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv'}))
    a.download = `Vacancy_Status_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    notify('📤 Exported CSV')
  }

  const importCSV = () => {
    const input = document.createElement('input')
    input.type  = 'file'; input.accept='.csv'
    input.onchange = e => {
      const file = e.target.files[0]; if(!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const lines = ev.target.result.replace(/\r/g,'').split('\n').filter(Boolean)
          const hdrs  = lines[0].split(',').map(h=>h.replace(/"/g,'').trim())
          const nr    = lines.slice(1).map((l,i)=>{
            const vals = l.split(',').map(v=>v.replace(/^"|"$/g,'').trim())
            const row  = {sn:i+1}
            hdrs.forEach((h,j)=>{ const c=VCOLS.find(x=>x.label===h||x.key===h); if(c) row[c.key]=vals[j]||'' })
            return row
          })
          if(window.confirm(`Import ${nr.length} rows?`)) { setRows(prev=>[...prev,...nr]); notify(`✅ Imported ${nr.length} rows`) }
        } catch(_e) { notify('❌ Import failed') }
      }
      reader.readAsText(file,'UTF-8')
    }
    input.click()
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return (!q || (r.companyName||'').toLowerCase().includes(q) ||
      (r.position||'').toLowerCase().includes(q) || (r.vacancyCode||'').toLowerCase().includes(q) ||
      (r.assignedTo||'').toLowerCase().includes(q)) &&
      (!filterStatus || r.status===filterStatus)
  })

  // Funnel column color coding
  const funnelColor = (col, val, row) => {
    if (!['followUp','shortlist','interview','onBoard'].includes(col)) return {}
    const leads = Number(row.totalLeads) || 1
    const pct   = (Number(val)||0) / leads * 100
    return { color: pct >= 50 ? '#166534' : pct >= 20 ? '#b45309' : '#64748b', fontWeight: 700 }
  }

  // Summary
  const totalVacancies   = rows.reduce((a,r)=>a+(Number(r.noOfVacancy)||0), 0)
  const totalFulfilled   = rows.reduce((a,r)=>a+(Number(r.onBoard)||0)+(Number(r.clientFulfilled)||0), 0)
  const totalLeadsSum    = rows.reduce((a,r)=>a+(Number(r.totalLeads)||0), 0)
  const totalInterviewed = rows.reduce((a,r)=>a+(Number(r.interview)||0), 0)
  const openCount        = rows.filter(r=>!['Closed','Client Fulfilled','Dissolved'].includes(r.status)).length
  const avgTimeline      = rows.filter(r=>r.timeline).reduce((a,r,_,arr)=>a+(Number(r.timeline)||0)/arr.length, 0)

  return (
    <div style={{
      position:'fixed', inset:0,
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:'#faf5ff',
      overflowY:'scroll', overflowX:'hidden',
      scrollbarWidth:'thin', scrollbarColor:'#7c3aed #ede9fe',
      WebkitOverflowScrolling:'touch', zIndex:10,
    }}>
      {toast && (
        <div style={{ position:'fixed', bottom:20, right:20, zIndex:9999,
          background: toast.startsWith('❌') ? '#fef2f2' : '#f0fdf4',
          border:`1px solid ${toast.startsWith('❌') ? '#fecaca' : '#bbf7d0'}`,
          borderRadius:10, padding:'10px 18px', fontSize:12, fontWeight:600,
          color: toast.startsWith('❌') ? '#dc2626' : '#065f46',
          boxShadow:'0 4px 16px rgba(0,0,0,.12)' }}>{toast}</div>
      )}

      {ctx && (
        <VCtxMenu x={ctx.x} y={ctx.y}
          onClose={() => setCtx(null)}
          onAddAbove={() => addRow(ctx.ri, true)}
          onAddBelow={() => addRow(ctx.ri, false)}
          onDelete={() => delRow(ctx.ri)}
          onClear={() => { updateCell(ctx.ri, ctx.key, ''); notify('✓ Cleared') }}
          onSave={() => save()}
        />
      )}

      <style>{`
        @media print { body * { visibility:hidden!important } #vac-table,#vac-table * { visibility:visible!important } #vac-table { position:fixed;top:0;left:0;width:100% } .no-print { display:none!important } }
        .vrow:hover td { background:#faf5ff!important }
        .vhdr { position:sticky; top:0; z-index:10 }
        ::-webkit-scrollbar { height:7px; width:7px }
        ::-webkit-scrollbar-thumb { background:#7c3aed; border-radius:4px }
        ::-webkit-scrollbar-track { background:#f3f4f6 }
      `}</style>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#3b0764 0%,#7c3aed 60%,#a78bfa 100%)',
        padding:'14px 20px', color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
          flexWrap:'wrap', gap:10 }}>
          <div>
            <Breadcrumb />
            <div style={{ fontSize:18, fontWeight:900, marginTop:2 }}>
              💼 Vacancy Status
            </div>
            <div style={{ fontSize:11, opacity:.8, marginTop:2 }}>
              {company.name || 'Your Company'} · {filtered.length} vacancies
            </div>
          </div>
          <div className="no-print" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              { label:'💾 Save',    action:()=>save()    },
              { label:'🖨️ Print',   action:()=>{ window.print(); notify('🖨️ Printing') } },
              { label:'📤 Export',  action:exportCSV     },
              { label:'📥 Import',  action:importCSV     },
              { label:'➕ Add Row', action:()=>addRow(rows.length-1, false) },
            ].map(btn=>(
              <button key={btn.label} onClick={btn.action}
                style={{ padding:'8px 16px', borderRadius:9, border:'1px solid rgba(255,255,255,.3)',
                  background:'rgba(255,255,255,.18)', color:'#fff',
                  fontSize:12, fontWeight:700, cursor:'pointer', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.3)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.18)'}>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',
          gap:8, marginTop:14 }}>
          {[
            ['Total Vacancies', totalVacancies,    '💼'],
            ['Open / Active',   openCount,          '🟢'],
            ['Total Leads',     totalLeadsSum,      '👥'],
            ['Interviewed',     totalInterviewed,   '🎤'],
            ['Fulfilled',       totalFulfilled,     '✅'],
            ['Avg Timeline',    `${Math.round(avgTimeline)}d`, '⏱️'],
          ].map(([l,v,ic])=>(
            <div key={l} style={{ background:'rgba(255,255,255,.12)', borderRadius:8, padding:'8px 12px',
              textAlign:'center', border:'1px solid rgba(255,255,255,.2)' }}>
              <div style={{ fontSize:16 }}>{ic}</div>
              <div style={{ fontSize:18, fontWeight:900, marginTop:2 }}>{v}</div>
              <div style={{ fontSize:9, opacity:.75, marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTERS */}
      <div className="no-print" style={{ background:'#fff', borderBottom:'1px solid #ede9fe',
        padding:'10px 20px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍  Search company, position, code, assigned to..."
          style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, outline:'none', width:300, fontFamily:'inherit' }}/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0',
            fontSize:12, fontFamily:'inherit', color:'#374151' }}>
          <option value="">All Statuses</option>
          {VAC_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        {(search||filterStatus) && (
          <button onClick={()=>{setSearch('');setFilterStatus('')}}
            style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0',
              background:'#fee2e2', color:'#dc2626', fontSize:12, cursor:'pointer', fontWeight:600 }}>
            ✕ Clear
          </button>
        )}
        <span style={{ marginLeft:'auto', fontSize:11, color:'#64748b' }}>
          💡 Double-click any cell to edit · Right-click for options
        </span>
      </div>

      {/* TABLE */}
      <div id="vac-table" style={{ overflowX:'auto', padding:'16px 20px 60px',
        scrollbarWidth:'thin', scrollbarColor:'#a78bfa #f3f4f6' }}>
        <table style={{ borderCollapse:'collapse', fontSize:12, background:'#fff',
          borderRadius:10, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.06)',
          width:'max-content', minWidth:'100%' }}>
          <thead>
            <tr style={{ background:'linear-gradient(135deg,#7c3aed,#a78bfa)', color:'#fff' }}>
              {VCOLS.map(col => (
                <th key={col.key} className="vhdr"
                  style={{ padding:'10px 10px', textAlign: ['noOfVacancy','totalLeads','followUp','shortlist','interview','onBoard','clientFulfilled','conversion','timeline'].includes(col.key) ? 'center' : 'left',
                    fontWeight:700, fontSize:10, whiteSpace:'nowrap',
                    width:col.w, minWidth:col.w, letterSpacing:.3,
                    background:'inherit', borderRight:'1px solid rgba(255,255,255,.15)' }}>
                  {col.label}
                </th>
              ))}
              <th className="vhdr" style={{ padding:'10px', fontWeight:700,
                fontSize:10, background:'inherit', width:90 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, ri) => {
              const realIdx = rows.indexOf(row)
              return (
                <tr key={ri} className="vrow"
                  style={{ borderBottom:'1px solid #f3e8ff',
                    background: ri%2===0 ? '#fff' : '#fdf4ff' }}>
                  {VCOLS.map(col => {
                    const isEd = editing?.ri===realIdx && editing?.key===col.key
                    const funnel = funnelColor(col.key, row[col.key], row)
                    return (
                      <td key={col.key}
                        style={{ padding:'1px', verticalAlign:'middle',
                          minWidth:col.w, maxWidth: col.type==='textarea' ? 280 : col.w,
                          borderRight:'1px solid #f3e8ff',
                          background: isEd ? '#fffbe6' : undefined,
                          textAlign: ['noOfVacancy','totalLeads','followUp','shortlist','interview','onBoard','clientFulfilled','conversion','timeline'].includes(col.key) ? 'center' : undefined,
                        }}
                        onContextMenu={e=>handleCtx(e, realIdx, col.key)}>
                        <VCell
                          value={row[col.key]||''}
                          col={col}
                          onChange={val=>updateCell(realIdx, col.key, val)}
                          isEditing={isEd}
                          onStartEdit={()=>setEditing({ri:realIdx, key:col.key})}
                          onEndEdit={()=>setEditing(null)}
                        />
                      </td>
                    )
                  })}
                  <td style={{ padding:'4px 8px', whiteSpace:'nowrap', borderLeft:'1px solid #f3e8ff' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={()=>save()} title="Save"
                        style={{ padding:'3px 8px', borderRadius:6, border:'1px solid #bbf7d0',
                          background:'#f0fdf4', color:'#166534', fontSize:10, cursor:'pointer' }}>
                        💾
                      </button>
                      <button onClick={()=>addRow(realIdx,false)} title="Add below"
                        style={{ padding:'3px 8px', borderRadius:6, border:'1px solid #ddd6fe',
                          background:'#f5f3ff', color:'#7c3aed', fontSize:10, cursor:'pointer' }}>
                        ➕
                      </button>
                      <button onClick={()=>delRow(realIdx)} title="Delete"
                        style={{ padding:'3px 8px', borderRadius:6, border:'1px solid #fecaca',
                          background:'#fef2f2', color:'#dc2626', fontSize:10, cursor:'pointer' }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length===0 && (
              <tr>
                <td colSpan={VCOLS.length+1} style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
                  <div style={{ fontSize:36 }}>💼</div>
                  <div style={{ fontSize:14, fontWeight:600, marginTop:8 }}>No vacancies found</div>
                </td>
              </tr>
            )}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr style={{ background:'#f5f3ff', borderTop:'2px solid #ddd6fe' }}>
              {VCOLS.map((col, i) => (
                <td key={col.key} style={{ padding:'8px 10px', fontSize:11, fontWeight:700,
                  color:'#5b21b6', textAlign:'center', borderRight:'1px solid #e9d5ff' }}>
                  {i===0 ? 'Totals' :
                   col.key==='noOfVacancy'     ? rows.reduce((a,r)=>a+(Number(r[col.key])||0),0) :
                   col.key==='totalLeads'       ? rows.reduce((a,r)=>a+(Number(r[col.key])||0),0) :
                   col.key==='followUp'         ? rows.reduce((a,r)=>a+(Number(r[col.key])||0),0) :
                   col.key==='shortlist'        ? rows.reduce((a,r)=>a+(Number(r[col.key])||0),0) :
                   col.key==='interview'        ? rows.reduce((a,r)=>a+(Number(r[col.key])||0),0) :
                   col.key==='onBoard'          ? rows.reduce((a,r)=>a+(Number(r[col.key])||0),0) :
                   col.key==='clientFulfilled'  ? rows.reduce((a,r)=>a+(Number(r[col.key])||0),0) :
                   col.key==='conversion'       ? `${Math.round(rows.reduce((a,r)=>a+(Number(r[col.key])||0),0)/rows.length)||0}% avg` :
                   ''}
                </td>
              ))}
              <td/>
            </tr>
          </tfoot>
        </table>

        {/* Recruitment Funnel */}
        <div className="no-print" style={{ marginTop:16, background:'#fff', borderRadius:12,
          padding:'16px 20px', border:'1px solid #e2e8f0',
          boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:12 }}>
            📊 Recruitment Funnel (All Vacancies)
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:8 }}>
            {[
              ['Total Leads',   rows.reduce((a,r)=>a+(Number(r.totalLeads)||0),0), '#0369a1'],
              ['Follow-up',     rows.reduce((a,r)=>a+(Number(r.followUp)||0),0),   '#0891b2'],
              ['Shortlisted',   rows.reduce((a,r)=>a+(Number(r.shortlist)||0),0),  '#7c3aed'],
              ['Interviewed',   rows.reduce((a,r)=>a+(Number(r.interview)||0),0),  '#d97706'],
              ['On-Boarded',    rows.reduce((a,r)=>a+(Number(r.onBoard)||0),0),    '#16a34a'],
              ['Client Fulfilled', rows.reduce((a,r)=>a+(Number(r.clientFulfilled)||0),0), '#0f172a'],
            ].map(([label,val,color], i, arr) => {
              const max = arr[0][1] || 1
              const pct = Math.round(val/max*100)
              return (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:900, color }}>{val}</div>
                  <div style={{ fontSize:10, color:'#64748b', margin:'4px 0 6px' }}>{label}</div>
                  <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3,
                      transition:'width .5s' }}/>
                  </div>
                  <div style={{ fontSize:9, color:'#94a3b8', marginTop:3 }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="no-print" style={{ marginTop:12, display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
          {VAC_STATUSES.map(s => {
            const count = rows.filter(r=>r.status===s).length
            const st    = vstStyle(s)
            return (
              <div key={s} style={{ background:'#fff', borderRadius:9, padding:'10px 14px',
                border:`1px solid ${st.border}`, textAlign:'center' }}>
                <span style={{ background:st.bg, color:st.color, fontSize:10,
                  fontWeight:700, padding:'2px 10px', borderRadius:20, display:'inline-block',
                  marginBottom:6 }}>{s}</span>
                <div style={{ fontSize:22, fontWeight:900, color:st.color }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
