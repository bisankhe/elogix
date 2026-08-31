// ============================================================
// FILE: src/components/dashboard/snapshots/RecruitmentSnapshot.jsx
// PURPOSE: Recruitment Snapshot — talent pipeline funnel,
//          time-to-hire, cost-per-hire, offer acceptance,
//          source of hire, Nepal work permit compliance
// ============================================================

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useApp }        from '../../../context/AppContext.jsx'
import { StatCard }      from '../../shared/StatCard.jsx'
import { Card }          from '../../shared/Card.jsx'
import { Pill }          from '../../shared/Pill.jsx'
import { ProgressBar }   from '../../shared/ProgressBar.jsx'
import { PageTitle }     from '../../shared/PageTitle.jsx'
import { AIInsightCard } from '../../shared/AIInsightCard.jsx'

// ── Mock Data ────────────────────────────────────────────────
const hiringFunnelData = [
  { name: 'Applied',     value: 145, fill: '#3b82f6', convRate: 100  },
  { name: 'Screened',    value: 89,  fill: '#8b5cf6', convRate: 61.4 },
  { name: 'Interviewed', value: 34,  fill: '#f59e0b', convRate: 38.2 },
  { name: 'Offered',     value: 18,  fill: '#10b981', convRate: 52.9 },
  { name: 'Joined',      value: 12,  fill: '#22c55e', convRate: 66.7 },
]

const sourceOfHireData = [
  { name: 'Job Portals (Merojob/Jobsnepal)', value: 35, color: '#3b82f6' },
  { name: 'Employee Referral',               value: 28, color: '#8b5cf6' },
  { name: 'Recruitment Agencies',            value: 22, color: '#10b981' },
  { name: 'LinkedIn',                        value: 10, color: '#f59e0b' },
  { name: 'Walk-in / Campus',               value: 5,  color: '#ef4444' },
]

const timeToHireTrend = [
  { month: 'Jan', days: 24 }, { month: 'Feb', days: 22 },
  { month: 'Mar', days: 20 }, { month: 'Apr', days: 19 },
  { month: 'May', days: 18 }, { month: 'Jun', days: 17 },
]

const costPerHireTrend = [
  { month: 'Jan', cost: 15200 }, { month: 'Feb', cost: 14800 },
  { month: 'Mar', cost: 13900 }, { month: 'Apr', cost: 13200 },
  { month: 'May', cost: 12400 }, { month: 'Jun', cost: 12100 },
]

const openPositions = [
  { id: 'REQ-001', title: 'Senior Developer',     dept: 'IT',      posted: 'May 20', candidates: 32, stage: 'Interview', priority: 'Urgent',  daysOpen: 15 },
  { id: 'REQ-002', title: 'Finance Analyst',      dept: 'Finance', posted: 'May 25', candidates: 18, stage: 'Screening', priority: 'Normal',  daysOpen: 10 },
  { id: 'REQ-003', title: 'Sales Executive × 3',  dept: 'Sales',   posted: 'May 28', candidates: 45, stage: 'Applied',   priority: 'Urgent',  daysOpen: 7  },
  { id: 'REQ-004', title: 'HR Coordinator',        dept: 'HR',      posted: 'Jun 1',  candidates: 22, stage: 'Screening', priority: 'Normal',  daysOpen: 3  },
  { id: 'REQ-005', title: 'Operations Manager',    dept: 'Ops',     posted: 'Jun 2',  candidates: 8,  stage: 'Applied',   priority: 'Normal',  daysOpen: 2  },
  { id: 'REQ-006', title: 'IT Support Engineer',   dept: 'IT',      posted: 'Jun 3',  candidates: 12, stage: 'Applied',   priority: 'Normal',  daysOpen: 1  },
]

const recentHires = [
  { name: 'Ram Bahadur Thapa',  pos: 'Senior Developer', dept: 'IT',      source: 'Referral',   joined: 'May 20', score: 88 },
  { name: 'Sita Sharma',        pos: 'HR Executive',     dept: 'HR',      source: 'Job Portal', joined: 'May 18', score: 85 },
  { name: 'Hari Prasad KC',     pos: 'Accountant',       dept: 'Finance', source: 'Agency',     joined: 'May 15', score: 79 },
  { name: 'Gita Rai',           pos: 'Team Lead',        dept: 'Ops',     source: 'LinkedIn',   joined: 'May 12', score: 91 },
  { name: 'Bikram Limbu',       pos: 'Sales Executive',  dept: 'Sales',   source: 'Walk-in',    joined: 'May 10', score: 76 },
]

