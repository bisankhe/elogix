// ============================================================
// FILE: src/components/shared/Pill.jsx
// PURPOSE: Status badge / pill component — 12 color variants,
//          icon support, dot indicator, size variants
// USAGE:
//   <Pill color="green">Active</Pill>
//   <Pill color="red" dot>Urgent</Pill>
//   <Pill color="purple" size="lg">AI Powered</Pill>
// ============================================================

// ── Color Map ─────────────────────────────────────────────────
const COLOR_MAP = {
  green:   { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  emerald: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  yellow:  { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  amber:   { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
  red:     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  rose:    { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  blue:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  sky:     { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  purple:  { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  violet:  { bg: '#f5f3ff', text: '#5b21b6', border: '#c4b5fd' },
  cyan:    { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
  teal:    { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
  orange:  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  pink:    { bg: '#fdf2f8', text: '#be185d', border: '#f9a8d4' },
  gray:    { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  slate:   { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' },
  indigo:  { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
  lime:    { bg: '#f7fee7', text: '#4d7c0f', border: '#bef264' },
  white:   { bg: '#ffffff', text: '#334155', border: '#e2e8f0' },
  dark:    { bg: '#0f172a', text: '#f1f5f9', border: '#334155' },
  // Status shortcuts
  active:    { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  inactive:  { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  pending:   { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  approved:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  rejected:  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  draft:     { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  live:      { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  urgent:    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
}

const SIZE_MAP = {
  xs: { fontSize: 10, padding: '1px 5px',  borderRadius: 12 },
  sm: { fontSize: 11, padding: '2px 7px',  borderRadius: 14 },
  md: { fontSize: 11, padding: '2px 8px',  borderRadius: 16 },
  lg: { fontSize: 12, padding: '3px 10px', borderRadius: 20 },
  xl: { fontSize: 13, padding: '4px 12px', borderRadius: 22 },
}

// ── Main Pill ─────────────────────────────────────────────────
export function Pill({
  children,
  color  = 'gray',
  size   = 'md',
  dot    = false,
  icon   = null,
  title,
  onClick,
  className = '',
}) {
  const c   = COLOR_MAP[color] || COLOR_MAP.gray
  const sz  = SIZE_MAP[size]   || SIZE_MAP.md

  return (
    <span
      title={title}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...sz,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'opacity .15s' : 'none',
        userSelect: 'none',
        lineHeight: 1.4,
      }}
      onMouseEnter={onClick ? e => e.currentTarget.style.opacity = '.8' : undefined}
      onMouseLeave={onClick ? e => e.currentTarget.style.opacity = '1' : undefined}
    >
      {/* Dot indicator */}
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: c.text, display: 'inline-block', flexShrink: 0,
        }} />
      )}

      {/* Icon */}
      {icon && <span style={{ fontSize: sz.fontSize + 1 }}>{icon}</span>}

      {children}
    </span>
  )
}

export default Pill
