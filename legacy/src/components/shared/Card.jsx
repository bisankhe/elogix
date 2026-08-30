// ============================================================
// FILE: src/components/shared/Card.jsx
// PURPOSE: Versatile dashboard card — title, subtitle,
//          action slot, collapsible, tabs, loading state,
//          variant styles (default/info/success/warning/danger)
// USAGE:
//   <Card title="Attendance" subtitle="Monthly trend">
//     <Chart ... />
//   </Card>
//   <Card title="KPIs" collapsible tabs={[...]} />
// ============================================================

import { useState } from 'react'

// ── Variant Styles ────────────────────────────────────────────
const VARIANT = {
  default: { bg: '#fff', border: '#e2e8f0', headerBg: '#fff',    titleColor: '#0f172a' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', headerBg: '#eff6ff', titleColor: '#1e3a8a' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', headerBg: '#f0fdf4', titleColor: '#14532d' },
  warning: { bg: '#fffbeb', border: '#fde68a', headerBg: '#fffbeb', titleColor: '#78350f' },
  danger:  { bg: '#fef2f2', border: '#fecaca', headerBg: '#fef2f2', titleColor: '#991b1b' },
  ai:      { bg: 'linear-gradient(135deg,#f5f3ff,#eff6ff)', border: '#c4b5fd', headerBg: 'transparent', titleColor: '#1e1b4b' },
  dark:    { bg: '#0f172a', border: '#1e293b', headerBg: '#0f172a', titleColor: '#f1f5f9' },
}

// ── Loading Skeleton ──────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{ padding: '16px 18px' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {[80, 100, 90, 60, 75].map((w, i) => (
        <div key={i} style={{
          width: `${w}%`, height: i === 0 ? 14 : 10,
          borderRadius: 6, marginBottom: 10,
          background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
      ))}
    </div>
  )
}

// ── Tab Bar ───────────────────────────────────────────────────
function CardTabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      borderBottom: '1px solid #f1f5f9',
      padding: '0 18px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            color: active === tab.id ? '#2563eb' : '#64748b',
            fontSize: 12,
            fontWeight: active === tab.id ? 700 : 400,
            cursor: 'pointer',
            borderBottom: `2px solid ${active === tab.id ? '#2563eb' : 'transparent'}`,
            whiteSpace: 'nowrap',
            transition: 'all .15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (active !== tab.id) e.currentTarget.style.color = '#334155' }}
          onMouseLeave={e => { if (active !== tab.id) e.currentTarget.style.color = '#64748b' }}
        >
          {tab.icon && <span style={{ marginRight: 5 }}>{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && (
            <span style={{
              marginLeft: 5, fontSize: 10, fontWeight: 700,
              background: active === tab.id ? '#dbeafe' : '#f1f5f9',
              color: active === tab.id ? '#1d4ed8' : '#64748b',
              padding: '1px 5px', borderRadius: 10,
            }}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Main Card ─────────────────────────────────────────────────
export function Card({
  title,
  subtitle,
  children,
  className   = '',
  style       = {},
  action,          // JSX — right side of header
  variant     = 'default',
  noPad       = false,
  loading     = false,
  collapsible = false,
  defaultOpen = true,
  tabs,            // [{ id, label, icon?, badge? }]
  activeTab,
  onTabChange,
  onClick,
  badge,
  icon,
  footer,
}) {
  const [open, setOpen]     = useState(defaultOpen)
  const [localTab, setLocalTab] = useState(tabs?.[0]?.id)

  const v       = VARIANT[variant] || VARIANT.default
  const hasHead = title || action || collapsible || icon || badge
  const curTab  = activeTab !== undefined ? activeTab : localTab
  const handleTab = onTabChange || setLocalTab

  return (
    <div
      onClick={onClick}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,.05)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .2s',
        ...style,
      }}
      onMouseEnter={onClick ? e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.09)' : undefined}
      onMouseLeave={onClick ? e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)' : undefined}
    >
      {/* ── Header ── */}
      {hasHead && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: subtitle ? '14px 18px 4px' : '14px 18px',
          borderBottom: (!tabs && !subtitle) ? `1px solid ${v.border}` : 'none',
          background: v.headerBg,
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
            {/* Icon */}
            {icon && (
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            )}
            <div style={{ minWidth: 0 }}>
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {title && (
                  <h3 style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 800,
                    color: v.titleColor,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {title}
                  </h3>
                )}
                {/* Badge */}
                {badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 7px',
                    borderRadius: 10,
                    background: variant === 'ai' ? '#ddd6fe' : '#eff6ff',
                    color:      variant === 'ai' ? '#5b21b6' : '#1d4ed8',
                  }}>
                    {badge}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action slot + collapse toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {action}
            {collapsible && (
              <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 7,
                  width: 26, height: 26, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#64748b', transition: 'all .15s',
                }}
                title={open ? 'Collapse' : 'Expand'}
              >
                {open ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (!collapsible || open) && (
        <p style={{
          fontSize: 11, color: '#94a3b8',
          padding: '0 18px 10px',
          margin: 0,
          fontStyle: 'italic',
          borderBottom: !tabs ? `1px solid ${v.border}` : 'none',
          background: v.headerBg,
        }}>
          {subtitle}
        </p>
      )}

      {/* Tabs */}
      {tabs && (!collapsible || open) && (
        <CardTabs tabs={tabs} active={curTab} onChange={handleTab} />
      )}

      {/* ── Body ── */}
      {(!collapsible || open) && (
        loading ? <CardSkeleton /> : (
          <div style={{ padding: noPad ? 0 : '16px 18px' }}>
            {/* Tab content or regular children */}
            {tabs
              ? (children instanceof Function ? children(curTab) : children)
              : children
            }
          </div>
        )
      )}

      {/* ── Footer ── */}
      {footer && (!collapsible || open) && (
        <div style={{
          padding: '10px 18px',
          borderTop: `1px solid ${v.border}`,
          background: '#f8fafc',
          fontSize: 11, color: '#64748b',
        }}>
          {footer}
        </div>
      )}
    </div>
  )
}

export default Card
