// FILE: src/components/layout/QuickDock.jsx
// eLogix HRMS — macOS-style Quick Access Dock
// Role-aware, plan-aware, module-filtered
// Hover scale + tooltip. Active item highlighted.
// All actions functional: navigate, AI Co-Pilot toggle, notifications
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _sess() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _navTo(page, directFn) {
  if (directFn) { directFn(page); return }
  window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page } }))
}

// ── Dock configs per role ─────────────────────────────────────
const DOCK = {
  'super-admin': [
    { emoji:'🏠', label:'Dashboard',      page:'super-admin-dashboard',    color:'#7c3aed' },
    { emoji:'👨‍💼', label:'Employees',     page:'employee-directory',       color:'#0284c7' },
    { emoji:'⏰', label:'Attendance',      page:'live-attendance',          color:'#0d9488' },
    { emoji:'📅', label:'Leave',           page:'leave-approval',           color:'#f59e0b' },
    { emoji:'💰', label:'Payroll',         page:'automated-payroll',        color:'#16a34a' },
    { emoji:'📊', label:'Analytics',       page:'bi-dashboard',             color:'#8b5cf6' },
    { emoji:'🤖', label:'AI Co-Pilot',     action:'ai',                     color:'#7c3aed', center:true },
    { emoji:'📋', label:'Recruitment',     page:'ats-dashboard',            color:'#e11d48' },
    { emoji:'🎯', label:'Performance',     page:'performance-dashboard',    color:'#0ea5e9' },
    { emoji:'🧠', label:'AI Insights',     page:'ai-insights',              color:'#7c3aed' },
    { emoji:'🔔', label:'Notifications',   action:'notif',                  color:'#f97316' },
    { emoji:'⚙️', label:'Settings',        page:'system-setting',           color:'#64748b' },
  ],
  executive: [
    { emoji:'🏠', label:'Dashboard',       page:'executive-dashboard',      color:'#7c3aed' },
    { emoji:'📊', label:'BI Reports',      page:'ai-business-intelligence', color:'#0284c7' },
    { emoji:'🔮', label:'Predictive AI',   page:'predictive-analytics',     color:'#8b5cf6' },
    { emoji:'👨‍💼', label:'Headcount',      page:'headcount-analysis',       color:'#0d9488' },
    { emoji:'⚠️', label:'Attrition Risk',  page:'ai-attrition-prediction',  color:'#e11d48' },
    { emoji:'🤖', label:'AI Co-Pilot',     action:'ai',                     color:'#7c3aed', center:true },
    { emoji:'📈', label:'Performance',     page:'performance-dashboard',    color:'#16a34a' },
    { emoji:'💰', label:'Payroll Snap',    page:'payroll-snapshot',         color:'#f59e0b' },
    { emoji:'🔔', label:'Notifications',   action:'notif',                  color:'#f97316' },
    { emoji:'👤', label:'My Profile',      page:'employee-profile',         color:'#64748b' },
  ],
  hr: [
    { emoji:'🏠', label:'Dashboard',       page:'hr-dashboard',             color:'#7c3aed' },
    { emoji:'👨‍💼', label:'Employees',      page:'employee-directory',       color:'#0284c7' },
    { emoji:'⏰', label:'Attendance',       page:'live-attendance',          color:'#0d9488' },
    { emoji:'📅', label:'Leave',            page:'leave-approval',           color:'#f59e0b' },
    { emoji:'💰', label:'Payroll',          page:'automated-payroll',        color:'#16a34a' },
    { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                     color:'#7c3aed', center:true },
    { emoji:'📋', label:'Recruitment',      page:'ats-dashboard',            color:'#e11d48' },
    { emoji:'🎯', label:'Performance',      page:'performance-dashboard',    color:'#0ea5e9' },
    { emoji:'📣', label:'Announcements',    page:'announcement-board',       color:'#8b5cf6' },
    { emoji:'🔔', label:'Notifications',    action:'notif',                  color:'#f97316' },
    { emoji:'⚙️', label:'Settings',         page:'system-setting',           color:'#64748b' },
  ],
  department: [
    { emoji:'🏠', label:'Dashboard',        page:'department-dashboard',     color:'#7c3aed' },
    { emoji:'👥', label:'My Team',          page:'employee-directory',       color:'#0284c7' },
    { emoji:'⏰', label:'Attendance',        page:'live-attendance',          color:'#0d9488' },
    { emoji:'✅', label:'Approvals',         page:'leave-approval',           color:'#16a34a' },
    { emoji:'📅', label:'Leave',             page:'leave-calendar',           color:'#f59e0b' },
    { emoji:'🤖', label:'AI Co-Pilot',       action:'ai',                     color:'#7c3aed', center:true },
    { emoji:'🎯', label:'Goals / OKR',       page:'okr-management',           color:'#8b5cf6' },
    { emoji:'📊', label:'Reports',           page:'bi-dashboard',             color:'#0ea5e9' },
    { emoji:'🎓', label:'Training',          page:'course-management',        color:'#e11d48' },
    { emoji:'🔔', label:'Notifications',     action:'notif',                  color:'#f97316' },
    { emoji:'👤', label:'My Profile',        page:'employee-profile',         color:'#64748b' },
  ],
  branch: [
    { emoji:'🏠', label:'Dashboard',         page:'super-admin-dashboard',    color:'#7c3aed' },
    { emoji:'👥', label:'Team',              page:'employee-directory',       color:'#0284c7' },
    { emoji:'⏰', label:'Attendance',         page:'live-attendance',          color:'#0d9488' },
    { emoji:'✅', label:'Approvals',          page:'leave-approval',           color:'#16a34a' },
    { emoji:'📅', label:'Leave',              page:'leave-calendar',           color:'#f59e0b' },
    { emoji:'🤖', label:'AI Co-Pilot',        action:'ai',                     color:'#7c3aed', center:true },
    { emoji:'📊', label:'Reports',            page:'bi-dashboard',             color:'#8b5cf6' },
    { emoji:'🔔', label:'Notifications',      action:'notif',                  color:'#f97316' },
    { emoji:'👤', label:'My Profile',         page:'employee-profile',         color:'#64748b' },
  ],
  employee: [
    { emoji:'🏠', label:'Home',              page:'employee-dashboard',        color:'#7c3aed' },
    { emoji:'⏰', label:'My Attendance',     page:'live-attendance',           color:'#0d9488' },
    { emoji:'📅', label:'Apply Leave',       page:'leave-request',             color:'#f59e0b' },
    { emoji:'🌴', label:'Leave Balance',     page:'leave-balance',             color:'#16a34a' },
    { emoji:'💰', label:'My Payslip',        page:'payslip-generation',        color:'#0284c7' },
    { emoji:'🤖', label:'AI Co-Pilot',       action:'ai',                      color:'#7c3aed', center:true },
    { emoji:'📄', label:'My Documents',      page:'document-management',       color:'#8b5cf6' },
    { emoji:'📣', label:'Announcements',     page:'announcement-board',        color:'#e11d48' },
    { emoji:'🎯', label:'My Goals',          page:'goal-assignment',           color:'#0ea5e9' },
    { emoji:'🔔', label:'Notifications',     action:'notif',                   color:'#f97316' },
    { emoji:'👤', label:'My Profile',        page:'employee-profile',          color:'#64748b' },
  ],
  finance: [
    { emoji:'🏠', label:'Dashboard',         page:'finance-dashboard',         color:'#7c3aed' },
    { emoji:'💰', label:'Payroll',           page:'automated-payroll',         color:'#16a34a' },
    { emoji:'🏦', label:'SSF / Tax',         page:'ssf-information',           color:'#0284c7' },
    { emoji:'💵', label:'Payslips',          page:'payslip-generation',        color:'#0d9488' },
    { emoji:'📊', label:'Cost Reports',      page:'payroll-reports',           color:'#8b5cf6' },
    { emoji:'🤖', label:'AI Co-Pilot',       action:'ai',                      color:'#7c3aed', center:true },
    { emoji:'🧾', label:'Bank Transfer',     page:'bank-transfer-file',        color:'#f59e0b' },
    { emoji:'⚖️', label:'Compliance',        page:'compliance-setup',          color:'#e11d48' },
    { emoji:'🔔', label:'Notifications',     action:'notif',                   color:'#f97316' },
    { emoji:'👤', label:'My Profile',        page:'employee-profile',          color:'#64748b' },
  ],
  'it-admin': [
    { emoji:'🏠', label:'Dashboard',         page:'super-admin-dashboard',     color:'#7c3aed' },
    { emoji:'⚙️', label:'System Settings',  page:'system-setting',            color:'#64748b' },
    { emoji:'👥', label:'User Management',  page:'user-management',            color:'#0284c7' },
    { emoji:'🔒', label:'Permissions',      page:'permission-matrix',          color:'#e11d48' },
    { emoji:'🔗', label:'Integrations',     page:'integration-hub',            color:'#0d9488' },
    { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                       color:'#7c3aed', center:true },
    { emoji:'📋', label:'Audit Logs',       page:'audit-logs',                 color:'#8b5cf6' },
    { emoji:'🔔', label:'Notifications',    action:'notif',                    color:'#f97316' },
    { emoji:'👤', label:'My Profile',       page:'employee-profile',           color:'#64748b' },
  ],
  recruitment: [
    { emoji:'🏠', label:'Dashboard',        page:'ats-dashboard',              color:'#7c3aed' },
    { emoji:'📋', label:'Job Postings',     page:'job-posting',                color:'#0284c7' },
    { emoji:'👤', label:'Candidates',       page:'candidate-database',         color:'#0d9488' },
    { emoji:'📅', label:'Interviews',       page:'interview-scheduling',       color:'#f59e0b' },
    { emoji:'📝', label:'Offer Letters',    page:'offer-management',           color:'#16a34a' },
    { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                       color:'#7c3aed', center:true },
    { emoji:'🏆', label:'Talent Pool',      page:'talent-pool',                color:'#8b5cf6' },
    { emoji:'🔔', label:'Notifications',    action:'notif',                    color:'#f97316' },
    { emoji:'👤', label:'My Profile',       page:'employee-profile',           color:'#64748b' },
  ],
}

