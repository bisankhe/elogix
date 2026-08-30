// ============================================================
// FILE: src/components/shared/MetricRow.jsx
// PURPOSE: Label + value row — used in cards for key metrics,
//          compliance checklists, profile info, settings list.
//          Supports pills, progress bars, trend arrows, icons.
// USAGE:
//   <MetricRow label="Attendance Rate" value="86.9%" />
//   <MetricRow label="Status" value="Active" pill pillColor="green" />
//   <MetricRow label="OT Compliance" value="OK" pill pillColor="green" sub="≤24hrs/week" />
// ============================================================

import { Pill }        from './Pill.jsx'
import { ProgressBar } from './ProgressBar.jsx'

export function MetricRow({
  label,
  value,
  sub,
  // Pill
  pill       = false,
  pillColor  = 'blue',
  // Progress bar
  progress   = false,
  progressVal= 0,
  progressColor = '#3b82f6',
  // Trend
  trend,        // 'up' | 'down' | null
  trendColor,
  // Icon
  icon,
  // Right slot
  rightSlot,
  // Style
  bordered   = true,
  last       = false,
  size       = 'md',  // 'sm' | 'md' | 'lg'
  bold       = false,
  dim        = false,
}) {
  const sizeMap = {
    sm: { fontSize: 11, padding: '5px 0'   },
    md: { fontSize: 12, padding: '7px 0'   },
    lg: { fontSize: 13, padding: '10px 0'  },
  }
  const sz = sizeMap[size] || sizeMap.md

  const trendEl = trend && (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color: trend === 'up' ? '#10b981' : '#ef4444',
      display: 'inline-flex', alignItems: 'center', gap: 2,
    }}>
      {trend === 'up' ? '▲' : '▼'} {trendColor}
    </span>
  )

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: sz.padding,
      borderBottom: bordered && !last ? '1px solid #f8fafc' : 'none',
      gap: 8,
    }}>
      {/* Left: label + sub */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0, flex: 1 }}>
        {icon && (
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <span style={{
            fontSize: sz.fontSize,
            color: dim ? '#94a3b8' : '#475569',
            fontWeight: bold ? 700 : 500,
            display: 'block',
            lineHeight: 1.4,
          }}>
            {label}
          </span>
          {sub && (
            <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: 1 }}>
              {sub}
            </span>
          )}
          {/* Inline progress */}
          {progress && (
            <div style={{ marginTop: 4, maxWidth: 120 }}>
              <ProgressBar value={progressVal} color={progressColor} size="xs" animate />
            </div>
          )}
        </div>
      </div>

      {/* Right: value / pill / trend / rightSlot */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0,
      }}>
        {trend && trendEl}

        {rightSlot ? rightSlot : pill ? (
          <Pill color={pillColor}>{value}</Pill>
        ) : (
          <span style={{
            fontSize: sz.fontSize,
            fontWeight: 700,
            color: '#0f172a',
            whiteSpace: 'nowrap',
          }}>
            {value}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Metric Group ──────────────────────────────────────────────
// Renders a list of MetricRows
export function MetricGroup({ items = [], title, style = {} }) {
  return (
    <div style={style}>
      {title && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: '.08em',
          marginBottom: 6, padding: '0 0 4px',
          borderBottom: '1px solid #f1f5f9',
        }}>
          {title}
        </div>
      )}
      {items.map((item, i) => (
        <MetricRow
          key={i}
          {...item}
          last={i === items.length - 1}
        />
      ))}
    </div>
  )
}

export default MetricRow
