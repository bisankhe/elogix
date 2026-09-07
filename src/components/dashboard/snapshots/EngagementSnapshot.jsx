// FILE: src/components/dashboard/snapshots/EngagementSnapshot.jsx
// eLogix HRMS — Employee Engagement Snapshot
// COMPLETE REWRITE — Zero mock data. 100% real tenant API data.
// API: GET /api/v1/engagement/snapshot
// eLogix Technologies · www.elogix.com.np

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
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

// ── Constants ─────────────────────────────────────────────────
const G   = 'linear-gradient(135deg,#1e1b4b 0%,#7c3aed 60%,#c4b5fd 100%)'
const A   = '#7c3aed'
const COLORS = ['#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#0891b2']
const SENTIMENT_ICON  = { positive:'😊', negative:'😔', neutral:'😐' }
const SENTIMENT_COLOR = { positive:'#16a34a', negative:'#ef4444', neutral:'#f59e0b' }

// ── eNPS Gauge (uses real score prop) ────────────────────────
function ENPSGauge({ score = 0, promoters = 0, passives = 0, detractors = 0 }) {
  const clamped  = Math.max(-100, Math.min(100, score))
  const rotation = ((clamped + 100) / 200) * 180 - 90
  const color    = score >= 30 ? '#10b981' : score >= 0 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ textAlign:'center', padding:'8px 0' }}>
      <svg viewBox="0 0 200 110" width="180" height="100" style={{ display:'block', margin:'0 auto' }}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f1f5f9" strokeWidth="16" strokeLinecap="round"/>
        <path d="M 20 100 A 80 80 0 0 1 73 27"  fill="none" stroke="#fecaca" strokeWidth="16" strokeLinecap="round"/>
        <path d="M 73 27 A 80 80 0 0 1 127 27"  fill="none" stroke="#fde68a" strokeWidth="16" strokeLinecap="round"/>
        <path d="M 127 27 A 80 80 0 0 1 180 100" fill="none" stroke="#bbf7d0" strokeWidth="16" strokeLinecap="round"/>
        <line x1="100" y1="100"
          x2={100 + 65 * Math.cos((rotation - 90) * (Math.PI / 180))}
          y2={100 + 65 * Math.sin((rotation - 90) * (Math.PI / 180))}
          stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="100" cy="100" r="5" fill="#1e293b"/>
        <text x="100" y="95" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
          {score > 0 ? '+' : ''}{score}
        </text>
        <text x="20"  y="115" fontSize="9" fill="#94a3b8">-100</text>
        <text x="90"  y="115" fontSize="9" fill="#94a3b8">eNPS</text>
        <text x="172" y="115" fontSize="9" fill="#94a3b8">+100</text>
      </svg>
      <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
        Promoters {promoters}% · Passives {passives}% · Detractors {detractors}%
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function EngagementSnapshot() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tab,     setTab]     = useState('overview')

  const s       = _getSession()
  const company = s?.company || {}

  useEffect(() => {
    const token = localStorage.getItem('access_token') || s?.token || ''
    const slug  = s?.company?.slug || ''
    if (!token || !slug) { setLoading(false); return }
    fetch('/api/v1/engagement/snapshot', {
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

  // ── Derive from real API data (safe defaults if missing) ──
  const kpis           = data?.kpis            || {}
  const enps_trend     = data?.enps_trend      || []
  const pulse          = data?.pulse_scores    || []
  const sentiment      = data?.sentiment_trend || []
  const dept_eng       = data?.by_dept         || []
  const radar_data     = data?.radar           || []
  const nps_breakdown  = data?.nps_breakdown   || []
  const feedback       = data?.recent_feedback || []
  const ai_insights    = data?.ai_insights     || []

  const enps_score = kpis.enps_score ?? 0
  const promoters  = kpis.promoters  ?? 0
  const passives   = kpis.passives   ?? 0
  const detractors = kpis.detractors ?? 0

  if (loading) return (
    <div style={{ textAlign:'center', padding:60, color:A }}>
      <div style={{ fontSize:36, marginBottom:12 }}>⟳</div>
      <div style={{ fontSize:13, fontWeight:600 }}>Loading engagement data for {company?.name}...</div>
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
      <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
      <div style={{ fontSize:14, fontWeight:700, color:'#475569' }}>No engagement data yet for {company?.name}</div>
      <div style={{ fontSize:12, marginTop:6 }}>Run a pulse survey or eNPS campaign to see data here</div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", padding:24 }}>

      {/* ── Header ── */}
      <div style={{ background:G, borderRadius:16, padding:'20px 24px', marginBottom:20,
        boxShadow:'0 4px 24px rgba(124,58,237,.25)',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:18, fontWeight:900, color:'#fff' }}>💬 Engagement Snapshot</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', marginTop:4 }}>
            {company?.name} · eNPS, Pulse Survey & Sentiment Analysis
          </div>
        </div>
        <span style={{ background:'rgba(255,255,255,.2)', color:'#fff',
          padding:'4px 12px', borderRadius:20, fontSize:10, fontWeight:700 }}>
          {kpis.survey_period || 'Current Period'}
        </span>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'📊', label:'eNPS Score',       val: enps_score > 0 ? `+${enps_score}` : String(enps_score), color: enps_score>=30?'#10b981':enps_score>=0?'#f59e0b':'#ef4444' },
          { icon:'😊', label:'Promoters',         val: `${promoters}%`,                color:'#10b981' },
          { icon:'😐', label:'Passives',           val: `${passives}%`,                 color:'#f59e0b' },
          { icon:'😔', label:'Detractors',         val: `${detractors}%`,               color:'#ef4444' },
          { icon:'📋', label:'Survey Responses',   val: kpis.responses,                 color:A         },
          { icon:'📈', label:'Engagement Rate',    val: kpis.engagement_rate ? `${kpis.engagement_rate}%` : '–', color:'#0891b2' },
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
        {[['overview','📊 Overview'],['pulse','💓 Pulse'],['sentiment','🎭 Sentiment'],['dept','🏢 By Dept'],['feedback','💬 Feedback'],['ai','🤖 AI Insights']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer',
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
          {/* eNPS Gauge */}
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:8 }}>eNPS Score</div>
            <ENPSGauge score={enps_score} promoters={promoters} passives={passives} detractors={detractors}/>
          </div>

          {/* eNPS Trend */}
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>eNPS Trend</div>
            {enps_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={enps_trend} margin={{ top:4, right:8, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="month" tick={{ fontSize:10 }}/>
                  <YAxis domain={[-100,100]} tick={{ fontSize:10 }}/>
                  <Tooltip/>
                  <Line type="monotone" dataKey="score" stroke={A} strokeWidth={2.5} dot={{ r:4, fill:A }}/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:12 }}>No trend data yet</div>
            )}
          </div>

          {/* NPS Breakdown */}
          {nps_breakdown.length > 0 && (
            <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>NPS Breakdown</div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={nps_breakdown} dataKey="value" cx="50%" cy="50%" outerRadius={65}
                    label={({ name, value }) => `${name}: ${value}%`}>
                    {nps_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Competency Radar */}
          {radar_data.length > 0 && (
            <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Engagement Dimensions</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radar_data} cx="50%" cy="50%" outerRadius={75}>
                  <PolarGrid stroke="#f1f5f9"/>
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize:9 }}/>
                  <Radar name="Company" dataKey="A" stroke={A} fill={A} fillOpacity={0.25}/>
                  <Radar name="Benchmark" dataKey="B" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1}/>
                  <Legend wrapperStyle={{ fontSize:10 }}/>
                  <Tooltip/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── PULSE ── */}
      {tab === 'pulse' && (
        <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:16 }}>Pulse Survey Scores</div>
          {pulse.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12 }}>No pulse survey data yet</div>
            : pulse.map((item, i) => (
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontSize:12, fontWeight:600, color:'#1e293b' }}>{item.category}</span>
                <div style={{ display:'flex', gap:12, fontSize:11 }}>
                  <span style={{ color:A, fontWeight:700 }}>Score: {item.score}</span>
                  <span style={{ color:'#94a3b8' }}>Target: {item.target}</span>
                </div>
              </div>
              <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:8, borderRadius:4, transition:'width .6s',
                  background: item.score >= item.target ? '#10b981' : item.score >= item.target - 0.5 ? '#f59e0b' : '#ef4444',
                  width:`${(item.score / 10) * 100}%` }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:10, color:'#94a3b8' }}>
                <span>0</span>
                <span style={{ color: item.score >= item.target ? '#10b981' : '#f59e0b', fontWeight:700 }}>
                  {item.score >= item.target ? '✅ Above target' : '⚠️ Below target'}
                </span>
                <span>10</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SENTIMENT ── */}
      {tab === 'sentiment' && (
        <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Sentiment Trend</div>
          {sentiment.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12 }}>No sentiment data yet</div>
            : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sentiment} margin={{ top:4, right:8, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="week" tick={{ fontSize:10 }}/>
                <YAxis tick={{ fontSize:10 }}/>
                <Tooltip/>
                <Legend wrapperStyle={{ fontSize:10 }}/>
                <Area type="monotone" dataKey="positive" stroke="#10b981" fill="#10b98120" stackId="1" strokeWidth={2}/>
                <Area type="monotone" dataKey="neutral"  stroke="#f59e0b" fill="#f59e0b20" stackId="1" strokeWidth={2}/>
                <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="#ef444420" stackId="1" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── BY DEPARTMENT ── */}
      {tab === 'dept' && (
        <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:14 }}>Engagement by Department</div>
          {dept_eng.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12 }}>No department data yet</div>
            : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dept_eng} margin={{ top:4, right:8, bottom:20, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="dept" tick={{ fontSize:10 }} angle={-30} textAnchor="end" interval={0}/>
                  <YAxis domain={[0,100]} tick={{ fontSize:10 }}/>
                  <Tooltip formatter={v => [`${v}%`, 'Score']}/>
                  <Bar dataKey="score" radius={[4,4,0,0]}>
                    {dept_eng.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:16 }}>
                {dept_eng.map((d, i) => (
                  <div key={i} style={{ flex:1, minWidth:120, background:`${COLORS[i%COLORS.length]}08`,
                    borderRadius:10, padding:'10px 14px', border:`1.5px solid ${COLORS[i%COLORS.length]}20`, textAlign:'center' }}>
                    <div style={{ fontSize:20, fontWeight:900, color:COLORS[i%COLORS.length] }}>{d.score}%</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>{d.dept}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {tab === 'feedback' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {feedback.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12, background:'#fff', borderRadius:14 }}>No feedback yet</div>
            : feedback.map((f, i) => (
            <div key={i} style={{ background:'#fff', borderRadius:13, padding:16,
              border:`1.5px solid ${SENTIMENT_COLOR[f.sentiment] || '#e2e8f0'}20`,
              borderLeft:`4px solid ${SENTIMENT_COLOR[f.sentiment] || '#94a3b8'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>
                  {SENTIMENT_ICON[f.sentiment] || '💬'} {f.dept}
                </span>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20,
                    background:`${SENTIMENT_COLOR[f.sentiment]||'#94a3b8'}15`,
                    color:SENTIMENT_COLOR[f.sentiment]||'#94a3b8' }}>
                    {f.sentiment?.toUpperCase()}
                  </span>
                  <span style={{ fontSize:10, color:'#94a3b8' }}>{f.date}</span>
                </div>
              </div>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.5, margin:0 }}>{f.feedback}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {tab === 'ai' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {ai_insights.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12, background:'#fff', borderRadius:14 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🤖</div>
                No AI insights yet. Insights are generated after enough engagement data is collected.
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