const DEFAULT_DOCK = [
  { emoji:'🏠', label:'Home',             page:'employee-dashboard',           color:'#7c3aed' },
  { emoji:'⏰', label:'Attendance',       page:'live-attendance',               color:'#0d9488' },
  { emoji:'📅', label:'Leave',            page:'leave-request',                 color:'#f59e0b' },
  { emoji:'💰', label:'Payroll',          page:'automated-payroll',             color:'#16a34a' },
  { emoji:'🤖', label:'AI Co-Pilot',      action:'ai',                          color:'#7c3aed', center:true },
  { emoji:'📄', label:'Documents',        page:'document-management',           color:'#8b5cf6' },
  { emoji:'🔔', label:'Notifications',    action:'notif',                       color:'#f97316' },
  { emoji:'👤', label:'Profile',          page:'employee-profile',              color:'#64748b' },
]

// ── Plan module gates — which pages each plan allows ──────────
const PLAN_GATES = {
  trial:     ['live-attendance','leave-request','leave-balance','payslip-generation',
               'employee-dashboard','announcement-board','employee-profile','notifications'],
  starter:   ['live-attendance','leave-request','leave-balance','leave-approval',
               'payslip-generation','automated-payroll','employee-directory',
               'ats-dashboard','employee-profile','notifications','announcement-board'],
  growth:    null,  // null = no restriction (everything allowed)
  business:  null,
  enterprise:null,
  unlimited: null,
}

