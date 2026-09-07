// FILE: src/components/dashboard/snapshots/PerformanceSnapshot.jsx
// eLogix HRMS — Performance Snapshot
// COMPLETE REWRITE — Zero mock data. 100% real tenant API data.
// API: GET /api/v1/performance/snapshot
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from 'recharts'

// ── Session helper (ONE definition) ──────────────────────────
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

// ── Constants ─────────────────────────────────────────────────
const G   = 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 60%,#60a5fa 100%)'
const A   = '#1e40af'
const COLORS     = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#0891b2']
const STATUS_C   = { 'On Track':'#10b981', 'Achieved':'#059669', 'At Risk':'#f59e0b', 'Behind':'#ef4444' }
const STATUS_IC  = { 'On Track':'🟢', 'Achieved':'✅', 'At Risk':'🟡', 'Behind':'🔴' }

// ── Appraisal Gauge (uses real props) ─────────────────────────
function AppraisalGauge({ pct = 0, total = 0, completed = 0 }) {
  const circumference = 251.2
  return (
    <div style={{ textAlign:'center', padding:'12px 0' }}>
      <svg viewBox="0 0 100 100" width="120" height="120" style={{ display:'block', margin:'0 auto' }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke={A} strokeWidth="10"
          strokeDasharray={`${circumference * pct / 100} ${circumference}`}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition:'stroke-dasharray 1s ease' }}/>
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{pct || 0}%</text>
        <text x="50" y="58" textAnchor="middle" fontSize="8"  fill="#94a3b8">completed</text>
      </svg>
      <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
        {completed} / {total} reviews completed
      </div>
      <div style={{ fontSize:10, color:'#94a3b8' }}>
        Probation max: 6 months (Nepal Labour Act)
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function PerformanceSnapshot() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('overview')

  const s   = _getSession()
  const cc  = _getCurrency()
  const company = s?.company || {}

  function fmt(val) {
    const sym = cc?.symbol || 'रु'
    if (!val && val !== 0) return '–'
    if (val >= 10000000) return `${sym} ${(val/10000000).toFixed(1)}Cr`
    if (val >= 100000)   return `${sym} ${(val/100000).toFixed(1)}L`
    if (val >= 1000)     return `${sym} ${(val/1000).toFixed(0)}K`
    return `${sym} ${Number(val).toLocaleString('en-IN')}`
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/performance/snapshot', {
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

  // ── Derive from real API data ─────────────────────────────
  const kpis          = data?.kpis            || {}
  const okr_data      = data?.okr             || []
  const kpi_data      = data?.kpi_tracking    || []
  const rating_dist   = data?.rating_dist     || []
  const radar_data    = data?.competency      || []
  const perf_trend    = data?.trend           || []
  const pip_employees = data?.pip             || []
  const feedback_360  = data?.feedback_360    || []
  const dept_perf     = data?.by_dept         || []
  const ai_insights   = data?.ai_insights     || []

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:A }}>
      <div style={{ fontSize:36, marginBottom:12 }}>⟳</div>
      <div style={{ fontSize:13, fontWeight:600 }}>Loading performance data for {company?.name}...</div>
    </div>
  )
  if (error) return (
    <div style={{ padding:'16px 20px', background:'#fef2f2', borderRadius:12,
      color:'#dc2626', fontSize:13, fontWeight:600, margin:20 }}>
      ⚠️ {error} —
      <button onClick={() => window.location.reload()}
        style={{ marginLeft:8, color:A, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>
        Retry
      </button>
    </div>
  )
  if (!data) return (
    <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
      <div style={{ fontSize:14, fontWeight:700, color:'#475569' }}>No performance data yet for {company?.name}</div>
      <div style={{ fontSize:12, marginTop:6 }}>Set OKRs and run appraisals to see performance data here</div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>

      {/* ── Header ── */}
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(30,64,175,.25)',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🎯 Performance Snapshot</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
            {company?.name} · OKR, KPI, 360° Feedback & Appraisals
          </div>
        </div>
        <span style={{ background:'rgba(255,255,255,.2)', color:'#fff',
          padding:'4px 12px', borderRadius:20, fontSize:10, fontWeight:700 }}>
          {kpis.period || 'Current Period'}
        </span>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'📊', label:'Avg Score',         val: kpis.avg_score ? `${kpis.avg_score}%` : '–',         color:A         },
          { icon:'⭐', label:'Top Performers',     val: kpis.top_performers,                                   color:'#10b981' },
          { icon:'⚠️', label:'On PIP',             val: kpis.on_pip,                                           color:'#ef4444' },
          { icon:'✅', label:'Appraisals Done',    val: kpis.appraisals_completed,                             color:'#0891b2' },
          { icon:'🎯', label:'OKR On Track',       val: kpis.okr_on_track ? `${kpis.okr_on_track}%` : '–',   color:'#059669' },
          { icon:'📋', label:'Pending Reviews',    val: kpis.pending_reviews,                                  color:'#d97706' },
        ].map((k, i) => (
          <div key={i} style={{ background:'#fff', borderRadius:14, padding:'14px 16px',
            border:`1.5px solid ${k.color}20`, borderTop:`4px solid ${k.color}`,
            boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:k.color, lineHeight:1 }}>{k.val ?? '–'}</div>
            <div style={{ fontSize:10, color:'#64748b', marginTop:4, fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {[
          ['overview','📊 Overview'],['okr','🎯 OKR'],['kpi','📈 KPIs'],
          ['rating','⭐ Ratings'],['360','🔄 360°'],['pip','⚠️ PIP'],
          ['dept','🏢 By Dept'],['ai','🤖 AI Insights'],
        ].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer',
              background:tab===v ? A : '#f1f5f9',
              color:tab===v ? '#fff' : '#64748b',
              fontSize:11, fontWeight:700 }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:8 }}>Appraisal Completion</div>
            <AppraisalGauge
              pct={kpis.appraisal_pct || 0}
              total={kpis.total_employees || 0}
              completed={kpis.appraisals_completed || 0}
            />
          </div>
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Performance Trend</div>
            {perf_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={perf_trend} margin={{ top:4, right:8, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="quarter" tick={{ fontSize:10 }}/>
                  <YAxis domain={[0,100]} tick={{ fontSize:10 }}/>
                  <Tooltip/>
                  <Legend wrapperStyle={{ fontSize:10 }}/>
                  <Line type="monotone" dataKey="avgScore" stroke={A} strokeWidth={2.5} name="Avg Score"/>
                  <Line type="monotone" dataKey="topPct" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" name="Top %"/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No trend data yet</div>
            )}
          </div>
          {radar_data.length > 0 && (
            <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0', gridColumn:'1/-1' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Competency Radar</div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radar_data} cx="50%" cy="50%" outerRadius={85}>
                  <PolarGrid stroke="#f1f5f9"/>
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize:10 }}/>
                  <Radar name="Team Avg"     dataKey="teamAvg"     stroke={A}         fill={A}         fillOpacity={0.2}/>
                  <Radar name="Top Perf."    dataKey="topPerformer" stroke="#10b981"  fill="#10b981"  fillOpacity={0.1}/>
                  <Radar name="Target"       dataKey="target"       stroke="#94a3b8"  fill="none" strokeDasharray="4 4"/>
                  <Legend wrapperStyle={{ fontSize:10 }}/>
                  <Tooltip/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── OKR ── */}
      {tab === 'okr' && (
        <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:16 }}>OKR Progress</div>
          {okr_data.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12 }}>No OKR data yet</div>
            : okr_data.map((okr, i) => (
            <div key={i} style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{okr.objective}</span>
                <span style={{ fontSize:11, fontWeight:700, color:STATUS_C[okr.status]||'#94a3b8' }}>
                  {STATUS_IC[okr.status]||'•'} {okr.status}
                </span>
              </div>
              <div style={{ height:10, background:'#f1f5f9', borderRadius:5, overflow:'hidden' }}>
                <div style={{ height:10, borderRadius:5, background:STATUS_C[okr.status]||A,
                  width:`${okr.progress}%`, transition:'width .6s' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'#94a3b8' }}>
                <span>0%</span>
                <span style={{ fontWeight:700, color:STATUS_C[okr.status]||A }}>{okr.progress}%</span>
                <span>{okr.target}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── KPIs ── */}
      {tab === 'kpi' && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8fafc' }}>
              {['KPI','Actual','Target','Achievement','Status'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10,
                  fontWeight:700, color:'#64748b', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {kpi_data.length === 0 && (
                <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>No KPI data yet</td></tr>
              )}
              {kpi_data.map((k, i) => {
                const pct = k.pct ?? (k.target ? Math.round((k.actual/k.target)*100) : 0)
                const color = pct >= 95 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444'
                return (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2?'#fafafa':'#fff' }}>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{k.name}</td>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color }}>
                      {typeof k.actual === 'number' && k.actual > 10000 ? fmt(k.actual) : k.actual}
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>
                      {typeof k.target === 'number' && k.target > 10000 ? fmt(k.target) : k.target}
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3 }}>
                          <div style={{ height:6, borderRadius:3, background:color, width:`${Math.min(pct,100)}%` }}/>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color, minWidth:32 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ padding:'2px 10px', borderRadius:20, fontSize:9, fontWeight:700,
                        background:`${color}15`, color }}>
                        {pct>=95?'✅ Met':pct>=80?'⚠️ Close':'❌ Behind'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RATING DISTRIBUTION ── */}
      {tab === 'rating' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Rating Distribution</div>
            {rating_dist.length === 0
              ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No ratings yet</div>
              : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={rating_dist} margin={{ top:4, right:8, bottom:8, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="rating" tick={{ fontSize:9 }}/>
                  <YAxis tick={{ fontSize:10 }}/>
                  <Tooltip/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {rating_dist.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Rating','Count','%'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rating_dist.map((r, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>
                      <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%',
                        background:COLORS[i%COLORS.length], marginRight:8 }}/>
                      {r.rating}
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:COLORS[i%COLORS.length] }}>{r.count}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 360° FEEDBACK ── */}
      {tab === '360' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
          {feedback_360.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12, background:'#fff', borderRadius:14, gridColumn:'1/-1' }}>No 360° feedback data yet</div>
            : feedback_360.map((f, i) => (
            <div key={i} style={{ background:'#fff', borderRadius:14, padding:20,
              border:`1.5px solid ${COLORS[i%COLORS.length]}20`,
              borderTop:`4px solid ${COLORS[i%COLORS.length]}`,
              boxShadow:'0 2px 8px rgba(0,0,0,.06)', textAlign:'center' }}>
              <div style={{ fontSize:32, fontWeight:900, color:COLORS[i%COLORS.length] }}>{f.score}%</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginTop:6 }}>{f.from}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{f.responses} responses</div>
            </div>
          ))}
        </div>
      )}

      {/* ── PIP ── */}
      {tab === 'pip' && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:800 }}>⚠️ Performance Improvement Plan</div>
            <span style={{ background:'#fef2f2', color:'#dc2626', padding:'3px 12px', borderRadius:20, fontSize:10, fontWeight:700 }}>
              {pip_employees.length} Active
            </span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8fafc' }}>
              {['Employee','Dept','Start','End','Week','Issue','Progress'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pip_employees.length === 0 && (
                <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No employees on PIP</td></tr>
              )}
              {pip_employees.map((p, i) => {
                const prog = p.progress ?? 50
                return (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2?'#fafafa':'#fff' }}>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{p.name}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{p.dept}</td>
                    <td style={{ padding:'10px 14px', fontSize:11 }}>{p.start_date || p.startDate}</td>
                    <td style={{ padding:'10px 14px', fontSize:11 }}>{p.end_date || p.endDate}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:A }}>W{p.week}</td>
                    <td style={{ padding:'10px 14px', fontSize:11, color:'#64748b', maxWidth:160, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.issue}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3 }}>
                          <div style={{ height:6, borderRadius:3,
                            background:prog>=70?'#10b981':prog>=40?'#f59e0b':'#ef4444',
                            width:`${prog}%` }}/>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700,
                          color:prog>=70?'#10b981':prog>=40?'#f59e0b':'#ef4444' }}>{prog}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── BY DEPARTMENT ── */}
      {tab === 'dept' && (
        <div>
          {dept_perf.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12, background:'#fff', borderRadius:14 }}>No department performance data yet</div>
            : (
            <>
              <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0', marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Avg Score by Department</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dept_perf} margin={{ top:4, right:8, bottom:20, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="dept" tick={{ fontSize:10 }} angle={-30} textAnchor="end" interval={0}/>
                    <YAxis domain={[0,100]} tick={{ fontSize:10 }}/>
                    <Tooltip/>
                    <Bar dataKey="avg" radius={[4,4,0,0]}>
                      {dept_perf.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#f8fafc' }}>
                    {['Dept','Avg Score','Headcount','Top %','Meets %','Below %'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {dept_perf.map((d, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2?'#fafafa':'#fff' }}>
                        <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{d.dept}</td>
                        <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:COLORS[i%COLORS.length] }}>{d.avg}%</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{d.headcount}</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#10b981', fontWeight:700 }}>{d.top}%</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#3b82f6', fontWeight:700 }}>{d.meets}%</td>
                        <td style={{ padding:'10px 14px', fontSize:12, color:'#ef4444', fontWeight:700 }}>{d.below}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {tab === 'ai' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {ai_insights.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12, background:'#fff', borderRadius:14 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🤖</div>
                No AI insights yet. Insights are generated after performance reviews and OKR data is available.
              </div>
            : ai_insights.map((ins, i) => (
            <div key={i} style={{ background:'#fff', borderRadius:13, padding:18,
              border:`1.5px solid ${ins.color}20`, borderLeft:`4px solid ${ins.color}`,
              boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize:11, fontWeight:800, color:ins.color,
                textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                {ins.label}
              </div>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.55, margin:0 }}>{ins.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
