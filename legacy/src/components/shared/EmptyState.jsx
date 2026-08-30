// ============================================================
// FILE: src/components/shared/EmptyState.jsx
// PURPOSE: Empty / no-data state component — used across all
//          tables, lists, search results, filtered views.
//          Supports multiple variants: no-data, no-results,
//          loading-failed, access-denied, coming-soon
// USAGE:
//   <EmptyState />
//   <EmptyState icon="🔍" text="No results found" sub="Try a different search" />
//   <EmptyState variant="no-access" />
//   <EmptyState variant="coming-soon" title="Module under construction" />
// ============================================================

// ── Variant Config ────────────────────────────────────────────
const VARIANTS = {
  default: {
    icon: '📋',
    title: 'No data available',
    sub: 'There is nothing to show here yet.',
  },
  'no-results': {
    icon: '🔍',
    title: 'No results found',
    sub: 'Try adjusting your search or filter criteria.',
  },
  'no-access': {
    icon: '🔒',
    title: 'Access Restricted',
    sub: 'You do not have permission to view this content. Contact your HR Administrator.',
    accent: '#ef4444',
  },
  'coming-soon': {
    icon: '🚧',
    title: 'Coming Soon',
    sub: 'This module is under development. It will be available in the next release.',
    accent: '#f59e0b',
  },
  'error': {
    icon: '⚠️',
    title: 'Something went wrong',
    sub: 'An error occurred while loading data. Please refresh and try again.',
    accent: '#ef4444',
  },
  'empty-list': {
    icon: '📂',
    title: 'Nothing here yet',
    sub: 'Start by adding your first item.',
  },
  'no-notifications': {
    icon: '🔕',
    title: 'All caught up!',
    sub: 'You have no new notifications.',
    accent: '#10b981',
  },
  'no-tasks': {
    icon: '✅',
    title: 'All tasks complete!',
    sub: 'Great work — no pending tasks for today.',
    accent: '#10b981',
  },
  'production': {
    icon: '🏗️',
    title: 'Production Module',
    sub: 'Connect your React + Node.js + PostgreSQL backend to activate this module.',
    accent: '#3b82f6',
  },
}

// ── Main EmptyState ───────────────────────────────────────────
export function EmptyState({
  variant  = 'default',
  icon,
  title,
  sub,
  text,     // alias for sub
  accent    = '#94a3b8',
  action,   // JSX button or link
  compact   = false,
  className = '',
}) {
  const cfg = VARIANTS[variant] || VARIANTS.default
  const displayIcon  = icon  || cfg.icon
  const displayTitle = title || cfg.title
  const displaySub   = sub   || text || cfg.sub
  const displayAccent= cfg.accent || accent

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', color: '#94a3b8', fontSize: 12,
      }}>
        <span style={{ fontSize: 20 }}>{displayIcon}</span>
        <span>{displayTitle}</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      {/* Icon circle */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `${displayAccent}12`,
        border: `2px dashed ${displayAccent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, marginBottom: 16,
      }}>
        {displayIcon}
      </div>

      {/* Title */}
      <h4 style={{
        fontSize: 15, fontWeight: 700, color: '#475569',
        margin: '0 0 6px',
      }}>
        {displayTitle}
      </h4>

      {/* Subtitle */}
      {displaySub && (
        <p style={{
          fontSize: 12, color: '#94a3b8', margin: '0 0 20px',
          maxWidth: 360, lineHeight: 1.6,
        }}>
          {displaySub}
        </p>
      )}

      {/* Pills for production variant */}
      {variant === 'production' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          {['RBAC Enabled', 'Multi-tenant Ready', 'AI Integration', 'Nepal Labour Act'].map(p => (
            <span key={p} style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px',
              borderRadius: 20, background: '#eff6ff', color: '#1d4ed8',
              border: '1px solid #bfdbfe',
            }}>
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Action button */}
      {action && (
        <div>{action}</div>
      )}
    </div>
  )
}

export default EmptyState
