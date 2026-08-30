// ============================================================
// FILE: src/components/shared/AIInsightCard.jsx
// PURPOSE: AI Insight panel — gradient card with LIVE badge,
//          colored insight dots, expandable details, action
//          buttons, severity levels, used in all 7 dashboards
//          and all 8 snapshot pages
//
// USAGE:
//   // Basic usage
//   <AIInsightCard insights={aiInsightsList} title="🧠 AI Insights" />
//
//   // With actions
//   <AIInsightCard
//     insights={aiInsightsList}
//     title="⚠️ Attrition Risk"
//     showActions
//     onDismiss={(i) => handleDismiss(i)}
//   />
//
//   // Compact mode
//   <AIInsightCard insights={list} compact />
//
// DATA FORMAT:
//   insights = [
//     {
//       color: '#ef4444',         // dot color
//       label: 'Attrition Risk', // uppercase tag
//       text: 'Description...',  // insight body
//       severity: 'high',        // 'high'|'medium'|'low'
//       action: 'Review',        // optional action label
//       detail: 'More info...',  // expandable detail
//     }
//   ]
// ============================================================

import { useState } from 'react'

// ── Severity Config ───────────────────────────────────────────
const SEVERITY = {
  high:   { bg: '#fef2f2', border: '#fecaca', badge: '#ef4444', badgeText: '#fff' },
  medium: { bg: '#fffbeb', border: '#fde68a', badge: '#f59e0b', badgeText: '#fff' },
  low:    { bg: '#f0fdf4', border: '#bbf7d0', badge: '#10b981', badgeText: '#fff' },
}

