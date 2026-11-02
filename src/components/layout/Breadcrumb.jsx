// ============================================================
// FILE: src/components/layout/Breadcrumb.jsx
// PURPOSE: Dynamic breadcrumb navigation — auto-generates from
//          current page (sub), shows module > page path,
//          clickable navigation, home icon
// ============================================================

import { useApp } from '../../context/AppContext.jsx'
import { SIDEBAR_MENU } from '../../data/sidebarMenu.js'

// ── Find breadcrumb path for any page id ─────────────────────
function getBreadcrumb(pageId) {
  for (const menu of SIDEBAR_MENU) {
    const child = menu.children?.find(c => c.id === pageId)
    if (child) {
      return [
        { label: menu.label || menu.id, id: menu.id, isMenu: true },
        { label: child.label,           id: child.id, isMenu: false },
      ]
    }
  }
  return [{ label: pageId, id: pageId, isMenu: false }]
}

// ── Separator ─────────────────────────────────────────────────
function Sep() {
  return (
    <span style={{ color: '#cbd5e1', fontSize: 12, margin: '0 4px', userSelect: 'none' }}>
      /
    </span>
  )
}

// ── Main Breadcrumb ───────────────────────────────────────────
export default function Breadcrumb() {
  const { sub, navTo, t, toggleExpanded } = useApp()

  const crumbs = getBreadcrumb(sub)

  const handleMenuClick = (crumb) => {
    if (crumb.isMenu) {
      // Toggle expand that menu section in sidebar
      toggleExpanded?.(crumb.id)
    } else {
      navTo(crumb.id)
    }
  }

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 20px',
        background: '#f8fafc',
        borderBottom: '1px solid #f1f5f9',
        fontSize: 12,
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: 2,
        minHeight: 36,
      }}
    >
      {/* Home */}
      <button
        onClick={() => navTo('super-admin-dashboard')}
        title="Home"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#64748b', fontSize: 13, padding: '2px 4px', borderRadius: 5,
          transition: 'color .12s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
        onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
      >
        🏠
      </button>

      {crumbs.map((crumb, i) => (
        <span key={crumb.id} style={{ display: 'flex', alignItems: 'center' }}>
          <Sep />
          {i === crumbs.length - 1 ? (
            // Last crumb — current page (not clickable)
            <span style={{
              color: '#0f172a', fontWeight: 700, fontSize: 12,
              padding: '2px 6px', borderRadius: 5,
              background: '#eff6ff', border: '1px solid #bfdbfe',
            }}>
              {crumb.label}
            </span>
          ) : (
            // Parent crumb — clickable
            <button
              onClick={() => handleMenuClick(crumb)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', fontSize: 12, padding: '2px 4px',
                borderRadius: 5, transition: 'color .12s',
                fontWeight: 500,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >
              {crumb.label}
            </button>
          )}
        </span>
      ))}

      {/* Spacer + Nepal time */}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 10, color: '#cbd5e1', userSelect: 'none' }}>
        🇳🇵 Nepal Standard Time (UTC+5:45)
      </span>
    </nav>
  )
}
