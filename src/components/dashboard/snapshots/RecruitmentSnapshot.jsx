// FILE: src/components/dashboard/snapshots/RecruitmentSnapshot.jsx
// eLogix HRMS — Recruitment Snapshot — Real tenant data
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'

// ── Helpers (defined ONCE) ────────────────────────────────────
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

const G = 'linear-gradient(135deg,#1e1b4b 0%,#e11d48 60%,#fb7185 100%)'

// ── Main component ────────────────────────────────────────────
export default function RecruitmentSnapshot() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [activeTab,  setActiveTab]  = useState('overview')
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError,   setApiError]   = useState(null)

  const s       = _getSession()
  const company = s?.company || {}
  const cc      = _getCurrency()

  function fmt(val) {
    return `${cc?.symbol || 'रु'} ${(val || 0).toLocaleString('en-IN')}`
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); setApiLoading(false); return }
    fetch('/api/v1/recruitment/snapshot', {
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
      .then(d => { setData(d.data || d); setApiLoading(false) })
      .catch(err => { setError(err.message); setApiError(err.message); setApiLoading(false) })
      .finally(() => setLoading(false))
  }, [])

  const kpis     = data?.kpis     || {}
  const pipeline = data?.pipeline || []
  const recent   = data?.recent_hires || []
  const TABS     = ['overview', 'pipeline', 'recent']

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(225,29,72,.25)' }}>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🎯 Recruitment Snapshot</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
          {company?.name || 'Your Company'} · Real-time recruitment data
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'#e11d48', fontSize:13, fontWeight:600 }}>⟳ Loading recruitment data...</div>}
      {error && !loading && <div style={{ padding:'12px 20px', background:'#fef2f2', borderRadius:10, color:'#dc2626', fontSize:13, fontWeight:600, marginBottom:16 }}>⚠️ {error}</div>}
      {!loading && !error && !data && (
        <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#475569' }}>No recruitment data yet</div>
          <div style={{ fontSize:12, marginTop:6 }}>Data appears once job postings and candidates are added</div>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14, marginBottom:20 }}>
            {[
              { label:'Open Positions',   value: kpis.open_positions,     icon:'📋', color:'#e11d48' },
              { label:'Applications',      value: kpis.total_applications, icon:'📄', color:'#7c3aed' },
              { label:'In Interview',      value: kpis.in_interview,       icon:'🎤', color:'#0284c7' },
              { label:'Offers Made',       value: kpis.offers_made,        icon:'📨', color:'#d97706' },
              { label:'Hired This Month',  value: kpis.hired_this_month,   icon:'✅', color:'#059669' },
              { label:'Avg Days to Hire',  value: kpis.avg_days_to_hire ? `${kpis.avg_days_to_hire}d` : '–', icon:'⏱️', color:'#0891b2' },
            ].map((k, i) => (
              <div key={i} style={{ background:'#fff', borderRadius:13, padding:18,
                border:`1.5px solid ${k.color}20`, borderTop:`4px solid ${k.color}`,
                boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize:22, marginBottom:8 }}>{k.icon}</div>
                <div style={{ fontSize:24, fontWeight:900, color:k.color }}>{k.value ?? '–'}</div>
                <div style={{ fontSize:11, color:'#64748b', marginTop:4, fontWeight:600 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding:'7px 18px', borderRadius:20, border:'none', cursor:'pointer',
                  background: activeTab===tab ? '#e11d48' : '#f1f5f9',
                  color: activeTab===tab ? '#fff' : '#64748b',
                  fontSize:12, fontWeight:700 }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Pipeline */}
          {activeTab === 'pipeline' && pipeline.length > 0 && (
            <div style={{ background:'#fff', borderRadius:13, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontWeight:700, marginBottom:14, color:'#1e293b', fontSize:15 }}>Recruitment Pipeline</div>
              {pipeline.map((stage, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  padding:'10px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                  <span style={{ color:'#475569', fontWeight:600 }}>{stage.stage}</span>
                  <div style={{ display:'flex', gap:16 }}>
                    <span style={{ color:'#0284c7', fontWeight:700 }}>{stage.count} candidates</span>
                    {stage.conversion_rate && <span style={{ color:'#059669', fontSize:11 }}>{stage.conversion_rate}% conv.</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Hires */}
          {activeTab === 'recent' && recent.length > 0 && (
            <div style={{ background:'#fff', borderRadius:13, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontWeight:700, marginBottom:14, color:'#1e293b', fontSize:15 }}>Recent Hires</div>
              {recent.map((h, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  padding:'10px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                  <div>
                    <div style={{ fontWeight:700, color:'#1e293b' }}>{h.name}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{h.designation} · {h.department}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'#059669', fontWeight:600 }}>{h.joining_date}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{h.days_to_hire}d to hire</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Overview */}
          {activeTab === 'overview' && (
            <div style={{ background:'#fff', borderRadius:13, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontWeight:700, marginBottom:14, color:'#1e293b', fontSize:15 }}>Overview</div>
              <div style={{ fontSize:13, color:'#475569', lineHeight:2 }}>
                <div>📋 Open Positions: <strong>{kpis.open_positions ?? '–'}</strong></div>
                <div>📄 Total Applications: <strong>{kpis.total_applications ?? '–'}</strong></div>
                <div>✅ Hired This Month: <strong>{kpis.hired_this_month ?? '–'}</strong></div>
                <div>⏱️ Avg Days to Hire: <strong>{kpis.avg_days_to_hire ? kpis.avg_days_to_hire + ' days' : '–'}</strong></div>
                <div>💰 Cost per Hire: <strong>{kpis.cost_per_hire ? fmt(kpis.cost_per_hire) : '–'}</strong></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
