// FILE: src/components/dashboard/snapshots/AttendanceSnapshot.jsx
// eLogix HRMS — Attendance Snapshot — REAL tenant data only
// Replaces all hardcoded mock arrays with live API data
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ── Session helpers (ONE definition) ─────────────────────────
function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}

const STATUS_COLOR = {
  Present: '#16a34a', Late: '#f59e0b',
  WFH: '#3b82f6', Absent: '#ef4444', Field: '#0891b2',
}
const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#0ea5e9']
const G = 'linear-gradient(135deg,#1e1b4b 0%,#0891b2 60%,#38bdf8 100%)'

// ── Main component ────────────────────────────────────────────
export default function AttendanceSnapshot() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [view,    setView]    = useState('overview')
  const [search,  setSearch]  = useState('')

  const s       = _getSession()
  const company = s?.company || {}
  const navTo   = (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } }))

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/attendance/snapshot', {
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
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // ── Derived from real API data ────────────────────────────
  const kpis       = data?.kpis              || {}
  const monthly    = data?.monthly_trend     || []
  const today_dist = data?.today_distribution|| []
  const by_dept    = data?.by_dept           || []
  const weekly     = data?.weekly_trend      || []
  const live_feed  = data?.live_feed         || []

  const filteredFeed = search
    ? live_feed.filter(e =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.dept?.toLowerCase().includes(search.toLowerCase())
      )
    : live_feed

  // ── Loading / Error / Empty ───────────────────────────────
  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:'#0891b2' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>⟳</div>
      <div style={{ fontSize:13, fontWeight:600 }}>Loading attendance data for {company?.name}...</div>
    </div>
  )
  if (error) return (
    <div style={{ padding:'16px 20px', background:'#fef2f2', borderRadius:12,
      color:'#dc2626', fontSize:13, fontWeight:600, margin:20 }}>
      ⚠️ {error}
      <button onClick={() => window.location.reload()}
        style={{ marginLeft:12, color:'#0891b2', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>
        Retry
      </button>
    </div>
  )
  if (!data) return (
    <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
      <div style={{ fontSize:14, fontWeight:700, color:'#475569' }}>No attendance data yet for {company?.name}</div>
      <div style={{ fontSize:12, marginTop:6, color:'#94a3b8' }}>
        Data appears once employees clock in via biometric, GPS, or web
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>

      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(8,145,178,.25)',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>⏰ Attendance Snapshot</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
            {company?.name} · Real-time attendance analytics
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <span style={{ background:'#16a34a', color:'#fff', padding:'3px 10px',
            borderRadius:20, fontSize:9, fontWeight:800 }}>🟢 Live</span>
          <button onClick={() => navTo('live-attendance')}
            style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid rgba(255,255,255,.5)',
              background:'transparent', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
            📍 Mark Attendance
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'✅', label:'Present',     val: kpis.present,         color:'#16a34a' },
          { icon:'🌴', label:'On Leave',    val: kpis.on_leave,        color:'#f59e0b' },
          { icon:'❌', label:'Absent',      val: kpis.absent,          color:'#ef4444' },
          { icon:'🏠', label:'WFH',         val: kpis.wfh,             color:'#3b82f6' },
          { icon:'⏰', label:'Late',        val: kpis.late,            color:'#d97706' },
          { icon:'📊', label:'Rate',        val: kpis.attendance_rate ? `${kpis.attendance_rate}%` : '–', color:'#0891b2' },
        ].map((k, i) => (
          <div key={i} style={{ background:'#fff', borderRadius:14, padding:'14px 16px',
            border:`1.5px solid ${k.color}20`, borderTop:`4px solid ${k.color}`,
            boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:26, fontWeight:900, color:k.color, lineHeight:1 }}>{k.val ?? '–'}</div>
            <div style={{ fontSize:10, color:'#64748b', marginTop:4, fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['overview','📊 Overview'],['live','🔴 Live Feed'],['department','🏢 By Department']].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding:'7px 18px', borderRadius:20, border:'none', cursor:'pointer',
              background: view===v ? '#0891b2' : '#f1f5f9',
              color: view===v ? '#fff' : '#64748b',
              fontSize:12, fontWeight:700 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {view === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
          {/* Monthly trend */}
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Monthly Attendance Trend</div>
            {monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthly} margin={{ top:4, right:8, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="month" tick={{ fontSize:10 }}/>
                  <YAxis tick={{ fontSize:10 }}/>
                  <Tooltip/>
                  <Legend wrapperStyle={{ fontSize:10 }}/>
                  <Area type="monotone" dataKey="present" stroke="#16a34a" fill="#16a34a20" strokeWidth={2}/>
                  <Area type="monotone" dataKey="leave"   stroke="#f59e0b" fill="#f59e0b20" strokeWidth={2}/>
                  <Area type="monotone" dataKey="absent"  stroke="#ef4444" fill="#ef444420" strokeWidth={2}/>
                  <Area type="monotone" dataKey="wfh"     stroke="#3b82f6" fill="#3b82f620" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No monthly data yet</div>
            )}
          </div>

          {/* Today distribution pie */}
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Today's Distribution</div>
            {today_dist.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={today_dist} dataKey="value" cx="50%" cy="50%" outerRadius={65} label={false}>
                      {today_dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
                {today_dist.map((d, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between',
                    fontSize:11, padding:'4px 0', borderBottom:'1px solid #f8fafc' }}>
                    <span style={{ color:'#64748b' }}>
                      <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%',
                        background:COLORS[i%COLORS.length], marginRight:6 }}/>
                      {d.name}
                    </span>
                    <strong style={{ color:COLORS[i%COLORS.length] }}>{d.value}</strong>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No data today</div>
            )}
          </div>
        </div>
      )}

      {/* ── LIVE FEED ── */}
      {view === 'live' && (
        <div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee or department..."
            style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #e2e8f0',
              fontSize:12, outline:'none', marginBottom:14, width:'100%', maxWidth:320, boxSizing:'border-box' }}
          />
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Employee','Department','Check-In','Method','Status','OT'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10,
                    fontWeight:700, color:'#64748b', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filteredFeed.length === 0 && (
                  <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>
                    {live_feed.length === 0 ? 'No attendance logged today' : 'No results found'}
                  </td></tr>
                )}
                {filteredFeed.map((e, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2?'#fafafa':'#fff' }}>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{e.name}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{e.dept}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, fontFamily:'monospace' }}>{e.check_in || e.in || '--'}</td>
                    <td style={{ padding:'10px 14px', fontSize:11, color:'#475569' }}>{e.method || e.type || '--'}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ padding:'2px 10px', borderRadius:20, fontSize:9, fontWeight:700,
                        background:(STATUS_COLOR[e.status]||'#94a3b8')+'15',
                        color: STATUS_COLOR[e.status]||'#94a3b8' }}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:11, color:'#64748b' }}>{e.overtime || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BY DEPARTMENT ── */}
      {view === 'department' && (
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Attendance by Department</div>
            {by_dept.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={by_dept} margin={{ top:4, right:8, bottom:24, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="dept" tick={{ fontSize:10 }} angle={-35} textAnchor="end" interval={0}/>
                  <YAxis tick={{ fontSize:10 }}/>
                  <Tooltip/>
                  <Bar dataKey="present" fill="#0891b2" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No department data yet</div>
            )}
          </div>
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Dept','Present','Total','Rate'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {by_dept.length === 0 && (
                  <tr><td colSpan={4} style={{ padding:24, textAlign:'center', color:'#94a3b8' }}>No data</td></tr>
                )}
                {by_dept.map((d, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600 }}>{d.dept}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'#16a34a', fontWeight:700 }}>{d.present}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'#64748b' }}>{d.total}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, fontWeight:700, color:'#0891b2' }}>
                      {d.pct ?? (d.total ? ((d.present/d.total)*100).toFixed(1) : 0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
