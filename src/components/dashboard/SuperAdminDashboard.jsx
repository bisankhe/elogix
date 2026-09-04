// ============================================================
// FILE: src/components/dashboard/SuperAdminDashboard.jsx
// Fixed: Removed dual-axis BarChart (yAxisId conflict)
// ============================================================

import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { StatCard }      from '../shared/StatCard.jsx'
import { Card }          from '../shared/Card.jsx'
import { Pill }          from '../shared/Pill.jsx'
import { ProgressBar }   from '../shared/ProgressBar.jsx'
import { PageTitle }     from '../shared/PageTitle.jsx'
import { AIInsightCard } from '../shared/AIInsightCard.jsx'

// ── Data ─────────────────────────────────────────────────────
const tenantData = [
  { region: 'Nepal',       tenants: 18, revenue: 2160000 },
  { region: 'India',       tenants: 12, revenue: 1440000 },
  { region: 'Middle East', tenants: 9,  revenue: 1800000 },
  { region: 'SEA',         tenants: 5,  revenue: 600000  },
  { region: 'Others',      tenants: 3,  revenue: 360000  },
]

const systemHealthData = [
  { time: '08:00', cpu: 65, memory: 70 },
  { time: '10:00', cpu: 78, memory: 74 },
  { time: '12:00', cpu: 72, memory: 76 },
  { time: '14:00', cpu: 69, memory: 73 },
  { time: '16:00', cpu: 75, memory: 75 },
  { time: '18:00', cpu: 58, memory: 68 },
  { time: '20:00', cpu: 42, memory: 62 },
]

const licenseData = [
  { plan: 'Enterprise (10 clients)',   pct: 89, color: '#3b82f6' },
  { plan: 'Professional (24 clients)', pct: 72, color: '#8b5cf6' },
  { plan: 'Starter (13 clients)',      pct: 41, color: '#10b981' },
]

const recentTenants = [
  { name: 'Himalaya Corp Pvt. Ltd.',  plan: 'Enterprise',   users: 1250, status: 'Active',  joined: 'May 20, 2025' },
  { name: 'Peak Solutions Nepal',     plan: 'Professional', users: 420,  status: 'Trial',   joined: 'Jun 1, 2026'  },
  { name: 'Sunrise Finance Group',    plan: 'Enterprise',   users: 880,  status: 'Active',  joined: 'Mar 15, 2025' },
  { name: 'Nepal IT Services',        plan: 'Starter',      users: 95,   status: 'Active',  joined: 'Apr 10, 2026' },
  { name: 'TechBridge Pvt. Ltd.',     plan: 'Professional', users: 310,  status: 'Active',  joined: 'Feb 28, 2026' },
]

const auditLog = [
  { icon: '🚨', event: 'Failed login × 5 — Himalaya Corp', user: 'Unknown',      time: '4 min ago',  severity: 'critical' },
  { icon: '✅', event: 'New tenant onboarded',              user: 'Super Admin',  time: '2 hr ago',   severity: 'info'     },
  { icon: '📤', event: 'Data export requested',             user: 'Admin User',   time: '5 hr ago',   severity: 'warning'  },
  { icon: '🔧', event: 'System config updated',             user: 'Super Admin',  time: '1 day ago',  severity: 'info'     },
  { icon: '🔄', event: 'AI models retrained — v3.2',        user: 'System',       time: 'May 28',     severity: 'info'     },
  { icon: '🛡️', event: 'Security scan completed',          user: 'Security Bot', time: 'May 27',     severity: 'info'     },
]

const services = [
  { name: 'API Gateway',      status: 'Healthy',  color: '#10b981' },
  { name: 'Database Cluster', status: 'Healthy',  color: '#10b981' },
  { name: 'AI Model Server',  status: 'Degraded', color: '#f59e0b' },
  { name: 'File Storage',     status: 'Healthy',  color: '#10b981' },
  { name: 'Email Service',    status: 'Issues',   color: '#ef4444' },
  { name: 'Redis Cache',      status: 'Healthy',  color: '#10b981' },
  { name: 'Notification Hub', status: 'Healthy',  color: '#10b981' },
  { name: 'Search Engine',    status: 'Healthy',  color: '#10b981' },
]

