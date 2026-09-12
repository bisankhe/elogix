// ============================================================
// FILE: src/components/dashboard/SuperAdminDashboard.jsx
// Fixed: Removed dual-axis BarChart (yAxisId conflict)
// ============================================================

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useApp }        from '../../context/AppContext.jsx'
import { StatCard }      from '../shared/StatCard.jsx'
import { Card }          from '../shared/Card.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

function ProgressBar({value=0,color='#3b82f6',height=6}){
  return<div style={{height,background:'#f1f5f9',borderRadius:height,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.min(100,value)}%`,background:color,borderRadius:height}}/></div>
}
function Pill({color='blue',children}){
  const cfg={blue:{bg:'#eff6ff',c:'#1d4ed8'},green:{bg:'#f0fdf4',c:'#15803d'},yellow:{bg:'#fffbeb',c:'#b45309'},red:{bg:'#fef2f2',c:'#dc2626'},gray:{bg:'#f8fafc',c:'#64748b'}}
  const s=cfg[color]||cfg.gray
  return<span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,background:s.bg,color:s.c}}>{children}</span>
}
function AIInsightCard({insights=[],title='AI Insights'}){
  return<div style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',padding:'16px 18px'}}>
    <div style={{fontSize:12,fontWeight:800,marginBottom:12}}>{title}</div>
    {insights.length===0?<div style={{textAlign:'center',padding:16,color:'#94a3b8',fontSize:11}}>No insights yet</div>:insights.map((ins,i)=>(
      <div key={i} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:i<insights.length-1?'1px solid #f8fafc':'none'}}>
        <span style={{fontSize:16,flexShrink:0}}>{ins.icon}</span>
        <div><div style={{fontSize:11,fontWeight:700,color:'#0f172a'}}>{ins.type}</div><div style={{fontSize:10,color:'#64748b',marginTop:2}}>{ins.msg}</div></div>
      </div>
    ))}
  </div>
}


export default function SuperAdminDashboard() {

  const _s = _getSession(); const _co = _s?.company||{}

  const [tenantData,       setTenantData]       = useState([])
  const [systemHealthData, setSystemHealthData] = useState([])
  const [licenseData,      setLicenseData]      = useState([])
  const [recentTenants,    setRecentTenants]    = useState([])
  const [auditLog,         setAuditLog]         = useState([])
  const [services,         setServices]         = useState([])
  const [aiInsights,       setAiInsights]       = useState([])
  const [kpis,             setKpis]             = useState({})
  const [apiLoading,       setApiLoading]       = useState(true)
  const [apiError,         setApiError]         = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token') || _s?.token || ''
    if (!token) { setApiLoading(false); return }
    fetch('/api/v1/super-admin/summary', { headers: _authH() })
      .then(r => {
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => {
        const dd = d.data || d
        if(dd.tenant_data)       setTenantData(dd.tenant_data)
        if(dd.system_health)     setSystemHealthData(dd.system_health)
        if(dd.license_data)      setLicenseData(dd.license_data)
        if(dd.recent_tenants)    setRecentTenants(dd.recent_tenants)
        if(dd.audit_log)         setAuditLog(dd.audit_log)
        if(dd.services)          setServices(dd.services)
        if(dd.ai_insights)       setAiInsights(dd.ai_insights)
        if(dd.kpis)              setKpis(dd.kpis)
      })
      .catch(e => setApiError(e.message))
      .finally(() => setApiLoading(false))
  }, [])
  const { t, cc } = useApp()
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

      {/* eLogix SA gradient header */}
      <div style={{background:'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%)',borderRadius:16,padding:'18px 22px',marginBottom:16,boxShadow:'0 4px 20px rgba(0,0,0,.25)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>🌐</span>
          <div>
            <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>Super Admin Dashboard</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.65)',marginTop:2}}>System health · Multi-tenant management · Security & Compliance</div>
          </div>
          <span style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:'#fbbf24',background:'rgba(251,191,36,.15)',padding:'3px 10px',borderRadius:20}}>eLogix SuperAdmin</span>
        </div>
      </div>
      {apiError&&<div style={{padding:'10px 16px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',marginBottom:12}}>⚠️ {apiError}</div>}

      {/* removed PageTitle */}
      

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="🏢" label="Active Tenants"    value={kpis.active_tenants ?? "—"}     change="+3 this month"  up  accent="#3b82f6" />
        <StatCard icon="👥" label="Total Users"       value={kpis.total_users ?? "—"} change="+240 this week" up  accent="#10b981" />
        <StatCard icon="🖥️" label="System Uptime"    value={kpis.system_uptime ?? "—"} change="SLA compliant"  up  accent="#f59e0b" />
        <StatCard icon="🛡️" label="Security Alerts"  value={kpis.security_alerts ?? "—"}      change="Needs review"   up={false} accent="#ef4444" />
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
              {(licenseData||[]).length===0?<div style={{textAlign:"center",padding:16,color:"#94a3b8",fontSize:11}}>No license data</div>:(licenseData||[]).map((l, i) => (
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
                {(recentTenants||[]).length===0?(
                  <tr><td colSpan={5} style={{textAlign:'center',padding:24,color:'#94a3b8',fontSize:11}}>No tenants yet</td></tr>
                ):(recentTenants||[]).map((t, i) => (
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
            <StatCard icon="🏆" label="Enterprise" value={kpis?.auto_value ?? "—"} change="+1 this month" up  accent="#8b5cf6" />
            <StatCard icon="⭐" label="Professional" value={kpis?.auto_value ?? "—"} change="+2 this month" up  accent="#3b82f6" />
            <StatCard icon="🔰" label="Starter"    value={kpis?.auto_value ?? "—"} change="Same as last"  up={false} accent="#10b981" />
            <StatCard icon="🔄" label="Trial"      value={kpis?.auto_val ?? "—"}  change="2 expiring"    up={false} accent="#f59e0b" />
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
