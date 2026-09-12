// FILE: src/components/dashboard/FinanceDashboard.jsx
// eLogix HRMS — Finance Workspace Dashboard
// COMPLETE REWRITE — Zero mock data. Real tenant API.
// Removes STAGES (3 fake payroll pipeline items: "312 employees, batch 2 of 3"),
// COST_CENTERS (3 fake depts with hardcoded NPR amounts),
// ANOMALIES (fake "Sunil Magar" 42% pay increase),
// hardcoded StatCard values (NPR 18.4M, NPR 2.1M, NPR 340K).
// API: GET /api/v1/finance-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G = 'linear-gradient(135deg,#14532d 0%,#15803d 60%,#86efac 100%)'
const A = '#15803d'

function Bar({ value = 0, color = A, height = 8 }) {
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: color, borderRadius: height, transition: 'width .5s' }}/>
    </div>
  )
}

const STATUS_CFG = {
  completed   : { bg: '#f0fdf4', c: '#15803d', label: 'Completed'    },
  in_progress : { bg: '#eff6ff', c: '#1d4ed8', label: 'In Progress'  },
  pending     : { bg: '#fffbeb', c: '#b45309', label: 'Pending'      },
  not_started : { bg: '#f8fafc', c: '#94a3b8', label: 'Not Started'  },
}

export default function FinanceDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('overview')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/finance-dashboard/summary', { headers: _authH() })
      .then(r => { if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}; if(!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (v) => {
    if (v == null) return '—'
    if (v >= 10000000) return `NPR ${(v/10000000).toFixed(1)}Cr`
    if (v >= 100000)   return `NPR ${(v/100000).toFixed(1)}L`
    if (v >= 1000)     return `NPR ${(v/1000).toFixed(0)}K`
    return `NPR ${v}`
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: A, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>⟳</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>Loading finance workspace for {company?.name}...</div>
    </div>
  )

  const kpis         = data?.kpis          || {}
  const stages       = data?.payroll_stages || []
  const costCenters  = data?.cost_centers   || []
  const anomalies    = data?.ai_anomalies   || []
  const loans        = data?.loans          || {}
  const tax          = data?.tax_ssf        || {}

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#0f172a' }}>

      <div style={{ background: G, borderRadius: 16, padding: '18px 22px', marginBottom: 20,
        boxShadow: '0 4px 20px rgba(21,128,61,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>💰</span>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Finance Workspace</div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>
              {company?.name} · Payroll, disbursement, tax, cost center oversight
            </div>
          </div>
        </div>
      </div>

      {error && <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#92400e', marginBottom: 14 }}>⚠️ {error}</div>}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '💵', label: 'Payroll This Cycle', value: fmt(kpis.payroll_amount),     color: '#15803d' },
          { icon: '🏦', label: 'Disbursement Status', value: kpis.disbursement_status,   color: '#0369a1' },
          { icon: '📊', label: 'Tax & SSF Reserved',  value: fmt(kpis.tax_ssf_reserved),  color: '#7c3aed' },
          { icon: '⏱️', label: 'OT Cost (MTD)',        value: fmt(kpis.overtime_cost_mtd), color: '#f59e0b' },
          { icon: '🤖', label: 'AI Anomalies',         value: anomalies.length || kpis.ai_anomalies, color: '#ef4444' },
        ].map((k, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${k.color}18`,
            padding: 14, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            <div style={{ fontSize: 24, marginBottom: 5 }}>{k.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: k.color }}>{k.value ?? '—'}</div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['overview','💳 Payroll Pipeline'],['cost-centers','📐 Cost Centers'],['anomalies','🤖 AI Anomalies'],['loans','💸 Loans & Claims']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ flex: 1, minWidth: 100, padding: '7px 8px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 10, fontWeight: tab === v ? 700 : 400,
              background: tab === v ? '#fff' : 'transparent',
              color: tab === v ? A : '#94a3b8',
              boxShadow: tab === v ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Payroll Pipeline tab */}
      {tab === 'overview' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>📋 Payroll Pipeline Status</div>
          {stages.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💳</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No payroll cycle active for {company?.name}</div>
              <div style={{ fontSize: 11, marginTop: 6 }}>Start a payroll cycle from Payroll Processing</div>
            </div>
          ) : (
            <>
              {stages.map((s, i) => {
                const cfg = STATUS_CFG[s.status] || STATUS_CFG.not_started
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '12px 16px', borderBottom: i < stages.length - 1 ? '1px solid #f8fafc' : 'none', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.detail}</div>
                    </div>
                    <span style={{ background: cfg.bg, color: cfg.c, fontSize: 9, fontWeight: 700,
                      padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                  </div>
                )
              })}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => navTo('automated-payroll')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: A, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Open Payroll Processing</button>
                <button onClick={() => navTo('payroll-approval')} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${A}`, background: '#fff', color: A, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Payroll Approval</button>
                <button onClick={() => navTo('bank-transfer-file')} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>Bank Transfer File</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Cost Centers tab */}
      {tab === 'cost-centers' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 16 }}>📐 Cost Center: Budget vs Actual</div>
          {costCenters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📐</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No cost center data yet for {company?.name}</div>
            </div>
          ) : (
            costCenters.map((c, i) => {
              const pct = c.budget > 0 ? Math.round((c.actual / c.budget) * 100) : 0
              const color = pct > 100 ? '#ef4444' : pct > 90 ? '#f59e0b' : '#15803d'
              return (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                      {c.flag && <span style={{ fontSize: 9, color: '#f59e0b', marginLeft: 6 }}>⚠</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, color }}>{pct}%</span>
                      <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 8 }}>{fmt(c.actual)} / {fmt(c.budget)}</span>
                    </div>
                  </div>
                  <Bar value={pct} color={color}/>
                  {c.flag && <div style={{ fontSize: 9, color: '#b45309', marginTop: 4 }}>⚠️ {c.flag}</div>}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Anomalies tab */}
      {tab === 'anomalies' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>🤖 AI Payroll Anomaly Detection</div>
          {anomalies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No anomalies detected for {company?.name}</div>
            </div>
          ) : (
            anomalies.map((a, i) => (
              <div key={i} style={{ padding: '10px 14px', border: `1px solid ${a.severity === 'high' ? '#fecaca' : '#fed7aa'}`,
                borderRadius: 10, marginBottom: 8, borderLeft: `4px solid ${a.severity === 'high' ? '#ef4444' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{a.severity === 'high' ? '🔴' : '🟡'}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{a.type || a.title}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{a.detail || a.message}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Loans tab */}
      {tab === 'loans' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>💸 Loans & Reimbursements</div>
          {Object.keys(loans).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 11 }}>No loan/reimbursement data yet</div>
          ) : (
            Object.entries(loans).map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                <span style={{ fontWeight: 700 }}>{typeof v === 'number' ? fmt(v) : String(v)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Links */}
      <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>🔗 Quick Links</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Loan Management','loan-management'],['Reimbursement','reimbursement'],
            ['Expense Claims','expense-claims'],['Final Settlement','final-settlement'],
            ['Compensation Analytics','compensation-analytics'],['SSF Filing','ssf'],
            ['Tax Management','tax-management']].map(([label, id]) => (
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
