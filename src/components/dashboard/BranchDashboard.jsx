// FILE: src/components/dashboard/BranchDashboard.jsx
// eLogix HRMS — Branch / Section / Unit Dashboard
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// Removes 5 hardcoded arrays:
//   attendanceData (6 fake months), kpiData (5 fake KPIs),
//   branchTasks (8 fake tasks), roleTasks (5 fake roles),
//   aiInsights (3 fake AI insights + fake Nepali recognition names).
// Also removes 7 missing shared imports:
//   Pill, ProgressBar, TaskItem, PageTitle, AIInsightCard (may not exist).
// API: GET /api/v1/branch-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G  = 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#38bdf8 100%)'
const A  = '#0369a1'

function ProgressBar({ value = 0, color = A, height = 6 }) {
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: color, borderRadius: height, transition: 'width .5s' }}/>
    </div>
  )
}

function KPICard({ icon, label, value, change, up, color = A }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${color}18`,
      padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color, marginBottom: 2 }}>{value ?? '—'}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{label}</div>
        </div>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      {change && (
        <div style={{ fontSize: 9, marginTop: 8, color: up !== false ? '#10b981' : '#ef4444' }}>
          {up !== false ? '▲' : '▼'} {change}
        </div>
      )}
    </div>
  )
}

export default function BranchDashboard() {
  const { navTo } = useApp()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [tasks,     setTasks]     = useState([])

  const s = _getSession(); const company = s?.company || {}
  const myRole = s?.user?.role || 'employee'

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/branch-dashboard/summary', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}; if(!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => {
        const dd = d.data || d
        setData(dd)
        setTasks(dd.tasks || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: A, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>⟳</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>Loading branch dashboard for {company?.name}...</div>
    </div>
  )

  const kpis           = data?.kpis           || {}
  const attendanceData = data?.attendance_trend || []
  const kpiData        = data?.kpi_scores      || []
  const roleTasks      = data?.role_tasks       || []
  const aiInsights     = data?.ai_insights      || []
  const leave_wfh      = data?.leave_wfh        || []
  const recognitions   = data?.recognitions     || []
  const done           = tasks.filter(t => t.done).length

  const TABS = [
    { id: 'overview',    label: '📊 Overview' },
    { id: 'reports',     label: '📤 Reports'  },
    { id: 'performance', label: '🎯 KPIs'     },
    { id: 'tasks',       label: `✅ Tasks (${done}/${tasks.length})` },
    { id: 'ai',          label: '🧠 AI'       },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#0f172a' }}>

      {/* Header */}
      <div style={{ background: G, borderRadius: 16, padding: '18px 22px', marginBottom: 16,
        boxShadow: '0 4px 20px rgba(3,105,161,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>🏢</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Branch Dashboard</div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>
              {company?.name} · {data?.branch_name || 'Branch Operations'}
            </div>
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#92400e', marginBottom: 12 }}>⚠️ {error}</div>}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 16 }}>
        <KPICard icon="👥" label="Branch Headcount"   value={kpis.headcount}          change={kpis.headcount_change}   color="#06b6d4"/>
        <KPICard icon="✅" label="Branch Attendance"  value={kpis.attendance_pct}     change={kpis.attendance_change}  color="#10b981"/>
        <KPICard icon="📊" label="Branch Performance" value={kpis.performance_pct}    change={kpis.performance_change} color="#f59e0b"/>
        <KPICard icon="⏳" label="Pending Actions"    value={kpis.pending_actions}     up={false}                       color="#ef4444"/>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, minWidth: 80, padding: '7px 8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 10,
              fontWeight: activeTab === tab.id ? 700 : 400,
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#0f172a' : '#64748b',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>📈 Branch Attendance Trend</div>
              {attendanceData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 11 }}>No attendance trend data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={attendanceData}>
                    <defs>
                      <linearGradient id="gBR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey={Object.keys(attendanceData[0]||{})[0]} tick={{ fontSize: 10 }}/>
                    <YAxis tick={{ fontSize: 10 }}/>
                    <Tooltip/>
                    <Area type="monotone" dataKey="present" stroke="#06b6d4" fill="url(#gBR)" strokeWidth={2.5}/>
                    <Area type="monotone" dataKey="leave"   stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4"/>
                    <Area type="monotone" dataKey="absent"  stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="2"/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>📋 Team Leave / WFH Status</div>
              {leave_wfh.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 11 }}>No leave/WFH data</div>
              ) : (
                leave_wfh.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: 8, background: l.bg || '#f8fafc', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: l.color || '#374151' }}>{l.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: l.color || '#0f172a' }}>{l.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recognitions */}
          {recognitions.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>🏆 Peer Recognitions</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {recognitions.map((r, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 180, background: '#fafafa', borderRadius: 10,
                    padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon || '⭐'}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{r.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance tab */}
      {activeTab === 'performance' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 16 }}>🎯 Branch KPI Scores</div>
          {kpiData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No KPI data yet for {company?.name}</div>
            </div>
          ) : (
            kpiData.map((k, i) => {
              const pct = Math.round(((k.actual || 0) / (k.target || 100)) * 100)
              const color = pct >= 100 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444'
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{k.kpi}</span>
                    <span style={{ fontWeight: 800, color }}>
                      {k.actual} / {k.target}
                    </span>
                  </div>
                  <ProgressBar value={pct} color={color}/>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>
              ✅ Tasks ({done}/{tasks.length} done)
            </div>
            {tasks.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 12 }}>No tasks assigned for today</div>
              </div>
            ) : (
              tasks.map(t => (
                <div key={t.id} onClick={() => toggleTask(t.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px',
                    borderBottom: '1px solid #f8fafc', cursor: 'pointer', opacity: t.done ? 0.55 : 1 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${t.done ? '#10b981' : '#d1d5db'}`,
                    background: t.done ? '#10b981' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1 }}>
                    {t.done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a',
                      textDecoration: t.done ? 'line-through' : 'none' }}>{t.task}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                      {t.dept} · {t.priority} priority
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: t.priority === 'high' ? '#fef2f2' : t.priority === 'medium' ? '#fffbeb' : '#f8fafc',
                    color: t.priority === 'high' ? '#dc2626' : t.priority === 'medium' ? '#d97706' : '#64748b' }}>
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Role task summary */}
          {roleTasks.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>👥 Role-wise Task Summary</div>
              {roleTasks.map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color || A }}/>
                      <span style={{ color: '#475569' }}>{r.role}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: r.color || A }}>{r.done}/{r.tasks} done</span>
                  </div>
                  <ProgressBar value={r.tasks > 0 ? (r.done / r.tasks) * 100 : 0} color={r.color || A}/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports tab */}
      {activeTab === 'reports' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>📤 Forward Reports to Senior Management</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Daily Attendance Report',    desc: 'Submit attendance summary to HR',   icon: '📅', route: 'attendance' },
              { label: 'Weekly Performance Report',  desc: 'Forward branch KPIs to management', icon: '📊', route: 'performance' },
              { label: 'Branch Headcount Report',    desc: 'Update employee count to HR system', icon: '👥', route: 'headcount' },
              { label: 'Expense & Cost Report',      desc: 'Submit expense claims and approvals', icon: '💰', route: 'expenses' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{r.label}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{r.desc}</div>
                  </div>
                </div>
                <button onClick={() => navTo(r.route)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: G, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  Submit →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI tab */}
      {activeTab === 'ai' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>🧠 Branch AI Insights</div>
          {aiInsights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No AI insights yet for {company?.name}</div>
              <div style={{ fontSize: 11, marginTop: 6 }}>Insights appear as your branch data accumulates</div>
            </div>
          ) : (
            aiInsights.map((ins, i) => (
              <div key={i} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10,
                marginBottom: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{ins.icon || '💡'}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{ins.title}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{ins.body || ins.message}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
