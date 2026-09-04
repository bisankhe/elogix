// ============================================================
// FILE: src/components/dashboard/snapshots/EngagementSnapshot.jsx
// PURPOSE: Employee Engagement — eNPS, pulse survey,
//          sentiment analysis, engagement trends
// ============================================================

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { StatCard }      from '../../shared/StatCard.jsx'
import { Card }          from '../../shared/Card.jsx'
import { Pill }          from '../../shared/Pill.jsx'
import { ProgressBar }   from '../../shared/ProgressBar.jsx'
import { PageTitle }     from '../../shared/PageTitle.jsx'
import { AIInsightCard } from '../../shared/AIInsightCard.jsx'

// ── Mock Data ────────────────────────────────────────────────
const eNPSTrend = [
  { month: 'Jan', score: 32 }, { month: 'Feb', score: 35 },
  { month: 'Mar', score: 38 }, { month: 'Apr', score: 36 },
  { month: 'May', score: 40 }, { month: 'Jun', score: 42 },
]

const pulseData = [
  { category: 'Work-Life Balance',    score: 7.8, target: 8.0, color: '#3b82f6' },
  { category: 'Manager Support',      score: 8.1, target: 7.5, color: '#10b981' },
  { category: 'Growth Opportunities', score: 6.9, target: 7.5, color: '#f59e0b' },
  { category: 'Recognition',          score: 7.4, target: 7.5, color: '#8b5cf6' },
  { category: 'Compensation Fairness',score: 6.5, target: 7.0, color: '#ef4444' },
  { category: 'Team Collaboration',   score: 8.3, target: 8.0, color: '#10b981' },
  { category: 'Company Culture',      score: 7.6, target: 7.5, color: '#3b82f6' },
]

const sentimentTrend = [
  { week: 'W1', positive: 62, neutral: 24, negative: 14 },
  { week: 'W2', positive: 65, neutral: 22, negative: 13 },
  { week: 'W3', positive: 61, neutral: 25, negative: 14 },
  { week: 'W4', positive: 67, neutral: 21, negative: 12 },
  { week: 'W5', positive: 70, neutral: 20, negative: 10 },
  { week: 'W6', positive: 68, neutral: 22, negative: 10 },
]

const deptEngagement = [
  { dept: 'IT',         score: 78, color: '#3b82f6' },
  { dept: 'HR',         score: 85, color: '#10b981' },
  { dept: 'Finance',    score: 61, color: '#ef4444' },
  { dept: 'Operations', score: 74, color: '#f59e0b' },
  { dept: 'Sales',      score: 71, color: '#8b5cf6' },
]

const radarEngagement = [
  { subject: 'Purpose',      A: 78, B: 75 },
  { subject: 'Autonomy',     A: 72, B: 70 },
  { subject: 'Mastery',      A: 69, B: 75 },
  { subject: 'Recognition',  A: 74, B: 75 },
  { subject: 'Wellbeing',    A: 80, B: 75 },
  { subject: 'Connection',   A: 76, B: 75 },
]

const npsBreakdown = [
  { name: 'Promoters',   value: 61, color: '#10b981' },
  { name: 'Passives',    value: 20, color: '#f59e0b' },
  { name: 'Detractors',  value: 19, color: '#ef4444' },
]

const recentFeedback = [
  { dept: 'IT',      feedback: 'Need more growth opportunities and clear career path', sentiment: 'negative', date: '2 days ago' },
  { dept: 'HR',      feedback: 'Team culture is excellent, managers are very supportive', sentiment: 'positive', date: '3 days ago' },
  { dept: 'Finance', feedback: 'Work pressure is high, work-life balance needs attention', sentiment: 'negative', date: '3 days ago' },
  { dept: 'Sales',   feedback: 'Recognition program is appreciated, keep it up!', sentiment: 'positive', date: '4 days ago' },
  { dept: 'Ops',     feedback: 'More training programs would be helpful', sentiment: 'neutral', date: '5 days ago' },
]

const sentimentColor = { positive: 'green', negative: 'red', neutral: 'yellow' }
const sentimentIcon  = { positive: '😊', negative: '😔', neutral: '😐' }

