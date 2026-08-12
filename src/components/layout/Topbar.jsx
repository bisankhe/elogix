import React from 'react'
// ============================================================
// FILE: src/components/layout/Topbar.jsx
// PURPOSE: Application topbar — persona display, global search,
//          language/currency selector, dark mode toggle,
//          notification bell, AI assistant, user avatar
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import { getTenantContext } from '../../data/rolePersonaMap.js'
import { LANGUAGES } from '../../i18n/index.js'

// ── User Menu Dropdown ────────────────────────────────────────
function UserMenu({ currentPersona, t, onClose, onLogout, onProfile, onSettings, onLanguage }) {
  const { darkMode, setDarkMode, setLanguage, language } = useApp()

  return (
    <div style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 6,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      boxShadow: '0 10px 40px rgba(0,0,0,.12)', minWidth: 220, zIndex: 200,
      overflow: 'hidden',
    }}>
      {/* User Info */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: `linear-gradient(135deg,${currentPersona?.color || '#3b82f6'},#8b5cf6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>
            {currentPersona?.avatar}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
              {currentPersona?.icon} {currentPersona?.label}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>eLogix HRMS · Session Active</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      {[
        { icon: '👤', label: t('myProfile')   || 'My Profile',   action: () => { onClose(); onProfile?.() } },
        { icon: '⚙️', label: t('settings')    || 'Settings',     action: () => { onClose(); onSettings?.() } },
        { icon: '🌐', label: t('language')    || 'Language',     action: () => { onClose(); onLanguage?.() } },
        { icon: darkMode ? '☀️' : '🌙',
          label: t('darkMode')    || 'Dark Mode',
          action: () => setDarkMode(d => !d),
          right: darkMode ? <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>ON</span> : <span style={{ fontSize: 10, color: '#94a3b8' }}>OFF</span>
        },
      ].map((item, i) => (
        <button key={i} onClick={() => { item.action(); }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', border: 'none', background: 'transparent',
            color: '#334155', fontSize: 12, cursor: 'pointer', textAlign: 'left',
            borderBottom: '1px solid #f8fafc',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <span style={{ flex: 1, fontWeight: 500 }}>{item.label}</span>
          {item.right}
        </button>
      ))}

      {/* Logout */}
      <button
        onClick={() => {
          onClose()
          if (onLogout) onLogout()
        }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', border: 'none', background: 'transparent',
          color: '#ef4444', fontSize: 12, cursor: 'pointer', textAlign: 'left',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: 16 }}>🚪</span>
        <span style={{ fontWeight: 600 }}>{t('logout') || 'Logout'}</span>
      </button>
    </div>
  )
}

// ── Search Bar ────────────────────────────────────────────────
function SearchBar({ t, onClose }) {
  const { navTo } = useApp()
  const [query, setQuery] = useState('')
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const quickLinks = [
    { icon: '📊', label: 'Dashboard',        id: 'executive-dashboard'    },
    { icon: '✅', label: 'Leave Approval',   id: 'leave-approval'         },
    { icon: '👥', label: 'Employee Database', id: 'employee-database'     },
    { icon: '💰', label: 'Payroll',          id: 'payroll-snapshot'       },
    { icon: '🎯', label: 'Performance',      id: 'performance-snapshot'   },
    { icon: '🔔', label: 'Notifications',    id: 'notifications'          },
  ]

  return (
    <div style={{
      position: 'absolute', top: '100%', left: '50%',
      transform: 'translateX(-50%)', marginTop: 6,
      width: 480, background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 12,
      boxShadow: '0 10px 40px rgba(0,0,0,.12)', zIndex: 200, overflow: 'hidden',
    }}>
      {/* Input */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10, borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search employees, modules, reports..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#0f172a', background: 'transparent' }}
        />
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>

      {/* Quick Links */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, padding: '0 4px' }}>
          Quick Navigation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {quickLinks.map((link, i) => (
            <button key={i}
              onClick={() => { navTo(link.id); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 10px', borderRadius: 8,
                border: '1px solid #f1f5f9', background: '#f8fafc',
                color: '#334155', fontSize: 11, cursor: 'pointer',
                transition: 'all .12s', textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#1d4ed8' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.color = '#334155' }}
            >
              <span>{link.icon}</span>
              <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', fontSize: 10, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
        <span>Press <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 10 }}>Enter</kbd> to search</span>
        <span>Press <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 10 }}>Esc</kbd> to close</span>
      </div>
    </div>
  )
}

// ── Topbar Button ─────────────────────────────────────────────
function TBtn({ onClick, children, badge, title, active }) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        title={title}
        style={{
          width: 34, height: 34, borderRadius: 9,
          border: `1px solid ${active ? '#bfdbfe' : '#e2e8f0'}`,
          background: active ? '#eff6ff' : '#f8fafc',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16, color: '#64748b',
          transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1' }}
        onMouseLeave={e => { e.currentTarget.style.background = active ? '#eff6ff' : '#f8fafc'; e.currentTarget.style.borderColor = active ? '#bfdbfe' : '#e2e8f0' }}
      >
        {children}
      </button>
      {badge && (
        <span style={{
          position: 'absolute', top: 3, right: 3,
          width: 8, height: 8, borderRadius: '50%',
          background: '#ef4444', border: '2px solid #fff',
          display: 'block',
        }} />
      )}
    </div>
  )
}

// ── Main Topbar ───────────────────────────────────────────────

// ── Dock config (compact version for topbar) ──────────────────
const TOPBAR_DOCK = {
  'super-admin': [
    { emoji:'👨‍💼', label:'Employees',   page:'employee-directory',    color:'#0284c7' },
    { emoji:'⏰',  label:'Attendance',  page:'live-attendance',       color:'#0d9488' },
    { emoji:'📅',  label:'Leave',       page:'leave-setup',           color:'#f59e0b' },
    { emoji:'💰',  label:'Payroll',     page:'automated-payroll',     color:'#16a34a' },
    { emoji:'📊',  label:'Analytics',   page:'bi-dashboard',          color:'#8b5cf6' },
    { emoji:'🤖',  label:'AI Pilot',    action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📋',  label:'Recruitment', page:'ats-dashboard',         color:'#e11d48' },
    { emoji:'🎯',  label:'Performance', page:'performance-dashboard', color:'#0ea5e9' },
  ],
  executive: [
    { emoji:'📊',  label:'BI Reports',  page:'ai-business-intelligence',color:'#0284c7' },
    { emoji:'🔮',  label:'AI Insights', page:'predictive-analytics',  color:'#8b5cf6' },
    { emoji:'👨‍💼', label:'Headcount',  page:'headcount-analysis',    color:'#0d9488' },
    { emoji:'🤖',  label:'AI Pilot',    action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📈',  label:'Performance', page:'performance-dashboard', color:'#16a34a' },
    { emoji:'💰',  label:'Payroll',     page:'payroll-snapshot',      color:'#f59e0b' },
  ],
  hr: [
    { emoji:'👨‍💼', label:'Employees',   page:'employee-directory',    color:'#0284c7' },
    { emoji:'⏰',  label:'Attendance',  page:'live-attendance',       color:'#0d9488' },
    { emoji:'📅',  label:'Leave',       page:'leave-approval',        color:'#f59e0b' },
    { emoji:'💰',  label:'Payroll',     page:'automated-payroll',     color:'#16a34a' },
    { emoji:'🤖',  label:'AI Pilot',    action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📋',  label:'Recruitment', page:'ats-dashboard',         color:'#e11d48' },
    { emoji:'🎯',  label:'Performance', page:'performance-dashboard', color:'#0ea5e9' },
    { emoji:'📣',  label:'Announcements',page:'announcement-board',   color:'#8b5cf6' },
  ],
  department: [
    { emoji:'👥',  label:'My Team',    page:'employee-directory',    color:'#0284c7' },
    { emoji:'⏰',  label:'Attendance', page:'live-attendance',       color:'#0d9488' },
    { emoji:'✅',  label:'Approvals',  page:'leave-approval',        color:'#16a34a' },
    { emoji:'🤖',  label:'AI Pilot',   action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'🎯',  label:'Goals',      page:'okr-management',        color:'#8b5cf6' },
    { emoji:'📊',  label:'Reports',    page:'bi-dashboard',          color:'#0ea5e9' },
  ],
  finance: [
    { emoji:'💰',  label:'Payroll',    page:'automated-payroll',     color:'#16a34a' },
    { emoji:'🏦',  label:'SSF/Tax',    page:'ssf-information',       color:'#0284c7' },
    { emoji:'💵',  label:'Payslips',   page:'payslip-generation',    color:'#0d9488' },
    { emoji:'🤖',  label:'AI Pilot',   action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'🧾',  label:'Bank',       page:'bank-transfer-file',    color:'#f59e0b' },
    { emoji:'📊',  label:'Reports',    page:'payroll-reports',       color:'#8b5cf6' },
  ],
  employee: [
    { emoji:'⏰',  label:'Attendance', page:'live-attendance',       color:'#0d9488' },
    { emoji:'📅',  label:'Apply Leave',page:'leave-request',         color:'#f59e0b' },
    { emoji:'🌴',  label:'Balance',    page:'leave-balance',         color:'#16a34a' },
    { emoji:'💰',  label:'Payslip',    page:'payslip-generation',    color:'#0284c7' },
    { emoji:'🤖',  label:'AI Pilot',   action:'ai',                  color:'#7c3aed', center:true },
    { emoji:'📄',  label:'Documents',  page:'document-management',   color:'#8b5cf6' },
    { emoji:'🎯',  label:'My Goals',   page:'goal-assignment',       color:'#0ea5e9' },
    { emoji:'📣',  label:'News',       page:'announcement-board',    color:'#e11d48' },
  ],
}
const DEFAULT_TOPBAR_DOCK = [
  { emoji:'⏰',  label:'Attendance', page:'live-attendance',    color:'#0d9488' },
  { emoji:'📅',  label:'Leave',      page:'leave-request',      color:'#f59e0b' },
  { emoji:'💰',  label:'Payroll',    page:'automated-payroll',  color:'#16a34a' },
  { emoji:'🤖',  label:'AI Pilot',   action:'ai',               color:'#7c3aed', center:true },
  { emoji:'📄',  label:'Documents',  page:'document-management',color:'#8b5cf6' },
]

function InlineQuickDock() {
  const { navTo, currentPersona, sub, darkMode, setShowNotif, setShowAI } = useApp()
  const [hoveredIdx, setHoveredIdx] = React.useState(null)
  const personaId = currentPersona?.id || ''
  const items = TOPBAR_DOCK[personaId] || DEFAULT_TOPBAR_DOCK

  const handleClick = (item) => {
    if (item.action === 'ai')    { setShowAI(v => !v); return }
    if (item.action === 'notif') { setShowNotif(v => !v); return }
    if (item.page && navTo)        navTo(item.page)
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:2 }}>
      {items.map((item, i) => {
        const isActive  = item.page && sub === item.page
        const isHovered = hoveredIdx === i
        const isCenter  = !!item.center
        return (
          <div key={i} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}>
            {/* Tooltip */}
            {isHovered && (
              <div style={{ position:'absolute', bottom:'calc(100% + 6px)', left:'50%',
                transform:'translateX(-50%)', background:'#0f172a', color:'#fff',
                fontSize:9, fontWeight:700, whiteSpace:'nowrap', padding:'3px 8px',
                borderRadius:6, zIndex:300, pointerEvents:'none',
                boxShadow:'0 4px 12px rgba(0,0,0,.25)' }}>
                {item.label}
                <div style={{ position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)',
                  width:0, height:0, borderLeft:'4px solid transparent', borderRight:'4px solid transparent',
                  borderTop:'4px solid #0f172a' }}/>
              </div>
            )}
            <button
              onClick={() => handleClick(item)}
              style={{
                width:  isCenter ? 34 : 30,
                height: isCenter ? 34 : 30,
                borderRadius: isCenter ? '50%' : 8,
                border: isActive ? `1.5px solid ${item.color}60` : '1.5px solid transparent',
                background: isCenter
                  ? `linear-gradient(135deg,#1e1b4b,${item.color})`
                  : isActive
                    ? `${item.color}18`
                    : isHovered
                      ? `${item.color}12`
                      : 'transparent',
                cursor:'pointer', fontSize: isCenter ? 15 : 14,
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all .15s', flexShrink:0,
                boxShadow: isActive ? `0 0 0 2px ${item.color}30` : 'none',
              }}>
              {item.emoji}
            </button>
            {/* Active dot */}
            {isActive && (
              <div style={{ width:3, height:3, borderRadius:'50%',
                background:item.color, marginTop:1, flexShrink:0 }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Topbar({ sidebarOpen, setSidebarOpen, onLangClick, onNotifClick, onAIClick, onLogout, onProfile, onSettings }) {
  const {
    persona, currentPersona,
    language, currency, cc,
    darkMode, setDarkMode, t,
    sub,
  } = useApp()

  const [showSearch,   setShowSearch]   = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const curLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => { setShowSearch(false); setShowUserMenu(false) }
    if (showSearch || showUserMenu) {
      setTimeout(() => document.addEventListener('click', handler), 100)
      return () => document.removeEventListener('click', handler)
    }
  }, [showSearch, showUserMenu])

  // Current time in Nepal
  const nepalTime = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kathmandu',
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <header style={{
      height: 52,
      background: '#fff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 10,
      flexShrink: 0,
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,.04)',
      position: 'relative',
    }}>
      {/* ── Sidebar Toggle ── */}
      <button
        onClick={() => setSidebarOpen(s => !s)}
        style={{
          width: 34, height: 34, borderRadius: 9,
          border: '1px solid #e2e8f0', background: '#f8fafc',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16, color: '#64748b',
          flexShrink: 0,
        }}
        title="Toggle sidebar"
      >
        ☰
      </button>

      {/* ── Persona Title ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>{currentPersona?.icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            {t(currentPersona?.labelKey) || currentPersona?.label}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>eLogix HRMS</div>
        </div>
      </div>

      {/* ── Search Bar (expandable) ── */}
      <div style={{ flex: 1, position: 'relative', maxWidth: 320 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setShowSearch(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid #e2e8f0', background: '#f8fafc',
            color: '#94a3b8', fontSize: 12, cursor: 'pointer',
            width: '100%', maxWidth: 240, transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8' }}
        >
          <span>🔍</span>
          <span style={{ fontSize: 12 }}>{t('search') || 'Search...'}</span>
          <kbd style={{ marginLeft: 'auto', padding: '1px 5px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#fff', fontSize: 10, color: '#94a3b8' }}>
            Ctrl K
          </kbd>
        </button>

        {showSearch && <SearchBar t={t} onClose={() => setShowSearch(false)} />}
      </div>

      {/* ── Inline Quick Dock — fills center of topbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 1,
        flex: 1, justifyContent: 'center',
        overflowX: 'auto', padding: '0 8px',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
        minWidth: 0,
      }}>
        <InlineQuickDock />
      </div>

      {/* ── Nepal Date ── */}
      <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, display: 'none' }}
        className="lg:block">
        {nepalTime}
      </div>

      {/* ── Language & Currency Button ── */}
      <button
        onClick={onLangClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 8,
          border: '1px solid #e2e8f0', background: '#f8fafc',
          cursor: 'pointer', fontSize: 11, color: '#475569',
          fontWeight: 600, transition: 'all .15s', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' }}
        title="Language & Currency"
      >
        <span style={{ fontSize: 14 }}>{curLang.flag}</span>
        <span>{curLang.code.toUpperCase()}</span>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <span>{cc?.code || currency}</span>
      </button>

      {/* ── AI Assistant ── */}
      {onAIClick && (
        <TBtn onClick={onAIClick} title="AI HR Assistant">🧠</TBtn>
      )}

      {/* ── Dark Mode ── */}
      <TBtn onClick={() => setDarkMode(d => !d)} title={t('darkMode')} active={darkMode}>
        {darkMode ? '☀️' : '🌙'}
      </TBtn>

      {/* ── Notification Bell ── */}
      <TBtn onClick={onNotifClick} title="Notifications" badge={true}>
        🔔
      </TBtn>

      {/* ── Avatar / User Menu ── */}
      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setShowUserMenu(s => !s)}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg,${currentPersona?.color || '#3b82f6'},#8b5cf6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', border: showUserMenu ? '2px solid #3b82f6' : '2px solid transparent',
            transition: 'border .15s', flexShrink: 0,
          }}
          title="User menu"
        >
          {currentPersona?.avatar}
        </button>

        {showUserMenu && (
          <UserMenu
            currentPersona={currentPersona}
            t={t}
            onClose={() => setShowUserMenu(false)}
            onLogout={onLogout}
            onProfile={onProfile}
            onSettings={onSettings}
            onLanguage={onLangClick}
          />
        )}
      </div>
    </header>
  )
}
