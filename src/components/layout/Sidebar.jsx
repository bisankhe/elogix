// ============================================================
// FILE: src/components/layout/Sidebar.jsx
// PURPOSE: Full collapsible sidebar — 12 modules, 130+ pages,
//          7 persona switcher, RBAC-aware menu filtering,
//          badge indicators, search, dark theme
// ============================================================

import { useState, useCallback } from 'react'
import { useApp }  from '../../context/AppContext.jsx'
import { SIDEBAR_MENU } from '../../data/sidebarMenu.js'
import { PERSONAS }     from '../../data/personas.js'

// ── Badge Styles ─────────────────────────────────────────────
const badgeStyle = (badge) => {
  if (!badge) return null
  const map = {
    'Live':  { bg: 'rgba(16,185,129,.25)',  color: '#6ee7b7' },
    '🔒':    { bg: 'rgba(239,68,68,.2)',    color: '#fca5a5' },
    'AI':    { bg: 'rgba(139,92,246,.25)',  color: '#c4b5fd' },
    '7':     { bg: 'rgba(239,68,68,.2)',    color: '#fca5a5' },
    '!':     { bg: 'rgba(245,158,11,.2)',   color: '#fcd34d' },
    'New':   { bg: 'rgba(59,130,246,.2)',   color: '#93c5fd' },
    'Beta':  { bg: 'rgba(245,158,11,.2)',   color: '#fcd34d' },
  }
  return map[badge] || { bg: 'rgba(239,68,68,.2)', color: '#fca5a5' }
}

// ── Nav Item ──────────────────────────────────────────────────
function NavItem({ child, isActive, onClick }) {
  const bs = badgeStyle(child.badge)
  return (
    <button
      onClick={onClick}
      title={child.label}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 14px 5px 24px',
        border: 'none',
        background: isActive ? 'rgba(59,130,246,.18)' : 'transparent',
        color: isActive ? '#93c5fd' : '#64748b',
        fontSize: 11,
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 6,
        marginBottom: 1,
        transition: 'all .12s',
        borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,.05)'
          e.currentTarget.style.color = '#cbd5e1'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#64748b'
        }
      }}
    >
      {/* Active dot */}
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: isActive ? '#60a5fa' : '#334155',
        flexShrink: 0,
        transition: 'background .15s',
      }} />

      {/* Label */}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
        {child.label}
      </span>

      {/* Badge */}
      {bs && (
        <span style={{
          background: bs.bg, color: bs.color,
          fontSize: 9, padding: '1px 5px',
          borderRadius: 8, fontWeight: 700,
          flexShrink: 0, lineHeight: 1.5,
        }}>
          {child.badge}
        </span>
      )}
    </button>
  )
}

