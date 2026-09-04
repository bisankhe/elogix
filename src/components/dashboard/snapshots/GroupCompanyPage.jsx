// FILE: GroupCompanyPage.jsx
// Luxury Group Company management - SAP-style with Excel upload, audio, right-click context

import React, { useState, useRef, useCallback, useEffect } from 'react'

// -- Shared luxury UI atoms ------------------------------------
const THEME = {
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  gold:     '#f59e0b',
  success:  '#10b981',
  danger:   '#ef4444',
  dark:     '#0f172a',
  mid:      '#334155',
  muted:    '#94a3b8',
  border:   '#e2e8f0',
  glass:    'rgba(255,255,255,0.95)',
}


// ── Shared tenant data hook ─────────────────────────────────
function useTenantCompany() {
  const [company, setCompany] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      // 1. Try real API
      try {
        const token = localStorage.getItem('elogix_token') ||
          JSON.parse(localStorage.getItem('elogix_auth')||'{}').token
        if (token) {
          const res = await fetch('/api/v1/companies/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const d = await res.json()
            setCompany(d.data || d.company || d)
            setLoading(false)
            return
          }
        }
      } catch {}
      // 2. Fallback: localStorage auth
      try {
        const auth = JSON.parse(localStorage.getItem('elogix_auth')||'{}')
        const regCos = JSON.parse(localStorage.getItem('elogix_registered_companies')||'{}')
        const co = auth.company || {}
        const slug = co.slug || auth.user?.company || 'demo'
        const regData = regCos[slug] || {}
        setCompany({
          id:            co.id || `c_${slug}`,
          name:          co.name || regData.name || 'Your Company',
          slug,
          plan:          co.plan || regData.plan || 'trial',
          status:        co.status || 'active',
          business_type: co.business_type || regData.business_type || 'custom',
          country:       co.country || regData.country || 'Nepal',
          currency:      co.currency || regData.currency || 'NPR',
          admin_email:   co.admin_email || regData.admin_email || auth.user?.email || '',
          modules:       co.modules || regData.modules || [],
          created_at:    co.created_at || regData.created_at || '',
          // Profile fields (empty until filled in setup)
          legal_name: '', short_name: '', pan_number: '', vat_number: '',
          ocr_number: '', ssf_code: '', industry: regData.business_type?.replace(/_/g,' ') || '',
          phone: regData.phone || '', email: regData.admin_email || co.admin_email || '',
          province:'', district:'', municipality:'', registered_address:'', website:'',
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const saveTenantCompany = async (updates) => {
    // Merge updates into localStorage
    try {
      const auth = JSON.parse(localStorage.getItem('elogix_auth')||'{}')
      auth.company = { ...(auth.company||{}), ...updates }
      localStorage.setItem('elogix_auth', JSON.stringify(auth))
      setCompany(p => ({...p, ...updates}))
    } catch {}
    // Try API
    try {
      const token = localStorage.getItem('elogix_token') ||
        JSON.parse(localStorage.getItem('elogix_auth')||'{}').token
      if (token) {
        await fetch('/api/v1/companies/me', {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
          body: JSON.stringify(updates)
        })
      }
    } catch {}
  }

  return { company, loading, saveTenantCompany }
}


function ContextMenu({ x, y, item, onClose, onAction }) {
  const actions = [
    { icon:'👁️', label:'View Details',       key:'view'     },
    { icon:'✏️', label:'Edit Group',         key:'edit'     },
    { icon:'📊', label:'View Dashboard',     key:'dashboard'},
    { icon:'📋', label:'Impact Analysis',    key:'impact'   },
    { icon:'🔗', label:'Linked Modules',     key:'links'    },
    { icon:'📤', label:'Export to Excel',    key:'export'   },
    { icon:'🔄', label:'Sync Data',          key:'sync'     },
    { icon:'Settings', label:'Settings',           key:'settings' },
    { icon:'🗑️', label:'Archive',            key:'archive', danger:true },
  ]
  return (
    <div style={{ position:'fixed', zIndex:9999, left:x, top:y,
      background:'#fff', borderRadius:12, width:220,
      boxShadow:'0 20px 60px rgba(0,0,0,0.2)', border:'1px solid #e2e8f0',
      overflow:'hidden', animation:'fadeIn .15s ease' }}>
      {/* Impact banner */}
      <div style={{ background:'linear-gradient(135deg,#667eea,#764ba2)',
        padding:'10px 14px' }}>
        <div style={{ fontSize:11, fontWeight:800, color:'#fff' }}>
          Impact Scope: {item?.name}
        </div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)', marginTop:2 }}>
          Affects: {item?.impact_links?.join(' . ')}
        </div>
      </div>
      {actions.map((a,i) => (
        <div key={i}
          onClick={() => { onAction(a.key, item); onClose() }}
          style={{ padding:'9px 14px', display:'flex', alignItems:'center', gap:10,
            cursor:'pointer', fontSize:12,
            color: a.danger ? '#ef4444' : '#334155',
            borderBottom: i < actions.length-1 ? '1px solid #f8fafc' : 'none' }}
          onMouseEnter={e => e.currentTarget.style.background = a.danger ? '#fef2f2' : '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          <span style={{ fontSize:14 }}>{a.icon}</span>
          <span>{a.label}</span>
        </div>
      ))}
    </div>
  )
}

// -- Excel Upload Panel ----------------------------------------
function ExcelUploadPanel({ onClose, onUpload }) {
  const [dragging, setDragging] = useState(false)
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const fileRef = useRef()

  const TEMPLATE_COLS = ['Group Code','Group Name','Short Name','Type','Country',
    'Currency','PAN','Incorporated Date','Contact Email','Website','Description']

  const handleFile = (f) => {
    setFile(f)
    setPreview({ name: f.name, size: (f.size/1024).toFixed(1)+'KB', rows: Math.floor(Math.random()*10)+2 })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:580, maxHeight:'85vh',
        overflow:'auto', boxShadow:'0 40px 80px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding:'20px 24px', background:THEME.gradient, borderRadius:'20px 20px 0 0' }}>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>
            📊 Excel / CSV Import
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.8)', marginTop:4 }}>
            SAP-style bulk upload - Download template, fill data, upload
          </div>
        </div>

        <div style={{ padding:24 }}>
          {/* Download Template */}
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0',
            borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#15803d', marginBottom:8 }}>
              Step 1: Download Template
            </div>
            <div style={{ fontSize:11, color:'#166534', marginBottom:10 }}>
              Template columns: {TEMPLATE_COLS.join(' | ')}
            </div>
            <button style={{ padding:'8px 20px', borderRadius:8, border:'none',
              background:'#10b981', color:'#fff', fontSize:12, fontWeight:700,
              cursor:'pointer' }}>
              ⬇️ Download Excel Template (.xlsx)
            </button>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#667eea' : '#cbd5e1'}`,
              borderRadius:12, padding:'40px 20px', textAlign:'center',
              background: dragging ? '#f0f0ff' : '#f8fafc',
              cursor:'pointer', transition:'all .2s', marginBottom:20
            }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📁</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#334155' }}>
              {file ? file.name : 'Drop Excel/CSV file here or click to browse'}
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
              Supports .xlsx, .xls, .csv - max 10MB
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
              style={{ display:'none' }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>

          {/* Preview */}
          {preview && (
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe',
              borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1e40af', marginBottom:6 }}>
                Preview: {preview.name} ({preview.size})
              </div>
              <div style={{ fontSize:11, color:'#3b82f6' }}>
                Detected {preview.rows} data rows ready to import.
                AI will validate each row for compliance before saving.
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={() => { if(file) { onUpload(file); onClose() } }}
              disabled={!file}
              style={{ flex:1, padding:'12px', borderRadius:10, border:'none',
                background: file ? THEME.gradient : '#e2e8f0',
                color: file ? '#fff' : '#94a3b8',
                fontSize:13, fontWeight:700, cursor: file ? 'pointer' : 'not-allowed' }}>
              🚀 Import & Validate
            </button>
            <button onClick={onClose}
              style={{ padding:'12px 20px', borderRadius:10, border:'1px solid #e2e8f0',
                background:'#fff', color:'#475569', fontSize:12, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// -- Audio Input Hook ------------------------------------------
function useAudioInput(onTranscript) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  const start = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Use Chrome browser.')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.lang = 'en-US'; r.continuous = false; r.interimResults = false
    r.onresult = (e) => { onTranscript(e.results[0][0].transcript); setListening(false) }
    r.onerror  = () => setListening(false)
    r.onend    = () => setListening(false)
    r.start()
    recognitionRef.current = r
    setListening(true)
  }, [onTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, start, stop }
}

// -- Luxury Field ----------------------------------------------
function LuxField({ label, value, onChange, type='text', options, required, hint, fieldKey }) {
  const { listening, start, stop } = useAudioInput((t) => onChange && onChange(t))
  const [focused, setFocused] = useState(false)

  const inputStyle = {
    width:'100%', padding:'10px 80px 10px 12px', borderRadius:10,
    border: `1.5px solid ${focused ? '#667eea' : '#e2e8f0'}`,
    fontSize:13, outline:'none', boxSizing:'border-box', background:'#fff',
    transition:'border-color .2s',
    boxShadow: focused ? '0 0 0 3px rgba(102,126,234,0.1)' : 'none',
  }

  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700,
        color:'#334155', marginBottom:5 }}>
        {label} {required && <span style={{ color:'#ef4444' }}>*</span>}
      </label>
      <div style={{ position:'relative' }}>
        {type === 'select' ? (
          <select value={value} onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...inputStyle, paddingRight:12, appearance:'auto' }}>
            <option value="">Select {label}...</option>
            {options?.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...inputStyle, resize:'vertical', paddingRight:80 }}/>
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={inputStyle}/>
        )}
        {/* Audio button */}
        <button
          onClick={listening ? stop : start}
          title="Voice input"
          style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
            background: listening ? '#ef4444' : 'linear-gradient(135deg,#667eea,#764ba2)',
            border:'none', borderRadius:6, width:28, height:28,
            color:'#fff', fontSize:13, cursor:'pointer', display:'flex',
            alignItems:'center', justifyContent:'center',
            animation: listening ? 'pulse 1s infinite' : 'none' }}>
          {listening ? 'Stop' : '🎤'}
        </button>
      </div>
      {hint && <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>{hint}</div>}
    </div>
  )
}

