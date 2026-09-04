// ============================================================
// FILE: src/components/dashboard/snapshots/AIInsightsPage.jsx
// PURPOSE: AI Insights Center — attrition prediction,
//          salary optimization, seasonal forecasting,
//          ML model accuracy metrics
// ============================================================

import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from 'recharts'
import { StatCard }      from '../../shared/StatCard.jsx'
import { Card }          from '../../shared/Card.jsx'
import { Pill }          from '../../shared/Pill.jsx'
import { ProgressBar }   from '../../shared/ProgressBar.jsx'
import { PageTitle }     from '../../shared/PageTitle.jsx'
import { AIInsightCard } from '../../shared/AIInsightCard.jsx'

// ── Mock Data ───────────────────────────────────────────────
const turnoverPrediction = [
  { month: 'Jul', predicted: 7.8,  actual: 7.9  },
  { month: 'Aug', predicted: 8.1,  actual: 8.0  },
  { month: 'Sep', predicted: 8.4,  actual: 8.5  },
  { month: 'Oct', predicted: 10.2, actual: 10.4 },
  { month: 'Nov', predicted: 9.8,  actual: 9.6  },
  { month: 'Dec', predicted: 8.6,  actual: 8.7  },
  { month: 'Jan', predicted: 8.2,  actual: 8.3  },
  { month: 'Feb', predicted: 8.0,  actual: 7.9  },
  { month: 'Mar', predicted: 7.9,  actual: 8.0  },
  { month: 'Apr', predicted: 8.1,  actual: 8.1  },
  { month: 'May', predicted: 8.2,  actual: 8.2  },
  { month: 'Jun', predicted: 8.4,  actual: null  },
]

const attritionByDept = [
  { dept: 'IT',         risk: 14, color: '#ef4444' },
  { dept: 'Sales',      risk: 8,  color: '#f59e0b' },
  { dept: 'Finance',    risk: 5,  color: '#f59e0b' },
  { dept: 'HR',         risk: 2,  color: '#10b981' },
  { dept: 'Operations', risk: 6,  color: '#f59e0b' },
]

const salaryBandData = [
  { role: 'Sr. Developer', current: 90, market: 115, gap: 25 },
  { role: 'Finance Analyst',current: 58, market: 62,  gap: 4  },
  { role: 'Sales Exec',    current: 45, market: 48,   gap: 3  },
  { role: 'HR Coordinator',current: 38, market: 40,   gap: 2  },
  { role: 'Team Lead',     current: 75, market: 82,   gap: 7  },
]

const seasonalLeave = [
  { month: 'Jan', leave: 80  },
  { month: 'Feb', leave: 90  },
  { month: 'Mar', leave: 70  },
  { month: 'Apr', leave: 75  },
  { month: 'May', leave: 85  },
  { month: 'Jun', leave: 110 },
  { month: 'Jul', leave: 95  },
  { month: 'Aug', leave: 88  },
  { month: 'Sep', leave: 92  },
  { month: 'Oct', leave: 195, highlight: true }, // Dashain/Tihar spike
  { month: 'Nov', leave: 168, highlight: true },
  { month: 'Dec', leave: 105 },
]

const modelMetrics = [
  { model: 'Attrition Prediction',         accuracy: 87.3, lastTrained: 'May 28, 2026', status: 'Active'   },
  { model: 'Salary Recommendation',        accuracy: 91.2, lastTrained: 'May 28, 2026', status: 'Active'   },
  { model: 'Hiring Time Prediction',       accuracy: 84.6, lastTrained: 'May 20, 2026', status: 'Active'   },
  { model: 'Leave Pattern Detection',      accuracy: 79.8, lastTrained: 'May 15, 2026', status: 'Active'   },
  { model: 'Sentiment Analysis',           accuracy: 82.1, lastTrained: 'May 28, 2026', status: 'Active'   },
  { model: 'Performance Prediction',       accuracy: 76.4, lastTrained: 'Apr 30, 2026', status: 'Training' },
]

const radarCompetency = [
  { subject: 'Leadership',    A: 80, B: 65 },
  { subject: 'Technical',     A: 85, B: 70 },
  { subject: 'Communication', A: 72, B: 68 },
  { subject: 'Teamwork',      A: 90, B: 75 },
  { subject: 'Punctuality',   A: 88, B: 80 },
  { subject: 'Innovation',    A: 76, B: 60 },
]