// ── Single Insight Row ────────────────────────────────────────
function InsightRow({ ins, index, total, showActions, onDismiss, onAction, compact }) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const isLast   = index === total - 1
  const hasDivider = !isLast

  return (
    <div style={{
      marginBottom: hasDivider ? (compact ? 8 : 12) : 0,
      paddingBottom: hasDivider ? (compact ? 8 : 12) : 0,
      borderBottom: hasDivider ? '1px solid #ddd6fe' : 'none',
    }}>
      <div style={{ display: 'flex', gap: compact ? 8 : 10, alignItems: 'flex-start' }}>

        {/* Colored dot */}
        <span style={{
          width: compact ? 6 : 8,
          height: compact ? 6 : 8,
          borderRadius: '50%',
          background: ins.color || '#7c3aed',
          flexShrink: 0,
          marginTop: compact ? 5 : 4,
          boxShadow: `0 0 5px ${ins.color || '#7c3aed'}60`,
          transition: 'box-shadow .2s',
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Label row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            {ins.label && (
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#7c3aed',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}>
                {ins.label}
              </span>
            )}

            {/* Severity badge */}
            {ins.severity && SEVERITY[ins.severity] && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 8,
                background: SEVERITY[ins.severity].badge,
                color: SEVERITY[ins.severity].badgeText,
                textTransform: 'uppercase',
                letterSpacing: '.04em',
              }}>
                {ins.severity}
              </span>
            )}
          </div>

          {/* Insight text */}
          <div style={{
            fontSize: compact ? 11 : 12,
            color: '#4c1d95',
            lineHeight: 1.55,
          }}>
            {ins.text}
          </div>

          {/* Expandable detail */}
          {expanded && ins.detail && (
            <div style={{
              marginTop: 8,
              padding: '8px 10px',
              background: 'rgba(124,58,237,.07)',
              borderRadius: 7,
              borderLeft: '2px solid #c4b5fd',
              fontSize: 11,
              color: '#5b21b6',
              lineHeight: 1.55,
            }}>
              {ins.detail}
            </div>
          )}

          {/* Action row */}
          {!compact && (ins.action || ins.detail || showActions) && (
            <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
              {/* Custom action */}
              {ins.action && (
                <button
                  onClick={() => onAction?.(ins, index)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 7,
                    border: '1px solid #c4b5fd',
                    background: '#fff',
                    color: '#6d28d9',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#8b5cf6' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#c4b5fd' }}
                >
                  {ins.action} →
                </button>
              )}

              {/* Expand detail */}
              {ins.detail && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 7,
                    border: '1px solid #e9d5ff',
                    background: 'transparent',
                    color: '#7c3aed',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {expanded ? '▲ Hide detail' : '▼ View detail'}
                </button>
              )}

              {/* Dismiss */}
              {showActions && (
                <button
                  onClick={() => { setDismissed(true); onDismiss?.(index) }}
                  style={{
                    padding: '3px 7px',
                    borderRadius: 7,
                    border: '1px solid #e9d5ff',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                  title="Dismiss insight"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main AIInsightCard ────────────────────────────────────────
export function AIInsightCard({
  insights    = [],
  title       = '🧠 AI Insights',
  subtitle,
  showActions = false,
  onDismiss,
  onAction,
  compact     = false,
  collapsible = false,
  loading     = false,
  badge       = 'LIVE',
  badgeColor  = { bg: '#ddd6fe', text: '#5b21b6' },
  style       = {},
}) {
  const [open,     setOpen]    = useState(true)
  const [allDismissed, setAllDismissed] = useState(false)

  const visibleCount = insights.length

  return (
    <div style={{
      background: 'linear-gradient(135deg,#f5f3ff,#eff6ff)',
      border: '1px solid #c4b5fd',
      borderRadius: 12,
      padding: compact ? 12 : 16,
      position: 'relative',
      ...style,
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: (!collapsible || open) ? (compact ? 10 : 14) : 0,
      }}>
        {/* Icon + Title */}
        <span style={{ fontSize: compact ? 14 : 16 }}>🧠</span>
        <span style={{
          fontSize: compact ? 12 : 13,
          fontWeight: 800,
          color: '#1e1b4b',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </span>

        {/* Insight count */}
        {visibleCount > 0 && (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            background: 'rgba(124,58,237,.12)',
            color: '#6d28d9',
            padding: '1px 6px',
            borderRadius: 10,
          }}>
            {visibleCount}
          </span>
        )}

        {/* LIVE badge */}
        {badge && (
          <span style={{
            background: badgeColor.bg,
            color: badgeColor.text,
            fontSize: 9,
            padding: '2px 8px',
            borderRadius: 10,
            fontWeight: 700,
            letterSpacing: '.05em',
            flexShrink: 0,
            animation: badge === 'LIVE' ? 'aiPulse 2s ease-in-out infinite' : 'none',
          }}>
            {badge}
          </span>
        )}

        {/* Collapse toggle */}
        {collapsible && (
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              background: 'rgba(124,58,237,.1)', border: 'none',
              borderRadius: 6, width: 22, height: 22,
              cursor: 'pointer', fontSize: 10, color: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {open ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (!collapsible || open) && (
        <p style={{ fontSize: 11, color: '#6d28d9', margin: '0 0 10px', fontStyle: 'italic' }}>
          {subtitle}
        </p>
      )}

      {/* ── Body ── */}
      {(!collapsible || open) && (
        <>
          {/* Loading */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#7c3aed', fontSize: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 8, animation: 'spin 1s linear infinite' }}>⏳</div>
              AI is analyzing your data...
            </div>
          ) : insights.length === 0 ? (
            /* Empty state */
            <div style={{
              textAlign: 'center', padding: compact ? '12px 0' : '20px 0',
              color: '#a78bfa', fontSize: 12,
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>✨</div>
              No insights available yet
            </div>
          ) : (
            /* Insight rows */
            insights.map((ins, i) => (
              <InsightRow
                key={i}
                ins={ins}
                index={i}
                total={insights.length}
                showActions={showActions}
                onDismiss={onDismiss}
                onAction={onAction}
                compact={compact}
              />
            ))
          )}
        </>
      )}

      {/* ── Footer — Nepal Privacy notice ── */}
      {!compact && !loading && insights.length > 0 && (
        <div style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid #ddd6fe',
          fontSize: 9,
          color: '#a78bfa',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <span>🔒</span>
          <span>AI insights are anonymized — Nepal Privacy Act 2018 compliant</span>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes aiPulse {
          0%,100% { opacity: 1; }
          50% { opacity: .7; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default AIInsightCard