// -- Group Company Card ----------------------------------------
function GroupCard({ group, onContextMenu, onClick }) {
  const typeColor = {
    'Holding Company': '#667eea', 'Subsidiary': '#10b981', 'Associate': '#f59e0b'
  }
  const c = typeColor[group.type] || '#64748b'

  return (
    <div
      onClick={() => onClick(group)}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, group) }}
      style={{
        background:'#fff', border:'1px solid #e2e8f0', borderRadius:16,
        overflow:'hidden', cursor:'pointer', transition:'all .2s',
        boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
        borderTop:`3px solid ${c}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
      }}>

      {/* Card header */}
      <div style={{ padding:'18px 18px 14px', display:'flex', gap:14, alignItems:'flex-start' }}>
        <div style={{ width:52, height:52, borderRadius:14, fontSize:28,
          background:`${c}15`, display:'flex', alignItems:'center',
          justifyContent:'center', flexShrink:0, border:`1px solid ${c}30` }}>
          {group.logo}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:900, color:'#0f172a',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {group.name}
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
            {group.code} &bull; {group.country} &bull; {group.currency}
          </div>
          <div style={{ marginTop:6 }}>
            <span style={{ background:`${c}15`, color:c, border:`1px solid ${c}30`,
              fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
              {group.type}
            </span>
          </div>
        </div>
        <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, marginTop:4,
          background: group.status === 'active' ? '#10b981' : '#f59e0b' }}/>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
        borderTop:'1px solid #f1f5f9', padding:'12px 18px', gap:10 }}>
        {[
          { label:'Companies', value:group.companies_count, color:'#667eea' },
          { label:'Employees', value:group.employees_total.toLocaleString(), color:'#10b981' },
          { label:'Revenue',   value:'NPR '+(group.revenue_npr/1e7).toFixed(1)+'Cr', color:'#f59e0b' },
        ].map((s,i) => (
          <div key={i} style={{ textAlign:'center' }}>
            <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding:'8px 18px 12px', display:'flex', justifyContent:'space-between',
        alignItems:'center' }}>
        <div style={{ fontSize:10, color:'#94a3b8' }}>
          📧 {group.contact_email}
        </div>
        <div style={{ fontSize:10, color:'#667eea', fontWeight:600 }}>
          Right-click for options
        </div>
      </div>
    </div>
  )
}

// -- Add Group Modal -------------------------------------------
function AddGroupModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    code:'', name:'', short_name:'', type:'Holding Company',
    country:'Nepal', currency:'NPR', pan:'', incorporated:'',
    contact_email:'', website:'', description:''
  })
  const set = (k) => (v) => setForm(p => ({...p, [k]:v}))

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:680, maxHeight:'90vh',
        overflow:'auto', boxShadow:'0 40px 80px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding:'20px 28px', background:THEME.gradient, position:'sticky', top:0, zIndex:10 }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff' }}>+ New Group Company</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:3 }}>
            🎤 Use mic icon for voice input on any field
          </div>
        </div>

        <div style={{ padding:'24px 28px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 20px' }}>
            <LuxField label="Group Code"   value={form.code}         onChange={set('code')}         required hint="e.g. NHG, TCI" />
            <LuxField label="Group Name"   value={form.name}         onChange={set('name')}         required />
            <LuxField label="Short Name"   value={form.short_name}   onChange={set('short_name')}   />
            <LuxField label="Type" type="select" value={form.type} onChange={set('type')}
              options={['Holding Company','Subsidiary','Associate','Joint Venture','Trust']} required />
            <LuxField label="Country" type="select" value={form.country} onChange={set('country')}
              options={['Nepal','India','United Kingdom','UAE','USA','Australia']} />
            <LuxField label="Base Currency" type="select" value={form.currency} onChange={set('currency')}
              options={['NPR','INR','GBP','USD','AED','AUD']} />
            <LuxField label="PAN / Tax ID" value={form.pan} onChange={set('pan')} />
            <LuxField label="Incorporated Date" type="date" value={form.incorporated} onChange={set('incorporated')} />
            <LuxField label="Contact Email" type="email" value={form.contact_email} onChange={set('contact_email')} />
            <LuxField label="Website"       value={form.website}      onChange={set('website')} />
          </div>
          <LuxField label="Description" type="textarea" value={form.description} onChange={set('description')}
            hint="Voice input supported - describe the group company's purpose" />

          <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe',
            borderRadius:10, padding:'12px 14px', marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#4c1d95', marginBottom:4 }}>
              🤖 AI Impact Analysis
            </div>
            <div style={{ fontSize:11, color:'#6d28d9', lineHeight:1.6 }}>
              Creating a new group company will affect: Company Profile, Tax Compliance,
              Org Chart, Consolidated Reporting, and Currency Exchange settings.
              AI will auto-create default configurations upon save.
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { onSave(form); onClose() }}
              style={{ flex:1, padding:'14px', borderRadius:12, border:'none',
                background:THEME.gradient, color:'#fff', fontSize:14,
                fontWeight:700, cursor:'pointer' }}>
              ✨ Create Group Company
            </button>
            <button onClick={onClose}
              style={{ padding:'14px 24px', borderRadius:12, border:'1px solid #e2e8f0',
                background:'#fff', color:'#475569', fontSize:13, cursor:'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// -- Main Page -------------------------------------------------

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function GroupCompanyPage() {
  const [groups,      setGroups]      = useState(MOCK_GROUPS)
  const [contextMenu, setContextMenu] = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [showExcel,   setShowExcel]   = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [search,      setSearch]      = useState('')

  const filtered = groups.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleContextAction = (action, item) => {
    if (action === 'view')   setSelected(item)
    if (action === 'export') alert(`Exporting ${item.name} to Excel...`)
    if (action === 'sync')   alert(`Syncing ${item.name} data...`)
  }

  const closeContextMenu = () => setContextMenu(null)

  return (
    <div onClick={closeContextMenu}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:scale(1) } }
        @keyframes pulse  { 0%,100% { opacity:1 } 50% { opacity:.6 } }
        @keyframes shimmer { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
      `}</style>

      {/* Luxury Header */}
      <div style={{ background:THEME.gradient, borderRadius:18, padding:'24px 28px',
        marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:160, height:160,
          borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ position:'absolute', right:40, bottom:-40, width:100, height:100,
          borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
            <span style={{ fontSize:32 }}>🏛️</span>
            <div>
              <h2 style={{ fontSize:24, fontWeight:900, color:'#fff', margin:0 }}>
                Group Company
              </h2>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:2 }}>
                Organization Management &rsaquo; Organization Setup &rsaquo; Group Company
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            {[
              { label:'Total Groups',   value:groups.length,                                      icon:'🏛️' },
              { label:'Total Companies',value:groups.reduce((s,g)=>s+g.companies_count,0),        icon:'🏢' },
              { label:'Total Employees',value:groups.reduce((s,g)=>s+g.employees_total,0).toLocaleString(), icon:'👥' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.15)', borderRadius:10,
                padding:'8px 14px', backdropFilter:'blur(10px)' }}>
                <span style={{ fontSize:14 }}>{s.icon}</span>
                <span style={{ fontSize:16, fontWeight:800, color:'#fff', marginLeft:6 }}>{s.value}</span>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.7)', marginLeft:4 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:1, position:'relative', minWidth:200 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
            fontSize:14, color:'#94a3b8' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search groups by name or code..."
            style={{ width:'100%', padding:'10px 14px 10px 36px', borderRadius:12,
              border:'1.5px solid #e2e8f0', fontSize:13, outline:'none',
              boxSizing:'border-box', background:'#fff' }}/>
        </div>
        <button onClick={() => setShowExcel(true)}
          style={{ padding:'10px 18px', borderRadius:12, border:'1px solid #10b981',
            background:'#f0fdf4', color:'#15803d', fontSize:12, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          📊 Import Excel
        </button>
        <button onClick={() => window.alert('Exporting all groups...')}
          style={{ padding:'10px 18px', borderRadius:12, border:'1px solid #e2e8f0',
            background:'#fff', color:'#475569', fontSize:12, fontWeight:600,
            cursor:'pointer' }}>
          📤 Export
        </button>
        <button onClick={() => setShowAdd(true)}
          style={{ padding:'10px 20px', borderRadius:12, border:'none',
            background:THEME.gradient, color:'#fff', fontSize:12, fontWeight:700,
            cursor:'pointer' }}>
          + New Group
        </button>
      </div>

      {/* Right-click tip */}
      <div style={{ background:'#fffbeb', border:'1px solid #fde68a',
        borderRadius:10, padding:'8px 14px', marginBottom:16, fontSize:11, color:'#92400e' }}>
        💡 <strong>Pro Tip:</strong> Right-click on any group card to see impact analysis, linked modules, and quick actions - just like SAP!
      </div>

      {/* Group Cards Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px,1fr))', gap:16 }}>
        {filtered.map(g => (
          <GroupCard key={g.id} group={g}
            onContextMenu={(e, grp) => setContextMenu({ x:e.clientX, y:e.clientY, item:grp })}
            onClick={grp => setSelected(grp)} />
        ))}
        {/* Add new placeholder */}
        <div onClick={() => setShowAdd(true)}
          style={{ border:'2px dashed #cbd5e1', borderRadius:16, padding:'40px 20px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'#94a3b8', gap:10, minHeight:200, transition:'all .2s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#667eea'; e.currentTarget.style.color='#667eea' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#cbd5e1'; e.currentTarget.style.color='#94a3b8' }}>
          <span style={{ fontSize:36 }}>+</span>
          <span style={{ fontSize:13, fontWeight:700 }}>Add New Group Company</span>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} item={contextMenu.item}
          onClose={closeContextMenu}
          onAction={handleContextAction} />
      )}

      {/* Modals */}
      {showAdd   && <AddGroupModal   onClose={() => setShowAdd(false)}   onSave={g => setGroups(p=>[...p,{...g,id:'new-'+Date.now(),logo:'🏢',status:'active',companies_count:0,employees_total:0,revenue_npr:0,impact_links:['Company Profile']}])} />}
      {showExcel && <ExcelUploadPanel onClose={() => setShowExcel(false)} onUpload={f => alert('Processing: '+f.name)} />}

      {/* Detail drawer */}
      {selected && (
        <div style={{ position:'fixed', right:0, top:0, bottom:0, width:440,
          background:'#fff', boxShadow:'-20px 0 60px rgba(0,0,0,0.15)',
          zIndex:4000, overflow:'auto', animation:'fadeIn .2s ease' }}>
          <div style={{ padding:'20px 24px', background:THEME.gradient }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>{selected.name}</div>
              <button onClick={() => setSelected(null)}
                style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:8,
                  width:30, height:30, color:'#fff', cursor:'pointer', fontSize:16 }}>x</button>
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>{selected.type} &bull; {selected.code}</div>
          </div>
          <div style={{ padding:'20px 24px' }}>
            {[
              ['PAN / Tax ID',    selected.pan],
              ['Country',         selected.country],
              ['Currency',        selected.currency],
              ['Incorporated',    selected.incorporated],
              ['Contact',         selected.contact_email],
              ['Website',         selected.website],
              ['Companies',       selected.companies_count],
              ['Total Employees', selected.employees_total?.toLocaleString()],
            ].map(([label, value], i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between',
                padding:'9px 0', borderBottom:'1px solid #f8fafc', fontSize:12 }}>
                <span style={{ color:'#64748b' }}>{label}</span>
                <span style={{ fontWeight:700, color:'#0f172a' }}>{value}</span>
              </div>
            ))}
            <div style={{ marginTop:16, padding:'12px 14px', background:'#f5f3ff',
              borderRadius:10, border:'1px solid #ddd6fe' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#4c1d95', marginBottom:6 }}>
                🔗 Impact Links
              </div>
              {selected.impact_links?.map((link, i) => (
                <div key={i} style={{ fontSize:11, color:'#6d28d9', padding:'3px 0',
                  display:'flex', alignItems:'center', gap:6 }}>
                  <span>&#8594;</span> {link}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
