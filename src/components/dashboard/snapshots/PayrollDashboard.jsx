// FILE: src/components/dashboard/PayrollDashboard.jsx
// eLogix HRMS — Payroll Dashboard (NEW PAGE)
// Dedicated payroll workspace for Payroll Officers.
// Covers: payroll cycle status, salary disbursement, SSF/tax,
// advance salary, final settlement, overtime costs, payslip management.
// API: GET /api/v1/payroll-dashboard/summary
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

function _getSession(){try{return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{}}catch{return{}}}
function _authH(){const s=_getSession();const token=localStorage.getItem('access_token')||s?.token||'';const slug=s?.company?.slug||'';return{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}}

const G = 'linear-gradient(135deg,#134e4a 0%,#0f766e 60%,#5eead4 100%)'
const A = '#0f766e'

const CYCLE_STATUS_CFG = {
  completed  : { c:'#15803d', bg:'#f0fdf4', label:'Completed'     },
  in_progress: { c:'#1d4ed8', bg:'#eff6ff', label:'In Progress'   },
  pending    : { c:'#b45309', bg:'#fffbeb', label:'Pending'        },
  not_started: { c:'#94a3b8', bg:'#f8fafc', label:'Not Started'   },
  locked     : { c:'#6d28d9', bg:'#f5f3ff', label:'Locked'        },
}