const aiInsightsList = [
  { color: '#ef4444', label: 'High Attrition Risk',   text: '14 employees in IT show disengagement signals. Predicted exit within 60 days if unaddressed. Recommend immediate 1-on-1 and compensation review.' },
  { color: '#f59e0b', label: 'Cost Optimization',     text: 'Overtime in Finance is 23% above benchmark. Hiring 2 junior analysts would be ROI-positive by Month 3.' },
  { color: '#3b82f6', label: 'Market Salary Alert',   text: 'Senior Developer salaries rose 18% YoY in Nepal market. Current band (Rs 80k–100k) is below market (Rs 95k–130k).' },
  { color: '#10b981', label: 'Hiring Forecast Q3',    text: 'Based on growth trajectory, 28–35 new hires needed in Q3: IT (12), Sales (8), Operations (15).' },
  { color: '#8b5cf6', label: 'Seasonal Absence Alert',text: 'Historical data shows 23% leave spike during Dashain/Tihar (Oct–Nov). Pre-plan coverage and approval freeze period.' },
  { color: '#06b6d4', label: 'Engagement Signal',     text: "'Growth opportunities' rated 6.9/10 — below 7.5 threshold for 2 consecutive months. Launch mentorship program in Q3." },
]

// ── Custom Tooltip ───────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-gray-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>
      ))}
    </div>
  )
}

