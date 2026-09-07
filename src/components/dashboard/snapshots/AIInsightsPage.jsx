// FILE: src/components/dashboard/snapshots/AIInsightsPage.jsx
// eLogix HRMS — AI Insights Centre
// COMPLETE REWRITE — Zero mock data. 100% real tenant AI API.
// API: GET /api/v1/ai/insights
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

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

const G      = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const A      = '#7c3aed'
const COLORS = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#0891b2']

export default function AIInsightsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('attrition')
  const [regen,   setRegen]   = useState(false)

  const s       = _getSession()
  const company = s?.company || {}
  const cc      = _getCurrency()

  function authHeaders() {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    return { 'Authorization': `Bearer ${token}`, 'X-Tenant-Slug': slug, 'Content-Type':'application/json' }
  }

  function loadData() {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    setLoading(true); setError(null)
    fetch('/api/v1/ai/insights', { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) { window.dispatchEvent(new CustomEvent('elogix:session-expired')); throw new Error('Session expired') }
        if (!r.ok) throw new Error(`Error ${r.status}`)
        return r.json()
      })
      .then(d => setData(d.data || d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const regenerate = async () => {
    setRegen(true)
    try {
      await fetch('/api/v1/ai/insights/regenerate', { method:'POST', headers: authHeaders() })
      await new Promise(r => setTimeout(r, 1500))
      loadData()
    } catch (_e) {}
    setRegen(false)
  }

  // Derive from real API data
  const attrition_trend = data?.attrition_trend     || []
  const attrition_dept  = data?.attrition_by_dept   || []
  const salary_bands    = data?.salary_bands         || []
  const seasonal_leave  = data?.seasonal_leave       || []
  const model_metrics   = data?.model_metrics        || []
  const competency      = data?.competency_radar     || []
  const insights        = data?.insights             || []
  const kpis            = data?.kpis                 || {}
  const predictions     = data?.predictions          || []

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:A, fontFamily:'system-ui' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>🤖</div>
      <div style={{ fontSize:13, fontWeight:600 }}>Generating AI insights for {company?.name}...</div>
      <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>Analysing HR data with ML models</div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>
      {/* Header */}
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(124,58,237,.25)',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>🤖 AI Insights Centre</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
            {company?.name} · ML-powered HR analytics · {data?.generated_at || 'Real-time'}
          </div>
        </div>
        <button onClick={regenerate} disabled={regen}
          style={{ padding:'7px 16px', borderRadius:20, border:'1.5px solid rgba(255,255,255,.4)',
            background:'rgba(255,255,255,.15)', color:'#fff', fontSize:11, fontWeight:700, cursor:regen?'wait':'pointer' }}>
          {regen ? '⟳ Regenerating...' : '🔄 Refresh Insights'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding:'12px 16px', background:'#fef2f2', borderRadius:10,
          color:'#dc2626', fontSize:12, fontWeight:600, marginBottom:14 }}>
          ⚠️ {error} — AI insights may not be available yet. Run payroll and attendance first.
        </div>
      )}

      {/* KPI strip */}
      {data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { icon:'⚠️', label:'Attrition Risk',  val: kpis.attrition_risk   ? `${kpis.attrition_risk}%`   : '–', color:'#ef4444' },
            { icon:'💰', label:'Salary Gap',       val: kpis.salary_gap       ? `${cc.symbol}${kpis.salary_gap}K` : '–', color:'#f59e0b' },
            { icon:'🎯', label:'Prediction Acc.',  val: kpis.model_accuracy   ? `${kpis.model_accuracy}%`   : '–', color:'#10b981' },
            { icon:'🤖', label:'Insights Generated',val: insights.length,                                              color:A         },
            { icon:'📊', label:'Models Active',    val: model_metrics.filter(m=>m.status==='Active').length,            color:'#0891b2' },
          ].map((k,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:13, padding:'14px 16px',
              border:`1.5px solid ${k.color}20`, borderTop:`4px solid ${k.color}`,
              boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{k.icon}</div>
              <div style={{ fontSize:20, fontWeight:900, color:k.color }}>{k.val}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:3, fontWeight:600 }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* No data state */}
      {!data && !loading && !error && (
        <div style={{ textAlign:'center', padding:60, color:'#94a3b8', background:'#fff', borderRadius:14 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🤖</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#475569' }}>No AI insights yet for {company?.name}</div>
          <div style={{ fontSize:12, marginTop:6 }}>Insights generate automatically after 30+ employee records, attendance, and payroll data are available</div>
          <button onClick={regenerate} disabled={regen}
            style={{ marginTop:16, padding:'10px 24px', borderRadius:10, border:'none',
              background:A, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            🔄 Generate Now
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {[
              ['attrition','⚠️ Attrition'],['salary','💰 Salary Bands'],
              ['leave','🌴 Leave Patterns'],['competency','🎯 Competency'],
              ['models','⚙️ ML Models'],['insights','💡 AI Insights'],
            ].map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)}
                style={{ padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer',
                  background:tab===v?A:'#f1f5f9', color:tab===v?'#fff':'#64748b', fontSize:11, fontWeight:700 }}>
                {l}
              </button>
            ))}
          </div>

          {/* ── ATTRITION ── */}
          {tab === 'attrition' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
                <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Attrition Trend — Predicted vs Actual</div>
                  {attrition_trend.length === 0
                    ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No attrition trend data yet</div>
                    : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={attrition_trend} margin={{ top:4, right:8, bottom:0, left:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                        <XAxis dataKey="month" tick={{ fontSize:10 }}/>
                        <YAxis tick={{ fontSize:10 }} unit="%"/>
                        <Tooltip formatter={v => v !== null ? [`${v}%`, ''] : ['—', '']}/>
                        <Legend wrapperStyle={{ fontSize:10 }}/>
                        <Line type="monotone" dataKey="predicted" stroke={A}       strokeWidth={2} dot={{ r:3 }} strokeDasharray="5 5" name="Predicted"/>
                        <Line type="monotone" dataKey="actual"    stroke="#10b981" strokeWidth={2} dot={{ r:3 }} name="Actual"/>
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>At-Risk by Department</div>
                  {attrition_dept.length === 0
                    ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No dept data yet</div>
                    : attrition_dept.map((d, i) => (
                    <div key={i} style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                        <span style={{ fontWeight:600 }}>{d.dept}</span>
                        <span style={{ fontWeight:700, color:d.risk>10?'#ef4444':d.risk>5?'#f59e0b':'#10b981' }}>{d.risk}%</span>
                      </div>
                      <div style={{ height:6, background:'#f1f5f9', borderRadius:3 }}>
                        <div style={{ height:6, borderRadius:3, background:COLORS[i%COLORS.length], width:`${Math.min(d.risk,30)/30*100}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SALARY BANDS ── */}
          {tab === 'salary' && (
            <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Salary vs Market Rate ({cc.symbol}K/mo)</div>
              {salary_bands.length === 0
                ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No salary band data yet</div>
                : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={salary_bands} margin={{ top:4, right:8, bottom:20, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="role" tick={{ fontSize:9 }} angle={-20} textAnchor="end" interval={0}/>
                      <YAxis tick={{ fontSize:10 }}/>
                      <Tooltip formatter={v => [`${cc.symbol}${v}K`, '']}/>
                      <Legend wrapperStyle={{ fontSize:10 }}/>
                      <Bar dataKey="current" fill={A}        name="Current" radius={[3,3,0,0]}/>
                      <Bar dataKey="market"  fill="#94a3b8"  name="Market"  radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <table style={{ width:'100%', borderCollapse:'collapse', marginTop:16 }}>
                    <thead><tr style={{ background:'#f8fafc' }}>
                      {['Role','Current','Market','Gap','Action'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {salary_bands.map((r, i) => (
                        <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'9px 12px', fontSize:13, fontWeight:600 }}>{r.role}</td>
                          <td style={{ padding:'9px 12px', fontSize:12 }}>{cc.symbol}{r.current}K</td>
                          <td style={{ padding:'9px 12px', fontSize:12, color:'#64748b' }}>{cc.symbol}{r.market}K</td>
                          <td style={{ padding:'9px 12px', fontSize:12, fontWeight:700, color:r.gap>10?'#ef4444':'#f59e0b' }}>
                            {r.gap > 0 ? `+${cc.symbol}${r.gap}K` : '✅ Competitive'}
                          </td>
                          <td style={{ padding:'9px 12px' }}>
                            {r.gap > 0 && (
                              <span style={{ padding:'2px 8px', borderRadius:20, fontSize:9, fontWeight:700,
                                background:'#fef2f2', color:'#ef4444' }}>Review salary</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* ── LEAVE PATTERNS ── */}
          {tab === 'leave' && (
            <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Seasonal Leave Patterns</div>
              {seasonal_leave.length === 0
                ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No leave pattern data yet</div>
                : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={seasonal_leave} margin={{ top:4, right:8, bottom:0, left:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="month" tick={{ fontSize:10 }}/>
                      <YAxis tick={{ fontSize:10 }}/>
                      <Tooltip/>
                      <Bar dataKey="leave" name="Leave days" radius={[4,4,0,0]}>
                        {seasonal_leave.map((_,i) => (
                          <Cell key={i} fill={seasonal_leave[i]?.highlight ? '#ef4444' : A}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop:12, padding:'10px 14px', background:'#fffbeb', borderRadius:8, fontSize:12, color:'#92400e' }}>
                    🎉 Dashain/Tihar spike: {seasonal_leave.filter(m=>m.highlight).map(m=>m.month).join(', ')} — plan staffing accordingly
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── COMPETENCY RADAR ── */}
          {tab === 'competency' && (
            <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Competency Radar — Team vs Target</div>
              {competency.length === 0
                ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No competency data yet</div>
                : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={competency} cx="50%" cy="50%" outerRadius={110}>
                    <PolarGrid stroke="#f1f5f9"/>
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:11 }}/>
                    <Radar name="Team Average" dataKey="A" stroke={A} fill={A} fillOpacity={0.25}/>
                    <Radar name="Target"       dataKey="B" stroke="#94a3b8" fill="none" strokeDasharray="4 4"/>
                    <Legend wrapperStyle={{ fontSize:11 }}/>
                    <Tooltip/>
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* ── ML MODELS ── */}
          {tab === 'models' && (
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', fontWeight:800, fontSize:13, borderBottom:'1px solid #f1f5f9' }}>
                ⚙️ Active ML Models
              </div>
              {model_metrics.length === 0
                ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No model metrics yet</div>
                : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#f8fafc' }}>
                    {['Model','Accuracy','Last Trained','Status'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {model_metrics.map((m, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:i%2?'#fafafa':'#fff' }}>
                        <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600 }}>{m.model}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3 }}>
                              <div style={{ height:6, borderRadius:3, background:m.accuracy>=85?'#10b981':m.accuracy>=75?'#f59e0b':'#ef4444', width:`${m.accuracy}%` }}/>
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:m.accuracy>=85?'#10b981':m.accuracy>=75?'#f59e0b':'#ef4444', minWidth:40 }}>{m.accuracy}%</span>
                          </div>
                        </td>
                        <td style={{ padding:'12px 14px', fontSize:11, color:'#64748b' }}>{m.last_trained || m.lastTrained}</td>
                        <td style={{ padding:'12px 14px' }}>
                          <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
                            background:m.status==='Active'?'#f0fdf4':m.status==='Training'?'#fffbeb':'#f8fafc',
                            color:m.status==='Active'?'#059669':m.status==='Training'?'#d97706':'#64748b' }}>
                            {m.status==='Active'?'✅':m.status==='Training'?'⟳':'⏸'} {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── AI INSIGHTS CARDS ── */}
          {tab === 'insights' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {insights.length === 0
                ? <div style={{ padding:60, textAlign:'center', color:'#94a3b8', background:'#fff', borderRadius:14 }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>💡</div>
                    <div style={{ fontSize:13 }}>No AI insights generated yet. Run more data through the system.</div>
                  </div>
                : insights.map((ins, i) => (
                <div key={i} style={{ background:'#fff', borderRadius:13, padding:18,
                  border:`1.5px solid ${ins.color || COLORS[i%COLORS.length]}20`,
                  borderLeft:`4px solid ${ins.color || COLORS[i%COLORS.length]}`,
                  boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:ins.color||COLORS[i%COLORS.length],
                      textTransform:'uppercase', letterSpacing:'.06em' }}>
                      {ins.label}
                    </span>
                    <span style={{ fontSize:9, color:'#94a3b8', padding:'2px 8px', borderRadius:20, background:'#f8fafc' }}>
                      {ins.confidence ? `${ins.confidence}% confidence` : ins.category}
                    </span>
                  </div>
                  <p style={{ fontSize:13, color:'#475569', lineHeight:1.6, margin:0 }}>{ins.text}</p>
                  {ins.recommendation && (
                    <div style={{ marginTop:10, padding:'8px 12px', background:'#f8fafc', borderRadius:8,
                      fontSize:11, color:'#64748b' }}>
                      💡 <strong>Recommendation:</strong> {ins.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
