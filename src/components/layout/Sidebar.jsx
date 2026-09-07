// FILE: src/components/layout/Sidebar.jsx
// eLogix HRMS — Sidebar Navigation
// Structure: Section > Group > Item (3 levels, hover + click to open)
// NO user name/designation — shown in Topbar
// Filtered by tenant plan + business type + user role
// eLogix Technologies · www.elogix.com.np

import { useState, useCallback, useRef, useEffect } from 'react'
import { SIDEBAR_MENU, getVisibleMenu } from '../../data/sidebarMenu.js'

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}

const P  = '#7c3aed'                            // brand purple
const BG = '#0f172a'                            // sidebar dark bg
const S1 = 'rgba(255,255,255,.06)'              // section hover
const S2 = 'rgba(124,58,237,.15)'              // active bg
const T1 = '#94a3b8'                            // normal text
const T2 = '#c4b5fd'                            // active text
const T3 = '#64748b'                            // group text

export default function Sidebar({ open, sub, navTo, persona, onClose }) {
  const sess    = _getSession()
  const company = sess?.company || {}
  const user    = sess?.user    || {}
  const plan    = company?.plan || 'trial'
  const bizType = company?.business_type || 'custom'
  const role    = user?.role || persona || 'employee'
  const granted = Array.isArray(company?.modules) ? company.modules : []

  // Which section is expanded (click-toggled)
  const [openSec,   setOpenSec]   = useState(null)
  // Which group is expanded (click-toggled inside section)
  const [openGroup, setOpenGroup] = useState({})
  // Hover flyout for collapsed sidebar
  const [hoverSec,  setHoverSec]  = useState(null)
  const [hoverItem, setHoverItem] = useState(null)
  const [search,    setSearch]    = useState('')
  const [showSrch,  setShowSrch]  = useState(false)
  const hoverTimer = useRef(null)

  const navigate = useCallback((pageId) => {
    if (!pageId) return
    if (navTo) navTo(pageId)
    else window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: pageId } }))
  }, [navTo])

  // Close flyout on outside click
  useEffect(() => {
    const h = () => setHoverSec(null)
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])

  if (!open) return null

  const isAdmin = ['elogix_superadmin', 'platform_admin'].includes(role)
  const rawMenu = isAdmin ? SIDEBAR_MENU : getVisibleMenu(plan, bizType, granted)

  // Group children by 'group' field → { groupName: [items] }
  function groupify(children = []) {
    const map = {}
    const ungrouped = []
    children.forEach(item => {
      if (item.group) {
        if (!map[item.group]) map[item.group] = []
        map[item.group].push(item)
      } else {
        ungrouped.push(item)
      }
    })
    return { map, ungrouped }
  }

  // Search filter
  const q = search.trim().toLowerCase()
  const menu = q
    ? rawMenu.map(sec => ({
        ...sec,
        children: (sec.children || []).filter(item =>
          item.label?.toLowerCase().includes(q) ||
          item.group?.toLowerCase().includes(q)
        ),
      })).filter(s => s.children?.length > 0)
    : rawMenu

  // Company initials
  const initials = (company?.name || 'E')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase()).join('')
  const GRADS = [
    'linear-gradient(135deg,#3b82f6,#8b5cf6)',
    'linear-gradient(135deg,#0d9488,#3b82f6)',
    'linear-gradient(135deg,#dc2626,#f59e0b)',
    'linear-gradient(135deg,#7c3aed,#ec4899)',
    'linear-gradient(135deg,#059669,#0d9488)',
  ]
  const avatarGrad = GRADS[(company?.slug || '').charCodeAt(0) % GRADS.length] || GRADS[0]

  // Toggle section open/close
  function toggleSection(secId) {
    setOpenSec(prev => prev === secId ? null : secId)
    setOpenGroup({})
  }

  // Toggle group open/close
  function toggleGroup(key) {
    setOpenGroup(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Hover flyout (200ms delay to avoid flicker)
  function onSectionHover(secId) {
    clearTimeout(hoverTimer.current)
    if (!openSec) {   // only show flyout when no section is clicked-open
      hoverTimer.current = setTimeout(() => setHoverSec(secId), 150)
    }
  }
  function onSectionLeave() {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHoverSec(null), 300)
  }
  function onFlyoutEnter() { clearTimeout(hoverTimer.current) }
  function onFlyoutLeave() {
    hoverTimer.current = setTimeout(() => setHoverSec(null), 200)
  }

  // Is any child of this section active?
  function secHasActive(sec) {
    return (sec.children || []).some(c => c.id === sub)
  }

  // ── Flyout panel (appears on hover when no section is clicked open)
  function Flyout({ section }) {
    const { map, ungrouped } = groupify(section.children || [])
    return (
      <div
        onMouseEnter={onFlyoutEnter}
        onMouseLeave={onFlyoutLeave}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: 248,
          top: 0,
          height: '100vh',
          width: 240,
          background: '#1e293b',
          borderLeft: `1px solid ${P}40`,
          borderRight: '1px solid rgba(255,255,255,.06)',
          overflowY: 'auto',
          zIndex: 9999,
          boxShadow: '8px 0 32px rgba(0,0,0,.4)',
          scrollbarWidth: 'thin',
          scrollbarColor: '#334155 transparent',
          paddingBottom: 16,
        }}>
        {/* Flyout header */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${P}30`,
          fontSize: 12, fontWeight: 800, color: '#c4b5fd',
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>{section.icon}</span>
          {section.label}
        </div>

        {/* Ungrouped items */}
        {ungrouped.map(item => (
          <FlyItem key={item.id} item={item} />
        ))}

        {/* Grouped items */}
        {Object.entries(map).map(([grpName, items]) => (
          <div key={grpName}>
            <div style={{ padding: '8px 14px 4px',
              fontSize: 9, fontWeight: 800, color: '#475569',
              letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {grpName}
            </div>
            {items.map(item => <FlyItem key={item.id} item={item} />)}
          </div>
        ))}
      </div>
    )
  }

  function FlyItem({ item }) {
    const isActive = sub === item.id
    return (
      <button
        onClick={() => { navigate(item.id); setHoverSec(null) }}
        onMouseEnter={() => setHoverItem(item.id)}
        onMouseLeave={() => setHoverItem(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '6px 16px',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          background: isActive ? S2 : hoverItem === item.id ? S1 : 'transparent',
          borderLeft: `3px solid ${isActive ? P : 'transparent'}`,
          color: isActive ? T2 : T1,
          fontSize: 12, fontWeight: isActive ? 700 : 400,
          transition: 'all .1s',
        }}>
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
        {item.badge && (
          <span style={{ background: item.badge === 'Live' ? '#16a34a' : P,
            color: '#fff', borderRadius: 8, fontSize: 7, fontWeight: 800,
            padding: '1px 5px', flexShrink: 0 }}>
            {item.badge}
          </span>
        )}
      </button>
    )
  }

  // ── Inline expanded section (click-open)
  function SectionBody({ section }) {
    const { map, ungrouped } = groupify(section.children || [])
    return (
      <div style={{ background: 'rgba(0,0,0,.18)', borderBottom: `1px solid rgba(255,255,255,.04)` }}>
        {/* Ungrouped items */}
        {ungrouped.map(item => {
          const isActive = sub === item.id
          return (
            <button key={item.id}
              onClick={() => navigate(item.id)}
              onMouseEnter={() => setHoverItem(item.id)}
              onMouseLeave={() => setHoverItem(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                width: '100%', padding: '6px 14px 6px 38px',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: isActive ? S2 : hoverItem === item.id ? S1 : 'transparent',
                borderLeft: `3px solid ${isActive ? P : 'transparent'}`,
                color: isActive ? T2 : T1,
                fontSize: 12, fontWeight: isActive ? 700 : 400,
                transition: 'all .1s',
              }}>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
              {item.badge && (
                <span style={{ background: item.badge === 'Live' ? '#16a34a' : P,
                  color: '#fff', borderRadius: 8, fontSize: 8, fontWeight: 800,
                  padding: '1px 5px', flexShrink: 0 }}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}

        {/* Grouped items */}
        {Object.entries(map).map(([grpName, items]) => {
          const gkey = `${section.id}__${grpName}`
          const gOpen = openGroup[gkey] !== false   // default open
          const hasActiveInGrp = items.some(i => i.id === sub)

          return (
            <div key={gkey}>
              {/* Group header — click to toggle */}
              <button
                onClick={() => toggleGroup(gkey)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  width: '100%', padding: '5px 14px 5px 28px',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: hasActiveInGrp ? `${P}12` : 'transparent',
                }}>
                <span style={{ width: 2, height: 12, background: hasActiveInGrp ? P : '#334155',
                  borderRadius: 2, flexShrink: 0 }}/>
                <span style={{ fontSize: 9, fontWeight: 800,
                  color: hasActiveInGrp ? T2 : '#4b5563',
                  letterSpacing: '0.07em', textTransform: 'uppercase', flex: 1 }}>
                  {grpName}
                </span>
                <span style={{ fontSize: 8, color: '#374151', transition: 'transform .2s',
                  transform: gOpen ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>▶</span>
              </button>

              {/* Group items */}
              {gOpen && items.map(item => {
                const isActive = sub === item.id
                return (
                  <button key={item.id}
                    onClick={() => navigate(item.id)}
                    onMouseEnter={() => setHoverItem(item.id)}
                    onMouseLeave={() => setHoverItem(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      width: '100%', padding: '5px 14px 5px 46px',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive ? S2 : hoverItem === item.id ? S1 : 'transparent',
                      borderLeft: `3px solid ${isActive ? P : 'transparent'}`,
                      color: isActive ? T2 : T3,
                      fontSize: 11, fontWeight: isActive ? 700 : 400,
                      transition: 'all .1s',
                    }}>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span style={{ background: item.badge === 'Live' ? '#16a34a' : P,
                        color: '#fff', borderRadius: 8, fontSize: 7, fontWeight: 800,
                        padding: '1px 4px', flexShrink: 0 }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <aside style={{
        width: 248, minWidth: 248, height: '100vh',
        background: BG,
        display: 'flex', flexDirection: 'column',
        overflowY: 'hidden', overflowX: 'visible',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,.06)',
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        position: 'relative',
      }}>

        {/* ── Brand header — company name only (NO user name/designation) ── */}
        <div style={{ padding: '12px 14px 10px',
          borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>

            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name}
                style={{ width: 34, height: 34, borderRadius: 9,
                  objectFit: 'contain', background: '#fff', padding: 2, flexShrink: 0 }}
                onError={e => e.target.style.display = 'none'}
              />
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: avatarGrad,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,.3)',
              }}>{initials || '🏢'}</div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                title={company?.name}>
                {company?.name || 'Your Company'}
              </div>
              <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>
                {plan
                  ? `${plan.charAt(0).toUpperCase()}${plan.slice(1)} Plan`
                  : 'HR Management System'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              <button onClick={() => setShowSrch(v => !v)} title="Search"
                style={{ background: 'none', border: 'none', color: '#475569',
                  cursor: 'pointer', fontSize: 13, padding: 4, borderRadius: 6 }}>
                🔍
              </button>
              {typeof onClose === 'function' && (
                <button onClick={onClose} title="Close sidebar"
                  style={{ background: 'none', border: 'none', color: '#475569',
                    cursor: 'pointer', fontSize: 15, padding: '2px 4px', borderRadius: 6 }}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Search box */}
          {showSrch && (
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search menu…"
              style={{ marginTop: 10, width: '100%', boxSizing: 'border-box',
                padding: '7px 10px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,.1)',
                background: 'rgba(255,255,255,.07)',
                color: '#cbd5e1', fontSize: 12, outline: 'none' }}
            />
          )}
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'visible',
          scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>

          {menu.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>
              {q ? 'No results' : 'No menu for your plan'}
            </div>
          )}

          {menu.map(section => {
            const isClickOpen = openSec === section.id
            const isHoverOpen = hoverSec === section.id && !openSec
            const hasActive   = secHasActive(section)

            return (
              <div key={section.id} style={{ position: 'relative' }}>

                {/* Section row */}
                <button
                  onClick={e => { e.stopPropagation(); toggleSection(section.id) }}
                  onMouseEnter={() => onSectionHover(section.id)}
                  onMouseLeave={onSectionLeave}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    width: '100%', padding: '9px 14px',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: hasActive ? S2
                      : isClickOpen ? 'rgba(255,255,255,.05)'
                      : 'transparent',
                    borderLeft: `3px solid ${hasActive || isClickOpen ? P : 'transparent'}`,
                    transition: 'all .12s',
                  }}>
                  {/* Section icon */}
                  <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{section.icon}</span>

                  {/* Section label */}
                  <span style={{ fontSize: 12, fontWeight: hasActive || isClickOpen ? 700 : 500,
                    color: hasActive ? T2 : isClickOpen ? '#e2e8f0' : T1,
                    flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {section.label}
                  </span>

                  {/* Expand arrow */}
                  <span style={{ fontSize: 8, color: '#374151', flexShrink: 0,
                    transition: 'transform .2s',
                    transform: isClickOpen ? 'rotate(90deg)' : 'none' }}>
                    ▶
                  </span>
                </button>

                {/* Inline expanded body (click-open) */}
                {isClickOpen && <SectionBody section={section} />}

                {/* Flyout panel (hover) */}
                {isHoverOpen && <Flyout section={section} />}
              </div>
            )
          })}
        </nav>

        {/* ── Footer — subdomain only ── */}
        <div style={{ padding: '8px 14px',
          borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: '#1e3a5f' }}>
            {company?.slug ? `${company.slug}.elogix.com.np` : 'Powered by eLogix HRMS'}
          </div>
        </div>
      </aside>
    </>
  )
}
