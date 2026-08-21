// ============================================================
// FILE: src/components/dashboard/snapshots/NotificationsPage.jsx
// PURPOSE: Notifications & Alerts — tiered Red/Yellow/Blue
//          system, action buttons, smart filters, history
// ============================================================

import { useState } from 'react'
import { useApp }    from '../../../context/AppContext.jsx'
import { StatCard }  from '../../shared/StatCard.jsx'
import { Card }      from '../../shared/Card.jsx'
import { Pill }      from '../../shared/Pill.jsx'
import { PageTitle } from '../../shared/PageTitle.jsx'

// ── Mock Data ────────────────────────────────────────────────
const allNotifications = [
  // CRITICAL
  {
    id: 1, type: 'critical', icon: '⚠️', module: 'Performance',
    title: '5 appraisals overdue — Q2 cycle',
    sub: 'HR Manager · IT & Sales departments · 3 days overdue',
    time: '3 days ago', action: 'Review', read: false,
    detail: 'Employees: Ram Thapa, Sita Sharma, Hari KC, Gita Rai, Bikram Limbu — all in Q2 review cycle.',
  },
  {
    id: 2, type: 'critical', icon: '🔐', module: 'Security',
    title: 'Failed login × 5 — Himalaya Corp tenant',
    sub: 'Super Admin · Suspicious activity detected · 4 min ago',
    time: '4 min ago', action: 'Investigate', read: false,
    detail: 'IP: 192.168.1.45 — Multiple failed attempts. Account temporarily locked. Review audit logs.',
  },
  {
    id: 3, type: 'critical', icon: '📋', module: 'Contract',
    title: '6 employment contracts expiring within 30 days',
    sub: 'HR Manager · IT (3), Finance (2), Sales (1)',
    time: '1 day ago', action: 'Review', read: false,
    detail: 'Contracts expiring: Jun 15 (2), Jun 22 (3), Jun 28 (1). Renewal or exit process must begin.',
  },
  // WARNING
  {
    id: 4, type: 'warning', icon: '🕐', module: 'Leave',
    title: '12 leave requests pending approval',
    sub: 'HR Manager · Oldest pending: 3 days · SLA breach risk',
    time: '3 days ago', action: 'Approve', read: false,
    detail: 'Departments: IT (5), Operations (4), Sales (3). Approval SLA is 48 hours.',
  },
  {
    id: 5, type: 'warning', icon: '💰', module: 'Payroll',
    title: '3 overtime cases exceeding Nepal law limit',
    sub: 'HR Manager · Finance dept · OT > 24hrs/week',
    time: '2 days ago', action: 'Review', read: false,
    detail: 'Nepal Labour Act: OT capped at 24 hrs/week @ 1.5x rate. Immediate action required.',
  },
  {
    id: 6, type: 'warning', icon: '🎯', module: 'Performance',
    title: 'Q2 OKR completion below 60% — 3 departments',
    sub: 'Executive · Finance, Operations, Sales lagging',
    time: '2 days ago', action: 'Review', read: false,
    detail: 'Finance: 48%, Operations: 54%, Sales: 58% — Q2 deadline is Jun 30.',
  },
  {
    id: 7, type: 'warning', icon: '🏢', module: 'Attendance',
    title: 'Sales department attendance below 80%',
    sub: 'HR Manager · 201/260 present · Weekly low',
    time: '1 day ago', action: 'Investigate', read: true,
    detail: 'Sales attendance dropped to 77.3% this week. 18 employees with unexcused absences.',
  },
  {
    id: 8, type: 'warning', icon: '📅', module: 'Probation',
    title: '3 employees approaching probation deadline',
    sub: 'HR Manager · 90-day review due within 7 days',
    time: '5 hrs ago', action: 'Review', read: true,
    detail: 'Probation max is 6 months per Nepal Labour Act. Review and confirm or terminate.',
  },
  // INFO
  {
    id: 9,  type: 'info', icon: '👥', module: 'Onboarding',
    title: '3 new employees onboarded today',
    sub: 'IT (2) and Sales (1) departments',
    time: '2 hrs ago', action: null, read: false,
    detail: 'Ram Thapa (IT), Sita Sharma (IT), Bikram Limbu (Sales) — orientation completed.',
  },
  {
    id: 10, type: 'info', icon: '💰', module: 'Payroll',
    title: 'May payroll processed — Rs 4.2M',
    sub: 'Finance · 1,250 employees · Bank transfer initiated',
    time: '3 hrs ago', action: null, read: true,
    detail: 'Payroll processed on time. Bank transfer file submitted. Rule 21 compliant.',
  },
  {
    id: 11, type: 'info', icon: '🎂', module: 'People',
    title: "Today: Roshan Shrestha's birthday",
    sub: 'IT Department · Senior Developer',
    time: 'Today', action: null, read: true,
    detail: 'Wish Roshan a happy birthday! Send recognition via the Appreciation module.',
  },
  {
    id: 12, type: 'info', icon: '🧠', module: 'AI',
    title: 'AI models retrained — improved accuracy',
    sub: 'System · Attrition model: 87.3%, Salary: 91.2%',
    time: 'May 28', action: null, read: true,
    detail: 'All 6 AI models retrained with latest data. Performance metrics improved across board.',
  },
  {
    id: 13, type: 'info', icon: '📊', module: 'Reports',
    title: 'Monthly HR report generated',
    sub: 'System · May 2026 report ready for download',
    time: 'Jun 1', action: 'Download', read: true,
    detail: 'May 2026 comprehensive HR report includes attendance, payroll, performance summary.',
  },
  {
    id: 14, type: 'info', icon: '🏅', module: 'Compliance',
    title: 'Q2 compliance review due Jun 30',
    sub: 'HR Manager · Nepal Labour Act 2017',
    time: 'Jun 1', action: 'Review', read: true,
    detail: 'Annual compliance checklist: OT limits, leave entitlements, PF contributions, work permits.',
  },
]

