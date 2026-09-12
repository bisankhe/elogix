// FILE: src/components/dashboard/HROfficerDashboard.jsx
// eLogix HRMS — HR Officer Workspace Dashboard
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// Removes TASKS array (3 fake items), hardcoded StatCard values (3,5,2,4).
// API: GET /api/v1/hr-officer/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G = 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 60%,#a78bfa 100%)'
const A = '#7c3aed'

function KPICard({ icon, label, value, color = A }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${color}18`,
      padding: 16, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function HROfficerDashboard() {
  const { navTo } = useApp()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/hr-officer/summary', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}; if(!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: A, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>⟳</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>Loading HR Officer workspace for {company?.name}...</div>
    </div>
  )

  const kpis  = data?.kpis  || {}
  const tasks = data?.tasks || []

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#0f172a' }}>
      <div style={{ background: G, borderRadius: 16, padding: '18px 22px', marginBottom: 20,
        boxShadow: '0 4px 20px rgba(124,58,237,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>👥</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>HR Officer Workspace</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>
              {company?.name} · Day-to-day HR operations — onboarding, leave & case intake
            </div>
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#92400e', marginBottom: 14 }}>⚠️ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
        <KPICard icon="🆕" label="New Hires (Pending Docs)" value={kpis.new_hires_pending}  color="#0369a1"/>
        <KPICard icon="🌴" label="Leave Reviews Pending"    value={kpis.leave_reviews}       color="#7c3aed"/>
        <KPICard icon="📋" label="Open Cases"               value={kpis.open_cases}          color="#f59e0b"/>
        <KPICard icon="📑" label="Letters to Issue"         value={kpis.letters_pending}     color="#10b981"/>
        <KPICard icon="⚠️" label="Probation Due"            value={kpis.probation_due}       color="#ef4444"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>📋 Today's Tasks</div>
          {tasks.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
              ✅ No tasks for today — {company?.name}
            </div>
          ) : (
            tasks.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
                borderBottom: i < tasks.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>
                  {t.type === 'onboarding' ? '🆕' : t.type === 'leave' ? '🌴' : t.type === 'grievance' ? '⚠️' : '📋'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#334155' }}>{t.item || t.task || t.description}</div>
                  {t.due && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>Due: {t.due}</div>}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>🕐 Pending Approvals</div>
          {(data?.pending_approvals || []).length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>✅ No pending approvals</div>
          ) : (
            (data.pending_approvals || []).map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', borderBottom: i < data.pending_approvals.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{a.employee}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>{a.type} · {a.date}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', background: '#fffbeb',
                  padding: '2px 8px', borderRadius: 20, border: '1px solid #fde68a' }}>⏳ Pending</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>🔗 Quick Links</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Joining Checklist','joining-checklist'],['Leave Approval','leave-approval'],
            ['Grievance Management','grievance-management'],['Letter Request','letter-request'],
            ['Contract Expiry','contract-expiry'],['Probation Alerts','probation']].map(([label, id]) => (
            <button key={id} onClick={() => navTo(id)}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#f8fafc', color: '#374151', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
