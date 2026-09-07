// FILE: src/components/dashboard/snapshots/PayrollSnapshot.jsx
// eLogix HRMS — Payroll Snapshot — Real tenant data
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _getCurrency() {
  const s    = _getSession()
  const code = s?.company?.currency || 'NPR'
  return { code, symbol: { NPR:'रु', USD:'$', INR:'₹', EUR:'€', GBP:'£' }[code] || code }
}

const G = 'linear-gradient(135deg,#1e3a5f 0%,#16a34a 60%,#4ade80 100%)'

export default function PayrollSnapshot() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const s       = _getSession()
  const company = s?.company || {}
  const cc      = _getCurrency()

  function fmt(val, compact = true) {
    const sym = cc?.symbol || 'रु'
    if (!val && val !== 0) return '–'
    if (compact && val >= 100000) return `${sym} ${(val/100000).toFixed(1)}L`
    if (compact && val >= 1000)   return `${sym} ${(val/1000).toFixed(0)}K`
    return `${sym} ${Number(val).toLocaleString('en-IN')}`
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/payroll/snapshot', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Slug': slug,
        'Content-Type' : 'application/json',
      }
    })
      .then(r => {
        if (r.status === 401) {
          window.dispatchEvent(new CustomEvent('elogix:session-expired'))
          throw new Error('Session expired')
        }
        if (!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => setData(d.data || d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const kpis    = data?.kpis    || {}
  const byDept  = data?.by_dept || []
  const records = data?.records || []
  const TABS    = ['overview', 'department', 'records']

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(22,163,74,.25)' }}>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>💰 Payroll Snapshot</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
          {company?.name || 'Your Company'} · {data?.pay_month || 'Current Month'}
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'#16a34a', fontSize:13, fontWeight:600 }}>⟳ Loading payroll data...</div>}
      {error && !loading && <div style={{ padding:'12px 20px', background:'#fef2f2', borderRadius:10, color:'#dc2626', fontSize:13, fontWeight:600, marginBottom:16 }}>⚠️ {error}</div>}
      {!loading && !error && !data && (
        <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💰</div>
          <div style={{ fontSize:14, fontWeight:700 }}>No payroll data yet for {company?.name}</div>
          <div style={{ fontSize:12, marginTop:6 }}>Run payroll to see snapshot data</div>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:20 }}>
            {[
              { label:'Gross Payroll',   value: fmt(kpis.total_gross),      icon:'💵', color:'#16a34a' },
              { label:'Net Payroll',     value: fmt(kpis.total_net),        icon:'💰', color:'#0284c7' },
              { label:'Total Deductions',value: fmt(kpis.total_deductions), icon:'📉', color:'#e11d48' },
              { label:'Employees Paid',  value: kpis.employees_paid,        icon:'👥', color:'#7c3aed' },
              { label:'PF/SSF',          value: fmt(kpis.pf_ssf),           icon:'🏦', color:'#d97706' },
              { label:'Avg Salary',      value: fmt(kpis.avg_salary),       icon:'📊', color:'#0891b2' },
            ].map((k, i) => (
              <div key={i} style={{ background:'#fff', borderRadius:13, padding:18,
                border:`1.5px solid ${k.color}20`, borderTop:`4px solid ${k.color}`,
                boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:22, marginBottom:8 }}>{k.icon}</div>
                <div style={{ fontSize:18, fontWeight:900, color:k.color }}>{k.value ?? '–'}</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:4, fontWeight:600 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding:'7px 18px', borderRadius:20, border:'none', cursor:'pointer',
                  background: activeTab===tab ? '#16a34a' : '#f1f5f9',
                  color: activeTab===tab ? '#fff' : '#64748b',
                  fontSize:12, fontWeight:700 }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* By Department */}
          {activeTab === 'department' && byDept.length > 0 && (
            <div style={{ background:'#fff', borderRadius:13, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc' }}>
                  {['Department','Employees','Gross','Net','Avg Salary'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {byDept.map((d, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2?'#fafafa':'#fff' }}>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{d.dept}</td>
                      <td style={{ padding:'10px 14px', fontSize:13 }}>{d.count}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#16a34a' }}>{fmt(d.gross)}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#0284c7' }}>{fmt(d.net)}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{fmt(d.avg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Records */}
          {activeTab === 'records' && records.length > 0 && (
            <div style={{ background:'#fff', borderRadius:13, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc' }}>
                  {['Employee','Department','Basic','Gross','Net','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {records.slice(0,20).map((r, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2?'#fafafa':'#fff' }}>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{r.name}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{r.dept}</td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{fmt(r.basic)}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#16a34a' }}>{fmt(r.gross)}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#0284c7' }}>{fmt(r.net)}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:9, fontWeight:700,
                          background: r.status==='paid'?'#f0fdf4':'#fffbeb',
                          color: r.status==='paid'?'#059669':'#d97706',
                          border:`1px solid ${r.status==='paid'?'#bbf7d0':'#fde68a'}` }}>
                          {(r.status||'draft').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Overview */}
          {activeTab === 'overview' && (
            <div style={{ background:'#fff', borderRadius:13, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontWeight:700, marginBottom:14, color:'#1e293b', fontSize:15 }}>Payroll Overview</div>
              <div style={{ fontSize:13, color:'#475569', lineHeight:2 }}>
                <div>💵 Total Gross: <strong style={{ color:'#16a34a' }}>{fmt(kpis.total_gross)}</strong></div>
                <div>💰 Total Net:   <strong style={{ color:'#0284c7' }}>{fmt(kpis.total_net)}</strong></div>
                <div>📉 Deductions:  <strong style={{ color:'#e11d48' }}>{fmt(kpis.total_deductions)}</strong></div>
                <div>🏦 PF/SSF:      <strong style={{ color:'#d97706' }}>{fmt(kpis.pf_ssf)}</strong></div>
                <div>👥 Employees:   <strong>{kpis.employees_paid}</strong></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