const aiInsights = [
  { color: '#ef4444', label: 'Security Alert',      text: 'Himalaya Corp: 5 failed logins. Possible brute-force. IP temporarily blocked.' },
  { color: '#f59e0b', label: 'AI Server Degraded',  text: 'ML inference showing 1.2s latency (threshold: 800ms). Scale up recommended.' },
  { color: '#3b82f6', label: 'License Conversion',  text: 'Peak Solutions trial ends in 14 days. 89% feature adoption — send upgrade offer.' },
  { color: '#10b981', label: 'Revenue Forecast',    text: 'Projected MRR for Q3 2026: Rs 6.8M — 23% above Q2 target.' },
]

const severityColor = { critical: 'red', warning: 'yellow', info: 'blue' }


function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function SuperAdminDashboard() {
  const { t, cc } = _useAppFallback()
  const [activeTab, setActiveTab] = useState('overview')

  const fmt = (val) => {
    if (val >= 1000000) return `${cc.symbol}${(val / 1000000).toFixed(1)}M`
    if (val >= 1000)    return `${cc.symbol}${(val / 1000).toFixed(0)}K`
    return `${cc.symbol}${val}`
  }

  return (
    <div>
      {/* Access Banner */}
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🛡️</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
          Super Admin — Full System Visibility. All actions are logged. Nepal Privacy Act 2018 compliant.
        </span>
      </div>

      <PageTitle title="Super Admin Dashboard" sub="System health, multi-tenant management, security & compliance." badge="Full Access" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="🏢" label="Active Tenants"    value="47"     change="+3 this month"  up  accent="#3b82f6" />
        <StatCard icon="👥" label="Total Users"       value="18,420" change="+240 this week" up  accent="#10b981" />
        <StatCard icon="🖥️" label="System Uptime"    value="99.97%" change="SLA compliant"  up  accent="#f59e0b" />
        <StatCard icon="🛡️" label="Security Alerts"  value="2"      change="Needs review"   up={false} accent="#ef4444" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',   label: '📊 Overview'   },
          { id: 'system',     label: '🖥️ System'     },
          { id: 'tenants',    label: '🏢 Tenants'    },
          { id: 'security',   label: '🛡️ Security'   },
          { id: 'compliance', label: '⚖️ Compliance' },
          { id: 'ai',         label: '🧠 AI Insights' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-none cursor-pointer
              ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Tenant Bar Chart — SINGLE Y-AXIS, NO yAxisId */}
            <div className="lg:col-span-2">
              <Card title="Tenant Distribution by Region" subtitle="Active SaaS clients per region">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={tenantData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tenants" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tenants" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* License */}
            <Card title="License Utilization" subtitle="Seats used vs allocated">
              {licenseData.map((l, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{l.plan}</span>
                    <span style={{ fontWeight: 800, color: l.color }}>{l.pct}%</span>
                  </div>
                  <ProgressBar value={l.pct} color={l.color} />
                </div>
              ))}
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, fontSize: 11, color: '#64748b' }}>
                💡 3 Starter clients ready for upgrade
              </div>
            </Card>
          </div>

          {/* Recent Tenants */}
          <Card title="Recent Tenants" subtitle="Latest client accounts">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Company', 'Plan', 'Users', 'Status', 'Joined'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTenants.map((t, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 text-xs font-bold text-gray-800">{t.name}</td>
                    <td className="py-3">
                      <Pill color={t.plan === 'Enterprise' ? 'purple' : t.plan === 'Professional' ? 'blue' : 'gray'}>
                        {t.plan}
                      </Pill>
                    </td>
                    <td className="py-3 text-xs font-bold text-gray-800">{t.users.toLocaleString()}</td>
                    <td className="py-3">
                      <Pill color={t.status === 'Active' ? 'green' : 'yellow'}>{t.status}</Pill>
                    </td>
                    <td className="py-3 text-xs text-gray-500">{t.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── SYSTEM ── */}
      {activeTab === 'system' && (
        <div>
          <Card title="System Resource Usage — Today" subtitle="CPU & Memory over 24 hours" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={systemHealthData}>
                <defs>
                  <linearGradient id="gCPU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="cpu"    stroke="#3b82f6" fill="url(#gCPU)" strokeWidth={2} name="CPU %"    />
                <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fill="url(#gMem)" strokeWidth={2} name="Memory %" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Service Health Status" subtitle="Real-time infrastructure monitoring">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {services.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 9, border: '1px solid #f1f5f9' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{s.name}</span>
                  <Pill color={s.color === '#10b981' ? 'green' : s.color === '#f59e0b' ? 'yellow' : 'red'}>
                    {s.status}
                  </Pill>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── TENANTS ── */}
      {activeTab === 'tenants' && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard icon="🏆" label="Enterprise" value="10" change="+1 this month" up  accent="#8b5cf6" />
            <StatCard icon="⭐" label="Professional" value="24" change="+2 this month" up  accent="#3b82f6" />
            <StatCard icon="🔰" label="Starter"    value="13" change="Same as last"  up={false} accent="#10b981" />
            <StatCard icon="🔄" label="Trial"      value="4"  change="2 expiring"    up={false} accent="#f59e0b" />
          </div>

          {/* Revenue chart — SINGLE Y-AXIS */}
          <Card title={`Revenue by Region (${cc.code})`} subtitle="Monthly recurring revenue">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tenantData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
                <Tooltip formatter={v => [fmt(v), 'MRR']} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── SECURITY ── */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Security Audit Log" subtitle="All actions logged & timestamped">
            {auditLog.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{a.event}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{a.user} · {a.time}</div>
                </div>
                <Pill color={severityColor[a.severity]}>{a.severity}</Pill>
              </div>
            ))}
          </Card>

          <div className="space-y-4">
            <Card title="Active Security Alerts">
              {[
                { title: 'Brute force attempt — Himalaya Corp', detail: 'IP: 192.168.45.12 · 5 attempts · Account locked', severity: 'critical' },
                { title: 'Email service intermittent failures',  detail: 'SMTP relay timeout · 6% delivery failure', severity: 'warning' },
              ].map((a, i) => (
                <div key={i} style={{ padding: '10px 12px', background: a.severity === 'critical' ? '#fef2f2' : '#fffbeb', border: `1px solid ${a.severity === 'critical' ? '#fca5a5' : '#fde68a'}`, borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: a.severity === 'critical' ? '#dc2626' : '#d97706' }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{a.detail}</div>
                </div>
              ))}
            </Card>

            <Card title="Security Score">
              {[
                { label: 'Authentication (MFA)',  score: 95,  color: '#10b981' },
                { label: 'Encryption at rest',    score: 100, color: '#10b981' },
                { label: 'API security',          score: 88,  color: '#3b82f6' },
                { label: 'Access control (RBAC)', score: 94,  color: '#10b981' },
                { label: 'Data isolation',        score: 100, color: '#10b981' },
                { label: 'Incident response',     score: 72,  color: '#f59e0b' },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: '#475569' }}>{s.label}</span>
                    <span style={{ fontWeight: 700, color: s.color }}>{s.score}%</span>
                  </div>
                  <ProgressBar value={s.score} color={s.color} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── COMPLIANCE ── */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Nepal Right to Privacy Act 2018" subtitle="Platform-wide compliance">
            <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>✅ Compliance Status: PASSING</div>
            </div>
            {[
              { label: 'Data consent forms',         value: '100% tenants', ok: true  },
              { label: 'Encryption (AES-256)',        value: 'All data',     ok: true  },
              { label: 'TLS 1.3 in transit',          value: 'Enforced',     ok: true  },
              { label: 'GDPR-aligned practices',      value: 'Compliant',    ok: true  },
              { label: 'Audit trail — all actions',   value: 'Active',       ok: true  },
              { label: 'Data retention policy',       value: 'Review Jul',   ok: false },
              { label: '3rd party data sharing',      value: 'Blocked',      ok: true  },
              { label: 'Right to erasure (RTBE)',      value: 'Implemented',  ok: true  },
              { label: 'Employee AI consent',         value: '100%',         ok: true  },
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{c.label}</span>
                <Pill color={c.ok ? 'green' : 'yellow'}>{c.value}</Pill>
              </div>
            ))}
          </Card>

          <Card title="Multi-tenant Data Isolation" subtitle="Schema isolation per client">
            {[
              { label: 'Separate PostgreSQL schema per tenant', value: '47 schemas'    },
              { label: 'Cross-tenant access blocked',           value: 'Row-level RLS' },
              { label: 'Tenant-specific encryption keys',       value: 'AWS KMS'       },
              { label: 'Backup isolation per tenant',           value: 'Daily snapshots'},
              { label: 'Data residency — Nepal',                value: 'AP-South-1'    },
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{c.label}</span>
                <Pill color="green">{c.value}</Pill>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AIInsightCard insights={aiInsights.slice(0, 2)} title="🛡️ Security & System Alerts" />
          <AIInsightCard insights={aiInsights.slice(2, 4)} title="📈 Business Intelligence" />
        </div>
      )}
    </div>
  )
}
