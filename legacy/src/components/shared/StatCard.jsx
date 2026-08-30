// ============================================================
// FILE: src/components/shared/StatCard.jsx
// PURPOSE: KPI / Stat card component — icon, label, value,
//          trend change indicator, accent color, sparkline,
//          click action, loading skeleton, size variants
// USAGE:
//   <StatCard icon="👥" label="Total Employees" value="1,250"
//             change="+12 this month" up accent="#3b82f6" />
// ============================================================

// ── Loading Skeleton ──────────────────────────────────────────
function Skeleton({ w = '100%', h = 14, radius = 4 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  )
}

// ── Trend Arrow ───────────────────────────────────────────────
function TrendArrow({ up }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 16, height: 16, borderRadius: '50%',
      background: up ? '#f0fdf4' : '#fef2f2',
      color: up ? '#15803d' : '#dc2626',
      fontSize: 9, fontWeight: 900, flexShrink: 0,
      lineHeight: 1,
    }}>
      {up ? '▲' : '▼'}
    </span>
  )
}

// ── Main StatCard ─────────────────────────────────────────────
export function StatCard({
  icon,
  label,
  value,
  change,
  up        = true,
  accent    = '#3b82f6',
  loading   = false,
  onClick,
  badge,
  size      = 'md', // 'sm' | 'md' | 'lg'
  subtitle,
  trend,   // optional: sparkline data array
}) {
  const sizeMap = {
    sm: { padding: '10px 12px', iconSize: 36, iconFont: 16, valueFont: 18, labelFont: 10 },
    md: { padding: '14px 16px', iconSize: 44, iconFont: 20, valueFont: 22, labelFont: 11 },
    lg: { padding: '18px 20px', iconSize: 52, iconFont: 24, valueFont: 28, labelFont: 12 },
  }
  const sz = sizeMap[size] || sizeMap.md

  if (loading) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 12, padding: sz.padding,
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      }}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        <Skeleton w={sz.iconSize} h={sz.iconSize} radius={10} />
        <div style={{ flex: 1 }}>
          <Skeleton w="60%" h={10} />
          <div style={{ marginTop: 6 }}><Skeleton w="80%" h={16} /></div>
          <div style={{ marginTop: 4 }}><Skeleton w="50%" h={9} /></div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: sz.padding,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all .2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.09)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        if (onClick) e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = '#e2e8f0'
      }}
    >
      {/* Accent left border */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, background: accent, borderRadius: '12px 0 0 12px',
      }} />

      {/* Icon */}
      <div style={{
        width: sz.iconSize, height: sz.iconSize,
        borderRadius: 11,
        background: `${accent}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: sz.iconFont,
        flexShrink: 0,
        border: `1px solid ${accent}22`,
      }}>
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Badge */}
        {badge && (
          <span style={{
            position: 'absolute', top: 8, right: 10,
            fontSize: 9, fontWeight: 700,
            background: `${accent}18`, color: accent,
            padding: '1px 6px', borderRadius: 10,
          }}>
            {badge}
          </span>
        )}

        {/* Label */}
        <p style={{
          fontSize: sz.labelFont,
          color: '#94a3b8',
          fontWeight: 600,
          marginBottom: 2,
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </p>

        {/* Value */}
        <p style={{
          fontSize: sz.valueFont,
          fontWeight: 900,
          color: '#0f172a',
          lineHeight: 1.1,
          letterSpacing: '-.5px',
        }}>
          {value}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{subtitle}</p>
        )}

        {/* Change / trend */}
        {change && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
            <TrendArrow up={up} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: up ? '#10b981' : '#ef4444',
            }}>
              {change}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