// ── Tab Button ───────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border-none cursor-pointer
        ${active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'bg-transparent text-gray-500 hover:text-gray-700'
        }`}
    >
      {children}
    </button>
  )
}

// ── Main Component ───────────────────────────────────────────

function _getSession() {
  try {
    return JSON.parse(
      sessionStorage.getItem('elogix_session') ||
      localStorage.getItem('elogix_session') || 'null'
    ) || {}
  } catch (_e) { return {} }
}
function _useAppFallback() {
  const s = _getSession()
  return {
    sub: s?.last_page || '', persona: s?.persona || s?.user?.role || 'employee',
    lang: s?.lang || 'en', currency: s?.currency || 'NPR',
    company: s?.company || {}, user: s?.user || {},
    darkMode: false, setDarkMode: () => {},
    navTo: (p) => window.dispatchEvent(new CustomEvent('elogix:nav', { detail: { page: p } })),
    switchPersona: () => {}, setShowNotif: () => {}, setShowAI: () => {},
    setSidebarOpen: () => {}, sidebarOpen: true,
    currentPersona: { id: s?.persona || 'employee', icon: '👤', color: '#7c3aed', label: '' },
  }
}

export default function AIInsightsPage() {
  const { t, cc } = _useAppFallback()
  const [activeTab, setActiveTab] = useState('attrition')

  return (
    <div>
      <PageTitle
        title="AI Insights Center"
        sub="ML-powered workforce intelligence — attrition prediction, salary optimization, seasonal forecasting & model accuracy."
        badge="🧠 AI Powered"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon="🔴" label="High Attrition Risk"  value="14 employees" change="IT Dept — act now" up={false} accent="#ef4444" />
        <StatCard icon="💰" label="Salary Gap Detected"  value="5 roles"       change="below market rate" up={false} accent="#f59e0b" />
        <StatCard icon="📅" label="Seasonal Leave Spike" value="Oct–Nov"        change="+23% predicted"   up={false} accent="#8b5cf6" />
        <StatCard icon="🎯" label="Model Avg Accuracy"   value="83.6%"          change="6 models active"  up accent="#10b981" />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 mb-4">
        {[
          { id: 'attrition',    label: '🔴 Attrition'   },
          { id: 'salary',       label: '💰 Salary'      },
          { id: 'seasonal',     label: '📅 Seasonal'    },
          { id: 'performance',  label: '🎯 Performance' },
          { id: 'models',       label: '🤖 AI Models'   },
        ].map(tab => (
          <TabBtn key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </TabBtn>
        ))}
      </div>

      {/* ── ATTRITION TAB ── */}
      {activeTab === 'attrition' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Turnover Prediction Chart */}
            <div className="lg:col-span-2">
              <Card title="Predictive Turnover Risk — 12 Months" subtitle="ML predicted vs. actual turnover % — Dashain spike visible in Oct">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={turnoverPrediction}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[7, 11]} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="actual"    stroke="#3b82f6" strokeWidth={2.5} name="Actual"    dot={{ r: 3 }} connectNulls={false} />
                    <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2}   name="Predicted" strokeDasharray="5 5" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Risk by Dept */}
            <Card title="Attrition Risk by Department" subtitle="Number of high-risk employees">
              {attritionByDept.map((d, i) => (
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{d.dept}</span>
                    <span className="font-bold text-gray-900">{d.risk} employees</span>
                  </div>
                  <ProgressBar value={(d.risk / 14) * 100} color={d.color} />
                </div>
              ))}
            </Card>
          </div>

          {/* AI Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AIInsightCard insights={aiInsightsList.slice(0, 2)} title="🚨 Attrition Predictions" />
            <AIInsightCard insights={aiInsightsList.slice(4, 6)} title="📊 Workforce Signals" />
            <Card title="Recommended Actions" subtitle="AI-generated action items">
              {[
                { icon: '💬', action: 'Schedule 1-on-1s with 14 IT employees',    priority: 'Urgent',  color: 'red'    },
                { icon: '💰', action: 'Review IT compensation against market band', priority: 'High',    color: 'yellow' },
                { icon: '🎓', action: 'Launch Q3 mentorship program',              priority: 'Medium',  color: 'blue'   },
                { icon: '📋', action: 'Create Oct–Nov leave coverage plan',         priority: 'Medium',  color: 'blue'   },
                { icon: '🏆', action: 'Implement peer recognition in Sales',        priority: 'Low',     color: 'green'  },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-none">
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-xs text-gray-700">{item.action}</span>
                  <Pill color={item.color}>{item.priority}</Pill>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── SALARY TAB ── */}
      {activeTab === 'salary' && (
        <div>
          <Card title={`Salary Band — Market vs Current (${cc.code} '000)`} subtitle="AI-powered market salary comparison — roles below market highlighted">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salaryBandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="k" />
                <YAxis dataKey="role" type="category" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={v => [`${cc.symbol}${v}k`]} />
                <Legend />
                <Bar dataKey="current" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Current Band" />
                <Bar dataKey="market"  fill="#10b981" radius={[0, 4, 4, 0]} name="Market Rate" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <AIInsightCard insights={aiInsightsList.slice(2, 4)} title="💰 Salary Optimization" />
            <Card title="Salary Gap Summary" subtitle="Roles below market — action needed">
              {salaryBandData.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-none text-xs">
                  <span className="text-gray-700 font-medium">{item.role}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Gap: {cc.symbol}{item.gap}k</span>
                    <Pill color={item.gap > 10 ? 'red' : item.gap > 5 ? 'yellow' : 'green'}>
                      {item.gap > 10 ? 'Critical' : item.gap > 5 ? 'Review' : 'OK'}
                    </Pill>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── SEASONAL TAB ── */}
      {activeTab === 'seasonal' && (
        <div>
          <Card title="Seasonal Leave Pattern — Nepal Festivals" subtitle="Historical leave data — Dashain & Tihar spike in Oct–Nov. Plan coverage in advance.">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={seasonalLeave}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="leave" name="Employees on Leave" radius={[4, 4, 0, 0]}>
                  {seasonalLeave.map((entry, i) => (
                    <Cell key={i} fill={entry.highlight ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>Normal period</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block"></span>Peak festival period (plan coverage)</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <AIInsightCard insights={aiInsightsList.slice(4, 6)} title="📅 Seasonal Forecasting" />
            <Card title="Nepal Festival Leave Calendar" subtitle="Key dates to plan for">
              {[
                { festival: 'Dashain',          months: 'Oct 2–12, 2026',   impact: 'Very High', color: 'red'    },
                { festival: 'Tihar',            months: 'Oct 28 – Nov 2',   impact: 'High',      color: 'red'    },
                { festival: 'Chhath Puja',      months: 'Nov 5–8',          impact: 'Medium',    color: 'yellow' },
                { festival: 'Christmas/New Year',months: 'Dec 25 – Jan 1',  impact: 'Low',       color: 'green'  },
                { festival: 'Holi',             months: 'Mar 14, 2027',     impact: 'Low',       color: 'green'  },
                { festival: 'Buddha Jayanti',   months: 'May 12, 2027',     impact: 'Low',       color: 'green'  },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-none text-xs">
                  <div>
                    <div className="font-semibold text-gray-800">{f.festival}</div>
                    <div className="text-gray-400">{f.months}</div>
                  </div>
                  <Pill color={f.color}>{f.impact}</Pill>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── PERFORMANCE TAB ── */}
      {activeTab === 'performance' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Team Competency Radar" subtitle="AI-assessed competency vs target — IT Department">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarCompetency}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar name="Team Avg"  dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  <Radar name="Target"    dataKey="B" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.10} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <div className="space-y-4">
              <AIInsightCard insights={[
                { color: '#3b82f6', label: 'Performance Prediction', text: 'AI predicts 73% of Q2 appraisals will score "Meets" or above based on KPI tracking data.' },
                { color: '#10b981', label: 'High Potential Identified', text: '8 employees identified as HiPo — ready for leadership development program in Q3.' },
                { color: '#f59e0b', label: 'PIP Candidates', text: '5 employees in PIP zone — early intervention recommended before formal review cycle.' },
              ]} title="🎯 Performance AI Insights" />

              <Card title="AI Performance Scoring" subtitle="Predicted Q2 rating distribution">
                {[
                  { label: 'Outstanding',  pct: 8,  color: '#10b981' },
                  { label: 'Exceeds',      pct: 22, color: '#3b82f6' },
                  { label: 'Meets',        pct: 48, color: '#8b5cf6' },
                  { label: 'Below',        pct: 17, color: '#f59e0b' },
                  { label: 'Unsat.',       pct: 5,  color: '#ef4444' },
                ].map((r, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{r.label}</span>
                      <span className="font-bold text-gray-900">{(r.pct||0)}%</span>
                    </div>
                    <ProgressBar value={(r.pct||0)} color={r.color} />
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── AI MODELS TAB ── */}
      {activeTab === 'models' && (
        <div>
          <Card title="AI Model Performance Dashboard" subtitle="All active ML models — accuracy, last training date & compliance status">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Model Name', 'Accuracy', 'Last Trained', 'Status', 'Data Privacy'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-semibold pb-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelMetrics.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-violet-50/30 transition-colors">
                    <td className="py-3 text-sm font-medium text-gray-800">{m.model}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <ProgressBar
                            value={m.accuracy}
                            color={m.accuracy >= 85 ? '#10b981' : m.accuracy >= 78 ? '#f59e0b' : '#ef4444'}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-800">{m.accuracy}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-gray-500">{m.lastTrained}</td>
                    <td className="py-3">
                      <Pill color={m.status === 'Active' ? 'green' : 'yellow'}>{m.status}</Pill>
                    </td>
                    <td className="py-3">
                      <Pill color="green">Compliant</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card title="Model Training Schedule" subtitle="Next retraining dates">
              {[
                { model: 'Attrition Model',     next: 'Jun 28, 2026', freq: 'Monthly'   },
                { model: 'Salary Model',         next: 'Jun 28, 2026', freq: 'Monthly'   },
                { model: 'Performance Model',    next: 'Jul 1, 2026',  freq: 'Quarterly' },
                { model: 'Leave Pattern Model',  next: 'Jul 15, 2026', freq: 'Monthly'   },
                { model: 'Sentiment Model',      next: 'Jun 28, 2026', freq: 'Monthly'   },
              ].map((s, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-50 last:border-none text-xs">
                  <span className="text-gray-700 font-medium">{s.model}</span>
                  <div className="text-right">
                    <div className="text-gray-500">{s.next}</div>
                    <div className="text-gray-400">{s.freq}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card title="Compliance & Privacy" subtitle="Nepal Right to Privacy Act 2018">
              {[
                { label: 'Data consent gates',        value: 'Enabled',   pill: true, color: 'green'  },
                { label: 'AI data anonymization',     value: 'Active',    pill: true, color: 'green'  },
                { label: 'Biometric data encryption', value: 'AES-256',   pill: true, color: 'green'  },
                { label: 'Model audit trail',         value: 'Logged',    pill: true, color: 'green'  },
                { label: 'Employee AI consent',       value: '100%',      pill: true, color: 'green'  },
                { label: 'GDPR alignment',            value: 'Compliant', pill: true, color: 'green'  },
              ].map((c, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-none text-xs">
                  <span className="text-gray-600">{c.label}</span>
                  {c.pill ? <Pill color={c.color}>{c.value}</Pill> : <span className="font-bold">{c.value}</span>}
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
