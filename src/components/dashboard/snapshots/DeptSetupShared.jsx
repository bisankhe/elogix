// FILE: src/components/dashboard/snapshots/DeptSetupShared.jsx
// eLogix HRMS — Shared UI components for setup pages
// Used by: ShiftSetup, DeptSetup, AnnualManpower, and 20+ other pages
// eLogix Technologies · www.elogix.com.np

import { useState } from 'react'

const P = '#7c3aed'

// ── Field — form input wrapper ────────────────────────────────────────
export function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>
          {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
    </div>
  )
}

// ── PageHeader — gradient header bar ─────────────────────────────────
export function PageHeader({ icon = '📄', title, breadcrumb, badge, actions }) {
  const sess = (() => { try { return JSON.parse(sessionStorage.getItem('elogix_session') || localStorage.getItem('elogix_session') || 'null') || {} } catch { return {} } })()
  const company = sess?.company?.name || ''
  return (
    <div style={{
      background: 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)',
      borderRadius: 16, padding: '20px 24px', marginBottom: 20,
      boxShadow: '0 4px 24px rgba(124,58,237,.25)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{icon} {title}</div>
          {breadcrumb && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>{breadcrumb}</div>}
          {company && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{company}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {badge && <span style={{ background: 'rgba(255,255,255,.15)', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{badge}</span>}
          {actions}
        </div>
      </div>
    </div>
  )
}

// ── SearchBar ─────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <input
      value={value || ''}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '8px 14px', borderRadius: 8,
        border: '1px solid #e2e8f0', fontSize: 13,
        width: '100%', outline: 'none', background: '#fff',
      }}
    />
  )
}

// ── LuxCard — elevated card ───────────────────────────────────────────
export function LuxCard({ children, color = P, onClick, onContextMenu, style = {} }) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        background: '#fff', borderRadius: 12, padding: 16,
        border: `1px solid ${color}20`,
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .15s',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── AIImpact — AI badge ───────────────────────────────────────────────
export function AIImpact({ text }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
      border: '1px solid #c4b5fd', borderRadius: 8,
      padding: '6px 12px', fontSize: 12, color: '#6d28d9', fontWeight: 600,
    }}>
      🤖 {text || 'AI-Powered'}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────
export function Badge({ label, color = P }) {
  return (
    <span style={{
      background: `${color}15`, color,
      border: `1px solid ${color}30`,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
    }}>
      {label}
    </span>
  )
}

// ── Drawer — slide-in panel ───────────────────────────────────────────
export function Drawer({ open, onClose, title, children, width = 420 }) {
  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width,
        background: '#fff', zIndex: 1001,
        boxShadow: '-4px 0 32px rgba(0,0,0,.15)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
      </div>
    </>
  )
}

// ── ExcelModal — import/export modal ─────────────────────────────────
export function ExcelModal({ open, onClose, title = 'Import / Export' }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📊 {title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
            ⬇️ Download Template
          </button>
          <button style={{ padding: '10px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb' }}>
            ⬆️ Upload File
          </button>
          <button style={{ padding: '10px 16px', background: P, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            📤 Export Current Data
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ContextMenu ───────────────────────────────────────────────────────
export function ContextMenu({ ctx, onClose, options = [] }) {
  if (!ctx) return null
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000 }} />
      <div style={{
        position: 'fixed', top: ctx.y, left: ctx.x, zIndex: 3001,
        background: '#fff', borderRadius: 10, padding: '6px 0',
        boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        minWidth: 160, border: '1px solid #e2e8f0',
      }}>
        {options.map((opt, i) => (
          <button key={i} onClick={() => { opt.action && opt.action(ctx.item); onClose() }}
            style={{ display: 'block', width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: opt.danger ? '#dc2626' : '#1e293b' }}>
            {opt.icon && <span style={{ marginRight: 8 }}>{opt.icon}</span>}{opt.label}
          </button>
        ))}
      </div>
    </>
  )
}

// ── THEMES — colour presets ───────────────────────────────────────────
export const THEMES = [
  { label: 'Purple',  value: '#7c3aed' },
  { label: 'Blue',    value: '#2563eb' },
  { label: 'Teal',    value: '#0d9488' },
  { label: 'Green',   value: '#16a34a' },
  { label: 'Orange',  value: '#ea580c' },
  { label: 'Red',     value: '#dc2626' },
  { label: 'Pink',    value: '#ec4899' },
]
