// FILE: src/components/dashboard/CustomerServiceDashboard.jsx
// eLogix HRMS — Customer Service / HR Helpdesk Dashboard
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// Removes TICKETS array (fake TKT-1042, TKT-1039), hardcoded KPI values (14, 4.2h, 96%, 4.6/5).
// API: GET /api/v1/helpdesk/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G = 'linear-gradient(135deg,#0891b2 0%,#0e7490 60%,#67e8f9 100%)'
const A = '#0891b2'

const STATUS_CFG = {
  open       : { c: '#dc2626', bg: '#fef2f2', label: 'Open'        },
  in_progress: { c: '#d97706', bg: '#fffbeb', label: 'In Progress' },
  resolved   : { c: '#10b981', bg: '#f0fdf4', label: 'Resolved'    },
  closed     : { c: '#64748b', bg: '#f8fafc', label: 'Closed'      },
}

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

export default function CustomerServiceDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('tickets')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/helpdesk/summary', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}; if(!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: A, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>⟳</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>Loading helpdesk for {company?.name}...</div>
    </div>
  )

  const kpis    = data?.kpis    || {}
  const tickets = data?.tickets  || []
  const sla     = data?.sla      || {}

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#0f172a' }}>

      {/* Header */}
      <div style={{ background: G, borderRadius: 16, padding: '18px 22px', marginBottom: 20,
        boxShadow: '0 4px 20px rgba(8,145,178,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎧</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Customer Service Workspace</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>
              {company?.name} · HR Helpdesk · Tickets, SLA tracking & employee query resolution
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

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
        <KPICard icon="🎫" label="Open Tickets"       value={kpis.open_tickets}       color="#dc2626"/>
        <KPICard icon="⏱️" label="Avg Resolution"     value={kpis.avg_resolution_time} color="#d97706"/>
        <KPICard icon="✅" label="SLA Compliance"     value={kpis.sla_compliance}      color="#10b981"/>
        <KPICard icon="😊" label="Satisfaction Score" value={kpis.satisfaction_score}  color="#7c3aed"/>
        <KPICard icon="📊" label="Resolved Today"     value={kpis.resolved_today}      color={A}/>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['tickets','🎫 Active Tickets'],['sla','📊 SLA Stats'],['categories','📂 Categories']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${tab===v?A:'#e2e8f0'}`,
              background: tab===v?A:'#fff', color: tab===v?'#fff':'#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Tickets tab */}
      {tab === 'tickets' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>
            🎫 Active Tickets ({tickets.length})
          </div>
          {tickets.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No active tickets for {company?.name}</div>
              <div style={{ fontSize: 11 }}>Tickets appear when employees submit HR queries</div>
            </div>
          ) : (
            tickets.map((t, i) => {
              const sc = STATUS_CFG[t.status] || STATUS_CFG.open
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderBottom: i < tickets.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>{t.id || t.ticket_id}</span>
                      <span style={{ background: sc.bg, color: sc.c, fontSize: 8, fontWeight: 700,
                        padding: '1px 8px', borderRadius: 20 }}>{sc.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{t.subject || t.title}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                      {t.requester || t.employee} · {t.category} · {t.created_at}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.sla_breached ? '#dc2626' : '#0891b2' }}>
                      {t.sla_remaining || t.sla}
                    </div>
                    {t.priority && (
                      <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>{t.priority} priority</div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* SLA tab */}
      {tab === 'sla' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>📊 SLA Performance</div>
          {Object.keys(sla).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 11 }}>
              No SLA data available yet for {company?.name}
            </div>
          ) : (
            Object.entries(sla).map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{String(v)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Categories tab */}
      {tab === 'categories' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>📂 Ticket Categories</div>
          {(data?.categories || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 11 }}>
              No category data available yet
            </div>
          ) : (
            (data.categories || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{c.name}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.count} tickets</span>
                  <span style={{ color: '#64748b' }}>{c.avg_resolution}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Links */}
      <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>🔗 Quick Links</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            ['HR Ticketing System', 'hr-ticketing'],
            ['Employee Queries',    'employee-queries'],
            ['Case Tracking',       'case-tracking'],
            ['SLA Configuration',   'sla-config'],
            ['Knowledge Base',      'knowledge-base'],
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
