// ============================================================
// FILE: src/components/shared/ProgressBar.jsx
// PURPOSE: Reusable progress bar — animated fill, color variants,
//          label display, striped, multi-segment, size options
// USAGE:
//   <ProgressBar value={72} color="#3b82f6" />
//   <ProgressBar value={72} showLabel animate />
//   <ProgressBar value={72} size="lg" color="green" />
// ============================================================

// ── Size Map ──────────────────────────────────────────────────
const HEIGHT_MAP = { xs: 3, sm: 5, md: 7, lg: 10, xl: 14 }

const COLOR_PRESET = {
  blue:   '#3b82f6',
  green:  '#10b981',
  red:    '#ef4444',
  yellow: '#f59e0b',
  orange: '#f97316',
  purple: '#8b5cf6',
  cyan:   '#06b6d4',
  pink:   '#ec4899',
  gray:   '#94a3b8',
}

// ── Single Bar ────────────────────────────────────────────────
export function ProgressBar({
  value     = 0,
  color     = '#3b82f6',
  size      = 'sm',
  showLabel = false,
  labelPos  = 'right',  // 'right' | 'top' | 'inside'
  animate   = true,
  striped   = false,
  rounded   = true,
  trackColor= '#f1f5f9',
  style     = {},
}) {
  const h     = HEIGHT_MAP[size] || HEIGHT_MAP.sm
  const pct   = Math.min(Math.max(value, 0), 100)
  const clr   = COLOR_PRESET[color] || color
  const rad   = rounded ? h : 0

  const label = (
    <span style={{ fontSize: 11, fontWeight: 700, color: clr, flexShrink: 0 }}>
      {Math.round(pct)}%
    </span>
  )

  const bar = (
    <div style={{
      height: h,
      background: trackColor,
      borderRadius: rad,
      overflow: 'hidden',
      flex: 1,
      ...style,
    }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: striped
          ? `repeating-linear-gradient(45deg,${clr},${clr} 10px,${clr}CC 10px,${clr}CC 20px)`
          : clr,
        borderRadius: rad,
        transition: animate ? 'width .5s ease' : 'none',
        position: 'relative',
      }}>
        {/* Inside label */}
        {showLabel && labelPos === 'inside' && pct > 15 && (
          <span style={{
            position: 'absolute', right: 6, top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 9, fontWeight: 700, color: '#fff',
          }}>
            {Math.round(pct)}%
          </span>
        )}
      </div>
    </div>
  )

  if (showLabel && labelPos === 'right') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {bar}
        {label}
      </div>
    )
  }

  if (showLabel && labelPos === 'top') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          {label}
        </div>
        {bar}
      </div>
    )
  }

  return bar
}

// ── Stacked / Multi-segment Bar ───────────────────────────────
// segments: [{ value: 40, color: '#3b82f6', label: 'Present' }, ...]
export function StackedProgressBar({ segments = [], height = 7, showLegend = false, animate = true }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1

  return (
    <div>
      <div style={{
        display: 'flex', height, borderRadius: height,
        overflow: 'hidden', background: '#f1f5f9',
      }}>
        {segments.map((seg, i) => (
          <div key={i} style={{
            width: `${(seg.value / total) * 100}%`,
            background: seg.color || '#3b82f6',
            transition: animate ? 'width .5s ease' : 'none',
            height: '100%',
          }} title={`${seg.label}: ${seg.value}`} />
        ))}
      </div>

      {showLegend && (
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          {segments.map((seg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, display: 'inline-block' }} />
              {seg.label}: <strong>{seg.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Circular / Ring Progress ──────────────────────────────────
export function CircleProgress({
  value     = 0,
  size      = 80,
  stroke    = 8,
  color     = '#3b82f6',
  trackColor= '#f1f5f9',
  label,
  sublabel,
}) {
  const r   = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct  = Math.min(Math.max(value, 0), 100)
  const clr  = COLOR_PRESET[color] || color

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={trackColor} strokeWidth={stroke} />
        {/* Progress */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={clr} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * pct / 100} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray .6s ease' }}
        />
        {/* Center label */}
        {label !== undefined && (
          <>
            <text x="50%" y="46%" textAnchor="middle" fontSize={size / 5} fontWeight="800" fill="#0f172a" dominantBaseline="middle">
              {label ?? `${Math.round(pct)}%`}
            </text>
            {sublabel && (
              <text x="50%" y="60%" textAnchor="middle" fontSize={size / 8} fill="#94a3b8" dominantBaseline="middle">
                {sublabel}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  )
}

export default ProgressBar