const MODULES = ['All', 'Performance', 'Security', 'Leave', 'Payroll', 'Attendance', 'Contract', 'Probation', 'Onboarding', 'AI', 'Compliance', 'People', 'Reports']

const typeConfig = {
  critical: { bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', label: 'Critical', pillColor: 'red'    },
  warning:  { bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', label: 'Warning',  pillColor: 'yellow' },
  info:     { bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', label: 'Info',     pillColor: 'blue'   },

// ── Notification Item ────────────────────────────────────────
function NotifItem({ notif, onAction, onRead, expanded, onExpand }) {
  const cfg = typeConfig[notif.type]

  return (
    <div
      style={{
        background: notif.read ? '#fff' : cfg.bg,
        border: `1px solid ${notif.read ? '#f1f5f9' : cfg.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 8,
        transition: 'all .2s',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 9,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}
        >
          {notif.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                {!notif.read && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{notif.title}</span>
                <Pill color={cfg.pillColor}>{cfg.label}</Pill>
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '1px 6px', borderRadius: 8 }}>{notif.module}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{notif.sub}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>🕐 {notif.time}</div>

              {/* Expanded detail */}
              {expanded && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8fafc', borderRadius: 6, fontSize: 11, color: '#475569', borderLeft: `3px solid ${cfg.dot}` }}>
                  {notif.detail}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {notif.action && (
                <button
                  onClick={() => onAction(notif)}
                  style={{
                    padding: '4px 10px', borderRadius: 7,
                    border: `1px solid ${cfg.dot}`, color: cfg.dot,
                    background: 'transparent', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = cfg.bg }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {notif.action}
                </button>
              )}
              <button
                onClick={() => onExpand(notif.id)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 11, cursor: 'pointer', color: '#64748b' }}
              >
                {expanded ? '▲' : '▼'}
              </button>
              {!notif.read && (
                <button
                  onClick={() => onRead(notif.id)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 10, cursor: 'pointer', color: '#64748b' }}
                  title="Mark as read"
                >
                  ✓
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

// ── Main Component ───────────────────────────────────────────
export default function NotificationsPage() {
  const { t } = useApp()
  const [notifications, setNotifications] = useState(allNotifications)
  const [filterType,    setFilterType]    = useState('all')      // 'all' | 'critical' | 'warning' | 'info' | 'unread'
  const [filterModule,  setFilterModule]  = useState('All')
  const [expandedId,    setExpandedId]    = useState(null)
  const [search,        setSearch]        = useState('')

  const unreadCount    = notifications.filter(n => !n.read).length
  const criticalCount  = notifications.filter(n => n.type === 'critical').length
  const warningCount   = notifications.filter(n => n.type === 'warning').length
  const infoCount      = notifications.filter(n => n.type === 'info').length

  // Filter notifications
  const filtered = notifications.filter(n => {
    const matchType   = filterType === 'all' ? true : filterType === 'unread' ? !n.read : n.type === filterType
    const matchModule = filterModule === 'All' ? true : n.module === filterModule
    const matchSearch = search === '' ? true : n.title.toLowerCase().includes(search.toLowerCase()) || n.sub.toLowerCase().includes(search.toLowerCase())
    return matchType && matchModule && matchSearch
  })

  const markRead     = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllRead  = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  const handleAction = (notif) => { markRead(notif.id); alert(`Action: ${notif.action} — ${notif.title}`) }
  const handleExpand = (id) => setExpandedId(prev => prev === id ? null : id)

  return (
    <div>
      <PageTitle
        title="Notifications & Alerts"
        sub="Tiered alert system — 🔴 Critical (immediate action), 🟡 Warning (pending), 🔵 Informational."
        badge={unreadCount > 0 ? `${unreadCount} Unread` : 'All Read'}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="🔴" label="Critical"    value={criticalCount} change="Immediate action"    up={false} accent="#ef4444" />
        <StatCard icon="🟡" label="Warnings"    value={warningCount}  change="Pending approval"    up={false} accent="#f59e0b" />
        <StatCard icon="🔵" label="Informational" value={infoCount}   change="FYI updates"         up accent="#3b82f6" />
        <StatCard icon="📬" label="Unread"       value={unreadCount}  change="Need attention"      up={false} accent="#8b5cf6" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search notifications..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
          style={{ minWidth: 200 }}
        />

        {/* Type filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
          {[
            { id: 'all',      label: `All (${notifications.length})`  },
            { id: 'critical', label: `🔴 (${criticalCount})`          },
            { id: 'warning',  label: `🟡 (${warningCount})`           },
            { id: 'info',     label: `🔵 (${infoCount})`              },
            { id: 'unread',   label: `📬 (${unreadCount})`            },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterType(f.id)}
              style={{
                padding: '5px 10px', borderRadius: 7, border: 'none',
                background: filterType === f.id ? '#fff' : 'transparent',
                color: filterType === f.id ? '#0f172a' : '#64748b',
                fontWeight: filterType === f.id ? 700 : 400,
                fontSize: 11, cursor: 'pointer',
                boxShadow: filterType === f.id ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Mark all read */}
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#3b82f6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            ✓ Mark all read
          </button>
        )}
      </div>

      {/* Module filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {MODULES.map(m => (
          <button key={m} onClick={() => setFilterModule(m)}
            style={{
              padding: '3px 10px', borderRadius: 20,
              border: `1px solid ${filterModule === m ? '#3b82f6' : '#e2e8f0'}`,
              background: filterModule === m ? '#eff6ff' : '#fff',
              color: filterModule === m ? '#1d4ed8' : '#64748b',
              fontSize: 11, fontWeight: filterModule === m ? 700 : 400,
              cursor: 'pointer', transition: 'all .15s',
            }}>
            {m}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Action Required */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            🚨 Action Required
            <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
              {filtered.filter(n => n.type !== 'info' && n.action).length}
            </span>
          </div>
          {filtered.filter(n => n.type !== 'info' && n.action).length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
              ✅ No action items match your filter
            </div>
          )}
          {filtered.filter(n => n.type !== 'info' && n.action).map(n => (
            <NotifItem
              key={n.id}
              notif={n}
              onAction={handleAction}
              onRead={markRead}
              expanded={expandedId === n.id}
              onExpand={handleExpand}
            />
          ))}
        </div>

        {/* Informational */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            📢 Informational & Updates
            <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
              {filtered.filter(n => n.type === 'info' || !n.action).length}
            </span>
          </div>
          {filtered.filter(n => n.type === 'info' || !n.action).length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
              No info notifications match your filter
            </div>
          )}
          {filtered.filter(n => n.type === 'info' || !n.action).map(n => (
            <NotifItem
              key={n.id}
              notif={n}
              onAction={handleAction}
              onRead={markRead}
              expanded={expandedId === n.id}
              onExpand={handleExpand}
            />
          ))}
        </div>
      </div>

      {/* Notification Settings Banner */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4c1d95' }}>🔔 Notification Preferences</div>
          <div style={{ fontSize: 11, color: '#6d28d9', marginTop: 2 }}>Configure email, SMS & in-app alerts in System Administration → Notification Engine</div>
        </div>
        <button style={{ padding: '6px 14px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          Configure
        </button>
      </div>
    </div>
  )