const aiInsights = [
  { color: '#f59e0b', label: 'Concern Detected',  text: '"Growth opportunities" scored 6.9 — below 7.5 threshold for 2 consecutive months. Launch mentorship program in Q3.' },
  { color: '#ef4444', label: 'Retention Risk',    text: 'Finance department showing declining engagement for 3 consecutive weeks. Recommend immediate 1-on-1 sessions.' },
  { color: '#10b981', label: 'Positive Signal',   text: 'Manager support at 8.1 — a 3-year high. IT and Sales team leads performing exceptionally well.' },
  { color: '#3b82f6', label: 'Culture Strength',  text: 'Team Collaboration scored 8.3 — above target. Leverage this strength in employer branding campaigns.' },
]

// ── Gauge Component ──────────────────────────────────────────
function ENPSGauge({ score }) {
  const clampedScore = Math.max(-100, Math.min(100, score))
  const rotation = ((clampedScore + 100) / 200) * 180 - 90

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <svg viewBox="0 0 200 110" width="180" height="100" style={{ display: 'block', margin: '0 auto' }}>
        {/* Background arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f1f5f9" strokeWidth="16" strokeLinecap="round" />
        {/* Red zone */}
        <path d="M 20 100 A 80 80 0 0 1 73 27" fill="none" stroke="#fecaca" strokeWidth="16" strokeLinecap="round" />
        {/* Yellow zone */}
        <path d="M 73 27 A 80 80 0 0 1 127 27" fill="none" stroke="#fde68a" strokeWidth="16" strokeLinecap="round" />
        {/* Green zone */}
        <path d="M 127 27 A 80 80 0 0 1 180 100" fill="none" stroke="#bbf7d0" strokeWidth="16" strokeLinecap="round" />
        {/* Needle */}
        <line
          x1="100" y1="100"
          x2={100 + 65 * Math.cos((rotation - 90) * (Math.PI / 180))}
          y2={100 + 65 * Math.sin((rotation - 90) * (Math.PI / 180))}
          stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill="#1e293b" />
        {/* Score */}
        <text x="100" y="95" textAnchor="middle" fontSize="22" fontWeight="800" fill={score >= 30 ? '#10b981' : score >= 0 ? '#f59e0b' : '#ef4444'}>
          {score > 0 ? '+' : ''}{score}
        </text>
        <text x="20"  y="115" fontSize="9" fill="#94a3b8">-100</text>
        <text x="90"  y="115" fontSize="9" fill="#94a3b8">eNPS</text>
        <text x="172" y="115" fontSize="9" fill="#94a3b8">+100</text>
      </svg>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
      {apiLoading && (
        <div style={{textAlign:'center',padding:40,color:'#7c3aed',fontSize:13,fontWeight:600}}>
          <div style={{fontSize:32,marginBottom:8}}>⟳</div>Loading...
        </div>
      )}
      {apiError && !apiLoading && (
        <div style={{padding:'8px 14px',background:'#fef2f2',border:'1px solid #fecaca',
          borderRadius:8,fontSize:12,color:'#dc2626',marginBottom:8,fontWeight:600}}>
          ⚠️ {apiError}
        </div>
      )}
        Promoters 61% · Passives 20% · Detractors 19%
      </div>
      <div style={{ marginTop: 6 }}>
        <Pill color="green">Industry benchmark: +30</Pill>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('elogix_session')||localStorage.getItem('elogix_session')||'null')||{} } catch(_e){return{}}
}
function _getTenantCtx() {
  const s=_getSession()
  const token=localStorage.getItem('access_token')||s?.token||''
  const slug=s?.company?.slug||localStorage.getItem('elogix_tenant_slug')||''
  return {token,slug,valid:!!(token&&slug)}
}

