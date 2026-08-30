// ============================================================
// FILE: src/components/shared/PageTitle.jsx
// PURPOSE: Page header — title, subtitle, badge, breadcrumb
//          integration, action buttons, back navigation
// USAGE:
//   <PageTitle title="Attendance Snapshot" sub="Real-time data" badge="Live" />
//   <PageTitle title="Payroll" badge="🔒 Restricted" actions={<button>Export</button>} />
// ============================================================

import { useApp } from '../../context/AppContext.jsx'

export function PageTitle({
  title,
  sub,
  badge,
  actions,
  back     = false,
  backLabel= 'Back',
  onBack,
  icon,
  className = '',
}) {
  const { navTo } = useApp()

  const handleBack = () => {
    if (onBack) onBack()
    else window.history.back()
  }

  const badgeStyle = badge?.startsWith('🔒')
    ? { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' }
    : badge === 'Live' || badge?.includes('Live')
    ? { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' }
    : badge === 'AI Powered' || badge?.includes('AI')
    ? { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' }
    : badge === 'HR' || badge === 'IT' || badge === 'ATS'
    ? { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
    : badge?.includes('Restricted')
    ? { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
    : { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }

  return (
    <div style={{ marginBottom: 22 }}>
      {/* Back button */}
      {back && (
        <button
          onClick={handleBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none',
            color: '#64748b', fontSize: 12, cursor: 'pointer',
            marginBottom: 8, padding: '2px 0',
            transition: 'color .12s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          ← {backLabel}
        </button>
      )}

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: sub ? 4 : 0 }}>
            {/* Icon */}
            {icon && (
              <span style={{ fontSize: 24 }}>{icon}</span>
            )}

            {/* Title */}
            <h2 style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}>
              {title}
            </h2>

            {/* Badge */}
            {badge && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 20,
                background: badgeStyle.bg,
                color: badgeStyle.color,
                border: `1px solid ${badgeStyle.border}`,
                whiteSpace: 'nowrap',
              }}>
                {badge}
              </span>
            )}
          </div>

          {/* Subtitle */}
          {sub && (
            <p style={{
              fontSize: 12,
              color: '#94a3b8',
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 680,
            }}>
              {sub}
            </p>
          )}
        </div>

        {/* Actions slot */}
        {actions && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageTitle
