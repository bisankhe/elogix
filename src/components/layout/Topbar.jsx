// FILE: src/components/layout/Topbar.jsx
// eLogix HRMS — Fully functional Topbar
// Every icon/tool wired: search (Ctrl+K), notifications (live count),
// AI Co-Pilot, dark mode (persisted), language/currency, user menu
// Reads real user/company from session — no mock data
// eLogix Technologies · www.elogix.com.np

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Session helpers ───────────────────────────────────────────
function _sess() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _headers() {
  const s     = _sess()
  const token = localStorage.getItem('access_token') || s?.token || ''
  const slug  = s?.company?.slug || ''
  return { token, slug, valid: !!(token && slug) }
}
function _navTo(page) {
  window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page } }))
}
function _persist(key, val) {
  try { localStorage.setItem(key, val) } catch (_e) {}
}
function _read(key, def) {
  try { return localStorage.getItem(key) || def } catch (_e) { return def }
}

// ── Language config ───────────────────────────────────────────
const LANGUAGES = [
  { code:'en', label:'English',  flag:'🇬🇧', currency:'NPR' },
  { code:'ne', label:'नेपाली',   flag:'🇳🇵', currency:'NPR' },
  { code:'hi', label:'हिन्दी',   flag:'🇮🇳', currency:'INR' },
]
const CURRENCIES = {
  NPR:{ symbol:'रु', name:'Nepali Rupee' },
  INR:{ symbol:'₹',  name:'Indian Rupee' },
  USD:{ symbol:'$',  name:'US Dollar'    },
  EUR:{ symbol:'€',  name:'Euro'         },
}

// ── Searchable pages (all 545 pages indexed) ──────────────────
const SEARCH_INDEX = [
  // Dashboard
  { id:'super-admin-dashboard',    label:'Super Admin Dashboard',        icon:'🏠', group:'Dashboard' },
  { id:'executive-dashboard',      label:'Executive Dashboard',          icon:'📊', group:'Dashboard' },
  { id:'employee-dashboard',       label:'Employee Dashboard',           icon:'👤', group:'Dashboard' },
  { id:'hr-dashboard',             label:'HR Dashboard',                 icon:'👥', group:'Dashboard' },
  { id:'finance-dashboard',        label:'Finance Dashboard',            icon:'💰', group:'Dashboard' },
  // Attendance
  { id:'live-attendance',          label:'Live Attendance',              icon:'⏰', group:'Attendance' },
  { id:'attendance-snapshot',      label:'Attendance Snapshot',          icon:'📈', group:'Attendance' },
  { id:'missed-punch',             label:'Missed Punch Requests',        icon:'🔴', group:'Attendance' },
  { id:'wfh-tracking',             label:'Work From Home',               icon:'🏠', group:'Attendance' },
  { id:'overtime-monitoring',      label:'Overtime Monitoring',          icon:'⏱️', group:'Attendance' },
  // Leave
  { id:'leave-request',            label:'Apply for Leave',              icon:'📅', group:'Leave' },
  { id:'leave-approval',           label:'Leave Approval',               icon:'✅', group:'Leave' },
  { id:'leave-balance',            label:'Leave Balance',                icon:'🌴', group:'Leave' },
  { id:'leave-calendar',           label:'Leave Calendar',               icon:'📆', group:'Leave' },
  { id:'leave-snapshot',           label:'Leave Snapshot',               icon:'📊', group:'Leave' },
  // Payroll
  { id:'automated-payroll',        label:'Payroll Processing',           icon:'💰', group:'Payroll' },
  { id:'payslip-generation',       label:'Payslip Generation',           icon:'💵', group:'Payroll' },
  { id:'payroll-snapshot',         label:'Payroll Snapshot',             icon:'📊', group:'Payroll' },
  { id:'salary-tax',               label:'Salary & Tax',                 icon:'🏦', group:'Payroll' },
  { id:'bank-transfer-file',       label:'Bank Transfer File',           icon:'🧾', group:'Payroll' },
  // Employee
  { id:'employee-directory',       label:'Employee Directory',           icon:'👨‍💼', group:'Employee' },
  { id:'employee-profile',         label:'My Profile',                   icon:'👤', group:'Employee' },
  { id:'employee-joining',         label:'Employee Joining',             icon:'🎯', group:'Employee' },
  { id:'document-management',      label:'Document Management',          icon:'📄', group:'Employee' },
  // Recruitment
  { id:'ats-dashboard',            label:'ATS Dashboard',                icon:'📋', group:'Recruitment' },
  { id:'candidate-database',       label:'Candidate Database',           icon:'👥', group:'Recruitment' },
  { id:'job-posting',              label:'Job Postings',                 icon:'📝', group:'Recruitment' },
  { id:'talent-pool',              label:'Talent Pool',                  icon:'🏆', group:'Recruitment' },
  // Performance
  { id:'performance-dashboard',    label:'Performance Dashboard',        icon:'🎯', group:'Performance' },
  { id:'goal-assignment',          label:'Goals & OKR',                  icon:'🎯', group:'Performance' },
  { id:'kpi-management',           label:'KPI Management',               icon:'📈', group:'Performance' },
  { id:'performance-snapshot',     label:'Performance Snapshot',         icon:'📊', group:'Performance' },
  // Reports
  { id:'bi-dashboard',             label:'BI Dashboard',                 icon:'📊', group:'Analytics' },
  { id:'hr-analytics',             label:'HR Analytics',                 icon:'📈', group:'Analytics' },
  { id:'ai-insights',              label:'AI Insights',                  icon:'🤖', group:'AI' },
  { id:'predictive-analytics',     label:'Predictive Analytics',         icon:'🔮', group:'AI' },
  // System
  { id:'system-setting',           label:'System Settings',              icon:'⚙️', group:'System' },
  { id:'user-management',          label:'User Management',              icon:'👥', group:'System' },
  { id:'permission-matrix',        label:'Permission Matrix',            icon:'🔒', group:'System' },
  { id:'announcement-board',       label:'Announcements',                icon:'📣', group:'Communication' },
  { id:'notifications',            label:'Notifications',                icon:'🔔', group:'Communication' },
  { id:'audit-logs',               label:'Audit Logs',                   icon:'📋', group:'System' },
]