export default function EngagementSnapshot() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const { t } = _useAppFallback()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(()=>{
    const {token,slug,valid} = _getTenantCtx()
    if(!valid){setApiLoading(false);return}
    setApiLoading(true);setApiError(null)
    fetch('/api/v1/engagement/snapshot',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{const p=d.snapshot||d.data||d;if(p)setApiData(p)})
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div>
      <PageTitle
        title="Engagement Snapshot"
        sub="eNPS scores, pulse survey results, sentiment analysis & department-wise engagement trends."
        badge="eNPS +42"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="🎯" label="eNPS Score"          value="+42"   change="Industry avg +30" up accent="#10b981" />
        <StatCard icon="📊" label="Survey Participation" value="78%"   change="+5% vs last week" up accent="#3b82f6" />
        <StatCard icon="😊" label="Positive Sentiment"  value="68%"   change="+6% this month"   up accent="#8b5cf6" />
        <StatCard icon="⚠️" label="Concerns Flagged"    value="3"     change="Finance dept risk" up={false} accent="#ef4444" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',  label: '📊 Overview'  },
          { id: 'pulse',     label: '💓 Pulse'     },
          { id: 'sentiment', label: '😊 Sentiment' },
          { id: 'dept',      label: '🏢 By Dept'   },
          { id: 'ai',        label: '🧠 AI Insights'},
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-none cursor-pointer
              ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* eNPS Gauge */}
            <Card title="eNPS Score — June 2026" subtitle="Employee Net Promoter Score">
              <ENPSGauge score={42} />
              <div className="mt-3">
                {npsBreakdown.map((n, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-none text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: n.color }} />
                      <span className="text-gray-600">{n.name}</span>
                    </div>
                    <span className="font-bold text-gray-900">{n.value}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* eNPS Trend */}
            <div className="lg:col-span-2">
              <Card title="eNPS Trend — 6 Months" subtitle="Monthly eNPS score progression">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={eNPSTrend}>
                    <defs>
                      <linearGradient id="gNPS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[25, 50]} />
                    <Tooltip formatter={v => [`+${v}`, 'eNPS']} />
                    {/* Benchmark line reference */}
                    <Area type="monotone" dataKey="score" stroke="#10b981" fill="url(#gNPS)" strokeWidth={2.5} name="eNPS" dot={{ r: 4, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                  <span className="w-8 border-dashed border-t-2 border-gray-400 inline-block"></span>
                  Industry benchmark: +30
                </div>
              </Card>
            </div>
          </div>

          {/* Quick Pulse Summary */}
          <Card title="Quick Pulse Summary" subtitle="Top scoring & concern areas this week">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-bold text-green-700 mb-2">✅ Strengths (above target)</div>
                {pulseData.filter(p => p.score >= p.target).map((p, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{p.category}</span>
                      <span className="font-bold text-gray-900">{p.score}/10</span>
                    </div>
                    <ProgressBar value={p.score * 10} color="#10b981" />
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs font-bold text-red-600 mb-2">⚠️ Areas needing attention</div>
                {pulseData.filter(p => p.score < p.target).map((p, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{p.category}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">{p.score}/10</span>
                        <span className="text-gray-400 text-xs">target: {p.target}</span>
                      </div>
                    </div>
                    <ProgressBar value={p.score * 10} color={p.score < 7 ? '#ef4444' : '#f59e0b'} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── PULSE SURVEY ── */}
      {activeTab === 'pulse' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title="Pulse Survey Results" subtitle="Current week — 78% participation (975/1250 responded)">
              {pulseData.map((p, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{p.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{p.score}/10</span>
                      <span className="text-gray-400">target: {p.target}</span>
                      <Pill color={p.score >= p.target ? 'green' : p.score >= p.target - 0.5 ? 'yellow' : 'red'}>
                        {p.score >= p.target ? '↑' : '↓'}
                      </Pill>
                    </div>
                  </div>
                  <ProgressBar value={p.score * 10} color={p.color} />
                </div>
              ))}
            </Card>

            <Card title="Engagement Radar — 6 Dimensions" subtitle="Team score vs company target">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarEngagement}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar name="Team Score" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  <Radar name="Target"     dataKey="B" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.10} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Recent Feedback */}
          <Card title="Recent Employee Feedback" subtitle="Anonymized pulse survey comments">
            {recentFeedback.map((f, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-gray-50 last:border-none">
                <span className="text-xl flex-shrink-0">{sentimentIcon[f.sentiment]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-600">{f.dept} Department</span>
                    <Pill color={sentimentColor[f.sentiment]}>{f.sentiment}</Pill>
                    <span className="text-xs text-gray-400 ml-auto">{f.date}</span>
                  </div>
                  <p className="text-xs text-gray-700 italic">"{f.feedback}"</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── SENTIMENT ── */}
      {activeTab === 'sentiment' && (
        <div>
          <Card title="6-Week Sentiment Trend" subtitle="Positive, neutral & negative sentiment over time">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={sentimentTrend}>
                <defs>
                  <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={v => [`${v}%`]} />
                <Legend />
                <Area type="monotone" dataKey="positive" stroke="#10b981" fill="url(#gPos)" strokeWidth={2} name="Positive %" />
                <Area type="monotone" dataKey="neutral"  stroke="#f59e0b" fill="none"        strokeWidth={2} name="Neutral %"  strokeDasharray="4 4" />
                <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="url(#gNeg)" strokeWidth={2} name="Negative %" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {[
              { icon: '😊', label: 'Positive',  pct: 68, color: '#10b981', pill: 'green',  insight: 'Team collaboration and manager support are key drivers.' },
              { icon: '😐', label: 'Neutral',   pct: 22, color: '#f59e0b', pill: 'yellow', insight: 'Employees who are neutral may shift — monitor closely.' },
              { icon: '😔', label: 'Negative',  pct: 10, color: '#ef4444', pill: 'red',    insight: 'Finance dept drives most negative sentiment — act now.' },
            ].map((s, i) => (
              <Card key={i} title={`${s.icon} ${s.label} Sentiment`}>
                <div className="text-4xl font-black text-center my-4" style={{ color: s.color }}>{(s.pct||0)}%</div>
                <ProgressBar value={(s.pct||0)} color={s.color} />
                <p className="text-xs text-gray-500 mt-3 italic">{s.insight}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── BY DEPT ── */}
      {activeTab === 'dept' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title="Department Engagement Scores" subtitle="Overall engagement score out of 100">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptEngagement} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={v => [`${v}/100`, 'Engagement']} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} name="Engagement Score">
                    {deptEngagement.map((d, i) => (
                      <Cell key={i} fill={d.score >= 80 ? '#10b981' : d.score >= 70 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Department Status Summary">
              {deptEngagement.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-none">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{d.dept}</div>
                    <div className="text-xs text-gray-400">Engagement: {d.score}/100</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={d.score} color={d.score >= 80 ? '#10b981' : d.score >= 70 ? '#f59e0b' : '#ef4444'} />
                    <Pill color={d.score >= 80 ? 'green' : d.score >= 70 ? 'yellow' : 'red'}>
                      {d.score >= 80 ? 'Excellent' : d.score >= 70 ? 'Good' : 'At Risk'}
                    </Pill>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {activeTab === 'ai' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <AIInsightCard insights={aiInsights.slice(0, 2)} title="⚠️ Engagement Concerns" />
            <AIInsightCard insights={aiInsights.slice(2, 4)} title="✅ Positive Signals" />
          </div>
          <Card title="Recommended Engagement Actions" subtitle="AI-generated priority action plan">
            {[
              { action: 'Launch career mentorship program for IT dept',         timeline: 'Q3 2026', impact: 'High',   icon: '🎓' },
              { action: 'Schedule weekly 1-on-1s for Finance team',             timeline: 'Immediate', impact: 'High', icon: '💬' },
              { action: 'Roll out recognition program in Sales team',            timeline: 'Jul 2026',impact: 'Medium', icon: '🏆' },
              { action: 'Increase L&D budget by 15% for growth opportunities',  timeline: 'Q3 2026', impact: 'High',   icon: '📈' },
              { action: 'Conduct focus groups on compensation fairness',         timeline: 'Jun 2026',impact: 'Medium', icon: '💰' },
              { action: 'Launch wellness program for all departments',           timeline: 'Jul 2026',impact: 'Medium', icon: '🏥' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-none">
                <span className="text-xl flex-shrink-0">{a.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{a.action}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Timeline: {a.timeline}</div>
                </div>
                <Pill color={a.impact === 'High' ? 'red' : 'yellow'}>{a.impact} Impact</Pill>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
