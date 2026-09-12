// FILE: src/components/dashboard/DepartmentDashboard.jsx
// eLogix HRMS — Department Head Dashboard
// COMPLETE REWRITE — Zero mock data. Real tenant API. No bad imports.
// Removes 5 hardcoded arrays:
//   sprintData (6 fake sprints), deptTasks (8 fake tasks),
//   roleTasks (5 fake role names), recognitions (3 fake Nepali names),
//   aiInsights (4 fake insights).
// Also removes 6 missing shared imports:
//   Pill, ProgressBar, TaskItem, PageTitle, AIInsightCard.
// API: GET /api/v1/department-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G  = 'linear-gradient(135deg,#1e3a5f 0%,#3b82f6 60%,#93c5fd 100%)'
const A  = '#3b82f6'

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

export default function DepartmentDashboard() {
  const { navTo } = useApp()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [tasks,     setTasks]     = useState([])

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/department-dashboard/summary', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}; if(!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => { const dd = d.data || d; setData(dd); setTasks(dd.tasks || []) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: A, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>⟳</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>Loading department dashboard for {company?.name}...</div>
    </div>
  )

  const kpis         = data?.kpis          || {}
  const sprintData   = data?.sprint_data   || []
  const roleTasks    = data?.role_tasks    || []
  const recognitions = data?.recognitions  || []
  const aiInsights   = data?.ai_insights   || []
  const engagement   = data?.engagement    || {}
  const leave_wfh    = data?.leave_wfh     || []
  const done         = tasks.filter(t => t.done).length

  const TABS = [
    { id: 'overview',     label: '📊 Overview'   },
    { id: 'performance',  label: '🎯 Performance' },
    { id: 'tasks',        label: `✅ Tasks (${done}/${tasks.length})` },
    { id: 'team',         label: '👥 Team'        },
    { id: 'ai',           label: '🧠 AI'          },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#0f172a' }}>

      {/* Header */}
      <div style={{ background: G, borderRadius: 16, padding: '18px 22px', marginBottom: 16,
        boxShadow: '0 4px 20px rgba(59,130,246,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏛️</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Department Dashboard</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>
              {company?.name} · {data?.dept_name || 'Department Operations'}
            </div>
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#92400e', marginBottom: 12 }}>⚠️ {error}</div>}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 16 }}>
        <KPICard icon="👥" label="Team Size"         value={kpis.team_size}          color="#3b82f6"/>
        <KPICard icon="✅" label="Attendance"         value={kpis.attendance_pct}     color="#10b981"/>
        <KPICard icon="🎯" label="Sprint Velocity"    value={kpis.sprint_velocity}    color="#8b5cf6"/>
        <KPICard icon="⏳" label="Pending Actions"    value={kpis.pending_actions}     up={false} color="#ef4444"/>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, minWidth: 70, padding: '7px 8px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: activeTab === tab.id ? 700 : 400,
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

            {/* Sprint chart */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>⚡ Sprint Velocity Trend</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 12 }}>Story points per sprint</div>
              {sprintData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8', fontSize: 11 }}>No sprint data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sprintData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="sprint" tick={{ fontSize: 10 }}/>
                    <YAxis tick={{ fontSize: 10 }}/>
                    <Tooltip/>
                    <Bar dataKey="velocity" fill={A} radius={[6, 6, 0, 0]} name="Story Points"/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Engagement */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>❤️ Team Engagement Score</div>
              {Object.keys(engagement).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 11 }}>No engagement data yet</div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: A }}>{engagement.score ?? '—'}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>/ 100 overall score</div>
                  </div>
                  {(engagement.breakdown || []).map((e, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: '#475569' }}>{e.label}</span>
                        <span style={{ fontWeight: 700 }}>{e.value}/10</span>
                      </div>
                      <ProgressBar value={(e.value / 10) * 100} color={e.color || A}/>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Leave / WFH */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>📅 Team Leave / WFH Status</div>
            {leave_wfh.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: '#94a3b8', fontSize: 11 }}>No leave/WFH data</div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {leave_wfh.map((l, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 10,
                    background: l.bg || '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: l.color || '#374151' }}>{l.count}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>{l.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance tab */}
      {activeTab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {roleTasks.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>👥 Team Performance by Role</div>
              {roleTasks.map((r, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color || A }}/>
                      <span style={{ color: '#475569', fontWeight: 500 }}>{r.role}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: r.color || A }}>
                      {r.done}/{r.tasks} tasks · {r.count ?? ''} {r.count ? 'members' : ''}
                    </span>
                  </div>
                  <ProgressBar value={r.tasks > 0 ? (r.done / r.tasks) * 100 : 0} color={r.color || A}/>
                </div>
              ))}
            </div>
          )}

          {recognitions.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>🏆 Peer Recognitions</div>
              {recognitions.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0',
                  borderBottom: i < recognitions.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon || '⭐'}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{r.note}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {roleTasks.length === 0 && recognitions.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No performance data yet for {company?.name}</div>
            </div>
          )}
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
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
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{t.role} · {t.priority} priority</div>
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
      )}

      {/* Team tab */}
      {activeTab === 'team' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>👥 Team Overview</div>
          {(data?.team_members || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No team data yet for {company?.name}</div>
            </div>
          ) : (
            (data.team_members || []).map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${A}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: A }}>
                    {(m.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.name}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8' }}>{m.role} · {m.status}</div>
                  </div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: m.status === 'present' ? '#f0fdf4' : '#fef2f2',
                  color: m.status === 'present' ? '#15803d' : '#dc2626' }}>
                  {m.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* AI tab */}
      {activeTab === 'ai' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>🧠 Department AI Insights</div>
          {aiInsights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No AI insights yet for {company?.name}</div>
              <div style={{ fontSize: 11, marginTop: 6 }}>Insights appear as your department data accumulates</div>
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
