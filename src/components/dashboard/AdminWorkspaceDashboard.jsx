// FILE: src/components/dashboard/AdminWorkspaceDashboard.jsx
// eLogix HRMS — Admin Officer Workspace Dashboard
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// Removes hardcoded TODAY array (3 fake visitor/room/gatepass items),
// hardcoded StatCard values (3, 6, 2, 4, 1).
// API: GET /api/v1/admin-workspace/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G = 'linear-gradient(135deg,#1e3a5f 0%,#0369a1 60%,#38bdf8 100%)'
const A = '#0369a1'

function KPICard({ icon, label, value, sub, color = A }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${color}18`,
      padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function AdminWorkspaceDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/admin-workspace/summary', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}; if(!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: A, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>⟳</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>Loading admin workspace for {company?.name}...</div>
    </div>
  )

  const kpis = data?.kpis || {}
  const activity = data?.today_activity || []
  const pendingApprovals = data?.pending_approvals || []

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#0f172a' }}>

      {/* Header */}
      <div style={{ background: G, borderRadius: 16, padding: '18px 22px', marginBottom: 20,
        boxShadow: '0 4px 20px rgba(3,105,161,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🗂️</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Admin Workspace</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>
              {company?.name} · Visitors, facilities, travel & general administrative ops
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 10, fontSize: 12, color: '#92400e', marginBottom: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
        <KPICard icon="👋" label="Visitors Today"    value={kpis.visitors_today}   color="#0369a1"/>
        <KPICard icon="🏢" label="Room Bookings"     value={kpis.room_bookings}    color="#7c3aed"/>
        <KPICard icon="🪪" label="Gate Pass Pending" value={kpis.gate_pass_pending} color="#f59e0b"/>
        <KPICard icon="✈️" label="Travel Requests"   value={kpis.travel_requests}  color="#0891b2"/>
        <KPICard icon="🔧" label="Facility Tickets"  value={kpis.facility_tickets}  color="#10b981"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Today's Activity */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12,
            fontWeight: 800, color: '#0f172a' }}>
            📋 Today's Activity
          </div>
          {activity.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
              No activity logged today for {company?.name}
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {activity.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 16px', borderBottom: i < activity.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>
                    {a.type === 'visitor' ? '👋' : a.type === 'room' ? '🏢' : a.type === 'gatepass' ? '🪪' : a.type === 'travel' ? '✈️' : '🔧'}
                  </span>
                  <div>
                    <div style={{ fontSize: 11, color: '#334155', fontWeight: 500 }}>{a.item || a.description}</div>
                    {a.time && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{a.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12,
            fontWeight: 800, color: '#0f172a' }}>
            ⏳ Pending Approvals
          </div>
          {pendingApprovals.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
              ✅ No pending approvals
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {pendingApprovals.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 16px', borderBottom: i < pendingApprovals.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{a.type || a.category}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8' }}>{a.requester} · {a.date}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b',
                    background: '#fffbeb', padding: '2px 8px', borderRadius: 20, border: '1px solid #fde68a' }}>
                    ⏳ Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>🔗 Quick Links</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['Visitor Management',    'visitor-management'],
            ['Meeting Room Booking',  'meeting-room-booking'],
            ['Travel Management',     'travel-management'],
            ['Gate Pass',             'gate-pass'],
            ['Facility Management',   'facility-management'],
            ['Asset Requests',        'assets'],
            ['Notice Board',          'notice-board'],
          ].map(([label, id]) => (
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
