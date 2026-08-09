// ============================================================
// FILE: src/components/modals/NotificationPanel.jsx
// PURPOSE: Slide-in notification panel — tiered Red/Yellow/Blue
//          alerts, mark as read, action buttons, module filter,
//          smart grouping by type and time
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext.jsx'

// ── All notifications ─────────────────────────────────────────
const INITIAL_NOTIFICATIONS = [
  // CRITICAL
  { id: 1,  type: 'critical', icon: '⚠️', module: 'Performance', title: '5 appraisals overdue — Q2 cycle',            sub: 'HR Manager · 3 days overdue',         time: '3 days ago', action: 'Review',      read: false },
  { id: 2,  type: 'critical', icon: '🔐', module: 'Security',    title: 'Failed login × 5 — Himalaya Corp tenant',   sub: 'Super Admin · 4 min ago',             time: '4 min ago',  action: 'Investigate', read: false },
  { id: 3,  type: 'critical', icon: '📋', module: 'Contract',    title: '6 contracts expiring within 30 days',        sub: 'HR Manager',                          time: '1 day ago',  action: 'Review',      read: false },
  // WARNING
  { id: 4,  type: 'warning',  icon: '🕐', module: 'Leave',       title: '12 leave requests pending approval',         sub: 'Oldest: 3 days',                      time: '3 days ago', action: 'Approve',     read: false },
  { id: 5,  type: 'warning',  icon: '💰', module: 'Payroll',     title: '3 OT cases exceeding Nepal law limit',       sub: 'Finance dept',                        time: '2 days ago', action: 'Review',      read: false },
  { id: 6,  type: 'warning',  icon: '🏢', module: 'Attendance',  title: 'Sales dept attendance below 80%',            sub: '201/260 present',                     time: '1 day ago',  action: 'Investigate', read: true  },
  { id: 7,  type: 'warning',  icon: '🎯', module: 'Performance', title: 'Q2 OKR below 60% — 3 departments',          sub: 'Finance, Ops, Sales',                 time: '2 days ago', action: 'Review',      read: true  },
  // INFO
  { id: 8,  type: 'info',     icon: '👥', module: 'Onboarding',  title: '3 new employees onboarded today',            sub: 'IT (2) and Sales (1)',                 time: '2 hrs ago',  action: null,          read: false },
  { id: 9,  type: 'info',     icon: '💰', module: 'Payroll',     title: 'May payroll processed — Rs 4.2M',            sub: 'Finance · Bank transfer initiated',   time: '3 hrs ago',  action: null,          read: true  },
  { id: 10, type: 'info',     icon: '🎂', module: 'People',      title: "Today: Roshan Shrestha's birthday",          sub: 'IT Department',                       time: 'Today',      action: null,          read: true  },
  { id: 11, type: 'info',     icon: '🧠', module: 'AI',          title: 'AI models retrained — improved accuracy',    sub: 'Attrition: 87.3%, Salary: 91.2%',    time: 'May 28',     action: null,          read: true  },
  { id: 12, type: 'info',     icon: '📊', module: 'Reports',     title: 'Monthly HR report generated — May 2026',     sub: 'Ready for download',                  time: 'Jun 1',      action: 'Download',    read: true  },
  // ── Legal Document Expiry Alerts (Company Compliance) ──────
  { id: 13, type: 'critical', icon: '✅', module: 'Company Docs', title: 'Tax Clearance Certificate — EXPIRED',         sub: 'NepHR Pro Pvt. Ltd. · IRD · Expired May 31', time: 'Today',      action: 'Renew',       read: false },
  { id: 14, type: 'critical', icon: '🔖', module: 'Company Docs', title: 'Trade License renewal due in 20 days',        sub: 'NepHR Pro Pvt. Ltd. · Dept. of Commerce',    time: 'Today',      action: 'Renew',       read: false },
  { id: 15, type: 'warning',  icon: '🏛️', module: 'Company Docs', title: 'OCR Certificate expires in 34 days',         sub: 'NepHR Pro Pvt. Ltd. · Office of Company Registrar', time: 'Today', action: 'Review',   read: false },
  { id: 16, type: 'warning',  icon: '🔖', module: 'Company Docs', title: 'Shop & Establishment License — 29 days left', sub: 'NepHR India Pvt. Ltd. · State Labour Dept.',  time: 'Today',      action: 'Renew',       read: false },
  { id: 17, type: 'warning',  icon: '📋', module: 'Company Docs', title: 'Labour Audit Report due for upload',          sub: 'NepHR Pro Pvt. Ltd. · DoL · Submit by Jul 31',time: 'Today',      action: 'Upload',      read: false },
]

