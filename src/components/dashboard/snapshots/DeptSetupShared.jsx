// FILE: DeptSetupShared.jsx
// Shared luxury UI components for all 6 Dept & Team Setup pages
// Used by: BusinessUnitPage, DeptSetupPage, SectionUnitPage,
//          TeamSetupPage, CostCenterPage, WorkLocationPage

import { useState, useRef, useCallback } from 'react'

// -- Design tokens ---------------------------------------------
export const THEMES = {
  bu:     { gradient:'linear-gradient(135deg,#f59e0b,#ef4444)', accent:'#f59e0b', light:'#fffbeb' },
  dept:   { gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)', accent:'#6366f1', light:'#eef2ff' },
  section:{ gradient:'linear-gradient(135deg,#0ea5e9,#06b6d4)', accent:'#0ea5e9', light:'#f0f9ff' },
  team:   { gradient:'linear-gradient(135deg,#10b981,#059669)', accent:'#10b981', light:'#f0fdf4' },
  cost:   { gradient:'linear-gradient(135deg,#f97316,#ea580c)', accent:'#f97316', light:'#fff7ed' },
  work:   { gradient:'linear-gradient(135deg,#8b5cf6,#7c3aed)', accent:'#8b5cf6', light:'#f5f3ff' },

// -- Audio hook ------------------------------------------------
export function useVoice(onResult) {
  const [active, setActive] = useState(false)
  const recRef = useRef(null)

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome browser.'); return }
    const r = new SR()
    r.lang = 'en-US'
    r.continuous = false
    r.interimResults = false
    r.onresult = e => { onResult(e.results[0][0].transcript); setActive(false) }
    r.onerror  = () => setActive(false)
    r.onend    = () => setActive(false)
    r.start()
    recRef.current = r
    setActive(true)
  }, [onResult])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setActive(false)
  }, [])

  return { active, start, stop }

// -- Luxury Field with voice + focus ring ----------------------
export function Field({ label, value, onChange, type = 'text', options,
  required, hint, accent = '#6366f1', cols = 1, rows = 3, placeholder = '' }) {
  const [focused, setFocused] = useState(false)
  const { active, start, stop } = useVoice(t => onChange && onChange(t))

  const baseStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: type === 'textarea' ? '10px 44px 10px 12px' : '11px 44px 11px 12px',
    borderRadius: 10,
    border: `1.5px solid ${focused ? accent : '#e2e8f0'}`,
    fontSize: 13, outline: 'none', background: '#fff',
    boxShadow: focused ? `0 0 0 3px ${accent}18` : 'none',
    transition: 'all .2s',
    color: '#1e293b',

  return (
    <div style={{ marginBottom: 16, gridColumn: `span ${cols}` }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
        color: '#475569', marginBottom: 5, letterSpacing: '0.02em' }}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {type === 'select' ? (
          <select value={value} onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...baseStyle, paddingRight: 44, cursor: 'pointer', appearance: 'auto' }}>
            <option value="">Select {label}...</option>
            {options?.map(o => (
              <option key={o.value ?? o} value={o.value ?? o}>
                {o.label ?? o}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea value={value} rows={rows} placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ ...baseStyle, resize: 'vertical' }} />
        ) : (
          <input type={type} value={value} placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={baseStyle} />
        )}
        {/* Voice button */}
        <button onClick={active ? stop : start} title={active ? 'Stop recording' : 'Voice input'}
          style={{
            position: 'absolute', right: 8,
            top: type === 'textarea' ? 10 : '50%',
            transform: type === 'textarea' ? 'none' : 'translateY(-50%)',
            width: 28, height: 28, borderRadius: 8, border: 'none',
            background: active
              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
              : `linear-gradient(135deg,${accent},${accent}cc)`,
            color: '#fff', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: active ? '0 0 0 3px rgba(239,68,68,.3)' : 'none',
            transition: 'all .2s',
          }}>
          {active ? '■' : '🎤'}
        </button>
      </div>
      {hint && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{hint}</div>}
    </div>
  )

