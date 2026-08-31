// ============================================================
// FILE: src/components/dashboard/snapshots/PerformanceSnapshot.jsx
// PURPOSE: Performance Snapshot — OKR progress, 360° feedback,
//          appraisal completion, KPI tracking, PIP management,
//          rating distribution, competency radar
// ============================================================

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from 'recharts'
import { useApp }        from '../../../context/AppContext.jsx'
import { StatCard }      from '../../shared/StatCard.jsx'
import { Card }          from '../../shared/Card.jsx'
import { Pill }          from '../../shared/Pill.jsx'
import { ProgressBar }   from '../../shared/ProgressBar.jsx'
import { PageTitle }     from '../../shared/PageTitle.jsx'
import { AIInsightCard } from '../../shared/AIInsightCard.jsx'

// ── Mock Data ────────────────────────────────────────────────
const okrData = [
  { objective: 'Revenue Growth 20%',        progress: 74, target: 100, status: 'On Track'  },
  { objective: 'Customer Satisfaction NPS',  progress: 61, target: 100, status: 'At Risk'   },
  { objective: 'Product Releases Q2',        progress: 88, target: 100, status: 'On Track'  },
  { objective: 'Hiring Plan Q2',             progress: 55, target: 100, status: 'Behind'    },
  { objective: 'Training Completion 80%',    progress: 67, target: 100, status: 'On Track'  },
  { objective: 'Employee Satisfaction 80%',  progress: 82, target: 100, status: 'Achieved'  },
]

const kpiData = [
  { name: 'Sales Revenue',      actual: 4200000, target: 5000000, pct: 84  },
  { name: 'Customer Retention', actual: 92,      target: 95,      pct: 97  },
  { name: 'Project Delivery',   actual: 87,      target: 90,      pct: 97  },
  { name: 'Cost Efficiency',    actual: 78,      target: 85,      pct: 92  },
  { name: 'Employee Engagement',actual: 78,      target: 80,      pct: 97  },
  { name: 'Compliance Score',   actual: 94,      target: 95,      pct: 99  },
]

const ratingDistribution = [
  { rating: 'Outstanding', count: 100,  pct: 8,  color: '#10b981' },
  { rating: 'Exceeds',     count: 275,  pct: 22, color: '#3b82f6' },
  { rating: 'Meets',       count: 600,  pct: 48, color: '#8b5cf6' },
  { rating: 'Below',       count: 212,  pct: 17, color: '#f59e0b' },
  { rating: 'Unsat.',      count: 63,   pct: 5,  color: '#ef4444' },
]

const radarData = [
  { subject: 'Leadership',     teamAvg: 80, target: 75, topPerformer: 95 },
  { subject: 'Technical',      teamAvg: 85, target: 80, topPerformer: 98 },
  { subject: 'Communication',  teamAvg: 72, target: 75, topPerformer: 88 },
  { subject: 'Teamwork',       teamAvg: 90, target: 80, topPerformer: 92 },
  { subject: 'Punctuality',    teamAvg: 88, target: 85, topPerformer: 96 },
  { subject: 'Innovation',     teamAvg: 76, target: 80, topPerformer: 90 },
]

const performanceTrend = [
  { quarter: 'Q1-25', avgScore: 78, topPct: 28 },
  { quarter: 'Q2-25', avgScore: 80, topPct: 30 },
  { quarter: 'Q3-25', avgScore: 79, topPct: 29 },
  { quarter: 'Q4-25', avgScore: 81, topPct: 31 },
  { quarter: 'Q1-26', avgScore: 80, topPct: 29 },
  { quarter: 'Q2-26', avgScore: 82, topPct: 30 },
]

const pipEmployees = [
  { name: 'Anon-IT-03',   dept: 'IT',      startDate: 'Apr 1',  endDate: 'Jun 30', week: 10, issue: 'Deadline misses',        progress: 45 },
  { name: 'Anon-Fin-07',  dept: 'Finance', startDate: 'Mar 15', endDate: 'Jun 14', week: 12, issue: 'Accuracy concerns',       progress: 62 },
  { name: 'Anon-Sal-12',  dept: 'Sales',   startDate: 'May 1',  endDate: 'Jul 31', week: 5,  issue: 'Target achievement 40%',  progress: 35 },
  { name: 'Anon-Ops-08',  dept: 'Ops',     startDate: 'Feb 1',  endDate: 'May 31', week: 17, issue: 'Attendance + quality',    progress: 78 },
  { name: 'Anon-HR-02',   dept: 'HR',      startDate: 'Apr 15', endDate: 'Jul 14', week: 8,  issue: 'Task completion rate',    progress: 55 },
]