const TYPE_CONFIG = {
  critical: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Critical', pillBg: '#fef2f2', pillColor: '#dc2626' },
  warning:  { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Warning',  pillBg: '#fffbeb', pillColor: '#d97706' },
  info:     { bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', label: 'Info',     pillBg: '#eff6ff', pillColor: '#2563eb' },
}

// ── Single Notification Item ──────────────────────────────────
function NotifItem({ notif, onMarkRead, onAction }) {
  const cfg = TYPE_CONFIG[notif.type]
  return (
    <div style={{
      display: 'flex', gap: 10,
      padding: '10px 14px',
      background: notif.read ? '#fff' : cfg.bg,
      borderLeft: `3px solid ${notif.read ? '#f1f5f9' : cfg.dot}`,
      borderBottom: '1px solid #f1f5f9',
      transition: 'background .2s',
      cursor: 'default',
    }}
      onMouseEnter={e => e.currentTarget.style.background = notif.read ? '#f8fafc' : cfg.bg}
      onMouseLeave={e => e.currentTarget.style.background = notif.read ? '#fff' : cfg.bg}
    >
      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: cfg.pillBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>
        {notif.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
          {!notif.read && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'inline-block', marginTop: 4, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 12, fontWeight: notif.read ? 500 : 700, color: '#0f172a', lineHeight: 1.4, flex: 1 }}>
            {notif.title}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{notif.sub}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>🕐 {notif.time}</span>
          <span style={{ fontSize: 10, background: cfg.pillBg, color: cfg.pillColor, padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>
            {notif.module}
          </span>

          {/* Actions */}
          {notif.action && (
            <button onClick={() => onAction(notif)}
              style={{
                padding: '2px 8px', borderRadius: 6,
                border: `1px solid ${cfg.dot}`, color: cfg.dot,
                background: 'transparent', fontSize: 10, fontWeight: 700,
                cursor: 'pointer', transition: 'all .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = cfg.bg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {notif.action}
            </button>
          )}

          {/* Mark read */}
          {!notif.read && (
            <button onClick={() => onMarkRead(notif.id)}
              style={{
                padding: '2px 6px', borderRadius: 6,
                border: '1px solid #e2e8f0', color: '#64748b',
                background: 'transparent', fontSize: 9, cursor: 'pointer',
              }}>
              ✓ Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────
export default function NotificationPanel({ onClose }) {
  const { t, navTo } = useApp()
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [filter, setFilter] = useState('all')  // 'all' | 'critical' | 'warning' | 'info' | 'unread'
  const panelRef = useRef()

  const unread    = notifications.filter(n => !n.read).length
  const critical  = notifications.filter(n => n.type === 'critical').length
  const warning   = notifications.filter(n => n.type === 'warning').length
  const info      = notifications.filter(n => n.type === 'info').length

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', handler), 100)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markRead    = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  const handleAction = (notif) => {
    markRead(notif.id)
    onClose()
    navTo?.('notifications')
  }

  const filtered = notifications.filter(n => {
    if (filter === 'unread')   return !n.read
    if (filter === 'critical') return n.type === 'critical'
    if (filter === 'warning')  return n.type === 'warning'
    if (filter === 'info')     return n.type === 'info'
    return true
  })

  return (
    <div style={{
      position: 'fixed', top: 52, right: 12,
      width: 380, maxHeight: 'calc(100vh - 70px)',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      boxShadow: '0 12px 48px rgba(0,0,0,.16)',
      zIndex: 500,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}
      ref={panelRef}
    >
      {/* ── Header ── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
              🔔 Notifications
              {unread > 0 && (
                <span style={{ marginLeft: 7, background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                  {unread} new
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {unread > 0 && (
              <button onClick={markAllRead}
                style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                ✓ All read
              </button>
            )}
            <button onClick={onClose}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', fontSize: 16, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { id: 'all',      label: `All (${notifications.length})`  },
            { id: 'critical', label: `🔴 ${critical}`                  },
            { id: 'warning',  label: `🟡 ${warning}`                   },
            { id: 'info',     label: `🔵 ${info}`                      },
            { id: 'unread',   label: `📬 ${unread}`                    },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                padding: '3px 9px', borderRadius: 20,
                border: `1px solid ${filter === f.id ? '#3b82f6' : '#e2e8f0'}`,
                background: filter === f.id ? '#eff6ff' : '#fff',
                color: filter === f.id ? '#1d4ed8' : '#64748b',
                fontSize: 11, fontWeight: filter === f.id ? 700 : 400,
                cursor: 'pointer', transition: 'all .12s',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notification List ── */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔕</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>No notifications</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>You're all caught up!</div>
          </div>
        ) : (
          filtered.map(n => (
            <NotifItem key={n.id} notif={n} onMarkRead={markRead} onAction={handleAction} />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', flexShrink: 0, textAlign: 'center' }}>
        <button
          onClick={() => { onClose(); navTo?.('notifications') }}
          style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
          View all notifications →
        </button>
      </div>
    </div>
  )
}
