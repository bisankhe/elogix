// FILE: src/components/dashboard/snapshots/CompanyProfilePage.jsx
// eLogix HRMS — Company Profile (List of registered & approved companies)
// COMPLETE REWRITE — Fixes "Pill is not defined" crash.
// Removes Pill component reference, bad token keys (elogix_token/elogix_auth).
// This page lists companies registered & approved by eLogix SuperAdmin.
// API: GET /api/v1/companies/me  (tenant-scoped — returns this tenant's companies)
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch { return {} }
}
function _authH() {
  const s = _getSession()
  const token = localStorage.getItem('access_token') || s?.token || ''
  const slug  = s?.company?.slug || ''
  return { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug, 'Content-Type': 'application/json' }
}

const A = '#3b82f6'
const G = 'linear-gradient(135deg,#1e3a5f 0%,#3b82f6 60%,#93c5fd 100%)'

const STATUS_CFG = {
  active     : { c:'#10b981', bg:'#f0fdf4', label:'Active'        },
  inactive   : { c:'#94a3b8', bg:'#f8fafc', label:'Inactive'      },
  suspended  : { c:'#ef4444', bg:'#fef2f2', label:'Suspended'     },
  trial      : { c:'#f59e0b', bg:'#fffbeb', label:'Trial'         },
  pending    : { c:'#8b5cf6', bg:'#f5f3ff', label:'Pending'       },
}
const PLAN_CFG = {
  trial   : { c:'#64748b', label:'Trial'    },
  starter : { c:'#0891b2', label:'Starter'  },
  growth  : { c:'#7c3aed', label:'Growth'   },
  pro     : { c:'#0369a1', label:'Pro'      },
  enterprise:{ c:'#0f172a', label:'Enterprise' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.active
  return (
    <span style={{ background: cfg.bg, color: cfg.c, fontSize: 9, fontWeight: 700,
      padding: '2px 10px', borderRadius: 20, border: `1px solid ${cfg.c}30` }}>
      {cfg.label}
    </span>
  )
}

function PlanBadge({ plan }) {
  const cfg = PLAN_CFG[plan?.toLowerCase()] || PLAN_CFG.trial
  return (
    <span style={{ background: `${cfg.c}12`, color: cfg.c, fontSize: 9, fontWeight: 700,
      padding: '2px 10px', borderRadius: 20, border: `1px solid ${cfg.c}25` }}>
      {cfg.label}
    </span>
  )
}

function CountBadge({ count, color = A }) {
  return (
    <span style={{ background: `${color}12`, color, fontSize: 10, fontWeight: 700,
      padding: '2px 12px', borderRadius: 20, border: `1px solid ${color}25` }}>
      {count}
    </span>
  )
}

function ProgressBar({ value, color = '#10b981' }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0))
  return (
    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${v}%`, background: color,
        borderRadius: 3, transition: 'width .5s' }}/>
    </div>
  )
}

function CompanyCard({ company, onView }) {
  const [hov, setHov] = useState(false)
  const alerts = company.doc_alerts || []
  const critAlerts = alerts.filter(a => a.urgency === 'critical' || a.urgency === 'high')
  return (
    <div
      onClick={() => onView(company)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${hov ? A : '#e2e8f0'}`,
        overflow: 'hidden', cursor: 'pointer', transition: 'all .15s',
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,.1)' : '0 2px 8px rgba(0,0,0,.05)',
        transform: hov ? 'translateY(-2px)' : '' }}>

      {/* Header bar */}
      <div style={{ background: G, padding: '14px 18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -16, top: -16, width: 80, height: 80,
          borderRadius: '50%', background: 'rgba(255,255,255,.08)' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
              {company.name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.75)' }}>
              {company.slug} · {company.country || 'Nepal'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <StatusBadge status={company.status || 'active'}/>
            {company.is_primary && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24' }}>⭐ Primary</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <PlanBadge plan={company.plan}/>
          {company.business_type && (
            <span style={{ background: '#f8fafc', color: '#64748b', fontSize: 9, fontWeight: 600,
              padding: '2px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
              {company.business_type.replace(/_/g,' ')}
            </span>
          )}
          {company.industry && (
            <span style={{ background: '#f8fafc', color: '#64748b', fontSize: 9,
              padding: '2px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
              {company.industry}
            </span>
          )}
        </div>

        {/* Key stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Employees', value: company.employee_count ?? company.total_employees ?? '—', color: '#3b82f6' },
            { label: 'Branches',  value: company.branch_count ?? company.branches ?? '—',   color: '#10b981' },
            { label: 'Modules',   value: company.module_count ?? company.modules?.length ?? '—', color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: '8px 4px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 8, color: '#94a3b8' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Doc compliance */}
        {company.doc_compliance_pct != null && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4, color: '#64748b' }}>
              <span>Document Compliance</span>
              <span style={{ fontWeight: 700, color: company.doc_compliance_pct >= 80 ? '#10b981' : '#f59e0b' }}>
                {company.doc_compliance_pct}%
              </span>
            </div>
            <ProgressBar
              value={company.doc_compliance_pct}
              color={company.doc_compliance_pct === 100 ? '#10b981' : company.doc_compliance_pct >= 70 ? '#f59e0b' : '#ef4444'}
            />
          </div>
        )}

        {/* Alerts */}
        {critAlerts.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '6px 10px', fontSize: 9, color: '#dc2626', fontWeight: 600 }}>
            ⚠️ {critAlerts.length} document alert{critAlerts.length > 1 ? 's' : ''} need attention
          </div>
        )}

        {/* Footer info */}
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8' }}>
          <span>{company.admin_email || company.email || '—'}</span>
          <span>{company.registered_date ? new Date(company.registered_date).toLocaleDateString() : '—'}</span>
        </div>
      </div>
    </div>
  )
}