// ── Single dock item ──────────────────────────────────────────
function DockItem({ item, isActive, darkMode, onClick }) {
  const [hov, setHov] = useState(false)
  const isCenter = !!item.center

  return (
    <div style={{ position:'relative', display:'flex', flexDirection:'column',
      alignItems:'center', gap:3 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>

      {/* Tooltip */}
      {hov && (
        <div style={{ position:'absolute', bottom:'calc(100% + 8px)',
          left:'50%', transform:'translateX(-50%)',
          background:'#0f172a', color:'#fff',
          fontSize:10, fontWeight:700, whiteSpace:'nowrap',
          padding:'4px 10px', borderRadius:8,
          boxShadow:'0 4px 16px rgba(0,0,0,.3)',
          zIndex:200, pointerEvents:'none' }}>
          {item.label}
          <div style={{ position:'absolute', top:'100%', left:'50%',
            transform:'translateX(-50%)', width:0, height:0,
            borderLeft:'5px solid transparent', borderRight:'5px solid transparent',
            borderTop:'5px solid #0f172a' }}/>
        </div>
      )}

      {/* Icon button */}
      <button onClick={onClick} title={item.label}
        style={{
          width:  isCenter ? 48 : 40,
          height: isCenter ? 48 : 40,
          borderRadius: isCenter ? '50%' : 11,
          border: isActive ? `1.5px solid ${item.color}50` : '1.5px solid transparent',
          background: isCenter
            ? `linear-gradient(135deg,#1e1b4b 0%,${item.color} 60%,#c4b5fd 100%)`
            : isActive
              ? `${item.color}1a`
              : hov
                ? `${item.color}12`
                : darkMode ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.9)',
          cursor:'pointer',
          fontSize: isCenter ? 20 : 18,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all .18s',
          transform: hov ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
          boxShadow: isCenter
            ? `0 4px 16px ${item.color}55`
            : isActive
              ? `0 2px 8px ${item.color}30`
              : hov
                ? `0 4px 14px rgba(0,0,0,.12)`
                : 'none',
        }}>
        {item.emoji}
      </button>

      {/* Label */}
      <span style={{ fontSize:9, fontWeight: isActive ? 700 : 500,
        color: isActive ? item.color : darkMode ? 'rgba(255,255,255,.5)' : '#64748b',
        maxWidth:50, textAlign:'center', lineHeight:1.2,
        userSelect:'none', transition:'color .2s',
        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
        {item.label}
      </span>

      {/* Active indicator dot */}
      {isActive && (
        <div style={{ width:4, height:4, borderRadius:'50%',
          background:item.color, marginTop:-1,
          boxShadow:`0 0 6px ${item.color}` }}/>
      )}
    </div>
  )
}

// ── Main QuickDock ────────────────────────────────────────────
export default function QuickDock({ navTo: navToProp, sub: subProp }) {
  const [subState, setSubState] = useState('')
  const sub = subProp || subState
  const [notifCnt, setNotifCnt] = useState(0)
  const [darkMode, setDarkMode] = useState(localStorage.getItem('elogix_dark')==='true')

  // Track current page
  useEffect(() => {
    const h = e => setSubState(e.detail?.page || '')
    window.addEventListener('elogix:nav', h)
    return () => window.removeEventListener('elogix:nav', h)
  }, [])

  // Dark mode sync
  useEffect(() => {
    const h = () => setDarkMode(localStorage.getItem('elogix_dark')==='true')
    window.addEventListener('elogix:lang-change', h)
    return () => window.removeEventListener('elogix:lang-change', h)
  }, [])

  // Live notification count
  useEffect(() => {
    function load() {
      const s     = _sess()
      const token = localStorage.getItem('access_token') || s?.token || ''
      const slug  = s?.company?.slug || ''
      if (!token || !slug) return
      fetch('/api/v1/notifications?limit=1', {
        headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug }
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.data?.unread_count !== undefined) setNotifCnt(d.data.unread_count) })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  const s       = _sess()
  const role    = s?.user?.role || 'employee'
  const plan    = s?.company?.plan || 'trial'
  const granted = Array.isArray(s?.company?.modules) ? s.company.modules : []

  // Get raw dock for this role
  const rawItems = DOCK[role] || DEFAULT_DOCK

  // Filter by plan gates
  const planAllowed = PLAN_GATES[plan]

  // Filter by granted modules AND plan
  const items = rawItems.filter(item => {
    if (!item.page) return true  // always show action items (AI, notif)
    // Plan gate
    if (planAllowed && !planAllowed.some(p => item.page.includes(p) || p.includes(item.page))) {
      return false
    }
    // Module gate (if modules granted)
    if (granted.length > 0 && !granted.includes('all')) {
      const pageBase = item.page.split('-').slice(0, 2).join('-')
      const allowed  = granted.some(m =>
        item.page.includes(m) || m.includes(pageBase) || m === item.page
      )
      if (!allowed) return false
    }
    return true
  })

  // Inject live notif badge count into the notif item
  const displayItems = items.map(item =>
    item.action === 'notif' ? { ...item, badge: notifCnt } : item
  )

  function handleClick(item) {
    if (item.action === 'ai') {
      // Try floating button first, then event
      const btn = document.querySelector('[data-copilot-toggle]')
      if (btn) btn.click()
      else window.dispatchEvent(new CustomEvent('elogix:ai-toggle'))
      return
    }
    if (item.action === 'notif') {
      window.dispatchEvent(new CustomEvent('elogix:notif-toggle'))
      return
    }
    if (item.page) {
      // Direct navTo prop call (most reliable) — falls back to event
      _navTo(item.page, navToProp)
    }
  }

  return (
    <div role="toolbar" aria-label="Quick Access Dock"
      style={{
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        gap:6, padding:'6px 20px 10px',
        background: darkMode
          ? 'rgba(15,23,42,.96)'
          : 'rgba(248,250,252,.97)',
        backdropFilter:'blur(14px)',
        borderBottom:`1px solid ${darkMode ? 'rgba(255,255,255,.07)' : '#e2e8f0'}`,
        flexShrink:0, zIndex:50,
        overflowX:'auto', scrollbarWidth:'none',
        position:'relative',
      }}>

      {displayItems.map((item, i) => {
        const isActive = !!(item.page && sub === item.page)

        return (
          <div key={i} style={{ position:'relative' }}>
            <DockItem
              item={item}
              isActive={isActive}
              darkMode={darkMode}
              onClick={() => handleClick(item)}
            />
            {/* Live badge for notifications */}
            {item.badge > 0 && (
              <div style={{ position:'absolute', top:0, right:0,
                minWidth:16, height:16, borderRadius:8,
                background:'#ef4444', border:'2px solid #fff',
                color:'#fff', fontSize:8, fontWeight:800,
                display:'flex', alignItems:'center', justifyContent:'center',
                padding:'0 3px', lineHeight:1, zIndex:10,
                boxShadow:'0 1px 4px rgba(239,68,68,.5)' }}>
                {item.badge > 99 ? '99+' : item.badge}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
