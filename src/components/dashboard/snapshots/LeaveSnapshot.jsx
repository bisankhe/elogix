// FILE: src/components/dashboard/snapshots/LeaveSnapshot.jsx
// eLogix HRMS — Leave Snapshot — Real tenant data
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

const G = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const STATUS_C = { approved:'#059669', pending:'#f59e0b', rejected:'#dc2626', cancelled:'#94a3b8' }
const STATUS_BG = { approved:'#f0fdf4', pending:'#fffbeb', rejected:'#fef2f2', cancelled:'#f8fafc' }

export default function LeaveSnapshot() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('summary')

  const s       = _getSession()
  const company = s?.company || {}
  const cc      = _getCurrency()

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/leave/snapshot', {
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

  const kpis     = data?.kpis     || {}
  const requests = data?.requests || []
  const balance  = data?.balance  || []
  const byType   = data?.by_type  || []
  const TABS     = ['summary', 'requests', 'balance']

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(124,58,237,.25)' }}>
        <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🌴 Leave Snapshot</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
          {company?.name || 'Your Company'} · Real-time leave data
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:60, color:'#7c3aed', fontSize:13, fontWeight:600 }}>⟳ Loading leave data...</div>}
      {error && !loading && <div style={{ padding:'12px 20px', background:'#fef2f2', borderRadius:10, color:'#dc2626', fontSize:13, fontWeight:600, marginBottom:16 }}>⚠️ {error}</div>}
      {!loading && !error && !data && (
        <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🌴</div>
          <div style={{ fontSize:14, fontWeight:700 }}>No leave data yet for {company?.name}</div>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* KPI cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14, marginBottom:20 }}>
            {[
              { label:'Total Requests',  value: kpis.total,           icon:'📋', color:'#7c3aed' },
              { label:'Approved',         value: kpis.approved,        icon:'✅', color:'#059669' },
              { label:'Pending',          value: kpis.pending,         icon:'⏳', color:'#f59e0b' },
              { label:'On Leave Today',   value: kpis.on_leave_today,  icon:'🌴', color:'#0284c7' },
              { label:'Rejected',         value: kpis.rejected,        icon:'❌', color:'#dc2626' },
              { label:'Avg Days',         value: kpis.avg_days ? `${kpis.avg_days}d` : '–', icon:'📅', color:'#0891b2' },
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
                  background: activeTab===tab ? '#7c3aed' : '#f1f5f9',
                  color: activeTab===tab ? '#fff' : '#64748b',
                  fontSize:12, fontWeight:700 }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Summary */}
          {activeTab === 'summary' && byType.length > 0 && (
            <div style={{ background:'#fff', borderRadius:13, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontWeight:700, marginBottom:14, color:'#1e293b', fontSize:15 }}>By Leave Type</div>
              {byType.map((t, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  padding:'10px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                  <span style={{ color:'#475569', fontWeight:600 }}>{t.type}</span>
                  <span style={{ fontWeight:700, color:'#7c3aed' }}>{t.count} requests · {t.days} days</span>
                </div>
              ))}
            </div>
          )}

          {/* Requests */}
          {activeTab === 'requests' && (
            <div style={{ background:'#fff', borderRadius:13, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc' }}>
                  {['Employee','Type','From','To','Days','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {requests.length === 0 && <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>No requests</td></tr>}
                  {requests.map((r, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2?'#fafafa':'#fff' }}>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{r.employee_name}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{r.leave_type}</td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{r.from_date}</td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{r.to_date}</td>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700 }}>{r.days}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:9, fontWeight:700,
                          background:STATUS_BG[r.status]||'#f8fafc', color:STATUS_C[r.status]||'#64748b',
                          border:`1px solid ${STATUS_C[r.status]||'#e2e8f0'}30` }}>
                          {r.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Balance */}
          {activeTab === 'balance' && balance.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
              {balance.map((b, i) => (
                <div key={i} style={{ background:'#fff', borderRadius:13, padding:18,
                  border:'1.5px solid #e2e8f0', boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:8 }}>{b.type}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b' }}>
                    <span>Entitled: <strong style={{ color:'#0284c7' }}>{b.entitled}</strong></span>
                    <span>Used: <strong style={{ color:'#f59e0b' }}>{b.used}</strong></span>
                  </div>
                  <div style={{ marginTop:8, height:6, background:'#f1f5f9', borderRadius:3 }}>
                    <div style={{ height:6, borderRadius:3, background:'#7c3aed',
                      width:`${b.entitled ? Math.min((b.used/b.entitled)*100,100) : 0}%` }}/>
                  </div>
                  <div style={{ fontSize:11, color:'#7c3aed', fontWeight:700, marginTop:6 }}>{b.remaining || (b.entitled - b.used)} days remaining</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