const stageColor = {
  Applied:   'gray',
  Screening: 'blue',
  Interview: 'yellow',
  Offered:   'purple',
  Joined:    'green',
}

const aiInsights = [
  { color: '#3b82f6', label: 'Time-to-Hire Improving',    text: 'Average time-to-hire reduced from 24 to 17 days — 29% improvement YTD. Streamlined interview process is key driver.' },
  { color: '#10b981', label: 'Best Source: Referrals',    text: 'Employee referrals yield highest quality-of-hire (avg score 89) and 40% lower cost-per-hire vs job portals.' },
  { color: '#f59e0b', label: 'Sales Pipeline Risk',       text: 'Sales Executive × 3 roles have 45 applicants but only 38% meet minimum criteria. Revisit JD requirements.' },
  { color: '#ef4444', label: 'Senior Dev Talent Shortage',text: 'Senior Developer market is tight — only 22% of applicants qualify. Consider internal promotion + training track.' },
]

// ── Funnel Stage Bar ─────────────────────────────────────────
function FunnelStage({ stage, value, total, fill, convRate }) {
  const width = (value / total) * 100
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>

        <span style={{ color: '#475569', fontWeight: 500 }}>{stage}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, color: '#0f172a' }}>{value}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>({convRate}%)</span>
        </div>
      </div>
      <div style={{ height: 28, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          width: `${width}%`, height: '100%',
          background: fill, borderRadius: 6,
          display: 'flex', alignItems: 'center', paddingLeft: 10,
          transition: 'width .6s ease',
        }}>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{value} candidates</span>
        </div>
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