function KPI({ icon, label, value, color = A }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 14, textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,.04)', border: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: 24, marginBottom: 5 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function PBar({ value = 0, color = A }) {
  return (
    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, value))}%`,
        background: color, borderRadius: 6, transition: 'width .5s' }}/>
    </div>
  )
}

export default function PayrollDashboard() {
  const { navTo } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('cycle')

  const s = _getSession(); const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/payroll-dashboard/summary', { headers: _authH() })
      .then(r => {
        if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}
        if(!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const fmt = v => {
    if (v == null) return '—'
    if (typeof v === 'string') return v
    if (v >= 10000000) return `NPR ${(v/10000000).toFixed(1)}Cr`
    if (v >= 100000)   return `NPR ${(v/100000).toFixed(1)}L`
    if (v >= 1000)     return `NPR ${(v/1000).toFixed(0)}K`
    return `NPR ${v}`
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: A, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>⟳</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>Loading payroll dashboard for {company?.name}...</div>
    </div>
  )

  const kpis    = data?.kpis           || {}
  const cycle   = data?.payroll_cycle   || []
  const depts   = data?.dept_payroll    || []
  const ssf     = data?.ssf_tax         || {}
  const advances= data?.advances        || []
  const otCost  = data?.overtime_cost   || []
  const payslips= data?.payslip_summary || {}
  const alerts  = data?.payroll_alerts  || []

  const TABS = [
    ['cycle',    '💳 Payroll Cycle'],
    ['dept',     '🏢 Dept Payroll'],
    ['ssf',      '🛡️ SSF & Tax'],
    ['advances',  '💸 Advances'],
    ['overtime', '⏱️ Overtime'],
    ['alerts',   '⚠️ Alerts'],
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#0f172a' }}>

      {/* Header */}
      <div style={{ background: G, borderRadius: 16, padding: '18px 22px', marginBottom: 20,
        boxShadow: '0 4px 20px rgba(15,118,110,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>💰</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Payroll Dashboard</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>
                  {company?.name} · Payroll, SSF, Tax, Advances & Settlement
                </div>
              </div>
            </div>
          </div>
          {kpis.cycle_name && (
            <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 10, padding: '6px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)' }}>Current Cycle</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{kpis.cycle_name}</div>
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ padding: '10px 16px', background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: 10, fontSize: 12, color: '#92400e', marginBottom: 14 }}>⚠️ {error}</div>}

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12, marginBottom: 20 }}>
        <KPI icon="👥" label="Employees in Payroll" value={kpis.employee_count}         color="#0f766e"/>
        <KPI icon="💵" label="Gross Payroll"         value={fmt(kpis.gross_payroll)}     color="#0369a1"/>
        <KPI icon="🏦" label="Net Disbursable"        value={fmt(kpis.net_disbursable)}   color="#7c3aed"/>
        <KPI icon="🛡️" label="SSF / PF"              value={fmt(kpis.ssf_pf_total)}      color="#d97706"/>
        <KPI icon="📊" label="Tax Withheld"           value={fmt(kpis.tax_withheld)}      color="#dc2626"/>
        <KPI icon="⏱️" label="OT Cost (MTD)"          value={fmt(kpis.overtime_cost_mtd)} color="#c2410c"/>
      </div>

      {/* Nepal Labour Act banner */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
        padding: '10px 16px', marginBottom: 14, fontSize: 11, color: '#14532d', display: 'flex', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚖️</span>
        <div><strong>Nepal Labour Act 2074:</strong> SSF 20% (employer) + 11% (employee). PIT rates: 1% up to NPR 500K, 10% up to 700K, 20% up to 2M, 30% above. Gratuity: 8.33% of basic salary. 13th month mandatory.</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ flex: 1, minWidth: 80, padding: '7px 8px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: tab === v ? 700 : 400,
              background: tab === v ? '#fff' : 'transparent',
              color: tab === v ? '#0f172a' : '#64748b',
              boxShadow: tab === v ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Payroll Cycle Tab ── */}
      {tab === 'cycle' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>💳 Payroll Cycle Pipeline</div>
          {cycle.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No active payroll cycle for {company?.name}</div>
              <div style={{ fontSize: 11, marginTop: 6 }}>Start a cycle from Payroll Processing</div>
            </div>
          ) : (
            <>
              {cycle.map((s, i) => {
                const cfg = CYCLE_STATUS_CFG[s.status] || CYCLE_STATUS_CFG.not_started
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '12px 16px', borderBottom: i < cycle.length - 1 ? '1px solid #f8fafc' : 'none', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label || s.stage}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.detail || s.description}</div>
                      {s.employee_count && <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>👥 {s.employee_count} employees</div>}
                    </div>
                    <span style={{ background: cfg.bg, color: cfg.c, fontSize: 9, fontWeight: 700,
                      padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>{cfg.label}</span>
                  </div>
                )
              })}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => navTo('automated-payroll')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: A, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Open Payroll Processing →</button>
                <button onClick={() => navTo('payroll-approval')} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${A}`, background: '#fff', color: A, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Payroll Approval</button>
                <button onClick={() => navTo('bank-transfer-file')} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>Bank Transfer File</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Dept Payroll Tab ── */}
      {tab === 'dept' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>🏢 Department Payroll Breakdown</div>
          {depts.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>No department payroll data yet</div>
          ) : (
            <div style={{ padding: '12px 16px' }}>
              {depts.map((d, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{d.dept || d.department}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 800, color: A }}>{fmt(d.gross || d.amount)}</span>
                      <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 8 }}>{d.employee_count} employees</span>
                    </div>
                  </div>
                  <PBar value={d.pct || 0}/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SSF & Tax Tab ── */}
      {tab === 'ssf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 14 }}>🛡️ SSF & Provident Fund</div>
            {Object.keys(ssf).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 11 }}>No SSF data yet</div>
            ) : (
              Object.entries(ssf).map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                  borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                  <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{typeof v === 'number' ? fmt(v) : String(v)}</span>
                </div>
              ))
            )}
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', fontSize: 11, color: '#14532d' }}>
            ⚖️ <strong>Nepal SSF:</strong> Employer 20% + Employee 11% of basic salary. Filing due by 15th of following month via SSF portal. Grace period 3 months for new registrations.
          </div>
        </div>
      )}

      {/* ── Advances Tab ── */}
      {tab === 'advances' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>💸 Advance Salary & Loans</div>
          {advances.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>No advance salary or loans this cycle</div>
          ) : (
            advances.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{a.employee || a.name}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>{a.type || 'Advance'} · {a.dept || ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>{fmt(a.amount)}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>{a.remaining_installments || ''}{a.remaining_installments ? ' installments left' : ''}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Overtime Tab ── */}
      {tab === 'overtime' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: 800 }}>⏱️ Overtime Cost by Department</div>
          {otCost.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>No overtime cost data yet</div>
          ) : (
            <div style={{ padding: '12px 16px' }}>
              {otCost.map((d, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{d.dept || d.department}</span>
                    <div>
                      <span style={{ fontWeight: 800, color: '#c2410c' }}>{fmt(d.ot_cost)}</span>
                      <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 8 }}>{d.ot_hours}h</span>
                    </div>
                  </div>
                  <PBar value={d.pct || 0} color="#c2410c"/>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 10, color: '#64748b' }}>
                ⚖️ Nepal LA 2074: OT capped at 4h/day, 24h/week, paid at 150% of basic rate
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Alerts Tab ── */}
      {tab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', background: '#fff', borderRadius: 14,
              border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>No payroll alerts for {company?.name}</div>
            </div>
          ) : (
            alerts.map((a, i) => (
              <div key={i} style={{ padding: '12px 16px', background: '#fff', borderRadius: 12,
                border: `1px solid ${a.severity === 'high' ? '#fecaca' : '#fde68a'}`,
                borderLeft: `4px solid ${a.severity === 'high' ? '#ef4444' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon || (a.severity === 'high' ? '🔴' : '🟡')}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{a.title || a.type}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{a.message || a.detail}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Payslip summary */}
      {Object.keys(payslips).length > 0 && (
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '14px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>📑 Payslip Generation Status</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(payslips).map(([k, v], i) => (
              <div key={i} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 10, padding: '10px 16px' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: A }}>{String(v)}</div>
                <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>🔗 Quick Links</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Automated Payroll','automated-payroll'],['Payroll Approval','payroll-approval'],
            ['Salary Disbursement','salary-disbursement'],['Bank Transfer File','bank-transfer-file'],
            ['SSF Filing','ssf'],['Tax Management','tax-management'],
            ['Advance Salary','advance-salary'],['Final Settlement','final-settlement'],
            ['Payslip','payslip'],['Compensation Analytics','compensation-analytics']
          ].map(([lbl, id]) => (
            <button key={id} onClick={() => navTo(id)}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#f8fafc', color: '#374151', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