const feedbackData = [
  { from: 'Manager',   score: 82, responses: 1250, color: '#3b82f6' },
  { from: 'Peers',     score: 78, responses: 3100, color: '#8b5cf6' },
  { from: 'Reports',   score: 85, responses: 620,  color: '#10b981' },
  { from: 'Self',      score: 80, responses: 1250, color: '#f59e0b' },
]

const deptPerformance = [
  { dept: 'HR',         avg: 85, headcount: 180, top: 32, meets: 58, below: 10 },
  { dept: 'IT',         avg: 83, headcount: 320, top: 31, meets: 48, below: 21 },
  { dept: 'Finance',    avg: 80, headcount: 210, top: 28, meets: 52, below: 20 },
  { dept: 'Operations', avg: 77, headcount: 280, top: 24, meets: 49, below: 27 },
  { dept: 'Sales',      avg: 75, headcount: 260, top: 22, meets: 46, below: 32 },
]

const aiInsights = [
  { color: '#10b981', label: 'High Performers Identified', text: '8 employees identified as HiPo — ready for leadership track. Recommend fast-track promotion review in Q3.' },
  { color: '#f59e0b', label: 'OKR At Risk',               text: '"Customer Satisfaction NPS" at 61% — 14% below target. Needs immediate intervention plan.' },
  { color: '#ef4444', label: 'PIP Completion Risk',        text: '3 of 5 PIP employees showing <50% improvement. Consider formal review before end-date.' },
  { color: '#3b82f6', label: 'Sales Performance Gap',      text: 'Sales dept trailing by 25% vs target. Manager coaching sessions recommended in Q3.' },
]

const statusColor = { 'On Track': 'green', 'Achieved': 'green', 'At Risk': 'yellow', 'Behind': 'red' }
const statusIcon  = { 'On Track': '🟢', 'Achieved': '✅', 'At Risk': '🟡', 'Behind': '🔴' }