export default function RecruitmentSnapshot() {
  const [apiData,setApiData]=useState(null)
  const [apiLoading,setApiLoading]=useState(true)
  const [apiError,setApiError]=useState(null)
  const { t, cc } = useApp()
  const [activeTab, setActiveTab] = useState('overview')

  const fmt = (val) => {
    if (val >= 1000) return `${cc.symbol}${(val / 1000).toFixed(1)}K`
    return `${cc.symbol}${val}`
  }

  useEffect(()=>{
    const {token,slug,valid} = _getTenantCtx()
    if(!valid){setApiLoading(false);return}
    setApiLoading(true);setApiError(null)
    fetch('/api/v1/recruitment/snapshot',{headers:{'Authorization':`Bearer ${token}`,'X-Tenant-Slug':slug,'Content-Type':'application/json'}})
      .then(r=>{if(r.status===401){window.dispatchEvent(new CustomEvent('elogix:session-expired'));throw new Error('Session expired')}if(!r.ok)throw new Error(`Error ${r.status}`);return r.json()})
      .then(d=>{const p=d.snapshot||d.data||d;if(p)setApiData(p)})
      .catch(err=>setApiError(err.message))
      .finally(()=>setApiLoading(false))
  },[])

  return (
    <div>
      <PageTitle
        title="Recruitment Snapshot"
        sub="Talent pipeline funnel, time-to-hire, cost-per-hire, offer acceptance & Nepal work permit compliance."
        badge="ATS Live"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="⏱️" label="Avg Time to Hire"   value="17 days"   change="vs 24d benchmark"  up  accent="#3b82f6" />
        <StatCard icon="💰" label="Cost per Hire"      value={fmt(12100)} change="↓ 20% vs Jan"     up  accent="#10b981" />
        <StatCard icon="📊" label="Offer Acceptance"   value="78%"        change="Industry avg 72%"  up  accent="#f59e0b" />
        <StatCard icon="💼" label="Open Requisitions"  value="18"         change="3 urgent fill"     up={false} accent="#ef4444" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'overview',   label: '📊 Overview'     },
          { id: 'pipeline',   label: '🔄 Pipeline'     },
          { id: 'vacancies',  label: '💼 Vacancies'    },
          { id: 'analytics',  label: '📈 Analytics'    },
          { id: 'compliance', label: '⚖️ Compliance'   },
          { id: 'ai',         label: '🧠 AI Insights'  },
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
            {/* Funnel Visual */}
            <div className="lg:col-span-2">
              <Card title="Hiring Funnel — This Month" subtitle="Applied → Screened → Interviewed → Offered → Joined (conversion rates)">
                {hiringFunnelData.map((s, i) => (
                  <FunnelStage key={i} stage={s.name} value={s.value} total={hiringFunnelData[0].value} fill={s.fill} convRate={i === 0 ? 100 : ((s.value / hiringFunnelData[i - 1].value) * 100).toFixed(1)} />
                ))}
                <div className="mt-4 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                  📊 Overall funnel conversion: <strong>8.3%</strong> (12 hired from 145 applied)
                </div>
              </Card>
            </div>

            {/* Source of Hire */}
            <Card title="Source of Hire" subtitle="Channel effectiveness">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourceOfHireData} cx="50%" cy="50%" outerRadius={68} dataKey="value">
                    {sourceOfHireData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                </PieChart>
              </ResponsiveContainer>
              {sourceOfHireData.map((d, i) => (
                <div key={i} className="flex justify-between text-xs mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }} />
                    <span className="text-gray-600 truncate" style={{ maxWidth: 130 }}>{d.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{d.value}%</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Recent Hires */}
          <Card title="Recent Hires — Quality of Hire" subtitle="Last 30 days — onboarded employees with assessment scores">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Employee', 'Position', 'Department', 'Source', 'Joined', 'Quality Score'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentHires.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: `hsl(${i * 60}, 60%, 50%)` }}>
                          {r.name[0]}
                        </div>
                        <span className="text-xs font-semibold text-gray-800">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs text-gray-600">{r.pos}</td>
                    <td className="py-2.5 text-xs text-gray-600">{r.dept}</td>
                    <td className="py-2.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.source}</span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-500 font-mono">{r.joined}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={r.score} color={r.score >= 85 ? '#10b981' : r.score >= 75 ? '#f59e0b' : '#ef4444'} />
                        <span className="text-xs font-bold" style={{ color: r.score >= 85 ? '#10b981' : r.score >= 75 ? '#f59e0b' : '#ef4444' }}>
                          {r.score}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── PIPELINE ── */}
      {activeTab === 'pipeline' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title="Pipeline by Stage" subtitle="Current candidates across all open roles">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hiringFunnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Candidates">
                    {hiringFunnelData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Pipeline Summary" subtitle="Stage-by-stage candidate count">
              {hiringFunnelData.map((s, i) => (
                <div key={i} className="py-3 border-b border-gray-50 last:border-none">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ background: s.fill }} />
                      <span className="text-sm font-bold text-gray-800">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black" style={{ color: s.fill }}>{s.value}</span>
                      <span className="text-xs text-gray-400">candidates</span>
                    </div>
                  </div>
                  <ProgressBar value={(s.value / hiringFunnelData[0].value) * 100} color={s.fill} />
                  {i > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Conversion from previous stage: {((s.value / hiringFunnelData[i - 1].value) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </div>

          {/* Stage Drop-off Analysis */}
          <Card title="Stage Drop-off Analysis" subtitle="Where candidates are being lost — conversion improvement opportunities">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {[
                { from: 'Applied→Screened',    lost: 56,  pct: 38.6, reason: 'CV not meeting minimum criteria', improvement: 'AI resume pre-screening' },
                { from: 'Screened→Interview',  lost: 55,  pct: 61.8, reason: 'Phone screen failures',           improvement: 'Better JD clarity'        },
                { from: 'Interview→Offered',   lost: 16,  pct: 47.1, reason: 'Technical assessment failures',   improvement: 'Skill-based assessment'    },
                { from: 'Offered→Joined',      lost: 6,   pct: 33.3, reason: 'Counter-offers accepted',         improvement: 'Competitive offer package' },
              ].map((d, i) => (
                <div key={i} style={{ background: '#fef9f0', border: '1px solid #fed7aa', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', marginBottom: 4 }}>{d.from}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>{d.lost} lost</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{(d.pct||0)}% drop-off rate</div>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>Reason: {d.reason}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6' }}>Fix: {d.improvement}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── VACANCIES ── */}
      {activeTab === 'vacancies' && (
        <Card title="Open Vacancies — All Active Requisitions" subtitle="Current open positions with pipeline status">
          <div className="flex gap-2 mb-3 flex-wrap">
            {['All', 'Urgent', 'IT', 'Finance', 'Sales', 'HR', 'Ops'].map(f => (
              <button key={f}
                style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#1d4ed8' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b' }}>
                {f}
              </button>
            ))}
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {['Req ID', 'Position', 'Dept', 'Posted', 'Candidates', 'Stage', 'Days Open', 'Priority'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openPositions.map((p, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                  <td className="py-2.5 text-xs font-mono text-gray-500">{p.id}</td>
                  <td className="py-2.5 text-xs font-bold text-gray-800">{p.title}</td>
                  <td className="py-2.5 text-xs text-gray-600">{p.dept}</td>
                  <td className="py-2.5 text-xs text-gray-500 font-mono">{p.posted}</td>
                  <td className="py-2.5 text-xs font-bold text-gray-800">{p.candidates}</td>
                  <td className="py-2.5"><Pill color={stageColor[p.stage]}>{p.stage}</Pill></td>
                  <td className="py-2.5">
                    <span className={`text-xs font-bold ${p.daysOpen > 10 ? 'text-red-500' : 'text-gray-700'}`}>
                      {p.daysOpen}d
                    </span>
                  </td>
                  <td className="py-2.5">
                    <Pill color={p.priority === 'Urgent' ? 'red' : 'gray'}>{p.priority}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── ANALYTICS ── */}
      {activeTab === 'analytics' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card title="Time-to-Hire Trend (Days)" subtitle="Monthly average — target: ≤15 days">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timeToHireTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[10, 30]} unit=" days" />
                  <Tooltip formatter={v => [`${v} days`, 'Avg Time-to-Hire']} />
                  <Line type="monotone" dataKey="days" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} name="Days" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-gray-400">Target: ≤15 days · Industry benchmark: 24 days · Current: 17 days</div>
            </Card>

            <Card title={`Cost per Hire Trend (${cc.code})`} subtitle="Monthly average — target: under 10K">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={costPerHireTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${cc.symbol}${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={v => [`${cc.symbol}${v.toLocaleString()}`, 'Cost per Hire']} />
                  <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Cost" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 text-xs text-gray-400">20% reduction YTD · Referral program driving cost savings</div>
            </Card>
          </div>

          {/* Key Metrics Summary */}
          <Card title="Recruitment Analytics Summary — Q2 2026">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Applicants',     value: '386', change: '+12% vs Q1',  up: true,  color: '#3b82f6' },
                { label: 'Total Hires',          value: '24',  change: '8 via referral',up: true, color: '#10b981' },
                { label: 'Offer Acceptance Rate',value: '78%', change: '+6% vs Q1',   up: true,  color: '#8b5cf6' },
                { label: 'Quality of Hire Avg',  value: '83/100', change: 'Strong',   up: true,  color: '#f59e0b' },
                { label: 'Time to Fill (Avg)',   value: '17d', change: '-7d vs Q1',   up: true,  color: '#10b981' },
                { label: 'Cost per Hire',        value: `${cc.symbol}12.1K`, change: '-20% YTD', up: true, color: '#3b82f6' },
                { label: 'Internal Promotions',  value: '8',   change: '33% fill rate',up: true, color: '#8b5cf6' },
                { label: 'Diversity Hires',      value: '42%', change: 'Female hires', up: true, color: '#f97316' },
              ].map((m, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${m.color}` }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginTop: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: m.up ? '#10b981' : '#ef4444', marginTop: 2, fontWeight: 600 }}>
                    {m.up ? '▲' : '▼'} {m.change}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── COMPLIANCE ── */}
      {activeTab === 'compliance' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Nepal Labour Act — Recruitment Compliance" subtitle="Work permit, foreign worker limits & hiring regulations">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                <div className="text-xs font-bold text-green-700 mb-1">✅ Recruitment Compliance — All Checks Passed</div>
                <div className="text-xs text-green-600">All recruitment practices comply with Nepal Labour Act 2017 and Labour Rules 2018.</div>
              </div>
              {[
                { label: 'Foreign workers (max 5%)',              value: '2.1% (26 of 1250)', ok: true  },
                { label: 'Work permit — all foreign staff',       value: 'Valid',              ok: true  },
                { label: 'Work permit dept (DoLE)',               value: 'Approved',           ok: true  },
                { label: 'Equal opportunity hiring',              value: 'Policy active',      ok: true  },
                { label: 'Non-discrimination policy',             value: 'Enforced',           ok: true  },
                { label: 'Background check — completed',          value: '100% new hires',     ok: true  },
                { label: 'Offer letter — legally compliant',      value: 'Template v3.2',      ok: true  },
                { label: 'Probation period stated in offer',      value: 'Max 6 months',       ok: true  },
                { label: 'Contract in Nepali & English',         value: 'Bilingual',          ok: true  },
                { label: 'SSF registration on joining',           value: 'Within 7 days',      ok: true  },
              ].map((c, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-none text-xs">
                  <span className="text-gray-600">{c.label}</span>
                  <Pill color={c.ok ? 'green' : 'red'}>{c.value}</Pill>
                </div>
              ))}
            </Card>

            <div className="space-y-4">
              <Card title="Foreign Worker Tracker" subtitle="Nepal law: max 5% of total workforce">
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ fontSize: 40, fontWeight: 900, color: '#10b981' }}>2.1%</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>26 of 1,250 employees</div>
                  <ProgressBar value={2.1 / 5 * 100} color="#10b981" />
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                    Remaining capacity: 37 more foreign workers allowed
                  </div>
                </div>
                <div className="mt-3">
                  {[
                    { country: 'India',         count: 12, permit: 'Valid' },
                    { country: 'Bangladesh',    count: 8,  permit: 'Valid' },
                    { country: 'Philippines',   count: 4,  permit: 'Valid' },
                    { country: 'Sri Lanka',     count: 2,  permit: 'Valid' },
                  ].map((f, i) => (
                    <div key={i} className="flex justify-between text-xs py-1.5 border-b border-gray-50 last:border-none">
                      <span className="text-gray-600">{f.country}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800">{f.count}</span>
                        <Pill color="green">{f.permit}</Pill>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Upcoming Work Permit Renewals">
                {[
                  { name: 'Anon-IND-01', expiry: 'Jul 15, 2026', daysLeft: 41, status: 'Renew Soon'  },
                  { name: 'Anon-BGD-03', expiry: 'Aug 2, 2026',  daysLeft: 59, status: 'Active'      },
                  { name: 'Anon-PHL-01', expiry: 'Jun 28, 2026', daysLeft: 24, status: 'Urgent'      },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-none">
                    <div>
                      <div className="text-xs font-bold text-gray-800">{r.name}</div>
                      <div className="text-xs text-gray-400">Expires: {r.expiry} ({r.daysLeft} days)</div>
                    </div>
                    <Pill color={r.daysLeft < 30 ? 'red' : r.daysLeft < 45 ? 'yellow' : 'green'}>{r.status}</Pill>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {activeTab === 'ai' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <AIInsightCard insights={aiInsights.slice(0, 2)} title="📊 Recruitment AI Analysis" />
            <AIInsightCard insights={aiInsights.slice(2, 4)} title="⚠️ Pipeline Risk Signals" />
          </div>

          <Card title="AI-Recommended Recruitment Actions" subtitle="Priority action plan for improving hiring efficiency">
            {[
              { icon: '🤖', action: 'Enable AI resume screening for Senior Developer role',       impact: 'High',   timeline: 'Immediate', saving: `-3 days TTH` },
              { icon: '👥', action: 'Launch structured employee referral program Q3',              impact: 'High',   timeline: 'Jul 2026',  saving: `-${cc.symbol}3.5K CPH` },
              { icon: '📋', action: 'Revise Sales Executive JD — too restrictive criteria',       impact: 'Medium', timeline: 'This week', saving: '+18 qualified CVs' },
              { icon: '🎓', action: 'Internal promotion track for Senior Dev shortage',            impact: 'High',   timeline: 'Q3 2026',   saving: `-${cc.symbol}8K CPH` },
              { icon: '💬', action: 'Improve counter-offer strategy for final-stage candidates',  impact: 'Medium', timeline: 'Jun 2026',  saving: '+5% acceptance' },
              { icon: '📊', action: 'A/B test job descriptions on Merojob vs LinkedIn',           impact: 'Low',    timeline: 'Q3 2026',   saving: '+15% apply rate' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-none">
                <span className="text-xl flex-shrink-0">{a.icon}</span>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-800">{a.action}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Timeline: {a.timeline} · Expected: {a.saving}</div>
                </div>
                <Pill color={a.impact === 'High' ? 'red' : a.impact === 'Medium' ? 'yellow' : 'green'}>
                  {a.impact}
                </Pill>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