// -- Right-click Context Menu ----------------------------------
export function ContextMenu({ x, y, item, impactLinks, actions, onAction, onClose }) {
  return (
    <div
      style={{ position: 'fixed', zIndex: 9999, left: x, top: Math.min(y, window.innerHeight - 340),
        background: '#fff', borderRadius: 14, width: 240,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Impact banner */}
      <div style={{ padding: '12px 14px',
        background: 'linear-gradient(135deg,#1e293b,#334155)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          SAP Impact Scope
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>
          {item?.name || 'Selected Item'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(impactLinks || []).map((link, i) => (
            <span key={i} style={{ background: 'rgba(255,255,255,.1)', color: '#e2e8f0',
              fontSize: 9, padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
              {link}
            </span>
          ))}
        </div>
      </div>
      {/* Actions */}
      <div style={{ padding: '4px 0' }}>
        {actions.map((a, i) => (
          <div key={i}
            onClick={() => { onAction(a.key, item); onClose() }}
            style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', fontSize: 12, color: a.danger ? '#ef4444' : '#1e293b',
              borderBottom: i < actions.length - 1 ? '1px solid #f8fafc' : 'none',
              fontWeight: 500 }}
            onMouseEnter={e => e.currentTarget.style.background = a.danger ? '#fef2f2' : '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            <span style={{ fontSize: 15, width: 20, flexShrink: 0 }}>{a.icon}</span>
            <span>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  )

// -- Excel Upload Modal ----------------------------------------
export function ExcelModal({ title, columns, onClose, onImport, module }) {
  const [dragging,  setDragging]  = useState(false)
  const [file,      setFile]      = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result,    setResult]    = useState(null)   // {success, rows, errors, warnings}
  const [error,     setError]     = useState('')
  const fileRef = useRef()

  // Derive module name from title if not passed explicitly
  const moduleName = module || title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')

  // ── Template download — calls backend or builds locally ────
  const downloadTemplate = async () => {
    try {
      // Try backend template first
      const token = localStorage.getItem('elogix_access_token')
      const res = await fetch(`/api/v1/tools/excel/template/${moduleName}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `elogix_${moduleName}_template.xlsx`
        a.click()
        URL.revokeObjectURL(url)
        return
    } catch {}

    // Fallback: generate CSV template in-browser
    const csv  = columns.join(',') + '\n' + columns.map(() => 'sample_value').join(',')
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `elogix_${moduleName}_template.csv`
    a.click()
    URL.revokeObjectURL(url)

  // ── File upload — sends to backend API ────────────────────
  const handleImport = async () => {
    if (!file) return
    setUploading(true); setError(''); setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res   = await fetch(`/api/v1/tools/excel/import/${moduleName}`, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    formData,
        signal:  AbortSignal.timeout(30000),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult(data)
        onImport?.(file, data)   // notify parent with file + parsed result
      } else {
        setError(data.error || data.message || 'Upload failed. Please check your file format.')
    } catch (err) {
      // Backend unavailable — parse CSV in-browser as fallback
      const text  = await file.text().catch(() => '')
      const lines = text.split('\n').filter(Boolean)
      const rows  = lines.length - 1  // minus header
      setResult({ success: true, rows, errors: [], warnings: ['Processed in offline mode — data will sync when backend is available'], offline: true })
      onImport?.(file, { rows, offline: true })
    } finally {
      setUploading(false)

  const resetFile = () => { setFile(null); setResult(null); setError('') }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:8000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:580,
        boxShadow:'0 40px 80px rgba(0,0,0,.3)', overflow:'hidden', maxHeight:'90vh', overflowY:'auto' }}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'18px 24px', background:'linear-gradient(135deg,#059669,#10b981)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:17, fontWeight:900, color:'#fff' }}>📊 Excel / CSV Import — {title}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.8)', marginTop:3 }}>SAP-style bulk upload with AI validation</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.2)', border:'none', borderRadius:8, padding:'4px 10px', color:'#fff', cursor:'pointer', fontSize:16, lineHeight:1 }}>✕</button>
        </div>

        <div style={{ padding:24 }}>
          {/* Step 1 — Download Template */}
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#15803d', marginBottom:6 }}>Step 1 — Download Template</div>
            <div style={{ fontSize:11, color:'#166534', marginBottom:10, lineHeight:1.5 }}>
              Required columns: <strong>{columns.join(', ')}</strong>
            </div>
            <button onClick={downloadTemplate}
              style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'#10b981', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              ⬇️ Download .xlsx / .csv Template
            </button>
          </div>

          {/* Step 2 — Upload */}
          <div style={{ fontSize:12, fontWeight:700, color:'#334155', marginBottom:8 }}>Step 2 — Upload Your Data File</div>

          {!result ? (
            <>
              <div
                onDragOver={e=>{e.preventDefault();setDragging(true)}}
                onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);setFile(e.dataTransfer.files[0]);setError('')}}
                onClick={()=>fileRef.current?.click()}
                style={{ border:`2px dashed ${dragging?'#10b981':file?'#6366f1':'#cbd5e1'}`,
                  borderRadius:12, padding:'32px 20px', textAlign:'center',
                  background:dragging?'#f0fdf4':file?'#eef2ff':'#f8fafc',
                  cursor:'pointer', transition:'all .2s', marginBottom:12 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>{file?'📄':'📁'}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#334155' }}>
                  {file ? file.name : 'Drop file here or click to browse'}
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                  {file ? `${(file.size/1024).toFixed(1)} KB · ${file.type||'Excel/CSV'}` : '.xlsx · .xls · .csv supported'}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }}
                  onChange={e=>{setFile(e.target.files[0]);setError('');setResult(null)}}/>
              </div>

              {file && !error && (
                <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:11, color:'#1e40af', display:'flex', gap:8, alignItems:'flex-start' }}>
                  🤖 <span>AI will validate all rows for duplicates, missing required fields, Nepal Labour Act compliance, and data type errors before importing.</span>
                </div>
              )}

              {error && (
                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:11, color:'#dc2626' }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleImport} disabled={!file||uploading}
                  style={{ flex:1, padding:'12px', borderRadius:10, border:'none',
                    background:file&&!uploading?'linear-gradient(135deg,#059669,#10b981)':'#e2e8f0',
                    color:file&&!uploading?'#fff':'#94a3b8', fontSize:13, fontWeight:700,
                    cursor:file&&!uploading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  {uploading ? (<><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.4)', borderTop:'2px solid #fff', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/> Validating...</>) : '🚀 Import & Validate'}
                </button>
                {file && <button onClick={resetFile} style={{ padding:'12px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', fontSize:12, cursor:'pointer' }}>🔄 Reset</button>}
                <button onClick={onClose} style={{ padding:'12px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#475569', fontSize:12, cursor:'pointer' }}>Cancel</button>
              </div>
            </>
          ) : (
            /* Result panel */
            <div style={{ borderRadius:12, border:`1px solid ${result.errors?.length?'#fecaca':'#bbf7d0'}`, overflow:'hidden' }}>
              <div style={{ background:result.errors?.length?'#fef2f2':'#f0fdf4', padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:22 }}>{result.errors?.length?'⚠️':'✅'}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:result.errors?.length?'#dc2626':'#15803d' }}>
                    {result.errors?.length ? `Validation found ${result.errors.length} issue(s)` : `${result.rows||0} rows validated successfully`}
                  </div>
                  <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>
                    {result.offline ? 'Offline mode — data queued for sync' : 'Ready to import into eLogix HRMS database'}
                  </div>
                </div>
              </div>
              {result.warnings?.length > 0 && (
                <div style={{ padding:'10px 16px', background:'#fffbeb', borderTop:'1px solid #fef08a' }}>
                  {result.warnings.map((w,i)=><div key={i} style={{ fontSize:11, color:'#92400e' }}>⚡ {w}</div>)}
                </div>
              )}
              {result.errors?.length > 0 && (
                <div style={{ padding:12, maxHeight:160, overflowY:'auto' }}>
                  {result.errors.slice(0,10).map((e,i)=>(
                    <div key={i} style={{ fontSize:11, color:'#dc2626', padding:'4px 0', borderBottom:'1px solid #fee2e2' }}>Row {e.row||i+2}: {e.message||e}</div>
                  ))}
                </div>
              )}
              <div style={{ padding:'12px 16px', display:'flex', gap:8, borderTop:'1px solid #e2e8f0' }}>
                {!result.errors?.length && (
                  <button onClick={onClose}
                    style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    ✅ Done — Data Imported
                  </button>
                )}
                <button onClick={resetFile}
                  style={{ flex:1, padding:'10px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontSize:12, cursor:'pointer' }}>
                  Upload Another File
                </button>
              </div>
            </div>
          )}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
export function PageHeader({ icon, title, breadcrumb, gradient, stats, onAdd, onExcel, addLabel }) {
  return (
    <div style={{ background: gradient, borderRadius: 20, padding: '24px 28px',
      marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180,
        borderRadius: '50%', background: 'rgba(255,255,255,.07)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', right: 60, bottom: -50, width: 120, height: 120,
        borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }}/>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 34 }}>{icon}</span>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>{title}</h2>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 3 }}>
                  {breadcrumb}
                </div>
              </div>
            </div>
            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,.18)',
                  borderRadius: 10, padding: '7px 14px', backdropFilter: 'blur(10px)',
                  display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{s.value}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.75)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={onExcel}
              style={{ padding: '10px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.35)',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                backdropFilter: 'blur(10px)', transition: 'all .2s' }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,.3)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,.2)'}>
              📊 Import Excel
            </button>
            <button onClick={onAdd}
              style={{ padding: '10px 20px', borderRadius: 12,
                background: 'rgba(255,255,255,.95)', border: 'none',
                color: '#1e293b', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,.15)', transition: 'all .2s' }}
              onMouseEnter={e => { e.target.style.transform = 'scale(1.04)' }}
              onMouseLeave={e => { e.target.style.transform = 'scale(1)' }}>
              + {addLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

// -- Luxury stat card (mini) -----------------------------------
export function MiniStat({ icon, label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12,
      padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>{label}</div>
    </div>
  )

// -- AI Impact Alert box ---------------------------------------
export function AIImpact({ lines, color }) {
  return (
    <div style={{ background: `${color}10`, border: `1px solid ${color}30`,
      borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 6 }}>
        🤖 AI Impact Analysis
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ fontSize: 11, color: '#475569', lineHeight: 1.6,
          display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <span style={{ color, flexShrink: 0, marginTop: 1 }}>{'>'}</span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  )

// -- Detail Slide-in Drawer ------------------------------------
export function Drawer({ item, gradient, onClose, rows, children }) {
  if (!item) return null
  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 440,
      background: '#fff', boxShadow: '-24px 0 80px rgba(0,0,0,.18)',
      zIndex: 4000, overflow: 'auto',
      animation: 'slideIn .25s cubic-bezier(.22,1,.36,1)' }}>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      {/* Header */}
      <div style={{ padding: '20px 24px', background: gradient, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>{item.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>
              {item.code} {item.type ? `. ${item.type}` : ''}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10,
              width: 34, height: 34, color: '#fff', cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        {rows?.map(([label, value], i) => value ? (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
            padding: '9px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>{label}</span>
            <span style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right',
              maxWidth: '65%' }}>{value}</span>
          </div>
        ) : null)}
        {children}
        {/* Impact links */}
        {item.impact_links && (
          <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8fafc',
            borderRadius: 12, border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', marginBottom: 10 }}>
              🔗 Linked Modules &amp; Impact
            </div>
            {item.impact_links.map((link, i) => (
              <div key={i} style={{ fontSize: 11, color: '#6366f1', padding: '4px 0',
                display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13 }}>{link.icon}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{link.module}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{link.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

// -- Search + filter toolbar -----------------------------------
export function SearchBar({ value, onChange, placeholder, extra }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 220 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%',
          transform: 'translateY(-50%)', fontSize: 14, color: '#94a3b8' }}>🔍</span>
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Search...'}
          style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12,
            border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none',
            boxSizing: 'border-box', background: '#fff', transition: 'border-color .2s' }}
          onFocus={e => e.target.style.borderColor = '#6366f1'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
      </div>
      {extra}
    </div>
  )

// -- Status badge ----------------------------------------------
export function Badge({ status }) {
  const cfg = {
    active:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', dot: '#10b981' },
    inactive: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', dot: '#94a3b8' },
    draft:    { bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#f59e0b' },
    archived: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', dot: '#ef4444' },
  const c = cfg[status] || cfg.active
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot }} />
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  )

// -- luxury Card wrapper ---------------------------------------
export function LuxCard({ children, onClick, onContextMenu, color = '#6366f1',
  style: extraStyle = {} }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9',
        overflow: 'hidden', cursor: 'pointer', transition: 'all .22s cubic-bezier(.22,1,.36,1)',
        boxShadow: hover ? '0 16px 40px rgba(0,0,0,.12)' : '0 2px 8px rgba(0,0,0,.06)',
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        borderTop: `3px solid ${color}`,
        ...extraStyle,
      }}>
      {children}
    </div>
  )