// ── Appraisal Circle ─────────────────────────────────────────
function AppraisalGauge({ pct, total, completed }) {
  const circumference = 251.2
  const offset = circumference - (pct / 100) * circumference
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <svg viewBox="0 0 100 100" width="120" height="120" style={{ display: 'block', margin: '0 auto' }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="10"
          strokeDasharray={`${circumference * pct / 100} ${circumference}`}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{pct||0}%</text>
        <text x="50" y="58" textAnchor="middle" fontSize="8"  fill="#94a3b8">completed</text>
      </svg>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>

        {completed} / {total} reviews completed
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>
        Probation max: 6 months (Nepal Labour Act)
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

export default function PerformanceSnapshot() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const [msg, setMsg] = useState('')
  const notify = (m) => { setMsg(m); setTimeout(()=>setMsg(''),3000) }
  const { t, cc } = useApp()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedDept, setSelectedDept] = useState('All')

  useEffect(()=>{
    const {token,slug,valid} = _getTenantCtx()
    if(!valid){setApiLoading(false);return}
    setApiLoading(true);setApiError(null)
    fetch('/api/v1/performance/snapshot',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{const p=d.snapshot||d.data||d;if(p)setApiData(p)})
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div>
      <PageTitle
        title="Performance Snapshot"
        sub="Continuous feedback, OKR tracking, 360° reviews, KPI achievement, PIP management & competency assessment."
        badge="Q2 2026"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="🎯" label="Appraisal Completion" value="73%"  change="912/1250 reviews"    up  accent="#3b82f6" />
        <StatCard icon="📊" label="Avg Performance Score" value="82%" change="+2% vs last quarter"  up  accent="#10b981" />
        <StatCard icon="⚠️" label="PIP Active"            value="5"   change="needs monitoring"     up={false} accent="#ef4444" />
        <StatCard icon="⭐" label="Outstanding Performers" value="100" change="8% of workforce"     up  accent="#f59e0b" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',  label: '📊 Overview'   },
          { id: 'okr',       label: '🎯 OKR'        },
          { id: 'feedback',  label: '💬 360° Feedback'},
          { id: 'pip',       label: '⚠️ PIP'        },
          { id: 'dept',      label: '🏢 By Dept'    },
          { id: 'ai',        label: '🧠 AI Insights' },
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
            {/* Appraisal Gauge */}
            <Card title="Appraisal Completion" subtitle="Q2 2026 review cycle">
              <AppraisalGauge pct={73} total={1250} completed={912} />
            </Card>

            {/* Rating Distribution */}
            <Card title="Rating Distribution" subtitle="5-point performance scale">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="rating" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v, n) => [`${v}%`, 'Share']} />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]} name="%" label={{ position: 'top', fontSize: 9, fill: '#64748b' }}>
                    {ratingDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Performance Trend */}
            <Card title="Performance Score Trend" subtitle="Quarterly avg score trend">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[70, 90]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2.5} name="Avg Score" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="topPct"   stroke="#10b981" strokeWidth={2}   name="Top % (Outstanding+Exceeds)" strokeDasharray="4 4" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* KPI Achievement */}
          <Card title="Key Performance Indicators — Q2 2026" subtitle="Company-wide KPI achievement vs targets">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
              {kpiData.map((k, i) => (
                <div key={i} className="py-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium">{k.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{(k.pct||0)}%</span>
                      <Pill color={k.pct >= 98 ? 'green' : k.pct >= 92 ? 'yellow' : 'red'}>
                        {k.pct >= 98 ? 'On Track' : k.pct >= 92 ? 'Close' : 'Behind'}
                      </Pill>
                    </div>
                  </div>
                  <ProgressBar value={(k.pct||0)} color={k.pct >= 98 ? '#10b981' : k.pct >= 92 ? '#f59e0b' : '#ef4444'} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── OKR ── */}
      {activeTab === 'okr' && (
        <div>
          <Card title="OKR Progress — Q2 2026" subtitle="Objectives and Key Results — company-wide tracking">
            {okrData.map((o, i) => (
              <div key={i} className="py-3 border-b border-gray-50 last:border-none">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {statusIcon[o.status]} {o.objective}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className="text-sm font-black text-gray-900">{o.progress}%</span>
                    <Pill color={statusColor[o.status]}>{o.status}</Pill>
                  </div>
                </div>
                <ProgressBar
                  value={o.progress}
                  color={o.status === 'Achieved' || o.status === 'On Track' ? '#10b981' : o.status === 'At Risk' ? '#f59e0b' : '#ef4444'}
                />
              </div>
            ))}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Achieved',  count: okrData.filter(o => o.status === 'Achieved').length,  color: 'green'  },
              { label: 'On Track',  count: okrData.filter(o => o.status === 'On Track').length,  color: 'blue'   },
              { label: 'At Risk',   count: okrData.filter(o => o.status === 'At Risk').length,   color: 'yellow' },
              { label: 'Behind',    count: okrData.filter(o => o.status === 'Behind').length,    color: 'red'    },
            ].filter(s => s.count > 0).map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: s.color === 'green' ? '#10b981' : s.color === 'blue' ? '#3b82f6' : s.color === 'yellow' ? '#f59e0b' : '#ef4444', marginBottom: 4 }}>
                  {s.count}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  OKRs {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 360 FEEDBACK ── */}
      {activeTab === 'feedback' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* 360 Scores */}
            <Card title="360° Feedback Scores" subtitle="Average scores by feedback source — Q2 2026">
              {feedbackData.map((f, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: f.color }} />
                      <span className="text-gray-700 font-medium">From {f.from}</span>
                      <span className="text-gray-400">({f.responses} responses)</span>
                    </div>
                    <span className="font-bold text-gray-900">{f.score}/100</span>
                  </div>
                  <ProgressBar value={f.score} color={f.color} />
                </div>
              ))}
              <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                📊 All 360° feedback is anonymized — individual responses are not visible to reviewees.
              </div>
            </Card>

            {/* Competency Radar */}
            <Card title="Competency Assessment Radar" subtitle="Team avg vs target vs top performer">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar name="Team Avg"     dataKey="teamAvg"     stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  <Radar name="Target"       dataKey="target"      stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.10} />
                  <Radar name="Top Performer"dataKey="topPerformer"stroke="#10b981" fill="#10b981" fillOpacity={0.05} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Continuous Feedback */}
          <Card title="Recent Continuous Feedback" subtitle="Manager-to-employee feedback — last 7 days">
            {[
              { from: 'Bikram Shrestha (Mgr)', to: 'Ram Bahadur Thapa',  type: 'Positive',     msg: 'Excellent work on the API migration project. Delivered 2 days ahead of schedule.',  time: '2 days ago' },
              { from: 'Anita Gurung (Mgr)',    to: 'Sita Sharma',        type: 'Coaching',     msg: 'Focus on communication with cross-functional teams. Let\'s discuss in next 1-on-1.', time: '3 days ago' },
              { from: 'Rajesh Sharma (CEO)',   to: 'Finance Team',       type: 'Recognition',  msg: 'Exceptional Q1 reporting — audit-ready documentation. Well done team!',             time: '4 days ago' },
              { from: 'HR Manager',            to: 'Operations Lead',    type: 'Development',  msg: 'Enrolled in Leadership Excellence Program. Complete by Aug 2026.',                   time: '5 days ago' },
            ].map((f, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-gray-50 last:border-none">
                <div style={{
                  padding: '3px 8px', borderRadius: 20, height: 'fit-content',
                  fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2,
                  background: f.type === 'Positive' || f.type === 'Recognition' ? '#f0fdf4' : f.type === 'Coaching' ? '#fffbeb' : '#eff6ff',
                  color:      f.type === 'Positive' || f.type === 'Recognition' ? '#15803d' : f.type === 'Coaching' ? '#b45309' : '#1d4ed8',
                }}>
                  {f.type}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-gray-800 mb-0.5">{f.from} → {f.to}</div>
                  <div className="text-xs text-gray-600 italic">"{f.msg}"</div>
                  <div className="text-xs text-gray-400 mt-1">{f.time}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── PIP ── */}
      {activeTab === 'pip' && (
        <div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <div className="text-xs font-bold text-amber-800">⚠️ Performance Improvement Plan (PIP) — Active Cases</div>
            <div className="text-xs text-amber-700 mt-1">
              All PIP records are strictly confidential. Names are anonymized in this view. Access restricted to HR Manager and concerned Department Head only.
            </div>
          </div>

          <Card title="Active PIP Cases — Q2 2026" subtitle="Anonymized employee performance improvement tracking">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Employee (Anon)', 'Department', 'Start Date', 'End Date', 'Week', 'Issue', 'Progress', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipEmployees.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 text-xs font-bold text-gray-800">{p.name}</td>
                    <td className="py-3 text-xs text-gray-500">{p.dept}</td>
                    <td className="py-3 text-xs text-gray-500 font-mono">{p.startDate}</td>
                    <td className="py-3 text-xs text-gray-500 font-mono">{p.endDate}</td>
                    <td className="py-3 text-xs font-bold text-gray-800">Wk {p.week}</td>
                    <td className="py-3 text-xs text-gray-600 max-w-32">{p.issue}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2" style={{ minWidth: 80 }}>
                        <ProgressBar value={p.progress} color={p.progress >= 70 ? '#10b981' : p.progress >= 50 ? '#f59e0b' : '#ef4444'} />
                        <span className="text-xs font-bold text-gray-800 w-8">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <Pill color={p.progress >= 70 ? 'green' : p.progress >= 50 ? 'yellow' : 'red'}>
                        {p.progress >= 70 ? 'Improving' : p.progress >= 50 ? 'Moderate' : 'At Risk'}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card title="PIP Outcomes — Historical" subtitle="Past PIP completions and results">
              {[
                { outcome: 'Successfully Improved', count: 14, color: '#10b981', pct: 58 },
                { outcome: 'Extended PIP',          count: 5,  color: '#f59e0b', pct: 21 },
                { outcome: 'Terminated',            count: 5,  color: '#ef4444', pct: 21 },
              ].map((o, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium">{o.outcome}</span>
                    <span className="font-bold text-gray-900">{o.count} cases ({(o.pct||0)}%)</span>
                  </div>
                  <ProgressBar value={(o.pct||0)} color={o.color} />
                </div>
              ))}
            </Card>

            <Card title="PIP Guidelines — Nepal Labour Act" subtitle="Legal framework for performance management">
              {[
                { label: 'Probation period max',       value: '6 months',    ok: true  },
                { label: 'PIP documentation required', value: 'Mandatory',   ok: true  },
                { label: 'Termination notice period',  value: '30 days',     ok: true  },
                { label: 'Written warning issued',     value: 'Before PIP',  ok: true  },
                { label: 'HR witness at review',       value: 'Required',    ok: true  },
                { label: 'Employee appeal right',      value: 'Guaranteed',  ok: true  },
              ].map((c, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-none text-xs">
                  <span className="text-gray-600">{c.label}</span>
                  <Pill color={c.ok ? 'green' : 'red'}>{c.value}</Pill>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── BY DEPT ── */}
      {activeTab === 'dept' && (
        <div>
          <Card title="Department Performance Summary" subtitle="Average performance score and rating breakdown">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="top"    stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Outstanding+Exceeds %" />
                <Bar dataKey="meets"  stackId="a" fill="#3b82f6" name="Meets %" />
                <Bar dataKey="below"  stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Below+Unsat %" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="mt-4">
            <Card title="Department Performance Details">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Department', 'Avg Score', 'Headcount', 'Top %', 'Meets %', 'Below %', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deptPerformance.map((d, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 text-xs font-bold text-gray-800">{d.dept}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black" style={{ color: d.avg >= 83 ? '#10b981' : d.avg >= 78 ? '#f59e0b' : '#ef4444' }}>{d.avg}%</span>
                          <ProgressBar value={d.avg} color={d.avg >= 83 ? '#10b981' : d.avg >= 78 ? '#f59e0b' : '#ef4444'} />
                        </div>
                      </td>
                      <td className="py-3 text-xs text-gray-600">{d.headcount}</td>
                      <td className="py-3 text-xs font-bold text-green-600">{d.top}%</td>
                      <td className="py-3 text-xs font-bold text-blue-600">{d.meets}%</td>
                      <td className="py-3 text-xs font-bold text-red-500">{d.below}%</td>
                      <td className="py-3">
                        <Pill color={d.avg >= 83 ? 'green' : d.avg >= 78 ? 'yellow' : 'red'}>
                          {d.avg >= 83 ? 'Excellent' : d.avg >= 78 ? 'Good' : 'Needs Attention'}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {activeTab === 'ai' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <AIInsightCard insights={aiInsights.slice(0, 2)} title="🎯 Performance AI Analysis" />
            <AIInsightCard insights={aiInsights.slice(2, 4)} title="⚠️ Risk & Opportunity Signals" />
          </div>

          <Card title="AI-Recommended Performance Actions" subtitle="Priority action plan for Q3 2026">
            {[
              { icon: '⭐', action: 'Fast-track promotion review for 8 HiPo employees',           dept: 'All',     priority: 'High',   timeline: 'Jul 2026' },
              { icon: '💬', action: 'Manager coaching for Sales team — target achievement gap',     dept: 'Sales',   priority: 'High',   timeline: 'Jun 2026' },
              { icon: '🎓', action: 'Launch Leadership Excellence Program for G4-G5 employees',    dept: 'All',     priority: 'Medium', timeline: 'Aug 2026' },
              { icon: '📋', action: 'Review 3 at-risk PIP cases before end-date',                 dept: 'IT/Sales/HR',priority: 'High', timeline: 'Jun 30'  },
              { icon: '🏆', action: 'Implement Q3 recognition program for top performers',         dept: 'All',     priority: 'Medium', timeline: 'Jul 2026' },
              { icon: '📊', action: 'OKR recalibration session — Customer NPS & Hiring Plan',     dept: 'All',     priority: 'Medium', timeline: 'Jun 2026' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-none">
                <span className="text-xl flex-shrink-0">{a.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{a.action}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Dept: {a.dept} · Timeline: {a.timeline}</div>
                </div>
                <Pill color={a.priority === 'High' ? 'red' : 'yellow'}>{a.priority}</Pill>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