// ── Menu Section ──────────────────────────────────────────────
function MenuSection({ menu, isExpanded, onToggle, activeSub, onNavTo, t }) {
  return (
    <div>
      {/* Section Header */}
      <button
        onClick={() => onToggle(menu.id)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          border: 'none',
          background: 'transparent',
          color: isExpanded ? '#cbd5e1' : '#64748b',
          fontSize: 11,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#cbd5e1'}
        onMouseLeave={e => e.currentTarget.style.color = isExpanded ? '#cbd5e1' : '#64748b'}
      >
        <span style={{ fontSize: 15, flexShrink: 0 }}>{menu.icon}</span>
        <span style={{ flex: 1, fontWeight: 600, letterSpacing: '.01em', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t(menu.labelKey) || menu.label}
        </span>
        <span style={{
          fontSize: 9,
          transition: 'transform .2s',
          display: 'inline-block',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
          color: '#475569',
        }}>
          ▶
        </span>
      </button>

      {/* Children */}
      {isExpanded && (
        <div style={{ paddingLeft: 4, paddingRight: 4 }}>
          {menu.children?.map(child => (
            <NavItem
              key={child.id}
              child={child}
              isActive={activeSub === child.id}
              onClick={() => onNavTo(child.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────
export default function Sidebar({ open }) {
  const {
    persona, switchPersona,
    sub, navTo,
    expanded, toggleExpanded,
    t, language,
  } = useApp()

  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [personaListOpen, setPersonaListOpen] = useState(false)

  const currentPersonaObj = PERSONAS.find(p => p.id === persona) || PERSONAS[0]

  if (!open) return null

  // Filter menu by search
  const isSearching = !!search.trim()
  const filteredMenu = isSearching
    ? SIDEBAR_MENU.map(menu => ({
        ...menu,
        children: menu.children?.filter(child =>
          child.label.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(menu => menu.children?.length > 0)
    : SIDEBAR_MENU

  return (
    <aside
      className="sidebar-scroll"
      style={{
        width: 248,
        minWidth: 248,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflowY: 'auto',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,.06)',
      }}
    >
      {/* ── Brand ── */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(59,130,246,.3)',
          }}>
            🏢
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', letterSpacing: '-.3px' }}>
              NepHR Pro
            </div>
            <div style={{ fontSize: 10, color: '#475569' }}>
              HRIS · HRMS · HRIM
            </div>
          </div>
          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(s => !s)}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 6 }}
            title="Search menu"
          >
            🔍
          </button>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%', marginTop: 10,
              padding: '6px 10px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.1)',
              background: 'rgba(255,255,255,.06)',
              color: '#f1f5f9', fontSize: 11,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        )}
      </div>

      {/* ── Persona Switcher (compact by default -- shows only the
           active persona; expands to a height-capped, independently
           scrollable list on demand, so it never crowds out the real
           page navigation below it) ── */}
      <div style={{
        padding: '10px 10px 8px',
        borderBottom: '1px solid rgba(255,255,255,.06)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setPersonaListOpen(o => !o)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 8,
            border: 'none',
            background: 'rgba(59,130,246,.12)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: currentPersonaObj?.dot || '#3b82f6', flexShrink: 0,
            boxShadow: `0 0 6px ${currentPersonaObj?.dot || '#3b82f6'}80`,
          }} />
          <span style={{ fontSize: 14 }}>{currentPersonaObj?.icon}</span>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t(currentPersonaObj?.labelKey) || currentPersonaObj?.label}
          </span>
          <span style={{ fontSize: 9, color: '#475569', transition: 'transform .15s', transform: personaListOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
        </button>

        {personaListOpen && (
          <div style={{
            marginTop: 6,
            maxHeight: 180,
            overflowY: 'auto',
            borderRadius: 8,
            background: 'rgba(255,255,255,.02)',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: '#334155',
              textTransform: 'uppercase', letterSpacing: '.1em',
              padding: '6px 8px 4px',
            }}>
              {t('switchPersona')}
            </div>

            {PERSONAS.map(p => {
              const isActive = persona === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => { switchPersona(p.id); setPersonaListOpen(false) }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'rgba(59,130,246,.2)' : 'transparent',
                    color: isActive ? '#93c5fd' : '#64748b',
                    fontSize: 11,
                    cursor: 'pointer',
                    marginBottom: 1,
                    textAlign: 'left',
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,.05)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Color dot */}
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: p.dot, flexShrink: 0,
                    boxShadow: isActive ? `0 0 6px ${p.dot}80` : 'none',
                  }} />

                  {/* Icon */}
                  <span style={{ fontSize: 14 }}>{p.icon}</span>

                  {/* Label */}
                  <span style={{ flex: 1, fontWeight: isActive ? 700 : 400 }}>
                    {t(p.labelKey) || p.label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#60a5fa', flexShrink: 0,
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Navigation (now genuinely gets the bulk of the sidebar's
           vertical space -- flex: 1 on a flex-column parent that no
           longer has an unconstrained sibling above it) ── */}
      <nav style={{ flex: 1, padding: '6px 0', overflow: 'auto', minHeight: 0 }}>
        {search.trim() && filteredMenu.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#475569', fontSize: 12 }}>
            No results for "{search}"
          </div>
        )}

        {filteredMenu.map(menu => (
          <MenuSection
            key={menu.id}
            menu={menu}
            isExpanded={isSearching || !!expanded[menu.id]}
            onToggle={toggleExpanded}
            activeSub={sub}
            onNavTo={navTo}
            t={t}
          />
        ))}
      </nav>

      {/* ── Bottom Info ── */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid rgba(255,255,255,.07)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, color: '#334155', marginBottom: 2 }}>
          NepHR Pro v3.0 · Multi-Tenant SaaS
        </div>
        <div style={{ fontSize: 9, color: '#334155', marginBottom: 2 }}>
          Nepal Labour Act 2017 · RBAC · Privacy Act 2018
        </div>
        <div style={{ fontSize: 9, color: '#1e3a8a', background: 'rgba(59,130,246,.1)', padding: '3px 7px', borderRadius: 5, display: 'inline-block', marginTop: 2 }}>
          🔒 All data encrypted · AES-256
        </div>
      </div>
    </aside>
  )
}