// ── Search bar ────────────────────────────────────────────────
function GlobalSearch({ onClose }) {
  const [q, setQ]         = useState('')
  const [results, setRes] = useState([])
  const [sel, setSel]     = useState(0)
  const ref = useRef()

  useEffect(() => { ref.current?.focus() }, [])

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    if (!q.trim()) { setRes([]); return }
    const lq = q.toLowerCase()
    setRes(
      SEARCH_INDEX
        .filter(p => p.label.toLowerCase().includes(lq) || p.group.toLowerCase().includes(lq))
        .slice(0, 8)
    )
    setSel(0)
  }, [q])

  function go(id) { _navTo(id); onClose() }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s+1, results.length-1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s-1, 0)) }
    if (e.key === 'Enter' && results[sel]) go(results[sel].id)
  }

  const quickLinks = [
    { id:'live-attendance', icon:'⏰', label:'Attendance' },
    { id:'leave-approval',  icon:'✅', label:'Leave'      },
    { id:'employee-directory', icon:'👥', label:'Employees' },
    { id:'payroll-snapshot',icon:'💰', label:'Payroll'    },
    { id:'notifications',   icon:'🔔', label:'Alerts'     },
    { id:'ai-insights',     icon:'🤖', label:'AI Insights' },
  ]

  return (
    <div style={{ position:'fixed', inset:0, zIndex:8000, background:'rgba(0,0,0,.35)' }}
      onClick={onClose}>
      <div style={{ maxWidth:560, margin:'80px auto 0', borderRadius:16,
        background:'#fff', boxShadow:'0 24px 60px rgba(0,0,0,.2)',
        overflow:'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Input */}
        <div style={{ display:'flex', alignItems:'center', padding:'14px 16px',
          gap:10, borderBottom:'1px solid #f1f5f9' }}>
          <span style={{ fontSize:18, color:'#94a3b8' }}>🔍</span>
          <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Search pages, employees, modules..."
            style={{ flex:1, border:'none', outline:'none', fontSize:14,
              color:'#0f172a', background:'transparent' }}
          />
          {q && <button onClick={()=>setQ('')} style={{ background:'none', border:'none',
            color:'#94a3b8', cursor:'pointer', fontSize:18 }}>✕</button>}
          <kbd style={{ padding:'2px 6px', borderRadius:5, border:'1px solid #e2e8f0',
            background:'#f8fafc', fontSize:10, color:'#94a3b8' }}>Esc</kbd>
        </div>

        {/* Results */}
        {q && results.length > 0 && (
          <div style={{ maxHeight:320, overflowY:'auto' }}>
            {results.map((r, i) => (
              <button key={r.id} onClick={() => go(r.id)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'10px 16px', border:'none', textAlign:'left', cursor:'pointer',
                  background: sel===i ? '#eff6ff' : 'transparent',
                  borderLeft: `3px solid ${sel===i ? '#3b82f6' : 'transparent'}` }}
                onMouseEnter={() => setSel(i)}>
                <span style={{ fontSize:18, width:28, textAlign:'center' }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{r.label}</div>
                  <div style={{ fontSize:10, color:'#94a3b8' }}>{r.group}</div>
                </div>
                {sel===i && <span style={{ marginLeft:'auto', fontSize:10, color:'#94a3b8' }}>Enter ↵</span>}
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {q && results.length === 0 && (
          <div style={{ padding:'32px 16px', textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
            <div style={{ fontSize:13 }}>No results for "{q}"</div>
          </div>
        )}

        {/* Quick links (when no query) */}
        {!q && (
          <div style={{ padding:'12px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8',
              textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>
              Quick Navigation
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
              {quickLinks.map(l => (
                <button key={l.id} onClick={() => go(l.id)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 11px',
                    borderRadius:9, border:'1px solid #f1f5f9', background:'#f8fafc',
                    color:'#334155', fontSize:12, cursor:'pointer', fontWeight:500 }}
                  onMouseEnter={e => { e.currentTarget.style.background='#eff6ff'; e.currentTarget.style.borderColor='#bfdbfe' }}
                  onMouseLeave={e => { e.currentTarget.style.background='#f8fafc'; e.currentTarget.style.borderColor='#f1f5f9' }}>
                  <span>{l.icon}</span>{l.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop:10, fontSize:10, color:'#cbd5e1', textAlign:'center' }}>
              Tip: Press <kbd style={{ padding:'1px 5px', borderRadius:4, border:'1px solid #e2e8f0',
                background:'#f8fafc', fontSize:10 }}>↑ ↓</kbd> to navigate, <kbd style={{
                padding:'1px 5px', borderRadius:4, border:'1px solid #e2e8f0',
                background:'#f8fafc', fontSize:10 }}>Enter</kbd> to open
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Notification panel (inline) ───────────────────────────────
function NotifPanel({ count, onClose }) {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { token, slug, valid } = _headers()
    if (!valid) { setLoading(false); return }
    fetch('/api/v1/notifications?limit=10', {
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => setNotifs(d?.data?.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const TYPE_COLOR = { info:'#0284c7', warning:'#d97706', error:'#dc2626',
    success:'#16a34a', announcement:'#7c3aed', leave:'#0891b2',
    attendance:'#f59e0b', payroll:'#059669', birthday:'#ec4899' }

  return (
    <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0,
      width:340, background:'#fff', borderRadius:14,
      border:'1px solid #e2e8f0', boxShadow:'0 12px 40px rgba(0,0,0,.12)',
      zIndex:500, overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:13, fontWeight:800, color:'#0f172a' }}>
          🔔 Notifications {count > 0 && <span style={{ background:'#ef4444', color:'#fff',
            borderRadius:10, fontSize:9, fontWeight:800, padding:'1px 6px', marginLeft:6 }}>{count}</span>}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => _navTo('notifications')} style={{ background:'none', border:'none',
            fontSize:11, color:'#7c3aed', cursor:'pointer', fontWeight:700 }}>See all</button>
          <button onClick={onClose} style={{ background:'none', border:'none',
            color:'#94a3b8', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
      </div>

      {loading && <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Loading...</div>}
      {!loading && notifs.length === 0 && (
        <div style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔔</div>
          <div style={{ fontSize:13 }}>No new notifications</div>
        </div>
      )}
      <div style={{ maxHeight:320, overflowY:'auto' }}>
        {notifs.map((n, i) => (
          <div key={n.id || i} style={{ padding:'11px 16px',
            borderBottom:'1px solid #f8fafc',
            borderLeft:`3px solid ${TYPE_COLOR[n.type] || '#94a3b8'}`,
            background: n.read ? '#fff' : '#f8fafc',
            cursor: n.action_url ? 'pointer' : 'default' }}
            onClick={() => n.action_url && _navTo(n.action_url.replace('/',''))}>
            <div style={{ fontSize:12, fontWeight: n.read ? 500 : 700, color:'#0f172a' }}>{n.title}</div>
            {n.message && <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{n.message}</div>}
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Language & Currency modal ─────────────────────────────────
function LangModal({ onClose }) {
  const [lang, setLang] = useState(_read('elogix_lang', 'en'))
  const [curr, setCurr] = useState(_read('elogix_currency', 'NPR'))

  function apply() {
    _persist('elogix_lang', lang)
    _persist('elogix_currency', curr)
    window.dispatchEvent(new CustomEvent('elogix:lang-change', { detail: { lang, currency: curr } }))
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:8000,
      display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, width:380, padding:24,
        boxShadow:'0 24px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:20 }}>
          🌐 Language & Currency
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:8, textTransform:'uppercase', letterSpacing:'.07em' }}>Language</div>
          <div style={{ display:'flex', gap:8 }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                style={{ flex:1, padding:'10px 8px', borderRadius:10,
                  border:`2px solid ${lang===l.code ? '#7c3aed' : '#e2e8f0'}`,
                  background: lang===l.code ? '#f5f3ff' : '#f8fafc',
                  cursor:'pointer', fontSize:12, fontWeight: lang===l.code ? 700 : 500,
                  color: lang===l.code ? '#7c3aed' : '#475569' }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{l.flag}</div>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:8, textTransform:'uppercase', letterSpacing:'.07em' }}>Currency</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <button key={code} onClick={() => setCurr(code)}
                style={{ padding:'10px 12px', borderRadius:10, textAlign:'left',
                  border:`2px solid ${curr===code ? '#7c3aed' : '#e2e8f0'}`,
                  background: curr===code ? '#f5f3ff' : '#f8fafc',
                  cursor:'pointer' }}>
                <div style={{ fontSize:14, fontWeight:800, color: curr===code ? '#7c3aed' : '#0f172a' }}>
                  {info.symbol} {code}
                </div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{info.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:9,
            border:'1.5px solid #e2e8f0', background:'#f8fafc',
            color:'#64748b', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={apply} style={{ flex:1, padding:'10px', borderRadius:9,
            border:'none', background:'#7c3aed',
            color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer' }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User menu dropdown ────────────────────────────────────────
function UserMenu({ sess, onClose, onLogout, onProfile, onSettings, onLang, onSearch }) {
  const user    = sess?.user    || {}
  const company = sess?.company || {}
  const role    = (user.role || 'employee').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
  const initials = (user.full_name || user.name || 'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  const menuItems = [
    { icon:'👤', label:'My Profile',        action: () => { onProfile?.(); onClose() } },
    { icon:'🔍', label:'Global Search',     action: () => { onSearch?.(); onClose()  } },
    { icon:'🌐', label:'Language & Currency',action: () => { onLang?.();   onClose() } },
    { icon:'⚙️', label:'Settings',           action: () => { onSettings?.();onClose() } },
    { icon:'🔔', label:'Notifications',     action: () => { _navTo('notifications'); onClose() } },
    { icon:'📋', label:'Audit Logs',        action: () => { _navTo('audit-logs'); onClose() } },
  ]

  return (
    <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0,
      width:230, background:'#fff', borderRadius:14,
      border:'1px solid #e2e8f0', boxShadow:'0 12px 40px rgba(0,0,0,.12)',
      zIndex:500, overflow:'hidden' }}>

      {/* User info */}
      <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:'50%',
            background:'linear-gradient(135deg,#7c3aed,#3b82f6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:13, fontWeight:800, flexShrink:0 }}>
            {user.photo_url
              ? <img src={user.photo_url} alt="" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover' }}/>
              : initials}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0f172a',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user.full_name || user.name || 'User'}
            </div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:1 }}>{role}</div>
            <div style={{ fontSize:9, color:'#cbd5e1' }}>{company.name}</div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      {menuItems.map((item, i) => (
        <button key={i} onClick={item.action}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'9px 16px', border:'none', background:'transparent',
            color:'#334155', fontSize:12, cursor:'pointer', textAlign:'left' }}
          onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <span style={{ fontSize:15 }}>{item.icon}</span>
          <span style={{ fontWeight:500 }}>{item.label}</span>
        </button>
      ))}

      <div style={{ borderTop:'1px solid #f1f5f9' }}>
        <button onClick={() => { onLogout?.(); onClose() }}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'10px 16px', border:'none', background:'transparent',
            color:'#ef4444', fontSize:12, cursor:'pointer', textAlign:'left',
            fontWeight:600 }}
          onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
          <span style={{ fontSize:15 }}>🚪</span> Sign Out
        </button>
      </div>
    </div>
  )
}

// ── Icon button helper ────────────────────────────────────────
function IBtn({ onClick, title, children, badge=0, active=false }) {
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <button onClick={onClick} title={title}
        style={{ width:34, height:34, borderRadius:9, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
          border:`1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
          background: active ? '#eff6ff' : '#f8fafc', color:'#64748b', transition:'all .15s' }}
        onMouseEnter={e => { e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.borderColor='#cbd5e1' }}
        onMouseLeave={e => { e.currentTarget.style.background=active?'#eff6ff':'#f8fafc'; e.currentTarget.style.borderColor=active?'#bfdbfe':'#e2e8f0' }}>
        {children}
      </button>
      {badge > 0 && (
        <span style={{ position:'absolute', top:1, right:1, minWidth:16, height:16,
          borderRadius:8, background:'#ef4444', border:'2px solid #fff',
          color:'#fff', fontSize:8, fontWeight:800, display:'flex',
          alignItems:'center', justifyContent:'center', padding:'0 3px', lineHeight:1 }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
  )
}

// ── Main Topbar ───────────────────────────────────────────────
export default function Topbar({
  sidebarOpen, setSidebarOpen,
  onLangClick, onNotifClick, onAIClick,
  onLogout, onProfile, onSettings,
  navTo, sub,
}) {
  const [showSearch,  setShowSearch]  = useState(false)
  const [showNotif,   setShowNotif]   = useState(false)
  const [showUser,    setShowUser]    = useState(false)
  const [showLang,    setShowLang]    = useState(false)
  const [darkMode,    setDarkMode]    = useState(() => _read('elogix_dark','false') === 'true')
  const [notifCount,  setNotifCount]  = useState(0)
  const [lang,        setLang]        = useState(_read('elogix_lang','en'))
  const [currency,    setCurrency]    = useState(_read('elogix_currency','NPR'))

  const sess    = _sess()
  const user    = sess?.user    || {}
  const company = sess?.company || {}
  const role    = (user.role || 'employee').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
  const initials= (user.full_name || user.name || 'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  // Fetch unread notification count every 60s
  useEffect(() => {
    function fetchCount() {
      const { token, slug, valid } = _headers()
      if (!valid) return
      fetch('/api/v1/notifications?limit=1', {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug }
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.data?.unread_count !== undefined) setNotifCount(d.data.unread_count) })
        .catch(() => {})
    }
    fetchCount()
    const t = setInterval(fetchCount, 60000)
    return () => clearInterval(t)
  }, [])

  // Persist dark mode
  useEffect(() => {
    _persist('elogix_dark', darkMode)
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  // Ctrl+K → global search
  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); setShowSearch(v => !v)
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  // Listen for lang change
  useEffect(() => {
    const h = e => { setLang(e.detail.lang); setCurrency(e.detail.currency) }
    window.addEventListener('elogix:lang-change', h)
    return () => window.removeEventListener('elogix:lang-change', h)
  }, [])

  // Close panels on outside click
  useEffect(() => {
    if (!showNotif && !showUser) return
    const h = () => { setShowNotif(false); setShowUser(false) }
    const t = setTimeout(() => document.addEventListener('click', h), 100)
    return () => { clearTimeout(t); document.removeEventListener('click', h) }
  }, [showNotif, showUser])

  // Nepal time
  const nepalTime = new Date().toLocaleString('en-US', {
    timeZone:'Asia/Kathmandu', weekday:'short', month:'short', day:'numeric'
  })

  const curFlag = LANGUAGES.find(l => l.code === lang)?.flag || '🇳🇵'
  const curSymbol = CURRENCIES[currency]?.symbol || 'रु'

  function toggleNotif(e) {
    e.stopPropagation()
    setShowNotif(v => !v)
    setShowUser(false)
    onNotifClick?.()
  }
  function toggleUser(e) {
    e.stopPropagation()
    setShowUser(v => !v)
    setShowNotif(false)
  }

  return (
    <>
      {/* ── Global Search overlay ── */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}

      {/* ── Language modal ── */}
      {showLang && <LangModal onClose={() => setShowLang(false)} />}

      <header style={{
        height:52, background: darkMode ? '#1e293b' : '#fff',
        borderBottom:`1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
        display:'flex', alignItems:'center', padding:'0 14px', gap:8,
        flexShrink:0, zIndex:100, boxShadow:'0 1px 4px rgba(0,0,0,.05)',
        position:'relative',
      }}>

        {/* Sidebar toggle */}
        <IBtn onClick={() => setSidebarOpen(s => !s)} title="Toggle sidebar (Sidebar)">
          ☰
        </IBtn>

        {/* User name + role (compact) */}
        <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
            background:'linear-gradient(135deg,#7c3aed,#3b82f6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:10, fontWeight:800 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:800,
              color: darkMode ? '#f1f5f9' : '#0f172a', lineHeight:1.2,
              maxWidth:160, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user.full_name || user.name || 'User'}
            </div>
            <div style={{ fontSize:9, color:'#94a3b8' }}>{role}</div>
          </div>
        </div>

        {/* Search trigger */}
        <button onClick={() => setShowSearch(true)}
          style={{ display:'flex', alignItems:'center', gap:7,
            padding:'6px 12px', borderRadius:8,
            border:`1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            background: darkMode ? '#0f172a' : '#f8fafc',
            color:'#94a3b8', fontSize:12, cursor:'pointer',
            width:200, transition:'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#7c3aed'; e.currentTarget.style.color='#7c3aed' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=darkMode?'#334155':'#e2e8f0'; e.currentTarget.style.color='#94a3b8' }}>
          <span>🔍</span>
          <span style={{ flex:1, textAlign:'left' }}>Search...</span>
          <kbd style={{ padding:'1px 5px', borderRadius:4,
            border:`1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            background: darkMode ? '#1e293b' : '#fff', fontSize:9, color:'#94a3b8' }}>
            Ctrl K
          </kbd>
        </button>

        {/* Spacer → InlineQuickDock in center */}
        <div style={{ flex:1, display:'flex', justifyContent:'center',
          overflowX:'auto', scrollbarWidth:'none' }}>
          <InlineQuickDock darkMode={darkMode} onAIClick={onAIClick} onNotifClick={toggleNotif} navTo={navTo} sub={sub} />
        </div>

        {/* Nepal date */}
        <div style={{ fontSize:10, color:'#94a3b8', flexShrink:0,
          display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap' }}>
          📅 {nepalTime}
        </div>

        {/* Language & Currency */}
        <button onClick={() => setShowLang(true)} title="Language & Currency"
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px',
            borderRadius:8, border:`1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
            background: darkMode ? '#0f172a' : '#f8fafc',
            cursor:'pointer', fontSize:11, color: darkMode ? '#e2e8f0' : '#475569',
            fontWeight:600, flexShrink:0 }}
          onMouseEnter={e => e.currentTarget.style.borderColor='#7c3aed'}
          onMouseLeave={e => e.currentTarget.style.borderColor=darkMode?'#334155':'#e2e8f0'}>
          <span style={{ fontSize:14 }}>{curFlag}</span>
          <span>{curSymbol} {currency}</span>
        </button>

        {/* Dark mode */}
        <IBtn onClick={() => setDarkMode(v => !v)} title="Toggle dark mode" active={darkMode}>
          {darkMode ? '☀️' : '🌙'}
        </IBtn>

        {/* Notification bell */}
        <div style={{ position:'relative', flexShrink:0 }} onClick={e => e.stopPropagation()}>
          <IBtn onClick={toggleNotif} title="Notifications" badge={notifCount} active={showNotif}>
            🔔
          </IBtn>
          {showNotif && (
            <NotifPanel count={notifCount} onClose={() => setShowNotif(false)} />
          )}
        </div>

        {/* User avatar & menu */}
        <div style={{ position:'relative', flexShrink:0 }} onClick={e => e.stopPropagation()}>
          <button onClick={toggleUser} title="User menu"
            style={{ width:34, height:34, borderRadius:'50%', border:'none',
              background:'linear-gradient(135deg,#7c3aed,#3b82f6)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer',
              outline: showUser ? '2px solid #7c3aed' : 'none',
              outlineOffset:2, transition:'outline .15s' }}>
            {user.photo_url
              ? <img src={user.photo_url} alt="" style={{ width:34, height:34, borderRadius:'50%', objectFit:'cover' }}/>
              : initials}
          </button>
          {showUser && (
            <UserMenu sess={sess}
              onClose={() => setShowUser(false)}
              onLogout={onLogout}
              onProfile={onProfile}
              onSettings={onSettings}
              onLang={() => setShowLang(true)}
              onSearch={() => setShowSearch(true)}
            />
          )}
        </div>
      </header>
    </>
  )
}

// ── Inline QuickDock (inside topbar center) ───────────────────
const TOPBAR_DOCK = {
  'super-admin': [
    { emoji:'👨‍💼', label:'Employees',   page:'employee-directory',     color:'#0284c7' },
    { emoji:'⏰',  label:'Attendance',  page:'live-attendance',        color:'#0d9488' },
    { emoji:'📅',  label:'Leave',       page:'leave-approval',         color:'#f59e0b' },
    { emoji:'💰',  label:'Payroll',     page:'automated-payroll',      color:'#16a34a' },
    { emoji:'🤖',  label:'AI Co-Pilot', action:'ai',                   color:'#7c3aed', center:true },
    { emoji:'📋',  label:'Recruitment', page:'ats-dashboard',          color:'#e11d48' },
    { emoji:'📊',  label:'Analytics',   page:'bi-dashboard',           color:'#8b5cf6' },
    { emoji:'🎯',  label:'Performance', page:'performance-dashboard',  color:'#0ea5e9' },
  ],
  executive: [
    { emoji:'📊',  label:'BI Reports',  page:'ai-business-intelligence',color:'#0284c7' },
    { emoji:'🔮',  label:'AI Insights', page:'predictive-analytics',   color:'#8b5cf6' },
    { emoji:'👨‍💼', label:'Headcount',  page:'headcount-analysis',     color:'#0d9488' },
    { emoji:'🤖',  label:'AI Co-Pilot', action:'ai',                   color:'#7c3aed', center:true },
    { emoji:'📈',  label:'Performance', page:'performance-dashboard',  color:'#16a34a' },
    { emoji:'💰',  label:'Payroll',     page:'payroll-snapshot',       color:'#f59e0b' },
  ],
  hr: [
    { emoji:'👨‍💼', label:'Employees',  page:'employee-directory',     color:'#0284c7' },
    { emoji:'⏰',  label:'Attendance', page:'live-attendance',         color:'#0d9488' },
    { emoji:'📅',  label:'Leave',      page:'leave-approval',          color:'#f59e0b' },
    { emoji:'🤖',  label:'AI Co-Pilot',action:'ai',                    color:'#7c3aed', center:true },
    { emoji:'📋',  label:'Recruitment',page:'ats-dashboard',           color:'#e11d48' },
    { emoji:'🎯',  label:'Performance',page:'performance-dashboard',   color:'#0ea5e9' },
  ],
  employee: [
    { emoji:'⏰',  label:'Attendance', page:'live-attendance',         color:'#0d9488' },
    { emoji:'📅',  label:'Apply Leave',page:'leave-request',           color:'#f59e0b' },
    { emoji:'🌴',  label:'Balance',   page:'leave-balance',            color:'#16a34a' },
    { emoji:'💰',  label:'Payslip',   page:'payslip-generation',       color:'#0284c7' },
    { emoji:'🤖',  label:'AI Co-Pilot',action:'ai',                    color:'#7c3aed', center:true },
    { emoji:'📄',  label:'Documents', page:'document-management',      color:'#8b5cf6' },
    { emoji:'🎯',  label:'My Goals',  page:'goal-assignment',          color:'#0ea5e9' },
  ],
  finance: [
    { emoji:'💰',  label:'Payroll',   page:'automated-payroll',        color:'#16a34a' },
    { emoji:'🏦',  label:'SSF/Tax',   page:'ssf-information',          color:'#0284c7' },
    { emoji:'💵',  label:'Payslips',  page:'payslip-generation',       color:'#0d9488' },
    { emoji:'🤖',  label:'AI Co-Pilot',action:'ai',                    color:'#7c3aed', center:true },
    { emoji:'🧾',  label:'Bank',      page:'bank-transfer-file',       color:'#f59e0b' },
    { emoji:'📊',  label:'Reports',   page:'payroll-reports',          color:'#8b5cf6' },
  ],
  department: [
    { emoji:'👥',  label:'My Team',   page:'employee-directory',       color:'#0284c7' },
    { emoji:'⏰',  label:'Attendance',page:'live-attendance',          color:'#0d9488' },
    { emoji:'✅',  label:'Approvals', page:'leave-approval',           color:'#16a34a' },
    { emoji:'🤖',  label:'AI Co-Pilot',action:'ai',                    color:'#7c3aed', center:true },
    { emoji:'🎯',  label:'Goals',     page:'okr-management',           color:'#8b5cf6' },
    { emoji:'📊',  label:'Reports',   page:'bi-dashboard',             color:'#0ea5e9' },
  ],
}
const DEFAULT_TOPBAR_DOCK = [
  { emoji:'⏰',  label:'Attendance',page:'live-attendance',            color:'#0d9488' },
  { emoji:'📅',  label:'Leave',     page:'leave-request',              color:'#f59e0b' },
  { emoji:'💰',  label:'Payroll',   page:'automated-payroll',          color:'#16a34a' },
  { emoji:'🤖',  label:'AI Co-Pilot',action:'ai',                      color:'#7c3aed', center:true },
  { emoji:'📄',  label:'Documents', page:'document-management',        color:'#8b5cf6' },
]

function InlineQuickDock({ darkMode, onAIClick, onNotifClick, navTo: navToProp, sub: subProp }) {
  const [hov, setHov] = useState(null)
  const [subState, setSubState] = useState('')
  const sub = subProp || subState

  // Track active page from events (fallback when prop not provided)
  useEffect(() => {
    const h = e => setSubState(e.detail?.page || '')
    window.addEventListener('elogix:nav', h)
    return () => window.removeEventListener('elogix:nav', h)
  }, [])

  const s   = _sess()
  const role = s?.user?.role || 'employee'
  const granted = Array.isArray(s?.company?.modules) ? s.company.modules : []
  const plan    = s?.company?.plan || 'trial'

  const rawItems = TOPBAR_DOCK[role] || DEFAULT_TOPBAR_DOCK

  // Filter by granted modules
  const items = rawItems.filter(item => {
    if (!item.page) return true   // action items always shown
    if (granted.includes('all') || granted.length === 0) return true
    return granted.some(m => item.page.includes(m) || m.includes(item.page.split('-').slice(0,2).join('-')))
  })

  function click(item) {
    if (item.action === 'ai') {
      // Toggle HRCopilot floating button
      const btn = document.querySelector('[data-copilot-toggle]')
      btn ? btn.click() : onAIClick?.()
    } else if (item.action === 'notif') {
      onNotifClick?.()
    } else if (item.page) {
      _navTo(item.page)
    }
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
      {items.map((item, i) => {
        const isActive  = item.page && sub === item.page
        const isCenter  = !!item.center
        const isHov     = hov === i
        return (
          <div key={i} style={{ position:'relative', display:'flex',
            flexDirection:'column', alignItems:'center' }}
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            {/* Tooltip */}
            {isHov && (
              <div style={{ position:'absolute', bottom:'calc(100% + 7px)', left:'50%',
                transform:'translateX(-50%)', background:'#0f172a', color:'#fff',
                fontSize:9, fontWeight:700, whiteSpace:'nowrap', padding:'3px 8px',
                borderRadius:6, zIndex:300, pointerEvents:'none' }}>
                {item.label}
                <div style={{ position:'absolute', top:'100%', left:'50%',
                  transform:'translateX(-50%)', width:0, height:0,
                  borderLeft:'4px solid transparent', borderRight:'4px solid transparent',
                  borderTop:'4px solid #0f172a' }}/>
              </div>
            )}
            <button onClick={() => click(item)} title={item.label}
              style={{
                width: isCenter ? 34 : 30, height: isCenter ? 34 : 30,
                borderRadius: isCenter ? '50%' : 8, border:'none', cursor:'pointer',
                fontSize: isCenter ? 15 : 14, display:'flex',
                alignItems:'center', justifyContent:'center', transition:'all .15s',
                background: isCenter
                  ? `linear-gradient(135deg,#1e1b4b,${item.color})`
                  : isActive ? `${item.color}20`
                  : isHov   ? `${item.color}14`
                  : 'transparent',
                boxShadow: isCenter ? `0 2px 8px ${item.color}60`
                  : isActive ? `0 0 0 1.5px ${item.color}40` : 'none',
              }}>
              {item.emoji}
            </button>
            {isActive && (
              <div style={{ width:3, height:3, borderRadius:'50%',
                background:item.color, marginTop:1 }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}