function CompanyDetailModal({ company, onClose }) {
  if (!company) return null
  const alerts = company.doc_alerts || []
  const URGENCY = {
    critical: { label: 'Critical', icon: '🔴', color: '#dc2626' },
    high:     { label: 'High',     icon: '🟠', color: '#ea580c' },
    medium:   { label: 'Medium',   icon: '🟡', color: '#d97706' },
    low:      { label: 'Low',      icon: '🟢', color: '#059669' },
  }
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 4000 }}/>
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420,
        background: '#fff', zIndex: 4001, boxShadow: '-20px 0 60px rgba(0,0,0,.15)', overflow: 'auto' }}>
        <div style={{ background: G, padding: '20px 24px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{company.name}</div>
              <div style={{ fontSize: 10, opacity: .75, marginTop: 2 }}>
                {company.slug} · {company.country || 'Nepal'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none',
              borderRadius: 8, width: 30, height: 30, color: '#fff', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <StatusBadge status={company.status || 'active'}/>
            <PlanBadge plan={company.plan}/>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {[
            ['Business Type',  company.business_type?.replace(/_/g, ' ')],
            ['Industry',       company.industry],
            ['Country',        company.country],
            ['Currency',       company.currency],
            ['Admin Email',    company.admin_email || company.email],
            ['Phone',          company.phone],
            ['Address',        company.address],
            ['Employees',      company.employee_count ?? company.total_employees],
            ['Branches',       company.branch_count ?? company.branches],
            ['Active Since',   company.registered_date ? new Date(company.registered_date).toLocaleDateString() : null],
            ['Plan Expires',   company.plan_expiry ? new Date(company.plan_expiry).toLocaleDateString() : null],
          ].filter(([, v]) => v != null && v !== '').map(([l, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
              <span style={{ color: '#64748b', minWidth: 110 }}>{l}</span>
              <span style={{ fontWeight: 700, color: '#0f172a', textAlign: 'right', maxWidth: '55%', wordBreak: 'break-word' }}>{String(v)}</span>
            </div>
          ))}

          {company.modules?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Enabled Modules</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {company.modules.map((m, i) => (
                  <span key={i} style={{ background: '#f0f9ff', color: '#0369a1', fontSize: 9,
                    fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: '1px solid #bae6fd' }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {alerts.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>
                🚨 Document Alerts
              </div>
              {alerts.map((alert, i) => {
                const cfg = URGENCY[alert.urgency] || URGENCY.medium
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px',
                    borderRadius: 8, background: '#fef2f2', marginBottom: 6 }}>
                    <span style={{ flexShrink: 0 }}>{cfg.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{alert.doc_name}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{alert.message}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {company.doc_compliance_pct != null && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Document Compliance</span>
                <span style={{ fontWeight: 800, color: company.doc_compliance_pct >= 80 ? '#10b981' : '#f59e0b' }}>
                  {company.doc_compliance_pct}%
                </span>
              </div>
              <ProgressBar value={company.doc_compliance_pct}
                color={company.doc_compliance_pct >= 80 ? '#10b981' : '#f59e0b'}/>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function CompanyProfilePage() {
  const [companies,        setCompanies]        = useState([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)
  const [search,           setSearch]           = useState('')
  const [statusFilter,     setStatusFilter]     = useState('all')
  const [selectedCompany,  setSelectedCompany]  = useState(null)
  const [msg,              setMsg]              = useState('')

  const s       = _getSession()
  const company = s?.company || {}

  const toast = (m, d = 3500) => { setMsg(m); setTimeout(() => setMsg(''), d) }

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }

    fetch('/api/v1/companies/me', { headers: _authH() })
      .then(r => {
        if (r.status === 401) {
          window.dispatchEvent(new CustomEvent('elogix:session-expired'))
          throw new Error('Session expired — please log in again')
        }
        if (!r.ok) throw new Error(`Server error ${r.status}`)
        return r.json()
      })
      .then(d => {
        // API may return single company or array of companies
        const raw = d.data || d.company || d
        const list = Array.isArray(raw) ? raw : [raw]
        setCompanies(list.filter(Boolean))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const allAlerts = companies.flatMap(c => (c.doc_alerts || []).filter(a => a.urgency === 'critical' || a.urgency === 'high'))

  const filtered = companies.filter(c => {
    if (statusFilter !== 'all' && (c.status || 'active') !== statusFilter) return false
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase()) &&
        !c.slug?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: A, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>⟳</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Loading company profile...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.7}}`}</style>

      {msg && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10,
          padding: '10px 18px', fontSize: 12, color: '#0c4a6e',
          boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxWidth: 320 }}>
          {msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Company Profile</h2>
            <CountBadge count={`${companies.length} ${companies.length === 1 ? 'Company' : 'Companies'}`} color={A}/>
            {allAlerts.length > 0 && (
              <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 20, border: '1px solid #fecaca',
                animation: 'pulse 2s infinite' }}>
                ⚠️ {allAlerts.length} Doc Alert{allAlerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '5px 0 0' }}>
            Companies registered &amp; approved by eLogix SuperAdmin · Document compliance tracking
          </p>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {allAlerts.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#dc2626', marginBottom: 10 }}>
            🚨 Critical Document Alerts — Action Required
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allAlerts.slice(0, 5).map((alert, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, alignItems: 'center' }}>
                <span>🔴</span>
                <strong>{alert.company_name || ''}</strong>
                <span style={{ color: '#64748b' }}>— {alert.doc_name}: {alert.message}</span>
              </div>
            ))}
            {allAlerts.length > 5 && (
              <div style={{ fontSize: 10, color: '#94a3b8' }}>+{allAlerts.length - 5} more alerts</div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 10, fontSize: 12, color: '#92400e', marginBottom: 14 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search companies..."
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 12, outline: 'none', background: '#fff' }}/>
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
          {['all', 'active', 'trial', 'suspended', 'inactive'].map(st => (
            <button key={st} onClick={() => setStatusFilter(st)}
              style={{ padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 10,
                fontWeight: statusFilter === st ? 700 : 400, cursor: 'pointer',
                background: statusFilter === st ? '#fff' : 'transparent',
                color: statusFilter === st ? A : '#64748b',
                boxShadow: statusFilter === st ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
              {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {companies.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16,
          border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
            No companies found
          </div>
          <div style={{ fontSize: 12 }}>
            Companies appear here after being registered and approved by eLogix SuperAdmin
          </div>
        </div>
      )}

      {/* Company cards grid */}
      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {filtered.map(co => (
            <CompanyCard key={co.id || co.slug} company={co} onView={setSelectedCompany}/>
          ))}
        </div>
      )}

      {/* No results */}
      {filtered.length === 0 && companies.length > 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div>No companies match the current filter</div>
        </div>
      )}

      {/* Detail drawer */}
      <CompanyDetailModal company={selectedCompany} onClose={() => setSelectedCompany(null)}/>
    </div>
  )
}
